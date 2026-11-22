// STATUS: RETIRED — Mayar API V2 & Cron Auth tests replaced by task13_mayarDecommissionRegression.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createMayarInvoiceViaApi,
  parseMayarV2ResponseEnvelope,
  resolveMayarApiV2Config,
} from '../../../api/activate-license.js';
import mayarWebhookHandler, {
  correlateMayarTransactionViaApi,
} from '../../../api/mayar-webhook.js';
import cronReconcileHandler from '../../../api/cron/mayar-reconcile.js';

const CRON_SECRET = 'CRON_RECONCILE_SECRET_TEST_32CHARS_ONLY';
const WEBHOOK_SECRET = 'MAYAR_WEBHOOK_SECRET_TEST_32CHARS_V2';

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

async function invokeHandler(
  handler: (req: any, res: any) => Promise<any>,
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
  } = {}
): Promise<MockRes> {
  const out: MockRes = { statusCode: 200, headers: {}, body: {} };
  const req = {
    method: options.method || 'GET',
    url: options.url || '/api/cron/mayar-reconcile',
    headers: options.headers || {},
    query: options.query || {},
    body: options.body ?? {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  const res = {
    setHeader(k: string, v: string) {
      out.headers[k.toLowerCase()] = v;
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

describe('Task 7.1.2.2 [RETIRED] — Mayar API V2 & Cron Decommission Audit', () => {
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...savedEnv };
    vi.restoreAllMocks();
  });

  it('1. Audit statis: api/ & vercel.json bebas dari pemanggilan aktif API Mayar maupun env MAYAR_*', () => {
    const apiFiles = [
      path.resolve(process.cwd(), 'api/activate-license.js'),
      path.resolve(process.cwd(), 'api/mayar-webhook.js'),
      path.resolve(process.cwd(), 'api/cron/mayar-reconcile.js'),
      path.resolve(process.cwd(), 'api/diagnostics/staging-redis.js'),
    ];
    for (const filePath of apiFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toMatch(/process\.env\.MAYAR_/);
      expect(content).not.toMatch(/https?:\/\/api\.mayar\./i);
      expect(content).not.toMatch(/\/hl\/v1\b|\/hl\/v2\b|\/saas\/v1\b|\/saas\/v2\b|\/software\/v1\b/i);
    }

    const vercelRaw = fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8');
    expect(vercelRaw).not.toContain('api.mayar.id');
    expect(vercelRaw).not.toContain('mayar-reconcile');
  });

  it('2. Stub API Mayar V2 dipensiunkan (MAYAR_DECOMMISSIONED, zero fetch) dan pure envelope parser tetap aman', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const cfg = resolveMayarApiV2Config();
    expect(cfg.ok).toBe(false);
    expect(cfg.retired).toBe(true);
    expect(cfg.reason).toBe('MAYAR_DECOMMISSIONED');

    const inv = await createMayarInvoiceViaApi();
    expect(inv.created).toBe(false);
    expect(inv.retired).toBe(true);
    expect(inv.reason).toBe('MAYAR_DECOMMISSIONED');

    const cor = await correlateMayarTransactionViaApi();
    expect(cor.ok).toBe(false);
    expect(cor.retired).toBe(true);
    expect(cor.reason).toBe('MAYAR_DECOMMISSIONED');

    const badEnv = parseMayarV2ResponseEnvelope({ ok: true, status: 200 }, { error: true, statusCode: 400 });
    expect(badEnv.ok).toBe(false);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('3. Cron GET /api/cron/mayar-reconcile tetap menegakkan guard method/query-secret/Bearer dan mengembalikan 410 Gone', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const postRes = await invokeHandler(cronReconcileHandler, { method: 'POST' });
    expect(postRes.statusCode).toBe(405);

    const querySecretRes = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: `/api/cron/mayar-reconcile?secret=${CRON_SECRET}`,
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(querySecretRes.statusCode).toBe(401);
    expect(querySecretRes.body.reason).toBe('QUERY_SECRET_FORBIDDEN');

    const noAuth = await invokeHandler(cronReconcileHandler, { method: 'GET' });
    expect(noAuth.statusCode).toBe(401);
    expect(noAuth.body.reason).toBe('UNAUTHORIZED_CRON');

    const webhookSecretAttempt = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      headers: { authorization: `Bearer ${WEBHOOK_SECRET}` },
    });
    expect(webhookSecretAttempt.statusCode).toBe(401);

    const authOkRetired = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(authOkRetired.statusCode).toBe(410);
    expect(authOkRetired.headers['cache-control']).toBe('no-store');
    expect(authOkRetired.body.retired).toBe(true);
    expect(authOkRetired.body.reason).toBe('MAYAR_DECOMMISSIONED');

    delete process.env.CRON_SECRET;
    const unsetSecretRetired = await invokeHandler(cronReconcileHandler, { method: 'GET' });
    expect(unsetSecretRetired.statusCode).toBe(410);
    expect(unsetSecretRetired.body.reason).toBe('MAYAR_DECOMMISSIONED');

    const whRetired = await invokeHandler(mayarWebhookHandler, {
      method: 'POST',
      url: '/api/mayar-webhook',
    });
    expect(whRetired.statusCode).toBe(410);
    expect(whRetired.body.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
