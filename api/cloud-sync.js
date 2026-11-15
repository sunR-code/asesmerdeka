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

// Sliding-window rate limiter untuk proteksi brute-force PIN Guru & lisensi
export const authRateLimitStore = new Map();

// Antrean kunci mutex per-workspace untuk serialisasi request dalam proses yang sama
const workspaceLocks = new Map();

const MAX_SYNC_PAYLOAD_BYTES = 1_500_000;
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
  if (Buffer.byteLength(serialized, 'utf8') > MAX_SYNC_PAYLOAD_BYTES) {
    throw new ClientValidationError(
      'Ukuran data sinkronisasi melebihi batas maksimal 1.5 MB.',
      413,
      { payloadTooLarge: true }
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
  await atomicWorkspaceCas({
    key: destinationKey,
    expectedRev: null,
    nextRecord: {
      ...record,
      migratedFromKey: undefined,
    },
    reqId: '',
    contentHash: computeStableContentHash(record.entries || {}),
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

    if (action === 'pull') {
      let resolvedKey = primaryWorkspaceKey;
      let result = await redisGetJson(resolvedKey);
      if (!result.value && legacyIndividualKey && legacyIndividualKey !== primaryWorkspaceKey) {
        const legacyRes = await redisGetJson(legacyIndividualKey);
        if (legacyRes.value) {
          resolvedKey = legacyIndividualKey;
          result = legacyRes;
        }
      }

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
      return res.status(200).json({
        ok: true,
        found: true,
        revision,
        cloudConfigured: result.configured,
        updatedAt: result.value.updatedAt,
        lastDeviceId: result.value.deviceId || '',
        entries: result.value.entries || {},
        message: result.configured
          ? 'Data riwayat berhasil ditemukan dan dipulihkan dari Cloud.'
          : 'Data riwayat dipulihkan dari memori dev lokal (Cloud Redis belum dikonfigurasi).',
      });
    }

    if (action === 'push') {
      const entries = body.entries;
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
        return res.status(400).json({
          ok: false,
          message: 'Data entries tidak valid untuk disimpan ke Cloud.',
        });
      }

      let expectedRev = null;
      if (body.baseRevision !== undefined && body.baseRevision !== null && body.baseRevision !== '') {
        const parsedRev = Number(body.baseRevision);
        if (!Number.isInteger(parsedRev) || parsedRev < 0) {
          return res.status(400).json({
            ok: false,
            message: 'Nilai baseRevision tidak valid. Harus berupa bilangan bulat non-negatif.',
          });
        }
        expectedRev = parsedRev;
      }

      const requestId =
        typeof body.requestId === 'string' ? body.requestId.trim().slice(0, 128) : '';

      let targetKey = primaryWorkspaceKey;
      const casResult = await withWorkspaceLock(primaryWorkspaceKey, async () => {
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
          auth.cleanDev
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
        const contentHash = computeStableContentHash(entries);
        const record = {
          licenseCode: rawCode,
          teacherPinHash: nextPinHash,
          ...securityMeta,
          ownerDevices: guard.nextOwnerDevices,
          deviceId: auth.cleanDev || deviceId,
          revision: nextRevision,
          updatedAt: new Date().toISOString(),
          lastRequestId: requestId || undefined,
          lastContentHash: contentHash,
          entries,
        };

        const outcome = await atomicWorkspaceCas({
          key: targetKey,
          expectedRev,
          nextRecord: record,
          reqId: requestId,
          contentHash,
          deviceId: record.deviceId,
        });
        if (outcome.status === 'OK') {
          await copyMigratedRecordToDestination(pushDest.destinationKey, targetKey, record);
          if (shouldForceMigration && nextPinHash) {
            incrementMetricCounter(
              migrationMetricsStore.migratedBySource,
              pushSunsetGate.recoveryUsed
                ? 'post_sunset_recovery'
                : guard.matchedPepperSource || 'active'
            );
          }
        }
        return outcome;
      });

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

      if (casResult.status === 'CONFLICT') {
        const serverRev = casResult.serverRevision || getEffectiveRecordRevision(casResult.record);
        return res.status(409).json({
          ok: false,
          conflict: true,
          cloudConfigured: casResult.configured,
          serverRevision: serverRev,
          serverUpdatedAt: casResult.record?.updatedAt || null,
          lastDeviceId: casResult.record?.deviceId || '',
          serverEntries: casResult.record?.entries || {},
          message: `Konflik sinkronisasi terdeteksi! Data terbaru di server berada pada revisi #${serverRev}. Selesaikan konflik terlebih dahulu agar perubahan perangkat lain tidak tertimpa.`,
        });
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

      return res.status(200).json({
        ok: true,
        cloudConfigured: casResult.configured,
        revision: casResult.record.revision,
        updatedAt: casResult.record.updatedAt,
        lastDeviceId: casResult.record.deviceId,
        message: casResult.configured
          ? `Riwayat pengisian berhasil disinkronkan ke Cloud (Revisi #${casResult.record.revision})!`
          : `Data tersimpan di memori dev lokal saja (Revisi #${casResult.record.revision}). Tambahkan Upstash Redis di Vercel untuk sinkronisasi antar perangkat nyata.`,
      });
    }

    return res.status(400).json({
      ok: false,
      message: 'Action tidak dikenali. Gunakan "pull" atau "push".',
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
