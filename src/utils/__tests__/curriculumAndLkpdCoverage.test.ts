import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  getSemesterCurriculumPlan,
  KURIKULUM_CATALOG,
  type JenjangKategori,
} from '../kurikulumCatalog';
import {
  jenjangToDefaultFase,
  computeTPContentHash,
  markSavedLKPDDraftsNeedsReview,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { buildSmartLKPD, buildSmartATP } from '../perangkatAjarEngine';
import {
  solveAndVerifySPLDV,
  verifySPLDVDokumenConsistency,
  verifyRightTriangleSides,
  verifyDescriptiveStats,
} from '../lkpdMathVerifier';
import { validateLKPDDokumen, normalizeStoredLKPDDraft } from '../lkpdValidator';
import { generateContextualLKPDWithAI, buildLKPDGeminiPrompt } from '../lkpdAiService';
import * as licenseManager from '../licenseManager';
import { saveGeminiKey } from '../licenseManager';
import { exportLKPDToDocx } from '../docx/docxPerangkatAjar';
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

function makeProfile(
  jenjang: JenjangKategori,
  kelasUtama: string,
  mataPelajaranUtama: string,
  semester: '1 (Ganjil)' | '2 (Genap)' = '1 (Ganjil)'
): SchoolProfile {
  return {
    instansiDinas: 'Dinas Pendidikan',
    namaSekolah: `Sekolah Uji ${jenjang}`,
    alamatSekolah: 'Jl. Pendidikan No. 1',
    namaGuru: 'Guru Uji, S.Pd.',
    nipGuru: '198001012010011001',
    namaKepalaSekolah: 'Kepala Sekolah Uji, M.Pd.',
    nipKepalaSekolah: '197501012000011001',
    kotaSekolah: 'Yogyakarta',
    jenjang,
    kelasUtama,
    mataPelajaranUtama,
    semester,
    tahunAjaran: '2025/2026',
    rombelAktif: `${kelasUtama}-A`,
    daftarRombel: [`${kelasUtama}-A`],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
  };
}

describe('Cakupan Kurikulum & Generator TP-LKPD Lintas Jenjang & Mapel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    licenseManager.activateLicense('ASM-GM26-1TAT-1QBM-133R');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Inventarisasi CP & TP menghasilkan topik spesifik (nol slop generik) untuk semua jenjang dan rumpun mapel (termasuk Kemenag)', () => {
    const matrix: Array<{
      jenjang: JenjangKategori;
      kelas: string;
      mapel: string;
      semester: '1 (Ganjil)' | '2 (Genap)';
      expectedKemenag?: boolean;
    }> = [
      { jenjang: 'SD/MI', kelas: '1', mapel: 'Matematika', semester: '1 (Ganjil)' },
      { jenjang: 'SD/MI', kelas: '4', mapel: 'Matematika', semester: '1 (Ganjil)' },
      { jenjang: 'SD/MI', kelas: '4', mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', semester: '1 (Ganjil)' },
      { jenjang: 'SD/MI', kelas: '5', mapel: 'Bahasa Indonesia', semester: '1 (Ganjil)' },
      { jenjang: 'SD/MI', kelas: '4', mapel: 'Fikih', semester: '1 (Ganjil)', expectedKemenag: true },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Matematika', semester: '1 (Ganjil)' },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Ilmu Pengetahuan Alam (IPA)', semester: '1 (Ganjil)' },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Bahasa Inggris', semester: '1 (Ganjil)' },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Ilmu Pengetahuan Sosial (IPS)', semester: '1 (Ganjil)' },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Informatika', semester: '1 (Ganjil)' },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', semester: '1 (Ganjil)' },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Seni Rupa / Seni Musik / Prakarya', semester: '1 (Ganjil)' },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: "Al-Qur'an Hadis", semester: '1 (Ganjil)', expectedKemenag: true },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Bahasa Arab', semester: '1 (Ganjil)', expectedKemenag: true },
      { jenjang: 'SMA/MA', kelas: '10', mapel: 'Ekonomi', semester: '1 (Ganjil)' },
      { jenjang: 'SMA/MA', kelas: '10', mapel: 'Geografi', semester: '1 (Ganjil)' },
      { jenjang: 'SMA/MA', kelas: '10', mapel: 'Sosiologi', semester: '1 (Ganjil)' },
      { jenjang: 'SMA/MA', kelas: '11', mapel: 'Sejarah', semester: '1 (Ganjil)' },
      { jenjang: 'SMA/MA', kelas: '10', mapel: 'Pendidikan Pancasila', semester: '1 (Ganjil)' },
      { jenjang: 'SMA/MA', kelas: '11', mapel: 'Kimia', semester: '1 (Ganjil)' },
      { jenjang: 'SMA/MA', kelas: '11', mapel: 'Biologi', semester: '1 (Ganjil)' },
      { jenjang: 'SMK', kelas: '11', mapel: 'Projek Kreatif dan Kewirausahaan (PKK)', semester: '1 (Ganjil)' },
      { jenjang: 'SMK', kelas: '10', mapel: 'Matematika (Umum / Teknik)', semester: '1 (Ganjil)' },
    ];

    for (const row of matrix) {
      const fase = jenjangToDefaultFase(row.jenjang, row.kelas);
      const plan = getSemesterCurriculumPlan(row.mapel, fase, row.kelas, row.semester);
      expect(plan.tpList.length).toBeGreaterThanOrEqual(3);
      expect(plan.referensiCP?.terverifikasiResmi).toBe(false);
      if (row.expectedKemenag) {
        expect(plan.referensiCP?.sumber).toMatch(/Madrasah|KMA/i);
      }
      for (const tp of plan.tpList) {
        expect(tp.materiPokok).not.toMatch(/studi kasus kontekstual/i);
        expect(tp.elemen.trim().length).toBeGreaterThan(2);
        expect(tp.tujuanPembelajaran.trim().length).toBeGreaterThan(20);
      }
    }

    // Pastikan Geografi, Sosiologi, Ekonomi, Matematika SMP Kelas 8 punya elemen akurat
    const mathSmp8 = getSemesterCurriculumPlan('Matematika', 'Fase D', '8', '1 (Ganjil)');
    const spldv = mathSmp8.tpList.find((t) => /spldv/i.test(t.materiPokok));
    const pyth = mathSmp8.tpList.find((t) => /pythagoras/i.test(t.materiPokok));
    expect(spldv?.elemen).toBe('Aljabar');
    expect(pyth?.elemen).toBe('Geometri');
    expect(spldv?.subTP?.length).toBeGreaterThanOrEqual(3);
    expect(spldv?.prasyarat?.length).toBeGreaterThanOrEqual(1);
    expect(KURIKULUM_CATALOG['SMA/MA'].mapelUmum).toContain('Geografi');
    expect(KURIKULUM_CATALOG['SMA/MA'].mapelMadrasah).toContain('Fikih / Ushul Fikih (MA)');

    // Audit menyeluruh seluruh jenjang x seluruh mapel umum & madrasah di KURIKULUM_CATALOG
    for (const jenjang of Object.keys(KURIKULUM_CATALOG) as JenjangKategori[]) {
      const cfg = KURIKULUM_CATALOG[jenjang];
      const allMapels = [...cfg.mapelUmum, ...cfg.mapelMadrasah];
      const representativeClass = cfg.kelasList[Math.min(1, cfg.kelasList.length - 1)].kelas;
      for (const mapel of allMapels) {
        const prof = makeProfile(jenjang, representativeClass, mapel, '1 (Ganjil)');
        const fase = jenjangToDefaultFase(jenjang, representativeClass);
        const semPlan = getSemesterCurriculumPlan(mapel, fase, representativeClass, '1 (Ganjil)');
        expect(semPlan.tpList.length).toBeGreaterThanOrEqual(3);
        for (const tp of semPlan.tpList) {
          expect(tp.materiPokok).not.toMatch(/studi kasus kontekstual/i);
        }
        const doc = buildSmartLKPD(semPlan.tpList[0], prof, 'kasus');
        expect(doc.stimulusKasus.teks).not.toMatch(/suatu kelompok masyarakat/i);
        expect(doc.pertanyaanAnalisis.map((q) => q.pertanyaan).join(' ')).not.toMatch(/profesi masa depan/i);
        expect(doc.panduanGuru?.kunciDanContohJawaban.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('2. Regression SPLDV Matematika Kelas VIII: stimulus data konkret, verifikasi aljabar akurat, bebas klise & tanpa kebocoran kunci', () => {
    const profile = makeProfile('SMP/MTs', '8', 'Matematika', '1 (Ganjil)');
    const plan = getSemesterCurriculumPlan('Matematika', 'Fase D', '8', '1 (Ganjil)');
    const spldvTP = plan.tpList.find((t) => /spldv/i.test(t.materiPokok))!;
    expect(spldvTP).toBeDefined();

    const lkpd = buildSmartLKPD(spldvTP, profile, 'kasus');
    const serializedStudentText = [
      lkpd.judul,
      lkpd.stimulusKasus.teks,
      ...lkpd.langkahAktivitas.map((l) => l.instruksi),
      ...lkpd.pertanyaanAnalisis.map((q) => q.pertanyaan),
    ].join('\n');

    expect(serializedStudentText).not.toMatch(/suatu kelompok masyarakat/i);
    expect(serializedStudentText).not.toMatch(/profesi masa depan/i);
    expect(lkpd.stimulusKasus.teks).toContain('18.000');
    expect(lkpd.stimulusKasus.teks).toContain('17.000');
    expect(lkpd.catatanValidasi?.status).toBe('valid_terkurasi');

    const mathCheck = verifySPLDVDokumenConsistency(lkpd);
    expect(mathCheck.verified).toBe(true);
    expect(lkpd.panduanGuru?.kunciDanContohJawaban.some((k) => k.alternatifValid)).toBe(true);
    expect(lkpd.panduanGuru?.miskonsepsiUmum.length).toBeGreaterThan(0);
    expect(lkpd.panduanGuru?.rubrikPenilaian.length).toBeGreaterThanOrEqual(3);

    // Uji helper verifikasi SPLDV secara langsung
    const valid = solveAndVerifySPLDV(2, 3, 18000, 3, 2, 17000, { requireNonNegative: true });
    expect(valid.x).toBe(3000);
    expect(valid.y).toBe(4000);
    expect(valid.isConsistent).toBe(true);

    const parallel = solveAndVerifySPLDV(2, 4, 10, 1, 2, 7);
    expect(parallel.solvable).toBe(false);

    const negativePrice = solveAndVerifySPLDV(1, 1, 5, 2, 1, 4, { requireNonNegative: true });
    expect(negativePrice.isConsistent).toBe(false);

    expect(verifyRightTriangleSides(6, 8, 10)).toBe(true);
    expect(verifyRightTriangleSides(6, 8, 11)).toBe(false);
    expect(verifyDescriptiveStats([75, 80, 90, 40, 85, 80, 95]).median).toBe(80);
  });

  it('3. Generator LKPD menghasilkan tugas spesifik materi dan sesuai perkembangan belajar untuk semua rumpun & jenjang', () => {
    const cases: Array<{
      jenjang: JenjangKategori;
      kelas: string;
      mapel: string;
      preset: 'kasus' | 'eksperimen' | 'diferensiasi' | 'proyek';
      expectSafety?: boolean;
      expectedToken: RegExp;
    }> = [
      { jenjang: 'SD/MI', kelas: '1', mapel: 'Matematika', preset: 'kasus', expectedToken: /jeruk|mangga|kelereng|20/i },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Matematika', preset: 'kasus', expectedToken: /18\.000|persamaan|variabel/i },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Ilmu Pengetahuan Alam (IPA)', preset: 'eksperimen', expectSafety: true, expectedToken: /cermin|pantul|busur|senter/i },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: "Al-Qur'an Hadis", preset: 'kasus', expectedToken: /مِنْ|بَعْدِ|يَقُوْلُ|nun sukun/i },
      { jenjang: 'SD/MI', kelas: '4', mapel: 'Fikih', preset: 'kasus', expectedToken: /akad|gharar|kotak misteri|ijab/i },
      { jenjang: 'SMA/MA', kelas: '10', mapel: 'Ekonomi', preset: 'kasus', expectedToken: /Qd\s*=|100\s*-\s*2P|keseimbangan/i },
      { jenjang: 'SMA/MA', kelas: '11', mapel: 'Sejarah', preset: 'kasus', expectedToken: /sumber primer|sekunder|1945|arsip/i },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Informatika', preset: 'kasus', expectedToken: /nilai\s*>\s*75|bug|pseudocode/i },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', preset: 'eksperimen', expectSafety: true, expectedToken: /denyut|bpm|15 detik/i },
      { jenjang: 'SMP/MTs', kelas: '8', mapel: 'Seni Rupa / Seni Musik / Prakarya', preset: 'proyek', expectSafety: true, expectedToken: /motif|5,5|22 cm|ragam hias/i },
      { jenjang: 'SMK', kelas: '11', mapel: 'Projek Kreatif dan Kewirausahaan (PKK)', preset: 'kasus', expectedToken: /K3LH|5R|BEP|HPP|bengkel/i },
    ];

    for (const c of cases) {
      const profile = makeProfile(c.jenjang, c.kelas, c.mapel, '1 (Ganjil)');
      const plan = getSemesterCurriculumPlan(
        c.mapel,
        jenjangToDefaultFase(c.jenjang, c.kelas),
        c.kelas,
        '1 (Ganjil)'
      );
      const lkpd = buildSmartLKPD(plan.tpList[0], profile, c.preset);
      const body = [
        lkpd.judul,
        lkpd.stimulusKasus.teks,
        lkpd.eksperimenData?.alatDanBahan.join(' ') || '',
        lkpd.eksperimenData?.keselamatanKerja?.join(' ') || '',
        lkpd.langkahAktivitas.map((l) => l.instruksi).join(' '),
        lkpd.pertanyaanAnalisis.map((q) => q.pertanyaan).join(' '),
      ].join('\n');

      expect(body).toMatch(c.expectedToken);
      expect(body).not.toMatch(/suatu kelompok masyarakat/i);
      expect(body).not.toMatch(/profesi masa depan/i);
      expect(lkpd.pendekatanKegiatan).toBeTruthy();
      expect(lkpd.panduanGuru?.rubrikPenilaian.length).toBeGreaterThanOrEqual(1);

      if (c.expectSafety && c.preset === 'eksperimen') {
        expect(lkpd.eksperimenData?.keselamatanKerja?.length).toBeGreaterThan(0);
      }

      const v = validateLKPDDokumen(lkpd, plan.tpList[0], profile, {
        sourceMode: lkpd.catatanValidasi?.isCuratedFixture ? 'curated' : 'adaptive_fallback',
      });
      expect(v.issues).toEqual([]);
    }

    // Cek ATP memakai bukti ketercapaian dari TP
    const smpProfile = makeProfile('SMP/MTs', '8', 'Matematika');
    const smpPlan = getSemesterCurriculumPlan('Matematika', 'Fase D', '8', '1 (Ganjil)');
    const atp = buildSmartATP(smpPlan.tpList, smpProfile);
    expect(atp.items[0].indikatorKetercapaian).toContain(
      smpPlan.tpList[0].buktiKetercapaian![0]
    );
  });

  it('4. Topik kustom tak dikenal menghasilkan kerangka adaptif spesifik rumpun dan menandai status perlu_review_guru tanpa kalimat klise', () => {
    const profile = makeProfile('SMP/MTs', '8', 'Seni Rupa / Seni Musik / Prakarya');
    const customTP: CustomTPItem = {
      id: 'tp-kustom-ecoprint',
      kode: '8.99',
      elemen: 'Menciptakan',
      materiPokok: 'Batik Ecoprint Daun Jati',
      tujuanPembelajaran: 'Menerapkan teknik pukul dan kukus untuk mencetak motif daun jati pada kain katun',
      arahanRangkuman: 'Teknik mordanting, penataan daun, pengukusan',
      alokasiJP: 4,
      mingguMulai: 5,
      mingguSelesai: 6,
    };

    const lkpd = buildSmartLKPD(customTP, profile, 'kasus');
    expect(lkpd.stimulusKasus.teks).toContain('Batik Ecoprint Daun Jati');
    expect(lkpd.stimulusKasus.teks).not.toMatch(/suatu kelompok masyarakat/i);
    expect(lkpd.catatanValidasi?.isCuratedFixture).toBe(false);
    expect(lkpd.catatanValidasi?.status).toBe('perlu_review_guru');
  });

  it('5. Validator AI + Loop Repair maksimal 1x + Fallback jujur: memperbaiki slop lalu menolak keluaran matematika salah', async () => {
    saveGeminiKey('key-uji-123');
    const profile = makeProfile('SMP/MTs', '8', 'Matematika');
    const plan = getSemesterCurriculumPlan('Matematika', 'Fase D', '8', '1 (Ganjil)');
    const spldvTP = plan.tpList.find((t) => /spldv/i.test(t.materiPokok))!;

    const promptText = buildLKPDGeminiPrompt(spldvTP, profile, 'kasus', '');
    expect(promptText).toContain('Rincian Sub-TP yang Harus Tercapai');
    expect(promptText).toContain('Matematika');

    // Skenario A: Call 1 slop generik -> ditolak validator -> Call 2 valid SPLDV -> sukses usedFallback=false (2 calls)
    const slopDraft = {
      judul: 'SPLDV',
      stimulusKasus: { judul: 'Kasus', teks: 'Suatu kelompok masyarakat membahas matematika secara umum saja.' },
      langkahAktivitas: [{ langkahKe: 1, instruksi: 'Diskusikan masalah di atas dalam kelompok dan tuliskan hasilnya.' }],
      pertanyaanAnalisis: [{ nomor: 1, tingkatKognitif: 'Mahir', pertanyaan: 'Apa profesi masa depan?' }],
    };
    const validRepairedSPLDV = {
      judul: 'Pembelian Paket Alat Tulis Koperasi',
      stimulusKasus: {
        judul: 'Struk Belanja Koperasi',
        teks: 'Dina membeli 2 buku dan 3 pensil seharga Rp18.000, sedangkan Bimo membeli 3 buku dan 2 pensil seharga Rp17.000.',
        pertanyaanAwal: 'Berapa harga satu buku (x) dan satu pensil (y)?',
      },
      langkahAktivitas: [
        { langkahKe: 1, judulLangkah: 'Pemodelan SPLDV', instruksi: 'Tulis dua persamaan 2x + 3y = 18.000 dan 3x + 2y = 17.000.' },
        { langkahKe: 2, judulLangkah: 'Eliminasi dan Substitusi', instruksi: 'Selesaikan SPLDV untuk memperoleh x dan y.' },
      ],
      pertanyaanAnalisis: [
        {
          nomor: 1,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Menyelesaikan model SPLDV dua persamaan.',
          pertanyaan: 'Tentukan model persamaan, nilai variabel x dan y untuk harga buku dan pensil!',
          panduanJawabanSingkat: '2x + 3y = 18.000 dan 3x + 2y = 17.000 -> x = 3.000, y = 4.000.',
        },
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          {
            nomor: 1,
            jawabanInti: 'x = 3.000, y = 4.000',
            langkahPenyelesaian: ['2x + 3y = 18.000', '3x + 2y = 17.000', 'Diperoleh x = 3.000, y = 4.000'],
          },
        ],
        miskonsepsiUmum: [{ miskonsepsi: 'Tertukar koefisien', caraMenangani: 'Cek ulang soal.' }],
        pemetaanTP: [{ kodeSubTP: spldvTP.kode, kompetensiTarget: 'SPLDV', aktivitasTerkait: 'Langkah 1-2' }],
        rubrikPenilaian: [{ aspek: 'Model', perluBimbingan: '-', berkembang: '-', cakap: 'Tepat', mahir: 'Lengkap' }],
      },
    };

    const retryFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(slopDraft) }] } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(validRepairedSPLDV) }] } }] }),
      });
    vi.stubGlobal('fetch', retryFetch);

    const retryRes = await generateContextualLKPDWithAI(spldvTP, profile, 'kasus', '');
    expect(retryFetch).toHaveBeenCalledTimes(2);
    expect(retryRes.usedFallback).toBe(false);
    expect(retryRes.lkpd.catatanValidasi?.status).toBe('valid_ai');

    // Skenario B: Kedua respons AI salah hitung SPLDV (klaim x = 9999) -> ditolak, refund kuota, fallback jujur
    const wrongMathDraft = {
      ...validRepairedSPLDV,
      panduanGuru: {
        ...validRepairedSPLDV.panduanGuru,
        kunciDanContohJawaban: [
          {
            nomor: 1,
            jawabanInti: 'x = 9999, y = 4000',
            langkahPenyelesaian: ['2x + 3y = 18.000', '3x + 2y = 17.000'],
          },
        ],
      },
    };

    const failMathFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(wrongMathDraft) }] } }] }),
    });
    vi.stubGlobal('fetch', failMathFetch);
    const refundSpy = vi.spyOn(licenseManager, 'refundQuota');

    const mathFailRes = await generateContextualLKPDWithAI(spldvTP, profile, 'kasus', '');
    expect(failMathFetch).toHaveBeenCalledTimes(2);
    expect(mathFailRes.usedFallback).toBe(true);
    expect(mathFailRes.errorMsg).toBeDefined();
    expect(refundSpy).toHaveBeenCalled();
  });

  it('6. Perubahan TP menandai draf LKPD tersimpan needsReview tanpa menimpa editan manual guru', () => {
    const profile = makeProfile('SMP/MTs', '8', 'Matematika');
    const tpOriginal: CustomTPItem = {
      id: 'tp-sync-test',
      kode: '8.1',
      elemen: 'Aljabar',
      materiPokok: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
      tujuanPembelajaran: 'Menyelesaikan SPLDV dengan eliminasi dan substitusi.',
      arahanRangkuman: '',
      alokasiJP: 10,
      mingguMulai: 1,
      mingguSelesai: 3,
    };
    const originalDoc = buildSmartLKPD(tpOriginal, profile, 'kasus');
    const manualEdited = {
      ...originalDoc,
      judul: 'Versi Buatan Guru Sendiri',
      tpSourceHash: computeTPContentHash(tpOriginal),
    };
    localStorage.setItem('lkpd_tp-sync-test_kasus', JSON.stringify(manualEdited));

    const tpUpdated: CustomTPItem = {
      ...tpOriginal,
      tujuanPembelajaran: 'Memodelkan, menyelesaikan SPLDV secara aljabar/grafik, dan menguji kewajaran solusi.',
    };
    const affected = markSavedLKPDDraftsNeedsReview(tpUpdated.id, tpUpdated);
    expect(affected).toBe(1);

    const savedAfter = JSON.parse(localStorage.getItem('lkpd_tp-sync-test_kasus')!);
    expect(savedAfter.needsReview).toBe(true);
    expect(savedAfter.judul).toBe('Versi Buatan Guru Sendiri');

    const migrated = normalizeStoredLKPDDraft(
      savedAfter,
      buildSmartLKPD(tpUpdated, profile, 'kasus'),
      computeTPContentHash(tpUpdated)
    );
    expect(migrated.needsReview).toBe(true);
    expect(migrated.judul).toBe('Versi Buatan Guru Sendiri');
  });

  it('7. Pemisahan Lembar Siswa vs Panduan Guru: Word siswa bebas kunci/rubrik & Word guru memuat lampiran lengkap', async () => {
    const profile = makeProfile('SMP/MTs', '8', 'Matematika');
    const plan = getSemesterCurriculumPlan('Matematika', 'Fase D', '8', '1 (Ganjil)');
    const spldvTP = plan.tpList.find((t) => /spldv/i.test(t.materiPokok))!;
    const lkpd = buildSmartLKPD(spldvTP, profile, 'kasus');

    const studentBlob = await exportLKPDToDocx(lkpd, profile, false);
    const studentZip = await JSZip.loadAsync(await studentBlob.arrayBuffer());
    const studentXml = await studentZip.file('word/document.xml')!.async('string');

    expect(studentXml).toContain('18.000');
    expect(studentXml).not.toContain('Kunci Jawaban / Panduan Guru');
    expect(studentXml).not.toContain('LAMPIRAN PEGANGAN GURU');
    expect(studentXml).not.toContain('Archetype:');

    const teacherBlob = await exportLKPDToDocx(lkpd, profile, true);
    const teacherZip = await JSZip.loadAsync(await teacherBlob.arrayBuffer());
    const teacherXml = await teacherZip.file('word/document.xml')!.async('string');

    expect(teacherXml).toContain('LAMPIRAN PEGANGAN GURU');
    expect(teacherXml).toContain('Alternatif Sah');
    expect(teacherXml).toContain('Miskonsepsi Umum');
    expect(teacherXml).toContain('Rubrik Penilaian Berbasis Bukti Kinerja');

    // Render LKPDViewer secara default (student mode) juga tidak membocorkan label internal Archetype atau lampiran guru
    const htmlStudent = renderToStaticMarkup(
      React.createElement(LKPDViewer, {
        lkpd,
        schoolProfile: profile,
        customTP: spldvTP,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
      })
    );
    expect(htmlStudent).not.toContain('Archetype:');
    expect(htmlStudent).not.toContain('Lampiran Pegangan Guru');
  });
});
