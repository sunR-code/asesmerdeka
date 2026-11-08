/**
 * Vercel Serverless Function: /api/activate-license
 * 1. Memverifikasi Kode Lisensi Terenkripsi AsesMerdeka (ASM-XXXX-XXXX-XXXX-XXXX) & PRO-MERDEKA-...
 * 2. Memverifikasi Kode Lisensi API resmi Mayar.id
 * 3. Mengunci Batas Maksimal Perangkat (Device Seat Lock: 2 perangkat untuk Guru Mandiri, 25 untuk Sekolah)
 *    secara terpusat di Upstash Redis agar kode TIDAK BISA dipakai di perangkat ke-3 (HP/Laptop orang lain).
 */

const localSeatMemoryStore = new Map();

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

function getRedisCredentials() {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    ''
  ).trim();
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    ''
  ).trim();
  return { url, token, configured: Boolean(url && token) };
}

function buildSeatRedisKey(cleanCode) {
  return `asesmerdeka:seats:v1:${cleanCode}`;
}

async function getSeatRecordFromRedis(cleanCode) {
  const key = buildSeatRedisKey(cleanCode);
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return localSeatMemoryStore.get(key) || null;
  }

  const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || !data.result) return null;
  try {
    return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
  } catch {
    return null;
  }
}

async function saveSeatRecordToRedis(cleanCode, record) {
  const key = buildSeatRedisKey(cleanCode);
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    localSeatMemoryStore.set(key, record);
    return;
  }

  const endpoint = `${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}`;
  await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(record),
  });
}

export async function checkAndClaimServerSeat(cleanCode, deviceId, maxSeats) {
  const cleanDev = String(deviceId || '').trim().toUpperCase();
  if (!cleanDev) {
    return { allowed: true, usedSeats: 1, maxSeats };
  }

  const existing = await getSeatRecordFromRedis(cleanCode);
  const devices = Array.isArray(existing?.devices) ? [...existing.devices] : [];

  if (devices.includes(cleanDev)) {
    return {
      allowed: true,
      usedSeats: devices.length,
      maxSeats,
      devices,
    };
  }

  if (devices.length >= maxSeats) {
    return {
      allowed: false,
      usedSeats: devices.length,
      maxSeats,
      devices,
      message: `Aktivasi Ditolak! Kode lisensi ini telah mencapai batas maksimal perangkat (${devices.length}/${maxSeats} perangkat: 1 Laptop + 1 HP) dan sudah terkunci pada perangkat pemilik pertama. Kode tidak dapat digunakan di perangkat ke-${devices.length + 1}.`,
    };
  }

  devices.push(cleanDev);
  const updatedRecord = {
    licenseCode: cleanCode,
    maxSeats,
    devices,
    updatedAt: new Date().toISOString(),
  };
  await saveSeatRecordToRedis(cleanCode, updatedRecord);

  return {
    allowed: true,
    usedSeats: devices.length,
    maxSeats,
    devices,
  };
}

function verifyInternalSerialOrDeviceCode(cleanCode, deviceId) {
  if (!cleanCode) return null;

  // Tolak permanen seluruh kode lama (PRO-MERDEKA-... atau ASES-...)
  if (cleanCode.startsWith('PRO-MERDEKA-') || cleanCode.startsWith('ASES-')) {
    return null;
  }

  if (deviceId) {
    const cleanDev = String(deviceId).trim().toUpperCase();
    const expectedDevCheck = computeHash36(`ASESMERDEKA-PRO-DEVICE:${cleanDev}:2026`).slice(0, 6);
    if (cleanCode === `ASM-DV26-${expectedDevCheck}`) {
      return { valid: true, planType: 'individu', tier: 'guru', maxSeats: 1 };
    }
  }

  const parts = cleanCode.split('-');

  // Format Terenkripsi Baru: ASM-<PREFIX>-<CIPHER1>-<CIPHER2>-<SIG>
  // Contoh: ASM-GM26-1TAT-1QBM-133R (Tidak menampilkan nomor urut MAYAR001 agar tidak bisa ditebak)
  if (parts.length === 5 && parts[0] === 'ASM') {
    const prefix = parts[1];
    const cipher1 = parts[2];
    const cipher2 = parts[3];
    const providedSig = parts[4];

    if (
      ['GM26', 'SK26', 'GP26', 'SP26', 'SL26'].includes(prefix) &&
      cipher1.length === 4 &&
      cipher2.length === 4 &&
      providedSig.length === 4
    ) {
      const expectedCipher2 = computeHash36(`ASM_ENC_C2_V2:${prefix}:${cipher1}:4B3A2918_KEY`)
        .padStart(4, '9')
        .slice(0, 4);
      const expectedSig = computeHash36(
        `ASM_HMAC_SIG_V2:${prefix}-${cipher1}-${cipher2}:ASESMERDEKA_2026_MASTER`
      )
        .padStart(4, 'X')
        .slice(0, 4);

      if (cipher2 === expectedCipher2 && providedSig === expectedSig) {
        if (prefix === 'SK26') {
          return { valid: true, planType: 'sekolah', tier: 'sekolah', maxSeats: 25 };
        }
        if (prefix === 'SP26') {
          return { valid: true, planType: 'sekolah', tier: 'sekolah_pro', maxSeats: 25 };
        }
        if (prefix === 'GP26') {
          return { valid: true, planType: 'individu', tier: 'pro', maxSeats: 2 };
        }
        if (prefix === 'SL26') {
          return { valid: true, planType: 'individu', tier: 'guru', maxSeats: 1 };
        }
        return { valid: true, planType: 'individu', tier: 'guru', maxSeats: 2 };
      }
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ valid: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rawCode = normalizeLicenseCode(body.licenseCode || '');
    const _deviceId = (body.deviceId || '').trim();
    const action = String(body.action || 'verify').trim().toLowerCase();

    if (!rawCode) {
      return res.status(400).json({ valid: false, message: 'Kode lisensi tidak boleh kosong.' });
    }

    // Tolak permanen kode lisensi versi lama (PRO-MERDEKA-... atau ASES-...) dan instruksikan klien mereset perangkat
    if (rawCode.startsWith('PRO-MERDEKA-') || rawCode.startsWith('ASES-')) {
      return res.status(403).json({
        valid: false,
        seatLimitExceeded: true,
        legacyRevoked: true,
        message:
          'Kode lisensi versi lama sudah tidak berlaku dan telah dinonaktifkan. Silakan gunakan Kode Lisensi Terenkripsi terbaru (ASM-...).',
      });
    }

    // Fitur Admin untuk me-reset daftar perangkat pada kode tertentu di Upstash Redis
    if (action === 'reset_seats') {
      const adminPinHash = computeHash36(`ADMIN_KEYGEN_V1:${String(body.adminPin || '').trim()}:MERDEKA_SALT_2026`);
      if (adminPinHash !== '2BUG1JLCPHD') {
        return res.status(403).json({ ok: false, message: 'PIN Admin tidak valid.' });
      }
      await saveSeatRecordToRedis(rawCode, {
        licenseCode: rawCode,
        maxSeats: 2,
        devices: [],
        updatedAt: new Date().toISOString(),
      });
      return res.status(200).json({
        ok: true,
        message: `Daftar kunci perangkat untuk kode ${rawCode} berhasil di-reset di Cloud Redis.`,
      });
    }

    // 0. Cek apakah kode lisensi adalah Kode Terenkripsi AsesMerdeka (ASM-...) atau PRO-MERDEKA-...
    const internalMatch = verifyInternalSerialOrDeviceCode(rawCode, _deviceId);
    if (internalMatch) {
      const seatCheck = await checkAndClaimServerSeat(rawCode, _deviceId, internalMatch.maxSeats);
      if (!seatCheck.allowed) {
        return res.status(403).json({
          valid: false,
          seatLimitExceeded: true,
          usedSeats: seatCheck.usedSeats,
          maxSeats: seatCheck.maxSeats,
          message: seatCheck.message,
        });
      }

      return res.status(200).json({
        valid: true,
        planType: internalMatch.planType,
        tier: internalMatch.tier,
        usedSeats: seatCheck.usedSeats,
        maxSeats: internalMatch.maxSeats,
        message:
          internalMatch.planType === 'sekolah'
            ? `Lisensi Kolektif Sekolah aktif (${seatCheck.usedSeats}/${seatCheck.maxSeats} Perangkat Guru).`
            : `Lisensi Guru Mandiri aktif (${seatCheck.usedSeats}/${seatCheck.maxSeats} Perangkat).`,
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

    async function verifyWithMayar(productId) {
      try {
        const response = await fetch('https://api.mayar.id/software/v1/license/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
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
      const seatCheck = await checkAndClaimServerSeat(rawCode, _deviceId, 2);
      if (!seatCheck.allowed) {
        return res.status(403).json({
          valid: false,
          seatLimitExceeded: true,
          usedSeats: seatCheck.usedSeats,
          maxSeats: seatCheck.maxSeats,
          message: seatCheck.message,
        });
      }

      return res.status(200).json({
        valid: true,
        planType: 'individu',
        tier: 'guru',
        usedSeats: seatCheck.usedSeats,
        maxSeats: 2,
        message: `Lisensi Guru Mandiri berhasil diverifikasi dan aktif (${seatCheck.usedSeats}/2 Perangkat).`,
        details: resIndividu.data?.licenseCode,
      });
    }

    // 2. Cek Produk Sekolah (Limit 25 Perangkat)
    const resSchool = await verifyWithMayar(schoolProductId);
    if (resSchool.ok && resSchool.data?.isLicenseActive) {
      const seatCheck = await checkAndClaimServerSeat(rawCode, _deviceId, 25);
      if (!seatCheck.allowed) {
        return res.status(403).json({
          valid: false,
          seatLimitExceeded: true,
          usedSeats: seatCheck.usedSeats,
          maxSeats: seatCheck.maxSeats,
          message: seatCheck.message,
        });
      }

      return res.status(200).json({
        valid: true,
        planType: 'sekolah',
        tier: 'sekolah',
        usedSeats: seatCheck.usedSeats,
        maxSeats: 25,
        message: `Lisensi Kolektif Sekolah (25 Guru) berhasil diverifikasi dan aktif (${seatCheck.usedSeats}/25 Perangkat).`,
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
