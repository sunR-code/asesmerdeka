import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { jenjangToDefaultFase } from './schoolProfileStorage';
import type { LKPDDokumen, LKPDPresetType } from '../types/perangkatAjar';
import {
  resolveSubjectFamily,
  resolveJenjangPedagogicalProfile,
  resolveSubjectApproachRule,
  cleanTopicHeading,
  adaptPresetExtras,
} from './lkpdSubjectBlueprints';
import type { CuratedLKPDContent } from './lkpdSubjectBlueprints';
export type { CuratedLKPDContent };
import {
  solveAndVerifySPLDV,
  verifyRightTriangleSides,
  verifyDescriptiveStats,
} from './lkpdMathVerifier';
import { buildExtendedSubjectFixture } from './lkpdSubjectFixturesExtra';

export function buildSPLDVFixture(
  tp: CustomTPItem,
  profile: SchoolProfile,
  preset: LKPDPresetType,
  konteks?: string
): CuratedLKPDContent {
  // Verifikasi deterministik sistem persamaan fixture 2x + 3y = 18000, 3x + 2y = 17000
  const check = solveAndVerifySPLDV(2, 3, 18000, 3, 2, 17000, { requireNonNegative: true });
  const customCtxNote = konteks?.trim()
    ? ` (Konteks kelas: ${konteks.trim()})`
    : '';
  const stimulusText =
    'Di koperasi sekolah, harga satuan barang tetap untuk kedua transaksi. Dua buku tulis dan tiga pensil berharga Rp18.000. Tiga buku tulis dan dua pensil berharga Rp17.000. Tidak ada diskon atau biaya tambahan. Tentukan harga satu buku tulis dan satu pensil.';

  const extras = adaptPresetExtras(preset, tp.materiPokok, stimulusText, {
    tools: [
      'Lembar transaksi koperasi sekolah (data pada stimulus)',
      'Kertas berpetak atau papan kerja tabel kombinasi harga',
      'Alat tulis dan penggaris untuk menggambar titik potong (opsional metode grafik)',
    ],
    hipotesis:
      'Jika harga 1 buku tulis (x) dan harga 1 pensil (y) tetap pada kedua transaksi, maka hanya ada satu pasangan bilangan (x, y) yang tepat memenuhi 2x + 3y = 18.000 sekaligus 3x + 2y = 17.000.',
    safety: ['Kegiatan pengamatan data dan aljabar kertas kerja — tidak menggunakan bahan berbahaya.'],
    table: {
      kolom: ['Percobaan Pasangan (x, y)', 'Nilai 2x + 3y (Target Rp18.000)', 'Nilai 3x + 2y (Target Rp17.000)', 'Status Solusi'],
      baris: [
        ['Uji (Rp6.000, Rp2.000)', '2(6.000)+3(2.000) = Rp18.000', '3(6.000)+2(2.000) = Rp22.000', 'Tidak memenuhi Persamaan 2'],
        ['Uji (Rp3.000, Rp4.000)', '2(3.000)+3(4.000) = Rp18.000', '3(3.000)+2(4.000) = Rp17.000', 'Memenuhi kedua persamaan'],
      ],
    },
  });

  if (preset === 'diferensiasi' && extras.diferensiasiData) {
    extras.diferensiasiData = {
      tingkatDasar: {
        instruksi: 'Menentukan variabel, satuan, dan menguji pasangan harga sederhana pada transaksi koperasi.',
        tugas: [
          'Lengkapi tabel transaksi: isi jumlah buku tulis, pensil, dan total harga masing-masing dalam rupiah.',
          'Tuliskan arti x = harga 1 buku tulis (rupiah) dan y = harga 1 pensil (rupiah), lalu susun 2x + 3y = 18.000 dan 3x + 2y = 17.000.',
          'Uji apakah pasangan x = 3.000 dan y = 4.000 cocok untuk kedua transaksi dengan menghitung substitusi lengkap.',
        ],
      },
      tingkatMenengah: {
        instruksi: 'Menyelesaikan model SPLDV secara mandiri dan memverifikasi hasil terhadap konteks.',
        tugas: [
          'Susun kedua persamaan linear dari transaksi koperasi sekolah secara lengkap.',
          'Selesaikan menggunakan metode eliminasi atau substitusi sambil menuliskan setiap langkah perhitungan.',
          'Substitusikan hasil (x, y) ke kedua persamaan dan tuliskan harga 1 buku tulis serta 1 pensil dalam kalimat lengkap.',
        ],
      },
      tingkatMahir: {
        instruksi: 'Mengevaluasi kesalahan pemodelan tunggal dan membandingkan alternatif penyelesaian.',
        tugas: [
          'Periksa klaim seorang siswa yang menyimpulkan buku Rp6.000 dan pensil Rp2.000 dari transaksi pertama saja.',
          'Buktikan dengan dua persamaan mengapa satu persamaan linear dua variabel memiliki tak hingga pasangan solusi.',
          'Bandingkan keefektifan metode eliminasi dengan substitusi pada sistem koefisien simetris 2x+3y=18.000 dan 3x+2y=17.000.',
        ],
      },
    };
  }

  return {
    isCuratedFixture: true,
    subJudulTopik: `Menentukan Harga Buku dan Pensil${customCtxNote}`,
    pendekatanKegiatan:
      preset === 'eksperimen'
        ? 'Penyelidikan Pola & Uji Pasangan Solusi SPLDV'
        : preset === 'diferensiasi'
        ? 'Pemodelan & Penyelesaian SPLDV Berjenjang'
        : preset === 'proyek'
        ? 'Simulasi Daftar Harga Koperasi Berbasis SPLDV'
        : 'Pemodelan Masalah & Penyelesaian SPLDV',
    modeKerja: 'Berpasangan',
    alokasiWaktu: `2 x 40 Menit (${profile.jenjang} Kelas ${profile.kelasUtama})`,
    targetBelajarSiswa: [
      'Menentukan dua variabel beserta arti dan satuannya dari dua informasi transaksi.',
      'Menyusun model dua persamaan linear dua variabel yang tepat.',
      'Menyelesaikan SPLDV dengan langkah perhitungan runtut dan memeriksa kebenaran hasilnya.',
    ],
    prasyaratMateri: [
      'Menyelesaikan persamaan linear satu variabel (PLSV).',
      'Melakukan operasi perkalian, penjumlahan, dan pengurangan bilangan bulat dalam rupiah.',
    ],
    petunjukPengerjaan: [
      'Kerjakan secara runtut mulai dari mencatat data transaksi hingga memeriksa kembali hasil akhir.',
      'Tuliskan satuan (rupiah) ketika mendefinisikan variabel x dan y.',
      'Tunjukkan seluruh langkah perhitungan pada ruang kerja yang tersedia, tidak hanya menuliskan angka akhir.',
    ],
    stimulusKasus: {
      judul: 'Menentukan Harga Buku dan Pensil',
      teks: stimulusText,
      pertanyaanAwal:
        'Besaran apa yang belum diketahui harganya, dan informasi apa saja yang menghubungkan keduanya?',
    },
    stimulusData: {
      jenisData: 'tabel',
      tabelData: {
        kolom: ['Transaksi', 'Jumlah Buku Tulis', 'Jumlah Pensil', 'Total Harga'],
        baris: [
          ['Transaksi 1', '2 buah', '3 buah', 'Rp18.000'],
          ['Transaksi 2', '3 buah', '2 buah', 'Rp17.000'],
        ],
      },
      catatanAsumsi:
        'Asumsi: harga satuan barang tetap untuk kedua transaksi; tidak ada diskon atau biaya tambahan.',
    },
    ...extras,
    langkahAktivitas: [
      {
        langkahKe: 1,
        judulLangkah: 'Mencatat informasi dari masing-masing transaksi',
        instruksi: 'Catat rincian barang dan total bayar pada Transaksi 1 dan Transaksi 2.',
        bantuanAtauTabel: [
          'Transaksi 1: ...... buku tulis dan ...... pensil = Rp ......................',
          'Transaksi 2: ...... buku tulis dan ...... pensil = Rp ......................',
        ],
        ruangJawabanJenis: 'tabel',
        pemetaanSubTP: `${tp.kode}.A`,
      },
      {
        langkahKe: 2,
        judulLangkah: 'Menentukan x dan y beserta arti dan satuannya',
        instruksi: 'Nyatakan arti huruf variabel x dan y secara tepat lengkap dengan satuannya.',
        bantuanAtauTabel: [
          'Misalkan x = harga ........................................ (dalam ....................)',
          'Misalkan y = harga ........................................ (dalam ....................)',
        ],
        ruangJawabanJenis: 'uraian_singkat',
        pemetaanSubTP: `${tp.kode}.A`,
      },
      {
        langkahKe: 3,
        judulLangkah: 'Menyusun persamaan untuk kedua transaksi',
        instruksi: 'Ubah masing-masing kalimat transaksi menjadi persamaan linear dua variabel.',
        bantuanAtauTabel: [
          'Persamaan (1): ...... x + ...... y = ......................',
          'Persamaan (2): ...... x + ...... y = ......................',
        ],
        ruangJawabanJenis: 'perhitungan',
        pemetaanSubTP: `${tp.kode}.B`,
      },
      {
        langkahKe: 4,
        judulLangkah: 'Memilih metode dan menunjukkan langkah penyelesaian',
        instruksi:
          'Pilih metode penyelesaian yang sudah kamu pelajari (eliminasi atau substitusi) lalu tuliskan langkah perhitungannya sampai menemukan nilai x dan y.',
        ruangJawabanJenis: 'perhitungan',
        pemetaanSubTP: `${tp.kode}.C`,
      },
      {
        langkahKe: 5,
        judulLangkah: 'Mensubstitusikan hasil ke kedua persamaan',
        instruksi:
          'Masukkan nilai x dan y yang kamu peroleh ke Persamaan (1) dan Persamaan (2) untuk memeriksa apakah kedua sisi kiri sama dengan kanan.',
        ruangJawabanJenis: 'perhitungan',
        pemetaanSubTP: `${tp.kode}.D`,
      },
      {
        langkahKe: 6,
        judulLangkah: 'Menjelaskan harga barang dalam kalimat lengkap',
        instruksi:
          'Tuliskan kesimpulan akhir harga satu buku tulis dan satu pensil dalam kalimat lengkap.',
        ruangJawabanJenis: 'uraian_singkat',
        pemetaanSubTP: `${tp.kode}.D`,
      },
    ],
    pemeriksaanHasil: [
      'Cek 1: Apakah nilai x dan y bernilai positif dan masuk akal sebagai harga alat tulis?',
      'Cek 2: Apakah hasil substitusi ke 2x + 3y tepat bernilai Rp18.000?',
      'Cek 3: Apakah hasil substitusi ke 3x + 2y tepat bernilai Rp17.000?',
    ],
    pertanyaanAnalisis: [
      {
        id: 'q-spldv-1',
        nomor: 1,
        tingkatKognitif: 'Dasar',
        alasanTingkatKognitif:
          'Menuntut siswa memilih dan menghitung minimal dua kombinasi bilangan positif yang memenuhi satu persamaan 2x + 3y = 18.000.',
        pemetaanSubTP: `${tp.kode}.B`,
        ruangJawabanJenis: 'perhitungan',
        pertanyaan:
          'Jika tersedia hanya transaksi pertama (2 buku tulis dan 3 pensil berharga Rp18.000), tunjukkan dua pasangan harga positif yang memenuhi transaksi itu! Apa yang belum dapat dipastikan?',
        petunjukPengerjaan: 'Pilih sembarang nilai harga pensil atau buku yang membuat totalnya tepat Rp18.000.',
        alternatifJawabanValid:
          'Pasangan positif apa pun yang memenuhi 2x + 3y = 18.000 (misalnya x=3.000 & y=4.000; x=6.000 & y=2.000; atau x=1.500 & y=5.000).',
        panduanJawabanSingkat:
          'Contoh pasangan: (Rp6.000, Rp2.000) karena 2(6.000)+3(2.000)=18.000, dan (Rp3.000, Rp4.000) karena 2(3.000)+3(4.000)=18.000. Yang belum dapat dipastikan adalah pasangan harga tunggal yang benar.',
      },
      {
        id: 'q-spldv-2',
        nomor: 2,
        tingkatKognitif: 'Menengah',
        alasanTingkatKognitif:
          'Menuntut verifikasi numerik klaim siswa terhadap DUA syarat persamaan sekaligus untuk menentukan validitas kesimpulan.',
        pemetaanSubTP: `${tp.kode}.D`,
        ruangJawabanJenis: 'perhitungan',
        pertanyaan:
          'Seorang siswa hanya memakai transaksi pertama dan menyimpulkan buku Rp6.000 serta pensil Rp2.000. Periksa kesimpulan tersebut menggunakan kedua transaksi!',
        petunjukPengerjaan: 'Hitung nilai 2x + 3y dan 3x + 2y untuk x = 6.000 dan y = 2.000.',
        alternatifJawabanValid:
          'Siswa dapat langsung menguji ke transaksi kedua saja setelah mengonfirmasi transaksi pertama, asalkan menunjukkan 3(6.000) + 2(2.000) = 22.000 ≠ 17.000.',
        panduanJawabanSingkat:
          'Transaksi 1: 2(6.000)+3(2.000) = 18.000 (cocok). Transaksi 2: 3(6.000)+2(2.000) = 22.000 ≠ 17.000 (tidak cocok, selisih Rp5.000). Jadi kesimpulan siswa keliru.',
      },
      {
        id: 'q-spldv-3',
        nomor: 3,
        tingkatKognitif: 'Mahir',
        alasanTingkatKognitif:
          'Menuntut penalaran konseptual umum tentang syarat kecukupan sistem persamaan dua variabel, bukan sekadar hitung rutin.',
        pemetaanSubTP: `${tp.kode}.D`,
        ruangJawabanJenis: 'uraian_panjang',
        pertanyaan: 'Jelaskan mengapa memenuhi satu persamaan saja belum cukup untuk menentukan penyelesaian SPLDV!',
        petunjukPengerjaan: 'Kaitkan banyaknya pasangan solusi satu persamaan dengan irisan dua syarat.',
        panduanJawabanSingkat:
          'Satu persamaan linear dua variabel memiliki tak hingga pasangan (x, y) yang memenuhi. Solusi SPLDV menuntut pasangan nilai yang secara serentak memenuhi kedua persamaan (titik potong kedua syarat).',
      },
    ],
    dukunganTambahan:
      'Jika kesulitan menyamakan koefisien, kalikan Persamaan (1) dengan 3 dan Persamaan (2) dengan 2 sehingga suku x sama-sama menjadi 6x.',
    pengayaan: {
      instruksi: 'Tambahan berbasis TP untuk siswa yang selesai lebih awal:',
      tugas: [
        'Hitung total biaya jika siswa membeli 5 buku tulis dan 4 pensil menggunakan harga satuan x dan y yang sudah diverifikasi.',
        'Buat satu transaksi ke-3 yang tetap konsisten dengan x = Rp3.000 dan y = Rp4.000.',
      ],
    },
    kesimpulanRefleksi: [
      'Kesimpulan: Harga 1 buku tulis adalah Rp................ dan harga 1 pensil adalah Rp................',
      'Pada tahap mana kamu mengalami kesulitan: menentukan variabel, menyusun persamaan, menyelesaikan, atau memeriksa hasil? Berikan satu contoh.',
    ],
    panduanGuru: {
      kunciDanContohJawaban: [
        {
          nomor: 1,
          jawabanInti: `Model: 2x + 3y = 18.000 dan 3x + 2y = 17.000. Solusi: x = Rp3.000 (1 buku tulis), y = Rp4.000 (1 pensil). (${check.diagnostic})`,
          langkahPenyelesaian: [
            'Definisi variabel: x = harga 1 buku tulis (rupiah), y = harga 1 pensil (rupiah).',
            'Susun sistem persamaan: (1) 2x + 3y = 18.000 ; (2) 3x + 2y = 17.000.',
            'Eliminasi x: kalikan (1) dengan 3 menjadi 6x + 9y = 54.000; kalikan (2) dengan 2 menjadi 6x + 4y = 34.000.',
            'Kurangkan kedua persamaan: 5y = 20.000 -> y = 4.000.',
            'Substitusi y = 4.000 ke (1): 2x + 3(4.000) = 18.000 -> 2x + 12.000 = 18.000 -> 2x = 6.000 -> x = 3.000.',
            'Pemeriksaan: 2(3.000) + 3(4.000) = 6.000 + 12.000 = 18.000 (Benar); 3(3.000) + 2(4.000) = 9.000 + 8.000 = 17.000 (Benar).',
          ],
          alternatifValid:
            'Metode substitusi dari y = (17.000 - 3x)/2 atau menjumlahkan & mengurangkan kedua persamaan simetris (5x + 5y = 35.000 -> x + y = 7.000; dan -x + y = 1.000 -> 2y = 8.000 -> y = 4.000, x = 3.000).',
        },
        {
          nomor: 2,
          jawabanInti: 'Kesimpulan siswa (x=Rp6.000, y=Rp2.000) SALAH karena 3(6.000) + 2(2.000) = Rp22.000 ≠ Rp17.000.',
          langkahPenyelesaian: [
            'Uji transaksi 1: 2(6.000) + 3(2.000) = 12.000 + 6.000 = 18.000 (memenuhi).',
            'Uji transaksi 2: 3(6.000) + 2(2.000) = 18.000 + 4.000 = 22.000 (tidak sama dengan 17.000).',
          ],
          alternatifValid: 'Menunjukkan perbedaan total belanja sebesar Rp5.000 pada transaksi 2.',
        },
        {
          nomor: 3,
          jawabanInti:
            'Satu persamaan memiliki banyak solusi yang mungkin; SPLDV mensyaratkan satu pasangan yang memenuhi kedua persamaan bersamaan.',
          langkahPenyelesaian: [
            'Berikan dua pasangan berbeda untuk 2x + 3y = 18.000, misalnya (3.000, 4.000) dan (6.000, 2.000).',
            'Tegaskan perlunya persamaan kedua sebagai syarat tambahan agar nilainya tunggal.',
          ],
        },
      ],
      miskonsepsiUmum: [
        {
          miskonsepsi: 'Mendefinisikan x = buku tulis dan y = pensil tanpa kata "harga 1 buah (rupiah)".',
          caraMenangani: 'Minta siswa menyebutkan nilai perkalian 2x. Jika x berarti "buku", "2 buku" tidak bisa dijumlahkan menjadi rupiah.',
        },
        {
          miskonsepsi: 'Berhenti setelah satu transaksi cocok atau keliru mengalikan konstanta saat eliminasi.',
          caraMenangani: 'Biasakan langkah wajib ke-5 (substitusi balik ke KEDUA persamaan) sebelum menulis kalimat simpulan.',
        },
        {
          miskonsepsi: 'Tertukar antara harga buku (x = 3.000) dan pensil (y = 4.000) saat menuliskan jawaban akhir.',
          caraMenangani: 'Arahkan siswa melihat kembali catatan pemisalan di Langkah 2 sebelum menulis Langkah 6.',
        },
      ],
      pemetaanTP: [
        { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Menentukan variabel & satuan', aktivitasTerkait: 'Langkah 1 & 2' },
        { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Menyusun dua persamaan SPLDV', aktivitasTerkait: 'Langkah 3 & Pertanyaan 1' },
        { kodeSubTP: `${tp.kode}.C`, kompetensiTarget: 'Menyelesaikan SPLDV dengan langkah jelas', aktivitasTerkait: 'Langkah 4' },
        { kodeSubTP: `${tp.kode}.D`, kompetensiTarget: 'Memeriksa solusi pada kedua persamaan & tafsir', aktivitasTerkait: 'Langkah 5–6 & Pertanyaan 2–3' },
      ],
      rubrikPenilaian: [
        {
          aspek: 'Ketepatan definisi variabel & satuan',
          perluBimbingan: 'Tidak menulis variabel atau hanya menulis "x = buku" tanpa harga/satuan.',
          berkembang: 'Menulis variabel sebagai harga barang tetapi belum menyebut satuan/kuantitas "1 buah".',
          cakap: 'Mendefinisikan x dan y sebagai harga 1 unit masing-masing barang secara konsisten.',
          mahir: 'Mendefinisikan variabel, unit satuan rupiah, dan menggunakannya konsisten sampai kesimpulan akhir.',
        },
        {
          aspek: 'Ketepatan model dua persamaan',
          perluBimbingan: 'Hanya menyusun satu persamaan atau koefisien tertukar antartransaksi.',
          berkembang: 'Satu persamaan tepat, persamaan lainnya salah tanda/koefisien.',
          cakap: 'Kedua persamaan 2x+3y=18.000 dan 3x+2y=17.000 tersusun tepat.',
          mahir: 'Kedua persamaan tepat disertai penjelasan hubungan transaksi ke koefisien dan konstanta.',
        },
        {
          aspek: 'Prosedur penyelesaian',
          perluBimbingan: 'Langkah perhitungan terputus atau terdapat kesalahan aritmetika dasar.',
          berkembang: 'Menunjukkan proses eliminasi/substitusi tetapi ada 1 kesalahan hitung sebelum nilai akhir.',
          cakap: 'Menemukan x = 3.000 dan y = 4.000 lewat langkah aljabar yang benar.',
          mahir: 'Langkah runtut bebas salah hitung serta mampu menjelaskan alternatif metode.',
        },
        {
          aspek: 'Pemeriksaan solusi & kritik klaim keliru',
          perluBimbingan: 'Tidak memeriksa kembali jawaban ke kedua persamaan.',
          berkembang: 'Hanya menguji jawaban ke satu persamaan.',
          cakap: 'Menguji x=3.000, y=4.000 ke kedua persamaan dan mengidentifikasi kesalahan klaim siswa.',
          mahir: 'Membuktikan alasan ketidakcukupan satu persamaan dengan dua pasangan contoh nyata.',
        },
        {
          aspek: 'Interpretasi konteks',
          perluBimbingan: 'Hanya menulis x=3.000, y=4.000 tanpa menjelaskan barangnya.',
          berkembang: 'Menyebutkan harga tetapi tertukar antara buku tulis dan pensil.',
          cakap: 'Menyimpulkan harga 1 buku tulis Rp3.000 dan 1 pensil Rp4.000 dalam kalimat lengkap.',
          mahir: 'Kesimpulan lengkap dan konsisten ketika dipakai menjawab pertanyaan variasi atau pengayaan.',
        },
      ],
      dukunganTambahanGuru:
        'Gunakan model visual dua baris belanja (2 kotak buku + 3 batang pensil = Rp18.000) untuk siswa yang masih kesulitan memahami penyamaan koefisien.',
      pengayaanGuru:
        'Ajak siswa memeriksa apakah penambahan transaksi ketiga misalnya 4x + 6y = 36.000 tetap tidak membuat solusi tunggal terhadap transaksi 1 (karena kelipatan persamaan 1).',
      catatanKurikulum: tp.referensiCP?.catatan || 'Disusun sebagai rancangan pembelajaran operasional; tinjau kesesuaiannya dengan capaian kelas Anda.',
    },
  };
}

function buildMathOtherCuratedFixture(
  tp: CustomTPItem,
  profile: SchoolProfile,
  preset: LKPDPresetType,
  konteks?: string
): CuratedLKPDContent | null {
  const lower = tp.materiPokok.toLowerCase();
  const family = resolveSubjectFamily(profile.mataPelajaranUtama);
  const grade = resolveJenjangPedagogicalProfile(profile.jenjang, profile.kelasUtama);
  if (family !== 'matematika') return null;

  if (lower.includes('spldv') || lower.includes('persamaan linear dua variabel')) {
    return buildSPLDVFixture(tp, profile, preset, konteks);
  }

  // SD Kelas 1-2 Penjumlahan & Pengurangan benda konkret <= 20
  if (grade.gradeBand === 'sd_awal') {
    const stimulusText =
      'Di pojok baca kelas 1, di keranjang biru ada 8 buku cerita. Ibu guru menaruh 5 buku cerita lagi ke keranjang biru. Lalu 4 buku cerita dipinjam oleh temanmu untuk dibaca. Hitung berapa buku cerita di keranjang biru sekarang!';
    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: 'Penghitungan Konkret dengan Benda Sekitar',
      modeKerja: 'Berpasangan',
      alokasiWaktu: '2 x 35 Menit',
      targetBelajarSiswa: [
        'Menghitung banyak benda ketika digabung dan ketika diambil.',
        'Menuliskan kalimat matematika tambah (+) dan kurang (−) dengan benar.',
      ],
      prasyaratMateri: ['Membilang urut angka 1 sampai 20'],
      petunjukPengerjaan: [
        'Baca cerita pendek bersama pasanganmu.',
        'Gambarlah lingkaran atau lidi kecil untuk membantu menghitung.',
      ],
      stimulusKasus: {
        judul: 'Menghitung Buku di Pojok Baca Kelas',
        teks: stimulusText,
        pertanyaanAwal: 'Buku cerita di keranjang bertambah dulu atau berkurang dulu?',
      },
      stimulusData: {
        jenisData: 'daftar_fakta',
        poinKunci: ['Buku awal: 8 buah', 'Ditambah ibu guru: 5 buah', 'Dipinjam teman: 4 buah'],
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Catat banyak buku mula-mula dan yang ditambahkan',
          instruksi: 'Hitung gabungan 8 buku ditambah 5 buku.',
          bantuanAtauTabel: ['8 + 5 = ....... buku cerita'],
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Kurangkan dengan buku yang dipinjam',
          instruksi: 'Kurangkan hasil tadi dengan 4 buku yang dipinjam teman.',
          bantuanAtauTabel: ['....... − 4 = ....... buku cerita tersisa'],
          ruangJawabanJenis: 'perhitungan',
        },
      ],
      pemeriksaanHasil: ['Hitung ulang mundur: 9 + 4 harus kembali menjadi 13, dan 13 − 5 = 8.'],
      pertanyaanAnalisis: [
        {
          id: 'q-sd1-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Membaca bilangan langsung dari kalimat cerita sederhana.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Berapa banyak seluruh buku cerita sesudah ibu guru menaruh 5 buku lagi?',
          panduanJawabanSingkat: '8 + 5 = 13 buku cerita.',
        },
        {
          id: 'q-sd1-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Mengubah urutan tambah lalu kurang dalam dua tahap hitungan konkret.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Jika yang dipinjam teman bukan 4 buku melainkan 6 buku, berapa sisa buku sekarang?',
          panduanJawabanSingkat: '13 − 6 = 7 buku cerita.',
        },
      ],
      dukunganTambahan: 'Gunakan 13 batang pensil/kancing di meja, lalu sisihkan 4 buah untuk melihat sisanya secara langsung.',
      pengayaan: {
        instruksi: 'Untuk siswa yang sudah cepat dan tepat:',
        tugas: ['Jika besok dikembalikan 3 buku ke keranjang yang berisi 9 buku, berapa jumlahnya sekarang?'],
      },
      kesimpulanRefleksi: [
        'Sisa buku cerita di keranjang biru adalah ...... buah.',
        'Bagian mana yang lebih mudah bagimu hari ini: menjumlahkan atau mengurangkan?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: '13 buku cerita.', langkahPenyelesaian: ['8 + 5 = 13'] },
          { nomor: 2, jawabanInti: '7 buku cerita.', langkahPenyelesaian: ['Dari 13 buku dikurangi 6 buku: 13 − 6 = 7'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: 'Langsung menjumlah semua angka (8 + 5 + 4 = 17) tanpa memperhatikan kata "dipinjam".',
            caraMenangani: 'Minta siswa memeragakan "menaruh ke keranjang" vs "mengambil keluar dari keranjang".',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Penjumlahan <= 20', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Pengurangan konteks cerita', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Ketepatan operasi tambah dan kurang',
            perluBimbingan: 'Tertukar tanda + dan − pada lebih dari satu tahap.',
            berkembang: 'Benar pada penjumlahan awal, keliru saat mengurangkan.',
            cakap: 'Benar menentukan 13 lalu 9 dengan kalimat matematika.',
            mahir: 'Menjawab benar semua soal termasuk variasi peminjaman 6 buku dan mengecek mundur.',
          },
        ],
      },
    };
  }

  // Matematika SMP Pythagoras
  if (lower.includes('pythagoras')) {
    const isOk = verifyRightTriangleSides(3, 4, 5) && verifyRightTriangleSides(5, 12, 13);
    const stimulusText =
      'Sebuah tangga dengan panjang tepat 5 meter disandarkan miring ke dinding tembok kelas yang tegak lurus terhadap lantai datar. Jarak ujung bawah tangga ke dinding diukur di lantai sebesar 3 meter. Tentukan tinggi dinding yang dicapai ujung atas tangga tersebut! (Catatan: asumsikan lantai datar dan dinding membentuk sudut siku-siku 90°).';
    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: 'Pemodelan Geometri Segitiga Siku-siku & Verifikasi',
      modeKerja: 'Berpasangan',
      alokasiWaktu: '2 x 40 Menit',
      targetBelajarSiswa: [
        'Mengidentifikasi sisi miring (hipotenusa) dan dua sisi siku-siku pada sketsa tangga.',
        'Menghitung panjang salah satu sisi tegak menggunakan Teorema Pythagoras.',
      ],
      prasyaratMateri: ['Bilangan kuadrat 1–20 dan menentukan akar kuadrat sederhana'],
      petunjukPengerjaan: [
        'Buat sketsa segitiga siku-siku sederhana dan tandai letak sudut 90°.',
        'Tentukan sisi miring sebelum memilih operasi penjumlahan atau pengurangan kuadrat.',
      ],
      stimulusKasus: {
        judul: 'Mengukur Tinggi Sandaran Tangga pada Dinding Sekolah',
        teks: stimulusText,
        pertanyaanAwal: 'Sisi mana yang merupakan sisi miring (c): panjang tangga atau jarak kaki tangga ke dinding?',
      },
      stimulusData: {
        jenisData: 'daftar_fakta',
        poinKunci: ['Panjang tangga (sisi miring c) = 5 m', 'Jarak kaki tangga ke tembok (alas a) = 3 m', 'Sudut tembok terhadap lantai = 90°'],
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Gambar sketsa dan tentukan hipotenusa',
          instruksi: 'Sketsa segitiga siku-siku antara tembok, lantai, dan tangga, lalu identifikasi nilai c dan a.',
          bantuanAtauTabel: ['c (hipotenusa/tangga) = ...... m', 'a (jarak mendatar di lantai) = ...... m', 'b (tinggi dinding yang dicari) = ?'],
          ruangJawabanJenis: 'uraian_singkat',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Susun persamaan dan hitung tinggi dinding (b)',
          instruksi: 'Tuliskan a² + b² = c², lalu hitung b secara bertahap.',
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 3,
          judulLangkah: 'Verifikasi kuadrat kedua sisi siku-siku',
          instruksi: 'Substitusikan nilai b yang diperoleh ke 3² + b² dan bandingkan dengan 5².',
          ruangJawabanJenis: 'perhitungan',
        },
      ],
      pemeriksaanHasil: [
        `Verifikasi: tinggi dinding harus lebih pendek daripada panjang tangga 5 m; ${isOk ? '3² + 4² = 9 + 16 = 25 = 5² (terbukti).' : ''}`,
      ],
      pertanyaanAnalisis: [
        {
          id: 'q-pyth-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Mengidentifikasi peran sisi terpanjang dan menghitung tinggi langsung dari data stimulus.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Berapakah tinggi dinding yang dicapai ujung atas tangga? Tunjukkan kuadrat masing-masing sisinya.',
          panduanJawabanSingkat: 'b² = 5² − 3² = 25 − 9 = 16 -> b = √16 = 4 meter.',
        },
        {
          id: 'q-pyth-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Menganalisis kesalahan umum siswa yang selalu menjumlahkan kuadrat dua angka tanpa memeriksa posisi hipotenusa.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan:
            'Seorang siswa menghitung tinggi dinding dengan √(5² + 3²) = √34 ≈ 5,83 meter. Mengapa hasil tersebut jelas keliru secara geometri maupun perhitungan?',
          panduanJawabanSingkat:
            'Keliru karena tangga panjangnya hanya 5 m tidak mungkin mencapai tembok setinggi 5,83 m; selain itu 5 m adalah sisi miring (c), sehingga sisi tegak harus dicari lewat c² − a², bukan ditambah.',
        },
        {
          id: 'q-pyth-3',
          nomor: 3,
          tingkatKognitif: 'Mahir',
          alasanTingkatKognitif: 'Menguji pemodelan terapan baru menggunakan tripel siku-siku berbeda dan memverifikasi kelayakan sudut 90°.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan:
            'Jika dipakai tangga sepanjang 13 meter dengan jarak kaki tangga ke dinding 5 meter, berapa tinggi maksimal dinding yang tercapai? Periksa apakah panjang sisi membentuk tripel Pythagoras.',
          panduanJawabanSingkat: 'b = √(13² − 5²) = √(169 − 25) = √144 = 12 m. Memenuhi 5² + 12² = 25 + 144 = 169 = 13² (Tripel 5-12-13).',
        },
      ],
      dukunganTambahan: 'Ingat selalu: sisi di hadapan sudut 90° adalah sisi terpanjang (c). Jika yang ditanya sisi tegak, gunakan c² − a².',
      pengayaan: {
        instruksi: 'Pengayaan terkait TP:',
        tugas: ['Selidiki apa yang terjadi terhadap tinggi dinding jika kaki tangga digeser menjauh dari 3 m menjadi 4 m pada tangga 5 m yang sama.'],
      },
      kesimpulanRefleksi: [
        'Tinggi dinding yang dicapai tangga sepanjang 5 m berjarak kaki 3 m adalah ...... meter.',
        'Kesulitan apa yang paling sering muncul dalam soal ini: menentukan sisi miring, menghitung kuadrat/akar, atau memeriksa kelogisan jawaban?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          {
            nomor: 1,
            jawabanInti: '4 meter (dari √(25 − 9)).',
            langkahPenyelesaian: ['a² + b² = c² -> 3² + b² = 5²', '9 + b² = 25 -> b² = 16 -> b = 4 m.'],
            alternatifValid: 'Mengenali tripel dasar 3–4–5 lalu melakukan cek kuadrat 9 + 16 = 25.',
          },
          {
            nomor: 2,
            jawabanInti: 'Salah rumus (menjumlahkan kuadrat hipotenusa + sisi tegak) dan melanggar fakta bahwa sisi tegak < sisi miring (5,83 m > 5 m).',
            langkahPenyelesaian: ['Bandingkan 5,83 m dengan panjang tangga 5 m; cek rumus pengurangan c² − a².'],
          },
          {
            nomor: 3,
            jawabanInti: '12 meter (Tripel Pythagoras 5–12–13).',
            langkahPenyelesaian: ['13² − 5² = 169 − 25 = 144 -> √144 = 12 m.'],
          },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: 'Siswa menganggap huruf c selalu variabel yang dicari sehingga menghitung √(a² + b²) untuk semua angka soal.',
            caraMenangani: 'Wajibkan siswa melingkari sudut 90° di sketsa dulu dan menandai sisi di seberangnya sebagai sisi terpanjang.',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Identifikasi sisi miring vs siku-siku', aktivitasTerkait: 'Langkah 1 & Pertanyaan 2' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Menghitung panjang sisi & cek tripel', aktivitasTerkait: 'Langkah 2–3 & Pertanyaan 1, 3' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Ketepatan penempatan hipotenusa & rumus',
            perluBimbingan: 'Memasukkan angka 5 m dan 3 m ke penjumlahan a² + b².',
            berkembang: 'Benar memilih pengurangan c² − a², tetapi keliru menarik akar.',
            cakap: 'Tepat menghitung 4 m dan memverifikasi 3² + 4² = 5².',
            mahir: 'Menjawab tepat semua soal, mematahkan kesimpulan √34 secara geometris, dan membuktikan tripel 5-12-13.',
          },
        ],
      },
    };
  }

  // Statistika SMP
  if (lower.includes('statistika') || lower.includes('mean') || lower.includes('pemusatan')) {
    const scores = [70, 75, 80, 80, 85, 90, 95];
    const stats = verifyDescriptiveStats(scores);
    const withOutlier = verifyDescriptiveStats([40, 75, 80, 80, 85, 90, 95]);
    const stimulusText =
      'Berikut adalah daftar nilai kuis Matematika 7 siswa di kelompok belajar: 80, 95, 70, 85, 80, 75, 90 (skala 0–100). Tentukan nilai mean (rata-rata), median (nilai tengah), dan modusnya, lalu analisis apa yang berubah bila nilai 70 diganti nilai 40 akibat siswa kurang sehat saat ujian.';
    return {
      isCuratedFixture: true,
      subJudulTopik: 'Analisis Mean, Median & Dampak Nilai Pencilan',
      pendekatanKegiatan: 'Pengolahan Data Kuantitatif & Analisis Perbandingan',
      modeKerja: 'Individu',
      alokasiWaktu: '2 x 40 Menit',
      targetBelajarSiswa: [
        'Mengurutkan data numerik sebelum mencari median.',
        'Menghitung mean, median, dan modus secara teliti.',
        'Menjelaskan ukuran mana yang lebih stabil ketika terdapat satu nilai pencilan (outlier).',
      ],
      prasyaratMateri: ['Penjumlahan dan pembagian bilangan bulat/desimal'],
      petunjukPengerjaan: [
        'Urutkan semua 7 nilai dari terkecil ke terbesar sebelum menentukan median.',
        'Tuliskan pembagian jumlah nilai dengan banyak data (7).',
      ],
      stimulusKasus: {
        judul: 'Membandingkan Rata-rata dan Nilai Tengah Nilai Kuis Kelompok',
        teks: stimulusText,
        pertanyaanAwal: 'Mengapa kita perlu mengurutkan data terlebih dahulu sebelum mencari median?',
      },
      stimulusData: {
        jenisData: 'tabel',
        tabelData: {
          kolom: ['Siswa', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
          baris: [['Nilai Kuis Awal', '80', '95', '70', '85', '80', '75', '90']],
        },
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Urutkan data dan cari modus serta median',
          instruksi: 'Susun ketujuh nilai dari terkecil ke terbesar, lalu tandai nilai ke-4 (median) dan yang paling sering muncul.',
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Hitung mean data awal',
          instruksi: 'Jumlahkan semua 7 nilai awal, lalu bagi dengan 7.',
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 3,
          judulLangkah: 'Uji dampak nilai 70 diganti 40',
          instruksi: 'Hitung ulang mean dan median baru jika data terkecil 70 menjadi 40, lalu bandingkan pergeserannya.',
          ruangJawabanJenis: 'perhitungan',
        },
      ],
      pemeriksaanHasil: [
        `Pastikan 7 data berjumlah tepat 575 untuk kondisi awal (Mean = ${stats.mean.toFixed(2)}, Median = ${stats.median}).`,
      ],
      pertanyaanAnalisis: [
        {
          id: 'q-stat-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Prosedur pengurutan 7 angka ganjil dan penentuan mean/median/modus langsung.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Tentukan nilai mean, median, dan modus dari 7 data kuis awal!',
          panduanJawabanSingkat: `Data terurut: ${stats.sorted.join(', ')}. Mean = 575/7 = ${stats.mean.toFixed(2)}; Median = ${stats.median}; Modus = 80.`,
        },
        {
          id: 'q-stat-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Membandingkan sensitivitas mean terhadap nilai ekstrem rendah dibanding median.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan:
            'Ketika nilai 70 berubah menjadi 40, berapa besar penurunan mean dibandingkan dengan perubahan median?',
          panduanJawabanSingkat: `Mean baru = 545/7 = ${withOutlier.mean.toFixed(2)} (turun ~4,29 poin). Median baru tetap ${withOutlier.median} (tidak berubah sama sekali).`,
        },
        {
          id: 'q-stat-3',
          nomor: 3,
          tingkatKognitif: 'Mahir',
          alasanTingkatKognitif: 'Mengambil keputusan representasi data berdasar sifat ketahanan terhadap pencilan.',
          ruangJawabanJenis: 'uraian_panjang',
          pertanyaan:
            'Dalam kelompok kedua dengan nilai ekstrem 40 tersebut, ukuran mana (mean atau median) yang lebih menggambarkan nilai khas mayoritas siswa? Berikan alasan berdasar data.',
          panduanJawabanSingkat:
            'Median (80) lebih representatif menggambarkan mayoritas (6 dari 7 siswa mendapat nilai 75–95), karena nilai ekstrem tunggal 40 menarik turun mean menjadi ~77,86.',
        },
      ],
      dukunganTambahan: 'Untuk n = 7 data berurutan, posisi median selalu berada tepat di urutan ke-(7+1)/2 = data ke-4.',
      pengayaan: {
        instruksi: 'Pengayaan terkait TP:',
        tugas: ['Jika ditambah 1 siswa lagi yang mendapat nilai 80 (sehingga ada 8 data awal), apakah median berubah? Buktikan!'],
      },
      kesimpulanRefleksi: [
        'Mean terpengaruh langsung oleh setiap perubahan angka ekstrem, sedangkan median tetap stabil pada nilai tengah.',
        'Tahap mana yang masih perlu kamu latih: mengurutkan data, menghitung rata-rata desimal, atau menafsirkan pencilan?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          {
            nomor: 1,
            jawabanInti: `Mean ≈ 82,14 (575/7), Median = 80, Modus = 80.`,
            langkahPenyelesaian: [
              `Urutkan: ${stats.sorted.join(', ')}.`,
              'Total = 575 -> Mean = 575 : 7 ≈ 82,14. Posisi ke-4 = 80 (Median). Modus = 80 (muncul 2 kali).',
            ],
          },
          {
            nomor: 2,
            jawabanInti: `Mean baru ≈ 77,86 (turun 4,29); Median tetap 80.`,
            langkahPenyelesaian: ['Selisih jumlah = 30 -> 30/7 ≈ 4,29; urutan tetap menempatkan 80 di posisi ke-4.'],
          },
          {
            nomor: 3,
            jawabanInti: 'Median (80) lebih mencerminkan kondisi khas mayoritas anggota kelompok.',
            langkahPenyelesaian: ['Bandingkan mayoritas data (75–95) dengan tarikan nilai tunggal 40 pada mean.'],
          },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: 'Mengambil nilai tengah langsung dari daftar mentah yang belum diurutkan (mengambil angka 85).',
            caraMenangani: 'Cek selalu apakah siswa menuliskan daftar angka terurut sebelum memilih posisi tengah.',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Menghitung mean, median, modus', aktivitasTerkait: 'Langkah 1–2 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Menganalisis pengaruh outlier', aktivitasTerkait: 'Langkah 3 & Pertanyaan 2–3' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Pengolahan & penafsiran ukuran pemusatan',
            perluBimbingan: 'Mengambil median dari data acak yang belum diurutkan.',
            berkembang: 'Urutan dan modus benar, tetapi salah menjumlah/membagi rata-rata.',
            cakap: 'Menghitung mean (82,14), median (80), modus (80), dan mean baru (77,86) dengan benar.',
            mahir: 'Menghitung akurat seluruh ukuran awal & baru serta memberi argumen data mengapa median tahan terhadap pencilan.',
          },
        ],
      },
    };
  }

  // SD Pecahan / Keliling-Luas / KPK-FPB, atau SMA/SMK Barisan / BEP / Trigonometri
  const isSMK = profile.jenjang === 'SMK' || tp.materiPokok.toLowerCase().includes('bep');
  const isSMA = (profile.jenjang === 'SMA/MA' && !isSMK);

  if (isSMK && (lower.includes('bep') || lower.includes('impas') || lower.includes('persentase'))) {
    const fc = 600000;
    const vc = 12000;
    const p = 20000;
    const bepUnit = fc / (p - vc); // 75 unit
    const stimulusText =
      'Unit produksi kuliner SMK menyiapkan paket sarapan sehat dengan rincian biaya: biaya tetap peralatan & stan per bulan Rp600.000, biaya variabel bahan dan kemasan Rp12.000 per paket, serta harga jual ditetapkan Rp20.000 per paket. Hitung berapa paket minimal yang harus terjual agar usaha mencapai titik impas (BEP) tanpa rugi!';
    return {
      isCuratedFixture: true,
      subJudulTopik: 'Menghitung Harga Pokok & Titik Impas (BEP) Paket Kuliner',
      pendekatanKegiatan: 'Pemodelan Keuangan Usaha & Verifikasi Titik Impas',
      modeKerja: 'Kelompok Kecil (3–4 Siswa)',
      alokasiWaktu: '2 x 45 Menit',
      targetBelajarSiswa: [
        'Membedakan biaya tetap (Fixed Cost) dan biaya variabel per unit (Variable Cost).',
        'Menghitung BEP dalam unit dan rupiah serta membuktikan Total Pendapatan = Total Biaya.',
      ],
      prasyaratMateri: ['Operasi aritmetika rupiah dan persamaan linear sederhana'],
      petunjukPengerjaan: [
        'Tuliskan satuan pada tiap komponen (Rp untuk total biaya, Rp/unit untuk biaya variabel & harga).',
        'Verifikasi kembali angka BEP unit dengan menghitung Total Pendapatan = Biaya Tetap + Biaya Variabel.',
      ],
      stimulusKasus: {
        judul: 'Perencanaan Titik Impas Usaha Paket Sarapan SMK',
        teks: stimulusText,
        pertanyaanAwal: 'Berapa selisih margin kontribusi (keuntungan kotor) dari setiap 1 paket yang laku terjual?',
      },
      stimulusData: {
        jenisData: 'tabel',
        tabelData: {
          kolom: ['Komponen Biaya / Harga', 'Nilai', 'Keterangan'],
          baris: [
            ['Biaya Tetap (FC)', 'Rp600.000', 'Tetap per periode, tidak bergantung jumlah paket'],
            ['Biaya Variabel per unit (VC)', 'Rp12.000 / paket', 'Bahan + kemasan setiap paket'],
            ['Harga Jual (P)', 'Rp20.000 / paket', 'Pendapatan tiap 1 paket terjual'],
          ],
        },
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Hitung margin kontribusi per paket (P − VC)',
          instruksi: 'Kurangkan harga jual satu paket dengan biaya bahan/kemasannya.',
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Hitung BEP Unit = FC / (P − VC) dan BEP Rupiah',
          instruksi: 'Tentukan jumlah paket minimal untuk menutup biaya tetap Rp600.000.',
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 3,
          judulLangkah: 'Uji keseimbangan Total Biaya vs Total Penjualan pada titik BEP',
          instruksi: 'Buktikan bahwa pada volume tersebut Pendapatan = Total Biaya (Laba = 0).',
          ruangJawabanJenis: 'perhitungan',
        },
      ],
      pemeriksaanHasil: [
        `Pada ${bepUnit} paket: Pendapatan = ${bepUnit} × Rp20.000 = Rp1.500.000; Total Biaya = Rp600.000 + (${bepUnit} × Rp12.000) = Rp1.500.000.`,
      ],
      pertanyaanAnalisis: [
        {
          id: 'q-bep-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Substitusi langsung komponen FC, P, dan VC ke formula titik impas.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Berapa paket minimal (BEP unit) dan omzet (BEP rupiah) agar usaha tidak merugi?',
          panduanJawabanSingkat: `Margin kontribusi = 20.000 - 12.000 = Rp8.000/paket. BEP unit = 600.000 / 8.000 = 75 paket. BEP rupiah = 75 × Rp20.000 = Rp1.500.000.`,
        },
        {
          id: 'q-bep-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Menganalisis konsekuensi ekonomi bila harga turun terhadap titik impas baru.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Jika stan baru berhasil menjual 60 paket dalam sebulan, apakah usaha sudah untung atau masih rugi? Berapa rupiah besarnya?',
          panduanJawabanSingkat: 'Penjualan 60×20.000 = Rp1.200.000. Total biaya = 600.000 + (60×12.000) = Rp1.320.000. Masih rugi Rp120.000 (kurang 15 paket dari BEP).',
        },
        {
          id: 'q-bep-3',
          nomor: 3,
          tingkatKognitif: 'Mahir',
          alasanTingkatKognitif: 'Mengevaluasi keputusan kenaikan biaya tetap vs penghematan biaya variabel.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Jika harga kemasan naik sehingga biaya variabel menjadi Rp14.000/paket dengan harga jual tetap Rp20.000, berapa tambahan paket yang harus dijual untuk kembali mencapai BEP?',
          panduanJawabanSingkat: 'Margin baru = 20.000 − 14.000 = Rp6.000/paket. BEP baru = 600.000 / 6.000 = 100 paket (perlu menjual 25 paket lebih banyak dari 75 paket semula).',
        },
      ],
      dukunganTambahan: 'Selalu hitung margin tiap 1 unit terjual lebih dulu: Rp20.000 − Rp12.000 = Rp8.000 untuk menutup biaya tetap.',
      pengayaan: {
        instruksi: 'Pengayaan terkait target laba usaha:',
        tugas: ['Jika kelompok menargetkan laba bersih Rp400.000/bulan, berapa paket harus terjual? ((600.000 + 400.000) / 8.000 = 125 paket)'],
      },
      kesimpulanRefleksi: [
        'Titik impas dicapai saat ...... paket terjual dengan omzet Rp...............',
        'Kesulitan apa yang perlu kamu perbaiki: membedakan FC vs VC, menghitung margin unit, atau menguji saldo total?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          {
            nomor: 1,
            jawabanInti: 'BEP = 75 paket / Rp1.500.000.',
            langkahPenyelesaian: ['Margin = 20.000 − 12.000 = 8.000', 'BEP Unit = 600.000 / 8.000 = 75 paket', 'BEP Rupiah = 75 × 20.000 = 1.500.000.'],
          },
          { nomor: 2, jawabanInti: 'Masih rugi Rp120.000 (karena 60 < 75 paket).', langkahPenyelesaian: ['15 paket di bawah BEP × Rp8.000 = Rp120.000 rugi.'] },
          { nomor: 3, jawabanInti: 'BEP naik ke 100 paket (bertambah 25 paket).', langkahPenyelesaian: ['600.000 / (20.000 − 14.000) = 100 paket; selisih 100 − 75 = 25 paket.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: 'Membagi Biaya Tetap langsung dengan Harga Jual (600.000 / 20.000 = 30) tanpa mengurangi Biaya Variabel.',
            caraMenangani: 'Tanyakan: jika 30 paket terjual dengan omzet Rp600.000, dari mana membayar bahan Rp12.000 × 30?',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Identifikasi komponen biaya & margin', aktivitasTerkait: 'Langkah 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Hitung & verifikasi BEP', aktivitasTerkait: 'Langkah 2–3 & Pertanyaan 1–3' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Ketepatan formulasi & verifikasi BEP',
            perluBimbingan: 'Membagi biaya tetap langsung oleh harga jual tanpa memperhitungkan biaya variabel.',
            berkembang: 'Benar menghitung margin Rp8.000 tetapi lupa membuktikan kesetaraan omzet vs total biaya.',
            cakap: 'Tepat menemukan 75 paket dan memverifikasi omzet Rp1.500.000.',
            mahir: 'Menghitung semua skenario (60 paket rugi Rp120.000 dan BEP baru 100 paket) lengkap dan terverifikasi.',
          },
        ],
      },
    };
  }

  // Fallback Matematika SD Atas & SMA konkret yang terhitung (Pecahan / Barisan Aritmetika)
  if (bucketIsSDAtas(grade.gradeBand)) {
    const stimulusText =
      'Toko roti membuat sebuah kue loyang berbentuk persegi panjang dan memotongnya menjadi 8 bagian sama besar. Pada pagi hari terjual 3 potong kue, lalu pada siang hari terjual 2/4 loyang kue jenis yang sama. Berapa total bagian kue yang telah terjual dan berapa sisa kue yang belum terjual?';
    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: 'Visualisasi Pecahan Senilai & Operasi Pecahan Kontekstual',
      modeKerja: 'Berpasangan',
      alokasiWaktu: '2 x 35 Menit',
      targetBelajarSiswa: [
        'Mengubah dua pecahan berpenyebut berbeda ke pecahan senilai berpenyebut sama.',
        'Menghitung jumlah serta sisa pecahan dan menyatakan bentuk persen atau desimalnya.',
      ],
      prasyaratMateri: ['Mengenal pecahan senilai dan kelipatan bilangan kecil'],
      petunjukPengerjaan: [
        'Ubah semua bagian kue ke penyebut yang sama (per 8 bagian).',
        'Periksa bahwa jumlah terjual + sisa tepat sama dengan 1 loyang utuh (8/8).',
      ],
      stimulusKasus: {
        judul: 'Menghitung Potongan Kue yang Terjual dan Tersisa',
        teks: stimulusText,
        pertanyaanAwal: 'Jika 1 loyang dipotong menjadi 8 bagian sama besar, berapa potongan yang setara dengan 2/4 loyang?',
      },
      stimulusData: {
        jenisData: 'daftar_fakta',
        poinKunci: ['1 loyang utuh = 8/8 bagian', 'Terjual pagi = 3 potong = 3/8 bagian', 'Terjual siang = 2/4 loyang'],
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Nyatakan penjualan pagi dan samakan penyebut penjualan siang',
          instruksi: 'Ubah 2/4 ke pecahan senilai berpenyebut 8.',
          bantuanAtauTabel: ['Pagi: 3/8 loyang', 'Siang: 2/4 = (...)/8 loyang'],
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Jumlahkan kue terjual dan hitung sisa kue',
          instruksi: 'Hitung total bagian terjual lalu kurangkan dari 8/8 loyang utuh.',
          ruangJawabanJenis: 'perhitungan',
        },
      ],
      pemeriksaanHasil: ['Pagi (3/8) + Siang (4/8) = 7/8 terjual; sisa 1/8. Cek: 7/8 + 1/8 = 8/8 = 1 utuh.'],
      pertanyaanAnalisis: [
        {
          id: 'q-pec-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Menyamakan penyebut pecahan 2/4 menjadi 4/8 lalu menjumlahkannya.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Berapa pecahan bagian kue yang terjual seluruhnya dan berapa sisa bagiannya?',
          panduanJawabanSingkat: '2/4 = 4/8. Terjual = 3/8 + 4/8 = 7/8 loyang. Sisa = 8/8 − 7/8 = 1/8 loyang.',
        },
        {
          id: 'q-pec-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Mengubah pecahan sisa kue menjadi bentuk desimal dan membandingkan porsi penjualan.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Jika diubah menjadi desimal (atau persen), berapa nilai 2/4 dan 1/8 loyang? Pada waktu mana kue terjual lebih banyak?',
          panduanJawabanSingkat: '2/4 = 0,5 (50%), 3/8 = 0,375 (37,5%), dan sisa 1/8 = 0,125 (12,5%). Penjualan siang (4/8) lebih banyak daripada pagi (3/8).',
        },
      ],
      dukunganTambahan: 'Gambarlah 1 persegi panjang dibagi 8 kotak sama besar; arsir 3 kotak untuk pagi lalu 4 kotak untuk siang (karena 2/4 dari 8 kotak = 4 kotak).',
      pengayaan: {
        instruksi: 'Untuk latihan tambahan:',
        tugas: ['Jika harga 1 loyang penuh Rp40.000, berapa harga 2/4 loyang kue tersebut?'],
      },
      kesimpulanRefleksi: [
        'Total kue terjual adalah ....../8 bagian dan tersisa ....../8 bagian.',
        'Langkah mana yang paling membantumu: menyamakan penyebut atau menggambar kotak pecahan?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: 'Terjual 7/8 loyang, sisa 1/8 loyang.', langkahPenyelesaian: ['2/4 = 4/8', '3/8 + 4/8 = 7/8', '1 − 7/8 = 1/8.'] },
          { nomor: 2, jawabanInti: '2/4 = 0,5 (50%); 1/8 = 0,125 (12,5%); siang lebih banyak.', langkahPenyelesaian: ['Bandingkan 4/8 vs 3/8.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: 'Menjumlahkan pembilang dengan pembilang dan penyebut dengan penyebut (3/8 + 2/4 = 5/12).',
            caraMenangani: 'Tunjukkan lewat kotak pecahan bahwa 1/4 lebih besar daripada 1/8 sehingga ukuran potongan wajib disamakan dulu.',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Pecahan senilai & penjumlahan penyebut berbeda', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Konversi desimal/persen & perbandingan', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Penyamaan penyebut dan operasi pecahan',
            perluBimbingan: 'Menjumlah pembilang dan penyebut secara langsung tanpa menyamakan penyebut.',
            berkembang: 'Benar menyamakan penyebut ke 8, tetapi keliru mengurangi sisa dari 1 loyang.',
            cakap: 'Tepat menghitung terjual 7/8 dan sisa 1/8 loyang.',
            mahir: 'Tepat menghitung pecahan, mengonversi ke 0,5 dan 0,125, serta mengecek total = 8/8.',
          },
        ],
      },
    };
  }

  if (isSMA) {
    const stimulusText =
      'Untuk membeli peralatan praktik pribadi, Raka menabung Rp50.000 pada minggu pertama. Setiap minggu berikutnya ia menabung bertambah tetap Rp15.000 dibanding minggu sebelumnya (minggu ke-2 Rp65.000, minggu ke-3 Rp80.000, dan seterusnya). Tentukan besar tabungan Raka pada minggu ke-8 dan jumlah seluruh uang tabungannya setelah genap 8 minggu!';
    return {
      isCuratedFixture: true,
      subJudulTopik: cleanTopicHeading(tp.materiPokok),
      pendekatanKegiatan: 'Pemodelan Barisan & Deret Aritmetika + Verifikasi Manual',
      modeKerja: 'Individu',
      alokasiWaktu: '2 x 45 Menit',
      targetBelajarSiswa: [
        'Mengidentifikasi suku awal (a) dan beda tetap (b) dari konteks penambahan tabungan mingguan.',
        'Menentukan suku ke-n (Un) dan jumlah n suku pertama (Sn) barisan aritmetika lalu menguji konsistensinya.',
      ],
      prasyaratMateri: ['Pola bilangan dan aljabar substitusi'],
      petunjukPengerjaan: [
        'Bedakan antara "setoran pada minggu ke-8 (U8)" dengan "total tabungan selama 8 minggu (S8)".',
        'Cek kembali rumus Sn menggunakan penjumlahan 8 suku atau pasangan suku pertama + terakhir.',
      ],
      stimulusKasus: {
        judul: 'Rencana Tabungan Mingguan dengan Kenaikan Tetap',
        teks: stimulusText,
        pertanyaanAwal: 'Berapa beda tetap (b) dari setoran minggu ke-1 ke minggu ke-2 dan ke minggu ke-3?',
      },
      stimulusData: {
        jenisData: 'tabel',
        tabelData: {
          kolom: ['Minggu ke-n', '1', '2', '3', '...', '8'],
          baris: [['Setoran (Rp)', '50.000', '65.000', '80.000', '...', '?']],
        },
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Tentukan a, b, dan rumus Un',
          instruksi: 'Nyatakan suku awal a dan beda b, lalu hitung U8.',
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Hitung jumlah total tabungan 8 minggu (S8)',
          instruksi: 'Gunakan rumus Sn = (n/2)(a + Un) atau (n/2)(2a + (n-1)b).',
          ruangJawabanJenis: 'perhitungan',
        },
      ],
      pemeriksaanHasil: [
        'Cek manual 8 suku: 50.000 + 65.000 + 80.000 + 95.000 + 110.000 + 125.000 + 140.000 + 155.000 = Rp820.000.',
      ],
      pertanyaanAnalisis: [
        {
          id: 'q-baris-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Menghitung nilai suku ke-8 dan jumlah deret 8 suku dengan parameter a dan b jelas.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Berapa setoran Raka pada minggu ke-8 (U8) dan total tabungan setelah 8 minggu (S8)?',
          panduanJawabanSingkat: 'U8 = 50.000 + (7)(15.000) = Rp155.000. S8 = (8/2)(50.000 + 155.000) = 4 × 205.000 = Rp820.000.',
        },
        {
          id: 'q-baris-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Mendeteksi kesalahan umum penggunaan n alih-alih (n−1) pada rumus suku ke-n.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Seorang siswa menghitung U8 = 50.000 + 8(15.000) = Rp170.000. Tunjukkan letak kekeliruan penalarannya!',
          panduanJawabanSingkat: 'Dari minggu 1 ke minggu 8 hanya ada 7 kali penambahan Rp15.000 (bukan 8 kali), karena minggu 1 sudah bernilai a = 50.000.',
        },
        {
          id: 'q-baris-3',
          nomor: 3,
          tingkatKognitif: 'Mahir',
          alasanTingkatKognitif: 'Membandingkan pertumbuhan linear aritmetika dengan pertumbuhan rasio geometri secara terukur.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Jika harga alat praktik yang dituju adalah Rp1.000.000, apakah tabungan 8 minggu sudah cukup? Jika belum, pada minggu ke berapa minimal target terlampaui?',
          panduanJawabanSingkat: 'S8 = Rp820.000 belum cukup (kurang Rp180.000). Minggu ke-9 U9 = Rp170.000 -> S9 = Rp990.000 (masih kurang Rp10.000), sehingga baru tercapai pada minggu ke-10 (S10 = Rp1.175.000).',
        },
      ],
      dukunganTambahan: 'Tuliskan selisih U2 − U1 = 15.000 dan periksa berapa jarak lompatan dari U1 ke U8 (ada 7 lompatan).',
      pengayaan: {
        instruksi: 'Pengayaan terkait TP:',
        tugas: ['Hitung nilai Sn bila pada minggu ke-1 sampai ke-8 Raka tetap menabung Rp100.000/minggu lalu bandingkan totalnya!'],
      },
      kesimpulanRefleksi: [
        'Setoran minggu ke-8 (U8) = Rp........... dan total tabungan 8 minggu (S8) = Rp...........',
        'Bagian mana yang paling sering membingungkan bagimu: membedakan Un dengan Sn atau menentukan faktor (n − 1)?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: 'U8 = Rp155.000; S8 = Rp820.000.', langkahPenyelesaian: ['a = 50.000, b = 15.000', 'U8 = 50.000 + 7(15.000) = 155.000', 'S8 = 4 × (50.000 + 155.000) = 820.000.'] },
          { nomor: 2, jawabanInti: 'Lompatan beda dari suku 1 ke suku 8 adalah n−1 = 7 kali, bukan 8 kali.', langkahPenyelesaian: ['Tunjukkan daftar U1 sampai U8 untuk melihat 7 panah selisih.'] },
          { nomor: 3, jawabanInti: 'Belum cukup (kurang Rp180.000); baru cukup di minggu ke-10 (S10 = Rp1.175.000).', langkahPenyelesaian: ['S9 = 820.000 + 170.000 = 990.000 < 1.000.000', 'U10 = 185.000 -> S10 = 990.000 + 185.000 = 1.175.000.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: 'Menggunakan Un = a + n·b alih-alih a + (n − 1)b atau menjawab U8 ketika ditanya jumlah seluruh tabungan S8.',
            caraMenangani: 'Minta siswa melingkari kata "pada minggu ke-8" (1 suku) vs "seluruh tabungan selama 8 minggu" (penjumlahan S8).',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Identifikasi a, b & rumus Un', aktivitasTerkait: 'Langkah 1 & Pertanyaan 2' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Menghitung & menguji S8 kontekstual', aktivitasTerkait: 'Langkah 2 & Pertanyaan 1, 3' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Pemodelan dan penghitungan barisan-deret',
            perluBimbingan: 'Menggunakan n bukan (n-1) dan tertukar antara Un dan Sn.',
            berkembang: 'Benar U8 = Rp155.000 tetapi keliru menjumlahkan S8.',
            cakap: 'Tepat menghitung U8 = Rp155.000 dan S8 = Rp820.000 serta memeriksa penjumlahan.',
            mahir: 'Menuntaskan cek target Rp1.000.000 (baru tercapai di S10) dan menjelaskan alasan (n−1) dengan tepat.',
          },
        ],
      },
    };
  }

  return null;
}

function bucketIsSDAtas(band: string): boolean {
  return band === 'sd_atas';
}

function buildSainsCuratedFixture(
  tp: CustomTPItem,
  profile: SchoolProfile,
  preset: LKPDPresetType
): CuratedLKPDContent | null {
  const family = resolveSubjectFamily(profile.mataPelajaranUtama);
  if (family !== 'sains') return null;

  const lower = tp.materiPokok.toLowerCase();
  const grade = resolveJenjangPedagogicalProfile(profile.jenjang, profile.kelasUtama);

  // Cahaya & Optik / Cermin / IPA SMP
  if (lower.includes('cahaya') || lower.includes('cermin') || lower.includes('optik')) {
    const stimulusText =
      'Pada meja praktik optik, seberkas sinar diarahkan ke permukaan cermin datar dengan tiga variasi sudut datang (diukur terhadap garis normal tegak lurus cermin): 20°, 35°, dan 50°. Hasil pengukuran sudut sinar pantul berturut-turut tercatat 20°, 34°, dan 50°. Gunakan data pengamatan tersebut untuk merumuskan hukum pemantulan serta menilai perbedaan hasil pada cermin datar dan cermin cekung!';
    const expData = {
      tools: [
        'Cermin datar dan cermin cekung kecil (pinggiran dilapisi selotip pengaman)',
        'Sumber cahaya terarah (senter LED celah tunggal / laser pointer daya rendah — JANGAN diarahkan ke mata)',
        'Busur derajat dan kertas putih berpenanda garis normal',
        'Layar tangkap kertas tebal dan penggaris cm',
      ],
      hipotesis:
        'Pada pemantulan cahaya di cermin datar, besar sudut pantul (θr) sama dengan sudut datang (θi) bila diukur terhadap garis normal.',
      safety: [
        'KESELAMATAN: Jangan pernah menyorotkan senter/laser langsung ke mata sendiri atau teman.',
        'Periksa pinggiran kaca cermin sebelum dipegang; hindari cermin yang retak/pecah.',
      ],
      table: {
        kolom: ['Percobaan', 'Sudut Datang (θi)', 'Sudut Pantul Terukur (θr)', 'Selisih |θi − θr|', 'Kesimpulan Pengamatan'],
        baris: [
          ['Uji 1', '20°', '20°', '0°', 'Sudut datang = sudut pantul'],
          ['Uji 2', '35°', '34°', '1°', 'Toleransi ketelitian baca busur'],
          ['Uji 3', '50°', '50°', '0°', 'Sudut datang = sudut pantul'],
        ],
      },
    };
    return {
      isCuratedFixture: true,
      subJudulTopik: 'Penyelidikan Pemantulan Cahaya & Sifat Bayangan Cermin',
      pendekatanKegiatan:
        preset === 'eksperimen'
          ? 'Penyelidikan Ilmiah, Tabel Observasi & Keselamatan Optik'
          : 'Analisis Data Pengamatan Pemantulan Cahaya',
      modeKerja: 'Kelompok Kecil (3–4 Siswa)',
      alokasiWaktu: '2 x 40 Menit',
      targetBelajarSiswa: [
        'Membaca dan mengukur sudut datang serta sudut pantul terhadap garis normal cermin datar.',
        'Membedakan sifat bayangan pada cermin datar dengan cermin cekung.',
      ],
      prasyaratMateri: ['Menggunakan busur derajat dan mengenal garis tegak lurus (90°)', 'Cahaya merambat lurus'],
      petunjukPengerjaan: [
        'Periksa kelengkapan alat serta pastikan cermin bersih dan tidak retak sebelum mulai.',
        'Ukur sudut selalu terhadap garis normal (garis putus-putus tegak lurus permukaan cermin), bukan terhadap bidang cermin.',
      ],
      stimulusKasus: {
        judul: 'Data Sudut Pemantulan Sinar pada Cermin Datar',
        teks: stimulusText,
        pertanyaanAwal: 'Mengapa pada Uji 2 sudut terukur 34° padahal teori memprediksi 35°?',
      },
      stimulusData: {
        jenisData: 'tabel',
        tabelData: expData.table,
        catatanAsumsi: 'Keselamatan praktik: arahkan berkas senter hanya di bidang kertas meja; jangan mengarahkan cahaya ke mata.',
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText, expData),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Periksa keselamatan kerja dan tetapkan variabel penyelidikan',
          instruksi: 'Pastikan alat aman, lalu tentukan variabel bebas, terikat, dan kontrol dari percobaan sudut cermin.',
          bantuanAtauTabel: [
            'Variabel bebas (yang diubah): ...........................................',
            'Variabel terikat (yang diukur): ...........................................',
            'Variabel kontrol (yang dijaga tetap): Cermin datar yang sama & garis normal tegak lurus',
          ],
          ruangJawabanJenis: 'uraian_singkat',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Lengkapi selisih data dan analisis pola θi vs θr',
          instruksi: 'Hitung selisih pengukuran tiap uji dan tentukan apakah bukti percobaan mendukung hukum pemantulan.',
          ruangJawabanJenis: 'perhitungan',
        },
        {
          langkahKe: 3,
          judulLangkah: 'Jelaskan penerapan ilmiah dari hasil percobaan',
          instruksi: 'Jelaskan mengapa jika sudut datang diperbesar menjadi 65° terhadap garis normal, sudut pantulnya juga ikut mendekati 65°.',
          ruangJawabanJenis: 'uraian_singkat',
        },
      ],
      pemeriksaanHasil: [
        'Pastikan seluruh sudut dinyatakan dalam derajat (°) terhadap garis normal, bukan terhadap bidang datar cermin.',
      ],
      pertanyaanAnalisis: [
        {
          id: 'q-ipa-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Menentukan hubungan langsung antarkolom θi dan θr dari tabel observasi.',
          ruangJawabanJenis: 'uraian_singkat',
          pertanyaan: 'Berdasarkan ketiga data percobaan di atas, hubungan apa yang berlaku antara sudut datang dan sudut pantul?',
          panduanJawabanSingkat: 'Besar sudut datang selalu sama (atau mendekati sama dalam batas ketelitian busur 1°) dengan sudut pantul: θi = θr.',
        },
        {
          id: 'q-ipa-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Menghitung sudut pelurus/komplemen bila sinar datang diukur terhadap bidang cermin, bukan garis normal.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Jika seberkas sinar datang membentuk sudut 30° terhadap PERMUKAAN cermin datar (bukan garis normal), berapa besar sudut pantulnya terhadap garis normal?',
          panduanJawabanSingkat: 'Garis normal membentuk 90° terhadap cermin -> sudut datang θi = 90° − 30° = 60°, maka sudut pantul θr = 60°.',
        },
        {
          id: 'q-ipa-3',
          nomor: 3,
          tingkatKognitif: 'Mahir',
          alasanTingkatKognitif: 'Mengevaluasi ketidakpastian pengukuran 1° pada Uji 2 serta merancang koreksi prosedurnya.',
          ruangJawabanJenis: 'uraian_panjang',
          pertanyaan: 'Pada Uji 2 terdapat selisih 1° (35° vs 34°). Faktor teknis apa yang dapat menimbulkan selisih kecil itu dan bagaimana cara memperkecil kesalahannya?',
          panduanJawabanSingkat: 'Ketebalan berkas senter yang lebar, pandangan paralaks mata saat membaca skala busur, atau garis normal kurang tepat 90°. Perbaikan: perkecil celah berkas dan ulangi pembacaan rata-rata 3 kali.',
        },
      ],
      dukunganTambahan: 'Ingat: Garis normal selalu tegak lurus (90°) terhadap cermin. Jika sudut diukur dari bidang cermin, kurangkan dulu dari 90°.',
      pengayaan: {
        instruksi: 'Pengayaan terkait aplikasi sifat cermin:',
        tugas: ['Jelaskan mengapa cermin rias/senter menggunakan cermin cekung sedangkan spion kendaraan menggunakan cermin cembung (dari sudut lebar pandangnya).'],
      },
      kesimpulanRefleksi: [
        'Kesimpulan ilmiah: Pada pemantulan cahaya, sudut datang ...... dengan sudut pantul bila keduanya diukur terhadap garis ......',
        'Hal teknis apa yang paling menentukan akurasi pengukuran cahaya pada praktik ini?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: 'θi = θr (Hukum Pemantulan Snellius I).', langkahPenyelesaian: ['Bandingkan 20°=20°, 35°≈34°, 50°=50°.'] },
          { nomor: 2, jawabanInti: 'θr = 60° terhadap garis normal.', langkahPenyelesaian: ['90° − 30° = 60° = θi -> θr = θi = 60°.'] },
          { nomor: 3, jawabanInti: 'Sumber galat: lebar berkas sinar, paralaks mata, posisi normal; atasi dengan pengulangan 3 kali & pengamatan tegak lurus.', langkahPenyelesaian: ['Evaluasi alat ukur busur 1°.'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: 'Mengukur sudut datang dari bidang datar cermin langsung ke garis sinar sehingga menulis θr = 30° pada soal nomor 2.',
            caraMenangani: 'Selalu gambar garis normal putus-putus 90° di titik pantul sebelum menandai θi dan θr.',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Variabel & hukum pemantulan', aktivitasTerkait: 'Langkah 1–2 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Hitung sudut garis normal & evaluasi galat', aktivitasTerkait: 'Langkah 3 & Pertanyaan 2–3' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Ketepatan analisis tabel optik & garis normal',
            perluBimbingan: 'Mengira sudut pantul pada Pertanyaan 2 tetap 30° karena tidak memakai garis normal.',
            berkembang: 'Benar menyimpulkan θi = θr pada tabel, namun belum menghitung komplemen 90° − 30°.',
            cakap: 'Tepat menghitung θr = 60° dan memahami fungsi garis normal.',
            mahir: 'Menjawab tepat semua soal, memeriksa K3 alat optik, serta menganalisis sumber galat pengukuran secara ilmiah.',
          },
        ],
      },
    };
  }

  // Kimia Stoikiometri / Asam-Basa atau Fisika Newton / Hukum Ohm atau Biologi Osmosis / IPAS SD
  if (lower.includes('newton') || lower.includes('gaya') || lower.includes('percepatan')) {
    const stimulusText =
      'Sebuah kotak peralatan bermassa m = 4 kg ditarik mendatar ke kanan oleh gaya F = 24 N di atas lantai datar yang memberikan gaya gesek berarah berlawanan f_gesek = 4 N. Hitung resultan gaya horizontal dan percepatan kotak menggunakan Hukum II Newton!';
    return {
      isCuratedFixture: true,
      subJudulTopik: 'Analisis Resultan Gaya & Percepatan (Hukum II Newton)',
      pendekatanKegiatan: 'Pemodelan Diagram Gaya & Verifikasi Kuantitatif',
      modeKerja: 'Berpasangan',
      alokasiWaktu: '2 x 45 Menit',
      targetBelajarSiswa: [
        'Menggambarkan arah gaya tarik dan gaya gesek yang berlawanan arah.',
        'Menghitung resultan gaya ΣF dan percepatan a = ΣF / m beserta satuan SI.',
      ],
      prasyaratMateri: ['Mengubah massa gram ke kilogram bila perlu dan operasi aljabar pembagian'],
      petunjukPengerjaan: [
        'Tetapkan arah kanan sebagai arah positif (+).',
        'Sertakan selalu satuan (N, kg, m/s²) pada setiap hasil hitungan.',
      ],
      stimulusKasus: {
        judul: 'Menghitung Gerak Kotak Peralatan dengan Gaya Gesek',
        teks: stimulusText,
        pertanyaanAwal: 'Mengapa gaya gesek harus dikurangkan dari gaya tarik saat menentukan resultan horizontal?',
      },
      stimulusData: {
        jenisData: 'daftar_fakta',
        poinKunci: ['Massa m = 4 kg', 'Gaya tarik ke kanan F = +24 N', 'Gaya gesek melawan arah gerak f = -4 N'],
      },
      ...adaptPresetExtras(preset, tp.materiPokok, stimulusText, {
        tools: ['Balok kayu bermassa terukur / beban standar', 'Neraca pegas (dinamometer)', 'Meja datar halus dan amplas kasar untuk uji gaya gesek'],
        hipotesis: 'Semakin kasar permukaan lantai (gaya gesek membesar), semakin kecil resultan gaya sehingga percepatan benda menurun.',
        safety: ['Jangan menarik neraca pegas melebihi batas skala maksimal agar pegas tidak rusak permanen; pegang beban dengan aman agar tidak jatuh menimpa kaki.'],
        table: {
          kolom: ['Kondisi Permukaan', 'F_tarik (N)', 'f_gesek (N)', 'ΣF (N)', 'Percepatan a = ΣF/m (m/s²)'],
          baris: [
            ['Meja licin (estimasi)', '24 N', '0 N', '.......', '.......'],
            ['Lantai datar stimulus', '24 N', '4 N', '.......', '.......'],
          ],
        },
      }),
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Identifikasi arah dan besar seluruh gaya horizontal',
          instruksi: 'Nyatakan arah kanan positif (+) dan kiri negatif (−), lalu tulis F dan f_gesek.',
          ruangJawabanJenis: 'uraian_singkat',
        },
        {
          langkahKe: 2,
          judulLangkah: 'Hitung ΣF dan percepatan a = ΣF / m',
          instruksi: 'Tulis ΣF = F − f_gesek, lalu hitung percepatan kotak m = 4 kg.',
          ruangJawabanJenis: 'perhitungan',
        },
      ],
      pemeriksaanHasil: ['Verifikasi: m × a = 4 kg × 5 m/s² = 20 N, ditambah f_gesek 4 N tepat kembali sama dengan F_tarik = 24 N.'],
      pertanyaanAnalisis: [
        {
          id: 'q-fis-1',
          nomor: 1,
          tingkatKognitif: 'Dasar',
          alasanTingkatKognitif: 'Menghitung ΣF = 24 − 4 = 20 N dan a = 20 / 4 = 5 m/s² langsung dari data stimulus.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Berapakah besar resultan gaya (ΣF) dan percepatan kotak tersebut?',
          panduanJawabanSingkat: 'ΣF = 24 N − 4 N = 20 N ke kanan; a = 20 N / 4 kg = 5 m/s² ke kanan.',
        },
        {
          id: 'q-fis-2',
          nomor: 2,
          tingkatKognitif: 'Menengah',
          alasanTingkatKognitif: 'Menguji perubahan hasil ketika massa dilipatgandakan sambil gaya tetap.',
          ruangJawabanJenis: 'perhitungan',
          pertanyaan: 'Jika beban di atas kotak ditambah sehingga massa total menjadi 8 kg (dengan F dan f_gesek tetap), bagaimana perubahan percepatannya?',
          panduanJawabanSingkat: 'a_baru = 20 N / 8 kg = 2,5 m/s² (menjadi setengah dari percepatan awal karena berbanding terbalik dengan massa).',
        },
      ],
      dukunganTambahan: 'Gaya adalah besaran vektor: gaya yang melawan arah tarikan bertanda negatif.',
      pengayaan: {
        instruksi: 'Pengayaan terkait Hukum I Newton:',
        tugas: ['Berapa besar gaya tarik yang diperlukan agar kotak bergerak dengan kecepatan tetap (a = 0 m/s²) pada lantai bergesek 4 N? (Jawab: F = 4 N).'],
      },
      kesimpulanRefleksi: [
        'Resultan gaya kotak adalah ...... N dan percepatannya ...... m/s².',
        'Kesulitan apa yang perlu kamu periksa ulang: menentukan arah tanda gaya, membagi gaya oleh massa, atau menulis satuan?',
      ],
      panduanGuru: {
        kunciDanContohJawaban: [
          { nomor: 1, jawabanInti: 'ΣF = 20 N ke kanan, a = 5 m/s².', langkahPenyelesaian: ['24 − 4 = 20 N', '20 / 4 = 5 m/s².'] },
          { nomor: 2, jawabanInti: 'a menjadi 2,5 m/s² (separuhnya).', langkahPenyelesaian: ['a = 20 / 8 = 2,5 m/s².'] },
        ],
        miskonsepsiUmum: [
          {
            miskonsepsi: 'Langsung membagi 24 N / 4 kg = 6 m/s² dengan mengabaikan gaya gesek.',
            caraMenangani: 'Wajibkan gambar panah gaya berlawanan sebelum menulis ΣF.',
          },
        ],
        pemetaanTP: [
          { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Menghitung resultan gaya berarah', aktivitasTerkait: 'Langkah 1 & Pertanyaan 1' },
          { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Menerapkan a = ΣF / m', aktivitasTerkait: 'Langkah 2 & Pertanyaan 2' },
        ],
        rubrikPenilaian: [
          {
            aspek: 'Pemodelan arah gaya & perhitungan Hukum II Newton',
            perluBimbingan: 'Mengabaikan arah gaya gesek atau keliru mengalikan F × m.',
            berkembang: 'Benar menghitung ΣF = 20 N tetapi lupa menulis satuan m/s².',
            cakap: 'Tepat menemukan ΣF = 20 N dan a = 5 m/s² beserta satuan SI.',
            mahir: 'Menuntaskan variasi massa 8 kg (2,5 m/s²) dan kondisi kecepatan konstan a = 0.',
          },
        ],
      },
    };
  }

  // Sains lainnya (Fotosintesis / Wujud Zat SD, Kalor/Zat SMP, Kimia/Biologi SMA, Projek IPAS SMK) dengan tabel data pengamatan riil sesuai jenjang
  const isSD = grade.gradeBand === 'sd_awal' || grade.gradeBand === 'sd_atas';
  const stimulusText = isSD
    ? 'Lani menaruh 2 sendok es batu di dua gelas plastik yang sama besar. Gelas A ditaruh di meja ruang kelas yang teduh, sedangkan Gelas B ditaruh di halaman sekolah yang terkena sinar matahari langsung. Setelah 5 menit, es di Gelas B sudah mencair seluruhnya sedangkan di Gelas A masih tersisa separuh. Bagaimana energi panas matahari memengaruhi kecepatan perubahan wujud es?'
    : lower.includes('kimia') || lower.includes('asam')
    ? 'Sebanyak tiga sampel cairan rumah tangga bening (Larutan X, Y, Z) diuji menggunakan kertas lakmus merah dan lakmus biru di meja praktik. Larutan X mengubah lakmus biru menjadi merah; Larutan Y mengubah lakmus merah menjadi biru; Larutan Z tidak mengubah warna kedua kertas lakmus. Tentukan sifat keasaman ketiga larutan berdasarkan data perubahan warna tersebut!'
    : 'Kelompok pengamat merendam dua potongan kentang segar dengan panjang awal tepat 4,0 cm selama 30 menit ke dalam dua gelas berbeda: Gelas A berisi air tawar murni, Gelas B berisi larutan garam 10%. Setelah 30 menit, panjang kentang di Gelas A bertambah menjadi 4,3 cm (keras/turgid), sedangkan di Gelas B menyusut menjadi 3,6 cm (lunak/lembek). Jelaskan arah perpindahan air pada kedua gelas berdasarkan data panjang awal vs akhir!';

  const expData = lower.includes('kimia') || lower.includes('asam')
    ? {
        tools: ['Kertas lakmus merah dan lakmus biru', 'Pelat tetes porselen dan pipet tetes plastik', '3 gelas sampel label X, Y, Z', 'Sarung tangan lateks & kacamata pelindung (APD lab)'],
        hipotesis: 'Larutan bersifat asam akan memerahkan lakmus biru, sedangkan larutan basa membirukan lakmus merah.',
        safety: ['Gunakan pelat tetes tetes demi tetes; JANGAN mencicipi atau mencium langsung uap larutan di laboratorium.'],
        table: {
          kolom: ['Sampel', 'Lakmus Merah Setelah Uji', 'Lakmus Biru Setelah Uji', 'Kesimpulan Sifat Larutan'],
          baris: [
            ['Larutan X', 'Tetap Merah', 'Berubah Merah', '.......................'],
            ['Larutan Y', 'Berubah Biru', 'Tetap Biru', '.......................'],
            ['Larutan Z', 'Tetap Merah', 'Tetap Biru', '.......................'],
          ],
        },
      }
    : {
        tools: isSD
          ? ['2 gelas plastik transparan sama besar', '4 potong es batu seukuran sama', 'Stopwatch / jam pengatur waktu 5 menit']
          : ['2 gelas kimia berisi 100 mL air tawar dan larutan garam 10%', '2 potongan kentang berpanjang awal tepat 4,0 cm', 'Penggaris milimeter dan pinset bersih (pisau dipotongkan/diawasi guru)'],
        hipotesis: isSD
          ? 'Semakin banyak energi panas diterima es batu di tempat terbuka matahari, semakin cepat es berubah wujud dari padat menjadi cair.'
          : 'Air berpindah dari konsentrasi air lebih tinggi menuju konsentrasi air lebih rendah (larutan lebih pekat) melalui membran sel.',
        safety: isSD
          ? ['Gelas plastik tidak mudah pecah; keringkan meja jika ada tetesan air es supaya lantai tidak licin.']
          : ['Pemotongan kentang dengan pisau atau cutter wajib berhati-hati pada alas talenan rata dan tidak menyayat ke arah tangan.'],
        table: isSD
          ? {
              kolom: ['Tempat Gelas', 'Wujud Awal (0 mnt)', 'Wujud Setelah 5 Menit', 'Sumber Energi Panas'],
              baris: [
                ['Gelas A (Kelas teduh)', 'Es padat (keras)', 'Separuh cair, separuh es', 'Udara ruang kelas'],
                ['Gelas B (Sinar matahari)', 'Es padat (keras)', 'Seluruhnya cair', 'Sinar matahari langsung'],
              ],
            }
          : {
              kolom: ['Perlakuan Gelas', 'Panjang Awal', 'Panjang Setelah 30 mnt', 'Selisih (ΔL)', 'Kondisi Tekstur Kentang'],
              baris: [
                ['Gelas A (Air tawar)', '4,0 cm', '4,3 cm', '+0,3 cm', 'Keras / kaku (turgid)'],
                ['Gelas B (Larutan garam 10%)', '4,0 cm', '3,6 cm', '-0,4 cm', 'Lunak / lembek'],
              ],
            },
      };

  return {
    isCuratedFixture: true,
    subJudulTopik: cleanTopicHeading(tp.materiPokok),
    pendekatanKegiatan:
      preset === 'eksperimen'
        ? 'Penyelidikan Ilmiah, Keselamatan Alat & Analisis Data Pengamatan'
        : 'Analisis Data Pengamatan & Penjelasan Ilmiah',
    modeKerja: 'Kelompok Kecil (3–4 Siswa)',
    alokasiWaktu: isSD ? '2 x 35 Menit' : '2 x 45 Menit',
    targetBelajarSiswa: [
      'Membaca dan menghitung perubahan data pada tabel pengamatan.',
      'Menarik kesimpulan ilmiah berdasarkan bukti pengukuran dan alasan mekanisme alamnya.',
    ],
    prasyaratMateri: tp.prasyarat || ['Membedakan variabel kondisi awal dan hasil pengamatan'],
    petunjukPengerjaan: [
      'Patuhi aturan keselamatan alat/bahan sebelum memulai pengamatan.',
      'Gunakan angka dan fakta langsung dari tabel data untuk menjawab pertanyaan analisis.',
    ],
    stimulusKasus: {
      judul: isSD
        ? 'Mengamati Perubahan Wujud Es di Dua Tempat Berbeda'
        : lower.includes('kimia') || lower.includes('asam')
        ? 'Data Uji Kertas Lakmus Tiga Sampel Cairan'
        : 'Pengamatan Panjang Potongan Kentang dalam Dua Larutan',
      teks: stimulusText,
      pertanyaanAwal: 'Perubahan apa yang langsung terlihat bila membandingkan kondisi awal dan kondisi akhir kedua perlakuan?',
    },
    stimulusData: {
      jenisData: 'tabel',
      tabelData: expData.table,
      catatanAsumsi: expData.safety.join(' '),
    },
    ...adaptPresetExtras(preset, tp.materiPokok, stimulusText, expData),
    langkahAktivitas: [
      {
        langkahKe: 1,
        judulLangkah: 'Periksa alat & identifikasi variabel pembeda kedua perlakuan',
        instruksi: 'Catat apa yang dibuat sama (kontrol) dan apa yang sengaja dibedakan (bebas) antardua gelas.',
        ruangJawabanJenis: 'uraian_singkat',
      },
      {
        langkahKe: 2,
        judulLangkah: 'Catat & olah data perbedaan pengamatan',
        instruksi: 'Bandingkan kondisi awal vs akhir tiap perlakuan menggunakan data tertera.',
        ruangJawabanJenis: 'uraian_singkat',
      },
      {
        langkahKe: 3,
        judulLangkah: 'Tulis penjelasan ilmiah sebab-akibat dari bukti data',
        instruksi: 'Jelaskan proses fisika/kimia/biologi yang menyebabkan perbedaan pengamatan antarperlakuan.',
        ruangJawabanJenis: 'uraian_panjang',
      },
    ],
    pemeriksaanHasil: [
      'Periksa apakah kesimpulanmu merujuk langsung kepada fakta pengukuran atau perubahan warna pada tabel.',
    ],
    pertanyaanAnalisis: [
      {
        id: 'q-sains-1',
        nomor: 1,
        tingkatKognitif: 'Dasar',
        alasanTingkatKognitif: 'Membaca langsung perbandingan hasil antarperlakuan di tabel/stimulus.',
        ruangJawabanJenis: 'uraian_singkat',
        pertanyaan: isSD
          ? 'Di gelas mana es batu mencair lebih cepat, dan faktor lingkungan apa yang menyebabkannya?'
          : 'Dari data pengamatan kedua perlakuan/sampel, hasil berbeda apa yang tampak paling jelas?',
        panduanJawabanSingkat: isSD
          ? 'Gelas B mencair lebih cepat karena menerima energi panas sinar matahari langsung lebih besar daripada ruang teduh.'
          : 'Terdapat perubahan terukur berlawanan arah (asam vs basa atau bertambah +0,3 cm vs menyusut -0,4 cm).',
      },
      {
        id: 'q-sains-2',
        nomor: 2,
        tingkatKognitif: 'Menengah',
        alasanTingkatKognitif: 'Menjelaskan mekanisme ilmiah di balik data empiris tanpa menebak di luar fakta.',
        ruangJawabanJenis: 'uraian_panjang',
        pertanyaan: isSD
          ? 'Apakah jumlah molekul air setelah mencair ikut hilang atau hanya berubah wujudnya dari padat ke cair? Jelaskan!'
          : 'Jelaskan mekanisme ilmiah yang menyebabkan perbedaan pengamatan pada data di atas!',
        panduanJawabanSingkat: isSD
          ? 'Air tidak hilang, hanya berubah wujud dari es (padat) menjadi air (cair) karena menyerap kalor.'
          : lower.includes('kimia')
          ? 'Larutan X melepas ion H+ (asam, memerahkan lakmus biru), Y melepas OH- (basa, membirukan merah), Z netral.'
          : 'Osmosis: air masuk ke sel kentang pada air tawar (+0,3 cm), sedangkan air keluar menuju larutan garam pekat (-0,4 cm).',
      },
    ],
    dukunganTambahan: 'Bandingkan selalu hasil eksperimen terhadap perlakuan awal sebelum menarik kesimpulan umum.',
    pengayaan: {
      instruksi: 'Pengayaan terkait TP:',
      tugas: [
        isSD
          ? 'Bagaimana cara agar potongan es di Gelas C bertahan lebih lama dibanding Gelas A tanpa kulkas? Sebutkan bahan isolatornya!'
          : 'Bagaimana perubahan prosedur kontrol agar perbandingan tetap adil jika menggunakan alat/larutan berbeda?',
      ],
    },
    kesimpulanRefleksi: [
      'Kesimpulan pengamatan: Perubahan pada perlakuan terjadi karena ...... yang didukung oleh bukti data .......',
      'Langkah keselamatan dan ketelitian ukur mana yang wajib diperhatikan pada pengamatan ini?',
    ],
    panduanGuru: {
      kunciDanContohJawaban: [
        {
          nomor: 1,
          jawabanInti: isSD ? 'Gelas B karena energi panas matahari lebih besar.' : 'Identifikasi akurat dari data tabel pengamatan.',
          langkahPenyelesaian: ['Bandingkan kolom perlakuan A vs B atau sampel X, Y, Z.'],
        },
        {
          nomor: 2,
          jawabanInti: isSD ? 'Hanya berubah wujud (menyerap kalor), bukan hilang.' : 'Penjelasan mekanisme ilmiah tepat (ion H+/OH- atau osmosis air).',
          langkahPenyelesaian: ['Kaitkan langsung bukti data terukur dengan prinsip materi.'],
        },
      ],
      miskonsepsiUmum: [
        {
          miskonsepsi: isSD
            ? 'Mengira es yang mencair "menghilang menjadi dingin" bukan air cair, atau mengira ukuran gelas memicu mencairnya es.'
            : 'Mengira larutan garam memberi garam masuk membuat berat berkurang, padahal air keluar lewat osmosis.',
          caraMenangani: 'Tunjukkan wadah tertimbang / volume akhir atau tekankan peran panas / perbedaan konsentrasi pelarut.',
        },
      ],
      pemetaanTP: [
        { kodeSubTP: `${tp.kode}.A`, kompetensiTarget: 'Mengamati & mencatat data dengan aman', aktivitasTerkait: 'Langkah 1–2 & Pertanyaan 1' },
        { kodeSubTP: `${tp.kode}.B`, kompetensiTarget: 'Menjelaskan sebab ilmiah berbasis data', aktivitasTerkait: 'Langkah 3 & Pertanyaan 2' },
      ],
      rubrikPenilaian: [
        {
          aspek: 'Kepatuhan keselamatan & penjelasan ilmiah berbasis bukti',
          perluBimbingan: 'Mengabaikan keselamatan atau menyimpulkan tanpa menyebut data angka/warna tabel.',
          berkembang: 'Mencatat hasil tabel dengan benar tetapi alasan ilmiah masih kurang tepat.',
          cakap: 'Mencatat data, menjaga keselamatan kerja, dan menjelaskan hubungan bukti dengan konsep ilmiah secara tepat.',
          mahir: 'Menjawab tepat semua soal, mengidentifikasi variabel kontrol lengkap, dan memberi saran pengendalian galat/isolator.',
        },
      ],
    },
  };
}

/**
 * Dispatcher Kurasi Lintas Seluruh Jenjang & Mapel + Adaptive Discipline Fallback
 */
function withOptionalContext(
  fixture: CuratedLKPDContent,
  konteksAktual?: string
): CuratedLKPDContent {
  const ctxText = konteksAktual?.trim();
  if (!ctxText) return fixture;
  if (fixture.stimulusKasus.teks.toLowerCase().includes(ctxText.toLowerCase())) {
    return fixture;
  }
  return {
    ...fixture,
    subJudulTopik: `${fixture.subJudulTopik} (${ctxText})`,
    stimulusKasus: {
      ...fixture.stimulusKasus,
      teks: `${fixture.stimulusKasus.teks} Fokus konteks lokal yang ditelaah pada sesi ini: ${ctxText}.`,
    },
  };
}

export function buildCuratedOrAdaptiveLKPDContent(
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType,
  konteksAktual?: string
): CuratedLKPDContent {
  const mathFixture = buildMathOtherCuratedFixture(tp, profile, presetType, konteksAktual);
  if (mathFixture) return withOptionalContext(mathFixture, konteksAktual);

  const sainsFixture = buildSainsCuratedFixture(tp, profile, presetType);
  if (sainsFixture) return withOptionalContext(sainsFixture, konteksAktual);

  const extendedFixture = buildExtendedSubjectFixture(tp, profile, presetType, konteksAktual);
  if (extendedFixture) return withOptionalContext(extendedFixture, konteksAktual);

  // Fallback Adaptif Non-Generik untuk topik kustom baru yang dibuat guru
  const jenjangProf = resolveJenjangPedagogicalProfile(profile.jenjang, profile.kelasUtama);
  const family = resolveSubjectFamily(profile.mataPelajaranUtama);
  const rule = resolveSubjectApproachRule(family, presetType);
  const cleanMateri = cleanTopicHeading(tp.materiPokok);
  const ctxText = konteksAktual?.trim();

  const targetList =
    tp.subTP && tp.subTP.length > 0
      ? tp.subTP.slice(0, 3).map((s) => `${s.kompetensi} (${s.kode})`)
      : [tp.tujuanPembelajaran];

  const adaptiveStimulusText = ctxText
    ? `Kajian materi "${cleanMateri}" dalam mata pelajaran ${profile.mataPelajaranUtama} (${jenjangProf.labelJenjang}) difokuskan pada konteks "${ctxText}". Catat data awal, kutipan sumber, atau hasil pengamatan dari konteks tersebut ke dalam lembar kerja di bawah ini sebelum dianalisis.`
    : `Kegiatan belajar ini membahas materi "${cleanMateri}" pada mata pelajaran ${profile.mataPelajaranUtama} (${jenjangProf.labelJenjang}) untuk mencapai tujuan: ${tp.tujuanPembelajaran}. Gunakan data, catatan pengamatan, atau contoh nyata yang disiapkan di kelas sebagai dasar jawaban.`;

  const extras = adaptPresetExtras(presetType, cleanMateri, adaptiveStimulusText);

  return {
    isCuratedFixture: false,
    subJudulTopik: ctxText ? `${cleanMateri}: ${ctxText}` : cleanMateri,
    pendekatanKegiatan: rule.preferredModesByPreset[presetType],
    modeKerja: jenjangProf.defaultWorkMode,
    alokasiWaktu: `${jenjangProf.defaultDurationMinutes} Menit (${profile.jenjang} Kelas ${profile.kelasUtama})`,
    targetBelajarSiswa: targetList,
    prasyaratMateri:
      tp.prasyarat && tp.prasyarat.length > 0
        ? tp.prasyarat
        : [`Pengetahuan pengantar pada elemen ${tp.elemen}`],
    petunjukPengerjaan: [
      'Baca sasaran belajar dan periksa apakah data/rujukan yang diperlukan sudah tersedia pada kolom informasi.',
      `Gunakan ${rule.preferredModesByPreset[presetType].toLowerCase()} secara runtut.`,
      'Periksa kembali kelengkapan satuan, bukti, atau alasan di setiap jawaban.',
    ],
    stimulusKasus: {
      judul: ctxText ? `Bahan Kajian: ${ctxText}` : `Bahan Kajian: ${cleanMateri}`,
      teks: adaptiveStimulusText,
      pertanyaanAwal: `Informasi atau data kunci apa yang perlu diidentifikasi untuk mencapai tujuan "${tp.tujuanPembelajaran}"?`,
    },
    stimulusData: {
      jenisData: 'daftar_fakta',
      poinKunci: [
        `Elemen acuan: ${tp.elemen}`,
        `Sasaran kompetensi: ${tp.kompetensiInti || tp.tujuanPembelajaran}`,
        'Ruang data lokal (dapat diisi guru sebelum dicetak)',
      ],
    },
    ...extras,
    langkahAktivitas: [
      {
        langkahKe: 1,
        judulLangkah: 'Catat data atau fakta dari bahan kajian',
        instruksi: `Identifikasi informasi kunci dari stimulus di atas yang diperlukan untuk mempelajari "${cleanMateri}".`,
        bantuanAtauTabel: [
          'Data / fakta 1: ............................................................',
          'Data / fakta 2: ............................................................',
        ],
        ruangJawabanJenis: family === 'matematika' ? 'perhitungan' : 'uraian_singkat',
      },
      {
        langkahKe: 2,
        judulLangkah: 'Olahlah data sesuai tujuan pembelajaran',
        instruksi: `Terapkan langkah kerja ${rule.labelRumpun} (${rule.activityRequirement}) untuk menyelesaikan target "${tp.kompetensiInti || tp.tujuanPembelajaran}".`,
        ruangJawabanJenis: family === 'matematika' ? 'perhitungan' : 'uraian_panjang',
      },
      {
        langkahKe: 3,
        judulLangkah: 'Verifikasi kecocokan hasil terhadap syarat tugas',
        instruksi: 'Cocokkan hasil pekerjaan dengan prasyarat atau bukti ketercapaian TP.',
        ruangJawabanJenis: 'uraian_singkat',
      },
    ],
    pemeriksaanHasil: [
      'Pastikan seluruh jawaban mengacu langsung pada data yang disediakan dan tujuan pembelajaran tercapai.',
    ],
    pertanyaanAnalisis: [
      {
        id: 'q-adp-1',
        nomor: 1,
        tingkatKognitif: 'Dasar',
        alasanTingkatKognitif: 'Identifikasi langsung unsur atau fakta awal dari topik sasaran.',
        ruangJawabanJenis: 'uraian_singkat',
        pertanyaan: `Unsur atau fakta utama apa dari bahan "${cleanMateri}" yang menjadi dasar untuk menjawab tugas ini?`,
        panduanJawabanSingkat: `Siswa menyebutkan kembali data/unsur relevan dari stimulus yang berkaitan dengan ${cleanMateri} (sesuaikan dengan data konkret yang diisikan guru).`,
      },
      {
        id: 'q-adp-2',
        nomor: 2,
        tingkatKognitif: 'Menengah',
        alasanTingkatKognitif: 'Menuntut penerapan konsep untuk menyelesaikan atau menguji variasi kondisi.',
        ruangJawabanJenis: 'uraian_panjang',
        pertanyaan: `Jelaskan langkah penalaran atau pembuktian untuk memastikan solusimu pada masalah "${cleanMateri}" sudah tepat!`,
        panduanJawabanSingkat: 'Siswa menunjukkan alur langkah kerja dan memeriksa kesesuaiannya terhadap syarat data stimulus.',
      },
    ],
    dukunganTambahan: jenjangProf.scaffoldingNote,
    pengayaan: {
      instruksi: 'Pengayaan terkait TP:',
      tugas: [`Uji kembali pekerjaanmu dengan mengubah satu syarat awal pada "${cleanMateri}" lalu jelaskan perubahannya.`],
    },
    kesimpulanRefleksi: [
      `Kesimpulan: Untuk menuntaskan "${cleanMateri}", bagian terpenting yang perlu diperiksa adalah ....................`,
      'Pada bagian mana kamu masih membutuhkan bimbingan: memahami data stimulus, langkah pemecahan, atau pemeriksaan hasil?',
    ],
    panduanGuru: {
      kunciDanContohJawaban: [
        {
          nomor: 1,
          jawabanInti: `Sesuaikan jawaban kunci spesifik dengan data konkret yang Anda isikan untuk "${cleanMateri}".`,
          langkahPenyelesaian: ['Pastikan setiap pertanyaan terikat langsung ke data di kolom stimulus sebelum LKPD dibagikan.'],
        },
        {
          nomor: 2,
          jawabanInti: 'Langkah pemeriksaan bukti tergantung pada data konkret yang ditetapkan guru.',
          langkahPenyelesaian: ['Gunakan langkah pemeriksaan balik sesuai rumpun mata pelajaran.'],
        },
      ],
      miskonsepsiUmum: [
        {
          miskonsepsi: 'Siswa menjawab secara umum tanpa merujuk pada data konkret atau bukti tertulis.',
          caraMenangani: 'Pastikan kotak stimulus memuat angka/teks/data konkret dan arahkan siswa menandai bagian sumber sebelum menjawab.',
        },
      ],
      pemetaanTP: [
        {
          kodeSubTP: tp.kode,
          kompetensiTarget: tp.tujuanPembelajaran,
          aktivitasTerkait: 'Langkah 1–3 & Pertanyaan 1–2 (Perlu dilengkapi data konkret guru)',
        },
      ],
      rubrikPenilaian: [
        {
          aspek: `Penguasaan bukti ${cleanMateri}`,
          perluBimbingan: 'Jawaban tidak menggunakan fakta stimulus dan masih berupa pernyataan umum.',
          berkembang: 'Mencatat fakta dasar dengan benar tetapi proses penyelesaiannya belum runtut.',
          cakap: 'Mengolah data stimulus secara runtut menuju jawaban sesuai tujuan pembelajaran.',
          mahir: 'Menuntaskan seluruh tugas disertai pemeriksaan ulang dan penalaran atas variasi kondisi.',
        },
      ],
      catatanKurikulum:
        'Draf adaptif ini membutuhkan tinjauan dan pengisian data spesifik oleh guru sebelum dicetak ke siswa.',
    },
    validationStatus: {
      status: 'perlu_review_guru',
      usedFallback: true,
      isCuratedFixture: false,
      issues: [
        `Topik kustom "${cleanMateri}" menggunakan kerangka adaptif rumpun ${rule.labelRumpun} — mohon lengkapi stimulus dengan data konkret lokal sebelum dibagikan ke siswa.`,
      ],
      warnings: [],
    },
  };
}

export function buildLKPDDokumenFromCurated(
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType,
  content: CuratedLKPDContent,
  konteksAktual?: string,
  tpSourceHash?: string
): LKPDDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  return {
    id: `lkpd-${tp.id}-${Date.now().toString(36)}`,
    tpId: tp.id,
    presetType,
    konteksAktual: konteksAktual?.trim() || undefined,
    judul: content.subJudulTopik,
    pendekatanKegiatan: content.pendekatanKegiatan,
    modeKerja: content.modeKerja,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    rombel: profile.rombelAktif,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    namaSekolah: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    kotaSekolah: profile.kotaSekolah,
    createdAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    tpKode: tp.kode,
    elemen: tp.elemen,
    materiPokok: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    targetBelajarSiswa: content.targetBelajarSiswa,
    prasyaratMateri: content.prasyaratMateri,
    targetSubTP: tp.subTP?.map((s) => ({
      id: s.id,
      kode: s.kode,
      kompetensi: s.kompetensi,
    })),
    alokasiWaktu: content.alokasiWaktu,
    tpSourceHash,
    needsReview: false,
    petunjukPengerjaan: content.petunjukPengerjaan,
    stimulusKasus: content.stimulusKasus,
    stimulusData: content.stimulusData,
    eksperimenData: content.eksperimenData,
    diferensiasiData: content.diferensiasiData,
    proyekData: content.proyekData,
    langkahAktivitas: content.langkahAktivitas,
    pemeriksaanHasil: content.pemeriksaanHasil,
    pertanyaanAnalisis: content.pertanyaanAnalisis,
    dukunganTambahan: content.dukunganTambahan,
    pengayaan: content.pengayaan,
    kesimpulanRefleksi: content.kesimpulanRefleksi,
    panduanGuru: content.panduanGuru,
    catatanValidasi: content.validationStatus,
  };
}
