import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';

class LocalStorageMock {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: LocalStorageMock }).localStorage = new LocalStorageMock();
}
if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}
if (typeof (globalThis as unknown as { addEventListener?: unknown }).addEventListener !== 'function') {
  (globalThis as unknown as { addEventListener: () => void }).addEventListener = () => {};
}
if (typeof (globalThis as unknown as { removeEventListener?: unknown }).removeEventListener !== 'function') {
  (globalThis as unknown as { removeEventListener: () => void }).removeEventListener = () => {};
}
if (typeof (globalThis as unknown as { dispatchEvent?: unknown }).dispatchEvent !== 'function') {
  (globalThis as unknown as { dispatchEvent: () => boolean }).dispatchEvent = () => true;
}

import { LicenseModal } from '../../components/LicenseModal';
import { AdminSettingsTab } from '../../components/admin/AdminSettingsTab';
import type { UserQuota } from '../../types/assessment';
import {
  buildAdminWhatsAppPurchaseUrl,
  clearPaymentGatewayClientCaches,
  createPaymentInvoiceSession,
  getMayarPaymentLink,
  saveMayarPaymentLinks,
} from '../paymentGateway';
import {
  computeSerialLicenseCode,
  getMayarProductId,
  getMayarSchoolProductId,
} from '../licenseManager';
// @ts-expect-error serverless JS module tested directly
import activateLicenseHandler, {
  RECONCILE_QUEUE_REDIS_KEY,
  WEBHOOK_AUDIT_REDIS_KEY,
  buildMayarInvoiceIndexKey,
  buildPaymentOrderKey,
  buildSeatRedisKey,
  buildWebhookTxKey,
  generateStagingLicenseCode,
  getOrderIdByMayarInvoiceId,
  getPaymentOrderRecord,
  getReconcileQueueRecords,
  getSanitizedWebhookAuditLog,
  getWebhookTransactionRecord,
  localLicenseRegistryStore,
  localMayarInvoiceIndexStore,
  localPaymentOrderStore,
  localReconcileQueueStore,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  localStagingRevokedLicensesSet,
  localWebhookAuditLog,
  localWebhookEventStore,
  localWebhookTransactionStore,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS module tested directly
import mayarWebhookHandler from '../../../api/mayar-webhook.js';
// @ts-expect-error serverless JS module tested directly
import cronReconcileHandler from '../../../api/cron/mayar-reconcile.js';
// @ts-expect-error serverless JS module tested directly
import { OFFICIAL_SEEDED_LICENSES } from '../../../api/officialSeeds.js';

const MOCK_REDIS_URL = 'https://task13-mock-redis.upstash.test';
const MOCK_REDIS_TOKEN = 'task13-mock-redis-token-32chars';
const TEST_STAGING_SECRET = 'STAGING_SIGNING_SECRET_TASK13_32CHARS_OK';
const TEST_CRON_SECRET = 'CRON_SECRET_TASK13_32CHARS_TEST_VALUE';

function makeQuota(overrides: Partial<UserQuota> = {}): UserQuota {
  return {
    tier: 'free',
    remainingCredits: 0,
    maxCredits: 0,
    deviceId: 'DEV-TASK13-TEST',
    ...overrides,
  };
}

async function invokeHandler(
  handler: (req: any, res: any) => Promise<any>,
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: any = null;
  const req = {
    method: options.method || 'POST',
    url: options.url || '/api/activate-license',
    headers: options.headers || {},
    query: options.query || {},
    body: options.body ?? {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  const res = {
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = v;
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: any) {
      body = payload;
      return res;
    },
    end() {
      return res;
    },
  };
  await handler(req, res);
  return { statusCode, headers, body };
}

class SimpleRedisKV {
  kv = new Map<string, string>();
  writes: string[] = [];

  async handleFetch(url: string, init?: RequestInit): Promise<Response> {
    if (!url.startsWith(MOCK_REDIS_URL)) {
      return new Response(JSON.stringify({ error: 'Unexpected outbound URL' }), { status: 404 });
    }
    const suffix = url.slice(MOCK_REDIS_URL.length);

    if (suffix.startsWith('/get/')) {
      const key = decodeURIComponent(suffix.slice('/get/'.length));
      return new Response(JSON.stringify({ result: this.kv.has(key) ? this.kv.get(key)! : null }), {
        status: 200,
      });
    }
    if (suffix.startsWith('/set/')) {
      const key = decodeURIComponent(suffix.slice('/set/'.length));
      const val = String(init?.body ?? '');
      this.writes.push(key);
      this.kv.set(key, val);
      return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
    }
    if (suffix.startsWith('/del/')) {
      const key = decodeURIComponent(suffix.slice('/del/'.length));
      const deleted = this.kv.delete(key) ? 1 : 0;
      return new Response(JSON.stringify({ result: deleted }), { status: 200 });
    }

    const cmd = JSON.parse(String(init?.body || '[]')) as string[];
    const op = String(cmd[0] || '').toUpperCase();

    if (op === 'GET') {
      const key = String(cmd[1] || '');
      return new Response(JSON.stringify({ result: this.kv.has(key) ? this.kv.get(key)! : null }), {
        status: 200,
      });
    }
    if (op === 'SET') {
      const key = String(cmd[1] || '');
      const val = String(cmd[2] ?? '');
      if (cmd[4] === 'NX' && this.kv.has(key)) {
        return new Response(JSON.stringify({ result: null }), { status: 200 });
      }
      this.writes.push(key);
      this.kv.set(key, val);
      return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
    }
    if (op === 'INCR') {
      const key = String(cmd[1] || '');
      const next = (Number(this.kv.get(key) || '0') || 0) + 1;
      this.kv.set(key, String(next));
      return new Response(JSON.stringify({ result: next }), { status: 200 });
    }
    if (op === 'DEL') {
      const deleted = this.kv.delete(String(cmd[1] || '')) ? 1 : 0;
      return new Response(JSON.stringify({ result: deleted }), { status: 200 });
    }
    if (op === 'EVAL') {
      const script = String(cmd[1] || '');
      const numKeys = Number(cmd[2] || 0);
      const keys = cmd.slice(3, 3 + numKeys).map(String);
      const args = cmd.slice(3 + numKeys).map(String);
      if (script.includes('ASESMERDEKA_ACQUIRE_MULTI_LOCK_V1')) {
        const lockCount = Number(args[0] || 0);
        const owner = args[1];
        const fenceKey = keys[lockCount];
        for (let i = 0; i < lockCount; i++) {
          if (this.kv.has(keys[i])) {
            return new Response(JSON.stringify({ result: ['BUSY', keys[i]] }), { status: 200 });
          }
        }
        for (let i = 0; i < lockCount; i++) {
          this.kv.set(keys[i], owner);
        }
        const fence = (Number(this.kv.get(fenceKey) || '0') || 0) + 1;
        this.kv.set(fenceKey, String(fence));
        return new Response(JSON.stringify({ result: ['ACQUIRED', String(fence)] }), { status: 200 });
      }
      if (script.includes('ASESMERDEKA_RELEASE_MULTI_LOCK_V1')) {
        for (const k of keys) {
          this.kv.delete(k);
        }
        return new Response(JSON.stringify({ result: keys.length }), { status: 200 });
      }
      if (script.includes('ASESMERDEKA_FENCED_RECORD_WRITE_V1')) {
        this.writes.push(keys[0]);
        this.kv.set(keys[0], args[2]);
        return new Response(JSON.stringify({ result: ['OK', ''] }), { status: 200 });
      }
      if (script.includes('ASESMERDEKA_ATOMIC_SEAT_CAS_V1')) {
        this.writes.push(keys[0]);
        this.kv.set(keys[0], args[3]);
        return new Response(JSON.stringify({ result: ['OK', ''] }), { status: 200 });
      }
      if (script.includes('ASESMERDEKA_UPSERT_ADMIN_REGISTRY_V1')) {
        const patch = JSON.parse(args[0]);
        const curRaw = this.kv.get(keys[0]);
        const list = curRaw ? (JSON.parse(curRaw) as any[]) : [];
        const idx = list.findIndex((item) => item && item.code === patch.code);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...patch };
        } else if (patch.newEntry) {
          list.unshift(patch.newEntry);
        }
        this.kv.set(keys[0], JSON.stringify(list));
        return new Response(JSON.stringify({ result: ['OK'] }), { status: 200 });
      }
    }
    return new Response(JSON.stringify({ result: null }), { status: 200 });
  }
}

describe('Task 13 — Mayar Payment Gateway Decommission Regression Suite', () => {
  const originalFetch = globalThis.fetch;
  const savedEnv = { ...process.env };
  let redis: SimpleRedisKV;
  let outboundUrls: string[];

  beforeEach(() => {
    globalThis.localStorage.clear();
    clearPaymentGatewayClientCaches();
    localSeatMemoryStore.clear();
    localLicenseRegistryStore.length = 0;
    localRevokedLicensesSet.clear();
    localStagingRevokedLicensesSet.clear();
    localWebhookTransactionStore.clear();
    localWebhookEventStore.clear();
    localPaymentOrderStore.clear();
    localMayarInvoiceIndexStore.clear();
    localReconcileQueueStore.clear();
    localWebhookAuditLog.length = 0;

    redis = new SimpleRedisKV();
    outboundUrls = [];
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    process.env.CRON_SECRET = TEST_CRON_SECRET;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      outboundUrls.push(urlStr);
      return redis.handleFetch(urlStr, init);
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...savedEnv };
    vi.restoreAllMocks();
  });

  it('1. Tidak ada checkout/invoice/payment link/webhook/cron Mayar baru yang dapat dibuat', async () => {
    for (const badBody of [
      { action: 'create_payment_order', planId: 'pro_individu', createMayarInvoice: true },
      { action: 'create_payment_order', planId: 'pro_individu', mayarInvoiceId: 'INV-M1' },
      { action: 'create_payment_order', planId: 'pro_sekolah', provider: 'mayar' },
    ]) {
      const res = await invokeHandler(activateLicenseHandler, { body: badBody });
      expect(res.statusCode).toBe(410);
      expect(res.body.retired).toBe(true);
      expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');
    }

    const whPost = await invokeHandler(mayarWebhookHandler, {
      url: '/api/mayar-webhook',
      method: 'POST',
      body: { event: 'payment.received', data: { id: 'EVT-NEW-1' } },
    });
    expect(whPost.statusCode).toBe(410);
    expect(whPost.body.reason).toBe('MAYAR_DECOMMISSIONED');

    const whGet = await invokeHandler(mayarWebhookHandler, {
      url: '/api/mayar-webhook',
      method: 'GET',
    });
    expect(whGet.statusCode).toBe(410);
    expect(whGet.body.reason).toBe('MAYAR_DECOMMISSIONED');

    const cronQueryAttack = await invokeHandler(cronReconcileHandler, {
      url: `/api/cron/mayar-reconcile?secret=${TEST_CRON_SECRET}`,
      method: 'GET',
      headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
    });
    expect(cronQueryAttack.statusCode).toBe(401);
    expect(cronQueryAttack.body.reason).toBe('QUERY_SECRET_FORBIDDEN');

    const cronAuth = await invokeHandler(cronReconcileHandler, {
      url: '/api/cron/mayar-reconcile',
      method: 'GET',
      headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
    });
    expect(cronAuth.statusCode).toBe(410);
    expect(cronAuth.headers['cache-control']).toBe('no-store');
    expect(cronAuth.body.reason).toBe('MAYAR_DECOMMISSIONED');

    delete process.env.CRON_SECRET;
    const cronUnset = await invokeHandler(cronReconcileHandler, {
      url: '/api/cron/mayar-reconcile',
      method: 'GET',
    });
    expect(cronUnset.statusCode).toBe(410);
    expect(cronUnset.body.reason).toBe('MAYAR_DECOMMISSIONED');

    // Client-side payment links & Product IDs remain inert
    saveMayarPaymentLinks('https://pay.mayar.id/a', 'https://pay.mayar.id/b');
    expect(getMayarPaymentLink('pro_individu')).toBe('');
    expect(getMayarPaymentLink('pro_sekolah')).toBe('');
    expect(getMayarProductId()).toBe('');
    expect(getMayarSchoolProductId()).toBe('');

    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Guru Uji',
      buyerEmail: 'guru@sdn.sch.id',
      deviceId: 'DEV-T13-1',
    });
    expect(session.externalCheckoutUrl).toBeUndefined();
    expect(outboundUrls).toHaveLength(0);
    expect(redis.writes).toHaveLength(0);
  });

  it('2. Tidak ada alur/konfigurasi pembayaran Mayar pada UI aktif maupun konfigurasi runtime aktif', () => {
    const licenseModalDefaultHtml = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
      })
    );
    const licenseModalWaHtml = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
        initialWhatsAppModalPlanId: 'pro_individu',
      })
    );
    const adminSettingsHtml = renderToStaticMarkup(React.createElement(AdminSettingsTab));

    expect(licenseModalDefaultHtml.toLowerCase()).not.toContain('mayar');
    expect(licenseModalWaHtml.toLowerCase()).not.toContain('mayar');
    expect(adminSettingsHtml.toLowerCase()).not.toContain('mayar');
    expect(adminSettingsHtml).toContain('1. Kanal Pembelian Lisensi Aktif');
    expect(adminSettingsHtml).toContain('WhatsApp Admin Manual');
    expect(adminSettingsHtml).toContain('2. Batas Kursi Perangkat (Device Seat Binding)');
    expect(adminSettingsHtml).toContain('3. Cloud Seat Tracker');

    const root = process.cwd();
    const licenseModalSrc = fs.readFileSync(path.join(root, 'src/components/LicenseModal.tsx'), 'utf8');
    const adminSettingsSrc = fs.readFileSync(path.join(root, 'src/components/admin/AdminSettingsTab.tsx'), 'utf8');
    expect(licenseModalSrc.toLowerCase()).not.toContain('mayar');
    expect(adminSettingsSrc.toLowerCase()).not.toContain('mayar');

    const vercelJson = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');
    expect(vercelJson).not.toContain('api.mayar.id');
    expect(vercelJson).not.toContain('mayar-reconcile');

    const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
    expect(viteConfig).not.toContain('/api/mayar-webhook');

    const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    expect(envExample).not.toMatch(/^MAYAR_API_KEY=/m);
    expect(envExample).not.toMatch(/^MAYAR_WEBHOOK_SECRET=/m);
    expect(envExample).not.toMatch(/^VITE_PAYMENT_LINK_INDIVIDU=/m);
    expect(envExample).not.toMatch(/^VITE_PAYMENT_LINK_SEKOLAH=/m);
    expect(envExample).not.toMatch(/^VITE_MAYAR_PRODUCT_ID=/m);
    expect(envExample).not.toMatch(/^VITE_MAYAR_SCHOOL_PRODUCT_ID=/m);

    for (const relApi of [
      'api/activate-license.js',
      'api/mayar-webhook.js',
      'api/cron/mayar-reconcile.js',
      'api/diagnostics/staging-redis.js',
    ]) {
      const apiSrc = fs.readFileSync(path.join(root, relApi), 'utf8');
      expect(apiSrc).not.toMatch(/process\.env\.MAYAR_/);
      expect(apiSrc).not.toMatch(/https?:\/\/api\.mayar\./i);
    }
  });

  it('3. Catatan transaksi historis, 135 seeded codes, dan lisensi non-ASM pelanggan lama tetap utuh & terbaca tanpa memanggil Mayar', async () => {
    const seededIndivCode = computeSerialLicenseCode('INDIVHIST13');
    redis.kv.set(
      buildPaymentOrderKey('INV-HIST-001'),
      JSON.stringify({
        orderId: 'INV-HIST-001',
        invoiceId: 'INV-HIST-001',
        mayarInvoiceId: 'MYR-INV-001',
        transactionId: 'TX-HIST-001',
        licenseCode: seededIndivCode,
        planId: 'pro_individu',
        planType: 'individu',
        baseAmount: 99000,
        status: 'paid',
      })
    );
    redis.kv.set(
      buildWebhookTxKey('TX-HIST-001'),
      JSON.stringify({
        transactionId: 'TX-HIST-001',
        orderId: 'INV-HIST-001',
        licenseCode: seededIndivCode,
        planType: 'individu',
        amount: 99000,
        status: 'paid',
        verifiedBy: 'historical_mayar_v2',
      })
    );
    redis.kv.set(
      buildMayarInvoiceIndexKey('MYR-INV-001'),
      JSON.stringify({ mayarInvoiceId: 'MYR-INV-001', orderId: 'INV-HIST-001' })
    );
    redis.kv.set(RECONCILE_QUEUE_REDIS_KEY, JSON.stringify([{ jobKey: 'HIST-Q-1', orderId: 'INV-PEND-OLD' }]));
    redis.kv.set(WEBHOOK_AUDIT_REDIS_KEY, JSON.stringify([{ orderId: 'INV-HIST-001', outcome: 'paid' }]));
    redis.kv.set(
      buildSeatRedisKey('MYR-LEGACY-CUST-01'),
      JSON.stringify({
        licenseCode: 'MYR-LEGACY-CUST-01',
        environment: 'production',
        planType: 'individu',
        tier: 'guru',
        maxSeats: 2,
        devices: ['DEV-OLD-1'],
        usedSeats: 1,
        lifecycleState: 'active',
      })
    );

    expect((await getPaymentOrderRecord('INV-HIST-001'))?.status).toBe('paid');
    expect((await getWebhookTransactionRecord('TX-HIST-001'))?.licenseCode).toBe(seededIndivCode);
    expect(await getOrderIdByMayarInvoiceId('MYR-INV-001')).toBe('INV-HIST-001');
    expect(await getReconcileQueueRecords()).toHaveLength(1);
    expect(await getSanitizedWebhookAuditLog()).toHaveLength(1);

    const verifyHist = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify_payment_order', invoiceId: 'INV-HIST-001' },
    });
    expect(verifyHist.statusCode).toBe(200);
    expect(verifyHist.body.verified).toBe(true);
    expect(verifyHist.body.licenseCode).toBe(seededIndivCode);

    // Historical non-ASM customer seat in Redis reactivates on 2nd device & enforces maxSeats=2
    const legDev2 = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'MYR-LEGACY-CUST-01', deviceId: 'DEV-OLD-2' },
    });
    expect(legDev2.statusCode).toBe(200);
    expect(legDev2.body.valid).toBe(true);
    expect(legDev2.body.legacyRecord).toBe(true);
    expect(legDev2.body.usedSeats).toBe(2);
    expect(legDev2.body.maxSeats).toBe(2);

    const legDev3 = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'MYR-LEGACY-CUST-01', deviceId: 'DEV-OLD-3' },
    });
    expect(legDev3.statusCode).toBe(403);
    expect(legDev3.body.seatLimitExceeded).toBe(true);

    // Unknown non-ASM code returns clean 400 LICENSE_NOT_FOUND (no kycPending)
    const unknownRes = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'UNREGISTERED-NON-ASM-99', deviceId: 'DEV-UNK-1' },
    });
    expect(unknownRes.statusCode).toBe(400);
    expect(unknownRes.body.valid).toBe(false);
    expect(unknownRes.body.reason).toBe('LICENSE_NOT_FOUND');
    expect(unknownRes.body.providerRetired).toBe('mayar');
    expect(unknownRes.body.kycPending).toBeUndefined();

    // All 135 historical seeded license codes stay intact
    expect(OFFICIAL_SEEDED_LICENSES).toHaveLength(135);
    expect(outboundUrls.every((u) => u.startsWith(MOCK_REDIS_URL))).toBe(true);
  });

  it('4. Checkout manual WhatsApp Admin tetap tersedia dan berfungsi penuh di UI', () => {
    const waIndiv = buildAdminWhatsAppPurchaseUrl('pro_individu');
    const waSekolah = buildAdminWhatsAppPurchaseUrl('pro_sekolah');
    expect(waIndiv).toMatch(/^https:\/\/wa\.me\/6282114625243\?text=/);
    expect(waSekolah).toMatch(/^https:\/\/wa\.me\/6282114625243\?text=/);

    const listHtml = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
      })
    );
    expect(listHtml).toContain('Lisensi Guru Mandiri');
    expect(listHtml).toContain('Rp 99.000');
    expect(listHtml).toContain('Lisensi Kolektif Sekolah');
    expect(listHtml).toContain('Rp 749.000');
    expect(listHtml).toContain('Info Pembelian &amp; WhatsApp Admin');

    const waModalHtml = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
        initialWhatsAppModalPlanId: 'pro_sekolah',
      })
    );
    expect(waModalHtml).toContain('Pembelian Online Sementara Belum Tersedia');
    expect(waModalHtml).toContain('Hubungi Admin via WhatsApp');
  });

  it('5. Aktivasi lisensi Guru/Sekolah, generic Payment Order, & isolasi environment Staging/Production tetap berjalan normal', async () => {
    // Generic order without Mayar flags persists cleanly
    const genOrderRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-GEN-TASK13',
        deviceId: 'DEV-GEN-13',
        buyerName: 'Ibu Sari',
        buyerEmail: 'sari@sdn.sch.id',
      },
    });
    expect(genOrderRes.statusCode).toBe(200);
    expect(genOrderRes.body.ok).toBe(true);
    expect(genOrderRes.body.order.status).toBe('pending_payment');

    // Individu & Sekolah activations in production mode
    process.env.VERCEL_ENV = 'production';
    const indivCode = computeSerialLicenseCode('INDIVREG13');
    const actIndiv = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: indivCode, deviceId: 'DEV-GURU-A' },
    });
    expect(actIndiv.statusCode).toBe(200);
    expect(actIndiv.body.valid).toBe(true);
    expect(actIndiv.body.maxSeats).toBe(2);

    const schoolCode = computeSerialLicenseCode('SEKOLAHREG13');
    const actSchool = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: schoolCode, deviceId: 'DEV-SCH-A', teacherPin: 'BU_ANI_13' },
    });
    expect(actSchool.statusCode).toBe(200);
    expect(actSchool.body.valid).toBe(true);
    expect(actSchool.body.maxSeats).toBe(25);
    expect(actSchool.body.teacherKey).toBe('BU_ANI_13');

    // Staging code generation & strict Production <-> Staging boundary
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    const stgCode = generateStagingLicenseCode('GM26', 'T13ISOL');
    expect(stgCode.startsWith('ASM-STG2-GM26-')).toBe(true);

    const actStg = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: stgCode, deviceId: 'DEV-STG-13' },
    });
    expect(actStg.statusCode).toBe(200);
    expect(actStg.body.environment).toBe('staging');

    // Production code rejected in Staging Preview
    const prodOnStg = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: indivCode, deviceId: 'DEV-CROSS-1' },
    });
    expect(prodOnStg.statusCode).toBe(403);
    expect(prodOnStg.body.forbiddenEnvironment).toBe(true);

    // Staging code rejected in Production
    process.env.VERCEL_ENV = 'production';
    const stgOnProd = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: stgCode, deviceId: 'DEV-CROSS-2' },
    });
    expect(stgOnProd.statusCode).toBe(403);
    expect(stgOnProd.body.forbiddenEnvironment).toBe(true);
  });

  it('6. Dokumentasi historis diberi label RETIRED dan diagnostics staging-redis bebas dependensi ke mayar-webhook', () => {
    const root = process.cwd();
    const historicalPlan = fs.readFileSync(
      path.join(root, 'docs/superpowers/plans/2026-11-06-mayar-model-a-license-integration.md'),
      'utf8'
    );
    expect(historicalPlan).toContain('RETIRED — HISTORICAL REFERENCE ONLY');

    const diagnosticsSrc = fs.readFileSync(path.join(root, 'api/diagnostics/staging-redis.js'), 'utf8');
    expect(diagnosticsSrc).not.toContain('mayar-webhook');
    expect(diagnosticsSrc).toContain("from '../activate-license.js'");
  });
});
