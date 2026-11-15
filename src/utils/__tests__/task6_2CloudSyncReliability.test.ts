import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  exportBackupDataJson,
  saveCustomTPList,
  saveSchoolProfile,
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
import * as licenseManager from '../licenseManager';
import {
  getCloudSyncUiStatus,
  getPendingCloudConflict,
  getPreConflictBackup,
  getWorkspaceBaseRevision,
  pullWorkspaceFromCloud,
  pushWorkspaceToCloud,
  resolveCloudConflict,
  restorePreConflictBackup,
} from '../cloudSyncManager';
import { TopHeader } from '../../components/layout/TopHeader';
import { LicenseModal } from '../../components/LicenseModal';
// @ts-expect-error serverless JS handler tested directly with mock req/res
import cloudSyncHandler, { clearLocalDevCloudSyncStore, localDevMemoryStore } from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS handler tested directly with mock req/res
import activateLicenseHandler, {
  localRevokedLicensesSet,
  localSeatMemoryStore,
} from '../../../api/activate-license.js';

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_task6_2_uji',
    instansiDinas: 'Dinas Pendidikan Kabupaten Bantul',
    namaSekolah: 'SMP Negeri 2 Bantul',
    alamatSekolah: 'Jl. Parangtritis Km 11',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII B',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    namaKepalaSekolah: 'Drs. Hartono, M.Pd.',
    nipKepalaSekolah: '196804121995021001',
    namaGuru: 'Bu Ratna, S.Pd.',
    nipGuru: '198905142019032005',
    kotaTanggal: 'Bantul',
    ...overrides,
  };
}

function makeSampleTPs(): CustomTPItem[] {
  return [
    {
      id: 'tpid_mtk_1',
      kode: '8.1',
      materiPokok: 'Teorema Pythagoras',
      tujuanPembelajaran: 'Peserta didik dapat membuktikan dan menerapkan Teorema Pythagoras',
      subTP: [],
      alokasiJP: 10,
      mingguEfektif: 2,
      sumber: 'manual',
    },
    {
      id: 'tpid_mtk_2',
      kode: '8.2',
      materiPokok: 'Persamaan Garis Lurus',
      tujuanPembelajaran: 'Peserta didik dapat menentukan gradien dan persamaan garis lurus',
      subTP: [],
      alokasiJP: 10,
      mingguEfektif: 2,
      sumber: 'manual',
    },
  ];
}

function snapshotLocalStorage(): Map<string, string> {
  const snap = new Map<string, string>();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k !== null) {
      const v = localStorage.getItem(k);
      if (v !== null) snap.set(k, v);
    }
  }
  return snap;
}

function restoreLocalStorage(snap: Map<string, string>) {
  localStorage.clear();
  snap.forEach((v, k) => localStorage.setItem(k, v));
}

async function invokeCloudSyncApi(body: Record<string, unknown>) {
  let statusCode = 200;
  let jsonBody: Record<string, unknown> = {};
  const mockReq = { method: 'POST', body: JSON.stringify(body) };
  const mockRes = {
    setHeader() {},
    status(code: number) {
      statusCode = code;
      return mockRes;
    },
    json(payload: Record<string, unknown>) {
      jsonBody = payload;
      return mockRes;
    },
  };
  await cloudSyncHandler(mockReq, mockRes);
  return { statusCode, body: jsonBody };
}

function installLocalCloudSyncFetchMock() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    if (!urlStr.includes('/api/cloud-sync')) {
      throw new Error(`Unexpected fetch URL in local cloud-sync test: ${urlStr}`);
    }
    const parsedBody = init?.body ? JSON.parse(String(init.body)) : {};
    const res = await invokeCloudSyncApi(parsedBody);
    return new Response(JSON.stringify(res.body), {
      status: res.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

describe('Task 6.2 — Cloud Sync Reliability, OCC & Conflict Resolution', () => {
  const prevUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const prevKvUrl = process.env.KV_REST_API_URL;
  const prevKvToken = process.env.KV_REST_API_TOKEN;

  beforeEach(() => {
    localStorage.clear();
    clearLocalDevCloudSyncStore();
    localSeatMemoryStore.clear();
    localRevokedLicensesSet.clear();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearLocalDevCloudSyncStore();
    localSeatMemoryStore.clear();
    localRevokedLicensesSet.clear();
    if (prevUpstashUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = prevUpstashUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (prevUpstashToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = prevUpstashToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
    if (prevKvUrl !== undefined) process.env.KV_REST_API_URL = prevKvUrl;
    else delete process.env.KV_REST_API_URL;
    if (prevKvToken !== undefined) process.env.KV_REST_API_TOKEN = prevKvToken;
    else delete process.env.KV_REST_API_TOKEN;
  });

  it('Skenario 1: Alur 9-langkah OCC dua perangkat menolak push usang dengan 409 Conflict tanpa menimpa data Perangkat A', async () => {
    const restoreFetch = installLocalCloudSyncFetchMock();
    try {
      const license = licenseManager.computeSerialLicenseCode('OCCFLOW01');
      const profile = makeProfile();
      const tps = makeSampleTPs();
      const s1: SiswaItem = { id: 's1', noUrut: 1, nis: '101', nama: 'Andi', jenisKelamin: 'L' };

      // 1-2. Device A buat siswa & nilai awal, push Rev #1
      licenseManager.activateLicense(license);
      localStorage.setItem('asesmerdeka_device_id', 'DEV-LAPTOP-A');
      saveSchoolProfile(profile);
      saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);
      const dataA1 = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1], tps, true, {
        source: 'user_manual',
        initializeEmptyScores: true,
      });
      dataA1.daftarNilai[0].nilaiSTS = 78;
      saveKelasHarianData(profile, dataA1);

      const pushA1 = await pushWorkspaceToCloud(license);
      expect(pushA1.ok).toBe(true);
      expect(pushA1.revision).toBe(1);
      const snapDeviceARev1 = snapshotLocalStorage();

      // 3-4. Device B pull Rev #1
      localStorage.clear();
      licenseManager.activateLicense(license);
      localStorage.setItem('asesmerdeka_device_id', 'DEV-HP-B');
      const pullB1 = await pullWorkspaceFromCloud(license);
      expect(pullB1.ok).toBe(true);
      expect(pullB1.revision).toBe(1);
      expect(getWorkspaceBaseRevision(license)).toBe(1);
      const snapDeviceBRev1 = snapshotLocalStorage();

      // 5. Device A kembali push nilai terbaru 88 -> Rev #2
      restoreLocalStorage(snapDeviceARev1);
      const dataA2 = getKelasHarianData(profile, tps);
      dataA2.daftarNilai[0].nilaiSTS = 88;
      saveKelasHarianData(profile, dataA2);
      const pushA2 = await pushWorkspaceToCloud(license);
      expect(pushA2.ok).toBe(true);
      expect(pushA2.revision).toBe(2);

      // 6-8. Device B (masih di baseRevision 1) mengubah nilaiSTS jadi 94 dan coba push -> DITOLAK 409!
      restoreLocalStorage(snapDeviceBRev1);
      const dataB = getKelasHarianData(profile, tps);
      dataB.daftarNilai[0].nilaiSTS = 94;
      saveKelasHarianData(profile, dataB);

      const pushBStale = await pushWorkspaceToCloud(license);
      expect(pushBStale.ok).toBe(false);
      expect(pushBStale.conflict).toBe(true);
      expect(pushBStale.statusCode).toBe(409);
      expect(pushBStale.serverRevision).toBe(2);

      // 9. Pastikan data Cloud milik Device A (nilaiSTS = 88) TIDAK tertimpa oleh push B!
      localStorage.clear();
      const verifyPull = await pullWorkspaceFromCloud(license);
      expect(verifyPull.ok).toBe(true);
      expect(verifyPull.revision).toBe(2);
      expect(getKelasHarianData(profile, tps).daftarNilai[0].nilaiSTS).toBe(88);
    } finally {
      restoreFetch();
    }
  });

  it('Skenario 2: Multi-device non-overlapping merge_safe menggabung Siswa, Presensi, Jurnal, dan Nilai TP dengan re-kalkulasi e-Rapor', async () => {
    const restoreFetch = installLocalCloudSyncFetchMock();
    try {
      const license = licenseManager.computeSerialLicenseCode('MERGEALL02');
      const profile = makeProfile();
      const tps = makeSampleTPs();
      const sAndi: SiswaItem = { id: 's_andi', noUrut: 1, nis: '201', nama: 'Andi', jenisKelamin: 'L' };

      // Baseline Rev #1: Andi + Pertemuan 1 (H)
      licenseManager.activateLicense(license);
      localStorage.setItem('asesmerdeka_device_id', 'DEV-A');
      saveSchoolProfile(profile);
      saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);
      const baseData = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [sAndi], tps, true, {
        source: 'user_manual',
        initializeEmptyScores: true,
      });
      baseData.daftarPresensi = [
        {
          id: 'p1',
          pertemuanKe: 1,
          tanggal: '2026-08-03',
          statusMap: { s_andi: 'H' },
          statusKeterlaksanaan: 'terlaksana',
        },
      ];
      saveKelasHarianData(profile, baseData);
      expect((await pushWorkspaceToCloud(license)).revision).toBe(1);

      const snapA = snapshotLocalStorage();

      // Device B pull baseline Rev #1
      localStorage.clear();
      licenseManager.activateLicense(license);
      localStorage.setItem('asesmerdeka_device_id', 'DEV-B');
      await pullWorkspaceFromCloud(license);
      const snapB = snapshotLocalStorage();

      // Device A menambah Siswa Budi, Presensi P2, Jurnal P2, & Nilai Formatif TP1 = 86 (Rev #2)
      restoreLocalStorage(snapA);
      const sBudi: SiswaItem = { id: 's_budi', noUrut: 2, nis: '202', nama: 'Budi', jenisKelamin: 'L' };
      const dA = getKelasHarianData(profile, tps);
      dA.daftarSiswa.push(sBudi);
      dA.daftarPresensi.push({
        id: 'p2',
        pertemuanKe: 2,
        tanggal: '2026-08-10',
        statusMap: { s_andi: 'H', s_budi: 'H' },
        statusKeterlaksanaan: 'terlaksana',
      });
      dA.daftarJurnal.push({
        id: 'j2',
        pertemuanKe: 2,
        tanggal: '2026-08-10',
        jamKe: '1-2',
        kodeTP: '8.1',
        materiPokok: 'Pythagoras',
        kegiatanPembelajaran: 'Eksplorasi segitiga siku-siku',
        siswaTidakHadir: 'Nihil',
        catatanRefleksi: 'Aktif berdiskusi',
        statusKeterlaksanaan: 'terlaksana',
      });
      dA.daftarNilai[0].nilaiFormatif.tpid_mtk_1 = 86;
      saveKelasHarianData(profile, dA);
      expect((await pushWorkspaceToCloud(license)).revision).toBe(2);

      // Device B secara offline menambah Siswa Citra, Presensi P3, Jurnal P3, & Nilai Formatif TP2 = 94 untuk Andi
      restoreLocalStorage(snapB);
      const sCitra: SiswaItem = { id: 's_citra', noUrut: 2, nis: '203', nama: 'Citra', jenisKelamin: 'P' };
      const dB = getKelasHarianData(profile, tps);
      dB.daftarSiswa.push(sCitra);
      dB.daftarPresensi.push({
        id: 'p3',
        pertemuanKe: 3,
        tanggal: '2026-08-17',
        statusMap: { s_andi: 'H', s_citra: 'S' },
        statusKeterlaksanaan: 'terlaksana',
      });
      dB.daftarJurnal.push({
        id: 'j3',
        pertemuanKe: 3,
        tanggal: '2026-08-17',
        jamKe: '3-4',
        kodeTP: '8.2',
        materiPokok: 'Persamaan Garis Lurus',
        kegiatanPembelajaran: 'Menggambar grafik gradien',
        siswaTidakHadir: 'Citra (S)',
        catatanRefleksi: 'Perlu pendampingan grafik',
        statusKeterlaksanaan: 'terlaksana',
      });
      dB.daftarNilai[0].nilaiFormatif.tpid_mtk_2 = 94;
      dB.daftarNilai[0].deskripsiRapor = generateAutoDeskripsiRapor(dB.daftarNilai[0].nilaiFormatif, tps, 'Andi');
      saveKelasHarianData(profile, dB);

      // Device B push -> 409 Conflict tapi 0 bentrokan field (semua non-overlapping!)
      const pushB = await pushWorkspaceToCloud(license);
      expect(pushB.conflict).toBe(true);
      expect(pushB.conflicts).toHaveLength(0);
      expect((pushB.autoMergedSummary || []).length).toBeGreaterThan(0);

      // Jalankan Safe Merge -> Rev #3
      const mergedRes = await resolveCloudConflict('merge_safe');
      expect(mergedRes.ok).toBe(true);
      expect(mergedRes.revision).toBe(3);

      const merged = getKelasHarianData(profile, tps);
      expect(merged.daftarSiswa.map((s) => s.nama)).toEqual(['Andi', 'Citra', 'Budi']);
      expect(merged.daftarPresensi.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
      expect(merged.daftarJurnal.map((j) => j.id)).toEqual(['j2', 'j3']);
      const andiNilai = merged.daftarNilai.find((n) => n.siswaId === 's_andi')!;
      expect(andiNilai.nilaiFormatif.tpid_mtk_1).toBe(86);
      expect(andiNilai.nilaiFormatif.tpid_mtk_2).toBe(94);
      expect(andiNilai.nilaiAkhir).toBe(90);
      expect(andiNilai.deskripsiRapor).toContain('Persamaan Garis Lurus');
    } finally {
      restoreFetch();
    }
  });

  it('Skenario 3: Bentrokan Nilai Siswa pada field sama ditandai eksplisit dan diselesaikan dengan pilihan pemenang maupun use_server', async () => {
    const restoreFetch = installLocalCloudSyncFetchMock();
    try {
      const license = licenseManager.computeSerialLicenseCode('NILAI03');
      const profile = makeProfile();
      const tps = makeSampleTPs();
      const s1: SiswaItem = { id: 's1', noUrut: 1, nis: '301', nama: 'Bima', jenisKelamin: 'L' };

      licenseManager.activateLicense(license);
      saveSchoolProfile(profile);
      const init = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1], tps, true, {
        source: 'user_manual',
        initializeEmptyScores: true,
      });
      init.daftarNilai[0].nilaiSTS = 70;
      saveKelasHarianData(profile, init);
      await pushWorkspaceToCloud(license); // Rev 1
      const snapA = snapshotLocalStorage();

      localStorage.clear();
      licenseManager.activateLicense(license);
      await pullWorkspaceFromCloud(license); // Rev 1
      const snapB = snapshotLocalStorage();

      // A mengubah STS -> 88 (Rev 2)
      restoreLocalStorage(snapA);
      const dA = getKelasHarianData(profile, tps);
      dA.daftarNilai[0].nilaiSTS = 88;
      saveKelasHarianData(profile, dA);
      await pushWorkspaceToCloud(license);

      // B mengubah STS -> 95 lalu coba merge tanpa memilih (gagal eksplisit bila ada pilihan belum terisi), lalu pilih server (88)
      restoreLocalStorage(snapB);
      const dB = getKelasHarianData(profile, tps);
      dB.daftarNilai[0].nilaiSTS = 95;
      saveKelasHarianData(profile, dB);

      const conflictRes = await pushWorkspaceToCloud(license);
      expect(conflictRes.conflict).toBe(true);
      const stsConflict = conflictRes.conflicts?.find((c) => c.category === 'nilai' && c.fieldLabel === 'Nilai STS');
      expect(stsConflict).toBeDefined();
      expect(stsConflict?.localValue).toBe(95);
      expect(stsConflict?.serverValue).toBe(88);

      const unresolvedReject = await resolveCloudConflict('merge_safe');
      expect(unresolvedReject.ok).toBe(false);

      const mergeChooseServer = await resolveCloudConflict('merge_safe', {
        choices: { [stsConflict!.id]: 'server' },
        allowDefaultForUnchosen: true,
      });
      expect(mergeChooseServer.ok).toBe(true);
      expect(mergeChooseServer.revision).toBe(3);
      expect(getKelasHarianData(profile, tps).daftarNilai[0].nilaiSTS).toBe(88);
    } finally {
      restoreFetch();
    }
  });

  it('Skenario 4: Bentrokan status Presensi siswa pada pertemuan & tanggal sama terdeteksi dan diselesaikan', async () => {
    const restoreFetch = installLocalCloudSyncFetchMock();
    try {
      const license = licenseManager.computeSerialLicenseCode('ABSEN04');
      const profile = makeProfile();
      const tps = makeSampleTPs();
      const s1: SiswaItem = { id: 's1', noUrut: 1, nis: '401', nama: 'Dina', jenisKelamin: 'P' };

      licenseManager.activateLicense(license);
      saveSchoolProfile(profile);
      const d1 = applyNewStudentRoster(createEmptyKelasHarianData(profile, tps), [s1], tps, true, {
        source: 'user_manual',
        initializeEmptyScores: true,
      });
      d1.daftarPresensi = [
        {
          id: 'p_sync_1',
          pertemuanKe: 1,
          tanggal: '2026-08-05',
          statusMap: { s1: 'H' },
          statusKeterlaksanaan: 'terlaksana',
        },
      ];
      saveKelasHarianData(profile, d1);
      await pushWorkspaceToCloud(license);
      const snapA = snapshotLocalStorage();

      localStorage.clear();
      licenseManager.activateLicense(license);
      await pullWorkspaceFromCloud(license);
      const snapB = snapshotLocalStorage();

      // A mengubah status Dina menjadi 'S'
      restoreLocalStorage(snapA);
      const dA = getKelasHarianData(profile, tps);
      dA.daftarPresensi[0].statusMap.s1 = 'S';
      saveKelasHarianData(profile, dA);
      await pushWorkspaceToCloud(license);

      // B mengubah status Dina menjadi 'A'
      restoreLocalStorage(snapB);
      const dB = getKelasHarianData(profile, tps);
      dB.daftarPresensi[0].statusMap.s1 = 'A';
      saveKelasHarianData(profile, dB);

      const pushB = await pushWorkspaceToCloud(license);
      expect(pushB.conflict).toBe(true);
      const presensiConflict = pushB.conflicts?.find((c) => c.category === 'presensi');
      expect(presensiConflict).toBeDefined();
      expect(presensiConflict?.localValue).toBe('A');
      expect(presensiConflict?.serverValue).toBe('S');

      const resolved = await resolveCloudConflict('merge_safe', {
        choices: { [presensiConflict!.id]: 'server' },
        allowDefaultForUnchosen: true,
      });
      expect(resolved.ok).toBe(true);
      expect(getKelasHarianData(profile, tps).daftarPresensi[0].statusMap.s1).toBe('S');
    } finally {
      restoreFetch();
    }
  });

  it('Skenario 5: Push berulang yang idempoten dengan requestId sama mengembalikan 200 tanpa 409 palsu atau kenaikan revisi ganda', async () => {
    const license = licenseManager.computeSerialLicenseCode('IDEMP05');
    const first = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-RETRY',
      baseRevision: 0,
      requestId: 'req-unique-001',
      entries: { keyA: { val: 123 } },
    });
    expect(first.statusCode).toBe(200);
    expect(first.body.revision).toBe(1);

    // Retry dengan baseRevision: 0 dan requestId sama persis
    const retry = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-RETRY',
      baseRevision: 0,
      requestId: 'req-unique-001',
      entries: { keyA: { val: 123 } },
    });
    expect(retry.statusCode).toBe(200);
    expect(retry.body.idempotent).toBe(true);
    expect(retry.body.revision).toBe(1);
  });

  it('Skenario 6: Simulasi race condition Promise.all dua push paralel menghasilkan tepat satu 200 dan satu 409 Conflict', async () => {
    const license = licenseManager.computeSerialLicenseCode('RACE06');
    const seed = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-INIT',
      baseRevision: 0,
      requestId: 'req-seed',
      entries: { ver: 'base' },
    });
    expect(seed.statusCode).toBe(200);
    expect(seed.body.revision).toBe(1);

    const [resA, resB] = await Promise.all([
      invokeCloudSyncApi({
        action: 'push',
        licenseCode: license,
        deviceId: 'DEV-A',
        baseRevision: 1,
        requestId: 'req-parallel-a',
        entries: { ver: 'from-A' },
      }),
      invokeCloudSyncApi({
        action: 'push',
        licenseCode: license,
        deviceId: 'DEV-B',
        baseRevision: 1,
        requestId: 'req-parallel-b',
        entries: { ver: 'from-B' },
      }),
    ]);

    const statuses = [resA.statusCode, resB.statusCode].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = resA.statusCode === 200 ? resA : resB;
    const loser = resA.statusCode === 409 ? resA : resB;
    expect(winner.body.revision).toBe(2);
    expect(loser.body.conflict).toBe(true);
    expect(loser.body.serverRevision).toBe(2);
  });

  it('Skenario 7: Mock Upstash Redis REST (atomic Lua EVAL CAS) dan gagal Redis (401/offline -> 503) tanpa membocorkan kredensial/URL', async () => {
    const secretUrl = 'https://secret-redis-host.upstash.example';
    const secretToken = 'SUPER_SECRET_UPSTASH_TOKEN_XYZ_999';
    process.env.UPSTASH_REDIS_REST_URL = secretUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = secretToken;

    const license = licenseManager.computeSerialLicenseCode('REDIS07');
    const mockRedisKv = new Map<string, string>();
    let sawLuaEval = false;

    const originalFetch = globalThis.fetch;
    try {
      // 7A. Mock Upstash REST normal (GET + Lua EVAL)
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        if (urlStr.includes('/get/')) {
          const encodedKey = urlStr.split('/get/')[1] || '';
          const key = decodeURIComponent(encodedKey);
          const raw = mockRedisKv.get(key) ?? null;
          return new Response(JSON.stringify({ result: raw }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (init?.method === 'POST' && init.body) {
          const cmd = JSON.parse(String(init.body));
          if (Array.isArray(cmd) && cmd[0] === 'EVAL') {
            sawLuaEval = true;
            const key = cmd[3] as string;
            const expectedRev = Number(cmd[4]);
            const nextJson = cmd[5] as string;
            const currentRaw = mockRedisKv.get(key);
            if (!currentRaw) {
              if (expectedRev > 0) {
                return new Response(JSON.stringify({ result: ['CONFLICT', '0', ''] }), { status: 200 });
              }
              mockRedisKv.set(key, nextJson);
              return new Response(JSON.stringify({ result: ['OK', nextJson] }), { status: 200 });
            }
            const parsed = JSON.parse(currentRaw);
            const curRev = Number(parsed.revision) || 1;
            if (expectedRev < 0 || curRev !== expectedRev) {
              return new Response(JSON.stringify({ result: ['CONFLICT', String(curRev), currentRaw] }), {
                status: 200,
              });
            }
            mockRedisKv.set(key, nextJson);
            return new Response(JSON.stringify({ result: ['OK', nextJson] }), { status: 200 });
          }
        }
        return new Response(JSON.stringify({ error: 'Unexpected Redis route' }), { status: 400 });
      }) as typeof fetch;

      const redisPush1 = await invokeCloudSyncApi({
        action: 'push',
        licenseCode: license,
        deviceId: 'DEV-PROD',
        baseRevision: 0,
        entries: { studentCount: 30 },
      });
      expect(sawLuaEval).toBe(true);
      expect(redisPush1.statusCode).toBe(200);
      expect(redisPush1.body.cloudConfigured).toBe(true);
      expect(redisPush1.body.revision).toBe(1);

      const staleRedisPush = await invokeCloudSyncApi({
        action: 'push',
        licenseCode: license,
        deviceId: 'DEV-STALE',
        baseRevision: 0,
        entries: { studentCount: 1 },
      });
      expect(staleRedisPush.statusCode).toBe(409);
      expect(staleRedisPush.body.serverRevision).toBe(1);

      // 7B. Upstash 401 Invalid Token berisi URL & token pada error body -> HARUS return 503 bersih
      globalThis.fetch = vi.fn(async () => {
        return new Response(`ERR invalid token ${secretToken} at ${secretUrl}`, { status: 401 });
      }) as typeof fetch;

      const authErrRes = await invokeCloudSyncApi({
        action: 'pull',
        licenseCode: license,
        deviceId: 'DEV-PROD',
      });
      expect(authErrRes.statusCode).toBe(503);
      expect(authErrRes.body.redisUnavailable).toBe(true);
      const serializedAuthErr = JSON.stringify(authErrRes.body);
      expect(serializedAuthErr).not.toContain(secretToken);
      expect(serializedAuthErr).not.toContain(secretUrl);

      // 7C. Redis network failure -> HARUS return 503 bersih tanpa membocorkan URL
      globalThis.fetch = vi.fn(async () => {
        throw new TypeError(`connect ECONNREFUSED ${secretUrl} bearer ${secretToken}`);
      }) as typeof fetch;

      const netErrRes = await invokeCloudSyncApi({
        action: 'push',
        licenseCode: license,
        deviceId: 'DEV-PROD',
        baseRevision: 1,
        entries: { namaSiswa: 'PII Siswa Rahasia' },
      });
      expect(netErrRes.statusCode).toBe(503);
      const serializedNetErr = JSON.stringify(netErrRes.body);
      expect(serializedNetErr).not.toContain(secretToken);
      expect(serializedNetErr).not.toContain(secretUrl);
      expect(serializedNetErr).not.toContain('PII Siswa Rahasia');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('Skenario 8: Validasi otorisasi lisensi, pencabutan, batas kursi perangkat (seat lock), dan hash PIN Sekolah', async () => {
    // 8A. Tolak kode lisensi palsu & kode usang
    const fakeRes = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: 'FAKE-9999-XXXX',
      deviceId: 'DEV-1',
      entries: { test: 1 },
    });
    expect(fakeRes.statusCode).toBe(403);
    expect(fakeRes.body.unauthorized).toBe(true);

    // 8B. Seat Lock via /api/activate-license (maxSeats = 2 -> Device 3 ditolak cloud-sync dengan 403)
    const indivLicense = licenseManager.computeSerialLicenseCode('SEATLOCK08');
    for (const dev of ['DEV-SATU', 'DEV-DUA']) {
      let actStatus = 200;
      await activateLicenseHandler(
        { method: 'POST', body: JSON.stringify({ licenseCode: indivLicense, deviceId: dev }) },
        {
          setHeader() {},
          status(code: number) {
            actStatus = code;
            return this;
          },
          json() {
            return this;
          },
        }
      );
      expect(actStatus).toBe(200);
    }

    const allowedDev = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: indivLicense,
      deviceId: 'DEV-SATU',
      baseRevision: 0,
      entries: { ok: true },
    });
    expect(allowedDev.statusCode).toBe(200);

    const thirdDevice = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: indivLicense,
      deviceId: 'DEV-KETIGA-PENYUSUP',
    });
    expect(thirdDevice.statusCode).toBe(403);
    expect(thirdDevice.body.unauthorized).toBe(true);

    // 8C. Lisensi Sekolah wajib PIN, menyimpan teacherPinHash (bukan plaintext teacherPin), dan terisolasi antar guru
    const schoolLicense = licenseManager.computeSerialLicenseCode('SEKOLAH08');
    const pinFajar = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: schoolLicense,
      teacherPin: 'FAJAR88',
      baseRevision: 0,
      entries: { guru: 'Pak Fajar' },
    });
    expect(pinFajar.statusCode).toBe(200);

    const pinSiti = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolLicense,
      teacherPin: 'SITI99',
    });
    expect(pinSiti.statusCode).toBe(200);
    expect(pinSiti.body.found).toBe(false);

    // Pastikan plaintext teacherPin TIDAK disimpan pada record
    const storedEntry = Array.from(localDevMemoryStore.values())[localDevMemoryStore.size - 1] as Record<string, unknown>;
    expect(storedEntry.teacherPin).toBeUndefined();
    expect(typeof storedEntry.teacherPinHash).toBe('string');
    expect(String(storedEntry.teacherPinHash)).not.toContain('FAJAR88');

    // 8D. Pencabutan lisensi menolak akses sync secara permanen (403)
    localRevokedLicensesSet.add(indivLicense);
    const revokedSync = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: indivLicense,
      deviceId: 'DEV-SATU',
    });
    expect(revokedSync.statusCode).toBe(403);
    expect(revokedSync.body.revoked).toBe(true);
  });

  it('Skenario 9: Backup otomatis pra-konflik (getPreConflictBackup) tercipta saat 409 dan dapat dipulihkan via restorePreConflictBackup', async () => {
    const restoreFetch = installLocalCloudSyncFetchMock();
    try {
      const license = licenseManager.computeSerialLicenseCode('BACKUP09');
      const profileA = makeProfile({ namaSekolah: 'Sekolah Versi Server' });
      const profileB = makeProfile({ namaSekolah: 'Sekolah Versi Lokal Sebelum Merge' });

      licenseManager.activateLicense(license);
      saveSchoolProfile(profileA);
      await pushWorkspaceToCloud(license); // Rev 1
      const snapServer = exportBackupDataJson();

      // Simulasi perangkat B masih Rev 0 dengan profil berbeda
      localStorage.clear();
      licenseManager.activateLicense(license);
      saveSchoolProfile(profileB);

      // Push tanpa menarik Rev 1 memicu 409 dan membuat PreConflictBackup otomatis
      const conflictPush = await pushWorkspaceToCloud(license);
      expect(conflictPush.conflict).toBe(true);
      const backup = getPreConflictBackup();
      expect(backup).not.toBeNull();
      expect(backup?.reason).toBe('conflict_409');

      // Pilih use_server -> profil lokal berubah menjadi Sekolah Versi Server
      const useServer = await resolveCloudConflict('use_server');
      expect(useServer.ok).toBe(true);
      expect((JSON.parse(exportBackupDataJson()).entries['asesmerdeka_school_profile_v1'] as SchoolProfile).namaSekolah).toBe(
        'Sekolah Versi Server'
      );

      // Pulihkan snapshot pra-konflik -> profil lokal kembali ke Sekolah Versi Lokal Sebelum Merge
      const restored = restorePreConflictBackup();
      expect(restored.ok).toBe(true);
      expect((JSON.parse(exportBackupDataJson()).entries['asesmerdeka_school_profile_v1'] as SchoolProfile).namaSekolah).toBe(
        'Sekolah Versi Lokal Sebelum Merge'
      );
      expect(snapServer.length).toBeGreaterThan(0);
    } finally {
      restoreFetch();
    }
  });

  it('Skenario 10: Status UI jujur di TopHeader & LicenseModal (unconfigured vs synced vs conflict)', async () => {
    const restoreFetch = installLocalCloudSyncFetchMock();
    try {
      const license = licenseManager.computeSerialLicenseCode('UISTAT10');
      const q = licenseManager.activateLicense(license).quota;
      const profile = makeProfile();
      saveSchoolProfile(profile);

      // Saat cloudConfigured === false, push TIDAK boleh menampilkan status 'synced'
      const localPush = await pushWorkspaceToCloud(license);
      expect(localPush.ok).toBe(true);
      expect(localPush.cloudConfigured).toBe(false);
      expect(getCloudSyncUiStatus()).toBe('unconfigured');

      const headerUnconfiguredHtml = renderToStaticMarkup(
        React.createElement(TopHeader, {
          pageTitle: 'Daftar TP',
          schoolProfile: profile,
          onOpenSchoolModal: () => {},
          isPro: true,
          storageStatus: getCloudSyncUiStatus(),
        })
      );
      expect(headerUnconfiguredHtml).toContain('Cloud belum dikonfigurasi');
      expect(headerUnconfiguredHtml).not.toContain('Lokal &amp; cloud');

      const modalUnconfiguredHtml = renderToStaticMarkup(
        React.createElement(LicenseModal, {
          isOpen: true,
          onClose: () => {},
          quota: q,
          onUpdateQuota: () => {},
        })
      );
      expect(modalUnconfiguredHtml).toContain('Mode Dev Lokal (Cloud Redis Belum Dikonfigurasi)');
      expect(modalUnconfiguredHtml).not.toContain('✓ Tersinkron');

      // Uji status 'synced' asli hanya ketika backend mengembalikan cloudConfigured: true
      const headerSyncedHtml = renderToStaticMarkup(
        React.createElement(TopHeader, {
          pageTitle: 'Daftar TP',
          schoolProfile: profile,
          onOpenSchoolModal: () => {},
          isPro: true,
          storageStatus: 'synced',
        })
      );
      expect(headerSyncedHtml).toContain('Lokal &amp; cloud');

      // Simulasikan 409 Conflict -> status harus menjadi 'conflict' dan merender Panel Resolusi Konflik
      const snapLocal = snapshotLocalStorage();
      await invokeCloudSyncApi({
        action: 'push',
        licenseCode: license,
        deviceId: 'DEV-OTHER',
        baseRevision: 1,
        entries: { asesmerdeka_school_profile_v1: makeProfile({ namaSekolah: 'Sekolah Dari Perangkat Lain' }) },
      });
      restoreLocalStorage(snapLocal);
      saveSchoolProfile(makeProfile({ namaSekolah: 'Sekolah Lokal Edit Baru' }));
      const conflictPush = await pushWorkspaceToCloud(license);
      expect(conflictPush.conflict).toBe(true);
      expect(getPendingCloudConflict()).not.toBeNull();
      expect(getCloudSyncUiStatus()).toBe('conflict');

      const headerConflictHtml = renderToStaticMarkup(
        React.createElement(TopHeader, {
          pageTitle: 'Daftar TP',
          schoolProfile: profile,
          onOpenSchoolModal: () => {},
          onOpenLicenseModal: () => {},
          isPro: true,
          storageStatus: getCloudSyncUiStatus(),
        })
      );
      expect(headerConflictHtml).toContain('Konflik Cloud');

      const modalConflictHtml = renderToStaticMarkup(
        React.createElement(LicenseModal, {
          isOpen: true,
          onClose: () => {},
          quota: q,
          onUpdateQuota: () => {},
        })
      );
      expect(modalConflictHtml).toContain('Panel Resolusi Konflik Sinkronisasi');
      expect(modalConflictHtml).toContain('Gabungkan Aman (Safe Merge)');
      expect(modalConflictHtml).toContain('Pulihkan Snapshot Pra-Konflik');
    } finally {
      restoreFetch();
    }
  });
});
