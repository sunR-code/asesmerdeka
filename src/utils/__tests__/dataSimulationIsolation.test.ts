import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getKelasHarianData,
  saveKelasHarianData,
  createEmptyKelasHarianData,
  loadDemoKelasHarianData,
  createSeparateDemoDataset,
  applyNewStudentRoster,
  applySampleScoresSafely,
  confirmLegacyKelasHarianAsActual,
  isKelasHarianSimulated,
  isKelasHarianLegacyUnverified,
  needsExportVerificationWarning,
  resolveKelasHarianDataSource,
  confirmSimulationExportIfNeeded,
  SIMULATION_NOTICE_TEXT,
  LEGACY_UNVERIFIED_NOTICE_TEXT,
} from '../kelasHarianStorage';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import * as licenseManager from '../licenseManager';
import {
  exportPresensiToDocx,
  exportJurnalMengajarToDocx,
  exportDaftarNilaiToDocx,
  exportRekapRaporToDocx,
} from '../docx/docxKelasHarian';
import { generateP5Document } from '../p5Engine';
import { exportP5ToDocx } from '../docxP5Exporter';
import { PresensiTab } from '../../components/harian/PresensiTab';
import { JurnalMengajarTab } from '../../components/harian/JurnalMengajarTab';
import { BukuNilaiTab } from '../../components/harian/BukuNilaiTab';
import { AutoDeskripsiRaporTab } from '../../components/harian/AutoDeskripsiRaporTab';
import { PaketSupervisiDashboard } from '../../components/PaketSupervisiDashboard';
import { P5ProjectView } from '../../components/p5/P5ProjectView';

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

const profile: SchoolProfile = {
  instansiDinas: 'Dinas Pendidikan Kota',
  namaSekolah: 'SMP Negeri 3 Uji',
  alamatSekolah: 'Jl. Merdeka No. 3',
  namaGuru: 'Rina Kusuma, S.Pd.',
  nipGuru: '198605122010012004',
  namaKepalaSekolah: 'Drs. Hendro',
  nipKepalaSekolah: '196901011995011002',
  kotaSekolah: 'Semarang',
  jenjang: 'SMP/MTs',
  kelasUtama: '8',
  mataPelajaranUtama: 'Matematika',
  semester: '1 (Ganjil)',
  tahunAjaran: '2026/2027',
  rombelAktif: '8-A',
  daftarRombel: ['8-A'],
  tampilkanTandaTangan: true,
  pakaiFormatKopSekolah: true,
};

const sampleTPs: CustomTPItem[] = [
  {
    id: 'tp-8-1',
    kode: '8.1',
    elemen: 'Aljabar',
    materiPokok: 'Sistem Persamaan Linear Dua Variabel',
    tujuanPembelajaran: 'Memodelkan dan menyelesaikan SPLDV dalam konteks nyata.',
    arahanRangkuman: 'SPLDV',
    alokasiJP: 12,
    mingguMulai: 1,
    mingguSelesai: 4,
  },
];

describe('Task 1 — Data Simulation Isolation & Legacy Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    licenseManager.activateLicense('ASM-GM26-1TAT-1QBM-133R');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Data bawaan awal ditandai isSimulated=true & dataSource="simulation_demo"', () => {
    const initial = getKelasHarianData(profile, sampleTPs);
    expect(initial.daftarSiswa.length).toBe(30);
    expect(initial.isSimulated).toBe(true);
    expect(initial.dataSource).toBe('simulation_demo');
    expect(isKelasHarianSimulated(initial)).toBe(true);
  });

  it('2. Data lama tanpa metadata diklasifikasikan legacy_unverified (bukan otomatis data aktual) & tetap menjaga data dan peringatan ekspor sampai dikonfirmasi', async () => {
    // Kasus A: Data lama pengguna (hanya 2 siswa, berbeda dari 30 siswa demo, tapi TANPA isSimulated/dataSource)
    const legacyKey = 'asesmerdeka_harian_SMP_Negeri_3_Uji_Matematika_8_8_A_sem1';
    const legacyUnknownOrigin = {
      rombel: '8-A',
      mataPelajaran: 'Matematika',
      semester: '1 (Ganjil)',
      tahunAjaran: '2025/2026',
      daftarSiswa: [
        { id: 'real_1', noUrut: 1, nis: '25001', nama: 'Nadia Putri', jenisKelamin: 'P' },
        { id: 'real_2', noUrut: 2, nis: '25002', nama: 'Bagas Prakoso', jenisKelamin: 'L' },
      ],
      daftarPresensi: [{ id: 'p1', pertemuanKe: 1, tanggal: '2026-07-20', statusMap: { real_1: 'H', real_2: 'S' } }],
      daftarJurnal: [{ id: 'j1', pertemuanKe: 1, tanggal: '2026-07-20', jamKe: '1-2', kodeTP: '8.1', materiPokok: 'SPLDV', kegiatanPembelajaran: 'Latihan kontekstual', siswaTidakHadir: 'Bagas (S)', catatanRefleksi: 'Baik' }],
      daftarNilai: [
        {
          siswaId: 'real_1',
          nama: 'Nadia Putri',
          nis: '25001',
          nilaiFormatif: { '8.1': 92 },
          nilaiSTS: 88,
          nilaiSAS: 90,
          nilaiAkhir: 91,
          predikatKKTP: 'Sangat Baik',
          deskripsiRapor: 'Catatan manual guru.',
        },
      ],
    };
    localStorage.setItem(legacyKey, JSON.stringify(legacyUnknownOrigin));

    const loaded = getKelasHarianData(profile, sampleTPs);
    // Semua data dipertahankan utuh (tidak dihapus)
    expect(loaded.daftarSiswa.map((s) => s.nama)).toEqual(['Nadia Putri', 'Bagas Prakoso']);
    expect(loaded.daftarNilai[0].nilaiFormatif['8.1']).toBe(92);
    expect(loaded.daftarJurnal.length).toBe(1);

    // Klasifikasi TIDAK otomatis menganggap data aktual!
    expect(loaded.dataSource).toBe('legacy_unverified');
    expect(isKelasHarianLegacyUnverified(loaded)).toBe(true);
    expect(isKelasHarianSimulated(loaded)).toBe(false);
    expect(needsExportVerificationWarning(loaded)).toBe(true);

    // UI banner peringatan tampil & peringatan ekspor tetap aktif sebelum dikonfirmasi
    const noop = () => {};
    const legacyUiHtml = renderToStaticMarkup(
      React.createElement(PresensiTab, {
        schoolProfile: profile,
        kelasHarian: loaded,
        tpList: sampleTPs,
        onUpdateKelasHarian: noop,
        onToast: noop,
      })
    );
    expect(legacyUiHtml).toContain('legacy_unverified');

    const promptCancel = vi.fn().mockReturnValue(false);
    (globalThis as any).window = { ...(globalThis as any).window, confirm: promptCancel };
    expect(confirmSimulationExportIfNeeded(loaded, 'dokumen Presensi')).toBe(false);
    expect(promptCancel).toHaveBeenCalledTimes(1);

    // Ekspor DOCX sebelum konfirmasi masih menyematkan cap DATA LAMA BELUM TERVERIFIKASI
    await exportPresensiToDocx(profile, loaded);
    const saveMock = saveAs as unknown as ReturnType<typeof vi.fn>;
    const legacyZip = await JSZip.loadAsync(await saveMock.mock.calls[0][0].arrayBuffer());
    const legacyXml = await legacyZip.file('word/document.xml')!.async('string');
    expect(legacyXml).toContain(LEGACY_UNVERIFIED_NOTICE_TEXT);

    // Konfirmasi eksplisit sebagai data aktual -> baru menghilangkan status unverified & peringatan ekspor
    const confirmed = confirmLegacyKelasHarianAsActual(profile, loaded);
    expect(confirmed.dataSource).toBe('user_manual');
    expect(confirmed.verifiedActualAt).toBeTruthy();
    expect(needsExportVerificationWarning(confirmed)).toBe(false);

    const noPrompt = vi.fn();
    (globalThis as any).window = { ...(globalThis as any).window, confirm: noPrompt };
    expect(confirmSimulationExportIfNeeded(confirmed, 'dokumen Presensi')).toBe(true);
    expect(noPrompt).not.toHaveBeenCalled();

    saveMock.mockClear();
    await exportPresensiToDocx(profile, confirmed);
    const actualZip = await JSZip.loadAsync(await saveMock.mock.calls[0][0].arrayBuffer());
    const actualXml = await actualZip.file('word/document.xml')!.async('string');
    expect(actualXml).not.toContain(LEGACY_UNVERIFIED_NOTICE_TEXT);
    expect(actualXml).not.toContain(SIMULATION_NOTICE_TEXT);

    // Kasus B: Data lama 30 siswa contoh tanpa field isSimulated tetap dikenali simulation_demo
    const untouched = getKelasHarianData(
      { ...profile, rombelAktif: '8-B' },
      sampleTPs
    );
    const { isSimulated: _drop1, dataSource: _drop2, ...legacyDemo } = untouched;
    localStorage.setItem(
      'asesmerdeka_harian_SMP_Negeri_3_Uji_Matematika_8_8_B_sem1',
      JSON.stringify(legacyDemo)
    );
    const reloadedDemo = getKelasHarianData({ ...profile, rombelAktif: '8-B' }, sampleTPs);
    expect(reloadedDemo.isSimulated).toBe(true);
    expect(reloadedDemo.dataSource).toBe('simulation_demo');
  });

  it('2b. Perlindungan Nilai Siswa Aktual ("Isi contoh nilai"): menolak menimpa nilai asli, hanya isi sel kosong, dan isolasi demo terpisah', () => {
    const sim = getKelasHarianData(profile, sampleTPs);
    const twoTPs: CustomTPItem[] = [
      ...sampleTPs,
      {
        id: 'tp-8-2',
        kode: '8.2',
        elemen: 'Geometri',
        materiPokok: 'Pythagoras',
        tujuanPembelajaran: 'Membuktikan Pythagoras',
        arahanRangkuman: 'Pythagoras',
        alokasiJP: 10,
        mingguMulai: 5,
        mingguSelesai: 8,
      },
    ];

    const real = applyNewStudentRoster(
      sim,
      [
        { id: 'r1', noUrut: 1, nis: '26001', nama: 'Siswa Asli A', jenisKelamin: 'P' },
        { id: 'r2', noUrut: 2, nis: '26002', nama: 'Siswa Asli B', jenisKelamin: 'L' },
      ],
      sampleTPs,
      false,
      { source: 'user_imported' }
    );
    // Guru menginput nilai aktual pada Siswa Asli A (termasuk 0 & 94) dan 1 sel masih kosong (TP 8.2 pada A & B)
    real.daftarNilai[0].nilaiFormatif = { '8.1': 94 }; // 8.2 belum terisi
    real.daftarNilai[0].nilaiSTS = 0; // Nilai 0 sah tidak boleh dianggap kosong!
    real.daftarNilai[0].nilaiSAS = 89;
    real.daftarNilai[1].nilaiFormatif = { '8.1': 68 };
    saveKelasHarianData(profile, real);

    // 1. Mencoba menjalankan pengisian nilai contoh pada dataset aktual -> DITOLAK tanpa menimpa 94 / 0 / 89
    const blocked = applySampleScoresSafely(real, twoTPs);
    expect(blocked.status).toBe('blocked_actual_data');
    expect(blocked.updated.daftarNilai[0].nilaiFormatif['8.1']).toBe(94);
    expect(blocked.updated.daftarNilai[0].nilaiSTS).toBe(0);
    expect(blocked.updated.daftarNilai[0].nilaiSAS).toBe(89);

    // 2. Pengisian sel kosong (fillEmptyScoreCellsOnly) hanya mengisi sel yang benar-benar belum ada tanpa menimpa 94 / 0 / 89 / 68
    const fillResult = applySampleScoresSafely(real, twoTPs, { fillEmptyOnly: true });
    expect(fillResult.status).toBe('filled_empty_only');
    expect(fillResult.filledCellCount).toBe(2); // Hanya 8.2 pada siswa r1 dan r2
    expect(fillResult.updated.daftarNilai[0].nilaiFormatif['8.1']).toBe(94);
    expect(fillResult.updated.daftarNilai[0].nilaiFormatif['8.2']).toBe(75);
    expect(fillResult.updated.daftarNilai[0].nilaiSTS).toBe(0);
    expect(fillResult.updated.daftarNilai[0].nilaiSAS).toBe(89);
    expect(fillResult.updated.daftarNilai[1].nilaiFormatif['8.1']).toBe(68);
    expect(fillResult.updated.daftarNilai[1].nilaiFormatif['8.2']).toBe(75);

    // 3. Pengisian penuh hanya diperbolehkan pada dataset simulasi
    const demoRefresh = applySampleScoresSafely(sim, twoTPs);
    expect(demoRefresh.status).toBe('applied_demo');
    expect(demoRefresh.updated.daftarNilai.length).toBe(30);

    // 4. Dataset demo terpisah (createSeparateDemoDataset) TIDAK menimpa data asli di localStorage
    const separateDemo = createSeparateDemoDataset(profile, twoTPs);
    expect(separateDemo.isSimulated).toBe(true);
    expect(separateDemo.daftarSiswa.length).toBe(30);
    const persistedReal = getKelasHarianData(profile, sampleTPs);
    expect(persistedReal.daftarSiswa.map((s) => s.nama)).toEqual(['Siswa Asli A', 'Siswa Asli B']);
    expect(persistedReal.daftarNilai[0].nilaiSTS).toBe(0);

    // 5. Render BukuNilaiTab pada dataset aktual & mode pratinjau demo terpisah
    const realBookHtml = renderToStaticMarkup(
      React.createElement(BukuNilaiTab, {
        schoolProfile: profile,
        kelasHarian: real,
        tpList: twoTPs,
        onUpdateKelasHarian: () => {},
        onToast: () => {},
      })
    );
    expect(realBookHtml).toContain('Lengkapi sel kosong');
    expect(realBookHtml).toContain('Contoh nilai (Mode Demo)');

    const demoPreviewHtml = renderToStaticMarkup(
      React.createElement(BukuNilaiTab, {
        schoolProfile: profile,
        kelasHarian: separateDemo,
        tpList: twoTPs,
        onUpdateKelasHarian: () => {},
        onToast: () => {},
        isSeparateDemoPreview: true,
        onExitDemoPreview: () => {},
      })
    );
    expect(demoPreviewHtml).toContain('Pratinjau Dataset Demo Terpisah Aktif');
    expect(demoPreviewHtml).toContain('Kembali ke data asli saya');
  });

  it('3. Mendukung alur Mulai Kelas Kosong, Impor Siswa, Tambah Manual, & Muat Data Demo', () => {
    const empty = createEmptyKelasHarianData(profile, sampleTPs);
    expect(empty.daftarSiswa).toEqual([]);
    expect(empty.daftarNilai).toEqual([]);
    expect(empty.daftarJurnal).toEqual([]);
    expect(empty.isSimulated).toBe(false);
    expect(empty.dataSource).toBe('empty_class');
    expect(resolveKelasHarianDataSource(empty)).toBe('empty_class');

    // Tetap kosong setelah dimuat ulang dari storage (tidak tiba-tiba terisi 30 siswa dummy)
    const reloadedEmpty = getKelasHarianData(profile, sampleTPs);
    expect(reloadedEmpty.daftarSiswa).toEqual([]);
    expect(reloadedEmpty.isSimulated).toBe(false);

    // Tambah manual 1 siswa ke kelas kosong -> user_manual
    const afterManual = applyNewStudentRoster(
      reloadedEmpty,
      [{ id: 'siswa_u1', noUrut: 1, nis: '9001', nama: 'Hendra Wijaya', jenisKelamin: 'L' }],
      sampleTPs,
      false,
      { source: 'user_manual' }
    );
    expect(afterManual.isSimulated).toBe(false);
    expect(afterManual.dataSource).toBe('user_manual');

    // Muat kembali demo -> simulation_demo
    const reloadedDemo = loadDemoKelasHarianData(profile, sampleTPs);
    expect(reloadedDemo.isSimulated).toBe(true);
    expect(reloadedDemo.daftarSiswa.length).toBe(30);

    // Impor Excel/CSV mengganti 30 dummy -> user_imported
    const afterImport = applyNewStudentRoster(
      reloadedDemo,
      [{ id: 'siswa_imp_1', noUrut: 1, nis: '26001', nama: 'Sari Wulandari', jenisKelamin: 'P' }],
      sampleTPs,
      false,
      { source: 'user_imported' }
    );
    saveKelasHarianData(profile, afterImport);
    expect(afterImport.isSimulated).toBe(false);
    expect(afterImport.dataSource).toBe('user_imported');
  });

  it('4. Guard konfirmasi ekspor mencegah ekspor senyap data simulasi saat guru membatalkan', () => {
    const sim = getKelasHarianData(profile, sampleTPs);
    const confirmCancel = vi.fn().mockReturnValue(false);
    (globalThis as any).window = { ...(globalThis as any).window, confirm: confirmCancel };

    expect(confirmSimulationExportIfNeeded(sim, 'dokumen Presensi')).toBe(false);
    expect(confirmCancel).toHaveBeenCalledTimes(1);

    const confirmProceed = vi.fn().mockReturnValue(true);
    (globalThis as any).window = { ...(globalThis as any).window, confirm: confirmProceed };
    expect(confirmSimulationExportIfNeeded(sim, 'dokumen Presensi')).toBe(true);

    // Data aktual siswa tidak perlu konfirmasi simulasi
    const real = applyNewStudentRoster(
      sim,
      [{ id: 'siswa_imp_1', noUrut: 1, nis: '26001', nama: 'Sari Wulandari', jenisKelamin: 'P' }],
      sampleTPs,
      false,
      { source: 'user_imported' }
    );
    const noPrompt = vi.fn();
    (globalThis as any).window = { ...(globalThis as any).window, confirm: noPrompt };
    expect(confirmSimulationExportIfNeeded(real, 'dokumen Presensi')).toBe(true);
    expect(noPrompt).not.toHaveBeenCalled();
  });

  it('5. File Word (.docx) Presensi, Jurnal, Nilai, Rapor & P5 menyematkan cap SIMULASI bila data simulasi dan bersih bila data aktual', async () => {
    const sim = getKelasHarianData(profile, sampleTPs);
    await exportPresensiToDocx(profile, sim);
    await exportJurnalMengajarToDocx(profile, sim);
    await exportDaftarNilaiToDocx(profile, sim, sampleTPs);
    await exportRekapRaporToDocx(profile, sim, sampleTPs);

    const p5Sim = generateP5Document(profile, 'Gaya Hidup Berkelanjutan', sim);
    expect(p5Sim.isSimulated).toBe(true);
    await exportP5ToDocx(p5Sim, profile);

    const saveMock = saveAs as unknown as ReturnType<typeof vi.fn>;
    expect(saveMock.mock.calls.length).toBe(5);
    for (const call of saveMock.mock.calls) {
      const blob: Blob = call[0];
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      const xml = await zip.file('word/document.xml')!.async('string');
      expect(xml).toContain(SIMULATION_NOTICE_TEXT);
    }

    saveMock.mockClear();

    const real = applyNewStudentRoster(
      sim,
      [{ id: 'siswa_imp_1', noUrut: 1, nis: '26001', nama: 'Sari Wulandari', jenisKelamin: 'P' }],
      sampleTPs,
      false,
      { source: 'user_imported' }
    );
    await exportPresensiToDocx(profile, real);
    await exportRekapRaporToDocx(profile, real, sampleTPs);
    expect(saveMock.mock.calls.length).toBe(2);
    for (const call of saveMock.mock.calls) {
      const blob: Blob = call[0];
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      const xml = await zip.file('word/document.xml')!.async('string');
      expect(xml).not.toContain(SIMULATION_NOTICE_TEXT);
    }
  });

  it('6. UI modul harian, Supervisi & P5 menampilkan banner isolasi simulasi dan opsi kelas kosong', () => {
    const sim = getKelasHarianData(profile, sampleTPs);
    const noop = () => {};

    const presensiHtml = renderToStaticMarkup(
      React.createElement(PresensiTab, {
        schoolProfile: profile,
        kelasHarian: sim,
        tpList: sampleTPs,
        onUpdateKelasHarian: noop,
        onToast: noop,
      })
    );
    expect(presensiHtml).toContain('Mode Data Contoh / Simulasi Aktif');
    expect(presensiHtml).toContain('Mulai dengan kelas kosong');
    expect(presensiHtml).toContain('Impor daftar siswa');

    const jurnalHtml = renderToStaticMarkup(
      React.createElement(JurnalMengajarTab, {
        schoolProfile: profile,
        kelasHarian: sim,
        tpList: sampleTPs,
        onUpdateKelasHarian: noop,
        onToast: noop,
      })
    );
    expect(jurnalHtml).toContain('Mode Data Contoh / Simulasi Aktif');

    const nilaiHtml = renderToStaticMarkup(
      React.createElement(BukuNilaiTab, {
        schoolProfile: profile,
        kelasHarian: sim,
        tpList: sampleTPs,
        onUpdateKelasHarian: noop,
        onToast: noop,
      })
    );
    expect(nilaiHtml).toContain('Mode Data Contoh / Simulasi Aktif');

    const raporHtml = renderToStaticMarkup(
      React.createElement(AutoDeskripsiRaporTab, {
        schoolProfile: profile,
        kelasHarian: sim,
        tpList: sampleTPs,
        onUpdateKelasHarian: noop,
        onToast: noop,
      })
    );
    expect(raporHtml).toContain('Mode Data Contoh / Simulasi Aktif');

    const supervisiHtml = renderToStaticMarkup(
      React.createElement(PaketSupervisiDashboard, {
        schoolProfile: profile,
        tpList: sampleTPs,
        kelasHarian: sim,
        onBackToClassHub: noop,
        onToast: noop,
      })
    );
    expect(supervisiHtml).toContain('Data Kelas Harian Masih Simulasi');

    const p5Html = renderToStaticMarkup(
      React.createElement(P5ProjectView, {
        profile,
        kelasHarian: sim,
      })
    );
    expect(p5Html).toContain('Data Simulasi / Contoh pada Lembar Observasi P5');

    // Saat kelas kosong -> tampilkan ajakan impor / lihat demo
    const empty = createEmptyKelasHarianData(profile, sampleTPs);
    const emptyPresensiHtml = renderToStaticMarkup(
      React.createElement(PresensiTab, {
        schoolProfile: profile,
        kelasHarian: empty,
        tpList: sampleTPs,
        onUpdateKelasHarian: noop,
        onToast: noop,
      })
    );
    expect(emptyPresensiHtml).toContain('Kelas kosong siap diisi');
    expect(emptyPresensiHtml).toContain('Lihat data demo');
  });
});
