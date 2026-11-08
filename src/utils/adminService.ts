/**
 * Layanan Klien Frontend untuk Portal Admin Terpusat (Admin Portal & License Manager)
 * Menangani komunikasi ke serverless API (/api/admin-portal)
 * dengan session management di sessionStorage dan fallback offline di localStorage.
 */

import type {
  AdminPlanType,
  AdminLicenseItem,
  AdminLicenseStatus,
  CreateLicensePayload,
} from '../types/admin';
import { ADMIN_PLAN_META } from '../types/admin';
import {
  computeSerialLicenseCode,
  verifyAdminKeygenPin,
  getLicenseSeatStatus,
  normalizeLicenseCodeInput,
} from './licenseManager';

export const STORAGE_KEY_ADMIN_SESSION_PIN = 'asesmerdeka_admin_session_pin_v1';
export const STORAGE_KEY_OFFLINE_ADMIN_LICENSES = 'asesmerdeka_offline_admin_licenses_v1';

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
 * Menyimpan PIN sesi Admin ke sessionStorage (dan in-memory fallback).
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
 * Mengambil lisensi yang tersimpan di localStorage (offline cache).
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
 * Menyimpan daftar lisensi ke localStorage (offline cache).
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

/**
 * Verifikasi PIN Admin untuk membuka Portal Admin.
 * Menghubungi /api/admin-portal dengan fallback offline via verifyAdminKeygenPin.
 */
export async function verifyAdminSession(
  pin: string
): Promise<{ ok: boolean; message: string }> {
  const cleanPin = (pin || '').trim();
  if (!cleanPin) {
    return { ok: false, message: 'PIN Admin wajib diisi.' };
  }

  try {
    const res = await fetch('/api/admin-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': cleanPin,
      },
      body: JSON.stringify({
        action: 'auth',
        adminPin: cleanPin,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      return { ok: true, message: data.message || 'Autentikasi Admin berhasil.' };
    }

    if (res.status === 403 || (data && data.ok === false)) {
      return {
        ok: false,
        message: data?.message || 'PIN Admin tidak valid atau tidak memiliki hak akses.',
      };
    }

    // Jika 404 (misal mode static vite dev tanpa backend) atau 500
    if (verifyAdminKeygenPin(cleanPin)) {
      return { ok: true, message: 'Autentikasi Admin berhasil (mode offline).' };
    }
    return { ok: false, message: 'PIN Admin tidak valid atau tidak memiliki hak akses.' };
  } catch {
    // Network failure / offline
    if (verifyAdminKeygenPin(cleanPin)) {
      return { ok: true, message: 'Autentikasi Admin berhasil (mode offline).' };
    }
    return { ok: false, message: 'PIN Admin tidak valid atau tidak memiliki hak akses.' };
  }
}

function fetchOfflineAdminLicenses(
  cleanPin: string
): { ok: boolean; licenses: AdminLicenseItem[]; message: string } {
  if (!verifyAdminKeygenPin(cleanPin)) {
    return {
      ok: false,
      licenses: [],
      message: 'PIN Admin tidak valid atau tidak memiliki hak akses.',
    };
  }

  const rawList = getStoredAdminLicenses();
  const enriched = rawList.map((item) => {
    const seatStatus = getLicenseSeatStatus(item.code);
    const devices = seatStatus.devices?.length ? seatStatus.devices : item.devices || [];
    const maxSeats = seatStatus.maxSeats || item.maxSeats || 1;
    const usedSeats = devices.length;
    const status: AdminLicenseStatus = usedSeats > 0 ? 'aktif' : 'belum_aktif';
    return {
      ...item,
      maxSeats,
      devices,
      usedSeats,
      status,
    };
  });

  return {
    ok: true,
    licenses: enriched,
    message: 'Daftar lisensi dimuat dari penyimpanan lokal (mode offline).',
  };
}

/**
 * Mengambil seluruh registri lisensi khusus dari server atau fallback lokal.
 */
export async function fetchAdminLicenses(
  pin: string
): Promise<{ ok: boolean; licenses: AdminLicenseItem[]; message?: string }> {
  const cleanPin = (pin || '').trim();
  if (!cleanPin) {
    return { ok: false, licenses: [], message: 'PIN Admin wajib diisi.' };
  }

  try {
    const res = await fetch('/api/admin-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': cleanPin,
      },
      body: JSON.stringify({
        action: 'list_licenses',
        adminPin: cleanPin,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok && Array.isArray(data.licenses)) {
      saveStoredAdminLicenses(data.licenses);
      return {
        ok: true,
        licenses: data.licenses,
        message: 'Daftar lisensi berhasil dimuat.',
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        licenses: [],
        message: data?.message || 'PIN Admin tidak valid atau tidak memiliki hak akses.',
      };
    }

    return fetchOfflineAdminLicenses(cleanPin);
  } catch {
    return fetchOfflineAdminLicenses(cleanPin);
  }
}

function createOfflineAdminLicense(
  cleanPin: string,
  payload: CreateLicensePayload
): { ok: boolean; created: AdminLicenseItem[]; message: string } {
  if (!verifyAdminKeygenPin(cleanPin)) {
    return {
      ok: false,
      created: [],
      message: 'PIN Admin tidak valid atau tidak memiliki hak akses.',
    };
  }

  const planType: AdminPlanType = payload.planType || 'individu';
  const label = (payload.label || '').trim() || 'Umum';
  const count = Math.max(1, Math.min(100, Number(payload.count) || 1));
  const meta = ADMIN_PLAN_META[planType] || ADMIN_PLAN_META.individu;
  const finalMaxSeats =
    payload.customMaxSeats && payload.customMaxSeats > 0
      ? Math.round(payload.customMaxSeats)
      : meta.defaultMaxSeats;

  let seedPrefix = 'GURU';
  if (planType === 'solo') seedPrefix = 'SOLO';
  else if (planType === 'sekolah') seedPrefix = 'SEKOLAH';
  else if (planType === 'pro') seedPrefix = 'PROAI';
  else if (planType === 'sekolah_pro') seedPrefix = 'SEKOLAHPRO';

  const nowIso = new Date().toISOString();
  const created: AdminLicenseItem[] = [];

  for (let i = 0; i < count; i++) {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const entropy = `${seedPrefix}${rand}${i}`;
    const code = computeSerialLicenseCode(entropy);

    const item: AdminLicenseItem = {
      code,
      label,
      planType,
      tier: meta.tier,
      maxSeats: finalMaxSeats,
      createdAt: nowIso,
      updatedAt: nowIso,
      usedSeats: 0,
      devices: [],
      status: 'belum_aktif',
    };
    created.push(item);
  }

  const existing = getStoredAdminLicenses();
  saveStoredAdminLicenses([...created, ...existing]);

  return {
    ok: true,
    created,
    message: 'Lisensi berhasil dibuat secara lokal (mode offline).',
  };
}

/**
 * Membuat satu atau batch lisensi baru untuk pemesan tertentu.
 */
export async function createAdminLicense(
  pin: string,
  payload: CreateLicensePayload
): Promise<{ ok: boolean; created: AdminLicenseItem[]; message?: string }> {
  const cleanPin = (pin || '').trim();
  if (!cleanPin) {
    return { ok: false, created: [], message: 'PIN Admin wajib diisi.' };
  }

  const planType = payload.planType || 'individu';
  const label = (payload.label || '').trim() || 'Umum';
  const count = Math.max(1, Math.min(100, Number(payload.count) || 1));
  const customMaxSeats =
    payload.customMaxSeats && payload.customMaxSeats > 0
      ? Math.round(payload.customMaxSeats)
      : undefined;

  try {
    const res = await fetch('/api/admin-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': cleanPin,
      },
      body: JSON.stringify({
        action: 'create_license',
        adminPin: cleanPin,
        planType,
        label,
        count,
        customMaxSeats,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok && Array.isArray(data.created)) {
      const existing = getStoredAdminLicenses();
      const updated = [
        ...data.created,
        ...existing.filter(
          (e) => !data.created.some((c: AdminLicenseItem) => c.code === e.code)
        ),
      ];
      saveStoredAdminLicenses(updated);
      return {
        ok: true,
        created: data.created,
        message: 'Lisensi berhasil dibuat.',
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        created: [],
        message: data?.message || 'PIN Admin tidak valid atau tidak memiliki hak akses.',
      };
    }

    return createOfflineAdminLicense(cleanPin, {
      planType,
      label,
      count,
      customMaxSeats,
    });
  } catch {
    return createOfflineAdminLicense(cleanPin, {
      planType,
      label,
      count,
      customMaxSeats,
    });
  }
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

function resetOfflineLicenseSeats(
  cleanPin: string,
  cleanCode: string
): { ok: boolean; message: string } {
  if (!verifyAdminKeygenPin(cleanPin)) {
    return {
      ok: false,
      message: 'PIN Admin tidak valid atau tidak memiliki hak akses.',
    };
  }

  resetLocalLicenseSeats(cleanCode);
  return {
    ok: true,
    message: 'Kunci perangkat berhasil di-reset (mode offline).',
  };
}

/**
 * Me-reset perangkat terkunci pada suatu kode lisensi (Device Unbind).
 */
export async function resetAdminLicenseSeats(
  pin: string,
  code: string
): Promise<{ ok: boolean; message: string }> {
  const cleanPin = (pin || '').trim();
  const cleanCode = normalizeLicenseCodeInput(code);

  if (!cleanPin) {
    return { ok: false, message: 'PIN Admin wajib diisi.' };
  }
  if (!cleanCode) {
    return { ok: false, message: 'Kode lisensi wajib diisi.' };
  }

  try {
    const res = await fetch('/api/admin-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': cleanPin,
      },
      body: JSON.stringify({
        action: 'reset_license_seats',
        adminPin: cleanPin,
        licenseCode: cleanCode,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      resetLocalLicenseSeats(cleanCode);
      return {
        ok: true,
        message: data.message || 'Kunci perangkat berhasil di-reset.',
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        message: data?.message || 'PIN Admin tidak valid atau tidak memiliki hak akses.',
      };
    }

    return resetOfflineLicenseSeats(cleanPin, cleanCode);
  } catch {
    return resetOfflineLicenseSeats(cleanPin, cleanCode);
  }
}

function deleteLocalLicense(cleanCode: string): void {
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

function deleteOfflineLicense(
  cleanPin: string,
  cleanCode: string
): { ok: boolean; message: string } {
  if (!verifyAdminKeygenPin(cleanPin)) {
    return {
      ok: false,
      message: 'PIN Admin tidak valid atau tidak memiliki hak akses.',
    };
  }

  deleteLocalLicense(cleanCode);
  return {
    ok: true,
    message: 'Lisensi berhasil dihapus (mode offline).',
  };
}

/**
 * Mencabut / menghapus kode lisensi dari registri.
 */
export async function deleteAdminLicense(
  pin: string,
  code: string
): Promise<{ ok: boolean; message: string }> {
  const cleanPin = (pin || '').trim();
  const cleanCode = normalizeLicenseCodeInput(code);

  if (!cleanPin) {
    return { ok: false, message: 'PIN Admin wajib diisi.' };
  }
  if (!cleanCode) {
    return { ok: false, message: 'Kode lisensi wajib diisi.' };
  }

  try {
    const res = await fetch('/api/admin-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': cleanPin,
      },
      body: JSON.stringify({
        action: 'delete_license',
        adminPin: cleanPin,
        licenseCode: cleanCode,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      deleteLocalLicense(cleanCode);
      return {
        ok: true,
        message: data.message || 'Lisensi berhasil dihapus.',
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        message: data?.message || 'PIN Admin tidak valid atau tidak memiliki hak akses.',
      };
    }

    return deleteOfflineLicense(cleanPin, cleanCode);
  } catch {
    return deleteOfflineLicense(cleanPin, cleanCode);
  }
}
