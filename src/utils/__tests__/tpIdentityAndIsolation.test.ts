import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import JSZip from 'jszip';
import {
  getSchoolProfile,
  saveSchoolProfile,
  getSavedCustomTPList,
  saveCustomTPList,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { getSemesterCurriculumPlan } from '../kurikulumCatalog';
import { createCustomImmutableTPId } from '../storageIdentity';
import {
  getKelasHarianData,
  saveKelasHarianData,
  applyNewStudentRoster,
  getFormatifScoreForTP,
  setFormatifScoreForTP,
  confirmLegacyKelasHarianAsActual,
  createEmptyKelasHarianData,
} from '../kelasHarianStorage';
import {
  saveModulAjarDraft,
  loadModulAjarDraft,
  loadLatestModulAjarDraft,
  saveLKPDDraft,
  loadLKPDDraft,
  createPendingLKPDSaveController,
} from '../perangkatDraftStorage';
import {
  buildSmartModulAjar,
  buildSmartLKPD,
} from '../perangkatAjarEngine';
import {
  exportBundelSupervisiMasterDocx,
  exportPaketSupervisiToZip,
} from '../docx/docxSupervisi';
import { getSupervisiDocumentsReadiness } from '../supervisiStorage';
import {
  runNonDestructiveStorageMigration,
  getPendingAmbiguousLegacyDrafts,
  getPendingLegacyRosterConflicts,
  resolveAmbiguousLegacyDraft,
  resolveLegacyRosterConflict,
  LEGACY_BACKUP_STORAGE_KEY,
  STORAGE_MIGRATION_VERSION_KEY,
} from '../storageMigration';
import { ModulAjarViewer } from '../../components/ModulAjarViewer';
import { LKPDViewer } from '../../components/LKPDViewer';
import * as licenseManager from '../licenseManager';

vi.mock('file-saver', () => ({
  default: vi.fn(),
}));

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
  (globalThis as any).localStorage = new LocalStorageMock();
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

function makeProfile(overrides?: Partial<SchoolProfile>): SchoolProfile {
  return {
    schoolId: 'sch_alpha_1',
    instansiDinas: 'Dinas Pendidikan Sleman',
    namaSekolah: 'SMP Negeri 1 Harapan',
    alamatSekolah: 'Jl. Pendidikan No. 1',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    daftarRombel: ['VIII A', 'VIII B'],
    mataPelajaranUtama: 'Matematika',
    namaGuru: 'Ratna Kusumawati, S.Pd.',
    nipGuru: '198803122015022001',
    namaKepalaSekolah: 'Drs. Hendra Wijaya, M.Pd.',
    nipKepalaSekolah: '197001101995121002',
    kotaSekolah: 'Sleman',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

function makeRealStudents(count: number, prefix: string) {
  return Array.from({ length: count }, (_, idx) => ({
    id: `${prefix}_s_${idx + 1}`,
    noUrut: idx + 1,
    nis: `26${String(idx + 1).padStart(4, '0')}`,
    nama: `${prefix} Siswa ${idx + 1}`,
    jenisKelamin: (idx % 2 === 0 ? 'P' : 'L') as 'P' | 'L',
  }));
}

describe('Task 3 — Unique TP Identity & Storage Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    licenseManager.activateLicense('ASM-GM26-1TAT-1QBM-133R');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 1: Unique TP ID Generation (tidak memakai index/kode polos; unik lintas mapel, sekolah, tahun ajaran, dan TP kustom)', () => {
    const mathPlan = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: 'sch_a',
      tahunAjaran: '2026/2027',
    });
    const ipaPlan = getSemesterCurriculumPlan('IPA (Ilmu Pengetahuan Alam)', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: 'sch_a',
      tahunAjaran: '2026/2027',
    });
    const mathSchoolB = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: 'sch_b',
      tahunAjaran: '2026/2027',
    });
    const mathYearNext = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: 'sch_a',
      tahunAjaran: '2027/2028',
    });
    const mathSem2 = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '2 (Genap)', {
      schoolId: 'sch_a',
      tahunAjaran: '2026/2027',
    });

    expect(mathPlan.tpList[0].kode).toBe('8.1');
    expect(ipaPlan.tpList[0].kode).toBe('8.1');

    // Internal ID harus unik meski display kode sama-sama '8.1'
    expect(mathPlan.tpList[0].id).not.toBe(ipaPlan.tpList[0].id);
    expect(mathPlan.tpList[0].id).not.toBe('tp-8-1');
    expect(mathPlan.tpList[0].id).not.toBe('8.1');
    expect(mathPlan.tpList[0].id).not.toBe(mathSchoolB.tpList[0].id);
    expect(mathPlan.tpList[0].id).not.toBe(mathYearNext.tpList[0].id);
    expect(mathPlan.tpList[0].id).not.toBe(mathSem2.tpList[0].id);

    // Sub-TP ID ikut unik
    expect(mathPlan.tpList[0].subTP?.[0].id).not.toBe(ipaPlan.tpList[0].subTP?.[0].id);

    // Custom TP generator juga selalu menghasilkan ID unik
    const prof = makeProfile({ schoolId: 'sch_a' });
    const customId1 = createCustomImmutableTPId(prof);
    const customId2 = createCustomImmutableTPId(prof);
    expect(customId1).not.toBe(customId2);
    expect(customId1).toMatch(/^tpid_custom_/);
  });

  it('Test 2: Edit kode tampilan & judul TP tetap mempertahankan tp.id, Modul Ajar, LKPD, dan nilai formatif', () => {
    const profile = saveSchoolProfile(makeProfile());
    const plan = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    });
    const tpOriginal = plan.tpList[0];
    const originalId = tpOriginal.id;

    // Simpan Modul Ajar, LKPD, dan Nilai Formatif pada TP tersebut
    const modulDoc = buildSmartModulAjar(tpOriginal, profile);
    modulDoc.pemahamanBermakna = 'Suntingan Khusus Guru Sebelum Rename Kode TP';
    saveModulAjarDraft(profile, tpOriginal, 'pbl', modulDoc, 'user_edited');

    const lkpdDoc = buildSmartLKPD(tpOriginal, profile, 'kasus');
    lkpdDoc.stimulusKasus.judul = 'Stimulus Kasus Khusus Guru';
    saveLKPDDraft(profile, tpOriginal, 'kasus', lkpdDoc, 'user_edited');

    const harian = getKelasHarianData(profile, plan.tpList);
    harian.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP(
      harian.daftarNilai[0].nilaiFormatif,
      tpOriginal,
      96
    );
    saveKelasHarianData(profile, harian);

    // Guru mengubah kode tampilan '8.1' -> '8.1A' dan judul materiPokok tanpa mengganti internal ID
    const editedTP: CustomTPItem = {
      ...tpOriginal,
      kode: '8.1A',
      materiPokok: 'SPLDV Kontekstual Revisi Guru',
    };
    const updatedList = [editedTP, ...plan.tpList.slice(1)];
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', updatedList, profile);

    const reloadedList = getSavedCustomTPList('Matematika', '8', '1 (Ganjil)', profile)!;
    expect(reloadedList[0].id).toBe(originalId);
    expect(reloadedList[0].kode).toBe('8.1A');

    // Draf Modul Ajar, LKPD, dan Nilai Formatif tetap ditemukan untuk TP dengan kode baru tersebut!
    const reloadedModul = loadModulAjarDraft(profile, reloadedList[0], 'pbl');
    expect(reloadedModul?.pemahamanBermakna).toBe('Suntingan Khusus Guru Sebelum Rename Kode TP');

    const reloadedLkpd = loadLKPDDraft(profile, reloadedList[0], 'kasus');
    expect(reloadedLkpd?.stimulusKasus.judul).toBe('Stimulus Kasus Khusus Guru');

    const reloadedHarian = getKelasHarianData(profile, reloadedList);
    expect(getFormatifScoreForTP(reloadedHarian.daftarNilai[0].nilaiFormatif, reloadedList[0])).toBe(96);
  });

  it('Test 3: Modul Ajar terisolasi lintas mapel, semester, dan model pembelajaran', () => {
    const mathProf = saveSchoolProfile(makeProfile({ mataPelajaranUtama: 'Matematika' }));
    const ipaProf = makeProfile({ mataPelajaranUtama: 'IPA (Ilmu Pengetahuan Alam)' });
    const mathSem2Prof = makeProfile({ mataPelajaranUtama: 'Matematika', semester: '2 (Genap)' });

    const mathTP = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: mathProf.schoolId,
      tahunAjaran: mathProf.tahunAjaran,
    }).tpList[0];
    const ipaTP = getSemesterCurriculumPlan('IPA (Ilmu Pengetahuan Alam)', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: ipaProf.schoolId,
      tahunAjaran: ipaProf.tahunAjaran,
    }).tpList[0];
    const mathSem2TP = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '2 (Genap)', {
      schoolId: mathSem2Prof.schoolId,
      tahunAjaran: mathSem2Prof.tahunAjaran,
    }).tpList[0];

    const mathPbl = buildSmartModulAjar(mathTP, mathProf);
    mathPbl.pemahamanBermakna = 'Suntingan Khusus Matematika PBL';
    saveModulAjarDraft(mathProf, mathTP, 'pbl', mathPbl, 'user_edited');

    const mathPjbl = buildSmartModulAjar(mathTP, mathProf);
    mathPjbl.pemahamanBermakna = 'Suntingan Khusus Matematika PjBL';
    saveModulAjarDraft(mathProf, mathTP, 'pjbl', mathPjbl, 'user_edited');

    // IPA dan Semester 2 tidak boleh mewarisi suntingan Matematika
    expect(loadModulAjarDraft(ipaProf, ipaTP, 'pbl')).toBeNull();
    expect(loadModulAjarDraft(mathSem2Prof, mathSem2TP, 'pbl')).toBeNull();

    // Kedua model PBL dan PjBL pada Matematika tetap tersimpan terpisah
    expect(loadModulAjarDraft(mathProf, mathTP, 'pbl')?.pemahamanBermakna).toBe('Suntingan Khusus Matematika PBL');
    expect(loadModulAjarDraft(mathProf, mathTP, 'pjbl')?.pemahamanBermakna).toBe('Suntingan Khusus Matematika PjBL');
  });

  it('Test 4: LKPD dan Nilai Formatif terisolasi lintas mata pelajaran (IPA 8.1 tidak mewarisi nilai/draf Matematika 8.1)', () => {
    const mathProf = saveSchoolProfile(makeProfile({ mataPelajaranUtama: 'Matematika' }));
    const ipaProf = makeProfile({ mataPelajaranUtama: 'IPA (Ilmu Pengetahuan Alam)' });

    const mathTPs = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: mathProf.schoolId,
      tahunAjaran: mathProf.tahunAjaran,
    }).tpList;
    const ipaTPs = getSemesterCurriculumPlan('IPA (Ilmu Pengetahuan Alam)', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: ipaProf.schoolId,
      tahunAjaran: ipaProf.tahunAjaran,
    }).tpList;

    // Matematika LKPD & Preset terpisah
    const mathKasus = buildSmartLKPD(mathTPs[0], mathProf, 'kasus');
    mathKasus.judul = 'LKPD Kasus Matematika Khusus';
    saveLKPDDraft(mathProf, mathTPs[0], 'kasus', mathKasus, 'user_edited');

    const mathEksp = buildSmartLKPD(mathTPs[0], mathProf, 'eksperimen');
    mathEksp.judul = 'LKPD Eksperimen Matematika Khusus';
    saveLKPDDraft(mathProf, mathTPs[0], 'eksperimen', mathEksp, 'user_edited');

    expect(loadLKPDDraft(ipaProf, ipaTPs[0], 'kasus')).toBeNull();
    expect(loadLKPDDraft(mathProf, mathTPs[0], 'kasus')?.judul).toBe('LKPD Kasus Matematika Khusus');
    expect(loadLKPDDraft(mathProf, mathTPs[0], 'eksperimen')?.judul).toBe('LKPD Eksperimen Matematika Khusus');

    // Matematika siswa #1 nilai 92 -> IPA siswa #1 tidak boleh mewarisi 92
    const mathHarian = applyNewStudentRoster(
      getKelasHarianData(mathProf, mathTPs),
      makeRealStudents(2, 'VIII_A'),
      mathTPs,
      false,
      { source: 'user_imported' }
    );
    mathHarian.daftarNilai[0].nilaiFormatif = setFormatifScoreForTP(
      mathHarian.daftarNilai[0].nilaiFormatif,
      mathTPs[0],
      92
    );
    saveKelasHarianData(mathProf, mathHarian);

    const ipaHarian = getKelasHarianData(ipaProf, ipaTPs);
    expect(ipaHarian.daftarSiswa.map((s) => s.nama)).toEqual(['VIII_A Siswa 1', 'VIII_A Siswa 2']);
    expect(getFormatifScoreForTP(ipaHarian.daftarNilai[0].nilaiFormatif, ipaTPs[0])).toBeUndefined();
  });

  it('Test 5 & 6: Roster siswa konsisten lintas mapel & semester pada rombel sama, namun terisolasi antar rombel', () => {
    const math8A = saveSchoolProfile(makeProfile({ mataPelajaranUtama: 'Matematika', rombelAktif: 'VIII A' }));
    const ipa8A = makeProfile({ mataPelajaranUtama: 'IPA (Ilmu Pengetahuan Alam)', rombelAktif: 'VIII A' });
    const math8ASem2 = makeProfile({ mataPelajaranUtama: 'Matematika', rombelAktif: 'VIII A', semester: '2 (Genap)' });
    const math8B = makeProfile({ mataPelajaranUtama: 'Matematika', rombelAktif: 'VIII B' });

    const tpsMath = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: math8A.schoolId,
      tahunAjaran: math8A.tahunAjaran,
    }).tpList;
    const tpsIPA = getSemesterCurriculumPlan('IPA (Ilmu Pengetahuan Alam)', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: ipa8A.schoolId,
      tahunAjaran: ipa8A.tahunAjaran,
    }).tpList;
    const tpsSem2 = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '2 (Genap)', {
      schoolId: math8ASem2.schoolId,
      tahunAjaran: math8ASem2.tahunAjaran,
    }).tpList;

    const students8A = makeRealStudents(28, 'Rombel8A');
    const sim8A = getKelasHarianData(math8A, tpsMath);
    const imported8A = applyNewStudentRoster(sim8A, students8A, tpsMath, false, { source: 'user_imported' });
    saveKelasHarianData(math8A, imported8A);

    // Pindah ke IPA (VIII A) dan Matematika Sem 2 (VIII A): harus melihat 28 siswa yang sama & status aktual!
    const loadedIPA8A = getKelasHarianData(ipa8A, tpsIPA);
    expect(loadedIPA8A.daftarSiswa.length).toBe(28);
    expect(loadedIPA8A.daftarSiswa[0].nama).toBe('Rombel8A Siswa 1');
    expect(loadedIPA8A.isSimulated).toBe(false);
    expect(loadedIPA8A.dataSource).toBe('user_imported');

    const loadedSem2 = getKelasHarianData(math8ASem2, tpsSem2);
    expect(loadedSem2.daftarSiswa.length).toBe(28);
    expect(loadedSem2.dataSource).toBe('user_imported');

    // VIII B harus terisolasi (tidak mewarisi 28 siswa VIII A)
    const loaded8B = getKelasHarianData(math8B, tpsMath);
    expect(loaded8B.isSimulated).toBe(true);
    expect(loaded8B.daftarSiswa.length).toBe(30);
    expect(loaded8B.daftarSiswa[0].nama).toBe('Aditia Pratama');

    // Mengosongkan VIII A juga berdampak konsisten lintas mapel di VIII A saja
    createEmptyKelasHarianData(math8A, tpsMath);
    expect(getKelasHarianData(ipa8A, tpsIPA).daftarSiswa.length).toBe(0);
    expect(getKelasHarianData(math8B, tpsMath).daftarSiswa.length).toBe(30);
  });

  it('Test 7 & 8: Isolasi lintas Tahun Ajaran dan lintas Sekolah (termasuk nama sekolah identik namun schoolId berbeda)', () => {
    const prof2025 = saveSchoolProfile(
      makeProfile({ schoolId: 'sch_1', namaSekolah: 'SMP Negeri 1', tahunAjaran: '2025/2026' })
    );
    const prof2026 = makeProfile({ schoolId: 'sch_1', namaSekolah: 'SMP Negeri 1', tahunAjaran: '2026/2027' });
    const profSchoolB = makeProfile({ schoolId: 'sch_2', namaSekolah: 'SMP Negeri 1', tahunAjaran: '2025/2026' });

    const tps2025 = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: prof2025.schoolId,
      tahunAjaran: prof2025.tahunAjaran,
    }).tpList;
    const tps2026 = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: prof2026.schoolId,
      tahunAjaran: prof2026.tahunAjaran,
    }).tpList;
    const tpsSchoolB = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profSchoolB.schoolId,
      tahunAjaran: profSchoolB.tahunAjaran,
    }).tpList;

    const imported2025 = applyNewStudentRoster(
      getKelasHarianData(prof2025, tps2025),
      makeRealStudents(3, 'TA2025'),
      tps2025,
      false,
      { source: 'user_imported' }
    );
    saveKelasHarianData(prof2025, imported2025);

    const modul2025 = buildSmartModulAjar(tps2025[0], prof2025);
    modul2025.pemahamanBermakna = 'Arsip TA 2025/2026';
    saveModulAjarDraft(prof2025, tps2025[0], 'pbl', modul2025, 'user_edited');

    // Tahun Ajaran baru 2026/2027 terisolasi bersih
    const data2026 = getKelasHarianData(prof2026, tps2026);
    expect(data2026.daftarSiswa.length).toBe(30);
    expect(loadModulAjarDraft(prof2026, tps2026[0], 'pbl')).toBeNull();

    // Sekolah B (schoolId berbeda meski namaSekolah sama "SMP Negeri 1") tetap terisolasi bersih
    const dataSchoolB = getKelasHarianData(profSchoolB, tpsSchoolB);
    expect(dataSchoolB.daftarSiswa.length).toBe(30);
    expect(loadModulAjarDraft(profSchoolB, tpsSchoolB[0], 'pbl')).toBeNull();

    // Kembali ke TA 2025/2026 -> data asli masih utuh
    expect(getKelasHarianData(prof2025, tps2025).daftarSiswa.map((s) => s.nama)).toEqual([
      'TA2025 Siswa 1',
      'TA2025 Siswa 2',
      'TA2025 Siswa 3',
    ]);
    expect(loadModulAjarDraft(prof2025, tps2025[0], 'pbl')?.pemahamanBermakna).toBe('Arsip TA 2025/2026');

    // Mengubah namaSekolah pada sekolah yang sama tetap mempertahankan schoolId sehingga data tidak hilang
    const renamedProf2025 = saveSchoolProfile({ ...prof2025, namaSekolah: 'SMP Negeri 1 Terpadu' });
    expect(renamedProf2025.schoolId).toBe('sch_1');
    expect(getSchoolProfile().schoolId).toBe('sch_1');
    expect(getKelasHarianData(renamedProf2025, tps2025).daftarSiswa[0].nama).toBe('TA2025 Siswa 1');
    expect(loadModulAjarDraft(renamedProf2025, tps2025[0], 'pbl')?.pemahamanBermakna).toBe('Arsip TA 2025/2026');
  });

  it('Test 9 & 10: Flush sinkron sebelum debounce berakhir & pelaporan jujur saat kuota penyimpanan penuh', () => {
    const profile = saveSchoolProfile(makeProfile());
    const tp = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList[0];

    // 1. Controller flush sinkron sebelum timer debounce selesai (simulasi navigasi cepat / unmount <300ms)
    const initialLKPD = buildSmartLKPD(tp, profile, 'kasus');
    const editedLKPD = { ...initialLKPD, judul: 'Judul Cepat Sebelum Unmount' };
    const controller = createPendingLKPDSaveController();
    controller.markDirty(editedLKPD, profile, tp, 'kasus');
    expect(controller.hasPending()).toBe(true);
    const flushRes = controller.flushNow();
    expect(flushRes?.ok).toBe(true);
    expect(controller.hasPending()).toBe(false);

    const persistedLKPD = loadLKPDDraft(profile, tp, 'kasus');
    expect(persistedLKPD?.judul).toBe('Judul Cepat Sebelum Unmount');

    // LKPDViewer merender draf tersimpan & menampilkan status penyimpanan
    const lkpdHtml = renderToStaticMarkup(
      React.createElement(LKPDViewer, {
        lkpd: initialLKPD,
        schoolProfile: profile,
        customTP: tp,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
      })
    );
    expect(lkpdHtml).toContain('Judul Cepat Sebelum Unmount');
    expect(lkpdHtml).toContain('Tersimpan');

    // 2. ModulAjarViewer merender draf tersimpan & indikator Tersimpan
    const initialModul = buildSmartModulAjar(tp, profile);
    const editedModul = { ...initialModul, pemahamanBermakna: 'Pemahaman Bermakna Editan Guru' };
    saveModulAjarDraft(profile, tp, 'pbl', editedModul, 'user_edited');

    render(
      React.createElement(ModulAjarViewer, {
        modul: initialModul,
        schoolProfile: profile,
        customTP: tp,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
      })
    );
    expect(screen.getByText('Tersimpan')).toBeTruthy();
    expect(screen.getByDisplayValue('Pemahaman Bermakna Editan Guru')).toBeTruthy();

    // 3. Simulasi error penyimpanan kuota penuh -> mengembalikan ok:false & pesan jelas (tidak memalsukan "Tersimpan")
    const spySetItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const failedModulSave = saveModulAjarDraft(profile, tp, 'pbl', editedModul, 'user_edited');
    expect(failedModulSave.ok).toBe(false);
    expect(failedModulSave.error).toContain('QuotaExceededError');

    const failedLkpdFlush = controller.flushNow();
    controller.markDirty(editedLKPD, profile, tp, 'kasus');
    const failedLkpdSave = controller.flushNow();
    void failedLkpdFlush;
    expect(failedLkpdSave?.ok).toBe(false);
    expect(controller.hasPending()).toBe(true);
    spySetItem.mockRestore();
  });

  it('Test 11: Master Bundle, ZIP 06, dan Status Kesiapan Supervisi otomatis memuat draf Modul Ajar & LKPD tersimpan terbaru', async () => {
    const mathProf = saveSchoolProfile(makeProfile({ mataPelajaranUtama: 'Matematika' }));
    const ipaProf = makeProfile({ mataPelajaranUtama: 'IPA (Ilmu Pengetahuan Alam)' });

    const mathTPs = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: mathProf.schoolId,
      tahunAjaran: mathProf.tahunAjaran,
    }).tpList;
    const ipaTPs = getSemesterCurriculumPlan('IPA (Ilmu Pengetahuan Alam)', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: ipaProf.schoolId,
      tahunAjaran: ipaProf.tahunAjaran,
    }).tpList;

    // Simpan draf suntingan guru hanya di Matematika TP 1 (PjBL + Eksperimen), dan simpan draf berbeda di IPA TP 1
    const mathModulDraft = buildSmartModulAjar(mathTPs[0], mathProf);
    mathModulDraft.pemahamanBermakna = 'MARKER_DRAF_MODUL_MATEMATIKA_TERSIMPAN';
    saveModulAjarDraft(mathProf, mathTPs[0], 'pjbl', mathModulDraft, 'ai_generated');

    const mathLkpdDraft = buildSmartLKPD(mathTPs[0], mathProf, 'eksperimen');
    mathLkpdDraft.judul = 'MARKER_DRAF_LKPD_MATEMATIKA_TERSIMPAN';
    saveLKPDDraft(mathProf, mathTPs[0], 'eksperimen', mathLkpdDraft, 'user_edited');

    const ipaModulDraft = buildSmartModulAjar(ipaTPs[0], ipaProf);
    ipaModulDraft.pemahamanBermakna = 'MARKER_DRAF_IPA_YANG_TIDAK_BOLEH_BOCOR';
    saveModulAjarDraft(ipaProf, ipaTPs[0], 'pbl', ipaModulDraft, 'user_edited');

    const mathHarian = getKelasHarianData(mathProf, mathTPs);
    const readiness = getSupervisiDocumentsReadiness(mathProf, mathTPs, mathHarian);
    const item06 = readiness.find((r) => r.id === 6)!;
    expect(item06.ringkasan).toContain('1/4 Modul Ajar');
    expect(item06.ringkasan).toContain('1/4 LKPD');

    // Tanpa passing options.activeModulAjar/activeLKPD dari React state, ekspor tetap menarik draf Matematika dari storage!
    const masterRes = await exportBundelSupervisiMasterDocx(mathProf, mathTPs, mathHarian);
    const masterZip = await JSZip.loadAsync(await masterRes.blob.arrayBuffer());
    const masterXml = await masterZip.file('word/document.xml')!.async('string');

    expect(masterXml).toContain('MARKER_DRAF_MODUL_MATEMATIKA_TERSIMPAN');
    expect(masterXml).toContain('MARKER_DRAF_LKPD_MATEMATIKA_TERSIMPAN');
    expect(masterXml).toContain('Draf Tersimpan');
    expect(masterXml).toContain('Template Bawaan Sistem (Belum Disunting Guru)');
    expect(masterXml).not.toContain('MARKER_DRAF_IPA_YANG_TIDAK_BOLEH_BOCOR');

    // ZIP 06_Modul_Ajar.docx ikut memuat draf Matematika terbaru
    const zipRes = await exportPaketSupervisiToZip(mathProf, mathTPs, mathHarian);
    const outerZip = await JSZip.loadAsync(await zipRes.zipBlob.arrayBuffer());
    const doc06Entry = Object.values(outerZip.files).find((f) =>
      f.name.endsWith('06_Modul_Ajar.docx')
    )!;
    const doc06Zip = await JSZip.loadAsync(await doc06Entry.async('arraybuffer'));
    const doc06Xml = await doc06Zip.file('word/document.xml')!.async('string');
    expect(doc06Xml).toContain('MARKER_DRAF_MODUL_MATEMATIKA_TERSIMPAN');
    expect(doc06Xml).toContain('MARKER_DRAF_LKPD_MATEMATIKA_TERSIMPAN');
    expect(doc06Xml).not.toContain('MARKER_DRAF_IPA_YANG_TIDAK_BOLEH_BOCOR');
  });

  it('Test 12-15: Migrasi versi lama non-destruktif, idempoten, menjaga legacy_unverified, dan menandai draf/roster ambigu untuk konfirmasi', () => {
    const profile = saveSchoolProfile(makeProfile({ namaSekolah: 'SMP Negeri 5 Migrasi' }));

    // 1. Legacy draft ambigu (tanpa informasi mataPelajaran -> tidak boleh menebak ke Matematika!)
    localStorage.setItem(
      'modul_ajar_8.1_pbl',
      JSON.stringify({
        tpKode: '8.1',
        materiPokok: 'Materi Lama Tanpa Mapel',
        pemahamanBermakna: 'Draf Berharga Tanpa Nama Mapel',
      })
    );

    // 2. Legacy draft LKPD jelas milik Bahasa Indonesia TP 8.1
    const bindoTP = getSemesterCurriculumPlan('Bahasa Indonesia', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList[0];
    localStorage.setItem(
      'lkpd_tp-8-1_kasus',
      JSON.stringify({
        ...buildSmartLKPD(bindoTP, { ...profile, mataPelajaranUtama: 'Bahasa Indonesia' }, 'kasus'),
        judul: 'LKPD Lama Bindo Jelas Milik Bahasa Indonesia',
      })
    );

    // 3. Dua data kelas harian legacy tanpa metadata (legacy_unverified) dengan roster berbeda antara Matematika & IPA pada rombel VIII A
    localStorage.setItem(
      'asesmerdeka_harian_SMP_Negeri_5_Migrasi_Matematika_8_VIII_A_sem1',
      JSON.stringify({
        rombel: 'VIII A',
        mataPelajaran: 'Matematika',
        semester: '1 (Ganjil)',
        tahunAjaran: '2026/2027',
        daftarSiswa: [
          { id: 'm1', noUrut: 1, nis: '101', nama: 'Siswa Matematika A', jenisKelamin: 'L' },
        ],
        daftarPresensi: [],
        daftarJurnal: [],
        daftarNilai: [],
      })
    );
    localStorage.setItem(
      'asesmerdeka_harian_SMP_Negeri_5_Migrasi_IPA__Ilmu_Pengetahuan_Alam__8_VIII_A_sem1',
      JSON.stringify({
        rombel: 'VIII A',
        mataPelajaran: 'IPA (Ilmu Pengetahuan Alam)',
        semester: '1 (Ganjil)',
        tahunAjaran: '2026/2027',
        daftarSiswa: [
          { id: 'i1', noUrut: 1, nis: '201', nama: 'Siswa IPA B', jenisKelamin: 'P' },
          { id: 'i2', noUrut: 2, nis: '202', nama: 'Siswa IPA C', jenisKelamin: 'L' },
        ],
        daftarPresensi: [],
        daftarJurnal: [],
        daftarNilai: [],
      })
    );

    // Jalankan migrasi kali pertama
    const report1 = runNonDestructiveStorageMigration(profile);
    expect(localStorage.getItem(STORAGE_MIGRATION_VERSION_KEY)).toBe('1');
    expect(localStorage.getItem('modul_ajar_8.1_pbl')).toBeTruthy(); // non-destruktif: key lama tidak dihapus
    expect(localStorage.getItem(LEGACY_BACKUP_STORAGE_KEY)).toBeTruthy();

    // Ambiguous draft tidak boleh ditempel diam-diam ke Matematika
    expect(loadLatestModulAjarDraft(profile, getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList[0])).toBeNull();

    const pendingDrafts = getPendingAmbiguousLegacyDrafts();
    expect(pendingDrafts.some((d) => d.legacyKey === 'modul_ajar_8.1_pbl')).toBe(true);

    // Draf Bahasa Indonesia yang jelas tidak ambigu harus bermigrasi ke Bahasa Indonesia
    const bindoRestored = loadLKPDDraft(
      { ...profile, mataPelajaranUtama: 'Bahasa Indonesia' },
      bindoTP,
      'kasus'
    );
    expect(bindoRestored?.judul).toBe('LKPD Lama Bindo Jelas Milik Bahasa Indonesia');

    // Data harian mempertahankan status legacy_unverified (bukan otomatis dianggap actual)
    const mathMigrated = getKelasHarianData(profile, []);
    expect(mathMigrated.dataSource).toBe('legacy_unverified');

    // Konflik roster antar Matematika & IPA terdeteksi & menunggu konfirmasi guru
    const rosterConflicts = getPendingLegacyRosterConflicts();
    expect(rosterConflicts.length).toBe(1);
    expect(rosterConflicts[0].candidates.length).toBe(2);

    // Idempoten: ubah dulu v2 Bahasa Indonesia lalu jalankan migrasi kedua kalinya -> tidak menimpa data v2!
    const newerBindo = { ...bindoRestored!, judul: 'Judul Baru V2 Tidak Boleh Tertimpa' };
    saveLKPDDraft(
      { ...profile, mataPelajaranUtama: 'Bahasa Indonesia' },
      bindoTP,
      'kasus',
      newerBindo,
      'user_edited'
    );
    const report2 = runNonDestructiveStorageMigration(profile);
    expect(report2.version).toBe(report1.version);
    expect(
      loadLKPDDraft({ ...profile, mataPelajaranUtama: 'Bahasa Indonesia' }, bindoTP, 'kasus')?.judul
    ).toBe('Judul Baru V2 Tidak Boleh Tertimpa');

    // Resolusi eksplisit oleh guru: pasangkan draf ambigu & pilih roster IPA -> selesai bersih
    const mathTP1 = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList[0];
    expect(resolveAmbiguousLegacyDraft('modul_ajar_8.1_pbl', 'attach', profile, mathTP1)).toBe(true);
    expect(getPendingAmbiguousLegacyDrafts().length).toBe(0);
    expect(loadModulAjarDraft(profile, mathTP1, 'pbl')?.pemahamanBermakna).toBe('Draf Berharga Tanpa Nama Mapel');

    const ipaCandidate = rosterConflicts[0].candidates.find((c) =>
      c.mataPelajaran.includes('IPA')
    )!;
    expect(resolveLegacyRosterConflict(rosterConflicts[0].id, ipaCandidate.legacyKey, profile)).toBe(true);
    expect(getPendingLegacyRosterConflicts().length).toBe(0);

    // Konfirmasi actual & sinkronisasi roster Matematika sekarang mengikuti roster IPA yang dipilih guru
    const afterResolveMath = getKelasHarianData(profile, [mathTP1]);
    expect(afterResolveMath.daftarSiswa.map((s) => s.nama)).toEqual(['Siswa IPA B', 'Siswa IPA C']);
    const confirmedActual = confirmLegacyKelasHarianAsActual(profile, afterResolveMath);
    expect(confirmedActual.dataSource).toBe('user_manual');
    expect(getKelasHarianData({ ...profile, mataPelajaranUtama: 'IPA (Ilmu Pengetahuan Alam)' }, []).dataSource).toBe('user_manual');
  });
});
