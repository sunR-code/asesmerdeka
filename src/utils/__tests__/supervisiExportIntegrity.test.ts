import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  exportBundelSupervisiMasterDocx as rawExportMasterBundle,
  exportPaketSupervisiToZip as rawExportZip,
  exportInstrumenSupervisiToDocx as rawExportInstrumen,
} from '../docx/docxSupervisi';
import * as guardedExporter from '../docxExporter';
import * as licenseManager from '../licenseManager';
import {
  getKelasHarianData,
  saveKelasHarianData,
  applyNewStudentRoster,
  SIMULATION_NOTICE_TEXT,
  LEGACY_UNVERIFIED_NOTICE_TEXT,
} from '../kelasHarianStorage';
import {
  createDefaultSupervisiInstrumentData,
  evaluateSupervisiInstrument,
  getSupervisiInstrumentData,
  saveSupervisiInstrumentData,
  SUPERVISI_DOCUMENT_DEFINITIONS,
} from '../supervisiStorage';
import { buildSmartModulAjar, buildSmartLKPD } from '../perangkatAjarEngine';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import { PaketSupervisiDashboard } from '../../components/PaketSupervisiDashboard';

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

const localStorageMock = new LocalStorageMock();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageMock;
}

const profile: SchoolProfile = {
  instansiDinas: 'DINAS PENDIDIKAN KABUPATEN SLEMAN',
  namaSekolah: 'SMP Negeri 4 Sleman',
  alamatSekolah: 'Jl. Magelang Km. 12',
  kotaSekolah: 'Sleman',
  jenjang: 'SMP/MTs',
  kelasUtama: '8',
  semester: '1 (Ganjil)',
  tahunAjaran: '2026/2027',
  mataPelajaranUtama: 'Matematika',
  rombelAktif: 'VIII B',
  daftarRombel: ['VIII A', 'VIII B'],
  namaGuru: 'Ratna Kusumawati, S.Pd.',
  nipGuru: '198803122015022001',
  namaKepalaSekolah: 'Drs. Hendra Wijaya, M.Pd.',
  nipKepalaSekolah: '197001101995121002',
  tampilkanTandaTangan: true,
  pakaiFormatKopSekolah: true,
};

const sampleTPs: CustomTPItem[] = [
  {
    id: 'tp-spldv-1',
    kode: '8.1',
    elemen: 'Aljabar',
    materiPokok: 'Sistem Persamaan Linear Dua Variabel',
    tujuanPembelajaran: 'Menyelesaikan model matematika SPLDV dengan metode substitusi dan eliminasi.',
    arahanRangkuman: 'Model matematika dan penyelesaian SPLDV',
    alokasiJP: 8,
    mingguMulai: 1,
    mingguSelesai: 3,
  },
  {
    id: 'tp-pyth-2',
    kode: '8.2',
    elemen: 'Geometri',
    materiPokok: 'Teorema Pythagoras',
    tujuanPembelajaran: 'Membuktikan Teorema Pythagoras dan menghitung jarak pada bidang koordinat.',
    arahanRangkuman: 'Tripel Pythagoras dan penerapannya',
    alokasiJP: 6,
    mingguMulai: 4,
    mingguSelesai: 6,
  },
];

async function extractDocxXml(blob: Blob): Promise<{ xml: string; zip: JSZip }> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const docFile = zip.file('word/document.xml');
  expect(docFile).toBeTruthy();
  const xml = await docFile!.async('string');
  return { xml, zip };
}

describe('Task 2 — Supervisi Export Integrity', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    (saveAs as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1-6. exportPaketSupervisiToZip menghasilkan ZIP valid berisi 9 DOCX nyata (01–09) dari builder modul & kolom lengkap', async () => {
    const base = getKelasHarianData(profile, sampleTPs);
    const actualData = applyNewStudentRoster(
      base,
      [
        { id: 's1', noUrut: 1, nis: '26101', nama: 'Dina Maharani', jenisKelamin: 'P' },
        { id: 's2', noUrut: 2, nis: '26102', nama: 'Bima Saputra', jenisKelamin: 'L' },
      ],
      sampleTPs,
      false,
      { source: 'user_imported' }
    );
    // Catat 1 Alfa nyata pada Bima di P1
    actualData.daftarPresensi[0].statusMap['s2'] = 'A';
    actualData.daftarNilai[0].nilaiFormatif = { '8.1': 88, '8.2': 92 };
    actualData.daftarNilai[0].nilaiSTS = 86;
    actualData.daftarNilai[0].nilaiSAS = 90;
    actualData.daftarNilai[0].nilaiAkhir = 89;
    actualData.daftarNilai[0].predikatKKTP = 'Sangat Baik';
    actualData.daftarNilai[0].deskripsiRapor = 'Sangat baik dalam menyelesaikan SPLDV dan Teorema Pythagoras.';
    saveKelasHarianData(profile, actualData);

    const zipResult = await rawExportZip(profile, sampleTPs, actualData);
    expect(zipResult.files).toHaveLength(9);
    expect(saveAs).toHaveBeenCalledTimes(1);

    const loadedZip = await JSZip.loadAsync(await zipResult.zipBlob.arrayBuffer());
    const docxPaths = Object.keys(loadedZip.files).filter((p) => p.endsWith('.docx'));
    expect(docxPaths).toHaveLength(9);

    for (const def of SUPERVISI_DOCUMENT_DEFINITIONS) {
      const matchedPath = docxPaths.find((p) => p.endsWith(`/${def.zipFileName}`) || p === def.zipFileName);
      expect(matchedPath).toBeTruthy();

      const innerBlob = await loadedZip.file(matchedPath!)!.async('blob');
      const { xml, zip: innerDocxZip } = await extractDocxXml(innerBlob);

      // Pastikan setiap DOCX benar-benar valid & memiliki header/footer identitas
      expect(innerDocxZip.file('[Content_Types].xml')).toBeTruthy();
      expect(innerDocxZip.file('word/header1.xml')).toBeTruthy();
      expect(innerDocxZip.file('word/footer1.xml')).toBeTruthy();
      expect(xml.length).toBeGreaterThan(1500);

      // Pastikan bukan hanya judul kosong: verifikasi konten inti masing-masing dari 9 berkas
      if (def.id === 1) {
        expect(xml).toContain('SMP NEGERI 4 SLEMAN');
        expect(xml).toContain('Ratna Kusumawati');
        expect(xml).toContain('INSTRUMEN VERIFIKASI');
        expect(xml).toContain('Belum diperiksa');
      } else if (def.id === 2) {
        expect(xml).toContain('REFERENSI CAPAIAN');
        expect(xml).toContain('8.1');
        expect(xml).toContain('Sistem Persamaan Linear Dua Variabel');
      } else if (def.id === 3) {
        // ATP harus memuat seluruh 8 kolom standar
        for (const col of ['Kode TP', 'Elemen', 'Lingkup Materi', 'Tujuan Pembelajaran (TP)', 'JP', 'Profil Pelajar Pancasila', 'Asesmen']) {
          expect(xml).toContain(col);
        }
        expect(xml).toContain('Aljabar');
      } else if (def.id === 4) {
        expect(xml).toContain('PROGRAM TAHUNAN');
        expect(xml).toContain('Semester 1 (Ganjil)');
        expect(xml).toContain('Semester 2 (Genap)');
      } else if (def.id === 5) {
        expect(xml).toContain('PROGRAM SEMESTER');
        expect(xml).toContain('Sistem Persamaan Linear Dua Variabel');
      } else if (def.id === 6) {
        expect(xml).toContain('MODUL AJAR KURIKULUM MERDEKA');
        expect(xml).toContain('LEMBAR KERJA PESERTA DIDIK (LKPD)');
        expect(xml).toContain('Teorema Pythagoras');
      } else if (def.id === 7) {
        // Presensi wajib punya kolom A (Alfa) & siswa nyata
        expect(xml).toContain('Dina Maharani');
        expect(xml).toContain('Bima Saputra');
        expect(xml).toContain('>A<');
      } else if (def.id === 8) {
        expect(xml).toContain('AGENDA &amp; JURNAL MENGAJAR GURU');
        expect(xml).toContain('Sistem Persamaan Linear Dua Variabel');
      } else if (def.id === 9) {
        expect(xml).toContain('DAFTAR NILAI ASESMEN FORMATIF &amp; SUMATIF');
        expect(xml).toContain('REKAPITULASI CAPAIAN KOMPETENSI (e-RAPOR)');
        expect(xml).toContain('Dina Maharani');
        expect(xml).toContain('89');
      }
    }
  });

  it('7. Master Bundle memuat ATP 8 kolom, Prota, Promes, Modul Ajar, LKPD (termasuk draf aktif), Presensi dengan kolom Alfa, Jurnal, Nilai, Rapor, & Instrumen Supervisi', async () => {
    const base = getKelasHarianData(profile, sampleTPs);
    const customModul = buildSmartModulAjar(sampleTPs[0], profile);
    customModul.pemahamanBermakna = 'Draf Aktif Guru: SPLDV membantu memodelkan masalah anggaran sekolah.';
    const customLkpd = buildSmartLKPD(sampleTPs[0], profile);
    customLkpd.judul = 'LKPD Kontekstual Kustom Pengawas';

    const masterRes = await rawExportMasterBundle(profile, sampleTPs, base, {
      activeModulAjar: customModul,
      activeLKPD: customLkpd,
    });
    expect(masterRes.sections).toHaveLength(9);

    const { xml } = await extractDocxXml(masterRes.blob);
    // Identitas & Instrumen Supervisi
    expect(xml).toContain('SMP NEGERI 4 SLEMAN');
    expect(xml).toContain('INSTRUMEN VERIFIKASI');
    // CP & TP
    expect(xml).toContain('REFERENSI CAPAIAN');
    // ATP lengkap
    expect(xml).toContain('Kode TP');
    expect(xml).toContain('Profil Pelajar Pancasila');
    expect(xml).toContain('Asesmen');
    // Prota & Promes
    expect(xml).toContain('PROGRAM TAHUNAN');
    expect(xml).toContain('PROGRAM SEMESTER');
    // Modul Ajar & LKPD (menggunakan draf aktif bila tersedia)
    expect(xml).toContain('MODUL AJAR KURIKULUM MERDEKA');
    expect(xml).toContain('LEMBAR KERJA PESERTA DIDIK (LKPD)');
    expect(xml).toContain('Draf Aktif Guru: SPLDV membantu memodelkan masalah anggaran sekolah.');
    expect(xml).toContain('KONTEKSTUAL KUSTOM PENGAWAS');
    // Presensi dengan kolom Alfa (>A<) & Rekap H/S/I/A
    expect(xml).toContain('>H<');
    expect(xml).toContain('>S<');
    expect(xml).toContain('>I<');
    expect(xml).toContain('>A<');
    // Jurnal, Buku Nilai, Rapor
    expect(xml).toContain('AGENDA &amp; JURNAL MENGAJAR GURU');
    expect(xml).toContain('DAFTAR NILAI ASESMEN FORMATIF &amp; SUMATIF');
    expect(xml).toContain('REKAPITULASI CAPAIAN KOMPETENSI (e-RAPOR)');
  });

  it('8-9. Instrumen Supervisi tidak memberi skor 18/18 otomatis, mendukung pengisian parsial hingga lengkap oleh pengawas, & persisten', async () => {
    // Kondisi awal kosong -> TIDAK boleh ada ADA (✓), 18 / 18, atau Amat Baik (A)
    const initial = getSupervisiInstrumentData(profile);
    const initialSummary = evaluateSupervisiInstrument(initial);
    expect(initialSummary.jumlahDiperiksa).toBe(0);
    expect(initialSummary.jumlahDinilai).toBe(0);
    expect(initialSummary.skorTerkumpul).toBe(0);
    expect(initialSummary.isPenilaianLengkap).toBe(false);
    expect(initialSummary.predikat).toBeNull();

    const defaultBlob = await rawExportInstrumen(profile, initial);
    const { xml: defaultXml } = await extractDocxXml(defaultBlob);
    expect(defaultXml).toContain('Belum diperiksa');
    expect(defaultXml).toContain('Belum dinilai');
    expect(defaultXml).toContain('PREDIKAT BELUM DITETAPKAN');
    expect(defaultXml).not.toContain('18 / 18');
    expect(defaultXml).not.toContain('100% LENGKAP');
    expect(defaultXml).not.toContain('ADA (✓)');
    expect(defaultXml).not.toContain('AMAT BAIK (A)');

    // Pengisian parsial (2 dari 9 komponen dinilai) -> skor dihitung dari 2 komponen saja, predikat tetap belum ditetapkan
    const partial = createDefaultSupervisiInstrumentData();
    partial.namaPengawas = 'Dra. Siti Aminah, M.Pd.';
    partial.tanggalSupervisi = '2026-11-12';
    partial.items[0].status = 'ada';
    partial.items[0].skor = 2;
    partial.items[0].catatan = 'Cover dan identitas lengkap.';
    partial.items[5].status = 'perlu_perbaikan';
    partial.items[5].skor = 1;
    partial.items[5].rekomendasi = 'Tambahkan rubrik asesmen di unit 2.';
    partial.items[5].tindakLanjut = 'Revisi sebelum 20 November 2026.';

    saveSupervisiInstrumentData(profile, partial);
    const reloadedPartial = getSupervisiInstrumentData(profile);
    const partialSummary = evaluateSupervisiInstrument(reloadedPartial);
    expect(partialSummary.jumlahDiperiksa).toBe(2);
    expect(partialSummary.jumlahDinilai).toBe(2);
    expect(partialSummary.skorTerkumpul).toBe(3);
    expect(partialSummary.skorMaksimalDiperiksa).toBe(4);
    expect(partialSummary.isPenilaianLengkap).toBe(false);
    expect(partialSummary.predikat).toBeNull();

    // Pengisian penuh seluruh 9 komponen -> barulah predikat muncul sesuai skor nyata
    const full = { ...reloadedPartial };
    full.items = full.items.map((it) => ({
      ...it,
      status: it.id === 6 ? 'perlu_perbaikan' : 'ada',
      skor: it.id === 6 ? 1 : 2,
    }));
    const fullSummary = evaluateSupervisiInstrument(full);
    expect(fullSummary.isPenilaianLengkap).toBe(true);
    expect(fullSummary.skorTerkumpul).toBe(17);
    expect(fullSummary.skorMaksimalTotal).toBe(18);
    expect(fullSummary.predikat).toBe('Amat Baik (A)');

    const filledBlob = await rawExportInstrumen(profile, full);
    const { xml: filledXml } = await extractDocxXml(filledBlob);
    expect(filledXml).toContain('Dra. Siti Aminah, M.Pd.');
    expect(filledXml).toContain('Cover dan identitas lengkap.');
    expect(filledXml).toContain('Tambahkan rubrik asesmen di unit 2.');
    expect(filledXml).toContain('17 / 18');

    // Render Dashboard dengan status awal -> memastikan UI juga menampilkan 'Belum ditetapkan', bukan 18/18
    localStorage.clear();
    const simData = getKelasHarianData(profile, sampleTPs);
    const html = renderToStaticMarkup(
      React.createElement(PaketSupervisiDashboard, {
        schoolProfile: profile,
        tpList: sampleTPs,
        kelasHarian: simData,
        onBackToClassHub: () => {},
        onToast: () => {},
      })
    );
    expect(html).toContain('Belum diperiksa');
    expect(html).toContain('Belum ditetapkan');
    expect(html).toContain('09.</span> Buku Nilai dan e-Rapor');
    expect(html).not.toContain('18 / 18');
  });

  it('10-11. Data simulasi & legacy_unverified tetap berlabel/dilindungi dan ekspor mengikuti kebijakan lisensi', async () => {
    const simData = getKelasHarianData(profile, sampleTPs);
    const simBundle = await rawExportMasterBundle(profile, sampleTPs, simData);
    const { xml: simXml } = await extractDocxXml(simBundle.blob);
    expect(simXml).toContain(SIMULATION_NOTICE_TEXT);

    const legacyData = applyNewStudentRoster(
      simData,
      [{ id: 'l1', noUrut: 1, nis: '25001', nama: 'Siswa Legacy Uji', jenisKelamin: 'L' }],
      sampleTPs,
      false,
      { source: 'user_manual' }
    );
    legacyData.dataSource = 'legacy_unverified';
    legacyData.isSimulated = false;
    delete legacyData.verifiedActualAt;

    const legacyZip = await rawExportZip(profile, sampleTPs, legacyData);
    const parsedLegacyZip = await JSZip.loadAsync(await legacyZip.zipBlob.arrayBuffer());
    const presensiPath = Object.keys(parsedLegacyZip.files).find((k) =>
      k.includes('07_Daftar_Presensi_Siswa.docx')
    )!;
    const presensiBlob = await parsedLegacyZip.file(presensiPath)!.async('blob');
    const { xml: presensiXml } = await extractDocxXml(presensiBlob);
    expect(presensiXml).toContain(LEGACY_UNVERIFIED_NOTICE_TEXT);

    // Pastikan pembungkus guardedExporter menegakkan lisensi bila belum aktif
    const licenseSpy = vi
      .spyOn(licenseManager, 'requireActiveLicenseForAction')
      .mockReturnValue(false);
    const blockedZip = await guardedExporter.exportPaketSupervisiToZip(
      profile,
      sampleTPs,
      simData
    );
    expect(blockedZip).toBe(false);
    expect(licenseSpy).toHaveBeenCalledWith('mengunduh Paket Arsip Supervisi (.zip)');
  });

  it('12. Kegagalan pembuatan salah satu dokumen pada ZIP membatalkan ekspor dengan pesan jelas (tanpa DOCX kosong pengganti)', async () => {
    const data = getKelasHarianData(profile, sampleTPs);

    await expect(
      rawExportZip(profile, sampleTPs, data, {
        docBlobOverrides: {
          6: async () => {
            throw new Error('Simulasi gagal menyusun Modul Ajar');
          },
        },
      })
    ).rejects.toThrow(/06\. Modul Ajar.*Simulasi gagal menyusun Modul Ajar/);

    // Pastikan saveAs TIDAK dipanggil karena ZIP gagal lengkap
    expect(saveAs).not.toHaveBeenCalled();

    // Kegagalan karena blob korup / tidak punya word/document.xml juga ditolak
    const fakeZip = new JSZip();
    fakeZip.file('not-a-docx.txt', 'broken');
    const badBlob = await fakeZip.generateAsync({ type: 'blob' });

    await expect(
      rawExportZip(profile, sampleTPs, data, {
        docBlobOverrides: {
          3: async () => badBlob,
        },
      })
    ).rejects.toThrow(/03\. Alur Tujuan Pembelajaran \(ATP\)/);

    expect(saveAs).not.toHaveBeenCalled();
  });
});
