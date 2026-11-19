import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import {
  exportBackupDataJson,
  importBackupDataJson,
  jenjangToDefaultFase,
} from '../schoolProfileStorage';
import type { ModulAjarDokumen, ModulReferensiSumberItem } from '../../types/perangkatAjar';
import { ALL_CURATED_TOPIC_ENTRIES } from '../../data/kurikulumTopicBank';
import { getSemesterCurriculumPlan } from '../kurikulumCatalog';
import {
  CURATED_EXAMPLE_BADGE_LABEL,
  CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER,
  cloneCuratedExampleAsTeacherDraft,
  getCuratedModulExampleById,
  getCuratedModulExamples,
  type CuratedModulExampleId,
} from '../modulCuratedExamples';
import {
  detectFabricatedBookReference,
  validateModulAjarDokumen,
} from '../modulAjarValidator';
import { validateModulTimeBudget } from '../modulTimeBudget';
import { PROVENANCE_MSG_UNLINKED } from '../modulReferensiSumber';
import { solveAndVerifySPLDV } from '../lkpdMathVerifier';
import {
  loadLatestModulAjarDraft,
  loadModulAjarDraft,
  saveModulAjarDraft,
} from '../perangkatDraftStorage';
import { analyzeWorkspaceConflict } from '../cloudSyncManager';
import { exportModulAjarToDocx } from '../docx/docxPerangkatAjar';
import { generateContextualModulAjarWithAI } from '../modulAjarAiService';
import * as licenseManager from '../licenseManager';
import * as geminiClient from '../../services/geminiClient';
import { ModulAjarViewer } from '../../components/ModulAjarViewer';

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
  (globalThis as unknown as { localStorage: LocalStorageMock }).localStorage =
    new LocalStorageMock();
}

function makeTeacherProfile(overrides?: Partial<SchoolProfile>): SchoolProfile {
  return {
    schoolId: 'sch_uji_task12_4',
    instansiDinas: 'Dinas Pendidikan Uji',
    namaSekolah: 'SMPN 9 Uji Task 12.4',
    alamatSekolah: 'Jl. Pendidikan No. 45',
    namaGuru: 'Ibu Ratna Dewi, S.Pd.',
    nipGuru: '198805152014022003',
    namaKepalaSekolah: 'Drs. Bambang Santoso, M.Pd.',
    nipKepalaSekolah: '196802121994031002',
    kotaSekolah: 'Semarang',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    rombelAktif: 'VIII-B',
    daftarRombel: ['VIII-B'],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

describe('Task 12.4 — Curated Ready-to-Teach Module Examples & E2E Acceptance', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.mocked(saveAs).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Gate 1 & 2: Tersedia tepat 4 contoh terkurasi (SD, SMP, SMA, SMK) yang lolos Time-Budget, Validator, SIBI Provenance, Diferensiasi 3-jalur, dan LKPD', () => {
    const examples = getCuratedModulExamples();
    expect(examples).toHaveLength(4);
    expect(examples.map((e) => e.id)).toEqual([
      'sd_4_ipas_fotosintesis',
      'smp_8_matematika_spldv',
      'sma_10_bindo_lho',
      'smk_11_pkk_prototipe',
    ]);

    const expectedCatalogMap: Record<
      CuratedModulExampleId,
      {
        jenjangKey: 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK';
        kelas: string;
        mapel: string;
        tpId: string;
        expectedModel: string;
        expectedMinutes: number;
      }
    > = {
      sd_4_ipas_fotosintesis: {
        jenjangKey: 'SD/MI',
        kelas: '4',
        mapel: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
        tpId: 'ipas-fb-s1-tumbuhan-fotosintesis',
        expectedModel: 'discovery',
        expectedMinutes: 70,
      },
      smp_8_matematika_spldv: {
        jenjangKey: 'SMP/MTs',
        kelas: '8',
        mapel: 'Matematika',
        tpId: 'mat-fd-s1-spldv',
        expectedModel: 'pbl',
        expectedMinutes: 120,
      },
      sma_10_bindo_lho: {
        jenjangKey: 'SMA/MA',
        kelas: '10',
        mapel: 'Bahasa Indonesia',
        tpId: 'bindo-fe-s1-lho-ilmiah',
        expectedModel: 'inquiry',
        expectedMinutes: 135,
      },
      smk_11_pkk_prototipe: {
        jenjangKey: 'SMK',
        kelas: '11',
        mapel: 'Produk Kreatif dan Kewirausahaan (PKK)',
        tpId: 'pkk-smk-s1-prototipe-biaya-hpp',
        expectedModel: 'pjbl',
        expectedMinutes: 180,
      },
    };

    for (const ex of examples) {
      const spec = expectedCatalogMap[ex.id];
      expect(ex.badgeLabel).toBe(CURATED_EXAMPLE_BADGE_LABEL);
      expect(ex.provenanceDisclaimer).toBe(CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER);
      expect(ex.jenjang).toBe(spec.jenjangKey);
      expect(ex.kelas).toBe(spec.kelas);
      expect(ex.modelType).toBe(spec.expectedModel);

      // Verifikasi TP berasal dari katalog aktual repository & rencana semester
      const foundTopic = ALL_CURATED_TOPIC_ENTRIES.find((t) => t.topicId === spec.tpId);
      expect(foundTopic).toBeDefined();
      const fase = jenjangToDefaultFase(spec.jenjangKey, spec.kelas);
      const plan = getSemesterCurriculumPlan(spec.mapel, fase, spec.kelas, '1 (Ganjil)');
      const planMatch = plan.tpList.find((item) => item.id === ex.tp.id);
      expect(planMatch).toBeDefined();
      expect(ex.modul.tpId).toBe(ex.tp.id);
      expect(ex.modul.tpKode).toBe(ex.tp.kode);

      // Verifikasi Time-Budget Engine
      const timeVal = validateModulTimeBudget(ex.modul, ex.sampleProfile);
      expect(timeVal.isValid).toBe(true);
      expect(timeVal.expectedMenitPerPertemuan).toBe(spec.expectedMinutes);
      expect(timeVal.perPertemuan[0].actualTotalMenit).toBe(spec.expectedMinutes);

      // Verifikasi Quality Validator 0 masalah struktural & anti-slop
      const val = validateModulAjarDokumen(ex.modul, ex.tp, ex.sampleProfile, {
        sourceMode: 'ai',
        expectedModel: spec.expectedModel as 'discovery' | 'pbl' | 'inquiry' | 'pjbl',
      });
      expect(val.status).toBe('valid_ai');
      expect(val.structuralIssues).toEqual([]);
      expect(val.relevanceAndAntiSlopIssues).toEqual([]);

      // Verifikasi Transparansi Sumber (tidak ada referensi SIBI dikarang)
      expect(ex.modul.referensiSumber).toBeUndefined();
      expect(ex.modul.daftarPustaka.some((d) => d.includes(PROVENANCE_MSG_UNLINKED))).toBe(true);
      expect(detectFabricatedBookReference(ex.modul.daftarPustaka)).toEqual([]);
      expect(ex.modul.bahanBacaan?.referensiCatatan).toBe(PROVENANCE_MSG_UNLINKED);

      // Verifikasi Diferensiasi 3 jalur berbeda nyata & tidak ada TP yang diturunkan
      expect(ex.modul.diferensiasiOperasional).toBeDefined();
      const diff = ex.modul.diferensiasiOperasional!;
      expect(diff.kesiapanDasar.aktivitasKonkret[0]).not.toBe(diff.kesiapanMahir.aktivitasKonkret[0]);
      expect(diff.kesiapanDasar.dukunganScaffolding).not.toBe(diff.kesiapanBerkembang.dukunganScaffolding);

      // Verifikasi 8+ komponen Contoh LKPD Terintegrasi
      const lkpd = ex.modul.contohLKPD!;
      expect(lkpd).toBeDefined();
      expect(lkpd.judul.length).toBeGreaterThan(8);
      expect(lkpd.tujuanPengerjaan.length).toBeGreaterThan(10);
      expect(lkpd.konteksTugas.length).toBeGreaterThan(15);
      expect(lkpd.petunjukSiswa.length).toBeGreaterThanOrEqual(2);
      expect(lkpd.bahanAtauData.length).toBeGreaterThanOrEqual(1);
      expect(lkpd.langkahPengerjaan.length).toBeGreaterThanOrEqual(2);
      expect(lkpd.pertanyaanAtauRuangKerja.length).toBeGreaterThanOrEqual(2);
      expect(lkpd.hasilYangDiharapkan.length).toBeGreaterThan(10);
      expect(lkpd.kriteriaPenilaian.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('Gate 3: SD Kelas 4 IPAS (Discovery Learning, 70 mnt) membedakan batas pembuktian gelap vs Hydrilla/yodium dan bebas konteks industri/71', () => {
    const ex = getCuratedModulExampleById('sd_4_ipas_fotosintesis')!;
    const serialized = JSON.stringify(ex.modul);
    expect(serialized).toContain('Hydrilla');
    expect(serialized).toContain('yodium');
    expect(serialized.toLowerCase()).toContain('lemari gelap');
    expect(serialized.toLowerCase()).not.toContain('dunia kerja');
    expect(serialized.toLowerCase()).not.toContain('industri');
    expect(serialized.toLowerCase()).not.toContain('bengkel');
    expect(serialized).not.toContain('71-85');
    expect(ex.modul.rubrikPenilaianSingkat.some((r) => r.cakap.includes('Hydrilla') || serialized.includes('Hydrilla'))).toBe(true);
    expect(ex.modul.asesmenDetail?.akhir.kktpReferensi?.catatan).toBeDefined();
  });

  it('Gate 4: SMP Kelas 8 Matematika SPLDV (PBL, 120 mnt) terverifikasi numerik 100% di seluruh sistem persamaan & sanggahan klaim keliru', () => {
    const ex = getCuratedModulExampleById('smp_8_matematika_spldv')!;
    const s1 = solveAndVerifySPLDV(2, 3, 18000, 3, 2, 17000, { requireNonNegative: true });
    expect(s1.solvable).toBe(true);
    expect(s1.isConsistent).toBe(true);
    expect(s1.x).toBe(3000);
    expect(s1.y).toBe(4000);

    const s2 = solveAndVerifySPLDV(3, 2, 27000, 2, 1, 16000, { requireNonNegative: true });
    expect(s2.solvable).toBe(true);
    expect(s2.isConsistent).toBe(true);
    expect(s2.x).toBe(5000);
    expect(s2.y).toBe(6000);
    expect(4 * s2.x! + 3 * s2.y!).toBe(38000);

    // Klaim keliru (7.000, 2.000) cocok di Paket B (2*7000 + 2000 = 16000) namun GAGAL di Paket A (3*7000 + 2*2000 = 25000 != 27000)
    expect(2 * 7000 + 2000).toBe(16000);
    expect(3 * 7000 + 2 * 2000).toBe(25000);

    const s3 = solveAndVerifySPLDV(1, 2, 7000, 2, 1, 8000, { requireNonNegative: true });
    expect(s3.solvable).toBe(true);
    expect(s3.isConsistent).toBe(true);
    expect(s3.x).toBe(3000);
    expect(s3.y).toBe(2000);

    const serialized = JSON.stringify(ex.modul);
    expect(serialized).toContain('Rp38.000');
    expect(serialized).toContain('Rp25.000');
    expect(serialized).toContain('Rp3.000');
    expect(serialized).toContain('Rp4.000');
  });

  it('Gate 5: SMA Kelas 10 Bahasa Indonesia LHO (Inquiry, 135 mnt) memuat teks LHO latihan 4 paragraf utuh, bukti tekstual, penyuntingan, peer review, dan 0 statistik fiktif', () => {
    const ex = getCuratedModulExampleById('sma_10_bindo_lho')!;
    const fullText = JSON.stringify(ex.modul);
    expect(fullText).toContain('Paragraf 1 (Pernyataan Umum/Klasifikasi)');
    expect(fullText).toContain('Paragraf 2 (Deskripsi Bagian)');
    expect(fullText).toContain('Paragraf 3 (Deskripsi Manfaat)');
    expect(fullText).toContain('Paragraf 4 (Kalimat Bermasalah untuk Uji Audit Siswa)');
    expect(fullText).toContain('Lubang resapan biopori');
    expect(fullText).toMatch(/peer review/i);
    expect(ex.modul.asesmenDetail?.akhir.butirTugas.length).toBeGreaterThanOrEqual(2);
    expect(detectFabricatedBookReference([fullText])).toEqual([]);
    expect(fullText).not.toMatch(/\b2024\b|\b2025\b.*BPS|ISBN/i);
  });

  it('Gate 6: SMK Kelas 11 PKK (PjBL, 180 mnt) menyediakan K3LH/SOP adaptif lintas jurusan (TKJ/Boga/Teknik), 5R, serta kalkulasi HPP & BEP akurat', () => {
    const ex = getCuratedModulExampleById('smk_11_pkk_prototipe')!;
    const fullText = JSON.stringify(ex.modul);
    expect(fullText).toContain('TKJ');
    expect(fullText).toContain('Tata Boga');
    expect(fullText).toContain('Teknik');
    expect(fullText).toContain('5R');

    // Verifikasi akuntansi HPP & BEP: FC=160.000, VC=22.000, Batch=20 -> HPP=30.000, Harga=38.000 -> BEP=10 unit (Rp380.000), Laba 20 unit=Rp160.000
    const fixedCost = 160000;
    const variablePerUnit = 22000;
    const batchQty = 20;
    const totalCost = fixedCost + variablePerUnit * batchQty;
    const hppPerUnit = totalCost / batchQty;
    const sellingPrice = 38000;
    const marginPerUnit = sellingPrice - variablePerUnit;
    const bepUnit = fixedCost / marginPerUnit;
    const bepRupiah = bepUnit * sellingPrice;
    const labaBatch = sellingPrice * batchQty - totalCost;
    expect(totalCost).toBe(600000);
    expect(hppPerUnit).toBe(30000);
    expect(bepUnit).toBe(10);
    expect(bepRupiah).toBe(380000);
    expect(labaBatch).toBe(160000);
    expect(fullText).toContain('Rp30.000');
    expect(fullText).toContain('10 unit');
    expect(fullText).toContain('Rp380.000');
    expect(fullText).toContain('Rp160.000');
  });

  it('Gate 7: Immutability template terjamin; salin-ke-draf mewarisi identitas & referensi guru, bertahan pasca-reload, serta lolos Backup/Import & Cloud Sync', () => {
    const teacherProfile = makeTeacherProfile({
      schoolId: 'sch_live_copy',
      namaSekolah: 'SMAN 4 Uji',
      namaGuru: 'Pak Hadi Santoso',
      jenjang: 'SMA/MA',
      kelasUtama: '10',
      mataPelajaranUtama: 'Bahasa Indonesia',
    });
    const teacherTP: CustomTPItem = {
      id: 'bindo-fe-s1-lho-ilmiah',
      kode: '10.1',
      elemen: 'Menyimak & Menulis',
      materiPokok: 'Teks Laporan Hasil Observasi',
      tujuanPembelajaran: 'Menganalisis dan memproduksi LHO akurat.',
      arahanRangkuman: '',
      alokasiJP: 3,
      mingguMulai: 1,
      mingguSelesai: 1,
    };
    const linkedSibiRef: ModulReferensiSumberItem[] = [
      {
        id: 'ref-uji-sibi-1',
        jenisSumber: 'sibi_kemendikdasmen',
        judulBuku: 'Cerdas Cergas Berbahasa dan Bersastra Indonesia Kelas X',
        jenjang: 'SMA/MA',
        kelas: '10',
        mataPelajaran: 'Bahasa Indonesia',
        penulis: 'Fadillah Tri Aulia, Sefi Indra Gumilar',
        urlSumber: 'https://buku.kemendikdasmen.go.id/katalog',
        statusVerifikasi: 'terverifikasi_katalog',
      },
    ];

    const originalBefore = JSON.stringify(getCuratedModulExampleById('sma_10_bindo_lho')!.modul);
    const cloned = cloneCuratedExampleAsTeacherDraft(
      'sma_10_bindo_lho',
      teacherProfile,
      teacherTP,
      linkedSibiRef
    );

    expect(cloned.draftSource).toBe('user_edited');
    expect(cloned.namaSekolah).toBe('SMAN 4 Uji');
    expect(cloned.namaGuru).toBe('Pak Hadi Santoso');
    expect(cloned.referensiSumber?.[0].judulBuku).toBe(
      'Cerdas Cergas Berbahasa dan Bersastra Indonesia Kelas X'
    );

    // Mutasi salinan -> template asli tetap utuh 100%
    cloned.pemahamanBermakna = '[Uji Salin 12.4] Pemahaman yang disunting guru.';
    expect(JSON.stringify(getCuratedModulExampleById('sma_10_bindo_lho')!.modul)).toBe(originalBefore);

    // Simpan ke localStorage & verifikasi load + Backup JSON export/import + Cloud Sync 3-way merge
    const saveRes = saveModulAjarDraft(teacherProfile, teacherTP, 'inquiry', cloned, 'user_edited');
    expect(saveRes.ok).toBe(true);

    const loaded = loadModulAjarDraft(teacherProfile, teacherTP, 'inquiry');
    expect(loaded?.pemahamanBermakna).toContain('[Uji Salin 12.4]');
    const latest = loadLatestModulAjarDraft(teacherProfile, teacherTP);
    expect(latest?.doc.pemahamanBermakna).toContain('[Uji Salin 12.4]');

    // Uji cross-jenjang copy-to-draft (guru SD menyalin contoh SMK ke TP SD-nya) -> reload harus tetap memuat salinan
    const sdProfile = makeTeacherProfile({
      schoolId: 'sch_sd_cross',
      namaSekolah: 'SDN Harapan',
      jenjang: 'SD/MI',
      kelasUtama: '4',
      mataPelajaranUtama: 'IPAS',
    });
    const sdTP: CustomTPItem = {
      id: 'ipas-fb-s1-tumbuhan-fotosintesis',
      kode: '4.1',
      elemen: 'Pemahaman IPAS',
      materiPokok: 'Fotosintesis Tumbuhan',
      tujuanPembelajaran: 'Mendeskripsikan proses fotosintesis.',
      arahanRangkuman: '',
      alokasiJP: 2,
      mingguMulai: 1,
      mingguSelesai: 1,
    };
    const crossClone = cloneCuratedExampleAsTeacherDraft('smk_11_pkk_prototipe', sdProfile, sdTP);
    crossClone.pemahamanBermakna = '[Cross Copy Persist] Diadaptasi ke kelas SD.';
    saveModulAjarDraft(sdProfile, sdTP, crossClone.modelType || 'pjbl', crossClone, 'user_edited');
    const crossReloaded = loadLatestModulAjarDraft(sdProfile, sdTP);
    expect(crossReloaded?.doc.pemahamanBermakna).toContain('[Cross Copy Persist]');

    // Backup export -> clear -> import
    const backupJson = exportBackupDataJson();
    localStorage.clear();
    expect(loadLatestModulAjarDraft(teacherProfile, teacherTP)).toBeNull();
    const imp = importBackupDataJson(backupJson);
    expect(imp.success).toBe(true);
    expect(loadLatestModulAjarDraft(teacherProfile, teacherTP)?.doc.pemahamanBermakna).toContain('[Uji Salin 12.4]');

    // Cloud Sync 3-way merge
    const mergeRes = analyzeWorkspaceConflict({}, { [saveRes.storageKey]: saveRes.doc }, {});
    expect(mergeRes.conflicts).toHaveLength(0);
    expect((mergeRes.mergedEntries[saveRes.storageKey] as ModulAjarDokumen).pemahamanBermakna).toContain('[Uji Salin 12.4]');
  });

  it('Gate 8: Ekspor Word (.docx) valid untuk seluruh 4 contoh terkurasi & draf legacy diferensiasi tanpa tag undefined/error', async () => {
    for (const ex of getCuratedModulExamples()) {
      await exportModulAjarToDocx(ex.modul, ex.sampleProfile);
      const calls = vi.mocked(saveAs).mock.calls;
      const blob = calls[calls.length - 1]?.[0] as Blob;
      expect(blob).toBeDefined();
      const xml = await (await JSZip.loadAsync(await blob.arrayBuffer()))
        .file('word/document.xml')!
        .async('text');
      expect(xml).toContain(ex.modul.tpKode);
      expect(xml).toContain(PROVENANCE_MSG_UNLINKED);
      expect(xml).toContain('Contoh LKPD Terintegrasi');
      expect(xml).not.toContain('undefined');
      expect(xml).not.toContain('[object Object]');
    }

    // Draf legacy model 'diferensiasi' tanpa struktur baru
    const legacyProfile = makeTeacherProfile({ kktpMinTuntas: undefined });
    const legacyDoc: ModulAjarDokumen = {
      id: 'mod-legacy-12-4',
      tpId: 'tp_legacy_12_4',
      modelType: 'diferensiasi',
      draftSource: 'user_edited',
      judul: 'Modul Legacy Diferensiasi',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      rombel: 'VIII-B',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      alokasiWaktu: '3 JP (120 Menit)',
      jumlahPertemuan: 1,
      namaSekolah: legacyProfile.namaSekolah,
      namaGuru: legacyProfile.namaGuru,
      createdAt: '19 November 2026',
      tpKode: '8.9',
      materiPokok: 'Relasi dan Fungsi',
      elemen: 'Aljabar',
      tujuanPembelajaran: 'Menjelaskan relasi dan fungsi dengan diagram panah.',
      kompetensiAwal: ['Himpunan dasar'],
      profilPelajarPancasila: ['Bernalar Kritis'],
      saranaPrasarana: ['Papan tulis'],
      targetPesertaDidik: 'Reguler',
      modelPembelajaran: 'Pembelajaran Berdiferensiasi',
      pemahamanBermakna: 'Fungsi memasangkan tiap input tepat ke satu output.',
      pertanyaanPemantik: ['Apa perbedaan relasi biasa dan fungsi?'],
      kegiatanPembelajaran: [
        {
          pertemuan: 1,
          alokasiMenit: 120,
          pendahuluan: ['Apersepsi himpunan pasangan'],
          inti: ['Latihan pemetaan diagram panah berdiferensiasi'],
          penutup: ['Simpulan dan kuis keluar'],
        },
      ],
      asesmen: { diagnostik: 'Kuis himpunan', formatif: 'Lembar pemetaan', sumatif: 'Tes uraian' },
      rubrikPenilaianSingkat: [
        { kriteria: 'Akurasi Pemetaan', baruBerkembang: 'BB', layak: 'L', cakap: 'C', mahir: 'M' },
      ],
      pengayaanDanRemedial: { pengayaan: 'Komposisi fungsi', remedial: 'Ulang pemetaan dasar' },
      daftarPustaka: ['[Lengkapi referensi satuan pendidikan] Buku teks sekolah.'],
    };

    await exportModulAjarToDocx(legacyDoc, legacyProfile);
    const legacyCalls = vi.mocked(saveAs).mock.calls;
    const legacyBlob = legacyCalls[legacyCalls.length - 1]?.[0] as Blob;
    const legacyXml = await (await JSZip.loadAsync(await legacyBlob.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(legacyXml).toContain('Latihan pemetaan diagram panah berdiferensiasi');
    expect(legacyXml).not.toContain('71-85');
    expect(legacyXml).not.toContain('undefined');
  });

  it('Gate 9: Mock AI Repair Loop maks 1x (net 1 kredit saat repair sukses) & refund penuh saat gagal validasi atau gangguan provider', async () => {
    const smpEx = getCuratedModulExampleById('smp_8_matematika_spldv')!;
    const profile = smpEx.sampleProfile;
    const tp = smpEx.tp;

    let mockCredits = 10;
    vi.spyOn(licenseManager, 'requireActiveLicenseForAction').mockReturnValue(true);
    const deductSpy = vi.spyOn(licenseManager, 'deductQuota').mockImplementation(() => {
      if (mockCredits <= 0) {
        return { success: false, remainingCredits: 0, message: 'Kuota AI habis.' };
      }
      mockCredits -= 1;
      return { success: true, remainingCredits: mockCredits };
    });
    const refundSpy = vi.spyOn(licenseManager, 'refundQuota').mockImplementation((amount = 1) => {
      mockCredits += amount;
      return { remainingCredits: mockCredits };
    });

    const validPayload = structuredClone(smpEx.modul);
    const invalidSlopPayload = structuredClone(smpEx.modul);
    invalidSlopPayload.kegiatanPembelajaran[0].tahapTerstruktur![1].aktivitasGuru =
      'Guru menjelaskan materi.';
    invalidSlopPayload.kegiatanPembelajaran[0].tahapTerstruktur![1].aktivitasSiswa =
      'Siswa berdiskusi.';

    // 1. Attempt 1 slop -> repair 1x sukses -> net 1 kredit terpotong
    const callSpy = vi
      .spyOn(geminiClient, 'callGeminiStructuredJSON')
      .mockResolvedValueOnce(invalidSlopPayload)
      .mockResolvedValueOnce(validPayload);

    const repairPass = await generateContextualModulAjarWithAI(tp, profile, 'pbl');
    expect(repairPass.usedFallback).toBe(false);
    expect(repairPass.repairAttempted).toBe(true);
    expect(callSpy).toHaveBeenCalledTimes(2);
    expect(deductSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy).not.toHaveBeenCalled();
    expect(mockCredits).toBe(9);

    // 2. Attempt 1 & 2 gagal -> berhenti 1x repair, fallback jujur, kuota dikembalikan
    callSpy.mockReset();
    deductSpy.mockClear();
    refundSpy.mockClear();
    callSpy
      .mockResolvedValueOnce(invalidSlopPayload)
      .mockResolvedValueOnce(invalidSlopPayload);

    const repairFail = await generateContextualModulAjarWithAI(tp, profile, 'pbl');
    expect(repairFail.usedFallback).toBe(true);
    expect(repairFail.repairAttempted).toBe(true);
    expect(callSpy).toHaveBeenCalledTimes(2);
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(mockCredits).toBe(9);

    // 3. Provider network error -> refund utuh tanpa repair sia-sia
    callSpy.mockReset();
    refundSpy.mockClear();
    callSpy.mockRejectedValueOnce(new Error('Provider timeout 504'));

    const netFail = await generateContextualModulAjarWithAI(tp, profile, 'pbl');
    expect(netFail.usedFallback).toBe(true);
    expect(netFail.repairAttempted).toBe(false);
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(mockCredits).toBe(9);
  });

  it('Gate 10: ModulAjarViewer SSR render menampilkan tombol Galeri Contoh Modul & status provenans sumber tanpa error', () => {
    const ex = getCuratedModulExampleById('sd_4_ipas_fotosintesis')!;
    const html = renderToStaticMarkup(
      React.createElement(ModulAjarViewer, {
        modul: ex.modul,
        schoolProfile: ex.sampleProfile,
        customTP: ex.tp,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
        onOpenLKPDStudio: vi.fn(),
      })
    );
    expect(html).toContain('data-testid="modul-open-examples-btn"');
    expect(html).toContain('Contoh Modul (4 Jenjang)');
    expect(html).toContain(PROVENANCE_MSG_UNLINKED);
    expect(html).toContain('Hydrilla');
  });
});
