import type { GenerationRequest } from '../../types/assessment';
import type { QuestionBank } from './types';

// ============================================================================
// 8. BANK SOAL PENDIDIKAN PANCASILA & KEWARGANEGARAAN (SD vs SMP vs SMA/SMK)
// ============================================================================
export function buildPancasilaQuestionBank(
  req: GenerationRequest,
  isSD: boolean,
  _isSMA: boolean
): QuestionBank {
  const topik = req.materiPokok;

  // A. KHUSUS JENJANG SD (Kelas 1-6): Cerita Ramah Anak, Simbol Sila, Hak-Kewajiban, Toleransi
  if (isSD) {
    return {
      capaianPembelajaran: `Peserta didik mampu memahami simbol dan sila Pancasila, menerapkan nilai gotong royong dan musyawarah, serta membedakan hak dan kewajiban di rumah dan sekolah pada materi ${topik}.`,
      tujuanPembelajaranDefault:
        req.tujuanPembelajaranInput ||
        `Peserta didik dapat mengidentifikasi pengamalan sila Pancasila, membedakan hak dan kewajiban, serta menunjukkan sikap toleransi dalam keberagaman di lingkungan sekolah.`,
      pgPool: [
        {
          stimulus: `Sebelum memulai kegiatan belajar di dalam kelas, seluruh siswa Kelas ${req.kelas} berdoa bersama dipimpin oleh ketua kelas dengan tenang dan khusyuk sesuai agama masing-masing.`,
          pertanyaan: `Kegiatan berdoa bersama sebelum belajar merupakan wujud pengamalan Pancasila, khususnya sila yang dilambangkan dengan ....`,
          opsi5: [
            'Bintang Emas (Sila Pertama)',
            'Rantai Baja (Sila Kedua)',
            'Pohon Beringin (Sila Ketiga)',
            'Kepala Banteng (Sila Keempat)',
            'Padi dan Kapas (Sila Kelima)',
          ],
          kunci: 'A',
          pembahasan:
            'Berdoa dan bersyukur kepada Tuhan Yang Maha Esa sebelum dan sesudah beraktivitas merupakan wujud pengamalan Sila Pertama Pancasila yang dilambangkan dengan Bintang Emas (Pilihan A).',
          levelKognitif: 'C2 (Mengenal Simbol & Pengamalan Sila)',
          indikatorSoal: 'Disajikan narasi berdoa di kelas, peserta didik dapat menentukan lambang sila Pancasila yang sesuai.',
        },
        {
          stimulus: `Saat jam istirahat sekolah, Doni melihat temannya terpeleset di lapangan hingga lututnya terluka. Doni segera menghampiri, menolong temannya berdiri, dan mengantarkannya ke ruang UKS untuk diobati.`,
          pertanyaan: `Sikap peduli dan suka menolong teman yang dilakukan Doni merupakan perwujudan pengamalan Pancasila, yaitu sila ....`,
          opsi5: [
            'Pertama — Ketuhanan Yang Maha Esa',
            'Kedua — Kemanusiaan yang Adil dan Beradab',
            'Ketiga — Persatuan Indonesia',
            'Keempat — Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan',
            'Kelima — Keadilan Sosial bagi Seluruh Rakyat Indonesia',
          ],
          kunci: 'B',
          pembahasan:
            'Sikap menyayangi sesama manusia, tolong-menolong tanpa pamrih, dan peduli kepada teman yang tertimpa musibah merupakan pengamalan Sila Kedua Pancasila (Pilihan B).',
          levelKognitif: 'C3 (Menerapkan Nilai Kemanusiaan)',
          indikatorSoal: 'Disajikan cerita menolong kawan, peserta didik dapat mengaitkannya dengan sila kedua Pancasila.',
        },
        {
          stimulus: `Di kelas Siti, para siswa berasal dari suku bangsa dan agama yang berbeda-beda. Ada yang berasal dari Jawa, Sunda, Minang, Batak, dan Bali. Meskipun berbeda daerah asal dan logat bicara, mereka selalu rukun dan belajar kelompok bersama dengan gembira.`,
          pertanyaan: `Sikap hidup rukun dan saling menghargai keberagaman di lingkungan sekolah mencerminkan semboyan bangsa Indonesia, yaitu ....`,
          opsi5: [
            'Tut Wuri Handayani',
            'Bhinneka Tunggal Ika',
            'Bersatu Kita Teguh',
            'Ing Ngarso Sung Tulodho',
            'Rajin Pangkal Pandai',
          ],
          kunci: 'B',
          pembahasan:
            'Semboyan "Bhinneka Tunggal Ika" memiliki makna berbeda-beda tetapi tetap satu jua, yang mengajarkan kita untuk hidup rukun dan toleran di tengah keberagaman suku bangsa (Pilihan B).',
          levelKognitif: 'C2 (Mengidentifikasi Semboyan Keberagaman)',
          indikatorSoal: 'Disajikan narasi keberagaman suku di kelas, peserta didik dapat menentukan semboyan nasional yang tepat.',
        },
        {
          stimulus: `Untuk menentukan pembagian regu piket kebersihan kelas yang adil, ketua kelas memimpin musyawarah bersama seluruh teman sekelas. Setiap anggota kelas diberi kesempatan berbicara secara tertib hingga tercapai mufakat.`,
          pertanyaan: `Sikap terbaik yang wajib kita tunjukkan terhadap keputusan bersama yang telah disepakati dalam musyawarah kelas adalah ....`,
          opsi5: [
            'Mengabaikan keputusan jika usul pribadi kita tidak terpilih',
            'Melaksanakan keputusan bersama dengan rasa tanggung jawab dan ikhlas',
            'Menyalahkan ketua kelas ketika piket terasa melelahkan',
            'Meminta teman lain mengerjakan seluruh bagian tugas kita',
            'Menolak hadir saat jadwal regu piket kita bertugas',
          ],
          kunci: 'B',
          pembahasan:
            'Keputusan musyawarah untuk mufakat (Sila ke-4 Pancasila) wajib ditaati dan dilaksanakan oleh seluruh warga kelas dengan penuh keikhlasan dan tanggung jawab (Pilihan B).',
          levelKognitif: 'C3 (Menunjukkan Sikap Tanggung Jawab Musyawarah)',
          indikatorSoal: 'Disajikan situasi musyawarah piket, peserta didik dapat menentukan sikap yang tepat terhadap hasil keputusan bersama.',
        },
        {
          stimulus: `Perhatikan pernyataan mengenai kegiatan siswa berikut:
(1) Merapikan kembali tempat tidur dan mainan setelah digunakan.
(2) Memperoleh bimbingan dan penjelasan pelajaran dari guru di kelas.
(3) Mematuhi tata tertib sekolah dan mendengarkan nasihat guru.
(4) Menikmati suasana ruang kelas yang bersih, sejuk, dan aman.`,
          pertanyaan: `Pernyataan yang merupakan contoh KEWAJIBAN seorang siswa di lingkungan sekolah dan rumah ditunjukkan oleh nomor ....`,
          opsi5: [
            '(1) dan (2)',
            '(1) dan (3)',
            '(2) dan (3)',
            '(2) dan (4)',
            '(3) dan (4)',
          ],
          kunci: 'B',
          pembahasan:
            'Merapikan mainan (1) adalah kewajiban di rumah, dan mematuhi tata tertib (3) adalah kewajiban di sekolah. Sedangkan (2) dan (4) adalah hak yang diterima siswa (Pilihan B).',
          levelKognitif: 'C3 (Membedakan Hak dan Kewajiban Siswa)',
          indikatorSoal: 'Disajikan beberapa kegiatan, peserta didik dapat mengklasifikasikan contoh kewajiban anak.',
        },
        {
          stimulus: `Lani dan Dayu sedang bermain lompat tali di halaman sekolah. Tanpa sengaja, kaki Lani tersangkut tali sehingga Dayu ikut terjatuh. Lani segera meminta maaf kepada Dayu karena tidak berhati-hati.`,
          pertanyaan: `Tindakan yang sebaiknya dilakukan oleh Dayu agar kerukunan pertemanan tetap terjaga adalah ....`,
          opsi5: [
            'Membalas mendorong Lani agar merasa adil',
            'Memaafkan Lani dengan tulus dan melanjutkan bermain bersama dengan hati-hati',
            'Mengajak teman-teman lain untuk menjauhi Lani',
            'Menangis keras agar guru memarahi Lani',
            'Merusak tali mainan agar tidak bisa digunakan lagi',
          ],
          kunci: 'B',
          pembahasan:
            'Menjaga persatuan dan kerukunan (Sila ke-3) diwujudkan dengan berani meminta maaf saat melakukan kesalahan dan berjiwa besar memaafkan kawan yang tidak sengaja berbuat salah (Pilihan B).',
          levelKognitif: 'C3 (Menyelesaikan Masalah Pertemanan)',
          indikatorSoal: 'Disajikan kasus insiden bermain, peserta didik dapat menentukan sikap pemaaf dan penjaga kerukunan.',
        },
      ],
      pgkPool: [
        {
          stimulus: `Tabel Pengamalan Sila-Sila Pancasila di Lingkungan Sekolah:
Pancasila memandu perilaku siswa agar senantiasa berakhlak mulia, adil, dan rukun dalam pergaulan sehari-hari.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan pengamalan sila Pancasila berikut!',
          pernyataan: [
            { teks: 'Menghargai dan tidak mengganggu teman yang sedang menjalankan ibadah agamanya merupakan wujud pengamalan Sila Pertama.', isBenar: true },
            { teks: 'Membagi tugas piket kebersihan kelas secara adil tanpa membeda-bedakan kawan mencerminkan Sila Kelima Pancasila.', isBenar: true },
            { teks: 'Saat berdiskusi kelompok, kita boleh memaksakan pendapat pribadi agar selalu dituruti oleh teman lain.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena dalam musyawarah (Sila ke-4) kita tidak boleh memaksakan kehendak pribadi kepada orang lain.',
          levelKognitif: 'C4 (Mengevaluasi Pengamalan Sila Pancasila)',
          indikatorSoal: 'Peserta didik dapat memvalidasi pernyataan pengamalan sila-sila Pancasila di sekolah.',
        },
        {
          stimulus: `Hak dan Kewajiban Siswa sebagai Pelajar di Sekolah:
Keseimbangan antara melaksanakan kewajiban dan menuntut hak menciptakan suasana belajar yang tertib dan nyaman.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan hak dan kewajiban di bawah ini!',
          pernyataan: [
            { teks: 'Setiap siswa berhak mendapatkan suasana kelas yang aman, bersih, dan penjelasan materi dari guru.', isBenar: true },
            { teks: 'Menjaga kebersihan meja dan merawat buku perpustakaan adalah kewajiban seluruh warga sekolah.', isBenar: true },
            { teks: 'Siswa hanya wajib mematuhi tata tertib sekolah apabila sedang diawasi oleh guru piket.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena tata tertib sekolah wajib ditaati setiap saat dengan kesadaran diri sendiri.',
          levelKognitif: 'C4 (Memvalidasi Hak & Kewajiban Pelajar)',
          indikatorSoal: 'Peserta didik dapat mengevaluasi penerapan hak dan kewajiban di sekolah.',
        },
        {
          stimulus: `Keberagaman Suku, Agama, dan Budaya (Bhinneka Tunggal Ika):
Negara Indonesia memiliki ribuan pulau dengan adat istiadat, tarian daerah, pakaian adat, dan agama yang beragam.`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan keberagaman berikut!',
          pernyataan: [
            { teks: 'Keberagaman budaya dan suku bangsa di Indonesia merupakan anugerah dan kekayaan bangsa yang harus disyukuri.', isBenar: true },
            { teks: 'Sikap toleransi dan saling menghargai membuat pergaulan di sekolah menjadi damai dan bersatu.', isBenar: true },
            { teks: 'Kita sebaiknya hanya mau bekerja kelompok dengan teman yang berasal dari suku daerah yang sama.', isBenar: false },
          ],
          pembahasan:
            'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena semangat persatuan (Sila ke-3) menuntut kita bekerja sama dengan siapa saja tanpa membedakan suku bangsa.',
          levelKognitif: 'C4 (Menelaah Sikap Terhadap Keberagaman)',
          indikatorSoal: 'Peserta didik dapat mengevaluasi sikap toleransi terhadap kemajemukan bangsa.',
        },
      ],
      uraianPool: [
        {
          stimulus: `Pancasila sebagai Dasar Negara Kesatuan Republik Indonesia:
Pancasila terdiri dari 5 sila yang masing-masing memiliki simbol lambang pada perisai burung Garuda.`,
          pertanyaan: `Tuliskan secara berurutan kelima sila dalam Pancasila beserta simbol lambangnya masing-masing!`,
          pedomanPenskoran: `Skor 20: Menuliskan 5 sila beserta lambangnya secara lengkap dan berurutan (4 poin per pasangan sila dan lambang).`,
          contohJawaban: `1. Sila Pertama: Ketuhanan Yang Maha Esa (Lambang: Bintang Emas)
2. Sila Kedua: Kemanusiaan yang Adil dan Beradab (Lambang: Rantai Baja)
3. Sila Ketiga: Persatuan Indonesia (Lambang: Pohon Beringin)
4. Sila Keempat: Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan (Lambang: Kepala Banteng)
5. Sila Kelima: Keadilan Sosial bagi Seluruh Rakyat Indonesia (Lambang: Padi dan Kapas)`,
          levelKognitif: 'C2 (Menyebutkan Sila & Lambang Pancasila)',
          indikatorSoal: 'Peserta didik dapat menuliskan kelima sila Pancasila dan simbol lambangnya secara berurutan.',
        },
        {
          stimulus: `Penerapan Hak dan Kewajiban di Lingkungan Sekolah:
Sebagai seorang pelajar yang baik, kita harus memahami perbedaan antara apa yang wajib kita kerjakan dan apa yang berhak kita dapatkan.`,
          pertanyaan: `a) Jelaskan perbedaan antara HAK dan KEWAJIBAN!
b) Berikan masing-masing 2 contoh hak dan 2 contoh kewajiban seorang siswa saat berada di sekolah!`,
          pedomanPenskoran: `Skor 20: Menjelaskan perbedaan hak dan kewajiban secara tepat (8 poin), memberikan 2 contoh hak sekolah (6 poin), dan 2 contoh kewajiban sekolah (6 poin).`,
          contohJawaban: `a) Perbedaan:
• Kewajiban adalah sesuatu tugas atau tindakan yang wajib kita laksanakan dengan penuh rasa tanggung jawab.
• Hak adalah sesuatu yang berhak kita terima atau nikmati setelah kita melaksanakan kewajiban.

b) Contoh di sekolah:
• Dua Kewajiban Siswa: 1) Mendengarkan dan mematuhi penjelasan guru; 2) Menjaga kebersihan kelas dan fasilitas sekolah.
• Dua Hak Siswa: 1) Mendapatkan bimbingan pelajaran dari guru; 2) Belajar di ruangan kelas yang aman, bersih, dan nyaman.`,
          levelKognitif: 'C4 (Menganalisis Hak dan Kewajiban Siswa)',
          indikatorSoal: 'Peserta didik dapat membedakan konsep hak dan kewajiban serta memberikan contoh konkret di sekolah.',
        },
        {
          stimulus: `Musyawarah untuk Mufakat di Lingkungan Kelas:
Di dalam kelas sering terjadi perbedaan pilihan, misalnya saat memilih ketua kelas atau menentukan tempat tujuan karya wisata.`,
          pertanyaan: `Mengapa musyawarah sangat penting dilakukan ketika terjadi perbedaan pendapat dalam mengambil keputusan bersama? Jelaskan 2 manfaat positif dari bermusyawarah!`,
          pedomanPenskoran: `Skor 20: Menjelaskan alasan pentingnya musyawarah (10 poin) dan menguraikan 2 manfaat positifnya secara runtut (10 poin).`,
          contohJawaban: `Alasan musyawarah penting: Karena musyawarah memberikan kesempatan yang adil bagi setiap orang untuk menyampaikan pendapatnya, sehingga keputusan yang diambil disetujui bersama tanpa ada yang merasa dipaksakan.

Dua manfaat musyawarah:
1. Mencegah timbulnya pertengkaran atau rasa iri karena keputusan diambil secara adil dan terbuka.
2. Mempererat persaudaraan dan rasa tanggung jawab bersama dalam menyukseskan keputusan yang telah disepakati.`,
          levelKognitif: 'C4 (Menganalisis Manfaat Musyawarah Mufakat)',
          indikatorSoal: 'Peserta didik dapat menjelaskan pentingnya musyawarah dan manfaatnya bagi kerukunan kelas.',
        },
      ],
    };
  }

  // B. JENJANG SMP & SMA/SMK (Konseptual, Konstitusi UUD 1945, Norma & Demokrasi)
  return {
    capaianPembelajaran: `Peserta didik mampu menganalisis kedudukan Pancasila sebagai ideologi terbuka, mengkaji 4 macam norma sosial, supremasi hukum UUD NRI 1945, serta harmonisasi hak dan kewajiban warga negara pada topik ${topik}.`,
    tujuanPembelajaranDefault:
      req.tujuanPembelajaranInput ||
      `Peserta didik mampu menganalisis hierarki nilai Pancasila, membedakan klasifikasi norma sosial, dan mengevaluasi kasus penegakan hak serta kewajiban warga negara.`,
    pgPool: [
      {
        stimulus: `Dalam tata urutan perundang-undangan di Indonesia (UU No. 12 Tahun 2011), seluruh produk hukum tidak boleh bertentangan dengan Pancasila. Pancasila berkedudukan sebagai norma fundamental negara (staatsfundamentalnorm) yang menjiwai seluruh batang tubuh UUD NRI Tahun 1945.`,
        pertanyaan: `Kedudukan Pancasila sebagaimana diuraikan dalam wacana di atas menunjukkan fungsi Pancasila sebagai ....`,
        opsi5: [
          'Sumber dari Segala Sumber Hukum Negara',
          'Alat propaganda politik kekuasaan',
          'Pedoman formalitas administrasi pemerintahan semata',
          'Perjanjian luhur yang hanya berlaku pada masa kemerdekaan',
          'Ideologi tertutup yang kaku terhadap kemajuan teknologi',
        ],
        kunci: 'A',
        pembahasan:
          'Pancasila sebagai staatsfundamentalnorm berkedudukan sebagai Sumber dari Segala Sumber Hukum Negara, yang berarti seluruh peraturan perundang-undangan harus bersumber dan selaras dengan nilai-nilai Pancasila (Pilihan A).',
        levelKognitif: 'C4 (Menganalisis Kedudukan Pancasila sebagai Sumber Hukum)',
        indikatorSoal: 'Disajikan prinsip hierarki peraturan, peserta didik dapat menentukan kedudukan Pancasila sebagai sumber segala hukum.',
      },
      {
        stimulus: `Perhatikan kasus hukum berikut: Seorang pengendara sepeda motor tertangkap kamera tilang elektronik (ETLE) menerobos lampu merah di persimpangan jalan raya. Petugas kepolisian mengenakan sanksi tilang dan denda administratif sesuai Undang-Undang Lalu Lintas dan Angkutan Jalan.`,
        pertanyaan: `Dilihat dari klasifikasi macam-macam norma sosial, sanksi yang dijatuhkan kepada pengendara tersebut merupakan karakteristik khas dari ....`,
        opsi5: [
          'Norma Agama yang bersumber dari wahyu ketuhanan',
          'Norma Kesusilaan yang bersumber dari bisikan hati nurani',
          'Norma Kesopanan yang bersanksi celaan masyarakat',
          'Norma Hukum yang bersifat tegas, memaksa, dan bersanksi nyata dari alat negara',
          'Norma Kebiasaan yang tidak mengikat secara yuridis',
        ],
        kunci: 'D',
        pembahasan:
          'Norma Hukum memiliki ciri khas dibuat oleh lembaga resmi negara, bersifat tegas, memaksa, dan memiliki sanksi nyata yang ditegakkan oleh aparat penegak hukum (Pilihan D).',
        levelKognitif: 'C4 (Mengklasifikasikan Sifat & Sanksi Norma)',
        indikatorSoal: 'Disajikan kasus pelanggaran lalu lintas, peserta didik dapat mengidentifikasi karakteristik norma hukum.',
      },
      {
        stimulus: `Pasal 27 ayat (1) UUD NRI Tahun 1945 menegaskan: "Segala warga negara bersamaan kedudukannya di dalam hukum dan pemerintahan dan wajib menjunjung hukum dan pemerintahan itu dengan tidak ada kecualinya."`,
        pertanyaan: `Prinsip konstitusional yang ditegaskan dalam pasal tersebut menjamin terwujudnya asas ....`,
        opsi5: [
          'Privilese hukum bagi kelompok tertentu',
          'Persamaan di hadapan hukum (Equality before the law)',
          'Kekuasaan absolut kepala pemerintahan',
          'Keringanan hukuman berdasarkan status ekonomi',
          'Pemisahan hak asasi dari kewajiban warga negara',
        ],
        kunci: 'B',
        pembahasan:
          'Pasal 27 ayat (1) menegaskan asas Equality before the law (persamaan kedudukan di depan hukum), di mana setiap warga negara diperlakukan sama tanpa diskriminasi status sosial, jabatan, atau kekayaan (Pilihan B).',
        levelKognitif: 'C4 (Menganalisis Asas Kesetaraan di Depan Hukum)',
        indikatorSoal: 'Disajikan kutipan Pasal 27 ayat (1), peserta didik dapat menentukan asas konstitusional yang dimaksud.',
      },
      {
        stimulus: `Menjelang pemilihan ketua OSIS / perwakilan siswa, beredar kampanye hitam dan berita bohong (hoaks) di media sosial yang menyerang latar belakang suku dan keyakinan salah satu calon kandidat.`,
        pertanyaan: `Tindakan paling kritis dan solutif bagi seorang pelajar berjiwa Pancasila dalam merespons fenomena tersebut adalah ....`,
        opsi5: [
          'Ikut menyebarkan berita tersebut agar memicu perdebatan ramai',
          'Memverifikasi kebenaran informasi kepada pihak sekolah/panitia, tidak meneruskannya, dan mengedepankan kampanye berbasis gagasan program kerja',
          'Membalas dengan membuat fitnah tandingan terhadap kandidat lawan',
          'Bersikap apatis dan memutuskan untuk golput (tidak menggunakan hak suara)',
          'Memprovokasi teman sekelas untuk melakukan unjuk rasa anarkis',
        ],
        kunci: 'B',
        pembahasan:
          'Pelajar berkarakter Pancasila menyikapi informasi secara tabayyun (verifikasi kritis), menolak diskriminasi SARA, serta menjunjung tinggi demokrasi berbasis adu gagasan dan integritas (Pilihan B).',
        levelKognitif: 'C5 (Mengevaluasi Sikap Kritis dalam Demokrasi Sekolah)',
        indikatorSoal: 'Disajikan kasus hoaks pemilu sekolah, peserta didik dapat menentukan sikap kritis berlandaskan Pancasila.',
      },
      {
        stimulus: `Pancasila berkedudukan sebagai ideologi terbuka yang mampu menyesuaikan diri dengan perkembangan zaman dan dinamika ilmu pengetahuan dan teknologi (IPTEK), tanpa kehilangan jati diri dan nilai-nilai dasarnya.`,
        pertanyaan: `Faktor yang membedakan Pancasila sebagai ideologi terbuka dengan ideologi tertutup (dogmatis) adalah ....`,
        opsi5: [
          'Pancasila memaksakan nilai dari luar secara mutlak kepada rakyat',
          'Nilai-nilai dasar Pancasila digali dari kekayaan moral, budaya, dan konsensus luhur bangsa Indonesia sendiri, bukan dipaksakan dari luar',
          'Pancasila melarang adanya dialog dan musyawarah dalam pembangunan',
          'Pancasila menuntut ketaatan buta tanpa ruang partisipasi publik',
          'Pancasila menghapus seluruh nilai kearifan lokal di daerah',
        ],
        kunci: 'B',
        pembahasan:
          'Ideologi terbuka memiliki ciri nilainya bersumber dari konsensus dan kekayaan budaya masyarakat itu sendiri, bersifat fleksibel dalam penjabaran operasional, serta menjunjung tinggi hak asasi dan musyawarah (Pilihan B).',
        levelKognitif: 'C4 (Membedakan Ideologi Terbuka dan Tertutup)',
        indikatorSoal: 'Disajikan konsep ideologi terbuka, peserta didik dapat mengidentifikasi karakteristik khas nilai dasar Pancasila.',
      },
      {
        stimulus: `Dalam sidang BPUPKI tanggal 1 Juni 1945, Ir. Soekarno menyampaikan pidato bersejarah mengenai dasar negara Indonesia merdeka yang dinamakan Pancasila. Beliau menegaskan bahwa dasar negara harus mampu menjadi "Philosofische Grondslag" dan "Weltanschauung".`,
        pertanyaan: `Makna dari istilah "Philosofische Grondslag" dalam konteks dasar negara Republik Indonesia adalah ....`,
        opsi5: [
          'Panduan teknis penganggaran pendapatan belanja daerah',
          'Fondasi filsafat, norma mendasar, dan jiwa yang menopang berdirinya bangunan negara merdeka',
          'Strategi militer pertahanan kawasan perbatasan laut',
          'Struktur birokrasi kementerian kabinet pemerintahan',
          'Format penulisan naskah diplomasi internasional',
        ],
        kunci: 'B',
        pembahasan:
          'Philosofische Grondslag berarti fondasi atau landasan filosofis mendalam yang menjadi jiwa, falsafah hidup, dan norma fundamental tempat berdirinya negara Indonesia merdeka (Pilihan B).',
        levelKognitif: 'C3 (Memahami Konsep Dasar Historis Pancasila)',
        indikatorSoal: 'Disajikan istilah historis pidato 1 Juni 1945, peserta didik dapat menjelaskan makna Philosofische Grondslag.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Hierarki Nilai Pancasila (Nilai Dasar, Instrumental, dan Praksis):
Ketiga tingkatan nilai ini saling terintegrasi dalam menjamin relevansi Pancasila di setiap era pemerintahan.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan mengenai hierarki nilai Pancasila berikut!',
        pernyataan: [
          { teks: 'Nilai Dasar Pancasila bersifat tetap dan abstrak, tidak berubah seiring pergantian rezim pemerintahan.', isBenar: true },
          { teks: 'Nilai Instrumental merupakan penjabaran kontekstual berupa pasal-pasal UUD NRI 1945 dan peraturan undang-undang.', isBenar: true },
          { teks: 'Nilai Praksis boleh bertentangan dengan Nilai Dasar asalkan disukai oleh mayoritas masyarakat saat itu.', isBenar: false },
        ],
        pembahasan:
          'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena Nilai Praksis harus senantiasa konsisten dan bersumber dari Nilai Dasar dan Nilai Instrumental.',
        levelKognitif: 'C4 (Evaluasi Hierarki Nilai AKM)',
        indikatorSoal: 'Peserta didik dapat memvalidasi hubungan nilai dasar, instrumental, dan praksis.',
      },
      {
        stimulus: `Harmonisasi Hak Asasi dan Kewajiban Asasi Warga Negara (UUD NRI 1945):
Pasal 28J ayat (2) mengatur bahwa pemenuhan hak asasi seseorang dibatasi oleh hak asasi orang lain demi ketertiban umum.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan hak konstitusional berikut!',
        pernyataan: [
          { teks: 'Kebebasan berekspresi di ruang digital bersifat mutlak tanpa perlu mematuhi etika dan norma hukum.', isBenar: false },
          { teks: 'Setiap warga negara berhak atas pekerjaan dan penghidupan yang layak bagi kemanusiaan (Pasal 27 ayat 2).', isBenar: true },
          { teks: 'Ikut serta dalam upaya pembelaan negara adalah hak sekaligus kewajiban konstitusional setiap warga negara (Pasal 27 ayat 3).', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 2 dan 3 BENAR sesuai UUD NRI 1945. Pernyataan 1 SALAH karena kebebasan berekspresi dibatasi oleh norma moral, ketertiban umum, dan perlindungan kehormatan orang lain.',
        levelKognitif: 'C4 (Evaluasi Hak dan Kewajiban Konstitusional)',
        indikatorSoal: 'Peserta didik dapat mengevaluasi batasan dan substansi pasal-pasal HAM dalam UUD 1945.',
      },
      {
        stimulus: `Empat Macam Norma Sosial dalam Masyarakat:
Norma mengatur relasi antar-individu agar tercipta ketertiban sosial, kepastian hukum, dan rasa keadilan.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan kaidah norma di bawah ini!',
        pernyataan: [
          { teks: 'Sanksi pelanggaran norma kesusilaan bersumber dari dalam diri sendiri berupa penyesalan dan rasa bersalah mendalam.', isBenar: true },
          { teks: 'Norma hukum adalah satu-satunya norma yang memiliki aparat penegak resmi dan sanksi memaksa.', isBenar: true },
          { teks: 'Norma kesopanan memiliki standar dan sanksi yang sama persis di seluruh belahan dunia tanpa terpengaruh adat istiadat lokal.', isBenar: false },
        ],
        pembahasan:
          'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena norma kesopanan bersifat partikular dan kontekstual, sangat dipengaruhi oleh adat istiadat dan kebiasaan setempat.',
        levelKognitif: 'C4 (Mengevaluasi Sifat & Sumber Norma Sosial)',
        indikatorSoal: 'Peserta didik dapat memvalidasi perbedaan sumber dan sanksi pada 4 macam norma sosial.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Korelasi Nilai Dasar, Instrumental, dan Praksis Pancasila:
Pancasila sebagai ideologi negara tidak hanya berhenti pada konsep di atas kertas, melainkan harus hidup di tengah masyarakat (living ideology).`,
        pertanyaan: `a) Jelaskan perbedaan antara Nilai Dasar, Nilai Instrumental, dan Nilai Praksis dalam Pancasila!
b) Berikan 1 contoh konkret keterkaitan antara ketiga tingkatan nilai tersebut pada Sila ke-3 (Persatuan Indonesia)!`,
        pedomanPenskoran: `Skor 20: Menjelaskan ketiga tingkatan nilai dengan tepat (10 poin) dan memberikan contoh keterkaitan konkret pada Sila ke-3 (10 poin).`,
        contohJawaban: `a) Perbedaan:
• Nilai Dasar: Asas-asas fundamental yang bersifat mutlak, abstrak, dan tetap (Ketuhanan, Kemanusiaan, Persatuan, Kerakyatan, Keadilan).
• Nilai Instrumental: Penjabaran tertulis dari nilai dasar dalam bentuk norma hukum/kebijakan (UUD NRI 1945, Ketetapan MPR, UU, Perda).
• Nilai Praksis: Realisasi nyata dari nilai dasar dan instrumental dalam sikap, tindakan, dan perilaku sehari-hari warga negara.

b) Contoh Keterkaitan pada Sila ke-3 (Persatuan Indonesia):
• Nilai Dasar: Semangat persatuan, keutuhan NKRI, dan cinta tanah air.
• Nilai Instrumental: Pasal 30 ayat (1) UUD NRI 1945 mengenai hak dan kewajiban warga negara dalam pertahanan dan keamanan negara.
• Nilai Praksis: Siswa aktif mengikuti kegiatan bela negara di sekolah, menjaga kerukunan antarsuku di pergaulan, dan menolak hoaks pemecah belah bangsa.`,
        levelKognitif: 'C5 (Menganalisis Keterkaitan Hierarki Nilai Pancasila)',
        indikatorSoal: 'Peserta didik mampu menguraikan hierarki nilai Pancasila dan memberikan contoh keterkaitannya secara berurutan.',
      },
      {
        stimulus: `Klasifikasi dan Penegakan 4 Macam Norma Sosial:
Dalam kehidupan bermasyarakat, manusia hidup berdampingan di bawah naungan norma agama, kesusilaan, kesopanan, dan hukum.`,
        pertanyaan: `Lengkapi analisis perbandingan 4 macam norma tersebut dengan menguraikan:
a) Sumber asal dan daya ikat sanksi dari masing-masing norma!
b) Mengapa norma hukum tetap mutlak diperlukan meskipun di masyarakat sudah ada norma agama, kesusilaan, dan kesopanan?`,
        pedomanPenskoran: `Skor 20: Menjelaskan sumber dan sanksi 4 norma secara runtut (12 poin) dan menjelaskan urgensi norma hukum secara analitis (8 poin).`,
        contohJawaban: `a) Sumber dan sanksi 4 norma:
1. Norma Agama: bersumber dari wahyu Tuhan Yang Maha Esa; sanksi berupa dosa di akhirat (tidak langsung di dunia).
2. Norma Kesusilaan: bersumber dari hati nurani manusia; sanksi berupa rasa penyesalan, gelisah, dan malu pada diri sendiri.
3. Norma Kesopanan: bersumber dari kebiasaan/adat pergaulan masyarakat; sanksi berupa teguran, sindiran, atau pengucilan sosial.
4. Norma Hukum: bersumber dari undang-undang yang dibuat negara; sanksi bersifat tegas, memaksa, dan mengikat (hukuman penjara, denda, ganti rugi).

b) Urgensi norma hukum:
Norma hukum mutlak diperlukan karena sanksi pada norma agama, kesusilaan, dan kesopanan sering kali tidak langsung dirasakan saat itu juga atau tidak memiliki aparat penegak resmi yang memaksa. Norma hukum hadir dengan kekuatan aparat negara (polisi, jaksa, hakim) untuk menjamin kepastian hukum, mencegah tindakan main hakim sendiri, serta melindungi hak-hak seluruh warga masyarakat secara adil dan tegas.`,
        levelKognitif: 'C5 (Menganalisis Urgensi dan Karakteristik Norma Sosial)',
        indikatorSoal: 'Peserta didik dapat menganalisis perbedaan 4 macam norma dan urgensi norma hukum dalam masyarakat.',
      },
      {
        stimulus: `Studi Kasus Penegakan HAM dan Supremasi Hukum di Era Digital:
Perkembangan teknologi informasi membuka ruang partisipasi publik yang luas, namun di sisi lain memicu ujaran kebencian, pencemaran nama baik, dan polarisasi sosial.`,
        pertanyaan: `Sebagai generasi muda terdidik:
a) Mengapa pelaksanaan Hak Asasi Manusia (HAM) harus disertai tanggung jawab dan pembatasan hukum sebagaimana diatur dalam Pasal 28J ayat (2) UUD 1945?
b) Rumuskan 2 langkah nyata yang dapat dilakukan pelajar untuk menciptakan ruang digital yang sehat, toleran, dan beradab!`,
        pedomanPenskoran: `Skor 20: Menjelaskan alasan pembatasan HAM menurut Pasal 28J (10 poin) dan merumuskan 2 langkah konkret etika digital (10 poin).`,
        contohJawaban: `a) Alasan pembatasan HAM (Pasal 28J ayat 2):
Karena kebebasan hak asasi seseorang dibatasi oleh hak asasi yang dimiliki orang lain. Tanpa adanya pembatasan hukum yang sah dan adil, kebebasan yang tidak terkendali akan memicu anarki, pelanggaran hak individu lain, serta rusaknya ketertiban dan moralitas publik.

b) Dua langkah konkret pelajar di ruang digital:
1. Menerapkan prinsip saring sebelum sharing: Selalu memeriksa keabsahan data dan sumber fakta sebelum membagikan postingan atau informasi agar tidak menjadi penyebar hoaks.
2. Mengembangkan etika berkomentar yang santun: Tidak menggunakan kata-kata kasar, fitnah, atau ujaran bermuatan SARA, serta menghargai perbedaan sudut pandang secara rasional dan objektif.`,
        levelKognitif: 'C5-C6 (Mengevaluasi HAM & Merancang Etika Digital)',
        indikatorSoal: 'Peserta didik mampu mengevaluasi pembatasan hak konstitusional dan merumuskan etika digital berlandaskan Pancasila.',
      },
    ],
  };
}
