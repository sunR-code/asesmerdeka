import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import type { ModulAjarDokumen } from '../../types/perangkatAjar';
import { buildSmartModulAjar } from '../perangkatAjarEngine';
import {
  buildOperationalAsesmenDetail,
  buildOperationalDiferensiasi,
  resolveModulKKTPConfig,
  selectRelevantProfilLulusanDimensions,
} from '../modulOperationalContent';
import {
  detectFabricatedBookReference,
  evaluateOperationalActivitySpecificity,
  validateModulAjarDokumen,
} from '../modulAjarValidator';
import {
  buildModulAjarGeminiPrompt,
  generateContextualModulAjarWithAI,
} from '../modulAjarAiService';
import * as modulAiModule from '../modulAjarAiService';
import * as licenseManager from '../licenseManager';
import * as geminiClient from '../../services/geminiClient';
import { saveLKPDDraft, loadLatestModulAjarDraft, saveModulAjarDraft } from '../perangkatDraftStorage';
import { buildSmartLKPD } from '../perangkatAjarEngine';
import { analyzeWorkspaceConflict } from '../cloudSyncManager';
import { exportModulAjarToDocx } from '../docx/docxPerangkatAjar';
import { MODUL_AJAR_MODELS } from '../modulPedagogicalModels';
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

function makeProfile(overrides?: Partial<SchoolProfile>): SchoolProfile {
  return {
    schoolId: 'sch_task12_2_test',
    instansiDinas: 'Dinas Pendidikan Uji',
    namaSekolah: 'Sekolah Uji Task 12.2',
    alamatSekolah: 'Jl. Merdeka No. 12',
    namaGuru: 'Ibu Sari, M.Pd.',
    nipGuru: '198604042010012002',
    namaKepalaSekolah: 'Drs. Hartono, M.Pd.',
    nipKepalaSekolah: '196901011995011001',
    kotaSekolah: 'Bandung',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    rombelAktif: 'VIII-A',
    daftarRombel: ['VIII-A'],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

function makeTP(overrides?: Partial<CustomTPItem>): CustomTPItem {
  return {
    id: 'tp_12_2_math',
    kode: '8.1',
    elemen: 'Aljabar',
    materiPokok: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
    tujuanPembelajaran:
      'Memodelkan dan menyelesaikan masalah kontekstual sistem persamaan linear dua variabel dengan metode substitusi atau eliminasi.',
    arahanRangkuman: 'Fokus pada identifikasi dua variabel, penyusunan dua persamaan, dan cek balik hasil.',
    alokasiJP: 6,
    mingguMulai: 1,
    mingguSelesai: 2,
    prasyarat: ['Persamaan linear satu variabel'],
    buktiKetercapaian: ['Model dua persamaan tepat sesuai soal cerita dan nilai variabel terverifikasi'],
    subTP: [
      {
        id: 'sub_1',
        kode: '8.1.A',
        kompetensi: 'Menentukan dua variabel dan menyusun dua persamaan linear dari cerita',
        fokusMateri: 'Pemodelan Persamaan SPLDV',
        buktiKetercapaian: 'Variabel x, y dan dua persamaan linear ditulis benar',
      },
      {
        id: 'sub_2',
        kode: '8.1.B',
        kompetensi: 'Menghitung nilai variabel dengan eliminasi/substitusi serta memeriksa hasilnya',
        fokusMateri: 'Penyelesaian & Verifikasi SPLDV',
        buktiKetercapaian: 'Nilai x dan y benar ketika disubstitusi ulang ke kedua persamaan',
      },
    ],
    ...overrides,
  };
}

function makeValidStructuredAIPayload(tp: CustomTPItem, modelLabel = 'Discovery Learning') {
  return {
    judul: `Modul Ajar AI: ${tp.materiPokok} (${modelLabel})`,
    pemahamanBermakna: `Peserta didik memahami bahwa ${tp.materiPokok} membantu memodelkan dua hubungan besaran secara akurat pada masalah jual beli sehari-hari.`,
    pertanyaanPemantik: [
      `Bagaimana cara mengetahui harga satu buku dan satu pensil jika diketahui dua paket belanja berbeda?`,
      `Mengapa satu persamaan saja tidak cukup untuk menentukan nilai dua variabel?`,
      `Bagaimana cara mengecek apakah pasangan bilangan yang kamu temukan benar-benar memenuhi kedua syarat?`,
    ],
    profilPelajarPancasila: [
      'Penalaran Kritis (memodelkan dua persamaan dan memverifikasi hasil terhadap soal cerita)',
      'Kemandirian (menyelesaikan perhitungan langkah demi langkah secara teliti)',
      'Komunikasi (menjelaskan arti nilai variabel di konteks masalah)',
    ],
    bahanBacaan: {
      penjelasanKonsepUtama: `Sistem Persamaan Linear Dua Variabel (SPLDV) pada elemen Aljabar memadukan dua persamaan berderajat satu dengan dua variabel yang sama. Penyelesaian sah adalah pasangan (x, y) yang membuat kedua persamaan bernilai benar sekaligus.`,
      subKonsep: [
        {
          judul: '8.1.A: Pemodelan Persamaan SPLDV',
          uraian: 'Menetapkan simbol variabel x dan y disertai satuannya lalu menerjemahkan setiap kalimat syarat menjadi persamaan linear.',
        },
        {
          judul: '8.1.B: Penyelesaian & Verifikasi SPLDV',
          uraian: 'Mengeliminasi salah satu variabel atau menyubstitusi untuk memperoleh nilai eksak, lalu mengecek ulang ke persamaan kedua.',
        },
      ],
      istilahPenting: [
        { istilah: 'Variabel', pengertian: 'Huruf/simbol yang mewakili besaran yang nilainya dicari.' },
        { istilah: 'Koefisien', pengertian: 'Bilangan pengali di depan variabel pada persamaan.' },
        { istilah: 'Himpunan Penyelesaian', pengertian: 'Pasangan nilai (x, y) yang memenuhi kedua persamaan sekaligus.' },
      ],
      contohKonkret: [
        'Membeli 2 buku dan 1 pulpen seharga Rp13.000, lalu membeli 1 buku dan 2 pulpen seharga Rp11.000 di koperasi sekolah.',
        'Menghitung komposisi dua paket kursi meja di aula sekolah dengan kapasitas total terukur.',
      ],
      contohPenyelesaian: {
        judulContoh: 'Penyelesaian Harga Paket Koperasi (2x + y = 13000 dan x + 2y = 11000)',
        konteks: 'Misalkan x = harga 1 buku dan y = harga 1 pulpen.',
        langkahPenyelesaian: [
          'Langkah 1: Dari persamaan pertama y = 13000 - 2x.',
          'Langkah 2: Substitusi ke persamaan kedua x + 2(13000 - 2x) = 11000 -> -3x = -15000 -> x = 5000.',
          'Langkah 3: Hitung y = 13000 - 2(5000) = 3000, lalu cek ulang 5000 + 2(3000) = 11000 (cocok).',
        ],
        kesimpulanHasil: 'Harga 1 buku Rp5.000 dan 1 pulpen Rp3.000.',
      },
      hubunganDenganTP:
        'Ketujuh unsur materi ini menghantarkan siswa dari prasyarat satu variabel hingga terampil menyelesaikan TP 8.1.',
      potensiMiskonsepsi: [
        {
          miskonsepsi: 'Siswa sering lupa mengalikan seluruh suku pada persamaan saat menyamakan koefisien untuk eliminasi.',
          caraMeluruskan: 'Lingkari ketiga suku (ruas kiri dan konstanta ruas kanan) di papan tulis saat menunjukkan perkalian skalar.',
        },
      ],
    },
    kegiatanPembelajaran: [
      {
        pertemuan: 1,
        alokasiMenit: 120,
        tahapTerstruktur: [
          {
            fase: 'pendahuluan',
            namaTahap: 'Pendahuluan & Kesiapan Belajar',
            tujuanTahap: 'Mengecek prasyarat satu variabel dan tujuan belajar SPLDV.',
            aktivitasGuru: 'Guru menampilkan dua kartu soal persamaan linear satu variabel di papan tulis dan meminta siswa menyelesaikannya dalam 3 menit.',
            aktivitasSiswa: 'Siswa mengerjakan dua soal prasyarat pada buku catatan dan mencocokkan jawabannya bersama pasangan.',
            instruksiPertanyaan: 'Jika satu paket berisi 2 buku ditambah Rp3.000 bernilai Rp13.000, berapa harga 1 buku?',
            mediaBahan: 'Papan tulis dan kartu pemanasan prasyarat',
            durasiMenit: 15,
            buktiBelajar: 'Catatan jawaban pemanasan prasyarat',
            pengalamanBelajar: 'Memahami',
            prinsipPembelajaran: ['Berkesadaran'],
          },
          {
            fase: 'inti',
            namaTahap: '1. Stimulation (Pemberian Rangsangan)',
            tujuanTahap: 'Memicu rasa ingin tahu terhadap masalah dua variabel dengan dua paket harga koperasi.',
            aktivitasGuru: 'Guru menjelaskan materi pengantar dengan menampilkan tabel harga 2 paket alat tulis koperasi dan meminta siswa menandai hal yang belum diketahui.',
            aktivitasSiswa: 'Siswa berdiskusi mengisi tabel perbandingan besaran diketahui serta menulis dua hal yang belum diketahui dari daftar harga koperasi.',
            instruksiPertanyaan: 'Mengapa harga 1 buku belum bisa ditebak hanya dari kalimat paket pertama saja?',
            mediaBahan: 'Tabel struk koperasi sekolah pada LKPD Discovery',
            durasiMenit: 15,
            buktiBelajar: 'Tabel daftar besaran diketahui & ditanya',
            pengalamanBelajar: 'Memahami',
            prinsipPembelajaran: ['Menggembirakan'],
          },
          {
            fase: 'inti',
            namaTahap: '2. Problem Statement (Identifikasi Masalah)',
            tujuanTahap: 'Merumuskan dugaan bagaimana dua kalimat informasi diubah menjadi dua persamaan.',
            aktivitasGuru: 'Guru memandu kelompok menuliskan pemisalan variabel x dan y beserta dugaan awal hubungan dua kalimat tersebut.',
            aktivitasSiswa: 'Siswa merumuskan dugaan model dua persamaan SPLDV untuk kasus harga alat tulis koperasi pada LKPD.',
            instruksiPertanyaan: 'Jika harga buku disebut x dan pulpen y, bagaimana menuliskan kalimat paket A dan paket B?',
            mediaBahan: 'Kolom Dugaan Model di LKPD Discovery',
            durasiMenit: 15,
            buktiBelajar: 'Rumusan dugaan dua persamaan SPLDV',
          },
          {
            fase: 'inti',
            namaTahap: '3. Data Collection (Pengumpulan Data)',
            tujuanTahap: 'Mengumpulkan kombinasi pasangan harga coba-coba dan data tabel paket tambahan.',
            aktivitasGuru: 'Guru membagikan kartu variasi 3 paket belanja dan meminta kelompok mengisikannya ke tabel eksplorasi.',
            aktivitasSiswa: 'Siswa mencatat pasangan nilai x dan y yang memenuhi persamaan pertama ke dalam tabel uji.',
            instruksiPertanyaan: 'Isikan 4 pasangan bilangan bulat yang cocok untuk persamaan pertama terlebih dahulu!',
            mediaBahan: 'Kartu variasi paket belanja koperasi',
            durasiMenit: 20,
            buktiBelajar: 'Tabel pasangan nilai coba-coba terisi',
            pengalamanBelajar: 'Mengaplikasi',
          },
          {
            fase: 'inti',
            namaTahap: '4. Data Processing (Pengolahan Data)',
            tujuanTahap: 'Mengolah tabel untuk menemukan aturan eliminasi atau substitusi sistematis.',
            aktivitasGuru: 'Guru menunjukkan selisih antara baris 2 persamaan setelah koefisien disamakan lalu meminta kelompok mengolah kasus kedua.',
            aktivitasSiswa: 'Siswa mengurangkan dua persamaan terstandar untuk mengeliminasi satu variabel dan menghitung nilai variabel sisa.',
            instruksiPertanyaan: 'Apa yang terjadi pada variabel x jika persamaan kedua dikalikan 2 lalu dikurangkan?',
            mediaBahan: 'Lembar pengolahan langkah eliminasi-substitusi',
            durasiMenit: 20,
            buktiBelajar: 'Langkah perhitungan eliminasi & substitusi di LKPD',
            pengalamanBelajar: 'Mengaplikasi',
            prinsipPembelajaran: ['Bermakna'],
          },
          {
            fase: 'inti',
            namaTahap: '5. Verification (Pembuktian)',
            tujuanTahap: 'Menguji kebenaran nilai variabel pada kedua persamaan dan kasus uji baru.',
            aktivitasGuru: 'Guru memberikan satu kasus uji baru kantin sekolah agar siswa memverifikasi cara substitusi ke kedua persamaan.',
            aktivitasSiswa: 'Siswa menyubstitusikan nilai (x, y) hasil temuan ke persamaan pertama dan kedua untuk membuktikan kebenarannya.',
            instruksiPertanyaan: 'Coba masukkan nilai x = 5.000 dan y = 3.000 ke persamaan kedua: apakah hasilnya tepat Rp11.000?',
            mediaBahan: 'Kartu kasus uji verifikasi',
            durasiMenit: 15,
            buktiBelajar: 'Bukti substitusi balik yang bernilai benar',
          },
          {
            fase: 'inti',
            namaTahap: '6. Generalization (Menarik Kesimpulan)',
            tujuanTahap: 'Menyimpulkan langkah umum pemecahan SPLDV.',
            aktivitasGuru: 'Guru memfasilitasi dua pasangan siswa membacakan ringkasan 4 langkah memecahkan SPLDV dengan bahasanya sendiri.',
            aktivitasSiswa: 'Siswa menulis generalisasi urutan cara menyusun dan menyelesaikan SPLDV di kotak kesimpulan LKPD.',
            instruksiPertanyaan: 'Tuliskan 4 langkah urut menyelesaikan SPLDV agar tidak lupa memeriksa hasil akhir!',
            mediaBahan: 'Kotak Generalisasi LKPD',
            durasiMenit: 10,
            buktiBelajar: 'Paragraf generalisasi langkah SPLDV',
            pengalamanBelajar: 'Merefleksi',
          },
          {
            fase: 'penutup',
            namaTahap: 'Penutup & Exit Ticket',
            tujuanTahap: 'Mengukur ketuntasan akhir pertemuan dengan cek cepat mandiri.',
            aktivitasGuru: 'Guru membagikan kartu exit ticket berisi 1 soal pemodelan SPLDV singkat lalu menutup dengan refleksi kelas.',
            aktivitasSiswa: 'Siswa menyusun dua persamaan dari soal exit ticket secara mandiri dan menuliskan bagian yang masih membingungkan.',
            instruksiPertanyaan: 'Susunlah model SPLDV untuk soal koperasi mini pada kartu exit ticket ini!',
            mediaBahan: 'Kartu exit ticket & catatan refleksi',
            durasiMenit: 10,
            buktiBelajar: 'Kartu exit ticket terisi mandiri',
            pengalamanBelajar: 'Merefleksi',
            prinsipPembelajaran: ['Berkesadaran'],
          },
        ],
      },
    ],
    asesmenDetail: {
      diagnostik: {
        tujuanPemeriksaanPrasyarat: 'Memeriksa kemampuan menyelesaikan persamaan linear satu variabel 2a + 3000 = 13000.',
        pertanyaanAtauTugasAwal: [
          'Tentukan nilai x jika 3x - 2 = 10.',
          'Tuliskan bentuk aljabar untuk kalimat: total harga 2 buku dan 3 pulpen adalah Rp19.000.',
        ],
        indikatorInterpretasi: 'Siap jika mampu memindahkan suku tepat; bila keliru berikan contoh ulang keseimbangan ruas 3 menit.',
      },
      formatif: {
        instruksiAktivitas: 'Observasi proses pemodelan variabel dan penyamaan koefisien pada LKPD selama kegiatan kelompok.',
        pertanyaanAtauTugas: [
          'Mengapa koefisien variabel harus disamakan sebelum mengurangkan persamaan?',
          'Sudahkah kalian menguji nilai x dan y ke persamaan kedua?',
        ],
        buktiYangDiamati: [
          'Penulisan definisi x dan y beserta satuannya di LKPD',
          'Langkah cek substitusi balik tertulis lengkap',
        ],
        umpanBalikGuru: 'Ingatkan kelompok mengalikan konstanta di ruas kanan bila koefisien ruas kiri dikalikan.',
      },
      akhir: {
        bentukUtama: 'Pemecahan Masalah Matematis dan Verifikasi Proses Perhitungan SPLDV',
        butirTugas: [
          {
            nomor: 1,
            bentuk: 'Pemodelan & Penyelesaian',
            pertanyaanAtauTugas: 'Di kantin, 3 roti dan 2 susu seharga Rp23.000, sedangkan 1 roti dan 2 susu seharga Rp13.000. Tentukan harga 1 roti dan 1 susu.',
            kunciAtauContohRespons: '3r + 2s = 23000; r + 2s = 13000 -> eliminasi s: 2r = 10000 -> r = 5000, s = 4000.',
          },
          {
            nomor: 2,
            bentuk: 'Analisis Kesalahan',
            pertanyaanAtauTugas: 'Budi menulis 2x + y = 9 dikalikan 2 menjadi 4x + 2y = 9. Temukan kesalahannya dan perbaiki!',
            kunciAtauContohRespons: 'Ruas kanan (9) belum dikalikan 2; seharusnya menjadi 4x + 2y = 18.',
          },
        ],
        pedomanPenilaian: 'Penilaian memakai rubrik 4 tingkat (Baru Berkembang, Layak, Cakap, Mahir) dengan fokus ketepatan model, proses hitung, dan verifikasi balik.',
      },
    },
    rubrikPenilaianSingkat: [
      {
        kriteria: 'Pemodelan Persamaan SPLDV',
        baruBerkembang: 'Belum mampu memisalkan dua variabel dari cerita.',
        layak: 'Memisalkan variabel namun satu persamaan masih keliru tanda.',
        cakap: 'Menyusun dua persamaan SPLDV tepat dari kasus nyata.',
        mahir: 'Menyusun model tepat disertai batasan nilai positif kontekstual.',
      },
      {
        kriteria: 'Proses Perhitungan & Cek Balik',
        baruBerkembang: 'Salah operasi aljabar tanpa pemeriksaan ulang.',
        layak: 'Nilai satu variabel tepat namun lupa menguji persamaan kedua.',
        cakap: 'Menghitung (x, y) benar dengan substitusi atau eliminasi lengkap.',
        mahir: 'Menunjukkan cara alternatif serta mengecek balik kedua persamaan.',
      },
    ],
    diferensiasiOperasional: {
      prinsipKesetaraanTP: 'Ketiga jalur tetap memecahkan TP 8.1 SPLDV dengan variasi kadar bantuan tabel pemodelan.',
      kesiapanDasar: {
        targetKesiapan: 'Siswa yang masih bingung memisalkan x dan y dari teks cerita.',
        dukunganScaffolding: 'Diberikan kartu pemetaan kotak: nama barang -> huruf x/y -> persamaan siap susun dengan angka puluhan kecil.',
        aktivitasKonkret: [
          'Mengisi kotak tabel pemisalan variabel x dan y lalu menyelesaikan SPLDV berangka kecil (misal x + y = 7 dan x - y = 1).',
          'Mencocokkan hasil hitungan ke kedua kalimat awal bersama guru.',
        ],
        mediaPendukung: 'Kartu kotak pemisalan variabel berangka kecil',
        buktiBelajarJalur: 'Model dan solusi tepat untuk soal SPLDV angka sederhana',
      },
      kesiapanBerkembang: {
        targetKesiapan: 'Siswa yang sudah siap memodelkan dan menghitung soal reguler.',
        dukunganScaffolding: 'Instruksi normal LKPD Discovery plus cek tengah proses.',
        aktivitasKonkret: [
          'Menyelesaikan kasus harga 2 paket koperasi hingga tahap pembuktian balik pada LKPD reguler.',
          'Membandingkan metode substitusi dengan eliminasi bersama rekan satu meja.',
        ],
        mediaPendukung: 'LKPD Discovery SPLDV reguler',
        buktiBelajarJalur: 'Penyelesaian utuh dua persamaan hingga generalisasi',
      },
      kesiapanMahir: {
        targetKesiapan: 'Siswa cepat tuntas yang membutuhkan tantangan error analysis.',
        dukunganScaffolding: 'Minimal bantuan: memeriksa klaim penyelesaian keliru dan membuat variasi soal sendiri.',
        aktivitasKonkret: [
          'Menemukan kesalahan perkalian skalar pada contoh pengerjaan SPLDV salah lalu mengonstruksi 1 soal cerita SPLDV yang memiliki solusi bilangan bulat.',
        ],
        mediaPendukung: 'Kartu tantangan analisis kesalahan & konstruksi kasus baru',
        buktiBelajarJalur: 'Koreksi kesalahan beralasan dan soal SPLDV baru terverifikasi',
      },
    },
    contohLKPD: {
      presetType: 'kasus',
      judul: 'Menentukan Harga Paket Koperasi dengan SPLDV',
      konteksTugas: 'Paket A (2 buku + 1 pulpen = Rp13.000) dan Paket B (1 buku + 2 pulpen = Rp11.000).',
      tujuanPengerjaan: 'Menyusun dua persamaan SPLDV dan menemukan harga satuan dengan terverifikasi.',
      petunjukSiswa: ['Tetapkan simbol x dan y terlebih dahulu', 'Tuliskan seluruh langkah hitung dan cek balik'],
      bahanAtauData: ['Tabel perbandingan harga Paket A dan Paket B koperasi'],
      langkahPengerjaan: ['Susun persamaan 1 dan 2', 'Eliminasi atau substitusi untuk mencari x dan y', 'Uji hasil ke Paket B'],
      pertanyaanAtauRuangKerja: ['Berapa harga 1 buku dan 1 pulpen?', 'Mengapa hasil harus diuji ke kedua paket?'],
      hasilYangDiharapkan: 'Nilai x = Rp5.000, y = Rp3.000 lengkap dengan bukti substitusi.',
      kriteriaPenilaian: ['Ketepatan model persamaan', 'Ketelitian perhitungan dan verifikasi balik'],
    },
    daftarPustaka: [
      '[Lengkapi referensi satuan pendidikan] Buku teks Matematika Kelas VIII yang digunakan sekolah (isi edisi & bab aktual).',
    ],
  };
}

describe('Task 12.2 — Operational Module Content & AI Quality Validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Gate 1 & 2: Materi ajar konkret 7 komponen sesuai jenjang (SD/SMP/SMA/SMK) dan rumpun ilmu tanpa referensi SIBI fiktif', () => {
    // SD IPAS: bahasa sederhana visual, bebas "dunia kerja / industri / bengkel"
    const sdProf = makeProfile({ jenjang: 'SD/MI', kelasUtama: '4', mataPelajaranUtama: 'IPAS' });
    const sdTP = makeTP({
      id: 'tp_sd_1',
      kode: '4.1',
      elemen: 'Pemahaman IPAS',
      materiPokok: 'Perubahan Wujud Zat',
      tujuanPembelajaran: 'Mengidentifikasi perubahan wujud zat mencair dan menguap melalui pengamatan benda sekitar.',
      prasyarat: ['Sifat benda padat dan cair'],
      buktiKetercapaian: ['Catatan hasil pengamatan es mencair pada lembar kerja'],
      subTP: undefined,
    });
    const sdMod = buildSmartModulAjar(sdTP, sdProf, { model: 'discovery' });
    expect(sdMod.bahanBacaan?.penjelasanKonsepUtama?.length).toBeGreaterThan(120);
    expect(sdMod.bahanBacaan?.subKonsep?.length).toBeGreaterThanOrEqual(2);
    expect(sdMod.bahanBacaan?.istilahPenting?.length).toBeGreaterThanOrEqual(3);
    expect(sdMod.bahanBacaan?.contohKonkret?.length).toBeGreaterThanOrEqual(2);
    expect(sdMod.bahanBacaan?.contohPenyelesaian?.langkahPenyelesaian.length).toBeGreaterThanOrEqual(3);
    expect(sdMod.bahanBacaan?.hubunganDenganTP).toContain('4.1');
    expect(sdMod.bahanBacaan?.potensiMiskonsepsi?.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(sdMod).toLowerCase()).not.toMatch(/\bdunia kerja\b|\bindustri\b|\bbengkel\b/);
    expect(detectFabricatedBookReference(sdMod.daftarPustaka, sdMod.bahanBacaan?.referensiCatatan)).toHaveLength(0);

    // SMA Bahasa Indonesia: pendekatan teks & analisis argumen
    const smaProf = makeProfile({ jenjang: 'SMA/MA', kelasUtama: '11', mataPelajaranUtama: 'Bahasa Indonesia' });
    const smaTP = makeTP({
      id: 'tp_sma_1',
      kode: '11.2',
      elemen: 'Membaca & Menulis',
      materiPokok: 'Teks Argumentasi Berbasis Bukti',
      tujuanPembelajaran: 'Mengevaluasi kesahihan klaim dan bukti pada teks argumentasi tentang isu lingkungan.',
      subTP: undefined,
    });
    const smaMod = buildSmartModulAjar(smaTP, smaProf, { model: 'inquiry' });
    expect(smaMod.bahanBacaan?.contohPenyelesaian?.langkahPenyelesaian.join(' ')).toMatch(/Kutipan|Teks|Bahasa/i);
    expect(smaMod.asesmenDetail?.akhir.bentukUtama).toMatch(/Teks|Analisis/i);

    // SMK Kejuruan Teknik Pemesinan / PKK: SOP & K3 wajib muncul
    const smkKejProf = makeProfile({ jenjang: 'SMK', kelasUtama: '11', mataPelajaranUtama: 'Teknik Pemesinan Bubut' });
    const smkKejTP = makeTP({
      id: 'tp_smk_1',
      kode: '11.K1',
      elemen: 'Proses Pemesinan',
      materiPokok: 'Pembubutan Rata Bertingkat',
      tujuanPembelajaran: 'Melaksanakan pembubutan rata bertingkat sesuai gambar kerja dan K3.',
      subTP: undefined,
    });
    const smkKejMod = buildSmartModulAjar(smkKejTP, smkKejProf, { model: 'explicit' });
    expect(JSON.stringify(smkKejMod)).toMatch(/\bK3\b/);
    expect(JSON.stringify(smkKejMod)).toMatch(/\bSOP\b/);
    expect(smkKejMod.alokasiWaktuDetail?.totalMenitPertemuan).toBe(180);

    // SMK Umum: bukan kejuruan, 3 JP = 135 mnt
    const smkUmumProf = makeProfile({ jenjang: 'SMK', kelasUtama: '10', mataPelajaranUtama: 'Bahasa Indonesia' });
    const smkUmumMod = buildSmartModulAjar(smaTP, smkUmumProf, { model: 'pbl' });
    expect(smkUmumMod.alokasiWaktuDetail?.smkTrack).toBe('umum');
    expect(smkUmumMod.alokasiWaktuDetail?.totalMenitPertemuan).toBe(135);
  });

  it('Gate 3, 4 & 14: Ketujuh model memiliki aktivitas operasional autentik & waktu pertemuan akurat', () => {
    const profile = makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' });
    const tp = makeTP();

    for (const modelDef of MODUL_AJAR_MODELS) {
      const mod = buildSmartModulAjar(tp, profile, { model: modelDef.id });
      const validation = validateModulAjarDokumen(mod, tp, profile, {
        sourceMode: 'template',
        expectedModel: modelDef.id,
      });
      expect(validation.structuralIssues).toEqual([]);
      expect(validation.relevanceAndAntiSlopIssues).toEqual([]);
      expect(mod.catatanValidasi?.status).toBe('template_awal');
    }
  });

  it('Gate 5, 6 & 7: Asesmen diagnostik/formatif/akhir + kunci/rubrik + KKTP dinamis (tanpa 71 hardcoded) + Diferensiasi 3 jalur', () => {
    // 1. Tanpa angka KKTP sekolah -> mode deskriptif tanpa hardcoded 71 atau 0-60
    const profNoKKTP = makeProfile({ jenjang: 'SMP/MTs', kktpMinTuntas: undefined });
    const tpNoKKTP = makeTP({ kktpMinTuntas: undefined });
    const modNoKKTP = buildSmartModulAjar(tpNoKKTP, profNoKKTP);
    expect(modNoKKTP.asesmenDetail?.akhir.kktpReferensi?.mode).toBe('deskriptif_rubrik');
    expect(modNoKKTP.asesmenDetail?.akhir.pedomanPenilaian).not.toContain('71');
    expect(modNoKKTP.asesmenDetail?.akhir.kktpReferensi?.rentangLabel?.cakap).toBe('Cakap');

    // 2. Sekolah menetapkan KKTP 75 -> dihitung dinamis proporsional (0-64, 65-74, 75-87, 88-100)
    const profKKTP75 = makeProfile({ jenjang: 'SMP/MTs', kktpMinTuntas: 75 });
    const kktpRef = resolveModulKKTPConfig(tpNoKKTP, profKKTP75);
    expect(kktpRef.mode).toBe('dinamis_sekolah');
    expect(kktpRef.minTuntas).toBe(75);
    expect(kktpRef.rentangLabel).toEqual({
      baruBerkembang: 'Baru Berkembang (0–64)',
      layak: 'Layak (65–74)',
      cakap: 'Cakap (75–87)',
      mahir: 'Mahir (88–100)',
    });

    // 3. Asesmen detail konkret & 3 jalur diferensiasi berbeda namun setara TP
    const ad = buildOperationalAsesmenDetail({
      tp: tpNoKKTP,
      profile: profKKTP75,
      jenjang: 'SMP/MTs',
      konteks: 'Koperasi Sekolah',
    });
    expect(ad.diagnostik.pertanyaanAtauTugasAwal.length).toBeGreaterThanOrEqual(2);
    expect(ad.formatif.buktiYangDiamati.length).toBeGreaterThanOrEqual(2);
    expect(ad.akhir.butirTugas.length).toBeGreaterThanOrEqual(2);
    expect(ad.akhir.butirTugas.every((b) => b.kunciAtauContohRespons.length > 15)).toBe(true);

    const diff = buildOperationalDiferensiasi({
      tp: tpNoKKTP,
      profile: profKKTP75,
      jenjang: 'SMP/MTs',
      konteks: 'Koperasi Sekolah',
    });
    expect(diff.kesiapanDasar.aktivitasKonkret[0]).not.toBe(diff.kesiapanMahir.aktivitasKonkret[0]);
    expect(diff.kesiapanDasar.dukunganScaffolding).toContain('prasyarat');
    expect(diff.prinsipKesetaraanTP).toContain('8.1');

    // 4. Dimensi Profil Lulusan selektif (2-4 dimensi, bukan dipaksa 8)
    const dims = selectRelevantProfilLulusanDimensions(tpNoKKTP, profKKTP75, 'SMP/MTs');
    expect(dims.length).toBeGreaterThanOrEqual(2);
    expect(dims.length).toBeLessThanOrEqual(4);
  });

  it('Gate 8: Integrasi Contoh LKPD menggunakan kembali buildSmartLKPD & sinkron dengan draf LKPD Studio', () => {
    const profile = makeProfile({ jenjang: 'SMA/MA', kelasUtama: '10', mataPelajaranUtama: 'Biologi' });
    const tp = makeTP({
      id: 'tp_bio_10',
      kode: '10.3',
      elemen: 'Ekosistem',
      materiPokok: 'Aliran Energi dan Jaring-Jaring Makanan',
      tujuanPembelajaran: 'Menganalisis ketergantungan antartingkat trofik pada ekosistem lokal.',
    });

    const modul = buildSmartModulAjar(tp, profile, { model: 'inquiry', konteksLokal: 'Sawah Organik Subang' });
    expect(modul.contohLKPD).toBeDefined();
    expect(modul.contohLKPD?.presetType).toBe('eksperimen');
    expect(modul.contohLKPD?.petunjukSiswa.length).toBeGreaterThanOrEqual(2);
    expect(modul.contohLKPD?.bahanAtauData.length).toBeGreaterThanOrEqual(1);
    expect(modul.contohLKPD?.langkahPengerjaan.length).toBeGreaterThanOrEqual(2);
    expect(modul.contohLKPD?.pertanyaanAtauRuangKerja.length).toBeGreaterThanOrEqual(2);
    expect(modul.contohLKPD?.hasilYangDiharapkan.length).toBeGreaterThan(10);
    expect(modul.contohLKPD?.kriteriaPenilaian.length).toBeGreaterThanOrEqual(2);

    // Simulasi guru menyimpan draf LKPD di LKPD Studio -> ModulAjarViewer menandai tersinkron
    const studioLKPD = buildSmartLKPD(tp, profile, 'eksperimen', 'Sawah Organik Subang');
    saveLKPDDraft(profile, tp, 'eksperimen', studioLKPD, 'user_edited');

    const html = renderToStaticMarkup(
      React.createElement(ModulAjarViewer, {
        modul,
        schoolProfile: profile,
        customTP: tp,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
        onOpenLKPDStudio: vi.fn(),
      })
    );
    expect(html).toContain('Buka &amp; Lanjutkan di LKPD Studio');
    expect(html).toContain('Tersinkron dengan draf aktif LKPD Studio');
  });

  it('Gate 9: Validator context-aware menolak slop generik, referensi SIBI fiktif, PjBL bersintaks PBL, namun meloloskan kalimat berobjek & bukti konkret', () => {
    // Uji specificity context-aware (Task F)
    expect(evaluateOperationalActivitySpecificity('Guru menjelaskan materi.', 'guru').isGenericSlop).toBe(true);
    expect(evaluateOperationalActivitySpecificity('Siswa berdiskusi.', 'siswa').isGenericSlop).toBe(true);
    expect(evaluateOperationalActivitySpecificity('Guru menjelaskan materi pelajaran dan memberikan tugas kepada siswa.', 'guru').isGenericSlop).toBe(true);
    expect(
      evaluateOperationalActivitySpecificity(
        'Guru menjelaskan materi perubahan wujud air dengan menampilkan dua gambar es dan air mendidih, lalu meminta siswa mencatat perbedaan kondisi pada tabel pengamatan.',
        'guru'
      ).isGenericSlop
    ).toBe(false);
    expect(
      evaluateOperationalActivitySpecificity(
        'Siswa berdiskusi mengisi tabel perbandingan perubahan wujud serta menjelaskan hasil pengamatannya berdasarkan bukti.',
        'siswa'
      ).isGenericSlop
    ).toBe(false);

    // Uji deteksi referensi SIBI fiktif
    expect(
      detectFabricatedBookReference([
        'Kemendikbud. 2024. IPA SMP Kelas VIII. ISBN 978-602-244-999-1, halaman 145.',
        'https://buku.kemdikbud.go.id/katalog/ipa-palsu-123',
      ]).length
    ).toBeGreaterThanOrEqual(2);

    // Uji deteksi validator pada modul AI cacat: PjBL tapi berisi sintaks PBL + aktivitas slop + forced 8 profil + SIBI fiktif
    const profile = makeProfile();
    const tp = makeTP();
    const corruptedModul = buildSmartModulAjar(tp, profile, { model: 'pbl' });
    corruptedModul.draftSource = 'ai_generated';
    corruptedModul.modelType = 'pjbl';
    corruptedModul.sintaksModelId = 'pjbl';
    corruptedModul.kegiatanPembelajaran[0].tahapTerstruktur![1].aktivitasGuru = 'Guru menjelaskan materi.';
    corruptedModul.kegiatanPembelajaran[0].tahapTerstruktur![1].aktivitasSiswa = 'Siswa berdiskusi.';
    corruptedModul.profilPelajarPancasila = ['1', '2', '3', '4', '5', '6', '7', '8'];
    corruptedModul.daftarPustaka = ['Kemendikdasmen. Matematika Kelas 8. ISBN 978-602-111-222-3 halaman 88.'];

    const res = validateModulAjarDokumen(corruptedModul, tp, profile, {
      sourceMode: 'ai',
      expectedModel: 'pjbl',
    });
    expect(res.status).toBe('gagal_validasi');
    expect(res.relevanceAndAntiSlopIssues.some((i) => i.includes('Project-Based Learning (PjBL)'))).toBe(true);
    expect(res.relevanceAndAntiSlopIssues.some((i) => i.includes('"Guru menjelaskan materi"'))).toBe(true);
    expect(res.relevanceAndAntiSlopIssues.some((i) => i.includes('"Siswa berdiskusi"'))).toBe(true);
    expect(res.relevanceAndAntiSlopIssues.some((i) => i.includes('ISBN'))).toBe(true);
    expect(res.semanticReviewWarnings.length).toBeGreaterThan(0);
  });

  it('Gate 10 & 11: Repair loop maksimal 1x, kuota tidak dipotong 2x saat repair berhasil, dan refund utuh saat gagal atau ditolak', async () => {
    const profile = makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' });
    const tp = makeTP({ alokasiJP: 3 });

    // Aktifkan lisensi uji dengan kuota terukur (50 kredit)
    licenseManager.activateLicense('ASM-GM26-1TAT-1QBM-133R', { initialCredits: 10, maxCredits: 50 });
    const startQuota = licenseManager.getUserQuota().remainingCredits;

    const validAI = makeValidStructuredAIPayload(tp, 'Discovery Learning');
    const invalidSlopAI = structuredClone(validAI);
    invalidSlopAI.kegiatanPembelajaran[0].tahapTerstruktur[1].aktivitasGuru = 'Guru menjelaskan materi.';
    invalidSlopAI.kegiatanPembelajaran[0].tahapTerstruktur[1].aktivitasSiswa = 'Siswa berdiskusi.';

    // SKENARIO A: Attempt 1 gagal (slop) -> Attempt 2 (repair 1x) lolos -> usedFallback false, net -1 kredit (bukan -2!)
    const callSpy = vi
      .spyOn(geminiClient, 'callGeminiStructuredJSON')
      .mockResolvedValueOnce(invalidSlopAI)
      .mockResolvedValueOnce(validAI);
    const deductSpy = vi.spyOn(licenseManager, 'deductQuota');
    const refundSpy = vi.spyOn(licenseManager, 'refundQuota');

    const resRepairPass = await generateContextualModulAjarWithAI(tp, profile, 'discovery', 'Koperasi Sekolah');
    expect(resRepairPass.usedFallback).toBe(false);
    expect(resRepairPass.repairAttempted).toBe(true);
    expect(resRepairPass.modul.draftSource).toBe('ai_generated');
    expect(resRepairPass.modul.catatanValidasi?.status).toBe('valid_ai');
    expect(resRepairPass.modul.kegiatanPembelajaran[0].alokasiMenit).toBe(120);
    expect(callSpy).toHaveBeenCalledTimes(2);
    expect(deductSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy).not.toHaveBeenCalled();
    expect(licenseManager.getUserQuota().remainingCredits).toBe(startQuota - 1);

    // SKENARIO B: Attempt 1 & Attempt 2 sama-sama gagal validasi -> berhenti di maks 1x repair, refund kuota, label fallback JUJUR Template/Draf Awal
    callSpy.mockReset();
    deductSpy.mockClear();
    refundSpy.mockClear();
    callSpy.mockResolvedValueOnce(invalidSlopAI).mockResolvedValueOnce(invalidSlopAI);

    const quotaBeforeB = licenseManager.getUserQuota().remainingCredits;
    const resBothFail = await generateContextualModulAjarWithAI(tp, profile, 'discovery', 'Koperasi Sekolah');
    expect(resBothFail.usedFallback).toBe(true);
    expect(resBothFail.aiFailed).toBe(true);
    expect(resBothFail.repairAttempted).toBe(true);
    expect(resBothFail.modul.draftSource).toBe('template');
    expect(resBothFail.modul.catatanValidasi?.status).toBe('template_awal');
    expect(callSpy).toHaveBeenCalledTimes(2); // Tidak boleh > 2
    expect(deductSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(licenseManager.getUserQuota().remainingCredits).toBe(quotaBeforeB); // Kuota utuh kembali

    // SKENARIO C: Provider gagal jaringan -> tidak memanggil repair, kuota di-refund penuh
    callSpy.mockReset();
    deductSpy.mockClear();
    refundSpy.mockClear();
    callSpy.mockRejectedValueOnce(new Error('Gemini timeout 504'));

    const resNetworkErr = await generateContextualModulAjarWithAI(tp, profile, 'pbl');
    expect(resNetworkErr.usedFallback).toBe(true);
    expect(resNetworkErr.repairAttempted).toBe(false);
    expect(resNetworkErr.modul.draftSource).toBe('template');
    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(licenseManager.getUserQuota().remainingCredits).toBe(quotaBeforeB);

    // SKENARIO D: Kuota habis / tidak berlisensi -> 0 panggilan AI, 0 refund, fallback jujur
    callSpy.mockReset();
    refundSpy.mockClear();
    vi.spyOn(licenseManager, 'deductQuota').mockReturnValueOnce({
      success: false,
      quota: { ...licenseManager.getUserQuota(), remainingCredits: 0 },
      message: 'Kuota kredit AI habis.',
    });
    const resNoQuota = await generateContextualModulAjarWithAI(tp, profile, 'pbl');
    expect(resNoQuota.usedFallback).toBe(true);
    expect(resNoQuota.quotaError).toBe(true);
    expect(callSpy).not.toHaveBeenCalled();
    expect(refundSpy).not.toHaveBeenCalled();
  });

  it('Gate 12 & 13: Kegagalan AI menjaga draf guru yang ada dan label fallback tertulis Template / Draf Awal (bukan AI Generated)', async () => {
    const profile = makeProfile();
    const tp = makeTP();
    const teacherDraft = buildSmartModulAjar(tp, profile, { model: 'pbl' });
    teacherDraft.draftSource = 'user_edited';
    teacherDraft.pemahamanBermakna = 'Suntingan manual guru tidak boleh tertimpa saat AI gagal.';
    saveModulAjarDraft(profile, tp, 'pbl', teacherDraft, 'user_edited');

    // Simulasi kegagalan layanan AI: service mengembalikan usedFallback=true & template awal
    vi.spyOn(geminiClient, 'callGeminiStructuredJSON').mockRejectedValueOnce(new Error('Server sibuk'));
    licenseManager.activateLicense('ASM-GM26-1TAT-1QBM-133R');
    const res = await modulAiModule.generateContextualModulAjarWithAI(tp, profile, 'pbl');
    expect(res.usedFallback).toBe(true);
    expect(res.modul.draftSource).toBe('template');

    // Draf guru di localStorage harus tetap utuh
    const loadedDraft = loadLatestModulAjarDraft(profile, tp);
    expect(loadedDraft?.doc.draftSource).toBe('user_edited');
    expect(loadedDraft?.doc.pemahamanBermakna).toBe('Suntingan manual guru tidak boleh tertimpa saat AI gagal.');

    // Render fallback template menunjukkan badge jujur "Template / Draf Awal" bukan "AI Generated"
    const htmlTemplate = renderToStaticMarkup(
      React.createElement(ModulAjarViewer, {
        modul: res.modul,
        schoolProfile: profile,
        customTP: tp,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
      })
    );
    expect(htmlTemplate).toContain('Template / Draf Awal');
    expect(htmlTemplate).not.toContain('✨ AI Generated');

    // Prompt selalu memuat instruksi bebas rujukan SIBI palsu
    const prompt = buildModulAjarGeminiPrompt(tp, profile, 'pbl');
    expect(prompt).toContain('DILARANG mengarang ISBN');
  });

  it('Gate 15: Kompatibilitas draf legacy, ekspor DOCX baru & lama (KKTP dinamis), serta Cloud Sync 3-way merge', async () => {
    const profile = makeProfile({ kktpMinTuntas: 75 });
    const tp = makeTP();

    // 1. Draf terstruktur baru -> ekspor DOCX berisi 7 bagian materi, 3 asesmen, 3 jalur diferensiasi, LKPD, & KKTP dinamis 75
    const richDoc = buildSmartModulAjar(tp, profile, { model: 'pjbl' });
    await exportModulAjarToDocx(richDoc, profile);
    const calls = vi.mocked(saveAs).mock.calls;
    const blobNew = calls[calls.length - 1]?.[0] as Blob;
    const xmlNew = await (await JSZip.loadAsync(await blobNew.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(xmlNew).toContain('Diferensiasi Operasional 3 Jalur Kesiapan');
    expect(xmlNew).toContain('Contoh LKPD Terintegrasi');
    expect(xmlNew).toContain('Cakap (75–87)');
    expect(xmlNew).toContain('Mahir (88–100)');
    expect(xmlNew).not.toContain('undefined');
    expect(xmlNew).not.toContain('[object Object]');

    // 2. Draf legacy tanpa asesmenDetail / diferensiasiOperasional / contohLKPD tetap aman diekspor
    const legacyDoc: ModulAjarDokumen = {
      id: 'mod-legacy-12-2',
      tpId: tp.id,
      modelType: 'diferensiasi',
      draftSource: 'user_edited',
      judul: 'Modul Lama',
      mataPelajaran: 'Matematika',
      jenjangFase: 'Fase D (Kelas 7-9 SMP)',
      kelas: '8',
      rombel: 'VIII-A',
      semester: '1 (Ganjil)',
      tahunAjaran: '2026/2027',
      alokasiWaktu: '3 JP (120 Menit)',
      jumlahPertemuan: 1,
      namaSekolah: profile.namaSekolah,
      namaGuru: profile.namaGuru,
      nipGuru: profile.nipGuru,
      namaKepalaSekolah: profile.namaKepalaSekolah,
      nipKepalaSekolah: profile.nipKepalaSekolah,
      kotaSekolah: profile.kotaSekolah,
      createdAt: '10 November 2026',
      tpKode: tp.kode,
      materiPokok: tp.materiPokok,
      elemen: tp.elemen,
      tujuanPembelajaran: tp.tujuanPembelajaran,
      kompetensiAwal: ['Prasyarat lama'],
      profilPelajarPancasila: ['Bernalar Kritis'],
      saranaPrasarana: ['Papan tulis'],
      targetPesertaDidik: 'Reguler',
      modelPembelajaran: 'Pembelajaran Berdiferensiasi',
      pemahamanBermakna: 'Makna lama.',
      pertanyaanPemantik: ['Pemantik lama?'],
      kegiatanPembelajaran: [
        {
          pertemuan: 1,
          alokasiMenit: 120,
          pendahuluan: ['Pembuka legacy'],
          inti: ['Inti legacy'],
          penutup: ['Penutup legacy'],
        },
      ],
      asesmen: { diagnostik: 'Diagnostik lama', formatif: 'Formatif lama', sumatif: 'Sumatif lama' },
      rubrikPenilaianSingkat: [
        { kriteria: 'Kriteria', baruBerkembang: 'BB', layak: 'L', cakap: 'C', mahir: 'M' },
      ],
      pengayaanDanRemedial: { pengayaan: 'Pengayaan lama', remedial: 'Remedial lama' },
      refleksiGuru: ['Refleksi guru lama'],
      refleksiSiswa: ['Refleksi siswa lama'],
      glosarium: [{ istilah: 'SPLDV', definisi: 'Definisi lama' }],
      daftarPustaka: ['Daftar pustaka lama'],
    };

    const profileNoKKTP = makeProfile({ kktpMinTuntas: undefined });
    await exportModulAjarToDocx(legacyDoc, profileNoKKTP);
    const blobLegacy = vi.mocked(saveAs).mock.calls[vi.mocked(saveAs).mock.calls.length - 1]?.[0] as Blob;
    const xmlLegacy = await (await JSZip.loadAsync(await blobLegacy.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(xmlLegacy).toContain('Inti legacy');
    expect(xmlLegacy).not.toContain('71-85');
    expect(xmlLegacy).not.toContain('undefined');

    // 3. Cloud Sync 3-way merge mempertahankan seluruh field Task 12.2 baru
    const syncRes = analyzeWorkspaceConflict({}, { 'asesmerdeka_modul_v2__k1': richDoc }, {});
    expect(syncRes.conflicts).toHaveLength(0);
    const merged = syncRes.mergedEntries['asesmerdeka_modul_v2__k1'] as ModulAjarDokumen;
    expect(merged.asesmenDetail?.akhir.butirTugas.length).toBeGreaterThanOrEqual(2);
    expect(merged.diferensiasiOperasional?.kesiapanMahir.aktivitasKonkret.length).toBeGreaterThan(0);
    expect(merged.contohLKPD?.langkahPengerjaan.length).toBeGreaterThanOrEqual(2);
  });
});
