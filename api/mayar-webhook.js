import {
  autoRegisterLicenseInAdminRegistry,
  saveSeatRecordToRedis,
} from './activate-license.js';

/**
 * Vercel Serverless Function: /api/mayar-webhook
 * Menerima webhook notifikasi transaksi dari Mayar.id secara real-time.
 * Saat pembeli selesai membayar, Mayar mengirimkan webhook ke endpoint ini.
 * Sistem otomatis:
 * 1. Mengekstrak kode lisensi dan data pembeli (Nama & Email).
 * 2. Mendaftarkannya ke Portal Admin (asesmerdeka:admin:license_registry:v1)
 *    dengan label nama pembeli.
 * 3. Menyiapkan alokasi kursi (seat record) di Upstash Redis sehingga
 *    saat pembeli membuka aplikasi AsesMerdeka, kode langsung siap pakai.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mayar-signature');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'AsesMerdeka Mayar Webhook Listener',
      status: 'active',
      hint: 'Pasang URL endpoint ini di Dashboard Mayar > Integrasi / Webhook.',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ ok: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const event = String(payload.event || payload.type || '').trim().toLowerCase();
    const data = payload.data || payload.payload || payload;

    // Ekstrak informasi pembeli
    const customer = data.customer || {};
    const customerName = String(
      customer.name || customer.fullName || data.customerName || data.name || ''
    ).trim();
    const customerEmail = String(
      customer.email || data.customerEmail || data.email || ''
    ).trim();

    // Ekstrak kode lisensi yang diterbitkan Mayar
    const rawLicenseCode = String(
      data.licenseCode ||
        data.license_code ||
        data.licenseKey ||
        data.license?.code ||
        data.license?.licenseCode ||
        data.serialNumber ||
        ''
    ).trim();

    // Ekstrak informasi produk untuk menentukan jenis paket (Sekolah vs Individu)
    const productId = String(
      data.productId || data.product_id || data.product?.id || ''
    ).trim();
    const productName = String(
      data.productName || data.product_name || data.product?.name || ''
    ).trim().toLowerCase();

    const isSchool =
      productName.includes('sekolah') ||
      productName.includes('kolektif') ||
      productId === (process.env.MAYAR_SCHOOL_PRODUCT_ID || '17cece7f-e711-4fdc-af44-e6ceb4b4bff7');

    const planType = isSchool ? 'sekolah' : 'individu';
    const tier = isSchool ? 'sekolah' : 'guru';
    const maxSeats = isSchool ? 25 : 2;

    const buyerLabel = customerName
      ? `Mayar: ${customerName}${customerEmail ? ` (${customerEmail})` : ''}`
      : customerEmail
      ? `Mayar: ${customerEmail}`
      : 'Pembelian Mayar.id';

    if (rawLicenseCode) {
      const cleanCode = rawLicenseCode
        .replace(/[\u2010-\u2015\u2212]/g, '-')
        .replace(/[^A-Za-z0-9-]/g, '')
        .toUpperCase();

      const nowIso = new Date().toISOString();

      // 1. Daftarkan lisensi ke buku induk Admin Portal
      await autoRegisterLicenseInAdminRegistry({
        code: cleanCode,
        maxSeats,
        label: buyerLabel,
        planType,
        tier,
      });

      // 2. Siapkan slot perangkat awal di Cloud Redis
      await saveSeatRecordToRedis(cleanCode, {
        licenseCode: cleanCode,
        maxSeats,
        devices: [],
        updatedAt: nowIso,
        buyerName: customerName || null,
        buyerEmail: customerEmail || null,
      });

      return res.status(200).json({
        ok: true,
        message: `Lisensi ${cleanCode} untuk ${buyerLabel} berhasil didaftarkan ke Portal Admin.`,
        code: cleanCode,
        planType,
        maxSeats,
      });
    }

    return res.status(200).json({
      ok: true,
      message: `Webhook event '${event || 'unknown'}' diterima, namun tidak memuat data licenseCode langsung. Aktivasi kode akan divalidasi saat guru memasukkan kodenya.`,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error?.message || 'Gagal memproses webhook Mayar.',
    });
  }
}
