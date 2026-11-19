import type {
  CooperativeTechniqueVariant,
  PengalamanBelajarPM,
  PrinsipPembelajaranPM,
} from '../types/perangkatAjar';

/**
 * Tujuh model pedagogik aktif sebagai Single Source of Truth untuk label,
 * pratinjau sintaks, jalur AI, maupun generator fallback terstruktur.
 * Catatan: Pembelajaran Berdiferensiasi merupakan strategi lintas-model, bukan sintaks tersendiri.
 */
export type ModulAjarModelType =
  | 'pbl'
  | 'pjbl'
  | 'inquiry'
  | 'discovery'
  | 'cooperative'
  | 'explicit'
  | 'kontekstual';

export const LEGACY_MODUL_MODEL_IDS = ['diferensiasi'] as const;
export type LegacyModulAjarModelType = (typeof LEGACY_MODUL_MODEL_IDS)[number];

export const COOPERATIVE_TECHNIQUE_VARIANTS: readonly CooperativeTechniqueVariant[] = [
  'Think-Pair-Share',
  'Jigsaw',
  'STAD',
] as const;

export interface PedagogicalSyntaxStageDefinition {
  id: string;
  urutan: number;
  namaTahap: string;
  tujuanTahap: string;
  bobotDurasi: number;
  pengalamanBelajar?: PengalamanBelajarPM;
  prinsipPembelajaran?: PrinsipPembelajaranPM[];
}

export interface ModulAjarModelDefinition {
  id: ModulAjarModelType;
  label: string;
  namaSingkat: string;
  deskripsi: string;
  karakteristikKonteks: string;
  sintaksUtama: string[];
  tahapanSintaks: readonly PedagogicalSyntaxStageDefinition[];
  variasiTeknik?: readonly CooperativeTechniqueVariant[];
}

interface RawModelSpec {
  id: ModulAjarModelType;
  label: string;
  namaSingkat: string;
  deskripsi: string;
  karakteristikKonteks: string;
  tahapanSintaks: readonly PedagogicalSyntaxStageDefinition[];
  variasiTeknik?: readonly CooperativeTechniqueVariant[];
}

const RAW_MODEL_SPECS: readonly RawModelSpec[] = [
  {
    id: 'pbl',
    label: 'Problem-Based Learning (PBL)',
    namaSingkat: 'PBL (Pemecahan Masalah Autentik)',
    deskripsi:
      'Pembelajaran berbasis masalah nyata yang menuntut penalaran analitis, investigasi, dan pertanggungjawaban solusi.',
    karakteristikKonteks:
      'Menghadapkan siswa pada skenario masalah autentik yang belum memiliki solusi tunggal siap pakai.',
    tahapanSintaks: [
      {
        id: 'pbl_orientasi_masalah',
        urutan: 1,
        namaTahap: 'Orientasi pada Masalah Autentik',
        tujuanTahap:
          'Memahami konteks masalah nyata dan mengidentifikasi informasi yang diketahui serta perlu dicari.',
        bobotDurasi: 18,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'pbl_organisasi_belajar',
        urutan: 2,
        namaTahap: 'Mengorganisasikan Peserta Didik untuk Belajar',
        tujuanTahap:
          'Menyusun pertanyaan kerja, membagi peran penyelidikan kelompok, dan menentukan sumber bukti yang dibutuhkan.',
        bobotDurasi: 15,
        prinsipPembelajaran: ['Berkesadaran'],
      },
      {
        id: 'pbl_penyelidikan',
        urutan: 3,
        namaTahap: 'Membimbing Penyelidikan Mandiri dan Kelompok',
        tujuanTahap:
          'Mengumpulkan data/bukti konsep inti secara terbimbing untuk merancang solusi masalah.',
        bobotDurasi: 32,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'pbl_penyajian_karya',
        urutan: 4,
        namaTahap: 'Mengembangkan dan Menyajikan Hasil Karya',
        tujuanTahap:
          'Menyusun argumen pemecahan masalah dan mempresentasikan hasil karya di hadapan kelas.',
        bobotDurasi: 22,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Menggembirakan'],
      },
      {
        id: 'pbl_analisis_evaluasi',
        urutan: 5,
        namaTahap: 'Menganalisis dan Mengevaluasi Proses Pemecahan Masalah',
        tujuanTahap:
          'Menguji ketepatan solusi terhadap syarat masalah, meluruskan kekeliruan, dan menyimpulkan prinsip inti.',
        bobotDurasi: 13,
        pengalamanBelajar: 'Merefleksi',
        prinsipPembelajaran: ['Berkesadaran'],
      },
    ],
  },
  {
    id: 'pjbl',
    label: 'Project-Based Learning (PjBL)',
    namaSingkat: 'PjBL (Pembelajaran Berbasis Proyek)',
    deskripsi:
      'Pembelajaran berbasis proyek terencana untuk merancang, menguji, dan menghasilkan produk/artefak nyata.',
    karakteristikKonteks:
      'Menghasilkan produk terapan atau karya bermakna melalui desain, penjadwalan, pemantauan progres, dan uji kualitas.',
    tahapanSintaks: [
      {
        id: 'pjbl_pertanyaan_mendasar',
        urutan: 1,
        namaTahap: 'Penentuan Pertanyaan Mendasar (essential question)',
        tujuanTahap:
          'Merumuskan kebutuhan atau tantangan proyek nyata yang akan dijawab melalui penciptaan produk.',
        bobotDurasi: 14,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'pjbl_desain_perencanaan',
        urutan: 2,
        namaTahap: 'Mendesain Perencanaan Produk / Proyek',
        tujuanTahap:
          'Menentukan spesifikasi karya, bahan/alat, dan kriteria keberhasilan produk yang terukur.',
        bobotDurasi: 16,
        pengalamanBelajar: 'Memahami',
      },
      {
        id: 'pjbl_jadwal_peran',
        urutan: 3,
        namaTahap: 'Menyusun Jadwal dan Pembagian Peran Proyek',
        tujuanTahap:
          'Menetapkan lini masa pengerjaan, target capaian tiap tahap, serta tanggung jawab anggota tim.',
        bobotDurasi: 12,
        prinsipPembelajaran: ['Berkesadaran'],
      },
      {
        id: 'pjbl_monitor_progres',
        urutan: 4,
        namaTahap: 'Memonitor Pelaksanaan dan Progres Produk',
        tujuanTahap:
          'Mengerjakan prototipe/produk proyek dengan pencatatan kemajuan dan pendampingan teknis berkala.',
        bobotDurasi: 30,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Menggembirakan'],
      },
      {
        id: 'pjbl_uji_presentasi',
        urutan: 5,
        namaTahap: 'Menguji Hasil dan Mempresentasikan Produk',
        tujuanTahap:
          'Menguji kelayakan produk berdasarkan rubrik fungsi/konsep dan menyajikan demo karya kepada audiens.',
        bobotDurasi: 18,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'pjbl_evaluasi_refleksi',
        urutan: 6,
        namaTahap: 'Evaluasi Pengalaman dan Refleksi Proyek',
        tujuanTahap:
          'Merefleksikan kendala pembuatan produk, efektivitas kerja tim, dan pelajaran konseptual yang diperoleh.',
        bobotDurasi: 10,
        pengalamanBelajar: 'Merefleksi',
        prinsipPembelajaran: ['Berkesadaran'],
      },
    ],
  },
  {
    id: 'inquiry',
    label: 'Inquiry-Based Learning',
    namaSingkat: 'Inquiry (Penyelidikan Terbuka)',
    deskripsi:
      'Penyelidikan ilmiah-analitis yang berpusat pada perumusan pertanyaan investigasi, pengumpulan bukti empiris/tekstual, dan penyusunan argumen berbasis data.',
    karakteristikKonteks:
      'Berfokus pada penyelidikan fenomena, isu, atau sumber bukti yang tidak langsung memiliki satu kesimpulan seragam.',
    tahapanSintaks: [
      {
        id: 'inq_orientasi_fenomena',
        urutan: 1,
        namaTahap: 'Orientasi Fenomena dan Pemantik Inkuiri',
        tujuanTahap:
          'Mengamati fenomena atau bukti pembanding awal untuk memunculkan keingintahuan dan anomali konseptual.',
        bobotDurasi: 15,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'inq_rumusan_pertanyaan',
        urutan: 2,
        namaTahap: 'Merumuskan Pertanyaan Penyelidikan dan Dugaan Awal',
        tujuanTahap:
          'Mengubah rasa ingin tahu menjadi pertanyaan investigatif yang dapat diuji beserta hipotesis/dugaan awal.',
        bobotDurasi: 16,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Berkesadaran'],
      },
      {
        id: 'inq_investigasi_bukti',
        urutan: 3,
        namaTahap: 'Merancang dan Melaksanakan Investigasi Bukti',
        tujuanTahap:
          'Menjalankan pengamatan terarah, percobaan, atau penelusuran bukti primer guna menjawab pertanyaan penyelidikan.',
        bobotDurasi: 32,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Menggembirakan'],
      },
      {
        id: 'inq_analisis_argumen',
        urutan: 4,
        namaTahap: 'Menganalisis Temuan dan Menguji Argumen Berbasis Data',
        tujuanTahap:
          'Mengaitkan bukti dengan dugaan awal serta menguji klaim berdasarkan data atau alasan logis.',
        bobotDurasi: 22,
        pengalamanBelajar: 'Mengaplikasi',
      },
      {
        id: 'inq_komunikasi_refleksi',
        urutan: 5,
        namaTahap: 'Mengomunikasikan Simpulan dan Refleksi Penyelidikan',
        tujuanTahap:
          'Menyajikan simpulan berbasis bukti dan merefleksikan pergeseran pemahaman sebelum dan sesudah penyelidikan.',
        bobotDurasi: 15,
        pengalamanBelajar: 'Merefleksi',
        prinsipPembelajaran: ['Berkesadaran'],
      },
    ],
  },
  {
    id: 'discovery',
    label: 'Discovery Learning',
    namaSingkat: 'Discovery (Penemuan Konsep Terpandu)',
    deskripsi:
      'Penemuan konsep, aturan, atau prinsip yang sudah terdefinisi dalam kurikulum secara aktif melalui pengamatan pola, pengolahan data, pembuktian, dan generalisasi.',
    karakteristikKonteks:
      'Siswa menemukan sendiri kaidah atau prinsip materi melalui rangsangan contoh, bukan diberitahu definisinya di awal.',
    tahapanSintaks: [
      {
        id: 'disc_stimulation',
        urutan: 1,
        namaTahap: 'Stimulation (Pemberian Rangsangan)',
        tujuanTahap:
          'Menciptakan rasa ingin tahu awal melalui pengamatan contoh, gambar, data, atau fenomena terfokus.',
        bobotDurasi: 14,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Menggembirakan'],
      },
      {
        id: 'disc_problem_statement',
        urutan: 2,
        namaTahap: 'Problem Statement (Identifikasi Masalah)',
        tujuanTahap:
          'Mengidentifikasi persoalan inti yang muncul dari rangsangan lalu menyusun dugaan pola/jawaban sementara.',
        bobotDurasi: 14,
        pengalamanBelajar: 'Memahami',
      },
      {
        id: 'disc_data_collection',
        urutan: 3,
        namaTahap: 'Data Collection (Pengumpulan Data)',
        tujuanTahap:
          'Mengumpulkan fakta, informasi, contoh, dan hasil pengamatan yang relevan untuk menguji dugaan sementara.',
        bobotDurasi: 24,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'disc_data_processing',
        urutan: 4,
        namaTahap: 'Data Processing (Pengolahan Data)',
        tujuanTahap:
          'Mengklasifikasikan, membandingkan, menghitung, atau menafsirkan data agar pola konsep terlihat jelas.',
        bobotDurasi: 20,
        pengalamanBelajar: 'Mengaplikasi',
      },
      {
        id: 'disc_verification',
        urutan: 5,
        namaTahap: 'Verification (Pembuktian)',
        tujuanTahap:
          'Memeriksa kembali dugaan awal dengan membandingkan hasil pengolahan data terhadap sumber/contoh baru.',
        bobotDurasi: 16,
        prinsipPembelajaran: ['Berkesadaran'],
      },
      {
        id: 'disc_generalization',
        urutan: 6,
        namaTahap: 'Generalization (Menarik Kesimpulan)',
        tujuanTahap:
          'Merumuskan kaidah atau konsep umum yang berlaku sebagai prinsip pembelajaran dengan bahasa siswa sendiri.',
        bobotDurasi: 12,
        pengalamanBelajar: 'Merefleksi',
        prinsipPembelajaran: ['Bermakna'],
      },
    ],
  },
  {
    id: 'cooperative',
    label: 'Cooperative Learning',
    namaSingkat: 'Cooperative (Pembelajaran Kooperatif)',
    deskripsi:
      'Belajar bersama dalam tim heterogen terstruktur (Think-Pair-Share, Jigsaw, atau STAD) dengan akuntabilitas individu dan saling mengajar antar-teman.',
    karakteristikKonteks:
      'Menghindari kerja kelompok pasif dengan pembagian peran dan tanggung jawab belajar yang jelas bagi setiap siswa.',
    variasiTeknik: COOPERATIVE_TECHNIQUE_VARIANTS,
    tahapanSintaks: [
      {
        id: 'coop_orientasi_tim',
        urutan: 1,
        namaTahap: 'Orientasi Tujuan dan Pembentukan Tim Heterogen',
        tujuanTahap:
          'Menyampaikan target belajar bersama dan mengatur pasangan/kelompok heterogen sesuai teknik kooperatif.',
        bobotDurasi: 14,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Berkesadaran'],
      },
      {
        id: 'coop_penyajian_peran',
        urutan: 2,
        namaTahap: 'Penyajian Konsep Inti dan Penjelasan Peran Teknik',
        tujuanTahap:
          'Membekali siswa dengan gambaran konsep dasar serta prosedur peran dalam teknik kooperatif terpilih.',
        bobotDurasi: 18,
        pengalamanBelajar: 'Memahami',
      },
      {
        id: 'coop_kerja_tim',
        urutan: 3,
        namaTahap: 'Kerja Sama Tim dan Saling Mengajar Antar-Anggota',
        tujuanTahap:
          'Melaksanakan diskusi berpasangan, kelompok ahli, atau latihan tim agar seluruh anggota memahami materi.',
        bobotDurasi: 32,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Menggembirakan', 'Bermakna'],
      },
      {
        id: 'coop_uji_individu_tim',
        urutan: 4,
        namaTahap: 'Uji Pemahaman Individu dan Unjuk Kerja Tim',
        tujuanTahap:
          'Mengukur akuntabilitas penguasaan masing-masing siswa dan menyatukan kontribusi tim dalam hasil bersama.',
        bobotDurasi: 22,
        pengalamanBelajar: 'Mengaplikasi',
      },
      {
        id: 'coop_pengakuan_refleksi',
        urutan: 5,
        namaTahap: 'Pengakuan Tim dan Refleksi Kolaborasi',
        tujuanTahap:
          'Memberikan umpan balik kemajuan individu/tim serta merefleksikan efektivitas saling bantu dalam kelompok.',
        bobotDurasi: 14,
        pengalamanBelajar: 'Merefleksi',
        prinsipPembelajaran: ['Berkesadaran'],
      },
    ],
  },
  {
    id: 'explicit',
    label: 'Explicit / Direct Instruction',
    namaSingkat: 'Explicit Instruction (Instruksi Langsung Terbimbing)',
    deskripsi:
      'Pengajaran langkah-demi-langkah yang sangat jelas dari pemodelan guru (I Do), latihan terbimbing bersama (We Do), cek pemahaman, hingga latihan mandiri (You Do).',
    karakteristikKonteks:
      'Ideal untuk penguasaan prosedur bertahap, keterampilan dasar membaca/berhitung, atau prosedur teknis dan keselamatan K3.',
    tahapanSintaks: [
      {
        id: 'exp_orientasi_prasyarat',
        urutan: 1,
        namaTahap: 'Orientasi Tujuan dan Reaktivasi Prasyarat',
        tujuanTahap:
          'Menjelaskan keterampilan target secara konkret dan mengecek kesiapan pengetahuan prasyarat.',
        bobotDurasi: 14,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Berkesadaran'],
      },
      {
        id: 'exp_demonstrasi_guru',
        urutan: 2,
        namaTahap: 'Presentasi Terstruktur dan Demonstrasi Langkah (I Do)',
        tujuanTahap:
          'Memodelkan prosedur konsep step-by-step secara eksplisit beserta penjelasan alasan tiap langkah dan kesalahan yang dihindari.',
        bobotDurasi: 24,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'exp_latihan_terbimbing',
        urutan: 3,
        namaTahap: 'Latihan Terbimbing dan Cek Pemahaman Cepat (We Do)',
        tujuanTahap:
          'Memandu siswa mempraktikkan langkah secara bersama dengan isyarat bertahap dan memeriksa pemahaman seluruh kelas.',
        bobotDurasi: 24,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Menggembirakan'],
      },
      {
        id: 'exp_latihan_mandiri',
        urutan: 4,
        namaTahap: 'Latihan Mandiri Bertahap dan Umpan Balik Korektif (You Do)',
        tujuanTahap:
          'Memberi ruang praktik mandiri untuk mencapai kelancaran prosedural sambil guru memberi koreksi cepat terarah.',
        bobotDurasi: 26,
        pengalamanBelajar: 'Mengaplikasi',
      },
      {
        id: 'exp_penguatan_review',
        urutan: 5,
        namaTahap: 'Penguatan Penguasaan dan Review Metakognitif',
        tujuanTahap:
          'Mengevaluasi ketuntasan keterampilan utama dan mencatat langkah kunci yang perlu diingat siswa.',
        bobotDurasi: 12,
        pengalamanBelajar: 'Merefleksi',
        prinsipPembelajaran: ['Berkesadaran'],
      },
    ],
  },
  {
    id: 'kontekstual',
    label: 'Contextual Teaching and Learning (CTL)',
    namaSingkat: 'CTL (Pembelajaran Kontekstual Nyata)',
    deskripsi:
      'Menghubungkan konsep akademik secara langsung dengan pengalaman harian, budaya lokal, masyarakat belajar, dan pemodelan situasi nyata siswa.',
    karakteristikKonteks:
      'Menjadikan lingkungan sosial, alam, rumah, sekolah, atau praktik sekitar sebagai jangkar makna konsep.',
    tahapanSintaks: [
      {
        id: 'ctl_konstruktivisme',
        urutan: 1,
        namaTahap: 'Konstruktivisme dan Kaitan Pengalaman Nyata Siswa',
        tujuanTahap:
          'Menggali pengalaman sehari-hari siswa sebagai jembatan membangun konsep baru.',
        bobotDurasi: 16,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'ctl_pemodelan_bertanya',
        urutan: 2,
        namaTahap: 'Pemodelan (Modeling) dan Bertanya Kritis pada Konteks Lokal',
        tujuanTahap:
          'Menunjukkan contoh/model konkret dan memantik dialog pertanyaan mengenai bagaimana konsep bekerja di sekitar siswa.',
        bobotDurasi: 20,
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Menggembirakan'],
      },
      {
        id: 'ctl_menemukan_konteks',
        urutan: 3,
        namaTahap: 'Menemukan (Inkuiri Kontekstual) di Lingkungan Sekitar',
        tujuanTahap:
          'Mengamati atau menganalisis data/kasus nyata dari lingkungan untuk menemukan hubungan sebab-akibat materi.',
        bobotDurasi: 26,
        pengalamanBelajar: 'Mengaplikasi',
        prinsipPembelajaran: ['Bermakna'],
      },
      {
        id: 'ctl_masyarakat_belajar',
        urutan: 4,
        namaTahap: 'Masyarakat Belajar (Learning Community) dan Unjuk Kontekstual',
        tujuanTahap:
          'Berkolaborasi mendiskusikan penerapan materi dan menyajikan hasil aplikasi pada konteks nyata.',
        bobotDurasi: 24,
        pengalamanBelajar: 'Mengaplikasi',
      },
      {
        id: 'ctl_refleksi_autentik',
        urutan: 5,
        namaTahap: 'Refleksi Bermakna dan Asesmen Autentik',
        tujuanTahap:
          'Menilai pemahaman melalui tugas autentik serta merefleksikan manfaat konsep bagi kehidupan nyata siswa.',
        bobotDurasi: 14,
        pengalamanBelajar: 'Merefleksi',
        prinsipPembelajaran: ['Berkesadaran'],
      },
    ],
  },
];

export const MODUL_AJAR_MODELS: readonly ModulAjarModelDefinition[] = RAW_MODEL_SPECS.map(
  (spec): ModulAjarModelDefinition => ({
    ...spec,
    sintaksUtama: spec.tahapanSintaks.map((stage) => stage.namaTahap),
  })
);

export function isValidModulAjarModelType(id: unknown): id is ModulAjarModelType {
  if (typeof id !== 'string') return false;
  return MODUL_AJAR_MODELS.some((m) => m.id === id);
}

export function isLegacyModulAjarModelId(id: unknown): id is LegacyModulAjarModelType {
  if (typeof id !== 'string') return false;
  return (LEGACY_MODUL_MODEL_IDS as readonly string[]).includes(id);
}

export function getModulAjarModelDefinition(
  id?: string | null
): ModulAjarModelDefinition {
  if (typeof id === 'string') {
    const matched = MODUL_AJAR_MODELS.find((m) => m.id === id);
    if (matched) return matched;
  }
  return MODUL_AJAR_MODELS[0];
}

export function getAllSearchableModulModelIds(): string[] {
  return [...MODUL_AJAR_MODELS.map((m) => m.id), ...LEGACY_MODUL_MODEL_IDS];
}
