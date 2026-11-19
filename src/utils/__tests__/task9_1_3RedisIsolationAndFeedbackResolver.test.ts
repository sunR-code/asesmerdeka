import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRedisCredentials as getPrimaryRedisCredentials } from '../../../api/activate-license.js';
import feedbackHandler, {
  clearLocalFeedbackStore,
  getRedisCredentials as getFeedbackRedisCredentials,
} from '../../../api/feedback-reports.js';
import diagnosticsHandler from '../../../api/diagnostics/staging-redis.js';

const STAGING_REDIS_URL = 'https://asesmerdeka-staging.upstash.test';
const STAGING_REDIS_TOKEN = 'synthetic-staging-upstash-token-913';
const PROD_KV_URL = 'https://upstash-kv-sky-fountain.upstash.test';
const PROD_KV_TOKEN = 'synthetic-prod-kv-token-913';
const CRON_SECRET = 'synthetic-cron-secret-staging-32chars-913x';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

async function invokeApiHandler(
  handler: (req: unknown, res: unknown) => Promise<unknown>,
  opts: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
  } = {}
): Promise<MockResponse> {
  const out: MockResponse = { statusCode: 200, headers: {}, body: {} };
  const req = {
    method: opts.method || 'GET',
    url: opts.url || '/api/feedback-reports',
    headers: { ...(opts.headers || {}) },
    query: opts.query || {},
    body: opts.body,
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

class DualUpstashSimulator {
  stagingKv = new Map<string, string>();
  prodKv = new Map<string, string>();
  stagingCalls: Array<{ method: string; url: string; op?: string }> = [];
  prodCalls: Array<{ method: string; url: string; op?: string }> = [];
  outageOnStaging = false;
  httpErrorOnStaging = 0;

  async handleFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const isStaging = rawUrl.startsWith(STAGING_REDIS_URL);
    const isProd = rawUrl.startsWith(PROD_KV_URL);
    if (!isStaging && !isProd) {
      return new Response(JSON.stringify({ error: 'Unexpected host' }), { status: 404 });
    }

    const store = isStaging ? this.stagingKv : this.prodKv;
    const calls = isStaging ? this.stagingCalls : this.prodCalls;
    const expectedToken = isStaging ? STAGING_REDIS_TOKEN : PROD_KV_TOKEN;
    const headers = (init?.headers || {}) as Record<string, string>;

    if (headers.Authorization !== `Bearer ${expectedToken}`) {
      calls.push({ method: String(init?.method || 'GET'), url: rawUrl, op: 'AUTH_MISMATCH' });
      return new Response(JSON.stringify({ error: 'Unauthorized cross-db token mismatch' }), { status: 401 });
    }

    if (isStaging && this.outageOnStaging) {
      calls.push({ method: String(init?.method || 'GET'), url: rawUrl, op: 'OUTAGE' });
      throw new Error('Simulated Upstash network outage');
    }

    if (isStaging && this.httpErrorOnStaging) {
      calls.push({ method: String(init?.method || 'GET'), url: rawUrl, op: `HTTP_${this.httpErrorOnStaging}` });
      return new Response(JSON.stringify({ error: 'Simulated Redis 500' }), {
        status: this.httpErrorOnStaging,
      });
    }

    const base = isStaging ? STAGING_REDIS_URL : PROD_KV_URL;
    const suffix = rawUrl.slice(base.length);

    if (suffix === '' || suffix === '/') {
      const cmd = JSON.parse(String(init?.body || '[]')) as string[];
      const op = String(cmd[0] || '').toUpperCase();
      calls.push({ method: 'POST', url: rawUrl, op });
      if (op === 'PING') {
        return new Response(JSON.stringify({ result: 'PONG' }), { status: 200 });
      }
      if (op === 'SET') {
        store.set(String(cmd[1]), String(cmd[2] ?? ''));
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }
      if (op === 'GET') {
        const val = store.has(String(cmd[1])) ? store.get(String(cmd[1]))! : null;
        return new Response(JSON.stringify({ result: val }), { status: 200 });
      }
      if (op === 'DEL') {
        const deleted = store.delete(String(cmd[1])) ? 1 : 0;
        return new Response(JSON.stringify({ result: deleted }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
    }

    if (suffix.startsWith('/get/')) {
      const key = decodeURIComponent(suffix.slice('/get/'.length));
      calls.push({ method: 'GET', url: rawUrl, op: 'REST_GET' });
      const val = store.has(key) ? store.get(key)! : null;
      return new Response(JSON.stringify({ result: val }), { status: 200 });
    }

    if (suffix.startsWith('/set/')) {
      const key = decodeURIComponent(suffix.slice('/set/'.length).split('?')[0]);
      calls.push({ method: 'POST', url: rawUrl, op: 'REST_SET' });
      store.set(key, String(init?.body || ''));
      return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Unknown Redis path' }), { status: 400 });
  }
}

const ENV_KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'VERCEL_ENV',
  'VERCEL_GIT_COMMIT_REF',
  'VERCEL_GIT_COMMIT_SHA',
  'CRON_SECRET',
  'ADMIN_PIN',
] as const;

describe('Task 9.1.3 — Redis Isolation & Atomic Feedback Resolver Verification', () => {
  const savedEnv: Record<string, string | undefined> = {};
  let origFetch: typeof globalThis.fetch;
  let sim: DualUpstashSimulator;

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
    clearLocalFeedbackStore();
    origFetch = globalThis.fetch;
    sim = new DualUpstashSimulator();
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
      sim.handleFetch(input, init)) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it('1. Pasangan lengkap UPSTASH_REDIS_REST_* meng-override KV_REST_API_* di resolver utama & feedback-reports.js tanpa fallback ke Production DB', async () => {
    process.env.UPSTASH_REDIS_REST_URL = STAGING_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = STAGING_REDIS_TOKEN;
    process.env.KV_REST_API_URL = PROD_KV_URL;
    process.env.KV_REST_API_TOKEN = PROD_KV_TOKEN;

    const primaryCreds = getPrimaryRedisCredentials();
    const feedbackCreds = getFeedbackRedisCredentials();
    expect(primaryCreds).toEqual({
      url: STAGING_REDIS_URL,
      token: STAGING_REDIS_TOKEN,
      configured: true,
      source: 'UPSTASH_REDIS_REST_*',
    });
    expect(feedbackCreds).toEqual(primaryCreds);

    const postRes = await invokeApiHandler(feedbackHandler, {
      method: 'POST',
      body: {
        category: 'bug',
        description: 'Uji isolasi pasangan UPSTASH_REDIS_REST_* di feedback-reports',
      },
    });
    expect(postRes.statusCode).toBe(200);
    expect(postRes.body.ok).toBe(true);

    expect(sim.stagingCalls.length).toBeGreaterThanOrEqual(2);
    expect(sim.prodCalls.length).toBe(0);
    expect(sim.prodKv.size).toBe(0);
    expect(sim.stagingKv.has('asesmerdeka:feedback_reports:list')).toBe(true);
  });

  it('2. Anti-Mix Guard: pasangan parsial UPSTASH_REDIS_REST_* menolak mencampur URL & token dengan KV_REST_API_*', async () => {
    process.env.KV_REST_API_URL = PROD_KV_URL;
    process.env.KV_REST_API_TOKEN = PROD_KV_TOKEN;

    // Kasus A: hanya URL UPSTASH tanpa TOKEN
    process.env.UPSTASH_REDIS_REST_URL = STAGING_REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(getFeedbackRedisCredentials()).toEqual({
      url: '',
      token: '',
      configured: false,
      source: null,
    });
    expect(getFeedbackRedisCredentials()).toEqual(getPrimaryRedisCredentials());

    // Kasus B: hanya TOKEN UPSTASH tanpa URL
    delete process.env.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = STAGING_REDIS_TOKEN;
    expect(getFeedbackRedisCredentials()).toEqual({
      url: '',
      token: '',
      configured: false,
      source: null,
    });

    const postRes = await invokeApiHandler(feedbackHandler, {
      method: 'POST',
      body: {
        category: 'saran',
        description: 'Fallback memori aman tanpa memanggil Redis silang DB',
      },
    });
    expect(postRes.statusCode).toBe(200);
    expect(sim.stagingCalls.length).toBe(0);
    expect(sim.prodCalls.length).toBe(0);
  });

  it('3. Fallback KV_REST_API_* berjalan hanya saat kedua UPSTASH_REDIS_REST_* kosong, & mendukung CRUD Admin', async () => {
    process.env.KV_REST_API_URL = PROD_KV_URL;
    process.env.KV_REST_API_TOKEN = PROD_KV_TOKEN;
    process.env.ADMIN_PIN = '913913';

    expect(getFeedbackRedisCredentials()).toEqual({
      url: PROD_KV_URL,
      token: PROD_KV_TOKEN,
      configured: true,
      source: 'KV_REST_API_*',
    });

    const postRes = await invokeApiHandler(feedbackHandler, {
      method: 'POST',
      body: { category: 'akurasi', description: 'Uji fallback KV_REST_API_* lengkap' },
    });
    expect(postRes.statusCode).toBe(200);
    const createdId = (postRes.body.report as { id: string }).id;

    const getRes = await invokeApiHandler(feedbackHandler, {
      method: 'GET',
      headers: { 'x-admin-pin': '913913' },
    });
    expect(getRes.statusCode).toBe(200);
    expect(Array.isArray(getRes.body.reports)).toBe(true);
    expect((getRes.body.reports as Array<{ id: string }>).some((r) => r.id === createdId)).toBe(true);
    expect(sim.prodCalls.length).toBeGreaterThanOrEqual(2);
    expect(sim.stagingCalls.length).toBe(0);
  });

  it('4. Redis Outage & Error Handling: outage / HTTP 500 pada feedback-reports tidak memicu crash atau jatuh ke DB lain', async () => {
    process.env.UPSTASH_REDIS_REST_URL = STAGING_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = STAGING_REDIS_TOKEN;
    process.env.KV_REST_API_URL = PROD_KV_URL;
    process.env.KV_REST_API_TOKEN = PROD_KV_TOKEN;
    process.env.ADMIN_PIN = '913913';

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sim.outageOnStaging = true;

    const postOutage = await invokeApiHandler(feedbackHandler, {
      method: 'POST',
      body: { category: 'error', description: 'Laporan saat Redis gangguan jaringan' },
    });
    expect(postOutage.statusCode).toBe(200);
    expect(postOutage.body.ok).toBe(true);
    expect(sim.prodCalls.length).toBe(0);

    sim.outageOnStaging = false;
    sim.httpErrorOnStaging = 500;
    const getHttp500 = await invokeApiHandler(feedbackHandler, {
      method: 'GET',
      headers: { 'x-admin-pin': '913913' },
    });
    expect(getHttp500.statusCode).toBe(200);
    expect((getHttp500.body.reports as Array<{ description: string }>)[0]?.description).toContain(
      'Laporan saat Redis gangguan'
    );
    expect(sim.prodCalls.length).toBe(0);
    expect(errSpy).toHaveBeenCalled();
  });

  it('5. Preview /api/diagnostics/staging-redis memakai asesmerdeka-staging (UPSTASH_*), PING/SET/GET/DEL sukses, & 0 akses ke upstash-kv-sky-fountain', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.VERCEL_GIT_COMMIT_SHA = '49edb8ae8a9c154d05cfd9a4e6d9e40589ff0ee9';
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.UPSTASH_REDIS_REST_URL = STAGING_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = STAGING_REDIS_TOKEN;
    process.env.KV_REST_API_URL = PROD_KV_URL;
    process.env.KV_REST_API_TOKEN = PROD_KV_TOKEN;

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const diagRes = await invokeApiHandler(diagnosticsHandler, {
      method: 'GET',
      url: '/api/diagnostics/staging-redis',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });

    expect(diagRes.statusCode).toBe(200);
    expect(diagRes.body.ok).toBe(true);
    expect(diagRes.body.environment).toBe('preview');
    expect(diagRes.body.branch).toBe('staging');
    expect(diagRes.body.redisCredentialSource).toBe('UPSTASH_REDIS_REST_*');

    const checks = diagRes.body.checks as Record<string, Record<string, unknown>>;
    expect(checks.ping.passed).toBe(true);
    expect(checks.ping.reply).toBe('PONG');
    expect(checks.setWithTtl.passed).toBe(true);
    expect(checks.getAndMatch.passed).toBe(true);
    expect(checks.deleteKey.passed).toBe(true);
    expect(checks.confirmDeleted.passed).toBe(true);
    expect(checks.confirmDeleted.valueAfterDelete).toBeNull();

    // Key diagnostik terhapus tuntas & 0 perintah menyentuh database Production (KV_REST_API_*)
    expect(sim.stagingKv.size).toBe(0);
    expect(sim.stagingCalls.map((c) => c.op)).toEqual(['PING', 'SET', 'GET', 'DEL', 'GET']);
    expect(sim.prodCalls.length).toBe(0);
    expect(infoSpy).toHaveBeenCalled();
  });
});
