import { beforeEach, describe, expect, it } from 'vitest';
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

import {
  ALL_CURATED_TOPIC_ENTRIES,
  getRichCurriculumTopics,
  getSubjectFaseCoverageStatus,
  getTopicBankCoverageMatrix,
  lookupCuratedTopicBank,
  makeTopicEntry,
} from '../../data/kurikulumTopicBank';
import {
  getSemesterCurriculumPlan,
  getSuggestedTopics,
} from '../kurikulumCatalog';
import {
  detectSuspectedLegacySem2Clones,
  isValidSpiralProgression,
  validateSemesterPlanProgression,
  validateTopicBankEntries,
} from '../topicProgressionValidator';
import {
  getSavedCustomTPList,
  saveCustomTPList,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { saveCPEntry } from '../cpStorage';
import { initializeOrSyncPhaseATPPlan, savePhaseATPPlan } from '../atpStorage';
import { buildSmartProta, buildSmartPromes } from '../perangkatAjarEngine';
import {
  analyzeWorkspaceConflict,
  applyConflictChoicesToMergedEntries,
  type WorkspaceBackupPayload,
} from '../cloudSyncManager';
import { V2_BACKUP_STORAGE_PREFIXES } from '../storageIdentity';
import { TopicBankBrowserPanel } from '../../components/hub/TopicBankBrowserPanel';

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch-test-83c',
    instansiDinas: 'DINAS PENDIDIKAN KOTA UJI',
    namaSekolah: 'SMP Uji Progresi 8.3C',
    alamatSekolah: 'Jl. Kurikulum Merdeka No. 83',
    namaGuru: 'Guru Penguji, S.Pd.',
    nipGuru: '198801012015011001',
    namaKepalaSekolah: 'Kepala Sekolah, M.Pd.',
    nipKepalaSekolah: '197501012000011001',
    kotaSekolah: 'Bandung',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    rombelAktif: '8-A',
    daftarRombel: ['8-A'],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

describe('Task 8.3C — Subject-Specific Curriculum Topic Bank & Semester Learning Progression', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Seluruh bank topik terkurasi lulus validasi (0 blocking issue) & membedakan fase secara tegas', () => {
    const report = validateTopicBankEntries(ALL_CURATED_TOPIC_ENTRIES);
    expect(report.blockingCount).toBe(0);
    expect(report.isValid).toBe(true);

    // Fase B vs Fase C TIDAK dicampur
    for (const [mapel, jenjang] of [
      ['Matematika', 'SD/MI'],
      ['Bahasa Indonesia', 'SD/MI'],
      ['IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI'],
      ['Pendidikan Pancasila', 'SD/MI'],
      ['Seni Musik', 'SD/MI'],
      ['Fikih (MI)', 'SD/MI'],
    ] as const) {
      const fb = lookupCuratedTopicBank(mapel, 'Fase B (Kelas 3-4 SD)', '4', '1 (Ganjil)');
      const fc = lookupCuratedTopicBank(mapel, 'Fase C (Kelas 5-6 SD)', '5', '1 (Ganjil)');
      expect(fb.isAvailable).toBe(true);
      expect(fc.isAvailable).toBe(true);
      expect(fb.faseCode).toBe('Fase B');
      expect(fc.faseCode).toBe('Fase C');
      const fbIds = new Set(fb.allPhaseTopics.map((t) => t.topicId));
      expect(fc.allPhaseTopics.some((t) => fbIds.has(t.topicId))).toBe(false);
      expect(fb.jenjang).toBe(jenjang);
    }

    // Fase D, E, dan F dibedakan tegas
    for (const mapel of ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'Informatika', 'Seni Musik']) {
      const fd = lookupCuratedTopicBank(mapel, 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)');
      const fe = lookupCuratedTopicBank(mapel, 'Fase E (Kelas 10 SMA/SMK)', '10', '1 (Ganjil)');
      const ff = lookupCuratedTopicBank(mapel, 'Fase F (Kelas 11-12 SMA/SMK)', '11', '1 (Ganjil)');
      expect(fd.isAvailable && fe.isAvailable && ff.isAvailable).toBe(true);
      const idD = new Set(fd.allPhaseTopics.map((t) => t.topicId));
      const idE = new Set(fe.allPhaseTopics.map((t) => t.topicId));
      const idF = new Set(ff.allPhaseTopics.map((t) => t.topicId));
      expect([...idE].some((id) => idD.has(id))).toBe(false);
      expect([...idF].some((id) => idE.has(id))).toBe(false);
    }
  });

  it('2. Tidak ada fallback generik Seni Budaya & mata pelajaran belum tersedia menampilkan empty state jujur', () => {
    const unsupportedSubjects = [
      { mapel: 'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Pendidikan Agama Kristen dan Budi Pekerti', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Pendidikan Agama Hindu dan Budi Pekerti', fase: 'Fase E (Kelas 10 SMA/SMK)', kelas: '10' },
      { mapel: 'Seni Teater', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Teknik Komputer dan Jaringan (TKJ)', fase: 'Fase F (Kelas 11-12 SMA/SMK)', kelas: '11' },
      { mapel: 'Kuliner / Tata Boga (SMK)', fase: 'Fase F (Kelas 11-12 SMA/SMK)', kelas: '11' },
      { mapel: 'Seni Musik SMK', fase: 'Fase F (Kelas 11-12 SMA/SMK)', kelas: '11' },
    ];

    for (const item of unsupportedSubjects) {
      const res = lookupCuratedTopicBank(item.mapel, item.fase as never, item.kelas, '1 (Ganjil)');
      expect(res.isAvailable).toBe(false);
      expect(res.topics).toEqual([]);
      expect(['belum_tersedia', 'input_guru_dibutuhkan']).toContain(res.coverageStatus);
      expect(getRichCurriculumTopics(item.mapel, item.fase as never, item.kelas)).toEqual([]);
      expect(getSuggestedTopics(item.mapel, item.fase as never, item.kelas)).toEqual([]);

      const semPlan = getSemesterCurriculumPlan(item.mapel, item.fase as never, item.kelas, '1 (Ganjil)');
      expect(semPlan.isEmptyState).toBe(true);
      expect(semPlan.tpList).toEqual([]);
      expect(semPlan.emptyStateMessage).toBeTruthy();
      expect(semPlan.emptyStateActions).toEqual(['tempel_cp', 'pilih_referensi_cp', 'susun_manual', 'usulan_ai']);
    }

    // Pastikan Kepercayaan pakai referensi BKPDM 021/2026 & Agama Kristen pakai BKPDM 020/2026
    const kepercayaanPlan = getSemesterCurriculumPlan(
      'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti',
      'Fase D (Kelas 7-9 SMP)',
      '8',
      '1 (Ganjil)'
    );
    expect(kepercayaanPlan.referensiCP?.nomorDokumen).toMatch(/021.*2026/i);

    const kristenPlan = getSemesterCurriculumPlan(
      'Pendidikan Agama Kristen dan Budi Pekerti',
      'Fase D (Kelas 7-9 SMP)',
      '8',
      '1 (Ganjil)'
    );
    expect(kristenPlan.referensiCP?.nomorDokumen).toMatch(/020.*2026/i);
    expect(kristenPlan.tpList).toEqual([]);
  });

  it('3. Progresi Semester 1 vs Semester 2 lintas mapel bebas cloning otomatis & bebas label spiral palsu', () => {
    const matrix: Array<{ mapel: string; fase: string; kelas: string }> = [
      { mapel: 'Matematika', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Bahasa Indonesia', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Bahasa Inggris', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', fase: 'Fase C (Kelas 5-6 SD)', kelas: '5' },
      { mapel: 'IPA (Ilmu Pengetahuan Alam)', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'IPS (Ilmu Pengetahuan Sosial)', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Sejarah', fase: 'Fase E (Kelas 10 SMA/SMK)', kelas: '10' },
      { mapel: 'Pendidikan Pancasila', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Pendidikan Agama Islam & Budi Pekerti', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Informatika', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Seni Musik', fase: 'Fase D (Kelas 7-9 SMP)', kelas: '8' },
      { mapel: 'Produk Kreatif dan Kewirausahaan (PKK)', fase: 'Fase F (Kelas 11-12 SMA/SMK)', kelas: '11' },
      { mapel: 'Matematika Kejuruan', fase: 'Fase E (Kelas 10 SMA/SMK)', kelas: '10' },
    ];

    for (const row of matrix) {
      const s1 = getSemesterCurriculumPlan(row.mapel, row.fase as never, row.kelas, '1 (Ganjil)');
      const s2 = getSemesterCurriculumPlan(row.mapel, row.fase as never, row.kelas, '2 (Genap)');

      expect(s1.tpList.length).toBeGreaterThanOrEqual(3);
      expect(s2.tpList.length).toBeGreaterThanOrEqual(3);
      expect(s1.isEmptyState).toBe(false);
      expect(s2.isEmptyState).toBe(false);

      // Tidak boleh ada akhiran template spiral palsu lama
      for (const tp of s2.tpList) {
        expect(tp.kompetensiInti || '').not.toContain('Pendalaman spiral Semester Genap');
      }

      // Tidak boleh terjadi duplikasi topik antara Sem 1 dan Sem 2 tanpa spiralRelation yang sah
      const progressionIssues = validateSemesterPlanProgression(s1.tpList, s2.tpList);
      expect(progressionIssues).toEqual([]);

      const titles1 = new Set(s1.tpList.map((t) => t.materiPokok.toLowerCase().trim()));
      const hasDistinctSem2 = s2.tpList.some((t) => !titles1.has(t.materiPokok.toLowerCase().trim()));
      expect(hasDistinctSem2).toBe(true);
    }
  });

  it('4. Skenario Seni Musik Fase D/E & SMK: progresi musikal autentik, hubungan spiral terdokumentasi, dan status jujur', () => {
    const musikSmpS1 = lookupCuratedTopicBank('Seni Musik', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)');
    const musikSmpS2 = lookupCuratedTopicBank('Seni Musik', 'Fase D (Kelas 7-9 SMP)', '8', '2 (Genap)');
    expect(musikSmpS1.coverageStatus).toBe('berdasarkan_contoh_panduan');
    expect(musikSmpS1.sumberDokumen).toMatch(/Panduan Mata Pelajaran Seni Musik/i);
    expect(musikSmpS1.topics.map((t) => t.progressionStage)).toContain('pengenalan');
    expect(musikSmpS1.topics.map((t) => t.progressionStage)).toContain('pengembangan');
    expect(musikSmpS2.topics.map((t) => t.progressionStage)).toContain('pendalaman');

    // Kreasi aransemen di Sem 2 memiliki spiralRelation sah yang merujuk penyajian ansambel Sem 1
    const aransemen = musikSmpS2.topics.find((t) => t.topicId === 'musik-fd-s2-kreasi-aransemen-vokal-group');
    expect(aransemen?.spiralRelation).toBeDefined();
    expect(isValidSpiralProgression(aransemen?.spiralRelation)).toBe(true);
    expect(aransemen?.prasyaratTopicIds).toContain('musik-fd-s1-ansambel-musik-nusantara');

    // Fase E SMA berbeda dari Fase D SMP & status matriks jujur
    const musikSmaS1 = lookupCuratedTopicBank('Seni Musik', 'Fase E (Kelas 10 SMA/SMK)', '10', '1 (Ganjil)');
    expect(musikSmaS1.isAvailable).toBe(true);
    expect(musikSmaS1.topics[0].topicId).not.toBe(musikSmpS1.topics[0].topicId);

    // SMK Seni Musik konsentrasi tidak menyalin bank umum secara membabi-buta
    expect(getSubjectFaseCoverageStatus('Seni Musik (SMK)', 'Fase F (Kelas 11-12 SMA/SMK)', '11')).toBe('input_guru_dibutuhkan');

    const matrix = getTopicBankCoverageMatrix();
    expect(matrix.some((m) => m.status === 'terkurasi_dan_terverifikasi')).toBe(false);
    expect(matrix.some((m) => m.status === 'berdasarkan_contoh_panduan')).toBe(true);
    expect(matrix.some((m) => m.status === 'belum_tersedia')).toBe(true);
  });

  it('5. Validator mendeteksi duplikasi ID, akhiran kosmetik, spiral tanpa progresi, fase salah, dan lompatan jauh', () => {
    const tA = makeTopicEntry({
      topicId: 'test-dup-id',
      mataPelajaran: 'Uji Mapel',
      jenjang: 'SMP/MTs',
      faseCode: 'Fase D',
      elemen: 'Elemen A',
      topik: 'Konsep Dasar A',
      tujuanPembelajaran: 'Memahami konsep dasar A secara menyeluruh.',
      arahanRangkuman: 'Arahan A',
      kompetensiInti: 'Memahami A',
      prasyarat: [],
      buktiKetercapaian: ['Bukti A'],
      suggestedSemester: '1 (Ganjil)',
      progressionStage: 'pengenalan',
    });
    const tB = makeTopicEntry({
      topicId: 'test-dup-id',
      mataPelajaran: 'Uji Mapel',
      jenjang: 'SMP/MTs',
      faseCode: 'Fase C', // sengaja salah terhadap label Fase D default bila dipaksa
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemen: '',
      topik: 'Konsep Dasar A (Kelanjutan Spiral)',
      tujuanPembelajaran: 'Memahami konsep dasar A secara menyeluruh.',
      arahanRangkuman: 'Arahan B',
      kompetensiInti: 'Kelanjutan spiral',
      prasyarat: [],
      prasyaratTopicIds: ['id-tidak-ada'],
      buktiKetercapaian: ['Bukti B'],
      suggestedSemester: '2 (Genap)',
      progressionStage: 'pendalaman',
    });
    const tCosmeticSameFase = makeTopicEntry({
      topicId: 'test-cosmetic-dup-id',
      mataPelajaran: 'Uji Mapel',
      jenjang: 'SMP/MTs',
      faseCode: 'Fase D',
      elemen: 'Elemen A',
      topik: 'Konsep Dasar A (Kelanjutan Spiral)',
      tujuanPembelajaran: 'Memahami konsep dasar A secara menyeluruh.',
      arahanRangkuman: 'Arahan C',
      kompetensiInti: 'Memahami A',
      prasyarat: [],
      buktiKetercapaian: ['Bukti C'],
      suggestedSemester: '2 (Genap)',
      progressionStage: 'pengenalan',
    });

    const validation = validateTopicBankEntries([tA, tB, tCosmeticSameFase]);
    const codes = validation.issues.map((i) => i.code);
    expect(validation.isValid).toBe(false);
    expect(codes).toContain('DUPLICATE_TOPIC_ID');
    expect(codes).toContain('FASE_MISMATCH');
    expect(codes).toContain('SPIRAL_WITHOUT_COMPETENCY_PROGRESSION');
    expect(codes).toContain('COSMETIC_SUFFIX_DUPLICATE');
    expect(codes).toContain('MISSING_ELEMEN_CP');
    expect(codes).toContain('MISSING_PREREQUISITE_TOPIC');
  });

  it('6. Integrasi CP -> TP -> ATP -> Prota/Promes, perlindungan data tersimpan guru, serta Cloud Sync/Backup kompatibel', () => {
    const profile = makeProfile({ mataPelajaranUtama: 'Matematika', kelasUtama: '8', semester: '2 (Genap)' });
    const cpSaved = saveCPEntry(profile, {
      mataPelajaran: 'Matematika',
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Aljabar',
      teksCP: 'Peserta didik dapat mengenali, memprediksi, dan menggeneralisasi pola serta fungsi linear.',
      asalCP: 'input_guru',
    });

    const planWithCP = getSemesterCurriculumPlan(
      'Matematika',
      'Fase D (Kelas 7-9 SMP)',
      '8',
      '2 (Genap)',
      { schoolId: profile.schoolId, tahunAjaran: profile.tahunAjaran, savedCPEntries: [cpSaved] }
    );
    expect(planWithCP.isSyntheticSummary).toBe(false);
    expect(planWithCP.capaianPembelajaran).toBe(cpSaved.teksCP);

    // Simulasi data lama Semester 2 hasil kloning Sem 1 tanpa persetujuan guru
    const sem1Default = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList;
    const legacyClonedSem2: CustomTPItem[] = sem1Default.map((t, idx) => ({
      ...t,
      id: `legacy_sem2_${idx + 1}`,
      kode: `8.${idx + 5}`,
      kompetensiInti: `${t.kompetensiInti} (Pendalaman spiral Semester Genap: penguatan pemodelan & transfer konteks kompleks)`,
      statusReview: 'draft',
    }));
    const guruApprovedCustomSem2: CustomTPItem = {
      ...legacyClonedSem2[0],
      id: 'guru_approved_id',
      statusReview: 'disetujui',
    };

    const cloneAudit = detectSuspectedLegacySem2Clones(sem1Default, [
      guruApprovedCustomSem2,
      ...legacyClonedSem2.slice(1),
    ]);
    expect(cloneAudit.hasSuspectedClones).toBe(true);
    // Yang sudah disetujui guru TIDAK ditimpa penanda perlu_ditinjau, sementara klon draft ditandai
    expect(cloneAudit.annotatedSem2List[0].legacyDuplicationReview).toBeUndefined();
    expect(cloneAudit.annotatedSem2List[1].legacyDuplicationReview?.status).toBe('perlu_ditinjau');

    // Simpan TP kustom guru lalu pastikan Phase ATP dan Prota/Promes membacanya tanpa tertimpa generator
    const finalCustomSem2 = [guruApprovedCustomSem2, ...planWithCP.tpList.slice(1)];
    saveCustomTPList('Matematika', '8', '2 (Genap)', finalCustomSem2, profile);
    const reloaded = getSavedCustomTPList('Matematika', '8', '2 (Genap)', profile)!;
    expect(reloaded[0].id).toBe('guru_approved_id');

    const phaseATP = initializeOrSyncPhaseATPPlan(profile, reloaded);
    savePhaseATPPlan(profile, phaseATP);
    const planFollowingATP = getSemesterCurriculumPlan(
      'Matematika',
      'Fase D (Kelas 7-9 SMP)',
      '8',
      '2 (Genap)',
      {
        schoolId: profile.schoolId,
        tahunAjaran: profile.tahunAjaran,
        phaseATPPlan: phaseATP,
        availablePhaseTPs: reloaded,
      }
    );
    expect(planFollowingATP.tpList.map((t) => t.id)).toContain('guru_approved_id');

    const prota = buildSmartProta(profile, reloaded, { tpListSem1: sem1Default, tpListSem2: reloaded });
    const promes = buildSmartPromes(profile, reloaded);
    expect(prota.totalJPSemester2).toBeGreaterThan(0);
    expect(promes.rows.length).toBeGreaterThanOrEqual(reloaded.length);

    // Cloud Sync 3-way merge mempertahankan metadata Task 8.3C pada asesmerdeka_custom_tp_v2
    const basePayload: WorkspaceBackupPayload = {
      schemaVersion: 1,
      exportedAt: '2026-11-17T00:00:00Z',
      app: 'asesmerdeka',
      entries: {
        asesmerdeka_custom_tp_v2: { scope_sem2: planWithCP.tpList },
      },
    };
    const localPayload: WorkspaceBackupPayload = {
      schemaVersion: 1,
      exportedAt: '2026-11-17T01:00:00Z',
      app: 'asesmerdeka',
      entries: {
        asesmerdeka_custom_tp_v2: {
          scope_sem2: [{ ...planWithCP.tpList[0], statusReview: 'disetujui' }, ...planWithCP.tpList.slice(1)],
        },
      },
    };
    const serverPayload: WorkspaceBackupPayload = {
      schemaVersion: 1,
      exportedAt: '2026-11-17T01:05:00Z',
      app: 'asesmerdeka',
      entries: {
        asesmerdeka_custom_tp_v2: {
          scope_sem2: [planWithCP.tpList[0], { ...planWithCP.tpList[1], alokasiJP: 18 }, ...planWithCP.tpList.slice(2)],
        },
      },
    };
    const merged = analyzeWorkspaceConflict(
      basePayload.entries,
      localPayload.entries,
      serverPayload.entries
    );
    const resolvedEntries = applyConflictChoicesToMergedEntries(
      {
        serverRevision: 2,
        serverUpdatedAt: '2026-11-17T01:05:00Z',
        serverDeviceId: 'srv-test',
        conflicts: merged.conflicts,
        mergedEntries: merged.mergedEntries,
        autoMergedSummary: merged.autoMergedSummary,
      },
      {}
    );
    const mergedScope = (resolvedEntries.asesmerdeka_custom_tp_v2 as Record<string, CustomTPItem[]>).scope_sem2;
    expect(mergedScope[0].sourceTopicId).toBeTruthy();
    expect(mergedScope[0].progressionStage).toBeTruthy();
    expect(V2_BACKUP_STORAGE_PREFIXES).toContain('asesmerdeka_custom_tp_v2');

    // Uji SSR UI TopicBankBrowserPanel untuk Seni Musik & Kepercayaan
    const htmlMusik = renderToStaticMarkup(
      React.createElement(TopicBankBrowserPanel, {
        schoolProfile: makeProfile({ mataPelajaranUtama: 'Seni Musik', kelasUtama: '8', semester: '2 (Genap)' }),
        currentFase: 'Fase D (Kelas 7-9 SMP)',
        tpList: [],
        savedCPEntries: [],
        onOpenCPPanel: () => {},
        onAddNewTP: () => {},
        onAddTopicDraftAsTP: () => {},
      })
    );
    expect(htmlMusik).toContain('Berdasarkan Contoh Panduan');
    expect(htmlMusik).toContain('Semester 2 (Genap)');

    const htmlKepercayaan = renderToStaticMarkup(
      React.createElement(TopicBankBrowserPanel, {
        schoolProfile: makeProfile({
          mataPelajaranUtama: 'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti',
          kelasUtama: '8',
          semester: '1 (Ganjil)',
        }),
        currentFase: 'Fase D (Kelas 7-9 SMP)',
        tpList: [],
        savedCPEntries: [],
        onOpenCPPanel: () => {},
        onAddNewTP: () => {},
        onAddTopicDraftAsTP: () => {},
      })
    );
    expect(htmlKepercayaan).toContain('Bank topik terkurasi untuk mata pelajaran dan fase ini belum tersedia.');
    expect(htmlKepercayaan).toContain('Tempel / Masukkan CP');
  });
});
