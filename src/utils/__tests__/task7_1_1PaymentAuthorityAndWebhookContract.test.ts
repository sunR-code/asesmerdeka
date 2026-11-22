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
  applyPaymentGatewayCallback,
  clearPaymentGatewayClientCaches,
  createPaymentInvoiceSession,
  verifyPaymentOrderStatusOnline,
} from '../paymentGateway';
import { computeSerialLicenseCode, getUserQuota } from '../licenseManager';

// @ts-expect-error serverless JS handler tested directly
import activateLicenseHandler, {
  generateOrderLicenseCodeServer,
  localLicenseRegistryStore,
  localPaymentOrderStore,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  localWebhookEventStore,
  localWebhookTransactionStore,
  savePaymentOrderRecord,
  saveSeatRecordToRedis,
  saveWebhookEventRecord,
  saveWebhookTransactionRecord,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS handler tested directly
import mayarWebhookHandler, {
  redactWebhookUrlForLog,
  verifyMayarWebhookSignature,
} from '../../../api/mayar-webhook.js';

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
  return {
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
}

async function invokeHandler(
  handler: (req: any, res: any) => Promise<any>,
  options: {
    method?: string;
    url?: string;
    body?: any;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  } = {}
): Promise<MockResponse> {
  const req = {
    method: options.method || 'POST',
    url: options.url || '/',
    body: options.body ?? {},
    headers: options.headers || {},
    query: options.query || {},
    socket: { remoteAddress: '127.0.0.1' },
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

const REDIS_URL = 'https://isolated-redis.asesmerdeka.test';
const REDIS_TOKEN = 'ISO_REDIS_TOKEN_TASK711';
const WEBHOOK_SECRET = 'MAYAR_HIGH_ENTROPY_SECRET_9876543210';

function executeAtomicLuaMock(
  redisKV: Map<string, string>,
  lockExpiry: Map<string, { owner: string; fence: number; expiresAt: number }>,
  script: string,
  keys: string[],
  args: string[]
) {
  const now = Date.now();
  const cleanExpired = (key: string) => {
    const meta = lockExpiry.get(key);
    if (meta && meta.expiresAt <= now) {
      lockExpiry.delete(key);
      redisKV.delete(key);
    }
  };

  if (script.includes('ASESMERDEKA_ACQUIRE_MULTI_LOCK_V1')) {
    const numLocks = Number(args[0] || 0);
    const owner = String(args[1] || '');
    const ttlMs = Number(args[2] || 5000);
    const lockKeys = keys.slice(0, numLocks);
    const fenceKey = keys[numLocks];

    for (const k of lockKeys) {
      cleanExpired(k);
      if (redisKV.has(k)) {
        const meta = lockExpiry.get(k);
        if (!meta || meta.owner !== owner) {
          return ['BUSY', k];
        }
      }
    }

    const nextFence = Number(redisKV.get(fenceKey) || '0') + 1;
    redisKV.set(fenceKey, String(nextFence));
    for (const k of lockKeys) {
      redisKV.set(k, `${owner}:${nextFence}`);
      lockExpiry.set(k, { owner, fence: nextFence, expiresAt: now + ttlMs });
    }
    return ['ACQUIRED', String(nextFence)];
  }

  if (script.includes('ASESMERDEKA_RELEASE_MULTI_LOCK_V1')) {
    const owner = String(args[0] || '');
    let released = 0;
    for (const k of keys) {
      const val = redisKV.get(k);
      const meta = lockExpiry.get(k);
      if ((meta && meta.owner === owner) || (val && val.startsWith(`${owner}:`))) {
        redisKV.delete(k);
        lockExpiry.delete(k);
        released += 1;
      }
    }
    return released;
  }

  if (script.includes('ASESMERDEKA_ATOMIC_SEAT_CAS_V1')) {
    const [seatKey, lockKey] = keys;
    const owner = String(args[0] || '');
    const expectedFence = Number(args[1] || 0);
    const expectedRev = Number(args[2] || 0);
    const nextJson = String(args[3] || '{}');
    const maxSeatsLimit = Number(args[4] || 0);

    if (lockKey) {
      cleanExpired(lockKey);
      const meta = lockExpiry.get(lockKey);
      if (!redisKV.has(lockKey) || !meta || meta.owner !== owner) return ['LOCK_LOST', lockKey];
      if (meta.fence !== expectedFence) return ['STALE_FENCE', String(meta.fence)];
    }

    const curRaw = redisKV.get(seatKey);
    const curObj = curRaw ? JSON.parse(curRaw) : null;
    const curRev = curObj ? Number(curObj.seatRevision ?? 0) : 0;
    if (curRev !== expectedRev) return ['CONFLICT', String(curRev)];

    const nextObj = JSON.parse(nextJson);
    if (maxSeatsLimit > 0 && Number(nextObj.usedSeats || 0) > maxSeatsLimit) {
      return ['QUOTA_EXCEEDED', String(nextObj.usedSeats || 0)];
    }
    redisKV.set(seatKey, nextJson);
    return ['OK', String(nextObj.seatRevision ?? expectedRev + 1)];
  }

  if (script.includes('ASESMERDEKA_FENCED_RECORD_WRITE_V1')) {
    const [recordKey, lockKey] = keys;
    const owner = String(args[0] || '');
    const expectedFence = Number(args[1] || 0);
    const nextJson = String(args[2] || '{}');

    if (lockKey) {
      cleanExpired(lockKey);
      const meta = lockExpiry.get(lockKey);
      if (!redisKV.has(lockKey) || !meta || meta.owner !== owner) return ['LOCK_LOST', lockKey];
      if (meta.fence !== expectedFence) return ['STALE_FENCE', String(meta.fence)];
    }
    const curRaw = redisKV.get(recordKey);
    const curObj = curRaw ? JSON.parse(curRaw) : null;
    if (curObj && Number(curObj.fenceToken || 0) > expectedFence) {
      return ['STALE_FENCE', String(curObj.fenceToken)];
    }
    redisKV.set(recordKey, nextJson);
    return ['OK', String(expectedFence)];
  }

  if (script.includes('ASESMERDEKA_UPSERT_ADMIN_REGISTRY_V1')) {
    const registryKey = keys[0];
    const patch = JSON.parse(String(args[0] || '{}'));
    const curRaw = redisKV.get(registryKey);
    const list: Array<Record<string, unknown>> = curRaw ? JSON.parse(curRaw) : [];
    const idx = list.findIndex((item) => item.licenseCode === patch.licenseCode);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
    } else {
      list.unshift(patch);
    }
    redisKV.set(registryKey, JSON.stringify(list));
    return ['OK', String(list.length)];
  }

  if (script.includes('ASESMERDEKA_COMMIT_SETTLEMENT_V1')) {
    const [lockKey, txKey, eventKey, orderKey, seatKey, registryKey] = keys;
    const owner = String(args[0] || '');
    const expectedFence = Number(args[1] || 0);
    const hasEvent = args[2] === '1';
    const hasOrder = args[3] === '1';
    const cleanCode = String(args[4] || '');
    const txId = String(args[5] || '');
    const orderId = String(args[6] || '');
    const txJson = String(args[7] || '{}');
    const eventJson = String(args[8] || '');
    const orderJson = String(args[9] || '');
    const seatPatchJson = String(args[10] || '');
    const adminPatchJson = String(args[11] || '');

    if (lockKey) {
      cleanExpired(lockKey);
      const meta = lockExpiry.get(lockKey);
      if (!redisKV.has(lockKey) || !meta || meta.owner !== owner) return ['LOCK_LOST', lockKey];
      if (meta.fence !== expectedFence) return ['STALE_FENCE', String(meta.fence)];
    }

    const curTxRaw = txKey ? redisKV.get(txKey) : null;
    if (curTxRaw) {
      const curTx = JSON.parse(curTxRaw);
      if (curTx.consistencyState === 'committed') {
        if (cleanCode && curTx.licenseCode && curTx.licenseCode !== cleanCode) {
          return ['TRANSACTION_ALREADY_BOUND', curTx.licenseCode];
        }
        return ['IDEMPOTENT', curTx.licenseCode || cleanCode];
      }
    }

    if (hasEvent && eventKey) {
      const curEvtRaw = redisKV.get(eventKey);
      if (curEvtRaw) {
        const curEvt = JSON.parse(curEvtRaw);
        if (curEvt.consistencyState === 'committed') {
          if ((curEvt.licenseCode && curEvt.licenseCode !== cleanCode) || (curEvt.transactionId && curEvt.transactionId !== txId) || (orderId && curEvt.orderId && curEvt.orderId !== orderId)) {
            return ['TRANSACTION_ALREADY_BOUND', curEvt.licenseCode || curEvt.transactionId || ''];
          }
          return ['IDEMPOTENT', curEvt.licenseCode || cleanCode];
        }
      }
    }

    if (txKey && txJson) redisKV.set(txKey, txJson);
    if (hasEvent && eventKey && eventJson) redisKV.set(eventKey, eventJson);
    if (hasOrder && orderKey && orderJson) {
      const curOrdRaw = redisKV.get(orderKey);
      const curOrd = curOrdRaw ? JSON.parse(curOrdRaw) : {};
      const nextOrd = JSON.parse(orderJson);
      redisKV.set(orderKey, JSON.stringify({ ...curOrd, ...nextOrd }));
    }
    if (seatKey && seatPatchJson) {
      const curSeatRaw = redisKV.get(seatKey);
      const curSeat = curSeatRaw ? JSON.parse(curSeatRaw) : {};
      const seatPatch = JSON.parse(seatPatchJson);
      redisKV.set(seatKey, JSON.stringify({ ...curSeat, ...seatPatch }));
    }
    if (registryKey && adminPatchJson) {
      const curRegRaw = redisKV.get(registryKey);
      const list: Array<Record<string, unknown>> = curRegRaw ? JSON.parse(curRegRaw) : [];
      const patch = JSON.parse(adminPatchJson);
      const targetCode = patch.code || patch.licenseCode;
      const idx = list.findIndex((item) => (item.code || item.licenseCode) === targetCode);
      if (idx >= 0) {
        const { newEntry: _ne, ...fields } = patch;
        list[idx] = { ...list[idx], ...fields };
      } else {
        list.unshift(patch.newEntry || patch);
      }
      redisKV.set(registryKey, JSON.stringify(list));
    }
    return ['COMMITTED', txId || cleanCode];
  }

  return null;
}

function createIsolatedRedisAndApiFetchMock(redisKV: Map<string, string>) {
  const lockExpiry = new Map<string, { owner: string; fence: number; expiresAt: number }>();
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    if (urlStr.startsWith(REDIS_URL)) {
      const authHeader = String((init?.headers as Record<string, string>)?.Authorization || '');
      if (authHeader !== `Bearer ${REDIS_TOKEN}`) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
        } as Response;
      }

      const pathPart = urlStr.slice(REDIS_URL.length);
      if ((pathPart === '' || pathPart === '/') && init?.method === 'POST' && init?.body) {
        const cmd = JSON.parse(String(init.body)) as string[];
        if (cmd[0] === 'EVAL') {
          const script = cmd[1];
          const numKeys = Number(cmd[2] || 0);
          const keys = cmd.slice(3, 3 + numKeys);
          const args = cmd.slice(3 + numKeys);
          const result = executeAtomicLuaMock(redisKV, lockExpiry, script, keys, args);
          return {
            ok: true,
            status: 200,
            json: async () => ({ result }),
          } as Response;
        }
      }
      if (pathPart.startsWith('/get/')) {
        const key = decodeURIComponent(pathPart.slice('/get/'.length));
        const val = redisKV.has(key) ? redisKV.get(key)! : null;
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: val }),
        } as Response;
      }
      if (pathPart.startsWith('/set/')) {
        const key = decodeURIComponent(pathPart.slice('/set/'.length));
        redisKV.set(key, String(init?.body ?? ''));
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: 'OK' }),
        } as Response;
      }
      if (pathPart.startsWith('/del/')) {
        const key = decodeURIComponent(pathPart.slice('/del/'.length));
        const existed = redisKV.delete(key);
        lockExpiry.delete(key);
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: existed ? 1 : 0 }),
        } as Response;
      }
    }

    if (urlStr.endsWith('/api/activate-license')) {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const mock = await invokeHandler(activateLicenseHandler, { body });
      return {
        ok: mock.statusCode >= 200 && mock.statusCode < 300,
        status: mock.statusCode,
        json: async () => mock.body,
      } as Response;
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Unhandled URL in test fetch mock' }),
    } as Response;
  });
}

function simulateServerlessRestart() {
  localSeatMemoryStore.clear();
  localLicenseRegistryStore.length = 0;
  localWebhookTransactionStore.clear();
  localWebhookEventStore.clear();
  localPaymentOrderStore.clear();
  localRevokedLicensesSet.clear();
  clearPaymentGatewayClientCaches();
  delete (globalThis as unknown as { __ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__?: unknown })
    .__ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__;
}

async function seedRedisPaymentAuthority(params: {
  invoiceId: string;
  transactionId: string;
  eventId?: string;
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
    consistencyState: 'committed',
    transactionId: params.transactionId,
    webhookEventId: params.eventId || null,
    licenseCode: params.licenseCode,
    updatedAt: now,
  });
  await saveWebhookTransactionRecord(params.transactionId, {
    transactionId: params.transactionId,
    orderId: params.invoiceId,
    invoiceId: params.invoiceId,
    webhookEventId: params.eventId || null,
    licenseCode: params.licenseCode,
    planType,
    tier,
    amount: params.amount,
    deviceId: params.deviceId,
    customerEmail: params.buyerEmail,
    status: 'paid',
    consistencyState: 'committed',
    verifiedBy: 'server_authority',
    updatedAt: now,
  });
  if (params.eventId) {
    await saveWebhookEventRecord(params.eventId, {
      webhookEventId: params.eventId,
      transactionId: params.transactionId,
      orderId: params.invoiceId,
      invoiceId: params.invoiceId,
      licenseCode: params.licenseCode,
      status: 'paid',
      consistencyState: 'committed',
      updatedAt: now,
    });
  }
  await saveSeatRecordToRedis(params.licenseCode, {
    licenseCode: params.licenseCode,
    planType,
    tier,
    maxSeats,
    devices: [],
    usedSeats: 0,
    lifecycleState: 'paid',
    consistencyState: 'committed',
    transactionId: params.transactionId,
    updatedAt: now,
  });
}

describe('Task 7.1.1 — Payment Authority Persistence & Retired Mayar Webhook Contract (13 Scenarios)', () => {
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  let redisKV: Map<string, string>;

  beforeEach(() => {
    localStorage.clear();
    simulateServerlessRestart();

    redisKV = new Map<string, string>();
    process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REDIS_TOKEN;

    globalThis.fetch = createIsolatedRedisAndApiFetchMock(redisKV);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    process.env = { ...savedEnv };
  });

  it('1. Server Payment Authority menulis bukti ke persistent Redis order/tx/event/seat (tanpa fallback lokal); Mayar webhook 410 (RETIRED)', async () => {
    const code = makeSerial('GM26', 'PERSIST1');
    const orderRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-711-01',
        deviceId: 'DEV-711-01',
        buyerName: 'Ibu Sari',
        buyerEmail: 'sari@sdn1.sch.id',
      },
    });
    expect(orderRes.statusCode).toBe(200);
    expect(orderRes.body.order.status).toBe('pending_payment');

    await seedRedisPaymentAuthority({
      invoiceId: 'INV-711-01',
      transactionId: 'TXN-AUTH-711-01',
      eventId: 'EVT-AUTH-711-01',
      licenseCode: code,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: 'DEV-711-01',
      buyerName: 'Ibu Sari',
      buyerEmail: 'sari@sdn1.sch.id',
    });

    const whRes = await invokeHandler(mayarWebhookHandler, {
      url: '/api/mayar-webhook',
      body: { id: 'EVT-MAYAR-711-01', event: 'payment.received' },
    });
    expect(whRes.statusCode).toBe(410);
    expect(whRes.body.reason).toBe('MAYAR_DECOMMISSIONED');

    expect(redisKV.has('asesmerdeka:mayar:order:v1:INV-711-01')).toBe(true);
    expect(redisKV.has('asesmerdeka:mayar:tx:v1:TXN-AUTH-711-01')).toBe(true);
    expect(redisKV.has('asesmerdeka:mayar:event:v1:EVT-AUTH-711-01')).toBe(true);
    expect(redisKV.has(`asesmerdeka:seats:v1:${code}`)).toBe(true);

    const savedOrder = JSON.parse(redisKV.get('asesmerdeka:mayar:order:v1:INV-711-01')!);
    expect(savedOrder.status).toBe('paid');
    expect(savedOrder.transactionId).toBe('TXN-AUTH-711-01');
    expect(savedOrder.licenseCode).toBe(code);

    // Local fallback maps tidak digunakan saat Redis aktif
    expect(localPaymentOrderStore.size).toBe(0);
    expect(localWebhookTransactionStore.size).toBe(0);
    expect(localWebhookEventStore.size).toBe(0);
    expect(localSeatMemoryStore.size).toBe(0);
  });

  it('2. Simulasi lintas serverless isolate: Proses A (Redis paid) -> restart -> Proses B (verify_payment_order) -> Proses C (idempotent re-verify)', async () => {
    const session = createPaymentInvoiceSession({
      planId: 'pro_sekolah',
      methodId: 'qris',
      buyerName: 'SMPN 3 Nusantara',
      buyerEmail: 'kepsek@smpn3.sch.id',
      deviceId: 'DEV-ISO-B',
    });

    const createRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_sekolah',
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        buyerName: session.buyerName,
        buyerEmail: session.buyerEmail,
      },
    });
    expect(createRes.statusCode).toBe(200);

    const issuedCode = generateOrderLicenseCodeServer('sekolah', 'TXN-ISO-711-02');
    expect(issuedCode.startsWith('ASM-SK26-')).toBe(true);

    await seedRedisPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-ISO-711-02',
      eventId: 'EVT-ISO-711-02',
      licenseCode: issuedCode,
      planId: 'pro_sekolah',
      amount: 749000,
      deviceId: session.deviceId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
    });

    // Hentikan Proses A: seluruh memori serverless & cache browser dihapus
    simulateServerlessRestart();

    // Proses B: cold start membaca langsung dari Redis, mengklaim kursi, dan mengaktifkan lisensi
    const verifyB = await verifyPaymentOrderStatusOnline(session, { teacherPin: 'BU_ANI' });
    expect(verifyB.ok).toBe(true);
    expect(verifyB.activated).toBe(true);
    expect(verifyB.session.status).toBe('paid');
    expect(getUserQuota().tier).toBe('sekolah');
    expect(getUserQuota().licenseKey).toBe(issuedCode);

    const seatAfterB = JSON.parse(redisKV.get(`asesmerdeka:seats:v1:${issuedCode}`)!);
    expect(seatAfterB.usedSeats).toBe(1);
    expect(seatAfterB.devices).toContain('DEV-ISO-B');

    // Hentikan Proses B dan mulai Proses C
    localSeatMemoryStore.clear();
    localPaymentOrderStore.clear();
    localWebhookTransactionStore.clear();
    delete (globalThis as unknown as { __ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__?: unknown })
      .__ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__;

    const verifyC = await verifyPaymentOrderStatusOnline(session, { teacherPin: 'BU_ANI' });
    expect(verifyC.ok).toBe(true);
    expect(verifyC.activated).toBe(true);
    expect(verifyC.idempotentReplay).toBe(true);

    const seatAfterC = JSON.parse(redisKV.get(`asesmerdeka:seats:v1:${issuedCode}`)!);
    expect(seatAfterC.usedSeats).toBe(1);
  });

  it('3. Verifikasi tetap berhasil dengan globalThis undefined dan cache browser kosong selama bukti Redis ada', async () => {
    const code = makeSerial('GM26', 'NOGLOBAL3');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Pak Budi',
      buyerEmail: 'budi@sdn2.sch.id',
      deviceId: 'DEV-711-03',
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
    await seedRedisPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-NOGLOBAL-3',
      eventId: 'EVT-NOGLOBAL-3',
      licenseCode: code,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: session.deviceId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
    });

    simulateServerlessRestart();
    expect((globalThis as any).__ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__).toBeUndefined();

    const verifyDirect = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify_payment_order',
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        buyerEmail: session.buyerEmail,
        planId: 'pro_individu',
      },
    });
    expect(verifyDirect.statusCode).toBe(200);
    expect(verifyDirect.body.verified).toBe(true);
    expect(verifyDirect.body.authoritySource).toBe('redis');

    const resOnline = await verifyPaymentOrderStatusOnline(session);
    expect(resOnline.ok).toBe(true);
    expect(resOnline.activated).toBe(true);
    expect(getUserQuota().tier).toBe('guru');
  });

  it('4. Aktivasi tanpa bukti Redis ditolak pada verify_payment_order maupun requirePaymentProof', async () => {
    const code = makeSerial('GM26', 'NOPROOF4');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Tanpa Bukti',
      buyerEmail: 'noproof@sdn.sch.id',
      deviceId: 'DEV-711-04',
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

    const unverifiedPoll = await verifyPaymentOrderStatusOnline(session, { licenseCode: code });
    expect(unverifiedPoll.ok).toBe(false);
    expect(unverifiedPoll.activated).toBe(false);
    expect(unverifiedPoll.session.status).toBe('pending_payment');

    const directVerifyRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: code,
        deviceId: session.deviceId,
        invoiceId: session.invoiceId,
        requirePaymentProof: true,
      },
    });
    expect(directVerifyRes.statusCode).toBe(403);
    expect(directVerifyRes.body.valid).toBe(false);
    expect(directVerifyRes.body.paymentUnverified).toBe(true);
    expect(directVerifyRes.body.reason).toBe('UNVERIFIED_PAYMENT_TRANSACTION');
    expect(getUserQuota().tier).toBe('free');
  });

  it('5. Browser tidak dapat memalsukan status paid atau menyuntikkan globalThis tanpa verifiedBy', () => {
    const code = makeSerial('SK26', 'SPOOF5');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Penyerang Browser',
      buyerEmail: 'spoof@other.sch.id',
      deviceId: 'DEV-711-05',
    });

    // Penyerang menyuntikkan entri paid palsu ke globalThis tanpa verifiedBy
    (globalThis as any).__ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__ = {
      verifiedTransactions: new Map([
        [
          'asesmerdeka:mayar:tx:v1:TXN-FORGED-05',
          {
            transactionId: 'TXN-FORGED-05',
            licenseCode: code,
            planType: 'sekolah',
            amount: 749000,
            invoiceId: session.invoiceId,
            deviceId: session.deviceId,
            customerEmail: session.buyerEmail,
            status: 'paid',
          },
        ],
      ]),
    };

    const spoofRes = applyPaymentGatewayCallback(session, {
      status: 'paid',
      transactionId: 'TXN-FORGED-05',
      paidAmount: 99000,
      licenseCode: code,
    });
    expect(spoofRes.ok).toBe(false);
    expect(spoofRes.activated).toBe(false);
    expect(spoofRes.reason).toBe('UNVERIFIED_PAYMENT_TRANSACTION');

    // Simulasi cold-start browser + manipulasi planId
    clearPaymentGatewayClientCaches();
    const tamperedSession = { ...session, planId: 'pro_sekolah' as const };
    const planTamperRes = applyPaymentGatewayCallback(tamperedSession, {
      status: 'paid',
      transactionId: 'TXN-FORGED-05',
      paidAmount: 99000,
      licenseCode: code,
    });
    expect(planTamperRes.ok).toBe(false);
    expect(planTamperRes.reason).toBe('PLAN_TAMPERED');
    expect(getUserQuota().tier).toBe('free');
  });

  it('6. [RETIRED] Webhook Mayar dipensiunkan HTTP 410 Gone (digantikan task13_mayarDecommissionRegression.test.ts)', async () => {
    const whRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: { id: 'EVT-OUTER-603', event: 'payment.received' },
    });
    expect(whRes.statusCode).toBe(410);
    expect(whRes.body.reason).toBe('MAYAR_DECOMMISSIONED');
  });

  it('7. Redaksi token/secret pada URL log tetap aktif; Mayar webhook & verifier dipensiunkan (410 Gone)', async () => {
    const redacted = redactWebhookUrlForLog(
      `/api/mayar-webhook?token=${WEBHOOK_SECRET}&secret=ABC&order=123`
    );
    expect(redacted).not.toContain(WEBHOOK_SECRET);
    expect(redacted).toContain('token=[REDACTED]');
    expect(redacted).toContain('secret=[REDACTED]');
    expect(redacted).toContain('order=123');

    const retiredCheck = verifyMayarWebhookSignature();
    expect(retiredCheck.ok).toBe(false);
    expect(retiredCheck.retired).toBe(true);
    expect(retiredCheck.reason).toBe('MAYAR_DECOMMISSIONED');

    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: { event: 'testing', data: { id: 'TEST-EVT-7' } },
    });
    expect(res.statusCode).toBe(410);
    expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');
  });

  it('8. Pemakaian ulang 1 transactionId untuk lisensi/order berbeda ditolak server (403); webhook Mayar 410 (RETIRED)', async () => {
    const code1 = makeSerial('GM26', 'REP8A');
    const code2 = makeSerial('GM26', 'REP8B');

    await seedRedisPaymentAuthority({
      invoiceId: 'INV-REPLAY-801',
      transactionId: 'TXN-REPLAY-801',
      eventId: 'EVT-REPLAY-1',
      licenseCode: code1,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: 'DEV-REP-8A',
      buyerEmail: 'rep@sdn.sch.id',
    });

    const hijackedLicense = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: code2,
        deviceId: 'DEV-REP-8B',
        transactionId: 'TXN-REPLAY-801',
        requirePaymentProof: true,
      },
    });
    expect(hijackedLicense.statusCode).toBe(403);
    expect(hijackedLicense.body.reason).toBe('TRANSACTION_OWNERSHIP_MISMATCH');

    const whRetired = await invokeHandler(mayarWebhookHandler, {
      body: { id: 'EVT-REPLAY-2', event: 'payment.received' },
    });
    expect(whRetired.statusCode).toBe(410);
  });

  it('9. [RETIRED Webhook Concurrency] Panggilan paralel ke webhook Mayar mengembalikan HTTP 410 Gone tanpa menulis seat', async () => {
    const code = makeSerial('SK26', 'RACE9');
    const [rA, rB] = await Promise.all([
      invokeHandler(mayarWebhookHandler, { body: { id: 'EVT-RACE-9A', licenseCode: code } }),
      invokeHandler(mayarWebhookHandler, { body: { id: 'EVT-RACE-9B', licenseCode: code } }),
    ]);
    expect(rA.statusCode).toBe(410);
    expect(rB.statusCode).toBe(410);
    expect(redisKV.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
  });

  it('10. Browser redirect kembali sebelum otorisasi pembayaran tiba tetap pending, lalu aktif begitu server mencatat paid', async () => {
    const code = makeSerial('GM26', 'EARLYBR10');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'va_bri',
      buyerName: 'Ibu Nina',
      buyerEmail: 'nina@sdn3.sch.id',
      deviceId: 'DEV-EARLY-10',
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

    const preAuth = await verifyPaymentOrderStatusOnline(session);
    expect(preAuth.ok).toBe(false);
    expect(preAuth.activated).toBe(false);
    expect(preAuth.session.status).toBe('pending_payment');
    expect(getUserQuota().tier).toBe('free');

    await seedRedisPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-LATEWH-10',
      eventId: 'EVT-LATEWH-10',
      licenseCode: code,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: session.deviceId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
    });

    const postAuth = await verifyPaymentOrderStatusOnline(session);
    expect(postAuth.ok).toBe(true);
    expect(postAuth.activated).toBe(true);
    expect(postAuth.session.status).toBe('paid');
    expect(getUserQuota().tier).toBe('guru');
  });

  it('11. Order paid yang sudah tercatat di Redis tidak tertimpa create_payment_order belakangan dan tetap aktif saat verify', async () => {
    const code = makeSerial('GM26', 'PREWH11');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Pak Dedi',
      buyerEmail: 'dedi@sdn4.sch.id',
      deviceId: 'DEV-PREWH-11',
    });

    await seedRedisPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-PREWH-11',
      eventId: 'EVT-PREWH-11',
      licenseCode: code,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: session.deviceId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
    });

    // Retry create_payment_order belakangan TIDAK boleh menurunkan status 'paid' menjadi 'pending_payment'
    const lateOrderCreate = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        buyerEmail: session.buyerEmail,
      },
    });
    expect(lateOrderCreate.statusCode).toBe(200);
    expect(lateOrderCreate.body.order.status).toBe('paid');
    expect(lateOrderCreate.body.order.transactionId).toBe('TXN-PREWH-11');

    // Conflict plan tetap ditolak HTTP 409
    const conflictingOrder = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_sekolah',
        invoiceId: session.invoiceId,
      },
    });
    expect(conflictingOrder.statusCode).toBe(409);
    expect(conflictingOrder.body.reason).toBe('ORDER_PLAN_CONFLICT');

    clearPaymentGatewayClientCaches();
    const afterReturn = await verifyPaymentOrderStatusOnline(session);
    expect(afterReturn.ok).toBe(true);
    expect(afterReturn.activated).toBe(true);
    expect(afterReturn.session.status).toBe('paid');
    expect(getUserQuota().tier).toBe('guru');
  });

  it('12. Lisensi hanya aktif sekali & menjaga kursi aktif tetap utuh; webhook Mayar mengembalikan 410 (RETIRED)', async () => {
    const code = makeSerial('SK26', 'STATE12');
    const session = createPaymentInvoiceSession({
      planId: 'pro_sekolah',
      methodId: 'qris',
      buyerName: 'SMAN 5',
      buyerEmail: 'tu@sman5.sch.id',
      deviceId: 'DEV-STATE-12',
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

    await seedRedisPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-PAID-12',
      eventId: 'EVT-PAID-12',
      licenseCode: code,
      planId: 'pro_sekolah',
      amount: 749000,
      deviceId: session.deviceId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
    });

    await verifyPaymentOrderStatusOnline(session, { teacherPin: 'PIN_12' });
    // Verifikasi idempoten kedua tidak menambah kursi
    await verifyPaymentOrderStatusOnline(session, { teacherPin: 'PIN_12' });

    const lateWh = await invokeHandler(mayarWebhookHandler, {
      body: { id: 'EVT-LATE-12', event: 'payment.failed', data: { orderId: session.invoiceId } },
    });
    expect(lateWh.statusCode).toBe(410);

    const persistedOrder = JSON.parse(redisKV.get(`asesmerdeka:mayar:order:v1:${session.invoiceId}`)!);
    const persistedSeat = JSON.parse(redisKV.get(`asesmerdeka:seats:v1:${code}`)!);
    expect(persistedOrder.status).toBe('paid');
    expect(persistedSeat.lifecycleState).toBe('active');
    expect(persistedSeat.usedSeats).toBe(1);
    expect(persistedSeat.devices).toContain('DEV-STATE-12');
  });

  it('13. Data akademik siswa, presensi, jurnal, nilai, dan e-Rapor tetap utuh 100% sepanjang seluruh alur pembayaran', async () => {
    const kelasSnapshot = JSON.stringify([{ id: 'KLS-8A', nama: 'Kelas 8A', siswa: ['Anisa', 'Bima'] }]);
    const nilaiSnapshot = JSON.stringify({ 'KLS-8A': { Anisa: 92, Bima: 88 } });
    const presensiSnapshot = JSON.stringify({ 'KLS-8A': { '2026-11-14': { Anisa: 'H', Bima: 'H' } } });
    const jurnalSnapshot = JSON.stringify([{ tanggal: '2026-11-14', materi: 'SPLDV' }]);
    const eraporSnapshot = JSON.stringify({ 'KLS-8A': { Anisa: { predikat: 'A' } } });

    localStorage.setItem('asesmerdeka_kelas_data_v1', kelasSnapshot);
    localStorage.setItem('asesmerdeka_nilai_v1', nilaiSnapshot);
    localStorage.setItem('asesmerdeka_presensi_v1', presensiSnapshot);
    localStorage.setItem('asesmerdeka_jurnal_v1', jurnalSnapshot);
    localStorage.setItem('asesmerdeka_erapor_v1', eraporSnapshot);

    const code = makeSerial('GM26', 'ACADA13');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Guru Akademik',
      buyerEmail: 'akademik@sdn7.sch.id',
      deviceId: 'DEV-ACAD-13',
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

    // Pending poll, failed callback, retired webhook (410), server authority commit, cold-start verify
    await verifyPaymentOrderStatusOnline(session);
    applyPaymentGatewayCallback(session, { status: 'failed' });
    const retiredWh = await invokeHandler(mayarWebhookHandler, {
      body: { id: 'EVT-ACAD-13', event: 'payment.received' },
    });
    expect(retiredWh.statusCode).toBe(410);

    await seedRedisPaymentAuthority({
      invoiceId: session.invoiceId,
      transactionId: 'TXN-ACAD-13',
      eventId: 'EVT-ACAD-13',
      licenseCode: code,
      planId: 'pro_individu',
      amount: 99000,
      deviceId: session.deviceId,
      buyerName: session.buyerName,
      buyerEmail: session.buyerEmail,
    });

    simulateServerlessRestart();
    const okRes = await verifyPaymentOrderStatusOnline(session);
    expect(okRes.activated).toBe(true);

    expect(localStorage.getItem('asesmerdeka_kelas_data_v1')).toBe(kelasSnapshot);
    expect(localStorage.getItem('asesmerdeka_nilai_v1')).toBe(nilaiSnapshot);
    expect(localStorage.getItem('asesmerdeka_presensi_v1')).toBe(presensiSnapshot);
    expect(localStorage.getItem('asesmerdeka_jurnal_v1')).toBe(jurnalSnapshot);
    expect(localStorage.getItem('asesmerdeka_erapor_v1')).toBe(eraporSnapshot);
  });
});
