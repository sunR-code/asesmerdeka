import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
  getSchoolProfile,
  getSavedCustomTPList,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import {
  applyNewStudentRoster,
  createEmptyKelasHarianData,
  getKelasHarianData,
  saveKelasHarianData,
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
  saveTeacherSyncPin,
  type HonestCloudStatus,
} from '../cloudSyncManager';
import { TopHeader } from '../../components/layout/TopHeader';
import { LicenseModal } from '../../components/LicenseModal';
// @ts-expect-error serverless JS handler tested directly with mock req/res
import cloudSyncHandler, { clearCloudSyncRateLimitStore, clearLocalDevCloudSyncStore } from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS store cleared for isolation
import activateLicenseHandler, {
  generateStagingLicenseCode,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  localStagingRevokedLicensesSet,
} from '../../../api/activate-license.js';

const MOCK_REDIS_URL = 'https://staging-sim-redis.upstash.test';
const MOCK_REDIS_TOKEN = 'synthetic-upstash-token-task713b-do-not-leak';
const MOCK_PEPPER = 'Stg713B!CloudSyncPepper#2026_Entropy987654321';
const MOCK_STAGING_SIGNING_SECRET = 'Task713B2_StagingLicenseSigningSecret_32PlusChars_OK';

type RedisFailureMode = 'normal' | 'timeout' | 'http_401' | 'http_403' | 'http_500' | 'corrupt_endpoint_200';

class SimulatedUpstashStore {
  kv = new Map<string, string>();
  rateLimits = new Map<string, { count: number; expiresAt: number }>();
  mode: RedisFailureMode = 'normal';

  async handleRedisFetch(url: string, init?: RequestInit): Promise<Response> {
    if (this.mode === 'timeout') {
      const err = new Error(`Request aborted contacting ${MOCK_REDIS_URL}`);
      err.name = 'AbortError';
      throw err;
    }
    if (this.mode === 'http_401') {
      return new Response(
        JSON.stringify({ error: `Unauthorized token=${MOCK_REDIS_TOKEN} url=${MOCK_REDIS_URL}` }),
        { status: 401 }
      );
    }
    if (this.mode === 'http_403') {
      return new Response(
        JSON.stringify({ error: `Forbidden token=${MOCK_REDIS_TOKEN}` }),
        { status: 403 }
      );
    }
    if (this.mode === 'http_500') {
      return new Response(JSON.stringify({ error: 'Internal Redis error' }), { status: 500 });
    }

    if (url.includes('/get/')) {
      const key = decodeURIComponent(url.split('/get/')[1] || '');
      const val = this.kv.has(key) ? this.kv.get(key)! : null;
      return new Response(JSON.stringify({ result: val }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (init?.method === 'POST' && init.body) {
      const cmd = JSON.parse(String(init.body)) as unknown[];
      if (cmd[0] === 'EVAL') {
        const script = String(cmd[1] || '');
        const key = String(cmd[3] || '');

        if (script.includes('ASESMERDEKA_RATE_LIMIT_V1')) {
          const op = String(cmd[4] || 'CHECK');
          const windowMs = Number(cmd[5]) || 300000;
          const now = Date.now();
          if (op === 'RESET') {
            this.rateLimits.delete(key);
            return new Response(JSON.stringify({ result: [0, 0] }), { status: 200 });
          }
          const existing = this.rateLimits.get(key);
          if (op === 'CHECK') {
            if (!existing || now > existing.expiresAt) {
              return new Response(JSON.stringify({ result: [0, -1] }), { status: 200 });
            }
            return new Response(JSON.stringify({ result: [existing.count, existing.expiresAt - now] }), {
              status: 200,
            });
          }
          if (op === 'RECORD_FAIL') {
            const count = !existing || now > existing.expiresAt ? 1 : existing.count + 1;
            const expiresAt = !existing || now > existing.expiresAt ? now + windowMs : existing.expiresAt;
            this.rateLimits.set(key, { count, expiresAt });
            return new Response(JSON.stringify({ result: [count, expiresAt - now] }), { status: 200 });
          }
        }

        // LUA_ATOMIC_CAS_SCRIPT & LUA_UPDATE_SECURITY_METADATA_SCRIPT
        const arg1 = cmd[4];
        const arg2 = cmd[5];
        if (script.includes('STALE') && typeof arg2 === 'string') {
          const currentRaw = this.kv.get(key);
          if (!currentRaw) return new Response(JSON.stringify({ result: ['MISSING'] }), { status: 200 });
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(currentRaw);
          } catch {
            return new Response(JSON.stringify({ result: ['MISSING'] }), { status: 200 });
          }
          if (Number(parsed.revision || 1) !== Number(arg1)) {
            return new Response(JSON.stringify({ result: ['STALE'] }), { status: 200 });
          }
          this.kv.set(key, arg2);
          return new Response(JSON.stringify({ result: ['OK'] }), { status: 200 });
        }

        const expectedRev = Number(arg1);
        const nextJson = String(arg2 || '');
        const reqId = String(cmd[6] || '');
        const reqHash = String(cmd[7] || '');
        const reqDevice = String(cmd[8] || '');
        const currentRaw = this.kv.get(key);

        if (!currentRaw) {
          if (!Number.isNaN(expectedRev) && expectedRev > 0) {
            return new Response(JSON.stringify({ result: ['CONFLICT', '0', ''] }), { status: 200 });
          }
          this.kv.set(key, nextJson);
          return new Response(JSON.stringify({ result: ['OK', nextJson] }), { status: 200 });
        }

        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = JSON.parse(currentRaw);
        } catch {
          parsed = null;
        }
        if (!parsed || typeof parsed !== 'object') {
          if (!Number.isNaN(expectedRev) && expectedRev > 0) {
            return new Response(JSON.stringify({ result: ['CONFLICT', '1', currentRaw] }), { status: 200 });
          }
          this.kv.set(key, nextJson);
          return new Response(JSON.stringify({ result: ['OK', nextJson] }), { status: 200 });
        }

        const curRev = Number(parsed.revision) || 1;
        if (reqId && parsed.lastRequestId === reqId) {
          return new Response(JSON.stringify({ result: ['IDEMPOTENT', String(curRev), currentRaw] }), {
            status: 200,
          });
        }
        if (
          reqHash &&
          parsed.lastContentHash === reqHash &&
          parsed.deviceId === reqDevice &&
          (expectedRev === -1 || curRev === expectedRev + 1)
        ) {
          return new Response(JSON.stringify({ result: ['IDEMPOTENT', String(curRev), currentRaw] }), {
            status: 200,
          });
        }
        if (expectedRev < 0 ? curRev > 0 : curRev !== expectedRev) {
          return new Response(JSON.stringify({ result: ['CONFLICT', String(curRev), currentRaw] }), {
            status: 200,
          });
        }
        this.kv.set(key, nextJson);
        return new Response(JSON.stringify({ result: ['OK', nextJson] }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ error: 'Unsupported simulated Redis call' }), { status: 400 });
  }
}

async function invokeCloudSyncApi(body: Record<string, unknown>, ip = '10.71.3.20') {
  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  const headers: Record<string, string> = {};
  const req = {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body,
  };
  const res = {
    setHeader(k: string, v: string) {
      headers[k] = v;
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
  };
  await cloudSyncHandler(req, res);
  return { statusCode, body: responseBody, headers };
}

async function invokeActivateLicenseApi(body: Record<string, unknown>, ip = '10.71.3.20') {
  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  const headers: Record<string, string> = {};
  const req = {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body,
  };
  const res = {
    setHeader(k: string, v: string) {
      headers[k] = v;
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
  };
  const savedRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    await activateLicenseHandler(req, res);
  } finally {
    if (savedRedisUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = savedRedisUrl;
    if (savedRedisToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = savedRedisToken;
  }
  return { statusCode, body: responseBody, headers };
}

async function activateStagingLicenseForTest(code: string) {
  await licenseManager.verifyMayarLicenseOnline(code);
  return licenseManager.activateLicense(code);
}

function seedSyntheticWorkspace(suffix = '001') {
  const profile: SchoolProfile = {
    schoolId: `sch_staging_713b_${suffix}`,
    instansiDinas: 'Dinas Pendidikan Uji Staging',
    namaSekolah: 'Sekolah Uji CloudSync',
    alamatSekolah: 'Jl. Pengujian Staging No. 1',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'Kelas VIII A',
    daftarRombel: ['Kelas VIII A'],
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    namaKepalaSekolah: 'Kepala Sekolah Uji Staging',
    nipKepalaSekolah: '197001010000000001',
    namaGuru: 'Guru Uji Staging',
    nipGuru: '198801010000000002',
    kotaTanggal: 'Jakarta Uji',
  };
  saveSchoolProfile(profile);

  const tps: CustomTPItem[] = [
    {
      id: `tp_stg_${suffix}`,
      kode: 'STAGING-TP-001',
      materiPokok: 'Aljabar Linear Sintetis',
      tujuanPembelajaran: 'Peserta didik menyelesaikan persamaan linear uji sintetis.',
      subTP: [],
      alokasiJP: 8,
      mingguEfektif: 2,
      sumber: 'manual',
    },
  ];
  saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);

  const baseData = createEmptyKelasHarianData(profile, tps);
  const students: SiswaItem[] = [
    { id: 'stg-s1', noUrut: 1, nis: '99001', nama: 'Siswa Sintetis Satu', jenisKelamin: 'L' },
    { id: 'stg-s2', noUrut: 2, nis: '99002', nama: 'Siswa Sintetis Dua', jenisKelamin: 'P' },
  ];
  const populated = applyNewStudentRoster(baseData, students, tps, true, {
    source: 'user_manual',
    initializeEmptyScores: true,
  });
  populated.daftarPresensi = [
    { id: 'stg-p1', pertemuanKe: 1, tanggal: '2026-11-15', statusMap: { 'stg-s1': 'H', 'stg-s2': 'I' } },
  ];
  populated.daftarJurnal = [
    {
      id: 'STAGING-JOURNAL-001',
      tanggal: '2026-11-15',
      pertemuanKe: 1,
      materiPokok: 'Aljabar Linear Sintetis',
      tujuanPembelajaran: 'STAGING-TP-001',
      kegiatanSingkat: 'Latihan persamaan linear sintetis STAGING-JOURNAL-001',
      refleksiHambatan: 'Semua siswa uji aktif.',
      statusTercapai: 'Tercapai Penuh',
    },
  ];
  populated.daftarNilai = populated.daftarNilai.map((row) =>
    row.siswaId === 'stg-s1'
      ? { ...row, nilaiFormatif: { 'STAGING-TP-001': 88 }, nilaiSTS: 90, nilaiSAS: 86 }
      : { ...row, nilaiFormatif: { 'STAGING-TP-001': 80 }, nilaiSTS: 82, nilaiSAS: 84 }
  );
  saveKelasHarianData(profile, populated);

  return { profile, tps };
}

describe('Task 7.1.3B — Live Contract Audit, Outage & Recovery Matrix, dan Synthetic Cloud Sync E2E (Mocked Upstash)', () => {
  const envBackup = { ...process.env };
  const originalFetch = globalThis.fetch;
  let sim: SimulatedUpstashStore;

  beforeEach(() => {
    localStorage.clear();
    clearLocalDevCloudSyncStore();
    clearCloudSyncRateLimitStore();
    localRevokedLicensesSet.clear();
    localStagingRevokedLicensesSet.clear();
    localSeatMemoryStore.clear();

    sim = new SimulatedUpstashStore();
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    process.env.NODE_ENV = 'production';
    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;
    process.env.CLOUD_SYNC_PIN_PEPPER = MOCK_PEPPER;
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = MOCK_STAGING_SIGNING_SECRET;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr === '/api/activate-license') {
        const payload = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        const out = await invokeActivateLicenseApi(payload);
        return new Response(JSON.stringify(out.body), {
          status: out.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (urlStr === '/api/cloud-sync') {
        if (sim.mode === 'corrupt_endpoint_200') {
          return new Response('<html>502 Corrupted Proxy Payload', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
        const payload = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        const out = await invokeCloudSyncApi(payload);
        return new Response(JSON.stringify(out.body), {
          status: out.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (urlStr.startsWith(MOCK_REDIS_URL)) {
        return sim.handleRedisFetch(urlStr, init);
      }
      return new Response(JSON.stringify({ error: 'Unexpected fetch target' }), { status: 404 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...envBackup };
    vi.restoreAllMocks();
  });

  it('Skenario A, B, C, D, G (Synthetic Harness): Upload -> Cross-session clean restore -> Konflik OCC 409 -> Merge Safe -> Data lokal utuh', async () => {
    const schoolLicense = generateStagingLicenseCode('SK26', 'SEKOLAH713B');
    const pinGuru = 'GURU_UJI_STAGING:STG99';
    localStorage.setItem('asesmerdeka_device_id', 'DEV-STAGING-LAPTOP');
    await activateStagingLicenseForTest(schoolLicense);
    saveTeacherSyncPin(pinGuru);
    localStorage.setItem('unrelated_user_note', 'keep-untouched-local-preference');

    const { profile, tps } = seedSyntheticWorkspace('001');

    // A. Initial Push
    const push1 = await pushWorkspaceToCloud();
    expect(push1.ok).toBe(true);
    expect(push1.cloudConfigured).toBe(true);
    expect(push1.revision).toBe(1);
    expect(getCloudSyncUiStatus()).toBe('synced');

    // Verify Redis key structure & hashed PIN (never plaintext PIN)
    const redisKey = `asesmerdeka:sync:v1:${schoolLicense.replace(/-/g, '_')}:guru_GURU_UJI_STAGING`;
    // Note: sanitizeKeySegment keeps '-' so let's locate by prefix
    const storedKeys = Array.from(sim.kv.keys()).filter((k) => k.startsWith(`asesmerdeka:sync:v1:${schoolLicense}:`));
    expect(storedKeys).toHaveLength(1);
    const storedJson = JSON.parse(sim.kv.get(storedKeys[0])!);
    expect(storedJson.revision).toBe(1);
    expect(storedJson.teacherPin).toBeUndefined();
    expect(String(storedJson.teacherPinHash)).toMatch(/^scrypt\$v1\$16384\$8\$5\$/);
    expect(redisKey).not.toBe('');

    // Simulate serverless restart (clear all in-memory stores) + clean browser localStorage
    clearLocalDevCloudSyncStore();
    localStorage.clear();
    localStorage.setItem('asesmerdeka_device_id', 'DEV-STAGING-HP');
    await activateStagingLicenseForTest(schoolLicense);
    saveTeacherSyncPin(pinGuru);

    // B & C. Cross-session clean Pull Restore
    const pullClean = await pullWorkspaceFromCloud();
    expect(pullClean.ok).toBe(true);
    expect(pullClean.found).toBe(true);
    expect(pullClean.revision).toBe(1);
    expect(getCloudSyncUiStatus()).toBe('synced');

    const restoredProfile = getSchoolProfile();
    expect(restoredProfile.namaSekolah).toBe('Sekolah Uji CloudSync');
    expect(restoredProfile.namaGuru).toBe('Guru Uji Staging');
    const restoredTps = getSavedCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, restoredProfile);
    expect(restoredTps.map((t) => t.kode)).toEqual(['STAGING-TP-001']);
    const restoredHarian = getKelasHarianData(restoredProfile, restoredTps);
    expect(restoredHarian.daftarJurnal.map((j) => j.id)).toEqual(['STAGING-JOURNAL-001']);
    expect(restoredHarian.daftarNilai.find((n) => n.siswaId === 'stg-s1')?.nilaiFormatif['STAGING-TP-001']).toBe(88);

    // D. Concurrent edit on same Rev #1 -> Session A pushes Rev #2, Session B stale push gets 409
    const sessionBSnap: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      sessionBSnap[k] = localStorage.getItem(k)!;
    }

    // Session A edits grade 88 -> 94 and pushes
    const dataA = getKelasHarianData(restoredProfile, restoredTps);
    dataA.daftarNilai = dataA.daftarNilai.map((n) =>
      n.siswaId === 'stg-s1' ? { ...n, nilaiFormatif: { 'STAGING-TP-001': 94 } } : n
    );
    saveKelasHarianData(restoredProfile, dataA);
    const pushA = await pushWorkspaceToCloud();
    expect(pushA.ok).toBe(true);
    expect(pushA.revision).toBe(2);

    // Session B restores its Rev #1 local state, edits presensi, pushes stale Rev #1 -> 409 Conflict
    localStorage.clear();
    for (const [k, v] of Object.entries(sessionBSnap)) {
      localStorage.setItem(k, v);
    }
    const dataB = getKelasHarianData(restoredProfile, restoredTps);
    dataB.daftarPresensi[0].statusMap['stg-s2'] = 'A';
    saveKelasHarianData(restoredProfile, dataB);

    const pushB = await pushWorkspaceToCloud();
    expect(pushB.ok).toBe(false);
    expect(pushB.conflict).toBe(true);
    expect(pushB.statusCode).toBe(409);
    expect(pushB.serverRevision).toBe(2);
    expect(getCloudSyncUiStatus()).toBe('conflict');
    expect(getPendingCloudConflict()).not.toBeNull();
    expect(getPreConflictBackup()).not.toBeNull();

    // Server record was NOT silently overwritten
    const serverAfterConflict = JSON.parse(sim.kv.get(storedKeys[0])!);
    expect(serverAfterConflict.revision).toBe(2);

    // Safe merge resolves conflict to Rev #3 combining A's score (94) and B's attendance ('A')
    const merged = await resolveCloudConflict('merge_safe', { allowDefaultForUnchosen: true });
    expect(merged.ok).toBe(true);
    expect(merged.revision).toBe(3);
    expect(getCloudSyncUiStatus()).toBe('synced');
    const finalHarian = getKelasHarianData(restoredProfile, tps);
    expect(finalHarian.daftarPresensi[0].statusMap['stg-s2']).toBe('A');
    expect(finalHarian.daftarNilai.find((n) => n.siswaId === 'stg-s1')?.nilaiFormatif['STAGING-TP-001']).toBe(94);
  });

  it('Skenario E & F: User isolation lintas akun/PIN dan penolakan akses tidak sah tanpa kebocoran data', async () => {
    const schoolLicense = generateStagingLicenseCode('SK26', 'SEKOLAHISO713B');
    const indivA = generateStagingLicenseCode('GM26', 'STGUSERA713B');
    const indivB = generateStagingLicenseCode('GM26', 'STGUSERB713B');

    // Seed User A and User B on school license + separate individual licenses
    const pushUserA = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: schoolLicense,
      teacherPin: 'GURU_ALFA:PIN111',
      deviceId: 'DEV-ALFA',
      baseRevision: 0,
      entries: { asesmerdeka_school_profile: { namaSekolah: 'Rahasia Guru Alfa' } },
    });
    expect(pushUserA.statusCode).toBe(200);

    const pushUserB = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: schoolLicense,
      teacherPin: 'GURU_BETA:PIN222',
      deviceId: 'DEV-BETA',
      baseRevision: 0,
      entries: { asesmerdeka_school_profile: { namaSekolah: 'Rahasia Guru Beta' } },
    });
    expect(pushUserB.statusCode).toBe(200);

    const pushIndivB = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: indivB,
      deviceId: 'DEV-INDIV-B',
      baseRevision: 0,
      entries: { secretB: 'Milik B Saja' },
    });
    expect(pushIndivB.statusCode).toBe(200);

    // 1. User A cannot read User B's namespace with wrong PIN (1 try)
    const wrongPinRead = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolLicense,
      teacherPin: 'GURU_BETA:SALAH_PIN',
      deviceId: 'DEV-ALFA',
    });
    expect(wrongPinRead.statusCode).toBe(403);
    expect(wrongPinRead.body.ok).toBe(false);
    expect(wrongPinRead.body.entries).toBeUndefined();

    // 2. User A cannot overwrite User B's namespace even sending baseRevision: 1
    const crossOverwrite = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: schoolLicense,
      teacherPin: 'GURU_BETA:PIN111',
      deviceId: 'DEV-ALFA',
      baseRevision: 1,
      entries: { hacked: true },
    });
    expect(crossOverwrite.statusCode).toBe(403);

    // 3. Individual A cannot see Individual B
    const crossIndiv = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: indivA,
      deviceId: 'DEV-INDIV-B',
    });
    expect(crossIndiv.statusCode).toBe(200);
    expect(crossIndiv.body.found).toBe(false);

    // 4. Unauthenticated / missing code / invalid license / invalid baseRevision
    const noLicense = await invokeCloudSyncApi({ action: 'pull' });
    expect(noLicense.statusCode).toBe(400);

    const badLicense = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: 'ASM-GM26-FAKE-FAKE-FAKE',
      deviceId: 'DEV-FAKE',
    });
    expect(badLicense.statusCode).toBe(403);
    expect(badLicense.body.entries).toBeUndefined();

    const invalidRev = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: indivB,
      deviceId: 'DEV-INDIV-B',
      baseRevision: -5,
      entries: { x: 1 },
    });
    expect(invalidRev.statusCode).toBe(400);
  });

  it('Section 4 Outage & Recovery: Timeout, HTTP 401/403, HTTP 5xx, Corrupt Payload, & Recovery aman tanpa hilang data lokal', async () => {
    const license = generateStagingLicenseCode('GM26', 'OUTAGE713B');
    localStorage.setItem('asesmerdeka_device_id', 'DEV-OUTAGE-TEST');
    await activateStagingLicenseForTest(license);
    seedSyntheticWorkspace('OUT');

    // Seed initial Rev #1 while healthy
    const healthyPush = await pushWorkspaceToCloud();
    expect(healthyPush.ok).toBe(true);
    expect(healthyPush.revision).toBe(1);
    expect(getCloudSyncUiStatus()).toBe('synced');

    // Mutate local data before outages
    localStorage.setItem('asesmerdeka_harian_sentinel', JSON.stringify({ grade: 95, marker: 'KEEP_LOCAL' }));
    const outageModes: Array<{ label: string; mode: RedisFailureMode }> = [
      { label: 'Redis timeout', mode: 'timeout' },
      { label: 'Upstash HTTP 401', mode: 'http_401' },
      { label: 'Upstash HTTP 403', mode: 'http_403' },
      { label: 'Upstash HTTP 500', mode: 'http_500' },
      { label: 'Corrupt endpoint payload', mode: 'corrupt_endpoint_200' },
    ];

    for (const step of outageModes) {
      sim.mode = step.mode;
      const failedPush = await pushWorkspaceToCloud();
      expect(failedPush.ok, step.label).toBe(false);
      expect(getCloudSyncUiStatus(), step.label).toBe('sync_error');
      expect(failedPush.message).not.toContain(MOCK_REDIS_TOKEN);
      expect(failedPush.message).not.toContain(MOCK_REDIS_URL);
      // Local data untouched
      expect(localStorage.getItem('asesmerdeka_harian_sentinel')).toContain('KEEP_LOCAL');
      expect(getWorkspaceBaseRevision(license, '')).toBe(1);
    }

    // Corrupt Redis record stored directly at workspace key:
    sim.mode = 'normal';
    const rawKey = Array.from(sim.kv.keys()).find((k) => k.startsWith(`asesmerdeka:sync:v1:${license}:`))!;
    const validBackupJson = sim.kv.get(rawKey)!;
    sim.kv.set(rawKey, '{BROKEN_JSON_STORED_IN_REDIS');

    // Stale/incremental push with baseRevision=1 against corrupt stored record must fail-safe with 409 Conflict, NEVER overwrite!
    const pushOverCorrupt = await pushWorkspaceToCloud();
    expect(pushOverCorrupt.ok).toBe(false);
    expect(pushOverCorrupt.conflict).toBe(true);
    expect(pushOverCorrupt.statusCode).toBe(409);
    expect(sim.kv.get(rawKey)).toBe('{BROKEN_JSON_STORED_IN_REDIS');

    // Restore valid Rev #1 in Redis, clear pending conflict & retry push -> Recovery succeeds at Rev #2
    sim.kv.set(rawKey, validBackupJson);
    const resolvedAfterCorrupt = await resolveCloudConflict('force_local');
    expect(resolvedAfterCorrupt.ok).toBe(true);
    expect(resolvedAfterCorrupt.revision).toBe(2);
    expect(getCloudSyncUiStatus()).toBe('synced');
  });

  it('Section 5 UI Status Fidelity: TopHeader & LicenseModal menampilkan seluruh indikator jujur (tidak pernah klaim Tersinkron saat error/unconfigured)', async () => {
    const profile = getSchoolProfile();
    const expectedLabels: Array<[HonestCloudStatus, string]> = [
      ['local', 'Tersimpan lokal'],
      ['unconfigured', 'Cloud belum dikonfigurasi'],
      ['syncing', 'Menyinkronkan...'],
      ['synced', 'Lokal &amp; cloud'],
      ['conflict', 'Konflik Cloud'],
      ['reverify_required', 'Verifikasi PIN Cloud'],
      ['sync_error', 'Hanya lokal'],
    ];

    for (const [status, text] of expectedLabels) {
      const html = renderToStaticMarkup(
        React.createElement(TopHeader, {
          pageSection: 'Kelas Harian',
          pageTitle: 'Presensi siswa',
          schoolProfile: profile,
          storageStatus: status,
          onOpenSchoolModal: vi.fn(),
          onToggleMobileSidebar: vi.fn(),
        })
      );
      expect(html).toContain(text);
    }

    // Render LicenseModal when cloudConfigured=true and lastSyncAt present vs sync_error
    const lic = generateStagingLicenseCode('GM26', 'UICHECK713B');
    localStorage.setItem('asesmerdeka_device_id', 'DEV-UI-1');
    await activateStagingLicenseForTest(lic);
    localStorage.setItem('asesmerdeka_cloud_configured_v1', 'true');
    localStorage.setItem('asesmerdeka_cloud_last_sync_at_v1', '2026-11-15T10:00:00.000Z');
    localStorage.setItem('asesmerdeka_cloud_last_sync_error_v1', 'true');

    const errModalHtml = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: vi.fn(),
        quota: licenseManager.getUserQuota(),
        onUpdateQuota: vi.fn(),
      })
    );
    expect(errModalHtml).toContain('Sinkronisasi Terkendala / Server Tidak Tersedia');
    expect(errModalHtml).not.toContain('✓ Tersinkron');
  });

  it('Task 7.1.3C.2 Regression: Perubahan Jurnal lokal setelah HTTP 409 pertama tidak hilang saat merge_safe dan terkonvergensi ke Device B', async () => {
    const schoolLicense = generateStagingLicenseCode('SK26', 'CONVERGE713C2');
    const pin = 'ALFA_713C2:PIN713C2';
    const snapshotLocal = () => {
      const m = new Map<string, string>();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        m.set(k, localStorage.getItem(k)!);
      }
      return m;
    };
    const restoreLocal = (m: Map<string, string>) => {
      localStorage.clear();
      m.forEach((v, k) => localStorage.setItem(k, v));
    };

    // 1. Device A initial push (Rev 1)
    localStorage.setItem('asesmerdeka_device_id', 'DEV-STG-CONV-A');
    await activateStagingLicenseForTest(schoolLicense);
    saveTeacherSyncPin(pin);
    const { profile: baseProfile, tps } = seedSyntheticWorkspace('713C2');
    const pushA1 = await pushWorkspaceToCloud(schoolLicense, pin);
    expect(pushA1.ok).toBe(true);
    expect(pushA1.revision).toBe(1);
    const snapARev1 = snapshotLocal();

    // 2. Device B pulls Rev 1, updates namaKepalaSekolah -> pushes Rev 2
    localStorage.clear();
    localStorage.setItem('asesmerdeka_device_id', 'DEV-STG-CONV-B');
    await activateStagingLicenseForTest(schoolLicense);
    saveTeacherSyncPin(pin);
    const pullB1 = await pullWorkspaceFromCloud(schoolLicense, pin);
    expect(pullB1.ok).toBe(true);
    expect(pullB1.revision).toBe(1);
    saveSchoolProfile({ ...getSchoolProfile(), namaKepalaSekolah: 'Kepsek Update Device B' });
    const pushB2 = await pushWorkspaceToCloud(schoolLicense, pin);
    expect(pushB2.ok).toBe(true);
    expect(pushB2.revision).toBe(2);
    const snapBRev2 = snapshotLocal();

    // 3. Device A (stale Rev 1) updates kotaTanggal -> hits HTTP 409 FIRST (saving initial pendingConflict)
    restoreLocal(snapARev1);
    saveSchoolProfile({ ...baseProfile, kotaTanggal: 'Kota Update Device A' });
    const firstConflictPush = await pushWorkspaceToCloud(schoolLicense, pin);
    expect(firstConflictPush.ok).toBe(false);
    expect(firstConflictPush.conflict).toBe(true);
    expect(firstConflictPush.statusCode).toBe(409);

    // 4. Device A continues working AFTER 409: adds a new Jurnal entry BEFORE resolving conflict!
    const currentProfileA = getSchoolProfile();
    const harianAfter409 = getKelasHarianData(currentProfileA, tps);
    const prevJurnalCount = harianAfter409.daftarJurnal.length;
    harianAfter409.daftarJurnal.push({
      id: 'jurnal_post_409_713c2',
      pertemuanKe: prevJurnalCount + 1,
      tanggal: '2026-11-17',
      jamKe: '1 - 2',
      tpId: tps[0].id,
      kodeTP: tps[0].kode,
      materiPokok: 'STAGING-JOURNAL-713C2',
      jumlahJP: 2,
      kegiatanPembelajaran: 'Agenda pasca 409 yang wajib bertahan saat Safe Merge.',
      siswaTidakHadir: 'Nihil (Semua Hadir)',
      catatanRefleksi: 'Terlaksana',
      statusKeterlaksanaan: 'terlaksana',
    });
    saveKelasHarianData(currentProfileA, harianAfter409);

    // 5. Device A runs Safe Merge (Rev 3) -> MUST preserve kotaTanggal A + namaKepalaSekolah B + post-409 Jurnal!
    const resolved = await resolveCloudConflict('merge_safe', { allowDefaultForUnchosen: true });
    expect(resolved.ok).toBe(true);
    expect(resolved.revision).toBe(3);

    const devAProfileAfter = getSchoolProfile();
    expect(devAProfileAfter.kotaTanggal).toBe('Kota Update Device A');
    expect(devAProfileAfter.namaKepalaSekolah).toBe('Kepsek Update Device B');
    const devAHarianAfter = getKelasHarianData(devAProfileAfter, tps);
    expect(devAHarianAfter.daftarJurnal).toHaveLength(prevJurnalCount + 1);
    expect(devAHarianAfter.daftarJurnal.some((j) => j.materiPokok === 'STAGING-JOURNAL-713C2')).toBe(true);

    // 6. Device B pulls Rev 3 -> MUST converge identically with Device A!
    restoreLocal(snapBRev2);
    const pullB3 = await pullWorkspaceFromCloud(schoolLicense, pin);
    expect(pullB3.ok).toBe(true);
    expect(pullB3.revision).toBe(3);
    const devBProfileAfter = getSchoolProfile();
    expect(devBProfileAfter.kotaTanggal).toBe('Kota Update Device A');
    expect(devBProfileAfter.namaKepalaSekolah).toBe('Kepsek Update Device B');
    const devBHarianAfter = getKelasHarianData(devBProfileAfter, tps);
    expect(devBHarianAfter.daftarJurnal).toHaveLength(prevJurnalCount + 1);
    expect(devBHarianAfter.daftarJurnal.some((j) => j.materiPokok === 'STAGING-JOURNAL-713C2')).toBe(true);
  });
});
