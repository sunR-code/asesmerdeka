import type { UserQuota, LicenseTier } from '../types/assessment';

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

export const FREE_TRIAL_CREDITS = 0;
export const DEFAULT_INDIVIDU_MAX_DEVICES = 2; // 1 Laptop + 1 HP Guru (tidak bisa dijual ulang ke banyak orang)
export const DEFAULT_SEKOLAH_MAX_DEVICES = 25; // Kuota 1 Sekolah (maksimal 25 Guru)
export const DEFAULT_MAYAR_PRODUCT_ID = 'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';
export const DEFAULT_MAYAR_SCHOOL_PRODUCT_ID = '17cece7f-e711-4fdc-af44-e6ceb4b4bff7';

// One-way 53-bit hash untuk verifikasi PIN Admin tanpa menyimpan PIN plaintext di dalam bundle klien
const EXPECTED_ADMIN_PIN_HASH = '2ID3PNQBIO';

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

// Integrity signature mencakup deviceId, hardwareFingerprint, tier, remainingCredits, maxCredits, dan licenseKey
export function generateSignature(quota: UserQuota): string {
  const hwFp = getHardwareFingerprint();
  const payload = `${quota.deviceId}:${hwFp}:${quota.tier}:${quota.remainingCredits}:${quota.maxCredits}:${quota.licenseKey || ''}:merdeka_salt_2026_v3`;
  return 'SIG-' + computeHash36(payload);
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

export function verifyAdminKeygenPin(inputPin: string): boolean {
  const cleanPin = inputPin.trim();
  if (!cleanPin) return false;
  const envPin = (import.meta as any).env?.VITE_ADMIN_PIN;
  if (typeof envPin === 'string' && envPin.trim().length >= 4) {
    return cleanPin === envPin.trim();
  }
  const hashedInput = computeHash36(`ADMIN_KEYGEN_V1:${cleanPin}:MERDEKA_SALT_2026`);
  return hashedInput === EXPECTED_ADMIN_PIN_HASH;
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

export function getMaxDevicesForLicenseCode(rawCode: string): number {
  const cleanCode = normalizeLicenseCodeInput(rawCode);

  // Jika kode lisensi berasal dari Mayar yang sudah diverifikasi (Individu = 2, Sekolah = 25)
  const mayarInfo = getMayarVerifiedCodeInfo(cleanCode);
  if (mayarInfo) {
    return mayarInfo.maxSeats;
  }

  const parts = cleanCode.split('-');

  // Format Terenkripsi Baru: ASM-<PREFIX>-<CIPHER1>-<CIPHER2>-<SIG>
  if (parts.length === 5 && parts[0] === 'ASM') {
    const prefix = parts[1];
    if (prefix === 'SL26') return 1;
    if (prefix === 'SK26' || prefix === 'SP26') return DEFAULT_SEKOLAH_MAX_DEVICES;
    if (prefix === 'GM26' || prefix === 'GP26') return getConfiguredIndividuMaxDevices();
  }

  // Format 3 segmen adalah kode kunci 1 perangkat (ASM-DV26-XXXXXX)
  if (parts.length === 3 && parts[0] === 'ASM' && parts[1] === 'DV26') {
    return 1;
  }

  return 1;
}

interface SeatRegistryMap {
  [licenseCode: string]: {
    devices: string[];
    maxDevices: number;
    updatedAt: string;
    sig: string;
  };
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

function computeSeatEntrySig(code: string, devices: string[], maxDevices: number): string {
  return computeHash36(`SEAT_LOCK:${code}:${devices.join(',')}:${maxDevices}:ASESMERDEKA_2026`);
}

/**
 * Mengecek dan mengklaim slot perangkat (Seat Lock) untuk kode lisensi agar tidak bisa dijual ulang.
 */
export function checkAndClaimLicenseSeat(
  rawCode: string,
  deviceId: string
): { allowed: boolean; usedSeats: number; maxSeats: number; message?: string } {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  const cleanDevice = deviceId.trim().toUpperCase();
  const maxSeats = getMaxDevicesForLicenseCode(cleanCode);

  const registry = getSeatRegistry();
  const existing = registry[cleanCode];

  let registeredDevices: string[] = [];
  if (existing && Array.isArray(existing.devices)) {
    const expectedSig = computeSeatEntrySig(cleanCode, existing.devices, existing.maxDevices);
    if (existing.sig === expectedSig) {
      registeredDevices = [...existing.devices];
    } else {
      // Jika catatan kursi perangkat dimanipulasi di DevTools, kunci penuh kursi kode tersebut
      return {
        allowed: false,
        usedSeats: maxSeats,
        maxSeats,
        message:
          'Terdeteksi manipulasi data kunci perangkat pada kode lisensi ini. Kode lisensi dikunci demi keamanan.',
      };
    }
  }

  // Jika perangkat ini sudah terdaftar pada kode ini, izinkan aktivasi ulang
  if (registeredDevices.includes(cleanDevice)) {
    return {
      allowed: true,
      usedSeats: registeredDevices.length,
      maxSeats,
    };
  }

  // Jika jumlah perangkat yang memakai kode ini sudah mencapai batas maksimal, tolak!
  if (registeredDevices.length >= maxSeats) {
    return {
      allowed: false,
      usedSeats: registeredDevices.length,
      maxSeats,
      message: `Aktivasi Ditolak! Kode lisensi ini telah mencapai batas maksimal perangkat (${registeredDevices.length}/${maxSeats} perangkat) dan telah terkunci pada perangkat pemilik pertama. Kode tidak dapat digunakan ulang atau diperjualbelikan ke perangkat lain.`,
    };
  }

  // Klaim slot perangkat baru
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

/**
 * Mengambil informasi pemakaian kursi perangkat untuk suatu kode lisensi
 */
export function getLicenseSeatStatus(rawCode: string): {
  devices: string[];
  usedSeats: number;
  maxSeats: number;
} {
  const cleanCode = rawCode.trim().toUpperCase();
  const maxSeats = getMaxDevicesForLicenseCode(cleanCode);
  const registry = getSeatRegistry();
  const existing = registry[cleanCode];
  if (!existing || !Array.isArray(existing.devices)) {
    return { devices: [], usedSeats: 0, maxSeats };
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
  deviceId?: string
): Promise<{
  valid: boolean;
  planType?: 'individu' | 'sekolah';
  usedSeats?: number;
  maxSeats?: number;
  seatLimitExceeded?: boolean;
  revoked?: boolean;
  message?: string;
}> {
  const cleanCode = normalizeLicenseCodeInput(rawCode);
  const activeDevice = (deviceId || getOrCreateDeviceId()).trim().toUpperCase();

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
      }),
    });

    const data = await response.json().catch(() => null);

    // Jika server menolak (dicabut/dihapus oleh Admin, atau kursi perangkat sudah penuh)
    if (response.status === 403 || data?.revoked || data?.seatLimitExceeded) {
      return {
        valid: false,
        revoked: Boolean(data?.revoked),
        seatLimitExceeded: Boolean(data?.seatLimitExceeded),
        usedSeats: data?.usedSeats,
        maxSeats: data?.maxSeats,
        message:
          data?.message ||
          'Kode lisensi ini tidak valid atau telah dinonaktifkan oleh Administrator.',
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

export function purgeDeviceFromLegacyLicense(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_QUOTA);
    localStorage.removeItem(STORAGE_KEY_SIG);
    localStorage.removeItem(STORAGE_KEY_SEAT_REGISTRY);
    localStorage.removeItem(STORAGE_KEY_VERIFIED_MAYAR_CODES);
    localStorage.removeItem('asesmerdeka_school_profile_v1');
    localStorage.removeItem('asesmerdeka_class_setup_confirmed_v1');
    localStorage.removeItem('asesmerdeka_cloud_last_sync_at_v1');
    localStorage.removeItem('asesmerdeka_cloud_teacher_pin_v1');
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

  // 2. Cek format terenkripsi baru: ASM-<PREFIX>-<CIPHER1>-<CIPHER2>-<SIG>
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

      // Jika perangkat ini sebelumnya mengaktifkan kode lama atau lisensi yang telah dihapus/dicabut oleh Admin,
      // bersihkan seluruh status lisensi & profil agar perangkat kembali ke Mode Pratinjau (Free)!
      if (
        parsed.licenseKey &&
        (isLegacyRevokedCode(parsed.licenseKey) || isLocallyRevokedLicense(parsed.licenseKey))
      ) {
        purgeDeviceFromLegacyLicense();
        const resetQuota: UserQuota = {
          tier: 'free',
          remainingCredits: 0,
          maxCredits: 0,
          deviceId,
          lastResetDate: today,
        };
        saveQuotaWithSignature(resetQuota);
        return resetQuota;
      }

      const expectedSig = generateSignature(parsed);

      // Wajib verifikasi integritas signature + hardware fingerprint terlebih dahulu
      if (storedSig === expectedSig) {
        if (isLicensed(parsed.tier)) {
          const activeDev = parsed.deviceId || deviceId;
          if (parsed.licenseKey && isValidLicenseCode(parsed.licenseKey, activeDev)) {
            return parsed;
          }
          // Jika kode lisensi sudah tidak valid, bersihkan perangkat kembali ke kosong
          purgeDeviceFromLegacyLicense();
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

export function deductQuota(): { success: boolean; quota: UserQuota; message?: string } {
  const current = getUserQuota();
  if (isLicensed(current.tier)) {
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
  if (isLicensed(current.tier)) {
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
export function refundQuota(): UserQuota {
  const current = getUserQuota();
  if (isLicensed(current.tier)) return current;
  return current;
}

export function activateLicense(licenseCode: string): {
  success: boolean;
  message: string;
  quota: UserQuota;
  usedSeats?: number;
  maxSeats?: number;
} {
  const cleanCode = normalizeLicenseCodeInput(licenseCode);
  const deviceId = getOrCreateDeviceId();

  if (!isValidLicenseCode(cleanCode, deviceId)) {
    return {
      success: false,
      message:
        'Kode lisensi tidak valid atau terkunci untuk ID Perangkat lain. Pastikan Anda memasukkan kode lisensi resmi AsesMerdeka.',
      quota: getUserQuota(),
    };
  }

  // Periksa batas maksimal kursi perangkat (Seat Lock) agar kode tidak bisa dijual ulang
  const seatCheck = checkAndClaimLicenseSeat(cleanCode, deviceId);
  if (!seatCheck.allowed) {
    return {
      success: false,
      message:
        seatCheck.message ||
        `Kode lisensi ini telah mencapai batas maksimal perangkat (${seatCheck.usedSeats}/${seatCheck.maxSeats} perangkat).`,
      quota: getUserQuota(),
      usedSeats: seatCheck.usedSeats,
      maxSeats: seatCheck.maxSeats,
    };
  }

  // Deteksi Tier Lisensi dari jenis kode
  let targetTier: LicenseTier = 'guru';
  if (
    cleanCode.startsWith('ASM-SP26-') ||
    cleanCode.includes('SEKOLAH-PRO') ||
    cleanCode.includes('SCH-PRO')
  ) {
    targetTier = 'sekolah_pro';
  } else if (
    cleanCode.startsWith('ASM-GP26-') ||
    cleanCode.includes('PRO-AI') ||
    cleanCode.includes('PLUS') ||
    cleanCode.includes('GURU-PRO')
  ) {
    targetTier = 'pro';
  } else if (
    cleanCode.startsWith('ASM-SK26-') ||
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

  const activeQuota: UserQuota = {
    tier: targetTier,
    remainingCredits: 999999,
    maxCredits: 999999,
    deviceId,
    licenseKey: cleanCode,
    lastResetDate: getTodayDateStr(),
  };
  saveQuotaWithSignature(activeQuota);

  const tierDisplayName = getTierDisplayName(targetTier);
  return {
    success: true,
    message: `Selamat! Lisensi ${tierDisplayName} Lifetime berhasil diaktifkan dan dikunci pada perangkat ini (Slot Perangkat: ${seatCheck.usedSeats}/${seatCheck.maxSeats}).`,
    quota: activeQuota,
    usedSeats: seatCheck.usedSeats,
    maxSeats: seatCheck.maxSeats,
  };
}

/**
 * Menonaktifkan lisensi pada perangkat saat ini jika server mendeteksi perangkat ini melebihi batas kursi (misal perangkat ke-3)
 */
export function revokeLicenseToPreviewMode(): UserQuota {
  const deviceId = getOrCreateDeviceId();
  purgeDeviceFromLegacyLicense();
  const revoked: UserQuota = {
    tier: 'free',
    remainingCredits: 0,
    maxCredits: 0,
    deviceId,
    lastResetDate: getTodayDateStr(),
  };
  saveQuotaWithSignature(revoked);
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('asesmerdeka:license-revoked'));
    }
  } catch {
    // ignore
  }
  return revoked;
}

/**
 * Memvalidasi apakah lisensi aktif pada perangkat ini masih sah di server
 * (Mendeteksi jika lisensi telah dihapus atau dicabut oleh Administrator).
 */
export async function verifyActiveLicenseWithServer(): Promise<{
  valid: boolean;
  revoked?: boolean;
  unbound?: boolean;
  message?: string;
}> {
  const currentQuota = getUserQuota();
  if (!isLicensed(currentQuota.tier) || !currentQuota.licenseKey) {
    return { valid: true };
  }

  const cleanCode = normalizeLicenseCodeInput(currentQuota.licenseKey);
  const activeDevice = currentQuota.deviceId || getOrCreateDeviceId();

  if (isLocallyRevokedLicense(cleanCode)) {
    revokeLicenseToPreviewMode();
    return {
      valid: false,
      revoked: true,
      message: 'Kode lisensi ini telah dicabut atau dinonaktifkan oleh Administrator.',
    };
  }

  try {
    const res = await fetch('/api/activate-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check_status',
        licenseCode: cleanCode,
        deviceId: activeDevice,
      }),
    });

    const data = await res.json().catch(() => null);

    // Jika lisensi dihapus/dicabut atau kursi dilepas oleh Administrator:
    if (res.status === 403 || data?.revoked || data?.unbound || (res.ok && data?.valid === false)) {
      revokeLicenseToPreviewMode();
      return {
        valid: false,
        revoked: Boolean(data?.revoked),
        unbound: Boolean(data?.unbound),
        message:
          data?.message ||
          'Lisensi pada perangkat ini telah dinonaktifkan atau dihapus oleh Administrator.',
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
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  return typeof envKey === 'string' ? envKey.trim() : '';
}

export function saveGeminiKey(key: string): void {
  safeSetItem(STORAGE_KEY_API_KEY, key.trim());
}
