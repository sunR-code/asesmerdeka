import type { UserQuota, LicenseTier, QuotaLifecycleState } from '../types/assessment';
import type { LicenseLifecycleState, TeacherSeatInfo } from '../types/admin';

export type { LicenseLifecycleState, TeacherSeatInfo };

export function isLicensed(tier?: LicenseTier | string): boolean {
  return tier === 'guru' || tier === 'biasa' || tier === 'sekolah' || tier === 'pro' || tier === 'sekolah_pro';
}

export function isProAiTier(tier?: LicenseTier | string): boolean {
  return tier === 'pro' || tier === 'sekolah_pro';
}

export function getTierDisplayName(tier?: LicenseTier | string): string {
  switch (tier) {
    case 'guru':
    case 'biasa':
      return 'Guru Mandiri';
    case 'sekolah':
      return 'Kolektif Sekolah (25 Guru)';
    case 'pro':
      return 'Guru Mandiri PRO (AI Cerdas)';
    case 'sekolah_pro':
      return 'Kolektif Sekolah PRO (AI Cerdas)';
    case 'free':
    default:
      return 'Mode Pratinjau (Belum Aktivasi)';
  }
}

export function getTierBadgeLabel(tier?: LicenseTier | string): string {
  switch (tier) {
    case 'guru':
    case 'biasa':
      return 'GURU MANDIRI';
    case 'sekolah':
      return 'SEKOLAH';
    case 'pro':
      return 'GURU PRO';
    case 'sekolah_pro':
      return 'SEKOLAH PRO';
    case 'free':
    default:
      return 'PRATINJAU';
  }
}

const STORAGE_KEY_QUOTA = 'asesmerdeka_user_quota';
const STORAGE_KEY_DEVICE = 'asesmerdeka_device_id';
const STORAGE_KEY_API_KEY = 'asesmerdeka_gemini_key';
const STORAGE_KEY_SIG = 'asesmerdeka_quota_sig';
const STORAGE_KEY_TRIAL_USAGE = 'asesmerdeka_trial_usage_v1';
const STORAGE_KEY_SEAT_REGISTRY = 'asesmerdeka_license_seats_v1';
const STORAGE_KEY_MAX_INDIVIDU_SEATS = 'asesmerdeka_max_individu_seats';
const STORAGE_KEY_SEAT_TRACKER_URL = 'asesmerdeka_seat_tracker_url';
const STORAGE_KEY_MAYAR_PRODUCT_ID = 'asesmerdeka_mayar_product_id';
const STORAGE_KEY_MAYAR_SCHOOL_PRODUCT_ID = 'asesmerdeka_mayar_school_product_id';
const STORAGE_KEY_VERIFIED_MAYAR_CODES = 'asesmerdeka_verified_mayar_codes_v1';
const STORAGE_KEY_LAST_LICENSE_STATUS = 'asesmerdeka_last_license_status_v1';

export const FREE_TRIAL_CREDITS = 0;
export const DEFAULT_INDIVIDU_MAX_DEVICES = 2; // 1 Laptop + 1 HP Guru (tidak bisa dijual ulang ke banyak orang)
export const DEFAULT_SEKOLAH_MAX_DEVICES = 25; // Kuota 1 Sekolah (maksimal 25 Guru)
export const DEFAULT_SEKOLAH_MAX_DEVICES_PER_TEACHER = 2; // Maksimal 2 perangkat (1 Laptop + 1 HP) per guru di lisensi sekolah
export const DEFAULT_MAYAR_PRODUCT_ID = 'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';
export const DEFAULT_MAYAR_SCHOOL_PRODUCT_ID = '17cece7f-e711-4fdc-af44-e6ceb4b4bff7';

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Gagal menyimpan ke localStorage (${key}):`, err);
    return false;
  }
}

export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeHash36(input: string): string {
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

/**
 * Menghasilkan sidik jari perangkat keras (Hardware Fingerprint) untuk mencegah
 * kloning localStorage dari satu laptop ke laptop lain.
 */
export function getHardwareFingerprint(): string {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const scr = typeof screen !== 'undefined' ? screen : null;
    const platform = nav?.platform || 'GENERIC_OS';
    const cores = String(nav?.hardwareConcurrency || 4);
    const screenDim = scr ? `${scr.width}x${scr.height}x${scr.colorDepth || 24}` : '1920x1080x24';
    const tz =
      typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
        : 'Asia/Jakarta';
    return computeHash36(`HWFP:${platform}:${cores}:${screenDim}:${tz}:ASESMERDEKA_2026`).slice(0, 6);
  } catch {
    return 'STDDEV';
  }
}

// Integrity signature mencakup deviceId, hardwareFingerprint, tier, remainingCredits, maxCredits, licenseKey, serta metadata lifecycle bila tersedia
export function generateSignature(quota: UserQuota): string {
  const hwFp = getHardwareFingerprint();
  const extraLifecycle =
    quota.lifecycleState || quota.expiresAt || quota.teacherSeatKey
      ? `:${quota.lifecycleState || ''}:${quota.expiresAt || ''}:${quota.teacherSeatKey || ''}`
      : '';
  const payload = `${quota.deviceId}:${hwFp}:${quota.tier}:${quota.remainingCredits}:${quota.maxCredits}:${quota.licenseKey || ''}${extraLifecycle}:merdeka_salt_2026_v3`;
  return 'SIG-' + computeHash36(payload);
}

// =============================================================================
// EXPLICIT LICENSE LIFECYCLE STATE MACHINE
// =============================================================================

export const VALID_LICENSE_STATE_TRANSITIONS: Record<
  LicenseLifecycleState,
  LicenseLifecycleState[]
> = {
  pending_payment: ['paid', 'payment_failed', 'revoked'],
  payment_failed: ['pending_payment', 'paid', 'revoked'],
  paid: ['active', 'expired', 'suspended', 'revoked'],
  active: ['active', 'paid', 'expired', 'suspended', 'revoked'],
  suspended: ['active', 'paid', 'expired', 'revoked'],
  expired: ['active', 'paid', 'revoked'],
  revoked: [],
};

export function canTransitionLicenseState(
  fromState: LicenseLifecycleState,
  toState: LicenseLifecycleState
): boolean {
  const allowedTargets = VALID_LICENSE_STATE_TRANSITIONS[fromState];
  if (!allowedTargets) return false;
  return allowedTargets.includes(toState);
}

export function transitionLicenseState(
  currentState: LicenseLifecycleState,
  nextState: LicenseLifecycleState,
  context?: {
    hasVerifiedPayment?: boolean;
    hasValidRenewal?: boolean;
    adminAuthorized?: boolean;
    adminReauthorized?: boolean;
  }
): { allowed: boolean; state: LicenseLifecycleState; reason?: string } {
  if (currentState === 'revoked') {
    if (nextState === 'paid' && context?.adminReauthorized) {
      return { allowed: true, state: 'paid' };
    }
    return {
      allowed: false,
      state: 'revoked',
      reason: 'Lisensi yang telah dicabut permanen tidak dapat diaktifkan kembali secara mandiri.',
    };
  }

  if (currentState === 'pending_payment' && nextState === 'active') {
    return {
      allowed: false,
      state: 'pending_payment',
      reason: 'Lisensi berstatus menunggu pembayaran tidak dapat langsung diaktifkan sebelum pembayaran terverifikasi.',
    };
  }

  if (!canTransitionLicenseState(currentState, nextState)) {
    return {
      allowed: false,
      state: currentState,
      reason: `Transisi status lisensi dari '${currentState}' ke '${nextState}' tidak diizinkan.`,
    };
  }

  if (
    (currentState === 'pending_payment' || currentState === 'payment_failed') &&
    nextState === 'paid' &&
    !context?.hasVerifiedPayment &&
    !context?.adminAuthorized
  ) {
    return {
      allowed: false,
      state: currentState,
      reason: 'Pembayaran terverifikasi wajib ada sebelum mengubah status menjadi paid.',
    };
  }

  if (
    currentState === 'expired' &&
    (nextState === 'active' || nextState === 'paid') &&
    !context?.hasValidRenewal &&
    !context?.adminAuthorized
  ) {
    return {
      allowed: false,
      state: 'expired',
      reason: 'Lisensi kedaluwarsa memerlukan perpanjangan (renewal) atau otorisasi Admin.',
    };
  }

  if (
    currentState === 'suspended' &&
    (nextState === 'active' || nextState === 'paid') &&
    !context?.adminAuthorized
  ) {
    return {
      allowed: false,
      state: 'suspended',
      reason: 'Pembukaan penangguhan lisensi memerlukan otorisasi Admin.',
    };
  }

  return { allowed: true, state: nextState };
}

export function isLicenseExpired(expiresAt?: string | null, nowMs: number = Date.now()): boolean {
  if (!expiresAt || typeof expiresAt !== 'string') return false;
  const trimmed = expiresAt.trim();
  if (!trimmed) return false;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return false;
  return parsed <= nowMs;
}

export function evaluateLicenseLifecycleState(
  record: {
    status?: string;
    lifecycleState?: LicenseLifecycleState;
    deleted?: boolean;
    revoked?: boolean;
    suspended?: boolean;
    paymentFailed?: boolean;
    expiresAt?: string | null;
    usedSeats?: number;
    devices?: string[];
    teacherSeats?: Record<string, TeacherSeatInfo>;
  },
  nowMs: number = Date.now()
): LicenseLifecycleState {
  if (record.deleted || record.revoked || record.lifecycleState === 'revoked') {
    return 'revoked';
  }
  if (record.paymentFailed || record.lifecycleState === 'payment_failed') {
    return 'payment_failed';
  }
  if (record.suspended || record.lifecycleState === 'suspended') {
    return 'suspended';
  }
  if (isLicenseExpired(record.expiresAt, nowMs) || record.lifecycleState === 'expired') {
    return 'expired';
  }
  if (record.lifecycleState === 'pending_payment') {
    return 'pending_payment';
  }

  const activeTeacherCount = record.teacherSeats
    ? Object.values(record.teacherSeats).filter((t) => t && t.status === 'active').length
    : 0;
  const deviceCount = Array.isArray(record.devices) ? record.devices.length : 0;
  const effectiveUsed = Math.max(Number(record.usedSeats) || 0, activeTeacherCount, deviceCount);

  if (record.status === 'aktif' || record.lifecycleState === 'active' || effectiveUsed > 0) {
    return 'active';
  }
  return 'paid';
}

export interface LastLicenseStatusMetadata {
  state: QuotaLifecycleState;
  licenseKey?: string;
  expiresAt?: string | null;
  message?: string;
  updatedAt: string;
}

export function saveLastLicenseStatusMetadata(meta: LastLicenseStatusMetadata | null): void {
  try {
    if (!meta) {
      localStorage.removeItem(STORAGE_KEY_LAST_LICENSE_STATUS);
      return;
    }
    safeSetItem(STORAGE_KEY_LAST_LICENSE_STATUS, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export function getLastLicenseStatusMetadata(): LastLicenseStatusMetadata | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_LICENSE_STATUS);
    if (!raw) return null;
    return JSON.parse(raw) as LastLicenseStatusMetadata;
  } catch {
    return null;
  }
}

/**
 * Menghasilkan kode lisensi resmi berbasis ID Perangkat (Terkunci 100% ke 1 Perangkat Guru)
 */
export function computeLicenseCodeForDevice(deviceId: string): string {
  const cleanDev = deviceId.trim().toUpperCase();
  const check = computeHash36(`ASESMERDEKA-PRO-DEVICE:${cleanDev}:2026`).slice(0, 6);
  return `ASM-DV26-${check}`;
}

/**
 * Menghasilkan kode lisensi terenkripsi dengan tanda tangan HMAC (Format: ASM-XXXX-XXXX-XXXX-XXXX)
 * Tidak menampilkan nomor urut (seperti MAYAR001) secara polos sehingga tidak dapat ditebak.
 */
export function computeSerialLicenseCode(rawBody: string): string {
  const cleanBody = rawBody.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 12) || 'GURU2026';
  const paddedBody = cleanBody.padEnd(6, 'X');

  let prefix = 'GM26';
  if (paddedBody.startsWith('SOLO') || paddedBody.startsWith('1DEV') || paddedBody.startsWith('LOCK')) {
    prefix = 'SL26';
  } else if (paddedBody.startsWith('SEKOLAHPRO') || paddedBody.startsWith('SCHPRO')) {
    prefix = 'SP26';
  } else if (
    paddedBody.startsWith('SEKOLAH') ||
    paddedBody.startsWith('SMAN') ||
    paddedBody.startsWith('SMPN') ||
    paddedBody.startsWith('SDN') ||
    paddedBody.startsWith('SCH')
  ) {
    prefix = 'SK26';
  } else if (paddedBody.startsWith('PROAI') || paddedBody.startsWith('GURUPRO')) {
    prefix = 'GP26';
  }

  const cipher1 = computeHash36(`ASM_ENC_C1_V2:${prefix}:${paddedBody}:9F8E7D6C_SALT`)
    .padStart(4, '7')
    .slice(0, 4);
  const cipher2 = computeHash36(`ASM_ENC_C2_V2:${prefix}:${cipher1}:4B3A2918_KEY`)
    .padStart(4, '9')
    .slice(0, 4);
  const sig = computeHash36(
    `ASM_HMAC_SIG_V2:${prefix}-${cipher1}-${cipher2}:ASESMERDEKA_2026_MASTER`
  )
    .padStart(4, 'X')
    .slice(0, 4);

  return `ASM-${prefix}-${cipher1}-${cipher2}-${sig}`;
}

/**
 * Menghasilkan daftar kode lisensi kolektif (Mayar / Bibi / Sekolah)
 */
export function generateSchoolBatchLicenses(schoolPrefix: string, count = 25): string[] {
  const prefix = schoolPrefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'SEKOLAH';
  const codes: string[] = [];
  for (let i = 1; i <= count; i++) {
    const padLen = count >= 100 ? 3 : 2;
    const num = String(i).padStart(padLen, '0');
    codes.push(computeSerialLicenseCode(`${prefix}${num}`));
  }
  return codes;
}

/**
 * Mengambil konfigurasi batas maksimal perangkat untuk kode Individu (1 atau 2 perangkat)
 */
export function getConfiguredIndividuMaxDevices(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MAX_INDIVIDU_SEATS);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 1 && parsed <= 5) return parsed;
    }
  } catch {
    // abaikan
  }
  const envMax = (import.meta as any).env?.VITE_MAX_INDIVIDU_DEVICES;
  if (envMax) {
    const parsed = parseInt(String(envMax), 10);
    if (parsed >= 1 && parsed <= 5) return parsed;
  }
  return DEFAULT_INDIVIDU_MAX_DEVICES;
}

export function setConfiguredIndividuMaxDevices(maxDevices: number): void {
  const clamped = Math.max(1, Math.min(5, Math.round(maxDevices)));
  safeSetItem(STORAGE_KEY_MAX_INDIVIDU_SEATS, String(clamped));
}

/**
 * Menentukan batas maksimal perangkat (Device Seat Limit) berdasarkan jenis Kode Lisensi:
 * 1. Kode Kunci Perangkat (3 bagian: PRO-MERDEKA-XXXXXX) -> Maksimal 1 Perangkat (Terkunci ke ID Perangkat)
 * 2. Kode Prefix SOLO / 1DEV (PRO-MERDEKA-SOLO001-XXXX) -> Maksimal 1 Perangkat
 * 3. Kode Voucher Individu Mayar / Bibi (PRO-MERDEKA-MAYAR001-XXXX / BIBI001) -> Maksimal 1 atau 2 Perangkat (sesuai setelan Admin, default 2: 1 Laptop + 1 HP)
 * 4. Kode Kolektif Sekolah (PRO-MERDEKA-SEKOLAH01-XXXX / SMAN / SMPN / SDN) -> Maksimal 25 Perangkat
 */
export function normalizeLicenseCodeInput(rawCode: string): string {
  return String(rawCode || '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
}

export const STAGING_LICENSE_FORMAT_VERSION = 'STG2';
const STAGING_PLAN_PREFIXES = ['GM26', 'SK26', 'GP26', 'SP26', 'SL26'];

export function isStagingLicenseCodeFormat(rawCode: string): boolean {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  const parts = cleanCode.split('-');
  return (
    parts.length === 5 &&
    parts[0] === 'ASM' &&
    parts[1] === STAGING_LICENSE_FORMAT_VERSION &&
    STAGING_PLAN_PREFIXES.includes(parts[2] || '') &&
    /^[A-Z0-9]{8}$/.test(parts[3] || '') &&
    /^[A-F0-9]{32}$/.test(parts[4] || '')
  );
}

export function extractPlanPrefixFromLicenseCode(rawCode: string): string {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  const parts = cleanCode.split('-');
  if (parts.length !== 5 || parts[0] !== 'ASM') return '';
  if (parts[1] === STAGING_LICENSE_FORMAT_VERSION) {
    return STAGING_PLAN_PREFIXES.includes(parts[2] || '') ? parts[2] : '';
  }
  if (/^STG[A-Z0-9]*$/.test(parts[1] || '')) {
    return '';
  }
  return STAGING_PLAN_PREFIXES.includes(parts[1] || '') ? parts[1] : '';
}

export function getMaxDevicesForLicenseCode(rawCode: string): number {
  const cleanCode = normalizeLicenseCodeInput(rawCode);

  // Jika kode lisensi berasal dari Mayar yang sudah diverifikasi (Individu = 2, Sekolah = 25)
  const mayarInfo = getMayarVerifiedCodeInfo(cleanCode);
  if (mayarInfo) {
    return mayarInfo.maxSeats;
  }

  const parts = cleanCode.split('-');

  // Format Terenkripsi Baru: ASM-<PREFIX>-<CIPHER1>-<CIPHER2>-<SIG> atau ASM-STG2-<PREFIX>-<NONCE8>-<SIG32>
  const planPrefix = extractPlanPrefixFromLicenseCode(cleanCode);
  if (planPrefix) {
    if (planPrefix === 'SL26') return 1;
    if (planPrefix === 'SK26' || planPrefix === 'SP26') return DEFAULT_SEKOLAH_MAX_DEVICES;
    if (planPrefix === 'GM26' || planPrefix === 'GP26') return getConfiguredIndividuMaxDevices();
  }

  // Format 3 segmen adalah kode kunci 1 perangkat (ASM-DV26-XXXXXX)
  if (parts.length === 3 && parts[0] === 'ASM' && parts[1] === 'DV26') {
    return 1;
  }

  return 1;
}

export function isCollectiveSchoolLicenseCode(rawCode: string): boolean {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  const mayarInfo = getMayarVerifiedCodeInfo(cleanCode);
  if (mayarInfo?.planType === 'sekolah') return true;
  const planPrefix = extractPlanPrefixFromLicenseCode(cleanCode);
  if (planPrefix) {
    return planPrefix === 'SK26' || planPrefix === 'SP26';
  }
  return cleanCode.includes('SEKOLAH') || cleanCode.includes('SMAN') || cleanCode.includes('SMPN') || cleanCode.includes('SDN');
}

export function normalizeTeacherSeatKey(teacherPinOrId?: string, deviceId?: string): string {
  const raw = String(teacherPinOrId || '').trim();
  if (raw) {
    // Jika format "NAMA_GURU:PIN", gunakan identitas guru sebelum ":" sebagai kunci kursi guru
    const segment = raw.includes(':') ? raw.split(':')[0] : raw;
    const cleaned = segment
      .replace(/[^A-Za-z0-9_-]/g, '')
      .toUpperCase()
      .slice(0, 48);
    if (cleaned.length >= 2) {
      return cleaned;
    }
  }
  const cleanDev = String(deviceId || '').trim().toUpperCase().replace(/[^A-Za-z0-9_-]/g, '');
  return cleanDev ? `LEGACY_DEV_${cleanDev}` : 'DEFAULT_TEACHER';
}

interface SeatRegistryEntry {
  devices: string[];
  maxDevices: number;
  updatedAt: string;
  sig: string;
  teacherSeats?: Record<string, TeacherSeatInfo>;
  maxDevicesPerTeacher?: number;
}

interface SeatRegistryMap {
  [licenseCode: string]: SeatRegistryEntry;
}

function getSeatRegistry(): SeatRegistryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEAT_REGISTRY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SeatRegistryMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSeatRegistry(registry: SeatRegistryMap): void {
  safeSetItem(STORAGE_KEY_SEAT_REGISTRY, JSON.stringify(registry));
}

function computeTeacherSeatsDigest(teacherSeats?: Record<string, TeacherSeatInfo>): string {
  if (!teacherSeats) return '';
  const keys = Object.keys(teacherSeats).sort();
  return keys
    .map((k) => {
      const t = teacherSeats[k];
      return `${k}:${t.status}:${(t.devices || []).join('+')}`;
    })
    .join('|');
}

function computeSeatEntrySig(
  code: string,
  devices: string[],
  maxDevices: number,
  teacherSeats?: Record<string, TeacherSeatInfo>
): string {
  const teacherPart = teacherSeats ? `:${computeTeacherSeatsDigest(teacherSeats)}` : '';
  return computeHash36(`SEAT_LOCK:${code}:${devices.join(',')}:${maxDevices}${teacherPart}:ASESMERDEKA_2026`);
}

function getActiveTeacherDevicesUnion(teacherSeats: Record<string, TeacherSeatInfo>): string[] {
  const seen = new Set<string>();
  for (const key of Object.keys(teacherSeats)) {
    const entry = teacherSeats[key];
    if (entry && entry.status === 'active' && Array.isArray(entry.devices)) {
      for (const dev of entry.devices) {
        seen.add(dev);
      }
    }
  }
  return Array.from(seen);
}

/**
 * Mengecek dan mengklaim slot perangkat / kursi guru (Seat Lock) untuk kode lisensi agar tidak bisa dijual ulang.
 * Untuk lisensi Kolektif Sekolah (25 Guru), 1 guru dapat mengikat hingga 2 perangkat (Laptop + HP)
 * tanpa dihitung sebagai 2 guru berbeda.
 */
export function checkAndClaimLicenseSeat(
  rawCode: string,
  deviceId: string,
  teacherPinOrId?: string
): {
  allowed: boolean;
  usedSeats: number;
  maxSeats: number;
  teacherKey?: string;
  teacherUsedDevices?: number;
  teacherMaxDevices?: number;
  teacherDeviceLimitExceeded?: boolean;
  teacherSeatDisabled?: boolean;
  seatLimitExceeded?: boolean;
  message?: string;
} {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  const cleanDevice = deviceId.trim().toUpperCase();
  const maxSeats = getMaxDevicesForLicenseCode(cleanCode);
  const isSchool = isCollectiveSchoolLicenseCode(cleanCode) || maxSeats >= DEFAULT_SEKOLAH_MAX_DEVICES;

  const registry = getSeatRegistry();
  const existing = registry[cleanCode];

  if (existing && Array.isArray(existing.devices)) {
    const expectedSigWithTeachers = computeSeatEntrySig(
      cleanCode,
      existing.devices,
      existing.maxDevices,
      existing.teacherSeats
    );
    const expectedLegacySig = computeSeatEntrySig(cleanCode, existing.devices, existing.maxDevices);
    const sigMatches =
      existing.sig === expectedSigWithTeachers ||
      (!existing.teacherSeats && existing.sig === expectedLegacySig);

    if (!sigMatches) {
      return {
        allowed: false,
        usedSeats: maxSeats,
        maxSeats,
        message:
          'Terdeteksi manipulasi data kunci perangkat pada kode lisensi ini. Kode lisensi dikunci demi keamanan.',
      };
    }
  }

  // Jalur Khusus Lisensi Kolektif Sekolah: 25 Kursi Guru x Maks. 2 Perangkat/Guru
  if (isSchool) {
    const teacherSeats: Record<string, TeacherSeatInfo> = existing?.teacherSeats
      ? JSON.parse(JSON.stringify(existing.teacherSeats))
      : {};
    const maxDevicesPerTeacher = DEFAULT_SEKOLAH_MAX_DEVICES_PER_TEACHER;

    // Jika tidak ada teacherPinOrId, cek apakah perangkat ini sudah terikat ke salah satu kursi guru
    let resolvedKey = teacherPinOrId?.trim() ? normalizeTeacherSeatKey(teacherPinOrId, cleanDevice) : '';
    if (!resolvedKey) {
      for (const k of Object.keys(teacherSeats)) {
        if (teacherSeats[k]?.devices?.includes(cleanDevice)) {
          resolvedKey = k;
          break;
        }
      }
      if (!resolvedKey) {
        resolvedKey = normalizeTeacherSeatKey('', cleanDevice);
      }
    }

    const activeTeachers = Object.values(teacherSeats).filter((t) => t && t.status === 'active');
    const existingTeacher = teacherSeats[resolvedKey];
    const nowIso = new Date().toISOString();

    if (existingTeacher) {
      if (existingTeacher.status === 'disabled') {
        return {
          allowed: false,
          usedSeats: activeTeachers.length,
          maxSeats,
          teacherKey: resolvedKey,
          teacherUsedDevices: existingTeacher.devices.length,
          teacherMaxDevices: maxDevicesPerTeacher,
          teacherSeatDisabled: true,
          message: `Kursi guru "${resolvedKey}" telah dinonaktifkan oleh Admin Sekolah. Hubungi Admin Sekolah untuk aktivasi kembali atau gunakan akun guru aktif.`,
        };
      }

      if (existingTeacher.devices.includes(cleanDevice)) {
        return {
          allowed: true,
          usedSeats: activeTeachers.length,
          maxSeats,
          teacherKey: resolvedKey,
          teacherUsedDevices: existingTeacher.devices.length,
          teacherMaxDevices: maxDevicesPerTeacher,
        };
      }

      if (existingTeacher.devices.length >= maxDevicesPerTeacher) {
        return {
          allowed: false,
          usedSeats: activeTeachers.length,
          maxSeats,
          teacherKey: resolvedKey,
          teacherUsedDevices: existingTeacher.devices.length,
          teacherMaxDevices: maxDevicesPerTeacher,
          teacherDeviceLimitExceeded: true,
          seatLimitExceeded: true,
          message: `Batas maksimal ${maxDevicesPerTeacher} perangkat (1 Laptop + 1 HP) untuk guru "${resolvedKey}" telah penuh (${existingTeacher.devices.length}/${maxDevicesPerTeacher}). Hubungi Admin untuk reset perangkat guru ini.`,
        };
      }

      existingTeacher.devices.push(cleanDevice);
      existingTeacher.updatedAt = nowIso;
      const unionDevices = getActiveTeacherDevicesUnion(teacherSeats);
      registry[cleanCode] = {
        devices: unionDevices,
        maxDevices: maxSeats,
        updatedAt: getTodayDateStr(),
        teacherSeats,
        maxDevicesPerTeacher,
        sig: computeSeatEntrySig(cleanCode, unionDevices, maxSeats, teacherSeats),
      };
      saveSeatRegistry(registry);

      return {
        allowed: true,
        usedSeats: activeTeachers.length,
        maxSeats,
        teacherKey: resolvedKey,
        teacherUsedDevices: existingTeacher.devices.length,
        teacherMaxDevices: maxDevicesPerTeacher,
      };
    }

    // Guru baru pada lisensi sekolah: cek kuota 25 kursi guru
    if (activeTeachers.length >= maxSeats) {
      return {
        allowed: false,
        usedSeats: activeTeachers.length,
        maxSeats,
        seatLimitExceeded: true,
        message: `Aktivasi Ditolak! Kuota ${maxSeats} kursi guru pada Lisensi Kolektif Sekolah ini sudah terisi penuh (${activeTeachers.length}/${maxSeats} guru). Nonaktifkan guru yang tidak lagi aktif atau tambah kuota sekolah.`,
      };
    }

    teacherSeats[resolvedKey] = {
      teacherKey: resolvedKey,
      teacherLabel: teacherPinOrId?.trim() || resolvedKey,
      status: 'active',
      devices: [cleanDevice],
      maxDevices: maxDevicesPerTeacher,
      claimedAt: nowIso,
      updatedAt: nowIso,
    };

    const nextActiveCount = activeTeachers.length + 1;
    const unionDevices = getActiveTeacherDevicesUnion(teacherSeats);
    registry[cleanCode] = {
      devices: unionDevices,
      maxDevices: maxSeats,
      updatedAt: getTodayDateStr(),
      teacherSeats,
      maxDevicesPerTeacher,
      sig: computeSeatEntrySig(cleanCode, unionDevices, maxSeats, teacherSeats),
    };
    saveSeatRegistry(registry);

    return {
      allowed: true,
      usedSeats: nextActiveCount,
      maxSeats,
      teacherKey: resolvedKey,
      teacherUsedDevices: 1,
      teacherMaxDevices: maxDevicesPerTeacher,
    };
  }

  // Jalur Lisensi Individu (SL26 = 1 perangkat, GM26/GP26 = 2 perangkat)
  const registeredDevices: string[] =
    existing && Array.isArray(existing.devices) ? [...existing.devices] : [];

  if (registeredDevices.includes(cleanDevice)) {
    return {
      allowed: true,
      usedSeats: registeredDevices.length,
      maxSeats,
    };
  }

  if (registeredDevices.length >= maxSeats) {
    return {
      allowed: false,
      usedSeats: registeredDevices.length,
      maxSeats,
      seatLimitExceeded: true,
      message: `Aktivasi Ditolak! Kode lisensi ini telah mencapai batas maksimal perangkat (${registeredDevices.length}/${maxSeats} perangkat) dan telah terkunci pada perangkat pemilik pertama. Kode tidak dapat digunakan ulang atau diperjualbelikan ke perangkat lain.`,
    };
  }

  registeredDevices.push(cleanDevice);
  registry[cleanCode] = {
    devices: registeredDevices,
    maxDevices: maxSeats,
    updatedAt: getTodayDateStr(),
    sig: computeSeatEntrySig(cleanCode, registeredDevices, maxSeats),
  };
  saveSeatRegistry(registry);

  return {
    allowed: true,
    usedSeats: registeredDevices.length,
    maxSeats,
  };
}

export function manageLocalSchoolTeacherSeat(
  rawCode: string,
  teacherPinOrId: string,
  action: 'disable' | 'enable' | 'reset_devices'
): {
  ok: boolean;
  usedSeats: number;
  maxSeats: number;
  teacherKey: string;
  message: string;
} {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  const teacherKey = normalizeTeacherSeatKey(teacherPinOrId);
  const maxSeats = getMaxDevicesForLicenseCode(cleanCode);
  const registry = getSeatRegistry();
  const entry = registry[cleanCode];

  if (!entry || !entry.teacherSeats || !entry.teacherSeats[teacherKey]) {
    return {
      ok: false,
      usedSeats: 0,
      maxSeats,
      teacherKey,
      message: `Kursi guru "${teacherKey}" belum terdaftar pada lisensi ${cleanCode}.`,
    };
  }

  const target = entry.teacherSeats[teacherKey];
  const nowIso = new Date().toISOString();

  if (action === 'disable') {
    target.status = 'disabled';
    target.disabledAt = nowIso;
    target.updatedAt = nowIso;
  } else if (action === 'enable') {
    const activeCount = Object.values(entry.teacherSeats).filter((t) => t.status === 'active').length;
    if (target.status !== 'active' && activeCount >= maxSeats) {
      return {
        ok: false,
        usedSeats: activeCount,
        maxSeats,
        teacherKey,
        message: `Tidak dapat mengaktifkan kembali "${teacherKey}" karena ${maxSeats}/${maxSeats} kursi guru sudah terisi.`,
      };
    }
    target.status = 'active';
    target.disabledAt = undefined;
    target.updatedAt = nowIso;
  } else if (action === 'reset_devices') {
    target.devices = [];
    target.updatedAt = nowIso;
  }

  const unionDevices = getActiveTeacherDevicesUnion(entry.teacherSeats);
  const nextActiveCount = Object.values(entry.teacherSeats).filter((t) => t.status === 'active').length;
  entry.devices = unionDevices;
  entry.updatedAt = getTodayDateStr();
  entry.sig = computeSeatEntrySig(cleanCode, unionDevices, entry.maxDevices, entry.teacherSeats);
  saveSeatRegistry(registry);

  return {
    ok: true,
    usedSeats: nextActiveCount,
    maxSeats,
    teacherKey,
    message:
      action === 'disable'
        ? `Kursi guru "${teacherKey}" dinonaktifkan. Kuota aktif kini ${nextActiveCount}/${maxSeats}.`
        : action === 'enable'
        ? `Kursi guru "${teacherKey}" diaktifkan kembali (${nextActiveCount}/${maxSeats}).`
        : `Daftar perangkat untuk guru "${teacherKey}" berhasil di-reset.`,
  };
}

/**
 * Menghapus kunci kursi perangkat lokal (Seat Lock) untuk satu kode lisensi agar perangkat baru dapat mengklaim ulang slot.
 */
export function resetLocalLicenseSeat(rawCode: string): boolean {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  if (!cleanCode) return false;
  const registry = getSeatRegistry();
  if (!registry[cleanCode]) return false;
  delete registry[cleanCode];
  saveSeatRegistry(registry);
  return true;
}

/**
 * Mengambil informasi pemakaian kursi perangkat / kursi guru untuk suatu kode lisensi
 */
export function getLicenseSeatStatus(rawCode: string): {
  devices: string[];
  usedSeats: number;
  maxSeats: number;
  teacherSeats?: Record<string, TeacherSeatInfo>;
  activeTeacherCount?: number;
} {
  const cleanCode = rawCode.trim().toUpperCase();
  const maxSeats = getMaxDevicesForLicenseCode(cleanCode);
  const registry = getSeatRegistry();
  const existing = registry[cleanCode];
  if (!existing || !Array.isArray(existing.devices)) {
    return { devices: [], usedSeats: 0, maxSeats };
  }
  if (existing.teacherSeats) {
    const activeTeacherCount = Object.values(existing.teacherSeats).filter(
      (t) => t && t.status === 'active'
    ).length;
    return {
      devices: existing.devices,
      usedSeats: activeTeacherCount,
      maxSeats,
      teacherSeats: existing.teacherSeats,
      activeTeacherCount,
    };
  }
  return {
    devices: existing.devices,
    usedSeats: existing.devices.length,
    maxSeats,
  };
}

/**
 * Mengambil/menyimpan URL Cloud Seat Tracker (Opsional: Google Apps Script / Webhook untuk sinkronisasi lintas internet)
 */
export function getCloudSeatTrackerUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SEAT_TRACKER_URL);
    if (saved && saved.trim().startsWith('https://')) {
      return saved.trim();
    }
  } catch {
    // abaikan
  }
  const envUrl = (import.meta as any).env?.VITE_LICENSE_SEAT_API_URL;
  if (typeof envUrl === 'string' && envUrl.trim().startsWith('https://')) {
    return envUrl.trim();
  }
  return '';
}

export function saveCloudSeatTrackerUrl(url: string): void {
  safeSetItem(STORAGE_KEY_SEAT_TRACKER_URL, url.trim());
}

export function getMayarProductId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MAYAR_PRODUCT_ID);
    if (saved && saved.trim().length > 5) {
      return saved.trim();
    }
  } catch {
    // abaikan
  }
  const envId = (import.meta as any).env?.VITE_MAYAR_PRODUCT_ID;
  if (typeof envId === 'string' && envId.trim().length > 5) {
    return envId.trim();
  }
  return DEFAULT_MAYAR_PRODUCT_ID;
}

export function saveMayarProductId(productId: string): void {
  safeSetItem(STORAGE_KEY_MAYAR_PRODUCT_ID, productId.trim());
}

export function getMayarSchoolProductId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MAYAR_SCHOOL_PRODUCT_ID);
    if (saved && saved.trim().length > 5) {
      return saved.trim();
    }
  } catch {
    // abaikan
  }
  const envId = (import.meta as any).env?.VITE_MAYAR_SCHOOL_PRODUCT_ID;
  if (typeof envId === 'string' && envId.trim().length > 5) {
    return envId.trim();
  }
  return DEFAULT_MAYAR_SCHOOL_PRODUCT_ID;
}

export function saveMayarSchoolProductId(productId: string): void {
  safeSetItem(STORAGE_KEY_MAYAR_SCHOOL_PRODUCT_ID, productId.trim());
}

interface MayarVerifiedEntry {
  deviceId: string;
  planType: 'individu' | 'sekolah';
  maxSeats: number;
  sig: string;
}

function recordMayarVerifiedCode(
  cleanCode: string,
  deviceId: string,
  planType: 'individu' | 'sekolah' = 'individu',
  maxSeats: number = 2
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VERIFIED_MAYAR_CODES);
    const map: Record<string, MayarVerifiedEntry> = raw ? JSON.parse(raw) : {};
    const sig = computeHash36(`MAYAR_VERIFIED:${cleanCode}:${deviceId}:${planType}:${maxSeats}:ASESMERDEKA_2026`);
    map[cleanCode] = { deviceId, planType, maxSeats, sig };
    safeSetItem(STORAGE_KEY_VERIFIED_MAYAR_CODES, JSON.stringify(map));
  } catch {
    // abaikan
  }
}

function getMayarVerifiedCodeInfo(cleanCode: string): { planType: 'individu' | 'sekolah'; maxSeats: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VERIFIED_MAYAR_CODES);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, MayarVerifiedEntry>;
    const entry = map[cleanCode];
    if (!entry) return null;
    const expectedSig = computeHash36(
      `MAYAR_VERIFIED:${cleanCode}:${entry.deviceId}:${entry.planType}:${entry.maxSeats}:ASESMERDEKA_2026`
    );
    if (entry.sig === expectedSig) {
      return { planType: entry.planType, maxSeats: entry.maxSeats };
    }
    return null;
  } catch {
    return null;
  }
}

function isMayarVerifiedCodeForDevice(cleanCode: string, deviceId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VERIFIED_MAYAR_CODES);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, MayarVerifiedEntry>;
    const entry = map[cleanCode];
    if (!entry) return false;
    const expectedSig = computeHash36(
      `MAYAR_VERIFIED:${cleanCode}:${deviceId}:${entry.planType}:${entry.maxSeats}:ASESMERDEKA_2026`
    );
    return entry.sig === expectedSig && entry.deviceId === deviceId;
  } catch {
    return false;
  }
}

/**
 * Memverifikasi kode lisensi yang diterbitkan otomatis oleh Mayar.id
 * melalui endpoint serverless aman /api/activate-license
 */
export async function verifyMayarLicenseOnline(
  rawCode: string,
  deviceId?: string,
  teacherPin?: string
): Promise<{
  valid: boolean;
  planType?: 'individu' | 'sekolah';
  usedSeats?: number;
  maxSeats?: number;
  teacherKey?: string;
  teacherUsedDevices?: number;
  teacherMaxDevices?: number;
  teacherDeviceLimitExceeded?: boolean;
  teacherSeatDisabled?: boolean;
  seatLimitExceeded?: boolean;
  revoked?: boolean;
  expired?: boolean;
  expiresAt?: string | null;
  lifecycleState?: LicenseLifecycleState;
  message?: string;
}> {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  const activeDevice = (deviceId || getOrCreateDeviceId()).trim().toUpperCase();
  const cleanTeacherPin = String(teacherPin || '').trim();

  // 1. Hubungi endpoint serverless aman /api/activate-license terlebih dahulu
  // agar Upstash Redis mengunci batas maksimal perangkat lintas HP & Laptop (Anti-Share ke perangkat ke-3)
  try {
    const response = await fetch('/api/activate-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseCode: cleanCode,
        deviceId: activeDevice,
        ...(cleanTeacherPin ? { teacherPin: cleanTeacherPin } : {}),
      }),
    });

    const data = await response.json().catch(() => null);

    // Jika server menolak (dicabut/dihapus oleh Admin, kedaluwarsa, atau kursi perangkat/guru sudah penuh)
    if (
      response.status === 403 ||
      data?.revoked ||
      data?.expired ||
      data?.seatLimitExceeded ||
      data?.teacherSeatDisabled ||
      data?.teacherDeviceLimitExceeded
    ) {
      return {
        valid: false,
        revoked: Boolean(data?.revoked),
        expired: Boolean(data?.expired),
        expiresAt: data?.expiresAt ?? null,
        lifecycleState: data?.lifecycleState,
        seatLimitExceeded: Boolean(data?.seatLimitExceeded),
        teacherDeviceLimitExceeded: Boolean(data?.teacherDeviceLimitExceeded),
        teacherSeatDisabled: Boolean(data?.teacherSeatDisabled),
        teacherKey: data?.teacherKey,
        teacherUsedDevices: data?.teacherUsedDevices,
        teacherMaxDevices: data?.teacherMaxDevices,
        usedSeats: data?.usedSeats,
        maxSeats: data?.maxSeats,
        message:
          data?.message ||
          'Kode lisensi ini tidak valid, masa berlaku berakhir, atau telah dinonaktifkan oleh Administrator.',
      };
    }

    if (response.ok && data?.valid) {
      const planType = data.planType === 'sekolah' ? 'sekolah' : 'individu';
      const maxSeats =
        Number(data.maxSeats) ||
        (planType === 'sekolah' ? DEFAULT_SEKOLAH_MAX_DEVICES : DEFAULT_INDIVIDU_MAX_DEVICES);
      recordMayarVerifiedCode(cleanCode, activeDevice, planType, maxSeats);
      return {
        valid: true,
        planType,
        usedSeats: data.usedSeats,
        maxSeats,
        teacherKey: data.teacherKey,
        teacherUsedDevices: data.teacherUsedDevices,
        teacherMaxDevices: data.teacherMaxDevices,
        expiresAt: data.expiresAt ?? null,
        lifecycleState: data.lifecycleState || 'active',
        message: data.message,
      };
    }

    // Jika server merespons bahwa kode tidak valid secara eksplisit:
    if (data && data.valid === false) {
      return {
        valid: false,
        message: data.message || 'Kode lisensi tidak valid.',
      };
    }

    // Jika kode cocok algoritma internal tapi /api/activate-license belum mengenali (misal dev lokal lama)
    if (isValidLicenseCode(cleanCode, activeDevice)) {
      return { valid: true };
    }

    if (data?.message) {
      return {
        valid: false,
        message: data.message,
      };
    }
  } catch {
    // 2. Fallback jika sedang offline / tidak ada jaringan internet: cek algoritma internal
    if (isValidLicenseCode(cleanCode, activeDevice)) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    message: 'Kode lisensi tidak ditemukan di sistem AsesMerdeka maupun server Mayar.id.',
  };
}

/**
 * Verifikasi kursi perangkat ke Cloud Tracker (jika URL Google Apps Script / Webhook disetel)
 */
export async function verifyAndClaimSeatOnline(
  rawCode: string,
  deviceId: string
): Promise<{ allowed: boolean; usedSeats: number; maxSeats: number; message?: string }> {
  const cleanCode = rawCode.trim().toUpperCase();
  const cleanDevice = deviceId.trim().toUpperCase();
  const maxSeats = getMaxDevicesForLicenseCode(cleanCode);
  const trackerUrl = getCloudSeatTrackerUrl();

  if (!trackerUrl) {
    return checkAndClaimLicenseSeat(cleanCode, cleanDevice);
  }

  try {
    const response = await fetch(trackerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'claim_seat',
        licenseCode: cleanCode,
        deviceId: cleanDevice,
        maxSeats,
        hardwareFp: getHardwareFingerprint(),
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        allowed?: boolean;
        usedSeats?: number;
        maxSeats?: number;
        message?: string;
      };
      if (data.allowed === false) {
        return {
          allowed: false,
          usedSeats: data.usedSeats ?? maxSeats,
          maxSeats: data.maxSeats ?? maxSeats,
          message:
            data.message ||
            `Aktivasi Ditolak oleh Server Lisensi! Kode ini sudah mencapai batas maksimal (${maxSeats}/${maxSeats} perangkat) dan tidak dapat digunakan di perangkat lain.`,
        };
      }
    }
  } catch {
    // Jika offline atau jaringan gagal, lanjutkan dengan verifikasi seat lock lokal
  }

  return checkAndClaimLicenseSeat(cleanCode, cleanDevice);
}

export function isLegacyRevokedCode(rawCode?: string): boolean {
  const clean = normalizeLicenseCodeInput(rawCode || '');
  return clean.startsWith('PRO-MERDEKA-') || clean.startsWith('ASES-');
}

export function isLocallyRevokedLicense(rawCode?: string): boolean {
  try {
    const clean = normalizeLicenseCodeInput(rawCode || '');
    if (!clean) return false;
    const rawDeleted = localStorage.getItem('asesmerdeka_deleted_licenses_v1');
    if (!rawDeleted) return false;
    const deletedList = JSON.parse(rawDeleted);
    if (Array.isArray(deletedList) && deletedList.includes(clean)) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Membersihkan entri kode lisensi usang (PRO-MERDEKA-* / ASES-*).
 * PENTING: Data akademik, profil sekolah (schoolId), presensi, jurnal, nilai, dan e-Rapor
 * TIDAK BOLEH PERNAH dihapus ketika lisensi dibersihkan atau dicabut!
 */
export function purgeDeviceFromLegacyLicense(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_QUOTA);
    localStorage.removeItem(STORAGE_KEY_SIG);
    localStorage.removeItem(STORAGE_KEY_SEAT_REGISTRY);
    localStorage.removeItem(STORAGE_KEY_VERIFIED_MAYAR_CODES);
    localStorage.removeItem('asesmerdeka_class_setup_confirmed_v1');
    localStorage.removeItem('asesmerdeka_cloud_last_sync_at_v1');
  } catch {
    // ignore
  }
}

/**
 * Membersihkan status aktivasi lisensi secara non-destruktif tanpa menyentuh
 * profil sekolah, setup kelas, atau data akademik guru.
 */
function clearActiveLicenseEntitlementKeysOnly(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_QUOTA);
    localStorage.removeItem(STORAGE_KEY_SIG);
    localStorage.removeItem(STORAGE_KEY_VERIFIED_MAYAR_CODES);
  } catch {
    // ignore
  }
}

export function isValidLicenseCode(rawCode: string, deviceId: string): boolean {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  if (!cleanCode) return false;

  // Tolak permanen seluruh kode lama (PRO-MERDEKA-... atau ASES-...)
  if (isLegacyRevokedCode(cleanCode)) {
    return false;
  }

  // Tolak jika lisensi telah dihapus/dicabut oleh Admin
  if (isLocallyRevokedLicense(cleanCode)) {
    return false;
  }

  // 1. Cek kecocokan kode spesifik perangkat (Terkunci 100% ke 1 ID Perangkat: ASM-DV26-XXXXXX)
  const expectedDeviceCode = computeLicenseCodeForDevice(deviceId);
  if (cleanCode === expectedDeviceCode) {
    return true;
  }

  // 2A. Kode lisensi staging (ASM-STG2-*) TIDAK pernah lolos validasi kripto offline client;
  // wajib melalui verifikasi server (/api/activate-license) yang menyimpan bukti Mayar/server per perangkat.
  if (isStagingLicenseCodeFormat(cleanCode)) {
    return isMayarVerifiedCodeForDevice(cleanCode, deviceId.trim().toUpperCase());
  }

  // 2. Cek format terenkripsi baru (Production/Legacy): ASM-<PREFIX>-<CIPHER1>-<CIPHER2>-<SIG>
  const parts = cleanCode.split('-');
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
      return cipher2 === expectedCipher2 && providedSig === expectedSig;
    }
  }

  // 3. Cek apakah kode ini sudah terverifikasi resmi dari API Mayar.id untuk perangkat ini
  if (isMayarVerifiedCodeForDevice(cleanCode, deviceId.trim().toUpperCase())) {
    return true;
  }

  return false;
}

function getTrialUsedCount(deviceId: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIAL_USAGE);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { deviceId: string; used: number; sig: string };
    const expectedSig = computeHash36(`${deviceId}:${parsed.used}:trial_usage_permanent_salt`);
    if (parsed.sig !== expectedSig) {
      return FREE_TRIAL_CREDITS;
    }
    return Math.max(0, Math.min(FREE_TRIAL_CREDITS, parsed.used));
  } catch {
    return 0;
  }
}

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(STORAGE_KEY_DEVICE);
  if (!deviceId) {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const ts = Date.now().toString(36);
    deviceId = `DEV-${randomHex}-${ts}`.toUpperCase();
    safeSetItem(STORAGE_KEY_DEVICE, deviceId);
  }
  return deviceId;
}

export function getUserQuota(): UserQuota {
  const deviceId = getOrCreateDeviceId();
  const today = getTodayDateStr();
  const raw = localStorage.getItem(STORAGE_KEY_QUOTA);
  const storedSig = localStorage.getItem(STORAGE_KEY_SIG);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as UserQuota;

      // Jika perangkat ini sebelumnya mengaktifkan kode usang atau lisensi yang telah dihapus/dicabut/kedaluwarsa:
      if (parsed.licenseKey && isLegacyRevokedCode(parsed.licenseKey)) {
        purgeDeviceFromLegacyLicense();
        const resetQuota: UserQuota = {
          tier: 'free',
          remainingCredits: 0,
          maxCredits: 0,
          deviceId,
          lastResetDate: today,
          lifecycleState: 'revoked',
        };
        saveQuotaWithSignature(resetQuota);
        return resetQuota;
      }

      if (parsed.licenseKey && isLocallyRevokedLicense(parsed.licenseKey)) {
        saveLastLicenseStatusMetadata({
          state: 'revoked',
          licenseKey: parsed.licenseKey,
          expiresAt: parsed.expiresAt ?? null,
          message: 'Kode lisensi telah dicabut oleh Administrator. Data akademik Anda tetap aman.',
          updatedAt: new Date().toISOString(),
        });
        clearActiveLicenseEntitlementKeysOnly();
        const resetQuota: UserQuota = {
          tier: 'free',
          remainingCredits: 0,
          maxCredits: 0,
          deviceId,
          lastResetDate: today,
          lifecycleState: 'revoked',
        };
        saveQuotaWithSignature(resetQuota);
        return resetQuota;
      }

      const expectedSig = generateSignature(parsed);

      // Wajib verifikasi integritas signature + hardware fingerprint terlebih dahulu
      if (storedSig === expectedSig) {
        // Cek masa berlaku atau penangguhan pada lisensi tersimpan
        if (
          parsed.lifecycleState === 'revoked' ||
          parsed.lifecycleState === 'suspended' ||
          parsed.lifecycleState === 'expired' ||
          isLicenseExpired(parsed.expiresAt)
        ) {
          const derivedState: QuotaLifecycleState =
            parsed.lifecycleState === 'revoked'
              ? 'revoked'
              : parsed.lifecycleState === 'suspended'
              ? 'suspended'
              : 'expired';
          saveLastLicenseStatusMetadata({
            state: derivedState,
            licenseKey: parsed.licenseKey,
            expiresAt: parsed.expiresAt ?? null,
            message:
              derivedState === 'expired'
                ? 'Masa berlaku lisensi telah habis. Data akademik tetap tersimpan; silakan perpanjang lisensi.'
                : derivedState === 'suspended'
                ? 'Lisensi sedang ditangguhkan oleh Administrator.'
                : 'Lisensi telah dicabut.',
            updatedAt: new Date().toISOString(),
          });
          return {
            tier: 'free',
            remainingCredits: 0,
            maxCredits: 0,
            deviceId: parsed.deviceId || deviceId,
            lastResetDate: today,
            lifecycleState: derivedState,
            expiresAt: parsed.expiresAt ?? null,
          };
        }

        if (isLicensed(parsed.tier)) {
          const activeDev = parsed.deviceId || deviceId;
          if (parsed.licenseKey && isValidLicenseCode(parsed.licenseKey, activeDev)) {
            return parsed;
          }
          // Jika kode lisensi sudah tidak valid, kembalikan ke pratinjau secara non-destruktif
          clearActiveLicenseEntitlementKeysOnly();
        } else {
          // Akun Free Uji Coba: tidak di-reset harian, mengacu pada kuota uji coba permanen
          const usedTrial = getTrialUsedCount(deviceId);
          const safeRemaining = Math.min(parsed.remainingCredits, Math.max(0, FREE_TRIAL_CREDITS - usedTrial));
          if (safeRemaining !== parsed.remainingCredits || parsed.maxCredits !== FREE_TRIAL_CREDITS) {
            const synced: UserQuota = {
              tier: 'free',
              remainingCredits: safeRemaining,
              maxCredits: FREE_TRIAL_CREDITS,
              deviceId: parsed.deviceId || deviceId,
              lastResetDate: today,
            };
            saveQuotaWithSignature(synced);
            return synced;
          }
          return parsed;
        }
      } else {
        // Signature tidak cocok (indikasi manipulasi localStorage atau kloning ke perangkat lain):
        const usedTrial = getTrialUsedCount(deviceId);
        const safeRemaining = Math.max(0, FREE_TRIAL_CREDITS - usedTrial);
        const tamperedFallback: UserQuota = {
          tier: 'free',
          remainingCredits: safeRemaining,
          maxCredits: FREE_TRIAL_CREDITS,
          deviceId,
          lastResetDate: today,
        };
        saveQuotaWithSignature(tamperedFallback);
        return tamperedFallback;
      }
    } catch {
      // fallback di bawah
    }
  }

  const usedTrial = getTrialUsedCount(deviceId);
  const initialQuota: UserQuota = {
    tier: 'free',
    remainingCredits: Math.max(0, FREE_TRIAL_CREDITS - usedTrial),
    maxCredits: FREE_TRIAL_CREDITS,
    deviceId,
    lastResetDate: today,
  };
  saveQuotaWithSignature(initialQuota);
  return initialQuota;
}

function saveQuotaWithSignature(quota: UserQuota): void {
  const sig = generateSignature(quota);
  safeSetItem(STORAGE_KEY_QUOTA, JSON.stringify(quota));
  safeSetItem(STORAGE_KEY_SIG, sig);
}

export type EntitledFeature =
  | 'preview_ui'
  | 'local_academic_crud'
  | 'export_document'
  | 'print_pdf'
  | 'ai_generate_standard'
  | 'ai_generate_pro'
  | 'cloud_sync';

export interface FeatureEntitlementMatrix {
  tier: LicenseTier;
  lifecycleState: LicenseLifecycleState | 'preview';
  isActivePaidLicense: boolean;
  features: Record<EntitledFeature, boolean>;
  reason?: string;
}

export function getFeatureEntitlements(quotaInput?: UserQuota): FeatureEntitlementMatrix {
  const quota = quotaInput || getUserQuota();
  const expired = isLicenseExpired(quota.expiresAt);
  const blockedState =
    expired ||
    quota.lifecycleState === 'expired' ||
    quota.lifecycleState === 'revoked' ||
    quota.lifecycleState === 'suspended' ||
    quota.lifecycleState === 'pending_payment' ||
    quota.lifecycleState === 'payment_failed';

  const activePaid = isLicensed(quota.tier) && !blockedState;
  const activeProAi = activePaid && isProAiTier(quota.tier);

  const lifecycleState: LicenseLifecycleState | 'preview' = expired
    ? 'expired'
    : quota.lifecycleState || (activePaid ? 'active' : 'preview');

  let reason: string | undefined;
  if (!activePaid) {
    if (lifecycleState === 'expired') {
      reason = 'Masa berlaku lisensi telah berakhir. Data akademik tetap aman; silakan perpanjang lisensi.';
    } else if (lifecycleState === 'revoked') {
      reason = 'Lisensi telah dicabut atau dinonaktifkan oleh Administrator.';
    } else if (lifecycleState === 'suspended') {
      reason = 'Lisensi sedang ditangguhkan sementara oleh Administrator.';
    } else if (lifecycleState === 'pending_payment') {
      reason = 'Pembayaran masih berstatus pending.';
    } else if (lifecycleState === 'payment_failed') {
      reason = 'Pembayaran sebelumnya gagal atau kedaluwarsa.';
    } else {
      reason = 'Mode Pratinjau: Aktifkan lisensi untuk menggunakan ekspor, AI, dan Cloud Sync.';
    }
  }

  return {
    tier: activePaid ? quota.tier : 'free',
    lifecycleState,
    isActivePaidLicense: activePaid,
    features: {
      preview_ui: true,
      local_academic_crud: true,
      export_document: activePaid,
      print_pdf: activePaid,
      ai_generate_standard: activePaid && quota.remainingCredits > 0,
      ai_generate_pro: activeProAi && quota.remainingCredits > 0,
      cloud_sync: activePaid,
    },
    ...(reason ? { reason } : {}),
  };
}

export function hasFeatureEntitlement(
  feature: EntitledFeature,
  quotaInput?: UserQuota
): { allowed: boolean; matrix: FeatureEntitlementMatrix; message?: string } {
  const matrix = getFeatureEntitlements(quotaInput);
  const allowed = Boolean(matrix.features[feature]);
  let message = matrix.reason;
  if (!allowed && feature === 'ai_generate_pro' && matrix.isActivePaidLicense) {
    message = 'Fitur AI PRO hanya tersedia untuk paket Guru PRO (GP26) atau Sekolah PRO (SP26).';
  }
  return { allowed, matrix, message };
}

export function deductQuota(): { success: boolean; quota: UserQuota; message?: string } {
  const current = getUserQuota();
  if (isLicensed(current.tier)) {
    if (isLicenseExpired(current.expiresAt) || current.lifecycleState === 'expired') {
      return {
        success: false,
        quota: current,
        message: 'Masa berlaku lisensi telah berakhir. Silakan lakukan perpanjangan (renewal) lisensi.',
      };
    }
    if (current.maxCredits > 0 && current.maxCredits < 999999) {
      if (current.remainingCredits <= 0) {
        return {
          success: false,
          quota: current,
          message: 'Kuota kredit AI untuk periode ini telah habis.',
        };
      }
      const next: UserQuota = {
        ...current,
        remainingCredits: current.remainingCredits - 1,
      };
      saveQuotaWithSignature(next);
      return { success: true, quota: next };
    }
    return { success: true, quota: current };
  }

  return {
    success: false,
    quota: current,
    message:
      'Mode Pratinjau: Silakan aktifkan Kode Lisensi Guru Mandiri atau Lisensi Sekolah terlebih dahulu untuk membuat dan mengunduh dokumen tanpa batas.',
  };
}

/**
 * Memeriksa apakah pengguna sudah mengaktifkan lisensi sebelum menjalankan aksi (misal Unduh Word / Cetak PDF).
 * Jika belum aktif, memicu event global agar aplikasi membuka Modal Aktivasi Lisensi.
 */
export function requireActiveLicenseForAction(
  actionLabel = 'membuat atau mengunduh dokumen'
): boolean {
  const current = getUserQuota();
  if (isLicensed(current.tier) && !isLicenseExpired(current.expiresAt)) {
    return true;
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('asesmerdeka:require-license', {
          detail: {
            message: `Mode Pratinjau: Silakan aktifkan Lisensi Guru Mandiri atau Lisensi Sekolah terlebih dahulu untuk ${actionLabel}.`,
          },
        })
      );
    } catch {
      // ignore in non-DOM test env
    }
  }
  return false;
}

/**
 * Refund Quota jika terjadi kegagalan jaringan atau error pada API Gemini
 */
export function refundQuota(amount = 1): UserQuota {
  const current = getUserQuota();
  const safeAmount = Math.max(1, Math.round(amount));
  if (isLicensed(current.tier) && current.maxCredits >= 999999) {
    return current;
  }
  if (current.maxCredits > 0 && current.remainingCredits < current.maxCredits) {
    const refunded: UserQuota = {
      ...current,
      remainingCredits: Math.min(current.maxCredits, current.remainingCredits + safeAmount),
    };
    saveQuotaWithSignature(refunded);
    return refunded;
  }
  return current;
}

export interface ActivateLicenseOptions {
  teacherPin?: string;
  expiresAt?: string | null;
  maxCredits?: number;
  initialCredits?: number;
}

export function activateLicense(
  licenseCode: string,
  optionsOrTeacherPin?: ActivateLicenseOptions | string
): {
  success: boolean;
  message: string;
  quota: UserQuota;
  usedSeats?: number;
  maxSeats?: number;
  teacherKey?: string;
  teacherUsedDevices?: number;
  teacherMaxDevices?: number;
} {
  const opts: ActivateLicenseOptions =
    typeof optionsOrTeacherPin === 'string'
      ? { teacherPin: optionsOrTeacherPin }
      : optionsOrTeacherPin || {};

  const cleanCode = normalizeLicenseCodeInput(licenseCode);
  const deviceId = getOrCreateDeviceId();

  if (opts.expiresAt && isLicenseExpired(opts.expiresAt)) {
    return {
      success: false,
      message: 'Masa berlaku kode lisensi ini sudah kedaluwarsa. Silakan lakukan perpanjangan (renewal).',
      quota: getUserQuota(),
    };
  }

  if (!isValidLicenseCode(cleanCode, deviceId)) {
    return {
      success: false,
      message:
        'Kode lisensi tidak valid atau terkunci untuk ID Perangkat lain. Pastikan Anda memasukkan kode lisensi resmi AsesMerdeka.',
      quota: getUserQuota(),
    };
  }

  // Periksa batas maksimal kursi perangkat / kursi guru (Seat Lock) agar kode tidak bisa dijual ulang
  const seatCheck = checkAndClaimLicenseSeat(cleanCode, deviceId, opts.teacherPin);
  if (!seatCheck.allowed) {
    return {
      success: false,
      message:
        seatCheck.message ||
        `Kode lisensi ini telah mencapai batas maksimal perangkat (${seatCheck.usedSeats}/${seatCheck.maxSeats} perangkat).`,
      quota: getUserQuota(),
      usedSeats: seatCheck.usedSeats,
      maxSeats: seatCheck.maxSeats,
      teacherKey: seatCheck.teacherKey,
      teacherUsedDevices: seatCheck.teacherUsedDevices,
      teacherMaxDevices: seatCheck.teacherMaxDevices,
    };
  }

  // Deteksi Tier Lisensi dari jenis kode (mendukung format Production & Staging ASM-STG2-*)
  const tierPlanPrefix = extractPlanPrefixFromLicenseCode(cleanCode);
  let targetTier: LicenseTier = 'guru';
  if (
    tierPlanPrefix === 'SP26' ||
    cleanCode.includes('SEKOLAH-PRO') ||
    cleanCode.includes('SCH-PRO')
  ) {
    targetTier = 'sekolah_pro';
  } else if (
    tierPlanPrefix === 'GP26' ||
    cleanCode.includes('PRO-AI') ||
    cleanCode.includes('PLUS') ||
    cleanCode.includes('GURU-PRO')
  ) {
    targetTier = 'pro';
  } else if (
    tierPlanPrefix === 'SK26' ||
    seatCheck.maxSeats > 5 ||
    cleanCode.includes('SEKOLAH') ||
    cleanCode.includes('SMAN') ||
    cleanCode.includes('SMPN') ||
    cleanCode.includes('SDN')
  ) {
    targetTier = 'sekolah';
  } else {
    targetTier = 'guru';
  }

  const maxCredits =
    typeof opts.maxCredits === 'number' && opts.maxCredits > 0 ? opts.maxCredits : 999999;
  const remainingCredits =
    typeof opts.initialCredits === 'number' && opts.initialCredits >= 0
      ? Math.min(maxCredits, opts.initialCredits)
      : maxCredits;

  const activeQuota: UserQuota = {
    tier: targetTier,
    remainingCredits,
    maxCredits,
    deviceId,
    licenseKey: cleanCode,
    lastResetDate: getTodayDateStr(),
    lifecycleState: 'active',
    ...(opts.expiresAt ? { expiresAt: opts.expiresAt } : {}),
    ...(seatCheck.teacherKey ? { teacherSeatKey: seatCheck.teacherKey } : {}),
  };
  saveLastLicenseStatusMetadata(null);
  saveQuotaWithSignature(activeQuota);

  const tierDisplayName = getTierDisplayName(targetTier);
  const seatSummary = seatCheck.teacherKey
    ? `Kursi Guru: ${seatCheck.usedSeats}/${seatCheck.maxSeats} • Perangkat Guru Ini: ${seatCheck.teacherUsedDevices}/${seatCheck.teacherMaxDevices}`
    : `Slot Perangkat: ${seatCheck.usedSeats}/${seatCheck.maxSeats}`;

  return {
    success: true,
    message: `Selamat! Lisensi ${tierDisplayName} berhasil diaktifkan dan dikunci pada perangkat ini (${seatSummary}).`,
    quota: activeQuota,
    usedSeats: seatCheck.usedSeats,
    maxSeats: seatCheck.maxSeats,
    teacherKey: seatCheck.teacherKey,
    teacherUsedDevices: seatCheck.teacherUsedDevices,
    teacherMaxDevices: seatCheck.teacherMaxDevices,
  };
}

/**
 * Menonaktifkan lisensi pada perangkat saat ini secara non-destruktif
 * (jika dicabut Admin, kedaluwarsa, atau melebihi batas kursi).
 * Data sekolah, siswa, presensi, jurnal, nilai, dan e-Rapor TETAP UTUH.
 */
export function revokeLicenseToPreviewMode(options?: {
  reason?: 'revoked' | 'expired' | 'suspended' | 'unbound';
  licenseKey?: string;
  expiresAt?: string | null;
  message?: string;
}): UserQuota {
  const deviceId = getOrCreateDeviceId();
  let previousKey = options?.licenseKey;
  if (!previousKey) {
    try {
      const prevRaw = localStorage.getItem(STORAGE_KEY_QUOTA);
      if (prevRaw) {
        previousKey = (JSON.parse(prevRaw) as UserQuota).licenseKey;
      }
    } catch {
      // ignore
    }
  }

  clearActiveLicenseEntitlementKeysOnly();

  if (options?.reason) {
    saveLastLicenseStatusMetadata({
      state: options.reason === 'unbound' ? 'paid' : options.reason,
      licenseKey: previousKey,
      expiresAt: options.expiresAt ?? null,
      message:
        options.message ||
        (options.reason === 'expired'
          ? 'Masa berlaku lisensi telah berakhir. Data akademik lokal Anda tetap utuh.'
          : options.reason === 'suspended'
          ? 'Lisensi sedang ditangguhkan oleh Administrator.'
          : 'Lisensi pada perangkat ini telah dinonaktifkan atau dilepas. Data akademik lokal Anda tetap utuh.'),
      updatedAt: new Date().toISOString(),
    });
  }

  const revoked: UserQuota = {
    tier: 'free',
    remainingCredits: 0,
    maxCredits: 0,
    deviceId,
    lastResetDate: getTodayDateStr(),
    ...(options?.reason && options.reason !== 'unbound'
      ? { lifecycleState: options.reason }
      : {}),
  };
  saveQuotaWithSignature(revoked);
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('asesmerdeka:license-revoked', {
          detail: { reason: options?.reason || 'revoked' },
        })
      );
    }
  } catch {
    // ignore
  }
  return revoked;
}

/**
 * Memvalidasi apakah lisensi aktif pada perangkat ini masih sah di server
 * (Mendeteksi jika lisensi dicabut, ditangguhkan, atau melewati masa berlaku).
 */
export async function verifyActiveLicenseWithServer(teacherPin?: string): Promise<{
  valid: boolean;
  revoked?: boolean;
  expired?: boolean;
  suspended?: boolean;
  teacherSeatDisabled?: boolean;
  unbound?: boolean;
  message?: string;
}> {
  const currentQuota = getUserQuota();
  if (!isLicensed(currentQuota.tier) || !currentQuota.licenseKey) {
    if (currentQuota.lifecycleState === 'expired') {
      return {
        valid: false,
        expired: true,
        message: 'Masa berlaku lisensi telah berakhir. Silakan perpanjang lisensi Anda.',
      };
    }
    return { valid: true };
  }

  const cleanCode = normalizeLicenseCodeInput(currentQuota.licenseKey);
  const activeDevice = currentQuota.deviceId || getOrCreateDeviceId();

  if (isLocallyRevokedLicense(cleanCode)) {
    revokeLicenseToPreviewMode({ reason: 'revoked', licenseKey: cleanCode });
    return {
      valid: false,
      revoked: true,
      message: 'Kode lisensi ini telah dicabut atau dinonaktifkan oleh Administrator.',
    };
  }

  if (isLicenseExpired(currentQuota.expiresAt)) {
    revokeLicenseToPreviewMode({
      reason: 'expired',
      licenseKey: cleanCode,
      expiresAt: currentQuota.expiresAt,
    });
    return {
      valid: false,
      expired: true,
      message: 'Masa berlaku lisensi telah berakhir. Data akademik Anda tetap aman tersimpan.',
    };
  }

  const resolvedPin = teacherPin || currentQuota.teacherSeatKey || '';

  try {
    const res = await fetch('/api/activate-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check_status',
        licenseCode: cleanCode,
        deviceId: activeDevice,
        ...(resolvedPin ? { teacherPin: resolvedPin } : {}),
      }),
    });

    const data = await res.json().catch(() => null);

    // Jika lisensi dicabut, kedaluwarsa, ditangguhkan, guru dinonaktifkan, atau kursi dilepas:
    if (
      res.status === 403 ||
      data?.revoked ||
      data?.expired ||
      data?.suspended ||
      data?.teacherSeatDisabled ||
      data?.unbound ||
      (res.ok && data?.valid === false)
    ) {
      const reason = data?.expired
        ? 'expired'
        : data?.suspended
        ? 'suspended'
        : data?.unbound
        ? 'unbound'
        : 'revoked';
      revokeLicenseToPreviewMode({
        reason,
        licenseKey: cleanCode,
        expiresAt: data?.expiresAt ?? currentQuota.expiresAt,
        message: data?.message,
      });
      return {
        valid: false,
        revoked: Boolean(data?.revoked),
        expired: Boolean(data?.expired),
        suspended: Boolean(data?.suspended),
        teacherSeatDisabled: Boolean(data?.teacherSeatDisabled),
        unbound: Boolean(data?.unbound),
        message:
          data?.message ||
          'Lisensi pada perangkat ini telah dinonaktifkan, kedaluwarsa, atau dihapus oleh Administrator.',
      };
    }

    return { valid: true };
  } catch {
    return { valid: true };
  }
}

export function getSavedGeminiKey(): string {
  const localKey = localStorage.getItem(STORAGE_KEY_API_KEY);
  if (localKey && localKey.trim().length > 0) {
    return localKey.trim();
  }
  return '';
}

export function saveGeminiKey(key: string): void {
  safeSetItem(STORAGE_KEY_API_KEY, key.trim());
}
