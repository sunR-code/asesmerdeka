import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import { Packer, Document } from 'docx';
import React from 'react';
import { render } from '@testing-library/react';
import type { AsesmenDokumen, SoalPilihanGanda } from '../../types/assessment';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import {
  analyzeQuestionCognitiveDemand,
  analyzeCognitiveDistribution,
} from '../cognitiveLevelEngine';
import {
  UNIFIED_KKTP_INTERVALS,
  buildAssessmentClipboardText,
  enrichDocWithQualityAndCognitive,
  repairBalancedPGOptions,
  selectSafeOptionIndexFromBank,
  validateAsesmenDokumen,
} from '../assessmentQualityEngine';
import {
  AiGenerationError,
  generateAsesmen,
  generateRangkumanMateri,
} from '../../services/aiGenerator';
import { callGeminiStructuredJSON } from '../../services/geminiClient';
import {
  deleteNaskahUjianDraft,
  generateSmartNaskahUjian,
  loadNaskahUjianDraft,
  saveNaskahUjianDraft,
  validateNaskahUjian,
} from '../examSemesterEngine';
import {
  getBankSoal,
  saveToBankSoal,
} from '../bankSoalStorage';
import {
  getBankRangkuman,
  saveToBankRangkuman,
} from '../bankRangkumanStorage';
import {
  verifyDescriptiveStats,
  verifyRightTriangleSides,
} from '../lkpdMathVerifier';
import { validateLKPDDokumen } from '../lkpdValidator';
import { buildSmartLKPD, buildSmartModulAjar } from '../perangkatAjarEngine';
import { buildModulAjarGeminiPrompt } from '../modulAjarAiService';
import { buildCuratedOrAdaptiveLKPDContent } from '../lkpdCurriculumFixtures';
import {
  buildAssessmentDocx,
  buildRangkumanDocx,
} from '../docx/docxAsesmenRangkuman';
import { buildNaskahUjianDocx } from '../docx/docxUjianSemester';
import {
  buildLKPDElements,
  buildModulAjarElements,
} from '../docx/docxPerangkatAjar';
import { saveGeminiKey, requireActiveLicenseForAction } from '../licenseManager';
import { resolveSchoolId } from '../storageIdentity';
import { AssessmentViewer } from '../../components/AssessmentViewer';
import { BankSoalView } from '../../components/BankSoalView';
import { LKPDViewer } from '../../components/LKPDViewer';

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

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_uji_task5_01',
    instansiDinas: 'Dinas Pendidikan Kota Uji',
    namaSekolah: 'SMP Negeri 1 Uji Mutu',
    alamatSekolah: 'Jl. Merdeka No. 10',
    kotaSekolah: 'Bandung',
    namaKepalaSekolah: 'Drs. Ahmad Kepala, M.Pd.',
    nipKepalaSekolah: '197001011995011001',
    namaGuru: 'Ibu Sari Guru, S.Pd.',
    nipGuru: '198505052010012002',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: '8A',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    pakaiFormatKopSekolah: true,
    tampilkanTandaTangan: true,
    ...overrides,
  };
}

function makeTP(overrides: Partial<CustomTPItem> = {}): CustomTPItem {
  return {
    id: 'tpid_mat_8_spldv_01',
    kode: '8.1',
    elemen: 'Aljabar',
    materiPokok: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
    tujuanPembelajaran:
      'Peserta didik mampu memodelkan masalah kontekstual ke dalam SPLDV dan menyelesaikannya secara tepat.',
    alokasiJP: 6,
    subTP: [
      {
        id: 'subtp_spldv_1',
        kode: '8.1.1',
        kompetensi: 'Menyusun model matematika dua variabel dari masalah harga',
        fokusMateri: 'Variabel dan koefisien persamaan linear',
        buktiKetercapaian: 'Siswa menuliskan dua persamaan linear dengan benar',
      },
      {
        id: 'subtp_spldv_2',
        kode: '8.1.2',
        kompetensi: 'Menghitung nilai variabel menggunakan eliminasi dan substitusi',
        fokusMateri: 'Metode penyelesaian SPLDV',
        buktiKetercapaian: 'Nilai x dan y konsisten saat disubstitusikan kembali',
      },
    ],
    ...overrides,
  };
}

async function extractDocxText(doc: Document): Promise<string> {
  const blobOrBuf = await Packer.toArrayBuffer(doc);
  const zip = await JSZip.loadAsync(blobOrBuf);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) {
    throw new Error('word/document.xml tidak ditemukan pada arsip DOCX');
  }
  return docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

describe('Task 5 — Assessment Quality & Content Intelligence (18 Regression Cases)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('Case 1: Option E key never drops to broken answer when sliced to SD/SMP 4 options, and keys balance across slots', () => {
    const rawFiveOptions = [
      'Opsi pertama yang kurang tepat',
      'Opsi kedua yang kurang tepat',
      'Opsi ketiga yang kurang tepat',
      'Opsi keempat yang kurang tepat',
      'Opsi kelima adalah jawaban benar',
    ];

    // Slicing from 5 options down to 4 (SD) when original key is E must relocate key safely into [A..D]
    const safeSD = selectSafeOptionIndexFromBank(rawFiveOptions, 'E', 4, 2);
    expect(safeSD.pilihan).toHaveLength(4);
    expect(['A', 'B', 'C', 'D']).toContain(safeSD.kunci);
    const matchedOpt = safeSD.pilihan.find((p) => p.label === safeSD.kunci);
    expect(matchedOpt?.teks).toBe('Opsi kelima adalah jawaban benar');

    // SMA keeps 5 options intact
    const safeSMA = selectSafeOptionIndexFromBank(rawFiveOptions, 'E', 5, 4);
    expect(safeSMA.pilihan).toHaveLength(5);
    expect(safeSMA.pilihan.map((p) => p.label)).toEqual(['A', 'B', 'C', 'D', 'E']);

    // Balance check: rotating targetIndex distributes keys evenly while updating explanation text
    const balanced = Array.from({ length: 8 }, (_, idx) =>
      repairBalancedPGOptions(
        {
          opsi5: [
            `Jawaban Benar ${idx + 5}`,
            'Pengecoh 1 yang masuk akal',
            'Pengecoh 2 yang masuk akal',
            'Pengecoh 3 yang masuk akal',
          ],
          kunci: 'A',
          pembahasan: 'Karena jawaban yang benar adalah opsi A sesuai penjumlahan dasar.',
        },
        ['A', 'B', 'C', 'D'],
        idx
      )
    );
    const dist = new Set(balanced.map((q) => q.kunci));
    expect(dist.size).toBe(4);
    balanced.forEach((q) => {
      const correctOpt = q.pilihan.find((p) => p.label === q.kunci);
      expect(correctOpt?.teks).toContain('Jawaban Benar');
      expect(q.pembahasan).toContain(`[Kunci: ${q.kunci}]`);
    });
  });

  it('Case 2: Bloom cognitive validation catches C1 recall mislabeled as HOTS C5 and warns skewed distribution', () => {
    const mislabeledSoal: SoalPilihanGanda = {
      id: 'q-c1-as-c5',
      nomor: 1,
      tipe: 'pilihan_ganda',
      pertanyaan: 'Siapa presiden pertama Republik Indonesia?',
      pilihan: [
        { label: 'A', teks: 'Ir. Soekarno' },
        { label: 'B', teks: 'Mohammad Hatta' },
        { label: 'C', teks: 'Soeharto' },
        { label: 'D', teks: 'B.J. Habibie' },
      ],
      kunci: 'A',
      pembahasan: 'Ir. Soekarno merupakan presiden pertama Republik Indonesia sejak 1945.',
      levelKognitif: 'C5 (Mengevaluasi / HOTS)',
      bloomLevel: 'C5',
      indikatorSoal: 'Mengingat tokoh proklamator.',
      skor: 1,
    };

    const demand = analyzeQuestionCognitiveDemand(mislabeledSoal);
    expect(demand.inferredTier).toBe('LOTS');
    expect(demand.claimedTier).toBe('HOTS');
    expect(demand.isMismatch).toBe(true);
    expect(demand.needsTeacherReview).toBe(true);

    const hotsDist = analyzeCognitiveDistribution([mislabeledSoal], 'HOTS (C4-C6)');
    expect(hotsDist.meetsRequestedTarget).toBe(false);
    expect(hotsDist.warning).toBeTruthy();
  });

  it('Case 3: Duplicate stem detection, generic slop validation, and PGK worksheet copy without key leak', () => {
    const dupDoc: AsesmenDokumen = enrichDocWithQualityAndCognitive({
      id: 'asm_dup_test',
      createdAt: '2026-11-12',
      judul: 'Uji Mutu Soal',
      mataPelajaran: 'IPA',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      tipeAsesmen: 'Formatif (Proses Pembelajaran)',
      alokasiWaktu: '40 Menit',
      tahunAjaran: '2026/2027',
      namaSekolah: 'SMP Uji',
      namaPenyusun: 'Guru Uji',
      capaianPembelajaran: 'Memahami fotosintesis',
      tujuanPembelajaran: ['Menjelaskan faktor fotosintesis'],
      materiPokok: 'Fotosintesis',
      profilPelajarPancasila: ['Bernalar Kritis'],
      petunjukUmum: ['Bacalah soal dengan saksama.'],
      rubrikKKTP: [],
      soalList: [
        {
          id: 'q1',
          nomor: 1,
          tipe: 'pilihan_ganda',
          pertanyaan: 'Mengapa pemahaman konsep dasar pada materi Fotosintesis sangat penting bagi manusia?',
          pilihan: [
            { label: 'A', teks: 'Mengubah energi cahaya menjadi energi kimia pada kloroplas' },
            { label: 'B', teks: 'Menghambat penguapan air pada akar' },
            { label: 'C', teks: 'Menggantikan fungsi karbon dioksida' },
            { label: 'D', teks: 'Agar bisa menebak tanpa perlu membaca soal' },
          ],
          kunci: 'A',
          pembahasan: 'Cahaya matahari diperlukan dalam reaksi terang fotosintesis.',
          levelKognitif: 'C4 (Menganalisis)',
          indikatorSoal: 'Menganalisis peran cahaya.',
          skor: 1,
          tpKode: 'TP-1',
        },
        {
          id: 'q2',
          nomor: 2,
          tipe: 'pilihan_ganda',
          pertanyaan: 'Mengapa pemahaman konsep dasar pada materi Fotosintesis sangat penting bagi manusia!',
          pilihan: [
            { label: 'A', teks: 'Mengubah energi cahaya menjadi energi kimia' },
            { label: 'B', teks: 'Menghambat penguapan' },
            { label: 'C', teks: 'Mengganti CO2' },
            { label: 'D', teks: 'Menghasilkan N2' },
          ],
          kunci: 'A',
          pembahasan: 'Kunci berada pada opsi A.',
          levelKognitif: 'C4 (Menganalisis)',
          indikatorSoal: 'Menganalisis peran cahaya.',
          skor: 1,
          tpKode: 'TP-1',
        },
        {
          id: 'q3-pgk',
          nomor: 3,
          tipe: 'pilihan_ganda_kompleks',
          pertanyaan: 'Tentukan pernyataan yang tepat mengenai fotosintesis!',
          pernyataan: [
            { id: 'p1', teks: 'Klorofil menangkap energi cahaya matahari.', isBenar: true },
            { id: 'p2', teks: 'Proses fotosintesis hanya terjadi tanpa air.', isBenar: false },
          ],
          pembahasan: 'PEMBAHASAN RAHASIA YANG TIDAK BOLEH BOCOR',
          levelKognitif: 'C3 (Menerapkan)',
          indikatorSoal: 'Memverifikasi proses fotosintesis.',
          skor: 2,
          tpKode: 'TP-1',
        },
      ],
    });

    const summary = validateAsesmenDokumen(dupDoc);
    expect(summary.duplicateCount).toBeGreaterThanOrEqual(1);
    expect(summary.issues.some((i) => i.code === 'generic_slop')).toBe(true);
    expect(summary.canFinalize).toBe(false);

    // Verify worksheet rendering and clipboard text do NOT leak PGK answers or pembahasan, while teacher_guide includes them
    localStorage.setItem(
      'asesmerdeka_user_quota',
      JSON.stringify({ tier: 'guru', remainingCredits: 50, maxCredits: 100, deviceId: 'dev_test' })
    );

    const { html: worksheetHtml } = render(
      React.createElement(AssessmentViewer, {
        assessment: dupDoc,
        mode: 'worksheet',
        quota: { tier: 'guru', remainingCredits: 50, maxCredits: 100, deviceId: 'dev_test' },
        onUpdateAssessment: vi.fn(),
        onSwitchMode: vi.fn(),
        onPrint: vi.fn(),
        onBackToGenerator: vi.fn(),
      })
    );
    expect(worksheetHtml).toContain('Klorofil menangkap energi cahaya matahari.');
    expect(worksheetHtml).not.toContain('PEMBAHASAN RAHASIA');

    const copiedWorksheet = buildAssessmentClipboardText(dupDoc, 'worksheet');
    expect(copiedWorksheet).toContain('Klorofil menangkap energi cahaya matahari.');
    expect(copiedWorksheet).toContain('[Benar / Salah]');
    expect(copiedWorksheet).not.toContain('[BENAR]');
    expect(copiedWorksheet).not.toContain('[SALAH]');
    expect(copiedWorksheet).not.toContain('PEMBAHASAN RAHASIA');

    const copiedGuide = buildAssessmentClipboardText(dupDoc, 'teacher_guide');
    expect(copiedGuide).toContain('[BENAR]');
    expect(copiedGuide).toContain('PEMBAHASAN RAHASIA');
  });

  it('Case 4: Non-PPKn STS/SAS exam contains zero Pancasila leakage and rubrikUraian preserves contohJawaban + pedomanPenskoran', () => {
    const mathProfile = makeProfile({
      jenjang: 'SMP/MTs',
      kelasUtama: '8',
      mataPelajaranUtama: 'Matematika',
    });
    const tps = [
      makeTP(),
      makeTP({
        id: 'tpid_mat_8_pyth_02',
        kode: '8.2',
        elemen: 'Geometri',
        materiPokok: 'Teorema Pythagoras',
        tujuanPembelajaran: 'Menentukan panjang sisi segitiga siku-siku dengan Teorema Pythagoras.',
      }),
    ];

    const naskah = generateSmartNaskahUjian(mathProfile, tps, {
      tipe: 'STS',
      alokasiWaktu: '90 Menit',
      preferBankSoal: false,
      presetId: 'akm_merdeka',
    });

    const serializedPGandUraian = [
      ...naskah.soalPG.map((q) => `${q.stimulus || ''} ${q.pertanyaan} ${q.pilihan.map((o) => o.teks).join(' ')}`),
      ...naskah.soalPGK.map((q) => `${q.stimulus || ''} ${q.pertanyaan} ${q.pernyataan.map((p) => p.teks).join(' ')}`),
      ...naskah.soalUraian.map((q) => `${q.stimulus || ''} ${q.pertanyaan}`),
    ].join('\n');

    expect(serializedPGandUraian.toLowerCase()).not.toContain('pancasila');
    expect(serializedPGandUraian.toLowerCase()).not.toContain('ketuhanan yang maha esa');
    expect(naskah.rubrikUraian.length).toBeGreaterThan(0);
    naskah.rubrikUraian.forEach((rub) => {
      expect(rub.contohJawaban).toBeTruthy();
      expect(rub.pedomanPenskoran).toBeTruthy();
    });
  });

  it('Case 5: Bank Soal scoped docs integrate into Naskah Ujian with exact tpTerliput & skorMaksimalTotal sum', () => {
    const profile = makeProfile();
    const tps = [makeTP()];

    const bankDoc: AsesmenDokumen = {
      id: 'asm_bank_scoped_01',
      createdAt: '2026-11-12',
      judul: 'Asesmen Harian SPLDV',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      rombel: '8A',
      semester: '1 (Ganjil)',
      schoolId: resolveSchoolId(profile),
      tipeAsesmen: 'Formatif (Proses Pembelajaran)',
      alokasiWaktu: '60 Menit',
      tahunAjaran: '2026/2027',
      namaSekolah: profile.namaSekolah,
      namaPenyusun: profile.namaGuru,
      capaianPembelajaran: 'Aljabar SPLDV',
      tujuanPembelajaran: [tps[0].tujuanPembelajaran],
      tpIds: [tps[0].id],
      materiPokok: 'SPLDV',
      profilPelajarPancasila: ['Bernalar Kritis'],
      petunjukUmum: ['Kerjakan secara mandiri.'],
      rubrikKKTP: [],
      soalList: [
        {
          id: 'bank-pg-spldv-1',
          nomor: 1,
          tipe: 'pilihan_ganda',
          stimulus: 'Harga 2 buku dan 1 pensil adalah Rp11.000, sedangkan 1 buku dan 1 pensil Rp7.000.',
          pertanyaan: 'Berapakah harga 1 buku tulis pada kasus SPLDV tersebut?',
          pilihan: [
            { label: 'A', teks: 'Rp3.000' },
            { label: 'B', teks: 'Rp4.000' },
            { label: 'C', teks: 'Rp5.000' },
            { label: 'D', teks: 'Rp6.000' },
          ],
          kunci: 'B',
          pembahasan: 'Dari x + y = 7000 dan 2x + y = 11000 diperoleh x = Rp4.000.',
          levelKognitif: 'C3 (Menerapkan)',
          indikatorSoal: 'Menyelesaikan model SPLDV dua persamaan.',
          skor: 2,
          tpId: tps[0].id,
          tpKode: tps[0].kode,
        },
      ],
    };

    saveToBankSoal(bankDoc, profile);

    const naskah = generateSmartNaskahUjian(profile, tps, {
      tipe: 'STS',
      alokasiWaktu: '90 Menit',
      preferBankSoal: true,
      selectedBankDocIds: [bankDoc.id],
    });

    expect(naskah.sourceSummary?.fromBankSoal).toBeGreaterThanOrEqual(1);
    expect(naskah.soalPG.some((q) => q.pertanyaan.includes('harga 1 buku tulis pada kasus SPLDV'))).toBe(true);

    const expectedTotalScore =
      naskah.kunciPG.reduce((s, k) => s + k.skor, 0) +
      (naskah.kunciPGK || []).reduce((s, k) => s + k.skor, 0) +
      naskah.rubrikUraian.reduce((s, r) => s + r.skorMaksimal, 0);
    expect(naskah.skorMaksimalTotal).toBe(expectedTotalScore);

    const sumAlloc = naskah.tpTerliput.reduce((s, t) => s + t.alokasiSoal, 0);
    expect(sumAlloc).toBe(naskah.totalSoal);
  });

  it('Case 6: validateNaskahUjian blocks empty/duplicate/invalid-key exams and draft storage round-trips edits per scope', () => {
    const profile = makeProfile();
    const validNaskah = generateSmartNaskahUjian(profile, [makeTP()], {
      tipe: 'SAS',
      alokasiWaktu: '90 Menit',
    });

    const validRes = validateNaskahUjian(validNaskah);
    expect(validRes.errors).toEqual([]);
    expect(validRes.valid).toBe(true);

    // Invalid empty exam
    const brokenEmpty = { ...validNaskah, soalPG: [], soalPGK: [], soalUraian: [] };
    const emptyCheck = validateNaskahUjian(brokenEmpty);
    expect(emptyCheck.valid).toBe(false);
    expect(emptyCheck.errors.length).toBeGreaterThan(0);

    // Duplicate question & invalid key
    const brokenDup = {
      ...validNaskah,
      soalPG: [
        { ...validNaskah.soalPG[0], kunci: 'Z' as any },
        { ...validNaskah.soalPG[0], id: 'dup2', nomor: 2 },
      ],
    };
    const dupCheck = validateNaskahUjian(brokenDup);
    expect(dupCheck.valid).toBe(false);
    expect(dupCheck.errors.some((e) => e.includes('kunci'))).toBe(true);
    expect(dupCheck.errors.some((e) => e.includes('duplikat'))).toBe(true);

    // Draft round-trip
    const edited = { ...validNaskah, namaUjian: 'SUMATIF AKHIR SEMESTER KHUSUS REVISI' };
    expect(saveNaskahUjianDraft(edited, profile)).toBe(true);
    const loaded = loadNaskahUjianDraft(profile, 'SAS');
    expect(loaded?.namaUjian).toBe('SUMATIF AKHIR SEMESTER KHUSUS REVISI');

    // Different school/subject is isolated
    const otherProfile = makeProfile({ schoolId: 'sch_lain_99', mataPelajaranUtama: 'IPA' });
    expect(loadNaskahUjianDraft(otherProfile, 'SAS')).toBeNull();
    deleteNaskahUjianDraft(profile, 'SAS');
  });

  it('Case 7: End-to-end TP ID & Sub-TP traceability preserved through generateAsesmen', async () => {
    const tp = makeTP();
    const geminiPayload = {
      judul: 'Asesmen SPLDV Terstruktur',
      capaianPembelajaran: 'Aljabar Fase D',
      tujuanPembelajaran: [tp.tujuanPembelajaran],
      profilPelajarPancasila: ['Bernalar Kritis'],
      petunjukUmum: ['Baca soal dengan teliti.'],
      soalList: [
        {
          nomor: 1,
          tipe: 'pilihan_ganda',
          tpId: tp.id,
          tpKode: tp.kode,
          subTpId: tp.subTP![0].id,
          stimulus: 'Di kantin sekolah, 2 roti dan 1 susu seharga Rp14.000 sedangkan 1 roti dan 1 susu seharga Rp9.000.',
          pertanyaan: 'Model SPLDV yang paling tepat jika x = harga roti dan y = harga susu adalah...',
          pilihan: [
            { label: 'A', teks: '2x + y = 14.000 dan x + y = 9.000' },
            { label: 'B', teks: 'x + 2y = 14.000 dan x + y = 9.000' },
            { label: 'C', teks: '2x + 2y = 14.000 dan x + y = 9.000' },
            { label: 'D', teks: 'x + y = 14.000 dan 2x + y = 9.000' },
          ],
          kunci: 'A',
          pembahasan: 'Berdasarkan pernyataan pertama 2x + y = 14.000 dan kedua x + y = 9.000 (Pilihan A).',
          bloomLevel: 'C3',
          levelKognitif: 'C3 (Menerapkan)',
          indikatorSoal: 'Menyusun model SPLDV.',
          skor: 10,
        },
      ],
      rubrikKKTP: [
        {
          tujuanPembelajaran: tp.tujuanPembelajaran,
          buktiKetercapaian: 'Memodelkan dan menyelesaikan SPLDV',
          perluBimbingan: `Skor ${UNIFIED_KKTP_INTERVALS.perluBimbingan}: Belum mampu menyusun persamaan.`,
          cukup: `Skor ${UNIFIED_KKTP_INTERVALS.cukup}: Mampu menyusun satu persamaan.`,
          baik: `Skor ${UNIFIED_KKTP_INTERVALS.baik}: Mampu menyusun dua persamaan dengan benar.`,
          sangatBaik: `Skor ${UNIFIED_KKTP_INTERVALS.sangatBaik}: Memodelkan serta membuktikan nilai x dan y tepat.`,
        },
      ],
    };

    saveGeminiKey('AIzaSyTestFakeKey12345');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              finishReason: 'STOP',
              content: { parts: [{ text: JSON.stringify(geminiPayload) }] },
            },
          ],
        }),
      })
    );

    const doc = await generateAsesmen({
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      rombel: '8A',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      schoolId: 'sch_uji_task5_01',
      tipeAsesmen: 'Formatif (Proses Pembelajaran)',
      materiPokok: tp.materiPokok,
      tujuanPembelajaranInput: tp.tujuanPembelajaran,
      tpId: tp.id,
      tpKode: tp.kode,
      subTpIds: tp.subTP!.map((s) => s.id),
      tpListContext: [
        {
          id: tp.id,
          kode: tp.kode,
          materiPokok: tp.materiPokok,
          deskripsi: tp.tujuanPembelajaran,
          subTP: tp.subTP!.map((s) => ({ id: s.id, kode: s.kode, deskripsi: s.kompetensi })),
        },
      ],
      jumlahPG: 1,
      jumlahPGK: 0,
      jumlahUraian: 0,
      levelKognitif: 'MOTS (C3)',
      sertakanRubrik: true,
      alokasiWaktu: '40 Menit',
    });

    expect(doc.generationSource).toBe('ai_generated');
    expect(doc.tpIds).toContain(tp.id);
    expect(doc.subTpIds).toContain(tp.subTP![0].id);
    expect(doc.soalList[0].tpId).toBe(tp.id);
    expect(doc.soalList[0].subTpId).toBe(tp.subTP![0].id);
    expect(doc.soalList[0].tpKode).toBe(tp.kode);
  });

  it('Case 8: Explicit AI error throws by default without silent fallback; BYOK 503 falls back cleanly to /api/gemini; opt-in allowOfflineFallback works', async () => {
    saveGeminiKey('AIzaSyTestFakeKey12345');

    // First: BYOK fails with 503 AND /api/gemini fails with 503 -> must THROW AiGenerationError when allowOfflineFallback is omitted
    const fetchMockFail = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service temporarily overloaded' }),
    });
    vi.stubGlobal('fetch', fetchMockFail);

    const baseReq = {
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)' as const,
      kelas: '8',
      tipeAsesmen: 'Formatif (Proses Pembelajaran)' as const,
      materiPokok: 'SPLDV',
      tujuanPembelajaranInput: 'Menyelesaikan SPLDV',
      jumlahPG: 2,
      jumlahPGK: 0,
      jumlahUraian: 0,
      levelKognitif: 'Campuran Berimbang' as const,
      sertakanRubrik: true,
      alokasiWaktu: '40 Menit',
    };

    await expect(generateAsesmen(baseReq)).rejects.toThrow(AiGenerationError);

    // Explicitly opting into offline fallback succeeds cleanly and flags usedFallback: true
    const fallbackDoc = await generateAsesmen({ ...baseReq, allowOfflineFallback: true });
    expect(fallbackDoc.usedFallback).toBe(true);
    expect(fallbackDoc.generationSource).toBe('adaptive_fallback');
    expect(fallbackDoc.soalList.length).toBeGreaterThan(0);

    // Call 1 (Direct Google) returns 503, Call 2 (/api/gemini) succeeds -> callGeminiStructuredJSON recovers automatically
    const fetchRecover = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Transient 503' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify({ recovered: true }) }] },
              },
            ],
          },
        }),
      });
    vi.stubGlobal('fetch', fetchRecover);
    const recovered = await callGeminiStructuredJSON({ prompt: 'test recovery' });
    expect(recovered.recovered).toBe(true);
    expect(fetchRecover).toHaveBeenCalledTimes(2);
  });

  it('Case 9: MAX_TOKENS partial recovery keeps valid unique items and drops truncated/duplicate items with warning', async () => {
    saveGeminiKey('AIzaSyTestFakeKey12345');
    const partialPayload = {
      judul: 'Asesmen Pemulihan Token',
      capaianPembelajaran: 'Aljabar',
      tujuanPembelajaran: ['Memahami persamaan linear'],
      profilPelajarPancasila: ['Mandiri'],
      petunjukUmum: ['Jawablah semua pertanyaan.'],
      soalList: [
        {
          nomor: 1,
          tipe: 'pilihan_ganda',
          stimulus: 'Diketahui keliling persegi panjang adalah 24 cm dengan panjang 8 cm.',
          pertanyaan: 'Berapakah lebar persegi panjang tersebut?',
          pilihan: [
            { label: 'A', teks: '4 cm' },
            { label: 'B', teks: '6 cm' },
            { label: 'C', teks: '8 cm' },
            { label: 'D', teks: '12 cm' },
          ],
          kunci: 'A',
          pembahasan: 'Keliling 2(p+l)=24 -> 8+l=12 -> l=4 cm (Pilihan A).',
          levelKognitif: 'C3 (Menerapkan)',
          indikatorSoal: 'Menghitung lebar persegi panjang.',
          skor: 1,
        },
        {
          // Duplicate question text should be deduped
          nomor: 2,
          tipe: 'pilihan_ganda',
          pertanyaan: 'Berapakah lebar persegi panjang tersebut?',
          pilihan: [
            { label: 'A', teks: '4 cm' },
            { label: 'B', teks: '6 cm' },
            { label: 'C', teks: '8 cm' },
            { label: 'D', teks: '12 cm' },
          ],
          kunci: 'A',
          pembahasan: 'Duplikat',
          levelKognitif: 'C3 (Menerapkan)',
          indikatorSoal: 'Duplikat',
          skor: 1,
        },
        {
          // Truncated invalid item (less than 4 options) should be discarded gracefully
          nomor: 3,
          tipe: 'pilihan_ganda',
          pertanyaan: 'Terpotong...',
          pilihan: [{ label: 'A', teks: 'Hanya satu opsi' }],
          kunci: 'A',
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              finishReason: 'MAX_TOKENS',
              content: { parts: [{ text: JSON.stringify(partialPayload) }] },
            },
          ],
        }),
      })
    );

    const res = await generateAsesmen({
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      tipeAsesmen: 'Formatif (Proses Pembelajaran)',
      materiPokok: 'Persegi Panjang',
      tujuanPembelajaranInput: 'Menghitung lebar persegi panjang',
      jumlahPG: 3,
      jumlahPGK: 0,
      jumlahUraian: 0,
      levelKognitif: 'MOTS (C3)',
      sertakanRubrik: false,
      alokasiWaktu: '40 Menit',
    });

    expect(res.soalList).toHaveLength(1);
    expect(res.soalList[0].pertanyaan).toContain('lebar persegi panjang');
    expect(res.fallbackReason).toMatch(/MAX_TOKENS|terpotong|sebagian/i);
  });

  it('Case 10: Rangkuman grounded to TP/materi with honest provenance and DOCX deduplication of numbering/emoji', async () => {
    const rangkuman = await generateRangkumanMateri({
      modeInput: 'keinginan_user',
      topik: 'Sistem Persamaan Linear Dua Variabel',
      catatanKeinginan: 'Fokus pada pemodelan harga barang di pasar tradisional dan eliminasi sederhana',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      rombel: '8A',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      schoolId: 'sch_uji_task5_01',
      tpId: 'tpid_mat_8_spldv_01',
      tpKode: '8.1',
      gayaBahasa: 'Struktur Ringkas & Poin Kunci (Infografis)',
      allowOfflineFallback: true,
    });

    expect(rangkuman.usedFallback).toBe(true);
    expect(rangkuman.tpId).toBe('tpid_mat_8_spldv_01');
    expect(rangkuman.topik).toContain('Sistem Persamaan Linear Dua Variabel');

    // Test DOCX cleans duplicate "1. 1." and duplicate lightbulb emoji prefixes
    rangkuman.petaKonsep = ['1. Definisi SPLDV', '2. Metode Eliminasi'];
    rangkuman.faktaMenarik = ['💡 Fakta penting tentang keseimbangan dua persamaan'];

    const doc = await buildRangkumanDocx(rangkuman, true);
    const xmlText = await extractDocxText(doc);
    expect(xmlText).not.toContain('1. 1.');
    expect(xmlText).not.toContain('💡 💡');
  });

  it('Case 11: Modul Ajar dynamic JP duration (SD 35 / SMP 40 / SMA 45) & dynamic model sintaks prompt', () => {
    const tp = makeTP({ alokasiJP: 2 });
    const sdMod = buildSmartModulAjar(tp, makeProfile({ jenjang: 'SD/MI', kelasUtama: '5', mataPelajaranUtama: 'Matematika' }));
    const smpMod = buildSmartModulAjar(tp, makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' }));
    const smaMod = buildSmartModulAjar(tp, makeProfile({ jenjang: 'SMA/MA', kelasUtama: '11', mataPelajaranUtama: 'Matematika' }));

    // 2 JP * (35 / 40 / 45) = 70 / 80 / 90 minutes total across pertemuan
    const sumMinutes = (m: ReturnType<typeof buildSmartModulAjar>) =>
      m.kegiatanPembelajaran.reduce((s, k) => s + k.alokasiMenit, 0);
    expect(sumMinutes(sdMod)).toBe(70);
    expect(sumMinutes(smpMod)).toBe(80);
    expect(sumMinutes(smaMod)).toBe(90);

    const pjblPrompt = buildModulAjarGeminiPrompt(tp, makeProfile(), 'pjbl', 'Kantin Sekolah');
    expect(pjblPrompt).toContain('Project-Based Learning (PjBL)');
    expect(pjblPrompt).toContain('essential question');
    expect(pjblPrompt).toContain('40 menit/JP');
  });

  it('Case 12: LKPD math verifier catches false Pythagoras/mean claims and unrelated topics return adaptive fallback instead of false curated fixture', () => {
    expect(verifyRightTriangleSides(3, 4, 5)).toBe(true);
    expect(verifyRightTriangleSides(3, 4, 6)).toBe(false);

    const stats = verifyDescriptiveStats([70, 90, 80, 80]);
    expect(stats.mean).toBe(80);
    expect(stats.median).toBe(80);
    expect(stats.sorted).toEqual([70, 80, 80, 90]);

    const tp = makeTP({
      id: 'tpid_geo_1',
      kode: '8.9',
      materiPokok: 'Barisan dan Deret Geometri',
      tujuanPembelajaran: 'Menentukan suku ke-n barisan geometri.',
    });
    const content = buildCuratedOrAdaptiveLKPDContent(tp, makeProfile(), 'kasus', 'Pertumbuhan bakteri');
    expect(content.isCuratedFixture).toBe(false);
    expect(content.stimulusKasus.judul).toMatch(/Barisan dan Deret Geometri|Pertumbuhan bakteri/i);
  });

  it('Case 13: LKPD validator detects Pythagoras math error & checks 9 structured completeness + key parity + produkHasilBelajar', () => {
    const tp = makeTP({
      id: 'tpid_pyth',
      kode: '8.4',
      materiPokok: 'Teorema Pythagoras',
      tujuanPembelajaran: 'Memverifikasi sisi segitiga siku-siku dengan Teorema Pythagoras.',
    });
    const lkpd = buildSmartLKPD(tp, makeProfile(), 'kasus');
    expect(lkpd.produkHasilBelajar).toBeTruthy();

    const validResult = validateLKPDDokumen(lkpd, tp, makeProfile(), { sourceMode: 'curated' });
    expect(validResult.status).toBe('valid_terkurasi');

    // Inject broken Pythagoras math equation into stimulus
    const brokenMathLkpd = {
      ...lkpd,
      produkHasilBelajar: '',
      stimulusKasus: {
        ...lkpd.stimulusKasus,
        teks: 'Segitiga siku-siku dengan panjang sisi 3² + 4² = 6² memiliki keliling tertentu.',
      },
      panduanGuru: lkpd.panduanGuru
        ? {
            ...lkpd.panduanGuru,
            kunciDanContohJawaban: lkpd.panduanGuru.kunciDanContohJawaban.slice(0, 1),
          }
        : undefined,
    };

    const errResult = validateLKPDDokumen(brokenMathLkpd, tp, makeProfile(), { sourceMode: 'ai' });
    expect(errResult.issues.some((i) => i.includes('Pythagoras'))).toBe(true);
    expect(errResult.warnings.length).toBeGreaterThan(0);
    expect(errResult.status).toBe('gagal_validasi');
  });

  it('Case 14: DOCX XML inspection across Assessment, Rangkuman (kuis toggle), Naskah Ujian (LJK PG+PGK), Modul Ajar, & Student LKPD', async () => {
    const profileSD = makeProfile({
      jenjang: 'SD/MI',
      kelasUtama: '5',
      mataPelajaranUtama: 'Matematika',
    });
    const tp = makeTP({ kode: '5.1', materiPokok: 'Operasi Pecahan' });

    // 1) Exam SD -> PG A-D LJK + PGK [ B ] [ S ] LJK + Kisi-kisi TP + Rubrik contohJawaban
    const examSD = generateSmartNaskahUjian(profileSD, [tp], {
      tipe: 'STS',
      presetId: 'komprehensif',
      alokasiWaktu: '75 Menit',
    });
    const examXml = await extractDocxText(await buildNaskahUjianDocx(examSD, profileSD, true));
    expect(examXml).toContain('KISI-KISI CAKUPAN TUJUAN PEMBELAJARAN');
    expect(examXml).toContain('LEMBAR JAWABAN');
    expect(examXml).toContain('[ B ] [ S ]');
    expect(examXml).toContain('A, B, C, atau D');

    // 2) Rangkuman with includeKuisJawaban = false hides Kuis Kilat answer lines
    const rangkuman = await generateRangkumanMateri({
      modeInput: 'keinginan_user',
      topik: 'Operasi Pecahan',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase C (Kelas 5-6 SD)',
      kelas: '5',
      gayaBahasa: 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)',
      allowOfflineFallback: true,
    });
    rangkuman.kuisKilat = [{ nomor: 1, pertanyaan: 'Hitung 1/2 + 1/4', jawaban: 'JAWABAN_RAHASIA_3_PER_4' }];
    const studentRangkumanXml = await extractDocxText(await buildRangkumanDocx(rangkuman, false));
    expect(studentRangkumanXml).toContain('Hitung 1/2 + 1/4');
    expect(studentRangkumanXml).not.toContain('JAWABAN_RAHASIA_3_PER_4');

    // 3) Assessment KKTP unified intervals
    const asm = enrichDocWithQualityAndCognitive({
      id: 'asm_docx_test',
      createdAt: '2026-11-12',
      judul: 'Asesmen Pecahan',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase C (Kelas 5-6 SD)',
      kelas: '5',
      tipeAsesmen: 'Formatif (Proses Pembelajaran)',
      alokasiWaktu: '40 Menit',
      tahunAjaran: '2026/2027',
      namaSekolah: profileSD.namaSekolah,
      namaPenyusun: profileSD.namaGuru,
      capaianPembelajaran: 'Bilangan',
      tujuanPembelajaran: [tp.tujuanPembelajaran],
      materiPokok: 'Operasi Pecahan',
      profilPelajarPancasila: ['Mandiri'],
      petunjukUmum: ['Pilih jawaban tepat'],
      soalList: examSD.soalPG.slice(0, 1),
      rubrikKKTP: [
        {
          tujuanPembelajaran: tp.tujuanPembelajaran,
          buktiKetercapaian: 'Menghitung pecahan',
          perluBimbingan: 'Belum lancar',
          cukup: 'Sebagian benar',
          baik: 'Tepat',
          sangatBaik: 'Sangat tepat dan cepat',
        },
      ],
    });
    const asmXml = await extractDocxText(await buildAssessmentDocx(asm, true));
    expect(asmXml).toContain('0-60');
    expect(asmXml).toContain('86-100');

    // 4) Modul Ajar dynamic sections
    const modul = buildSmartModulAjar(tp, profileSD);
    const modElements = buildModulAjarElements(modul, profileSD);
    const modXml = await extractDocxText(new Document({ sections: [{ children: modElements }] }));
    expect(modXml).toContain('Kompetensi Awal');
    expect(modXml).toContain('Bahan Bacaan');

    // 5) Student LKPD excludes teacher guide keys
    const lkpd = buildSmartLKPD(tp, profileSD, 'kasus');
    const lkpdStudentEls = buildLKPDElements(lkpd, profileSD, false);
    const lkpdStudentXml = await extractDocxText(new Document({ sections: [{ children: lkpdStudentEls }] }));
    expect(lkpdStudentXml).not.toContain('Lampiran Pegangan Guru');
  });

  it('Case 15: V2 storage isolation prevents leakage across schoolId, mataPelajaran, and semester', () => {
    const profA = makeProfile({ schoolId: 'sch_alpha', mataPelajaranUtama: 'Matematika', semester: '1 (Ganjil)' });
    const profB = makeProfile({ schoolId: 'sch_beta', mataPelajaranUtama: 'Matematika', semester: '1 (Ganjil)' });
    const profASem2 = makeProfile({ schoolId: 'sch_alpha', mataPelajaranUtama: 'Matematika', semester: '2 (Genap)' });

    const sampleAsm: AsesmenDokumen = {
      id: 'asm_iso_1',
      createdAt: '2026-11-12',
      judul: 'Ulangan Alpha Sem 1',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      rombel: '8A',
      semester: '1 (Ganjil)',
      schoolId: 'sch_alpha',
      tipeAsesmen: 'Formatif (Proses Pembelajaran)',
      alokasiWaktu: '40 Menit',
      tahunAjaran: '2026/2027',
      namaSekolah: profA.namaSekolah,
      namaPenyusun: profA.namaGuru,
      capaianPembelajaran: 'Aljabar',
      tujuanPembelajaran: ['Memahami aljabar'],
      materiPokok: 'Aljabar',
      profilPelajarPancasila: ['Mandiri'],
      petunjukUmum: ['Baca petunjuk'],
      soalList: [],
      rubrikKKTP: [],
    };
    saveToBankSoal(sampleAsm, profA);

    expect(getBankSoal(profA).some((d) => d.id === 'asm_iso_1')).toBe(true);
    expect(getBankSoal(profB).some((d) => d.id === 'asm_iso_1')).toBe(false);
    expect(getBankSoal(profASem2).some((d) => d.id === 'asm_iso_1')).toBe(false);

    saveToBankRangkuman(
      {
        id: 'rng_iso_1',
        createdAt: '2026-11-12',
        judul: 'Rangkuman Alpha',
        mataPelajaran: 'Matematika',
        jenjangFase: 'Fase D (Kelas 7-9 SMP)',
        kelas: '8',
        rombel: '8A',
        semester: '1 (Ganjil)',
        schoolId: 'sch_alpha',
        tahunAjaran: '2026/2027',
        topik: 'Aljabar',
        sumberAsal: 'keinginan_user',
        gayaBahasa: 'Struktur Ringkas & Poin Kunci (Infografis)',
        ringkasanSatuKalimat: 'Ringkasan Aljabar',
        petaKonsep: ['Variabel'],
        poinUtama: [{ judul: 'Konsep', penjelasan: 'Variabel dan konstanta' }],
        faktaMenarik: ['Al-Khawarizmi merintis aljabar modern'],
        glosarium: [{ istilah: 'Variabel', makna: 'Simbol nilai' }],
        kuisKilat: [{ nomor: 1, pertanyaan: 'Apa itu variabel?', jawaban: 'Simbol peubah nilai' }],
        pesanInspirasi: 'Terus berlatih!',
      },
      profA
    );

    expect(getBankRangkuman(profA).some((r) => r.id === 'rng_iso_1')).toBe(true);
    expect(getBankRangkuman(profB).some((r) => r.id === 'rng_iso_1')).toBe(false);
    expect(getBankRangkuman(profASem2).some((r) => r.id === 'rng_iso_1')).toBe(false);
  });

  it('Case 16: Simulated & fallback flags remain visible in Bank Soal & Bank Rangkuman', () => {
    const profile = makeProfile();
    const simAsm: AsesmenDokumen = {
      id: 'asm_sim_demo',
      createdAt: '2026-11-12',
      judul: 'Contoh Simulasi Bank Soal',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      rombel: '8A',
      semester: '1 (Ganjil)',
      schoolId: resolveSchoolId(profile),
      tipeAsesmen: 'Formatif (Proses Pembelajaran)',
      alokasiWaktu: '40 Menit',
      tahunAjaran: '2026/2027',
      namaSekolah: profile.namaSekolah,
      namaPenyusun: profile.namaGuru,
      capaianPembelajaran: 'Aljabar',
      tujuanPembelajaran: ['Contoh TP'],
      materiPokok: 'Aljabar Demo',
      profilPelajarPancasila: ['Mandiri'],
      petunjukUmum: ['Baca petunjuk'],
      isSimulated: true,
      generationSource: 'sample_demo',
      usedFallback: true,
      soalList: [],
      rubrikKKTP: [],
    };
    saveToBankSoal(simAsm, profile);
    const fetched = getBankSoal(profile).find((d) => d.id === 'asm_sim_demo');
    expect(fetched?.isSimulated).toBe(true);

    const { queryByText } = render(
      React.createElement(BankSoalView, {
        bankList: [fetched!],
        schoolProfile: profile,
        onSelectAssessment: vi.fn(),
        onDeleteAssessment: vi.fn(),
      })
    );
    expect(queryByText('SIMULASI')).not.toBeNull();
  });

  it('Case 17: License enforcement blocks free tier with 0 quota on LKPD copy/Word export without weakening policy', () => {
    localStorage.setItem(
      'asesmerdeka_user_quota',
      JSON.stringify({ tier: 'free', remainingCredits: 0, maxCredits: 0, deviceId: 'dev_locked' })
    );

    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('alert', vi.fn());

    const lkpd = buildSmartLKPD(makeTP(), makeProfile(), 'kasus');
    const { queryByText } = render(
      React.createElement(LKPDViewer, {
        lkpd,
        schoolProfile: makeProfile(),
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
      })
    );
    expect(queryByText(/Salin Teks/i)).not.toBeNull();
    expect(queryByText(/Unduh Word/i)).not.toBeNull();

    const dispatchEventSpy = vi.fn();
    vi.stubGlobal('window', { dispatchEvent: dispatchEventSpy });
    try {
      const allowedCopy = requireActiveLicenseForAction('menyalin teks LKPD');
      const allowedExport = requireActiveLicenseForAction('mengunduh LKPD Word (.docx)');

      expect(allowedCopy).toBe(false);
      expect(allowedExport).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledTimes(2);
      const evt = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(evt.type).toBe('asesmerdeka:require-license');
      expect(writeText).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Case 18: Task 1–4 invariants (unique tpid_* keys, semester isolation, school profile compatibility) remain intact', () => {
    const profile = makeProfile();
    const tp = makeTP();
    const modul = buildSmartModulAjar(tp, profile);
    const lkpd = buildSmartLKPD(tp, profile, 'kasus');

    expect(modul.tpId).toBe(tp.id);
    expect(lkpd.tpId).toBe(tp.id);
    expect(modul.semester).toBe('1 (Ganjil)');
    expect(lkpd.semester).toBe('1 (Ganjil)');
  });
});
