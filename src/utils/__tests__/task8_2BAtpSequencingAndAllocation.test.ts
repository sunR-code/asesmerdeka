import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Packer } from 'docx';
import {
  analyzeATPDependencyGraph,
  deduplicateATPValidationIssues,
  recommendATPAssessmentPlan,
  recommendATPOrder,
  reorderTpIdsByStep,
} from '../atpSequencingEngine';
import {
  allocateTPToScheduleAndPersist,
  applyPhaseOrderAndPersist,
  approvePhaseATPPlan,
  collectPhaseTPItems,
  computePhaseATPApprovalFingerprint,
  evaluatePhaseATPApproval,
  getSavedPhaseATPPlan,
  initializeOrSyncPhaseATPPlan,
  listGradeLevelsInFase,
  reconcilePhaseATPApprovalForScope,
  resolveSemesterTPListFromPhaseATP,
  savePhaseATPPlan,
  updatePhaseTPItemInOriginScope,
} from '../atpStorage';
import {
  buildSmartATP,
  buildSmartPromes,
  buildSmartProta,
} from '../perangkatAjarEngine';
import {
  buildATPElements,
  exportATPToDocx,
  exportPromesToDocx,
  exportProtaToDocx,
} from '../docx/docxPerangkatAjar';
import { createStyledDocxDocument } from '../docx/docxShared';
import {
  computeTPContentHash,
  exportBackupDataJson,
  importBackupDataJson,
  getSavedCustomTPList,
  saveCustomTPList,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { saveCPEntry, cpEntryToReferenceMeta, getSavedCPEntries } from '../cpStorage';
import { resolveCPReferenceMetadata } from '../../data/kurikulumMerdekaCP';
import { analyzeWorkspaceConflict } from '../cloudSyncManager';
import { saveModulAjarDraft, loadLatestModulAjarDraft, saveLKPDDraft, loadLatestLKPDDraft } from '../perangkatDraftStorage';
import { ATPSubTab } from '../../components/hub/ATPSubTab';
import {
  ATPAllocationPanel,
  TPAssessmentEditor,
  TPPrerequisiteEditor,
} from '../../components/hub/ATPAllocationPanel';
import type { ATPDokumen } from '../../types/perangkatAjar';

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
    schoolId: 'sch_task82b_test',
    instansiDinas: 'Dinas Pendidikan Uji',
    namaSekolah: 'SMP Negeri 82B Uji',
    alamatSekolah: 'Jl. Kurikulum Merdeka No. 12',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    daftarRombel: ['VIII A', 'VIII B'],
    mataPelajaranUtama: 'Matematika',
    namaGuru: 'Ratna Kusumawati, S.Pd.',
    nipGuru: '198803122015022001',
    namaKepalaSekolah: 'Drs. Hendra Wijaya, M.Pd.',
    nipKepalaSekolah: '197001101995121002',
    kotaSekolah: 'Yogyakarta',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    jpPerMinggu: 5,
    ...overrides,
  };
}

function makeTP(overrides: Partial<CustomTPItem> & Pick<CustomTPItem, 'id' | 'kode' | 'materiPokok'>): CustomTPItem {
  return {
    elemen: 'Aljabar',
    tujuanPembelajaran: `Peserta didik mampu memahami dan menerapkan ${overrides.materiPokok} secara kontekstual.`,
    kompetensiInti: 'Memahami dan menerapkan konsep',
    alokasiJP: 10,
    topikUtama: overrides.materiPokok,
    subTopik: ['Konsep dasar', 'Penerapan'],
    buktiKetercapaian: [`Mampu menyelesaikan masalah ${overrides.materiPokok} dengan langkah runtut.`],
    ...overrides,
  };
}

async function readLastExportedDocxXml(): Promise<string> {
  const calls = vi.mocked(saveAs).mock.calls;
  const lastCall = calls[calls.length - 1];
  const blob = lastCall[0] as Blob;
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')?.async('string');
  return xml || '';
}

describe('Task 8.2B — ATP per Fase, Logical Sequencing, Prerequisite Validation & Academic Allocation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. ATP FASE & KOMPATIBILITAS LEGACY
  // =========================================================================
  it('1. Mengelola ATP satu fase utuh (lintas kelas/semester), tautan CP resmi, isolasi lintas fase, serta kompatibilitas ATP legacy & tanpa prasyarat', () => {
    const profile = makeProfile();
    expect(listGradeLevelsInFase('SMP/MTs', 'Fase D (Kelas 7-9 SMP)')).toEqual(['7', '8', '9']);

    const savedCP = saveCPEntry(profile, {
      mataPelajaran: 'Matematika',
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Aljabar',
      teksCP: 'Peserta didik dapat mengenali, memprediksi dan menggeneralisasi pola dalam bentuk susunan benda dan bilangan.',
      asalCP: 'input_guru',
    });

    const tpKelas7Sem1 = makeTP({
      id: 'tp_d_7_1',
      kode: '7.1',
      materiPokok: 'Operasi Bilangan Bulat',
      kompetensiInti: 'Mengoperasikan bilangan bulat',
      referensiCP: cpEntryToReferenceMeta(savedCP),
    });
    const tpKelas8Sem1 = makeTP({
      id: 'tp_d_8_1',
      kode: '8.1',
      materiPokok: 'Persamaan Linear Satu Variabel',
      kompetensiInti: 'Menyelesaikan persamaan linear satu variabel',
    });
    const tpKelas9Sem2 = makeTP({
      id: 'tp_d_9_2',
      kode: '9.2',
      materiPokok: 'Sistem Persamaan Linear Dua Variabel',
      kompetensiInti: 'Memodelkan dan menyelesaikan SPLDV',
    });

    saveCustomTPList('Matematika', '7', '1 (Ganjil)', [tpKelas7Sem1], {
      ...profile,
      kelasUtama: '7',
      semester: '1 (Ganjil)',
    });
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [tpKelas8Sem1], profile);
    saveCustomTPList('Matematika', '9', '2 (Genap)', [tpKelas9Sem2], {
      ...profile,
      kelasUtama: '9',
      semester: '2 (Genap)',
    });

    // Simpan TP dari Fase E (SMA Kelas 10) untuk memastikan isolasi lintas fase ketat
    const smaProfile = makeProfile({ jenjang: 'SMA/MA', kelasUtama: '10', semester: '1 (Ganjil)' });
    const tpFaseE = makeTP({
      id: 'tp_e_10_1',
      kode: '10.1',
      materiPokok: 'Logaritma Fase E',
      referensiCP: resolveCPReferenceMetadata('Matematika', 'Fase E (Kelas 10 SMA)', 'Aljabar', 'SMA/MA'),
    });
    saveCustomTPList('Matematika', '10', '1 (Ganjil)', [tpFaseE], smaProfile);

    const collected = collectPhaseTPItems(profile, [tpKelas8Sem1]);
    expect(collected.tpItems.map((t) => t.id)).toEqual(['tp_d_7_1', 'tp_d_8_1', 'tp_d_9_2']);
    expect(collected.tpById.has('tp_e_10_1')).toBe(false);

    const plan = initializeOrSyncPhaseATPPlan(profile, [tpKelas8Sem1]);
    expect(plan.fase).toBe('Fase D (Kelas 7-9 SMP)');
    expect(plan.referensiCP?.elemenCP).toBe('Aljabar');
    expect(plan.orderedTpIds).toEqual(['tp_d_7_1', 'tp_d_8_1', 'tp_d_9_2']);

    // ATP tetap dapat disusun penuh walau belum ada prasyarat antar-TP (info prasyarat tidak memblokir dokumen)
    const atp = buildSmartATP([tpKelas8Sem1], profile, { phasePlan: plan });
    expect(atp.items).toHaveLength(3);
    expect(atp.referensiCP?.elemenCP).toBe('Aljabar');
    expect(atp.peringatanValidasi).toBeUndefined();
    const graphInfo = analyzeATPDependencyGraph(plan.orderedTpIds, collected.tpById, plan.fase);
    expect(graphInfo.valid).toBe(true);
    expect(graphInfo.issues.some((w) => w.kind === 'empty_prerequisites')).toBe(true);

    // Kompatibilitas ATPDokumen legacy tanpa field baru (versi/statusPenyusunan/prasyaratTpIds)
    const legacyAtp: ATPDokumen = {
      id: 'atp_legacy',
      satuanPendidikan: 'SMP Uji Legacy',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D',
      kelas: '8',
      tahunAjaran: '2025/2026',
      namaGuru: 'Guru Legacy',
      nipGuru: '198001012005011001',
      namaKepalaSekolah: 'Kepala Legacy',
      nipKepalaSekolah: '197001011998011001',
      kotaSekolah: 'Sleman',
      capaianPembelajaranFase: 'CP Legacy Matematika',
      totalJP: 10,
      items: [
        {
          no: 1,
          kodeTP: '8.L1',
          elemen: 'Bilangan',
          lingkupMateri: 'Rasio',
          tujuanPembelajaran: 'Memahami konsep rasio.',
          alokasiJP: 10,
          profilPancasila: ['Bernalar Kritis'],
          indikatorKetercapaian: 'Mampu menyelesaikan masalah rasio.',
          asesmen: 'Tes lisan',
          kataKunci: 'Rasio',
        },
      ],
    };
    const elements = buildATPElements(legacyAtp, profile);
    expect(elements.length).toBeGreaterThan(2);
  });

  // =========================================================================
  // 2. VALIDASI PRASYARAT & GRAPH DEPENDENCY ENGINE
  // =========================================================================
  it('2. Memvalidasi 1 prasyarat, multi-prasyarat, missing target, self-reference, cycle, out-of-order, cross-phase, dan menjaga prasyarat free-text tetap utuh', () => {
    const tpA = makeTP({ id: 'tp_a', kode: '8.1', materiPokok: 'Konsep Bilangan', prasyarat: ['Berhitung dasar SD'] });
    const tpB = makeTP({ id: 'tp_b', kode: '8.2', materiPokok: 'Aljabar Dasar', prasyaratTpIds: ['tp_a'] });
    const tpC = makeTP({ id: 'tp_c', kode: '8.3', materiPokok: 'SPLDV', prasyaratTpIds: ['tp_a', 'tp_b'] });

    const validMap = new Map<string, CustomTPItem>([
      ['tp_a', tpA],
      ['tp_b', tpB],
      ['tp_c', tpC],
    ]);

    // Urutan valid (1 prereq & multi-prereq terpenuhi sebelum target)
    const cleanGraph = analyzeATPDependencyGraph(['tp_a', 'tp_b', 'tp_c'], validMap, 'Fase D');
    expect(cleanGraph.valid).toBe(true);
    expect(cleanGraph.hasBlockingCycle).toBe(false);
    expect(cleanGraph.hasOutOfOrder).toBe(false);
    // Free-text prasyarat pada tpA tidak disentuh atau dikonversi paksa
    expect(tpA.prasyarat).toEqual(['Berhitung dasar SD']);

    // Out-of-order (tpC muncul sebelum prasyarat tpB)
    const outOrderGraph = analyzeATPDependencyGraph(['tp_c', 'tp_a', 'tp_b'], validMap, 'Fase D');
    expect(outOrderGraph.hasOutOfOrder).toBe(true);
    expect(outOrderGraph.issues.some((i) => i.kind === 'out_of_order' && i.tpId === 'tp_c')).toBe(true);

    // Self-reference, missing target, cross-phase
    const tpBad = makeTP({
      id: 'tp_bad',
      kode: '8.4',
      materiPokok: 'Geometri',
      prasyaratTpIds: ['tp_bad', 'tp_deleted_999', 'tp_fase_lain'],
    });
    const tpCrossPhase = makeTP({
      id: 'tp_fase_lain',
      kode: '10.1',
      materiPokok: 'Trigonometri Fase E',
      referensiCP: resolveCPReferenceMetadata('Matematika', 'Fase E (Kelas 10 SMA)', 'Geometri', 'SMA/MA'),
    });
    const badMap = new Map<string, CustomTPItem>([
      ['tp_a', tpA],
      ['tp_bad', tpBad],
      ['tp_fase_lain', tpCrossPhase],
    ]);
    const badGraph = analyzeATPDependencyGraph(['tp_a', 'tp_bad', 'tp_fase_lain'], badMap, 'Fase D');
    expect(badGraph.valid).toBe(false);
    expect(badGraph.issues.some((i) => i.kind === 'self_reference' && i.tpId === 'tp_bad')).toBe(true);
    expect(badGraph.hasMissingTargets).toBe(true);
    expect(badGraph.missingTargetIds).toContain('tp_deleted_999');
    expect(badGraph.hasCrossPhase).toBe(true);
    expect(badGraph.issues.some((i) => i.kind === 'cross_phase')).toBe(true);

    // Circular dependency cycle (A -> B -> A)
    const tpCycle1 = makeTP({ id: 'cyc_1', kode: '8.5', materiPokok: 'Pola A', prasyaratTpIds: ['cyc_2'] });
    const tpCycle2 = makeTP({ id: 'cyc_2', kode: '8.6', materiPokok: 'Pola B', prasyaratTpIds: ['cyc_1'] });
    const cycleMap = new Map<string, CustomTPItem>([
      ['cyc_1', tpCycle1],
      ['cyc_2', tpCycle2],
    ]);
    const cycGraph = analyzeATPDependencyGraph(['cyc_1', 'cyc_2'], cycleMap, 'Fase D');
    expect(cycGraph.hasBlockingCycle).toBe(true);
    expect(cycGraph.cyclePaths.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // 3. REKOMENDASI URUTAN DEPENDENCY-AWARE & PREVIEW TANPA MUTASI DIAM-DIAM
  // =========================================================================
  it('3. Menghasilkan rekomendasi topologis deterministik, menghormati urutan guru bila tanpa prasyarat, memblokir cycle, dan tidak memutasi plan sebelum diterapkan', () => {
    const profile = makeProfile();
    const tp1 = makeTP({ id: 'id_1', kode: '8.1', materiPokok: 'Dasar Aljabar' });
    const tp2 = makeTP({ id: 'id_2', kode: '8.2', materiPokok: 'Persamaan Linear', prasyaratTpIds: ['id_1'] });
    const tp3 = makeTP({ id: 'id_3', kode: '8.3', materiPokok: 'Aplikasi SPLDV', prasyaratTpIds: ['id_2'] });
    const tpIndependent = makeTP({ id: 'id_4', kode: '8.4', materiPokok: 'Statistika Deskriptif' });

    const initialList = [tp3, tpIndependent, tp2, tp1];
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', initialList, profile);
    const plan = initializeOrSyncPhaseATPPlan(profile, initialList);
    savePhaseATPPlan(profile, plan);

    const tpMap = new Map(initialList.map((t) => [t.id, t]));
    const rec = recommendATPOrder(['id_3', 'id_4', 'id_2', 'id_1'], tpMap, 'Fase D');

    expect(rec.hasBlockingCycle).toBe(false);
    expect(rec.recommendedOrder.indexOf('id_1')).toBeLessThan(rec.recommendedOrder.indexOf('id_2'));
    expect(rec.recommendedOrder.indexOf('id_2')).toBeLessThan(rec.recommendedOrder.indexOf('id_3'));
    expect(rec.changedCount).toBeGreaterThan(0);
    // Preview tidak boleh memutasi plan yang tersimpan
    expect(getSavedPhaseATPPlan(profile, 'Fase D (Kelas 7-9 SMP)')?.orderedTpIds).toEqual([
      'id_3',
      'id_4',
      'id_2',
      'id_1',
    ]);

    // Tanpa prasyarat, urutan manual guru dipertahankan 100%
    const freeList = [tp1, tpIndependent].map((t) => ({ ...t, prasyaratTpIds: [] }));
    const freeMap = new Map(freeList.map((t) => [t.id, t]));
    const recNoPrereq = recommendATPOrder(['id_4', 'id_1'], freeMap, 'Fase D');
    expect(recNoPrereq.recommendedOrder).toEqual(['id_4', 'id_1']);
    expect(recNoPrereq.changedCount).toBe(0);

    // Cycle memblokir rekomendasi alih-alih memberi urutan palsu
    const c1 = makeTP({ id: 'c1', kode: '8.7', materiPokok: 'C1', prasyaratTpIds: ['c2'] });
    const c2 = makeTP({ id: 'c2', kode: '8.8', materiPokok: 'C2', prasyaratTpIds: ['c1'] });
    const recCycle = recommendATPOrder(['c1', 'c2'], new Map([['c1', c1], ['c2', c2]]), 'Fase D');
    expect(recCycle.hasBlockingCycle).toBe(true);
    expect(recCycle.recommendedOrder).toEqual(['c1', 'c2']);
    expect(recCycle.blockingReason).toContain('siklus');
  });

  // =========================================================================
  // 4. REORDER MANUAL, PERSISTENSI IDENTITAS TP, TAUTAN HILIR, & UNDO
  // =========================================================================
  it('4. Reorder naik/turun menyimpan urutan baru, mempertahankan tp.id & kode, menjaga tautan draf Modul Ajar & LKPD, serta mendukung Undo', () => {
    const profile = makeProfile();
    const tp1 = makeTP({ id: 'tpid_stable_1', kode: '8.1', materiPokok: 'Bilangan Berpangkat' });
    const tp2 = makeTP({ id: 'tpid_stable_2', kode: '8.2', materiPokok: 'Teorema Pythagoras' });
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [tp1, tp2], profile);

    // Simpan draf Modul Ajar & LKPD tertaut ke tpid_stable_2
    saveModulAjarDraft(
      profile,
      tp2,
      'pbl',
      {
        id: 'modul_draft_82',
        tpId: tp2.id,
        tpKode: tp2.kode,
        modelType: 'pbl',
        judul: 'Modul Pythagoras',
        mataPelajaran: 'Matematika',
        jenjangFase: 'Fase D (Kelas 7-9 SMP)',
        kelas: '8',
        rombel: 'VIII A',
        semester: '1 (Ganjil)',
        tahunAjaran: '2026/2027',
        alokasiWaktu: '10 JP',
        jumlahPertemuan: 2,
        namaSekolah: profile.namaSekolah,
        namaGuru: profile.namaGuru,
        nipGuru: profile.nipGuru,
        namaKepalaSekolah: profile.namaKepalaSekolah,
        nipKepalaSekolah: profile.nipKepalaSekolah,
        kotaSekolah: profile.kotaSekolah,
        createdAt: '2026-07-15',
        materiPokok: tp2.materiPokok,
        elemen: tp2.elemen,
        tujuanPembelajaran: tp2.tujuanPembelajaran,
        kompetensiAwal: [],
        profilPelajarPancasila: ['Bernalar Kritis'],
        saranaPrasarana: [],
        targetPesertaDidik: 'Reguler',
        modelPembelajaran: 'Problem Based Learning',
        pemahamanBermakna: 'Relasi sisi segitiga siku-siku',
        pertanyaanPemantik: [],
        kegiatanPembelajaran: [],
        asesmen: { diagnostik: '', formatif: '', sumatif: '' },
        rubrikPenilaianSingkat: [],
        pengayaanDanRemedial: { pengayaan: '', remedial: '' },
        refleksiGuru: [],
        refleksiSiswa: [],
        glosarium: [],
        daftarPustaka: [],
      }
    );
    saveLKPDDraft(
      profile,
      tp2,
      'kasus',
      {
        id: 'lkpd_draft_82',
        tpId: tp2.id,
        tpKode: tp2.kode,
        judul: 'LKPD Pythagoras',
        mataPelajaran: 'Matematika',
        kelas: '8',
        semester: '1 (Ganjil)',
        tujuanPembelajaran: tp2.tujuanPembelajaran,
        petunjukPengerjaan: ['Kerjakan berkelompok'],
        stimulusKasus: { judul: 'Tangga Dinding', teks: 'Hitung panjang tangga' },
        langkahAktivitas: [{ langkahKe: 1, instruksi: 'Ukur sisi siku' }],
        pertanyaanAnalisis: [{ nomor: 1, pertanyaan: 'Berapa kuadrat sisi miring?' }],
        kesimpulanRefleksi: ['a^2 + b^2 = c^2'],
      }
    );

    const initialPlan = initializeOrSyncPhaseATPPlan(profile, [tp1, tp2]);
    const movedOrder = reorderTpIdsByStep(initialPlan.orderedTpIds, 'tpid_stable_2', 'up');
    expect(movedOrder).toEqual(['tpid_stable_2', 'tpid_stable_1']);

    const { updatedPlan, updatedActiveTpList } = applyPhaseOrderAndPersist({
      profile,
      currentPlan: initialPlan,
      nextOrderedTpIds: movedOrder,
      activeTpList: [tp1, tp2],
      savePreviousForUndo: true,
    });

    expect(updatedPlan.orderedTpIds).toEqual(['tpid_stable_2', 'tpid_stable_1']);
    expect(updatedPlan.previousOrderedTpIds).toEqual(['tpid_stable_1', 'tpid_stable_2']);
    expect(updatedActiveTpList[0].id).toBe('tpid_stable_2');
    expect(updatedActiveTpList[0].kode).toBe('8.2');

    // Tautan Modul Ajar & LKPD ke tpid_stable_2 tetap valid setelah reorder
    expect(loadLatestModulAjarDraft(profile, updatedActiveTpList[0])?.doc.judul).toBe('Modul Pythagoras');
    expect(loadLatestLKPDDraft(profile, updatedActiveTpList[0])?.doc.judul).toBe('LKPD Pythagoras');

    // Undo mengembalikan urutan awal tanpa merusak isi TP
    const undoRes = applyPhaseOrderAndPersist({
      profile,
      currentPlan: updatedPlan,
      nextOrderedTpIds: updatedPlan.previousOrderedTpIds!,
      activeTpList: updatedActiveTpList,
      savePreviousForUndo: false,
    });
    expect(undoRes.updatedPlan.orderedTpIds).toEqual(['tpid_stable_1', 'tpid_stable_2']);
    expect(undoRes.updatedActiveTpList.map((t) => t.kode)).toEqual(['8.1', '8.2']);
  });

  // =========================================================================
  // 5. INDIKATOR, ASESMEN KONTEKSTUAL, PEMETAAN LAYER 2, & INTEGRASI PROTA/PROMES
  // =========================================================================
  it('5. Mengelola indikator & asesmen kontekstual yang dapat diedit, memetakan Layer 2 tanpa menduplikasi TP, memvalidasi kapasitas JP, dan mengintegrasikan Prota & Promes tanpa regresi', async () => {
    const profile = makeProfile();
    const tpPractice = makeTP({
      id: 'tp_m_1',
      kode: '8.1',
      materiPokok: 'Praktik Penyajian Data',
      kompetensiInti: 'Menyajikan dan mempraktikkan diagram statistik',
      tujuanPembelajaran: 'Peserta didik dapat mempraktikkan pengumpulan data dan menyajikan diagram batang secara akurat.',
      buktiKetercapaian: ['Peserta didik mampu menyusun diagram batang lengkap dengan skala tepat.'],
      alokasiJP: 15,
    });
    const tpOverCap = makeTP({
      id: 'tp_m_2',
      kode: '8.2',
      materiPokok: 'Statistika Lanjutan',
      alokasiJP: 200, // melebihi kapasitas 18 minggu x 5 JP = 90 JP agar peringatan kapasitas muncul
    });

    const autoRec = recommendATPAssessmentPlan(tpPractice, 'PJOK Praktik');
    expect(autoRec.bentukUtama).toContain('Praktik / unjuk kerja');

    // Simpan TP1 di Sem 1 & TP2 di Sem 2, lalu uji pemetaan Layer 2
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [tpPractice], profile);
    saveCustomTPList('Matematika', '8', '2 (Genap)', [tpOverCap], { ...profile, semester: '2 (Genap)' });

    const editedTp1: CustomTPItem = {
      ...tpPractice,
      rencanaAsesmen: {
        bentukUtama: ['Proyek', 'Presentasi'],
        deskripsi: 'Proyek survei data kelas dan presentasi kelompok.',
        isEditedByGuru: true,
      },
    };
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [editedTp1], profile);

    let plan = initializeOrSyncPhaseATPPlan(profile, [editedTp1]);
    plan = allocateTPToScheduleAndPersist({
      profile,
      currentPlan: plan,
      allocation: {
        tpId: 'tp_m_2',
        tahunAjaran: '2026/2027',
        kelas: '8',
        semester: '1 (Ganjil)',
        alokasiJP: 200,
      },
      phaseTPs: [editedTp1, tpOverCap],
    });

    // Layer 2 alokasi memetakan tp_m_2 ke Sem 1 TANPA mengubah urutan fase atau menduplikasi item TP
    expect(plan.orderedTpIds).toEqual(['tp_m_1', 'tp_m_2']);
    expect(resolveSemesterTPListFromPhaseATP(profile, '1 (Ganjil)', [editedTp1])?.map((t) => t.id)).toEqual([
      'tp_m_1',
      'tp_m_2',
    ]);

    const atp = buildSmartATP([editedTp1], profile, { phasePlan: plan });
    expect(atp.items[0].indikatorKetercapaian).toContain('diagram batang');
    expect(atp.items[0].asesmen).toContain('Proyek survei data kelas');
    expect(atp.peringatanValidasi?.some((w) => w.includes('melebihi kapasitas kalender aktif'))).toBe(true);

    // Integrasi Prota & Promes mengikuti pemetaan ATP Fase ketika tersedia & ekspor DOCX Prota/Promes tetap valid
    const prota = buildSmartProta(profile, [editedTp1]);
    const sem1ProtaCodes = prota.itemsSemester1.map((i) => i.kodeTP);
    expect(sem1ProtaCodes).toContain('8.1');
    expect(sem1ProtaCodes).toContain('8.2');

    const promes = buildSmartPromes(profile, [editedTp1]);
    expect(promes.rows.map((r) => r.kodeTP)).toContain('8.2');

    await exportProtaToDocx(prota, profile);
    const protaXml = await readLastExportedDocxXml();
    expect(protaXml).toContain('PROGRAM TAHUNAN');
    expect(protaXml).toContain('8.2');

    await exportPromesToDocx(promes, profile);
    const promesXml = await readLastExportedDocxXml();
    expect(promesXml).toContain('PROGRAM SEMESTER');

    // Update lintas semester dari ATP Fase memperbarui storage asal TP
    const originRes = updatePhaseTPItemInOriginScope({
      profile,
      tpId: 'tp_m_2',
      origin: { kelas: '8', semester: '2 (Genap)', tahunAjaran: '2026/2027' },
      activeTpList: [editedTp1],
      updater: (t) => ({ ...t, prasyaratTpIds: ['tp_m_1'] }),
    });
    expect(originRes.updatedOrigin).toBe(true);
    const savedSem2 = getSavedCustomTPList('Matematika', '8', '2 (Genap)', {
      ...profile,
      semester: '2 (Genap)',
    });
    expect(savedSem2?.[0].prasyaratTpIds).toEqual(['tp_m_1']);
  });

  // =========================================================================
  // 6. EKSPOR DOCX ATP LANDSCAPE TANPA TEKS RUSAK & SESUAI URUTAN TERBARU
  // =========================================================================
  it('6. Mengekspor DOCX ATP Landscape sesuai urutan terbaru, menampilkan prasyarat, indikator, asesmen, pemetaan, dan bebas undefined/null/[object Object]', async () => {
    const profile = makeProfile();
    const tp1 = makeTP({
      id: 'tp_docx_1',
      kode: '8.1',
      materiPokok: 'Teorema Pythagoras',
      kompetensiInti: 'Membuktikan dan menerapkan Teorema Pythagoras',
      alokasiJP: 12,
    });
    const tp2 = makeTP({
      id: 'tp_docx_2',
      kode: '8.2',
      materiPokok: 'Jarak Titik Koordinat',
      kompetensiInti: 'Menentukan jarak dua titik pada bidang Kartesius',
      prasyaratTpIds: ['tp_docx_1'],
      alokasiJP: 10,
    });

    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [tp1, tp2], profile);
    const refCP = resolveCPReferenceMetadata('Matematika', 'Fase D (Kelas 7-9 SMP)', 'Geometri', 'SMP/MTs');
    const syncedPlan = savePhaseATPPlan(profile, {
      ...initializeOrSyncPhaseATPPlan(profile, [tp1, tp2]),
      orderedTpIds: ['tp_docx_1', 'tp_docx_2'],
      versi: 2,
      referensiCP: refCP,
    });
    const approveRes = approvePhaseATPPlan({
      profile,
      plan: syncedPlan,
      orderedTpIds: ['tp_docx_1', 'tp_docx_2'],
      tpById: new Map([
        ['tp_docx_1', tp1],
        ['tp_docx_2', tp2],
      ]),
    });
    expect(approveRes.ok).toBe(true);
    const plan = approveRes.updatedPlan;

    const atp = buildSmartATP([tp1, tp2], profile, {
      phasePlan: plan,
      includeAllocationColumn: true,
    });
    await exportATPToDocx(atp, profile);
    const xml = await readLastExportedDocxXml();

    // Orientation landscape check in OOXML pgSz
    expect(xml).toContain('w:orient="landscape"');
    expect(xml).toContain('Disetujui Guru (v3)');
    expect(xml).toContain('046/H/KR/2025');
    expect(xml).toContain('Prasyarat');
    expect(xml).toContain('Indikator Ketercapaian');
    expect(xml).toContain('Rencana Asesmen &amp; Profil Pelajar Pancasila');
    expect(xml).toContain('Pemetaan Kls/Sem');
    expect(xml).toContain('Relasi TP: 8.1');
    expect(xml).not.toContain('undefined');
    expect(xml).not.toContain('null');
    expect(xml).not.toContain('[object Object]');

    // Juga cek pembuatan buffer Packer nyata atas buildATPElements
    const doc = createStyledDocxDocument(profile, 'ATP Uji', buildATPElements(atp, profile), { landscape: true });
    const blob = await Packer.toBlob(doc);
    expect(blob.size).toBeGreaterThan(2000);
  });

  // =========================================================================
  // 7. BACKUP/RESTORE, HASH COMPATIBILITY, & CLOUD SYNC 3-WAY MERGE
  // =========================================================================
  it('7. Backup/Restore menjaga asesmerdeka_atp_v2, hash TP legacy stabil bila field opsional baru kosong, dan Cloud Sync 3-way merge memicu konflik eksplisit pada fase yang sama', () => {
    const profile = makeProfile();
    const legacyTP = makeTP({
      id: 'tp_hash_1',
      kode: '8.1',
      materiPokok: 'Relasi dan Fungsi',
    });
    const baseHash = computeTPContentHash(legacyTP);

    // Tambahan field opsional Task 8.2B kosong/default tidak mengubah content hash legacy
    const extendedTP: CustomTPItem = {
      ...legacyTP,
      prasyaratTpIds: [],
      rencanaAsesmen: undefined,
    };
    expect(computeTPContentHash(extendedTP)).toBe(baseHash);

    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [extendedTP], profile);
    const plan = savePhaseATPPlan(profile, {
      ...initializeOrSyncPhaseATPPlan(profile, [extendedTP]),
      statusPenyusunan: 'disetujui',
      versi: 2,
    });
    expect(plan.statusPenyusunan).toBe('disetujui');

    const backupJson = exportBackupDataJson();
    const parsed = JSON.parse(backupJson) as { entries: Record<string, unknown> };
    expect(parsed.entries['asesmerdeka_atp_v2']).toBeDefined();

    localStorage.clear();
    const restored = importBackupDataJson(backupJson);
    expect(restored.success).toBe(true);
    const reloadedPlan = getSavedPhaseATPPlan(profile, 'Fase D (Kelas 7-9 SMP)');
    expect(reloadedPlan?.statusPenyusunan).toBe('disetujui');
    expect(reloadedPlan?.orderedTpIds).toEqual(['tp_hash_1']);

    // Cloud Sync 3-way merge:
    // Kasus A: 2 perangkat menyunting fase/mapel BERBEDA -> gabung otomatis tanpa konflik
    const baseEntries = {
      asesmerdeka_atp_v2: {
        scope_math_d: { id: 'p1', orderedTpIds: ['tp1', 'tp2'], versi: 1 },
      },
    };
    const devADistinct = {
      asesmerdeka_atp_v2: {
        scope_math_d: { id: 'p1', orderedTpIds: ['tp1', 'tp2'], versi: 1 },
        scope_ipa_d: { id: 'p2', orderedTpIds: ['ipa1', 'ipa2'], versi: 1 },
      },
    };
    const devBDistinct = {
      asesmerdeka_atp_v2: {
        scope_math_d: { id: 'p1', orderedTpIds: ['tp1', 'tp2'], versi: 1 },
        scope_ips_d: { id: 'p3', orderedTpIds: ['ips1'], versi: 1 },
      },
    };
    const distinctMerge = analyzeWorkspaceConflict(baseEntries, devADistinct, devBDistinct);
    expect(distinctMerge.conflicts).toHaveLength(0);
    const mergedMapDistinct = distinctMerge.mergedEntries['asesmerdeka_atp_v2'] as Record<string, unknown>;
    expect(Object.keys(mergedMapDistinct)).toEqual(
      expect.arrayContaining(['scope_math_d', 'scope_ipa_d', 'scope_ips_d'])
    );

    // Kasus B: 2 perangkat menyunting urutan ATP fase YANG SAMA secara konkuren -> konflik eksplisit, dilarang menimpa diam-diam
    const devACollision = {
      asesmerdeka_atp_v2: {
        scope_math_d: { id: 'p1', orderedTpIds: ['tp2', 'tp1'], versi: 2 },
      },
    };
    const devBCollision = {
      asesmerdeka_atp_v2: {
        scope_math_d: { id: 'p1', orderedTpIds: ['tp1', 'tp2'], versi: 2, statusPenyusunan: 'disetujui' },
      },
    };
    const collisionMerge = analyzeWorkspaceConflict(baseEntries, devACollision, devBCollision);
    expect(collisionMerge.conflicts.length).toBeGreaterThan(0);
    expect(
      collisionMerge.conflicts.some(
        (c) => c.storageKey === 'asesmerdeka_atp_v2' && c.locator?.kind === 'object_key'
      )
    ).toBe(true);
  });

  // =========================================================================
  // 8. UI RENDER DESKTOP & MOBILE + KONTROL .no-print PADA ATPSubTab
  // =========================================================================
  it('8. ATPSubTab merender tampilan tabel ATP fase, kontrol reorder .no-print, prasyarat, indikator, asesmen, dan wrapper responsif', () => {
    const profile = makeProfile();
    const tp1 = makeTP({ id: 'ui_tp_1', kode: '8.1', materiPokok: 'Pola Bilangan' });
    const tp2 = makeTP({ id: 'ui_tp_2', kode: '8.2', materiPokok: 'Koordinat Kartesius', prasyaratTpIds: ['ui_tp_1'] });

    const html = renderToStaticMarkup(
      React.createElement(ATPSubTab, {
        tpList: [tp1, tp2],
        schoolProfile: profile,
        onUpdateTPList: () => {},
        onToast: () => {},
      })
    );

    expect(html).toContain('Alur Tujuan Pembelajaran (ATP) Tingkat Fase');
    expect(html).toContain('Rekomendasikan Urutan ATP');
    expect(html).toContain('Pemetaan Kelas &amp; Semester');
    expect(html).toContain('Pola Bilangan');
    expect(html).toContain('Koordinat Kartesius');
    expect(html).toContain('Naikkan urutan TP 8.1');
    expect(html).toContain('Turunkan urutan TP 8.1');
    expect(html).toContain('no-print');
    expect(html).toContain('ws-table-wrap');
  });

  // =========================================================================
  // 9. TASK 8.2B.2 — FINGERPRINT PERSETUJUAN ATP & INVALIDASI MENYELURUH (16 KASUS)
  // =========================================================================
  it('9. Menjaga validitas persetujuan ATP dengan fingerprint kanonik & otomatis menginvalidasi bila ada perubahan substantif (termasuk via Cloud Sync), tanpa false positive pada metadata non-substantif', () => {
    const profile = makeProfile();
    const savedCP = saveCPEntry(profile, {
      mataPelajaran: 'Matematika',
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Bilangan',
      teksCP: 'Teks CP Bilangan awal.',
      asalCP: 'input_guru',
    });
    const baseTP1 = makeTP({
      id: 'tp_app_1',
      kode: '8.1',
      materiPokok: 'Bilangan Berpangkat',
      kompetensiInti: 'Memahami operasi bilangan berpangkat',
      lingkupMateri: 'Bilangan Berpangkat',
      subTP: [
        {
          kode: '8.1.A',
          kompetensi: 'Mengidentifikasi sifat pangkat bulat',
          fokusMateri: 'Sifat Pangkat',
          buktiKetercapaian: 'Menuliskan 3 sifat pangkat bulat positif.',
        },
      ],
      referensiCP: cpEntryToReferenceMeta(savedCP),
    });
    const baseTP2 = makeTP({
      id: 'tp_app_2',
      kode: '8.2',
      materiPokok: 'Bentuk Akar',
      prasyaratTpIds: ['tp_app_1'],
      referensiCP: cpEntryToReferenceMeta(savedCP),
    });

    const resetBaseScope = () => {
      saveCustomTPList('Matematika', '8', '1 (Ganjil)', [baseTP1, baseTP2], profile);
      saveCPEntry(profile, {
        ...savedCP,
        teksCP: 'Teks CP Bilangan awal.',
      });
      const synced = initializeOrSyncPhaseATPPlan(profile, [baseTP1, baseTP2]);
      const res = approvePhaseATPPlan({
        profile,
        plan: synced,
        orderedTpIds: synced.orderedTpIds,
        tpById: new Map([
          [baseTP1.id, baseTP1],
          [baseTP2.id, baseTP2],
        ]),
      });
      expect(res.ok).toBe(true);
      return res.updatedPlan;
    };

    // 1–3. Draft -> Approve -> Reopen unchanged -> tetap disetujui
    const initialDraft = initializeOrSyncPhaseATPPlan(profile, [baseTP1, baseTP2]);
    expect(initialDraft.statusPenyusunan).toBe('draft');
    const approvedPlan = resetBaseScope();
    expect(approvedPlan.statusPenyusunan).toBe('disetujui');
    expect(approvedPlan.approvedContentHash).toBeTruthy();

    const canonicalA = computePhaseATPApprovalFingerprint({
      profile,
      plan: approvedPlan,
      orderedTpIds: [baseTP1.id, baseTP2.id],
      tpById: new Map([
        [baseTP1.id, baseTP1],
        [baseTP2.id, baseTP2],
      ]),
    });
    expect(canonicalA.fingerprint).toBe(approvedPlan.approvedContentHash);

    const reopenAtp = buildSmartATP([baseTP1, baseTP2], profile);
    expect(reopenAtp.statusPenyusunan).toBe('disetujui');

    //Helper mutasi TP substantif: wajib menginvalidasi persetujuan
    const assertInvalidatedAfter = (label: string, mutate: () => void) => {
      resetBaseScope();
      mutate();
      const latestTPs = getSavedCustomTPList('Matematika', '8', '1 (Ganjil)', profile) || [baseTP1, baseTP2];
      const atpDoc = buildSmartATP(latestTPs, profile);
      expect(atpDoc.statusPenyusunan, `${label} wajib mendeteksi perlu_ditinjau`).toBe('perlu_ditinjau');
      expect(atpDoc.alasanTinjauUlang?.length || 0, `${label} wajib menyertakan alasan`).toBeGreaterThan(0);
    };

    // 4. Tujuan TP berubah
    assertInvalidatedAfter('Ubah tujuan TP', () => {
      saveCustomTPList(
        'Matematika',
        '8',
        '1 (Ganjil)',
        [{ ...baseTP1, tujuanPembelajaran: 'Tujuan berubah total untuk uji invalidasi.' }, baseTP2],
        profile
      );
    });
    // 5. Kompetensi berubah
    assertInvalidatedAfter('Ubah kompetensi', () => {
      saveCustomTPList(
        'Matematika',
        '8',
        '1 (Ganjil)',
        [{ ...baseTP1, kompetensiInti: 'Mengevaluasi model eksponen lanjutan' }, baseTP2],
        profile
      );
    });
    // 6. Lingkup materi berubah
    assertInvalidatedAfter('Ubah lingkup materi', () => {
      saveCustomTPList(
        'Matematika',
        '8',
        '1 (Ganjil)',
        [{ ...baseTP1, lingkupMateri: 'Notasi Ilmiah & Eksponen' }, baseTP2],
        profile
      );
    });
    // 7. Sub-TP berubah
    assertInvalidatedAfter('Ubah Sub-TP', () => {
      saveCustomTPList(
        'Matematika',
        '8',
        '1 (Ganjil)',
        [
          {
            ...baseTP1,
            subTP: [
              {
                kode: '8.1.A',
                kompetensi: 'Mengubah bentuk pangkat negatif ke pecahan',
                fokusMateri: 'Pangkat Negatif',
                buktiKetercapaian: 'Menyederhanakan 4 ekspresi pangkat negatif.',
              },
            ],
          },
          baseTP2,
        ],
        profile
      );
    });
    // 8. Bukti ketercapaian berubah
    assertInvalidatedAfter('Ubah bukti ketercapaian', () => {
      saveCustomTPList(
        'Matematika',
        '8',
        '1 (Ganjil)',
        [{ ...baseTP1, buktiKetercapaian: ['Indikator baru hasil revisi guru.'] }, baseTP2],
        profile
      );
    });
    // 9. Referensi / teks CP berubah
    assertInvalidatedAfter('Ubah teks CP', () => {
      saveCPEntry(profile, {
        ...savedCP,
        teksCP: 'Teks CP Bilangan yang sudah direvisi guru.',
      });
    });
    // 10. Urutan TP berubah (applyPhaseOrderAndPersist)
    assertInvalidatedAfter('Ubah urutan TP', () => {
      const curr = getSavedPhaseATPPlan(profile, 'Fase D (Kelas 7-9 SMP)')!;
      applyPhaseOrderAndPersist({
        profile,
        currentPlan: curr,
        nextOrderedTpIds: [baseTP2.id, baseTP1.id],
        activeTpList: [baseTP1, baseTP2],
      });
    });
    // 11. Relasi prasyarat berubah
    assertInvalidatedAfter('Ubah prasyarat', () => {
      saveCustomTPList(
        'Matematika',
        '8',
        '1 (Ganjil)',
        [baseTP1, { ...baseTP2, prasyaratTpIds: [] }],
        profile
      );
    });
    // 12. Rencana asesmen berubah
    assertInvalidatedAfter('Ubah rencana asesmen', () => {
      saveCustomTPList(
        'Matematika',
        '8',
        '1 (Ganjil)',
        [
          {
            ...baseTP1,
            rencanaAsesmen: {
              bentukUtama: ['Proyek'],
              deskripsi: 'Proyek investigasi eksponen.',
              isEditedByGuru: true,
            },
          },
          baseTP2,
        ],
        profile
      );
    });
    // 13. Pemetaan Layer 2 berubah
    assertInvalidatedAfter('Ubah pemetaan semester/JP', () => {
      const curr = getSavedPhaseATPPlan(profile, 'Fase D (Kelas 7-9 SMP)')!;
      allocateTPToScheduleAndPersist({
        profile,
        currentPlan: curr,
        allocation: {
          tpId: baseTP2.id,
          tahunAjaran: '2026/2027',
          kelas: '8',
          semester: '2 (Genap)',
          alokasiJP: 18,
        },
        phaseTPs: [baseTP1, baseTP2],
      });
    });

    // 14. Metadata non-substantif (statusReview / catatanGuru / urutan properti objek berbeda) -> TETAP DISETUJUI
    const reApproved = resetBaseScope();
    const metaChangedTP1: CustomTPItem = {
      ...baseTP1,
      statusReview: 'disetujui',
      estimasiMenitSesi: 90,
    };
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [metaChangedTP1, baseTP2], profile);
    savePhaseATPPlan(profile, {
      ...reApproved,
      catatanGuru: 'Catatan administratif sekolah',
    });
    const reconciledNonSub = reconcilePhaseATPApprovalForScope(profile, [metaChangedTP1, baseTP2]);
    expect(reconciledNonSub?.statusPenyusunan).toBe('disetujui');
    expect(buildSmartATP([metaChangedTP1, baseTP2], profile).statusPenyusunan).toBe('disetujui');

    // 15. Re-approve setelah invalidasi menghasilkan snapshot baru
    const editedTP1: CustomTPItem = { ...baseTP1, tujuanPembelajaran: 'Tujuan baru terverifikasi' };
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [editedTP1, baseTP2], profile);
    const invalidated = reconcilePhaseATPApprovalForScope(profile, [editedTP1, baseTP2])!;
    expect(invalidated.statusPenyusunan).toBe('draft');
    expect(invalidated.needsReapprovalReview).toBe(true);
    const reApprovedNew = approvePhaseATPPlan({
      profile,
      plan: invalidated,
      orderedTpIds: invalidated.orderedTpIds,
      tpById: new Map([
        [editedTP1.id, editedTP1],
        [baseTP2.id, baseTP2],
      ]),
    });
    expect(reApprovedNew.ok).toBe(true);
    expect(reApprovedNew.updatedPlan.approvedContentHash).not.toBe(reApproved.approvedContentHash);
    expect(reApprovedNew.updatedPlan.needsReapprovalReview).toBe(false);

    // 16. Simulasi Cloud Sync: perangkat B mengubah TP sumber sementara perangkat A menyetujui versi lama
    const deviceAMap = JSON.parse(localStorage.getItem('asesmerdeka_atp_v2') || '{}');
    const deviceBTPMap = JSON.parse(localStorage.getItem('asesmerdeka_custom_tp_v2') || '{}');
    const tpScopeKey = Object.keys(deviceBTPMap)[0];
    deviceBTPMap[tpScopeKey] = deviceBTPMap[tpScopeKey].map((item: CustomTPItem) =>
      item.id === baseTP2.id ? { ...item, materiPokok: 'Bentuk Akar Revisi Device B' } : item
    );
    const syncAnalysis = analyzeWorkspaceConflict(
      { asesmerdeka_atp_v2: deviceAMap },
      { asesmerdeka_atp_v2: deviceAMap },
      { asesmerdeka_atp_v2: deviceAMap, asesmerdeka_custom_tp_v2: deviceBTPMap }
    );
    localStorage.setItem(
      'asesmerdeka_custom_tp_v2',
      JSON.stringify(syncAnalysis.mergedEntries['asesmerdeka_custom_tp_v2'])
    );
    const pulledTPs = getSavedCustomTPList('Matematika', '8', '1 (Ganjil)', profile)!;
    const postSyncEval = evaluatePhaseATPApproval({
      profile,
      plan: getSavedPhaseATPPlan(profile, 'Fase D (Kelas 7-9 SMP)'),
      orderedTpIds: [editedTP1.id, baseTP2.id],
      tpById: new Map(pulledTPs.map((t) => [t.id, t])),
    });
    expect(postSyncEval.effectiveStatus).toBe('perlu_ditinjau');
    expect(postSyncEval.isStaleApproval).toBe(true);
  });

  // =========================================================================
  // 10. TASK 8.2B.2 — EKSPOR STALE/LEGACY JUJUR, DEDUPLIKASI SIKLUS, TOTAL JP & MOBILE MODAL/GRID
  // =========================================================================
  it('10. Ekspor DOCX menolak label Disetujui saat stale/legacy, deduplikasi pesan siklus 3 TP, label Total JP jelas, dan panel/modal berada di luar tabel untuk mobile', async () => {
    const profile = makeProfile();
    const c1 = makeTP({ id: 'cyc_a', kode: '8.1', materiPokok: 'Konsep A', prasyaratTpIds: ['cyc_c'] });
    const c2 = makeTP({ id: 'cyc_b', kode: '8.2', materiPokok: 'Konsep B', prasyaratTpIds: ['cyc_a'] });
    const c3 = makeTP({ id: 'cyc_c', kode: '8.3', materiPokok: 'Konsep C', prasyaratTpIds: ['cyc_b'] });
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [c1, c2, c3], profile);

    const tpMap = new Map([c1, c2, c3].map((t) => [t.id, t]));
    const graph = analyzeATPDependencyGraph(['cyc_a', 'cyc_b', 'cyc_c'], tpMap, 'Fase D');
    // Semua anggota siklus tetap terdeteksi pada issuesByTpId
    expect(graph.issuesByTpId['cyc_a']?.some((i) => i.kind === 'circular_dependency')).toBe(true);
    expect(graph.issuesByTpId['cyc_b']?.some((i) => i.kind === 'circular_dependency')).toBe(true);
    expect(graph.issuesByTpId['cyc_c']?.some((i) => i.kind === 'circular_dependency')).toBe(true);

    // Banner summary menduplikasi siklus identik menjadi 1 baris saja, rekomendasi tetap diblokir
    const dedupedCycles = deduplicateATPValidationIssues(
      graph.issues.filter((i) => i.kind === 'circular_dependency')
    );
    expect(dedupedCycles).toHaveLength(1);
    expect(recommendATPOrder(['cyc_a', 'cyc_b', 'cyc_c'], tpMap, 'Fase D').hasBlockingCycle).toBe(true);

    // Persetujuan diblokir bila masih ada siklus blocking
    const draftPlan = initializeOrSyncPhaseATPPlan(profile, [c1, c2, c3]);
    const blockedApprove = approvePhaseATPPlan({
      profile,
      plan: draftPlan,
      orderedTpIds: draftPlan.orderedTpIds,
      tpById: tpMap,
      hasBlockingValidation: graph.hasBlockingCycle,
    });
    expect(blockedApprove.ok).toBe(false);

    // Legacy plan yang bertanda 'disetujui' tanpa approvedContentHash wajib tereksport sebagai DRAF — PERLU DITINJAU ULANG
    const legacyUnverifiedPlan = savePhaseATPPlan(profile, {
      ...draftPlan,
      statusPenyusunan: 'disetujui',
      approvedContentHash: undefined,
    });
    const staleAtp = buildSmartATP([c1, c2, c3], profile, { phasePlan: legacyUnverifiedPlan });
    expect(staleAtp.statusPenyusunan).toBe('perlu_ditinjau');
    await exportATPToDocx(staleAtp, profile);
    const staleXml = await readLastExportedDocxXml();
    expect(staleXml).toContain('DRAF — PERLU DITINJAU ULANG');
    expect(staleXml).not.toContain('Disetujui Guru');

    // UI ATPSubTab: total JP jelas & tombol pemetaan/rekomendasi hadir, dan tidak merender editor inline di dalam <td>
    const subtabHtml = renderToStaticMarkup(
      React.createElement(ATPSubTab, {
        tpList: [c1, c2, c3],
        schoolProfile: profile,
        onUpdateTPList: () => {},
        onToast: () => {},
      })
    );
    expect(subtabHtml).toContain('Total ATP Fase');
    expect(subtabHtml).toContain('Semester 1 (seluruh kelas dalam fase)');
    expect(subtabHtml).toContain('Prota &amp; Promes menghitung TP kelas aktif');
    expect(subtabHtml).toContain('Perlu Ditinjau Ulang');
    expect(subtabHtml).toContain('Setujui Ulang ATP');

    // ATPAllocationPanel menggunakan kelas responsif tanpa lebar kolom tetap 110px/135px
    const panelHtml = renderToStaticMarkup(
      React.createElement(ATPAllocationPanel, {
        schoolProfile: profile,
        phasePlan: draftPlan,
        orderedTPs: [c1, c2],
        totalJPPerSemester: { semester1: 20, semester2: 0 },
        kapasitasJPPerSemester: { semester1: 90, semester2: 90 },
        onUpdateAllocation: () => {},
      })
    );
    expect(panelHtml).toContain('atp-alloc-row');
    expect(panelHtml).toContain('atp-alloc-fields');
    expect(panelHtml).not.toContain('1.5fr 110px');

    // TPPrerequisiteEditor & TPAssessmentEditor dirender sebagai modal-overlay responsif (.atp-modal-dialog)
    const prereqModalHtml = renderToStaticMarkup(
      React.createElement(TPPrerequisiteEditor, {
        tp: c1,
        allPhaseTPs: [c1, c2, c3],
        dependents: ['cyc_b'],
        tpById: tpMap,
        onSavePrereqs: () => {},
        onClose: () => {},
      })
    );
    expect(prereqModalHtml).toContain('modal-overlay');
    expect(prereqModalHtml).toContain('atp-modal-dialog');
    expect(prereqModalHtml).toContain('Simpan Prasyarat');
    expect(prereqModalHtml).toContain('Tutup');

    const assessModalHtml = renderToStaticMarkup(
      React.createElement(TPAssessmentEditor, {
        tp: c1,
        currentBentuk: ['Observasi'],
        currentDeskripsi: 'Observasi terstruktur',
        onSaveAssessment: () => {},
        onClose: () => {},
      })
    );
    expect(assessModalHtml).toContain('modal-overlay');
    expect(assessModalHtml).toContain('atp-modal-dialog');
    expect(assessModalHtml).toContain('Simpan Rencana Asesmen');
    expect(assessModalHtml).toContain('Batal');

    // Pastikan getSavedCPEntries tersedia & bebas error
    expect(getSavedCPEntries(profile, 'Fase D (Kelas 7-9 SMP)')).toBeDefined();
  });
});
