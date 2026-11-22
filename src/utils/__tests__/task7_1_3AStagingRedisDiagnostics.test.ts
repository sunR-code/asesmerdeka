import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import diagnosticsHandler from '../../../api/diagnostics/staging-redis.js';
import cronReconcileHandler from '../../../api/cron/mayar-reconcile.js';

const CRON_SECRET = 'synthetic-cron-secret-staging-32chars-713a';
const WEBHOOK_SECRET = 'synthetic-webhook-secret-other-32chars-713a';
const REDIS_URL = 'https://staging-mock-redis.upstash.test';
const REDIS_TOKEN = 'synthetic-upstash-staging-token-do-not-leak';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

async function invokeHandler(
  handler: (req: unknown, res: unknown) => Promise<unknown>,
  opts: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  } = {}
): Promise<MockResponse> {
  const out: MockResponse = { statusCode: 200, headers: {}, body: {} };
  const req = {
    method: opts.method || 'GET',
    url: opts.url || '/api/diagnostics/staging-redis',
    headers: { ...(opts.headers || {}) },
    query: opts.query || {},
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
  };
  await handler(req, res);
  return out;
}

class UpstashDiagnosticSimulator {
  kv = new Map<string, { value: string; ttlSeconds: number | null }>();
  commands: string[][] = [];
  outageMode = false;
  corruptGetOnce = false;
  keepAfterDel = false;
  forcedHttpStatusByOp: Record<string, number> = {};
  forcedResultByOp: Record<string, unknown> = {};
  timeoutOps = new Set<string>();

  async handleFetch(url: string, init?: RequestInit): Promise<Response> {
    if (url !== REDIS_URL) {
      return new Response(JSON.stringify({ error: 'Unexpected endpoint' }), { status: 404 });
    }
    if (this.outageMode) {
      throw new Error(`connect ECONNREFUSED ${REDIS_URL} token=${REDIS_TOKEN}`);
    }
    const headers = (init?.headers || {}) as Record<string, string>;
    if (headers.Authorization !== `Bearer ${REDIS_TOKEN}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const cmd = JSON.parse(String(init?.body || '[]')) as string[];
    this.commands.push(cmd);
    const op = String(cmd[0] || '').toUpperCase();

    if (this.timeoutOps.has(op)) {
      const timeoutErr = new Error(`Request timed out contacting ${REDIS_URL} with ${REDIS_TOKEN}`);
      timeoutErr.name = 'AbortError';
      throw timeoutErr;
    }

    if (this.forcedHttpStatusByOp[op]) {
      const code = this.forcedHttpStatusByOp[op];
      return new Response(
        JSON.stringify({ error: `Upstream rejected ${op} token=${REDIS_TOKEN}` }),
        { status: code }
      );
    }

    if (Object.prototype.hasOwnProperty.call(this.forcedResultByOp, op)) {
      return new Response(JSON.stringify({ result: this.forcedResultByOp[op] }), { status: 200 });
    }

    if (op === 'PING') {
      return new Response(JSON.stringify({ result: 'PONG' }), { status: 200 });
    }
    if (op === 'SET') {
      const key = String(cmd[1] || '');
      const val = String(cmd[2] || '');
      const ttl = cmd[3] === 'EX' ? Number(cmd[4] || 0) : null;
      this.kv.set(key, { value: val, ttlSeconds: ttl });
      return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
    }
    if (op === 'GET') {
      const key = String(cmd[1] || '');
      if (this.corruptGetOnce) {
        this.corruptGetOnce = false;
        return new Response(JSON.stringify({ result: 'CORRUPTED_VALUE' }), { status: 200 });
      }
      const entry = this.kv.get(key);
      return new Response(JSON.stringify({ result: entry ? entry.value : null }), { status: 200 });
    }
    if (op === 'DEL') {
      const key = String(cmd[1] || '');
      if (this.keepAfterDel) {
        return new Response(JSON.stringify({ result: 1 }), { status: 200 });
      }
      const deleted = this.kv.delete(key) ? 1 : 0;
      return new Response(JSON.stringify({ result: deleted }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: `Unsupported command ${op}` }), { status: 400 });
  }
}

describe('Task 7.1.3A — Staging Redis Diagnostics Endpoint & Security Guards', () => {
  const originalFetch = globalThis.fetch;
  const envBackup = { ...process.env };
  let sim: UpstashDiagnosticSimulator;

  beforeEach(() => {
    sim = new UpstashDiagnosticSimulator();
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.VERCEL_GIT_COMMIT_SHA = '255fc55fa5bccfc55c91ad190f3fc5da52042390';
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.MAYAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REDIS_TOKEN;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      return sim.handleFetch(String(input), init);
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...envBackup };
    vi.restoreAllMocks();
  });

  it('1. Environment guard selalu mengembalikan HTTP 404 di Production maupun environment non-preview', async () => {
    process.env.VERCEL_ENV = 'production';
    const prodRes = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(prodRes.statusCode).toBe(404);
    expect(sim.commands).toHaveLength(0);

    delete process.env.VERCEL_ENV;
    const unsetRes = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(unsetRes.statusCode).toBe(404);

    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'main';
    const wrongBranchRes = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(wrongBranchRes.statusCode).toBe(403);
    expect(wrongBranchRes.body.reason).toBe('BRANCH_NOT_ALLOWED');
  });

  it('2. Autentikasi menolak permintaan tanpa Bearer CRON_SECRET, secret salah, MAYAR_WEBHOOK_SECRET, & query string', async () => {
    const noAuth = await invokeHandler(diagnosticsHandler);
    expect(noAuth.statusCode).toBe(401);

    const wrongAuth = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: 'Bearer wrong-secret-token' },
    });
    expect(wrongAuth.statusCode).toBe(401);

    const webhookAuth = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${WEBHOOK_SECRET}` },
    });
    expect(webhookAuth.statusCode).toBe(401);

    const queryAuth = await invokeHandler(diagnosticsHandler, {
      url: `/api/diagnostics/staging-redis?token=${CRON_SECRET}`,
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(queryAuth.statusCode).toBe(401);
    expect(queryAuth.body.reason).toBe('QUERY_SECRET_FORBIDDEN');

    delete process.env.CRON_SECRET;
    const unconfigured = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(unconfigured.statusCode).toBe(503);
    expect(unconfigured.body.reason).toBe('CRON_SECRET_NOT_CONFIGURED');
    expect(sim.commands).toHaveLength(0);
  });

  it('3. Live probe sukses menjalankan PING, SET (TTL 30s), GET match, DEL, konfirmasi terhapus, dan nol kebocoran secret', async () => {
    // Seed sentinel academic/production-like keys in simulator to ensure diagnostics never touches them
    sim.kv.set('asesmerdeka:mayar:order:v1:SENTINEL', { value: '{"keep":true}', ttlSeconds: null });

    const res = await invokeHandler(diagnosticsHandler, {
      method: 'GET',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.environment).toBe('preview');
    expect(res.body.branch).toBe('staging');
    expect(res.body.commitShaShort).toBe('255fc55');
    expect(res.body.redisCredentialsConfigured).toBe(true);
    expect(res.body.redisCredentialSource).toBe('UPSTASH_REDIS_REST_*');

    const usedKey = String(res.body.diagnosticKeyUsed || '');
    expect(usedKey.startsWith('asesmerdeka:staging:diagnostics:')).toBe(true);
    expect(sim.kv.has(usedKey)).toBe(false);
    expect(sim.kv.get('asesmerdeka:mayar:order:v1:SENTINEL')?.value).toBe('{"keep":true}');

    const ops = sim.commands.map((c) => c[0]);
    expect(ops).toEqual(['PING', 'SET', 'GET', 'DEL', 'GET']);
    expect(sim.commands[1][3]).toBe('EX');
    expect(sim.commands[1][4]).toBe('30');

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(REDIS_URL);
    expect(serialized).not.toContain(REDIS_TOKEN);
    expect(serialized).not.toContain(CRON_SECRET);
    expect(serialized).not.toContain('SENTINEL');
  });

  it('4. Kegagalan Redis atau GET mismatch tetap membersihkan key sementara dan tidak membocorkan kredensial', async () => {
    sim.corruptGetOnce = true;
    const mismatchRes = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(mismatchRes.statusCode).toBe(502);
    expect(mismatchRes.body.reason).toBe('REDIS_VALUE_MISMATCH');
    expect(mismatchRes.body.stage).toBe('redis_compare');
    expect(sim.kv.size).toBe(0);
    expect(sim.commands.map((c) => c[0])).toEqual(['PING', 'SET', 'GET', 'DEL']);

    sim.outageMode = true;
    const outageRes = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(outageRes.statusCode).toBe(503);
    expect(outageRes.body.reason).toBe('REDIS_PING_FAILED');
    expect(outageRes.body.stage).toBe('redis_ping');
    const serializedOutage = JSON.stringify(outageRes.body);
    expect(serializedOutage).not.toContain(REDIS_URL);
    expect(serializedOutage).not.toContain(REDIS_TOKEN);

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const missingEnvRes = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(missingEnvRes.statusCode).toBe(503);
    expect(missingEnvRes.body.reason).toBe('REDIS_CREDENTIALS_NOT_CONFIGURED');
    expect(missingEnvRes.body.redisCredentialsConfigured).toBe(false);
  });

  it('5. Endpoint cron mayar-reconcile yang dipensiunkan mengembalikan HTTP 410 Gone tanpa menyentuh Redis/Mayar meski env Upstash kosong di produksi', async () => {
    process.env.VERCEL_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const cronRes = await invokeHandler(cronReconcileHandler, {
      method: 'GET',
      url: '/api/cron/mayar-reconcile',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(cronRes.statusCode).toBe(410);
    expect(cronRes.body.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(cronRes.body.retired).toBe(true);
    expect(sim.commands).toHaveLength(0);
  });

  it('6. Skema redis:// non-HTTPS dan pasangan UPSTASH parsial ditolak sebelum fetch (tidak cross-fallback KV_*)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Case A: redis:// TCP URL instead of https:// REST URL
    process.env.UPSTASH_REDIS_REST_URL = 'redis://default:tcp-secret@example.upstash.io:6379';
    const tcpSchemeRes = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(tcpSchemeRes.statusCode).toBe(503);
    expect(tcpSchemeRes.body.reason).toBe('REDIS_CREDENTIALS_NOT_CONFIGURED');
    expect(tcpSchemeRes.body.stage).toBe('redis_url_check');
    expect(tcpSchemeRes.body.urlScheme).toBe('redis:');
    expect(sim.commands).toHaveLength(0);

    // Case B: partial UPSTASH pair with KV_REST_API_* present must NOT silently mask missing Upstash token
    process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.KV_REST_API_URL = 'https://kv-should-not-mask.upstash.test';
    process.env.KV_REST_API_TOKEN = 'kv-token-should-not-mask';

    const partialRes = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(partialRes.statusCode).toBe(503);
    expect(partialRes.body.reason).toBe('REDIS_CREDENTIALS_NOT_CONFIGURED');
    expect(partialRes.body.stage).toBe('redis_credentials_check');
    expect(partialRes.body.redisCredentialsConfigured).toBe(false);
    expect(partialRes.body.hasUpstashRestUrl).toBe(true);
    expect(partialRes.body.hasUpstashRestToken).toBe(false);

    const logText = errSpy.mock.calls.flat().join('\n');
    expect(logText).not.toContain('tcp-secret');
    expect(logText).not.toContain(REDIS_URL);
    expect(logText).not.toContain(CRON_SECRET);
  });

  it('7. Upstash HTTP 401/403 mengembalikan 503 REDIS_PING_FAILED dan log terstruktur tanpa secret', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    for (const upstreamStatus of [401, 403]) {
      sim.forcedHttpStatusByOp = { PING: upstreamStatus };
      const res = await invokeHandler(diagnosticsHandler, {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      expect(res.statusCode).toBe(503);
      expect(res.body.reason).toBe('REDIS_PING_FAILED');
      expect(res.body.stage).toBe('redis_ping');
      expect(res.body.upstreamHttpStatus).toBe(upstreamStatus);
      expect(res.body.safeErrorCode).toBe(`UPSTREAM_HTTP_${upstreamStatus}`);

      const combined = JSON.stringify(res.body) + errSpy.mock.calls.flat().join('\n');
      expect(combined).not.toContain(REDIS_URL);
      expect(combined).not.toContain(REDIS_TOKEN);
      expect(combined).not.toContain(CRON_SECRET);
    }
  });

  it('8. Upstash timeout mengembalikan 503 dengan safeErrorCode ETIMEDOUT dan stage spesifik', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sim.timeoutOps.add('PING');

    const res = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.statusCode).toBe(503);
    expect(res.body.reason).toBe('REDIS_PING_FAILED');
    expect(res.body.stage).toBe('redis_ping');
    expect(res.body.safeErrorCode).toBe('ETIMEDOUT');

    const combined = JSON.stringify(res.body) + errSpy.mock.calls.flat().join('\n');
    expect(combined).not.toContain(REDIS_URL);
    expect(combined).not.toContain(REDIS_TOKEN);
    expect(combined).not.toContain(CRON_SECRET);
  });

  it('9. PING berhasil lalu SET gagal (upstream 500 atau non-OK) mengembalikan REDIS_SET_FAILED', async () => {
    sim.forcedHttpStatusByOp = { SET: 500 };
    const upstreamFail = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(upstreamFail.statusCode).toBe(503);
    expect(upstreamFail.body.reason).toBe('REDIS_SET_FAILED');
    expect(upstreamFail.body.stage).toBe('redis_set');
    expect(upstreamFail.body.upstreamHttpStatus).toBe(500);
    expect(sim.commands.map((c) => c[0])).toEqual(['PING', 'SET']);

    sim.commands = [];
    sim.forcedHttpStatusByOp = {};
    sim.forcedResultByOp = { SET: 'ERR_NOT_OK' };
    const badReply = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(badReply.statusCode).toBe(502);
    expect(badReply.body.reason).toBe('REDIS_SET_FAILED');
    expect(badReply.body.stage).toBe('redis_set');
  });

  it('10. GET gagal upstream mengembalikan 503 REDIS_GET_FAILED dan finally cleanup tetap menghapus key', async () => {
    sim.forcedHttpStatusByOp = { GET: 502 };
    const res = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.statusCode).toBe(503);
    expect(res.body.reason).toBe('REDIS_GET_FAILED');
    expect(res.body.stage).toBe('redis_get');
    expect(res.body.upstreamHttpStatus).toBe(502);
    expect(sim.kv.size).toBe(0);
    expect(sim.commands.map((c) => c[0])).toEqual(['PING', 'SET', 'GET', 'DEL']);
  });

  it('11. DEL gagal (count !== 1 atau key masih terbaca) mengembalikan 502 REDIS_DELETE_FAILED', async () => {
    sim.forcedResultByOp = { DEL: 0 };
    const zeroDel = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(zeroDel.statusCode).toBe(502);
    expect(zeroDel.body.reason).toBe('REDIS_DELETE_FAILED');
    expect(zeroDel.body.stage).toBe('redis_del');

    sim.commands = [];
    sim.forcedResultByOp = {};
    sim.keepAfterDel = true;
    const leftover = await invokeHandler(diagnosticsHandler, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(leftover.statusCode).toBe(502);
    expect(leftover.body.reason).toBe('REDIS_DELETE_FAILED');
    expect(leftover.body.stage).toBe('redis_confirm_deleted');
  });

  it('12. Internal exception tak terduga mengembalikan 500 DIAGNOSTIC_INTERNAL_ERROR dengan nol kebocoran secret', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const faultyReq: Record<string, unknown> = {
      method: 'GET',
      url: '/api/diagnostics/staging-redis',
      query: {},
    };
    Object.defineProperty(faultyReq, 'headers', {
      get() {
        throw new Error(`Unexpected crash url=${REDIS_URL} token=${REDIS_TOKEN} cron=${CRON_SECRET}`);
      },
    });
    const out: MockResponse = { statusCode: 200, headers: {}, body: {} };
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
    };

    await diagnosticsHandler(faultyReq as never, res as never);

    expect(out.statusCode).toBe(500);
    expect(out.body.reason).toBe('DIAGNOSTIC_INTERNAL_ERROR');
    expect(out.body.stage).toBe('auth_check');
    const serialized = JSON.stringify(out.body) + errSpy.mock.calls.flat().join('\n');
    expect(serialized).not.toContain(REDIS_URL);
    expect(serialized).not.toContain(REDIS_TOKEN);
    expect(serialized).not.toContain(CRON_SECRET);
  });
});
