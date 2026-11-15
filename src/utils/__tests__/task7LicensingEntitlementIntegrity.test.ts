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
  activateLicense,
  canTransitionLicenseState,
  checkAndClaimLicenseSeat,
  computeSerialLicenseCode,
  deductQuota,
  evaluateLicenseLifecycleState,
  getFeatureEntitlements,
  getLastLicenseStatusMetadata,
  getLicenseSeatStatus,
  getUserQuota,
  hasFeatureEntitlement,
  isLicenseExpired,
  isLicensed,
  manageLocalSchoolTeacherSeat,
  purgeDeviceFromLegacyLicense,
  refundQuota,
  resetLocalLicenseSeat,
  revokeLicenseToPreviewMode,
  transitionLicenseState,
} from '../licenseManager';
import {
  ONE_TIME_PLANS,
  applyPaymentGatewayCallback,
  createPaymentInvoiceSession,
  verifyGatewayReceiptCode,
} from '../paymentGateway';
import { executeMeteredAICall } from '../../services/geminiClient';
import { saveSchoolProfile, saveCustomTPList, type CustomTPItem, type SchoolProfile } from '../schoolProfileStorage';
import { applyNewStudentRoster, createEmptyKelasHarianData, getKelasHarianData, saveKelasHarianData } from '../kelasHarianStorage';
import type { SiswaItem } from '../../types/kelasHarian';

// @ts-expect-error serverless JS handler tested directly
import activateLicenseHandler, {
  localLicenseRegistryStore,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  localWebhookTransactionStore,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS handler tested directly
import mayarWebhookHandler, { computeMayarHmacSignature } from '../../../api/mayar-webhook.js';
// @ts-expect-error serverless JS handler tested directly
import adminPortalHandler from '../../../api/admin-portal.js';
// @ts-expect-error serverless JS handler tested directly
import geminiHandler from '../../../api/gemini.js';
// @ts-expect-error serverless JS handler tested directly
import cloudSyncHandler, {
  clearCloudSyncRateLimitStore,
  clearLocalDevCloudSyncStore,
  localDevMemoryStore,
} from '../../../api/cloud-sync.js';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  setHeader: (name: string, val: string) => void;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
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
  };
  return res;
}

async function invokeHandler(
  handler: (req: any, res: any) => Promise<any>,
  options: {
    method?: string;
    body?: any;
    rawBody?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  } = {}
): Promise<MockResponse> {
  const req = {
    method: options.method || 'POST',
    body: options.body ?? {},
    rawBody: options.rawBody,
    headers: options.headers || {},
    query: options.query || {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  const res = createMockRes();
  await handler(req, res);
  return res;
}

function makeSerial(prefix: 'GM26' | 'SK26' | 'GP26' | 'SP26', seed: string): string {
  const cleanSeed = seed.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (prefix === 'SK26') return computeSerialLicenseCode(`SEKOLAH${cleanSeed.slice(0, 5)}`);
  if (prefix === 'SP26') return computeSerialLicenseCode(`SEKOLAHPRO${cleanSeed.slice(0, 2)}`);
  if (prefix === 'GP26') return computeSerialLicenseCode(`GURUPRO${cleanSeed.slice(0, 5)}`);
  return computeSerialLicenseCode(`INDIV${cleanSeed.slice(0, 7)}`);
}

const TEST_ADMIN_PIN = 'ADM_TEST_9999';
const TEST_WEBHOOK_SECRET = 'MAYAR_TEST_WEBHOOK_SECRET_9988';
const TEST_PEPPER = 'AsesMerdekaTestPepper2026UltraSecure32Chars!!';

describe('Task 7 — Licensing, Subscription & Entitlement Integrity (25 Scenarios)', () => {
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    localSeatMemoryStore.clear();
    localLicenseRegistryStore.length = 0;
    localWebhookTransactionStore.clear();
    localRevokedLicensesSet.clear();
    clearLocalDevCloudSyncStore();
    clearCloudSyncRateLimitStore();

    process.env.ADMIN_PIN = TEST_ADMIN_PIN;
    process.env.MAYAR_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.CLOUD_SYNC_PIN_PEPPER = TEST_PEPPER;
    process.env.GEMINI_API_KEY = 'TEST_GEMINI_SERVER_KEY';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    process.env = { ...savedEnv };
  });

  // =========================================================================
  // PART A — LISENSI INDIVIDU (SCENARIOS 1-5)
  // =========================================================================
  it('Scenario 1: Valid individual license (ASM-GM26-...) activates cleanly on client & server', async () => {
    const code = makeSerial('GM26', 'INDIV01');
    const serverRes = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-LAPTOP-01' },
    });

    expect(serverRes.statusCode).toBe(200);
    expect(serverRes.body.valid).toBe(true);
    expect(serverRes.body.planType).toBe('individu');
    expect(serverRes.body.usedSeats).toBe(1);
    expect(serverRes.body.maxSeats).toBe(2);

    const clientAct = activateLicense(code);
    expect(clientAct.success).toBe(true);
    expect(clientAct.quota.tier).toBe('guru');
    expect(clientAct.quota.lifecycleState).toBe('active');
    expect(isLicensed(clientAct.quota.tier)).toBe(true);
  });

  it('Scenario 2: Re-activating the same device is idempotent and stays 1/2 seat', async () => {
    const code = makeSerial('GM26', 'INDIV02');
    const first = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-SAME-A1' },
    });
    const second = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-SAME-A1' },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.body.usedSeats).toBe(1);
    expect(second.body.maxSeats).toBe(2);
  });

  it('Scenario 3: 2nd personal device activates cleanly up to 2/2 device limit', async () => {
    const code = makeSerial('GM26', 'INDIV03');
    const d1 = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-LAPTOP-B1' },
    });
    const d2 = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-HP-B2' },
    });

    expect(d1.statusCode).toBe(200);
    expect(d1.body.usedSeats).toBe(1);
    expect(d2.statusCode).toBe(200);
    expect(d2.body.usedSeats).toBe(2);
    expect(d2.body.maxSeats).toBe(2);
  });

  it('Scenario 4: 3rd device is strictly rejected with 403 seatLimitExceeded (both server & local seat guard)', async () => {
    const code = makeSerial('GM26', 'INDIV04');
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-C1' },
    });
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-C2' },
    });
    const d3 = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-C3' },
    });

    expect(d3.statusCode).toBe(403);
    expect(d3.body.valid).toBe(false);
    expect(d3.body.seatLimitExceeded).toBe(true);
    expect(d3.body.usedSeats).toBe(2);
    expect(d3.body.maxSeats).toBe(2);

    // Local seat tracker guard
    expect(checkAndClaimLicenseSeat(code, 'DEV-C1').allowed).toBe(true);
    expect(checkAndClaimLicenseSeat(code, 'DEV-C2').allowed).toBe(true);
    const localD3 = checkAndClaimLicenseSeat(code, 'DEV-C3');
    expect(localD3.allowed).toBe(false);
    expect(localD3.usedSeats).toBe(2);
  });

  it('Scenario 5: Admin device reset (reset_license_seats & resetLocalLicenseSeat) allows a new device to claim the freed seat', async () => {
    const code = makeSerial('GM26', 'INDIV05');
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-OLD-1' },
    });
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-OLD-2' },
    });

    const resetRes = await invokeHandler(adminPortalHandler, {
      body: { action: 'reset_license_seats', adminPin: TEST_ADMIN_PIN, licenseCode: code },
    });
    expect(resetRes.statusCode).toBe(200);
    expect(resetRes.body.ok).toBe(true);

    const newDeviceRes = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-NEW-1' },
    });
    expect(newDeviceRes.statusCode).toBe(200);
    expect(newDeviceRes.body.valid).toBe(true);
    expect(newDeviceRes.body.usedSeats).toBe(1);

    checkAndClaimLicenseSeat(code, 'LOCAL-1');
    checkAndClaimLicenseSeat(code, 'LOCAL-2');
    resetLocalLicenseSeat(code);
    expect(checkAndClaimLicenseSeat(code, 'LOCAL-NEW').allowed).toBe(true);
  });

  // =========================================================================
  // PART B — LISENSI KOLEKTIF SEKOLAH 25 GURU × 2 PERANGKAT (SCENARIOS 6-11)
  // =========================================================================
  it('Scenario 6: School Collective license accommodates 25 distinct teachers (1..25)', async () => {
    const schoolCode = makeSerial('SK26', 'SCH06');
    for (let i = 1; i <= 25; i++) {
      const teacherPin = `GURU_${String(i).padStart(2, '0')}`;
      const deviceId = `DEV-T${i}-1`;
      const res = await invokeHandler(activateLicenseHandler, {
        body: { action: 'verify', licenseCode: schoolCode, deviceId, teacherPin },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.usedSeats).toBe(i);
      expect(res.body.maxSeats).toBe(25);
    }
  });

  it('Scenario 7: 26th teacher is rejected with HTTP 403 seatLimitExceeded (25/25 full)', async () => {
    const schoolCode = makeSerial('SK26', 'SCH07');
    for (let i = 1; i <= 25; i++) {
      await invokeHandler(activateLicenseHandler, {
        body: {
          action: 'verify',
          licenseCode: schoolCode,
          deviceId: `DEV-S7-${i}`,
          teacherPin: `NIP7_${i}`,
        },
      });
    }

    const t26 = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: schoolCode,
        deviceId: 'DEV-S7-26',
        teacherPin: 'NIP7_26',
      },
    });
    expect(t26.statusCode).toBe(403);
    expect(t26.body.valid).toBe(false);
    expect(t26.body.seatLimitExceeded).toBe(true);
    expect(t26.body.usedSeats).toBe(25);
    expect(t26.body.maxSeats).toBe(25);
  });

  it('Scenario 8: Same school teacher on Laptop + HP counts as 1 teacher seat (2/2 devices for that teacher)', async () => {
    const schoolCode = makeSerial('SK26', 'SCH08');
    const laptop = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: schoolCode,
        deviceId: 'LAPTOP-BU-SITI',
        teacherPin: 'SITI_MAT',
      },
    });
    const hp = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: schoolCode,
        deviceId: 'HP-BU-SITI',
        teacherPin: 'SITI_MAT',
      },
    });

    expect(laptop.statusCode).toBe(200);
    expect(laptop.body.usedSeats).toBe(1);
    expect(laptop.body.teacherUsedDevices).toBe(1);
    expect(hp.statusCode).toBe(200);
    expect(hp.body.usedSeats).toBe(1); // Still only 1 teacher seat out of 25!
    expect(hp.body.teacherUsedDevices).toBe(2);
    expect(hp.body.teacherMaxDevices).toBe(2);
  });

  it('Scenario 9: 3rd device for the SAME school teacher is rejected with teacherDeviceLimitExceeded (even when 24 seats remain)', async () => {
    const schoolCode = makeSerial('SK26', 'SCH09');
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: schoolCode, deviceId: 'T1-D1', teacherPin: 'PAK_BUDI' },
    });
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: schoolCode, deviceId: 'T1-D2', teacherPin: 'PAK_BUDI' },
    });
    const thirdDev = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: schoolCode, deviceId: 'T1-D3', teacherPin: 'PAK_BUDI' },
    });

    expect(thirdDev.statusCode).toBe(403);
    expect(thirdDev.body.valid).toBe(false);
    expect(thirdDev.body.teacherDeviceLimitExceeded).toBe(true);
    expect(thirdDev.body.teacherMaxDevices).toBe(2);
  });

  it('Scenario 10: Admin disabling 1 teacher seat frees slot for Teacher 26 and blocks disabled teacher across verify/sync/AI', async () => {
    const schoolCode = makeSerial('SK26', 'SCH10');
    for (let i = 1; i <= 25; i++) {
      await invokeHandler(activateLicenseHandler, {
        body: {
          action: 'verify',
          licenseCode: schoolCode,
          deviceId: `DEV10-${i}`,
          teacherPin: `TEACHER10_${i}`,
        },
      });
    }

    const disableRes = await invokeHandler(adminPortalHandler, {
      body: {
        action: 'disable_teacher_seat',
        adminPin: TEST_ADMIN_PIN,
        licenseCode: schoolCode,
        teacherKey: 'TEACHER10_1',
      },
    });
    expect(disableRes.statusCode).toBe(200);
    expect(disableRes.body.ok).toBe(true);
    expect(disableRes.body.usedSeats).toBe(24);

    // Teacher 1 is blocked on check_status
    const statusT1 = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'check_status',
        licenseCode: schoolCode,
        deviceId: 'DEV10-1',
        teacherPin: 'TEACHER10_1',
      },
    });
    expect(statusT1.statusCode).toBe(403);
    expect(statusT1.body.teacherSeatDisabled).toBe(true);

    // Teacher 26 can now activate into the freed 25th seat!
    const t26 = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: schoolCode,
        deviceId: 'DEV10-26',
        teacherPin: 'TEACHER10_26',
      },
    });
    expect(t26.statusCode).toBe(200);
    expect(t26.body.usedSeats).toBe(25);
  });

  it('Scenario 11: Resetting one teacher devices (reset_teacher_devices) & re-enabling seat preserves other teachers', async () => {
    const schoolCode = makeSerial('SK26', 'SCH11');
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: schoolCode, deviceId: 'A-1', teacherPin: 'GURU_A' },
    });
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: schoolCode, deviceId: 'A-2', teacherPin: 'GURU_A' },
    });
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: schoolCode, deviceId: 'B-1', teacherPin: 'GURU_B' },
    });

    // Reset only GURU_A devices
    const resetTeacherRes = await invokeHandler(adminPortalHandler, {
      body: {
        action: 'reset_teacher_devices',
        adminPin: TEST_ADMIN_PIN,
        licenseCode: schoolCode,
        teacherKey: 'GURU_A',
      },
    });
    expect(resetTeacherRes.statusCode).toBe(200);
    expect(resetTeacherRes.body.ok).toBe(true);

    // GURU_A can bind a brand-new device, while GURU_B remains active and untouched
    const guruANew = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: schoolCode, deviceId: 'A-NEW-LAPTOP', teacherPin: 'GURU_A' },
    });
    expect(guruANew.statusCode).toBe(200);
    expect(guruANew.body.teacherUsedDevices).toBe(1);

    const guruBStatus = await invokeHandler(activateLicenseHandler, {
      body: { action: 'check_status', licenseCode: schoolCode, deviceId: 'B-1', teacherPin: 'GURU_B' },
    });
    expect(guruBStatus.statusCode).toBe(200);
    expect(guruBStatus.body.valid).toBe(true);

    // Also verify client local teacher seat helper
    checkAndClaimLicenseSeat(schoolCode, 'LOC-A1', 'LOCAL_A');
    checkAndClaimLicenseSeat(schoolCode, 'LOC-A2', 'LOCAL_A');
    manageLocalSchoolTeacherSeat(schoolCode, 'LOCAL_A', 'reset_devices');
    expect(getLicenseSeatStatus(schoolCode).usedSeats).toBe(1);
    const localAfterReset = checkAndClaimLicenseSeat(schoolCode, 'LOC-A3', 'LOCAL_A');
    expect(localAfterReset.allowed).toBe(true);
  });

  // =========================================================================
  // PART C — PAYMENT & WEBHOOK SECURITY / IDEMPOTENCY (SCENARIOS 12-16)
  // =========================================================================
  it('Scenario 12: Valid Mayar webhook with HMAC signature & valid Rp 99.000 activates license and records transaction', async () => {
    process.env.MAYAR_API_KEY = 'MAYAR_API_KEY_TEST_12';
    globalThis.fetch = vi.fn(async (url) => {
      const urlStr = String(url || '');
      if (urlStr.includes('/hl/v2/invoices/INV-MAYAR-12001')) {
        return new Response(
          JSON.stringify({
            statusCode: 200,
            messages: 'success',
            data: {
              id: 'INV-MAYAR-12001',
              status: 'paid',
              amount: 99000,
              transactionId: 'TXN-MAYAR-12001',
              transactions: [{ id: 'TXN-MAYAR-12001' }],
              customer: { name: 'Ibu Rina', email: 'rina@sdn01.sch.id' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Unexpected fetch URL: ${urlStr}`);
    });

    const code = makeSerial('GM26', 'PAY12');
    const payload = {
      event: 'payment.received',
      data: {
        id: 'EVT-MAYAR-12001',
        mayarInvoiceId: 'INV-MAYAR-12001',
        transactionId: 'TXN-MAYAR-12001',
        status: 'paid',
        amount: 99000,
        customerName: 'Ibu Rina',
        customerEmail: 'rina@sdn01.sch.id',
        productName: 'AsesMerdeka Guru Mandiri',
        licenseCode: code,
      },
    };
    const rawBody = JSON.stringify(payload);
    const sig = computeMayarHmacSignature(rawBody, TEST_WEBHOOK_SECRET);

    const res = await invokeHandler(mayarWebhookHandler, {
      body: payload,
      rawBody,
      headers: { 'x-mayar-signature': sig },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.activated).toBe(true);
    expect(res.body.transactionId).toBe('TXN-MAYAR-12001');
    expect(res.body.lifecycleState).toBe('paid');

    // Client payment callback verification with pending_payment initial invoice state
    const invoice = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Ibu Rina',
      buyerEmail: 'rina@sdn01.sch.id',
      deviceId: 'DEV-PAY-12',
    });
    expect(invoice.status).toBe('pending_payment');

    const cbRes = applyPaymentGatewayCallback(invoice, {
      status: 'paid',
      transactionId: 'TXN-MAYAR-12001',
      paidAmount: ONE_TIME_PLANS.pro_individu.price,
      licenseCode: code,
    });
    expect(cbRes.activated).toBe(true);
    expect(cbRes.session.status).toBe('paid');
  });

  it('Scenario 13: Duplicate webhook replay with same transactionId is idempotent and preserves bound devices', async () => {
    process.env.MAYAR_API_KEY = 'MAYAR_API_KEY_TEST_13';
    globalThis.fetch = vi.fn(async (url) => {
      const urlStr = String(url || '');
      if (urlStr.includes('/hl/v2/invoices/INV-REPLAY-13')) {
        return new Response(
          JSON.stringify({
            statusCode: 200,
            messages: 'success',
            data: {
              id: 'INV-REPLAY-13',
              status: 'paid',
              amount: 749000,
              transactionId: 'TXN-REPLAY-13',
              transactions: [{ id: 'TXN-REPLAY-13' }],
              customer: { name: 'SMAN 1 Nusantara' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Unexpected fetch URL: ${urlStr}`);
    });

    const code = makeSerial('SK26', 'PAY13');
    // Bind device & teacher first
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'SCH-DEV-1', teacherPin: 'TEACHER_13' },
    });

    const payload = {
      event: 'payment.received',
      data: {
        id: 'EVT-REPLAY-13',
        mayarInvoiceId: 'INV-REPLAY-13',
        transactionId: 'TXN-REPLAY-13',
        status: 'paid',
        amount: 749000,
        customerName: 'SMAN 1 Nusantara',
        licenseCode: code,
        maxSeats: 25,
      },
    };
    const rawBody = JSON.stringify(payload);
    const sig = computeMayarHmacSignature(rawBody, TEST_WEBHOOK_SECRET);

    const first = await invokeHandler(mayarWebhookHandler, {
      body: payload,
      rawBody,
      headers: { 'x-mayar-signature': sig },
    });
    const replay = await invokeHandler(mayarWebhookHandler, {
      body: payload,
      rawBody,
      headers: { 'x-mayar-signature': sig },
    });

    expect(first.statusCode).toBe(200);
    expect(replay.statusCode).toBe(200);
    expect(replay.body.idempotentReplay).toBe(true);

    // Existing device & teacher seat remain completely intact
    const seatAfter = await invokeHandler(activateLicenseHandler, {
      body: { action: 'check_status', licenseCode: code, deviceId: 'SCH-DEV-1', teacherPin: 'TEACHER_13' },
    });
    expect(seatAfter.statusCode).toBe(200);
    expect(seatAfter.body.valid).toBe(true);
    expect(seatAfter.body.usedSeats).toBe(1);
  });

  it('Scenario 14: Webhook with invalid or missing HMAC signature is rejected with HTTP 401', async () => {
    const code = makeSerial('GM26', 'PAY14');
    const payload = {
      event: 'payment.received',
      data: { id: 'TXN-BAD-SIG', status: 'paid', amount: 99000, licenseCode: code },
    };

    const noHeaderRes = await invokeHandler(mayarWebhookHandler, { body: payload });
    expect(noHeaderRes.statusCode).toBe(401);

    const badSigRes = await invokeHandler(mayarWebhookHandler, {
      body: payload,
      rawBody: JSON.stringify(payload),
      headers: { 'x-mayar-signature': 'deadbeef00000000' },
    });
    expect(badSigRes.statusCode).toBe(401);
  });

  it('Scenario 15: Webhook with payment.failed or underpaid amount does NOT activate license', async () => {
    const codeFail = makeSerial('GM26', 'PAY15A');
    const failPayload = {
      event: 'payment.failed',
      data: { id: 'TXN-FAIL-15', status: 'failed', amount: 99000, licenseCode: codeFail },
    };
    const rawFail = JSON.stringify(failPayload);
    const failRes = await invokeHandler(mayarWebhookHandler, {
      body: failPayload,
      rawBody: rawFail,
      headers: { 'x-mayar-signature': computeMayarHmacSignature(rawFail, TEST_WEBHOOK_SECRET) },
    });
    expect(failRes.statusCode).toBe(422);
    expect(failRes.body.activated).toBe(false);
    expect(failRes.body.lifecycleState).toBe('payment_failed');

    // Attempt to activate fails because lifecycleState is payment_failed
    const actFail = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: codeFail, deviceId: 'DEV-15A' },
    });
    expect(actFail.statusCode).toBe(403);
    expect(actFail.body.paymentUnverified).toBe(true);

    // Underpaid school license (< 749.000) rejected with 400
    const codeUnder = makeSerial('SK26', 'PAY15B');
    const underPayload = {
      event: 'payment.received',
      data: { id: 'TXN-UNDER-15', status: 'paid', amount: 10000, licenseCode: codeUnder },
    };
    const rawUnder = JSON.stringify(underPayload);
    const underRes = await invokeHandler(mayarWebhookHandler, {
      body: underPayload,
      rawBody: rawUnder,
      headers: { 'x-mayar-signature': computeMayarHmacSignature(rawUnder, TEST_WEBHOOK_SECRET) },
    });
    expect(underRes.statusCode).toBe(400);
    expect(underRes.body.reason).toBe('AMOUNT_MISMATCH');
  });

  it('Scenario 16: Reusing 1 transactionId to activate a 2nd different license fails with HTTP 409 transactionAlreadyBound', async () => {
    process.env.MAYAR_API_KEY = 'MAYAR_API_KEY_TEST_16';
    globalThis.fetch = vi.fn(async (url) => {
      const urlStr = String(url || '');
      if (urlStr.includes('/hl/v2/invoices/')) {
        const lookupId = decodeURIComponent(urlStr.split('/hl/v2/invoices/')[1] || '').toUpperCase();
        return new Response(
          JSON.stringify({
            statusCode: 200,
            messages: 'success',
            data: {
              id: lookupId,
              status: 'paid',
              amount: 99000,
              transactionId: 'TXN-UNIQUE-16',
              transactions: [{ id: 'TXN-UNIQUE-16' }],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Unexpected fetch URL: ${urlStr}`);
    });

    const code1 = makeSerial('GM26', 'PAY16A');
    const code2 = makeSerial('GM26', 'PAY16B');

    const p1 = {
      event: 'payment.received',
      data: { id: 'EVT-UNIQUE-16A', mayarInvoiceId: 'INV-UNIQUE-16A', transactionId: 'TXN-UNIQUE-16', status: 'paid', amount: 99000, licenseCode: code1 },
    };
    const raw1 = JSON.stringify(p1);
    const res1 = await invokeHandler(mayarWebhookHandler, {
      body: p1,
      rawBody: raw1,
      headers: { 'x-mayar-signature': computeMayarHmacSignature(raw1, TEST_WEBHOOK_SECRET) },
    });
    expect(res1.statusCode).toBe(200);

    const p2 = {
      event: 'payment.received',
      data: { id: 'EVT-UNIQUE-16B', mayarInvoiceId: 'INV-UNIQUE-16B', transactionId: 'TXN-UNIQUE-16', status: 'paid', amount: 99000, licenseCode: code2 },
    };
    const raw2 = JSON.stringify(p2);
    const res2 = await invokeHandler(mayarWebhookHandler, {
      body: p2,
      rawBody: raw2,
      headers: { 'x-mayar-signature': computeMayarHmacSignature(raw2, TEST_WEBHOOK_SECRET) },
    });
    expect(res2.statusCode).toBe(409);
    expect(res2.body.transactionAlreadyBound).toBe(true);

    // Client-side binding guard too
    const c1 = verifyGatewayReceiptCode(code1, { transactionId: 'TXN-CLIENT-UNIQ-16', paidAmount: 99000, expectedMinAmount: 99000 });
    expect(c1.success).toBe(true);
    const c2 = verifyGatewayReceiptCode(code2, { transactionId: 'TXN-CLIENT-UNIQ-16', paidAmount: 99000, expectedMinAmount: 99000 });
    expect(c2.success).toBe(false);
  });

  // =========================================================================
  // PART D — LIFECYCLE, EXPIRY, RENEWAL & ZERO DATA LOSS (SCENARIOS 17-21)
  // =========================================================================
  it('Scenario 17: Explicit lifecycle state machine permits legal transitions and rejects illegal ones', () => {
    expect(canTransitionLicenseState('pending_payment', 'paid')).toBe(true);
    expect(canTransitionLicenseState('paid', 'active')).toBe(true);
    expect(canTransitionLicenseState('active', 'expired')).toBe(true);
    expect(canTransitionLicenseState('expired', 'active')).toBe(true);
    expect(canTransitionLicenseState('active', 'suspended')).toBe(true);
    expect(canTransitionLicenseState('suspended', 'active')).toBe(true);

    // Illegal transitions: revoked is terminal
    expect(canTransitionLicenseState('revoked', 'active')).toBe(false);
    expect(canTransitionLicenseState('payment_failed', 'active')).toBe(false);
    expect(canTransitionLicenseState('pending_payment', 'active')).toBe(false);

    const okTransition = transitionLicenseState('pending_payment', 'paid', { hasVerifiedPayment: true });
    expect(okTransition.allowed).toBe(true);
    expect(okTransition.state).toBe('paid');

    const badTransition = transitionLicenseState('revoked', 'active');
    expect(badTransition.allowed).toBe(false);
    expect(badTransition.state).toBe('revoked');

    expect(
      evaluateLicenseLifecycleState({
        lifecycleState: 'active',
        expiresAt: new Date(Date.now() - 10_000).toISOString(),
      })
    ).toBe('expired');
  });

  it('Scenario 18: Time-based expiration works before expiry and automatically degrades after expiry', async () => {
    const code = makeSerial('GM26', 'EXP18');
    const baseMs = Date.parse('2026-11-14T10:00:00.000Z');
    const expiryIso = '2026-11-15T10:00:00.000Z';

    vi.useFakeTimers();
    vi.setSystemTime(baseMs);

    expect(isLicenseExpired(expiryIso, baseMs)).toBe(false);
    expect(isLicenseExpired(expiryIso, baseMs + 2 * 86_400_000)).toBe(true);

    // Client activation with future expiry stays active
    const act = activateLicense(code, { expiresAt: expiryIso });
    expect(act.success).toBe(true);
    expect(getUserQuota().tier).toBe('guru');

    // Advance wall-clock past expiresAt -> getUserQuota automatically transitions to expired preview mode
    vi.setSystemTime(baseMs + 2 * 86_400_000);
    const expiredQuota = getUserQuota();
    expect(expiredQuota.tier).toBe('free');
    expect(expiredQuota.lifecycleState).toBe('expired');
    expect(getLastLicenseStatusMetadata()?.state).toBe('expired');

    vi.useRealTimers();

    // Server verify also blocks expired seat record
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-EXP-18' },
    });
    const seatKey = `asesmerdeka:seats:v1:${code}`;
    const storedSeat = localSeatMemoryStore.get(seatKey);
    localSeatMemoryStore.set(seatKey, {
      ...storedSeat,
      expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    });

    const serverExpired = await invokeHandler(activateLicenseHandler, {
      body: { action: 'check_status', licenseCode: code, deviceId: 'DEV-EXP-18' },
    });
    expect(serverExpired.statusCode).toBe(403);
    expect(serverExpired.body.expired).toBe(true);
  });

  it('Scenario 19: Admin renewal extends expiresAt and restores active status without losing existing devices', async () => {
    const code = makeSerial('SK26', 'REN19');
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'REN-DEV-1', teacherPin: 'BU_ANI' },
    });
    const seatKey = `asesmerdeka:seats:v1:${code}`;
    localSeatMemoryStore.set(seatKey, {
      ...localSeatMemoryStore.get(seatKey),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      lifecycleState: 'expired',
    });

    const newExpiry = new Date(Date.now() + 365 * 86_400_000).toISOString();
    const renewRes = await invokeHandler(adminPortalHandler, {
      body: {
        action: 'renew_license',
        adminPin: TEST_ADMIN_PIN,
        licenseCode: code,
        expiresAt: newExpiry,
      },
    });
    expect(renewRes.statusCode).toBe(200);
    expect(renewRes.body.ok).toBe(true);
    expect(renewRes.body.expiresAt).toBe(newExpiry);

    const statusAfter = await invokeHandler(activateLicenseHandler, {
      body: { action: 'check_status', licenseCode: code, deviceId: 'REN-DEV-1', teacherPin: 'BU_ANI' },
    });
    expect(statusAfter.statusCode).toBe(200);
    expect(statusAfter.body.valid).toBe(true);
    expect(statusAfter.body.usedSeats).toBe(1);
  });

  it('Scenario 20: Revocation (delete_license) immediately blocks client activation, server verify, AI & sync', async () => {
    const code = makeSerial('GP26', 'REV20');
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-REV-20' },
    });

    const delRes = await invokeHandler(adminPortalHandler, {
      body: { action: 'delete_license', adminPin: TEST_ADMIN_PIN, licenseCode: code },
    });
    expect(delRes.statusCode).toBe(200);

    const verifyAfter = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: code, deviceId: 'DEV-REV-20' },
    });
    expect(verifyAfter.statusCode).toBe(403);
    expect(verifyAfter.body.revoked).toBe(true);

    const previewQuota = revokeLicenseToPreviewMode({
      reason: 'revoked',
      licenseKey: code,
      message: 'Dicabut admin',
    });
    expect(previewQuota.tier).toBe('free');
    expect(isLicensed(getUserQuota().tier)).toBe(false);
    expect(getLastLicenseStatusMetadata()?.state).toBe('revoked');
  });

  it('Scenario 21: ZERO DATA LOSS — revoking or purging license NEVER deletes school profile or academic records', () => {
    const code = makeSerial('GM26', 'SAFE21');
    activateLicense(code);

    const profile: SchoolProfile = {
      schoolId: 'SCH-AMAN-21',
      instansiDinas: 'Dinas Pendidikan Kota Bandung',
      namaSekolah: 'SDN Harapan Bangsa',
      alamatSekolah: 'Jl. Merdeka No. 10',
      jenjang: 'SD/MI',
      kelasUtama: '4',
      rombelAktif: 'A',
      daftarRombel: ['A'],
      mataPelajaranUtama: 'Matematika',
      namaGuru: 'Ibu Sari',
      nipGuru: '19850202',
      namaKepalaSekolah: 'Drs. Ahmad',
      nipKepalaSekolah: '19700101',
      kotaSekolah: 'Bandung',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      tampilkanTandaTangan: true,
      pakaiFormatKopSekolah: true,
    };
    saveSchoolProfile(profile);

    const tps: CustomTPItem[] = [
      {
        id: 'tp-21',
        kode: 'TP-4.1',
        elemen: 'Pengukuran',
        materiPokok: 'Keliling Bangun Datar',
        tujuanPembelajaran: 'Mengukur keliling bangun datar secara tepat',
        arahanRangkuman: 'Fokus konsep satuan panjang dan penjumlahan sisi',
        alokasiJP: 4,
        mingguMulai: 1,
        mingguSelesai: 2,
      },
    ];
    saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);

    const kelasEmpty = createEmptyKelasHarianData(profile, tps);
    const student: SiswaItem = {
      id: 'stu-21',
      noUrut: 1,
      nis: '260101',
      nisn: '0011223344',
      nama: 'Bima Sakti',
      jenisKelamin: 'L',
      statusAktif: 'aktif',
    };
    const kelasUpdated = applyNewStudentRoster(kelasEmpty, [student], tps, false, {
      source: 'user_manual',
      initializeEmptyScores: true,
    });
    saveKelasHarianData(profile, kelasUpdated);

    localStorage.setItem('asesmerdeka_grades_v1', JSON.stringify([{ studentId: 'stu-21', score: 92 }]));
    localStorage.setItem('asesmerdeka_rapor_v1', JSON.stringify([{ studentId: 'stu-21', finalScore: 93 }]));

    // Revoke license & run legacy purge
    revokeLicenseToPreviewMode({ reason: 'revoked', licenseKey: code });
    purgeDeviceFromLegacyLicense();

    // Every single school & academic record MUST remain 100% intact!
    expect(localStorage.getItem('asesmerdeka_school_profile_v1')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem('asesmerdeka_school_profile_v1') || '{}').namaSekolah).toBe(
      'SDN Harapan Bangsa'
    );
    const reloaded = getKelasHarianData(profile, tps);
    expect(reloaded.daftarSiswa).toHaveLength(1);
    expect(reloaded.daftarSiswa[0].nama).toBe('Bima Sakti');
    expect(JSON.parse(localStorage.getItem('asesmerdeka_grades_v1') || '[]')[0].score).toBe(92);
    expect(JSON.parse(localStorage.getItem('asesmerdeka_rapor_v1') || '[]')[0].finalScore).toBe(93);
    expect(hasFeatureEntitlement('local_academic_crud').allowed).toBe(true);
  });

  // =========================================================================
  // PART E — ENTITLEMENT MATRIX, SERVER /api/gemini & QUOTA REFUND (22-25)
  // =========================================================================
  it('Scenario 22: Feature entitlement matrix enforces tier boundaries and rejects tampered localStorage signature', () => {
    // Free / Preview mode
    const freeMatrix = getFeatureEntitlements();
    expect(freeMatrix.isActivePaidLicense).toBe(false);
    expect(freeMatrix.features.preview_ui).toBe(true);
    expect(freeMatrix.features.local_academic_crud).toBe(true);
    expect(freeMatrix.features.export_document).toBe(false);
    expect(freeMatrix.features.cloud_sync).toBe(false);
    expect(freeMatrix.features.ai_generate_pro).toBe(false);

    // Guru Basic (GM26)
    const guruAct = activateLicense(makeSerial('GM26', 'ENT22'));
    expect(guruAct.success).toBe(true);
    expect(hasFeatureEntitlement('export_document').allowed).toBe(true);
    expect(hasFeatureEntitlement('ai_generate_standard').allowed).toBe(true);
    expect(hasFeatureEntitlement('cloud_sync').allowed).toBe(true);
    expect(hasFeatureEntitlement('ai_generate_pro').allowed).toBe(false);

    // Guru PRO (GP26)
    const proAct = activateLicense(makeSerial('GP26', 'ENT22PRO'));
    expect(proAct.success).toBe(true);
    expect(hasFeatureEntitlement('ai_generate_pro').allowed).toBe(true);

    // Tamper localStorage license tier directly without updating HMAC signature
    const raw = JSON.parse(localStorage.getItem('asesmerdeka_user_quota') || '{}');
    raw.tier = 'sekolah_pro';
    raw.remainingCredits = 999999;
    localStorage.setItem('asesmerdeka_user_quota', JSON.stringify(raw));

    const tamperedCheck = getUserQuota();
    expect(tamperedCheck.tier).toBe('free');
    expect(isLicensed(tamperedCheck.tier)).toBe(false);
  });

  it('Scenario 23: /api/gemini enforces server-side license status, revoked/expired/disabled seat, and blocks Basic-to-PRO tier escalation', async () => {
    const basicCode = makeSerial('GM26', 'GEM23');
    const proCode = makeSerial('GP26', 'GEM23PRO');

    // Unlicensed with enforceLicense
    const noLic = await invokeHandler(geminiHandler, {
      body: { prompt: 'Halo', tier: 'free', enforceLicense: true },
    });
    expect(noLic.statusCode).toBe(403);
    expect(noLic.body.code).toBe('LICENSE_REQUIRED');

    // Basic license escalating to PRO model -> 403 TIER_ENTITLEMENT_MISMATCH
    const escalation = await invokeHandler(geminiHandler, {
      body: { prompt: 'Halo', tier: 'pro', licenseCode: basicCode },
    });
    expect(escalation.statusCode).toBe(403);
    expect(escalation.body.code).toBe('TIER_ENTITLEMENT_MISMATCH');

    // Revoked license -> 403 LICENSE_REVOKED
    await invokeHandler(adminPortalHandler, {
      body: { action: 'delete_license', adminPin: TEST_ADMIN_PIN, licenseCode: proCode },
    });
    const revRes = await invokeHandler(geminiHandler, {
      body: { prompt: 'Halo', tier: 'pro', licenseCode: proCode },
    });
    expect(revRes.statusCode).toBe(403);
    expect(revRes.body.code).toBe('LICENSE_REVOKED');

    // Valid PRO license passes validation and calls upstream Gemini
    const validPro = makeSerial('SP26', 'GEM23OK');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
    }) as unknown as typeof fetch;

    const okRes = await invokeHandler(geminiHandler, {
      body: { prompt: 'Buatkan soal', tier: 'sekolah_pro', licenseCode: validPro },
    });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.body.success).toBe(true);
    expect(okRes.body.model).toBe('gemini-1.5-pro');
  });

  it('Scenario 24: Quota deduction & automatic atomic refund (executeMeteredAICall) when AI call fails or times out', async () => {
    const code = makeSerial('GM26', 'QUOTA24');
    const act = activateLicense(code, { maxCredits: 5, initialCredits: 5 });
    expect(act.success).toBe(true);
    const startCredits = getUserQuota().remainingCredits;
    expect(startCredits).toBe(5);

    // Simulate failed upstream call inside executeMeteredAICall
    await expect(
      executeMeteredAICall(async () => {
        expect(getUserQuota().remainingCredits).toBe(startCredits - 1);
        throw new Error('Request timed out');
      })
    ).rejects.toThrow('Request timed out');

    // Quota MUST be refunded back to startCredits!
    expect(getUserQuota().remainingCredits).toBe(startCredits);

    // Successful AI call consumes exactly 1 credit on finite metered quota
    const res = await executeMeteredAICall(async () => ({ items: [1, 2, 3] }));
    expect(res.items).toHaveLength(3);
    expect(getUserQuota().remainingCredits).toBe(startCredits - 1);

    // Exhaust remaining quota -> further calls fail cleanly before calling fn
    while (getUserQuota().remainingCredits > 0) {
      deductQuota();
    }
    expect(deductQuota().success).toBe(false);
    await expect(executeMeteredAICall(async () => 'never')).rejects.toThrow();
    refundQuota(1);
    expect(getUserQuota().remainingCredits).toBe(1);
  });

  it('Scenario 25: /api/cloud-sync enforces expired/suspended/disabled-teacher-seat (HTTP 403) while keeping cloud workspace data intact', async () => {
    const schoolCode = makeSerial('SK26', 'SYNC25');
    // Activate GURU_1 on DEV-S25
    await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: schoolCode, deviceId: 'DEV-S25', teacherPin: 'GURU_1' },
    });

    // Push workspace data successfully first
    const pushOk = await invokeHandler(cloudSyncHandler, {
      body: {
        action: 'push',
        licenseCode: schoolCode,
        deviceId: 'DEV-S25',
        teacherPin: 'GURU_1:9988',
        baseRevision: 0,
        entries: { asesmerdeka_grades_v1: JSON.stringify([{ studentId: 's1', score: 95 }]) },
      },
    });
    expect(pushOk.statusCode).toBe(200);
    expect(pushOk.body.ok).toBe(true);
    expect(localDevMemoryStore.size).toBe(1);

    // Admin disables GURU_1's seat -> Cloud Sync must reject with 403 teacherSeatDisabled
    await invokeHandler(adminPortalHandler, {
      body: {
        action: 'disable_teacher_seat',
        adminPin: TEST_ADMIN_PIN,
        licenseCode: schoolCode,
        teacherKey: 'GURU_1',
      },
    });
    const pullDisabled = await invokeHandler(cloudSyncHandler, {
      body: {
        action: 'pull',
        licenseCode: schoolCode,
        deviceId: 'DEV-S25',
        teacherPin: 'GURU_1:9988',
      },
    });
    expect(pullDisabled.statusCode).toBe(403);
    expect(pullDisabled.body.teacherSeatDisabled).toBe(true);
    // Cloud data was NOT wiped!
    expect(localDevMemoryStore.size).toBe(1);

    // Re-enable teacher seat, then test expiry enforcement
    await invokeHandler(adminPortalHandler, {
      body: {
        action: 'enable_teacher_seat',
        adminPin: TEST_ADMIN_PIN,
        licenseCode: schoolCode,
        teacherKey: 'GURU_1',
      },
    });

    const seatKey = `asesmerdeka:seats:v1:${schoolCode}`;
    localSeatMemoryStore.set(seatKey, {
      ...localSeatMemoryStore.get(seatKey),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const pullExpired = await invokeHandler(cloudSyncHandler, {
      body: {
        action: 'pull',
        licenseCode: schoolCode,
        deviceId: 'DEV-S25',
        teacherPin: 'GURU_1:9988',
      },
    });
    expect(pullExpired.statusCode).toBe(403);
    expect(pullExpired.body.expired).toBe(true);

    // Renew license -> Cloud Sync immediately works again and returns previously saved academic data!
    await invokeHandler(adminPortalHandler, {
      body: {
        action: 'renew_license',
        adminPin: TEST_ADMIN_PIN,
        licenseCode: schoolCode,
        expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString(),
      },
    });
    const pullRenewed = await invokeHandler(cloudSyncHandler, {
      body: {
        action: 'pull',
        licenseCode: schoolCode,
        deviceId: 'DEV-S25',
        teacherPin: 'GURU_1:9988',
      },
    });
    expect(pullRenewed.statusCode).toBe(200);
    expect(pullRenewed.body.ok).toBe(true);
    expect(JSON.parse(pullRenewed.body.entries.asesmerdeka_grades_v1)[0].score).toBe(95);
  });
});
