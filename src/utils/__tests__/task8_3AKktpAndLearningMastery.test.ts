import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Packer } from 'docx';
import JSZip from 'jszip';
import type {
  KelasHarianData,
  NilaiSiswaItem,
} from '../../types/kelasHarian';
import {
  classifyPredikatKKTP,
  computeClassGradeSummary,
  computeNilaiAkhir,
  generateAutoDeskripsiRapor,
  getKelasHarianData,
  normalizeBobotKebijakan,
  saveKelasHarianData,
  validateBobotKebijakan,
} from '../kelasHarianStorage';
import {
  analyzeClassLearningMastery,
  analyzeStudentTPMastery,
  classifyMasteryStatusKKTP,
  computeDynamicKKTPBands,
  createBuktiAsesmenEntry,
  createRemedialHistoryEntry,
  normalizeEvidenceScoreToScale100,
  recordRemedialAttemptOnStudent,
  resolveEffectiveKKTPThreshold,
} from '../learningMasteryEngine';
import {
  applyConflictChoicesToMergedEntries,
  analyzeWorkspaceConflict,
  type CloudPendingConflict,
} from '../cloudSyncManager';
import {
  exportBackupDataJson,
  importBackupDataJson,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { buildDaftarNilaiElements } from '../docx/docxKelasHarian';
import { createStyledDocxDocument } from '../docx/docxShared';
import { BukuNilaiTab } from '../../components/harian/BukuNilaiTab';
import { StudentEvidenceModal } from '../../components/harian/StudentEvidenceModal';
import { AutoDeskripsiRaporTab } from '../../components/harian/AutoDeskripsiRaporTab';

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
  (globalThis as unknown as { localStorage: LocalStorageMock }).localStorage = new LocalStorageMock();
}

function makeProfile(overrides?: Partial<SchoolProfile>): SchoolProfile {
  return {
    schoolId: 'sch_task83a_test',
    instansiDinas: 'Dinas Pendidikan Uji',
    namaSekolah: 'SMP Negeri 83A Uji',
    alamatSekolah: 'Jl. Asesmen Merdeka No. 3',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    daftarRombel: ['VIII A'],
    mataPelajaranUtama: 'Matematika',
    namaGuru: 'Guru Uji 83A, S.Pd.',
    nipGuru: '198801012012011001',
    namaKepalaSekolah: 'Kepala Uji, M.Pd.',
    nipKepalaSekolah: '197001012000011001',
    kotaSekolah: 'Yogyakarta',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

function makeTPs(): CustomTPItem[] {
  return [
    {
      id: 'tpid_83a_1',
      kode: '8.1',
      elemen: 'Bilangan',
      materiPokok: 'Bilangan Berpangkat',
      tujuanPembelajaran: 'Memahami dan menggunakan sifat bilangan berpangkat.',
      arahanRangkuman: 'Sifat pangkat bulat',
      alokasiJP: 10,
      mingguMulai: 1,
      mingguSelesai: 3,
      subTP: [
        {
          id: 'sub_81a',
          kode: '8.1.A',
          kompetensi: 'Mengenali notasi pangkat',
          fokusMateri: 'Notasi Pangkat Bulat Positif',
          buktiKetercapaian: 'Menuliskan perkalian berulang dalam bentuk pangkat.',
        },
        {
          id: 'sub_81b',
          kode: '8.1.B',
          kompetensi: 'Menerapkan sifat perkalian pangkat',
          fokusMateri: 'Operasi Perkalian dan Pembagian Pangkat',
          buktiKetercapaian: 'Menyederhanakan operasi eksponen dengan tepat.',
        },
      ],
    },
    {
      id: 'tpid_83a_2',
      kode: '8.2',
      elemen: 'Aljabar',
      materiPokok: 'Persamaan Linear Satu Variabel',
      tujuanPembelajaran: 'Menyelesaikan persamaan linear satu variabel.',
      arahanRangkuman: 'PLSV kontekstual',
      alokasiJP: 10,
      mingguMulai: 4,
      mingguSelesai: 6,
    },
  ];
}

function makeStudentNilai(
  siswaId: string,
  nama: string,
  nis: string,
  overrides?: Partial<NilaiSiswaItem>
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

describe('Task 8.3A — Dynamic KKTP, Multi-Evidence Assessment & Learning Mastery Foundation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. KKTP DINAMIS & KLASIFIKASI BELUM DINILAI VS NILAI 0 VS THRESHOLD
  // =========================================================================
  it('1. Membedakan Belum Dinilai vs Nilai 0 sah, menerapkan kktpMinTuntas dinamis (kelas, profil, & khusus TP), dan merespons perubahan threshold tanpa mengubah skor mentah', () => {
    // Kosong / undefined / null -> Belum Dinilai (TIDAK boleh Perlu Bimbingan!)
    expect(classifyPredikatKKTP(null, 71)).toBe('Belum Dinilai');
    expect(classifyPredikatKKTP(undefined, 75)).toBe('Belum Dinilai');
    expect(classifyPredikatKKTP(Number.NaN, 80)).toBe('Belum Dinilai');
    expect(classifyMasteryStatusKKTP(null, 75)).toBe('Belum Dinilai');
    expect(classifyMasteryStatusKKTP(undefined, 75)).toBe('Belum Dinilai');

    const tpList = makeTPs();
    const blankCompute = computeNilaiAkhir({}, null, null, tpList, { kktpMinTuntas: 75 });
    expect(blankCompute.na).toBeNull();
    expect(blankCompute.statusNilai).toBe('belum_dinilai');
    expect(blankCompute.predikat).toBe('Belum Dinilai');

    // Nilai 0 yang sah tetap dinilai (0 !== Belum Dinilai)
    const zeroCompute = computeNilaiAkhir({ tpid_83a_1: 0, tpid_83a_2: 0 }, 0, 0, tpList, {
      kktpMinTuntas: 75,
    });
    expect(zeroCompute.na).toBe(0);
    expect(zeroCompute.statusNilai).toBe('lengkap');
    expect(zeroCompute.predikat).toBe('Perlu Bimbingan');
    expect(classifyMasteryStatusKKTP(0, 75)).toBe('Perlu Bimbingan');

    // Nilai tepat di bawah, tepat sama, dan di atas threshold 75
    expect(classifyMasteryStatusKKTP(74, 75)).toBe('Perlu Bimbingan');
    expect(classifyPredikatKKTP(74, 75)).toBe('Cukup');
    expect(classifyMasteryStatusKKTP(75, 75)).toBe('Tercapai');
    expect(classifyPredikatKKTP(75, 75)).toBe('Baik');
    expect(classifyPredikatKKTP(90, 75)).toBe('Sangat Baik');

    // Rentang dinamis untuk threshold 65 & 80
    const bands65 = computeDynamicKKTPBands(65);
    expect(bands65.minTuntas).toBe(65);
    expect(classifyPredikatKKTP(65, 65)).toBe('Baik'); // 65 tercapai jika threshold = 65!
    const bands80 = computeDynamicKKTPBands(80);
    expect(bands80.minTuntas).toBe(80);
    expect(classifyPredikatKKTP(79, 80)).toBe('Cukup');
    expect(classifyPredikatKKTP(80, 80)).toBe('Baik');

    // Resolusi prioritas KKTP: TP override -> bobotPolicy -> schoolProfile -> 71
    const profile78 = makeProfile({ kktpMinTuntas: 78 });
    const tpWithCustomKKTP: CustomTPItem = { ...tpList[0], kktpMinTuntas: 82 };
    expect(resolveEffectiveKKTPThreshold({ schoolProfile: profile78 })).toBe(78);
    expect(
      resolveEffectiveKKTPThreshold({ schoolProfile: profile78, bobotPolicy: { kktpMinTuntas: 75 } })
    ).toBe(75);
    expect(
      resolveEffectiveKKTPThreshold({
        tp: tpWithCustomKKTP,
        bobotPolicy: { kktpMinTuntas: 75 },
        schoolProfile: profile78,
      })
    ).toBe(82);

    // Perubahan threshold sekolah/kelas mengubah status siswa tanpa mengubah skor mentah tersimpan
    const siswa = makeStudentNilai('s1', 'Andi', '101', {
      nilaiFormatif: { tpid_83a_1: 73, tpid_83a_2: 73 },
      nilaiSTS: 73,
      nilaiSAS: 73,
    });
    const res71 = computeNilaiAkhir(siswa.nilaiFormatif, siswa.nilaiSTS, siswa.nilaiSAS, tpList, {
      kktpMinTuntas: 71,
    });
    const res75 = computeNilaiAkhir(siswa.nilaiFormatif, siswa.nilaiSTS, siswa.nilaiSAS, tpList, {
      kktpMinTuntas: 75,
    });
    expect(res71.na).toBe(73);
    expect(res71.predikat).toBe('Baik');
    expect(res75.na).toBe(73); // Nilai mentah & NA tetap 73
    expect(res75.predikat).toBe('Cukup');
    expect(analyzeStudentTPMastery(siswa, tpList[0], { bobotPolicy: { kktpMinTuntas: 75 } }).status).toBe(
      'Perlu Bimbingan'
    );
    expect(analyzeStudentTPMastery(siswa, tpList[0], { bobotPolicy: { kktpMinTuntas: 71 } }).status).toBe(
      'Tercapai'
    );

    // Validasi bobot & kktp
    expect(
      validateBobotKebijakan({ bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, kktpMinTuntas: 0 }).valid
    ).toBe(false);
    expect(
      normalizeBobotKebijakan({ kktpMinTuntas: 80, ambangKelasTindakLanjutPersen: 25 }).kktpMinTuntas
    ).toBe(80);
  });

  // =========================================================================
  // 2. MULTI-EVIDENCE ASSESSMENT & NORMALISASI SKALA SKOR
  // =========================================================================
  it('2. Mendukung 1 bukti, banyak bukti, bukti spesifik Sub-TP, observasi tanpa skor, skala skor beragam, referensi asesmen/rangkuman, & data legacy', () => {
    const tpList = makeTPs();

    // Normalisasi skala berbeda (0..10, 0..4, 0..100, serta skor 0 vs null)
    expect(normalizeEvidenceScoreToScale100(8, 10)).toBe(80);
    expect(normalizeEvidenceScoreToScale100(3, 4)).toBe(75);
    expect(normalizeEvidenceScoreToScale100(0, 10)).toBe(0);
    expect(normalizeEvidenceScoreToScale100(null, 10)).toBeNull();
    expect(normalizeEvidenceScoreToScale100(undefined, 4)).toBeNull();

    const ev1 = createBuktiAsesmenEntry({
      tp: { id: tpList[0].id, kode: tpList[0].kode },
      subTp: tpList[0].subTP![0],
      jenisBukti: 'tes',
      sumberBukti: 'asesmen',
      asesmenId: 'asm_001',
      skor: 9,
      skalaSkor: 10, // 90%
      kktpMinTuntas: 75,
      indikatorYangDiamati: 'Menuliskan notasi pangkat dengan benar',
    });
    const ev2 = createBuktiAsesmenEntry({
      tp: { id: tpList[0].id, kode: tpList[0].kode },
      subTp: tpList[0].subTP![1],
      jenisBukti: 'lkpd',
      sumberBukti: 'lkpd',
      rangkumanId: 'rgk_002',
      lkpdId: 'lkpd_003',
      skor: 2,
      skalaSkor: 4, // 50%
      kktpMinTuntas: 75,
      indikatorYangDiamati: 'Menyederhanakan operasi eksponen',
      catatanMiskonsepsi: 'Siswa menjumlahkan basis saat pangkat dikalikan.',
    });
    const evObsNoScore = createBuktiAsesmenEntry({
      tp: { id: tpList[1].id, kode: tpList[1].kode },
      jenisBukti: 'observasi',
      sumberBukti: 'jurnal',
      jurnalId: 'jrn_004',
      skor: null,
      statusKetercapaian: 'Belum Dinilai',
      indikatorYangDiamati: 'Diskusi kelompok awal PLSV',
    });

    expect(ev1.asesmenId).toBe('asm_001');
    expect(ev2.rangkumanId).toBe('rgk_002');
    expect(evObsNoScore.skor).toBeNull();
    expect(evObsNoScore.statusKetercapaian).toBe('Belum Dinilai');

    const student = makeStudentNilai('s1', 'Budi', '102', {
      buktiAsesmenSubTP: [ev1, ev2, evObsNoScore],
    });

    // Analisis TP 1 dengan bukti campuran skala -> rata-rata terstandar (90 + 50) / 2 = 70 vs KKTP 75 -> Perlu Bimbingan
    const resTP1 = analyzeStudentTPMastery(student, tpList[0], {
      bobotPolicy: { kktpMinTuntas: 75 },
    });
    expect(resTP1.normalizedEvidenceAvg100).toBe(70);
    expect(resTP1.status).toBe('Perlu Bimbingan');
    expect(resTP1.catatanMiskonsepsiGuru).toEqual([
      'Siswa menjumlahkan basis saat pangkat dikalikan.',
    ]);
    // Sub-TP 8.1.A Tercapai (90%), Sub-TP 8.1.B Perlu Bimbingan (50%)
    expect(resTP1.subTpResults[0].status).toBe('Tercapai');
    expect(resTP1.subTpResults[1].status).toBe('Perlu Bimbingan');

    // Observasi tanpa skor & tanpa keputusan status -> Belum Dinilai (insufficientEvidence = true)
    const resTP2 = analyzeStudentTPMastery(student, tpList[1], {
      bobotPolicy: { kktpMinTuntas: 75 },
    });
    expect(resTP2.status).toBe('Belum Dinilai');
    expect(resTP2.insufficientEvidence).toBe(true);
    expect(resTP2.alasanStatus).toContain('Bukti belum cukup');

    // Data legacy tanpa buktiAsesmenSubTP & tanpa Sub-TP evidence tidak boleh mengarang Sub-TP bermasalah!
    const legacyLowStudent = makeStudentNilai('s_leg', 'Citra', '103', {
      nilaiFormatif: { '8.1': 55 },
    });
    const resLegacy = analyzeStudentTPMastery(legacyLowStudent, tpList[0], {
      bobotPolicy: { kktpMinTuntas: 75 },
    });
    expect(resLegacy.status).toBe('Perlu Bimbingan');
    expect(resLegacy.catatanMiskonsepsiGuru).toEqual([]); // Tidak menyimpulkan miskonsepsi hanya dari angka rendah
    expect(resLegacy.subTpAnalysisNote).toContain('Hanya tersedia data tingkat TP');
    expect(resLegacy.subTpResults.every((s) => s.status === 'Bukti belum cukup')).toBe(true);
  });

  // =========================================================================
  // 3. ANALISIS KETUNTASAN KELAS, DENOMINATOR JUJUR & REKOMENDASI TINDAK LANJUT
  // =========================================================================
  it('3. Menghitung persentase ketuntasan kelas hanya dari siswa yang dinilai (mengecualikan Belum Dinilai) dan menghasilkan rekomendasi individu/kelompok/kelas secara akurat', () => {
    const tpList = makeTPs();

    // 4 siswa: 1 Tercapai (85), 1 Perlu Bimbingan (55), 2 Belum Dinilai (blank)
    // Denominator dinilai = 2 -> Tercapai = 50%, Perlu Bimbingan = 50% (bukan 25%!)
    const roster4: NilaiSiswaItem[] = [
      makeStudentNilai('s1', 'Siswa A', '01', { nilaiFormatif: { tpid_83a_1: 85 }, nilaiSTS: 85, nilaiSAS: 85 }),
      makeStudentNilai('s2', 'Siswa B', '02', { nilaiFormatif: { tpid_83a_1: 55 }, nilaiSTS: 55, nilaiSAS: 55 }),
      makeStudentNilai('s3', 'Siswa C', '03'), // belum dinilai
      makeStudentNilai('s4', 'Siswa D', '04'), // belum dinilai
    ];

    const summary = computeClassGradeSummary(roster4, tpList, { kktpMinTuntas: 75 });
    expect(summary.totalSiswa).toBe(4);
    expect(summary.gradedCount).toBe(2);
    expect(summary.belumDinilaiCount).toBe(2);
    expect(summary.totalTercapai).toBe(1);
    expect(summary.persentaseTercapai).toBe(50);

    // Uji rekomendasi: 1 perlu bimbingan -> 'individu'
    const report1 = analyzeClassLearningMastery({
      daftarNilai: roster4,
      tpList,
      bobotPolicy: { kktpMinTuntas: 75, ambangKelasTindakLanjutPersen: 30 },
    });
    expect(report1.tpSummaries[0].dinilaiCount).toBe(2);
    expect(report1.tpSummaries[0].belumDinilaiCount).toBe(2);
    expect(report1.tpSummaries[0].persentaseTercapai).toBe(50);
    expect(report1.tpSummaries[0].rekomendasi.kind).toBe('individu');
    expect(report1.tpSummaries[0].rekomendasi.targetSiswaNames).toEqual(['Siswa B']);
    // TP 2 tidak ada yang dinilai -> 'belum_dapat_ditentukan'
    expect(report1.tpSummaries[1].rekomendasi.kind).toBe('belum_dapat_ditentukan');

    // Uji 10 siswa dinilai: 2 perlu bimbingan (20%) vs ambang guru 30% -> 'kelompok_kecil'
    // Ubah ambang guru menjadi 15% -> 'kelas_keseluruhan'
    const tenGraded: NilaiSiswaItem[] = Array.from({ length: 10 }, (_, idx) =>
      makeStudentNilai(`st_${idx}`, `Murid ${idx + 1}`, `20${idx}`, {
        nilaiFormatif: { tpid_83a_1: idx < 2 ? 60 : 85 },
      })
    );
    const repKelompok = analyzeClassLearningMastery({
      daftarNilai: tenGraded,
      tpList,
      bobotPolicy: { kktpMinTuntas: 75, ambangKelasTindakLanjutPersen: 30 },
    });
    expect(repKelompok.tpSummaries[0].rekomendasi.kind).toBe('kelompok_kecil');
    expect(repKelompok.tpSummaries[0].rekomendasi.sumberAturan).toBe('heuristik_produk_dapat_disesuaikan');

    const repKelas = analyzeClassLearningMastery({
      daftarNilai: tenGraded,
      tpList,
      bobotPolicy: { kktpMinTuntas: 75, ambangKelasTindakLanjutPersen: 15 },
    });
    expect(repKelas.tpSummaries[0].rekomendasi.kind).toBe('kelas_keseluruhan');

    // Semua tuntas -> 'belum_perlu_tindak_lanjut'
    const allPass = tenGraded.map((s) => ({ ...s, nilaiFormatif: { tpid_83a_1: 88 } }));
    const repPass = analyzeClassLearningMastery({
      daftarNilai: allPass,
      tpList,
      bobotPolicy: { kktpMinTuntas: 75 },
    });
    expect(repPass.tpSummaries[0].rekomendasi.kind).toBe('belum_perlu_tindak_lanjut');
  });

  // =========================================================================
  // 4. RIWAYAT TINDAK LANJUT & REASSESSMENT PLACEHOLDER (NON-DESTRUKTIF)
  // =========================================================================
  it('4. Menyimpan riwayat intervensi dan hasil sebelum/sesudah reassessment secara non-destruktif serta kompatibel dengan data lama tanpa riwayat', () => {
    const tpList = makeTPs();
    const initialAttempt = createBuktiAsesmenEntry({
      tp: { id: tpList[0].id, kode: tpList[0].kode },
      jenisBukti: 'tes',
      sumberBukti: 'asesmen',
      skor: 55,
      skalaSkor: 100,
      kktpMinTuntas: 75,
      indikatorYangDiamati: 'Asesmen awal bilangan berpangkat',
    });

    let student = makeStudentNilai('s_rem', 'Dewi', '104', {
      nilaiFormatif: { tpid_83a_1: 55 },
      buktiAsesmenSubTP: [initialAttempt],
    });

    const plannedRemedial = createRemedialHistoryEntry({
      tp: { id: tpList[0].id, kode: tpList[0].kode },
      subTpIds: ['sub_81b'],
      attemptAwalId: initialAttempt.id,
      jenisIntervensi: 'kelompok_kecil',
      materiPengulanganId: 'rem_mat_01',
      hasilSebelum: { skor: 55, skalaSkor: 100, persentase: 55, status: 'Perlu Bimbingan' },
      statusTindakLanjut: 'direncanakan',
      catatanGuru: 'Latihan terbimbing sifat perkalian pangkat',
    });

    student = recordRemedialAttemptOnStudent(student, plannedRemedial);
    expect(student.riwayatRemedial).toHaveLength(1);
    expect(student.riwayatRemedial![0].hasilSebelum?.persentase).toBe(55);

    // Simulasi mencatat hasil sesudah reassessment: nilai awal & hasilSebelum TIDAK boleh tertimpa/hilang!
    student = recordRemedialAttemptOnStudent(student, {
      ...plannedRemedial,
      asesmenUlangId: 'reassess_01',
      hasilSesudah: { skor: 85, skalaSkor: 100, persentase: 85, status: 'Tercapai' },
      statusTindakLanjut: 'tuntas_setelah_remedial',
    });

    expect(student.riwayatRemedial).toHaveLength(1);
    expect(student.riwayatRemedial![0].attemptAwalId).toBe(initialAttempt.id);
    expect(student.riwayatRemedial![0].hasilSebelum?.persentase).toBe(55);
    expect(student.riwayatRemedial![0].hasilSesudah?.persentase).toBe(85);
    expect(student.nilaiFormatif.tpid_83a_1).toBe(55); // Skor awal tetap terjaga

    // Kompatibilitas data lama tanpa riwayatRemedial/buktiAsesmenSubTP melalui getKelasHarianData
    const profile = makeProfile();
    saveKelasHarianData(profile, {
      rombel: 'VIII A',
      mataPelajaran: 'Matematika',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      dataSource: 'user_manual',
      daftarSiswa: [{ id: 's_old', noUrut: 1, nis: '111', nama: 'Siswa Lama', jenisKelamin: 'L' }],
      daftarPresensi: [],
      daftarJurnal: [],
      daftarNilai: [
        {
          siswaId: 's_old',
          nama: 'Siswa Lama',
          nis: '111',
          nilaiFormatif: {},
          nilaiSTS: null,
          nilaiSAS: null,
          nilaiAkhir: null,
          predikatKKTP: 'Perlu Bimbingan',
          deskripsiRapor: '',
        },
      ],
    });
    const migrated = getKelasHarianData(profile, tpList);
    expect(migrated.daftarNilai[0].predikatKKTP).toBe('Belum Dinilai');
  });

  // =========================================================================
  // 5. DESKRIPSI e-RAPOR, UI BUKU NILAI & MODAL BUKTI, SERTA DOCX
  // =========================================================================
  it('5. Menyusun deskripsi e-Rapor berbasis bukti tanpa mengarang peningkatan, merender UI Buku Nilai/Modal tanpa hardcode 71/merah salah kaprah, serta ekspor DOCX jujur', async () => {
    const profile = makeProfile();
    const tpList = makeTPs();

    // Tanpa riwayat remedial, narasi TIDAK boleh mengklaim "peningkatan capaian setelah tindak lanjut"
    const descNoRemedial = generateAutoDeskripsiRapor({ tpid_83a_1: 88, tpid_83a_2: 72 }, tpList, 'Eko', {
      bobotPolicy: { kktpMinTuntas: 75 },
      nilaiSTS: 80,
      nilaiSAS: 82,
    });
    expect(descNoRemedial).toContain('Bilangan Berpangkat');
    expect(descNoRemedial).toContain('Persamaan Linear Satu Variabel');
    expect(descNoRemedial).toContain('pendampingan dan latihan tambahan'); // 72 < 75!
    expect(descNoRemedial).toContain('STS (80, memenuhi KKTP)');
    expect(descNoRemedial).not.toContain('peningkatan capaian setelah tindak lanjut');

    // Dengan riwayat peningkatan terdokumentasi + bukti Sub-TP -> narasi menyertakan fakta tersebut
    const evSub = createBuktiAsesmenEntry({
      tp: { id: tpList[0].id, kode: tpList[0].kode },
      subTp: tpList[0].subTP![0],
      jenisBukti: 'tes',
      sumberBukti: 'asesmen',
      skor: 9,
      skalaSkor: 10,
      kktpMinTuntas: 75,
      indikatorYangDiamati: 'Notasi pangkat',
    });
    const remDone = createRemedialHistoryEntry({
      tp: { id: tpList[1].id, kode: tpList[1].kode },
      jenisIntervensi: 'bimbingan_individu',
      hasilSebelum: { skor: 60, skalaSkor: 100, persentase: 60, status: 'Perlu Bimbingan' },
      hasilSesudah: { skor: 82, skalaSkor: 100, persentase: 82, status: 'Tercapai' },
      statusTindakLanjut: 'tuntas_setelah_remedial',
    });
    const descWithProgress = generateAutoDeskripsiRapor({ tpid_83a_1: 90, tpid_83a_2: 82 }, tpList, 'Eko', {
      bobotPolicy: { kktpMinTuntas: 75 },
      buktiAsesmenSubTP: [evSub],
      riwayatRemedial: [remDone],
    });
    expect(descWithProgress).toContain('Sub-TP 8.1.A');
    expect(descWithProgress).toContain('peningkatan capaian setelah tindak lanjut');

    // Siswa Cukup (65 pada KKTP 71) tidak boleh diwarnai merah (#b91c1c / #fee2e2) dan siswa kosong harus eksplisit 'Belum Dinilai'
    const harianData: KelasHarianData = {
      rombel: 'VIII A',
      mataPelajaran: 'Matematika',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      isSimulated: false,
      dataSource: 'user_manual',
      bobotNilai: { bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, kktpMinTuntas: 71 },
      daftarSiswa: [
        { id: 's_cukup', noUrut: 1, nis: '201', nama: 'Siswa Cukup', jenisKelamin: 'L' },
        { id: 's_blank', noUrut: 2, nis: '202', nama: 'Siswa Kosong', jenisKelamin: 'P' },
      ],
      daftarPresensi: [],
      daftarJurnal: [],
      daftarNilai: [
        makeStudentNilai('s_cukup', 'Siswa Cukup', '201', {
          nilaiFormatif: { tpid_83a_1: 65, tpid_83a_2: 65 },
          nilaiSTS: 65,
          nilaiSAS: 65,
          buktiAsesmenSubTP: [evSub],
          riwayatRemedial: [remDone],
        }),
        makeStudentNilai('s_blank', 'Siswa Kosong', '202'),
      ],
    };

    const bukuHtml = renderToStaticMarkup(
      React.createElement(BukuNilaiTab, {
        schoolProfile: profile,
        kelasHarian: harianData,
        tpList,
        onUpdateKelasHarian: () => {},
        onToast: () => {},
      })
    );
    expect(bukuHtml).toContain('Belum Dinilai');
    expect(bukuHtml).toContain('KKTP ≥ 71');
    expect(bukuHtml).toContain('Atur Bobot &amp; KKTP');
    expect(bukuHtml).toContain('Analisis TP');
    expect(bukuHtml).toContain('Bukti (1)');
    expect(bukuHtml).toContain('Cukup');
    expect(bukuHtml).toContain('#fef9c3'); // Latar kuning untuk Cukup
    expect(bukuHtml).toContain('Keterangan KKTP Dinamis (Min. Tuntas 71)');
    // Nilai 65 berada pada rentang Cukup -> sel Nilai Akhir Siswa Cukup tidak boleh merah (#fee2e2)
    const cukupRowHtml = bukuHtml.split('Siswa Kosong')[0];
    expect(cukupRowHtml).not.toContain('background:#fee2e2');

    // Uji dengan KKTP = 75 -> Keterangan & warna menyesuaikan 75 tanpa menyertakan angka 71
    const harian75: KelasHarianData = {
      ...harianData,
      bobotNilai: { bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, kktpMinTuntas: 75 },
    };
    const bukuHtml75 = renderToStaticMarkup(
      React.createElement(BukuNilaiTab, {
        schoolProfile: profile,
        kelasHarian: harian75,
        tpList,
        onUpdateKelasHarian: () => {},
        onToast: () => {},
      })
    );
    expect(bukuHtml75).toContain('KKTP ≥ 75');
    expect(bukuHtml75).toContain('Keterangan KKTP Dinamis (Min. Tuntas 75)');
    expect(bukuHtml75).not.toContain('71–85');

    // Render StudentEvidenceModal & AutoDeskripsiRaporTab
    const modalHtml = renderToStaticMarkup(
      React.createElement(StudentEvidenceModal, {
        isOpen: true,
        siswaNilai: harian75.daftarNilai[0],
        tpList,
        bobotPolicy: harian75.bobotNilai,
        schoolProfile: profile,
        onAddEvidence: () => {},
        onRemoveEvidence: () => {},
        onClose: () => {},
      })
    );
    expect(modalHtml).toContain('modal-overlay');
    expect(modalHtml).toContain('atp-modal-dialog');
    expect(modalHtml).toContain('Bukti Asesmen &amp; Ketercapaian TP — Siswa Cukup');
    expect(modalHtml).toContain('Riwayat Tindak Lanjut');

    const raporHtml = renderToStaticMarkup(
      React.createElement(AutoDeskripsiRaporTab, {
        schoolProfile: profile,
        kelasHarian: harian75,
        tpList,
        onUpdateKelasHarian: () => {},
        onToast: () => {},
      })
    );
    expect(raporHtml).toContain('Belum Dinilai');

    // Ekspor DOCX Daftar Nilai menghormati KKTP 75 & Belum Dinilai
    const docxElements = buildDaftarNilaiElements(profile, harian75, tpList);
    const doc = createStyledDocxDocument(profile, 'Daftar Nilai 83A', docxElements);
    const blob = await Packer.toBlob(doc);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = (await zip.file('word/document.xml')?.async('string')) || '';
    expect(xml).toContain('Kriteria Tuntas KKTP: ≥ 75');
    expect(xml).toContain('Belum Dinilai');
    expect(xml).not.toContain('71 - 85');
  });

  // =========================================================================
  // 6. CLOUD SYNC 3-WAY MERGE & BACKUP/RESTORE UNTUK MULTI-EVIDENCE + REMEDIAL
  // =========================================================================
  it('6. Backup/Restore menjaga multi-evidence dan riwayat remedial, serta Cloud Sync 3-way merge menggabung bukti lintas perangkat & menandai konflik konkuren secara eksplisit', () => {
    const tpList = makeTPs();
    const evA = createBuktiAsesmenEntry({
      tp: { id: tpList[0].id, kode: tpList[0].kode },
      jenisBukti: 'tes',
      sumberBukti: 'asesmen',
      skor: 80,
      skalaSkor: 100,
      indikatorYangDiamati: 'Bukti dari Device A',
    });
    const evB = createBuktiAsesmenEntry({
      tp: { id: tpList[1].id, kode: tpList[1].kode },
      jenisBukti: 'lkpd',
      sumberBukti: 'lkpd',
      skor: 85,
      skalaSkor: 100,
      indikatorYangDiamati: 'Bukti dari Device B',
    });
    const remA = createRemedialHistoryEntry({
      tp: { id: tpList[0].id, kode: tpList[0].kode },
      jenisIntervensi: 'kelompok_kecil',
      hasilSebelum: { skor: 60, skalaSkor: 100, persentase: 60, status: 'Perlu Bimbingan' },
      statusTindakLanjut: 'berlangsung',
    });

    const baseHarian: KelasHarianData = {
      rombel: 'VIII A',
      mataPelajaran: 'Matematika',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      bobotNilai: { bobotFormatif: 50, bobotSTS: 25, bobotSAS: 25, kktpMinTuntas: 75 },
      daftarSiswa: [
        { id: 's1', noUrut: 1, nis: '301', nama: 'Siswa 1', jenisKelamin: 'L' },
        { id: 's2', noUrut: 2, nis: '302', nama: 'Siswa 2', jenisKelamin: 'P' },
      ],
      daftarPresensi: [],
      daftarJurnal: [],
      daftarNilai: [
        makeStudentNilai('s1', 'Siswa 1', '301', { buktiAsesmenSubTP: [evA], riwayatRemedial: [remA] }),
        makeStudentNilai('s2', 'Siswa 2', '302'),
      ],
    };

    // Backup & Restore check
    localStorage.setItem('asesmerdeka_harian_v2_test', JSON.stringify(baseHarian));
    const backup = exportBackupDataJson();
    localStorage.clear();
    const restoreRes = importBackupDataJson(backup);
    expect(restoreRes.success).toBe(true);
    const restoredHarian = JSON.parse(
      localStorage.getItem('asesmerdeka_harian_v2_test') || '{}'
    ) as KelasHarianData;
    expect(restoredHarian.daftarNilai[0].buktiAsesmenSubTP).toHaveLength(1);
    expect(restoredHarian.daftarNilai[0].riwayatRemedial).toHaveLength(1);
    expect(restoredHarian.bobotNilai?.kktpMinTuntas).toBe(75);

    // Cloud Sync 3-way merge kasus non-konflik:
    // Device A menambah evA2 pada Siswa 1, Device B menambah evB pada Siswa 1 & mengisi STS Siswa 2
    const evA2 = { ...evA, id: 'ev_a2', indikatorYangDiamati: 'Bukti tambahan A2' };
    const localHarian: KelasHarianData = {
      ...baseHarian,
      daftarNilai: [
        { ...baseHarian.daftarNilai[0], buktiAsesmenSubTP: [evA, evA2] },
        baseHarian.daftarNilai[1],
      ],
    };
    const serverHarian: KelasHarianData = {
      ...baseHarian,
      daftarNilai: [
        { ...baseHarian.daftarNilai[0], buktiAsesmenSubTP: [evA, evB] },
        { ...baseHarian.daftarNilai[1], nilaiSTS: 88 },
      ],
    };

    const mergeNonConflict = analyzeWorkspaceConflict(
      { asesmerdeka_harian_v2_k1: baseHarian },
      { asesmerdeka_harian_v2_k1: localHarian },
      { asesmerdeka_harian_v2_k1: serverHarian }
    );
    expect(mergeNonConflict.conflicts).toHaveLength(0);
    const mergedHarian = mergeNonConflict.mergedEntries['asesmerdeka_harian_v2_k1'] as KelasHarianData;
    const s1Merged = mergedHarian.daftarNilai.find((n) => n.siswaId === 's1')!;
    const s2Merged = mergedHarian.daftarNilai.find((n) => n.siswaId === 's2')!;
    expect(s1Merged.buktiAsesmenSubTP?.map((e) => e.id)).toEqual(
      expect.arrayContaining([evA.id, 'ev_a2', evB.id])
    );
    expect(s1Merged.riwayatRemedial).toHaveLength(1);
    expect(s2Merged.nilaiSTS).toBe(88);

    // Kasus konflik konkuren: Device A dan Device B mengubah bukti `evA` yang SAMA secara berbeda
    const localConflictHarian: KelasHarianData = {
      ...baseHarian,
      daftarNilai: [
        {
          ...baseHarian.daftarNilai[0],
          buktiAsesmenSubTP: [{ ...evA, skor: 78, indikatorYangDiamati: 'Revisi A' }],
        },
        baseHarian.daftarNilai[1],
      ],
    };
    const serverConflictHarian: KelasHarianData = {
      ...baseHarian,
      daftarNilai: [
        {
          ...baseHarian.daftarNilai[0],
          buktiAsesmenSubTP: [{ ...evA, skor: 65, indikatorYangDiamati: 'Revisi B' }],
        },
        baseHarian.daftarNilai[1],
      ],
    };
    const conflictAnalysis = analyzeWorkspaceConflict(
      { asesmerdeka_harian_v2_k1: baseHarian },
      { asesmerdeka_harian_v2_k1: localConflictHarian },
      { asesmerdeka_harian_v2_k1: serverConflictHarian }
    );
    expect(conflictAnalysis.conflicts.length).toBe(1);
    const conflictItem = conflictAnalysis.conflicts[0];
    expect(conflictItem.locator.kind).toBe('harian_nilai_subrecord');

    // Resolusi memilih 'server' memperbarui item konflik tanpa menghapus riwayat remedial
    const pending: CloudPendingConflict = {
      baseRevision: 1,
      serverRevision: 2,
      serverUpdatedAt: new Date().toISOString(),
      lastDeviceId: 'dev_b',
      localEntries: { asesmerdeka_harian_v2_k1: localConflictHarian },
      serverEntries: { asesmerdeka_harian_v2_k1: serverConflictHarian },
      mergedEntries: conflictAnalysis.mergedEntries,
      autoMergedSummary: conflictAnalysis.autoMergedSummary,
      conflicts: conflictAnalysis.conflicts,
    };
    const resolvedEntries = applyConflictChoicesToMergedEntries(pending, {
      [conflictItem.id]: 'server',
    });
    const resolvedHarian = resolvedEntries['asesmerdeka_harian_v2_k1'] as KelasHarianData;
    expect(resolvedHarian.daftarNilai[0].buktiAsesmenSubTP?.[0].skor).toBe(65);
    expect(resolvedHarian.daftarNilai[0].riwayatRemedial).toHaveLength(1);
  });
});
