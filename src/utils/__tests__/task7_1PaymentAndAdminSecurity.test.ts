import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

import {
  ONE_TIME_PLANS,
  applyPaymentGatewayCallback,
  createPaymentInvoiceSession,
  verifyPaymentOrderStatusOnline,
} from '../paymentGateway';
import {
  activateLicense,
  computeSerialLicenseCode,
  getUserQuota,
} from '../licenseManager';
import {
  createAdminLicense,
  deleteAdminLicense,
  fetchAdminLicenses,
  manageSchoolTeacherSeatAdmin,
  renewAdminLicense,
  resetAdminLicenseSeats,
} from '../adminService';

// @ts-expect-error serverless JS handler tested directly
import activateLicenseHandler, {
  SERVER_PLAN_CATALOG,
  localLicenseRegistryStore,
  localPaymentOrderStore,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  localWebhookTransactionStore,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS handler tested directly
import mayarWebhookHandler, { computeMayarHmacSignature } from '../../../api/mayar-webhook.js';
// @ts-expect-error serverless JS handler tested directly
import adminPortalHandler, { clearAdminPortalRateLimitStore } from '../../../api/admin-portal.js';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  setHeader: (name: string, val: string) => void;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
  end: () => MockResponse;
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: null,
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

async function invokeHandler(
  handler: (req: any, res: any) => Promise<any>,
  options: {
    method?: string;
    url?: string;
    body?: any;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    remoteAddress?: string;
  } = {}
): Promise<MockResponse> {
  const req = {
    method: options.method || 'POST',
    url: options.url || '/',
    body: options.body ?? {},
    headers: options.headers || {},
    query: options.query || {},
    socket: { remoteAddress: options.remoteAddress || '127.0.0.1' },
  };
  const res = createMockRes();
  await handler(req, res);
  return res;
}

function makeSerial(prefix: 'GM26' | 'SK26', seed: string): string {
  const cleanSeed = seed.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (prefix === 'SK26') return computeSerialLicenseCode(`SEKOLAH${cleanSeed.slice(0, 5)}`);
  return computeSerialLicenseCode(`INDIV${cleanSeed.slice(0, 7)}`);
}

const TEST_ADMIN_PIN = 'ADM_ROTATED_2026';
const TEST_WEBHOOK_SECRET = 'MAYAR_TEST_SECRET_TASK71';
const INDIVIDU_PRODUCT_ID = 'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';
const SCHOOL_PRODUCT_ID = '17cece7f-e711-4fdc-af44-e6ceb4b4bff7';

const MAYAR_V2_MOCK_INVOICES: Record<string, { amount: number; transactionId: string }> = {
  'INV-MAYAR-7103': { amount: 99000, transactionId: 'TXN-REAL-7103' },
  'INV-MAYAR-7104': { amount: 99000, transactionId: 'TXN-PKG-7104' },
  'INV-MAYAR-7105': { amount: 99000, transactionId: 'TXN-VICTIM-7105' },
  'INV-MAYAR-REPLAY10': { amount: 99000, transactionId: 'TXN-REPLAY-10' },
  'INV-MAYAR-SHARED11A': { amount: 99000, transactionId: 'TXN-SHARED-11' },
  'INV-MAYAR-SHARED11B': { amount: 99000, transactionId: 'TXN-SHARED-11' },
  'INV-MAYAR-FLOW14': { amount: 99000, transactionId: 'TXN-MAYAR-14' },
  'INV-MAYAR-POLL16': { amount: 99000, transactionId: 'TXN-POLL-16' },
  'INV-MAYAR-RACE17': { amount: 749000, transactionId: 'TXN-RACE-17' },
};

function tryHandleMayarV2InvoiceFetch(input: RequestInfo | URL): Response | null {
  const urlStr = String(input || '');
  if (!urlStr.includes('/hl/v2/invoices/')) return null;
  const lookupId = decodeURIComponent(urlStr.split('/hl/v2/invoices/')[1] || '').toUpperCase();
  const entry = MAYAR_V2_MOCK_INVOICES[lookupId];
  if (!entry) {
    return new Response(JSON.stringify({ statusCode: 404, messages: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(
    JSON.stringify({
      statusCode: 200,
      messages: 'success',
      data: {
        id: lookupId,
        status: 'paid',
        amount: entry.amount,
        transactionId: entry.transactionId,
        transactions: [{ id: entry.transactionId }],
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

describe('Task 7.1 — Payment Authorization & Admin Security (18 Scenarios)', () => {
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    localSeatMemoryStore.clear();
    localLicenseRegistryStore.length = 0;
    localWebhookTransactionStore.clear();
    localPaymentOrderStore.clear();
    localRevokedLicensesSet.clear();
    clearAdminPortalRateLimitStore();

    process.env.ADMIN_PIN = TEST_ADMIN_PIN;
    process.env.MAYAR_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.MAYAR_API_KEY = 'MAYAR_TEST_KEY_TASK71';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const mayarRes = tryHandleMayarV2InvoiceFetch(input);
      if (mayarRes) return mayarRes;
      return originalFetch(input, init);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    process.env = { ...savedEnv };
  });

  // =========================================================================
  // PART A — ZERO-TRUST BROWSER CALLBACK SECURITY (SCENARIOS 1–5)
  // =========================================================================
  it('1. Browser mengirim status paid palsu ditolak tanpa aktivasi lisensi', () => {
    const code = makeSerial('GM26', 'FAKEPAID1');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Guru A',
      buyerEmail: 'gurua@sekolah.sch.id',
      deviceId: 'DEV-71-01',
    });

    const res = applyPaymentGatewayCallback(session, {
      status: 'paid',
      paidAmount: 99000,
      licenseCode: code,
    });

    expect(res.ok).toBe(false);
    expect(res.activated).toBe(false);
    expect(res.reason).toBe('UNVERIFIED_PAYMENT_TRANSACTION');
    expect(res.session.status).toBe('pending_payment');
    expect(getUserQuota().tier).toBe('free');
  });

  it('2. Browser mengirim transactionId palsu yang belum tercatat di server ditolak', () => {
    const code = makeSerial('GM26', 'FAKETX2');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Guru B',
      buyerEmail: 'gurub@sekolah.sch.id',
      deviceId: 'DEV-71-02',
    });

    const res = applyPaymentGatewayCallback(session, {
      status: 'settled',
      transactionId: 'TXN-BROWSER-SPOOF-999',
      paidAmount: 99000,
      licenseCode: code,
    });

    expect(res.ok).toBe(false);
    expect(res.activated).toBe(false);
    expect(res.reason).toBe('UNVERIFIED_PAYMENT_TRANSACTION');
    expect(getUserQuota().tier).toBe('free');
  });

  it('3. Browser memanipulasi nominal paidAmount lebih rendah/berbeda dari server ditolak', async () => {
    const code = makeSerial('GM26', 'TAMPERAMT3');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Guru C',
      buyerEmail: 'guruc@sekolah.sch.id',
      deviceId: 'DEV-71-03',
    });

    const payload = {
      event: 'payment.received',
      data: {
        id: 'EVT-REAL-7103',
        mayarInvoiceId: 'INV-MAYAR-7103',
        transactionId: 'TXN-REAL-7103',
        status: true,
        amount: 99000,
        currency: 'IDR',
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        customerEmail: session.buyerEmail,
        productId: INDIVIDU_PRODUCT_ID,
        licenseCode: code,
      },
    };
    const raw = JSON.stringify(payload);
    const webhookRes = await invokeHandler(mayarWebhookHandler, {
      body: payload,
      headers: { 'x-mayar-signature': computeMayarHmacSignature(raw, TEST_WEBHOOK_SECRET) },
    });
    expect(webhookRes.statusCode).toBe(200);

    // Client tries passing manipulated amount Rp 1.000
    const res = applyPaymentGatewayCallback(session, {
      status: 'paid',
      transactionId: 'TXN-REAL-7103',
      paidAmount: 1000,
      licenseCode: code,
    });

    expect(res.ok).toBe(false);
    expect(res.activated).toBe(false);
    expect(res.reason).toBe('AMOUNT_MANIPULATED');
    expect(getUserQuota().tier).toBe('free');
  });

  it('4. Browser memanipulasi kode paket (Individu -> Sekolah) pada session/kode ditolak', async () => {
    const indivCode = makeSerial('GM26', 'PKG4A');
    const schoolCode = makeSerial('SK26', 'PKG4B');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Guru D',
      buyerEmail: 'gurud@sekolah.sch.id',
      deviceId: 'DEV-71-04',
    });

    // Server mencatat transaksi sah Rp 99.000 untuk pro_individu
    const payload = {
      event: 'payment.received',
      data: {
        id: 'EVT-PKG-7104',
        mayarInvoiceId: 'INV-MAYAR-7104',
        transactionId: 'TXN-PKG-7104',
        status: true,
        amount: 99000,
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        customerEmail: session.buyerEmail,
        productId: INDIVIDU_PRODUCT_ID,
        licenseCode: indivCode,
      },
    };
    await invokeHandler(mayarWebhookHandler, {
      body: payload,
      headers: { 'x-callback-token': TEST_WEBHOOK_SECRET },
    });

    // Penyerang mencoba mengubah session.planId menjadi pro_sekolah di DOM/JS
    const tamperedSession = { ...session, planId: 'pro_sekolah' as const };
    const tamperedRes = applyPaymentGatewayCallback(tamperedSession, {
      status: 'paid',
      transactionId: 'TXN-PKG-7104',
      paidAmount: 99000,
      licenseCode: schoolCode,
    });
    expect(tamperedRes.ok).toBe(false);
    expect(tamperedRes.activated).toBe(false);
    expect(tamperedRes.reason).toBe('PLAN_TAMPERED');

    // Atau mencoba menyuplai kode SK26 pada transaksi GM26
    const mismatchedCodeRes = applyPaymentGatewayCallback(session, {
      status: 'paid',
      transactionId: 'TXN-PKG-7104',
      paidAmount: 99000,
      licenseCode: schoolCode,
    });
    expect(mismatchedCodeRes.ok).toBe(false);
    expect(mismatchedCodeRes.activated).toBe(false);
    expect(getUserQuota().tier).toBe('free');
  });

  it('5. Browser mencoba memakai transactionId milik pengguna / perangkat lain ditolak', async () => {
    const ownerCode = makeSerial('GM26', 'OWNER5');
    const attackerSession = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Penyerang',
      buyerEmail: 'attacker@other.sch.id',
      deviceId: 'DEV-ATTACKER-05',
    });

    // Transaksi sah milik korban (DEV-VICTIM-05 / victim@sdn.sch.id)
    const victimOrder = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-VICTIM-7105',
        deviceId: 'DEV-VICTIM-05',
        buyerEmail: 'victim@sdn.sch.id',
      },
    });
    expect(victimOrder.statusCode).toBe(200);

    const payload = {
      event: 'payment.received',
      data: {
        id: 'EVT-VICTIM-7105',
        mayarInvoiceId: 'INV-MAYAR-7105',
        transactionId: 'TXN-VICTIM-7105',
        status: true,
        amount: 99000,
        invoiceId: 'INV-VICTIM-7105',
        deviceId: 'DEV-VICTIM-05',
        customerEmail: 'victim@sdn.sch.id',
        licenseCode: ownerCode,
      },
    };
    const whRes = await invokeHandler(mayarWebhookHandler, {
      body: payload,
      headers: { 'x-callback-token': TEST_WEBHOOK_SECRET },
    });
    expect(whRes.statusCode).toBe(200);

    const stealRes = applyPaymentGatewayCallback(attackerSession, {
      status: 'paid',
      transactionId: 'TXN-VICTIM-7105',
      paidAmount: 99000,
      licenseCode: ownerCode,
    });
    expect(stealRes.ok).toBe(false);
    expect(stealRes.activated).toBe(false);
    expect(stealRes.reason).toBe('TRANSACTION_OWNERSHIP_MISMATCH');
    expect(getUserQuota().tier).toBe('free');
  });

  // =========================================================================
  // PART B — MAYAR WEBHOOK AUTHENTICATION & PAYLOAD INTEGRITY (SCENARIOS 6–13)
  // =========================================================================
  it('6. Webhook dengan autentikasi (token/signature) tidak valid ditolak HTTP 401', async () => {
    const res = await invokeHandler(mayarWebhookHandler, {
      url: '/api/mayar-webhook?token=TOKEN_SALAH',
      body: { event: 'payment.received', data: { id: 'TXN-6', status: true, amount: 99000 } },
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.reason).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('7. Webhook tanpa token/signature saat MAYAR_WEBHOOK_SECRET aktif ditolak HTTP 401', async () => {
    const res = await invokeHandler(mayarWebhookHandler, {
      body: { event: 'payment.received', data: { id: 'TXN-7', status: true, amount: 99000 } },
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.reason).toBe('MISSING_WEBHOOK_SIGNATURE');
  });

  it('8. Webhook dengan nominal kurang atau mata uang bukan IDR ditolak HTTP 400', async () => {
    const code = makeSerial('SK26', 'UNDER8');
    const underRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'EVT-UNDER-8',
          transactionId: 'TXN-UNDER-8',
          status: true,
          amount: 99000, // kurang untuk Sekolah Rp 749.000
          productId: SCHOOL_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });
    expect(underRes.statusCode).toBe(400);
    expect(underRes.body.reason).toBe('AMOUNT_MISMATCH');

    const badCurrencyRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'EVT-USD-8',
          transactionId: 'TXN-USD-8',
          status: true,
          amount: 749000,
          currency: 'USD',
          licenseCode: code,
        },
      },
    });
    expect(badCurrencyRes.statusCode).toBe(400);
    expect(badCurrencyRes.body.reason).toBe('CURRENCY_MISMATCH');
  });

  it('9. Webhook dengan productId salah atau produk Individu untuk lisensi Sekolah ditolak HTTP 400', async () => {
    const schoolCode = makeSerial('SK26', 'PROD9');
    const wrongProd = await invokeHandler(mayarWebhookHandler, {
      headers: { 'x-callback-token': TEST_WEBHOOK_SECRET },
      body: {
        event: 'payment.received',
        data: {
          id: 'EVT-PROD-9A',
          transactionId: 'TXN-PROD-9A',
          status: true,
          amount: 749000,
          productId: 'unknown-product-uuid',
          licenseCode: schoolCode,
        },
      },
    });
    expect(wrongProd.statusCode).toBe(400);
    expect(wrongProd.body.reason).toBe('PRODUCT_MISMATCH');

    const escalationProd = await invokeHandler(mayarWebhookHandler, {
      headers: { 'x-callback-token': TEST_WEBHOOK_SECRET },
      body: {
        event: 'payment.received',
        data: {
          id: 'EVT-PROD-9B',
          transactionId: 'TXN-PROD-9B',
          status: true,
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          productName: 'Lisensi Guru Mandiri',
          licenseCode: schoolCode, // mencoba mengaktifkan SK26 lewat produk Individu
        },
      },
    });
    expect(escalationProd.statusCode).toBe(400);
    expect(escalationProd.body.reason).toBe('PRODUCT_MISMATCH');
  });

  it('10. Webhook replay idempoten untuk transaksi sama menjaga kursi perangkat aktif', async () => {
    const code = makeSerial('GM26', 'REPLAY10');
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'LAPTOP-10' },
    });

    const payload = {
      event: 'payment.received',
      data: {
        id: 'EVT-REPLAY-10',
        mayarInvoiceId: 'INV-MAYAR-REPLAY10',
        transactionId: 'TXN-REPLAY-10',
        status: true,
        amount: 99000,
        licenseCode: code,
      },
    };
    const r1 = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
      body: payload,
    });
    const r2 = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
      body: payload,
    });

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r2.body.idempotentReplay).toBe(true);
    const seatKey = `asesmerdeka:seats:v1:${code}`;
    expect(localSeatMemoryStore.get(seatKey)?.devices).toContain('LAPTOP-10');
  });

  it('11. Satu transactionId dipakai ulang untuk mengaktifkan lisensi berbeda ditolak HTTP 409', async () => {
    const c1 = makeSerial('GM26', 'DUP11A');
    const c2 = makeSerial('GM26', 'DUP11B');

    const first = await invokeHandler(mayarWebhookHandler, {
      headers: { 'x-callback-token': TEST_WEBHOOK_SECRET },
      body: {
        event: 'payment.received',
        data: { id: 'EVT-SHARED-11A', mayarInvoiceId: 'INV-MAYAR-SHARED11A', transactionId: 'TXN-SHARED-11', status: true, amount: 99000, licenseCode: c1 },
      },
    });
    expect(first.statusCode).toBe(200);

    const second = await invokeHandler(mayarWebhookHandler, {
      headers: { 'x-callback-token': TEST_WEBHOOK_SECRET },
      body: {
        event: 'payment.received',
        data: { id: 'EVT-SHARED-11B', mayarInvoiceId: 'INV-MAYAR-SHARED11B', transactionId: 'TXN-SHARED-11', status: true, amount: 99000, licenseCode: c2 },
      },
    });
    expect(second.statusCode).toBe(409);
    expect(second.body.transactionAlreadyBound).toBe(true);
  });

  it('12. Webhook berstatus pending dikembalikan HTTP 202 (pending_payment) tanpa aktivasi', async () => {
    const code = makeSerial('GM26', 'PEND12');
    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
      body: {
        event: 'payment.pending',
        data: { id: 'TXN-PEND-12', status: 'pending', amount: 99000, licenseCode: code },
      },
    });
    expect(res.statusCode).toBe(202);
    expect(res.body.activated).toBe(false);
    expect(res.body.lifecycleState).toBe('pending_payment');
  });

  it('13. Webhook payment.failed dan payload boolean status=false Mayar ditolak HTTP 422 (payment_failed)', async () => {
    const code = makeSerial('GM26', 'FAIL13');
    const failedEventRes = await invokeHandler(mayarWebhookHandler, {
      headers: { 'x-callback-token': TEST_WEBHOOK_SECRET },
      body: {
        event: 'payment.failed',
        data: { id: 'TXN-FAIL-13A', status: 'failed', amount: 99000, licenseCode: code },
      },
    });
    expect(failedEventRes.statusCode).toBe(422);
    expect(failedEventRes.body.lifecycleState).toBe('payment_failed');

    const boolFalseRes = await invokeHandler(mayarWebhookHandler, {
      headers: { 'x-callback-token': TEST_WEBHOOK_SECRET },
      body: {
        event: 'payment.received',
        data: { id: 'TXN-FAIL-13B', status: false, amount: 99000, licenseCode: code },
      },
    });
    expect(boolFalseRes.statusCode).toBe(422);
    expect(boolFalseRes.body.activated).toBe(false);
    expect(boolFalseRes.body.lifecycleState).toBe('payment_failed');
  });

  // =========================================================================
  // PART C — E2E SERVER-AUTHORITATIVE FLOW, POLLING & CONCURRENCY (14–17)
  // =========================================================================
  it('14. Alur checkout resmi: server order -> webhook ?token= (data.status=true) -> verifyPaymentOrderStatusOnline', async () => {
    const code = makeSerial('GM26', 'FLOW14');
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const mayarRes = tryHandleMayarV2InvoiceFetch(input);
      if (mayarRes) return mayarRes;
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const mock = await invokeHandler(activateLicenseHandler, { body });
      return {
        ok: mock.statusCode >= 200 && mock.statusCode < 300,
        status: mock.statusCode,
        json: async () => mock.body,
      } as Response;
    });

    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Ibu Dewi',
      buyerEmail: 'dewi@smp1.sch.id',
      deviceId: 'DEV-FLOW-14',
    });
    expect(session.baseAmount).toBe(SERVER_PLAN_CATALOG.pro_individu.price);

    // 1. Server creates authoritative order
    const orderRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        buyerName: session.buyerName,
        buyerEmail: session.buyerEmail,
      },
    });
    expect(orderRes.statusCode).toBe(200);
    expect(orderRes.body.order.status).toBe('pending_payment');

    // 2. Mayar delivers webhook with ?token= query parameter & data.status = true
    const whRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
        id: 'EVT-MAYAR-14',
        mayarInvoiceId: 'INV-MAYAR-FLOW14',
        transactionId: 'TXN-MAYAR-14',
          status: true,
          amount: ONE_TIME_PLANS.pro_individu.price,
          currency: 'IDR',
          customerName: 'Ibu Dewi',
          customerEmail: 'dewi@smp1.sch.id',
          invoiceId: session.invoiceId,
          deviceId: session.deviceId,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });
    expect(whRes.statusCode).toBe(200);
    expect(whRes.body.activated).toBe(true);

    // 3. Browser polls server-authoritative order verification
    const verifyRes = await verifyPaymentOrderStatusOnline(session);
    expect(verifyRes.ok).toBe(true);
    expect(verifyRes.activated).toBe(true);
    expect(verifyRes.session.status).toBe('paid');
    expect(getUserQuota().tier).toBe('guru');
  });

  it('15. Pengguna kembali dari checkout sebelum webhook masuk -> tetap pending_payment (belum aktif)', async () => {
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const mock = await invokeHandler(activateLicenseHandler, { body });
      return {
        ok: mock.statusCode >= 200 && mock.statusCode < 300,
        status: mock.statusCode,
        json: async () => mock.body,
      } as Response;
    });

    const session = createPaymentInvoiceSession({
      planId: 'pro_sekolah',
      methodId: 'va_bri',
      buyerName: 'SMAN 2',
      buyerEmail: 'tu@sman2.sch.id',
      deviceId: 'DEV-EARLY-15',
    });

    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_sekolah',
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        buyerEmail: session.buyerEmail,
      },
    });

    const earlyCheck = await verifyPaymentOrderStatusOnline(session);
    expect(earlyCheck.ok).toBe(false);
    expect(earlyCheck.activated).toBe(false);
    expect(earlyCheck.session.status).toBe('pending_payment');
    expect(getUserQuota().tier).toBe('free');
  });

  it('16. Status pembayaran di-refresh berulang kali tetap aman & idempoten sebelum dan sesudah webhook', async () => {
    const code = makeSerial('GM26', 'POLL16');
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const mayarRes = tryHandleMayarV2InvoiceFetch(input);
      if (mayarRes) return mayarRes;
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const mock = await invokeHandler(activateLicenseHandler, { body });
      return {
        ok: mock.statusCode >= 200 && mock.statusCode < 300,
        status: mock.statusCode,
        json: async () => mock.body,
      } as Response;
    });

    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Pak Hendra',
      buyerEmail: 'hendra@sdn.sch.id',
      deviceId: 'DEV-POLL-16',
    });
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        buyerEmail: session.buyerEmail,
      },
    });

    // Refresh 3x sebelum webhook tiba
    for (let i = 0; i < 3; i++) {
      const pre = await verifyPaymentOrderStatusOnline(session);
      expect(pre.activated).toBe(false);
      expect(pre.session.status).toBe('pending_payment');
    }

    // Webhook sah tiba
    await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'EVT-POLL-16',
          mayarInvoiceId: 'INV-MAYAR-POLL16',
          transactionId: 'TXN-POLL-16',
          status: true,
          amount: 99000,
          invoiceId: session.invoiceId,
          deviceId: session.deviceId,
          customerEmail: session.buyerEmail,
          licenseCode: code,
        },
      },
    });

    // Refresh 3x sesudah webhook tiba (1st activates, 2nd & 3rd idempotent replay)
    const after1 = await verifyPaymentOrderStatusOnline(session);
    const after2 = await verifyPaymentOrderStatusOnline(session);
    const after3 = await verifyPaymentOrderStatusOnline(session);
    expect(after1.activated).toBe(true);
    expect(after2.activated).toBe(true);
    expect(after2.idempotentReplay).toBe(true);
    expect(after3.activated).toBe(true);
    expect(after3.idempotentReplay).toBe(true);
  });

  it('17. Dua webhook sukses masuk bersamaan (Promise.all) diproses aman dengan concurrency lock', async () => {
    const code = makeSerial('SK26', 'CONC17');
    const payload = {
      event: 'payment.received',
      data: {
        id: 'EVT-RACE-17',
        mayarInvoiceId: 'INV-MAYAR-RACE17',
        transactionId: 'TXN-RACE-17',
        status: true,
        amount: 749000,
        productId: SCHOOL_PRODUCT_ID,
        licenseCode: code,
      },
    };

    const [resA, resB] = await Promise.all([
      invokeHandler(mayarWebhookHandler, {
        url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
        body: payload,
      }),
      invokeHandler(mayarWebhookHandler, {
        url: `/api/mayar-webhook?token=${TEST_WEBHOOK_SECRET}`,
        body: payload,
      }),
    ]);

    expect(resA.statusCode).toBe(200);
    expect(resB.statusCode).toBe(200);
    const replayCount = [resA.body.idempotentReplay, resB.body.idempotentReplay].filter(Boolean).length;
    const activatedCount = [resA.body.activated, resB.body.activated].filter(Boolean).length;
    expect(activatedCount).toBe(1);
    expect(replayCount).toBe(1);
  });

  // =========================================================================
  // PART D — ADMIN PORTAL SECURITY, PIN ROTATION & RATE LIMITING (SCENARIO 18)
  // =========================================================================
  it('18. Admin Portal menolak legacy PIN saat ADMIN_PIN dirotasi, memblokir aksi non-admin tanpa merusak lisensi aktif, dan menerapkan rate limit 429', async () => {
    const activeCode = makeSerial('GM26', 'SAFE18');
    activateLicense(activeCode);
    expect(getUserQuota().tier).toBe('guru');

    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const hdrs = (init?.headers || {}) as Record<string, string>;
      const mock = await invokeHandler(adminPortalHandler, {
        body,
        headers: hdrs,
        remoteAddress: '10.10.10.18',
      });
      return {
        ok: mock.statusCode >= 200 && mock.statusCode < 300,
        status: mock.statusCode,
        json: async () => mock.body,
      } as Response;
    });

    // Legacy hardcoded PIN '141317!@#' ditolak karena ADMIN_PIN aktif dirotasi ke TEST_ADMIN_PIN
    const legacyListRes = await fetchAdminLicenses('141317!@#');
    expect(legacyListRes.ok).toBe(false);

    // Non-admin mencoba create, reset, delete, seat management, renew dengan PIN salah -> ditolak & lisensi aktif lokal TIDAK boleh dicabut!
    const badCreate = await createAdminLicense('WRONG_PIN', { planType: 'individu', label: 'Hack' });
    const badReset = await resetAdminLicenseSeats('WRONG_PIN', activeCode);
    const badDelete = await deleteAdminLicense('WRONG_PIN', activeCode);
    const badSeat = await manageSchoolTeacherSeatAdmin('WRONG_PIN', activeCode, 'GURU_1', 'disable');
    const badRenew = await renewAdminLicense('WRONG_PIN', activeCode);

    expect(badCreate.ok).toBe(false);
    expect(badReset.ok).toBe(false);
    expect(badDelete.ok).toBe(false);
    expect(badSeat.ok).toBe(false);
    expect(badRenew.ok).toBe(false);
    expect(getUserQuota().tier).toBe('guru'); // Tidak mengalami pencabutan prematur!

    // Percobaan ke-6 dari IP yang sama terkena HTTP 429 rate limit
    const rateLimitedDirect = await invokeHandler(adminPortalHandler, {
      body: { action: 'auth', adminPin: TEST_ADMIN_PIN },
      remoteAddress: '10.10.10.18',
    });
    expect(rateLimitedDirect.statusCode).toBe(429);
    expect(rateLimitedDirect.body.rateLimited).toBe(true);

    // Dari IP bersih dengan ADMIN_PIN yang benar berhasil & clear rate limit
    const legitCreate = await invokeHandler(adminPortalHandler, {
      body: { action: 'create_license', adminPin: TEST_ADMIN_PIN, planType: 'sekolah', label: 'SMAN 1' },
      remoteAddress: '10.10.10.99',
    });
    expect(legitCreate.statusCode).toBe(200);
    expect(legitCreate.body.ok).toBe(true);
    expect(legitCreate.body.created[0].maxSeats).toBe(25);
  });
});
