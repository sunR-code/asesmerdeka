import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error serverless JS tested directly
import activateLicenseHandler, {
  REGISTRY_REDIS_KEY,
  generateStagingLicenseCode,
  getRedisCredentials,
  isStagingLicenseCode,
  localLicenseRegistryStore,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  localStagingRevokedLicensesSet,
  resolveLicenseRuntimeEnvironment,
  resolveStagingGitBranch,
  validateLicenseEnvironmentBoundary,
  validateStagingBranchContext,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS tested directly
import adminPortalHandler, {
  clearAdminPortalRateLimitStore,
} from '../../../api/admin-portal.js';

const TEST_STAGING_SECRET = 'Stg12442_SecretKey_BranchIsolation_AtLeast32Chars!';
const TEST_ADMIN_PIN = 'ADM12442!';
const STAGING_UPSTASH_URL = 'https://asesmerdeka-staging.upstash.test';
const STAGING_UPSTASH_TOKEN = 'synthetic-staging-upstash-token-12442';
const PROD_KV_URL = 'https://prod-kv-sky-fountain.upstash.test';
const PROD_KV_TOKEN = 'synthetic-prod-kv-token-12442';

async function callHandler(
  handlerFn: (req: Record<string, unknown>, res: Record<string, unknown>) => Promise<unknown>,
  method: string,
  body: Record<string, unknown> = {},
  headers: Record<string, string> = {},
  query: Record<string, string> = {}
) {
  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  const responseHeaders: Record<string, string> = {};
  const req = {
    method,
    headers: { 'x-forwarded-for': '127.0.0.42', ...headers },
    body,
    query,
  };
  const res = {
    setHeader(k: string, v: string) {
      responseHeaders[k] = v;
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      responseBody = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  await handlerFn(req, res);
  return { statusCode, body: responseBody, headers: responseHeaders };
}

function clearTestState() {
  localSeatMemoryStore.clear();
  localLicenseRegistryStore.length = 0;
  localRevokedLicensesSet.clear();
  localStagingRevokedLicensesSet.clear();
  clearAdminPortalRateLimitStore();
}

describe('Task 12.4.4.2 — Staging Branch Detection Hardening & Registry Isolation', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearTestState();
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_REGION;
    delete process.env.VERCEL_GIT_COMMIT_REF;
    delete process.env.NODE_ENV;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.ADMIN_PIN = TEST_ADMIN_PIN;
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
  });

  afterEach(() => {
    clearTestState();
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. Matrix (Preview, staging) -> Allowed untuk cetak dan verifikasi lisensi ASM-STG2-*', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.NODE_ENV = 'production';

    expect(resolveLicenseRuntimeEnvironment()).toBe('preview');
    expect(resolveStagingGitBranch()).toBe('staging');

    const ctx = validateStagingBranchContext();
    expect(ctx.allowed).toBe(true);
    expect(ctx.gitBranch).toBe('staging');
    expect(ctx.isLocalMode).toBe(false);

    const createRes = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'create_license',
      planType: 'pro',
      label: 'QA TASK 12.4.4.2 — STAGING ONLY',
      customMaxSeats: 1,
      count: 1,
    });
    expect(createRes.statusCode).toBe(200);
    expect(createRes.body.ok).toBe(true);
    const createdList = createRes.body.created as Array<{ code: string; maxSeats: number; environment: string }>;
    expect(createdList.length).toBe(1);
    expect(isStagingLicenseCode(createdList[0].code)).toBe(true);
    expect(createdList[0].code.startsWith('ASM-STG2-')).toBe(true);
    expect(createdList[0].environment).toBe('staging');
    expect(createdList[0].maxSeats).toBe(1);

    const verifyRes = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: createdList[0].code,
      deviceId: 'DEV-12442-STG',
    });
    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
  });

  it('2. Matrix (Preview, main) -> Denied 403 STAGING_BRANCH_MISMATCH dengan pesan diagnostik akurat', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    const validStg2 = generateStagingLicenseCode('GP26', 'MAINMISMATCH');

    process.env.VERCEL_GIT_COMMIT_REF = 'main';
    process.env.NODE_ENV = 'production';

    const ctx = validateStagingBranchContext();
    expect(ctx.allowed).toBe(false);
    expect(ctx.status).toBe(403);
    expect(ctx.reason).toBe('STAGING_BRANCH_MISMATCH');
    expect(ctx.gitBranch).toBe('main');
    expect(ctx.message).toContain(
      "Operasi lisensi staging pada Preview hanya diizinkan pada branch 'staging' (terdeteksi 'main')."
    );
    expect(ctx.message).toContain('asesmerdeka-git-staging-sun-r.vercel.app');

    const createRes = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'create_license',
      planType: 'pro',
      label: 'Must Be Blocked on Main Preview',
    });
    expect(createRes.statusCode).toBe(403);
    expect(createRes.body.ok).toBe(false);
    expect(createRes.body.errorCode).toBe('STAGING_BRANCH_MISMATCH');

    const verifyRes = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: validStg2,
      deviceId: 'DEV-12442-MAIN',
    });
    expect(verifyRes.statusCode).toBe(403);
    expect(verifyRes.body.reason).toBe('STAGING_BRANCH_MISMATCH');
  });

  it('3. Matrix (Preview, other branches) -> Denied 403 STAGING_BRANCH_MISMATCH', async () => {
    for (const branch of ['feature/x', 'dev', 'release/1.0', 'hotfix/license']) {
      process.env.VERCEL_ENV = 'preview';
      process.env.VERCEL_GIT_COMMIT_REF = branch;

      const ctx = validateStagingBranchContext();
      expect(ctx.allowed, branch).toBe(false);
      expect(ctx.status, branch).toBe(403);
      expect(ctx.reason, branch).toBe('STAGING_BRANCH_MISMATCH');
      expect(ctx.gitBranch, branch).toBe(branch);

      const createRes = await callHandler(adminPortalHandler, 'POST', {
        adminPin: TEST_ADMIN_PIN,
        action: 'create_license',
        planType: 'individu',
      });
      expect(createRes.statusCode, branch).toBe(403);
      expect(createRes.body.errorCode, branch).toBe('STAGING_BRANCH_MISMATCH');
    }
  });

  it('4. Matrix (Production, main) & (Production, staging) -> Denied untuk operasi lisensi staging', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    const validStg2 = generateStagingLicenseCode('GP26', 'PRODBLOCK');

    for (const branch of ['main', 'staging']) {
      process.env.VERCEL_ENV = 'production';
      process.env.VERCEL_GIT_COMMIT_REF = branch;
      process.env.NODE_ENV = 'production';

      const ctx = validateStagingBranchContext();
      expect(ctx.allowed, branch).toBe(false);
      expect(ctx.reason, branch).toBe('STAGING_SIGNING_FORBIDDEN_IN_PRODUCTION');
      expect(() => generateStagingLicenseCode('GP26', 'PRODERR'), branch).toThrow();

      const adminCreateStg = await callHandler(adminPortalHandler, 'POST', {
        adminPin: TEST_ADMIN_PIN,
        action: 'create_license',
        planType: 'pro',
        targetEnvironment: 'staging',
      });
      expect(adminCreateStg.statusCode, branch).toBe(403);
      expect(adminCreateStg.body.errorCode, branch).toBe('STAGING_SIGNING_FORBIDDEN_IN_PRODUCTION');

      const verifyRes = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: validStg2,
        deviceId: 'DEV-PROD-BLOCK',
      });
      expect(verifyRes.statusCode, branch).toBe(403);
      expect(verifyRes.body.reason, branch).toBe('STAGING_LICENSE_FORBIDDEN_IN_PRODUCTION');
    }
  });

  it('5. Matrix (Unknown, Unknown) & Vercel marker tanpa VERCEL_ENV -> Fail-closed (bukan local/main)', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    const validStg2 = generateStagingLicenseCode('GM26', 'UNKNOWNFAIL');

    const unknownConfigs = [
      { VERCEL_ENV: 'unknown', VERCEL_GIT_COMMIT_REF: '' },
      { VERCEL_ENV: 'custom-stage', VERCEL_GIT_COMMIT_REF: 'unknown' },
      { VERCEL: '1', VERCEL_URL: 'asesmerdeka-test.vercel.app', VERCEL_ENV: '', VERCEL_GIT_COMMIT_REF: '' },
    ];

    for (const cfg of unknownConfigs) {
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;
      delete process.env.VERCEL_URL;
      delete process.env.VERCEL_GIT_COMMIT_REF;
      if (cfg.VERCEL) process.env.VERCEL = cfg.VERCEL;
      if (cfg.VERCEL_URL) process.env.VERCEL_URL = cfg.VERCEL_URL;
      if (cfg.VERCEL_ENV) process.env.VERCEL_ENV = cfg.VERCEL_ENV;
      if (cfg.VERCEL_GIT_COMMIT_REF) process.env.VERCEL_GIT_COMMIT_REF = cfg.VERCEL_GIT_COMMIT_REF;

      expect(resolveLicenseRuntimeEnvironment()).toBe('unknown');
      expect(resolveStagingGitBranch()).toBe(cfg.VERCEL_GIT_COMMIT_REF || 'unknown');

      const ctx = validateStagingBranchContext();
      expect(ctx.allowed).toBe(false);
      expect(ctx.status).toBe(403);
      expect(ctx.reason).toBe('UNVERIFIED_STAGING_RUNTIME_ENVIRONMENT');

      const boundary = validateLicenseEnvironmentBoundary(validStg2);
      expect(boundary.allowed).toBe(false);
      expect(boundary.status).toBe(403);

      expect(() => generateStagingLicenseCode('GM26', 'UNVERIFIED')).toThrow();

      const adminCreate = await callHandler(adminPortalHandler, 'POST', {
        adminPin: TEST_ADMIN_PIN,
        action: 'create_license',
        planType: 'pro',
      });
      expect(adminCreate.statusCode).toBe(403);
      expect(adminCreate.body.errorCode).toBe('UNVERIFIED_STAGING_RUNTIME_ENVIRONMENT');
      expect(adminCreate.body.forbiddenEnvironment).toBe(true);
    }
  });

  it('6. Matrix (Preview, missing/empty/unknown branch) -> Fail-closed & resolveStagingGitBranch memakai "unknown" (bukan "main")', async () => {
    process.env.VERCEL_ENV = 'preview';
    for (const rawBranch of [undefined, '', '   ', 'unknown', 'UNKNOWN']) {
      if (rawBranch === undefined) delete process.env.VERCEL_GIT_COMMIT_REF;
      else process.env.VERCEL_GIT_COMMIT_REF = rawBranch;

      const resolved = resolveStagingGitBranch();
      expect(resolved).not.toBe('main');
      if (!rawBranch || !rawBranch.trim()) {
        expect(resolved).toBe('unknown');
      }

      const ctx = validateStagingBranchContext();
      expect(ctx.allowed).toBe(false);
      expect(ctx.status).toBe(403);
      expect(ctx.reason).toBe('MISSING_STAGING_BRANCH_METADATA');
      expect(ctx.gitBranch).toBe('unknown');

      const adminCreate = await callHandler(adminPortalHandler, 'POST', {
        adminPin: TEST_ADMIN_PIN,
        action: 'create_license',
        planType: 'pro',
      });
      expect(adminCreate.statusCode).toBe(403);
      expect(adminCreate.body.errorCode).toBe('MISSING_STAGING_BRANCH_METADATA');
    }
  });

  it('7. Anti-Spoofing & Auth Guard: input request (body, query, header, domain) tidak dapat memalsukan branch & non-admin ditolak 403', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'main';

    const spoofAttempt = await callHandler(
      adminPortalHandler,
      'POST',
      {
        adminPin: TEST_ADMIN_PIN,
        action: 'create_license',
        planType: 'pro',
        gitBranch: 'staging',
        branch: 'staging',
        VERCEL_GIT_COMMIT_REF: 'staging',
        runtimeEnv: 'local',
        targetEnvironment: 'staging',
      },
      {
        host: 'asesmerdeka-git-staging-sun-r.vercel.app',
        'x-forwarded-host': 'asesmerdeka-git-staging-sun-r.vercel.app',
        'x-git-branch': 'staging',
        'x-vercel-git-commit-ref': 'staging',
      },
      {
        branch: 'staging',
        gitBranch: 'staging',
      }
    );
    expect(spoofAttempt.statusCode).toBe(403);
    expect(spoofAttempt.body.errorCode).toBe('STAGING_BRANCH_MISMATCH');

    // Sekarang berada di Preview + staging, tetapi tanpa PIN / PIN salah harus tetap ditolak 403
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    const noAuth = await callHandler(adminPortalHandler, 'POST', {
      action: 'create_license',
      planType: 'pro',
    });
    expect(noAuth.statusCode).toBe(403);

    const wrongPin = await callHandler(adminPortalHandler, 'POST', {
      adminPin: '000000',
      action: 'create_license',
      planType: 'pro',
    });
    expect(wrongPin.statusCode).toBe(403);
  });

  it('8. Registry Storage Isolation: penulisan staging tidak menimpa record Production & Redis memakai UPSTASH_REDIS_REST_* terpisah', async () => {
    const stagingStore = new Map<string, string>();
    const prodCalls: string[] = [];
    const stagingCalls: string[] = [];

    // Simulasikan bila Preview memiliki kedua pasangan env vars dan pre-existing record Production di store
    const preExistingProdRecord = {
      code: 'ASM-GP26-PRODTEST-99999999',
      label: 'Production Existing Customer',
      planType: 'pro',
      tier: 'pro',
      environment: 'production',
      maxSeats: 2,
      status: 'aktif',
      lifecycleState: 'active',
    };
    stagingStore.set(REGISTRY_REDIS_KEY, JSON.stringify([preExistingProdRecord]));

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith(PROD_KV_URL)) {
        prodCalls.push(url);
        return new Response(JSON.stringify({ error: 'PROD KV should not be touched' }), { status: 500 });
      }
      if (!url.startsWith(STAGING_UPSTASH_URL)) {
        return new Response(JSON.stringify({ error: 'Unknown Redis URL' }), { status: 404 });
      }

      const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (authHeader !== `Bearer ${STAGING_UPSTASH_TOKEN}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      stagingCalls.push(url);
      const suffix = url.slice(STAGING_UPSTASH_URL.length);
      if (suffix.startsWith('/get/')) {
        const key = decodeURIComponent(suffix.slice('/get/'.length));
        return new Response(JSON.stringify({ result: stagingStore.get(key) ?? null }), { status: 200 });
      }
      if (suffix.startsWith('/set/')) {
        const key = decodeURIComponent(suffix.slice('/set/'.length).split('?')[0]);
        stagingStore.set(key, String(init?.body || ''));
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'Unsupported path' }), { status: 400 });
    }) as typeof fetch;

    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.UPSTASH_REDIS_REST_URL = STAGING_UPSTASH_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = STAGING_UPSTASH_TOKEN;
    process.env.KV_REST_API_URL = PROD_KV_URL;
    process.env.KV_REST_API_TOKEN = PROD_KV_TOKEN;

    const creds = getRedisCredentials();
    expect(creds.configured).toBe(true);
    expect(creds.url).toBe(STAGING_UPSTASH_URL);
    expect(creds.source).toBe('UPSTASH_REDIS_REST_*');

    const createRes = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'create_license',
      planType: 'pro',
      label: 'QA TASK 12.4.4.2 — STAGING ONLY',
      customMaxSeats: 1,
      count: 1,
    });
    expect(createRes.statusCode).toBe(200);
    const createdCode = (createRes.body.created as Array<{ code: string }>)[0].code;

    expect(prodCalls.length).toBe(0);
    expect(stagingCalls.length).toBeGreaterThan(0);

    // Pastikan preExistingProdRecord TIDAK tertimpa / terhapus dari REGISTRY_REDIS_KEY
    const rawSavedRegistry = JSON.parse(stagingStore.get(REGISTRY_REDIS_KEY) || '[]') as Array<{
      code: string;
      environment?: string;
    }>;
    expect(rawSavedRegistry.some((item) => item.code === createdCode)).toBe(true);
    expect(rawSavedRegistry.some((item) => item.code === preExistingProdRecord.code)).toBe(true);

    // Pastikan list_licenses di Preview hanya menampilkan staging
    const previewListRes = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'list_licenses',
    });
    expect(previewListRes.statusCode).toBe(200);
    const previewCodes = (previewListRes.body.licenses as Array<{ code: string }>).map((l) => l.code);
    expect(previewCodes).toContain(createdCode);
    expect(previewCodes).not.toContain(preExistingProdRecord.code);

    // Pastikan list_licenses di Production tidak pernah menampilkan staging
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_GIT_COMMIT_REF = 'main';
    const prodListRes = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'list_licenses',
    });
    expect(prodListRes.statusCode).toBe(200);
    const prodCodes = (prodListRes.body.licenses as Array<{ code: string }>).map((l) => l.code);
    expect(prodCodes).toContain(preExistingProdRecord.code);
    expect(prodCodes).not.toContain(createdCode);
  });
});
