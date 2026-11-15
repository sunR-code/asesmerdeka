import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

import {
  saveCustomTPList,
  saveSchoolProfile,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import {
  createEmptyKelasHarianData,
  getKelasHarianData,
  saveKelasHarianData,
} from '../kelasHarianStorage';
import type { SiswaItem } from '../../types/kelasHarian';
import * as licenseManager from '../licenseManager';
import {
  getPendingCloudConflict,
  getPreConflictBackup,
  pullWorkspaceFromCloud,
  pushWorkspaceToCloud,
  resolveCloudConflict,
} from '../cloudSyncManager';

// @ts-expect-error serverless JS handler tested directly with mock req/res
import cloudSyncHandler, {
  SCRYPT_PARAMS,
  SUPPORTED_OWASP_SCRYPT_PROFILES,
  checkAuthRateLimit,
  clearCloudSyncRateLimitStore,
  clearLocalDevCloudSyncStore,
  getPepperKeyId,
  getRateLimitKey,
  hashTeacherPin,
  hashTeacherPinLegacySha256,
  isProductionEnvironment,
  localDevMemoryStore,
  recordFailedAuthAttempt,
  validateProductionPepperConfig,
  verifyTeacherPinHash,
} from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS module tested with clean memory stores
import { localRevokedLicensesSet, localSeatMemoryStore } from '../../../api/activate-license.js';

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_task6_4_preflight',
    instansiDinas: 'Dinas Pendidikan Kota Yogyakarta',
    namaSekolah: 'SMP Negeri 8 Yogyakarta',
    alamatSekolah: 'Jl. Kahar Muzakir No. 2',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII B',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    namaKepalaSekolah: 'Drs. Hartono, M.Pd.',
    nipKepalaSekolah: '196803121994031005',
    namaGuru: 'Ibu Ratna, S.Pd.',
    nipGuru: '199004102015022001',
    kotaTanggal: 'Yogyakarta',
    ...overrides,
  };
}

function makeSampleTPs(): CustomTPItem[] {
  return [
    {
      id: 'tpid_64_1',
      kode: '8.1',
      materi: 'Persamaan Garis Lurus',
      deskripsi: 'Menentukan gradien dan persamaan garis lurus.',
    },
    {
      id: 'tpid_64_2',
      kode: '8.2',
      materi: 'Sistem Persamaan Linear',
      deskripsi: 'Menyelesaikan SPLDV dengan metode substitusi dan eliminasi.',
    },
  ];
}

function makeSiswa(id: string, noUrut: number, nama: string, nis: string): SiswaItem {
  return {
    id,
    noUrut,
    nama,
    nis,
    jenisKelamin: noUrut % 2 === 1 ? 'L' : 'P',
    statusAktif: 'aktif',
  };
}

function buildHarianKey(profile: SchoolProfile): string {
  return [
    profile.schoolId,
    profile.tahunAjaran,
    profile.jenjang,
    profile.kelasUtama,
    profile.rombelAktif,
    profile.mataPelajaranUtama,
    profile.semester,
  ].join('::');
}

async function invokeCloudSyncApi(
  body: Record<string, unknown>,
  headers: Record<string, string> = { 'x-forwarded-for': '203.0.113.44' }
): Promise<{ statusCode: number; headers: Record<string, string>; body: Record<string, unknown> }> {
  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  const outHeaders: Record<string, string> = {};

  const req = {
    method: 'POST',
    headers,
    body,
  };
  const res = {
    setHeader(name: string, value: string) {
      outHeaders[name] = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      responseBody = payload;
      return this;
    },
  };

  await cloudSyncHandler(req, res);
  return { statusCode, headers: outHeaders, body: responseBody };
}

function installPersistentUpstashMock(
  backingRedisKv: Map<string, string>,
  backingTtlMap: Map<string, number> = new Map<string, number>()
) {
  const originalFetch = globalThis.fetch;
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  let forceOutage = false;

  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.asesmerdeka.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-upstash-token-synthetic';

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input.toString();

    if (urlStr.startsWith('https://mock-upstash.asesmerdeka.test')) {
      if (forceOutage) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: 'Simulated Redis outage' }),
        } as Response;
      }

      if (urlStr.includes('/get/')) {
        const key = decodeURIComponent(urlStr.split('/get/')[1] || '');
        const raw = backingRedisKv.has(key) ? backingRedisKv.get(key)! : null;
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: raw }),
        } as Response;
      }

      if (urlStr.includes('/set/')) {
        const rawRest = urlStr.split('/set/')[1] || '';
        const slashIdx = rawRest.indexOf('/');
        const key = decodeURIComponent(slashIdx >= 0 ? rawRest.slice(0, slashIdx) : rawRest);
        const val = decodeURIComponent(slashIdx >= 0 ? rawRest.slice(slashIdx + 1) : '');
        backingRedisKv.set(key, val);
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: 'OK' }),
        } as Response;
      }

      const cmd = init?.body ? (JSON.parse(String(init.body)) as string[]) : [];
      if (cmd[0] === 'EVAL') {
        const script = cmd[1] || '';
        const key = cmd[3] || '';
        const currentRaw = backingRedisKv.get(key) || null;

        if (script.includes('ASESMERDEKA_RATE_LIMIT_V1')) {
          const op = cmd[4] || 'CHECK';
          const windowMs = Number(cmd[5]) || 300000;
          const now = Date.now();
          const expireAt = backingTtlMap.get(key) || 0;
          if (expireAt && now > expireAt) {
            backingRedisKv.delete(key);
            backingTtlMap.delete(key);
          }
          if (op === 'RESET') {
            backingRedisKv.delete(key);
            backingTtlMap.delete(key);
            return { ok: true, status: 200, json: async () => ({ result: [0, 0] }) } as Response;
          }
          if (op === 'CHECK') {
            const count = Number(backingRedisKv.get(key) || '0') || 0;
            const exp = backingTtlMap.get(key) || 0;
            const ttl = count > 0 && exp > now ? exp - now : -1;
            return { ok: true, status: 200, json: async () => ({ result: [count, ttl] }) } as Response;
          }
          if (op === 'RECORD_FAIL') {
            const prevCount = Number(backingRedisKv.get(key) || '0') || 0;
            const nextCount = prevCount + 1;
            backingRedisKv.set(key, String(nextCount));
            let exp = backingTtlMap.get(key) || 0;
            if (nextCount === 1 || exp <= now) {
              exp = now + windowMs;
              backingTtlMap.set(key, exp);
            }
            return {
              ok: true,
              status: 200,
              json: async () => ({ result: [nextCount, Math.max(1, exp - now)] }),
            } as Response;
          }
          return { ok: true, status: 200, json: async () => ({ result: [0, 0] }) } as Response;
        }

        if (script.includes('currentRev ~= expectedRev') && !script.includes('IDEMPOTENT')) {
          if (!currentRaw) {
            return { ok: true, status: 200, json: async () => ({ result: ['MISSING'] }) } as Response;
          }
          const parsed = JSON.parse(currentRaw) as { revision?: number };
          const expectedRev = Number(cmd[4]);
          if ((Number(parsed.revision) || 1) !== expectedRev) {
            return { ok: true, status: 200, json: async () => ({ result: ['STALE'] }) } as Response;
          }
          backingRedisKv.set(key, cmd[5]);
          return { ok: true, status: 200, json: async () => ({ result: ['OK'] }) } as Response;
        }

        const expectedRev = Number(cmd[4]);
        const nextRecordJson = cmd[5];
        const reqId = cmd[6] || '';
        const reqHash = cmd[7] || '';
        const reqDevice = cmd[8] || '';

        if (!currentRaw) {
          if (Number.isFinite(expectedRev) && expectedRev > 0) {
            return { ok: true, status: 200, json: async () => ({ result: ['CONFLICT', '0', ''] }) } as Response;
          }
          backingRedisKv.set(key, nextRecordJson);
          return { ok: true, status: 200, json: async () => ({ result: ['OK', nextRecordJson] }) } as Response;
        }

        const current = JSON.parse(currentRaw) as {
          revision?: number;
          lastRequestId?: string;
          lastContentHash?: string;
          deviceId?: string;
        };
        const currentRev = Number(current.revision) || 1;

        if (reqId && current.lastRequestId === reqId) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: ['IDEMPOTENT', String(currentRev), currentRaw] }),
          } as Response;
        }

        if (
          reqHash &&
          current.lastContentHash === reqHash &&
          current.deviceId === reqDevice &&
          (expectedRev < 0 || expectedRev === currentRev - 1)
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: ['IDEMPOTENT', String(currentRev), currentRaw] }),
          } as Response;
        }

        if (expectedRev >= 0 && currentRev !== expectedRev) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: ['CONFLICT', String(currentRev), currentRaw] }),
          } as Response;
        }

        const nextParsed = JSON.parse(nextRecordJson) as Record<string, unknown>;
        nextParsed.revision = currentRev + 1;
        const storedJson = JSON.stringify(nextParsed);
        backingRedisKv.set(key, storedJson);
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: ['OK', storedJson] }),
        } as Response;
      }
    }

    if (urlStr.includes('/api/cloud-sync')) {
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : {};
      const result = await invokeCloudSyncApi(parsedBody);
      return {
        ok: result.statusCode >= 200 && result.statusCode < 300,
        status: result.statusCode,
        json: async () => result.body,
      } as Response;
    }

    throw new Error(`Unexpected fetch URL in Task 6.4 test mock: ${urlStr}`);
  }) as typeof fetch;

  return {
    setOutage(down: boolean) {
      forceOutage = down;
    },
    restore() {
      globalThis.fetch = originalFetch;
      if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
      if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    },
  };
}

function snapshotLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) out[k] = localStorage.getItem(k) || '';
  }
  return out;
}

function restoreLocalStorage(snapshot: Record<string, string>) {
  localStorage.clear();
  for (const [k, v] of Object.entries(snapshot)) {
    localStorage.setItem(k, v);
  }
}

describe('Task 6.4 — Cloud Sync Security Hardening & Production Preflight', () => {
  let prevUrl: string | undefined;
  let prevToken: string | undefined;
  let prevPepper: string | undefined;
  let prevPepperPrev: string | undefined;
  let prevVercelEnv: string | undefined;
  let prevNodeEnv: string | undefined;

  beforeEach(() => {
    localStorage.clear();
    clearLocalDevCloudSyncStore();
    clearCloudSyncRateLimitStore();
    localSeatMemoryStore.clear();
    localRevokedLicensesSet.clear();

    prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    prevPepper = process.env.CLOUD_SYNC_PIN_PEPPER;
    prevPepperPrev = process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    prevVercelEnv = process.env.VERCEL_ENV;
    prevNodeEnv = process.env.NODE_ENV;

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.CLOUD_SYNC_PIN_PEPPER;
    delete process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    if (prevPepper === undefined) delete process.env.CLOUD_SYNC_PIN_PEPPER;
    else process.env.CLOUD_SYNC_PIN_PEPPER = prevPepper;
    if (prevPepperPrev === undefined) delete process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    else process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = prevPepperPrev;
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercelEnv;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;

    vi.restoreAllMocks();
  });

  it('1. Profil default scrypt mematuhi OWASP (N=16384, r=8, p=5) dan seluruh 4 profil OWASP dapat diverifikasi serta ditingkatkan otomatis', async () => {
    process.env.CLOUD_SYNC_PIN_PEPPER = 'synthetic-owasp-preflight-secret-2026';
    expect(SCRYPT_PARAMS.N).toBe(16384);
    expect(SCRYPT_PARAMS.r).toBe(8);
    expect(SCRYPT_PARAMS.p).toBe(5);
    expect(SCRYPT_PARAMS.keylen).toBe(32);

    const activeKid = getPepperKeyId(process.env.CLOUD_SYNC_PIN_PEPPER);
    const profiles = [
      SUPPORTED_OWASP_SCRYPT_PROFILES.owasp_n14_p5,
      SUPPORTED_OWASP_SCRYPT_PROFILES.owasp_n15_p3,
      SUPPORTED_OWASP_SCRYPT_PROFILES.owasp_n16_p2,
      SUPPORTED_OWASP_SCRYPT_PROFILES.owasp_n17_p1,
    ];

    for (const profile of profiles) {
      const hash = hashTeacherPin('SYNTH-OWASP-77', undefined, profile);
      expect(hash).toMatch(new RegExp(`^scrypt\\$v1\\$${profile.N}\\$${profile.r}\\$${profile.p}\\$[a-f0-9]{32}\\$[a-f0-9]{64}$`));

      const validCheck = verifyTeacherPinHash('SYNTH-OWASP-77', hash, {
        existingRecord: { teacherPinHash: hash, pepperKid: activeKid, securitySchemaVersion: 2 },
      });
      expect(validCheck.matched).toBe(true);
      expect(validCheck.needsMigration).toBe(profile.N !== 16384 || profile.p !== 5);

      const wrongCheck = verifyTeacherPinHash('SALAH-OWASP-00', hash, {
        existingRecord: { teacherPinHash: hash, pepperKid: activeKid, securitySchemaVersion: 2 },
      });
      expect(wrongCheck.matched).toBe(false);
    }

    // Simpan profil OWASP N=32768,r=8,p=3 di server lalu verifikasi pull & upgrade transparan ke N=16384,r=8,p=5
    const license = licenseManager.computeSerialLicenseCode('OWASP32K');
    const key = `asesmerdeka:sync:v1:${license}:guru_OWASP_TEST`;
    localDevMemoryStore.set(key, {
      licenseCode: license,
      teacherPinHash: hashTeacherPin('PIN-32K-SYNTH', undefined, SUPPORTED_OWASP_SCRYPT_PROFILES.owasp_n15_p3),
      pepperKid: activeKid,
      ownerDevices: ['DEV-OWASP'],
      deviceId: 'DEV-OWASP',
      revision: 3,
      updatedAt: '2026-11-12T08:00:00.000Z',
      entries: { uji: 'owasp-n15-p3' },
    });

    const pullRes = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-OWASP',
      teacherId: 'OWASP_TEST',
      teacherPin: 'PIN-32K-SYNTH',
    });
    expect(pullRes.statusCode).toBe(200);
    expect(pullRes.body.revision).toBe(3);

    const upgraded = localDevMemoryStore.get(key) as Record<string, unknown>;
    expect(String(upgraded.teacherPinHash)).toMatch(/^scrypt\$v1\$16384\$8\$5\$/);
    expect(upgraded.pepperKid).toBe(activeKid);
    expect(upgraded.revision).toBe(3);
  }, 15000);

  it('2. Kompatibilitas mundur legacy scrypt (N=16384, r=8, p=1), SHA-256, dan plaintext PIN otomatis naik ke profil OWASP', async () => {
    process.env.CLOUD_SYNC_PIN_PEPPER = 'synthetic-legacy-upgrade-pepper-2026';
    const license = licenseManager.computeSerialLicenseCode('LEG63P1');

    // Legacy Task 6.3 hash (N=16384, r=8, p=1) tanpa pepperKid
    const keyScryptP1 = `asesmerdeka:sync:v1:${license}:guru_LEGACY_P1`;
    const legacyP1Hash = hashTeacherPin('PIN-P1-LAMA', undefined, { N: 16384, r: 8, p: 1, keylen: 32 });
    expect(legacyP1Hash).toMatch(/^scrypt\$v1\$16384\$8\$1\$/);
    localDevMemoryStore.set(keyScryptP1, {
      licenseCode: license,
      teacherPinHash: legacyP1Hash,
      deviceId: 'DEV-LEGACY-1',
      revision: 5,
      updatedAt: '2026-11-12T09:00:00.000Z',
      entries: { dokumen: 'Warisan P1' },
    });

    const resP1 = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-LEGACY-1',
      teacherId: 'LEGACY_P1',
      teacherPin: 'PIN-P1-LAMA',
    });
    expect(resP1.statusCode).toBe(200);
    const updatedP1 = localDevMemoryStore.get(keyScryptP1) as Record<string, unknown>;
    expect(String(updatedP1.teacherPinHash)).toMatch(/^scrypt\$v1\$16384\$8\$5\$/);
    expect(updatedP1.pepperKid).toBe(getPepperKeyId(process.env.CLOUD_SYNC_PIN_PEPPER));
    expect(updatedP1.revision).toBe(5);

    // Legacy SHA-256 & plaintext juga terverifikasi & naik ke OWASP N=16384, r=8, p=5
    const keySha = `asesmerdeka:sync:v1:${license}:guru_LEGACY_SHA`;
    localDevMemoryStore.set(keySha, {
      licenseCode: license,
      teacherPinHash: hashTeacherPinLegacySha256('PIN-SHA-OLD'),
      deviceId: 'DEV-LEGACY-2',
      revision: 2,
      entries: { mode: 'sha256' },
    });
    const resSha = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-LEGACY-2',
      teacherId: 'LEGACY_SHA',
      teacherPin: 'PIN-SHA-OLD',
    });
    expect(resSha.statusCode).toBe(200);
    expect(String((localDevMemoryStore.get(keySha) as Record<string, unknown>).teacherPinHash)).toMatch(
      /^scrypt\$v1\$16384\$8\$5\$/
    );
  });

  it('3. Environment produksi tanpa CLOUD_SYNC_PIN_PEPPER (atau pepper lemah/default) ditolak eksplisit dengan HTTP 503', async () => {
    process.env.VERCEL_ENV = 'production';
    expect(isProductionEnvironment()).toBe(true);
    const license = licenseManager.computeSerialLicenseCode('PRODFAIL1');

    // A. Missing pepper
    delete process.env.CLOUD_SYNC_PIN_PEPPER;
    expect(validateProductionPepperConfig().valid).toBe(false);
    expect(() => hashTeacherPin('PIN-1234')).toThrowError(/CLOUD_SYNC_PIN_PEPPER/);

    const missingRes = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-PROD-1',
      teacherPin: 'PIN-1234',
      baseRevision: 0,
      entries: { test: true },
    });
    expect(missingRes.statusCode).toBe(503);
    expect(missingRes.body.ok).toBe(false);
    expect(missingRes.body.pepperMisconfigured).toBe(true);
    expect(missingRes.body.cloudConfigured).toBe(false);
    expect(missingRes.body.reason).toBe('MISSING_PRODUCTION_PEPPER');

    // B. Weak short pepper (< 16 karakter)
    process.env.CLOUD_SYNC_PIN_PEPPER = 'pendek123';
    const weakRes = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-PROD-1',
      teacherPin: 'PIN-1234',
    });
    expect(weakRes.statusCode).toBe(503);
    expect(weakRes.body.pepperMisconfigured).toBe(true);
    expect(weakRes.body.reason).toBe('WEAK_PRODUCTION_PEPPER');

    // C. Default hardcoded dev pepper disalahgunakan di produksi
    process.env.CLOUD_SYNC_PIN_PEPPER = 'asesmerdeka-server-only-pin-pepper-v2-2026';
    const defaultRes = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-PROD-1',
      teacherPin: 'PIN-1234',
    });
    expect(defaultRes.statusCode).toBe(503);
    expect(defaultRes.body.pepperMisconfigured).toBe(true);
    expect(defaultRes.body.reason).toBe('DEFAULT_PEPPER_FORBIDDEN_IN_PRODUCTION');
  });

  it('4. Environment produksi dengan CLOUD_SYNC_PIN_PEPPER valid berfungsi normal & aman', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.CLOUD_SYNC_PIN_PEPPER = 'synthetic-production-32char-pepper-key-ok';

    const license = licenseManager.computeSerialLicenseCode('PRODOK01');
    const pushRes = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-PROD-OK',
      teacherId: 'GURU_PROD',
      teacherPin: 'PROD-PIN-88',
      baseRevision: 0,
      entries: { kelas8: { mapel: 'Matematika' } },
    });
    expect(pushRes.statusCode).toBe(200);
    expect(pushRes.body.revision).toBe(1);

    const pullRes = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-PROD-OK',
      teacherId: 'GURU_PROD',
      teacherPin: 'PROD-PIN-88',
    });
    expect(pullRes.statusCode).toBe(200);
    expect((pullRes.body.entries as Record<string, unknown>).kelas8).toEqual({ mapel: 'Matematika' });
  });

  it('5. Migrasi dari legacy internal pepper ke CLOUD_SYNC_PIN_PEPPER baru & zero-downtime pepper rotation (PREVIOUS -> PRIMARY)', async () => {
    const license = licenseManager.computeSerialLicenseCode('ROTATE01');

    // A. Data dibuat di mode dev lama (tanpa CLOUD_SYNC_PIN_PEPPER -> internal fallback)
    delete process.env.CLOUD_SYNC_PIN_PEPPER;
    const legacyPush = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-ROTATE-1',
      teacherId: 'GURU_MIGRASI',
      teacherPin: 'PIN-WARISAN-99',
      baseRevision: 0,
      entries: { catatan: 'Dibuat sebelum prod pepper' },
    });
    expect(legacyPush.statusCode).toBe(200);

    // Transisi ke Produksi dengan CLOUD_SYNC_PIN_PEPPER v1
    process.env.VERCEL_ENV = 'production';
    const pepperV1 = 'synthetic-prod-pepper-v1-alpha-secret';
    process.env.CLOUD_SYNC_PIN_PEPPER = pepperV1;

    const upgradedPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-ROTATE-1',
      teacherId: 'GURU_MIGRASI',
      teacherPin: 'PIN-WARISAN-99',
    });
    expect(upgradedPull.statusCode).toBe(200);
    const key = `asesmerdeka:sync:v1:${license}:guru_GURU_MIGRASI`;
    const recordAfterV1 = localDevMemoryStore.get(key) as Record<string, unknown>;
    expect(recordAfterV1.pepperKid).toBe(getPepperKeyId(pepperV1));

    // B. Rotasi Pepper v1 -> v2 dengan CLOUD_SYNC_PIN_PEPPER_PREVIOUS (tanpa lockout guru)
    const pepperV2 = 'synthetic-prod-pepper-v2-beta-secret-new';
    process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = pepperV1;
    process.env.CLOUD_SYNC_PIN_PEPPER = pepperV2;

    const wrongDuringRotation = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-ROTATE-1',
      teacherId: 'GURU_MIGRASI',
      teacherPin: 'PIN-SALAH-XX',
    });
    expect(wrongDuringRotation.statusCode).toBe(403);

    const rotatedPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-ROTATE-1',
      teacherId: 'GURU_MIGRASI',
      teacherPin: 'PIN-WARISAN-99',
    });
    expect(rotatedPull.statusCode).toBe(200);
    const recordAfterV2 = localDevMemoryStore.get(key) as Record<string, unknown>;
    expect(recordAfterV2.pepperKid).toBe(getPepperKeyId(pepperV2));

    // Setelah guru login sekali saat masa transisi, CLOUD_SYNC_PIN_PEPPER_PREVIOUS dapat dihapus
    delete process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    const pullPostRotationCleanup = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-ROTATE-1',
      teacherId: 'GURU_MIGRASI',
      teacherPin: 'PIN-WARISAN-99',
    });
    expect(pullPostRotationCleanup.statusCode).toBe(200);
  });

  it('6. Distributed Rate Limiting Redis persisten lintas 2 instance serverless & restart, TTL reset, dan degradasi aman saat Redis outage', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.CLOUD_SYNC_PIN_PEPPER = 'synthetic-ratelimit-prod-pepper-2026';

    const sharedRedisKv = new Map<string, string>();
    const sharedTtlMap = new Map<string, number>();
    const upstash = installPersistentUpstashMock(sharedRedisKv, sharedTtlMap);

    try {
      const license = licenseManager.computeSerialLicenseCode('DISTRL01');
      const setupPush = await invokeCloudSyncApi({
        action: 'push',
        licenseCode: license,
        deviceId: 'DEV-RL-OWNER',
        teacherPin: 'PIN-BENAR-77',
        baseRevision: 0,
        entries: { safe: true },
      });
      expect(setupPush.statusCode).toBe(200);

      const attackerHeaders = { 'x-forwarded-for': '198.51.100.200' };
      const expectedRateKey = getRateLimitKey({ headers: attackerHeaders }, license);
      // Key Redis tidak boleh membocorkan PIN maupun IP mentah
      expect(expectedRateKey).toMatch(/^asesmerdeka:ratelimit:sync:v1:[a-f0-9]{16}:/);
      expect(expectedRateKey).not.toContain('198.51.100.200');
      expect(expectedRateKey).not.toContain('PIN-BENAR-77');

      // Instance 1 mengalami 4 kegagalan autentikasi
      for (let i = 1; i <= 4; i++) {
        const res = await invokeCloudSyncApi(
          { action: 'pull', licenseCode: license, deviceId: 'DEV-RL-OWNER', teacherPin: `BAD-A-${i}` },
          attackerHeaders
        );
        expect(res.statusCode).toBe(403);
      }

      // Simulasikan cold-start / routing ke Instance 2 (hapus Map memori in-process, Redis tetap)
      clearCloudSyncRateLimitStore();

      // Instance 2 mengalami 4 kegagalan lagi -> total 8 di Redis
      for (let i = 5; i <= 8; i++) {
        const res = await invokeCloudSyncApi(
          { action: 'pull', licenseCode: license, deviceId: 'DEV-RL-OWNER', teacherPin: `BAD-B-${i}` },
          attackerHeaders
        );
        expect(res.statusCode).toBe(403);
      }

      // Simulasikan restart sekali lagi (Instance 3 dengan Map lokal kosong) -> percobaan ke-9 harus 429
      clearCloudSyncRateLimitStore();
      const blockedAcrossInstances = await invokeCloudSyncApi(
        { action: 'pull', licenseCode: license, deviceId: 'DEV-RL-OWNER', teacherPin: 'BAD-C-9' },
        attackerHeaders
      );
      expect(blockedAcrossInstances.statusCode).toBe(429);
      expect(blockedAcrossInstances.body.rateLimited).toBe(true);
      expect(Number(blockedAcrossInstances.headers['Retry-After'])).toBeGreaterThan(0);

      // Pastikan Redis TTL kedaluwarsa membuka blokir kembali
      sharedTtlMap.set(expectedRateKey, Date.now() - 1000);
      const afterTtlExpiry = await checkAuthRateLimit(expectedRateKey);
      expect(afterTtlExpiry.limited).toBe(false);

      // Simulasi outage Redis sementara -> rate limiter terdegradasi aman ke fallback lokal tanpa 500
      upstash.setOutage(true);
      const failFallback = await recordFailedAuthAttempt(expectedRateKey);
      expect(failFallback.backend).toBe('memory');
      expect(failFallback.attempts).toBe(1);
      const outagePull = await invokeCloudSyncApi({
        action: 'pull',
        licenseCode: license,
        deviceId: 'DEV-RL-OWNER',
        teacherPin: 'PIN-BENAR-77',
      });
      expect(outagePull.statusCode).toBe(503);
      expect(outagePull.body.redisUnavailable).toBe(true);
    } finally {
      upstash.restore();
    }
  });

  it('7. Isolasi tenant, konflik konkurensi 2 perangkat (HTTP 409 + 3-way merge), dan nol kebocoran rahasia di respons & log', async () => {
    process.env.VERCEL_ENV = 'production';
    const prodPepper = 'synthetic-tenant-isolation-prod-pepper-2026';
    const prevRotPepper = 'synthetic-tenant-prev-pepper-old-2025';
    process.env.CLOUD_SYNC_PIN_PEPPER = prodPepper;
    process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = prevRotPepper;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const sharedRedisKv = new Map<string, string>();
    const upstash = installPersistentUpstashMock(sharedRedisKv);

    try {
      const licenseA = licenseManager.computeSerialLicenseCode('TENANT64A');
      const licenseB = licenseManager.computeSerialLicenseCode('TENANT64B');
      const teacherPin = 'RAHASIA-GURU-64';

      // A. Setup data Perangkat 1 (Revisi 1)
      const profile = makeProfile();
      const tps = makeSampleTPs();
      const harianKey = buildHarianKey(profile);

      licenseManager.activateLicense(licenseA);
      saveSchoolProfile(profile);
      saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);
      const harian = createEmptyKelasHarianData();
      harian.daftarSiswa = [makeSiswa('s-1', 1, 'Candra Putra', '26001')];
      saveKelasHarianData(harianKey, harian);

      const push1 = await pushWorkspaceToCloud(licenseA);
      expect(push1.ok).toBe(true);
      expect(push1.revision).toBe(1);

      // Uji isolasi tenant: lisensi B mencoba membaca workspace A -> tidak pernah mendapat data A
      const crossTenantRes = await invokeCloudSyncApi({
        action: 'pull',
        licenseCode: licenseB,
        deviceId: 'DEV-ATTACKER',
        teacherPin,
      });
      expect(crossTenantRes.body.found).toBe(false);
      expect(JSON.stringify(crossTenantRes.body)).not.toContain('Candra Putra');

      // B. Sesi 2 pull Rev 1, Sesi 1 push Rev 2, lalu Sesi 2 edit berbeda & push (409 Conflict -> Safe Merge -> Rev 3)
      const snapRev1 = snapshotLocalStorage();
      await pullWorkspaceFromCloud(licenseA);
      const snapSession2 = snapshotLocalStorage();

      // Sesi 1 ubah Nilai STS & push -> Rev 2
      restoreLocalStorage(snapRev1);
      await pullWorkspaceFromCloud(licenseA);
      const d1 = getKelasHarianData(harianKey);
      d1.daftarNilai = [
        {
          siswaId: 's-1',
          formatifTPs: { '8.1': 92 },
          nilaiSTS: 91,
          nilaiSAS: 89,
          nilaiPraktik: 90,
          catatanGuru: 'Nilai Perangkat 1',
          statusRapor: 'final',
        },
      ];
      saveKelasHarianData(harianKey, d1);
      const push2 = await pushWorkspaceToCloud(licenseA);
      expect(push2.ok).toBe(true);
      expect(push2.revision).toBe(2);

      // Sesi 2 ubah Presensi & push dari baseRev 1 -> HTTP 409 Conflict + merge
      restoreLocalStorage(snapSession2);
      const d2 = getKelasHarianData(harianKey);
      d2.daftarPresensi = [
        {
          id: 'pres-64-1',
          pertemuanKe: 1,
          tanggal: '2026-11-14',
          statusKeterlaksanaan: 'terlaksana',
          catatanPertemuan: 'Hadir lengkap sesi 2',
          statusMap: { 's-1': 'H' },
        },
      ];
      saveKelasHarianData(harianKey, d2);
      const conflictPush = await pushWorkspaceToCloud(licenseA);
      expect(conflictPush.ok).toBe(false);
      expect(conflictPush.conflict).toBe(true);
      expect(getPendingCloudConflict()).not.toBeNull();
      expect(getPreConflictBackup()).not.toBeNull();

      const resolved = await resolveCloudConflict('merge');
      expect(resolved.ok).toBe(true);
      const merged = getKelasHarianData(harianKey);
      expect(merged.daftarNilai[0]?.nilaiSTS).toBe(91);
      expect(merged.daftarPresensi[0]?.catatanPertemuan).toBe('Hadir lengkap sesi 2');

      // Cek API langsung ber-PIN tidak membocorkan hash/pepper/PIN di respons maupun log
      const pinLicense = licenseManager.computeSerialLicenseCode('NOLSCRT64');
      const directPush = await invokeCloudSyncApi({
        action: 'push',
        licenseCode: pinLicense,
        deviceId: 'DEV-OWNER-VERIFY',
        teacherId: 'GURU_AUDIT',
        teacherPin,
        baseRevision: 0,
        entries: { aman: true },
      });
      expect(directPush.statusCode).toBe(200);

      const directPull = await invokeCloudSyncApi({
        action: 'pull',
        licenseCode: pinLicense,
        deviceId: 'DEV-OWNER-VERIFY',
        teacherId: 'GURU_AUDIT',
        teacherPin,
      });
      expect(directPull.statusCode).toBe(200);

      const combinedSerialized = JSON.stringify({ directPush, directPull });
      expect(combinedSerialized).not.toContain(prodPepper);
      expect(combinedSerialized).not.toContain(prevRotPepper);
      expect(combinedSerialized).not.toContain('scrypt$v1$');
      expect(combinedSerialized).not.toContain('pepperKid');
      expect(combinedSerialized).not.toContain('teacherPinHash');
      expect(combinedSerialized).not.toContain(teacherPin);

      const allConsoleOutput = [
        ...logSpy.mock.calls.flat(),
        ...warnSpy.mock.calls.flat(),
        ...errorSpy.mock.calls.flat(),
      ]
        .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
        .join('\n');
      expect(allConsoleOutput).not.toContain(prodPepper);
      expect(allConsoleOutput).not.toContain(prevRotPepper);
      expect(allConsoleOutput).not.toContain('scrypt$v1$');
      expect(allConsoleOutput).not.toContain(teacherPin);
    } finally {
      upstash.restore();
    }
  });
});
