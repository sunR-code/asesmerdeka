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
  savePaymentOrderRecord,
  saveSeatRecordToRedis,
  saveWebhookTransactionRecord,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS handler tested directly
import mayarWebhookHandler from '../../../api/mayar-webhook.js';
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

async function seedAuthorizedPaymentAuthority(params: {
  invoiceId: string;
  transactionId: string;
  licenseCode: string;
  planId: 'pro_individu' | 'pro_sekolah';
  amount: number;
  deviceId: string;
  buyerName?: string;
  buyerEmail: string;
}) {
  const planType = params.planId === 'pro_sekolah' ? 'sekolah' : 'individu';
  const tier = planType === 'sekolah' ? 'sekolah' : 'guru';
  const maxSeats = planType === 'sekolah' ? 25 : 2;
  const now = new Date().toISOString();
  await savePaymentOrderRecord(params.invoiceId, {
    orderId: params.invoiceId,
    invoiceId: params.invoiceId,
    planId: params.planId,
    planType,
    tier,
    baseAmount: params.amount,
    maxSeats,
    deviceId: params.deviceId,
    buyerName: params.buyerName || 'Bapak/Ibu Guru',
    buyerEmail: params.buyerEmail,
    status: 'paid',
    transactionId: params.transactionId,
    licenseCode: params.licenseCode,
    updatedAt: now,
  });
  await saveWebhookTransactionRecord(params.transactionId, {
    transactionId: params.transactionId,
    orderId: params.invoiceId,
    invoiceId: params.invoiceId,
    licenseCode: params.licenseCode,
    planType,
    tier,
    amount: params.amount,
    deviceId: params.deviceId,
    customerEmail: params.buyerEmail,
    status: 'paid',
    verifiedBy: 'server_authority',
    updatedAt: now,
  });
  await saveSeatRecordToRedis(params.licenseCode, {
    licenseCode: params.licenseCode,
    planType,
    tier,
    maxSeats,
    devices: [],
    usedSeats: 0,
    lifecycleState: 'paid',
    transactionId: params.transactionId,
    updatedAt: now,
  });
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
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
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

    await seedAuthorizedPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-REAL-7103',
      licenseCode: code,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: session.deviceId,
      buyerEmail: session.buyerEmail,
    });

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
    await seedAuthorizedPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-PKG-7104',
      licenseCode: indivCode,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: session.deviceId,
      buyerEmail: session.buyerEmail,
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

    await seedAuthorizedPaymentAuthority({
      invoiceId: 'INV-VICTIM-7105',
      transactionId: 'TXN-VICTIM-7105',
      licenseCode: ownerCode,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: 'DEV-VICTIM-05',
      buyerEmail: 'victim@sdn.sch.id',
    });

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
  // PART B — RETIRED MAYAR WEBHOOK ENDPOINT (410 GONE) (SCENARIOS 6–13)
  // Replaced by task13_mayarDecommissionRegression.test.ts
  // =========================================================================
  it('6. [RETIRED] Endpoint webhook Mayar mengembalikan HTTP 410 Gone meski disertai token query', async () => {
    const res = await invokeHandler(mayarWebhookHandler, {
      url: '/api/mayar-webhook?token=TOKEN_SALAH',
      body: { event: 'payment.received', data: { id: 'TXN-6', status: true, amount: 99000 } },
    });
    expect(res.statusCode).toBe(410);
    expect(res.body.retired).toBe(true);
    expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');
  });

  it('7. [RETIRED] Endpoint webhook Mayar mengembalikan HTTP 410 Gone tanpa membaca MAYAR_WEBHOOK_SECRET', async () => {
    const res = await invokeHandler(mayarWebhookHandler, {
      body: { event: 'payment.received', data: { id: 'TXN-7', status: true, amount: 99000 } },
    });
    expect(res.statusCode).toBe(410);
    expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');
  });

  it('8. [RETIRED] Webhook Mayar tidak membuat transaksi/seat bahkan untuk payload nominal/mata uang apapun (410 Gone)', async () => {
    const code = makeSerial('SK26', 'UNDER8');
    const underRes = await invokeHandler(mayarWebhookHandler, {
      url: '/api/mayar-webhook',
      body: { event: 'payment.received', data: { id: 'EVT-UNDER-8', licenseCode: code } },
    });
    expect(underRes.statusCode).toBe(410);
    expect(underRes.body.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(localWebhookTransactionStore.size).toBe(0);
    expect(localSeatMemoryStore.size).toBe(0);
  });

  it('9. [RETIRED] Webhook Mayar dengan productId apapun tetap ditolak permanen HTTP 410 Gone', async () => {
    const schoolCode = makeSerial('SK26', 'PROD9');
    const res = await invokeHandler(mayarWebhookHandler, {
      body: { event: 'payment.received', data: { id: 'EVT-PROD-9A', licenseCode: schoolCode } },
    });
    expect(res.statusCode).toBe(410);
    expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(localSeatMemoryStore.size).toBe(0);
  });

  it('10. Webhook Mayar replay (RETIRED 410) tetap menjaga kursi perangkat yang sudah aktif sebelumnya', async () => {
    const code = makeSerial('GM26', 'REPLAY10');
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'LAPTOP-10' },
    });

    const payload = {
      event: 'payment.received',
      data: { id: 'EVT-REPLAY-10', licenseCode: code },
    };
    const r1 = await invokeHandler(mayarWebhookHandler, { body: payload });
    const r2 = await invokeHandler(mayarWebhookHandler, { body: payload });

    expect(r1.statusCode).toBe(410);
    expect(r2.statusCode).toBe(410);
    const seatKey = `asesmerdeka:seats:v1:${code}`;
    expect(localSeatMemoryStore.get(seatKey)?.devices).toContain('LAPTOP-10');
  });

  it('11. Server requirePaymentProof menolak pemakaian ulang 1 transactionId untuk lisensi berbeda (403); webhook Mayar 410 (RETIRED)', async () => {
    const c1 = makeSerial('GM26', 'DUP11A');
    const c2 = makeSerial('GM26', 'DUP11B');
    await seedAuthorizedPaymentAuthority({
      invoiceId: 'INV-SHARED-11A',
      transactionId: 'TXN-SHARED-11',
      licenseCode: c1,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: 'DEV-SHARED-11A',
      buyerEmail: 'a@sdn.sch.id',
    });

    const second = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: c2,
        deviceId: 'DEV-SHARED-11B',
        transactionId: 'TXN-SHARED-11',
        requirePaymentProof: true,
      },
    });
    expect(second.statusCode).toBe(403);
    expect(second.body.reason).toBe('TRANSACTION_OWNERSHIP_MISMATCH');

    const whRetired = await invokeHandler(mayarWebhookHandler, {
      body: { event: 'payment.received', data: { id: 'EVT-SHARED-11B', transactionId: 'TXN-SHARED-11', licenseCode: c2 } },
    });
    expect(whRetired.statusCode).toBe(410);
  });

  it('12. [RETIRED] Webhook Mayar payment.pending dikembalikan HTTP 410 Gone tanpa mutasi', async () => {
    const code = makeSerial('GM26', 'PEND12');
    const res = await invokeHandler(mayarWebhookHandler, {
      body: { event: 'payment.pending', data: { id: 'TXN-PEND-12', licenseCode: code } },
    });
    expect(res.statusCode).toBe(410);
    expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');
  });

  it('13. [RETIRED] Webhook Mayar payment.failed & payload boolean status=false mengembalikan HTTP 410 Gone', async () => {
    const code = makeSerial('GM26', 'FAIL13');
    const failedEventRes = await invokeHandler(mayarWebhookHandler, {
      body: { event: 'payment.failed', data: { id: 'TXN-FAIL-13A', status: 'failed', licenseCode: code } },
    });
    expect(failedEventRes.statusCode).toBe(410);
    expect(failedEventRes.body.reason).toBe('MAYAR_DECOMMISSIONED');

    const boolFalseRes = await invokeHandler(mayarWebhookHandler, {
      body: { event: 'payment.received', data: { id: 'TXN-FAIL-13B', status: false, licenseCode: code } },
    });
    expect(boolFalseRes.statusCode).toBe(410);
    expect(boolFalseRes.body.reason).toBe('MAYAR_DECOMMISSIONED');
  });

  // =========================================================================
  // PART C — E2E SERVER-AUTHORITATIVE FLOW, POLLING & CONCURRENCY (14–17)
  // =========================================================================
  it('14. Alur Payment Authority generik: create_payment_order -> otorisasi server -> verifyPaymentOrderStatusOnline', async () => {
    const code = makeSerial('GM26', 'FLOW14');
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

    // 2. Payment authority records verified settlement on server
    await seedAuthorizedPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-AUTH-14',
      licenseCode: code,
      planId: 'pro_individu',
      amount: ONE_TIME_PLANS.pro_individu.price,
      deviceId: session.deviceId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
    });

    // 3. Browser polls server-authoritative order verification
    const verifyRes = await verifyPaymentOrderStatusOnline(session);
    expect(verifyRes.ok).toBe(true);
    expect(verifyRes.activated).toBe(true);
    expect(verifyRes.session.status).toBe('paid');
    expect(getUserQuota().tier).toBe('guru');
  });

  it('15. Pengguna kembali dari checkout sebelum otorisasi pembayaran -> tetap pending_payment (belum aktif)', async () => {
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

  it('16. Status pembayaran di-refresh berulang kali tetap aman & idempoten sebelum dan sesudah konfirmasi server', async () => {
    const code = makeSerial('GM26', 'POLL16');
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

    // Refresh 3x sebelum otorisasi tiba
    for (let i = 0; i < 3; i++) {
      const pre = await verifyPaymentOrderStatusOnline(session);
      expect(pre.activated).toBe(false);
      expect(pre.session.status).toBe('pending_payment');
    }

    // Otoritas pembayaran server menandai order & TX sah
    await seedAuthorizedPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-POLL-16',
      licenseCode: code,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: session.deviceId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
    });

    // Refresh 3x sesudah otorisasi tiba (1st activates, 2nd & 3rd idempotent replay)
    const after1 = await verifyPaymentOrderStatusOnline(session);
    const after2 = await verifyPaymentOrderStatusOnline(session);
    const after3 = await verifyPaymentOrderStatusOnline(session);
    expect(after1.activated).toBe(true);
    expect(after2.activated).toBe(true);
    expect(after2.idempotentReplay).toBe(true);
    expect(after3.activated).toBe(true);
    expect(after3.idempotentReplay).toBe(true);
  });

  it('17. [RETIRED Webhook] Panggilan paralel ke /api/mayar-webhook selalu gagal bersih HTTP 410 Gone tanpa menulis seat', async () => {
    const code = makeSerial('SK26', 'CONC17');
    const payload = {
      event: 'payment.received',
      data: { id: 'EVT-RACE-17', licenseCode: code },
    };

    const [resA, resB] = await Promise.all([
      invokeHandler(mayarWebhookHandler, { body: payload }),
      invokeHandler(mayarWebhookHandler, { body: payload }),
    ]);

    expect(resA.statusCode).toBe(410);
    expect(resB.statusCode).toBe(410);
    expect(localSeatMemoryStore.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
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
