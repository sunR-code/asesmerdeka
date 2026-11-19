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
if (typeof (globalThis as { CustomEvent?: unknown }).CustomEvent !== 'function') {
  class PolyfillCustomEvent<T = unknown> {
    type: string;
    detail?: T;
    constructor(type: string, init?: { detail?: T }) {
      this.type = type;
      this.detail = init?.detail;
    }
  }
  Object.defineProperty(globalThis, 'CustomEvent', {
    value: PolyfillCustomEvent,
    configurable: true,
  });
}

import { LicenseModal } from '../../components/LicenseModal';
import { AdminPortal } from '../../components/admin/AdminPortal';
import {
  OPEN_ADMIN_PORTAL_EVENT,
  checkIsAdminUrl,
  isAdminShortcutInput,
  triggerAdminPortalShortcut,
} from '../adminPortalRouting';
import {
  clearAdminSessionPin,
  getAdminSessionPin,
  saveAdminSessionPin,
} from '../adminService';
import {
  computeLicenseCodeForDevice,
  computeSerialLicenseCode,
  generateSchoolBatchLicenses,
  getTierDisplayName,
  isLicensed,
  isProAiTier,
  verifyAdminKeygenPin,
} from '../licenseManager';
import { ONE_TIME_PLANS } from '../paymentGateway';
import type { UserQuota } from '../../types/assessment';

// @ts-expect-error serverless JS handler tested directly
import adminPortalHandler, { clearAdminPortalRateLimitStore } from '../../../api/admin-portal.js';

function makeQuota(overrides: Partial<UserQuota> = {}): UserQuota {
  return {
    tier: 'free',
    remainingCredits: 0,
    maxCredits: 0,
    deviceId: 'DEV-TASK101-TEST',
    ...overrides,
  };
}

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

describe('Task 10.1 — Unify Admin Access & Remove Legacy Inline Admin Panel', () => {
  const win = globalThis.window as unknown as {
    location?: { search?: string };
    dispatchEvent?: (evt: Event) => boolean;
  };
  const originalLocation = win.location;

  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
    clearAdminPortalRateLimitStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalLocation) {
      Object.defineProperty(win, 'location', {
        value: originalLocation,
        configurable: true,
      });
    } else {
      delete win.location;
    }
  });

  it('A & B: kode biasa diproses normal, sedangkan pintasan @admin menutup modal & membuka Admin Portal tanpa panel inline legacy', () => {
    // A. Input kode biasa bukan pintasan admin
    expect(isAdminShortcutInput('ASM-GM26-AAAA-BBBB-CCCC')).toBe(false);
    expect(isAdminShortcutInput('ASM-SK26-1234-5678-90AB')).toBe(false);
    expect(isAdminShortcutInput('')).toBe(false);

    // B1. Deteksi @admin case-insensitive & trim spasi
    expect(isAdminShortcutInput('@admin')).toBe(true);
    expect(isAdminShortcutInput('  @ADMIN  ')).toBe(true);

    // B2. triggerAdminPortalShortcut menutup modal & mengirim CustomEvent resmi ke App.tsx
    const dispatchedEvents: string[] = [];
    const onClose = vi.fn();
    Object.defineProperty(win, 'dispatchEvent', {
      value: vi.fn((evt: { type: string }) => {
        dispatchedEvents.push(evt.type);
        return true;
      }),
      configurable: true,
    });

    triggerAdminPortalShortcut(onClose);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dispatchedEvents).toEqual([OPEN_ADMIN_PORTAL_EVENT]);
    expect(OPEN_ADMIN_PORTAL_EVENT).toBe('asesmerdeka:open-admin-portal');

    // B3. Even if ?admin=1 is present in URL, LicenseModal never renders legacy admin gate
    Object.defineProperty(win, 'location', {
      value: { search: '?admin=1' },
      configurable: true,
    });
    const htmlWithAdminParam = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
      })
    );
    expect(htmlWithAdminParam).toContain('Aktivasi &amp; Sinkronkan');
    expect(htmlWithAdminParam).toContain('Contoh: ASM-GM26-XXXX-XXXX-XXXX');
    expect(htmlWithAdminParam).not.toContain('Masukkan PIN Admin');
    expect(htmlWithAdminParam).not.toContain('Buka Panel Admin');
    expect(htmlWithAdminParam).not.toContain('Panel Admin, Link Mayar.id');
    expect(htmlWithAdminParam).not.toContain('Cetak Kode Kunci Mati 1 ID Perangkat');
    expect(htmlWithAdminParam).not.toContain('Kunci Kembali');

    // B4. Verifikasi sumber LicenseModal.tsx bebas dari implementasi UI & state panel admin legacy
    const licenseModalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src', 'components', 'LicenseModal.tsx'),
      'utf8'
    );
    const forbiddenLegacyMarkers = [
      'showAdminGate',
      'isAdminUnlocked',
      'handleUnlockAdmin',
      'handleSaveMayarLinks',
      'Masukkan PIN Admin',
      'Buka Panel Admin',
      'Panel Admin, Link Mayar.id',
      'Atur URL Payment Link Mayar.id',
      'Cetak Kode Kunci Mati 1 ID Perangkat',
      'Kunci Kembali',
      'GOOGLE_APPS_SCRIPT_TEMPLATE',
    ];
    for (const marker of forbiddenLegacyMarkers) {
      expect(licenseModalSrc).not.toContain(marker);
    }
    expect(licenseModalSrc).toContain('triggerAdminPortalShortcut(onClose)');
  });

  it('C: ketiga route Admin Portal (?page=admin, ?admin=portal, ?admin=1) diarahkan ke Dedicated Admin Portal', () => {
    expect(checkIsAdminUrl('?page=admin')).toBe(true);
    expect(checkIsAdminUrl('?admin=portal')).toBe(true);
    expect(checkIsAdminUrl('?admin=1')).toBe(true);
    expect(checkIsAdminUrl('?foo=bar&page=admin')).toBe(true);

    expect(checkIsAdminUrl('')).toBe(false);
    expect(checkIsAdminUrl('?page=panduan')).toBe(false);
    expect(checkIsAdminUrl('?admin=0')).toBe(false);
  });

  it('D: logout & penutupan Admin Portal membersihkan sesi serta tidak menyisakan admin gate legacy di App.tsx', () => {
    saveAdminSessionPin('DUMMY_TEST_SESSION_TOKEN');
    expect(getAdminSessionPin()).toBe('DUMMY_TEST_SESSION_TOKEN');

    clearAdminSessionPin();
    expect(getAdminSessionPin()).toBe('');

    const appSrc = fs.readFileSync(path.resolve(process.cwd(), 'src', 'App.tsx'), 'utf8');
    expect(appSrc).toContain('OPEN_ADMIN_PORTAL_EVENT');
    expect(appSrc).toContain("url.searchParams.set('page', 'admin')");
    expect(appSrc).toContain("url.searchParams.delete('admin')");
    expect(appSrc).toContain("url.searchParams.delete('page')");
    expect(appSrc).toContain('setIsLicenseModalOpen(false)');
    expect(appSrc).toContain('<AdminPortal onBack={handleCloseAdminPortal} />');
  });

  it('E: helper kompatibilitas lisensi lama & tier pro / sekolah_pro tetap utuh dan berfungsi', () => {
    const devCode = computeLicenseCodeForDevice('DEV-TEST-COMPAT-01');
    expect(devCode).toMatch(/^ASM-DV26-[A-Z0-9]+$/);

    const serialCode = computeSerialLicenseCode('GURU2026TEST');
    expect(serialCode).toMatch(/^ASM-GM26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const batch = generateSchoolBatchLicenses('MAYAR', 3);
    expect(batch).toHaveLength(3);
    expect(batch[0]).toMatch(/^ASM-GM26-/);

    expect(verifyAdminKeygenPin('')).toBe(false);
    expect(verifyAdminKeygenPin('WRONG_PIN_0000')).toBe(false);

    expect(isLicensed('pro')).toBe(true);
    expect(isLicensed('sekolah_pro')).toBe(true);
    expect(isProAiTier('pro')).toBe(true);
    expect(isProAiTier('sekolah_pro')).toBe(true);
    expect(getTierDisplayName('pro')).toContain('PRO');
    expect(getTierDisplayName('sekolah_pro')).toContain('Sekolah PRO');
    expect(ONE_TIME_PLANS.pro_ai.price).toBe(199000);
    expect(ONE_TIME_PLANS.sekolah_pro.price).toBe(1499000);
  });

  it('F: /api/admin-portal menolak akses tanpa PIN valid & AdminPortal tidak membuka dasbor sebelum autentikasi', async () => {
    const getRes = createMockRes();
    await adminPortalHandler(
      { method: 'GET', headers: {}, body: {}, socket: { remoteAddress: '10.10.1.1' } },
      getRes
    );
    expect(getRes.statusCode).toBe(405);

    const missingPinRes = createMockRes();
    await adminPortalHandler(
      {
        method: 'POST',
        headers: {},
        body: { action: 'list_licenses' },
        socket: { remoteAddress: '10.10.1.2' },
      },
      missingPinRes
    );
    expect(missingPinRes.statusCode).toBe(403);
    expect(missingPinRes.body?.ok).toBe(false);

    const wrongPinRes = createMockRes();
    await adminPortalHandler(
      {
        method: 'POST',
        headers: {},
        body: { action: 'auth', adminPin: 'INVALID_PIN_999999' },
        socket: { remoteAddress: '10.10.1.3' },
      },
      wrongPinRes
    );
    expect(wrongPinRes.statusCode).toBe(403);
    expect(wrongPinRes.body?.ok).toBe(false);

    // AdminPortal tanpa sesi tidak merender konten dasbor terautentikasi
    const unauthPortalHtml = renderToStaticMarkup(
      React.createElement(AdminPortal, { onBack: () => {} })
    );
    expect(unauthPortalHtml).not.toContain('Portal Admin Asesmen Merdeka');
    expect(unauthPortalHtml).not.toContain('ADMIN MASTER');
    expect(unauthPortalHtml).not.toContain('Kelola Lisensi &amp; Kunci Perangkat');

    const adminPortalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src', 'components', 'admin', 'AdminPortal.tsx'),
      'utf8'
    );
    expect(adminPortalSrc).toContain('if (!isAuthenticated)');
    expect(adminPortalSrc).toContain('Autentikasi Akses');
    expect(adminPortalSrc).toContain('Kunci Portal');
    expect(adminPortalSrc).toContain('verifyAdminSession');
  });
});
