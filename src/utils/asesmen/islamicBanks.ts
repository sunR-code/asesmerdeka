import type { GenerationRequest } from '../../types/assessment';
import type { QuestionBank } from './types';

// ============================================================================
// 7. BANK SOAL PAI & MADRASAH (Fikih, Al-Qur'an Hadis, Akidah Akhlak, SKI, Bahasa Arab)
// ============================================================================
export function buildIslamicMadrasahQuestionBank(
  req: GenerationRequest,
  lowerMapel: string,
  lowerMateri: string
): QuestionBank {
  const isFikih = lowerMapel.includes('fikih') || lowerMateri.includes('thaharah') || lowerMateri.includes('salat') || lowerMateri.includes('zakat') || lowerMateri.includes('muamalah');
  const isTajwid = lowerMapel.includes('quran') || lowerMateri.includes('tajwid') || lowerMateri.includes('nun sukun') || lowerMateri.includes('mim sukun');
  const isArab = lowerMapel.includes('arab');

  if (isArab) {
    return {
      capaianPembelajaran:
        'Peserta didik mampu memahami kosakata (mufradat), struktur kalimat (tarkib Jumlah Ismiyyah dan Fi’liyyah), serta memahami isi teks bacaan dan percakapan Bahasa Arab.',
      tujuanPembelajaranDefault:
        `Peserta didik dapat mengidentifikasi arti mufradat, menentukan kesesuaian dhamir/kata tunjuk, serta menyusun kalimat Bahasa Arab pada topik ${req.materiPokok}.`,
      pgPool: [
        {
          stimulus: `Perhatikan kalimat Bahasa Arab tentang perkenalan dan lingkungan sekolah berikut!
"هَذَا أَحْمَدُ، هُوَ طَالِبٌ جَدِيْدٌ فِي الْمَدْرَسَةِ الثَّانَوِيَّةِ."`,
          pertanyaan: 'Arti kata yang bergaris bawah "طَالِبٌ جَدِيْدٌ" (thaalibun jadiidun) dalam kalimat di atas adalah ....',
          opsi5: [
            'Guru yang ramah',
            'Siswa baru',
            'Perpustakaan yang besar',
            'Kepala sekolah yang bijaksana',
            'Ruang kelas yang bersih',
          ],
          kunci: 'B',
          pembahasan:
            'Kata "طَالِبٌ" (thaalibun) artinya seorang siswa (laki-laki), dan "جَدِيْدٌ" (jadiidun) artinya baru. Maka "طَالِبٌ جَدِيْدٌ" berarti siswa baru (Pilihan B).',
          levelKognitif: 'C2 (Memahami Makna Mufradat Kontekstual)',
          indikatorSoal: 'Disajikan kalimat bahasa Arab tentang sekolah, peserta didik dapat mengartikan frasa kata benda dan kata sifat.',
        },
        {
          stimulus: `Perhatikan kalimat rumpang berikut!
"_________ فَاطِمَةُ، هِيَ تِلْمِيْذَةٌ مَاهِرَةٌ فِي الْفَصْلِ."`,
          pertanyaan: 'Kata tunjuk (Isim Isyarah) yang tepat untuk melengkapi bagian rumpang di depan nama "Fathimah" (muannats) adalah ....',
          opsi5: ['هَذَا (Haadzaa)', 'هَذِهِ (Haadzihi)', 'ذَلِكَ (Dzaalika)', 'هُوَ (Huwa)', 'أَنْتَ (Anta)'],
          kunci: 'B',
          pembahasan:
            'Karena "فَاطِمَةُ" (Fathimah) adalah nama perempuan (Isim Muannats tunggal), maka kata tunjuk dekat yang sesuai adalah "هَذِهِ" (Haadzihi = Ini) (Pilihan B).',
          levelKognitif: 'C3 (Menerapkan Isim Isyarah Mudzakkar/Muannats)',
          indikatorSoal: 'Disajikan kalimat bahasa Arab rumpang bersubjek muannats, peserta didik dapat memilih isim isyarah yang tepat.',
        },
        {
          stimulus: `Perhatikan struktur kalimat (Jumlah Ismiyyah) berikut!
"الْمَكْتَبَةُ وَاسِعَةٌ وَنَظِيْفَةٌ" (Perpustakaan itu luas dan bersih).`,
          pertanyaan: 'Kedudukan kata "الْمَكْتَبَةُ" (Al-Maktabatu) yang berada di awal kalimat nominal (Jumlah Ismiyyah) tersebut adalah sebagai ....',
          opsi5: [
            'Mubtada’ (Subjek pembuka kalimat)',
            'Khabar (Predikat penjelas)',
            'Fi’il Madhi (Kata kerja lampau)',
            'Maf’ul Bih (Objek penderita)',
            'Harf Jar (Kata depan)',
          ],
          kunci: 'A',
          pembahasan:
            'Dalam kaidah Nahwu (Tarkib), isim ma’rifat berharakat dhammah yang terletak di awal Jumlah Ismiyyah berkedudukan sebagai Mubtada’ (subjek), sedangkan "وَاسِعَةٌ" adalah Khabar-nya (Pilihan A).',
          levelKognitif: 'C4 (Menganalisis Tarkib Jumlah Ismiyyah)',
          indikatorSoal: 'Disajikan kalimat Jumlah Ismiyyah, peserta didik dapat menentukan kedudukan mubtada dan khabar.',
        },
        {
          stimulus: `Bacalah dialog singkat berikut!
حسن : "أَيْنَ تَذْهَبُ يَا عَلِيُّ؟" (Ke mana kamu pergi wahai Ali?)
علي : "أَذْهَبُ إِلَى الْمَسْجِدِ لِصَلَاةِ الظُّهْرِ."`,
          pertanyaan: 'Berdasarkan jawaban Ali dalam dialog di atas, ke manakah Ali pergi dan untuk tujuan apa?',
          opsi5: [
            'Ke kantin untuk membeli makanan ringan.',
            'Ke masjid untuk melaksanakan salat Zuhur.',
            'Ke lapangan untuk bermain sepak bola.',
            'Ke laboratorium untuk belajar bahasa.',
            'Ke rumah sakit untuk menjenguk teman.',
          ],
          kunci: 'B',
          pembahasan:
            'Kalimat "أَذْهَبُ إِلَى الْمَسْجِدِ لِصَلَاةِ الظُّهْرِ" artinya "Saya pergi ke masjid untuk melaksanakan salat Zuhur" (Pilihan B).',
          levelKognitif: 'C3 (Memahami Isi Percakapan / Hiwar)',
          indikatorSoal: 'Disajikan teks hiwar (percakapan) singkat, peserta didik dapat menentukan informasi tujuan tokoh.',
        },
        {
          stimulus: `Perhatikan perubahan kata kerja (Fi’il Mudhari’) sesuai kata ganti (Dhamir) berikut!
Jika untuk "أَنَا" (Saya) digunakan "أَقْرَأُ الْقُرْآنَ" (Saya membaca Al-Qur'an).`,
          pertanyaan: 'Maka bentuk Fi’il Mudhari’ yang tepat untuk subjek "نَحْنُ" (Kami/Kita) adalah ....',
          opsi5: [
            'يَقْرَأُ الْقُرْآنَ',
            'تَقْرَأُ الْقُرْآنَ',
            'نَقْرَأُ الْقُرْآنَ',
            'أَقْرَأُ الْقُرْآنَ',
            'قَرَأْتُ الْقُرْآنَ',
          ],
          kunci: 'C',
          pembahasan:
            'Dalam tashrif Fi’il Mudhari’, dhamir "نَحْنُ" (Nahnu = Kami) ditandai dengan huruf mudhara’ah Nun (نَ) di awal kata kerja, sehingga menjadi "نَقْرَأُ الْقُرْآنَ" (Naqra’ul Qur’aana) (Pilihan C).',
          levelKognitif: 'C3 (Menerapkan Tashrif Fi’il Mudhari’)',
          indikatorSoal: 'Peserta didik dapat mengubah bentuk fi’il mudhari’ sesuai dengan dhamir (kata ganti) yang diminta.',
        },
        {
          stimulus: `Perhatikan kosakata profesi (Al-Mihnah) berikut!
"الطَّبِيْبُ يُعَالِجُ الْمَرْضَى فِي الْمُسْتَشْفَى."`,
          pertanyaan: 'Arti kata "الْمُسْتَشْفَى" (Al-Mustasyfaa) sebagai tempat bekerjanya dokter (Ath-Thabiibu) adalah ....',
          opsi5: [
            'Sekolah / Madrasah',
            'Pasar tradisional',
            'Rumah sakit',
            'Bandara udara',
            'Kantor pos',
          ],
          kunci: 'C',
          pembahasan:
            'Kalimat tersebut berarti "Dokter mengobati pasien di rumah sakit." Kata "الْمُسْتَشْفَى" berarti rumah sakit (Pilihan C).',
          levelKognitif: 'C2 (Mengidentifikasi Mufradat Tempat & Profesi)',
          indikatorSoal: 'Disajikan kalimat tentang profesi dalam bahasa Arab, peserta didik dapat menentukan arti kosakata tempat kerja.',
        },
      ],
      pgkPool: [
        {
          stimulus: `Tabel Kaidah Mudzakkar dan Muannats dalam Bahasa Arab:
Dalam Bahasa Arab, kata sifat (Na’at) dan Khabar harus menyesuaikan jenis kata bendanya (Mudzakkar atau Muannats).`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan kaidah Bahasa Arab di bawah ini!',
          pernyataan: [
            { teks: 'Kata benda yang diakhiri huruf Ta’ Marbuthah (ة) seperti "مَدْرَسَةٌ" dan "مَكْتَبَةٌ" termasuk kategori Isim Muannats.', isBenar: true },
            { teks: 'Kata ganti "هُوَ" (Huwa) digunakan untuk menunjuk satu orang perempuan.', isBenar: false },
            { teks: 'Kalimat "الْفَصْلُ نَظِيْفٌ" (Ruang kelas itu bersih) sudah tepat karena Mubtada dan Khabar sama-sama berbentuk Mudzakkar.', isBenar: true },
          ],
          pembahasan:
            'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena "هُوَ" (Huwa) digunakan untuk satu orang laki-laki (Mudzakkar), sedangkan untuk perempuan digunakan "هِيَ" (Hiya).',
          levelKognitif: 'C4 (Evaluasi Kaidah Tarkib Bahasa Arab)',
          indikatorSoal: 'Peserta didik dapat memvalidasi kesesuaian mudzakkar-muannats dan dhamir dalam bahasa Arab.',
        },
        {
          stimulus: `Perhatikan daftar kosakata Bahasa Arab sehari-hari berikut:
1. كِتَابٌ (Kitaabun) = Buku
2. قَلَمٌ (Qalamun) = Pena
3. سَبُّوْرَةٌ (Sabbuuratun) = Papan tulis`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan berikut!',
          pernyataan: [
            { teks: 'Kata "كِتَابٌ" dan "قَلَمٌ" termasuk peralatan belajar di dalam kelas.', isBenar: true },
            { teks: 'Kata "سَبُّوْرَةٌ" artinya adalah tas sekolah.', isBenar: false },
            { teks: 'Jika ingin mengatakan "Ini sebuah buku", kalimat yang tepat adalah "هَذَا كِتَابٌ".', isBenar: true },
          ],
          pembahasan:
            'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena "سَبُّوْرَةٌ" artinya papan tulis, sedangkan tas sekolah adalah "حَقِيْبَةٌ" (Haqiibatun).',
          levelKognitif: 'C3 (Memvalidasi Mufradat Kelas)',
          indikatorSoal: 'Peserta didik dapat memvalidasi arti mufradat benda kelas dan penggunaannya dalam kalimat.',
        },
        {
          stimulus: `Kaidah Jumlah Fi’liyyah (Kalimat Verbal Bahasa Arab):
Jumlah Fi’liyyah adalah kalimat yang diawali oleh kata kerja (Fi’il), diikuti oleh pelaku (Fa’il), dan objek (Maf’ul Bih).`,
          pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan di bawah ini!',
          pernyataan: [
            { teks: 'Kalimat "ذَهَبَ مُحَمَّدٌ إِلَى الْمَدْرَسَةِ" termasuk Jumlah Fi’liyyah karena diawali kata kerja "ذَهَبَ" (telah pergi).', isBenar: true },
            { teks: 'Fi’il Madhi adalah kata kerja yang menunjukkan perbuatan yang akan dilakukan di masa depan.', isBenar: false },
            { teks: 'Kata "مُحَمَّدٌ" pada kalimat di atas berkedudukan sebagai Fa’il (pelaku/subjek).', isBenar: true },
          ],
          pembahasan:
            'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena Fi’il Madhi menunjukkan perbuatan yang telah lampau, sedangkan masa sekarang/depan menggunakan Fi’il Mudhari’.',
          levelKognitif: 'C4 (Menganalisis Jumlah Fi’liyyah)',
          indikatorSoal: 'Peserta didik dapat mengevaluasi ciri-ciri Jumlah Fi’liyyah dan pembagian waktu kata kerja bahasa Arab.',
        },
      ],
      uraianPool: [
        {
          stimulus: `Menerjemahkan dan Menyusun Kalimat Bahasa Arab (${req.materiPokok}):
Perhatikan kalimat Bahasa Arab berikut:
"أَنَا أَدْرُسُ اللُّغَةَ الْعَرَبِيَّةَ فِي الْمَدْرَسَةِ كُلَّ يَوْمٍ."`,
          pertanyaan: `a) Terjemahkan kalimat Bahasa Arab di atas ke dalam Bahasa Indonesia yang baik dan benar!
b) Tuliskan 2 kalimat sederhana dalam Bahasa Arab (boleh disertai transliterasi Latin) untuk memperkenalkan nama dan kelasmu!`,
          pedomanPenskoran: `Skor 20: Menerjemahkan kalimat dengan tepat (10 poin) dan menulis 2 kalimat perkenalan Bahasa Arab dengan benar (10 poin).`,
          contohJawaban: `a) Terjemahan: "Saya mempelajari Bahasa Arab di sekolah/madrasah setiap hari."
b) Dua kalimat perkenalan Bahasa Arab:
1. اِسْمِيْ أَحْمَدُ (Ismii Ahmad = Nama saya Ahmad).
2. أَنَا طَالِبٌ فِي الْفَصْلِ الثَّامِنِ (Anaa thaalibun fil fashlits tsaamin = Saya siswa di kelas delapan).`,
          levelKognitif: 'C4 (Menerjemahkan & Menyusun Kalimat Arab)',
          indikatorSoal: 'Peserta didik mampu menerjemahkan kalimat Bahasa Arab dan menulis kalimat perkenalan sederhana.',
        },
        {
          stimulus: `Analisis Perbedaan Jumlah Ismiyyah dan Jumlah Fi’liyyah:
Dalam tata bahasa Arab (Nahwu), kalimat terbagi menjadi dua pola utama, yaitu Jumlah Ismiyyah dan Jumlah Fi’liyyah.`,
          pertanyaan: `Jelaskan perbedaan antara Jumlah Ismiyyah dan Jumlah Fi’liyyah beserta masing-masing 1 contoh kalimatnya!`,
          pedomanPenskoran: `Skor 20: Menjelaskan perbedaan unsur pembuka kedua kalimat (10 poin) dan memberikan masing-masing 1 contoh yang tepat (10 poin).`,
          contohJawaban: `• Jumlah Ismiyyah adalah kalimat yang diawali oleh kata benda (Isim) yang terdiri atas Mubtada’ dan Khabar. Contoh: أَحْمَدُ يَقْرَأُ الْكِتَابَ (Ahmad membaca buku) atau الْمَسْجِدُ كَبِيْرٌ (Masjid itu besar).
• Jumlah Fi’liyyah adalah kalimat yang diawali oleh kata kerja (Fi’il) yang terdiri atas Fi’il dan Fa’il. Contoh: يَقْرَأُ أَحْمَدُ الْكِتَابَ (Ahmad sedang membaca buku).`,
          levelKognitif: 'C4 (Membandingkan Struktur Kalimat Arab)',
          indikatorSoal: 'Peserta didik dapat membedakan struktur Jumlah Ismiyyah dan Jumlah Fi’liyyah beserta contohnya.',
        },
        {
          stimulus: `Menyusun Kata Acak Bahasa Arab (Tartibul Kalimat):
Perhatikan kata-kata acak berikut:
(الْمَسْجِدِ — إِلَى — يَذْهَبُ — الطَّالِبُ — صَبَاحًا)`,
          pertanyaan: `Susunlah kata-kata acak di atas menjadi sebuah kalimat Bahasa Arab yang sempurna (Jumlah Mufidah) lalu tuliskan artinya!`,
          pedomanPenskoran: `Skor 20: Menyusun urutan kata menjadi kalimat yang benar secara tata bahasa (12 poin) dan mengartikannya dengan tepat (8 poin).`,
          contohJawaban: `Susunan Kalimat: "يَذْهَبُ الطَّالِبُ إِلَى الْمَسْجِدِ صَبَاحًا" (Yadzhabuth thaalibu ilal masjidi shabaahan) atau "الطَّالِبُ يَذْهَبُ إِلَى الْمَسْجِدِ صَبَاحًا".
Artinya: "Siswa itu pergi ke masjid pada pagi hari."`,
          levelKognitif: 'C5 (Menyusun Kalimat Bahasa Arab)',
          indikatorSoal: 'Disajikan kata-kata bahasa Arab secara acak, peserta didik dapat menyusunnya menjadi kalimat yang bermakna.',
        },
      ],
    };
  }

  return {
    capaianPembelajaran: `Peserta didik mampu memahami landasan dalil Al-Qur'an dan Hadis, ketentuan hukum syariat/tajwid/akidah, serta mengamalkan nilai-nilai akhlakul karimah pada materi ${req.materiPokok} (${req.mataPelajaran}).`,
    tujuanPembelajaranDefault: `Peserta didik dapat mengidentifikasi hukum/kaidah, menganalisis hikmah ibadah dan muamalah, serta menerapkan perilaku mulia sesuai materi ${req.materiPokok}.`,
    pgPool: [
      {
        stimulus: isFikih
          ? `Dalam kajian Fikih, kesucian badan, pakaian, dan tempat dari hadas maupun najis merupakan syarat sah utama sebelum melaksanakan ibadah salat.`
          : isTajwid
          ? `Perhatikan potongan ayat Al-Qur'an berikut: "مِنْ بَعْدِ" (mim ba'di) dan "مَنْ آمَنَ" (man aamana).`
          : `Dalam kehidupan sehari-hari, seorang pelajar muslim diajarkan untuk selalu berkata benar (Shiddiq), menjaga kepercayaan (Amanah), dan menghormati orang tua serta guru.`,
        pertanyaan: isFikih
          ? 'Apabila seseorang hendak melaksanakan salat wajib namun tidak menemukan air sama sekali setelah berusaha mencarinya (atau sedang sakit yang tidak boleh terkena air), maka keringanan syariat (rukhshah) untuk bersuci yang dilakukan adalah ....'
          : isTajwid
          ? 'Hukum bacaan tajwid ketika Nun Sukun (نْ) bertemu dengan huruf Ba (ب) pada lafaz "مِنْ بَعْدِ" adalah ....'
          : 'Perilaku menjaga titipan atau melaksanakan tugas kepanitiaan sekolah dengan jujur dan penuh tanggung jawab merupakan wujud pengamalan sifat ....',
        opsi5: isFikih
          ? [
              'Mandi wajib menggunakan air hujan',
              'Bertayamum menggunakan debu yang suci untuk mengusap wajah dan kedua tangan',
              'Meninggalkan kewajiban salat sampai sembuh total',
              'Beristinja menggunakan batu saja tanpa niat',
              'Langsung salat tanpa bersuci sama sekali',
            ]
          : isTajwid
          ? [
              'Izhar Halqi (dibaca jelas tanpa dengung)',
              'Iqlab (bunyi nun sukun berubah menjadi mim disertai dengung)',
              'Idgham Bilaghunnah (dimasukkan tanpa dengung)',
              'Izhar Syafawi (mim sukun dibaca jelas)',
              'Qalqalah Kubra (dipantulkan dengan kuat)',
            ]
          : [
              'Ghibah dan Namimah',
              'Amanah (Dapat dipercaya dan bertanggung jawab)',
              'Takabur dan Riya’',
              'Israf (Berlebih-lebihan)',
              'Hasad (Iri hati)',
            ],
        kunci: 'B',
        pembahasan: isFikih
          ? 'Tayamum adalah pengganti wudu atau mandi wajib sebagai rukhshah (keringanan) ketika tidak ada air atau berhalangan menggunakan air karena sakit, dengan cara mengusap wajah dan kedua tangan menggunakan debu yang suci (Pilihan B).'
          : isTajwid
          ? 'Apabila Nun Sukun (نْ) atau Tanwin bertemu dengan huruf Ba (ب), hukum bacaannya adalah Iqlab, yaitu membalikkan bunyi nun menjadi bunyi mim (م) disertai dengung (Pilihan B).'
          : 'Menjaga kepercayaan dan melaksanakan tanggung jawab dengan sebaik-baiknya adalah definisi dari sifat terpuji Amanah (Pilihan B).',
        levelKognitif: 'C3 (Menerapkan Hukum / Kaidah Syariat)',
        indikatorSoal: `Disajikan kasus atau kutipan materi ${req.materiPokok}, peserta didik dapat menentukan hukum atau bentuk pengamalannya dengan tepat.`,
      },
      {
        stimulus: `Perhatikan pembagian jenis air dan najis dalam ilmu Fikih Thaharah!
Air yang suci dan menyucikan (Air Muthlaq) dapat digunakan untuk berwudu dan mandi wajib, seperti air sumur, air sungai, air hujan, dan air laut. Sedangkan najis dibagi menjadi tiga tingkatan: Mukhaffafah (ringan), Mutawassithah (sedang), dan Mughallazah (berat).`,
        pertanyaan: 'Cara menyucikan benda yang terkena Najis Mutawassithah (najis sedang, seperti darah atau kotoran hewan) yang tepat adalah ....',
        opsi5: [
          'Cukup diperciki air sedikit saja tanpa menghilangkan wujud najisnya.',
          'Dihilangkan wujud, warna, bau, dan rasanya terlebih dahulu, kemudian dibasuh dengan air suci dan menyucikan.',
          'Harus dibasuh sebanyak 7 kali dan salah satunya dicampur dengan tanah/debu.',
          'Cukup dijemur di bawah sinar matahari tanpa menggunakan air.',
          'Diusap menggunakan kertas tisu kering sebanyak satu kali.',
        ],
        kunci: 'B',
        pembahasan:
          'Cara menyucikan Najis Mutawassithah adalah dengan menghilangkan ain (wujud), warna, bau, dan rasa najis tersebut, lalu mengalirkan air suci dan menyucikan di atasnya (Pilihan B). Adapun basuhan 7 kali dengan tanah adalah untuk Najis Mughallazah.',
        levelKognitif: 'C3 (Menerapkan Tata Cara Thaharah)',
        indikatorSoal: 'Disajikan klasifikasi najis, peserta didik dapat menentukan tata cara menyucikan najis mutawassithah dengan benar.',
      },
      {
        stimulus: `Pak Hasan memiliki keluarga yang terdiri atas dirinya, seorang istri, dan 3 orang anak. Pada akhir bulan Ramadan menjelang Hari Raya Idulfitri, Pak Hasan wajib menunaikan Zakat Fitrah untuk seluruh anggota keluarganya.`,
        pertanyaan: 'Jika besaran Zakat Fitrah adalah 2,5 kg beras makanan pokok per jiwa, maka total beras Zakat Fitrah yang wajib dikeluarkan oleh Pak Hasan untuk keluarganya adalah ....',
        opsi5: ['7,5 kg beras', '10,0 kg beras', '12,5 kg beras', '15,0 kg beras', '17,5 kg beras'],
        kunci: 'C',
        pembahasan:
          'Jumlah jiwa dalam keluarga Pak Hasan = 1 (Pak Hasan) + 1 (Istri) + 3 (Anak) = 5 jiwa. Total Zakat Fitrah = 5 jiwa × 2,5 kg = 12,5 kg beras (Pilihan C).',
        levelKognitif: 'C3 (Menghitung Besaran Zakat Fitrah)',
        indikatorSoal: 'Disajikan jumlah anggota keluarga, peserta didik dapat menghitung total kewajiban zakat fitrah dengan tepat.',
      },
      {
        stimulus: `Dalam sejarah perkembangan Islam di Indonesia (Walisongo), Sunan Kalijaga dan Sunan Bonang berdakwah dengan pendekatan budaya yang santun, seperti melalui seni pertunjukan wayang dan gamelan yang diisi dengan nilai-nilai tauhid serta akhlak mulia.`,
        pertanyaan: 'Hikmah keteladanan utama yang dapat kita ambil dari strategi dakwah Walisongo tersebut di era masyarakat majemuk saat ini adalah ....',
        opsi5: [
          'Memaksakan pendapat kepada orang lain dengan cara kekerasan.',
          'Menyampaikan kebaikan secara bijaksana (bil hikmah), santun, dan menghargai kearifan budaya lokal yang tidak bertentangan dengan syariat.',
          'Menolak seluruh perkembangan ilmu pengetahuan dan teknologi modern.',
          'Mengisolasi diri dari pergaulan masyarakat sekitar.',
          'Menghapus seluruh bahasa daerah dalam percakapan sehari-hari.',
        ],
        kunci: 'B',
        pembahasan:
          'Dakwah Walisongo berhasil diterima secara damai karena mengedepankan cara yang bijaksana (bil hikmah wal mau’izhah hasanah), toleran, dan menghargai budaya masyarakat (Pilihan B).',
        levelKognitif: 'C4 (Menyimpulkan Ibrah Sejarah Kebudayaan Islam)',
        indikatorSoal: 'Disajikan narasi dakwah Walisongo, peserta didik dapat menyimpulkan nilai keteladanan moderasi dan kesantunan berdakwah.',
      },
      {
        stimulus: `Perhatikan hukum bacaan Nun Sukun/Tanwin ketika bertemu dengan huruf-huruf hijaiyah berikut!
1) Huruf Tenggorokan (ء هـ ع ح غ خ) → Izhar Halqi
2) Huruf (ي ن م و) → Idgham Bighunnah
3) Huruf (ل ر) → Idgham Bilaghunnah`,
        pertanyaan: 'Manakah di antara potongan lafaz berikut yang mengandung hukum bacaan IDGHAM BIGHUNNAH?',
        opsi5: [
          'مَنْ آمَنَ (Nun sukun bertemu Hamzah)',
          'مِنْ رَبِّهِمْ (Nun sukun bertemu Ra)',
          'مَنْ يَعْمَلْ (Nun sukun bertemu Ya)',
          'عَلِيْمٌ حَكِيْمٌ (Tanwin bertemu Ha)',
          'غَفُوْرٌ رَحِيْمٌ (Tanwin bertemu Ra)',
        ],
        kunci: 'C',
        pembahasan:
          'Pada lafaz "مَنْ يَعْمَلْ" (may ya’mal), Nun sukun (نْ) bertemu dengan huruf Ya (ي) yang termasuk empat huruf Idgham Bighunnah (ي ن م و), sehingga dibaca melebur disertai dengung (Pilihan C).',
        levelKognitif: 'C4 (Menganalisis Hukum Bacaan Tajwid)',
        indikatorSoal: 'Disajikan beberapa potongan ayat, peserta didik dapat memilih lafaz yang mengandung hukum bacaan Idgham Bighunnah.',
      },
      {
        stimulus: `Ketika menggunakan media sosial, seorang pelajar muslim menerima pesan berantai yang berisi berita buruk tentang temannya yang belum jelas kebenarannya.`,
        pertanyaan: 'Sesuai tuntunan Al-Qur’an Surah Al-Hujurat ayat 6, sikap terpuji yang wajib dilakukan pertama kali saat menerima berita tersebut adalah ....',
        opsi5: [
          'Langsung menyebarkannya ke seluruh grup WhatsApp kelas agar viral.',
          'Melakukan tabayyun (klarifikasi dan memeriksa kebenaran informasi dengan teliti) serta tidak tergesa-gesa menyebarkannya.',
          'Menambahkan komentar ejekan agar berita semakin ramai.',
          'Memutuskan tali silaturahmi dengan teman tersebut secara sepihak.',
          'Membuat akun palsu untuk ikut menyebarkan gosip.',
        ],
        kunci: 'B',
        pembahasan:
          'Q.S. Al-Hujurat ayat 6 memerintahkan umat Islam untuk melakukan tabayyun (meneliti dan memverifikasi kebenaran berita) agar tidak menimpakan musibah kepada orang lain karena ketidaktahuan (Pilihan B).',
        levelKognitif: 'C4 (Menerapkan Adab Bermedia Sosial / Tabayyun)',
        indikatorSoal: 'Disajikan kasus informasi di media sosial, peserta didik dapat menentukan sikap tabayyun sesuai ajaran Al-Qur’an.',
      },
    ],
    pgkPool: [
      {
        stimulus: `Tabel Evaluasi Pemahaman Materi: "${req.materiPokok}" (${req.mataPelajaran})
Kesempurnaan pengamalan ajaran Islam terwujud melalui keselarasan antara keyakinan akidah yang lurus, ketepatan ibadah sesuai syariat, dan keluhuran akhlak terhadap sesama.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan di bawah ini!',
        pernyataan: [
          { teks: 'Niat yang ikhlas karena Allah SWT dan kesesuaian tata cara dengan tuntunan Rasulullah SAW merupakan syarat diterimanya amal ibadah.', isBenar: true },
          { teks: 'Menuntut ilmu hanya diwajibkan bagi sebagian orang saja dan tidak bermanfaat bagi kehidupan akhirat.', isBenar: false },
          { teks: 'Sikap tasamuh (toleransi) dalam bermasyarakat dilakukan dengan saling menghormati tanpa mencampuradukkan akidah dan ibadah ritual.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR sesuai prinsip syariat Islam. Pernyataan 2 SALAH karena menuntut ilmu adalah kewajiban bagi setiap muslim (thalabul ilmi faridhatun ‘ala kulli muslim).',
        levelKognitif: 'C4 (Evaluasi Konsep PAI & Madrasah)',
        indikatorSoal: 'Peserta didik dapat memvalidasi pernyataan terkait syarat ibadah, kewajiban menuntut ilmu, dan batas toleransi.',
      },
      {
        stimulus: `Ketentuan Rukun dan Syarat Sah Salat / Muamalah:
Dalam Fikih, setiap ibadah dan akad muamalah memiliki rukun serta syarat yang harus dipenuhi agar sah secara hukum syariat.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan hukum Fikih berikut!',
        pernyataan: [
          { teks: 'Menutup aurat, suci dari hadas serta najis, dan menghadap kiblat termasuk syarat sah salat.', isBenar: true },
          { teks: 'Jual beli yang mengandung unsur gharar (penipuan/ketidakjelasan) dan riba diperbolehkan dalam Islam.', isBenar: false },
          { teks: 'Salat Jamak dan Qashar merupakan rukhshah (keringanan) bagi musafir yang melakukan perjalanan jauh sesuai ketentuan syariat.', isBenar: true },
        ],
        pembahasan:
          'Pernyataan 1 dan 3 BENAR. Pernyataan 2 SALAH karena praktik riba dan gharar (penipuan) dilarang keras (haram) dalam muamalah Islam.',
        levelKognitif: 'C4 (Evaluasi Hukum Fikih Ibadah & Muamalah)',
        indikatorSoal: 'Peserta didik dapat memvalidasi ketentuan syarat sah salat, rukhshah musafir, dan etika muamalah.',
      },
      {
        stimulus: `Kaidah Hukum Bacaan Mim Sukun (مْ) dalam Ilmu Tajwid:
Mim sukun yang bertemu huruf hijaiyah memiliki 3 hukum bacaan: Ikhfa Syafawi, Idgham Mimi (Mutamatsilain), dan Izhar Syafawi.`,
        pertanyaan: 'Tentukan Benar atau Salah untuk setiap pernyataan hukum tajwid berikut!',
        pernyataan: [
          { teks: 'Apabila Mim Sukun (مْ) bertemu dengan huruf Ba (ب), maka hukum bacaannya adalah Ikhfa Syafawi.', isBenar: true },
          { teks: 'Apabila Mim Sukun (مْ) bertemu dengan huruf Mim (م), maka hukum bacaannya adalah Idgham Mimi.', isBenar: true },
          { teks: 'Apabila Mim Sukun (مْ) bertemu dengan huruf Ta (ت) atau Dal (د), maka harus dibaca samar dan mendengung lama.', isBenar: false },
        ],
        pembahasan:
          'Pernyataan 1 dan 2 BENAR. Pernyataan 3 SALAH karena Mim Sukun bertemu huruf selain Mim dan Ba (seperti Ta dan Dal) hukumnya adalah Izhar Syafawi yang wajib dibaca jelas tanpa dengung.',
        levelKognitif: 'C4 (Evaluasi Kaidah Tajwid Mim Sukun)',
        indikatorSoal: 'Peserta didik dapat memvalidasi ketiga hukum bacaan mim sukun beserta contoh hurufnya.',
      },
    ],
    uraianPool: [
      {
        stimulus: `Pendalaman Materi & Pengamalan Nyata (${req.materiPokok} — ${req.mataPelajaran}):
Mempelajari ${req.mataPelajaran} bertujuan membentuk pribadi pelajar yang memahami ilmu syariat secara benar sekaligus berakhlak mulia di tengah masyarakat.`,
        pertanyaan: `Jelaskan secara terstruktur:
a) Apa pengertian inti dan ketentuan/kaidah utama dari materi "${req.materiPokok}"?
b) Tuliskan 3 hikmah atau manfaat nyata mengamalkan nilai-nilai pada materi "${req.materiPokok}" dalam kehidupan sehari-hari di sekolah dan keluarga!`,
        pedomanPenskoran: `Skor 20: Menjelaskan pengertian & ketentuan utama secara tepat (10 poin), serta menguraikan 3 hikmah/manfaat pengamalan secara logis (10 poin).`,
        contohJawaban: `a) Pengertian & Kaidah Utama: Materi ${req.materiPokok} mengatur tata cara, landasan dalil, serta rukun/ketentuan yang wajib dipedomani seorang muslim agar ibadah dan perilakunya sah serta bernilai pahala di sisi Allah SWT.
b) Tiga hikmah pengamalan nyata:
1. Menumbuhkan kedisiplinan diri, kebersihan lahir batin, dan ketenangan hati.
2. Mempererat ukhuwah (persaudaraan) serta menumbuhkan rasa saling percaya di lingkungan sekolah dan keluarga.
3. Menjaga diri dari perbuatan tercela yang dapat merugikan diri sendiri maupun orang lain.`,
        levelKognitif: 'C5 (Menganalisis Hikmah & Pengamalan Syariat)',
        indikatorSoal: `Peserta didik mampu menguraikan kaidah inti dan hikmah pengamalan ${req.materiPokok} dalam kehidupan sehari-hari.`,
      },
      {
        stimulus: `Studi Kasus Ibadah & Muamalah Kontekstual:
Rombongan siswa madrasah melakukan perjalanan studi wisata dari Jakarta menuju Yogyakarta (jarak lebih dari 85 km). Mereka berangkat pukul 11.00 WIB dan baru tiba di tempat istirahat pada pukul 16.00 WIB (waktu Asar).`,
        pertanyaan: `a) Bagaimana cara rombongan siswa tersebut melaksanakan kewajiban salat Zuhur dan Asar selama dalam perjalanan sesuai kemudahan syariat (rukhshah)?
b) Jelaskan perbedaan antara Salat Jamak Taqdim dan Salat Jamak Takhir!`,
        pedomanPenskoran: `Skor 20: Menjelaskan pelaksanaan Jamak Takhir & Qashar dengan tepat (10 poin) serta membedakan waktu pelaksanaan Jamak Taqdim dan Jamak Takhir (10 poin).`,
        contohJawaban: `a) Karena mereka baru berhenti istirahat pada waktu Asar (pukul 16.00 WIB), mereka dapat melaksanakan Salat Jamak Takhir sekaligus Qashar, yaitu mengerjakan salat Zuhur (diringkas 2 rakaat) dan salat Asar (diringkas 2 rakaat) pada waktu Asar.
b) • Jamak Taqdim: Menggabungkan dua salat wajib dan dikerjakan pada waktu salat yang pertama (misal Zuhur dan Asar dikerjakan di waktu Zuhur).
   • Jamak Takhir: Menggabungkan dua salat wajib dan dikerjakan pada waktu salat yang kedua (misal Zuhur dan Asar dikerjakan di waktu Asar).`,
        levelKognitif: 'C4 (Memecahkan Kasus Fikih Ibadah Musafir)',
        indikatorSoal: 'Disajikan kasus perjalanan jauh, peserta didik dapat menentukan tata cara salat jamak-qashar yang tepat.',
      },
      {
        stimulus: `Refleksi Akhlak Mulia & Moderasi Beragama:
Di lingkungan sekolah dan masyarakat, kita hidup berdampingan dengan teman-teman yang memiliki latar belakang pendapat, budaya, maupun kemampuan ekonomi yang beragam.`,
        pertanyaan: `Berikan masing-masing 1 contoh perilaku nyata yang mencerminkan sikap:
a) Tawadhu’ (rendah hati) terhadap guru dan teman di sekolah!
b) Tasamuh (toleransi) dan Ta’awun (tolong-menolong) dalam kegiatan sosial di masyarakat!`,
        pedomanPenskoran: `Skor 20: Memberikan contoh konkret perilaku tawadhu di sekolah (10 poin) serta contoh tasamuh dan ta’awun di masyarakat (10 poin).`,
        contohJawaban: `a) Contoh sikap Tawadhu’: Mendengarkan penjelasan guru dengan sopan, tidak menyombongkan nilai ujian yang tinggi di hadapan teman, dan bersedia membantu teman yang kesulitan belajar.
b) Contoh sikap Tasamuh & Ta’awun: Menghargai pendapat teman saat musyawarah kerja bakti kampung serta ikut bergotong royong membersihkan lingkungan dan membantu warga yang tertimpa musibah.`,
        levelKognitif: 'C5 (Mengaplikasikan Nilai Akhlakul Karimah)',
        indikatorSoal: 'Peserta didik dapat merumuskan contoh perilaku tawadhu, tasamuh, dan ta’awun dalam kehidupan sosial.',
      },
    ],
  };
}
