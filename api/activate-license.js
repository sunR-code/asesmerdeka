/**
 * Vercel Serverless Function: /api/activate-license
 * Memverifikasi kode lisensi ke API resmi Mayar.id secara aman (API Key terlindungi di sisi server).
 */

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ valid: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rawCode = (body.licenseCode || '').trim();
    const _deviceId = (body.deviceId || '').trim();

    if (!rawCode) {
      return res.status(400).json({ valid: false, message: 'Kode lisensi tidak boleh kosong.' });
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
