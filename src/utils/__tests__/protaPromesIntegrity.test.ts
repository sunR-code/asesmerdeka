import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import JSZip from 'jszip';
import { Packer } from 'docx';

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
  saveSchoolProfile,
  saveCustomTPList,
  getSavedCustomTPList,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { getSemesterCurriculumPlan } from '../kurikulumCatalog';
import {
  buildSmartProta,
  buildSmartPromes,
} from '../perangkatAjarEngine';
import {
  getAcademicCalendarForContext,
  saveAcademicCalendar,
  generateSemesterWeekColumns,
  savePromesManualOverrides,
} from '../academicCalendarStorage';
import {
  getSubjectJPConfig,
  saveSubjectJPConfig,
  resolveDefaultSubjectJPConfig,
} from '../jpConfigStorage';
import {
  buildProtaElements,
  buildPromesElements,
} from '../docx/docxPerangkatAjar';
import { createStyledDocxDocument } from '../docx/docxShared';
import {
  CURRENT_SCHEDULE_MIGRATION_VERSION,
  LEGACY_BACKUP_STORAGE_KEY,
  runNonDestructiveStorageMigration,
  SCHEDULE_MIGRATION_VERSION_KEY,
  STORAGE_MIGRATION_VERSION_KEY,
} from '../storageMigration';
import {
  buildModulAjarDraftStorageKey,
  createImmutableDefaultTPId,
} from '../storageIdentity';
import { ProtaSubTab } from '../../components/hub/ProtaSubTab';
import { PromesSubTab } from '../../components/hub/PromesSubTab';
import { AcademicScheduleConfigPanel } from '../../components/hub/AcademicScheduleConfigPanel';

function makeTestProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_uji_task4_a',
    instansiDinas: 'Dinas Pendidikan Kabupaten Sleman',
    namaSekolah: 'SMP Negeri 4 Sleman',
    alamatSekolah: 'Jl. Magelang Km 10',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    daftarRombel: ['VIII A', 'VIII B'],
    mataPelajaranUtama: 'Matematika',
    namaGuru: 'Ibu Sari Rahayu, S.Pd.',
    nipGuru: '198605142010012011',
    namaKepalaSekolah: 'Drs. Bambang Sutrisno',
    nipKepalaSekolah: '196903121995121002',
    kotaSekolah: 'Sleman',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

async function extractDocxXmlFromBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('word/document.xml tidak ditemukan');
  return docFile.async('string');
}

describe('Task 4 — Prota & Promes Integrity, School Calendar & JP Config', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1-3. Prota mengambil TP Sem 1 & Sem 2 secara independen, membaca editan semester non-aktif, dan tidak menduplikasi TP Sem 2 ke Sem 1', () => {
    const sem1Profile = makeTestProfile({ semester: '1 (Ganjil)' });
    saveSchoolProfile(sem1Profile);

    const sem1Custom: CustomTPItem[] = [
      {
        id: 'tpid_sem1_custom_1',
        kode: '8.1',
        elemen: 'Aljabar',
        materiPokok: 'Persamaan Garis Lurus Khusus Sem 1',
        tujuanPembelajaran: 'Siswa memodelkan gradien dan persamaan garis pada koordinat.',
        arahanRangkuman: 'Gradien & PGL.',
        alokasiJP: 15,
        mingguMulai: 2,
        mingguSelesai: 6,
      },
      {
        id: 'tpid_sem1_custom_2',
        kode: '8.2',
        elemen: 'Bilangan',
        materiPokok: 'Pola Barisan Bilangan Khusus Sem 1',
        tujuanPembelajaran: 'Siswa menentukan suku ke-n dari pola bilangan kontekstual.',
        arahanRangkuman: 'Pola bilangan.',
        alokasiJP: 10,
        mingguMulai: 7,
        mingguSelesai: 10,
      },
    ];

    const sem2Custom: CustomTPItem[] = [
      {
        id: 'tpid_sem2_custom_1',
        kode: '8.5',
        elemen: 'Geometri',
        materiPokok: 'Bangun Ruang Sisi Datar Khusus Sem 2',
        tujuanPembelajaran: 'Siswa menghitung luas permukaan dan volume prisma serta limas.',
        arahanRangkuman: 'Prisma & Limas.',
        alokasiJP: 20,
        mingguMulai: 2,
        mingguSelesai: 7,
      },
    ];

    saveCustomTPList('Matematika', '8', '1 (Ganjil)', sem1Custom, sem1Profile);
    saveCustomTPList('Matematika', '8', '2 (Genap)', sem2Custom, sem1Profile);

    // Skenario A: Saat guru aktif di Semester 2 (Genap), Prota TETAP mengambil TP Sem 1 tersimpan di bagian Semester 1!
    const sem2ActiveProfile = makeTestProfile({ semester: '2 (Genap)' });
    const protaWhenSem2Active = buildSmartProta(sem2ActiveProfile, sem2Custom);

    expect(protaWhenSem2Active.itemsSemester1).toHaveLength(2);
    expect(protaWhenSem2Active.itemsSemester1[0].lingkupMateri).toBe('Persamaan Garis Lurus Khusus Sem 1');
    expect(protaWhenSem2Active.itemsSemester1[1].lingkupMateri).toBe('Pola Barisan Bilangan Khusus Sem 1');

    expect(protaWhenSem2Active.itemsSemester2).toHaveLength(1);
    expect(protaWhenSem2Active.itemsSemester2[0].lingkupMateri).toBe('Bangun Ruang Sisi Datar Khusus Sem 2');

    // Tidak boleh ada topik Sem 2 masuk ke Sem 1
    expect(
      protaWhenSem2Active.itemsSemester1.some((i) =>
        i.lingkupMateri.includes('Bangun Ruang Sisi Datar Khusus Sem 2')
      )
    ).toBe(false);

    // Skenario B: Saat guru aktif di Semester 1, editan tersimpan Semester 2 tetap terbaca!
    const protaWhenSem1Active = buildSmartProta(sem1Profile, sem1Custom);
    expect(protaWhenSem1Active.itemsSemester2[0].lingkupMateri).toBe(
      'Bangun Ruang Sisi Datar Khusus Sem 2'
    );
    expect(protaWhenSem1Active.sumberSemester1).toBe('saved');
    expect(protaWhenSem1Active.sumberSemester2).toBe('saved');

    // Total JP tahunan akurat: (15 + 10) + 20 = 45
    expect(protaWhenSem2Active.totalJPSemester1).toBe(25);
    expect(protaWhenSem2Active.totalJPSemester2).toBe(20);
    expect(protaWhenSem2Active.totalJPTahunan).toBe(45);
  });

  it('4-5. Semester 2 progresif (tidak menduplikasi Sem 1), sementara topik spiral terdokumentasi menampilkan progres kompetensi + total JP & minggu efektif tahunan akurat', () => {
    const profile = makeTestProfile({ semester: '1 (Ganjil)' });
    const sem1TP = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList;
    const sem2TP = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '2 (Genap)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList;

    // Task 8.3C: rencana default Sem 2 tidak boleh sekadar mengulang topik Sem 1 dengan akhiran spiral palsu
    const sem1Titles = new Set(sem1TP.map((t) => t.materiPokok.toLowerCase().trim()));
    expect(sem2TP.some((t) => !sem1Titles.has(t.materiPokok.toLowerCase().trim()))).toBe(true);

    // Uji skenario topik spiral yang SAH dan terdokumentasi di Semester 2 (berisi progres kompetensi nyata)
    const documentedSpiralSem2: CustomTPItem[] = [
      {
        ...sem2TP[0],
        materiPokok: sem1TP[0].materiPokok,
        tujuanPembelajaran:
          'Mengaplikasikan SPLDV bersama grafik fungsi linear untuk memodelkan titik impas dan optimasi multi-kendala.',
        spiralRelation: {
          previousTopicId: sem1TP[0].id,
          reactivatedConcept: 'Pemodelan dua variabel SPLDV',
          newCompetency: 'Integrasi titik potong grafik linear dengan interpretasi optimasi biaya',
          depthDifference: 'Dari penyelesaian aljabar dasar menuju transfer lintas-konteks multi-kendala',
          newContextOrApplication: 'Analisis titik impas dan pergeseran grafik fungsi',
          pedagogicalReason: 'Konsep SPLDV Sem 1 diperluas ke pemodelan grafik fungsi di Sem 2.',
        },
      },
      ...sem2TP.slice(1),
    ];

    const prota = buildSmartProta(profile, sem1TP, {
      tpListSem1: sem1TP,
      tpListSem2: documentedSpiralSem2,
    });

    const spiralItems = prota.itemsSemester2.filter((it) => Boolean(it.progresSpiral));
    expect(spiralItems.length).toBeGreaterThanOrEqual(1);
    expect(spiralItems[0].lingkupMateri).toBe(sem1TP[0].materiPokok);
    expect(spiralItems[0].keterangan).toMatch(/Spiral/i);

    expect(prota.totalJPTahunan).toBe(prota.totalJPSemester1 + prota.totalJPSemester2);
    expect(prota.mingguEfektifSemester1).toBeGreaterThan(10);
    expect(prota.mingguEfektifSemester2).toBeGreaterThan(10);
    expect(prota.mingguEfektifTahunan).toBe(
      (prota.mingguEfektifSemester1 || 0) + (prota.mingguEfektifSemester2 || 0)
    );
  });

  it('6-7. Kalender Sem 1 & 2 independen, tidak hardcode Idul Fitri April M2, dan minggu libur tidak pernah menerima alokasi JP', () => {
    const profileSem2 = makeTestProfile({ semester: '2 (Genap)' });
    const defaultSem2 = getAcademicCalendarForContext(profileSem2, '2 (Genap)');

    // Status awal belum dikonfirmasi dan tidak ada Idul Fitri hardcoded di April M2
    expect(defaultSem2.statusKonfirmasi).toBe('template_belum_dikonfirmasi');
    expect(defaultSem2.liburNasionalKeagamaan).toHaveLength(0);

    const colsDefaultSem2 = generateSemesterWeekColumns(defaultSem2, 5);
    const aprilColsDefault = colsDefaultSem2.filter((c) => c.bulanNama === 'April');
    expect(aprilColsDefault[1]?.labelKegiatan || '').not.toMatch(/Idul Fitri/i);

    // Tambahkan Libur Idul Fitri sesuai tahun berjalan di Maret (misal 15-26 Maret 2027)
    const updatedSem2 = saveAcademicCalendar(
      profileSem2,
      {
        ...defaultSem2,
        liburNasionalKeagamaan: [
          {
            id: 'hol_fitri_2027',
            nama: 'Libur Hari Raya Idul Fitri',
            startDate: '2027-03-15',
            endDate: '2027-03-26',
            kategori: 'libur_nasional',
            blokirPembelajaran: true,
          },
        ],
      },
      true
    );

    // Kalender Sem 1 tetap independen (belum dikonfirmasi & tidak ikut terisi event Sem 2)
    const sem1Check = getAcademicCalendarForContext(profileSem2, '1 (Ganjil)');
    expect(sem1Check.statusKonfirmasi).toBe('template_belum_dikonfirmasi');
    expect(sem1Check.liburNasionalKeagamaan).toHaveLength(0);

    // Buat TP dengan rentang meliputi minggu libur Maret tersebut, + manual override iseng ke minggu libur
    const tp: CustomTPItem = {
      id: 'tpid_holiday_check',
      kode: '8.6',
      elemen: 'Aljabar',
      materiPokok: 'Fungsi Linear',
      tujuanPembelajaran: 'Memahami gradien dan grafik fungsi linear.',
      arahanRangkuman: 'Fungsi linear.',
      alokasiJP: 15,
      mingguMulai: 1,
      mingguSelesai: 24,
    };

    const promes = buildSmartPromes(profileSem2, [tp], { calendar: updatedSem2 });
    const holidayCols = promes.columns
      .map((col, idx) => ({ col, idx }))
      .filter(({ col }) => !col.isEfektif);

    expect(
      holidayCols.some(({ col }) => /Idul Fitri/i.test(col.labelKegiatan || ''))
    ).toBe(true);

    // Pastikan TIDAK ADA satupun JP ditempatkan pada minggu non-efektif / libur
    for (const { idx } of holidayCols) {
      expect(promes.rows[0].distribusiJP[idx] || 0).toBe(0);
    }

    // Uji pula manual override yang mencoba mengisi minggu libur -> wajib diblokir dan diberi peringatan
    const holidayWeekKey = holidayCols[0].col.weekKey!;
    savePromesManualOverrides(profileSem2, {
      [tp.id]: {
        [holidayWeekKey]: 5,
      },
    });
    const promesWithInvalidManual = buildSmartPromes(profileSem2, [tp], { calendar: updatedSem2 });
    expect(promesWithInvalidManual.rows[0].distribusiJP[holidayCols[0].idx] || 0).toBe(0);
    expect(
      promesWithInvalidManual.validationIssues?.some((v) => v.kode === 'KONFLIK_LIBUR_MANUAL')
    ).toBe(true);
  });

  it('8. Alokasi JP per minggu berbeda antar mata pelajaran dan sumber estimasi jujur hingga dikonfirmasi guru', () => {
    const mathSMP = resolveDefaultSubjectJPConfig(makeTestProfile({ mataPelajaranUtama: 'Matematika' }));
    const pknSMP = resolveDefaultSubjectJPConfig(makeTestProfile({ mataPelajaranUtama: 'Pendidikan Pancasila' }));
    const bindoSMP = resolveDefaultSubjectJPConfig(makeTestProfile({ mataPelajaranUtama: 'Bahasa Indonesia' }));
    const fikihMTs = resolveDefaultSubjectJPConfig(makeTestProfile({ mataPelajaranUtama: 'Fikih (MTs)' }));
    const unknownMapel = resolveDefaultSubjectJPConfig(makeTestProfile({ mataPelajaranUtama: 'Bahasa Daerah Kustom XYZ' }));

    expect(mathSMP.jpPerMinggu).toBe(5);
    expect(bindoSMP.jpPerMinggu).toBe(6);
    expect(pknSMP.jpPerMinggu).toBe(2);
    expect(fikihMTs.jpPerMinggu).toBe(2);
    expect(mathSMP.durasiJPMinut).toBe(40);
    expect(pknSMP.jpPerMinggu).not.toBe(4);
    expect(mathSMP.statusKonfirmasi).toBe('estimasi_belum_dikonfirmasi');

    expect(unknownMapel.tersediaDiKatalogDefault).toBe(false);
    expect(unknownMapel.sumberReferensi).toMatch(/wajib diisi/i);

    // Konfirmasi guru
    const saved = saveSubjectJPConfig(
      makeTestProfile({ mataPelajaranUtama: 'Fikih (MTs)' }),
      { jpPerMinggu: 3, durasiJPMinut: 40, pertemuanPerMinggu: 2 },
      true
    );
    expect(saved.statusKonfirmasi).toBe('dikonfirmasi_sekolah');
    expect(getSubjectJPConfig(makeTestProfile({ mataPelajaranUtama: 'Fikih (MTs)' })).jpPerMinggu).toBe(3);
  });

  it('9-11. Promes menghormati mingguMulai–mingguSelesai, mendeteksi overflow alokasi, defisit kapasitas, dan surplus tanpa membuang JP diam-diam', () => {
    const profile = makeTestProfile({ semester: '1 (Ganjil)' });
    const jpCfg = saveSubjectJPConfig(profile, { jpPerMinggu: 4, durasiJPMinut: 40, pertemuanPerMinggu: 2 }, true);
    const cal = getAcademicCalendarForContext(profile, '1 (Ganjil)');

    // Skenario 1: Rentang ketat mingguMulai=5, mingguSelesai=7 (maks 3 minggu = 12 JP), tetapi TP butuh 20 JP
    const tpWindowOverflow: CustomTPItem = {
      id: 'tpid_window_strict',
      kode: '8.1',
      elemen: 'Aljabar',
      materiPokok: 'SPLDV Rentang Ketat',
      tujuanPembelajaran: 'Memodelkan dan menyelesaikan SPLDV.',
      arahanRangkuman: 'SPLDV',
      alokasiJP: 20,
      mingguMulai: 5,
      mingguSelesai: 7,
    };

    const promesStrict = buildSmartPromes(profile, [tpWindowOverflow], {
      calendar: cal,
      jpConfig: jpCfg,
    });
    const row = promesStrict.rows[0];
    // Tidak ada distribusi di luar minggu ke 5..7
    Object.keys(row.distribusiJP).forEach((cIdxStr) => {
      const col = promesStrict.columns[Number(cIdxStr)];
      const wk = col.semesterWeekNumber ?? Number(cIdxStr) + 1;
      expect(wk).toBeGreaterThanOrEqual(5);
      expect(wk).toBeLessThanOrEqual(7);
      expect(col.isEfektif).toBe(true);
    });
    // Tidak membuang sisa JP diam-diam: jpTerjadwal + jpBelumTerjadwal === alokasiJP
    expect(row.jpTerjadwal).toBeLessThanOrEqual(12);
    expect((row.jpTerjadwal || 0) + (row.jpBelumTerjadwal || 0)).toBe(20);
    expect(promesStrict.totalJPTerjadwal).toBe(row.jpTerjadwal);
    expect(promesStrict.totalJPBelumTerjadwal).toBe(row.jpBelumTerjadwal);
    expect(
      promesStrict.validationIssues?.some((v) => v.kode === 'OVERFLOW_RENTANG_TP')
    ).toBe(true);
    // Karena kapasitas total semester (~76 JP) > kebutuhan TP (20 JP), SURPLUS_KAPASITAS juga terdeteksi!
    expect(promesStrict.surplusJP).toBeGreaterThan(0);
    expect(
      promesStrict.validationIssues?.some((v) => v.kode === 'SURPLUS_KAPASITAS')
    ).toBe(true);

    // Skenario 2: Defisit semester menyeluruh (alokasi TP = 140 JP > kapasitas semester ~76 JP)
    const tpSemesterDeficit: CustomTPItem = {
      id: 'tpid_sem_deficit',
      kode: '8.2',
      elemen: 'Geometri',
      materiPokok: 'Pythagoras Intensif',
      tujuanPembelajaran: 'Pembuktian dan aplikasi Pythagoras.',
      arahanRangkuman: 'Pythagoras',
      alokasiJP: 140,
      mingguMulai: 1,
      mingguSelesai: 26,
    };
    const promesDeficit = buildSmartPromes(profile, [tpSemesterDeficit], {
      calendar: cal,
      jpConfig: jpCfg,
    });
    expect(promesDeficit.defisitJP).toBeGreaterThan(0);
    expect(
      promesDeficit.validationIssues?.some((v) => v.kode === 'OVERFLOW_ALOKASI')
    ).toBe(true);
    expect(
      promesDeficit.validationIssues?.some((v) => v.kode === 'DEFISIT_KAPASITAS')
    ).toBe(true);
  });

  it('12. Perhitungan preview, model engine, dan ekspor DOCX Prota + Promes konsisten & bebas columnSpan rusak', async () => {
    const profile = makeTestProfile({ semester: '1 (Ganjil)' });
    const sem1TP = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList;

    const prota = buildSmartProta(profile, sem1TP);
    const promes = buildSmartPromes(profile, sem1TP);

    // Cek kesamaan sum cell vs totalJPTerjadwal vs totalJPEfektif
    const sumCells = promes.rows.reduce(
      (acc, r) => acc + Object.values(r.distribusiJP).reduce((a, b) => a + b, 0),
      0
    );
    expect(promes.totalJPTerjadwal).toBe(sumCells);
    expect(promes.totalJPEfektif).toBe(sumCells);

    // Cek Prota DOCX & XML
    const protaElements = buildProtaElements(prota, profile);
    const protaDocx = createStyledDocxDocument(profile, 'Prota', protaElements);
    const protaBlob = await Packer.toBlob(protaDocx);
    const protaXml = await extractDocxXmlFromBlob(protaBlob);
    expect(protaXml).toContain('PROGRAM TAHUNAN (PROTA)');
    expect(protaXml).toContain(`Sem 1: ${prota.totalJPSemester1} JP`);
    expect(protaXml).toContain(`Sem 2: ${prota.totalJPSemester2} JP`);
    expect(protaXml).toContain(`${prota.totalJPTahunan} JAM PELAJARAN`);
    expect(protaXml).toContain('w:gridSpan w:val="4"');

    // Cek Promes DOCX & XML
    const promesElements = buildPromesElements(promes, profile);
    const promesDocx = createStyledDocxDocument(profile, 'Promes', promesElements, { landscape: true });
    const promesBlob = await Packer.toBlob(promesDocx);
    const promesXml = await extractDocxXmlFromBlob(promesBlob);
    expect(promesXml).toContain('PROGRAM SEMESTER (PROMES)');
    expect(promesXml).toContain(`Terjadwal: ${sumCells} JP`);
    expect(promesXml).toContain('TOTAL JP TERJADWAL PER MINGGU:');
    expect(promesXml).toContain('Rincian Agenda Kalender Sekolah:');

    // Cek Preview SSR mengandung total yang sama
    const html = renderToStaticMarkup(
      React.createElement(PromesSubTab, {
        tpList: sem1TP,
        schoolProfile: profile,
        onToast: () => {},
      })
    );
    expect(html).toContain(`${sumCells} JP Terjadwal`);
  });

  it('13-14. Migrasi data lama menjaga TP Sem 1/Sem 2 tanpa konflik ID & konfigurasi kalender terisolasi antarsekolah dan tahun ajaran', () => {
    const legacyCustomMap = {
      'matematika__kls_8__sem_1': [
        {
          id: 'tp-8-1',
          kode: '8.1',
          elemen: 'Aljabar',
          materiPokok: 'SPLDV Legacy Sem 1',
          tujuanPembelajaran: 'Tujuan legacy Sem 1 dipertahankan.',
          arahanRangkuman: 'SPLDV',
          alokasiJP: 12,
          mingguMulai: 1,
          mingguSelesai: 4,
        },
      ],
      'matematika__kls_8__sem_2': [
        {
          id: 'tp-8-5',
          kode: '8.5',
          elemen: 'Geometri',
          materiPokok: 'Bangun Ruang Legacy Sem 2',
          tujuanPembelajaran: 'Tujuan legacy Sem 2 dipertahankan.',
          arahanRangkuman: 'Bangun ruang',
          alokasiJP: 16,
          mingguMulai: 2,
          mingguSelesai: 6,
        },
      ],
    };
    localStorage.setItem('asesmerdeka_custom_tp_map_v1', JSON.stringify(legacyCustomMap));
    const prof = makeTestProfile({ schoolId: 'sch_migrasi_t4' });
    saveSchoolProfile(prof);

    runNonDestructiveStorageMigration(prof);

    const migratedSem1 = getSavedCustomTPList('Matematika', '8', '1 (Ganjil)', prof);
    const migratedSem2 = getSavedCustomTPList('Matematika', '8', '2 (Genap)', prof);
    expect(migratedSem1?.[0].materiPokok).toBe('SPLDV Legacy Sem 1');
    expect(migratedSem2?.[0].materiPokok).toBe('Bangun Ruang Legacy Sem 2');
    expect(migratedSem1?.[0].id).toMatch(/^tpid_/);
    expect(migratedSem2?.[0].id).toMatch(/^tpid_/);
    expect(migratedSem1?.[0].id).not.toBe(migratedSem2?.[0].id);

    // Isolasi kalender antar sekolah & tahun ajaran
    const schoolA = makeTestProfile({ schoolId: 'sch_alpha', tahunAjaran: '2026/2027' });
    const schoolB = makeTestProfile({ schoolId: 'sch_beta', tahunAjaran: '2026/2027' });
    const schoolANextYear = makeTestProfile({ schoolId: 'sch_alpha', tahunAjaran: '2027/2028' });

    const calA = getAcademicCalendarForContext(schoolA, '1 (Ganjil)');
    saveAcademicCalendar(
      schoolA,
      {
        ...calA,
        liburSekolah: [
          ...calA.liburSekolah,
          {
            id: 'milad_a',
            nama: 'Milad Sekolah Alpha',
            startDate: '2026-10-05',
            endDate: '2026-10-09',
            kategori: 'libur_sekolah',
            blokirPembelajaran: true,
          },
        ],
      },
      true
    );

    const calB = getAcademicCalendarForContext(schoolB, '1 (Ganjil)');
    const calANext = getAcademicCalendarForContext(schoolANextYear, '1 (Ganjil)');
    expect(calB.statusKonfirmasi).toBe('template_belum_dikonfirmasi');
    expect(calB.liburSekolah.some((e) => e.id === 'milad_a')).toBe(false);
    expect(calANext.liburSekolah.some((e) => e.id === 'milad_a')).toBe(false);
  });

  it('15. UI ProtaSubTab, PromesSubTab & AcademicScheduleConfigPanel menyediakan kontrol kalender, JP mapel, indikator kapasitas, peringatan, dan mode manual', () => {
    const profile = makeTestProfile({ semester: '1 (Ganjil)' });
    const sem1TP = getSemesterCurriculumPlan('Matematika', 'Fase D (Kelas 7-9 SMP)', '8', '1 (Ganjil)', {
      schoolId: profile.schoolId,
      tahunAjaran: profile.tahunAjaran,
    }).tpList.map((tp, idx) =>
      idx === 0 ? { ...tp, alokasiJP: 45, mingguMulai: 2, mingguSelesai: 4 } : tp
    );

    render(
      React.createElement(PromesSubTab, {
        tpList: sem1TP,
        schoolProfile: profile,
        onToast: () => {},
      })
    );

    expect(screen.getByText(/Kapasitas Minggu Efektif vs Kebutuhan TP/i)).toBeTruthy();
    expect(screen.getByText(/Atur Kalender & JP/i)).toBeTruthy();
    expect(screen.getByText(/Sesuaikan Manual/i)).toBeTruthy();
    expect(screen.getByText(/melebihi kapasitas|hanya memuat maksimal|Defisit/i)).toBeTruthy();

    const panelHtml = renderToStaticMarkup(
      React.createElement(AcademicScheduleConfigPanel, {
        schoolProfile: profile,
        tpList: sem1TP,
        onScheduleChanged: () => {},
        onToast: () => {},
      })
    );
    expect(panelHtml).toContain('Kalender Sekolah');
    expect(panelHtml).toContain('Alokasi JP Mapel');
    expect(panelHtml).toContain('Simpan &amp; Konfirmasi Kalender Sekolah');
    expect(panelHtml).toContain('klik untuk ubah manual');

    const protaHtml = renderToStaticMarkup(
      React.createElement(ProtaSubTab, {
        tpList: sem1TP,
        schoolProfile: profile,
        onToast: () => {},
      })
    );
    expect(protaHtml).toContain('Program Tahunan (Prota)');
    expect(protaHtml).toContain('Total Tahunan');
    expect(protaHtml).toContain('Atur Kalender &amp; JP');
  });

  it('16. [Task 4.1] Migration compatibility v1 -> Task 4 idempoten, menjaga backup, tpid_*, dan editan Ganjil/Genap tanpa orphan', () => {
    const profSem1 = makeTestProfile({ schoolId: 'sch_upgrade_v1', semester: '1 (Ganjil)' });
    const profSem2 = makeTestProfile({ schoolId: 'sch_upgrade_v1', semester: '2 (Genap)' });

    const tpidSem1 = createImmutableDefaultTPId({
      schoolId: profSem1.schoolId,
      tahunAjaran: profSem1.tahunAjaran,
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      semester: '1 (Ganjil)',
      mataPelajaran: 'Matematika',
      topicKey: '8.1|SPLDV Editan Guru Sem 1',
    });
    const tpidSem2 = createImmutableDefaultTPId({
      schoolId: profSem2.schoolId,
      tahunAjaran: profSem2.tahunAjaran,
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      semester: '2 (Genap)',
      mataPelajaran: 'Matematika',
      topicKey: '8.5|Pythagoras Editan Guru Sem 2',
    });

    const editedTP1: CustomTPItem = {
      id: tpidSem1,
      kode: '8.1',
      elemen: 'Aljabar',
      materiPokok: 'SPLDV Editan Guru Sem 1',
      tujuanPembelajaran: 'Kalimat TP Sem 1 sudah disunting guru pada Task 3.',
      arahanRangkuman: 'SPLDV',
      alokasiJP: 18,
    };
    const editedTP2: CustomTPItem = {
      id: tpidSem2,
      kode: '8.5',
      elemen: 'Geometri',
      materiPokok: 'Pythagoras Editan Guru Sem 2',
      tujuanPembelajaran: 'Kalimat TP Sem 2 sudah disunting guru pada Task 3.',
      arahanRangkuman: 'Pythagoras',
      alokasiJP: 22,
    };

    // Simulasikan pengguna Task 3 yang sudah memiliki STORAGE_MIGRATION_VERSION_KEY === '1'
    saveSchoolProfile(profSem1);
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [editedTP1], profSem1);
    saveCustomTPList('Matematika', '8', '2 (Genap)', [editedTP2], profSem2);
    localStorage.setItem(STORAGE_MIGRATION_VERSION_KEY, '1');
    localStorage.setItem(
      LEGACY_BACKUP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        createdAt: '2026-08-01T00:00:00.000Z',
        entries: { legacy_key_from_task3: '{"preserved":true}' },
      })
    );
    localStorage.setItem('asesmerdeka_kalender_legacy_v0', JSON.stringify({ legacyCal: true }));

    // Simpan draf Modul Ajar tertaut ke tpidSem1 agar bisa dipastikan tidak orphan
    const modulKey = buildModulAjarDraftStorageKey(profSem1, tpidSem1, 'pbl');
    localStorage.setItem(
      'asesmerdeka_modul_ajar_v2',
      JSON.stringify({
        [modulKey]: {
          tpId: tpidSem1,
          document: { tpId: tpidSem1, judul: 'Modul SPLDV Task 3' },
        },
      })
    );

    // Jalankan migrasi build Task 4 (pertama kali setelah upgrade dari v1)
    const report1 = runNonDestructiveStorageMigration(profSem1);
    expect(localStorage.getItem(STORAGE_MIGRATION_VERSION_KEY)).toBe('1');
    expect(localStorage.getItem(SCHEDULE_MIGRATION_VERSION_KEY)).toBe(
      CURRENT_SCHEDULE_MIGRATION_VERSION
    );
    expect(report1.scheduleMigrationVersion).toBe(CURRENT_SCHEDULE_MIGRATION_VERSION);

    // Backup lama Task 3 dipertahankan & kalender lama ikut dicadangkan
    const backupAfter = JSON.parse(localStorage.getItem(LEGACY_BACKUP_STORAGE_KEY) || '{}');
    expect(backupAfter.entries?.legacy_key_from_task3).toBe('{"preserved":true}');
    expect(backupAfter.entries?.asesmerdeka_kalender_legacy_v0).toBeTruthy();

    // TP Sem 1 & Sem 2 beserta tpid_* & editan guru utuh 100% dan Modul Ajar tidak orphan
    const sem1After = getSavedCustomTPList('Matematika', '8', '1 (Ganjil)', profSem1);
    const sem2After = getSavedCustomTPList('Matematika', '8', '2 (Genap)', profSem2);
    expect(sem1After?.[0].id).toBe(tpidSem1);
    expect(sem2After?.[0].id).toBe(tpidSem2);
    expect(sem1After?.[0].tujuanPembelajaran).toBe('Kalimat TP Sem 1 sudah disunting guru pada Task 3.');
    expect(sem1After?.[0].alokasiJP).toBe(18);
    expect(sem2After?.[0].tujuanPembelajaran).toBe('Kalimat TP Sem 2 sudah disunting guru pada Task 3.');
    expect(sem2After?.[0].alokasiJP).toBe(22);

    const draftsAfter = JSON.parse(localStorage.getItem('asesmerdeka_modul_ajar_v2') || '{}');
    expect(draftsAfter[modulKey]?.document?.tpId).toBe(tpidSem1);

    // Ubah lagi data setelah migrasi lalu jalankan migrasi berulang -> tetap idempoten & tidak merusak editan baru
    saveCustomTPList(
      'Matematika',
      '8',
      '1 (Ganjil)',
      [{ ...editedTP1, alokasiJP: 25 }],
      profSem1
    );
    runNonDestructiveStorageMigration(profSem1);
    const sem1AfterSecondRun = getSavedCustomTPList('Matematika', '8', '1 (Ganjil)', profSem1);
    expect(sem1AfterSecondRun?.[0].id).toBe(tpidSem1);
    expect(sem1AfterSecondRun?.[0].alokasiJP).toBe(25);
  });

  it('17. [Task 4.1] Akurasi kalender lintas tahun/bulan, libur tengah minggu, tumpang tindih agenda, MPLS/STS/SAS/Rapor tanpa menghitung hari terblokir', () => {
    const prof = makeTestProfile({ schoolId: 'sch_cal_edge', tahunAjaran: '2026/2027' });
    const baseCal = getAcademicCalendarForContext(prof, '1 (Ganjil)');

    // 1. Kalender lintas bulan & lintas tahun: Sem 1 diperpanjang hingga 2027-01-08 (Kamis/Jumat Jan 2027)
    // 2. Libur tengah minggu melintasi dua minggu: Kamis 2026-08-20 s.d. Selasa 2026-08-25
    // 3. Tumpang tindih libur nasional (2026-09-07..08) dengan kegiatan sekolah non-blokir (2026-09-07..11)
    const edgeCal = {
      ...baseCal,
      tanggalMulaiSemester: '2026-07-13',
      tanggalAkhirSemester: '2027-01-08',
      mplsRange: { startDate: '2026-07-13', endDate: '2026-07-15', label: 'MPLS' },
      stsRange: { startDate: '2026-09-28', endDate: '2026-10-02', label: 'STS' },
      sasRange: { startDate: '2026-12-07', endDate: '2026-12-11', label: 'SAS' },
      pembagianRaporDate: '2026-12-18', // Jumat pekan ke-3 Desember
      liburSekolah: [], // uji perpanjangan masuk Januari 2027 tanpa diblokir libur akhir desember bawaan
      liburNasionalKeagamaan: [
        {
          id: 'midweek_span',
          nama: 'Libur Tengah Minggu Lintas Pekan',
          startDate: '2026-08-20', // Kamis
          endDate: '2026-08-25',   // Selasa pekan berikutnya
          kategori: 'libur_nasional' as const,
          blokirPembelajaran: true,
        },
        {
          id: 'overlap_hol',
          nama: 'Cuti Nasional Tumpang Tindih Agenda',
          startDate: '2026-09-07', // Senin
          endDate: '2026-09-08',   // Selasa
          kategori: 'libur_nasional' as const,
          blokirPembelajaran: true,
        },
      ],
      kegiatanKhususSekolah: [
        {
          id: 'non_blocking_proj',
          nama: 'Pekan Proyek Non-Blokir',
          startDate: '2026-09-07',
          endDate: '2026-09-11',
          kategori: 'kegiatan_khusus' as const,
          blokirPembelajaran: false,
        },
      ],
    };

    const cols = generateSemesterWeekColumns(edgeCal, 5);

    // Lintas tahun 2026 -> Januari 2027 wajib ikut muncul
    const jan2027Col = cols.find((c) => c.weekKey?.startsWith('2027-01'));
    expect(jan2027Col).toBeTruthy();
    expect(jan2027Col?.isEfektif).toBe(true);
    expect(jan2027Col?.hariEfektif).toBe(5);

    // Pekan MPLS (2026-07-13..17): 3 hari MPLS -> non-efektif, 0 JP
    const mplsCol = cols.find((c) => c.startDate === '2026-07-13');
    expect(mplsCol?.isEfektif).toBe(false);
    expect(mplsCol?.kapasitasJP).toBe(0);
    expect(mplsCol?.hariEfektif).toBe(0);

    // Pekan 1 libur tengah minggu (2026-08-17..21): Kam-Jum diblokir -> hanya 3 hari efektif & 3 JP (bukan 5 JP!)
    const weekA = cols.find((c) => c.startDate === '2026-08-17');
    expect(weekA?.isEfektif).toBe(true);
    expect(weekA?.hariEfektif).toBe(3);
    expect(weekA?.kapasitasJP).toBe(3);

    // Pekan 2 libur tengah minggu (2026-08-24..28): Sen-Sel diblokir -> hanya 3 hari efektif & 3 JP
    const weekB = cols.find((c) => c.startDate === '2026-08-24');
    expect(weekB?.isEfektif).toBe(true);
    expect(weekB?.hariEfektif).toBe(3);
    expect(weekB?.kapasitasJP).toBe(3);

    // Pekan tumpang tindih libur nasional vs agenda non-blokir (2026-09-07..11):
    // 2 hari libur nasional wajib tetap terblokir (hariEfektif = 3, kapasitasJP = 3, bukan 5!)
    const overlapWeek = cols.find((c) => c.startDate === '2026-09-07');
    expect(overlapWeek?.isEfektif).toBe(true);
    expect(overlapWeek?.hariEfektif).toBe(3);
    expect(overlapWeek?.kapasitasJP).toBe(3);

    // STS & SAS non-efektif (0 JP)
    const stsCol = cols.find((c) => c.startDate === '2026-09-28');
    const sasCol = cols.find((c) => c.startDate === '2026-12-07');
    expect(stsCol?.isEfektif).toBe(false);
    expect(stsCol?.kapasitasJP).toBe(0);
    expect(sasCol?.isEfektif).toBe(false);
    expect(sasCol?.kapasitasJP).toBe(0);

    // Hari pembagian rapor (Jumat 2026-12-18) tidak dihitung sebagai hari belajar (hariEfektif <= 4)
    const raporWeek = cols.find((c) => c.startDate === '2026-12-14');
    expect(raporWeek?.hariEfektif).toBe(4);
    expect(raporWeek?.kapasitasJP).toBe(4);
  });

  it('18. [Task 4.1] Transparansi seluruh estimasi JP (sumber jelas, belum resmi, butuh konfirmasi) & keakuratan SURPLUS_KAPASITAS', () => {
    const sampleProfiles: Array<Partial<SchoolProfile>> = [
      { jenjang: 'SD/MI', kelasUtama: '4', mataPelajaranUtama: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)' },
      { jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' },
      { jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'IPS (Ilmu Pengetahuan Sosial)' },
      { jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Sejarah' },
      { jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'PJOK' },
      { jenjang: 'SMA/MA', kelasUtama: '11', mataPelajaranUtama: 'Fisika' },
      { jenjang: 'SMK', kelasUtama: '10', mataPelajaranUtama: 'Projek IPAS' },
      { jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Fikih' },
      { jenjang: 'SMK', kelasUtama: '11', mataPelajaranUtama: 'Mapel Muatan Lokal Khusus XYZ' },
    ];

    sampleProfiles.forEach((ovr) => {
      const cfg = resolveDefaultSubjectJPConfig(makeTestProfile(ovr));
      expect(cfg.statusKonfirmasi).toBe('estimasi_belum_dikonfirmasi');
      expect(cfg.sumberReferensi.toLowerCase()).toContain('bukan ketentuan resmi');
      expect(cfg.sumberReferensi.toLowerCase()).toContain('dikonfirmasi');
      expect((cfg.catatan || '').toLowerCase()).toMatch(/estimasi|pengisi awal/);
      expect((cfg.catatan || '').toLowerCase()).toMatch(/konfirmasi|sesuaikan|verifikasi|belum resmi|belum dikonfirmasi/);
    });

    // Uji SURPLUS_KAPASITAS pada kondisi belum dikonfirmasi vs sudah dikonfirmasi dengan rentang sempit
    const prof = makeTestProfile({ schoolId: 'sch_surplus_check', semester: '1 (Ganjil)' });
    const unconfirmedCal = getAcademicCalendarForContext(prof, '1 (Ganjil)');
    const unconfirmedJp = resolveDefaultSubjectJPConfig(prof);
    const shortTP: CustomTPItem[] = [
      {
        id: 'tpid_surplus_1',
        kode: '8.1',
        elemen: 'Aljabar',
        materiPokok: 'SPLDV',
        tujuanPembelajaran: 'Memodelkan SPLDV',
        arahanRangkuman: 'SPLDV',
        alokasiJP: 20,
        mingguMulai: 1,
        mingguSelesai: 4, // sengaja sempit sehingga sebagian tidak muat di rentang awal
      },
    ];

    const promesUnconf = buildSmartPromes(prof, shortTP, {
      calendar: unconfirmedCal,
      jpConfig: unconfirmedJp,
    });
    const surplusUnconf = promesUnconf.validationIssues?.find(
      (v) => v.kode === 'SURPLUS_KAPASITAS'
    );
    expect(surplusUnconf?.pesan).toContain('Sisa Kapasitas Efektif');
    expect(surplusUnconf?.pesan).toContain('masih berbasis kalender/JP estimasi awal');
    expect(surplusUnconf?.pesan).toContain('perlu perluasan rentang minggu');
    expect(surplusUnconf?.pesan).not.toContain('Kapasitas JP Berlebih');
  });
});
