import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Document, Packer } from 'docx';
import type { ModulAjarDokumen, ModulReferensiSumberItem } from '../../types/perangkatAjar';
import {
  exportBackupDataJson,
  importBackupDataJson,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import {
  SIBI_CATALOG_URL,
  PROVENANCE_MSG_UNLINKED,
  PROVENANCE_MSG_TEACHER_INPUT,
  PROVENANCE_MSG_CURATED_VERIFIED,
  buildReferensiPromptBlock,
  formatReferensiSumberCitation,
  getReferensiStatusLabel,
  normalizeReferensiSumberInput,
  validateReferensiUrl,
} from '../modulReferensiSumber';
import { buildSmartModulAjar } from '../perangkatAjarEngine';
import {
  buildModulAjarGeminiPrompt,
  generateContextualModulAjarWithAI,
} from '../modulAjarAiService';
import {
  detectFabricatedBookReference,
  validateModulAjarDokumen,
} from '../modulAjarValidator';
import {
  saveModulAjarDraft,
  loadModulAjarDraft,
  loadLatestModulAjarDraft,
} from '../perangkatDraftStorage';
import { analyzeWorkspaceConflict, applyConflictChoicesToMergedEntries } from '../cloudSyncManager';
import { buildModulAjarElements, exportModulAjarToDocx } from '../docx/docxPerangkatAjar';
import { buildModulAjarDanLKPDElements } from '../docx/docxSupervisi';
import * as geminiClient from '../../services/geminiClient';
import * as licenseManager from '../licenseManager';
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

function makeSDProfile(): SchoolProfile {
  return {
    schoolId: 'sch_task12_3_sibi',
    instansiDinas: 'Dinas Pendidikan Uji',
    namaSekolah: 'SDN Nusantara 01',
    alamatSekolah: 'Jl. Pendidikan No. 4',
    namaGuru: 'Ibu Rina, S.Pd.',
    nipGuru: '198801012015012001',
    namaKepalaSekolah: 'Bapak Budi, M.Pd.',
    nipKepalaSekolah: '197001011998011001',
    kotaSekolah: 'Yogyakarta',
    jenjang: 'SD/MI',
    kelasUtama: '4',
    mataPelajaranUtama: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    rombelAktif: 'IV-A',
    daftarRombel: ['IV-A'],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
  };
}

function makeFotosintesisTP(): CustomTPItem {
  return {
    id: 'tp_12_3_ipas_4_1',
    kode: '4.1',
    elemen: 'Pemahaman IPAS (Sains)',
    materiPokok: 'Bagian Tubuh Tumbuhan, Fungsi Akar–Daun, dan Proses Fotosintesis',
    tujuanPembelajaran:
      'Mengidentifikasi fungsi akar, batang, daun, bunga, serta menguraikan bahan masukan dan hasil proses fotosintesis bagi makhluk hidup.',
    arahanRangkuman: 'Peran klorofil, cahaya matahari, air, dan karbon dioksida.',
    alokasiJP: 6,
    mingguMulai: 1,
    mingguSelesai: 2,
    prasyarat: ['Mengenal tumbuhan hijau di sekitar rumah dan sekolah'],
    buktiKetercapaian: ['Menyebutkan fungsi akar–daun dan skema masukan–hasil fotosintesis tepat'],
    subTP: [
      {
        id: 'sub_foto_1',
        kode: '4.1.A',
        kompetensi: 'Mengidentifikasi fungsi akar, batang, daun, dan bunga tumbuhan',
        fokusMateri: 'Fungsi Organ Tumbuhan',
        buktiKetercapaian: 'Fungsi tiap organ tumbuhan dijelaskan tepat',
      },
      {
        id: 'sub_foto_2',
        kode: '4.1.B',
        kompetensi: 'Menguraikan masukan dan hasil proses fotosintesis',
        fokusMateri: 'Proses Fotosintesis',
        buktiKetercapaian: 'Skema masukan dan hasil fotosintesis tepat',
      },
    ],
  };
}

function makeValidSDFotosintesisAIPayload(extra?: {
  penjelasanKonsepUtama?: string;
  referensiCatatan?: string;
  daftarPustaka?: string[];
  referensiSumber?: unknown;
}) {
  return {
    judul: 'Modul Ajar AI: Bagian Tubuh Tumbuhan & Proses Fotosintesis',
    pemahamanBermakna:
      'Peserta didik memahami bahwa tumbuhan hijau membuat makanannya sendiri di daun melalui proses fotosintesis menggunakan air, karbon dioksida, klorofil, dan cahaya matahari.',
    pertanyaanPemantik: [
      'Bagaimana tumbuhan memperoleh makanan jika tidak bisa berpindah tempat?',
      'Mengapa daun tumbuhan hijau perlu terkena cahaya matahari?',
      'Apa fungsi akar dan batang sebelum fotosintesis berlangsung di daun?',
    ],
    kompetensiAwal: [
      'Peserta didik mengenal bagian luar tumbuhan hijau di lingkungan rumah.',
    ],
    profilPelajarPancasila: [
      'Penalaran Kritis (menghubungkan data pengamatan tanaman terang vs gelap dengan proses fotosintesis)',
      'Gotong Royong (mengamati tumbuhan secara berkelompok di kelas)',
    ],
    saranaPrasarana: ['Dua pot tanaman hijau kecil', 'Lembar pengamatan kelas'],
    targetPesertaDidik: 'Peserta didik reguler kelas IV SD',
    modelPembelajaran: 'Problem-Based Learning (PBL)',
    bahanBacaan: {
      penjelasanKonsepUtama:
        extra?.penjelasanKonsepUtama ||
        'Tumbuhan hijau memiliki bagian tubuh dengan peran khusus agar tetap hidup. Akar menyerap air dan zat hara dari tanah, batang menyalurkannya ke daun, dan daun yang mengandung klorofil mengolah air serta karbon dioksida dengan bantuan cahaya matahari melalui proses fotosintesis menjadi karbohidrat dan oksigen.',
      subKonsep: [
        {
          judul: '4.1.A: Fungsi Organ Tumbuhan',
          uraian: 'Akar menyerap air dari tanah, batang menyalurkan air dan menopang, sedangkan daun mengolah makanan dan bunga berperan dalam perkembangbiakan.',
        },
        {
          judul: '4.1.B: Masukan dan Hasil Fotosintesis',
          uraian: 'Masukan utama fotosintesis adalah air, karbon dioksida, klorofil, dan cahaya matahari; hasilnya adalah karbohidrat (makanan tumbuhan) dan gas oksigen.',
        },
      ],
      istilahPenting: [
        { istilah: 'Fotosintesis', pengertian: 'Proses tumbuhan hijau membuat makanan di daun dengan bantuan cahaya matahari.' },
        { istilah: 'Klorofil', pengertian: 'Zat hijau daun yang membantu menangkap energi cahaya matahari.' },
        { istilah: 'Stomata', pengertian: 'Lubang kecil di permukaan daun tempat keluar masuknya udara.' },
      ],
      contohKonkret: [
        'Tanaman di teras yang terkena cahaya matahari pagi daunnya tetap hijau segar dibanding tanaman yang disimpan di lemari gelap.',
        'Daun pepaya dan bayam di kebun sekolah berwarna hijau karena mengandung klorofil untuk memasak makanan.',
      ],
      contohPenyelesaian: {
        judulContoh: 'Membaca Tabel Perbandingan Tanaman Pot A (Terang) vs Pot B (Gelap)',
        konteks: 'Pot A ditaruh di teras bercahaya dan Pot B di lemari gelap selama 5 hari sambil disiram air sama banyak.',
        langkahPenyelesaian: [
          'Langkah 1: Catat perlakuan yang sama (air siraman dan jenis tanaman) sebagai variabel kontrol.',
          'Langkah 2: Bandingkan perlakuan berbeda yaitu ketersediaan cahaya matahari pada Pot A dan tidak adanya cahaya pada Pot B.',
          'Langkah 3: Simpulkan bahwa cahaya matahari dibutuhkan daun berklorofil agar proses fotosintesis menghasilkan makanan dan menjaga daun tetap segar.',
        ],
        kesimpulanHasil: 'Pot A tetap hijau segar karena dapat berfotosintesis dengan bantuan cahaya matahari.',
      },
      hubunganDenganTP:
        'Materi fungsi organ dan percobaan cahaya ini menghantarkan siswa menuntaskan TP 4.1 secara konkret.',
      potensiMiskonsepsi: [
        {
          miskonsepsi: 'Siswa sering mengira tumbuhan memakan tanah melalui akarnya untuk tumbuh.',
          caraMeluruskan: 'Tunjukkan pengamatan bahwa akar hanya menyerap air dan mineral, sedangkan makanan dibuat sendiri di daun melalui fotosintesis.',
        },
        {
          miskonsepsi: 'Siswa mengira oksigen hanya diperlukan tumbuhan, bukan dilepaskan untuk manusia dan hewan.',
          caraMeluruskan: 'Bimbing siswa membaca bagan masukan (air + CO2) dan keluaran (karbohidrat + oksigen) fotosintesis.',
        },
      ],
      referensiCatatan:
        extra?.referensiCatatan ||
        'Acuan sumber ajar yang ditautkan: "Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas IV". (Referensi diinput oleh guru — belum diverifikasi secara independen.)',
    },
    kegiatanPembelajaran: [
      {
        pertemuan: 1,
        alokasiMenit: 70,
        tahapTerstruktur: [
          {
            fase: 'pendahuluan',
            namaTahap: 'Pendahuluan & Kesiapan Belajar',
            tujuanTahap: 'Menghubungkan pengalaman siswa melihat tanaman di halaman sekolah.',
            aktivitasGuru: 'Guru menampilkan dua gambar pot tanaman hijau di papan tulis dan menanyakan bagaimana cara daun mendapatkan air dari tanah.',
            aktivitasSiswa: 'Siswa mengamati gambar tanaman hijau lalu menuliskan fungsi akar, batang, dan daun yang telah diketahui pada buku catatan.',
            instruksiPertanyaan: 'Dari mana asal air yang masuk ke daun tanaman di pot halaman sekolah?',
            mediaBahan: 'Gambar tanaman pot dan papan tulis',
            durasiMenit: 10,
            buktiBelajar: 'Catatan tebakan awal fungsi organ tumbuhan',
            pengalamanBelajar: 'Memahami',
            prinsipPembelajaran: ['Berkesadaran'],
          },
          {
            fase: 'inti',
            namaTahap: '1. Orientasi Masalah Autentik',
            tujuanTahap: 'Mengidentifikasi masalah mengapa tanaman di tempat gelap menjadi pucat.',
            aktivitasGuru: 'Guru menampilkan tabel pengamatan dua pot tanaman terang vs gelap selama 5 hari dan membimbing kelompok membaca datanya.',
            aktivitasSiswa: 'Siswa membandingkan data warna daun dan kondisi batang antara Pot A terang dan Pot B gelap pada lembar pengamatan.',
            instruksiPertanyaan: 'Mengapa daun Pot B pucat walau tetap disiram air setiap hari seperti Pot A?',
            mediaBahan: 'Tabel pengamatan Pot A vs Pot B pada LKPD',
            durasiMenit: 15,
            buktiBelajar: 'Tabel perbandingan Pot A vs Pot B terisi',
            pengalamanBelajar: 'Memahami',
            prinsipPembelajaran: ['Menggembirakan'],
          },
          {
            fase: 'inti',
            namaTahap: '2. Penyelidikan Kelompok',
            tujuanTahap: 'Menyelidiki bahan masukan dan hasil fotosintesis serta fungsi bagian tumbuhan.',
            aktivitasGuru: 'Guru memandu setiap kelompok melengkapi bagan panah akar–batang–daun menggunakan kartu klorofil, cahaya, air, dan karbon dioksida.',
            aktivitasSiswa: 'Siswa menyusun kartu masukan dan hasil fotosintesis di bagan organ tumbuhan serta memeriksa kecocokan contoh daun hijau.',
            instruksiPertanyaan: 'Bahan apa yang diserap oleh akar dan bahan apa yang ditangkap oleh klorofil daun?',
            mediaBahan: 'Kartu bagan fungsi organ dan proses fotosintesis',
            durasiMenit: 20,
            buktiBelajar: 'Bagan skema fotosintesis terpasang tepat',
            pengalamanBelajar: 'Mengaplikasi',
            prinsipPembelajaran: ['Bermakna'],
          },
          {
            fase: 'inti',
            namaTahap: '3. Penyajian & Evaluasi Solusi',
            tujuanTahap: 'Menjelaskan peran cahaya dan bagian tumbuhan pada fotosintesis di depan kelas.',
            aktivitasGuru: 'Guru menunjuk dua kelompok mempresentasikan skema fotosintesis dan memfasilitasi pertanyaan tanggapan kelompok lain.',
            aktivitasSiswa: 'Siswa mempresentasikan alur kerja akar–batang–daun dan hasil fotosintesis berupa karbohidrat serta oksigen berdasarkan bukti tabel.',
            instruksiPertanyaan: 'Apa dua manfaat utama hasil fotosintesis bagi tumbuhan dan manusia di sekitarnya?',
            mediaBahan: 'Hasil bagan kelompok dan rubrik cek lisan',
            durasiMenit: 15,
            buktiBelajar: 'Paparan lisan siswa menyebut karbohidrat dan oksigen',
            pengalamanBelajar: 'Mengaplikasi',
          },
          {
            fase: 'penutup',
            namaTahap: 'Penutup & Refleksi Singkat',
            tujuanTahap: 'Menyimpulkan konsep dan mengecek pemahaman individu.',
            aktivitasGuru: 'Guru bersama siswa merangkum empat bahan masukan dan dua hasil fotosintesis lalu memberikan kartu exit ticket dua kalimat.',
            aktivitasSiswa: 'Siswa menuliskan satu kalimat ringkasan proses fotosintesis pada kartu keluar dan menyerahkannya sebelum kelas berakhir.',
            instruksiPertanyaan: 'Sebutkan ulang empat unsur yang diperlukan daun untuk berfotosintesis!',
            mediaBahan: 'Kartu exit ticket siswa',
            durasiMenit: 10,
            buktiBelajar: 'Kartu exit ticket siswa lengkap',
            pengalamanBelajar: 'Merefleksi',
          },
        ],
      },
    ],
    asesmenDetail: {
      diagnostik: {
        tujuanPemeriksaanPrasyarat: 'Mengetahui pemahaman awal bagian tubuh tumbuhan hijau.',
        pertanyaanAtauTugasAwal: [
          'Sebutkan 3 bagian utama tumbuhan yang terlihat pada tanaman kacang hijau!',
          'Bagian tumbuhan manakah yang biasanya berada di dalam tanah?',
        ],
        indikatorInterpretasi: 'Siswa dapat menamai minimal akar, batang, dan daun sebelum masuk materi fotosintesis.',
      },
      formatif: {
        instruksiAktivitas: 'Cek isian bagan organ dan tabel pengamatan kelompok.',
        pertanyaanAtauTugas: [
          'Tuliskan tugas utama akar dan batang menuju proses memasak makanan di daun!',
          'Mengapa daun di tempat gelap menjadi kuning walau tetap disiram air?',
        ],
        buktiYangDiamati: ['Kelengkapan panah skema fotosintesis', 'Kesesuaian alasan dengan bukti cahaya'],
        umpanBalikGuru: 'Berikan penguatan langsung bila siswa masih mengira akar menyerap makanan jadi dari tanah.',
      },
      akhir: {
        bentukUtama: 'Uraian Singkat Bergambar',
        butirTugas: [
          {
            nomor: 1,
            bentuk: 'Uraian',
            pertanyaanAtauTugas: 'Jelaskan fungsi akar dan batang dalam mendukung proses di daun!',
            kunciAtauContohRespons: 'Akar menyerap air dari tanah; batang menyalurkannya ke daun.',
          },
          {
            nomor: 2,
            bentuk: 'Uraian',
            pertanyaanAtauTugas: 'Sebutkan bahan masukan dan hasil proses fotosintesis pada tumbuhan hijau!',
            kunciAtauContohRespons: 'Masukan: air, CO2, cahaya matahari, klorofil; Hasil: karbohidrat dan oksigen.',
          },
        ],
        pedomanPenilaian: 'Gunakan 4 tingkat kualitatif (Baru Berkembang, Layak, Cakap, Mahir) sesuai KKTP sekolah.',
      },
    },
    rubrikPenilaianSingkat: [
      {
        kriteria: 'Identifikasi Fungsi Organ Tumbuhan',
        baruBerkembang: 'Menyebut nama organ tanpa fungsinya.',
        layak: 'Menjelaskan sebagian fungsi organ dengan benar.',
        cakap: 'Menjelaskan fungsi akar, batang, daun, dan bunga secara tepat.',
        mahir: 'Menghubungkan kerja sama akar–batang–daun secara runtut.',
      },
      {
        kriteria: 'Pemahaman Proses Fotosintesis',
        baruBerkembang: 'Belum mengenali bahan masukan fotosintesis.',
        layak: 'Menyebut air dan cahaya namun melupakan CO2 atau oksigen.',
        cakap: 'Menyebut masukan (air, CO2, cahaya, klorofil) dan hasil (karbohidrat, oksigen) tepat.',
        mahir: 'Membuktikan kebutuhan cahaya dengan data tabel dan dampaknya bagi makhluk hidup.',
      },
    ],
    diferensiasiOperasional: {
      prinsipKesetaraanTP: 'Seluruh siswa menuntaskan identifikasi fungsi organ dan proses fotosintesis pada TP 4.1.',
      kesiapanDasar: {
        targetKesiapan: 'Mengenal bagian tumbuhan dan bahan fotosintesis secara visual.',
        dukunganScaffolding: 'Gunakan kartu gambar berwarna berpanah untuk menyusun masukan dan hasil fotosintesis.',
        aktivitasKonkret: [
          'Memasangkan kartu gambar akar, batang, daun dengan label fungsinya.',
          'Menempelkan panah air, CO2, dan cahaya matahari ke gambar daun hijau.',
        ],
        mediaPendukung: 'Kartu gambar bagan tumbuhan',
        buktiBelajarJalur: 'Bagan tempel terisi benar',
      },
      kesiapanBerkembang: {
        targetKesiapan: 'Menjelaskan perbedaan hasil pengamatan terang vs gelap dan skema fotosintesis.',
        dukunganScaffolding: 'Gunakan tabel pengamatan Pot A vs Pot B dengan kalimat pemandu.',
        aktivitasKonkret: [
          'Mengisi tabel pengamatan warna daun Pot A dan Pot B.',
          'Menulis paragraf singkat fungsi akar–batang–daun dan hasil fotosintesis.',
        ],
        mediaPendukung: 'Tabel pengamatan LKPD Fotosintesis',
        buktiBelajarJalur: 'Tabel dan uraian tertulis tepat',
      },
      kesiapanMahir: {
        targetKesiapan: 'Memprediksi gangguan pada tumbuhan dan dampak rantai makanan.',
        dukunganScaffolding: 'Berikan tantangan studi kasus berkurangnya cahaya atau tanaman kehilangan banyak daun.',
        aktivitasKonkret: [
          'Menganalisis akibat pemangkasan seluruh daun terhadap pembentukan makanan tumbuhan.',
          'Menjelaskan manfaat penghijauan di halaman sekolah bagi udara segar di siang hari.',
        ],
        mediaPendukung: 'Kartu tantangan kasus kebun sekolah',
        buktiBelajarJalur: 'Argumen sebab-akibat berbasis konsep fotosintesis',
      },
    },
    contohLKPD: {
      presetType: 'kasus',
      judul: 'Mengamati Pertumbuhan Dua Tanaman Hijau: Terkena Matahari vs Tempat Gelap',
      konteksTugas: 'Dua pot tanaman hijau disiram sama banyak di teras bercahaya dan di lemari gelap selama 5 hari.',
      tujuanPengerjaan: 'Membuktikan kebutuhan cahaya pada proses fotosintesis di daun.',
      petunjukSiswa: [
        'Amati tabel kondisi daun Pot A dan Pot B.',
        'Jawab pertanyaan berdasarkan fakta pengamatan dan fungsi organ tumbuhan.',
      ],
      bahanAtauData: ['Tabel Pot A (teras terang) dan Pot B (lemari gelap)'],
      langkahPengerjaan: [
        'Tandai variabel yang sama dan dibedakan.',
        'Lengkapi skema masukan dan hasil fotosintesis.',
      ],
      pertanyaanAtauRuangKerja: [
        '[Dasar] Pot mana yang daunnya tetap hijau segar?',
        '[Menengah] Sebutkan bahan masukan dan hasil fotosintesis!',
      ],
      hasilYangDiharapkan: 'Siswa menyimpulkan peran cahaya matahari dan organ tumbuhan dalam fotosintesis.',
      kriteriaPenilaian: ['Ketepatan baca data tabel', 'Kelengkapan masukan dan hasil fotosintesis'],
    },
    refleksiGuru: ['Apakah alat peraga gambar tumbuhan membantu pemahaman siswa kelas IV?'],
    refleksiSiswa: ['Apa dua hasil utama proses fotosintesis tumbuhan hijau?'],
    glosarium: [
      { istilah: 'Fotosintesis', definisi: 'Pembuatan makanan oleh daun berklorofil berbantu cahaya matahari.' },
      { istilah: 'Klorofil', definisi: 'Zat warna hijau pada daun penangkap energi cahaya matahari.' },
    ],
    daftarPustaka:
      extra?.daftarPustaka || [
        '[Buku SIBI Kemendikdasmen] Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas IV | Halaman: 1-24 | Tautan: https://buku.kemendikdasmen.go.id/katalog/ilmu-pengetahuan-alam-dan-sosial-untuk-sd-kelas-iv',
      ],
    ...(extra?.referensiSumber !== undefined ? { referensiSumber: extra.referensiSumber } : {}),
  };
}

describe('Task 12.3 — Workflow Referensi Sumber SIBI & Provenance Modul Ajar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Validasi URL ketat menolak domain berbahaya, typo, HTTP, subdomain tak sah, dan domain di query/path', () => {
    const dangerousSibiUrls = [
      'http://buku.kemendikdasmen.go.id/katalog',
      'https://buku.kemdikdasmen.go.id/katalog',
      'https://buku-kemendikdasmen.go.id/katalog',
      'https://buku.kemendikdasmen.go.id.evil.com/katalog',
      'https://evil.buku.kemendikdasmen.go.id/katalog',
      'https://sibi.kemendikdasmen.go.id/katalog',
      'https://fake.kemendikdasmen.go.id/katalog',
      'https://example.com/https://buku.kemendikdasmen.go.id/katalog',
      'https://example.com/?url=https://buku.kemendikdasmen.go.id/katalog',
      'https://buku.kemendikdasmen.go.id@evil.com/katalog',
      'https://buku.kemendikdasmen.go.id:8443/katalog',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'bukan-url-valid',
    ];

    for (const badUrl of dangerousSibiUrls) {
      const check = validateReferensiUrl(badUrl, 'sibi_kemendikdasmen');
      expect(check.valid, `Seharusnya menolak URL berbahaya: ${badUrl}`).toBe(false);
      expect(check.isOfficialSibiDomain).toBe(false);
      expect(check.error).toBeTruthy();

      const norm = normalizeReferensiSumberInput({
        jenisSumber: 'sibi_kemendikdasmen',
        judulBuku: 'IPAS Kelas IV',
        urlSumber: badUrl,
      });
      expect(norm.ok).toBe(false);
    }

    // URL resmi SIBI non-katalog tetap diterima namun memberi peringatan eksplisit (bukan halaman katalog)
    const officialNonCatalog = validateReferensiUrl(
      'https://buku.kemendikdasmen.go.id/tentang',
      'sibi_kemendikdasmen'
    );
    expect(officialNonCatalog.valid).toBe(true);
    expect(officialNonCatalog.isOfficialSibiDomain).toBe(true);
    expect(officialNonCatalog.isSibiCatalogPath).toBe(false);
    expect(officialNonCatalog.warning).toBeTruthy();

    // Domain resmi pada URL katalog TIDAK PERNAH otomatis menaikkan status menjadi terverifikasi
    const catalogUrl = `${SIBI_CATALOG_URL}/ilmu-pengetahuan-alam-dan-sosial-untuk-sd-kelas-iv`;
    const normOfficial = normalizeReferensiSumberInput({
      jenisSumber: 'sibi_kemendikdasmen',
      judulBuku: 'Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas IV',
      urlSumber: catalogUrl,
      statusVerifikasi: 'terkurasi_terverifikasi',
    });
    expect(normOfficial.ok).toBe(true);
    expect(normOfficial.item?.domainResmiSibi).toBe(true);
    expect(normOfficial.item?.statusVerifikasi).toBe('diinput_guru');
    expect(getReferensiStatusLabel(normOfficial.item?.statusVerifikasi)).toBe(
      PROVENANCE_MSG_TEACHER_INPUT
    );
  });

  it('2. Skenario 1 & 10: Modul tanpa referensi menampilkan pesan jujur di UI, prompt AI, dan DOCX tanpa sitasi palsu', async () => {
    const profile = makeSDProfile();
    const tp = makeFotosintesisTP();
    const modul = buildSmartModulAjar(tp, profile, { model: 'pbl' });

    expect(modul.referensiSumber).toBeUndefined();

    const promptNoRef = buildModulAjarGeminiPrompt(tp, profile, 'pbl');
    expect(promptNoRef).toContain(PROVENANCE_MSG_UNLINKED);

    const htmlNoRef = renderToStaticMarkup(
      React.createElement(ModulAjarViewer, {
        modul,
        schoolProfile: profile,
        customTP: tp,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
      })
    );
    expect(htmlNoRef).toContain(PROVENANCE_MSG_UNLINKED);
    expect(htmlNoRef).toContain(SIBI_CATALOG_URL);

    await exportModulAjarToDocx(modul, profile);
    const call = vi.mocked(saveAs).mock.calls.at(-1);
    const blob = call?.[0] as Blob;
    const xml = await (await JSZip.loadAsync(await blob.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(xml).toContain(PROVENANCE_MSG_UNLINKED);
    expect(xml).not.toContain('978-');
  });

  it('3. Skenario 2–6: Tambah, edit, multi-sumber, hapus 1 referensi tanpa hapus modul, serta simpan & muat ulang persisten', () => {
    const profile = makeSDProfile();
    const tp = makeFotosintesisTP();
    const baseModul = buildSmartModulAjar(tp, profile, { model: 'pbl' });

    const r1 = normalizeReferensiSumberInput(
      {
        id: 'ref-sibi-1',
        jenisSumber: 'sibi_kemendikdasmen',
        judulBuku: 'Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas IV',
        penulis: 'Amalia Fitri dkk.',
        edisiAtauTahun: '2021',
        babAtauSubbab: 'Bab 1 Tumbuhan Sumber Kehidupan',
        halaman: '1-24',
        urlSumber: `${SIBI_CATALOG_URL}/ilmu-pengetahuan-alam-dan-sosial-untuk-sd-kelas-iv`,
        catatanMateriGuru: 'Akar menyerap air; daun berklorofil berfotosintesis dengan cahaya.',
      },
      { jenjang: profile.jenjang, kelas: profile.kelasUtama, mataPelajaran: profile.mataPelajaranUtama }
    );
    expect(r1.ok).toBe(true);

    const r2 = normalizeReferensiSumberInput(
      {
        id: 'ref-guru-2',
        jenisSumber: 'buku_teks_lain',
        judulBuku: 'Panduan Praktik Kebun Sekolah SD',
        penulis: 'Tim Guru SD Nusantara',
        edisiAtauTahun: '2025',
        catatanMateriGuru: 'Panduan perbandingan tanaman di tempat terang vs gelap.',
      },
      { jenjang: profile.jenjang, kelas: profile.kelasUtama, mataPelajaran: profile.mataPelajaranUtama }
    );
    expect(r2.ok).toBe(true);

    // Edit metadata referensi pertama
    const editedR1 = normalizeReferensiSumberInput(
      {
        ...r1.item!,
        halaman: '1-28',
        babAtauSubbab: 'Bab 1 Subbab A-B Fotosintesis',
      },
      { jenjang: profile.jenjang, kelas: profile.kelasUtama, mataPelajaran: profile.mataPelajaranUtama }
    );
    expect(editedR1.ok).toBe(true);

    const twoRefsModul: ModulAjarDokumen = {
      ...baseModul,
      referensiSumber: [editedR1.item!, r2.item!],
      daftarPustaka: [
        formatReferensiSumberCitation(editedR1.item!),
        formatReferensiSumberCitation(r2.item!),
      ],
    };
    saveModulAjarDraft(profile, tp, 'pbl', twoRefsModul, 'user_edited');

    // Hapus satu referensi tanpa merusak modul maupun referensi tersisa
    const afterDeleteModul: ModulAjarDokumen = {
      ...twoRefsModul,
      referensiSumber: twoRefsModul.referensiSumber!.filter((item) => item.id !== 'ref-guru-2'),
      daftarPustaka: [formatReferensiSumberCitation(editedR1.item!)],
    };
    saveModulAjarDraft(profile, tp, 'pbl', afterDeleteModul, 'user_edited');

    const reloaded = loadModulAjarDraft(profile, tp, 'pbl');
    const latest = loadLatestModulAjarDraft(profile, tp);
    expect(reloaded).not.toBeNull();
    expect(latest?.doc.id).toBe(reloaded?.id);
    expect(reloaded?.referensiSumber).toHaveLength(1);
    expect(reloaded?.referensiSumber?.[0].id).toBe('ref-sibi-1');
    expect(reloaded?.referensiSumber?.[0].halaman).toBe('1-28');
    expect(reloaded?.referensiSumber?.[0].babAtauSubbab).toBe('Bab 1 Subbab A-B Fotosintesis');
    expect(reloaded?.kegiatanPembelajaran.length).toBeGreaterThan(0);

    const htmlWithRef = renderToStaticMarkup(
      React.createElement(ModulAjarViewer, {
        modul: reloaded!,
        schoolProfile: profile,
        customTP: tp,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
      })
    );
    expect(htmlWithRef).toContain('Amalia Fitri dkk.');
    expect(htmlWithRef).toContain('1-28');
    expect(htmlWithRef).toContain(PROVENANCE_MSG_TEACHER_INPUT);
  });

  it('4. Skenario 7–9: Prompt AI membedakan metadata/catatan/teks guru dan validator menolak referensi atau klaim baca fiktif', async () => {
    licenseManager.saveGeminiKey('key-sibi-mock-123');
    licenseManager.activateLicense('ASM-GM26-1TAT-1QBM-133R');
    const profile = makeSDProfile();
    const tp = makeFotosintesisTP();

    const refMetaNotes: ModulReferensiSumberItem = {
      id: 'ref-prompt-1',
      jenisSumber: 'sibi_kemendikdasmen',
      judulBuku: 'Ilmu Pengetahuan Alam dan Sosial untuk SD/MI Kelas IV',
      penulis: 'Amalia Fitri dkk.',
      edisiAtauTahun: '2021',
      babAtauSubbab: 'Bab 1 Tumbuhan',
      halaman: '1-24',
      urlSumber: `${SIBI_CATALOG_URL}/ilmu-pengetahuan-alam-dan-sosial-untuk-sd-kelas-iv`,
      catatanMateriGuru: 'Fokus pengamatan tanaman terang vs gelap dan peran klorofil daun.',
      jenisAksesMateri: 'catatan_ringkas_guru',
      domainResmiSibi: true,
      statusVerifikasi: 'diinput_guru',
    };
    const refDirectText: ModulReferensiSumberItem = {
      id: 'ref-prompt-2',
      jenisSumber: 'modul_atau_sumber_guru',
      judulBuku: 'Lembar Bacaan Ringkas Sekolah',
      catatanMateriGuru: 'Akar tumbuhan menyerap air tanah sedangkan daun menangkap cahaya pagi.',
      jenisAksesMateri: 'teks_disediakan_guru',
      statusVerifikasi: 'diinput_guru',
    };

    const promptText = buildModulAjarGeminiPrompt(tp, profile, 'pbl', 'Kebun Sekolah', {
      referensiSumber: [refMetaNotes, refDirectText],
    });
    expect(promptText).toContain('A. Metadata Sumber');
    expect(promptText).toContain('B. Catatan Ringkas Materi yang Disediakan Guru:');
    expect(promptText).toContain('C. Teks / Isi Materi yang Disediakan Langsung oleh Guru:');
    expect(promptText).toContain('Amalia Fitri dkk.');
    expect(promptText).toContain('Fokus pengamatan tanaman terang vs gelap');
    expect(promptText).toContain('Akar tumbuhan menyerap air tanah');
    expect(promptText).toContain('DILARANG mengklaim telah membaca isi buku SIBI');

    // Kasus A: Mock AI mengarang URL SIBI lain, ISBN palsu, halaman fiktif (hlm. 99), & referensiSumber palsu
    const fabricatedDraft = makeValidSDFotosintesisAIPayload({
      penjelasanKonsepUtama:
        'Berdasarkan isi lengkap buku yang telah saya baca melalui tautan SIBI tersebut, tumbuhan hijau memasak makanan di daun menggunakan klorofil, air, karbon dioksida, dan cahaya matahari.',
      daftarPustaka: [
        'Buku Palsu ISBN 978-602-1234-56-7 hlm. 99 https://buku.kemendikdasmen.go.id/katalog/palsu-karangan',
      ],
      referensiSumber: [
        {
          id: 'ai-fake-ref',
          jenisSumber: 'sibi_kemendikdasmen',
          judulBuku: 'Buku Karangan AI',
          statusVerifikasi: 'terkurasi_terverifikasi',
        },
      ],
    });
    const honestRepairedDraft = makeValidSDFotosintesisAIPayload({
      daftarPustaka: [formatReferensiSumberCitation(refMetaNotes)],
      referensiSumber: [
        {
          id: 'ai-override-attempt',
          jenisSumber: 'sibi_kemendikdasmen',
          judulBuku: 'Tidak Boleh Mengganti Input Guru',
          statusVerifikasi: 'terkurasi_terverifikasi',
        },
      ],
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(fabricatedDraft) }] } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(honestRepairedDraft) }] } }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(geminiClient, 'callGeminiStructuredJSON');

    const aiRes = await generateContextualModulAjarWithAI(tp, profile, 'pbl', 'Kebun Sekolah', {
      referensiSumber: [refMetaNotes],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(aiRes.usedFallback).toBe(false);
    expect(aiRes.repairAttempted).toBe(true);
    // Pastikan normalizeAIResponseStrict TIDAK menerima referensiSumber karangan AI
    expect(aiRes.modul.referensiSumber).toHaveLength(1);
    expect(aiRes.modul.referensiSumber?.[0].id).toBe('ref-prompt-1');
    expect(aiRes.modul.referensiSumber?.[0].statusVerifikasi).toBe('diinput_guru');

    // Uji langsung detector bahwa halaman valid dari guru (1-24) lolos, halaman fiktif (99) & URL tak terdaftar ditolak
    expect(
      detectFabricatedBookReference(
        [formatReferensiSumberCitation(refMetaNotes), 'Kutipan materi hlm. 1-24 sesuai acuan guru.'],
        undefined,
        [refMetaNotes]
      )
    ).toEqual([]);
    expect(
      detectFabricatedBookReference(
        ['Buku lain hlm. 99 https://buku.kemendikdasmen.go.id/katalog/karangan'],
        undefined,
        [refMetaNotes]
      ).length
    ).toBeGreaterThanOrEqual(2);

    // Uji validator menolak status 'terkurasi_terverifikasi' jika disuntik oleh payload AI langsung
    const forgedCuratedDoc: ModulAjarDokumen = {
      ...aiRes.modul,
      referensiSumber: [{ ...refMetaNotes, statusVerifikasi: 'terkurasi_terverifikasi' }],
    };
    const forgedCheck = validateModulAjarDokumen(forgedCuratedDoc, tp, profile, {
      sourceMode: 'ai',
      expectedModel: 'pbl',
    });
    expect(forgedCheck.status).toBe('gagal_validasi');
    expect(
      forgedCheck.relevanceAndAntiSlopIssues.join(' ')
    ).toContain('tidak diperbolehkan menaikkan status verifikasi');

    // Tetap pastikan status terkurasi resmi menampilkan label terkurasi bila memang diset dari jalur terkurasi
    expect(getReferensiStatusLabel('terkurasi_terverifikasi')).toBe(PROVENANCE_MSG_CURATED_VERIFIED);
  });

  it('5. Skenario 10–13: Ekspor DOCX, Paket Supervisi, Backup/Restore, Cloud Sync 3-way merge, dan draf legacy kompatibel', async () => {
    const profile = makeSDProfile();
    const tp = makeFotosintesisTP();

    const ref1: ModulReferensiSumberItem = {
      id: 'ref-sync-1',
      jenisSumber: 'sibi_kemendikdasmen',
      jenjang: 'SD/MI',
      kelas: '4',
      mataPelajaran: 'IPAS',
      judulBuku: 'Ilmu Pengetahuan Alam dan Sosial SD Kelas IV',
      penulis: 'Amalia Fitri dkk.',
      edisiAtauTahun: '2021',
      babAtauSubbab: 'Bab 1 Tumbuhan Sumber Kehidupan di Bumi',
      halaman: '2-25',
      urlSumber: `${SIBI_CATALOG_URL}/ipas-sd-kelas-iv`,
      catatanMateriGuru: 'Akar, batang, daun, dan syarat cahaya fotosintesis.',
      jenisAksesMateri: 'catatan_ringkas_guru',
      domainResmiSibi: true,
      statusVerifikasi: 'diinput_guru',
    };
    const ref2: ModulReferensiSumberItem = {
      id: 'ref-sync-2',
      jenisSumber: 'buku_teks_lain',
      judulBuku: 'Panduan Praktik IPA Dasar Sekolah',
      penulis: 'Tim Guru SD',
      edisiAtauTahun: '2024',
      statusVerifikasi: 'diinput_guru',
    };

    const modul = buildSmartModulAjar(tp, profile, {
      model: 'pbl',
      referensiSumber: [ref1],
    });
    const saveRes = saveModulAjarDraft(profile, tp, 'pbl', modul, 'user_edited');
    expect(saveRes.ok).toBe(true);

    // A. Ekspor DOCX tunggal mencantumkan metadata lengkap + status verifikasi jujur
    await exportModulAjarToDocx(saveRes.doc, profile);
    const docxBlob = vi.mocked(saveAs).mock.calls.at(-1)?.[0] as Blob;
    const docxXml = await (await JSZip.loadAsync(await docxBlob.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(docxXml).toContain('Ilmu Pengetahuan Alam dan Sosial SD Kelas IV');
    expect(docxXml).toContain('Amalia Fitri dkk.');
    expect(docxXml).toContain('2021');
    expect(docxXml).toContain('Bab 1 Tumbuhan Sumber Kehidupan di Bumi');
    expect(docxXml).toContain('2-25');
    expect(docxXml).toContain(`${SIBI_CATALOG_URL}/ipas-sd-kelas-iv`);
    expect(docxXml).toContain(PROVENANCE_MSG_TEACHER_INPUT);

    // B. Paket Supervisi mewarisi buildModulAjarElements dengan aman
    const supElements = buildModulAjarDanLKPDElements(profile, [tp]);
    const supBlob = await Packer.toBlob(new Document({ sections: [{ children: supElements }] }));
    const supXml = await (await JSZip.loadAsync(await supBlob.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(supXml).toContain('Ilmu Pengetahuan Alam dan Sosial SD Kelas IV');
    expect(supXml).toContain(PROVENANCE_MSG_TEACHER_INPUT);

    // C. Backup & Restore mempertahankan referensiSumber utuh
    const backupJson = exportBackupDataJson();
    localStorage.clear();
    expect(loadModulAjarDraft(profile, tp, 'pbl')).toBeNull();
    const importRes = importBackupDataJson(backupJson);
    expect(importRes.success).toBe(true);
    const restoredFromBackup = loadModulAjarDraft(profile, tp, 'pbl');
    expect(restoredFromBackup?.referensiSumber).toHaveLength(1);
    expect(restoredFromBackup?.referensiSumber?.[0].urlSumber).toBe(ref1.urlSumber);

    // D. Cloud Sync 3-way merge menggabungkan penambahan referensi paralel antar perangkat tanpa konflik
    const modulKey = saveRes.storageKey;
    const baseEntry = { ...saveRes.doc, referensiSumber: [] as ModulReferensiSumberItem[] };
    const localEntry = { ...saveRes.doc, referensiSumber: [ref1] };
    const serverEntry = {
      ...saveRes.doc,
      pemahamanBermakna: 'Pemahaman bermakna diperbarui di perangkat sekolah.',
      referensiSumber: [ref2],
    };
    const conflictAnalysis = analyzeWorkspaceConflict(
      { [modulKey]: baseEntry },
      { [modulKey]: localEntry },
      { [modulKey]: serverEntry }
    );
    expect(conflictAnalysis.conflicts).toHaveLength(0);
    const mergedModul = conflictAnalysis.mergedEntries[modulKey] as ModulAjarDokumen;
    expect(mergedModul.referensiSumber?.map((r) => r.id)).toEqual(['ref-sync-1', 'ref-sync-2']);
    expect(mergedModul.pemahamanBermakna).toBe('Pemahaman bermakna diperbarui di perangkat sekolah.');

    // E. Konflik edit pada item referensi yang sama diselesaikan bersih tanpa menghapus referensi lain atau modul
    const sameRefLocal = {
      ...saveRes.doc,
      referensiSumber: [{ ...ref1, halaman: '2-30' }, ref2],
    };
    const sameRefServer = {
      ...saveRes.doc,
      referensiSumber: [{ ...ref1, halaman: '5-25' }, ref2],
    };
    const conflictSameItem = analyzeWorkspaceConflict(
      { [modulKey]: { ...saveRes.doc, referensiSumber: [ref1, ref2] } },
      { [modulKey]: sameRefLocal },
      { [modulKey]: sameRefServer }
    );
    expect(conflictSameItem.conflicts).toHaveLength(1);
    expect(conflictSameItem.conflicts[0].locator.kind).toBe('modul_referensi_item');
    const chosenServerEntries = applyConflictChoicesToMergedEntries(conflictSameItem as never, {
      [conflictSameItem.conflicts[0].id]: 'server',
    });
    const resolvedDoc = chosenServerEntries[modulKey] as ModulAjarDokumen;
    expect(resolvedDoc.referensiSumber?.find((r) => r.id === 'ref-sync-1')?.halaman).toBe('5-25');
    expect(resolvedDoc.referensiSumber?.find((r) => r.id === 'ref-sync-2')?.judulBuku).toBe(
      ref2.judulBuku
    );

    // F. Kompatibilitas draf legacy tanpa field referensiSumber
    const legacyDoc: ModulAjarDokumen = { ...modul };
    delete legacyDoc.referensiSumber;
    const legacyValidation = validateModulAjarDokumen(legacyDoc, tp, profile, {
      sourceMode: 'draft',
    });
    expect(legacyValidation.structuralIssues).toEqual([]);
    const legacyDocxEls = buildModulAjarElements(legacyDoc, profile);
    expect(legacyDocxEls.length).toBeGreaterThan(5);

    const backupPromptCheck = buildReferensiPromptBlock([ref1]);
    expect(backupPromptCheck).toContain(ref1.judulBuku);
  });
});
