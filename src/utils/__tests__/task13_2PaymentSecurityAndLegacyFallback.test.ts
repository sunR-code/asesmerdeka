import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { computeSerialLicenseCode } from '../licenseManager';
// @ts-expect-error serverless JS module tested directly
import activateLicenseHandler, {
  FencedWriteConflictError,
  atomicSaveSeatRecordWithCas,
  buildPaymentOrderKey,
  buildSeatRedisKey,
  buildWebhookTxKey,
  evaluateServerLifecycleState,
  generateStagingLicenseCode,
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
  parseValidPaymentAmount,
  savePaymentOrderRecord,
  timingSafeEqualStrings,
  validateSeatRecordLifecycle,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS module tested directly
import mayarWebhookHandler from '../../../api/mayar-webhook.js';
// @ts-expect-error serverless JS module tested directly
import cronReconcileHandler from '../../../api/cron/mayar-reconcile.js';

const MOCK_REDIS_URL = 'https://task13-2-mock-redis.upstash.test';
const MOCK_REDIS_TOKEN = 'task13-2-mock-redis-token-32chars';
const TEST_STAGING_SECRET = 'STAGING_SIGNING_SECRET_TASK13_2_32CHARS';

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

type LuaHookTag = 'ACQUIRE' | 'RELEASE' | 'SEAT_CAS' | 'FENCED_WRITE' | 'REGISTRY';

/**
 * Simulasi Upstash REST + Lua deterministik (mengimplementasikan semantik tepat
 * dari LUA_ACQUIRE_MULTI_LOCK_SCRIPT, LUA_RELEASE_MULTI_LOCK_SCRIPT,
 * LUA_ATOMIC_SEAT_CAS_SCRIPT, LUA_FENCED_RECORD_WRITE_SCRIPT, dan
 * LUA_UPSERT_ADMIN_REGISTRY_SCRIPT pada api/activate-license.js).
 */
class DeterministicLuaRedis {
  kv = new Map<string, string>();
  writes: string[] = [];
  outageMode = false;
  evalLog: Array<{ tag: LuaHookTag; keys: string[]; result: unknown }> = [];
  beforeEvalHook:
    | ((tag: LuaHookTag, keys: string[], args: string[], redis: DeterministicLuaRedis) => Promise<void> | void)
    | null = null;

  async handleFetch(url: string, init?: RequestInit): Promise<Response> {
    if (!url.startsWith(MOCK_REDIS_URL)) {
      return new Response(JSON.stringify({ error: 'Unexpected outbound URL' }), { status: 404 });
    }
    if (this.outageMode) {
      return new Response(JSON.stringify({ error: 'Upstash Redis unavailable (simulated outage)' }), {
        status: 503,
      });
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
        if (this.beforeEvalHook) await this.beforeEvalHook('ACQUIRE', keys, args, this);
        const lockCount = Number(args[0] || 0);
        const owner = String(args[1] || '');
        const fenceKey = keys[lockCount];
        for (let i = 0; i < lockCount; i++) {
          if (this.kv.has(keys[i])) {
            const res = ['BUSY', keys[i]];
            this.evalLog.push({ tag: 'ACQUIRE', keys, result: res });
            return new Response(JSON.stringify({ result: res }), { status: 200 });
          }
        }
        for (let i = 0; i < lockCount; i++) {
          this.kv.set(keys[i], owner);
        }
        const fence = (Number(this.kv.get(fenceKey) || '0') || 0) + 1;
        this.kv.set(fenceKey, String(fence));
        const res = ['ACQUIRED', String(fence)];
        this.evalLog.push({ tag: 'ACQUIRE', keys, result: res });
        return new Response(JSON.stringify({ result: res }), { status: 200 });
      }

      if (script.includes('ASESMERDEKA_RELEASE_MULTI_LOCK_V1')) {
        if (this.beforeEvalHook) await this.beforeEvalHook('RELEASE', keys, args, this);
        const owner = String(args[0] || '');
        let released = 0;
        for (const k of keys) {
          if (this.kv.get(k) === owner) {
            this.kv.delete(k);
            released += 1;
          }
        }
        this.evalLog.push({ tag: 'RELEASE', keys, result: released });
        return new Response(JSON.stringify({ result: released }), { status: 200 });
      }

      if (script.includes('ASESMERDEKA_ATOMIC_SEAT_CAS_V1')) {
        if (this.beforeEvalHook) await this.beforeEvalHook('SEAT_CAS', keys, args, this);
        const [seatKey, lockKey] = keys;
        const owner = String(args[0] || '');
        const expectedFence = Number(args[1] || 0);
        const expectedRev = Number(args[2] || 0);
        const nextJson = String(args[3] || '{}');
        const maxSeatsLimit = Number(args[4] || 0);

        if (owner !== '' && lockKey && lockKey !== 'asesmerdeka:noop:lock') {
          if (this.kv.get(lockKey) !== owner) {
            const res = ['LOCK_LOST', ''];
            this.evalLog.push({ tag: 'SEAT_CAS', keys, result: res });
            return new Response(JSON.stringify({ result: res }), { status: 200 });
          }
        }

        const curRaw = this.kv.get(seatKey);
        if (curRaw) {
          const curObj = JSON.parse(curRaw) as Record<string, unknown>;
          const curFence = Number(curObj.fenceToken) || 0;
          if (expectedFence > 0 && curFence > expectedFence) {
            const res = ['STALE_FENCE', String(curFence)];
            this.evalLog.push({ tag: 'SEAT_CAS', keys, result: res });
            return new Response(JSON.stringify({ result: res }), { status: 200 });
          }
          const curRev = Number(curObj.seatRevision) || 0;
          if (curRev !== expectedRev) {
            const res = ['CONFLICT', String(curRev)];
            this.evalLog.push({ tag: 'SEAT_CAS', keys, result: res });
            return new Response(JSON.stringify({ result: res }), { status: 200 });
          }
        } else if (expectedRev > 0) {
          const res = ['CONFLICT', '0'];
          this.evalLog.push({ tag: 'SEAT_CAS', keys, result: res });
          return new Response(JSON.stringify({ result: res }), { status: 200 });
        }

        const nextObj = JSON.parse(nextJson) as Record<string, unknown>;
        if (maxSeatsLimit > 0 && (Number(nextObj.usedSeats) || 0) > maxSeatsLimit) {
          const res = ['QUOTA_EXCEEDED', String(nextObj.usedSeats || 0)];
          this.evalLog.push({ tag: 'SEAT_CAS', keys, result: res });
          return new Response(JSON.stringify({ result: res }), { status: 200 });
        }

        this.writes.push(seatKey);
        this.kv.set(seatKey, nextJson);
        const res = ['OK', ''];
        this.evalLog.push({ tag: 'SEAT_CAS', keys, result: res });
        return new Response(JSON.stringify({ result: res }), { status: 200 });
      }

      if (script.includes('ASESMERDEKA_FENCED_RECORD_WRITE_V1')) {
        if (this.beforeEvalHook) await this.beforeEvalHook('FENCED_WRITE', keys, args, this);
        const [recordKey, lockKey] = keys;
        const owner = String(args[0] || '');
        const expectedFence = Number(args[1] || 0);
        const nextJson = String(args[2] || '{}');

        if (owner !== '' && lockKey && lockKey !== 'asesmerdeka:noop:lock') {
          if (this.kv.get(lockKey) !== owner) {
            const res = ['LOCK_LOST', ''];
            this.evalLog.push({ tag: 'FENCED_WRITE', keys, result: res });
            return new Response(JSON.stringify({ result: res }), { status: 200 });
          }
        }

        const curRaw = this.kv.get(recordKey);
        if (curRaw) {
          const curObj = JSON.parse(curRaw) as Record<string, unknown>;
          const curFence = Number(curObj.fenceToken) || 0;
          if (expectedFence > 0 && curFence > expectedFence) {
            const res = ['STALE_FENCE', String(curFence)];
            this.evalLog.push({ tag: 'FENCED_WRITE', keys, result: res });
            return new Response(JSON.stringify({ result: res }), { status: 200 });
          }
        }

        this.writes.push(recordKey);
        this.kv.set(recordKey, nextJson);
        const res = ['OK', ''];
        this.evalLog.push({ tag: 'FENCED_WRITE', keys, result: res });
        return new Response(JSON.stringify({ result: res }), { status: 200 });
      }

      if (script.includes('ASESMERDEKA_UPSERT_ADMIN_REGISTRY_V1')) {
        if (this.beforeEvalHook) await this.beforeEvalHook('REGISTRY', keys, args, this);
        const patch = JSON.parse(args[0]);
        const curRaw = this.kv.get(keys[0]);
        const list = curRaw ? (JSON.parse(curRaw) as any[]) : [];
        const idx = list.findIndex((item) => item && item.code === patch.code);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...patch };
        } else if (patch.newEntry) {
          list.unshift(patch.newEntry);
        }
        this.writes.push(keys[0]);
        this.kv.set(keys[0], JSON.stringify(list));
        const res = ['OK'];
        this.evalLog.push({ tag: 'REGISTRY', keys, result: res });
        return new Response(JSON.stringify({ result: res }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ result: null }), { status: 200 });
  }
}

describe('Task 13.2 — Payment Security Regression Coverage & Legacy License Fallback Hardening', () => {
  const originalFetch = globalThis.fetch;
  const savedEnv = { ...process.env };
  let redis: DeterministicLuaRedis;
  let outboundUrls: string[];

  beforeEach(() => {
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

    redis = new DeterministicLuaRedis();
    outboundUrls = [];

    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    process.env.VERCEL_ENV = 'production';

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

  it('1. AMOUNT_MISMATCH (HTTP 400): server menolak transaksi underpaid di verify_payment_order & requirePaymentProof tanpa menerbitkan lisensi atau mengubah seat', async () => {
    const indivCode = computeSerialLicenseCode('UND132A');
    const schoolCode = computeSerialLicenseCode('SEKOLAHTEST132');

    // Paket Individu (harga resmi 99.000) dibayar hanya 50.000
    redis.kv.set(
      buildPaymentOrderKey('INV-UNDER-INDIV'),
      JSON.stringify({
        orderId: 'INV-UNDER-INDIV',
        invoiceId: 'INV-UNDER-INDIV',
        planId: 'pro_individu',
        planType: 'individu',
        baseAmount: 99000,
        status: 'pending_payment',
        deviceId: 'DEV-UNDER-1',
        buyerEmail: 'under@sdn.sch.id',
      })
    );
    redis.kv.set(
      buildWebhookTxKey('TX-UNDER-INDIV'),
      JSON.stringify({
        transactionId: 'TX-UNDER-INDIV',
        orderId: 'INV-UNDER-INDIV',
        invoiceId: 'INV-UNDER-INDIV',
        licenseCode: indivCode,
        planId: 'pro_individu',
        planType: 'individu',
        amount: 50000,
        deviceId: 'DEV-UNDER-1',
        customerEmail: 'under@sdn.sch.id',
        status: 'paid',
        verifiedBy: 'server_authority',
      })
    );

    const underIndivRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify_payment_order',
        invoiceId: 'INV-UNDER-INDIV',
        transactionId: 'TX-UNDER-INDIV',
        deviceId: 'DEV-UNDER-1',
        buyerEmail: 'under@sdn.sch.id',
        planId: 'pro_individu',
      },
    });
    expect(underIndivRes.statusCode).toBe(400);
    expect(underIndivRes.body.reason).toBe('AMOUNT_MISMATCH');
    expect(underIndivRes.body.ok).toBe(false);
    expect(underIndivRes.body.verified).toBe(false);
    expect(underIndivRes.body.activated).toBe(false);
    expect(underIndivRes.body.licenseCode).toBeUndefined();

    // Order tidak pernah dinaikkan menjadi 'paid' & seat tidak pernah dibuat
    const persistedIndivOrder = JSON.parse(redis.kv.get(buildPaymentOrderKey('INV-UNDER-INDIV'))!);
    expect(persistedIndivOrder.status).toBe('pending_payment');
    expect(redis.kv.has(buildSeatRedisKey(indivCode))).toBe(false);

    // Paket Sekolah (harga resmi 749.000) dibayar harga Individu 99.000
    redis.kv.set(
      buildPaymentOrderKey('INV-UNDER-SCH'),
      JSON.stringify({
        orderId: 'INV-UNDER-SCH',
        invoiceId: 'INV-UNDER-SCH',
        planId: 'pro_sekolah',
        planType: 'sekolah',
        baseAmount: 749000,
        status: 'pending_payment',
        deviceId: 'DEV-SCH-UNDER',
      })
    );
    redis.kv.set(
      buildWebhookTxKey('TX-UNDER-SCH'),
      JSON.stringify({
        transactionId: 'TX-UNDER-SCH',
        orderId: 'INV-UNDER-SCH',
        invoiceId: 'INV-UNDER-SCH',
        licenseCode: schoolCode,
        planId: 'pro_sekolah',
        planType: 'sekolah',
        amount: 99000,
        deviceId: 'DEV-SCH-UNDER',
        status: 'paid',
        verifiedBy: 'server_authority',
      })
    );

    const underSchRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify_payment_order',
        invoiceId: 'INV-UNDER-SCH',
        transactionId: 'TX-UNDER-SCH',
        deviceId: 'DEV-SCH-UNDER',
        planId: 'pro_sekolah',
      },
    });
    expect(underSchRes.statusCode).toBe(400);
    expect(underSchRes.body.reason).toBe('AMOUNT_MISMATCH');
    expect(underSchRes.body.verified).toBe(false);
    expect(underSchRes.body.activated).toBe(false);
    expect(redis.kv.has(buildSeatRedisKey(schoolCode))).toBe(false);

    // Jalur requirePaymentProof juga menolak bukti nominal kurang dengan HTTP 400 AMOUNT_MISMATCH
    const proofUnderRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: schoolCode,
        deviceId: 'DEV-SCH-UNDER',
        teacherPin: 'BU_ANI',
        invoiceId: 'INV-UNDER-SCH',
        transactionId: 'TX-UNDER-SCH',
        requirePaymentProof: true,
      },
    });
    expect(proofUnderRes.statusCode).toBe(400);
    expect(proofUnderRes.body.valid).toBe(false);
    expect(proofUnderRes.body.paymentUnverified).toBe(true);
    expect(proofUnderRes.body.reason).toBe('AMOUNT_MISMATCH');
    expect(redis.kv.has(buildSeatRedisKey(schoolCode))).toBe(false);
  });

  it('2. AMOUNT_MISMATCH fail-closed Number.isFinite(Number(txRecord.amount)): amount hilang/null/NaN/Infinity/invalid ditolak HTTP 400', async () => {
    // Uji unit helper parseValidPaymentAmount
    for (const invalidVal of [undefined, null, NaN, 'NaN', Infinity, -Infinity, 'Infinity', '', '   ', 'abc', 0, -99000, true, {}]) {
      expect(parseValidPaymentAmount(invalidVal)).toBeNull();
    }
    expect(parseValidPaymentAmount(99000)).toBe(99000);
    expect(parseValidPaymentAmount('99123')).toBe(99123);

    const validCode = computeSerialLicenseCode('FINITE132');
    const invalidCases: Array<{ id: string; rawTx: Record<string, unknown> }> = [
      { id: 'MISSING', rawTx: { status: 'paid' } },
      { id: 'NULL', rawTx: { amount: null, status: 'paid' } },
      { id: 'NAN_STR', rawTx: { amount: 'NaN', status: 'paid' } },
      { id: 'INF_STR', rawTx: { amount: 'Infinity', status: 'paid' } },
      { id: 'EMPTY_STR', rawTx: { amount: '', status: 'paid' } },
      { id: 'NON_NUM', rawTx: { amount: 'sembilan-puluh-sembilan', status: 'paid' } },
      { id: 'ZERO', rawTx: { amount: 0, status: 'paid' } },
      { id: 'NEG', rawTx: { amount: -99000, status: 'paid' } },
      { id: 'BOOL', rawTx: { amount: true, status: 'paid' } },
    ];

    for (const tc of invalidCases) {
      const invId = `INV-BADAMT-${tc.id}`;
      const txId = `TX-BADAMT-${tc.id}`;
      redis.kv.set(
        buildPaymentOrderKey(invId),
        JSON.stringify({
          orderId: invId,
          invoiceId: invId,
          planId: 'pro_individu',
          planType: 'individu',
          baseAmount: 99000,
          status: 'pending_payment',
        })
      );
      redis.kv.set(
        buildWebhookTxKey(txId),
        JSON.stringify({
          transactionId: txId,
          orderId: invId,
          invoiceId: invId,
          licenseCode: validCode,
          planId: 'pro_individu',
          planType: 'individu',
          ...tc.rawTx,
        })
      );

      const res = await invokeHandler(activateLicenseHandler, {
        body: {
          action: 'verify_payment_order',
          invoiceId: invId,
          transactionId: txId,
          planId: 'pro_individu',
          deviceId: `DEV-${tc.id}`,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.reason).toBe('AMOUNT_MISMATCH');
      expect(res.body.verified).toBe(false);
      expect(res.body.activated).toBe(false);
      expect(res.body.licenseCode).toBeUndefined();
      expect(JSON.parse(redis.kv.get(buildPaymentOrderKey(invId))!).status).toBe('pending_payment');
      expect(redis.kv.has(buildSeatRedisKey(validCode))).toBe(false);
    }

    // Uji kasus order sintetis dengan paidAmount explicitly null (tidak boleh tertutup baseAmount)
    redis.kv.set(
      buildPaymentOrderKey('INV-SYNTH-NULL'),
      JSON.stringify({
        orderId: 'INV-SYNTH-NULL',
        invoiceId: 'INV-SYNTH-NULL',
        transactionId: 'TX-SYNTH-NULL',
        planId: 'pro_individu',
        planType: 'individu',
        baseAmount: 99000,
        paidAmount: null,
        status: 'paid',
      })
    );
    const synthNullRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify_payment_order',
        invoiceId: 'INV-SYNTH-NULL',
        planId: 'pro_individu',
        deviceId: 'DEV-SYNTH-NULL',
      },
    });
    expect(synthNullRes.statusCode).toBe(400);
    expect(synthNullRes.body.reason).toBe('AMOUNT_MISMATCH');

    // Transaksi sah nominal tepat Rp 99.000 tetap berhasil (HTTP 200, verified: true)
    redis.kv.set(
      buildPaymentOrderKey('INV-OK-99K'),
      JSON.stringify({
        orderId: 'INV-OK-99K',
        invoiceId: 'INV-OK-99K',
        planId: 'pro_individu',
        planType: 'individu',
        baseAmount: 99000,
        status: 'pending_payment',
        deviceId: 'DEV-OK-99K',
      })
    );
    redis.kv.set(
      buildWebhookTxKey('TX-OK-99K'),
      JSON.stringify({
        transactionId: 'TX-OK-99K',
        orderId: 'INV-OK-99K',
        invoiceId: 'INV-OK-99K',
        licenseCode: validCode,
        planId: 'pro_individu',
        planType: 'individu',
        amount: 99000,
        deviceId: 'DEV-OK-99K',
        status: 'paid',
        verifiedBy: 'server_authority',
      })
    );
    const okRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify_payment_order',
        invoiceId: 'INV-OK-99K',
        transactionId: 'TX-OK-99K',
        deviceId: 'DEV-OK-99K',
        planId: 'pro_individu',
      },
    });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.body.verified).toBe(true);
    expect(okRes.body.amount).toBe(99000);
    expect(okRes.body.licenseCode).toBe(validCode);
  });

  it('3. STALE_LOCK_FENCE (HTTP 409) pada aktivasi seat: proses lambat yang kehilangan lock tidak boleh menimpa pemegang fence baru', async () => {
    const soloCode = computeSerialLicenseCode('SOLOFENCE132');
    const lockKey = `asesmerdeka:lock:v1:SEAT:${soloCode}`;
    let injectedWinner = false;
    let winnerResult: any = null;

    // Saat Process A akan menjalankan SEAT_CAS, simulasi TTL lock A habis & Process B lebih baru merebut lock + menyelesaikan klaim seat
    redis.beforeEvalHook = async (tag, keys, _args, r) => {
      if (tag === 'SEAT_CAS' && keys[0] === buildSeatRedisKey(soloCode) && !injectedWinner) {
        injectedWinner = true;
        r.kv.delete(lockKey); // Simulasikan lock TTL Process A habis sebelum write
        winnerResult = await invokeHandler(activateLicenseHandler, {
          body: {
            action: 'verify',
            licenseCode: soloCode,
            deviceId: 'DEV-WINNER-B',
          },
        });
      }
    };

    const staleProcessARes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'verify',
        licenseCode: soloCode,
        deviceId: 'DEV-STALE-A',
      },
    });

    expect(injectedWinner).toBe(true);
    expect(winnerResult?.statusCode).toBe(200);
    expect(winnerResult?.body?.valid).toBe(true);

    // Process A wajib gagal fail-closed dengan HTTP 409 STALE_LOCK_FENCE (tanpa double activation / menimpa DEV-WINNER-B)
    expect(staleProcessARes.statusCode).toBe(409);
    expect(staleProcessARes.body.valid).toBe(false);
    expect(staleProcessARes.body.activated).toBe(false);
    expect(staleProcessARes.body.staleLockFence).toBe(true);
    expect(staleProcessARes.body.reason).toBe('STALE_LOCK_FENCE');

    const finalSeat = JSON.parse(redis.kv.get(buildSeatRedisKey(soloCode))!);
    expect(finalSeat.devices).toEqual(['DEV-WINNER-B']);
    expect(finalSeat.usedSeats).toBe(1);
    expect(Number(finalSeat.fenceToken)).toBeGreaterThanOrEqual(2);
    expect(redis.kv.has(lockKey)).toBe(false);
  });

  it('4. STALE_LOCK_FENCE (HTTP 409) pada create_payment_order & penolakan murni STALE_FENCE oleh Lua saat fenceToken tersimpan lebih tinggi', async () => {
    const orderId = 'INV-FENCE-ORDER-1';
    const orderLockKey = `asesmerdeka:lock:v1:ORDER:${orderId}`;
    let injectedNewerPaidOrder = false;

    // (a) Process A menjalankan create_payment_order namun terjeda sebelum FENCED_WRITE sementara worker B lebih baru meng-commit order 'paid'
    redis.beforeEvalHook = async (tag, keys, _args, r) => {
      if (tag === 'FENCED_WRITE' && keys[0] === buildPaymentOrderKey(orderId) && !injectedNewerPaidOrder) {
        injectedNewerPaidOrder = true;
        r.kv.delete(orderLockKey);
        r.kv.set(
          buildPaymentOrderKey(orderId),
          JSON.stringify({
            orderId,
            invoiceId: orderId,
            planId: 'pro_individu',
            planType: 'individu',
            baseAmount: 99000,
            paidAmount: 99000,
            transactionId: 'TX-FENCE-WINNER',
            status: 'paid',
            consistencyState: 'committed',
            fenceToken: 5,
          })
        );
      }
    };

    const staleOrderRes = await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: orderId,
        deviceId: 'DEV-STALE-ORD',
        buyerName: 'Stale Order',
      },
    });

    expect(injectedNewerPaidOrder).toBe(true);
    expect(staleOrderRes.statusCode).toBe(409);
    expect(staleOrderRes.body.ok).toBe(false);
    expect(staleOrderRes.body.staleLockFence).toBe(true);
    expect(staleOrderRes.body.reason).toBe('STALE_LOCK_FENCE');

    // Order paid milik worker lebih baru tetap utuh (tidak diturunkan ke pending_payment)
    const preservedOrder = JSON.parse(redis.kv.get(buildPaymentOrderKey(orderId))!);
    expect(preservedOrder.status).toBe('paid');
    expect(preservedOrder.fenceToken).toBe(5);
    expect(preservedOrder.transactionId).toBe('TX-FENCE-WINNER');

    // (b) Uji penolakan murni STALE_FENCE di Lua bahkan jika owner token lock masih cocok tetapi fenceToken < storedFence
    redis.beforeEvalHook = null;
    redis.kv.set(orderLockKey, 'LOCK_OWNER_ACTIVE');
    await expect(
      savePaymentOrderRecord(
        orderId,
        { orderId, status: 'pending_payment', fenceToken: 1 },
        { lockKey: orderLockKey, ownerToken: 'LOCK_OWNER_ACTIVE', expectedFenceToken: 1 }
      )
    ).rejects.toThrow(FencedWriteConflictError);

    const fenceSeatCode = computeSerialLicenseCode('PUREFENCE132');
    const seatLockKey = `asesmerdeka:lock:v1:SEAT:${fenceSeatCode}`;
    redis.kv.set(seatLockKey, 'LOCK_SEAT_ACTIVE');
    redis.kv.set(
      buildSeatRedisKey(fenceSeatCode),
      JSON.stringify({
        licenseCode: fenceSeatCode,
        maxSeats: 2,
        devices: ['DEV-NEW'],
        usedSeats: 1,
        seatRevision: 2,
        fenceToken: 7,
        lifecycleState: 'active',
      })
    );
    const casStale = await atomicSaveSeatRecordWithCas({
      cleanCode: fenceSeatCode,
      lockKey: seatLockKey,
      ownerToken: 'LOCK_SEAT_ACTIVE',
      expectedFenceToken: 2,
      expectedSeatRevision: 2,
      maxSeatsLimit: 2,
      nextRecord: {
        licenseCode: fenceSeatCode,
        maxSeats: 2,
        devices: ['DEV-NEW', 'DEV-STALE'],
        usedSeats: 2,
        seatRevision: 3,
        fenceToken: 2,
        lifecycleState: 'active',
      },
    });
    expect(casStale.ok).toBe(false);
    expect(casStale.reason).toBe('STALE_FENCE');
    expect(casStale.detail).toBe('7');
  });

  it('5. LOCK_CONTENTION_TIMEOUT (HTTP 409) deterministik pada aktivasi seat & create_payment_order tanpa mutasi state', async () => {
    process.env.ASESMERDEKA_LOCK_WAIT_TIMEOUT_MS = '60';
    const lockedCode = computeSerialLicenseCode('LOCKCONTEND132');
    const seatLockKey = `asesmerdeka:lock:v1:SEAT:${lockedCode}`;
    const orderId = 'INV-CONTEND-132';
    const orderLockKey = `asesmerdeka:lock:v1:ORDER:${orderId}`;

    // Pre-seed lock yang dipegang instance lain sehingga loop acquire selalu mendapat BUSY sampai timeout
    redis.kv.set(seatLockKey, 'LOCK_PEER_ACTIVE');
    redis.kv.set(orderLockKey, 'LOCK_PEER_ACTIVE');

    const [seatContendRes, orderContendRes] = await Promise.all([
      invokeHandler(activateLicenseHandler, {
        body: {
          action: 'verify',
          licenseCode: lockedCode,
          deviceId: 'DEV-WAIT-1',
        },
      }),
      invokeHandler(activateLicenseHandler, {
        body: {
          action: 'create_payment_order',
          planId: 'pro_individu',
          invoiceId: orderId,
          deviceId: 'DEV-WAIT-2',
        },
      }),
    ]);

    expect(seatContendRes.statusCode).toBe(409);
    expect(seatContendRes.body.valid).toBe(false);
    expect(seatContendRes.body.activated).toBe(false);
    expect(seatContendRes.body.lockContention).toBe(true);
    expect(seatContendRes.body.reason).toBe('LOCK_CONTENTION_TIMEOUT');

    expect(orderContendRes.statusCode).toBe(409);
    expect(orderContendRes.body.ok).toBe(false);
    expect(orderContendRes.body.lockContention).toBe(true);
    expect(orderContendRes.body.reason).toBe('LOCK_CONTENTION_TIMEOUT');

    // Lock milik peer tidak pernah dilepas & tidak ada state seat/order yang tertulis
    expect(redis.kv.get(seatLockKey)).toBe('LOCK_PEER_ACTIVE');
    expect(redis.kv.get(orderLockKey)).toBe('LOCK_PEER_ACTIVE');
    expect(redis.kv.has(buildSeatRedisKey(lockedCode))).toBe(false);
    expect(redis.kv.has(buildPaymentOrderKey(orderId))).toBe(false);
  });

  it('6. Konkurensi klaim kursi terakhir (Individu 2/2) menolak double allocation & Redis outage tetap fail-closed HTTP 503', async () => {
    const indivCode = computeSerialLicenseCode('RACEIND132');

    // Isi slot 1/2 terlebih dahulu
    const first = await invokeHandler(activateLicenseHandler, {
      body: { action: 'verify', licenseCode: indivCode, deviceId: 'DEV-SLOT-1' },
    });
    expect(first.statusCode).toBe(200);
    expect(first.body.usedSeats).toBe(1);

    // 2 permintaan bersamaan berebut slot ke-2 dari 2
    const [raceA, raceB] = await Promise.all([
      invokeHandler(activateLicenseHandler, {
        body: { action: 'verify', licenseCode: indivCode, deviceId: 'DEV-SLOT-2A' },
      }),
      invokeHandler(activateLicenseHandler, {
        body: { action: 'verify', licenseCode: indivCode, deviceId: 'DEV-SLOT-2B' },
      }),
    ]);

    const wins = [raceA, raceB].filter((r) => r.statusCode === 200 && r.body.valid === true);
    const losses = [raceA, raceB].filter((r) => r.statusCode === 403 && r.body.seatLimitExceeded === true);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);

    const savedSeat = JSON.parse(redis.kv.get(buildSeatRedisKey(indivCode))!);
    expect(savedSeat.devices).toHaveLength(2);
    expect(savedSeat.usedSeats).toBe(2);

    // Simulasi outage Redis -> seluruh operasi wajib fail-closed HTTP 503 tanpa fallback lokal
    redis.outageMode = true;
    const [outageVerify, outageOrder, outageOrderCheck] = await Promise.all([
      invokeHandler(activateLicenseHandler, {
        body: { action: 'verify', licenseCode: indivCode, deviceId: 'DEV-OUTAGE-1' },
      }),
      invokeHandler(activateLicenseHandler, {
        body: { action: 'create_payment_order', planId: 'pro_individu', invoiceId: 'INV-OUT-503' },
      }),
      invokeHandler(activateLicenseHandler, {
        body: { action: 'verify_payment_order', invoiceId: 'INV-OUT-503' },
      }),
    ]);

    for (const r of [outageVerify, outageOrder, outageOrderCheck]) {
      expect(r.statusCode).toBe(503);
      expect(r.body.redisUnavailable).toBe(true);
      expect(r.body.reason).toBe('REDIS_UNAVAILABLE');
    }
    expect(localSeatMemoryStore.size).toBe(0);
    expect(localPaymentOrderStore.size).toBe(0);
  });

  it('7. Hardening Legacy non-ASM-* allowlist: tolak eksplisit revoked, pending_reconciliation, settling, suspended, expired (tanpa/invalid expiresAt), dan state tak dikenal', async () => {
    const blockedLegacyCases: Array<{
      code: string;
      record: Record<string, unknown>;
      expectedFlags: Record<string, unknown>;
    }> = [
      {
        code: 'LEGACY-REVOKED-1',
        record: {
          licenseCode: 'LEGACY-REVOKED-1',
          environment: 'production',
          maxSeats: 2,
          devices: ['DEV-OLD-1'],
          usedSeats: 1,
          lifecycleState: 'revoked',
        },
        expectedFlags: { revoked: true, lifecycleState: 'revoked', reason: 'LICENSE_REVOKED' },
      },
      {
        code: 'LEGACY-RECON-1',
        record: {
          licenseCode: 'LEGACY-RECON-1',
          environment: 'production',
          maxSeats: 2,
          devices: [],
          lifecycleState: 'pending_reconciliation',
        },
        expectedFlags: {
          paymentUnverified: true,
          lifecycleState: 'pending_reconciliation',
          reason: 'PAYMENT_PENDING_RECONCILIATION',
        },
      },
      {
        code: 'LEGACY-RECON-CONSIST-1',
        record: {
          licenseCode: 'LEGACY-RECON-CONSIST-1',
          environment: 'production',
          maxSeats: 2,
          devices: [],
          consistencyState: 'pending_reconciliation',
        },
        expectedFlags: {
          paymentUnverified: true,
          lifecycleState: 'pending_reconciliation',
          reason: 'PAYMENT_PENDING_RECONCILIATION',
        },
      },
      {
        code: 'LEGACY-SETTLING-1',
        record: {
          licenseCode: 'LEGACY-SETTLING-1',
          environment: 'production',
          maxSeats: 2,
          devices: [],
          lifecycleState: 'settling',
        },
        expectedFlags: {
          paymentUnverified: true,
          lifecycleState: 'settling',
          reason: 'PAYMENT_SETTLING',
        },
      },
      {
        code: 'LEGACY-PENDING-1',
        record: {
          licenseCode: 'LEGACY-PENDING-1',
          environment: 'production',
          maxSeats: 2,
          devices: [],
          lifecycleState: 'pending_payment',
        },
        expectedFlags: {
          paymentUnverified: true,
          lifecycleState: 'pending_payment',
          reason: 'PAYMENT_UNVERIFIED',
        },
      },
      {
        code: 'LEGACY-FAILED-1',
        record: {
          licenseCode: 'LEGACY-FAILED-1',
          environment: 'production',
          maxSeats: 2,
          devices: [],
          lifecycleState: 'payment_failed',
        },
        expectedFlags: {
          paymentUnverified: true,
          lifecycleState: 'payment_failed',
          reason: 'PAYMENT_UNVERIFIED',
        },
      },
      {
        code: 'LEGACY-EXPIRED-NO-DATE',
        record: {
          licenseCode: 'LEGACY-EXPIRED-NO-DATE',
          environment: 'production',
          maxSeats: 2,
          devices: ['DEV-OLD-1'],
          usedSeats: 1,
          lifecycleState: 'expired',
          expiresAt: null,
        },
        expectedFlags: {
          expired: true,
          lifecycleState: 'expired',
          reason: 'LICENSE_EXPIRED',
        },
      },
      {
        code: 'LEGACY-INVALID-DATE',
        record: {
          licenseCode: 'LEGACY-INVALID-DATE',
          environment: 'production',
          maxSeats: 2,
          devices: ['DEV-OLD-1'],
          usedSeats: 1,
          lifecycleState: 'active',
          expiresAt: 'bukan-tanggal-iso',
        },
        expectedFlags: {
          expired: true,
          lifecycleState: 'expired',
          reason: 'INVALID_EXPIRATION_METADATA',
        },
      },
      {
        code: 'LEGACY-UNKNOWN-STATE',
        record: {
          licenseCode: 'LEGACY-UNKNOWN-STATE',
          environment: 'production',
          maxSeats: 2,
          devices: [],
          lifecycleState: 'trial_unverified',
        },
        expectedFlags: {
          paymentUnverified: true,
          lifecycleState: 'trial_unverified',
          reason: 'UNSUPPORTED_LIFECYCLE_STATE',
        },
      },
    ];

    for (const tc of blockedLegacyCases) {
      const seatKey = buildSeatRedisKey(tc.code);
      const rawJson = JSON.stringify(tc.record);
      redis.kv.set(seatKey, rawJson);

      const verifyRes = await invokeHandler(activateLicenseHandler, {
        body: { licenseCode: tc.code, deviceId: 'DEV-LEGACY-NEW' },
      });
      expect(verifyRes.statusCode).toBe(403);
      expect(verifyRes.body.valid).toBe(false);
      for (const [k, v] of Object.entries(tc.expectedFlags)) {
        expect(verifyRes.body[k]).toBe(v);
      }

      const statusRes = await invokeHandler(activateLicenseHandler, {
        body: { action: 'check_status', licenseCode: tc.code, deviceId: 'DEV-OLD-1' },
      });
      expect(statusRes.statusCode).toBe(403);
      expect(statusRes.body.valid).toBe(false);
      expect(statusRes.body.lifecycleState).toBe(tc.expectedFlags.lifecycleState);

      // Pastikan seat record tidak dimutasi saat ditolak
      expect(redis.kv.get(seatKey)).toBe(rawJson);
    }

    // Pastikan helper evaluateServerLifecycleState melaporkan state nonterminal dengan jujur
    expect(evaluateServerLifecycleState({ lifecycleState: 'pending_reconciliation' })).toBe('pending_reconciliation');
    expect(evaluateServerLifecycleState({ consistencyState: 'settling' })).toBe('settling');
    expect(validateSeatRecordLifecycle({ lifecycleState: 'active', expiresAt: 12345 }).reason).toBe(
      'INVALID_EXPIRATION_METADATA'
    );
  });

  it('8. Legacy non-ASM-* tanpa lifecycleState wajib fail-closed (403 paymentUnverified) kecuali didukung otoritas pembayaran server sah', async () => {
    // (a) Record tanpa lifecycleState & tanpa bukti pembayaran
    redis.kv.set(
      buildSeatRedisKey('LEGACY-NOLC-NOPAY'),
      JSON.stringify({
        licenseCode: 'LEGACY-NOLC-NOPAY',
        environment: 'production',
        maxSeats: 2,
        devices: ['DEV-OLD-1'],
        usedSeats: 1,
      })
    );
    const noPayRes = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'LEGACY-NOLC-NOPAY', deviceId: 'DEV-OLD-2' },
    });
    expect(noPayRes.statusCode).toBe(403);
    expect(noPayRes.body.valid).toBe(false);
    expect(noPayRes.body.paymentUnverified).toBe(true);
    expect(noPayRes.body.reason).toBe('MISSING_LIFECYCLE_AND_PAYMENT_AUTHORITY');

    // (b) Record tanpa lifecycleState yang merujuk TX nominal kurang (underpaid) -> tetap 403 paymentUnverified
    redis.kv.set(
      buildWebhookTxKey('TX-LEG-UNDER'),
      JSON.stringify({
        transactionId: 'TX-LEG-UNDER',
        licenseCode: 'LEGACY-NOLC-UNDER',
        planType: 'individu',
        amount: 45000,
        status: 'paid',
      })
    );
    redis.kv.set(
      buildSeatRedisKey('LEGACY-NOLC-UNDER'),
      JSON.stringify({
        licenseCode: 'LEGACY-NOLC-UNDER',
        environment: 'production',
        maxSeats: 2,
        devices: [],
        transactionId: 'TX-LEG-UNDER',
      })
    );
    const underRes = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'LEGACY-NOLC-UNDER', deviceId: 'DEV-UNDER' },
    });
    expect(underRes.statusCode).toBe(403);
    expect(underRes.body.paymentUnverified).toBe(true);
    expect(underRes.body.reason).toBe('MISSING_LIFECYCLE_AND_PAYMENT_AUTHORITY');

    // (c) Record historis sah tanpa lifecycleState YANG didukung transaksi paid penuh di server -> tetap bisa dipakai & membatasi seat
    redis.kv.set(
      buildWebhookTxKey('TX-LEG-VALID-01'),
      JSON.stringify({
        transactionId: 'TX-LEG-VALID-01',
        orderId: 'INV-LEG-VALID-01',
        licenseCode: 'LEGACY-NOLC-VALID',
        planType: 'individu',
        amount: 99000,
        status: 'paid',
        verifiedBy: 'historical_migration',
      })
    );
    redis.kv.set(
      buildSeatRedisKey('LEGACY-NOLC-VALID'),
      JSON.stringify({
        licenseCode: 'LEGACY-NOLC-VALID',
        environment: 'production',
        maxSeats: 2,
        devices: ['DEV-HIST-1'],
        usedSeats: 1,
        transactionId: 'TX-LEG-VALID-01',
      })
    );
    const validAuthRes = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'LEGACY-NOLC-VALID', deviceId: 'DEV-HIST-2' },
    });
    expect(validAuthRes.statusCode).toBe(200);
    expect(validAuthRes.body.valid).toBe(true);
    expect(validAuthRes.body.legacyRecord).toBe(true);
    expect(validAuthRes.body.usedSeats).toBe(2);
    expect(validAuthRes.body.maxSeats).toBe(2);
  });

  it('9. Lisensi historis valid (active/paid + lifetime/unexpired) tetap lolos, kode palsu ditolak, & isolasi Staging/Production utuh', async () => {
    const validLifetime = 'LEGACY-HIST-LIFE-01';
    const validFuture = 'LEGACY-HIST-EXP-02';

    redis.kv.set(
      buildSeatRedisKey(validLifetime),
      JSON.stringify({
        licenseCode: validLifetime,
        environment: 'production',
        planType: 'individu',
        tier: 'guru',
        maxSeats: 2,
        devices: ['DEV-L1'],
        usedSeats: 1,
        lifecycleState: 'active',
        expiresAt: null,
      })
    );
    redis.kv.set(
      buildSeatRedisKey(validFuture),
      JSON.stringify({
        licenseCode: validFuture,
        environment: 'production',
        planType: 'sekolah',
        tier: 'sekolah',
        maxSeats: 25,
        devices: [],
        usedSeats: 0,
        lifecycleState: 'paid',
        expiresAt: '2099-12-31T23:59:59.000Z',
      })
    );

    const lifeRes = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: validLifetime, deviceId: 'DEV-L2' },
    });
    expect(lifeRes.statusCode).toBe(200);
    expect(lifeRes.body.valid).toBe(true);
    expect(lifeRes.body.legacyRecord).toBe(true);
    expect(lifeRes.body.usedSeats).toBe(2);

    const futureSchoolRes = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: validFuture, deviceId: 'DEV-S1', teacherPin: 'PAK_BUDI' },
    });
    expect(futureSchoolRes.statusCode).toBe(200);
    expect(futureSchoolRes.body.valid).toBe(true);
    expect(futureSchoolRes.body.planType).toBe('sekolah');
    expect(futureSchoolRes.body.teacherKey).toBe('PAK_BUDI');

    // Kode palsu non-ASM dan ASM palsu ditolak tanpa panggilan ke Mayar
    const fakeNonAsm = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'PALSU-NON-ASM-2026', deviceId: 'DEV-FAKE' },
    });
    expect(fakeNonAsm.statusCode).toBe(400);
    expect(fakeNonAsm.body.reason).toBe('LICENSE_NOT_FOUND');

    const fakeAsm = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'ASM-GM26-FAKE-FAKE-FAKE', deviceId: 'DEV-FAKE' },
    });
    expect(fakeAsm.statusCode).toBe(403);
    expect(fakeAsm.body.reason).toBe('INVALID_LICENSE_SIGNATURE');

    // Production menolak legacy seat bertanda environment='staging' maupun kode ASM-STG2-*
    redis.kv.set(
      buildSeatRedisKey('LEGACY-STG-TAGGED'),
      JSON.stringify({
        licenseCode: 'LEGACY-STG-TAGGED',
        environment: 'staging',
        maxSeats: 2,
        devices: [],
        lifecycleState: 'paid',
      })
    );
    const stgLegacyOnProd = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: 'LEGACY-STG-TAGGED', deviceId: 'DEV-CROSS-P' },
    });
    expect(stgLegacyOnProd.statusCode).toBe(403);
    expect(stgLegacyOnProd.body.forbiddenEnvironment).toBe(true);
    expect(stgLegacyOnProd.body.reason).toBe('STAGING_LICENSE_FORBIDDEN_IN_PRODUCTION');

    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    const stgCode = generateStagingLicenseCode('GM26', 'ISO132');

    // Preview Staging menolak kode Production / legacy non-ASM-* dan menerima ASM-STG2-*
    const prodLegacyOnStg = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: validLifetime, deviceId: 'DEV-CROSS-S' },
    });
    expect(prodLegacyOnStg.statusCode).toBe(403);
    expect(prodLegacyOnStg.body.forbiddenEnvironment).toBe(true);
    expect(prodLegacyOnStg.body.reason).toBe('PRODUCTION_LICENSE_FORBIDDEN_IN_PREVIEW');

    const stgOnStg = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: stgCode, deviceId: 'DEV-STG-OK' },
    });
    expect(stgOnStg.statusCode).toBe(200);
    expect(stgOnStg.body.environment).toBe('staging');

    // Production menolak ASM-STG2-*
    process.env.VERCEL_ENV = 'production';
    const stgOnProd = await invokeHandler(activateLicenseHandler, {
      body: { licenseCode: stgCode, deviceId: 'DEV-CROSS-P2' },
    });
    expect(stgOnProd.statusCode).toBe(403);
    expect(stgOnProd.body.forbiddenEnvironment).toBe(true);
    expect(stgOnProd.body.reason).toBe('STAGING_LICENSE_FORBIDDEN_IN_PRODUCTION');
  });

  it('10. Primitif timingSafeEqualStrings valid & endpoint Mayar tetap 410 MAYAR_DECOMMISSIONED tanpa panggilan keluar', async () => {
    expect(timingSafeEqualStrings('secret-token-abc', 'secret-token-abc')).toBe(true);
    expect(timingSafeEqualStrings('secret-token-abc', 'secret-token-abd')).toBe(false);
    expect(timingSafeEqualStrings('secret-token-abc', 'secret-token-abcd')).toBe(false);
    expect(timingSafeEqualStrings('', '')).toBe(false);

    const [whRes, cronRes, orderMayarRes] = await Promise.all([
      invokeHandler(mayarWebhookHandler, { method: 'POST', body: { event: 'payment.received' } }),
      invokeHandler(cronReconcileHandler, { method: 'GET', url: '/api/cron/mayar-reconcile' }),
      invokeHandler(activateLicenseHandler, {
        body: { action: 'create_payment_order', planId: 'pro_individu', provider: 'mayar' },
      }),
    ]);

    expect(whRes.statusCode).toBe(410);
    expect(whRes.body.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(cronRes.statusCode).toBe(410);
    expect(cronRes.body.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(orderMayarRes.statusCode).toBe(410);
    expect(orderMayarRes.body.reason).toBe('MAYAR_DECOMMISSIONED');

    expect(outboundUrls.every((u) => u.startsWith(MOCK_REDIS_URL))).toBe(true);
  });
});
