import type { SchoolProfile } from './schoolProfileStorage';
import type { 
  P5ProjectDocument, 
  P5Tema, 
  TargetPerkembanganSubElemen, 
  AktivitasP5,
  SiswaObservasiP5 
} from '../types/p5Project';
import type { KelasHarianData } from '../types/kelasHarian';

export interface P5TemaPreset {
  tema: P5Tema;
  judulDefault: string;
  tagline: string;
  deskripsi: string;
  relevansi: string;
  dimensiTarget: TargetPerkembanganSubElemen[];
  alurAktivitas: AktivitasP5[];
  rencanaAsesmen: {
    diagnostik: string;
    formatif: string;
    sumatif: string;
  };
}

export const P5_TEMA_CATALOG: P5TemaPreset[] = [
  {
    tema: 'Gaya Hidup Berkelanjutan',
    judulDefault: 'Jejak Hijau Sekolahku: Kelola Sampah Plastik Menjadi Produk Bernilai Guna',
    tagline: 'Mengurangi timbulan sampah plastik di lingkungan sekolah dan sekitarnya',
    deskripsi: 'Projek ini bertujuan menumbuhkan kesadaran ekologis dan tanggung jawab etis peserta didik terhadap krisis lingkungan akibat sampah plastik. Peserta didik diajak mengamati timbulan sampah sekolah, menghitung jejak sampah harian, dan berkreasi merancang solusi pengolahan atau daur ulang sampah menjadi produk bermanfaat serta bernilai guna tinggi.',
    relevansi: 'Lingkungan sekolah sering kali menghasilkan sampah kemasan plastik dalam jumlah signifikan setiap harinya. Melalui projek ini, peserta didik mengintegrasikan kepedulian lingkungan dengan keterampilan berfikir kreatif untuk menciptakan budaya ramah lingkungan berkelanjutan di sekolah.',
    dimensiTarget: [
      {
        dimensi: 'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia',
        elemen: 'Akhlak kepada Alam',
        subElemen: 'Menjaga Lingkungan Alam Sekitar',
        targetFase: 'Mewujudkan rasa syukur dengan membangun kesadaran peduli lingkungan serta berinisiatif aktif menjaga kebersihan dan kelestarian ekosistem sekitar.',
        rubrik: {
          bb: 'Mulai mengenali pentingnya kebersihan lingkungan namun belum konsisten menjaga kebersihan secara mandiri.',
          mb: 'Terbiasa membuang sampah pada tempatnya dengan arahan atau pengawasan guru.',
          bsh: 'Secara mandiri dan konsisten menjaga kebersihan lingkungan serta mengajak teman memilah sampah plastik.',
          sb: 'Menjadi teladan aktif (inisiator/champion lingkungan) yang merancang aksi pelestarian lingkungan berkelanjutan di sekolah dan rumah.',
        },
      },
      {
        dimensi: 'Bergotong Royong',
        elemen: 'Kolaborasi',
        subElemen: 'Kerja Sama dan Koordinasi Sosial',
        targetFase: 'Menyelaraskan tindakan sendiri dengan tindakan orang lain untuk melaksanakan kegiatan dan mencapai tujuan kelompok di lingkungan sekitar.',
        rubrik: {
          bb: 'Masih enggan bekerja sama dalam kelompok atau lebih dominan bekerja sendiri.',
          mb: 'Mampu berkolaborasi jika diarahkan dan diberikan pembagian tugas yang terperinci.',
          bsh: 'Aktif berkolaborasi, mendengarkan gagasan rekan sekelompok, dan bertanggung jawab penuh menyelesaikan peran masing-masing.',
          sb: 'Mampu memimpin dan mengoordinasikan tim secara harmonis serta solutif saat menghadapi kendala kerja kelompok.',
        },
      },
      {
        dimensi: 'Kreatif',
        elemen: 'Menghasilkan Karya dan Tindakan Orisinal',
        subElemen: 'Eksplorasi Ide dan Modifikasi Gagasan',
        targetFase: 'Mengeksplorasi dan mengekspresikan pikiran dan/atau perasaannya dalam bentuk karya dan/atau tindakan, serta mengevaluasinya dan mempertimbangkan dampaknya bagi orang lain.',
        rubrik: {
          bb: 'Menghasilkan karya yang hanya meniru contoh persis tanpa adanya modifikasi ide.',
          mb: 'Mulai mencoba memodifikasi ide karya daur ulang dengan menambahkan variasi sederhana.',
          bsh: 'Mampu merancang dan mewujudkan produk daur ulang sampah plastik yang fungsional, rapi, dan estetis.',
          sb: 'Menciptakan karya orisinal bernilai guna tinggi, memiliki daya tarik estetika atau ekonomi, dan mampu mempresentasikan nilai gunanya.',
        },
      },
    ],
    alurAktivitas: [
      {
        no: 1,
        tahap: 'Pengenalan',
        namaAktivitas: 'Sosialisasi & Eksplorasi Isu Sampah Plastik Global dan Lokal',
        alokasiJP: 4,
        tujuanAktivitas: 'Peserta didik memahami dampak limbah plastik terhadap ekosistem darat dan laut.',
        langkahKegiatan: [
          'Guru menayangkan video dokumenter tentang mikroplastik dan timbulan sampah laut.',
          'Diskusi curah pendapat mengenai jenis sampah yang paling sering ditemui di kantin sekolah.',
          'Pengisian lembar asesmen diagnostik awal mengenai pengetahuan lingkungan.',
        ],
        alatDanBahan: ['Video edukasi', 'Proyektor', 'Lembar Asesmen Diagnostik'],
        peranGuru: 'Fasilitator & Moderator Diskusi',
        bentukAsesmen: 'Asesmen Diagnostik (Refleksi Awal)',
      },
      {
        no: 2,
        tahap: 'Pengenalan',
        namaAktivitas: 'Audit Jejak Sampah Harian Sekolah',
        alokasiJP: 6,
        tujuanAktivitas: 'Peserta didik mampu menginventarisasi dan mengukur volume sampah harian di area kelas dan kantin.',
        langkahKegiatan: [
          'Siswa dibagi ke dalam kelompok audit area (Kantin, Taman, Kelas, Selasar).',
          'Mengumpulkan dan menimbang sampah berdasarkan kategori (organik, plastik anorganik, kertas).',
          'Mencatat data ke dalam lembar observasi kuantitatif.',
        ],
        alatDanBahan: ['Timbangan gantung', 'Sarung tangan lateks/karet', 'Tabel Audit Sampah'],
        peranGuru: 'Pendamping Lapangan & Pengarah Prosedur Keselamatan',
        bentukAsesmen: 'Observasi Keterampilan Saintifik',
      },
      {
        no: 3,
        tahap: 'Kontekstualisasi',
        namaAktivitas: 'Kunjungan / Wawancara Pengelola Bank Sampah / Petugas Kebersihan',
        alokasiJP: 8,
        tujuanAktivitas: 'Menggali alur penanganan sampah eksisting dan potensi pemanfaatan sampah daur ulang.',
        langkahKegiatan: [
          'Melakukan wawancara terstruktur dengan petugas kebersihan sekolah atau pengelola bank sampah lokal.',
          'Menganalisis tantangan utama dalam pemilahan sampah di sumbernya.',
          'Menyusun peta masalah (Peta Pikiran / Alur Masalah) di lembar kerja kelompok.',
        ],
        alatDanBahan: ['Panduan Wawancara', 'Buku Catatan', 'Kertas Plano & Spidol'],
        peranGuru: 'Penghubung Narasumber & Pengamat Kolaborasi',
        bentukAsesmen: 'Form Asesmen Formatif Diskusi Kelompok',
      },
      {
        no: 4,
        tahap: 'Kontekstualisasi',
        namaAktivitas: 'Riset Desain Solusi & Pemilihan Produk Karya Daur Ulang',
        alokasiJP: 6,
        tujuanAktivitas: 'Merumuskan ide karya kreatif berbahan sampah plastik bernilai guna (ecobrick, pot estetik, anyaman pouch).',
        langkahKegiatan: [
          'Eksplorasi referensi tutorial dan rancangan produk ramah lingkungan.',
          'Diskusi kelompok menentukan jenis produk, pembagian alat, dan rancangan sketsa.',
          'Konsultasi sketsa produk kepada fasilitator.',
        ],
        alatDanBahan: ['Sketsa gambar', 'Katalog ide daur ulang', 'Format Rencana Aksi'],
        peranGuru: 'Pemberi Umpan Balik Kritis dan Pengarah Inovasi',
        bentukAsesmen: 'Rubrik Evaluasi Rencana Aksi',
      },
      {
        no: 5,
        tahap: 'Aksi',
        namaAktivitas: 'Aksi Pengumpulan dan Pembersihan Bahan Baku Plastik',
        alokasiJP: 6,
        tujuanAktivitas: 'Mempersiapkan bahan plastik bersih dan aman untuk diproduksi.',
        langkahKegiatan: [
          'Pengumpulan botol, gelas, atau kantong plastik dari sumber terpilah.',
          'Proses sterilisasi, pencucian, dan pengeringan higienis.',
          'Pencatatan inventaris bahan per kelompok.',
        ],
        alatDanBahan: ['Sabun pembersih', 'Ember air', 'Bahan plastik terpilah'],
        peranGuru: 'Fasilitator Kebersihan dan Keamanan Kerja',
        bentukAsesmen: 'Catatan Anekdot Sikap Peduli & Kerja Sama',
      },
      {
        no: 6,
        tahap: 'Aksi',
        namaAktivitas: 'Pembuatan Produk Kreatif Daur Ulang (Workshop Mini)',
        alokasiJP: 14,
        tujuanAktivitas: 'Mengeksekusi pembuatan produk daur ulang sesuai sketsa rancangan dengan rapi dan fungsional.',
        langkahKegiatan: [
          'Pengerjaan produk secara kolaboratif sesuai pembagian peran anggota tim.',
          'Uji coba fungsi dan perbaikan ketahanan produk.',
          'Pemberian label identitas, deskripsi bahan, dan pesan moral kampanye lingkungan pada produk.',
        ],
        alatDanBahan: ['Gunting/cutter', 'Lem tembak/tali', 'Bahan dekorasi pelengkap'],
        peranGuru: 'Mentor Teknis & Pengawas Keselamatan Siswa',
        bentukAsesmen: 'Asesmen Formatif Kinerja & Orisinalitas',
      },
      {
        no: 7,
        tahap: 'Aksi',
        namaAktivitas: 'Gelar Karya (Exhibition) & Kampanye Zero-Waste',
        alokasiJP: 8,
        tujuanAktivitas: 'Mempresentasikan hasil karya dan mengampanyekan gaya hidup minim sampah kepada warga sekolah.',
        langkahKegiatan: [
          'Penataan stan pameran kelompok di aula atau halaman sekolah.',
          'Presentasi di hadapan pengunjung (guru, orang tua, rekan siswa).',
          'Penilaian produk oleh tim penilai/dewan juri projek.',
        ],
        alatDanBahan: ['Meja stan pameran', 'Poster kampanye', 'Buku tamu & lembar voting'],
        peranGuru: 'Koordinator Acara & Penilai Sumatif',
        bentukAsesmen: 'Asesmen Sumatif (Rubrik Gelar Karya & Presentasi)',
      },
      {
        no: 8,
        tahap: 'Refleksi',
        namaAktivitas: 'Refleksi Diri & Evaluasi Rekan Sejawat (Peer Assessment)',
        alokasiJP: 4,
        tujuanAktivitas: 'Mengidentifikasi keberhasilan, kelemahan, serta dinamika kerja sama selama projek berlangsung.',
        langkahKegiatan: [
          'Pengisian jurnal refleksi pribadi (Apa yang kupelajari? Kendala apa yang dihadapi?).',
          'Saling memberikan apresiasi dan masukan membangun antar-anggota kelompok.',
          'Menyimpulkan pembelajaran berharga bagi pembentukan karakter diri.',
        ],
        alatDanBahan: ['Lembar Refleksi Metakognisi', 'Kartu Apresiasi Sahabat'],
        peranGuru: 'Fasilitator Refleksi & Pendengar Aktif',
        bentukAsesmen: 'Lembar Refleksi Diri Siswa',
      },
      {
        no: 9,
        tahap: 'Tindak Lanjut',
        namaAktivitas: 'Penyusunan Komitmen Bersama Aksi Lingkungan Berkelanjutan',
        alokasiJP: 4,
        tujuanAktivitas: 'Merumuskan kebiasaan ramah lingkungan permanen di kelas dan rumah.',
        langkahKegiatan: [
          'Deklarasi janji kelas hijau (misal: membawa tumbler dan tepak makan sendiri setiap hari).',
          'Pembuatan piagam komitmen kelas yang ditandatangani seluruh siswa.',
          'Penyerahan karya untuk inventaris pemanfaatan ruang sekolah.',
        ],
        alatDanBahan: ['Piagam Komitmen Kanvas', 'Spidol Permanen'],
        peranGuru: 'Pengesah Komitmen & Motivator Perubahan Karakter',
        bentukAsesmen: 'Evaluasi Portofolio Karakter Akhir',
      },
    ],
    rencanaAsesmen: {
      diagnostik: 'Kuesioner pemahaman awal tentang bahaya limbah plastik dan perilaku pemilahan sampah harian di rumah/sekolah.',
      formatif: 'Lembar observasi mingguan terhadap dimensi Beriman (akhlak alam), Bergotong Royong (kolaborasi), dan Kreatif saat perancangan dan pembuatan karya.',
      sumatif: 'Rubrik penilaian autentik pada Gelar Karya Pameran (kualitas produk daur ulang, daya guna, poster kampanye, dan kemahiran presentasi tim).',
    },
  },
  {
    tema: 'Kearifan Lokal',
    judulDefault: 'Eksplorasi Warisan Leluhur: Melestarikan Kuliner & Seni Budaya Tradisional Daerah',
    tagline: 'Mengenal, mencintai, dan melestarikan warisan budaya lokal generasi muda',
    deskripsi: 'Projek ini mengajak peserta didik menyelami kekayaan budaya lokal, mulai dari kuliner tradisional, seni tari, kerajinan tangan, hingga filosofi adat istiadat yang mulai tergerus zaman. Peserta didik melakukan riset narasumber sesepuh/pelaku budaya, mengolah kembali kuliner atau karya tradisional, dan mempublikasikannya melalui media kekinian.',
    relevansi: 'Di era digital dan gempuran budaya populer mancanegara, generasi muda rentan kehilangan rasa memiliki terhadap akar budayanya sendiri. Projek ini menjadi jembatan penghubung antara nilai kearifan lokal masa lalu dengan relevansi kehidupan masa kini.',
    dimensiTarget: [
      {
        dimensi: 'Berkebinekaan Global',
        elemen: 'Mengenal dan Menghargai Budaya',
        subElemen: 'Mendalami Budaya dan Identitas Budaya',
        targetFase: 'Mengidentifikasi dan mendeskripsikan keragaman budaya di sekitarnya; serta menjelaskan peran budaya lokal dalam membentuk identitas diri.',
        rubrik: {
          bb: 'Hanya mengetahui nama budaya lokal tanpa memahami latar belakang atau maknanya.',
          mb: 'Mulai memahami nilai budaya lokal setelah dipandu secara terstruktur oleh guru.',
          bsh: 'Mampu menjelaskan filosofi, nilai luhur, dan keunikan budaya lokal serta merasa bangga memperkenalkannya.',
          sb: 'Mampu mempromosikan dan merevitalisasi warisan budaya lokal dengan pendekatan kreatif yang diminati teman sebaya.',
        },
      },
      {
        dimensi: 'Bernalar Kritis',
        elemen: 'Memperoleh dan Memproses Informasi',
        subElemen: 'Mengidentifikasi, Mengklarifikasi, dan Mengolah Informasi',
        targetFase: 'Mengidentifikasi, mengklarifikasi, dan menganalisis informasi yang relevan serta memprioritaskan beberapa gagasan tertentu dari wawancara narasumber budaya.',
        rubrik: {
          bb: 'Mengumpulkan informasi budaya secara acak tanpa mampu memilah fakta yang relevan.',
          mb: 'Mampu mengelompokkan informasi budaya lokal namun analisis nilai filosofinya masih sederhana.',
          bsh: 'Mampu memverifikasi fakta sejarah/kuliner lokal dan menyusun simpulan terstruktur mengenai filosofi kearifan lokal.',
          sb: 'Kritis menghubungkan relevansi nilai kearifan leluhur dengan solusi persoalan moral atau sosial di era modern.',
        },
      },
      {
        dimensi: 'Bergotong Royong',
        elemen: 'Kolaborasi',
        subElemen: 'Kerja Sama Kelompok',
        targetFase: 'Menunjukkan ekspektasi positif kepada rekan kelompok dalam menyiapkan pameran budaya bersama.',
        rubrik: {
          bb: 'Pasif dalam pembagian peran eksplorasi budaya.',
          mb: 'Terlibat aktif hanya pada tugas yang disukai dalam kelompok.',
          bsh: 'Bertanggung jawab penuh, aktif membantu rekan yang kesulitan dalam memasak atau membuat kerajinan tradisional.',
          sb: 'Mampu menjadi penggerak harmoni tim yang menginspirasi rekan-rekannya merayakan keragaman budaya.',
        },
      },
    ],
    alurAktivitas: [
      {
        no: 1,
        tahap: 'Pengenalan',
        namaAktivitas: 'Menjelajah Identitas Daerah: Apresiasi Seni & Kuliner Warisan Leluhur',
        alokasiJP: 4,
        tujuanAktivitas: 'Membangkitkan rasa ingin tahu tentang akar budaya dan tradisi khas daerah setempat.',
        langkahKegiatan: ['Menyimak pemaparan video budaya lokal.', 'Kuis interaktif tebak kuliner dan motif tradisional daerah.', 'Curah pendapat tentang budaya yang hampir punah.'],
        alatDanBahan: ['Slide presentasi budaya', 'Lembar Kerja Eksplorasi'],
        peranGuru: 'Pemandu dan Narasumber Awal',
        bentukAsesmen: 'Asesmen Diagnostik Minat Budaya',
      },
      {
        no: 2,
        tahap: 'Kontekstualisasi',
        namaAktivitas: 'Wawancara Maestro / Pengrajin / Juragan Kuliner Tradisional',
        alokasiJP: 8,
        tujuanAktivitas: 'Menggali teknik pembuatan, bahan baku alami, dan filosofi nilai luhur dari pelaku budaya.',
        langkahKegiatan: ['Penyusunan instrumen wawancara sopan dan santun.', 'Kunjungan atau interaksi langsung dengan narasumber lokal.', 'Dokumentasi foto dan rekaman audio proses pembuatan.'],
        alatDanBahan: ['Panduan wawancara', 'Kamera/Smartphone', 'Perekam suara'],
        peranGuru: 'Fasilitator Hubungan Masyarakat & Pengarah Etika Bertamu',
        bentukAsesmen: 'Penilaian Laporan Hasil Wawancara',
      },
      {
        no: 3,
        tahap: 'Aksi',
        namaAktivitas: 'Praktik Pembuatan Kuliner / Kerajinan Tradisional Berkelompok',
        alokasiJP: 16,
        tujuanAktivitas: 'Mempraktikkan langsung pembuatan masakan atau kriya tradisional dengan sentuhan penyajian higienis dan modern.',
        langkahKegiatan: ['Mempersiapkan bahan pangan lokal alami atau bahan kriya ramah lingkungan.', 'Memasak atau membuat karya secara kolaboratif.', 'Menyusun kemasan rapi berdaya tarik tinggi dengan cerita di balik nilai budaya (Storytelling Budaya).'],
        alatDanBahan: ['Bahan makanan lokal/kerajinan', 'Peralatan masak/kriya', 'Bahan kemasan ramah lingkungan'],
        peranGuru: 'Instruktur Keamanan & Pembimbing Presentasi Budaya Produk',
        bentukAsesmen: 'Rubrik Kinerja Praktik Kriya & Rasa Kuliner',
      },
      {
        no: 4,
        tahap: 'Aksi',
        namaAktivitas: 'Festival Kuliner & Budaya Nusantara (Gelar Karya Sekolah)',
        alokasiJP: 8,
        tujuanAktivitas: 'Menampilkan dan menjajakan produk kearifan lokal kepada warga sekolah dan orang tua.',
        langkahKegiatan: ['Mendekorasi stan bernuansa tradisional.', 'Menyajikan sampel dan mempresentasikan cerita filosofi produk.', 'Mencatat transaksi dan ulasan respon pengunjung.'],
        alatDanBahan: ['Peralatan stan pameran', 'Brosur/Kartu cerita budaya'],
        peranGuru: 'Koordinator Festival & Penilai Sumatif',
        bentukAsesmen: 'Asesmen Sumatif Gelar Budaya',
      },
      {
        no: 5,
        tahap: 'Refleksi & Tindak Lanjut',
        namaAktivitas: 'Buku Resep / Ensiklopedia Mini Budaya Sekolah & Refleksi Akhir',
        alokasiJP: 6,
        tujuanAktivitas: 'Membukukan resep/panduan kriya budaya menjadi arsip sekolah dan refleksi kecintaan budaya.',
        langkahKegiatan: ['Menyatukan portofolio kelompok menjadi e-book resep warisan leluhur.', 'Menuliskan refleksi kebanggaan identitas kearifan lokal.', 'Deklarasi duta cilik pelestari budaya sekolah.'],
        alatDanBahan: ['Format Buku Kenangan Budaya', 'Lembar Refleksi'],
        peranGuru: 'Editor Portofolio & Pembina Refleksi',
        bentukAsesmen: 'Penilaian Portofolio Akhir & Refleksi Diri',
      },
    ],
    rencanaAsesmen: {
      diagnostik: 'Tes pemetaan awal mengenai wawasan tradisi lokal dan makanan daerah.',
      formatif: 'Jurnal observasi sikap sopan santun saat wawancara serta ketekunan saat praktik membuat produk.',
      sumatif: 'Gelar Karya Festival Budaya (Kualitas produk, kemasan berfilosofi, serta presentasi budaya).',
    },
  },
  {
    tema: 'Bhinneka Tunggal Ika',
    judulDefault: 'Harmoni dalam Keberagaman: Bangun Ruang Inklusif Bebas Perundungan (Anti-Bullying)',
    tagline: 'Menghargai setiap perbedaan suku, agama, fisik, dan pendapat dengan penuh empati',
    deskripsi: 'Projek ini difokuskan pada penguatan toleransi, empati sosial, dan pencegahan kekerasan perundungan (bullying) di satuan pendidikan. Peserta didik mengidentifikasi beragam bentuk perundungan verbal, sosial, dan digital, merancang kampanye ramah anak, serta membentuk kelompok agen perubahan sekolah damai.',
    relevansi: 'Sekolah yang aman dan inklusif adalah prasyarat mutlak proses belajar yang optimal. Dengan menginternalisasi nilai Bhinneka Tunggal Ika, siswa belajar melihat keberagaman sebagai berkah persatuan, bukan alasan diskriminasi.',
    dimensiTarget: [
      {
        dimensi: 'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia',
        elemen: 'Akhlak kepada Manusia',
        subElemen: 'Mengutamakan Persamaan dan Menghargai Perbedaan',
        targetFase: 'Mengenal perspektif dan emosi orang lain, serta mengutamakan persamaan di atas perbedaan demi menciptakan kedamaian bersama.',
        rubrik: {
          bb: 'Masih sering melontarkan candaan yang menyinggung kekurangan fisik atau latar belakang teman.',
          mb: 'Mulai menyadari dampak perkataan terhadap perasaan orang lain setelah ditegur.',
          bsh: 'Secara sadar bersikap santun, menghargai perasaan teman, dan menolak ikut serta dalam perundungan.',
          sb: 'Secara berani membela rekan yang menjadi korban perundungan serta menjadi teladan empati di kelas.',
        },
      },
      {
        dimensi: 'Berkebinekaan Global',
        elemen: 'Komunikasi dan Interaksi Antar Budaya',
        subElemen: 'Mempertimbangkan dan Menumbuhkan Berbagai Perspektif',
        targetFase: 'Mengekspresikan pandangannya secara terbuka dan saling menghargai pandangan orang lain yang berbeda latar belakang.',
        rubrik: {
          bb: 'Sering menolak pendapat yang tidak sejalan dengan kelompok bermainnya.',
          mb: 'Mampu mendengarkan pendapat yang berbeda namun belum sepenuhnya menerimanya dengan lapang dada.',
          bsh: 'Terbuka menerima perbedaan pendapat dan latar belakang serta mengedepankan musyawarah yang santun.',
          sb: 'Mampu menjembatani perselisihan antar-rekan yang berbeda sudut pandang dengan adil dan bijaksana.',
        },
      },
      {
        dimensi: 'Bernalar Kritis',
        elemen: 'Refleksi Pemikiran dan Proses Berpikir',
        subElemen: 'Merefleksi dan Mengevaluasi Pemikirannya Sendiri',
        targetFase: 'Menjelaskan alasan untuk mendukung pemikirannya dan memikirkan pandangan yang mungkin berlawanan dengan pemikirannya serta mengubah pemikirannya jika diperlukan.',
        rubrik: {
          bb: 'Bertahan pada asumsi tanpa memeriksa kebenaran informasi perundungan.',
          mb: 'Mulai mempertanyakan kebenaran gosip/rumor yang beredar di media sosial sekolah.',
          bsh: 'Mampu mengidentifikasi stereotipe negatif dan mengevaluasi dampak kata-kata kasar terhadap psikologis teman.',
          sb: 'Kritis merumuskan regulasi kelas anti-perundungan yang aplikatif dan mengedukasi rekan sebaya.',
        },
      },
    ],
    alurAktivitas: [
      {
        no: 1,
        tahap: 'Pengenalan',
        namaAktivitas: 'Mengenal Cermin Diri: Bedah Fakta Perundungan vs Candaan Sehat',
        alokasiJP: 4,
        tujuanAktivitas: 'Membedakan secara tegas antara candaan yang wajar dengan tindakan perundungan fisik, verbal, relasional, dan cyberbullying.',
        langkahKegiatan: ['Membaca komik studi kasus perundungan sekolah.', 'Bermain peran (Role Play) respon empati saling menolong.', 'Pengisian angket anonim iklim pergaulan kelas.'],
        alatDanBahan: ['Studi kasus komik', 'Angket iklim kelas'],
        peranGuru: 'Fasilitator Empati & Pembina Ruang Aman Terbuka (Safe Space)',
        bentukAsesmen: 'Asesmen Diagnostik Iklim Sosial',
      },
      {
        no: 2,
        tahap: 'Kontekstualisasi',
        namaAktivitas: 'Survei Detektif Kebaikan: Memetakan Titik Rawan Perundungan di Sekolah',
        alokasiJP: 6,
        tujuanAktivitas: 'Menemukan lokasi dan waktu rawan terjadinya perundungan (kantin, kamar kecil, pojok lapangan, media sosial).',
        langkahKegiatan: ['Pemetaan denah sekolah rawan perundungan.', 'Diskusi kelompok merumuskan faktor penyebab terjadinya perundungan.', 'Perumusan rekomendasi titik pengawasan guru & siswa.'],
        alatDanBahan: ['Denah sekolah besar', 'Stiker penanda warna-warni'],
        peranGuru: 'Pendamping Observasi & Pengarah Analisis',
        bentukAsesmen: 'Format Penilaian Analisis Risiko Sosial',
      },
      {
        no: 3,
        tahap: 'Aksi',
        namaAktivitas: 'Kampanye Kreatif: Pembuatan Video Pendek, Poster, & Komik Edukasi Damai',
        alokasiJP: 14,
        tujuanAktivitas: 'Menghasilkan media kampanye bertema "Sekolah Ramah Anak Tanpa Perundungan".',
        langkahKegiatan: ['Penyusunan naskah cerita dan storyboard pesan perdamaian.', 'Produksi konten (menggambar poster manual/digital, merekam video kampanye singkat).', 'Finalisasi konten dengan pengawasan fasilitator.'],
        alatDanBahan: ['Kertas gambar, cat poster, atau aplikasi editing gawai'],
        peranGuru: 'Mentor Konten Positif & Supervisor Etika Digital',
        bentukAsesmen: 'Rubrik Penilaian Karya Media Kampanye',
      },
      {
        no: 4,
        tahap: 'Aksi',
        namaAktivitas: 'Pentas Orasi & Deklarasi Pakta Integritas Sahabat Damai',
        alokasiJP: 8,
        tujuanAktivitas: 'Mengikrarkan komitmen bersama seluruh warga kelas dan sekolah untuk saling menjaga dan menghormati.',
        langkahKegiatan: ['Presentasi karya poster/video di hadapan seluruh kelas paralel.', 'Penandatanganan kain rentang Pakta Perdamaian Kelas.', 'Penyematan pin "Duta Sahabat Inklusif".'],
        alatDanBahan: ['Kain rentang putih 5 meter', 'Cat telapak tangan warna-warni', 'Pin Duta Sahabat'],
        peranGuru: 'Saksi Komitmen & Fasilitator Panggung Aksi',
        bentukAsesmen: 'Asesmen Sumatif (Orasi & Partisipasi Aksi Nyata)',
      },
      {
        no: 5,
        tahap: 'Refleksi & Tindak Lanjut',
        namaAktivitas: 'Pohon Kebaikan & Kotak Suara Sahabat',
        alokasiJP: 4,
        tujuanAktivitas: 'Menyediakan mekanisme berkelanjutan untuk saling berbagi pujian dan melaporkan kendala pergaulan.',
        langkahKegiatan: ['Membuat instalasi "Pohon Kebaikan" untuk menempelkan kartu terima kasih setiap minggu.', 'Menyiapkan "Kotak Suara Sahabat" untuk curhat terlindungi.', 'Refleksi komitmen jangka panjang.'],
        alatDanBahan: ['Ranting pohon replika', 'Kartu daun pesan kebaikan', 'Kotak saran terkunci'],
        peranGuru: 'Pengelola Kotak Curhat & Pendamping Konseling Ringan',
        bentukAsesmen: 'Jurnal Portofolio Refleksi Karakter Siswa',
      },
    ],
    rencanaAsesmen: {
      diagnostik: 'Angket sosiometri kelas dan pemahaman definisi perundungan.',
      formatif: 'Observasi keaktifan dalam diskusi dan empati dalam merespons perasaan rekan.',
      sumatif: 'Media kampanye anti-bullying dan orasi komitmen kelas inklusif.',
    },
  },
  {
    tema: 'Bangunlah Jiwa dan Raganya',
    judulDefault: 'Jiwa Tangguh Raga Sehat: Kampanye Gizi Seimbang & Kesejahteraan Mental Remaja',
    tagline: 'Membangun kebiasaan hidup sehat fisik dan ketahanan mental menghadapi tantangan',
    deskripsi: 'Projek ini membekali peserta didik dengan pemahaman mengenai pentingnya keseimbangan antara kebugaran fisik melalui pemenuhan gizi seimbang (isi piringku) dan ketahanan emosional/kesehatan mental di era digital.',
    relevansi: 'Tingginya konsumsi makanan cepat saji instan serta tekanan media sosial menuntut peserta didik memiliki kemampuan menyaring gaya hidup yang menyehatkan tubuh dan menenangkan pikiran.',
    dimensiTarget: [
      {
        dimensi: 'Mandiri',
        elemen: 'Regulasi Diri',
        subElemen: 'Pengendalian Diri dan Disiplin Pola Hidup',
        targetFase: 'Berkomitmen dan menjaga konsistensi pencapaian tujuan pola hidup sehat serta mengelola emosi secara adaptif.',
        rubrik: {
          bb: 'Sering abai terhadap sarapan bergizi dan mudah terpancing emosi negatif saat tertekan.',
          mb: 'Mulai mencoba mencatat pola makan harian dan meredakan emosi setelah diajak berdialog.',
          bsh: 'Mampu secara mandiri memilih makanan bergizi seimbang dan mempraktikkan teknik peredam stres.',
          sb: 'Konsisten menerapkan pola hidup bugar, menjadi teladan kebugaran, dan mampu memandu teman mengelola stres.',
        },
      },
      {
        dimensi: 'Bernalar Kritis',
        elemen: 'Menganalisis dan Mengevaluasi Penalaran',
        subElemen: 'Menganalisis Informasi Nilai Gizi dan Mitos Kesehatan',
        targetFase: 'Menganalisis kebenaran informasi label gizi makanan kemasan dan membedakannya dari klaim iklan palsu.',
        rubrik: {
          bb: 'Membeli makanan hanya berdasarkan rasa manis atau bungkus menarik tanpa memeriksa label gizi.',
          mb: 'Mulai membaca tanggal kedaluwarsa dan label gula/garam makanan kemasan.',
          bsh: 'Mampu menganalisis batas aman konsumsi gula-garam-lemak harian berdasarkan pedoman Isi Piringku Kemenkes.',
          sb: 'Kritis mengedukasi keluarga dan teman tentang bahaya konsumsi pemanis buatan dan makanan berlemak trans.',
        },
      },
    ],
    alurAktivitas: [
      {
        no: 1,
        tahap: 'Pengenalan',
        namaAktivitas: 'Audit Piring Makanku & Deteksi Tingkat Kebugaran Fisik',
        alokasiJP: 6,
        tujuanAktivitas: 'Menganalisis pola konsumsi harian dan kebugaran tubuh siswa.',
        langkahKegiatan: ['Mencatat menu makan 3 hari terakhir.', 'Menghitung estimasi kalori dan makronutrisi.', 'Tes kebugaran jasmani sederhana (jalan cepat, push-up, kelenturan).'],
        alatDanBahan: ['Tabel Isi Piringku Kemenkes', 'Matras senam', 'Meteran & Stopwatch'],
        peranGuru: 'Pemandu Tes Kebugaran & Fasilitator Gizi',
        bentukAsesmen: 'Asesmen Diagnostik Kebugaran & Nutrisi',
      },
      {
        no: 2,
        tahap: 'Kontekstualisasi',
        namaAktivitas: 'Investigasi Jajanan Sekolah & Laboratorium Label Kemasan',
        alokasiJP: 6,
        tujuanAktivitas: 'Membongkar kadar gula, garam, dan pengawet pada jajanan kemasan populer.',
        langkahKegiatan: ['Mengumpulkan 5 jenis bungkus makanan ringan favorit.', 'Menghitung sendok gula yang setara dengan angka pada tabel gizi.', 'Membuat pajangan visual "Berapa Banyak Gula yang Kamu Minum?".'],
        alatDanBahan: ['Gula pasir asli', 'Sendok teh & plastik klip', 'Bungkus minuman kemasan'],
        peranGuru: 'Pembimbing Analisis Saintifik Kontekstual',
        bentukAsesmen: 'Penilaian Portofolio Analisis Label Gizi',
      },
      {
        no: 3,
        tahap: 'Aksi',
        namaAktivitas: 'Master Chef Gizi Seimbang: Kreasi Bento Bekal Sehat Hemat Biaya',
        alokasiJP: 12,
        tujuanAktivitas: 'Merancang dan memasak menu bekal makan siang bergizi seimbang, lezat, dan terjangkau.',
        langkahKegiatan: ['Menyusun anggaran belanja bekal sehat maksimal Rp 15.000.', 'Mempersiapkan sayur, karbohidrat kompleks, protein, dan buah segar.', 'Plating bekal bento dengan estetika menarik.'],
        alatDanBahan: ['Kotak makan bekal', 'Bahan pangan lokal bergizi', 'Peralatan makan'],
        peranGuru: 'Juri Penilai Keseimbangan Gizi & Kebersihan',
        bentukAsesmen: 'Rubrik Penilaian Produk Bekal Gizi Seimbang',
      },
      {
        no: 4,
        tahap: 'Aksi & Gelar Karya',
        namaAktivitas: 'Senam Irama Bersama & Kampanye Jiwa Tenang Raga Bugar',
        alokasiJP: 8,
        tujuanAktivitas: 'Mengajak seluruh warga sekolah senam bersama dan sesi relaksasi kesadaran penuh (mindfulness).',
        langkahKegiatan: ['Membuat koreografi senam kreasi siswa berdurasi 7 menit.', 'Memandu senam serentak di lapangan utama.', 'Sesi relaksasi pernapasan terarah untuk ketenangan mental.'],
        alatDanBahan: ['Sound system', 'Musik pengiring bugar'],
        peranGuru: 'Koordinator Acara & Penilai Sumatif',
        bentukAsesmen: 'Asesmen Sumatif (Koreografi Senam & Panduan Relaksasi)',
      },
      {
        no: 5,
        tahap: 'Refleksi & Tindak Lanjut',
        namaAktivitas: 'Buku Pemantau Kebiasaan Sehat Harian 30 Hari',
        alokasiJP: 4,
        tujuanAktivitas: 'Menjaga keberlanjutan minum air putih 2 liter, tidur cukup 8 jam, dan aktivitas fisik rutin.',
        langkahKegiatan: ['Mendesain lembar tabel pemantau kebiasaan sehat pribadi.', 'Menetapkan target capaian 30 hari.', 'Refleksi perubahan energi dan stamina diri.'],
        alatDanBahan: ['Lembar Pemantau Kebiasaan Sehat', 'Spidol centang'],
        peranGuru: 'Pemantau Kebiasaan Sehat Siswa & Motivator',
        bentukAsesmen: 'Evaluasi Portofolio Pemantau Kebiasaan Sehat',
      },
    ],
    rencanaAsesmen: {
      diagnostik: 'Skrining gaya hidup sehat dan kuesioner kesejahteraan emosional awal.',
      formatif: 'Penilaian kebersihan dan komposisi saat workshop bekal sehat serta kekompakan kelompok.',
      sumatif: 'Gelar Aksi Bugar Sehat (Kreasi bekal sehat, senam irama, dan pembiasaan gaya hidup bugar).',
    },
  },
  {
    tema: 'Kewirausahaan',
    judulDefault: 'Wirausaha Muda Kreatif: Gelar Karya & Pameran Produk Olahan Pangan Lokal Berdaya Jual',
    tagline: 'Menumbuhkan mentalitas inovatif, keuletan, dan literasi finansial praktis',
    deskripsi: 'Projek ini melatih jiwa kewirausahaan berkarakter etis melalui eksplorasi potensi pangan lokal (misal: singkong, ubi, jagung, pisang) menjadi aneka camilan modern bernilai tambah dan berdaya jual.',
    relevansi: 'Kemandirian finansial dan keterampilan adaptif adalah modal penting masa depan. Siswa diajarkan bagaimana merancang ide bisnis sederhana, menghitung harga pokok produksi (HPP), dan melayani pembeli dengan integritas.',
    dimensiTarget: [
      {
        dimensi: 'Kreatif',
        elemen: 'Menghasilkan Gagasan Orisinal',
        subElemen: 'Merancang Inovasi Produk',
        targetFase: 'Menghubungkan gagasan-gagasan yang ada dalam merancang produk olahan yang unik dan memiliki nilai tambah kompetitif.',
        rubrik: {
          bb: 'Hanya menjual kembali barang pabrikan tanpa proses pengolahan kreatif.',
          mb: 'Mampu mengolah bahan baku namun resep dan penyajian masih sama persis dengan yang umum di pasaran.',
          bsh: 'Berhasil menciptakan variasi rasa atau kemasan baru yang membedakan produknya dari produk sejenis.',
          sb: 'Menciptakan inovasi olahan pangan lokal berkelas yang diminati pasar serta memiliki merek (branding) kuat.',
        },
      },
      {
        dimensi: 'Mandiri',
        elemen: 'Percaya Diri, Tangguh, dan Adaptif',
        subElemen: 'Menyusun Rencana dan Menjalankan Usaha Mandiri',
        targetFase: 'Menyusun langkah-langkah konkret dalam menjalankan usaha rintisan dan ulet menghadapi pasang surut penjualan.',
        rubrik: {
          bb: 'Cepat menyerah jika barang belum laku atau menghadapi kendala modal.',
          mb: 'Mulai belajar mencatat pemasukan dan pengeluaran dengan arahan guru pendamping.',
          bsh: 'Mampu menyusun pembukuan sederhana secara rapi dan gigih menawarkan produk dengan ramah.',
          sb: 'Menunjukkan naluri wirausaha yang matang, mampu menganalisis laba rugi, dan adaptif mengubah strategi pemasaran.',
        },
      },
    ],
    alurAktivitas: [
      {
        no: 1,
        tahap: 'Pengenalan',
        namaAktivitas: 'Menemukan Potensi Emas di Sekitar: Eksplorasi Pangan Lokal',
        alokasiJP: 4,
        tujuanAktivitas: 'Mengenal keunggulan komoditas pangan lokal yang melimpah namun berharga murah.',
        langkahKegiatan: ['Riset harga bahan mentah (singkong/ubi/pisang) di pasar tradisional.', 'Studi kasus merek kuliner sukses berbasis bahan lokal.', 'Brainstorming ide olahan kekinian.'],
        alatDanBahan: ['Katalog pangan lokal', 'Lembar Kerja Ide Bisnis'],
        peranGuru: 'Fasilitator Ide & Pengarah Inovasi Nilai Tambah',
        bentukAsesmen: 'Asesmen Diagnostik Minat Wirausaha',
      },
      {
        no: 2,
        tahap: 'Kontekstualisasi',
        namaAktivitas: 'Menghitung Cuan: Perhitungan Modal, HPP, & Penetapan Harga Jual',
        alokasiJP: 6,
        tujuanAktivitas: 'Memahami literasi finansial dasar dalam menentukan harga pokok produksi dan laba wajar.',
        langkahKegiatan: ['Menghitung biaya bahan baku, gas, kemasan, dan tenaga kerja.', 'Menentukan margin keuntungan realistis (20-30%).', 'Membuat daftar harga resmi produk.'],
        alatDanBahan: ['Format Tabel HPP Sederhana', 'Kalkulator'],
        peranGuru: 'Mentor Literasi Finansial & Akuntansi Dasar',
        bentukAsesmen: 'Penilaian Lembar Kerja HPP',
      },
      {
        no: 3,
        tahap: 'Aksi',
        namaAktivitas: 'Produksi & Branding: Memasak dan Mengemas Produk Estetik',
        alokasiJP: 14,
        tujuanAktivitas: 'Memproduksi olahan pangan berkualitas higienis dan membuat label kemasan (branding) menarik.',
        langkahKegiatan: ['Uji coba rasa resep (Uji Rasa Masakan) antar kelompok.', 'Memasak produk dalam skala penjualan.', 'Mendesain stiker logo dan menempelkannya pada wadah ramah lingkungan.'],
        alatDanBahan: ['Bahan baku olahan pangan', 'Wadah kemasan makanan', 'Stiker logo kemasan'],
        peranGuru: 'Supervisor Higienitas & Pengarah Desain Branding',
        bentukAsesmen: 'Penilaian Kualitas Produk & Kemasan',
      },
      {
        no: 4,
        tahap: 'Aksi',
        namaAktivitas: 'Market Day / Bazar Usaha Muda Sekolah',
        alokasiJP: 8,
        tujuanAktivitas: 'Mempraktikkan teknik promosi, penjualan langsung, pelayanan pelanggan, dan pencatatan kasir.',
        langkahKegiatan: ['Membuka stan bazar dengan dekorasi menarik.', 'Melayani pembeli dengan senyum, salam, dan sapa.', 'Mencatat setiap transaksi pada buku kas penjualan.'],
        alatDanBahan: ['Meja stan bazar', 'Kotak uang kembalian', 'Buku nota kasir'],
        peranGuru: 'Pengawas Bazar & Penilai Sumatif Kinerja Penjualan',
        bentukAsesmen: 'Asesmen Sumatif (Kinerja Pelayanan & Penjualan Market Day)',
      },
      {
        no: 5,
        tahap: 'Refleksi & Tindak Lanjut',
        namaAktivitas: 'Laporan Laba Rugi & Refleksi Mental Wirausaha',
        alokasiJP: 4,
        tujuanAktivitas: 'Mengevaluasi hasil penjualan dan mengambil hikmah tentang ketekunan serta integritas wirausaha.',
        langkahKegiatan: ['Menghitung total omset dan laba bersih yang didapatkan.', 'Membahas dinamika menghadapi pembeli yang beragam.', 'Merencanakan pemanfaatan laba (ditabung / sedekah sosial).'],
        alatDanBahan: ['Buku Kas Keuangan', 'Lembar Refleksi Diri'],
        peranGuru: 'Fasilitator Refleksi & Penilai Akhir Portofolio',
        bentukAsesmen: 'Laporan Keuangan Akhir & Refleksi Karakter',
      },
    ],
    rencanaAsesmen: {
      diagnostik: 'Kuesioner ketertarikan wirausaha dan pengalaman berniaga.',
      formatif: 'Observasi keuletan menghitung HPP dan keterampilan kerja sama saat memasak.',
      sumatif: 'Market Day Bazar (Kreativitas produk, branding kemasan, pencatatan kas, dan pelayanan).',
    },
  },
];

/**
 * Menghasilkan Dokumen Modul Projek P5 Lengkap
 */
export function generateP5Document(
  profile: SchoolProfile,
  tema: P5Tema,
  kelasHarian?: KelasHarianData,
  customJudul?: string
): P5ProjectDocument {
  const preset = P5_TEMA_CATALOG.find((p) => p.tema === tema) || P5_TEMA_CATALOG[0];

  const totalJP = preset.alurAktivitas.reduce((acc, curr) => acc + curr.alokasiJP, 0);

  // Sinkronisasi data siswa untuk lembar observasi
  const siswaList = kelasHarian && kelasHarian.daftarSiswa.length > 0
    ? kelasHarian.daftarSiswa
    : [
        { nis: '001', nama: 'Ahmad Fauzi' },
        { nis: '002', nama: 'Budi Santoso' },
        { nis: '003', nama: 'Citra Dewi Permata' },
        { nis: '004', nama: 'Dinda Ayu Lestari' },
        { nis: '005', nama: 'Eko Prasetyo' },
      ];

  const rekapObservasiSiswa: SiswaObservasiP5[] = siswaList.map((s, idx) => {
    const nilaiDimensi: { [dimensiKey: string]: 'BB' | 'MB' | 'BSH' | 'SB' } = {};
    preset.dimensiTarget.forEach((d) => {
      // Default: BSH (Berkembang Sesuai Harapan) dengan variasi realistis
      const variasi: ('BB' | 'MB' | 'BSH' | 'SB')[] = ['BSH', 'BSH', 'SB', 'MB', 'BSH'];
      nilaiDimensi[d.dimensi] = variasi[(idx + d.dimensi.length) % variasi.length];
    });

    const sNis = (s as any).nis || (s as any).nisn || String(idx + 1);

    return {
      nis: sNis,
      nama: s.nama,
      nilaiDimensi,
      catatanProses: `Menunjukkan keaktifan positif selama pelaksanaan projek ${preset.tema}. Mampu berkolaborasi dan menyelesaikan penugasan tepat waktu.`,
    };
  });

  return {
    id: `p5_${tema.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
    judulProjek: customJudul || preset.judulDefault,
    tema,
    jenjang: profile.jenjang,
    fase: profile.jenjang === 'SD/MI' ? 'Fase C' : profile.jenjang === 'SMP/MTs' ? 'Fase D' : 'Fase E',
    kelas: profile.kelasUtama,
    tahunAjaran: profile.tahunAjaran,
    alokasiTotalJP: totalJP,
    namaSekolah: profile.namaSekolah,
    koordinatorProjek: profile.namaGuru,
    fasilitatorList: [
      profile.namaGuru,
      'Guru Mata Pelajaran Kolaborator',
      'Guru Bimbingan Konseling / Wali Kelas',
    ],
    deskripsiSingkat: preset.deskripsi,
    relevansiProjek: preset.relevansi,
    dimensiTarget: preset.dimensiTarget,
    alurAktivitas: preset.alurAktivitas,
    rencanaAsesmen: preset.rencanaAsesmen,
    rekapObservasiSiswa,
    tanggalPenyusunan: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}
