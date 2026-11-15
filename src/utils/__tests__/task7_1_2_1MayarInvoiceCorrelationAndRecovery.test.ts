import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

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

// @ts-expect-error JS Vercel handler module without .d.ts
import activateLicenseHandler, {
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
// @ts-expect-error JS Vercel handler module without .d.ts
import mayarWebhookHandler, {
  reconcilePendingWebhooks,
} from '../../../api/mayar-webhook.js';
import {
  clearPaymentGatewayClientCaches,
} from '../paymentGateway';
import { computeSerialLicenseCode, getUserQuota } from '../licenseManager';

const LICENSE_SIGNING_SECRET = 'ASESMERDEKA-2026-LICENSE-VERIFICATION-KEY-V2';
const WEBHOOK_SECRET = 'MAYAR_TASK7121_WEBHOOK_SECRET_0123456789';
const REDIS_URL = 'https://redis-atomic.asesmerdeka.test';
const REDIS_TOKEN = 'redis-token-task7121-secret';
const MAYAR_API_BASE_URL = 'https://api.mayar.test';
const MAYAR_API_KEY = 'mayar-secret-api-key-7121-sensitive';
const INDIVIDU_PRODUCT_ID = 'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';

function makeSerial(prefix: 'GM26' | 'SK26', tag: string): string {
  const cleanSeed = tag.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (prefix === 'SK26') return computeSerialLicenseCode(`SEKOLAH${cleanSeed.slice(0, 5)}`);
  return computeSerialLicenseCode(`INDIV${cleanSeed.slice(0, 7)}`);
}

function makeMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: any = null;
  const res = {
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = v;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
    end() {
      return res;
    },
    getStatus: () => statusCode,
    getBody: () => body,
  };
  return res;
}

async function invokeHandler(
  handler: (req: any, res: any) => Promise<any>,
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  }
) {
  const req = {
    method: options.method || 'POST',
    url: options.url || '/api/mayar-webhook',
    headers: options.headers || {},
    body: options.body ?? {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  const res = makeMockRes();
  await handler(req, res);
  return { statusCode: res.getStatus(), body: res.getBody() };
}

interface MayarMockEndpointBehavior {
  invoices: Record<string, any>;
  createdCounter: number;
  lastCreatePayloads: Array<Record<string, any>>;
  detailRequestIds: string[];
  simulateTimeoutIds: Set<string>;
  simulate500Ids: Set<string>;
}

class Task7121RedisAndMayarSimulator {
  kv = new Map<string, string>();
  lockExpiry = new Map<string, { owner: string; fence: number; expiresAt: number }>();
  outageMode = false;
  mayar: MayarMockEndpointBehavior = {
    invoices: {},
    createdCounter: 0,
    lastCreatePayloads: [],
    detailRequestIds: [],
    simulateTimeoutIds: new Set<string>(),
    simulate500Ids: new Set<string>(),
  };

  private cleanExpired(key: string) {
    const now = Date.now();
    const meta = this.lockExpiry.get(key);
    if (meta && meta.expiresAt <= now) {
      this.lockExpiry.delete(key);
      this.kv.delete(key);
    }
  }

  executeLua(script: string, keys: string[], args: string[]): unknown {
    const now = Date.now();

    if (script.includes('ASESMERDEKA_ACQUIRE_MULTI_LOCK_V1')) {
      const numLocks = Number(args[0] || 0);
      const owner = String(args[1] || '');
      const ttlMs = Number(args[2] || 5000);
      const lockKeys = keys.slice(0, numLocks);
      const fenceKey = keys[numLocks];

      for (const k of lockKeys) {
        this.cleanExpired(k);
        if (this.kv.has(k)) {
          const meta = this.lockExpiry.get(k);
          if (!meta || meta.owner !== owner) {
            return ['BUSY', k];
          }
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
        if (!this.kv.has(lockKey) || !meta || meta.owner !== owner) {
          return ['LOCK_LOST', lockKey];
        }
        if (meta.fence !== expectedFence) {
          return ['STALE_FENCE', String(meta.fence)];
        }
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
      const seatPatchJson = String(args[10] || '');
      const adminPatchJson = String(args[11] || '');

      if (lockKey) {
        this.cleanExpired(lockKey);
        const meta = this.lockExpiry.get(lockKey);
        if (!this.kv.has(lockKey) || !meta || meta.owner !== owner) {
          return ['LOCK_LOST', lockKey];
        }
        if (meta.fence !== expectedFence) {
          return ['STALE_FENCE', String(meta.fence)];
        }
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
      if (hasEvent && eventKey) {
        this.kv.set(eventKey, eventJson);
      }
      if (hasOrder && orderKey) {
        this.kv.set(orderKey, orderJson);
      }

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

    throw new Error(`Unsupported Lua script in simulator`);
  }

  async handleFetch(
    urlStr: string,
    method: string,
    headers: Record<string, string>,
    bodyStr?: string,
    signal?: AbortSignal | null
  ): Promise<{ ok: boolean; status: number; jsonData: any }> {
    if (urlStr.startsWith(REDIS_URL)) {
      if (this.outageMode) {
        throw new Error('ECONNREFUSED: Redis connection refused');
      }
      if (headers.authorization !== `Bearer ${REDIS_TOKEN}`) {
        return { ok: false, status: 401, jsonData: { error: 'Unauthorized Redis REST' } };
      }

      const parsed = new URL(urlStr);
      const pathname = parsed.pathname;

      if (pathname === '/' && method === 'POST') {
        const cmd = JSON.parse(bodyStr || '[]') as string[];
        const op = String(cmd[0] || '').toUpperCase();
        if (op === 'EVAL') {
          const script = String(cmd[1] || '');
          const numKeys = Number(cmd[2] || 0);
          const keys = cmd.slice(3, 3 + numKeys).map(String);
          const args = cmd.slice(3 + numKeys).map(String);
          const result = this.executeLua(script, keys, args);
          return { ok: true, status: 200, jsonData: { result } };
        }
      }

      if (pathname.startsWith('/get/')) {
        const key = decodeURIComponent(pathname.slice('/get/'.length));
        return {
          ok: true,
          status: 200,
          jsonData: { result: this.kv.has(key) ? this.kv.get(key)! : null },
        };
      }

      if (pathname.startsWith('/set/')) {
        const key = decodeURIComponent(pathname.slice('/set/'.length));
        let val = bodyStr ?? '';
        try {
          val = JSON.parse(bodyStr || '""');
        } catch {
          // keep string
        }
        this.kv.set(key, typeof val === 'string' ? val : JSON.stringify(val));
        return { ok: true, status: 200, jsonData: { result: 'OK' } };
      }

      if (pathname.startsWith('/sismember/')) {
        const rest = pathname.slice('/sismember/'.length).split('/');
        const setKey = decodeURIComponent(rest[0] || '');
        const member = decodeURIComponent(rest[1] || '');
        const members: string[] = JSON.parse(this.kv.get(setKey) || '[]');
        return { ok: true, status: 200, jsonData: { result: members.includes(member) ? 1 : 0 } };
      }

      return { ok: true, status: 200, jsonData: { result: 'OK' } };
    }

    if (urlStr.startsWith(`${MAYAR_API_BASE_URL}/hl/v2/invoices/create`)) {
      if (headers.authorization !== `Bearer ${MAYAR_API_KEY}`) {
        return { ok: false, status: 401, jsonData: { statusCode: 401, message: 'Unauthorized' } };
      }
      const reqPayload = JSON.parse(bodyStr || '{}');
      this.mayar.lastCreatePayloads.push(reqPayload);
      this.mayar.createdCounter += 1;
      const newInvUuid = `MAYAR-UUID-CREATED-${String(this.mayar.createdCounter).padStart(3, '0')}`;
      const newTxUuid = `MAYAR-INIT-TX-${String(this.mayar.createdCounter).padStart(3, '0')}`;
      const paymentUrl = `https://checkout.mayar.test/invoices/${newInvUuid}`;
      this.mayar.invoices[newInvUuid] = {
        id: newInvUuid,
        status: 'unpaid',
        amount: reqPayload.items?.[0]?.rate || reqPayload.amount || 99000,
        link: paymentUrl,
        productId: INDIVIDU_PRODUCT_ID,
        customerEmail: reqPayload.email || '',
        customerName: reqPayload.name || '',
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
            link: paymentUrl,
            expiredAt: reqPayload.expiredAt || Date.now() + 86400000,
            extraData: reqPayload.extraData || {},
          },
        },
      };
    }

    if (urlStr.startsWith(`${MAYAR_API_BASE_URL}/hl/v2/invoices/`)) {
      if (headers.authorization !== `Bearer ${MAYAR_API_KEY}`) {
        return { ok: false, status: 401, jsonData: { statusCode: 401, messages: 'Unauthorized' } };
      }
      const invoiceLookupId = decodeURIComponent(urlStr.split('/hl/v2/invoices/')[1] || '');
      this.mayar.detailRequestIds.push(invoiceLookupId);

      if (this.mayar.simulateTimeoutIds.has(invoiceLookupId)) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 400);
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              const abortErr = new Error('The operation was aborted due to timeout');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          }
        });
      }

      if (this.mayar.simulate500Ids.has(invoiceLookupId)) {
        return { ok: false, status: 503, jsonData: { statusCode: 503, messages: 'Mayar upstream error' } };
      }

      const mockRecord = this.mayar.invoices[invoiceLookupId];
      if (!mockRecord) {
        return { ok: false, status: 404, jsonData: { statusCode: 404, messages: 'Invoice not found' } };
      }
      return {
        ok: true,
        status: 200,
        jsonData: {
          statusCode: 200,
          messages: 'success',
          data: {
            ...mockRecord,
            transactions: mockRecord.transactionId ? [{ id: mockRecord.transactionId }] : [],
          },
        },
      };
    }

    return { ok: false, status: 404, jsonData: { error: `Unhandled URL: ${urlStr}` } };
  }
}

async function runConcurrentWebhookWorkers(
  sim: Task7121RedisAndMayarSimulator,
  specs: Array<{
    url?: string;
    body: any;
  }>
): Promise<Array<{ workerId: string; statusCode: number; body: any }>> {
  const webhookUrl = pathToFileURL(path.resolve(process.cwd(), 'api/mayar-webhook.js')).href;

  const workerBootstrap = `
    const { parentPort, workerData } = require('node:worker_threads');
    (async () => {
      try {
        for (const [k, v] of Object.entries(workerData.env || {})) {
          process.env[k] = String(v);
        }
        let reqSeq = 0;
        const pending = new Map();
        parentPort.on('message', (msg) => {
          if (msg && msg.type === 'FETCH_RES' && pending.has(msg.reqId)) {
            const { resolve, reject } = pending.get(msg.reqId);
            pending.delete(msg.reqId);
            if (msg.error) {
              const err = new Error(msg.error);
              err.name = msg.errorName || 'Error';
              reject(err);
              return;
            }
            resolve(msg);
          }
        });
        globalThis.fetch = (input, init) => {
          return new Promise((resolve, reject) => {
            const reqId = ++reqSeq;
            const rawHeaders = {};
            if (init && init.headers) {
              for (const [hk, hv] of Object.entries(init.headers)) {
                rawHeaders[String(hk).toLowerCase()] = String(hv);
              }
            }
            pending.set(reqId, {
              resolve: (reply) => {
                resolve({
                  ok: Boolean(reply.ok),
                  status: Number(reply.status || 200),
                  json: async () => reply.jsonData,
                  text: async () => JSON.stringify(reply.jsonData),
                });
              },
              reject,
            });
            parentPort.postMessage({
              type: 'FETCH',
              reqId,
              url: String(input),
              method: (init && init.method) ? String(init.method) : 'GET',
              headers: rawHeaders,
              body: init && init.body !== undefined ? String(init.body) : undefined,
            });
          });
        };

        const mod = await import(workerData.webhookUrl);
        const handler = mod.default;
        let statusCode = 200;
        let responseBody = null;
        const req = {
          method: 'POST',
          url: workerData.req.url || '/api/mayar-webhook',
          headers: {},
          body: workerData.req.body || {},
          socket: { remoteAddress: '127.0.0.1' },
        };
        const res = {
          setHeader() {},
          status(c) { statusCode = c; return res; },
          json(p) { responseBody = p; return res; },
          end() { return res; },
        };
        await handler(req, res);
        parentPort.postMessage({
          type: 'DONE',
          workerId: workerData.workerId,
          statusCode,
          body: responseBody,
        });
      } catch (err) {
        parentPort.postMessage({
          type: 'ERR',
          workerId: workerData.workerId,
          message: err && err.message ? err.message : String(err),
        });
      }
    })();
  `;

  return await Promise.all(
    specs.map(
      (spec, idx) =>
        new Promise<{ workerId: string; statusCode: number; body: any }>((resolve, reject) => {
          const worker = new Worker(workerBootstrap, {
            eval: true,
            workerData: {
              workerId: `W${idx + 1}`,
              webhookUrl,
              req: spec,
              env: {
                NODE_ENV: 'production',
                LICENSE_SIGNING_SECRET,
                MAYAR_WEBHOOK_SECRET: WEBHOOK_SECRET,
                UPSTASH_REDIS_REST_URL: REDIS_URL,
                UPSTASH_REDIS_REST_TOKEN: REDIS_TOKEN,
                MAYAR_API_BASE_URL,
                MAYAR_API_KEY,
                MAYAR_PRODUCT_ID: INDIVIDU_PRODUCT_ID,
              },
            },
          });

          worker.on('message', async (msg: any) => {
            if (msg?.type === 'FETCH') {
              try {
                const reply = await sim.handleFetch(msg.url, msg.method, msg.headers || {}, msg.body);
                worker.postMessage({ type: 'FETCH_RES', reqId: msg.reqId, ...reply });
              } catch (err: any) {
                worker.postMessage({
                  type: 'FETCH_RES',
                  reqId: msg.reqId,
                  error: err?.message || 'Fetch error',
                  errorName: err?.name || 'Error',
                });
              }
            } else if (msg?.type === 'DONE') {
              await worker.terminate().catch(() => {});
              resolve({ workerId: msg.workerId, statusCode: msg.statusCode, body: msg.body });
            } else if (msg?.type === 'ERR') {
              await worker.terminate().catch(() => {});
              reject(new Error(`Worker ${msg.workerId} failed: ${msg.message}`));
            }
          });
          worker.on('error', reject);
        })
    )
  );
}

describe('Task 7.1.2.1 — Mayar Invoice Correlation & Webhook Recovery Closure', () => {
  let sim: Task7121RedisAndMayarSimulator;
  const originalFetch = globalThis.fetch;
  const envBackup = { ...process.env };

  beforeEach(() => {
    sim = new Task7121RedisAndMayarSimulator();
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
    process.env.LICENSE_SIGNING_SECRET = LICENSE_SIGNING_SECRET;
    process.env.MAYAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REDIS_TOKEN;
    process.env.MAYAR_API_BASE_URL = MAYAR_API_BASE_URL;
    process.env.MAYAR_API_KEY = MAYAR_API_KEY;
    process.env.MAYAR_API_TIMEOUT_MS = '80';
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
        init?.body !== undefined ? String(init.body) : undefined,
        init?.signal ?? null
      );
      return {
        ok: reply.ok,
        status: reply.status,
        json: async () => reply.jsonData,
        text: async () => JSON.stringify(reply.jsonData),
      } as Response;
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...envBackup };
  });

  it('1. Webhook data.id tanpa transactionId tidak pernah dipakai sebagai invoice ID atau transaction ID', async () => {
    const code = makeSerial('GM26', 'CASE01');
    const webhookRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-ONLY-NOT-INVOICE-001',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(webhookRes.statusCode).toBe(202);
    expect(webhookRes.body.activated).toBe(false);
    expect(webhookRes.body.reason).toBe('MISSING_TRANSACTION_IDENTIFIER');
    expect(webhookRes.body.correlationReason).toBe('MISSING_MAYAR_INVOICE_ID');
    expect(webhookRes.body.idempotencyStatus).toBe('pending_reconciliation');
    expect(sim.mayar.detailRequestIds).not.toContain('WH-ONLY-NOT-INVOICE-001');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
    expect(sim.kv.has('asesmerdeka:mayar:tx:v1:WH-ONLY-NOT-INVOICE-001')).toBe(false);
  });

  it('2. Webhook webhookEventId berbeda dari mayarInvoiceId: detail API memakai mayarInvoiceId & event memakai webhookEventId', async () => {
    const code = makeSerial('GM26', 'CASE02');
    const trueMayarUuid = '9F3B2E10-7A11-4B22-8C33-112233445566';
    sim.mayar.invoices[trueMayarUuid] = {
      id: trueMayarUuid,
      status: 'paid',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
      transactionId: 'TXN-VERIFIED-CASE-02',
    };

    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-EVENT-DIFF-02',
          mayarInvoiceId: trueMayarUuid,
          orderId: 'INV-CASE-02',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.activated).toBe(true);
    expect(res.body.webhookEventId).toBe('V2:PAYMENT.RECEIVED:WH-EVENT-DIFF-02');
    expect(res.body.mayarInvoiceId).toBe(trueMayarUuid);
    expect(res.body.transactionId).toBe('TXN-VERIFIED-CASE-02');
    expect(sim.mayar.detailRequestIds).toEqual([trueMayarUuid]);
    expect(sim.kv.has('asesmerdeka:mayar:event:v1:V2:PAYMENT.RECEIVED:WH-EVENT-DIFF-02')).toBe(true);
    expect(sim.kv.has(`asesmerdeka:mayar:tx:v1:TXN-VERIFIED-CASE-02`)).toBe(true);
  });

  it('3. Invoice Mayar dibuat & disimpan di order registry + reverse index, lalu dikorelasikan akurat oleh webhook', async () => {
    const orderRes = await invokeHandler(activateLicenseHandler, {
      url: '/api/activate-license',
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-CREATE-API-03',
        deviceId: 'DEV-CREATE-03',
        buyerName: 'Ibu Sari',
        buyerEmail: 'sari@sdn1.sch.id',
        buyerMobile: '081234567890',
        createMayarInvoice: true,
      },
    });

    expect(orderRes.statusCode).toBe(200);
    expect(orderRes.body.mayarInvoiceId).toBe('MAYAR-UUID-CREATED-001');
    expect(orderRes.body.mayarApiVersion).toBe('hl/v2');
    expect(sim.mayar.lastCreatePayloads).toHaveLength(1);
    expect(sim.mayar.lastCreatePayloads[0].items?.[0]?.rate).toBe(99000);
    expect(sim.mayar.lastCreatePayloads[0].extraData?.orderId).toBe('INV-CREATE-API-03');
    expect(sim.kv.get('asesmerdeka:mayar:inv_idx:v1:MAYAR-UUID-CREATED-001')).toBeTruthy();

    // Update mock Mayar menjadi paid dengan transactionId resmi (webhook tidak membawa orderId, hanya mayarInvoiceId & data.id)
    sim.mayar.invoices['MAYAR-UUID-CREATED-001'].status = 'paid';
    sim.mayar.invoices['MAYAR-UUID-CREATED-001'].transactionId = 'TXN-CREATED-API-03';

    const webhookRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-CREATED-ORDER-03',
          paymentLinkId: 'MAYAR-UUID-CREATED-001',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
        },
      },
    });

    expect(webhookRes.statusCode).toBe(200);
    expect(webhookRes.body.activated).toBe(true);
    expect(webhookRes.body.orderId).toBe('INV-CREATE-API-03');
    expect(webhookRes.body.mayarInvoiceId).toBe('MAYAR-UUID-CREATED-001');
    expect(webhookRes.body.transactionId).toBe('TXN-CREATED-API-03');
    expect(sim.mayar.detailRequestIds).toEqual(['MAYAR-UUID-CREATED-001']);
  });

  it('4. Dua pesanan berbeda dengan nominal & email pembeli sama tetap terpisah secara ketat', async () => {
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-SAME-PERSON-A',
        mayarInvoiceId: 'UUID-SAME-PERSON-A',
        deviceId: 'DEV-SAME-A',
        buyerEmail: 'kembar@guru.id',
        buyerName: 'Guru A',
      },
    });
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-SAME-PERSON-B',
        mayarInvoiceId: 'UUID-SAME-PERSON-B',
        deviceId: 'DEV-SAME-B',
        buyerEmail: 'kembar@guru.id',
        buyerName: 'Guru A',
      },
    });

    sim.mayar.invoices['UUID-SAME-PERSON-A'] = {
      id: 'UUID-SAME-PERSON-A',
      status: 'paid',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
      transactionId: 'TXN-SAME-A',
    };
    sim.mayar.invoices['UUID-SAME-PERSON-B'] = {
      id: 'UUID-SAME-PERSON-B',
      status: 'unpaid',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
    };

    // Hanya Order A yang dibayar
    const resA = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-SAME-A',
          orderId: 'INV-SAME-PERSON-A',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          customerEmail: 'kembar@guru.id',
        },
      },
    });
    expect(resA.statusCode).toBe(200);
    expect(resA.body.activated).toBe(true);
    expect(resA.body.orderId).toBe('INV-SAME-PERSON-A');

    // Order B belum lunas tidak boleh tertukar dengan Order A meskipun email & amount sama
    const orderBStored = JSON.parse(sim.kv.get('asesmerdeka:mayar:order:v1:INV-SAME-PERSON-B')!);
    expect(orderBStored.status).toBe('pending_payment');
    expect(orderBStored.licenseCode).toBeUndefined();
  });

  it('5. Mayar API status unpaid: transaksi tidak diaktifkan, tanpa seat, status pending_reconciliation sampai API paid', async () => {
    const code = makeSerial('GM26', 'CASE05');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-UNPAID-05',
        mayarInvoiceId: 'UUID-UNPAID-05',
        deviceId: 'DEV-UNPAID-05',
      },
    });
    sim.mayar.invoices['UUID-UNPAID-05'] = {
      id: 'UUID-UNPAID-05',
      status: 'unpaid',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
    };

    const resUnpaid = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-UNPAID-05',
          orderId: 'INV-UNPAID-05',
          transactionId: 'TXN-CLAIMED-BY-WEBHOOK-05',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(resUnpaid.statusCode).toBe(202);
    expect(resUnpaid.body.activated).toBe(false);
    expect(resUnpaid.body.idempotencyStatus).toBe('pending_reconciliation');
    expect(resUnpaid.body.reason).toBe('MAYAR_API_PAYMENT_NOT_SETTLED');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
    expect(sim.kv.has('asesmerdeka:admin:license_registry:v1')).toBe(false);

    // Antrean rekonsiliasi tersimpan di Redis
    const queue = JSON.parse(sim.kv.get('asesmerdeka:mayar:reconcile_queue:v1') || '[]');
    expect(queue.length).toBe(1);
    expect(queue[0].orderId).toBe('INV-UNPAID-05');

    // Sekarang invoice dibayar di Mayar API
    sim.mayar.invoices['UUID-UNPAID-05'].status = 'paid';
    sim.mayar.invoices['UUID-UNPAID-05'].transactionId = 'TXN-SETTLED-05';

    const rec = await reconcilePendingWebhooks({ orderId: 'INV-UNPAID-05' });
    expect(rec.committedCount).toBe(1);
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(true);
    expect(JSON.parse(sim.kv.get('asesmerdeka:mayar:reconcile_queue:v1') || '[]')).toHaveLength(0);
  });

  it('6. Mayar API nominal lebih kecil dari harga paket resmi: ditolak permanen tanpa seat dibuat', async () => {
    const code = makeSerial('GM26', 'CASE06');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-UNDERPAY-06',
        mayarInvoiceId: 'UUID-UNDERPAY-06',
        deviceId: 'DEV-UNDERPAY-06',
      },
    });
    sim.mayar.invoices['UUID-UNDERPAY-06'] = {
      id: 'UUID-UNDERPAY-06',
      status: 'paid',
      amount: 49000, // kurang dari 99000
      productId: INDIVIDU_PRODUCT_ID,
      transactionId: 'TXN-UNDERPAY-06',
    };

    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-UNDERPAY-06',
          orderId: 'INV-UNDERPAY-06',
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
    expect(sim.kv.has('asesmerdeka:admin:license_registry:v1')).toBe(false);
    const evt = JSON.parse(sim.kv.get('asesmerdeka:mayar:event:v1:V2:PAYMENT.RECEIVED:WH-UNDERPAY-06')!);
    expect(evt.idempotencyStatus).toBe('terminal_rejected');
  });

  it('7. Mayar API timeout: tidak aktivasi prematur, masuk pending_reconciliation & pulih saat API sehat', async () => {
    const code = makeSerial('GM26', 'CASE07');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-TIMEOUT-07',
        mayarInvoiceId: 'UUID-TIMEOUT-07',
        deviceId: 'DEV-TIMEOUT-07',
      },
    });
    sim.mayar.invoices['UUID-TIMEOUT-07'] = {
      id: 'UUID-TIMEOUT-07',
      status: 'paid',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
      transactionId: 'TXN-AFTER-TIMEOUT-07',
    };
    sim.mayar.simulateTimeoutIds.add('UUID-TIMEOUT-07');

    const resTimeout = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-TIMEOUT-07',
          orderId: 'INV-TIMEOUT-07',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(resTimeout.statusCode).toBe(503);
    expect(resTimeout.body.activated).toBe(false);
    expect(resTimeout.body.reason).toBe('MAYAR_API_TIMEOUT');
    expect(resTimeout.body.idempotencyStatus).toBe('pending_reconciliation');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);

    // Pulihkan API timeout, kirim ulang webhook yang sama
    sim.mayar.simulateTimeoutIds.delete('UUID-TIMEOUT-07');
    const resRecovered = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-TIMEOUT-07',
          orderId: 'INV-TIMEOUT-07',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(resRecovered.statusCode).toBe(200);
    expect(resRecovered.body.activated).toBe(true);
    expect(resRecovered.body.transactionId).toBe('TXN-AFTER-TIMEOUT-07');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(true);
  });

  it('8. MAYAR_API_KEY tidak tersedia -> pending aman, lalu rekonsiliasi menyelesaikan aktivasi setelah key tersedia tanpa aktivasi ganda', async () => {
    delete process.env.MAYAR_API_KEY;
    const code = makeSerial('GM26', 'CASE08');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-NOKEY-08',
        mayarInvoiceId: 'UUID-NOKEY-08',
        deviceId: 'DEV-NOKEY-08',
      },
    });
    sim.mayar.invoices['UUID-NOKEY-08'] = {
      id: 'UUID-NOKEY-08',
      status: 'paid',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
      transactionId: 'TXN-NOKEY-RECOVER-08',
    };

    const pendingRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-NOKEY-08',
          orderId: 'INV-NOKEY-08',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(pendingRes.statusCode).toBe(202);
    expect(pendingRes.body.activated).toBe(false);
    expect(pendingRes.body.correlationReason).toBe('MAYAR_API_KEY_NOT_CONFIGURED');
    expect(pendingRes.body.idempotencyStatus).toBe('pending_reconciliation');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);

    // Konfigurasi MAYAR_API_KEY kembali dan jalankan rekonsiliasi 2 kali
    process.env.MAYAR_API_KEY = MAYAR_API_KEY;
    const rec1 = await reconcilePendingWebhooks();
    expect(rec1.committedCount).toBe(1);
    const rec2 = await reconcilePendingWebhooks();
    expect(rec2.processed).toBe(0);

    const regList = JSON.parse(sim.kv.get('asesmerdeka:admin:license_registry:v1') || '[]');
    expect(regList.filter((r: any) => r.code === code)).toHaveLength(1);
  });

  it('9. Webhook pending_reconciliation yang dikirim ulang tidak pernah terjebak sebagai idempotentReplay mati', async () => {
    const code = makeSerial('GM26', 'CASE09');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-RETRY-09',
        mayarInvoiceId: 'UUID-RETRY-09',
        deviceId: 'DEV-RETRY-09',
      },
    });
    sim.mayar.invoices['UUID-RETRY-09'] = {
      id: 'UUID-RETRY-09',
      status: 'unpaid',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
    };

    const firstTry = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-RETRY-SAME-ID-09',
          orderId: 'INV-RETRY-09',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });
    expect(firstTry.statusCode).toBe(202);
    expect(firstTry.body.idempotencyStatus).toBe('pending_reconciliation');

    // Simulasi Mayar akhirnya settled
    sim.mayar.invoices['UUID-RETRY-09'].status = 'paid';
    sim.mayar.invoices['UUID-RETRY-09'].transactionId = 'TXN-RETRY-COMMITTED-09';

    // Kirim ulang event webhook PERSIS SAMA (idempotency key yang sama)
    const secondTry = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-RETRY-SAME-ID-09',
          orderId: 'INV-RETRY-09',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(secondTry.statusCode).toBe(200);
    expect(secondTry.body.idempotentReplay).toBeUndefined();
    expect(secondTry.body.activated).toBe(true);
    expect(secondTry.body.idempotencyStatus).toBe('committed');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(true);
  });

  it('10. Webhook duplikat pada transaksi committed (lintas 2 worker_threads paralel) aman tanpa aktivasi ganda', async () => {
    const code = makeSerial('GM26', 'CASE10');
    sim.mayar.invoices['UUID-DUP-10'] = {
      id: 'UUID-DUP-10',
      status: 'paid',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
      transactionId: 'TXN-DUP-PARALLEL-10',
    };

    const payload = {
      event: 'payment.received',
      data: {
        id: 'WH-DUP-PARALLEL-10',
        mayarInvoiceId: 'UUID-DUP-10',
        orderId: 'INV-DUP-10',
        transactionId: 'TXN-DUP-PARALLEL-10',
        status: 'paid',
        amount: 99000,
        productId: INDIVIDU_PRODUCT_ID,
        licenseCode: code,
      },
    };

    const workerResults = await runConcurrentWebhookWorkers(sim, [
      { url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`, body: payload },
      { url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`, body: payload },
    ]);

    expect(workerResults.every((w) => w.statusCode === 200)).toBe(true);
    const activatedCount = workerResults.filter((w) => w.body?.activated === true).length;
    const replayCount = workerResults.filter((w) => w.body?.idempotentReplay === true).length;
    expect(activatedCount).toBe(1);
    expect(replayCount).toBe(1);

    const regList = JSON.parse(sim.kv.get('asesmerdeka:admin:license_registry:v1') || '[]');
    expect(regList.filter((r: any) => r.code === code)).toHaveLength(1);
  });

  it('11. Gangguan Redis saat korelasi/antrean webhook fail-closed 503 tanpa fallback lokal', async () => {
    sim.outageMode = true;
    const code = makeSerial('GM26', 'CASE11');

    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-REDIS-DOWN-11',
          orderId: 'INV-REDIS-DOWN-11',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(res.statusCode).toBe(503);
    expect(res.body.reason).toBe('REDIS_UNAVAILABLE');
    expect(res.body.activated).toBe(false);
    expect(localSeatMemoryStore.size).toBe(0);
    expect(localWebhookTransactionStore.size).toBe(0);
    expect(localReconcileQueueStore).toHaveLength(0);
    expect(localWebhookEventStore.size).toBe(0);

    await expect(reconcilePendingWebhooks()).rejects.toMatchObject({
      name: 'RedisUnavailableError',
    });
  });

  it('12. Kegagalan/penolakan tidak membuat seat/lisensi aktif, menjaga audit log bersih tanpa secret, & menjaga data akademik localStorage', async () => {
    const academicSnapshot = JSON.stringify({
      students: [{ id: 's1', name: 'Budi Santoso' }],
      grades: [{ studentId: 's1', score: 92 }],
    });
    localStorage.setItem('asesmerdeka_students_v1', academicSnapshot);

    const code = makeSerial('GM26', 'CASE12');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-FAIL-TRACE-12',
        mayarInvoiceId: 'UUID-FAIL-TRACE-12',
        deviceId: 'DEV-FAIL-TRACE-12',
      },
    });
    sim.mayar.invoices['UUID-FAIL-TRACE-12'] = {
      id: 'UUID-FAIL-TRACE-12',
      status: 'expired',
      amount: 99000,
      productId: INDIVIDU_PRODUCT_ID,
    };

    const failRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-FAIL-TRACE-12',
          orderId: 'INV-FAIL-TRACE-12',
          status: 'paid',
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: code,
        },
      },
    });

    expect(failRes.statusCode).toBe(422);
    expect(failRes.body.activated).toBe(false);
    expect(failRes.body.idempotencyStatus).toBe('terminal_rejected');
    expect(sim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
    expect(sim.kv.has('asesmerdeka:admin:license_registry:v1')).toBe(false);
    expect(getUserQuota().tier).toBe('free');
    expect(localStorage.getItem('asesmerdeka_students_v1')).toBe(academicSnapshot);

    // Pastikan audit log tercatat di Redis dan bebas dari kebocoran secret API/webhook/Redis
    const auditRaw = sim.kv.get('asesmerdeka:mayar:webhook_audit:v1') || '[]';
    const auditEntries = JSON.parse(auditRaw);
    expect(auditEntries.length).toBeGreaterThanOrEqual(1);
    expect(auditEntries[0].webhookEventId).toBe('V2:PAYMENT.RECEIVED:WH-FAIL-TRACE-12');
    expect(auditEntries[0].idempotencyStatus).toBe('terminal_rejected');
    expect(auditRaw).not.toContain(MAYAR_API_KEY);
    expect(auditRaw).not.toContain(WEBHOOK_SECRET);
    expect(auditRaw).not.toContain(REDIS_TOKEN);
  });
});
