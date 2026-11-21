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
  collectAllowedBackupEntries,
  exportBackupDataJson,
  importBackupDataJson,
  jenjangToDefaultFase,
  saveCustomTPList,
  saveSchoolProfile,
  getSchoolProfile,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import {
  applyNewStudentRoster,
  createEmptyKelasHarianData,
  generateAutoDeskripsiRapor,
  getKelasHarianData,
  saveKelasHarianData,
} from '../kelasHarianStorage';
import type { SiswaItem } from '../../types/kelasHarian';
import type { ModulAjarDokumen, ModulReferensiSumberItem } from '../../types/perangkatAjar';
import { buildSmartLKPD, buildSmartModulAjar } from '../perangkatAjarEngine';
import { saveToBankSoal } from '../bankSoalStorage';
import { getSemesterCurriculumPlan } from '../kurikulumCatalog';
import {
  loadLKPDDraft,
  loadModulAjarDraft,
  saveLKPDDraft,
  saveModulAjarDraft,
} from '../perangkatDraftStorage';
import { getCuratedModulExamples } from '../modulCuratedExamples';
import * as licenseManager from '../licenseManager';
import {
  clearCloudSyncAutoRetrySuppression,
  collectWorkspaceSyncEntries,
  getCloudSyncUiStatus,
  getLastCloudSyncErrorDetail,
  getPendingCloudConflict,
  getWorkspaceBaseRevision,
  pullWorkspaceFromCloud,
  pushWorkspaceToCloud,
  resolveCloudConflict,
  type HonestCloudStatus,
} from '../cloudSyncManager';
import {
  computeCanonicalDigestHex,
  decodeEntriesFromCloudSync,
  encodeEntriesForCloudSync,
  measureUtf8Bytes,
  planWorkspaceUploadChunks,
} from '../cloudSyncPayloadCodec';
import { TopHeader } from '../../components/layout/TopHeader';
import { LicenseModal } from '../../components/LicenseModal';
// @ts-expect-error serverless JS handler tested directly with mock req/res
import cloudSyncHandler, {
  clearCloudSyncRateLimitStore,
  clearLocalDevCloudSyncStore,
  decodeEntriesFromCloudSyncServer,
  MAX_TOTAL_WORKSPACE_BYTES,
} from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS store cleared for isolation
import activateLicenseHandler, {
  generateStagingLicenseCode,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  localStagingRevokedLicensesSet,
} from '../../../api/activate-license.js';

const MOCK_REDIS_URL = 'https://staging-sim-redis.upstash.test';
const MOCK_REDIS_TOKEN = 'synthetic-upstash-token-task1246-do-not-leak';
const MOCK_PEPPER = 'Stg1246!CloudSyncPepper#2026_Entropy987654321';
const MOCK_STAGING_SIGNING_SECRET = 'Task1246_StagingLicenseSigningSecret_32PlusChars_OK';
const UPSTASH_SINGLE_COMMAND_LIMIT_BYTES = 1_048_576;

interface SyncRequestLogEntry {
  action: string;
  requestBytes: number;
  status: number;
}

type FaultSpec =
  | { kind: 'http_status'; status: number; body?: Record<string, unknown>; headers?: Record<string, string> }
  | { kind: 'network_error'; error?: Error }
  | { kind: 'hang'; delayMs?: number };

class UpstashPartitionedSim {
  kv = new Map<string, string>();
  ttlMap = new Map<string, number>();
  rateLimits = new Map<string, { count: number; expiresAt: number }>();
  maxRedisCommandBytes = 0;
  requestLog: SyncRequestLogEntry[] = [];
  nextFaultsByAction = new Map<string, FaultSpec[]>();

  enqueueFault(action: string, fault: FaultSpec) {
    const q = this.nextFaultsByAction.get(action) || [];
    q.push(fault);
    this.nextFaultsByAction.set(action, q);
  }

  popFault(action: string): FaultSpec | null {
    const q = this.nextFaultsByAction.get(action);
    if (!q || q.length === 0) return null;
    const item = q.shift()!;
    if (q.length === 0) this.nextFaultsByAction.delete(action);
    return item;
  }

  async handleRedisFetch(url: string, init?: RequestInit): Promise<Response> {
    if (url.includes('/get/')) {
      const key = decodeURIComponent(url.split('/get/')[1] || '');
      const val = this.kv.has(key) ? this.kv.get(key)! : null;
      return new Response(JSON.stringify({ result: val }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (init?.method === 'POST' && init.body) {
      const bodyStr = String(init.body);
      const cmdBytes = Buffer.byteLength(bodyStr, 'utf8');
      if (cmdBytes > this.maxRedisCommandBytes) {
        this.maxRedisCommandBytes = cmdBytes;
      }
      if (cmdBytes > UPSTASH_SINGLE_COMMAND_LIMIT_BYTES) {
        return new Response(
          JSON.stringify({ error: `ERR max request size exceeded (${cmdBytes} bytes)` }),
          { status: 413, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const cmd = JSON.parse(bodyStr) as unknown[];
      const opName = String(cmd[0] || '').toUpperCase();

      if (opName === 'SET') {
        const key = String(cmd[1] || '');
        const val = String(cmd[2] || '');
        this.kv.set(key, val);
        if (String(cmd[3] || '').toUpperCase() === 'EX') {
          const ttlSec = Number(cmd[4]) || 60;
          this.ttlMap.set(key, Date.now() + ttlSec * 1000);
        }
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }

      if (opName === 'DEL') {
        let deleted = 0;
        for (let i = 1; i < cmd.length; i += 1) {
          const k = String(cmd[i] || '');
          if (this.kv.delete(k)) deleted += 1;
          this.ttlMap.delete(k);
        }
        return new Response(JSON.stringify({ result: deleted }), { status: 200 });
      }

      if (opName === 'EVAL') {
        const script = String(cmd[1] || '');
        const key = String(cmd[3] || '');

        if (script.includes('ASESMERDEKA_RATE_LIMIT_V1')) {
          const op = String(cmd[4] || 'CHECK');
          const windowMs = Number(cmd[5]) || 300000;
          const now = Date.now();
          const existing = this.rateLimits.get(key);
          if (op === 'RESET') {
            this.rateLimits.delete(key);
            return new Response(JSON.stringify({ result: [0, 0] }), { status: 200 });
          }
          if (op === 'CHECK') {
            if (!existing || now > existing.expiresAt) {
              return new Response(JSON.stringify({ result: [0, -1] }), { status: 200 });
            }
            return new Response(
              JSON.stringify({ result: [existing.count, existing.expiresAt - now] }),
              { status: 200 }
            );
          }
          if (op === 'RECORD_FAIL') {
            const count = !existing || now > existing.expiresAt ? 1 : existing.count + 1;
            const expiresAt =
              !existing || now > existing.expiresAt ? now + windowMs : existing.expiresAt;
            this.rateLimits.set(key, { count, expiresAt });
            return new Response(JSON.stringify({ result: [count, expiresAt - now] }), {
              status: 200,
            });
          }
        }

        if (script.includes('STALE') && typeof cmd[5] === 'string') {
          const currentRaw = this.kv.get(key);
          if (!currentRaw) {
            return new Response(JSON.stringify({ result: ['MISSING'] }), { status: 200 });
          }
          const parsed = JSON.parse(currentRaw) as { revision?: number };
          if ((Number(parsed.revision) || 1) !== Number(cmd[4])) {
            return new Response(JSON.stringify({ result: ['STALE'] }), { status: 200 });
          }
          this.kv.set(key, String(cmd[5]));
          return new Response(JSON.stringify({ result: ['OK'] }), { status: 200 });
        }

        const expectedRev = Number(cmd[4]);
        const nextJson = String(cmd[5] || '');
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
            return new Response(JSON.stringify({ result: ['CONFLICT', '1', currentRaw] }), {
              status: 200,
            });
          }
          this.kv.set(key, nextJson);
          return new Response(JSON.stringify({ result: ['OK', nextJson] }), { status: 200 });
        }

        const curRev = Number(parsed.revision) || 1;
        if (reqId && parsed.lastRequestId === reqId) {
          return new Response(
            JSON.stringify({ result: ['IDEMPOTENT', String(curRev), currentRaw] }),
            { status: 200 }
          );
        }
        if (
          reqHash &&
          parsed.lastContentHash === reqHash &&
          parsed.deviceId === reqDevice &&
          (expectedRev === -1 || curRev === expectedRev + 1)
        ) {
          return new Response(
            JSON.stringify({ result: ['IDEMPOTENT', String(curRev), currentRaw] }),
            { status: 200 }
          );
        }
        if (expectedRev < 0 ? curRev > 0 : curRev !== expectedRev) {
          return new Response(
            JSON.stringify({ result: ['CONFLICT', String(curRev), currentRaw] }),
            { status: 200 }
          );
        }
        this.kv.set(key, nextJson);
        return new Response(JSON.stringify({ result: ['OK', nextJson] }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ error: 'Unsupported Redis command' }), { status: 400 });
  }
}

async function invokeCloudSyncApi(body: Record<string, unknown>, ip = '10.124.6.10') {
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
  return { statusCode, headers, body: responseBody };
}

async function invokeActivateLicenseApi(body: Record<string, unknown>, ip = '10.124.6.11') {
  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  const req = {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body,
  };
  const res = {
    setHeader() {},
    status(c: number) {
      statusCode = c;
      return this;
    },
    json(b: Record<string, unknown>) {
      responseBody = b;
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
  return { statusCode, body: responseBody };
}

async function activateExistingTestLicense(lic: string, deviceId: string): Promise<void> {
  localStorage.setItem('asesmerdeka_device_id', deviceId);
  await licenseManager.verifyMayarLicenseOnline(lic);
  const act = licenseManager.activateLicense(lic);
  expect(act.success).toBe(true);
}

function installUpstashSimFetch(sim: UpstashPartitionedSim) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input.toString();

    if (urlStr.startsWith(MOCK_REDIS_URL)) {
      return sim.handleRedisFetch(urlStr, init);
    }

    if (urlStr === '/api/cloud-sync') {
      const rawBody = init?.body ? String(init.body) : '{}';
      const parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
      const action = String(parsedBody.action || 'unknown');
      const requestBytes = Buffer.byteLength(rawBody, 'utf8');

      const injected = sim.popFault(action) || sim.popFault('*');
      if (injected) {
        if (injected.kind === 'network_error') {
          sim.requestLog.push({ action, requestBytes, status: 0 });
          throw injected.error || new TypeError('Failed to fetch');
        }
        if (injected.kind === 'hang') {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, injected.delayMs ?? 5000);
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                const err = new Error('The operation was aborted.');
                err.name = 'AbortError';
                reject(err);
              });
            }
          });
        }
        if (injected.kind === 'http_status') {
          sim.requestLog.push({ action, requestBytes, status: injected.status });
          return new Response(JSON.stringify(injected.body || { ok: false }), {
            status: injected.status,
            headers: {
              'Content-Type': 'application/json',
              ...(injected.headers || {}),
            },
          });
        }
      }

      const apiRes = await invokeCloudSyncApi(parsedBody);
      sim.requestLog.push({ action, requestBytes, status: apiRes.statusCode });
      return new Response(JSON.stringify(apiRes.body), {
        status: apiRes.statusCode,
        headers: { 'Content-Type': 'application/json', ...apiRes.headers },
      });
    }

    if (urlStr === '/api/activate-license') {
      const parsedBody = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      const out = await invokeActivateLicenseApi(parsedBody);
      return new Response(JSON.stringify(out.body), {
        status: out.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch URL in Task 12.4.6 test: ${urlStr}`);
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function makeSyntheticProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_synth_1246',
    instansiDinas: 'Dinas Pendidikan Kabupaten Uji Sintetis',
    namaSekolah: 'SMPN Sintetis 1246',
    alamatSekolah: 'Jl. Kurikulum No. 12',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    daftarRombel: ['VIII A', 'VIII B'],
    mataPelajaranUtama: 'Matematika',
    namaGuru: 'Guru Sintetis A, S.Pd.',
    nipGuru: '199001012020011001',
    namaKepalaSekolah: 'Kepala Sekolah Sintetis, M.Pd.',
    nipKepalaSekolah: '197001011998011001',
    kotaSekolah: 'Yogyakarta',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

function makeSyntheticTPList(
  count: number,
  profile: SchoolProfile,
  prefix = 'TP'
): CustomTPItem[] {
  const fase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const basePlan = getSemesterCurriculumPlan(
    profile.mataPelajaranUtama,
    fase,
    profile.kelasUtama,
    profile.semester,
    profile
  );
  const templateTp = basePlan.tpList[0];
  return Array.from({ length: count }, (_, idx) => ({
    ...templateTp,
    id: `tpid_synth_${profile.jenjang.replace(/[^a-z]/gi, '')}_${idx + 1}`,
    kode: `${profile.kelasUtama}.${idx + 1}`,
    materiPokok: `${prefix} Topik Sintetis ${idx + 1}: ${templateTp.materiPokok}`,
    tujuanPembelajaran: `Peserta didik menganalisis dan menerapkan konsep ${prefix} ${idx + 1} secara kontekstual dan operasional.`,
    alokasiJP: idx % 2 === 0 ? 12 : 9,
  }));
}

function makeSyntheticStudents(count: number): SiswaItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `siswa_synth_${i + 1}`,
    noUrut: i + 1,
    nis: `90${String(i + 1).padStart(3, '0')}`,
    nisn: `008877${String(i + 1).padStart(4, '0')}`,
    nama: `Peserta Didik Uji ${String(i + 1).padStart(2, '0')}`,
    jenisKelamin: i % 2 === 0 ? 'L' : 'P',
    statusAktif: 'aktif',
  }));
}

function makeSibiRefs(count: number, mapel = 'Matematika'): ModulReferensiSumberItem[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `ref_sibi_${idx + 1}`,
    jenisSumber: idx % 2 === 0 ? 'sibi_kemendikdasmen' : 'modul_atau_sumber_guru',
    jenjang: 'SMP/MTs',
    kelas: '8',
    mataPelajaran: mapel,
    judulBuku: `Buku Panduan Resmi ${mapel} Bagian ${idx + 1}`,
    penulis: `Tim Penyusun Kurikulum ${idx + 1}`,
    edisiAtauTahun: '2024',
    babAtauSubbab: `Bab ${idx + 1}`,
    halaman: `Hal. ${10 + idx * 5}-${15 + idx * 5}`,
    urlSumber: idx % 2 === 0 ? `https://buku.kemendikdasmen.go.id/katalog/synth-${idx + 1}` : undefined,
    catatanMateriGuru: `Catatan sintetis materi untuk rujukan ${idx + 1}: penekanan pada pemecahan masalah bertahap dan diskusi terpandu.`,
    jenisAksesMateri: 'catatan_ringkas_guru',
    domainResmiSibi: idx % 2 === 0,
    statusVerifikasi: 'terkurasi_terverifikasi',
    diperbaruiPada: '2026-11-21T10:00:00.000Z',
  }));
}

/**
 * Generates an extensive AI-style multi-meeting Modul Ajar matching live AI output length & structure.
 */
function buildLongAiStyleModul(
  tp: CustomTPItem,
  profile: SchoolProfile,
  meetings: number,
  extraDetailMultiplier = 1,
  refs?: ModulReferensiSumberItem[]
): ModulAjarDokumen {
  const base = buildSmartModulAjar(tp, profile, {
    model: 'pbl',
    jumlahPertemuan: meetings,
    referensiSumber: refs,
  });
  const padDetail = extraDetailMultiplier > 1
    ? ' ' + Array.from({ length: extraDetailMultiplier }, (_, k) =>
        `Uraian operasional tambahan ${k + 1} berisi instruksi langkah, pengecekan bukti belajar nyata, dan pertanyaan pemandu.`
      ).join(' ')
    : '';
  const keg0 = base.kegiatanPembelajaran[0];
  const expandedStages0 = (keg0.tahapTerstruktur || []).map((st) => ({
    ...st,
    aktivitasGuru: `${st.aktivitasGuru}${padDetail}`,
    aktivitasSiswa: `${st.aktivitasSiswa}${padDetail}`,
  }));
  const kegiatanPembelajaran = base.kegiatanPembelajaran.map((keg, idx) => {
    const clonedStages = expandedStages0.map((st, sIdx) => ({
      ...st,
      id: `p${idx + 1}_ai_s${sIdx + 1}`,
      urutan: sIdx + 1,
      durasiMenit: keg.tahapTerstruktur?.[sIdx]?.durasiMenit ?? st.durasiMenit,
    }));
    const pendahuluan = clonedStages
      .filter((s) => s.fase === 'pendahuluan')
      .map((s) => `${s.namaTahap} (${s.durasiMenit} Menit): ${s.aktivitasGuru} ${s.aktivitasSiswa}`.trim());
    const inti = clonedStages
      .filter((s) => s.fase === 'inti')
      .map((s) => `${s.namaTahap} (${s.durasiMenit} Menit): ${s.aktivitasGuru} ${s.aktivitasSiswa}`.trim());
    const penutup = clonedStages
      .filter((s) => s.fase === 'penutup')
      .map((s) => `${s.namaTahap} (${s.durasiMenit} Menit): ${s.aktivitasGuru} ${s.aktivitasSiswa}`.trim());
    return {
      ...keg,
      pendahuluan,
      inti,
      penutup,
      tahapTerstruktur: clonedStages,
    };
  });

  return {
    ...base,
    draftSource: 'ai_generated',
    kegiatanPembelajaran,
    catatanValidasi: {
      status: 'valid_ai',
      usedFallback: false,
      repairAttempted: false,
      structuralIssues: [],
      relevanceAndAntiSlopIssues: [],
      semanticReviewWarnings: [],
    },
  };
}

function populateWorkspaceFixture(params: {
  profile: SchoolProfile;
  tpCount: number;
  modulCount: number;
  modulMeetings: number;
  lkpdCount: number;
  studentCount: number;
  detailMultiplier?: number;
  includeSibiRefs?: number;
  includeLegacyDiffAndBackup?: boolean;
  includeBankSoal?: number;
}) {
  const {
    profile,
    tpCount,
    modulCount,
    modulMeetings,
    lkpdCount,
    studentCount,
    detailMultiplier = 1,
    includeSibiRefs = 2,
    includeLegacyDiffAndBackup = false,
    includeBankSoal = 0,
  } = params;

  saveSchoolProfile(profile);
  localStorage.setItem('asesmerdeka_onboarding_confirmed_v1', 'true');
  const tps = makeSyntheticTPList(tpCount, profile);
  saveCustomTPList(
    profile.mataPelajaranUtama,
    profile.kelasUtama,
    profile.semester,
    tps,
    profile
  );

  const refs = includeSibiRefs > 0 ? makeSibiRefs(includeSibiRefs, profile.mataPelajaranUtama) : undefined;
  for (let i = 0; i < modulCount; i += 1) {
    const tp = tps[i % tps.length];
    const model = i === 0 ? 'pbl' : i % 3 === 1 ? 'pjbl' : 'discovery';
    const baseDoc = buildLongAiStyleModul(tp, profile, modulMeetings, detailMultiplier, refs);
    const modelDoc: ModulAjarDokumen = {
      ...baseDoc,
      id: `mod_synth_${i + 1}`,
      modelType: model,
      sintaksModelId: model,
    };
    saveModulAjarDraft(profile, tp, model, modelDoc, i % 4 === 3 ? 'template' : 'ai_generated');
  }

  const lkpdPresets = ['kasus', 'eksperimen', 'diferensiasi', 'proyek'] as const;
  for (let i = 0; i < lkpdCount; i += 1) {
    const tp = tps[i % tps.length];
    const preset = lkpdPresets[i % lkpdPresets.length];
    const lkpd = buildSmartLKPD(tp, profile, preset);
    saveLKPDDraft(profile, tp, preset, lkpd, i % 2 === 0 ? 'ai_generated' : 'user_edited');
  }

  if (studentCount > 0) {
    const students = makeSyntheticStudents(studentCount);
    let harian = applyNewStudentRoster(
      createEmptyKelasHarianData(profile, tps),
      students,
      tps,
      true,
      { source: 'user_manual', initializeEmptyScores: true }
    );
    for (let m = 1; m <= 12; m += 1) {
      const statusMap: Record<string, 'H' | 'S' | 'I' | 'A'> = {};
      students.forEach((s) => {
        statusMap[s.id] = 'H';
      });
      harian.daftarPresensi.push({
        id: `pres_${m}`,
        tanggal: `2026-08-${String(m).padStart(2, '0')}`,
        pertemuanKe: m,
        catatanPertemuan: `Pertemuan ${m}`,
        statusKeterlaksanaan: 'terlaksana',
        statusMap,
      });
      harian.daftarJurnal.push({
        id: `jur_${m}`,
        tanggal: `2026-08-${String(m).padStart(2, '0')}`,
        pertemuanKe: m,
        jamKe: '1-2',
        tpKode: tps[m % tps.length].kode,
        materiRingkas: `Topik ${m}`,
        kegiatanPembelajaran: 'Diskusi kelompok & umpan balik.',
        refleksiGuru: 'Siswa mengikuti aktif.',
        tindakLanjut: 'Latihan penguatan.',
        statusKeterlaksanaan: 'terlaksana',
      });
    }
    harian.daftarNilai = harian.daftarNilai.map((row) => {
      const nf = { ...row.nilaiFormatif };
      tps.forEach((t) => {
        nf[t.id] = 86;
      });
      return {
        ...row,
        nilaiFormatif: nf,
        nilaiSTS: 85,
        nilaiSAS: 88,
        deskripsiRapor: generateAutoDeskripsiRapor(nf, tps, row.namaSiswa),
      };
    });
    saveKelasHarianData(profile, harian);
  }

  if (includeLegacyDiffAndBackup) {
    const tpDiff = tps[0];
    const legacyModul = buildSmartModulAjar(tpDiff, profile, {
      model: 'pbl',
      jumlahPertemuan: 4,
    });
    // Strip tahapTerstruktur to authentically represent pre-Task 12.1 legacy 'diferensiasi'
    const pureLegacy: ModulAjarDokumen = {
      ...legacyModul,
      id: 'mod_legacy_diff_01',
      modelType: 'diferensiasi',
      sintaksModelId: 'diferensiasi',
      draftSource: 'user_edited',
      kegiatanPembelajaran: legacyModul.kegiatanPembelajaran.map((k) => {
        const copy = { ...k };
        delete copy.tahapTerstruktur;
        return copy;
      }),
    };
    const legacyKey = `modul_ajar_${tpDiff.kode}_diferensiasi`;
    localStorage.setItem(legacyKey, JSON.stringify(pureLegacy));
    localStorage.setItem(
      'asesmerdeka_legacy_backup_v1',
      JSON.stringify({
        version: 1,
        createdAt: '2026-10-01T00:00:00.000Z',
        entries: {
          [legacyKey]: localStorage.getItem(legacyKey)!,
          asesmerdeka_custom_tp_v2__pre_schedule: JSON.stringify(tps.slice(0, 2)),
        },
      })
    );
  }

  if (includeBankSoal > 0) {
    for (let i = 0; i < includeBankSoal; i += 1) {
      saveToBankSoal(
        {
          id: `ASM-SYNTH-${i + 1}`,
          createdAt: '2026-11-21T08:00:00.000Z',
          judul: `Paket Asesmen Sintetis ${i + 1}`,
          mataPelajaran: profile.mataPelajaranUtama,
          jenjangFase: 'Fase D (Kelas 7-9 SMP)',
          kelas: profile.kelasUtama,
          rombel: profile.rombelAktif,
          semester: profile.semester,
          schoolId: profile.schoolId,
          tipeAsesmen: 'Sumatif (Akhir Semester / SAS)',
          alokasiWaktu: '90 Menit',
          tahunAjaran: profile.tahunAjaran,
          namaSekolah: profile.namaSekolah,
          namaPenyusun: profile.namaGuru,
          capaianPembelajaran: 'CP Sintetis Kurikulum Merdeka',
          tujuanPembelajaran: tps.slice(0, 4).map((t) => t.tujuanPembelajaran),
          tpIds: tps.slice(0, 4).map((t) => t.id),
          materiPokok: tps[0].materiPokok,
          profilPelajarPancasila: ['Penalaran Kritis', 'Kemandirian'],
          generationSource: 'ai_generated',
          petunjukUmum: ['Bacalah setiap soal dengan teliti.'],
          soalList: Array.from({ length: 15 }, (_, qIdx) => ({
            id: `q_${i}_${qIdx + 1}`,
            nomor: qIdx + 1,
            tipe: 'pilihan_ganda',
            stimulus: `Stimulus konteks sintetis soal ${qIdx + 1}: Tabel pengamatan nilai eksperimen berulang pada kelompok belajar.`,
            pertanyaan: `Manakah analisis yang paling tepat untuk kondisi ke-${qIdx + 1}?`,
            pilihan: [
              { label: 'A', teks: 'Pernyataan analisis pertama yang terukur' },
              { label: 'B', teks: 'Pernyataan analisis kedua berdasarkan bukti' },
              { label: 'C', teks: 'Pernyataan analisis ketiga dengan parameter beda' },
              { label: 'D', teks: 'Pernyataan analisis keempat sebagai pembanding' },
            ],
            kunci: 'B',
            pembahasan: `Pembahasan sintetis terperinci untuk soal nomor ${qIdx + 1} berdasarkan konsep TP terkait.`,
            levelKognitif: 'C4 (Menganalisis)',
            indikatorSoal: `Siswa mampu menganalisis kasus ke-${qIdx + 1}.`,
            skor: 10,
            tpId: tps[qIdx % tps.length].id,
            tpKode: tps[qIdx % tps.length].kode,
          })),
          rubrikPenilaian: [],
        },
        profile
      );
    }
  }
}

describe('Task 12.4.6 — Cloud Sync Payload Reliability, Chunking, Delta Sync & Data Integrity', () => {
  const prevEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CLOUD_SYNC_PIN_PEPPER: process.env.CLOUD_SYNC_PIN_PEPPER,
    ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET: process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    NODE_ENV: process.env.NODE_ENV,
  };

  let sim: UpstashPartitionedSim;
  let restoreFetch: () => void;

  async function issueAndActivateTestLicense(deviceId: string, seed: string): Promise<string> {
    const lic = generateStagingLicenseCode('GM26', seed);
    await activateExistingTestLicense(lic, deviceId);
    return lic;
  }

  beforeEach(() => {
    localStorage.clear();
    clearLocalDevCloudSyncStore();
    clearCloudSyncRateLimitStore();
    clearCloudSyncAutoRetrySuppression();
    localSeatMemoryStore.clear();
    localRevokedLicensesSet.clear();
    localStagingRevokedLicensesSet.clear();

    process.env.UPSTASH_REDIS_REST_URL = MOCK_REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = MOCK_REDIS_TOKEN;
    process.env.CLOUD_SYNC_PIN_PEPPER = MOCK_PEPPER;
    process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET = MOCK_STAGING_SIGNING_SECRET;
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'staging';
    delete process.env.NODE_ENV;

    sim = new UpstashPartitionedSim();
    restoreFetch = installUpstashSimFetch(sim);
  });

  afterEach(() => {
    restoreFetch();
    vi.restoreAllMocks();
    clearCloudSyncAutoRetrySuppression();
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v !== undefined) process.env[k] = v;
      else delete process.env[k];
    }
  });

  describe('1. Lossless Wire Codec, Chunk Planner & Data Integrity (Section 5)', () => {
    it('round-trips AI Modul Ajar, teacher manual stage edits, SIBI references, legacy diferensiasi, and legacy backup without byte loss', () => {
      const profile = makeSyntheticProfile();
      populateWorkspaceFixture({
        profile,
        tpCount: 5,
        modulCount: 2,
        modulMeetings: 8,
        lkpdCount: 2,
        studentCount: 10,
        includeSibiRefs: 3,
        includeLegacyDiffAndBackup: true,
      });

      const originalEntries = collectWorkspaceSyncEntries();
      const modulKeys = Object.keys(originalEntries).filter((k) =>
        k.startsWith('asesmerdeka_modul_v2__')
      );
      expect(modulKeys.length).toBeGreaterThanOrEqual(2);

      // Modify ONE stage inside meeting 3 on modul #2 manually as teacher!
      const secondModul = JSON.parse(
        JSON.stringify(originalEntries[modulKeys[1]])
      ) as ModulAjarDokumen;
      secondModul.kegiatanPembelajaran[2].tahapTerstruktur![1].aktivitasGuru =
        'EDITED_GURU: Guru memeriksa catatan siswa secara langsung di meja.';
      secondModul.draftSource = 'user_edited';
      originalEntries[modulKeys[1]] = secondModul;

      // Encode -> verify smaller wire size AND lossless decode on BOTH client & server mirror
      const rawBytes = measureUtf8Bytes(originalEntries);
      const wireEncoded = encodeEntriesForCloudSync(originalEntries);
      const wireBytes = measureUtf8Bytes(wireEncoded);
      expect(wireBytes).toBeLessThan(rawBytes);

      const clientDecoded = decodeEntriesFromCloudSync(
        JSON.parse(JSON.stringify(wireEncoded))
      );
      const serverDecoded = decodeEntriesFromCloudSyncServer(
        JSON.parse(JSON.stringify(wireEncoded))
      );

      expect(clientDecoded).toEqual(originalEntries);
      expect(serverDecoded).toEqual(originalEntries);
      expect(computeCanonicalDigestHex(clientDecoded)).toBe(
        computeCanonicalDigestHex(originalEntries)
      );

      // Ensure SIBI & legacy backup entries preserved bit-for-bit
      expect(clientDecoded['asesmerdeka_legacy_backup_v1']).toEqual(
        originalEntries['asesmerdeka_legacy_backup_v1']
      );
      expect(
        (clientDecoded[modulKeys[1]] as ModulAjarDokumen).referensiSumber?.length
      ).toBe(3);

      // Ensure exportBackupDataJson & importBackupDataJson round-trip preserves Kelas Harian & drafts identically
      const backupRaw = exportBackupDataJson();
      const backupParsed = JSON.parse(backupRaw) as {
        entries: Record<string, unknown>;
      };
      expect(collectAllowedBackupEntries()).toEqual(backupParsed.entries);
      expect(getCuratedModulExamples().length).toBeGreaterThanOrEqual(4);

      const snapshotProfile = getSchoolProfile();
      const tpsForCheck = makeSyntheticTPList(5, snapshotProfile);
      expect(getKelasHarianData(snapshotProfile, tpsForCheck).daftarSiswa.length).toBe(10);
      localStorage.clear();
      const importRes = importBackupDataJson(backupRaw);
      expect(importRes.success).toBe(true);
      expect(getKelasHarianData(snapshotProfile, tpsForCheck).daftarSiswa.length).toBe(10);
    });

    it('splits oversized single entry (>10 KB test cap) with surrogate emojis safely across chunks', () => {
      const emojiText = '🔬 Eksperimen Matematika & Sains 📚 ';
      const hugeArray = Array.from({ length: 120 }, (_, i) => ({
        idx: i,
        teks: `${emojiText}Butir analisis sintetis #${i}: ${'panjang '.repeat(25)}`,
      }));
      const entries = {
        asesmerdeka_bank_soal_v2__big: hugeArray,
        asesmerdeka_school_profile_v1: makeSyntheticProfile(),
      };
      const chunks = planWorkspaceUploadChunks(entries, 12_000);
      expect(chunks.length).toBeGreaterThan(3);
      for (const ch of chunks) {
        expect(measureUtf8Bytes(ch)).toBeLessThanOrEqual(12_000);
      }
    });
  });

  describe('2. Workspace Stress Matrix & Performance Measurements (Sections 6 & 8)', () => {
    it('syncs all 8 synthetic teacher workspace scenarios reliably with zero HTTP 413 and measures Before/After bytes', async () => {
      const metricsTable: Array<Record<string, unknown>> = [];

      // Skenario 1..7: Standalone syncs + fresh Device B restore verification
      const scenarios = [
        {
          name: '1. Small (5 TP)',
          seed: 'STRESS1',
          config: {
            profile: makeSyntheticProfile({ schoolId: 'sch_s1' }),
            tpCount: 5,
            modulCount: 2,
            modulMeetings: 4,
            lkpdCount: 2,
            studentCount: 15,
          },
        },
        {
          name: '2. Medium (15 TP)',
          seed: 'STRESS2',
          config: {
            profile: makeSyntheticProfile({ schoolId: 'sch_s2' }),
            tpCount: 15,
            modulCount: 6,
            modulMeetings: 6,
            lkpdCount: 5,
            studentCount: 28,
          },
        },
        {
          name: '3. Large (30 TP)',
          seed: 'STRESS3',
          config: {
            profile: makeSyntheticProfile({ schoolId: 'sch_s3' }),
            tpCount: 30,
            modulCount: 12,
            modulMeetings: 6,
            lkpdCount: 10,
            studentCount: 32,
            includeBankSoal: 3,
          },
        },
        {
          name: '4. 4 Long AI Moduls (SD/SMP/SMA/SMK)',
          seed: 'STRESS4',
          customSetup: () => {
            const jenjangConfigs: Array<Pick<SchoolProfile, 'jenjang' | 'kelasUtama' | 'mataPelajaranUtama'>> = [
              { jenjang: 'SD/MI', kelasUtama: '5', mataPelajaranUtama: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)' },
              { jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'IPA (Ilmu Pengetahuan Alam)' },
              { jenjang: 'SMA/MA', kelasUtama: '11', mataPelajaranUtama: 'Biologi' },
              { jenjang: 'SMK', kelasUtama: '11', mataPelajaranUtama: 'Produk Kreatif dan Kewirausahaan' },
            ];
            for (const jCfg of jenjangConfigs) {
              const p = makeSyntheticProfile({
                schoolId: 'sch_s4_4jenjang',
                ...jCfg,
              });
              if (jCfg.jenjang === 'SD/MI') saveSchoolProfile(p);
              const tps = makeSyntheticTPList(2, p, jCfg.jenjang);
              saveCustomTPList(p.mataPelajaranUtama, p.kelasUtama, p.semester, tps, p);
              const mod = buildLongAiStyleModul(
                tps[0],
                p,
                8,
                3,
                makeSibiRefs(3, p.mataPelajaranUtama)
              );
              saveModulAjarDraft(p, tps[0], 'pbl', mod, 'ai_generated');
            }
          },
        },
        {
          name: '5. Many LKPDs & SIBI Sources',
          seed: 'STRESS5',
          config: {
            profile: makeSyntheticProfile({ schoolId: 'sch_s5' }),
            tpCount: 12,
            modulCount: 4,
            modulMeetings: 4,
            lkpdCount: 16,
            studentCount: 20,
            includeSibiRefs: 6,
          },
        },
        {
          name: '6. Mixed AI + Template + Legacy Diff + Edits',
          seed: 'STRESS6',
          config: {
            profile: makeSyntheticProfile({ schoolId: 'sch_s6' }),
            tpCount: 10,
            modulCount: 6,
            modulMeetings: 6,
            lkpdCount: 6,
            studentCount: 24,
            includeSibiRefs: 2,
            includeLegacyDiffAndBackup: true,
          },
        },
        {
          name: '7. Oversized >1.5 MB Workspace',
          seed: 'STRESS7',
          config: {
            profile: makeSyntheticProfile({ schoolId: 'sch_s7_over15mb' }),
            tpCount: 30,
            modulCount: 18,
            modulMeetings: 8,
            lkpdCount: 12,
            studentCount: 36,
            detailMultiplier: 3,
            includeSibiRefs: 4,
            includeBankSoal: 5,
            includeLegacyDiffAndBackup: true,
          },
        },
      ];

      for (const sc of scenarios) {
        localStorage.clear();
        sim.requestLog = [];
        const lic = await issueAndActivateTestLicense(`DEV-${sc.seed}-A`, sc.seed);
        if (sc.customSetup) {
          sc.customSetup();
          localStorage.setItem('asesmerdeka_onboarding_confirmed_v1', 'true');
        } else if (sc.config) {
          populateWorkspaceFixture(sc.config);
        }

        const expectedEntries = collectWorkspaceSyncEntries();
        const rawBytesBefore = measureUtf8Bytes(expectedEntries);
        if (sc.seed === 'STRESS7') {
          expect(rawBytesBefore).toBeGreaterThan(1_800_000);
        }

        const pushRes = await pushWorkspaceToCloud(lic);
        expect(pushRes.ok, `Scenario ${sc.name} failed: ${pushRes.message}`).toBe(true);
        expect(sim.requestLog.some((r) => r.status === 413)).toBe(false);
        expect(sim.maxRedisCommandBytes).toBeLessThan(UPSTASH_SINGLE_COMMAND_LIMIT_BYTES);

        // Simulated reload / fresh Device B pull using same license (maxSeats=2)
        localStorage.clear();
        await activateExistingTestLicense(lic, `DEV-${sc.seed}-B`);

        const pullRes = await pullWorkspaceFromCloud(lic);
        expect(pullRes.ok).toBe(true);
        expect(pullRes.found).toBe(true);
        const restoredEntries = collectWorkspaceSyncEntries();
        expect(computeCanonicalDigestHex(restoredEntries)).toBe(
          computeCanonicalDigestHex(expectedEntries)
        );
        expect(getSchoolProfile().schoolId).toBe((expectedEntries['asesmerdeka_school_profile_v1'] as SchoolProfile).schoolId);

        metricsTable.push({
          scenario: sc.name,
          mode: pushRes.mode,
          rawBytesBefore,
          wireBytesAfter: pushRes.wireBytes,
          requests: pushRes.requestCount,
          maxRequestBytes: pushRes.maxRequestBytes,
          totalDocs: pushRes.totalDocuments,
          durationMs: pushRes.durationMs,
        });
      }

      // Skenario 8: Incremental Delta Edit Sync after Large Initial Push (1 TP / 1 Modul edited -> tiny 1-request delta!)
      localStorage.clear();
      sim.requestLog = [];
      const licDelta = await issueAndActivateTestLicense('DEV-DELTA-1', 'STRESS8DELTA');
      const prof8 = makeSyntheticProfile({ schoolId: 'sch_s8_delta' });
      populateWorkspaceFixture({
        profile: prof8,
        tpCount: 20,
        modulCount: 16,
        modulMeetings: 8,
        lkpdCount: 8,
        studentCount: 30,
        detailMultiplier: 2,
      });
      const initialPush = await pushWorkspaceToCloud(licDelta);
      expect(initialPush.ok).toBe(true);

      // Teacher edits ONE Modul Ajar title & stage
      const tps8 = makeSyntheticTPList(20, prof8);
      const existingMod = loadModulAjarDraft(prof8, tps8[0], 'pbl')!;
      expect(existingMod).not.toBeNull();
      saveModulAjarDraft(
        prof8,
        tps8[0],
        'pbl',
        { ...existingMod, judul: 'Judul Diedit Guru Skenario 8' },
        'user_edited'
      );

      sim.requestLog = [];
      const deltaPush = await pushWorkspaceToCloud(licDelta);
      expect(deltaPush.ok).toBe(true);
      expect(deltaPush.mode).toBe('delta');
      expect(deltaPush.requestCount).toBe(1);
      expect(deltaPush.changedRecords).toBeLessThanOrEqual(2);
      expect(deltaPush.wireBytes!).toBeLessThan(60_000);
      expect(deltaPush.rawBytes!).toBeGreaterThan(1_000_000);

      // Verify after reload/pull the edited module AND untouched modules are all intact
      localStorage.clear();
      await activateExistingTestLicense(licDelta, 'DEV-DELTA-1');
      const pullAfterDelta = await pullWorkspaceFromCloud(licDelta);
      expect(pullAfterDelta.ok).toBe(true);
      expect(loadModulAjarDraft(prof8, tps8[0], 'pbl')?.judul).toBe(
        'Judul Diedit Guru Skenario 8'
      );
      expect(loadLKPDDraft(prof8, tps8[0], 'kasus')).not.toBeNull();

      metricsTable.push({
        scenario: '8. Post-Edit Delta Sync',
        mode: deltaPush.mode,
        rawBytesBefore: deltaPush.rawBytes,
        wireBytesAfter: deltaPush.wireBytes,
        requests: deltaPush.requestCount,
        maxRequestBytes: deltaPush.maxRequestBytes,
        totalDocs: deltaPush.totalDocuments,
        changedRecords: deltaPush.changedRecords,
        durationMs: deltaPush.durationMs,
      });

      console.info('TASK 12.4.6 METRICS:', JSON.stringify(metricsTable));
    }, 30_000);
  });

  describe('3. Failure & Recovery Test Matrix (Section 7)', () => {
    it('handles HTTP 413 without losing data, blocks infinite identical retries, and renders honest LicenseModal diagnostics', async () => {
      const lic = await issueAndActivateTestLicense('DEV-413-1', 'FAIL413');
      const profile = makeSyntheticProfile({ schoolId: 'sch_fail_413' });
      populateWorkspaceFixture({
        profile,
        tpCount: 5,
        modulCount: 1,
        modulMeetings: 4,
        lkpdCount: 1,
        studentCount: 5,
      });

      sim.enqueueFault('push', {
        kind: 'http_status',
        status: 413,
        body: {
          ok: false,
          payloadTooLarge: true,
          message: 'Ukuran data melebihi batas maksimal server.',
        },
      });

      const firstAttempt = await pushWorkspaceToCloud(lic, '', { isAutoSync: true });
      expect(firstAttempt.ok).toBe(false);
      expect(firstAttempt.payloadTooLarge).toBe(true);
      expect(firstAttempt.statusCode).toBe(413);
      expect(getCloudSyncUiStatus()).toBe('sync_error');
      expect(getLastCloudSyncErrorDetail()?.kind).toBe('payload_too_large');
      expect(getSchoolProfile().namaSekolah).toBe(profile.namaSekolah);

      // Identical auto-sync retry MUST be suppressed (0 network requests!)
      const reqCountBefore = sim.requestLog.length;
      const suppressedAttempt = await pushWorkspaceToCloud(lic, '', { isAutoSync: true });
      expect(suppressedAttempt.ok).toBe(false);
      expect(suppressedAttempt.requestCount).toBe(0);
      expect(sim.requestLog.length).toBe(reqCountBefore);

      // LicenseModal renders explicit 413 diagnostic callout without claiming synced
      const modalHtml = renderToStaticMarkup(
        React.createElement(LicenseModal, {
          isOpen: true,
          onClose: vi.fn(),
          quota: licenseManager.getUserQuota(),
          onUpdateQuota: vi.fn(),
        })
      );
      expect(modalHtml).toContain('cloud-sync-error-detail');
      expect(modalHtml).toContain('HTTP 413');
      expect(modalHtml).not.toContain('✓ Tersinkron');

      // Manual retry recovers cleanly!
      const manualRetry = await pushWorkspaceToCloud(lic);
      expect(manualRetry.ok).toBe(true);
      expect(getCloudSyncUiStatus()).toBe('synced');
      expect(getLastCloudSyncErrorDetail()).toBeNull();
    });

    it('rejects workspaces above 12 MB ceiling with honest 413 from server', async () => {
      const lic = await issueAndActivateTestLicense('DEV-12MB-1', 'CAP12MB');
      const hugeStr = 'X'.repeat(MAX_TOTAL_WORKSPACE_BYTES + 20_000);
      const res = await invokeCloudSyncApi({
        action: 'push',
        licenseCode: lic,
        deviceId: 'DEV-12MB-1',
        entries: { asesmerdeka_school_profile_v1: { note: hugeStr } },
      });
      expect(res.statusCode).toBe(413);
      expect(res.body.payloadTooLarge).toBe(true);
    });

    it('handles HTTP 408 timeout, HTTP 429 rate-limit, HTTP 500/503 outage, and network drop with safe recovery', async () => {
      const lic = await issueAndActivateTestLicense('DEV-ERR-1', 'ERRMATRIX');
      const profile = makeSyntheticProfile({ schoolId: 'sch_err_matrix' });
      populateWorkspaceFixture({
        profile,
        tpCount: 5,
        modulCount: 1,
        modulMeetings: 4,
        lkpdCount: 1,
        studentCount: 5,
      });

      // 1. Timeout (hang > timeoutMs)
      sim.enqueueFault('push', { kind: 'hang', delayMs: 2000 });
      const timeoutRes = await pushWorkspaceToCloud(lic, '', { timeoutMs: 30 });
      expect(timeoutRes.ok).toBe(false);
      expect(timeoutRes.timedOut).toBe(true);
      expect(timeoutRes.statusCode).toBe(408);
      expect(getCloudSyncUiStatus()).toBe('sync_error');
      expect(getLastCloudSyncErrorDetail()?.kind).toBe('timeout');

      // Reset suppression before testing 429 cooldown behavior independently
      clearCloudSyncAutoRetrySuppression();

      // 2. HTTP 429 + auto-sync cooldown suppression
      sim.enqueueFault('push', {
        kind: 'http_status',
        status: 429,
        headers: { 'Retry-After': '30' },
        body: { ok: false, rateLimited: true, retryAfterSeconds: 30, message: 'Rate limited' },
      });
      const rateRes = await pushWorkspaceToCloud(lic, '', { isAutoSync: true });
      expect(rateRes.ok).toBe(false);
      expect(rateRes.rateLimited).toBe(true);
      expect(rateRes.statusCode).toBe(429);
      const reqsAt429 = sim.requestLog.length;
      const autoCooldownRes = await pushWorkspaceToCloud(lic, '', { isAutoSync: true });
      expect(autoCooldownRes.ok).toBe(false);
      expect(sim.requestLog.length).toBe(reqsAt429);

      // 3. HTTP 500 & HTTP 503
      sim.enqueueFault('push', {
        kind: 'http_status',
        status: 500,
        body: { ok: false, message: 'Internal error' },
      });
      const err500 = await pushWorkspaceToCloud(lic);
      expect(err500.ok).toBe(false);
      expect(err500.statusCode).toBe(500);
      expect(getCloudSyncUiStatus()).toBe('sync_error');

      sim.enqueueFault('push', {
        kind: 'http_status',
        status: 503,
        body: { ok: false, redisUnavailable: true, cloudConfigured: true, message: 'Redis down' },
      });
      const err503 = await pushWorkspaceToCloud(lic);
      expect(err503.ok).toBe(false);
      expect(err503.statusCode).toBe(503);
      expect(getLastCloudSyncErrorDetail()?.kind).toBe('server_unavailable');

      // 4. Network drop
      sim.enqueueFault('push', { kind: 'network_error' });
      const netErr = await pushWorkspaceToCloud(lic);
      expect(netErr.ok).toBe(false);
      expect(getLastCloudSyncErrorDetail()?.kind).toBe('network_error');

      // 5. Teacher data intact -> recovery succeeds!
      expect(getSchoolProfile().namaSekolah).toBe(profile.namaSekolah);
      const recovery = await pushWorkspaceToCloud(lic);
      expect(recovery.ok).toBe(true);
      expect(recovery.revision).toBe(1);
      expect(getCloudSyncUiStatus()).toBe('synced');
    });

    it('prevents partial-write corruption when chunked upload or chunked pull fails mid-transfer and recovers cleanly on retry', async () => {
      const lic = await issueAndActivateTestLicense('DEV-PARTIAL-1', 'PARTIAL1246');
      const profile = makeSyntheticProfile({ schoolId: 'sch_partial' });
      populateWorkspaceFixture({
        profile,
        tpCount: 16,
        modulCount: 10,
        modulMeetings: 6,
        lkpdCount: 6,
        studentCount: 25,
        detailMultiplier: 2,
      });

      // Seed valid Revision #1 first
      const seedRes = await pushWorkspaceToCloud(lic);
      expect(seedRes.ok).toBe(true);
      expect(seedRes.revision).toBe(1);

      // Teacher edits profile & adds a new Modul Ajar
      const updatedProfile = { ...profile, namaSekolah: 'SMPN Edit Setelah Partial' };
      saveSchoolProfile(updatedProfile);
      const tps = makeSyntheticTPList(16, updatedProfile);
      saveModulAjarDraft(
        updatedProfile,
        tps[0],
        'pjbl',
        buildLongAiStyleModul(tps[0], updatedProfile, 8, 3),
        'user_edited'
      );

      // Force chunked upload and fail on chunk #2 (push_chunk #1 succeeds, #2 returns 503!)
      const origFetch = globalThis.fetch;
      let pushChunkCalls = 0;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === '/api/cloud-sync' && init?.body) {
          const b = JSON.parse(String(init.body)) as { action?: string };
          if (b.action === 'push_chunk') {
            pushChunkCalls += 1;
            if (pushChunkCalls === 2) {
              return new Response(JSON.stringify({ ok: false, message: 'Simulated drop at chunk 2' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              });
            }
          }
        }
        return origFetch(input, init);
      }) as typeof fetch;

      const partialPush = await pushWorkspaceToCloud(lic, '', {
        forceChunked: true,
        maxChunkBytes: 180_000,
      });
      globalThis.fetch = origFetch;

      expect(partialPush.ok).toBe(false);
      expect(partialPush.partialSync).toBe(true);
      expect(partialPush.failedChunkIndex).toBe(1);
      expect(partialPush.totalChunks).toBeGreaterThanOrEqual(2);
      expect(getCloudSyncUiStatus()).toBe('sync_error');
      expect(getLastCloudSyncErrorDetail()?.kind).toBe('partial_sync');
      // Base revision still 1, commit_chunks never ran -> server still cleanly holds Rev #1!
      expect(getWorkspaceBaseRevision(lic)).toBe(1);
      expect(getSchoolProfile().namaSekolah).toBe('SMPN Edit Setelah Partial');

      // Retry chunked push -> succeeds atomically at Revision #2!
      const retryPush = await pushWorkspaceToCloud(lic, '', {
        forceChunked: true,
        maxChunkBytes: 180_000,
      });
      expect(retryPush.ok).toBe(true);
      expect(retryPush.revision).toBe(2);

      // Also test partial CHUNKED PULL failure on a >1.2 MB workspace (must NOT overwrite localStorage!)
      localStorage.setItem('asesmerdeka_school_profile_v1', JSON.stringify({ ...updatedProfile, namaSekolah: 'DATA_LOKAL_SEBELUM_PULL' }));
      saveSchoolProfile({ ...updatedProfile, namaSekolah: 'DATA_LOKAL_SEBELUM_PULL' });

      // Ensure server >1.2 MB by adding more modules on Rev #2? Wait: pushWorkspaceFixture check size:
      if ((retryPush.rawBytes || 0) <= 1_200_000) {
        populateWorkspaceFixture({
          profile: updatedProfile,
          tpCount: 24,
          modulCount: 16,
          modulMeetings: 8,
          lkpdCount: 8,
          studentCount: 25,
          detailMultiplier: 3,
        });
        const bigPush = await pushWorkspaceToCloud(lic);
        expect(bigPush.ok).toBe(true);
        saveSchoolProfile({ ...updatedProfile, namaSekolah: 'DATA_LOKAL_SEBELUM_PULL' });
      }

      let pullChunkCalls = 0;
      const prevFetch2 = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === '/api/cloud-sync' && init?.body) {
          const b = JSON.parse(String(init.body)) as { action?: string };
          if (b.action === 'pull_chunk') {
            pullChunkCalls += 1;
            if (pullChunkCalls === 2) {
              return new Response(JSON.stringify({ ok: false, message: 'Chunk pull interrupted' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              });
            }
          }
        }
        return prevFetch2(input, init);
      }) as typeof fetch;

      const failedPull = await pullWorkspaceFromCloud(lic);
      globalThis.fetch = prevFetch2;

      expect(failedPull.ok).toBe(false);
      expect(failedPull.partialSync).toBe(true);
      expect(getSchoolProfile().namaSekolah).toBe('DATA_LOKAL_SEBELUM_PULL');

      const cleanPull = await pullWorkspaceFromCloud(lic);
      expect(cleanPull.ok).toBe(true);
      expect(getSchoolProfile().namaSekolah).toBe('SMPN Edit Setelah Partial');
    }, 20_000);

    it('resolves 409 Conflict via 3-way merge cleanly on a >1.5 MB chunked workspace without losing either device changes', async () => {
      const lic = await issueAndActivateTestLicense('DEV-MERGE-A', 'MERGE15MB');
      const profile = makeSyntheticProfile({ schoolId: 'sch_merge_big' });
      populateWorkspaceFixture({
        profile,
        tpCount: 24,
        modulCount: 16,
        modulMeetings: 8,
        lkpdCount: 8,
        studentCount: 28,
        detailMultiplier: 3,
      });

      const rev1 = await pushWorkspaceToCloud(lic);
      expect(rev1.ok).toBe(true);
      expect(rev1.rawBytes!).toBeGreaterThan(1_500_000);

      // Snapshot Device A at Rev #1, setup Device B from Rev #1
      const snapA = new Map<string, string>();
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i)!;
        snapA.set(k, localStorage.getItem(k)!);
      }

      // Device B pulls Rev #1
      localStorage.clear();
      await activateExistingTestLicense(lic, 'DEV-MERGE-B');
      const pullB = await pullWorkspaceFromCloud(lic);
      expect(pullB.ok).toBe(true);
      expect(pullB.mode).toBe('chunked_pull');

      const tps = makeSyntheticTPList(24, profile);

      // Device B edits TP[1] Modul Ajar and pushes Rev #2
      const modB = loadModulAjarDraft(profile, tps[1], 'pjbl') || buildLongAiStyleModul(tps[1], profile, 6);
      saveModulAjarDraft(profile, tps[1], 'pjbl', { ...modB, judul: 'EDIT_DEVICE_B_SAFE' }, 'user_edited');
      const pushB2 = await pushWorkspaceToCloud(lic);
      expect(pushB2.ok).toBe(true);
      expect(pushB2.revision).toBe(2);

      // Restore Device A at Rev #1, edit TP[0] Modul Ajar + push -> triggers 409 Conflict (with serverEntriesChunked)
      localStorage.clear();
      snapA.forEach((v, k) => localStorage.setItem(k, v));
      const modA = loadModulAjarDraft(profile, tps[0], 'pbl')!;
      saveModulAjarDraft(profile, tps[0], 'pbl', { ...modA, judul: 'EDIT_DEVICE_A_SAFE' }, 'user_edited');

      const conflictPushA = await pushWorkspaceToCloud(lic);
      expect(conflictPushA.ok).toBe(false);
      expect(conflictPushA.conflict).toBe(true);
      expect(getPendingCloudConflict()).not.toBeNull();
      expect(getCloudSyncUiStatus()).toBe('conflict');

      const mergeRes = await resolveCloudConflict('merge_safe', { allowDefaultForUnchosen: true });
      expect(mergeRes.ok).toBe(true);
      expect(mergeRes.revision).toBe(3);

      // Verify BOTH Device A and Device B edits coexist in final merged state
      expect(loadModulAjarDraft(profile, tps[0], 'pbl')?.judul).toBe('EDIT_DEVICE_A_SAFE');
      expect(loadModulAjarDraft(profile, tps[1], 'pjbl')?.judul).toBe('EDIT_DEVICE_B_SAFE');
    }, 20_000);

    it('never falsely claims synced on reload mid-sync and skips redundant unchanged auto-sync pushes', async () => {
      const lic = await issueAndActivateTestLicense('DEV-INFLIGHT-1', 'INFLIGHT');
      const profile = makeSyntheticProfile({ schoolId: 'sch_inflight' });
      populateWorkspaceFixture({
        profile,
        tpCount: 5,
        modulCount: 1,
        modulMeetings: 4,
        lkpdCount: 1,
        studentCount: 5,
      });

      const first = await pushWorkspaceToCloud(lic);
      expect(first.ok).toBe(true);
      expect(getCloudSyncUiStatus()).toBe('synced');

      // 1. Auto-sync with zero local changes skips network call cleanly!
      const reqCountBefore = sim.requestLog.length;
      const unchangedAuto = await pushWorkspaceToCloud(lic, '', { isAutoSync: true });
      expect(unchangedAuto.ok).toBe(true);
      expect(unchangedAuto.skippedUnchanged).toBe(true);
      expect(sim.requestLog.length).toBe(reqCountBefore);

      // 2. Simulate page reload interrupting an in-flight push before server commit
      saveSchoolProfile({ ...profile, kotaSekolah: 'Semarang Reload Mid-Sync' });
      const origFetch = globalThis.fetch;
      let midSyncSnapshot: Map<string, string> | null = null;
      globalThis.fetch = (async () => {
        // Capture localStorage state WHILE push is in flight (before server commit), then simulate tab abort
        midSyncSnapshot = new Map<string, string>();
        for (let i = 0; i < localStorage.length; i += 1) {
          const k = localStorage.key(i)!;
          midSyncSnapshot.set(k, localStorage.getItem(k)!);
        }
        const abortErr = new Error('The operation was aborted due to page reload.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }) as typeof fetch;

      await pushWorkspaceToCloud(lic);
      globalThis.fetch = origFetch;
      expect(midSyncSnapshot).not.toBeNull();

      // Simulate reboot from the mid-sync snapshot
      localStorage.clear();
      midSyncSnapshot!.forEach((v, k) => localStorage.setItem(k, v));
      expect(getCloudSyncUiStatus()).not.toBe('synced');
      expect(getCloudSyncUiStatus()).toBe('local');
      expect(getSchoolProfile().kotaSekolah).toBe('Semarang Reload Mid-Sync');

      // TopHeader renders 'Tersimpan lokal' (honest, never 'Lokal & cloud')
      const headerHtml = renderToStaticMarkup(
        React.createElement(TopHeader, {
          pageSection: 'Modul Ajar',
          pageTitle: 'Editor',
          schoolProfile: getSchoolProfile(),
          storageStatus: getCloudSyncUiStatus() as HonestCloudStatus,
          onOpenSchoolModal: vi.fn(),
          onToggleMobileSidebar: vi.fn(),
        })
      );
      expect(headerHtml).toContain('Tersimpan lokal');
      expect(headerHtml).not.toContain('Lokal &amp; cloud');

      // Subsequent retry succeeds cleanly and restores 'synced'
      const recoverPush = await pushWorkspaceToCloud(lic);
      expect(recoverPush.ok).toBe(true);
      expect(getCloudSyncUiStatus()).toBe('synced');
    });
  });
});
