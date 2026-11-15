/**
 * Vercel Serverless Function: /api/gemini
 * Proxy aman untuk memanggil Google Gemini API dari sisi server.
 * Menjaga GEMINI_API_KEY tetap rahasia (Secret) di Vercel tanpa bocor ke browser client.
 *
 * Mendukung pemilihan model cerdas berdasarkan level lisensi pengguna:
 * - Tier 'guru' / 'sekolah' / 'free' -> gemini-2.5-flash (Cepat, efisien)
 * - Tier 'pro' / 'sekolah_pro' -> gemini-1.5-pro (Model penalaran mendalam)
 */

import {
  normalizeLicenseCode,
  isLicenseRevokedInRedis,
  getSeatRecordFromRedis,
  verifyInternalSerialOrDeviceCode,
  isLicenseExpired,
  isSchoolLicenseCodeServer,
  normalizeTeacherKeyServer,
} from './activate-license.js';

export function resolveLicenseEntitlementServer(cleanCode, seatRecord, cleanDev = '') {
  const internalMatch = verifyInternalSerialOrDeviceCode(cleanCode, cleanDev);
  const effectiveTier = seatRecord?.tier || internalMatch?.tier || '';
  const isProEntitled =
    effectiveTier === 'pro' ||
    effectiveTier === 'sekolah_pro' ||
    cleanCode.startsWith('ASM-GP26-') ||
    cleanCode.startsWith('ASM-SP26-');
  const isSchoolEntitled =
    effectiveTier === 'sekolah' ||
    effectiveTier === 'sekolah_pro' ||
    isSchoolLicenseCodeServer(cleanCode, seatRecord?.maxSeats, seatRecord);

  return {
    internalMatch,
    effectiveTier,
    isProEntitled,
    isSchoolEntitled,
  };
}

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Metode HTTP tidak diizinkan. Gunakan POST.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      prompt,
      contents,
      systemInstruction,
      generationConfig,
      temperature = 0.4,
      maxOutputTokens = 6144,
      responseSchema,
      tier = 'guru',
      licenseCode,
      deviceId,
      teacherPin,
      enforceLicense = false,
    } = body;

    const cleanCode = normalizeLicenseCode(licenseCode || '');
    const cleanDev = String(deviceId || '').trim().toUpperCase();
    const shouldValidateLicense =
      Boolean(cleanCode) ||
      licenseCode !== undefined ||
      Boolean(enforceLicense) ||
      String(process.env.VERCEL_ENV || '').trim().toLowerCase() === 'production';

    if (shouldValidateLicense) {
      if (!cleanCode || tier === 'free') {
        return res.status(403).json({
          error: 'Fitur Generator AI memerlukan lisensi PRO atau Kolektif Sekolah yang aktif.',
          code: 'LICENSE_REQUIRED',
          valid: false,
        });
      }

      if (await isLicenseRevokedInRedis(cleanCode)) {
        return res.status(403).json({
          error: 'Lisensi telah dicabut oleh Administrator.',
          code: 'LICENSE_REVOKED',
          revoked: true,
          valid: false,
        });
      }

      const seatRecord = await getSeatRecordFromRedis(cleanCode);
      if (seatRecord && isLicenseExpired(seatRecord.expiresAt)) {
        return res.status(403).json({
          error: 'Masa berlaku lisensi telah berakhir.',
          code: 'LICENSE_EXPIRED',
          expired: true,
          expiresAt: seatRecord.expiresAt,
          valid: false,
        });
      }

      if (seatRecord && (seatRecord.lifecycleState === 'suspended' || seatRecord.suspended)) {
        return res.status(403).json({
          error: 'Lisensi sedang ditangguhkan sementara.',
          code: 'LICENSE_SUSPENDED',
          suspended: true,
          valid: false,
        });
      }

      if (
        seatRecord &&
        (seatRecord.lifecycleState === 'pending_payment' ||
          seatRecord.lifecycleState === 'payment_failed')
      ) {
        return res.status(403).json({
          error: 'Pembayaran lisensi belum terverifikasi atau gagal.',
          code: 'PAYMENT_UNVERIFIED',
          paymentUnverified: true,
          valid: false,
        });
      }

      if (
        seatRecord &&
        isSchoolLicenseCodeServer(cleanCode, seatRecord.maxSeats, seatRecord) &&
        teacherPin
      ) {
        const seatKey = normalizeTeacherKeyServer(teacherPin, cleanDev);
        if (seatRecord.teacherSeats?.[seatKey]?.status === 'disabled') {
          return res.status(403).json({
            error: 'Kursi guru pada lisensi sekolah ini telah dinonaktifkan oleh Admin.',
            code: 'TEACHER_SEAT_DISABLED',
            teacherSeatDisabled: true,
            valid: false,
          });
        }
      }

      if (
        seatRecord &&
        cleanDev &&
        Array.isArray(seatRecord.devices) &&
        seatRecord.devices.length > 0 &&
        !seatRecord.devices.includes(cleanDev)
      ) {
        return res.status(403).json({
          error: 'Perangkat ini tidak terdaftar pada lisensi aktif.',
          code: 'DEVICE_NOT_AUTHORIZED',
          valid: false,
        });
      }

      const entitlement = resolveLicenseEntitlementServer(cleanCode, seatRecord, cleanDev);
      if (!seatRecord && !entitlement.internalMatch) {
        return res.status(403).json({
          error: 'Kode lisensi tidak terdaftar atau tidak sah.',
          code: 'LICENSE_INVALID',
          valid: false,
        });
      }

      const requestedProTier = tier === 'pro' || tier === 'sekolah_pro';
      if (requestedProTier && !entitlement.isProEntitled) {
        return res.status(403).json({
          error: 'Lisensi Basic tidak memiliki hak akses (entitlement) ke model/fitur PRO.',
          code: 'TIER_ENTITLEMENT_MISMATCH',
          valid: false,
        });
      }
    }

    // Prioritaskan GEMINI_API_KEY (Server Secret), fallback ke VITE_GEMINI_API_KEY jika ada
    const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel.',
        code: 'MISSING_SERVER_API_KEY',
      });
    }

    // Pemilihan model berbasis Tier Pengguna
    const isProTier = tier === 'pro' || tier === 'sekolah_pro';
    const model = isProTier ? 'gemini-1.5-pro' : 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Susun payload untuk Google Gemini API
    const geminiPayload = {
      ...(systemInstruction
        ? {
            systemInstruction:
              typeof systemInstruction === 'string'
                ? { parts: [{ text: systemInstruction }] }
                : systemInstruction,
          }
        : {}),
      contents: contents || [
        {
          parts: [{ text: prompt || '' }],
        },
      ],
      generationConfig: {
        temperature: typeof temperature === 'number' ? temperature : 0.4,
        maxOutputTokens:
          typeof maxOutputTokens === 'number'
            ? Math.min(8192, Math.max(512, maxOutputTokens))
            : 6144,
        responseMimeType: 'application/json',
        ...(responseSchema ? { responseSchema } : {}),
        ...(generationConfig || {}),
      },
    };

    // Timeout 45 detik untuk Vercel Serverless Function
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify(geminiPayload),
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Google Gemini API Error (${response.status})`,
        model,
        details: errText,
      });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      model,
      tier,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Terjadi kegagalan server saat meneruskan permintaan ke Gemini AI.',
      message: error?.message,
    });
  }
}

