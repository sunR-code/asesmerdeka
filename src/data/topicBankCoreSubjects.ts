import {
  makeTopicEntry,
  type CurriculumTopicEntry,
  type ExactFaseCode,
  type TopicJenjangCategory,
} from './kurikulumTopicBankTypes';

function m(
  topicId: string,
  mataPelajaran: string,
  jenjang: TopicJenjangCategory,
  faseCode: ExactFaseCode,
  elemen: string,
  topik: string,
  tujuanPembelajaran: string,
  arahanRangkuman: string,
  kompetensiInti: string,
  prasyarat: string[],
  buktiKetercapaian: string[],
  suggestedSemester: '1 (Ganjil)' | '2 (Genap)',
  progressionStage: CurriculumTopicEntry['progressionStage'],
  opts?: {
    prasyaratTopicIds?: string[];
    relatedTopicIds?: string[];
    suggestedGrade?: string;
    estimasiMenitSesi?: number;
    subTP?: CurriculumTopicEntry['subTP'];
  }
): CurriculumTopicEntry {
  return makeTopicEntry({
    topicId,
    mataPelajaran,
    jenjang,
    faseCode,
    elemen,
    topik,
    tujuanPembelajaran,
    arahanRangkuman,
    kompetensiInti,
    prasyarat,
    buktiKetercapaian,
    suggestedSemester,
    progressionStage,
    prasyaratTopicIds: opts?.prasyaratTopicIds,
    relatedTopicIds: opts?.relatedTopicIds,
    suggestedGrade: opts?.suggestedGrade,
    estimasiMenitSesi: opts?.estimasiMenitSesi ?? 80,
    subTP: opts?.subTP,
    sumberDokumen: 'Kurasi Pedagogis AsesMerdeka — Merujuk SK Kepala BSKAP No. 046/H/KR/2025 & Panduan Mapel Kemendikdasmen',
    tahunVersi: '2025',
    urlReferensi: 'https://kurikulum.kemendikdasmen.go.id/panduan-mapel',
    statusVerifikasiSumber: 'kurasi_internal',
    jenisKonten: 'kurasi_sistem',
  });
}

export const CORE_SUBJECT_TOPICS: CurriculumTopicEntry[] = [
  // =====================================================================
  // 1. MATEMATIKA — SD FASE A (Kelas 1-2)
  // =====================================================================
  m(
    'mat-fa-s1-cacah20', 'Matematika', 'SD/MI', 'Fase A', 'Bilangan',
    'Membilang, Penjumlahan, dan Pengurangan Bilangan Cacah sampai 20 dengan Benda Konkret',
    'Peserta didik dapat membilang, menjumlahkan, dan mengurangkan bilangan cacah sampai 20 menggunakan benda konkret di sekitar kelas.',
    'Gunakan gambar atau hitungan benda konkret (pensil, buku, kelereng) langkah demi langkah untuk penjumlahan dan pengurangan sampai 20.',
    'Menghitung gabungan dan sisa kelompok benda secara tepat lalu menuliskannya dalam kalimat matematika sederhana.',
    ['Membilang bilangan 1 sampai 20 secara berurutan'],
    ['Hasil penjumlahan/pengurangan sampai 20 tepat', 'Mampu menghubungkan cerita bergambar dengan simbol + atau −'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', estimasiMenitSesi: 70 }
  ),
  m(
    'mat-fa-s1-ukur-takbaku', 'Matematika', 'SD/MI', 'Fase A', 'Pengukuran',
    'Membandingkan Panjang dan Berat Benda dengan Satuan Tidak Baku',
    'Peserta didik dapat mengukur dan membandingkan panjang serta berat benda di kelas menggunakan satuan tidak baku seperti jengkal atau klip.',
    'Jelaskan cara mengukur panjang meja dengan jengkal atau pensil secara berhimpit tanpa celah dan membandingkan benda mana yang lebih panjang/berat.',
    'Mengukur benda nyata dan mengurutkan dari yang paling pendek/ringan ke paling panjang/berat.',
    ['Mengenal istilah lebih panjang, lebih pendek, lebih berat, lebih ringan'],
    ['Mencatat hasil pengukuran dalam jengkal/pensil', 'Menyimpulkan perbandingan ukuran antarbenda dengan benar'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', estimasiMenitSesi: 70 }
  ),
  m(
    'mat-fa-s1-bangundatar', 'Matematika', 'SD/MI', 'Fase A', 'Geometri',
    'Mengenal Bangun Datar Sederhana di Sekitar Kelas (Segitiga, Segiempat, Lingkaran)',
    'Peserta didik dapat mengelompokkan benda sekitar berdasarkan bentuk segitiga, segiempat, dan lingkaran serta menghitung sisi lurusnya.',
    'Tunjukkan ciri sisi dan sudut pada papan tulis, buku, roda, dan penggaris segitiga disertai contoh benda di kelas.',
    'Mengidentifikasi bentuk bangun datar pada benda nyata dan menyebutkan jumlah sisinya.',
    ['Mengamati bentuk benda di lingkungan kelas'],
    ['Mengelompokkan benda ke kategori segitiga/segiempat/lingkaran dengan tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', estimasiMenitSesi: 70 }
  ),
  m(
    'mat-fa-s1-datapict', 'Matematika', 'SD/MI', 'Fase A', 'Analisis Data & Peluang',
    'Mengelompokkan Benda dan Membaca Gambar Data Sederhana',
    'Peserta didik dapat mengelompokkan benda menurut warna atau jenis lalu membaca banyak benda pada daftar gambar sederhana.',
    'Bimbing siswa menghitung tiap kelompok benda, menuliskannya dalam turus sederhana, dan menemukan kelompok terbanyak atau tersedikit.',
    'Menyortir benda ke dalam kategori dan menyebutkan selisih jumlah kelompok.',
    ['Membilang benda 1 sampai 20'],
    ['Jumlah tiap kelompok dihitung tepat dan kesimpulan terbanyak/tersedikit benar'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', estimasiMenitSesi: 70 }
  ),
  m(
    'mat-fa-s2-cacah100', 'Matematika', 'SD/MI', 'Fase A', 'Bilangan',
    'Nilai Tempat Puluhan–Satuan dan Operasi Bilangan Cacah sampai 100',
    'Peserta didik dapat menentukan nilai tempat puluhan dan satuan serta menyelesaikan penjumlahan/pengurangan bilangan sampai 100 dalam soal cerita belanja sederhana.',
    'Gunakan bundel stik es krim berisi 10 batang untuk memvisualisasikan puluhan, satuan, dan proses menyimpan/meminjam.',
    'Merepresentasikan nilai tempat dua angka dan menghitung penjumlahan/pengurangan bersusun dua digit.',
    ['Penjumlahan dan pengurangan bilangan sampai 20'],
    ['Menguraikan bilangan 2 digit ke puluhan + satuan', 'Menyelesaikan soal cerita harga barang sampai 100 dengan benar'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['mat-fa-s1-cacah20'], relatedTopicIds: ['mat-fa-s1-cacah20'], suggestedGrade: '2', estimasiMenitSesi: 70 }
  ),
  m(
    'mat-fa-s2-waktu-pecahan', 'Matematika', 'SD/MI', 'Fase A', 'Pengukuran',
    'Membaca Jam Analog (Jam Tepat & Setengah Jam) serta Mengenal Bagian Setengah & Seperempat',
    'Peserta didik dapat membaca waktu pada jam analog (tepat jam dan setengah jam) serta membagi benda utuh menjadi setengah dan seperempat sama besar.',
    'Gunakan model jam kertas dengan jarum jam/menit dan lipatan kertas warna untuk menunjukkan bagian 1/2 dan 1/4 sama besar.',
    'Menghubungkan posisi jarum jam dengan jadwal aktivitas harian serta membedakan pembagian adil 1/2 dan 1/4.',
    ['Membilang loncat 5 dan 10 serta membandingkan ukuran benda'],
    ['Menuliskan pukul tepat/setengah jam dengan benar', 'Membagi bangun kertas menjadi 2 atau 4 bagian sama besar'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['mat-fa-s1-ukur-takbaku'], relatedTopicIds: ['mat-fa-s1-ukur-takbaku'], suggestedGrade: '2', estimasiMenitSesi: 70 }
  ),
  m(
    'mat-fa-s2-pola-ruang', 'Matematika', 'SD/MI', 'Fase A', 'Aljabar & Geometri',
    'Pola Bilangan/Gambar Berulang dan Pengenalan Bangun Ruang (Kubus, Balok, Bola, Tabung)',
    'Peserta didik dapat melanjutkan pola bentuk maupun pola bilangan berulang serta mengelompokkan benda sehari-hari menurut bangun ruangnya.',
    'Amati kaleng susu, dadu, kotak pensil, dan bola untuk membedakan sisi datar vs lengkung serta pola selang-seling.',
    'Menemukan aturan pola berulang dan mencocokkan benda nyata dengan nama bangun ruang.',
    ['Mengenal bangun datar segitiga, segiempat, dan lingkaran'],
    ['Melengkapi suku pola gambar/bilangan yang hilang', 'Membedakan balok, kubus, tabung, dan bola di kelas'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['mat-fa-s1-bangundatar'], relatedTopicIds: ['mat-fa-s1-bangundatar'], suggestedGrade: '2', estimasiMenitSesi: 70 }
  ),
  m(
    'mat-fa-s2-piktogram', 'Matematika', 'SD/MI', 'Fase A', 'Analisis Data & Peluang',
    'Menyajikan Data Kelas ke Piktogram dan Membandingkan Kategori',
    'Peserta didik dapat mengumpulkan data pilihan teman sekelas (mis. buah favorit), menggambarkannya dalam piktogram 1 gambar = 1 siswa, dan menjawab pertanyaan selisih.',
    'Latih siswa melakukan survei kecil 10–15 teman lalu menyusun stiker/ikon berjajar rapi pada grafik gambar.',
    'Menyusun piktogram rapi dengan sumbu kategori jelas dan membandingkan selisih antar kategori.',
    ['Mengelompokkan benda menurut kategori'],
    ['Jumlah simbol pada piktogram sama dengan data turus', 'Menentukan selisih kategori terbanyak dan tersedikit'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['mat-fa-s1-datapict'], relatedTopicIds: ['mat-fa-s1-datapict'], suggestedGrade: '2', estimasiMenitSesi: 70 }
  ),

  // =====================================================================
  // 1B. MATEMATIKA — SD FASE B (Kelas 3-4) — terpisah dari Fase C!
  // =====================================================================
  m(
    'mat-fb-s1-cacah10000', 'Matematika', 'SD/MI', 'Fase B', 'Bilangan',
    'Operasi Bilangan Cacah sampai 10.000, Perkalian, dan Pembagian Bersisa',
    'Peserta didik dapat melakukan penjumlahan, pengurangan, perkalian, dan pembagian bilangan cacah dalam konteks pembagian barang secara adil.',
    'Gunakan model area/susun pendek untuk perkalian 2-digit serta pembagian berulang dengan sisa yang bermakna.',
    'Menyelesaikan operasi hitung empat dasar bilangan cacah hingga ribuan dan menafsirkan sisa pembagian.',
    ['Nilai tempat puluhan dan satuan sampai 100'],
    ['Hasil hitung bersusun tepat', 'Menafsirkan hasil bagi dan sisa pada soal cerita pembagian kelompok'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4' }
  ),
  m(
    'mat-fb-s1-keliling-luas-persegi', 'Matematika', 'SD/MI', 'Fase B', 'Pengukuran',
    'Pengukuran Panjang Baku (cm, m) serta Keliling dan Luas Persegi & Persegi Panjang',
    'Peserta didik dapat mengukur panjang menggunakan penggaris/meteran baku serta menghitung keliling dan luas persegi atau persegi panjang dengan satuan persegi.',
    'Bedakan keliling sebagai panjang tepi luar dan luas sebagai banyaknya petak satuan yang menutupi permukaan.',
    'Membedakan konsep keliling vs luas dan menggunakan satuan baku cm / cm² secara tepat.',
    ['Membandingkan ukuran benda dengan satuan tidak baku'],
    ['Menghitung keliling dan luas denah meja/taman kecil dengan satuan tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4' }
  ),
  m(
    'mat-fb-s1-pecahan-dasar', 'Matematika', 'SD/MI', 'Fase B', 'Bilangan',
    'Pecahan Berpembilang Satu, Pecahan Senilai, dan Membandingkan Pecahan Sederhana',
    'Peserta didik dapat membandingkan pecahan berpenyebut sama maupun berbeda sederhana menggunakan pita pecahan dan menentukan pecahan senilai.',
    'Visualisasikan 1/2 = 2/4 = 3/6 dengan kertas lipat sebelum mengalikan pembilang dan penyebut dengan faktor sama.',
    'Menunjukkan kesetaraan pecahan dengan model visual dan mengurutkan pecahan dari terkecil.',
    ['Mengenal konsep setengah dan seperempat bagian sama besar'],
    ['Mengarsir pita pecahan untuk membuktikan kesetaraan dua pecahan', 'Mengurutkan 3–4 pecahan sederhana'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4' }
  ),
  m(
    'mat-fb-s1-tabel-batang', 'Matematika', 'SD/MI', 'Fase B', 'Analisis Data & Peluang',
    'Menyajikan Data Kelas dalam Tabel Frekuensi dan Diagram Batang Skala Satuan',
    'Peserta didik dapat mengolah hasil pencatatan data kelas menjadi tabel turus–frekuensi dan menggambar diagram batang tegak/mendatar berskala 1 atau 2.',
    'Tekankan keseragaman lebar batang, label sumbu mendatar/tegak, dan ketepatan membaca nilai batang.',
    'Mengubah tabel frekuensi menjadi diagram batang rapi dan menyimpulkan tren tertinggi/terendah.',
    ['Membaca piktogram sederhana'],
    ['Diagram batang sesuai tabel frekuensi', 'Menjawab minimal 3 pertanyaan perbandingan antardata'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4' }
  ),
  m(
    'mat-fb-s2-desimal-persen', 'Matematika', 'SD/MI', 'Fase B', 'Bilangan',
    'Hubungan Pecahan Perseratus, Desimal Persatupuluh/Perseratus, dan Konteks Uang',
    'Peserta didik dapat mengubah pecahan berpenyebut 10 atau 100 ke bentuk desimal dan menggunakannya untuk membandingkan harga atau panjang pengukuran.',
    'Hubungkan penggaris milimeter (0,5 cm) dan pecahan sen/uang dengan nilai tempat persepuluhan dan perseratusan.',
    'Mengonversi pecahan per-10/per-100 ke desimal dan mengurutkannya pada garis bilangan.',
    ['Pecahan senilai sederhana'],
    ['Konversi pecahan ↔ desimal tepat', 'Membandingkan dua bilangan desimal menggunakan garis bilangan'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['mat-fb-s1-pecahan-dasar'], relatedTopicIds: ['mat-fb-s1-pecahan-dasar'], suggestedGrade: '4' }
  ),
  m(
    'mat-fb-s2-pola-kalimat-mtk', 'Matematika', 'SD/MI', 'Fase B', 'Aljabar',
    'Pola Bilangan Membesar/Mengecil dan Kalimat Matematika dengan Nilai Belum Diketahui',
    'Peserta didik dapat menemukan aturan pola perkalian/penjumlahan berulang serta melengkapi nilai yang hilang dalam persamaan penjumlahan/pengurangan.',
    'Latih siswa menentukan selisih/rasio antar suku serta membalik operasi (invers) untuk mengisi kotak kosong pada 24 + □ = 61.',
    'Menggeneralisasi aturan pola sederhana dan menggunakan hubungan kebalikan operasi untuk mencari bilangan rumpang.',
    ['Operasi hitung bilangan cacah sampai 10.000'],
    ['Menentukan 3 suku lanjutan pola bilangan dengan alasan aturan pola benar', 'Menyelesaikan kalimat matematika rumpang'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['mat-fb-s1-cacah10000'], relatedTopicIds: ['mat-fb-s1-cacah10000'], suggestedGrade: '4' }
  ),
  m(
    'mat-fb-s2-sudut-bangundatar', 'Matematika', 'SD/MI', 'Fase B', 'Geometri',
    'Jenis Sudut (Siku-Siku, Lancip, Tumpul) dan Ciri Segitiga serta Segiempat Khusus',
    'Peserta didik dapat membandingkan besar sudut menggunakan pojok siku-siku/busur dasar dan mengklasifikasikan bangun segiempat (persegi panjang, trapesium, belah ketupat) menurut ciri sisi dan sudut.',
    'Gunakan sudut kertas sebagai alat cek siku-siku (90°) sebelum memperkenalkan pembacaan busur derajat sederhana.',
    'Mengidentifikasi sudut lancip, siku-siku, tumpul dan membedakan sifat sejajar/sama panjang pada segiempat.',
    ['Keliling dan luas persegi & persegi panjang'],
    ['Mengukur sudut benda kelas secara tepat', 'Mengelompokkan bangun datar berdasarkan sifat sisi dan sudutnya'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['mat-fb-s1-keliling-luas-persegi'], relatedTopicIds: ['mat-fb-s1-keliling-luas-persegi'], suggestedGrade: '4' }
  ),
  m(
    'mat-fb-s2-luas-segitiga-volume', 'Matematika', 'SD/MI', 'Fase B', 'Pengukuran',
    'Pengukuran Volume Takaran Cairan (ml, L) serta Kelipatan Satuan Massa dan Luas Gabungan Sederhana',
    'Peserta didik dapat mengonversi satuan massa (g–kg) dan volume cairan (ml–L) serta menghitung luas bangun datar gabungan dua persegi panjang.',
    'Praktikkan membaca gelas ukur liter/mililiter dan memecah bentuk huruf L menjadi dua persegi panjang tidak tumpang tindih.',
    'Menyelesaikan masalah sehari-hari takaran bahan dan luas bangun gabungan dua segiempat.',
    ['Keliling dan luas persegi/persegi panjang'],
    ['Konversi L↔ml dan kg↔g akurat', 'Luas gabungan dihitung tanpa tumpang tindih bagian'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['mat-fb-s1-keliling-luas-persegi'], relatedTopicIds: ['mat-fb-s1-keliling-luas-persegi'], suggestedGrade: '4' }
  ),

  // =====================================================================
  // 1C. MATEMATIKA — SD FASE C (Kelas 5-6) — terpisah dari Fase B!
  // =====================================================================
  m(
    'mat-fc-s1-kpk-fpb', 'Matematika', 'SD/MI', 'Fase C', 'Bilangan',
    'Faktorisasi Prima, KPK, dan FPB untuk Jadwal Berulang dan Pembagian Paket Adil',
    'Peserta didik dapat menentukan KPK dan FPB dari dua atau tiga bilangan cacah menggunakan pohon faktor/tabel serta memilih konsep yang tepat pada soal kontekstual.',
    'Bandingkan ciri soal KPK (kejadian bertemu lagi di waktu mendatang) vs FPB (membagi beberapa jenis barang ke jumlah paket terbanyak yang sama isi).',
    'Menentukan KPK dan FPB secara efisien serta membedakan kapan memakai KPK atau FPB dalam masalah.',
    ['Faktor dan kelipatan bilangan cacah'],
    ['Pemfaktoran prima akurat', 'Pemilihan KPK vs FPB sesuai konteks soal jadwal atau pembagian bingkisan'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '5' }
  ),
  m(
    'mat-fc-s1-pecahan-rasio-persen', 'Matematika', 'SD/MI', 'Fase C', 'Bilangan',
    'Operasi Pecahan Campuran, Desimal, Persen Diskon, dan Rasio Dua Besaran',
    'Peserta didik dapat menghitung penjumlahan, pengurangan, perkalian, dan pembagian pecahan serta menerapkan rasio sederhana pada resep atau peta.',
    'Gunakan model diagram pita dan penyamaan penyebut KPK untuk operasi pecahan sebelum membahas diskon persen dan perbandingan berbanding senilai.',
    'Menghubungkan pecahan, desimal, persen, dan rasio dalam kalkulasi realistis anggaran dan resep.',
    ['Pecahan senilai dan desimal per-100'],
    ['Hasil operasi pecahan dalam bentuk paling sederhana benar', 'Perhitungan proporsi bahan/harga akurat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5' }
  ),
  m(
    'mat-fc-s1-luas-segitiga-trapesium', 'Matematika', 'SD/MI', 'Fase C', 'Pengukuran & Geometri',
    'Luas Segitiga, Jajar Genjang, Trapesium, Belah Ketupat, serta Hubungan Keliling–Luas',
    'Peserta didik dapat menurunkan rumus luas segitiga dan segiempat non-persegi dari transformasi persegi panjang serta memecahkan masalah ubin/luas lahan gabungan.',
    'Buktikan secara visual bahwa luas segitiga = 1/2 × alas × tinggi dan trapesium = 1/2 × (a + b) × t dengan memotong bangun kertas.',
    'Memahami asal rumus luas bangun datar gabungan dan menentukan tinggi tegak lurus alas secara cermat.',
    ['Keliling dan luas persegi panjang serta jenis sudut'],
    ['Menentukan alas dan garis tinggi yang saling tegak lurus dengan tepat', 'Menghitung luas lahan majemuk benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5' }
  ),
  m(
    'mat-fc-s1-kecepatan-debit', 'Matematika', 'SD/MI', 'Fase C', 'Pengukuran',
    'Konversi Satuan Waktu/Jarak serta Hubungan Kecepatan, Waktu Tempuh, dan Debit Air',
    'Peserta didik dapat menghitung kecepatan rata-rata perjalanan dan debit pengisian tangki air menggunakan konversi satuan jam–menit dan liter–dm³.',
    'Gunakan konteks nyata perjalanan sekolah dan pengisian bak air sambil memastikan penyamaan satuan waktu sebelum pembagian.',
    'Menghubungkan besaran jarak-waktu-kecepatan dan volume-waktu-debit dengan konversi satuan konsisten.',
    ['Konversi satuan panjang, volume liter, dan jam ke menit'],
    ['Satuan diseragamkan sebelum menghitung', 'Interpretasi waktu tiba atau lama pengisian tangki tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5' }
  ),
  m(
    'mat-fc-s2-bangunruang-jaring', 'Matematika', 'SD/MI', 'Fase C', 'Geometri',
    'Jaring-Jaring, Luas Permukaan, dan Volume Kubus, Balok, serta Prisma Segitiga',
    'Peserta didik dapat mengidentifikasi jaring-jaring kubus dan balok yang valid serta menghitung volume dan luas permukaan kemasan berbentuk balok/prisma.',
    'Gunakan bukaan kardus bekas (jaring-jaring) untuk membuktikan mengapa luas permukaan adalah jumlah seluruh luas sisi pembatas.',
    'Mengaitkan visualisasi 2D jaring-jaring dengan perhitungan 3D volume dan luas permukaan.',
    ['Luas segiempat & segitiga serta satuan volume L/cm³'],
    ['Membedakan jaring-jaring valid vs invalid', 'Menghitung volume & kebutuhan kertas kado kemasan balok akurat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['mat-fc-s1-luas-segitiga-trapesium'], relatedTopicIds: ['mat-fc-s1-luas-segitiga-trapesium'], suggestedGrade: '6' }
  ),
  m(
    'mat-fc-s2-skala-koordinat', 'Matematika', 'SD/MI', 'Fase C', 'Aljabar & Geometri',
    'Rasio Skala Peta/Denah dan Membaca Lokasi pada Sistem Koordinat Kartesius Kuadran I',
    'Peserta didik dapat menentukan jarak sebenarnya dari skala peta dan menuliskan pasangan koordinat (x, y) benda pada denah berpetak.',
    'Bedakan rasio 1 : n pada peta dengan arah sumbu mendatar (x) lalu sumbu tegak (y) di bidang koordinat.',
    'Menggunakan penalaran proporsional untuk skala denah dan menafsirkan posisi titik berpasangan.',
    ['Operasi pecahan dan rasio dua besaran'],
    ['Konversi jarak peta ↔ jarak sebenarnya dalam cm/km akurat', 'Titik koordinat (x, y) tidak terbalik'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['mat-fc-s1-pecahan-rasio-persen'], relatedTopicIds: ['mat-fc-s1-pecahan-rasio-persen'], suggestedGrade: '6' }
  ),
  m(
    'mat-fc-s2-diagram-skala-peluang', 'Matematika', 'SD/MI', 'Fase C', 'Analisis Data & Peluang',
    'Membandingkan Data pada Diagram Batang Majemuk/Piktogram Berskala dan Skala Kemungkinan',
    'Peserta didik dapat membaca data yang disajikan dengan skala kelipatan (mis. 1 gambar mewakili 10 orang) dan mengurutkan kejadian dari tidak mungkin hingga pasti terjadi.',
    'Ajarkan perbandingan dua kelompok pada diagram batang ganda serta bahasa peluang kualitatif (mustahil, kurang mungkin, sama mungkin, sangat mungkin, pasti).',
    'Menginterpretasi informasi data berskala dan menilai tingkat kemungkinan hasil percobaan dadu/undian.',
    ['Diagram batang skala satuan'],
    ['Pembacaan frekuensi dengan faktor skala tepat', 'Pengurutan skala kemungkinan disertai alasan rasional'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '6' }
  ),
  m(
    'mat-fc-s2-rasio-proporsi-lanjutan', 'Matematika', 'SD/MI', 'Fase C', 'Bilangan & Aljabar',
    'Aplikasi Rasio Senilai dan Persentase dalam Masalah Perencanaan Proyek Kelas',
    'Peserta didik dapat merencanakan kebutuhan bahan atau anggaran pameran kelas dengan mengombinasikan perbandingan rasio, persen, dan satuan waktu.',
    'Gabungkan latihan pembagian biaya kelompok, penyesuaian porsi resep untuk jumlah peserta lebih besar, dan potongan harga.',
    'Mengintegrasikan bilangan rasional, rasio, dan persentase untuk pengambilan keputusan perhitungan terencana.',
    ['KPK/FPB serta operasi pecahan & persen'],
    ['Rancangan anggaran proporsional bebas kesalahan hitung', 'Langkah verifikasi biaya dijelaskan runtut'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['mat-fc-s1-pecahan-rasio-persen', 'mat-fc-s1-kpk-fpb'], relatedTopicIds: ['mat-fc-s1-pecahan-rasio-persen'], suggestedGrade: '6' }
  ),

  // =====================================================================
  // 1D. MATEMATIKA — SMP FASE D (Kelas 7-9) — Sem 1 (incl. SPLDV & Pythagoras) + Sem 2 Progresif!
  // =====================================================================
  m(
    'mat-fd-s1-spldv', 'Matematika', 'SMP/MTs', 'Fase D', 'Aljabar',
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
    '1 (Ganjil)', 'penerapan',
    {
      suggestedGrade: '8',
      subTP: [
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
      ],
    }
  ),
  m(
    'mat-fd-s1-pythagoras', 'Matematika', 'SMP/MTs', 'Fase D', 'Geometri',
    'Teorema Pythagoras dan Tripel Pythagoras pada Jarak Nyata',
    'Peserta didik dapat memverifikasi hubungan sisi siku-siku dengan sisi miring pada segitiga siku-siku dan menghitung jarak pada masalah kontekstual tangga atau denah.',
    'Hubungan kuadrat a² + b² = c², identifikasi sisi terpanjang (hipotenusa), tripel Pythagoras (3-4-5, 5-12-13, 8-15-17), serta pengecekan segitiga siku-siku.',
    'Menentukan sisi miring atau sisi tegak segitiga siku-siku dan memeriksa syarat sudut siku-siku.',
    ['Bilangan kuadrat dan akar kuadrat sempurna', 'Unsur segitiga dan jenis sudut'],
    [
      'Mengidentifikasi hipotenusa dengan tepat sebelum memasukkan rumus',
      'Menghitung panjang sisi yang belum diketahui beserta satuannya',
    ],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8' }
  ),
  m(
    'mat-fd-s1-statistika', 'Matematika', 'SMP/MTs', 'Fase D', 'Analisis Data & Peluang',
    'Ukuran Pemusatan Data (Mean, Median, Modus) dan Penafsiran Sebaran',
    'Peserta didik dapat menghitung mean, median, dan modus dari sekumpulan data serta membandingkan pengaruh nilai pencilan terhadap kesimpulan rata-rata.',
    'Perbedaan mean (rata-rata), median (nilai tengah data terurut), dan modus (frekuensi terbanyak) beserta pengaruh data ekstrem/outlier.',
    'Menghitung tiga ukuran pemusatan data dan memilih ukuran representatif ketika ada nilai pencilan.',
    ['Operasi pecahan dan pengurutan bilangan rasional'],
    [
      'Data diurutkan lebih dulu sebelum menentukan median',
      'Perhitungan jumlah dan rata-rata akurat dan alasan memilih median/mean logis',
    ],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8' }
  ),
  m(
    'mat-fd-s1-bilangan-rasional', 'Matematika', 'SMP/MTs', 'Fase D', 'Bilangan',
    'Operasi Bilangan Bulat, Pecahan, dan Rasio dalam Anggaran Belanja',
    'Peserta didik dapat menyelesaikan masalah perbandingan senilai/berbalik nilai, persentase untung-rugi, dan operasi campuran bilangan rasional dalam perencanaan anggaran.',
    'Strategi menghitung diskon ganda, perbandingan berbalik nilai kecepatan/pekerja, dan tanda operasi bilangan negatif.',
    'Mengintegrasikan bilangan bulat, rasional, dan proporsi dalam pemecahan masalah keuangan.',
    ['Operasi hitung bilangan cacah dan pecahan sederhana'],
    [
      'Penggunaan tanda positif/negatif sesuai konteks rugi/penurunan',
      'Perhitungan proporsi senilai vs berbalik nilai dibedakan tepat',
    ],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '7' }
  ),
  m(
    'mat-fd-s2-relasi-garis-lurus', 'Matematika', 'SMP/MTs', 'Fase D', 'Aljabar',
    'Relasi, Fungsi Linear, Gradien, dan Persamaan Garis Lurus',
    'Peserta didik dapat merepresentasikan fungsi linear dalam tabel, grafik Kartesius, dan rumus f(x) = mx + c serta menentukan gradien untuk memodelkan laju perubahan nyata.',
    'Hubungkan penyelesaian titik potong dua persamaan SPLDV pada bidang koordinat dengan makna gradien sebagai laju kenaikan/penurunan biaya atau jarak.',
    'Menghubungkan bentuk grafik garis lurus, gradien dua garis sejajar/tegak lurus, dan persamaan fungsi linear.',
    ['Pemodelan persamaan linear dua variabel (SPLDV)'],
    ['Menggambar grafik fungsi linear dari titik potong sumbu', 'Menafsirkan gradien sebagai tarif per satuan dalam masalah kontekstual'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['mat-fd-s1-spldv'], relatedTopicIds: ['mat-fd-s1-spldv'], suggestedGrade: '8' }
  ),
  m(
    'mat-fd-s2-brsl-lingkaran', 'Matematika', 'SMP/MTs', 'Fase D', 'Geometri',
    'Lingkaran, Panjang Busur, Luas Juring, serta Luas & Volume Bangun Ruang Sisi Lengkung',
    'Peserta didik dapat menghitung panjang busur/luas juring lingkaran dan memodelkan luas permukaan serta volume tabung, kerucut, dan bola dalam desain wadah.',
    'Turunkan luas selimut tabung (2πrt) dari persegi panjang dan bedakan tinggi kerucut tegak lurus vs garis pelukis s menggunakan Teorema Pythagoras.',
    'Mengintegrasikan Teorema Pythagoras untuk menemukan garis pelukis/tinggi bangun ruang sisi lengkung.',
    ['Teorema Pythagoras pada segitiga siku-siku', 'Keliling dan luas lingkaran'],
    ['Mencari garis pelukis s menggunakan Pythagoras sebelum menghitung selimut kerucut', 'Volume gabungan tabung-kerucut akurat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['mat-fd-s1-pythagoras'], relatedTopicIds: ['mat-fd-s1-pythagoras'], suggestedGrade: '9' }
  ),
  m(
    'mat-fd-s2-transformasi-kesebangunan', 'Matematika', 'SMP/MTs', 'Fase D', 'Geometri',
    'Transformasi Geometri Tunggal (Refleksi, Translasi, Rotasi, Dilatasi) dan Kesebangunan Bangun',
    'Peserta didik dapat menentukan bayangan titik/bangun hasil transformasi pada bidang koordinat serta menggunakan syarat kesebangunan segitiga untuk memperkirakan tinggi objek tak terjangkau.',
    'Latih koordinat bayangan refleksi sumbu x/y, translasi vektor (a, b), dilatasi faktor skala k, dan perbandingan sisi bersesuaian segitiga sebangun.',
    'Membedakan kekongruenan vs kesebangunan dan menerapkan dilatasi/perbandingan sisi pada masalah tinggi menara/bayangan.',
    ['Sistem koordinat Kartesius dan rasio proporsi'],
    ['Koordinat hasil refleksi/translasi/dilatasi tepat', 'Rasio kesebangunan segitiga menghasilkan tinggi objek realistis'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['mat-fd-s1-bilangan-rasional'], relatedTopicIds: ['mat-fd-s1-bilangan-rasional'], suggestedGrade: '9' }
  ),
  m(
    'mat-fd-s2-peluang-sebaran', 'Matematika', 'SMP/MTs', 'Fase D', 'Analisis Data & Peluang',
    'Jangkauan, Kuartil, serta Peluang Empiris dan Peluang Teoretis Percobaan Acak',
    'Peserta didik dapat membandingkan dua kelompok data menggunakan jangkauan dan kuartil serta mengaitkan frekuensi relatif percobaan (peluang empiris) dengan peluang teoretis ruang sampel.',
    'Lakukan eksperimen lempar dadu/koin berulang untuk membandingkan frekuensi relatif dengan ruang sampel teoretis P(A) = n(A)/n(S).',
    'Mengukur sebaran data (jangkauan, Q1–Q3) dan menghitung peluang empiris/teoretis kejadian tunggal.',
    ['Mean, median, dan modus data tunggal'],
    ['Menentukan ruang sampel percobaan acak lengkap', 'Menjelaskan selisih peluang empiris dan peluang teoretis secara tepat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['mat-fd-s1-statistika'], relatedTopicIds: ['mat-fd-s1-statistika'], suggestedGrade: '8' }
  ),

  // =====================================================================
  // 1E. MATEMATIKA — SMA/MA FASE E (Kelas 10) vs FASE F (Kelas 11-12)
  // =====================================================================
  m(
    'mat-fe-sma-s1-eksponen-logaritma', 'Matematika', 'SMA/MA', 'Fase E', 'Bilangan & Aljabar',
    'Bilangan Berpangkat (Eksponen), Bentuk Akar, dan Logaritma dalam Pertumbuhan',
    'Peserta didik dapat membuktikan sifat eksponen dan logaritma serta menggunakannya untuk memodelkan peluruhan atau pertumbuhan eksponensial.',
    'Bandingkan laju pertumbuhan eksponensial dengan pertumbuhan linear dan hubungan invers a^x = b ⇔ ^a log b = x.',
    'Menerapkan sifat eksponen pecahan dan logaritma pada pemodelan bunga majemuk atau pertumbuhan populasi.',
    ['Operasi aljabar dan bilangan berpangkat bulat SMP'],
    ['Penyederhanaan eksponen rasional dan logaritma akurat', 'Model pertumbuhan f(t) disusun benar'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-sma-s1-barisan-deret', 'Matematika', 'SMA/MA', 'Fase E', 'Aljabar & Fungsi',
    'Barisan dan Deret Aritmetika serta Geometri dalam Bunga Tunggal dan Majemuk',
    'Peserta didik dapat menemukan rumus suku ke-n dan jumlah n suku pertama barisan aritmetika/geometri serta membedakannya dalam model tabungan atau anuitas awal.',
    'Kontraskan selisih tetap pada aritmetika vs rasio pengali konstan pada geometri termasuk deret geometri tak hingga.',
    'Memodelkan pola bertambah tetap atau berlipat rasio menjadi rumus deret dan menyelesaikan total akumulasi.',
    ['Pola bilangan dan sifat eksponen'],
    ['Pemilihan model aritmetika vs geometri tepat', 'Perhitungan jumlah suku dan deret tak hingga akurat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-sma-s1-splts-pertidaksamaan', 'Matematika', 'SMA/MA', 'Fase E', 'Aljabar & Fungsi',
    'Sistem Persamaan Linear Tiga Variabel (SPLTV) dan Sistem Pertidaksamaan Linear Dua Variabel',
    'Peserta didik dapat memodelkan kendala sumber daya tiga variabel (SPLTV) serta menentukan daerah himpunan penyelesaian pertidaksamaan linear pada bidang koordinat.',
    'Latih eliminasi bertahap 3 persamaan menjadi 2 variabel dan arsiran daerah layak dari batas garis kendala.',
    'Menyusun model kendala tiga variabel/pertidaksamaan dan menafsirkan solusi fisibel.',
    ['SPLDV dan grafik persamaan garis lurus'],
    ['Eliminasi SPLTV bebas salah tanda', 'Daerah arsiran penyelesaian sesuai uji titik'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-sma-s1-fungsi-kuadrat', 'Matematika', 'SMA/MA', 'Fase E', 'Aljabar & Fungsi',
    'Karakteristik Grafik Fungsi Kuadrat dan Masalah Optimasi Maksimum–Minimum',
    'Peserta didik dapat menganalisis pengaruh parameter a, b, c terhadap parabola dan menentukan titik puncak maksimum/minimum dalam masalah luas lahan atau lintasan parabola.',
    'Gunakan sumbu simetri x = -b/2a, diskriminan D = b² - 4ac, serta penafsiran nilai puncak pada konteks optimasi.',
    'Menghubungkan bentuk aljabar f(x) = ax² + bx + c dengan sifat geometris kurva parabola.',
    ['Pemfaktoran kuadrat dan grafik koordinat'],
    ['Titik potong sumbu, sumbu simetri, dan nilai ekstrem dihitung benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-sma-s2-trigonometri', 'Matematika', 'SMA/MA', 'Fase E', 'Geometri',
    'Perbandingan Trigonometri pada Segitiga Siku-Siku untuk Pengukuran Tinggi & Sudut Elevasi',
    'Peserta didik dapat menentukan perbandingan sin, cos, tan sudut istimewa dan menggunakannya bersama sudut elevasi/depresi pada kasus klinometer lapangan.',
    'Kaitkan sisi depan, samping, miring terhadap sudut acuan dan aplikasikan sudut elevasi untuk mengukur ketinggian gedung.',
    'Menggunakan trigonometri segitiga siku-siku untuk menghitung jarak atau ketinggian yang tak terukur langsung.',
    ['Teorema Pythagoras dan kesebangunan segitiga'],
    ['Rasio sin/cos/tan teridentifikasi konsisten terhadap sudut acuan', 'Model klinometer diselesaikan akurat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-sma-s2-vektor', 'Matematika', 'SMA/MA', 'Fase E', 'Geometri',
    'Representasi Vektor di Bidang Datar, Penjumlahan Resultan, dan Panjang Vektor',
    'Peserta didik dapat merepresentasikan perpindahan berarah sebagai vektor komponen dan menentukan resultan vektor gaya atau navigasi.',
    'Gunakan gambar vektor pangkal-ke-ujung (poligon/jajar genjang) dan penjumlahan komponen (x, y) beserta panjang |v|.',
    'Memodelkan besaran berarah dan mengombinasikan resultan vektor secara grafis maupun komponen aljabar.',
    ['Trigonometri dasar dan Teorema Pythagoras'],
    ['Komponen vektor (Δx, Δy) dan panjang vektor resultan dihitung benar'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['mat-fe-sma-s2-trigonometri'], relatedTopicIds: ['mat-fe-sma-s2-trigonometri'], suggestedGrade: '10' }
  ),
  m(
    'mat-fe-sma-s2-statistika-sebaran', 'Matematika', 'SMA/MA', 'Fase E', 'Analisis Data & Peluang',
    'Histogram Data Berkelompok serta Ukuran Lokasi dan Penyebaran (Simpangan Baku & Jangkauan Antarkuartil)',
    'Peserta didik dapat menyusun histogram dan membandingkan konsistensi dua kelompok data menggunakan jangkauan antarkuartil dan simpangan baku.',
    'Fokus pada makna sebaran data: dua kelas dengan rata-rata sama dapat memiliki keragaman/variansi berbeda.',
    'Mengevaluasi penyebaran data berkelompok dengan ukuran lokasi dan simpangan baku.',
    ['Statistika pemusatan dan kuartil SMP'],
    ['Interval kelas histogram konsisten tanpa tumpang tindih', 'Interpretasi perbandingan variasi antardata tepat'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-sma-s2-peluang-majemuk', 'Matematika', 'SMA/MA', 'Fase E', 'Analisis Data & Peluang',
    'Peluang Kejadian Majemuk (Saling Lepas vs Tidak Saling Lepas dan Saling Bebas)',
    'Peserta didik dapat menggunakan distribusi peluang dan aturan penjumlahan P(A ∪ B) serta perkalian P(A ∩ B) untuk menghitung risiko kejadian majemuk.',
    'Gunakan diagram Venn dan tabel kontingensi agar siswa melihat mengapa kejadian tidak saling lepas perlu dikurangi P(A ∩ B).',
    'Membedakan syarat kejadian saling lepas dan saling bebas dalam ruang sampel majemuk.',
    ['Peluang kejadian tunggal dan ruang sampel'],
    ['Pemilihan aturan penjumlahan vs perkalian tepat dengan verifikasi irisan'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '10' }
  ),

  // 1F. MATEMATIKA — SMA/MA FASE F (Kelas 11-12) — berbeda dari Fase E!
  m(
    'mat-ff-sma-s1-fungsi-komposisi-invers', 'Matematika', 'SMA/MA', 'Fase F', 'Aljabar & Fungsi',
    'Operasi Aljabar Fungsi, Fungsi Komposisi (f ∘ g), dan Fungsi Invers dalam Transformasi Proses',
    'Peserta didik dapat menentukan rumus serta syarat terdefinisinya fungsi komposisi (f ∘ g)(x) dan fungsi invers f⁻¹(x) pada pemodelan konversi berurutan.',
    'Ilustrasikan komposisi sebagai dua tahap mesin berurutan (mis. diskon toko dilanjutkan pajak PPN) dan invers sebagai proses membalik keluaran ke masukan.',
    'Menganalisis domain–kodomain fungsi komposisi dan memverifikasi f(f⁻¹(x)) = x.',
    ['Fungsi linear dan kuadrat Fase E'],
    ['Urutan substitusi (f ∘ g) tidak tertukar dengan (g ∘ f)', 'Syarat bijektif/daerah asal invers diperiksa'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '11' }
  ),
  m(
    'mat-ff-sma-s1-matriks', 'Matematika', 'SMA/MA', 'Fase F', 'Aljabar & Fungsi',
    'Operasi Matriks Ordo 2×2 dan 3×3, Determinan, Invers, serta Transformasi Geometri Matriks',
    'Peserta didik dapat melakukan perkalian matriks, menghitung determinan dan invers matriks 2×2, serta memodelkan penyelesaian SPL atau transformasi dengan matriks.',
    'Tekankan syarat ukuran perkalian matriks (m×n · n×p) dan sifat non-komutatif AB ≠ BA.',
    'Menggunakan matriks sebagai representasi ringkas sistem linear dan operator transformasi.',
    ['SPLTV dan SPLDV'],
    ['Perkalian matriks baris-kolom tepat', 'Solusi sistem persamaan via invers matriks terverifikasi'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'mat-ff-sma-s1-lingkaran-geometri', 'Matematika', 'SMA/MA', 'Fase F', 'Geometri',
    'Teorema Busur, Tali Busur, Sudut Pusat–Keliling, serta Garis Singgung Lingkaran',
    'Peserta didik dapat menerapkan sifat sudut pusat terhadap sudut keliling dan menghitung panjang garis singgung persekutuan luar/dalam dua lingkaran.',
    'Hubungkan sifat jari-jari tegak lurus garis singgung dengan Teorema Pythagoras pada model katrol atau sabuk mesin.',
    'Membuktikan hubungan sudut dalam lingkaran dan menghitung jarak garis singgung antardua roda/lingkaran.',
    ['Lingkaran & Pythagoras SMP'],
    ['Sudut keliling menghadap diameter diidentifikasi sebagai 90°', 'Panjang garis singgung persekutuan dihitung akurat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  m(
    'mat-ff-sma-s1-bivariat-regresi', 'Matematika', 'SMA/MA', 'Fase F', 'Analisis Data & Peluang',
    'Diagram Pencar (Scatter Plot), Korelasi Linear, dan Garis Regresi Kuadrat Terkecil',
    'Peserta didik dapat menganalisis arah dan kekuatan asosiasi dua variabel kuantitatif pada diagram pencar serta menggunakan persamaan garis regresi untuk prediksi wajar.',
    'Bedakan korelasi kuat vs hubungan sebab-akibat (kausalitas) serta bahaya ekstrapolasi jauh di luar rentang data.',
    'Memodelkan data bivariat dengan garis regresi linear dan menguji kelayakan prediksinya.',
    ['Statistika sebaran dan fungsi linear'],
    ['Interpretasi arah/kekuatan korelasi akurat', 'Prediksi dari garis regresi disertai batas kewajaran'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  m(
    'mat-ff-sma-s2-kaidah-peluang-bersyarat', 'Matematika', 'SMA/MA', 'Fase F', 'Analisis Data & Peluang',
    'Kaidah Pencacahan (Permutasi, Kombinasi) dan Peluang Bersyarat P(A|B)',
    'Peserta didik dapat membedakan kapan urutan penting (permutasi vs kombinasi) serta menentukan peluang bersyarat P(A|B) dalam pengambilan keputusan berbasis informasi baru.',
    'Gunakan pohon peluang dan tabel dua arah untuk memperjelas menyempitnya ruang sampel ketika syarat B sudah diketahui terjadi.',
    'Menggunakan teknik kombinatorika dan peluang bersyarat pada konteks skrining uji atau susunan jadwal.',
    ['Peluang kejadian majemuk Fase E'],
    ['Pemilihan rumus permutasi vs kombinasi tepat', 'Peluang bersyarat P(A|B) = P(A∩B)/P(B) terhitung benar'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12' }
  ),
  m(
    'mat-ff-sma-s2-anuitas-keuangan', 'Matematika', 'SMA/MA', 'Fase F', 'Bilangan & Aljabar',
    'Model Pinjaman, Anuitas, dan Investasi Majemuk Lanjutan dalam Literasi Keuangan',
    'Peserta didik dapat memodelkan cicilan anuitas tetap maupun pertumbuhan investasi berkala menggunakan deret geometri dan logaritma.',
    'Bandingkan skema bunga flat vs anuitas efektif dan susun tabel jadwal amortisasi singkat pada awal masa pinjaman.',
    'Menganalisis beban bunga dan lama pelunasan finansial dengan perhitungan deret eksponensial.',
    ['Barisan & deret geometri serta logaritma Fase E'],
    ['Tabel cicilan pokok vs bunga pada 3 periode awal konsisten', 'Total pembayaran terhitung akurat'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12' }
  ),
  m(
    'mat-ff-sma-s2-limit-turunan-dasar', 'Matematika', 'SMA/MA', 'Fase F', 'Aljabar & Kalkulus',
    'Konsep Laju Perubahan, Turunan Fungsi Polinomial Sederhana, dan Nilai Stasioner',
    'Peserta didik dapat menentukan turunan pertama fungsi polinomial untuk menghitung gradien garis singgung kurva serta menentukan nilai maksimum/minimum lokal pada masalah optimasi.',
    'Mulai dari perbandingan gradien tali busur menuju titik singgung sebelum melatih aturan pangkat d/dx(ax^n) dan uji tanda turunan pertama.',
    'Menghubungkan tanda turunan pertama (naik/turun/stasioner) dengan optimasi kemasan atau keuntungan.',
    ['Fungsi kuadrat & fungsi invers'],
    ['Turunan pertama dihitung benar', 'Titik stasioner diklasifikasi menjadi maksimum/minimum dalam soal optimasi'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['mat-ff-sma-s1-fungsi-komposisi-invers'], relatedTopicIds: ['mat-ff-sma-s1-fungsi-komposisi-invers'], suggestedGrade: '12' }
  ),
  m(
    'mat-ff-sma-s2-geometri-analitik-ruang', 'Matematika', 'SMA/MA', 'Fase F', 'Geometri',
    'Jarak Titik–Garis–Bidang dalam Ruang Tiga Dimensi dan Irisan Penampang',
    'Peserta didik dapat menentukan jarak antar titik, titik ke garis, dan titik ke bidang pada kubus/limas dengan memproyeksikan bidang bantu segitiga siku-siku.',
    'Gunakan model kerangka kawat kubus untuk menandai bidang diagonal tempat segitiga siku-siku proyeksi berada.',
    'Menyelesaikan perhitungan jarak dan sudut ruang 3D menggunakan bantuan proyeksi bidang datar.',
    ['Teorema Pythagoras & trigonometri segitiga'],
    ['Proyeksi tegak lurus pada bidang bantu digambar jelas', 'Perhitungan jarak √ dan trigonometri tepat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['mat-ff-sma-s1-lingkaran-geometri'], relatedTopicIds: ['mat-ff-sma-s1-lingkaran-geometri'], suggestedGrade: '12' }
  ),

  // 1G. MATEMATIKA KEJURUAN — SMK FASE E & FASE F (terpisah!)
  m(
    'mat-fe-smk-s1-eksponen-rasio-kejuruan', 'Matematika Kejuruan', 'SMK', 'Fase E', 'Bilangan & Pengukuran Kejuruan',
    'Aritmetika Kejuruan, Konversi Satuan Bengkel/Usaha, Persentase Keuntungan, dan Bunga Majemuk',
    'Peserta didik dapat menghitung konversi satuan pengukuran praktik kejuruan, margin harga pokok produksi, serta bunga majemuk modal usaha.',
    'Kaitkan toleransi ukuran bengkel/bahan, perhitungan rugi-laba unit, dan pertumbuhan eksponensial sederhana pada pinjaman modal.',
    'Mengoperasikan rasio, persentase, dan eksponen pada perhitungan biaya bahan dan bunga usaha.',
    ['Rasio, proporsi, dan operasi pecahan SMP'],
    ['Konversi satuan tepat', 'Kalkulasi harga jual dan persentase keuntungan/diskon akurat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-smk-s1-spltv-biaya', 'Matematika Kejuruan', 'SMK', 'Fase E', 'Aljabar & Fungsi',
    'Sistem Persamaan Linear dan Pertidaksamaan Kendala Bahan Baku Produksi',
    'Peserta didik dapat memodelkan keterbatasan dua atau tiga sumber daya bengkel/produksi ke dalam sistem persamaan/pertidaksamaan linear untuk menentukan kombinasi paket produk.',
    'Gunakan studi kasus kombinasi paket bahan baku, jam mesin, dan tenaga kerja untuk merumuskan kendala linear.',
    'Menyusun model linear dari spesifikasi pesanan kerja dan menyelesaikan titik perpotongan kendala.',
    ['SPLDV SMP'],
    ['Variabel unit produksi terdefinisi jelas', 'Nilai solusi memenuhi seluruh syarat batas produksi'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-smk-s1-barisan-kapasitas', 'Matematika Kejuruan', 'SMK', 'Fase E', 'Aljabar & Fungsi',
    'Barisan dan Deret Aritmetika–Geometri dalam Target Produksi dan Penyusutan Alat',
    'Peserta didik dapat memprediksi akumulasi produksi bertahap menggunakan deret aritmetika serta menghitung penyusutan nilai aset peralatan menggunakan deret geometri.',
    'Bedakan penambahan kapasitas tetap harian (aritmetika) vs persentase depresiasi aset tahunan (geometri).',
    'Menghitung akumulasi target berkala dan nilai sisa peralatan bengkel/kantor.',
    ['Persentase dan sifat pangkat bilangan'],
    ['Rumus suku ke-n dan jumlah deret diterapkan sesuai model depresiasi/produksi'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-smk-s1-trigonometri-skala', 'Matematika Kejuruan', 'SMK', 'Fase E', 'Geometri',
    'Skala Gambar Teknik dan Perbandingan Trigonometri untuk Pengukuran Kemiringan/Elevasi',
    'Peserta didik dapat menghitung dimensi nyata dari skala gambar kerja teknik serta menentukan kemiringan atap, tanjakan, atau ketinggian konstruksi menggunakan sin, cos, dan tan.',
    'Praktikkan pembacaan skala 1:50 / 1:100 dan konversi sudut kemiringan ke panjang penopang segitiga siku-siku.',
    'Menghubungkan rasio skala gambar kerja dengan pengukuran trigonometri di lapangan.',
    ['Kesebangunan segitiga dan Pythagoras'],
    ['Ukuran nyata dari gambar berskala tepat', 'Komponen panjang penopang dihitung tepat memakai rasio trigonometri'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-smk-s2-program-linear-bep', 'Matematika Kejuruan', 'SMK', 'Fase E', 'Aljabar & Optimasi Usaha',
    'Titik Impas (Break-Even Point) dan Optimasi Laba dengan Program Linear Dua Variabel',
    'Peserta didik dapat menentukan titik impas antara biaya tetap–variabel dengan pendapatan serta memaksimalkan laba di titik pojok daerah layak.',
    'Hitung BEP unit/rupiah serta uji titik-titik pojok grafik pertidaksamaan terhadap fungsi objektif keuntungan Z = ax + by.',
    'Menentukan volume penjualan minimal agar tidak rugi dan kombinasi produksi paling menguntungkan.',
    ['Sistem pertidaksamaan linear dua variabel'],
    ['Perhitungan unit BEP akurat', 'Uji titik pojok menunjukkan kombinasi produk dengan laba maksimum'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['mat-fe-smk-s1-spltv-biaya'], relatedTopicIds: ['mat-fe-smk-s1-spltv-biaya'], suggestedGrade: '10' }
  ),
  m(
    'mat-fe-smk-s2-vektor-gaya', 'Matematika Kejuruan', 'SMK', 'Fase E', 'Geometri Terapan',
    'Komponen Vektor Gaya/Perpindahan dan Aplikasi Bangun Ruang Volume Kemasan/Tangki',
    'Peserta didik dapat menguraikan vektor gaya ke komponen horizontal–vertikal serta menghitung kapasitas volume dan kebutuhan bahan lembaran tangki/kemasan.',
    'Gabungkan uraian cos/sin komponen vektor dengan efisiensi pemotongan bahan kemasan.',
    'Menghitung resultan gaya kerja dan optimasi bahan pembuatan wadah industri/karya.',
    ['Skala gambar teknik dan trigonometri'],
    ['Komponen Fx dan Fy dihitung akurat', 'Kebutuhan luas pelat dan volume tangki sesuai dimensi kerja'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['mat-fe-smk-s1-trigonometri-skala'], relatedTopicIds: ['mat-fe-smk-s1-trigonometri-skala'], suggestedGrade: '10' }
  ),
  m(
    'mat-fe-smk-s2-qc-statistika', 'Matematika Kejuruan', 'SMK', 'Fase E', 'Analisis Data & Peluang',
    'Statistika Kendali Mutu (Sebaran Data Ukuran) dan Peluang Cacat Sampel Produksi',
    'Peserta didik dapat menilai keseragaman dimensi produk memakai simpangan baku/kuartil dan menghitung peluang ditemukannya produk cacat pada pengambilan sampel acak.',
    'Bandingkan rata-rata dan simpangan ukuran produk dua shift mesin terhadap batas toleransi standar kerja.',
    'Mengevaluasi kestabilan mutu produksi dari ukuran sebaran dan probabilitas sampel rusak.',
    ['Mean, median, dan peluang dasar SMP'],
    ['Produk di luar batas toleransi teridentifikasi', 'Peluang cacat pada sampel dihitung konsisten'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '10' }
  ),
  m(
    'mat-fe-smk-s2-logika-alur-kerja', 'Matematika Kejuruan', 'SMK', 'Fase E', 'Aljabar & Penalaran Logis',
    'Logika Proposisional/Kondisional (Jika–Maka, Konjungsi, Disjungsi) dalam Troubleshooting & SOP Kerja',
    'Peserta didik dapat menganalisis kebenaran aturan percabangan syarat keselamatan/mesin dalam bentuk pernyataan majemuk dan negasinya.',
    'Gunakan contoh SOP pengamanan mesin dan persyaratan lulus inspeksi QC untuk melatih tabel kebenaran praktis.',
    'Menyusun syarat kondisi gabungan AND/OR dan menarik kesimpulan valid saat memeriksa SOP.',
    ['Penalaran himpunan dan syarat bilangan'],
    ['Evaluasi kondisi majemuk pada skenario inspeksi SOP benar'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '10' }
  ),
  // SMK Fase F
  m(
    'mat-ff-smk-s1-matriks-routing', 'Matematika Kejuruan', 'SMK', 'Fase F', 'Aljabar & Matriks Terapan',
    'Operasi Matriks untuk Rekapitulasi Stok Bahan, Jadwal Shift, dan Transformasi Desain',
    'Peserta didik dapat menyusun tabel stok bahan multimesin/cabang sebagai matriks, menghitung total kebutuhan bahan dengan perkalian matriks, dan memecahkan sistem 2 persamaan memakai invers.',
    'Representasikan matriks bahan × jenis produk lalu kalikan dengan matriks jumlah pesanan antarcabang.',
    'Mengotomatisasi rekap bahan baku produksi dan penentuan koefisien sistem linear dengan matriks.',
    ['SPLTV dan aljabar kejuruan Fase E'],
    ['Perkalian matriks pesanan × komposisi bahan menghasilkan total stok akurat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'mat-ff-smk-s1-bivariat-penjualan', 'Matematika Kejuruan', 'SMK', 'Fase F', 'Analisis Data Terapan',
    'Analisis Korelasi dan Regresi Linear Sederhana pada Tren Penjualan/Beban Kerja',
    'Peserta didik dapat memplot hubungan biaya promosi/jam lembur terhadap output penjualan pada diagram pencar dan merumuskan garis tren prediksi bulanan.',
    'Interpretasikan kemiringan (slope) garis regresi sebagai pertambahan output per satuan masukan dan keterbatasan prediksi ekstrem.',
    'Menggunakan data bivariat historis untuk memproyeksikan target operasional yang realistis.',
    ['Statistika kendali mutu Fase E'],
    ['Interpretasi korelasi positif/negatif akurat', 'Prediksi target kerja berdasarkan garis tren masuk akal'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  m(
    'mat-ff-smk-s1-bunga-anuitas-modal', 'Matematika Kejuruan', 'SMK', 'Fase F', 'Bilangan Keuangan',
    'Kalkulasi Anuitas Cicilan Kredit Modal Usaha dan Perbandingan Kelayakan Alat',
    'Peserta didik dapat menghitung besar angsuran anuitas kredit peralatan dan membandingkan total biaya pembiayaan antarpilihan skema cicilan.',
    'Bedakan porsi bunga yang menurun dan angsuran pokok yang membesar dalam setiap periode cicilan anuitas.',
    'Menilai biaya riil pembiayaan peralatan usaha secara kritis dan terukur.',
    ['Aritmetika kejuruan & barisan deret Fase E'],
    ['Perhitungan angsuran anuitas dan total bunga pada 2 alternatif kredit tepat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  m(
    'mat-ff-smk-s1-fungsi-invers-konversi', 'Matematika Kejuruan', 'SMK', 'Fase F', 'Aljabar & Fungsi',
    'Fungsi Komposisi & Invers dalam Perhitungan Kalibrasi Alat, Pajak, dan Tarif Berjenjang',
    'Peserta didik dapat menyusun fungsi komposisi penyesuaian harga setelah margin + pajak serta mencari fungsi invers untuk menentukan biaya dasar dari harga akhir.',
    'Latih siswa membalik harga inklusif PPN 11% dan komisi marketplace kembali ke harga bersih sebelum potongan.',
    'Menghitung balik besaran masukan asal dari harga akhir transaksi komposit.',
    ['Program linear & fungsi linear Fase E'],
    ['Rumus komposisi berurutan dan invers konversi harga menghasilkan nilai bersih konsisten'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'mat-ff-smk-s2-kaidah-sampel-qc', 'Matematika Kejuruan', 'SMK', 'Fase F', 'Analisis Data & Peluang',
    'Kombinatorika Jadwal/Kode SKU dan Peluang Bersyarat Audit Mutu Berlapis',
    'Peserta didik dapat menghitung variasi kode barang/kombinasi tim kerja (permutasi vs kombinasi) serta mengevaluasi peluang barang lolos uji setelah inspeksi berlapis.',
    'Terapkan peluang bersyarat untuk menganalisis efektivitas dua tahap pengecekan kualitas sebelum pengiriman barang.',
    'Merancang kombinasi penjadwalan kerja dan mengestimasi risiko kelolosan cacat berlapis.',
    ['Peluang cacat sampel Fase E'],
    ['Perbedaan kombinasi vs permutasi tepat', 'Peluang bersyarat dihitung menggunakan diagram pohon'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['mat-ff-smk-s1-bivariat-penjualan'], relatedTopicIds: ['mat-ff-smk-s1-bivariat-penjualan'], suggestedGrade: '12' }
  ),
  m(
    'mat-ff-smk-s2-turunan-optimasi-kemasan', 'Matematika Kejuruan', 'SMK', 'Fase F', 'Kalkulus Terapan',
    'Aplikasi Turunan Fungsi Sederhana dalam Optimasi Volume Kemasan dan Minimasi Biaya Produksi',
    'Peserta didik dapat menyusun fungsi luas bahan/biaya dan menggunakan turunan pertama f\'(x) = 0 untuk menentukan ukuran kemasan paling hemat bahan.',
    'Gunakan kasus memotong pojok lembaran karton x cm menjadi kotak berkapasitas maksimum.',
    'Menemukan ukuran optimum proyek kejuruan secara analitis dengan turunan pertama.',
    ['Fungsi kuadrat & fungsi invers'],
    ['Fungsi sasaran bervariabel tunggal disusun tepat dan nilai x optimum teruji'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['mat-ff-smk-s1-fungsi-invers-konversi'], relatedTopicIds: ['mat-ff-smk-s1-fungsi-invers-konversi'], suggestedGrade: '12' }
  ),
  m(
    'mat-ff-smk-s2-geometri-koordinat-cnc', 'Matematika Kejuruan', 'SMK', 'Fase F', 'Geometri Terapan',
    'Geometri Ruang 3D (Jarak & Sudut Proyeksi) untuk Penempatan Konstruksi & Jalur Kerja',
    'Peserta didik dapat menghitung jarak diagonal ruang penopang dan sudut kemiringan rangka bangun 3D sebelum fabrikasi.',
    'Gabungkan koordinat relatif 3D dengan proyeksi bidang siku-siku untuk mengecek panjang batang penyangga diagonal.',
    'Memverifikasi ketepatan ukuran rangka tiga dimensi secara geometris sebelum eksekusi kerja.',
    ['Vektor & trigonometri Fase E'],
    ['Panjang batang penyangga diagonal ruang dan sudut pasang terhitung tepat'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12' }
  ),
  m(
    'mat-ff-smk-s2-integrasi-estimasi-proyek', 'Matematika Kejuruan', 'SMK', 'Fase F', 'Integrasi Numerasi Kerja',
    'Simulasi Perhitungan Terpadu RAB (Rencana Anggaran Biaya), Kapasitas, dan Risiko Proyek PKL/Kejuruan',
    'Peserta didik dapat menyusun kalkulasi lengkap estimasi kebutuhan material, efisiensi waktu, BEP, dan margin risiko pada proposal proyek tugas akhir kejuruan.',
    'Pandu verifikasi silang antarsatuan bahan, pajak, biaya tak terduga, dan sensitivitas harga jual.',
    'Mengintegrasikan seluruh alat hitung matematika kejuruan dalam dokumen estimasi proyek siap uji.',
    ['Matriks stok, anuitas, dan optimasi BEP'],
    ['RAB memuat rincian kuantitas, harga satuan, pajak, BEP, dan margin sensitif yang konsisten'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['mat-ff-smk-s1-matriks-routing', 'mat-ff-smk-s1-bunga-anuitas-modal'], relatedTopicIds: ['mat-ff-smk-s1-matriks-routing'], suggestedGrade: '12' }
  ),

  // =====================================================================
  // 2. BAHASA INDONESIA (Fase A, B, C, D, E, F)
  // =====================================================================
  m(
    'bindo-fa-s1-cerita', 'Bahasa Indonesia', 'SD/MI', 'Fase A', 'Membaca & Memirsa',
    'Memahami Isi Cerita Pendek Sehari-hari dan Menjawab Pertanyaan Fakta',
    'Peserta didik dapat menemukan tokoh, tempat kejadian, serta inti cerita dari teks pendek bergambar.',
    'Gunakan kalimat sederhana EYD, pertanyaan siapa/di mana/apa, serta latihan kosakata baru bertahap.',
    'Mengidentifikasi informasi eksplisit dalam teks narasi sederhana.',
    ['Membaca kata dan kalimat pendek lancar'],
    ['Menjawab tepat unsur tokoh, latar, dan urutan peristiwa awal–akhir'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', estimasiMenitSesi: 70 }
  ),
  m(
    'bindo-fa-s1-kapital-titik', 'Bahasa Indonesia', 'SD/MI', 'Fase A', 'Menulis',
    'Menyusun Kalimat Sederhana Menggunakan Huruf Kapital dan Tanda Titik',
    'Peserta didik dapat menuliskan kalimat berita pendek menggunakan huruf kapital di awal kalimat/nama diri dan tanda titik di akhir.',
    'Contoh huruf kapital pada awal kalimat serta nama orang, disertai spasi antar kata dan tanda titik.',
    'Menulis kalimat sederhana sesuai kaidah huruf kapital dan tanda baca akhir titik.',
    ['Menulis huruf lepas atau tegak bersambung dengan jelas'],
    ['Huruf kapital dan titik diterapkan tepat pada minimal 3 kalimat tulis'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', estimasiMenitSesi: 70 }
  ),
  m(
    'bindo-fa-s1-kata-ajaib', 'Bahasa Indonesia', 'SD/MI', 'Fase A', 'Berbicara & Mempresentasikan',
    'Menggunakan Ungkapan Tolong, Terima Kasih, dan Permintaan Maaf dengan Santun',
    'Peserta didik dapat mempraktikkan kalimat permintaan tolong, ucapan terima kasih, dan permintaan maaf sesuai situasi bermain peran.',
    'Berikan dialog singkat kontekstual tentang meminjam alat tulis, mengucapkan terima kasih, dan meminta maaf santun.',
    'Memilih ungkapan santun yang sesuai konteks interaksi sosial di sekolah/rumah.',
    ['Berbicara dengan lafal jelas kepada teman dan guru'],
    ['Menyesuaikan ungkapan tolong/maaf/terima kasih dalam skenario percakapan'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', estimasiMenitSesi: 70 }
  ),
  m(
    'bindo-fa-s1-petunjuk', 'Bahasa Indonesia', 'SD/MI', 'Fase A', 'Menyimak',
    'Mengurutkan Langkah Kegiatan Sehari-hari Berdasarkan Teks Petunjuk Singkat',
    'Peserta didik dapat menyimak teks petunjuk sederhana (mis. cara mencuci tangan) dan mengurutkan langkahnya secara runtut.',
    'Urutan langkah memakai kata penghubung mula-mula, lalu, kemudian, terakhir dengan gambar penunjuk.',
    'Menangkap isi instruksi lisan singkat secara urut sesuai langkah keselamatan/kebersihan.',
    ['Memusatkan perhatian saat mendengarkan teks dibacakan'],
    ['Urutan kartu/nomor langkah kegiatan sesuai petunjuk yang disimak'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', estimasiMenitSesi: 70 }
  ),
  m(
    'bindo-fa-s2-kalimat-tanya-seru', 'Bahasa Indonesia', 'SD/MI', 'Fase A', 'Menulis',
    'Membedakan Kalimat Berita, Kalimat Tanya (?), dan Kalimat Ajakan/Larangan (!)',
    'Peserta didik dapat menggunakan kata tanya (apa, siapa, di mana, kapan) dengan tanda tanya serta menulis kalimat ajakan santun berakhiran tanda seru.',
    'Latih mengubah pernyataan gambar kegiatan sekolah menjadi pertanyaan informasi dan ajakan menjaga kebersihan.',
    'Memilih kata tanya tepat serta tanda baca ?, !, dan . sesuai maksud kalimat.',
    ['Menulis kalimat sederhana dengan huruf kapital dan titik'],
    ['Tanda baca ?, !, . dan kata tanya dipakai sesuai fungsi kalimat'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bindo-fa-s1-kapital-titik'], relatedTopicIds: ['bindo-fa-s1-kapital-titik'], suggestedGrade: '2', estimasiMenitSesi: 70 }
  ),
  m(
    'bindo-fa-s2-fakta-imajinasi', 'Bahasa Indonesia', 'SD/MI', 'Fase A', 'Membaca & Memirsa',
    'Membedakan Informasi Fakta dari Gambar/Teks Pendek dengan Cerita Rekaan (Fiksi)',
    'Peserta didik dapat membedakan bacaan yang berisi peristiwa nyata sehari-hari (mis. cara merawat tanaman) dengan dongeng hewan fiksi.',
    'Gunakan dua bacaan berdampingan (teks merawat bunga vs fabel kelinci berbicara) agar murid mengenali ciri nyata vs rekaan.',
    'Menilai jenis informasi bacaan bergambar dan menceritakan kembali dengan kata sendiri.',
    ['Memahami isi cerita pendek sehari-hari'],
    ['Mengelompokkan bacaan nyata vs fiksi disertai alasan ciri yang terlihat'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bindo-fa-s1-cerita'], relatedTopicIds: ['bindo-fa-s1-cerita'], suggestedGrade: '2', estimasiMenitSesi: 70 }
  ),
  m(
    'bindo-fa-s2-deskripsikan-benda', 'Bahasa Indonesia', 'SD/MI', 'Fase A', 'Berbicara & Menulis',
    'Mendeskripsikan Ciri Benda, Hewan, atau Tumbuhan Favorit dalam Paragraf Mini 3–4 Kalimat',
    'Peserta didik dapat menyusun 3–4 kalimat terpadu yang mendeskripsikan bentuk, warna, dan kegunaan satu objek secara lisan maupun tertulis.',
    'Gunakan peta pikiran gambar (warna, bentuk, bagian, guna) sebelum merangkai kalimat saling berkaitan.',
    'Merangkai beberapa kalimat berkesinambungan tentang satu topik tunggal.',
    ['Mengungkapkan kalimat santun dengan lafal jelas'],
    ['Paragraf mini terdiri atas minimal 3 kalimat yang membahas objek yang sama secara runtut'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bindo-fa-s1-kapital-titik'], relatedTopicIds: ['bindo-fa-s1-kapital-titik'], suggestedGrade: '2', estimasiMenitSesi: 70 }
  ),
  m(
    'bindo-fa-s2-puisi-anak', 'Bahasa Indonesia', 'SD/MI', 'Fase A', 'Menyimak & Berbicara',
    'Menyampaikan Pesan dan Perasaan dalam Puisi Anak Sederhana dengan Ekspresi Lisan',
    'Peserta didik dapat menyimak pembacaan puisi anak pendek, menebak suasana perasaan penyair, dan membacakan ulang dengan intonasi wajar.',
    'Latih jeda napas di akhir baris, artikulasi jelas, serta menemukan kata bermakna indah dalam puisi bertema alam/keluarga.',
    'Menangkap suasana hati dan pesan sederhana teks puitis anak serta mengekspresikannya.',
    ['Menyimak petunjuk atau bacaan singkat'],
    ['Menyebutkan tema/suasana puisi dan membacakan dengan artikulasi serta jeda tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bindo-fa-s1-petunjuk'], relatedTopicIds: ['bindo-fa-s1-petunjuk'], suggestedGrade: '2', estimasiMenitSesi: 70 }
  ),

  // Bahasa Indonesia Fase B (Kelas 3-4)
  m(
    'bindo-fb-s1-kalimat-efektif-spok', 'Bahasa Indonesia', 'SD/MI', 'Fase B', 'Menulis & Tata Bahasa',
    'Kalimat Efektif Transitif–Intransitif dan Penggunaan Imbuhan Awalan me-/ber-',
    'Peserta didik dapat membedakan kalimat transitif dan intransitif serta menyusun kalimat efektif dengan awalan me-/ber- yang sesuai konteks.',
    'Tunjukkan unsur S-P-O-K, kata dasar yang luluh setelah awalan me- (K-T-S-P), serta penyuntingan kalimat bertele-tele.',
    'Menulis kalimat efektif bercorak transitif/intransitif dengan ejaan awalan baku.',
    ['Menyusun kalimat sederhana dengan huruf kapital dan tanda baca dasar'],
    ['Membedakan kalimat berobjek vs tanpa objek', 'Menulis kalimat efektif berimbuhan tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4' }
  ),
  m(
    'bindo-fb-s1-gagasan-pokok', 'Bahasa Indonesia', 'SD/MI', 'Fase B', 'Membaca & Memirsa',
    'Gagasan Pokok, Kalimat Utama, dan Kalimat Penjelas pada Paragraf',
    'Peserta didik dapat menentukan gagasan pokok paragraf informasi dan merangkum informasi tersurat dari bacaan nonfiksi anak.',
    'Cara menemukan kalimat utama (awal/akhir/campuran paragraf) dan meringkas isi bacaan tanpa menyalin seluruh kalimat.',
    'Membedakan informasi inti paragraf dari kalimat rincian pendukung.',
    ['Membaca lancar teks paragraf tunggal'],
    ['Gagasan pokok tiap paragraf teridentifikasi dan ringkasan utuh'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4' }
  ),
  m(
    'bindo-fb-s1-prosedur-sederhana', 'Bahasa Indonesia', 'SD/MI', 'Fase B', 'Menulis',
    'Menulis Teks Petunjuk / Prosedur Sederhana Menggunakan Kalimat Perintah Efektif',
    'Peserta didik dapat menyusun petunjuk penggunaan alat atau cara membuat benda secara berurutan dengan kalimat perintah santun dan jelas.',
    'Ciri kalimat imperatif, urutan langkah bernomor, dan penggunaan kata penghubung waktu.',
    'Menyusun instruksi tertulis yang logis dan mudah diikuti pembaca lain.',
    ['Menyimak dan mengurutkan petunjuk sederhana'],
    ['Langkah berurutan tanpa loncatan logika dan memakai kata kerja imperatif tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '4' }
  ),
  m(
    'bindo-fb-s1-wawancara-singkat', 'Bahasa Indonesia', 'SD/MI', 'Fase B', 'Berbicara & Menulis',
    'Menyusun Daftar Pertanyaan ADiKSiMBa dan Melaporkan Hasil Wawancara Singkat',
    'Peserta didik dapat menyiapkan pertanyaan wawancara (Apa, Di mana, Kapan, Siapa, Mengapa, Bagaimana) dan menuliskan laporan hasil wawancara ringkas.',
    'Simulasikan wawancara dengan petugas sekolah/orang tua tentang pekerjaan atau hobi lalu ubah jawaban menjadi paragraf laporan.',
    'Menggali informasi narasumber dengan pertanyaan terstruktur dan melaporkannya santun.',
    ['Penggunaan kata tanya dalam kalimat sederhana'],
    ['Pertanyaan mencakup variasi ADiKSiMBa dan laporan sesuai keterangan narasumber'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '4' }
  ),
  m(
    'bindo-fb-s2-dongeng-amanat', 'Bahasa Indonesia', 'SD/MI', 'Fase B', 'Membaca & Memirsa',
    'Unsur Intrinsik Cerita Anak & Dongeng Nusantara (Tokoh, Watak, Alur, dan Amanat)',
    'Peserta didik dapat menganalisis sifat tokoh berdasarkan tindakan dalam cerita dan menemukan pesan moral (amanat) beserta kosakata majas perbandingan sederhana.',
    'Latih menyimpulkan watak tokoh dari dialog/perilaku (bukan hanya menebak) serta memaknai kata kiasan umum.',
    'Menafsirkan watak tokoh, konflik sederhana, dan amanat teks fiksi anak dengan bukti kutipan.',
    ['Membedakan cerita nyata vs fiksi'],
    ['Alasan penilaian watak merujuk peristiwa teks dan amanat dirumuskan jelas'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bindo-fb-s1-gagasan-pokok'], relatedTopicIds: ['bindo-fb-s1-gagasan-pokok'], suggestedGrade: '4' }
  ),
  m(
    'bindo-fb-s2-infografis-visual', 'Bahasa Indonesia', 'SD/MI', 'Fase B', 'Membaca & Memirsa',
    'Memirsa Poster dan Infografis Edukatif serta Membandingkannya dengan Teks Prosa',
    'Peserta didik dapat menangkap pesan utama pada poster/infografis (mis. hemat air atau lalu lintas) dan menilai kesesuaian gambar dengan teks keterangannya.',
    'Latih membaca grafik/ikon berlabel angka, memeriksa sumber poster, dan mengubah data poster menjadi paragraf narasi.',
    'Mengintegrasikan informasi teks dan visual dari infografis cetak/digital secara kritis.',
    ['Gagasan pokok paragraf'],
    ['Meringkas pesan utama poster beserta 2 detail data visual secara akurat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '4' }
  ),
  m(
    'bindo-fb-s2-surat-pribadi', 'Bahasa Indonesia', 'SD/MI', 'Fase B', 'Menulis',
    'Menulis Surat Pribadi dan Pesan Informasi Tertulis dengan Struktur Santun',
    'Peserta didik dapat membedakan ragam sapaan surat untuk teman/keluarga dengan pengumuman resmi sekolah serta menulis surat pribadi lengkap dengan bagian-bagiannya.',
    'Struktur tanggal/tempat surat, salam pembuka, isi pengalaman yang jelas, salam penutup, dan tanda tangan.',
    'Menyesuaikan pilihan sapaan dan ragam bahasa (akrab vs baku) sesuai penerima tulisan.',
    ['Kalimat efektif dengan tanda baca lengkap'],
    ['Struktur surat pribadi lengkap dan ejaan nama tempat/tanggal benar'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bindo-fb-s1-kalimat-efektif-spok'], relatedTopicIds: ['bindo-fb-s1-kalimat-efektif-spok'], suggestedGrade: '4' }
  ),
  m(
    'bindo-fb-s2-diskusi-pendapat', 'Bahasa Indonesia', 'SD/MI', 'Fase B', 'Berbicara & Mempresentasikan',
    'Menyampaikan Pendapat Disertai Alasan dan Mendengarkan Tanggapan Teman Secara Santun',
    'Peserta didik dapat mengemukakan persetujuan atau sanggahan sederhana dalam diskusi kelompok disertai minimal satu alasan faktual tanpa memotong pembicaraan.',
    'Latih frasa santun menyampaikan pendapat ("Menurut saya… karena…", "Saya sependapat dengan… namun…").',
    'Berpartisipasi aktif dalam diskusi terpandu dengan argumentasi sederhana dan sikap saling menghargai.',
    ['Melaporkan hasil wawancara singkat'],
    ['Setiap pendapat menyertakan alasan logis dan menggunakan sapaan diskusi santun'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bindo-fb-s1-wawancara-singkat'], relatedTopicIds: ['bindo-fb-s1-wawancara-singkat'], suggestedGrade: '4' }
  ),

  // Bahasa Indonesia Fase C (Kelas 5-6) — terpisah dari Fase B!
  m(
    'bindo-fc-s1-eksplorasi-fakta-opini', 'Bahasa Indonesia', 'SD/MI', 'Fase C', 'Membaca & Memirsa',
    'Membedakan Fakta, Opini, dan Makna Kiasan (Sinonim, Antonim, Majas Metafora/Personifikasi) pada Teks Informasi',
    'Peserta didik dapat memilah kalimat fakta terukur dari opini pribadi dalam teks berita/artikel anak dan menafsirkan majas yang digunakan.',
    'Gunakan penanda fakta (angka, tanggal, sumber peristiwa) vs opini (penilaian subjektif "terindah", "sebaiknya") dan identifikasi majas metafora/hiperbola.',
    'Mengevaluasi keandalan kalimat informasi dan memahami gaya bahasa figuratif dalam bacaan.',
    ['Gagasan pokok dan unsur cerita Fase B'],
    ['Kalimat fakta vs opini terklasifikasi tepat disertai bukti kata penanda'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '5' }
  ),
  m(
    'bindo-fc-s1-surat-resmi-formulir', 'Bahasa Indonesia', 'SD/MI', 'Fase C', 'Menulis',
    'Teks Formulir, Kuitansi/Biodata, dan Perbedaan Ragam Baku Surat Resmi Sekolah',
    'Peserta didik dapat mengisi formulir pendaftaran kegiatan sekolah dengan benar serta menyusun undangan/surat resmi sederhana menggunakan bahasa Indonesia baku.',
    'Bandingkan unsur surat resmi (kop, nomor surat, lampiran, perihal, salam baku, stempel) vs surat pribadi.',
    'Mengisi dokumen administratif sekolah secara akurat dan menulis surat resmi berbahasa baku.',
    ['Menulis surat pribadi Fase B'],
    ['Isian formulir sesuai petunjuk pengisian dan surat resmi menggunakan kalimat baku efektif'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '6' }
  ),
  m(
    'bindo-fc-s1-teks-eksplanasi', 'Bahasa Indonesia', 'SD/MI', 'Fase C', 'Membaca & Menulis',
    'Teks Eksplanasi Ilmiah: Struktur Pernyataan Umum, Deretan Penjelas Sebab–Akibat, dan Simpulan',
    'Peserta didik dapat mengidentifikasi hubungan sebab–akibat pada teks eksplanasi fenomena alam/sosial dan menulis teks eksplanasi ringkas dengan konjungsi kausalitas.',
    'Latih konjungsi karena, sebab, sehingga, oleh karena itu serta penggunaan kata baku dalam menjelaskan proses terjadinya banjir/siklus air.',
    'Menjelaskan proses kausal suatu fenomena secara objektif dan berurutan.',
    ['Gagasan pokok dan penulisan paragraf efektif'],
    ['Bagan alur sebab–akibat sesuai isi bacaan dan karangan eksplanasi memuat 3 bagian struktur'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '6' }
  ),
  m(
    'bindo-fc-s1-presentasi-narasi', 'Bahasa Indonesia', 'SD/MI', 'Fase C', 'Berbicara & Mempresentasikan',
    'Presentasi Hasil Pengamatan atau Laporan Bacaan (Buku Fiksi/Nonfiksi) dengan Catatan Kunci',
    'Peserta didik dapat menyusun poin presentasi terstruktur dari buku yang dibaca dan menyampaikannya secara lisan dengan kontak mata serta jeda yang jelas.',
    'Bedakan membaca teks penuh dari kertas vs berbicara menggunakan kartu poin (clue cards) selama 2–3 menit.',
    'Mengomunikasikan hasil bacaan/pengamatan secara runtut dan responsif terhadap pertanyaan audiens.',
    ['Diskusi pendapat santun Fase B'],
    ['Slide/kartu poin ringkas dan penyampaian lisan lancar menjawab 2 pertanyaan teman'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5' }
  ),
  m(
    'bindo-fc-s2-pidato-persuasif', 'Bahasa Indonesia', 'SD/MI', 'Fase C', 'Berbicara & Menulis',
    'Menyusun Naskah dan Menyampaikan Pidato Persuasif Bertema Lingkungan/Sekolah',
    'Peserta didik dapat merancang naskah pidato dengan salam pembuka, pendahuluan, isi argumen + ajakan, serta penutup, lalu menyampaikannya dengan intonasi meyakinkan.',
    'Latih teknik membuka pidato (pertanyaan retoris/fakta singkat), kalimat ajakan "Marilah kita…", dan penutup berterima kasih.',
    'Menggabungkan argumen fakta dan kalimat persuasif dalam penyampaian pidato pendek.',
    ['Membedakan fakta vs opini', 'Presentasi poin kunci'],
    ['Naskah memuat 4 bagian pidato baku dan penyampaian menggunakan intonasi penekanan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bindo-fc-s1-eksplorasi-fakta-opini', 'bindo-fc-s1-presentasi-narasi'], relatedTopicIds: ['bindo-fc-s1-presentasi-narasi'], suggestedGrade: '6' }
  ),
  m(
    'bindo-fc-s2-iklan-slogan-poster', 'Bahasa Indonesia', 'SD/MI', 'Fase C', 'Membaca & Menulis',
    'Menganalisis Unsur Kalimat Persuasif pada Iklan, Slogan, dan Poster Layanan Masyarakat',
    'Peserta didik dapat membedakan tujuan iklan komersial vs layanan masyarakat, menilai kebenaran klaim slogan, serta merancang poster/iklan singkat bebas klaim menyesatkan.',
    'Bandingkan iklan faktual dengan iklan hiperbolis berlebihan dan latih membuat kalimat slogan pendek padat makna.',
    'Mengevaluasi pesan iklan secara kritis dan menciptakan media persuasif bermakna.',
    ['Fakta & opini dalam teks informasi'],
    ['Iklan/poster buatan memiliki sasaran audiens jelas, kalimat ringkas, dan tidak mengklaim palsu'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bindo-fc-s1-eksplorasi-fakta-opini'], relatedTopicIds: ['bindo-fc-s1-eksplorasi-fakta-opini'], suggestedGrade: '5' }
  ),
  m(
    'bindo-fc-s2-resensi-cerpen-anak', 'Bahasa Indonesia', 'SD/MI', 'Fase C', 'Membaca & Menulis',
    'Menulis Tanggapan/Ulasan Buku Cerita (Identitas, Ringkasan Alur, Kelebihan & Saran Pembacaan)',
    'Peserta didik dapat menulis ulasan buku fiksi anak yang memuat identitas buku, ringkasan konflik tanpa membocorkan akhir, dan penilaian logis disertai bukti halaman/bab.',
    'Bantu siswa membedakan ringkasan cerita dengan opini penilaian kualitas ilustrasi, alur, atau pemilihan kata.',
    'Menyusun teks tanggapan kritis terhadap karya sastra anak berdasarkan bukti bacaan.',
    ['Unsur intrinsik cerita Fase B'],
    ['Ulasan memuat identitas buku, sinopsis singkat, serta penilaian didukung bukti isi buku'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '6' }
  ),
  m(
    'bindo-fc-s2-esai-argumentasi-ringkas', 'Bahasa Indonesia', 'SD/MI', 'Fase C', 'Menulis & Berpikir Kritis',
    'Menulis Paragraf Argumentasi Sederhana Berbasis Data Bacaan untuk Forum Sekolah',
    'Peserta didik dapat menulis esai pendek 3 paragraf (pernyataan sikap, alasan pendukung + contoh, penegasan) menggunakan kalimat efektif dan kohesif.',
    'Latih menghubungkan antarparagraf dengan penanda transisi (pertama, selain itu, oleh sebab itu) tanpa keluar dari topik.',
    'Mengintegrasikan fakta teks bacaan menjadi tulisan opini terstruktur yang santun dan logis.',
    ['Teks eksplanasi kausalitas', 'Membedakan fakta vs opini'],
    ['Tulisan terdiri atas tesis, minimal 2 bukti pendukung relevan, dan penutup konsisten'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bindo-fc-s1-teks-eksplanasi'], relatedTopicIds: ['bindo-fc-s1-teks-eksplanasi'], suggestedGrade: '6' }
  ),

  // Bahasa Indonesia Fase D (SMP)
  m(
    'bindo-fd-s1-deskripsi', 'Bahasa Indonesia', 'SMP/MTs', 'Fase D', 'Membaca & Memirsa',
    'Teks Deskripsi: Citraan Pancaindra dan Struktur Identifikasi–Deskripsi Bagian',
    'Peserta didik dapat menganalisis majas, kata konkret, dan citraan pancaindra dalam teks deskripsi serta menulis teks deskripsi objek wisata daerah secara runtut.',
    'Struktur teks deskripsi, perbedaan deskripsi subjektif vs objektif, dan penggunaan preposisi "di-" vs awalan "di-".',
    'Mengolah detail pancaindra dan kaidah penulisan di/ke dalam tulisan deskriptif.',
    ['Kalimat efektif dan gagasan pokok paragraf'],
    ['Mengidentifikasi citraan penglihatan/pendengaran dan menulis penulisan "di-" benar'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '7' }
  ),
  m(
    'bindo-fd-s1-prosedur', 'Bahasa Indonesia', 'SMP/MTs', 'Fase D', 'Menulis',
    'Teks Prosedur: Struktur, Kalimat Imperatif, dan Akurasi Takaran',
    'Peserta didik dapat menulis teks prosedur membuat produk atau melakukan kegiatan dengan tujuan, alat-bahan terukur, langkah imperatif logis, dan penutup.',
    'Kata kerja imperatif, pelesapan kata, adverbia cara/alat/kuantitas, serta penanda urutan tepat.',
    'Merancang instruksi operasional terukur tanpa ambiguitas langkah atau ukuran.',
    ['Membedakan teks petunjuk dan cerita narasi'],
    ['Alat/bahan bertakaran jelas dan kalimat perintah memakai akhiran -kan/-i yang sesuai'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7' }
  ),
  m(
    'bindo-fd-s1-lho', 'Bahasa Indonesia', 'SMP/MTs', 'Fase D', 'Membaca & Memirsa',
    'Teks Laporan Hasil Observasi (LHO): Fakta Objektif vs Opini',
    'Peserta didik dapat memilah kalimat definisi, deskripsi bagian, dan fakta objektif dalam teks LHO tentang lingkungan alam atau sosial.',
    'Struktur Pernyataan Umum/Klasifikasi → Deskripsi Bagian → Manfaat/Simpulan, kalimat definisi ("adalah", "merupakan"), dan bebas opini subjektif.',
    'Menganalisis klasifikasi ilmiah fenomena dan menyusun laporan observasi objektif.',
    ['Membedakan kalimat fakta dan pendapat pribadi'],
    ['Teks LHO memuat klasifikasi logis, data faktual, dan struktur lengkap tanpa opini emosional'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  m(
    'bindo-fd-s1-berita-artikel', 'Bahasa Indonesia', 'SMP/MTs', 'Fase D', 'Membaca & Memirsa',
    'Teks Berita dan Artikel Ilmiah Populer: Verifikasi Fakta, Unsur ADiKSiMBa, dan Bias Judul',
    'Peserta didik dapat membandingkan berita cetak dan digital untuk menilai kelengkapan unsur ADiKSiMBa serta mendeteksi judul clickbait atau sumber tidak jelas.',
    'Latih teknik membaca skimming/scanning kepala berita (lead) vs tubuh berita serta mengenali data bukti vs dugaan dalam artikel populer.',
    'Mengevaluasi kredibilitas berita/artikel dan menyunting teks berita objektif.',
    ['Membedakan fakta vs opini'],
    ['Audit berita mengidentifikasi 6 unsur informasi dan menyimpulkan tingkat objektivitas sumber'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  m(
    'bindo-fd-s2-puisi-rakyat-modern', 'Bahasa Indonesia', 'SMP/MTs', 'Fase D', 'Membaca & Menulis',
    'Puisi Rakyat (Pantun, Gurindam, Syair) hingga Penciptaan Puisi Modern Bermajas',
    'Peserta didik dapat membandingkan pola rima dan larik puisi rakyat dengan kebebasan diksi puisi modern serta menulis puisi bertema sosial/lingkungan.',
    'Jelaskan aturan rima a-b-a-b / a-a-a-a serta cara memilih diksi prismatis, imaji, dan tipografi pada puisi modern.',
    'Mengapresiasi warisan puisi tradisional dan berekspresi kreatif lewat puisi modern.',
    ['Majas dasar & citraan pancaindra pada teks deskripsi'],
    ['Mengidentifikasi syarat pantun/gurindam tepat', 'Menghasilkan puisi bermajas segar bebas klise'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bindo-fd-s1-deskripsi'], relatedTopicIds: ['bindo-fd-s1-deskripsi'], suggestedGrade: '7' }
  ),
  m(
    'bindo-fd-s2-surat-dinas-komunikasi', 'Bahasa Indonesia', 'SMP/MTs', 'Fase D', 'Menulis',
    'Teks Surat Pribadi, Surat Dinas Organisasi Siswa, dan Etika Pesan Digital Baku',
    'Peserta didik dapat menyunting kesalahan ejaan PUEBI/EYD V dalam surat dinas kegiatan OSIS dan menerapkan etiket komunikasi daring yang santun.',
    'Fokus pada penyuntingan kehematan kata, penulisan tanggal/sapaan jabatan, serta korespondensi elektronik resmi.',
    'Menyunting kesalahan sintaksis/ejaan pada surat resmi sekolah dan komunikasi formal.',
    ['Kalimat efektif & ejaan baku'],
    ['Surat dinas bebas kesalahan huruf kapital/tanda baca dan memakai kalimat pembuka/penutup baku'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '7' }
  ),
  m(
    'bindo-fd-s2-diskusi-pidato-persuasif', 'Bahasa Indonesia', 'SMP/MTs', 'Fase D', 'Berbicara & Mempresentasikan',
    'Teks Tanggapan Kritis, Teks Diskusi Pro–Kontra, dan Pidato Persuasif Berbasis Bukti',
    'Peserta didik dapat merumuskan argumen pro dan kontra secara berimbang berbasis data statistik/observasi lalu menyampaikannya dalam pidato atau forum diskusi kelas.',
    'Struktur Isu → Argumen Mendukung → Argumen Menentang → Simpulan Jalan Tengah serta etika membantah argumen (bukan menyerang pribadi).',
    'Berargumentasi logis secara dua sisi sebelum merumuskan rekomendasi/pidato persuasif.',
    ['Verifikasi fakta dalam berita & LHO'],
    ['Argumen pro dan kontra berimbang disertai minimal 1 rujukan data fakta yang jelas'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bindo-fd-s1-lho', 'bindo-fd-s1-berita-artikel'], relatedTopicIds: ['bindo-fd-s1-berita-artikel'], suggestedGrade: '9' }
  ),
  m(
    'bindo-fd-s2-resensi-cerpen-proyek', 'Bahasa Indonesia', 'SMP/MTs', 'Fase D', 'Membaca & Menulis',
    'Analisis Alur & Penokohan Cerpen serta Penyusunan Ulasan/Resensi Karya Lengkap',
    'Peserta didik dapat memetakan konflik batin dan sudut pandang dalam cerita pendek serta menyusun teks resensi/laporan buku nonfiksi dan fiksi yang objektif.',
    'Ajarkan perbedaan sudut pandang orang pertama vs ketiga serba tahu serta kriteria menilai kekuatan tema, latar, dan keterbacaan karya.',
    'Mengevaluasi struktur naratif sastra secara analitis dan merangkainya dalam resensi sistematis.',
    ['Unsur intrinsik cerita dan LHO'],
    ['Resensi membedakan ringkasan dari evaluasi kelebihan–kelemahan karya dengan kutipan bukti'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '9' }
  ),

  // Bahasa Indonesia Fase E (Kelas 10 SMA & SMK)
  m(
    'bindo-fe-s1-lho-ilmiah', 'Bahasa Indonesia', 'SMA/MA', 'Fase E', 'Membaca & Memirsa',
    'Teks Laporan Hasil Observasi (LHO) Kritis dan Evaluasi Keakuratan Sumber Ilmiah',
    'Peserta didik dapat menilai keabsahan definisi klasifikasi, kelengkapan deskripsi bagian, serta objektivitas bahasa dalam teks LHO lintas sumber.',
    'Struktur LHO akademik, verifikasi klaim ilmiah dengan rujukan sahih, dan pemilahan kata teknis bidang ilmu.',
    'Mengevaluasi validitas fakta empiris dan kesesuaian struktur teks LHO.',
    ['Teks LHO SMP dan pemilahan fakta-opini'],
    ['Identifikasi struktur & kalimat definisi tepat; kesalahan penalaran fakta terdeteksi'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'bindo-fe-s1-anekdot-kritik', 'Bahasa Indonesia', 'SMA/MA', 'Fase E', 'Menulis & Berbicara',
    'Teks Anekdot sebagai Kritik Sosial Santun Berbasis Fakta Layanan Publik',
    'Peserta didik dapat mengevaluasi sindiran halus dalam anekdot/komik strip dan menyusun teks anekdot lengkap (abstraksi, orientasi, krisis, reaksi, koda) secara etis.',
    'Perbedaan anekdot (kritik menyangkut kepentingan umum) vs humor biasa, kalimat retoris, serta etika kritik tanpa ujaran kebencian.',
    'Mengemas kritik isu publik secara kreatif melalui struktur naratif anekdot.',
    ['Struktur cerita dan majas sindiran'],
    ['Unsur krisis-reaksi anekdot menyinggung isu publik secara santun tanpa menyinggung SARA'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'bindo-fe-s1-hikayat-nilai', 'Bahasa Indonesia', 'SMA/MA', 'Fase E', 'Membaca & Menulis',
    'Membandingkan Nilai Budaya Teks Hikayat Klasik dan Cerita Pendek Kontemporer',
    'Peserta didik dapat mengidentifikasi karakteristik bahasa arkais dan nilai moral/sosial dalam hikayat lalu mengadaptasinya menjadi sinopsis/cerpen modern.',
    'Ciri kemustahilan, kesaktian tokoh, istanasentris, kata hubung "hatta/syahdan", dan relevansi nilai kejujuran/kepemimpinan masa kini.',
    'Menginterpretasi nilai budaya sastra klasik dan mengalihwahanakannya ke ragam modern.',
    ['Analisis tokoh & alur cerpen SMP'],
    ['Pemetaan nilai moral klasik disertai adaptasi alur logis ke situasi masa kini'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'bindo-fe-s1-negosiasi-kesepakatan', 'Bahasa Indonesia', 'SMA/MA', 'Fase E', 'Berbicara & Mempresentasikan',
    'Teks Negosiasi: Analisis Kepentingan Para Pihak dan Pencapaian Kesepakatan Adil',
    'Peserta didik dapat menyusun dialog atau surat penawaran–negosiasi dengan argumen logis, bukti harga/kebutuhan, serta kompromi saling menguntungkan (win-win).',
    'Tahapan orientasi → pengajuan → penawaran → persetujuan → penutup dengan bahasa persuasif beretika.',
    'Merancang strategi penawaran berbasis kepentingan sah dan menyepakati solusi bersama.',
    ['Teks diskusi SMP'],
    ['Dialog negosiasi memuat syarat kompromi terukur dan mencapai kesepakatan tertulis jelas'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '10' }
  ),
  m(
    'bindo-fe-s2-biografi-keteladanan', 'Bahasa Indonesia', 'SMA/MA', 'Fase E', 'Membaca & Menulis',
    'Teks Biografi Tokoh: Telaah Konflik Hidup, Tindakan Teladan, dan Struktur Orientasi–Reorientasi',
    'Peserta didik dapat mengidentifikasi keistimewaan tokoh serta membedakan informasi faktual biografi dari pujian subjektif penulis.',
    'Peran kata ganti orang ketiga, verba tindakan, dan keterkaitan latar sosial masa tokoh terhadap keputusan hidupnya.',
    'Menilai sikap keteladanan tokoh secara objektif dari peristiwa terdokumentasi.',
    ['LHO & pemilahan fakta-opini'],
    ['Ringkasan perjalanan tokoh memuat bukti peristiwa konkret, bukan sekadar pujian umum'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bindo-fe-s1-lho-ilmiah'], relatedTopicIds: ['bindo-fe-s1-lho-ilmiah'], suggestedGrade: '10' }
  ),
  m(
    'bindo-fe-s2-puisi-musikalisasi', 'Bahasa Indonesia', 'SMA/MA', 'Fase E', 'Membaca & Mempresentasikan',
    'Pendalaman Diksi, Tipografi, Suasana, dan Alih Wahana Puisi',
    'Peserta didik dapat menganalisis makna simbolik, rima, dan tema dalam antologi puisi modern serta menulis resensi/puisi baru bertema refleksi remaja.',
    'Bandingkan makna denotatif vs konotatif, gaya enjambemen, serta interpretasi suasana tanpa memaksakan satu tafsir tunggal.',
    'Menafsirkan lapis bunyi, citra, dan pesan simbolis dalam karya puisi sastra.',
    ['Unsur puisi SMP'],
    ['Analisis diksi mengutip baris spesifik puisi untuk mendukung interpretasi tema'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '10' }
  ),
  m(
    'bindo-fe-s2-debat-argumentasi', 'Bahasa Indonesia', 'SMA/MA', 'Fase E', 'Berbicara & Mempresentasikan',
    'Argumentasi Kritis dan Praktik Debat Terstruktur Isu Publik (Mosi, Afirmasi, Oposisi)',
    'Peserta didik dapat menyusun argumen dengan klaim, bukti data, dan penalaran logis untuk mosi kebijakan serta menghindari sesat pikir (logical fallacy).',
    'Latih struktur AREL (Assertion–Reasoning–Evidence–Link back) serta cara memberi sanggahan terfokus pada kelemahan logika lawan.',
    'Membangun argumen berstruktur bukti dan menanggapi sanggahan secara sistematis.',
    ['Teks negosiasi dan diskusi'],
    ['Setiap poin argumen memuat klaim, alasan kausal, dan bukti data yang terverifikasi'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bindo-fe-s1-negosiasi-kesepakatan'], relatedTopicIds: ['bindo-fe-s1-negosiasi-kesepakatan'], suggestedGrade: '10' }
  ),
  m(
    'bindo-fe-s2-evaluasi-media-digital', 'Bahasa Indonesia', 'SMA/MA', 'Fase E', 'Membaca & Menulis',
    'Evaluasi Teks Multimodal, Berita Daring, dan Penulisan Tanggapan Artikel Populer',
    'Peserta didik dapat melakukan verifikasi silang klaim pada infografis/artikel daring serta menulis tanggapan analitis singkat memakai ejaan dan sitasi sumber.',
    'Periksa kejelasan penulis, tahun terbit, perbandingan minimal dua sumber independen, dan perbedaan korelasi vs sebab-akibat.',
    'Menilai integritas informasi multimodal dan menyusun tanggapan analitis tersitasi.',
    ['Evaluasi keakuratan sumber LHO'],
    ['Audit silang menunjukkan verifikasi minimal 2 sumber dan catatan kesesuaian grafik–teks'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bindo-fe-s1-lho-ilmiah'], relatedTopicIds: ['bindo-fe-s1-lho-ilmiah'], suggestedGrade: '10' }
  ),

  // Bahasa Indonesia Fase F (Kelas 11-12 SMA/SMK) — terpisah dari Fase E!
  m(
    'bindo-ff-s1-argumentasi-ketahanan', 'Bahasa Indonesia', 'SMA/MA', 'Fase F', 'Menulis',
    'Teks Argumentasi Kebijakan Publik dan Pengembangan Paragraf Deduktif–Induktif',
    'Peserta didik dapat menyusun teks argumentasi berbasis data statistik nasional atau lokal untuk membahas isu ketahanan pangan/lingkungan dengan penalaran valid.',
    'Latih variasi pola penalaran (generalisasi, analogi logis, sebab-akibat) dan ketepatan konjungsi antarkalimat.',
    'Mengembangkan wacana argumentatif terstruktur dengan penyajian bukti kuantitatif dan kualitatif.',
    ['Argumentasi & debat Fase E'],
    ['Teks argumentasi memuat tesis tajam, dukungan data relevan, dan bebas generalisasi tergesa'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'bindo-ff-s1-berita-vlog-dokumenter', 'Bahasa Indonesia', 'SMA/MA', 'Fase F', 'Membaca & Memirsa',
    'Berita Investigatif Singkat dan Naskah Berita/Dokumenter Edukatif Bermultimedia',
    'Peserta didik dapat mengevaluasi struktur piramida terbalik berita investigatif serta menulis naskah liputan/vlog edukatif singkat yang beretika jurnalistik.',
    'Tekankan akurasi kutipan narasumber, verifikasi dua sisi (cover both sides), dan kejelasan alur visual–narasi.',
    'Menerapkan prinsip keberimbangan liputan dan penyusunan naskah presentasi informasi terverifikasi.',
    ['Evaluasi media digital Fase E'],
    ['Naskah memuat sumber konfirmasi berimbang dan memisahkan fakta liputan dari narasi opini'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  m(
    'bindo-ff-s1-proposal-kegiatan', 'Bahasa Indonesia', 'SMA/MA', 'Fase F', 'Menulis',
    'Menyusun Proposal Kegiatan / Penelitian Sederhana (Latar Belakang hingga Rencana Anggaran)',
    'Peserta didik dapat merancang proposal terstruktur lengkap dengan rumusan masalah/tujuan, metode pelaksanaan, jadwal kerja, dan anggaran rasional.',
    'Pola sistematis proposal formal: Judul, Latar Belakang logis, Tujuan terukur, Sasaran, Jadwal, Susunan Panitia, dan Rincian Biaya.',
    'Merancang dokumen usulan kegiatan formal dengan koherensi antara masalah, program, dan anggaran.',
    ['Surat dinas & kalimat baku'],
    ['Setiap butir tujuan pada proposal terhubung dengan rencana aktivitas dan pos anggaran realistis'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'bindo-ff-s1-karya-ilmiah', 'Bahasa Indonesia', 'SMA/MA', 'Fase F', 'Menulis & Meneliti',
    'Penulisan Karya Tulis Ilmiah Remaja: Abstrak, Kajian Pustaka, Metode, dan Daftar Pustaka',
    'Peserta didik dapat menyusun kerangka hingga draf karya ilmiah sederhana menggunakan bahasa keilmuan objektif, kutipan langsung/tidak langsung, dan daftar pustaka konsisten.',
    'Ajarkan pencegahan plagiarisme melalui parafrase akurat, penulisan sitasi nama-tahun, dan objektivitas kalimat pasif keilmuan.',
    'Menghasilkan tulisan ilmiah sistematis yang bebas plagiarisme dengan rujukan konsisten.',
    ['LHO & verifikasi fakta ilmiah'],
    ['Kutipan dalam teks cocok dengan daftar pustaka dan hasil parafrase menjaga makna asli sumber'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  m(
    'bindo-ff-s2-surat-lamaran-cv', 'Bahasa Indonesia', 'SMA/MA', 'Fase F', 'Menulis Fungsional',
    'Surat Lamaran Pekerjaan, Daftar Riwayat Hidup (CV), dan Simulasi Wawancara Profesional',
    'Peserta didik dapat menulis surat lamaran kerja dan CV yang efektif, menonjolkan kualifikasi faktual sesuai lowongan tanpa klaim berlebihan, memakai EYD V baku.',
    'Perhatikan bagian alamat tujuan tanpa tanda titik ganda, alinea pembuka sumber informasi lowongan, lampiran ijazah/sertifikat, serta penulisan gelar benar.',
    'Menyiapkan dokumen transisi pascasekolah/PKL dengan standar penulisan korespondensi kerja profesional.',
    ['Proposal formal & bahasa baku'],
    ['Format surat lamaran rapi bebas kesalahan penulisan Yth./sapaan serta selaras dengan CV terlampir'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bindo-ff-s1-proposal-kegiatan'], relatedTopicIds: ['bindo-ff-s1-proposal-kegiatan'], suggestedGrade: '12' }
  ),
  m(
    'bindo-ff-s2-editorial-opini-publik', 'Bahasa Indonesia', 'SMA/MA', 'Fase F', 'Membaca & Menulis',
    'Teks Editorial / Tajuk Rencana dan Artikel Opini Media Massa (Keberpihakan & Alternatif Solusi)',
    'Peserta didik dapat mengidentifikasi isu aktual, keberpihakan redaksi, bukti pendukung, dan menulis teks opini dengan rekomendasi kebijakan berbasis argumen matang.',
    'Bedakan struktur artikel opini pribadi vs editorial lembaga media serta analisis cara penulis membujuk pembaca melalui alternatif solusi.',
    'Menganalisis sudut pandang redaksi media dan merumuskan esai opini bermutu publik.',
    ['Teks argumentasi Fase F Sem 1'],
    ['Identifikasi sasaran kritik & saran editorial tepat; artikel opini siswa bebas fallasi'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bindo-ff-s1-argumentasi-ketahanan'], relatedTopicIds: ['bindo-ff-s1-argumentasi-ketahanan'], suggestedGrade: '12' }
  ),
  m(
    'bindo-ff-s2-novel-kritik-sastra', 'Bahasa Indonesia', 'SMA/MA', 'Fase F', 'Membaca & Menulis',
    'Apresiasi Novel, Drama Modern, serta Penulisan Kritik dan Esai Sastra',
    'Peserta didik dapat menganalisis nilai sosial–psikologis tokoh novel atau naskah drama lalu menuangkannya dalam esai kritik sastra berdasar pendekatan tekstual.',
    'Bedakan kritik sastra objektif (berfokus unsur karya & teknik pengarang) dengan esai sastra reflektif yang lebih personal.',
    'Mengaitkan teknik penceritaan novel/drama dengan konteks zaman pembacaan melalui esai kritis.',
    ['Cerpen/resensi dan hikayat'],
    ['Esai kritik mengutip adegan/dialog spesifik karya untuk menopang tesis analisis'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12' }
  ),
  m(
    'bindo-ff-s2-laporan-pkl-proyek', 'Bahasa Indonesia', 'SMA/MA', 'Fase F', 'Integrasi Literasi',
    'Penyusunan Laporan Pelaksanaan Kegiatan / Proyek Akhir / PKL & Presentasi Uji',
    'Peserta didik dapat merangkum proses dan hasil kegiatan/penelitian dari proposal menjadi laporan akhir terstandar beserta presentasi lisan pertanggungjawaban.',
    'Tautkan keselarasan bab pendahuluan proposal dengan bab hasil, pembahasan kendala lapangan, simpulan terukur, dan rekomendasi realistis.',
    'Menghubungkan perencanaan proposal dengan laporan hasil evaluasi akhir secara utuh.',
    ['Proposal kegiatan & karya ilmiah'],
    ['Laporan akhir menjawab seluruh rumusan tujuan proposal dengan lampiran bukti dokumentasi logis'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bindo-ff-s1-proposal-kegiatan', 'bindo-ff-s1-karya-ilmiah'], relatedTopicIds: ['bindo-ff-s1-karya-ilmiah'], suggestedGrade: '12' }
  ),

  // =====================================================================
  // 3. BAHASA INGGRIS (Fase B, C, D, E, F & Profesi SMK)
  // =====================================================================
  m(
    'bing-fb-s1-greetings-numbers', 'Bahasa Inggris', 'SD/MI', 'Fase B', 'Listening & Speaking',
    'Greetings, Self-Introduction, Numbers 1–20, and Classroom Objects',
    'Peserta didik dapat merespons sapaan sederhana, memperkenalkan nama diri, serta menyebutkan jumlah dan nama benda di dalam kelas dalam bahasa Inggris.',
    'Latih pola "Hello, I am...", "What is this? It is a book/pencil", dan penggunaan artikel a/an secara lisan bersama gambar.',
    'Berinteraksi lisan singkat di konteks kelas memakai kosakata benda sekolah dan angka dasar.',
    ['Pelafalan alfabet dan angka 1–10'],
    ['Mampu memperkenalkan nama dan menyebutkan 5 benda kelas dengan artikel a/an tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '3', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fb-s1-colors-animals', 'Bahasa Inggris', 'SD/MI', 'Fase B', 'Reading & Viewing',
    'Colors, Fruits, Animals, and Expressing Likes/Dislikes (I like / I don’t like)',
    'Peserta didik dapat menyebutkan warna, buah, dan hewan sederhana serta mengungkapkan kesukaan dan ketidaksukaan dalam kalimat pendek.',
    'Gunakan pola "I like red apples" dan "Do you like...?" dengan kartu bergambar.',
    'Menggabungkan kata sifat warna dengan kata benda serta pola preferensi sederhana.',
    ['Kosakata dasar angka dan benda sekitar'],
    ['Menyusun kalimat positif/negatif "I like / I don’t like" sesuai gambar tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fb-s1-family-rooms', 'Bahasa Inggris', 'SD/MI', 'Fase B', 'Reading & Writing',
    'My Family Members and Rooms at Home (Prepositions in, on, under)',
    'Peserta didik dapat mengenali kosakata anggota keluarga serta menyatakan letak benda di ruangan rumah menggunakan preposisi in, on, dan under.',
    'Latih pola "This is my mother", "The bag is on the chair", melalui denah rumah sederhana.',
    'Mengidentifikasi hubungan keluarga inti dan lokasi benda relatif memakai preposisi dasar.',
    ['Kosakata benda sekitar kelas'],
    ['Kalimat deskripsi posisi benda (in/on/under) cocok dengan ilustrasi denah'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fb-s1-days-daily', 'Bahasa Inggris', 'SD/MI', 'Fase B', 'Listening & Speaking',
    'Days of the Week and Simple Daily Verbs (Present Simple I/You/We)',
    'Peserta didik dapat menyebutkan hari dalam sepekan dan aktivitas harian sederhana yang dilakukan bersama keluarga atau di sekolah.',
    'Gunakan pola "I wake up at 6 o’clock", "On Monday, I go to school", memakai gambar rutinitas.',
    'Menghubungkan nama hari dengan kata kerja aksi sehari-hari.',
    ['Angka dan kosakata sekolah'],
    ['Menyusun jadwal singkat 3 hari dengan kata kerja aktivitas tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fb-s2-can-abilities', 'Bahasa Inggris', 'SD/MI', 'Fase B', 'Speaking & Writing',
    'Expressing Abilities with Modal "Can / Can’t" and Hobby Activities',
    'Peserta didik dapat bertanya jawab tentang kemampuan diri dan teman menggunakan pola "Can you swim? Yes, I can / No, I can’t".',
    'Gabungkan kata kerja hobi/aksi (sing, draw, ride a bike) dengan tanya jawab berpasangan.',
    'Mengungkapkan kesanggupan atau ketidakmampuan melakukan aktivitas secara lisan dan tulis.',
    ['Kata kerja aktivitas harian'],
    ['Membuat tanya-jawab can/can’t dengan struktur subjek–modal–V1 benar'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bing-fb-s1-days-daily'], relatedTopicIds: ['bing-fb-s1-days-daily'], suggestedGrade: '4', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fb-s2-present-continuous', 'Bahasa Inggris', 'SD/MI', 'Fase B', 'Reading & Writing',
    'Describing Ongoing Activities (Present Continuous: is/am/are + V-ing)',
    'Peserta didik dapat mendeskripsikan aktivitas yang sedang berlangsung pada gambar kelas atau taman bermain memakai be + verb-ing.',
    'Tunjukkan perbedaan to be (I am, He/She is, They are) dalam menceritakan gambar adegan.',
    'Menggunakan bentuk Present Continuous untuk menyatakan kegiatan yang sedang terjadi saat ini.',
    ['Kosakata benda dan kata kerja dasar'],
    ['Kecocokan subjek–to be–V-ing tepat untuk mendeskripsikan 4 gambar aktivitas'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bing-fb-s1-days-daily'], relatedTopicIds: ['bing-fb-s1-days-daily'], suggestedGrade: '4', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fb-s2-clock-time-transport', 'Bahasa Inggris', 'SD/MI', 'Fase B', 'Listening & Reading',
    'Telling Time (O’clock & Half Past) and Means of Transportation',
    'Peserta didik dapat menyebutkan waktu jam tepat serta sarana transportasi yang digunakan ke sekolah menggunakan pola "by bus/by bike/on foot".',
    'Latih dialog "How do you go to school?" dan membaca pukul tepat/setengah pada jam visual.',
    'Mengintegrasikan waktu jam dengan cara bepergian dalam rutinitas sekolah.',
    ['Angka dasar dan nama hari'],
    ['Mencocokkan gambar jam dan jenis kendaraan dalam kalimat pendek tepat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '4', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fb-s2-short-descriptive-card', 'Bahasa Inggris', 'SD/MI', 'Fase B', 'Writing & Presenting',
    'Writing a Short Picture Caption & Mini Descriptive Card (My Pet / My Favorite Thing)',
    'Peserta didik dapat menuliskan kartu deskripsi 4 kalimat tentang hewan peliharaan atau benda kesayangan dengan memadukan warna, ukuran, dan kemampuannya.',
    'Pandu menggunakan templat kalimat: nama benda/hewan, warna/ukuran, makanan/sifat, serta hal yang disukai.',
    'Menggabungkan kosakata warna, ukuran, has/have, dan can dalam satu paragraf deskripsi mini.',
    ['Colors, animals & modal can'],
    ['Kartu deskripsi 4 kalimat terpadu bebas kesalahan huruf kapital awal kalimat dan ejaan dasar'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-fb-s1-colors-animals', 'bing-fb-s2-can-abilities'], relatedTopicIds: ['bing-fb-s1-colors-animals'], suggestedGrade: '4', estimasiMenitSesi: 75 }
  ),

  // Bahasa Inggris Fase C (Kelas 5-6 SD) — terpisah dari Fase B!
  m(
    'bing-fc-s1-taste-food-prices', 'Bahasa Inggris', 'SD/MI', 'Fase C', 'Listening & Speaking',
    'Food Tastes, Countable/Uncountable Partitives, and Asking Food Prices',
    'Peserta didik dapat mendeskripsikan rasa makanan (sweet, sour, salty, spicy), menggunakan takaran (a glass of, a plate of), serta menanyakan harga dengan "How much is...?".',
    'Gunakan skenario kantin sekolah untuk membedakan takaran benda cair/padat serta angka puluhan ribu rupiah dalam bahasa Inggris.',
    'Berkomunikasi lisan transaksional sederhana terkait makanan, rasa, takaran, dan harga.',
    ['Food vocabulary & numbers Fase B'],
    ['Penggunaan partitive (a cup of/a slice of) tepat dan harga disebutkan benar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '5', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fc-s1-health-body-advice', 'Bahasa Inggris', 'SD/MI', 'Fase C', 'Reading & Speaking',
    'Common Illnesses, Parts of the Body, and Giving Simple Advice ("Should / Drink Water")',
    'Peserta didik dapat menyebutkan keluhan kesehatan ringan (headache, toothache, stomachache) dan memberi saran sederhana memakai "You should take a rest".',
    'Latih dialog pendek dokter–pasien atau teman–teman disertai kosakata bagian tubuh.',
    'Mengungkapkan kondisi fisik dan memberikan nasihat kesehatan dasar secara tepat.',
    ['Modal can dan kata kerja sehari-hari'],
    ['Mencocokkan keluhan kesehatan dengan saran logis memakai pola "should"'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fc-s1-comparative-adjectives', 'Bahasa Inggris', 'SD/MI', 'Fase C', 'Reading & Writing',
    'Comparing People, Animals, and Objects (Comparative -er / more ... than & Superlative)',
    'Peserta didik dapat membandingkan dua atau lebih objek berdasarkan tinggi, berat, kecepatan, atau harga memakai bentuk comparative dan superlative sederhana.',
    'Tekankan aturan kata sifat pendek (+-er / -est) vs kata sifat panjang (more / the most) pada konteks perbandingan konkret.',
    'Membuat kalimat perbandingan bertingkat berdasarkan gambar atau tabel data sederhana.',
    ['Descriptive adjectives Fase B'],
    ['Pemilihan -er vs more dan superlative the -est / most tepat untuk perbandingan gambar/data'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '5', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fc-s1-public-places-directions', 'Bahasa Inggris', 'SD/MI', 'Fase C', 'Reading & Speaking',
    'Public Places in Town and Asking/Giving Simple Directions on a Map',
    'Peserta didik dapat membaca peta kota sederhana dan memberi petunjuk arah ke fasilitas umum (library, hospital, post office) memakai "turn left, turn right, go straight".',
    'Gunakan peta grid 3×3 disertai preposisi between, next to, across from.',
    'Menginterpretasi peta sederhana menjadi instruksi arah runtut.',
    ['Prepositions in/on/under dan ruangan'],
    ['Petunjuk arah memandu pembaca dari titik awal ke tujuan peta dengan tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fc-s2-simple-past-activities', 'Bahasa Inggris', 'SD/MI', 'Fase C', 'Reading & Writing',
    'Talking About Past Weekend Activities (Simple Past Tense: Was/Were & Regular/Irregular Verbs)',
    'Peserta didik dapat menceritakan kegiatan akhir pekan atau liburan yang sudah berlalu menggunakan keterangan waktu "yesterday, last week" dan bentuk kata kerja lampau dasar.',
    'Mulai dari was/were dan V2 yang sering muncul di kehidupan anak (went, saw, played, visited, studied).',
    'Membedakan kalimat peristiwa masa kini vs peristiwa lampau dalam cerita singkat.',
    ['Present Simple & Present Continuous Fase B'],
    ['Kalimat memuat penanda waktu lampau dan kata kerja V2/was/were konsisten'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bing-fc-s1-public-places-directions'], relatedTopicIds: ['bing-fc-s1-public-places-directions'], suggestedGrade: '6', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fc-s2-future-will-going-to', 'Bahasa Inggris', 'SD/MI', 'Fase C', 'Speaking & Writing',
    'Expressing Future Plans and Aspirations ("Be Going To" & "Will")',
    'Peserta didik dapat menyatakan rencana kegiatan liburan, tugas akhir pekan, atau cita-cita masa depan dengan struktur "I am going to..." secara runtut.',
    'Kontraskan jadwal minggu lalu (Past) dengan rencana minggu depan/masa depan (Future) dengan jadwal kalender kelas.',
    'Merangkai kalimat rencana masa depan secara lisan maupun dalam kartu rencana singkat.',
    ['Simple Past & Present Continuous'],
    ['Penggunaan be going to + V1 tepat disertai keterangan waktu "next week / tomorrow"'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bing-fc-s2-simple-past-activities'], relatedTopicIds: ['bing-fc-s2-simple-past-activities'], suggestedGrade: '6', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fc-s2-short-invitation-notice', 'Bahasa Inggris', 'SD/MI', 'Fase C', 'Reading & Writing',
    'Reading & Writing Short School Notices, Invitations, and Birthday Cards',
    'Peserta didik dapat memahami informasi rincian acara (hari, tanggal, tempat, tujuan) pada kartu undangan atau pengumuman kelas lalu menulis kartu undangan pendek.',
    'Latih mengekstrak informasi who/what/when/where dari notice sekolah serta merancang kartu ucapan/undangan rapi.',
    'Memahami struktur teks fungsional pendek dan menulis undangan komunikatif akurat.',
    ['Days, time & future plans'],
    ['Undangan memuat tujuan acara, waktu, dan lokasi secara lengkap tanpa ambiguitas'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '6', estimasiMenitSesi: 75 }
  ),
  m(
    'bing-fc-s2-short-recount-story', 'Bahasa Inggris', 'SD/MI', 'Fase C', 'Writing & Presenting',
    'Composing a Short Past Recount Paragraph (Orientation–Sequence of Events–Closing)',
    'Peserta didik dapat menulis paragraf recount pendek (5–7 kalimat) tentang kunjungan belajar atau pengalaman liburan menggunakan konjungsi urutan waktu (first, then, finally).',
    'Pandu menyusun kerangka awal-tengah-akhir pengalaman nyata menggunakan V2 sederhana dan menyunting ejaan kalimat.',
    'Mengintegrasikan Past Tense, kosakata tempat, dan penanda urutan dalam tulisan naratif lampau.',
    ['Simple Past Tense & Comparative adjectives'],
    ['Paragraf recount memuat orientasi, minimal 3 urutan peristiwa lampau, dan penutup kesan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-fc-s2-simple-past-activities'], relatedTopicIds: ['bing-fc-s2-simple-past-activities'], suggestedGrade: '6', estimasiMenitSesi: 75 }
  ),

  // Bahasa Inggris SMP Fase D
  m(
    'bing-fd-s1-descriptive', 'Bahasa Inggris', 'SMP/MTs', 'Fase D', 'Reading & Viewing',
    'Descriptive Text: Describing People, Animals, and Iconic Places (Simple Present)',
    'Peserta didik dapat membaca teks deskriptif tentang tokoh/hewan/tempat serta menyusun deskripsi menggunakan Simple Present Tense dan urutan kata sifat yang tepat.',
    'Struktur Identification–Description, penggunaan has/have, dan bentuk verb-s/-es untuk subjek tunggal he/she/it.',
    'Menggunakan pola Simple Present Tense untuk menyatakan ciri tetap dan fakta deskriptif.',
    ['Kosakata dasar kata sifat dan to be'],
    ['Kesesuaian subjek-verb-s/-es tepat dan teks memiliki struktur Identification–Description'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '7' }
  ),
  m(
    'bing-fd-s1-procedure', 'Bahasa Inggris', 'SMP/MTs', 'Fase D', 'Writing & Presenting',
    'Procedure Text: Imperative Verbs, Sequencing Words, and Culinary/Digital Guides',
    'Peserta didik dapat memahami serta menuliskan panduan resep atau instruksi digital sederhana menggunakan kalimat perintah (V1) dan kata penghubung urutan.',
    'Struktur Goal–Ingredients/Tools–Steps, imperatif V1, serta sequence connectors (first, next, then, finally).',
    'Menyusun instruksi berurutan dengan verba aksi imperatif dan keterangan cara yang akurat.',
    ['Kosakata alat dapur/digital dan angka ukuran'],
    ['Kata kerja awal langkah memakai bare infinitive dan alur langkah mudah diikuti'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7' }
  ),
  m(
    'bing-fd-s1-caution-invitation', 'Bahasa Inggris', 'SMP/MTs', 'Fase D', 'Reading & Viewing',
    'Short Functional Texts: Notices, Cautions, Signs, and Greeting Cards',
    'Peserta didik dapat menafsirkan maksud larangan, peringatan keselamatan, serta tujuan teks fungsional pendek di fasilitas umum dan sekolah.',
    'Bandingkan arti wajib/larangan pada tanda peringatan ("No littering", "Keep off the grass") dengan ungkapan kartu ucapan formal/informal.',
    'Menyimpulkan pesan sosial dan konteks tempat ditemukannya teks fungsional pendek.',
    ['Short notices & invitations Fase C'],
    ['Identifikasi tujuan penulis dan tindakan yang diharapkan dari caution/notice akurat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  m(
    'bing-fd-s1-asking-opinion-agreement', 'Bahasa Inggris', 'SMP/MTs', 'Fase D', 'Listening & Speaking',
    'Expressing Opinions, Agreement/Disagreement, and Classroom Interaction Dialogues',
    'Peserta didik dapat meminta dan memberikan pendapat singkat secara santun ("What do you think?", "I agree because...") dalam diskusi isu sekolah.',
    'Latih frasa menyampaikan pendapat disertai alasan pendukung dan respons menghargai perbedaan pandangan.',
    'Berkomunikasi lisan interaksional untuk menyatakan sikap dan alasan secara sopan.',
    ['Tanya jawab dasar bahasa Inggris'],
    ['Dialog memuat minimal 1 permintaan pendapat, 1 argumen alasan, dan 1 respons setuju/tidak setuju santun'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8' }
  ),
  m(
    'bing-fd-s2-recount', 'Bahasa Inggris', 'SMP/MTs', 'Fase D', 'Writing & Presenting',
    'Recount Text: Past Events, Regular/Irregular V2 Verbs, and Time Connectives',
    'Peserta didik dapat menafsirkan dan menulis teks recount pengalaman pribadi/kegiatan sekolah memakai struktur Orientation–Events–Reorientation dan Simple Past Tense.',
    'Kontras penggunaan Simple Past V2 vs Present Tense, serta fungsi Reorientation sebagai kesan penulis.',
    'Menceritakan kronologi peristiwa masa lalu secara kohesif dengan bentuk kata kerja lampau tepat.',
    ['Descriptive & Short recount Fase C'],
    ['Kata kerja lampau V2 dan keterangan waktu masa lalu konsisten di seluruh bagian events'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bing-fd-s1-descriptive'], relatedTopicIds: ['bing-fd-s1-descriptive'], suggestedGrade: '8' }
  ),
  m(
    'bing-fd-s2-narrative-folktale', 'Bahasa Inggris', 'SMP/MTs', 'Fase D', 'Reading & Viewing',
    'Narrative Text (Fables, Legends & Folktales): Complication, Climax, Resolution, and Moral Lesson',
    'Peserta didik dapat melacak alur konflik dan resolusi pada cerita rakyat Nusantara/dunia berbahasa Inggris serta menentukan rujukan kata ganti dalam teks naratif.',
    'Bedakan Orientation → Complication → Resolution → Re-orientation/Moral serta fungsi Past Continuous + Past Simple dalam alur cerita.',
    'Menganalisis perkembangan plot konflik tokoh dan pesan moral cerita imajinatif lampau.',
    ['Recount text & Simple Past Tense'],
    ['Mengidentifikasi titik puncak konflik dan resolusi serta makna moral cerita dengan dukungan kutipan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-fd-s2-recount'], relatedTopicIds: ['bing-fd-s2-recount'], suggestedGrade: '9' }
  ),
  m(
    'bing-fd-s2-report-information', 'Bahasa Inggris', 'SMP/MTs', 'Fase D', 'Reading & Writing',
    'Information Report Text: Scientific Classification of Flora, Fauna, or Phenomena (General Present)',
    'Peserta didik dapat membedakan Descriptive Text (objek spesifik) dengan Information Report Text (kategori umum ilmiah) menggunakan Simple Present dan Passive Voice dasar.',
    'Struktur General Classification → Description (appearance, habitat, behavior) dan kalimat pasif sederhana (is found in, are used to).',
    'Menyajikan informasi klasifikasi ilmiah secara objektif dalam paragraf berbahasa Inggris.',
    ['Descriptive Text'],
    ['Membedakan deskripsi hewan peliharaan spesifik vs report spesies umum dengan kalimat faktual'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bing-fd-s1-descriptive'], relatedTopicIds: ['bing-fd-s1-descriptive'], suggestedGrade: '9' }
  ),
  m(
    'bing-fd-s2-song-reflection-poster', 'Bahasa Inggris', 'SMP/MTs', 'Fase D', 'Listening & Presenting',
    'Interpreting Song Lyrics / Inspirational Quotes & Designing a Social Campaign Poster',
    'Peserta didik dapat menangkap pesan sosial/emosi dari lirik lagu berbahasa Inggris sederhana dan membuat poster ajakan positif berbahasa persuasif.',
    'Analisis makna frasa figuratif ringan pada lirik lalu padukan kalimat ajakan dengan visual informatif.',
    'Menangkap pesan budaya/nilai kemanusiaan dari media lagu serta menyebarkan pesan positif bermodal bahasa multimodal.',
    ['Notices/cautions & opinions'],
    ['Penjelasan pesan lirik akurat berdasar bait lagu dan poster memakai kalimat ajakan jelas'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-fd-s1-caution-invitation', 'bing-fd-s1-asking-opinion-agreement'], relatedTopicIds: ['bing-fd-s1-asking-opinion-agreement'], suggestedGrade: '9' }
  ),

  // Bahasa Inggris SMA/MA Fase E & F + SMK Profesi Fase E & F
  m(
    'bing-fe-sma-s1-recount-sports-experience', 'Bahasa Inggris', 'SMA/MA', 'Fase E', 'Reading & Writing',
    'Personal & Historical Recount Text with Past Continuous & Clause Connectors',
    'Peserta didik dapat menganalisis teks recount peristiwa penting maupun pengalaman atlet/tokoh serta menulis teks recount kronologis berstruktur jelas.',
    'Kombinasi Simple Past + Past Continuous (when/while) dan penanda urutan kronologis tingkat lanjut.',
    'Menulis naratif peristiwa lampau dengan perincian latar waktu dan sudut pandang jelas.',
    ['Recount text SMP'],
    ['Struktur Orientation–Events–Reorientation lengkap disertai konektor waktu akurat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-sma-s1-descriptive-tourism', 'Bahasa Inggris', 'SMA/MA', 'Fase E', 'Reading & Speaking',
    'Descriptive & Multimodal Tourism Guides with Specific Adjectives and Spatial Order',
    'Peserta didik dapat mengevaluasi teks promosi wisata cetak/daring serta mempresentasikan destinasi lokal Nusantara dengan kosakata deskriptif kaya.',
    'Latih frasa kata benda (noun phrases) terstruktur untuk mendeskripsikan keunikan lokasi dan budaya setempat.',
    'Menyajikan teks deskriptif multimodal guna mempromosikan potensi daerah secara akurat.',
    ['Descriptive text SMP'],
    ['Noun phrases deskriptif tepat dan presentasi mencakup daya tarik, akses, dan nilai budaya lokal'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-sma-s1-procedure-health', 'Bahasa Inggris', 'SMA/MA', 'Fase E', 'Reading & Writing',
    'Procedure Text on Healthy Lifestyle, Digital Safety, & Infographics Tips',
    'Peserta didik dapat menyaring informasi utama dari teks prosedur infografik kesehatan/keamanan digital serta menuliskan panduan langkah logis menggunakan imperative dan adverbs.',
    'Fokus pada verba modal nasihat (should, must, avoid) dan keterkaitan teks-gambar dalam infografis tips.',
    'Mengubah informasi prosedural multimodal menjadi panduan operasional ringkas berbahasa Inggris.',
    ['Procedure text SMP'],
    ['Teks panduan memuat tujuan jelas, syarat keselamatan, dan langkah imperatif akurat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-sma-s1-narrative-modern', 'Bahasa Inggris', 'SMA/MA', 'Fase E', 'Reading & Viewing',
    'Fractured Stories & Modern Narrative: Point of View and Implicit Character Motivation',
    'Peserta didik dapat membandingkan versi klasik dan adaptasi modern cerita naratif untuk memahami pergeseran sudut pandang serta pesan tersirat.',
    'Analisis direct vs indirect speech, perubahan perspektif tokoh minor, dan implikasi moral cerita.',
    'Menafsirkan motif tersembunyi tokoh dan membandingkan sudut pandang dalam teks fiksi.',
    ['Narrative SMP'],
    ['Analisis menunjukkan perbandingan sudut pandang dan bukti dialog dalam teks'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-sma-s2-analytical-exposition', 'Bahasa Inggris', 'SMA/MA', 'Fase E', 'Reading & Writing',
    'Analytical Exposition Text: Thesis, Evidence-Based Arguments, and Reiteration',
    'Peserta didik dapat mengidentifikasi tesis dan argumen kausal dalam teks Analytical Exposition serta menulis paragraf argumentasi tentang isu pendidikan atau digitalisasi.',
    'Gunakan internal conjunctions (firstly, furthermore, consequently) dan mental/relational verbs (believe, demonstrate, is crucial).',
    'Menyusun argumen analitis tersusun rapi guna meyakinkan pembaca akan suatu perspektif.',
    ['Asking opinion & descriptive/procedure'],
    ['Tesis konsisten dengan argumen bernomor dan penegasan ulang tidak melenceng topik'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-sma-s2-hortatory-graffiti-social', 'Bahasa Inggris', 'SMA/MA', 'Fase E', 'Reading & Speaking',
    'Hortatory Exposition & Giving Recommendations ("Should / Ought to") on Youth Issues',
    'Peserta didik dapat membedakan Analytical Exposition (kesimpulan posisi) dari Hortatory Exposition (rekomendasi tindakan) dan mempresentasikan usulan aksi nyata di kelas.',
    'Tekankan bagian Recommendation memakai modal anjuran sopan dan kalimat pasif objektif.',
    'Merumuskan rekomendasi kebijakan praktis yang logis berdasar argumen faktual.',
    ['Analytical Exposition'],
    ['Membedakan Reiteration vs Recommendation dan menyusun anjuran realistis'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-fe-sma-s2-analytical-exposition'], relatedTopicIds: ['bing-fe-sma-s2-analytical-exposition'], suggestedGrade: '10' }
  ),
  m(
    'bing-fe-sma-s2-news-headline-analysis', 'Bahasa Inggris', 'SMA/MA', 'Fase E', 'Reading & Viewing',
    'Evaluating Online News Reports, Headlines, Passive Reporting, and Credibility Signals',
    'Peserta didik dapat membaca berita ringkas berbahasa Inggris, mengenali kalimat pasif kutipan sumber ("was reported by"), dan menilai objektivitas berita.',
    'Latih teknik membaca ringkasan berita 5W+1H dan mengenali pergeseran makna dari kata emotif vs netral.',
    'Memilah informasi inti berita internasional/lokal dan mengevaluasi netralitas pelaporannya.',
    ['Recount & exposition texts'],
    ['Ekstraksi 5W+1H tepat dan perbandingan dua sumber menyoroti perbedaan nada peliputan'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-sma-s2-multimodal-presentation', 'Bahasa Inggris', 'SMA/MA', 'Fase E', 'Speaking & Presenting',
    'Delivering a Structured Multimodal Mini-Presentation on a Community Issue',
    'Peserta didik dapat menggabungkan teks ringkas, grafik visual, dan kemampuan berbicara (signposting) dalam presentasi 3 menit tentang topik pilihan.',
    'Ajarkan kalimat transisi presentasi ("Moving on to my next point...", "To summarize...") serta penanganan tanya jawab.',
    'Mengintegrasikan kemampuan membaca, menulis poin ringkas, dan berbicara persuasif secara percaya diri.',
    ['Analytical & Hortatory Exposition'],
    ['Presentasi memiliki pembukaan, alur signposting jelas, visual relevan, dan respons Q&A logis'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-fe-sma-s2-analytical-exposition'], relatedTopicIds: ['bing-fe-sma-s2-analytical-exposition'], suggestedGrade: '10' }
  ),

  // Bahasa Inggris SMA Fase F (Kelas 11-12)
  m(
    'bing-ff-sma-s1-analytical-digital-literacy', 'Bahasa Inggris', 'SMA/MA', 'Fase F', 'Reading & Writing',
    'Extended Analytical Exposition & Synthesizing Two Reading Sources on Digital/Global Challenges',
    'Peserta didik dapat membandingkan argumen dari dua artikel opini berbeda, mensintesis poin sepakat–berbeda, dan menulis esai analitis yang merujuk data bacaan.',
    'Latih parafrase sumber tanpa menyalin mentah dan penggunaan linking expressions of contrast (however, despite, whereas).',
    'Membangun sintesis lintas bacaan dan menyusun argumentasi tingkat lanjut.',
    ['Analytical Exposition Fase E'],
    ['Esai mengintegrasikan minimal 2 perspektif sumber secara tepat dan kohesif'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'bing-ff-sma-s1-cause-effect-explanation', 'Bahasa Inggris', 'SMA/MA', 'Fase F', 'Reading & Writing',
    'Explanation Text: Explaining Complex Natural or Technological Processes (Passive Voice)',
    'Peserta didik dapat menganalisis dan menyusun teks eksplanasi tentang proses ilmiah atau teknologi memakai ragam pasif ilmiah (Passive Voice) dan penanda sebab–akibat.',
    'Bentuk pasif present/past serta frasa kausalitas (due to, leads to, triggers, as a result of).',
    'Menjelaskan rangkaian proses kausal objektif dengan gaya penulisan ilmiah bahasa Inggris.',
    ['Information report & procedure teks'],
    ['Penggunaan passive voice akurat dan rantai sebab–akibat tersusun sistematis'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  m(
    'bing-ff-sma-s1-discussion-balanced', 'Bahasa Inggris', 'SMA/MA', 'Fase F', 'Writing & Speaking',
    'Discussion Text: Weighing Arguments For & Against Before Drawing a Nuanced Conclusion',
    'Peserta didik dapat mengevaluasi isu kontroversial (mis. penggunaan AI di sekolah atau energi hijau) dari dua sisi argumen sebelum merumuskan kesimpulan berimbang.',
    'Struktur Issue → Arguments For → Arguments Against → Conclusion/Recommendation dengan modal kehati-hatian (may, tend to, could).',
    'Membandingkan argumen bertentangan secara adil menggunakan bahasa akademik objektif.',
    ['Analytical & Hortatory Exposition'],
    ['Dua perspektif diuraikan seimbang lengkap dengan bukti pendukung dan simpulan sintetis'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  m(
    'bing-ff-sma-s1-conditional-hypothetical', 'Bahasa Inggris', 'SMA/MA', 'Fase F', 'Reading & Grammar in Context',
    'Conditional Sentences (Type 1, 2, 3) & Expressing Hypothetical Outcomes in Problem-Solving',
    'Peserta didik dapat menggunakan kalimat pengandaian tipe 1, 2, dan 3 secara tepat untuk meramalkan konsekuensi kebijakan atau mengevaluasi skenario alternatif.',
    'Fokus pada makna nyata masa depan (Type 1), pengandaian saat ini (Type 2), dan refleksi kejadian lampau (Type 3).',
    'Mengungkapkan hubungan syarat–akibat dan refleksi alternatif secara gramatikal akurat.',
    ['Simple Present, Past, and Future Tenses'],
    ['Pemilihan tipe conditional sesuai konteks waktu dan maksud pembicara'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '11' }
  ),
  m(
    'bing-ff-sma-s2-application-letter-cv', 'Bahasa Inggris', 'SMA/MA', 'Fase F', 'Writing Fungsional',
    'Cover Letter, Academic/Career CV, and Formal Inquiry Emails',
    'Peserta didik dapat menyusun surat lamaran/beasiswa (cover letter) serta CV berbahasa Inggris dengan format profesional dan korespondensi email santun.',
    'Tekankan kata kerja aksi pencapaian (organized, designed, assisted), konsistensi tata letak CV, dan salam penutup formal (Yours sincerely/faithfully).',
    'Mempersiapkan komunikasi tertulis profesional untuk jenjang perguruan tinggi atau dunia kerja.',
    ['Formal texts & conditional offers'],
    ['Cover letter menjawab kualifikasi posisi spesifik memakai bahasa formal akurat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '12' }
  ),
  m(
    'bing-ff-sma-s2-review-critique', 'Bahasa Inggris', 'SMA/MA', 'Fase F', 'Reading & Writing',
    'Review / Critique Text: Evaluating Books, Films, Digital Tools, or Cultural Works',
    'Peserta didik dapat menyusun teks ulasan karya dengan struktur Orientation → Interpretative Recount → Evaluation → Evaluative Summation berimbang.',
    'Latih penggunaan ungkapan evaluasi (compelling, well-paced, lacks depth in...) disertai bukti adegan atau fitur nyata.',
    'Memberi penilaian kritis berbasis kriteria yang jelas atas produk budaya atau media.',
    ['Discussion & Narrative texts'],
    ['Ulasan memadukan ringkasan non-spoiler dengan kriteria penilaian objektif'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bing-ff-sma-s1-discussion-balanced'], relatedTopicIds: ['bing-ff-sma-s1-discussion-balanced'], suggestedGrade: '12' }
  ),
  m(
    'bing-ff-sma-s2-interview-negotiation', 'Bahasa Inggris', 'SMA/MA', 'Fase F', 'Listening & Speaking',
    'Job/Scholarship Interview Simulation and Formal Q&A Communication Strategies',
    'Peserta didik dapat menjawab pertanyaan wawancara umum (strengths, teamwork experience, problem-solving) dengan teknik STAR singkat secara santun dan meyakinkan.',
    'Latih teknik STAR (Situation–Task–Action–Result) dan frasa klarifikasi sopan bila tidak langsung memahami pertanyaan.',
    'Berbicara terstruktur dan responsif dalam situasi wawancara atau forum formal bahasa Inggris.',
    ['Cover letter & CV'],
    ['Respons wawancara mengikuti alur STAR yang jelas dan relevan dengan profil CV'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-ff-sma-s2-application-letter-cv'], relatedTopicIds: ['bing-ff-sma-s2-application-letter-cv'], suggestedGrade: '12' }
  ),
  m(
    'bing-ff-sma-s2-academic-essay-capstone', 'Bahasa Inggris', 'SMA/MA', 'Fase F', 'Writing & Critical Literacy',
    'Synthesizing Research Findings into a Short Academic Report & Presentation',
    'Peserta didik dapat menyusun laporan proyek mini berbahasa Inggris (abstract singkat, key findings, discussion, conclusion) dan mempresentasikannya dengan visual data.',
    'Gabungkan kemampuan analisis grafik tren, kalimat pasif metode, serta kesimpulan terbatas sesuai bukti.',
    'Mengintegrasikan literasi membaca kritis, penulisan akademik ringkas, dan presentasi data bahasa Inggris.',
    ['Explanation & Discussion texts'],
    ['Laporan proyek koheren antara pertanyaan, bukti ringkas, dan simpulan bebas klaim berlebihan'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bing-ff-sma-s1-analytical-digital-literacy'], relatedTopicIds: ['bing-ff-sma-s1-analytical-digital-literacy'], suggestedGrade: '12' }
  ),

  // Bahasa Inggris Profesi SMK (Fase E & Fase F)
  m(
    'bing-fe-smk-s1-workplace-sop', 'Bahasa Inggris Profesi', 'SMK', 'Fase E', 'Reading & Writing',
    'Workplace Instructions, Safety Signs, and Standard Operating Procedures (SOP)',
    'Peserta didik dapat membaca tanda K3, manual alat, serta langkah SOP kerja berbahasa Inggris dan menyusun instruksi keselamatan kerja ringkas.',
    'Kosakata alat keselamatan (PPE, caution, warning), kalimat imperatif SOP, dan larangan keselamatan bengkel/studio.',
    'Memahami dan merumuskan prosedur kerja serta simbol keselamatan lingkungan kejuruan.',
    ['Procedure text SMP'],
    ['Interpretasi manual/tanda K3 tepat dan SOP langkah kerja tersusun berurutan'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-smk-s1-service-greeting', 'Bahasa Inggris Profesi', 'SMK', 'Fase E', 'Listening & Speaking',
    'Hospitality, Customer Service Greetings, and Polite Workplace Requests',
    'Peserta didik dapat mempraktikkan sapaan pelanggan, menawarkan bantuan ("How may I assist you?"), dan menanggapi pertanyaan dasar di lingkungan kerja.',
    'Latih ungkapan modal kesantunan (Could I..., Would you mind...) dalam simulasi resepsionis atau layanan teknis.',
    'Berkomunikasi lisan profesional dan ramah dalam layanan tamu/klien dasar.',
    ['Classroom greetings & interaction'],
    ['Simulasi layanan memakai intonasi ramah dan frasa penawaran bantuan formal tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-smk-s1-product-spec', 'Bahasa Inggris Profesi', 'SMK', 'Fase E', 'Reading & Viewing',
    'Reading Technical Product Specifications, Labels, and Equipment Brochures',
    'Peserta didik dapat mengekstrak spesifikasi teknis (dimensi, kapasitas, daya, tanggal kedaluwarsa, material) dari lembar spesifikasi/brosur bahasa Inggris.',
    'Gunakan perbandingan dua brosur produk kejuruan untuk memilih alat sesuai kebutuhan proyek.',
    'Membaca tabel spesifikasi teknis dan membandingkan kelayakan produk kerja.',
    ['Descriptive & comparative texts'],
    ['Data spesifikasi diekstrak akurat dan alasan pemilihan produk sesuai syarat tugas'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-smk-s1-work-schedule-memo', 'Bahasa Inggris Profesi', 'SMK', 'Fase E', 'Writing Fungsional',
    'Writing Workplace Memos, Shift Schedules, and Task Logbooks',
    'Peserta didik dapat menuliskan memo internal singkat dan catatan pekerjaan (logbook) harian tentang tugas yang telah dikerjakan dan kendala ringan.',
    'Perhatikan komponen memo (To, From, Date, Subject) serta penggunaan Past Simple pada catatan pekerjaan selesai.',
    'Menyusun catatan administrasi kerja harian secara singkat, padat, dan jelas.',
    ['Short notices & Past Simple'],
    ['Memo memuat penerima, pengirim, subjek jelas, dan informasi inti tanpa kalimat bertele-tele'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'bing-fe-smk-s2-complaint-handling', 'Bahasa Inggris Profesi', 'SMK', 'Fase E', 'Listening & Speaking',
    'Handling Customer Inquiries, Minor Complaints, and Follow-Up Apologies Professionally',
    'Peserta didik dapat menanggapi keluhan ringan klien dengan mendengarkan aktif, permohonan maaf profesional, dan penawaran solusi sesuai kewenangan.',
    'Urutan LEARN (Listen, Empathize, Apologize, React/Resolve, Notify) dalam dialog layanan kerja.',
    'Mengelola situasi komplain ringan secara tenang dan berorientasi penyelesaian.',
    ['Customer service greetings Sem 1'],
    ['Dialog penanganan komplain menyertakan empati, permintaan maaf santun, dan langkah solusi'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bing-fe-smk-s1-service-greeting'], relatedTopicIds: ['bing-fe-smk-s1-service-greeting'], suggestedGrade: '10' }
  ),
  m(
    'bing-fe-smk-s2-quotation-order-email', 'Bahasa Inggris Profesi', 'SMK', 'Fase E', 'Writing Fungsional',
    'Business Emails: Requesting Quotations, Confirming Orders, and Scheduling Appointments',
    'Peserta didik dapat menulis email permintaan penawaran harga dan konfirmasi jadwal kerja dengan tata tulis korespondensi bisnis dasar yang jelas.',
    'Subject line informatif, pembukaan langsung ke tujuan, rincian kuantitas item dalam poin, dan penutup sopan.',
    'Menulis korespondensi elektronik transaksi bisnis sederhana secara terstruktur.',
    ['Product specifications & workplace memos'],
    ['Email mencantumkan jumlah/spesifikasi barang, tenggat waktu, dan salam formal konsisten'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-fe-smk-s1-product-spec', 'bing-fe-smk-s1-work-schedule-memo'], relatedTopicIds: ['bing-fe-smk-s1-work-schedule-memo'], suggestedGrade: '10' }
  ),
  m(
    'bing-fe-smk-s2-troubleshooting-guide', 'Bahasa Inggris Profesi', 'SMK', 'Fase E', 'Reading & Writing',
    'Cause–Effect Troubleshooting Flowcharts and Incident Reports in Workshops/Studios',
    'Peserta didik dapat menafsirkan tabel troubleshooting ("If problem X occurs, check Y") dan menuliskan laporan singkat insiden kerusakan ringan.',
    'Gunakan struktur kondisi If... then... serta penjelasan gejala, dugaan penyebab, dan tindakan perbaikan awal.',
    'Menganalisis alur deteksi gangguan teknis sederhana dan mendokumentasikannya.',
    ['Workplace SOPs & safety signs'],
    ['Langkah perbaikan mengikuti urutan sebab–akibat manual tanpa melewati langkah keselamatan'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bing-fe-smk-s1-workplace-sop'], relatedTopicIds: ['bing-fe-smk-s1-workplace-sop'], suggestedGrade: '10' }
  ),
  m(
    'bing-fe-smk-s2-product-pitch-demo', 'Bahasa Inggris Profesi', 'SMK', 'Fase E', 'Speaking & Presenting',
    'Product/Service Pitching and Demonstration of Vocational Mini-Projects',
    'Peserta didik dapat mempresentasikan fitur unggulan, kegunaan, dan keunggulan produk/jasa karya kelas dalam bahasa Inggris singkat selama 2–3 menit.',
    'Latih menjelaskan fitur (features) dan manfaat bagi pengguna (benefits) dilengkapi alat bantu visual/prototipe.',
    'Mempromosikan karya/jasa kejuruan secara persuasif dan informatif di depan audiens.',
    ['Product specs & complaint handling'],
    ['Presentasi menjelaskan fungsi, sasaran pengguna, dan keunggulan karya secara jelas'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-fe-smk-s1-product-spec'], relatedTopicIds: ['bing-fe-smk-s1-product-spec'], suggestedGrade: '10' }
  ),
  // SMK Bahasa Inggris Profesi Fase F
  m(
    'bing-ff-smk-s1-manual-analysis-sop', 'Bahasa Inggris Profesi', 'SMK', 'Fase F', 'Reading & Technical Literacy',
    'Analyzing Complex Equipment Manuals, Quality Standards, and Operational Checklists',
    'Peserta didik dapat mengekstrak ketentuan kalibrasi, garansi, dan standar kualitas dari dokumen manual teknis berbahasa Inggris serta menyusun daftar periksa operasional.',
    'Fokus pada klausa syarat teknis (provided that, unless, prior to) dan istilah kepatuhan kualitas industri.',
    'Menerjemahkan manual operasional kompleks ke checklist inspeksi yang dapat diterapkan langsung.',
    ['Workplace SOP & troubleshooting Fase E'],
    ['Checklist memuat seluruh titik uji wajib dan peringatan batas operasional dari manual'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'bing-ff-smk-s1-business-negotiation', 'Bahasa Inggris Profesi', 'SMK', 'Fase F', 'Listening & Speaking',
    'Negotiating Service Terms, Timelines, and Project Deliverables with Clients',
    'Peserta didik dapat melakukan negosiasi tenggat, kuantitas, dan ketentuan layanan dengan klien secara diplomatis menggunakan conditional offers ("If you order..., we can...").',
    'Latih teknik menimbang tawaran balik, menyepakati cakupan revisi, dan merangkum poin kesepakatan lisan menjadi catatan tertulis.',
    'Bernegosiasi layanan profesional menggunakan ungkapan kondisional dan kesepakatan terukur.',
    ['Quotation emails & complaint handling'],
    ['Simulasi negosiasi menghasilkan kesepakatan harga/waktu tertulis tanpa syarat ambigu'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  m(
    'bing-ff-smk-s1-proposal-catalogue', 'Bahasa Inggris Profesi', 'SMK', 'Fase F', 'Writing & Multimodal',
    'Writing a Vocational Service Proposal or Digital Product Catalogue in English',
    'Peserta didik dapat merancang katalog jasa atau proposal penawaran kerja sama proyek kejuruan dalam bahasa Inggris lengkap dengan cakupan layanan dan estimasi jadwal.',
    'Struktur Executive Overview, Scope of Services, Timeline, Terms of Payment memakai bahasa persuasif profesional.',
    'Menghasilkan dokumen penawaran jasa/produk terstruktur siap presentasi klien.',
    ['Product pitch & business emails Fase E'],
    ['Proposal memuat rincian cakupan, jadwal, serta syarat layanan jelas'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'bing-ff-smk-s1-pkl-progress-report', 'Bahasa Inggris Profesi', 'SMK', 'Fase F', 'Writing Fungsional',
    'Documenting Internship / Project Progress Reports and Workplace Reflections',
    'Peserta didik dapat menulis laporan kemajuan proyek atau kegiatan PKL dalam bahasa Inggris mencakup tugas yang dijalankan, kompetensi baru, dan solusi hambatan.',
    'Gunakan kombinasi Past Simple (capaian selesai), Present Perfect (pengalaman hingga kini), dan rencana tindak lanjut.',
    'Mendokumentasikan aktivitas praktik kerja lapangan dan refleksi profesional secara akurat.',
    ['Workplace memos & logbooks Fase E'],
    ['Laporan memisahkan deskripsi kegiatan faktual dan refleksi pembelajaran profesional'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '11' }
  ),
  m(
    'bing-ff-smk-s2-cv-cover-portfolio', 'Bahasa Inggris Profesi', 'SMK', 'Fase F', 'Writing Fungsional',
    'Industry-Ready Resume/CV, Cover Letter, and Digital Portfolio Descriptions in English',
    'Peserta didik dapat menyusun CV berbasis kompetensi keahlian, surat lamaran terarah ke industri, dan deskripsi portofolio karya PKL/proyek.',
    'Soroti sertifikat kompetensi, proyek nyata, serta hasil terukur dengan kata kerja aktif profesional.',
    'Menyiapkan berkas lamaran kerja dan narasi portofolio keahlian berstandar rekrutmen industri.',
    ['Internship reports & service proposals'],
    ['CV & portofolio menonjolkan keahlian teknis spesifik dan bebas kesalahan tata bahasa dasar'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bing-ff-smk-s1-pkl-progress-report'], relatedTopicIds: ['bing-ff-smk-s1-pkl-progress-report'], suggestedGrade: '12' }
  ),
  m(
    'bing-ff-smk-s2-job-interview-mock', 'Bahasa Inggris Profesi', 'SMK', 'Fase F', 'Listening & Speaking',
    'Technical & Behavioral Job Interview Simulation in English',
    'Peserta didik dapat menjawab pertanyaan wawancara kerja teknis maupun perilaku (motivasi, pengalaman PKL, kerja tim, penanganan kesalahan) secara meyakinkan.',
    'Latih jawaban berbasis bukti PKL/proyek kelas menggunakan metode STAR serta pertanyaan balik bermutu untuk pewawancara.',
    'Mengomunikasikan kesiapan kompetensi kerja dan etos profesional dalam wawancara berbahasa Inggris.',
    ['Resume/CV & negotiation skills'],
    ['Respons wawancara relevan dengan jabatan lamaran dan didukung contoh kerja nyata'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bing-ff-smk-s2-cv-cover-portfolio'], relatedTopicIds: ['bing-ff-smk-s2-cv-cover-portfolio'], suggestedGrade: '12' }
  ),
  m(
    'bing-ff-smk-s2-client-incident-review', 'Bahasa Inggris Profesi', 'SMK', 'Fase F', 'Reading & Writing',
    'Post-Service Feedback Evaluation, Root-Cause Summaries, and Preventive Action Letters',
    'Peserta didik dapat menganalisis umpan balik klien/pengguna untuk menyusun ringkasan akar kendala layanan dan surat tindak lanjut perbaikan yang konstruktif.',
    'Bedakan laporan keluhan emosional dari temuan teknis terukur sebelum menulis surat klarifikasi dan solusi preventif.',
    'Mengevaluasi kualitas layanan berdasar umpan balik serta merancang komunikasi pemulihan hubungan klien.',
    ['Manual checklists & complaint handling'],
    ['Ringkasan kendala terstruktur fakta dan surat tindak lanjut menawarkan langkah korektif jelas'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bing-ff-smk-s1-manual-analysis-sop'], relatedTopicIds: ['bing-ff-smk-s1-manual-analysis-sop'], suggestedGrade: '12' }
  ),
  m(
    'bing-ff-smk-s2-capstone-vocational-showcase', 'Bahasa Inggris Profesi', 'SMK', 'Fase F', 'Integrasi Kinerja',
    'Final Vocational Project Showcase Presentation & Technical Q&A Defense',
    'Peserta didik dapat mempresentasikan proyek kejuruan akhir secara komprehensif (latar kebutuhan, spesifikasi teknis, alur kerja, hasil uji) dan menjawab pertanyaan penguji dalam bahasa Inggris.',
    'Pandu transisi antarbagian presentasi, pembacaan grafik/spesifikasi uji produk, dan defense singkat keunggulan desain.',
    'Mengintegrasikan seluruh keterampilan komunikasi profesi pada uji presentasi proyek akhir.',
    ['Vocational proposal, CV & interview skills'],
    ['Presentasi lengkap memuat demonstrasi karya/proses teknis dan respons Q&A objektif'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bing-ff-smk-s1-proposal-catalogue'], relatedTopicIds: ['bing-ff-smk-s1-proposal-catalogue'], suggestedGrade: '12' }
  ),

  // =====================================================================
  // 4. SAINS: IPAS SD (Fase B vs C!), IPA SMP (Fase D), PROJEK IPAS (SMK), FISIKA/KIMIA/BIOLOGI (Fase E vs F)
  // =====================================================================
  // 4A. IPAS SD FASE B (Kelas 3-4)
  m(
    'ipas-fb-s1-tumbuhan-fotosintesis', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase B', 'Pemahaman IPAS (Sains)',
    'Bagian Tubuh Tumbuhan, Fungsi Akar–Daun, dan Proses Fotosintesis',
    'Peserta didik dapat mengidentifikasi fungsi akar, batang, daun, bunga, serta menguraikan bahan masukan dan hasil proses fotosintesis bagi makhluk hidup.',
    'Peran klorofil, cahaya matahari, air, karbon dioksida serta hasilnya berupa karbohidrat dan oksigen.',
    'Menghubungkan bagian tumbuhan dengan fungsinya dalam kelangsungan hidup dan rantai pangan awal.',
    ['Mengenal tumbuhan hijau di sekitar rumah dan sekolah'],
    ['Menyebutkan fungsi tiap organ tumbuhan dan menyusun skema masukan–hasil fotosintesis tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '4' }
  ),
  m(
    'ipas-fb-s1-wujud-zat', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase B', 'Pemahaman IPAS (Sains)',
    'Wujud Zat (Padat, Cair, Gas) dan Perubahan Wujud Akibat Kalor',
    'Peserta didik dapat membedakan sifat benda padat, cair, dan gas serta menyelidiki perubahan wujud mencair, membeku, menguap, mengembun, dan menyublim.',
    'Percobaan sederhana es mencair, air mendidih, dan titik air di dinding gelas dingin beserta penjelasan serap/lepas panas.',
    'Menyelidiki perubahan wujud benda melalui pengamatan nyata dan mengaitkannya dengan siklus air.',
    ['Pengamatan benda padat dan cair sehari-hari'],
    ['Membedakan apakah perubahan wujud membutuhkan atau melepaskan panas dengan contoh benar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '3' }
  ),
  m(
    'ipas-fb-s1-gaya-gerak', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase B', 'Pemahaman IPAS (Sains)',
    'Pengaruh Gaya (Otot, Gesek, Gravitasi, Magnet) terhadap Gerak dan Bentuk Benda',
    'Peserta didik dapat menyelidiki bagaimana dorongan/tarikan serta gaya gesek dan magnet memengaruhi kecepatan, arah, atau bentuk benda di sekitar kelas.',
    'Bandingkan laju mobil mainan di permukaan licin vs kasar untuk memahami manfaat dan hambatan gaya gesek.',
    'Menghubungkan jenis gaya dengan perubahan gerak benda melalui eksperimen sederhana.',
    ['Konsep benda diam dan bergerak'],
    ['Mengidentifikasi jenis gaya pada aktivitas harian dan cara memperbesar/memperkecil gaya gesek'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '4' }
  ),
  m(
    'ipas-fb-s1-energi-perubahan', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase B', 'Pemahaman IPAS (Sains)',
    'Bentuk Energi dan Perubahan Energi di Sekitar Kita (Listrik, Panas, Gerak, Cahaya)',
    'Peserta didik dapat melacak transformasi energi pada peralatan rumah tangga (kipas angin, setrika, senter) serta praktik hemat energi sederhana.',
    'Gunakan tabel pencocokan alat → sumber energi masuk → energi keluaran utama yang dimanfaatkan manusia.',
    'Menjelaskan transformasi energi pada alat sehari-hari dan pentingnya perilaku hemat energi.',
    ['Mengamati peralatan listrik dan cahaya di rumah/kelas'],
    ['Menyebutkan perubahan energi awal ke energi guna pada minimal 4 peralatan rumah'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4' }
  ),
  m(
    'ipas-fb-s2-ragam-bentang-daerah', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase B', 'Pemahaman IPAS (Sosial)',
    'Bentang Alam, Keragaman Budaya Daerahku, dan Kearifan Lokal Wilayah Tempat Tinggal',
    'Peserta didik dapat mengidentifikasi hubungan kondisi bentang alam (dataran rendah, pantai, pegunungan) dengan mata pencaharian serta tradisi kearifan lokal daerahnya.',
    'Bandingkan pekerjaan utama warga daerah pantai vs dataran tinggi serta contoh tradisi menjaga kelestarian alam setempat.',
    'Menghubungkan lingkungan geografis lokal dengan corak budaya dan mata pencaharian masyarakat.',
    ['Mengenal lingkungan rumah dan peta wilayah kota/kabupaten'],
    ['Memetakan kaitan kondisi alam daerah dengan profesi penduduk dan keragaman budaya lokal'],
    '2 (Genap)', 'pengenalan', { suggestedGrade: '4' }
  ),
  m(
    'ipas-fb-s2-kebutuhan-ekonomi', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase B', 'Pemahaman IPAS (Sosial)',
    'Kebutuhan vs Keinginan Manusia, Nilai Uang, dan Kegiatan Ekonomi (Produksi–Distribusi–Konsumsi)',
    'Peserta didik dapat membedakan kebutuhan primer, sekunder, tersier dengan keinginan serta menelusuri alur perjalanan barang dari produsen hingga konsumen.',
    'Gunakan studi kasus urutan skala prioritas belanja siswa dan alur beras atau roti dari petani/pabrik sampai meja makan.',
    'Menyusun prioritas pemenuhan kebutuhan dan menjelaskan fungsi pelaku kegiatan ekonomi.',
    ['Pengalaman transaksi jajan/belanja sederhana'],
    ['Pemisahan kebutuhan vs keinginan beralasan jelas dan alur pelaku ekonomi berurutan benar'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ipas-fb-s2-ragam-bentang-daerah'], relatedTopicIds: ['ipas-fb-s2-ragam-bentang-daerah'], suggestedGrade: '4' }
  ),
  m(
    'ipas-fb-s2-peta-aturan-masyarakat', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase B', 'Pemahaman IPAS (Sosial)',
    'Membaca Peta Wilayah Provinsi, Arah Mata Angin, serta Norma/Aturan di Lingkungan Sosial',
    'Peserta didik dapat membaca simbol peta dasar memakai arah mata angin serta menjelaskan peran norma tertulis dan aturan tidak tertulis menjaga ketertiban masyarakat.',
    'Latih membaca legenda peta sekolah/kabupaten serta membedakan contoh tata tertib tertulis dengan norma sopan santun adat.',
    'Menggunakan peta dasar dan memahami fungsi aturan sosial dalam kehidupan bermasyarakat.',
    ['Arah kanan–kiri dan denah kelas'],
    ['Simbol peta dan 4 arah mata angin terbaca tepat; contoh norma dijelaskan konsekuensinya'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '3' }
  ),
  m(
    'ipas-fb-s2-daur-hidup-pelestarian', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase B', 'Keterampilan Proses & Sains',
    'Daur Hidup Hewan, Metamorfosis, dan Pelestarian Lingkungan Sekitar',
    'Peserta didik dapat membandingkan tahapan metamorfosis sempurna vs tidak sempurna pada hewan serta merancang aksi sederhana menjaga habitat sekitar.',
    'Bandingkan siklus hidup kupu-kupu/katak vs belalang dan hubungkan rusaknya tahap tertentu dengan kelestarian ekosistem.',
    'Mengamati siklus hidup makhluk hidup dan merefleksikan peran siswa dalam melestarikan lingkungan.',
    ['Bagian tubuh tumbuhan dan kebutuhan hidup'],
    ['Diagram metamorfosis sempurna vs tidak sempurna tepat disertai usulan aksi pelestarian konkret'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ipas-fb-s1-tumbuhan-fotosintesis'], relatedTopicIds: ['ipas-fb-s1-tumbuhan-fotosintesis'], suggestedGrade: '3' }
  ),

  // 4B. IPAS SD FASE C (Kelas 5-6) — terpisah dari Fase B!
  m(
    'ipas-fc-s1-cahaya-bunyi-indra', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase C', 'Pemahaman IPAS (Sains)',
    'Sifat Cahaya, Bunyi, dan Cara Kerja Alat Indra (Mata & Telinga) Manusia',
    'Peserta didik dapat membuktikan sifat cahaya (merambat lurus, dipantulkan, dibiaskan) dan perambatan bunyi serta menghubungkannya dengan mekanisme melihat dan mendengar.',
    'Lakukan penyelidikan sederhana dengan cermin datar, pensil dalam gelas air, serta garpu tala/gelas suara.',
    'Menghubungkan sifat fisis gelombang cahaya dan bunyi dengan fungsi organ indra serta cara merawatnya.',
    ['Bentuk energi cahaya dan bunyi Fase B'],
    ['Menjelaskan sifat cahaya/bunyi di balik pengamatan nyata dan langkah menjaga kesehatan mata/telinga'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '5' }
  ),
  m(
    'ipas-fc-s1-ekosistem-rantai-makanan', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase C', 'Pemahaman IPAS (Sains)',
    'Ekosistem, Jaring-Jaring Makanan, dan Keseimbangan Alam Akibat Campur Tangan Manusia',
    'Peserta didik dapat menganalisis peran produsen, konsumen tingkat I–III, pengurai, dan memprediksi efek berantai bila satu populasi terganggu.',
    'Gunakan jaring makanan sawah atau danau untuk melacak dampak perburuan ular atau pencemaran limbah terhadap populasi lain.',
    'Memprediksi dinamika keseimbangan jaring-jaring makanan secara kausal.',
    ['Fotosintesis tumbuhan Fase B'],
    ['Rantai/jaring makanan berarah transfer energi tepat dan prediksi dampak populasi logis'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5' }
  ),
  m(
    'ipas-fc-s1-sistem-pencernaan-pernapasan', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase C', 'Pemahaman IPAS (Sains)',
    'Sistem Pernapasan, Pencernaan Manusia, dan Pola Hidup Sehat Bergizi Seimbang',
    'Peserta didik dapat menelusuri alur organ pernapasan dan pencernaan beserta fungsinya serta mengevaluasi risiko penyakit akibat pola makan atau udara tidak sehat.',
    'Urutan organ hidung–trakea–paru-paru dan mulut–lambung–usus beserta cara kerja diafragma dan enzim dasar.',
    'Menghubungkan mekanisme kerja organ tubuh dengan kebiasaan hidup sehat harian.',
    ['Kebutuhan nutrisi & pertumbuhan dasar'],
    ['Urutan organ serta fungsi utama tepat; saran pencegahan gangguan organ relevan'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5' }
  ),
  m(
    'ipas-fc-s1-magnet-listrik-teknologi', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase C', 'Pemahaman IPAS (Sains)',
    'Penerapan Gaya Magnet, Rangkaian Listrik Sederhana, dan Pemanfaatan Teknologi Ramah Lingkungan',
    'Peserta didik dapat membedakan rangkaian listrik seri dan paralel sederhana serta mengidentifikasi pemanfaatan magnet dalam teknologi harian.',
    'Rancang eksperimen baterai–kabel–lampu untuk menguji apa yang terjadi saat satu lampu pada rangkaian seri vs paralel diputus.',
    'Membedakan karakteristik rangkaian seri/paralel dan prinsip kerja gaya magnet dalam alat sederhana.',
    ['Gaya magnet & perubahan energi Fase B'],
    ['Perbandingan nyala/padam lampu pada rangkaian seri vs paralel dijelaskan benar'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '5' }
  ),
  m(
    'ipas-fc-s2-gerak-tubuh-tata-surya', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase C', 'Pemahaman IPAS (Sains)',
    'Sistem Gerak Manusia (Rangka–Otot–Sendi) serta Rotasi Bumi, Revolusi, dan Sistem Tata Surya',
    'Peserta didik dapat menjelaskan kerja sama rangka, sendi, dan otot pada gerak tubuh serta akibat rotasi dan revolusi Bumi–Bulan (siang-malam, musim, gerhana).',
    'Gunakan model senter–bola dunia untuk memvisualisasikan perbedaan rotasi bumi 24 jam vs revolusi 365 hari.',
    'Mengaitkan gejala alam siklus harian/tahunan dengan gerak relatif benda langit di tata surya.',
    ['Sifat cahaya & gerak dasar'],
    ['Membedakan dampak rotasi vs revolusi Bumi dan peran sendi engsel/peluru pada gerak'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ipas-fc-s1-cahaya-bunyi-indra'], relatedTopicIds: ['ipas-fc-s1-cahaya-bunyi-indra'], suggestedGrade: '6' }
  ),
  m(
    'ipas-fc-s2-kondisi-geografis-indonesia', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase C', 'Pemahaman IPAS (Sosial)',
    'Letak Geografis & Astronomis Indonesia sebagai Negara Maritim–Agraris serta Pelestarian SDA',
    'Peserta didik dapat membaca posisi Indonesia di antara dua benua dan dua samudra pada peta serta menganalisis potensi kekayaan alam darat dan laut Indonesia.',
    'Kaitkan jalur perdagangan silang dunia, keanekaragaman hayati tropis, dan tanggung jawab menjaga sumber daya terbarukan/tak terbarukan.',
    'Menganalisis keunggulan letak geografis Indonesia dan dampak eksploitasi SDA tanpa kendali.',
    ['Peta wilayah & bentang alam daerah Fase B'],
    ['Menjelaskan pengaruh letak silang terhadap iklim tropis, maritim, dan keragaman hayati'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '5' }
  ),
  m(
    'ipas-fc-s2-sejarah-perjuangan-globalisasi', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase C', 'Pemahaman IPAS (Sosial)',
    'Perjuangan Kemerdekaan Indonesia hingga Peran Indonesia dalam Kerja Sama Dunia & Globalisasi',
    'Peserta didik dapat merangkum rangkaian peristiwa penting menuju kemerdekaan Indonesia serta mengevaluasi peluang dan tantangan globalisasi di kehidupan pelajar.',
    'Tunjukkan keteladanan persatuan pemuda lintas daerah hingga proklamasi dan pentingnya sikap selektif menjaga budaya lokal di era digital.',
    'Mengambil nilai perjuangan persatuan bangsa untuk menghadapi dinamika interaksi global secara bijak.',
    ['Keragaman budaya daerah & aturan sosial Fase B'],
    ['Kronologi peristiwa proklamasi tepat dan analisis dampak globalisasi disertai contoh sikap nyata'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '6' }
  ),
  m(
    'ipas-fc-s2-krisis-iklim-proyek-aksi', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase C', 'Integrasi IPAS',
    'Krisis Energi, Perubahan Iklim, dan Proyek Mini Solusi Ramah Lingkungan Sekolah',
    'Peserta didik dapat menganalisis keterkaitan sampah plastik, emisi energi fosil, dan pemanasan global lalu merancang kampanye atau proyek aksi pelestarian di kelas.',
    'Hubungkan jejak konsumsi energi listrik harian dan pengelolaan 3R sampah dengan keseimbangan ekosistem global.',
    'Mengintegrasikan pemahaman sains ekosistem–energi dan perilaku sosial bertanggung jawab dalam aksi lingkungan.',
    ['Ekosistem & rangkaian energi listrik'],
    ['Rancangan aksi lingkungan menjelaskan masalah kausal lokal, langkah hemat energi/3R, dan indikator hasil'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ipas-fc-s1-ekosistem-rantai-makanan', 'ipas-fc-s1-magnet-listrik-teknologi'], relatedTopicIds: ['ipas-fc-s1-ekosistem-rantai-makanan'], suggestedGrade: '6' }
  ),

  // 4C. IPA SMP FASE D (Kelas 7-9)
  m(
    'ipa-fd-s1-cahaya-cermin-optik', 'IPA (Ilmu Pengetahuan Alam)', 'SMP/MTs', 'Fase D', 'Pemahaman IPA (Optik & Cahaya)',
    'Sifat Cahaya, Hukum Pemantulan Cermin Datar–Lengkung, Pembiasan Lensa, dan Alat Optik',
    'Peserta didik dapat membuktikan hukum pemantulan pada cermin datar terhadap garis normal serta membedakan pembentukan bayangan pada cermin cekung/cembung dan lensa mata.',
    'Ukur sudut datang dan sudut pantul selalu terhadap garis normal (90° terhadap bidang cermin), lalu bandingkan sifat bayangan nyata vs maya.',
    'Menyelidiki pemantulan dan pembiasan cahaya secara terukur menggunakan busur, cermin, dan senter.',
    ['Sifat dasar cahaya merambat lurus SD'],
    ['Sudut datang sama dengan sudut pantul terhadap garis normal dan lukisan bayangan cermin/lensa tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8' }
  ),
  m(
    'ipa-fd-s1-hakikat-pengukuran', 'IPA (Ilmu Pengetahuan Alam)', 'SMP/MTs', 'Fase D', 'Keterampilan Proses & Pengukuran',
    'Hakikat Ilmu Sains, Metode Ilmiah, Variabel Penelitian, dan Pengukuran Alat Baku',
    'Peserta didik dapat merancang penyelidikan ilmiah dengan variabel bebas, terikat, kontrol yang jelas serta membaca skala alat ukur baku (mistar, jangka sorong, neraca, gelas ukur).',
    'Latih membedakan besaran pokok–turunan SI dan membaca ketelitian skala utama + nonius/neraca secara presisi.',
    'Menerapkan prinsip kerja ilmiah terukur dan meminimalkan galat pembacaan alat laboratorium.',
    ['Pengukuran panjang, massa, volume dasar SD'],
    ['Penentuan variabel bebas/terikat tepat dan pembacaan hasil alat ukur sesuai satuan SI'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '7' }
  ),
  m(
    'ipa-fd-s1-zat-kalor-suhu', 'IPA (Ilmu Pengetahuan Alam)', 'SMP/MTs', 'Fase D', 'Pemahaman IPA (Fisika–Kimia)',
    'Partikel Zat, Massa Jenis (ρ = m/V), Suhu, Kalor, dan Pemuaian',
    'Peserta didik dapat menyelidiki perbedaan massa jenis benda tenggelam/mengapung, menghitung kalor Q = m·c·ΔT, dan menjelaskan penerapan pemuaian pada rel atau kabel.',
    'Gunakan model susunan partikel padat–cair–gas untuk menerangkan mengapa zat memuai ketika suhu naik.',
    'Menghubungkan model partikel zat dengan gejala massa jenis dan perpindahan kalor.',
    ['Wujud zat dan perubahan wujud SD'],
    ['Perhitungan ρ = m/V dan kalor Q akurat beserta identifikasi konduksi/konveksi/radiasi'],
    '1 (Ganjil)', 'pengembangan', { prasyaratTopicIds: ['ipa-fd-s1-hakikat-pengukuran'], relatedTopicIds: ['ipa-fd-s1-hakikat-pengukuran'], suggestedGrade: '7' }
  ),
  m(
    'ipa-fd-s1-gerak-gaya-newton', 'IPA (Ilmu Pengetahuan Alam)', 'SMP/MTs', 'Fase D', 'Pemahaman IPA (Fisika)',
    'Gerak Lurus, Kelajuan–Percepatan, Resultan Gaya, dan Hukum I–III Newton',
    'Peserta didik dapat menghitung kelajuan rata-rata benda dan menerapkan Hukum I, II (F = m·a), serta III Newton pada kejadian dorongan, pengereman, dan sabuk pengaman.',
    'Gambarkan diagram gaya segaris berlawanan arah sebelum menghitung percepatan benda dan menganalisis gaya aksi–reaksi.',
    'Menganalisis hubungan sebab–akibat antara resultan gaya dan perubahan gerak benda.',
    ['Kecepatan SD dan jenis gaya dasar'],
    ['Resultan gaya terhitung tepat tanda arahnya; Hukum Newton dijelaskan sesuai peristiwa nyata'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['ipa-fd-s1-hakikat-pengukuran'], relatedTopicIds: ['ipa-fd-s1-hakikat-pengukuran'], suggestedGrade: '7' }
  ),
  m(
    'ipa-fd-s2-klasifikasi-ekologi', 'IPA (Ilmu Pengetahuan Alam)', 'SMP/MTs', 'Fase D', 'Pemahaman IPA (Biologi)',
    'Struktur Sel, Klasifikasi Makhluk Hidup, Interaksi Ekosistem, & Dampak Pemanasan Global',
    'Peserta didik dapat menyusun kunci dikotomi sederhana untuk mengelompokkan spesimen lokal, membedakan bagian utama sel, dan mengevaluasi aliran energi serta emisi karbon.',
    'Latih pengamatan sel tumbuhan vs sel hewan beserta tata nama binomial, rantai makanan, dan mitigasi pencemaran.',
    'Menghubungkan organisasi kehidupan dari sel hingga interaksi ekosistem yang seimbang.',
    ['Ekosistem jaring makanan SD'],
    ['Membedakan sel tumbuhan vs hewan serta menyusun kunci dikotomi spesies lokal dengan akurat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '7' }
  ),
  m(
    'ipa-fd-s2-getaran-gelombang-bunyi', 'IPA (Ilmu Pengetahuan Alam)', 'SMP/MTs', 'Fase D', 'Pemahaman IPA (Fisika)',
    'Getaran, Gelombang (f, T, λ), Bunyi Resonan, serta Pemanfaatan Gelombang Ultrasonik',
    'Peserta didik dapat menghitung periode, frekuensi, dan cepat rambat gelombang (v = λ·f) serta menjelaskan pemantulan bunyi pada gaung, gema, dan sistem sonar.',
    'Kaitkan ayunan bandul dengan frekuensi getaran, perbedaan gelombang transversal vs longitudinal, dan pengukuran kedalaman laut.',
    'Mengukur besaran gelombang dan menerapkan prinsip resonansi serta pemantulan bunyi.',
    ['Sifat cahaya & gerak dasar'],
    ['Perhitungan f, T, v konsisten satuan SI dan contoh pemanfaatan bunyi pantul/sonar tepat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ipa-fd-s1-gerak-gaya-newton'], relatedTopicIds: ['ipa-fd-s1-gerak-gaya-newton'], suggestedGrade: '8' }
  ),
  m(
    'ipa-fd-s2-asam-basa-reaksi', 'IPA (Ilmu Pengetahuan Alam)', 'SMP/MTs', 'Fase D', 'Pemahaman IPA (Kimia)',
    'Unsur, Senyawa, Campuran (Pemisahan), Asam–Basa (pH), dan Reaksi Kimia Sehari-hari',
    'Peserta didik dapat merancang metode pemisahan campuran (filtrasi, destilasi, kromatografi) serta menguji sifat asam–basa bahan sekitar memakai indikator alami atau kertas lakmus.',
    'Bedakan perubahan fisika vs reaksi kimia (terbentuk endapan, gas, warna baru, atau kalor) dengan aturan keselamatan lab.',
    'Mengklasifikasikan materi murni vs campuran dan menguji derajat keasaman pH bahan harian.',
    ['Partikel zat & wujud benda Sem 1'],
    ['Metode pemisahan sesuai jenis campuran (ukuran partikel/titik didih) dan pembacaan pH akurat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['ipa-fd-s1-zat-kalor-suhu'], relatedTopicIds: ['ipa-fd-s1-zat-kalor-suhu'], suggestedGrade: '9' }
  ),
  m(
    'ipa-fd-s2-listrik-magnet-energi', 'IPA (Ilmu Pengetahuan Alam)', 'SMP/MTs', 'Fase D', 'Pemahaman IPA (Fisika)',
    'Listrik Statis, Rangkaian Listrik Hukum Ohm (V = I·R), Daya Listrik Rumah, dan Induksi Elektromagnetik',
    'Peserta didik dapat menghitung hambatan pengganti rangkaian seri–paralel, kuat arus Hukum Ohm, estimasi biaya energi listrik kWh rumah tangga, serta prinsip kerja trafo/generator.',
    'Gunakan tagihan/watt peralatan rumah tangga untuk mempraktikkan perhitungan daya P = V·I dan energi kWh nyata.',
    'Mengintegrasikan analisis rangkaian listrik terukur dengan efisiensi pemakaian energi elektromagnetik.',
    ['Rangkaian listrik dasar SD dan gaya gerak'],
    ['Arus, tegangan, dan biaya pemakaian listrik kWh dihitung akurat sesuai tarif contoh'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ipa-fd-s1-gerak-gaya-newton'], relatedTopicIds: ['ipa-fd-s1-gerak-gaya-newton'], suggestedGrade: '9' }
  ),

  // 4D. PROJEK IPAS SMK FASE E (Kelas 10 SMK) — terpisah dari IPA SMP & Fisika/Kimia/Biologi SMA!
  m(
    'projekipas-smk-s1-makhluk-ekologi-kerja', 'Projek IPAS (SMK)', 'SMK', 'Fase E', 'Menjelaskan Fenomena Secara Ilmiah',
    'Ekosistem Lingkungan Kerja, Pengelolaan Limbah Bengkel/Industri, dan Kesehatan Kerja',
    'Peserta didik dapat menganalisis jenis limbah padat/cair di lingkungan praktik kejuruan serta dampaknya terhadap keseimbangan ekosistem sekitar.',
    'Petakan komponen abiotik–biotik sekitar sekolah/bengkel dan rancangan pemilahan limbah berbahaya (B3) vs non-B3 secara aman.',
    'Menghubungkan konsep ekologi dengan tanggung jawab K3LH (Keselamatan, Kesehatan Kerja, dan Lingkungan Hidup).',
    ['Ekosistem dasar SMP'],
    ['Identifikasi sumber pencemar praktik kerja beserta prosedur mitigasi K3LH tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  m(
    'projekipas-smk-s1-zat-perubahan-produksi', 'Projek IPAS (SMK)', 'SMK', 'Fase E', 'Desain & Evaluasi Penyelidikan Ilmiah',
    'Karakteristik Zat, Pemisahan Campuran, Reaksi Korosi/Oksidasi, dan Pengolahan Bahan Baku',
    'Peserta didik dapat menyelidiki perubahan fisika dan kimia bahan produksi (mis. korosi logam atau fermentasi/emulsi bahan) serta pencegahannya.',
    'Uji laju korosi atau kelarutan bahan memakai kontrol variabel jelas sehingga dapat diterapkan pada pemeliharaan alat/bahan kejuruan.',
    'Merancang uji laboratorium sederhana terkait sifat material kerja dan pencegahannya.',
    ['Zat & reaksi kimia SMP'],
    ['Desain uji variabel terkontrol rapi dan rekomendasi perawatan material berbasis bukti'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'projekipas-smk-s1-energi-efisiensi-bengkel', 'Projek IPAS (SMK)', 'SMK', 'Fase E', 'Penerapan Energi & Perubahannya',
    'Audit Konsumsi Energi Listrik/Kalor Peralatan Praktik dan Sumber Energi Terbarukan Lokal',
    'Peserta didik dapat menghitung konsumsi energi listrik peralatan bengkel/lab dalam kWh serta merancang langkah penghematan atau integrasi panel surya skala kecil.',
    'Baca label spesifikasi daya (Watt) pada peralatan praktik lalu ukur perkiraan beban biaya bulanan dan opsi efisiensi operasional.',
    'Mengaudit efisiensi energi mesin/peralatan kejuruan dan mengevaluasi alternatif energi terbarukan.',
    ['Daya listrik & perubahan energi SMP'],
    ['Perhitungan audit kWh alat praktik akurat disertai usulan efisiensi yang terukur'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'projekipas-smk-s1-bumi-antariksa-mitigasi', 'Projek IPAS (SMK)', 'SMK', 'Fase E', 'Bumi, Iklim & Mitigasi',
    'Dinamika Litosfer–Iklim Ekstrem dan Prosedur Kesiapsiagaan Bencana di Lingkungan Sekolah/Industri',
    'Peserta didik dapat menganalisis risiko bencana hidrometeorologi atau geologi setempat dan memetakan jalur evakuasi aman di area gedung praktik.',
    'Gunakan peta denah kelas/bengkel untuk mengevaluasi titik kumpul, APAR, dan mitigasi risiko korsleting saat banjir/gempa.',
    'Mengaitkan fenomena kebumian dan cuaca dengan kesiapsiagaan keselamatan kerja.',
    ['Lapisan bumi & tata surya SMP'],
    ['Peta risiko bahaya area kerja lengkap dengan rute evakuasi aman'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'projekipas-smk-s2-konektivitas-ekonomi-kejuruan', 'Projek IPAS (SMK)', 'SMK', 'Fase E', 'Interaksi Sosial & Ruang',
    'Konektivitas Ruang Wilayah, Rantai Pasok Bahan Baku, dan Dinamika Pasar Kerja Lokal',
    'Peserta didik dapat melacak jalur distribusi bahan baku kejuruan dari daerah penghasil ke pusat usaha lokal serta faktor efisiensi transportasi dan pasar tenaga kerja.',
    'Analisis faktor jarak, ongkos logistik, kebutuhan pelanggan lokal, dan interaksi lembaga ekonomi di sekitar SMK.',
    'Memetakan interaksi keruangan dan peluang rantai pasok jasa/produk kejuruan.',
    ['Kegiatan ekonomi & wilayah SMP'],
    ['Bagan rantai pasok memuat asal bahan, saluran distribusi, dan analisis hambatan logistik'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'projekipas-smk-s2-literasi-ekonomi-umkm', 'Projek IPAS (SMK)', 'SMK', 'Fase E', 'Perilaku Ekonomi & Kesejahteraan',
    'Permintaan–Penawaran, Inflasi Harga Bahan, dan Manajemen Keuangan Usaha Mikro Kejuruan',
    'Peserta didik dapat menganalisis dampak kenaikan harga bahan pokok/input terhadap penentuan harga jual jasa/produk bengkel tanpa mengurangi kualitas.',
    'Hubungkan prinsip kelangkaan bahan baku, elastisitas sederhana, dan pencatatan arus kas masuk–keluar proyek usaha siswa.',
    'Mengambil keputusan penentuan harga dan pengelolaan arus kas usaha kecil berbasis kondisi pasar.',
    ['Konektivitas ruang & rantai pasok'],
    ['Simulasi respons penyesuaian harga/porsi saat harga input naik disertai kalkulasi kas'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['projekipas-smk-s2-konektivitas-ekonomi-kejuruan'], relatedTopicIds: ['projekipas-smk-s2-konektivitas-ekonomi-kejuruan'], suggestedGrade: '10' }
  ),
  m(
    'projekipas-smk-s2-komunikasi-sosial-etika-profesi', 'Projek IPAS (SMK)', 'SMK', 'Fase E', 'Komunikasi & Dinamika Sosial',
    'Lembaga Sosial, Kerja Sama Tim Lintas Peran, dan Pencegahan Konflik di Tempat Kerja',
    'Peserta didik dapat mengidentifikasi faktor pemicu miskomunikasi di tim kerja/bengkel serta merancang aturan resolusi konflik dan etika kerja kolaboratif.',
    'Simulasikan pembagian tugas tim proyek dan mekanisme umpan balik konstruktif tanpa perundungan di ruang kerja.',
    'Mengembangkan interaksi sosial yang harmonis dan profesional di lingkungan kerja heterogen.',
    ['Interaksi sosial dasar SMP'],
    ['Studi kasus miskomunikasi tim dianalisis akar penyebabnya disertai solusi komunikasi konstruktif'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'projekipas-smk-s2-proyek-terpadu-ipas', 'Projek IPAS (SMK)', 'SMK', 'Fase E', 'Integrasi Ilmiah & Sosial',
    'Merancang & Menguji Proyek Mini IPAS Terpadu (Teknologi Tepat Guna / Pengolahan Ramah Lingkungan)',
    'Peserta didik dapat memadukan penyelidikan aspek fisis/kimia/ekologi dengan kelayakan sosial-biaya produk/prototipe tepat guna skala sekolah.',
    'Bimbing penyusunan poster/laporan proyek: rumusan masalah sosial-lingkungan, uji prototipe sains terukur, estimasi biaya, dan presentasi hasil.',
    'Mengintegrasikan metode penyelidikan IPAS sains dan sosial dalam satu karya proyek kejuruan.',
    ['Audit energi, sifat zat, dan ekonomi UMKM'],
    ['Laporan proyek menyertakan data hasil uji fisis/lingkungan nyata dan analisis kelayakan pengguna'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['projekipas-smk-s1-energi-efisiensi-bengkel', 'projekipas-smk-s2-literasi-ekonomi-umkm'], relatedTopicIds: ['projekipas-smk-s1-energi-efisiensi-bengkel'], suggestedGrade: '10' }
  ),

  // 4E. FISIKA SMA (Fase E vs Fase F)
  m(
    'fis-fe-s1-pengukuran-ketidakpastian', 'Fisika', 'SMA/MA', 'Fase E', 'Pengukuran & Keterampilan Proses',
    'Pengukuran Presisi, Angka Penting, Notasi Ilmiah, dan Ketidakpastian Pengukuran Tunggal/Berulang',
    'Peserta didik dapat membandingkan ketelitian jangka sorong dan mikrometer sekrup serta melaporkan hasil ukur lengkap dengan ketidakpastian mutlak/relatif dan angka penting.',
    'Kesalahan sistematik vs acak, cara menentukan nilai tengah ± Δx dari 5 data pengukuran berulang, serta aturan penulisan angka penting.',
    'Mengolah data eksperimen dengan kaidah ketidakpastian dan ketelitian instrumen laboratorium.',
    ['Besaran pokok & alat ukur SMP'],
    ['Pembacaan mikrometer sekrup dan laporan hasil ukur x ± Δx beserta angka penting tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  m(
    'fis-fe-s1-energi-terbarukan', 'Fisika', 'SMA/MA', 'Fase E', 'Energi & Pemodelan Fisis',
    'Konversi Energi, Efisiensi Mesin/Pembangkit, dan Potensi Energi Terbarukan Nusantara',
    'Peserta didik dapat menghitung efisiensi konversi energi mekanik ke listrik serta menganalisis kelayakan potensi energi surya, angin, air, atau panas bumi di daerahnya.',
    'Hitung persentase efisiensi η = (E_keluar / E_masuk) × 100%, energi terbuang menjadi panas, dan studi banding pembangkit lokal.',
    'Mengevaluasi hukum kekekalan energi serta kelayakan teknologi energi terbarukan berbasis data lokal.',
    ['Usaha dan perubahan bentuk energi SMP'],
    ['Perhitungan efisiensi energi akurat dan rekomendasi pemilihan energi terbarukan didukung alasan fisis'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'fis-fe-s1-pemanasan-global-radiasi', 'Fisika', 'SMA/MA', 'Fase E', 'Fisika Lingkungan',
    'Mekanisme Fisis Efek Rumah Kaca, Albedo Permukaan, dan Mitigasi Pemanasan Global',
    'Peserta didik dapat menjelaskan mekanisme penyerapan gelombang panjang inframerah oleh gas rumah kaca serta membandingkan pengaruh albedo permukaan terhadap suhu bumi.',
    'Bedakan radiasi gelombang pendek matahari yang masuk vs radiasi inframerah bumi yang tertahan di atmosfer.',
    'Menganalisis krisis iklim dari sudut pandang perpindahan kalor radiasi dan kesetimbangan termal bumi.',
    ['Kalor, radiasi, dan ekosistem SMP'],
    ['Diagram alur kesetimbangan radiasi tepat membedakan panjang gelombang masuk vs keluar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'fis-fe-s1-gerak-lurus-parabola', 'Fisika', 'SMA/MA', 'Fase E', 'Mekanika Dasar',
    'Kinematika Gerak Lurus (GLB–GLBB) dalam Grafik v–t dan Penerapannya pada Keselamatan Berkendara',
    'Peserta didik dapat menafsirkan gradien dan luas area di bawah grafik v–t serta menghitung jarak pengereman aman kendaraan saat terjadi hambatan reaksi.',
    'Kontraskan jarak reaksi saat kecepatan konstan (GLB) dengan jarak pengereman perlambatan tetap (GLBB) untuk menanamkan fisika keselamatan lalu lintas.',
    'Menghubungkan representasi grafik kinematika v–t dan s–t dengan prediksi jarak tempuh nyata.',
    ['Gerak lurus dan gaya SMP'],
    ['Luas grafik v–t dihitung tepat sebagai perpindahan; simulasi jarak henti kendaraan logis'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['fis-fe-s1-pengukuran-ketidakpastian'], relatedTopicIds: ['fis-fe-s1-pengukuran-ketidakpastian'], suggestedGrade: '10' }
  ),
  m(
    'fis-fe-s2-hukum-newton-gesek', 'Fisika', 'SMA/MA', 'Fase E', 'Dinamika Dasar',
    'Diagram Benda Bebas, Hukum Newton, Gaya Normal, dan Gaya Gesek Statis–Kinetis',
    'Peserta didik dapat menggambar diagram gaya bebas pada bidang miring maupun benda bertali dan menghitung percepatan serta syarat benda tepat akan bergerak.',
    'Bedakan gaya gesek statis maksimum μ_s·N dengan gesek kinetis μ_k·N serta uraian komponen berat m·g·sinθ dan m·g·cosθ.',
    'Menguraikan gaya dua dimensi menjadi persamaan dinamika F = m·a secara sistematis.',
    ['Kinematika GLBB & vektor dasar'],
    ['Diagram gaya bebas lengkap sebelum persamaan gerak; uraian sin/cos bidang miring tepat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['fis-fe-s1-gerak-lurus-parabola'], relatedTopicIds: ['fis-fe-s1-gerak-lurus-parabola'], suggestedGrade: '10' }
  ),
  m(
    'fis-fe-s2-usaha-momentum-dasar', 'Fisika', 'SMA/MA', 'Fase E', 'Mekanika & Energi',
    'Hubungan Usaha–Energi Kinetik, Kekekalan Energi Mekanik, serta Impuls pada Pengaman Benturan',
    'Peserta didik dapat menghitung perubahan energi mekanik di lintasan lengkung dan menjelaskan fungsi kantong udara/helm memperpanjang waktu kontak Δt untuk memperkecil gaya F.',
    'Gunakan konsep I = F·Δt = Δp untuk mengaitkan keselamatan helm/airbag dengan pengurangan gaya puncak tumbukan.',
    'Menerapkan prinsip energi dan impuls untuk menganalisis gerak dan sistem pengaman mekanis.',
    ['Hukum Newton & GLBB'],
    ['Kekekalan energi mekanik dihitung akurat dan penjelasan fungsi Δt pada helm tepat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['fis-fe-s2-hukum-newton-gesek'], relatedTopicIds: ['fis-fe-s2-hukum-newton-gesek'], suggestedGrade: '10' }
  ),
  m(
    'fis-fe-s2-fluida-statis-dasar', 'Fisika', 'SMA/MA', 'Fase E', 'Mekanika Fluida',
    'Tekanan Hidrostatis, Hukum Pascal pada Dongkrak Hidrolik, dan Gaya Apung Archimedes',
    'Peserta didik dapat menerapkan prinsip bejana berhubungan dan Hukum Pascal untuk menghitung keuntungan mekanis hidrolik serta memprediksi posisi benda tercelup berdasarkan massa jenis.',
    'Tekankan kedalaman h diukur dari permukaan bebas zat cair, bukan dari dasar tangki.',
    'Memecahkan masalah keseimbangan dan perbesaran gaya melalui sifat fluida diam.',
    ['Massa jenis dan gaya SMP'],
    ['Tekanan hidrostatis memakai kedalaman h benar; perbandingan luas penampang hidrolik tepat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'fis-fe-s2-eksperimen-data-proyek', 'Fisika', 'SMA/MA', 'Fase E', 'Integrasi Keterampilan Proses',
    'Proyek Penyelidikan Mini Fisika: Pengolahan Grafik Linearitas Data & Pengendalian Galat',
    'Peserta didik dapat merancang eksperimen fisika sederhana (mis. ayunan pegas atau bidang miring), memplot grafik hubungan variabel, dan menarik simpulan keterbatasan eksperimen.',
    'Latih teknik melinierkan hubungan kuadratik dan mengevaluasi mengapa garis tren eksperimen dapat menyimpang dari teori ideal.',
    'Mengintegrasikan kemampuan desain eksperimen, analisis ketidakpastian, dan pelaporan ilmiah.',
    ['Ketidakpastian pengukuran & dinamika'],
    ['Laporan uji memuat data pengukuran berulang, grafik hubungan, serta analisis sumber galat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['fis-fe-s1-pengukuran-ketidakpastian'], relatedTopicIds: ['fis-fe-s1-pengukuran-ketidakpastian'], suggestedGrade: '10' }
  ),
  // Fisika Fase F
  m(
    'fis-ff-s1-gerak-melingkar-rotasi', 'Fisika', 'SMA/MA', 'Fase F', 'Mekanika Lanjutan',
    'Kinematika 2D (Parabola–Melingkar), Dinamika Rotasi, Torka (τ), dan Kesetimbangan Benda Tegar',
    'Peserta didik dapat memecahkan analisis komponen gerak parabola, menentukan momen gaya terhadap poros, dan menghitung gaya reaksi tumpuan pada kesetimbangan tangga/batang.',
    'Syarat setimbang translasi (ΣF = 0) dan rotasi (Στ = 0) lengkap dengan penentuan lengan momen tegak lurus.',
    'Menganalisis gerak peluru 2D dan kestabilan struktur benda tegar terhadap poros putar.',
    ['Vektor, kinematika & Hukum Newton Fase E'],
    ['Titik poros dipilih tepat sehingga Στ = 0 menghasilkan gaya reaksi batang akurat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  m(
    'fis-ff-s1-fluida-dinamis-termo', 'Fisika', 'SMA/MA', 'Fase F', 'Fluida & Termodinamika',
    'Persamaan Kontinuitas, Asas Bernoulli, serta Hukum I & II Termodinamika pada Mesin Kalor',
    'Peserta didik dapat menerapkan asas Bernoulli pada venturimeter/gaya angkat sayap dan menganalisis grafik P–V siklus termodinamika (isobarik, isotermal, adiabatik) mesin kalor.',
    'Hubungkan penyempitan pipa terhadap peningkatan laju aliran dan penurunan tekanan statis serta perhitungan usaha W = P·ΔV.',
    'Memodelkan aliran fluida bergerak dan efisiensi kerja gas dalam mesin kalor/pendingin.',
    ['Fluida statis & kalor Fase E'],
    ['Kecepatan aliran & beda tekanan Bernoulli tepat; usaha siklus grafik P–V terhitung benar'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  m(
    'fis-ff-s1-gelombang-cahaya-interferensi', 'Fisika', 'SMA/MA', 'Fase F', 'Gelombang & Optik Fisis',
    'Gelombang Berjalan–Stasioner, Efek Doppler Bunyi, serta Difraksi dan Interferensi Cahaya',
    'Peserta didik dapat menuliskan persamaan simpangan gelombang berjalan, menentukan pergeseran frekuensi Efek Doppler, dan menghitung jarak pita terang celah ganda/kisi.',
    'Bedakan tanda kecepatan sumber/pendengar mendekat vs menjauh pada Efek Doppler serta orde terang–gelap interferensi Young.',
    'Menganalisis sifat gelombang mekanik dan sifat gelombang cahaya (interferensi/difraksi).',
    ['Gelombang dasar & optik SMP'],
    ['Tanda +/- Efek Doppler tepat; persamaan d·sinθ = m·λ diselesaikan benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'fis-ff-s1-listrik-statis-dc', 'Fisika', 'SMA/MA', 'Fase F', 'Kelistrikan',
    'Medan Listrik, Kapasitor Pelat Sejajar, dan Analisis Rangkaian Arus Searah Hukum Kirchhoff',
    'Peserta didik dapat menentukan resultan kuat medan listrik beberapa muatan, kapasitas kapasitor gabungan, serta menyelesaikan arus cabang multi-loop memakai Hukum I & II Kirchhoff.',
    'Latih konsistensi arah loop dan tanda GGL dalam menyelesaikan dua loop rangkaian DC.',
    'Menghitung besaran elektrostatika dan arus cabang kompleks dalam rangkaian multiloop.',
    ['Rangkaian seri–paralel Hukum Ohm SMP'],
    ['Kuat medan vektor & loop Hukum II Kirchhoff tersusun konsisten menghasilkan arus cabang benar'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '12' }
  ),
  m(
    'fis-ff-s2-magnet-induksi-ac', 'Fisika', 'SMA/MA', 'Fase F', 'Elektromagnetisme',
    'Gaya Lorentz, Hukum Faraday–Lenz Induksi Elektromagnetik, dan Impedansi Rangkaian RLC Arus Bolak-Balik',
    'Peserta didik dapat menentukan arah gaya magnetik pada muatan/kawat berarus, besar GGL induksi akibat perubahan fluks, dan kondisi resonansi pada rangkaian R–L–C seri.',
    'Terapkan kaidah tangan kanan arah B, v, F, hukum Lenz arah arus melawan perubahan fluks, dan diagram fasor Z = √(R² + (X_L − X_C)²).',
    'Menghubungkan medan magnet, pembangkitan tegangan AC, dan respons frekuensi rangkaian RLC.',
    ['Rangkaian DC Kirchhoff Sem 1'],
    ['Arah gaya Lorentz & arus induksi Lenz konsisten; frekuensi resonansi f = 1/(2π√LC) terhitung benar'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['fis-ff-s1-listrik-statis-dc'], relatedTopicIds: ['fis-ff-s1-listrik-statis-dc'], suggestedGrade: '12' }
  ),
  m(
    'fis-ff-s2-kuantum-fotoelektrik', 'Fisika', 'SMA/MA', 'Fase F', 'Fisika Modern',
    'Radiasi Benda Hitam, Efek Fotolistrik (E = h·f), Dualisme Gelombang–Partikel, dan Fisika Inti',
    'Peserta didik dapat menjelaskan mengapa intensitas saja tidak dapat melepaskan elektron tanpa melampaui frekuensi ambang serta menghitung energi ikat inti dan waktu paruh peluruhan.',
    'Kontraskan kegagalan fisika klasik terhadap efek fotolistrik dengan kuanta energi Planck–Einstein dan reaksi fisi/fusi.',
    'Memahami konsep dasar fisika kuantum dan aplikasi radioisotop/energi nuklir secara aman.',
    ['Gelombang cahaya & dasar listrik'],
    ['Grafik energi kinetik maks vs frekuensi (K_max = hf − W₀) ditafsir tepat; peluruhan waktu paruh akurat'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['fis-ff-s1-gelombang-cahaya-interferensi'], relatedTopicIds: ['fis-ff-s1-gelombang-cahaya-interferensi'], suggestedGrade: '12' }
  ),
  m(
    'fis-ff-s2-relativitas-semikonduktor', 'Fisika', 'SMA/MA', 'Fase F', 'Fisika Modern & Teknologi',
    'Postulat Relativitas Khusus (Dilatasi Waktu) serta Prinsip Dioda–Transistor & Komunikasi Digital',
    'Peserta didik dapat membandingkan mekanika klasik terhadap postulat relativitas Einstein pada kelajuan mendekati c serta menjelaskan transmisi sinyal analog vs digital pada perangkat elektronik.',
    'Fokus pada makna kesetaraan massa-energi E₀ = mc² dan peran dioda penyearah serta gerbang logika sederhana pada teknologi informasi.',
    'Menghubungkan gagasan fisika modern dengan fondasi perangkat keras teknologi komunikasi digital.',
    ['Listrik AC & Efek Fotolistrik'],
    ['Perbedaan sinyal analog vs digital dan dampak faktor Lorentz γ dijelaskan konseptual benar'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12' }
  ),
  m(
    'fis-ff-s2-sintesis-teknologi-energi', 'Fisika', 'SMA/MA', 'Fase F', 'Integrasi Kinerja Fisika',
    'Evaluasi Solusi Rekayasa Fisika: Integrasi Sensor, Rangkaian Daya, dan Efisiensi Konversi Energi',
    'Peserta didik dapat merancang rancangan sistem sederhana (mis. lampu otomatis LDR/panel surya mini atau penukar kalor sederhana) menggunakan perhitungan fisis terpadu.',
    'Uji hubungan antara spesifikasi sumber daya, hambatan komponen, dan efisiensi kerja keseluruhan prototipe.',
    'Mengintegrasikan prinsip elektromagnetik, energi, dan analisis ketidakpastian data pada rancangan rekayasa.',
    ['Energi terbarukan, Kirchhoff, & Induksi'],
    ['Rancangan disertai diagram rangkaian/fisis lengkap dengan hitungan daya dan efisiensi masuk akal'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['fis-ff-s1-listrik-statis-dc', 'fis-ff-s2-magnet-induksi-ac'], relatedTopicIds: ['fis-ff-s2-magnet-induksi-ac'], suggestedGrade: '12' }
  ),

  // 4F. KIMIA SMA (Fase E vs Fase F)
  m(
    'kim-fe-s1-kimia-hijau-lab', 'Kimia', 'SMA/MA', 'Fase E', 'Kimia Hijau & Hakikat Kimia',
    'Prinsip Kimia Hijau dalam Kehidupan Sehari-hari dan Keselamatan Laboratorium (MSDS)',
    'Peserta didik dapat mengidentifikasi simbol bahaya bahan kimia serta mengevaluasi praktik rumah tangga atau industri kecil berdasarkan 12 prinsip Kimia Hijau.',
    'Hubungkan prinsip pencegahan limbah, penggunaan katalis/pelarut aman, dan pencegahan kecelakaan bahan korosif/mudah terbakar.',
    'Menilai dampak proses kimia terhadap lingkungan dan menerapkan prosedur aman di laboratorium.',
    ['Perubahan wujud & reaksi kimia dasar SMP'],
    ['Identifikasi simbol MSDS akurat dan solusi penggantian proses mencemari selaras prinsip Kimia Hijau'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  m(
    'kim-fe-s1-atom-konfigurasi-spu', 'Kimia', 'SMA/MA', 'Fase E', 'Struktur Atom',
    'Perkembangan Model Atom, Konfigurasi Elektron, dan Letak Unsur dalam Tabel Periodik',
    'Peserta didik dapat menentukan jumlah proton, elektron, neutron dari notasi unsur serta menghubungkan elektron valensi dengan golongan–periode dan sifat keperiodikan.',
    'Tren jari-jari atom, energi ionisasi, dan elektronegativitas sepanjang golongan dan periode.',
    'Memprediksi karakter logam/nonlogam dan kecenderungan reaktivitas unsur dari konfigurasi elektron.',
    ['Partikel materi SMP'],
    ['Konfigurasi kulit/subkulit elektron benar dan penentuan golongan–periode tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'kim-fe-s1-ikatan-kimia', 'Kimia', 'SMA/MA', 'Fase E', 'Ikatan Kimia',
    'Ikatan Ion, Kovalen (Tunggal–Rangkap), Kovalen Polar–Nonpolar, dan Sifat Fisis Senyawa',
    'Peserta didik dapat menggambarkan struktur Lewis pembentukan ikatan ion vs kovalen serta menjelaskan perbedaan titik leleh dan daya hantar listrik garam vs senyawa kovalen.',
    'Kaitkan serah terima elektron logam–nonlogam (ion) dengan pemakaian bersama pasangan elektron antar-nonlogam (kovalen).',
    'Menghubungkan jenis ikatan antaratom dengan sifat makroskopis kelarutan dan konduktivitas senyawa.',
    ['Konfigurasi elektron & elektron valensi'],
    ['Struktur Lewis memenuhi kaidah oktet/duplet dan alasan titik leleh tinggi garam dijelaskan tepat'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['kim-fe-s1-atom-konfigurasi-spu'], relatedTopicIds: ['kim-fe-s1-atom-konfigurasi-spu'], suggestedGrade: '10' }
  ),
  m(
    'kim-fe-s1-tatanama-persamaan', 'Kimia', 'SMA/MA', 'Fase E', 'Bahasa & Stoikiometri Awal',
    'Tata Nama Senyawa Biner/Poliatomik Sederhana dan Penyetaraan Persamaan Reaksi Kimia',
    'Peserta didik dapat menamai senyawa ion/kovalen sesuai aturan IUPAC serta menyetarakan koefisien reaksi kimia berdasarkan Hukum Kekekalan Massa Lavoisier.',
    'Bandingkan penggunaan awalan angka Yunani (kovalen nonlogam) vs muatan kation–anion tetap tanpa awalan (ionik) dan langkah setara atom kiri = kanan.',
    'Menuliskan persamaan reaksi kimia yang seimbang atomnya untuk reaksi sehari-hari.',
    ['Ikatan ion dan kovalen'],
    ['Penamaan senyawa tepat dan koefisien reaksi setara dengan jumlah atom sama di kedua sisi'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['kim-fe-s1-ikatan-kimia'], relatedTopicIds: ['kim-fe-s1-ikatan-kimia'], suggestedGrade: '10' }
  ),
  m(
    'kim-fe-s2-hukum-dasar-mol', 'Kimia', 'SMA/MA', 'Fase E', 'Stoikiometri Dasar',
    'Hukum Dasar Kimia (Lavoisier, Proust, Dalton, Gay-Lussac, Avogadro) dan Konsep Mol (n = m/Mr)',
    'Peserta didik dapat mengonversi massa, jumlah partikel, dan volume gas STP menggunakan konsep mol serta membuktikan perbandingan massa tetap senyawa.',
    'Gunakan jembatan mol (Massa ↔ Mol ↔ Volume Gas STP ↔ Jumlah Partikel) untuk menyusun langkah konversi anti-tertukar.',
    'Menghubungkan ukuran makroskopis massa zat dengan hitungan submikroskopis mol partikel.',
    ['Penyetaraan reaksi & massa atom relatif Ar/Mr'],
    ['Konversi mol ke massa/volume gas tepat dan hukum perbandingan tetap diterapkan benar'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['kim-fe-s1-tatanama-persamaan'], relatedTopicIds: ['kim-fe-s1-tatanama-persamaan'], suggestedGrade: '10' }
  ),
  m(
    'kim-fe-s2-rumus-empiris-pereaksi', 'Kimia', 'SMA/MA', 'Fase E', 'Stoikiometri Terapan',
    'Rumus Empiris–Molekul, Kadar Zat, dan Penentuan Pereaksi Pembatas dalam Reaksi',
    'Peserta didik dapat menentukan rumus empiris dari persentase massa unsur serta mengidentifikasi pereaksi mana yang habis lebih dulu pada campuran dua reaktan.',
    'Gunakan perbandingan mol awal dibagi koefisien (tabel MRS: Mula-mula, Reaksi, Sisa) untuk menemukan pereaksi pembatas.',
    'Menentukan hasil maksimum produk dan sisa bahan pada stoikiometri reaksi nyata.',
    ['Konsep mol dan persamaan reaksi setara'],
    ['Tabel MRS disusun tepat menentukan pereaksi habis dan massa produk terhitung akurat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['kim-fe-s2-hukum-dasar-mol'], relatedTopicIds: ['kim-fe-s2-hukum-dasar-mol'], suggestedGrade: '10' }
  ),
  m(
    'kim-fe-s2-elektrolit-redoks-awal', 'Kimia', 'SMA/MA', 'Fase E', 'Reaksi dalam Larutan',
    'Daya Hantar Listrik Larutan Elektrolit–Nonelektrolit dan Pengenalan Bilangan Oksidasi (Redoks Awal)',
    'Peserta didik dapat membedakan larutan elektrolit kuat, lemah, dan nonelektrolit dari nyala lampu/gelembung uji serta menentukan kenaikan/penurunan bilangan oksidasi.',
    'Hubungkan adanya ion bergerak bebas dengan ikatan ionik/kovalen polar serta aturan penetapan biloks unsur.',
    'Mengaitkan struktur ion dalam air dengan konduktivitas listrik serta transfer elektron dasar.',
    ['Ikatan ion/kovalen dan tata nama senyawa'],
    ['Klasifikasi elektrolit berdasar pengamatan uji tepat; oksidator dan reduktor teridentifikasi benar'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['kim-fe-s1-ikatan-kimia'], relatedTopicIds: ['kim-fe-s1-ikatan-kimia'], suggestedGrade: '10' }
  ),
  m(
    'kim-fe-s2-hidrokarbon-kimia-hijau', 'Kimia', 'SMA/MA', 'Fase E', 'Kimia Organik Awal',
    'Kekhasan Atom Karbon, Alkana–Alkena–Alkuna, dan Dampak Pembakaran Bahan Bakar terhadap Prinsip Hijau',
    'Peserta didik dapat menggambarkan isomer rantai hidrokarbon sederhana serta membandingkan produk pembakaran sempurna vs tak sempurna (CO/jelaga) dari sisi Kimia Hijau.',
    'Tekankan valensi 4 atom karbon membentuk rantai lurus/cabang serta urgensi transisi bahan bakar bersih.',
    'Menghubungkan struktur molekul hidrokarbon dengan sifat pembakaran dan implikasi ekologisnya.',
    ['Ikatan kovalen & prinsip Kimia Hijau'],
    ['Struktur/tatanama isomer alkana sederhana tepat dan reaksi pembakaran sempurna vs tidak sempurna dibedakan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['kim-fe-s1-kimia-hijau-lab', 'kim-fe-s1-ikatan-kimia'], relatedTopicIds: ['kim-fe-s1-kimia-hijau-lab'], suggestedGrade: '10' }
  ),
  // Kimia Fase F
  m(
    'kim-ff-s1-termokimia-entalpi', 'Kimia', 'SMA/MA', 'Fase F', 'Energetika Kimia',
    'Reaksi Eksoterm–Endoterm, Kalorimetri, Hukum Hess, dan Energi Ikatan (ΔH)',
    'Peserta didik dapat menghitung perubahan entalpi reaksi dari data kalorimeter, diagram tingkat energi Hukum Hess, serta selisih energi pemutusan–pembentukan ikatan.',
    'Pastikan ketelitian tanda negatif (eksoterm, melepas kalor ke lingkungan) vs positif (endoterm) serta aturan membalik/mengali persamaan termokimia.',
    'Menghitung perubahan kalor reaksi kimia memakai metode termokimia tidak langsung.',
    ['Stoikiometri mol Fase E'],
    ['Tanda ΔH eksoterm vs endoterm konsisten; kombinasi Hukum Hess tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'kim-ff-s1-laju-kesetimbangan', 'Kimia', 'SMA/MA', 'Fase F', 'Dinamika Reaksi',
    'Laju Reaksi (Teori Tumbukan & Orde Reaksi) serta Pergeseran Kesetimbangan Asas Le Chatelier',
    'Peserta didik dapat menentukan persamaan orde reaksi dari data laju percobaan dan memprediksi pergeseran kesetimbangan (suhu, tekanan, konsentrasi) pada proses Haber-Bosch.',
    'Hubungkan energi aktivasi katalis pada grafik energi reaksi dengan efisiensi sintesis industri amonia/asam sulfat.',
    'Mengendalikan laju reaksi dan kondisi optimal kesetimbangan kimia.',
    ['Termokimia & stoikiometri'],
    ['Penentuan orde reaksi dari data tabel benar; prediksi pergeseran kesetimbangan saat T/P diubah tepat'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  m(
    'kim-ff-s1-asam-basa-titrasi', 'Kimia', 'SMA/MA', 'Fase F', 'Kimia Larutan',
    'Teori Asam–Basa (Arrhenius, Brønsted-Lowry, Lewis), Perhitungan pH, dan Titrasi Asam–Basa',
    'Peserta didik dapat menghitung pH larutan asam–basa kuat maupun lemah serta menentukan konsentrasi sampel cuka/basa dari kurva dan volume titik ekuivalen titrasi.',
    'Bedakan pengionan sempurna asam kuat vs kesetimbangan Ka/Kb asam lemah dan pilih indikator pH mendekati titik ekuivalen.',
    'Menganalisis kekuatan asam–basa secara kuantitatif melalui pH dan teknik volumetri titrasi.',
    ['Konsep mol & kesetimbangan kimia'],
    ['Perhitungan pH sebelum/saat ekuivalen titrasi akurat dan pasangan asam-basa konjugasi tepat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  m(
    'kim-ff-s1-penyangga-hidrolisis-ksp', 'Kimia', 'SMA/MA', 'Fase F', 'Kimia Larutan Lanjutan',
    'Larutan Penyangga (Buffer) dalam Darah/Pangan, Hidrolisis Garam, dan Kelarutan (Ksp)',
    'Peserta didik dapat menghitung pH garam terhidrolisis dan sistem buffer setelah penambahan sedikit asam/basa serta memprediksi pengendapan memakai Qsp vs Ksp.',
    'Jelaskan cara membedakan campuran asam–basa yang menghasilkan penyangga vs hidrolisis tepat habis bereaksi.',
    'Mengontrol kestabilan pH biologis/industri dan meramalkan terbentuknya endapan garam sukar larut.',
    ['Perhitungan pH & titrasi asam-basa'],
    ['Jenis hidrolisis vs penyangga teridentifikasi tepat dari mol sisa reaksi'],
    '1 (Ganjil)', 'pendalaman', { prasyaratTopicIds: ['kim-ff-s1-asam-basa-titrasi'], relatedTopicIds: ['kim-ff-s1-asam-basa-titrasi'], suggestedGrade: '11' }
  ),
  m(
    'kim-ff-s2-sifat-koligatif', 'Kimia', 'SMA/MA', 'Fase F', 'Kimia Larutan',
    'Sifat Koligatif Larutan (Penurunan Tekanan Uap, ΔTb, ΔTf, Tekanan Osmotik) & Faktor van’t Hoff',
    'Peserta didik dapat menghitung perubahan titik didih, titik beku, dan tekanan osmotik larutan elektrolit maupun nonelektrolit pada pengawetan pangan, infus medis, dan cairan antibeku.',
    'Perhatikan pemakaian satuan molalitas (m) untuk ΔTb/ΔTf vs molaritas (M) untuk π serta nilai i elektrolit.',
    'Mengaitkan konsentrasi partikel terlarut terhadap perubahan sifat fisis pelarut murni.',
    ['Stoikiometri larutan & elektrolit Fase E'],
    ['Perbedaan rumus nonelektrolit vs elektrolit (faktor i) terhitung benar sesuai satuan m atau M'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '12' }
  ),
  m(
    'kim-ff-s2-elektrokimia-volta-elektrolisis', 'Kimia', 'SMA/MA', 'Fase F', 'Elektrokimia',
    'Penyetaraan Reaksi Redoks, Sel Volta (Potensial E°sel), Korosi, dan Hukum Faraday Elektrolisis',
    'Peserta didik dapat merancang sel Volta menggunakan deret Volta, menghitung E°sel, serta menentukan massa logam terendapkan pada elektrolisis memakai Hukum Faraday.',
    'Kontraskan katoda–anoda pada sel Volta (spontan, KPAN) dengan sel Elektrolisis (butuh listrik luar, KNAP) serta perlindungan katodik besi.',
    'Mengkuantifikasi pembangkitan energi listrik kimia dan pelapisan logam industri secara stoikiometris.',
    ['Bilangan oksidasi & stoikiometri mol'],
    ['E°sel spontan bernilai positif; massa endapan logam Hukum Faraday dihitung tepat'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12' }
  ),
  m(
    'kim-ff-s2-gugus-fungsi-organik', 'Kimia', 'SMA/MA', 'Fase F', 'Kimia Organik',
    'Gugus Fungsi Senyawa Karbon (Alkohol, Eter, Aldehid, Keton, Asam Karboksilat, Ester) & Isomer',
    'Peserta didik dapat mengidentifikasi gugus fungsi, memberi nama IUPAC, membedakan isomer gugus fungsi (mis. alkohol–eter), serta menuliskan reaksi esterifikasi dasar.',
    'Gunakan uji pengenal sederhana (mis. reaksi Na logam, Fehling/Tollens) untuk membedakan gugus alkohol/aldehid/asam karboksilat.',
    'Menghubungkan gugus fungsi organik dengan sifat polaritas, bau ester, dan kereaktifan kimianya.',
    ['Hidrokarbon & tata nama Fase E'],
    ['Gugus fungsi dan pasangan isomer fungsi teridentifikasi akurat beserta reaksi sintesis ester'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12' }
  ),
  m(
    'kim-ff-s2-makromolekul-polimer', 'Kimia', 'SMA/MA', 'Fase F', 'Kimia Terapan & Biokimia',
    'Polimer Sintetis/Alami, Karbohidrat, Protein, Lemak, serta Alternatif Bioplastik Kimia Hijau',
    'Peserta didik dapat membedakan polimer adisi vs kondensasi, menjelaskan uji identifikasi karbohidrat/protein, serta mengevaluasi inovasi polimer ramah lingkungan.',
    'Tautkan kembali ke 12 prinsip Kimia Hijau (degradabilitas bahan dan pengurangan limbah plastik sekali pakai).',
    'Mengevaluasi struktur makromolekul biologis maupun industri serta dampaknya terhadap keberlanjutan lingkungan.',
    ['Gugus fungsi & prinsip Kimia Hijau'],
    ['Klasifikasi monomer–polimer tepat dan analisis bioplastik dikaitkan secara konkret ke prinsip Kimia Hijau'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['kim-ff-s2-gugus-fungsi-organik'], relatedTopicIds: ['kim-ff-s2-gugus-fungsi-organik'], suggestedGrade: '12' }
  ),

  // 4G. BIOLOGI SMA (Fase E vs Fase F)
  m(
    'bio-fe-s1-keanekaragaman-hayati', 'Biologi', 'SMA/MA', 'Fase E', 'Keanekaragaman Hayati',
    'Keanekaragaman Hayati Tingkat Gen, Jenis, Ekosistem, serta Upaya Konservasi Spesies Indonesia',
    'Peserta didik dapat membedakan keanekaragaman tingkat gen, spesies, dan ekosistem menggunakan contoh flora–fauna Indonesia beserta ancaman kepunahan dan upaya pelestariannya.',
    'Klasifikasi zona sebaran Wallacea–Asiatis–Australis serta perbedaan konservasi in-situ dan ex-situ.',
    'Menganalisis kekayaan biodiversitas Nusantara dan strategi konservasi berbasis bukti ancaman.',
    ['Klasifikasi makhluk hidup & ekologi SMP'],
    ['Pemisahan contoh tingkat gen vs jenis tepat; usulan konservasi in-situ vs ex-situ logis'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10' }
  ),
  m(
    'bio-fe-s1-virus-peranan', 'Biologi', 'SMA/MA', 'Fase E', 'Mikrobiologi Dasar',
    'Struktur Virus, Siklus Replikasi Litik & Lisogenik, serta Peran Kesehatan & Bioteknologi',
    'Peserta didik dapat membandingkan ciri virus dengan sel hidup, membedakan tahap siklus litik dan lisogenik, serta mengevaluasi cara pencegahan infeksi virus melalui vaksinasi.',
    'Tekankan alasan mengapa antibiotik bakteri tidak membunuh virus serta cara kerja imunisasi melatih sistem pertahanan tubuh.',
    'Memahami mekanisme replikasi virus dan literasi pencegahan wabah penyakit menular secara ilmiah.',
    ['Struktur sel SMP'],
    ['Tahap siklus litik vs lisogenik tergambar urut; alasan medis penggunaan vaksin vs antibiotik tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  m(
    'bio-fe-s1-bakteri-jamur-biotek-awal', 'Biologi', 'SMA/MA', 'Fase E', 'Mikroorganisme & Ekosistem',
    'Peranan Bakteri, Protista, dan Jamur dalam Daur Nutrien serta Bioteknologi Pangan Tradisional',
    'Peserta didik dapat mengidentifikasi ciri organisme prokariot vs eukariot uniseluler/fungi serta menganalisis proses fermentasi pangan lokal (tempe, yogurt, tapai).',
    'Seimbangkan pembahasan mikroba patogen dengan manfaat ekologis bakteri pengikat nitrogen dan dekomposer.',
    'Menghubungkan keragaman mikroorganisme dengan kesehatan manusia dan pengolahan pangan aman.',
    ['Klasifikasi makhluk hidup'],
    ['Peran mikroba spesifik dalam fermentasi pangan tradisional diidentifikasi tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  m(
    'bio-fe-s1-inovasi-bioteknologi', 'Biologi', 'SMA/MA', 'Fase E', 'Bioteknologi',
    'Inovasi Bioteknologi Modern (Rekayasa Genetika Dasar & Bioetika) dalam Pangan & Kesehatan',
    'Peserta didik dapat membandingkan prinsip bioteknologi konvensional dan modern serta menilai manfaat maupun pertimbangan etika keamanan produk hasil rekayasa.',
    'Contoh kultur jaringan, antibodi monoklonal, dan insulin rekombinan dibahas berimbang dari sisi manfaat & regulasi keamanan.',
    'Mengevaluasi perkembangan bioteknologi modern secara objektif dan berwawasan etis.',
    ['Mikroorganisme & virus'],
    ['Perbandingan teknik konvensional vs modern akurat lengkap dengan penilaian risiko etis'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['bio-fe-s1-bakteri-jamur-biotek-awal'], relatedTopicIds: ['bio-fe-s1-bakteri-jamur-biotek-awal'], suggestedGrade: '10' }
  ),
  m(
    'bio-fe-s2-ekosistem-daur-biogeokimia', 'Biologi', 'SMA/MA', 'Fase E', 'Ekologi',
    'Aliran Energi, Piramida Ekologi, Suksesi, dan Daur Biogeokimia (Karbon, Nitrogen, Air)',
    'Peserta didik dapat menganalisis efisiensi transfer energi antartingkat trofik serta melacak keterlibatan organisme dalam siklus nitrogen dan karbon.',
    'Bandingkan suksesi primer pada lahan bekas letusan gunung dengan suksesi sekunder dan titik kritis gangguan daur nitrogen.',
    'Menghubungkan peran mikrob dan tumbuhan dalam menjaga daur unsur penyokong kehidupan ekosistem.',
    ['Ekosistem jaring makanan SMP dan peran mikroba Sem 1'],
    ['Bakteri nitrifikasi/denitrifikasi dan proses fotosintesis–respirasi terpetakan akurat dalam siklus'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bio-fe-s1-bakteri-jamur-biotek-awal'], relatedTopicIds: ['bio-fe-s1-bakteri-jamur-biotek-awal'], suggestedGrade: '10' }
  ),
  m(
    'bio-fe-s2-perubahan-lingkungan-limbah', 'Biologi', 'SMA/MA', 'Fase E', 'Ekologi Terapan',
    'Indikator Pencemaran Air/Tanah, Eutrofikasi, dan Strategi Bioremediasi Sederhana',
    'Peserta didik dapat mendiagnosis dampak pencemaran limbah domestik/pertanian (seperti ledakan alga atau penurunan oksigen terlarut) serta merancang solusi berbasis penguraian alami.',
    'Bandingkan nilai BOD/kekeruhan air tercemar dan peran tanaman penyaring air/komposter dalam mengurangi limbah organik.',
    'Menganalisis dampak pencemaran terhadap rantai hidup perairan dan merancang solusi pengurangan limbah.',
    ['Keanekaragaman hayati & daur biogeokimia'],
    ['Hubungan antara pupuk berlebih, eutrofikasi, dan kematian ikan dijelaskan secara kausal tepat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bio-fe-s2-ekosistem-daur-biogeokimia'], relatedTopicIds: ['bio-fe-s2-ekosistem-daur-biogeokimia'], suggestedGrade: '10' }
  ),
  m(
    'bio-fe-s2-klasifikasi-tumbuhan-hewan', 'Biologi', 'SMA/MA', 'Fase E', 'Keanekaragaman Hayati',
    'Adaptasi Morfologi–Fisiologi Dunia Tumbuhan (Lumut, Paku, Berbiji) dan Invertebrata–Vertebrata',
    'Peserta didik dapat mengelompokkan tumbuhan dan hewan sekitar berdasarkan ciri struktur vaskular, pembiji, simetri tubuh, dan penutup tubuh menggunakan kunci determinasi.',
    'Tekankan adaptasi yang memungkinkan evolusi kehidupan dari lingkungan lembap air ke daratan kering.',
    'Menghubungkan ciri struktural kelompok tumbuhan/hewan dengan strategi bertahan hidup di habitatnya.',
    ['Keanekaragaman hayati Sem 1'],
    ['Identifikasi kelas/divisi spesimen lokal memakai kunci determinasi berjalan akurat'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bio-fe-s1-keanekaragaman-hayati'], relatedTopicIds: ['bio-fe-s1-keanekaragaman-hayati'], suggestedGrade: '10' }
  ),
  m(
    'bio-fe-s2-proyek-observasi-biokonservasi', 'Biologi', 'SMA/MA', 'Fase E', 'Keterampilan Proses Sains',
    'Desain Eksperimen / Audit Ekologi Mini Lingkungan Sekolah dan Pelaporan Data Biologis',
    'Peserta didik dapat merencanakan pengamatan lapangan indeks keragaman sederhana atau uji pengaruh faktor lingkungan terhadap perkecambahan serta melaporkan hasilnya secara ilmiah.',
    'Pandu penerapan metode sampling kuadrat mini atau pengamatan variabel tunggal terkendali selama 5–7 hari.',
    'Mengintegrasikan pengumpulan data kuantitatif biologis, pengendalian variabel, dan pelaporan bukti.',
    ['Keanekaragaman hayati & ekologi'],
    ['Laporan memaparkan data tabel pengukuran aktual dan keterbatasan desain eksperimen secara jujur'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '10' }
  ),
  // Biologi Fase F
  m(
    'bio-ff-s1-sel-transpor-membran', 'Biologi', 'SMA/MA', 'Fase F', 'Biologi Sel',
    'Ultrastruktur Sel, Bioproses Membran (Difusi, Osmosis, Transpor Aktif), dan Pembelahan Mitosis–Meiosis',
    'Peserta didik dapat menjelaskan mekanisme perpindahan zat melintasi fosfolipid bilayer (isotonis, hipotonis, hipertonis) serta membedakan tujuan dan jumlah kromosom hasil mitosis vs meiosis.',
    'Simulasikan peristiwa plasmolisis/turgiditas sel tumbuhan dan keterkaitan kesalahan pembelahan meiosis dengan kelainan kromosom.',
    'Menghubungkan dinamika membran dan reproduksi sel sebagai fondasi fisiologi dan pewarisan sifat.',
    ['Struktur sel dasar'],
    ['Prediksi arah aliran air osmosis dan perbandingan fase mitosis vs meiosis tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '11' }
  ),
  m(
    'bio-ff-s1-metabolisme-enzim', 'Biologi', 'SMA/MA', 'Fase F', 'Bioproses Seluler',
    'Cara Kerja Enzim, Respirasi Aerob–Anaerob, serta Reaksi Terang & Siklus Calvin Fotosintesis',
    'Peserta didik dapat menafsirkan grafik pengaruh suhu/pH/inhibitor terhadap kerja enzim serta melacak masukan dan keluaran ATP/NADH pada tahapan katabolisme dan anabolisme.',
    'Bandingkan efisiensi jumlah ATP respirasi aerob dengan fermentasi asam laktat/alkohol serta tempat berlangsungnya tiap reaksi di sel.',
    'Menganalisis transformasi energi biokimia di tingkat organel mitokondria dan kloroplas.',
    ['Transpor membran & struktur sel'],
    ['Grafik laju enzim ditafsir tepat; lokasi & hasil glikolisis, siklus Krebs, dan reaksi terang–gelap konsisten'],
    '1 (Ganjil)', 'pendalaman', { prasyaratTopicIds: ['bio-ff-s1-sel-transpor-membran'], relatedTopicIds: ['bio-ff-s1-sel-transpor-membran'], suggestedGrade: '11' }
  ),
  m(
    'bio-ff-s1-fisiologi-sirkulasi-respirasi', 'Biologi', 'SMA/MA', 'Fase F', 'Fisiologi Sistem Organ',
    'Keterkaitan Struktur–Fungsi Sistem Gerak, Sirkulasi, Pencernaan, Pernapasan & Ekskresi (Homeostasis)',
    'Peserta didik dapat menganalisis koordinasi pertukaran gas di alveolus, filtrasi nefron ginjal, dan kelainan fisiologis dari kasus pemeriksaan laboratorium dasar.',
    'Fokus pada mekanisme umpan balik menjaga homeostasis tekanan darah, kadar glukosa, dan pH tubuh.',
    'Mengaitkan struktur jaringan sistem organ manusia dengan pencegahan gangguan metabolik/degeneratif.',
    ['Sistem organ SMP & transpor membran'],
    ['Alur pembentukan urine (filtrasi–reabsorpsi–augmentasi) dan analisis gangguan organ tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  m(
    'bio-ff-s1-koordinasi-imun-reproduksi', 'Biologi', 'SMA/MA', 'Fase F', 'Regulasi & Imunitas',
    'Sistem Saraf, Hormon Endokrin, Mekanisme Imunitas Spesifik/Nonspesifik, dan Kesehatan Reproduksi',
    'Peserta didik dapat menjelaskan penghantaran impuls saraf, peran antibodi dalam imunitas adaptif, serta regulasi hormon pada siklus reproduksi manusia.',
    'Bandingkan respons cepat saraf dengan kerja regulasi hormon yang lebih tahan lama serta mekanisme memori sel imun.',
    'Memahami regulasi integratif sistem saraf–endokrin dan perlindungan tubuh terhadap patogen.',
    ['Virus & fisiologi organ'],
    ['Perbedaan sel limfosit B vs T serta mekanisme gerak refleks dijelaskan benar'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  m(
    'bio-ff-s2-pertumbuhan-hormon-tumbuhan', 'Biologi', 'SMA/MA', 'Fase F', 'Fisiologi Tumbuhan',
    'Pertumbuhan Primer–Sekunder Tumbuhan, Fitohormon (Auksin, Giberelin, Sitokinin), & Faktor Lingkungan',
    'Peserta didik dapat merancang penyelidikan pengaruh cahaya/nutrisi/fitohormon terhadap pertumbuhan kecambah dan mengolah data tinggi tanaman dalam kurva pertumbuhan.',
    'Hubungkan respon fototropisme dengan distribusi auksin dan interaksi gen dengan faktor lingkungan luar.',
    'Menyelidiki pengaruh faktor internal dan eksternal terhadap perkembangan tumbuhan secara eksperimental.',
    ['Sel & metabolisme fotosintesis'],
    ['Analisis grafik kecepatan tumbuh berdasarkan variabel perlakuan tepat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '12' }
  ),
  m(
    'bio-ff-s2-substansi-genetika-sintesis', 'Biologi', 'SMA/MA', 'Fase F', 'Genetika Molekuler',
    'Struktur DNA–RNA, Replikasi DNA, dan Mekanisme Sintesis Protein (Transkripsi–Translasi)',
    'Peserta didik dapat menerjemahkan untai templat DNA menjadi mRNA, tRNA, hingga urutan asam amino polipeptida serta mengevaluasi dampak mutasi titik pada protein.',
    'Latih pembacaan tabel kodon genetik secara teliti dan analisis perbedaan mutasi substitusi diam vs frameshift.',
    'Menghubungkan informasi genetik DNA dengan ekspresi sifat protein melalui kode genetik.',
    ['Mitosis & meiosis Sem 1'],
    ['Urutan kodon mRNA dan asam amino diterjemahkan akurat dari DNA antisense/sense'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bio-ff-s1-sel-transpor-membran'], relatedTopicIds: ['bio-ff-s1-sel-transpor-membran'], suggestedGrade: '12' }
  ),
  m(
    'bio-ff-s2-pewarisan-mendel-peta-silsilah', 'Biologi', 'SMA/MA', 'Fase F', 'Genetika Klasik & Manusia',
    'Hukum I & II Mendel, Penyimpangan Semu, serta Penelusuran Hereditas Manusia (Peta Silsilah)',
    'Peserta didik dapat menghitung rasio fenotipe/genotipe persilangan monohibrid–dihibrid hingga terpaut seks dan menentukan pola pewarisan kelainan genetik dari pedigree.',
    'Latih analisis silsilah keluarga (autosomal dominan/resesif vs terpaut kromosom X) dan pewarisan golongan darah ABO.',
    'Memprediksi peluang pewarisan sifat dan mengidentifikasi pola penurunan kelainan genetik manusia.',
    ['Pembelahan meiosis & substansi genetika'],
    ['Diagram persilangan Punnett & penentuan genotipe pembawa (carrier) pada silsilah tepat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['bio-ff-s2-substansi-genetika-sintesis'], relatedTopicIds: ['bio-ff-s2-substansi-genetika-sintesis'], suggestedGrade: '12' }
  ),
  m(
    'bio-ff-s2-evolusi-biotek-sintesis', 'Biologi', 'SMA/MA', 'Fase F', 'Evolusi & Bioteknologi Lanjutan',
    'Mekanisme Evolusi, Hukum Hardy-Weinberg Sederhana, serta Aplikasi Rekayasa Genetika Modern',
    'Peserta didik dapat membedakan seleksi alam vs teori Lamarck, menghitung frekuensi alel keseimbangan Hardy-Weinberg, dan menganalisis teknologi CRISPR/PCR secara bioetis.',
    'Tekankan evolusi terjadi di tingkat populasi (perubahan frekuensi alel), bukan individu, serta syarat berlakunya persamaan p² + 2pq + q² = 1.',
    'Menghubungkan genetika populasi dengan dinamika evolusi serta bioteknologi molekuler modern.',
    ['Genetika Mendel & sintesis protein'],
    ['Perhitungan frekuensi alel p/q tepat; penjelasan syarat seleksi alam & prinsip PCR benar'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['bio-ff-s2-pewarisan-mendel-peta-silsilah'], relatedTopicIds: ['bio-ff-s2-pewarisan-mendel-peta-silsilah'], suggestedGrade: '12' }
  ),
];
