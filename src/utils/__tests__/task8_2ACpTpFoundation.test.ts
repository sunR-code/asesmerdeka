import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  resolveCPReferenceMetadata,
  resolveDefaultCPRegulationPreset,
  getAvailableCPReferenceEntries,
  isAgamaBudiPekertiSubject,
  isKepercayaanSubject,
  isKemenagSubject,
  inferRegulationPresetIdFromEntry,
} from '../../data/kurikulumMerdekaCP';
import {
  getSavedCPEntries,
  saveCPEntry,
  resolveCPStatusLabel,
  cpEntryToReferenceMeta,
} from '../cpStorage';
import {
  analyzeCPWithAI,
  approveCPAnalysis,
  updateCPAnalysisDraft,
  buildTPDraftFromApprovedAnalysis,
} from '../cpAnalysisService';
import { analyzeTPMeasurability } from '../kkoHelper';
import {
  computeTPContentHash,
  exportBackupDataJson,
  importBackupDataJson,
  getSavedCustomTPList,
  saveCustomTPList,
  saveSchoolProfile,
  markSavedLKPDDraftsNeedsReview,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import * as licenseManager from '../licenseManager';
import { analyzeWorkspaceConflict } from '../cloudSyncManager';
import { loadLatestLKPDDraft, loadLatestModulAjarDraft } from '../perangkatDraftStorage';
import { exportLKPDToDocx, exportModulAjarToDocx } from '../docx/docxPerangkatAjar';
import { TPEditorForm } from '../../components/hub/TPEditorForm';
import { CPWorkspacePanel } from '../../components/hub/CPWorkspacePanel';

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

function makeProfile(overrides?: Partial<SchoolProfile>): SchoolProfile {
  return {
    schoolId: 'sch_task82a_test',
    instansiDinas: 'Dinas Pendidikan Uji',
    namaSekolah: 'SMP Negeri 82A Uji',
    alamatSekolah: 'Jl. Merdeka Belajar No. 8',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    daftarRombel: ['VIII A', 'VIII B'],
    mataPelajaranUtama: 'Matematika',
    namaGuru: 'Guru Uji, S.Pd.',
    nipGuru: '198801012012011001',
    namaKepalaSekolah: 'Kepala Sekolah, M.Pd.',
    nipKepalaSekolah: '197501012000011001',
    kotaSekolah: 'Yogyakarta',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

describe('Task 8.2A — CP, Analisis CP, TP Foundation & Legacy Compatibility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('membedakan secara ketat regulasi CP: Agama & Budi Pekerti (BKPDM 020/2026), Pendidikan Kepercayaan (BKPDM 021/2026), Mapel Umum (SK 046/H/KR/2025), dan Madrasah (KMA)', () => {
    // 1. Enam mapel Pendidikan Agama & Budi Pekerti -> wajib BKPDM No. 020 Tahun 2026 (bukan 021)
    const agamaSubjects = [
      'Pendidikan Agama Islam dan Budi Pekerti',
      'Pendidikan Agama Kristen dan Budi Pekerti',
      'Pendidikan Agama Katolik dan Budi Pekerti',
      'Pendidikan Agama Hindu dan Budi Pekerti',
      'Pendidikan Agama Buddha dan Budi Pekerti',
      'Pendidikan Agama Khonghucu dan Budi Pekerti',
    ];
    for (const mapel of agamaSubjects) {
      expect(isAgamaBudiPekertiSubject(mapel)).toBe(true);
      expect(isKepercayaanSubject(mapel)).toBe(false);
      const preset = resolveDefaultCPRegulationPreset(mapel);
      expect(preset.id).toBe('bkpdm_020_2026');
      expect(preset.nomorDokumen).toBe('Keputusan Kepala BKPDM No. 020 Tahun 2026');

      const meta = resolveCPReferenceMetadata(mapel, 'Fase D (Kelas 7-9 SMP)', 'Akhlak', 'SMP/MTs');
      expect(meta.nomorDokumen).toBe('Keputusan Kepala BKPDM No. 020 Tahun 2026');
      expect(meta.terverifikasiResmi).toBe(false);
      expect(meta.statusVerifikasi).toBe('referensi_belum_verifikasi');
    }

    // 2. Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti -> wajib BKPDM No. 021 Tahun 2026 (bukan 020)
    const kepercayaanSubject = 'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti';
    expect(isKepercayaanSubject(kepercayaanSubject)).toBe(true);
    expect(isAgamaBudiPekertiSubject(kepercayaanSubject)).toBe(false);
    const kepercayaanPreset = resolveDefaultCPRegulationPreset(kepercayaanSubject);
    expect(kepercayaanPreset.id).toBe('bkpdm_021_2026');
    expect(kepercayaanPreset.nomorDokumen).toBe('Keputusan Kepala BKPDM No. 021 Tahun 2026');
    expect(kepercayaanPreset.tahunVersiDokumen).toBe('2026');

    const kepercayaanMeta = resolveCPReferenceMetadata(
      kepercayaanSubject,
      'Fase D (Kelas 7-9 SMP)',
      'Sejarah Penghayat Kepercayaan',
      'SMP/MTs'
    );
    expect(kepercayaanMeta.nomorDokumen).toBe('Keputusan Kepala BKPDM No. 021 Tahun 2026');
    expect(kepercayaanMeta.terverifikasiResmi).toBe(false);
    expect(kepercayaanMeta.statusVerifikasi).toBe('referensi_belum_verifikasi');

    // Render UI CPWorkspacePanel untuk Pendidikan Kepercayaan menampilkan BKPDM No. 021 Tahun 2026
    const kepercayaanProfile = makeProfile({ mataPelajaranUtama: kepercayaanSubject });
    const panelHtml = renderToStaticMarkup(
      React.createElement(CPWorkspacePanel, {
        schoolProfile: kepercayaanProfile,
        currentFase: 'Fase D (Kelas 7-9 SMP)',
        capaianPembelajaranRingkas: 'Ringkasan CP Kepercayaan',
        existingTPCount: 0,
        onCreateTPFromAnalysis: vi.fn(),
      })
    );
    expect(panelHtml).toContain('BKPDM No. 021 Tahun 2026');
    expect(panelHtml).toContain('https://kurikulum.kemendikdasmen.go.id/');

    // 3. Mapel umum lainnya -> wajib SK Kepala BSKAP No. 046/H/KR/2025
    const generalSubjects = [
      'Matematika',
      'Bahasa Indonesia',
      'Fisika',
      'Etika dan Budi Pekerti', // mengandung frasa "Budi Pekerti" tetapi bukan Agama/Kepercayaan
      'Pendidikan Pancasila',
    ];
    for (const mapel of generalSubjects) {
      expect(isAgamaBudiPekertiSubject(mapel)).toBe(false);
      expect(isKepercayaanSubject(mapel)).toBe(false);
      const preset = resolveDefaultCPRegulationPreset(mapel);
      expect(preset.id).toBe('bskap_046_2025');
      expect(preset.nomorDokumen).toContain('046/H/KR/2025');
    }

    // Pastikan IPA tidak keliru mencocokkan IPAS pada katalog sistem
    expect(getAvailableCPReferenceEntries('IPA (Ilmu Pengetahuan Alam)', 'Fase B (Kelas 3-4 SD)')).toHaveLength(0);
    const sysEntries = getAvailableCPReferenceEntries('Matematika', 'Fase D (Kelas 7-9 SMP)');
    expect(sysEntries.length).toBeGreaterThan(0);
    expect(sysEntries[0].referensiMeta.terverifikasiResmi).toBe(false);

    // 4. Konteks Madrasah -> wajib KMA Madrasah, tidak bercampur otomatis dengan referensi sekolah umum
    const madrasahSubjects = ['Fikih (MTs)', "Al-Qur'an Hadis (MI)", 'Bahasa Arab (MA)', 'Pendidikan Agama Islam (MTs)'];
    for (const mapel of madrasahSubjects) {
      expect(isKemenagSubject(mapel)).toBe(true);
      expect(isAgamaBudiPekertiSubject(mapel)).toBe(false);
      expect(resolveDefaultCPRegulationPreset(mapel).id).toBe('kma_madrasah');
      expect(getAvailableCPReferenceEntries(mapel, 'Fase D (Kelas 7-9 SMP)')).toHaveLength(0);
    }

    // Guru tetap bisa mengganti referensi secara manual, dan inferRegulationPresetIdFromEntry mempertahankan pilihan tersimpan
    const manualOverride = resolveDefaultCPRegulationPreset(kepercayaanSubject, 'input_guru_sekolah');
    expect(manualOverride.id).toBe('input_guru_sekolah');
    expect(
      inferRegulationPresetIdFromEntry(
        { asalCP: 'referensi_sistem', nomorDokumen: 'Keputusan Kepala BKPDM No. 021 Tahun 2026' },
        kepercayaanSubject
      )
    ).toBe('bkpdm_021_2026');

    // Simpan CP eksisting tidak terhapus saat memilih referensi/preset berbeda
    saveCPEntry(kepercayaanProfile, {
      mataPelajaran: kepercayaanSubject,
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Budi Pekerti',
      teksCP: 'Teks CP Kepercayaan tersimpan oleh guru.',
      asalCP: 'input_guru',
    });
    saveCPEntry(kepercayaanProfile, {
      mataPelajaran: kepercayaanSubject,
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Sejarah',
      teksCP: 'Salinan teks CP BKPDM 021/2026.',
      asalCP: 'referensi_sistem',
      regulationPresetId: 'bkpdm_021_2026',
    });
    const stored = getSavedCPEntries(kepercayaanProfile, 'Fase D (Kelas 7-9 SMP)');
    expect(stored).toHaveLength(2);
    expect(stored.some((e) => e.statusVerifikasi === 'input_guru')).toBe(true);
    expect(stored.some((e) => e.nomorDokumen === 'Keputusan Kepala BKPDM No. 021 Tahun 2026')).toBe(true);
  });

  it('menyimpan input/edit CP guru beserta metadata lengkap dan mencegah CP input guru berubah menjadi CP resmi pemerintah', () => {
    const profile = makeProfile();
    const savedTeacherCP = saveCPEntry(profile, {
      mataPelajaran: 'Matematika',
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Aljabar',
      teksCP: 'Peserta didik dapat menyelesaikan sistem persamaan linear dua variabel melalui beberapa cara untuk penyelesaian masalah.',
      asalCP: 'input_guru',
      namaDokumenSumber: 'Kurikulum Satuan Pendidikan SMPN 82A',
      nomorDokumen: 'KSP-01/2026',
      tahunVersiDokumen: '2026',
      urlReferensi: 'https://kurikulum.kemendikdasmen.go.id/panduan-mapel',
      // Sekalipun terverifikasiResmi: true dikirim, asalCP input_guru wajib tetap berstatus input_guru & terverifikasiResmi: false
      statusVerifikasi: 'resmi_terverifikasi',
      terverifikasiResmi: true,
      catatanPenyesuaianGuru: 'Penyesuaian konteks koperasi sekolah',
    });

    expect(savedTeacherCP.asalCP).toBe('input_guru');
    expect(savedTeacherCP.statusVerifikasi).toBe('input_guru');
    expect(savedTeacherCP.terverifikasiResmi).toBe(false);
    expect(resolveCPStatusLabel(savedTeacherCP.statusVerifikasi, savedTeacherCP.terverifikasiResmi, savedTeacherCP.asalCP)).toContain('Input');

    // Edit CP guru
    const edited = saveCPEntry(profile, {
      ...savedTeacherCP,
      teksCP: 'Peserta didik dapat memodelkan dan menyelesaikan sistem persamaan linear dua variabel dalam masalah kontekstual.',
      catatanPenyesuaianGuru: 'Diperbarui dengan penekanan pemodelan',
    });
    expect(edited.id).toBe(savedTeacherCP.id);

    const listAfterEdit = getSavedCPEntries(profile, 'Fase D (Kelas 7-9 SMP)');
    expect(listAfterEdit).toHaveLength(1);
    expect(listAfterEdit[0].teksCP).toContain('memodelkan dan menyelesaikan');
    expect(listAfterEdit[0].statusVerifikasi).toBe('input_guru');
    expect(listAfterEdit[0].terverifikasiResmi).toBe(false);

    // Bandingkan dengan rujukan resmi yang diverifikasi eksplisit oleh guru terhadap naskah SK 046/H/KR/2025
    const officialVerified = saveCPEntry(profile, {
      mataPelajaran: 'Matematika',
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Geometri',
      teksCP: 'Naskah CP resmi Geometri Fase D hasil salinan SK Kepala BSKAP No. 046/H/KR/2025.',
      asalCP: 'referensi_sistem',
      regulationPresetId: 'bskap_046_2025',
      statusVerifikasi: 'resmi_terverifikasi',
      terverifikasiResmi: true,
    });
    expect(officialVerified.statusVerifikasi).toBe('resmi_terverifikasi');
    expect(officialVerified.terverifikasiResmi).toBe(true);
    expect(officialVerified.nomorDokumen).toContain('046/H/KR/2025');
  });

  it('Analisis CP menjaga teks CP asli utuh, mendukung edit & persetujuan guru, dan fallback jujur ke form manual bila AI offline', async () => {
    const profile = makeProfile();
    const originalText =
      'Pada akhir Fase D, peserta didik dapat menyelesaikan sistem persamaan linear dua variabel melalui beberapa cara untuk penyelesaian masalah.';
    const cpEntry = saveCPEntry(profile, {
      mataPelajaran: 'Matematika',
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Aljabar',
      teksCP: originalText,
      asalCP: 'referensi_sistem',
      regulationPresetId: 'bskap_046_2025',
      statusVerifikasi: 'referensi_belum_verifikasi',
    });

    // Simulasikan AI tidak tersedia -> wajib jujur memakai sumberAnalisis: 'manual_guru' tanpa mengklaim ai_usulan palsu
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));
    const offlineOutcome = await analyzeCPWithAI({
      cpEntry,
      kelas: '8',
      semester: '1 (Ganjil)',
    });
    expect(offlineOutcome.ok).toBe(false);
    expect(offlineOutcome.analysis.sumberAnalisis).toBe('manual_guru');
    expect(offlineOutcome.analysis.teksCPAsli).toBe(originalText);
    expect(offlineOutcome.analysis.statusPersetujuan).toBe('usulan_belum_disetujui');

    // Simulasikan edit manual oleh guru sebelum disetujui
    const editedManual = updateCPAnalysisDraft(offlineOutcome.analysis, {
      kompetensi: ['Memodelkan dan menyelesaikan SPLDV dengan metode grafik, substitusi, dan eliminasi'],
      lingkupMateri: ['Sistem Persamaan Linear Dua Variabel (SPLDV)'],
      kkoRelevan: ['memodelkan', 'menyelesaikan', 'memeriksa'],
      contohBuktiKetercapaian: ['Menyusun 2 persamaan dari soal cerita lengkap dengan variabel dan satuan'],
      saranPembagianTP: [
        {
          id: 'cand-1',
          kodeSaran: '8.1',
          elemenCP: 'Aljabar',
          kompetensi: 'Memodelkan dan menyelesaikan SPLDV dengan substitusi atau eliminasi',
          lingkupMateri: 'SPLDV Kontekstual',
          materiPokok: 'Sistem Persamaan Linear Dua Variabel',
          tujuanPembelajaran:
            'Peserta didik mampu memodelkan dan menyelesaikan SPLDV pada transaksi belanja sehari-hari.',
          buktiKetercapaian: ['Menuliskan model persamaan dan memverifikasi solusi'],
          prasyaratSaran: ['Persamaan linear satu variabel'],
        },
      ],
    });

    // Belum disetujui -> harus ditolak sebelum menjadi TP
    expect(() =>
      buildTPDraftFromApprovedAnalysis({
        analysis: editedManual,
        candidateIndex: 0,
        profile,
        cpEntry,
      })
    ).toThrow(/disetujui guru/i);

    const approved = approveCPAnalysis(editedManual, 'Disetujui untuk Semester 1');
    expect(approved.statusPersetujuan).toBe('disetujui_guru');
    expect(approved.teksCPAsli).toBe(originalText);

    const newTP = buildTPDraftFromApprovedAnalysis({
      analysis: approved,
      candidateIndex: 0,
      profile,
      existingTPCount: 0,
      cpEntry,
    });
    expect(newTP.kode).toBe('8.1');
    expect(newTP.elemen).toBe('Aljabar');
    expect(newTP.kompetensiInti).toContain('Memodelkan');
    expect(newTP.lingkupMateri).toBe('SPLDV Kontekstual');
    expect(newTP.referensiCP?.cpEntryId).toBe(cpEntry.id);
    expect(newTP.referensiCP?.teksCP).toBe(originalText);
    expect(newTP.subTP?.length).toBeGreaterThanOrEqual(1);
  });

  it('TPEditorForm mengedit seluruh field TP termasuk Sub-TP & KKO Helper tetap non-blocking bagi guru', () => {
    const profile = makeProfile({ mataPelajaranUtama: 'Pendidikan Agama Islam & Budi Pekerti' });
    const cpEntry = saveCPEntry(profile, {
      mataPelajaran: profile.mataPelajaranUtama,
      jenjang: profile.jenjang,
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Akhlak',
      teksCP: 'Peserta didik memahami pentingnya sikap amanah dan jujur dalam kehidupan bermasyarakat.',
      asalCP: 'referensi_sistem',
      regulationPresetId: 'bkpdm_020_2026',
    });

    let currentTP: CustomTPItem = {
      id: 'tpid_test_editor',
      kode: '8.2',
      elemen: 'Akhlak',
      materiPokok: 'Perilaku Amanah dan Jujur',
      kompetensiInti: 'Memahami makna amanah',
      lingkupMateri: 'Amanah dan Jujur dalam Pergaulan',
      tujuanPembelajaran: 'Peserta didik mampu memahami perilaku amanah dalam kehidupan sehari-hari.',
      arahanRangkuman: 'Fokus contoh kasus pergaulan remaja.',
      alokasiJP: 6,
      mingguMulai: 4,
      mingguSelesai: 6,
      prasyarat: ['Konsep akhlak terpuji'],
      buktiKetercapaian: ['Menyebutkan contoh amanah di sekolah'],
      referensiCP: cpEntryToReferenceMeta(cpEntry),
      subTP: [
        {
          id: 'sub_1',
          kode: '8.2.A',
          kompetensi: 'Mengidentifikasi perilaku amanah',
          fokusMateri: 'Amanah terhadap tugas',
          buktiKetercapaian: 'Menunjukkan daftar cek perilaku jujur',
        },
      ],
    };

    const kko = analyzeTPMeasurability({
      tujuanPembelajaran: currentTP.tujuanPembelajaran,
      kompetensi: currentTP.kompetensiInti,
      lingkupMateri: currentTP.lingkupMateri,
      mataPelajaran: profile.mataPelajaranUtama,
    });
    expect(kko.needsRefinement).toBe(true);
    expect(kko.detectedGeneralVerbs).toContain('memahami');
    expect(kko.isBlocking).toBe(false);
    expect(kko.catatanKonteksMapel).toMatch(/Agama/i);
    expect(kko.rekomendasiKKO.length).toBeGreaterThan(3);

    const onSave = vi.fn();
    const rendered = render(
      React.createElement(TPEditorForm, {
        draftTP: currentTP,
        schoolProfile: profile,
        savedCPEntries: [cpEntry],
        onChangeDraft: (updated: CustomTPItem) => {
          currentTP = updated;
        },
        onCancel: vi.fn(),
        onSave,
      })
    );

    // Pastikan tombol Simpan Perubahan dirender tanpa atribut disabled (KKO Helper tidak memblokir guru)
    expect(rendered.html).toContain('Simpan Perubahan');
    expect(rendered.html).not.toMatch(/disabled=""[^>]*>\s*(?:<[^>]+>\s*)*Simpan Perubahan/i);

    // Pastikan seluruh label field lengkap tampil pada TPEditorForm + panel CPWorkspacePanel
    expect(screen.getByText('Kompetensi')).toBeDefined();
    expect(screen.getByText('Lingkup Materi')).toBeDefined();
    expect(screen.getByText(/Bukti Ketercapaian/i)).toBeDefined();
    expect(screen.getByText(/Referensi CP Tertaut/i)).toBeDefined();
    expect(screen.getByText(/Rincian Sub-TP \(\s*1\s*\)/i)).toBeDefined();
    expect(screen.getByText(/Saran Keterukuran KKO/i)).toBeDefined();

    // Verifikasi render CPWorkspacePanel menampilkan status CP dan regulasiBKPDM 020/2026
    const cpPanelHtml = renderToStaticMarkup(
      React.createElement(CPWorkspacePanel, {
        schoolProfile: profile,
        currentFase: 'Fase D (Kelas 7-9 SMP)',
        capaianPembelajaranRingkas: 'Ringkasan CP Uji',
        existingTPCount: 1,
        onCreateTPFromAnalysis: vi.fn(),
      })
    );
    expect(cpPanelHtml).toContain('BKPDM No. 020 Tahun 2026');
    expect(cpPanelHtml).toContain('Akhlak');
    expect(cpPanelHtml).toContain('Referensi Sistem (Belum Terverifikasi SK Lengkap)');

    // Simulasi penambahan Sub-TP pada model & render ulang menampilkan 2 Sub-TP
    currentTP = {
      ...currentTP,
      subTP: [
        ...(currentTP.subTP || []),
        {
          id: 'sub_2',
          kode: '8.2.B',
          kompetensi: 'Mendemonstrasikan sikap jujur di kelas',
          fokusMateri: 'Kejujuran dalam tugas',
          buktiKetercapaian: 'Laporan observasi teman sebaya',
        },
      ],
    };
    rendered.rerender(
      React.createElement(TPEditorForm, {
        draftTP: currentTP,
        schoolProfile: profile,
        savedCPEntries: [cpEntry],
        onChangeDraft: (updated: CustomTPItem) => {
          currentTP = updated;
        },
        onCancel: vi.fn(),
        onSave,
      })
    );
    expect(screen.getByText(/Rincian Sub-TP \(\s*2\s*\)/i)).toBeDefined();
  });

  it('Backward Compatibility: computeTPContentHash tidak berubah saat field tambahan kosong/metadata CP ditambahkan, dan Backup/Cloud Sync 3-way merge mempertahankan asesmerdeka_cp_v2', async () => {
    const profile = saveSchoolProfile(makeProfile());
    const legacyTP: CustomTPItem = {
      id: 'tpid_legacy_01',
      kode: '8.1',
      elemen: 'Bilangan',
      materiPokok: 'Bilangan Berpangkat',
      tujuanPembelajaran: 'Menghitung operasi bilangan berpangkat bulat positif.',
      arahanRangkuman: 'Ringkas sifat pangkat.',
      alokasiJP: 8,
      mingguMulai: 1,
      mingguSelesai: 3,
      lingkupMateri: 'Bilangan Berpangkat', // Kasus existing dari kurikulumCatalog dimana lingkupMateri === materiPokok
      buktiKetercapaian: ['Menyelesaikan soal sifat pangkat'],
    };

    const baselineHash = computeTPContentHash(legacyTP);

    // Tambah metadata CP baru & field kosong tidak boleh mengubah hash TP lama
    const tpWithExtendedMeta: CustomTPItem = {
      ...legacyTP,
      kompetensiInti: '',
      prasyarat: [],
      subTP: [],
      analisisCPId: 'acp_123',
      referensiCP: resolveCPReferenceMetadata('Matematika', 'Fase D (Kelas 7-9 SMP)', 'Bilangan', 'SMP/MTs'),
    };
    expect(computeTPContentHash(tpWithExtendedMeta)).toBe(baselineHash);

    // Simpan draf LKPD lama di localStorage & cek markSavedLKPDDraftsNeedsReview tidak menandai needsReview palsu
    localStorage.setItem(
      'lkpd_tpid_legacy_01_kasus',
      JSON.stringify({
        id: 'lkpd_legacy',
        tpId: 'tpid_legacy_01',
        tpKode: '8.1',
        mataPelajaran: 'Matematika',
        kelas: '8',
        semester: '1 (Ganjil)',
        judul: 'LKPD Lama Bilangan Berpangkat',
        tujuanPembelajaran: legacyTP.tujuanPembelajaran,
        tpSourceHash: baselineHash,
        petunjukPengerjaan: ['Baca instruksi'],
        stimulusKasus: { judul: 'Kasus', teks: 'Data angka pangkat' },
        langkahAktivitas: [{ langkahKe: 1, instruksi: 'Hitung' }],
        pertanyaanAnalisis: [{ nomor: 1, pertanyaan: 'Berapa 2^3?' }],
        kesimpulanRefleksi: ['Saya memahami sifat pangkat'],
      })
    );
    expect(markSavedLKPDDraftsNeedsReview('tpid_legacy_01', tpWithExtendedMeta, profile)).toBe(0);

    // Perubahan inti tujuanPembelajaran wajib mengubah hash secara wajar
    const tpCoreChanged: CustomTPItem = {
      ...tpWithExtendedMeta,
      tujuanPembelajaran: 'Menganalisis dan memodelkan pertumbuhan eksponensial bilangan berpangkat.',
    };
    expect(computeTPContentHash(tpCoreChanged)).not.toBe(baselineHash);

    // Draf LKPD dan Modul Ajar format lama tetap bisa dimuat & diekspor ke DOCX tanpa exception
    localStorage.setItem(
      'modul_ajar_8.1_pbl',
      JSON.stringify({
        id: 'modul_legacy',
        tpId: 'tpid_legacy_01',
        tpKode: '8.1',
        modelType: 'pbl',
        judul: 'Modul Lama',
        mataPelajaran: 'Matematika',
        jenjangFase: 'Fase D (Kelas 7-9 SMP)',
        kelas: '8',
        rombel: 'VIII A',
        semester: '1 (Ganjil)',
        tahunAjaran: '2026/2027',
        alokasiWaktu: '8 JP',
        jumlahPertemuan: 2,
        namaSekolah: profile.namaSekolah,
        namaGuru: profile.namaGuru,
        nipGuru: profile.nipGuru,
        namaKepalaSekolah: profile.namaKepalaSekolah,
        nipKepalaSekolah: profile.nipKepalaSekolah,
        kotaSekolah: profile.kotaSekolah,
        createdAt: '2026-07-10',
        materiPokok: 'Bilangan Berpangkat',
        elemen: 'Bilangan',
        tujuanPembelajaran: legacyTP.tujuanPembelajaran,
        kompetensiAwal: ['Operasi perkalian'],
        profilPelajarPancasila: ['Bernalar Kritis'],
        saranaPrasarana: ['Papan tulis'],
        targetPesertaDidik: 'Reguler',
        modelPembelajaran: 'Problem Based Learning',
        pemahamanBermakna: 'Pangkat meringkas perkalian berulang.',
        pertanyaanPemantik: ['Bagaimana menghitung pertumbuhan berlipat?'],
        kegiatanPembelajaran: [{ pertemuan: 1, alokasiMenit: 80, pendahuluan: ['Salam'], inti: ['Diskusi'], penutup: ['Refleksi'] }],
        asesmen: { diagnostik: 'Tanya jawab', formatif: 'LKPD', sumatif: 'Ujian' },
        rubrikPenilaianSingkat: [],
        pengayaanDanRemedial: { pengayaan: 'Soal HOTS', remedial: 'Bimbingan' },
        refleksiGuru: ['Cukup baik'],
        refleksiSiswa: ['Paham konsep'],
        glosarium: [],
        daftarPustaka: ['Buku Matematika SMP'],
      })
    );
    const loadedOldLKPD = loadLatestLKPDDraft(profile, legacyTP);
    const loadedOldModul = loadLatestModulAjarDraft(profile, legacyTP);
    expect(loadedOldLKPD?.doc.judul).toBe('LKPD Lama Bilangan Berpangkat');
    expect(loadedOldModul?.doc.judul).toBe('Modul Lama');
    const lkpdBlob = await exportLKPDToDocx(loadedOldLKPD!.doc, profile);
    await exportModulAjarToDocx(loadedOldModul!.doc, profile);
    expect(lkpdBlob.size).toBeGreaterThan(500);

    // Uji Backup/Restore + Cloud Sync 3-way merge mempertahankan asesmerdeka_cp_v2 & field baru TP
    saveCPEntry(profile, {
      mataPelajaran: 'Matematika',
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Bilangan',
      teksCP: 'Teks CP Bilangan Fase D tersimpan untuk backup & cloud sync.',
      asalCP: 'input_guru',
    });
    saveCustomTPList('Matematika', '8', '1 (Ganjil)', [tpCoreChanged], profile);

    const backupJson = exportBackupDataJson();
    const parsedBackup = JSON.parse(backupJson) as { entries: Record<string, unknown> };
    expect(parsedBackup.entries['asesmerdeka_cp_v2']).toBeDefined();
    expect(parsedBackup.entries['asesmerdeka_custom_tp_v2']).toBeDefined();

    localStorage.clear();
    const restored = importBackupDataJson(backupJson);
    expect(restored.success).toBe(true);
    expect(getSavedCPEntries(profile, 'Fase D (Kelas 7-9 SMP)')).toHaveLength(1);
    const restoredTPs = getSavedCustomTPList('Matematika', '8', '1 (Ganjil)', profile);
    expect(restoredTPs?.[0].referensiCP?.nomorDokumen).toContain('046/H/KR/2025');

    // Simulasi 3-way merge lintas perangkat: Perangkat A menambah CP Matematika, Perangkat B menambah CP IPS -> keduanya harus tetap utuh!
    const deviceACPMap = {
      scope_math_d: [
        {
          id: 'cp_math_1',
          elemenCP: 'Aljabar',
          teksCP: 'Teks CP Matematika Device A',
        },
      ],
    };
    const deviceBCPMap = {
      scope_ips_d: [
        {
          id: 'cp_ips_1',
          elemenCP: 'Keruangan',
          teksCP: 'Teks CP IPS Device B',
        },
      ],
    };
    const mergeRes = analyzeWorkspaceConflict(
      { asesmerdeka_cp_v2: {} },
      { asesmerdeka_cp_v2: deviceACPMap },
      { asesmerdeka_cp_v2: deviceBCPMap }
    );
    const mergedCPStore = mergeRes.mergedEntries['asesmerdeka_cp_v2'] as Record<string, unknown>;
    expect(mergedCPStore['scope_math_d']).toBeDefined();
    expect(mergedCPStore['scope_ips_d']).toBeDefined();
    expect(mergeRes.conflicts).toHaveLength(0);
  });

  it('Analisis CP via AI menghormati batas anti-over-splitting (maks 4 TP), menjaga teks CP asli, dan wajib disetujui sebelum jadi TP', async () => {
    const profile = makeProfile();
    const originalCPText =
      'Peserta didik dapat mengenali, memprediksi, dan menggeneralisasi pola dalam bentuk susunan benda dan bilangan serta menyatakannya ke bentuk aljabar.';
    const cpEntry = saveCPEntry(profile, {
      mataPelajaran: 'Matematika',
      jenjang: 'SMP/MTs',
      fase: 'Fase D (Kelas 7-9 SMP)',
      elemenCP: 'Aljabar',
      teksCP: originalCPText,
      asalCP: 'referensi_sistem',
      regulationPresetId: 'bskap_046_2025',
      statusVerifikasi: 'resmi_terverifikasi',
      terverifikasiResmi: true,
    });

    // Aktifkan BYOK key uji & mock kuota berlisensi agar analyzeCPWithAI mengeksekusi fetch AI terstruktur
    licenseManager.saveGeminiKey('key-uji-task82a');
    vi.spyOn(licenseManager, 'deductQuota').mockReturnValue({
      success: true,
      quota: licenseManager.getUserQuota(),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      kompetensi: ['Menggeneralisasi pola bilangan menjadi bentuk aljabar'],
                      lingkupMateri: ['Pola Bilangan dan Bentuk Aljabar'],
                      kkoRelevan: ['mengidentifikasi', 'memodelkan', 'menggeneralisasi'],
                      contohBuktiKetercapaian: ['Menuliskan rumus suku ke-n pola gambar'],
                      // Sengaja mengembalikan 6 kandidat untuk menguji anti-over-splitting clamp (maks 4)
                      saranPembagianTP: [1, 2, 3, 4, 5, 6].map((n) => ({
                        kodeSaran: `8.${n}`,
                        elemenCP: 'Aljabar',
                        kompetensi: `Kompetensi ${n}`,
                        lingkupMateri: `Lingkup ${n}`,
                        materiPokok: `Materi ${n}`,
                        tujuanPembelajaran: `Peserta didik mampu memodelkan pola ke-${n}.`,
                        buktiKetercapaian: [`Bukti pola ${n}`],
                      })),
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })
    );

    const outcome = await analyzeCPWithAI({
      cpEntry,
      kelas: '8',
      semester: '1 (Ganjil)',
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.analysis.sumberAnalisis).toBe('ai_usulan');
    expect(outcome.analysis.statusPersetujuan).toBe('usulan_belum_disetujui');
    expect(outcome.analysis.teksCPAsli).toBe(originalCPText);
    expect(outcome.analysis.saranPembagianTP.length).toBeLessThanOrEqual(4);

    // Guru menyunting lalu menyetujui sebelum membangun TP
    const approved = approveCPAnalysis(
      updateCPAnalysisDraft(outcome.analysis, {
        lingkupMateri: ['Pola Bilangan & Generalisasi Aljabar Kontekstual'],
      })
    );
    const tpFromAI = buildTPDraftFromApprovedAnalysis({
      analysis: approved,
      candidateIndex: 0,
      profile,
      cpEntry,
    });
    expect(tpFromAI.analisisCPId).toBe(approved.id);
    expect(tpFromAI.referensiCP?.statusVerifikasi).toBe('resmi_terverifikasi');
    expect(tpFromAI.referensiCP?.teksCP).toBe(originalCPText);
  });
});
