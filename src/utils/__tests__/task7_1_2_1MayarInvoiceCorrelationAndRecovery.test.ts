// STATUS: RETIRED — Mayar Invoice Correlation & Recovery tests replaced by task13_mayarDecommissionRegression.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// @ts-expect-error JS Vercel handler module without .d.ts
import activateLicenseHandler, {
  RECONCILE_QUEUE_REDIS_KEY,
  WEBHOOK_AUDIT_REDIS_KEY,
  buildMayarInvoiceIndexKey,
  buildPaymentOrderKey,
  buildWebhookTxKey,
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
  localWebhookAuditLog,
  localWebhookEventStore,
  localWebhookTransactionStore,
} from '../../../api/activate-license.js';
// @ts-expect-error JS Vercel handler module without .d.ts
import mayarWebhookHandler, {
  correlateMayarTransactionViaApi,
  reconcilePendingWebhooks,
} from '../../../api/mayar-webhook.js';
import { computeSerialLicenseCode } from '../licenseManager';

const REDIS_URL = 'https://redis-retired-check.asesmerdeka.test';
const REDIS_TOKEN = 'redis-token-retired-7121';

function invokeHandler(
  handler: (req: any, res: any) => Promise<any>,
  options: { method?: string; url?: string; headers?: Record<string, string>; body?: any } = {}
) {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: any = null;
  const req = {
    method: options.method || 'POST',
    url: options.url || '/api/mayar-webhook',
    headers: options.headers || {},
    body: options.body ?? {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  const res = {
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = v;
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
  return handler(req, res).then(() => ({ statusCode, headers, body }));
}

describe('Task 7.1.2.1 [RETIRED] — Mayar Invoice Correlation & Historical Read Preservation', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let redisKV: Map<string, string>;
  let outboundUrls: string[];

  beforeEach(() => {
    redisKV = new Map<string, string>();
    outboundUrls = [];
    localSeatMemoryStore.clear();
    localLicenseRegistryStore.length = 0;
    localRevokedLicensesSet.clear();
    localWebhookTransactionStore.clear();
    localWebhookEventStore.clear();
    localPaymentOrderStore.clear();
    localMayarInvoiceIndexStore.clear();
    localReconcileQueueStore.clear();
    localWebhookAuditLog.length = 0;

    process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REDIS_TOKEN;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      outboundUrls.push(urlStr);
      if (!urlStr.startsWith(REDIS_URL)) {
        return new Response(JSON.stringify({ error: 'Unexpected external fetch' }), { status: 404 });
      }
      const suffix = urlStr.slice(REDIS_URL.length);
      if (suffix.startsWith('/get/')) {
        const key = decodeURIComponent(suffix.slice('/get/'.length));
        const val = redisKV.has(key) ? redisKV.get(key)! : null;
        return new Response(JSON.stringify({ result: val }), { status: 200 });
      }
      if (suffix.startsWith('/set/')) {
        const key = decodeURIComponent(suffix.slice('/set/'.length));
        redisKV.set(key, String(init?.body ?? ''));
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }
      const cmd = JSON.parse(String(init?.body || '[]')) as string[];
      const op = String(cmd[0] || '').toUpperCase();
      if (op === 'GET') {
        const val = redisKV.has(cmd[1]) ? redisKV.get(cmd[1])! : null;
        return new Response(JSON.stringify({ result: val }), { status: 200 });
      }
      if (op === 'SET') {
        redisKV.set(cmd[1], String(cmd[2] ?? ''));
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
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
            redisKV.set(keys[i], owner);
          }
          const fence = (Number(redisKV.get(fenceKey) || '0') || 0) + 1;
          redisKV.set(fenceKey, String(fence));
          return new Response(JSON.stringify({ result: ['ACQUIRED', String(fence)] }), { status: 200 });
        }
        if (script.includes('ASESMERDEKA_RELEASE_MULTI_LOCK_V1')) {
          for (const k of keys) redisKV.delete(k);
          return new Response(JSON.stringify({ result: keys.length }), { status: 200 });
        }
        if (script.includes('ASESMERDEKA_FENCED_RECORD_WRITE_V1')) {
          redisKV.set(keys[0], args[2]);
          return new Response(JSON.stringify({ result: ['OK', ''] }), { status: 200 });
        }
        if (script.includes('ASESMERDEKA_ATOMIC_SEAT_CAS_V1')) {
          redisKV.set(keys[0], args[3]);
          return new Response(JSON.stringify({ result: ['OK', ''] }), { status: 200 });
        }
        if (script.includes('ASESMERDEKA_UPSERT_ADMIN_REGISTRY_V1')) {
          return new Response(JSON.stringify({ result: ['OK'] }), { status: 200 });
        }
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('1. create_payment_order menolak createMayarInvoice, mayarInvoiceId, dan provider=mayar dengan HTTP 410 tanpa memanggil Mayar', async () => {
    for (const payload of [
      { action: 'create_payment_order', planId: 'pro_individu', createMayarInvoice: true },
      { action: 'create_payment_order', planId: 'pro_individu', mayarInvoiceId: 'MYR-INV-1' },
      { action: 'create_payment_order', planId: 'pro_individu', provider: 'mayar' },
    ]) {
      const res = await invokeHandler(activateLicenseHandler, {
        url: '/api/activate-license',
        body: payload,
      });
      expect(res.statusCode).toBe(410);
      expect(res.body.retired).toBe(true);
      expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');
    }
    expect(outboundUrls.filter((u) => u.includes('mayar'))).toHaveLength(0);
    expect(redisKV.size).toBe(0);
  });

  it('2. Endpoint /api/mayar-webhook mengembalikan HTTP 410 Gone dan tidak memodifikasi Redis', async () => {
    const res = await invokeHandler(mayarWebhookHandler, {
      body: { id: 'EVT-7121-RET', event: 'payment.received', data: { mayarInvoiceId: 'MYR-INV-1' } },
    });
    expect(res.statusCode).toBe(410);
    expect(res.body.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(outboundUrls).toHaveLength(0);
    expect(redisKV.size).toBe(0);
  });

  it('3. reconcilePendingWebhooks & correlateMayarTransactionViaApi dipensiunkan (MAYAR_DECOMMISSIONED, 0 processed)', async () => {
    const rec = await reconcilePendingWebhooks();
    expect(rec.ok).toBe(false);
    expect(rec.retired).toBe(true);
    expect(rec.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(rec.processed).toBe(0);

    const cor = await correlateMayarTransactionViaApi();
    expect(cor.ok).toBe(false);
    expect(cor.retired).toBe(true);
    expect(cor.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(outboundUrls).toHaveLength(0);
  });

  it('4. Seluruh catatan historis asesmerdeka:mayar:* tetap utuh dan dapat dibaca read-only', async () => {
    const code = computeSerialLicenseCode('INDIVHIST71');
    redisKV.set(
      buildPaymentOrderKey('INV-HIST-7121'),
      JSON.stringify({
        orderId: 'INV-HIST-7121',
        invoiceId: 'INV-HIST-7121',
        mayarInvoiceId: 'MYR-HIST-7121',
        transactionId: 'TXN-HIST-7121',
        licenseCode: code,
        planId: 'pro_individu',
        planType: 'individu',
        baseAmount: 99000,
        status: 'paid',
      })
    );
    redisKV.set(
      buildWebhookTxKey('TXN-HIST-7121'),
      JSON.stringify({
        transactionId: 'TXN-HIST-7121',
        orderId: 'INV-HIST-7121',
        licenseCode: code,
        planType: 'individu',
        amount: 99000,
        status: 'paid',
        verifiedBy: 'historical_mayar_v2',
      })
    );
    redisKV.set(
      buildMayarInvoiceIndexKey('MYR-HIST-7121'),
      JSON.stringify({ mayarInvoiceId: 'MYR-HIST-7121', orderId: 'INV-HIST-7121' })
    );
    redisKV.set(
      RECONCILE_QUEUE_REDIS_KEY,
      JSON.stringify([{ jobKey: 'HIST-JOB-1', orderId: 'INV-HIST-NONTERM' }])
    );
    redisKV.set(
      WEBHOOK_AUDIT_REDIS_KEY,
      JSON.stringify([{ orderId: 'INV-HIST-7121', outcome: 'paid' }])
    );

    expect((await getPaymentOrderRecord('INV-HIST-7121'))?.status).toBe('paid');
    expect((await getWebhookTransactionRecord('TXN-HIST-7121'))?.licenseCode).toBe(code);
    expect(await getOrderIdByMayarInvoiceId('MYR-HIST-7121')).toBe('INV-HIST-7121');
    expect(await getReconcileQueueRecords()).toHaveLength(1);
    expect(await getSanitizedWebhookAuditLog()).toHaveLength(1);

    const verifyRes = await invokeHandler(activateLicenseHandler, {
      url: '/api/activate-license',
      body: { action: 'verify_payment_order', invoiceId: 'INV-HIST-7121' },
    });
    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.verified).toBe(true);
    expect(verifyRes.body.licenseCode).toBe(code);
    expect(outboundUrls.every((u) => u.startsWith(REDIS_URL))).toBe(true);
  });
});
