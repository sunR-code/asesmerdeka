import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const localStorageMock = new LocalStorageMock();
if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).window = globalThis;
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import * as licenseManager from '../licenseManager';
import { isSchoolCollectiveLicenseCode } from '../cloudSyncManager';
import { OFFICIAL_SEEDED_LICENSES } from '../../data/officialSeeds';
// @ts-expect-error serverless JS tested directly
import activateLicenseHandler, {
  STAGING_LICENSE_FORMAT_VERSION,
  STAGING_SIGNATURE_BITS,
  STAGING_SIGNATURE_HEX_LENGTH,
  checkAndClaimServerSeat,
  extractLicensePlanPrefix,
  generateOrderLicenseCodeServer,
  generateStagingLicenseCode,
  getSeatRecordFromRedis,
  getStagingSigningSecretConfig,
  isLicenseRevokedInRedis,
  isStagingLicenseCode,
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
  resolveLicenseRuntimeEnvironment,
  revokeLicenseInRedis,
  saveSeatRecordToRedis,
  validateLicenseEnvironmentBoundary,
  validateStagingBranchContext,
  verifyInternalSerialOrDeviceCode,
  verifyStagingLicenseCode,
} from '../../../api/activate-license.js';
// @ts-expect-error serverless JS tested directly
import adminPortalHandler, { clearAdminPortalRateLimitStore } from '../../../api/admin-portal.js';
// @ts-expect-error serverless JS tested directly
import cloudSyncHandler, {
  clearCloudSyncRateLimitStore,
  clearLocalDevCloudSyncStore,
} from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS tested directly
import geminiHandler from '../../../api/gemini.js';
// @ts-expect-error serverless JS tested directly
import sharedCurriculumHandler, { localSharedCurriculumStore } from '../../../api/shared-curriculum.js';
// @ts-expect-error serverless JS tested directly
import mayarWebhookHandler, { computeMayarHmacSignature } from '../../../api/mayar-webhook.js';

const TEST_STAGING_SECRET = 'StgEnvBound_SecretKey_713B2_AtLeast32Chars_998877';
const TEST_ADMIN_PIN = 'ADM713B2!';
const TEST_CLOUD_PEPPER = 'CloudSyncPepper_713B2_SecureRandom_32CharsPlus!';
const TEST_WEBHOOK_SECRET = 'MayarWebhookSecret_713B2_StagingTest_32Chars';

function clearServerMemoryState() {
  localStorage.clear();
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
  localSharedCurriculumStore.clear();
  clearLocalDevCloudSyncStore();
  clearCloudSyncRateLimitStore();
  clearAdminPortalRateLimitStore();
}

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
    headers: { 'x-forwarded-for': '127.0.0.10', ...headers },
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

const VALID_CURRICULUM_DRAFT = {
  materiPokok: 'Aljabar Linear',
  pemahamanBermakna: 'Peserta didik memahami konsep persamaan linear satu variabel secara kontekstual.',
  pertanyaanPemantik: ['Bagaimana memodelkan masalah sehari-hari menjadi persamaan linear?'],
  langkahPembelajaran: ['Identifikasi variabel dan konstanta dari soal cerita.'],
};

describe('Task 7.1.3B.2 — Environment-Bound License Signing & Staging Isolation (15 Security Cases)', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearServerMemoryState();
    process.env = { ...originalEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.ADMIN_PIN = TEST_ADMIN_PIN;
    process.env.CLOUD_SYNC_PIN_PEPPER = TEST_CLOUD_PEPPER;
    process.env.MAYAR_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.MAYAR_SANDBOX = 'true';
  });

  afterEach(() => {
    clearServerMemoryState();
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('Test 1: Preview/staging dengan ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET menerbitkan ASM-STG2-* (128-bit SIG32) dan lulus aktivasi, Cloud Sync, AI entitlement, & shared curriculum', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.NODE_ENV = 'production';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    expect(resolveLicenseRuntimeEnvironment()).toBe('preview');
    expect(STAGING_LICENSE_FORMAT_VERSION).toBe('STG2');
    expect(STAGING_SIGNATURE_BITS).toBe(128);
    expect(STAGING_SIGNATURE_HEX_LENGTH).toBe(32);

    const createdRes = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'create_license',
      planType: 'pro',
      label: 'Uji Staging Preview Pro',
      count: 1,
    });
    expect(createdRes.statusCode).toBe(200);
    expect(createdRes.body.ok).toBe(true);
    const createdList = createdRes.body.created as Array<Record<string, unknown>>;
    expect(createdList).toHaveLength(1);
    const stgCode = String(createdList[0].code);
    expect(stgCode).toMatch(new RegExp(`^ASM-${STAGING_LICENSE_FORMAT_VERSION}-GP26-[A-Z0-9]{8}-[A-F0-9]{32}$`));
    expect(stgCode.split('-')[4]).toHaveLength(32);
    expect(createdList[0].environment).toBe('staging');

    const verifiedMeta = verifyStagingLicenseCode(stgCode);
    expect(verifiedMeta?.valid).toBe(true);
    expect(verifiedMeta?.formatVersion).toBe('STG2');
    expect(verifiedMeta?.signatureBits).toBe(128);
    expect(verifiedMeta?.branch).toBe('staging');

    const orderStgCode = generateOrderLicenseCodeServer('sekolah_pro', 'ORD-STG-001');
    expect(orderStgCode).toMatch(/^ASM-STG2-SP26-[A-Z0-9]{8}-[A-F0-9]{32}$/);

    const actRes = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: stgCode,
      deviceId: 'DEV-STG-PREVIEW-1',
    });
    expect(actRes.statusCode).toBe(200);
    expect(actRes.body.valid).toBe(true);
    expect(actRes.body.environment).toBe('staging');
    expect(actRes.body.planType).toBe('individu');
    expect(actRes.body.tier).toBe('pro');

    const syncPush = await callHandler(cloudSyncHandler, 'POST', {
      action: 'push',
      licenseCode: stgCode,
      deviceId: 'DEV-STG-PREVIEW-1',
      baseRevision: 0,
      entries: { test_key: 'staging_ok' },
    });
    expect(syncPush.statusCode).toBe(200);
    expect(syncPush.body.ok).toBe(true);

    delete process.env.GEMINI_API_KEY;
    const aiRes = await callHandler(geminiHandler, 'POST', {
      licenseCode: stgCode,
      deviceId: 'DEV-STG-PREVIEW-1',
      prompt: 'Buat 1 soal matematika',
    });
    expect(aiRes.statusCode).not.toBe(403);
    expect(aiRes.statusCode).not.toBe(400);

    const shareRes = await callHandler(sharedCurriculumHandler, 'POST', {
      licenseCode: stgCode,
      deviceId: 'DEV-STG-PREVIEW-1',
      type: 'modul',
      jenjang: 'SMP',
      kelas: '8',
      mapel: 'Matematika',
      tpKode: 'TP-1',
      materiPokok: 'Aljabar Linear',
      data: VALID_CURRICULUM_DRAFT,
    });
    expect(shareRes.statusCode).toBe(200);
    expect(shareRes.body.ok).toBe(true);
  });

  it('Test 2: Production menolak keras semua lisensi staging (ASM-STG2-* maupun record environment=staging) di semua endpoint meskipun secret sama disetel', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    const validStagingCode = generateStagingLicenseCode('SK26', 'PRODVSSG01');

    process.env.VERCEL_ENV = 'production';
    process.env.NODE_ENV = 'production';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    expect(resolveLicenseRuntimeEnvironment()).toBe('production');
    expect(verifyInternalSerialOrDeviceCode(validStagingCode, 'DEV-PROD-1')).toBeNull();
    expect(validateLicenseEnvironmentBoundary(validStagingCode).allowed).toBe(false);

    // 1. /api/activate-license menolak 403
    const actProd = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: validStagingCode,
      deviceId: 'DEV-PROD-1',
      teacherPin: 'GURU1:1234',
    });
    expect(actProd.statusCode).toBe(403);
    expect(actProd.body.valid).toBe(false);
    expect(actProd.body.forbiddenEnvironment).toBe(true);

    // 2. Direct seat claim menolak sebelum mutasi kursi
    const directClaim = await checkAndClaimServerSeat(validStagingCode, 'DEV-PROD-1', 25, {
      teacherPin: 'GURU1:1234',
    });
    expect(directClaim.allowed).toBe(false);
    expect(directClaim.status).toBe(403);

    // 3. /api/cloud-sync menolak 403
    const syncProd = await callHandler(cloudSyncHandler, 'POST', {
      action: 'push',
      licenseCode: validStagingCode,
      deviceId: 'DEV-PROD-1',
      teacherPin: 'GURU1:1234',
      baseRevision: 0,
      entries: { x: 1 },
    });
    expect(syncProd.statusCode).toBe(403);
    expect(syncProd.body.forbiddenEnvironment).toBe(true);

    // 4. /api/gemini menolak 403
    process.env.GEMINI_API_KEY = 'dummy-key-never-called';
    const aiProd = await callHandler(geminiHandler, 'POST', {
      licenseCode: validStagingCode,
      deviceId: 'DEV-PROD-1',
      teacherPin: 'GURU1:1234',
      prompt: 'Tes',
    });
    expect(aiProd.statusCode).toBe(403);

    // 5. /api/shared-curriculum menolak 403
    const shareProd = await callHandler(sharedCurriculumHandler, 'POST', {
      licenseCode: validStagingCode,
      deviceId: 'DEV-PROD-1',
      type: 'modul',
      jenjang: 'SMP',
      kelas: '8',
      mapel: 'Matematika',
      tpKode: 'TP-1',
      materiPokok: 'Aljabar Linear',
      data: VALID_CURRICULUM_DRAFT,
    });
    expect(shareProd.statusCode).toBe(403);

    // 6. /api/admin-portal menolak create_license target staging & aksi pada ASM-STG2-*
    const adminCreateStgInProd = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'create_license',
      targetEnvironment: 'staging',
      planType: 'individu',
    });
    expect(adminCreateStgInProd.statusCode).toBe(403);

    const adminDeleteStgInProd = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'delete_license',
      licenseCode: validStagingCode,
    });
    expect(adminDeleteStgInProd.statusCode).toBe(403);

    // 7. Record legacy/non-STG2 yang ditandai environment='staging' juga ditolak di Production
    const disguisedCode = licenseManager.computeSerialLicenseCode('DISGUISED01');
    await saveSeatRecordToRedis(disguisedCode, {
      licenseCode: disguisedCode,
      environment: 'staging',
      maxSeats: 2,
      devices: [],
    });
    const disguisedRes = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: disguisedCode,
      deviceId: 'DEV-PROD-9',
    });
    expect(disguisedRes.statusCode).toBe(403);
    expect(disguisedRes.body.forbiddenEnvironment).toBe(true);
  });

  it('Test 3: Kompatibilitas penuh lisensi Production eksisting (GM26, SK26, GP26, SP26, SL26, ASM-DV26, & seeded) di Production', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.NODE_ENV = 'production';

    const realGm = generateOrderLicenseCodeServer('individu', 'PROD-SEED-GM');
    const realSl = generateOrderLicenseCodeServer('solo', 'PROD-SEED-SL');
    const realGp = generateOrderLicenseCodeServer('pro', 'PROD-SEED-GP');
    const realSk = generateOrderLicenseCodeServer('sekolah', 'PROD-SEED-SK');
    const realSp = generateOrderLicenseCodeServer('sekolah_pro', 'PROD-SEED-SP');
    const seededCode = OFFICIAL_SEEDED_LICENSES[0].code;

    const devId = 'DEV-PROD-LEG-1';
    const dvCode = licenseManager.computeLicenseCodeForDevice(devId);
    expect(dvCode).toMatch(/^ASM-DV26-/);

    for (const [label, code, expectedPlan] of [
      ['GM26', realGm, 'individu'],
      ['SL26', realSl, 'solo'],
      ['GP26', realGp, 'pro'],
      ['SK26', realSk, 'sekolah'],
      ['SP26', realSp, 'sekolah_pro'],
      ['SEEDED', seededCode, 'individu'],
      ['DV26', dvCode, 'individu'],
    ] as const) {
      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: code,
        deviceId: devId,
        ...(expectedPlan === 'sekolah' || expectedPlan === 'sekolah_pro'
          ? { teacherPin: `GURU_${label}:PIN1` }
          : {}),
      });
      expect(act.statusCode, label).toBe(200);
      expect(act.body.valid, label).toBe(true);
      expect(act.body.environment, label).toBe('production');
      expect(licenseManager.isValidLicenseCode(code, devId), label).toBe(true);
    }
  });

  it('Test 4: Signature ASM-STG2-* yang dimodifikasi ditolak di Preview, Local, maupun Production', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    const valid = generateStagingLicenseCode('GM26', 'TAMPER01');
    const parts = valid.split('-');
    const lastChar = parts[4].slice(-1);
    const tamperedSig = parts[4].slice(0, -1) + (lastChar === 'A' ? 'B' : 'A');
    const tamperedCode = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${tamperedSig}`;

    for (const envMode of ['preview', 'production', 'local'] as const) {
      if (envMode === 'local') {
        delete process.env.VERCEL_ENV;
        delete process.env.VERCEL_GIT_COMMIT_REF;
        process.env.NODE_ENV = 'test';
      } else {
        process.env.VERCEL_ENV = envMode;
        process.env.VERCEL_GIT_COMMIT_REF = envMode === 'preview' ? 'staging' : 'main';
        process.env.NODE_ENV = 'production';
      }

      const verifyRes = verifyStagingLicenseCode(tamperedCode);
      expect(verifyRes).toBeNull();

      const res = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: tamperedCode,
        deviceId: 'DEV-TAMPER-1',
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.valid).toBe(false);
    }

    expect(licenseManager.isValidLicenseCode(tamperedCode, 'DEV-TAMPER-1')).toBe(false);
  });

  it('Test 5: Klaim environment yang dimodifikasi (PRD1, PROD, DEV1) ditolak semua endpoint', async () => {
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    const valid = generateStagingLicenseCode('GM26', 'ENVSWAP01');
    const parts = valid.split('-');

    for (const fakeEnvTag of ['PRD1', 'PROD', 'DEV1']) {
      const forged = `ASM-${fakeEnvTag}-${parts[2]}-${parts[3]}-${parts[4]}`;
      for (const targetEnv of ['preview', 'production'] as const) {
        process.env.VERCEL_ENV = targetEnv;
        process.env.VERCEL_GIT_COMMIT_REF = targetEnv === 'preview' ? 'staging' : 'main';
        const act = await callHandler(activateLicenseHandler, 'POST', {
          action: 'verify',
          licenseCode: forged,
          deviceId: 'DEV-ENVSWAP-1',
        });
        expect(act.statusCode).toBe(403);
        expect(act.body.valid).toBe(false);

        const sync = await callHandler(cloudSyncHandler, 'POST', {
          action: 'pull',
          licenseCode: forged,
          deviceId: 'DEV-ENVSWAP-1',
        });
        expect(sync.statusCode).toBe(403);
      }
    }
  });

  it('Test 6: Preview fail-closed bila ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET kosong, <32 karakter, atau placeholder', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    const preSigned = generateStagingLicenseCode('GM26', 'FAILCLOSED1');

    for (const badSecret of [
      '',
      'terlalu-pendek-123',
      'dev-only-secret-change-in-production',
      'A'.repeat(40),
    ]) {
      process.env.VERCEL_ENV = 'preview';
      process.env.NODE_ENV = 'production';
      if (badSecret === '') {
        delete process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET;
      } else {
        process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = badSecret;
      }

      const cfg = getStagingSigningSecretConfig();
      expect(cfg.configured, `secret=${badSecret}`).toBe(false);
      expect(() => generateStagingLicenseCode('GM26', 'MUSTFAIL')).toThrow();

      const adminCreate = await callHandler(adminPortalHandler, 'POST', {
        adminPin: TEST_ADMIN_PIN,
        action: 'create_license',
        planType: 'individu',
      });
      expect(adminCreate.statusCode).toBe(503);
      expect(adminCreate.body.ok).toBe(false);

      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: preSigned,
        deviceId: 'DEV-FAILCLOSED',
      });
      expect(act.statusCode).toBe(503);
      expect(act.body.valid).toBe(false);

      const sync = await callHandler(cloudSyncHandler, 'POST', {
        action: 'pull',
        licenseCode: preSigned,
        deviceId: 'DEV-FAILCLOSED',
      });
      expect([403, 503]).toContain(sync.statusCode);
      expect(sync.body.ok).toBe(false);
    }
  });

  it('Test 7: Tidak ada fallback ke konstanta client atau kunci master Production (ASESMERDEKA_2026_MASTER / 4B3A2918_KEY)', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    const forgeWithKey = (plan: string, nonce: string, key: string) => {
      const sig = crypto
        .createHmac('sha256', key)
        .update(`ASESMERDEKA:LICENSE:ENV_BOUND:V2|env=staging|branch=staging|plan=${plan}|nonce=${nonce}`)
        .digest('hex')
        .slice(0, 32)
        .toUpperCase();
      return `ASM-STG2-${plan}-${nonce}-${sig}`;
    };

    for (const masterConstant of [
      'ASESMERDEKA_2026_MASTER',
      '4B3A2918_KEY',
      'MERDEKA_SALT_2026',
    ]) {
      const forged = forgeWithKey('SK26', 'FORGED01', masterConstant);
      expect(verifyStagingLicenseCode(forged)).toBeNull();
      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: forged,
        deviceId: 'DEV-FORGED',
      });
      expect(act.statusCode).toBe(403);
      expect(act.body.valid).toBe(false);
    }

    delete process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET;
    const forgedNoSecret = forgeWithKey('GM26', 'FORGED02', 'ASESMERDEKA_2026_MASTER');
    expect(verifyStagingLicenseCode(forgedNoSecret)).toBeNull();
  });

  it('Test 8: Penghapusan / revocation lisensi di staging terisolasi dan tidak mencabut lisensi di Production', async () => {
    const prodCode = generateOrderLicenseCodeServer('individu', 'PROD-ISO-KEEP');

    const redisKV = new Map<string, string>();
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock-isolation.upstash.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-isolation-token';

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('https://mock-isolation.upstash.test')) {
        if (url.includes('/get/')) {
          const rawKey = url.split('/get/')[1].split('?')[0];
          const key = decodeURIComponent(rawKey);
          return new Response(JSON.stringify({ result: redisKV.get(key) ?? null }), { status: 200 });
        }
        if (url.includes('/set/')) {
          const rawKey = url.split('/set/')[1].split('?')[0];
          const key = decodeURIComponent(rawKey);
          redisKV.set(key, String(init?.body || ''));
          return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
        }
        if (url.includes('/del/')) {
          const rawKey = url.split('/del/')[1].split('?')[0];
          const key = decodeURIComponent(rawKey);
          const existed = redisKV.delete(key) ? 1 : 0;
          return new Response(JSON.stringify({ result: existed }), { status: 200 });
        }
        if (init?.method === 'POST' && init.body) {
          try {
            const cmd = JSON.parse(String(init.body)) as unknown[];
            if (Array.isArray(cmd) && String(cmd[0]).toUpperCase() === 'EVAL') {
              const script = String(cmd[1] || '');
              const numKeys = Number(cmd[2] || 0);
              const firstKey = String(cmd[3] || '');
              const firstArg = String(cmd[3 + numKeys] || '');
              if (script.includes('RELEASE') || script.includes('redis.call(\'DEL\'')) {
                return new Response(JSON.stringify({ result: 1 }), { status: 200 });
              }
              if (script.includes('PTTL') || script.includes('ASESMERDEKA_MULTI_LOCK') || numKeys >= 1 && script.includes('NX')) {
                return new Response(JSON.stringify({ result: [1, 1] }), { status: 200 });
              }
              if (firstKey && firstArg) {
                redisKV.set(firstKey, firstArg);
              }
              return new Response(JSON.stringify({ result: ['OK', firstArg] }), { status: 200 });
            }
          } catch {
            // ignore non-JSON
          }
        }
        return new Response(JSON.stringify({ result: null }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'unexpected fetch' }), { status: 404 });
    }) as typeof fetch;

    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    const stgCode = generateStagingLicenseCode('GM26', 'DELSTG01');

    // Hapus melalui Admin Portal Preview
    const delRes = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'delete_license',
      licenseCode: stgCode,
    });
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.ok).toBe(true);

    // Revocation staging hanya menulis key staging, BUKAN key production
    const stgRevokedRaw = redisKV.get('asesmerdeka:admin:revoked_licenses:staging:v1');
    expect(stgRevokedRaw).toBeTruthy();
    expect(JSON.parse(stgRevokedRaw!)).toContain(stgCode);
    expect(redisKV.has('asesmerdeka:admin:revoked_licenses:v1')).toBe(false);
    expect(localStagingRevokedLicensesSet.has(stgCode)).toBe(true);
    expect(localRevokedLicensesSet.has(stgCode)).toBe(false);

    // Pencabutan eksplisit via revokeLicenseInRedis juga tetap terisolasi
    const stgCode2 = generateStagingLicenseCode('SK26', 'DELSTG02');
    await revokeLicenseInRedis(stgCode2);
    expect(JSON.parse(redisKV.get('asesmerdeka:admin:revoked_licenses:staging:v1')!)).toContain(stgCode2);
    expect(redisKV.has('asesmerdeka:admin:revoked_licenses:v1')).toBe(false);

    // Di Production, cek langsung bahwa revocation Redis staging TIDAK mencabut lisensi Production
    process.env.VERCEL_ENV = 'production';
    expect(await isLicenseRevokedInRedis(prodCode)).toBe(false);
    process.env.VERCEL_ENV = 'preview';
    expect(await isLicenseRevokedInRedis(stgCode)).toBe(true);

    // Aktivasi Production tetap berhasil
    process.env.VERCEL_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const actProd = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: prodCode,
      deviceId: 'DEV-PROD-UNAFFECTED',
    });
    expect(actProd.statusCode).toBe(200);
    expect(actProd.body.valid).toBe(true);
  });

  it('Test 9: Serangan swap prefix/plan (GM26 -> SK26 atau SP26) dengan nonce & signature sama ditolak', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    const indivStg = generateStagingLicenseCode('GM26', 'PLANSWAP');
    const parts = indivStg.split('-');
    for (const upgradedPlan of ['SK26', 'SP26', 'GP26']) {
      const swapped = `${parts[0]}-${parts[1]}-${upgradedPlan}-${parts[3]}-${parts[4]}`;
      expect(verifyStagingLicenseCode(swapped)).toBeNull();
      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: swapped,
        deviceId: 'DEV-PLANSWAP-1',
      });
      expect(act.statusCode).toBe(403);
      expect(act.body.valid).toBe(false);
    }
  });

  it('Test 10: Kode Production legacy tidak pernah salah dikenali sebagai kode staging', () => {
    const samples = [
      generateOrderLicenseCodeServer('individu', 'LEG-GM'),
      generateOrderLicenseCodeServer('solo', 'LEG-SL'),
      generateOrderLicenseCodeServer('pro', 'LEG-GP'),
      generateOrderLicenseCodeServer('sekolah', 'LEG-SK'),
      generateOrderLicenseCodeServer('sekolah_pro', 'LEG-SP'),
      licenseManager.computeLicenseCodeForDevice('DEV-LEG-CHECK'),
      OFFICIAL_SEEDED_LICENSES[0].code,
    ];

    for (const code of samples) {
      expect(isStagingLicenseCode(code), code).toBe(false);
      expect(licenseManager.isStagingLicenseCodeFormat(code), code).toBe(false);
      expect(validateLicenseEnvironmentBoundary(code, null, { runtimeEnv: 'production' }).allowed, code).toBe(true);
    }
  });

  it('Test 11: Multi-guru (25 guru) dan batas 2 perangkat per guru berjalan normal untuk ASM-STG2-SK26-* di Preview/staging', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    const schoolStg = generateStagingLicenseCode('SK26', 'SCH25SEAT');
    expect(extractLicensePlanPrefix(schoolStg)).toBe('SK26');
    expect(licenseManager.getMaxDevicesForLicenseCode(schoolStg)).toBe(25);
    expect(licenseManager.isCollectiveSchoolLicenseCode(schoolStg)).toBe(true);
    expect(isSchoolCollectiveLicenseCode(schoolStg)).toBe(true);

    const g1d1 = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: schoolStg,
      deviceId: 'DEV-G1-1',
      teacherPin: 'GURU01:1111',
    });
    expect(g1d1.statusCode).toBe(200);
    expect(g1d1.body.usedSeats).toBe(1);

    const g1d2 = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: schoolStg,
      deviceId: 'DEV-G1-2',
      teacherPin: 'GURU01:1111',
    });
    expect(g1d2.statusCode).toBe(200);

    const g1d3 = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: schoolStg,
      deviceId: 'DEV-G1-3',
      teacherPin: 'GURU01:1111',
    });
    expect(g1d3.statusCode).toBe(403);
    expect(g1d3.body.valid).toBe(false);
    expect(g1d3.body.teacherDeviceLimitExceeded).toBe(true);

    for (let i = 2; i <= 25; i++) {
      const r = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: schoolStg,
        deviceId: `DEV-G${i}-1`,
        teacherPin: `GURU${String(i).padStart(2, '0')}:9999`,
      });
      expect(r.statusCode, `Guru ${i}`).toBe(200);
      expect(r.body.usedSeats).toBe(i);
    }

    const g26 = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: schoolStg,
      deviceId: 'DEV-G26-1',
      teacherPin: 'GURU26:9999',
    });
    expect(g26.statusCode).toBe(403);
    expect(g26.body.valid).toBe(false);
    expect(g26.body.seatLimitExceeded).toBe(true);
  });

  it('Test 12: Preview/staging menolak serial Production maupun OFFICIAL_SEEDED_LICENSES, dan admin-portal Preview menyembunyikan stok seeded Production', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.NODE_ENV = 'production';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    const prodDynamic = licenseManager.computeSerialLicenseCode('PRODONLY01');
    const prodSeeded = OFFICIAL_SEEDED_LICENSES[0].code;
    const prodDv = licenseManager.computeLicenseCodeForDevice('DEV-PROD-LEGACY');

    for (const prodCode of [prodDynamic, prodSeeded, prodDv]) {
      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: prodCode,
        deviceId: 'DEV-PROD-LEGACY',
      });
      expect(act.statusCode, prodCode).toBe(403);
      expect(act.body.valid, prodCode).toBe(false);
      expect(act.body.forbiddenEnvironment, prodCode).toBe(true);

      const sync = await callHandler(cloudSyncHandler, 'POST', {
        action: 'pull',
        licenseCode: prodCode,
        deviceId: 'DEV-PROD-LEGACY',
      });
      expect(sync.statusCode, prodCode).toBe(403);
    }

    const adminList = await callHandler(adminPortalHandler, 'POST', {
      adminPin: TEST_ADMIN_PIN,
      action: 'list_licenses',
    });
    expect(adminList.statusCode).toBe(200);
    const listedCodes = (adminList.body.licenses as Array<{ code: string }>).map((l) => l.code);
    expect(listedCodes).not.toContain(prodSeeded);
  });

  it('Test 13: Mode local dev / test mengarahkan ASM-STG2-* strictly ke verifier staging tanpa membuka celah pada Production', async () => {
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'test';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    expect(resolveLicenseRuntimeEnvironment()).toBe('local');
    const localStg = generateStagingLicenseCode('GP26', 'LOCALDEV1');
    expect(verifyInternalSerialOrDeviceCode(localStg, 'DEV-LOCAL-1')?.environment).toBe('staging');

    delete process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET;
    expect(verifyInternalSerialOrDeviceCode(localStg, 'DEV-LOCAL-1')).toBeNull();

    process.env.VERCEL_ENV = 'production';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    expect(verifyInternalSerialOrDeviceCode(localStg, 'DEV-PROD-1')).toBeNull();
  });

  it('Test 14: Tidak ada VITE_* secret fallback & tidak ada kebocoran nama secret signing ke source client', () => {
    delete process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET;
    process.env.VITE_ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    process.env.VERCEL_ENV = 'preview';

    const cfg = getStagingSigningSecretConfig();
    expect(cfg.configured).toBe(false);

    const licenseMgrSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/utils/licenseManager.ts'),
      'utf8'
    );
    expect(licenseMgrSource).not.toContain('ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET');

    const cloudSyncSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/utils/cloudSyncManager.ts'),
      'utf8'
    );
    expect(cloudSyncSource).not.toContain('ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET');
  });

  it('Test 15: Environment boundaries tetap ditegakkan di activate-license; Mayar Webhook yang dipensiunkan selalu mengembalikan HTTP 410 Gone tanpa mutasi', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    const validStgForWebhook = generateStagingLicenseCode('GP26', 'WHSTG001');
    const tamperedStgForWebhook = `${validStgForWebhook.slice(0, -1)}${validStgForWebhook.endsWith('F') ? 'E' : 'F'}`;

    const postWebhook = async (payloadObj: Record<string, unknown>) => {
      const raw = JSON.stringify(payloadObj);
      const hmacSig = computeMayarHmacSignature(raw, TEST_WEBHOOK_SECRET);
      return callHandler(mayarWebhookHandler, 'POST', payloadObj, {
        'x-callback-token': TEST_WEBHOOK_SECRET,
        'x-mayar-signature': hmacSig,
      });
    };

    // 1. Mayar Webhook telah dipensiunkan permanen (HTTP 410 Gone) di Production maupun Preview tanpa menulis ke Redis
    process.env.VERCEL_ENV = 'production';
    const prodRetiredWh = await postWebhook({
      event: 'license.renewed',
      data: {
        id: 'ev-prod-reject-stg-1',
        transactionId: 'tx-prod-reject-stg-1',
        status: 'SUCCESS',
        amount: 199000,
        licenseCode: validStgForWebhook,
      },
    });
    expect(prodRetiredWh.statusCode).toBe(410);
    expect(prodRetiredWh.body.reason).toBe('MAYAR_DECOMMISSIONED');

    // Production tetap menolak aktivasi kode staging melalui activate-license (HTTP 403)
    const prodRejectStgActivate = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: validStgForWebhook,
      deviceId: 'DEV-PROD-REJ-15',
    });
    expect(prodRejectStgActivate.statusCode).toBe(403);
    expect(prodRejectStgActivate.body.forbiddenEnvironment).toBe(true);

    // 2. Preview menolak aktivasi kode ASM-STG2-* yang signature-nya dimanipulasi (HTTP 403)
    process.env.VERCEL_ENV = 'preview';
    const previewRejectTamperedActivate = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: tamperedStgForWebhook,
      deviceId: 'DEV-STG-TAMPER-15',
    });
    expect(previewRejectTamperedActivate.statusCode).toBe(403);

    // 3. Preview menolak aktivasi serial Production (HTTP 403)
    process.env.VERCEL_ENV = 'production';
    const prodSerial = generateOrderLicenseCodeServer('individu', 'PROD-WH-OLD');
    process.env.VERCEL_ENV = 'preview';
    const previewRejectProdActivate = await callHandler(activateLicenseHandler, 'POST', {
      action: 'verify',
      licenseCode: prodSerial,
      deviceId: 'DEV-STG-PRODREJ-15',
    });
    expect(previewRejectProdActivate.statusCode).toBe(403);
    expect(previewRejectProdActivate.body.forbiddenEnvironment).toBe(true);

    // 4. Mayar Webhook di Preview juga mengembalikan 410 Gone tanpa menyentuh seat/order
    const previewRetiredWh = await postWebhook({
      event: 'payment.received',
      data: { id: 'ev-preview-retired-1', licenseCode: validStgForWebhook, amount: 199000 },
    });
    expect(previewRetiredWh.statusCode).toBe(410);
    expect(previewRetiredWh.body.reason).toBe('MAYAR_DECOMMISSIONED');
    expect(await getSeatRecordFromRedis(validStgForWebhook)).toBeNull();
  });

  it('Test 16: Strict Branch Binding — Preview pada branch selain staging (feature/*, main, Staging, staging-v2) menolak cetak, verifikasi, aktivasi, seat claim, Cloud Sync, AI entitlement, shared curriculum, & webhook', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.NODE_ENV = 'production';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    const validStg2 = generateStagingLicenseCode('SP26', 'BRANCHBIND01');
    const prodSerial = (() => {
      process.env.VERCEL_ENV = 'production';
      const s = generateOrderLicenseCodeServer('pro', 'BRANCH-PROD-CHK');
      process.env.VERCEL_ENV = 'preview';
      return s;
    })();

    for (const nonStagingBranch of ['feature/new-ui', 'main', 'Staging', 'staging-v2']) {
      process.env.VERCEL_ENV = 'preview';
      process.env.VERCEL_GIT_COMMIT_REF = nonStagingBranch;
      process.env.NODE_ENV = 'production';

      const ctx = validateStagingBranchContext();
      expect(ctx.allowed, nonStagingBranch).toBe(false);
      expect(ctx.reason, nonStagingBranch).toBe('STAGING_BRANCH_MISMATCH');

      expect(() => generateStagingLicenseCode('GM26', 'BLOCKME'), nonStagingBranch).toThrow();
      expect(() => generateOrderLicenseCodeServer('pro', 'ORD-NONSTG'), nonStagingBranch).toThrow();
      expect(verifyStagingLicenseCode(validStg2), nonStagingBranch).toBeNull();
      expect(verifyInternalSerialOrDeviceCode(validStg2, 'DEV-BRANCH-1'), nonStagingBranch).toBeNull();
      expect(validateLicenseEnvironmentBoundary(validStg2).allowed, nonStagingBranch).toBe(false);

      const adminCreate = await callHandler(adminPortalHandler, 'POST', {
        adminPin: TEST_ADMIN_PIN,
        action: 'create_license',
        planType: 'pro',
      });
      expect(adminCreate.statusCode, nonStagingBranch).toBe(403);
      expect(adminCreate.body.forbiddenEnvironment, nonStagingBranch).toBe(true);

      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: validStg2,
        deviceId: 'DEV-BRANCH-1',
        teacherPin: 'GURU1:1234',
      });
      expect(act.statusCode, nonStagingBranch).toBe(403);
      expect(act.body.valid, nonStagingBranch).toBe(false);

      const claim = await checkAndClaimServerSeat(validStg2, 'DEV-BRANCH-1', 25, {
        teacherPin: 'GURU1:1234',
      });
      expect(claim.allowed, nonStagingBranch).toBe(false);
      expect(claim.status, nonStagingBranch).toBe(403);

      const sync = await callHandler(cloudSyncHandler, 'POST', {
        action: 'pull',
        licenseCode: validStg2,
        deviceId: 'DEV-BRANCH-1',
        teacherPin: 'GURU1:1234',
      });
      expect(sync.statusCode, nonStagingBranch).toBe(403);

      const ai = await callHandler(geminiHandler, 'POST', {
        licenseCode: validStg2,
        deviceId: 'DEV-BRANCH-1',
        teacherPin: 'GURU1:1234',
        prompt: 'Halo',
      });
      expect(ai.statusCode, nonStagingBranch).toBe(403);

      const share = await callHandler(sharedCurriculumHandler, 'POST', {
        licenseCode: validStg2,
        deviceId: 'DEV-BRANCH-1',
        type: 'modul',
        jenjang: 'SMP',
        kelas: '8',
        mapel: 'Matematika',
        tpKode: 'TP-1',
        materiPokok: 'Aljabar Linear',
        data: VALID_CURRICULUM_DRAFT,
      });
      expect(share.statusCode, nonStagingBranch).toBe(403);

      const whBody = {
        event: 'license.renewed',
        data: { id: `ev-${nonStagingBranch}`, licenseCode: validStg2, status: 'SUCCESS', amount: 1499000 },
      };
      const whSig = computeMayarHmacSignature(JSON.stringify(whBody), TEST_WEBHOOK_SECRET);
      const wh = await callHandler(mayarWebhookHandler, 'POST', whBody, {
        'x-callback-token': TEST_WEBHOOK_SECRET,
        'x-mayar-signature': whSig,
      });
      expect(wh.statusCode, nonStagingBranch).toBe(410);
      expect(wh.body.reason, nonStagingBranch).toBe('MAYAR_DECOMMISSIONED');

      // Pastikan Preview non-staging juga tidak menerima kode Production
      const prodOnNonStaging = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: prodSerial,
        deviceId: 'DEV-BRANCH-PROD',
      });
      expect(prodOnNonStaging.statusCode, nonStagingBranch).toBe(403);
    }
  });

  it('Test 17: Preview dengan metadata branch kosong (VERCEL_GIT_COMMIT_REF kosong/undefined) ditolak fail-closed', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    const validStg2 = generateStagingLicenseCode('GM26', 'EMPTYBRANCH');

    for (const emptyMode of ['undefined', 'empty_string', 'whitespace'] as const) {
      process.env.VERCEL_ENV = 'preview';
      process.env.NODE_ENV = 'production';
      if (emptyMode === 'undefined') delete process.env.VERCEL_GIT_COMMIT_REF;
      else if (emptyMode === 'empty_string') process.env.VERCEL_GIT_COMMIT_REF = '';
      else process.env.VERCEL_GIT_COMMIT_REF = '   ';

      const ctx = validateStagingBranchContext();
      expect(ctx.allowed, emptyMode).toBe(false);
      expect(ctx.reason, emptyMode).toBe('MISSING_STAGING_BRANCH_METADATA');

      expect(() => generateStagingLicenseCode('GM26', 'FAIL_EMPTY_BR'), emptyMode).toThrow();
      expect(verifyStagingLicenseCode(validStg2), emptyMode).toBeNull();
      expect(validateLicenseEnvironmentBoundary(validStg2).allowed, emptyMode).toBe(false);

      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: validStg2,
        deviceId: 'DEV-EMPTY-BR',
      });
      expect(act.statusCode, emptyMode).toBe(403);

      const adminCreate = await callHandler(adminPortalHandler, 'POST', {
        adminPin: TEST_ADMIN_PIN,
        action: 'create_license',
        planType: 'individu',
      });
      expect(adminCreate.statusCode, emptyMode).toBe(403);
    }
  });

  it('Test 18: Format STG1 lama selalu ditolak secara eksplisit di Preview/staging, Local, Production, dan Client helper (tanpa fallback STG1)', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    const stg1Sig16 = crypto
      .createHmac('sha256', TEST_STAGING_SECRET)
      .update('ASESMERDEKA:LICENSE:ENV_BOUND:V1|env=staging|plan=GP26|nonce=1234ABCD')
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();
    const legacyStg1Code = `ASM-STG1-GP26-1234ABCD-${stg1Sig16}`;

    expect(licenseManager.isStagingLicenseCodeFormat(legacyStg1Code)).toBe(false);
    expect(licenseManager.isValidLicenseCode(legacyStg1Code, 'DEV-STG1-CLIENT')).toBe(false);
    expect(extractLicensePlanPrefix(legacyStg1Code)).toBe('');

    for (const envMode of ['preview', 'production', 'local'] as const) {
      if (envMode === 'local') {
        delete process.env.VERCEL_ENV;
        delete process.env.VERCEL_GIT_COMMIT_REF;
        process.env.NODE_ENV = 'test';
      } else {
        process.env.VERCEL_ENV = envMode;
        process.env.VERCEL_GIT_COMMIT_REF = envMode === 'preview' ? 'staging' : 'main';
        process.env.NODE_ENV = 'production';
      }

      expect(verifyStagingLicenseCode(legacyStg1Code), envMode).toBeNull();
      expect(verifyInternalSerialOrDeviceCode(legacyStg1Code, 'DEV-STG1'), envMode).toBeNull();
      expect(validateLicenseEnvironmentBoundary(legacyStg1Code).allowed, envMode).toBe(false);

      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: legacyStg1Code,
        deviceId: 'DEV-STG1',
      });
      expect(act.statusCode, envMode).toBe(403);
      expect(act.body.valid, envMode).toBe(false);

      const sync = await callHandler(cloudSyncHandler, 'POST', {
        action: 'pull',
        licenseCode: legacyStg1Code,
        deviceId: 'DEV-STG1',
      });
      expect(sync.statusCode, envMode).toBe(403);

      const ai = await callHandler(geminiHandler, 'POST', {
        licenseCode: legacyStg1Code,
        deviceId: 'DEV-STG1',
        prompt: 'Tes STG1',
      });
      expect(ai.statusCode, envMode).toBe(403);

      const adminReset = await callHandler(adminPortalHandler, 'POST', {
        adminPin: TEST_ADMIN_PIN,
        action: 'reset_license_seats',
        licenseCode: legacyStg1Code,
      });
      expect(adminReset.statusCode, envMode).toBe(403);
    }
  });

  it('Test 19: Penguatan signature 128-bit (SIG32) — 32 hex diterima, pemotongan 1 karakter / penambahan 1 karakter / secret berbeda ditolak', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;

    const valid = generateStagingLicenseCode('GP26', 'SIG128CHECK');
    const parts = valid.split('-');
    expect(parts[1]).toBe('STG2');
    expect(parts[4]).toHaveLength(32);
    expect(verifyStagingLicenseCode(valid)?.signatureBits).toBe(128);

    // 1. Potong 1 karakter (31 hex) -> ditolak
    const truncatedByOne = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4].slice(0, 31)}`;
    expect(truncatedByOne.split('-')[4]).toHaveLength(31);
    expect(verifyStagingLicenseCode(truncatedByOne)).toBeNull();
    expect(licenseManager.isStagingLicenseCodeFormat(truncatedByOne)).toBe(false);

    // 2. Tambah 1 karakter (33 hex) -> ditolak
    const extendedByOne = `${valid}A`;
    expect(verifyStagingLicenseCode(extendedByOne)).toBeNull();

    // 3. Karakter non-hex dalam 32 karakter -> ditolak
    const nonHex = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-Z${parts[4].slice(1)}`;
    expect(verifyStagingLicenseCode(nonHex)).toBeNull();

    // 4. Signed dengan secret valid lain >=32 karakter -> ditolak
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET =
      'AnotherStrongSecret_713B21_CompletelyDifferent_64HexChars!!';
    const wrongSecretSigned = generateStagingLicenseCode('GP26', 'SIG128CHECK');
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    expect(verifyStagingLicenseCode(wrongSecretSigned)).toBeNull();

    for (const badCode of [truncatedByOne, extendedByOne, nonHex, wrongSecretSigned]) {
      const act = await callHandler(activateLicenseHandler, 'POST', {
        action: 'verify',
        licenseCode: badCode,
        deviceId: 'DEV-SIG-HARD',
      });
      expect(act.statusCode).toBe(403);
      expect(act.body.valid).toBe(false);
    }
  });

  it('Test 20: Staging license STG2 tidak pernah dapat mengakses entitlement PRO Production maupun Cloud Sync Production', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = TEST_STAGING_SECRET;
    const stgPro = generateStagingLicenseCode('SP26', 'ENTITLEMENT20');

    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_GIT_COMMIT_REF = 'main';
    process.env.NODE_ENV = 'production';
    process.env.GEMINI_API_KEY = 'dummy-key-never-called';

    const aiProAttempt = await callHandler(geminiHandler, 'POST', {
      licenseCode: stgPro,
      deviceId: 'DEV-PROD-ENT',
      tier: 'sekolah_pro',
      enforceLicense: true,
      prompt: 'Tes entitlement PRO',
    });
    expect(aiProAttempt.statusCode).toBe(403);
    expect(aiProAttempt.body.forbiddenEnvironment).toBe(true);

    const syncAttempt = await callHandler(cloudSyncHandler, 'POST', {
      action: 'push',
      licenseCode: stgPro,
      deviceId: 'DEV-PROD-ENT',
      baseRevision: 0,
      entries: { a: 1 },
    });
    expect(syncAttempt.statusCode).toBe(403);
    expect(syncAttempt.body.forbiddenEnvironment).toBe(true);
  });
});
