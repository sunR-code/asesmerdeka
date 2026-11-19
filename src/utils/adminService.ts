/**
 * Layanan Klien Frontend untuk Portal Admin Terpusat (Admin Portal & License Manager)
 * Menangani komunikasi ke serverless API (/api/admin-portal) dengan model fail-closed:
 * - Seluruh autentikasi dan aksi administratif diverifikasi eksklusif oleh server.
 * - Kegagalan jaringan, timeout, atau error 5xx tidak pernah membuka akses Admin lokal.
 */

import type {
  AdminLicenseItem,
  CreateLicensePayload,
} from '../types/admin';
import {
  normalizeLicenseCodeInput,
  revokeLicenseToPreviewMode,
  manageLocalSchoolTeacherSeat,
} from './licenseManager';

export const STORAGE_KEY_ADMIN_SESSION_PIN = 'asesmerdeka_admin_session_pin_v1';
export const STORAGE_KEY_OFFLINE_ADMIN_LICENSES = 'asesmerdeka_offline_admin_licenses_v1';
export const STORAGE_KEY_DELETED_LICENSES = 'asesmerdeka_deleted_licenses_v1';
export const DEFAULT_ADMIN_API_TIMEOUT_MS = 12000;

export type AdminApiErrorKind =
  | 'unauthorized'
  | 'rate_limited'
  | 'service_unavailable'
  | 'timeout'
  | 'network'
  | 'request_failed';

export interface AdminRequestOptions {
  timeoutMs?: number;
}

let inMemorySessionPin = '';
const inMemoryLicensesStore: AdminLicenseItem[] = [];

function getSessionStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) {
    return globalThis.sessionStorage;
  }
  return null;
}

function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

/**
 * Menyimpan PIN sesi Admin terautentikasi ke sessionStorage (dan in-memory fallback).
 * Saat browser/tab ditutup, sesi akan otomatis terkunci.
 */
export function saveAdminSessionPin(pin: string): void {
  const clean = (pin || '').trim();
  inMemorySessionPin = clean;
  try {
    const storage = getSessionStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY_ADMIN_SESSION_PIN, clean);
    }
  } catch {
    // ignore
  }
}

/**
 * Mengambil PIN sesi Admin aktif dari sessionStorage atau in-memory fallback.
 */
export function getAdminSessionPin(): string {
  try {
    const storage = getSessionStorage();
    if (storage) {
      const stored = storage.getItem(STORAGE_KEY_ADMIN_SESSION_PIN);
      if (stored) return stored;
    }
  } catch {
    // ignore
  }
  return inMemorySessionPin;
}

/**
 * Menghapus PIN sesi Admin saat pengguna menekan tombol Kunci Portal atau logout.
 */
export function clearAdminSessionPin(): void {
  inMemorySessionPin = '';
  try {
    const storage = getSessionStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEY_ADMIN_SESSION_PIN);
    }
  } catch {
    // ignore
  }
}

/**
 * Mengambil cache tampilan daftar lisensi terakhir dari localStorage.
 * Tidak pernah dipakai sebagai otoritas akses atau melewati server.
 */
export function getStoredAdminLicenses(): AdminLicenseItem[] {
  try {
    const storage = getLocalStorage();
    if (!storage) return [...inMemoryLicensesStore];
    const raw = storage.getItem(STORAGE_KEY_OFFLINE_ADMIN_LICENSES);
    if (!raw) return [...inMemoryLicensesStore];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminLicenseItem[]) : [];
  } catch {
    return [...inMemoryLicensesStore];
  }
}

/**
 * Menyimpan snapshot cache daftar lisensi terverifikasi server ke localStorage.
 */
export function saveStoredAdminLicenses(licenses: AdminLicenseItem[]): void {
  inMemoryLicensesStore.length = 0;
  inMemoryLicensesStore.push(...licenses);
  try {
    const storage = getLocalStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY_OFFLINE_ADMIN_LICENSES, JSON.stringify(licenses));
    }
  } catch {
    // ignore
  }
}

/**
 * Menghapus cache lisensi admin lokal.
 */
export function clearStoredAdminLicenses(): void {
  inMemoryLicensesStore.length = 0;
  try {
    const storage = getLocalStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEY_OFFLINE_ADMIN_LICENSES);
    }
  } catch {
    // ignore
  }
}

type PostAdminPortalResult<T> =
  | { ok: true; status: number; data: T }
  | {
      ok: false;
      status: number;
      errorKind: AdminApiErrorKind;
      rateLimited?: boolean;
      retryAfterSeconds?: number;
      message: string;
    };

/**
 * Helper terpusat untuk memanggil /api/admin-portal secara fail-closed.
 */
async function postAdminPortal<T extends { ok?: boolean; message?: string }>(
  cleanPin: string,
  body: Record<string, unknown>,
  options: AdminRequestOptions = {}
): Promise<PostAdminPortalResult<T>> {
  const timeoutMs =
    typeof options.timeoutMs === 'number' && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_ADMIN_API_TIMEOUT_MS;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let didTimeout = false;
  const timer = controller
    ? setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeoutMs)
    : null;

  try {
    const res = await fetch('/api/admin-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': cleanPin,
      },
      ...(controller ? { signal: controller.signal } : {}),
      body: JSON.stringify({
        ...body,
        adminPin: cleanPin,
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | (T & { retryAfterSeconds?: number; rateLimited?: boolean })
      | null;

    if (res.ok && data?.ok) {
      return { ok: true, status: res.status, data };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        status: res.status,
        errorKind: 'unauthorized',
        message: data?.message || 'Autentikasi Admin tidak valid atau tidak memiliki hak akses.',
      };
    }

    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        errorKind: 'rate_limited',
        rateLimited: true,
        retryAfterSeconds: data?.retryAfterSeconds,
        message:
          data?.message ||
          'Terlalu banyak percobaan autentikasi Admin yang gagal. Silakan tunggu beberapa saat sebelum mencoba lagi.',
      };
    }

    if (res.status >= 500) {
      return {
        ok: false,
        status: res.status,
        errorKind: 'service_unavailable',
        message: 'Layanan Admin sementara tidak tersedia. Silakan coba lagi beberapa saat lagi.',
      };
    }

    return {
      ok: false,
      status: res.status,
      errorKind: 'request_failed',
      message: data?.message || 'Permintaan layanan Admin tidak dapat diproses oleh server.',
    };
  } catch (err) {
    const isAbort = didTimeout || (err instanceof Error && err.name === 'AbortError');
    if (isAbort) {
      return {
        ok: false,
        status: 0,
        errorKind: 'timeout',
        message: 'Koneksi ke server Admin melebihi batas waktu (timeout). Silakan coba lagi.',
      };
    }
    return {
      ok: false,
      status: 0,
      errorKind: 'network',
      message:
        'Koneksi ke server Admin tidak tersedia. Silakan periksa jaringan Anda dan coba lagi.',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Verifikasi PIN Admin secara eksklusif ke server (/api/admin-portal).
 * Fail-closed: kegagalan jaringan, timeout, maupun error server tidak pernah membuka akses Admin.
 */
export async function verifyAdminSession(
  pin: string,
  options?: AdminRequestOptions
): Promise<{
  ok: boolean;
  status?: number;
  errorKind?: AdminApiErrorKind;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  message: string;
}> {
  const cleanPin = (pin || '').trim();
  if (!cleanPin) {
    return { ok: false, errorKind: 'unauthorized', message: 'PIN Admin wajib diisi.' };
  }

  const res = await postAdminPortal<{ ok: boolean; message?: string }>(
    cleanPin,
    { action: 'auth' },
    options
  );

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      message: res.data.message || 'Autentikasi Admin berhasil.',
    };
  }

  return {
    ok: false,
    status: res.status,
    errorKind: res.errorKind,
    ...(res.rateLimited ? { rateLimited: true } : {}),
    ...(res.retryAfterSeconds !== undefined ? { retryAfterSeconds: res.retryAfterSeconds } : {}),
    message: res.message,
  };
}

/**
 * Mengambil seluruh registri lisensi resmi dari server (/api/admin-portal).
 * Fail-closed: tidak mengembalikan daftar lokal jika otorisasi/koneksi server gagal.
 */
export async function fetchAdminLicenses(
  pin: string,
  options?: AdminRequestOptions
): Promise<{
  ok: boolean;
  licenses: AdminLicenseItem[];
  errorKind?: AdminApiErrorKind;
  message?: string;
}> {
  const cleanPin = (pin || '').trim();
  if (!cleanPin) {
    return { ok: false, licenses: [], errorKind: 'unauthorized', message: 'PIN Admin wajib diisi.' };
  }

  const res = await postAdminPortal<{ ok: boolean; licenses?: AdminLicenseItem[]; message?: string }>(
    cleanPin,
    { action: 'list_licenses' },
    options
  );

  if (res.ok && Array.isArray(res.data.licenses)) {
    saveStoredAdminLicenses(res.data.licenses);
    return {
      ok: true,
      licenses: res.data.licenses,
      message: 'Daftar lisensi berhasil dimuat.',
    };
  }

  if (res.ok) {
    return {
      ok: false,
      licenses: [],
      errorKind: 'request_failed',
      message: 'Format data registri lisensi dari server tidak valid.',
    };
  }

  return {
    ok: false,
    licenses: [],
    errorKind: res.errorKind,
    message: res.message,
  };
}

/**
 * Membuat satu atau batch lisensi baru melalui otoritas server (/api/admin-portal).
 */
export async function createAdminLicense(
  pin: string,
  payload: CreateLicensePayload,
  options?: AdminRequestOptions
): Promise<{
  ok: boolean;
  created: AdminLicenseItem[];
  errorKind?: AdminApiErrorKind;
  message?: string;
}> {
  const cleanPin = (pin || '').trim();
  if (!cleanPin) {
    return { ok: false, created: [], errorKind: 'unauthorized', message: 'PIN Admin wajib diisi.' };
  }

  const planType = payload.planType || 'individu';
  const label = (payload.label || '').trim() || 'Umum';
  const count = Math.max(1, Math.min(100, Number(payload.count) || 1));
  const customMaxSeats =
    payload.customMaxSeats && payload.customMaxSeats > 0
      ? Math.round(payload.customMaxSeats)
      : undefined;

  const res = await postAdminPortal<{ ok: boolean; created?: AdminLicenseItem[]; message?: string }>(
    cleanPin,
    {
      action: 'create_license',
      planType,
      label,
      count,
      customMaxSeats,
    },
    options
  );

  if (res.ok && Array.isArray(res.data.created)) {
    const existing = getStoredAdminLicenses();
    const updated = [
      ...res.data.created,
      ...existing.filter((e) => !res.data.created!.some((c) => c.code === e.code)),
    ];
    saveStoredAdminLicenses(updated);
    return {
      ok: true,
      created: res.data.created,
      message: 'Lisensi berhasil dibuat.',
    };
  }

  if (res.ok) {
    return {
      ok: false,
      created: [],
      errorKind: 'request_failed',
      message: 'Server gagal mengembalikan daftar lisensi yang dibuat.',
    };
  }

  return {
    ok: false,
    created: [],
    errorKind: res.errorKind,
    message: res.message,
  };
}

function resetLocalLicenseSeats(cleanCode: string): void {
  const list = getStoredAdminLicenses();
  const item = list.find((l) => l.code === cleanCode);
  if (item) {
    item.devices = [];
    item.usedSeats = 0;
    item.status = 'belum_aktif';
    item.updatedAt = new Date().toISOString();
    saveStoredAdminLicenses(list);
  }

  try {
    const storage = getLocalStorage();
    if (storage) {
      const rawSeats = storage.getItem('asesmerdeka_license_seats_v1');
      if (rawSeats) {
        const parsed = JSON.parse(rawSeats);
        if (parsed && typeof parsed === 'object' && parsed[cleanCode]) {
          delete parsed[cleanCode];
          storage.setItem('asesmerdeka_license_seats_v1', JSON.stringify(parsed));
        }
      }
    }
  } catch {
    // ignore
  }
}

function maybeRevokeActiveLocalLicense(cleanCode: string, reason: 'unbound' | 'revoked'): void {
  try {
    const storage = getLocalStorage();
    const rawQuota = storage?.getItem('asesmerdeka_user_quota');
    if (rawQuota) {
      const quota = JSON.parse(rawQuota);
      if (normalizeLicenseCodeInput(quota?.licenseKey || '') === cleanCode) {
        revokeLicenseToPreviewMode({ reason, licenseKey: cleanCode });
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Me-reset perangkat terkunci pada suatu kode lisensi melalui otoritas server.
 */
export async function resetAdminLicenseSeats(
  pin: string,
  code: string,
  options?: AdminRequestOptions
): Promise<{ ok: boolean; errorKind?: AdminApiErrorKind; message: string }> {
  const cleanPin = (pin || '').trim();
  const cleanCode = normalizeLicenseCodeInput(code);

  if (!cleanPin) {
    return { ok: false, errorKind: 'unauthorized', message: 'PIN Admin wajib diisi.' };
  }
  if (!cleanCode) {
    return { ok: false, errorKind: 'request_failed', message: 'Kode lisensi wajib diisi.' };
  }

  const res = await postAdminPortal<{ ok: boolean; message?: string }>(
    cleanPin,
    {
      action: 'reset_license_seats',
      licenseCode: cleanCode,
    },
    options
  );

  if (res.ok) {
    maybeRevokeActiveLocalLicense(cleanCode, 'unbound');
    resetLocalLicenseSeats(cleanCode);
    return {
      ok: true,
      message: res.data.message || 'Kunci perangkat berhasil di-reset.',
    };
  }

  return {
    ok: false,
    errorKind: res.errorKind,
    message: res.message,
  };
}

function deleteLocalLicenseCache(cleanCode: string): void {
  const list = getStoredAdminLicenses();
  const next = list.filter((l) => l.code !== cleanCode);
  saveStoredAdminLicenses(next);

  try {
    const storage = getLocalStorage();
    if (storage) {
      const rawSeats = storage.getItem('asesmerdeka_license_seats_v1');
      if (rawSeats) {
        const parsed = JSON.parse(rawSeats);
        if (parsed && typeof parsed === 'object' && parsed[cleanCode]) {
          delete parsed[cleanCode];
          storage.setItem('asesmerdeka_license_seats_v1', JSON.stringify(parsed));
        }
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Mencabut / menghapus kode lisensi dari registri melalui otoritas server.
 */
export async function deleteAdminLicense(
  pin: string,
  code: string,
  options?: AdminRequestOptions
): Promise<{ ok: boolean; errorKind?: AdminApiErrorKind; message: string }> {
  const cleanPin = (pin || '').trim();
  const cleanCode = normalizeLicenseCodeInput(code);

  if (!cleanPin) {
    return { ok: false, errorKind: 'unauthorized', message: 'PIN Admin wajib diisi.' };
  }
  if (!cleanCode) {
    return { ok: false, errorKind: 'request_failed', message: 'Kode lisensi wajib diisi.' };
  }

  const res = await postAdminPortal<{ ok: boolean; message?: string }>(
    cleanPin,
    {
      action: 'delete_license',
      licenseCode: cleanCode,
    },
    options
  );

  if (res.ok) {
    maybeRevokeActiveLocalLicense(cleanCode, 'revoked');
    deleteLocalLicenseCache(cleanCode);
    return {
      ok: true,
      message: res.data.message || 'Lisensi berhasil dihapus.',
    };
  }

  return {
    ok: false,
    errorKind: res.errorKind,
    message: res.message,
  };
}

/**
 * Mengelola kursi guru pada Lisensi Kolektif Sekolah melalui otoritas server.
 */
export async function manageSchoolTeacherSeatAdmin(
  pin: string,
  code: string,
  teacherKey: string,
  seatAction: 'disable' | 'enable' | 'reset_devices',
  options?: AdminRequestOptions
): Promise<{
  ok: boolean;
  usedSeats?: number;
  maxSeats?: number;
  errorKind?: AdminApiErrorKind;
  message: string;
}> {
  const cleanPin = (pin || '').trim();
  const cleanCode = normalizeLicenseCodeInput(code);
  const cleanTeacher = (teacherKey || '').trim();

  if (!cleanPin) {
    return { ok: false, errorKind: 'unauthorized', message: 'PIN Admin wajib diisi.' };
  }
  if (!cleanCode || !cleanTeacher) {
    return {
      ok: false,
      errorKind: 'request_failed',
      message: 'Kode lisensi dan identitas guru wajib diisi.',
    };
  }

  const serverAction =
    seatAction === 'disable'
      ? 'disable_teacher_seat'
      : seatAction === 'enable'
      ? 'enable_teacher_seat'
      : 'reset_teacher_devices';

  const res = await postAdminPortal<{
    ok: boolean;
    usedSeats?: number;
    maxSeats?: number;
    message?: string;
  }>(
    cleanPin,
    {
      action: serverAction,
      licenseCode: cleanCode,
      teacherKey: cleanTeacher,
    },
    options
  );

  if (res.ok) {
    manageLocalSchoolTeacherSeat(cleanCode, cleanTeacher, seatAction);
    return {
      ok: true,
      usedSeats: res.data.usedSeats,
      maxSeats: res.data.maxSeats,
      message: res.data.message || 'Status kursi guru berhasil diperbarui.',
    };
  }

  return {
    ok: false,
    errorKind: res.errorKind,
    message: res.message,
  };
}

/**
 * Memperpanjang masa aktif lisensi melalui otoritas server.
 */
export async function renewAdminLicense(
  pin: string,
  code: string,
  expiresAt?: string,
  options?: AdminRequestOptions
): Promise<{ ok: boolean; expiresAt?: string; errorKind?: AdminApiErrorKind; message: string }> {
  const cleanPin = (pin || '').trim();
  const cleanCode = normalizeLicenseCodeInput(code);
  if (!cleanPin) {
    return { ok: false, errorKind: 'unauthorized', message: 'PIN Admin wajib diisi.' };
  }
  if (!cleanCode) {
    return { ok: false, errorKind: 'request_failed', message: 'Kode lisensi wajib diisi.' };
  }

  const targetExpiry =
    expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const res = await postAdminPortal<{ ok: boolean; expiresAt?: string; message?: string }>(
    cleanPin,
    {
      action: 'renew_license',
      licenseCode: cleanCode,
      expiresAt: targetExpiry,
    },
    options
  );

  if (res.ok) {
    const list = getStoredAdminLicenses();
    const item = list.find((l) => l.code === cleanCode);
    if (item) {
      item.expiresAt = res.data.expiresAt || targetExpiry;
      item.renewedAt = new Date().toISOString();
      item.lifecycleState = item.usedSeats > 0 ? 'active' : 'paid';
      saveStoredAdminLicenses(list);
    }
    return {
      ok: true,
      expiresAt: res.data.expiresAt || targetExpiry,
      message: res.data.message || 'Masa berlaku lisensi berhasil diperpanjang.',
    };
  }

  return {
    ok: false,
    errorKind: res.errorKind,
    message: res.message,
  };
}
