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

import type { KelasHarianData, NilaiSiswaItem, SiswaItem } from '../../types/kelasHarian';
import {
  exportBackupDataJson,
  importBackupDataJson,
  saveCustomTPList,
  saveSchoolProfile,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import {
  generateAutoDeskripsiRapor,
  getKelasHarianData,
  saveKelasHarianData,
} from '../kelasHarianStorage';
import { analyzeStudentTPMastery, createBuktiAsesmenEntry } from '../learningMasteryEngine';
import {
  buildRemedialScopeIdentity,
  evaluateClassRemedialOverview,
  evaluateStudentTPRemedialTarget,
  isEvidenceProtectedFromDeletion,
  recordNonDestructiveReassessment,
  upsertStudentRemedialPlan,
} from '../remedialTrackingEngine';
import {
  analyzeWorkspaceConflict,
  clearCloudSyncAutoRetrySuppression,
  pullWorkspaceFromCloud,
  pushWorkspaceToCloud,
} from '../cloudSyncManager';
import * as licenseManager from '../licenseManager';
import { BukuNilaiTab } from '../../components/harian/BukuNilaiTab';
import { RemedialTrackingPanel } from '../../components/harian/RemedialTrackingPanel';
import { StudentEvidenceModal } from '../../components/harian/StudentEvidenceModal';
// @ts-expect-error serverless JS handler tested directly with mock req/res
import cloudSyncHandler, {
  clearCloudSyncRateLimitStore,
  clearLocalDevCloudSyncStore,
} from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS store cleared for isolation
import activateLicenseHandler, {
  generateStagingLicenseCode,
  localRevokedLicensesSet,
  localSeatMemoryStore,
  localStagingRevokedLicensesSet,
} from '../../../api/activate-license.js';

vi.mock('file-saver', () => ({
  default: vi.fn(),
}));

const MOCK_REDIS_URL = 'https://staging-sim-11-1.upstash.test';
const MOCK_REDIS_TOKEN = 'synthetic-upstash-token-task111-do-not-leak';
const MOCK_PEPPER = 'Stg111!CloudSyncPepper#2026_Entropy987654321';
const MOCK_STAGING_SIGNING_SECRET = 'Task111_StagingLicenseSigningSecret_32PlusChars_OK';

function makeSyntheticProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_synth_11_1',
    instansiDinas: 'Dinas Pendidikan Sintetis 11.1',
    namaSekolah: 'SMP Sintetis 11.1 Uji',
    alamatSekolah: 'Jl. Uji Remedial No. 11',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII B',
    daftarRombel: ['VIII B', 'VIII C'],
    mataPelajaranUtama: 'Matematika',
    namaGuru: 'Guru Sintetis 11.1, S.Pd.',
    nipGuru: '198901012015011001',
    namaKepalaSekolah: 'Kepala Sintetis 11.1, M.Pd.',
    nipKepalaSekolah: '197001011998011001',
    kotaSekolah: 'Bandung',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    kktpMinTuntas: 78,
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

function makeSyntheticTPs(): CustomTPItem[] {
  return [
    {
      id: 'tpid_111_1',
      kode: '8.1',
      elemen: 'Bilangan',
      materiPokok: 'Operasi Bilangan Berpangkat',
      tujuanPembelajaran: 'Peserta didik dapat menyederhanakan operasi bilangan berpangkat.',
      arahanRangkuman: 'Pangkat bulat dan sifat operasi',
      alokasiJP: 10,
      mingguMulai: 1,
      mingguSelesai: 3,
      subTP: [
        {
          id: 'sub_111_1a',
          kode: '8.1.A',
          kompetensi: 'Mengubah perkalian berulang menjadi notasi pangkat',
          fokusMateri: 'Notasi Pangkat Positif',
          buktiKetercapaian: 'Menuliskan basis dan eksponen tepat',
        },
        {
          id: 'sub_111_1b',
          kode: '8.1.B',
          kompetensi: 'Menerapkan aturan pembagian bilangan berpangkat',
          fokusMateri: 'Sifat Pembagian Eksponen',
          buktiKetercapaian: 'Mengurangi eksponen pada basis sama',
        },
      ],
    },
    {
      id: 'tpid_111_2',
      kode: '8.2',
      elemen: 'Aljabar',
      materiPokok: 'Persamaan Linear Satu Variabel',
      tujuanPembelajaran: 'Peserta didik menyelesaikan persamaan linear satu variabel.',
      arahanRangkuman: 'PLSV dasar',
      alokasiJP: 10,
      mingguMulai: 4,
      mingguSelesai: 6,
      kktpMinTuntas: 82,
    },
  ];
}

function makeStudent(id: string, noUrut: number, nama: string): SiswaItem {
  return {
    id,
    noUrut,
    nis: `91${String(noUrut).padStart(3, '0')}`,
    nama,
    jenisKelamin: noUrut % 2 === 0 ? 'P' : 'L',
    statusAktif: 'aktif',
  };
}

function makeNilaiRow(
  siswaId: string,
  nama: string,
  nis: string,
  overrides: Partial<NilaiSiswaItem> = {}
): NilaiSiswaItem {
  return {
    siswaId,
    nama,
    nis,
    nilaiFormatif: {},
    nilaiSTS: null,
    nilaiSAS: null,
    nilaiPraktik: null,
    nilaiAkhir: null,
    predikatKKTP: 'Belum Dinilai',
    statusNilai: 'belum_dinilai',
    deskripsiRapor: '',
    ...overrides,
  };
}

class UpstashSim111 {
  kv = new Map<string, string>();

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
      const cmd = JSON.parse(String(init.body)) as unknown[];
      const op = String(cmd[0] || '').toUpperCase();
      if (op === 'SET') {
        this.kv.set(String(cmd[1] || ''), String(cmd[2] || ''));
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }
      if (op === 'DEL') {
        let deleted = 0;
        for (let i = 1; i < cmd.length; i += 1) {
          if (this.kv.delete(String(cmd[i] || ''))) deleted += 1;
        }
        return new Response(JSON.stringify({ result: deleted }), { status: 200 });
      }
      if (op === 'EVAL') {
        const script = String(cmd[1] || '');
        const key = String(cmd[3] || '');
        if (script.includes('ASESMERDEKA_RATE_LIMIT_V1')) {
          return new Response(JSON.stringify({ result: [0, -1] }), { status: 200 });
        }
        const expectedRev = Number(cmd[4]);
        const nextJson = String(cmd[5] || '');
        const currentRaw = this.kv.get(key);
        if (!currentRaw) {
          if (!Number.isNaN(expectedRev) && expectedRev > 0) {
            return new Response(JSON.stringify({ result: ['CONFLICT', '0', ''] }), { status: 200 });
          }
          this.kv.set(key, nextJson);
          return new Response(JSON.stringify({ result: ['OK', nextJson] }), { status: 200 });
        }
        const parsed = JSON.parse(currentRaw) as { revision?: number; lastRequestId?: string };
        const curRev = Number(parsed.revision) || 1;
        if (cmd[6] && parsed.lastRequestId === String(cmd[6])) {
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
    return new Response(JSON.stringify({ error: 'Unsupported command' }), { status: 400 });
  }
}

async function invokeActivateApi(body: Record<string, unknown>, ip = '10.111.1.1') {
  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    await activateLicenseHandler(
      { method: 'POST', headers: { 'x-forwarded-for': ip }, body },
      {
        setHeader() {},
        status(c: number) {
          statusCode = c;
          return this;
        },
        json(b: Record<string, unknown>) {
          responseBody = b;
          return this;
        },
      }
    );
  } finally {
    if (savedUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
  return { statusCode, body: responseBody };
}

async function invokeCloudSync(body: Record<string, unknown>, ip = '10.111.1.2') {
  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  await cloudSyncHandler(
    { method: 'POST', headers: { 'x-forwarded-for': ip }, body },
    {
      setHeader() {},
      status(c: number) {
        statusCode = c;
        return this;
      },
      json(b: Record<string, unknown>) {
        responseBody = b;
        return this;
      },
    }
  );
  return { statusCode, body: responseBody };
}

describe('Task 11.1 — Core Remedial Tracking & Non-Destructive Reassessment', () => {
  const prevEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CLOUD_SYNC_PIN_PEPPER: process.env.CLOUD_SYNC_PIN_PEPPER,
    ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET:
      process.env.ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    NODE_ENV: process.env.NODE_ENV,
  };

  let sim: UpstashSim111;
  let originalFetch: typeof fetch;

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

    sim = new UpstashSim111();
    originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (urlStr.startsWith(MOCK_REDIS_URL)) {
        return sim.handleRedisFetch(urlStr, init);
      }
      if (urlStr === '/api/activate-license') {
        const res = await invokeActivateApi(JSON.parse(String(init?.body || '{}')));
        return new Response(JSON.stringify(res.body), {
          status: res.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (urlStr === '/api/cloud-sync') {
        const res = await invokeCloudSync(JSON.parse(String(init?.body || '{}')));
        return new Response(JSON.stringify(res.body), {
          status: res.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected fetch URL in Task 11.1 test: ${urlStr}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    clearCloudSyncAutoRetrySuppression();
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v !== undefined) process.env[k] = v;
      else delete process.env[k];
    }
  });

  it('1. Evaluates all 12 synthetic eligibility & remedial lifecycle scenarios accurately using active KKTP without hardcoded 71', () => {
    const profile = makeSyntheticProfile({ kktpMinTuntas: 78 });
    const tps = makeSyntheticTPs();
    const tp1 = tps[0]; // Uses class KKTP = 78
    const tp2 = tps[1]; // Uses TP override KKTP = 82

    // Build evidence fixtures
    const evLowMulti1 = createBuktiAsesmenEntry({
      id: 'ev_multi_1',
      tp: { id: tp1.id, kode: tp1.kode },
      jenisBukti: 'tes',
      sumberBukti: 'asesmen',
      skor: 6,
      skalaSkor: 10, // 60%
      kktpMinTuntas: 78,
      indikatorYangDiamati: 'Tes awal pangkat',
    });
    const evLowMulti2 = createBuktiAsesmenEntry({
      id: 'ev_multi_2',
      tp: { id: tp1.id, kode: tp1.kode },
      jenisBukti: 'lkpd',
      sumberBukti: 'lkpd',
      skor: 2,
      skalaSkor: 4, // 50% -> avg = 55% < 78
      kktpMinTuntas: 78,
      indikatorYangDiamati: 'LKPD awal pangkat',
      catatanMiskonsepsi: 'Menjumlahkan basis saat dikalikan',
    });

    const evSub1Fail = createBuktiAsesmenEntry({
      id: 'ev_sub_fail1',
      tp: { id: tp1.id, kode: tp1.kode },
      subTp: tp1.subTP![0],
      jenisBukti: 'tes',
      sumberBukti: 'asesmen',
      skor: 40,
      skalaSkor: 100,
      kktpMinTuntas: 78,
      indikatorYangDiamati: 'Notasi pangkat awal',
    });
    const evSub2Fail = createBuktiAsesmenEntry({
      id: 'ev_sub_fail2',
      tp: { id: tp1.id, kode: tp1.kode },
      subTp: tp1.subTP![1],
      jenisBukti: 'lkpd',
      sumberBukti: 'lkpd',
      skor: 48,
      skalaSkor: 100,
      kktpMinTuntas: 78,
      indikatorYangDiamati: 'Pembagian eksponen awal',
    });

    const roster: SiswaItem[] = [
      makeStudent('s1_tuntas', 1, 'Siswa 01 Tuntas'),
      makeStudent('s2_belum', 2, 'Siswa 02 Belum Tuntas KKTP 78/82'),
      makeStudent('s3_kosong', 3, 'Siswa 03 Belum Ada Bukti'),
      makeStudent('s4_nol', 4, 'Siswa 04 Nilai Nol'),
      makeStudent('s5_multi', 5, 'Siswa 05 Multi Bukti'),
      makeStudent('s6_subtp', 6, 'Siswa 06 Multi SubTP'),
      makeStudent('s7_sedang', 7, 'Siswa 07 Sedang Remedial'),
      makeStudent('s8_tunggu', 8, 'Siswa 08 Menunggu Reassessment'),
      makeStudent('s9_naik', 9, 'Siswa 09 Reassessment Meningkat'),
      makeStudent('s10_tetap', 10, 'Siswa 10 Reassessment Belum Tuntas'),
      makeStudent('s11_final', 11, 'Siswa 11 Rapor Final Terkunci'),
    ];

    let kelasHarian: KelasHarianData = {
      rombel: 'VIII B',
      mataPelajaran: 'Matematika',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      isSimulated: false,
      dataSource: 'user_manual',
      bobotNilai: { bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, kktpMinTuntas: 78 },
      daftarSiswa: roster,
      daftarPresensi: [],
      daftarJurnal: [],
      daftarNilai: [
        // 1. Tuntas (79 >= 78 for tp1, 83 >= 82 for tp2)
        makeNilaiRow('s1_tuntas', 'Siswa 01 Tuntas', '91001', {
          nilaiFormatif: { [tp1.id]: 79, [tp2.id]: 83 },
        }),
        // 2. Belum tuntas: 74 meets 71 if hardcoded, MUST fail KKTP 78! And 80 meets 78, MUST fail TP2 KKTP 82!
        makeNilaiRow('s2_belum', 'Siswa 02 Belum Tuntas KKTP 78/82', '91002', {
          nilaiFormatif: { [tp1.id]: 74, [tp2.id]: 80 },
        }),
        // 3. Belum memiliki evidence sama sekali (kosong -> tidak boleh masuk sasaran remedial!)
        makeNilaiRow('s3_kosong', 'Siswa 03 Belum Ada Bukti', '91003'),
        // 4. Nilai 0 sah (0 !== kosong -> wajib masuk sasaran remedial!)
        makeNilaiRow('s4_nol', 'Siswa 04 Nilai Nol', '91004', {
          nilaiFormatif: { [tp1.id]: 0 },
        }),
        // 5. Beberapa evidence awal + catatan miskonsepsi
        makeNilaiRow('s5_multi', 'Siswa 05 Multi Bukti', '91005', {
          buktiAsesmenSubTP: [evLowMulti1, evLowMulti2],
        }),
        // 6. Beberapa Sub-TP belum tercapai
        makeNilaiRow('s6_subtp', 'Siswa 06 Multi SubTP', '91006', {
          buktiAsesmenSubTP: [evSub1Fail, evSub2Fail],
        }),
        // 7..10 Start with initial score < 78 on tp1
        makeNilaiRow('s7_sedang', 'Siswa 07 Sedang Remedial', '91007', {
          nilaiFormatif: { [tp1.id]: 58 },
        }),
        makeNilaiRow('s8_tunggu', 'Siswa 08 Menunggu Reassessment', '91008', {
          nilaiFormatif: { [tp1.id]: 62 },
        }),
        makeNilaiRow('s9_naik', 'Siswa 09 Reassessment Meningkat', '91009', {
          nilaiFormatif: { [tp1.id]: 55 },
        }),
        makeNilaiRow('s10_tetap', 'Siswa 10 Reassessment Belum Tuntas', '91010', {
          nilaiFormatif: { [tp1.id]: 50 },
        }),
        // 11. Rapor Final Terkunci
        makeNilaiRow('s11_final', 'Siswa 11 Rapor Final Terkunci', '91011', {
          nilaiFormatif: { [tp1.id]: 60, [tp2.id]: 90 },
          nilaiSTS: 80,
          nilaiSAS: 82,
          nilaiAkhir: 78,
          predikatKKTP: 'Baik',
          statusNilai: 'lengkap',
          statusRapor: 'final',
          finalizedAt: '2026-11-20T09:00:00.000Z',
          deskripsiRapor: 'DESKRIPSI_FINAL_TERKUNCI_S11',
        }),
      ],
    };

    // Apply workflows for 7..11
    kelasHarian = upsertStudentRemedialPlan({
      kelasHarian,
      schoolProfile: profile,
      tp: tp1,
      siswaId: 's7_sedang',
      jenisIntervensi: 'kelompok_kecil',
      statusTindakLanjut: 'berlangsung',
      rencanaKegiatan: 'Pendampingan sifat eksponen sesi 1',
    }).kelasHarian;

    kelasHarian = upsertStudentRemedialPlan({
      kelasHarian,
      schoolProfile: profile,
      tp: tp1,
      siswaId: 's8_tunggu',
      jenisIntervensi: 'bimbingan_individu',
      statusTindakLanjut: 'selesai_perlu_reassessment',
      rencanaKegiatan: 'Bimbingan individu selesai',
      hasilKegiatan: 'Siap tes ulang besok',
    }).kelasHarian;

    const r9Plan = upsertStudentRemedialPlan({
      kelasHarian,
      schoolProfile: profile,
      tp: tp1,
      siswaId: 's9_naik',
      jenisIntervensi: 'penugasan_terbimbing',
      statusTindakLanjut: 'selesai_perlu_reassessment',
      rencanaKegiatan: 'Latihan soal bertingkat',
    });
    kelasHarian = recordNonDestructiveReassessment({
      kelasHarian: r9Plan.kelasHarian,
      schoolProfile: profile,
      tp: tp1,
      siswaId: 's9_naik',
      remedialId: r9Plan.record.id,
      jenisBukti: 'tes',
      skor: 86,
      skalaSkor: 100,
      indikatorYangDiamati: 'Tes ulang eksponen',
      catatanGuru: 'Berhasil menyelesaikan semua langkah dengan benar',
    }).kelasHarian;

    const r10Plan = upsertStudentRemedialPlan({
      kelasHarian,
      schoolProfile: profile,
      tp: tp1,
      siswaId: 's10_tetap',
      jenisIntervensi: 'pendekatan_ulang',
      statusTindakLanjut: 'selesai_perlu_reassessment',
    });
    kelasHarian = recordNonDestructiveReassessment({
      kelasHarian: r10Plan.kelasHarian,
      schoolProfile: profile,
      tp: tp1,
      siswaId: 's10_tetap',
      remedialId: r10Plan.record.id,
      jenisBukti: 'tes',
      skor: 68, // Naik dari 50 tapi masih < 78!
      skalaSkor: 100,
      indikatorYangDiamati: 'Tes ulang eksponen',
    }).kelasHarian;

    // 11. Record remedial & reassessment on locked final report student
    const r11Plan = upsertStudentRemedialPlan({
      kelasHarian,
      schoolProfile: profile,
      tp: tp1,
      siswaId: 's11_final',
      jenisIntervensi: 'bimbingan_individu',
      statusTindakLanjut: 'berlangsung',
      rencanaKegiatan: 'Dokumentasi pasca-finalisasi',
    });
    expect(r11Plan.finalReportPreserved).toBe(true);
    const r11Reassess = recordNonDestructiveReassessment({
      kelasHarian: r11Plan.kelasHarian,
      schoolProfile: profile,
      tp: tp1,
      siswaId: 's11_final',
      remedialId: r11Plan.record.id,
      jenisBukti: 'tes',
      skor: 92,
      skalaSkor: 100,
      indikatorYangDiamati: 'Reassessment pasca-finalisasi',
    });
    kelasHarian = r11Reassess.kelasHarian;
    expect(r11Reassess.finalReportPreserved).toBe(true);

    // Evaluate Class Remedial Overview
    const overview = evaluateClassRemedialOverview({
      kelasHarian,
      tpList: tps,
      schoolProfile: profile,
    });

    expect(overview.activeClassKKTP).toBe(78);

    // Check Scenario 1: s1_tuntas NOT in targets for tp1 or tp2
    expect(overview.targets.some((t) => t.siswaId === 's1_tuntas')).toBe(false);

    // Check Scenario 2: s2_belum IS eligible on BOTH tp1 (74 < 78) and tp2 (80 < 82)!
    const s2Tp1 = overview.targets.find((t) => t.siswaId === 's2_belum' && t.tpId === tp1.id)!;
    const s2Tp2 = overview.targets.find((t) => t.siswaId === 's2_belum' && t.tpId === tp2.id)!;
    expect(s2Tp1.thresholdKKTP).toBe(78);
    expect(s2Tp2.thresholdKKTP).toBe(82);
    expect(s2Tp1.eligibleForRemedial).toBe(true);
    expect(s2Tp2.eligibleForRemedial).toBe(true);
    expect(s2Tp1.alasanKetidaktercapaian.join(' ')).toContain('74');
    // Must NEVER fabricate Sub-TP failures when Sub-TP has no specific evidence
    expect(s2Tp1.unachievedSubTps).toHaveLength(0);

    // Check Scenario 3: s3_kosong NEVER enters targets, separated into unassessedEntries
    expect(overview.targets.some((t) => t.siswaId === 's3_kosong')).toBe(false);
    expect(overview.unassessedEntries.some((u) => u.siswaId === 's3_kosong')).toBe(true);

    // Check Scenario 4: s4_nol (score 0) IS eligible on tp1 & NOT eligible on blank tp2!
    const s4Tp1 = overview.targets.find((t) => t.siswaId === 's4_nol' && t.tpId === tp1.id)!;
    expect(s4Tp1).toBeDefined();
    expect(s4Tp1.isUnassessed).toBe(false);
    expect(s4Tp1.initialAssessment.formatifScore).toBe(0);
    expect(overview.targets.some((t) => t.siswaId === 's4_nol' && t.tpId === tp2.id)).toBe(false);

    // Check Scenario 5: Multi-evidence average 55% + misconception note
    const s5Tp1 = overview.targets.find((t) => t.siswaId === 's5_multi' && t.tpId === tp1.id)!;
    expect(s5Tp1.initialAssessment.normalizedEvidenceAvg100).toBe(55);
    expect(s5Tp1.catatanMiskonsepsiGuru).toContain('Menjumlahkan basis saat dikalikan');

    // Check Scenario 6: Multiple unachieved Sub-TPs accurately surfaced
    const s6Tp1 = overview.targets.find((t) => t.siswaId === 's6_subtp' && t.tpId === tp1.id)!;
    expect(s6Tp1.unachievedSubTps.map((s) => s.subTpKode)).toEqual(['8.1.A', '8.1.B']);

    // Check Scenario 7 & 8: Remedial statuses & history retained
    const s7Tp1 = overview.targets.find((t) => t.siswaId === 's7_sedang' && t.tpId === tp1.id)!;
    const s8Tp1 = overview.targets.find((t) => t.siswaId === 's8_tunggu' && t.tpId === tp1.id)!;
    expect(s7Tp1.visualCategory).toBe('sedang_remedial');
    expect(s8Tp1.visualCategory).toBe('menunggu_reassessment');

    // Check Scenario 9: Reassessment improved & original score (55) untouched!
    const s9Tp1 = overview.targets.find((t) => t.siswaId === 's9_naik' && t.tpId === tp1.id)!;
    expect(s9Tp1.visualCategory).toBe('sudah_reassessment_tuntas');
    expect(s9Tp1.initialAssessment.formatifScore).toBe(55);
    expect(s9Tp1.reassessment.latestScore100).toBe(86);
    expect(s9Tp1.reassessment.improvedFromInitial).toBe(true);
    const s9Raw = kelasHarian.daftarNilai.find((n) => n.siswaId === 's9_naik')!;
    expect(s9Raw.nilaiFormatif[tp1.id]).toBe(55);

    // Check Scenario 10: Reassessment increased (50 -> 68) but still below KKTP 78!
    const s10Tp1 = overview.targets.find((t) => t.siswaId === 's10_tetap' && t.tpId === tp1.id)!;
    expect(s10Tp1.visualCategory).toBe('sudah_reassessment_belum_tuntas');
    expect(s10Tp1.latestRemedial?.statusTindakLanjut).toBe('belum_tuntas');
    expect(s10Tp1.initialAssessment.formatifScore).toBe(50);

    // Check Scenario 11: Final report lock respected bit-for-bit!
    const s11Raw = kelasHarian.daftarNilai.find((n) => n.siswaId === 's11_final')!;
    expect(s11Raw.statusRapor).toBe('final');
    expect(s11Raw.finalizedAt).toBe('2026-11-20T09:00:00.000Z');
    expect(s11Raw.nilaiAkhir).toBe(78);
    expect(s11Raw.predikatKKTP).toBe('Baik');
    expect(s11Raw.deskripsiRapor).toBe('DESKRIPSI_FINAL_TERKUNCI_S11');
    expect(s11Raw.nilaiFormatif[tp1.id]).toBe(60);
    expect(isEvidenceProtectedFromDeletion(s11Raw, s11Raw.buktiAsesmenSubTP![0].id).protected).toBe(
      true
    );
  });

  it('2. Preserves original evidence, blocks deletion of linked initial evidence, prevents retry duplication, and keeps reassessment separate from initial mastery/e-Rapor', () => {
    const profile = makeSyntheticProfile({ kktpMinTuntas: 75 });
    const tp = makeSyntheticTPs()[0];

    const origEv = createBuktiAsesmenEntry({
      id: 'ev_orig_protected',
      tp: { id: tp.id, kode: tp.kode },
      jenisBukti: 'tes',
      sumberBukti: 'asesmen',
      skor: 52,
      skalaSkor: 100,
      kktpMinTuntas: 75,
      indikatorYangDiamati: 'Bukti awal dilindungi',
    });

    const student = makeNilaiRow('s_prot', 'Siswa Terlindungi', '91020', {
      buktiAsesmenSubTP: [origEv],
    });
    let kelasHarian: KelasHarianData = {
      rombel: 'VIII B',
      mataPelajaran: 'Matematika',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      bobotNilai: { bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, kktpMinTuntas: 75 },
      daftarSiswa: [makeStudent('s_prot', 1, 'Siswa Terlindungi')],
      daftarPresensi: [],
      daftarJurnal: [],
      daftarNilai: [student],
    };

    // Create plan twice with same values & explicit remedialId -> idempotent (no duplicate record or audit event!)
    const planCall1 = upsertStudentRemedialPlan({
      kelasHarian,
      schoolProfile: profile,
      tp,
      siswaId: 's_prot',
      remedialId: 'remed_fixed_1',
      jenisIntervensi: 'bimbingan_individu',
      tanggalIntervensi: '2026-11-21',
      statusTindakLanjut: 'direncanakan',
      rencanaKegiatan: 'Bimbingan awal',
    });
    const planRetry = upsertStudentRemedialPlan({
      kelasHarian: planCall1.kelasHarian,
      schoolProfile: profile,
      tp,
      siswaId: 's_prot',
      remedialId: 'remed_fixed_1',
      jenisIntervensi: 'bimbingan_individu',
      tanggalIntervensi: '2026-11-21',
      statusTindakLanjut: 'direncanakan',
      rencanaKegiatan: 'Bimbingan awal',
    });
    expect(planRetry.record.auditTrail).toHaveLength(1);
    expect(planRetry.kelasHarian.daftarNilai[0].riwayatRemedial).toHaveLength(1);

    // Status progression maintains full audit trail
    const inProgress = upsertStudentRemedialPlan({
      kelasHarian: planRetry.kelasHarian,
      schoolProfile: profile,
      tp,
      siswaId: 's_prot',
      remedialId: 'remed_fixed_1',
      jenisIntervensi: 'bimbingan_individu',
      statusTindakLanjut: 'berlangsung',
      hasilKegiatan: 'Siswa latihan ulang 5 soal',
    });
    expect(inProgress.record.auditTrail?.map((e) => e.action)).toEqual([
      'created',
      'status_changed',
    ]);

    // Record reassessment twice identically -> idempotent (zero duplicate reassessment evidences!)
    const reassess1 = recordNonDestructiveReassessment({
      kelasHarian: inProgress.kelasHarian,
      schoolProfile: profile,
      tp,
      siswaId: 's_prot',
      remedialId: 'remed_fixed_1',
      jenisBukti: 'tes',
      tanggal: '2026-11-22',
      skor: 88,
      skalaSkor: 100,
      indikatorYangDiamati: 'Tes ulang TP 8.1',
      catatanGuru: 'Meningkat signifikan',
    });
    const reassessRetry = recordNonDestructiveReassessment({
      kelasHarian: reassess1.kelasHarian,
      schoolProfile: profile,
      tp,
      siswaId: 's_prot',
      remedialId: 'remed_fixed_1',
      jenisBukti: 'tes',
      tanggal: '2026-11-22',
      skor: 88,
      skalaSkor: 100,
      indikatorYangDiamati: 'Tes ulang TP 8.1',
      catatanGuru: 'Meningkat signifikan',
    });
    kelasHarian = reassessRetry.kelasHarian;
    const finalRow = kelasHarian.daftarNilai[0];

    expect(finalRow.buktiAsesmenSubTP).toHaveLength(2);
    const storedOrig = finalRow.buktiAsesmenSubTP!.find((e) => e.id === 'ev_orig_protected')!;
    const storedReassess = finalRow.buktiAsesmenSubTP!.find((e) => e.id !== 'ev_orig_protected')!;
    expect(storedOrig.skor).toBe(52);
    expect(storedReassess.peranBukti).toBe('reassessment');
    expect(storedReassess.skor).toBe(88);
    expect(storedReassess.originalEvidenceId).toBe('ev_orig_protected');
    expect(storedReassess.remedialRecordId).toBe('remed_fixed_1');

    // Original evidence MUST be protected from deletion!
    expect(isEvidenceProtectedFromDeletion(finalRow, 'ev_orig_protected').protected).toBe(true);

    // analyzeStudentTPMastery initial score stays 52 even after reassessment 88!
    const masteryCheck = analyzeStudentTPMastery(finalRow, tp, {
      bobotPolicy: { kktpMinTuntas: 75 },
    });
    expect(masteryCheck.normalizedEvidenceAvg100).toBe(52);
    expect(masteryCheck.status).toBe('Perlu Bimbingan');
    expect(masteryCheck.reassessmentEvidences).toHaveLength(1);
    expect(masteryCheck.reassessmentEvidences![0].normalizedScore100).toBe(88);

    // generateAutoDeskripsiRapor must not overwrite or substitute initial score with reassessment!
    const blankFormatifRow: NilaiSiswaItem = {
      ...finalRow,
      nilaiFormatif: {},
    };
    const eRaporText = generateAutoDeskripsiRapor(
      blankFormatifRow.nilaiFormatif,
      [tp],
      blankFormatifRow.nama,
      {
        bobotPolicy: { kktpMinTuntas: 75 },
        buktiAsesmenSubTP: blankFormatifRow.buktiAsesmenSubTP,
        riwayatRemedial: blankFormatifRow.riwayatRemedial,
      }
    );
    expect(eRaporText).toContain('Memerlukan bimbingan intensif serta pendampingan latihan tambahan'); // Initial score 52 < 75!
    expect(eRaporText).not.toContain('Telah menguasai');
  });

  it('3. Scenario 12: Strictly isolates remedial records & reassessment evidences across school, class, and semester boundaries', () => {
    const profileClassB = makeSyntheticProfile({
      schoolId: 'sch_A',
      rombelAktif: 'VIII B',
      semester: '1 (Ganjil)',
    });
    const profileClassC = makeSyntheticProfile({
      schoolId: 'sch_A',
      rombelAktif: 'VIII C',
      semester: '1 (Ganjil)',
    });
    const profileSem2 = makeSyntheticProfile({
      schoolId: 'sch_A',
      rombelAktif: 'VIII B',
      semester: '2 (Genap)',
    });
    const profileOtherSchool = makeSyntheticProfile({
      schoolId: 'sch_B',
      rombelAktif: 'VIII B',
      semester: '1 (Ganjil)',
    });

    const scopeB = buildRemedialScopeIdentity(profileClassB);
    const tp = makeSyntheticTPs()[0];

    let kelasB: KelasHarianData = {
      rombel: 'VIII B',
      mataPelajaran: 'Matematika',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      bobotNilai: { bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, kktpMinTuntas: 78 },
      daftarSiswa: [makeStudent('s_iso', 1, 'Siswa Isolasi')],
      daftarPresensi: [],
      daftarJurnal: [],
      daftarNilai: [makeNilaiRow('s_iso', 'Siswa Isolasi', '91099', { nilaiFormatif: { [tp.id]: 55 } })],
    };

    const pRes = upsertStudentRemedialPlan({
      kelasHarian: kelasB,
      schoolProfile: profileClassB,
      tp,
      siswaId: 's_iso',
      jenisIntervensi: 'bimbingan_individu',
      statusTindakLanjut: 'berlangsung',
    });
    kelasB = recordNonDestructiveReassessment({
      kelasHarian: pRes.kelasHarian,
      schoolProfile: profileClassB,
      tp,
      siswaId: 's_iso',
      remedialId: pRes.record.id,
      jenisBukti: 'tes',
      skor: 85,
      skalaSkor: 100,
      indikatorYangDiamati: 'Tes ulang kelas VIII B',
    }).kelasHarian;

    const studentRow = kelasB.daftarNilai[0];
    expect(studentRow.riwayatRemedial![0].schoolId).toBe(scopeB.schoolId);
    expect(studentRow.riwayatRemedial![0].classId).toBe(scopeB.classId);
    expect(studentRow.riwayatRemedial![0].semesterId).toBe('sem1');

    // Evaluating this row under VIII B Sem 1 sees remedial + reassessment
    const evalSame = evaluateStudentTPRemedialTarget({
      siswaNilai: studentRow,
      tp,
      schoolProfile: profileClassB,
    });
    expect(evalSame.remedialRecords).toHaveLength(1);
    expect(evalSame.reassessment.evidences).toHaveLength(1);

    // Evaluating under Class VIII C, Semester 2, or School B isolates strictly (0 leaked records!)
    for (const foreignProfile of [profileClassC, profileSem2, profileOtherSchool]) {
      const evalForeign = evaluateStudentTPRemedialTarget({
        siswaNilai: studentRow,
        tp,
        schoolProfile: foreignProfile,
      });
      expect(evalForeign.remedialRecords).toHaveLength(0);
      expect(evalForeign.reassessment.evidences).toHaveLength(0);
    }
  });

  it('4. Integrates cleanly with Cloud Sync, 3-way merge (concurrent edits + auditTrail), Backup/Restore JSON, and React UI rendering', async () => {
    const profile = makeSyntheticProfile({ kktpMinTuntas: 75 });
    const tps = makeSyntheticTPs();
    saveSchoolProfile(profile);
    localStorage.setItem('asesmerdeka_onboarding_confirmed_v1', 'true');
    saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);

    const tp = tps[0];
    const baseEv = createBuktiAsesmenEntry({
      id: 'ev_sync_base',
      tp: { id: tp.id, kode: tp.kode },
      subTp: tp.subTP![0],
      jenisBukti: 'tes',
      sumberBukti: 'asesmen',
      skor: 54,
      skalaSkor: 100,
      kktpMinTuntas: 75,
      indikatorYangDiamati: 'Skor awal sebelum sync',
    });

    let kelas: KelasHarianData = {
      rombel: profile.rombelAktif,
      mataPelajaran: profile.mataPelajaranUtama,
      semester: '1 (Ganjil)',
      tahunAjaran: profile.tahunAjaran,
      isSimulated: false,
      dataSource: 'user_manual',
      bobotNilai: { bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, kktpMinTuntas: 75 },
      daftarSiswa: [
        makeStudent('s_sync', 1, 'Siswa Sync Remedial'),
        makeStudent('s_blank_sync', 2, 'Siswa Kosong Sync'),
      ],
      daftarPresensi: [],
      daftarJurnal: [],
      daftarNilai: [
        makeNilaiRow('s_sync', 'Siswa Sync Remedial', '92001', {
          nilaiFormatif: { [tp.id]: 54 },
          buktiAsesmenSubTP: [baseEv],
        }),
        makeNilaiRow('s_blank_sync', 'Siswa Kosong Sync', '92002'),
      ],
    };

    const plan1 = upsertStudentRemedialPlan({
      kelasHarian: kelas,
      schoolProfile: profile,
      tp,
      siswaId: 's_sync',
      remedialId: 'remed_sync_01',
      jenisIntervensi: 'kelompok_kecil',
      statusTindakLanjut: 'berlangsung',
      rencanaKegiatan: 'Pendampingan awal',
    });
    const reassess1 = recordNonDestructiveReassessment({
      kelasHarian: plan1.kelasHarian,
      schoolProfile: profile,
      tp,
      siswaId: 's_sync',
      remedialId: 'remed_sync_01',
      jenisBukti: 'praktik',
      skor: 84,
      skalaSkor: 100,
      indikatorYangDiamati: 'Praktik ulang eksponen',
      catatanGuru: 'Sudah memahami aturan pangkat',
    });
    kelas = reassess1.kelasHarian;
    saveKelasHarianData(profile, kelas);

    // 1. Backup & Restore preserves all remedial, auditTrail, original evidence, and reassessment!
    const backupJson = exportBackupDataJson();
    localStorage.clear();
    const restoreRes = importBackupDataJson(backupJson);
    expect(restoreRes.success).toBe(true);
    const restoredLocal = getKelasHarianData(profile, tps);
    expect(restoredLocal.daftarNilai[0].nilaiFormatif[tp.id]).toBe(54);
    expect(restoredLocal.daftarNilai[0].buktiAsesmenSubTP).toHaveLength(2);
    expect(restoredLocal.daftarNilai[0].riwayatRemedial![0].auditTrail?.length).toBeGreaterThanOrEqual(2);

    // 2. Cloud Sync push (Device A) -> pull (Device B) round-trip
    localStorage.setItem('asesmerdeka_device_id', 'DEV-111-A');
    const lic = generateStagingLicenseCode('GM26', 'REM111');
    await invokeActivateApi({ licenseCode: lic, deviceId: 'DEV-111-A' });
    await licenseManager.verifyMayarLicenseOnline(lic);
    expect(licenseManager.activateLicense(lic).success).toBe(true);

    const pushRes = await pushWorkspaceToCloud(lic);
    expect(pushRes.ok).toBe(true);

    localStorage.clear();
    localStorage.setItem('asesmerdeka_device_id', 'DEV-111-B');
    await invokeActivateApi({ licenseCode: lic, deviceId: 'DEV-111-B' });
    await licenseManager.verifyMayarLicenseOnline(lic);
    expect(licenseManager.activateLicense(lic).success).toBe(true);

    const pullRes = await pullWorkspaceFromCloud(lic);
    expect(pullRes.ok).toBe(true);
    const syncedKelas = getKelasHarianData(profile, tps);
    expect(syncedKelas.daftarNilai[0].riwayatRemedial).toHaveLength(1);
    expect(syncedKelas.daftarNilai[0].buktiAsesmenSubTP).toHaveLength(2);
    expect(syncedKelas.daftarNilai[0].nilaiFormatif[tp.id]).toBe(54);

    // 3. Three-way merge on concurrent updates to SAME remedial record + locked final report preservation
    const baseLocked: KelasHarianData = {
      ...plan1.kelasHarian,
      daftarNilai: [
        {
          ...plan1.kelasHarian.daftarNilai[0],
          nilaiSTS: 80,
          nilaiSAS: 80,
          nilaiAkhir: 67,
          predikatKKTP: 'Cukup',
          statusNilai: 'lengkap',
          statusRapor: 'final',
          finalizedAt: '2026-11-20T08:00:00.000Z',
          deskripsiRapor: 'LOCKED_DESC',
        },
      ],
    };
    // Device A updates catatanGuru + auditTrail on remedial 'remed_sync_01'
    const deviceA = upsertStudentRemedialPlan({
      kelasHarian: baseLocked,
      schoolProfile: profile,
      tp,
      siswaId: 's_sync',
      remedialId: 'remed_sync_01',
      jenisIntervensi: 'kelompok_kecil',
      statusTindakLanjut: 'berlangsung',
      rencanaKegiatan: 'Pendampingan awal',
      catatanGuru: 'Catatan tambahan Device A',
      auditEventIdSeed: 'aud_dev_a_1',
    }).kelasHarian;
    // Device B updates hasilKegiatan on the SAME remedial 'remed_sync_01' + adds a reassessment
    const deviceBPlan = upsertStudentRemedialPlan({
      kelasHarian: baseLocked,
      schoolProfile: profile,
      tp,
      siswaId: 's_sync',
      remedialId: 'remed_sync_01',
      jenisIntervensi: 'kelompok_kecil',
      statusTindakLanjut: 'berlangsung',
      rencanaKegiatan: 'Pendampingan awal',
      hasilKegiatan: 'Latihan selesai Device B',
      auditEventIdSeed: 'aud_dev_b_1',
    }).kelasHarian;

    const mergeRes = analyzeWorkspaceConflict(
      { asesmerdeka_harian_v2_test: baseLocked },
      { asesmerdeka_harian_v2_test: deviceA },
      { asesmerdeka_harian_v2_test: deviceBPlan }
    );
    expect(mergeRes.conflicts).toHaveLength(0);
    const mergedData = mergeRes.mergedEntries['asesmerdeka_harian_v2_test'] as KelasHarianData;
    const mergedRow = mergedData.daftarNilai[0];
    expect(mergedRow.riwayatRemedial![0].catatanGuru).toBe('Catatan tambahan Device A');
    expect(mergedRow.riwayatRemedial![0].hasilKegiatan).toBe('Latihan selesai Device B');
    expect(mergedRow.riwayatRemedial![0].auditTrail?.length).toBeGreaterThanOrEqual(3);
    expect(mergedRow.statusRapor).toBe('final');
    expect(mergedRow.deskripsiRapor).toBe('LOCKED_DESC');

    // 4. UI SSR Rendering checks (BukuNilaiTab, RemedialTrackingPanel, StudentEvidenceModal)
    const stripSsrComments = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '');

    const panelHtml = stripSsrComments(
      renderToStaticMarkup(
        React.createElement(RemedialTrackingPanel, {
          schoolProfile: profile,
          kelasHarian: kelas,
          tpList: tps,
          onSaveRemedialPlan: vi.fn(),
          onSaveReassessment: vi.fn(),
        })
      )
    );
    expect(panelHtml).toContain('Siswa Sync Remedial');
    expect(panelHtml).toContain('1. Penilaian Awal (Utuh)');
    expect(panelHtml).toContain('3. Hasil Reassessment (Terpisah)');
    expect(panelHtml).toContain('Skor Awal: 54');
    expect(panelHtml).toContain('Skor Baru: 84/100');
    expect(panelHtml).toContain('Belum Ada Bukti Penilaian (2 siswa)');

    const panelFilteredHtml = stripSsrComments(
      renderToStaticMarkup(
        React.createElement(RemedialTrackingPanel, {
          schoolProfile: profile,
          kelasHarian: kelas,
          tpList: tps,
          selectedTpId: tp.id,
          onSaveRemedialPlan: vi.fn(),
          onSaveReassessment: vi.fn(),
        })
      )
    );
    expect(panelFilteredHtml).toContain('Belum Ada Bukti Penilaian (1 siswa)');

    const bukuHtml = stripSsrComments(
      renderToStaticMarkup(
        React.createElement(BukuNilaiTab, {
          schoolProfile: profile,
          kelasHarian: kelas,
          tpList: tps,
          onUpdateKelasHarian: vi.fn(),
          onToast: vi.fn(),
        })
      )
    );
    expect(bukuHtml).toContain('Tindak Lanjut Remedial (1)');

    const modalHtml = stripSsrComments(
      renderToStaticMarkup(
        React.createElement(StudentEvidenceModal, {
          isOpen: true,
          siswaNilai: kelas.daftarNilai[0],
          tpList: tps,
          bobotPolicy: kelas.bobotNilai,
          schoolProfile: profile,
          onAddEvidence: vi.fn(),
          onRemoveEvidence: vi.fn(),
          onClose: vi.fn(),
        })
      )
    );
    expect(modalHtml).toContain('Bukti Awal');
    expect(modalHtml).toContain('Reassessment');
    expect(modalHtml).toContain('Terhubung ke bukti awal (ev_sync_base)');
  });
});
