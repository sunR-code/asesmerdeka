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
if (typeof (globalThis as unknown as { addEventListener?: unknown }).addEventListener !== 'function') {
  (globalThis as unknown as { addEventListener: () => void }).addEventListener = () => {};
}
if (typeof (globalThis as unknown as { removeEventListener?: unknown }).removeEventListener !== 'function') {
  (globalThis as unknown as { removeEventListener: () => void }).removeEventListener = () => {};
}
if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}

import {
  ALL_CURATED_TOPIC_ENTRIES,
  getTopicBankCoverageMatrix,
  getTopicById,
  lookupCuratedTopicBank,
  resolveSafePedagogicalReviewStatus,
  type TopicPedagogicalReviewStatus,
} from '../../data/kurikulumTopicBank';
import {
  KURIKULUM_CATALOG,
  buildCustomTPFromTopicEntry,
  getAllSelectableSubjectsForJenjang,
  getSelectableSubjectGroups,
  getSemesterCurriculumPlan,
  resolveSubjectCatalogMetadata,
} from '../kurikulumCatalog';
import { validateTopicBankEntries } from '../topicProgressionValidator';
import {
  exportBackupDataJson,
  importBackupDataJson,
  saveCustomTPList,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { saveCPEntry } from '../cpStorage';
import {
  approvePhaseATPPlan,
  initializeOrSyncPhaseATPPlan,
  invalidatePhaseATPApprovalIfChanged,
} from '../atpStorage';
import { buildSmartPromes, buildSmartProta } from '../perangkatAjarEngine';
import { analyzeWorkspaceConflict } from '../cloudSyncManager';
import {
  TOPIC_ADJUSTMENT_STORAGE_V2_KEY,
  V2_BACKUP_STORAGE_PREFIXES,
} from '../storageIdentity';
import {
  applyTeacherAdjustmentsToTopicList,
  getTopicAdjustment,
  getTopicAdjustmentsForScope,
  removeTopicAdjustment,
  saveTopicAdjustment,
} from '../topicAdjustmentStorage';
import { ClassSetupStepView } from '../../components/hub/ClassSetupStepView';
import { TopicBankBrowserPanel } from '../../components/hub/TopicBankBrowserPanel';

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch-test-83c1',
    instansiDinas: 'DINAS PENDIDIKAN KABUPATEN UJI',
    namaSekolah: 'SDN Uji Cakupan 8.3C.1',
    alamatSekolah: 'Jl. Merdeka No. 1',
    namaGuru: 'Guru Uji, S.Pd.',
    nipGuru: '199001012025011001',
    namaKepalaSekolah: 'Kepala Sekolah Uji, M.Pd.',
    nipKepalaSekolah: '197501012000011001',
    kotaSekolah: 'Kota Uji',
    jenjang: 'SD/MI',
    kelasUtama: '4',
    rombelAktif: 'IV A',
    daftarRombel: ['IV A', 'IV B'],
    mataPelajaranUtama: 'Seni Musik',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

describe('Task 8.3C.1 — Curriculum Coverage Completion & Subject-Matter Content Validation', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('1. Katalog Mata Pelajaran: keterpilihan dipisahkan dari jumlah bank topik; Seni Musik, 6 Agama, Kepercayaan, & Madrasah terpisah rapi', () => {
    // Seni Musik tersedia pada SD/MI, SMP/MTs, SMA/MA dan terbedakan pada SMK
    expect(KURIKULUM_CATALOG['SD/MI'].mapelUmum).toContain('Seni Musik');
    expect(getAllSelectableSubjectsForJenjang('SD/MI')).toContain('Seni Musik');
    expect(getAllSelectableSubjectsForJenjang('SMP/MTs')).toContain('Seni Musik');
    expect(getAllSelectableSubjectsForJenjang('SMA/MA')).toContain('Seni Musik');
    expect(getAllSelectableSubjectsForJenjang('SMK')).toContain('Seni Musik (Umum)');

    // Pendidikan Agama (6 agama) & Pendidikan Kepercayaan dapat dipilih meskipun belum ada bank topik
    const smpSelectable = getAllSelectableSubjectsForJenjang('SMP/MTs');
    const agamaList = [
      'Pendidikan Agama Islam & Budi Pekerti',
      'Pendidikan Agama Kristen dan Budi Pekerti',
      'Pendidikan Agama Katolik dan Budi Pekerti',
      'Pendidikan Agama Hindu dan Budi Pekerti',
      'Pendidikan Agama Buddha dan Budi Pekerti',
      'Pendidikan Agama Khonghucu dan Budi Pekerti',
    ];
    for (const ag of agamaList) {
      expect(smpSelectable).toContain(ag);
      const meta = resolveSubjectCatalogMetadata(ag, 'SMP/MTs');
      expect(meta.regulationNomor).toMatch(/020.*2026/i);
      expect(meta.isAgama).toBe(true);
      expect(meta.isKepercayaan).toBe(false);
    }

    const kepercayaanName = 'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti';
    expect(smpSelectable).toContain(kepercayaanName);
    const kepMeta = resolveSubjectCatalogMetadata(kepercayaanName, 'SMP/MTs');
    expect(kepMeta.regulationNomor).toMatch(/021.*2026/i);
    expect(kepMeta.isKepercayaan).toBe(true);
    expect(kepMeta.isAgama).toBe(false);

    // Keterpilihan tidak disembunyikan meski bank topik kosong (contoh: Kristen, Kepercayaan, Seni Rupa/Tari/Teater)
    for (const uncurated of [
      'Pendidikan Agama Kristen dan Budi Pekerti',
      'Pendidikan Agama Katolik dan Budi Pekerti',
      kepercayaanName,
      'Seni Rupa',
      'Seni Tari',
      'Seni Teater',
    ]) {
      expect(smpSelectable).toContain(uncurated);
      const semPlan = getSemesterCurriculumPlan(uncurated, 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)');
      expect(semPlan.isEmptyState).toBe(true);
      expect(semPlan.tpList).toEqual([]);
      expect(semPlan.emptyStateMessage).toContain(uncurated);
      expect(semPlan.emptyStateMessage).not.toMatch(/Seni Budaya/i);
    }

    // Konteks Madrasah tetap terpisah dari daftar reguler & memakai regulasi KMA
    const sdGroupsReg = getSelectableSubjectGroups('SD/MI', { madrasahMode: false });
    const sdGroupsMad = getSelectableSubjectGroups('SD/MI', { madrasahMode: true });
    expect(sdGroupsReg.some((g) => g.subjects.includes('Fikih (MI)'))).toBe(false);
    expect(sdGroupsMad.some((g) => g.subjects.includes('Fikih (MI)'))).toBe(true);
    const fikihMeta = resolveSubjectCatalogMetadata('Fikih (MI)', 'SD/MI');
    expect(fikihMeta.isMadrasah).toBe(true);
    expect(fikihMeta.regulationNomor).toMatch(/KMA/i);
  });

  it('2. Seni Musik Fase A–C (SD/MI): terkurasi lengkap merujuk Panduan Seni Musik 2025, progresi sah, dan bebas duplikasi', () => {
    const sdPhases: Array<{ fase: 'Fase A (Kelas 1-2 SD)' | 'Fase B (Kelas 3-4 SD)' | 'Fase C (Kelas 5-6 SD)'; kelas: string }> = [
      { fase: 'Fase A (Kelas 1-2 SD)', kelas: '2' },
      { fase: 'Fase B (Kelas 3-4 SD)', kelas: '4' },
      { fase: 'Fase C (Kelas 5-6 SD)', kelas: '6' },
    ];

    for (const p of sdPhases) {
      const s1 = lookupCuratedTopicBank('Seni Musik', p.fase, p.kelas, '1 (Ganjil)', { jenjang: 'SD/MI' });
      const s2 = lookupCuratedTopicBank('Seni Musik', p.fase, p.kelas, '2 (Genap)', { jenjang: 'SD/MI' });
      expect(s1.isAvailable).toBe(true);
      expect(s2.isAvailable).toBe(true);
      expect(s1.topics.length).toBeGreaterThanOrEqual(3);
      expect(s2.topics.length).toBeGreaterThanOrEqual(3);
      expect(s1.coverageStatus).toBe('berdasarkan_contoh_panduan');
      expect(s1.statusSumberDokumen).toBe('contoh_panduan');
      expect(s1.statusReviewPedagogis).toBe('belum_ditinjau');
      expect(s1.sumberDokumen).toMatch(/Panduan Mata Pelajaran Seni Musik.*Revisi 3/i);

      for (const topic of [...s1.topics, ...s2.topics]) {
        expect(topic.elemenCP.trim().length).toBeGreaterThan(3);
        expect(topic.nomorHalamanAtauBagian).toMatch(/hlm\./i);
      }

      const titles1 = new Set(s1.topics.map((t) => t.judulTopik.toLowerCase().trim()));
      for (const t2 of s2.topics) {
        expect(titles1.has(t2.judulTopik.toLowerCase().trim())).toBe(false);
        expect(t2.judulTopik).not.toMatch(/pendalaman spiral semester genap/i);
      }
      expect(s2.topics.some((t) => Boolean(t.spiralRelation))).toBe(true);
    }

    // Validasi penuh seluruh entri bank topik (termasuk tambahan Fase A–C)
    const report = validateTopicBankEntries(ALL_CURATED_TOPIC_ENTRIES);
    expect(report.isValid).toBe(true);
    expect(report.blockingCount).toBe(0);
  });

  it('3. SMK Distinction: Seni Musik (Umum) vs Konsentrasi Keahlian Musik SMK dibedakan dan tidak mewarisi otomatis', () => {
    const smkGroups = getSelectableSubjectGroups('SMK', { madrasahMode: false });
    const umumGroup = smkGroups.find((g) => g.id === 'seni_pilihan');
    const konsentrasiGroup = smkGroups.find((g) => g.id === 'konsentrasi_smk');
    expect(umumGroup?.subjects).toContain('Seni Musik (Umum)');
    expect(konsentrasiGroup?.subjects).toContain('Konsentrasi Keahlian Seni Musik / Pertunjukan Musik (SMK)');

    // Seni Musik (Umum) di SMK Fase E mengacu Panduan Seni Musik 2025 untuk SMA/MA/SMK
    const generalSMK = lookupCuratedTopicBank(
      'Seni Musik (Umum)',
      'Fase E (Kelas 10 SMA/SMK)',
      '10',
      '1 (Ganjil)',
      { jenjang: 'SMK' }
    );
    expect(generalSMK.isAvailable).toBe(true);
    expect(generalSMK.sumberDokumen).toMatch(/BUKAN Konsentrasi Keahlian Musik SMK/i);
    expect(generalSMK.statusSumberDokumen).toBe('contoh_panduan');

    // Konsentrasi Keahlian Musik SMK / Seni Musik (SMK) wajib input CP kejuruan, tidak mewarisi bank umum!
    for (const vocationalMusic of [
      'Konsentrasi Keahlian Seni Musik / Pertunjukan Musik (SMK)',
      'Konsentrasi Keahlian Produksi & Siaran Program Musik/Audio (SMK)',
      'Seni Musik (SMK)',
    ]) {
      const vocResult = lookupCuratedTopicBank(
        vocationalMusic,
        'Fase F (Kelas 11-12 SMA/SMK)',
        '11',
        '1 (Ganjil)',
        { jenjang: 'SMK' }
      );
      expect(vocResult.isAvailable).toBe(false);
      expect(vocResult.coverageStatus).toBe('input_guru_dibutuhkan');
      expect(vocResult.topics).toEqual([]);
      expect(vocResult.emptyStateMessage).toMatch(/tidak mewarisi|berdasarkan CP/i);
    }

    // Matriks cakupan jujur membedakan keduanya
    const matrix = getTopicBankCoverageMatrix();
    const smkUmumRow = matrix.find((m) => m.key === 'seni_musik_umum_smk::SMK::Fase E');
    const smkKonsRow = matrix.find((m) => m.key === 'seni_musik_smk::SMK::Fase F');
    expect(smkUmumRow?.statusSumberDokumen).toBe('contoh_panduan');
    expect(smkKonsRow?.status).toBe('input_guru_dibutuhkan');
    expect(smkKonsRow?.statusReviewPedagogis).toBe('belum_ditinjau');
  });

  it('4. Pemisahan 2 Dimensi Verifikasi Konten: status sumber resmi terpisah dari review pedagogis & AI tidak bisa klaim ahli', () => {
    // AI / sistem tidak dapat memberi status ditinjau_ahli_mapel tanpa bukti peninjau nyata
    expect(resolveSafePedagogicalReviewStatus('ditinjau_ahli_mapel')).toBe('belum_ditinjau');
    expect(
      resolveSafePedagogicalReviewStatus('ditinjau_ahli_mapel', '', '2026-11-18')
    ).toBe('belum_ditinjau');
    expect(
      resolveSafePedagogicalReviewStatus(
        'ditinjau_ahli_mapel',
        'Dr. Praktisi Musik',
        '2026-11-18'
      )
    ).toBe('ditinjau_ahli_mapel');

    for (const entry of ALL_CURATED_TOPIC_ENTRIES) {
      expect(entry.statusReviewPedagogis).not.toBe('ditinjau_ahli_mapel');
      expect(['belum_ditinjau', 'ditinjau_guru', 'perlu_revisi']).toContain(
        entry.statusReviewPedagogis
      );
      expect([
        'dokumen_resmi_teridentifikasi',
        'teks_dokumen_terverifikasi',
        'contoh_panduan',
        'kurasi_internal',
        'input_guru',
        'usulan_ai',
        'belum_terverifikasi',
      ]).toContain(entry.statusSumberDokumen);
    }

    // Topik yang belum tersedia sumbernya tidak diklaim resmi
    const emptyPlan = getSemesterCurriculumPlan(
      'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti',
      'Fase D (Kelas 7-9 SMP)',
      '8',
      '1 (Ganjil)'
    );
    expect(emptyPlan.hasVerifiedOfficialCP).toBe(false);
    expect(emptyPlan.statusSumberDokumen).toBe('dokumen_resmi_teridentifikasi');
    expect(emptyPlan.statusReviewPedagogis).toBe('belum_ditinjau');
    expect(emptyPlan.referensiCP?.terverifikasiResmi).toBe(false);
  });

  it('5. Koreksi Guru, Integrasi CP->TP->ATP->Prota/Promes, & Non-Destructive Invalidation Guard (Task 8.2B.2 tetap utuh)', () => {
    const profile = makeProfile({ jenjang: 'SD/MI', kelasUtama: '4', mataPelajaranUtama: 'Seni Musik' });
    const sem1Bank = lookupCuratedTopicBank('Seni Musik', 'Fase B (Kelas 3-4 SD)', '4', '1 (Ganjil)', { jenjang: 'SD/MI' });
    const sem2Bank = lookupCuratedTopicBank('Seni Musik', 'Fase B (Kelas 3-4 SD)', '4', '2 (Genap)', { jenjang: 'SD/MI' });

    const savedCP = saveCPEntry(profile, {
      elemenCP: 'Mengalami',
      teksCP: 'Murid mengenali nada dan pola irama baik yang menggunakan anggota tubuh maupun alat musik.',
      asalCP: 'input_guru',
      namaDokumenSumber: 'Panduan Seni Musik 2025 hlm. 11',
      nomorDokumen: 'SK Kepala BSKAP No. 046/H/KR/2025',
      tahunVersiDokumen: '2025',
    });

    const sem1TPs: CustomTPItem[] = sem1Bank.topics.map((topic, i) =>
      buildCustomTPFromTopicEntry(topic, {
        mataPelajaran: 'Seni Musik',
        jenjangFase: 'Fase B (Kelas 3-4 SD)',
        jenjangCategory: 'SD/MI',
        cleanKelas: '4',
        semester: '1 (Ganjil)',
        nomorTP: i + 1,
        mingguMulai: i * 5 + 2,
        mingguSelesai: (i + 1) * 5 + 1,
        alokasiJP: 8,
        schoolId: profile.schoolId,
        tahunAjaran: profile.tahunAjaran,
        savedCPEntries: [savedCP],
      })
    );
    const sem2TPs: CustomTPItem[] = sem2Bank.topics.map((topic, i) =>
      buildCustomTPFromTopicEntry(topic, {
        mataPelajaran: 'Seni Musik',
        jenjangFase: 'Fase B (Kelas 3-4 SD)',
        jenjangCategory: 'SD/MI',
        cleanKelas: '4',
        semester: '2 (Genap)',
        nomorTP: i + 5,
        mingguMulai: i * 5 + 2,
        mingguSelesai: (i + 1) * 5 + 1,
        alokasiJP: 8,
        schoolId: profile.schoolId,
        tahunAjaran: profile.tahunAjaran,
        savedCPEntries: [savedCP],
      })
    );

    const allTPs = [...sem1TPs, ...sem2TPs];
    const tpById = new Map(allTPs.map((t) => [t.id, t]));
    saveCustomTPList('Seni Musik', '4', '1 (Ganjil)', sem1TPs, profile);
    saveCustomTPList('Seni Musik', '4', '2 (Genap)', sem2TPs, profile);

    const initPlan = initializeOrSyncPhaseATPPlan(profile, allTPs, [savedCP]);
    const approveRes = approvePhaseATPPlan({
      profile,
      plan: initPlan,
      orderedTpIds: initPlan.orderedTpIds,
      tpById,
      savedCPs: [savedCP],
    });
    expect(approveRes.ok).toBe(true);
    expect(approveRes.updatedPlan.statusPenyusunan).toBe('disetujui');

    // Guru menyimpan koreksi lokal pada salah satu topik bank topik
    const targetTopic = sem1Bank.topics[0];
    const originalTitleSnapshot = targetTopic.judulTopik;
    const savedAdj = saveTopicAdjustment(
      profile,
      {
        topicId: targetTopic.topicId,
        originalTitle: targetTopic.judulTopik,
        proposedTitle: 'Mengenali Nada Solmisasi & Lagu Daerah Jawa Tengah (Disesuaikan SD Lokal)',
        proposedLingkupMateri: 'Solmisasi do–sol & ketukan ritmis alat perkusi bambu',
        cpAlignmentNote: 'Selaras dengan CP Elemen Mengalami Fase B hlm. 11',
        pedagogicalReviewStatus: 'ditinjau_guru' as TopicPedagogicalReviewStatus,
      },
      'Fase B (Kelas 3-4 SD)'
    );
    expect(savedAdj.pedagogicalReviewStatus).toBe('ditinjau_guru');

    // Bank topik global TIDAK berubah
    expect(getTopicById(targetTopic.topicId)?.judulTopik).toBe(originalTitleSnapshot);

    // TP yang sudah dibuat guru TIDAK ditimpa
    expect(sem1TPs[0].materiPokok).toBe(originalTitleSnapshot);
    expect(sem1TPs[0].sourceTopicId).toBe(targetTopic.topicId);
    expect(sem1TPs[0].referensiCP?.cpEntryId).toBe(savedCP.id);

    // ATP yang sudah disetujui TIDAK batal hanya karena catatan topik lokal,
    // tetapi akan tetap terinvalidasi jika isi TP itu sendiri diubah substansial (Task 8.2B.2)
    const afterAdjEval = invalidatePhaseATPApprovalIfChanged({
      profile,
      plan: approveRes.updatedPlan,
      orderedTpIds: approveRes.updatedPlan.orderedTpIds,
      tpById,
      savedCPs: [savedCP],
    });
    expect(afterAdjEval.invalidated).toBe(false);

    const modifiedTpById = new Map(tpById);
    modifiedTpById.set(sem1TPs[0].id, {
      ...sem1TPs[0],
      tujuanPembelajaran: 'Tujuan berubah total untuk menguji invalidasi persetujuan ATP.',
    });
    const afterSubstantiveTpEdit = invalidatePhaseATPApprovalIfChanged({
      profile,
      plan: approveRes.updatedPlan,
      orderedTpIds: approveRes.updatedPlan.orderedTpIds,
      tpById: modifiedTpById,
      savedCPs: [savedCP],
    });
    expect(afterSubstantiveTpEdit.invalidated).toBe(true);

    // Prota & Promes membaca pemetaan TP dengan tepat
    const prota = buildSmartProta(profile, sem1TPs);
    const promes = buildSmartPromes(profile, sem1TPs);
    expect(prota.itemsSemester1.length).toBeGreaterThanOrEqual(3);
    expect(promes.rows.length).toBeGreaterThanOrEqual(3);

    // Local view dengan penyesuaian guru aktif
    const adjustedView = applyTeacherAdjustmentsToTopicList(
      sem1Bank.topics,
      getTopicAdjustmentsForScope(profile, 'Fase B (Kelas 3-4 SD)')
    );
    expect(adjustedView[0].judulTopik).toContain('Disesuaikan SD Lokal');
    expect(adjustedView[0].hasTeacherAdjustment).toBe(true);
  });

  it('6. Backward Compatibility, Backup/Restore, Cloud Sync 3-Way Merge, Idempoten, & Render SSR UI Baru', () => {
    expect(V2_BACKUP_STORAGE_PREFIXES).toContain(TOPIC_ADJUSTMENT_STORAGE_V2_KEY);

    // ID lama Task 8.3C tetap ada di bank
    expect(getTopicById('musik-fa-s1-kenal-bunyi-ketukan')).toBeDefined();
    expect(getTopicById('musik-fb-s1-notasi-ritmis-melodis-dasar')).toBeDefined();
    expect(getTopicById('musik-fd-s2-kreasi-aransemen-vokal-group')).toBeDefined();

    const profile = makeProfile({ jenjang: 'SD/MI', kelasUtama: '2', mataPelajaranUtama: 'Seni Musik' });
    // Simpan koreksi berkali-kali -> idempoten, tidak menduplikasi
    saveTopicAdjustment(
      profile,
      {
        topicId: 'musik-fa-s1-kenal-bunyi-ketukan',
        originalTitle: 'Judul Lama',
        proposedTitle: 'Judul Penyesuaian V1',
        pedagogicalReviewStatus: 'ditinjau_guru',
      },
      'Fase A (Kelas 1-2 SD)'
    );
    saveTopicAdjustment(
      profile,
      {
        topicId: 'musik-fa-s1-kenal-bunyi-ketukan',
        originalTitle: 'Judul Lama',
        proposedTitle: 'Judul Penyesuaian Final',
        cpAlignmentNote: 'Terverifikasi kesesuaiannya dengan lagu daerah sekitar.',
        pedagogicalReviewStatus: 'ditinjau_guru',
      },
      'Fase A (Kelas 1-2 SD)'
    );
    const allForScope = Object.values(getTopicAdjustmentsForScope(profile, 'Fase A (Kelas 1-2 SD)'));
    expect(allForScope.length).toBe(1);
    expect(allForScope[0].proposedTitle).toBe('Judul Penyesuaian Final');

    // Backup/Restore JSON mempertahankan koreksi guru
    const rawAdjStoreBefore = JSON.parse(
      globalThis.localStorage.getItem(TOPIC_ADJUSTMENT_STORAGE_V2_KEY) || '{}'
    );
    const backupJson = exportBackupDataJson();
    expect(backupJson).toContain(TOPIC_ADJUSTMENT_STORAGE_V2_KEY);
    globalThis.localStorage.clear();
    const restoreRes = importBackupDataJson(backupJson);
    expect(restoreRes.success).toBe(true);
    const restoredAdj = getTopicAdjustment(profile, 'musik-fa-s1-kenal-bunyi-ketukan', 'Fase A (Kelas 1-2 SD)');
    expect(restoredAdj?.proposedTitle).toBe('Judul Penyesuaian Final');

    // Cloud Sync 3-way merge mempertahankan koreksi topik berbeda dari dua perangkat
    const deviceBAdjKey = 'sch_test__b';
    const mergeRes = analyzeWorkspaceConflict(
      { [TOPIC_ADJUSTMENT_STORAGE_V2_KEY]: {} },
      { [TOPIC_ADJUSTMENT_STORAGE_V2_KEY]: rawAdjStoreBefore },
      {
        [TOPIC_ADJUSTMENT_STORAGE_V2_KEY]: {
          [deviceBAdjKey]: {
            id: deviceBAdjKey,
            scopeKey: 'other_scope',
            topicId: 'musik-fb-s1-notasi-ritmis-melodis-dasar',
            proposedTitle: 'Judul Perangkat B',
          },
        },
      }
    );
    const mergedAdjMap = mergeRes.mergedEntries[TOPIC_ADJUSTMENT_STORAGE_V2_KEY] as Record<string, unknown>;
    expect(Object.keys(mergedAdjMap)).toContain(allForScope[0].id);
    expect(Object.keys(mergedAdjMap)).toContain(deviceBAdjKey);

    removeTopicAdjustment(profile, 'musik-fa-s1-kenal-bunyi-ketukan', 'Fase A (Kelas 1-2 SD)');
    expect(getTopicAdjustment(profile, 'musik-fa-s1-kenal-bunyi-ketukan', 'Fase A (Kelas 1-2 SD)')).toBeNull();

    // Render SSR ClassSetupStepView & TopicBankBrowserPanel (termasuk Kepercayaan, SMK Konsentrasi, & Seni Musik SD)
    const setupHtml = renderToStaticMarkup(
      React.createElement(ClassSetupStepView, {
        schoolProfile: makeProfile({
          jenjang: 'SMK',
          kelasUtama: '11',
          mataPelajaranUtama: 'Konsentrasi Keahlian Seni Musik / Pertunjukan Musik (SMK)',
        }),
        updateAndPersistProfile: () => {},
        onOpenSchoolModal: () => {},
        onConfirmClassSetup: () => {},
        onToast: () => {},
      })
    );
    expect(setupHtml).toContain('Seni Musik (Umum)');
    expect(setupHtml).toContain('Konsentrasi Keahlian Seni Musik / Pertunjukan Musik (SMK)');
    expect(setupHtml).toContain('Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti');
    expect(setupHtml).toContain('Pendidikan Agama Kristen dan Budi Pekerti');

    const panelHtml = renderToStaticMarkup(
      React.createElement(TopicBankBrowserPanel, {
        schoolProfile: profile,
        currentFase: 'Fase A (Kelas 1-2 SD)',
        tpList: [],
        savedCPEntries: [],
        onOpenCPPanel: () => {},
        onAddNewTP: () => {},
        onAddTopicDraftAsTP: () => {},
        onReturnToSubjectSelector: () => {},
      })
    );
    expect(panelHtml).toContain('Koreksi / Sesuaikan Topik');
    expect(panelHtml).toContain('Lihat Status Sumber &amp; Verifikasi');
    expect(panelHtml).toContain('Kembali ke Pilihan Mata Pelajaran');
    expect(panelHtml).toContain('Belum Ditinjau Pedagogis');
  });
});
