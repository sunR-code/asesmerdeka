/**
 * Vercel Serverless Function: /api/cloud-sync
 * Menyimpan & memulihkan riwayat data pengisian Guru lintas perangkat (HP <-> Laptop/Komputer)
 * dengan Optimistic Concurrency Control (revision + HTTP 409 Conflict), Atomic Compare-And-Set
 * (Upstash Lua EVAL / serialized mutex fallback), otorisasi lisensi & kursi perangkat,
 * idempotensi permintaan, serta sanitasi error Redis.
 *
 * Environment Variables yang didukung otomatis dari Vercel Marketplace (Upstash):
 * - UPSTASH_REDIS_REST_URL atau KV_REST_API_URL
 * - UPSTASH_REDIS_REST_TOKEN atau KV_REST_API_TOKEN
 */

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  buildSeatRedisKey,
  extractLicensePlanPrefix,
  getRedisCredentials,
  isLicenseExpired,
  isLicenseRevokedInRedis,
  isSchoolLicenseCodeServer,
  isStagingLicenseCode,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  normalizeTeacherKeyServer,
  resolveLicenseRuntimeEnvironment,
  validateLicenseEnvironmentBoundary,
  verifyInternalSerialOrDeviceCode,
} from './activate-license.js';

// Fallback memori lokal saat dijalankan pada environment dev lokal tanpa Redis
export const localDevMemoryStore = new Map();
export const localDevChunkStore = new Map();
export const localDevStageStore = new Map();

// Sliding-window rate limiter untuk proteksi brute-force PIN Guru & lisensi
export const authRateLimitStore = new Map();

// Antrean kunci mutex per-workspace untuk serialisasi request dalam proses yang sama
const workspaceLocks = new Map();

export const MAX_INLINE_RECORD_BYTES = 600_000;
export const MAX_SINGLE_REQUEST_BYTES = 1_200_000;
export const MAX_SYNC_PAYLOAD_BYTES = MAX_SINGLE_REQUEST_BYTES;
export const MAX_PULL_INLINE_RESPONSE_BYTES = 1_200_000;
export const MAX_TOTAL_WORKSPACE_BYTES = 12_000_000;
export const TARGET_STORAGE_CHUNK_BYTES = 320_000;
export const MAX_CHUNKS_PER_UPLOAD = 48;
export const STAGE_CHUNK_TTL_SECONDS = 1800;
const REVOKED_REDIS_KEY = 'asesmerdeka:admin:revoked_licenses:v1';
const REGISTRY_REDIS_KEY = 'asesmerdeka:admin:license_registry:v1';
const MAX_DEVICES_PER_TEACHER_WORKSPACE = 2;
const MAX_FAILED_AUTH_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
export const MIN_PRODUCTION_PEPPER_LENGTH = 32;
export const MIN_PRODUCTION_PEPPER_UNIQUE_CHARS = 8;

export const LEGACY_INTERNAL_SECURITY_SCHEMA_VERSION = 1;
export const CURRENT_SECURITY_SCHEMA_VERSION = 2;
// Batas default penutupan otomatis fallback dev pepper lama (dapat ditimpa via env CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT)
export const DEFAULT_LEGACY_PEPPER_SUNSET_ISO = '2027-06-30T23:59:59.000Z';

// Profil minimum scrypt yang mematuhi OWASP Password Storage Cheat Sheet
export const SUPPORTED_OWASP_SCRYPT_PROFILES = Object.freeze({
  owasp_n14_p5: Object.freeze({ N: 16384, r: 8, p: 5, keylen: 32, maxmem: 32 * 1024 * 1024 }),
  owasp_n15_p3: Object.freeze({ N: 32768, r: 8, p: 3, keylen: 32, maxmem: 64 * 1024 * 1024 }),
  owasp_n16_p2: Object.freeze({ N: 65536, r: 8, p: 2, keylen: 32, maxmem: 128 * 1024 * 1024 }),
  owasp_n17_p1: Object.freeze({ N: 131072, r: 8, p: 1, keylen: 32, maxmem: 256 * 1024 * 1024 }),
});

// Profil default aktif: N=2^14 (16384), r=8, p=5, keylen=32 (~16 MiB RAM, ~262 ms di Node v24)
export const SCRYPT_PARAMS = SUPPORTED_OWASP_SCRYPT_PROFILES.owasp_n14_p5;

const DEFAULT_INTERNAL_PIN_PEPPER = 'asesmerdeka-server-only-pin-pepper-v2-2026';

// Metrik migrasi agregat aman (hanya kategori & pepperKid non-rahasia; zero PIN/hash/identitas)
const migrationMetricsStore = {
  observedByCategory: {},
  observedByPepperKid: {},
  migratedBySource: {},
  sunsetBlockedCount: 0,
};

function incrementMetricCounter(mapObj, key) {
  if (!key) return;
  mapObj[key] = (mapObj[key] || 0) + 1;
}

export function getCloudSyncMigrationMetrics() {
  return {
    schemaVersion: CURRENT_SECURITY_SCHEMA_VERSION,
    sunset: isLegacyDefaultPepperSunsetActive(),
    observedByCategory: { ...migrationMetricsStore.observedByCategory },
    observedByPepperKid: { ...migrationMetricsStore.observedByPepperKid },
    migratedBySource: { ...migrationMetricsStore.migratedBySource },
    sunsetBlockedCount: migrationMetricsStore.sunsetBlockedCount,
  };
}

export function resetCloudSyncMigrationMetrics() {
  migrationMetricsStore.observedByCategory = {};
  migrationMetricsStore.observedByPepperKid = {};
  migrationMetricsStore.migratedBySource = {};
  migrationMetricsStore.sunsetBlockedCount = 0;
}

class PepperConfigurationError extends Error {
  constructor(message, reason = 'MISSING_PRODUCTION_PEPPER') {
    super(message);
    this.name = 'PepperConfigurationError';
    this.statusCode = 503;
    this.reason = reason;
  }
}

class RedisUnavailableError extends Error {
  constructor(status = 503) {
    super(
      'Layanan penyimpanan Cloud sedang tidak tersedia atau konfigurasi Redis server gagal dihubungi. Data Anda tetap aman tersimpan di perangkat ini.'
    );
    this.name = 'RedisUnavailableError';
    this.statusCode = status;
  }
}

class ClientValidationError extends Error {
  constructor(message, statusCode = 400, extra = {}) {
    super(message);
    this.name = 'ClientValidationError';
    this.statusCode = statusCode;
    this.extra = extra;
  }
}

export function clearLocalDevCloudSyncStore() {
  localDevMemoryStore.clear();
  localDevChunkStore.clear();
  localDevStageStore.clear();
}

export function clearCloudSyncRateLimitStore() {
  authRateLimitStore.clear();
}

function sanitizeKeySegment(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '_')
    .slice(0, 64);
}

function normalizeLicenseCode(raw) {
  return String(raw || '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .trim()
    .toUpperCase();
}

function isSchoolSharedCode(cleanCode) {
  const prefix = extractLicensePlanPrefix(cleanCode);
  if (prefix === 'SK26' || prefix === 'SP26') return true;
  return (
    cleanCode.startsWith('ASM_SK26_') ||
    cleanCode.startsWith('ASM-SK26-') ||
    cleanCode.startsWith('ASM_SP26_') ||
    cleanCode.startsWith('ASM-SP26-') ||
    cleanCode.startsWith('ASM_STG2_SK26_') ||
    cleanCode.startsWith('ASM_STG2_SP26_') ||
    cleanCode.includes('SEKOLAH') ||
    cleanCode.includes('SMAN') ||
    cleanCode.includes('SMPN') ||
    cleanCode.includes('SDN') ||
    cleanCode.includes('SCH')
  );
}

export function isProductionEnvironment() {
  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
  return vercelEnv === 'production' || nodeEnv === 'production';
}

export function getPepperKeyId(pepperSecret) {
  return createHash('sha256')
    .update(`asesmerdeka:pepper-kid:v1:${String(pepperSecret || '')}`)
    .digest('hex')
    .slice(0, 8);
}

export function hasSufficientPepperEntropy(pepperSecret) {
  const clean = String(pepperSecret || '').trim();
  if (clean.length < MIN_PRODUCTION_PEPPER_LENGTH) {
    return false;
  }
  const uniqueChars = new Set(clean);
  return uniqueChars.size >= MIN_PRODUCTION_PEPPER_UNIQUE_CHARS;
}

export function validateProductionPepperConfig() {
  const isProd = isProductionEnvironment();
  const configured = String(process.env.CLOUD_SYNC_PIN_PEPPER || '').trim();
  const previous = String(process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS || '').trim();

  if (isProd) {
    if (!configured) {
      return {
        valid: false,
        isProduction: true,
        reason: 'MISSING_PRODUCTION_PEPPER',
        message: `Konfigurasi keamanan Cloud Sync belum lengkap: CLOUD_SYNC_PIN_PEPPER wajib diatur pada environment produksi (minimal ${MIN_PRODUCTION_PEPPER_LENGTH} karakter acak berentropi tinggi) sebelum memproses PIN Guru.`,
      };
    }
    if (configured === DEFAULT_INTERNAL_PIN_PEPPER) {
      return {
        valid: false,
        isProduction: true,
        reason: 'DEFAULT_PEPPER_FORBIDDEN_IN_PRODUCTION',
        message:
          'Konfigurasi CLOUD_SYNC_PIN_PEPPER tidak boleh menggunakan nilai fallback dev pada environment produksi.',
      };
    }
    if (configured.length < MIN_PRODUCTION_PEPPER_LENGTH || !hasSufficientPepperEntropy(configured)) {
      return {
        valid: false,
        isProduction: true,
        reason: 'WEAK_PRODUCTION_PEPPER',
        message: `Konfigurasi CLOUD_SYNC_PIN_PEPPER tidak memenuhi standar produksi (panjang ${configured.length} karakter). Minimal ${MIN_PRODUCTION_PEPPER_LENGTH} karakter acak berentropi tinggi (minimal ${MIN_PRODUCTION_PEPPER_UNIQUE_CHARS} karakter unik) diwajibkan pada environment produksi.`,
      };
    }
    if (previous) {
      if (previous === DEFAULT_INTERNAL_PIN_PEPPER) {
        return {
          valid: false,
          isProduction: true,
          reason: 'DEFAULT_PEPPER_FORBIDDEN_AS_PREVIOUS_IN_PRODUCTION',
          message:
            'CLOUD_SYNC_PIN_PEPPER_PREVIOUS tidak boleh menggunakan nilai fallback dev pada environment produksi.',
        };
      }
      if (previous.length < MIN_PRODUCTION_PEPPER_LENGTH || !hasSufficientPepperEntropy(previous)) {
        return {
          valid: false,
          isProduction: true,
          reason: 'WEAK_PREVIOUS_PRODUCTION_PEPPER',
          message: `Konfigurasi CLOUD_SYNC_PIN_PEPPER_PREVIOUS tidak memenuhi standar produksi (panjang ${previous.length} karakter). Minimal ${MIN_PRODUCTION_PEPPER_LENGTH} karakter acak berentropi tinggi (minimal ${MIN_PRODUCTION_PEPPER_UNIQUE_CHARS} karakter unik) diwajibkan saat rotasi pepper.`,
        };
      }
    }
  }

  const activeSecret = configured || DEFAULT_INTERNAL_PIN_PEPPER;
  return {
    valid: true,
    isProduction: isProd,
    usingConfiguredPepper: Boolean(configured),
    minProductionLength: MIN_PRODUCTION_PEPPER_LENGTH,
    activeKid: getPepperKeyId(activeSecret),
    previousKid: previous ? getPepperKeyId(previous) : null,
  };
}

export function getActivePinPepper() {
  const validation = validateProductionPepperConfig();
  if (!validation.valid) {
    throw new PepperConfigurationError(validation.message, validation.reason);
  }
  const configured = String(process.env.CLOUD_SYNC_PIN_PEPPER || '').trim();
  const secret = configured || DEFAULT_INTERNAL_PIN_PEPPER;
  return {
    secret,
    kid: getPepperKeyId(secret),
    isConfigured: Boolean(configured),
  };
}

export function isLegacyDefaultPepperSunsetActive(nowMs = Date.now()) {
  const disableFlag = String(process.env.CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER || '')
    .trim()
    .toLowerCase();
  if (disableFlag === 'true' || disableFlag === '1') {
    return {
      sunsetPassed: true,
      sunsetIso: 'DISABLED_BY_ENV',
      disabledExplicitly: true,
    };
  }

  const rawIso = String(
    process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT || DEFAULT_LEGACY_PEPPER_SUNSET_ISO
  ).trim();
  const parsedMs = Date.parse(rawIso);
  if (!Number.isFinite(parsedMs)) {
    const fallbackMs = Date.parse(DEFAULT_LEGACY_PEPPER_SUNSET_ISO);
    return {
      sunsetPassed: nowMs >= fallbackMs,
      sunsetIso: DEFAULT_LEGACY_PEPPER_SUNSET_ISO,
      disabledExplicitly: false,
    };
  }

  return {
    sunsetPassed: nowMs >= parsedMs,
    sunsetIso: rawIso,
    disabledExplicitly: false,
  };
}

export function isEligibleLegacyDefaultPepperRecord(existingRecord) {
  if (!existingRecord || typeof existingRecord !== 'object') {
    return false;
  }
  const schemaVer = Number(existingRecord.securitySchemaVersion) || 0;
  // Record v2 yang dibuat dengan pepper produksi terkonfigurasi tidak boleh pernah fallback ke dev pepper
  if (
    schemaVer >= CURRENT_SECURITY_SCHEMA_VERSION ||
    existingRecord.pepperMode === 'configured-pepper'
  ) {
    return false;
  }
  const storedHash = existingRecord.teacherPinHash;
  if (typeof storedHash !== 'string' || !storedHash.startsWith('scrypt$v1$')) {
    return false;
  }
  const defaultKid = getPepperKeyId(DEFAULT_INTERNAL_PIN_PEPPER);
  const recordKid =
    typeof existingRecord.pepperKid === 'string' && existingRecord.pepperKid.trim()
      ? existingRecord.pepperKid.trim()
      : null;
  return !recordKid || recordKid === defaultKid;
}

export function classifyRecordPinSecurity(existingRecord) {
  if (!existingRecord || typeof existingRecord !== 'object') {
    return {
      category: 'no_pin',
      securitySchemaVersion: 0,
      pepperKid: null,
      hasLegacyScryptParams: false,
      usesInternalDefaultPepper: false,
      needsMigration: false,
    };
  }

  const storedHash = existingRecord.teacherPinHash;
  const plainPin =
    typeof existingRecord.teacherPin === 'string' ? existingRecord.teacherPin.trim() : '';
  const schemaVer = Number(existingRecord.securitySchemaVersion) || 0;
  const recordKid =
    typeof existingRecord.pepperKid === 'string' && existingRecord.pepperKid.trim()
      ? existingRecord.pepperKid.trim()
      : null;
  const defaultKid = getPepperKeyId(DEFAULT_INTERNAL_PIN_PEPPER);
  const configured = String(process.env.CLOUD_SYNC_PIN_PEPPER || '').trim();
  const previousSecret = String(process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS || '').trim();
  const activeKid = getPepperKeyId(configured || DEFAULT_INTERNAL_PIN_PEPPER);
  const previousKid = previousSecret ? getPepperKeyId(previousSecret) : null;

  if (!storedHash && plainPin) {
    return {
      category: 'legacy_plaintext',
      securitySchemaVersion: schemaVer,
      pepperKid: null,
      hasLegacyScryptParams: false,
      usesInternalDefaultPepper: false,
      needsMigration: true,
    };
  }

  if (!storedHash) {
    return {
      category: 'no_pin',
      securitySchemaVersion: schemaVer,
      pepperKid: null,
      hasLegacyScryptParams: false,
      usesInternalDefaultPepper: false,
      needsMigration: false,
    };
  }

  if (typeof storedHash === 'string' && /^[a-f0-9]{64}$/i.test(storedHash)) {
    return {
      category: 'legacy_sha256',
      securitySchemaVersion: schemaVer,
      pepperKid: null,
      hasLegacyScryptParams: false,
      usesInternalDefaultPepper: false,
      needsMigration: true,
    };
  }

  if (typeof storedHash === 'string' && storedHash.startsWith('scrypt$v1$')) {
    const parts = storedHash.split('$');
    const costN = Number(parts[2]);
    const blockR = Number(parts[3]);
    const parallelP = Number(parts[4]);
    const isActiveParams =
      costN === SCRYPT_PARAMS.N && blockR === SCRYPT_PARAMS.r && parallelP === SCRYPT_PARAMS.p;
    const isDefaultInternal =
      existingRecord.pepperMode === 'dev-internal-fallback' ||
      recordKid === defaultKid ||
      (!configured && (!recordKid || recordKid === activeKid)) ||
      (Boolean(configured) && !recordKid && schemaVer < CURRENT_SECURITY_SCHEMA_VERSION && isActiveParams);

    if (previousKid && recordKid === previousKid) {
      return {
        category: 'previous_pepper',
        securitySchemaVersion: schemaVer,
        pepperKid: recordKid,
        hasLegacyScryptParams: !isActiveParams,
        usesInternalDefaultPepper: false,
        needsMigration: true,
      };
    }

    if (isDefaultInternal) {
      return {
        category: 'legacy_internal_pepper',
        securitySchemaVersion: schemaVer,
        pepperKid: recordKid,
        hasLegacyScryptParams: !isActiveParams,
        usesInternalDefaultPepper: true,
        needsMigration: true,
      };
    }

    if (!isActiveParams) {
      return {
        category: 'legacy_scrypt',
        securitySchemaVersion: schemaVer,
        pepperKid: recordKid,
        hasLegacyScryptParams: true,
        usesInternalDefaultPepper: isEligibleLegacyDefaultPepperRecord(existingRecord),
        needsMigration: true,
      };
    }

    const isFullyActive =
      Boolean(configured) &&
      recordKid === activeKid &&
      schemaVer >= CURRENT_SECURITY_SCHEMA_VERSION &&
      existingRecord.pepperMode !== 'dev-internal-fallback';

    return {
      category: isFullyActive ? 'active_production_pepper' : 'legacy_internal_pepper',
      securitySchemaVersion: schemaVer,
      pepperKid: recordKid,
      hasLegacyScryptParams: false,
      usesInternalDefaultPepper: !isFullyActive,
      needsMigration: !isFullyActive,
    };
  }

  return {
    category: 'legacy_scrypt',
    securitySchemaVersion: schemaVer,
    pepperKid: recordKid,
    hasLegacyScryptParams: true,
    usesInternalDefaultPepper: false,
    needsMigration: true,
  };
}

export function inspectWorkspaceMigrationSummary(recordsSource = localDevMemoryStore) {
  const byCategory = {
    legacy_plaintext: 0,
    legacy_sha256: 0,
    legacy_scrypt: 0,
    legacy_internal_pepper: 0,
    previous_pepper: 0,
    active_production_pepper: 0,
    no_pin: 0,
  };
  const byPepperKid = {};
  let totalRecords = 0;

  const iterable =
    recordsSource instanceof Map
      ? Array.from(recordsSource.values())
      : Array.isArray(recordsSource)
      ? recordsSource
      : [];

  for (const rawItem of iterable) {
    let record = rawItem;
    if (typeof rawItem === 'string') {
      try {
        record = JSON.parse(rawItem);
      } catch {
        continue;
      }
    }
    if (!record || typeof record !== 'object') continue;
    totalRecords += 1;
    const info = classifyRecordPinSecurity(record);
    byCategory[info.category] = (byCategory[info.category] || 0) + 1;
    const kidLabel = info.pepperKid || 'none';
    byPepperKid[kidLabel] = (byPepperKid[kidLabel] || 0) + 1;
  }

  const pendingLegacyDefaultPepperCount = byCategory.legacy_internal_pepper;
  const pendingPreviousPepperCount = byCategory.previous_pepper;
  const pendingAnyLegacyCount =
    byCategory.legacy_plaintext +
    byCategory.legacy_sha256 +
    byCategory.legacy_scrypt +
    byCategory.legacy_internal_pepper +
    byCategory.previous_pepper;

  return {
    totalRecords,
    byCategory,
    byPepperKid,
    pendingLegacyDefaultPepperCount,
    pendingPreviousPepperCount,
    pendingAnyLegacyCount,
    readyToRemovePreviousPepper: pendingPreviousPepperCount === 0,
    readyToDisableLegacyDefaultPepper:
      pendingLegacyDefaultPepperCount === 0 &&
      byCategory.legacy_plaintext === 0 &&
      byCategory.legacy_sha256 === 0,
  };
}

function getVerificationPepperCandidates(existingRecord) {
  const active = getActivePinPepper();
  const previousSecret = String(process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS || '').trim();
  const defaultKid = getPepperKeyId(DEFAULT_INTERNAL_PIN_PEPPER);
  const recordKid =
    typeof existingRecord?.pepperKid === 'string' && existingRecord.pepperKid.trim()
      ? existingRecord.pepperKid.trim()
      : null;

  const candidates = [];
  const seenSecrets = new Set();
  const pushCandidate = (secret, isPrimary, source) => {
    if (!secret || seenSecrets.has(secret)) return;
    seenSecrets.add(secret);
    candidates.push({
      secret,
      kid: getPepperKeyId(secret),
      isPrimary,
      source,
    });
  };

  const previousCandidate =
    previousSecret && previousSecret !== active.secret
      ? { secret: previousSecret, kid: getPepperKeyId(previousSecret) }
      : null;

  if (recordKid && recordKid === active.kid) {
    pushCandidate(active.secret, true, 'active');
    return candidates;
  }

  if (recordKid && previousCandidate && recordKid === previousCandidate.kid) {
    pushCandidate(previousCandidate.secret, false, 'previous');
    pushCandidate(active.secret, true, 'active');
    return candidates;
  }

  pushCandidate(active.secret, true, 'active');
  if (previousCandidate) {
    pushCandidate(previousCandidate.secret, false, 'previous');
  }

  // Izinkan fallback verifikasi legacy internal pepper HANYA untuk mode dev tanpa secret ATAU
  // record warisan yang memenuhi kriteria ketat isEligibleLegacyDefaultPepperRecord().
  if (
    !active.isConfigured ||
    !existingRecord ||
    isEligibleLegacyDefaultPepperRecord(existingRecord) ||
    (!recordKid && !active.isConfigured)
  ) {
    if (!active.isConfigured || (existingRecord && isEligibleLegacyDefaultPepperRecord(existingRecord))) {
      const legacyMatchesRecordKid = !recordKid || recordKid === defaultKid;
      if (legacyMatchesRecordKid) {
        pushCandidate(DEFAULT_INTERNAL_PIN_PEPPER, !active.isConfigured, 'legacy-internal');
      }
    }
  }

  return candidates;
}

function computePepperedPinInput(cleanPin, customPepperSecret) {
  const secret = customPepperSecret || getActivePinPepper().secret;
  return createHmac('sha256', secret)
    .update(`asesmerdeka:pin:v2:${cleanPin}`)
    .digest('hex');
}

export function hashTeacherPin(rawPin, existingSaltHex, customOptions = {}) {
  const clean = sanitizeKeySegment(rawPin);
  if (!clean) return undefined;
  const pepperSecret = customOptions?.pepperSecret
    ? String(customOptions.pepperSecret)
    : getActivePinPepper().secret;
  const costN = Number.isInteger(customOptions?.N) ? customOptions.N : SCRYPT_PARAMS.N;
  const blockR = Number.isInteger(customOptions?.r) ? customOptions.r : SCRYPT_PARAMS.r;
  const parallelP = Number.isInteger(customOptions?.p) ? customOptions.p : SCRYPT_PARAMS.p;
  const keylen = Number.isInteger(customOptions?.keylen) ? customOptions.keylen : SCRYPT_PARAMS.keylen;
  const maxmem = Math.max(SCRYPT_PARAMS.maxmem, 256 * costN * blockR);

  const saltHex =
    typeof existingSaltHex === 'string' && /^[a-f0-9]{16,64}$/i.test(existingSaltHex)
      ? existingSaltHex.toLowerCase()
      : randomBytes(16).toString('hex');
  const peppered = computePepperedPinInput(clean, pepperSecret);
  const derivedHex = scryptSync(
    peppered,
    Buffer.from(saltHex, 'hex'),
    keylen,
    {
      N: costN,
      r: blockR,
      p: parallelP,
      maxmem,
    }
  ).toString('hex');
  return `scrypt$v1$${costN}$${blockR}$${parallelP}$${saltHex}$${derivedHex}`;
}

export function hashTeacherPinLegacySha256(rawPin) {
  const clean = sanitizeKeySegment(rawPin);
  if (!clean) return undefined;
  return createHash('sha256').update(`asesmerdeka:sync-pin:v1:${clean}`).digest('hex');
}

function constantTimeHexEqual(hexA, hexB) {
  if (typeof hexA !== 'string' || typeof hexB !== 'string' || !hexA || hexA.length !== hexB.length) {
    return false;
  }
  try {
    const bufA = Buffer.from(hexA, 'hex');
    const bufB = Buffer.from(hexB, 'hex');
    if (bufA.length === 0 || bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function constantTimeStringDigestEqual(strA, strB) {
  const digestA = createHash('sha256').update(String(strA || '')).digest();
  const digestB = createHash('sha256').update(String(strB || '')).digest();
  return timingSafeEqual(digestA, digestB);
}

function extractTeacherIdentityAndPin(rawPin, explicitTeacherId) {
  const trimmedPin = String(rawPin || '').trim();
  const cleanExplicitId = sanitizeKeySegment(explicitTeacherId || '');

  if (cleanExplicitId) {
    return {
      namespaceSegment: cleanExplicitId,
      secretPinRaw: trimmedPin,
      pinCandidates: trimmedPin ? [trimmedPin] : [],
    };
  }

  // Mendukung format opsional NAMA:PIN atau NAMA#PIN (tetap kompatibel dengan PIN tunggal seperti FAJAR88)
  const sepMatch = trimmedPin.match(/^([A-Za-z0-9_-]{2,40})[:#](.{2,64})$/);
  if (sepMatch) {
    const teacherPart = sanitizeKeySegment(sepMatch[1]);
    const secretPart = sepMatch[2].trim();
    return {
      namespaceSegment: teacherPart,
      secretPinRaw: secretPart,
      pinCandidates: [secretPart, trimmedPin],
    };
  }

  const singleSegment = sanitizeKeySegment(trimmedPin);
  return {
    namespaceSegment: singleSegment || '',
    secretPinRaw: trimmedPin,
    pinCandidates: trimmedPin ? [trimmedPin] : [],
  };
}

export function verifyTeacherPinHash(rawPin, storedHash, options = {}) {
  const cleanCandidate = sanitizeKeySegment(rawPin);
  if (!cleanCandidate || typeof storedHash !== 'string' || !storedHash.startsWith('scrypt$v1$')) {
    return { matched: false, needsMigration: false };
  }

  const parts = storedHash.split('$');
  if (parts.length !== 7) {
    return { matched: false, needsMigration: false };
  }

  const costN = Number(parts[2]);
  const blockR = Number(parts[3]);
  const parallelP = Number(parts[4]);
  const saltHex = parts[5];
  const expectedHex = parts[6];

  const isPowerOfTwoN =
    Number.isInteger(costN) && costN >= 1024 && costN <= 131072 && (costN & (costN - 1)) === 0;
  if (
    !isPowerOfTwoN ||
    !Number.isInteger(blockR) ||
    blockR < 1 ||
    blockR > 16 ||
    !Number.isInteger(parallelP) ||
    parallelP < 1 ||
    parallelP > 16 ||
    !/^[a-f0-9]{16,64}$/i.test(saltHex) ||
    !/^[a-f0-9]{64,128}$/i.test(expectedHex)
  ) {
    return { matched: false, needsMigration: false };
  }

  const activePepper = getActivePinPepper();
  const candidates = options?.pepperSecret
    ? [
        {
          secret: String(options.pepperSecret),
          kid: getPepperKeyId(options.pepperSecret),
          isPrimary: String(options.pepperSecret) === activePepper.secret,
          source: 'custom',
        },
      ]
    : getVerificationPepperCandidates(options?.existingRecord);

  const saltBuf = Buffer.from(saltHex, 'hex');
  const keyLenBytes = expectedHex.length / 2;
  const maxmem = Math.max(64 * 1024 * 1024, 256 * costN * blockR);
  const expectedLower = expectedHex.toLowerCase();
  const needsParamUpgrade =
    costN !== SCRYPT_PARAMS.N || blockR !== SCRYPT_PARAMS.r || parallelP !== SCRYPT_PARAMS.p;

  for (const candidate of candidates) {
    const peppered = computePepperedPinInput(cleanCandidate, candidate.secret);
    const derivedHex = scryptSync(peppered, saltBuf, keyLenBytes, {
      N: costN,
      r: blockR,
      p: parallelP,
      maxmem,
    }).toString('hex');

    if (constantTimeHexEqual(derivedHex, expectedLower)) {
      const recordKid =
        typeof options?.existingRecord?.pepperKid === 'string'
          ? options.existingRecord.pepperKid.trim()
          : '';
      const recordSchemaVer = Number(options?.existingRecord?.securitySchemaVersion) || 0;
      const needsSchemaUpgrade =
        activePepper.isConfigured && recordSchemaVer < CURRENT_SECURITY_SCHEMA_VERSION;
      const needsPepperUpgrade = !candidate.isPrimary || recordKid !== activePepper.kid;
      return {
        matched: true,
        needsMigration: needsParamUpgrade || needsPepperUpgrade || needsSchemaUpgrade,
        matchedPepperKid: candidate.kid,
        matchedPepperSource: candidate.source,
      };
    }
  }

  return { matched: false, needsMigration: false };
}

function verifySingleCandidateAgainstRecord(existingRecord, candidatePin) {
  const cleanCandidate = sanitizeKeySegment(candidatePin);
  if (!cleanCandidate) {
    return { matched: false, needsMigration: false };
  }

  const storedHash = existingRecord.teacherPinHash;
  if (typeof storedHash === 'string' && storedHash.startsWith('scrypt$v1$')) {
    return verifyTeacherPinHash(cleanCandidate, storedHash, { existingRecord });
  }

  if (typeof storedHash === 'string' && /^[a-f0-9]{64}$/i.test(storedHash)) {
    const legacyHash = hashTeacherPinLegacySha256(cleanCandidate);
    const matched = constantTimeHexEqual(legacyHash, storedHash.toLowerCase());
    return {
      matched,
      needsMigration: matched,
      matchedPepperSource: matched ? 'legacy-sha256' : undefined,
    };
  }

  if (typeof existingRecord.teacherPin === 'string' && existingRecord.teacherPin.trim()) {
    const cleanLegacyPlain = sanitizeKeySegment(existingRecord.teacherPin);
    const matched = constantTimeStringDigestEqual(cleanCandidate, cleanLegacyPlain);
    return {
      matched,
      needsMigration: matched,
      matchedPepperSource: matched ? 'legacy-plaintext' : undefined,
    };
  }

  return { matched: false, needsMigration: false };
}

function verifyTeacherPinRecord(existingRecord, pinCandidates) {
  if (!existingRecord) {
    return { valid: true, needsMigration: false, matchedSecretPin: pinCandidates[0] || '' };
  }

  const hasStoredPin = Boolean(
    existingRecord.teacherPinHash ||
      (typeof existingRecord.teacherPin === 'string' && existingRecord.teacherPin.trim())
  );

  if (!hasStoredPin) {
    return { valid: true, needsMigration: false, matchedSecretPin: pinCandidates[0] || '' };
  }

  if (!Array.isArray(pinCandidates) || pinCandidates.length === 0) {
    return { valid: false, needsMigration: false, reason: 'PIN_REQUIRED' };
  }

  for (const candidate of pinCandidates) {
    const res = verifySingleCandidateAgainstRecord(existingRecord, candidate);
    if (res.matched) {
      return {
        valid: true,
        needsMigration: res.needsMigration,
        matchedSecretPin: candidate,
        matchedPepperSource: res.matchedPepperSource,
      };
    }
  }

  return { valid: false, needsMigration: false, reason: 'PIN_MISMATCH' };
}

function computeStableContentHash(entries) {
  const stableStringify = (val) => {
    if (val === null || typeof val !== 'object') {
      return JSON.stringify(val);
    }
    if (Array.isArray(val)) {
      return `[${val.map((item) => stableStringify(item)).join(',')}]`;
    }
    const keys = Object.keys(val).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(val[k])}`).join(',')}}`;
  };
  return createHash('sha256').update(stableStringify(entries || {})).digest('hex');
}

function isPlainRecordServer(val) {
  return Boolean(val && typeof val === 'object' && !Array.isArray(val));
}

function canonicalStringifySyncServer(val) {
  if (val === null || val === undefined || typeof val !== 'object') {
    if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
      return 'null';
    }
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val
      .map((item) =>
        item === undefined || typeof item === 'function' || typeof item === 'symbol'
          ? 'null'
          : canonicalStringifySyncServer(item)
      )
      .join(',')}]`;
  }
  const keys = Object.keys(val)
    .filter(
      (k) =>
        val[k] !== undefined &&
        typeof val[k] !== 'function' &&
        typeof val[k] !== 'symbol'
    )
    .sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalStringifySyncServer(val[k])}`)
    .join(',')}}`;
}

export function computeCanonicalDigestHex(val) {
  const input = canonicalStringifySyncServer(val);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ ((ch + i) & 0xffff), 0x85ebca6b);
    h3 = Math.imul(h3 ^ (ch + (i << 1)), 0xc2b2ae35);
    h4 = Math.imul(h4 ^ ((ch << 5) ^ i), 0x27d4eb2f);
  }

  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  );
}

function isModulDraftStorageKeyServer(key) {
  return key.startsWith('asesmerdeka_modul_v2__') || key.startsWith('modul_ajar_');
}

function syncLegacyArraysFromStructuredStagesServer(stages) {
  const formatLine = (stageName, durasiMenit, body) =>
    `${stageName} (${durasiMenit} Menit): ${body}`;
  const buildFase = (targetFase) =>
    stages
      .filter((s) => s && s.fase === targetFase)
      .map((s) =>
        formatLine(
          s.namaTahap,
          s.durasiMenit,
          `${s.aktivitasGuru} ${s.aktivitasSiswa}`.trim()
        )
      );
  return {
    pendahuluan: buildFase('pendahuluan'),
    inti: buildFase('inti'),
    penutup: buildFase('penutup'),
  };
}

function summarizeAsesmenDetailToLegacyServer(detail) {
  return {
    diagnostik: `${detail.diagnostik.tujuanPemeriksaanPrasyarat} Tugas awal: ${detail.diagnostik.pertanyaanAtauTugasAwal[0] || ''} Indikator: ${detail.diagnostik.indikatorInterpretasi}`,
    formatif: `${detail.formatif.instruksiAktivitas} Bukti diamati: ${detail.formatif.buktiYangDiamati.join('; ')}. Umpan balik: ${detail.formatif.umpanBalikGuru}`,
    sumatif: `${detail.akhir.bentukUtama} (${detail.akhir.butirTugas.length} butir tugas & kunci/contoh respons). ${detail.akhir.pedomanPenilaian}`,
  };
}

function decodeModulAjarFromWireServer(rawDoc) {
  const out = { ...rawDoc };

  if (out.__syncDerivedAsesmen === 1 && isPlainRecordServer(out.asesmenDetail)) {
    const ad = out.asesmenDetail;
    if (
      ad.diagnostik &&
      Array.isArray(ad.diagnostik.pertanyaanAtauTugasAwal) &&
      ad.formatif &&
      Array.isArray(ad.formatif.buktiYangDiamati) &&
      ad.akhir &&
      Array.isArray(ad.akhir.butirTugas)
    ) {
      out.asesmen = summarizeAsesmenDetailToLegacyServer(ad);
    }
    delete out.__syncDerivedAsesmen;
  }

  if (Array.isArray(out.kegiatanPembelajaran)) {
    const expandedMeetings = out.kegiatanPembelajaran.map((m) =>
      isPlainRecordServer(m) ? { ...m } : m
    );
    const baseMeeting = isPlainRecordServer(expandedMeetings[0]) ? expandedMeetings[0] : null;
    const baseStages =
      baseMeeting && Array.isArray(baseMeeting.tahapTerstruktur)
        ? baseMeeting.tahapTerstruktur
        : null;

    for (let idx = 0; idx < expandedMeetings.length; idx += 1) {
      const keg = expandedMeetings[idx];
      if (!isPlainRecordServer(keg)) continue;

      if (
        idx > 0 &&
        baseStages &&
        isPlainRecordServer(keg.tahapTerstruktur) &&
        keg.tahapTerstruktur.__syncCloneOfPertemuan === 0 &&
        Array.isArray(keg.tahapTerstruktur.overrides)
      ) {
        const overrides = keg.tahapTerstruktur.overrides;
        if (overrides.length === baseStages.length) {
          keg.tahapTerstruktur = overrides.map((ovRaw, sIdx) => {
            const baseSt = isPlainRecordServer(baseStages[sIdx]) ? baseStages[sIdx] : {};
            const ov = isPlainRecordServer(ovRaw) ? ovRaw : {};
            return {
              ...baseSt,
              id: ov.id,
              urutan: ov.urutan,
              durasiMenit: ov.durasiMenit,
            };
          });
        }
      }

      if (keg.__syncDerivedSteps === 1) {
        if (Array.isArray(keg.tahapTerstruktur) && keg.tahapTerstruktur.length > 0) {
          const derived = syncLegacyArraysFromStructuredStagesServer(keg.tahapTerstruktur);
          keg.pendahuluan = derived.pendahuluan;
          keg.inti = derived.inti;
          keg.penutup = derived.penutup;
        }
        delete keg.__syncDerivedSteps;
      }
    }

    out.kegiatanPembelajaran = expandedMeetings;
  }

  return out;
}

function decodeLegacyBackupFromWireServer(rawBackup, workspaceContext) {
  if (!Array.isArray(rawBackup.__syncDedupedKeys)) {
    return rawBackup;
  }
  const out = { ...rawBackup };
  const reconstructed = isPlainRecordServer(rawBackup.entries) ? { ...rawBackup.entries } : {};
  for (const subKey of rawBackup.__syncDedupedKeys) {
    if (
      typeof subKey === 'string' &&
      Object.prototype.hasOwnProperty.call(workspaceContext, subKey)
    ) {
      const topVal = workspaceContext[subKey];
      reconstructed[subKey] = typeof topVal === 'string' ? topVal : JSON.stringify(topVal);
    }
  }
  out.entries = reconstructed;
  delete out.__syncDedupedKeys;
  return out;
}

export function decodeEntriesFromCloudSyncServer(entries, workspaceContext) {
  const decoded = {};
  for (const [key, value] of Object.entries(entries || {})) {
    if (key === 'asesmerdeka_legacy_backup_v1') continue;
    if (isModulDraftStorageKeyServer(key) && isPlainRecordServer(value)) {
      decoded[key] = decodeModulAjarFromWireServer(value);
      continue;
    }
    decoded[key] = value;
  }

  if (Object.prototype.hasOwnProperty.call(entries || {}, 'asesmerdeka_legacy_backup_v1')) {
    const rawBackup = (entries || {})['asesmerdeka_legacy_backup_v1'];
    const mergedContext = workspaceContext ? { ...workspaceContext, ...decoded } : decoded;
    decoded['asesmerdeka_legacy_backup_v1'] = isPlainRecordServer(rawBackup)
      ? decodeLegacyBackupFromWireServer(rawBackup, mergedContext)
      : rawBackup;
  }

  return decoded;
}

function buildRedisWorkspaceKey(licenseCode, namespaceSegment, allowIndividualLegacyKey = false, legacyRawPin = '') {
  const cleanCode = sanitizeKeySegment(licenseCode);
  const cleanNamespace = sanitizeKeySegment(namespaceSegment || 'DEFAULT');
  if (isSchoolSharedCode(cleanCode)) {
    return `asesmerdeka:sync:v1:${cleanCode}:guru_${cleanNamespace}`;
  }
  if (allowIndividualLegacyKey) {
    const cleanLegacyPin = sanitizeKeySegment(legacyRawPin || '');
    if (cleanLegacyPin && cleanLegacyPin !== 'DEFAULT') {
      return `asesmerdeka:sync:v1:${cleanCode}:pin_${cleanLegacyPin}`;
    }
  }
  // Untuk Lisensi Guru Mandiri (Individu), ruang utama tetap :MAIN agar PIN benar-benar mengunci akses
  return cleanNamespace && cleanNamespace !== 'DEFAULT' && legacyRawPin === '__TEACHER_ID__'
    ? `asesmerdeka:sync:v1:${cleanCode}:guru_${cleanNamespace}`
    : `asesmerdeka:sync:v1:${cleanCode}:MAIN`;
}

// Skrip Lua atomik untuk migrasi teacherPinHash / ownerDevices pada saat pull tanpa mengubah revisi
const LUA_UPDATE_SECURITY_METADATA_SCRIPT = `
local currentRaw = redis.call('GET', KEYS[1])
if not currentRaw then
  return {'MISSING'}
end
local ok, current = pcall(cjson.decode, currentRaw)
if not ok or type(current) ~= 'table' then
  return {'MISSING'}
end
local expectedRev = tonumber(ARGV[1])
local currentRev = tonumber(current.revision) or 1
if currentRev ~= expectedRev then
  return {'STALE'}
end
redis.call('SET', KEYS[1], ARGV[2])
return {'OK'}
`.trim();

async function withWorkspaceLock(key, taskFn) {
  const previous = workspaceLocks.get(key) || Promise.resolve();
  let releaseCurrent;
  const current = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const chained = previous.then(() => current);
  workspaceLocks.set(key, chained);

  await previous;
  try {
    return await taskFn();
  } finally {
    releaseCurrent();
    if (workspaceLocks.get(key) === chained) {
      workspaceLocks.delete(key);
    }
  }
}

async function redisGetJson(key) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return {
      configured: false,
      value: localDevMemoryStore.get(key) || null,
    };
  }

  let res;
  try {
    const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`;
    res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new RedisUnavailableError(503);
  }

  if (!res || !res.ok) {
    throw new RedisUnavailableError(503);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new RedisUnavailableError(503);
  }

  if (data && data.error) {
    throw new RedisUnavailableError(503);
  }

  if (!data || data.result === null || data.result === undefined) {
    return { configured: true, value: null };
  }

  try {
    const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    return { configured: true, value: parsed };
  } catch {
    return { configured: true, value: null };
  }
}

async function redisGetStoredJson(key, localStore) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    const raw = localStore.get(key) ?? null;
    if (!raw) return { configured: false, value: null };
    try {
      return { configured: false, value: typeof raw === 'string' ? JSON.parse(raw) : raw };
    } catch {
      return { configured: false, value: null };
    }
  }

  let res;
  try {
    const endpoint = `${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`;
    res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new RedisUnavailableError(503);
  }

  if (!res || !res.ok) {
    throw new RedisUnavailableError(503);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new RedisUnavailableError(503);
  }

  if (data && data.error) {
    throw new RedisUnavailableError(503);
  }

  if (!data || data.result === null || data.result === undefined) {
    return { configured: true, value: null };
  }

  try {
    const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    return { configured: true, value: parsed };
  } catch {
    return { configured: true, value: null };
  }
}

async function redisSetStoredJson(key, valueObj, ttlSeconds, localStore) {
  const serialized = JSON.stringify(valueObj);
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    localStore.set(key, serialized);
    return { configured: false };
  }

  const cmd =
    Number.isInteger(ttlSeconds) && ttlSeconds > 0
      ? ['SET', key, serialized, 'EX', String(ttlSeconds)]
      : ['SET', key, serialized];

  let res;
  try {
    const endpoint = url.replace(/\/$/, '');
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cmd),
    });
  } catch {
    throw new RedisUnavailableError(503);
  }

  if (res && res.status === 413) {
    throw new ClientValidationError(
      'Ukuran potongan penyimpanan melebihi batas request server penyimpanan Cloud.',
      413,
      { payloadTooLarge: true }
    );
  }

  if (!res || !res.ok) {
    throw new RedisUnavailableError(503);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new RedisUnavailableError(503);
  }

  if (!data || data.error) {
    throw new RedisUnavailableError(503);
  }

  return { configured: true };
}

async function redisDelStoredKeys(keys, localStore) {
  if (!Array.isArray(keys) || keys.length === 0) return;
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    for (const k of keys) localStore.delete(k);
    return;
  }

  try {
    const endpoint = url.replace(/\/$/, '');
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', ...keys]),
    });
  } catch {
    // Cleanup best-effort only; TTL expires staging keys automatically
  }
}

function buildWorkspaceChunkKey(baseKey, hash) {
  return `${baseKey}:chk:${String(hash || '').slice(0, 16)}`;
}

function buildWorkspaceStageKey(baseKey, uploadId, chunkIndex) {
  return `${baseKey}:stage:${uploadId}:${chunkIndex}`;
}

function partitionEntriesForStorage(entries, targetChunkBytes) {
  const sortedKeys = Object.keys(entries || {}).sort();
  if (sortedKeys.length === 0) {
    return [{}];
  }
  const buckets = [];
  let current = {};
  let currentBytes = 2;

  for (const key of sortedKeys) {
    const val = entries[key];
    if (val === undefined) continue;
    const itemSerialized = `${JSON.stringify(key)}:${JSON.stringify(val)}`;
    const itemBytes = Buffer.byteLength(itemSerialized, 'utf8') + 1;
    if (Object.keys(current).length > 0 && currentBytes + itemBytes > targetChunkBytes) {
      buckets.push(current);
      current = {};
      currentBytes = 2;
    }
    current[key] = val;
    currentBytes += itemBytes;
  }

  if (Object.keys(current).length > 0 || buckets.length === 0) {
    buckets.push(current);
  }
  return buckets;
}

async function hydrateWorkspaceRecord(baseKey, record) {
  if (!record || typeof record !== 'object') return record;
  if (record.storageFormat !== 'chunked_v1') {
    return {
      ...record,
      entries: isPlainRecordServer(record.entries) ? record.entries : {},
    };
  }

  const chunkRefs = Array.isArray(record.chunkRefs) ? record.chunkRefs : [];
  const entries = {};

  for (const ref of chunkRefs) {
    if (!ref || typeof ref.hash !== 'string' || !ref.hash) {
      throw new RedisUnavailableError(503);
    }
    const chunkKey = buildWorkspaceChunkKey(baseKey, ref.hash);
    const chunkRes = await redisGetStoredJson(chunkKey, localDevChunkStore);
    const chunkObj = chunkRes.value;
    if (!chunkObj || chunkObj.enc !== 'gzip-base64' || typeof chunkObj.data !== 'string') {
      throw new RedisUnavailableError(503);
    }
    let rawJsonBuf;
    try {
      rawJsonBuf = gunzipSync(Buffer.from(chunkObj.data, 'base64'));
    } catch {
      throw new RedisUnavailableError(503);
    }
    const digest = createHash('sha256').update(rawJsonBuf).digest('hex');
    if (digest !== ref.hash) {
      throw new RedisUnavailableError(503);
    }
    let parsedEntries;
    try {
      parsedEntries = JSON.parse(rawJsonBuf.toString('utf8'));
    } catch {
      throw new RedisUnavailableError(503);
    }
    if (!isPlainRecordServer(parsedEntries)) {
      throw new RedisUnavailableError(503);
    }
    Object.assign(entries, parsedEntries);
  }

  return {
    ...record,
    entries,
  };
}

async function prepareWorkspaceRecordForCas(baseKey, fullRecord) {
  const entries = isPlainRecordServer(fullRecord.entries) ? fullRecord.entries : {};
  const rawSerialized = JSON.stringify(fullRecord);
  const rawBytes = Buffer.byteLength(rawSerialized, 'utf8');

  if (rawBytes > MAX_TOTAL_WORKSPACE_BYTES) {
    throw new ClientValidationError(
      'Ukuran total workspace melebihi batas maksimal 12 MB.',
      413,
      {
        payloadTooLarge: true,
        maxBytes: MAX_TOTAL_WORKSPACE_BYTES,
        actualBytes: rawBytes,
      }
    );
  }

  if (rawBytes <= MAX_INLINE_RECORD_BYTES) {
    return {
      casRecord: fullRecord,
      storageFormat: 'inline',
      chunkCount: 0,
      totalUncompressedBytes: rawBytes,
    };
  }

  const buckets = partitionEntriesForStorage(entries, TARGET_STORAGE_CHUNK_BYTES);
  const chunkRefs = [];

  for (let idx = 0; idx < buckets.length; idx += 1) {
    const bucket = buckets[idx];
    const bucketBuf = Buffer.from(JSON.stringify(bucket), 'utf8');
    const hash = createHash('sha256').update(bucketBuf).digest('hex');
    const gzBase64 = gzipSync(bucketBuf).toString('base64');
    const envelope = {
      v: 1,
      enc: 'gzip-base64',
      sha256: hash,
      bytes: bucketBuf.length,
      data: gzBase64,
    };
    const envelopeBytes = Buffer.byteLength(JSON.stringify(envelope), 'utf8');
    if (envelopeBytes > MAX_SINGLE_REQUEST_BYTES) {
      throw new ClientValidationError(
        'Satu entri workspace terlalu besar untuk disimpan ke Cloud.',
        413,
        {
          payloadTooLarge: true,
          maxBytes: MAX_SINGLE_REQUEST_BYTES,
          actualBytes: envelopeBytes,
        }
      );
    }

    await redisSetStoredJson(
      buildWorkspaceChunkKey(baseKey, hash),
      envelope,
      0,
      localDevChunkStore
    );

    chunkRefs.push({
      index: idx,
      hash,
      keyCount: Object.keys(bucket).length,
      bytes: bucketBuf.length,
    });
  }

  const { entries: _omitted, ...meta } = fullRecord;
  const manifestRecord = {
    ...meta,
    storageFormat: 'chunked_v1',
    entryCount: Object.keys(entries).length,
    totalUncompressedBytes: rawBytes,
    workspaceChecksum: computeCanonicalDigestHex(entries),
    chunkRefs,
  };

  return {
    casRecord: manifestRecord,
    storageFormat: 'chunked_v1',
    chunkCount: chunkRefs.length,
    totalUncompressedBytes: rawBytes,
  };
}

// Atomic Compare-And-Set via Redis Lua EVAL:
// KEYS[1] = workspaceKey
// ARGV[1] = expectedRevision ('-1' bila tidak dikirim klien)
// ARGV[2] = nextRecordJson (revision sudah dihitung di JS sesuai expectedRevision + 1)
// ARGV[3] = requestId (atau '')
// ARGV[4] = contentHash
// ARGV[5] = deviceId
const LUA_ATOMIC_CAS_SCRIPT = `
local currentRaw = redis.call('GET', KEYS[1])
local expectedRev = tonumber(ARGV[1])
local reqId = ARGV[3] or ''
local reqHash = ARGV[4] or ''
local reqDevice = ARGV[5] or ''

if not currentRaw then
  if expectedRev ~= nil and expectedRev > 0 then
    return {'CONFLICT', '0', ''}
  end
  redis.call('SET', KEYS[1], ARGV[2])
  return {'OK', ARGV[2]}
end

local ok, current = pcall(cjson.decode, currentRaw)
if not ok or type(current) ~= 'table' then
  if expectedRev ~= nil and expectedRev > 0 then
    return {'CONFLICT', '1', currentRaw}
  end
  redis.call('SET', KEYS[1], ARGV[2])
  return {'OK', ARGV[2]}
end

local currentRev = tonumber(current.revision) or 1

if reqId ~= '' and current.lastRequestId == reqId then
  return {'IDEMPOTENT', tostring(currentRev), currentRaw}
end

if reqHash ~= '' and current.lastContentHash == reqHash and current.deviceId == reqDevice and (expectedRev == -1 or currentRev == expectedRev + 1) then
  return {'IDEMPOTENT', tostring(currentRev), currentRaw}
end

if expectedRev == nil or expectedRev < 0 then
  if currentRev > 0 then
    return {'CONFLICT', tostring(currentRev), currentRaw}
  end
elseif currentRev ~= expectedRev then
  return {'CONFLICT', tostring(currentRev), currentRaw}
end

redis.call('SET', KEYS[1], ARGV[2])
return {'OK', ARGV[2]}
`.trim();

function parseCasRecord(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getEffectiveRecordRevision(record) {
  if (!record || typeof record !== 'object') return 0;
  if (typeof record.revision === 'number' && Number.isFinite(record.revision)) {
    return record.revision;
  }
  // Rekaman warisan pra-Task 6.2 dianggap revisi 1 agar terlindungi dari overwrite diam-diam
  return 1;
}

function evaluateLocalCas({ existingRecord, expectedRev, nextRecord, reqId, contentHash, deviceId }) {
  if (!existingRecord) {
    if (expectedRev !== null && expectedRev > 0) {
      return { status: 'CONFLICT', serverRevision: 0, record: null };
    }
    return { status: 'OK', record: nextRecord };
  }

  const currentRev = getEffectiveRecordRevision(existingRecord);

  if (reqId && existingRecord.lastRequestId === reqId) {
    return { status: 'IDEMPOTENT', serverRevision: currentRev, record: existingRecord };
  }

  if (
    contentHash &&
    existingRecord.lastContentHash === contentHash &&
    existingRecord.deviceId === deviceId &&
    (expectedRev === null || currentRev === expectedRev + 1)
  ) {
    return { status: 'IDEMPOTENT', serverRevision: currentRev, record: existingRecord };
  }

  if (expectedRev === null) {
    if (currentRev > 0) {
      return { status: 'CONFLICT', serverRevision: currentRev, record: existingRecord };
    }
  } else if (currentRev !== expectedRev) {
    return { status: 'CONFLICT', serverRevision: currentRev, record: existingRecord };
  }

  return { status: 'OK', record: nextRecord };
}

async function atomicWorkspaceCas({
  key,
  expectedRev,
  nextRecord,
  reqId,
  contentHash,
  deviceId,
}) {
  const serialized = JSON.stringify(nextRecord);
  const serializedBytes = Buffer.byteLength(serialized, 'utf8');
  if (serializedBytes > MAX_SINGLE_REQUEST_BYTES) {
    throw new ClientValidationError(
      'Ukuran data sinkronisasi melebihi batas maksimal 1.2 MB per transaksi.',
      413,
      {
        payloadTooLarge: true,
        supportsChunkedUpload: true,
        maxBytes: MAX_SINGLE_REQUEST_BYTES,
        actualBytes: serializedBytes,
      }
    );
  }

  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    const existingRecord = localDevMemoryStore.get(key) || null;
    const outcome = evaluateLocalCas({
      existingRecord,
      expectedRev,
      nextRecord,
      reqId,
      contentHash,
      deviceId,
    });
    if (outcome.status === 'OK') {
      localDevMemoryStore.set(key, nextRecord);
    }
    return { configured: false, ...outcome };
  }

  let res;
  try {
    const endpoint = url.replace(/\/$/, '');
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        LUA_ATOMIC_CAS_SCRIPT,
        '1',
        key,
        expectedRev === null ? '-1' : String(expectedRev),
        serialized,
        reqId || '',
        contentHash || '',
        deviceId || '',
      ]),
    });
  } catch {
    throw new RedisUnavailableError(503);
  }

  if (!res || !res.ok) {
    throw new RedisUnavailableError(503);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new RedisUnavailableError(503);
  }

  if (!data || data.error || !Array.isArray(data.result)) {
    throw new RedisUnavailableError(503);
  }

  const [statusTag, secondVal, thirdVal] = data.result;
  if (statusTag === 'OK') {
    return { configured: true, status: 'OK', record: nextRecord };
  }
  if (statusTag === 'IDEMPOTENT') {
    const parsed = parseCasRecord(thirdVal);
    return {
      configured: true,
      status: 'IDEMPOTENT',
      serverRevision: Number(secondVal) || getEffectiveRecordRevision(parsed),
      record: parsed,
    };
  }
  if (statusTag === 'CONFLICT') {
    const parsed = parseCasRecord(thirdVal);
    return {
      configured: true,
      status: 'CONFLICT',
      serverRevision: Number(secondVal) || (parsed ? getEffectiveRecordRevision(parsed) : 0),
      record: parsed,
    };
  }

  throw new RedisUnavailableError(503);
}

async function checkLicenseRevocationStrict(cleanCode) {
  if (localRevokedLicensesSet.has(cleanCode)) {
    return true;
  }

  const { configured } = getRedisCredentials();
  if (!configured) {
    return await isLicenseRevokedInRedis(cleanCode);
  }

  const revokedRes = await redisGetJson(REVOKED_REDIS_KEY);
  if (Array.isArray(revokedRes.value) && revokedRes.value.includes(cleanCode)) {
    return true;
  }

  const regRes = await redisGetJson(REGISTRY_REDIS_KEY);
  if (Array.isArray(regRes.value)) {
    const item = regRes.value.find((entry) => entry && entry.code === cleanCode);
    if (item && item.deleted) {
      return true;
    }
  }

  return false;
}

async function getSeatRecordStrict(cleanCode) {
  const key = buildSeatRedisKey(cleanCode);
  const { configured } = getRedisCredentials();
  if (!configured) {
    return localSeatMemoryStore.get(key) || null;
  }
  const seatRes = await redisGetJson(key);
  return seatRes.value;
}

async function authorizeCloudSyncRequest(
  cleanCode,
  rawDeviceId,
  rawTeacherPin = '',
  explicitTeacherId = ''
) {
  if (!cleanCode || cleanCode.length < 6) {
    return {
      authorized: false,
      status: 400,
      body: {
        ok: false,
        message: 'Kode lisensi wajib disertakan untuk sinkronisasi cloud lintas perangkat.',
      },
    };
  }

  // Tolak kode lisensi usang yang sudah dinonaktifkan
  if (cleanCode.startsWith('PRO-MERDEKA-') || cleanCode.startsWith('ASES-')) {
    return {
      authorized: false,
      status: 403,
      body: {
        ok: false,
        unauthorized: true,
        legacyRevoked: true,
        message:
          'Kode lisensi versi lama sudah tidak berlaku dan tidak dapat digunakan untuk sinkronisasi Cloud.',
      },
    };
  }

  const preEnvCheck = validateLicenseEnvironmentBoundary(cleanCode, null);
  if (!preEnvCheck.allowed) {
    return {
      authorized: false,
      status: preEnvCheck.status || 403,
      body: {
        ok: false,
        unauthorized: true,
        forbiddenEnvironment: true,
        reason: preEnvCheck.reason,
        message: preEnvCheck.message,
      },
    };
  }

  if (await checkLicenseRevocationStrict(cleanCode)) {
    return {
      authorized: false,
      status: 403,
      body: {
        ok: false,
        revoked: true,
        unauthorized: true,
        message: 'Kode lisensi ini telah dicabut atau dinonaktifkan oleh Administrator.',
      },
    };
  }

  const cleanDev = String(rawDeviceId || '').trim().toUpperCase();
  const internalMatch = verifyInternalSerialOrDeviceCode(cleanCode, cleanDev);
  const seatRecord = await getSeatRecordStrict(cleanCode);

  const seatEnvCheck = validateLicenseEnvironmentBoundary(cleanCode, seatRecord);
  if (!seatEnvCheck.allowed) {
    return {
      authorized: false,
      status: seatEnvCheck.status || 403,
      body: {
        ok: false,
        unauthorized: true,
        forbiddenEnvironment: true,
        reason: seatEnvCheck.reason,
        message: seatEnvCheck.message,
      },
    };
  }

  const requiresCryptographicVerification =
    isStagingLicenseCode(cleanCode) || resolveLicenseRuntimeEnvironment() === 'preview';
  if ((!internalMatch && !seatRecord) || (requiresCryptographicVerification && !internalMatch)) {
    return {
      authorized: false,
      status: 403,
      body: {
        ok: false,
        unauthorized: true,
        message: 'Kode lisensi tidak valid atau belum teraktivasi untuk sinkronisasi Cloud.',
      },
    };
  }

  if (seatRecord && isLicenseExpired(seatRecord.expiresAt)) {
    return {
      authorized: false,
      status: 403,
      body: {
        ok: false,
        expired: true,
        unauthorized: true,
        expiresAt: seatRecord.expiresAt,
        message:
          'Masa berlaku lisensi telah berakhir. Sinkronisasi Awan dinonaktifkan sementara, namun data lokal Anda tetap aman.',
      },
    };
  }

  if (seatRecord && (seatRecord.lifecycleState === 'suspended' || seatRecord.suspended)) {
    return {
      authorized: false,
      status: 403,
      body: {
        ok: false,
        suspended: true,
        unauthorized: true,
        message: 'Lisensi sedang ditangguhkan sementara oleh Administrator. Data akademik Anda tetap aman.',
      },
    };
  }

  if (
    seatRecord &&
    (seatRecord.lifecycleState === 'pending_payment' ||
      seatRecord.lifecycleState === 'payment_failed')
  ) {
    return {
      authorized: false,
      status: 403,
      body: {
        ok: false,
        paymentUnverified: true,
        unauthorized: true,
        message: 'Pembayaran lisensi belum terverifikasi atau gagal.',
      },
    };
  }

  if (seatRecord && isSchoolLicenseCodeServer(cleanCode, seatRecord.maxSeats, seatRecord)) {
    const teacherCandidate = String(explicitTeacherId || rawTeacherPin || '').trim();
    const candidateKey = teacherCandidate
      ? normalizeTeacherKeyServer(teacherCandidate, cleanDev)
      : '';
    const seatEntries =
      seatRecord.teacherSeats && typeof seatRecord.teacherSeats === 'object'
        ? seatRecord.teacherSeats
        : {};
    const disabledByTeacherKey =
      candidateKey && seatEntries[candidateKey]?.status === 'disabled';
    const disabledByDevice =
      cleanDev &&
      Object.values(seatEntries).some(
        (entry) =>
          entry &&
          entry.status === 'disabled' &&
          Array.isArray(entry.devices) &&
          entry.devices.includes(cleanDev)
      );
    if (disabledByTeacherKey || disabledByDevice) {
      return {
        authorized: false,
        status: 403,
        body: {
          ok: false,
          unauthorized: true,
          teacherSeatDisabled: true,
          message:
            'Kursi guru Anda pada Lisensi Sekolah telah dinonaktifkan oleh Admin Sekolah. Data akademik Anda tetap aman.',
        },
      };
    }
  }

  if (seatRecord && Array.isArray(seatRecord.devices) && seatRecord.devices.length > 0) {
    if (!cleanDev) {
      return {
        authorized: false,
        status: 403,
        body: {
          ok: false,
          unauthorized: true,
          message: 'Identitas perangkat wajib disertakan untuk lisensi yang sudah terikat perangkat.',
        },
      };
    }

    if (!seatRecord.devices.includes(cleanDev)) {
      const maxSeats = Number(seatRecord.maxSeats) || internalMatch?.maxSeats || 2;
      return {
        authorized: false,
        status: 403,
        body: {
          ok: false,
          unauthorized: true,
          seatLimitExceeded: seatRecord.devices.length >= maxSeats,
          message:
            'Perangkat ini tidak terdaftar pada kursi aktif kode lisensi atau batas perangkat sudah penuh.',
        },
      };
    }
  }

  return { authorized: true, cleanDev };
}

function extractClientIp(req) {
  const xff = req?.headers?.['x-forwarded-for'] || req?.headers?.['X-Forwarded-For'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim().slice(0, 64);
  }
  const realIp = req?.headers?.['x-real-ip'] || req?.headers?.['X-Real-IP'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim().slice(0, 64);
  }
  return String(req?.socket?.remoteAddress || 'local').slice(0, 64);
}

// Atomic distributed rate limiting via Redis Lua EVAL (ASESMERDEKA_RATE_LIMIT_V1)
// KEYS[1] = asesmerdeka:ratelimit:sync:v1:<ipHash16>:<cleanCode>
// ARGV[1] = 'CHECK' | 'RECORD_FAIL' | 'RESET'
// ARGV[2] = windowMs (default 300000 ms)
const LUA_RATE_LIMIT_SCRIPT = `
-- ASESMERDEKA_RATE_LIMIT_V1
local op = ARGV[1] or 'CHECK'
local windowMs = tonumber(ARGV[2]) or 300000
if op == 'RESET' then
  redis.call('DEL', KEYS[1])
  return {0, 0}
end
if op == 'CHECK' then
  local count = tonumber(redis.call('GET', KEYS[1]) or '0') or 0
  local ttl = tonumber(redis.call('PTTL', KEYS[1]) or '-1') or -1
  return {count, ttl}
end
if op == 'RECORD_FAIL' then
  local count = tonumber(redis.call('INCR', KEYS[1])) or 1
  local ttl = tonumber(redis.call('PTTL', KEYS[1]) or '-1') or -1
  if count == 1 or ttl < 0 then
    redis.call('PEXPIRE', KEYS[1], windowMs)
    ttl = windowMs
  end
  return {count, ttl}
end
return {0, 0}
`.trim();

export function getRateLimitKey(req, cleanCode) {
  const clientIp = extractClientIp(req);
  const ipHash = createHash('sha256')
    .update(`asesmerdeka:rl-ip:v1:${clientIp}`)
    .digest('hex')
    .slice(0, 16);
  const safeCode = sanitizeKeySegment(cleanCode || 'EMPTY') || 'EMPTY';
  return `asesmerdeka:ratelimit:sync:v1:${ipHash}:${safeCode}`;
}

async function executeRedisRateLimitOp(rateKey, op) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    return null;
  }

  try {
    const endpoint = url.replace(/\/$/, '');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        LUA_RATE_LIMIT_SCRIPT,
        '1',
        rateKey,
        op,
        String(RATE_LIMIT_WINDOW_MS),
      ]),
    });

    if (!res || !res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || data.error || !Array.isArray(data.result)) {
      return null;
    }

    const count = Number(data.result[0]) || 0;
    const ttlMs = Number(data.result[1]);
    return { count, ttlMs };
  } catch {
    // Graceful degradation ke store memori lokal jika Redis sementara tidak terjangkau
    return null;
  }
}

export async function checkAuthRateLimit(rateKey) {
  const redisRes = await executeRedisRateLimitOp(rateKey, 'CHECK');
  if (redisRes) {
    if (redisRes.count >= MAX_FAILED_AUTH_ATTEMPTS) {
      const ttlMs = redisRes.ttlMs > 0 ? redisRes.ttlMs : RATE_LIMIT_WINDOW_MS;
      return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
        backend: 'redis',
      };
    }
    return { limited: false, attempts: redisRes.count, backend: 'redis' };
  }

  const entry = authRateLimitStore.get(rateKey);
  if (!entry) return { limited: false, backend: 'memory' };
  const now = Date.now();
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    authRateLimitStore.delete(rateKey);
    return { limited: false, backend: 'memory' };
  }
  if (entry.attempts >= MAX_FAILED_AUTH_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000)
    );
    return { limited: true, retryAfterSeconds, backend: 'memory' };
  }
  return { limited: false, attempts: entry.attempts, backend: 'memory' };
}

export async function recordFailedAuthAttempt(rateKey) {
  const redisRes = await executeRedisRateLimitOp(rateKey, 'RECORD_FAIL');
  if (redisRes) {
    return {
      attempts: redisRes.count,
      ttlMs: redisRes.ttlMs,
      backend: 'redis',
    };
  }

  const now = Date.now();
  if (authRateLimitStore.size > 1000) {
    for (const [k, v] of authRateLimitStore.entries()) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) {
        authRateLimitStore.delete(k);
      }
    }
  }
  const existing = authRateLimitStore.get(rateKey);
  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    authRateLimitStore.set(rateKey, { attempts: 1, windowStart: now });
    return { attempts: 1, ttlMs: RATE_LIMIT_WINDOW_MS, backend: 'memory' };
  }
  existing.attempts += 1;
  return {
    attempts: existing.attempts,
    ttlMs: Math.max(0, existing.windowStart + RATE_LIMIT_WINDOW_MS - now),
    backend: 'memory',
  };
}

export async function clearFailedAuthAttempt(rateKey) {
  authRateLimitStore.delete(rateKey);
  await executeRedisRateLimitOp(rateKey, 'RESET');
}

function verifyAndUpdateOwnerDevices(existingRecord, isSchool, cleanDev) {
  const existingOwnersRaw = existingRecord
    ? Array.isArray(existingRecord.ownerDevices)
      ? existingRecord.ownerDevices
      : existingRecord.deviceId
      ? [existingRecord.deviceId]
      : []
    : [];
  const cleanOwners = Array.from(
    new Set(
      existingOwnersRaw
        .map((d) => String(d || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );

  if (!isSchool || !cleanDev) {
    if (cleanDev && !cleanOwners.includes(cleanDev)) {
      return {
        allowed: true,
        nextOwnerDevices: [...cleanOwners, cleanDev],
        needsOwnerUpdate: Boolean(existingRecord),
      };
    }
    return {
      allowed: true,
      nextOwnerDevices: cleanOwners,
      needsOwnerUpdate: Boolean(existingRecord && !Array.isArray(existingRecord.ownerDevices)),
    };
  }

  if (cleanOwners.includes(cleanDev)) {
    return {
      allowed: true,
      nextOwnerDevices: cleanOwners,
      needsOwnerUpdate: Boolean(existingRecord && !Array.isArray(existingRecord.ownerDevices)),
    };
  }

  if (cleanOwners.length < MAX_DEVICES_PER_TEACHER_WORKSPACE) {
    return {
      allowed: true,
      nextOwnerDevices: [...cleanOwners, cleanDev],
      needsOwnerUpdate: Boolean(existingRecord),
    };
  }

  return {
    allowed: false,
    pinCollisionProtected: true,
    nextOwnerDevices: cleanOwners,
    needsOwnerUpdate: false,
  };
}

function verifyWorkspaceTenantGuard(existingRecord, cleanCode, pinCandidates, isSchool, cleanDev) {
  if (!existingRecord) {
    const devCheck = verifyAndUpdateOwnerDevices(null, isSchool, cleanDev);
    return {
      allowed: true,
      needsMigration: false,
      matchedSecretPin: pinCandidates[0] || '',
      matchedPepperSource: 'active',
      recordCategory: 'no_pin',
      nextOwnerDevices: devCheck.nextOwnerDevices,
      needsOwnerUpdate: false,
    };
  }

  const classification = classifyRecordPinSecurity(existingRecord);
  incrementMetricCounter(migrationMetricsStore.observedByCategory, classification.category);
  if (classification.pepperKid) {
    incrementMetricCounter(migrationMetricsStore.observedByPepperKid, classification.pepperKid);
  }

  if (existingRecord.licenseCode && normalizeLicenseCode(existingRecord.licenseCode) !== cleanCode) {
    return { allowed: false, reason: 'LICENSE_MISMATCH', pinCollisionProtected: false };
  }

  const pinCheck = verifyTeacherPinRecord(existingRecord, pinCandidates);
  if (!pinCheck.valid) {
    return {
      allowed: false,
      reason: pinCheck.reason || 'PIN_MISMATCH',
      pinCollisionProtected: false,
    };
  }

  const devCheck = verifyAndUpdateOwnerDevices(existingRecord, isSchool, cleanDev);
  if (!devCheck.allowed) {
    return {
      allowed: false,
      reason: 'PIN_DEVICE_LIMIT',
      pinCollisionProtected: true,
    };
  }

  return {
    allowed: true,
    needsMigration: pinCheck.needsMigration,
    matchedSecretPin: pinCheck.matchedSecretPin || pinCandidates[0] || '',
    matchedPepperSource: pinCheck.matchedPepperSource || 'active',
    recordCategory: classification.category,
    nextOwnerDevices: devCheck.nextOwnerDevices,
    needsOwnerUpdate: devCheck.needsOwnerUpdate,
  };
}

function evaluateLegacyPepperSunsetGate({ guard, body, explicitTeacherId, activePepper }) {
  if (!activePepper?.isConfigured || guard?.matchedPepperSource !== 'legacy-internal') {
    return {
      blocked: false,
      targetPinToHash: guard?.matchedSecretPin || '',
      needsForcedMigration: false,
      recoveryUsed: false,
    };
  }

  const sunset = isLegacyDefaultPepperSunsetActive();
  if (!sunset.sunsetPassed) {
    return {
      blocked: false,
      targetPinToHash: guard.matchedSecretPin || '',
      needsForcedMigration: true,
      recoveryUsed: false,
    };
  }

  const newTeacherPinRaw = typeof body?.newTeacherPin === 'string' ? body.newTeacherPin.trim() : '';
  const reverifyLegacyPin = Boolean(body?.reverifyLegacyPin);
  if (!newTeacherPinRaw && !reverifyLegacyPin) {
    migrationMetricsStore.sunsetBlockedCount += 1;
    return {
      blocked: true,
      status: 403,
      body: {
        ok: false,
        pinReverificationRequired: true,
        legacySunsetExpired: true,
        recoverySupported: true,
        sunsetIso: sunset.sunsetIso,
        message:
          'Masa transisi format PIN legacy telah berakhir. Data workspace Anda tetap aman dan utuh. Lakukan verifikasi ulang (reverifyLegacyPin) atau pembaruan PIN (newTeacherPin) dari perangkat terdaftar untuk memigrasikan keamanan workspace Anda.',
      },
    };
  }

  if (newTeacherPinRaw) {
    const extracted = extractTeacherIdentityAndPin(newTeacherPinRaw, explicitTeacherId);
    const cleanNewPin = sanitizeKeySegment(extracted.secretPinRaw || '');
    if (!extracted.secretPinRaw || cleanNewPin.length < 2) {
      return {
        blocked: true,
        status: 400,
        body: {
          ok: false,
          invalidNewPin: true,
          message: 'PIN Guru baru minimal 2 karakter yang valid.',
        },
      };
    }
    return {
      blocked: false,
      targetPinToHash: extracted.secretPinRaw,
      nextNamespaceSegment: extracted.namespaceSegment,
      needsForcedMigration: true,
      recoveryUsed: true,
      hasNewPin: true,
    };
  }

  return {
    blocked: false,
    targetPinToHash: guard.matchedSecretPin || '',
    nextNamespaceSegment: '',
    needsForcedMigration: true,
    recoveryUsed: true,
    hasNewPin: false,
  };
}

async function resolveRecoveryDestinationKey({
  rawCode,
  currentKey,
  legacyIndividualKey,
  sunsetGate,
  explicitTeacherId,
  isSchool,
}) {
  if (!sunsetGate?.recoveryUsed) {
    return { ok: true, destinationKey: currentKey };
  }
  let candidateKey = currentKey;
  if (!isSchool && !explicitTeacherId && legacyIndividualKey && currentKey === legacyIndividualKey) {
    candidateKey = buildRedisWorkspaceKey(rawCode, '', false, '');
  } else if (isSchool && !explicitTeacherId && sunsetGate.hasNewPin && sunsetGate.nextNamespaceSegment) {
    candidateKey = buildRedisWorkspaceKey(rawCode, sunsetGate.nextNamespaceSegment, false, '');
  }

  if (!candidateKey || candidateKey === currentKey) {
    return { ok: true, destinationKey: currentKey };
  }

  const existingDest = await redisGetJson(candidateKey);
  if (existingDest.value) {
    return {
      ok: false,
      status: 409,
      body: {
        ok: false,
        pinCollisionProtected: true,
        message:
          'PIN Guru baru tersebut sudah digunakan pada workspace lain. Gunakan PIN baru yang berbeda (atau format NAMA:PIN).',
      },
    };
  }
  return { ok: true, destinationKey: candidateKey };
}

async function copyMigratedRecordToDestination(destinationKey, currentKey, record) {
  if (!destinationKey || destinationKey === currentKey) return;
  if (record?.storageFormat === 'chunked_v1' && Array.isArray(record.chunkRefs)) {
    for (const ref of record.chunkRefs) {
      if (!ref || typeof ref.hash !== 'string' || !ref.hash) continue;
      const suffix = ref.hash.slice(0, 16);
      const srcRes = await redisGetStoredJson(`${currentKey}:chk:${suffix}`, localDevChunkStore);
      if (srcRes.value) {
        await redisSetStoredJson(
          `${destinationKey}:chk:${suffix}`,
          srcRes.value,
          0,
          localDevChunkStore
        );
      }
    }
  }
  await atomicWorkspaceCas({
    key: destinationKey,
    expectedRev: null,
    nextRecord: {
      ...record,
      migratedFromKey: undefined,
    },
    reqId: '',
    contentHash: record.lastContentHash || computeStableContentHash(record.entries || {}),
    deviceId: record.deviceId || '',
  });
}

function buildSecurityMetadataFields(nextPinHash, activePepper, existingRecord, wasMigrated) {
  if (!nextPinHash) {
    return {
      pepperKid: existingRecord?.pepperKid,
      securitySchemaVersion:
        existingRecord?.securitySchemaVersion ??
        (activePepper.isConfigured
          ? CURRENT_SECURITY_SCHEMA_VERSION
          : LEGACY_INTERNAL_SECURITY_SCHEMA_VERSION),
      pepperMode:
        existingRecord?.pepperMode ??
        (activePepper.isConfigured ? 'configured-pepper' : 'dev-internal-fallback'),
      pinHashUpgradedAt: existingRecord?.pinHashUpgradedAt,
    };
  }

  return {
    pepperKid: activePepper.kid,
    securitySchemaVersion: activePepper.isConfigured
      ? CURRENT_SECURITY_SCHEMA_VERSION
      : LEGACY_INTERNAL_SECURITY_SCHEMA_VERSION,
    pepperMode: activePepper.isConfigured ? 'configured-pepper' : 'dev-internal-fallback',
    pinHashUpgradedAt: wasMigrated
      ? new Date().toISOString()
      : existingRecord?.pinHashUpgradedAt || new Date().toISOString(),
  };
}

async function persistSecurityMetadataUpdate(key, originalRecord, updatedRecord) {
  const { url, token, configured } = getRedisCredentials();
  if (!configured) {
    localDevMemoryStore.set(key, updatedRecord);
    return;
  }

  const expectedRev = getEffectiveRecordRevision(originalRecord);
  try {
    const endpoint = url.replace(/\/$/, '');
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        LUA_UPDATE_SECURITY_METADATA_SCRIPT,
        '1',
        key,
        String(expectedRev),
        JSON.stringify(updatedRecord),
      ]),
    });
  } catch {
    // Non-fatal metadata migration failure; record will upgrade on next write
  }
}

async function resolveWorkspaceRecordForRead(primaryWorkspaceKey, legacyIndividualKey) {
  let resolvedKey = primaryWorkspaceKey;
  let result = await redisGetJson(resolvedKey);
  if (!result.value && legacyIndividualKey && legacyIndividualKey !== primaryWorkspaceKey) {
    const legacyRes = await redisGetJson(legacyIndividualKey);
    if (legacyRes.value) {
      resolvedKey = legacyIndividualKey;
      result = legacyRes;
    }
  }
  return { resolvedKey, result };
}

function parseExpectedRevisionParam(rawBaseRevision) {
  if (rawBaseRevision === undefined || rawBaseRevision === null || rawBaseRevision === '') {
    return { valid: true, expectedRev: null };
  }
  const parsedRev = Number(rawBaseRevision);
  if (!Number.isInteger(parsedRev) || parsedRev < 0) {
    return { valid: false, expectedRev: null };
  }
  return { valid: true, expectedRev: parsedRev };
}

async function buildConflictResponsePayload(casResult, resolvedKey, supportsChunkedPull) {
  const serverRec = casResult.record;
  const serverRev = casResult.serverRevision || getEffectiveRecordRevision(serverRec);
  if (
    supportsChunkedPull &&
    serverRec?.storageFormat === 'chunked_v1' &&
    Number(serverRec.totalUncompressedBytes) > MAX_PULL_INLINE_RESPONSE_BYTES
  ) {
    return {
      ok: false,
      conflict: true,
      cloudConfigured: casResult.configured,
      serverRevision: serverRev,
      serverUpdatedAt: serverRec.updatedAt || null,
      lastDeviceId: serverRec.deviceId || '',
      serverEntriesChunked: true,
      entryCount: serverRec.entryCount,
      totalUncompressedBytes: serverRec.totalUncompressedBytes,
      workspaceChecksum: serverRec.workspaceChecksum,
      chunkRefs: serverRec.chunkRefs,
      message: `Konflik sinkronisasi terdeteksi! Data terbaru di server berada pada revisi #${serverRev}. Selesaikan konflik terlebih dahulu agar perubahan perangkat lain tidak tertimpa.`,
    };
  }

  let serverEntries = serverRec?.entries || {};
  if (serverRec?.storageFormat === 'chunked_v1') {
    const hydrated = await hydrateWorkspaceRecord(resolvedKey, serverRec);
    serverEntries = hydrated.entries || {};
  }

  return {
    ok: false,
    conflict: true,
    cloudConfigured: casResult.configured,
    serverRevision: serverRev,
    serverUpdatedAt: serverRec?.updatedAt || null,
    lastDeviceId: serverRec?.deviceId || '',
    serverEntries,
    message: `Konflik sinkronisasi terdeteksi! Data terbaru di server berada pada revisi #${serverRev}. Selesaikan konflik terlebih dahulu agar perubahan perangkat lain tidak tertimpa.`,
  };
}

async function reassembleStagedUploadChunks(targetKey, uploadId, totalChunks) {
  const stageKeys = [];
  const rawEncoded = {};
  const oversizedPartsMap = new Map();

  for (let i = 0; i < totalChunks; i += 1) {
    const sKey = buildWorkspaceStageKey(targetKey, uploadId, i);
    stageKeys.push(sKey);
    const stRes = await redisGetStoredJson(sKey, localDevStageStore);
    const stVal = stRes.value;
    if (!stVal || stVal.uploadId !== uploadId || stVal.chunkIndex !== i || !stVal.chunk) {
      return {
        ok: false,
        missingChunkIndex: i,
        stageKeys,
        message: `Potongan sinkronisasi ke-${i + 1} dari ${totalChunks} tidak ditemukan atau kedaluwarsa. Data Cloud tidak diubah.`,
      };
    }

    const ch = stVal.chunk;
    if (ch.kind === 'entries' && isPlainRecordServer(ch.entriesChunk)) {
      Object.assign(rawEncoded, ch.entriesChunk);
    } else if (
      ch.kind === 'oversized_part' &&
      typeof ch.key === 'string' &&
      ch.key &&
      Number.isInteger(ch.partIndex) &&
      Number.isInteger(ch.totalParts) &&
      ch.totalParts >= 1 &&
      typeof ch.slice === 'string'
    ) {
      let list = oversizedPartsMap.get(ch.key);
      if (!list) {
        list = [];
        oversizedPartsMap.set(ch.key, list);
      }
      list.push(ch);
    } else {
      return {
        ok: false,
        missingChunkIndex: i,
        stageKeys,
        message: `Format potongan sinkronisasi ke-${i + 1} dari ${totalChunks} tidak valid.`,
      };
    }
  }

  for (const [entryKey, parts] of oversizedPartsMap.entries()) {
    const expectedTotal = parts[0].totalParts;
    const valueType = parts[0].valueType === 'string' ? 'string' : 'json';
    const sorted = [...parts].sort((a, b) => a.partIndex - b.partIndex);
    const invalidOrder =
      sorted.length !== expectedTotal ||
      sorted.some(
        (p, idx) =>
          p.partIndex !== idx ||
          p.totalParts !== expectedTotal ||
          (p.valueType === 'string' ? 'string' : 'json') !== valueType
      );
    if (invalidOrder) {
      return {
        ok: false,
        missingChunkIndex: 0,
        stageKeys,
        message: `Potongan data untuk entri "${entryKey}" tidak lengkap.`,
      };
    }
    const joined = sorted.map((p) => p.slice).join('');
    if (valueType === 'string') {
      rawEncoded[entryKey] = joined;
    } else {
      try {
        rawEncoded[entryKey] = JSON.parse(joined);
      } catch {
        return {
          ok: false,
          missingChunkIndex: 0,
          stageKeys,
          message: `Gabungan potongan JSON untuk entri "${entryKey}" tidak valid.`,
        };
      }
    }
  }

  return { ok: true, rawEncoded, stageKeys };
}

async function executeWorkspaceWriteCas({
  primaryWorkspaceKey,
  legacyIndividualKey,
  rawCode,
  pinCandidates,
  secretPinRaw,
  explicitTeacherId,
  isSchool,
  cleanDev,
  deviceId,
  body,
  expectedRev,
  requestId,
  activePepper,
  prepareEntriesFn,
}) {
  return withWorkspaceLock(primaryWorkspaceKey, async () => {
    let targetKey = primaryWorkspaceKey;
    let preCheck = await redisGetJson(primaryWorkspaceKey);
    if (!preCheck.value && legacyIndividualKey && legacyIndividualKey !== primaryWorkspaceKey) {
      const legacyCheck = await redisGetJson(legacyIndividualKey);
      if (legacyCheck.value) {
        targetKey = legacyIndividualKey;
        preCheck = legacyCheck;
      }
    }

    const guard = verifyWorkspaceTenantGuard(
      preCheck.value,
      rawCode,
      pinCandidates,
      isSchool,
      cleanDev
    );
    if (!guard.allowed) {
      return {
        status: 'FORBIDDEN',
        configured: preCheck.configured,
        pinCollisionProtected: Boolean(guard.pinCollisionProtected),
      };
    }

    const pushSunsetGate = evaluateLegacyPepperSunsetGate({
      guard,
      body,
      explicitTeacherId,
      activePepper,
    });
    if (pushSunsetGate.blocked) {
      return {
        status: 'SUNSET_BLOCKED',
        gate: pushSunsetGate,
      };
    }

    const pushDest = await resolveRecoveryDestinationKey({
      rawCode,
      currentKey: targetKey,
      legacyIndividualKey,
      sunsetGate: pushSunsetGate,
      explicitTeacherId,
      isSchool,
    });
    if (!pushDest.ok) {
      return {
        status: 'SUNSET_BLOCKED',
        gate: pushDest,
      };
    }

    if (preCheck.value && requestId && preCheck.value.lastRequestId === requestId) {
      return {
        status: 'IDEMPOTENT',
        configured: preCheck.configured,
        serverRevision: getEffectiveRecordRevision(preCheck.value),
        record: preCheck.value,
        targetKey,
      };
    }

    const prep = await prepareEntriesFn({ preCheck, targetKey, guard });
    if (prep.earlyResult) {
      return { ...prep.earlyResult, targetKey };
    }

    const finalEntries = prep.entries;
    const secretToHash =
      pushSunsetGate.targetPinToHash || guard.matchedSecretPin || secretPinRaw;
    const shouldForceMigration = Boolean(
      guard.needsMigration || pushSunsetGate.needsForcedMigration
    );
    const canReuseExistingPinHash =
      Boolean(preCheck.value?.teacherPinHash) &&
      String(preCheck.value.teacherPinHash).startsWith('scrypt$v1$') &&
      !shouldForceMigration &&
      preCheck.value?.pepperKid === activePepper.kid &&
      (!activePepper.isConfigured ||
        Number(preCheck.value?.securitySchemaVersion) >= CURRENT_SECURITY_SCHEMA_VERSION);
    const nextPinHash = canReuseExistingPinHash
      ? preCheck.value.teacherPinHash
      : secretToHash
      ? hashTeacherPin(secretToHash)
      : preCheck.value?.teacherPinHash;
    const securityMeta = buildSecurityMetadataFields(
      nextPinHash,
      activePepper,
      preCheck.value,
      !canReuseExistingPinHash && Boolean(nextPinHash)
    );

    const nextRevision = (expectedRev === null ? 0 : expectedRev) + 1;
    const contentHash = computeStableContentHash(finalEntries);
    const fullRecord = {
      licenseCode: rawCode,
      teacherPinHash: nextPinHash,
      ...securityMeta,
      ownerDevices: guard.nextOwnerDevices,
      deviceId: cleanDev || deviceId,
      revision: nextRevision,
      updatedAt: new Date().toISOString(),
      lastRequestId: requestId || undefined,
      lastContentHash: contentHash,
      entries: finalEntries,
    };

    const storagePrep = await prepareWorkspaceRecordForCas(targetKey, fullRecord);
    const outcome = await atomicWorkspaceCas({
      key: targetKey,
      expectedRev,
      nextRecord: storagePrep.casRecord,
      reqId: requestId,
      contentHash,
      deviceId: fullRecord.deviceId,
    });

    if (outcome.status === 'OK') {
      await copyMigratedRecordToDestination(
        pushDest.destinationKey,
        targetKey,
        storagePrep.casRecord
      );
      if (shouldForceMigration && nextPinHash) {
        incrementMetricCounter(
          migrationMetricsStore.migratedBySource,
          pushSunsetGate.recoveryUsed
            ? 'post_sunset_recovery'
            : guard.matchedPepperSource || 'active'
        );
      }
    }

    if (typeof prep.onAfterCas === 'function') {
      await prep.onAfterCas(outcome.status);
    }

    return {
      ...outcome,
      targetKey,
      storageFormat: storagePrep.storageFormat,
      chunkCount: storagePrep.chunkCount,
      totalUncompressedBytes: storagePrep.totalUncompressedBytes,
      extraMeta: prep.extraMeta,
    };
  });
}

async function respondFromCasWriteResult({
  res,
  casResult,
  rateKey,
  supportsChunkedPull,
  buildOkPayload,
}) {
  if (casResult.status === 'SUNSET_BLOCKED' && casResult.gate) {
    return res.status(casResult.gate.status).json(casResult.gate.body);
  }

  if (casResult.status === 'FORBIDDEN') {
    await recordFailedAuthAttempt(rateKey);
    return res.status(403).json({
      ok: false,
      unauthorized: true,
      pinCollisionProtected: Boolean(casResult.pinCollisionProtected),
      message: casResult.pinCollisionProtected
        ? 'Workspace PIN Guru ini sudah dipakai pada 2 perangkat guru lain di sekolah yang sama. Gunakan PIN Pribadi yang lebih unik (misal: NAMA:PIN).'
        : 'Akses workspace ditolak karena identitas lisensi atau PIN Guru tidak cocok.',
    });
  }

  await clearFailedAuthAttempt(rateKey);

  if (casResult.status === 'INCOMPLETE_UPLOAD') {
    return res.status(400).json({
      ok: false,
      incompleteUpload: true,
      missingChunkIndex: casResult.missingChunkIndex,
      cloudConfigured: casResult.configured,
      message: casResult.message,
    });
  }

  if (casResult.status === 'DELTA_MISMATCH') {
    return res.status(409).json({
      ok: false,
      deltaMismatch: true,
      cloudConfigured: casResult.configured,
      serverRevision: casResult.serverRevision || 0,
      message:
        casResult.message ||
        'Sinkronisasi delta memerlukan sinkronisasi penuh karena status data server berbeda.',
    });
  }

  if (casResult.status === 'CONFLICT') {
    const conflictBody = await buildConflictResponsePayload(
      casResult,
      casResult.targetKey,
      supportsChunkedPull
    );
    return res.status(409).json(conflictBody);
  }

  if (casResult.status === 'IDEMPOTENT') {
    const currentRev = casResult.serverRevision || getEffectiveRecordRevision(casResult.record);
    return res.status(200).json({
      ok: true,
      idempotent: true,
      cloudConfigured: casResult.configured,
      revision: currentRev,
      updatedAt: casResult.record?.updatedAt || new Date().toISOString(),
      lastDeviceId: casResult.record?.deviceId || '',
      message: casResult.configured
        ? `Permintaan sinkronisasi sudah tercatat pada revisi #${currentRev} di Cloud.`
        : `Permintaan sinkronisasi sudah tercatat pada revisi #${currentRev} di memori dev lokal.`,
    });
  }

  return res.status(200).json(buildOkPayload(casResult));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      ok: false,
      message: 'Metode HTTP tidak diizinkan. Gunakan POST.',
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({
      ok: false,
      message: 'Format payload JSON tidak valid.',
    });
  }

  try {
    const pepperValidation = validateProductionPepperConfig();
    if (!pepperValidation.valid) {
      return res.status(503).json({
        ok: false,
        cloudConfigured: false,
        pepperMisconfigured: true,
        reason: pepperValidation.reason,
        message: pepperValidation.message,
      });
    }

    const activePepper = getActivePinPepper();
    const action = String(body.action || '').trim().toLowerCase();
    const rawCode = normalizeLicenseCode(body.licenseCode || '');
    const rawPin = String(body.teacherPin || '').trim();
    const explicitTeacherId = String(body.teacherId || '').trim();
    const deviceId = String(body.deviceId || '').trim();
    const rateKey = getRateLimitKey(req, rawCode);

    const rateCheck = await checkAuthRateLimit(rateKey);
    if (rateCheck.limited) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
      return res.status(429).json({
        ok: false,
        rateLimited: true,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
        message: `Terlalu banyak percobaan otorisasi atau PIN yang gagal. Coba lagi dalam ${rateCheck.retryAfterSeconds} detik.`,
      });
    }

    const auth = await authorizeCloudSyncRequest(rawCode, deviceId, rawPin, explicitTeacherId);
    if (!auth.authorized) {
      if (auth.status === 403) {
        await recordFailedAuthAttempt(rateKey);
      }
      return res.status(auth.status).json(auth.body);
    }

    const isSchool = isSchoolSharedCode(rawCode);
    const { namespaceSegment, secretPinRaw, pinCandidates } = extractTeacherIdentityAndPin(
      rawPin,
      explicitTeacherId
    );

    if (isSchool && (!namespaceSegment || namespaceSegment.length < 2)) {
      return res.status(400).json({
        ok: false,
        requiresPin: true,
        message:
          'Untuk Lisensi Kolektif Sekolah (25 Guru), wajib mengisi Nama Singkat / PIN Pribadi Guru agar data Anda tidak tertukar dengan guru lain.',
      });
    }

    if (isSchool && (!secretPinRaw || secretPinRaw.length < 2)) {
      return res.status(400).json({
        ok: false,
        requiresPin: true,
        message: 'PIN Pribadi Guru minimal 2 karakter.',
      });
    }

    const primaryWorkspaceKey = buildRedisWorkspaceKey(
      rawCode,
      namespaceSegment,
      false,
      explicitTeacherId ? '__TEACHER_ID__' : ''
    );
    const legacyIndividualKey =
      !isSchool && !explicitTeacherId && rawPin
        ? buildRedisWorkspaceKey(rawCode, namespaceSegment, true, rawPin)
        : null;

    const supportsChunkedPull = Boolean(body.supportsChunkedPull);

    if (action === 'pull') {
      const { resolvedKey, result } = await resolveWorkspaceRecordForRead(
        primaryWorkspaceKey,
        legacyIndividualKey
      );

      if (!result.value) {
        return res.status(200).json({
          ok: true,
          found: false,
          revision: 0,
          cloudConfigured: result.configured,
          message: result.configured
            ? 'Belum ada riwayat tersimpan di Cloud untuk kode lisensi ini.'
            : 'Belum ada riwayat tersimpan di memori dev lokal untuk kode lisensi ini.',
        });
      }

      const guard = verifyWorkspaceTenantGuard(
        result.value,
        rawCode,
        pinCandidates,
        isSchool,
        auth.cleanDev
      );
      if (!guard.allowed) {
        await recordFailedAuthAttempt(rateKey);
        return res.status(403).json({
          ok: false,
          unauthorized: true,
          pinCollisionProtected: Boolean(guard.pinCollisionProtected),
          message: guard.pinCollisionProtected
            ? 'Workspace PIN Guru ini sudah dipakai pada 2 perangkat guru lain di sekolah yang sama. Gunakan PIN Pribadi yang lebih unik (misal: NAMA:PIN).'
            : 'Akses workspace ditolak karena identitas lisensi atau PIN Guru tidak cocok.',
        });
      }

      await clearFailedAuthAttempt(rateKey);

      const pullSunsetGate = evaluateLegacyPepperSunsetGate({
        guard,
        body,
        explicitTeacherId,
        activePepper,
      });
      if (pullSunsetGate.blocked) {
        return res.status(pullSunsetGate.status).json(pullSunsetGate.body);
      }

      const pullDest = await resolveRecoveryDestinationKey({
        rawCode,
        currentKey: resolvedKey,
        legacyIndividualKey,
        sunsetGate: pullSunsetGate,
        explicitTeacherId,
        isSchool,
      });
      if (!pullDest.ok) {
        return res.status(pullDest.status).json(pullDest.body);
      }

      if (guard.needsMigration || pullSunsetGate.needsForcedMigration || guard.needsOwnerUpdate) {
        const upgradedRecord = {
          ...result.value,
          ownerDevices: guard.nextOwnerDevices,
        };
        const shouldUpgradePin =
          (guard.needsMigration || pullSunsetGate.needsForcedMigration) &&
          Boolean(pullSunsetGate.targetPinToHash || guard.matchedSecretPin);
        if (shouldUpgradePin) {
          const pinForRehash = pullSunsetGate.targetPinToHash || guard.matchedSecretPin;
          upgradedRecord.teacherPinHash = hashTeacherPin(pinForRehash);
          Object.assign(
            upgradedRecord,
            buildSecurityMetadataFields(
              upgradedRecord.teacherPinHash,
              activePepper,
              result.value,
              true
            )
          );
          incrementMetricCounter(
            migrationMetricsStore.migratedBySource,
            pullSunsetGate.recoveryUsed ? 'post_sunset_recovery' : guard.matchedPepperSource || 'active'
          );
        }
        delete upgradedRecord.teacherPin;
        await persistSecurityMetadataUpdate(resolvedKey, result.value, upgradedRecord);
        await copyMigratedRecordToDestination(pullDest.destinationKey, resolvedKey, upgradedRecord);
      }

      const revision = getEffectiveRecordRevision(result.value);
      const canReturnChunkedManifest =
        supportsChunkedPull &&
        result.value.storageFormat === 'chunked_v1' &&
        Number(result.value.totalUncompressedBytes) > MAX_PULL_INLINE_RESPONSE_BYTES &&
        !(pullSunsetGate.recoveryUsed && pullSunsetGate.hasNewPin);

      if (canReturnChunkedManifest) {
        return res.status(200).json({
          ok: true,
          found: true,
          chunked: true,
          revision,
          cloudConfigured: result.configured,
          updatedAt: result.value.updatedAt,
          lastDeviceId: result.value.deviceId || '',
          entryCount: result.value.entryCount,
          totalUncompressedBytes: result.value.totalUncompressedBytes,
          workspaceChecksum: result.value.workspaceChecksum,
          chunkRefs: result.value.chunkRefs,
          message: result.configured
            ? 'Data riwayat besar ditemukan di Cloud dan siap dipulihkan bertahap.'
            : 'Data riwayat besar ditemukan di memori dev lokal dan siap dipulihkan bertahap.',
        });
      }

      const hydrated = await hydrateWorkspaceRecord(resolvedKey, result.value);
      return res.status(200).json({
        ok: true,
        found: true,
        revision,
        cloudConfigured: result.configured,
        updatedAt: result.value.updatedAt,
        lastDeviceId: result.value.deviceId || '',
        entries: hydrated?.entries || {},
        message: result.configured
          ? 'Data riwayat berhasil ditemukan dan dipulihkan dari Cloud.'
          : 'Data riwayat dipulihkan dari memori dev lokal (Cloud Redis belum dikonfigurasi).',
      });
    }

    if (action === 'pull_chunk') {
      const chunkHash = typeof body.chunkHash === 'string' ? body.chunkHash.trim().toLowerCase() : '';
      if (!/^[a-f0-9]{16,128}$/.test(chunkHash)) {
        return res.status(400).json({
          ok: false,
          message: 'Identitas potongan data (chunkHash) tidak valid.',
        });
      }

      const { resolvedKey, result } = await resolveWorkspaceRecordForRead(
        primaryWorkspaceKey,
        legacyIndividualKey
      );
      if (!result.value) {
        return res.status(404).json({
          ok: false,
          message: 'Data workspace Cloud tidak ditemukan.',
        });
      }

      const guard = verifyWorkspaceTenantGuard(
        result.value,
        rawCode,
        pinCandidates,
        isSchool,
        auth.cleanDev
      );
      if (!guard.allowed) {
        await recordFailedAuthAttempt(rateKey);
        return res.status(403).json({
          ok: false,
          unauthorized: true,
          pinCollisionProtected: Boolean(guard.pinCollisionProtected),
          message: guard.pinCollisionProtected
            ? 'Workspace PIN Guru ini sudah dipakai pada 2 perangkat guru lain di sekolah yang sama. Gunakan PIN Pribadi yang lebih unik (misal: NAMA:PIN).'
            : 'Akses workspace ditolak karena identitas lisensi atau PIN Guru tidak cocok.',
        });
      }

      await clearFailedAuthAttempt(rateKey);

      const chunkSunsetGate = evaluateLegacyPepperSunsetGate({
        guard,
        body,
        explicitTeacherId,
        activePepper,
      });
      if (chunkSunsetGate.blocked) {
        return res.status(chunkSunsetGate.status).json(chunkSunsetGate.body);
      }

      const chunkRefs = Array.isArray(result.value.chunkRefs) ? result.value.chunkRefs : [];
      const authorizedRef = chunkRefs.find((ref) => ref && ref.hash === chunkHash);
      if (result.value.storageFormat !== 'chunked_v1' || !authorizedRef) {
        return res.status(404).json({
          ok: false,
          message: 'Potongan data yang diminta tidak terdaftar pada revisi workspace ini.',
        });
      }

      const chunkRes = await redisGetStoredJson(
        buildWorkspaceChunkKey(resolvedKey, chunkHash),
        localDevChunkStore
      );
      const chunkObj = chunkRes.value;
      if (!chunkObj || chunkObj.enc !== 'gzip-base64' || typeof chunkObj.data !== 'string') {
        throw new RedisUnavailableError(503);
      }
      let rawBuf;
      try {
        rawBuf = gunzipSync(Buffer.from(chunkObj.data, 'base64'));
      } catch {
        throw new RedisUnavailableError(503);
      }
      if (createHash('sha256').update(rawBuf).digest('hex') !== chunkHash) {
        throw new RedisUnavailableError(503);
      }
      const entriesChunk = JSON.parse(rawBuf.toString('utf8'));
      return res.status(200).json({
        ok: true,
        cloudConfigured: result.configured,
        revision: getEffectiveRecordRevision(result.value),
        chunkHash,
        entriesChunk,
      });
    }

    if (action === 'push') {
      const rawEntries = body.entries;
      if (!rawEntries || typeof rawEntries !== 'object' || Array.isArray(rawEntries)) {
        return res.status(400).json({
          ok: false,
          message: 'Data entries tidak valid untuk disimpan ke Cloud.',
        });
      }

      const singleRequestBytes = Buffer.byteLength(JSON.stringify(rawEntries), 'utf8');
      if (singleRequestBytes > MAX_SINGLE_REQUEST_BYTES) {
        return res.status(413).json({
          ok: false,
          payloadTooLarge: true,
          supportsChunkedUpload: true,
          maxBytes: MAX_SINGLE_REQUEST_BYTES,
          actualBytes: singleRequestBytes,
          message:
            'Ukuran payload tunggal melebihi batas maksimal 1.2 MB. Gunakan sinkronisasi bertahap (chunked sync).',
        });
      }

      const revCheck = parseExpectedRevisionParam(body.baseRevision);
      if (!revCheck.valid) {
        return res.status(400).json({
          ok: false,
          message: 'Nilai baseRevision tidak valid. Harus berupa bilangan bulat non-negatif.',
        });
      }

      const requestId =
        typeof body.requestId === 'string' ? body.requestId.trim().slice(0, 128) : '';

      const casResult = await executeWorkspaceWriteCas({
        primaryWorkspaceKey,
        legacyIndividualKey,
        rawCode,
        pinCandidates,
        secretPinRaw,
        explicitTeacherId,
        isSchool,
        cleanDev: auth.cleanDev,
        deviceId,
        body,
        expectedRev: revCheck.expectedRev,
        requestId,
        activePepper,
        prepareEntriesFn: async () => ({
          entries: decodeEntriesFromCloudSyncServer(rawEntries),
        }),
      });

      return await respondFromCasWriteResult({
        res,
        casResult,
        rateKey,
        supportsChunkedPull,
        buildOkPayload: (outcome) => ({
          ok: true,
          cloudConfigured: outcome.configured,
          revision: outcome.record.revision,
          updatedAt: outcome.record.updatedAt,
          lastDeviceId: outcome.record.deviceId,
          storageFormat: outcome.storageFormat,
          chunkCount: outcome.chunkCount,
          totalUncompressedBytes: outcome.totalUncompressedBytes,
          message: outcome.configured
            ? `Riwayat pengisian berhasil disinkronkan ke Cloud (Revisi #${outcome.record.revision})!`
            : `Data tersimpan di memori dev lokal saja (Revisi #${outcome.record.revision}). Tambahkan Upstash Redis di Vercel untuk sinkronisasi antar perangkat nyata.`,
        }),
      });
    }

    if (action === 'push_delta') {
      const upserts = body.upserts;
      const deletesRaw = body.deletes;
      if (!upserts || typeof upserts !== 'object' || Array.isArray(upserts)) {
        return res.status(400).json({
          ok: false,
          message: 'Data perubahan (upserts) tidak valid untuk sinkronisasi delta.',
        });
      }
      if (deletesRaw !== undefined && !Array.isArray(deletesRaw)) {
        return res.status(400).json({
          ok: false,
          message: 'Daftar penghapusan (deletes) harus berupa array.',
        });
      }
      const cleanDeletes = Array.isArray(deletesRaw)
        ? deletesRaw.filter((k) => typeof k === 'string' && k.length > 0)
        : [];

      const deltaBytes = Buffer.byteLength(
        JSON.stringify({ upserts, deletes: cleanDeletes }),
        'utf8'
      );
      if (deltaBytes > MAX_SINGLE_REQUEST_BYTES) {
        return res.status(413).json({
          ok: false,
          payloadTooLarge: true,
          supportsChunkedUpload: true,
          maxBytes: MAX_SINGLE_REQUEST_BYTES,
          actualBytes: deltaBytes,
          message:
            'Ukuran perubahan delta melebihi batas maksimal 1.2 MB. Gunakan sinkronisasi bertahap (chunked sync).',
        });
      }

      const revCheck = parseExpectedRevisionParam(body.baseRevision);
      if (!revCheck.valid) {
        return res.status(400).json({
          ok: false,
          message: 'Nilai baseRevision tidak valid. Harus berupa bilangan bulat non-negatif.',
        });
      }

      const requestId =
        typeof body.requestId === 'string' ? body.requestId.trim().slice(0, 128) : '';

      const casResult = await executeWorkspaceWriteCas({
        primaryWorkspaceKey,
        legacyIndividualKey,
        rawCode,
        pinCandidates,
        secretPinRaw,
        explicitTeacherId,
        isSchool,
        cleanDev: auth.cleanDev,
        deviceId,
        body,
        expectedRev: revCheck.expectedRev,
        requestId,
        activePepper,
        prepareEntriesFn: async ({ preCheck, targetKey }) => {
          if (
            !preCheck.value ||
            revCheck.expectedRev === null ||
            getEffectiveRecordRevision(preCheck.value) !== revCheck.expectedRev
          ) {
            return {
              earlyResult: {
                status: 'CONFLICT',
                configured: preCheck.configured,
                serverRevision: preCheck.value
                  ? getEffectiveRecordRevision(preCheck.value)
                  : 0,
                record: preCheck.value,
              },
            };
          }

          const hydrated = await hydrateWorkspaceRecord(targetKey, preCheck.value);
          const workingEntries = { ...(hydrated?.entries || {}) };
          for (const delKey of cleanDeletes) {
            delete workingEntries[delKey];
          }
          const decodedUpserts = decodeEntriesFromCloudSyncServer(upserts, workingEntries);
          for (const [k, v] of Object.entries(decodedUpserts)) {
            workingEntries[k] = v;
          }

          if (
            (typeof body.expectedEntryCount === 'number' &&
              Object.keys(workingEntries).length !== body.expectedEntryCount) ||
            (typeof body.workspaceChecksum === 'string' &&
              body.workspaceChecksum &&
              computeCanonicalDigestHex(workingEntries) !== body.workspaceChecksum)
          ) {
            return {
              earlyResult: {
                status: 'DELTA_MISMATCH',
                configured: preCheck.configured,
                serverRevision: getEffectiveRecordRevision(preCheck.value),
                message:
                  'Ringkasan perubahan delta tidak cocok dengan kondisi server. Melanjutkan dengan sinkronisasi penuh.',
              },
            };
          }

          return {
            entries: workingEntries,
            extraMeta: {
              changedRecords: Object.keys(decodedUpserts).length + cleanDeletes.length,
            },
          };
        },
      });

      return await respondFromCasWriteResult({
        res,
        casResult,
        rateKey,
        supportsChunkedPull,
        buildOkPayload: (outcome) => ({
          ok: true,
          deltaApplied: true,
          cloudConfigured: outcome.configured,
          revision: outcome.record.revision,
          updatedAt: outcome.record.updatedAt,
          lastDeviceId: outcome.record.deviceId,
          storageFormat: outcome.storageFormat,
          chunkCount: outcome.chunkCount,
          changedRecords: outcome.extraMeta?.changedRecords ?? 0,
          totalUncompressedBytes: outcome.totalUncompressedBytes,
          message: outcome.configured
            ? `Perubahan berhasil disinkronkan ke Cloud secara delta (Revisi #${outcome.record.revision})!`
            : `Perubahan delta tersimpan di memori dev lokal saja (Revisi #${outcome.record.revision}).`,
        }),
      });
    }

    if (action === 'push_chunk') {
      const uploadId = typeof body.uploadId === 'string' ? body.uploadId.trim() : '';
      const chunkIndex = Number(body.chunkIndex);
      const totalChunks = Number(body.totalChunks);
      const chunk = body.chunk;

      if (!/^[A-Za-z0-9_-]{8,64}$/.test(uploadId)) {
        return res.status(400).json({
          ok: false,
          message: 'Identitas sesi unggahan bertahap (uploadId) tidak valid.',
        });
      }
      if (
        !Number.isInteger(totalChunks) ||
        totalChunks < 1 ||
        totalChunks > MAX_CHUNKS_PER_UPLOAD ||
        !Number.isInteger(chunkIndex) ||
        chunkIndex < 0 ||
        chunkIndex >= totalChunks
      ) {
        return res.status(400).json({
          ok: false,
          message: `Indeks atau jumlah potongan sinkronisasi tidak valid (maksimal ${MAX_CHUNKS_PER_UPLOAD} bagian).`,
        });
      }
      if (!chunk || typeof chunk !== 'object' || Array.isArray(chunk)) {
        return res.status(400).json({
          ok: false,
          message: 'Isi potongan sinkronisasi (chunk) tidak valid.',
        });
      }
      const chunkBytes = Buffer.byteLength(JSON.stringify(chunk), 'utf8');
      if (chunkBytes > MAX_SINGLE_REQUEST_BYTES) {
        return res.status(413).json({
          ok: false,
          payloadTooLarge: true,
          maxBytes: MAX_SINGLE_REQUEST_BYTES,
          actualBytes: chunkBytes,
          message: 'Ukuran satu potongan sinkronisasi melebihi batas maksimal 1.2 MB.',
        });
      }

      const { resolvedKey: targetKey, result: preCheck } = await resolveWorkspaceRecordForRead(
        primaryWorkspaceKey,
        legacyIndividualKey
      );
      const guard = verifyWorkspaceTenantGuard(
        preCheck.value,
        rawCode,
        pinCandidates,
        isSchool,
        auth.cleanDev
      );
      if (!guard.allowed) {
        await recordFailedAuthAttempt(rateKey);
        return res.status(403).json({
          ok: false,
          unauthorized: true,
          pinCollisionProtected: Boolean(guard.pinCollisionProtected),
          message: guard.pinCollisionProtected
            ? 'Workspace PIN Guru ini sudah dipakai pada 2 perangkat guru lain di sekolah yang sama. Gunakan PIN Pribadi yang lebih unik (misal: NAMA:PIN).'
            : 'Akses workspace ditolak karena identitas lisensi atau PIN Guru tidak cocok.',
        });
      }

      await clearFailedAuthAttempt(rateKey);

      const chunkSunsetGate = evaluateLegacyPepperSunsetGate({
        guard,
        body,
        explicitTeacherId,
        activePepper,
      });
      if (chunkSunsetGate.blocked) {
        return res.status(chunkSunsetGate.status).json(chunkSunsetGate.body);
      }

      const stageKey = buildWorkspaceStageKey(targetKey, uploadId, chunkIndex);
      await redisSetStoredJson(
        stageKey,
        {
          uploadId,
          chunkIndex,
          totalChunks,
          deviceId: auth.cleanDev || deviceId,
          chunk,
          receivedAt: new Date().toISOString(),
        },
        STAGE_CHUNK_TTL_SECONDS,
        localDevStageStore
      );

      return res.status(200).json({
        ok: true,
        received: true,
        cloudConfigured: preCheck.configured,
        uploadId,
        chunkIndex,
        totalChunks,
      });
    }

    if (action === 'commit_chunks') {
      const uploadId = typeof body.uploadId === 'string' ? body.uploadId.trim() : '';
      const totalChunks = Number(body.totalChunks);
      const mode = body.mode === 'delta' ? 'delta' : 'full';
      const deletesRaw = body.deletes;

      if (!/^[A-Za-z0-9_-]{8,64}$/.test(uploadId)) {
        return res.status(400).json({
          ok: false,
          message: 'Identitas sesi unggahan bertahap (uploadId) tidak valid.',
        });
      }
      if (
        !Number.isInteger(totalChunks) ||
        totalChunks < 1 ||
        totalChunks > MAX_CHUNKS_PER_UPLOAD
      ) {
        return res.status(400).json({
          ok: false,
          message: `Jumlah potongan sinkronisasi tidak valid (maksimal ${MAX_CHUNKS_PER_UPLOAD} bagian).`,
        });
      }
      if (deletesRaw !== undefined && !Array.isArray(deletesRaw)) {
        return res.status(400).json({
          ok: false,
          message: 'Daftar penghapusan (deletes) harus berupa array.',
        });
      }
      const cleanDeletes = Array.isArray(deletesRaw)
        ? deletesRaw.filter((k) => typeof k === 'string' && k.length > 0)
        : [];

      const revCheck = parseExpectedRevisionParam(body.baseRevision);
      if (!revCheck.valid) {
        return res.status(400).json({
          ok: false,
          message: 'Nilai baseRevision tidak valid. Harus berupa bilangan bulat non-negatif.',
        });
      }

      const requestId =
        typeof body.requestId === 'string' ? body.requestId.trim().slice(0, 128) : '';

      const casResult = await executeWorkspaceWriteCas({
        primaryWorkspaceKey,
        legacyIndividualKey,
        rawCode,
        pinCandidates,
        secretPinRaw,
        explicitTeacherId,
        isSchool,
        cleanDev: auth.cleanDev,
        deviceId,
        body,
        expectedRev: revCheck.expectedRev,
        requestId,
        activePepper,
        prepareEntriesFn: async ({ preCheck, targetKey }) => {
          const existingRev = preCheck.value ? getEffectiveRecordRevision(preCheck.value) : 0;
          const isMissingOrStale =
            mode === 'delta'
              ? !preCheck.value ||
                revCheck.expectedRev === null ||
                existingRev !== revCheck.expectedRev
              : preCheck.value
              ? revCheck.expectedRev === null || existingRev !== revCheck.expectedRev
              : revCheck.expectedRev !== null && revCheck.expectedRev > 0;

          if (isMissingOrStale) {
            return {
              earlyResult: {
                status: 'CONFLICT',
                configured: preCheck.configured,
                serverRevision: existingRev,
                record: preCheck.value,
              },
            };
          }

          const assembled = await reassembleStagedUploadChunks(
            targetKey,
            uploadId,
            totalChunks
          );
          if (!assembled.ok) {
            return {
              earlyResult: {
                status: 'INCOMPLETE_UPLOAD',
                configured: preCheck.configured,
                missingChunkIndex: assembled.missingChunkIndex,
                message: assembled.message,
              },
            };
          }

          let finalEntries;
          if (mode === 'delta') {
            const hydrated = await hydrateWorkspaceRecord(targetKey, preCheck.value);
            const workingEntries = { ...(hydrated?.entries || {}) };
            for (const delKey of cleanDeletes) {
              delete workingEntries[delKey];
            }
            const decodedUpserts = decodeEntriesFromCloudSyncServer(
              assembled.rawEncoded,
              workingEntries
            );
            for (const [k, v] of Object.entries(decodedUpserts)) {
              workingEntries[k] = v;
            }
            finalEntries = workingEntries;
          } else {
            finalEntries = decodeEntriesFromCloudSyncServer(assembled.rawEncoded);
          }

          if (
            (typeof body.expectedEntryCount === 'number' &&
              Object.keys(finalEntries).length !== body.expectedEntryCount) ||
            (typeof body.workspaceChecksum === 'string' &&
              body.workspaceChecksum &&
              computeCanonicalDigestHex(finalEntries) !== body.workspaceChecksum)
          ) {
            return {
              earlyResult: {
                status: 'DELTA_MISMATCH',
                configured: preCheck.configured,
                serverRevision: existingRev,
                message:
                  'Checksum gabungan potongan sinkronisasi tidak cocok. Melanjutkan ulang untuk menjaga keutuhan data.',
              },
            };
          }

          return {
            entries: finalEntries,
            onAfterCas: async (outcomeStatus) => {
              if (outcomeStatus === 'OK' || outcomeStatus === 'IDEMPOTENT') {
                await redisDelStoredKeys(assembled.stageKeys, localDevStageStore);
              }
            },
          };
        },
      });

      return await respondFromCasWriteResult({
        res,
        casResult,
        rateKey,
        supportsChunkedPull,
        buildOkPayload: (outcome) => ({
          ok: true,
          chunkedCommitted: true,
          chunksCommitted: totalChunks,
          cloudConfigured: outcome.configured,
          revision: outcome.record.revision,
          updatedAt: outcome.record.updatedAt,
          lastDeviceId: outcome.record.deviceId,
          storageFormat: outcome.storageFormat,
          chunkCount: outcome.chunkCount,
          totalUncompressedBytes: outcome.totalUncompressedBytes,
          message: outcome.configured
            ? `Workspace (${totalChunks} bagian) berhasil disinkronkan secara atomik ke Cloud (Revisi #${outcome.record.revision})!`
            : `Workspace (${totalChunks} bagian) tersimpan di memori dev lokal saja (Revisi #${outcome.record.revision}).`,
        }),
      });
    }

    return res.status(400).json({
      ok: false,
      message: 'Action tidak dikenali. Gunakan "pull", "pull_chunk", "push", "push_delta", "push_chunk", atau "commit_chunks".',
    });
  } catch (error) {
    if (error instanceof PepperConfigurationError) {
      return res.status(error.statusCode).json({
        ok: false,
        cloudConfigured: false,
        pepperMisconfigured: true,
        reason: error.reason,
        message: error.message,
      });
    }

    if (error instanceof ClientValidationError) {
      return res.status(error.statusCode).json({
        ok: false,
        ...(error.extra || {}),
        message: error.message,
      });
    }

    if (error instanceof RedisUnavailableError) {
      return res.status(error.statusCode).json({
        ok: false,
        cloudConfigured: true,
        redisUnavailable: true,
        message: error.message,
      });
    }

    return res.status(500).json({
      ok: false,
      message: 'Terjadi kesalahan internal saat memproses sinkronisasi Cloud.',
    });
  }
}
