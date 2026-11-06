import type { RangkumanRequest, RangkumanDokumen } from '../../types/summary';
import { getJenjangLabel, isSDGrade } from './helpers';

// ============================================================================
// 4. ENGINE KHUSUS IPA / IPAS / FISIKA / KIMIA / BIOLOGI
// ============================================================================
export function buildScienceTopicRangkuman(
  req: RangkumanRequest,
  rawTopik: string,
  lowerTopik: string,
  id: string,
  createdAt: string,
  noteTag?: string
): RangkumanDokumen {
  const jenjangLabel = getJenjangLabel(req);
  const lowerMapel = req.mataPelajaran.toLowerCase();
  const isSD = isSDGrade(req);
  const isFisika = lowerMapel.includes('fisika') || lowerTopik.includes('newton') || lowerTopik.includes('usaha') || lowerTopik.includes('listrik');
  const isKimia = lowerMapel.includes('kimia') || lowerTopik.includes('atom') || lowerTopik.includes('ikatan') || lowerTopik.includes('stoikiometri') || lowerTopik.includes('asam');

  // A. KHUSUS JENJANG SD (Kelas 1-6): Bahasa Hangat, Konsep Nyata, Tanpa Jargon Rumit
  if (isSD) {
    return {
      id,
      createdAt,
      judul: `🔬 Rangkuman Seru IPAS: ${rawTopik} (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
      mataPelajaran: req.mataPelajaran,
      jenjangFase: req.jenjangFase,
      kelas: req.kelas,
      topik: rawTopik,
      sumberAsal: req.modeInput,
      gayaBahasa: req.gayaBahasa,
      ringkasanSatuKalimat: `Mengenal rahasia alam, bagian tubuh makhluk hidup, wujud benda, serta energi di sekitar kita lewat pengamatan seru tentang "${rawTopik}".`,
      petaKonsep: [
        '1. Benda & Makhluk Hidup di Sekitar Kita',
        '2. Cara Kerja / Perubahan yang Terjadi',
        '3. Contoh Nyata dalam Kehidupan Sehari-hari',
        '4. Menjaga Alam & Rasa Syukur',
      ],
      rumusAtauPola: [
        {
          label: 'Perubahan Wujud Benda yang Sering Dijumpai',
          isi: 'Mencair (Padat → Cair, contoh: es batu meleleh) | Membeku (Cair → Padat, contoh: air jadi es) | Menguap (Cair → Gas, contoh: air mendidih) | Mengembun (Gas → Cair, contoh: embun di daun pagi hari).',
        },
        {
          label: 'Kebutuhan Tumbuhan & Rantai Makanan Sederhana',
          isi: 'Tumbuhan butuh: Air + Karbon Dioksida + Sinar Matahari + Klorofil untuk membuat makanan (Fotosintesis) | Rantai Makanan: Padi (Produsen) dimakan Belalang (Konsumen 1) dimakan Katak (Konsumen 2).',
        },
        {
          label: 'Macam-Macam Gaya Sederhana',
          isi: 'Gaya Otot (mengayuh sepeda/mendorong meja) | Gaya Gesek (rem sepeda/sepatu di lantai) | Gaya Magnet (menarik paku) | Gaya Gravitasi (buah jatuh ke bawah).',
        },
      ],
      poinUtama: [
        {
          judul: `1. Rahasia Menarik tentang ${rawTopik}`,
          penjelasan: `Alam di sekitar kita bekerja dengan sangat teratur. Saat mempelajari materi "${rawTopik}", kita diajak mengamati ciri-ciri benda atau makhluk hidup menggunakan panca indera kita secara teliti.`,
          analogi:
            'Mengamati sains itu seperti menjadi detektif cilik—kita mencari petunjuk dari apa yang kita lihat, dengar, dan sentuh di alam!',
          poinKunci: [
            'Mengenali ciri fisik, wujud, atau bagian utama dari objek yang kita amati.',
            'Mengetahui fungsi dan manfaat ciptaan Tuhan tersebut bagi kehidupan manusia dan bumi.',
          ],
        },
        {
          judul: '2. Bagaimana Proses atau Perubahannya Terjadi?',
          penjelasan:
            'Benda dan makhluk hidup selalu mengalami perubahan alami jika diberi pengaruh luar, misalnya dipanaskan, didinginkan, diberi tarikan, atau dorongan.',
          poinKunci: [
            'Benda padat memiliki bentuk tetap, benda cair bentuknya mengikuti wadah, dan benda gas mengisi seluruh ruangan.',
            'Gaya dorong dan gaya tarik dapat membuat benda diam menjadi bergerak atau berubah arah geraknya.',
          ],
        },
        {
          judul: '3. Manfaat Nyata dan Cara Kita Menjaga Alam',
          penjelasan:
            'Semua ilmu sains mengajarkan kita untuk hidup rukun dengan alam, tidak membuang sampah sembarangan, serta menghemat penggunaan air dan listrik setiap hari.',
          poinKunci: [
            'Mematikan lampu dan kran air saat tidak digunakan untuk menghemat energi.',
            'Menyayangi hewan dan merawat tanaman di sekitar rumah agar lingkungan tetap asri dan sejuk.',
          ],
        },
      ],
      contohKonkret: {
        judulContoh: `Pengamatan Nyata di Rumah: ${rawTopik}`,
        teksContoh: `Saat Siti membantu Ibu merebus air di dapur, Siti melihat tutup panci bagian dalam dipenuhi oleh tetesan-tetesan air bersih.\n\nPenjelasan Sains:\nAir di dalam panci yang dipanaskan berubah wujud menjadi uap air (Menguap / Cair ke Gas). Ketika uap panas menyentuh tutup panci yang lebih dingin, uap air tersebut berubah kembali menjadi butiran air (Mengembun / Gas ke Cair). Ini membuktikan bahwa wujud zat dapat berubah bolak-balik karena suhu!`,
        bedahAnalisis: [
          '✅ Mudah Diamati di Rumah: Menghubungkan pelajaran buku dengan pengalaman nyata di dapur.',
          '✅ Melatih Bernalar Kritis: Memahami alasan ilmiah di balik fenomena alam sehari-hari.',
        ],
      },
      tipsUjian: [
        '🎯 Trik Cepat Perubahan Wujud: Jika dipanaskan (kena api/matahari) = Mencair atau Menguap. Jika didinginkan (kena es/udara dingin) = Membeku atau Mengembun!',
      ],
      faktaMenarik: [
        'Tahukah Kamu? Air yang kita minum hari ini adalah air yang sama yang terus berputar di bumi melalui siklus air sejak jutaan tahun lalu!',
      ],
      glosarium: [
        { istilah: 'Mencair', makna: 'Perubahan wujud benda dari padat menjadi cair karena menerima panas.' },
        { istilah: 'Membeku', makna: 'Perubahan wujud benda dari cair menjadi padat karena pelepasan panas/didinginkan.' },
        { istilah: 'Fotosintesis', makna: 'Proses tumbuhan hijau memasak makanannya sendiri menggunakan bantuan sinar matahari dan klorofil.' },
        { istilah: 'Gaya Otot', makna: 'Gaya tarikan atau dorongan yang dihasilkan oleh otot tubuh manusia atau hewan.' },
      ],
      kuisKilat: [
        {
          nomor: 1,
          pertanyaan: 'Peristiwa es batu yang diletakkan di tempat terbuka berubah menjadi air disebut perubahan wujud ....',
          jawaban: 'Mencair (karena es batu menyerap panas dari udara di sekitarnya).',
        },
        {
          nomor: 2,
          pertanyaan: 'Sebutkan 3 bagian penting dari tumbuhan beserta tugas utamanya!',
          jawaban: 'Akar (menyerap air & mineral dari tanah), Batang (menopang dan mengalirkan air), dan Daun (tempat memasak makanan/fotosintesis).',
        },
      ],
      pesanInspirasi:
        'Sains itu sangat seru dan ada di mana-mana! Jadilah anak yang rajin mengamati dan mencintai lingkungan sekitar. Tetap semangat! 🌿🔬✨',
    };
  }

  // B. JENJANG SMP & SMA/SMK
  return {
    id,
    createdAt,
    judul: `🔬 Rangkuman Sains (${req.mataPelajaran}): ${rawTopik} (${jenjangLabel} Kelas ${req.kelas}) ${noteTag || ''}`.trim(),
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    topik: rawTopik,
    sumberAsal: req.modeInput,
    gayaBahasa: req.gayaBahasa,
    ringkasanSatuKalimat: `Memahami mekanisme ilmiah, hukum/persamaan sains, serta penerapan nyata materi "${rawTopik}" pada kehidupan dan teknologi sehari-hari.`,
    petaKonsep: [
      '1. Fenomena Alam & Konsep Dasar',
      '2. Komponen / Besaran & Hukum Ilmiah',
      '3. Mekanisme Proses & Sebab-Akibat',
      '4. Contoh Kasus / Perhitungan Sains',
    ],
    rumusAtauPola: isFisika
      ? [
          {
            label: 'Hukum Newton & Dinamika Gerak',
            isi: 'Hukum I (Kelembaman): ΣF = 0 | Hukum II (Percepatan): ΣF = m × a (F dalam Newton, m dalam kg, a dalam m/s²) | Hukum III (Aksi-Reaksi): F_aksi = -F_reaksi.',
          },
          {
            label: 'Usaha, Energi & Daya',
            isi: 'Usaha: W = F × s | Energi Kinetik: Ek = ½mv² | Energi Potensial: Ep = m × g × h | Hukum Kekekalan Energi Mekanik: Em₁ = Em₂.',
          },
        ]
      : isKimia
      ? [
          {
            label: 'Struktur Atom & Notasi Unsur (ᴬ_Z X)',
            isi: 'Nomor Atom (Z) = Jumlah Proton = Jumlah Elektron (pada atom netral) | Nomor Massa (A) = Proton + Neutron → Neutron = A - Z.',
          },
          {
            label: 'Konsep Mol & Stoikiometri Dasar',
            isi: 'mol (n) = massa (gram) / Mr  |  Molaritas (M) = n / Volume (Liter)  |  Volume STP = n × 22,4 Liter.',
          },
        ]
      : [
          {
            label: 'Reaksi Fotosintesis & Respirasi Seluler',
            isi: 'Fotosintesis (di Kloroplas): 6CO₂ + 6H₂O + Cahaya Matahari → C₆H₁₂O₆ (Glukosa) + 6O₂ | Rantai Makanan: Produsen → Konsumen I → Konsumen II → Dekomposer.',
          },
          {
            label: 'Keseimbangan Sistem & Metode Ilmiah',
            isi: 'Observasi Masalah → Hipotesis → Eksperimen Terkontrol (Variabel Bebas, Terikat, Kontrol) → Analisis Data → Kesimpulan.',
          },
        ],
    poinUtama: [
      {
        judul: `1. Konsep Dasar & Fenomena Ilmiah (${rawTopik})`,
        penjelasan: `Setiap fenomena pada materi ${rawTopik} bekerja mengikuti hukum alam yang teratur. Memahami hubungan antara struktur komponen dan fungsinya adalah kunci utama menguasai sains.`,
        analogi:
          'Sistem alam dan tubuh makhluk hidup bekerja seperti mesin jam tangan yang sangat presisi—setiap roda gigi saling menggerakkan satu sama lain!',
        poinKunci: [
          'Identifikasi komponen utama atau besaran fisika/kimia/biologi yang terlibat dalam sistem.',
          'Pahami satuan internasional (SI) atau indikator perubahan yang dapat diamati.',
        ],
      },
      {
        judul: '2. Mekanisme Proses & Hubungan Sebab-Akibat',
        penjelasan:
          'Dalam sains, perubahan satu variabel (variabel bebas) akan memengaruhi hasil akhir sistem (variabel terikat) secara terukur.',
        poinKunci: [
          'Variabel Bebas: Faktor yang sengaja diubah atau divariasikan oleh peneliti dalam percobaan.',
          'Variabel Terikat: Hasil yang diukur atau diamati akibat perubahan variabel bebas.',
          'Variabel Kontrol: Faktor yang dibuat tetap sama agar hasil eksperimen adil dan valid.',
        ],
      },
      {
        judul: '3. Aplikasi Teknologi & Pelestarian Lingkungan',
        penjelasan: `Penguasaan konsep ${rawTopik} dimanfaatkan manusia untuk menciptakan inovasi teknologi sekaligus menjaga keberlanjutan ekosistem bumi.`,
        poinKunci: [
          'Menghubungkan teori di kelas dengan fenomena nyata di rumah, industri, dan alam sekitar.',
          'Menerapkan prinsip keselamatan kerja laboratorium dan kepedulian lingkungan.',
        ],
      },
    ],
    contohKonkret: {
      judulContoh: isFisika
        ? 'Contoh Kasus Perhitungan Fisika & Analisis Konsep'
        : isKimia
        ? 'Contoh Analisis Struktur Atom / Reaksi Kimia'
        : `Contoh Analisis Fenomena Sains: ${rawTopik}`,
      teksContoh: isFisika
        ? `Kasus: Sebuah balok bermassa 5 kg berada di atas lantai licin dan ditarik dengan gaya mendatar sebesar 20 Newton selama 4 detik dari keadaan diam.\n\nAnalisis & Penyelesaian:\n1) Diketahui: m = 5 kg, F = 20 N, v₀ = 0 m/s, t = 4 s.\n2) Percepatan balok (Hukum II Newton): a = F / m = 20 N / 5 kg = 4 m/s².\n3) Kecepatan balok saat t = 4 detik: vₜ = v₀ + a×t = 0 + (4 × 4) = 16 m/s.\n4) Energi Kinetik saat t = 4 detik: Ek = ½ × m × v² = ½ × 5 × (16)² = 2,5 × 256 = 640 Joule.`
        : isKimia
        ? `Kasus: Unsur Natrium memiliki lambang notasi ²³₁₁Na, sedangkan unsur Klorin memiliki lambang ³⁵₁₇Cl.\n\nAnalisis Kimia:\n1) Atom ²³₁₁Na memiliki 11 proton, 11 elektron, dan neutron = 23 - 11 = 12 neutron. Konfigurasi elektronnya (2, 8, 1) sehingga cenderung melepas 1 elektron valensi membentuk ion positif Na⁺.\n2) Atom ³⁵₁₇Cl memiliki 17 elektron dengan konfigurasi (2, 8, 7) sehingga cenderung menangkap 1 elektron membentuk ion negatif Cl⁻.\n3) Keduanya berikatan melalui serah-terima elektron (Ikatan Ionik) membentuk senyawa garam dapur (NaCl) yang stabil sesuai kaidah oktet.`
        : `Kasus Ekosistem Sawah: Di sebuah ekosistem sawah terdapat tanaman padi, belalang, katak, ular sawah, burung elang, dan jamur pengurai.\n\nAnalisis Sains:\n1) Alur Rantai Makanan: Padi (Produsen/Autotrof) → Belalang (Konsumen I/Herbivora) → Katak (Konsumen II/Karnivora) → Ular Sawah (Konsumen III) → Elang (Konsumen Puncak).\n2) Dampak Perubahan Populasi: Jika populasi katak menurun drastis akibat perburuan, maka populasi belalang akan melonjak tajam (karena predatornya berkurang) sehingga hasil panen padi petani menurun.`,
      bedahAnalisis: [
        '✅ Berbasis Data & Kaidah Ilmiah: Menggunakan hukum sains yang teruji untuk menjelaskan hubungan sebab-akibat.',
        '✅ Mudah Diterapkan di Ujian: Melatih penalaran analitis (C4) saat menghadapi soal studi kasus maupun grafik eksperimen.',
      ],
    },
    tipsUjian: [
      '🎯 Ingat cara membedakan Variabel Bebas vs Terikat: "Pengaruh [Variabel Bebas] terhadap [Variabel Terikat]". Kata setelah "Pengaruh" adalah Variabel Bebas, dan kata setelah "terhadap" adalah Variabel Terikat!',
    ],
    faktaMenarik: [
      'Tahukah Kamu? Setiap kali kamu mengayuh sepeda, bernapas, atau menyalakan ponsel pintar, puluhan hukum fisika, reaksi kimia baterai, dan metabolisme biologi bekerja secara serentak dalam hitungan milidetik!',
    ],
    glosarium: [
      { istilah: 'Hipotesis', makna: 'Dugaan ilmiah sementara terhadap suatu masalah yang harus dibuktikan melalui eksperimen.' },
      { istilah: 'Variabel Bebas', makna: 'Faktor perlakuan yang sengaja diubah-ubah untuk melihat pengaruhnya.' },
      { istilah: 'Variabel Terikat', makna: 'Faktor hasil yang diukur sebagai dampak dari perubahan variabel bebas.' },
    ],
    kuisKilat: [
      {
        nomor: 1,
        pertanyaan: 'Pada judul penelitian "Pengaruh Intensitas Cahaya terhadap Kecepatan Tumbuh Kecambah", manakah variabel bebas dan variabel terikatnya?',
        jawaban: 'Variabel Bebas = Intensitas Cahaya; Variabel Terikat = Kecepatan Tumbuh Kecambah.',
      },
      {
        nomor: 2,
        pertanyaan: `Apa manfaat utama mempelajari konsep ${rawTopik} dalam kehidupan sehari-hari?`,
        jawaban: 'Membantu kita memahami cara kerja fenomena alam secara rasional serta memanfaatkannya untuk solusi kesehatan, energi, dan lingkungan.',
      },
    ],
    pesanInspirasi:
      'Sains dimulai dari rasa ingin tahu. Teruslah bertanya "Mengapa" dan "Bagaimana" terhadap alam semesta di sekitarmu! 🔬🌟',
  };
}
