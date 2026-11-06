import type { JenjangFase } from '../types/assessment';
import type { CustomTPItem } from './schoolProfileStorage';

export type JenjangKategori = 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK';

export interface JenjangConfig {
  id: JenjangKategori;
  label: string;
  subLabel: string;
  kelasList: { kelas: string; fase: JenjangFase }[];
  mapelUmum: string[];
  mapelMadrasah: string[];
}

export const KURIKULUM_CATALOG: Record<JenjangKategori, {
  id: JenjangKategori;
  label: string;
  subLabel: string;
  kelasList: { kelas: string; fase: JenjangFase }[];
  mapelUmum: string[];
  mapelMadrasah: string[];
}> = {
  'SD/MI': {
    id: 'SD/MI',
    label: 'SD / MI',
    subLabel: 'Fase A, B, C (Kelas 1–6)',
    kelasList: [
      { kelas: '1', fase: 'Fase A (Kelas 1-2 SD)' },
      { kelas: '2', fase: 'Fase A (Kelas 1-2 SD)' },
      { kelas: '3', fase: 'Fase B (Kelas 3-4 SD)' },
      { kelas: '4', fase: 'Fase B (Kelas 3-4 SD)' },
      { kelas: '5', fase: 'Fase C (Kelas 5-6 SD)' },
      { kelas: '6', fase: 'Fase C (Kelas 5-6 SD)' },
    ],
    mapelUmum: [
      'Matematika',
      'Bahasa Indonesia',
      'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
      'Pendidikan Pancasila',
      'Bahasa Inggris',
      'SENI dan Budaya',
      'PJOK',
      'Pendidikan Agama Islam & Budi Pekerti',
    ],
    mapelMadrasah: [
      'Al-Qur\'an Hadis (MI)',
      'Akidah Akhlak (MI)',
      'Fikih (MI)',
      'Sejarah Kebudayaan Islam / SKI (MI)',
      'Bahasa Arab (MI)',
    ],
  },
  'SMP/MTs': {
    id: 'SMP/MTs',
    label: 'SMP / MTs',
    subLabel: 'Fase D (Kelas 7–9)',
    kelasList: [
      { kelas: '7', fase: 'Fase D (Kelas 7-9 SMP)' },
      { kelas: '8', fase: 'Fase D (Kelas 7-9 SMP)' },
      { kelas: '9', fase: 'Fase D (Kelas 7-9 SMP)' },
    ],
    mapelUmum: [
      'Matematika',
      'Bahasa Indonesia',
      'IPA (Ilmu Pengetahuan Alam)',
      'IPS (Ilmu Pengetahuan Sosial)',
      'Bahasa Inggris',
      'Pendidikan Pancasila',
      'Informatika',
      'PJOK',
      'Seni Budaya / Prakarya',
      'Pendidikan Agama Islam & Budi Pekerti',
    ],
    mapelMadrasah: [
      'Al-Qur\'an Hadis (MTs)',
      'Akidah Akhlak (MTs)',
      'Fikih (MTs)',
      'Sejarah Kebudayaan Islam / SKI (MTs)',
      'Bahasa Arab (MTs)',
    ],
  },
  'SMA/MA': {
    id: 'SMA/MA',
    label: 'SMA / MA',
    subLabel: 'Fase E & F (Kelas 10–12)',
    kelasList: [
      { kelas: '10', fase: 'Fase E (Kelas 10 SMA/SMK)' },
      { kelas: '11', fase: 'Fase F (Kelas 11-12 SMA/SMK)' },
      { kelas: '12', fase: 'Fase F (Kelas 11-12 SMA/SMK)' },
    ],
    mapelUmum: [
      'Matematika',
      'Bahasa Indonesia',
      'Bahasa Inggris',
      'Fisika',
      'Kimia',
      'Biologi',
      'Ekonomi',
      'Sosiologi',
      'Geografi',
      'Sejarah',
      'Pendidikan Pancasila',
      'Informatika',
    ],
    mapelMadrasah: [
      'Al-Qur\'an Hadis (MA)',
      'Akidah Akhlak (MA)',
      'Fikih / Ushul Fikih (MA)',
      'Sejarah Kebudayaan Islam / SKI (MA)',
      'Bahasa Arab (MA)',
    ],
  },
  'SMK': {
    id: 'SMK',
    label: 'SMK / MAK',
    subLabel: 'Fase E & F (Kejuruan 10–12)',
    kelasList: [
      { kelas: '10', fase: 'Fase E (Kelas 10 SMA/SMK)' },
      { kelas: '11', fase: 'Fase F (Kelas 11-12 SMA/SMK)' },
      { kelas: '12', fase: 'Fase F (Kelas 11-12 SMA/SMK)' },
    ],
    mapelUmum: [
      'Matematika Kejuruan',
      'Bahasa Indonesia',
      'Bahasa Inggris Profesi',
      'Projek IPAS (SMK)',
      'Informatika / Dasar Kejuruan',
      'Produk Kreatif dan Kewirausahaan (PKK)',
      'Pendidikan Pancasila',
      'Sejarah',
    ],
    mapelMadrasah: [
      'Pendidikan Agama Islam & Budi Pekerti',
      'Bahasa Arab Kejuruan',
    ],
  },
};

export function detectKategoriFromFase(fase: JenjangFase, mataPelajaran?: string): JenjangKategori {
  if (fase.includes('SD')) return 'SD/MI';
  if (fase.includes('SMP')) return 'SMP/MTs';
  if (mataPelajaran) {
    const lower = mataPelajaran.toLowerCase();
    if (
      lower.includes('kejuruan') ||
      lower.includes('profesi') ||
      lower.includes('pkk') ||
      lower.includes('projek ipas') ||
      lower.includes('smk')
    ) {
      return 'SMK';
    }
  }
  return 'SMA/MA';
}

export interface TopicSuggestion {
  topik: string;
  arahanRangkuman: string;
  tujuanPembelajaran: string;
}

/**
 * Menghasilkan daftar rekomendasi topik, arahan rangkuman, dan TP
 * secara otomatis berdasarkan Mata Pelajaran, Jenjang Fase, dan Kelas.
 */
export function getSuggestedTopics(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  _kelas: string
): TopicSuggestion[] {
  const lowerMapel = mataPelajaran.toLowerCase();
  const isSD = jenjangFase.includes('SD');
  const isSMP = jenjangFase.includes('SMP');
  const isSMK = lowerMapel.includes('kejuruan') || lowerMapel.includes('profesi') || lowerMapel.includes('pkk') || lowerMapel.includes('projek ipas');

  // 1. BAHASA INGGRIS
  if (lowerMapel.includes('inggris')) {
    if (isSD) {
      return [
        {
          topik: 'Describing People, Animals & My Classroom',
          arahanRangkuman: 'Sertakan kosakata sifat dasar (big, small, clean, friendly), contoh kalimat Simple Present (It is..., She has...), dan gambar ilustrasi kata.',
          tujuanPembelajaran: 'Peserta didik mampu mendeskripsikan benda di kelas, hewan peliharaan, dan anggota keluarga dengan kalimat bahasa Inggris sederhana.',
        },
        {
          topik: 'Daily Activities & Telling the Time',
          arahanRangkuman: 'Rangkum kosakata kegiatan sehari-hari dari bangun tidur hingga malam disertai cara membaca jam dalam bahasa Inggris.',
          tujuanPembelajaran: 'Peserta didik mampu menyebutkan kegiatan sehari-hari dan menyatakan waktu (jam) secara tepat dalam bahasa Inggris.',
        },
        {
          topik: 'Food, Drinks & Ordering at the School Canteen',
          arahanRangkuman: 'Berikan daftar nama makanan/minuman, rasa (sweet, salty, spicy), dan contoh percakapan memesan makanan di kantin.',
          tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi kosakata makanan/minuman dan mempraktikkan dialog sederhana.',
        },
        {
          topik: 'Greetings, Partings, Thanking & Apologizing',
          arahanRangkuman: 'Sajikan tabel ungkapan sapaan (Good morning, How are you?), berpamitan, berterima kasih, dan meminta maaf beserta responnya.',
          tujuanPembelajaran: 'Peserta didik mampu menggunakan ungkapan sapaan, terima kasih, dan permintaan maaf secara santun.',
        },
      ];
    }
    if (isSMP) {
      return [
        {
          topik: 'Descriptive Text (Describing People, Pets & Favorite Places)',
          arahanRangkuman: 'Jelaskan Social Function, Generic Structure (Identification & Description), Simple Present Tense, Sensory Adjectives, dan berikan 1 contoh teks Descriptive lengkap beserta analisisnya.',
          tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi fungsi sosial, struktur teks, dan unsur kebahasaan Descriptive Text tentang orang, hewan, atau tempat.',
        },
        {
          topik: 'Recount Text (Personal Holiday & Past Experiences)',
          arahanRangkuman: 'Jelaskan struktur Orientation, Events, Re-orientation, rumus Simple Past Tense (Verb 2), dan contoh teks pengalaman liburan sekolah.',
          tujuanPembelajaran: 'Peserta didik mampu menganalisis dan menyusun teks Recount tentang pengalaman pribadi di masa lampau.',
        },
        {
          topik: 'Procedure Text (Simple Recipes & How to Use Things)',
          arahanRangkuman: 'Jelaskan struktur Goal, Materials/Ingredients, Steps, kalimat perintah (Imperative Sentence), dan contoh resep/manual singkat.',
          tujuanPembelajaran: 'Peserta didik mampu memahami langkah-langkah instruksi dalam Procedure Text berbentuk resep dan manual sederhana.',
        },
        {
          topik: 'Narrative Text (Fables, Folktales & Moral Values)',
          arahanRangkuman: 'Jelaskan struktur Orientation, Complication, Resolution, Coda, penggunaan Past Tense, dan contoh cerita fabel/legenda beserta pesan moralnya.',
          tujuanPembelajaran: 'Peserta didik mampu menangkap makna dan pesan moral dari Narrative Text berbentuk fabel dan cerita rakyat.',
        },
      ];
    }
    // SMA / MA / SMK
    return [
      {
        topik: 'Descriptive Text (Tourism Destinations, Historical Buildings & Workplace)',
        arahanRangkuman: 'Sajikan Social Function, Generic Structure (Identification & Description), Language Features (Simple Present Tense, Linking Verbs, rumus urutan kata sifat OSASCOMP), perbedaan Descriptive vs Report Text, serta contoh teks lengkap 3 paragraf beserta bedah analisisnya.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis fungsi sosial, struktur teks (Identification & Description), dan unsur kebahasaan Descriptive Text tentang tempat wisata, bangunan bersejarah, atau lingkungan kerja.',
      },
      {
        topik: 'Procedure Text (Technical Manuals, SOPs & Digital Tutorials)',
        arahanRangkuman: 'Bahas struktur Goal, Tools/Equipment, Steps, kalimat Imperative positif & negatif (K3), Temporal Conjunctions, serta contoh teks manual pengoperasian alat.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis dan menyusun Procedure Text berbentuk manual pengoperasian alat dan SOP kerja secara runtut.',
      },
      {
        topik: 'Recount Text (Biographical, Historical & Industrial Visit Experience)',
        arahanRangkuman: 'Jelaskan Orientation, Series of Events, Re-orientation, penguasaan Simple Past Tense vs Past Continuous, serta contoh teks pengalaman kunjungan industri/biografi tokoh.',
        tujuanPembelajaran: 'Peserta didik mampu mengevaluasi informasi dan menyusun Recount Text tentang peristiwa sejarah, biografi tokoh, atau pengalaman magang/kunjungan industri.',
      },
      {
        topik: 'Narrative Text (Indonesian Legends, Folktales & Short Stories)',
        arahanRangkuman: 'Uraikan struktur Orientation, Complication, Resolution, Coda/Moral Value, Direct & Indirect Speech, serta contoh teks legenda Nusantara lengkap.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis alur konflik, karakter, kaidah kebahasaan, dan nilai moral dalam Narrative Text.',
      },
      {
        topik: 'Analytical & Hortatory Exposition Text (Critical Arguments)',
        arahanRangkuman: 'Jelaskan perbedaan Analytical vs Hortatory Exposition, struktur Thesis - Arguments - Reiteration/Recommendation, Causal Conjunctions, dan contoh teks isu terkini.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis argumen logis dan menyusun teks eksposisi analitis/hortatori tentang isu aktual.',
      },
      {
        topik: 'Application Letter, CV & Job Interview (English for Career)',
        arahanRangkuman: 'Bedah struktur Cover Letter / Application Letter resmi, frasa profesional pembuka hingga penutup, serta tips menjawab pertanyaan Job Interview.',
        tujuanPembelajaran: 'Peserta didik mampu menyusun surat lamaran kerja (Application Letter) dalam bahasa Inggris secara profesional.',
      },
    ];
  }

  // 2. BAHASA INDONESIA
  if (lowerMapel.includes('indonesia')) {
    if (isSD) {
      return [
        {
          topik: 'Gagasan Pokok, Kalimat Utama & Kalimat Penjelas',
          arahanRangkuman: 'Berikan cara cepat membedakan paragraf deduktif dan induktif, contoh paragraf pendek, dan latihan menemukan ide pokok.',
          tujuanPembelajaran: 'Peserta didik mampu menemukan gagasan pokok dan gagasan pendukung pada setiap paragraf teks bacaan.',
        },
        {
          topik: 'Unsur Intrinsik Cerita Anak & Dongeng Nusantara',
          arahanRangkuman: 'Jelaskan tema, tokoh & penokohan, latar, alur, dan amanat dengan analogi yang seru bagi siswa SD.',
          tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi unsur-unsur intrinsik dan pesan moral dari teks cerita atau dongeng.',
        },
        {
          topik: 'Mengenal Surat Pribadi dan Surat Resmi',
          arahanRangkuman: 'Bandingkan ciri bahasa dan bagian-bagian surat pribadi dengan surat resmi sekolah disertai contohnya.',
          tujuanPembelajaran: 'Peserta didik mampu membedakan karakteristik dan menulis surat pribadi maupun surat resmi sederhana.',
        },
      ];
    }
    if (isSMP) {
      return [
        {
          topik: 'Teks Deskripsi (Melukiskan Objek, Tempat & Budaya Nusantara)',
          arahanRangkuman: 'Jelaskan struktur Identifikasi, Deskripsi Bagian, Simpulan/Kesan, cerapan panca indera, kata sifat emotif, serta contoh teks deskripsi lengkap.',
          tujuanPembelajaran: 'Peserta didik mampu menganalisis struktur dan kaidah kebahasaan Teks Deskripsi serta menyusun deskripsi objek secara hidup.',
        },
        {
          topik: 'Teks Prosedur & Infografis Panduan',
          arahanRangkuman: 'Bahas struktur Tujuan, Alat & Bahan, Langkah-langkah, Penutup, serta kaidah kalimat perintah (imperatif) dan konjungsi urutan.',
          tujuanPembelajaran: 'Peserta didik mampu menelaah struktur dan kebahasaan Teks Prosedur serta menyajikannya secara runtut.',
        },
        {
          topik: 'Teks Laporan Hasil Observasi (LHO)',
          arahanRangkuman: 'Jelaskan struktur Definisi Umum, Deskripsi Bagian, Deskripsi Manfaat, serta perbedaan fakta ilmiah vs opini.',
          tujuanPembelajaran: 'Peserta didik mampu menganalisis informasi faktual dan struktur Teks Laporan Hasil Observasi.',
        },
      ];
    }
    return [
      {
        topik: 'Teks Laporan Hasil Observasi (LHO) & Fakta Ilmiah',
        arahanRangkuman: 'Bedah struktur Pernyataan Umum, Deskripsi Bagian, Deskripsi Manfaat, kalimat definisi vs deskripsi, serta contoh teks LHO lengkap.',
        tujuanPembelajaran: 'Peserta didik mampu mengevaluasi akurasi informasi dan struktur Teks Laporan Hasil Observasi secara kritis.',
      },
      {
        topik: 'Teks Argumentasi & Eksposisi Isu Aktual',
        arahanRangkuman: 'Jelaskan struktur Tesis, Argumen disertai data/fakta, Penegasan Ulang, konjungsi kausalitas, dan cara membedakan fakta vs opini.',
        tujuanPembelajaran: 'Peserta didik mampu mengevaluasi gagasan dan menyusun argumen logis berbasis data dalam Teks Argumentasi/Eksposisi.',
      },
      {
        topik: 'Teks Negosiasi & Komunikasi Bisnis',
        arahanRangkuman: 'Uraikan struktur Orientasi, Pengajuan, Penawaran, Persetujuan, Penutup, serta kalimat persuasif dan santun dalam bernegosiasi.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis struktur dan kaidah kebahasaan Teks Negosiasi untuk mencapai kesepakatan.',
      },
      {
        topik: 'Proposal Kegiatan, Karya Ilmiah & Surat Lamaran Pekerjaan',
        arahanRangkuman: 'Sajikan sistematika penulisan baku sesuai EYD V, aturan penulisan daftar pustaka, dan ketepatan diksi formal.',
        tujuanPembelajaran: 'Peserta didik mampu menyusun dokumen formal (Proposal/Karya Ilmiah/Surat Lamaran Kerja) sesuai kaidah kebahasaan.',
      },
    ];
  }

  // 3. MATEMATIKA
  if (lowerMapel.includes('matematika')) {
    if (isSD) {
      return [
        {
          topik: 'Pecahan Senilai, Desimal, dan Persen',
          arahanRangkuman: 'Gunakan analogi membagi pizza/cokelat, rumus mengubah pecahan biasa ke desimal dan persen, serta contoh soal cerita.',
          tujuanPembelajaran: 'Peserta didik mampu membandingkan, mengurutkan, dan mengubah berbagai bentuk pecahan dalam masalah sehari-hari.',
        },
        {
          topik: 'Keliling dan Luas Bangun Datar (Persegi, Persegi Panjang, Segitiga)',
          arahanRangkuman: 'Sajikan kumpulan rumus cepat keliling dan luas bangun datar lengkap dengan contoh soal terhitung langkah demi langkah.',
          tujuanPembelajaran: 'Peserta didik mampu menghitung keliling dan luas bangun datar serta menerapkannya pada masalah kontekstual.',
        },
        {
          topik: 'KPK dan FPB dalam Masalah Sehari-hari',
          arahanRangkuman: 'Berikan cara pohon faktor dan tabel sengkedan, kata kunci membedakan soal cerita KPK vs FPB, serta contoh perhitungannya.',
          tujuanPembelajaran: 'Peserta didik mampu menyelesaikan masalah kontekstual yang berkaitan dengan KPK dan FPB.',
        },
      ];
    }
    if (isSMP) {
      return [
        {
          topik: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
          arahanRangkuman: 'Sajikan bentuk umum SPLDV, langkah metode Eliminasi, Substitusi, dan Gabungan, serta contoh soal cerita belanja lengkap dengan pembahasannya.',
          tujuanPembelajaran: 'Peserta didik dapat memodelkan dan menyelesaikan masalah kontekstual yang berkaitan dengan Sistem Persamaan Linear Dua Variabel (SPLDV).',
        },
        {
          topik: 'Teorema Pythagoras dan Tripel Pythagoras',
          arahanRangkuman: 'Jelaskan rumus a² + b² = c², daftar angka kembar Tripel Pythagoras favorit ujian (3-4-5, 5-12-13, 8-15-17), dan contoh soal aplikatif.',
          tujuanPembelajaran: 'Peserta didik mampu membuktikan dan menerapkan Teorema Pythagoras untuk menyelesaikan masalah jarak dan bangun geometri.',
        },
        {
          topik: 'Peluang Empirik, Teoretik & Statistika Data (Mean, Median, Modus)',
          arahanRangkuman: 'Tuliskan rumus Mean, Median, Modus, Kuartil, serta rumus Peluang kejadian P(A) = n(A)/n(S) beserta contoh soalnya.',
          tujuanPembelajaran: 'Peserta didik mampu menganalisis pemusatan data statistika dan menentukan peluang suatu kejadian.',
        },
      ];
    }
    return [
      {
        topik: 'Barisan dan Deret Aritmetika serta Geometri',
        arahanRangkuman: 'Sajikan perbandingan rumus Un dan Sn Aritmetika (beda tetap) vs Geometri (rasio tetap), bunga tunggal/majemuk, dan contoh soal terhitung.',
        tujuanPembelajaran: 'Peserta didik mampu menerapkan konsep barisan dan deret aritmetika maupun geometri dalam menyelesaikan masalah kontekstual.',
      },
      {
        topik: 'Perbandingan Trigonometri & Aturan Sinus-Kosinus',
        arahanRangkuman: 'Jelaskan konsep Sin-Cos-Tan (Sindemi-Kosami-Tandesa), tabel sudut istimewa (0°–90°), dan contoh menghitung tinggi gedung/pohon.',
        tujuanPembelajaran: 'Peserta didik mampu menggunakan perbandingan trigonometri pada segitiga siku-siku untuk menyelesaikan masalah pengukuran.',
      },
      {
        topik: 'Matriks: Operasi, Determinan, Invers & SPL',
        arahanRangkuman: 'Rangkum syarat penjumlahan dan perkalian matriks, rumus determinan & invers ordo 2x2, serta contoh perhitungannya.',
        tujuanPembelajaran: 'Peserta didik mampu melakukan operasi aljabar matriks serta menentukan determinan dan invers matriks.',
      },
      {
        topik: 'Eksponen, Logaritma & Fungsi Kuadrat',
        arahanRangkuman: 'Sajikan sifat-sifat utama perpangkatan dan logaritma, titik puncak fungsi kuadrat, dan bedah contoh soal ujian.',
        tujuanPembelajaran: 'Peserta didik mampu menggunakan sifat-sifat eksponen, logaritma, dan fungsi kuadrat dalam pemecahan masalah.',
      },
    ];
  }

  // 4. IPA / IPAS / FISIKA / KIMIA / BIOLOGI
  if (
    lowerMapel.includes('ipa') ||
    lowerMapel.includes('fisika') ||
    lowerMapel.includes('kimia') ||
    lowerMapel.includes('biologi')
  ) {
    if (isSD) {
      return [
        {
          topik: 'Fotosintesis dan Rantai Makanan pada Ekosistem',
          arahanRangkuman: 'Buat rangkuman dengan analogi dapur tumbuhan hijau, peran klorofil, serta alur produsen-konsumen-pengurai.',
          tujuanPembelajaran: 'Peserta didik mampu menjelaskan proses fotosintesis dan menganalisis peran makhluk hidup dalam rantai makanan.',
        },
        {
          topik: 'Wujud Zat dan Perubahannya (Mencair, Membeku, Menguap, Menyublim)',
          arahanRangkuman: 'Sajikan skema perubahan wujud benda karena kalor disertai contoh nyata di rumah sehari-hari.',
          tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi karakteristik wujud zat dan proses perubahannya.',
        },
      ];
    }
    if (lowerMapel.includes('fisika')) {
      return [
        {
          topik: 'Hukum Newton tentang Gerak, Usaha, dan Energi',
          arahanRangkuman: 'Jelaskan bunyi dan rumus Hukum I, II, III Newton (ΣF = m·a), Energi Kinetik & Potensial, serta contoh soal perhitungan.',
          tujuanPembelajaran: 'Peserta didik mampu menganalisis hubungan gaya, massa, dan percepatan sesuai Hukum Newton serta kekekalan energi.',
        },
        {
          topik: 'Listrik Dinamis: Hukum Ohm & Rangkaian Seri-Paralel',
          arahanRangkuman: 'Sajikan rumus V = I·R, perbandingan hambatan seri vs paralel, daya listrik rumah tangga, dan contoh soalnya.',
          tujuanPembelajaran: 'Peserta didik mampu menganalisis besaran arus, tegangan, dan hambatan pada rangkaian listrik arus searah.',
        },
      ];
    }
    if (lowerMapel.includes('kimia')) {
      return [
        {
          topik: 'Struktur Atom, Konfigurasi Elektron & Ikatan Kimia',
          arahanRangkuman: 'Jelaskan partikel penyusun atom (proton, elektron, neutron), aturan oktet, serta perbedaan Ikatan Ion vs Ikatan Kovalen.',
          tujuanPembelajaran: 'Peserta didik mampu menganalisis konfigurasi elektron dan proses terbentuknya ikatan ion maupun kovalen.',
        },
        {
          topik: 'Stoikiometri, Konsep Mol & Persamaan Reaksi Kimia',
          arahanRangkuman: 'Sajikan jembatan rumus Konsep Mol (massa, Ar/Mr, volume STP, jumlah partikel) dan langkah menyetarakan reaksi kimia.',
          tujuanPembelajaran: 'Peserta didik mampu menerapkan konsep mol dan hukum dasar kimia dalam perhitungan stoikiometri.',
        },
      ];
    }
    return [
      {
        topik: isSMK
          ? 'Energi Terbarukan & Pengolahan Limbah Lingkungan (Projek IPAS SMK)'
          : 'Sistem Peredaran Darah & Pernapasan Manusia',
        arahanRangkuman: isSMK
          ? 'Jelaskan sumber energi terbarukan, prinsip 3R pengolahan limbah industri, dan dampaknya terhadap keberlanjutan lingkungan.'
          : 'Bedakan peredaran darah besar dan kecil, fungsi bagian jantung, serta gangguan kesehatan sistem peredaran darah.',
        tujuanPembelajaran: isSMK
          ? 'Peserta didik mampu merancang solusi pemanfaatan energi ramah lingkungan dan pengelolaan limbah secara bertanggung jawab.'
          : 'Peserta didik mampu menganalisis mekanisme sistem organ manusia serta upaya menjaga kesehatannya.',
      },
      {
        topik: 'Keanekaragaman Hayati, Ekosistem & Perubahan Iklim Global',
        arahanRangkuman: 'Uraikan interaksi antar komponen biotik-abiotik, efek rumah kaca, dan langkah pelestarian biodiversitas Indonesia.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis interaksi ekosistem serta dampak perubahan iklim terhadap keanekaragaman hayati.',
      },
    ];
  }

  // 5A. PRODUK KREATIF DAN KEWIRAUSAHAAN (PKK) & DASAR KEJURUAN SMK
  if (lowerMapel.includes('pkk') || lowerMapel.includes('kewirausahaan') || lowerMapel.includes('kejuruan')) {
    return [
      {
        topik: 'Strategi Wirausaha, Analisis Peluang Usaha (SWOT) & Pemasaran Digital',
        arahanRangkuman: 'Jelaskan langkah membaca peluang usaha dengan analisis SWOT, segmentasi pasar, serta strategi branding dan pemasaran digital.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis peluang usaha dengan SWOT dan merancang strategi pemasaran produk kreatif.',
      },
      {
        topik: 'Perhitungan Harga Pokok Produksi (HPP), Harga Jual & Titik Impas (BEP)',
        arahanRangkuman: 'Sertakan rumus Biaya Tetap (Fixed Cost), Biaya Variabel (Variable Cost), HPP per unit, dan contoh perhitungan Break Even Point (BEP).',
        tujuanPembelajaran: 'Peserta didik mampu menghitung biaya produksi, menentukan harga jual, dan menganalisis titik impas (BEP) usaha.',
      },
      {
        topik: 'K3LH (Keselamatan Kerja), Budaya Kerja Industri 5R & Standar Operasional (SOP)',
        arahanRangkuman: 'Rangkum prinsip Keselamatan dan Kesehatan Kerja (K3LH), penerapan 5R (Ringkas, Rapi, Resik, Rawat, Rajin), dan kendali mutu produk.',
        tujuanPembelajaran: 'Peserta didik mampu menerapkan prosedur K3LH dan budaya kerja industri 5R secara disiplin.',
      },
    ];
  }

  // 5B. INFORMATIKA
  if (lowerMapel.includes('informatika')) {
    return [
      {
        topik: 'Berpikir Komputasional: Dekomposisi, Pola, Abstraksi & Algoritma',
        arahanRangkuman: 'Jelaskan 4 pilar Computational Thinking dengan contoh pemecahan masalah nyata serta flowchart/pseudocode dasar.',
        tujuanPembelajaran: 'Peserta didik mampu menerapkan 4 fondasi berpikir komputasional untuk menyusun algoritma penyelesaian masalah.',
      },
      {
        topik: 'Jaringan Komputer, Internet & Keamanan Siber (Cyber Security)',
        arahanRangkuman: 'Bahas perbedaan LAN/MAN/WAN, cara kerja IP Address & DNS, serta tips keamanan data pribadi dan pencegahan phishing.',
        tujuanPembelajaran: 'Peserta didik mampu memahami konsep jaringan komputer dan menerapkan prinsip keamanan data digital.',
      },
      {
        topik: 'Analisis Data, Algoritma Pemrograman Dasar & Dampak Sosial Informatika',
        arahanRangkuman: 'Jelaskan konsep variabel, percabangan, perulangan dalam pemrograman, pengolahan data tabel, serta etika jejak digital.',
        tujuanPembelajaran: 'Peserta didik mampu memahami logika pemrograman dasar dan menerapkan etika warga digital secara bertanggung jawab.',
      },
    ];
  }

  // 6. PAI & MAPEL MADRASAH (TERPISAH PER DISIPLIN ILMU)
  if (lowerMapel.includes('fikih')) {
    return [
      {
        topik: 'Ketentuan Thaharah (Bersuci dari Hadats & Najis) serta Hikmahnya',
        arahanRangkuman: 'Jelaskan macam-macam air suci menyucikan, pembagian najis (Mukhaffafah, Mutawassithah, Mughallazhah), tata cara wudhu/tayamum, serta hikmah thaharah.',
        tujuanPembelajaran: 'Peserta didik mampu mengklasifikasikan macam-macam najis dan mempraktikkan tata cara thaharah sesuai syariat Islam.',
      },
      {
        topik: 'Ketentuan Shalat Fardhu, Shalat Berjamaah & Sujud Sahwi/Tilawah/Syukur',
        arahanRangkuman: 'Sajikan syarat wajib, syarat sah, rukun shalat, hal yang membatalkan, serta tata cara sujud sahwi, tilawah, dan syukur.',
        tujuanPembelajaran: 'Peserta didik mampu memahami syarat, rukun, dan sunnah shalat serta mempraktikkannya dengan tertib.',
      },
      {
        topik: 'Fikih Muamalah: Jual Beli, Khiyar, Qiradh & Larangan Riba',
        arahanRangkuman: 'Jelaskan rukun dan syarat sah jual beli, macam-macam khiyar, kerja sama ekonomi Islam (Mudharabah/Musyarakah), dan bahaya riba.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis ketentuan transaksi muamalah yang sah dan menghindari praktik riba dalam kehidupan.',
      },
      {
        topik: 'Ketentuan Zakat Fitrah, Zakat Mal, Infak, Sedekah & Wakaf',
        arahanRangkuman: 'Rangkum syarat wajib zakat, nishab dan haul zakat mal (emas, pertanian, perdagangan), serta 8 golongan mustahiq zakat.',
        tujuanPembelajaran: 'Peserta didik mampu menghitung nishab zakat dan memahami hikmah pengelolaan zakat, infak, dan wakaf.',
      },
    ];
  }

  if (lowerMapel.includes("qur'an") || lowerMapel.includes('quran') || lowerMapel.includes('hadis')) {
    return [
      {
        topik: 'Hukum Bacaan Nun Mati / Tanwin dan Mim Mati dalam Ilmu Tajwid',
        arahanRangkuman: 'Buat tabel ringkas hukum Izhar Halqi, Idgham Bighunnah, Idgham Bilaghunnah, Iqlab, dan Ikhfa Haqiqi beserta huruf-hurufnya dan contoh potongan ayat.',
        tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi dan mempraktikkan hukum bacaan Nun Mati/Tanwin dan Mim Mati secara tartil.',
      },
      {
        topik: 'Hukum Bacaan Mad (Mad Thabi’i dan Mad Far’i) serta Waqaf',
        arahanRangkuman: 'Jelaskan perbedaan Mad Wajib Muttashil, Mad Jaiz Munfashil, Mad Aridh Lissukun, dan tanda-tanda waqaf dalam Al-Qur’an.',
        tujuanPembelajaran: 'Peserta didik mampu menerapkan hukum bacaan Mad dan tanda waqaf dengan panjang harakat yang tepat.',
      },
      {
        topik: 'Ayat Al-Qur’an dan Hadis tentang Keutamaan Menuntut Ilmu & Kejujuran',
        arahanRangkuman: 'Sertakan kandungan QS. Al-Mujadilah ayat 11, hadis keutamaan mencari ilmu, kosakata mufradat penting, dan perilaku pengamalannya.',
        tujuanPembelajaran: 'Peserta didik mampu memahami isi kandungan ayat dan hadis tentang menuntut ilmu serta mengamalkannya.',
      },
    ];
  }

  if (lowerMapel.includes('akidah') || lowerMapel.includes('akhlak')) {
    return [
      {
        topik: 'Iman kepada Allah melalui Asmaul Husna & Sifat Wajib Allah',
        arahanRangkuman: 'Jelaskan makna sifat wajib, mustahil, dan jaiz bagi Allah beserta teladan pengamalan Asmaul Husna (Al-Aziz, Al-Adl, Al-Qayyum, Al-Ghaffar).',
        tujuanPembelajaran: 'Peserta didik mampu memahami makna Asmaul Husna dan meneladaninya dalam sikap sehari-hari.',
      },
      {
        topik: 'Akhlak Mahmudah (Husnuzhan, Tawadhu, Tasamuh, Ta’awun) & Menghindari Akhlak Madzmumah',
        arahanRangkuman: 'Bandingkan ciri, dalil, dan dampak positif akhlak terpuji (husnuzhan, tawadhu, toleransi) dengan bahaya sifat hasad, takabur, dan ghibah.',
        tujuanPembelajaran: 'Peserta didik mampu membiasakan akhlak terpuji dan menjauhi akhlak tercela dalam pergaulan.',
      },
    ];
  }

  if (lowerMapel.includes('ski') || lowerMapel.includes('sejarah kebudayaan islam')) {
    return [
      {
        topik: 'Strategi Dakwah Rasulullah SAW Periode Makkah dan Madinah',
        arahanRangkuman: 'Jelaskan dakwah sembunyi-sembunyi (sirriyah) dan terang-terangan (jahriyah), Piagam Madinah, serta keteladanan kesabaran Rasulullah SAW.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis substansi dan strategi dakwah Rasulullah SAW di Makkah dan Madinah.',
      },
      {
        topik: 'Sejarah Masuknya Islam di Nusantara & Peran Wali Songo',
        arahanRangkuman: 'Uraikan jalur masuknya Islam ke Indonesia (perdagangan, pernikahan, pendidikan, kesenian) serta metode dakwah kultural Wali Songo.',
        tujuanPembelajaran: 'Peserta didik mampu meneladani kearifan dan metode dakwah damai Wali Songo di Nusantara.',
      },
    ];
  }

  if (lowerMapel.includes('arab')) {
    return [
      {
        topik: 'At-Ta’aruf (Perkenalan Diri) & Al-Adawatul Madrasiyyah (Peralatan Sekolah)',
        arahanRangkuman: 'Sajikan mufradat (kosakata) perkenalan dan benda di kelas, kata ganti (Dhamir Ana, Anta, Anti, Huwa, Hiya), dan kata tunjuk (Hadza / Hadzihi).',
        tujuanPembelajaran: 'Peserta didik mampu melakukan percakapan perkenalan dan menyebutkan peralatan sekolah menggunakan struktur Dhamir dan Isim Isyarah.',
      },
      {
        topik: 'Al-Yaumiyyat (Kegiatan Sehari-hari) & Pembagian Kalimat (Isim, Fi’il, Harf)',
        arahanRangkuman: 'Jelaskan kosakata aktivitas harian, perbedaan Jumlah Ismiyyah dan Jumlah Fi’liyyah, serta contoh kalimat bahasa Arab berharakat.',
        tujuanPembelajaran: 'Peserta didik mampu menyusun kalimat sederhana tentang aktivitas harian dalam bahasa Arab.',
      },
    ];
  }

  if (lowerMapel.includes('agama')) {
    return [
      {
        topik: 'Adab Menuntut Ilmu, Kejujuran (Shiddiq) & Moderasi Beragama',
        arahanRangkuman: 'Sertakan dalil Al-Qur’an/Hadis penguat, keutamaan berilmu dan jujur, serta contoh sikap toleransi (ukhuwah) di sekolah dan masyarakat.',
        tujuanPembelajaran: 'Peserta didik mampu memahami dalil dan membiasakan perilaku jujur, amanah, serta adab menuntut ilmu.',
      },
      {
        topik: 'Ketentuan Thaharah, Shalat Berjamaah & Zakat dalam Kehidupan',
        arahanRangkuman: 'Jelaskan syarat, rukun, hal yang membatalkan, serta hikmah ibadah secara terstruktur dan mudah diingat siswa.',
        tujuanPembelajaran: 'Peserta didik mampu memahami ketentuan syariat ibadah dan mempraktikkannya dengan tertib.',
      },
      {
        topik: 'Hukum Bacaan Tajwid (Nun Mati/Tanwin, Mim Mati & Mad)',
        arahanRangkuman: 'Buat tabel ringkas hukum Izhar, Idgham, Iqlab, Ikhfa beserta huruf-hurufnya dan contoh potongan ayat.',
        tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi dan mempraktikkan hukum bacaan tajwid dengan tartil dan benar.',
      },
    ];
  }

  // 7. PJOK (PENDIDIKAN JASMANI, OLAHRAGA, DAN KESEHATAN)
  if (lowerMapel.includes('pjok') || lowerMapel.includes('jasmani') || lowerMapel.includes('olahraga')) {
    return [
      {
        topik: 'Komponen Kebugaran Jasmani (Kekuatan, Daya Tahan, Kelincahan & Kelenturan)',
        arahanRangkuman: 'Jelaskan masing-masing komponen kebugaran jasmani, bentuk latihan fisiknya (push-up, sit-up, lari shuttle run), serta cara mengukur denyut nadi latihan.',
        tujuanPembelajaran: 'Peserta didik mampu memahami komponen kebugaran jasmani dan mempraktikkan latihan peningkatan kebugaran secara aman.',
      },
      {
        topik: 'Gerak Spesifik Permainan Bola Besar (Sepak Bola, Bola Voli & Bola Basket)',
        arahanRangkuman: 'Rangkum teknik dasar passing, dribbling, shooting, dan servis beserta aturan dasar permainan dan nilai sportivitas.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis dan mempraktikkan variasi gerak spesifik dalam permainan bola besar.',
      },
      {
        topik: 'Pola Hidup Sehat, Gizi Seimbang & Pencegahan Bahaya Pergaulan Bebas/NAPZA',
        arahanRangkuman: 'Jelaskan konsep Isi Piringku (gizi seimbang), pentingnya istirahat cukup, serta langkah menjaga kesehatan fisik dan mental remaja.',
        tujuanPembelajaran: 'Peserta didik mampu menerapkan pola makan sehat bergizi seimbang dan perilaku hidup bersih dan sehat.',
      },
    ];
  }

  // 8. SENI BUDAYA & PRAKARYA
  if (lowerMapel.includes('seni') || lowerMapel.includes('prakarya')) {
    return [
      {
        topik: 'Menggambar Ragam Hias Nusantara (Flora, Fauna, Geometris & Figuratif)',
        arahanRangkuman: 'Jelaskan unsur seni rupa (titik, garis, bidang, warna, tekstur), prinsip komposisi, dan tahapan menggambar ragam hias daerah.',
        tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi motif ragam hias Nusantara dan menciptakan karya gambar ragam hias.',
      },
      {
        topik: 'Kerajinan Bahan Alam & Daur Ulang Limbah Ramah Lingkungan',
        arahanRangkuman: 'Uraikan prinsip 3R (Reduce, Reuse, Recycle), karakteristik bahan lunak/keras, serta tahapan perancangan produk kerajinan bernilai jual.',
        tujuanPembelajaran: 'Peserta didik mampu merancang dan membuat produk kerajinan dari bahan alam atau limbah di lingkungan sekitar.',
      },
    ];
  }

  // 9. PENDIDIKAN PANCASILA / PPKN
  if (lowerMapel.includes('pancasila') || lowerMapel.includes('ppkn')) {
    return [
      {
        topik: 'Nilai-Nilai Pancasila sebagai Dasar Negara dan Pandangan Hidup Bangsa',
        arahanRangkuman: 'Jelaskan butir pengamalan sila ke-1 sampai ke-5 Pancasila di lingkungan keluarga, sekolah, dan masyarakat beserta tantangan di era digital.',
        tujuanPembelajaran: 'Peserta didik mampu menerapkan nilai-nilai Pancasila dalam kehidupan sehari-hari sebagai warga negara yang baik.',
      },
      {
        topik: 'Norma, Hak, dan Kewajiban Warga Negara sesuai UUD NRI Tahun 1945',
        arahanRangkuman: 'Bandingkan 4 macam norma (Agama, Kesusilaan, Kesopanan, Hukum) serta keseimbangan pelaksanaan hak dan kewajiban warga negara.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis pelaksanaan norma, hak, dan kewajiban konstitusional warga negara.',
      },
      {
        topik: 'Bhinneka Tunggal Ika, Keberagaman Suku Budaya & Harmoni Sosial',
        arahanRangkuman: 'Uraikan faktor keberagaman masyarakat Indonesia, pentingnya toleransi, dan cara menyelesaikan konflik sosial secara damai.',
        tujuanPembelajaran: 'Peserta didik mampu menghargai keberagaman budaya dan menjaga keutuhan NKRI.',
      },
    ];
  }

  // 10. EKONOMI / IPS / SEJARAH / SOSIOLOGI / GEOGRAFI
  if (lowerMapel.includes('ekonomi')) {
    return [
      {
        topik: 'Permintaan, Penawaran, Harga Keseimbangan Pasar & Elastisitas',
        arahanRangkuman: 'Jelaskan Hukum Permintaan dan Penawaran, faktor yang menggeser kurva, rumus titik keseimbangan (Qd = Qs), serta contoh soalnya.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis terbentuknya harga keseimbangan pasar dari interaksi permintaan dan penawaran.',
      },
      {
        topik: 'Kebutuhan Manusia, Kelangkaan Sumber Daya & Biaya Peluang (Opportunity Cost)',
        arahanRangkuman: 'Jelaskan skala prioritas kebutuhan, penyebab kelangkaan, dan cara menentukan biaya peluang dalam pengambilan keputusan ekonomi.',
        tujuanPembelajaran: 'Peserta didik mampu menyusun skala prioritas dan menghitung biaya peluang dalam masalah ekonomi sehari-hari.',
      },
    ];
  }

  if (lowerMapel.includes('sejarah')) {
    return [
      {
        topik: 'Pergerakan Nasional Indonesia, Sumpah Pemuda & Proklamasi Kemerdekaan 1945',
        arahanRangkuman: 'Susun lini masa (timeline) kronologis dari berdirinya Budi Utomo (1908), Sumpah Pemuda (1928), peristiwa Rengasdengklok, hingga Proklamasi 17 Agustus 1945.',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis kronologi dan makna perjuangan pergerakan nasional hingga Proklamasi Kemerdekaan Indonesia.',
      },
      {
        topik: 'Konsep Berpikir Kronologis, Diakronik, Sinkronik, Ruang dan Waktu dalam Sejarah',
        arahanRangkuman: 'Bandingkan cara berpikir diakronik (memanjang dalam waktu) dan sinkronik (meluas dalam ruang) disertai contoh peristiwa sejarah.',
        tujuanPembelajaran: 'Peserta didik mampu menerapkan konsep berpikir diakronik dan sinkronik dalam mengkaji peristiwa sejarah.',
      },
    ];
  }

  return [
    {
      topik: `Interaksi Sosial, Lembaga Sosial & Dinamika Masyarakat Indonesia`,
      arahanRangkuman: `Sajikan syarat terjadinya interaksi sosial (kontak sosial & komunikasi), bentuk interaksi asosiatif vs disosiatif, serta peran lembaga sosial.`,
      tujuanPembelajaran: `Peserta didik mampu menganalisis bentuk-bentuk interaksi sosial dan peran lembaga sosial dalam kehidupan masyarakat.`,
    },
    {
      topik: `Kondisi Geografis Indonesia, Pemanfaatan Sumber Daya Alam & Pelestarian Lingkungan`,
      arahanRangkuman: 'Jelaskan letak astronomis, geografis, dan geologis Indonesia beserta dampaknya terhadap iklim, potensi SDA, dan mitigasi bencana.',
      tujuanPembelajaran: `Peserta didik mampu menganalisis pengaruh letak geografis Indonesia terhadap keragaman sumber daya alam dan aktivitas ekonomi.`,
    },
  ];
}

export interface SemesterCurriculumPlan {
  capaianPembelajaran: string;
  tpList: CustomTPItem[];
}

function getExtraTopicsForSemester(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string
): TopicSuggestion[] {
  const lower = mataPelajaran.toLowerCase();
  const isSD = jenjangFase.includes('SD') || ['1', '2', '3', '4', '5', '6'].includes(kelas.trim());
  const isSMP = jenjangFase.includes('SMP') || ['7', '8', '9'].includes(kelas.trim());

  if (lower.includes('matematika')) {
    return [
      {
        topik: isSD
          ? 'Pengolahan Data Tabel, Diagram Batang & Piktogram'
          : isSMP
          ? 'Rasio, Proporsi & Perbandingan Senilai / Berbalik Nilai'
          : 'Turunan Fungsi Aljabar, Nilai Stasioner & Aplikasinya',
        arahanRangkuman: isSD
          ? 'Sajikan cara membaca dan membuat tabel frekuensi, piktogram, serta diagram batang dari data lingkungan sekitar.'
          : isSMP
          ? 'Jelaskan konsep rasio, skala peta, serta perbedaan perbandingan senilai dan berbalik nilai beserta contoh soalnya.'
          : 'Jelaskan aturan turunan fungsi aljabar, syarat fungsi naik/turun, titik stasioner, dan masalah optimasi.',
        tujuanPembelajaran: isSD
          ? 'Peserta didik mampu mengumpulkan, mengurutkan, dan menyajikan data dalam bentuk tabel serta diagram batang.'
          : isSMP
          ? 'Peserta didik mampu menggunakan rasio dan proporsi untuk menyelesaikan masalah perbandingan senilai maupun berbalik nilai.'
          : 'Peserta didik mampu menerapkan konsep turunan fungsi untuk menentukan nilai maksimum dan minimum dalam masalah kontekstual.',
      },
      {
        topik: isSD
          ? 'Pengukuran Panjang, Berat, Waktu & Satuan Baku'
          : isSMP
          ? 'Operasi Bentuk Aljabar, Persamaan & Pertidaksamaan Linear'
          : 'Peluang Kejadian Majemuk, Kaidah Pencacahan & Kombinatorika',
        arahanRangkuman: isSD
          ? 'Jelaskan tangga konversi satuan panjang (km–mm), berat (kg–g), dan pembacaan waktu pada jam analog/digital.'
          : isSMP
          ? 'Rangkum unsur aljabar (variabel, koefisien, suku sejenis), sifat distributif, dan penyelesaian PLSV/PtLSV.'
          : 'Sajikan rumus permutasi, kombinasi, peluang kejadian saling lepas dan saling bebas disertai contoh soal.',
        tujuanPembelajaran: isSD
          ? 'Peserta didik mampu melakukan pengukuran dan konversi satuan panjang, berat, serta waktu dalam kehidupan sehari-hari.'
          : isSMP
          ? 'Peserta didik mampu menyederhanakan bentuk aljabar dan menyelesaikan persamaan linear satu variabel.'
          : 'Peserta didik mampu menentukan ruang sampel dan menghitung peluang kejadian majemuk secara akurat.',
      },
    ];
  }

  if (lower.includes('inggris')) {
    return [
      {
        topik: isSD
          ? 'My Daily Activities, Telling Time & Hobbies'
          : isSMP
          ? 'Narrative Text: Folktales, Fables & Moral Value'
          : 'Analytical Exposition Text: Thesis, Arguments & Reiteration',
        arahanRangkuman: isSD
          ? 'Sajikan kosakata kegiatan sehari-hari (wake up, go to school), cara menyebutkan jam dalam Bahasa Inggris, dan dialog hobi.'
          : isSMP
          ? 'Jelaskan struktur Narrative Text (Orientation, Complication, Resolution), penggunaan Simple Past Tense, dan pesan moral cerita.'
          : 'Uraikan struktur Analytical Exposition (Thesis, Arguments, Reiteration), Simple Present Tense, dan internal conjunctions.',
        tujuanPembelajaran: isSD
          ? 'Peserta didik mampu mengungkapkan kegiatan rutin harian dan menyebutkan waktu dalam Bahasa Inggris sederhana.'
          : isSMP
          ? 'Peserta didik mampu mengidentifikasi struktur, alur cerita, dan pesan moral dari teks naratif (fable/folktale).'
          : 'Peserta didik mampu menganalisis argumen logis dan menyusun teks eksposisi analitis terkait isu aktual.',
      },
      {
        topik: isSD
          ? 'Public Places, Prepositions of Place & Simple Directions'
          : isSMP
          ? 'Short Functional Text: Greeting Cards, Notices & Announcements'
          : 'Conditional Sentences (Type 1, 2, 3) & Passive Voice in Context',
        arahanRangkuman: isSD
          ? 'Sajikan kosakata tempat umum (school, hospital, market, bank) dan kata depan lokasi (in, on, under, beside, in front of).'
          : isSMP
          ? 'Bandingkan tujuan komunikatif dan bagian-bagian Greeting Card, Notice/Warning, serta Announcement di sekolah.'
          : 'Jelaskan rumus dan fakta makna Conditional Sentence Tipe 1, 2, 3 serta pengubahan kalimat aktif menjadi pasif.',
        tujuanPembelajaran: isSD
          ? 'Peserta didik mampu menyebutkan nama tempat umum dan menunjukkan letak benda menggunakan preposition of place.'
          : isSMP
          ? 'Peserta didik mampu memahami makna dan menyusun teks fungsional pendek berupa pengumuman serta kartu ucapan.'
          : 'Peserta didik mampu menerapkan kalimat pengandaian (Conditional Sentences) dan kalimat pasif secara tepat.',
      },
    ];
  }

  return [
    {
      topik: `Studi Kasus Kontekstual & Proyek Penguatan Literasi ${mataPelajaran}`,
      arahanRangkuman: `Susun rangkuman aplikatif mengenai penerapan konsep ${mataPelajaran} dalam memecahkan permasalahan nyata di lingkungan sekolah dan masyarakat.`,
      tujuanPembelajaran: `Peserta didik mampu menerapkan konsep ${mataPelajaran} untuk menganalisis dan memecahkan masalah kontekstual di lingkungan sekitar.`,
    },
    {
      topik: `Evaluasi Komprehensif, Analisis Data & Refleksi Pembelajaran ${mataPelajaran}`,
      arahanRangkuman: `Sajikan peta konsep terpadu, sintesis materi inti ${mataPelajaran}, serta latihan studi kasus HOTS beserta pembahasannya.`,
      tujuanPembelajaran: `Peserta didik mampu mengevaluasi dan menyimpulkan keterkaitan antar konsep pada mata pelajaran ${mataPelajaran} secara kritis.`,
    },
  ];
}

function resolveElemenList(mataPelajaran: string): string[] {
  const lower = mataPelajaran.toLowerCase();
  if (lower.includes('matematika')) {
    return ['Bilangan & Aljabar', 'Aljabar & Fungsi', 'Geometri & Pengukuran', 'Analisis Data & Peluang'];
  }
  if (lower.includes('indonesia') || lower.includes('inggris') || lower.includes('arab')) {
    return ['Menyimak & Membaca-Memirsa', 'Membaca & Memahami Teks', 'Berbicara & Mempresentasikan', 'Menulis & Memproduksi Teks'];
  }
  if (lower.includes('ipa') || lower.includes('fisika') || lower.includes('kimia') || lower.includes('biologi')) {
    return ['Pemahaman Konsep Sains', 'Keterampilan Proses & Eksperimen', 'Analisis Sistem & Fenomena Alam', 'Inovasi & Pelestarian Lingkungan'];
  }
  if (lower.includes('pancasila')) {
    return ['Pancasila', 'Undang-Undang Dasar NRI Tahun 1945', 'Bhinneka Tunggal Ika', 'Negara Kesatuan Republik Indonesia'];
  }
  if (lower.includes('informatika')) {
    return ['Berpikir Komputasional', 'Sistem Komputer & Jaringan', 'Algoritma & Pemrograman', 'Analisis Data & Dampak Sosial'];
  }
  if (lower.includes('agama') || lower.includes('fikih') || lower.includes('akidah') || lower.includes('qur') || lower.includes('ski')) {
    return ['Al-Qur\'an & Hadis', 'Akidah & Keimanan', 'Akhlak Mulia & Adab', 'Fikih Ibadah & Sejarah Peradaban'];
  }
  return ['Pemahaman Konsep Inti', 'Analisis Kontekstual', 'Keterampilan Praktik & Aplikasi', 'Evaluasi & Proyek Kolaboratif'];
}

export function getSemesterCurriculumPlan(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string,
  semester: string = '1 (Ganjil)'
): SemesterCurriculumPlan {
  const baseSuggestions = getSuggestedTopics(mataPelajaran, jenjangFase, kelas);
  const extras = getExtraTopicsForSemester(mataPelajaran, jenjangFase, kelas);
  const combined = [...baseSuggestions, ...extras];

  // Pastikan minimal 4 TP yang unik
  const uniqueTopics: TopicSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of combined) {
    const key = item.topik.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTopics.push(item);
    }
    if (uniqueTopics.length >= 4) break;
  }

  const isSem2 = semester.startsWith('2') || semester.toLowerCase().includes('genap');
  const elemenList = resolveElemenList(mataPelajaran);
  const cleanKelas = kelas.replace(/[^0-9]/g, '') || '8';

  const tpList: CustomTPItem[] = uniqueTopics.map((item, idx) => {
    const nomorTP = isSem2 ? idx + 5 : idx + 1;
    const mingguMulai = idx * 4 + 1;
    const mingguSelesai = (idx + 1) * 4;
    return {
      id: `tp-${cleanKelas}-${nomorTP}`,
      kode: `${cleanKelas}.${nomorTP}`,
      elemen: elemenList[idx % elemenList.length],
      materiPokok: item.topik,
      tujuanPembelajaran: item.tujuanPembelajaran,
      arahanRangkuman: item.arahanRangkuman,
      alokasiJP: idx === 1 || idx === 2 ? 16 : 12,
      mingguMulai,
      mingguSelesai,
    };
  });

  const faseShort = jenjangFase.split('(')[0].trim();
  const ringkasanMateri = tpList.map((t) => t.materiPokok).join('; ');
  const capaianPembelajaran = `Pada akhir ${faseShort} (Kelas ${cleanKelas} Semester ${isSem2 ? 'Genap' : 'Ganjil'}), peserta didik mampu memahami, mengaplikasikan, dan bernalar kritis pada mata pelajaran ${mataPelajaran} meliputi elemen ${elemenList.slice(0, 3).join(', ')} dengan cakupan materi: ${ringkasanMateri}, serta mengaitkannya dalam pemecahan masalah kehidupan sehari-hari sesuai Kurikulum Merdeka.`;

  return {
    capaianPembelajaran,
    tpList,
  };
}
