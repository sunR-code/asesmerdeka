import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
}
if (typeof globalThis.sessionStorage === 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
}
if (typeof (globalThis as { addEventListener?: unknown }).addEventListener !== 'function') {
  Object.defineProperty(globalThis, 'addEventListener', {
    value: () => {},
    configurable: true,
  });
}
if (typeof (globalThis as { removeEventListener?: unknown }).removeEventListener !== 'function') {
  Object.defineProperty(globalThis, 'removeEventListener', {
    value: () => {},
    configurable: true,
  });
}
if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    configurable: true,
  });
}

import { AdminPortal } from '../../components/admin/AdminPortal';
import {
  clearAdminSessionPin,
  createAdminLicense,
  deleteAdminLicense,
  fetchAdminLicenses,
  getAdminSessionPin,
  manageSchoolTeacherSeatAdmin,
  renewAdminLicense,
  resetAdminLicenseSeats,
  saveAdminSessionPin,
  saveStoredAdminLicenses,
  verifyAdminSession,
} from '../adminService';
import {
  addOfflineFeedbackReport,
  fetchFeedbackReports,
} from '../feedbackService';
import * as licenseManagerModule from '../licenseManager';
import {
  activateLicense,
  computeLicenseCodeForDevice,
  computeSerialLicenseCode,
  generateSchoolBatchLicenses,
  getUserQuota,
  isLicensed,
  isProAiTier,
  isValidLicenseCode,
} from '../licenseManager';

// @ts-expect-error serverless JS handler tested directly
import adminPortalHandler, { clearAdminPortalRateLimitStore } from '../../../api/admin-portal.js';
// @ts-expect-error serverless JS handler tested directly
import feedbackReportsHandler from '../../../api/feedback-reports.js';

const SYNTHETIC_SERVER_PIN = 'TEST-SERVER-ONLY-PIN-102';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    setHeader(name: string, val: string) {
      this.headers[name.toLowerCase()] = val;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

describe('Task 10.2 — Admin Portal Authentication Hardening (Fail-Closed Server Authority)', () => {
  const originalFetch = globalThis.fetch;
  const originalEnvAdminPin = process.env.ADMIN_PIN;

  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
    clearAdminSessionPin();
    clearAdminPortalRateLimitStore();
    process.env.ADMIN_PIN = SYNTHETIC_SERVER_PIN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    if (originalEnvAdminPin === undefined) {
      delete process.env.ADMIN_PIN;
    } else {
      process.env.ADMIN_PIN = originalEnvAdminPin;
    }
    clearAdminSessionPin();
  });

  it('1. Login PIN benar ketika server normal (/api/admin-portal HTTP 200) -> berhasil', async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const hdrs = (init?.headers || {}) as Record<string, string>;
      const res = createMockRes();
      await adminPortalHandler(
        { method: 'POST', headers: hdrs, body, socket: { remoteAddress: '10.20.1.1' } },
        res
      );
      return {
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        json: async () => res.body,
      } as Response;
    });

    const authRes = await verifyAdminSession(SYNTHETIC_SERVER_PIN);
    expect(authRes.ok).toBe(true);
    expect(authRes.status).toBe(200);
  });

  it('2. PIN salah -> HTTP 403, ok=false, errorKind=unauthorized, dan tidak membuat sesi', async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const hdrs = (init?.headers || {}) as Record<string, string>;
      const res = createMockRes();
      await adminPortalHandler(
        { method: 'POST', headers: hdrs, body, socket: { remoteAddress: '10.20.1.2' } },
        res
      );
      return {
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        json: async () => res.body,
      } as Response;
    });

    const authRes = await verifyAdminSession('WRONG-PIN-0000');
    expect(authRes.ok).toBe(false);
    expect(authRes.status).toBe(403);
    expect(authRes.errorKind).toBe('unauthorized');
    expect(getAdminSessionPin()).toBe('');
  });

  it('3. API HTTP 429 -> ditolak, rateLimited=true, menampilkan pesan terlalu banyak percobaan', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({
        ok: false,
        rateLimited: true,
        retryAfterSeconds: 900,
        message: 'Terlalu banyak percobaan PIN Admin yang gagal. Coba lagi dalam 900 detik.',
      }),
    }) as Response);

    const authRes = await verifyAdminSession(SYNTHETIC_SERVER_PIN);
    expect(authRes.ok).toBe(false);
    expect(authRes.status).toBe(429);
    expect(authRes.errorKind).toBe('rate_limited');
    expect(authRes.rateLimited).toBe(true);
    expect(authRes.message.toLowerCase()).toContain('terlalu banyak percobaan');
  });

  it('4. API HTTP 500 -> fail-closed, tidak membuka Admin Portal maupun mengembalikan cache lokal', async () => {
    saveStoredAdminLicenses([
      {
        code: 'ASM-GM26-CACHED-0001-XXXX',
        label: 'Cache Lokal',
        planType: 'individu',
        tier: 'guru',
        maxSeats: 2,
        createdAt: '2026-11-01T00:00:00.000Z',
        usedSeats: 0,
        devices: [],
        status: 'belum_aktif',
      },
    ]);

    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, message: 'Internal Server Error' }),
    }) as Response);

    const authRes = await verifyAdminSession(SYNTHETIC_SERVER_PIN);
    expect(authRes.ok).toBe(false);
    expect(authRes.status).toBe(500);
    expect(authRes.errorKind).toBe('service_unavailable');
    expect(authRes.message).toContain('Layanan Admin sementara tidak tersedia');
    expect(getAdminSessionPin()).toBe('');

    const listRes = await fetchAdminLicenses(SYNTHETIC_SERVER_PIN);
    expect(listRes.ok).toBe(false);
    expect(listRes.errorKind).toBe('service_unavailable');
    expect(listRes.licenses).toEqual([]);
  });

  it('5. API HTTP 503 -> fail-closed untuk autentikasi & seluruh aksi admin mutasi', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ ok: false, message: 'Redis Unavailable' }),
    }) as Response);

    const authRes = await verifyAdminSession(SYNTHETIC_SERVER_PIN);
    expect(authRes.ok).toBe(false);
    expect(authRes.errorKind).toBe('service_unavailable');

    const createRes = await createAdminLicense(SYNTHETIC_SERVER_PIN, {
      planType: 'individu',
      label: 'Test Outage',
    });
    expect(createRes.ok).toBe(false);
    expect(createRes.created).toEqual([]);
    expect(createRes.errorKind).toBe('service_unavailable');

    const resetRes = await resetAdminLicenseSeats(SYNTHETIC_SERVER_PIN, 'ASM-GM26-AAAA-BBBB-CCCC');
    expect(resetRes.ok).toBe(false);
    expect(resetRes.errorKind).toBe('service_unavailable');

    const delRes = await deleteAdminLicense(SYNTHETIC_SERVER_PIN, 'ASM-GM26-AAAA-BBBB-CCCC');
    expect(delRes.ok).toBe(false);
    expect(delRes.errorKind).toBe('service_unavailable');

    const seatRes = await manageSchoolTeacherSeatAdmin(
      SYNTHETIC_SERVER_PIN,
      'ASM-SK26-AAAA-BBBB-CCCC',
      'GURU1',
      'disable'
    );
    expect(seatRes.ok).toBe(false);
    expect(seatRes.errorKind).toBe('service_unavailable');

    const renewRes = await renewAdminLicense(SYNTHETIC_SERVER_PIN, 'ASM-GM26-AAAA-BBBB-CCCC');
    expect(renewRes.ok).toBe(false);
    expect(renewRes.errorKind).toBe('service_unavailable');
  });

  it('6. Network error -> fail-closed di adminService & inbox fetchFeedbackReports (tanpa fallback akses admin)', async () => {
    // Tambahkan laporan offline lokal untuk memastikan admin inbox tidak terbuka saat network gagal
    addOfflineFeedbackReport({
      category: 'bug_error',
      description: 'Antrean lokal guru',
      contact: '',
      context: {
        activeTab: 'tp_list',
        jenjang: 'SD',
        kelas: '4',
        mapel: 'Matematika',
        deviceId: 'DEV-LOCAL-1',
        isPro: false,
      },
    });

    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    const authRes = await verifyAdminSession(SYNTHETIC_SERVER_PIN);
    expect(authRes.ok).toBe(false);
    expect(authRes.errorKind).toBe('network');
    expect(authRes.message).toContain('Koneksi ke server Admin tidak tersedia');

    const listRes = await fetchAdminLicenses(SYNTHETIC_SERVER_PIN);
    expect(listRes.ok).toBe(false);
    expect(listRes.errorKind).toBe('network');
    expect(listRes.licenses).toEqual([]);

    const inboxRes = await fetchFeedbackReports(SYNTHETIC_SERVER_PIN);
    expect(inboxRes.ok).toBe(false);
    expect(inboxRes.reports).toEqual([]);
  });

  it('7. Timeout -> AbortController memutus permintaan gantung dan mengembalikan fail-closed timeout', async () => {
    globalThis.fetch = vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (signal) {
            signal.addEventListener('abort', () => {
              const abortErr = new Error('The operation was aborted.');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          }
        })
    );

    const authRes = await verifyAdminSession(SYNTHETIC_SERVER_PIN, { timeoutMs: 25 });
    expect(authRes.ok).toBe(false);
    expect(authRes.errorKind).toBe('timeout');
    expect(authRes.message.toLowerCase()).toContain('timeout');
    expect(getAdminSessionPin()).toBe('');
  });

  it('8 & 9. Logout membersihkan sesi & refresh AdminPortal selalu memverifikasi ulang sesi secara fail-closed', () => {
    saveAdminSessionPin('TEMP-SESSION-TOKEN');
    expect(getAdminSessionPin()).toBe('TEMP-SESSION-TOKEN');

    clearAdminSessionPin();
    expect(getAdminSessionPin()).toBe('');

    const adminPortalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src', 'components', 'admin', 'AdminPortal.tsx'),
      'utf8'
    );
    expect(adminPortalSrc).toContain('checkExistingSession');
    expect(adminPortalSrc).toContain('await verifyAdminSession(stored)');
    expect(adminPortalSrc).toContain('clearAdminSessionPin()');
    expect(adminPortalSrc).toContain('setIsAuthenticated(false)');

    const htmlUnauth = renderToStaticMarkup(React.createElement(AdminPortal, { onBack: () => {} }));
    expect(htmlUnauth).not.toContain('Portal Admin Asesmen Merdeka');
    expect(htmlUnauth).not.toContain('ADMIN MASTER');
  });

  it('10. Frontend bebas dari hash/salt/fungsi auth PIN Admin & backend menolak non-admin untuk seluruh aksi', async () => {
    expect('verifyAdminKeygenPin' in licenseManagerModule).toBe(false);

    const srcFiles = [
      path.resolve(process.cwd(), 'src', 'utils', 'licenseManager.ts'),
      path.resolve(process.cwd(), 'src', 'utils', 'adminService.ts'),
      path.resolve(process.cwd(), 'src', 'components', 'LicenseModal.tsx'),
      path.resolve(process.cwd(), 'src', 'components', 'admin', 'AdminPortal.tsx'),
    ];
    for (const filePath of srcFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('verifyAdminKeygenPin');
      expect(content).not.toContain('EXPECTED_ADMIN_PIN_HASH');
      expect(content).not.toContain('ADMIN_KEYGEN_V1');
      expect(content).not.toContain('VITE_ADMIN_PIN');
      expect(content).not.toContain('fetchOfflineAdminLicenses');
      expect(content).not.toContain('createOfflineAdminLicense');
    }

    const actions = [
      'list_licenses',
      'create_license',
      'reset_license_seats',
      'disable_teacher_seat',
      'enable_teacher_seat',
      'reset_teacher_devices',
      'renew_license',
      'suspend_license',
      'delete_license',
    ];
    for (let i = 0; i < actions.length; i++) {
      const res = createMockRes();
      await adminPortalHandler(
        {
          method: 'POST',
          headers: {},
          body: { action: actions[i], adminPin: 'NON-ADMIN-USER-PIN' },
          socket: { remoteAddress: `10.20.2.${i + 1}` },
        },
        res
      );
      expect(res.statusCode).toBe(403);
      expect(res.body?.ok).toBe(false);
    }

    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const res = createMockRes();
      await feedbackReportsHandler(
        {
          method,
          headers: { 'x-admin-pin': 'NON-ADMIN-USER-PIN' },
          query: {},
          body: {},
        },
        res
      );
      expect(res.statusCode).toBe(401);
    }
  });

  it('11 & 12. Aktivasi lisensi normal & helper kompatibilitas kode lisensi lama tetap utuh dan berfungsi', () => {
    const devId = 'DEV-GURU-NORMAL-102';
    const legacyDeviceKey = computeLicenseCodeForDevice(devId);
    expect(legacyDeviceKey).toMatch(/^ASM-DV26-[A-Z0-9]+$/);
    expect(isValidLicenseCode(legacyDeviceKey, devId)).toBe(true);

    const actLegacy = activateLicense(legacyDeviceKey);
    expect(actLegacy.success).toBe(false); // local device id must match
    const serialCode = computeSerialLicenseCode('GURU102COMPAT');
    expect(serialCode).toMatch(/^ASM-GM26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(isValidLicenseCode(serialCode, devId)).toBe(true);

    const actNormal = activateLicense(serialCode);
    expect(actNormal.success).toBe(true);
    expect(getUserQuota().tier).toBe('guru');
    expect(isLicensed(getUserQuota().tier)).toBe(true);

    const batch = generateSchoolBatchLicenses('SMAN1', 2);
    expect(batch).toHaveLength(2);
    expect(batch[0]).toMatch(/^ASM-SK26-/);

    expect(isLicensed('pro')).toBe(true);
    expect(isLicensed('sekolah_pro')).toBe(true);
    expect(isProAiTier('pro')).toBe(true);
    expect(isProAiTier('sekolah_pro')).toBe(true);
  });
});
