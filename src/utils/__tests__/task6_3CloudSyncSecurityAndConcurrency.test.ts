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
  exportBackupDataJson,
  saveCustomTPList,
  saveSchoolProfile,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import {
  createEmptyKelasHarianData,
  getKelasHarianData,
  saveKelasHarianData,
  transferStudentRombel,
} from '../kelasHarianStorage';
import type { SiswaItem } from '../../types/kelasHarian';
import * as licenseManager from '../licenseManager';
import {
  getCloudSyncUiStatus,
  getPendingCloudConflict,
  getPreConflictBackup,
  getWorkspaceBaseRevision,
  pullWorkspaceFromCloud,
  pushWorkspaceToCloud,
  resolveCloudConflict,
} from '../cloudSyncManager';

// @ts-expect-error serverless JS handler tested directly with mock req/res
import cloudSyncHandler, {
  clearCloudSyncRateLimitStore,
  clearLocalDevCloudSyncStore,
  hashTeacherPin,
  hashTeacherPinLegacySha256,
  localDevMemoryStore,
} from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS handler tested directly with mock req/res
import activateLicenseHandler, {
  buildSeatRedisKey,
  localRevokedLicensesSet,
  localSeatMemoryStore,
} from '../../../api/activate-license.js';

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_task6_3_uji',
    instansiDinas: 'Dinas Pendidikan Kabupaten Sleman',
    namaSekolah: 'SMP Negeri 3 Sleman',
    alamatSekolah: 'Jl. Magelang Km 10',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    namaKepalaSekolah: 'Drs. Bambang, M.Pd.',
    nipKepalaSekolah: '196702101993031004',
    namaGuru: 'Ibu Sari, S.Pd.',
    nipGuru: '198807152014022003',
    kotaTanggal: 'Sleman',
    ...overrides,
  };
}

function makeSampleTPs(): CustomTPItem[] {
  return [
    {
      id: 'tpid_63_1',
      kode: '8.1',
      materi: 'Bilangan Berpangkat',
      deskripsi: 'Memahami sifat operasi bilangan berpangkat bulat positif.',
    },
    {
      id: 'tpid_63_2',
      kode: '8.2',
      materi: 'Bentuk Akar',
      deskripsi: 'Menyederhanakan operasi bentuk akar kuadrat.',
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
  headers: Record<string, string> = { 'x-forwarded-for': '203.0.113.10' }
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

function installLocalCloudSyncFetchMock() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input.toString();
    if (urlStr.includes('/api/cloud-sync')) {
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : {};
      const result = await invokeCloudSyncApi(parsedBody);
      return {
        ok: result.statusCode >= 200 && result.statusCode < 300,
        status: result.statusCode,
        json: async () => result.body,
      } as Response;
    }
    throw new Error(`Unexpected fetch URL in local mock: ${urlStr}`);
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

/**
 * Simulasi Upstash Redis REST Server persisten di luar `localDevMemoryStore`:
 * Mendukung GET/SET dan Redis Lua EVAL (baik LUA_ATOMIC_CAS_SCRIPT maupun LUA_UPDATE_SECURITY_METADATA_SCRIPT)
 * serta dapat di-toggle untuk mensimulasikan Redis down (HTTP 503) -> pulih (HTTP 200).
 */
function installPersistentUpstashMock(backingRedisKv: Map<string, string>) {
  const originalFetch = globalThis.fetch;
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const backingTtlMap = new Map<string, number>();
  let forceOutage = false;

  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.asesmerdeka.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-upstash-token-redacted';

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input.toString();

    if (urlStr.startsWith('https://mock-upstash.asesmerdeka.test')) {
      if (forceOutage) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: 'Service temporarily unavailable' }),
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
          const existingExpireAt = backingTtlMap.get(key) || 0;
          if (existingExpireAt && now > existingExpireAt) {
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
          // LUA_UPDATE_SECURITY_METADATA_SCRIPT
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

        // LUA_ATOMIC_CAS_SCRIPT
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
          (expectedRev === -1 || currentRev === expectedRev + 1)
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: ['IDEMPOTENT', String(currentRev), currentRaw] }),
          } as Response;
        }

        if (expectedRev < 0) {
          if (currentRev > 0) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ result: ['CONFLICT', String(currentRev), currentRaw] }),
            } as Response;
          }
        } else if (currentRev !== expectedRev) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: ['CONFLICT', String(currentRev), currentRaw] }),
          } as Response;
        }

        backingRedisKv.set(key, nextRecordJson);
        return { ok: true, status: 200, json: async () => ({ result: ['OK', nextRecordJson] }) } as Response;
      }

      if (cmd[0] === 'GET') {
        const key = cmd[1] || '';
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: backingRedisKv.get(key) ?? null }),
        } as Response;
      }

      if (cmd[0] === 'SISMEMBER') {
        return { ok: true, status: 200, json: async () => ({ result: 0 }) } as Response;
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

    throw new Error(`Unexpected fetch URL in persistent Upstash mock: ${urlStr}`);
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
    if (k !== null) {
      const val = localStorage.getItem(k);
      if (val !== null) out[k] = val;
    }
  }
  return out;
}

function restoreLocalStorage(snapshot: Record<string, string>) {
  localStorage.clear();
  for (const [k, v] of Object.entries(snapshot)) {
    localStorage.setItem(k, v);
  }
}

describe('Task 6.3 — Cloud Sync Security, Concurrency, Student Archiving & Redis Staging Recovery', () => {
  const prevPepper = process.env.CLOUD_SYNC_PIN_PEPPER;

  beforeEach(() => {
    localStorage.clear();
    clearLocalDevCloudSyncStore();
    clearCloudSyncRateLimitStore();
    localSeatMemoryStore.clear();
    localRevokedLicensesSet.clear();
    vi.restoreAllMocks();
    delete process.env.CLOUD_SYNC_PIN_PEPPER;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  afterEach(() => {
    if (prevPepper === undefined) delete process.env.CLOUD_SYNC_PIN_PEPPER;
    else process.env.CLOUD_SYNC_PIN_PEPPER = prevPepper;
  });

  it('1. Teacher PIN scrypt KDF (OWASP N=16384, r=8, p=5) menggunakan salt acak unik, server-side pepper, latensi terukur, dan tidak membocorkan hash ke client', async () => {
    process.env.CLOUD_SYNC_PIN_PEPPER = 'synthetic-staging-pepper-only-test';

    const startMs = Date.now();
    const h1 = hashTeacherPin('RAHASIA99');
    const elapsedMs = Date.now() - startMs;
    const h2 = hashTeacherPin('RAHASIA99');

    expect(typeof h1).toBe('string');
    expect(h1).toMatch(/^scrypt\$v1\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
    expect(h2).toMatch(/^scrypt\$v1\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
    expect(h1).not.toBe(h2); // Salt acak per hash menjamin output berbeda
    expect(h1).not.toContain('RAHASIA99');
    expect(elapsedMs).toBeLessThan(1000);

    const license = licenseManager.computeSerialLicenseCode('SCRYPT01');
    const pushRes = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-PIN-TEST',
      teacherId: 'GURU_A',
      teacherPin: 'RAHASIA99',
      baseRevision: 0,
      entries: { testKey: { safe: true } },
    });
    expect(pushRes.statusCode).toBe(200);
    // Pastikan API response bersih dari kebocoran hash/pepper/ownerDevices
    expect(pushRes.body.teacherPinHash).toBeUndefined();
    expect(pushRes.body.teacherPin).toBeUndefined();
    expect(pushRes.body.ownerDevices).toBeUndefined();

    // Ubah server-side pepper -> verifikasi PIN yang sama harus gagal (membuktikan pepper benar-benar aktif)
    process.env.CLOUD_SYNC_PIN_PEPPER = 'different-server-pepper-value';
    const pullWithChangedPepper = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-PIN-TEST',
      teacherId: 'GURU_A',
      teacherPin: 'RAHASIA99',
    });
    expect(pullWithChangedPepper.statusCode).toBe(403);

    // Kembalikan pepper -> pull berhasil dan tidak membocorkan secret
    process.env.CLOUD_SYNC_PIN_PEPPER = 'synthetic-staging-pepper-only-test';
    const pullOk = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-PIN-TEST',
      teacherId: 'GURU_A',
      teacherPin: 'RAHASIA99',
    });
    expect(pullOk.statusCode).toBe(200);
    expect(pullOk.body.teacherPinHash).toBeUndefined();
    expect(pullOk.body.teacherPin).toBeUndefined();
  });

  it('2. Backward compatibility & migrasi transparan dari legacy SHA-256 hash maupun plaintext PIN ke scrypt$v1$', async () => {
    const schoolLicense = licenseManager.computeSerialLicenseCode('MIGRATE02');

    // A. Rekaman warisan Task 6.2 dengan unsalted SHA-256 teacherPinHash
    const legacyKeySha = `asesmerdeka:sync:v1:${schoolLicense}:guru_BUDI_LAMA`;
    const legacyShaHash = hashTeacherPinLegacySha256('PIN-LAMA-77');
    localDevMemoryStore.set(legacyKeySha, {
      licenseCode: schoolLicense,
      teacherPinHash: legacyShaHash,
      deviceId: 'DEV-BUDI-1',
      revision: 4,
      updatedAt: '2026-11-10T01:00:00.000Z',
      entries: { profil: { guru: 'Pak Budi' } },
    });

    const wrongLegacyPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolLicense,
      teacherId: 'BUDI_LAMA',
      teacherPin: 'SALAH-123',
      deviceId: 'DEV-BUDI-1',
    });
    expect(wrongLegacyPull.statusCode).toBe(403);

    const validLegacyPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolLicense,
      teacherId: 'BUDI_LAMA',
      teacherPin: 'PIN-LAMA-77',
      deviceId: 'DEV-BUDI-1',
    });
    expect(validLegacyPull.statusCode).toBe(200);
    expect(validLegacyPull.body.revision).toBe(4);
    expect((validLegacyPull.body.entries as Record<string, unknown>).profil).toEqual({ guru: 'Pak Budi' });

    const migratedShaRecord = localDevMemoryStore.get(legacyKeySha) as Record<string, unknown>;
    expect(String(migratedShaRecord.teacherPinHash)).toMatch(/^scrypt\$v1\$16384\$8\$5\$/);
    expect(migratedShaRecord.revision).toBe(4);

    // B. Rekaman warisan pra-Task 6.2 dengan plaintext teacherPin
    const legacyKeyPlain = `asesmerdeka:sync:v1:${schoolLicense}:guru_SARI_OLD`;
    localDevMemoryStore.set(legacyKeyPlain, {
      licenseCode: schoolLicense,
      teacherPin: 'PIN-SARI-55',
      deviceId: 'DEV-SARI-1',
      revision: 2,
      updatedAt: '2026-11-09T01:00:00.000Z',
      entries: { catatan: 'Data Warisan Plaintext' },
    });

    const validPlainPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolLicense,
      teacherId: 'SARI_OLD',
      teacherPin: 'PIN-SARI-55',
      deviceId: 'DEV-SARI-1',
    });
    expect(validPlainPull.statusCode).toBe(200);
    expect(validPlainPull.body.revision).toBe(2);

    const migratedPlainRecord = localDevMemoryStore.get(legacyKeyPlain) as Record<string, unknown>;
    expect(migratedPlainRecord.teacherPin).toBeUndefined();
    expect(String(migratedPlainRecord.teacherPinHash)).toMatch(/^scrypt\$v1\$16384\$8\$5\$/);
  });

  it('3. Rate limiter brute-force mengembalikan HTTP 429 Too Many Requests setelah percobaan gagal berulang', async () => {
    const license = licenseManager.computeSerialLicenseCode('BRUTE03');
    await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-OWNER',
      teacherPin: 'BENAR-1234',
      baseRevision: 0,
      entries: { secret: 'milik_sah' },
    });

    // 8 percobaan gagal berturut-turut mendapat 403
    for (let i = 1; i <= 8; i++) {
      const attempt = await invokeCloudSyncApi(
        {
          action: 'pull',
          licenseCode: license,
          deviceId: 'DEV-OWNER',
          teacherPin: `TEBAK-${i}`,
        },
        { 'x-forwarded-for': '198.51.100.77' }
      );
      expect(attempt.statusCode).toBe(403);
    }

    // Percobaan ke-9 diblokir dengan 429 Too Many Requests + header Retry-After
    const blockedAttempt = await invokeCloudSyncApi(
      {
        action: 'pull',
        licenseCode: license,
        deviceId: 'DEV-OWNER',
        teacherPin: 'TEBAK-9',
      },
      { 'x-forwarded-for': '198.51.100.77' }
    );
    expect(blockedAttempt.statusCode).toBe(429);
    expect(blockedAttempt.body.rateLimited).toBe(true);
    expect(Number(blockedAttempt.body.retryAfterSeconds)).toBeGreaterThan(0);
    expect(Number(blockedAttempt.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('4. Alur penuh 2 sesi paralel: pull Rev 1 -> A edit nilai & push (Rev 2) -> B edit presensi & push (409) -> Safe Merge -> kedua sesi sinkron Rev 3', async () => {
    const restoreFetch = installLocalCloudSyncFetchMock();
    try {
      const license = licenseManager.computeSerialLicenseCode('FLOW04');
      const profile = makeProfile();
      const tps = makeSampleTPs();
      const harianKey = buildHarianKey(profile);

      // Setup Revisi 1 bersama
      licenseManager.activateLicense(license);
      saveSchoolProfile(profile);
      saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);

      const baseHarian = createEmptyKelasHarianData();
      baseHarian.daftarSiswa = [
        makeSiswa('siswa-1', 1, 'Andi Wijaya', '240101'),
        makeSiswa('siswa-2', 2, 'Bintang Kirana', '240102'),
      ];
      saveKelasHarianData(harianKey, baseHarian);

      const initPush = await pushWorkspaceToCloud(license);
      expect(initPush.ok).toBe(true);
      expect(initPush.revision).toBe(1);

      const snapInitial = JSON.parse(JSON.stringify(localStorage)) as Record<string, string>;
      void snapInitial;
      const snapSharedRev1 = snapshotLocalStorage();

      // Sesi B: melakukan pull Revisi 1
      restoreLocalStorage(snapSharedRev1);
      const pullB = await pullWorkspaceFromCloud(license);
      expect(pullB.ok).toBe(true);
      expect(pullB.revision).toBe(1);
      const snapSessionB = snapshotLocalStorage();

      // Sesi A: melakukan edit Nilai STS siswa-1 dan push -> Revisi 2
      restoreLocalStorage(snapSharedRev1);
      const pullA = await pullWorkspaceFromCloud(license);
      expect(pullA.revision).toBe(1);

      const dataA = getKelasHarianData(harianKey);
      dataA.daftarNilai = [
        {
          siswaId: 'siswa-1',
          formatifTPs: { '8.1': 90 },
          nilaiSTS: 88,
          nilaiSAS: 86,
          nilaiPraktik: 85,
          catatanGuru: 'Nilai dari Perangkat A',
          statusRapor: 'final',
        },
      ];
      saveKelasHarianData(harianKey, dataA);

      const pushA = await pushWorkspaceToCloud(license);
      expect(pushA.ok).toBe(true);
      expect(pushA.revision).toBe(2);

      // Sesi B: tanpa pull Rev 2, mengisi Presensi Pertemuan 1 lalu push -> harus 409 Conflict
      restoreLocalStorage(snapSessionB);
      const dataB = getKelasHarianData(harianKey);
      dataB.daftarPresensi = [
        {
          id: 'pres-1',
          pertemuanKe: 1,
          tanggal: '2026-11-14',
          statusKeterlaksanaan: 'terlaksana',
          catatanPertemuan: 'Presensi dari Perangkat B',
          statusMap: { 'siswa-1': 'H', 'siswa-2': 'I' },
        },
      ];
      saveKelasHarianData(harianKey, dataB);

      const pushBConflict = await pushWorkspaceToCloud(license);
      expect(pushBConflict.ok).toBe(false);
      expect(pushBConflict.conflict).toBe(true);
      expect(pushBConflict.serverRevision).toBe(2);

      // Pastikan data Nilai A di server TETAP aman & data Presensi B lokal TETAP aman
      const localAfter409 = getKelasHarianData(harianKey);
      expect(localAfter409.daftarPresensi).toHaveLength(1);
      expect(localAfter409.daftarPresensi[0].statusMap['siswa-2']).toBe('I');
      expect(getPreConflictBackup()).not.toBeNull();

      const pending = getPendingCloudConflict();
      expect(pending).not.toBeNull();
      expect(pending?.conflicts).toHaveLength(0);

      // Lakukan Safe Merge -> mendorong Revisi 3 berisi Nilai A + Presensi B
      const mergedRes = await resolveCloudConflict('merge_safe');
      expect(mergedRes.ok).toBe(true);
      expect(mergedRes.revision).toBe(3);

      const afterMergeB = getKelasHarianData(harianKey);
      expect(afterMergeB.daftarNilai[0]?.nilaiSTS).toBe(88);
      expect(afterMergeB.daftarPresensi[0]?.statusMap['siswa-1']).toBe('H');
      expect(afterMergeB.daftarPresensi[0]?.statusMap['siswa-2']).toBe('I');

      // Sesi A menarik Revisi 3 -> nilai A & presensi B sama persis
      restoreLocalStorage(snapSharedRev1);
      const pullA3 = await pullWorkspaceFromCloud(license);
      expect(pullA3.ok).toBe(true);
      expect(pullA3.revision).toBe(3);

      const finalDataA = getKelasHarianData(harianKey);
      expect(finalDataA.daftarNilai[0]?.nilaiSTS).toBe(88);
      expect(finalDataA.daftarPresensi[0]?.statusMap['siswa-1']).toBe('H');
      expect(finalDataA.daftarPresensi[0]?.statusMap['siswa-2']).toBe('I');
    } finally {
      restoreFetch();
    }
  });

  it('5. Edge case konflik: tabrakan nilai/presensi, edit field berbeda pada siswa sama, arsip siswa, dan hapus siswa tanpa kehilangan histori', async () => {
    const restoreFetch = installLocalCloudSyncFetchMock();
    try {
      const license = licenseManager.computeSerialLicenseCode('EDGE05');
      const profile = makeProfile();
      const tps = makeSampleTPs();
      const harianKey = buildHarianKey(profile);

      licenseManager.activateLicense(license);
      saveSchoolProfile(profile);
      saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);

      const initialHarian = createEmptyKelasHarianData();
      initialHarian.daftarSiswa = [
        makeSiswa('s-1', 1, 'Candra', '240201'),
        makeSiswa('s-2', 2, 'Dewi', '240202'),
        makeSiswa('s-3', 3, 'Eko', '240203'),
      ];
      initialHarian.daftarPresensi = [
        {
          id: 'p-1',
          pertemuanKe: 1,
          tanggal: '2026-11-10',
          statusKeterlaksanaan: 'terlaksana',
          statusMap: { 's-1': 'H', 's-2': 'H', 's-3': 'H' },
        },
      ];
      initialHarian.daftarNilai = [
        { siswaId: 's-1', formatifTPs: { '8.1': 80 }, nilaiSTS: 75 },
        { siswaId: 's-2', formatifTPs: { '8.1': 85 }, nilaiSTS: 84 },
      ];
      saveKelasHarianData(harianKey, initialHarian);

      await pushWorkspaceToCloud(license); // Rev 1
      const baseSnap = snapshotLocalStorage();

      // Perangkat A: arsipkan s-2 (Dewi pindah rombel), ubah s-1.nama menjadi 'Candra Pratama', ubah s-1 nilaiSTS = 92, ubah presensi s-1 = 'S'
      const dataA = getKelasHarianData(harianKey);
      dataA.daftarSiswa[0] = { ...dataA.daftarSiswa[0], nama: 'Candra Pratama' };
      dataA.daftarNilai[0] = { ...dataA.daftarNilai[0], nilaiSTS: 92 };
      dataA.daftarPresensi[0].statusMap['s-1'] = 'S';
      const archiveRes = transferStudentRombel(profile, dataA, 's-2', '__ARCHIVE__', tps, {
        mode: 'archive',
        catatanMutasi: 'Pindah ke VIII B',
      });
      expect(archiveRes.error).toBeUndefined();
      saveKelasHarianData(harianKey, archiveRes.updated);

      const pushA = await pushWorkspaceToCloud(license);
      expect(pushA.ok).toBe(true); // Rev 2

      // Perangkat B (masih base Rev 1): ubah field berbeda pada siswa sama (s-1.catatanKhusus), ubah nilaiSTS s-1 = 78 (konflik), presensi s-1 = 'A' (konflik), dan hapus s-3
      restoreLocalStorage(baseSnap);
      const dataB = getKelasHarianData(harianKey);
      dataB.daftarSiswa[0] = { ...dataB.daftarSiswa[0], catatanKhusus: 'Perlu pengayaan geometri' };
      dataB.daftarSiswa = dataB.daftarSiswa.filter((s) => s.id !== 's-3');
      dataB.daftarNilai[0] = { ...dataB.daftarNilai[0], nilaiSTS: 78 };
      dataB.daftarPresensi[0].statusMap['s-1'] = 'A';
      saveKelasHarianData(harianKey, dataB);

      const pushB = await pushWorkspaceToCloud(license);
      expect(pushB.conflict).toBe(true);

      const conflictState = getPendingCloudConflict();
      expect(conflictState).not.toBeNull();
      // Pastikan konflik tabrakan terdeteksi untuk nilaiSTS & presensi status s-1
      const stsConflict = conflictState!.conflicts.find(
        (c) => c.locator.kind === 'harian_nilai_field' && c.locator.field === 'nilaiSTS'
      );
      const presConflict = conflictState!.conflicts.find(
        (c) => c.locator.kind === 'harian_presensi_status' && c.locator.siswaId === 's-1'
      );
      expect(stsConflict).toBeDefined();
      expect(presConflict).toBeDefined();

      // Pilih server untuk nilaiSTS (92) & local untuk presensi ('A')
      const resolved = await resolveCloudConflict('merge_safe', {
        choices: {
          [stsConflict!.id]: 'server',
          [presConflict!.id]: 'local',
        },
        allowDefaultForUnchosen: true,
      });
      expect(resolved.ok).toBe(true);
      expect(resolved.revision).toBe(3);

      const finalData = getKelasHarianData(harianKey);
      // 1. s-1 memiliki nama dari A & catatanKhusus dari B (field berbeda tidak saling menimpa)
      const s1 = finalData.daftarSiswa.find((s) => s.id === 's-1');
      expect(s1?.nama).toBe('Candra Pratama');
      expect(s1?.catatanKhusus).toBe('Perlu pengayaan geometri');
      // 2. Konflik nilai & presensi sesuai pilihan user
      expect(finalData.daftarNilai.find((n) => n.siswaId === 's-1')?.nilaiSTS).toBe(92);
      expect(finalData.daftarPresensi[0].statusMap['s-1']).toBe('A');
      // 3. s-2 hanya ada di archivedSiswa (TIDAK duplikat di daftarSiswa), histori nilai s-2 tetap utuh!
      expect(finalData.daftarSiswa.some((s) => s.id === 's-2')).toBe(false);
      expect(finalData.archivedSiswa.some((s) => s.id === 's-2')).toBe(true);
      expect(finalData.daftarNilai.some((n) => n.siswaId === 's-2' && n.nilaiSTS === 84)).toBe(true);
      // 4. s-3 yang dihapus B dan tidak disentuh A tetap terhapus bersih
      expect(finalData.daftarSiswa.some((s) => s.id === 's-3')).toBe(false);
    } finally {
      restoreFetch();
    }
  });

  it('6. Request paralel Promise.all, requestId idempoten, ketahanan restart store, dan Redis 503 -> pulih 200 tanpa kehilangan data', async () => {
    const license = licenseManager.computeSerialLicenseCode('REDIS06');
    const backingRedisKv = new Map<string, string>();
    const upstash = installPersistentUpstashMock(backingRedisKv);

    try {
      // 6A. Push awal dengan Redis mock aktif -> cloudConfigured: true
      const profile = makeProfile();
      licenseManager.activateLicense(license);
      saveSchoolProfile(profile);
      const push1 = await pushWorkspaceToCloud(license);
      expect(push1.ok).toBe(true);
      expect(push1.cloudConfigured).toBe(true);
      expect(push1.revision).toBe(1);
      expect(getCloudSyncUiStatus()).toBe('synced');

      // 6B. Simulasi server restart (kosongkan seluruh Map lokal di Node process) -> pull tetap membaca dari Redis eksternal
      clearLocalDevCloudSyncStore();
      const afterRestartPull = await invokeCloudSyncApi({
        action: 'pull',
        licenseCode: license,
        deviceId: 'DEV-VERIFY-RESTART',
      });
      expect(afterRestartPull.statusCode).toBe(200);
      expect(afterRestartPull.body.found).toBe(true);
      expect(afterRestartPull.body.cloudConfigured).toBe(true);
      expect(afterRestartPull.body.revision).toBe(1);

      // 6C. Simulasi 2 push bersamaan (Promise.all) pada baseRevision yang sama -> tepat 1 menang (200) & 1 ditolak (409)
      const [rA, rB] = await Promise.all([
        invokeCloudSyncApi({
          action: 'push',
          licenseCode: license,
          deviceId: 'DEV-A',
          baseRevision: 1,
          requestId: 'req-concurrent-A',
          entries: { asesmerdeka_school_profile_v1: makeProfile({ namaSekolah: 'Dari A' }) },
        }),
        invokeCloudSyncApi({
          action: 'push',
          licenseCode: license,
          deviceId: 'DEV-B',
          baseRevision: 1,
          requestId: 'req-concurrent-B',
          entries: { asesmerdeka_school_profile_v1: makeProfile({ namaSekolah: 'Dari B' }) },
        }),
      ]);
      const statuses = [rA.statusCode, rB.statusCode].sort();
      expect(statuses).toEqual([200, 409]);

      // 6D. Idempotent retry dengan requestId yang sama -> tidak menaikkan revisi ganda
      const winningDev = rA.statusCode === 200 ? 'DEV-A' : 'DEV-B';
      const winningReq = rA.statusCode === 200 ? 'req-concurrent-A' : 'req-concurrent-B';
      const winningSchool = rA.statusCode === 200 ? 'Dari A' : 'Dari B';
      const idempotentRes = await invokeCloudSyncApi({
        action: 'push',
        licenseCode: license,
        deviceId: winningDev,
        baseRevision: 1,
        requestId: winningReq,
        entries: { asesmerdeka_school_profile_v1: makeProfile({ namaSekolah: winningSchool }) },
      });
      expect(idempotentRes.statusCode).toBe(200);
      expect(idempotentRes.body.idempotent).toBe(true);
      expect(idempotentRes.body.revision).toBe(2);

      // Sinkronkan client lokal ke revisi 2 dulu
      const syncPull2 = await pullWorkspaceFromCloud(license);
      expect(syncPull2.ok).toBe(true);
      expect(getWorkspaceBaseRevision(license, '')).toBe(2);

      // 6E. Simulasi Redis down (HTTP 503) saat guru baru saja mengedit profil lokal -> data lokal aman, status sync_error
      saveSchoolProfile(makeProfile({ namaSekolah: 'SMPN 3 Sleman — Edit Saat Redis Mati' }));
      upstash.setOutage(true);
      const outagePush = await pushWorkspaceToCloud(license);
      expect(outagePush.ok).toBe(false);
      expect(getCloudSyncUiStatus()).toBe('sync_error');
      // Editan lokal tetap utuh
      const localExportDuringOutage = JSON.parse(exportBackupDataJson()) as {
        entries: Record<string, SchoolProfile>;
      };
      expect(localExportDuringOutage.entries['asesmerdeka_school_profile_v1'].namaSekolah).toBe(
        'SMPN 3 Sleman — Edit Saat Redis Mati'
      );

      // 6F. Redis pulih -> push ulang berhasil (Rev 3) dan UI kembali ke 'synced' tanpa kehilangan data
      upstash.setOutage(false);
      const recoveryPush = await pushWorkspaceToCloud(license);
      expect(recoveryPush.ok).toBe(true);
      expect(recoveryPush.cloudConfigured).toBe(true);
      expect(recoveryPush.revision).toBe(3);
      expect(getCloudSyncUiStatus()).toBe('synced');
    } finally {
      upstash.restore();
    }
  });

  it('7. Audit keamanan workspace: lisensi valid/dicabut, seat lock ke-3, PIN benar/salah/kosong, lintas sekolah, dan proteksi tabrakan PIN kolektif sekolah', async () => {
    // 7A. Lisensi Individu terkunci PIN pada :MAIN
    const indivLicense = licenseManager.computeSerialLicenseCode('SECIND07');
    localSeatMemoryStore.set(buildSeatRedisKey(indivLicense), {
      code: indivLicense,
      maxSeats: 2,
      devices: ['DEV-IND-1', 'DEV-IND-2'],
      updatedAt: new Date().toISOString(),
    });

    const createPinned = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: indivLicense,
      deviceId: 'DEV-IND-1',
      teacherPin: 'KODE-PRIBADI-77',
      baseRevision: 0,
      entries: { privateDoc: 'Rahasia Guru Individu' },
    });
    expect(createPinned.statusCode).toBe(200);

    // Omitting PIN maupun wrong PIN pada workspace Individu yang dilindungi PIN wajib 403
    const missingPinPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: indivLicense,
      deviceId: 'DEV-IND-2',
    });
    expect(missingPinPull.statusCode).toBe(403);

    const wrongPinPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: indivLicense,
      deviceId: 'DEV-IND-2',
      teacherPin: 'PIN-SALAH-99',
    });
    expect(wrongPinPull.statusCode).toBe(403);

    // Seat lock perangkat ke-3 meskipun PIN benar wajib 403
    const seatLockThirdDev = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: indivLicense,
      deviceId: 'DEV-IND-3-PENYUSUP',
      teacherPin: 'KODE-PRIBADI-77',
    });
    expect(seatLockThirdDev.statusCode).toBe(403);
    expect(seatLockThirdDev.body.seatLimitExceeded).toBe(true);

    // Perangkat ke-2 yang sah + PIN benar mendapat 200
    const legitDev2Pull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: indivLicense,
      deviceId: 'DEV-IND-2',
      teacherPin: 'KODE-PRIBADI-77',
    });
    expect(legitDev2Pull.statusCode).toBe(200);
    expect((legitDev2Pull.body.entries as Record<string, unknown>).privateDoc).toBe(
      'Rahasia Guru Individu'
    );

    // 7B. Lisensi Kolektif Sekolah: dua perangkat Guru A (Laptop + HP) boleh sync pada PIN yang sama,
    // tetapi perangkat ke-3 (Guru B yang tidak sengaja memakai PIN persis sama) diblokir 403 (pinCollisionProtected)
    const schoolA = licenseManager.computeSerialLicenseCode('SCHA07');
    const schoolB = licenseManager.computeSerialLicenseCode('SCHB07');

    // Aktifkan 3 kursi untuk schoolA via handler resmi aktivasi
    for (const dev of ['DEV-A-LAPTOP', 'DEV-A-HP', 'DEV-B-COLLISION']) {
      let st = 200;
      await activateLicenseHandler(
        { method: 'POST', headers: {}, body: { licenseCode: schoolA, deviceId: dev } },
        {
          setHeader() {},
          status(c: number) {
            st = c;
            return this;
          },
          json() {
            return this;
          },
        }
      );
      expect(st).toBe(200);
    }

    const pushLaptop = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: schoolA,
      deviceId: 'DEV-A-LAPTOP',
      teacherPin: 'BUDI12',
      baseRevision: 0,
      entries: { mapel: 'Matematika Pak Budi' },
    });
    expect(pushLaptop.statusCode).toBe(200);

    const pullHp = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolA,
      deviceId: 'DEV-A-HP',
      teacherPin: 'BUDI12',
    });
    expect(pullHp.statusCode).toBe(200);

    // Perangkat ke-3 milik guru lain yang mengetik PIN identik ditolak 403 pinCollisionProtected
    const pullThirdTeacherSamePin = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolA,
      deviceId: 'DEV-B-COLLISION',
      teacherPin: 'BUDI12',
    });
    expect(pullThirdTeacherSamePin.statusCode).toBe(403);
    expect(pullThirdTeacherSamePin.body.pinCollisionProtected).toBe(true);

    // 7C. Isolasi lintas sekolah (schoolB tidak bisa mengakses data schoolA meskipun memakai PIN identik)
    const crossSchoolPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolB,
      deviceId: 'DEV-OTHER-SCHOOL',
      teacherPin: 'BUDI12',
    });
    expect(crossSchoolPull.statusCode).toBe(200);
    expect(crossSchoolPull.body.found).toBe(false);

    // 7D. Akses tanpa izin / record lisensi tidak cocok (tampered record) & pencabutan lisensi
    const keySchoolB = `asesmerdeka:sync:v1:${schoolB}:guru_TAMPERED`;
    localDevMemoryStore.set(keySchoolB, {
      licenseCode: schoolA, // licenseCode pada record tidak cocok dengan path schoolB
      teacherPinHash: hashTeacherPin('TAMPERED'),
      revision: 1,
      entries: { stolen: true },
    });
    const tamperedAttempt = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolB,
      deviceId: 'DEV-OTHER-SCHOOL',
      teacherPin: 'TAMPERED',
    });
    expect(tamperedAttempt.statusCode).toBe(403);

    localRevokedLicensesSet.add(schoolA);
    const revokedPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolA,
      deviceId: 'DEV-A-LAPTOP',
      teacherPin: 'BUDI12',
    });
    expect(revokedPull.statusCode).toBe(403);
    expect(revokedPull.body.revoked).toBe(true);
  });
});
