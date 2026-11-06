import type {
  RangkumanRequest,
  RangkumanDokumen,
  PoinRangkuman,
  RumusAtauPolaItem,
  ContohKonkretRangkuman,
  IstilahGlosarium,
  KuisKilatRangkuman,
} from '../../types/summary';
import { getJenjangLabel, isSDGrade, cleanTopicTitle } from './helpers';

// ============================================================================
// 5. ENGINE KONTEKSTUAL UNTUK MAPEL LAINNYA (IPS, Ekonomi, Sejarah, Pancasila, PAI/Madrasah, Informatika/PKK, PJOK, Seni)
// ============================================================================
export function buildContextualSubjectRangkuman(
  req: RangkumanRequest,
  rawTopik: string,
  id: string,
  createdAt: string,
  noteTag?: string
): RangkumanDokumen {
  const jenjangLabel = getJenjangLabel(req);
  const lowerMapel = req.mataPelajaran.toLowerCase();
  const lowerTopik = rawTopik.toLowerCase();

  const isPancasila = lowerMapel.includes('pancasila') || lowerMapel.includes('ppkn');
  const isAgama =
    lowerMapel.includes('agama') ||
    lowerMapel.includes('pai') ||
    lowerMapel.includes('quran') ||
    lowerMapel.includes('hadis') ||
    lowerMapel.includes('akidah') ||
    lowerMapel.includes('fikih') ||
    lowerMapel.includes('kebudayaan islam') ||
    lowerMapel.includes('ski') ||
    lowerMapel.includes('arab');
  const isInformatika =
    lowerMapel.includes('informatika') ||
    lowerMapel.includes('komputer');
  const isPKK =
    lowerMapel.includes('pkk') ||
    lowerMapel.includes('kewirausahaan') ||
    lowerMapel.includes('kejuruan') ||
    lowerMapel.includes('profesi');
  const isSejarah = lowerMapel.includes('sejarah');
  const isEkonomiIPS =
    lowerMapel.includes('ekonomi') ||
    lowerMapel.includes('ips') ||
    lowerMapel.includes('geografi') ||
    lowerMapel.includes('sosiologi');
  const isPJOK = lowerMapel.includes('pjok') || lowerMapel.includes('olahraga') || lowerMapel.includes('jasmani');
  const isSD = isSDGrade(req);
  const isSeniBudaya =
    lowerMapel.includes('seni') ||
    lowerMapel.includes('budaya') ||
    lowerMapel.includes('prakarya') ||
    lowerMapel.includes('sbdp') ||
    lowerMapel.includes('rupa') ||
    lowerMapel.includes('musik') ||
    lowerMapel.includes('tari');

  let rumusAtauPola: RumusAtauPolaItem[] = [];
  let contohKonkret: ContohKonkretRangkuman;

  if (isAgama) {
    const isFikih = lowerMapel.includes('fikih') || lowerTopik.includes('thaharah') || lowerTopik.includes('salat') || lowerTopik.includes('zakat') || lowerTopik.includes('muamalah');
    const isTajwid = lowerMapel.includes('quran') || lowerTopik.includes('tajwid') || lowerTopik.includes('nun sukun') || lowerTopik.includes('mim sukun');
    const isArab = lowerMapel.includes('arab');

    rumusAtauPola = isFikih
      ? [
          {
            label: 'Kaidah Hukum Taklifi & Rukun Ibadah',
            isi: 'Wajib (dikerjakan berpahala, ditinggalkan berdosa), Sunnah, Mubah, Makruh, Haram | Sahnya ibadah ditentukan oleh terpenuhinya Syarat Sah (sebelum ibadah) dan Rukun (di dalam ibadah).',
          },
          {
            label: 'Ketentuan Thaharah / Zakat / Muamalah',
            isi: 'Thaharah: Bersuci dari hadas (wudu/mandi wajib/tayamum) dan najis (mukhaffafah, mutawassithah, mughallazah) | Zakat Fitrah: 2,5 kg atau 3,5 liter makanan pokok per jiwa.',
          },
        ]
      : isTajwid
      ? [
          {
            label: 'Hukum Nun Sukun (نْ) / Tanwin',
            isi: '1) Izhar Halqi (jelas: ء هـ ع ح غ خ) | 2) Idgham Bighunnah (dengung: ي ن م و) & Bilaghunnah (ل ر) | 3) Iqlab (lebur jadi mim: ب) | 4) Ikhfa Haqiqi (samar: 15 huruf sisa).',
          },
          {
            label: 'Hukum Mim Sukun (مْ)',
            isi: '1) Ikhfa Syafawi (مْ bertemu ب) | 2) Idgham Mimi/Mutamatsilain (مْ bertemu م) | 3) Izhar Syafawi (مْ bertemu selain م dan ب).',
          },
        ]
      : isArab
      ? [
          {
            label: 'Struktur Kalimat Bahasa Arab (Jumlah Ismiyyah & Fi’liyyah)',
            isi: 'Jumlah Ismiyyah: diawali Isim (Mubtada’ + Khabar, misal: الطَّالِبُ مُجْتَهِدٌ) | Jumlah Fi’liyyah: diawali Fi’il/Kata Kerja (Fi’il + Fa’il + Maf’ul Bih).',
          },
          {
            label: 'Kesesuaian Mudzakkar & Muannats',
            isi: 'Isim Mudzakkar (laki-laki) berpasangan dengan kata tunjuk هَذَا / ذَلِكَ, sedangkan Isim Muannats (biasanya berakhiran ة) berpasangan dengan هَذِهِ / تِلْكَ.',
          },
        ]
      : [
          {
            label: 'Landasan Dalil Naqli & Aqli',
            isi: 'Dalil Naqli bersumber dari ayat Al-Qur’an dan Hadis Nabi Muhammad SAW, sedangkan Dalil Aqli adalah penalaran akal sehat yang selaras dengan wahyu.',
          },
          {
            label: '3 Pilar Pengamalan (Iman, Islam, Ihsan)',
            isi: 'Diyakini di dalam hati (Tasdiq bil Qalbi), diucapkan dengan lisan (Iqrar bil Lisan), dan diamalkan dalam perilaku sehari-hari (Amal bil Arkan).',
          },
        ];

    contohKonkret = {
      judulContoh: `Contoh Pengamalan & Studi Kasus: ${rawTopik}`,
      teksContoh: isFikih
        ? `Kasus Fikih Kontekstual: Saat sedang melakukan perjalanan jauh menggunakan kereta api, waktu salat Zuhur dan Asar tiba sementara ketersediaan air sangat terbatas.\n\nPenyelesaian Sesuai Syariat:\n1) Kemudahan Bersuci (Rukhshah): Jika tidak menemukan air atau berhalangan menggunakan air karena sakit, seorang muslim diperbolehkan bertayamum menggunakan debu yang suci untuk mengusap wajah dan kedua tangan hingga siku.\n2) Kemudahan Salat Musafir: Diperbolehkan melaksanakan salat Jamak (menggabungkan Zuhur dan Asar dalam satu waktu) serta Qashar (meringkas salat 4 rakaat menjadi 2 rakaat) apabila perjalanan melebihi batas jarak safar dan bukan untuk tujuan maksiat.`
        : isTajwid
        ? `Contoh Analisis Tajwid pada Potongan Ayat:\n1) مَنْ آمَنَ (Man aamana): Nun sukun (نْ) bertemu huruf Hamzah (ء) → Hukum bacaannya adalah IZHAR HALQI, dibaca jelas tanpa dengung.\n2) مِنْ بَعْدِ (Mim ba'di): Nun sukun (نْ) bertemu huruf Ba (ب) → Hukum bacaannya adalah IQLAB, suara nun sukun berubah menjadi bunyi mim disertai dengung.\n3) تَرْمِيْهِمْ بِحِجَارَةٍ (Tarmiihim bihijaarah): Mim sukun (مْ) bertemu huruf Ba (ب) → Hukum bacaannya adalah IKHFA SYAFAWI.`
        : `Teladan Pengamalan di Sekolah & Masyarakat (${rawTopik}):\nAhmad menemukan dompet milik adik kelas yang terjatuh di halaman masjid sekolah. Meskipun tidak ada seorang pun yang melihatnya, Ahmad segera menyerahkan dompet tersebut secara utuh kepada guru piket untuk diumumkan. Sikap Ahmad mencerminkan integritas kejujuran (Shiddiq), tanggung jawab menjaga amanah, serta keyakinan bahwa Allah SWT Maha Melihat (Asmaul Husna: Al-Bashir).`,
      bedahAnalisis: [
        '✅ Landasan Hukum & Dalil Jelas: Mengaitkan konsep materi langsung dengan aturan pelaksanaan yang sah.',
        '✅ Membentuk Akhlakul Karimah: Menunjukkan manfaat langsung pengamalan materi bagi ketenangan jiwa dan keharmonisan sosial.',
      ],
    };
  } else if (isPancasila) {
    rumusAtauPola = [
      {
        label: 'Hierarki Nilai & Norma',
        isi: 'Nilai Dasar Pancasila (Sila 1–5) → Nilai Instrumental (UUD NRI Tahun 1945 & Peraturan Perundang-undangan) → Nilai Praksis (Pengamalan nyata setiap hari).',
      },
      {
        label: '4 Macam Norma Sosial & Sanksinya',
        isi: '1) Norma Agama (wahyu Tuhan) | 2) Norma Kesusilaan (hati nurani/penyesalan) | 3) Norma Kesopanan (adat pergaulan/cemoohan) | 4) Norma Hukum (tegas, mengikat, bersanksi denda/pidana).',
      },
    ];
    contohKonkret = {
      judulContoh: `Studi Kasus Kewarganegaraan: ${rawTopik}`,
      teksContoh: `Kasus Musyawarah Kelas: Kelas ${req.kelas} sedang menentukan tema proyek bakti sosial akhir semester. Terdapat tiga usulan berbeda dari siswa. Ketua kelas memimpin musyawarah dengan memberikan kesempatan bicara yang adil kepada setiap perwakilan tanpa membedakan latar belakang suku maupun agama. Setelah disepakati satu tema melalui mufakat, seluruh siswa—termasuk yang usulannya tidak terpilih—bekerja sama menyukseskan acara tersebut dengan penuh tanggung jawab.`,
      bedahAnalisis: [
        '✅ Sila ke-3 & ke-4 Pancasila: Menghargai keberagaman (Bhinneka Tunggal Ika) dan mengutamakan musyawarah untuk mencapai mufakat.',
        '✅ Keseimbangan Hak & Kewajiban: Setiap siswa memperoleh hak menyampaikan pendapat dan melaksanakan kewajiban mematuhi keputusan bersama.',
      ],
    };
  } else if (isInformatika) {
    rumusAtauPola = [
      {
        label: '4 Pilar Berpikir Komputasional (Computational Thinking)',
        isi: '1) Decomposition (Memecah masalah besar menjadi bagian kecil) → 2) Pattern Recognition (Mengenali pola kesamaan) → 3) Abstraction (Fokus pada informasi penting) → 4) Algorithm Design (Menyusun langkah logis berurutan).',
      },
      {
        label: 'Alur Kerja Sistem / Proyek Kejuruan (IPO & PDCA)',
        isi: 'Input (Data/Bahan) → Process (Pengolahan CPU / Standar K3LH & SOP Kerja) → Output (Informasi / Produk Berkualitas) → Evaluasi Kualitas.',
      },
    ];
    contohKonkret = {
      judulContoh: `Studi Kasus Algoritma & Solusi Praktis: ${rawTopik}`,
      teksContoh: `Kasus Penerapan Berpikir Komputasional & Proyek:\nTim siswa ingin membuat sistem antrean kantin sekolah agar tidak terjadi penumpukan saat jam istirahat:\n1) Dekomposisi: Memisahkan proses memilih menu, proses pembayaran, dan proses pengambilan makanan.\n2) Pengenalan Pola: Menemukan bahwa 70% siswa memesan 3 menu utama yang sama setiap hari.\n3) Abstraksi: Mengabaikan detail warna meja kantin dan fokus pada kecepatan waktu transaksi per siswa.\n4) Algoritma: Menyusun prosedur pemesanan cepat berbasis kupon warna/QR dan jalur antrean terpisah sehingga waktu tunggu turun dari 15 menit menjadi 3 menit.`,
      bedahAnalisis: [
        '✅ Sistematis & Terukur: Masalah dipecahkan secara bertahap menggunakan logika terstruktur.',
        '✅ Relevan dengan Dunia Kerja (SMK/Industri): Mengedepankan efisiensi, keamanan data/kerja (K3LH), dan nilai tambah bagi pengguna.',
      ],
    };
  } else if (isPKK) {
    rumusAtauPola = [
      {
        label: 'Analisis Peluang Usaha (SWOT) & Budaya Kerja 5R',
        isi: 'SWOT: Strengths (Kekuatan), Weaknesses (Kelemahan), Opportunities (Peluang), Threats (Ancaman) | Budaya Kerja 5R: Ringkas, Rapi, Resik, Rawat, Rajin + K3LH.',
      },
      {
        label: 'Rumus Harga Pokok Produksi (HPP) & Titik Impas (BEP)',
        isi: 'Total Biaya (TC) = Biaya Tetap (FC) + Biaya Variabel (VC) | HPP per Unit = Total Biaya Produksi / Jumlah Produk | BEP Unit = FC / (Harga Jual per Unit - VC per Unit).',
      },
    ];
    contohKonkret = {
      judulContoh: `Studi Kasus Perhitungan HPP & BEP Wirausaha SMK: ${rawTopik}`,
      teksContoh: `Kasus Produksi Kreatif Siswa SMK:\nKelompok wirausaha siswa memproduksi 100 pak keripik pisang coklat. Biaya penyusutan alat (Biaya Tetap/FC) sebesar Rp100.000,00 dan biaya bahan baku serta kemasan (Biaya Variabel/VC) sebesar Rp10.000,00 per pak. Produk tersebut dijual dengan harga Rp15.000,00 per pak.\n\nAnalisis Keuangan Usaha:\n1) Total Biaya Produksi 100 pak = Rp100.000 + (100 × Rp10.000) = Rp1.100.000,00 (HPP = Rp11.000/pak).\n2) Titik Impas (BEP Unit) = FC / (Harga Jual - VC) = 100.000 / (15.000 - 10.000) = 100.000 / 5.000 = 20 pak.\n3) Jika seluruh 100 pak terjual habis, Laba Bersih = (100 × Rp15.000) - Rp1.100.000 = Rp400.000,00.`,
      bedahAnalisis: [
        '✅ Perhitungan Bisnis Terukur: Memisahkan biaya tetap dan biaya variabel untuk menentukan HPP serta titik impas (BEP).',
        '✅ Siap Kerja & Berwirausaha: Melatih perencanaan produksi, kendali mutu, dan pemasaran produk secara profesional.',
      ],
    };
  } else if (isSejarah) {
    rumusAtauPola = [
      {
        label: 'Konsep Berpikir Diakronik vs Sinkronik dalam Sejarah',
        isi: 'Diakronik (Kronologis): Memanjang dalam waktu, menyempit dalam ruang (menelusuri urutan peristiwa dari awal hingga akhir) | Sinkronik: Meluas dalam ruang, terbatas dalam waktu (menganalisis struktur sosial-ekonomi-politik secara mendalam pada satu masa).',
      },
      {
        label: '3 Unsur Utama Sejarah & Tahapan Penelitian',
        isi: 'Unsur Sejarah: Manusia (Pelaku), Ruang (Tempat), dan Waktu (Kapan) | Metode Sejarah: 1) Heuristik (Pengumpulan Sumber) → 2) Kritik/Verifikasi (Uji Kredibilitas) → 3) Interpretasi (Penafsiran) → 4) Historiografi (Penulisan Sejarah).',
      },
    ];
    contohKonkret = {
      judulContoh: `Contoh Analisis Peristiwa Sejarah (Diakronik & Sinkronik): ${rawTopik}`,
      teksContoh: `Analisis Peristiwa Proklamasi Kemerdekaan Indonesia (17 Agustus 1945):\n1) Pendekatan Diakronik (Urutan Waktu Kronologis): Dimulai dari kekalahan Jepang pada 14 Agustus 1945 → Peristiwa Rengasdengklok pada 16 Agustus 1945 → Perumusan teks proklamasi di rumah Laksamana Maeda dini hari 17 Agustus 1945 → Pembacaan Proklamasi pukul 10.00 WIB di Jl. Pegangsaan Timur No. 56 Jakarta.\n2) Pendekatan Sinkronik (Analisis Struktur Sosial-Politik): Menganalisis suasana ketegangan politik di Jakarta, perbedaan strategi antara golongan muda dan golongan tua, serta peran jaringan radio dalam menyebarluaskan berita kemerdekaan ke seluruh Nusantara.`,
      bedahAnalisis: [
        '✅ Membedakan Diakronik & Sinkronik: Diakronik berfokus pada rentetan tanggal peristiwa (kronologi), sedangkan Sinkronik membedah kondisi sosial-politik pada momen tersebut.',
        '✅ Kausalitas Sejarah: Setiap peristiwa sejarah memiliki hubungan sebab-akibat yang saling berkaitan.',
      ],
    };
  } else if (isEkonomiIPS) {
    rumusAtauPola = [
      {
        label: 'Prinsip Kausalitas Sosial, Ruang & Ekonomi',
        isi: 'Kelangkaan (Scarcity) vs Kebutuhan Tak Terbatas → Skala Prioritas & Biaya Peluang (Opportunity Cost = nilai alternatif terbaik yang dikorbankan).',
      },
      {
        label: 'Hukum Permintaan (Demand) & Penawaran (Supply)',
        isi: 'Hukum Permintaan: Jika harga (P) naik, jumlah barang yang diminta (Qd) turun (berbanding terbalik) | Hukum Penawaran: Jika harga (P) naik, jumlah barang yang ditawarkan (Qs) naik (berbanding lurus) | Titik Ekuilibrium: Qd = Qs.',
      },
    ];
    contohKonkret = {
      judulContoh: `Studi Kasus Analisis Sosial/Ekonomi: ${rawTopik}`,
      teksContoh: `Kasus Biaya Peluang (Opportunity Cost) & Pengambilan Keputusan:\nSetelah lulus sekolah, Raka mendapat dua tawaran pekerjaan: bekerja sebagai staf administrasi di Perusahaan A dengan gaji Rp4.500.000/bulan, atau bekerja sebagai desainer grafis di Studio B dengan gaji Rp4.000.000/bulan. Raka memutuskan untuk membuka usaha percetakan digital sendiri dengan estimasi laba bersih Rp5.500.000/bulan.\n\nAnalisis Ekonomi:\n• Pilihan rasional yang diambil Raka: Membuka usaha percetakan digital (Rp5.500.000).\n• Biaya Peluang (Opportunity Cost) yang dikorbankan Raka adalah nilai satu alternatif terbaik yang tidak dipilih, yaitu gaji di Perusahaan A sebesar Rp4.500.000/bulan (bukan gabungan keduanya).`,
      bedahAnalisis: [
        '✅ Konsep Biaya Peluang Tepat: Opportunity cost hanya menghitung 1 pilihan terbaik yang dilepaskan, bukan menjumlahkan seluruh opsi.',
        '✅ Berpikir Kritis Kontekstual: Menghubungkan teori buku dengan keputusan finansial dan sosial nyata.',
      ],
    };
  } else if (isPJOK) {
    rumusAtauPola = [
      {
        label: 'Klasifikasi Gerak Dasar Olahraga',
        isi: '1) Gerak Lokomotor (berpindah tempat: berlari, melompat, menggiring) | 2) Gerak Non-Lokomotor (tidak berpindah tempat: mengayun, membungkuk, peregangan) | 3) Gerak Manipulatif (menggunakan alat/bola: menendang, melempar, menangkap, memukul).',
      },
      {
        label: 'Tahapan Latihan Fisik & Kebugaran Jasmani',
        isi: 'Pemanasan (Warming Up: menaikkan suhu otot & mencegah cedera) → Latihan Inti (Teknik & Taktik) → Pendinginan (Cooling Down: menormalkan detak jantung & mencegah pegal asam laktat).',
      },
    ];
    contohKonkret = {
      judulContoh: `Contoh Praktik Teknik & Kebugaran: ${rawTopik}`,
      teksContoh: `Analisis Kombinasi Gerak pada Permainan Bola Besar / Kebugaran:\nSaat seorang pemain sepak bola atau bola basket melakukan serangan balik cepat:\n1) Ia berlari cepat mengejar ruang kosong (Gerak Lokomotor).\n2) Ia menekuk lutut dan memutar badan untuk menjaga keseimbangan (Gerak Non-Lokomotor).\n3) Ia mengumpan atau menembakkan bola ke arah gawang/ring dengan akurat (Gerak Manipulatif).\nSelain keterampilan teknik, keberhasilan gerakan tersebut didukung oleh komponen kebugaran jasmani seperti kecepatan (speed), kelincahan (agility), dan daya tahan jantung-paru (endurance).`,
      bedahAnalisis: [
        '✅ Integrasi 3 Gerak Dasar: Membedakan dengan jelas mana gerakan berpindah tempat, di tempat, dan memainkan objek.',
        '✅ Keselamatan & Sportivitas: Menekankan pentingnya pemanasan, kerja sama tim, dan fair play.',
      ],
    };
  } else if (isSeniBudaya) {
    rumusAtauPola = [
      {
        label: 'Unsur Seni Rupa & Pencampuran Warna',
        isi: 'Unsur Rupa: Titik, Garis, Bidang, Bentuk, Warna, Tekstur, Gelap-Terang | Warna Primer (Merah, Kuning, Biru) → Warna Sekunder: Merah + Kuning = Oranye, Kuning + Biru = Hijau, Biru + Merah = Ungu.',
      },
      {
        label: 'Unsur Musik & Penggolongan Alat Musik',
        isi: 'Alat Musik Ritmis (mengatur irama/tempo, tak bernada: tamborin, gendang, marakas, rebana) | Alat Musik Melodis (menghasilkan nada/melodi: pianika, rekorder, gitar, keyboard).',
      },
    ];
    contohKonkret = {
      judulContoh: `Proyek Kreatif Seni & Prakarya: ${rawTopik}`,
      teksContoh: `Dalam kegiatan berkarya seni rupa dan kerajinan tangan, siswa membuat karya kolase dan mozaik menggunakan bahan alam ramah lingkungan (daun kering, ranting, dan biji-bijian).\n\nTahapan Berkarya:\n1) Perencanaan: Menentukan tema gambar dan menyiapkan pola sketsa dasar di atas kertas gambar.\n2) Pemilihan Bahan: Memilih biji jagung, kacang hijau, dan daun kering dengan warna kontras agar pola terlihat hidup.\n3) Penempelan Rapi: Mengoleskan lem secara bertahap dan menempelkan bahan mengikuti garis sketsa secara teliti.\n4) Finishing & Apresiasi: Memajang karya di papan apresiasi kelas untuk diapresiasi bersama kawan sekelas.`,
      bedahAnalisis: [
        '✅ Memadukan Estetika & Ketelitian: Melatih motorik halus, kepekaan komposisi warna, dan kreativitas visual.',
        '✅ Ramah Lingkungan: Memanfaatkan bahan alam sekitar tanpa menimbulkan limbah berbahaya.',
      ],
    };
  } else {
    rumusAtauPola = [
      {
        label: `Prinsip Inti & Kaidah Materi (${rawTopik})`,
        isi: '1) Pemahaman Konsep Pokok → 2) Hubungan Sebab-Akibat Antar-Komponen → 3) Penerapan Nyata dan Evaluasi Solusi.',
      },
      {
        label: 'Alur Penerapan Sistematis dalam Pembelajaran',
        isi: 'Mengenali Masalah Lapangan → Menganalisis Berdasarkan Teori Teruji → Menerapkan Solusi Terarah → Menarik Kesimpulan Bermakna.',
      },
    ];
    contohKonkret = {
      judulContoh: `Studi Kasus Kontekstual: ${rawTopik}`,
      teksContoh: `Dalam kegiatan pembelajaran ${req.mataPelajaran} tentang topik "${rawTopik}", siswa Kelas ${req.kelas} mengamati kondisi nyata di lingkungan sekitar mereka. Mereka mengidentifikasi permasalahan utama, mendiskusikan langkah penyelesaian yang paling tepat berdasarkan kaidah materi, lalu mempresentasikan kesimpulannya di depan kelas secara runtut dan percaya diri.`,
      bedahAnalisis: [
        '✅ Pembelajaran Bermakna: Siswa menghubungkan teori buku pelajaran dengan peristiwa nyata di sekitar.',
        '✅ Mengasah Bernalar Kritis: Melatih siswa menyusun argumentasi logis berdasarkan fakta dan data objektif.',
      ],
    };
  }

  // BANGUN KONTEN KHUSUS PER MATA PELAJARAN (NON-KAKU & ANTI-BOILERPLATE)
  let ringkasanSatuKalimat = '';
  let petaKonsep: string[] = [];
  let poinUtama: PoinRangkuman[] = [];
  let tipsUjian: string[] = [];
  let faktaMenarik: string[] = [];
  let glosarium: IstilahGlosarium[] = [];
  let kuisKilat: KuisKilatRangkuman[] = [];
  let pesanInspirasi = 'Ilmu yang bermanfaat adalah ilmu yang dipahami maknanya dan diamalkan kebaikannya setiap hari. Semangat belajar! 🌟';

  if (isPancasila) {
    if (isSD) {
      ringkasanSatuKalimat = `Mengenal nilai-nilai luhur 5 Sila Pancasila, simbol sila, hak dan kewajiban anak, serta indahnya hidup rukun dalam keberagaman di rumah dan sekolah.`;
      petaKonsep = [
        '1. Simbol & Makna Sila 1–5 Pancasila',
        '2. Contoh Perilaku Baik dalam Keseharian',
        '3. Hak dan Kewajiban Kita di Sekolah & Rumah',
        '4. Bhinneka Tunggal Ika & Gotong Royong',
      ];
      poinUtama = [
        {
          judul: '1. Mengenal 5 Sila Pancasila dan Simbolnya',
          penjelasan:
            'Pancasila adalah dasar negara kita dan pedoman untuk bersikap baik setiap hari. Setiap sila memiliki lambang istimewa: Sila 1 Bintang (rajin berdoa & bersyukur), Sila 2 Rantai (sayang teman & tolong-menolong), Sila 3 Pohon Beringin (cinta tanah air & rukun), Sila 4 Kepala Banteng (musyawarah & tidak memaksakan kehendak), Sila 5 Padi dan Kapas (adil berbagi & suka hidup hemat).',
          analogi:
            'Pancasila itu seperti akar pohon beringin yang sangat kuat—menjaga kita semua tetap bersatu, aman, dan teduh dalam satu rumah besar bernama Indonesia!',
          poinKunci: [
            'Berdoa sebelum dan sesudah belajar mencerminkan pengamalan Sila ke-1.',
            'Menolong teman yang terjatuh di halaman sekolah mencerminkan pengamalan Sila ke-2.',
            'Bermain bersama teman yang berbeda suku tanpa mengejek mencerminkan pengamalan Sila ke-3.',
            'Bermusyawarah memilih ketua kelas atau membagi regu piket mencerminkan pengamalan Sila ke-4.',
            'Melaksanakan tugas piket secara adil dan gemar menabung mencerminkan pengamalan Sila ke-5.',
          ],
        },
        {
          judul: '2. Hak dan Kewajiban Kita sebagai Pelajar',
          penjelasan:
            'Dalam kehidupan bersama, kita memiliki aturan yang harus ditaati. Kewajiban harus kita laksanakan terlebih dahulu dengan ikhlas dan tertib, barulah kita berhak menerima hak kita.',
          poinKunci: [
            'Kewajiban di sekolah: mematuhi tata tertib, mendengarkan penjelasan guru, dan menjaga kebersihan kelas.',
            'Hak di sekolah: mendapatkan bimbingan ilmu, merasa aman di kelas, dan meminjam buku perpustakaan.',
            'Kewajiban di rumah: membantu orang tua, merapikan tempat tidur sendiri, dan belajar tepat waktu.',
          ],
        },
        {
          judul: '3. Hidup Rukun, Toleransi, dan Gotong Royong',
          penjelasan:
            'Semboyan bangsa kita adalah Bhinneka Tunggal Ika (berbeda-beda tetapi tetap satu jua). Walaupun teman-teman kita berbeda suku, logat bicara, atau agama, kita harus tetap rukun dan saling menghormati.',
          poinKunci: [
            'Gotong royong membuat pekerjaan yang berat menjadi ringan dan cepat selesai.',
            'Jika berbuat salah, berani meminta maaf; jika teman meminta maaf, berjiwa besar memaafkannya.',
            'Toleransi membuat suasana belajar di kelas menjadi nyaman, damai, dan menyenangkan.',
          ],
        },
      ];
      tipsUjian = [
        '🎯 Ingat simbol sila Pancasila: 1 = Bintang, 2 = Rantai, 3 = Pohon Beringin, 4 = Kepala Banteng, 5 = Padi dan Kapas!',
        '🎯 Trik Hak vs Kewajiban: Yang harus kita LAKUKAN = Kewajiban, yang kita TERIMA/DAPATKAN = Hak!',
      ];
      faktaMenarik = [
        'Tahukah Kamu? Lambang Garuda Pancasila dirancang oleh Sultan Hamid II dari Pontianak dan diresmikan pertama kali pada Sidang Kabinet RIS tanggal 11 Februari 1950!',
      ];
      glosarium = [
        { istilah: 'Musyawarah', makna: 'Berdiskusi bersama untuk mencapai kesepakatan (mufakat) yang disetujui semua pihak.' },
        { istilah: 'Hak', makna: 'Sesuatu yang berhak kita terima setelah kita menunaikan kewajiban.' },
        { istilah: 'Kewajiban', makna: 'Sesuatu yang wajib dilaksanakan dengan penuh rasa tanggung jawab.' },
        { istilah: 'Bhinneka Tunggal Ika', makna: 'Semboyan bangsa Indonesia yang berarti berbeda-beda tetapi tetap satu jua.' },
        { istilah: 'Toleransi', makna: 'Sikap saling menghormati dan menghargai perbedaan keyakinan, pendapat, dan suku bangsa.' },
      ];
      kuisKilat = [
        {
          nomor: 1,
          pertanyaan: 'Apa simbol dari sila ke-4 Pancasila dan berikan 1 contoh pengamalannya di kelas!',
          jawaban: 'Simbolnya Kepala Banteng. Contohnya melakukan musyawarah bersama untuk menentukan ketua kelas atau membagi tugas piket.',
        },
        {
          nomor: 2,
          pertanyaan: 'Sebutkan perbedaan antara HAK dan KEWAJIBAN seorang siswa di sekolah!',
          jawaban: 'Kewajiban adalah tugas yang harus dilakukan seperti belajar dan mematuhi tata tertib, sedangkan hak adalah sesuatu yang berhak diterima seperti mendapatkan ilmu dan perlindungan dari guru.',
        },
      ];
    } else {
      // SMP & SMA/SMK Pancasila
      ringkasanSatuKalimat = `Membedah hierarki nilai Pancasila, 4 macam norma sosial, supremasi hukum UUD NRI 1945, serta harmonisasi hak dan kewajiban warga negara.`;
      petaKonsep = [
        '1. Hierarki Nilai: Dasar, Instrumental, & Praksis',
        '2. 4 Macam Norma Sosial & Penegakannya',
        '3. Hak & Kewajiban Konstitusional (UUD NRI 1945)',
        '4. Demokrasi Deliberatif & Penguatan Karakter Bangsa',
      ];
      poinUtama = [
        {
          judul: '1. Hierarki Nilai Pancasila sebagai Dasar & Ideologi Terbuka',
          penjelasan:
            'Pancasila memuat tiga dimensi nilai: Nilai Dasar (prinsip abstrak tetap pada Sila 1–5), Nilai Instrumental (penjabaran tertulis dalam UUD NRI 1945 dan peraturan perundang-undangan), serta Nilai Praksis (perwujudan nyata dalam kehidupan sehari-hari).',
          analogi:
            'Nilai dasar itu seperti pondasi mercusuar, nilai instrumental adalah lentera cahayanya yang terang, dan nilai praksis adalah kapal yang berlayar aman mengikuti arah cahaya tersebut!',
          poinKunci: [
            'Pancasila berkedudukan sebagai Sumber dari Segala Sumber Hukum Negara (Pasal 2 UU No. 12 Tahun 2011).',
            'Pancasila sebagai Meja Statis menyatukan kemajemukan bangsa, dan sebagai Leitstar Dinamis memandu arah kemajuan bangsa di era global.',
          ],
        },
        {
          judul: '2. 4 Macam Norma dalam Kehidupan Bermasyarakat',
          penjelasan:
            'Untuk menciptakan ketertiban umum (order) dan keadilan sosial, masyarakat dipandu oleh empat macam norma yang saling melengkapi.',
          poinKunci: [
            'Norma Agama: bersumber dari wahyu Tuhan Yang Maha Esa, sanksi berupa dosa dan balasan di akhirat.',
            'Norma Kesusilaan: bersumber dari suara hati nurani manusia, sanksi berupa rasa bersalah, gelisah, dan penyesalan mendalam.',
            'Norma Kesopanan: bersumber dari kebiasaan/adat pergaulan masyarakat, sanksi berupa teguran, cemoohan, atau dikucilkan.',
            'Norma Hukum: dibuat oleh lembaga resmi negara, bersifat tegas, memaksa, dan mengikat seluruh warga dengan sanksi pidana/denda.',
          ],
        },
        {
          judul: '3. Harmonisasi Hak dan Kewajiban Warga Negara (UUD NRI 1945)',
          penjelasan:
            'Hak asasi tidak dapat dituntut secara mutlak tanpa memenuhi kewajiban asasi. Keseimbangan keduanya menjamin tegaknya keadilan dan ketertiban sosial.',
          poinKunci: [
            'Pasal 27 ayat (1): Segala warga negara bersamaan kedudukannya di dalam hukum dan pemerintahan.',
            'Pasal 28J ayat (2): Dalam menjalankan hak dan kebebasannya, setiap orang wajib tunduk kepada pembatasan yang ditetapkan dengan undang-undang.',
            'Pasal 30 ayat (1): Tiap-tiap warga negara berhak dan wajib ikut serta dalam usaha pertahanan dan keamanan negara.',
          ],
        },
      ];
      tipsUjian = [
        '🎯 Bedakan Sumber & Sanksi 4 Norma: Agama (Tuhan/dosa), Kesusilaan (Hati nurani/penyesalan), Kesopanan (Adat/cemoohan), Hukum (Negara/penjara-denda tegas)!',
        '🎯 Ingat Pasal Kunci UUD 1945: Pasal 27 (Hukum & Pekerjaan), Pasal 28 (HAM), Pasal 29 (Agama), Pasal 30 (Bela Negara), Pasal 31 (Pendidikan)!',
      ];
      glosarium = [
        { istilah: 'Nilai Praksis', makna: 'Realisasi nilai-nilai instrumental Pancasila dalam tindakan nyata kehidupan sehari-hari.' },
        { istilah: 'Norma Hukum', makna: 'Aturan tingkah laku yang dibuat oleh penguasa negara yang bersifat memaksa dan memiliki sanksi tegas.' },
        { istilah: 'Demokrasi Deliberatif', makna: 'Musyawarah berbasis pertukaran argumen rasional dan beretika untuk mencapai konsensus mufakat.' },
        { istilah: 'Supremasi Hukum', makna: 'Prinsip bahwa hukum memegang kekuasaan tertinggi dalam kehidupan bernegara.' },
      ];
      kuisKilat = [
        {
          nomor: 1,
          pertanyaan: 'Sebutkan 4 macam norma sosial yang berlaku di masyarakat beserta sumber asalnya masing-masing!',
          jawaban: 'Norma Agama (wahyu Tuhan), Norma Kesusilaan (hati nurani), Norma Kesopanan (adat pergaulan), dan Norma Hukum (negara/pemerintah).',
        },
        {
          nomor: 2,
          pertanyaan: 'Mengapa pemenuhan hak warga negara harus diimbangi dengan pelaksanaan kewajiban?',
          jawaban: 'Karena jika setiap orang menuntut haknya tanpa menjalankan kewajiban, akan terjadi kekacauan, benturan kepentingan, dan ketidakadilan di masyarakat.',
        },
      ];
    }
  } else if (isAgama) {
    ringkasanSatuKalimat = `Memahami ketentuan syariat ibadah, hukum bacaan Al-Qur'an (tajwid), serta penanaman akhlak mulia dalam muamalah sehari-hari pada materi "${rawTopik}".`;
    petaKonsep = [
      '1. Landasan Dalil & Ketentuan Syariat',
      '2. Rukun, Syarat Sah, & Kaidah Hukum',
      '3. Studi Kasus Ibadah & Muamalah',
      '4. Akhlakul Karimah & Hikmah Pengamalan',
    ];
    poinUtama = [
      {
        judul: '1. Landasan Dalil & Hukum Taklifi',
        penjelasan:
          'Setiap ibadah dan perilaku seorang muslim terikat pada hukum syariat yang bersumber dari Al-Qur’an dan As-Sunnah. Memahami syarat sah dan rukun menjamin ibadah diterima di sisi Allah SWT.',
        analogi:
          'Syariat ibadah itu seperti rambu keselamatan lalu lintas—menuntun kita sampai ke tujuan akhirat dengan selamat dan penuh berkah!',
        poinKunci: [
          '5 Hukum Taklifi: Wajib (berpahala jika dikerjakan, berdosa jika ditinggalkan), Sunnah, Mubah, Makruh, dan Haram.',
          'Syarat Sah adalah ketentuan yang harus dipenuhi sebelum ibadah dimulai (misal suci dari hadas), sedangkan Rukun adalah bagian inti di dalam ibadah (misal niat dan takbiratul ihram).',
        ],
      },
      {
        judul: '2. Kemudahan Syariat (Rukhshah) dalam Keadaan Darurat / Safar',
        penjelasan:
          'Agama Islam adalah agama yang memudahkan pemeluknya dan tidak memberikan beban di luar batas kemampuan (Yusr wa Laa ‘Usr).',
        poinKunci: [
          'Kemudahan Bersuci (Tayamum): menggunakan debu yang suci untuk mengusap wajah dan tangan saat tidak ada air atau sakit.',
          'Kemudahan Salat Musafir: Salat Jamak (menggabungkan 2 salat dalam 1 waktu) dan Qashar (meringkas salat 4 rakaat menjadi 2 rakaat).',
        ],
      },
      {
        judul: '3. Akhlakul Karimah dalam Hubungan Sosial (Hablum Minannas)',
        penjelasan:
          'Bukti keimanan yang sejati tampak pada akhlak terpuji kepada sesama manusia, baik di lingkungan sekolah, keluarga, maupun masyarakat luas.',
        poinKunci: [
          'Sikap Shiddiq (jujur) dan Amanah (dapat dipercaya) saat mengemban tugas.',
          'Tawadhu’ (rendah hati), Tasamuh (toleransi), dan Ta’awun (suka tolong-menolong tanpa pamrih).',
        ],
      },
    ];
    glosarium = [
      { istilah: 'Rukhshah', makna: 'Keringanan hukum yang diberikan Allah SWT kepada hamba-Nya karena kondisi tertentu (seperti safar atau sakit).' },
      { istilah: 'Thaharah', makna: 'Bersuci dari hadas (kecil/besar) dan najis sebagai syarat sah ibadah salat.' },
      { istilah: 'Shiddiq', makna: 'Sifat jujur dan benar, baik dalam perkataan maupun perbuatan.' },
      { istilah: 'Amanah', makna: 'Dapat dipercaya dalam memegang rahasia, janji, maupun tanggung jawab tugas.' },
    ];
    kuisKilat = [
      {
        nomor: 1,
        pertanyaan: 'Kapan seorang muslim diperbolehkan melaksanakan salat secara jamak dan qashar?',
        jawaban: 'Ketika sedang melakukan perjalanan jauh (safar) yang mubah dan melebihi jarak batas safar (sekitar 81-85 km).',
      },
      {
        nomor: 2,
        pertanyaan: 'Sebutkan 4 sifat wajib bagi para Rasul Allah SWT!',
        jawaban: 'Shiddiq (Jujur), Amanah (Dapat Dipercaya), Tabligh (Menyampaikan), dan Fathanah (Cerdas).',
      },
    ];
  } else if (isPJOK) {
    ringkasanSatuKalimat = `Menguasai 3 pola gerak dasar (lokomotor, non-lokomotor, manipulatif), tahapan latihan fisik yang aman, serta penerapan pola hidup bersih dan sehat.`;
    petaKonsep = [
      '1. 3 Macam Gerak Dasar Olahraga',
      '2. Tahapan Latihan: Pemanasan, Inti, & Pendinginan',
      '3. Komponen Kebugaran Jasmani',
      '4. Pola Hidup Sehat & Sportivitas',
    ];
    poinUtama = [
      {
        judul: '1. Mengenal 3 Pola Gerak Dasar dalam Olahraga',
        penjelasan:
          'Setiap cabang olahraga dan aktivitas fisik dibangun dari tiga gerak dasar utama yang saling berpadu.',
        analogi:
          'Gerak dasar itu seperti alfabet dalam membaca—jika kita menguasai gerak dasarnya dengan benar, kita bisa memainkan cabang olahraga apa pun dengan lincah!',
        poinKunci: [
          'Gerak Lokomotor: gerakan yang berpindah tempat (contoh: berjalan, berlari, melompat, meluncur).',
          'Gerak Non-Lokomotor: gerakan tanpa berpindah tempat (contoh: mengayun lengan, membungkuk, menekuk lutut, memutar pinggang).',
          'Gerak Manipulatif: gerakan yang melibatkan penguasaan alat/benda (contoh: menendang bola, melempar, menangkap, memukul bola kasti).',
        ],
      },
      {
        judul: '2. Urutan Latihan yang Benar dan Menghindari Cedera',
        penjelasan:
          'Berolahraga wajib dilakukan secara bertahap agar otot dan jantung tidak kaget sehingga terhindar dari cedera berbahaya.',
        poinKunci: [
          'Pemanasan (Warming Up): 10 menit pertama untuk menaikkan suhu tubuh, melancarkan peredaran darah, dan melenturkan sendi.',
          'Latihan Inti: melakukan teknik permainan olahraga atau latihan daya tahan sesuai target.',
          'Pendinginan (Cooling Down): menurunkan detak jantung secara bertahap dan mengurai penumpukan asam laktat agar otot tidak kram/pegal.',
        ],
      },
      {
        judul: '3. Kebugaran Jasmani & Sportivitas',
        penjelasan:
          'Olahraga tidak hanya menyehatkan raga, tetapi juga membentuk jiwa kesatria yang menjunjung tinggi fair play.',
        poinKunci: [
          'Komponen Kebugaran: Kekuatan (Strength), Daya Tahan (Endurance), Kecepatan (Speed), dan Kelincahan (Agility).',
          'Sportivitas: mematuhi aturan pertandingan, menghormati keputusan wasit/guru, serta bersalaman dengan lawan main.',
        ],
      },
    ];
    glosarium = [
      { istilah: 'Lokomotor', makna: 'Gerakan tubuh yang menyebabkan perpindahan posisi dari satu titik ke titik lain.' },
      { istilah: 'Non-Lokomotor', makna: 'Gerakan anggota tubuh yang dilakukan di tempat tanpa berpindah posisi.' },
      { istilah: 'Manipulatif', makna: 'Keterampilan gerak tubuh yang melibatkan manipulasi atau penguasaan terhadap suatu benda/bola.' },
      { istilah: 'Cooling Down', makna: 'Gerakan peregangan ringan setelah olahraga untuk menstabilkan kembali detak jantung dan suhu tubuh.' },
    ];
    kuisKilat = [
      {
        nomor: 1,
        pertanyaan: 'Sebutkan perbedaan antara gerak lokomotor dan manipulatif beserta contohnya!',
        jawaban: 'Lokomotor berpindah tempat (misal berlari), sedangkan manipulatif memainkan alat/bola (misal menendang bola).',
      },
      {
        nomor: 2,
        pertanyaan: 'Mengapa pemanasan (warming up) sangat penting sebelum memulai latihan inti olahraga?',
        jawaban: 'Untuk menaikkan suhu otot, melenturkan sendi, dan melancarkan aliran darah sehingga mencegah risiko cedera otot/kram.',
      },
    ];
  } else if (isSeniBudaya) {
    ringkasanSatuKalimat = `Mengeksplorasi unsur seni rupa, warna primer & sekunder, ritme musik, serta kreasi prakarya dari bahan alam/limbah pada materi "${rawTopik}".`;
    petaKonsep = [
      '1. Unsur-Unsur Dasar Seni Rupa',
      '2. Teori Warna Primer & Sekunder',
      '3. Ritme Musik & Pengenalan Alat Musik',
      '4. Langkah Berkarya Prakarya Ramah Lingkungan',
    ];
    poinUtama = [
      {
        judul: '1. Mengenal Unsur Seni Rupa & Harmoni Visual',
        penjelasan:
          'Setiap karya gambar, lukisan, dan patung tersusun dari unsur rupa dasar: titik, garis (lurus, lengkung, zigzag), bidang (persegi, lingkaran), bentuk, warna, tekstur (halus/kasar), dan gelap-terang.',
        analogi:
          'Unsur seni rupa itu seperti bahan bumbu masakan—jika dipadukan dengan takaran seimbang, akan menghasilkan karya yang indah dipandang!',
        poinKunci: [
          'Warna Primer (Warna Dasar): Merah, Kuning, dan Biru (warna yang tidak bisa dihasilkan dari campuran warna lain).',
          'Warna Sekunder: Merah + Kuning = Oranye/Jingga; Kuning + Biru = Hijau; Biru + Merah = Ungu.',
        ],
      },
      {
        judul: '2. Unsur Seni Musik: Irama, Melodi, & Birama',
        penjelasan:
          'Musik tercipta dari perpaduan bunyi yang teratur. Irama menentukan panjang pendeknya nada, sedangkan melodi adalah rangkaian nada yang indah.',
        poinKunci: [
          'Alat Musik Ritmis: alat musik pengatur tempo tanpa nada tangga lagu (misal: rebana, tamborin, gendang, marakas, drum).',
          'Alat Musik Melodis: alat musik yang menghasilkan nada berurutan (misal: pianika, rekorder, biola, gitar).',
        ],
      },
      {
        judul: '3. Prakarya & Kerajinan Ramah Lingkungan',
        penjelasan:
          'Membuat kerajinan melatih ketelitian tangan dan kepedulian terhadap kelestarian lingkungan.',
        poinKunci: [
          'Bahan Alam: daun kering, ranting pohon, pelepah pisang, biji-bijian, tanah liat.',
          'Bahan Daur Ulang: kardus bekas, tutup botol, koran, kain perca.',
          'Karya Kolase: menempelkan potongan berbagai bahan berbeda di atas pola gambar.',
        ],
      },
    ];
    glosarium = [
      { istilah: 'Warna Primer', makna: 'Warna pokok/dasar yang tidak dapat diperoleh dari percampuran warna lain (Merah, Kuning, Biru).' },
      { istilah: 'Warna Sekunder', makna: 'Warna yang dihasilkan dari pencampuran dua warna primer dengan proporsi seimbang.' },
      { istilah: 'Alat Musik Ritmis', makna: 'Alat musik yang berfungsi mengatur ketukan/irama dan tidak memiliki tangga nada pasti.' },
      { istilah: 'Kolase', makna: 'Karya seni dua dimensi yang dibuat dengan menempelkan berbagai paduan bahan pada permukaan pola.' },
    ];
    kuisKilat = [
      {
        nomor: 1,
        pertanyaan: 'Sebutkan 3 warna primer, dan warna apa yang dihasilkan jika warna kuning dicampur dengan warna biru?',
        jawaban: 'Warna primer adalah Merah, Kuning, dan Biru. Kuning + Biru menghasilkan warna Hijau (warna sekunder).',
      },
      {
        nomor: 2,
        pertanyaan: 'Jelaskan perbedaan antara alat musik ritmis dan melodis beserta contohnya!',
        jawaban: 'Alat musik ritmis tidak bernada dan mengatur tempo (misal gendang/tamborin), sedangkan alat musik melodis bernada dan memainkan melodi (misal pianika/rekorder).',
      },
    ];
  } else if (isEkonomiIPS || isSejarah) {
    ringkasanSatuKalimat = `Menganalisis kronologi peristiwa sejarah, prinsip pemenuhan kebutuhan manusia, skala prioritas, serta dinamika interaksi sosial di masyarakat.`;
    petaKonsep = [
      '1. Konsep Ruang, Waktu, & Kausalitas',
      '2. Kebutuhan Manusia & Skala Prioritas',
      '3. Kegiatan Ekonomi: Produksi, Distribusi, Konsumsi',
      '4. Interaksi Sosial & Pelestarian Kearifan Lokal',
    ];
    poinUtama = [
      {
        judul: '1. Manusia, Ruang, dan Waktu dalam Peristiwa Sejarah/Sosial',
        penjelasan:
          'Setiap peristiwa tidak terjadi begitu saja, melainkan memiliki latar belakang sebab-akibat (kausalitas) yang terikat pada ruang geografis dan urutan waktu (kronologi).',
        analogi:
          'Mempelajari sejarah dan IPS itu seperti menonton rekaman video perjalanan manusia—kita belajar dari keberhasilan dan kegagalan masa lalu agar masa depan lebih baik!',
        poinKunci: [
          'Berpikir Diakronik (Kronologis): menelusuri rentetan peristiwa secara memanjang dalam waktu.',
          'Berpikir Sinkronik: membedah kondisi sosial, ekonomi, dan politik secara mendalam pada suatu masa tertentu.',
        ],
      },
      {
        judul: '2. Kelangkaan, Skala Prioritas, & Biaya Peluang (Opportunity Cost)',
        penjelasan:
          'Kebutuhan manusia tidak terbatas sedangkan alat pemuas kebutuhan jumlahnya terbatas (Kelangkaan). Oleh karena itu, kita harus bijak menyusun skala prioritas.',
        poinKunci: [
          'Kebutuhan Primer: kebutuhan pokok yang harus dipenuhi (makanan bergizi, pakaian sekolah, tempat tinggal).',
          'Skala Prioritas: mendahulukan kebutuhan paling mendesak dan penting di atas keinginan sesaat.',
          'Biaya Peluang (Opportunity Cost): nilai manfaat dari satu alternatif terbaik yang terpaksa kita lepaskan saat mengambil keputusan.',
        ],
      },
      {
        judul: '3. 3 Kegiatan Ekonomi Pokok & Interaksi Sosial',
        penjelasan:
          'Kegiatan ekonomi menggerakkan roda kehidupan masyarakat melalui kerja sama yang saling menguntungkan.',
        poinKunci: [
          'Produksi: kegiatan menghasilkan atau menambah nilai guna barang/jasa (contoh: pabrik roti, petani sawah).',
          'Distribusi: kegiatan menyalurkan barang dari produsen ke konsumen (contoh: kurir, pedagang pasar).',
          'Konsumsi: kegiatan menghabiskan atau mengurangi nilai guna barang (contoh: makan nasi, memakai sepatu).',
        ],
      },
    ];
    glosarium = [
      { istilah: 'Kelangkaan (Scarcity)', makna: 'Kondisi di mana kebutuhan manusia tak terbatas sementara sumber daya/barang terbatas.' },
      { istilah: 'Skala Prioritas', makna: 'Urutan daftar kebutuhan yang disusun berdasarkan tingkat kepentingan yang paling mendesak.' },
      { istilah: 'Biaya Peluang', makna: 'Nilai dari satu alternatif terbaik yang dikorbankan ketika memilih suatu keputusan ekonomi.' },
      { istilah: 'Kronologi', makna: 'Penyusunan peristiwa sejarah berdasarkan urutan waktu terjadinya dari awal hingga akhir.' },
    ];
    kuisKilat = [
      {
        nomor: 1,
        pertanyaan: 'Sebutkan 3 macam kegiatan ekonomi utama dan berikan 1 contohnya di lingkungan sekitarmu!',
        jawaban: 'Produksi (misal petani menanam padi), Distribusi (misal pedagang menjual beras di pasar), dan Konsumsi (misal kita memasak dan memakan nasi).',
      },
      {
        nomor: 2,
        pertanyaan: 'Apa yang dimaksud dengan Biaya Peluang (Opportunity Cost)? Berikan contoh sederhana!',
        jawaban: 'Biaya peluang adalah nilai alternatif terbaik yang dikorbankan saat memilih suatu keputusan. Contohnya: jika memilih uang tabungan untuk membeli buku pelajaran, biaya peluangnya adalah tas baru yang tidak jadi dibeli.',
      },
    ];
  } else if (isInformatika || isPKK) {
    ringkasanSatuKalimat = `Menerapkan 4 pilar computational thinking, pemanfaatan teknologi yang aman, serta perancangan kewirausahaan berbasis perhitungan HPP & BEP.`;
    petaKonsep = [
      '1. 4 Pilar Berpikir Komputasional (CT)',
      '2. Perangkat Sistem (Hardware & Software)',
      '3. Etika Digital & Keamanan Data',
      '4. Perhitungan Bisnis: HPP, BEP, & Pemasaran',
    ];
    poinUtama = [
      {
        judul: '1. 4 Pilar Berpikir Komputasional (Computational Thinking)',
        penjelasan:
          'Berpikir komputasional adalah metode memecahkan masalah besar secara cerdas, runtut, dan terstruktur seperti cara kerja komputer.',
        poinKunci: [
          'Dekomposisi: memecah masalah besar menjadi bagian-bagian kecil yang lebih mudah dikerjakan.',
          'Pengenalan Pola: mencari kesamaan atau keteraturan dari masalah yang pernah diselesaikan.',
          'Abstraksi: memilah informasi penting dan mengabaikan detail-detail yang tidak relevan.',
          'Algoritma: menyusun langkah-langkah kerja logis berurutan dari awal sampai akhir.',
        ],
      },
      {
        judul: '2. Perhitungan Bisnis Kreatif: HPP & Titik Impas (BEP)',
        penjelasan:
          'Dalam berwirausaha, keberhasilan ditentukan oleh perencanaan keuangan yang cermat dan pemisahan biaya secara disiplin.',
        poinKunci: [
          'Biaya Tetap (Fixed Cost): biaya yang besarnya tetap terlepas dari jumlah produksi (misal sewa alat).',
          'Biaya Variabel (Variable Cost): biaya yang bertambah seiring bertambahnya unit produk (misal bahan baku).',
          'Titik Impas (BEP): kondisi di mana usaha tidak untung dan tidak rugi (Total Pendapatan = Total Biaya).',
        ],
      },
      {
        judul: '3. Budaya Kerja 5R & Etika Digital (Cyber Safety)',
        penjelasan:
          'Pelajar harus cerdas dan beretika dalam menggunakan internet serta menerapkan budaya kerja industri yang rapi.',
        poinKunci: [
          'Budaya 5R: Ringkas, Rapi, Resik, Rawat, dan Rajin.',
          'Keamanan Digital: menjaga kerahasiaan kata sandi (password), tidak menyebarkan data pribadi, dan anti-hoaks.',
        ],
      },
    ];
    glosarium = [
      { istilah: 'Dekomposisi', makna: 'Proses memecah masalah kompleks menjadi sub-masalah yang lebih sederhana dan terkelola.' },
      { istilah: 'Algoritma', makna: 'Urutan langkah logis yang sistematis untuk menyelesaikan suatu masalah atau instruksi program.' },
      { istilah: 'HPP (Harga Pokok Produksi)', makna: 'Seluruh akumulasi biaya yang dikeluarkan untuk memproduksi suatu produk.' },
      { istilah: 'BEP (Break Even Point)', makna: 'Titik impas di mana modal yang dikeluarkan sama dengan total pendapatan penjualan.' },
    ];
    kuisKilat = [
      {
        nomor: 1,
        pertanyaan: 'Sebutkan 4 pilar dalam Berpikir Komputasional (Computational Thinking)!',
        jawaban: '1) Dekomposisi, 2) Pengenalan Pola, 3) Abstraksi, dan 4) Perancangan Algoritma.',
      },
      {
        nomor: 2,
        pertanyaan: 'Apa rumus untuk menghitung Titik Impas dalam satuan unit (BEP Unit)?',
        jawaban: 'BEP Unit = Biaya Tetap (Fixed Cost) / (Harga Jual per Unit - Biaya Variabel per Unit).',
      },
    ];
  } else {
    // FALLBACK CERDAS & SUBSTANTIF UNTUK TOPIK UMUM LAINNYA
    ringkasanSatuKalimat = `Membedah konsep inti, kaidah/karakteristik penting, serta studi kasus penerapan materi "${rawTopik}" pada mata pelajaran ${req.mataPelajaran}.`;
    petaKonsep = [
      `1. Pengertian Inti & Karakteristik ${rawTopik}`,
      '2. Komponen, Kaidah, & Prinsip Kerja',
      '3. Contoh Penerapan dalam Kehidupan Sehari-hari',
      '4. Kesimpulan Penting & Tips Ujian',
    ];
    poinUtama = [
      {
        judul: `1. Pemahaman Inti Mengenai ${rawTopik}`,
        penjelasan: `Materi "${rawTopik}" pada mata pelajaran ${req.mataPelajaran} membahas bagaimana komponen-komponen utama saling terhubung dalam menyelesaikan tantangan nyata. Memahami definisi serta fungsi tiap bagian adalah kunci keberhasilan belajar.`,
        analogi:
          'Mempelajari materi ini seperti menyusun kepingan puzzle—setiap konsep memiliki tempatnya masing-masing dan jika dipadukan dengan cermat akan membentuk gambar utuh yang indah!',
        poinKunci: [
          `Mengenali definisi operasional dan ciri-ciri pembeda dari materi ${rawTopik}.`,
          'Mengetahui peran serta manfaat konsep ini bagi diri sendiri dan masyarakat sekitar.',
        ],
      },
      {
        judul: '2. Kaidah, Komponen, dan Mekanisme Kerja',
        penjelasan:
          'Setiap materi memiliki prinsip dasar yang harus dipatuhi agar penerapannya tepat sasaran, aman, dan menghasilkan standar mutu yang optimal.',
        poinKunci: [
          'Memahami langkah kerja bertahap secara sistematis dari persiapan hingga evaluasi akhir.',
          'Menganalisis hubungan sebab-akibat jika salah satu komponen atau aturan tidak diterapkan.',
        ],
      },
      {
        judul: '3. Penerapan Praktis dan Solusi Kontekstual',
        penjelasan:
          'Pembelajaran masa kini menekankan kemampuan siswa untuk menghubungkan teori yang dipelajari di kelas dengan pemecahan masalah di dunia nyata.',
        poinKunci: [
          'Menerapkan ketelitian, sikap bertanggung jawab, dan kejujuran dalam mempraktikkan konsep.',
          'Mampu mengevaluasi hasil kerja serta merumuskan langkah perbaikan secara kreatif.',
        ],
      },
    ];
    tipsUjian = [
      `🎯 Baca dengan teliti kata kunci pada pertanyaan soal tentang ${rawTopik} sebelum menentukan jawaban!`,
      '🎯 Pahami contoh kasus dan definisi istilah pada Glosarium agar tidak keliru membedakan konsep.',
    ];
    faktaMenarik = [
      `Tahukah Kamu? Mengaitkan konsep "${rawTopik}" dengan contoh nyata di lingkungan terbukti memperkuat ingatan memori jangka panjang hingga 2 kali lipat!`,
    ];
    glosarium = [
      { istilah: rawTopik, makna: `Topik pembelajaran utama pada mata pelajaran ${req.mataPelajaran} Kelas ${req.kelas}.` },
      { istilah: 'Kaidah Konseptual', makna: 'Aturan baku atau prinsip dasar yang menjadi pedoman dalam menerapkan materi pelajaran.' },
      { istilah: 'Penerapan Kontekstual', makna: 'Kemampuan menerapkan ilmu pelajaran pada situasi nyata dalam kehidupan sehari-hari.' },
    ];
    kuisKilat = [
      {
        nomor: 1,
        pertanyaan: `Jelaskan secara ringkas pengertian dan manfaat utama dari materi "${rawTopik}"!`,
        jawaban: `Materi ${rawTopik} mengajarkan prinsip dasar dan cara penerapannya agar siswa terampil memecahkan masalah nyata secara terukur dan bertanggung jawab.`,
      },
      {
        nomor: 2,
        pertanyaan: `Berikan 1 contoh penerapan materi "${rawTopik}" di lingkungan sekolah atau masyarakat!`,
        jawaban: contohKonkret.bedahAnalisis[0]?.replace('✅ ', '') || `Menerapkan kaidah ${rawTopik} dengan disiplin dan teliti.`,
      },
    ];
  }

  return {
    id,
    createdAt,
    judul: `📘 Rangkuman Cerdas ${req.mataPelajaran}: ${rawTopik} (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    topik: rawTopik,
    sumberAsal: req.modeInput,
    gayaBahasa: req.gayaBahasa,
    ringkasanSatuKalimat,
    petaKonsep,
    rumusAtauPola,
    poinUtama,
    contohKonkret,
    tipsUjian,
    faktaMenarik,
    glosarium,
    kuisKilat,
    pesanInspirasi,
  };
}

// ============================================================================
// 6. ENGINE EKSTRAKSI DARI TEKS UPLOAD DOKUMEN GURU (Lebih Bersih & Terstruktur)
// ============================================================================
export function buildRangkumanFromUploadedText(
  req: RangkumanRequest,
  id: string,
  createdAt: string,
  noteTag?: string
): RangkumanDokumen {
  const rawText = (req.teksUpload || '').trim();
  const lines = rawText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Deteksi judul bersih dari baris pertama (jika pendek) atau nama file
  let inferredTitle = cleanTopicTitle(req.topik || '');
  if (!inferredTitle && req.namaFile) {
    inferredTitle = req.namaFile.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
  }
  if (!inferredTitle && lines.length > 0) {
    const firstLine = lines[0].replace(/^[#*-\d.)\s]+/, '').trim();
    inferredTitle = firstLine.length <= 75 ? firstLine : firstLine.slice(0, 70) + '...';
  }
  if (!inferredTitle) {
    inferredTitle = `Materi ${req.mataPelajaran}`;
  }

  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 20);

  const sentences = rawText
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const sourceChunks = paragraphs.length >= 2 ? paragraphs : sentences;
  const mainPoints: PoinRangkuman[] = [];
  const maxPoints = Math.min(4, Math.max(2, sourceChunks.length));

  for (let i = 0; i < maxPoints; i++) {
    const chunk = sourceChunks[i] || sentences[i] || rawText.slice(0, 250);
    const chunkSentences = chunk
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    // Buat subjudul yang informatif dari kalimat pertama chunk
    const firstSent = chunkSentences[0] || chunk;
    const words = firstSent.replace(/^[\d.)•*-]+\s*/, '').split(/\s+/);
    const shortHeading =
      words.length <= 7 ? words.join(' ') : words.slice(0, 7).join(' ') + '...';

    mainPoints.push({
      judul: `${i + 1}. ${shortHeading}`,
      penjelasan: firstSent,
      poinKunci:
        chunkSentences.slice(1, 4).length > 0
          ? chunkSentences.slice(1, 4)
          : [chunk.slice(0, 180)],
    });
  }

  // Ekstrak istilah penting yang mengandung pola "adalah", "merupakan", atau ":"
  const extractedGlossary: IstilahGlosarium[] = [];
  for (const s of sentences) {
    const match = s.match(/^([A-Za-z0-9\s()-]{3,35})\s+(?:adalah|merupakan|ialah|:)\s+(.{15,140})/i);
    if (match && extractedGlossary.length < 4) {
      extractedGlossary.push({
        istilah: match[1].trim(),
        makna: match[2].trim(),
      });
    }
  }
  if (extractedGlossary.length === 0) {
    extractedGlossary.push({
      istilah: inferredTitle,
      makna: sentences[0] || `Konsep pokok yang dibahas dalam bahan ajar ${req.mataPelajaran}.`,
    });
  }

  const jenjangLabel = getJenjangLabel(req);

  return {
    id,
    createdAt,
    judul: `📑 Rangkuman Materi: ${inferredTitle} (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    topik: inferredTitle,
    sumberAsal: 'upload',
    gayaBahasa: req.gayaBahasa,
    ringkasanSatuKalimat:
      sentences[0] ||
      `Rangkuman terstruktur dari materi "${inferredTitle}" untuk memudahkan pemahaman siswa Kelas ${req.kelas}.`,
    petaKonsep: mainPoints.map((mp) => mp.judul),
    rumusAtauPola: [
      {
        label: 'Pokok Bahasan Utama Dokumen',
        isi: sentences.slice(0, 2).join(' ') || `Membahas konsep inti ${inferredTitle}.`,
      },
    ],
    poinUtama: mainPoints,
    contohKonkret: {
      judulContoh: 'Kutipan Inti & Analisis Materi Sumber',
      teksContoh: (paragraphs.slice(0, 2).join('\n\n') || rawText).slice(0, 650),
      bedahAnalisis: [
        '✅ Disarikan langsung dari dokumen/catatan materi yang diunggah oleh Bapak/Ibu Guru.',
        `✅ Disesuaikan untuk pembelajaran ${req.mataPelajaran} Kelas ${req.kelas} (${jenjangLabel}).`,
      ],
    },
    tipsUjian: [
      `🎯 Pelajari kembali poin-poin kunci pada setiap bagian "${inferredTitle}" dan pahami definisi istilah pada tabel Glosarium.`,
    ],
    faktaMenarik: [
      sentences[sentences.length - 1] ||
        `Materi ${inferredTitle} merangkum poin-poin esensial yang wajib dikuasai siswa sebelum evaluasi.`,
    ],
    glosarium: extractedGlossary,
    kuisKilat: mainPoints.slice(0, 2).map((mp, idx) => ({
      nomor: idx + 1,
      pertanyaan: `Jelaskan poin penting dari bagian "${mp.judul.replace(/^\d+\.\s*/, '')}"!`,
      jawaban: mp.penjelasan,
    })),
    pesanInspirasi:
      'Membaca rangkuman secara terstruktur membantu ingatan bertahan jauh lebih lama. Semangat belajar! 🌟',
  };
}
