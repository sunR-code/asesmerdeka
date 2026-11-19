export interface GuideQuickIntent {
  id: string;
  intent: string;
  targetChapterId: string;
  whereToClick: string;
  summary: string;
}

export interface GuideStep {
  action: string;
  detail: string;
}

export interface GuideCommonMistake {
  mistake: string;
  solution: string;
}

export interface GuideFaqItem {
  question: string;
  answer: string;
}

export interface GuideComparisonRow {
  term: string;
  meaning: string;
  simpleExample: string;
}

export interface GuideChapter {
  id: string;
  number: number;
  codeLabel: string;
  category: string;
  shortTitle: string;
  fullTitle: string;
  subtitle: string;
  estimatedTime: string;
  uiLocationHint: string;
  /** 1. Tujuan */
  tujuan: string;
  /** 2. Kapan digunakan? */
  kapanDigunakan: string;
  /** 3. Persiapan */
  persiapan: string[];
  /** 4. Langkah-langkah (1 instruksi untuk 1 tindakan dengan label UI aktual) */
  langkahLangkah: GuideStep[];
  /** 5. Hasil yang diharapkan */
  hasilDiharapkan: string[];
  /** 6. Kesalahan umum */
  kesalahanUmum: GuideCommonMistake[];
  /** 7. Langkah selanjutnya */
  langkahSelanjutnya: {
    text: string;
    nextChapterId?: string;
    nextChapterTitle?: string;
  };
  importantCallout?: {
    title: string;
    body: string;
    tone: 'info' | 'warning' | 'success';
  };
  comparisonTable?: {
    title: string;
    caption: string;
    columns: [string, string, string];
    rows: GuideComparisonRow[];
  };
  simulationExampleTable?: {
    title: string;
    badgeLabel: string;
    description: string;
    headers: string[];
    rows: string[][];
  };
  uiButtonPills?: Array<{
    label: string;
    tone: 'primary' | 'success' | 'outline';
    note: string;
  }>;
  faqs: GuideFaqItem[];
  keywords: string[];
}

export const GUIDE_QUICK_INTENTS: GuideQuickIntent[] = [
  {
    id: 'intent-setup-kelas',
    intent: 'Menyiapkan kelas untuk semester baru',
    targetChapterId: 'bagian-2',
    whereToClick: 'Bilah atas "Ganti kelas/mapel" atau Pengaturan ruang kerja',
    summary: 'Pilih Jenjang, Kelas, Tahun Ajaran, Semester, Mata Pelajaran, dan Rombel aktif.',
  },
  {
    id: 'intent-atp',
    intent: 'Membuat ATP',
    targetChapterId: 'bagian-3',
    whereToClick: 'Menu kiri "Alur Tujuan (ATP)" -> atur urutan TP -> "Setujui ATP Fase"',
    summary: 'Susun CP, TP, dan urutan ATP tingkat fase sebelum diturunkan ke Prota & Promes.',
  },
  {
    id: 'intent-modul-ajar',
    intent: 'Membuat Modul Ajar',
    targetChapterId: 'bagian-4',
    whereToClick: 'Menu kiri "Peta TP & Modul Ajar" -> tombol "Modul Ajar"',
    summary: 'Buka draf RPP/Modul Ajar per bab, sesuaikan model belajar, lalu unduh Word (.docx).',
  },
  {
    id: 'intent-presensi',
    intent: 'Mengisi presensi',
    targetChapterId: 'bagian-5',
    whereToClick: 'Menu kiri "Presensi Siswa" -> klik status H/S/I/A',
    summary: 'Impor nama siswa kelas Anda lalu catat kehadiran 16 pertemuan dan Jurnal Mengajar.',
  },
  {
    id: 'intent-olah-nilai',
    intent: 'Mengolah nilai',
    targetChapterId: 'bagian-6',
    whereToClick: 'Menu kiri "Buku Nilai Asesmen" -> Atur Bobot & KKTP',
    summary: 'Masukkan nilai Formatif per TP, STS, dan SAS; cek Analisis TP & status KKTP.',
  },
  {
    id: 'intent-rapor',
    intent: 'Membuat rapor',
    targetChapterId: 'bagian-6',
    whereToClick: 'Menu kiri "Auto-Deskripsi e-Rapor"',
    summary: 'Susun kalimat deskripsi capaian tertinggi & perlu bimbingan untuk disalin ke e-Rapor.',
  },
  {
    id: 'intent-unduh-dokumen',
    intent: 'Mengunduh dokumen',
    targetChapterId: 'bagian-7',
    whereToClick: 'Menu kiri "Paket Siap Supervisi" -> Unduh Master Bundel (.docx) / Arsip (.zip)',
    summary: 'Unduh 9 berkas administrasi supervisi lengkap ber-kop surat resmi sekolah.',
  },
  {
    id: 'intent-pulihkan-data',
    intent: 'Memulihkan data',
    targetChapterId: 'bagian-8',
    whereToClick: 'Bilah atas "Profil sekolah" -> tombol "Pulihkan Data (.json)" atau Cloud Sync',
    summary: 'Amankan pekerjaan lewat Backup (.json) atau sinkronkan perangkat lewat Lisensi aktif.',
  },
];

export const TEACHER_GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: 'bagian-1',
    number: 1,
    codeLabel: 'BAGIAN 1',
    category: 'Pengenalan & Awal Pemakaian',
    shortTitle: 'Mulai Menggunakan AsesMerdeka',
    fullTitle: 'BAGIAN 1 — MULAI MENGGUNAKAN ASESMERDEKA',
    subtitle: 'Mengenal layar utama, tombol header, Profil sekolah, penyimpanan lokal, status lisensi, dan cara memulai workspace.',
    estimatedTime: 'Sekali di awal • ±3 menit',
    uiLocationHint: 'Bilah atas (Header), Menu navigasi kiri (Sidebar), dan layar Pengaturan ruang kerja.',
    tujuan:
      'Membantu Bapak/Ibu Guru memahami tata letak layar utama AsesMerdeka, mengisi identitas sekolah untuk kop surat dokumen, serta memahami cara kerja penyimpanan data dan lisensi sebelum mulai menyusun administrasi semester.',
    kapanDigunakan:
      'Digunakan saat pertama kali membuka AsesMerdeka di laptop atau HP, saat berganti perangkat baru, atau sebelum mengunduh dokumen resmi ke format Word (.docx) agar nama guru, NIP, dan kepala sekolah terpasang rapi.',
    persiapan: [
      'Nama sekolah/madrasah, alamat sekolah, dan baris kop instansi/dinas.',
      'Nama lengkap Bapak/Ibu Guru serta NIP/NUPTK (jika ada).',
      'Nama lengkap Kepala Sekolah/Madrasah serta NIP (jika ada).',
      'Kode lisensi resmi (jika sudah membeli melalui Admin) — opsional, karena Mode Pratinjau tetap bisa dipakai untuk mencoba alur kerja.',
    ],
    langkahLangkah: [
      {
        action: 'Kenali menu navigasi utama di sebelah kiri (atau tombol garis tiga di pojok kiri atas HP)',
        detail:
          'Menu kiri terbagi rapi menjadi 4 kelompok: "Perangkat Semester" (Peta TP & Modul Ajar, Alur Tujuan (ATP), Program Tahunan, Program Semester, Modul Projek P5), "Kelas Harian & Rapor" (Presensi Siswa, Jurnal Mengajar, Buku Nilai Asesmen, Auto-Deskripsi e-Rapor), "Supervisi & Ekspor" (Paket Siap Supervisi), dan "Evaluasi & Arsip" (Naskah Ujian STS & SAS, Bank Soal & Arsip, Buat Soal Evaluasi AI, Buat Rangkuman AI).',
      },
      {
        action: 'Kenali 5 penanda dan tombol di bilah atas (Header)',
        detail:
          'Di bagian kanan atas terdapat: (1) Indikator penyimpanan ("Tersimpan lokal" atau "Lokal & cloud"), (2) tombol "Profil sekolah" (ikon gedung/sekolah), (3) tombol "Lisensi" / "Lisensi aktif" (ikon kunci), (4) tombol "Panduan" (ikon buku, tempat buku panduan ini berada), dan (5) tombol "Bantuan" (ikon tanda tanya untuk FAQ dan mengirim laporan kendala).',
      },
      {
        action: 'Klik tombol "Profil sekolah" di kanan atas untuk mengisi kop surat & pengesahan',
        detail:
          'Isi "Instansi Dinas / Yayasan", "Nama Sekolah / Madrasah", "Alamat Lengkap Sekolah", "Kota / Kabupaten", "Nama Lengkap Bapak/Ibu Guru", dan "Nama Kepala Sekolah / Madrasah" beserta NIP bila ada.',
      },
      {
        action: 'Centang opsi kop resmi & tanda tangan bila diperlukan, lalu klik "Simpan Data Kelas"',
        detail:
          'Pastikan kotak centang kop resmi sekolah dan kolom tanda tangan pengesahan sesuai aturan sekolah Bapak/Ibu sebelum menekan tombol biru "Simpan Data Kelas".',
      },
      {
        action: 'Cek status lisensi melalui tombol "Lisensi" di kanan atas atau "Aktivasi lisensi" di menu kiri bawah',
        detail:
          'Tanpa kode lisensi, aplikasi berjalan pada "Mode Pratinjau" (ekspor Word dan arsip ZIP terkunci). Jika Bapak/Ibu sudah memiliki kode lisensi dari Admin, masukkan kode pada kolom aktivasi lalu klik "Aktivasi & Sinkronkan". Jika belum membeli, pilih salah satu dari dua paket resmi dan klik tombol beli untuk menghubungi Admin via WhatsApp.',
      },
      {
        action: 'Mulai workspace melalui layar "Pengaturan ruang kerja" dan klik "Buka ruang kerja"',
        detail:
          'Setelah Jenjang, Kelas, Mata Pelajaran, Semester, dan Rombel dipilih pada layar persiapan awal, klik tombol biru "Buka ruang kerja" untuk masuk ke daftar bab dan tujuan pembelajaran.',
      },
    ],
    hasilDiharapkan: [
      'Nama sekolah Bapak/Ibu tampil pada tombol "Profil sekolah" di bilah atas.',
      'Setiap kali membuat atau mengunduh dokumen Word (.docx), kop surat dan blok tanda tangan Guru + Kepala Sekolah sudah terisi otomatis.',
      'Status penyimpanan tampil jelas di bilah atas ("Tersimpan lokal" pada perangkat, atau "Lokal & cloud" bila lisensi aktif dan sinkronisasi server berjalan).',
    ],
    kesalahanUmum: [
      {
        mistake: 'Mengira aplikasi harus selalu login dengan password email sebelum bisa mencoba fitur.',
        solution:
          'AsesMerdeka langsung menyimpan pekerjaan secara otomatis di peramban (browser) perangkat yang sedang dibuka tanpa formulir pendaftaran akun yang rumit.',
      },
      {
        mistake: 'Langsung mencetak dokumen saat nama sekolah dan nama guru masih kosong atau bawaan contoh.',
        solution:
          'Klik tombol "Profil sekolah" di kanan atas terlebih dahulu, lengkapi identitas guru dan kepala sekolah, lalu klik "Simpan Data Kelas".',
      },
      {
        mistake: 'Menutup tab browser lalu khawatir data hilang karena tidak menemukan tombol "Save" di setiap kotak.',
        solution:
          'Periksa penanda "Tersimpan lokal" di bilah atas dan tombol "Unduh Backup Data (.json)" di "Profil sekolah" untuk cadangan berkala.',
      },
    ],
    langkahSelanjutnya: {
      text: 'Setelah Profil sekolah dan pemahaman tombol dasar beres, lanjutkan ke pengaturan Jenjang, Kelas, Mata Pelajaran, dan Semester aktif.',
      nextChapterId: 'bagian-2',
      nextChapterTitle: 'BAGIAN 2 — PERSIAPAN AWAL SEMESTER',
    },
    uiButtonPills: [
      { label: 'Profil sekolah', tone: 'outline', note: 'Di bilah atas: isi kop surat & tanda tangan' },
      { label: 'Lisensi', tone: 'outline', note: 'Di bilah atas: aktivasi kode & lihat paket' },
      { label: 'Panduan', tone: 'primary', note: 'Di bilah atas: buka panduan ini kapan saja' },
      { label: 'Bantuan', tone: 'outline', note: 'Di bilah atas: kirim laporan kendala' },
      { label: 'Buka ruang kerja', tone: 'success', note: 'Masuk ke administrasi kelas & mapel terpilih' },
    ],
    faqs: [
      {
        question: 'Apakah saya boleh mencoba aplikasi dulu sebelum membeli lisensi?',
        answer:
          'Boleh. Bapak/Ibu dapat menggunakan Mode Pratinjau untuk melihat alur kerja kelas, daftar CP/TP, serta tata letak aplikasi. Pengunduhan file Word (.docx), paket ZIP, dan pencetakan dokumen resmi aktif setelah Kode Lisensi diaktifkan.',
      },
      {
        question: 'Apa beda tombol Panduan dan tombol Bantuan di bilah atas?',
        answer:
          'Tombol "Panduan" membuka Buku Panduan Praktis Guru ini agar Bapak/Ibu bisa membaca tutorial langkah demi langkah. Tombol "Bantuan" membuka jendela Pusat Bantuan & Lapor Kendala untuk mengirim keluhan, masukan konten, atau error langsung ke pengembang.',
      },
    ],
    keywords: ['dashboard', 'awal', 'profil sekolah', 'kop surat', 'lisensi', 'pratinjau', 'tersimpan lokal', 'workspace'],
  },
  {
    id: 'bagian-2',
    number: 2,
    codeLabel: 'BAGIAN 2',
    category: 'Persiapan Awal Semester',
    shortTitle: 'Persiapan Awal Semester & Kelas',
    fullTitle: 'BAGIAN 2 — PERSIAPAN AWAL SEMESTER',
    subtitle: 'Memilih jenjang pendidikan, tingkat kelas, tahun ajaran, semester, mata pelajaran, rombongan belajar, dan memahami hubungan fase.',
    estimatedTime: 'Awal tahun ajaran / ganti semester • ±2 menit',
    uiLocationHint: 'Layar "Pengaturan ruang kerja", tombol "Ganti" di menu kiri atas, atau tautan "Ganti kelas/mapel" di footer.',
    tujuan:
      'Memastikan ruang kerja AsesMerdeka terpasang tepat sesuai Jenjang, Kelas, Fase Kurikulum Merdeka, Tahun Ajaran, Semester, Mata Pelajaran, dan Rombongan Belajar (Rombel) yang Bapak/Ibu ampu.',
    kapanDigunakan:
      'Setiap awal tahun ajaran baru, saat pergantian dari Semester 1 (Ganjil) ke Semester 2 (Genap), atau ketika Bapak/Ibu mengajar di lebih dari satu kelas/rombel atau mata pelajaran.',
    persiapan: [
      'Daftar kelas dan rombongan belajar yang diampu (misal Kelas IV A dan IV B, atau VIII A s.d. VIII C).',
      'Kepastian Semester aktif saat ini ("1 (Ganjil)" atau "2 (Genap)") serta Tahun Ajaran berjalan (misal "2026/2027").',
      'Nama mata pelajaran resmi yang diampu (termasuk mapel Kemenag MI/MTs/MA, Pendidikan Agama, Pendidikan Kepercayaan, atau Konsentrasi Keahlian SMK).',
    ],
    langkahLangkah: [
      {
        action: 'Buka pengaturan kelas ("Pengaturan ruang kerja" atau klik "Ganti" di kotak kelas pada menu kiri)',
        detail:
          'Di sebelah kiri atas (tepat di bawah logo AsesMerdeka) ada kotak ringkasan kelas aktif dengan tombol "Ganti". Mengklik tombol ini membuka pilihan Jenjang, Kelas, Rombel, dan Mata Pelajaran kapan saja.',
      },
      {
        action: 'Langkah 1 — Pilih Jenjang Pendidikan ("SD/MI", "SMP/MTs", "SMA/MA", atau "SMK")',
        detail:
          'Mengubah jenjang otomatis menyesuaikan pilihan tingkat kelas yang valid dan memetakan Fase Kurikulum Merdeka secara tepat.',
      },
      {
        action: 'Langkah 2 — Pilih Tingkat Kelas, Tahun Ajaran, dan Semester ("1 (Ganjil)" atau "2 (Genap)")',
        detail:
          'Pastikan Semester sesuai dengan dokumen yang sedang disusun. Perubahan Semester 1 dan Semester 2 memisahkan data Prota/Promes/Presensi/Nilai secara rapi per ruang lingkup semester tanpa menimpa semester lainnya.',
      },
      {
        action: 'Langkah 3 — Pilih Mata Pelajaran yang diampu',
        detail:
          'Jika mengajar di madrasah, klik tautan "Tampilkan mapel Kemenag (MI/MTs/MA)". Semua mata pelajaran termasuk Pendidikan Agama dan Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa tersedia dengan informasi regulasi BSKAP-nya. Untuk jenjang SMK, Seni Musik umum dipisahkan dengan tegas dari Konsentrasi Keahlian SMK. Jika mapel sekolah/muatan lokal belum ada di daftar, klik "Tulis nama mapel / konsentrasi kustom" lalu klik "Terapkan Mapel".',
      },
      {
        action: 'Langkah 4 — Atur dan pilih Rombongan Belajar (Rombel)',
        detail:
          'Klik pil rombel yang tersedia atau tambahkan rombel paralel baru (misal A, B, C atau nama rombel khusus sekolah Anda). Setiap rombel menyimpan daftar siswa, presensi, jurnal, dan nilai tersendiri agar tidak tertukar.',
      },
      {
        action: 'Periksa kotak "Ringkasan ruang kerja", lalu klik "Buka ruang kerja"',
        detail:
          'Pastikan Jenjang, Kelas, Semester, Mapel, dan Rombel aktif pada kotak ringkasan sudah benar sebelum menekan "Buka ruang kerja".',
      },
    ],
    hasilDiharapkan: [
      'Kotak kelas di menu kiri dan tajuk atas menampilkan Kelas/Rombel, Mata Pelajaran, dan Semester aktif yang benar.',
      'Pada bilah atas ruang kerja, tertera hubungan jenjang-kelas-fase secara otomatis (misal Kelas 4 -> Fase B, Kelas 8 -> Fase D).',
      'Jika mata pelajaran yang dipilih belum memiliki bank topik bawaan resmi, aplikasi menampilkannya secara jujur (bukan materi palsu) dan memberi akses langsung untuk menyalin/input CP dan membuat TP mandiri.',
    ],
    kesalahanUmum: [
      {
        mistake: 'Mengisi data nilai atau presensi sebelum mengecek apakah Semester masih di "1 (Ganjil)" padahal sekarang Semester 2.',
        solution:
          'Selalu periksa penanda Semester di bagian atas layar sebelum mengisi absensi, jurnal, atau nilai.',
      },
      {
        mistake: 'Mengira rombel A dan rombel B memakai daftar siswa yang sama padahal kelas berbeda.',
        solution:
          'Gunakan tombol pemilih "Rombel aktif" di bagian atas ruang kerja sebelum mengimpor Excel daftar nama siswa masing-masing rombel.',
      },
      {
        mistake: 'Mengira tidak ada daftar topik berarti mata pelajaran tidak didukung aplikasi.',
        solution:
          'Semua mata pelajaran dapat dipilih. Apabila bank topik resmi belum tersedia untuk mapel tertentu (misalnya beberapa mapel Agama, Kepercayaan, atau Konsentrasi Keahlian SMK), guru dapat langsung membuka Panel CP & Analisis CP untuk menurunkan draf TP resmi.',
      },
    ],
    langkahSelanjutnya: {
      text: 'Setelah kelas, semester, mapel, dan rombel siap, langkah berikutnya adalah memeriksa Capaian Pembelajaran dan menyusun urutan perencanaan semester.',
      nextChapterId: 'bagian-3',
      nextChapterTitle: 'BAGIAN 3 — MENYIAPKAN KURIKULUM DAN PERENCANAAN',
    },
    comparisonTable: {
      title: 'Hubungan Kelas, Fase, Mata Pelajaran, dan Semester di AsesMerdeka',
      caption: 'Memahami aturan pemetaan otomatis agar perangkat tidak salah kamar.',
      columns: ['Komponen', 'Cakupan Waktu / Tingkat', 'Pengaruhnya di Aplikasi'],
      rows: [
        {
          term: 'Fase (A s.d. F)',
          meaning: 'A: Kls 1-2 • B: Kls 3-4 • C: Kls 5-6 • D: Kls 7-9 • E: Kls 10 • F: Kls 11-12',
          simpleExample: 'CP dan ATP disusun dalam lingkup Fase lintas kelas & semester dalam fase yang sama.',
        },
        {
          term: 'Kelas & Mapel',
          meaning: 'Menentukan konteks kompetensi & bank topik yang dibuka.',
          simpleExample: 'Memilih "Seni Musik" Kelas 4 membuka materi Fase B berbeda dengan "Konsentrasi Keahlian" SMK.',
        },
        {
          term: 'Semester (1 Ganjil / 2 Genap)',
          meaning: 'Memisahkan Promes, Presensi, Jurnal, Buku Nilai, dan Rapor tiap semester.',
          simpleExample: 'Data nilai Semester 1 tidak akan tertimpa ketika Bapak/Ibu pindah ke Semester 2.',
        },
        {
          term: 'Rombel (A, B, C...)',
          meaning: 'Memisahkan daftar murid, kehadiran, dan nilai antarkelas paralel.',
          simpleExample: 'Kelas IV A dan IV B memiliki Buku Nilai dan Presensi masing-masing.',
        },
      ],
    },
    faqs: [
      {
        question: 'Bagaimana jika mata pelajaran muatan lokal atau kejuruan SMK saya tidak ada di daftar pilihan?',
        answer:
          'Di bawah pilihan Mata Pelajaran, klik tautan "Tulis nama mapel / konsentrasi kustom", ketik nama mapel atau konsentrasi keahlian sekolah Anda, lalu klik "Terapkan Mapel".',
      },
      {
        question: 'Mengapa beberapa mata pelajaran muncul keterangan "Bank topik resmi belum tersedia" atau "Perlu input guru"?',
        answer:
          'AsesMerdeka berprinsip tidak mengarang materi yang tidak sesuai kurikulum. Jika kurasi topik resmi BSKAP untuk mapel/fase tersebut belum dimasukkan, aplikasi menampilkan status jujur agar guru menyalin teks CP resmi lewat Panel CP dan menurunkan TP secara tepat.',
      },
    ],
    keywords: ['jenjang', 'kelas', 'fase', 'tahun ajaran', 'semester', 'mapel', 'mata pelajaran', 'rombel', 'kemenag', 'agama', 'kepercayaan', 'smk'],
  },
  {
    id: 'bagian-3',
    number: 3,
    codeLabel: 'BAGIAN 3',
    category: 'Kurikulum & Perencanaan',
    shortTitle: 'Menyiapkan Kurikulum (CP → TP → ATP → Prota/Promes)',
    fullTitle: 'BAGIAN 3 — MENYIAPKAN KURIKULUM DAN PERENCANAAN',
    subtitle: 'Urutan kerja CP → Analisis CP → TP → ATP → Prota → Promes, status verifikasi topik, serta persetujuan ATP Fase.',
    estimatedTime: 'Awal semester • ±5–10 menit',
    uiLocationHint: 'Tab "Perangkat mengajar" -> sub-tab "Peta TP & modul", "ATP", "Program tahunan", dan "Program semester".',
    tujuan:
      'Membantu Bapak/Ibu menyusun perencanaan semester secara urut dari hulu ke hilir agar Tujuan Pembelajaran (TP), Alur Tujuan Pembelajaran (ATP), Program Tahunan (Prota), dan Program Semester (Promes) saling terhubung tanpa data bentrok.',
    kapanDigunakan:
      'Pada awal semester saat menyusun perangkat perencanaan semester sebelum masuk kelas dan sebelum menyusun Modul Ajar atau mengisi Jurnal Mengajar.',
    persiapan: [
      'Dokumen Capaian Pembelajaran (CP) resmi terbaru untuk fase dan mata pelajaran Bapak/Ibu (atau salinan CP dari panduan BSKAP).',
      'Kalender pendidikan sekolah / perkiraan minggu efektif dan alokasi JP per minggu untuk mapel Bapak/Ibu.',
    ],
    langkahLangkah: [
      {
        action: '1. Periksa atau masukkan CP melalui tombol "Kelola Sumber CP & Analisis CP"',
        detail:
          'Di halaman "Peta TP & modul", tepat di bawah judul terdapat tombol biru "Kelola Sumber CP & Analisis CP". Klik tombol ini untuk melihat referensi CP yang tersedia, menempel teks CP resmi dari sekolah/BSKAP ("+ Input / Tempel CP Resmi"), dan menjalankan "Analisis CP -> Kandidat TP" untuk memecah CP menjadi butir Tujuan Pembelajaran.',
      },
      {
        action: '2. Periksa Bank Topik & status verifikasi pada tombol "Lihat Bank Topik & Progresi Semester"',
        detail:
          'Klik "Lihat Bank Topik & Progresi Semester" untuk meninjau topik Semester 1 dan Semester 2. Perhatikan dua status yang terpisah: (a) Status Verifikasi Sumber ("Terverifikasi dari Dokumen Resmi", "Berdasarkan Contoh Panduan Resmi", "Kurasi Internal — Perlu Review Guru", atau "Belum Tersedia"), dan (b) Status Tinjauan Pedagogis ("Belum Ditinjau" atau "Sudah Ditinjau Guru"). Jika ada topik yang perlu diperbaiki, klik tombol koreksi pada topik untuk menyimpan penyesuaian lokal sekolah.',
      },
      {
        action: '3. Lengkapi atau sesuaikan daftar TP di "Peta TP & modul"',
        detail:
          'Setiap kartu TP memiliki tombol "Edit", "Hapus", urutan panah naik/turun, status tinjauan guru ("Perlu Review Guru" -> "Sudah Ditinjau" -> "Disetujui Guru"), serta tombol "+ Tambah Materi". Pastikan alokasi JP tiap TP sudah masuk akal.',
      },
      {
        action: '4. Buka sub-tab "ATP" untuk menyusun Alur Tujuan Pembelajaran tingkat Fase',
        detail:
          'Di tab "ATP", periksa urutan seluruh TP dalam satu fase, atur prasyarat antar-TP bila ada, cek grafik keterkaitan urutan, atur alokasi kelas/semester ("Pemetaan Kelas/Tahun/Semester"), lalu klik "Setujui ATP Fase". Jika di kemudian hari Anda mengubah urutan atau kalimat substansi TP secara signifikan, status persetujuan otomatis mengingatkan "Perlu Ditinjau Ulang" agar guru meninjau ulang ATP.',
      },
      {
        action: '5. Buka sub-tab "Program tahunan" dan "Program semester"',
        detail:
          'Prota otomatis merangkum distribusi TP & JP untuk Semester 1 dan Semester 2 sepanjang tahun ajaran, sedangkan Promes memetakan minggu efektif dan pekan non-efektif (libur, STS, SAS). Sesuaikan pengaturan minggu efektif bila kalender daerah Bapak/Ibu berbeda, lalu ekspor Word (.docx) jika diperlukan.',
      },
    ],
    hasilDiharapkan: [
      'Daftar TP aktif tersimpan dengan kode unik yang terhubung langsung ke Jurnal, Modul Ajar, Buku Nilai, ATP, Prota, dan Promes.',
      'ATP berstatus "Disetujui Guru" dengan total JP Semester 1 dan Semester 2 yang konsisten.',
      'Tabel Prota dan matriks Promes langsung terisi otomatis dari daftar TP tersebut.',
    ],
    kesalahanUmum: [
      {
        mistake: 'Langsung mengisi Promes atau Jurnal sebelum daftar TP & alokasi JP-nya beres.',
        solution:
          'Susun dan rapikan daftar TP di "Peta TP & modul" serta urutannya di "ATP" lebih dahulu agar minggu di Promes dan materi di Jurnal langsung tepat.',
      },
      {
        mistake: 'Mengira semua bank topik bawaan aplikasi sudah divalidasi oleh ahli mapel eksternal.',
        solution:
          'Selalu periksa lencana status sumber dan tinjauan pedagogis pada topik. Aplikasi tidak mengeklaim tinjauan ahli jika belum tervalidasi; Bapak/Ibu dapat langsung menggunakan fitur koreksi topik untuk menyesuaikannya dengan kondisi sekolah.',
      },
      {
        mistake: 'Bingung mengapa persetujuan ATP berubah menjadi "Perlu Ditinjau Ulang".',
        solution:
          'Itu adalah fitur pengaman: ketika substansi/kalimat TP atau urutan di ATP diubah setelah disetujui, aplikasi memberi tahu agar Bapak/Ibu mengklik "Setujui ATP Fase" ulang supaya dokumen supervisi tetap konsisten.',
      },
    ],
    langkahSelanjutnya: {
      text: 'Dengan CP, TP, ATP, Prota, dan Promes yang sudah tertata, Bapak/Ibu siap menyusun Modul Ajar, LKPD, Rangkuman, dan Soal Evaluasi sebelum masuk kelas.',
      nextChapterId: 'bagian-4',
      nextChapterTitle: 'BAGIAN 4 — PERSIAPAN SEBELUM MENGAJAR',
    },
    importantCallout: {
      title: 'Kejujuran Status Bank Topik & CP',
      body: 'Hanya topik yang jelas sumber dokumen BSKAP-nya diberi label terverifikasi dari dokumen resmi. Topik "Kurasi Internal" ditampilkan secara terbuka sebagai bahan referensi awal dengan status pedagogis "Belum Ditinjau" hingga Bapak/Ibu meninjau atau menyesuaikannya sendiri.',
      tone: 'warning',
    },
    comparisonTable: {
      title: 'Perbedaan Sederhana: CP, Analisis CP, TP, ATP, Prota, dan Promes',
      caption: 'Contoh alur sederhana misalnya untuk mata pelajaran Seni Musik SD Fase B (Kelas 4).',
      columns: ['Istilah', 'Penjelasan Sederhana', 'Contoh Sederhana'],
      rows: [
        {
          term: 'CP (Capaian Pembelajaran)',
          meaning: 'Target akhir dari pemerintah yang harus dicapai murid pada akhir satu Fase (2 tahun).',
          simpleExample: 'Di akhir Fase B (Kelas 3-4), siswa mampu mengenali, meniru, dan mempraktikkan pola irama sederhana.',
        },
        {
          term: 'Analisis CP',
          meaning: 'Proses membedah kalimat CP menjadi Kompetensi (kata kerja) + Lingkup Materi.',
          simpleExample: 'Kompetensi: mengenali & meniru • Lingkup Materi: pola irama tepuk sederhana 4 ketuk.',
        },
        {
          term: 'TP (Tujuan Pembelajaran)',
          meaning: 'Target belajar konkret untuk 1 bab/topik pelajaran hasil dari Analisis CP.',
          simpleExample: 'TP 4.1: Siswa mampu menepuk dan membaca notasi pola irama birama 4/4 secara stabil.',
        },
        {
          term: 'ATP (Alur Tujuan Pembelajaran)',
          meaning: 'Urutan logis seluruh TP dari awal fase hingga akhir fase (dari mudah ke kompleks).',
          simpleExample: 'Mengenal bunyi/irama dulu (TP 4.1) -> mengenal tinggi-rendah nada (TP 4.2) -> bermain musik ritmis bersama.',
        },
        {
          term: 'Prota (Program Tahunan)',
          meaning: 'Pembagian jumlah Jam Pelajaran (JP) per TP untuk Semester 1 dan Semester 2 selama 1 tahun.',
          simpleExample: 'Semester 1 total 36 JP (4 TP), Semester 2 total 36 JP (4 TP).',
        },
        {
          term: 'Promes (Program Semester)',
          meaning: 'Penjadwalan minggu ke berapa setiap TP diajarkan dalam kalender semester aktif.',
          simpleExample: 'TP 4.1 diajarkan di Juli Minggu 3–4 (4 JP) dan Agustus Minggu 1 (2 JP).',
        },
      ],
    },
    faqs: [
      {
        question: 'Apakah saya boleh mengubah atau menghapus TP bawaan aplikasi?',
        answer:
          'Ya. Di setiap kartu TP terdapat tombol "Edit" dan "Hapus". Jika suatu saat ingin mengembalikan ke daftar bawaan standar, gunakan tombol "Standar Kurikulum Merdeka" di kanan atas Peta TP.',
      },
    ],
    keywords: ['cp', 'capaian pembelajaran', 'analisis cp', 'tp', 'tujuan pembelajaran', 'atp', 'prota', 'promes', 'bank topik', 'verifikasi', 'peninjauan'],
  },
  {
    id: 'bagian-4',
    number: 4,
    codeLabel: 'BAGIAN 4',
    category: 'Persiapan Mengajar',
    shortTitle: 'Modul Ajar, Materi, LKPD, Soal Evaluasi & Ujian',
    fullTitle: 'BAGIAN 4 — PERSIAPAN SEBELUM MENGAJAR',
    subtitle: 'Membuat Modul Ajar (RPP), Rangkuman Materi, LKPD Siswa, Soal Evaluasi AI, Naskah Ujian STS/SAS, P5, serta ekspor Word & cetak PDF.',
    estimatedTime: 'Malam / H-1 sebelum masuk kelas • ±2–5 menit',
    uiLocationHint: 'Tombol aksi di bawah tiap kartu bab pada "Peta TP & Modul Ajar", serta kelompok menu kiri "Evaluasi & Arsip".',
    tujuan:
      'Mempercepat penyusunan perangkat tatap muka kelas (Modul Ajar/RPP, LKPD, bahan bacaan ringkas, dan soal evaluasi/ujian) langsung dari TP aktif tanpa mengetik ulang identitas sekolah.',
    kapanDigunakan:
      'Harian/mingguan sebelum masuk kelas untuk mengajar bab tertentu, saat membutuhkan lembar latihan siswa untuk difotokopi, atau menjelang ulangan harian, STS (Sumatif Tengah Semester), dan SAS (Sumatif Akhir Semester).',
    persiapan: [
      'Identitas sekolah dan guru di "Profil sekolah" sudah diisi agar kop surat dan tanda tangan muncul rapi.',
      'TP dan materi pokok pada menu "Peta TP & Modul Ajar" sudah sesuai dengan bab yang akan diajarkan besok.',
    ],
    langkahLangkah: [
      {
        action: 'Untuk pegangan RPP guru: klik tombol "Modul Ajar" di bawah kartu bab yang akan diajarkan',
        detail:
          'Di halaman Modul Ajar, pilih model pembelajaran (PBL, PjBL, Inkuiri, Diferensiasi, dll.), tambahkan konteks lokal bila diinginkan, lalu klik tulisan mana saja di dokumen untuk mengedit langsung. Gunakan "✨ Buat / Regenerasi AI" jika ingin draf disusun lebih kontekstual oleh AI.',
      },
      {
        action: 'Untuk bahan belajar/rangkuman siswa: klik tombol "Rangkuman" (atau "Atur Rangkuman") di kartu TP',
        detail:
          'Alternatif lainnya, gunakan menu kiri "Buat Rangkuman AI" untuk memilih gaya bahasa bacaan (SD/SMP ceria, infografis poin kunci, atau analitis SMA/SMK) dan mengunduh ringkasan siap cetak.',
      },
      {
        action: 'Untuk lembar kerja tugas murid: klik tombol "LKPD Siswa" di bawah kartu bab',
        detail:
          'Pilih jenis aktivitas LKPD (studi kasus, eksperimen, proyek, atau latihan terbimbing), periksa langkah kerja dan rubrik penilaiannya, lalu edit teks bila perlu. Tersimpan otomatis ke perangkat.',
      },
      {
        action: 'Untuk ulangan harian / kuis bab: klik "Buat Soal Evaluasi" (atau "Atur Soal") di kartu TP',
        detail:
          'Untuk pengaturan jumlah PG, PGK, Uraian, level kognitif, dan kisi-kisi yang rinci, gunakan "Atur Soal" atau menu kiri "Buat Soal Evaluasi AI". Setelah jadi, dokumen tampil dengan 3 tampilan yang dapat ditukar: Lembar Soal, Kisi-Kisi & Kartu Soal, serta Panduan & Rubrik Guru. Semua hasil tersimpan di menu "Bank Soal & Arsip".',
      },
      {
        action: 'Untuk ujian tengah/akhir semester: buka menu kiri "Naskah Ujian STS & SAS"',
        detail:
          'Pilih tipe ujian ("STS" atau "SAS"), atur jumlah soal per tipe (PG, PGK, Uraian), pilih sumber TP atau Bank Soal yang sudah dibuat, klik susun naskah, lalu cek tab Soal, LJK, Kunci Jawaban, dan Matriks Kisi-Kisi.',
      },
      {
        action: 'Simpan ke komputer atau cetak fisik melalui tombol "Unduh Word (.docx)" atau "Cetak / PDF"',
        detail:
          'Di kanan atas setiap penampil dokumen (Modul Ajar, LKPD, Soal Evaluasi, Rangkuman, Ujian STS/SAS, dan Modul Projek P5), terdapat tombol biru "Unduh Word (.docx)" agar bisa dibuka dan disesuaikan lagi di Microsoft Word, serta tombol "Cetak / PDF" untuk mencetak atau menyimpan PDF.',
      },
    ],
    hasilDiharapkan: [
      'Dokumen Modul Ajar, LKPD, Rangkuman, dan Soal Evaluasi langsung mencantumkan nama sekolah, kelas, semester, tujuan pembelajaran (TP), dan tanda tangan secara otomatis.',
      'Hasil suntingan guru pada Modul Ajar dan LKPD tersimpan otomatis ke penyimpanan lokal (ditandai status "Tersimpan") dan file Word (.docx) berhasil diunduh saat lisensi aktif.',
    ],
    kesalahanUmum: [
      {
        mistake: 'Mengklik tombol unduh Word (.docx) atau cetak pada Mode Pratinjau lalu mengira tombol error.',
        solution:
          'Mode Pratinjau memang mengunci ekspor dokumen Word, ZIP, dan cetak. Aktifkan Kode Lisensi di tombol "Lisensi" untuk membuka semua ekspor dan pencetakan tanpa batas.',
      },
      {
        mistake: 'Mencari ulang soal yang minggu lalu dibuat karena lupa di mana tempat penyimpanannya.',
        solution:
          'Buka menu kiri "Bank Soal & Arsip"; seluruh asesmen yang pernah dibuat tersimpan di sana dan bisa dibuka ulang atau dihapus bila tidak dipakai.',
      },
    ],
    langkahSelanjutnya: {
      text: 'Setelah perangkat tatap muka siap dan kelas sudah dilaksanakan, buka menu harian untuk mengisi Presensi Siswa dan Jurnal Mengajar.',
      nextChapterId: 'bagian-5',
      nextChapterTitle: 'BAGIAN 5 — KEGIATAN HARIAN GURU',
    },
    uiButtonPills: [
      { label: 'Modul Ajar', tone: 'outline', note: 'Buka & edit RPP per TP' },
      { label: 'LKPD Siswa', tone: 'outline', note: 'Lembar aktivitas & tugas murid' },
      { label: 'Buat Soal Evaluasi', tone: 'primary', note: 'Susun soal HOTS, kisi-kisi, & kunci' },
      { label: 'Rangkuman', tone: 'outline', note: 'Ringkasan materi siap cetak untuk murid' },
      { label: 'Unduh Word (.docx)', tone: 'primary', note: 'Simpan berkas Word resmi ber-kop sekolah' },
    ],
    faqs: [
      {
        question: 'Apakah AsesMerdeka juga menyediakan Modul Projek P5?',
        answer:
          'Ya. Di menu navigasi kiri bagian "Perangkat Semester", pilih menu "Modul Projek P5" untuk menyusun draf tema, dimensi Profil Pelajar Pancasila, alur aktivitas projek, dan mengekspor berkas Word-nya.',
      },
      {
        question: 'Bagaimana jika koneksi internet sedang lambat saat memakai tombol AI?',
        answer:
          'AsesMerdeka menyediakan opsi template adaptif / draf cadangan offline terstruktur sehingga guru tetap memiliki kerangka Modul Ajar, LKPD, dan Soal yang rapi untuk diedit manual meski internet bermasalah.',
      },
    ],
    keywords: ['modul ajar', 'rpp', 'materi', 'rangkuman', 'lkpd', 'generator soal', 'sts', 'sas', 'bank soal', 'p5', 'word', 'docx', 'cetak'],
  },
  {
    id: 'bagian-5',
    number: 5,
    codeLabel: 'BAGIAN 5',
    category: 'Kegiatan Harian Guru',
    shortTitle: 'Ruang Kerja Harian: Presensi & Jurnal Mengajar',
    fullTitle: 'BAGIAN 5 — KEGIATAN HARIAN GURU',
    subtitle: 'Mengelola daftar siswa asli, mencatat Presensi Siswa (H/S/I/A), menulis Jurnal Mengajar harian, dan memastikan pekerjaan tersimpan.',
    estimatedTime: 'Setiap selesai jam mengajar • ±1–2 menit',
    uiLocationHint: 'Menu kiri "Kelas Harian & Rapor" -> "Presensi Siswa" & "Jurnal Mengajar", atau tab "Kelas harian & rapor" di area utama.',
    tujuan:
      'Memudahkan Bapak/Ibu mengelola absensi siswa tiap pertemuan dan mengisi jurnal agenda mengajar harian tanpa mengetik ulang topik/TP maupun menghitung rekap H/S/I/A secara manual.',
    kapanDigunakan:
      'Di awal semester (saat memasukkan nama siswa asli dari Excel/Dapodik ke kelas baru), serta rutin setelah selesai mengajar di kelas untuk mencatat kehadiran dan ringkasan kegiatan pembelajaran hari itu.',
    persiapan: [
      'Daftar nama siswa asli (bisa disalin langsung kolom nama/NIS/jenis kelamin dari Excel/Dapodik).',
      'Pastikan "Rombel aktif" dan "Semester" di bagian atas sudah sesuai kelas yang baru selesai diajar.',
    ],
    langkahLangkah: [
      {
        action: 'Buka menu "Presensi Siswa" di menu sebelah kiri (atau sub-tab "Presensi siswa")',
        detail:
          'Jika kelas masih menampilkan pemberitahuan kuning "Data Simulasi / Contoh", klik "Impor Excel" (atau klik tombol mulai kelas kosong / "+ Tambah Siswa") untuk mengganti seluruh nama contoh dengan nama siswa kelas Bapak/Ibu yang sesungguhnya.',
      },
      {
        action: 'Catat kehadiran murid per pertemuan dengan status Hadir (H), Sakit (S), Izin (I), atau Alfa (A)',
        detail:
          'Di layar HP tersedia Mode Fokus per pertemuan serta tombol cepat "Tandai Semua Hadir", lalu cukup ketuk siswa yang Sakit, Izin, atau Alfa. Persentase kehadiran per siswa dan total kelas dihitung otomatis.',
      },
      {
        action: 'Buka menu "Jurnal Mengajar" untuk mencatat agenda pembelajaran hari ini',
        detail:
          'Klik "+ Tambah Agenda" (atau edit baris agenda pertemuan). Pilih tanggal, jam pelajaran, jumlah JP, serta pilih Kode TP dari daftar TP aktif — materi pokok dan keterkaitan TP langsung terhubung otomatis tanpa ketik ulang.',
      },
      {
        action: 'Tambahkan uraian kegiatan, catatan siswa tidak hadir (dapat disinkronkan dari Presensi), serta refleksi',
        detail:
          'Pilih status keterlaksanaan ("Terlaksana", "Perlu Tindak Lanjut", atau "Ditunda / Jadwal Ulang") lalu klik simpan pada formulir agenda.',
      },
      {
        action: 'Pastikan data tersimpan di perangkat atau tersinkron ke Cloud',
        detail:
          'Setiap perubahan presensi dan jurnal otomatis disimpan ke penyimpanan lokal peramban dalam sekejap dan langsung masuk dalam dokumen Supervisi maupun e-Rapor. Jika lisensi aktif dan Cloud terhubung, periksa status di bilah atas hingga menunjukkan "Lokal & cloud".',
      },
    ],
    hasilDiharapkan: [
      'Daftar siswa asli Bapak/Ibu tersimpan di menu Presensi sekaligus langsung muncul di Buku Nilai dan Auto-Deskripsi e-Rapor untuk rombel tersebut.',
      'Rekap total Hadir (H), Sakit (S), Izin (I), Alfa (A) dan total JP terlaksana pada Jurnal tampil akurat.',
      'Tersedia juga tombol "Unduh Presensi (.docx)" dan "Unduh Jurnal (.docx)" bila ingin dicetak terpisah.',
    ],
    kesalahanUmum: [
      {
        mistake: 'Mengisi nilai/absen di rombel A padahal maksudnya rombel B karena lupa mengganti Rombel aktif.',
        solution:
          'Selalu cek teks "Rombel aktif" di bagian atas layar sebelum mengetuk tombol kehadiran atau menambah jurnal.',
      },
      {
        mistake: 'Mengira data contoh siswa (simulasi) adalah data sekolah sungguhan lalu langsung mengekspor ke Word.',
        solution:
          'AsesMerdeka memberi spanduk penanda jelas jika kelas masih menggunakan data simulasi dan menanyakan konfirmasi saat ekspor. Impor daftar siswa asli dari menu "Impor Excel" atau mulai kelas kosong agar berkas resmi bersih 100% berisi siswa Anda.',
      },
    ],
    langkahSelanjutnya: {
      text: 'Setelah daftar siswa, absensi, dan jurnal kelas berjalan, Bapak/Ibu siap mencatat nilai formatif, STS, dan SAS di Buku Nilai.',
      nextChapterId: 'bagian-6',
      nextChapterTitle: 'BAGIAN 6 — PENILAIAN DAN RAPOR',
    },
    importantCallout: {
      title: 'Cara Membedakan Data Asli dan Contoh Simulasi',
      body: 'Jika Bapak/Ibu hanya ingin melihat contoh tampilan aplikasi, klik tombol "Pratinjau Data Demo". Data asli kelas Bapak/Ibu tetap terpisah aman dan tidak akan tertimpa oleh data contoh simulasi.',
      tone: 'info',
    },
    faqs: [
      {
        question: 'Bagaimana jika ada murid baru masuk atau pindah kelas di tengah semester?',
        answer:
          'Di menu Presensi Siswa tersedia tombol "+ Tambah Siswa" untuk menambah murid baru, tombol edit di baris siswa, serta fitur pemindahan/arsip siswa antar-rombel agar catatan semester tidak berantakan.',
      },
      {
        question: 'Apakah saya harus memasukkan nama siswa ulang di Buku Nilai dan e-Rapor?',
        answer:
          'Tidak perlu. Daftar siswa yang Anda impor atau tambahkan di Presensi Siswa otomatis digunakan bersama di Buku Nilai Asesmen dan Auto-Deskripsi e-Rapor pada kelas/rombel tersebut.',
      },
    ],
    keywords: ['presensi', 'absensi', 'siswa', 'impor excel', 'jurnal mengajar', 'agenda', 'harian', 'simulasi'],
  },
  {
    id: 'bagian-6',
    number: 6,
    codeLabel: 'BAGIAN 6',
    category: 'Penilaian & Rapor',
    shortTitle: 'Buku Nilai, KKTP, Bukti Asesmen & e-Rapor',
    fullTitle: 'BAGIAN 6 — PENILAIAN DAN RAPOR',
    subtitle: 'Mengisi nilai Formatif/STS/SAS, mengatur bobot & KKTP, membedakan "Belum Dinilai" vs "Perlu Bimbingan", mengelola Bukti Asesmen Sub-TP, Analisis Ketercapaian, dan Auto-Deskripsi e-Rapor.',
    estimatedTime: 'Saat ulangan & akhir semester • ±5 menit',
    uiLocationHint: 'Menu kiri "Kelas Harian & Rapor" -> "Buku Nilai Asesmen" & "Auto-Deskripsi e-Rapor".',
    tujuan:
      'Membantu guru mengolah nilai harian (Formatif per TP), STS, dan SAS menjadi Nilai Akhir dan predikat KKTP yang objektif, mengelola bukti asesmen tingkat Sub-TP, membaca analisis ketercapaian kelas, serta menghasilkan kalimat deskripsi e-Rapor tanpa mengarang status siswa yang belum dinilai.',
    kapanDigunakan:
      'Setiap selesai ulangan/tugas per TP, setelah UTS/STS dan UAS/SAS, saat menentukan tindak lanjut remedial atau pengayaan, dan menjelang pengisian e-Rapor akhir semester.',
    persiapan: [
      'Daftar nama siswa kelas Bapak/Ibu sudah terisi (dari menu Presensi atau tombol "Impor Excel").',
      'Daftar Tujuan Pembelajaran (TP) aktif untuk mata pelajaran dan semester tersebut sudah sesuai.',
      'Ketentuan bobot nilai sekolah (standar aplikasi 50% Formatif, 25% STS, 25% SAS — dapat diubah) dan batas minimal tuntas KKTP (misal 71 atau 75).',
    ],
    langkahLangkah: [
      {
        action: 'Buka "Buku Nilai Asesmen" lalu klik "Atur Bobot & KKTP" jika kebijakan sekolah berbeda',
        detail:
          'Sesuaikan persentase Formatif (%), STS (%), SAS (%), serta Praktik/Proyek (%) hingga total berjumlah tepat 100%. Atur angka "KKTP Min. Tuntas" (misal 75) dan "Ambang Klasikal (%)" untuk saran penguatan kelas, lalu klik "Simpan Bobot & KKTP".',
      },
      {
        action: 'Masukkan nilai Formatif pada kolom tiap kode TP, lalu masukkan nilai STS dan SAS',
        detail:
          'Biarkan kolom nilai kosong ("-") jika murid belum mengikuti penilaian. Jangan menuliskan angka 0 hanya karena tugas belum dinilai, kecuali memang nilainya nol murni — agar aplikasi membedakan antara "Belum Dinilai" dan "Perlu Bimbingan".',
      },
      {
        action: 'Catat bukti rincian per indikator Sub-TP lewat tombol "Bukti" / "Bukti Asesmen" pada siswa (jika tersedia Sub-TP)',
        detail:
          'Di baris siswa tersedia akses modal Bukti Asesmen Sub-TP untuk mencatat ketercapaian tiap indikator Sub-TP, jenis bukti (tertulis/observasi/kinerja), dan catatan guru bila diperlukan.',
      },
      {
        action: 'Klik tombol "Analisis TP" untuk membaca ringkasan ketercapaian dan rekomendasi tindak lanjut',
        detail:
          'Panel "Ringkasan Ketercapaian Per TP & Rekomendasi Tindak Lanjut" menampilkan berapa murid yang Tercapai, Perlu Bimbingan, Belum Dinilai, serta persentase ketuntasan yang dihitung hanya dari murid yang sudah memiliki bukti penilaian valid.',
      },
      {
        action: 'Buka menu "Auto-Deskripsi e-Rapor" untuk menyusun dan memfinalisasi narasi rapor',
        detail:
          'Periksa nilai akhir, predikat KKTP, capaian tertinggi, serta bagian yang perlu bimbingan untuk setiap siswa. Klik ikon salin ("Salin") di kartu siswa untuk menempel langsung ke aplikasi e-Rapor sekolah/kementerian, atau ubah status rapor dari "Draf" ke "Final" setelah lengkap. Anda juga dapat mengunduh rekapnya lewat "Unduh Nilai (.docx)" atau unduh rekap e-Rapor Word.',
      },
    ],
    hasilDiharapkan: [
      'Nilai Akhir terhitung otomatis sesuai bobot aktif (hanya menampilkan nilai bila komponen penilaian sudah diisi; siswa yang masih kosong ditandai jujur "Belum Dinilai").',
      'Murid dengan nilai di bawah batas "KKTP Min. Tuntas" ditandai "Perlu Bimbingan" dan muncul tepat pada deskripsi capaian yang perlu penguatan di e-Rapor.',
      'Panel "Analisis TP" menunjukkan TP mana yang perlu bimbingan individu, kelompok kecil, atau penguatan klasikal.',
    ],
    kesalahanUmum: [
      {
        mistake: 'Bingung membedakan status "Belum Dinilai" dengan "Perlu Bimbingan".',
        solution:
          '"Belum Dinilai" artinya kolom nilai siswa memang masih kosong/belum lengkap diinput sehingga belum masuk perhitungan ketuntasan. "Perlu Bimbingan" artinya nilai siswa SUDAH diisi, tetapi angkanya masih di bawah ambang batas KKTP Min. Tuntas.',
      },
      {
        mistake: 'Mengubah persentase bobot nilai tetapi totalnya bukan 100%.',
        solution:
          'Pastikan penjumlahan Formatif + STS + SAS + Praktik sama dengan 100% agar tombol "Simpan Bobot & KKTP" menjadi aktif.',
      },
      {
        mistake: 'Memaksakan finalisasi e-Rapor saat nilai STS/SAS atau Formatif siswa masih kosong.',
        solution:
          'Sistem menahan status final jika ada komponen nilai wajib yang masih kosong ("Belum Lengkap"), dan menyebutkan komponen mana yang belum diisi.',
      },
    ],
    langkahSelanjutnya: {
      text: 'Setelah nilai dan deskripsi rapor terolah rapi, Bapak/Ibu dapat mengemas seluruh berkas perencanaan, harian, dan penilaian dalam menu Paket Siap Supervisi.',
      nextChapterId: 'bagian-7',
      nextChapterTitle: 'BAGIAN 7 — SUPERVISI DAN ADMINISTRASI',
    },
    simulationExampleTable: {
      title: 'Contoh Sederhana Perbedaan "Belum Dinilai" vs "Perlu Bimbingan" & Predikat KKTP',
      badgeLabel: '[CONTOH DATA SIMULASI — Bukan Data Siswa Nyata]',
      description:
        'Misal KKTP Min. Tuntas = 75, dengan bobot Formatif 50% + STS 25% + SAS 25%. Data di bawah hanya contoh simulasi cara baca sistem:',
      headers: ['Siswa (Contoh)', 'Formatif', 'STS', 'SAS', 'Nilai Akhir', 'Status di AsesMerdeka'],
      rows: [
        ['Siswa Contoh 1', '85, 88', '84', '86', '85.8 (86)', 'Cakap / Sangat Baik (Tuntas ≥ 75)'],
        ['Siswa Contoh 2', '64, 68', '65', '66', '65.8 (66)', 'Perlu Bimbingan (Sudah dinilai, < 75)'],
        ['Siswa Contoh 3', 'Kosong (-)', 'Kosong (-)', 'Kosong (-)', '—', 'Belum Dinilai (Tidak dianggap gagal / tidak dihitung gagal)'],
      ],
    },
    uiButtonPills: [
      { label: 'Atur Bobot & KKTP', tone: 'outline', note: 'Ubah persentase bobot & batas KKTP kelas' },
      { label: 'Analisis TP', tone: 'primary', note: 'Lihat persentase tuntas per TP & Sub-TP' },
      { label: 'Impor Excel', tone: 'outline', note: 'Masukkan daftar nama siswa kelas asli' },
      { label: 'Auto-Deskripsi e-Rapor', tone: 'outline', note: 'Salin kalimat rapor per siswa atau finalisasi' },
    ],
    faqs: [
      {
        question: 'Apakah nilai kosong otomatis dianggap 0 dalam rata-rata kelas?',
        answer:
          'Tidak. Siswa yang kolom nilainya masih kosong ditandai sebagai "Belum Dinilai" dan tidak dihitung sebagai siswa gagal atau dipaksa menjadi angka nol, sehingga persentase ketuntasan di Analisis TP tetap jujur sesuai siswa yang sudah dinilai.',
      },
      {
        question: 'Bisakah kalimat deskripsi e-Rapor diedit manual jika guru ingin menambahkan catatan khusus?',
        answer:
          'Bisa. Setelah mengklik tombol salin ke e-Rapor, atau sebelum difinalisasi, Bapak/Ibu tetap memegang kendali penuh atas catatan rapor resmi sekolah.',
      },
    ],
    keywords: ['nilai', 'buku nilai', 'kktp', 'belum dinilai', 'perlu bimbingan', 'bukti asesmen', 'analisis ketercapaian', 'rapor', 'e-rapor', 'formatif', 'sts', 'sas'],
  },
  {
    id: 'bagian-7',
    number: 7,
    codeLabel: 'BAGIAN 7',
    category: 'Supervisi & Administrasi',
    shortTitle: 'Paket Siap Supervisi & Ekspor Dokumen (.docx / .zip)',
    fullTitle: 'BAGIAN 7 — SUPERVISI DAN ADMINISTRASI',
    subtitle: 'Menyiapkan seluruh berkas pemeriksaan Kepala Sekolah/Pengawas (01–09), Unduh Master Bundel (.docx), Unduh Arsip (.zip), dan cetak.',
    estimatedTime: 'Menjelang supervisi / akhir semester • ±1 menit',
    uiLocationHint: 'Menu kiri "Supervisi & Ekspor" -> "Paket Siap Supervisi" (atau tab "Paket supervisi").',
    tujuan:
      'Mengumpulkan seluruh administrasi guru dalam satu tempat agar Bapak/Ibu tidak perlu menyusun atau mengekspor file satu per satu saat jadwal supervisi akademik maupun pengarsipan akhir semester.',
    kapanDigunakan:
      'Saat ada pemeriksaan administrasi oleh Kepala Sekolah atau Pengawas Sekolah, saat akreditasi, maupun pada akhir semester untuk mengarsipkan perangkat lengkap di laptop/flashdisk.',
    persiapan: [
      'Lisensi Guru Mandiri atau Lisensi Kolektif Sekolah sudah diaktifkan (karena ekspor Word/ZIP dan cetak terkunci di Mode Pratinjau).',
      'Identitas sekolah, guru, dan kepala sekolah di "Profil sekolah" sudah lengkap.',
      'Data TP/ATP/Prota/Promes serta data siswa asli di Presensi dan Buku Nilai sudah diperiksa (bukan lagi data simulasi jika ingin diserahkan secara resmi).',
    ],
    langkahLangkah: [
      {
        action: 'Buka menu "Paket Siap Supervisi" di menu navigasi sebelah kiri',
        detail:
          'Di bagian atas panel tampil jumlah komponen siap (dari 9 berkas standar supervisi 01–09) dan ringkasan Telaah Pengawas.',
      },
      {
        action: 'Periksa daftar 9 dokumen resmi (kode 01 sampai 09)',
        detail:
          'Kesembilan berkas tersebut meliputi: 01. Identitas dan Perangkat Administrasi (Cover, Pengesahan, Instrumen Telaah Pengawas), 02. Referensi CP & TP, 03. Alur Tujuan Pembelajaran (ATP), 04. Program Tahunan (Prota), 05. Program Semester (Promes), 06. Modul Ajar (& lampiran LKPD), 07. Daftar Presensi Siswa, 08. Jurnal Mengajar Guru, dan 09. Buku Nilai & e-Rapor.',
      },
      {
        action: 'Jika ingin semua berkas tergabung dalam 1 file Word siap cetak, klik "Unduh master bundel (.docx)"',
        detail:
          'Master Bundel menggabungkan dokumen 01 sampai 09 secara berurutan lengkap dengan kop surat sekolah ke dalam 1 berkas Microsoft Word (`.docx`).',
      },
      {
        action: 'Jika pengawas meminta berkas per folder/file terpisah, klik "Unduh arsip per file (.zip)"',
        detail:
          'Aplikasi mengemas ke-9 dokumen `.docx` bernomor rapi (`01_...docx` s.d. `09_...docx`) dalam satu file `.zip`. Bapak/Ibu tinggal klik kanan "Extract All" di laptop.',
      },
      {
        action: 'Atau unduh satuan berkas mana saja & isi Instrumen Verifikasi Supervisi jika diperlukan',
        detail:
          'Setiap kartu dokumen 01–09 juga memiliki tombol unduh `.docx` tersendiri. Di bagian bawah halaman tersedia pula "Instrumen Verifikasi Supervisi" bila Kepala Sekolah/Pengawas ingin langsung menilai kelengkapan komponen (Ada / Perlu perbaikan / Tidak ada).',
      },
    ],
    hasilDiharapkan: [
      'Berkas `.docx` atau `.zip` terunduh ke folder Download browser dan dapat dibuka rapi di Microsoft Word atau LibreOffice untuk dicetak ke kertas A4/F4.',
      'Bila data kelas masih berstatus simulasi atau data lama yang belum dikonfirmasi, aplikasi memunculkan dialog konfirmasi jujur sebelum mengunduh agar dokumen simulasi tidak keliru diserahkan sebagai data resmi.',
    ],
    kesalahanUmum: [
      {
        mistake: 'Mengunduh file ZIP lalu bingung kenapa belum berbentuk file Word langsung di browser.',
        solution:
          'File `.zip` adalah map terkompresi yang berisi 9 file Word. Buka folder Downloads di Windows/laptop, klik kanan file `.zip` tersebut, lalu pilih "Extract All..." agar kesembilan file `.docx` muncul.',
      },
      {
        mistake: 'Menggunakan tombol "Cetak / PDF" tetapi ukuran kertas atau margin terpotong.',
        solution:
          'Untuk kontrol penuh ukuran kertas A4/F4 dan margin resmi sekolah, disarankan memilih "Unduh master bundel (.docx)" atau "Unduh arsip per file (.zip)" lalu mencetak langsung dari Microsoft Word.',
      },
    ],
    langkahSelanjutnya: {
      text: 'Terakhir, pelajari cara mengamankan pekerjaan Anda lewat Backup JSON / Cloud Sync dan cara menghubungi Pusat Bantuan jika menemukan kendala.',
      nextChapterId: 'bagian-8',
      nextChapterTitle: 'BAGIAN 8 — PENYIMPANAN, BACKUP, LISENSI & BANTUAN',
    },
    uiButtonPills: [
      { label: 'Unduh master bundel (.docx)', tone: 'primary', note: '1 file Word utuh berisi dokumen 01–09' },
      { label: 'Unduh arsip per file (.zip)', tone: 'outline', note: '1 file ZIP berisi 9 file Word terpisah' },
      { label: 'Pratinjau isi master bundel', tone: 'outline', note: 'Periksa kesiapan tiap dokumen 01–09' },
      { label: 'Cetak lembar daftar', tone: 'outline', note: 'Cetak ringkasan status kesiapan supervisi' },
    ],
    faqs: [
      {
        question: 'Apakah berkas Word dari Paket Supervisi sama isinya dengan file yang diunduh dari masing-masing menu?',
        answer:
          'Ya. Paket Siap Supervisi menggunakan pembangun dokumen `.docx` dan data aktual kelas yang persis sama dengan menu ATP, Prota, Promes, Modul Ajar, Presensi, Jurnal, Buku Nilai, dan e-Rapor.',
      },
    ],
    keywords: ['supervisi', 'paket siap supervisi', 'master bundel', 'zip', 'docx', 'word', 'cetak', 'kepala sekolah', 'pengawas'],
  },
  {
    id: 'bagian-8',
    number: 8,
    codeLabel: 'BAGIAN 8',
    category: 'Penyimpanan, Backup & Bantuan',
    shortTitle: 'Penyimpanan Lokal, Cloud Sync, Backup & Bantuan',
    fullTitle: 'BAGIAN 8 — PENYIMPANAN, BACKUP, LISENSI & BANTUAN',
    subtitle: 'Memahami perbedaan penyimpanan lokal vs Cloud Sync, mencadangkan & memulihkan data (.json), aktivasi ulang lisensi, FAQ, dan Lapor Kendala.',
    estimatedTime: 'Kapan saja dibutuhkan • ±2 menit',
    uiLocationHint: 'Indikator status di bilah atas, menu "Profil sekolah", modal "Lisensi", dan tombol "Bantuan".',
    tujuan:
      'Memastikan Bapak/Ibu tahu cara menjaga keamanan pekerjaan agar tidak hilang saat ganti browser/laptop, memahami batas penyimpanan lokal vs Cloud Sync secara jujur, serta mampu memulihkan data atau melapor kendala ke pengembang.',
    kapanDigunakan:
      'Sebelum membersihkan cache/history browser, saat pindah kerja antara laptop sekolah dan HP/laptop rumah, saat memasukkan kode lisensi ke perangkat kedua, atau ketika menemukan error di layar.',
    persiapan: [
      'Akses ke perangkat tempat pekerjaan terakhir Anda disimpan.',
      'Kode Lisensi asli Bapak/Ibu (dan Nama Singkat / PIN Pribadi Guru jika memakai Lisensi Kolektif Sekolah 25 Guru) bila ingin memakai Cloud Sync.',
    ],
    langkahLangkah: [
      {
        action: '1. Pahami penanda penyimpanan di bilah atas: Penyimpanan Lokal vs Cloud Sync',
        detail:
          'Pada Mode Pratinjau, data disimpan hanya secara lokal di penyimpanan peramban (localStorage) perangkat tersebut ("Tersimpan lokal") — sehingga bila Anda membersihkan data browser atau pindah ke komputer lain, data belum otomatis berpindah. Ketika lisensi PRO aktif dan server Cloud Sync tersedia, aplikasi menyinkronkan data workspace secara berkala ke server melalui koneksi HTTPS ("Lokal & cloud").',
      },
      {
        action: '2. Buat cadangan manual ke berkas aman: buka "Profil sekolah" -> klik "Unduh Backup Data (.json)"',
        detail:
          'Di bagian bawah modal "Profil sekolah" terdapat kotak biru "Cadangkan & Pulihkan Data Semester". Klik "Unduh Backup Data (.json)" untuk menyimpan seluruh profil sekolah, TP, daftar siswa, presensi, jurnal, nilai, dan bank soal ke dalam satu berkas `.json` di laptop/HP Anda. Simpan berkas ini di Google Drive atau flashdisk.',
      },
      {
        action: '3. Memulihkan data dari berkas cadangan: klik "Pulihkan Data (.json)"',
        detail:
          'Saat membuka AsesMerdeka di komputer baru atau setelah cache terhapus, buka "Profil sekolah" -> klik "Pulihkan Data (.json)" -> pilih berkas `.json` hasil cadangan Anda sebelumnya.',
      },
      {
        action: '4. Memulihkan pekerjaan antar-perangkat via Cloud Sync (jika memiliki Lisensi aktif)',
        detail:
          'Pada perangkat kedua (misal dari Laptop ke HP), klik "Lisensi", masukkan Kode Lisensi yang sama (dan Nama/PIN Guru bila kode Sekolah agar data Anda tidak tertukar dengan guru lain satu sekolah), lalu klik "Aktivasi & Sinkronkan". Jika muncul peringatan "Konflik Cloud" karena dua perangkat punya perubahan berbeda, pilih versi yang ingin dipertahankan pada panel resolusi konflik (aplikasi juga menyimpan snapshot cadangan pra-konflik).',
      },
      {
        action: '5. Cara melapor kendala teknis atau memberi masukan melalui tombol "Bantuan"',
        detail:
          'Klik tombol "Bantuan" di bilah atas (ikon tanda tanya). Pilih kategori kendala, ketik keluhan Bapak/Ibu secara singkat, dan isi kontak WhatsApp/nama secara opsional bila bersedia dihubungi balik. Halaman aktif, jenjang, kelas, dan mapel otomatis terlampir agar tim cepat memahami kendalanya. Lalu klik "Kirim Laporan Kendala".',
      },
    ],
    hasilDiharapkan: [
      'Pekerjaan guru memiliki dua lapisan penyelamatan: file cadangan `.json` di perangkat/Drive Bapak/Ibu, serta Cloud Sync otomatis untuk pemegang lisensi aktif saat server aktif.',
      'Laporan kendala melalui "Pusat Bantuan & Lapor Kendala" terkirim dengan status berhasil.',
    ],
    kesalahanUmum: [
      {
        mistake: 'Membuka mode Penyamaran (Incognito/Private Browser) saat mengerjakan administrasi satu semester.',
        solution:
          'Browser Incognito menghapus seluruh penyimpanan lokal saat jendela ditutup. Selalu gunakan jendela browser normal dan biasakan klik "Unduh Backup Data (.json)" sebulan sekali atau di akhir semester.',
      },
      {
        mistake: 'Memakai Lisensi Sekolah yang sama dengan rekan guru tetapi memakai Nama/PIN Guru yang sama.',
        solution:
          'Setiap guru pada Lisensi Kolektif Sekolah wajib menggunakan Nama Singkat / PIN Pribadi Guru yang berbeda (misal "BU_SITI_IPA" dan "PAK_BUDI_MTK") supaya riwayat kelas dan nilai masing-masing guru tetap terisolasi dan aman.',
      },
    ],
    langkahSelanjutnya: {
      text: 'Semua tahap penggunaan AsesMerdeka telah lengkap! Anda dapat kembali ke ruang kerja atau mencetak panduan ini sebagai pegangan di sekolah.',
    },
    importantCallout: {
      title: 'Informasi Jujur Tentang Keamanan Cloud Sync & Penyimpanan',
      body: 'Transpor Cloud Sync dilindungi koneksi terenkripsi HTTPS (TLS) dan otorisasi lisensi serta PIN Guru pada server, sedangkan penyimpanan lokal berada pada peramban perangkat Anda. Cloud Sync tidak memakai End-to-End Encryption (E2EE), sehingga pengelola server/database tetap dapat memproses struktur data sesuai layanan, dan Anda selalu disarankan menyimpan berkas Backup (.json) secara berkala di perangkat pribadi.',
      tone: 'info',
    },
    uiButtonPills: [
      { label: 'Unduh Backup Data (.json)', tone: 'outline', note: 'Simpan seluruh data kerja ke file laptop/HP' },
      { label: 'Pulihkan Data (.json)', tone: 'outline', note: 'Kembalikan seluruh data kerja dari file backup' },
      { label: 'Lisensi', tone: 'primary', note: 'Sinkronisasi antar-2 perangkat & resolusi konflik' },
      { label: 'Bantuan', tone: 'outline', note: 'Kirim laporan error / masukan ke pengembang' },
    ],
    faqs: [
      {
        question: 'Apakah saya bisa memakai 1 lisensi di Laptop sekolah dan HP pribadi?',
        answer:
          'Ya. Satu Lisensi Guru Mandiri mendukung maksimal 2 perangkat aktif (misalnya 1 Laptop + 1 HP), dan Lisensi Kolektif Sekolah mendukung hingga 25 Guru (masing-masing maks. 2 perangkat).',
      },
      {
        question: 'Bagaimana jika tombol "Hubungi Admin via WhatsApp" diperlukan saat membeli lisensi?',
        answer:
          'Pembelian online otomatis website sementara belum aktif pada rilis awal. Klik tombol "Lisensi" di bilah atas, pilih paket "Lisensi Guru Mandiri" (Rp 99.000) atau "Lisensi Kolektif Sekolah" (Rp 749.000), lalu klik tombol beli untuk melihat rincian dan menekan "Hubungi Admin via WhatsApp".',
      },
      {
        question: 'Bagaimana jika data di Laptop dan HP pernah teredit bersamaan dan muncul "Konflik Cloud"?',
        answer:
          'Klik badge "Konflik Cloud" di bilah atas (atau buka "Lisensi") untuk memilih versi lokal atau versi cloud yang ingin dipertahankan tanpa langsung menimpa diam-diam. Sistem juga menyimpan cadangan pra-konflik lokal.',
      },
    ],
    keywords: ['penyimpanan', 'lokal', 'cloud sync', 'backup', 'restore', 'json', 'pulihkan', 'lisensi', 'faq', 'bantuan', 'lapor kendala', 'pin guru'],
  },
];
