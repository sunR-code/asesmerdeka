import crypto from 'node:crypto';
import {
  getRedisCredentials,
  getSeatRecordFromRedis,
  saveSeatRecordToRedis,
  deleteSeatRecordFromRedis,
} from './activate-license.js';

/**
 * Vercel Serverless Function: /api/admin-portal
 * Portal Admin Terpusat untuk:
 * 1. Otentikasi Admin PIN berbasis salted hash 53-bit.
 * 2. Registri Kode Lisensi (asesmerdeka:admin:license_registry:v1).
 * 3. Pembuatan Kode Lisensi Terenkripsi Baru (ASM-XXXX-...).
 * 4. Pengecekan status live kursi & ID perangkat terkunci (asesmerdeka:seats:v1:<CODE>).
 * 5. Reset kunci perangkat (device unbind).
 * 6. Pencabutan / penghapusan lisensi.
 */

const REGISTRY_REDIS_KEY = 'asesmerdeka:admin:license_registry:v1';
const EXPECTED_ADMIN_PIN_HASH_36 = '2ID3PNQBIO';
const ADMIN_PIN_SHA256 = '1b088972675a71586edd3702980f4228826fbb266e8b0efd2e06ab57faf18a8c';

export const localLicenseRegistryStore = [];

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

function verifyAdminPin(pin) {
  if (!pin || typeof pin !== 'string') return false;
  const cleanPin = pin.trim();
  if (cleanPin.length < 4) return false;

  const envPin = (process.env.ADMIN_PIN || process.env.VITE_ADMIN_PIN || '').trim();
  if (envPin && cleanPin === envPin) return true;

  const hash36 = computeHash36(`ADMIN_KEYGEN_V1:${cleanPin}:MERDEKA_SALT_2026`);
  if (hash36 === EXPECTED_ADMIN_PIN_HASH_36) return true;

  try {
    const inputSha = crypto.createHash('sha256').update(cleanPin).digest('hex');
    const a = Buffer.from(inputSha, 'hex');
    const b = Buffer.from(ADMIN_PIN_SHA256, 'hex');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  } catch {}

  return false;
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function getRegistryFromRedis() {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return [...localLicenseRegistryStore];
  }

  const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(REGISTRY_REDIS_KEY)}`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [...localLicenseRegistryStore];
    const data = await res.json().catch(() => null);
    if (!data || !data.result) return [];
    const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...localLicenseRegistryStore];
  }
}

async function saveRegistryToRedis(registryList) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    localLicenseRegistryStore.length = 0;
    localLicenseRegistryStore.push(...registryList);
    return;
  }

  const endpoint = `${url.replace(/\/$/, '')}/set/${encodeURIComponent(REGISTRY_REDIS_KEY)}`;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(registryList),
    });
  } catch {
    localLicenseRegistryStore.length = 0;
    localLicenseRegistryStore.push(...registryList);
  }
}

function generateOfficialLicenseCode(prefix, seed) {
  const validPrefixes = ['GM26', 'SK26', 'GP26', 'SP26', 'SL26'];
  const cleanPrefix = validPrefixes.includes(prefix) ? prefix : 'GM26';
  const cleanSeed = String(seed || '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 12)
    .padEnd(6, 'X');

  const cipher1 = computeHash36(`ASM_ENC_C1_V2:${cleanPrefix}:${cleanSeed}:9F8E7D6C_SALT`)
    .padStart(4, '7')
    .slice(0, 4);
  const cipher2 = computeHash36(`ASM_ENC_C2_V2:${cleanPrefix}:${cipher1}:4B3A2918_KEY`)
    .padStart(4, '9')
    .slice(0, 4);
  const sig = computeHash36(
    `ASM_HMAC_SIG_V2:${cleanPrefix}-${cipher1}-${cipher2}:ASESMERDEKA_2026_MASTER`
  )
    .padStart(4, 'X')
    .slice(0, 4);

  return `ASM-${cleanPrefix}-${cipher1}-${cipher2}-${sig}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({
      ok: false,
      message: 'Metode HTTP tidak diizinkan. Gunakan POST.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? safeParseJson(req.body) : req.body || {};
    const adminPin = String(body.adminPin || req.headers?.['x-admin-pin'] || '').trim();

    if (!verifyAdminPin(adminPin)) {
      return res.status(403).json({
        ok: false,
        message: 'PIN Admin tidak valid atau tidak memiliki hak akses.',
      });
    }

    const action = String(body.action || '').trim().toLowerCase();

    // 1. Action: auth
    if (action === 'auth') {
      return res.status(200).json({
        ok: true,
        message: 'Autentikasi Admin berhasil.',
      });
    }

    // 2. Action: list_licenses
    if (action === 'list_licenses') {
      const rawLicenses = await getRegistryFromRedis();
      const licenses = await Promise.all(
        rawLicenses.map(async (item) => {
          const seatRecord = await getSeatRecordFromRedis(item.code);
          const devices = Array.isArray(seatRecord?.devices) ? seatRecord.devices : [];
          const maxSeats = Number(seatRecord?.maxSeats) || Number(item.maxSeats) || 1;
          const usedSeats = devices.length;
          const status = usedSeats > 0 ? 'aktif' : 'belum_aktif';
          return {
            ...item,
            maxSeats,
            usedSeats,
            devices,
            status,
            updatedAt: seatRecord?.updatedAt || item.updatedAt || item.createdAt,
          };
        })
      );

      return res.status(200).json({
        ok: true,
        licenses,
      });
    }

    // 3. Action: create_license
    if (action === 'create_license') {
      const planType = String(body.planType || 'individu').trim().toLowerCase();
      const label = String(body.label || '').trim() || 'Umum';
      const count = Math.max(1, Math.min(100, Number(body.count) || 1));
      const customMaxSeats =
        Number(body.customMaxSeats) > 0 ? Math.round(Number(body.customMaxSeats)) : null;

      let prefix = 'GM26';
      let tier = 'guru';
      let defaultMaxSeats = 2;

      if (planType === 'solo') {
        prefix = 'SL26';
        tier = 'guru';
        defaultMaxSeats = 1;
      } else if (planType === 'sekolah') {
        prefix = 'SK26';
        tier = 'sekolah';
        defaultMaxSeats = 25;
      } else if (planType === 'pro') {
        prefix = 'GP26';
        tier = 'pro';
        defaultMaxSeats = 2;
      } else if (planType === 'sekolah_pro') {
        prefix = 'SP26';
        tier = 'sekolah_pro';
        defaultMaxSeats = 25;
      } else {
        // individu / default
        prefix = 'GM26';
        tier = 'guru';
        defaultMaxSeats = 2;
      }

      const finalMaxSeats = customMaxSeats || defaultMaxSeats;
      const nowIso = new Date().toISOString();
      const created = [];
      const currentRegistry = await getRegistryFromRedis();

      for (let i = 0; i < count; i++) {
        const entropy =
          crypto.randomBytes(4).toString('hex').toUpperCase() + String(i).padStart(2, '0');
        const code = generateOfficialLicenseCode(prefix, entropy);

        const licenseItem = {
          code,
          label,
          planType,
          tier,
          maxSeats: finalMaxSeats,
          createdAt: nowIso,
          updatedAt: nowIso,
          usedSeats: 0,
          devices: [],
          status: 'belum_aktif',
        };

        // Simpan catatan kursi awal ke asesmerdeka:seats:v1:<CODE>
        await saveSeatRecordToRedis(code, {
          licenseCode: code,
          maxSeats: finalMaxSeats,
          devices: [],
          updatedAt: nowIso,
        });

        created.push(licenseItem);
        currentRegistry.unshift(licenseItem);
      }

      await saveRegistryToRedis(currentRegistry);

      return res.status(200).json({
        ok: true,
        created,
      });
    }

    // 4. Action: reset_license_seats
    if (action === 'reset_license_seats') {
      const rawCode = String(body.licenseCode || '').trim();
      if (!rawCode) {
        return res.status(400).json({
          ok: false,
          message: 'Parameter licenseCode wajib disertakan.',
        });
      }

      const cleanCode = normalizeLicenseCode(rawCode);
      const existingSeat = await getSeatRecordFromRedis(cleanCode);
      const currentRegistry = await getRegistryFromRedis();
      const regItem = currentRegistry.find((l) => l.code === cleanCode);

      const maxSeats = existingSeat?.maxSeats || regItem?.maxSeats || 2;
      const nowIso = new Date().toISOString();

      await saveSeatRecordToRedis(cleanCode, {
        licenseCode: cleanCode,
        maxSeats,
        devices: [],
        updatedAt: nowIso,
      });

      if (regItem) {
        regItem.updatedAt = nowIso;
        regItem.devices = [];
        regItem.usedSeats = 0;
        regItem.status = 'belum_aktif';
        await saveRegistryToRedis(currentRegistry);
      }

      return res.status(200).json({
        ok: true,
        message: 'Kunci perangkat berhasil di-reset.',
      });
    }

    // 5. Action: delete_license
    if (action === 'delete_license') {
      const rawCode = String(body.licenseCode || '').trim();
      if (!rawCode) {
        return res.status(400).json({
          ok: false,
          message: 'Parameter licenseCode wajib disertakan.',
        });
      }

      const cleanCode = normalizeLicenseCode(rawCode);

      // Hapus data kursi
      await deleteSeatRecordFromRedis(cleanCode);

      // Hapus dari registri
      const currentRegistry = await getRegistryFromRedis();
      const nextRegistry = currentRegistry.filter((l) => l.code !== cleanCode);
      await saveRegistryToRedis(nextRegistry);

      return res.status(200).json({
        ok: true,
        message: 'Lisensi berhasil dihapus.',
      });
    }

    return res.status(400).json({
      ok: false,
      message: `Aksi '${action}' tidak dikenal.`,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error?.message || 'Terjadi kesalahan pada server.',
    });
  }
}
