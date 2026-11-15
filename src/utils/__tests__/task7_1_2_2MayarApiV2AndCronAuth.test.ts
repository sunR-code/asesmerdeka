import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Worker } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import activateLicenseHandler, {
  createMayarInvoiceViaApi,
  resolveMayarApiV2Config,
  parseMayarV2ResponseEnvelope,
  localSeatMemoryStore,
  localLicenseRegistryStore,
  localRevokedLicensesSet,
  localWebhookTransactionStore,
  localWebhookEventStore,
  localPaymentOrderStore,
  localMayarInvoiceIndexStore,
  localReconcileQueueStore,
  localWebhookAuditLog,
} from '../../../api/activate-license.js';
import mayarWebhookHandler, {
  extractMayarWebhookIdentifiers,
  correlateMayarTransactionViaApi,
} from '../../../api/mayar-webhook.js';
import cronReconcileHandler from '../../../api/cron/mayar-reconcile.js';
import { clearPaymentGatewayClientCaches } from '../paymentGateway';
import { getUserQuota } from '../licenseManager';

const memoryStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => (memoryStorage.has(k) ? memoryStorage.get(k)! : null),
      setItem: (k: string, v: string) => {
        memoryStorage.set(k, String(v));
      },
      removeItem: (k: string) => {
        memoryStorage.delete(k);
      },
      clear: () => {
        memoryStorage.clear();
      },
      key: (i: number) => Array.from(memoryStorage.keys())[i] ?? null,
      get length() {
        return memoryStorage.size;
      },
    },
    configurable: true,
    writable: true,
  });
}

const TEST_SIGNING_SECRET = 'ASESMERDEKA_TEST_SIGNING_SECRET_2026_V2';
const WEBHOOK_SECRET = 'MAYAR_WEBHOOK_SECRET_TEST_32CHARS_V2';
const CRON_SECRET = 'CRON_RECONCILE_SECRET_TEST_32CHARS_ONLY';
const MAYAR_API_KEY = 'MAYAR_SECRET_API_KEY_V2_TEST_001';
const REDIS_URL = 'https://redis-v2-test.upstash.io';
const REDIS_TOKEN = 'REDIS_TOKEN_V2_TEST_999';
const INDIVIDU_PRODUCT_ID = 'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';

function makeSerial(prefix: string, seed: string): string {
  let clean = seed.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  while (clean.length < 8) clean += 'X';
  const p1 = clean.slice(0, 4);
  const p2 = clean.slice(4, 8);
  const chars = `${prefix}${p1}${p2}`;
  let sum = 0;
  for (let i = 0; i < chars.length; i++) {
    sum = (sum + chars.charCodeAt(i) * (i + 3)) % 65536;
  }
  const chk = sum.toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `ASM-${prefix}-${p1}-${p2}-${chk}`;
}

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

async function invokeHandler(
  handler: (req: Record<string, unknown>, res: Record<string, unknown>) => Promise<unknown>,
  reqOpts: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
  }
): Promise<MockRes> {
  const out: MockRes = { statusCode: 200, headers: {}, body: {} };
  const req = {
    method: reqOpts.method || 'POST',
    url: reqOpts.url || '/',
    headers: { 'content-type': 'application/json', ...(reqOpts.headers || {}) },
    query: reqOpts.query || {},
    body: reqOpts.body ?? {},
  };
  const res = {
    setHeader(k: string, v: string) {
      out.headers[k] = v;
      return this;
    },
    status(code: number) {
      out.statusCode = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      out.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  await handler(req, res);
  return out;
}

class AtomicRedisAndMayarV2Simulator {
  kv = new Map<string, string>();
  lockExpiry = new Map<string, { owner: string; fence: number; expiresAt: number }>();
  outageMode = false;

  mayarInvoices: Record<string, Record<string, unknown>> = {};
  createRequests: Array<{ url: string; body: Record<string, unknown> }> = [];
  detailRequests: string[] = [];
  saasVerifyRequests: Array<{ url: string; body: Record<string, unknown> }> = [];
  forcedDetailResponse: { status: number; jsonData: Record<string, unknown> } | null = null;
  transientDetail503Ids = new Set<string>();

  private cleanExpired(key: string) {
    const meta = this.lockExpiry.get(key);
    if (meta && meta.expiresAt <= Date.now()) {
      this.lockExpiry.delete(key);
      this.kv.delete(key);
    }
  }

  private evalLua(script: string, keys: string[], args: string[]): unknown {
    if (script.includes('ASESMERDEKA_ACQUIRE_MULTI_LOCK_V1')) {
      const numLocks = Number(args[0] || 0);
      const owner = String(args[1] || '');
      const ttlMs = Number(args[2] || 5000);
      const lockKeys = keys.slice(0, numLocks);
      const fenceKey = keys[numLocks];
      const now = Date.now();
      for (const k of lockKeys) {
        this.cleanExpired(k);
        if (this.kv.has(k)) {
          const meta = this.lockExpiry.get(k);
          if (!meta || meta.owner !== owner) return ['BUSY', k];
        }
      }
      const nextFence = Number(this.kv.get(fenceKey) || '0') + 1;
      this.kv.set(fenceKey, String(nextFence));
      for (const k of lockKeys) {
        this.kv.set(k, `${owner}:${nextFence}`);
        this.lockExpiry.set(k, { owner, fence: nextFence, expiresAt: now + ttlMs });
      }
      return ['ACQUIRED', String(nextFence)];
    }

    if (script.includes('ASESMERDEKA_RELEASE_MULTI_LOCK_V1')) {
      const owner = String(args[0] || '');
      let released = 0;
      for (const k of keys) {
        const meta = this.lockExpiry.get(k);
        const val = this.kv.get(k);
        if ((meta && meta.owner === owner) || (val && val.startsWith(`${owner}:`))) {
          this.kv.delete(k);
          this.lockExpiry.delete(k);
          released += 1;
        }
      }
      return released;
    }

    if (script.includes('ASESMERDEKA_FENCED_RECORD_WRITE_V1')) {
      const [recordKey, lockKey] = keys;
      const owner = String(args[0] || '');
      const expectedFence = Number(args[1] || 0);
      const nextJson = String(args[2] || '{}');
      if (lockKey) {
        this.cleanExpired(lockKey);
        const meta = this.lockExpiry.get(lockKey);
        if (!this.kv.has(lockKey) || !meta || meta.owner !== owner) return ['LOCK_LOST', lockKey];
        if (meta.fence !== expectedFence) return ['STALE_FENCE', String(meta.fence)];
      }
      const curRaw = this.kv.get(recordKey);
      const curObj = curRaw ? JSON.parse(curRaw) : null;
      if (curObj && Number(curObj.fenceToken || 0) > expectedFence) {
        return ['STALE_FENCE', String(curObj.fenceToken)];
      }
      this.kv.set(recordKey, nextJson);
      return ['OK', String(expectedFence)];
    }

    if (script.includes('ASESMERDEKA_UPSERT_ADMIN_REGISTRY_V1')) {
      const registryKey = keys[0];
      const patch = JSON.parse(String(args[0] || '{}'));
      const curRaw = this.kv.get(registryKey);
      const list: Array<Record<string, unknown>> = curRaw ? JSON.parse(curRaw) : [];
      const idx = list.findIndex((item) => item.licenseCode === patch.licenseCode || item.code === patch.code);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch };
      } else {
        list.unshift(patch);
      }
      this.kv.set(registryKey, JSON.stringify(list));
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
      const seatPatchJson = String(args[10] || '{}');
      const adminPatchJson = String(args[11] || '');

      if (lockKey) {
        this.cleanExpired(lockKey);
        const meta = this.lockExpiry.get(lockKey);
        if (!this.kv.has(lockKey) || !meta || meta.owner !== owner) return ['LOCK_LOST', lockKey];
        if (meta.fence !== expectedFence) return ['STALE_FENCE', String(meta.fence)];
      }

      const curTxRaw = txKey ? this.kv.get(txKey) : null;
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
        const curEvtRaw = this.kv.get(eventKey);
        if (curEvtRaw) {
          const curEvt = JSON.parse(curEvtRaw);
          if (curEvt.consistencyState === 'committed') {
            if (
              (curEvt.licenseCode && curEvt.licenseCode !== cleanCode) ||
              (curEvt.transactionId && curEvt.transactionId !== txId) ||
              (orderId && curEvt.orderId && curEvt.orderId !== orderId)
            ) {
              return ['TRANSACTION_ALREADY_BOUND', curEvt.licenseCode || curEvt.transactionId || ''];
            }
            return ['IDEMPOTENT', curEvt.licenseCode || cleanCode];
          }
        }
      }

      const curSeatRaw = seatKey ? this.kv.get(seatKey) : null;
      const curSeat = curSeatRaw ? JSON.parse(curSeatRaw) : null;
      if (curSeat && Number(curSeat.fenceToken || 0) > expectedFence) {
        return ['STALE_FENCE', String(curSeat.fenceToken)];
      }

      const curOrderRaw = hasOrder && orderKey ? this.kv.get(orderKey) : null;
      const curOrder = curOrderRaw ? JSON.parse(curOrderRaw) : null;
      if (curOrder && curOrder.transactionId && curOrder.transactionId !== txId) {
        return ['TRANSACTION_ALREADY_BOUND', curOrder.transactionId];
      }

      this.kv.set(txKey, txJson);
      if (hasEvent && eventKey) this.kv.set(eventKey, eventJson);
      if (hasOrder && orderKey) this.kv.set(orderKey, orderJson);

      const seatPatch = JSON.parse(seatPatchJson || '{}');
      const nextSeat = curSeat ? { ...curSeat, ...seatPatch } : { ...seatPatch };
      nextSeat.devices = Array.isArray(curSeat?.devices) ? curSeat.devices : [];
      nextSeat.lifecycleState = nextSeat.devices.length > 0 ? 'active' : 'paid';
      nextSeat.consistencyState = 'committed';
      nextSeat.fenceToken = expectedFence;
      nextSeat.seatRevision = Number(curSeat?.seatRevision || 0) + 1;
      this.kv.set(seatKey, JSON.stringify(nextSeat));

      const adminPatch = JSON.parse(adminPatchJson || '{}');
      const curRegRaw = this.kv.get(registryKey);
      const regList: Array<Record<string, unknown>> = curRegRaw ? JSON.parse(curRegRaw) : [];
      const idx = regList.findIndex((entry) => entry.code === cleanCode || entry.licenseCode === cleanCode);
      if (idx >= 0) {
        regList[idx] = {
          ...regList[idx],
          updatedAt: adminPatch.updatedAt,
          label: adminPatch.label,
          planType: adminPatch.planType,
          tier: adminPatch.tier,
          transactionId: txId,
          lifecycleState: nextSeat.lifecycleState,
        };
      } else {
        regList.unshift({
          ...adminPatch.newEntry,
          lifecycleState: nextSeat.lifecycleState,
          transactionId: txId,
        });
      }
      this.kv.set(registryKey, JSON.stringify(regList));
      return ['COMMITTED', nextSeat.lifecycleState, String(expectedFence)];
    }

    return null;
  }

  async handleFetch(
    urlStr: string,
    method: string,
    headers: Record<string, string>,
    bodyStr?: string
  ): Promise<{ ok: boolean; status: number; jsonData: Record<string, unknown> }> {
    if (urlStr.startsWith(REDIS_URL)) {
      if (this.outageMode) {
        throw new Error('Redis connection refused');
      }
      if (headers.authorization !== `Bearer ${REDIS_TOKEN}`) {
        return { ok: false, status: 401, jsonData: { error: 'Unauthorized' } };
      }
      const pathPart = urlStr.slice(REDIS_URL.length);
      if ((pathPart === '' || pathPart === '/') && method === 'POST' && bodyStr) {
        const cmd = JSON.parse(bodyStr) as string[];
        if (cmd[0] === 'EVAL') {
          const numKeys = Number(cmd[2] || 0);
          const keys = cmd.slice(3, 3 + numKeys);
          const args = cmd.slice(3 + numKeys);
          return { ok: true, status: 200, jsonData: { result: this.evalLua(cmd[1], keys, args) } };
        }
      }
      if (pathPart.startsWith('/get/')) {
        const key = decodeURIComponent(pathPart.slice('/get/'.length));
        return {
          ok: true,
          status: 200,
          jsonData: { result: this.kv.has(key) ? this.kv.get(key)! : null },
        };
      }
      if (pathPart.startsWith('/set/')) {
        const key = decodeURIComponent(pathPart.slice('/set/'.length));
        this.kv.set(key, String(bodyStr ?? ''));
        return { ok: true, status: 200, jsonData: { result: 'OK' } };
      }
      if (pathPart.startsWith('/del/')) {
        const key = decodeURIComponent(pathPart.slice('/del/'.length));
        const existed = this.kv.delete(key);
        this.lockExpiry.delete(key);
        return { ok: true, status: 200, jsonData: { result: existed ? 1 : 0 } };
      }
    }

    if (urlStr.endsWith('/hl/v2/invoices/create')) {
      if (headers.authorization !== `Bearer ${MAYAR_API_KEY}`) {
        return { ok: false, status: 401, jsonData: { statusCode: 401, messages: 'Unauthorized' } };
      }
      const payload = JSON.parse(bodyStr || '{}');
      this.createRequests.push({ url: urlStr, body: payload });
      const newInvUuid = `UUID-V2-${String(this.createRequests.length).padStart(3, '0')}`;
      const newTxUuid = `TX-V2-INIT-${String(this.createRequests.length).padStart(3, '0')}`;
      const link = `https://checkout.mayar.test/v2/${newInvUuid}`;
      this.mayarInvoices[newInvUuid] = {
        id: newInvUuid,
        status: 'unpaid',
        amount: payload.items?.[0]?.rate || 99000,
        transactionId: newTxUuid,
        link,
        productId: INDIVIDU_PRODUCT_ID,
      };
      return {
        ok: true,
        status: 200,
        jsonData: {
          statusCode: 200,
          messages: 'success',
          data: {
            id: newInvUuid,
            transactionId: newTxUuid,
            link,
            expiredAt: payload.expiredAt,
            extraData: payload.extraData,
          },
        },
      };
    }

    if (urlStr.includes('/hl/v2/invoices/')) {
      if (headers.authorization !== `Bearer ${MAYAR_API_KEY}`) {
        return { ok: false, status: 401, jsonData: { statusCode: 401, messages: 'Unauthorized' } };
      }
      const lookupId = decodeURIComponent(urlStr.split('/hl/v2/invoices/')[1] || '');
      this.detailRequests.push(lookupId);

      if (this.forcedDetailResponse) {
        return {
          ok: this.forcedDetailResponse.status >= 200 && this.forcedDetailResponse.status < 300,
          status: this.forcedDetailResponse.status,
          jsonData: this.forcedDetailResponse.jsonData,
        };
      }

      if (this.transientDetail503Ids.has(lookupId)) {
        return {
          ok: false,
          status: 503,
          jsonData: { statusCode: 503, messages: 'upstream unavailable' },
        };
      }

      const rec = this.mayarInvoices[lookupId];
      if (!rec) {
        return { ok: false, status: 404, jsonData: { statusCode: 404, messages: 'Not found' } };
      }
      return {
        ok: true,
        status: 200,
        jsonData: {
          statusCode: 200,
          messages: 'success',
          data: rec,
        },
      };
    }

    if (urlStr.endsWith('/saas/v2/license/verify')) {
      const payload = JSON.parse(bodyStr || '{}');
      this.saasVerifyRequests.push({ url: urlStr, body: payload });
      return {
        ok: true,
        status: 200,
        jsonData: {
          statusCode: 200,
          messages: 'success',
          data: { isLicenseActive: true, productId: INDIVIDU_PRODUCT_ID },
        },
      };
    }

    return { ok: false, status: 404, jsonData: { error: `Unexpected URL: ${urlStr}` } };
  }
}

async function runConcurrentWebhookWorkers(
  sim: AtomicRedisAndMayarV2Simulator,
  specs: Array<{ url?: string; body: Record<string, unknown> }>
): Promise<Array<{ workerId: string; statusCode: number; body: Record<string, unknown> }>> {
  const webhookUrl = pathToFileURL(path.resolve(process.cwd(), 'api/mayar-webhook.js')).href;
  const workerBootstrap = `
    const { parentPort, workerData } = require('node:worker_threads');
    (async () => {
      try {
        delete process.env.MAYAR_API_BASE_URL;
        delete process.env.MAYAR_SANDBOX;
        delete process.env.MAYAR_ENV;
        for (const [k, v] of Object.entries(workerData.env || {})) {
          process.env[k] = String(v);
        }
        let reqSeq = 0;
        const pending = new Map();
        parentPort.on('message', (msg) => {
          if (msg && msg.type === 'FETCH_RES' && pending.has(msg.reqId)) {
            const { resolve, reject } = pending.get(msg.reqId);
            pending.delete(msg.reqId);
            if (msg.error) reject(new Error(msg.error));
            else resolve(msg);
          }
        });
        globalThis.fetch = (input, init) => new Promise((resolve, reject) => {
          const reqId = ++reqSeq;
          const headers = {};
          if (init && init.headers) {
            for (const [hk, hv] of Object.entries(init.headers)) {
              headers[String(hk).toLowerCase()] = String(hv);
            }
          }
          pending.set(reqId, {
            resolve: (reply) => resolve({
              ok: Boolean(reply.ok),
              status: Number(reply.status || 200),
              json: async () => reply.jsonData,
              text: async () => JSON.stringify(reply.jsonData),
            }),
            reject,
          });
          parentPort.postMessage({
            type: 'FETCH',
            reqId,
            url: String(input),
            method: init && init.method ? String(init.method) : 'GET',
            headers,
            body: init && init.body !== undefined ? String(init.body) : undefined,
          });
        });
        const mod = await import(workerData.webhookUrl);
        let statusCode = 200;
        let responseBody = null;
        const req = {
          method: 'POST',
          url: workerData.req.url || '/api/mayar-webhook',
          headers: { 'content-type': 'application/json' },
          body: workerData.req.body || {},
        };
        const res = {
          setHeader() { return res; },
          status(c) { statusCode = c; return res; },
          json(p) { responseBody = p; return res; },
          end() { return res; },
        };
        await mod.default(req, res);
        parentPort.postMessage({ type: 'DONE', workerId: workerData.workerId, statusCode, body: responseBody });
      } catch (err) {
        parentPort.postMessage({ type: 'ERR', workerId: workerData.workerId, message: err && err.message ? err.message : String(err) });
      }
    })();
  `;

  return Promise.all(
    specs.map(
      (spec, idx) =>
        new Promise<{ workerId: string; statusCode: number; body: Record<string, unknown> }>(
          (resolve, reject) => {
            const worker = new Worker(workerBootstrap, {
              eval: true,
              workerData: {
                workerId: `W${idx + 1}`,
                webhookUrl,
                req: spec,
                env: {
                  NODE_ENV: 'production',
                  ASESMERDEKA_LICENSE_SIGNING_SECRET: TEST_SIGNING_SECRET,
                  MAYAR_WEBHOOK_SECRET: WEBHOOK_SECRET,
                  UPSTASH_REDIS_REST_URL: REDIS_URL,
                  UPSTASH_REDIS_REST_TOKEN: REDIS_TOKEN,
                  MAYAR_API_KEY,
                  MAYAR_PRODUCT_ID: INDIVIDU_PRODUCT_ID,
                },
              },
            });
            worker.on('message', async (msg: Record<string, unknown>) => {
              if (msg.type === 'FETCH') {
                const reply = await sim.handleFetch(
                  String(msg.url),
                  String(msg.method),
                  (msg.headers as Record<string, string>) || {},
                  msg.body as string | undefined
                );
                worker.postMessage({ type: 'FETCH_RES', reqId: msg.reqId, ...reply });
              } else if (msg.type === 'DONE') {
                await worker.terminate().catch(() => {});
                resolve({
                  workerId: String(msg.workerId),
                  statusCode: Number(msg.statusCode),
                  body: (msg.body as Record<string, unknown>) || {},
                });
              } else if (msg.type === 'ERR') {
                await worker.terminate().catch(() => {});
                reject(new Error(String(msg.message)));
              }
            });
            worker.on('error', reject);
          }
        )
    )
  );
}

describe('Task 7.1.2.2 — Mayar API V2 Migration, Webhook Identity & Cron Auth Closure (20 Tests)', () => {
  let sim: AtomicRedisAndMayarV2Simulator;
  const originalFetch = globalThis.fetch;
  const envBackup = { ...process.env };

  beforeEach(() => {
    sim = new AtomicRedisAndMayarV2Simulator();
    localSeatMemoryStore.clear();
    localLicenseRegistryStore.length = 0;
    localRevokedLicensesSet.clear();
    localWebhookTransactionStore.clear();
    localWebhookEventStore.clear();
    localPaymentOrderStore.clear();
    localMayarInvoiceIndexStore.clear();
    localReconcileQueueStore.length = 0;
    localWebhookAuditLog.length = 0;
    localStorage.clear();
    clearPaymentGatewayClientCaches();

    process.env.NODE_ENV = 'production';
    process.env.ASESMERDEKA_LICENSE_SIGNING_SECRET = TEST_SIGNING_SECRET;
    process.env.MAYAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REDIS_TOKEN;
    process.env.MAYAR_API_KEY = MAYAR_API_KEY;
    delete process.env.MAYAR_API_BASE_URL;
    delete process.env.MAYAR_SANDBOX;
    delete process.env.MAYAR_ENV;
    process.env.MAYAR_PRODUCT_ID = INDIVIDU_PRODUCT_ID;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers: Record<string, string> = {};
      if (init?.headers) {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          headers[k.toLowerCase()] = String(v);
        }
      }
      const reply = await sim.handleFetch(
        String(input),
        init?.method || 'GET',
        headers,
        init?.body !== undefined ? String(init.body) : undefined
      );
      return {
        ok: reply.ok,
        status: reply.status,
        json: async () => reply.jsonData,
      } as Response;
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...envBackup };
  });

  it('1. Create Invoice memanggil POST /hl/v2/invoices/create (prod & sandbox) & menolak konfigurasi V1 tanpa fallback', async () => {
    const prodRes = await createMayarInvoiceViaApi({
      orderId: 'INV-V2-PROD-01',
      planSpec: { planId: 'pro_individu', name: 'AsesMerdeka Guru Mandiri', price: 99000 },
      buyerName: 'Ibu Rina',
      buyerEmail: 'rina@sdn1.sch.id',
      buyerMobile: '081234567890',
      deviceId: 'DEV-01',
    });
    expect(prodRes.created).toBe(true);
    expect(prodRes.mayarApiVersion).toBe('hl/v2');
    expect(prodRes.mayarInvoiceId).toBe('UUID-V2-001');
    expect(prodRes.mayarTransactionId).toBe('TX-V2-INIT-001');
    expect(sim.createRequests[0].url).toBe('https://api.mayar.id/hl/v2/invoices/create');
    expect(sim.createRequests[0].body.expiredAt).toBeTypeOf('string');
    expect((sim.createRequests[0].body.extraData as Record<string, unknown>)?.orderId).toBe('INV-V2-PROD-01');

    process.env.MAYAR_SANDBOX = 'true';
    const sbRes = await createMayarInvoiceViaApi({
      orderId: 'INV-V2-SB-01',
      planSpec: { planId: 'pro_individu', name: 'AsesMerdeka Guru Mandiri', price: 99000 },
      buyerName: 'Pak Budi',
      buyerEmail: 'budi@sdn2.sch.id',
    });
    expect(sbRes.created).toBe(true);
    expect(sim.createRequests[1].url).toBe('https://api.mayar.io/hl/v2/invoices/create');

    process.env.MAYAR_API_BASE_URL = 'https://api.mayar.id/hl/v1';
    const v1Blocked = await createMayarInvoiceViaApi({
      orderId: 'INV-V1-BLOCKED',
      planSpec: { planId: 'pro_individu', name: 'Guru', price: 99000 },
    });
    expect(v1Blocked.created).toBe(false);
    expect(v1Blocked.reason).toBe('DEPRECATED_MAYAR_V1_URL');
    expect(sim.createRequests).toHaveLength(2);
  });

  it('2. Detail Invoice memanggil GET /hl/v2/invoices/{uuid} & verifyWithMayar memakai /saas/v2/license/verify', async () => {
    sim.mayarInvoices['UUID-DETAIL-02'] = {
      id: 'UUID-DETAIL-02',
      status: 'paid',
      amount: 99000,
      transactionId: 'TXN-DETAIL-02',
      transactions: [{ id: 'TXN-DETAIL-02' }],
      productId: INDIVIDU_PRODUCT_ID,
    };

    const detail = await correlateMayarTransactionViaApi({
      mayarInvoiceId: 'UUID-DETAIL-02',
      expectedAmount: 99000,
    });
    expect(detail.resolved).toBe(true);
    expect(detail.mayarApiVersion).toBe('hl/v2');
    expect(detail.transactionId).toBe('TXN-DETAIL-02');
    expect(sim.detailRequests).toEqual(['UUID-DETAIL-02']);

    const saasVerify = await invokeHandler(activateLicenseHandler, {
      url: '/api/activate-license',
      body: {
        action: 'verify',
        licenseCode: 'LICENSE-SAAS-V2-TEST',
        deviceId: 'DEV-SAAS-V2',
      },
    });
    expect(saasVerify.statusCode).toBe(200);
    expect(saasVerify.body.valid).toBe(true);
    expect(sim.saasVerifyRequests).toHaveLength(1);
    expect(sim.saasVerifyRequests[0].url).toBe('https://api.mayar.id/saas/v2/license/verify');
  });

  it('3. Audit statis: tidak ada endpoint aktif /hl/v1, /saas/v1, /software/v1, atau api.mayar.club tersisa di api/', () => {
    const apiFiles = [
      path.resolve(process.cwd(), 'api/activate-license.js'),
      path.resolve(process.cwd(), 'api/mayar-webhook.js'),
      path.resolve(process.cwd(), 'api/cron/mayar-reconcile.js'),
    ];
    for (const filePath of apiFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const strippedGuard = content
        .split('\n')
        .filter(
          (line) =>
            !line.includes('DEPRECATED_MAYAR_V1_URL') &&
            !line.includes("lower.includes('") &&
            !line.includes('telah kedaluwarsa')
        )
        .join('\n');
      expect(strippedGuard).not.toMatch(/\/hl\/v1\b/i);
      expect(strippedGuard).not.toMatch(/\/saas\/v1\b/i);
      expect(strippedGuard).not.toMatch(/\/software\/v1\b/i);
      expect(strippedGuard).not.toMatch(/api\.mayar\.club/i);
    }
    const cfg = resolveMayarApiV2Config();
    expect(cfg.ok).toBe(true);
    expect(cfg.hlV2BaseUrl).toBe('https://api.mayar.id/hl/v2');
  });

  it('4. Response API V2 berformat { statusCode, messages, data } diparsing akurat', () => {
    const parsed = parseMayarV2ResponseEnvelope(
      { ok: true, status: 200 },
      {
        statusCode: 200,
        messages: 'success',
        data: { id: 'UUID-ENV-04', status: 'paid', amount: 99000 },
      }
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.statusCode).toBe(200);
    expect(parsed.messages).toBe('success');
    expect((parsed.data as Record<string, unknown>)?.id).toBe('UUID-ENV-04');
  });

  it('5. HTTP 200 dengan payload gagal/error atau envelope tidak lengkap ditolak tanpa aktivasi', async () => {
    const badEnvelope1 = parseMayarV2ResponseEnvelope(
      { ok: true, status: 200 },
      { statusCode: 200, error: true, messages: 'failed', data: null }
    );
    expect(badEnvelope1.ok).toBe(false);

    const badEnvelope2 = parseMayarV2ResponseEnvelope(
      { ok: true, status: 200 },
      { statusCode: 500, messages: 'error', data: {} }
    );
    expect(badEnvelope2.ok).toBe(false);

    sim.forcedDetailResponse = {
      status: 200,
      jsonData: { statusCode: 200, messages: 'success', data: 'incomplete' as unknown as Record<string, unknown> },
    };
    const code = makeSerial('GM26', 'V2BAD5');
    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'TXN-BAD-ENV-05',
          mayarInvoiceId: 'UUID-BAD-ENV-05',
          transactionId: 'TXN-BAD-ENV-05',
          orderId: 'INV-BAD-ENV-05',
          status: 'paid',
          amount: 99000,
          licenseCode: code,
        },
      },
    });
    expect(res.statusCode).toBe(202);
    expect(res.body.activated).toBe(false);
    expect(res.body.correlationReason).toBe('MAYAR_API_INCOMPLETE_ENVELOPE');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
  });

  it('6. Invoice UUID (data.id) dan Transaction ID (data.transactionId) dari create invoice disimpan terpisah tanpa melunaskan order', async () => {
    const res = await invokeHandler(activateLicenseHandler, {
      url: '/api/activate-license',
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-SEP-06',
        deviceId: 'DEV-SEP-06',
        buyerName: 'Pak Andi',
        buyerEmail: 'andi@sdn3.sch.id',
        createMayarInvoice: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.mayarInvoiceId).toBe('UUID-V2-001');
    expect(res.body.mayarTransactionId).toBe('TX-V2-INIT-001');
    expect(res.body.mayarInvoiceId).not.toBe(res.body.mayarTransactionId);
    expect(res.body.mayarApiVersion).toBe('hl/v2');
    expect((res.body.order as Record<string, unknown>)?.status).toBe('pending_payment');
    expect(sim.kv.get('asesmerdeka:mayar:inv_idx:v1:UUID-V2-001')).toBeTruthy();
  });

  it('7. API detail invoice dengan nominal tidak cocok dengan harga kanonik plan ditolak permanen 400 AMOUNT_MISMATCH', async () => {
    const code = makeSerial('GM26', 'V2AMT7');
    sim.mayarInvoices['UUID-UNDERPAY-07'] = {
      id: 'UUID-UNDERPAY-07',
      status: 'paid',
      amount: 50000,
      transactionId: 'TXN-UNDERPAY-07',
      transactions: [{ id: 'TXN-UNDERPAY-07' }],
      productId: INDIVIDU_PRODUCT_ID,
    };

    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'TXN-UNDERPAY-07',
          mayarInvoiceId: 'UUID-UNDERPAY-07',
          transactionId: 'TXN-UNDERPAY-07',
          orderId: 'INV-UNDERPAY-07',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.activated).toBe(false);
    expect(res.body.reason).toBe('AMOUNT_MISMATCH');
    expect(res.body.idempotencyStatus).toBe('terminal_rejected');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
  });

  it('8. Invoice berstatus "unpaid" dari API detail V2 tidak mengaktifkan lisensi (pending_reconciliation 202)', async () => {
    const code = makeSerial('GM26', 'V2UNP8');
    sim.mayarInvoices['UUID-UNPAID-08'] = {
      id: 'UUID-UNPAID-08',
      status: 'unpaid',
      amount: 99000,
      transactionId: 'TX-V2-INIT-08',
      productId: INDIVIDU_PRODUCT_ID,
    };

    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'TX-V2-INIT-08',
          mayarInvoiceId: 'UUID-UNPAID-08',
          transactionId: 'TX-V2-INIT-08',
          orderId: 'INV-UNPAID-08',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });
    expect(res.statusCode).toBe(202);
    expect(res.body.activated).toBe(false);
    expect(res.body.correlationReason).toBe('MAYAR_API_PAYMENT_NOT_SETTLED');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
  });

  it('9. Invoice berstatus "paid" dengan nominal & transactionId valid (termasuk multi-tx konsisten vs ambigu) mengaktifkan lisensi tepat 1x', async () => {
    const codeAmbig = makeSerial('GM26', 'V2AMB9');
    sim.mayarInvoices['UUID-MULTI-AMBIG-09'] = {
      id: 'UUID-MULTI-AMBIG-09',
      status: 'paid',
      amount: 99000,
      transactions: [{ id: 'TXN-M1' }, { id: 'TXN-M2' }],
    };
    const ambigDetail = await correlateMayarTransactionViaApi({
      mayarInvoiceId: 'UUID-MULTI-AMBIG-09',
      expectedAmount: 99000,
    });
    expect(ambigDetail.resolved).toBe(false);
    expect(ambigDetail.reason).toBe('AMBIGUOUS_MULTI_TRANSACTION_INVOICE');

    const codeValid = makeSerial('GM26', 'V2PAID9');
    sim.mayarInvoices['UUID-PAID-09'] = {
      id: 'UUID-PAID-09',
      status: 'paid',
      amount: 99000,
      transactionId: 'TXN-PAID-09',
      transactions: [{ id: 'TXN-OLD-ATTEMPT' }, { id: 'TXN-PAID-09' }],
      productId: INDIVIDU_PRODUCT_ID,
    };
    const okRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'TXN-PAID-09',
          mayarInvoiceId: 'UUID-PAID-09',
          transactionId: 'TXN-PAID-09',
          orderId: 'INV-PAID-09',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: codeValid,
        },
      },
    });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.body.activated).toBe(true);
    expect(okRes.body.transactionId).toBe('TXN-PAID-09');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${codeValid}`)).toBe(true);
    expect(sim.kv.has(`asesmerdeka:seats:v1:${codeAmbig}`)).toBe(false);
  });

  it('10. Webhook dengan data.id === data.transactionId tidak mencampur webhook delivery ID, transaction ID, maupun invoice UUID', () => {
    const ids = extractMayarWebhookIdentifiers(
      {
        event: 'payment.received',
        data: {
          id: 'SAME-TX-UUID-10',
          transactionId: 'SAME-TX-UUID-10',
          mayarInvoiceId: 'INVOICE-UUID-10',
          orderId: 'INV-ORDER-10',
        },
      },
      {
        id: 'SAME-TX-UUID-10',
        transactionId: 'SAME-TX-UUID-10',
        mayarInvoiceId: 'INVOICE-UUID-10',
        orderId: 'INV-ORDER-10',
      }
    );
    expect(ids.webhookDataId).toBe('SAME-TX-UUID-10');
    expect(ids.transactionId).toBe('SAME-TX-UUID-10');
    expect(ids.mayarInvoiceId).toBe('INVOICE-UUID-10');
    expect(ids.dataIdSameAsTransactionId).toBe(true);
    expect(ids.webhookEventId).toBe('V2:PAYMENT.RECEIVED:SAME-TX-UUID-10');
    expect(ids.hasDistinctEventAndTransactionId).toBe(true);
  });

  it('11. Event payment.reminder tidak pernah mengaktifkan lisensi atau melunaskan order', async () => {
    const code = makeSerial('GM26', 'V2REM11');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-REMINDER-11',
        mayarInvoiceId: 'UUID-REMINDER-11',
        deviceId: 'DEV-REM-11',
      },
    });

    const reminderRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.reminder',
        data: {
          id: 'TXN-REMINDER-11',
          transactionId: 'TXN-REMINDER-11',
          mayarInvoiceId: 'UUID-REMINDER-11',
          orderId: 'INV-REMINDER-11',
          status: 'unpaid',
          amount: 99000,
          licenseCode: code,
        },
      },
    });
    expect(reminderRes.statusCode).toBe(200);
    expect(reminderRes.body.activated).toBe(false);
    expect(reminderRes.body.reminderHandled).toBe(true);
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
    const savedOrder = JSON.parse(sim.kv.get('asesmerdeka:mayar:order:v1:INV-REMINDER-11') || '{}');
    expect(savedOrder.status).toBe('pending_payment');
  });

  it('12. payment.reminder dan payment.received pada transactionId sama tidak saling memblokir', async () => {
    const code = makeSerial('GM26', 'V2REM12');
    const sharedTxId = 'TXN-SHARED-V2-12';
    sim.mayarInvoices['UUID-REM-REC-12'] = {
      id: 'UUID-REM-REC-12',
      status: 'paid',
      amount: 99000,
      transactionId: sharedTxId,
      transactions: [{ id: sharedTxId }],
      productId: INDIVIDU_PRODUCT_ID,
    };

    const reminderRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.reminder',
        data: {
          id: sharedTxId,
          transactionId: sharedTxId,
          mayarInvoiceId: 'UUID-REM-REC-12',
          orderId: 'INV-REM-REC-12',
          status: 'unpaid',
          amount: 99000,
          licenseCode: code,
        },
      },
    });
    expect(reminderRes.statusCode).toBe(200);
    expect(reminderRes.body.activated).toBe(false);

    const receivedRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: sharedTxId,
          transactionId: sharedTxId,
          mayarInvoiceId: 'UUID-REM-REC-12',
          orderId: 'INV-REM-REC-12',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });
    expect(receivedRes.statusCode).toBe(200);
    expect(receivedRes.body.activated).toBe(true);
    expect(receivedRes.body.webhookEventId).toBe(`V2:PAYMENT.RECEIVED:${sharedTxId}`);
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(true);
  });

  it('13. Webhook duplikat pada event V2 yang sama tetap idempoten tanpa aktivasi ganda', async () => {
    const code = makeSerial('GM26', 'V2DUP13');
    sim.mayarInvoices['UUID-DUP-13'] = {
      id: 'UUID-DUP-13',
      status: 'paid',
      amount: 99000,
      transactionId: 'TXN-DUP-13',
      transactions: [{ id: 'TXN-DUP-13' }],
    };
    const body = {
      event: 'payment.received',
      data: {
        id: 'TXN-DUP-13',
        transactionId: 'TXN-DUP-13',
        mayarInvoiceId: 'UUID-DUP-13',
        orderId: 'INV-DUP-13',
        status: 'paid',
        amount: 99000,
        licenseCode: code,
      },
    };
    const first = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body,
    });
    const second = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body,
    });
    expect(first.statusCode).toBe(200);
    expect(first.body.activated).toBe(true);
    expect(second.statusCode).toBe(200);
    expect(second.body.idempotentReplay).toBe(true);
    const regList = JSON.parse(sim.kv.get('asesmerdeka:admin:license_registry:v1') || '[]');
    expect(regList.filter((entry: Record<string, unknown>) => entry.code === code)).toHaveLength(1);
  });

  it('14. Webhook gagal verifikasi sementara masuk pending_reconciliation & pulih setelah API Mayar V2 sehat', async () => {
    const code = makeSerial('GM26', 'V2REC14');
    sim.transientDetail503Ids.add('UUID-RECOVER-14');
    sim.mayarInvoices['UUID-RECOVER-14'] = {
      id: 'UUID-RECOVER-14',
      status: 'paid',
      amount: 99000,
      transactionId: 'TXN-RECOVER-14',
      transactions: [{ id: 'TXN-RECOVER-14' }],
    };

    const pendingRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'TXN-RECOVER-14',
          transactionId: 'TXN-RECOVER-14',
          mayarInvoiceId: 'UUID-RECOVER-14',
          orderId: 'INV-RECOVER-14',
          status: 'paid',
          amount: 99000,
          licenseCode: code,
        },
      },
    });
    expect(pendingRes.statusCode).toBe(503);
    expect(pendingRes.body.idempotencyStatus).toBe('pending_reconciliation');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);

    sim.transientDetail503Ids.delete('UUID-RECOVER-14');
    const cronRes = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: '/api/cron/mayar-reconcile',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cronRes.statusCode).toBe(200);
    expect(cronRes.body.committedCount).toBe(1);
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(true);
  });

  it('15. Gangguan Redis menyebabkan webhook & cron endpoint fail-closed HTTP 503 tanpa fallback lokal', async () => {
    sim.outageMode = true;
    const whRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'TXN-OUTAGE-15',
          mayarInvoiceId: 'UUID-OUTAGE-15',
          orderId: 'INV-OUTAGE-15',
          status: 'paid',
          amount: 99000,
        },
      },
    });
    expect(whRes.statusCode).toBe(503);
    expect(whRes.body.reason).toBe('REDIS_UNAVAILABLE');
    expect(localSeatMemoryStore.size).toBe(0);

    const cronRes = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: '/api/cron/mayar-reconcile',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cronRes.statusCode).toBe(503);
    expect(cronRes.body.reason).toBe('REDIS_UNAVAILABLE');
  });

  it('16. Eksekusi webhook bersamaan lintas 2 worker_threads hanya mengaktifkan lisensi tepat 1 kali', async () => {
    const code = makeSerial('GM26', 'V2WRK16');
    sim.mayarInvoices['UUID-WORKER-16'] = {
      id: 'UUID-WORKER-16',
      status: 'paid',
      amount: 99000,
      transactionId: 'TXN-WORKER-16',
      transactions: [{ id: 'TXN-WORKER-16' }],
    };
    const payload = {
      event: 'payment.received',
      data: {
        id: 'TXN-WORKER-16',
        transactionId: 'TXN-WORKER-16',
        mayarInvoiceId: 'UUID-WORKER-16',
        orderId: 'INV-WORKER-16',
        status: 'paid',
        amount: 99000,
        licenseCode: code,
      },
    };
    const results = await runConcurrentWebhookWorkers(sim, [
      { url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`, body: payload },
      { url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`, body: payload },
    ]);
    expect(results.every((r) => r.statusCode === 200), JSON.stringify(results)).toBe(true);
    expect(results.filter((r) => r.body.activated === true)).toHaveLength(1);
    expect(results.filter((r) => r.body.idempotentReplay === true)).toHaveLength(1);
  });

  it('17. Cron GET /api/cron/mayar-reconcile tanpa Bearer CRON_SECRET atau secret salah ditolak HTTP 401 & fail-closed jika secret kosong', async () => {
    const noAuth = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: '/api/cron/mayar-reconcile',
    });
    expect(noAuth.statusCode).toBe(401);

    const wrongAuth = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: '/api/cron/mayar-reconcile',
      headers: { authorization: 'Bearer WRONG_CRON_SECRET_TOKEN' },
    });
    expect(wrongAuth.statusCode).toBe(401);

    delete process.env.CRON_SECRET;
    const unconfigured = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: '/api/cron/mayar-reconcile',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(unconfigured.statusCode).toBe(503);
    expect(unconfigured.body.reason).toBe('CRON_SECRET_NOT_CONFIGURED');
  });

  it('18. Cron GET dengan Bearer CRON_SECRET valid menjalankan rekonsiliasi bounded, eksekusi bersamaan aman oleh lock, & ?action=reconcile di webhook publik ditolak', async () => {
    const blockedPublic = await invokeHandler(mayarWebhookHandler, {
      method: 'POST',
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}&action=reconcile`,
      body: { action: 'reconcile_pending' },
    });
    expect(blockedPublic.statusCode).toBe(403);
    expect(blockedPublic.body.reason).toBe('RECONCILE_MOVED_TO_CRON');

    const code = makeSerial('GM26', 'V2CRN18');
    sim.mayarInvoices['UUID-CRON-18'] = {
      id: 'UUID-CRON-18',
      status: 'unpaid',
      amount: 99000,
    };
    await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'TXN-CRON-18',
          transactionId: 'TXN-CRON-18',
          mayarInvoiceId: 'UUID-CRON-18',
          orderId: 'INV-CRON-18',
          status: 'paid',
          amount: 99000,
          licenseCode: code,
        },
      },
    });

    sim.mayarInvoices['UUID-CRON-18'] = {
      id: 'UUID-CRON-18',
      status: 'paid',
      amount: 99000,
      transactionId: 'TXN-CRON-18',
      transactions: [{ id: 'TXN-CRON-18' }],
    };

    const [cronA, cronB] = await Promise.all([
      invokeHandler(cronReconcileHandler, {
        method: 'GET',
        url: '/api/cron/mayar-reconcile?limit=99',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      }),
      invokeHandler(cronReconcileHandler, {
        method: 'GET',
        url: '/api/cron/mayar-reconcile?limit=99',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      }),
    ]);

    expect(cronA.statusCode).toBe(200);
    expect(cronB.statusCode).toBe(200);
    expect(cronA.body.limitApplied).toBe(25);
    const totalCommitted = Number(cronA.body.committedCount || 0) + Number(cronB.body.committedCount || 0);
    expect(totalCommitted).toBe(1);
    const regList = JSON.parse(sim.kv.get('asesmerdeka:admin:license_registry:v1') || '[]');
    expect(regList.filter((entry: Record<string, unknown>) => entry.code === code)).toHaveLength(1);
  });

  it('19. Cron menolak secret melalui query string & menolak pemakaian MAYAR_WEBHOOK_SECRET', async () => {
    const querySecretRes = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: `/api/cron/mayar-reconcile?secret=${CRON_SECRET}`,
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(querySecretRes.statusCode).toBe(401);
    expect(querySecretRes.body.reason).toBe('QUERY_SECRET_FORBIDDEN');

    const queryTokenRes = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: `/api/cron/mayar-reconcile?token=${CRON_SECRET}`,
    });
    expect(queryTokenRes.statusCode).toBe(401);

    const webhookSecretAsCron = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: '/api/cron/mayar-reconcile',
      headers: { authorization: `Bearer ${WEBHOOK_SECRET}` },
    });
    expect(webhookSecretAsCron.statusCode).toBe(401);
    expect(webhookSecretAsCron.body.reason).toBe('UNAUTHORIZED_CRON');
  });

  it('20. Data akademik di localStorage tetap 100% utuh sepanjang seluruh alur API V2, reminder, & cron reconciliation', async () => {
    const kelasSnap = JSON.stringify([{ id: 'KLS-7A', nama: 'Kelas 7A', siswa: ['Aldi', 'Bella'] }]);
    const nilaiSnap = JSON.stringify({ 'KLS-7A': { Aldi: 95, Bella: 89 } });
    const jurnalSnap = JSON.stringify([{ tanggal: '2026-11-14', catatan: 'Hadir semua' }]);
    const eraporSnap = JSON.stringify([{ id: 'RPR-1', status: 'final' }]);
    localStorage.setItem('asesmerdeka_kelas_data_v1', kelasSnap);
    localStorage.setItem('asesmerdeka_nilai_v1', nilaiSnap);
    localStorage.setItem('asesmerdeka_jurnal_v1', jurnalSnap);
    localStorage.setItem('asesmerdeka_erapor_v1', eraporSnap);

    const code = makeSerial('GM26', 'V2ACA20');
    await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.reminder',
        data: {
          id: 'TXN-ACA-20',
          transactionId: 'TXN-ACA-20',
          mayarInvoiceId: 'UUID-ACA-20',
          orderId: 'INV-ACA-20',
          status: 'unpaid',
          licenseCode: code,
        },
      },
    });
    sim.mayarInvoices['UUID-ACA-20'] = {
      id: 'UUID-ACA-20',
      status: 'unpaid',
      amount: 99000,
    };
    await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'TXN-ACA-20',
          transactionId: 'TXN-ACA-20',
          mayarInvoiceId: 'UUID-ACA-20',
          orderId: 'INV-ACA-20',
          status: 'paid',
          amount: 99000,
          licenseCode: code,
        },
      },
    });
    sim.mayarInvoices['UUID-ACA-20'] = {
      id: 'UUID-ACA-20',
      status: 'paid',
      amount: 99000,
      transactionId: 'TXN-ACA-20',
      transactions: [{ id: 'TXN-ACA-20' }],
    };
    await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: '/api/cron/mayar-reconcile',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });

    expect(localStorage.getItem('asesmerdeka_kelas_data_v1')).toBe(kelasSnap);
    expect(localStorage.getItem('asesmerdeka_nilai_v1')).toBe(nilaiSnap);
    expect(localStorage.getItem('asesmerdeka_jurnal_v1')).toBe(jurnalSnap);
    expect(localStorage.getItem('asesmerdeka_erapor_v1')).toBe(eraporSnap);
    expect(getUserQuota().tier).toBe('free');
  });
});
