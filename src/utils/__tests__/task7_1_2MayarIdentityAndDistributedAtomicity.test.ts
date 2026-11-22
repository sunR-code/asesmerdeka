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
  savePaymentOrderRecord,
  saveSeatRecordToRedis,
  saveWebhookEventRecord,
  saveWebhookTransactionRecord,
} from '../../../api/activate-license.js';
// @ts-expect-error JS Vercel handler module without .d.ts
import mayarWebhookHandler, {
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
  // PART A — RETIRED MAYAR IDENTIFIER CONTRACT & API CORRELATION (410 GONE)
  // Replaced by task13_mayarDecommissionRegression.test.ts
  // =========================================================================
  it('1. [RETIRED] Webhook Mayar mengembalikan HTTP 410 Gone dan tidak mengubah order pending_payment menjadi paid', async () => {
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

    const res = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        event: 'payment.received',
        data: { id: 'DATA-WEBHOOK-ONLY-101', orderId: session.invoiceId, licenseCode: code },
      },
    });

    expect(res.statusCode).toBe(410);
    expect(res.body.retired).toBe(true);
    expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');

    const persistedOrder = JSON.parse(redisSim.kv.get(`asesmerdeka:mayar:order:v1:${session.invoiceId}`)!);
    expect(persistedOrder.status).toBe('pending_payment');
    expect(redisSim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);

    const verifyClient = await verifyPaymentOrderStatusOnline(session);
    expect(verifyClient.activated).toBe(false);
    expect(getUserQuota().tier).toBe('free');
  });

  it('2. [RETIRED] Korelasi Mayar Detail API (/hl/v2/invoices/{id}) dipensiunkan (MAYAR_DECOMMISSIONED, zero outbound calls)', async () => {
    const correlateRes = await correlateMayarTransactionViaApi();
    expect(correlateRes.ok).toBe(false);
    expect(correlateRes.retired).toBe(true);
    expect(correlateRes.reason).toBe('MAYAR_DECOMMISSIONED');

    const whRes = await invokeHandler(mayarWebhookHandler, {
      url: `/api/mayar-webhook?token=${WEBHOOK_SECRET}`,
      body: {
        id: 'EVT-API-202',
        event: 'payment.received',
        data: { mayarInvoiceId: 'MAYAR-INV-OK-201', amount: 99000 },
      },
    });
    expect(whRes.statusCode).toBe(410);
    expect(whRes.body.reason).toBe('MAYAR_DECOMMISSIONED');
  });

  // =========================================================================
  // PART B — MULTI-INSTANCE WORKER CONCURRENCY & ATOMICITY (SCENARIOS A–F)
  // =========================================================================
  it('3. Scenario A [RETIRED Webhook]: 2 Worker isolate bersamaan ke /api/mayar-webhook sama-sama mengembalikan HTTP 410 tanpa menulis Redis', async () => {
    const code = makeSerial('GM26', 'WKA01');
    const payload = {
      id: 'EVT-MULTI-A',
      event: 'payment.received',
      data: { id: 'DATA-MULTI-A', licenseCode: code, amount: 99000 },
    };

    const results = await runConcurrentWorkers(redisSim, [
      { handler: 'webhook', req: { url: '/api/mayar-webhook', body: payload } },
      { handler: 'webhook', req: { url: '/api/mayar-webhook', body: payload } },
    ]);

    expect(results.every((r) => r.statusCode === 410 && r.body?.reason === 'MAYAR_DECOMMISSIONED')).toBe(true);
    expect(redisSim.kv.has(`asesmerdeka:seats:v1:${code}`)).toBe(false);
  });

  it('4. Scenario B [RETIRED Webhook]: Klaim webhook paralel mengembalikan HTTP 410 Gone tanpa side effect', async () => {
    const code1 = makeSerial('GM26', 'WKB01');
    const code2 = makeSerial('GM26', 'WKB02');
    const results = await runConcurrentWorkers(redisSim, [
      { handler: 'webhook', req: { url: '/api/mayar-webhook', body: { id: 'EVT-B1', licenseCode: code1 } } },
      { handler: 'webhook', req: { url: '/api/mayar-webhook', body: { id: 'EVT-B2', licenseCode: code2 } } },
    ]);
    expect(results.every((r) => r.statusCode === 410)).toBe(true);
    expect(redisSim.kv.has(`asesmerdeka:seats:v1:${code1}`)).toBe(false);
    expect(redisSim.kv.has(`asesmerdeka:seats:v1:${code2}`)).toBe(false);
  });

  it('5. Scenario C [RETIRED Webhook]: Duplikasi event ke webhook Mayar yang dipensiunkan mengembalikan HTTP 410 Gone', async () => {
    const results = await runConcurrentWorkers(redisSim, [
      { handler: 'webhook', req: { url: '/api/mayar-webhook', body: { id: 'EVT-SHARED-C', orderId: 'ORD-1' } } },
      { handler: 'webhook', req: { url: '/api/mayar-webhook', body: { id: 'EVT-SHARED-C', orderId: 'ORD-2' } } },
    ]);
    expect(results.every((r) => r.statusCode === 410)).toBe(true);
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

  it('7. Scenario E [RETIRED Webhook Fence]: Webhook Mayar 410 Gone menjaga catatan transaksi historis Redis tidak tertimpa', async () => {
    const code = makeSerial('GM26', 'WKE01');
    redisSim.kv.set(
      'asesmerdeka:mayar:tx:v1:TXN-EXPIRE-E',
      JSON.stringify({
        transactionId: 'TXN-EXPIRE-E',
        licenseCode: code,
        customerName: 'Worker Pengganti Sah',
        fenceToken: 2,
        status: 'paid',
      })
    );

    const wRes = await runConcurrentWorkers(redisSim, [
      {
        handler: 'webhook',
        req: {
          url: '/api/mayar-webhook',
          body: { id: 'EVT-EXPIRE-E', data: { transactionId: 'TXN-EXPIRE-E', customerName: 'Worker Lambat' } },
        },
      },
    ]);
    expect(wRes[0].statusCode).toBe(410);

    const txFinal = JSON.parse(redisSim.kv.get('asesmerdeka:mayar:tx:v1:TXN-EXPIRE-E')!);
    expect(txFinal.customerName).toBe('Worker Pengganti Sah');
    expect(Number(txFinal.fenceToken)).toBe(2);
  });

  it('8. Scenario F (Redis Outage Fail-Closed): outage pada lock/order/seat/revocation mengembalikan HTTP 503 tanpa fallback lokal; webhook Mayar 410', async () => {
    const code = makeSerial('GM26', 'WKF01');
    redisSim.outageMode = true;

    const [whRetired, orderCreateOutage, verifyOutage, seatOutage, revokeOutage] = await Promise.all([
      invokeHandler(mayarWebhookHandler, {
        url: '/api/mayar-webhook',
        body: { id: 'EVT-OUTAGE-F', event: 'payment.received', data: { licenseCode: code } },
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

    expect(whRetired.statusCode).toBe(410);
    expect(whRetired.body.reason).toBe('MAYAR_DECOMMISSIONED');
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
  // PART C — HISTORICAL RECORD RECOVERY & ZERO ACADEMIC DATA LOSS
  // =========================================================================
  it('9. Catatan historis paid tetap mengaktifkan verifyPaymentOrderStatusOnline & menjaga data akademik 100% utuh', async () => {
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

    const retiredWh = await invokeHandler(mayarWebhookHandler, {
      url: '/api/mayar-webhook',
      body: { id: 'EVT-REC-09', event: 'payment.received' },
    });
    expect(retiredWh.statusCode).toBe(410);

    await savePaymentOrderRecord(session.invoiceId, {
      orderId: session.invoiceId,
      invoiceId: session.invoiceId,
      planId: 'pro_sekolah',
      planType: 'sekolah',
      tier: 'sekolah',
      baseAmount: 749000,
      maxSeats: 25,
      deviceId: session.deviceId,
      buyerName: 'SMPN 9 Merdeka',
      buyerEmail: session.buyerEmail,
      status: 'paid',
      consistencyState: 'committed',
      transactionId: 'TXN-REC-09',
      webhookEventId: 'EVT-REC-09',
      licenseCode: code,
    });
    await saveWebhookTransactionRecord('TXN-REC-09', {
      transactionId: 'TXN-REC-09',
      webhookEventId: 'EVT-REC-09',
      orderId: session.invoiceId,
      invoiceId: session.invoiceId,
      licenseCode: code,
      planType: 'sekolah',
      tier: 'sekolah',
      amount: 749000,
      customerEmail: session.buyerEmail,
      status: 'paid',
      consistencyState: 'committed',
      verifiedBy: 'historical_redis_record',
    });
    await saveWebhookEventRecord('EVT-REC-09', {
      webhookEventId: 'EVT-REC-09',
      transactionId: 'TXN-REC-09',
      orderId: session.invoiceId,
      licenseCode: code,
      status: 'paid',
      consistencyState: 'committed',
    });
    await saveSeatRecordToRedis(code, {
      licenseCode: code,
      planType: 'sekolah',
      tier: 'sekolah',
      maxSeats: 25,
      devices: [],
      usedSeats: 0,
      lifecycleState: 'paid',
      transactionId: 'TXN-REC-09',
    });

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
