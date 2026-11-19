import type {
  KegiatanPembelajaranLangkah,
  ModulAjarDokumen,
  ModulContohLKPD,
  ModulReferensiSumberItem,
  TahapKegiatanTerstruktur,
} from '../types/perangkatAjar';
import { getSemesterCurriculumPlan, type JenjangKategori } from './kurikulumCatalog';
import {
  computeTPContentHash,
  jenjangToDefaultFase,
  type CustomTPItem,
  type SchoolProfile,
} from './schoolProfileStorage';
import {
  getModulAjarModelDefinition,
  type ModulAjarModelType,
} from './modulPedagogicalModels';
import {
  syncLegacyArraysFromStructuredStages,
  type JenjangKategoriModul,
} from './modulTimeBudget';
import {
  buildModulLKPDSummaryFromDoc,
  resolveModulKKTPConfig,
  summarizeAsesmenDetailToLegacy,
} from './modulOperationalContent';
import {
  buildCuratedOrAdaptiveLKPDContent,
  buildLKPDDokumenFromCurated,
} from './lkpdCurriculumFixtures';
import { PROVENANCE_MSG_UNLINKED } from './modulReferensiSumber';

export type CuratedModulExampleId =
  | 'sd_4_ipas_fotosintesis'
  | 'smp_8_matematika_spldv'
  | 'sma_10_bindo_lho'
  | 'smk_11_pkk_prototipe';

export const CURATED_EXAMPLE_BADGE_LABEL = 'Contoh / Template' as const;
export const CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER =
  'Contoh / Template Terkurasi AsesMerdeka — Bukan Dokumen Resmi Kemendikdasmen & Bukan Data Sekolah/Siswa Nyata.';

export interface CuratedModulExample {
  id: CuratedModulExampleId;
  badgeLabel: typeof CURATED_EXAMPLE_BADGE_LABEL;
  provenanceDisclaimer: string;
  jenjang: JenjangKategoriModul;
  kelas: string;
  mataPelajaran: string;
  tema: string;
  modelType: ModulAjarModelType;
  modelLabel: string;
  alokasiRingkas: string;
  ringkasanKeunggulan: string;
  tp: CustomTPItem;
  sampleProfile: SchoolProfile;
  modul: ModulAjarDokumen;
}

function deepCloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeTemplateSampleProfile(params: {
  jenjang: JenjangKategori;
  kelasUtama: string;
  mataPelajaranUtama: string;
}): SchoolProfile {
  return {
    schoolId: `template_contoh_${params.jenjang.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${params.kelasUtama}`,
    instansiDinas: 'Contoh Template Satuan Pendidikan (Sesuaikan)',
    namaSekolah: 'Contoh Template Satuan Pendidikan (Sesuaikan)',
    alamatSekolah: 'Sesuaikan dengan alamat satuan pendidikan',
    namaGuru: 'Guru Mata Pelajaran (Sesuaikan)',
    nipGuru: '-',
    namaKepalaSekolah: 'Kepala Satuan Pendidikan (Sesuaikan)',
    nipKepalaSekolah: '-',
    kotaSekolah: 'Indonesia',
    jenjang: params.jenjang,
    kelasUtama: params.kelasUtama,
    mataPelajaranUtama: params.mataPelajaranUtama,
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    rombelAktif: `Kelas ${params.kelasUtama} (Contoh)`,
    daftarRombel: [`Kelas ${params.kelasUtama} (Contoh)`],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
  };
}

function resolveCatalogTP(params: {
  jenjang: JenjangKategori;
  kelas: string;
  mapel: string;
  topicPattern: RegExp;
  fallbackTP: CustomTPItem;
}): CustomTPItem {
  const fase = jenjangToDefaultFase(params.jenjang, params.kelas);
  const plan = getSemesterCurriculumPlan(params.mapel, fase, params.kelas, '1 (Ganjil)');
  const hit = plan.tpList.find(
    (item) =>
      params.topicPattern.test(item.materiPokok) ||
      params.topicPattern.test(item.tujuanPembelajaran)
  );
  return hit ? deepCloneValue(hit) : deepCloneValue(params.fallbackTP);
}

function buildCuratedMeeting(
  pertemuan: number,
  jpPertemuan: number,
  alokasiMenit: number,
  fokusPertemuan: string,
  tahapTerstruktur: TahapKegiatanTerstruktur[]
): KegiatanPembelajaranLangkah {
  const synced = syncLegacyArraysFromStructuredStages(tahapTerstruktur);
  return {
    pertemuan,
    alokasiMenit,
    jpPertemuan,
    fokusPertemuan,
    ...synced,
    tahapTerstruktur,
  };
}

function buildLinkedCuratedLKPD(
  tp: CustomTPItem,
  profile: SchoolProfile,
  preset: 'kasus' | 'eksperimen' | 'diferensiasi' | 'proyek'
): ModulContohLKPD {
  const content = buildCuratedOrAdaptiveLKPDContent(tp, profile, preset);
  const fullDoc = buildLKPDDokumenFromCurated(
    tp,
    profile,
    preset,
    content,
    undefined,
    computeTPContentHash(tp)
  );
  return buildModulLKPDSummaryFromDoc(fullDoc, 'modul_terintegrasi');
}

// =========================================================================
// CONTOH A: SD KELAS 4 — IPAS (Discovery Learning, 2 JP x 35 menit = 70 menit)
// =========================================================================
function createSDIPASFotosintesisExample(): CuratedModulExample {
  const mapel = 'IPAS (Ilmu Pengetahuan Alam dan Sosial)';
  const sampleProfile = makeTemplateSampleProfile({
    jenjang: 'SD/MI',
    kelasUtama: '4',
    mataPelajaranUtama: mapel,
  });
  const tp = resolveCatalogTP({
    jenjang: 'SD/MI',
    kelas: '4',
    mapel,
    topicPattern: /fotosintesis|bagian tubuh tumbuhan/i,
    fallbackTP: {
      id: 'tp-contoh-sd-ipas-4-1',
      kode: '4.1',
      elemen: 'Pemahaman IPAS (Sains)',
      materiPokok: 'Bagian Tubuh Tumbuhan, Fungsi Akar–Daun, dan Proses Fotosintesis',
      tujuanPembelajaran:
        'Peserta didik dapat mengidentifikasi fungsi akar, batang, daun, bunga, serta menguraikan bahan masukan dan hasil proses fotosintesis bagi makhluk hidup.',
      arahanRangkuman:
        'Peran klorofil, cahaya matahari, air, karbon dioksida serta hasilnya berupa karbohidrat dan oksigen.',
      alokasiJP: 2,
      mingguMulai: 1,
      mingguSelesai: 1,
      prasyarat: ['Mengenal tumbuhan hijau di sekitar rumah dan sekolah'],
      buktiKetercapaian: [
        'Menyebutkan fungsi tiap organ tumbuhan dan menyusun skema masukan–hasil fotosintesis tepat',
      ],
    },
  });

  const modelDef = getModulAjarModelDefinition('discovery');
  const kktpRef = resolveModulKKTPConfig(tp, sampleProfile);
  const asesmenDetail = {
    diagnostik: {
      tujuanPemeriksaanPrasyarat:
        'Mengecek pengenalan awal siswa kelas IV tentang nama bagian tumbuhan hijau (akar, batang, daun, bunga) di halaman rumah atau sekolah.',
      pertanyaanAtauTugasAwal: [
        'Tunjuk dan sebutkan minimal tiga bagian tubuh tumbuhan pada pot bayam atau kacang hijau di meja kelas!',
        'Bagian tumbuhan mana yang masuk ke dalam tanah dan mana yang menghadap ke cahaya matahari?',
      ],
      indikatorInterpretasi:
        'Siswa siap masuk ke penyelidikan jika sudah mengenali akar di bawah permukaan dan daun berwarna hijau di bagian atas.',
    },
    formatif: {
      instruksiAktivitas:
        'Saat pengumpulan dan pengolahan data kelompok, guru memeriksa tabel catatan organ tumbuhan dan skema panah masukan–hasil fotosintesis.',
      pertanyaanAtauTugas: [
        'Tuliskan apa perbedaan yang benar-benar terlihat langsung dengan mata antara daun Pot A (teras terang) dan Pot B (tempat gelap)!',
        'Berdasarkan penjelasan konsep guru dan bacaan, tuliskan empat hal yang diperlukan daun saat berfotosintesis dan dua hasil utamanya!',
      ],
      buktiYangDiamati: [
        'Tabel pengamatan memisahkan fakta terlihat (warna daun, tegak/layu) dari konsep yang belum langsung terlihat mata.',
        'Bagan panah mencantumkan air (dari akar lewat batang), karbon dioksida, cahaya matahari, klorofil -> karbohidrat/makanan & oksigen.',
      ],
      umpanBalikGuru:
        'Jika siswa menulis "tanaman di tempat gelap langsung membuktikan tidak ada oksigen", luruskan dengan jujur bahwa pengamatan di kelas baru menunjukkan perubahan kesegaran/warna daun; pembuktian gas oksigen memerlukan percobaan khusus.',
    },
    akhir: {
      bentukUtama: 'Isian Skema Bagan Tumbuhan & Uraian Singkat Bermakna',
      butirTugas: [
        {
          nomor: 1,
          bentuk: 'Fungsi Organ Tumbuhan',
          pertanyaanAtauTugas:
            'Jelaskan masing-masing satu fungsi utama akar, batang, daun, dan bunga pada tumbuhan bayam atau mangga di sekitar sekolahmu!',
          kunciAtauContohRespons:
            'Akar menyerap air dan zat mineral dari tanah serta mengokohkan tumbuhan; batang menopang tumbuhan dan menyalurkan air ke daun; daun sebagai tempat membuat makanan (fotosintesis); bunga sebagai alat perkembangbiakan.',
        },
        {
          nomor: 2,
          bentuk: 'Proses Fotosintesis & Sikap Ilmiah Jujur',
          pertanyaanAtauTugas:
            'Lengkapi alur masukan–hasil fotosintesis (air + karbon dioksida + cahaya matahari + klorofil -> ... + ...), lalu jelaskan mengapa pengamatan satu pot tanaman dalam lemari gelap saja belum cukup membuktikan seluruh reaksi fotosintesis!',
          kunciAtauContohRespons:
            'Masukan: air (diserap akar), karbon dioksida (udara lewat daun), energi cahaya matahari, dan klorofil. Hasil: karbohidrat/glukosa (makanan tumbuhan) dan gas oksigen. Pengamatan di lemari gelap hanya memperlihatkan daun menjadi pucat/layu, belum langsung mengukur keluarnya gas oksigen (perlu percobaan tanaman air seperti Hydrilla) atau adanya pati di daun (perlu uji yodium khusus).',
        },
      ],
      pedomanPenilaian:
        'Penilaian memakai 4 tingkat pencapaian deskriptif (Baru Berkembang, Layak, Cakap, Mahir) tanpa angka batas tetap; ambang skor dapat disesuaikan mengikuti aturan KKTP satuan pendidikan.',
      kktpReferensi: kktpRef,
    },
  };

  const tahapTerstruktur: TahapKegiatanTerstruktur[] = [
    {
      id: 'sd-disc-pendahuluan',
      urutan: 1,
      fase: 'pendahuluan',
      namaTahap: 'Pendahuluan & Apersepsi Tanaman Sekitar',
      tujuanTahap: 'Mengaitkan pengenalan bagian tubuh tumbuhan di rumah/sekolah dengan kebutuhan cahaya dan air.',
      aktivitasGuru:
        'Guru menunjukkan tanaman bayam dan kecambah kacang hijau di pot plastik transparan, menyapa siswa, lalu mengajak siswa mengamati akar yang basah dan daun yang hijau segar.',
      aktivitasSiswa:
        'Siswa menyentuh dengan hati-hati batang dan daun pot contoh, menyebutkan bagian akar, batang, daun, serta menjawab apakah mereka pernah menyiram tanaman di rumah.',
      instruksiPertanyaan:
        '"Manusia makan nasi dan sayur supaya bertenaga; kalau tumbuhan di halaman sekolah tidak bisa berjalan ke dapur, bagaimana tumbuhan mendapatkan makanannya?"',
      mediaBahan: 'Pot tanaman bayam/kacang hijau nyata di meja depan kelas',
      durasiMenit: 8,
      buktiBelajar: 'Jawaban lisan siswa mengenali akar, batang, dan daun.',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Berkesadaran'],
    },
    {
      id: 'sd-disc-1-stimulation',
      urutan: 2,
      fase: 'inti',
      namaTahap: '1. Stimulation (Pemberian Rangsangan)',
      tujuanTahap: 'Memunculkan rasa ingin tahu melalui perbandingan visual dua kondisi tanaman.',
      aktivitasGuru:
        'Guru meletakkan dua pot kecambah kacang hijau atau bayam usia 5 hari berdampingan: Pot A dirawat di teras kelas bercahaya matahari, Pot B diletakkan di lemari teduh/gelap dengan air siraman yang sama.',
      aktivitasSiswa:
        'Siswa mengamati perbedaan warna daun, kekokohan batang, serta kelembapan tanah kedua pot secara berkelompok tanpa mencabut tanaman.',
      instruksiPertanyaan:
        '"Amati kedua pot baik-baik: siraman air dan tanahnya sama, tetapi apa perbedaan paling jelas yang kalian lihat pada daun Pot A dan Pot B?"',
      mediaBahan: 'Pot A (teras bercahaya), Pot B (lemari gelap), dan kaca pembesar sederhana',
      durasiMenit: 8,
      buktiBelajar: 'Catatan pengamatan awal warna hijau segar (Pot A) vs pucat kekuningan (Pot B).',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Menggembirakan'],
    },
    {
      id: 'sd-disc-2-problem',
      urutan: 3,
      fase: 'inti',
      namaTahap: '2. Problem Statement (Identifikasi Masalah)',
      tujuanTahap: 'Merumuskan pertanyaan penyelidikan sederhana mengenai fungsi bagian tumbuhan dan cahaya.',
      aktivitasGuru:
        'Guru membimbing kelompok menuliskan 2 pertanyaan kerja serta membedakan apa yang bisa diamati langsung di kelas dan apa yang perlu penjelasan bacaan atau percobaan khusus.',
      aktivitasSiswa:
        'Siswa menuliskan dugaan awal pada LKPD: bagian mana yang menyerap air (akar), menyalurkan air (batang), dan mengolah makanan (daun) dengan bantuan cahaya matahari.',
      instruksiPertanyaan:
        '"Menurut kelompokmu, mengapa daun Pot B tampak pucat walau akarnya tetap disiram air setiap hari? Tulis dugaan sementaramu di kotak LKPD!"',
      mediaBahan: 'Kartu pertanyaan investigasi dan LKPD Kelompok',
      durasiMenit: 8,
      buktiBelajar: 'Rumusan dugaan tertulis tiap kelompok pada LKPD.',
      pengalamanBelajar: 'Memahami',
    },
    {
      id: 'sd-disc-3-collection',
      urutan: 4,
      fase: 'inti',
      namaTahap: '3. Data Collection (Pengumpulan Data)',
      tujuanTahap: 'Mengumpulkan data fungsi akar–batang–daun–bunga dan kondisi nyata tanaman pot.',
      aktivitasGuru:
        'Guru memandu kelompok mengamati satu tanaman bayam cabutan utuh (akar dicuci bersih di baskom air aman) serta mencatat warna, bentuk tulang daun, batang, dan bunga/kuncup bila ada.',
      aktivitasSiswa:
        'Siswa mengamati bagian akar–batang–daun–bunga tanaman bayam di atas alas koran/nampan, mengisi tabel perbandingan Pot A vs Pot B, lalu mencuci tangan dengan sabun selesai praktik.',
      instruksiPertanyaan:
        '"Catat perbedaan tekstur akar, saluran batang, dan lebar permukaan daun Pot A serta Pot B pada tabel pengamatanmu—tulis hanya apa yang benar-benar terlihat!"',
      mediaBahan: 'Tanaman bayam utuh berakar bersih, baskom air, tisu, nampan plastik, tabel LKPD',
      durasiMenit: 14,
      buktiBelajar: 'Tabel pengamatan ciri bagian tumbuhan dan kondisi Pot A vs Pot B terisi lengkap.',
      pengalamanBelajar: 'Mengaplikasi',
      prinsipPembelajaran: ['Bermakna'],
    },
    {
      id: 'sd-disc-4-processing',
      urutan: 5,
      fase: 'inti',
      namaTahap: '4. Data Processing (Pengolahan Data)',
      tujuanTahap: 'Menghubungkan data pengamatan tumbuhan dengan konsep alur masukan–hasil fotosintesis.',
      aktivitasGuru:
        'Guru menyajikan bagan sederhana fungsi organ tumbuhan dan skema fotosintesis (klorofil + cahaya + air + CO2 -> makanan/karbohidrat + oksigen), lalu meminta kelompok mencocokkan temuannya.',
      aktivitasSiswa:
        'Siswa mengisi bagan panah dari akar menyerap air -> naik lewat batang -> menuju daun hijau berklorofil yang menangkap cahaya matahari dan CO2 udara untuk menghasilkan karbohidrat dan oksigen.',
      instruksiPertanyaan:
        '"Jika daun Pot B kekurangan cahaya matahari sehingga klorofilnya terganggu, mengapa pertumbuhannya lebih lambat dibanding Pot A?"',
      mediaBahan: 'Bagan poster alur fotosintesis dan kartu label masukan–keluaran',
      durasiMenit: 10,
      buktiBelajar: 'Diagram panah fungsi akar–batang–daun & masukan–hasil fotosintesis terisi benar.',
      pengalamanBelajar: 'Mengaplikasi',
    },
    {
      id: 'sd-disc-5-verification',
      urutan: 6,
      fase: 'inti',
      namaTahap: '5. Verification (Pembuktian)',
      tujuanTahap: 'Menguji kebenaran dugaan awal dan menanamkan sikap ilmiah batas pembuktian.',
      aktivitasGuru:
        'Guru meminta kelompok membandingkan dugaan awalnya dengan bagan konsep dan menegaskan secara jujur bahwa satu pengamatan gelap hanya menunjukkan dampak cahaya bagi kesehatan daun—pembuktian gas oksigen atau pati membutuhkan demonstrasi khusus (Hydrilla/yodium).',
      aktivitasSiswa:
        'Siswa mencentang dugaan awal mana yang terbukti dan menjelaskan dengan kalimat sendiri perbedaan antara "hasil pengamatan daun pucat" dengan "demonstrasi khusus oksigen dan pati fotosintesis".',
      instruksiPertanyaan:
        '"Apakah dari daun Pot B yang menguning saja kita sudah bisa melihat keluarnya gelembung oksigen dengan mata telanjang? Jika belum, apa yang benar-benar kita amati hari ini?"',
      mediaBahan: 'Kartu gambar perbandingan pengamatan gelap vs demonstrasi tanaman air Hydrilla',
      durasiMenit: 8,
      buktiBelajar: 'Catatan verifikasi kelompok yang membedakan pengamatan langsung vs konsep.',
      pengalamanBelajar: 'Merefleksi',
    },
    {
      id: 'sd-disc-6-generalization',
      urutan: 7,
      fase: 'inti',
      namaTahap: '6. Generalization (Menarik Kesimpulan)',
      tujuanTahap: 'Menyusun simpulan sederhana bersama mengenai organ tumbuhan dan manfaat fotosintesis.',
      aktivitasGuru:
        'Guru memandu dua kelompok membacakan simpulan 3 kalimat tentang peran akar–batang–daun dan manfaat fotosintesis bagi manusia dan hewan (sumber makanan dan udara segar/oksigen).',
      aktivitasSiswa:
        'Siswa menuliskan kesimpulan akhir lengkap menggunakan bahasanya sendiri di bagian Kesimpulan LKPD.',
      instruksiPertanyaan:
        '"Ucapkan dalam dua kalimat sederhana: apa tugas akar, batang, dan daun, serta mengapa tumbuhan hijau penting bagi napas dan makanan kita?"',
      mediaBahan: 'Kotak kesimpulan LKPD siswa dan papan tulis',
      durasiMenit: 7,
      buktiBelajar: 'Rumusan kesimpulan tertulis memuat organ tumbuhan dan masukan–hasil fotosintesis.',
      pengalamanBelajar: 'Merefleksi',
    },
    {
      id: 'sd-disc-penutup',
      urutan: 8,
      fase: 'penutup',
      namaTahap: 'Penutup, Cek Pemahaman & Apresiasi',
      tujuanTahap: 'Mengecek ketercapaian TP 4.1 individu secara singkat dan memastikan kebersihan kelas.',
      aktivitasGuru:
        'Guru membagikan pertanyaan cek akhir individu (menulis masukan dan hasil fotosintesis), mengajak siswa mengembalikan pot ke tempat bercahaya, dan merapikan meja kelas.',
      aktivitasSiswa:
        'Siswa menjawab kuis singkat 2 nomor di kartu keluar dan meletakkan kembali pot ke taman/teras sekolah.',
      instruksiPertanyaan:
        '"Sebelum istirahat, tulis di kartu kecil: satu hal yang diserap akar dan dua hasil utama proses fotosintesis di daun!"',
      mediaBahan: 'Kartu keluar (exit ticket) dan tempat sampah/serbet meja',
      durasiMenit: 7,
      buktiBelajar: 'Kartu keluar individu terjawab lengkap dan tanaman terawat.',
      pengalamanBelajar: 'Merefleksi',
      prinsipPembelajaran: ['Berkesadaran', 'Bermakna'],
    },
  ];

  const meeting = buildCuratedMeeting(
    1,
    2,
    70,
    'Mengidentifikasi fungsi bagian tumbuhan serta memahami proses fotosintesis melalui pengamatan terpandu',
    tahapTerstruktur
  );

  const contohLKPD = buildLinkedCuratedLKPD(tp, sampleProfile, 'kasus');

  const modul: ModulAjarDokumen = {
    id: 'contoh-modul-sd-4-ipas-fotosintesis',
    tpId: tp.id,
    modelType: modelDef.id,
    sintaksModelId: modelDef.id,
    draftSource: 'template',
    schoolId: sampleProfile.schoolId,
    tpSourceHash: computeTPContentHash(tp),
    needsReview: false,
    judul: `Contoh Modul Ajar SD Kelas 4: Bagian Tubuh Tumbuhan & Fotosintesis (${modelDef.namaSingkat})`,
    mataPelajaran: mapel,
    jenjangFase: jenjangToDefaultFase('SD/MI', '4'),
    kelas: '4',
    rombel: sampleProfile.rombelAktif,
    semester: '1 (Ganjil)',
    tahunAjaran: sampleProfile.tahunAjaran,
    alokasiWaktu: '2 JP × 35 Menit = 70 Menit/pertemuan',
    alokasiWaktuDetail: {
      jenjangKategori: 'SD/MI',
      jpPerPertemuan: 2,
      menitPerJP: 35,
      totalMenitPertemuan: 70,
      jumlahPertemuan: 1,
      totalAlokasiJPTP: 2,
      sumberPreset: 'preset_jenjang',
    },
    jumlahPertemuan: 1,
    namaSekolah: sampleProfile.namaSekolah,
    namaGuru: sampleProfile.namaGuru,
    nipGuru: sampleProfile.nipGuru,
    namaKepalaSekolah: sampleProfile.namaKepalaSekolah,
    nipKepalaSekolah: sampleProfile.nipKepalaSekolah,
    kotaSekolah: sampleProfile.kotaSekolah,
    createdAt: 'Template Terkurasi Task 12.4',
    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    elemen: tp.elemen,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    targetSubTP: tp.subTP?.map((s) => ({ id: s.id, kode: s.kode, kompetensi: s.kompetensi })),
    prasyaratMateri: tp.prasyarat?.join('; '),
    buktiKetercapaian: tp.buktiKetercapaian,
    kompetensiAwal: [
      'Peserta didik mengenali bagian tumbuhan hijau (akar, batang, daun, bunga) pada tanaman halaman rumah/sekolah.',
      'Peserta didik terbiasa mengamati benda secara aman dan mencatat perubahan warna atau bentuk.',
    ],
    profilPelajarPancasila: [
      'Penalaran Kritis (membedakan hasil pengamatan langsung dari penjelasan konsep ilmiah)',
      'Gotong Royong (mengamati tumbuhan secara tertib dan bergiliran dalam kelompok kecil)',
      'Kemandirian (menyusun kesimpulan dan cek akhir individu secara jujur)',
    ],
    saranaPrasarana: [
      'Dua pot tanaman bayam atau kecambah kacang hijau sejenis (perlakuan terang vs gelap 5 hari)',
      'Satu tanaman bayam utuh dengan akar bersih untuk diamati di nampan',
      'Bagan bergambar alur fotosintesis, kaca pembesar sederhana, tisu, dan sabun cuci tangan',
    ],
    targetPesertaDidik:
      'Peserta didik kelas IV SD reguler dengan pendampingan pengamatan konkret dan kosakata ilmiah sederhana.',
    modelPembelajaran: `${modelDef.label} - ${modelDef.deskripsi}`,
    pemahamanBermakna:
      'Setiap bagian tumbuhan bekerja sama agar tumbuhan dapat hidup dan memasak makanannya sendiri di daun melalui fotosintesis, yang hasilnya juga memberi makanan dan oksigen bagi manusia serta hewan.',
    pertanyaanPemantik: [
      'Mengapa pohon mangga atau bayam tidak perlu mencari makan seperti kucing atau ayam, tetapi bisa terus tumbuh?',
      'Apa tugas akar yang tersembunyi di dalam tanah dibanding daun yang lebar di bagian atas?',
      'Jika pot tanaman kita taruh di tempat gelap terlalu lama, apa yang terjadi pada daunnya dan mengapa?',
    ],
    bahanBacaan: {
      ringkasanInti:
        'Tumbuhan memiliki bagian tubuh dengan fungsi saling melengkapi: akar menyerap air dan mineral, batang menyalurkan air ke daun dan menopang tumbuhan, daun hijau berklorofil mengolah air dan karbon dioksida dengan bantuan cahaya matahari (fotosintesis) menjadi karbohidrat dan oksigen, sedangkan bunga membantu perkembangbiakan.',
      konsepKunci: ['Fungsi Akar–Batang–Daun–Bunga', 'Klorofil', 'Fotosintesis', 'Batas Pengamatan Gelap vs Konsep'],
      referensiCatatan: PROVENANCE_MSG_UNLINKED,
      penjelasanKonsepUtama:
        'Fotosintesis adalah cara tumbuhan hijau "memasak" makanannya sendiri di bagian daun. Untuk melakukan proses ini, tumbuhan membutuhkan air yang diserap oleh akar lalu disalurkan ke atas oleh batang, gas karbon dioksida dari udara yang masuk lewat lubang halus daun (stomata), zat warna hijau daun yang disebut klorofil, serta cahaya matahari sebagai sumber tenaga. Dari pengolahan tersebut, tumbuhan menghasilkan makanan berupa karbohidrat (glukosa/pati) untuk tumbuh dan melepaskan gas oksigen ke udara yang membantu makhluk hidup bernapas. Dalam praktik kelas IV SD, pengamatan dua pot tanaman di tempat terang vs tempat gelap aman dilakukan untuk melihat pengaruh cahaya terhadap warna dan kesegaran daun, namun penting dijelaskan kepada siswa bahwa satu pengamatan gelap saja belum secara langsung membuktikan terjadinya pembentukan gas oksigen maupun pati.',
      subKonsep: [
        {
          judul: 'Bagian Tubuh Tumbuhan & Fungsinya',
          uraian:
            'Akar menyerap air/zat mineral tanah dan menegakkan tumbuhan; batang menopang tumbuhan serta menyalurkan air ke daun dan hasil makanan ke bagian lain; daun menangkap cahaya untuk fotosintesis; bunga berperan dalam penyerbukan menjadi biji/buah.',
        },
        {
          judul: 'Batas Pengamatan Terang–Gelap vs Demonstrasi Khusus',
          uraian:
            'Membandingkan tanaman di teras terang vs lemari gelap menunjukkan cahaya dibutuhkan agar daun tetap hijau segar (pengamatan langsung), sedangkan membuktikan pelepasan gas oksigen memerlukan percobaan tanaman air (Hydrilla) di bawah cahaya dan pembuktian pati daun memakai uji yodium khusus.',
        },
      ],
      istilahPenting: [
        { istilah: 'Fotosintesis', pengertian: 'Proses pembuatan makanan oleh tumbuhan hijau pada daun dengan bantuan cahaya matahari.' },
        { istilah: 'Klorofil', pengertian: 'Zat warna hijau alami di daun yang membantu menangkap cahaya matahari.' },
        { istilah: 'Karbohidrat & Oksigen', pengertian: 'Dua hasil utama fotosintesis: sumber makanan tumbuhan serta gas yang dibutuhkan untuk bernapas.' },
      ],
      contohKonkret: [
        'Tanaman bayam, kacang hijau, dan kembang sepatu di kebun sekolah yang menghadap ke arah datangnya cahaya matahari pagi.',
        'Daun singkong atau pucuk tanaman pot yang menguning pucat bila diletakkan di sudut lemari gelap berhari-hari.',
      ],
      contohPenyelesaian: {
        judulContoh: 'Memisahkan Fakta Pengamatan Pot Terang vs Gelap dan Penjelasan Konsep',
        konteks: 'Siswa membandingkan Pot A (teras sekolah) dan Pot B (lemari gelap) setelah 5 hari dengan penyiraman sama.',
        langkahPenyelesaian: [
          'Langkah Pengamatan Langsung: Catat fakta yang tampak oleh mata — daun Pot A hijau segar dan tegak; daun Pot B pucat kekuningan dan agak layu.',
          'Langkah Penjelasan Konseptual: Kaitkan hasil dengan peran daun berklorofil yang membutuhkan cahaya matahari untuk fotosintesis bersama air (dari akar–batang) dan CO2 sehingga menghasilkan karbohidrat dan oksigen.',
          'Langkah Klarifikasi Ilmiah (Demonstrasi Khusus): Jelaskan bahwa perubahan warna daun pada Pot B membuktikan kebutuhan cahaya bagi kesehatan daun, sedangkan pembuktian langsung gas oksigen (mis. gelembung pada tumbuhan air Hydrilla) dan adanya pati (uji yodium pada daun) memerlukan kondisi demonstrasi khusus.',
        ],
        kesimpulanHasil:
          'Siswa memahami alur organ tumbuhan dan proses fotosintesis dengan jujur secara ilmiah tanpa melebih-lebihkan batas pengamatan gelap.',
      },
      hubunganDenganTP:
        'Materi ini menjawab langsung TP 4.1 agar siswa mampu mengidentifikasi fungsi akar, batang, daun, bunga dan menguraikan masukan–hasil fotosintesis dengan dasar pengamatan yang jujur.',
      potensiMiskonsepsi: [
        {
          miskonsepsi: 'Menganggap tumbuhan mendapat makanan jadi dengan "memakan tanah" melalui akarnya.',
          caraMeluruskan: 'Tegaskan akar hanya menyerap air dan zat mineral terlarut, sedangkan makanan dibuat sendiri di daun melalui fotosintesis.',
        },
        {
          miskonsepsi: 'Mengira melihat tanaman layu dalam gelap sudah membuktikan terbentuknya oksigen atau glukosa secara langsung.',
          caraMeluruskan: 'Bedakan dengan jelas: pot dalam gelap hanya menunjukkan daun pucat akibat kurang cahaya; melihat gelembung oksigen perlu tanaman air (Hydrilla) di air terang.',
        },
      ],
    },
    kegiatanPembelajaran: [meeting],
    asesmen: summarizeAsesmenDetailToLegacy(asesmenDetail),
    asesmenDetail,
    rubrikPenilaianSingkat: [
      {
        kriteria: 'Identifikasi Fungsi Organ Tumbuhan (Akar, Batang, Daun, Bunga)',
        baruBerkembang: 'Menyebut bagian tumbuhan namun fungsinya masih tertukar atau tidak lengkap.',
        layak: 'Menjelaskan fungsi 2–3 organ tumbuhan dengan benar.',
        cakap: 'Mengidentifikasi fungsi akar, batang, daun, dan bunga secara tepat pada tanaman sekitar.',
        mahir: 'Menghubungkan alur kerja sama akar–batang–daun hingga menghasilkan makanan secara runtut.',
      },
      {
        kriteria: 'Pemahaman Proses Fotosintesis & Kejujuran Bukti Pengamatan',
        baruBerkembang: 'Belum menyebutkan bahan masukan atau hasil fotosintesis secara utuh.',
        layak: 'Menyebut sebagian masukan/hasil fotosintesis namun belum membedakan batas pengamatan pot gelap.',
        cakap: 'Menuliskan lengkap masukan (air, CO2, cahaya, klorofil) dan hasil (karbohidrat, oksigen) berdasarkan tabel pengamatan.',
        mahir: 'Menguraikan masukan–hasil fotosintesis lengkap serta menjelaskan bahwa pembuktian gas oksigen/pati memerlukan demonstrasi khusus.',
      },
    ],
    diferensiasiOperasional: {
      prinsipKesetaraanTP:
        'Seluruh siswa menuntaskan penguasaan fungsi bagian tubuh tumbuhan serta masukan–hasil fotosintesis sesuai TP 4.1.',
      kesiapanDasar: {
        targetKesiapan: 'Mengenali organ tumbuhan dan menyusun bahan–hasil fotosintesis dengan bantuan visual.',
        dukunganScaffolding: 'Guru menyediakan kartu gambar berwarna akar, batang, daun, matahari, air, dan makanan.',
        aktivitasKonkret: [
          'Memasangkan kartu foto bagian bayam (akar, batang, daun, bunga) dengan kartu fungsinya di meja kelompok.',
          'Menempelkan panah air, karbon dioksida, dan cahaya matahari menuju gambar daun pada bagan sederhana.',
        ],
        mediaPendukung: 'Kartu gambar berwarna organ tumbuhan dan papan tempel sederhana',
        buktiBelajarJalur: 'Kartu organ dan bagan fotosintesis terpasang tepat.',
      },
      kesiapanBerkembang: {
        targetKesiapan: 'Mengolah data pengamatan Pot A vs Pot B menjadi penjelasan fungsi organ dan fotosintesis.',
        dukunganScaffolding: 'Menyediakan tabel perbandingan dua kolom dengan kalimat pemandu setengah jadi.',
        aktivitasKonkret: [
          'Mencatat perbedaan warna daun Pot A vs Pot B dalam tabel lalu menulis kalimat penyebabnya.',
          'Mengisi diagram panah masukan–hasil fotosintesis dengan uraian 2 kalimat fungsi akar dan batang.',
        ],
        mediaPendukung: 'LKPD pengamatan Pot A vs Pot B dengan bagan isian terpandu',
        buktiBelajarJalur: 'Tabel pengamatan dan uraian masukan–hasil fotosintesis terisi tepat.',
      },
      kesiapanMahir: {
        targetKesiapan: 'Menganalisis batas pembuktian pengamatan gelap serta dampak fotosintesis bagi lingkungan.',
        dukunganScaffolding: 'Guru menantang siswa merancang cara aman membuktikan salah satu hasil fotosintesis dengan membaca ilustrasi percobaan Hydrilla.',
        aktivitasKonkret: [
          'Menuliskan penjelasan mengapa pot gelap saja belum menunjukkan gelembung oksigen dan bagaimana percobaan Hydrilla melengkapinya.',
          'Menganalisis akibat penebangan pohon besar di halaman sekolah terhadap ketersediaan oksigen dan kerindangan siang hari.',
        ],
        mediaPendukung: 'Kartu ilustrasi percobaan Hydrilla & kasus penghijauan halaman sekolah',
        buktiBelajarJalur: 'Argumen tertulis membedakan pengamatan pot gelap, demonstrasi khusus, dan manfaat ekosistem.',
      },
    },
    contohLKPD,
    pengayaanDanRemedial: {
      pengayaan:
        'Membaca ilustrasi demonstrasi tanaman air Hydrilla terkena sinar matahari di akuarium bening dan menjelaskan fungsi gelembung yang tampak pada air.',
      remedial:
        'Pendampingan langsung menggunakan tanaman bayam utuh dan kartu panah bergambar agar siswa melihat urutan air dari akar -> batang -> daun.',
    },
    refleksiGuru: [
      'Apakah siswa sudah memahami bahwa cahaya membantu daun memasak makanan tanpa melebih-lebihkan hasil pengamatan gelap sebagai bukti langsung seluruh fotosintesis?',
      'Apakah jalur kartu gambar bagi kesiapan dasar membantu siswa membaca alur air dari akar ke daun?',
    ],
    refleksiSiswa: [
      'Bagian tumbuhan mana yang paling baru bagimu fungsinya hari ini?',
      'Mengapa kita perlu merawat dan menyiram tanaman hijau di tempat yang terkena cahaya cukup?',
    ],
    glosarium: [
      { istilah: 'Akar & Batang', definisi: 'Bagian tumbuhan yang menyerap air tanah dan menyalurkannya ke daun.' },
      { istilah: 'Fotosintesis', definisi: 'Proses daun berklorofil mengolah air dan karbon dioksida dengan cahaya matahari menjadi makanan dan oksigen.' },
      { istilah: 'Klorofil', definisi: 'Zat warna hijau daun penangkap energi cahaya.' },
    ],
    daftarPustaka: [
      PROVENANCE_MSG_UNLINKED,
      'Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka.',
    ],
    catatanValidasi: {
      status: 'template_awal',
      usedFallback: false,
      structuralIssues: [],
      relevanceAndAntiSlopIssues: [],
      semanticReviewWarnings: [CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER],
    },
  };

  return {
    id: 'sd_4_ipas_fotosintesis',
    badgeLabel: CURATED_EXAMPLE_BADGE_LABEL,
    provenanceDisclaimer: CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER,
    jenjang: 'SD/MI',
    kelas: '4',
    mataPelajaran: mapel,
    tema: 'Fungsi Bagian Tumbuhan & Fotosintesis',
    modelType: 'discovery',
    modelLabel: modelDef.label,
    alokasiRingkas: '2 JP × 35 menit = 70 menit',
    ringkasanKeunggulan:
      'Membedakan secara jujur pengamatan aman daun terang–gelap dari penjelasan konsep fotosintesis & demonstrasi khusus.',
    tp,
    sampleProfile,
    modul,
  };
}

// =========================================================================
// CONTOH B: SMP KELAS 8 — MATEMATIKA (PBL, 3 JP x 40 menit = 120 menit)
// =========================================================================
function createSMPMatematikaSPLDVExample(): CuratedModulExample {
  const mapel = 'Matematika';
  const sampleProfile = makeTemplateSampleProfile({
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    mataPelajaranUtama: mapel,
  });
  const tp = resolveCatalogTP({
    jenjang: 'SMP/MTs',
    kelas: '8',
    mapel,
    topicPattern: /spldv|sistem persamaan linear dua variabel/i,
    fallbackTP: {
      id: 'tp-contoh-smp-mat-8-1',
      kode: '8.1',
      elemen: 'Aljabar',
      materiPokok: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
      tujuanPembelajaran:
        'Peserta didik dapat memodelkan dua informasi kontekstual ke dalam SPLDV, menyelesaikannya dengan metode yang sesuai, serta memeriksa kebenaran solusi pada konteks.',
      arahanRangkuman:
        'Langkah mendefinisikan variabel beserta satuan, menyusun dua persamaan linear, menyelesaikan dengan metode substitusi/eliminasi, dan memeriksa solusi ke kedua persamaan.',
      alokasiJP: 3,
      mingguMulai: 1,
      mingguSelesai: 1,
      prasyarat: ['Operasi hitung bilangan bulat dan desimal', 'Menyelesaikan persamaan linear satu variabel (PLSV)'],
      buktiKetercapaian: [
        'Menuliskan definisi dua variabel beserta satuan dengan jelas',
        'Menyelesaikan model SPLDV dan mengecek ulang ke kedua persamaan',
      ],
    },
  });

  const modelDef = getModulAjarModelDefinition('pbl');
  const kktpRef = resolveModulKKTPConfig(tp, sampleProfile);
  // Verifikasi aljabar mandiri untuk soal latihan baru:
  // Kantin Sekolah: 3r + 2s = 27.000 dan 2r + s = 16.000
  // -> s = 16.000 - 2r -> 3r + 2(16.000 - 2r) = 27.000 -> -r = -5.000 -> r = 5.000, s = 6.000.
  // Cek balik: 3(5.000)+2(6.000) = 15.000+12.000 = 27.000; 2(5.000)+6.000 = 16.000.
  // Pesanan baru 4 roti + 3 susu = 4(5.000)+3(6.000) = 20.000+18.000 = Rp38.000.
  const asesmenDetail = {
    diagnostik: {
      tujuanPemeriksaanPrasyarat:
        'Memastikan kesiapan siswa dalam memodelkan satu variabel (PLSV) dan melakukan operasi perkalian bilangan dalam rupiah.',
      pertanyaanAtauTugasAwal: [
        'Jika harga 3 penggaris adalah Rp9.000, tuliskan persamaan satu variabel dan temukan harga 1 penggaris!',
        'Jika a = Rp3.000 dan b = Rp4.000, hitunglah nilai 2a + 3b dan 3a + 2b!',
      ],
      indikatorInterpretasi:
        'Siswa yang keliru menghitung substitusi bilangan bulat dibantu terlebih dahulu sebelum menyusun dua persamaan.',
    },
    formatif: {
      instruksiAktivitas:
        'Di tengah tahap penyelidikan kelompok, guru mengecek cara siswa mendefinisikan variabel + satuan rupiah pada contoh latihan singkat: 1 buku gambar (a) + 2 spidol (b) = Rp7.000 dan 2a + b = Rp8.000.',
      pertanyaanAtauTugas: [
        'Periksa sistem a + 2b = 7.000 dan 2a + b = 8.000: tentukan nilai a (buku gambar) dan b (spidol) menggunakan substitusi/eliminasi!',
        'Uji hasil a = 3.000 dan b = 2.000 ke kedua persamaan awal untuk memastikan tidak ada kesalahan tanda.',
      ],
      buktiYangDiamati: [
        'Variabel ditulis lengkap beserta satuannya (rupiah), bukan sekadar "a = buku".',
        'Substitusi balik tertulis: 3.000 + 2(2.000) = 7.000 dan 2(3.000) + 2.000 = 8.000.',
      ],
      umpanBalikGuru:
        'Segera ingatkan bila siswa lupa mengalikan konstanta ruas kanan saat menyamakan koefisien pada eliminasi.',
    },
    akhir: {
      bentukUtama: 'Soal Latihan Kontekstual Baru + Pembuktian Solusi',
      butirTugas: [
        {
          nomor: 1,
          bentuk: 'Pemodelan & Penyelesaian SPLDV (Masalah Kantin Baru)',
          pertanyaanAtauTugas:
            'Di kantin sekolah, harga setiap roti isi dan kotak susu tetap sama. Paket A (3 roti isi dan 2 kotak susu) berharga Rp27.000. Paket B (2 roti isi dan 1 kotak susu) berharga Rp16.000. (a) Tentukan pemisalan variabel lengkap dengan satuan; (b) Susun dua persamaan SPLDV; (c) Hitung harga 1 roti isi dan 1 kotak susu beserta cek balik ke kedua persamaan!',
          kunciAtauContohRespons:
            'Misalkan r = harga 1 roti isi (rupiah) dan s = harga 1 kotak susu (rupiah). Model: 3r + 2s = 27.000 dan 2r + s = 16.000. Dari Persamaan (2): s = 16.000 − 2r. Substitusi ke (1): 3r + 2(16.000 − 2r) = 27.000 -> 3r + 32.000 − 4r = 27.000 -> −r = −5.000 -> r = 5.000, lalu s = 16.000 − 2(5.000) = 6.000. Cek balik: 3(5.000)+2(6.000) = 15.000+12.000 = 27.000 (Benar); 2(5.000)+6.000 = 16.000 (Benar). Jadi harga 1 roti isi Rp5.000 dan 1 kotak susu Rp6.000.',
        },
        {
          nomor: 2,
          bentuk: 'Uji Klaim & Aplikasi Paket Baru',
          pertanyaanAtauTugas:
            'Temanmu menebak harga roti isi Rp7.000 dan susu Rp2.000 karena 2(7.000)+2.000 = 16.000. Buktikan mengapa tebakan itu salah untuk keseluruhan masalah, lalu hitung biaya yang harus dibayar jika membeli 4 roti isi dan 3 kotak susu dengan harga yang benar!',
          kunciAtauContohRespons:
            'Tebakan (7.000, 2.000) hanya memenuhi Paket B tetapi gagal pada Paket A karena 3(7.000) + 2(2.000) = 21.000 + 4.000 = Rp25.000 (tidak sama dengan Rp27.000). Dengan solusi sah r = 5.000 dan s = 6.000, harga 4 roti isi dan 3 kotak susu = 4(5.000) + 3(6.000) = 20.000 + 18.000 = Rp38.000.',
        },
      ],
      pedomanPenilaian:
        'Skor mempertimbangkan ketepatan pemisalan variabel bersatuan, penyusunan dua persamaan, keruntutan eliminasi/substitusi, serta bukti verifikasi kedua persamaan tanpa ambang numerik tetap; rentang numerik mengikuti aturan KKTP sekolah.',
      kktpReferensi: kktpRef,
    },
  };

  const tahapTerstruktur: TahapKegiatanTerstruktur[] = [
    {
      id: 'smp-pbl-pendahuluan',
      urutan: 1,
      fase: 'pendahuluan',
      namaTahap: 'Pendahuluan & Pemanasan Prasyarat PLSV',
      tujuanTahap: 'Mengaktifkan konsep PLSV dan menyepakati aturan definisi variabel bersatuan.',
      aktivitasGuru:
        'Guru menuliskan soal pemanasan cepat di papan ("3 penghapus = Rp6.000, berapa 1 penghapus?"), membahas jawabannya dalam 3 menit, lalu menyampaikan tujuan belajar TP 8.1.',
      aktivitasSiswa:
        'Siswa mengerjakan pemanasan PLSV pada buku catatan serta mengingat syarat bahwa huruf variabel harus mewakili bilangan harga (rupiah), bukan sekadar nama barang.',
      instruksiPertanyaan:
        '"Mengapa menuliskan x = buku tulis masih kurang lengkap dibanding x = harga 1 buku tulis dalam rupiah?"',
      mediaBahan: 'Papan tulis dan kartu pemanasan PLSV',
      durasiMenit: 12,
      buktiBelajar: 'Jawaban pemanasan PLSV dan definisi variabel bersatuan di catatan.',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Berkesadaran'],
    },
    {
      id: 'smp-pbl-1-orientasi',
      urutan: 2,
      fase: 'inti',
      namaTahap: '1. Orientasi pada Masalah Autentik',
      tujuanTahap: 'Memahami skenario transaksi koperasi sekolah dengan dua variabel harga.',
      aktivitasGuru:
        'Guru menampilkan dua struk transaksi koperasi sekolah tanpa rincian harga satuan (Struk 1: 2 buku tulis + 3 pensil = Rp18.000; Struk 2: 3 buku tulis + 2 pensil = Rp17.000) serta meminta siswa menguji tebakan harga satu struk saja.',
      aktivitasSiswa:
        'Siswa membaca kedua struk, mencoba menguji pasangan harga yang cocok untuk Struk 1 (misal Rp6.000 dan Rp2.000), lalu menemukan mengapa pasangan itu gagal pada Struk 2.',
      instruksiPertanyaan:
        '"Apakah Rp6.000 untuk buku dan Rp2.000 untuk pensil cocok di Struk 1? Mengapa pasangan itu ditolak saat dicek ke Struk 2?"',
      mediaBahan: 'Kartu Struk Belanja Koperasi (LKPD SPLDV)',
      durasiMenit: 18,
      buktiBelajar: 'Catatan hasil uji coba pasangan harga pada kedua struk.',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Bermakna'],
    },
    {
      id: 'smp-pbl-2-organisasi',
      urutan: 3,
      fase: 'inti',
      namaTahap: '2. Mengorganisasikan Peserta Didik untuk Belajar',
      tujuanTahap: 'Mendefinisikan variabel x dan y beserta model dua persamaan linear.',
      aktivitasGuru:
        'Guru membagi siswa berpasangan/berkelompok kecil dan memandu penulisan formal pemisalan variabel x, y beserta penerjemahan dua kalimat struk ke dalam model SPLDV.',
      aktivitasSiswa:
        'Siswa menuliskan x = harga 1 buku tulis (Rp) dan y = harga 1 pensil (Rp), lalu menyusun 2x + 3y = 18.000 serta 3x + 2y = 17.000 pada LKPD.',
      instruksiPertanyaan:
        '"Bagaimana bentuk dua persamaan linear dari Struk 1 dan Struk 2 setelah kita menetapkan x dan y?"',
      mediaBahan: 'Lembar pemodelan LKPD SPLDV',
      durasiMenit: 14,
      buktiBelajar: 'Dua persamaan 2x + 3y = 18.000 dan 3x + 2y = 17.000 tertulis akurat.',
      pengalamanBelajar: 'Memahami',
    },
    {
      id: 'smp-pbl-3-penyelidikan',
      urutan: 4,
      fase: 'inti',
      namaTahap: '3. Membimbing Penyelidikan Mandiri dan Kelompok',
      tujuanTahap: 'Menyelesaikan model SPLDV dengan metode eliminasi–substitusi secara langkah demi langkah dan cek formatif.',
      aktivitasGuru:
        'Guru mendemonstrasikan langkah menyamakan koefisien x (mengalikan Persamaan 1 dengan 3 dan Persamaan 2 dengan 2), berkeliling membimbing kelompok menghitung sampai tuntas, lalu memberi soal cek formatif alat gambar (a + 2b = 7.000; 2a + b = 8.000).',
      aktivitasSiswa:
        'Siswa menjalankan eliminasi: (6x + 9y = 54.000) − (6x + 4y = 34.000) -> 5y = 20.000 -> y = 4.000 -> substitusi ke 2x + 3(4.000) = 18.000 -> x = 3.000, lalu menyubstitusi ulang kedua nilai dan menyelesaikan cek formatif berpasangan.',
      instruksiPertanyaan:
        '"Setelah mendapat x = 3.000 dan y = 4.000, masukkan keduanya ke Persamaan 2 (3x + 2y): apakah hasilnya tepat 17.000?"',
      mediaBahan: 'LKPD langkah eliminasi–substitusi dan kartu soal cek formatif',
      durasiMenit: 30,
      buktiBelajar: 'Perhitungan runtut x = 3.000, y = 4.000 + verifikasi kedua persamaan + cek formatif a = 3.000, b = 2.000.',
      pengalamanBelajar: 'Mengaplikasi',
      prinsipPembelajaran: ['Bermakna'],
    },
    {
      id: 'smp-pbl-4-penyajian',
      urutan: 5,
      fase: 'inti',
      namaTahap: '4. Mengembangkan dan Menyajikan Hasil Karya',
      tujuanTahap: 'Menyajikan perbandingan penyelesaian masalah baru dan membandingkan alternatif eliminasi vs substitusi.',
      aktivitasGuru:
        'Guru menugaskan kelompok memodelkan soal transaksi kantin baru (3r + 2s = 27.000; 2r + s = 16.000) lalu menunjuk dua kelompok memaparkan dua strategi berbeda (eliminasi vs substitusi) di papan tulis.',
      aktivitasSiswa:
        'Siswa mempresentasikan alur variabel, persamaan, perhitungan r = 5.000 dan s = 6.000, serta menunjukkan bukti bahwa kedua metode memberi hasil identik.',
      instruksiPertanyaan:
        '"Mengapa pada sistem 3r + 2s = 27.000 dan 2r + s = 16.000, metode substitusi dari koefisien s = 1 sangat praktis?"',
      mediaBahan: 'Papan tulis kelas dan hasil kerja kelompok pada kasus kantin',
      durasiMenit: 22,
      buktiBelajar: 'Paparan papan tulis dengan langkah aljabar dan verifikasi lengkap r = 5.000, s = 6.000.',
      pengalamanBelajar: 'Mengaplikasi',
      prinsipPembelajaran: ['Menggembirakan'],
    },
    {
      id: 'smp-pbl-5-evaluasi',
      urutan: 6,
      fase: 'inti',
      namaTahap: '5. Menganalisis dan Mengevaluasi Proses Pemecahan Masalah',
      tujuanTahap: 'Menguji kesalahan umum dan merumuskan daftar cek kebenaran solusi SPLDV.',
      aktivitasGuru:
        'Guru memfasilitasi evaluasi bersama terhadap kesalahan umum (lupa mengalikan suku ruas kanan saat eliminasi, tidak menyubstitusi balik ke Persamaan 2) menggunakan tebakan salah (7.000, 2.000) pada kasus kantin.',
      aktivitasSiswa:
        'Siswa mengevaluasi penyebab gagalnya tebakan (7.000, 2.000) dan mencatat 4 langkah wajib menyelesaikan SPLDV di buku catatan.',
      instruksiPertanyaan:
        '"Dari seluruh langkah tadi, tahap mana yang paling menjaga agar kita yakin harga yang ditemukan bukan kebetulan cocok di satu transaksi saja?"',
      mediaBahan: 'Catatan analisis galat aljabar dan rubrik pembuktian SPLDV',
      durasiMenit: 12,
      buktiBelajar: 'Catatan evaluasi kesalahan dan daftar periksa 4 langkah penyelesaian SPLDV.',
      pengalamanBelajar: 'Merefleksi',
    },
    {
      id: 'smp-pbl-penutup',
      urutan: 7,
      fase: 'penutup',
      namaTahap: 'Penutup & Evaluasi Individu',
      tujuanTahap: 'Mengukur ketercapaian individu melalui latihan asesmen akhir dan refleksi singkat.',
      aktivitasGuru:
        'Guru memberikan kuis evaluasi akhir singkat (2 butir masalah kantin) secara individu, mengumpulkan lembar jawab, lalu menutup pembelajaran dengan umpan balik.',
      aktivitasSiswa:
        'Siswa menyelesaikan butir asesmen individu (memeriksa 3r + 2s = 27.000; 2r + s = 16.000 dan menghitung harga 4 roti + 3 susu = Rp38.000) serta menulis refleksi singkat.',
      instruksiPertanyaan:
        '"Tunjukkan pemisalan, perhitungan lengkap, dan bukti substitusi balik pada kertas jawabanmu!"',
      mediaBahan: 'Lembar asesmen individu TP 8.1',
      durasiMenit: 12,
      buktiBelajar: 'Lembar asesmen individu tuntas dengan langkah verifikasi.',
      pengalamanBelajar: 'Merefleksi',
      prinsipPembelajaran: ['Berkesadaran'],
    },
  ];

  const meeting = buildCuratedMeeting(
    1,
    3,
    120,
    'Pemodelan dua transaksi ke dalam SPLDV, penyelesaian metode eliminasi–substitusi, serta verifikasi solusi',
    tahapTerstruktur
  );

  const contohLKPD = buildLinkedCuratedLKPD(tp, sampleProfile, 'kasus');

  const modul: ModulAjarDokumen = {
    id: 'contoh-modul-smp-8-matematika-spldv',
    tpId: tp.id,
    modelType: modelDef.id,
    sintaksModelId: modelDef.id,
    draftSource: 'template',
    schoolId: sampleProfile.schoolId,
    tpSourceHash: computeTPContentHash(tp),
    needsReview: false,
    judul: `Contoh Modul Ajar SMP Kelas 8: SPLDV Kontekstual (${modelDef.namaSingkat})`,
    mataPelajaran: mapel,
    jenjangFase: jenjangToDefaultFase('SMP/MTs', '8'),
    kelas: '8',
    rombel: sampleProfile.rombelAktif,
    semester: '1 (Ganjil)',
    tahunAjaran: sampleProfile.tahunAjaran,
    alokasiWaktu: '3 JP × 40 Menit = 120 Menit/pertemuan',
    alokasiWaktuDetail: {
      jenjangKategori: 'SMP/MTs',
      jpPerPertemuan: 3,
      menitPerJP: 40,
      totalMenitPertemuan: 120,
      jumlahPertemuan: 1,
      totalAlokasiJPTP: 3,
      sumberPreset: 'preset_jenjang',
    },
    jumlahPertemuan: 1,
    namaSekolah: sampleProfile.namaSekolah,
    namaGuru: sampleProfile.namaGuru,
    nipGuru: sampleProfile.nipGuru,
    namaKepalaSekolah: sampleProfile.namaKepalaSekolah,
    nipKepalaSekolah: sampleProfile.nipKepalaSekolah,
    kotaSekolah: sampleProfile.kotaSekolah,
    createdAt: 'Template Terkurasi Task 12.4',
    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    elemen: tp.elemen,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    targetSubTP: tp.subTP?.map((s) => ({ id: s.id, kode: s.kode, kompetensi: s.kompetensi })),
    prasyaratMateri: tp.prasyarat?.join('; '),
    buktiKetercapaian: tp.buktiKetercapaian,
    kompetensiAwal: [
      'Peserta didik mampu menyelesaikan persamaan linear satu variabel (PLSV) sederhana.',
      'Peserta didik menguasai operasi hitung bilangan bulat positif dan negatif.',
    ],
    profilPelajarPancasila: [
      'Penalaran Kritis (memodelkan syarat transaksi menjadi sistem persamaan dan memeriksa validitas solusi)',
      'Kemandirian (teliti menjalankan eliminasi, substitusi, dan pembuktian hasil)',
      'Kolaborasi (membandingkan strategi penyelesaian antaranggota kelompok)',
    ],
    saranaPrasarana: [
      'Kartu masalah transaksi koperasi & kantin sekolah',
      'LKPD SPLDV lengkap beserta ruang kerja pemodelan dan pemeriksaan balik',
      'Papan tulis untuk perbandingan metode eliminasi dan substitusi',
    ],
    targetPesertaDidik:
      'Peserta didik kelas VIII SMP reguler yang mulai beralih dari satu persamaan linear ke sistem dua persamaan.',
    modelPembelajaran: `${modelDef.label} - ${modelDef.deskripsi}`,
    pemahamanBermakna:
      'Satu persamaan dengan dua besaran tak diketahui memiliki banyak kemungkinan jawaban; dua informasi yang saling berkaitan membentuk SPLDV yang mengunci satu solusi unik jika kedua garis syarat berpotongan.',
    pertanyaanPemantik: [
      'Jika total belanja 2 buku dan 3 pensil adalah Rp18.000, apakah kita sudah dapat memastikan harga 1 buku tanpa informasi transaksi kedua?',
      'Mengapa saat menyamakan koefisien pada eliminasi seluruh suku di ruas kiri dan kanan wajib dikalikan bilangan yang sama?',
      'Bagaimana cara membuktikan nilai x dan y yang kita temukan benar untuk seluruh informasi cerita?',
    ],
    bahanBacaan: {
      ringkasanInti:
        'SPLDV terdiri atas dua persamaan linear dua variabel dengan variabel dan satuan yang sama pada kedua persamaan. Solusi sah adalah pasangan (x, y) yang membuat kedua persamaan sekaligus bernilai benar.',
      konsepKunci: ['Definisi Variabel Bersatuan', 'Model Dua Persamaan', 'Eliminasi–Substitusi', 'Cek Balik Solusi'],
      referensiCatatan: PROVENANCE_MSG_UNLINKED,
      penjelasanKonsepUtama:
        'Sistem Persamaan Linear Dua Variabel (SPLDV) memodelkan dua syarat atau dua transaksi pembelian yang melibatkan dua harga satuan yang belum diketahui. Langkah penyelesaian sistematis meliputi: (1) menetapkan dua variabel lengkap dengan arti objek dan satuan (misalnya x = harga 1 buku tulis dalam rupiah, y = harga 1 pensil dalam rupiah); (2) menulis dua persamaan linear dari dua fakta; (3) menyelesaikannya lewat eliminasi (menyamakan koefisien salah satu variabel di semua suku kiri dan kanan lalu mengurangkan/menjumlahkan), substitusi (mengganti satu variabel dengan ekspresi dari persamaan lain), atau campuran keduanya; dan (4) memverifikasi pasangan (x, y) dengan menyubstitusikannya ke KEDUA persamaan awal.',
      subKonsep: [
        {
          judul: 'Mengapa Satu Persamaan Tidak Cukup',
          uraian:
            'Pada 2x + 3y = 18.000 saja, pasangan (Rp6.000, Rp2.000) dan (Rp3.000, Rp4.000) keduanya memenuhi. Adanya persamaan kedua 3x + 2y = 17.000 menyaring hanya satu pasangan solusi sah, yakni (Rp3.000, Rp4.000).',
        },
        {
          judul: 'Aturan Keseimbangan Suku & Cek Balik',
          uraian:
            'Saat mengalikan persamaan agar koefisien sama, seluruh suku ruas kiri DAN ruas kanan wajib dikalikan pengali yang sama. Solusi akhir selalu diuji kembali ke Persamaan 1 dan Persamaan 2.',
        },
      ],
      istilahPenting: [
        { istilah: 'Variabel (x, y)', pengertian: 'Simbol huruf yang menyatakan besaran bilangan yang nilainya belum diketahui lengkap dengan satuannya.' },
        { istilah: 'Koefisien & Konstanta', pengertian: 'Bilangan pengali di depan variabel (banyak item) dan bilangan total harga pada persamaan.' },
        { istilah: 'Himpunan Penyelesaian', pengertian: 'Pasangan nilai (x, y) yang membuat kedua persamaan SPLDV sekaligus bernilai benar.' },
      ],
      contohKonkret: [
        'Koperasi Sekolah: 2 buku tulis + 3 pensil = Rp18.000 dan 3 buku tulis + 2 pensil = Rp17.000 menghasilkan x = Rp3.000, y = Rp4.000.',
        'Kantin Sekolah (Latihan Baru): 3 roti isi + 2 susu = Rp27.000 dan 2 roti isi + 1 susu = Rp16.000 menghasilkan r = Rp5.000, s = Rp6.000.',
      ],
      contohPenyelesaian: {
        judulContoh: 'Penyelesaian Lengkap Kasus Koperasi Sekolah (2x + 3y = 18.000 dan 3x + 2y = 17.000)',
        konteks: 'Misalkan x = harga 1 buku tulis (rupiah) dan y = harga 1 pensil (rupiah).',
        langkahPenyelesaian: [
          'Langkah 1 (Model): Susun Persamaan (1) 2x + 3y = 18.000 dan Persamaan (2) 3x + 2y = 17.000.',
          'Langkah 2 (Eliminasi x): Kalikan Persamaan (1) dengan 3 menjadi 6x + 9y = 54.000 dan Persamaan (2) dengan 2 menjadi 6x + 4y = 34.000. Kurangkan kedua persamaan: (6x − 6x) + (9y − 4y) = 54.000 − 34.000 -> 5y = 20.000 -> y = 4.000.',
          'Langkah 3 (Substitusi): Masukkan y = 4.000 ke Persamaan (1): 2x + 3(4.000) = 18.000 -> 2x + 12.000 = 18.000 -> 2x = 6.000 -> x = 3.000.',
          'Langkah 4 (Verifikasi Kedua Persamaan): Persamaan (1) 2(3.000) + 3(4.000) = 6.000 + 12.000 = 18.000 (Benar); Persamaan (2) 3(3.000) + 2(4.000) = 9.000 + 8.000 = 17.000 (Benar).',
        ],
        kesimpulanHasil: 'Harga 1 buku tulis adalah Rp3.000 dan harga 1 pensil adalah Rp4.000.',
      },
      hubunganDenganTP:
        'Langkah pemodelan bersatuan, penyelesaian campuran eliminasi–substitusi, serta verifikasi ganda menuntaskan seluruh indikator pada TP 8.1.',
      potensiMiskonsepsi: [
        {
          miskonsepsi: 'Mengalikan koefisien variabel di ruas kiri tetapi lupa mengalikan bilangan total harga di ruas kanan.',
          caraMeluruskan: 'Tunjukkan secara visual tanda kurung pengali di seluruh persamaan: 3 × (2x + 3y) = 3 × 18.000.',
        },
        {
          miskonsepsi: 'Merasa sudah cukup mengecek solusi hanya pada satu persamaan (misal menerima (6.000, 2.000) karena 2(6.000)+3(2.000) = 18.000).',
          caraMeluruskan: 'Wajibkan dua baris cek substitusi bertanda ✓ untuk Persamaan (1) maupun Persamaan (2).',
        },
      ],
    },
    kegiatanPembelajaran: [meeting],
    asesmen: summarizeAsesmenDetailToLegacy(asesmenDetail),
    asesmenDetail,
    rubrikPenilaianSingkat: [
      {
        kriteria: 'Pemisalan Variabel Bersatuan & Ketepatan Model Dua Persamaan',
        baruBerkembang: 'Belum mendefinisikan variabel dalam bilangan/rupiah atau salah menukar koefisien persamaan.',
        layak: 'Menulis satu persamaan tepat namun persamaan kedua atau satuan variabel belum konsisten.',
        cakap: 'Mendefinisikan variabel bersatuan rupiah dan menyusun kedua persamaan SPLDV dengan tepat.',
        mahir: 'Menyusun dua persamaan tepat serta mampu menjelaskan mengapa satu persamaan saja tidak mengunci solusi unik.',
      },
      {
        kriteria: 'Ketepatan Langkah Perhitungan Aljabar & Verifikasi Solusi',
        baruBerkembang: 'Terdapat kesalahan aritmetika atau lupa mengalikan ruas kanan saat eliminasi.',
        layak: 'Langkah penyelesaian hampir tepat namun tidak menyertakan bukti substitusi balik.',
        cakap: 'Menghitung nilai variabel akurat lewat eliminasi/substitusi serta mengecek ulang ke kedua persamaan.',
        mahir: 'Menuntaskan seluruh perhitungan tepat, memverifikasi kedua persamaan, dan menyangkal pasangan uji salah secara logis.',
      },
    ],
    diferensiasiOperasional: {
      prinsipKesetaraanTP:
        'Semua jalur belajar menguasai pemodelan, penyelesaian SPLDV, dan verifikasi solusi pada masalah transaksi (TP 8.1).',
      kesiapanDasar: {
        targetKesiapan: 'Mengenali arti variabel, menyusun persamaan dengan templat kolom, dan menguji pasangan nilai.',
        dukunganScaffolding: 'Guru menyediakan kotak templat persamaan berlabel (banyak barang × harga satuan) dan tabel uji 2 pasangan harga.',
        aktivitasKonkret: [
          'Melengkapi kotak pemisalan: x = harga 1 buku tulis (Rp) dan y = harga 1 pensil (Rp), lalu mengisi angka koefisien pada templat persamaan.',
          'Menguji pasangan (Rp6.000, Rp2.000) dan (Rp3.000, Rp4.000) pada tabel substitusi untuk menentukan mana yang memenuhi kedua transaksi.',
        ],
        mediaPendukung: 'Templat tabel transaksi dan kartu angka koefisien terpandu',
        buktiBelajarJalur: 'Templat dua persamaan terisi tepat dan tabel substitusi memverifikasi (3.000, 4.000).',
      },
      kesiapanBerkembang: {
        targetKesiapan: 'Menyelesaikan model SPLDV secara mandiri dan mengerjakan satu soal kontekstual baru.',
        dukunganScaffolding: 'Daftar periksa 4 langkah terstruktur di tepi LKPD tanpa mengisi angka koefisien secara penuh.',
        aktivitasKonkret: [
          'Menyusun model 2x + 3y = 18.000 dan 3x + 2y = 17.000 serta menuntaskan eliminasi dan substitusi secara runtut.',
          'Menyelesaikan soal baru 3r + 2s = 27.000 dan 2r + s = 16.000 beserta verifikasi ke kedua persamaan.',
        ],
        mediaPendukung: 'LKPD reguler beserta kartu daftar periksa 4 langkah SPLDV',
        buktiBelajarJalur: 'Kedua kasus selesai akurat dengan dua baris verifikasi.',
      },
      kesiapanMahir: {
        targetKesiapan: 'Membandingkan efisiensi metode, mengaudit kesalahan penyelesaian, dan membuat soal varian.',
        dukunganScaffolding: 'Diberikan kasus klaim tebakan salah serta soal evaluasi strategi metode.',
        aktivitasKonkret: [
          'Membuktikan letak kekeliruan klaim (Rp7.000, Rp2.000) pada kasus kantin lalu menentukan harga paket 4 roti + 3 susu = Rp38.000.',
          'Membandingkan jumlah langkah metode substitusi langsung (memanfaatkan koefisien s = 1) vs eliminasi bertingkat.',
        ],
        mediaPendukung: 'Kartu tantangan analisis kesalahan dan perbandingan metode SPLDV',
        buktiBelajarJalur: 'Argumen sanggahan lengkap, solusi Rp38.000 tepat, dan perbandingan metode terstruktur.',
      },
    },
    contohLKPD,
    pengayaanDanRemedial: {
      pengayaan:
        'Merancang satu kasus dua transaksi belanja koperasi kelas sendiri yang memiliki solusi bilangan bulat kelipatan Rp500 dan mengujinya ke teman sebangku.',
      remedial:
        'Latihan bertahap perkalian persamaan lengkap (ruas kiri dan ruas kanan) pada sistem dengan satu variabel berkoefisien 1 menggunakan kartu substitusi.',
    },
    refleksiGuru: [
      'Kesalahan langkah mana (definisi variabel, perkalian ruas kanan eliminasi, atau verifikasi ulang) yang masih paling sering dilakukan siswa kelas VIII?',
      'Apakah soal latihan baru kantin cukup menantang untuk menilai transfer pemahaman siswa di akhir jam?',
    ],
    refleksiSiswa: [
      'Di antara eliminasi dan substitusi, strategi mana yang paling mudah kamu gunakan dan mengapa?',
      'Mengapa verifikasi ke kedua persamaan penting dilakukan sebelum menulis kesimpulan harga?',
    ],
    glosarium: [
      { istilah: 'SPLDV', definisi: 'Dua persamaan linear dua variabel yang saling berkaitan dan diselesaikan secara bersamaan.' },
      { istilah: 'Metode Eliminasi', definisi: 'Menghilangkan satu variabel dengan menyamakan koefisien lalu menjumlahkan atau mengurangkan kedua persamaan.' },
      { istilah: 'Metode Substitusi', definisi: 'Menggantikan satu variabel dalam suatu persamaan dengan bentuk aljabar atau nilai dari persamaan lainnya.' },
    ],
    daftarPustaka: [
      PROVENANCE_MSG_UNLINKED,
      'Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka.',
    ],
    catatanValidasi: {
      status: 'template_awal',
      usedFallback: false,
      structuralIssues: [],
      relevanceAndAntiSlopIssues: [],
      semanticReviewWarnings: [CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER],
    },
  };

  return {
    id: 'smp_8_matematika_spldv',
    badgeLabel: CURATED_EXAMPLE_BADGE_LABEL,
    provenanceDisclaimer: CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER,
    jenjang: 'SMP/MTs',
    kelas: '8',
    mataPelajaran: mapel,
    tema: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
    modelType: 'pbl',
    modelLabel: modelDef.label,
    alokasiRingkas: '3 JP × 40 menit = 120 menit',
    ringkasanKeunggulan:
      'Memuat seluruh perhitungan terverifikasi aljabar (koperasi Rp3.000/Rp4.000 & kantin Rp5.000/Rp6.000), verifikasi ganda, serta latihan baru & sanggahan.',
    tp,
    sampleProfile,
    modul,
  };
}

// =========================================================================
// CONTOH C: SMA KELAS 10 — BAHASA INDONESIA (Inquiry, 3 JP x 45 mnt = 135 mnt)
// =========================================================================
function createSMABindoLHOExample(): CuratedModulExample {
  const mapel = 'Bahasa Indonesia';
  const sampleProfile = makeTemplateSampleProfile({
    jenjang: 'SMA/MA',
    kelasUtama: '10',
    mataPelajaranUtama: mapel,
  });
  const tp = resolveCatalogTP({
    jenjang: 'SMA/MA',
    kelas: '10',
    mapel,
    topicPattern: /lho|laporan hasil observasi/i,
    fallbackTP: {
      id: 'tp-contoh-sma-bindo-10-1',
      kode: '10.1',
      elemen: 'Membaca & Memirsa',
      materiPokok: 'Teks Laporan Hasil Observasi (LHO) Kritis dan Evaluasi Keakuratan Sumber Ilmiah',
      tujuanPembelajaran:
        'Peserta didik dapat menilai keabsahan definisi klasifikasi, kelengkapan deskripsi bagian, serta objektivitas bahasa dalam teks LHO lintas sumber.',
      arahanRangkuman:
        'Struktur LHO akademik, verifikasi klaim ilmiah dengan rujukan sahih, dan pemilahan kata teknis bidang ilmu.',
      alokasiJP: 3,
      mingguMulai: 1,
      mingguSelesai: 1,
      prasyarat: ['Teks LHO SMP dan pemilahan fakta-opini'],
      buktiKetercapaian: [
        'Identifikasi struktur & kalimat definisi tepat; kesalahan penalaran fakta terdeteksi',
      ],
    },
  });

  const modelDef = getModulAjarModelDefinition('inquiry');
  const kktpRef = resolveModulKKTPConfig(tp, sampleProfile);

  const contohLHOFullText =
    '[Teks Contoh Latihan Kelas — disusun untuk latihan analisis LHO, bukan data riset/statistik eksternal]\n' +
    'Paragraf 1 (Pernyataan Umum/Klasifikasi): Lubang resapan biopori adalah lubang silindris tegak yang dibuat di dalam tanah untuk membantu penyerapan air hujan serta mengolah sampah organik halaman. Metode ini tergolong teknologi konservasi air tanah sederhana karena memakai alat bor tanah manual dan dapat diterapkan di pekarangan sempit atau halaman sekolah.\n' +
    'Paragraf 2 (Deskripsi Bagian): Secara fisik, lubang biopori pada area latihan memiliki diameter bukaan sekitar 10 cm dengan kedalaman sekitar 80–100 cm pada lapisan tanah permukaan. Dinding bagian atas lubang dipasangi cincin pipa berlubang atau penguat tepi agar tanah tidak mudah longsor, lalu rongga lubang diisi potongan daun gugur atau sisa sayuran yang tidak berminyak untuk memicu aktivitas fauna tanah pembuat pori.\n' +
    'Paragraf 3 (Deskripsi Manfaat): Keberadaan lubang biopori membantu mengurangi genangan air sementara di jalur jalan halaman setelah hujan turun. Sampah daun gugur yang diuraikan oleh cacing dan mikroorganisme tanah berubah menjadi kompos alami yang menyuburkan tanah di sekitar akar tanaman.\n' +
    'Paragraf 4 (Kalimat Bermasalah untuk Uji Audit Siswa): Pembuatan biopori jelas menjadi satu-satunya cara terbaik di dunia yang paling ajaib dan pasti melenyapkan seluruh banjir di kota besar mana pun tanpa perlu memperbaiki saluran drainase lain, sebagaimana sudah sangat terkenal di kalangan seluruh pelajar.';

  const asesmenDetail = {
    diagnostik: {
      tujuanPemeriksaanPrasyarat:
        'Mengecek kemampuan awal siswa membedakan pernyataan faktual teramati dengan penilaian pribadi (opini) dalam paragraf singkat.',
      pertanyaanAtauTugasAwal: [
        'Tandai kata kerja penghubung definisi pada kalimat: "Lubang resapan biopori adalah lubang silindris tegak di dalam tanah."!',
        'Manakah di antara dua kalimat ini yang berupa fakta teramati vs opini: (a) Lubang memiliki diameter sekitar 10 cm; (b) Biopori adalah cara yang paling hebat dan tiada tandingannya?',
      ],
      indikatorInterpretasi:
        'Siswa yang masih menyamakan kalimat bersifat persuasif dengan fakta diberikan panduan penanda kata sifat subjektif terlebih dahulu.',
    },
    formatif: {
      instruksiAktivitas:
        'Saat tahap analisis & peer review berpasangan, guru memeriksa tabel kutipan bukti tekstual dan lembar umpan balik penyuntingan Paragraf 4.',
      pertanyaanAtauTugas: [
        'Tunjukkan minimal 2 frasa pada Paragraf 4 yang termasuk opini hiperbolis atau klaim tak berdasar beserta kutipan teksnya!',
        'Tukar hasil suntingan Paragraf 4 dengan teman sebangku lalu beri catatan: apakah kalimat revisi sudah objektif, logis, dan tidak mengarang angka statistik baru?',
      ],
      buktiYangDiamati: [
        'Siswa mengutip tepat frasa seperti "satu-satunya cara terbaik di dunia yang paling ajaib" dan "pasti melenyapkan seluruh banjir".',
        'Hasil peer review memberi saran revisi kalimat yang realistis dan berbasis bukti yang tertera pada Paragraf 1–3 saja.',
      ],
      umpanBalikGuru:
        'Pastikan siswa tidak menambah angka persentase karangan saat menyunting (misal mengarang "mengurangi banjir 90%") demi menjaga kejujuran sumber.',
    },
    akhir: {
      bentukUtama: 'Asesmen Individual Analisis Struktur, Bukti Tekstual, & Penyuntingan LHO',
      butirTugas: [
        {
          nomor: 1,
          bentuk: 'Pemetaan Struktur & Bukti Fakta vs Opini vs Klaim Tak Berdasar',
          pertanyaanAtauTugas:
            'Dari teks latihan "Lubang Resapan Biopori di Halaman Sekolah": (a) Petakan struktur Paragraf 1–3; (b) Kutip masing-masing 1 contoh kalimat fakta/definisi (Paragraf 1–2), 1 opini hiperbolis (Paragraf 4), dan 1 klaim tidak berdasar (Paragraf 4) beserta alasan mengapa klaim tersebut tidak berdasar!',
          kunciAtauContohRespons:
            '(a) Paragraf 1 = Pernyataan Umum/Klasifikasi (kalimat definisi "...adalah..."), Paragraf 2 = Deskripsi Bagian (ukuran lubang, cincin penguat, isi daun organik), Paragraf 3 = Deskripsi Manfaat (mengurangi genangan lokal & menghasilkan kompos). (b) Fakta/definisi: "...memiliki diameter bukaan sekitar 10 cm dengan kedalaman sekitar 80–100 cm..." atau "Lubang resapan biopori adalah..."; Opini hiperbolis: "...satu-satunya cara terbaik di dunia yang paling ajaib..."; Klaim tak berdasar: "...pasti melenyapkan seluruh banjir di kota besar mana pun tanpa perlu memperbaiki saluran drainase lain..." dan "...sudah sangat terkenal di kalangan seluruh pelajar" (generalisasi mutlak tanpa bukti observasi maupun sumber rujukan sah).',
        },
        {
          nomor: 2,
          bentuk: 'Penyuntingan Kalimat Objektif & Kejujuran Referensi',
          pertanyaanAtauTugas:
            'Sunting Paragraf 4 teks latihan di atas menjadi 2 kalimat penutup LHO yang objektif, baku, dan proporsional tanpa melebih-lebihkan fungsi maupun mengarang angka/kutipan sumber eksternal!',
          kunciAtauContohRespons:
            'Contoh suntingan objektif: "Meskipun bermanfaat membantu penyerapan air hujan di tingkat pekarangan, penerapan lubang resapan biopori perlu dipadukan dengan pemeliharaan saluran drainase utama agar pengendalian genangan berjalan lebih efektif. Oleh karena itu, pembuatan biopori di lingkungan sekolah dapat dijadikan salah satu langkah pendukung konservasi air dan pengelolaan sampah daun."',
        },
      ],
      pedomanPenilaian:
        'Penilaian individual memakai 4 tingkat pencapaian rubrik (Baru Berkembang, Layak, Cakap, Mahir) berbasis ketepatan pemetaan struktur, kutipan teks akurat, objektivitas kalimat suntingan, dan kedalaman peer review; penyesuaian skor numerik mengikuti KKTP satuan pendidikan.',
      kktpReferensi: kktpRef,
    },
  };

  const tahapTerstruktur: TahapKegiatanTerstruktur[] = [
    {
      id: 'sma-inq-pendahuluan',
      urutan: 1,
      fase: 'pendahuluan',
      namaTahap: 'Pendahuluan & Kontrak Analisis Objektif',
      tujuanTahap: 'Memicu kesadaran kritis terhadap kehandalan informasi deskriptif dalam teks laporan.',
      aktivitasGuru:
        'Guru menyapa kelas X, menjelaskan bahwa teks contoh kali ini adalah teks latihan kelas (bukan data riset eksternal), dan menetapkan target TP 10.1: menilai keabsahan definisi, struktur, fakta–opini–klaim, dan objektivitas bahasa LHO.',
      aktivitasSiswa:
        'Siswa mencermati tujuan pembelajaran dan menyiapkan penanda stabilo/garis bawah dua warna untuk memisahkan fakta observasi dari opini atau klaim berlebihan.',
      instruksiPertanyaan:
        '"Apa perbedaan utama antara cerita pengalaman pribadi, teks iklan yang melebih-lebihkan, dan laporan hasil observasi ilmiah?"',
      mediaBahan: 'Salinan Teks LHO Latihan "Lubang Resapan Biopori di Halaman Sekolah"',
      durasiMenit: 15,
      buktiBelajar: 'Kesiapan lembar teks latihan dan kategori penanda warna.',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Berkesadaran'],
    },
    {
      id: 'sma-inq-1-fenomena',
      urutan: 2,
      fase: 'inti',
      namaTahap: '1. Orientasi Fenomena dan Pemantik Inkuiri',
      tujuanTahap: 'Menemukan ketimpangan nada bahasa antara Paragraf 1–3 dengan Paragraf 4 pada teks LHO.',
      aktivitasGuru:
        'Guru meminta siswa membaca seluruh 4 paragraf teks latihan biopori secara senyap lalu mengarahkan fokus pada perubahan gaya bahasa mendadak pada paragraf terakhir.',
      aktivitasSiswa:
        'Siswa membaca teks dari Paragraf 1 hingga Paragraf 4 dan menandai bagian mana yang terasa janggal atau terlalu mengklaim berlebihan sebagai teks LHO.',
      instruksiPertanyaan:
        '"Bandingkan nada bahasa Paragraf 2 dengan Paragraf 4: bagian mana yang terdengar seperti iklan/opini mutlak alih-alih hasil observasi?"',
      mediaBahan: 'Lembar teks latihan 4 paragraf Lubang Resapan Biopori',
      durasiMenit: 15,
      buktiBelajar: 'Tanda garis bawah awal siswa pada kalimat mencurigakan di Paragraf 4.',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Bermakna'],
    },
    {
      id: 'sma-inq-2-pertanyaan',
      urutan: 3,
      fase: 'inti',
      namaTahap: '2. Merumuskan Pertanyaan Penyelidikan dan Dugaan Awal',
      tujuanTahap: 'Menyusun pertanyaan audit teks LHO (struktur, kalimat definisi, fakta vs opini vs klaim tak berdasar).',
      aktivitasGuru:
        'Guru membimbing kelompok merumuskan 3 pertanyaan investigasi teks dan kriteria pembeda antara: (a) fakta observasi, (b) opini subjektif, dan (c) klaim generalisasi tanpa dasar bukti.',
      aktivitasSiswa:
        'Siswa menyusun matriks dugaan awal: fungsi tiap paragraf (Pernyataan Umum, Deskripsi Bagian, Deskripsi Manfaat) dan dugaan unsur penyimpangan pada Paragraf 4.',
      instruksiPertanyaan:
        '"Bagaimana cara kita membedakan opini rasa pribadi dari klaim generalisasi mutlak seperti kata semua, seluruh, atau satu-satunya?"',
      mediaBahan: 'Matriks Investigasi LHO pada LKPD',
      durasiMenit: 18,
      buktiBelajar: 'Rumusan kriteria fakta vs opini vs klaim tak berdasar pada LKPD.',
      pengalamanBelajar: 'Memahami',
    },
    {
      id: 'sma-inq-3-investigasi',
      urutan: 4,
      fase: 'inti',
      namaTahap: '3. Merancang dan Melaksanakan Investigasi Bukti Tekstual',
      tujuanTahap: 'Mengumpulkan kutipan langsung bukti struktur, kalimat definisi/klasifikasi, kata teknis, fakta, opini, dan klaim dari teks.',
      aktivitasGuru:
        'Guru mendampingi kelompok melakukan pengumpulan bukti tekstual per paragraf dengan aturan ketat: wajib menyalin kutipan persis kata demi kata dan dilarang mengarang angka statistik baru.',
      aktivitasSiswa:
        'Siswa mengekstrak kutipan langsung dari teks: (1) kalimat definisi ("...adalah...") & klasifikasi pada Paragraf 1; (2) kata teknis (silindris, organik, fauna tanah, mikroorganisme, drainase); (3) bagian struktur Paragraf 1–3; (4) bukti frasa opini dan klaim tak berdasar pada Paragraf 4.',
      instruksiPertanyaan:
        '"Tulis kutipan persis kata per kata dari Paragraf 1 sampai 4 di kolom Bukti Tekstual—jangan menyingkat hingga maknanya berubah!"',
      mediaBahan: 'Tabel Ekstraksi Bukti Tekstual LHO',
      durasiMenit: 35,
      buktiBelajar: 'Tabel pemetaan struktur dan minimal 4 kutipan tekstual akurat.',
      pengalamanBelajar: 'Mengaplikasi',
      prinsipPembelajaran: ['Menggembirakan'],
    },
    {
      id: 'sma-inq-4-analisis-editing-peer',
      urutan: 5,
      fase: 'inti',
      namaTahap: '4. Menganalisis Temuan, Penyuntingan Kalimat, & Peer Review',
      tujuanTahap: 'Menyunting kalimat bermasalah agar objektif-baku lalu saling menguji kualitas suntingan antarpeserta didik.',
      aktivitasGuru:
        'Guru meminta setiap siswa menulis suntingan baru pengganti Paragraf 4 yang objektif dan logis, kemudian menukarkannya antarrekan (peer review) memakai daftar cek 3 butir: bebas hiperbola, bebas klaim tanpa bukti, dan ejaan/kalimat efektif sesuai kaidah.',
      aktivitasSiswa:
        'Siswa menyunting Paragraf 4 menjadi dua kalimat objektif–proporsional, lalu melakukan peer review silang dengan rekan kelompok lain menggunakan rubrik umpan balik tertulis.',
      instruksiPertanyaan:
        '"Saat memeriksa tulisan temanmu, cek: apakah ia masih menyelipkan kata pasti/ajaib, atau justru mengarang angka persentase baru yang tidak ada di teks?"',
      mediaBahan: 'Lembar Penyuntingan Kalimat & Formulir Peer Review 3 Kriteria',
      durasiMenit: 27,
      buktiBelajar: 'Draf revisi Paragraf 4 dan catatan umpan balik peer review tertandatangani teman sejawat.',
      pengalamanBelajar: 'Mengaplikasi',
      prinsipPembelajaran: ['Bermakna'],
    },
    {
      id: 'sma-inq-5-komunikasi-evaluasi',
      urutan: 6,
      fase: 'inti',
      namaTahap: '5. Mengomunikasikan Simpulan & Asesmen Individual',
      tujuanTahap: 'Menyajikan simpulan temuan LHO dan mengukur penguasaan tiap siswa secara individual.',
      aktivitasGuru:
        'Guru memfasilitasi 2 pasang siswa membacakan hasil suntingan terbaik beserta komentar peer review-nya, lalu membagikan lembar asesmen individual tertulis.',
      aktivitasSiswa:
        'Siswa menyimak paparan hasil suntingan teman dan mengerjakan asesmen individual akhir (pemetaan struktur, klasifikasi bukti kutipan fakta/opini/klaim, dan penyuntingan mandiri).',
      instruksiPertanyaan:
        '"Tulis simpulan akhir: kriteria apa yang wajib dipenuhi sebuah laporan pengamatan agar layak disebut LHO ilmiah yang objektif?"',
      mediaBahan: 'Lembar asesmen individual TP 10.1',
      durasiMenit: 15,
      buktiBelajar: 'Lembar jawaban asesmen individual tuntas dengan kutipan bukti tekstual.',
      pengalamanBelajar: 'Merefleksi',
    },
    {
      id: 'sma-inq-penutup',
      urutan: 7,
      fase: 'penutup',
      namaTahap: 'Penutup & Refleksi Literasi Sumber',
      tujuanTahap: 'Merefleksikan pentingnya kehati-hatian memverifikasi klaim saat membaca sumber.',
      aktivitasGuru:
        'Guru mengapresiasi ketelitian siswa menolak klaim mutlak tanpa bukti, mengumpulkan asesmen individual, dan memberi tindak lanjut mengamati objek nyata di sekolah untuk penulisan LHO pertemuan berikutnya.',
      aktivitasSiswa:
        'Siswa menulis satu kalimat refleksi mengenai kebiasaan mengecek bukti kutipan sebelum memercayai sebuah klaim informasi.',
      instruksiPertanyaan:
        '"Pelajaran terpenting apa tentang membedakan fakta dan klaim berlebihan yang dapat kalian terapkan saat membaca berita atau tugas laporan lain?"',
      mediaBahan: 'Kartu refleksi akhir kelas X',
      durasiMenit: 10,
      buktiBelajar: 'Catatan refleksi individu terkumpul.',
      pengalamanBelajar: 'Merefleksi',
      prinsipPembelajaran: ['Berkesadaran'],
    },
  ];

  const meeting = buildCuratedMeeting(
    1,
    3,
    135,
    'Pemetaan struktur LHO, investigasi bukti faktual vs opini/klaim tak berdasar, penyuntingan, dan peer review',
    tahapTerstruktur
  );

  const contohLKPD: ModulContohLKPD = {
    presetType: 'kasus',
    judul: 'Audit Teks LHO: Memilah Fakta, Opini, Klaim Tak Berdasar, & Penyuntingan',
    konteksTugas: contohLHOFullText,
    tujuanPengerjaan:
      'Memetakan struktur LHO, mengutip bukti faktual vs opini/klaim tidak berdasar secara persis, menyunting kalimat tidak objektif, dan melakukan peer review.',
    petunjukSiswa: [
      'Baca teks contoh latihan "Lubang Resapan Biopori di Halaman Sekolah" dari Paragraf 1 hingga 4.',
      'Salin kutipan persis dari teks saat mengisi kolom bukti; dilarang menambah atau mengarang angka statistik baru.',
    ],
    bahanAtauData: [
      'Teks latihan lengkap 4 paragraf Lubang Resapan Biopori',
      'Tabel Pemetaan Struktur & Klasifikasi Kalimat (Fakta / Opini / Klaim Tak Berdasar)',
      'Lembar Penyuntingan & Daftar Cek Peer Review 3 Kriteria',
    ],
    langkahPengerjaan: [
      '1. Pemetaan Struktur: Tandai mana Pernyataan Umum/Klasifikasi, Deskripsi Bagian, dan Deskripsi Manfaat beserta kalimat definisinya.',
      '2. Pengumpulan Bukti Tekstual: Ekstrak minimal 2 kata teknis, 1 fakta teramati, 1 opini hiperbolis, dan 1 klaim tanpa dasar bukti dari teks.',
      '3. Penyuntingan & Peer Review: Tulis ulang Paragraf 4 secara objektif dalam 2 kalimat, lalu tukar dengan teman sebangku untuk umpan balik 3 kriteria.',
    ],
    pertanyaanAtauRuangKerja: [
      '[Dasar] Bagian paragraf mana yang berfungsi sebagai Pernyataan Umum/Klasifikasi dan kalimat definisi apa yang menjadi penandanya?',
      '[Menengah] Kutip dua frasa bermasalah di Paragraf 4 lalu bedakan mana yang berupa opini subjektif hiperbolis dan mana yang berupa klaim generalisasi tak berdasar!',
      '[Mahir] Sunting Paragraf 4 menjadi paragraf penutup LHO yang objektif dan evaluatif tanpa mengarang data baru, lalu tuliskan hasil pengecekan peer review temanmu!',
    ],
    hasilYangDiharapkan:
      'Tabel audit bukti tekstual lengkap, 2 kalimat suntingan objektif, serta catatan peer review konstruktif.',
    kriteriaPenilaian: [
      'Ketepatan pemetaan struktur LHO dan kalimat definisi.',
      'Akurasi kutipan bukti tekstual pemilah fakta, opini, dan klaim tak berdasar.',
      'Kualitas kalimat suntingan objektif bebas hiperbola/data fiktif serta ketajaman peer review.',
    ],
    sumberLKPD: 'modul_terintegrasi',
  };

  const modul: ModulAjarDokumen = {
    id: 'contoh-modul-sma-10-bindo-lho',
    tpId: tp.id,
    modelType: modelDef.id,
    sintaksModelId: modelDef.id,
    draftSource: 'template',
    schoolId: sampleProfile.schoolId,
    tpSourceHash: computeTPContentHash(tp),
    needsReview: false,
    judul: `Contoh Modul Ajar SMA Kelas 10: Audit Kritis Teks LHO (${modelDef.namaSingkat})`,
    mataPelajaran: mapel,
    jenjangFase: jenjangToDefaultFase('SMA/MA', '10'),
    kelas: '10',
    rombel: sampleProfile.rombelAktif,
    semester: '1 (Ganjil)',
    tahunAjaran: sampleProfile.tahunAjaran,
    alokasiWaktu: '3 JP × 45 Menit = 135 Menit/pertemuan',
    alokasiWaktuDetail: {
      jenjangKategori: 'SMA/MA',
      jpPerPertemuan: 3,
      menitPerJP: 45,
      totalMenitPertemuan: 135,
      jumlahPertemuan: 1,
      totalAlokasiJPTP: 3,
      sumberPreset: 'preset_jenjang',
    },
    jumlahPertemuan: 1,
    namaSekolah: sampleProfile.namaSekolah,
    namaGuru: sampleProfile.namaGuru,
    nipGuru: sampleProfile.nipGuru,
    namaKepalaSekolah: sampleProfile.namaKepalaSekolah,
    nipKepalaSekolah: sampleProfile.nipKepalaSekolah,
    kotaSekolah: sampleProfile.kotaSekolah,
    createdAt: 'Template Terkurasi Task 12.4',
    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    elemen: tp.elemen,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    targetSubTP: tp.subTP?.map((s) => ({ id: s.id, kode: s.kode, kompetensi: s.kompetensi })),
    prasyaratMateri: tp.prasyarat?.join('; '),
    buktiKetercapaian: tp.buktiKetercapaian,
    kompetensiAwal: [
      'Peserta didik mengenal struktur dasar teks laporan hasil observasi dari jenjang SMP.',
      'Peserta didik memahami perbedaan kalimat baku–efektif dengan kalimat emotif iklan.',
    ],
    profilPelajarPancasila: [
      'Penalaran Kritis (memilah fakta observasi dari opini hiperbolis dan klaim tanpa bukti)',
      'Kreativitas & Komunikasi (menyunting bahasa laporan menjadi objektif dan memberi umpan balik peer review santun)',
    ],
    saranaPrasarana: [
      'Teks Contoh Latihan Kelas 4 Paragraf "Lubang Resapan Biopori di Halaman Sekolah"',
      'LKPD Pemetaan Struktur, Tabel Ekstraksi Bukti Tekstual, dan Formulir Peer Review',
      'Papan tulis atau proyektor untuk membedah suntingan kalimat',
    ],
    targetPesertaDidik:
      'Peserta didik kelas X SMA reguler dengan pendalaman analisis wacana kritis dan penyuntingan akademik.',
    modelPembelajaran: `${modelDef.label} - ${modelDef.deskripsi}`,
    pemahamanBermakna:
      'Laporan Hasil Observasi (LHO) yang kredibel menuntut keteraturan struktur klasifikasi–deskripsi serta bahasa objektif yang memisahkan fakta teramati dari opini hiperbolis dan klaim tak berdasar.',
    pertanyaanPemantik: [
      'Mengapa satu kalimat hiperbolis di bagian penutup bisa merusak kepercayaan pembaca terhadap keseluruhan laporan observasi?',
      'Bagaimana cara membedakan pernyataan yang memang didukung observasi dengan klaim generalisasi mutlak tanpa bukti?',
      'Perbaikan struktur dan diksi apa yang paling menentukan saat menyunting opini menjadi kalimat laporan ilmiah yang proporsional?',
    ],
    bahanBacaan: {
      ringkasanInti:
        'Teks LHO akademik disusun atas Pernyataan Umum/Klasifikasi (memakai kalimat definisi dan penggolongan), Deskripsi Bagian (rincian ciri fisik/bagian objek teramati), serta Deskripsi Manfaat/Simpulan yang objektif tanpa melebih-lebihkan atau mengarang statistik.',
      konsepKunci: ['Struktur LHO', 'Kalimat Definisi & Kata Teknis', 'Fakta vs Opini vs Klaim Tak Berdasar', 'Penyuntingan & Peer Review'],
      referensiCatatan: PROVENANCE_MSG_UNLINKED,
      penjelasanKonsepUtama:
        'Pada Fase E kelas X SMA, membaca teks Laporan Hasil Observasi (LHO) tidak berhenti pada mencari gagasan pokok, melainkan menimbang ketepatan klasifikasi ilmiah, kelengkapan deskripsi bagian, serta objektivitas bahasanya. LHO yang baik membedakan kalimat definisi ("...adalah...", "...merupakan...") pada Pernyataan Umum dari rincian terukur pada Deskripsi Bagian. Siswa perlu mengaudit secara kritis kemunculan opini subjektif (kata sifat bernada kagum berlebihan seperti "paling ajaib") dan klaim tidak berdasar (generalisasi mutlak seperti "selalu melenyapkan seluruh banjir tanpa drainase lain" atau angka statistik tanpa sumber). Di tahap penyuntingan dan peer review, kalimat tersebut diperbaiki agar proporsional tanpa menambah angka/sumber fiktif.\n\n' +
        contohLHOFullText,
      subKonsep: [
        {
          judul: 'Pemetaan Struktur & Kebahasaan LHO',
          uraian:
            'Pernyataan Umum mengenalkan objek melalui kalimat definisi dan penggolongan kelas. Deskripsi Bagian memerinci ukuran, komponen, dan kondisi objek teramati menggunakan kata teknis. Deskripsi Manfaat merangkum kegunaan objek secara proporsional.',
        },
        {
          judul: 'Audit Fakta, Opini, dan Klaim Tak Berdasar',
          uraian:
            'Fakta menyajikan informasi/ciri objek yang terverifikasi; opini mengungkapkan penilaian atau perasaan penulis ("terbaik", "ajaib"); sedangkan klaim tak berdasar mengajukan pernyataan mutlak atau sebab-akibat universal ("menghilangkan seluruh banjir di dunia") tanpa dukungan bukti ataupun rujukan sah.',
        },
      ],
      istilahPenting: [
        { istilah: 'Kalimat Definisi', pengertian: 'Kalimat penjelas hakikat atau klasifikasi objek yang ditandai kopula seperti "adalah" atau "merupakan".' },
        { istilah: 'Opini Subjektif', pengertian: 'Pernyataan berisi penilaian rasa, sikap, atau hiperbola penulis yang tidak seragam diukur secara objektif.' },
        { istilah: 'Klaim Tak Berdasar', pengertian: 'Pernyataan generalisasi mutlak atau kausal berlebihan yang disampaikan tanpa bukti pengamatan maupun sumber rujukan.' },
        { istilah: 'Peer Review', pengertian: 'Ulasan kritis berstruktur antarteman sejawat berpanduan rubrik kriteria bahasa dan kelogisan bukti.' },
      ],
      contohKonkret: [
        'Fakta LHO terukur: "Lubang biopori pada area latihan memiliki diameter bukaan sekitar 10 cm dengan kedalaman sekitar 80–100 cm..." (Paragraf 2).',
        'Opini hiperbolis & klaim tak berdasar pada Paragraf 4: "...satu-satunya cara terbaik di dunia yang paling ajaib dan pasti melenyapkan seluruh banjir di kota besar mana pun..."',
      ],
      contohPenyelesaian: {
        judulContoh: 'Audit & Penyuntingan Paragraf 4 Teks Latihan Biopori',
        konteks: 'Mengidentifikasi penyimpangan Paragraf 4 teks latihan dan menyusun suntingan objektif bebas data karangan.',
        langkahPenyelesaian: [
          'Langkah 1 (Tandai & Kutip): Tandai frasa opini ("paling ajaib", "cara terbaik di dunia") dan frasa klaim tak berdasar ("pasti melenyapkan seluruh banjir di kota besar mana pun", "seluruh pelajar").',
          'Langkah 2 (Evaluasi Alasan): Jelaskan bahwa cakupan biopori hanyalah resapan pekarangan skala kecil sehingga menyatakannya meniadakan peran drainase utama seluruh kota adalah generalisasi berlebihan tanpa bukti.',
          'Langkah 3 (Sunting Objektif tanpa Mengarang Data): Ganti dengan pernyataan proporsional: biopori dapat menjadi salah satu metode pendukung konservasi air tingkat pekarangan bila dipadukan dengan pemeliharaan saluran drainase.',
        ],
        kesimpulanHasil:
          'Paragraf hasil suntingan bebas kata hiperbola dan menjaga kejujuran informasi tanpa menyelipkan statistik buatan.',
      },
      hubunganDenganTP:
        'Seluruh rangkaian audit teks latihan, pemetaan struktur, penyuntingan, peer review, serta asesmen individual melatih siswa mencapai objektivitas analisis LHO sesuai TP 10.1.',
      potensiMiskonsepsi: [
        {
          miskonsepsi: 'Mengira sebuah kalimat menjadi "fakta ilmiah" asalkan ditambahkan angka persentase kira-kira oleh siswa saat menyunting.',
          caraMeluruskan: 'Ingatkan aturan integritas sumber: dilarang mengarang angka/statistik; gunakan kalimat kualitatif proporsional bila data kuantitatif tidak tersedia di sumber.',
        },
        {
          miskonsepsi: 'Menghakimi seluruh paragraf deskripsi manfaat sebagai "opini" padahal masih didukung alasan pengamatan mekanisme kompos yang masuk akal.',
          caraMeluruskan: 'Latih memeriksa apakah pernyataan disertai mekanisme teramati (Paragraf 3) vs klaim mutlak tanpa dasar (Paragraf 4).',
        },
      ],
    },
    kegiatanPembelajaran: [meeting],
    asesmen: summarizeAsesmenDetailToLegacy(asesmenDetail),
    asesmenDetail,
    rubrikPenilaianSingkat: [
      {
        kriteria: 'Pemetaan Struktur LHO & Bukti Tekstual Fakta/Opini/Klaim',
        baruBerkembang: 'Menyebut struktur tanpa dukungan kutipan teks yang tepat atau belum membedakan opini dari klaim tak berdasar.',
        layak: 'Memetakan struktur benar namun kutipan bukti pada Paragraf 4 masih kurang spesifik.',
        cakap: 'Memetakan struktur lengkap dan mengutip persis contoh fakta, opini, serta klaim tak berdasar beserta alasannya.',
        mahir: 'Menunjukkan bukti tekstual akurat lintas 4 paragraf sekaligus menganalisis dampak logika kesalahan klaimnya.',
      },
      {
        kriteria: 'Objektivitas Penyuntingan Kalimat & Kualitas Peer Review',
        baruBerkembang: 'Kalimat suntingan masih mengandung hiperbola/klaim mutlak atau umpan balik peer review hanya berupa komentar "sudah bagus".',
        layak: 'Suntingan cukup objektif namun masih kurang baku atau komentar peer review belum mengacu rubrik.',
        cakap: 'Menghasilkan suntingan objektif, baku, tanpa data fiktif serta memberi komentar peer review berbasis kriteria.',
        mahir: 'Menyajikan suntingan ringkas sangat jernih beserta saran koreksi konstruktif yang tajam dan santun bagi tulisan teman.',
      },
    ],
    diferensiasiOperasional: {
      prinsipKesetaraanTP:
        'Semua jalur belajar menuntaskan evaluasi struktur, fakta–opini–klaim, dan objektivitas kalimat teks LHO sesuai TP 10.1.',
      kesiapanDasar: {
        targetKesiapan: 'Mengenali struktur tiga bagian LHO dan memisahkan fakta vs opini dengan penanda kata kunci.',
        dukunganScaffolding: 'Guru menandai 4 kalimat kandidat terlebih dahulu dan memberikan daftar kata penanda opini/generalisasi mutlak ("paling", "seluruh", "pasti").',
        aktivitasKonkret: [
          'Mencocokkan Paragraf 1–3 dengan kartu label Pernyataan Umum, Deskripsi Bagian, dan Deskripsi Manfaat serta menggarisbawahi kalimat definisi.',
          'Memilih dan mengelompokkan 4 kalimat kandidat yang disiapkan guru ke kolom Fakta atau Opini/Klaim Tak Berdasar.',
        ],
        mediaPendukung: 'Kartu penanda kalimat definisi/opini dan tabel pilah 2 kolom',
        buktiBelajarJalur: 'Peta struktur dan klasifikasi 4 kalimat kandidat tepat.',
      },
      kesiapanBerkembang: {
        targetKesiapan: 'Mengekstrak bukti tekstual sendiri, menyunting Paragraf 4, dan melaksanakan peer review 3 kriteria.',
        dukunganScaffolding: 'Tabel ekstraksi 3 kategori (Fakta, Opini Hiperbolis, Klaim Tak Berdasar) dan daftar cek peer review.',
        aktivitasKonkret: [
          'Mengutip langsung unsur struktur, kata teknis, fakta, opini, dan klaim dari teks biopori ke tabel investigasi.',
          'Menulis 2 kalimat suntingan pengganti Paragraf 4 lalu bertukar lembar review 3 butir dengan pasangan.',
        ],
        mediaPendukung: 'LKPD investigasi LHO reguler dan lembar cek peer review',
        buktiBelajarJalur: 'Tabel kutipan lengkap, suntingan objektif, dan catatan peer review.',
      },
      kesiapanMahir: {
        targetKesiapan: 'Mengaudit kohesi lintas paragraf, memperbaiki klaim kausal berlebihan, dan membimbing penyuntingan rekan.',
        dukunganScaffolding: 'Tugas perluasan mengidentifikasi kesalahan penalaran generalisasi tergesa-gesa (hasty generalization) dan menulis catatan evaluasi editorial.',
        aktivitasKonkret: [
          'Menganalisis dua jenis sesat klaim di Paragraf 4 (hiperbola vs generalisasi tak berdasar) dan dampaknya pada kredibilitas laporan.',
          'Menyusun suntingan paragraf penutup LHO bertaraf editorial sekaligus memberi saran perbaikan diksi & keefektifan kalimat pada karya teman.',
        ],
        mediaPendukung: 'Panduan audit logika klaim LHO & rubrik editorial rekan',
        buktiBelajarJalur: 'Analisis sesat klaim kritis, suntingan editorial tajam, dan ulasan peer review mendalam.',
      },
    },
    contohLKPD,
    pengayaanDanRemedial: {
      pengayaan:
        'Membaca artikel LHO populer bertema keanekaragaman hayati dari majalah/portal resmi yang disediakan guru dan mengaudit apakah klaim statistiknya menyertakan sumber terverifikasi.',
      remedial:
        'Latihan klasifikasi terpandu 6 kalimat campuran fakta–opini–klaim menggunakan kartu kata penanda subjektivitas sebelum menyunting ulang 1 kalimat.',
    },
    refleksiGuru: [
      'Apakah teks contoh 4 paragraf sudah cukup memberi ruang investigasi nyata tanpa memerlukan akses internet atau sumber fiktif?',
      'Sejauh mana rubrik peer review 3 kriteria menghasilkan umpan balik bermakna antarsiswa?',
    ],
    refleksiSiswa: [
      'Ciri kata atau klaim apa yang paling membantu kamu mendeteksi pernyataan berlebihan dalam sebuah laporan?',
      'Umpan balik teman mana dalam peer review tadi yang paling memperbaiki hasil suntinganmu?',
    ],
    glosarium: [
      { istilah: 'Teks LHO', definisi: 'Teks laporan objektif hasil pengamatan yang tersusun dari pernyataan umum/klasifikasi, deskripsi bagian, dan manfaat.' },
      { istilah: 'Klaim Tak Berdasar', definisi: 'Pernyataan mutlak/universal tanpa dukungan bukti empiris atau sumber acuan sah.' },
      { istilah: 'Kata Teknis', definisi: 'Istilah khusus bidang ilmu tertentu (misal: silindris, mikroorganisme, drainase) dalam laporan pengamatan.' },
    ],
    daftarPustaka: [
      PROVENANCE_MSG_UNLINKED,
      'Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka.',
    ],
    catatanValidasi: {
      status: 'template_awal',
      usedFallback: false,
      structuralIssues: [],
      relevanceAndAntiSlopIssues: [],
      semanticReviewWarnings: [CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER],
    },
  };

  return {
    id: 'sma_10_bindo_lho',
    badgeLabel: CURATED_EXAMPLE_BADGE_LABEL,
    provenanceDisclaimer: CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER,
    jenjang: 'SMA/MA',
    kelas: '10',
    mataPelajaran: mapel,
    tema: 'Teks Laporan Hasil Observasi (LHO)',
    modelType: 'inquiry',
    modelLabel: modelDef.label,
    alokasiRingkas: '3 JP × 45 menit = 135 menit',
    ringkasanKeunggulan:
      'Menyediakan teks latihan LHO utuh 4 paragraf untuk audit struktur, pemilahan fakta–opini–klaim, kutipan tekstual, penyuntingan, & peer review tanpa statistik karangan.',
    tp,
    sampleProfile,
    modul,
  };
}

// =========================================================================
// CONTOH D: SMK KELAS 11 — PKK (Project-Based Learning, 4 JP x 45 mnt = 180 mnt)
// =========================================================================
function createSMKPKKPrototipeExample(): CuratedModulExample {
  const mapel = 'Produk Kreatif dan Kewirausahaan (PKK)';
  const sampleProfile = makeTemplateSampleProfile({
    jenjang: 'SMK',
    kelasUtama: '11',
    mataPelajaranUtama: mapel,
  });
  const tp = resolveCatalogTP({
    jenjang: 'SMK',
    kelas: '11',
    mapel,
    topicPattern: /prototipe|k3lh|hpp|bep/i,
    fallbackTP: {
      id: 'tp-contoh-smk-pkk-11-1',
      kode: '11.1',
      elemen: 'K3LH, Prototipe & Struktur Biaya',
      materiPokok: 'Keselamatan Kerja K3LH & 5R Bengkel, Pembuatan Prototipe, dan Perhitungan HPP serta BEP',
      tujuanPembelajaran:
        'Peserta didik dapat menerapkan audit K3LH dan penataan 5R di ruang produksi sebelum membuat sampel prototipe serta menghitung Harga Pokok Produksi (HPP) per unit dan titik impas (BEP).',
      arahanRangkuman:
        'Pastikan komponen biaya overhead, SOP APD bengkel/5R, dan bahan baku terhitung akurat agar produk aman dibuat dan tidak rugi dijual.',
      alokasiJP: 4,
      mingguMulai: 1,
      mingguSelesai: 1,
      prasyarat: ['Desain produk & matematika BEP'],
      buktiKetercapaian: ['Audit 5R/K3LH lengkap dan perhitungan HPP–BEP unit konsisten'],
    },
  });

  const modelDef = getModulAjarModelDefinition('pjbl');
  const kktpRef = resolveModulKKTPConfig(tp, sampleProfile);
  // Verifikasi aritmetika HPP & BEP untuk 1 batch uji = 20 unit Rak Organiser Meja Modular:
  // Bahan baku: Rp240.000; Bahan penolong & kemasan: Rp60.000; Upah kerja langsung: Rp100.000; Overhead variabel (amplas/listrik/finishing): Rp40.000
  // -> Total Biaya Variabel = Rp440.000 -> VC/unit = Rp22.000.
  // -> Biaya Tetap Proyek (FC: cetakan jig, sewa/penyusutan alat & promosi awal): Rp160.000.
  // -> Total Biaya Batch (20 unit) = 440.000 + 160.000 = Rp600.000.
  // -> HPP/unit = 600.000 / 20 = Rp30.000/unit.
  // -> Jika Harga Jual (P) = Rp38.000/unit -> Margin Kontribusi (P - VC) = 38.000 - 22.000 = Rp16.000/unit.
  // -> BEP Unit = 160.000 / 16.000 = 10 unit; BEP Rupiah = 10 x 38.000 = Rp380.000.
  // -> Laba batch 20 unit bila terjual habis = (20 x 38.000) - 600.000 = 760.000 - 600.000 = Rp160.000.
  const asesmenDetail = {
    diagnostik: {
      tujuanPemeriksaanPrasyarat:
        'Mengidentifikasi kesiapan awal siswa mengenai bahaya area praktik jurusannya, APD wajib, konsep 5R, serta komponen biaya tetap vs biaya variabel.',
      pertanyaanAtauTugasAwal: [
        'Sebutkan 2 contoh risiko kerja dan APD wajib yang relevan di ruang praktik jurusanmu (misal dapur boga vs bengkel kayu/logam vs studio desain)!',
        'Dari daftar berikut, kelompokkan mana biaya variabel per unit dan mana biaya tetap awal: bahan baku papan/kemasan, penggaris/cetakan jig alat, dan listrik kerja!',
      ],
      indikatorInterpretasi:
        'Kelompok yang tertukar membedakan biaya bahan habis pakai per unit dan biaya tetap alat dibimbing menggunakan tabel dua kolom sebelum menyusun RAB proyek.',
    },
    formatif: {
      instruksiAktivitas:
        'Dilakukan saat menyusun perencanaan, jadwal, dan inspeksi area kerja sebelum perakitan sampel prototipe dimulai.',
      pertanyaanAtauTugas: [
        'Lakukan cek silang daftar bahan/alat, SOP urutan kerja, titik K3LH, dan kondisi 5R meja kerja kelompok sebelum menyalakan alat listrik atau memotong bahan!',
        'Hitung HPP per unit dan BEP unit sementara dari tabel biaya proyek batch 20 unit lalu periksa apakah harga jual yang diusulkan masih memberi margin sehat!',
      ],
      buktiYangDiamati: [
        'Lembar periksa K3LH/5R ditandatangani (kabel rapi, APD terpakai sesuai risiko, ventilasi cukup saat pengecatan/lem).',
        'Hitungan sementara konsisten: VC = Rp22.000/unit, Total Biaya = Rp600.000, HPP = Rp30.000/unit.',
      ],
      umpanBalikGuru:
        'Tegaskan bahwa SOP & APD harus disesuaikan dengan jenis produk & bahan jurusan—tidak boleh menyamakan prosedur bengkel las ke studio jahit atau tata boga.',
    },
    akhir: {
      bentukUtama: 'Penilaian Proses K3LH/5R, Produk Prototipe, & Perhitungan HPP–BEP Proyek',
      butirTugas: [
        {
          nomor: 1,
          bentuk: 'Audit SOP, K3LH, & 5R Sesuai Kompetensi Keahlian',
          pertanyaanAtauTugas:
            'Kelompokmu berencana menguji perakitan prototipe menggunakan alat potong dan perekat/finishing berbasis pelarut di meja praktik. Rumuskan 3 langkah SOP K3LH wajib serta 2 penerapan 5R spesifik di area kerja, dan jelaskan mengapa daftar APD jurusanmu berbeda dari jurusan lain!',
          kunciAtauContohRespons:
            'K3LH: (1) pastikan kabel alat bebas lecet & kering; (2) pakai APD sesuai risiko alat/bahan (kacamata pelindung & sarung tangan anti-gores saat memotong/mengamplas; masker respirator & ventilasi terbuka saat finishing berpelarut); (3) periksa P3K dan jarak benda mudah terbakar. 5R: Ringkas–Rapi (simpan alat ukur dan cutter bersarung pada shadow board/baki berlabel) serta Resik (bersihkan serbuk/sisa lem segera setelah tiap tahap agar permukaan prototipe bersih). Setiap jurusan wajib menyesuaikan APD & SOP menurut jenis bahan, mesin, dan risikonya (mis. Tata Boga wajib higienitas & sarung tangan tahan panas, Teknik Pemesinan wajib safety goggles & larangan pakaian longgar, DKV/RPL menjaga keselamatan listrik dan alas potong cutter).',
        },
        {
          nomor: 2,
          bentuk: 'Verifikasi HPP, BEP Unit, BEP Rupiah, & Keputusan Harga Proyek',
          pertanyaanAtauTugas:
            'Satu batch proyek prototipe berjumlah 20 unit memiliki rincian: bahan baku Rp240.000, kemasan & penolong Rp60.000, upah tenaga kerja variabel Rp100.000, overhead variabel Rp40.000, serta biaya tetap proyek (cetakan/jig & persiapan awal) Rp160.000. Hitunglah: (a) Biaya Variabel per unit (VC); (b) HPP per unit; (c) BEP Unit dan BEP Rupiah jika ditetapkan harga jual Rp38.000/unit; serta (d) estimasi laba bila seluruh 20 unit terjual!',
          kunciAtauContohRespons:
            '(a) Total Biaya Variabel = 240.000 + 60.000 + 100.000 + 40.000 = Rp440.000 -> VC = 440.000 / 20 = Rp22.000/unit. (b) Total Biaya = 440.000 + 160.000 = Rp600.000 -> HPP = 600.000 / 20 = Rp30.000/unit. (c) Margin kontribusi = 38.000 − 22.000 = Rp16.000/unit -> BEP Unit = 160.000 / 16.000 = 10 unit; BEP Rupiah = 10 × Rp38.000 = Rp380.000 (Cek balik: 10 × 22.000 + 160.000 = 380.000). (d) Laba batch 20 unit = (20 × 38.000) − 600.000 = 760.000 − 600.000 = Rp160.000.',
        },
      ],
      pedomanPenilaian:
        'Penilaian menggabungkan proses kerja aman (audit K3LH/5R selama praktik), kelayakan fungsi & kerapian prototipe akhir, dan akurasi kalkulasi HPP/BEP tanpa angka ketuntasan tetap; konversi skor mengikuti ketentuan KKTP satuan pendidikan.',
      kktpReferensi: kktpRef,
    },
  };

  const tahapTerstruktur: TahapKegiatanTerstruktur[] = [
    {
      id: 'smk-pjbl-pendahuluan',
      urutan: 1,
      fase: 'pendahuluan',
      namaTahap: 'Pendahuluan & Penyelarasan K3LH–Mutu Produk',
      tujuanTahap: 'Memeriksa kesiapan peserta didik, pakaian kerja praktik, serta tujuan TP 11.1.',
      aktivitasGuru:
        'Guru menyapa siswa di ruang praktik/kelas kejuruan, memeriksa kerapian atribut keselamatan kerja dasar, dan menguraikan target proyek hari ini: menyusun perencanaan prototipe aman K3LH/5R lengkap dengan kalkulasi HPP & BEP.',
      aktivitasSiswa:
        'Siswa mengecek kelengkapan alat tulis, kalkulator/lembar kerja RAB, serta mengidentifikasi risiko spesifik bidang keahlian masing-masing sebelum merancang proyek.',
      instruksiPertanyaan:
        '"Mengapa dua kesalahan ini paling sering membuat usaha siswa gagal saat uji produk: kecelakaan kerja akibat abai SOP K3LH atau salah menghitung HPP sehingga rugi per unit?"',
      mediaBahan: 'Daftar periksa kesiapan area kerja dan TP 11.1',
      durasiMenit: 15,
      buktiBelajar: 'Catatan kesiapan K3LH dasar dan pemahaman komponen biaya.',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Berkesadaran'],
    },
    {
      id: 'smk-pjbl-1-pertanyaan-mendasar',
      urutan: 2,
      fase: 'inti',
      namaTahap: '1. Penentuan Pertanyaan Mendasar (essential question)',
      tujuanTahap: 'Merumuskan tantangan proyek penciptaan produk/jasa yang aman diproduksi dan layak secara ekonomi.',
      aktivitasGuru:
        'Guru memaparkan studi kebutuhan pelajar/kantor sekolah akan produk praktis (contoh acuan: Rak Organiser Meja Modular & Kemasan Edukatif, yang dapat diganti produk kejuruan masing-masing) dan membimbing kelompok merumuskan pertanyaan mendasar proyek.',
      aktivitasSiswa:
        'Siswa berdiskusi menetapkan jenis prototipe sesuai kompetensi jurusannya (atau memilih contoh Rak Organiser Modular) dan menulis Pertanyaan Mendasar: bagaimana merancang prototipe berstandar SOP K3LH–5R sekaligus menjaga HPP & harga jual tetap kompetitif.',
      instruksiPertanyaan:
        '"Bagaimana tim kalian merancang prototipe produk kejuruan yang kokoh/fungsional, aman dibuat sesuai SOP K3LH & 5R bengkel/studio kalian, dan titik impas (BEP)-nya tercapai di bawah target penjualan pertama?"',
      mediaBahan: 'Brief Tantangan Proyek PKK & Sampel Prototipe Pembanding',
      durasiMenit: 20,
      buktiBelajar: 'Rumusan Pertanyaan Mendasar proyek dan pilihan produk kelompok.',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Bermakna'],
    },
    {
      id: 'smk-pjbl-2-desain-rencana',
      urutan: 3,
      fase: 'inti',
      namaTahap: '2. Mendesain Perencanaan Produk / Proyek',
      tujuanTahap: 'Menyusun desain spesifikasi prototipe, daftar bahan & alat, SOP kerja aman K3LH/5R, dan struktur biaya HPP–BEP.',
      aktivitasGuru:
        'Guru membagikan lembar perencanaan proyek berisi: (1) sketsa & spesifikasi ukuran produk, (2) daftar bahan & alat sesuai konteks jurusan, (3) SOP kerja + APD + protokol 5R, serta (4) tabel rincian biaya tetap vs variabel untuk HPP dan BEP.',
      aktivitasSiswa:
        'Siswa menggambar sketsa ukuran prototipe, mendaftar bahan & alat (mis. cutter bersarung pengaman, penggaris baja, alas potong, bahan kemasan/tripleks ringan; disesuaikan jika boga/busana/TKJ), menentukan APD khusus risiko alatnya, dan menghitung HPP batch 20 unit (`VC = Rp22.000`, `HPP = Rp30.000`, `BEP = 10 unit` pada harga `Rp38.000`).',
      instruksiPertanyaan:
        '"Cek lagi alat apa saja di daftar kalian yang bersentuhan dengan benda tajam, panas, bahan kimia lem/cat, atau listrik—APD dan SOP apa yang spesifik wajib disiapkan?"',
      mediaBahan: 'Templat Desain Prototipe, SOP K3LH–5R, & Kalkulator Biaya HPP/BEP',
      durasiMenit: 30,
      buktiBelajar: 'Dokumen desain sketsa, daftar alat–bahan, SOP K3LH/5R, dan tabel HPP/BEP terhitung benar.',
      pengalamanBelajar: 'Memahami',
    },
    {
      id: 'smk-pjbl-3-jadwal-peran',
      urutan: 4,
      fase: 'inti',
      namaTahap: '3. Menyusun Jadwal dan Pembagian Peran Proyek',
      tujuanTahap: 'Menetapkan lini masa pengerjaan, pembagian tugas (Desain/QC, Produksi Aman K3LH, Finance HPP), dan target tiap fase.',
      aktivitasGuru:
        'Guru membimbing kelompok memecah proyek ke dalam 4 tahap jadwal realistis (Pra-produksi & Audit 5R, Pembuatan Sampel Unit 1, Uji Mutu/Revisi Teknis, Finalisasi & Pelaporan Keuangan) beserta penanggung jawabnya.',
      aktivitasSiswa:
        'Siswa mengisi tabel jadwal kerja berbasis durasi menit/hari dan menuliskan tanggung jawab spesifik tiap anggota termasuk petugas pengawas K3LH–5R kelompok.',
      instruksiPertanyaan:
        '"Siapa di tim kalian yang bertugas memverifikasi 5R dan kelayakan APD sebelum pekerjaan memotong/perakitan dimulai?"',
      mediaBahan: 'Tabel Lini Masa Proyek & Matriks Pembagian Peran Tim',
      durasiMenit: 20,
      buktiBelajar: 'Jadwal proyek 4 fase terisi lengkap dan peran pengawas K3LH–QC ditetapkan.',
      pengalamanBelajar: 'Memahami',
      prinsipPembelajaran: ['Berkesadaran'],
    },
    {
      id: 'smk-pjbl-4-monitor-progres',
      urutan: 5,
      fase: 'inti',
      namaTahap: '4. Memonitor Pelaksanaan dan Progres Produk (Simulasi SOP K3LH–5R & Perakitan Sampel)',
      tujuanTahap: 'Menerapkan inspeksi K3LH/5R area kerja dan memantau progres pembuatan komponen awal prototipe & pengecekan biaya aktual.',
      aktivitasGuru:
        'Guru mendampingi kelompok melakukan inspeksi pra-kerja 5R (Ringkas–Rapi–Resik–Rawat–Rajin), memberi izin mulai simulasi/pembuatan komponen awal prototipe sesuai SOP jurusan, serta memantau kepatuhan APD dan pencatatan sisa/susut bahan (waste control).',
      aktivitasSiswa:
        'Siswa membersihkan dan menata meja kerja dengan prinsip 5R (menempatkan alat tajam di baki aman dan menjauhkan bahan berpelarut dari sumber panas/listrik), menyusun bagian dasar prototipe sesuai gambar kerja, serta mencatat pemakaian bahan dan temuan kendala proses.',
      instruksiPertanyaan:
        '"Apakah ada selisih pemakaian bahan atau langkah SOP yang memakan waktu lebih lama dari jadwal sehingga berisiko menaikkan HPP?"',
      mediaBahan: 'Area meja kerja 5R, bahan/alat simulasi prototipe sesuai jurusan, kartu cek progres & K3LH',
      durasiMenit: 45,
      buktiBelajar: 'Checklist K3LH & 5R tertandatangani, progres mock-up/komponen awal prototipe, serta log pemakaian bahan.',
      pengalamanBelajar: 'Mengaplikasi',
      prinsipPembelajaran: ['Menggembirakan'],
    },
    {
      id: 'smk-pjbl-5-uji-presentasi',
      urutan: 6,
      fase: 'inti',
      namaTahap: '5. Menguji Hasil dan Mempresentasikan Produk serta Analisis HPP–BEP',
      tujuanTahap: 'Menguji kelayakan fungsi, kerapian, keamanan K3LH, dan presentasi rincian biaya/BEP.',
      aktivitasGuru:
        'Guru memimpin sesi uji fungsi & inspeksi silang (uji kekokohan, kebersihan finishing, keamanan tepi produk) sekaligus memeriksa pembuktian kalkulasi HPP = Rp30.000/unit, harga jual Rp38.000, BEP = 10 unit / Rp380.000, dan laba Rp160.000.',
      aktivitasSiswa:
        'Siswa mempresentasikan hasil prototipe/rancangan lengkap bersama hasil uji mutu, kepatuhan K3LH/5R saat pengerjaan, serta memaparkan titik impas BEP dan rencana penetapan harga jualnya.',
      instruksiPertanyaan:
        '"Jika pada uji pasar hanya terjual 12 unit dari batch 20 unit, berdasarkan BEP 10 unit apakah proyek sudah melewati titik impas dan berapa sisa marginnya?"',
      mediaBahan: 'Rubrik Uji Fungsi Produk, Kelayakan K3LH, dan Lembar Validasi HPP–BEP',
      durasiMenit: 25,
      buktiBelajar: 'Skor uji fungsi produk dan lembar presentasi struktur biaya–BEP terverifikasi.',
      pengalamanBelajar: 'Mengaplikasi',
      prinsipPembelajaran: ['Bermakna'],
    },
    {
      id: 'smk-pjbl-6-evaluasi-proyek',
      urutan: 7,
      fase: 'inti',
      namaTahap: '6. Evaluasi Pengalaman dan Refleksi Budaya Kerja 5R & Efisiensi Biaya',
      tujuanTahap: 'Mengevaluasi celah efisiensi biaya, kualitas K3LH, dan rencana perbaikan revisi prototipe.',
      aktivitasGuru:
        'Guru memimpin refleksi lintas kelompok atas temuan cacat bahan (waste), kepatuhan SOP keselamatan kerja spesifik jurusan masing-masing, serta langkah efisiensi untuk menurunkan HPP tanpa menurunkan mutu.',
      aktivitasSiswa:
        'Siswa menyusun daftar perbaikan prototipe (revisi ukuran/bahan atau SOP kerja aman) beserta target penghematan biaya overhead maupun susut bahan.',
      instruksiPertanyaan:
        '"Bagian mana dari SOP atau pemilihan bahan tadi yang bila diperbaiki akan paling mengurangi risiko cacat produk dan bahaya kerja?"',
      mediaBahan: 'Lembar Evaluasi Pasca-Proyek & Rencana Revisi',
      durasiMenit: 15,
      buktiBelajar: 'Daftar evaluasi efisiensi biaya, K3LH, dan rekomendasi perbaikan desain.',
      pengalamanBelajar: 'Merefleksi',
    },
    {
      id: 'smk-pjbl-penutup',
      urutan: 8,
      fase: 'penutup',
      namaTahap: 'Penutup, Pembersihan 5R Akhir, & Umpan Balik',
      tujuanTahap: 'Memastikan seluruh area praktik kembali rapi sesuai 5R dan menilai pemahaman akhir individu.',
      aktivitasGuru:
        'Guru mengecek kembali penataan 5R akhir (alat terbungkus/tersimpan rapi di tempatnya, kabel tergulung aman, meja bersih), memberikan umpan balik, serta menugaskan cek evaluasi akhir K3LH & perhitungan HPP–BEP.',
      aktivitasSiswa:
        'Siswa membersihkan dan mengembalikan seluruh alat ke tempat berlabel (5R Resik–Rawat–Rajin), mematikan sambungan listrik, dan menyelesaikan butir cek evaluasi akhir individu.',
      instruksiPertanyaan:
        '"Pastikan seluruh alat tajam dan kelistrikan sudah aman sebelum keluar ruang praktik—lalu tuntaskan evaluasi K3LH & BEP pada LKPD!"',
      mediaBahan: 'Daftar cek penutupan 5R ruang praktik & soal evaluasi akhir individu',
      durasiMenit: 10,
      buktiBelajar: 'Ruang kerja bersih sesuai standar 5R dan lembar evaluasi akhir individu lengkap.',
      pengalamanBelajar: 'Merefleksi',
      prinsipPembelajaran: ['Berkesadaran'],
    },
  ];

  const meeting = buildCuratedMeeting(
    1,
    4,
    180,
    'Perencanaan proyek prototipe kejuruan: SOP K3LH & 5R adaptif, jadwal proyek, uji fungsi, dan kalkulasi HPP–BEP',
    tahapTerstruktur
  );

  const contohLKPD: ModulContohLKPD = {
    presetType: 'proyek',
    judul: 'Proyek Perencanaan Prototipe Produk Kejuruan, Audit K3LH–5R, & Struktur Biaya HPP–BEP',
    konteksTugas:
      'Tim proyek merancang 1 batch uji berisi 20 unit prototipe produk kejuruan (acuan contoh: Rak Organiser Meja Modular; alat, bahan, dan APD wajib disesuaikan dengan kompetensi keahlian masing-masing) dengan rincian biaya batch: bahan baku Rp240.000, kemasan/penolong Rp60.000, tenaga kerja Rp100.000, overhead variabel Rp40.000, serta biaya tetap proyek Rp160.000.',
    tujuanPengerjaan:
      'Menyusun desain rencana produk, jadwal & peran tim, checklist SOP K3LH & 5R spesifik risiko jurusan, serta memverifikasi HPP/unit, BEP Unit/Rupiah, dan kelayakan harga jual Rp38.000/unit.',
    petunjukSiswa: [
      'Sesuaikan kolom bahan, alat, dan APD wajib dengan kompetensi keahlian serta tingkat bahaya area praktik kelompokmu.',
      'Tunjukkan langkah perhitungan lengkap HPP dan BEP beserta pemeriksaan balik sebelum menetapkan harga jual.',
    ],
    bahanAtauData: [
      'Lembar Kerja Desain Prototipe, Daftar Bahan & Alat, serta SOP Kerja Aman',
      'Checklist Inspeksi K3LH & Budaya Kerja 5R (Ringkas, Rapi, Resik, Rawat, Rajin)',
      'Tabel Struktur Biaya Batch 20 Unit (Total Biaya Variabel Rp440.000 + Biaya Tetap Rp160.000)',
      'Tabel Lini Masa Proyek (4 Fase Kerja & Pembagian Peran Tim)',
    ],
    langkahPengerjaan: [
      '1. Pertanyaan Mendasar & Desain: Tetapkan spesifikasi prototipe, bahan, dan daftar alat kerja.',
      '2. Audit K3LH & 5R: Petakan potensi bahaya fisik/kimia/listrik alat yang dipakai beserta APD wajib dan jadwal penataan 5R.',
      '3. Jadwal & Peran: Susun jadwal 4 tahap (Pra-produksi, Unit 1, Uji Mutu, Pelaporan) dan penanggung jawab QC & K3LH.',
      '4. Kalkulasi HPP–BEP & Uji Produk: Hitung VC/unit (Rp22.000), HPP (Rp30.000), BEP (10 unit / Rp380.000), serta lakukan uji fungsi dan evaluasi efisiensi.',
    ],
    pertanyaanAtauRuangKerja: [
      '[Dasar] Identifikasi 3 potensi bahaya spesifik dari alat/bahan proyek kelompokmu dan tuliskan APD wajib serta tindakan 5R pencegahannya!',
      '[Menengah] Hitung Biaya Variabel per unit (VC), Total Biaya Batch 20 unit, dan HPP per unit dari tabel anggaran di atas!',
      '[Mahir] Jika harga jual ditetapkan Rp38.000/unit, buktikan berapa BEP Unit dan BEP Rupiahnya, berapa laba bersih jika semua 20 unit terjual, serta revisi SOP/bahan apa yang bisa menurunkan risiko cacat produk?',
    ],
    hasilYangDiharapkan:
      'Paket perencanaan prototipe lengkap (sketsa, jadwal, checklist K3LH–5R, sampel/uji produk, dan lembar hitungan HPP Rp30.000 & BEP 10 unit terverifikasi).',
    kriteriaPenilaian: [
      'Kesesuaian SOP K3LH, APD, dan 5R dengan bahan serta alat spesifik bidang keahlian (tidak menyamaratakan semua jurusan).',
      'Kelengkapan perencanaan desain produk, pembagian peran, dan kejelasan jadwal proyek.',
      'Akurasi perhitungan VC, HPP, BEP Unit, BEP Rupiah, dan pemeriksaan kualitas proses–produk.',
    ],
    sumberLKPD: 'modul_terintegrasi',
  };

  const modul: ModulAjarDokumen = {
    id: 'contoh-modul-smk-11-pkk-prototipe',
    tpId: tp.id,
    modelType: modelDef.id,
    sintaksModelId: modelDef.id,
    draftSource: 'template',
    schoolId: sampleProfile.schoolId,
    tpSourceHash: computeTPContentHash(tp),
    needsReview: false,
    judul: `Contoh Modul Ajar SMK Kelas 11 PKK: Prototipe, K3LH–5R, & HPP/BEP (${modelDef.namaSingkat})`,
    mataPelajaran: mapel,
    jenjangFase: jenjangToDefaultFase('SMK', '11'),
    kelas: '11',
    rombel: sampleProfile.rombelAktif,
    semester: '1 (Ganjil)',
    tahunAjaran: sampleProfile.tahunAjaran,
    alokasiWaktu: '4 JP × 45 Menit = 180 Menit/pertemuan',
    alokasiWaktuDetail: {
      jenjangKategori: 'SMK',
      smkTrack: 'kejuruan',
      jpPerPertemuan: 4,
      menitPerJP: 45,
      totalMenitPertemuan: 180,
      jumlahPertemuan: 1,
      totalAlokasiJPTP: 4,
      sumberPreset: 'preset_jenjang',
    },
    jumlahPertemuan: 1,
    namaSekolah: sampleProfile.namaSekolah,
    namaGuru: sampleProfile.namaGuru,
    nipGuru: sampleProfile.nipGuru,
    namaKepalaSekolah: sampleProfile.namaKepalaSekolah,
    nipKepalaSekolah: sampleProfile.nipKepalaSekolah,
    kotaSekolah: sampleProfile.kotaSekolah,
    createdAt: 'Template Terkurasi Task 12.4',
    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    elemen: tp.elemen,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    targetSubTP: tp.subTP?.map((s) => ({ id: s.id, kode: s.kode, kompetensi: s.kompetensi })),
    prasyaratMateri: tp.prasyarat?.join('; '),
    buktiKetercapaian: tp.buktiKetercapaian,
    kompetensiAwal: [
      'Peserta didik telah menyusun konsep desain dasar produk atau layanan sesuai bidang keahliannya di kelas X/awal fase F.',
      'Peserta didik mengenal prinsip operasi hitung biaya dan persentase dasar.',
    ],
    profilPelajarPancasila: [
      'Kemandirian & Tanggung Jawab Kerja (mematuhi SOP K3LH, APD, dan budaya kerja 5R tanpa kompromi)',
      'Kreativitas & Kewirausahaan (merancang prototipe fungsional yang bernilai jual dan teruji)',
      'Penalaran Kritis (menghitung struktur HPP dan BEP secara akurat guna mencegah kerugian produksi)',
    ],
    saranaPrasarana: [
      'Ruang praktik/studio/dapur/bengkel kejuruan dengan meja 5R dan kotak P3K',
      'Alat keselamatan diri (APD) yang disesuaikan risiko nyata kompetensi keahlian masing-masing',
      'Lembar desain prototipe, tabel RAB HPP/BEP, jadwal proyek, dan rubrik uji mutu produk',
    ],
    targetPesertaDidik:
      'Peserta didik kelas XI SMK/MAK program keahlian lintas bidang (manufaktur, boga, busana, kriya, maupun teknologi informasi) dengan penyesuaian alat & SOP sesuai risiko jurusan.',
    modelPembelajaran: `${modelDef.label} - ${modelDef.deskripsi}`,
    pemahamanBermakna:
      'Prototipe kejuruan baru layak diproduksi lebih lanjut apabila memadukan keandalan fungsi mutu, kepatuhan SOP K3LH & budaya kerja 5R sesuai risiko bidang kerjanya, serta kalkulasi HPP dan BEP yang cermat.',
    pertanyaanPemantik: [
      'Mengapa jenis APD dan langkah SOP keselamatan di dapur tata boga berbeda dengan bengkel mesin atau studio desain kemasan?',
      'Bagaimana barang cacat (reject) atau area kerja berantakan (tidak 5R) diam-diam menaikkan HPP per unit produk kita?',
      'Pada titik penjualan ke berapakah proyek batch 20 unit mulai menutup seluruh biaya tetap awal (BEP) sebelum mencetak laba?',
    ],
    bahanBacaan: {
      ringkasanInti:
        'Perencanaan prototipe SMK mencakup penentuan spesifikasi produk, pemilihan alat–bahan serta SOP K3LH–5R yang disesuaikan risiko spesifik bidang keahlian, penjadwalan kerja tim, serta penghitungan akurat HPP dan BEP agar proyek aman dikerjakan dan layak dijual.',
      konsepKunci: ['K3LH & APD Spesifik Jurusan', 'Budaya Kerja 5R', 'Jadwal & Uji Mutu Prototipe', 'HPP & Titik Impas (BEP)'],
      referensiCatatan: PROVENANCE_MSG_UNLINKED,
      penjelasanKonsepUtama:
        'Dalam Proyek Kewirausahaan (PKK) kelas XI SMK, pembuatan prototipe tidak pernah boleh langsung memotong bahan tanpa perencanaan kerja, analisis bahaya (K3LH), dan kalkulasi biaya. Prinsip penting K3LH adalah kesesuaian kontekstual: setiap kompetensi keahlian memakai mesin, bahan kimia/pangan, dan risiko berbeda (contoh: teknik pemesinan mewajibkan safety goggles dan bebas pakaian longgar untuk mesin putar; kriya/kemasan memfokuskan alas potong cutter, lem berventilasi, dan sarung tangan kerja; tata boga menekankan higienitas pangan dan pelindung panas; studio digital/TI mengutamakan manajemen kabel dan tegangan listrik). Sebelum dan sesudah praktik, area kerja wajib mematuhi 5R (Ringkas, Rapi, Resik, Rawat, Rajin) agar alat presisi terjaga dan bahan terhindar dari kerusakan. Dari sisi keuangan, total seluruh biaya produksi dibagi jumlah unit menghasilkan Harga Pokok Produksi (HPP), sedangkan Biaya Tetap dibagi margin kontribusi (Harga Jual − Biaya Variabel per unit) menentukan Titik Impas (Break-Even Point / BEP).',
      subKonsep: [
        {
          judul: 'SOP K3LH & 5R Spesifik Risiko Jurusan (Bukan Seragam)',
          uraian:
            'Tidak semua kompetensi keahlian memakai peralatan yang sama. Guru & siswa memetakan bahaya nyata bahan/alat proyek masing-masing (mekanik, panas, tajam, uap pelarut, listrik, atau kontaminasi pangan), menetapkan APD wajib yang relevan, serta menata alat dan jalur lewat berdasarkan 5R.',
        },
        {
          judul: 'Struktur HPP (Full Costing Batch) dan BEP Unit/Rupiah',
          uraian:
            'Total Biaya Batch = Biaya Variabel Total (bahan baku + penolong + tenaga kerja variabel + overhead variabel) + Biaya Tetap (alat cetak/jig/persiapan awal). HPP/unit = Total Biaya / Jumlah Unit; BEP Unit = Biaya Tetap / (Harga Jual − Biaya Variabel per unit).',
        },
      ],
      istilahPenting: [
        { istilah: 'K3LH & APD', pengertian: 'Keselamatan, Kesehatan Kerja, dan Lingkungan Hidup beserta Alat Pelindung Diri yang dipilih tepat sesuai bahaya mesin/bahan proyek.' },
        { istilah: 'Budaya Kerja 5R', pengertian: 'Ringkas, Rapi, Resik, Rawat, dan Rajin untuk menjaga efisiensi, kerapian alat ukur/kerja, serta menekan produk cacat.' },
        { istilah: 'HPP (Harga Pokok Produksi)', pengertian: 'Biaya total produksi (variabel + tetap pada batch) dibagi jumlah produk yang dihasilkan untuk dasar penetapan harga jual.' },
        { istilah: 'BEP (Break-Even Point)', pengertian: 'Jumlah unit atau rupiah penjualan minimum saat total pendapatan tepat sama dengan total biaya (laba = Rp0).' },
      ],
      contohKonkret: [
        'Proyek Acuan Batch 20 Unit Rak Organiser Meja Modular & Kemasan: total biaya Rp600.000 -> HPP Rp30.000/unit, harga jual Rp38.000/unit, BEP tercapai pada 10 unit (Rp380.000).',
        'Adaptasi lintas jurusan: bengkel otomotif/pemesinan mengutamakan goggles, sepatu safety & lock-out mesin; tata boga mengutamakan hairnet, celemek, & sarung tangan oven; DKV menekankan manajemen kabel daya & pisau cutter berpegangan pengunci.',
      ],
      contohPenyelesaian: {
        judulContoh: 'Perhitungan HPP & BEP Batch Uji 20 Unit Prototipe Kemasan/Rak Organiser',
        konteks:
          'Diketahui untuk produksi batch awal 20 unit: Bahan baku Rp240.000, Kemasan/penolong Rp60.000, Upah tenaga kerja variabel Rp100.000, Overhead variabel Rp40.000, dan Biaya Tetap proyek (jig/persiapan awal) Rp160.000; Harga jual disepakati Rp38.000/unit.',
        langkahPenyelesaian: [
          'Langkah 1 (Biaya Variabel Total & per Unit): Total Biaya Variabel = Rp240.000 + Rp60.000 + Rp100.000 + Rp40.000 = Rp440.000. Biaya Variabel per unit (VC) = Rp440.000 / 20 = Rp22.000/unit.',
          'Langkah 2 (Total Biaya & HPP per Unit): Total Biaya Batch = Rp440.000 + Rp160.000 = Rp600.000. HPP per unit = Rp600.000 / 20 = Rp30.000/unit.',
          'Langkah 3 (Margin Kontribusi & BEP): Margin kontribusi = Harga Jual − VC = Rp38.000 − Rp22.000 = Rp16.000/unit. BEP Unit = Biaya Tetap / Margin Kontribusi = Rp160.000 / Rp16.000 = 10 unit. BEP Rupiah = 10 × Rp38.000 = Rp380.000.',
          'Langkah 4 (Verifikasi & Laba Batch): Pada 10 unit, Pendapatan = Rp380.000 dan Biaya = 160.000 + (10 × 22.000) = Rp380.000 (Impas tepat!). Jika seluruh 20 unit terjual, Laba = (20 × Rp38.000) − Rp600.000 = Rp760.000 − Rp600.000 = Rp160.000.',
        ],
        kesimpulanHasil:
          'HPP per unit = Rp30.000; titik impas BEP berada pada 10 unit (Rp380.000), sehingga unit ke-11 sampai ke-20 menghasilkan laba bersih hingga Rp160.000 bila mutu tetap terjaga tanpa barang rusak.',
      },
      hubunganDenganTP:
        'Proyek terstruktur dari SOP K3LH/5R adaptif, pembuatan/simulasi sampel prototipe, jadwal, hingga verifikasi HPP–BEP menjawab tuntas seluruh cakupan TP 11.1.',
      potensiMiskonsepsi: [
        {
          miskonsepsi: 'Mengira titik impas (BEP) dihitung dengan membagi Biaya Tetap dengan HPP atau langsung membagi Biaya Tetap dengan Harga Jual penuh tanpa mengurangkan VC per unit.',
          caraMeluruskan: 'Tegaskan rumus BEP Unit wajib memakai margin kontribusi (Harga Jual − Biaya Variabel per unit) karena setiap unit terjual tetap mengonsumsi biaya bahan Rp22.000.',
        },
        {
          miskonsepsi: 'Menempelkan daftar alat/APD bengkel las besi secara membuta ke semua proyek kelas PKK padahal proyek kelompoknya adalah desain kemasan kertas atau produk pangan.',
          caraMeluruskan: 'Wajibkan setiap tim memetakan alat nyata dan bahan kimianya/risikonya terlebih dahulu sebelum memilih APD dan menulis SOP.',
        },
      ],
    },
    kegiatanPembelajaran: [meeting],
    asesmen: summarizeAsesmenDetailToLegacy(asesmenDetail),
    asesmenDetail,
    rubrikPenilaianSingkat: [
      {
        kriteria: 'Proses Kerja Aman (Kepatuhan SOP, APD Sesuai Risiko Jurusan, & 5R)',
        baruBerkembang: 'Melewatkan pemakaian APD yang relevan atau meninggalkan meja praktik kotor/kabel semrawut.',
        layak: 'Menerapkan aturan K3LH dasar dan 5R setelah diingatkan oleh guru atau pengawas tim.',
        cakap: 'Mematuhi SOP K3LH/APD spesifik bidang kerjanya secara mandiri serta merapikan alat berdasar 5R sebelum dan sesudah kerja.',
        mahir: 'Menjadi teladan budaya kerja 5R/K3LH, mendeteksi potensi risiko bahan/listrik lebih awal, dan meminimalkan sisa bahan cacat.',
      },
      {
        kriteria: 'Kualitas Produk Prototipe (Fungsi, Kerapian, & Kelayakan Uji)',
        baruBerkembang: 'Prototipe belum berfungsi sesuai rancangan atau memiliki tepi kasar/cacat finishing.',
        layak: 'Prototipe berfungsi dasar namun kerapian dimensi dan kemasan masih perlu revisi besar.',
        cakap: 'Prototipe berfungsi akurat sesuai spesifikasi sketsa, rapi, aman disentuh/dipakai, serta lulus inspeksi silang.',
        mahir: 'Prototipe siap uji konsumen dengan toleransi ukuran presisi, kemasan informatif, dan efisiensi pemakaian bahan.',
      },
      {
        kriteria: 'Ketepatan Kalkulasi Biaya (VC, HPP, BEP Unit, BEP Rupiah) & Presentasi Proyek',
        baruBerkembang: 'Salah mengelompokkan biaya tetap vs variabel atau keliru menghitung HPP dan BEP.',
        layak: 'HPP benar tetapi BEP salah memakai harga jual penuh sebagai pembagi tanpa dikurangi VC.',
        cakap: 'Menghitung akurat VC (Rp22.000), HPP (Rp30.000), BEP (10 unit / Rp380.000), beserta cek balik impas.',
        mahir: 'Menuntaskan seluruh hitungan HPP–BEP tepat sekaligus merumuskan strategi efisiensi biaya tanpa mengorbankan standar K3LH.',
      },
    ],
    diferensiasiOperasional: {
      prinsipKesetaraanTP:
        'Semua jalur belajar menuntaskan desain rencana prototipe aman K3LH–5R beserta kalkulasi HPP dan BEP unit sesuai TP 11.1.',
      kesiapanDasar: {
        targetKesiapan: 'Mengisi checklist K3LH/5R spesifik alat tim dan menghitung HPP–BEP dengan panduan langkah per langkah.',
        dukunganScaffolding: 'Lembar RAB terpandu dengan pengelompokan biaya tetap vs variabel sudah disortir dan kolom rumus VC, HPP, dan BEP bertahap.',
        aktivitasKonkret: [
          'Mengisi daftar bahan/alat proyek kelompok serta memasangkan risiko bahaya alat ke APD yang sesuai dari kartu panduan K3LH.',
          'Menghitung VC/unit, Total Biaya, HPP = Total Biaya ÷ 20, lalu BEP Unit pada kolom rumus langkah demi langkah.',
        ],
        mediaPendukung: 'Kartu pasangan Risiko–APD K3LH dan lembar kerja rumus RAB bertahap',
        buktiBelajarJalur: 'Checklist K3LH–5R akurat dan tabel HPP (Rp30.000) + BEP (10 unit) terisi tepat.',
      },
      kesiapanBerkembang: {
        targetKesiapan: 'Menyusun desain produk, jadwal tim, SOP K3LH–5R, dan memverifikasi hitungan BEP Unit serta BEP Rupiah secara mandiri.',
        dukunganScaffolding: 'Kerangka tabel proyek & komponen biaya tanpa menuliskan rumus jadi di dalamnya.',
        aktivitasKonkret: [
          'Merancang sketsa ukuran produk, jadwal 4 fase proyek, dan SOP K3LH–5R spesifik risiko bahan/alat jurusan.',
          'Mengelompokkan biaya tetap vs variabel untuk menemukan HPP, BEP Unit, BEP Rupiah, dan mengecek nilai impas pada 10 unit.',
        ],
        mediaPendukung: 'LKPD Proyek PjBL reguler beserta rubrik uji fungsi produk',
        buktiBelajarJalur: 'Dokumen perencanaan proyek lengkap, simulasi 5R tuntas, dan hitungan BEP terverifikasi.',
      },
      kesiapanMahir: {
        targetKesiapan: 'Mengaudit sensitivitas perubahan biaya/waste cacat terhadap HPP–BEP dan menyusun rencana perbaikan SOP proses.',
        dukunganScaffolding: 'Skenario lanjutan: bila 2 dari 20 unit mengalami cacat produksi (hanya 18 unit layak jual) atau harga bahan baku naik.',
        aktivitasKonkret: [
          'Menganalisis dampak 2 unit reject akibat abai K3LH/5R terhadap kenaikan biaya efektif per unit layak jual dan titik impas BEP baru.',
          'Merancang penjadwalan inspeksi kendali mutu (QC) tengah proses serta strategi penawaran paket agar margin tetap aman.',
        ],
        mediaPendukung: 'Kartu tantangan simulasi sensitivitas reject & audit efisiensi proses',
        buktiBelajarJalur: 'Analisis kuantitatif dampak cacat/waste terhadap HPP–BEP beserta SOP pencegahan berbasis QC.',
      },
    },
    contohLKPD,
    pengayaanDanRemedial: {
      pengayaan:
        'Menghitung ulang HPP efektif per unit layak jual apabila 10% unit dalam batch mengalami kerusakan produksi, lalu merancang titik QC pencegahannya.',
      remedial:
        'Latihan klasifikasi biaya tetap vs biaya variabel memakai contoh nyata alat–bahan proyek tim sebelum mengerjakan perhitungan BEP langkah per langkah.',
    },
    refleksiGuru: [
      'Apakah kelompok sudah menyesuaikan daftar alat, SOP, dan APD dengan risiko riil kompetensi keahlian masing-masing?',
      'Di langkah hitung mana (pemisahan VC vs FC atau pembagian margin kontribusi BEP) siswa paling perlu pendampingan?',
    ],
    refleksiSiswa: [
      'Aturan K3LH atau 5R mana yang menurutmu paling sering terlewat sebelum memulai pekerjaan prototipe?',
      'Apa hubungan nyata antara ketelitian kerja tanpa cacat bahan dengan ketepatan HPP dan pencapaian BEP usaha?',
    ],
    glosarium: [
      { istilah: 'Prototipe', definisi: 'Sampel awal produk atau model layanan yang dibuat untuk menguji desain, fungsi, keamanan, serta biaya produksi.' },
      { istilah: 'SOP K3LH & 5R', definisi: 'Prosedur standar keselamatan–kesehatan kerja–lingkungan serta budaya kerja Ringkas–Rapi–Resik–Rawat–Rajin sesuai risiko ruang kerja.' },
      { istilah: 'HPP & BEP', definisi: 'Harga Pokok Produksi per unit dan Break-Even Point (titik impas volume/rupiah penjualan).' },
    ],
    daftarPustaka: [
      PROVENANCE_MSG_UNLINKED,
      'Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka.',
    ],
    catatanValidasi: {
      status: 'template_awal',
      usedFallback: false,
      structuralIssues: [],
      relevanceAndAntiSlopIssues: [],
      semanticReviewWarnings: [CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER],
    },
  };

  return {
    id: 'smk_11_pkk_prototipe',
    badgeLabel: CURATED_EXAMPLE_BADGE_LABEL,
    provenanceDisclaimer: CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER,
    jenjang: 'SMK',
    kelas: '11',
    mataPelajaran: mapel,
    tema: 'Perencanaan Prototipe, K3LH–5R, & HPP/BEP',
    modelType: 'pjbl',
    modelLabel: modelDef.label,
    alokasiRingkas: '4 JP × 45 menit = 180 menit',
    ringkasanKeunggulan:
      'Mencakup sintaks PjBL 180 menit, SOP K3LH & 5R adaptif lintas jurusan (bukan seragam), kalkulasi HPP Rp30.000 & BEP 10 unit terverifikasi, jadwal, & rubrik proses–produk.',
    tp,
    sampleProfile,
    modul,
  };
}

const CURATED_EXAMPLE_BUILDERS: Record<CuratedModulExampleId, () => CuratedModulExample> = {
  sd_4_ipas_fotosintesis: createSDIPASFotosintesisExample,
  smp_8_matematika_spldv: createSMPMatematikaSPLDVExample,
  sma_10_bindo_lho: createSMABindoLHOExample,
  smk_11_pkk_prototipe: createSMKPKKPrototipeExample,
};

const CURATED_EXAMPLE_ORDER: readonly CuratedModulExampleId[] = [
  'sd_4_ipas_fotosintesis',
  'smp_8_matematika_spldv',
  'sma_10_bindo_lho',
  'smk_11_pkk_prototipe',
];

/**
 * Mengembalikan keempat contoh modul terkurasi sebagai deep clone baru
 * agar pemanggil tidak pernah mengubah data template sumber secara tidak sengaja.
 */
export function getCuratedModulExamples(): CuratedModulExample[] {
  return CURATED_EXAMPLE_ORDER.map((id) => deepCloneValue(CURATED_EXAMPLE_BUILDERS[id]()));
}

export function getCuratedModulExampleById(
  id: CuratedModulExampleId
): CuratedModulExample | undefined {
  const builder = CURATED_EXAMPLE_BUILDERS[id];
  return builder ? deepCloneValue(builder()) : undefined;
}

/**
 * Menggandakan contoh modul terkurasi menjadi salinan independen siap edit milik guru:
 * - Template asli tetap utuh (immutability).
 * - Identitas satuan pendidikan & guru diisi dari profil aktif pengguna (bukan data dummy).
 * - Referensi sumber guru yang sudah ditautkan pada TP aktif tetap dipertahankan.
 */
export function cloneCuratedExampleAsTeacherDraft(
  id: CuratedModulExampleId,
  profile: SchoolProfile,
  targetTP?: CustomTPItem | null,
  preserveReferensi?: ModulReferensiSumberItem[]
): ModulAjarDokumen {
  const example = getCuratedModulExampleById(id);
  if (!example) {
    throw new Error(`Contoh modul terkurasi "${id}" tidak ditemukan.`);
  }

  const cloned = deepCloneValue(example.modul);
  const refs =
    Array.isArray(preserveReferensi) && preserveReferensi.length > 0
      ? deepCloneValue(preserveReferensi)
      : undefined;

  return {
    ...cloned,
    id: `modul-template-copy-${id}-${Date.now().toString(36)}`,
    tpId: targetTP?.id || cloned.tpId,
    tpKode: targetTP?.kode || cloned.tpKode,
    tpSourceHash: targetTP ? computeTPContentHash(targetTP) : cloned.tpSourceHash,
    draftSource: 'user_edited',
    savedAt: new Date().toISOString(),
    schoolId: profile.schoolId || cloned.schoolId,
    ...(targetTP
      ? {
          mataPelajaran: profile.mataPelajaranUtama || cloned.mataPelajaran,
          kelas: profile.kelasUtama || cloned.kelas,
          semester:
            profile.semester === '2 (Genap)'
              ? ('2 (Genap)' as const)
              : profile.semester === '1 (Ganjil)'
              ? ('1 (Ganjil)' as const)
              : cloned.semester,
        }
      : {}),
    namaSekolah: profile.namaSekolah || cloned.namaSekolah,
    namaGuru: profile.namaGuru || cloned.namaGuru,
    nipGuru: profile.nipGuru || cloned.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah || cloned.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah || cloned.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah || cloned.kotaSekolah,
    tahunAjaran: profile.tahunAjaran || cloned.tahunAjaran,
    rombel: profile.rombelAktif || cloned.rombel,
    createdAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    ...(refs ? { referensiSumber: refs } : {}),
  };
}
