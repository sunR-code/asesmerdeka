import type { GenerationRequest } from '../../types/assessment';
import type { QuestionBank } from './types';

// ============================================================================
// 5. BANK SOAL BAHASA INDONESIA (Min 6 PG, 3 PGK, 3 Uraian)
// ============================================================================
export function buildIndonesianQuestionBank(req: GenerationRequest, _lowerMateri: string): QuestionBank {
  return {
    capaianPembelajaran: `Peserta didik mampu memahami, menganalisis struktur dan kaidah kebahasaan, serta mengevaluasi gagasan dalam teks Bahasa Indonesia pada materi ${req.materiPokok}.`,
    tujuanPembelajaranDefault: `Peserta didik dapat menemukan ide pokok, menganalisis struktur teks, menelaah ketepatan kaidah bahasa, serta menyusun tanggapan kritis pada materi ${req.materiPokok}.`,
    pgPool: [
      {
        stimulus: `Bacalah kutipan teks berikut dengan saksama!
Kawasan Wisata Kawah Ijen di perbatasan Kabupaten Banyuwangi dan Bondowoso, Jawa Timur, menyimpan pesona alam yang sangat langka di dunia. Danau kawahnya yang luas tampak berwarna hijau kebiruan pekat dan dikelilingi tebing batu belerang yang menjulang gagah. Pada dini hari sebelum matahari terbit, pengunjung dapat menyaksikan fenomena api biru (blue fire) yang menyala indah di celah-celah tambang belerang.`,
        pertanyaan: 'Gagasan pokok yang tepat dari paragraf di atas adalah ....',
        opsi5: [
          'Sejarah penambangan batu belerang tradisional di Kabupaten Bondowoso.',
          'Pesona alam langka dan keindahan Kawah Ijen di Jawa Timur.',
          'Cara mendaki Gunung Ijen dengan aman pada dini hari.',
          'Perbandingan suhu udara Kawah Ijen dengan Gunung Bromo.',
          'Dampak ekonomi pariwisata bagi masyarakat Banyuwangi.',
        ],
        kunci: 'B',
        pembahasan:
          'Paragraf tersebut merupakan paragraf deduktif yang menempatkan kalimat utama di awal paragraf: "Kawasan Wisata Kawah Ijen ... menyimpan pesona alam yang sangat langka di dunia" (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Gagasan Pokok)',
        indikatorSoal: 'Disajikan kutipan paragraf, peserta didik dapat menentukan gagasan pokok paragraf dengan tepat.',
      },
      {
        stimulus: `Cermati kalimat berikut!
"Danau kawahnya yang luas tampak berwarna hijau kebiruan pekat dan dikelilingi tebing batu belerang yang menjulang gagah."`,
        pertanyaan: 'Cerapan panca indera (citraan) yang paling dominan digunakan penulis dalam kalimat tersebut adalah ....',
        opsi5: [
          'Indera pendengaran (auditif)',
          'Indera penciuman (olfaktorik)',
          'Indera penglihatan (visual)',
          'Indera perabaan (taktil)',
          'Indera pengecapan (gustatorik)',
        ],
        kunci: 'C',
        pembahasan:
          'Frasa "tampak berwarna hijau kebiruan pekat" dan "tebing batu belerang yang menjulang gagah" melukiskan objek yang ditangkap oleh indera penglihatan / visual (Pilihan C).',
        levelKognitif: 'C3 (Mengidentifikasi Kaidah Kebahasaan)',
        indikatorSoal: 'Disajikan kalimat bercitraan, peserta didik dapat mengidentifikasi cerapan panca indera yang digunakan.',
      },
      {
        stimulus: `Bacalah kutipan Teks Laporan Hasil Observasi berikut!
(1) Taman Nasional Baluran terletak di Kabupaten Situbondo, Provinsi Jawa Timur. (2) Kawasan konservasi ini memiliki luas sekitar 25.000 hektare yang terdiri atas tipe vegetasi sabana, hutan mangrove, dan hutan musim. (3) Menurut para wisatawan, pemandangan padang sabana Bekol saat musim kemarau terlihat sangat eksotis dan mengagumkan. (4) Tercatat ada lebih dari 444 jenis tumbuhan dan 26 jenis mamalia yang dilindungi di kawasan ini.`,
        pertanyaan: 'Kalimat yang mengandung OPINI (pendapat subjektif) dalam paragraf di atas ditunjukkan oleh nomor ....',
        opsi5: [
          'Kalimat (1)',
          'Kalimat (2)',
          'Kalimat (3)',
          'Kalimat (4)',
          'Kalimat (1) dan (4)',
        ],
        kunci: 'C',
        pembahasan:
          'Kalimat (3) memuat penilaian subjektif ("Menurut para wisatawan... terlihat sangat eksotis dan mengagumkan") sehingga merupakan kalimat opini. Sedangkan kalimat (1), (2), dan (4) adalah kalimat fakta berisi lokasi dan data angka terukur (Pilihan C).',
        levelKognitif: 'C4 (Membedakan Kalimat Fakta dan Opini)',
        indikatorSoal: 'Disajikan paragraf bernomor, peserta didik dapat membedakan kalimat opini dari kalimat fakta.',
      },
      {
        stimulus: `Perhatikan kalimat-kalimat berikut!
(1) Para siswa sedang melaksanakan praktek biologi di laboratorium.
(2) Ibu membeli obat batuk di apotek dekat pasar tradisional.
(3) Jadwal aktifitas ekstrakurikuler ditempel di papan pengumuman.
(4) Kakak sedang menyusun analisis data untuk laporan penelitian.`,
        pertanyaan: 'Kalimat yang menggunakan KATA BAKU secara tepat sesuai Kamus Besar Bahasa Indonesia (KBBI) adalah nomor ....',
        opsi5: [
          '(1) dan (2)',
          '(1) dan (3)',
          '(2) dan (3)',
          '(2) dan (4)',
          '(3) dan (4)',
        ],
        kunci: 'D',
        pembahasan:
          'Kata "apotek" (kalimat 2) dan "analisis" (kalimat 4) adalah kata baku sesuai KBBI. Pada kalimat (1) tertulis "praktek" (seharusnya "praktik") dan kalimat (3) tertulis "aktifitas" (seharusnya "aktivitas") (Pilihan D).',
        levelKognitif: 'C3 (Menerapkan Kaidah Kata Baku KBBI)',
        indikatorSoal: 'Disajikan empat kalimat, peserta didik dapat memilih kalimat yang menggunakan ejaan kata baku sesuai KBBI.',
      },
      {
        stimulus: `Bacalah kutipan teks prosedur berikut!
Cara Membuat Pupuk Kompos Organik dari Daun Kering:
1. Siapkan wadah komposter, sampah daun kering yang telah dicacah, tanah subur, dan larutan bioaktivator EM4.
2. Masukkan lapisan tanah setebal 5 cm di dasar wadah, lalu tumpuk dengan cacahan daun kering.
3. [ ......................................................... ]
4. Tutup rapat wadah komposter dan aduk campuran setiap minggu hingga berubah menjadi tanah kompos yang gembur dan tidak berbau.`,
        pertanyaan: 'Kalimat perintah yang paling tepat untuk melengkapi langkah nomor (3) pada teks prosedur di atas adalah ....',
        opsi5: [
          'Pupuk kompos organik sangat bermanfaat untuk menyuburkan tanaman hias.',
          'Siramkan larutan bioaktivator EM4 secara merata di atas tumpukan daun kering agar proses fermentasi berjalan optimal.',
          'Daun kering banyak ditemukan berjatuhan di halaman sekolah pada musim kemarau.',
          'Mengapa kita harus mencacah daun kering sebelum dimasukkan ke dalam wadah?',
          'Sebaiknya pupuk kompos langsung dijual ke toko pertanian terdekat.',
        ],
        kunci: 'B',
        pembahasan:
          'Bagian langkah-langkah teks prosedur harus berisi kalimat perintah (imperatif) yang kronologis. Setelah daun dimasukkan ke wadah (langkah 2) dan sebelum wadah ditutup (langkah 4), langkah yang tepat adalah menyiramkan larutan EM4 secara merata (Pilihan B).',
        levelKognitif: 'C4 (Melengkapi Teks Prosedur Rumpang)',
        indikatorSoal: 'Disajikan teks prosedur rumpang, peserta didik dapat melengkapinya dengan kalimat perintah yang runtut.',
      },
      {
        stimulus: `Bacalah kutipan paragraf berikut!
Penggunaan kantong belanja ramah lingkungan yang dapat dipakai berulang kali mulai diterapkan di berbagai pasar tradisional maupun swalayan. Langkah ini terbukti mampu menekan volume timbulan sampah plastik harian secara signifikan. Selain itu, kesadaran warga untuk memilah sampah organik dan anorganik dari rumah juga makin meningkat. Oleh karena itu, kolaborasi aktif antara masyarakat dan pemerintah sangat menentukan keberhasilan menjaga kelestarian lingkungan.`,
        pertanyaan: 'Berdasarkan letak kalimat utamanya, paragraf di atas termasuk jenis paragraf ....',
        opsi5: [
          'Paragraf Deduktif (kalimat utama di awal paragraf)',
          'Paragraf Induktif (kalimat utama di akhir paragraf)',
          'Paragraf Narasi imajinatif',
          'Paragraf Deskripsi spasial',
          'Paragraf Dialog langsung',
        ],
        kunci: 'B',
        pembahasan:
          'Paragraf tersebut menyajikan rincian fakta khusus terlebih dahulu pada kalimat 1–3, lalu ditutup dengan simpulan umum di kalimat terakhir yang ditandai konjungsi antarkalimat "Oleh karena itu,...". Maka paragraf tersebut adalah Paragraf Induktif (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Pola Pengembangan Paragraf)',
        indikatorSoal: 'Disajikan sebuah paragraf, peserta didik dapat mengidentifikasi pola pengembangan paragraf berdasarkan letak kalimat utamanya.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Perhatikan kaidah penulisan kata baku dan kata depan Bahasa Indonesia sesuai EYD Edisi V pada kalimat-kalimat berikut!`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan kaidah kebahasaan di bawah ini!',
        pernyataan: [
          { teks: 'Penulisan "di sekitar sekolah" dipisah karena "di" berfungsi sebagai kata depan penunjuk tempat.', isBenar: true },
          { teks: 'Kata "aktifitas" dan "praktek" merupakan bentuk kata baku sesuai KBBI.', isBenar: false },
          { teks: 'Kalimat efektif harus memiliki minimal unsur Subjek dan Predikat yang jelas serta tidak bertele-tele.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena bentuk baku sesuai KBBI adalah "aktivitas" (pakai v) dan "praktik" (pakai i).',
        levelKognitif: 'C4 (Evaluasi Kaidah Bahasa AKM)',
        indikatorSoal: 'Peserta didik dapat memvalidasi ketepatan ejaan kata baku dan kata depan sesuai EYD V.',
      },
      {
        stimulus: `Bacalah kutipan informasi literasi berikut!
Perpustakaan sekolah mengadakan program "Gerakan Literasi 15 Menit" setiap pagi sebelum jam pelajaran dimulai. Berdasarkan survei selama satu semester, rata-rata jumlah buku yang dibaca setiap siswa meningkat dari 1 buku menjadi 4 buku per semester, serta kemampuan menulis ringkasan siswa menjadi lebih terstruktur.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan di bawah ini berdasarkan teks!',
        pernyataan: [
          { teks: 'Program Gerakan Literasi dilaksanakan selama 15 menit setiap pagi sebelum pelajaran dimulai.', isBenar: true },
          { teks: 'Survei menunjukkan bahwa minat baca siswa justru menurun setelah program dijalankan.', isBenar: false },
          { teks: 'Selain meningkatkan jumlah buku yang dibaca, program tersebut berdampak positif pada keterampilan menulis ringkasan siswa.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR sesuai isi bacaan. Pernyataan 2 SALAH karena jumlah buku yang dibaca justru meningkat dari 1 menjadi 4 buku per semester.',
        levelKognitif: 'C4 (Evaluasi Informasi Bacaan Literasi)',
        indikatorSoal: 'Disajikan teks laporan singkat, peserta didik dapat memvalidasi kebenaran informasi tersurat dan tersirat.',
      },
      {
        stimulus: `Cermati struktur Teks Laporan Hasil Observasi (LHO) dan Teks Deskripsi berikut!
• Teks Laporan Hasil Observasi menyajikan informasi objek secara umum dan ilmiah berdasarkan hasil pengamatan/fakta klasifikasi.
• Teks Deskripsi menggambarkan satu objek spesifik secara terperinci dan subjektif-emosional agar pembaca seolah melihat langsung.`,
        pertanyaan: 'Berdasarkan perbandingan konsep di atas, tentukan Benar atau Salah untuk setiap pernyataan berikut!',
        pernyataan: [
          { teks: 'Struktur pembuka pada Teks Laporan Hasil Observasi disebut Pernyataan Umum atau Klasifikasi.', isBenar: true },
          { teks: 'Teks berjudul "Kucing Kesayanganku Si Belang" termasuk Teks Laporan Hasil Observasi ilmiah umum.', isBenar: false },
          { teks: 'Kedua jenis teks tersebut sama-sama membutuhkan pengamatan yang cermat terhadap ciri-ciri objek.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena "Kucing Kesayanganku Si Belang" membahas satu objek khusus milik penulis sehingga termasuk Teks Deskripsi.',
        levelKognitif: 'C4 (Membandingkan Karakteristik Teks)',
        indikatorSoal: 'Peserta didik dapat mengevaluasi perbedaan dan persamaan antara Teks Laporan Hasil Observasi dan Teks Deskripsi.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Menulis Kritis & Terstruktur (${req.materiPokok}):
Kemampuan menyusun paragraf yang padu (kohesif dan koheren) sangat menentukan kejelasan pesan yang diterima pembaca.`,
        pertanyaan: `Susunlah sebuah teks singkat (minimal 2 paragraf) bertema "${req.materiPokok}" dengan memperhatikan struktur pembuka, isi penjelas, dan simpulan, serta gunakan ejaan Bahasa Indonesia yang baku!`,
        pedomanPenskoran: `Skor 20: Memenuhi struktur 2 paragraf yang padu, sesuai tema, dan menggunakan kata baku serta tanda baca yang tepat.`,
        contohJawaban: `Paragraf 1 (Pembuka / Pengenalan): Lingkungan sekolah yang bersih, rindang, dan tertata rapi merupakan faktor penting yang mendukung kenyamanan belajar seluruh warga sekolah. Di sepanjang koridor kelas, berbagai tanaman hijau tumbuh subur dan menyejukkan udara.\n\nParagraf 2 (Rincian & Simpulan): Setiap pagi, para siswa bekerja sama melaksanakan piket kebersihan dan memilah sampah organik serta anorganik ke tempat yang telah disediakan. Melalui kebiasaan disiplin ini, suasana belajar menjadi lebih sehat, fokus, dan menyenangkan.`,
        levelKognitif: 'C6 (Menyusun Teks Bahasa Indonesia)',
        indikatorSoal: `Peserta didik mampu menulis teks sesuai struktur dan kaidah kebahasaan pada materi ${req.materiPokok}.`,
      },
      {
        stimulus: `Penyuntingan Ejaan dan Kalimat Efektif (EYD Edisi V):
Perhatikan kalimat yang belum efektif dan masih memuat kata tidak baku berikut:
"Para siswa-siswi sekalian sedang melakukan praktek membuat kerajinan tangan didalam ruang ketrampilan supaya agar hasilnya kreatif."`,
        pertanyaan: `a) Sebutkan 3 kesalahan ejaan/keefektifan yang terdapat pada kalimat di atas!
b) Tuliskan kembali kalimat tersebut menjadi kalimat efektif yang baku sesuai kaidah EYD Edisi V!`,
        pedomanPenskoran: `Skor 20: Mengidentifikasi minimal 3 kesalahan (pemborosan kata, kata tidak baku, kata depan) (10 poin) dan memperbaiki kalimat menjadi efektif (10 poin).`,
        contohJawaban: `a) Tiga kesalahan pada kalimat tersebut:
1. Pemborosan kata jamak/konjungsi: "Para siswa-siswi sekalian" dan "supaya agar".
2. Kata tidak baku: "praktek" (seharusnya "praktik") dan "ketrampilan" (seharusnya "keterampilan").
3. Penulisan kata depan tempat digabung: "didalam" (seharusnya dipisah "di dalam").

b) Perbaikan Kalimat Efektif:
"Para siswa sedang melakukan praktik membuat kerajinan tangan di dalam ruang keterampilan agar hasilnya kreatif."`,
        levelKognitif: 'C5 (Menyunting Kalimat Efektif & Ejaan)',
        indikatorSoal: 'Disajikan kalimat tidak efektif yang memuat kesalahan ejaan, peserta didik dapat menganalisis kesalahan dan memperbaikinya.',
      },
      {
        stimulus: `Analisis Ide Pokok & Simpulan Bacaan:
"Transformasi perpustakaan digital memudahkan pelajar di seluruh pelosok Indonesia mengakses ribuan buku bermutu secara gratis melalui gawai. Siswa tidak lagi terkendala jarak maupun keterbatasan jumlah buku cetak di daerahnya. Meskipun demikian, pendampingan guru dan orang tua tetap diperlukan agar siswa bijak mengatur waktu layar dan memilih bacaan yang sesuai usianya."`,
        pertanyaan: `Berdasarkan paragraf di atas:
a) Tuliskan gagasan pokok (ide pokok) paragraf tersebut!
b) Mengapa pendampingan guru dan orang tua tetap diperlukan dalam pemanfaatan perpustakaan digital?`,
        pedomanPenskoran: `Skor 20: Menentukan ide pokok dengan tepat (10 poin) dan menjelaskan alasan pentingnya pendampingan secara logis (10 poin).`,
        contohJawaban: `a) Gagasan pokok: Kemudahan akses buku bermutu bagi pelajar Indonesia melalui transformasi perpustakaan digital.
b) Pendampingan tetap diperlukan agar siswa dapat mengatur waktu penggunaan layar (screen time) secara sehat dan memilih bahan bacaan yang sesuai dengan tingkat usianya.`,
        levelKognitif: 'C4 (Menganalisis Ide Pokok & Informasi Bacaan)',
        indikatorSoal: 'Peserta didik dapat menentukan ide pokok paragraf dan menjelaskan alasan logis dari informasi di dalam teks.',
      },
    ],
  };
}
