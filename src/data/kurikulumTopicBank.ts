import type { JenjangFase } from '../types/assessment';

export interface SubTPBlueprint {
  kodeSuffix: string;
  kompetensi: string;
  fokusMateri: string;
  buktiKetercapaian: string;
  estimasiMenit?: number;
}

export interface RichTopicSuggestion {
  topik: string;
  elemen: string;
  arahanRangkuman: string;
  tujuanPembelajaran: string;
  kompetensiInti: string;
  prasyarat: string[];
  buktiKetercapaian: string[];
  estimasiMenitSesi: number;
  subTP: SubTPBlueprint[];
}

function defaultSubTP(
  topik: string,
  tujuan: string,
  bukti: string[],
  estimasiMenit = 80
): SubTPBlueprint[] {
  const half = Math.max(35, Math.round(estimasiMenit / 2));
  return [
    {
      kodeSuffix: 'A',
      kompetensi: `Mengidentifikasi konsep inti dan informasi penting pada ${topik}`,
      fokusMateri: topik,
      buktiKetercapaian:
        bukti[0] || `Peserta didik mencatat konsep atau data kunci ${topik} dengan benar.`,
      estimasiMenit: half,
    },
    {
      kodeSuffix: 'B',
      kompetensi: tujuan,
      fokusMateri: topik,
      buktiKetercapaian:
        bukti[1] ||
        `Peserta didik menerapkan konsep ${topik} pada tugas terstruktur dan menjelaskan alasannya.`,
      estimasiMenit: half,
    },
  ];
}

function makeRich(
  elemen: string,
  topik: string,
  tujuanPembelajaran: string,
  arahanRangkuman: string,
  kompetensiInti: string,
  prasyarat: string[],
  buktiKetercapaian: string[],
  estimasiMenitSesi = 80,
  subTP?: SubTPBlueprint[]
): RichTopicSuggestion {
  return {
    topik,
    elemen,
    arahanRangkuman,
    tujuanPembelajaran,
    kompetensiInti,
    prasyarat,
    buktiKetercapaian,
    estimasiMenitSesi,
    subTP: subTP || defaultSubTP(topik, tujuanPembelajaran, buktiKetercapaian, estimasiMenitSesi),
  };
}

function parseFaseBucket(jenjangFase: JenjangFase, kelas: string): 'sd_awal' | 'sd_atas' | 'smp' | 'sma_smk' {
  const k = parseInt(kelas.replace(/[^0-9]/g, ''), 10);
  if (jenjangFase.includes('Fase A') || (k >= 1 && k <= 2)) return 'sd_awal';
  if (jenjangFase.includes('SD') || (k >= 3 && k <= 6)) return 'sd_atas';
  if (jenjangFase.includes('SMP') || (k >= 7 && k <= 9)) return 'smp';
  return 'sma_smk';
}

export function getRichCurriculumTopics(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string
): RichTopicSuggestion[] {
  const lower = mataPelajaran.toLowerCase();
  const bucket = parseFaseBucket(jenjangFase, kelas);
  const isSMK =
    lower.includes('kejuruan') ||
    lower.includes('profesi') ||
    lower.includes('pkk') ||
    lower.includes('projek ipas');

  // 1. MATEMATIKA (Umum & Kejuruan)
  if (lower.includes('matematika')) {
    if (bucket === 'sd_awal') {
      return [
        makeRich(
          'Bilangan',
          'Penjumlahan dan Pengurangan Bilangan Cacah sampai 20 dengan Benda Konkret',
          'Peserta didik dapat membilang, menjumlahkan, dan mengurangkan bilangan cacah sampai 20 menggunakan benda konkret di sekitar kelas.',
          'Gunakan gambar atau hitungan benda konkret (pensil, buku, kelereng) langkah demi langkah untuk penjumlahan dan pengurangan sampai 20.',
          'Menghitung gabungan dan sisa kelompok benda secara tepat lalu menuliskannya dalam kalimat matematika sederhana.',
          ['Membilang bilangan 1 sampai 20 secara berurutan'],
          ['Hasil penjumlahan/pengurangan sampai 20 tepat', 'Mampu menghubungkan cerita bergambar dengan simbol + atau −'],
          70
        ),
        makeRich(
          'Pengukuran',
          'Membandingkan Panjang dan Berat Benda dengan Satuan Tidak Baku',
          'Peserta didik dapat mengukur dan membandingkan panjang serta berat benda di kelas menggunakan satuan tidak baku seperti jengkal atau klip.',
          'Jelaskan cara mengukur panjang meja dengan jengkal atau pensil secara berhimpit tanpa celah dan membandingkan benda mana yang lebih panjang/berat.',
          'Mengukur benda nyata dan mengurutkan dari yang paling pendek/ringan ke paling panjang/berat.',
          ['Mengenal istilah lebih panjang, lebih pendek, lebih berat, lebih ringan'],
          ['Mencatat hasil pengukuran dalam jengkal/pensil', 'Menyimpulkan perbandingan ukuran antarbenda dengan benar'],
          70
        ),
        makeRich(
          'Geometri',
          'Mengenal Bangun Datar Sederhana di Sekitar Kelas (Segitiga, Segiempat, Lingkaran)',
          'Peserta didik dapat mengelompokkan benda sekitar berdasarkan bentuk segitiga, segiempat, dan lingkaran serta menghitung sisi lurusnya.',
          'Tunjukkan ciri sisi dan sudut pada papan tulis, buku, roda, dan penggaris segitiga disertai contoh benda di kelas.',
          'Mengidentifikasi bentuk bangun datar pada benda nyata dan menyebutkan jumlah sisinya.',
          ['Mengamati bentuk benda di lingkungan kelas'],
          ['Mengelompokkan benda ke kategori segitiga/segiempat/lingkaran dengan tepat'],
          70
        ),
        makeRich(
          'Analisis Data & Peluang',
          'Mengelompokkan Benda dan Membaca Gambar Data Sederhana',
          'Peserta didik dapat mengelompokkan benda menurut warna atau jenis lalu membaca banyak benda pada daftar gambar sederhana.',
          'Bimbing siswa menghitung tiap kelompok benda, menuliskannya dalam turus sederhana, dan menemukan kelompok terbanyak atau tersedikit.',
          'Menyortir benda ke dalam kategori dan menyebutkan selisih jumlah kelompok.',
          ['Membilang benda 1 sampai 20'],
          ['Jumlah tiap kelompok dihitung tepat dan kesimpulan terbanyak/tersedikit benar'],
          70
        ),
      ];
    }

    if (bucket === 'sd_atas') {
      return [
        makeRich(
          'Bilangan',
          'Pecahan Senilai, Desimal, dan Persen dalam Masalah Sehari-hari',
          'Peserta didik dapat membandingkan pecahan berpenyebut berbeda melalui pecahan senilai serta mengubahnya ke bentuk desimal dan persen.',
          'Gunakan model batang pecahan atau potongan kue, penyamaan penyebut dengan KPK, dan contoh belanja diskon persen sederhana.',
          'Menyatakan bagian keseluruhan dalam pecahan, desimal, dan persen secara konsisten.',
          ['Memahami arti pembilang dan penyebut pecahan sederhana'],
          ['Menentukan pecahan senilai dengan penyamaan penyebut', 'Mengonversi pecahan biasa ke desimal dan persen dengan akurat'],
          70
        ),
        makeRich(
          'Pengukuran',
          'Keliling dan Luas Bangun Datar (Persegi, Persegi Panjang, Segitiga)',
          'Peserta didik dapat menghitung keliling dan luas persegi, persegi panjang, serta segitiga dan menerapkannya pada denah ruang kelas.',
          'Bedakan makna keliling (panjang garis tepi, satuan cm/m) dengan luas (banyak petak satuan/area, satuan cm²/m²) lengkap dengan contoh terhitung.',
          'Menghitung keliling dan luas bangun datar tunggal beserta satuannya dengan tepat.',
          ['Perkalian dan penjumlahan bilangan cacah'],
          ['Membedakan rumus & satuan keliling dan luas', 'Menyelesaikan masalah ukuran taman/ubin dengan benar'],
          70
        ),
        makeRich(
          'Bilangan',
          'KPK dan FPB dalam Pemecahan Masalah Pembagian dan Jadwal Berulang',
          'Peserta didik dapat menentukan KPK dan FPB dua bilangan dan membedakan penerapannya pada soal cerita jadwal bersamaan atau pembagian sama banyak.',
          'Sajikan pohon faktor/tabel sengkedan, kata kunci membedakan soal KPK vs FPB, serta pengecekan hasil dengan faktorisasi prima.',
          'Menentukan KPK/FPB dan memilih metode tepat sesuai konteks soal.',
          ['Perkalian dasar 1–100 dan bilangan prima kecil (2, 3, 5, 7)'],
          ['Menentukan FPB untuk pembagian bingkisan sama rata atau KPK untuk jadwal bertemu kembali'],
          70
        ),
        makeRich(
          'Analisis Data & Peluang',
          'Pengumpulan Data, Tabel Frekuensi, dan Diagram Batang Sederhana',
          'Peserta didik dapat menyajikan data hasil survei kelas ke tabel frekuensi dan diagram batang serta membaca informasi selisih data.',
          'Langkah menyusun tabel frekuensi berurut, memilih skala sumbu tegak yang konsisten, dan menjawab pertanyaan perbandingan antarbatang.',
          'Menyajikan data diskrit ke diagram batang berjarak rapi dan membaca nilai modus serta selisihnya.',
          ['Penjumlahan dan pengurangan bilangan cacah'],
          ['Tabel frekuensi sesuai data mentah', 'Interpretasi data terbanyak, tersedikit, dan selisih akurat'],
          70
        ),
      ];
    }

    if (bucket === 'smp') {
      return [
        makeRich(
          'Aljabar',
          'Sistem Persamaan Linear Dua Variabel (SPLDV)',
          'Peserta didik dapat memodelkan dua informasi kontekstual ke dalam SPLDV, menyelesaikannya dengan metode yang sesuai, serta memeriksa kebenaran solusi pada konteks.',
          'Langkah mendefinisikan variabel beserta satuan, menyusun dua persamaan linear, menyelesaikan dengan metode substitusi/eliminasi, dan memeriksa solusi ke kedua persamaan.',
          'Memodelkan dua hubungan linear, menyelesaikan SPLDV secara runtut, dan memeriksa pasangan nilai.',
          ['Operasi hitung bilangan bulat dan desimal', 'Menyelesaikan persamaan linear satu variabel (PLSV)'],
          [
            'Menuliskan definisi dua variabel beserta satuan dengan jelas',
            'Menyusun dua persamaan sesuai syarat masalah',
            'Menemukan pasangan nilai (x, y) dan memverifikasinya ke kedua persamaan',
          ],
          80,
          [
            {
              kodeSuffix: 'A',
              kompetensi: 'Menentukan dua variabel beserta arti dan satuannya dari masalah kontekstual',
              fokusMateri: 'Identifikasi besaran dan variabel SPLDV',
              buktiKetercapaian: 'Peserta didik menuliskan pemisalan x dan y lengkap dengan objek dan satuannya.',
              estimasiMenit: 20,
            },
            {
              kodeSuffix: 'B',
              kompetensi: 'Menyusun dua persamaan linear berdasarkan dua informasi yang saling terkait',
              fokusMateri: 'Pemodelan dua persamaan SPLDV',
              buktiKetercapaian: 'Kedua persamaan linear dua variabel tepat merepresentasikan dua kondisi.',
              estimasiMenit: 20,
            },
            {
              kodeSuffix: 'C',
              kompetensi: 'Menyelesaikan SPLDV dengan metode yang sesuai dan menunjukkan langkahnya',
              fokusMateri: 'Penyelesaian aljabar (substitusi/eliminasi/campuran)',
              buktiKetercapaian: 'Langkah perhitungan menghasilkan nilai x dan y yang konsisten.',
              estimasiMenit: 25,
            },
            {
              kodeSuffix: 'D',
              kompetensi: 'Memeriksa pasangan solusi pada kedua persamaan serta menafsirkan hasil dalam konteks',
              fokusMateri: 'Verifikasi solusi dan interpretasi konteks',
              buktiKetercapaian: 'Substitusi ke dua persamaan benar dan kesimpulan menyebutkan harga/besaran bersatuan.',
              estimasiMenit: 15,
            },
          ]
        ),
        makeRich(
          'Geometri',
          'Teorema Pythagoras dan Tripel Pythagoras pada Jarak Nyata',
          'Peserta didik dapat memverifikasi hubungan sisi siku-siku dengan sisi miring pada segitiga siku-siku dan menghitung jarak pada masalah kontekstual tangga atau denah.',
          'Hubungan kuadrat a² + b² = c², identifikasi sisi terpanjang (hipotenusa), tripel Pythagoras (3-4-5, 5-12-13, 8-15-17), serta pengecekan segitiga siku-siku.',
          'Menentukan sisi miring atau sisi tegak segitiga siku-siku dan memeriksa syarat sudut siku-siku.',
          ['Bilangan kuadrat dan akar kuadrat sempurna', 'Unsur segitiga dan jenis sudut'],
          [
            'Mengidentifikasi hipotenusa dengan tepat sebelum memasukkan rumus',
            'Menghitung panjang sisi yang belum diketahui beserta satuannya',
          ],
          80
        ),
        makeRich(
          'Analisis Data & Peluang',
          'Ukuran Pemusatan Data (Mean, Median, Modus) dan Penafsiran Sebaran',
          'Peserta didik dapat menghitung mean, median, dan modus dari sekumpulan data serta membandingkan pengaruh nilai pencilan terhadap kesimpulan rata-rata.',
          'Perbedaan mean (rata-rata), median (nilai tengah data terurut), dan modus (frekuensi terbanyak) beserta pengaruh data ekstrem/outlier.',
          'Menghitung tiga ukuran pemusatan data dan memilih ukuran representatif ketika ada nilai pencilan.',
          ['Operasi pecahan dan pengurutan bilangan rasional'],
          [
            'Data diurutkan lebih dulu sebelum menentukan median',
            'Perhitungan jumlah dan rata-rata akurat dan alasan memilih median/mean logis',
          ],
          80
        ),
        makeRich(
          'Bilangan',
          'Operasi Bilangan Bulat, Pecahan, dan Rasio dalam Anggaran Belanja',
          'Peserta didik dapat menyelesaikan masalah perbandingan senilai, rasio harga satuan, dan operasi bilangan rasional dalam perencanaan anggaran sederhana.',
          'Perbandingan senilai vs berbalik nilai, penentuan harga per unit, serta operasi penjumlahan/perkalian bilangan bulat dan pecahan.',
          'Membandingkan nilai ekonomis dua paket barang dengan rasio satuan yang tepat.',
          ['Operasi bilangan bulat positif/negatif dan pecahan dasar'],
          ['Perhitungan harga per satuan atau total belanja akurat dan dibandingkan secara adil'],
          80
        ),
      ];
    }

    // SMA / MA / SMK
    if (isSMK) {
      return [
        makeRich(
          'Bilangan & Aljabar Keuangan',
          'Aritmetika Kejuruan, Persentase Keuntungan, dan Titik Impas (BEP)',
          'Peserta didik dapat menghitung harga pokok produksi, margin keuntungan, serta menentukan jumlah unit dan nilai rupiah titik impas (BEP) suatu usaha kejuruan.',
          'Biaya tetap vs biaya variabel per unit, rumus HPP per unit, BEP unit = FC / (Harga - VC), dan interpretasi laba-rugi.',
          'Menyusun perhitungan biaya dan membuktikan titik balik modal sebelum memproduksi lebih lanjut.',
          ['Operasi hitung desimal/persen dan persamaan linear satu variabel'],
          ['BEP unit dan rupiah terhitung benar dan dicek terhadap total biaya = total pendapatan'],
          90
        ),
        makeRich(
          'Aljabar & Fungsi',
          'Sistem Persamaan Linear dan Matriks Kapasitas Produksi',
          'Peserta didik dapat memodelkan kendala bahan dan jam mesin menggunakan matriks ordo 2×2 atau SPL dua variabel untuk menentukan alokasi produksi.',
          'Operasi matriks 2×2, determinan ad − bc, invers matriks, dan kaitannya dengan sistem persamaan linear.',
          'Menyusun model matriks dan menghitung solusi alokasi bahan secara terverifikasi.',
          ['SPLDV dan operasi bilangan bulat/rasional'],
          ['Determinan tidak nol dan hasil substitusi solusi memenuhi kedua kendala mesin/bahan'],
          90
        ),
        makeRich(
          'Geometri & Pengukuran',
          'Rasio Skala Gambar Teknik dan Trigonometri Sudut Elevasi',
          'Peserta didik dapat menghitung ukuran sebenarnya dari gambar berskala dan menggunakan perbandingan sin/cos/tan untuk menentukan tinggi atau kemiringan konstruksi.',
          'Konversi skala gambar teknik (1:n) dan perbandingan sisi segitiga siku-siku pada sudut istimewa (30°, 45°, 60°).',
          'Mengubah dimensi gambar ke satuan lapangan dan memilih perbandingan trigonometri yang sesuai.',
          ['Teorema Pythagoras dan konversi satuan panjang'],
          ['Dimensi sebenarnya dan panjang sisi terukur tepat disertai satuan'],
          90
        ),
        makeRich(
          'Analisis Data & Peluang',
          'Statistika Kendali Mutu dan Peluang Kerusakan Sampel Produksi',
          'Peserta didik dapat menghitung persentase cacat produk, rata-rata masa ukur, serta peluang terambilnya sampel tidak sesuai standar pada lini kerja.',
          'Frekuensi relatif, peluang teoretik P(A) = n(A)/n(S), dan interpretasi batas toleransi mutu.',
          'Mengolah data hasil inspeksi sampel dan menentukan apakah tingkat cacat melampaui ambang batas.',
          ['Operasi pecahan, desimal, dan persentase'],
          ['Frekuensi relatif dan peluang sampel terhitung tepat dari data pengamatan'],
          90
        ),
      ];
    }

    return [
      makeRich(
        'Aljabar & Fungsi',
        'Barisan dan Deret Aritmetika serta Geometri dalam Pertumbuhan',
        'Peserta didik dapat membedakan pola beda tetap (aritmetika) vs rasio tetap (geometri), merumuskan Un dan Sn, serta menghitung akumulasi tabungan atau pertumbuhan.',
        'Perbandingan suku ke-n dan jumlah n suku pertama aritmetika vs geometri beserta penerapannya pada cicilan tetap atau pertumbuhan periodik.',
        'Mengidentifikasi jenis barisan dari data suku awal, menghitung Un dan Sn, dan memverifikasi hasilnya.',
        ['Pola bilangan dan sifat perpangkatan dasar'],
        ['Rumus beda/rasio tepat dan hasil suku/jumlah terkonfirmasi dengan penjumlahan manual'],
        90
      ),
      makeRich(
        'Geometri',
        'Perbandingan Trigonometri Segitiga Siku-siku untuk Pengukuran Jarak',
        'Peserta didik dapat memilih rasio sin, cos, atau tan berdasarkan letak sudut dan menghitung tinggi objek atau jarak mendatar secara tidak langsung.',
        'Definisi sisi depan, samping, miring terhadap sudut lancip; sudut istimewa 30°, 45°, 60°; serta penerapan pengukuran klinometer.',
        'Memodelkan situasi sudut elevasi ke segitiga siku-siku dan menghitung sisi yang ditanyakan.',
        ['Teorema Pythagoras dan operasi bentuk akar'],
        ['Sketsa segitiga siku-siku benar dengan penempatan sudut tepat', 'Hasil ukur rasional beserta satuannya'],
        90
      ),
      makeRich(
        'Aljabar & Fungsi',
        'Operasi Matriks Ordo 2×2, Determinan, dan Invers',
        'Peserta didik dapat melakukan penjumlahan dan perkalian matriks 2×2, menghitung determinan serta invers, dan menyelesaikannya untuk persamaan matriks.',
        'Syarat ukuran penjumlahan vs perkalian matriks, determinan det(A) = ad − bc, syarat matriks singular, dan invers A⁻¹.',
        'Menghitung hasil operasi matriks secara teliti dan memeriksa A · A⁻¹ = I.',
        ['Operasi bilangan real dan aljabar linear dasar'],
        ['Perkalian baris×kolom benar dan verifikasi invers menghasilkan matriks identitas'],
        90
      ),
      makeRich(
        'Analisis Data & Peluang',
        'Kaidah Pencacahan (Permutasi & Kombinasi) dan Peluang Kejadian',
        'Peserta didik dapat membedakan masalah yang memperhatikan urutan (permutasi) dan tidak memperhatikan urutan (kombinasi) untuk menentukan banyak susunan dan peluang.',
        'Aturan perkalian, perbedaan permutasi vs kombinasi dengan contoh konkret pemilihan ketua/komite, serta peluang P(A) = n(A)/n(S).',
        'Memilih kaidah pencacahan yang tepat dan menghitung peluang kejadian sederhana atau majemuk.',
        ['Bilangan faktorial dan konsep ruang sampel dasar'],
        ['Alasan pemilihan permutasi/kombinasi tepat dan hasil numerik konsisten'],
        90
      ),
    ];
  }

  // 2. BAHASA INDONESIA
  if (lower.includes('indonesia')) {
    if (bucket === 'sd_awal') {
      return [
        makeRich(
          'Membaca & Memirsa',
          'Memahami Isi Cerita Pendek Sehari-hari dan Menjawab Pertanyaan Fakta',
          'Peserta didik dapat membaca bacaan pendek 1 paragraf dan menemukan tokoh, tempat, serta peristiwa sesuai isi bacaan.',
          'Kosakata sederhana sehari-hari, menemukan siapa, di mana, dan apa yang terjadi langsung di teks.',
          'Menjawab pertanyaan fakta bacaan berdasarkan kalimat tersurat di teks.',
          ['Membaca lancar kalimat sederhana berpola SPOK dasar'],
          ['Jawaban tokoh, tempat, dan peristiwa sesuai tepat dengan bacaan'],
          60
        ),
        makeRich(
          'Menulis',
          'Menyusun Kalimat Sederhana Menggunakan Huruf Kapital dan Tanda Titik',
          'Peserta didik dapat menyalin dan melengkapi 3–4 kalimat tentang kegiatan di rumah dengan huruf kapital di awal kalimat dan tanda titik.',
          'Penggunaan huruf kapital untuk awal kalimat dan nama orang, serta tanda titik di akhir kalimat berita.',
          'Menulis kalimat rapi sesuai kaidah awal kapital dan tanda titik.',
          ['Mengenal huruf kapital dan tanda baca titik/tanya'],
          ['Setiap kalimat diawali huruf kapital dan diakhiri tanda baca yang sesuai'],
          60
        ),
        makeRich(
          'Berbicara & Mempresentasikan',
          'Menggunakan Ungkapan Tolong, Terima Kasih, dan Permintaan Maaf',
          'Peserta didik dapat memilih dan melengkapi dialog percakapan santun berisi ungkapan tolong, terima kasih, dan maaf sesuai situasi.',
          'Contoh situasi nyata di kelas/rumah dan pilihan kalimat sopan.',
          'Menentukan ungkapan santun yang tepat untuk situasi komunikasi anak.',
          ['Berkomunikasi lisan dengan bahasa Indonesia sederhana'],
          ['Dialog terisi ungkapan tolong/terima kasih/maaf yang cocok dengan situasinya'],
          60
        ),
        makeRich(
          'Menyimak',
          'Mengurutkan Langkah Kegiatan Sehari-hari Berdasarkan Teks Petunjuk Singkat',
          'Peserta didik dapat menyusun ulang 4 gambar/kalimat petunjuk mencuci tangan atau merapikan meja agar berurutan logis.',
          'Kata penanda urutan sederhana (pertama, lalu, kemudian, terakhir).',
          'Menentukan urutan logis petunjuk singkat secara benar.',
          ['Memahami kata kerja tindakan sederhana'],
          ['Urutan langkah logis dan dapat dipraktikkan langsung'],
          60
        ),
      ];
    }

    if (bucket === 'sd_atas') {
      return [
        makeRich(
          'Membaca & Memirsa',
          'Gagasan Pokok, Kalimat Utama, dan Kalimat Penjelas pada Paragraf',
          'Peserta didik dapat menemukan kalimat utama dan merumuskan gagasan pokok serta gagasan pendukung pada setiap paragraf teks bacaan nonfiksi.',
          'Perbedaan letak kalimat utama di awal (deduktif) dan akhir (induktif) paragraf serta memadatkan inti paragraf.',
          'Mengidentifikasi kalimat utama dan membedakannya dari kalimat penjelas.',
          ['Memahami isi teks informasional pendek'],
          ['Menunjukkan kalimat utama tepat sesuai teks dan menuliskan ringkasan 1 kalimat per paragraf'],
          70
        ),
        makeRich(
          'Membaca & Memirsa',
          'Unsur Intrinsik Cerita Anak & Dongeng Nusantara',
          'Peserta didik dapat mengidentifikasi tokoh, watak dengan bukti kutipan perilaku, latar waktu/tempat, serta amanat dari sebuah cerita anak.',
          'Menghubungkan sifat tokoh dengan tindakan atau dialognya di teks cerita, bukan menebak di luar teks.',
          'Menyebutkan watak tokoh dan latar disertai bukti kalimat dari cerita.',
          ['Membaca paragraf narasi pendek'],
          ['Setiap sifat tokoh disertai alasan/kutipan dialog atau peristiwa dari bacaan'],
          70
        ),
        makeRich(
          'Menulis',
          'Perbedaan Bahasa Surat Pribadi dan Surat Resmi Sekolah',
          'Peserta didik dapat membandingkan bagian dan ragam bahasa surat undangan resmi sekolah dengan surat pribadi untuk teman serta memperbaiki kesalahan bagian surat.',
          'Komponen kop, tanggal, nomor/hal surat resmi vs sapaan akrab surat pribadi sesuai EYD.',
          'Menemukan unsur baku surat resmi dan mengubah kalimat tidak baku menjadi kalimat efektif.',
          ['Penggunaan huruf kapital dan tanda baca koma/titik'],
          ['Bagian surat diidentifikasi tepat dan perbaikan ejaan/sapaan sesuai ragam resmi'],
          70
        ),
        makeRich(
          'Menulis',
          'Menulis Teks Prosedur Sederhana Menggunakan Kalimat Perintah Efektif',
          'Peserta didik dapat menyusun teks prosedur 5 langkah membuat media belajar/kerajinan menggunakan kata kerja imperatif dan kata hubung urutan.',
          'Struktur Tujuan, Alat/Bahan, Langkah Kerja; penggunaan imbuhan -kan/-lah dan kata ukuran yang jelas.',
          'Menulis langkah prosedur yang runtut tanpa melompati tahapan penting.',
          ['Kalimat aktif sederhana'],
          ['Langkah urut, mengandung kata kerja perintah dan takaran/alat yang jelas'],
          70
        ),
      ];
    }

    if (bucket === 'smp') {
      return [
        makeRich(
          'Membaca & Memirsa',
          'Teks Deskripsi: Citraan Pancaindra dan Struktur Identifikasi–Deskripsi Bagian',
          'Peserta didik dapat mengidentifikasi bagian Identifikasi, Deskripsi Bagian, dan Simpulan serta menemukan kalimat cerapan pancaindra pada kutipan teks deskripsi.',
          'Struktur teks deskripsi, kalimat perincian objek konkret, majas personifikasi/perbandingan, dan penggunaan imbuhan/kata depan di-/di.',
          'Menganalisis kutipan teks untuk menandai struktur, citraan indra, dan memperbaiki kesalahan penulisan kata depan.',
          ['Membedakan kalimat tunggal dan majemuk dasar'],
          ['Struktur teks dan jenis citraan ditunjukkan dengan kutipan kalimat yang tepat'],
          80
        ),
        makeRich(
          'Menulis',
          'Teks Prosedur: Struktur, Kalimat Imperatif, dan Akurasi Takaran',
          'Peserta didik dapat menelaah kelengkapan langkah prosedur dan menulis ulang prosedur dengan kalimat perintah, batasan takaran jelas, serta larangan keselamatan kerja.',
          'Struktur Tujuan, Bahan/Alat, Langkah-langkah, Penutup; perbedaan kalimat imperatif, deklaratif, dan interogatif dalam panduan.',
          'Menemukan langkah ambigu dalam panduan kerja dan memperbaikinya menjadi langkah terukur.',
          ['Kata baku dan kalimat efektif'],
          ['Perbaikan instruksi memuat alat, ukuran kuantitatif, dan konjungsi kronologis tepat'],
          80
        ),
        makeRich(
          'Membaca & Memirsa',
          'Teks Laporan Hasil Observasi (LHO): Fakta Objektif vs Opini',
          'Peserta didik dapat membedakan pernyataan fakta yang dapat diverifikasi dari kalimat opini subjektif pada kutipan teks LHO serta mengenali kalimat definisi dan klasifikasi.',
          'Definisi Umum, Deskripsi Bagian, Deskripsi Manfaat; ciri kalimat definisi (adalah, merupakan) dan data pengamatan terukur.',
          'Mengklasifikasikan fakta vs opini berdasarkan bukti pengamatan teks.',
          ['Memahami ide pokok paragraf'],
          ['Setiap klasifikasi fakta/opini disertai alasan terukur dari struktur kalimat teks'],
          80
        ),
        makeRich(
          'Berbicara & Mempresentasikan',
          'Teks Tanggapan & Diskusi Berbasis Data Seimbang',
          'Peserta didik dapat mengidentifikasi argumen pro, kontra, serta simpulan jalan tengah dalam sebuah teks diskusi isu sekolah dan menulis tanggapan santun.',
          'Struktur Isu, Argumen Mendukung, Argumen Menentang, Simpulan; konjungsi pertentangan dan cara memberi kritik tanpa merendahkan.',
          'Menyusun argumen pro dan kontra yang didukung alasan logis serta kesimpulan kompromi.',
          ['Struktur paragraf argumentatif sederhana'],
          ['Argumen memuat klaim + data teks bukan serangan pribadi'],
          80
        ),
      ];
    }

    // SMA/MA/SMK
    return [
      makeRich(
        'Membaca & Memirsa',
        'Teks Laporan Hasil Observasi (LHO) dan Evaluasi Keakuratan Fakta Ilmiah',
        'Peserta didik dapat mengevaluasi objektivitas, kelengkapan struktur (Pernyataan Umum, Deskripsi Bagian, Manfaat), serta keakuratan data angka/istilah pada teks LHO.',
        'Struktur LHO, frasa verba dan nomina ilmiah, kalimat definisi vs kalimat deskripsi, serta verifikasi konsistensi data observasi.',
        'Menemukan kalimat opini bias di dalam laporan pengamatan dan merevisinya agar objektif.',
        ['Membedakan fakta vs opini dalam teks eksposisi'],
        ['Bagian bias/opini berhasil direvisi menjadi kalimat deskriptif berbasis data'],
        90
      ),
      makeRich(
        'Menulis',
        'Teks Argumentasi & Eksposisi Isu Publik Berbasis Bukti Data',
        'Peserta didik dapat menilai kekuatan bukti pada teks argumentasi (klaim–alasan–data) dan menyusun paragraf sanggahan atau dukungan berbasis data faktual.',
        'Struktur Tesis–Rangkaian Argumen–Penegasan Ulang, konjungsi kausalitas, serta mendeteksi kekeliruan generalisasi tergesa-gesa.',
        'Menilai relevansi bukti terhadap tesis utama teks.',
        ['Kalimat efektif dan tanda baca EYD V'],
        ['Setiap klaim argumen terhubung eksplisit ke data pembanding pada stimulus'],
        90
      ),
      makeRich(
        'Berbicara & Mempresentasikan',
        'Teks Negosiasi: Kepentingan Para Pihak dan Kalimat Persuasif Santun',
        'Peserta didik dapat menganalisis struktur Orientasi–Pengajuan–Penawaran–Persetujuan pada transkrip dialog negosiasi dan merancang penawaran win-win yang realistis.',
        'Faktor penentu keberhasilan negosiasi, kalimat bersyarat yang halus, dan mengidentifikasi alasan disepakati kedua pihak.',
        'Menelaah transkrip dialog untuk menemukan titik kompromi dan memperbaiki ujaran konfrontatif.',
        ['Ragam bahasa formal dan nonformal'],
        ['Rancangan balasan negosiasi memuat penawaran kompromi konkret tanpa ancaman'],
        90
      ),
      makeRich(
        'Menulis',
        'Penulisan Surat Lamaran Kerja / Proposal Kegiatan sesuai Kaidah EYD V',
        'Peserta didik dapat mengaudit 7 bagian wajib surat lamaran pekerjaan atau kerangka proposal kegiatan dan menyunting kesalahan ejaan/kalimat tidak efektif.',
        'Sistematika tempat-tanggal, lampiran/hal, alamat surat (tanpa "Yth. Kepada"), alinea pembuka, kualifikasi, penutup baku.',
        'Menyunting draf surat/proposal formal hingga memenuhi standar sistematika dan EYD V.',
        ['Penggunaan kata baku bahasa Indonesia'],
        ['Minimal 5 kesalahan ejaan/sistematika pada draf surat teridentifikasi dan diperbaiki tepat'],
        90
      ),
    ];
  }

  // 3. BAHASA INGGRIS (SD, SMP, SMA, SMK)
  if (lower.includes('inggris')) {
    if (bucket === 'sd_awal' || bucket === 'sd_atas') {
      return [
        makeRich(
          'Reading & Viewing',
          'Describing Classroom Objects and Animals (Simple Present & Adjectives)',
          'Peserta didik dapat membaca deskripsi singkat 4–5 kalimat dalam bahasa Inggris tentang benda kelas/hewan dan menuliskan kalimat serupa dengan pola It is / They are.',
          'Kosakata kata sifat dasar (big, clean, tall, small) dan pola kalimat sederhana It is a... / It has....',
          'Mengidentifikasi ciri objek dari teks bacaan pendek berbahasa Inggris.',
          ['Kosakata angka, warna, dan nama benda di kelas'],
          ['Kalimat deskripsi menggunakan is/has dengan tepat sesuai gambar/teks stimulus'],
          65
        ),
        makeRich(
          'Listening & Speaking',
          'Daily Activities & Telling the Time in English',
          'Peserta didik dapat mencocokkan informasi jam digital/analog dengan kalimat aktivitas harian dalam bahasa Inggris (at 06.00, half past six).',
          'Ungkapan jam tepat (o’clock) dan setengah (half past) disertai kata kerja rutin (wake up, go to school, study).',
          'Membaca jadwal harian berbahasa Inggris dan melengkapi kalimat waktu dengan tepat.',
          ['Angka bahasa Inggris 1 sampai 12'],
          ['Jadwal dan jam cocok tanpa tertukar o’clock / half past'],
          65
        ),
        makeRich(
          'Speaking & Writing',
          'Ordering Food and Drinks at School Canteen (Polite Dialogue)',
          'Peserta didik dapat melengkapi dialog memesan makanan di kantin sekolah menggunakan ungkapan "Can I have...?" dan "How much is...?".',
          'Daftar nama makanan/minuman beserta harga rupiah sederhana serta frasa sopan memesan barang.',
          'Mempraktikkan atau melengkapi percakapan transaksi kantin secara tepat.',
          ['Kosakata makanan/minuman dasar dan angka'],
          ['Dialog menggunakan ungkapan santun dan penyebutan total harga benar'],
          65
        ),
        makeRich(
          'Speaking',
          'Greetings, Thanking, and Apologizing in Classroom Situations',
          'Peserta didik dapat memilih ungkapan sapaan, terima kasih, dan permintaan maaf yang tepat beserta responnya untuk berbagai situasi di sekolah.',
          'Good morning/afternoon, Thank you / You are welcome, I am sorry / It is okay.',
          'Memadankan situasi kelas dengan ungkapan kesantunan bahasa Inggris.',
          ['Sapaan dasar dalam bahasa Inggris'],
          ['Seluruh situasi mendapat pasangan ungkapan & respons yang wajar'],
          65
        ),
      ];
    }

    if (bucket === 'smp') {
      return [
        makeRich(
          'Reading & Viewing',
          'Descriptive Text: Analyzing Identification, Description & Simple Present Tense',
          'Peserta didik dapat menentukan gagasan spesifik dalam Descriptive Text serta mengidentifikasi kata sifat pencerapan dan penggunaan Simple Present Tense.',
          'Social Function, Generic Structure (Identification & Description), Verb-1 / is-am-are, Sensory Adjectives.',
          'Menjawab pertanyaan rinci berdasarkan teks bacaan dan memperbaiki kesesuaian subjek–kata kerja.',
          ['Pronoun dasar dan kata kerja sehari-hari'],
          ['Struktur teks teridentifikasi tepat dan minimal 3 adjective + verb Simple Present ditemukan dari teks'],
          80
        ),
        makeRich(
          'Writing & Presenting',
          'Recount Text: Past Events, Orientation & Simple Past Tense (Verb-2)',
          'Peserta didik dapat mengurutkan rangkaian peristiwa masa lampau dari teks Recount dan mengubah kata kerja dasar (Verb-1) menjadi bentuk lampau (Verb-2) sesuai konteks.',
          'Generic Structure (Orientation, Events, Re-orientation), regular/irregular Verb-2, time connectives (then, after that, finally).',
          'Menelaah peristiwa kronologis teks dan melengkapi paragraf pengalaman pribadi dengan Verb-2 tepat.',
          ['Kalimat sederhana Simple Present'],
          ['Urutan kejadian kronologis sesuai bacaan dan penggunaan Verb-2 akurat'],
          80
        ),
        makeRich(
          'Reading & Writing',
          'Procedure Text: Imperatives, Sequence Connectors & Recipes/Manuals',
          'Peserta didik dapat menangkap langkah kritis dari sebuah Procedure Text (manual/resep) dan mengidentifikasi kalimat perintah serta konjungsi urutan.',
          'Goal, Materials/Ingredients, Steps; Imperative Verbs (plug, stir, mix, avoid) dan caution steps.',
          'Menjawab konsekuensi jika suatu langkah dilewati dan menyusun kalimat instruksi efektif.',
          ['Kata kerja aksi dasar'],
          ['Jawaban mengutip langkah/bahan nyata dari teks stimulus tanpa mengarang'],
          80
        ),
        makeRich(
          'Reading & Viewing',
          'Narrative Text: Conflict Resolution & Moral Value in Fables/Folktales',
          'Peserta didik dapat memetakan Orientation, Complication, dan Resolution serta menjelaskan alasan tindakan tokoh dan pesan moral dari cerita teks.',
          'Unsur alur konflik naratif, Direct/Indirect speech sederhana, dan inferensi pesan moral berbasis peristiwa cerita.',
          'Menunjukkan kalimat konflik utama dan alasan logis di balik penyelesaian cerita.',
          ['Simple Past Tense dasar'],
          ['Klaim pesan moral didukung bukti kejadian nyata dalam teks naratif'],
          80
        ),
      ];
    }

    // SMA/SMK
    return [
      makeRich(
        'Reading & Viewing',
        isSMK
          ? 'Procedure Text (SOP & Technical Manual in Workplace)'
          : 'Analytical Exposition Text: Evaluating Claims, Evidence & Conjunctions',
        isSMK
          ? 'Peserta didik dapat menganalisis langkah keselamatan dan urutan teknis dalam manual kerja berbahasa Inggris serta memperbaiki instruksi yang ambigu.'
          : 'Peserta didik dapat memetakan Thesis, Arguments, dan Reiteration serta menguji apakah klaim dalam teks Analytical Exposition didukung alasan yang relevan.',
        isSMK
          ? 'Goal, Tools/Safety Gear, Sequenced Steps, Caution Imperatives (Do not..., Make sure...).'
          : 'Social Function (persuading reader that an issue is important), Internal Conjunctions, Causal Connectives, Evidence evaluation.',
        isSMK
          ? 'Menginterpretasikan SOP teknis berbahasa Inggris ke prosedur kerja aman.'
          : 'Mengevaluasi kekuatan argumen penulis dan menyusun paragraf dukungan/sanggahan.',
        ['Reading comprehension teks fungsional & Simple Present Tense'],
        [isSMK ? 'Urutan keselamatan kerja & warning dalam SOP diidentifikasi tepat' : 'Thesis dan supporting evidence dari teks dikutip tepat tanpa kesalahan makna'],
        90
      ),
      makeRich(
        'Writing & Presenting',
        isSMK
          ? 'Job Application Letter & Professional Curriculum Vitae Highlights'
          : 'Hortatory Exposition Text: Arguments & Constructive Recommendations',
        isSMK
          ? 'Peserta didik dapat menyunting draf Application Letter resmi agar memenuhi bagian baku, nada profesional, serta kesesuaian kualifikasi dengan lowongan.'
          : 'Peserta didik dapat membedakan Analytical vs Hortatory Exposition berdasarkan bagian penutup (Recommendation) dan merumuskan rekomendasi logis.',
        isSMK
          ? 'Header, Salutation, Opening Paragraph (position & source), Body (skills matching job post), Closing & Signature.'
          : 'Thesis, Arguments, Recommendation (should / ought to / must + actionable steps).',
        isSMK
          ? 'Menulis ulang bagian surat lamaran agar relevan dengan syarat iklan lowongan.'
          : 'Menghubungkan data fakta argumen ke usulan rekomendasi tindakan.',
        ['Formal vs informal English register'],
        [isSMK ? 'Surat lamaran menjawab kualifikasi lowongan secara spesifik' : 'Rekomendasi teks terhubung langsung dengan masalah utama pada argumen'],
        90
      ),
      makeRich(
        'Reading & Viewing',
        'Descriptive Text: Historical Buildings, Tourism & OSASCOMP Adjectives',
        'Peserta didik dapat menganalisis fungsi sosial, rincian bagian (Identification & Description), dan urutan kata sifat (OSASCOMP) dalam teks deskripsi destinasi.',
        'Present Passive sederhana ("is located in", "was built in"), sensory nouns/adjectives, dan urutan modifier.',
        'Mengekstrak fakta arsitektural/geografis dan memperbaiki susunan frase kata sifat.',
        ['Descriptive adjectives dasar'],
        ['Fakta bangunan/lokasi dikutip tepat dan susunan OSASCOMP benar'],
        90
      ),
      makeRich(
        'Reading & Writing',
        'Cause & Effect and Conditional Sentences in Real-World Scenarios',
        'Peserta didik dapat membedakan hubungan sebab-akibat (because vs due to, so vs therefore) dan penggunaan Conditional Type 1 & 2 pada wacana nyata.',
        'Clause connectors (because/since + S+V vs because of/due to + NP) dan If-Clause Type 1 (real future) vs Type 2 (unreal present).',
        'Menyunting kesalahan grammar sebab-akibat/pengandaian dalam paragraf pendek.',
        ['Simple Present, Simple Past, Modal (will/would)'],
        ['Pilihan connector sebab-akibat dan pola tense If-Clause konsisten makna'],
        90
      ),
    ];
  }

  // 4. SAINS: IPAS SD, IPA SMP, FISIKA, KIMIA, BIOLOGI, PROJEK IPAS SMK
  if (lower.includes('fisika')) {
    return [
      makeRich(
        'Pemahaman Fisika & Keterampilan Proses',
        'Hukum Newton tentang Gerak (ΣF = m · a) dan Gaya Gesek',
        'Peserta didik dapat menggambar arah gaya-gaya pada benda, menghitung resultan gaya serta percepatan menggunakan ΣF = m·a, dan menjelaskan arah gaya gesek.',
        'Hukum I, II, III Newton, satuan SI (Newton, kg, m/s²), resultan gaya searah/berlawanan arah, dan keselamatan percobaan dinamika.',
        'Menghitung resultan gaya dan percepatan dari data massa serta gaya tarik/dorong.',
        ['Aljabar dasar, konversi satuan SI (gram ke kg), dan konsep kecepatan'],
        ['Diagram gaya benar arahnya', 'Perhitungan a = ΣF / m tepat disertai satuan m/s²'],
        90
      ),
      makeRich(
        'Pemahaman Fisika & Keterampilan Proses',
        'Listrik Dinamis: Hukum Ohm (V = I · R) dan Rangkaian Seri–Paralel',
        'Peserta didik dapat menghitung hambatan pengganti rangkaian seri maupun paralel dan membandingkan kuat arus serta nyala lampu menggunakan Hukum Ohm.',
        'Rumus V = I·R, perbedaan sifat rangkaian seri (arus sama, tegangan terbagi) vs paralel (tegangan sama, arus bercabang), dan keselamatan alat ukur listrik.',
        'Menghitung arus total dan arus cabang pada data rangkaian resistor/lampu.',
        ['Operasi pecahan (untuk 1/R_paralel) dan aljabar substitusi'],
        ['Perhitungan hambatan pengganti dan kuat arus tepat beserta satuannya (Ω, A, V)'],
        90
      ),
      makeRich(
        'Pemahaman Fisika',
        'Usaha, Energi Kinetik, Energi Potensial, dan Kekekalan Energi Mekanik',
        'Peserta didik dapat menghitung usaha (W = F·s), energi potensial (m·g·h), energi kinetik (½mv²), dan membandingkan perubahan energi pada lintasan benda jatuh.',
        'Energi mekanik Em = Ep + Ek tetap pada bidang licin, satuan Joule, serta kondisi usaha bernilai nol saat gaya tegak lurus perpindahan.',
        'Menganalisis konversi Ep ke Ek pada ketinggian berbeda dan menghitung kelajuan.',
        ['Hukum Newton II dan bilangan kuadrat'],
        ['Perhitungan Ep, Ek, dan kelajuan di titik berbeda konsisten mempertahankan Em konstan'],
        90
      ),
      makeRich(
        'Keterampilan Proses Fisika',
        'Pengukuran Besaran, Ketidakpastian Alat Ukur, dan Angka Penting',
        'Peserta didik dapat membaca skala jangka sorong dan mikrometer sekrup dari gambar data skala serta menuliskan hasil ukur lengkap dengan ketidakpastian mutlaknya.',
        'Skala utama vs skala nonius jangka sorong (ketelitian 0,01 cm) dan mikrometer sekrup (0,01 mm) beserta aturan penjumlahan angka penting.',
        'Membaca pasangan skala ukur yang akurat dan menilai sumber kesalahan pembacaan paralaks.',
        ['Desimal hingga perseratusan dan satuan panjang'],
        ['Pembacaan skala utama + nonius benar sampai 2 angka di belakang koma'],
        90
      ),
    ];
  }

  if (lower.includes('kimia')) {
    return [
      makeRich(
        'Pemahaman Kimia',
        'Struktur Atom, Konfigurasi Elektron, dan Pembentukan Ikatan Ion vs Kovalen',
        'Peserta didik dapat menentukan jumlah proton, elektron, neutron dari notasi atom, menuliskan konfigurasi elektronnya, serta memprediksi jenis ikatan antara dua unsur.',
        'Nomor atom Z, nomor massa A, elektron valensi, kaidah oktet, serah-terima elektron (ikatan ion logam+nonlogam) vs pemakaian bersama (kovalen nonlogam+nonlogam).',
        'Menentukan elektron valensi dan memprediksi ikatan serta rumus senyawa stabil sederhana.',
        ['Mengenal tabel periodik sederhana unsur golongan utama (IA–VIIIA)'],
        ['Konfigurasi elektron benar dan prediksi jenis ikatan disertai alasan kecenderungan valensi'],
        90
      ),
      makeRich(
        'Pemahaman Kimia',
        'Stoikiometri Dasar: Konsep Mol, Massa Molar (Mr), dan Penyetaraan Reaksi',
        'Peserta didik dapat menyetarakan persamaan reaksi kimia sederhana dan menghitung jumlah mol serta massa pereaksi/produk menggunakan hubungan n = m / Mr.',
        'Hukum Kekekalan Massa Lavoisier, penyetaraan koefisien reaksi, massa molekul relatif Mr, serta konversi mol–massa–volume gas STP.',
        'Menyetarakan koefisien atom kiri=kanan sebelum menghitung rasio mol produk.',
        ['Perkalian dan proporsi desimal serta daftar Ar unsur umum (H, C, N, O, Na, Cl)'],
        ['Koefisien reaksi setara untuk semua atom dan perhitungan mol/massa konsisten rasio koefisien'],
        90
      ),
      makeRich(
        'Keterampilan Proses Kimia',
        'Larutan Asam, Basa, Skala pH, dan Keamanan Uji Indikator Alami',
        'Peserta didik dapat mengklasifikasikan sifat asam, basa, atau netral berdasarkan data uji kertas lakmus maupun ekstrak indikator bahan alam dengan memperhatikan keselamatan lab.',
        'Rentang pH 0–14, perubahan warna lakmus merah/biru, indikator kunyit/kubis ungu, serta aturan keselamatan pengenceran dan pencampuran larutan.',
        'Mengelompokkan sampel larutan berdasarkan bukti perubahan warna indikator.',
        ['Mengenal konsep larutan dalam kehidupan sehari-hari (cuka, sabun, air mineral)'],
        ['Klasifikasi asam/basa/netral cocok dengan tabel perubahan warna indikator & catatan K3 lab lengkap'],
        90
      ),
      makeRich(
        'Pemahaman Kimia',
        'Faktor yang Mempengaruhi Laju Reaksi (Konsentrasi, Luas Permukaan, Suhu)',
        'Peserta didik dapat menganalisis tabel data waktu reaksi pada variasi ukuran partikel, suhu, atau konsentrasi untuk menyimpulkan faktor yang mempercepat laju reaksi.',
        'Teori tumbukan sederhana (frekuensi tumbukan efektif meningkat saat luas permukaan/suhu/konsentrasi naik) & kontrol variabel.',
        'Membaca tabel eksperimen berpasangan untuk menyimpulkan satu variabel bebas terisolasi.',
        ['Memahami konsep reaksi berlangsung cepat vs lambat'],
        ['Memilih pasangan percobaan dengan hanya satu variabel berubah dan menjelaskan teori tumbukannya'],
        90
      ),
    ];
  }

  if (lower.includes('biologi')) {
    return [
      makeRich(
        'Pemahaman Biologi',
        'Struktur Sel Tumbuhan dan Sel Hewan serta Mekanisme Transpor Membran',
        'Peserta didik dapat membandingkan organel pembeda sel tumbuhan dan sel hewan dari data pengamatan serta menjelaskan peristiwa osmosis pada jaringan tumbuhan.',
        'Fungsi inti sel, mitokondria, kloroplas, dinding sel, vakuola besar; perbedaan difusi vs osmosis (larutan hipotonik–isotonik–hipertonik).',
        'Menghubungkan perubahan berat/kelenturan irisan kentang dalam larutan garam/air dengan arah perpindahan air.',
        ['Konsep makhluk hidup tersusun atas sel dan perbedaan konsentrasi larutan'],
        ['Identifikasi organel pembeda tepat dan penjelasan arah osmosis sesuai data massa awal vs akhir'],
        90
      ),
      makeRich(
        'Pemahaman Biologi & Keterampilan Proses',
        'Keanekaragaman Hayati, Ekosistem, dan Dampak Gangguan Jaring Makanan',
        'Peserta didik dapat menganalisis data populasi komponen biotik dalam jaring makanan dan memprediksi dampak hilangnya satu populasi terhadap keseimbangan ekosistem.',
        'Tingkat keanekaragaman hayati (gen, jenis, ekosistem), aliran energi rantai makanan, serta dampak bioakumulasi atau hilangnya predator puncak.',
        'Menyusun jaring makanan dari daftar organisme dan menelusuri dampak berantai gangguan ekosistem.',
        ['Peran produsen, konsumen, dan dekomposer'],
        ['Analisis efek berantai pada populasi lain logis sesuai panah aliran energi'],
        90
      ),
      makeRich(
        'Pemahaman Biologi',
        'Sistem Transpor & Respirasi Manusia dan Interpretasi Data Denyut/Kapasitas',
        'Peserta didik dapat menelusuri aliran darah pada peredaran darah kecil serta besar dan menafsirkan data frekuensi napas/denyut nadi sebelum dan sesudah aktivitas.',
        'Ruang jantung (atrium/ventrikel), pembuluh arteri/vena, pertukaran O₂–CO₂ di alveolus, serta kaitan kebutuhan oksigen saat beraktivitas.',
        'Membaca tabel frekuensi denyut jantung dan menjelaskan alasan peningkatan pasokan oksigen ke otot.',
        ['Organ dasar jantung dan paru-paru'],
        ['Alur bilik–paru–serambi tepat dan penjelasan data frekuensi denyut nadi terkait respirasi sel'],
        90
      ),
      makeRich(
        'Pemahaman Biologi',
        'Pewarisan Sifat Monohibrid (Hukum I Mendel) dan Prediksi Rasio Genotipe–Fenotipe',
        'Peserta didik dapat menentukan gamet induk, menyusun diagram papan catur (Punnett Square), serta menghitung perbandingan fenotipe dan genotipe keturunan F2.',
        'Istilah alel dominan, resesif, homozigot, heterozigot, genotipe vs fenotipe dengan contoh persilangan tanaman kacang kapri.',
        'Menghitung rasio keturunan dari diagram persilangan monohibrid dan memeriksa kesesuaian data sampel.',
        ['Konsep proporsi/persentase pecahan sederhana'],
        ['Tabel Punnett benar dan rasio fenotipe/genotipe (mis. 3:1 / 1:2:1) tepat'],
        90
      ),
    ];
  }

  if (lower.includes('ipa') || lower.includes('ipas')) {
    if (bucket === 'sd_awal' || bucket === 'sd_atas') {
      return [
        makeRich(
          'Pemahaman IPAS (Sains)',
          'Bagian Tubuh Tumbuhan, Fotosintesis, dan Hubungannya dengan Kehidupan',
          'Peserta didik dapat menghubungkan fungsi akar, batang, daun, dan bunga serta menjelaskan bahan dan hasil fotosintesis dari gambar/data percobaan daun tertutup kertas.',
          'Alur air dari akar ke daun, peran klorofil menangkap cahaya matahari, CO₂ + air -> karbohidrat + oksigen.',
          'Menjelaskan bukti bahwa cahaya matahari dan klorofil dibutuhkan dalam fotosintesis.',
          ['Mengenal tumbuhan hijau di lingkungan sekolah'],
          ['Fungsi tiap organ tumbuhan tepat dan perbedaan uji daun yang ditutup vs terbuka dijelaskan benar'],
          70
        ),
        makeRich(
          'Pemahaman IPAS (Sains)',
          'Wujud Zat dan Perubahannya akibat Kalor (Mencair, Membeku, Menguap, Mengembun)',
          'Peserta didik dapat membedakan sifat benda padat, cair, gas dan menentukan proses perubahan wujud yang melepas atau menyerap kalor dalam peristiwa sehari-hari.',
          'Ciri volume dan bentuk wujud zat, bagan segitiga perubahan wujud (mencair/membeku/menguap/mengembun/menyublim) dengan contoh nyata.',
          'Mengklasifikasikan peristiwa dapur/alam ke perubahan wujud + arah perpindahan kalor.',
          ['Membedakan benda keras, air, dan udara'],
          ['Menentukan pasangan perubahan wujud dan menyebutkan apakah zat menyerap atau melepas panas'],
          70
        ),
        makeRich(
          'Pemahaman IPAS (Sosial)',
          'Kebutuhan vs Keinginan serta Peran Produsen, Distributor, dan Konsumen',
          'Peserta didik dapat membedakan kebutuhan pokok dari keinginan dalam skenario uang saku/keluarga serta memetakan alur barang dari produsen hingga konsumen.',
          'Prioritas kebutuhan primer-sekunder-tersier dan tiga pelaku kegiatan ekonomi pada barang harian (mis. beras atau buku).',
          'Memilih prioritas belanja masuk akal dengan anggaran terbatas.',
          ['Penjumlahan harga rupiah sederhana'],
          ['Klasifikasi kebutuhan vs keinginan disertai alasan prioritas yang logis'],
          70
        ),
        makeRich(
          'Pemahaman IPAS (Sains)',
          'Rantai Makanan dan Keseimbangan Ekosistem Sawah/Kebun Sekolah',
          'Peserta didik dapat menyusun urutan rantai makanan dari daftar makhluk hidup dan memprediksi akibat berkurangnya salah satu populasi (mis. ular atau burung pemakan hama).',
          'Peran produsen, konsumen tingkat I–III, dan pengurai; dampak kepunahan satu tingkat trofik.',
          'Menjelaskan dampak berantai bila konsumen I atau predator berkurang.',
          ['Mengenal jenis hewan pemakan tumbuhan dan pemakan daging'],
          ['Susunan panah rantai makanan tepat dari tumbuhan ke konsumen & prediksi efek ekosistem benar'],
          70
        ),
      ];
    }

    if (isSMK) {
      return [
        makeRich(
          'Makhluk Hidup & Lingkungannya (Projek IPAS)',
          'Audit Sampah Bengkel/Sekolah dan Pengelolaan Limbah Prinsip 3R',
          'Peserta didik dapat mengolah data komposisi limbah harian di lingkungan sekolah/bengkel, menghitung persentase limbah layak guna ulang, dan merancang pemilahan aman.',
          'Klasifikasi limbah organik, anorganik daur ulang, dan B3; hitung persentase tiap kategori; keselamatan penanganan benda tajam/kimia.',
          'Mengolah data timbangan sampah ke persentase dan menentukan prioritas penanganan 3R.',
          ['Persentase dasar dan kesadaran K3LH'],
          ['Persentase jenis limbah terhitung akurat dan limbah B3 dipisahkan dengan prosedur aman'],
          90
        ),
        makeRich(
          'Energi & Perubahannya (Projek IPAS)',
          'Efisiensi Energi Listrik dan Perbandingan Konsumsi Peralatan Kerja',
          'Peserta didik dapat menghitung konsumsi energi listrik harian (kWh = Daya × Jam / 1000) dari tabel spesifikasi alat dan mengusulkan langkah penghematan biaya terukur.',
          'Daya (Watt), waktu pemakaian (jam), konversi kWh, tarif listrik dasar, serta manfaat penghematan energi.',
          'Menghitung total kWh harian dari 3 alat berbeda dan mengidentifikasi pemborosan daya.',
          ['Perkalian desimal dan konversi Watt–kiloWatt'],
          ['Perhitungan total kWh harian dan selisih penghematan akurat'],
          90
        ),
        makeRich(
          'Zat & Perubahannya (Projek IPAS)',
          'Identifikasi Perubahan Fisika vs Kimia serta Pencemaran Bahan di Tempat Kerja',
          'Peserta didik dapat membedakan perubahan fisika (dapat kembali) dari perubahan kimia (terbentuk zat baru/karat/pembakaran) pada aktivitas kerja bengkel atau dapur.',
          'Ciri perubahan kimia (gas, endapan, warna permanen, kalor) dan pengendalian korosi/limbah cair.',
          'Menjelaskan dasar klasifikasi peristiwa perubahan materi dan langkah pencegahannya.',
          ['Wujud zat dan campuran dasar'],
          ['Klasifikasi perubahan fisika/kimia tepat disertai bukti ciri yang teramati'],
          90
        ),
        makeRich(
          'Keruangan & Konektivitas Antarruang (Projek IPAS)',
          'Mitigasi Risiko Bencana di Lingkungan Sekolah dan Rute Evakuasi Aman',
          'Peserta didik dapat mengidentifikasi titik rawan bahaya bangunan/lingkungan dari denah kasus dan menyusun prosedur evakuasi aman beserta perannya.',
          'Ancaman gempa, kebakaran, atau banjir di sekolah; titik kumpul aman, rambu jalur keluar, dan alat P3K.',
          'Menganalisis titik bottleneck jalur keluar dan memperbaiki skema evakuasi.',
          ['Membaca denah sederhana'],
          ['Analisis risiko menyebutkan bahaya konkret & jalur evakuasi tidak melewati sumber bahaya'],
          90
        ),
      ];
    }

    // IPA SMP
    return [
      makeRich(
        'Pemahaman IPA',
        'Sifat Cahaya, Pemantulan pada Cermin, dan Pembentukan Bayangan',
        'Peserta didik dapat menyelidiki hukum pemantulan cahaya (sudut datang = sudut pantul) serta membedakan sifat bayangan pada cermin datar dan cermin cekung.',
        'Rambat lurus cahaya, pemantulan teratur vs baur, hubungan sudut datang & pantul, dan pengamatan bayangan nyata vs maya.',
        'Menganalisis data pengukuran sudut cermin dan menyimpulkan sifat bayangan berdasarkan jarak benda.',
        ['Pengukuran sudut dengan busur derajat dan konsep jarak fokus sederhana'],
        ['Data tabel pengamatan sudut konsisten θi ≈ θr', 'Kesimpulan sifat bayangan cermin datar vs lengkung sesuai data'],
        80
      ),
      makeRich(
        'Keterampilan Proses IPA',
        'Besaran, Satuan Baku, Pengukuran Panjang-Massa-Waktu, dan Zat',
        'Peserta didik dapat menghitung massa jenis benda (ρ = m / V) dari data massa dan perubahan volume air pada gelas ukur serta menentukan apakah benda mengapung atau tenggelam.',
        'Massa (g/kg), volume zat tak beraturan dengan gelas ukur (ΔV), rumus massa jenis, dan perbandingan dengan ρ_air = 1 g/cm³.',
        'Menghitung volume perpindahan air, menentukan ρ = m / V, dan memprediksi posisi benda dalam air.',
        ['Pembagian desimal dasar dan membaca skala alat ukur'],
        ['ΔV = V_akhir − V_awal dan ρ terhitung benar dengan satuan g/cm³'],
        80
      ),
      makeRich(
        'Pemahaman IPA',
        'Kalor, Perubahan Wujud, dan Perpindahan Kalor (Konduksi, Konveksi, Radiasi)',
        'Peserta didik dapat membedakan konduksi, konveksi, dan radiasi dalam peristiwa sehari-hari serta menghitung kalor Q = m·c·ΔT pada pemanasan air sederhana.',
        'Persamaan Q = m · c · ΔT, konduktor vs isolator panas, serta alasan penggunaan pegangan kayu/plastik pada panci.',
        'Membaca grafik suhu vs waktu pemanasan dan menghitung energi kalor yang dibutuhkan.',
        ['Operasi perkalian bilangan bulat/desimal dan pembacaan termometer'],
        ['ΔT = T_akhir − T_awal tepat dan hasil Q mencantumkan satuan Joule/kalori'],
        80
      ),
      makeRich(
        'Pemahaman IPA',
        'Sistem Pencernaan Manusia dan Uji Kandungan Zat Makanan Sederhana',
        'Peserta didik dapat mengurutkan organ pencernaan beserta enzim pencernaannya serta menafsirkan tabel data uji warna makanan (amilum, glukosa, protein).',
        'Mulut (amilase), lambung (pepsin/HCl), usus halus (penyerapan), usus besar; interpretasi warna lugol (biru kehitaman), benedict (merah bata), biuret (ungu).',
        'Menentukan kandungan nutrisi sampel makanan berdasarkan tabel hasil uji warna laboratorium.',
        ['Mengenal golongan karbohidrat, protein, dan lemak'],
        ['Interpretasi sampel makanan sesuai tepat dengan perubahan warna reagen di tabel data'],
        80
      ),
    ];
  }

  // 5. IPS, GEOGRAFI, SOSIOLOGI, EKONOMI, SEJARAH
  if (lower.includes('ekonomi')) {
    return [
      makeRich(
        'Pemahaman Konsep Ekonomi',
        'Permintaan, Penawaran, dan Titik Keseimbangan Pasar (Qd = Qs)',
        'Peserta didik dapat menyusun skedul permintaan-penawaran dari data harga dan menghitung harga serta jumlah keseimbangan pasar melalui syarat Qd = Qs.',
        'Hukum permintaan vs penawaran, faktor penggeser kurva, menentukan (P*, Q*) dari dua fungsi linear Qd dan Qs, serta excess supply/demand.',
        'Menentukan harga dan jumlah keseimbangan pasar secara aljabar maupun tabel.',
        ['Menyelesaikan persamaan linear satu variabel'],
        ['Penyelesaian Qd = Qs menghasilkan P dan Q positif dan diverifikasi ke kedua fungsi'],
        90
      ),
      makeRich(
        'Keterampilan Proses Ekonomi',
        'Kelangkaan Sumber Daya, Skala Prioritas, dan Biaya Peluang (Opportunity Cost)',
        'Peserta didik dapat membandingkan beberapa pilihan ekonomi yang memiliki nilai penghasilan/manfaat berbeda dan menghitung biaya peluang dari keputusan yang dipilih.',
        'Konsep kelangkaan, menyusun skala prioritas rasional, serta definisi biaya peluang = nilai alternatif terbaik yang dikorbankan (bukan penjumlahan semua opsi).',
        'Menentukan nilai biaya peluang paling tepat dari skenario pilihan waktu atau modal usaha.',
        ['Memahami konsep pilihan akibat keterbatasan uang/waktu'],
        ['Mengidentifikasi hanya alternatif terbaik berikutnya (bukan menjumlahkan seluruh opsi) sebagai opportunity cost'],
        90
      ),
      makeRich(
        'Pemahaman Konsep Ekonomi',
        'Pendapatan Nasional (PDB), Pendapatan Per Kapita, dan Kesenjangan',
        'Peserta didik dapat menghitung PDB dengan pendekatan pengeluaran (C+I+G+(X−M)) dan pendapatan per kapita negara dari tabel data makroekonomi.',
        'Rumus pendekatan pengeluaran, perbedaan PDB vs PNB, serta membandingkan pendapatan per kapita dua wilayah.',
        'Menghitung agregat PDB dan menafsirkan arti kenaikan PDB terhadap jumlah penduduk.',
        ['Penjumlahan dan pembagian bilangan besar (juta/miliar)'],
        ['Komponen C, I, G, X, M dimasukkan tepat (M mengurangi) dan hasil per kapita terhitung akurat'],
        90
      ),
      makeRich(
        'Pemahaman Konsep Ekonomi',
        'Lembaga Jasa Keuangan, Inflasi, dan Kebijakan Moneter Sederhana',
        'Peserta didik dapat menghitung laju inflasi dari tabel Indeks Harga Konsumen (IHK) dua periode dan menjelaskan instrumen bank sentral untuk mengendalikan inflasi tinggi.',
        'Rumus inflasi = ((IHK_t − IHK_t-1) / IHK_t-1) × 100%, dampak inflasi bagi penabung vs peminjam, serta suku bunga BI & GWM.',
        'Menghitung persentase inflasi dan menentukan respons kebijakan moneter kontraktif/ekspansif.',
        ['Perhitungan persentase kenaikan nilai'],
        ['Laju inflasi (%) terhitung akurat dan pilihan arah suku bunga konsisten meredam/mendorong uang beredar'],
        90
      ),
    ];
  }

  if (lower.includes('geografi')) {
    return [
      makeRich(
        'Pemahaman Konsep Geografi',
        'Dinamika Hidrosfer, Elevasi Wilayah, dan Mitigasi Banjir Rob Pesisir',
        'Peserta didik dapat menganalisis tabel data ketinggian permukaan tanah, tinggi pasang maksimum air laut, dan laju penurunan muka tanah untuk memetakan zona risiko banjir rob.',
        'Konsep hidrosfer, pasang surut purnama, penurunan muka tanah (land subsidence), serta mitigasi struktural dan non-struktural.',
        'Menginterpretasikan data kuantitatif elevasi dan pasang surut untuk menentukan zona terdampak.',
        ['Membaca tabel data ketinggian dan peta wilayah pesisir'],
        ['Menentukan wilayah tergenang ketika tinggi pasang melebihi elevasi lokal + alasan mitigasi realistis'],
        90
      ),
      makeRich(
        'Keterampilan Proses Geografi',
        'Membaca Skala Peta, Koordinat Lintang–Bujur, dan Prinsip Keruangan',
        'Peserta didik dapat menghitung jarak sebenarnya di lapangan menggunakan skala peta dan mengidentifikasi 4 prinsip geografi (persebaran, interelasi, deskripsi, korologi).',
        'Skala angka (1:50.000) dan konversi cm ke km, koordinat astronomis Indonesia, serta penerapan 4 prinsip geografi pada fenomena bencana.',
        'Menghitung jarak nyata dari ukuran di peta dan mengkategorikan kasus menggunakan prinsip geografi.',
        ['Konversi satuan panjang (cm ke m dan km)'],
        ['Jarak lapangan = jarak peta × penyebut skala dalam satuan km tepat'],
        90
      ),
      makeRich(
        'Pemahaman Konsep Geografi',
        'Tenaga Endogen–Eksogen, Jalur Sesar Gempa, dan Peta Rawan Bencana',
        'Peserta didik dapat membedakan proses tektonisme/vulkanisme dengan pelapukan/erosi serta membaca zona bahaya letusan gunung api (KRB I, II, III).',
        'Lempeng tektonik di Indonesia, ciri tenaga endogen pembangun relief vs eksogen perombak, dan langkah kesiapsiagaan bencana.',
        'Mengaitkan posisi pertemuan lempeng dengan sebaran gunung api dan rekomendasi tata ruang aman.',
        ['Letak geografis dan geologis Indonesia'],
        ['Membedakan zona KRB III (larangan hunian tetap) dengan KRB I dan alasan geologisnya'],
        90
      ),
      makeRich(
        'Pemahaman Konsep Geografi',
        'Dinamika Kependudukan, Piramida Penduduk, dan Bonus Demografi',
        'Peserta didik dapat menganalisis bentuk piramida penduduk (ekspansif, stasioner, konstruktif) dan menghitung angka beban ketergantungan (Dependency Ratio) dari data kelompok umur.',
        'Rumus DR = ((Usia 0–14 + 65+) / Usia 15–64) × 100%, ciri 3 tipe piramida penduduk, dan implikasinya bagi fasilitas sekolah/kerja.',
        'Menghitung rasio ketergantungan dari data tabel umur dan merumuskan tantangan kebijakan daerah.',
        ['Persentase dan perbandingan bilangan'],
        ['Dependency Ratio terhitung tepat dan identifikasi jenis piramida sesuai proporsi kelompok umur'],
        90
      ),
    ];
  }

  if (lower.includes('sosiologi')) {
    return [
      makeRich(
        'Pemahaman Konsep Sosiologi',
        'Interaksi Sosial, Lembaga Sosial, dan Pengendalian Sosial di Masyarakat',
        'Peserta didik dapat mengidentifikasi syarat interaksi sosial (kontak & komunikasi) serta membedakan bentuk interaksi asosiatif dan disosiatif dari transkrip peristiwa sosial.',
        'Kerja sama, akomodasi (mediasi/arbitrase/kompromi), asimilasi vs persaingan, kontravensi, dan konflik; fungsi lembaga keluarga/sekolah/hukum.',
        'Mengkategorikan peristiwa interaksi masyarakat ke bentuk akomodasi atau konflik disertai buktinya.',
        ['Memahami peran individu sebagai makhluk sosial'],
        ['Penentuan bentuk interaksi dan penyelesaian konflik mengacu tepat pada fakta skenario'],
        90
      ),
      makeRich(
        'Keterampilan Penelitian Sosial',
        'Kelompok Sosial, Stratifikasi vs Diferensiasi Sosial, dan Inklusi',
        'Peserta didik dapat membedakan pembedaan horizontal (diferensiasi profesi/budaya/etnis) dari pelapisan vertikal (stratifikasi pendidikan/ekonomi) pada data komunitas.',
        'Ciri paguyuban vs patembayan, stratifikasi terbuka vs tertutup, serta cara mencegah eksklusi sosial di lingkungan sekolah.',
        'Mengkategorikan struktur sosial secara objektif dan merumuskan tindakan pencegahan diskriminasi.',
        ['Mengenal keberagaman budaya dan peran sosial di Indonesia'],
        ['Pembedaan vertikal vs horizontal disertai ciri pembeda dan argumen anti-diskriminasi jelas'],
        90
      ),
      makeRich(
        'Penelitian Sosiologi',
        'Merancang Penelitian Sosial Sederhana: Rumusan Masalah dan Teknik Data',
        'Peserta didik dapat menilai kesesuaian metode pengumpulan data (angket vs wawancara vs observasi) terhadap pertanyaan riset tentang kebiasaan belajar atau perundungan di sekolah.',
        'Langkah penelitian sosial (topik -> rumusan masalah -> teknik data -> analisis etika menjaga kerahasiaan responden).',
        'Merumuskan 1 pertanyaan riset terukur dan memilih teknik instrumen paling relevan beserta alasannya.',
        ['Membedakan data angka (kuantitatif) dan deskriptif (kualitatif)'],
        ['Rumusan masalah spesifik teramati dan teknik pengumpulan data sesuai tujuan serta memperhatikan etika'],
        90
      ),
      makeRich(
        'Pemahaman Konsep Sosiologi',
        'Perubahan Sosial Budaya, Globalisasi, dan Ketimpangan Akses Digital',
        'Peserta didik dapat membedakan perubahan evolusi vs revolusi dan menganalisis data ketimpangan akses internet antardaerah terhadap peluang pendidikan siswa.',
        'Faktor pendorong dan penghambat perubahan sosial, dampak positif vs negatif globalisasi, dan solusi mempersempit kesenjangan digital.',
        'Menganalisis data disparitas layanan dan menyusun usulan pemberdayaan komunitas.',
        ['Interaksi sosial dan perubahan masyarakat'],
        ['Analisis mengutip data kesenjangan pada tabel stimulus dan menawarkan langkah nyata terarah'],
        90
      ),
    ];
  }

  if (lower.includes('sejarah')) {
    return [
      makeRich(
        'Keterampilan Konsep Sejarah',
        'Pergerakan Nasional Indonesia: Budi Utomo (1908), Sumpah Pemuda (1928) hingga Proklamasi 1945',
        'Peserta didik dapat menyusun kronologi peristiwa pergerakan nasional dari fase organisasi modern hingga Proklamasi 17 Agustus 1945 dan menganalisis perubahan strategi perjuangan.',
        'Perubahan perjuangan bersifat kedaerahan ke nasional terorganisasi (1908–1928), Peristiwa Rengasdengklok, dan naskah Proklamasi.',
        'Menghubungkan sebab-akibat antartahapan organisasi pergerakan dan menjelaskan makna persatuan pemuda.',
        ['Mengenal letak wilayah Indonesia dan zaman kolonial Belanda secara umum'],
        ['Urutan tahun peristiwa benar (1908 -> 1928 -> Agustus 1945) dan perbedaan strategi perjuangan dijelaskan tepat'],
        85
      ),
      makeRich(
        'Keterampilan Berpikir Sejarah',
        'Konsep Diakronik, Sinkronik, Kausalitas, serta Kritik Sumber Primer vs Sekunder',
        'Peserta didik dapat membedakan cara berpikir diakronik (kronologi memanjang waktu) dan sinkronik (mendalam pada satu masa) serta menilai kedudukan sumber primer.',
        'Ciri kajian diakronik vs sinkronik, membedakan arsip/foto/kesaksian sezaman (primer) dari buku teks sejarah (sekunder), serta menghindari anakronisme.',
        'Mengklasifikasikan jenis sumber sejarah dan menentukan pendekatan kajian yang tepat.',
        ['Kemampuan membaca tabel linimasa tahun'],
        ['Identifikasi sumber primer vs sekunder disertai alasan waktu pembuatan sumber tersebut'],
        85
      ),
      makeRich(
        'Pemahaman Sejarah',
        'Jalur Perdagangan Nusantara, Kerajaan Maritim, dan Akulturasi Budaya',
        'Peserta didik dapat menganalisis peran letak selat maritim Nusantara terhadap berkembangnya kerajaan pelayaran (Sriwijaya/Majapahit/kesultanan pesisir) dan bukti akulturasinya.',
        'Jalur rempah Nusantara, komoditas lada/cengkih/pala, serta contoh akulturasi arsitektur masjid/candi dan aksara lokal.',
        'Menghubungkan posisi geografis pelabuhan dagang dengan dinamika kekuasaan dan akulturasi budaya.',
        ['Peta wilayah perairan Indonesia'],
        ['Keterkaitan jalur selat perdagangan dengan kemajuan pelabuhan & bukti akulturasi disebutkan konkret'],
        85
      ),
      makeRich(
        'Pemahaman Sejarah',
        'Perjuangan Mempertahankan Kemerdekaan (1945–1949): Diplomasi dan Perlawanan Fisik',
        'Peserta didik dapat membandingkan hasil perundingan Linggarjati, Renville, dan KMB dengan dinamika perjuangan bersenjata (10 November Surabaya / Serangan Umum 1 Maret).',
        'Kombinasi strategi perjuangan fisik dan diplomasi internasional menuju pengakuan kedaulatan RIS Desember 1949.',
        'Menilai alasan historis mengapa jalur bersenjata dan diplomasi saling melengkapi pada 1945–1949.',
        ['Peristiwa Proklamasi Kemerdekaan 17 Agustus 1945'],
        ['Membedakan isi pokok perjanjian dan menghubungkannya dengan bukti keberhasilan pengakuan kedaulatan'],
        85
      ),
    ];
  }

  if (lower.includes('ips')) {
    // IPS SMP (Fase D)
    return [
      makeRich(
        'Keluarga & Lingkungan Sekitar',
        'Kondisi Geografis Indonesia, Letak Astronomis–Geologis, dan Potensi SDA',
        'Peserta didik dapat menganalisis pengaruh letak astronomis (iklim tropis & 3 zona waktu) serta pertemuan 3 lempeng tektonik terhadap kesuburan tanah dan kewaspadaan bencana.',
        'Koordinat 6°LU–11°LS & 95°BT–141°BT (WIB, WITA, WIT), batas wilayah geografis, ring of fire, serta mitigasi gempa.',
        'Menentukan selisih zona waktu antarkota Indonesia dan mengaitkan jalur tektonik dengan aktivitas gunung api.',
        ['Membaca arah mata angin dan peta Indonesia dasar'],
        ['Konversi perbedaan waktu WIB/WITA/WIT benar dan dampak geologis positif + risikonya dijelaskan seimbang'],
        80
      ),
      makeRich(
        'Dinamika Sosial Masyarakat',
        'Interaksi Sosial, Bentuk Akomodasi Konflik, dan Peran Lembaga Sosial',
        'Peserta didik dapat mengidentifikasi syarat interaksi sosial dan menentukan peran lembaga keluarga, pendidikan, atau hukum dalam menyelesaikan masalah sosial.',
        'Kontak sosial & komunikasi, bentuk asosiatif vs disosiatif, fungsi manifes lembaga sekolah dan keluarga.',
        'Menentukan faktor pendorong interaksi dan memilih peran lembaga sosial paling relevan pada kasus masyarakat.',
        ['Pengalaman kehidupan bermasyarakat sehari-hari'],
        ['Klasifikasi asosiatif/disosiatif & fungsi lembaga sosial sesuai tepat dengan konteks kasus'],
        80
      ),
      makeRich(
        'Kegiatan Ekonomi & Kesejahteraan',
        'Permintaan, Penawaran, Kelangkaan Barang Pokok, dan Skala Prioritas',
        'Peserta didik dapat menganalisis faktor penyebab kelangkaan bahan pangan pada tabel harga pasar dan menyusun langkah konsumen serta produsen agar pasar tetap stabil.',
        'Hubungan jumlah barang beredar vs harga, perbedaan kebutuhan vs keinginan, dan peran pasar sebagai tempat distribusi.',
        'Membaca tabel fluktuasi harga & stok barang lalu menyimpulkan penyebab kenaikan harga secara logis.',
        ['Penjumlahan dan persentase perubahan harga sederhana'],
        ['Penurunan stok saat permintaan naik dijelaskan tepat dan langkah prioritas konsumsi realistis'],
        80
      ),
      makeRich(
        'Konektivitas Sejarah & Budaya',
        'Perkembangan Jalur Perdagangan Nusantara hingga Perubahan Sosial Era Kolonial',
        'Peserta didik dapat membandingkan motif perdagangan bebas kerajaan Nusantara dengan monopoli VOC/kolonialisme serta dampaknya bagi kehidupan masyarakat pribumi.',
        'Rempah Nusantara, sistem monopoli pelayaran Hongi, tanam paksa, dan perlawanan rakyat.',
        'Menjelaskan dampak sistem monopoli perdagangan terhadap kesejahteraan petani pada masa lalu.',
        ['Letak kepulauan Indonesia dan sumber daya rempah'],
        ['Perbandingan perdagangan bebas vs monopoli VOC didukung contoh dampak bagi petani lokal'],
        80
      ),
    ];
  }

  // 6. INFORMATIKA & PKK / KEJURUAN
  if (lower.includes('informatika') || lower.includes('dasar kejuruan')) {
    return [
      makeRich(
        'Berpikir Komputasional',
        'Dekomposisi, Pengenalan Pola, Abstraksi, dan Penelusuran Algoritma (Trace)',
        'Peserta didik dapat memecah masalah penjadwalan/pengurutan menjadi sub-masalah dan menelusuri (dry-run trace) setiap langkah pseudocode atau diagram alir dengan input uji.',
        '4 pilar Computational Thinking, simbol flowchart (mulai/proses/keputusan/output), serta pelacakan isi variabel langkah demi langkah.',
        'Menelusuri alur logika algoritma percabangan/perulangan untuk memastikan keluaran benar.',
        ['Operasi logika perbandingan (<, >, =) dan alur urutan kegiatan'],
        ['Tabel trace menunjukkan perubahan nilai variabel di setiap langkah dan bug logika ditemukan bila ada'],
        80
      ),
      makeRich(
        'Algoritma & Pemrograman',
        'Variabel, Percabangan (If–Else), dan Perbaikan Kesalahan Logika (Debugging)',
        'Peserta didik dapat menguji beberapa input uji terhadap potongan algoritma kelulusan/diskon bertingkat dan menemukan cabang kondisi yang tertukar atau keliru batasnya.',
        'Evaluasi kondisi batas (boundary check misal >= 75 vs > 75), alur if–else if–else yang saling lepas, dan trace input uji.',
        'Menjalankan test-case batas pada algoritma dan memperbaiki kondisi percabangan yang salah.',
        ['Pemahaman urutan langkah algoritma dasar'],
        ['Menemukan kasus uji yang gagal (edge case) dan memperbaiki syarat batasnya dengan akurat'],
        80
      ),
      makeRich(
        'Jaringan Komputer & Internet',
        'Topologi Jaringan Lokal (LAN), Alamat IP, dan Keamanan Akun (Anti-Phishing)',
        'Peserta didik dapat membedakan fungsi router, switch, dan DNS pada skema jaringan serta mengidentifikasi ciri tautan atau pesan penipuan (phishing) dari contoh kasus.',
        'LAN vs WAN, DNS menerjemahkan domain ke IP, tanda URL mencurigakan (domain tiruan, desakan panik, minta OTP), serta autentikasi dua faktor (2FA).',
        'Mengaudit contoh pesan/URL untuk menentukan indikator phishing dan tindakan pengamanan yang tepat.',
        ['Penggunaan peramban web dan surel sehari-hari'],
        ['Minimal 3 indikator teknis tautan palsu teridentifikasi dan alasan dilarangnya berbagi OTP tepat'],
        80
      ),
      makeRich(
        'Teknologi Informasi & Analisis Data',
        'Pengelolaan Data Tabel (Spreadsheet): Formula SUM, AVERAGE, COUNTIF & IF',
        'Peserta didik dapat memilih dan menuliskan rumus spreadsheet yang tepat untuk menghitung rekap penjualan atau nilai dari tabel sel berkoordinat (mis. B2:B6).',
        'Referensi sel (kolom+baris), fungsi SUM, AVERAGE, MAX/MIN, dan IF kondisional disertai pengecekan hasil perhitungan manual.',
        'Menulis rumus spreadsheet sesuai rentang sel tabel dan memverifikasi hasilnya.',
        ['Operasi penjumlahan, pembagian, dan tanda pertidaksamaan'],
        ['Penulisan sintaks rumus (=SUM, =AVERAGE, =IF) merujuk sel yang tepat sesuai tabel'],
        80
      ),
    ];
  }

  if (lower.includes('pkk') || lower.includes('kewirausahaan')) {
    return [
      makeRich(
        'Peluang Usaha & Pemasaran',
        'Analisis Peluang Usaha (SWOT) dan Segmentasi Pasar Produk Kreatif',
        'Peserta didik dapat memetakan Strength, Weakness, Opportunity, Threat dari profil usaha bengkel/jasa sekolah dan merumuskan strategi promosi realistis sesuai target pembeli.',
        'Membedakan faktor internal (S-W) dan eksternal (O-T), penentuan target konsumen, dan keunikan nilai produk (value proposition).',
        'Mengklasifikasikan kondisi usaha ke kuadran SWOT internal/eksternal dengan tepat.',
        ['Mengenal produk barang/jasa di lingkungan kejuruan masing-masing'],
        ['Tidak mencampur faktor internal dan eksternal SWOT serta menghasilkan 2 langkah pemasaran konkret'],
        90
      ),
      makeRich(
        'Keuangan Usaha',
        'Perhitungan Biaya Tetap, Biaya Variabel, HPP per Unit, dan BEP Usaha',
        'Peserta didik dapat menghitung total biaya produksi, Harga Pokok Produksi (HPP) per unit, menentukan harga jual dengan margin tertentu, serta titik impas (BEP unit).',
        'Fixed Cost vs Variable Cost, HPP = Total Biaya / Jumlah Produk, BEP Unit = Biaya Tetap / (Harga Jual − Biaya Variabel/unit).',
        'Menghitung biaya unit hingga break-even point dan memeriksa balik pendapatan pada volume BEP.',
        ['Operasi hitung aritmetika dan persentase keuntungan'],
        ['HPP, harga jual, dan jumlah unit BEP terhitung benar dan dicek ulang terhadap total biaya'],
        90
      ),
      makeRich(
        'Standar Mutu & K3LH',
        'Keselamatan Kerja (K3LH), Budaya Industri 5R, dan Pengawasan Mutu (SOP)',
        'Peserta didik dapat mengaudit daftar kondisi ruang praktik berdasarkan prinsip 5R dan mengidentifikasi alat pelindung diri (APD) wajib sebelum proses produksi.',
        '5R (Ringkas, Rapi, Resik, Rawat, Rajin), identifikasi bahaya kerja listrik/mekanik/bahan, dan urutan checklist kendali mutu.',
        'Menemukan pelanggaran K3LH dalam skenario praktik kerja dan menetapkan tindakan perbaikan.',
        ['Mengenal lingkungan kerja praktik atau laboratorium'],
        ['Seluruh pelanggaran K3LH tertangkap beserta APD spesifik yang diperlukan'],
        90
      ),
      makeRich(
        'Prototipe & Produk Kreatif',
        'Perencanaan Alur Produksi, Jadwal Pembuatan Prototipe, dan Uji Fungsi',
        'Peserta didik dapat menyusun alur tahap produksi dari desain gambar kerja hingga uji kelayakan fungsi produk sebelum dipasarkan.',
        'Gambar kerja & bill of materials (BOM), kendali jadwal pembuatan, dan kriteria lolos uji produk oleh pengguna awal.',
        'Membuat daftar kebutuhan bahan berserta estimasi biaya dan langkah kontrol kualitas prototipe.',
        ['Perencanaan produk sederhana sesuai bidang keahlian'],
        ['Daftar bahan (BOM) memuat satuan & jumlah terukur serta indikator uji fungsi teramati'],
        90
      ),
    ];
  }

  // 7. PENDIDIKAN PANCASILA, PAI & MAPEL KEMENAG
  if (lower.includes('pancasila') || lower.includes('ppkn')) {
    return [
      makeRich(
        'Pancasila',
        'Penerapan Nilai Sila Pancasila dalam Menyelesaikan Persoalan Sehari-hari',
        'Peserta didik dapat menghubungkan peristiwa atau dilema di sekolah dengan nilai sila Pancasila yang relevan dan merumuskan tindakan adil yang menjaga persatuan.',
        'Keterkaitan antarsila (Ketuhanan, Kemanusiaan, Persatuan, Musyawarah, Keadilan Sosial) dan contoh konkret pencegahan perundungan.',
        'Menganalisis perilaku pada skenario warga kelas dan merumuskan solusi musyawarah yang adil.',
        ['Mengenal bunyi kelima sila Pancasila dan simbolnya'],
        ['Penilaian sikap mengacu tepat pada nilai sila terkait dan alternatif solusi tidak melanggar hak teman'],
        75
      ),
      makeRich(
        'Undang-Undang Dasar NRI Tahun 1945',
        'Norma Masyarakat, Tata Tertib Sekolah, serta Keseimbangan Hak dan Kewajiban',
        'Peserta didik dapat membedakan 4 jenis norma (agama, kesusilaan, kesopanan, hukum) beserta sanksinya dan menyeimbangkan hak serta kewajiban pada kasus pelanggaran tata tertib.',
        'Sumber dan sifat sanksi keempat norma; mengapa hak siswa baru terwujud tertib bila kewajiban bersama dipenuhi.',
        'Mengkategorikan pelanggaran aturan ke jenis norma dan menjelaskan konsekuensinya secara adil.',
        ['Pengalaman mematuhi aturan rumah dan sekolah'],
        ['Klasifikasi 4 norma + sanksi tepat dan argumen keseimbangan hak-kewajiban masuk akal'],
        75
      ),
      makeRich(
        'Bhinneka Tunggal Ika',
        'Menghargai Keberagaman Suku, Budaya, dan Toleransi di Lingkungan Sekolah',
        'Peserta didik dapat mengidentifikasi sikap empati terhadap perbedaan budaya/bahasa/agama dan merancang aturan kerja kelompok yang inklusif bagi semua siswa.',
        'Makna Bhinneka Tunggal Ika, mengenali prasangka/stereotip merugikan, dan etika berkomunikasi lintas latar belakang.',
        'Mengkritisi contoh perlakuan stereotip dan menyusun tindakan menghargai perbedaan.',
        ['Mengenal ragam budaya daerah Nusantara'],
        ['Tindakan inklusif spesifik dituliskan tanpa merendahkan kelompok mana pun'],
        75
      ),
      makeRich(
        'Negara Kesatuan Republik Indonesia',
        'Musyawarah Mufakat, Gotong Royong, dan Partisipasi Warga Muda di Sekolah',
        'Peserta didik dapat membedakan pengambilan keputusan melalui musyawarah mufakat vs voting dan mempraktikkan langkah menyampaikan pendapat tanpa memaksakan kehendak.',
        'Prinsip musyawarah untuk kepentingan bersama, menerima hasil keputusan bersama secara lapang dada, dan proyek gotong royong kelas.',
        'Menyusun tata cara penyelesaian perbedaan pendapat kelas secara demokratis dan damai.',
        ['Pengalaman diskusi kelompok kelas'],
        ['Langkah musyawarah menjamin setiap pihak didengar dan hasil keputusan mengutamakan kepentingan umum'],
        75
      ),
    ];
  }

  if (lower.includes('fikih')) {
    return [
      makeRich(
        'Fikih Ibadah',
        'Ketentuan Thaharah: Pembagian Najis, Wudhu, dan Tayamum dalam Kondisi Darurat',
        'Peserta didik dapat membedakan tingkatan najis (mukhaffafah, mutawassithah, mughallazhah) beserta cara menyucikannya dan menentukan syarat sah tayamum pada skenario kondisi tertentu.',
        'Air suci menyucikan vs musta’mal, pembagian 3 najis, syarat dan rukun wudhu, serta udzur syar’i tayamum saat ketiadaan air atau sakit.',
        'Menentukan tata cara bersuci yang sah sesuai jenis najis atau kondisi ketiadaan air.',
        ['Memahami perbedaan hadas dan najis dasar'],
        ['Pasangan tingkat najis + cara penyuciannya tepat dan alasan boleh/tidaknya tayamum sesuai syarat'],
        80
      ),
      makeRich(
        'Fikih Ibadah',
        'Syarat, Rukun Shalat Fardhu, Jamaah, dan Ketentuan Sujud Sahwi/Syukur',
        'Peserta didik dapat membedakan syarat sah vs rukun shalat, menentukan tindakan tepat bila ragu bilangan rakaat (sujud sahwi), serta tata cara shalat berjamaah masbuq.',
        'Perbedaan syarat dan rukun, pembatal shalat, tata cara makmum masbuq, dan sebab pelaksanaan sujud sahwi/tilawah/syukur.',
        'Mendiagnosis masalah ibadah (mis. lupa tasyahud awal atau terlambat jamaah) dan menentukan tuntunan fikihnya.',
        ['Bacaan dan gerakan dasar shalat fardhu'],
        ['Identifikasi status rakaat makmum masbuq dan kapan sujud sahwi dilakukan tepat'],
        80
      ),
      makeRich(
        'Fikih Muamalah',
        'Jual Beli Sah, Khiyar, Akad Kerja Sama, dan Identifikasi Praktik Riba/Gharar',
        'Peserta didik dapat memeriksa keabsahan transaksi jual beli pada skenario kasus (penjual-pembeli-barang-ijab qabul), memilih jenis khiyar tepat, dan mengenali unsur gharar/riba.',
        'Rukun & syarat barang halal/jelas takaran, khiyar majelis/syarat/aib, serta prinsip kejelasan dan kerelaan dalam transaksi.',
        'Menilai sah atau tidaknya transaksi berdasarkan pemenuhan syarat barang dan kejelasan harga/waktu.',
        ['Pemahaman transaksi jual beli sehari-hari'],
        ['Analisis skenario menunjukkan syarat mana yang terpenuhi/cacat serta solusi akad yang jelas'],
        80
      ),
      makeRich(
        'Fikih Zakat & Sosial',
        'Perhitungan Zakat Fitrah, Nishab Zakat Mal, dan Delapan Golongan Mustahiq',
        'Peserta didik dapat menghitung kewajiban zakat fitrah keluarga dan memeriksa apakah harta telah mencapai nishab/haul pada kasus harta perdagangan/emas beserta penentuan mustahiqnya.',
        'Ketentuan zakat fitrah (2,5 kg / 3,5 L bahan makanan pokok), syarat nishab 85 gram emas + haul 1 tahun dengan kadar 2,5%, dan klasifikasi mustahiq.',
        'Menghitung besaran zakat yang wajib dikeluarkan jika syarat nishab dan haul terpenuhi.',
        ['Operasi desimal & perkalian persentase 2,5%'],
        ['Pengecekan syarat nishab & haul dilakukan sebelum menghitung 2,5% nominal zakat'],
        80
      ),
    ];
  }

  if (lower.includes("qur'an") || lower.includes('quran') || lower.includes('hadis')) {
    return [
      makeRich(
        'Al-Qur’an & Ilmu Tajwid',
        'Hukum Bacaan Nun Sukun/Tanwin (Izhar, Idgham, Iqlab, Ikhfa) dan Mim Sukun',
        'Peserta didik dapat mengklasifikasikan lafaz berharakat nun sukun atau tanwin pada potongan contoh bacaan ke dalam 5 hukum bacaan beserta alasan huruf pertemuannya.',
        'Daftar huruf Izhar Halqi (6), Idgham Bighunnah (4), Bilaghunnah (2), Iqlab (ب), Ikhfa (15), serta Ikhfa Syafawi/Idgham Mimi/Izhar Syafawi.',
        'Mengidentifikasi hukum tajwid dari potongan contoh kata Arab dan menjelaskan cara bacanya (dengung/jelas).',
        ['Mengenal huruf hijaiyah dan tanda sukun/tanwin'],
        ['Klasifikasi hukum bacaan cocok dengan huruf setelah nun sukun/tanwin dan cara baca dengung/jelas tepat'],
        80
      ),
      makeRich(
        'Al-Qur’an & Ilmu Tajwid',
        'Hukum Bacaan Mad Thabi’i, Mad Far’i, dan Tanda Waqaf saat Tilawah',
        'Peserta didik dapat membedakan panjang bacaan Mad Thabi’i (2 harakat) dari Mad Wajib Muttashil dan Mad Jaiz Munfashil serta menentukan cara berhenti/lanjut pada tanda waqaf.',
        'Huruf mad (alif-wawu-ya), penyebab panjang tambahan karena hamzah dalam satu kata vs terpisah kata, dan tanda waqaf (م، لا، ج، صلى، قلى).',
        'Menganalisis potongan contoh lafaz untuk menentukan ukuran harakat mad dan cara waqaf tepat.',
        ['Hukum bacaan mad dasar 2 harakat'],
        ['Ukuran harakat dan perbedaan hamzah dalam satu kata vs antar kata diidentifikasi benar'],
        80
      ),
      makeRich(
        'Kandungan Ayat & Hadis',
        'Etika Menuntut Ilmu, Kejujuran, dan Tanggung Jawab dalam Kehidupan Pelajar',
        'Peserta didik dapat menghubungkan pesan pokok materi tentang semangat menuntut ilmu, kesabaran, dan kejujuran dengan sikap pelajar terhadap tugas belajar serta sumber digital.',
        'Makna amanah ilmiah, jujur saat ulangan/tugas tanpa plagiat, adab kepada guru dan orang tua, serta implementasi nyata.',
        'Menelaah dilema kejujuran pelajar dan merumuskan sikap sesuai nilai akhlak Qur’ani dan Hadis.',
        ['Kemampuan membaca ringkasan terjemah dan pesan ajaran Islam'],
        ['Sikap yang dipilih mencerminkan jujur dan hormat ilmu disertai alasan nilai akhlak jelas'],
        80
      ),
      makeRich(
        'Al-Qur’an & Hadis Sosial',
        'Sikap Tolong-Menolong (Ta’awun), Kepedulian Sosial, dan Kelestarian Alam',
        'Peserta didik dapat menganalisis bentuk sikap ta’awun (bekerja sama dalam kebaikan, bukan dalam pelanggaran) serta menjaga amanah kelestarian lingkungan sekolah.',
        'Batas ta’awun dalam kebaikan vs larangan membantu perbuatan curang/merusak, serta tanggung jawab sebagai khalifah penjaga lingkungan.',
        'Membedakan kerja sama positif dari pembiaran pelanggaran pada skenario pergaulan remaja.',
        ['Nilai dasar kebersamaan dan kepedulian'],
        ['Penilaian skenario membedakan tolong-menolong positif dari pelanggaran aturan dengan argumen benar'],
        80
      ),
    ];
  }

  if (lower.includes('akidah') || lower.includes('akhlak')) {
    return [
      makeRich(
        'Akidah',
        'Makna Asmaul Husna dan Pengaruhnya dalam Sikap Tanggung Jawab Sehari-hari',
        'Peserta didik dapat menjelaskan arti Asmaul Husna (seperti Al-‘Alim, Al-Khabir, Al-‘Adl, Al-Qayyum) dan menunjukkan contoh perilaku nyata ketika diawasi maupun tidak diawasi orang lain.',
        'Kaitan kesadaran sifat Allah Maha Mengetahui dan Maha Adil dengan integritas diri di sekolah dan rumah.',
        'Menghubungkan makna sifat-sifat Allah dengan keputusan perilaku jujur dalam situasi tanpa pengawas.',
        ['Mengenal rukun iman dan nama-nama baik Allah'],
        ['Contoh perilaku relevan langsung dengan makna masing-masing Asmaul Husna yang dibahas'],
        75
      ),
      makeRich(
        'Akhlak',
        'Membiasakan Akhlak Mahmudah (Husnuzhan, Tawadhu, Tasamuh) & Menjauhi Ghibah/Hasad',
        'Peserta didik dapat membedakan prasangka baik (husnuzhan), rendah hati (tawadhu), dan toleransi (tasamuh) dari perilaku iri dengki/ghibah dalam kasus interaksi media sosial.',
        'Ciri dan dampak psikologis-sosial hasad, takabur, dan menyebar aib (ghibah) di grup percakapan digital vs etika tabayyun.',
        'Mengevaluasi pesan media sosial yang berpotensi ghibah dan menyusun respon etis berprinsip tabayyun.',
        ['Etika komunikasi santun antar teman'],
        ['Langkah verifikasi (tabayyun) dan penolakan menyebarkan aib dijelaskan secara konkret'],
        75
      ),
      makeRich(
        'Adab Islam',
        'Adab Terhadap Orang Tua, Guru, dan Teman dalam Pergaulan Remaja',
        'Peserta didik dapat mempraktikkan tata krama berbicara dan berbuat baik (birrul walidain, memuliakan guru, menghargai teman sebaya) dalam dialog skenario konflik harian.',
        'Contoh kalimat santun saat berbeda pendapat dengan orang tua/guru, menolak ajakan buruk teman tanpa permusuhan.',
        'Menyusun respons dialog santun pada situasi perbedaan pendapat generasi maupun sebaya.',
        ['Pengalaman interaksi keluarga dan sekolah'],
        ['Pilihan bahasa dialog tetap hormat, tegas pada prinsip baik, dan tidak merendahkan'],
        75
      ),
      makeRich(
        'Akidah & Keteladanan',
        'Meneladani Keteguhan, Kesabaran, dan Kejujuran Kisah Rasul dan Sahabat',
        'Peserta didik dapat mengidentifikasi nilai ketekunan dan amanah dari kisah keteladanan serta merumuskan rencana kebiasaan baik mingguan di kelas.',
        'Sifat wajib Rasul (Shiddiq, Amanah, Tabligh, Fathanah) dan penerapannya dalam kepemimpinan siswa/kelompok.',
        'Memetakan 4 sifat keteladanan ke tanggung jawab kerja kelompok atau tugas harian.',
        ['Pemahaman kisah teladan dasar'],
        ['Setiap sifat keteladanan dipadankan dengan aksi konkret pelajar yang teramati'],
        75
      ),
    ];
  }

  if (lower.includes('ski') || lower.includes('kebudayaan islam')) {
    return [
      makeRich(
        'Sejarah Peradaban Islam Awal',
        'Strategi Dakwah Periode Makkah (Sirriyah–Jahriyah) dan Pembinaan Masyarakat Madinah',
        'Peserta didik dapat membandingkan strategi dakwah sembunyi-sembunyi (sirriyah) dan terang-terangan di Makkah serta prinsip persaudaraan dan Piagam Madinah.',
        'Kondisi masyarakat Jahiliyah Makkah, ketabahan menghadapi boikot, hijrah ke Madinah, dan nilai Piagam Madinah dalam masyarakat majemuk.',
        'Menghubungkan tahapan dakwah dengan tantangan sosial masing-masing periode secara kronologis.',
        ['Memahami garis waktu awal perkembangan Islam'],
        ['Perbedaan karakteristik periode Makkah (penguatan akidah) vs Madinah (tatanan sosial/hukum) tepat'],
        80
      ),
      makeRich(
        'Khazanah Peradaban & Ilmu Pengetahuan',
        'Kemajuan Ilmu Pengetahuan, Perpustakaan, dan Tokoh Cendekiawan Peradaban Islam Klasik',
        'Peserta didik dapat mengidentifikasi kontribusi ilmuwan klasik (matematika, kedokteran, optik, geografi) serta faktor pendukung budaya riset dan toleransi ilmu pada masanya.',
        'Peran Baitul Hikmah, penerjemahan karya lintas peradaban, metode eksperimen optik/kedokteran, dan relevansi tradisi membaca bagi pelajar.',
        'Mengelompokkan kontribusi tokoh dan menyimpulkan syarat tumbuhnya peradaban keilmuan.',
        ['Membaca profil sejarah ringkas'],
        ['Padanan tokoh dengan bidang keilmuannya benar dan faktor pendorong literasi teridentifikasi'],
        80
      ),
      makeRich(
        'Islam di Nusantara',
        'Jalur Masuknya Islam ke Nusantara dan Pendekatan Kultural Wali Songo',
        'Peserta didik dapat menjelaskan 4 jalur penyebaran Islam damai di Nusantara (perdagangan, pernikahan, pendidikan pesantren, seni budaya) dan meneladani sikap bijaksana Wali Songo.',
        'Mengapa penyebaran melalui akulturasi budaya dan perdagangan diterima baik masyarakat lokal Nusantara tanpa paksaan.',
        'Menganalisis bukti akulturasi seni/arsitektur/kesusastraan dalam penyebaran Islam Nusantara.',
        ['Mengenal peta perdagangan Nusantara'],
        ['Contoh strategi kultural (mis. arsitektur, wayang, tembang/pesantren) dijelaskan akurat'],
        80
      ),
      makeRich(
        'Keteladanan & Refleksi Sejarah',
        'Organisasi Pembaruan Pendidikan Islam dan Peran Tokoh dalam Kebangsaan Indonesia',
        'Peserta didik dapat menelaah gagasan pembaruan pendidikan madrasah modern dan kontribusi tokoh ulama/santri dalam memperjuangkan kemerdekaan Indonesia.',
        'Perkembangan madrasah/pesantren sebagai pusat literasi kebangsaan dan integrasi ilmu agama serta pengetahuan umum.',
        'Menghubungkan cita-cita pembaruan pendidikan masa lalu dengan kesiapan belajar pelajar masa kini.',
        ['Kronologi Pergerakan Nasional Indonesia dasar'],
        ['Gagasan pembaruan sistem pendidikan dan keterlibatan dalam perjuangan bangsa diidentifikasi jelas'],
        80
      ),
    ];
  }

  if (lower.includes('agama')) {
    // Pendidikan Agama Islam & Budi Pekerti (SD / SMP / SMK)
    return [
      makeRich(
        'Al-Qur’an & Hadis',
        'Adab Menuntut Ilmu, Membaca Tartil, dan Semangat Kejujuran (Shiddiq)',
        'Peserta didik dapat mengidentifikasi aturan dasar tajwid (seperti alif lam atau nun sukun) pada contoh bacaan dan menerapkan sikap jujur dalam situasi belajar.',
        'Prinsip tajwid dasar sesuai jenjang serta kisah dan perilaku nyata jujur, amanah, dan hormat kepada guru.',
        'Menghubungkan bacaan yang tertib dengan kebiasaan jujur dan bertanggung jawab.',
        ['Mengenal huruf hijaiyah dasar dan perilaku jujur di rumah/sekolah'],
        ['Identifikasi contoh hukum bacaan tepat dan keputusan sikap jujur beralasan jelas'],
        75
      ),
      makeRich(
        'Fikih Ibadah',
        'Ketentuan Bersuci (Thaharah) dan Pelaksanaan Shalat Tertib',
        'Peserta didik dapat mengurutkan rukun wudhu/shalat secara benar dan membedakan hal-hal yang membatalkan wudhu maupun shalat.',
        'Urutan niat, anggota wajib wudhu, syarat sah dan rukun shalat, serta manfaat ketenangan diri saat beribadah tertib.',
        'Menyusun urutan tata cara bersuci/shalat tanpa tertukar wajib vs sunnah.',
        ['Kebiasaan berwudhu dan shalat dasar'],
        ['Urutan wudhu dan rukun shalat lengkap tanpa langkah wajib terlewat'],
        75
      ),
      makeRich(
        'Akhlak',
        'Menghindari Perilaku Tercela (Ghibah/Bullying) dan Membangun Toleransi',
        'Peserta didik dapat menganalisis dampak buruk mengejek/menggunjing teman dan mempraktikkan ucapan saling menghargai dalam keberagaman di sekolah.',
        'Etika persaudaraan (ukhuwah), pentingnya tabayyun terhadap kabar, serta cara menjaga lisan dan jempol di era digital.',
        'Mengevaluasi skenario konflik antarsiswa dan memilih tanggapan yang mendamaikan.',
        ['Komunikasi antarteman di sekolah'],
        ['Analisis menyebutkan bahaya menyebar kabar belum jelas dan langkah tabayyun konkret'],
        75
      ),
      makeRich(
        'Sejarah Peradaban Islam',
        'Keteladanan Dakwah Damai dan Amanah Kepemimpinan dalam Sejarah Islam',
        'Peserta didik dapat mengidentifikasi nilai kejujuran, kerja keras, dan toleransi sosial dari sejarah dakwah damai di masyarakat.',
        'Nilai keterbukaan, musyawarah, menolong sesama tanpa membeda-bedakan latar belakang sosial.',
        'Menemukan nilai teladan sejarah untuk diterapkan pada kepengurusan kelas atau kelompok.',
        ['Kemampuan membaca cerita tokoh sejarah'],
        ['Nilai teladan dipadankan langsung dengan praktik amanah dan musyawarah di kelas'],
        75
      ),
    ];
  }

  if (lower.includes('arab')) {
    return [
      makeRich(
        'Istima’ & Kalam (Menyimak–Berbicara)',
        'At-Ta’aruf (Perkenalan) dan Perlengkapan Sekolah dengan Isim Isyarah (هذا / هذه)',
        'Peserta didik dapat memilih kata tunjuk mudzakkar (هذا) dan muannats (هذه) serta kata ganti (أنا، أنتَ، أنتِ) secara tepat untuk dialog perkenalan dan menamai benda kelas.',
        'Mufradat kelas (قلم، كتاب، حقيبة، مسطرة), pembeda akhiran ta’ marbuthah (ـة) untuk muannats, dan kalimat tanya ما هذا / ما هذه.',
        'Memasangkan mufradat benda dengan هذا/هذه sesuai kaidah mudzakkar dan muannats.',
        ['Mengenal huruf hijaiyah sambung dan harakat dasar'],
        ['Pemilihan هذا (tanpa ـة) dan هذه (berakhiran ـة) tepat untuk seluruh kosakata benda'],
        75
      ),
      makeRich(
        'Qira’ah & Kitabah (Membaca–Menulis)',
        'Al-Yaumiyyat (Aktivitas Harian Siswa) dan Pola Kalimat Ismiyyah–Fi’liyyah',
        'Peserta didik dapat membaca paragraf pendek jadwal kegiatan siswa dan menyusun 3 kalimat sederhana tentang jam kegiatan menggunakan fi’il mudhari’ yang sesuai pelaku.',
        'Kosakata kata kerja harian (أستيقظ، أذهب، أدرس), konjugasi awal أـ / تـ / يـ, dan keterangan waktu (صباحًا، نهارًا، مساءً).',
        'Menentukan kesesuaian awalan kata kerja dengan kata ganti pelaku dalam bacaan teks.',
        ['Mufradat kata ganti dasar (أنا، هو، هي)'],
        ['Informasi jam & aktivitas dari teks bacaan tepat dan kalimat tulis sesuai pelaku'],
        75
      ),
      makeRich(
        'Qira’ah (Membaca)',
        'Lingkungan Sekolah, Rumah, dan Kata Keterangan Tempat (أمام، وراء، على، في)',
        'Peserta didik dapat membaca deskripsi letak ruang sekolah/rumah dalam teks pendek bahasa Arab dan menentukan letak objek sesuai kata depan tempat (dzaraf/harf jar).',
        'Kosakata ruangan (فصل، مكتبة، مسجد، ملعب) dan kata depan lokasi dengan harakat kasrah setelah harf jar.',
        'Menafsirkan posisi benda atau ruangan berdasarkan kalimat petunjuk lokasi bahasa Arab.',
        ['Kosakata benda kelas dan angka Arab dasar 1–10'],
        ['Posisi letak ruangan sesuai denah dan keterangan kata depan di teks'],
        75
      ),
      makeRich(
        'Tarkib & Kitabah',
        'Klasifikasi Kalimat Bahasa Arab (Isim, Fi’il, Harf) serta Na’at–Man’ut Sederhana',
        'Peserta didik dapat memilah kata pada kalimat pendek bahasa Arab menjadi kelompok Isim (kata benda), Fi’il (kata kerja), dan Harf (kata sambung/depan).',
        'Tanda dasar isim (diawali ال atau bertanwin), tanda fi’il (terikat waktu), dan fungsi harf (في، إلى، من، على).',
        'Mengidentifikasi kategori kata pada 4–5 kalimat pendek serta mencocokkan kata sifat dengan benda.',
        ['Membaca teks Arab berharakat lengkap'],
        ['Pengelompokan Isim/Fi’il/Harf sesuai tanda gramatikal kata tersebut'],
        75
      ),
    ];
  }

  // 8. SENI BUDAYA & PRAKARYA + PJOK
  if (lower.includes('pjok') || lower.includes('jasmani') || lower.includes('olahraga')) {
    return [
      makeRich(
        'Aktivitas Kebugaran & Kesehatan',
        'Pengukuran Kebugaran Jasmani, Denyut Nadi Latihan, dan Pemanasan Aman',
        'Peserta didik dapat menghitung zona denyut nadi latihan (perbandingan nadi istirahat vs pascaaktivitas) serta mempraktikkan urutan pemanasan statis–dinamis yang aman.',
        'Cara meraba nadi 15 detik × 4 = denyut/menit (bpm), fungsi pemanasan mencegah cedera otot, dan hidrasi air.',
        'Mencatat data denyut nadi pribadi/pasangan sebelum-sesudah aktivitas ringan dan menginterpretasikan kenaikannya.',
        ['Konsep kebugaran tubuh dan kemampuan menghitung perkalian × 4'],
        ['Perhitungan bpm akurat dan langkah pemanasan + pendinginan tidak dilewati demi keselamatan'],
        80
      ),
      makeRich(
        'Keterampilan Gerak Permainan',
        'Analisis Gerak Spesifik Passing, Dribbling, dan Fair Play Permainan Bola',
        'Peserta didik dapat mengidentifikasi bagian tubuh/posisi kaki/tangan yang tepat saat passing dasar dan mengevaluasi kerja sama serta sikap sportif dalam permainan tim.',
        'Posisi tumpuan, perkenaan bola saat passing datar, prinsip passing membuka ruang, dan sikap menghargai lawan/wasit.',
        'Mengamati praktik gerak rekan dan mengisi lembar observasi teknik dasar secara objektif.',
        ['Koordinasi gerak lokomotor dan manipulatif dasar'],
        ['Checklist teknik gerak mencerminkan posisi tumpuan dan sikap fair play teramati'],
        80
      ),
      makeRich(
        'Pola Hidup Sehat',
        'Komposisi Gizi Seimbang (Isi Piringku), Kalori Harian, dan Pencegahan Risiko Kesehatan',
        'Peserta didik dapat mengevaluasi contoh menu makan harian terhadap proporsi Isi Piringku (makanan pokok, lauk pauk, sayur, buah) serta merancang perbaikan menu seimbang.',
        'Porsi setengah piring sayur & buah, setengah makanan pokok & lauk; batas gula-garam-lemak; pentingnya tidur cukup bagi remaja/anak.',
        'Membandingkan komposisi piring makan contoh dengan pedoman gizi seimbang dan memperbaiki kekurangannya.',
        ['Mengenal kelompok bahan pangan lokal'],
        ['Audit menu mengidentifikasi bagian zat gizi yang kurang/berlebih beserta pengganti realistis'],
        80
      ),
      makeRich(
        'Keterampilan Gerak Dasar / Atletik',
        'Prinsip Lari, Lompat, atau Senam Lantai Dasar dengan Prosedur Keselamatan Matras',
        'Peserta didik dapat mengurutkan tahap awalan–tolakan–mendarat secara aman serta mengenali hal yang wajib diperiksa sebelum praktik senam atau atletik (alas empuk/sepatu).',
        'Teknik mendarat mengeper (lutut sedikit ditekuk untuk meredam benturan), memeriksa matras/lintasan bebas benda keras, dan pendampingan guru.',
        'Mengaudit kelayakan alat dan urutan fase gerak pendaratan untuk meminimalkan cedera sendi.',
        ['Keseimbangan dan kelenturan dasar'],
        ['Daftar periksa keselamatan lintasan/matras lengkap dan mekanik pendaratan mengeper dijelaskan benar'],
        80
      ),
    ];
  }

  // SENI BUDAYA & PRAKARYA
  return [
    makeRich(
      'Mengalami & Menciptakan (Seni Rupa)',
      'Unsur Rupa dan Pengolahan Motif Ragam Hias Nusantara pada Sketsa Desain',
      'Peserta didik dapat mengidentifikasi jenis motif ragam hias (flora, fauna, geometris, figuratif) serta menerapkan pola pengulangan/simetri saat membuat sketsa karya.',
      'Titik, garis, bidang, warna, komposisi berimbang (simetris/asimetris), serta makna motif daerah Nusantara.',
      'Menganalisis komposisi motif acuan dan merancang sketsa ragam hias berpola rapi.',
      ['Mengenal alat gambar pensil, penggaris, dan warna dasar'],
      ['Karya sketsa menunjukkan pola pengulangan konsisten dan keterangan jenis motif/daerah akurat'],
      80
    ),
    makeRich(
      'Merefleksikan & Menciptakan (Prakarya)',
      'Perancangan Produk Kerajinan Bahan Alam / Daur Ulang dengan Prinsip 3R & K3 Alat',
      'Peserta didik dapat memilih bahan alam/limbah bersih, membuat sketsa produk fungsional beserta daftar alat aman, dan mengevaluasi kekokohan hasil karyanya.',
      'Tahap identifikasi bahan -> desain ukuran -> keselamatan penggunaan alat potong/lem -> uji fungsi & estetika produk.',
      'Menyusun rencana alat-bahan aman sebelum perakitan dan menguji kelayakan karya akhir.',
      ['Membedakan bahan organik kering dan anorganik bersih'],
      ['Rencana kerja memuat alat, bahan ukuran jelas, langkah keselamatan alat tajam, dan kriteria uji karya'],
      80
    ),
    makeRich(
      'Mengalami & Mengekspresikan (Seni Musik/Tari)',
      'Pola Irama, Tempo, atau Komposisi Gerak Berpola dalam Karya Pertunjukan',
      'Peserta didik dapat membedakan ketukan birama (2/4, 3/4, 4/4) atau pola lantai tari (lurus, lengkung, diagonal) dalam pengamatan rekaman/praktik singkat.',
      'Ketukan kuat–lemah, perubahan tempo lambat–sedang–cepat, atau fungsi pola lantai menjaga keteraturan penyajian kelompok.',
      'Mencatat pola birama/pola lantai dari karya pengamatan dan merefleksikan sinkronisasi kelompok.',
      ['Kemampuan mendengarkan ritme atau mengamati gerak berurutan'],
      ['Catatan pola ketukan/lantai konsisten dengan tugas pengamatan dan refleksi perbaikan tempo tepat'],
      80
    ),
    makeRich(
      'Berpikir & Bekerja Artistik',
      'Kurasi Karya Kelas: Menulis Label Karya, Evaluasi Proporsi, dan Apresiasi Santun',
      'Peserta didik dapat menilai unsur rupa (proporsi, warna, kerapian finishing) pada karya teman menggunakan rubrik observasi objektif tanpa komentar merendahkan.',
      'Cara menulis label karya (Judul, Pembuat, Media/Bahan, Konsep) dan memberi saran perbaikan berimbang (kekuatan + saran teknis).',
      'Menyusun ulasan apresiatif dua bagian (hal yang sudah kuat dan saran teknis terukur).',
      ['Pemahaman unsur rupa dan bahasa deskriptif santun'],
      ['Ulasan menyebut unsur visual konkret (mis. kontras warna, kerapian garis), bukan sekadar "bagus"'],
      80
    ),
  ];
}
