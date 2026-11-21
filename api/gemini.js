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
  validateLicenseEnvironmentBoundary,
  extractLicensePlanPrefix,
  isStagingLicenseCode,
  resolveLicenseRuntimeEnvironment,
} from './activate-license.js';

const deprecatedModelsCache = new Set();
const workingModelByTierCache = { pro: null, standard: null };

export function resolveLicenseEntitlementServer(cleanCode, seatRecord, cleanDev = '') {
  const internalMatch = verifyInternalSerialOrDeviceCode(cleanCode, cleanDev);
  const planPrefix = extractLicensePlanPrefix(cleanCode);
  const effectiveTier = seatRecord?.tier || internalMatch?.tier || '';
  const isProEntitled =
    effectiveTier === 'pro' ||
    effectiveTier === 'sekolah_pro' ||
    planPrefix === 'GP26' ||
    planPrefix === 'SP26';
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
    const vercelEnvLower = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
    const shouldValidateLicense =
      Boolean(cleanCode) ||
      licenseCode !== undefined ||
      Boolean(enforceLicense) ||
      vercelEnvLower === 'production' ||
      vercelEnvLower === 'preview';

    if (shouldValidateLicense) {
      const preEnvCheck = validateLicenseEnvironmentBoundary(cleanCode, null);
      if (!preEnvCheck.allowed) {
        return res.status(preEnvCheck.status || 403).json({
          error: preEnvCheck.message,
          code: preEnvCheck.reason,
          forbiddenEnvironment: true,
          valid: false,
        });
      }

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
      const seatEnvCheck = validateLicenseEnvironmentBoundary(cleanCode, seatRecord);
      if (!seatEnvCheck.allowed) {
        return res.status(seatEnvCheck.status || 403).json({
          error: seatEnvCheck.message,
          code: seatEnvCheck.reason,
          forbiddenEnvironment: true,
          valid: false,
        });
      }
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
      const requiresCryptographicVerification =
        isStagingLicenseCode(cleanCode) || resolveLicenseRuntimeEnvironment() === 'preview';
      if (
        (!seatRecord && !entitlement.internalMatch) ||
        (requiresCryptographicVerification && !entitlement.internalMatch)
      ) {
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

    // Server-only secret: hanya membaca GEMINI_API_KEY (tanpa fallback variabel client VITE_*)
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel.',
        code: 'MISSING_SERVER_API_KEY',
      });
    }

    // Pemilihan model berbasis Tier Pengguna + fallback otomatis saat 404 atau timeout
    const isProTier = tier === 'pro' || tier === 'sekolah_pro';
    const tierKey = isProTier ? 'pro' : 'standard';
    const primaryModel = isProTier ? 'gemini-1.5-pro' : 'gemini-2.5-flash';
    const staticFallbacks = isProTier
      ? [
          'gemini-3.8-flash',
          'gemini-3.5-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.8-pro',
          'gemini-2.5-pro',
          'gemini-2.0-flash',
        ]
      : [
          'gemini-3.8-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.0-flash',
        ];
    const isVitestRuntime = Boolean(process.env.VITEST);

    // Susun payload dinamis per model untuk Google Gemini API
    const buildModelPayload = (targetModel) => {
      const isGemini3Model = /^gemini-3/i.test(String(targetModel || '').trim());
      const requestedMaxTokens = typeof maxOutputTokens === 'number' ? maxOutputTokens : 6144;
      const effectiveMaxTokens = isGemini3Model
        ? Math.min(16384, Math.max(8192, requestedMaxTokens))
        : Math.min(8192, Math.max(512, requestedMaxTokens));

      return {
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
          maxOutputTokens: effectiveMaxTokens,
          responseMimeType: 'application/json',
          ...(isGemini3Model && !generationConfig?.thinkingConfig
            ? { thinkingConfig: { thinkingLevel: 'low' } }
            : {}),
          ...(responseSchema ? { responseSchema } : {}),
          ...(generationConfig || {}),
        },
      };
    };

    const attempts = [];
    const callUpstreamModel = async (targetModel, timeoutMs) => {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();
      try {
        const resUpstream = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify(buildModelPayload(targetModel)),
        });
        attempts.push({
          model: targetModel,
          status: resUpstream.status ?? 200,
          elapsedMs: Date.now() - startedAt,
        });
        return resUpstream;
      } catch (fetchErr) {
        if (fetchErr?.name === 'AbortError') {
          const elapsedMs = Date.now() - startedAt;
          attempts.push({ model: targetModel, status: 504, aborted: true, elapsedMs });
          return {
            ok: false,
            status: 504,
            aborted: true,
            _cachedText: `Upstream model ${targetModel} timed out after ${timeoutMs}ms`,
          };
        }
        throw fetchErr;
      } finally {
        clearTimeout(timer);
      }
    };

    const extractSuggestedModel = (rawText, excludeModel) => {
      const text = String(rawText || '');
      const cleanName = (raw) => String(raw || '').trim().replace(/[.,;:]+$/, '');
      const updateMatch = text.match(/(?:use|switch to|try)\s+models\/(gemini-[a-zA-Z0-9._-]+)/i);
      const suggestedPrimary = cleanName(updateMatch?.[1]);
      if (suggestedPrimary && suggestedPrimary !== excludeModel) {
        return suggestedPrimary;
      }
      const allMatches = Array.from(text.matchAll(/models\/(gemini-[a-zA-Z0-9._-]+)/gi));
      for (const m of allMatches) {
        const candidate = cleanName(m[1]);
        if (candidate && candidate !== excludeModel) {
          return candidate;
        }
      }
      return null;
    };

    // Timeout 56 detik total untuk Vercel Serverless Function dengan per-candidate timeout bounded
    const deadlineMs = Date.now() + 56000;
    let activeModel =
      !isVitestRuntime && workingModelByTierCache[tierKey]
        ? workingModelByTierCache[tierKey]
        : !isVitestRuntime && deprecatedModelsCache.has(primaryModel)
        ? 'gemini-3.8-flash'
        : primaryModel;
    let response = await callUpstreamModel(activeModel, 26000);

    if (response.ok && !isVitestRuntime) {
      workingModelByTierCache[tierKey] = activeModel;
    }

    if (!response.ok && (response.status === 404 || response.status === 504 || response.aborted)) {
      if (response.status === 404 && !isVitestRuntime) {
        deprecatedModelsCache.add(activeModel);
        if (workingModelByTierCache[tierKey] === activeModel) {
          workingModelByTierCache[tierKey] = null;
        }
      }

      let lastStatus = response.status;
      let lastErrText =
        response._cachedText ??
        (typeof response.text === 'function' ? await response.text().catch(() => '') : '');
      const triedModels = new Set(attempts.map((a) => a.model));
      const suggestedModel = extractSuggestedModel(lastErrText, activeModel);
      const fallbackCandidates = Array.from(
        new Set([...(suggestedModel ? [suggestedModel] : []), ...staticFallbacks])
      ).filter(
        (candidate) =>
          candidate &&
          !triedModels.has(candidate) &&
          (isVitestRuntime || !deprecatedModelsCache.has(candidate))
      );

      for (const candidateModel of fallbackCandidates) {
        const remainingMs = deadlineMs - Date.now();
        if (remainingMs < 3000) break;
        activeModel = candidateModel;
        const attemptTimeoutMs = Math.min(remainingMs, 24000);
        const candidateResp = await callUpstreamModel(candidateModel, attemptTimeoutMs);
        if (candidateResp.ok) {
          response = candidateResp;
          if (!isVitestRuntime) {
            workingModelByTierCache[tierKey] = candidateModel;
          }
          break;
        }
        lastStatus = candidateResp.status;
        if (lastStatus === 404 && !isVitestRuntime) {
          deprecatedModelsCache.add(candidateModel);
        }
        lastErrText =
          candidateResp._cachedText ??
          (typeof candidateResp.text === 'function'
            ? await candidateResp.text().catch(() => '')
            : '');
        response = { ok: false, status: lastStatus, aborted: candidateResp.aborted, _cachedText: lastErrText };
        if (lastStatus !== 404 && lastStatus !== 504 && !candidateResp.aborted) {
          break;
        }
      }

      if (!response.ok) {
        const rawErrText = response._cachedText ?? lastErrText;
        const safeErrText =
          apiKey && rawErrText ? rawErrText.split(apiKey).join('[REDACTED]') : rawErrText;
        return res.status(response.status || lastStatus).json({
          error: `Google Gemini API Error (${response.status || lastStatus})`,
          model: activeModel,
          attempts,
          details: safeErrText,
        });
      }
    }

    if (!response.ok) {
      const rawErrText =
        response._cachedText ??
        (typeof response.text === 'function' ? await response.text().catch(() => '') : '');
      const safeErrText =
        apiKey && rawErrText ? rawErrText.split(apiKey).join('[REDACTED]') : rawErrText;
      return res.status(response.status).json({
        error: `Google Gemini API Error (${response.status})`,
        model: activeModel,
        attempts,
        details: safeErrText,
      });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      model: activeModel,
      attempts,
      tier,
      data,
    });
  } catch (error) {
    const serverKey = (process.env.GEMINI_API_KEY || '').trim();
    const rawMsg = error?.message ? String(error.message) : '';
    const safeMsg = serverKey && rawMsg ? rawMsg.split(serverKey).join('[REDACTED]') : rawMsg;
    return res.status(500).json({
      error: 'Terjadi kegagalan server saat meneruskan permintaan ke Gemini AI.',
      message: safeMsg,
    });
  }
}

