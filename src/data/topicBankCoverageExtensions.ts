import {
  makeTopicEntry,
  type CurriculumTopicEntry,
  type ExactFaseCode,
  type TopicJenjangCategory,
} from './kurikulumTopicBankTypes';

function ext(
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
    sumberDokumen?: string;
    urlReferensi?: string;
    tahunVersi?: string;
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
    estimasiMenitSesi: 80,
    sumberDokumen:
      opts?.sumberDokumen ||
      'Kurasi Pedagogis AsesMerdeka — Merujuk SK Kepala BSKAP No. 046/H/KR/2025 & Panduan Mapel Kemendikdasmen',
    tahunVersi: opts?.tahunVersi || '2025/2026',
    urlReferensi: opts?.urlReferensi || 'https://kurikulum.kemendikdasmen.go.id/panduan-mapel',
    statusVerifikasiSumber: 'kurasi_internal',
    jenisKonten: 'kurasi_sistem',
  });
}

const BKPDM_020_DOC =
  'Kurasi AsesMerdeka merujuk pembaruan CP Keputusan Kepala BKPDM No. 020 Tahun 2026 (Agama & Budi Pekerti)';
const BKPDM_020_URL =
  'https://www.kemendikdasmen.go.id/siaran-pers/15636-capaian-pembelajaran-baru-telah-terbit-yang-berubah-hanya-mata-pelajaran-agama-dan-budi-pekerti';
const KMA_DOC =
  'Kurasi Rumpun Madrasah AsesMerdeka — Merujuk Regulasi CP Kemenag (KMA; verifikasi naskah lokal disarankan)';

export const EXTENSION_SUBJECT_TOPICS: CurriculumTopicEntry[] = [
  // =====================================================================
  // SD/MI FASE A PENGENALAN (Kelas 1-2) untuk kelengkapan katalog SD
  // =====================================================================
  ext(
    'ipas-fa-s1-pancaindra-tubuh', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase A', 'Pemahaman Alam Awal',
    'Mengenal Pancaindra Manusia, Kebersihan Tubuh, dan Benda Hidup–Tak Hidup di Lingkungan',
    'Peserta didik dapat menyebutkan fungsi kelima pancaindra serta membedakan ciri benda hidup dan benda tak hidup di sekitar rumah/kelas.',
    'Catatan kurikulum: IPAS wajib dimulai pada Fase B; materi Fase A ini disiapkan sebagai pengenalan observasi lingkungan awal terpadu.',
    'Mengamati sifat benda sekitar menggunakan pancaindra secara aman.',
    ['Mengamati benda sehari-hari'],
    ['Mencocokkan pancaindra dengan kegunaannya dan mengelompokkan makhluk hidup vs benda mati'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2' }
  ),
  ext(
    'ipas-fa-s1-keluarga-denah-rumah', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase A', 'Pemahaman Sosial Awal',
    'Mengenal Silsilah Keluarga Inti, Peran Anggota Keluarga, dan Denah Sederhana Rumah ke Sekolah',
    'Peserta didik dapat menceritakan peran anggota keluarga di rumah serta menunjukkan arah kanan–kiri sederhana menuju ruang di sekolah.',
    'Latih menggambar denah sederhana posisi meja kelas dan rute aman menuju sekolah.',
    'Memahami peran sosial dalam keluarga dan orientasi arah ruang sekitar.',
    ['Mengenal anggota keluarga'],
    ['Menyebutkan tugas anggota keluarga dan arah menuju ruangan sekolah pada denah'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2' }
  ),
  ext(
    'ipas-fa-s1-cuaca-musim-sehari', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase A', 'Pemahaman Alam Awal',
    'Mengenal Cuaca Cerah, Berawan, Hujan serta Penyesuaian Pakaian dan Kegiatan Sehari-hari',
    'Peserta didik dapat mengenali tanda cuaca harian dan memilih perlengkapan serta tindakan aman saat hujan atau terik.',
    'Ajak mengamati langit pagi dan menghubungkan payung/jas hujan/topi dengan perlindungan diri.',
    'Mengamati pola cuaca harian untuk menjaga keselamatan dan kesehatan diri.',
    ['Pengamatan lingkungan sekitar'],
    ['Mencocokkan kondisi cuaca dengan pakaian/aktivitas aman yang tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2' }
  ),
  ext(
    'ipas-fa-s2-hemat-air-listrik-kelas', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase A', 'Peduli Lingkungan Awal',
    'Kebiasaan Hemat Air, Mematikan Lampu Siang Hari, dan Memilah Sampah Organik–Plastik',
    'Peserta didik dapat mempraktikkan cara sederhana menghemat air keran dan membuang sampah daun vs plastik pada tempat terpisah.',
    'Gunakan aktivitas praktik langsung di kelas untuk membedakan sisa makanan/daun dan kemasan plastik.',
    'Membiasakan perilaku hemat sumber daya dan kebersihan kelas sehari-hari.',
    ['Benda hidup & lingkungan Fase A'],
    ['Memilah sampah contoh ke tempat organik/anorganik dengan benar'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ipas-fa-s1-pancaindra-tubuh'], relatedTopicIds: ['ipas-fa-s1-pancaindra-tubuh'], suggestedGrade: '2' }
  ),
  ext(
    'ipas-fa-s2-cahaya-suara-hewan', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase A', 'Pemahaman Alam Awal',
    'Sumber Cahaya Alami–Buatan dan Gerak serta Suara Hewan di Sekitar Rumah',
    'Peserta didik dapat membedakan sumber cahaya matahari/lampu dan menirukan cara bergerak serta tempat hidup hewan peliharaan sekitar.',
    'Bandingkan ruang terang vs gelap serta hewan pemakan tumbuhan dan hewan pemakan daging sederhana.',
    'Mengidentifikasi kebutuhan cahaya dan ciri hewan peliharaan/sekitar.',
    ['Pancaindra & benda hidup'],
    ['Menyebutkan kegunaan cahaya dan perbedaan cara bergerak minimal 3 hewan sekitar'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '2' }
  ),
  ext(
    'ipas-fa-s2-kerja-sama-tetangga', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD/MI', 'Fase A', 'Pemahaman Sosial Awal',
    'Peristiwa Penting Keluarga dan Kebiasaan Saling Membantu di Lingkungan Tetangga',
    'Peserta didik dapat menceritakan peristiwa berkesan keluarga dan menyebutkan bentuk kerja sama santun dengan tetangga sekitar rumah.',
    'Dorong bercerita tentang kerja bakti lingkungan atau menjenguk tetangga sakit.',
    'Menghargai kebersamaan keluarga dan peran tolong-menolong antartetangga.',
    ['Peran anggota keluarga'],
    ['Menceritakan contoh sikap peduli tetangga dalam kehidupan sehari-hari'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ipas-fa-s1-keluarga-denah-rumah'], relatedTopicIds: ['ipas-fa-s1-keluarga-denah-rumah'], suggestedGrade: '2' }
  ),

  // Bahasa Inggris Fase A (Pengenalan Opsional SD Awal)
  ext(
    'bing-fa-s1-hello-alphabet-numbers', 'Bahasa Inggris', 'SD/MI', 'Fase A', 'Listening & Speaking',
    'Greetings (Good Morning/Bye), Alphabet Sounds, and Counting 1–10 in Class',
    'Peserta didik dapat mengucapkan salam sederhana serta membilang 1–10 menggunakan lagu dan gambar benda kelas.',
    'Catatan kurikulum: Bahasa Inggris wajib dimulai Fase B; topik Fase A ini merupakan pengenalan lisan awal bertumpu lagu dan gambar.',
    'Merespons sapaan dasar guru dan mengenali angka 1–10 secara lisan.',
    ['Mengenal angka 1–10 bahasa Indonesia'],
    ['Merespons sapaan sederhana dan menghitung 1–10 benda dengan tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1' }
  ),
  ext(
    'bing-fa-s1-colors-shapes-body', 'Bahasa Inggris', 'SD/MI', 'Fase A', 'Listening & Viewing',
    'Basic Colors (Red, Blue, Yellow, Green) and Parts of My Face (Eyes, Nose, Mouth)',
    'Peserta didik dapat menunjuk benda kelas sesuai warna dasar yang disebutkan dan menyebutkan nama bagian wajah secara lisan.',
    'Permainan "Point to something blue!" dan "Touch your nose!" dengan gerak ceria.',
    'Menghubungkan kosakata warna dasar dan bagian tubuh dengan objek nyata.',
    ['Salam dasar'],
    ['Menunjuk warna dan bagian wajah sesuai instruksi lisan singkat dengan benar'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2' }
  ),
  ext(
    'bing-fa-s1-classroom-toys-pets', 'Bahasa Inggris', 'SD/MI', 'Fase A', 'Speaking & Viewing',
    'My School Bag, Pencils, Toys, and Familiar Pets ("It is a cat / a book")',
    'Peserta didik dapat menyebutkan nama 5 perlengkapan sekolah atau hewan jinak populer dalam frasa pendek "It is a...".',
    'Gunakan kartu gambar tunggal benda sekolah dan hewan sekitar anak.',
    'Mengenali kosakata benda kelas dan hewan peliharaan secara sederhana.',
    ['Kosakata warna & angka 1–10'],
    ['Menyebutkan minimal 5 benda/hewan dengan pola "It is a..." tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2' }
  ),
  ext(
    'bing-fa-s2-family-fruits-snacks', 'Bahasa Inggris', 'SD/MI', 'Fase A', 'Listening & Speaking',
    'My Family (Mother, Father, Brother, Sister) and Favorite Fruits ("I like bananas")',
    'Peserta didik dapat mengenalkan anggota keluarga inti secara lisan dan menyebutkan buah kesukaan dengan pola sederhana.',
    'Gunakan gambar keluarga kecil dan kartu buah warna-warni.',
    'Mengungkapkan identitas anggota keluarga dan kesukaan buah sederhana.',
    ['Angka dan benda dasar'],
    ['Mencocokkan kata family member dengan gambar serta mengucapkan "I like..."'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bing-fa-s1-classroom-toys-pets'], relatedTopicIds: ['bing-fa-s1-classroom-toys-pets'], suggestedGrade: '2' }
  ),
  ext(
    'bing-fa-s2-action-verbs-song', 'Bahasa Inggris', 'SD/MI', 'Fase A', 'Listening & Doing',
    'Simple Action Commands ("Stand up, Sit down, Clap, Jump") & Polite Words ("Please/Thank you")',
    'Peserta didik dapat merespons instruksi aksi dasar di kelas secara tepat serta mengucapkan "Thank you" dan "Sorry".',
    'Metode Total Physical Response (TPR) dipadu lagu anak sederhana.',
    'Merespons instruksi fisik sederhana di kelas dan membiasakan ungkapan santun.',
    ['Greetings & parts of face'],
    ['Merespons minimal 4 instruksi gerak kelas dengan tindakan tepat'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['bing-fa-s1-hello-alphabet-numbers'], relatedTopicIds: ['bing-fa-s1-hello-alphabet-numbers'], suggestedGrade: '2' }
  ),
  ext(
    'bing-fa-s2-mini-picture-talk', 'Bahasa Inggris', 'SD/MI', 'Fase A', 'Speaking & Presenting',
    'Show and Tell Mini: Describing One Favorite Toy with Color & Number',
    'Peserta didik dapat menunjukkan satu benda favorit dan menyebutkan nama, jumlah, serta warnanya dalam dua frasa pendek bahasa Inggris.',
    'Contoh: "Look! One blue ball. I like it!" dengan bimbingan guru.',
    'Menggabungkan angka, warna, dan nama benda dalam pengenalan lisan mini.',
    ['Colors, numbers, & family'],
    ['Mengucapkan kombinasi jumlah + warna + nama benda secara jelas'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['bing-fa-s1-colors-shapes-body'], relatedTopicIds: ['bing-fa-s1-colors-shapes-body'], suggestedGrade: '2' }
  ),

  // SENI dan Budaya Fase A (SD 1-2) & tambah Sem 1/2 agar >= 3 tiap semester
  ext(
    'seni-fa-s1-titik-garis-warna', 'SENI dan Budaya', 'SD/MI', 'Fase A', 'Mengalami (Seni Rupa)',
    'Mengenal Unsur Titik, Garis Lurus–Lengkung, Bidang, dan Warna Dasar dalam Gambar Ekspresif',
    'Peserta didik dapat mengeksplorasi variasi garis tipis–tebal dan warna primer untuk menggambar pengalaman lingkungan sekitar.',
    'Latih menggambar rumah, pohon, atau keluarga bebas menggunakan kombinasi garis dan warna dasar rapi.',
    'Mengenali unsur rupa dasar dan mengekspresikan pengalaman pribadi melalui gambar.',
    ['Memegang pensil warna/krayon'],
    ['Gambar memanfaatkan minimal 3 variasi garis serta warna dasar bersih'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1' }
  ),
  ext(
    'seni-fa-s1-irama-gerak-tubuh', 'SENI dan Budaya', 'SD/MI', 'Fase A', 'Mengalami (Musik & Tari)',
    'Mengenal Bunyi Tubuh, Ketukan Lagu Anak, dan Meniru Gerak Alam (Pohon–Burung–Ombak)',
    'Peserta didik dapat bertepuk mengikuti tempo lagu anak dan menirukan gerak makhluk hidup sekitar secara ekspresif dan tertib ruang.',
    'Gunakan tepuk tangan/hentak kaki sebagai ritme pengiring gerak meniru angin atau hewan.',
    'Mengalami ritme tubuh dan kesadaran ruang gerak ekspresif awal.',
    ['Bergerak mengikuti hitungan 1–8'],
    ['Gerakan dan tepukan sinkron dengan tempo sedang dan cepat tanpa saling bertabrakan'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1' }
  ),
  ext(
    'seni-fa-s1-kolase-kertas', 'SENI dan Budaya', 'SD/MI', 'Fase A', 'Menciptakan (Seni Rupa)',
    'Membuat Karya Gunting–Tempel (Kolase / Mozaik) dari Kertas Warna atau Daun Kering Bersih',
    'Peserta didik dapat menyusun potongan kertas atau bahan alam kering menjadi gambar mozaik sederhana dengan penggunaan lem dan gunting aman.',
    'Tekankan kebersihan meja kerja dan cara aman menggunakan gunting kertas tumpul.',
    'Mengembangkan koordinasi motorik halus dan rasa keindahan tata tempel kolase.',
    ['Unsur garis dan bentuk datar'],
    ['Kolase menutupi pola gambar utama rapi tanpa lem berceceran'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2' }
  ),
  ext(
    'seni-fa-s2-cetak-cap-stempel', 'SENI dan Budaya', 'SD/MI', 'Fase A', 'Menciptakan (Seni Rupa)',
    'Teknik Cetak Tinggi Sederhana dengan Bahan Sekitar (Pelepah Pisang / Jari / Stempel Karet)',
    'Peserta didik dapat mencetak pola berulang sederhana pada kertas gambar memakai cap bahan alam dengan komposisi warna teratur.',
    'Bimbing membuat pola bingkai berirama selang-seling warna dan bentuk cap.',
    'Mengenali prinsip pengulangan pola cetak sederhana dan kebersihan pewarnaan.',
    ['Unsur rupa & kolase Sem 1'],
    ['Cetakan menunjukkan pengulangan motif jelas dan pewarnaan terkontrol'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['seni-fa-s1-titik-garis-warna'], relatedTopicIds: ['seni-fa-s1-titik-garis-warna'], suggestedGrade: '2' }
  ),
  ext(
    'seni-fa-s2-bermain-peran-ekspresi', 'SENI dan Budaya', 'SD/MI', 'Fase A', 'Mengekspresikan (Teater & Tari)',
    'Ekspresi Wajah–Suara dalam Bermain Peran Cerita Pendek dan Tari Kelompok Sederhana',
    'Peserta didik dapat mengekspresikan watak senang/sedih/berani dalam peran singkat dan menyelaraskan langkah tari kelompok mengikuti aba-aba.',
    'Latih mimik wajah dan suara jelas saat dialog dua anak di depan kelas.',
    'Menumbuhkan rasa percaya diri berekspresi estetis dan kebersamaan tampil kelompok.',
    ['Irama dan gerak tubuh Sem 1'],
    ['Ekspresi wajah/suara sesuai peran dan menghargai penampilan teman sekelas'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['seni-fa-s1-irama-gerak-tubuh'], relatedTopicIds: ['seni-fa-s1-irama-gerak-tubuh'], suggestedGrade: '2' }
  ),
  ext(
    'seni-fa-s2-cerita-karya-sendiri', 'SENI dan Budaya', 'SD/MI', 'Fase A', 'Merefleksikan',
    'Menceritakan Karya Sendiri dan Memberi Pujian Santun kepada Karya Teman Kelas',
    'Peserta didik dapat menjelaskan apa yang digambar atau dibuat dalam karyanya dan menyebutkan satu hal yang disukai dari karya teman.',
    'Biasakan kalimat apresiasi santun seperti "Aku suka warna cerah pada gambar rumahmu".',
    'Merefleksikan karya seni diri sendiri dan menghargai karya orang lain secara positif.',
    ['Kolase & cetak cap'],
    ['Menjelaskan isi karya pribadi jelas dan memberi pujian konkret kepada teman'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['seni-fa-s1-kolase-kertas'], relatedTopicIds: ['seni-fa-s1-kolase-kertas'], suggestedGrade: '2' }
  ),

  // Tambahan topik agar PJOK Fase A–F, PAI Fase A/D/F, PP Fase A–F, dan Mapel Madrasah punya >= 3 topik per semester
  ext(
    'pjok-fa-s1-jalan-lari-imbangan', 'PJOK', 'SD/MI', 'Fase A', 'Gerak Lokomotor & Keseimbangan',
    'Gerak Dasar Berjalan, Berlari, Melompat Aman, dan Sikap Keseimbangan Tubuh Sederhana',
    'Peserta didik dapat melakukan jalan lurus–berkelok, lari pelan, dan berdiri keseimbangan satu kaki secara aman.',
    'Gunakan permainan lintasan garis kelas/lapangan datar bebas rintangan tajam.',
    'Menguasai keseimbangan tubuh dan pola gerak lokomotor dasar anak.',
    ['Koordinasi langkah dasar'],
    ['Melakukan variasi jalan/lari/keseimbangan 5 detik tanpa bertabrakan'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1' }
  ),
  ext(
    'pjok-fa-s1-lempar-tangkap-air', 'PJOK', 'SD/MI', 'Fase A', 'Gerak Manipulatif & Kebersihan',
    'Melempar–Menangkap Bola Lunak Berpasangan serta Kebiasaan Cuci Tangan & Kebersihan Kuku/Gigi',
    'Peserta didik dapat menangkap bola besar/kecil dengan dua tangan serta mempraktikkan 6 langkah cuci tangan pakai sabun usai bermain.',
    'Kaitkan bermain bola lunak dengan kebiasaan hidup bersih sebelum makan.',
    'Menggabungkan kontrol lempar-tangkap dasar dengan praktik kebersihan diri.',
    ['Gerak tangan & koordinasi mata'],
    ['Menangkap bola pantul/lemparan dekat tepat serta mencuci tangan menyeluruh'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2' }
  ),
  ext(
    'pjok-fa-s1-sikap-duduk-berdiri-sehat', 'PJOK', 'SD/MI', 'Fase A', 'Kebugaran & Postur Sehat',
    'Menjaga Sikap Tubuh Tegak Saat Duduk, Berdiri, Mengangkat Tas, dan Istirahat Tidur Cukup',
    'Peserta didik dapat mempraktikkan cara duduk membaca yang baik di bangku kelas dan mengenali pentingnya tidur malam teratur.',
    'Periksa posisi punggung tegak dan jarak mata ke buku saat belajar.',
    'Membiasakan postur ergonomis dasar demi kesehatan tulang belakang anak.',
    ['Kebiasaan kelas harian'],
    ['Menunjukkan posisi duduk/berdiri tegak seimbang tanpa membungkuk berlebihan'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2' }
  ),
  ext(
    'pjok-fa-s2-gerak-irama-berpasangan', 'PJOK', 'SD/MI', 'Fase A', 'Aktivitas Gerak Berirama',
    'Bergerak Mengikuti Ketukan Lagu Sederhana Secara Tertib Bersama Kelompok',
    'Peserta didik dapat mengayunkan tangan dan melangkah sesuai ketukan hitungan 1–8 berpasangan atau berkelompok.',
    'Latih keselarasan gerak langkah kaki dan ayunan lengan perlahan lalu sedang.',
    'Menyelaraskan gerak tubuh dengan irama hitungan dan kerja sama teman.',
    ['Gerak lokomotor dasar'],
    ['Gerak lengan–kaki serempak mengikuti irama ketukan dasar'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['pjok-fa-s1-jalan-lari-imbangan'], relatedTopicIds: ['pjok-fa-s1-jalan-lari-imbangan'], suggestedGrade: '2' }
  ),
  ext(
    'pjok-fa-s2-permainan-tradisional-sportif', 'PJOK', 'SD/MI', 'Fase A', 'Permainan & Karakter',
    'Permainan Tradisional Anak (Gobak Sodor Mini / Engklek / Lompat Tali) dan Sikap Tertib Antre',
    'Peserta didik dapat menaati aturan giliran permainan tradisional bersama teman serta menerima menang atau kalah dengan gembira.',
    'Fokus pada kerja sama, menunggu giliran sabar, dan jujur mengakui batas garis.',
    'Membangun kebugaran menyenangkan lewat permainan lokal penuh kejujuran.',
    ['Lari & keseimbangan Sem 1'],
    ['Bermain sesuai aturan antre dan jujur tanpa mendorong teman'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['pjok-fa-s1-lempar-tangkap-air'], relatedTopicIds: ['pjok-fa-s1-lempar-tangkap-air'], suggestedGrade: '2' }
  ),
  ext(
    'pjok-fa-s2-keselamatan-bermain-air', 'PJOK', 'SD/MI', 'Fase A', 'Keselamatan & Pola Sehat',
    'Mengenal Area Aman Bermain di Lingkungan Sekolah dan Makanan Bergizi–Minum Air Putih',
    'Peserta didik dapat membedakan jajanan bersih tertutup dari makanan kurang sehat serta mengidentifikasi benda/area berbahaya saat bermain.',
    'Ajarkan mengenali lantai licin, pinggir kolam/sungai tanpa pengawasan, dan memilih air putih bersih.',
    'Menjaga kewaspadaan keselamatan bermain serta memilih asupan aman sehari-hari.',
    ['Kebersihan diri Sem 1'],
    ['Menyebutkan minimal 3 aturan bermain aman dan memilih contoh jajanan sehat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['pjok-fa-s1-sikap-duduk-berdiri-sehat'], relatedTopicIds: ['pjok-fa-s1-sikap-duduk-berdiri-sehat'], suggestedGrade: '2' }
  ),

  // PAI Fase A (SD 1-2) & Fase D/F tambahan agar >= 3 tiap semester
  ext(
    'pai-fa-s1-rukun-iman-islam-basmalah', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase A', 'Al-Qur’an & Akidah',
    'Mengenal Huruf Hijaiyah, Membaca Basmalah Sebelum Aktivitas, serta Mengenal Rukun Iman & Islam',
    'Peserta didik dapat mengenali huruf hijaiyah dasar berharakat fathah/kasrah/dhammah serta menyebutkan urutan Rukun Islam dan Rukun Iman sederhana.',
    'Biasakan membaca basmalah/hamdalah pada kegiatan baik harian dan lagu pengenal rukun.',
    'Mengenal dasar keimanan, syukur harian, dan pengenalan awal huruf Al-Qur’an.',
    ['Kebiasaan doa sebelum belajar'],
    ['Melafalkan basmalah–hamdalah tepat dan menyebutkan 5 Rukun Islam berurutan'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fa-s1-kasih-sayang-keluarga', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase A', 'Akhlak Mulia',
    'Berbakti kepada Orang Tua, Menghormati Guru, dan Bersikap Jujur–Kasih Sayang di Rumah',
    'Peserta didik dapat mempraktikkan tutur kata lembut kepada orang tua dan guru serta membiasakan sikap berkata jujur.',
    'Ceritakan kisah singkat keteladanan kasih sayang Nabi Muhammad saw. kepada anak dan keluarga.',
    'Membiasakan adab santun kepada orang tua, guru, dan sesama.',
    ['Interaksi santun keluarga'],
    ['Memberi contoh konkret perilaku hormat orang tua/guru dan berkata jujur'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fa-s1-kebersihan-wudhu-awal', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase A', 'Fikih Ibadah Awal',
    'Cinta Kebersihan Badan–Pakaian dan Mengenal Urutan Tata Cara Wudhu Sederhana',
    'Peserta didik dapat menyebutkan bagian tubuh yang dibasuh saat wudhu secara berurutan dan menjaga kebersihan tempat belajar.',
    'Gunakan gambar kartu urutan wudhu dari niat/mencuci wajah–tangan–kepala–kaki secara tertib.',
    'Mengenal syarat kebersihan sebelum ibadah serta urutan praktis wudhu.',
    ['Kebersihan diri anak'],
    ['Mengurutkan kartu gerakan wudhu secara tepat dan hemat air'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fa-s2-surah-pendek-doa', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase A', 'Al-Qur’an & Ibadah',
    'Hafalan Surah Al-Fatihah / Al-Ikhlas–An-Nas beserta Pesan Keimanan & Doa Harian',
    'Peserta didik dapat melafalkan Surah Al-Fatihah dan Al-Ikhlas dengan jelas serta memahami makna bersyukur atas nikmat Allah.',
    'Latih pelafalan bertahap per ayat lengkap dengan arti ringkas pengesaan Allah dan syukur.',
    'Membaca surah pendek harian dan membiasakan berdoa sebelum–sesudah kegiatan.',
    ['Mengenal huruf hijaiyah Sem 1'],
    ['Pelafalan ayat jelas dan menyebutkan contoh cara bersyukur dalam hidup anak'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['pai-fa-s1-rukun-iman-islam-basmalah'], relatedTopicIds: ['pai-fa-s1-rukun-iman-islam-basmalah'], suggestedGrade: '2', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fa-s2-gerakan-shalat-kisah-nabi', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase A', 'Fikih & Keteladanan',
    'Mengenal Lima Waktu Shalat Fardu dan Keteladanan Sifat Jujur–Amanah Nabi Muhammad saw.',
    'Peserta didik dapat menyebutkan nama serta jumlah rakaat 5 shalat fardu dan meneladani sifat jujur (Al-Amin) dari kisah masa kecil Nabi.',
    'Gunakan nyanyian/tabel jumlah rakaat Subuh–Isya serta kisah kejujuran dalam kehidupan sekolah.',
    'Mengenal kewajiban shalat lima waktu dan mencintai sifat jujur terpuji.',
    ['Urutan wudhu Sem 1'],
    ['Menyebutkan 5 waktu shalat dan rakaatnya tepat beserta contoh sifat Al-Amin di kelas'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['pai-fa-s1-kebersihan-wudhu-awal'], relatedTopicIds: ['pai-fa-s1-kebersihan-wudhu-awal'], suggestedGrade: '2', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fa-s2-kerja-sama-hemat-teman', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase A', 'Akhlak Sosial',
    'Hidup Rukun Berbagi dengan Teman, Tidak Mengganggu Sesama, dan Hidup Hemat',
    'Peserta didik dapat mempraktikkan sikap mau berbagi alat tulis/makanan sehat serta tidak mengejek atau bertengkar dengan teman.',
    'Simulasi berbagi saat bermain kelompok dan membiasakan menabung uang saku secukupnya.',
    'Mengamalkan kerukunan, kasih sayang kepada sesama, dan perilaku tidak boros.',
    ['Hormat orang tua dan guru Sem 1'],
    ['Menunjukkan tindakan berbagi dan menyelesaikan perbedaan mainan secara santun'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['pai-fa-s1-kasih-sayang-keluarga'], relatedTopicIds: ['pai-fa-s1-kasih-sayang-keluarga'], suggestedGrade: '2', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  // PAI SMP Fase D tambahan (lengkapi jadi 3 Sem1 + 3 Sem2)
  ext(
    'pai-fd-s1-alam-khalifah-lingkungan', 'Pendidikan Agama Islam & Budi Pekerti', 'SMP/MTs', 'Fase D', 'Al-Qur’an & Etika Ekologis',
    'Tanggung Jawab Manusia sebagai Khalifah Pelestari Alam (QS. Ar-Rum: 41 & Pengendalian Konsumsi)',
    'Peserta didik dapat mengaitkan pesan larangan merusak daratan dan lautan dengan kepedulian mengurangi sampah plastik serta pemborosan makanan.',
    'Lakukan audit kebiasaan hemat air dan makanan siswa sebagai wujud ibadah ekologis nyata.',
    'Membangun kesadaran tanggung jawab spiritual terhadap pelestarian lingkungan.',
    ['Tartil & amanah SD'],
    ['Rancangan aksi kecil pengurangan sampah di kelas merujuk dalil pelestarian alam'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '7', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fd-s2-amanah-kepemimpinan-syukur', 'Pendidikan Agama Islam & Budi Pekerti', 'SMP/MTs', 'Fase D', 'Akhlak & Muamalah Remaja',
    'Amanah Organisasi, Menepati Janji, dan Larangan Judi Daring / Perilaku Konsumtif Berisiko',
    'Peserta didik dapat menganalisis bahaya judi online (maisir), utang konsumtif, dan ingkar janji bagi masa depan pelajar serta merancang pengelolaan amanah pengurus kelompok.',
    'Kontraskan keberkahan rezeki dari ikhtiar jujur dan menabung vs ilusi keuntungan instan perjudian digital.',
    'Membentengi remaja dari praktik maisir/eksploitasi digital dengan nilai amanah dan qanaah.',
    ['Ibadah & etika digital'],
    ['Analisis risiko sosial-finansial praktik maisir digital tepat lengkap dengan strategi penolakan sehat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['pai-fd-s1-ibadah-sujud-puasa'], relatedTopicIds: ['pai-fd-s1-ibadah-sujud-puasa'], suggestedGrade: '9', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),

  // Tambahan PP Fase A, Fase D, Fase E, Fase F agar setiap semester minimal 3 topik
  ext(
    'ppkn-fa-s1-aku-cinta-indonesia-lagu', 'Pendidikan Pancasila', 'SD/MI', 'Fase A', 'Bhinneka & NKRI Awal',
    'Mengenal Bendera Merah Putih, Lagu Kebangsaan Indonesia Raya, dan Sikap Hormat Upacara',
    'Peserta didik dapat mengenali warna serta makna sederhana bendera Merah Putih dan menyanyikan lagu Indonesia Raya bait awal dengan sikap khidmat.',
    'Latih sikap berdiri tertib saat menyanyikan lagu kebangsaan tanpa gaduh.',
    'Menumbuhkan rasa cinta tanah air dan tertib upacara di lingkungan sekolah.',
    ['Aturan sekolah'],
    ['Menyebutkan simbol bendera Merah Putih dan menyanyikan Indonesia Raya dengan sikap tertib'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1' }
  ),
  ext(
    'ppkn-fa-s2-jujur-peduli-pancasila', 'Pendidikan Pancasila', 'SD/MI', 'Fase A', 'Pancasila',
    'Penerapan Nilai Jujur, Berdoa, dan Menghargai Pendapat Teman saat Bermain Kelompok',
    'Peserta didik dapat menerapkan perilaku jujur tidak curang saat permainan kelas serta bersedia mendengar giliran berbicara teman.',
    'Kaitkan sila 1, 2, dan 4 Pancasila dengan kebiasaan berdoa sebelum belajar dan berbagi peran bermain.',
    'Mengamalkan nilai jujur, sopan, dan musyawarah anak dalam kegiatan kelas.',
    ['Mengenal 5 simbol Pancasila Sem 1'],
    ['Menunjukkan sikap jujur dan menunggu giliran berbicara saat diskusi kelompok kecil'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ppkn-fa-s1-simbol-keluarga'], relatedTopicIds: ['ppkn-fa-s1-simbol-keluarga'], suggestedGrade: '2' }
  ),
  ext(
    'ppkn-fd-s1-norma-hak-konstitusi-smp', 'Pendidikan Pancasila', 'SMP/MTs', 'Fase D', 'UUD NRI Tahun 1945',
    'Peran Warga Muda dalam Musyawarah Desa/OSIS dan Keseimbangan Kebebasan Berekspresi di Sekolah',
    'Peserta didik dapat menyusun aturan kesepakatan kelas yang selaras dengan hak belajar seluruh teman serta membedakan kritik membangun dari perundungan verbal.',
    'Latih merancang tata tertib kelas partisipatif dan mekanisme penyampaian aspirasi santun ke pengurus OSIS/sekolah.',
    'Mempraktikkan budaya demokrasi deliberatif yang menghargai hak semua warga sekolah.',
    ['Pancasila & hierarki hukum'],
    ['Usulan aturan kelas mencerminkan musyawarah adil tanpa diskriminasi minoritas'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '7' }
  ),
  ext(
    'ppkn-fd-s2-pelestarian-kearifan-kebangsaan', 'Pendidikan Pancasila', 'SMP/MTs', 'Fase D', 'Bhinneka Tunggal Ika',
    'Harmoni Kolaborasi Budaya Lokal dan Semangat Gotong Royong Kebangsaan di Era Digital',
    'Peserta didik dapat merancang konten/proyek kolaboratif kelas yang memperkenalkan kearifan gotong royong daerah Nusantara secara positif di ruang digital.',
    'Contoh sambatan, subak, mapalus, atau sasi sebagai kekayaan praktik gotong royong warga Indonesia.',
    'Menghidupkan nilai gotong royong tradisi Nusantara dalam aksi sosial remaja masa kini.',
    ['Kebhinekaan anti-intoleransi Sem 2'],
    ['Proyek mengenalkan praktik gotong royong Nusantara lengkap dengan relevansi aksinya di sekolah'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ppkn-fd-s2-kebhinekaan-anti-intoleransi'], relatedTopicIds: ['ppkn-fd-s2-kebhinekaan-anti-intoleransi'], suggestedGrade: '9' }
  ),
  ext(
    'ppkn-fe-s1-gotongroyong-ekonomi-pancasila', 'Pendidikan Pancasila', 'SMA/MA', 'Fase E', 'Pancasila & Ekonomi Kerakyatan',
    'Nilai Keadilan Sosial Pancasila (Pasal 33 UUD 1945) dan Kewirausahaan Sosial Pelajar',
    'Peserta didik dapat menganalisis semangat kekeluargaan dan keberlanjutan alam dalam sistem ekonomi Pancasila serta merancang ide aksi ekonomi sosial berbasis koperasi/komunitas sekolah.',
    'Bandingkan motif keuntungan jangka pendek semata vs keseimbangan kesejahteraan pekerja, warga sekitar, dan kelestarian alam.',
    'Menerapkan nilai Sila ke-5 dalam menilai keadilan ekonomi dan tanggung jawab sosial usaha.',
    ['Pancasila ideologi terbuka Sem 1'],
    ['Analisis kasus mengaitkan Pasal 33 UUD 1945 dengan kelestarian lingkungan dan kesejahteraan bersama'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  ext(
    'ppkn-fe-s2-partisipasi-kebijakan-publik', 'Pendidikan Pancasila', 'SMA/MA', 'Fase E', 'UUD NRI Tahun 1945 & Kewargaan',
    'Partisipasi Warga Muda dalam Pengawasan Layanan Publik Daerah dan Literasi Demokrasi Bersih',
    'Peserta didik dapat menelusuri jalur resmi penyampaian aspirasi warga (musrenbang, kanal pengaduan layanan publik, petisi etis) untuk menyelesaikan persoalan lingkungan lokal.',
    'Latih menyusun surat aspirasi fakta tentang fasilitas transportasi/sampah/taman kota ke instansi relevan dengan bahasa konstruktif.',
    'Menjalankan hak dan kewajiban warga negara secara prosedural, kritis, dan solutif.',
    ['Hak konstitusional warga Sem 1'],
    ['Draf usulan kebijakan memuat deskripsi masalah faktual, dasar hak layanan, dan alternatif solusi'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ppkn-fe-s1-konstitusi-hak-warga'], relatedTopicIds: ['ppkn-fe-s1-konstitusi-hak-warga'], suggestedGrade: '10' }
  ),
  ext(
    'ppkn-ff-s1-integrasi-krisis-identitas', 'Pendidikan Pancasila', 'SMA/MA', 'Fase F', 'Bhinneka Tunggal Ika',
    'Mengelola Polarisasi Politik Identitas dan Merawat Kohesi Kebangsaan di Tahun Demokrasi & Ruang Siber',
    'Peserta didik dapat mendeteksi teknik manipulasi emosi berbasis isu suku/agama dalam kampanye digital dan merumuskan etika diskusi publik lintas pilihan yang damai.',
    'Bandingkan perdebatan kebijakan berbasis program & bukti vs serangan identitas personal (ad hominem/SARA).',
    'Menjaga persatuan nasional dan kematangan berdemokrasi di ruang sosial fisik maupun digital.',
    ['Demokrasi Pancasila Sem 1'],
    ['Analisis wacana publik memisahkan adu program dari polarisasi identitas SARA'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '12' }
  ),
  ext(
    'ppkn-ff-s2-proyek-kewargaan-berkelanjutan', 'Pendidikan Pancasila', 'SMA/MA', 'Fase F', 'Praktik Kewarganegaraan Pancasila',
    'Proyek Kewarganegaraan (Citizen Project): Aksi Kolaboratif Penyelesaian Masalah Komunitas Sekolah/Desa',
    'Peserta didik dapat mengidentifikasi persoalan hak/lingkungan/inklusivitas setempat, memetakan regulasi serta pihak terkait, dan mengeksekusi proyek kampanye/advokasi tertib.',
    'Dokumentasikan proses observasi kebutuhan warga, koordinasi pemangku kepentingan, pelaksanaan aksi, dan refleksi dampak.',
    'Mengintegrasikan seluruh elemen Pancasila, UUD 1945, Kebhinekaan, dan NKRI dalam karya kewargaan nyata.',
    ['Demokrasi, otonomi daerah, dan HAM'],
    ['Portofolio proyek kewargaan menyertakan bukti pelaksanaan dan evaluasi ketercapaian manfaat sosial'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['ppkn-ff-s1-demokrasi-keadilan-sosial', 'ppkn-ff-s1-kasus-ham-penegakan'], relatedTopicIds: ['ppkn-ff-s1-kasus-ham-penegakan'], suggestedGrade: '12' }
  ),

  // PJOK SMP & SMA/SMK tambahan agar >= 3 tiap semester
  ext(
    'pjok-fd-s1-renang-keselamatan-air', 'PJOK', 'SMP/MTs', 'Fase D', 'Aktivitas Air / Keselamatan Lingkungan',
    'Keselamatan di Lingkungan Air, Teknik Pernapasan Dasar, dan Pencegahan Risiko Tenggelam',
    'Peserta didik dapat menjelaskan aturan keselamatan kolam/perairan terbuka serta mempraktikkan kontrol pernapasan dan gerak meluncur aman sesuai fasilitas sekolah.',
    'Bila sekolah tidak memiliki akses kolam renang, fokuskan pada keterampilan simulasi penyelamatan tepi air (reach/throw without going in) dan P3K air.',
    'Memahami prinsip keselamatan air dan prosedur pertolongan aman bagi diri sendiri dan rekan.',
    ['Keselamatan bermain SD'],
    ['Prosedur pertolongan tepi air tanpa membahayakan penolong dijelaskan dan disimulasikan benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  ext(
    'pjok-fd-s2-senam-irama-kreasi', 'PJOK', 'SMP/MTs', 'Fase D', 'Aktivitas Gerak Berirama',
    'Merangkai Kombinasi Langkah Kaki dan Ayunan Lengan Senam Berirama Berkelompok',
    'Peserta didik dapat menyusun rangkaian senam berirama 4×8 hitungan dengan transisi gerak antartempo secara selaras dan kompak.',
    'Kombinasikan langkah dasar (marching, V-step, grapevine) dengan ayunan lengan terkoordinasi pernapasan.',
    'Mengembangkan koordinasi ritmis kelompok, daya tahan aerobik ringan, dan keluwesan gerak.',
    ['Senam irama dasar SD'],
    ['Rangkaian 4×8 hitungan menampilkan transisi antarpola langkah sinkron bersama musik'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '8' }
  ),
  ext(
    'pjok-fe-s1-biomekanika-postur-k3', 'PJOK', 'SMA/MA', 'Fase E', 'Kesehatan Kerja & Ergonomi Gerak',
    'Analisis Postur Ergonomis, Pencegahan Cedera Leher–Punggung, & Hidrasi Latihan Fisik',
    'Peserta didik dapat mengevaluasi kebiasaan duduk belajar atau mengangkat beban harian agar aman bagi tulang belakang dan menyusun jadwal peregangan mikro.',
    'Kaitkan teknik mengangkat benda (tekuk lutut bukan pinggang) dengan prinsip tuas mekanik otot rangka.',
    'Menerapkan prinsip biomekanika sederhana dalam pencegahan cedera harian dan olahraga.',
    ['Zona nadi & P3K SMP'],
    ['Simulasi postur angkat beban/duduk ergonomis tepat dan jadwal peregangan terstruktur'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10' }
  ),
  ext(
    'pjok-fe-s1-permainan-bola-keterampilan-tinggi', 'PJOK', 'SMA/MA', 'Fase E', 'Keterampilan Gerak Spesifik',
    'Penguasaan Teknik Kombinasi Permainan Bola Besar/Kecil serta Kepemimpinan Wasit & Skor',
    'Peserta didik dapat mempraktikkan kombinasi teknik oper–kendali–serang dalam situasi permainan sesungguhnya sekaligus memimpin pertandingan sebagai wasit yang adil.',
    'Rotasikan peran pemain, kapten penyemangat tim, dan wasit pencatat pelanggaran untuk membangun tanggung jawab etis.',
    'Mengintegrasikan teknik olahraga dengan peran kepemimpinan aturan fair play.',
    ['Passing/dribbling SMP'],
    ['Kombinasi teknik dalam permainan berjalan efektif dan keputusan wasit sesuai aturan resmi dasar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10' }
  ),
  ext(
    'pjok-fe-s2-manajemen-stres-aktif', 'PJOK', 'SMA/MA', 'Fase F', 'Kesehatan Mental & Gaya Hidup Aktif',
    'Manajemen Stres Akademik Melalui Aktivitas Aerobik Teratur, Tidur Berkualitas, dan Kesehatan Reproduksi',
    'Peserta didik dapat menganalisis kaitan aktivitas fisik rutin terhadap penurunan stres serta menyusun komitmen pribadi aktivitas fisik mingguan bebas zat adiktif.',
    'Gabungkan data pelacakan langkah/durasi olahraga pribadi 2 minggu dengan refleksi kebugaran & kualitas tidur.',
    'Merancang gaya hidup aktif berkelanjutan untuk kesehatan jasmani dan mental dewasa muda.',
    ['Program FITT & gizi remaja'],
    ['Catatan refleksi aktivitas fisik 2 minggu mengevaluasi kaitan kebugaran, fokus belajar, dan istirahat'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12' }
  ),
  ext(
    'pjok-fe-s2-event-olahraga-inklusi', 'PJOK', 'SMA/MA', 'Fase F', 'Organisasi & Sportivitas',
    'Merancang Turnamen Kecil Kelas Berprinsip Inklusi, Keselamatan Lapangan, dan Evaluasi Kinerja',
    'Peserta didik dapat merancang bagan turnamen mini kelas yang ramah bagi berbagai tingkat kemampuan fisik teman lengkap dengan jadwal pemanasan dan kesiagaan P3K.',
    'Tekankan adaptasi aturan permainan agar semua siswa berpartisipasi aman dan bermakna.',
    'Menerapkan manajemen kegiatan olahraga sekolah yang inklusif, aman, dan sportif.',
    ['Taktik permainan & kepemimpinan wasit'],
    ['Proposal mini turnamen mencakup aturan adaptasi inklusif, protokol keselamatan, dan evaluasi panitia'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['pjok-fe-s1-permainan-bola-keterampilan-tinggi'], relatedTopicIds: ['pjok-fe-s1-permainan-bola-keterampilan-tinggi'], suggestedGrade: '12' }
  ),

  // =====================================================================
  // KELENGKAPAN MADRASAH (MI Fase A-C, MTs Fase D, MA Fase E-F) & SMK (Arab/Informatika)
  // =====================================================================
  // MI & MTs tambahan
  ext(
    'qhadis-mi-s1-huruf-iqra-pendek', 'Al-Qur\'an Hadis (MI)', 'SD/MI', 'Fase A', 'Al-Qur’an & Hadis Dasar',
    'Mengenal Huruf Hijaiyah Berharakat, Surah Al-Fatihah–An-Nas, dan Adab Membaca Al-Qur’an',
    'Peserta didik dapat membedakan bunyi huruf hijaiyah berharakat fathah/kasrah/dhammah/tanwin serta melafalkan surah pendek harian dengan tertib.',
    'Latih pengucapan huruf yang mirip (س/ش/ص, ح/ه/خ) secara perlahan dan adab menyentuh mushaf dalam keadaan bersih.',
    'Membangun kecintaan melafalkan ayat Al-Qur’an secara tertib dan jelas.',
    ['Pengenalan huruf abjad Arab awal'],
    ['Pelafalan huruf serupa dibedakan tepat dan bacaan surah pendek harian lancar'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-mi-s1-al-qariah-hadis-niat', 'Al-Qur\'an Hadis (MI)', 'SD/MI', 'Fase A', 'Kandungan Ayat & Hadis',
    'Surah Al-Ma’un/Al-Kautsar dan Hadis Tentang Kebersihan serta Niat Baik dalam Belajar',
    'Peserta didik dapat menceritakan pesan sederhana kepedulian kepada anak yatim/fakir dan pentingnya niat ikhlas serta menjaga kebersihan lingkungan kelas.',
    'Hubungkan pesan Surah Al-Ma’un dengan aksi berbagi bekal atau membantu teman kesulitan di sekolah.',
    'Mengamalkan pesan kepedulian sosial dan keikhlasan niat dari ayat dan hadis pendek.',
    ['Hafalan Al-Fatihah'],
    ['Menyebutkan 2 pesan kepedulian sosial dari surah pilihan disertai contoh aksi nyata'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-mi-s1-tajwid-izhar-ikhfa', 'Al-Qur\'an Hadis (MI)', 'SD/MI', 'Fase A', 'Ilmu Tajwid Dasar',
    'Mengenal Bacaan Dengung (Ghunnah) dan Bacaan Jelas pada Surah Pendek Pilihan',
    'Peserta didik dapat membedakan bunyi bacaan mendengung (nun/mim bertasydid) dan bacaan pendek–panjang mad thabi’i 2 harakat saat tilawah.',
    'Gunakan ketukan jari 2 ketuk untuk panjang mad thabi’i dan tanda warna khusus pada huruf tasydid.',
    'Menerapkan panjang–pendek harakat dan dengung dasar saat membaca ayat.',
    ['Huruf berharakat & sukun'],
    ['Panjang 2 ketukan mad thabi’i dan dengung tasydid terbaca konsisten pada 3 ayat contoh'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-mi-s2-silaturahmi-salat-berbakti', 'Al-Qur\'an Hadis (MI)', 'SD/MI', 'Fase A', 'Kandungan Hadis Akhlak',
    'Meneladani Hadis Keutamaan Silaturahmi, Hormat Orang Tua, dan Menyayangi Anak Kecil–Tua',
    'Peserta didik dapat membiasakan menyapa santun keluarga besar dan menyayangi adik maupun menghormati kakak sesuai tuntunan hadis.',
    'Simulasikan adab bertamu dan mengetuk pintu santun saat bersilaturahmi.',
    'Mengamalkan adab kekeluargaan dan kasih sayang lintas usia dalam keseharian.',
    ['Hadis niat & kebersihan Sem 1'],
    ['Mempraktikkan adab menyapa dan bertamu santun dalam bermain peran kelas'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['qhadis-mi-s1-al-qariah-hadis-niat'], relatedTopicIds: ['qhadis-mi-s1-al-qariah-hadis-niat'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-mi-s2-at-tin-duha-syukur', 'Al-Qur\'an Hadis (MI)', 'SD/MI', 'Fase A', 'Al-Qur’an & Refleksi',
    'Surah Adh-Dhuha / At-Tin serta Hadis Bersyukur dan Menjaga Lisan Baik',
    'Peserta didik dapat melafalkan Surah At-Tin/Adh-Dhuha dan mengambil pelajaran tentang kesempurnaan ciptaan manusia yang patut disyukuri lewat kata baik.',
    'Latih mengenali kata syukur atas kesehatan mata, tangan, dan keluarga dengan tidak berkata kasar.',
    'Menumbuhkan rasa syukur dan membiasakan ucapan yang baik atau diam.',
    ['Surah pendek & tajwid dasar Sem 1'],
    ['Melafalkan surah pilihan dengan panjang mad teratur dan memberi contoh ucapan syukur'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['qhadis-mi-s1-tajwid-izhar-ikhfa'], relatedTopicIds: ['qhadis-mi-s1-tajwid-izhar-ikhfa'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-mi-s2-jujur-amanah-yatim', 'Al-Qur\'an Hadis (MI)', 'SD/MI', 'Fase A', 'Integrasi Hadis Sosial',
    'Membiasakan Jujur (Menghindari Bohong/Ingkar) dan Gemar Sedekah Kepada Sesama',
    'Peserta didik dapat membedakan tanda amanah vs khianat sederhana dari hadis serta membiasakan menabung sebagian uang saku untuk berbagi.',
    'Gunakan cerita sederhana mengembalikan pensil teman yang tertinggal dan kotak infak kelas.',
    'Mengintegrasikan kejujuran dan kepedulian sosial anak pada kegiatan sekolah.',
    ['Silaturahmi & kebersihan'],
    ['Menyebutkan 3 tanda perilaku jujur amanah di kelas'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),

  // Tambahan Akidah, Fikih, SKI, Bahasa Arab untuk MI/MTs/MA agar >= 3 tiap semester
  ext(
    'akidah-mi-s1-kalimat-thayyibah-syahadat', 'Akidah Akhlak (MI)', 'SD/MI', 'Fase A', 'Akidah Dasar',
    'Kalimat Thayyibah (Basmalah, Hamdalah, Subhanallah), Dua Kalimat Syahadat, & Sifat Wajib Sederhana',
    'Peserta didik dapat menggunakan kalimat thayyibah pada peristiwa harian yang tepat (memulai kerja, menerima nikmat, melihat keajaiban alam).',
    'Kartu situasi harian untuk memasangkan kalimat thayyibah yang sesuai.',
    'Membiasakan ucapan zikir positif dan keimanan tauhid sejak dini.',
    ['Kebiasaan doa anak'],
    ['Memasangkan kalimat thayyibah dengan situasi sehari-hari secara tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-mi-s1-asmaul-husna-adab-tidur', 'Akidah Akhlak (MI)', 'SD/MI', 'Fase A', 'Akhlak & Adab Anak',
    'Asmaul Husna (Ar-Rahman, Ar-Rahim, Al-Malik) dan Adab Mandi, Berpakaian, & Tidur',
    'Peserta didik dapat meneladani sifat kasih sayang Ar-Rahman–Ar-Rahim kepada hewan/tumbuhan dan membiasakan doa serta adab sebelum tidur/berpakaian.',
    'Latih adab menutup aurat rapi, mendahulukan sisi kanan, serta berdoa sebelum tidur.',
    'Mewujudkan keyakinan kasih sayang Allah dalam adab kemandirian anak.',
    ['Kalimat thayyibah'],
    ['Mempraktikkan doa dan urutan adab kemandirian berpakaian/tidur dengan tertib'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-mi-s1-hormat-santun-malas-jauhi', 'Akidah Akhlak (MI)', 'SD/MI', 'Fase A', 'Akhlak Terpuji & Tercela',
    'Membiasakan Hidup Bersih, Rajin Belajar, dan Menghindari Sikap Sombong maupun Malas',
    'Peserta didik dapat membedakan contoh sikap rendah hati vs sombong saat mendapat pujian nilai atau mainan baru.',
    'Gunakan cerita bergambar perbandingan siswa rajin membantu vs malas dan pamer.',
    'Membina kerendahan hati, kerajinan, dan kedisiplinan belajar.',
    ['Hormat orang tua'],
    ['Mengidentifikasi sikap sombong/malas dalam cerita serta usul perbaikan sikap santun'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-mi-s2-iman-malaikat-salam', 'Akidah Akhlak (MI)', 'SD/MI', 'Fase A', 'Akidah & Adab Sosial',
    'Mengenal Tugas Pokok Malaikat Allah dan Kebiasaan Mengucap–Menjawab Salam dengan Ramah',
    'Peserta didik dapat menyebutkan nama serta tugas malaikat utama secara ringkas dan membiasakan salam saat masuk kelas atau bertemu guru/teman.',
    'Kaitkan keyakinan adanya malaikat pencatat amal baik/buruk (Raqib–Atid) dengan kehati-hatian berbuat baik meski tak terlihat guru.',
    'Menumbuhkan kesadaran pengawasan ilahi yang mendorong kejujuran mandiri anak.',
    ['Syahadat & kalimat thayyibah Sem 1'],
    ['Mencocokkan 5 malaikat dengan tugasnya dan mempraktikkan salam ramah'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['akidah-mi-s1-kalimat-thayyibah-syahadat'], relatedTopicIds: ['akidah-mi-s1-kalimat-thayyibah-syahadat'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-mi-s2-taawudz-keteladanan-nuh-ibrahim', 'Akidah Akhlak (MI)', 'SD/MI', 'Fase A', 'Kisah Teladan Nabi',
    'Mengenal Kalimat Ta’awudz dan Teladan Kesabaran Nabi Nuh a.s. serta Keberanian Nabi Ibrahim a.s.',
    'Peserta didik dapat mengucapkan ta’awudz saat merasa takut/marah dan menceritakan teladan keteguhan kesabaran para nabi dalam membela kebenaran.',
    'Ceritakan kisah singkat penuh hikmah yang sesuai usia kelas awal tanpa detail menakutkan.',
    'Menumbuhkan keberanian berbuat benar dan pengelolaan rasa takut/marah secara positif.',
    ['Akhlak terpuji Sem 1'],
    ['Menjelaskan pesan sabar dan teguh pada kebenaran dari kisah teladan nabi'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-mi-s2-rukun-bertetangga-alam', 'Akidah Akhlak (MI)', 'SD/MI', 'Fase A', 'Adab Lingkungan',
    'Adab Bersin–Menguap, Menyayangi Tumbuhan–Hewan Peliharaan, dan Hidup Rukun dengan Tetangga',
    'Peserta didik dapat mempraktikkan adab menutup mulut saat bersin/menguap serta merawat tanaman atau hewan peliharaan dengan penuh tanggung jawab.',
    'Hubungkan kasih sayang kepada makhluk hidup dengan perintah menjaga kebersihan halaman.',
    'Mengintegrasikan adab kesehatan sehari-hari dan kasih sayang sesama makhluk.',
    ['Asmaul Husna Ar-Rahman'],
    ['Mempraktikkan etika bersin/menguap higienis dan langkah merawat tanaman/hewan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['akidah-mi-s1-asmaul-husna-adab-tidur'], relatedTopicIds: ['akidah-mi-s1-asmaul-husna-adab-tidur'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),

  // Fikih MI (Fase A), SKI MI (Fase A/B/C fallback note), Bahasa Arab MI (Fase A)
  ext(
    'fikih-mi-s1-syahadat-bersuci-air', 'Fikih (MI)', 'SD/MI', 'Fase A', 'Fikih Ibadah Awal',
    'Lima Rukun Islam, Jenis Air Suci Menyucikan, dan Praktik Istinja’ / Kebersihan Diri Anak',
    'Peserta didik dapat membedakan air bersih suci untuk wudhu dari air kotor tercampur najis serta menjaga kebersihan setelah buang air.',
    'Fokuskan pada kebiasaan praktis hidup suci dan rapi sebagai syarat sah shalat kelak.',
    'Mengenal dasar thaharah kebersihan pribadi sesuai fikih ibadah anak.',
    ['Kebersihan badan'],
    ['Membedakan air layak bersuci vs tidak layak dan langkah istinja’ higienis tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-s1-wudhu-tayamum-anak', 'Fikih (MI)', 'SD/MI', 'Fase A', 'Fikih Ibadah Awal',
    'Rukun Wudhu Tertib, Hal yang Membatalkan Wudhu, dan Mengenal Kemudahan Tayamum',
    'Peserta didik dapat mempraktikkan urutan membasuh anggota wudhu secara berurutan (tertib) serta menyebutkan hal dasar yang membatalkan wudhu.',
    'Gunakan demonstrasi langsung dan cek bagian wajib agar tidak terlewat siku atau mata kaki.',
    'Menguasai tata cara wudhu sah secara berurutan dan sadar penghematan air.',
    ['Air suci & kebersihan Sem 1'],
    ['Urutan 6 rukun wudhu dipraktikkan tertib tanpa tertukar urutannya'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-s1-azan-iqamah-niat', 'Fikih (MI)', 'SD/MI', 'Fase A', 'Fikih Shalat',
    'Mengenal Lafal Azan–Iqamah, Jawaban Pendengar Azan, dan Adab Memasuki Masjid/Mushala',
    'Peserta didik dapat mengenali fungsi azan sebagai penanda waktu shalat dan mempraktikkan ketenangan adab saat berada di tempat ibadah.',
    'Ajarkan menghormati jamaah yang sedang shalat dan merapikan alas kaki.',
    'Menumbuhkan kecintaan menghadiri shalat berjamaah dengan adab masjid santun.',
    ['Lima Rukun Islam'],
    ['Menirukan jawaban azan sederhana dan menyebutkan 3 adab menjaga ketenangan mushala'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-s2-bacaan-gerakan-shalat', 'Fikih (MI)', 'SD/MI', 'Fase A', 'Fikih Shalat',
    'Praktik Gerakan dan Bacaan Pokok Shalat Fardu (Takbiratul Ihram hingga Salam) Secara Tuma’ninah',
    'Peserta didik dapat mempraktikkan gerakan berdiri–rukuk–i’tidal–sujud–duduk antara dua sujud–salam dengan jeda tenang (tuma’ninah).',
    'Bimbing secara bertahap dimulai dari kesempurnaan postur rukuk dan sujud sebelum menghafal bacaan panjang.',
    'Melaksanakan rangkaian gerakan shalat fardu tertib dan tenang.',
    ['Wudhu tertib Sem 1'],
    ['Seluruh posisi gerakan rukun shalat dilakukan urut disertai jeda tuma’ninah'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['fikih-mi-s1-wudhu-tayamum-anak'], relatedTopicIds: ['fikih-mi-s1-wudhu-tayamum-anak'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-s2-shalat-berjamaah-zikir', 'Fikih (MI)', 'SD/MI', 'Fase A', 'Fikih Ibadah Sosial',
    'Ketentuan Sederhana Shalat Berjamaah (Imam–Makmum Lurus Shaf) dan Zikir Singkat Pasca-Shalat',
    'Peserta didik dapat mengikuti aba-aba gerakan imam dalam shalat berjamaah tanpa mendahului serta membaca tasbih–tahmid–takbir singkat sesudahnya.',
    'Tekankan meluruskan barisan shaf dan larangan mendahului gerakan imam.',
    'Membiasakan disiplin kebersamaan dan kekhusyukan shalat berjamaah anak.',
    ['Gerakan shalat tuma’ninah'],
    ['Mengikuti gerakan imam tertib tidak mendahului dan shaf berdiri rapi'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['fikih-mi-s2-bacaan-gerakan-shalat'], relatedTopicIds: ['fikih-mi-s2-bacaan-gerakan-shalat'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-s2-mengenal-puasa-makanan', 'Fikih (MI)', 'SD/MI', 'Fase A', 'Fikih Ibadah & Konsumsi',
    'Mengenal Hikmah Ibadah Puasa Ramadhan dan Memilih Makanan–Minuman Halal Bersih Sehari-hari',
    'Peserta didik dapat menjelaskan arti puasa Ramadhan sebagai latihan sabar dan peduli sesama serta memeriksa label/kebersihan jajan halal.',
    'Gunakan konteks persiapan Ramadhan ramah anak dan membaca label halal kemasan sederhana.',
    'Menghubungkan makna puasa dengan pengendalian diri dan kehalalan asupan sehari-hari.',
    ['Rukun Islam & adab makan'],
    ['Menyebutkan hal yang membatalkan puasa serta ciri jajanan halal higienis dengan benar'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),

  // SKI (MI) & Bahasa Arab (MI) untuk Fase A/B/C
  ext(
    'ski-mi-s1-tradisi-arab-kelahiran-nabi', 'Sejarah Kebudayaan Islam / SKI (MI)', 'SD/MI', 'Fase A', 'Sejarah Islam Awal',
    'Kehidupan Masyarakat Arab Pra-Islam (Nilai Positif–Negatif) dan Masa Kecil Nabi Muhammad saw.',
    'Peserta didik dapat menceritakan keluhuran sifat jujur Nabi Muhammad saw. sejak masa kanak-kanak hingga pengasuhan kakek dan paman Abu Thalib.',
    'Catatan kurikulum: SKI secara resmi mulai pada Fase B Kelas 3 MI; entri Fase A ini adalah pengenalan sirah keteladanan anak.',
    'Mengenali keteladanan kejujuran, kerja keras, dan kasih sayang masa kecil Nabi Muhammad saw.',
    ['Kisah keteladanan nabi dasar'],
    ['Menyebutkan 3 sifat teladan masa kecil Nabi serta latar keluarga secara tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-mi-s1-al-amin-wahyu-awal', 'Sejarah Kebudayaan Islam / SKI (MI)', 'SD/MI', 'Fase A', 'Kenabian Awal',
    'Gelar Al-Amin saat Peristiwa Hajar Aswad dan Turunnya Wahyu Pertama di Gua Hira',
    'Peserta didik dapat meneladani kecerdasan solusi damai peletakan Hajar Aswad tanpa pertumpahan darah dan semangat membaca Iqra’.',
    'Tekankan pelajaran musyawarah mencari solusi adil ketika antarkelompok berselisih.',
    'Menghayati makna kejujuran Al-Amin dan semangat gemar membaca Iqra’.',
    ['Masa kecil Nabi'],
    ['Menceritakan kembali alasan gelar Al-Amin dan cara damai menyelesaikan sengketa Hajar Aswad'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-mi-s1-dakwah-sabar-habasyah', 'Sejarah Kebudayaan Islam / SKI (MI)', 'SD/MI', 'Fase A', 'Keteguhan Dakwah Awal',
    'Ketabahan Dakwah Periode Awal di Makkah dan Semangat Persaudaraan Hijrah ke Habasyah',
    'Peserta didik dapat menceritakan pentingnya kesabaran saat menghadapi kesulitan dan kerukunan saling melindungi sebagaimana kisah hijrah awal ke Habasyah.',
    'Soroti dialog santun penuh hormat yang disampaikan Ja’far bin Abi Thalib di hadapan Raja Najasyi.',
    'Mengapresiasi keteguhan prinsip yang tetap disampaikan secara damai dan santun.',
    ['Wahyu pertama Gua Hira'],
    ['Menyebutkan hikmah kesabaran dan komunikasi santun dalam peristiwa Habasyah'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-mi-s2-isra-miraj-sholat-madinah', 'Sejarah Kebudayaan Islam / SKI (MI)', 'SD/MI', 'Fase A', 'Peristiwa Besar Sirah',
    'Peristiwa Hijrah ke Yatsrib (Madinah) dan Semangat Persaudaraan Muhajirin–Anshar',
    'Peserta didik dapat mengaitkan persaudaraan Muhajirin–Anshar dengan sikap ramah menyambut teman pindahan baru di sekolah.',
    'Fokus pada makna empati berbagi tempat tinggal, pekerjaan, dan persatuan warga Madinah.',
    'Meneladani semangat persaudaraan, tolong-menolong, dan kerukunan menyambut sesama.',
    ['Ketabahan dakwah Makkah Sem 1'],
    ['Menjelaskan contoh nyata meneladani sikap Anshar terhadap teman baru di kelas'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ski-mi-s1-dakwah-sabar-habasyah'], relatedTopicIds: ['ski-mi-s1-dakwah-sabar-habasyah'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-mi-s2-piagam-madinah-fathu', 'Sejarah Kebudayaan Islam / SKI (MI)', 'SD/MI', 'Fase A', 'Kerukunan & Pemaaf',
    'Kerukunan Warga Madinah dan Sikap Pemaaf Agung Saat Pembebasan Kota Makkah (Fathu Makkah)',
    'Peserta didik dapat membedakan sikap balas dendam dengan sikap pemaaf mulia Nabi saw. saat Fathu Makkah serta manfaat hidup damai antarwarga berbeda.',
    'Hubungkan kisah Fathu Makkah dengan keberanian memaafkan teman yang mengakui kesalahan.',
    'Membangun karakter pemaaf, rendah hati saat menang, dan mencintai perdamaian.',
    ['Hijrah & persaudaraan Madinah'],
    ['Menyebutkan pelajaran memaafkan dari peristiwa Fathu Makkah dengan tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ski-mi-s2-isra-miraj-sholat-madinah'], relatedTopicIds: ['ski-mi-s2-isra-miraj-sholat-madinah'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-mi-s2-khulafaurasyidin-walisongo-mi', 'Sejarah Kebudayaan Islam / SKI (MI)', 'SD/MI', 'Fase A', 'Keteladanan Tokoh',
    'Mengenal Keteladanan Singkat Khulafaurasyidin dan Dakwah Santun Ulama Nusantara',
    'Peserta didik dapat mengenali keteladanan dermawan Abu Bakar–Utsman, keadilan Umar, kecintaan ilmu Ali, dan cara ramah Wali Songo menyebarkan kebaikan.',
    'Gunakan cerita pendek tiap tokoh sesuai daya tangkap siswa SD/MI.',
    'Mengenal tokoh panutan sejarah Islam dunia dan Nusantara yang santun dan amanah.',
    ['Sirah Nabi Sem 1–2'],
    ['Mencocokkan 4 khalifah/tokoh teladan dengan satu nilai karakter utamanya dengan tepat'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),

  // Bahasa Arab MI (Fase A)
  ext(
    'arab-mi-s1-taaruf-angka-madrasah', 'Bahasa Arab (MI)', 'SD/MI', 'Fase A', 'Istima’ & Kalam Dasar',
    'At-Ta’aruf Sederhana (Ismi... / Ahlan wa Sahlan) dan Angka Arab 1–10',
    'Peserta didik dapat menyapa teman dan memperkenalkan nama diri dalam bahasa Arab sederhana serta membilang 1–10.',
    'Gunakan lagu berulang dan tanya jawab lisan singkat "Ma ismuka/ismuki?".',
    'Mengucapkan sapaan dan identitas nama dasar dalam bahasa Arab dengan lafal jelas.',
    ['Mendengar bunyi kosakata dasar'],
    ['Menjawab pertanyaan "Ma ismuka?" dan membilang angka Arab 1–10 tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '1', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-mi-s1-alat-tulis-kelas', 'Bahasa Arab (MI)', 'SD/MI', 'Fase A', 'Mufradat & Qira’ah Awal',
    'Nama Perlengkapan Sekolah (Qalamun, Kitabun, Maktabun) Menggunakan هذا / هذه',
    'Peserta didik dapat menyebutkan minimal 6 benda ruang kelas dan menunjuk dengan isyarat هذا (mudzakkar) atau هذه (muannats dengan ta’ marbuthah).',
    'Tandai kata benda berakhiran ة memakai هذه secara visual berwarna.',
    'Mengenali kosakata benda sekolah dan pembedaan isyarat maskulin/feminin sederhana.',
    ['Perkenalan Sem 1'],
    ['Mencocokkan benda kelas dengan هذا atau هذه secara tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-mi-s1-usroti-anggota-keluarga', 'Bahasa Arab (MI)', 'SD/MI', 'Fase A', 'Kalam & Mufradat',
    'Usrati (Keluargaku: Abi, Ummi, Akhi, Ukhti) dalam Kalimat Pendek Bergambar',
    'Peserta didik dapat menyebutkan sebutan anggota keluarga inti bahasa Arab dan mengenalkan foto/gambar keluarga secara lisan singkat.',
    'Pola "Hadza abi, hadzihi ummi" disertai kartu gambar keluarga.',
    'Menghubungkan kosakata anggota keluarga dengan kata tunjuk sederhana.',
    ['Isim isyarah هذا/هذه'],
    ['Memperkenalkan anggota keluarga gambar dengan kosakata dan kata tunjuk sesuai gender'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-mi-s2-fawakih-alwan', 'Bahasa Arab (MI)', 'SD/MI', 'Fase A', 'Istima’ & Qira’ah',
    'Al-Alwan (Warna Dasar) dan Al-Fawakih (Buah-buahan Sekitar) dalam Frasa Sederhana',
    'Peserta didik dapat menyebutkan 5 warna dasar dan nama buah populer serta memadukan benda + warna sesuai bentuk katanya.',
    'Latih memasangkan gambar buah dengan warna bahasa Arab sederhana.',
    'Memperkaya perbendaharaan kata warna dan buah sehari-hari.',
    ['Benda kelas & keluarga Sem 1'],
    ['Mencocokkan gambar buah dan warnanya dalam kosakata Arab dasar'],
    '2 (Genap)', 'pengembangan', { prasyaratTopicIds: ['arab-mi-s1-alat-tulis-kelas'], relatedTopicIds: ['arab-mi-s1-alat-tulis-kelas'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-mi-s2-anggota-tubuh-hobi', 'Bahasa Arab (MI)', 'SD/MI', 'Fase A', 'Kalam & Kitabah Awal',
    'A’dha’ul Jismi (Anggota Tubuh) dan Menyalin Huruf Hijaiyah Sambung Kata Pendek',
    'Peserta didik dapat menunjuk bagian wajah/tangan saat disebutkan kosakata Arabnya serta menyalin huruf sambung kata pendek 3–4 huruf rapi.',
    'Permainan gerak sentuh bagian wajah sambil melatih penyambungan huruf awal–tengah–akhir.',
    'Mengenali kosakata anggota tubuh sekaligus terampil menulis sambung kata pendek Arab.',
    ['Membilang & mengenal huruf hijaiyah'],
    ['Menunjuk bagian tubuh sesuai instruksi lisan dan menyalin 4 kata sambung dengan benar'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-mi-s2-baiti-madrasati-mini', 'Bahasa Arab (MI)', 'SD/MI', 'Fase A', 'Integrasi Kalam',
    'Mengenal Ruangan Sekolah–Rumah Sederhana dan Dialog Tanya Jawab "Ma Hadza?"',
    'Peserta didik dapat melakukan percakapan berpasangan 2–3 giliran menggunakan tanya "Ma hadza/hadzihi?" dan "Man hadza?".',
    'Bedakan kata tanya benda ("Ma...") vs kata tanya orang ("Man...").',
    'Berinteraksi lisan berpasangan membedakan tanya benda dan tanya orang dalam bahasa Arab.',
    ['Keluarga & perlengkapan sekolah'],
    ['Dialog berpasangan memakai "Ma..." untuk benda dan "Man..." untuk anggota keluarga tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['arab-mi-s1-usroti-anggota-keluarga'], relatedTopicIds: ['arab-mi-s1-usroti-anggota-keluarga'], suggestedGrade: '2', sumberDokumen: KMA_DOC }
  ),

  // Lengkapi MTs & MA masing-masing agar tiap semester >= 3 topik
  ext(
    'fikih-mts-s1-sujud-puasa-mts', 'Fikih', 'SMP/MTs', 'Fase D', 'Fikih Ibadah',
    'Sujud Sahwi–Syukur–Tilawah dan Ketentuan Puasa Wajib–Sunnah serta I’tikaf Ramadhan',
    'Peserta didik dapat membedakan sebab pelaksanaan ketiga sujud dalam shalat serta menganalisis syarat, rukun, dan hikmah sosial puasa Ramadhan.',
    'Gunakan simulasi kasus lupa bilangan rakaat atau mendapat kabar gembira agar siswa mempraktikkan sujud yang sesuai.',
    'Menerapkan ketentuan penyempurna ibadah shalat dan puasa dengan benar.',
    ['Thaharah & shalat Sem 1'],
    ['Membedakan bacaan dan kondisi sujud sahwi vs tilawah vs syukur secara akurat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mts-s1-haji-sedekah-hibah', 'Fikih', 'SMP/MTs', 'Fase D', 'Fikih Ibadah & Sosial',
    'Ketentuan Manasik Haji–Umrah serta Perbedaan Zakat, Infak, Sedekah, Hadiah, dan Hibah',
    'Peserta didik dapat mengurutkan rukun–wajib haji dan membedakan akad pemberian sukarela (sedekah, hadiah, hibah) dari kewajiban zakat.',
    'Peta alur ihram–wuquf–thawaf–sa’i–tahallul dan manfaat wakaf produktif bagi pendidikan.',
    'Memahami tata urutan ibadah haji dan ragam filantropi sosial Islam.',
    ['Zakat Sem 1'],
    ['Urutan rukun haji vs wajib haji tepat; perbedaan zakat vs hibah/hadiah jelas'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mts-s2-qiradh-hutang-pinjam', 'Fikih', 'SMP/MTs', 'Fase D', 'Fikih Muamalah',
    'Akad Utang Piutang (Qardh), Gadai (Rahn), Sewa Jasa (Ijarah), dan Bagi Hasil (Mudharabah)',
    'Peserta didik dapat membedakan prinsip akad kerja sama adil (mudharabah/ijarah) dan syarat pencatatan utang agar terhindar dari perselisihan dan bunga ribawi.',
    'Simulasikan surat perjanjian kerja sama usaha kecil kelas yang jelas hak, tanggung jawab risiko, dan bagi hasilnya.',
    'Merancang kesepakatan muamalah transparan bebas eksploitasi dan riba.',
    ['Jual beli & khiyar Sem 2'],
    ['Membedakan rukun ijarah, rahn, dan mudharabah serta risiko penipuan utang tanpa catatan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['fikih-mts-s2-muamalah-halal-haram'], relatedTopicIds: ['fikih-mts-s2-muamalah-halal-haram'], suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mts-s2-jenazah-waris-awal', 'Fikih', 'SMP/MTs', 'Fase D', 'Fikih Kepedulian Sosial',
    'Kewajiban Pengurusan Jenazah (Fardu Kifayah) serta Pengenalan Tanggung Jawab Ahli Waris',
    'Peserta didik dapat mengurutkan empat kewajiban terhadap jenazah (memandikan, mengafani, menyalatkan, memakamkan) beserta tata cara shalat jenazah 4 takbir.',
    'Praktikkan bacaan dan urutan posisi imam pada shalat jenazah secara tenang dan khidmat.',
    'Memahami kewajiban fardu kifayah solidaritas umat kepada keluarga yang berduka.',
    ['Thaharah & shalat'],
    ['Urutan 4 takbir shalat jenazah dan adab takziah dijelaskan tertib'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  // Fikih MA Fase E & F tambahan (lengkapi jadi 3 Sem1 + 3 Sem2)
  ext(
    'fikih-ma-s1-konsep-fikih-ibadah-maqashid', 'Fikih / Ushul Fikih (MA)', 'SMA/MA', 'Fase E', 'Fikih Ibadah & Sosial',
    'Pemulasaraan Jenazah Lengkap, Zakat Produktif–Wakaf Uang, & Perlindungan Jiwa dalam Kaidah Fikih',
    'Peserta didik dapat menganalisis peran zakat produktif dan wakaf tunai dalam pemberdayaan umat berlandaskan kaidah dar’ul mafasid (mencegah bahaya lebih didahulukan).',
    'Bandingkan penyaluran zakat konsumtif vs modal kerja mustahiq mandiri.',
    'Menghubungkan kaidah fikih sosial dengan pengelolaan dana filantropi modern.',
    ['Fikih ibadah & muamalah MTs'],
    ['Rancangan program zakat/wakaf produktif selaras syarat mustahiq dan prinsip maslahat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '10', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-ma-s1-muamalah-ekonomi-syariah', 'Fikih / Ushul Fikih (MA)', 'SMA/MA', 'Fase F', 'Fikih Muamalah Lanjutan',
    'Akad Keuangan Syariah Modern (Murabahah, Musyarakah, Ijarah Muntahiyah Bittamlik) & Etika Transaksi Daring',
    'Peserta didik dapat mengevaluasi akad transaksi perbankan/fintech syariah serta syarat sah jual beli e-commerce (kejelasan objek, harga, serah terima risiko).',
    'Contrast pembiayaan berbasis margin jual beli transparan (murabahah) vs bunga majemuk konvensional.',
    'Menganalisis keabsahan transaksi keuangan digital modern melalui kaidah fikih muamalah.',
    ['Ushul fikih & maqashid'],
    ['Identifikasi perbedaan akad murabahah vs musyarakah tepat dan audit keabsahan transaksi e-commerce jelas'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-ma-s1-kaidah-ushul-ijtihad', 'Fikih / Ushul Fikih (MA)', 'SMA/MA', 'Fase F', 'Ushul Fikih Lanjutan',
    'Qawaid Fiqhiyyah Lima Kaidah Asasi dan Etika Perbedaan Pendapat Fikih (Ikhtilaf)',
    'Peserta didik dapat menerapkan lima kaidah dasar fikih (Al-Umuru bi Maqashidiha, Al-Yaqin la Yuzalu bisy-Syak, Al-Masyaqqah Tajlibut Taisir, dll.) pada kasus kontemporer.',
    'Tekankan etika berlapang dada terhadap perbedaan ijtihad cabang (furu’) tanpa memecah persatuan.',
    'Mengaplikasikan kaidah fikih kunci untuk menimbang kelonggaran hukum secara bijak dan toleran.',
    ['Ushul fikih sumber hukum'],
    ['Penetapan kaidah fikih yang cocok pada minimal 3 masalah baru sehari-hari akurat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-ma-s2-siyasah-kepemimpinan-publik', 'Fikih / Ushul Fikih (MA)', 'SMA/MA', 'Fase F', 'Fikih Siyasah & Tata Kelola',
    'Konsep Khilafah/Pemerintahan Berkeadilan (Siyasah Syar’iyyah), Amanah Publik, dan Cinta Tanah Air',
    'Peserta didik dapat menelaah prinsip musyawarah (syura), keadilan hukum, perlindungan warga minoritas, dan kewajiban menjaga ketertiban konstitusi NKRI menurut fikih siyasah.',
    'Kaitkan maqashid syariah dengan tujuan bernegara menjaga keselamatan agama, jiwa, akal, keluarga, dan harta warga.',
    'Menganalisis tata kelola kenegaraan yang adil, konstitusional, dan menghargai kebhinekaan.',
    ['Ushul fikih & sejarah Piagam Madinah'],
    ['Argumen kesejalanan prinsip keadilan siyasah dengan sistem musyawarah berkonstitusi jelas'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['fikih-ma-s1-ushul-fikih-maqashid'], relatedTopicIds: ['fikih-ma-s1-ushul-fikih-maqashid'], suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-ma-s2-munakahat-keluarga-sakinah', 'Fikih / Ushul Fikih (MA)', 'SMA/MA', 'Fase F', 'Fikih Keluarga',
    'Hukum Pernikahan (Munakahat), Pencegahan Pernikahan Usia Anak, dan Penguatan Keluarga Sakinah',
    'Peserta didik dapat menjelaskan rukun–syarat sah nikah, hikmah batas usia dewasa Undang-Undang Perkawinan bagi kesiapan mental–ekonomi–kesehatan, dan tanggung jawab hak suami–istri.',
    'Tekankan perlindungan hak anak/perempuan serta penyelesaian konflik rumah tangga secara bermartabat.',
    'Memahami regulasi fikih keluarga serta kesiapan holistik membangun keluarga berkeadilan.',
    ['Kaidah maslahat & maqashid'],
    ['Identifikasi rukun nikah serta argumen kemaslahatan kesiapan usia menikah tepat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),

  // Tambahan Al-Qur'an Hadis, Akidah, SKI, Bahasa Arab untuk MTs & MA agar tiap semester >= 3
  ext(
    'qhadis-mts-s1-mad-aridh-sabar', 'Al-Qur\'an Hadis', 'SMP/MTs', 'Fase D', 'Tajwid & Ayat Kehidupan',
    'Mad Aridh Lissukun–Mad Iwadl serta Ayat–Hadis tentang Ketabahan Ujian dan Semangat Beramal Baik',
    'Peserta didik dapat membaca Mad Aridh Lissukun (2/4/6 harakat konsisten) saat waqaf serta menjelaskan sikap optimis dan pantang putus asa pelajar.',
    'Latih konsistensi panjang waqaf pada akhir ayat dan refleksi manajemen kegagalan dalam belajar.',
    'Membaca akhir ayat berwaqaf secara rapi serta mengambil energi optimisme dari Al-Qur’an.',
    ['Hukum nun mati & mad dasar Sem 1'],
    ['Konsistensi harakat saat waqaf terjaga dan pesan ketabahan disimpulkan tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-mts-s1-dermawan-seimbang-dunia-akhirat', 'Al-Qur\'an Hadis', 'SMP/MTs', 'Fase D', 'Kandungan Ayat & Hadis',
    'Keseimbangan Kerja Dunia dan Akhirat serta Menghindari Sifat Bakhil maupun Boros',
    'Peserta didik dapat membandingkan etos ikhtiar sungguh-sungguh, sikap berbagi kepada kerabat–fakir, dan kebiasaan hidup tidak berlebih-lebihan.',
    'Hubungkan QS. Al-Qashash: 77 dengan perencanaan waktu belajar, prestasi, dan kepedulian sosial remaja.',
    'Membangun etos kerja produktif berimbang dengan solidaritas sosial dan kesederhanaan.',
    ['Hadis niat & kejujuran'],
    ['Analisis kasus gaya hidup pelajar menyertakan dalil keseimbangan ikhtiar dan infak'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-mts-s2-hadis-menghargai-waktu', 'Al-Qur\'an Hadis', 'SMP/MTs', 'Fase D', 'Kandungan Ayat & Hadis',
    'QS. Al-‘Ashr & Hadis Pemanfaatan Lima Kesempatan Sebelum Lima Kesempitan (Waktu & Kesehatan)',
    'Peserta didik dapat menerjemahkan kesadaran nilai waktu muda dan sehat ke jadwal aktivitas produktif bebas menunda-nunda tugas.',
    'Gunakan refleksi 24 jam penggunaan gawai vs belajar dan ibadah harian siswa.',
    'Menumbuhkan disiplin manajemen waktu remaja berlandaskan Al-Qur’an dan Hadis.',
    ['Tajwid & etos kerja Sem 1'],
    ['Rencana jadwal harian siswa menyeimbangkan belajar, istirahat, sosial, dan ibadah'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-mts-s2-qiraah-hadis-kompetisi-ilmu', 'Al-Qur\'an Hadis', 'SMP/MTs', 'Fase D', 'Integrasi Ayat & Sains',
    'Ayat Kauniyah Penciptaan Alam (QS. Al-Ghasyiyah/Ali Imran) dan Motivasi Observasi Ilmiah Pelajar',
    'Peserta didik dapat mengaitkan perintah memperhatikan fenomena langit, gunung, dan organisme dengan ketekunan mempelajari sains tanpa memisahkan iman dan nalar.',
    'Diskusikan contoh sikap kagum terhadap keteraturan alam dalam eksperimen IPA sekolah.',
    'Mengintegrasikan perenungan ayat kauniyah dengan rasa ingin tahu ilmiah pelajar.',
    ['Tajwid lengkap MTs'],
    ['Mengaitkan bukti keteraturan fenomena alam dengan pesan ayat kauniyah secara jelas'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-ma-s1-makki-madani-muhkam', 'Al-Qur\'an Hadis (MA)', 'SMA/MA', 'Fase F', 'Ulumul Qur’an Lanjutan',
    'Ciri Surah Makkiyah–Madaniyah, Munasabah Antarayat, serta Ayat Muhkamat dan Mutasyabihat',
    'Peserta didik dapat membedakan karakteristik pesan dakwah Makkiyah (fondasi akidah/akhlak) vs Madaniyah (hukum sosial/tata masyarakat) dan urgensi merujuk ayat muhkam.',
    'Hindarkan pemotongan ayat di luar konteks ayat sebelum dan sesudahnya (munasabah).',
    'Membaca pesan Al-Qur’an secara utuh memperhatikan keterkaitan antarayat dan kronologi turunnya.',
    ['Asbabun Nuzul & sanad hadis'],
    ['Identifikasi ciri Makkiyah vs Madaniyah pada surah contoh tepat beserta bukti munasabah'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-ma-s1-takhrīj-sanad-digital', 'Al-Qur\'an Hadis (MA)', 'SMA/MA', 'Fase F', 'Ilmu Hadis Terapan',
    'Metode Takhrij Hadis Dasar (Menelusuri Kitab Induk & Verifikasi Riwayat Beredar di Media Sosial)',
    'Peserta didik dapat memeriksa kejelasan sumber perawi hadis populer yang beredar di media sosial memakai indeks kitab induk hadis dan prinsip kehati-hatian sanad.',
    'Latih membedakan kutipan hikmah ulama/kata mutiara yang sering disalahklaim sebagai hadis Nabi dengan riwayat bernomor sanad jelas.',
    'Menerapkan kehati-hatian verifikasi periwayatan hadis dalam literasi keagamaan digital.',
    ['Syarat hadis shahih Sem 1'],
    ['Prosedur cek asal riwayat hadis membedakan hadis shahih dari kutipan tanpa sanad'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-ma-s2-ayat-amanah-antikorupsi', 'Al-Qur\'an Hadis (MA)', 'SMA/MA', 'Fase F', 'Tafsir Tematik Publik',
    'Kajian Ayat–Hadis tentang Kepemimpinan Amanah, Penegakan Keadilan, dan Penolakan Risywah (Suap)',
    'Peserta didik dapat menganalisis kecaman tegas Al-Qur’an dan Hadis terhadap kecurangan timbangan, suap (risywah), dan pengkhianatan jabatan publik.',
    'Kaitkan dengan integritas pelajar menghadapi beasiswa, organisasi sekolah, hingga dunia kerja.',
    'Menjadikan nilai Al-Qur’an–Hadis landasan gerakan integritas bersih anti-korupsi.',
    ['Tafsir tematik kemanusiaan'],
    ['Kajian ayat-hadis menghubungkan larangan risywah dengan strategi integritas kaum muda'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['qhadis-ma-s2-tafsir-tematik-kemanusiaan'], relatedTopicIds: ['qhadis-ma-s2-tafsir-tematik-kemanusiaan'], suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),
  ext(
    'qhadis-ma-s2-ayat-lingkungan-berkelanjutan', 'Al-Qur\'an Hadis (MA)', 'SMA/MA', 'Fase F', 'Tafsir Tematik Ekologi',
    'Ekoteologi Al-Qur’an–Hadis: Amanah Kelestarian Bumi, Penghematan Air, & Keberlanjutan Generasi',
    'Peserta didik dapat merangkum dalil larangan tabdzir (mubazir) dan perusakan ekosistem serta merancang risalah edukasi ramah lingkungan berbasis nilai wahyu.',
    'Gunakan hadis hemat air wudhu meski di sungai mengalir deras sebagai standar etika konsumsi sumber daya.',
    'Menyintesiskan prinsip ekoteologi wahyu dengan agenda pelestarian lingkungan modern.',
    ['Takhrij & tafsir tematik'],
    ['Risalah mengutip dalil sahih secara akurat dengan rekomendasi aksi konservasi sekolah'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),

  // Akidah MTs & MA tambahan agar >= 3 tiap semester
  ext(
    'akidah-mts-s1-iman-kitab-rasul', 'Akidah Akhlak', 'SMP/MTs', 'Fase D', 'Akidah Dasar MTs',
    'Sifat Wajib–Mustahil–Jaiz Allah serta Hikmah Iman kepada Kitab Suci dan Rasul Ulul Azmi',
    'Peserta didik dapat mengelompokkan sifat Nafsiyah–Salbiyah–Ma’ani–Ma’nawiyah secara konseptual dan meneladani keteguhan lima Rasul Ulul Azmi.',
    'Hindari sekadar hafalan mekanis; hubungkan setiap sifat Allah dan keteladanan Rasul dengan optimisme menghadapi tantangan belajar.',
    'Memperdalam pemahaman tauhid serta keteladanan keteguhan para rasul.',
    ['Asmaul Husna & Akhlak MI'],
    ['Klasifikasi kelompok sifat wajib serta analisis teladan Rasul Ulul Azmi tepat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '7', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-mts-s1-ikhtiar-tawakal-syukur', 'Akidah Akhlak', 'SMP/MTs', 'Fase D', 'Akhlak Pribadi Pelajar',
    'Sinergi Ikhtiar Sungguh-Sungguh, Doa, Tawakal, Sabar, dan Syukur (Menghindari Putus Asa/Ananiah)',
    'Peserta didik dapat menjelaskan mengapa tawakal selalu didahului ikhtiar maksimal, bukan pasrah tanpa usaha, saat menghadapi ujian atau target prestasi.',
    'Bandingkan sikap fatalistik malas berusaha vs keseimbangan perencanaan belajar–ikhtiar–tawakal.',
    'Membangun ketangguhan mental pelajar Muslim yang proaktif dan tidak cepat menyerah.',
    ['Akidah dasar MTs'],
    ['Studi kasus mengoreksi paham keliru tawakal pasif dengan strategi ikhtiar terukur'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-mts-s2-iman-hari-akhir-qadha', 'Akidah Akhlak', 'SMP/MTs', 'Fase D', 'Akidah Lanjutan MTs',
    'Makna Iman Kepada Hari Akhir serta Memahami Qadha–Qadar (Takdir Mubram vs Mu’allaq)',
    'Peserta didik dapat membedakan takdir mu’allaq (terbuka bagi ikhtiar dan doa) dari mubram serta mengaitkan keyakinan hari pembalasan dengan tanggung jawab perbuatan.',
    'Kuatkan pesan akuntabilitas moral: setiap perbuatan kecil membawa dampak dan ikhtiar belajar mengubah capaian.',
    'Menanamkan rasa tanggung jawab moral dan optimisme berikhtiar atas dasar iman.',
    ['Ikhtiar & tawakal Sem 1'],
    ['Perbedaan takdir mu’allaq vs mubram dengan contoh konkret tepat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['akidah-mts-s1-ikhtiar-tawakal-syukur'], relatedTopicIds: ['akidah-mts-s1-ikhtiar-tawakal-syukur'], suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-mts-s2-keteladanan-sahabat-tabiin', 'Akidah Akhlak', 'SMP/MTs', 'Fase D', 'Keteladanan Akhlak',
    'Keteladanan Umar bin Abdul Aziz, Imam Al-Ghazali / Tokoh Teladan Amanah dan Cinta Ilmu',
    'Peserta didik dapat mengambil hikmah kehati-hatian menggunakan fasilitas negara oleh Umar bin Abdul Aziz untuk diterapkan pada kejujuran pemakaian fasilitas sekolah.',
    'Diskusikan contoh membedakan urusan pribadi dari amanah barang milik kelas/sekolah.',
    'Mencontoh integritas pengelolaan amanah publik dan kerendahan hati ilmuwan Muslim.',
    ['Adab & menghindari akhlak tercela'],
    ['Memetakan sikap integritas fasilitas umum sekolah berdasarkan kisah teladan tokoh'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  // Akidah MA Fase F tambahan
  ext(
    'akidah-ma-s1-dosa-besar-taubat', 'Akidah Akhlak (MA)', 'SMA/MA', 'Fase F', 'Penyucian Jiwa & Sosial',
    'Bahaya Dosa Sosial (Narkoba, Judi, Fitnah, Zina) dan Jalan Pemulihan Diri Melalui Taubat Nasuha',
    'Peserta didik dapat menganalisis mekanisme psikososial kehancuran masa depan akibat kecanduan NAPZA/judi online serta langkah nyata pemulihan taubat dan pendampingan sehat.',
    'Padukan pandangan agama tentang syarat taubat yang tulus dengan kesadaran dukungan keluarga dan konselor sehat.',
    'Membangun ketahanan moral remaja dan pemahaman bahwa kesalahan masa lalu dapat diperbaiki.',
    ['Akhlak pergaulan remaja MTs'],
    ['Syarat taubat menyangkut hak Allah vs hak sesama manusia diuraikan benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-ma-s1-nifaq-keras-hati-ukhuwah', 'Akidah Akhlak (MA)', 'SMA/MA', 'Fase F', 'Ukhuwah & Kesehatan Spiritual',
    'Menghindari Nifaq, Ta’ashub (Fanatisme Sempit), dan Memperkuat Ukhuwah Islamiyah–Wathaniyah–Basyariyah',
    'Peserta didik dapat membedakan solidaritas kelompok sehat dari fanatisme buta (ta’ashub) yang merusak kerukunan berbangsa dan kemanusiaan.',
    'Gunakan konsep tiga lingkaran persaudaraan (sesama Muslim, sesama warga bangsa, sesama manusia) dalam menjaga harmoni sosial.',
    'Mengembangkan kedewasaan beragama yang kokoh berprinsip sekaligus hangat berkolaborasi lintas kelompok.',
    ['Ilmu kalam moderat Sem 1'],
    ['Analisis kasus konflik fanatisme kelompok merujuk konsep tiga ukhuwah secara seimbang'],
    '1 (Ganjil)', 'integrasi', { prasyaratTopicIds: ['akidah-ma-s1-kalam-mazhab-tasawuf'], relatedTopicIds: ['akidah-ma-s1-kalam-mazhab-tasawuf'], suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-ma-s2-asmaul-hakim-keadilan', 'Akidah Akhlak (MA)', 'SMA/MA', 'Fase F', 'Akidah & Kepemimpinan',
    'Refleksi Asmaul Husna (Al-‘Adl, Al-Hakim, Al-Hasib) dalam Kejujuran Publik dan Tanggung Jawab Sosial',
    'Peserta didik dapat menghubungkan makna sifat Allah Yang Maha Adil, Bijaksana, dan Menghitung segala amal ke integritas pengelolaan proyek organisasi/kerja.',
    'Rancang refleksi etika pribadi pasca-MA bagi siswa yang akan kuliah maupun terjun ke dunia kerja.',
    'Menginternalisasi kesadaran pengawasan batiniah untuk integritas berkarya di masyarakat.',
    ['Tasawuf amali & akhlak profesi'],
    ['Esai refleksi integritas mengaitkan sifat Al-‘Adl/Al-Hasib ke studi kasus profesi nyata'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-ma-s2-adab-kritis-iptek-seni', 'Akidah Akhlak (MA)', 'SMA/MA', 'Fase F', 'Adab Budaya & Media',
    'Adab Mengakses Informasi, Etika Mengutip Karya, & Keteladanan Ulama Cendekiawan Lintas Bidang',
    'Peserta didik dapat merumuskan prinsip etika menyaring konten digital, menghormati hak karya orang lain, dan meneladani integritas keilmuan tokoh ulama Nusantara.',
    'Soroti kontribusi ulama Nusantara dalam memadukan ilmu agama, literasi lokal, dan cinta tanah air.',
    'Menumbuhkan adab pelajar pembelajar sepanjang hayat yang rendah hati dan menghargai karya.',
    ['Akhlak profesi digital'],
    ['Checklist etika konsumsi–produksi konten digital selaras prinsip amanah dan kejujuran ilmiah'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['akidah-ma-s2-akhlak-pergaulan-remaja-publik'], relatedTopicIds: ['akidah-ma-s2-akhlak-pergaulan-remaja-publik'], suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),

  // SKI MTs & MA tambahan agar >= 3 tiap semester
  ext(
    'ski-mts-s1-khulafaurasyidin-umayyah', 'Sejarah Kebudayaan Islam / SKI', 'SMP/MTs', 'Fase D', 'Dinasti Awal Islam',
    'Kepemimpinan Khulafaurasyidin hingga Tata Pemerintahan & Arsitektur Dinasti Umayyah',
    'Peserta didik dapat membandingkan pola pemilihan serta prestasi konsolidasi negara masa Khulafaurasyidin dengan ekspansi wilayah dan kemajuan administrasi Umayyah (Damaskus–Andalusia).',
    'Soroti pembangunan lembaga baitul mal, kodifikasi mushaf Utsmani, dan kemajemukan Cordova.',
    'Memahami transisi kepemimpinan awal menuju peradaban kosmopolitan di dunia Islam.',
    ['Sirah Makkah–Madinah'],
    ['Perbandingan fokus kebijakan sosial Khulafaurasyidin vs administrasi Umayyah akurat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '7', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-mts-s1-ayyubiyah-al-azhar', 'Sejarah Kebudayaan Islam / SKI', 'SMP/MTs', 'Fase D', 'Peradaban Pertengahan',
    'Dinasti Ayyubiyah, Keteladanan Ksatria Salahuddin Al-Ayyubi, dan Peran Universitas Al-Azhar',
    'Peserta didik dapat menganalisis sikap ksatria, pemuliaan tawanan perang, dan perlindungan tempat ibadah lintas agama oleh Salahuddin Al-Ayyubi saat pembebasan Yerusalem.',
    'Kontraskan etika perang beradab dan perhatian terhadap rumah sakit serta lembaga pendidikan Al-Azhar.',
    'Mengambil teladan keadilan, toleransi, dan keteguhan kepemimpinan dari sejarah Ayyubiyah.',
    ['Kejayaan Abbasiyah'],
    ['Menjelaskan nilai kemanusiaan kebijakan Salahuddin dan peran pendidikan Al-Azhar secara tepat'],
    '1 (Ganjil)', 'penerapan', { prasyaratTopicIds: ['ski-mts-s1-makkah-madinah-klasik'], relatedTopicIds: ['ski-mts-s1-makkah-madinah-klasik'], suggestedGrade: '8', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-mts-s2-kerajaan-islam-samudera-demak', 'Sejarah Kebudayaan Islam / SKI', 'SMP/MTs', 'Fase D', 'Kesultanan Nusantara',
    'Kesultanan Islam Pertama di Nusantara (Samudera Pasai, Aceh, Demak, Mataram, Gowa-Tallo, Ternate)',
    'Peserta didik dapat memetakan peran kesultanan niaga maritim Nusantara dalam menyatukan jalur perdagangan, bahasa Melayu/Jawi, dan perlawanan awal terhadap monopoli asing.',
    'Hubungkan posisi pelabuhan niaga dengan akulturasi hukum adat dan sastra Nusantara.',
    'Memahami akar persatuan kesultanan maritim Nusantara pra-kolonial penuh.',
    ['Masuknya Islam ke Nusantara'],
    ['Peta kesultanan memuat wilayah pusat, komoditas niaga, dan peninggalan budaya khasnya'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ski-mts-s2-islam-nusantara-walisongo'], relatedTopicIds: ['ski-mts-s2-islam-nusantara-walisongo'], suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-mts-s2-pesantren-tokoh-ulama', 'Sejarah Kebudayaan Islam / SKI', 'SMP/MTs', 'Fase D', 'Warisan Pesantren & Kebangsaan',
    'Tradisi Keilmuan Pesantren dan Kontribusi Ulama Nusantara dalam Kebangkitan Kemerdekaan Indonesia',
    'Peserta didik dapat menganalisis fungsi pesantren (pengajaran kitab, kemandirian, moderasi, bela tanah air) dan peran tokoh seperti Syekh Yusuf, KH. Hasyim Asy’ari, & KH. Ahmad Dahlan.',
    'Soroti kombinasi pendidikan karakter kemandirian santri dan kesetiaan menjaga persatuan bangsa.',
    'Menghargai warisan pesantren dalam membentuk kepribadian Islam Indonesia yang cinta tanah air.',
    ['Kesultanan Islam Nusantara'],
    ['Identifikasi peran tokoh ulama di bidang pendidikan maupun perjuangan kemerdekaan tepat'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  // SKI MA tambahan Fase F
  ext(
    'ski-ma-s1-kontak-ilmiah-andalusia', 'Sejarah Kebudayaan Islam / SKI (MA)', 'SMA/MA', 'Fase F', 'Sejarah Sains & Budaya',
    'Transmisi Ilmu Pengetahuan dari Dunia Islam (Baghdad–Andalusia–Sisilia) Menuju Renaisans Eropa',
    'Peserta didik dapat melacak jalur penerjemahan karya ilmuwan Muslim (Al-Khawarizmi, Ibnu al-Haytham, Ibnu Rusyd) ke bahasa Latin yang memicu kebangkitan ilmu modern.',
    'Tunjukkan kesinambungan ilmu pengetahuan sebagai warisan kolaboratif umat manusia (Yunani → Islam → Eropa → Global).',
    'Memahami posisi dunia Islam dalam mata rantai perkembangan sains dan filsafat global.',
    ['Kemajuan ilmu MTs & 3 Kerajaan Besar'],
    ['Peta alur transmisi keilmuan memuat tokoh, karya bidang sains/optik/aljabar, dan pusat penerjemahan'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-ma-s1-imperialisme-respon-kebangkitan', 'Sejarah Kebudayaan Islam / SKI (MA)', 'SMA/MA', 'Fase F', 'Kebangkitan Dunia Islam',
    'Imperialisme Barat atas Wilayah Dunia Islam dan Munculnya Gerakan Pembebasan Modern',
    'Peserta didik dapat menganalisis faktor internal–eksternal jatuhnya kawasan Islam ke kolonialisme abad ke-19 serta respon pemikiran kebangkitan pendidikan dan politik.',
    'Bandingkan respons reaktif tertutup vs pembaruan pendidikan dan organisasi sosial modern.',
    'Menganalisis pelajaran ketertinggalan teknologi dan tata kelola dari era kolonialisasi dunia Islam.',
    ['Tiga kerajaan besar Islam'],
    ['Identifikasi sebab kelemahan internal dan respons gerakan pembaruan dijelaskan kausal tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-ma-s2-perkembangan-islam-asia-tenggara', 'Sejarah Kebudayaan Islam / SKI (MA)', 'SMA/MA', 'Fase F', 'Islam Regional & Dunia',
    'Dinamika Muslim Asia Tenggara (Indonesia, Malaysia, Brunei, Pattani, Mindanao) & Kontribusi Global',
    'Peserta didik dapat membandingkan corak interaksi Islam–negara–kebudayaan di Asia Tenggara dan peran moderasi Indonesia dalam dialog perdamaian dunia.',
    'Soroti keunikan Islam Asia Tenggara yang damai, pluralis, dan bertumpu pada pendidikan masyarakat.',
    'Memahami peta budaya Muslim Asia Tenggara dan model kerukunan multikultural Indonesia.',
    ['Pembaruan organisasi kebangsaan'],
    ['Perbandingan posisi sosio-historis komunitas Muslim Asia Tenggara disajikan objektif'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['ski-ma-s2-pembaruan-organisasi-kebangsaan'], relatedTopicIds: ['ski-ma-s2-pembaruan-organisasi-kebangsaan'], suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-ma-s2-islam-eropa-amerika-kontemporer', 'Sejarah Kebudayaan Islam / SKI (MA)', 'SMA/MA', 'Fase F', 'Islam Kontemporer Global',
    'Perkembangan Komunitas Muslim Kontemporer di Eropa–Amerika–Australia dan Tantangan Islamofobia',
    'Peserta didik dapat menganalisis kontribusi diaspora Muslim modern dalam sains, olahraga, dan kemanusiaan global serta strategi santun melawan stereotip Islamofobia lewat karya nyata.',
    'Gunakan contoh dialog antariman, kewargaan taat hukum, dan keterbukaan komunikasi lintas budaya.',
    'Menganalisis peran positif komunitas Muslim global masa kini secara kritis dan solutif.',
    ['Islam Asia Tenggara & pembaruan'],
    ['Kajian kasus menjelaskan tantangan integrasi minoritas dan kontribusi nyata komunitas global'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),

  // Bahasa Arab MTs & MA/SMK tambahan agar >= 3 tiap semester
  ext(
    'arab-mts-s1-hobi-jam-aktivitas', 'Bahasa Arab', 'SMP/MTs', 'Fase D', 'Kalam & Qira’ah',
    'As-Sa’ah (Jam Waktu), Al-Hiwayah (Hobi), dan Kalimat Fi’il Mudhari’ dengan Keterangan Waktu',
    'Peserta didik dapat menyebutkan pukul kegiatan memakai bilangan bertingkat (الساعة السادسة) dan berdialog tentang hobi olahraga/membaca secara lisan.',
    'Bedakan angka biasa dengan angka urutan penunjuk jam Arab dan kata kerja kesukaan "Uhibbu an...".',
    'Menyatakan jadwal kegiatan berdasar jam dan mengungkapkan minat hobi berbahasa Arab.',
    ['Ta’aruf & mufradat harian'],
    ['Membaca penunjukan jam Arab tepat dan menyusun dialog hobi 4 baris benar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '8', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-mts-s1-profesi-cita-cita-masdar', 'Bahasa Arab', 'SMP/MTs', 'Fase D', 'Qira’ah & Tarkib',
    'Al-Mihnah (Profesi Sekitar) serta Struktur "An + Fi’il Mudhari’ Nashab" untuk Cita-Cita Pelajar',
    'Peserta didik dapat menyebutkan beragam profesi (thabib, mudarris, muhandis, tajir) dan menyusun kalimat cita-cita memakai huruf "أن" yang menashabkan harakat akhir.',
    'Tunjukkan tanda perubahan dhammah menjadi fathah pada akhir fi’il mudhari’ setelah huruf أن/لن.',
    'Menggunakan pola kalimat keinginan masa depan dengan penguasaan tanda i’rab sederhana.',
    ['Fi’il mudhari’ dasar Sem 1'],
    ['Perubahan harakat fathah sesudah أن tepat pada 4 kalimat cita-cita profesi'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-mts-s2-kesehatan-jenguk-masdar', 'Bahasa Arab', 'SMP/MTs', 'Fase D', 'Istima’ & Kalam',
    'Iyadatul Maridh (Menjenguk Teman Sakit & Kosakata Kesehatan) dengan Fi’il Madhi Sederhana',
    'Peserta didik dapat membaca dialog menjenguk teman sakit dan menceritakan pengalaman berobat kemarin menggunakan fi’il madhi (kata kerja lampau).',
    'Kontraskan akhiran pelaku pada fi’il madhi (ذهبْتُ / ذهبَ / ذهبَتْ) vs awalan pada fi’il mudhari’.',
    'Menceritakan kejadian lampau sederhana dalam konteks empati sosial menjenguk sesama.',
    ['Fi’il mudhari’ & aktivitas harian Sem 1'],
    ['Konjugasi fi’il madhi sesuai pelaku انا/هو/هي pada kalimat pengalaman kesehatan tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['arab-mts-s1-hobi-jam-aktivitas'], relatedTopicIds: ['arab-mts-s1-hobi-jam-aktivitas'], suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-mts-s2-pariwisata-alam-fiil-amr', 'Bahasa Arab', 'SMP/MTs', 'Fase D', 'Qira’ah & Kitabah',
    'Jamalut Thabi’ah (Keindahan Alam Indonesia) & Penggunaan Fi’il Amr (Kata Perintah Santun)',
    'Peserta didik dapat membaca paragraf pendek keindahan alam Nusantara serta menggunakan fi’il amr sederhana untuk ajakan menjaga kebersihan tempat wisata.',
    'Tunjukkan pembentukan kata kerja perintah (اقرأ، اكتب، حافظ) disertai akhiran sukun atau huruf muannats.',
    'Memahami deskripsi wisata alam Indonesia serta merangkai ajakan pelestarian dengan fi’il amr.',
    ['Tarkib isim–fi’il–harf Sem 2'],
    ['Identifikasi informasi paragraf alam akurat dan penyusunan 3 kalimat fi’il amr sesuai konteks'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '9', sumberDokumen: KMA_DOC }
  ),
  // Bahasa Arab MA (Fase F) & Bahasa Arab Kejuruan (SMK)
  ext(
    'arab-ma-s1-teknologi-informasi-naat', 'Bahasa Arab (MA)', 'SMA/MA', 'Fase F', 'Qira’ah & Tarkib',
    'Teknologi Informasi & Komunikasi Modern dalam Wacana Arab serta Pola Idhafah & Na’at–Man’ut',
    'Peserta didik dapat membaca teks pendek pemanfaatan komputer/internet santun dalam pendidikan serta membedakan susunan Mudhaf–Mudhaf Ilaih (majrur) dari sifat–benda (Na’at).',
    'Tekankan tanda kasrah/majrur pada mudhaf ilaih dan larangan membubuhkan ال maupun tanwin pada mudhaf.',
    'Menganalisis teks modern bertema teknologi menggunakan ketepatan kaidah idhafah.',
    ['Jumlah fi’liyyah & isim–fi’il–harf'],
    ['Identifikasi susunan idhafah vs na’at dalam paragraf tepat dan harakat akhir benar'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-ma-s1-kebudayaan-islam-kana', 'Bahasa Arab (MA)', 'SMA/MA', 'Fase F', 'Tarkib & Istima’',
    'Khazanah Peradaban Keilmuan Islam dalam Wacana Arab dengan Kaidah Kana wa Akhwatuha & Inna',
    'Peserta didik dapat memahami teks biografi singkat tokoh ilmuwan Muslim klasik dan mengidentifikasi perubahan harakat isim–khabar setelah masuknya كان atau إنّ.',
    'Rumus kontras harakat "Kana tarfa’ul ism wa tanshibul khabar" vs "Inna tanshibul ism wa tarfa’ul khabar".',
    'Memahami peran amil nawasikh (kana & inna) dalam memaknai teks naratif sejarah.',
    ['Jumlah ismiyyah dasar'],
    ['Penentuan kedudukan isim & khabar kana/inna pada 4 kalimat wacana tepat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-ma-s2-dialog-kuliah-karier', 'Bahasa Arab (MA)', 'SMA/MA', 'Fase F', 'Kalam & Muhadatsah',
    'Dirasah fil Jami’ah & Al-Amal: Percakapan Rencana Studi Lanjut, Profesi, & Cita-Cita',
    'Peserta didik dapat melakukan dialog terencana mengenai pilihan jurusan kuliah/karier dan keahlian diri menggunakan ungkapan argumentatif singkat.',
    'Latih menyambungkan alasan "لأنّ..." dan penghubung urutan ide "أوّلًا، ثانيًا، أخيرًا".',
    'Berkomunikasi lisan lebih luas mengenai rencana masa depan dengan kalimat sebab–akibat.',
    ['Insya’ muwajjah & teknologi Sem 1–2'],
    ['Dialog memuat alasan pilihan studi/karier jelas dengan struktur sebab-akibat akurat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-ma-s2-wacana-global-lingkungan', 'Bahasa Arab (MA)', 'SMA/MA', 'Fase F', 'Integrasi Qira’ah–Kitabah',
    'Teks Argumentatif Lingkungan & Kemajuan Sosial serta Proyek Resume Tertulis Dwibahasa',
    'Peserta didik dapat menyimpulkan gagasan utama esai opini bahasa Arab kontemporer tentang krisis lingkungan dan menyusun ringkasan 1 paragraf dalam bahasa Arab baku.',
    'Pandu verifikasi keselarasan pokok pikiran paragraf asli dengan kalimat ringkasan sendiri.',
    'Mengintegrasikan kemampuan baca analitis dan tulis akademik ringkas berbahasa Arab.',
    ['Kana/Inna & insya’ muwajjah'],
    ['Ringkasan mempertahankan pokok ide teks asli tanpa kesalahan susunan jumlah dasar'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['arab-ma-s2-insya-komposisi-pidato'], relatedTopicIds: ['arab-ma-s2-insya-komposisi-pidato'], suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),

  // SMK — Bahasa Arab Kejuruan, Informatika/Dasar Kejuruan, Sejarah SMK, Projek IPAS Fase F lanjut, PAI SMK
  ext(
    'arab-smk-s1-perkenalan-profesi-kerja', 'Bahasa Arab Kejuruan', 'SMK', 'Fase E', 'Kalam & Mufradat Kejuruan',
    'At-Ta’aruf Profesi, Ruang Bengkel/Kantor, dan Peralatan Kerja Dasar dalam Bahasa Arab',
    'Peserta didik dapat mengenalkan bidang keahlian sekolahnya serta menyebutkan 8 kosakata alat dan ruangan kerja umum dalam kalimat sederhana.',
    'Padukan salam sopan dunia kerja/pariwisata syariah dengan kosakata benda bengkel, komputer, dapur, atau kasir.',
    'Membangun kosakata Arab terapan sesuai konteks profesi layanan atau kerja vokasional.',
    ['Huruf hijaiyah & ta’aruf dasar'],
    ['Mampu menyebutkan bidang keahlian dan 6 peralatan kerja umum dalam dialog singkat'],
    '1 (Ganjil)', 'pengenalan', { suggestedGrade: '10', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-smk-s1-layanan-tamu-waktu-kerja', 'Bahasa Arab Kejuruan', 'SMK', 'Fase E', 'Istima’ & Kalam Layanan',
    'Menyambut Tamu / Pelanggan (Istiqbalud Dhuyuf), Menanyakan Keperluan, & Jam Layanan',
    'Peserta didik dapat mempraktikkan sapaan ramah penyambutan tamu, menyebutkan jam operasional kantor/usaha, dan mengarahkan ke ruang layanan dengan petunjuk tempat dasar.',
    'Latih kalimat santun "Tafaddhal", "Kaifa yumkinuni musa’adatuka?", serta keterangan tempat (يَمِينًا / يَسَارًا / مُبَاشَرَةً).',
    'Berkomunikasi lisan dasar dalam konteks pelayanan pelanggan/tamu ramah.',
    ['Ta’aruf profesi Sem 1'],
    ['Dialog layanan mencakup salam selamat datang, arah lokasi tepat, dan penyebutan jam layanan'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-smk-s1-angka-harga-transaksi', 'Bahasa Arab Kejuruan', 'SMK', 'Fase F', 'Muamalah & Transaksi Dasar',
    'Bilangan Ratusan–Ribuan, Penawaran Harga Barang/Jasa, dan Konfirmasi Pesanan Sederhana',
    'Peserta didik dapat menyebutkan harga produk/layanan menggunakan bilangan Arab serta menanyakan ketersediaan barang dan ukuran/kuantitas.',
    'Simulasikan dialog kasir/penjualan produk atau layanan perhotelan/umrah sederhana.',
    'Menggunakan angka, harga, dan kalimat penawaran dasar dalam interaksi niaga singkat.',
    ['Layanan tamu & jam kerja'],
    ['Simulasi transaksi menyebutkan harga, jumlah unit, dan ucapan terima kasih tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-smk-s2-k3-instruksi-sop', 'Bahasa Arab Kejuruan', 'SMK', 'Fase F', 'Qira’ah & Instruksi Kerja',
    'Membaca Papan Petunjuk Keselamatan / Larangan Area Kerja dan Kalimat Perintah SOP (Fi’il Amr)',
    'Peserta didik dapat menafsirkan tanda petunjuk/larangan sederhana berbahasa Arab (ممنوع التدخين / البس الخوذة) dan menyusun 3 instruksi singkat memakai fi’il amr.',
    'Kaitkan tanda petunjuk di area bandara, hotel, atau bengkel kerja dengan tindakan K3 nyata.',
    'Memahami tanda keselamatan fasilitas publik berbahasa Arab dan instruksi dasar.',
    ['Layanan tamu Sem 1'],
    ['Identifikasi makna minimal 5 rambu informasi/larangan fasilitas tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['arab-smk-s1-layanan-tamu-waktu-kerja'], relatedTopicIds: ['arab-smk-s1-layanan-tamu-waktu-kerja'], suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-smk-s2-resume-wawancara-kerja', 'Bahasa Arab Kejuruan', 'SMK', 'Fase F', 'Kitabah & Kalam Profesi',
    'Menyusun Biodata Kerja Singkat (As-Sirah Adz-Dzatiyyah) dan Simulasi Tanya Jawab Minat Kerja',
    'Peserta didik dapat mengisi formulir biodata diri dan pengalaman keahlian/PKL ringkas berbahasa Arab serta menjawab 3 pertanyaan pengenalan wawancara kerja.',
    'Tekankan informasi identitas, keahlian praktik yang dikuasai, dan etos disiplin kerja.',
    'Menyiapkan perkenalan kualifikasi kerja dasar berbahasa Arab untuk layanan internasional/syariah.',
    ['Transaksi & instruksi kerja'],
    ['Biodata memuat nama, bidang keahlian SMK, pengalaman PKL/proyek, dan respons lisan jelas'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['arab-smk-s1-angka-harga-transaksi'], relatedTopicIds: ['arab-smk-s1-angka-harga-transaksi'], suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-smk-s2-etika-korespondensi-pesan', 'Bahasa Arab Kejuruan', 'SMK', 'Fase F', 'Kitabah Fungsional',
    'Pesan Konfirmasi Janji Temu, Ucapan Terima Kasih Klien, dan Penanganan Keluhan Sederhana',
    'Peserta didik dapat menyusun pesan tertulis singkat konfirmasi jadwal pesanan klien dan kalimat permohonan maaf profesional bila terjadi keterlambatan.',
    'Latih frasa santun "Na’tadzir ‘an..." dan konfirmasi tanggal–waktu pertemuan.',
    'Menulis pesan layanan klien singkat secara profesional dan empatik.',
    ['Layanan tamu & biodata'],
    ['Pesan konfirmasi mencantumkan hari, jam, tujuan, dan ungkapan sopan baku'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12', sumberDokumen: KMA_DOC }
  ),

  // SMK Dasar-Dasar Informatika / Kejuruan & Proyek IPAS lanjutan agar Fase F di catalog tidak 0!
  ext(
    'inf-smk-s1-alat-kolaborasi-k3-ti', 'Informatika / Dasar Kejuruan', 'SMK', 'Fase F', 'Kejuruan Digital & TIK Terapan',
    'Manajemen Aset Digital Proyek Kejuruan, Standar K3 Perangkat Kerja TI, dan Otomasi Spreadsheet',
    'Peserta didik dapat mengonfigurasi template pelaporan stok/pesanan bengkel memakai lookup & validasi data lembar kerja sambil menerapkan prosedur K3 kelistrikan serta ergonomi komputer.',
    'Kaitkan fungsi VLOOKUP/XLOOKUP dan Data Validation spreadsheet ke pengurangan kesalahan input inventaris bengkel/usaha.',
    'Mengotomasi administrasi data praktik kejuruan secara aman, ergonomis, dan bebas galat input.',
    ['Integrasi TIK & analisis data Fase E'],
    ['Template spreadsheet stok otomatis menarik data harga/nama barang dengan validasi input aktif'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  ext(
    'inf-smk-s1-jaringan-cloud-keamanan-kerja', 'Informatika / Dasar Kejuruan', 'SMK', 'Fase F', 'Infrastruktur & Keamanan Kerja',
    'Pengamanan Akun Kerja, Backup 3-2-1 Dokumen Usaha, Topologi LAN Kecil, dan Etika Data Pelanggan',
    'Peserta didik dapat merancang skema backup data pelanggan/proyek kejuruan serta mengaudit risiko kebocoran privasi data transaksi UMKM.',
    'Gunakan aturan 3-2-1 backup, manajemen kata sandi tim kerja aman, dan etika tidak membagikan data nomor/alamat klien sembarangan.',
    'Melindungi keberlangsungan data operasional usaha dan privasi pelanggan sesuai etika profesi.',
    ['Jaringan & keamanan siber Fase E'],
    ['Skema topologi/backup melindungi kehilangan data tunggal dan audit privasi mengidentifikasi celah akun'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  ext(
    'inf-smk-s1-pemodelan-alur-layanan-web', 'Informatika / Dasar Kejuruan', 'SMK', 'Fase F', 'Pengembangan Solusi Kerja',
    'Perancangan Wireframe Antarmuka Katalog / Sistem Antrean Layanan Kejuruan dan Logika Validasi Form',
    'Peserta didik dapat menerjemahkan alur pelayanan pelanggan bengkel/studio ke wireframe antarmuka responsif dan aturan validasi form pemesanan.',
    'Uji coba wireframe pada layar sempit ponsel untuk memastikan pelanggan dapat mengisi pesanan dengan mudah tanpa salah tekan.',
    'Merancang antarmuka layanan digital kejuruan yang ramah pengguna desktop maupun ponsel.',
    ['Pemrograman prosedural & algoritma'],
    ['Wireframe mencakup alur utama pesan–konfirmasi–status dengan aturan validasi input jelas'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  ext(
    'inf-smk-s2-basis-data-layanan-umkm', 'Informatika / Dasar Kejuruan', 'SMK', 'Fase F', 'Sistem Data Kejuruan',
    'Basis Data Pelanggan–Pesanan Kejuruan (ERD & Kueri Rekap Omzet) tanpa Duplikasi Rekaman',
    'Peserta didik dapat membangun relasi tabel Pelanggan–Pesanan–Detail Item untuk memantau status pengerjaan jasa/barang bengkel secara akurat.',
    'Hubungkan tabel produk/jasa dengan detail transaksi agar perubahan harga barang baru tidak merusak histori harga nota lama.',
    'Mengelola basis data operasional kejuruan yang menjaga keutuhan riwayat transaksi.',
    ['Spreadsheet stok & wireframe layanan Sem 1'],
    ['Desain tabel menyimpan snapshot harga saat transaksi agar histori omzet tetap akurat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['inf-smk-s1-alat-kolaborasi-k3-ti', 'inf-smk-s1-pemodelan-alur-layanan-web'], relatedTopicIds: ['inf-smk-s1-alat-kolaborasi-k3-ti'], suggestedGrade: '12' }
  ),
  ext(
    'inf-smk-s2-otomasi-konten-ai-etis', 'Informatika / Dasar Kejuruan', 'SMK', 'Fase F', 'Teknologi Baru & Etika Kerja',
    'Pemanfaatan Alat Digital & Kecerdasan Artifisial Secara Etis dalam Dokumentasi & Layanan Kejuruan',
    'Peserta didik dapat menggunakan alat bantu digital untuk merapikan manual kerja/katalog sambil tetap melakukan verifikasi akurasi teknis, hak cipta aset, dan kerahasiaan data klien.',
    'Tekankan aturan larangan mengunggah data pribadi pelanggan atau rahasia desain bengkel ke layanan publik tanpa izin.',
    'Mengintegrasikan produktivitas alat digital modern secara bertanggung jawab di tempat kerja.',
    ['Keamanan kerja & HKI'],
    ['Protokol kerja mencantumkan batas privasi data yang tidak boleh dibagikan dan cek akurasi manusia'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['inf-smk-s1-jaringan-cloud-keamanan-kerja'], relatedTopicIds: ['inf-smk-s1-jaringan-cloud-keamanan-kerja'], suggestedGrade: '12' }
  ),
  ext(
    'inf-smk-s2-proyek-digital-kejuruan', 'Informatika / Dasar Kejuruan', 'SMK', 'Fase F', 'Praktik Lintas Bidang Kejuruan',
    'Proyek Integrasi Portofolio Digital, Uji Keamanan Dasar, dan Presentasi Solusi Sistem Kerja Kejuruan',
    'Peserta didik dapat mempresentasikan portofolio karya dan solusi digital kejuruan lengkap dengan demo alur pengguna, bukti uji kasus gagal/berhasil, dan strategi pemeliharaan data.',
    'Padukan aset katalog, lembar kontrol stok/omzet, serta dokumentasi SOP dalam satu paket portofolio siap uji UKK/PKL.',
    'Menunjukkan kesiapan kompetensi komputasional terapan untuk mendukung bidang keahlian di industri.',
    ['Basis data layanan & otomasi konten'],
    ['Portofolio mendemonstrasikan alur transaksi utuh teruji serta dokumen langkah pemeliharaan'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['inf-smk-s2-basis-data-layanan-umkm'], relatedTopicIds: ['inf-smk-s2-basis-data-layanan-umkm'], suggestedGrade: '12' }
  ),

  // Projek IPAS SMK lanjutan / proyek terapan jika diakses dari Fase F atau Kelas 11 SMK (catatan jelas)
  ext(
    'projekipas-smk-ff-s1-keselamatan-ergonomi-lingkungan', 'Projek IPAS (SMK)', 'SMK', 'Fase F', 'Aplikasi Sains Kerja & K3LH',
    'Audit Ergonomi, Kebisingan/Pencahayaan Ruang Praktik, serta Pengendalian Emisi & Limbah Terapan',
    'Peserta didik dapat mengukur kesesuaian pencahayaan/kebisingan dan tata letak ruang praktik kejuruan terhadap standar kenyamanan-keselamatan kerja serta merumuskan koreksinya.',
    'Catatan kurikulum: Mata pelajaran Projek IPAS utamanya diajarkan pada Fase E Kelas 10 SMK; topik lanjutan ini dapat dipakai bila satuan pendidikan melanjutkan proyek terapan K3LH di kelas XI.',
    'Menilai kelayakan fisik lingkungan praktik kejuruan dengan prinsip pengukuran fisis dan ekologis.',
    ['Ekosistem limbah & energi Fase E'],
    ['Laporan audit fisik bengkel menyajikan hasil pengukuran pencahayaan/kebisingan dan perbaikan ergonomi'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11' }
  ),
  ext(
    'projekipas-smk-ff-s1-mutu-material-proses', 'Projek IPAS (SMK)', 'SMK', 'Fase F', 'Sains Material & Proses',
    'Analisis Ketahanan Material, Higienitas Proses Kerja, dan Pengendalian Kerusakan Produk',
    'Peserta didik dapat menyelidiki faktor penyebab penurunan mutu bahan baku/produk (suhu, kelembaban, oksidasi, kontaminasi mikroba) untuk merancang SOP penyimpanan yang efisien.',
    'Gunakan uji pengamatan terkontrol dua cara penyimpanan/perlakuan bahan di bidang masing-masing.',
    'Mengoptimalkan umur simpan dan keandalan material praktik melalui eksperimen variabel.',
    ['Zat & perubahan produksi Fase E'],
    ['Data uji perbandingan penyimpanan mendasari SOP pengendalian kerusakan bahan'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),
  ext(
    'projekipas-smk-ff-s1-efisiensi-rantai-kerja', 'Projek IPAS (SMK)', 'SMK', 'Fase F', 'Ekonomi Sosial Terapan',
    'Analisis Dampak Sosial-Ekonomi Produk Kejuruan, Keberlanjutan Rantai Pasok Lokal, & Kepatuhan Regulasi',
    'Peserta didik dapat mengevaluasi dampak sosial dan lingkungan dari bahan baku serta pemasok lokal dalam operasional usaha jasa/produk kejuruan.',
    'Bandingkan biaya bahan baku murah yang boros limbah vs bahan baku lokal berkelanjutan.',
    'Mengambil keputusan pengadaan dan produksi yang layak ekonomi sekaligus bertanggung jawab sosial.',
    ['Konektivitas ruang & ekonomi UMKM Fase E'],
    ['Matriks pilihan pemasok menimbang biaya, mutu, jejak limbah, dan dampak ekonomi lokal'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  ext(
    'projekipas-smk-ff-s2-proyek-transisi-energi-hijau', 'Projek IPAS (SMK)', 'SMK', 'Fase F', 'Inovasi Berkelanjutan',
    'Rancangan Daur Ulang Nilai Tambah Limbah Praktik Kejuruan menjadi Produk Sampingan Bermanfaat',
    'Peserta didik dapat merancang skema pemanfaatan sisa bahan praktik (serbuk kayu, sisa kain/kertas, minyak jelantah, dll.) menjadi produk ramah lingkungan bernilai guna.',
    'Uji kelayakan teknik pembuatan sederhana, keselamatan pengolahan, serta potensi penghematan biaya pembuangan limbah.',
    'Menerapkan prinsip ekonomi sirkular pada praktik lingkungan keahlian SMK.',
    ['Audit limbah & sains material'],
    ['Prototipe produk sampingan diuji keamanannya dan dihitung pengurangan volume limbah praktik'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['projekipas-smk-ff-s1-keselamatan-ergonomi-lingkungan'], relatedTopicIds: ['projekipas-smk-ff-s1-keselamatan-ergonomi-lingkungan'], suggestedGrade: '11' }
  ),
  ext(
    'projekipas-smk-ff-s2-etika-industri-kesehatan', 'Projek IPAS (SMK)', 'SMK', 'Fase F', 'Keselamatan Sosial & Kerja',
    'Pencegahan Penyakit Akibat Kerja (PAK), Manajemen Kelelahan, & Komunikasi Darurat di Lokasi PKL',
    'Peserta didik dapat mengidentifikasi risiko jangka panjang penyakit akibat posisi kerja berulang serta menyusun skenario pelaporan dan pertolongan cepat saat insiden PKL.',
    'Latih membedakan kecelakaan mendadak vs gangguan kronis akibat ergonomi dan paparan bahan tanpa APD.',
    'Menumbuhkan kewaspadaan kesehatan jangka panjang dan kesiapan tanggap darurat kerja.',
    ['Audit ergonomi & K3LH Sem 1'],
    ['Peta risiko PAK spesifik dan alur eskalasi darurat terverifikasi jelas'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['projekipas-smk-ff-s1-keselamatan-ergonomi-lingkungan'], relatedTopicIds: ['projekipas-smk-ff-s1-keselamatan-ergonomi-lingkungan'], suggestedGrade: '11' }
  ),
  ext(
    'projekipas-smk-ff-s2-kajian-kelayakan-hijau', 'Projek IPAS (SMK)', 'SMK', 'Fase F', 'Integrasi Sains & Kewargaan Kerja',
    'Laporan Studi Kelayakan Teknis–Lingkungan–Sosial Proyek Akhir Kejuruan Ramah Lingkungan',
    'Peserta didik dapat menyusun ringkasan uji kelayakan terpadu atas proyek produk/jasa kelas meliputi aspek efisiensi energi/bahan, keamanan limbah, dan penerimaan sosial pengguna.',
    'Padukan data observasi fisis/kimia sederhana dengan umpan balik calon pengguna lapangan.',
    'Menghasilkan kajian komprehensif pertanggungjawaban ilmiah-sosial atas karya vokasional.',
    ['Material, rantai pasok, & ekonomi sirkular'],
    ['Laporan kelayakan menjawab indikator efisiensi sumber daya, K3LH, dan manfaat bagi pengguna'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['projekipas-smk-ff-s2-proyek-transisi-energi-hijau'], relatedTopicIds: ['projekipas-smk-ff-s2-proyek-transisi-energi-hijau'], suggestedGrade: '11' }
  ),

  // =====================================================================
  // KELENGKAPAN FASE B & C (SD) SERTA FASE E & F (SMA) UNTUK PAI, PJOK, SENI BUDAYA, DAN SENI MUSIK
  // =====================================================================
  ext(
    'pai-fb-s1-surah-hujurat-rasul', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase B', 'Al-Qur’an & Hadis',
    'Membaca QS. Al-Hujurat: 13 / At-Tin serta Hadis Tentang Persaudaraan dan Menghindari Sikap Sombong',
    'Peserta didik dapat membaca ayat tentang keragaman manusia dengan tartil dasar serta mempraktikkan sikap menghargai teman berbeda latar belakang.',
    'Hubungkan ayat tentang suku dan bangsa dengan larangan mengejek atau mengucilkan teman kelas.',
    'Menumbuhkan rasa persaudaraan kemanusiaan dan rendah hati berdasar pesan ayat.',
    ['Surah pendek Fase A'],
    ['Menyebutkan pesan keragaman QS. Al-Hujurat: 13 disertai contoh sikap toleran di sekolah'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fb-s2-baligh-tanggung-jawab', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase B', 'Fikih & Akhlak Tanggung Jawab',
    'Tanda Usia Baligh Menurut Ilmu Fikih–Biologi serta Kewajiban Menjaga Aurat, Shalat, & Kebersihan Diri',
    'Peserta didik dapat menyebutkan tanda kedewasaan awal (baligh) secara santun-ilmiah serta tanggung jawab baru menjaga ibadah dan pergaulan sehat.',
    'Berikan penjelasan edukatif ramah anak mengenai perubahan fisik pubertas dan tanggung jawab mukallaf.',
    'Menyiapkan kedisiplinan ibadah dan kesadaran menjaga kehormatan diri menjelang pra-remaja.',
    ['Wudhu & shalat Fase A/B'],
    ['Mengidentifikasi tanda baligh dan kewajiban mukallaf secara santun dan tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['pai-sd-s1-thaharah-shalat'], relatedTopicIds: ['pai-sd-s1-thaharah-shalat'], suggestedGrade: '4', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fb-s2-hijrah-madinah-masjid', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase B', 'Sejarah Keteladanan',
    'Kisah Hijrah ke Madinah, Pembangunan Masjid, dan Mempersaudarakan Kaum Muhajirin–Anshar',
    'Peserta didik dapat menceritakan sebab hijrah Nabi Muhammad saw. serta meneladani semangat persaudaraan, tolong-menolong, dan cinta masjid.',
    'Kaitkan pesan persaudaraan Madinah dengan budaya tolong-menolong dan menjaga masjid/mushala sekolah.',
    'Meneladani keteguhan iman dan solidaritas sosial dari peristiwa hijrah Nabi.',
    ['Kisah sifat jujur Nabi Fase A'],
    ['Menjelaskan sebab hijrah dan contoh sikap persaudaraan Muhajirin–Anshar dengan benar'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '4', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fb-s2-salat-jumat-duha-tahajud', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase B', 'Fikih Ibadah Sunnah & Jumat',
    'Mengenal Ketentuan Shalat Jumat serta Pembiasaan Shalat Sunnah Duha dan Tahajud Ringkas',
    'Peserta didik dapat menjelaskan syarat serta adab mendengarkan khutbah Shalat Jumat dan mengenal keutamaan membiasakan shalat sunnah Duha.',
    'Tekankan tertib mendengarkan khutbah tanpa bermain serta berdoa memohon kelapangan ilmu.',
    'Memperkaya ibadah wajib dengan kebiasaan shalat berjamaah Jumat dan ibadah sunnah harian.',
    ['Shalat fardu Fase B Sem 1'],
    ['Menjelaskan adab khutbah Jumat dan niat/waktu pelaksanaan Shalat Duha tepat'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['pai-sd-s1-thaharah-shalat'], relatedTopicIds: ['pai-sd-s1-thaharah-shalat'], suggestedGrade: '4', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fc-s1-surah-almaun-duha', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase C', 'Al-Qur’an & Kepedulian',
    'Kandungan QS. Al-Ma’un dan QS. Adh-Dhuha tentang Menyantuni Anak Yatim dan Tidak Lalai Ibadah',
    'Peserta didik dapat membedakan ciri pendusta agama menurut QS. Al-Ma’un (menghardik yatim, enggan menolong, riya shalat) serta membiasakan keikhlasan berbagi.',
    'Ajak merancang aksi sedekah barang layak pakai atau berbagi bekal bersama teman sekelas secara santun tanpa pamer.',
    'Mengintegrasikan kekhusyukan ibadah dengan empati sosial kepada kaum lemah.',
    ['Membaca tartil Fase B'],
    ['Identifikasi perilaku yang dikecam dalam QS. Al-Ma’un dan rencana aksi berbagi tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fc-s1-hari-akhir-qadha-sd', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase C', 'Akidah Fase C',
    'Makna Iman Kepada Hari Akhir serta Mengenal Takdir Baik dan Takdir yang Dapat Diusahakan',
    'Peserta didik dapat menghubungkan keyakinan pertanggungjawaban amal pada Hari Akhir dengan sikap disiplin, jujur, serta gigih berikhtiar dan berdoa.',
    'Hindari pendekatan menakut-nakuti; fokuskan pesan harapan dan tanggung jawab berbuat kebaikan kecil setiap hari.',
    'Menumbuhkan kesadaran tanggung jawab amal pribadi dan semangat berusaha disertai doa.',
    ['Asmaul Husna Fase B'],
    ['Memberi contoh hubungan iman hari akhir dengan tanggung jawab tugas kelas sehari-hari'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '6', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fc-s1-halal-haram-konsumsi-sd', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase C', 'Fikih Kehidupan',
    'Dasar Ketentuan Halal–Haram Makanan/Minuman serta Adab Menggunakan Barang Pinjaman/Temuan',
    'Peserta didik dapat membedakan sebab benda menjadi halal atau haram (zat maupun cara perolehannya) serta cara aman mengembalikan barang temuan (luqathah).',
    'Tekankan meskipun makanan halal zatnya, bila diambil tanpa izin pemiliknya menjadi tidak berkah.',
    'Membiasakan integritas kepemilikan dan kehati-hatian konsumsi halal–baik (halalan thayyiban).',
    ['Jujur amanah Fase B'],
    ['Membedakan haram zat vs haram perolehan pada studi kasus anak secara tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '6', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fc-s2-ukhuwah-lingkungan-sd', 'Pendidikan Agama Islam & Budi Pekerti', 'SD/MI', 'Fase C', 'Akhlak & Kepedulian Ekologis',
    'Menjaga Kelestarian Alam Sebagai Wujud Iman dan Mempraktikkan Ukhuwah Basariyah',
    'Peserta didik dapat merancang aksi kelas merawat tanaman, menghemat air/listrik, dan mencegah perundungan terhadap teman sebagai pengamalan Islam rahmat untuk alam.',
    'Padukan tanggung jawab merawat tanaman/kebersihan sekolah dengan etika bertutur lembut.',
    'Mewujudkan kasih sayang kepada manusia dan lingkungan sekitar secara konsisten.',
    ['Al-Ma’un & keragaman'],
    ['Rencana aksi kelas menyertakan pembagian tugas peduli lingkungan dan komitmen anti-perundungan'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['pai-fc-s1-surah-almaun-duha'], relatedTopicIds: ['pai-fc-s1-surah-almaun-duha'], suggestedGrade: '6', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),

  // PAI SMA Fase E & Fase F tambahan (agar >= 3 Sem 1 dan >= 3 Sem 2 masing-masing!)
  ext(
    'pai-fe-s1-syuabul-iman-pergaulan', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase E', 'Akidah & Akhlak Remaja',
    'Cabang-Cabang Iman (Syu’abul Iman) dalam Menjaga Kehormatan Diri dan Menghindari Pergaulan Bebas',
    'Peserta didik dapat mengaitkan dimensi iman di hati, lisan, dan perbuatan dengan komitmen menjaga kehormatan diri, pergaulan sehat, serta larangan mendekati zina.',
    'Gunakan diskusi empatik tentang batasan pergaulan sehat remaja serta kesadaran perlindungan diri di ruang digital.',
    'Mengamalkan iman sebagai benteng moral pribadi dan penghormatan martabat diri.',
    ['Akhlak digital SMP'],
    ['Identifikasi cabang iman hati–lisan–perbuatan serta analisis pencegahan pergaulan berisiko tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fe-s1-khalifah-ulama-nusantara', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase E', 'Sejarah Islam Nusantara',
    'Peran Ulama Awal Nusantara dalam Dakwah Damai, Literasi Aksara, dan Penguatan Karakter Kebangsaan',
    'Peserta didik dapat menelusuri kontribusi tokoh penyebar dan ulama Nusantara (Wali Songo hingga Syeikh Nawawi/Abdurrauf as-Singkili) dalam memadukan ilmu agama dan budaya setempat.',
    'Soroti penggunaan bahasa lokal, seni budaya, dan karya tulis kitab sebagai warisan peradaban damai Nusantara.',
    'Menghargai warisan intelektual ulama Nusantara yang moderat dan mencintai tanah air.',
    ['Sejarah Abbasiyah & Nusantara SMP'],
    ['Ringkasan kontribusi minimal 2 tokoh ulama Nusantara di bidang keilmuan dan perdamaian tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fe-s2-hindari-tabdzir-hasad-riyak', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase E', 'Akhlak & Pengendalian Hati',
    'Menghindari Gaya Hidup Foya-Foya (Tabdzir), Riya/Pamer Digital, Takabur, dan Hasad',
    'Peserta didik dapat mendiagnosis dampak psikologis–ekologis perilaku konsumerisme pamer di media sosial serta merancang pola hidup qanaah dan hemat.',
    'Kaitkan kesederhanaan (qanaah) dengan pengurangan pemborosan makanan, fashion cepat, dan utang konsumtif.',
    'Mengendalikan dorongan pamer dan konsumerisme melalui kesadaran syukur dan berbagi.',
    ['Kompetisi kebaikan Sem 1'],
    ['Audit kebiasaan konsumsi pribadi menghasilkan strategi konkret menghindari tabdzir & pamer'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['pai-fe-s1-kompetisi-kebaikan-muamalah'], relatedTopicIds: ['pai-fe-s1-kompetisi-kebaikan-muamalah'], suggestedGrade: '10', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fe-s2-kulliyatul-khamsah-maslahat', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase E', 'Fikih & Prinsip Perlindungan',
    'Lima Prinsip Pokok Syariah (Al-Kulliyat al-Khamsah) dalam Melindungi Agama, Jiwa, Akal, Keturunan, dan Harta',
    'Peserta didik dapat menerapkan lima prinsip maqashid untuk menganalisis isu keselamatan lalu lintas, literasi anti-hoaks, kesehatan mental, dan perlindungan hak milik.',
    'Tunjukkan bagaimana syariat Islam sejalan dengan hukum positif dalam melindungi jiwa dan akal sehat warga.',
    'Mengevaluasi masalah sosial kontemporer berdasarkan lima prinsip pokok perlindungan manusia.',
    ['Muamalah & Syu’abul Iman Sem 1'],
    ['Pemetaan studi kasus kontemporer terhadap lima prinsip Al-Kulliyat al-Khamsah akurat'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['pai-fe-s1-syuabul-iman-pergaulan'], relatedTopicIds: ['pai-fe-s1-syuabul-iman-pergaulan'], suggestedGrade: '10', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-fe-s2-literasi-ekonomi-asuransi-bank-syariah', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase E', 'Fikih Muamalah Terapan',
    'Mekanisme Kerja Bank Syariah, Koperasi Syariah, dan Asuransi Syariah (Takaful) Bebas Riba–Gharar',
    'Peserta didik dapat membedakan skema bagi hasil mudharabah/musyarakah dan tolong-menolong takaful dari praktik bunga tetap dan spekulasi.',
    'Hubungkan prinsip keadilan muamalah Sem 1 ke instrumen keuangan modern legal yang diawasi otoritas.',
    'Menerapkan literasi keuangan syariah yang transparan untuk kebutuhan investasi/proteksi aman.',
    ['Prinsip muamalah halal Sem 1'],
    ['Perbandingan akad bank/asuransi syariah vs konvensional tepat tanpa klaim keliru'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['pai-fe-s1-kompetisi-kebaikan-muamalah'], relatedTopicIds: ['pai-fe-s1-kompetisi-kebaikan-muamalah'], suggestedGrade: '10', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  // PAI SMA Fase F (Kelas 11-12)
  ext(
    'pai-ff-s1-tadabbur-bencana-sabar', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase F', 'Al-Qur’an & Ketangguhan Hidup',
    'Adab Menjaga Ekosistem, Sikap Sabar & Syukur Menghadapi Ujian Bencana (QS. Al-Baqarah: 155–156)',
    'Peserta didik dapat menafsirkan pesan ketangguhan mental (resiliensi) dan solidaritas kemanusiaan tanpa membeda-bedakan saat membantu korban bencana alam.',
    'Gabungkan kesiapsiagaan ikhtiar mitigasi bencana dengan doa tawakal dan aksi kerelawanan.',
    'Membangun ketangguhan spiritual sekaligus kepedulian tanggap bencana berbasis kemanusiaan.',
    ['Berpikir kritis & perlindungan jiwa'],
    ['Refleksi pesan ayat sabar memuat langkah ikhtiar mitigasi nyata sekaligus doa tawakal'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-ff-s1-cabang-iman-jujur-organisasi', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase F', 'Akhlak & Kepemimpinan',
    'Menepati Janji, Menjaga Aib Sesama di Ruang Publik, dan Integritas Kepemimpinan Anti-Suap',
    'Peserta didik dapat menganalisis bahaya budaya mencontek, plagiarisme, dan penyalahgunaan dana kegiatan OSIS sebagai awal kerusakan amanah publik.',
    'Gunakan studi kasus dilema etis bendahara/ketua panitia siswa dan mekanisme audit jujur.',
    'Membiasakan kepemimpinan amanah yang menjaga kehormatan diri dan kepercayaan sesama.',
    ['Syu’abul iman Fase E'],
    ['Analisis dilema integritas organisasi menyajikan solusi amanah yang transparan'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-ff-s1-ketentuan-khutbah-dakwah', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase F', 'Fikih & Komunikasi Dakwah',
    'Rukun Khutbah, Tablig Santun, dan Dakwah Bil-Hikmah di Ruang Digital Tanpa Ujaran Kebencian',
    'Peserta didik dapat membedakan syarat khutbah resmi dengan dakwah umum serta menyusun naskah ajakan kebaikan 3 menit yang menyejukkan dan berdasar dalil sahih.',
    'Tekankan prinsip mau’izhah hasanah (nasihat baik) serta menjauhi penghakiman kasar di media sosial.',
    'Mengomunikasikan nilai kebaikan Islam dengan pendekatan bijaksana, santun, dan berbasis sumber akurat.',
    ['Akhlak digital & literasi ilmu'],
    ['Naskah ceramah/konten dakwah memuat rujukan jelas dan disampaikan penuh kelembutan tanpa provokasi'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-ff-s2-munakahat-waris-pai', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase F', 'Fikih Keluarga & Sosial',
    'Ketentuan Pernikahan dalam Islam dan Pengenalan Prinsip Keadilan Hukum Waris (Mawaris)',
    'Peserta didik dapat menjelaskan tujuan membangun keluarga sakinah berkeadilan, kesiapan lahir–batin pernikahan sesuai UU, serta dasar proporsional hak waris keluarga inti.',
    'Fokus pada tanggung jawab timbal balik suami–istri dan pencatatan resmi negara demi perlindungan hak anak.',
    'Memahami tata nilai keluarga sakinah bertanggung jawab serta prinsip keadilan waris Islam.',
    ['Al-Kulliyat al-Khamsah Fase E'],
    ['Rukun nikah, arti kesiapan usia dewasa, dan pembagian waris dasar keluarga inti dihitung tepat'],
    '2 (Genap)', 'pendalaman', { suggestedGrade: '12', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),
  ext(
    'pai-ff-s2-tokoh-pembaharu-moderasi', 'Pendidikan Agama Islam & Budi Pekerti', 'SMA/MA', 'Fase F', 'Peradaban Modern & NKRI',
    'Kontribusi Tokoh Pembaharu Dunia Islam dan Islam Wasathiyah Indonesia dalam Perdamaian Dunia',
    'Peserta didik dapat mengevaluasi kiprah organisasi Islam dan ulama Indonesia merawat Pancasila–NKRI sebagai contoh harmoni Islam, demokrasi, dan kebhinekaan di mata dunia.',
    'Diskusikan prinsip tawassuth (moderat), tawazun (seimbang), dan tasamuh (toleran) sebagai ciri Islam Nusantara.',
    'Mengintegrasikan kesadaran keislaman moderat dengan kontribusi positif bagi masyarakat dunia.',
    ['Sejarah ulama Nusantara Fase E'],
    ['Kajian kasus menjelaskan wujud sikap wasathiyah di lingkungan sekolah dan warga dunia'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12', sumberDokumen: BKPDM_020_DOC, tahunVersi: '2026', urlReferensi: BKPDM_020_URL }
  ),

  // PJOK SD Fase B & C + SMA Fase E & F tambahan (agar setiap semester di B/C/E/F >= 3)
  ext(
    'pjok-fb-s1-lari-estafet-ketangkasan', 'PJOK', 'SD/MI', 'Fase B', 'Atletik & Ketangkasan',
    'Kombinasi Lari–Lompat Rintangan Rendah dan Gerak Keseimbangan Senam Lantai Dasar',
    'Peserta didik dapat memadukan awalan lari pelan ke tolakan melompati rintangan aman dan menjaga keseimbangan sikap pesawat terbang dengan kontrol tubuh baik.',
    'Pastikan area mendarat rata memakai matras tipis atau rumput rata bebas batu.',
    'Mengembangkan koordinasi transisi lari ke lompatan serta kontrol keseimbangan statis.',
    ['Lokomotor Fase A'],
    ['Mendarat dengan dua kaki mengeper mantap dan mempertahankan sikap keseimbangan 8 detik'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '3' }
  ),
  ext(
    'pjok-fb-s2-aktivitas-air-kebersihan-b', 'PJOK', 'SD/MI', 'Fase B', 'Keselamatan & Pola Hidup Sehat',
    'Aturan Keselamatan Lingkungan Bermain–Air, Pencegahan Cedera Ringan, & Pemilihan Jajanan Sehat',
    'Peserta didik dapat mengenali tanda peringatan bahaya di kolam/sungai/jalan raya serta memilih jajanan kemasan berizin dan bergizi seimbang.',
    'Latih membaca tanggal kedaluwarsa serta mempraktikkan cara meminta bantuan orang dewasa saat teman terjatuh.',
    'Membangun kesadaran keselamatan lingkungan dan literasi gizi jajan anak kelas 3–4.',
    ['Gizi & kebersihan diri Sem 1'],
    ['Identifikasi 3 simbol bahaya bermain dan alasan memilih jajanan sehat berdasar label tepat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '4' }
  ),
  ext(
    'pjok-fb-s2-permainan-bola-kecil-b', 'PJOK', 'SD/MI', 'Fase B', 'Permainan & Sportivitas',
    'Teknik Dasar Melempar, Menangkap, dan Memukul Bola Kecil (Kasti/Rounders) dengan Sportif',
    'Peserta didik dapat melempar mendatar/melambung berpasangan dengan arah terkontrol serta menerima giliran jaga vs pukul dengan sportif.',
    'Gunakan bola tenis/karet empuk dan fokus pada pandangan mata ke arah sasaran.',
    'Mengontrol akurasi gerak manipulatif bola kecil dan menghargai peran bergantian dalam tim.',
    ['Lempar tangkap Fase A'],
    ['Lemparan mencapai sasaran teman dengan arah konsisten dan bermain tanpa kecurangan'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '4' }
  ),
  ext(
    'pjok-fb-s2-senam-irama-kelompok-b', 'PJOK', 'SD/MI', 'Fase B', 'Aktivitas Gerak Berirama',
    'Gerak Langkah Kaki dan Ayunan Lengan Senam Irama Anak Secara Kompak',
    'Peserta didik dapat merangkai langkah depan–samping bersama ayunan dua lengan sesuai ketukan lagu daerah/senam anak.',
    'Latih perpindahan gerak 2×8 hitungan dalam formasi berbaris rapi.',
    'Menyelaraskan kelenturan lengan dan ritme langkah bersama kelompok.',
    ['Gerak berirama Fase A'],
    ['Formasi kelompok menjaga kekompakan tempo dan keluwesan ayunan lengan'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '4' }
  ),
  ext(
    'pjok-fc-s1-passing-bola-besar-c', 'PJOK', 'SD/MI', 'Fase C', 'Permainan Bola Besar',
    'Kombinasi Passing Bawah/Atas, Menggiring Bola, dan Komunikasi Kerja Sama Tim',
    'Peserta didik dapat mempraktikkan variasi passing kaki bagian dalam/tangan serta bergerak mencari ruang kosong untuk menerima umpan rekan setim.',
    'Fokus pada kesadaran posisi ruang dan komunikasi suara singkat ("Oper!", "Siap!") antarrekan.',
    'Mengembangkan akurasi umpan dasar dan komunikasi kerja sama dalam permainan tim.',
    ['Permainan bola kecil Fase B'],
    ['Kontrol bola dan akurasi umpan pendek berjalan lancar sambil melibatkan seluruh anggota tim'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5' }
  ),
  ext(
    'pjok-fc-s1-senam-lantai-matras-c', 'PJOK', 'SD/MI', 'Fase C', 'Senam Lantai & Ketangkasan',
    'Peregangan Sendi Bahu–Punggung, Sikap Lilin, dan Latihan Guling Depan Aman di Atas Matras',
    'Peserta didik dapat melakukan pemanasan kelenturan tulang belakang secara memadai dan mendemonstrasikan awalan jongkok tangan selebar bahu guling depan di bawah pengawasan guru.',
    'Keselamatan mutlak: tekankan dagu menempel ke dada agar beban berguling di tengkuk/punggung atas, bukan ubun-ubun kepala.',
    'Melatih keberanian terkontrol dan penerapan prosedur keselamatan senam matras.',
    ['Keseimbangan Fase B'],
    ['Prosedur posisi dagu–tangan diikuti tertib dan siswa memeriksa kerataan matras sebelum mulai'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '6' }
  ),
  ext(
    'pjok-fc-s1-bahaya-rokok-napza-c', 'PJOK', 'SD/MI', 'Fase C', 'Pola Hidup Sehat',
    'Menjaga Kesehatan Jantung–Paru: Bahaya Merokok, Minuman Beralkohol, dan Zat Adiktif Sejak Dini',
    'Peserta didik dapat menjelaskan kerusakan organ pernapasan–peredaran darah akibat asap rokok/vape serta mempraktikkan cara asertif menolak ajakan berisiko.',
    'Simulasikan kalimat penolakan tegas dan sopan ("Tidak, saya menjaga kesehatan/olahraga") bila mendapat tekanan teman.',
    'Membangun ketegasan menolak perilaku merusak kesehatan di masa transisi pra-remaja.',
    ['Gizi & keselamatan Fase B'],
    ['Menjelaskan minimal 2 bahaya rokok bagi paru-paru dan mempraktikkan penolakan asertif'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '6' }
  ),
  ext(
    'pjok-fc-s2-atletik-lompat-lempar-c', 'PJOK', 'SD/MI', 'Fase C', 'Atletik Anak (Lari–Lompat–Lempar)',
    'Koordinasi Lari Cepat Jarak Pendek, Lompat Jauh Awalan Pendek, dan Lempar Turbo Aman',
    'Peserta didik dapat mengombinasikan ayunan lengan cepat saat sprint, tumpuan satu kaki pada papan lompat, serta lemparan bersudut aman menggunakan roket busa/turbo.',
    'Atur zona lempar bebas lintasan anak lain sebelum aba-aba lempar dan mengambil alat bersama.',
    'Mengintegrasikan teknik dasar atletik (sprint, tolakan lompat, lempar sudut) secara aman.',
    ['Lari estafet ketangkasan Fase B'],
    ['Prosedur keamanan lemparan ditaati penuh dan koordinasi ayunan lengan–tolakan terlihat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '6' }
  ),
  // PJOK SMA Fase E Sem 2 & Fase F Sem 1 tambahan
  ext(
    'pjok-fe-s2-renang-penyelamatan-sma', 'PJOK', 'SMA/MA', 'Fase E', 'Aktivitas Air & Kesiapsiagaan Darurat',
    'Efisiensi Gaya Renang Pilihan (Bebas/Dada) dan Protokol Penyelamatan Korban Tenggelam Aman',
    'Peserta didik dapat menganalisis efisiensi tarikan lengan–napas gaya renang serta prinsip keselamatan penolong (Reach–Throw–Row–Go dengan pelampung) agar tidak menjadi korban ganda.',
    'Jika tidak tersedia kolam renang, jalankan praktik simulasi lempar pelampung, tali penyelamat, dan P3K CPR dasar kering.',
    'Menguasai prinsip penyelamatan diri/orang lain di lingkungan perairan berbasis analisis risiko.',
    ['Keselamatan air SMP'],
    ['Urutan prosedur penyelamatan tanpa kontak langsung bila tanpa kompetensi lifeguard dijelaskan akurat'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '10' }
  ),
  ext(
    'pjok-fe-s2-kebugaran-rekap-data-sma', 'PJOK', 'SMA/MA', 'Fase E', 'Evaluasi Kebugaran Pribadi',
    'Evaluasi Progres Program Latihan 4 Minggu (Pre-Test vs Post-Test Kebugaran & Pemulihan)',
    'Peserta didik dapat membandingkan hasil tes kebugaran awal dan akhir setelah menjalankan program FITT serta menganalisis peran nutrisi–tidur dalam pemulihan otot.',
    'Tunjukkan bagaimana konsistensi latihan ringan-sedang lebih efektif dan aman daripada latihan ekstrem sesaat.',
    'Merefleksikan perkembangan kebugaran pribadi berdasar bukti pengukuran berulang.',
    ['Program FITT Sem 1'],
    ['Laporan evaluasi menampilkan data pre–post kebugaran beserta refleksi faktor pendukung/hambatan'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['pjok-fe-s1-program-latihan-fitt'], relatedTopicIds: ['pjok-fe-s1-program-latihan-fitt'], suggestedGrade: '10' }
  ),
  ext(
    'pjok-ff-s1-performa-olahraga-nutrisi', 'PJOK', 'SMA/MA', 'Fase F', 'Ilmu Olahraga & Nutrisi Lanjutan',
    'Metabolisme Energi Aerobik vs Anaerobik dan Pengaturan Hidrasi–Gizi Seimbang Aktivitas Tinggi',
    'Peserta didik dapat membedakan sistem energi dominan olahraga ketahanan (lari jarak jauh) vs ledakan cepat (sprint/angkat beban) serta menghitung kebutuhan cairan hidrasi.',
    'Hubungkan konsumsi karbohidrat kompleks, protein pemulihan, dan larangan suplemen/doping ilegal.',
    'Menerapkan prinsip ilmu gizi olahraga berbasis bukti untuk performa sehat tanpa zat terlarang.',
    ['Program FITT & ergonomi Fase E'],
    ['Pemilihan pola asupan sebelum–sesudah latihan tepat sesuai durasi dan intensitas gerak'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
  ext(
    'pjok-ff-s1-senam-ritmik-koreografi-sma', 'PJOK', 'SMA/MA', 'Fase F', 'Aktivitas Gerak Berirama Lanjutan',
    'Merancang Koreografi Senam Aerobik / Kebugaran Irama Sekolah dengan Transisi Tempo',
    'Peserta didik dapat merangkai urutan gerak pemanasan, inti intensitas sedang–tinggi, dan pendinginan menjadi sesi senam kelompok berdurasi 5 menit.',
    'Tekankan variasi impact rendah–tinggi agar inklusif bagi seluruh tingkat kebugaran teman sekelas.',
    'Mengorkestrasi latihan ritmik kebugaran yang aman, enerjik, dan mudah diikuti bersama.',
    ['Senam irama SMP & program FITT'],
    ['Koreografi mencakup fase pemanasan–inti–pendinginan bertransisi tempo jelas dan aman sendi'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11' }
  ),

  // SENI dan Budaya SD Fase B & C + Seni Musik Fase E & F agar tiap semester >= 3
  ext(
    'seni-fb-s1-membentuk-tanah-liat-3d', 'SENI dan Budaya', 'SD/MI', 'Fase B', 'Menciptakan (Karya 3 Dimensi)',
    'Eksplorasi Bentuk 3 Dimensi (Tinggi–Lebar–Volume) Memakai Plastisin/Tanah Liat dengan Tekstur Alam',
    'Peserta didik dapat membentuk karya 3 dimensi sederhana (buah/hewan/wadah mini) dengan teknik pijit–pilin serta tekstur permukaan yang sengaja dibuat.',
    'Bandingkan karya datar 2D dengan karya 3D yang dapat dilihat dari berbagai sisi.',
    'Mengembangkan kepekaan ruang volume 3 dimensi dan tekstur raba pada media lunak.',
    ['Unsur garis & warna Fase A'],
    ['Karya 3D berdiri stabil dengan tekstur permukaan disengaja dan proporsi antarbagian wajar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '3' }
  ),
  ext(
    'seni-fb-s2-pertunjukan-cerita-rakyat', 'SENI dan Budaya', 'SD/MI', 'Fase B', 'Mengekspresikan (Teater & Tari)',
    'Pementasan Mini Cerita Rakyat Nusantara: Properti Kertas, Gerak Tubuh, dan Dialog Ekspresif',
    'Peserta didik dapat bekerja sama membuat properti topeng/wayang kertas sederhana dan memerankan tokoh cerita rakyat dengan vokal jelas serta tempo panggung tertib.',
    'Tekankan pembagian peran merata dan menjaga sikap tertib saat kelompok lain tampil.',
    'Mengintegrasikan keterampilan rupa properti dan ekspresi drama–tari kelompok.',
    ['Bermain peran Fase A'],
    ['Pementasan menyatukan properti buatan sendiri, dialog jelas, dan kekompakan transisi adegan'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '4' }
  ),
  ext(
    'seni-fc-s1-batik-ikat-celup-ragam', 'SENI dan Budaya', 'SD/MI', 'Fase C', 'Mengalami & Menciptakan (Seni Rupa)',
    'Mengenal Ragam Motif Tekstil Daerah dan Teknik Simpul–Celup (Jumputan/Tie-Dye) Berpola Ritmis',
    'Peserta didik dapat membedakan beberapa motif batik/tenun Nusantara serta menciptakan pola warna berirama pada kain/kertas dengan teknik lipat-ikat aman.',
    'Ajarkan keseimbangan ruang kosong–penuh agar motif celup terlihat kontras dan bersih.',
    'Menghargai warisan tekstil Nusantara serta mengatur komposisi pola simetris/radial.',
    ['Motif dekoratif Fase B'],
    ['Hasil lipat-ikat menunjukkan keteraturan ritme pola dan perpaduan warna harmonis'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5' }
  ),
  ext(
    'seni-fc-s1-ensambel-musik-tari-c', 'SENI dan Budaya', 'SD/MI', 'Fase C', 'Mengekspresikan (Musik & Tari)',
    'Pengiringan Lagu Daerah dan Pengolahan Pola Lantai Tari Kreasi Berbasis Budaya Setempat',
    'Peserta didik dapat memadukan ketukan alat ritmis sederhana untuk mengiringi nyanyian atau tari daerah bertempo stabil dalam satu penyajian kelas.',
    'Latih menjaga keajegan tempo tanpa makin lama makin cepat saat tampil bersama.',
    'Menyelaraskan penyajian musik/gerak kelompok berakar pada budaya daerah.',
    ['Pola irama & gerak Fase B'],
    ['Tempo lagu atau langkah tari terjaga ajeg dari awal hingga akhir bersama pengiring'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '6' }
  ),
  ext(
    'seni-fc-s2-gambar-ilustrasi-cerita', 'SENI dan Budaya', 'SD/MI', 'Fase C', 'Menciptakan (Komunikasi Visual)',
    'Gambar Ilustrasi dan Komik Strip Edukatif dengan Proporsi Tokoh & Keselarasan Teks–Visual',
    'Peserta didik dapat merancang komik strip 4–6 panel bertema perilaku jujur/hemat energi dengan komposisi tokoh ekspresif dan balon kata mudah dibaca.',
    'Fokus pada keterbacaan alur panel dari kiri ke kanan serta keseimbangan ruang gambar vs teks dialog.',
    'Mengomunikasikan pesan sosial positif secara visual lewat karya ilustrasi berurutan.',
    ['Sketsa motif & warna Fase B'],
    ['Panel komik menyajikan alur cerita utuh dengan proporsi visual konsisten dan teks terbaca jelas'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '6' }
  ),
  ext(
    'seni-fb-s2-alat-musik-sederhana-b', 'SENI dan Budaya', 'SD/MI', 'Fase B', 'Mengalami & Berpikir Artistik (Musik)',
    'Permainan Alat Musik Ritmis–Melodis Sederhana dengan Dinamika Lembut dan Kuat',
    'Peserta didik dapat memainkan lagu daerah sederhana secara berkelompok menggunakan alat musik ritmis/melodis kelas sambil menjaga dinamika keras–lembut.',
    'Latih membaca tanda keras (forte) dan lembut (piano) sederhana saat mengiringi lagu.',
    'Mengontrol dinamika bermusik dan kekompakan iringan bersama teman.',
    ['Irama dan gerak tari Fase B'],
    ['Perubahan dinamika lembut–kuat terdengar jelas sesuai aba-aba kelompok'],
    '2 (Genap)', 'pengembangan', { suggestedGrade: '4' }
  ),
  ext(
    'seni-fb-s2-cetak-alam-apresiasi-b', 'SENI dan Budaya', 'SD/MI', 'Fase B', 'Merefleksikan & Menciptakan (Seni Rupa)',
    'Karya Teknik Cetak Stensil/Daun serta Refleksi Kelebihan dan Saran Teknik Karya Kelas',
    'Peserta didik dapat mencetak komposisi daun dengan pewarna aman lalu menuliskan satu kelebihan warna/bentuk dan satu saran kerapian pada karya sendiri/teman.',
    'Latih membuat komposisi tumpang-tindih latar–depan pada karya cetak daun.',
    'Mengembangkan kepekaan komposisi lapis gambar dan refleksi karya santun.',
    ['Unsur rupa & karya 3D Fase B'],
    ['Cetakan daun menampilkan komposisi seimbang dan catatan refleksi karya santun'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '4' }
  ),
  ext(
    'seni-fc-s1-musik-ritme-vokal-c', 'SENI dan Budaya', 'SD/MI', 'Fase C', 'Mengalami & Mengekspresikan (Musik)',
    'Vokal Lagu Daerah Nusantara dengan Teknik Pernapasan Diafragma Dasar & Pengiringan Ritmis',
    'Peserta didik dapat menyanyikan satu lagu daerah Indonesia dengan intonasi jelas serta membedakan fungsi alat musik pengiring melodi vs pengiring ketukan.',
    'Bimbing pengucapan artikulasi syair lagu daerah dan pengenalan makna liriknya.',
    'Mengembangkan kepekaan intonasi vokal serta apresiasi lagu daerah Nusantara.',
    ['Lagu daerah & dinamika Fase B'],
    ['Intonasi melodi stabil dan makna lagu daerah diceritakan dengan tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '5' }
  ),
  ext(
    'seni-smp-s1-musik-ekspresi-prakarya', 'Seni Budaya / Prakarya', 'SMP/MTs', 'Fase D', 'Mengalami & Mengekspresikan (Musik)',
    'Eksplorasi Ansambel Musik Daerah–Populer dan Teknik Vokal Unisono Bernapas Diafragma',
    'Peserta didik dapat memainkan pola iringan ritmis atau menyanyikan lagu Nusantara berteknik pernapasan diafragma dalam kelompok kecil secara selaras.',
    'Fokus pada keselarasan tempo, artikulasi vokal jelas, serta pemilihan alat pengiring yang mendukung karakter lagu.',
    'Menyelaraskan vokal/instrumen dasar dalam sajian ansambel bertempo stabil.',
    ['Musik ritme & vokal SD'],
    ['Tempo penyajian stabil dan pembagian tugas melodi serta pengiring jelas'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '8' }
  ),
  ext(
    'seni-smp-s2-desain-poster-komik-smp', 'Seni Budaya / Prakarya', 'SMP/MTs', 'Fase D', 'Menciptakan (Desain Rupa & Media)',
    'Desain Poster Kampanye Sosial & Ilustrasi Digital/Manual dengan Tipografi dan Hierarki Visual',
    'Peserta didik dapat merancang poster layanan masyarakat menggunakan prinsip kontras warna, tipografi terbaca, dan hierarki fokus pembacaan yang efektif.',
    'Ajarkan perbedaan judul utama, subjudul informasi, dan ruang napas (whitespace) agar poster tidak penuh sesak.',
    'Menerapkan prinsip tata letak grafis dan keseimbangan tipografi pada media komunikasi visual.',
    ['Ragam hias & gambar perspektif Sem 1'],
    ['Poster memiliki hierarki judul–isi jelas, keterbacaan baik, dan pesan sosial positif'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['seni-smp-s1-ragam-hias-tekstur'], relatedTopicIds: ['seni-smp-s1-ragam-hias-tekstur'], suggestedGrade: '9' }
  ),

  // Seni Musik Fase E & Fase F tambahan (agar masing-masing punya 3 Sem 1 + 3 Sem 2)
  ext(
    'musik-fe-sma-s1-analisis-harmoni-bentuk-e', 'Seni Musik', 'SMA/MA', 'Fase E', 'Merefleksikan & Mengalami',
    'Analisis Bentuk Lagu Populer–Nusantara dan Progresi Akord Dasar dalam Pengiringan Vokal/Instrumen',
    'Peserta didik dapat mengidentifikasi struktur bentuk lagu (intro–verse–bridge–chorus–coda) serta memetakan pergerakan fungsi akord tonika–subdominan–dominan pada pengiringan.',
    'Merujuk Panduan Mata Pelajaran Seni Musik (Rev. 3, 13 Sep 2025): hubungkan analisis pendengaran dengan keterampilan membaca chart akord.',
    'Mengenali arsitektur bentuk lagu dan fungsi progresi akord dalam penyajian musikal.',
    ['Notasi & ansambel Fase D'],
    ['Bagan analisis bentuk lagu memetakan tiap seksi tepat bersama perubahan progresi akord dasar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '10', sumberDokumen: 'Contoh & Inspirasi Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 September 2025 — Kemendikdasmen)', urlReferensi: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/19.%20Final%20Panduan%20Mata%20Pelajaran%20Seni%20Musik_13_09_2025_Revisi%203.pdf', tahunVersi: '2025' }
  ),
  ext(
    'musik-fe-sma-s2-pertunjukan-lintas-budaya-e', 'Seni Musik', 'SMA/MA', 'Fase E', 'Berpikir Artistik & Berdampak',
    'Penyajian Musik Kolaboratif Lintas Gaya dengan Penataan Panggung & Keseimbangan Akustik Ruang',
    'Peserta didik dapat mementaskan karya aransemen lintas budaya di ruang kelas/aula sekolah dengan mengatur posisi mikrofon/instrumen agar tercipta keseimbangan suara.',
    'Merujuk Panduan Seni Musik: biasakan soundcheck singkat dan komunikasi nonverbal (cueing) antarpemain di panggung.',
    'Mengelola aspek teknis penyajian panggung agar pesan artistik musik tersampaikan jernih.',
    ['Aransemen lintas budaya Sem 2'],
    ['Pertunjukan menerapkan penataan balance suara baik dan catatan soundcheck terdokumentasi'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '10', sumberDokumen: 'Contoh & Inspirasi Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 September 2025 — Kemendikdasmen)', urlReferensi: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/19.%20Final%20Panduan%20Mata%20Pelajaran%20Seni%20Musik_13_09_2025_Revisi%203.pdf', tahunVersi: '2025' }
  ),
  ext(
    'musik-ff-sma-s1-musikologi-tradisi-kontemporer', 'Seni Musik', 'SMA/MA', 'Fase F', 'Mengalami & Merefleksikan',
    'Kajian Musik Nusantara Kontemporer, Etnomusikologi Dasar, & Fungsi Musik pada Ritual–Masyarakat',
    'Peserta didik dapat menganalisis bagaimana tradisi musik daerah bertransformasi dalam konteks pertunjukan modern atau kolaborasi global tanpa kehilangan jati diri estetik.',
    'Telusuri contoh karya gamelan kontemporer atau fusion etnik Indonesia menggunakan kriteria etnomusikologi sederhana.',
    'Mengevaluasi dinamika pelestarian vs inovasi musik tradisi dalam lanskap budaya kontemporer.',
    ['Estetika eksperimen bunyi & kritik musik Fase E'],
    ['Esai kajian membandingkan fungsi musik tradisi asli dan wujud inovasi kontemporernya dengan bukti audio'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: 'Contoh & Inspirasi Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 September 2025 — Kemendikdasmen)', urlReferensi: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/19.%20Final%20Panduan%20Mata%20Pelajaran%20Seni%20Musik_13_09_2025_Revisi%203.pdf', tahunVersi: '2025' }
  ),
  ext(
    'musik-ff-sma-s1-orkestrasi-aransemen-multi-instrumen', 'Seni Musik', 'SMA/MA', 'Fase F', 'Menciptakan & Berpikir Artistik',
    'Teknik Aransemen Lanjutan: Counter-Melody, Voicing Harmoni 4 Suara, dan Penulisan Partitur Instrumen',
    'Peserta didik dapat menyusun partitur aransemen multi-bagian (melodi utama, counter-melody, harmoni 4-suara/akord perluasan, dan ritme) siap dimainkan ansambel sekolah.',
    'Perhatikan rentang nada nyaman (tessitura) vokal/instrumen agar partitur realistis untuk dimainkan manusia.',
    'Mengembangkan kecakapan menulis aransemen polifonis/homofonis berlapis yang playable dan musikal.',
    ['Harmoni lanjutan Sem 1'],
    ['Partitur mencantumkan tanda dinamika, tempo, serta rentang nada sesuai karakter instrumen'],
    '1 (Ganjil)', 'integrasi', { prasyaratTopicIds: ['musik-ff-sma-s1-harmoni-lanjutan-musikologi'], relatedTopicIds: ['musik-ff-sma-s1-harmoni-lanjutan-musikologi'], suggestedGrade: '11', sumberDokumen: 'Contoh & Inspirasi Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 September 2025 — Kemendikdasmen)', urlReferensi: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/19.%20Final%20Panduan%20Mata%20Pelajaran%20Seni%20Musik_13_09_2025_Revisi%203.pdf', tahunVersi: '2025' }
  ),
  ext(
    'musik-ff-sma-s2-produksi-rekaman-portofolio', 'Seni Musik', 'SMA/MA', 'Fase F', 'Berpikir Artistik & Menciptakan',
    'Produksi Audio–Visual Karya Musik Mandiri: Perekaman Multi-Track, Mixing Dasar, & Publikasi Etis',
    'Peserta didik dapat merekam dan menyunting karya komposisi atau aransemen kelompok secara digital dengan kejernihan dinamika seimbang serta mencantumkan kredit pencipta sah.',
    'Tekankan etika atribusi pencipta lagu/aransemen dan lisensi distribusi portofolio digital.',
    'Menghasilkan rekaman dokumentasi karya bermutu baik yang siap menjadi portofolio pasca-SMA.',
    ['Aransemen multi-instrumen & produksi awal Fase E'],
    ['Master audio/video tidak distorsi (clipping), seimbang antarkanal, dan disertai kredit HAKI lengkap'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '12', sumberDokumen: 'Contoh & Inspirasi Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 September 2025 — Kemendikdasmen)', urlReferensi: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/19.%20Final%20Panduan%20Mata%20Pelajaran%20Seni%20Musik_13_09_2025_Revisi%203.pdf', tahunVersi: '2025' }
  ),
  ext(
    'musik-ff-sma-s2-kurasi-resensi-estetika-akhir', 'Seni Musik', 'SMA/MA', 'Fase F', 'Merefleksikan & Berdampak',
    'Kurasi Apresiasi Konser Akhir, Evaluasi Musikal Mendalam, dan Refleksi Peran Musik Sepanjang Hayat',
    'Peserta didik dapat memandu audiens melalui catatan program konser (program notes) informatif dan mengevaluasi pencapaian artistik serta dampak sosial proyek musik jenjang SMA.',
    'Gunakan refleksi menyeluruh atas perkembangan musikal dari pengenalan unsur hingga penciptaan dan produksi konser.',
    'Mengintegrasikan kemampuan berpikir estetis, kerja artistik, dan tanggung jawab sosial budaya.',
    ['Komposisi & produksi konser'],
    ['Program notes menjelaskan latar karya tepat dan laporan evaluasi konser berbasis data umpan balik audiens'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['musik-ff-sma-s2-komposisi-manajemen-konser'], relatedTopicIds: ['musik-ff-sma-s2-komposisi-manajemen-konser'], suggestedGrade: '12', sumberDokumen: 'Contoh & Inspirasi Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 September 2025 — Kemendikdasmen)', urlReferensi: 'https://kurikulum.kemendikdasmen.go.id/file/panduan/dokumen/19.%20Final%20Panduan%20Mata%20Pelajaran%20Seni%20Musik_13_09_2025_Revisi%203.pdf', tahunVersi: '2025' }
  ),

  // =====================================================================
  // FIKIH (MI) FASE B (Kelas 3-4) & FASE C (Kelas 5-6) — terpisah dari MTs!
  // =====================================================================
  ext(
    'fikih-mi-fb-s1-jual-beli-khiyar-awal', 'Fikih (MI)', 'SD/MI', 'Fase B', 'Fikih Muamalah Anak',
    'Jual Beli Sah, Khiyar, Akad Kerja Sama, dan Identifikasi Praktik Riba/Gharar dalam Jual Beli Anak',
    'Peserta didik dapat membedakan transaksi jual beli kantin yang jujur jelas barang–harganya dari transaksi tidak jelas (gharar seperti kotak misteri berisiko penipuan) dan pentingnya ijab–qabul.',
    'Gunakan simulasi transaksi jajan anak dengan akad ijab–qabul jelas serta pengamatan hak pilih khiyar bila barang cacat.',
    'Membiasakan kejujuran bertransaksi dan mengenali unsur kejelasan akad bebas gharar sejak usia MI.',
    ['Adab jujur & amanah Fase A'],
    ['Identifikasi syarat jual beli sah, khiyar, dan alasan menghindari gharar kotak misteri tepat'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '4', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fb-s1-tanda-baligh-khitan', 'Fikih (MI)', 'SD/MI', 'Fase B', 'Fikih Kedewasaan & Kesucian',
    'Ketentuan Khitan, Tanda Kedewasaan (Baligh), serta Cara Bersuci dari Hadas Besar Secara Edukatif',
    'Peserta didik dapat menjelaskan hikmah kebersihan khitan serta tanda-tanda baligh laki-laki dan perempuan sebagai awal tanggung jawab ibadah pribadi (taklif).',
    'Sampaikan dengan bahasa santun, edukatif, dan menjaga rasa hormat atas kesiapan mental siswa menuju usia baligh.',
    'Memahami transisi tanggung jawab ibadah fardu dan tata cara menyucikan diri.',
    ['Wudhu & air suci Fase A'],
    ['Menyebutkan tanda baligh dan rukun mandi wajib dengan bahasa santun tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '4', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fb-s1-puasa-shalat-sunnah-mi', 'Fikih (MI)', 'SD/MI', 'Fase B', 'Fikih Ibadah',
    'Syarat–Rukun Puasa Ramadhan, Shalat Sunnah Rawatib–Tarawih, dan Kemudahan Shalat Bagi Orang Sakit',
    'Peserta didik dapat membedakan hal yang membatalkan puasa dari perbuatan makruh serta menjelaskan rukhsah cara shalat sambil duduk/berbaring bila berhalangan fisik.',
    'Tunjukkan keluasan rahmat Islam dalam rukhsah shalat orang sakit dan kegembiraan shalat berjamaah Tarawih.',
    'Mengenal kemudahan keringanan shalat ketika sakit dan ketentuan dasar puasa Ramadhan.',
    ['Gerakan shalat tuma’ninah Fase A'],
    ['Menjelaskan urutan tata cara shalat duduk saat sakit dan rukun puasa secara benar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '3', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fb-s2-shalat-jumat-idain', 'Fikih (MI)', 'SD/MI', 'Fase B', 'Fikih Ibadah Jamaah',
    'Ketentuan Shalat Jumat, Shalat Id (Idul Fitri & Idul Adha), serta Zakat Fitrah untuk Membantu Sesama',
    'Peserta didik dapat membedakan tata cara dua rakaat Shalat Id (dengan takbir zawaid) dari Shalat Jumat serta mengetahui siapa penerima zakat fitrah.',
    'Simulasikan takbir 7× dan 5× Shalat Id beserta adab mendengarkan khutbah khidmat.',
    'Mengenal ibadah hari raya, Jumat, dan solidaritas sosial zakat fitrah di akhir Ramadhan.',
    ['Shalat berjamaah Fase A'],
    ['Membedakan bilangan takbir rakaat 1 & 2 Shalat Id dan tujuan zakat fitrah dengan tepat'],
    '2 (Genap)', 'penerapan', { suggestedGrade: '4', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fb-s2-qadha-tayammum-mi', 'Fikih (MI)', 'SD/MI', 'Fase B', 'Fikih Rukhsah',
    'Praktik Tayamum Pengganti Air dengan Debu Suci dan Mengenal Waktu Shalat Safar (Jamak–Qashar)',
    'Peserta didik dapat mempraktikkan dua tepukan debu suci tayamum untuk wajah dan kedua tangan saat ketiadaan air atau sakit sesuai syaratnya.',
    'Bandingkan syarat dibolehkannya tayamum (tidak ada air atau halangan medis menyentuh air) vs wudhu biasa.',
    'Mempraktikkan rukhsah bersuci tayamum dengan debu bersih saat keadaan darurat.',
    ['Wudhu & tayamum awal'],
    ['Urutan rukun tayamum dipraktikkan tertib mencakup niat, mengusap wajah, lalu kedua tangan'],
    '2 (Genap)', 'penerapan', { prasyaratTopicIds: ['fikih-mi-fb-s1-tanda-baligh-khitan'], relatedTopicIds: ['fikih-mi-fb-s1-tanda-baligh-khitan'], suggestedGrade: '3', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fb-s2-infak-sedekah-mi', 'Fikih (MI)', 'SD/MI', 'Fase B', 'Fikih Filantropi Anak',
    'Perbedaan Sedekah, Infak, Hadiah, dan Kebiasaan Berbagi di Madrasah dengan Ikhlas',
    'Peserta didik dapat membedakan motif saling memberi hadiah untuk mempererat persaudaraan dengan infak/sedekah menolong yang membutuhkan tanpa menyakiti hati penerima.',
    'Ajak menjaga adab memberi: tangan kanan santun, tidak mengungkit pemberian, dan tidak merendahkan teman.',
    'Menumbuhkan keikhlasan bersedekah serta kehalusan budi saat memberi atau menerima bantuan.',
    ['Zakat & akad muamalah anak Sem 1'],
    ['Membedakan contoh hadiah vs sedekah sosial beserta adab ikhlas tanpa pamer'],
    '2 (Genap)', 'integrasi', { prasyaratTopicIds: ['fikih-mi-fb-s1-jual-beli-khiyar-awal'], relatedTopicIds: ['fikih-mi-fb-s1-jual-beli-khiyar-awal'], suggestedGrade: '4', sumberDokumen: KMA_DOC }
  ),
  // Fikih MI Fase C (Kelas 5-6) — berbeda dari Fase B!
  ext(
    'fikih-mi-fc-s1-zakat-mal-fitrah-mi', 'Fikih (MI)', 'SD/MI', 'Fase C', 'Fikih Sosial',
    'Ketentuan Zakat Fitrah, Pengenalan Zakat Harta (Mal), & Delapan Golongan Mustahiq Penerima Zakat',
    'Peserta didik dapat menghitung besaran zakat fitrah per jiwa (2,5 kg / 3,5 liter beras) serta mengelompokkan delapan golongan mustahiq QS. At-Taubah: 60 secara tepat.',
    'Gunakan konteks persiapan panitia zakat madrasah di akhir Ramadhan untuk berlatih menghitung kebutuhan penyaluran adil.',
    'Mengelola perhitungan dasar zakat fitrah dan memahami sasaran mustahiq secara akurat.',
    ['Zakat fitrah & sedekah Fase B'],
    ['Perhitungan total zakat keluarga dan identifikasi 8 golongan mustahiq tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '5', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fc-s1-kurban-haji-mi', 'Fikih (MI)', 'SD/MI', 'Fase C', 'Fikih Ibadah Sosial & Haji',
    'Ketentuan Hewan Kurban–Aqiqah serta Tata Urutan Sederhana Manasik Haji dan Umrah',
    'Peserta didik dapat membedakan syarat umur & kesehatan hewan kurban dengan aqiqah serta mengurutkan rukun haji (ihram, wuquf, thawaf, sa’i, tahallul) secara sistematis.',
    'Gunakan peta miniatur alur manasik haji agar siswa memahami perbedaan thawaf mengelilingi Ka’bah dan sa’i Shafa–Marwah.',
    'Memahami tata laksana ibadah kurban, aqiqah, dan rukun inti manasik haji.',
    ['Ibadah tahunan Id Fase B'],
    ['Perbedaan kurban vs aqiqah dan urutan 5 rukun haji dijelaskan tanpa tertukar'],
    '1 (Ganjil)', 'pengembangan', { suggestedGrade: '5', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fc-s1-halal-haram-minuman-mi', 'Fikih (MI)', 'SD/MI', 'Fase C', 'Fikih Konsumsi',
    'Menilai Makanan & Minuman Halal–Haram (Sertifikat Halal, Zat Memabukkan, Bangkai, & Harta Haram)',
    'Peserta didik dapat memeriksa kejelasan logo halal pada produk kemasan dan menjelaskan bahaya minuman memabukkan serta akibat mengonsumsi barang hasil curian/tanpa izin.',
    'Bedakan haram karena zatnya (babi, khamar) vs haram karena cara mendapatkannya (mencuri/curang).',
    'Membiasakan ketelitian memilih konsumsi halal–baik (halalan thayyiban) dalam kehidupan pelajar.',
    ['Akad jual beli jujur Fase B'],
    ['Audit kemasan jajan membedakan tanda halal sah vs ciri bahan/cara perolehan haram'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '6', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fc-s2-pinjam-barang-luqathah-mi', 'Fikih (MI)', 'SD/MI', 'Fase C', 'Fikih Muamalah Amanah',
    'Ketentuan Pinjam-Meminjam (‘Ariyah), Mengembalikan Barang Temuan (Luqathah), dan Larangan Ghashab',
    'Peserta didik dapat membedakan pinjam-meminjam seizin pemilik (‘ariyah) dari memakai barang teman tanpa izin (ghashab) serta langkah melapor saat menemukan barang tercecer di sekolah.',
    'Simulasikan pos barang temuan kelas untuk melatih kejujuran mengembalikan pensil/uang yang ditemukan.',
    'Menegakkan adab menjaga amanah barang milik orang lain dan prosedur luqathah di madrasah.',
    ['Jual beli & amanah Fase B'],
    ['Membedakan ‘ariyah vs ghashab dan menyusun alur pengumuman barang temuan yang aman'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '6', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fc-s2-kifayat-sholat-gerhana-safar', 'Fikih (MI)', 'SD/MI', 'Fase C', 'Fikih Ibadah Khusus',
    'Mengenal Shalat Safar (Jamak & Qashar Lengkap untuk Pelajar) serta Shalat Gerhana & Istisqa',
    'Peserta didik dapat merancang contoh penggabungan shalat Zuhur–Ashar atau Maghrib–Isya secara jamak takdim/takhir pada skenario karyawisata madrasah.',
    'Pastikan pemahaman bahwa shalat Subuh tidak dijamak maupun diqashar dan syarat jarak safar terpenuhi.',
    'Mengaplikasikan rukhsah jamak–qashar secara mandiri saat mengikuti perjalanan jauh sekolah/keluarga.',
    ['Rukhsah shalat duduk Fase B'],
    ['Pasangan shalat yang dapat dijamak/qashar ditentukan benar tanpa menyertakan Subuh/Ashar-Maghrib'],
    '2 (Genap)', 'integrasi', { suggestedGrade: '6', sumberDokumen: KMA_DOC }
  ),
  ext(
    'fikih-mi-fc-s2-integrasi-fikih-remaja-awal', 'Fikih (MI)', 'SD/MI', 'Fase C', 'Integrasi Fikih Lulusan MI',
    'Simulasi Praktik Terpadu Ibadah Wajib–Sosial & Akhlak Muamalah sebagai Mukallaf Awal',
    'Peserta didik dapat meninjau kesiapan praktik mandiri bersuci (wudhu–mandi wajib), shalat tertib, zakat/infak, dan kejujuran transaksi sebagai bekal menuju jenjang MTs/SMP.',
    'Gunakan studi kasus skenario perjalanan/kegiatan sehari penuh untuk menguji penerapan fikih secara terpadu.',
    'Mengintegrasikan fikih ibadah dan muamalah dalam kehidupan sehari-hari siswa tingkat akhir MI.',
    ['Seluruh fikih Fase C Sem 1–2'],
    ['Solusi studi kasus harian menerapkan ketentuan thaharah, rukhsah shalat, dan muamalah jujur tepat'],
    '2 (Genap)', 'pendalaman', { prasyaratTopicIds: ['fikih-mi-fc-s1-zakat-mal-fitrah-mi', 'fikih-mi-fc-s2-pinjam-barang-luqathah-mi'], relatedTopicIds: ['fikih-mi-fc-s1-zakat-mal-fitrah-mi'], suggestedGrade: '6', sumberDokumen: KMA_DOC }
  ),

  // Tambahan MA Fase F & Arab Kejuruan Fase F & PJOK Fase F Sem 1 agar lengkap >= 3 per semester
  ext(
    'qhadis-ma-ff-s1-kaidah-tafsir-kontekstual', 'Al-Qur\'an Hadis (MA)', 'SMA/MA', 'Fase F', 'Kaidah Penafsiran Al-Qur’an',
    'Kaidah ’Amm–Khash, Muthlaq–Muqayyad, & Kehati-hatian Menarik Pesan Sosial Ayat secara Kontekstual',
    'Peserta didik dapat membedakan ayat bermakna umum dari ayat yang dibatasi konteks sebab/syarat agar terhindar dari penafsiran ekstrem terpotong.',
    'Latih membaca ayat sebelum–sesudah (munasabah) beserta pengkhususan hadis mutawatir/shahih.',
    'Menerapkan prinsip kehati-hatian metodologis dalam memahami lafaz umum dan khusus dalam Al-Qur’an.',
    ['Makkiyah–Madaniyah & takhrij hadis'],
    ['Membedakan contoh ayat am-khash secara tepat dan menautkan ayat pembatas konteksnya'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'akidah-ma-ff-s1-aliran-kontemporer-moderat', 'Akidah Akhlak (MA)', 'SMA/MA', 'Fase F', 'Pemikiran Akidah Kontemporer',
    'Menyikapi Paham Keagamaan Ekstrem vs Liberal dan Meneguhkan Akidah Wasathiyah Berbasis Dalil',
    'Peserta didik dapat menganalisis ciri pola pikir literalis kaku vs pengabaian kaidah serta memposisikan prinsip akidah Ahlussunnah yang moderat, adil, dan dialogis.',
    'Tekankan kerangka keseimbangan dalil naqli (wahyu) dengan nalar aqli sehat dalam menjawab isu modern.',
    'Membangun kedewasaan akidah kritis yang tidak mudah terombang-ambing propaganda ekstremisme.',
    ['Ilmu kalam & ukhuwah Fase E–F'],
    ['Analisis kasus menyajikan argumentasi moderat berbasis dalil dan penghormatan kemanusiaan'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'ski-ma-ff-s1-jaringan-ulama-haramain', 'Sejarah Kebudayaan Islam / SKI (MA)', 'SMA/MA', 'Fase F', 'Jaringan Keilmuan Nusantara–Global',
    'Jaringan Ulama Nusantara–Haramain (Abad XVII–XIX) dan Pengaruh Kitab Kuning bagi Moderasi Budaya',
    'Peserta didik dapat menelusuri jejak intelektual Abdurrauf as-Singkili, Yusuf al-Makassari, hingga Syeikh Nawawi al-Bantani yang menghubungkan dunia Arab dan Nusantara.',
    'Tunjukkan bagaimana literasi keilmuan internasional justru memperkuat cinta tanah air dan bahasa lokal.',
    'Menghargai kontribusi ulama Nusantara sebagai bagian penting sejarah pemikiran Islam dunia.',
    ['Transmisi ilmu & sejarah Nusantara'],
    ['Memetakan karya dan peran jaringan ulama Nusantara–Haramain secara akurat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-ma-ff-s1-majaz-bayan-sastra-arab', 'Bahasa Arab (MA)', 'SMA/MA', 'Fase F', 'Balaghah Dasar & Wacana',
    'Pengenalan Gaya Bahasa Arab (Tasybih & Kiasan Sederhana) dan Analisis Teks Opini Pendidikan Modern',
    'Peserta didik dapat mengenali perbandingan ungkapan lugas (haqiqi) vs kiasan indah (majazi/tasybih) dalam teks sastra serta esai pendidikan berbahasa Arab.',
    'Analisis unsur tasybih sederhana (musyabbah, adat tasybih, musyabbah bih) dalam teks pendek.',
    'Memahami keindahan ungkapan retoris bahasa Arab serta membaca teks wacana opini.',
    ['Idhafah, na’at, & kana/inna'],
    ['Identifikasi 4 unsur tasybih dasar dan ringkasan isi teks pendidikan tepat'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-smk-ff-s1-presentasi-produk-layanan', 'Bahasa Arab Kejuruan', 'SMK', 'Fase F', 'Kalam & Promosi Layanan',
    'Menjelaskan Keunggulan Produk / Paket Wisata / Layanan Jasa Kejuruan dengan Sifat Komparatif',
    'Peserta didik dapat mendeskripsikan keunggulan layanan jasa/produk keahliannya menggunakan ungkapan sifat komparatif (أفضل / أسرع / أجود) di depan tamu/klien.',
    'Padukan kosakata alat/layanan SMK dengan penyajian brosur dwibahasa sederhana.',
    'Mempromosikan layanan profesional berbahasa Arab dengan sopan dan informatif.',
    ['Transaksi harga & layanan tamu'],
    ['Presentasi 4–5 kalimat mengenalkan layanan memakai bentuk komparatif tepat'],
    '1 (Ganjil)', 'penerapan', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'arab-smk-ff-s1-reservasi-keluhan-fasilitas', 'Bahasa Arab Kejuruan', 'SMK', 'Fase F', 'Istima’ & Kalam Profesi',
    'Dialog Konfirmasi Pemesanan (Al-Hajz), Jadwal Keberangkatan/Servis, dan Fasilitas Keahlian',
    'Peserta didik dapat mempraktikkan dialog konfirmasi jadwal reservasi layanan, memeriksa rincian kebutuhan tamu, dan mencatat permintaan khusus dalam bahasa Arab sederhana.',
    'Gunakan skenario reservasi kamar/tiket/perawatan unit kerja yang meminta kepastian tanggal, jam, dan jumlah.',
    'Mengelola transaksi pemesanan layanan terstruktur bebas miskomunikasi waktu dan kebutuhan.',
    ['Bilangan harga & layanan tamu'],
    ['Dialog reservasi mengonfirmasi nama, tanggal, jam, dan layanan dengan tepat'],
    '1 (Ganjil)', 'integrasi', { suggestedGrade: '11', sumberDokumen: KMA_DOC }
  ),
  ext(
    'pjok-sma-ff-s1-manajemen-cedera-p3k-tanding', 'PJOK', 'SMA/MA', 'Fase F', 'Keselamatan Olahraga & Taktik',
    'Analisis Taktik Pertandingan Beregu serta Penanganan Awal Cedera Otot–Kram & Heat Exhaustion',
    'Peserta didik dapat merancang strategi transisi menyerang–bertahan dalam permainan invasi serta menjelaskan protokol pertolongan pertama kelelahan panas dan kram di lapangan.',
    'Hubungkan evaluasi kebugaran Fase E dengan pemulihan cairan elektrolit dan evaluasi taktik ruang tim.',
    'Menggabungkan kecerdasan taktis permainan beregu dengan kesiapsiagaan keselamatan olahraga.',
    ['Taktik & program FITT Fase E'],
    ['Skema formasi transisi jelas dan langkah P3K kram/heat exhaustion sesuai kaidah aman'],
    '1 (Ganjil)', 'pendalaman', { suggestedGrade: '11' }
  ),
];
