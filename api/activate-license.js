/**
 * Vercel Serverless Function: /api/activate-license
 * Memverifikasi kode lisensi ke API resmi Mayar.id secara aman (API Key terlindungi di sisi server).
 */

function computeHash36(input) {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(36).toUpperCase();
}

function normalizeLicenseCode(raw) {
  return String(raw || '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
}

function verifyInternalSerialOrDeviceCode(cleanCode, deviceId) {
  if (!cleanCode) return null;

  if (cleanCode === 'ASES-GURU-M001-4829') {
    return { valid: true, planType: 'individu', tier: 'guru', maxSeats: 2 };
  }

  if (deviceId) {
    const cleanDev = String(deviceId).trim().toUpperCase();
    const expectedDevCheck = computeHash36(`ASESMERDEKA-PRO-DEVICE:${cleanDev}:2026`).slice(0, 6);
    if (cleanCode === `PRO-MERDEKA-${expectedDevCheck}`) {
      return { valid: true, planType: 'individu', tier: 'guru', maxSeats: 1 };
    }
  }

  const parts = cleanCode.split('-');
  if (parts.length === 4 && parts[0] === 'PRO' && parts[1] === 'MERDEKA') {
    const body = parts[2];
    const providedCheck = parts[3];
    if (body.length >= 4 && providedCheck.length >= 4) {
      const expectedCheck = computeHash36(`SERIAL:${body}:ASESMERDEKA_2026`).slice(0, providedCheck.length);
      if (providedCheck === expectedCheck) {
        const isSchool =
          body.startsWith('SEKOLAH') ||
          body.startsWith('SMAN') ||
          body.startsWith('SMPN') ||
          body.startsWith('SDN') ||
          body.startsWith('SCH');
        return {
          valid: true,
          planType: isSchool ? 'sekolah' : 'individu',
          tier: isSchool ? 'sekolah' : 'guru',
          maxSeats: isSchool ? 25 : 2,
        };
      }
    }
  }

  return null;
}

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ valid: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rawCode = normalizeLicenseCode(body.licenseCode || '');
    const _deviceId = (body.deviceId || '').trim();

    if (!rawCode) {
      return res.status(400).json({ valid: false, message: 'Kode lisensi tidak boleh kosong.' });
    }

    // 0. Cek apakah kode lisensi adalah Kode Resmi Internal / Mitra (PRO-MERDEKA-... atau ASES-GURU-M001-4829)
    const internalMatch = verifyInternalSerialOrDeviceCode(rawCode, _deviceId);
    if (internalMatch) {
      return res.status(200).json({
        valid: true,
        planType: internalMatch.planType,
        tier: internalMatch.tier,
        maxSeats: internalMatch.maxSeats,
        message:
          internalMatch.planType === 'sekolah'
            ? 'Lisensi Kolektif Sekolah (25 Guru) berhasil diverifikasi dan aktif.'
            : 'Lisensi Guru Mandiri berhasil diverifikasi dan aktif.',
        details: rawCode,
      });
    }

    const apiKey = process.env.MAYAR_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        valid: false,
        kycPending: true,
        message:
          'Sistem verifikasi otomatis Mayar sedang dalam proses verifikasi akun Mayar (KYC). Silakan hubungi Admin atau gunakan Kode Lisensi Cadangan Mitra untuk aktivasi langsung.',
      });
    }

    const individuProductId =
      process.env.MAYAR_PRODUCT_ID ||
      process.env.VITE_MAYAR_PRODUCT_ID ||
      'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';

    const schoolProductId =
      process.env.MAYAR_SCHOOL_PRODUCT_ID ||
      process.env.VITE_MAYAR_SCHOOL_PRODUCT_ID ||
      '17cece7f-e711-4fdc-af44-e6ceb4b4bff7';

    // Helper untuk memanggil endpoint verifikasi Mayar
    async function verifyWithMayar(productId) {
      try {
        const response = await fetch('https://api.mayar.id/software/v1/license/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            licenseCode: rawCode,
            productId,
          }),
        });

        const data = await response.json().catch(() => null);
        return {
          status: response.status,
          ok: response.ok,
          data,
        };
      } catch (err) {
        return {
          status: 500,
          ok: false,
          error: err?.message || 'Gagal menghubungi server Mayar',
        };
      }
    }

    // 1. Cek Produk Individu terlebih dahulu (Limit 2 Perangkat)
    const resIndividu = await verifyWithMayar(individuProductId);
    if (resIndividu.ok && resIndividu.data?.isLicenseActive) {
      return res.status(200).json({
        valid: true,
        planType: 'individu',
        tier: 'guru',
        maxSeats: 2,
        message: 'Lisensi Guru Mandiri berhasil diverifikasi dan aktif.',
        details: resIndividu.data?.licenseCode,
      });
    }

    // 2. Cek Produk Sekolah (Limit 25 Perangkat)
    const resSchool = await verifyWithMayar(schoolProductId);
    if (resSchool.ok && resSchool.data?.isLicenseActive) {
      return res.status(200).json({
        valid: true,
        planType: 'sekolah',
        tier: 'sekolah',
        maxSeats: 25,
        message: 'Lisensi Kolektif Sekolah (25 Guru) berhasil diverifikasi dan aktif.',
        details: resSchool.data?.licenseCode,
      });
    }

    // 3. Jika kode tidak aktif pada kedua produk, berikan pesan kesalahan informatif
    const errorMsg =
      resIndividu.data?.message ||
      resSchool.data?.message ||
      'Kode lisensi tidak ditemukan, tidak aktif, atau batas aktivasi perangkat telah tercapai.';

    return res.status(400).json({
      valid: false,
      message: errorMsg,
    });
  } catch (error) {
    return res.status(500).json({
      valid: false,
      message: 'Terjadi kesalahan internal pada server saat memverifikasi lisensi.',
      error: error?.message,
    });
  }
}
