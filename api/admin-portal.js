import crypto from 'node:crypto';
import {
  getRedisCredentials,
  getSeatRecordFromRedis,
  saveSeatRecordToRedis,
  deleteSeatRecordFromRedis,
  revokeLicenseInRedis,
  localLicenseRegistryStore,
  getEffectiveUsedSeatCount,
  evaluateServerLifecycleState,
  normalizeTeacherKeyServer,
  getActiveTeacherDevicesUnionServer,
  isSchoolLicenseCodeServer,
  resolveLicenseRuntimeEnvironment,
  validateStagingBranchContext,
  getStagingSigningSecretConfig,
  generateStagingLicenseCode,
  isStagingLicenseCode,
  isDeprecatedStagingLicenseCode,
  validateLicenseEnvironmentBoundary,
} from './activate-license.js';
import { OFFICIAL_SEEDED_LICENSES } from './officialSeeds.js';

export { localLicenseRegistryStore };

export const localAdminRateLimitStore = new Map();
const MAX_ADMIN_PIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export function clearAdminPortalRateLimitStore() {
  localAdminRateLimitStore.clear();
}

function resolveAdminRateLimitKey(req) {
  const fwd = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const remote = String(req?.socket?.remoteAddress || req?.ip || 'local').trim();
  const clientIp = fwd || remote || 'local';
  return `asesmerdeka:admin:rl:v1:${clientIp}`;
}

async function checkAdminRateLimit(req) {
  const key = resolveAdminRateLimitKey(req);
  const now = Date.now();
  const { url, token, configured } = getRedisCredentials();
  let entry = null;

  if (!configured) {
    entry = localAdminRateLimitStore.get(key) || null;
  } else {
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.result) {
          entry = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        }
      }
    } catch {
      entry = localAdminRateLimitStore.get(key) || null;
    }
  }

  if (entry && entry.attempts >= MAX_ADMIN_PIN_ATTEMPTS && now < Number(entry.resetAt || 0)) {
    const retryAfterSeconds = Math.max(1, Math.ceil((Number(entry.resetAt) - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
}

async function recordFailedAdminAttempt(req) {
  const key = resolveAdminRateLimitKey(req);
  const now = Date.now();
  const prev = localAdminRateLimitStore.get(key);
  const attempts = prev && now < prev.resetAt ? prev.attempts + 1 : 1;
  const resetAt = prev && now < prev.resetAt ? prev.resetAt : now + ADMIN_LOCKOUT_WINDOW_MS;
  const record = { attempts, resetAt };
  localAdminRateLimitStore.set(key, record);

  const { url, token, configured } = getRedisCredentials();
  if (configured) {
    try {
      const ttlSec = Math.max(60, Math.ceil((resetAt - now) / 1000));
      await fetch(`${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}?EX=${ttlSec}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(record),
      });
    } catch {
      // ignore
    }
  }
}

async function clearAdminFailedAttempts(req) {
  const key = resolveAdminRateLimitKey(req);
  localAdminRateLimitStore.delete(key);
  const { url, token, configured } = getRedisCredentials();
  if (configured) {
    try {
      await fetch(`${url.replace(/\/$/, '')}/del/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }
}

const REGISTRY_REDIS_KEY = 'asesmerdeka:admin:license_registry:v1';
const EXPECTED_ADMIN_PIN_HASH_36 = '2ID3PNQBIO';
const ADMIN_PIN_SHA256 = '1b088972675a71586edd3702980f4228826fbb266e8b0efd2e06ab57faf18a8c';

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
  if (envPin) {
    const a = Buffer.from(cleanPin, 'utf8');
    const b = Buffer.from(envPin, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

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
  let redisList = [];

  if (!configured) {
    redisList = [...localLicenseRegistryStore];
  } else {
    const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(REGISTRY_REDIS_KEY)}`;
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (Array.isArray(parsed)) {
            redisList = parsed;
          }
        }
      }
    } catch {
      redisList = [...localLicenseRegistryStore];
    }
  }

  const runtimeEnv = resolveLicenseRuntimeEnvironment();
  if (runtimeEnv === 'preview' && !validateStagingBranchContext({ runtimeEnv }).allowed) {
    return [];
  }

  // Gabungkan OFFICIAL_SEEDED_LICENSES dengan redisList hanya pada non-preview
  const map = new Map();
  // 1. Masukkan lisensi dari Redis / Store dinamis terlebih dahulu
  for (const item of redisList) {
    if (item && item.code) {
      map.set(item.code, { ...item });
    }
  }

  // 2. Masukkan master seeds resmi jika belum ada di peta (dilarang pada Preview staging)
  if (runtimeEnv !== 'preview') {
    for (const seed of OFFICIAL_SEEDED_LICENSES) {
      if (!map.has(seed.code)) {
        map.set(seed.code, { ...seed });
      }
    }
  }

  // Filter out any explicitly deleted items, deprecated STG1, or cross-environment leakage
  return Array.from(map.values()).filter((item) => {
    if (!item || item.deleted) return false;
    if (isDeprecatedStagingLicenseCode(item.code)) return false;
    const itemIsStaging = isStagingLicenseCode(item.code) || item.environment === 'staging';
    if (runtimeEnv === 'production' && itemIsStaging) return false;
    if (runtimeEnv === 'preview' && !itemIsStaging) return false;
    return true;
  });
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
    const rateCheck = await checkAdminRateLimit(req);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
      return res.status(429).json({
        ok: false,
        rateLimited: true,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
        message: `Terlalu banyak percobaan PIN Admin yang gagal. Coba lagi dalam ${rateCheck.retryAfterSeconds} detik.`,
      });
    }

    const body = typeof req.body === 'string' ? safeParseJson(req.body) : req.body || {};
    const adminPin = String(body.adminPin || req.headers?.['x-admin-pin'] || '').trim();

    if (!verifyAdminPin(adminPin)) {
      await recordFailedAdminAttempt(req);
      return res.status(403).json({
        ok: false,
        message: 'PIN Admin tidak valid atau tidak memiliki hak akses.',
      });
    }
    await clearAdminFailedAttempts(req);

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
          const devices = Array.isArray(seatRecord?.devices)
            ? seatRecord.devices
            : Array.isArray(item.devices)
            ? item.devices
            : [];
          const teacherSeats = seatRecord?.teacherSeats || item.teacherSeats;
          const maxSeats = Number(seatRecord?.maxSeats) || Number(item.maxSeats) || 1;
          const isSchool = isSchoolLicenseCodeServer(item.code, maxSeats, seatRecord || item);
          const usedSeats = seatRecord
            ? getEffectiveUsedSeatCount(seatRecord)
            : teacherSeats
            ? Object.values(teacherSeats).filter((t) => t && t.status === 'active').length
            : devices.length;
          const expiresAt = seatRecord?.expiresAt !== undefined ? seatRecord.expiresAt : item.expiresAt ?? null;
          const lifecycleState = evaluateServerLifecycleState(
            {
              ...item,
              ...(seatRecord || {}),
              devices,
              usedSeats,
              expiresAt,
            },
            false
          );
          const status = usedSeats > 0 ? 'aktif' : 'belum_aktif';
          return {
            ...item,
            maxSeats,
            usedSeats,
            devices,
            ...(teacherSeats ? { teacherSeats, activeTeacherCount: usedSeats } : {}),
            ...(isSchool ? { maxDevicesPerTeacher: 2 } : {}),
            expiresAt,
            renewedAt: seatRecord?.renewedAt || item.renewedAt || null,
            lifecycleState,
            status,
            updatedAt: seatRecord?.updatedAt || item.updatedAt || item.createdAt,
          };
        })
      );

      // Urutkan: lisensi aktif di paling atas, kemudian berdasarkan pembaruan terbaru
      licenses.sort((a, b) => {
        if (a.status === 'aktif' && b.status !== 'aktif') return -1;
        if (a.status !== 'aktif' && b.status === 'aktif') return 1;
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      });

      return res.status(200).json({
        ok: true,
        licenses,
      });
    }

    // 3. Action: create_license
    if (action === 'create_license') {
      const runtimeEnv = resolveLicenseRuntimeEnvironment();
      const requestedTargetEnv = String(body.targetEnvironment || '')
        .trim()
        .toLowerCase();
      if (requestedTargetEnv === 'staging' && runtimeEnv === 'production') {
        return res.status(403).json({
          ok: false,
          errorCode: 'STAGING_SIGNING_FORBIDDEN_IN_PRODUCTION',
          forbiddenEnvironment: true,
          message: 'Pencetakan lisensi staging ditolak pada environment Production.',
        });
      }

      if (runtimeEnv === 'preview') {
        const branchCheck = validateStagingBranchContext({ runtimeEnv });
        if (!branchCheck.allowed) {
          return res.status(branchCheck.status || 403).json({
            ok: false,
            errorCode: branchCheck.reason,
            forbiddenEnvironment: true,
            message: branchCheck.message,
          });
        }
      }

      const useStagingFormat =
        runtimeEnv === 'preview' || (runtimeEnv !== 'production' && requestedTargetEnv === 'staging');
      if (useStagingFormat) {
        const stagingSecret = getStagingSigningSecretConfig();
        if (!stagingSecret.configured) {
          return res.status(503).json({
            ok: false,
            errorCode: 'STAGING_SIGNING_SECRET_UNAVAILABLE',
            message:
              stagingSecret.error ||
              'ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET belum dikonfigurasi pada Preview (minimal 32 karakter).',
          });
        }
      }

      const planType = String(body.planType || 'individu').trim().toLowerCase();
      const label = String(body.label || '').trim() || 'Umum';
      const count = Math.max(1, Math.min(100, Number(body.count) || 1));
      const customMaxSeats =
        Number(body.customMaxSeats) > 0 ? Math.round(Number(body.customMaxSeats)) : null;
      const expiresAt =
        typeof body.expiresAt === 'string' && body.expiresAt.trim() ? body.expiresAt.trim() : null;

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
        const code = useStagingFormat
          ? generateStagingLicenseCode(prefix, entropy)
          : generateOfficialLicenseCode(prefix, entropy);
        const licenseEnv = isStagingLicenseCode(code) ? 'staging' : 'production';

        const licenseItem = {
          code,
          label,
          planType,
          tier,
          environment: licenseEnv,
          maxSeats: finalMaxSeats,
          createdAt: nowIso,
          updatedAt: nowIso,
          usedSeats: 0,
          devices: [],
          status: 'belum_aktif',
          lifecycleState: 'paid',
          ...(expiresAt ? { expiresAt } : {}),
        };

        // Simpan catatan kursi awal ke asesmerdeka:seats:v1:<CODE>
        await saveSeatRecordToRedis(code, {
          licenseCode: code,
          planType,
          tier,
          environment: licenseEnv,
          maxSeats: finalMaxSeats,
          devices: [],
          lifecycleState: 'paid',
          ...(expiresAt ? { expiresAt } : {}),
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
      const envCheck = validateLicenseEnvironmentBoundary(cleanCode, existingSeat);
      if (!envCheck.allowed) {
        return res.status(envCheck.status || 403).json({
          ok: false,
          errorCode: envCheck.reason,
          forbiddenEnvironment: true,
          message: envCheck.message,
        });
      }

      const currentRegistry = await getRegistryFromRedis();
      const regItem = currentRegistry.find((l) => l.code === cleanCode);

      const maxSeats = existingSeat?.maxSeats || regItem?.maxSeats || 2;
      const nowIso = new Date().toISOString();
      const licenseEnv = isStagingLicenseCode(cleanCode)
        ? 'staging'
        : existingSeat?.environment || regItem?.environment || 'production';

      await saveSeatRecordToRedis(cleanCode, {
        ...(existingSeat || {}),
        licenseCode: cleanCode,
        environment: licenseEnv,
        maxSeats,
        devices: [],
        ...(existingSeat?.teacherSeats ? { teacherSeats: {} } : {}),
        usedSeats: 0,
        lifecycleState: 'paid',
        updatedAt: nowIso,
      });

      if (regItem) {
        regItem.updatedAt = nowIso;
        regItem.devices = [];
        regItem.usedSeats = 0;
        if (regItem.teacherSeats) regItem.teacherSeats = {};
        regItem.status = 'belum_aktif';
        regItem.lifecycleState = 'paid';
        await saveRegistryToRedis(currentRegistry);
      }

      return res.status(200).json({
        ok: true,
        message: 'Kunci perangkat berhasil di-reset.',
      });
    }

    // 4B. Actions per Kursi Guru Sekolah: disable_teacher_seat, enable_teacher_seat, reset_teacher_devices
    if (
      action === 'disable_teacher_seat' ||
      action === 'enable_teacher_seat' ||
      action === 'reset_teacher_devices'
    ) {
      const rawCode = String(body.licenseCode || '').trim();
      const rawTeacherKey = String(body.teacherKey || body.teacherPin || '').trim();
      if (!rawCode || !rawTeacherKey) {
        return res.status(400).json({
          ok: false,
          message: 'Parameter licenseCode dan teacherKey wajib disertakan.',
        });
      }

      const cleanCode = normalizeLicenseCode(rawCode);
      const teacherKey = normalizeTeacherKeyServer(rawTeacherKey);
      const seatRecord = await getSeatRecordFromRedis(cleanCode);
      const envCheck = validateLicenseEnvironmentBoundary(cleanCode, seatRecord);
      if (!envCheck.allowed) {
        return res.status(envCheck.status || 403).json({
          ok: false,
          errorCode: envCheck.reason,
          forbiddenEnvironment: true,
          message: envCheck.message,
        });
      }
      if (!seatRecord || !seatRecord.teacherSeats || !seatRecord.teacherSeats[teacherKey]) {
        return res.status(404).json({
          ok: false,
          message: `Kursi guru "${teacherKey}" belum terdaftar pada lisensi ${cleanCode}.`,
        });
      }

      const target = seatRecord.teacherSeats[teacherKey];
      const nowIso = new Date().toISOString();
      const maxSeats = Number(seatRecord.maxSeats) || 25;

      if (action === 'disable_teacher_seat') {
        target.status = 'disabled';
        target.disabledAt = nowIso;
        target.updatedAt = nowIso;
      } else if (action === 'enable_teacher_seat') {
        const activeCount = Object.values(seatRecord.teacherSeats).filter(
          (t) => t && t.status === 'active'
        ).length;
        if (target.status !== 'active' && activeCount >= maxSeats) {
          return res.status(409).json({
            ok: false,
            message: `Kuota ${maxSeats}/${maxSeats} kursi guru sudah penuh.`,
          });
        }
        target.status = 'active';
        target.disabledAt = undefined;
        target.updatedAt = nowIso;
      } else if (action === 'reset_teacher_devices') {
        target.devices = [];
        target.updatedAt = nowIso;
      }

      const unionDevices = getActiveTeacherDevicesUnionServer(seatRecord.teacherSeats);
      const nextUsedSeats = Object.values(seatRecord.teacherSeats).filter(
        (t) => t && t.status === 'active'
      ).length;

      seatRecord.devices = unionDevices;
      seatRecord.usedSeats = nextUsedSeats;
      seatRecord.updatedAt = nowIso;
      await saveSeatRecordToRedis(cleanCode, seatRecord);

      const currentRegistry = await getRegistryFromRedis();
      const regItem = currentRegistry.find((l) => l.code === cleanCode);
      if (regItem) {
        regItem.devices = unionDevices;
        regItem.usedSeats = nextUsedSeats;
        regItem.teacherSeats = seatRecord.teacherSeats;
        regItem.status = nextUsedSeats > 0 ? 'aktif' : 'belum_aktif';
        regItem.updatedAt = nowIso;
        await saveRegistryToRedis(currentRegistry);
      }

      return res.status(200).json({
        ok: true,
        usedSeats: nextUsedSeats,
        maxSeats,
        teacherKey,
        message:
          action === 'disable_teacher_seat'
            ? `Kursi guru "${teacherKey}" dinonaktifkan. Kuota sekolah kini ${nextUsedSeats}/${maxSeats}.`
            : action === 'enable_teacher_seat'
            ? `Kursi guru "${teacherKey}" diaktifkan kembali (${nextUsedSeats}/${maxSeats}).`
            : `Perangkat guru "${teacherKey}" berhasil di-reset tanpa mengganggu guru lainnya.`,
      });
    }

    // 4C. Actions Lifecycle: renew_license & suspend_license
    if (action === 'renew_license' || action === 'suspend_license') {
      const rawCode = String(body.licenseCode || '').trim();
      if (!rawCode) {
        return res.status(400).json({
          ok: false,
          message: 'Parameter licenseCode wajib disertakan.',
        });
      }

      const cleanCode = normalizeLicenseCode(rawCode);
      const nowIso = new Date().toISOString();
      const existingSeat = await getSeatRecordFromRedis(cleanCode);
      const envCheck = validateLicenseEnvironmentBoundary(cleanCode, existingSeat);
      if (!envCheck.allowed) {
        return res.status(envCheck.status || 403).json({
          ok: false,
          errorCode: envCheck.reason,
          forbiddenEnvironment: true,
          message: envCheck.message,
        });
      }

      const currentRegistry = await getRegistryFromRedis();
      const regItem = currentRegistry.find((l) => l.code === cleanCode);
      const licenseEnv = isStagingLicenseCode(cleanCode)
        ? 'staging'
        : existingSeat?.environment || regItem?.environment || 'production';

      if (action === 'suspend_license') {
        const nextSeat = {
          ...(existingSeat || {}),
          licenseCode: cleanCode,
          environment: licenseEnv,
          maxSeats: existingSeat?.maxSeats || regItem?.maxSeats || 2,
          devices: Array.isArray(existingSeat?.devices) ? existingSeat.devices : [],
          suspended: true,
          suspendedAt: nowIso,
          lifecycleState: 'suspended',
          updatedAt: nowIso,
        };
        await saveSeatRecordToRedis(cleanCode, nextSeat);
        if (regItem) {
          regItem.lifecycleState = 'suspended';
          regItem.suspendedAt = nowIso;
          regItem.updatedAt = nowIso;
          await saveRegistryToRedis(currentRegistry);
        }
        return res.status(200).json({
          ok: true,
          lifecycleState: 'suspended',
          message: `Lisensi ${cleanCode} berhasil ditangguhkan sementara (data akademik pengguna tetap aman).`,
        });
      }

      // renew_license
      const newExpiresAt =
        typeof body.expiresAt === 'string' && body.expiresAt.trim()
          ? body.expiresAt.trim()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const existingDevices = Array.isArray(existingSeat?.devices) ? existingSeat.devices : [];
      const usedSeats = existingSeat ? getEffectiveUsedSeatCount(existingSeat) : existingDevices.length;
      const nextLifecycle = usedSeats > 0 ? 'active' : 'paid';

      const nextSeat = {
        ...(existingSeat || {}),
        licenseCode: cleanCode,
        environment: licenseEnv,
        maxSeats: existingSeat?.maxSeats || regItem?.maxSeats || 2,
        devices: existingDevices,
        suspended: false,
        expiresAt: newExpiresAt,
        renewedAt: nowIso,
        lifecycleState: nextLifecycle,
        updatedAt: nowIso,
      };
      await saveSeatRecordToRedis(cleanCode, nextSeat);
      if (regItem) {
        regItem.expiresAt = newExpiresAt;
        regItem.renewedAt = nowIso;
        regItem.lifecycleState = nextLifecycle;
        regItem.updatedAt = nowIso;
        await saveRegistryToRedis(currentRegistry);
      }

      return res.status(200).json({
        ok: true,
        lifecycleState: nextLifecycle,
        expiresAt: newExpiresAt,
        message: `Masa berlaku lisensi ${cleanCode} berhasil diperpanjang hingga ${newExpiresAt}.`,
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
      const existingSeat = await getSeatRecordFromRedis(cleanCode);
      const envCheck = validateLicenseEnvironmentBoundary(cleanCode, existingSeat);
      if (!envCheck.allowed) {
        return res.status(envCheck.status || 403).json({
          ok: false,
          errorCode: envCheck.reason,
          forbiddenEnvironment: true,
          message: envCheck.message,
        });
      }

      const deletedEnv = isStagingLicenseCode(cleanCode)
        ? 'staging'
        : existingSeat?.environment || 'production';

      // 1. Hapus data kursi di Redis
      await deleteSeatRecordFromRedis(cleanCode);

      // 2. Masukkan ke daftar hitam pencabutan lisensi terisolasi (staging vs production)
      await revokeLicenseInRedis(cleanCode);

      // 3. Hapus dari registri dan tandai terhapus agar master seeds tidak memunculkan kembali
      const currentRegistry = await getRegistryFromRedis();
      const nextRegistry = currentRegistry
        .filter((l) => l.code !== cleanCode)
        .concat([{ code: cleanCode, deleted: true, environment: deletedEnv }]);
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
