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
} from '../../../api/activate-license.js';
// @ts-expect-error JS Vercel handler module without .d.ts
import mayarWebhookHandler, {
  extractMayarWebhookIdentifiers,
  correlateMayarTransactionViaApi,
} from '../../../api/mayar-webhook.js';
import {
  createPaymentInvoiceSession,
  verifyPaymentOrderStatusOnline,
  clearPaymentGatewayClientCaches,
} from '../paymentGateway';
import { computeSerialLicenseCode, getUserQuota } from '../licenseManager';

const LICENSE_SIGNING_SECRET = 'ASESMERDEKA-2026-LICENSE-VERIFICATION-KEY-V2';
const WEBHOOK_SECRET = 'MAYAR_TASK712_WEBHOOK_SECRET_0123456789';
const REDIS_URL = 'https://redis-atomic.asesmerdeka.test';
const REDIS_TOKEN = 'redis-token-task712-secret';
const MAYAR_API_BASE_URL = 'https://api.mayar.test';
const MAYAR_API_KEY = 'mayar-secret-api-key-712';
const INDIVIDU_PRODUCT_ID = 'c1db962a-7cc5-46cc-969e-2c7c930f5bdc';
const SCHOOL_PRODUCT_ID = '17cece7f-e711-4fdc-af44-e6ceb4b4bff7';

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

class AtomicRedisSimulator {
  kv = new Map<string, string>();
  lockExpiry = new Map<string, { owner: string; fence: number; expiresAt: number }>();
  outageMode = false;
  delayedGetPattern: string | null = null;
  delayedGetMs = 0;
  delayedGetTriggeredCount = 0;
  evalLog: Array<{ tag: string; result: unknown }> = [];

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
            const res = ['BUSY', k];
            this.evalLog.push({ tag: 'ACQUIRE', result: res });
            return res;
          }
        }
      }

      const nextFence = Number(this.kv.get(fenceKey) || '0') + 1;
      this.kv.set(fenceKey, String(nextFence));
      for (const k of lockKeys) {
        this.kv.set(k, `${owner}:${nextFence}`);
        this.lockExpiry.set(k, { owner, fence: nextFence, expiresAt: now + ttlMs });
      }
      const res = ['ACQUIRED', String(nextFence)];
      this.evalLog.push({ tag: 'ACQUIRE', result: res });
      return res;
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
      this.evalLog.push({ tag: 'RELEASE', result: released });
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
        this.cleanExpired(lockKey);
        const meta = this.lockExpiry.get(lockKey);
        if (!this.kv.has(lockKey) || !meta || meta.owner !== owner) {
          const res = ['LOCK_LOST', lockKey];
          this.evalLog.push({ tag: 'SEAT_CAS', result: res });
          return res;
        }
        if (meta.fence !== expectedFence) {
          const res = ['STALE_FENCE', String(meta.fence)];
          this.evalLog.push({ tag: 'SEAT_CAS', result: res });
          return res;
        }
      }

      const curRaw = this.kv.get(seatKey);
      const curObj = curRaw ? JSON.parse(curRaw) : null;
      const curRev = curObj ? Number(curObj.seatRevision ?? 0) : 0;
      if (curRev !== expectedRev) {
        const res = ['CONFLICT', String(curRev)];
        this.evalLog.push({ tag: 'SEAT_CAS', result: res });
        return res;
      }

      const nextObj = JSON.parse(nextJson);
      if (maxSeatsLimit > 0 && Number(nextObj.usedSeats || 0) > maxSeatsLimit) {
        const res = ['QUOTA_EXCEEDED', String(nextObj.usedSeats || 0)];
        this.evalLog.push({ tag: 'SEAT_CAS', result: res });
        return res;
      }
      this.kv.set(seatKey, nextJson);
      const res = ['OK', String(nextObj.seatRevision ?? expectedRev + 1)];
      this.evalLog.push({ tag: 'SEAT_CAS', result: res });
      return res;
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
          const res = ['LOCK_LOST', lockKey];
          this.evalLog.push({ tag: 'FENCED_WRITE', result: res });
          return res;
        }
        if (meta.fence !== expectedFence) {
          const res = ['STALE_FENCE', String(meta.fence)];
          this.evalLog.push({ tag: 'FENCED_WRITE', result: res });
          return res;
        }
      }
      const curRaw = this.kv.get(recordKey);
      const curObj = curRaw ? JSON.parse(curRaw) : null;
      if (curObj && Number(curObj.fenceToken || 0) > expectedFence) {
        const res = ['STALE_FENCE', String(curObj.fenceToken)];
        this.evalLog.push({ tag: 'FENCED_WRITE', result: res });
        return res;
      }
      this.kv.set(recordKey, nextJson);
      const res = ['OK', String(expectedFence)];
      this.evalLog.push({ tag: 'FENCED_WRITE', result: res });
      return res;
    }

    if (script.includes('ASESMERDEKA_UPSERT_ADMIN_REGISTRY_V1')) {
      const registryKey = keys[0];
      const patch = JSON.parse(String(args[0] || '{}'));
      const curRaw = this.kv.get(registryKey);
      const list: Array<Record<string, unknown>> = curRaw ? JSON.parse(curRaw) : [];
      const idx = list.findIndex((item) => item.licenseCode === patch.licenseCode);
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
          const res = ['LOCK_LOST', lockKey];
          this.evalLog.push({ tag: 'COMMIT_SETTLEMENT', result: res });
          return res;
        }
        if (meta.fence !== expectedFence) {
          const res = ['STALE_FENCE', String(meta.fence)];
          this.evalLog.push({ tag: 'COMMIT_SETTLEMENT', result: res });
          return res;
        }
      }

      const curTxRaw = txKey ? this.kv.get(txKey) : null;
      if (curTxRaw) {
        const curTx = JSON.parse(curTxRaw);
        if (curTx.consistencyState === 'committed') {
          if (cleanCode && curTx.licenseCode && curTx.licenseCode !== cleanCode) {
            const res = ['TRANSACTION_ALREADY_BOUND', curTx.licenseCode];
            this.evalLog.push({ tag: 'COMMIT_SETTLEMENT', result: res });
            return res;
          }
          const res = ['IDEMPOTENT', curTx.licenseCode || cleanCode];
          this.evalLog.push({ tag: 'COMMIT_SETTLEMENT', result: res });
          return res;
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
              const res = ['TRANSACTION_ALREADY_BOUND', curEvt.licenseCode || curEvt.transactionId || ''];
              this.evalLog.push({ tag: 'COMMIT_SETTLEMENT', result: res });
              return res;
            }
            const res = ['IDEMPOTENT', curEvt.licenseCode || cleanCode];
            this.evalLog.push({ tag: 'COMMIT_SETTLEMENT', result: res });
            return res;
          }
        }
      }

      if (txKey && txJson) this.kv.set(txKey, txJson);
      if (hasEvent && eventKey && eventJson) this.kv.set(eventKey, eventJson);
      if (hasOrder && orderKey && orderJson) {
        const curOrdRaw = this.kv.get(orderKey);
        const curOrd = curOrdRaw ? JSON.parse(curOrdRaw) : {};
        const nextOrd = JSON.parse(orderJson);
        this.kv.set(orderKey, JSON.stringify({ ...curOrd, ...nextOrd }));
      }
      if (seatKey && seatPatchJson) {
        const curSeatRaw = this.kv.get(seatKey);
        const curSeat = curSeatRaw ? JSON.parse(curSeatRaw) : {};
        const seatPatch = JSON.parse(seatPatchJson);
        this.kv.set(seatKey, JSON.stringify({ ...curSeat, ...seatPatch }));
      }
      if (registryKey && adminPatchJson) {
        const curRegRaw = this.kv.get(registryKey);
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
        this.kv.set(registryKey, JSON.stringify(list));
      }

      const res = ['COMMITTED', txId || cleanCode];
      this.evalLog.push({ tag: 'COMMIT_SETTLEMENT', result: res });
      return res;
    }

    return null;
  }

  async handleFetch(
    urlStr: string,
    method: string,
    headers: Record<string, string>,
    body?: string,
    mayarInvoiceMock?: Record<string, any>
  ): Promise<{ ok: boolean; status: number; jsonData: any }> {
    if (urlStr.startsWith(REDIS_URL)) {
      if (this.outageMode) {
        return {
          ok: false,
          status: 503,
          jsonData: { error: 'Upstash Redis connection unavailable' },
        };
      }
      const authHeader = String(headers.authorization || headers.Authorization || '');
      if (authHeader !== `Bearer ${REDIS_TOKEN}`) {
        return { ok: false, status: 401, jsonData: { error: 'Unauthorized' } };
      }
      const pathPart = urlStr.slice(REDIS_URL.length);
      if ((pathPart === '' || pathPart === '/') && method.toUpperCase() === 'POST' && body) {
        const cmd = JSON.parse(body) as string[];
        if (cmd[0] === 'EVAL') {
          const script = cmd[1];
          const numKeys = Number(cmd[2] || 0);
          const keys = cmd.slice(3, 3 + numKeys);
          const args = cmd.slice(3 + numKeys);
          const result = this.executeLua(script, keys, args);
          return { ok: true, status: 200, jsonData: { result } };
        }
      }
      if (pathPart.startsWith('/get/')) {
        const key = decodeURIComponent(pathPart.slice('/get/'.length));
        if (
          this.delayedGetPattern &&
          this.delayedGetMs > 0 &&
          this.delayedGetTriggeredCount === 0 &&
          key.includes(this.delayedGetPattern)
        ) {
          this.delayedGetTriggeredCount += 1;
          await new Promise((r) => setTimeout(r, this.delayedGetMs));
        }
        return {
          ok: true,
          status: 200,
          jsonData: { result: this.kv.has(key) ? this.kv.get(key)! : null },
        };
      }
      if (pathPart.startsWith('/set/')) {
        const key = decodeURIComponent(pathPart.slice('/set/'.length));
        this.kv.set(key, String(body ?? ''));
        return { ok: true, status: 200, jsonData: { result: 'OK' } };
      }
      if (pathPart.startsWith('/del/')) {
        const key = decodeURIComponent(pathPart.slice('/del/'.length));
        const existed = this.kv.delete(key);
        this.lockExpiry.delete(key);
        return { ok: true, status: 200, jsonData: { result: existed ? 1 : 0 } };
      }
    }

    if (urlStr.includes('/hl/v2/invoices/')) {
      const authHeader = String(headers.authorization || headers.Authorization || '');
      if (authHeader !== `Bearer ${MAYAR_API_KEY}`) {
        return { ok: false, status: 401, jsonData: { statusCode: 401, messages: 'Invalid Mayar API Key' } };
      }
      const invoiceLookupId = decodeURIComponent(urlStr.split('/hl/v2/invoices/')[1] || '');
      const mockRecord = mayarInvoiceMock?.[invoiceLookupId];
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

interface WorkerInvokeSpec {
  handler: 'webhook' | 'activate';
  req: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  };
  workerDelayBeforeTxMs?: number;
  envOverrides?: Record<string, string>;
}

async function runConcurrentWorkers(
  redisSim: AtomicRedisSimulator,
  specs: WorkerInvokeSpec[],
  mayarInvoiceMock?: Record<string, any>
): Promise<Array<{ workerId: string; statusCode: number; body: any; durationMs: number }>> {
  const activateUrl = pathToFileURL(path.resolve(process.cwd(), 'api/activate-license.js')).href;
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
            const { resolve } = pending.get(msg.reqId);
            pending.delete(msg.reqId);
            resolve(msg);
          }
        });
        globalThis.fetch = (input, init) => {
          return new Promise((resolve) => {
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

        const modUrl = workerData.handler === 'webhook' ? workerData.webhookUrl : workerData.activateUrl;
        const mod = await import(modUrl);
        const handler = mod.default;

        // Sinkronisasi barrier: pastikan seluruh worker telah menyelesaikan bootstrap V8 & ESM import
        // sebelum mengeksekusi handler() secara bersamaan agar kontensi CPU paralel tidak mendistorsi balapan.
        await new Promise((resolveGo) => {
          const onGo = (msg) => {
            if (msg && msg.type === 'GO') {
              parentPort.off('message', onGo);
              resolveGo(undefined);
            }
          };
          parentPort.on('message', onGo);
          parentPort.postMessage({ type: 'READY', workerId: workerData.workerId });
        });

        const started = Date.now();
        let statusCode = 200;
        let responseBody = null;
        const headers = {};
        const req = {
          method: workerData.req.method || 'POST',
          url: workerData.req.url || (workerData.handler === 'webhook' ? '/api/mayar-webhook' : '/api/activate-license'),
          headers: workerData.req.headers || {},
          body: workerData.req.body || {},
          socket: { remoteAddress: '127.0.0.1' },
        };
        const res = {
          setHeader(k, v) { headers[String(k).toLowerCase()] = v; },
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
          durationMs: Date.now() - started,
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

  const activeWorkers: Worker[] = [];
  let readyCount = 0;

  const tasks = specs.map((spec, idx) => {
    const workerId = `W${idx + 1}`;
    return new Promise<{ workerId: string; statusCode: number; body: any; durationMs: number }>((resolve, reject) => {
      const worker = new Worker(workerBootstrap, {
        eval: true,
        workerData: {
          workerId,
          handler: spec.handler,
          req: spec.req,
          activateUrl,
          webhookUrl,
          env: {
            UPSTASH_REDIS_REST_URL: REDIS_URL,
            UPSTASH_REDIS_REST_TOKEN: REDIS_TOKEN,
            MAYAR_WEBHOOK_SECRET: WEBHOOK_SECRET,
            ASESMERDEKA_LICENSE_SIGNING_SECRET: LICENSE_SIGNING_SECRET,
            MAYAR_API_BASE_URL,
            MAYAR_API_KEY,
            ...(spec.envOverrides || {}),
          },
        },
      });
      activeWorkers.push(worker);

      worker.on('message', async (msg: any) => {
        if (!msg) return;
        if (msg.type === 'READY') {
          readyCount += 1;
          if (readyCount === specs.length) {
            for (const w of activeWorkers) {
              w.postMessage({ type: 'GO' });
            }
          }
        } else if (msg.type === 'FETCH') {
          const reply = await redisSim.handleFetch(msg.url, msg.method, msg.headers || {}, msg.body, mayarInvoiceMock);
          worker.postMessage({ type: 'FETCH_RES', reqId: msg.reqId, ...reply });
        } else if (msg.type === 'DONE') {
          await worker.terminate();
          resolve({
            workerId: msg.workerId,
            statusCode: msg.statusCode,
            body: msg.body,
            durationMs: msg.durationMs,
          });
        } else if (msg.type === 'ERR') {
          await worker.terminate();
          reject(new Error(`Worker ${msg.workerId} failed: ${msg.message}`));
        }
      });

      worker.on('error', (err) => reject(err));
    });
  });

  return Promise.all(tasks);
}

describe('Task 7.1.2 — Mayar Transaction Identity & Distributed Atomicity Closure', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let redisSim: AtomicRedisSimulator;

  beforeEach(() => {
    globalThis.localStorage.clear();
    redisSim = new AtomicRedisSimulator();
    clearPaymentGatewayClientCaches();
    localSeatMemoryStore.clear();
    localLicenseRegistryStore.length = 0;
    localRevokedLicensesSet.clear();
    localWebhookTransactionStore.clear();
    localWebhookEventStore.clear();
    localPaymentOrderStore.clear();

    process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REDIS_TOKEN;
    process.env.MAYAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.ASESMERDEKA_LICENSE_SIGNING_SECRET = LICENSE_SIGNING_SECRET;
    process.env.MAYAR_API_BASE_URL = MAYAR_API_BASE_URL;
    delete process.env.MAYAR_API_KEY;
    delete process.env.ASESMERDEKA_LOCK_TTL_MS;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.endsWith('/api/activate-license')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const r = await invokeHandler(activateLicenseHandler, { body });
        return {
          ok: r.statusCode >= 200 && r.statusCode < 300,
          status: r.statusCode,
          json: async () => r.body,
        } as Response;
      }
      const headers: Record<string, string> = {};
      if (init?.headers) {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          headers[k.toLowerCase()] = String(v);
        }
      }
      const reply = await redisSim.handleFetch(
        urlStr,
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
    process.env = { ...originalEnv };
    globalThis.localStorage.clear();
  });

  // =========================================================================
  // PART A — MAYAR IDENTIFIER CONTRACT & API CORRELATION
  // =========================================================================
  it('1. data.id dan payload.id tidak pernah dipromosikan menjadi transactionId; webhook tanpa transactionId eksplisit ditolak aktivasi (HTTP 202 MISSING_TRANSACTION_IDENTIFIER)', async () => {
    const idsFromDataIdOnly = extractMayarWebhookIdentifiers(
      { id: 'OUTER-WH-101', event: 'payment.received' },
      { id: 'DATA-ID-101', orderId: 'INV-AMB-101' }
    );
    expect(idsFromDataIdOnly.webhookEventId).toBe('OUTER-WH-101');
    expect(idsFromDataIdOnly.webhookDataId).toBe('DATA-ID-101');
    expect(idsFromDataIdOnly.transactionId).toBe('');
    expect(idsFromDataIdOnly.transactionIdSource).toBe('none');
    expect(idsFromDataIdOnly.ambiguousTransactionIdentity).toBe(true);

    const code = makeSerial('GM26', 'AMB101');
    const session = createPaymentInvoiceSession({
      planId: 'pro_individu',
      methodId: 'qris',
      buyerName: 'Pak Dani',
      buyerEmail: 'dani@sdn.sch.id',
      deviceId: 'DEV-AMB-101',
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

    // Kirim webhook payment.received dengan data.id SAJA tanpa transactionId & tanpa MAYAR_API_KEY
    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'DATA-WEBHOOK-ONLY-101',
          orderId: session.invoiceId,
          status: true,
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          customerEmail: session.buyerEmail,
          licenseCode: code,
        },
      },
    });

    expect(res.statusCode).toBe(202);
    expect(res.body.activated).toBe(false);
    expect(res.body.reason).toBe('MISSING_TRANSACTION_IDENTIFIER');
    expect(res.body.lifecycleState).toBe('pending_payment');

    // Order di Redis tetap pending_payment, kursi lisensi belum ada, browser tetap free
    const persistedOrder = JSON.parse(redisSim.kv.get(`asesmerdeka:mayar:order:v1:${session.invoiceId}`)!);
    expect(persistedOrder.status).toBe('pending_payment');
    expect(redisSim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);

    const verifyClient = await verifyPaymentOrderStatusOnline(session);
    expect(verifyClient.activated).toBe(false);
    expect(getUserQuota().tier).toBe('free');
  });

  it('2. Korelasi Mayar Detail API (/hl/v2/invoices/{id}) melengkapi transactionId sah & menolak jika API tidak terbayar/mismatch', async () => {
    process.env.MAYAR_API_KEY = MAYAR_API_KEY;
    const mayarMockRecords: Record<string, any> = {
      'MAYAR-INV-OK-201': {
        id: 'MAYAR-INV-OK-201',
        status: 'paid',
        amount: 99000,
        transactionId: 'TXN-API-AUTH-201',
        productId: INDIVIDU_PRODUCT_ID,
      },
      'MAYAR-INV-UNPAID-202': {
        id: 'MAYAR-INV-UNPAID-202',
        status: 'unpaid',
        amount: 99000,
      },
    };

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.endsWith('/api/activate-license')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const r = await invokeHandler(activateLicenseHandler, { body });
        return {
          ok: r.statusCode >= 200 && r.statusCode < 300,
          status: r.statusCode,
          json: async () => r.body,
        } as Response;
      }
      const headers: Record<string, string> = {};
      if (init?.headers) {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          headers[k.toLowerCase()] = String(v);
        }
      }
      const reply = await redisSim.handleFetch(
        String(input),
        init?.method || 'GET',
        headers,
        init?.body !== undefined ? String(init.body) : undefined,
        mayarMockRecords
      );
      return {
        ok: reply.ok,
        status: reply.status,
        json: async () => reply.jsonData,
      } as Response;
    });

    const apiDirect = await correlateMayarTransactionViaApi({
      mayarInvoiceId: 'MAYAR-INV-OK-201',
    });
    expect(apiDirect.resolved).toBe(true);
    expect(apiDirect.transactionId).toBe('TXN-API-AUTH-201');

    const apiUnpaid = await correlateMayarTransactionViaApi({
      mayarInvoiceId: 'MAYAR-INV-UNPAID-202',
    });
    expect(apiUnpaid.resolved).toBe(false);
    expect(apiUnpaid.reason).toBe('MAYAR_API_PAYMENT_NOT_SETTLED');

    // Webhook dengan data.id SAJA tanpa mayarInvoiceId / serverOrder TIDAK boleh memanggil /hl/v2/invoices/<data.id>
    const codeNoInv = makeSerial('GM26', 'NOINV0');
    const noInvRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-ONLY-NO-INV',
          status: true,
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: codeNoInv,
        },
      },
    });
    expect(noInvRes.statusCode).toBe(202);
    expect(noInvRes.body.activated).toBe(false);
    expect(noInvRes.body.reason).toBe('MISSING_TRANSACTION_IDENTIFIER');

    const codeValid = makeSerial('GM26', 'API201');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-API-201',
        mayarInvoiceId: 'MAYAR-INV-OK-201',
        deviceId: 'DEV-API-201',
      },
    });
    const okRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-EVT-API-201',
          orderId: 'INV-API-201',
          status: true,
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: codeValid,
        },
      },
    });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.body.activated).toBe(true);
    expect(okRes.body.transactionId).toBe('TXN-API-AUTH-201');
    expect(okRes.body.mayarInvoiceId).toBe('MAYAR-INV-OK-201');
    expect(okRes.body.transactionIdSource).toBe('mayar_api_v2_detail');
    expect(redisSim.kv.has('asesmerdeka:mayar:tx:v1:TXN-API-AUTH-201')).toBe(true);
    expect(redisSim.kv.has('asesmerdeka:mayar:tx:v1:MAYAR-INV-OK-201')).toBe(false);
    expect(redisSim.kv.has('asesmerdeka:mayar:tx:v1:WH-EVT-API-201')).toBe(false);

    const codeUnpaid = makeSerial('GM26', 'API202');
    await invokeHandler(activateLicenseHandler, {
      body: {
        action: 'create_payment_order',
        planId: 'pro_individu',
        invoiceId: 'INV-API-202',
        mayarInvoiceId: 'MAYAR-INV-UNPAID-202',
        deviceId: 'DEV-API-202',
      },
    });
    const unpaidRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: {
          id: 'WH-EVT-API-202',
          orderId: 'INV-API-202',
          status: true,
          amount: 99000,
          productId: INDIVIDU_PRODUCT_ID,
          licenseCode: codeUnpaid,
        },
      },
    });
    expect(unpaidRes.statusCode).toBe(202);
    expect(unpaidRes.body.activated).toBe(false);
    expect(unpaidRes.body.reason).toBe('MAYAR_API_PAYMENT_NOT_SETTLED');
    expect(unpaidRes.body.idempotencyStatus).toBe('pending_reconciliation');
    expect(redisSim.kv.has(`asesmerdeka:seats:v1:${codeUnpaid}`)).toBe(false);
  });

  // =========================================================================
  // PART B — TRUE MULTI-INSTANCE WORKER CONCURRENCY & ATOMICITY (SCENARIOS A–F)
  // =========================================================================
  it('3. Scenario A (Multi-Instance Concurrent Duplicate Webhook): 2 Worker isolate bersamaan hanya 1 mengaktifkan & 1 idempotentReplay', async () => {
    const code = makeSerial('GM26', 'WKA01');
    const mayarInvoiceMock = {
      'MAYAR-INV-MULTI-A': {
        id: 'MAYAR-INV-MULTI-A',
        status: 'paid',
        amount: 99000,
        transactionId: 'TXN-MULTI-A',
        productId: INDIVIDU_PRODUCT_ID,
      },
    };
    const payload = {
      id: 'EVT-MULTI-A',
      event: 'payment.received',
      data: {
        id: 'DATA-MULTI-A',
        mayarInvoiceId: 'MAYAR-INV-MULTI-A',
        transactionId: 'TXN-MULTI-A',
        orderId: 'ORD-MULTI-A',
        status: true,
        amount: 99000,
        productId: INDIVIDU_PRODUCT_ID,
        licenseCode: code,
      },
    };

    const results = await runConcurrentWorkers(
      redisSim,
      [
        { handler: 'webhook', req: { url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`, body: payload } },
        { handler: 'webhook', req: { url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`, body: payload } },
      ],
      mayarInvoiceMock
    );

    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    const replays = results.filter((r) => r.body?.idempotentReplay === true);
    const freshCommits = results.filter((r) => r.body?.activated === true && !r.body?.idempotentReplay);
    expect(freshCommits.length).toBe(1);
    expect(replays.length).toBe(1);

    const txRecord = JSON.parse(redisSim.kv.get('asesmerdeka:mayar:tx:v1:TXN-MULTI-A')!);
    expect(txRecord.consistencyState).toBe('committed');
    expect(txRecord.licenseCode).toBe(code);
  });

  it('4. Scenario B (Different Events Same TransactionId Across 2 Isolates): hanya 1 transaksi diterima & klaim kode ke-2 ditolak HTTP 409', async () => {
    const code1 = makeSerial('GM26', 'WKB01');
    const code2 = makeSerial('GM26', 'WKB02');
    const mayarInvoiceMock = {
      'MAYAR-INV-MULTI-B': {
        id: 'MAYAR-INV-MULTI-B',
        status: 'paid',
        amount: 99000,
        transactionId: 'TXN-MULTI-B',
        productId: INDIVIDU_PRODUCT_ID,
      },
    };

    const results = await runConcurrentWorkers(
      redisSim,
      [
        {
          handler: 'webhook',
          req: {
            url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
            body: {
              id: 'EVT-MULTI-B1',
              event: 'payment.received',
              data: {
                mayarInvoiceId: 'MAYAR-INV-MULTI-B',
                transactionId: 'TXN-MULTI-B',
                orderId: 'ORD-MULTI-B1',
                status: true,
                amount: 99000,
                productId: INDIVIDU_PRODUCT_ID,
                licenseCode: code1,
              },
            },
          },
        },
        {
          handler: 'webhook',
          req: {
            url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
            body: {
              id: 'EVT-MULTI-B2',
              event: 'payment.received',
              data: {
                mayarInvoiceId: 'MAYAR-INV-MULTI-B',
                transactionId: 'TXN-MULTI-B',
                orderId: 'ORD-MULTI-B2',
                status: true,
                amount: 99000,
                productId: INDIVIDU_PRODUCT_ID,
                licenseCode: code2,
              },
            },
          },
        },
      ],
      mayarInvoiceMock
    );

    const okRes = results.filter((r) => r.statusCode === 200);
    const conflictRes = results.filter((r) => r.statusCode === 409);
    expect(okRes.length).toBe(1);
    expect(conflictRes.length).toBe(1);
    expect(conflictRes[0].body.transactionAlreadyBound).toBe(true);

    const winningCode = okRes[0].body.code;
    const losingCode = winningCode === code1 ? code2 : code1;
    expect(redisSim.kv.has(`asesmerdeka:seats:v1:${winningCode}`)).toBe(true);
    expect(redisSim.kv.has(`asesmerdeka:seats:v1:${losingCode}`)).toBe(false);
  });

  it('5. Scenario C (Same EventId Different Orders Across 2 Isolates): duplikasi webhookEventId untuk orderId berbeda ditolak HTTP 409', async () => {
    const code1 = makeSerial('GM26', 'WKC01');
    const code2 = makeSerial('GM26', 'WKC02');
    const mayarInvoiceMock = {
      'MAYAR-INV-C1': {
        id: 'MAYAR-INV-C1',
        status: 'paid',
        amount: 99000,
        transactionId: 'TXN-MULTI-C1',
        productId: INDIVIDU_PRODUCT_ID,
      },
      'MAYAR-INV-C2': {
        id: 'MAYAR-INV-C2',
        status: 'paid',
        amount: 99000,
        transactionId: 'TXN-MULTI-C2',
        productId: INDIVIDU_PRODUCT_ID,
      },
    };

    const results = await runConcurrentWorkers(
      redisSim,
      [
        {
          handler: 'webhook',
          req: {
            url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
            body: {
              id: 'EVT-SHARED-C',
              event: 'payment.received',
              data: {
                mayarInvoiceId: 'MAYAR-INV-C1',
                transactionId: 'TXN-MULTI-C1',
                orderId: 'ORD-MULTI-C1',
                status: true,
                amount: 99000,
                productId: INDIVIDU_PRODUCT_ID,
                licenseCode: code1,
              },
            },
          },
        },
        {
          handler: 'webhook',
          req: {
            url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
            body: {
              id: 'EVT-SHARED-C',
              event: 'payment.received',
              data: {
                mayarInvoiceId: 'MAYAR-INV-C2',
                transactionId: 'TXN-MULTI-C2',
                orderId: 'ORD-MULTI-C2',
                status: true,
                amount: 99000,
                productId: INDIVIDU_PRODUCT_ID,
                licenseCode: code2,
              },
            },
          },
        },
      ],
      mayarInvoiceMock
    );

    const okRes = results.filter((r) => r.statusCode === 200);
    const conflictRes = results.filter((r) => r.statusCode === 409);
    expect(okRes.length).toBe(1);
    expect(conflictRes.length).toBe(1);
    expect(conflictRes[0].body.transactionAlreadyBound).toBe(true);
  });

  it('6. Scenario D (Concurrent Last-Seat Claim Across 2 Isolates): batas perangkat/kursi tidak pernah tertembus oleh race condition', async () => {
    const code = makeSerial('GM26', 'WKD01');
    // Isi 1 perangkat lebih dulu untuk paket Individu (maks 2 perangkat total)
    const seedRes = await invokeHandler(activateLicenseHandler, {
      url: '/api/activate-license',
      body: {
        action: 'verify',
        licenseCode: code,
        deviceId: 'DEV-SEED-1',
        teacherPin: 'PIN_SEED',
      },
    });
    expect(seedRes.statusCode).toBe(200);
    expect(seedRes.body.usedSeats).toBe(1);

    // 2 Worker isolate berlomba mengklaim slot ke-2 secara bersamaan
    const results = await runConcurrentWorkers(redisSim, [
      {
        handler: 'activate',
        req: {
          url: '/api/activate-license',
          body: { action: 'verify', licenseCode: code, deviceId: 'DEV-RACE-W1', teacherPin: 'PIN_W1' },
        },
      },
      {
        handler: 'activate',
        req: {
          url: '/api/activate-license',
          body: { action: 'verify', licenseCode: code, deviceId: 'DEV-RACE-W2', teacherPin: 'PIN_W2' },
        },
      },
    ]);

    const granted = results.filter((r) => r.statusCode === 200 && r.body?.valid === true);
    const rejected = results.filter((r) => r.statusCode === 403 && r.body?.valid === false);
    expect(granted.length).toBe(1);
    expect(rejected.length).toBe(1);

    const finalSeat = JSON.parse(redisSim.kv.get(`asesmerdeka:seats:v1:${code}`)!);
    expect(finalSeat.devices.length).toBe(2);
    expect(finalSeat.usedSeats).toBe(2);
    expect(finalSeat.devices).toContain('DEV-SEED-1');
  });

  it('7. Scenario E (Lock Expiration & Stale Fence Token Across 2 Isolates): worker lambat ditolak HTTP 409 tanpa menimpa commit worker baru', async () => {
    const code = makeSerial('GM26', 'WKE01');
    const mayarInvoiceMock = {
      'MAYAR-INV-EXPIRE-E': {
        id: 'MAYAR-INV-EXPIRE-E',
        status: 'paid',
        amount: 99000,
        transactionId: 'TXN-EXPIRE-E',
        productId: INDIVIDU_PRODUCT_ID,
      },
    };
    // Tahan GET pertama ke key transaksi setelah lock terambil sehingga TTL 70ms habis di Worker 1
    redisSim.delayedGetPattern = 'asesmerdeka:mayar:tx:v1:TXN-EXPIRE-E';
    redisSim.delayedGetMs = 190;

    const worker1Promise = runConcurrentWorkers(
      redisSim,
      [
        {
          handler: 'webhook',
          req: {
            url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
            body: {
              id: 'EVT-EXPIRE-E',
              event: 'payment.received',
              data: {
                mayarInvoiceId: 'MAYAR-INV-EXPIRE-E',
                transactionId: 'TXN-EXPIRE-E',
                orderId: 'ORD-EXPIRE-E',
                status: true,
                amount: 99000,
                productId: INDIVIDU_PRODUCT_ID,
                customerName: 'Worker Lambat',
                licenseCode: code,
              },
            },
          },
          envOverrides: { ASESMERDEKA_LOCK_TTL_MS: '70' },
        },
      ],
      mayarInvoiceMock
    );

    // Beri jeda 95ms supaya lock Worker 1 (70ms) sudah kadaluarsa saat Worker 2 masuk dengan fenceToken = 2
    await new Promise((r) => setTimeout(r, 95));
    const worker2Promise = runConcurrentWorkers(
      redisSim,
      [
        {
          handler: 'webhook',
          req: {
            url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
            body: {
              id: 'EVT-EXPIRE-E',
              event: 'payment.received',
              data: {
                mayarInvoiceId: 'MAYAR-INV-EXPIRE-E',
                transactionId: 'TXN-EXPIRE-E',
                orderId: 'ORD-EXPIRE-E',
                status: true,
                amount: 99000,
                productId: INDIVIDU_PRODUCT_ID,
                customerName: 'Worker Pengganti Sah',
                licenseCode: code,
              },
            },
          },
        },
      ],
      mayarInvoiceMock
    );

    const [[w1], [w2]] = await Promise.all([worker1Promise, worker2Promise]);
    expect(w2.statusCode).toBe(200);
    expect(w2.body.activated).toBe(true);
    expect(w1.statusCode).toBe(409);
    expect(w1.body.ok).toBe(false);

    // State Redis harus 100% milik Worker 2 (fenceToken = 2), tidak pernah tertimpa Worker 1
    const txFinal = JSON.parse(redisSim.kv.get('asesmerdeka:mayar:tx:v1:TXN-EXPIRE-E')!);
    expect(txFinal.webhookEventId).toBe('EVT-EXPIRE-E');
    expect(txFinal.customerName).toBe('Worker Pengganti Sah');
    expect(Number(txFinal.fenceToken)).toBe(2);
  });

  it('8. Scenario F (Redis Outage Fail-Closed): outage pada lock/webhook/order/seat/revocation mengembalikan HTTP 503 tanpa fallback lokal', async () => {
    const code = makeSerial('GM26', 'WKF01');
    redisSim.outageMode = true;

    const [whOutage, orderCreateOutage, verifyOutage, seatOutage, revokeOutage] = await Promise.all([
      invokeHandler(mayarWebhookHandler, {
        url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
        body: {
          id: 'EVT-OUTAGE-F',
          event: 'payment.received',
          data: {
            transactionId: 'TXN-OUTAGE-F',
            status: true,
            amount: 99000,
            productId: INDIVIDU_PRODUCT_ID,
            licenseCode: code,
          },
        },
      }),
      invokeHandler(activateLicenseHandler, {
        url: '/api/activate-license',
        body: { action: 'create_payment_order', planId: 'pro_individu', invoiceId: 'INV-OUTAGE-F', deviceId: 'DEV-F' },
      }),
      invokeHandler(activateLicenseHandler, {
        url: '/api/activate-license',
        body: { action: 'verify_payment_order', invoiceId: 'INV-OUTAGE-F', deviceId: 'DEV-F' },
      }),
      invokeHandler(activateLicenseHandler, {
        url: '/api/activate-license',
        body: { action: 'verify', licenseCode: code, deviceId: 'DEV-F', teacherPin: 'PIN_F' },
      }),
      invokeHandler(activateLicenseHandler, {
        url: '/api/activate-license',
        body: { action: 'revoke', licenseCode: code, adminAuth: 'invalid' },
      }),
    ]);

    expect(whOutage.statusCode).toBe(503);
    expect(whOutage.body.activated).toBe(false);
    expect(orderCreateOutage.statusCode).toBe(503);
    expect(verifyOutage.statusCode).toBe(503);
    expect(verifyOutage.body.activated).toBe(false);
    expect(seatOutage.statusCode).toBe(503);
    expect(seatOutage.body.valid).toBe(false);
    expect(revokeOutage.statusCode).toBe(503);
    expect(localSeatMemoryStore.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
    expect(localWebhookTransactionStore.has('TXN-OUTAGE-F')).toBe(false);
  });

  // =========================================================================
  // PART C — PARTIAL STATE IDEMPOTENT RECOVERY & ZERO ACADEMIC DATA LOSS
  // =========================================================================
  it('9. Recovery idempoten dari state settling setengah jalan menyatukan TX, Event, Order, Seat & menjaga data akademik 100% utuh', async () => {
    process.env.MAYAR_API_KEY = MAYAR_API_KEY;
    const recInvoices = {
      'MAYAR-INV-REC-09': {
        id: 'MAYAR-INV-REC-09',
        status: 'paid',
        amount: 749000,
        transactionId: 'TXN-REC-09',
        productId: SCHOOL_PRODUCT_ID,
      },
    };
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.endsWith('/api/activate-license')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const r = await invokeHandler(activateLicenseHandler, { body });
        return {
          ok: r.statusCode >= 200 && r.statusCode < 300,
          status: r.statusCode,
          json: async () => r.body,
        } as Response;
      }
      const headers: Record<string, string> = {};
      if (init?.headers) {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          headers[k.toLowerCase()] = String(v);
        }
      }
      const reply = await redisSim.handleFetch(
        String(input),
        init?.method || 'GET',
        headers,
        init?.body !== undefined ? String(init.body) : undefined,
        recInvoices
      );
      return {
        ok: reply.ok,
        status: reply.status,
        json: async () => reply.jsonData,
      } as Response;
    });

    const code = makeSerial('SK26', 'REC09');
    const academicKelas = JSON.stringify([{ id: 'KLS-9A', nama: 'Kelas 9A', siswa: ['Citra', 'Dewi'] }]);
    const academicNilai = JSON.stringify([{ siswa: 'Citra', akhir: 91 }]);
    const academicJurnal = JSON.stringify([{ tanggal: '2026-11-14', materi: 'Statistika' }]);
    globalThis.localStorage.setItem('asesmerdeka_kelas_data', academicKelas);
    globalThis.localStorage.setItem('asesmerdeka_nilai', academicNilai);
    globalThis.localStorage.setItem('asesmerdeka_jurnal', academicJurnal);

    const session = createPaymentInvoiceSession({
      planId: 'pro_sekolah',
      methodId: 'qris',
      buyerName: 'SMPN 9 Merdeka',
      buyerEmail: 'admin@smpn9.sch.id',
      deviceId: 'DEV-REC-09',
    });

    await invokeHandler(activateLicenseHandler, {
      url: '/api/activate-license',
      body: {
        action: 'create_payment_order',
        planId: 'pro_sekolah',
        invoiceId: session.invoiceId,
        deviceId: session.deviceId,
        buyerEmail: session.buyerEmail,
      },
    });

    // Simulasikan state tengah jalan (consistencyState: 'settling') sebelum commit penuh selesai
    redisSim.kv.set(
      'asesmerdeka:mayar:tx:v1:TXN-REC-09',
      JSON.stringify({
        transactionId: 'TXN-REC-09',
        webhookEventId: 'EVT-REC-09',
        orderId: session.invoiceId,
        licenseCode: code,
        amount: 749000,
        status: 'settling',
        consistencyState: 'settling',
      })
    );

    const recoveryRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        id: 'EVT-REC-09',
        event: 'payment.received',
        data: {
          mayarInvoiceId: 'MAYAR-INV-REC-09',
          transactionId: 'TXN-REC-09',
          orderId: session.invoiceId,
          status: true,
          amount: 749000,
          productId: SCHOOL_PRODUCT_ID,
          customerName: 'SMPN 9 Merdeka',
          customerEmail: session.buyerEmail,
          licenseCode: code,
        },
      },
    });

    expect(recoveryRes.statusCode).toBe(200);
    expect(recoveryRes.body.activated).toBe(true);

    const committedTx = JSON.parse(redisSim.kv.get('asesmerdeka:mayar:tx:v1:TXN-REC-09')!);
    const committedEvt = JSON.parse(redisSim.kv.get('asesmerdeka:mayar:event:v1:EVT-REC-09')!);
    const committedOrder = JSON.parse(redisSim.kv.get(`asesmerdeka:mayar:order:v1:${session.invoiceId}`)!);
    const committedSeat = JSON.parse(redisSim.kv.get(`asesmerdeka:seats:v1:${code}`)!);
    const committedReg = JSON.parse(redisSim.kv.get('asesmerdeka:admin:license_registry:v1')!);

    expect(committedTx.consistencyState).toBe('committed');
    expect(committedEvt.consistencyState).toBe('committed');
    expect(committedOrder.status).toBe('paid');
    expect(committedOrder.consistencyState).toBe('committed');
    expect(committedSeat.transactionId).toBe('TXN-REC-09');
    expect(committedReg.some((r: any) => r.code === code && r.lifecycleState === 'paid')).toBe(true);

    // Klaim kursi melalui verifyPaymentOrderStatusOnline melengkapi lifecycleState -> active
    const verifyRecovery = await verifyPaymentOrderStatusOnline(session, { teacherPin: 'PIN_REC_09' });
    expect(verifyRecovery.activated).toBe(true);
    expect(getUserQuota().tier).toBe('sekolah');
    const committedSeatActive = JSON.parse(redisSim.kv.get(`asesmerdeka:seats:v1:${code}`)!);
    expect(committedSeatActive.lifecycleState).toBe('active');
    expect(committedSeatActive.usedSeats).toBe(1);

    // Data akademik tetap 100% utuh
    expect(globalThis.localStorage.getItem('asesmerdeka_kelas_data')).toBe(academicKelas);
    expect(globalThis.localStorage.getItem('asesmerdeka_nilai')).toBe(academicNilai);
    expect(globalThis.localStorage.getItem('asesmerdeka_jurnal')).toBe(academicJurnal);
  });
});
