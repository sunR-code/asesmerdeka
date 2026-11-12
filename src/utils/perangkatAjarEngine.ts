import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { jenjangToDefaultFase, computeTPContentHash } from './schoolProfileStorage';
import type {
  ModulAjarDokumen,
  LKPDDokumen,
  LKPDPresetType,
  LKPDEksperimenData,
  LKPDDiferensiasiData,
  LKPDProyekData,
  LKPDPertanyaanItem,
  ATPDokumen,
  ATPItem,
  ProtaDokumen,
  ProtaItem,
  PromesDokumen,
  PromesMingguColumn,
  PromesRowItem,
} from '../types/perangkatAjar';
import { getSemesterCurriculumPlan } from './kurikulumCatalog';
import {
  buildCuratedOrAdaptiveLKPDContent,
  buildLKPDDokumenFromCurated,
} from './lkpdCurriculumFixtures';
import { validateLKPDDokumen } from './lkpdValidator';

/**
 * Pembuat Modul Ajar (RPP Kurikulum Merdeka) Lengkap & Kontekstual
 */
export function buildSmartModulAjar(
  tp: CustomTPItem,
  profile: SchoolProfile,
  jumlahPertemuan: number = 2
): ModulAjarDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const alokasiJP = Number(tp.alokasiJP) || 8;
  const menitPerJP = profile.jenjang.includes('SD') ? 35 : profile.jenjang.includes('SMP') ? 40 : 45;
  const totalMenitPertemuan = Math.round((alokasiJP * menitPerJP) / jumlahPertemuan);

  // Profil Pelajar Pancasila yang relevan
  const profilList = [
    'Bernalar Kritis (menganalisis informasi, mengevaluasi argumen, dan menyelesaikan masalah secara logis)',
    'Gotong Royong (bekerja sama, berkolaborasi aktif, dan menghargai gagasan anggota kelompok dalam diskusi)',
    'Mandiri (memiliki inisiatif belajar, bertanggung jawab atas proses dan hasil kerjanya secara disiplin)',
    'Kreatif (mampu memodifikasi dan menghasilkan gagasan orisinal dalam pemecahan masalah kontekstual)',
  ];

  // Sarana & Prasarana
  const saranaList = [
    'Papan tulis / Spidol / Smart Board interaktif',
    'Buku teks utama & panduan guru Kurikulum Merdeka Kemendikbudristek',
    'Lembar Kerja Peserta Didik (LKPD) Kontekstual',
    'Perangkat presentasi (Laptop / Proyektor LCD) atau media kartu peraga',
    'Gawai / Akses internet untuk penelusuran referensi dan studi kasus nyata',
  ];

  // Pertanyaan Pemantik
  const pemantik = [
    `Pernahkah kalian menjumpai peristiwa atau penerapan "${tp.materiPokok}" dalam kehidupan kita sehari-hari?`,
    `Mengapa pemahaman mengenai konsep ini sangat penting dan bagaimana cara terbaik menyelesaikan permasalahannya?`,
    `Jika kita tidak memahami kaidah dasarnya, dampak atau kekeliruan apa yang mungkin terjadi di sekitar kita?`,
  ];

  // Pemahaman Bermakna
  const pemahamanBermakna = `Peserta didik memahami bahwa konsep "${tp.materiPokok}" bukan sekadar teori hafalan, melainkan prinsip aplikatif yang dapat dimanfaatkan untuk menganalisis situasi nyata, mengambil keputusan rasional, serta memecahkan masalah kontekstual di lingkungan sekitar dan dunia kerja.`;

  // Kompetensi Awal
  const kompetensiAwal = [
    `Peserta didik telah memiliki pengetahuan dasar tentang istilah-istilah pengantar materi terkait.`,
    `Peserta didik mampu melakukan pengamatan, membaca informasi terstruktur, dan berkomunikasi secara efektif.`,
    `Peserta didik memahami pentingnya bernalar logis dan disiplin dalam proses penyelidikan belajar.`,
  ];

  // Langkah Kegiatan Pembelajaran
  const kegiatanPembelajaran = Array.from({ length: jumlahPertemuan }, (_, i) => {
    const pertemuanKe = i + 1;
    const durasi = totalMenitPertemuan;
    const durasiPendahuluan = Math.round(durasi * 0.15);
    const durasiPenutup = Math.round(durasi * 0.15);

    return {
      pertemuan: pertemuanKe,
      alokasiMenit: durasi,
      pendahuluan: [
        `Kegiatan Pendahuluan (${durasiPendahuluan} Menit): Guru membuka pembelajaran dengan salam hangat, sapaan santun, dan mengajak peserta didik berdoa bersama dipimpin ketua kelas.`,
        `Guru memeriksa kehadiran, kesiapan fisik dan psikis peserta didik, serta kerapian ruang belajar.`,
        `Apersepsi: Guru mengaitkan materi pertemuan sebelumnya dengan topik "${tp.materiPokok}" melalui tanya jawab singkat.`,
        `Motivasi: Guru menyampaikan tujuan pembelajaran, pemahaman bermakna, serta relevansi materi dalam kehidupan nyata.`,
        `Guru memaparkan gambaran garis besar kegiatan pembelajaran dan skenario penilaian yang akan dilakukan.`,
      ],
      inti: [
        `Tahap 1 (Orientasi Masalah): Guru menyajikan stimulus kontekstual (video / studi kasus / teks infografis) mengenai "${tp.materiPokok}" dan mengajukan pertanyaan pemantik kepada kelas.`,
        `Tahap 2 (Organisasi Belajar): Peserta didik dibagi ke dalam kelompok heterogen beranggotakan 4–5 orang. Guru membagikan Lembar Kerja Peserta Didik (LKPD).`,
        `Tahap 3 (Penyelidikan Terbimbing): Setiap kelompok melakukan eksplorasi informasi, mendiskusikan langkah penyelesaian, dan mencatat data temuan. Guru berkeliling memberikan scaffolding/bimbingan bertingkat.`,
        `Tahap 4 (Pengembangan & Penyajian Karya): Masing-masing kelompok menyusun kesimpulan hasil diskusi pada LKPD. Perwakilan kelompok mempresentasikan hasil kerjanya di depan kelas.`,
        `Tahap 5 (Analisis & Evaluasi): Kelompok lain memberikan tanggapan apresiatif dan pertanyaan kritis. Guru bersama peserta didik menyimpulkan konsep kunci dan meluruskan miskonsepsi yang muncul.`,
      ],
      penutup: [
        `Kegiatan Penutup (${durasiPenutup} Menit): Peserta didik bersama guru melakukan refleksi bersama atas proses pembelajaran yang telah berlangsung hari ini (apa yang dipahami, apa yang menyenangkan, dan kendala yang dihadapi).`,
        `Guru memberikan apresiasi dan penguatan atas keaktifan, kerja sama, dan pencapaian seluruh peserta didik.`,
        `Guru menyampaikan arahan tindak lanjut serta topik yang akan dipelajari pada pertemuan berikutnya.`,
        `Pembelajaran ditutup dengan rasa syukur, doa bersama, dan salam penutup.`,
      ],
    };
  });

  // Glosarium
  const glosarium = [
    { istilah: tp.materiPokok, definisi: `Pokok bahasan inti yang menjadi fokus penguasaan kompetensi peserta didik.` },
    { istilah: 'Capaian Pembelajaran (CP)', definisi: 'Kompetensi pembelajaran yang harus dicapai peserta didik pada setiap fase perkembangan.' },
    { istilah: 'Tujuan Pembelajaran (TP)', definisi: 'Deskripsi pencapaian tiga aspek kompetensi (pengetahuan, keterampilan, sikap) yang diperoleh peserta didik dalam kegiatan belajar.' },
    { istilah: 'Problem-Based Learning (PBL)', definisi: 'Model pembelajaran yang memfokuskan peserta didik pada pemecahan masalah nyata untuk membangun pengetahuannya sendiri.' },
  ];

  return {
    id: `modul-${tp.id}-${Date.now().toString(36)}`,
    judul: `Modul Ajar: ${tp.materiPokok}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    rombel: profile.rombelAktif,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    alokasiWaktu: `${alokasiJP} Jam Pelajaran (${jumlahPertemuan} Pertemuan x ${totalMenitPertemuan} Menit)`,
    jumlahPertemuan,
    namaSekolah: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),

    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    elemen: tp.elemen,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    kompetensiAwal,
    profilPelajarPancasila: profilList,
    saranaPrasarana: saranaList,
    targetPesertaDidik: 'Peserta didik reguler/tipikal umum (dapat mengikuti pembelajaran tanpa hambatan belajar khusus, dengan diferensiasi proses dan produk).',
    modelPembelajaran: 'Problem-Based Learning (PBL) dipadukan dengan diskusi kelompok, inkuiri kontekstual, dan presentasi kolaboratif.',

    pemahamanBermakna,
    pertanyaanPemantik: pemantik,
    kegiatanPembelajaran,

    asesmen: {
      diagnostik: 'Tanya jawab apersepsi dan survei pemahaman awal sebelum memulai materi pokok.',
      formatif: 'Observasi keaktifan diskusi kelompok, unjuk kerja presentasi, dan penilaian kinerja pada LKPD.',
      sumatif: 'Tes tertulis (Pilihan Ganda, AKM Kompleks, dan Uraian HOTS) pada akhir bab/lingkup materi.',
    },
    rubrikPenilaianSingkat: [
      {
        kriteria: 'Pemahaman Konsep & Istilah Kunci',
        baruBerkembang: 'Belum mampu mendefinisikan konsep inti meski telah dibimbing guru.',
        layak: 'Mampu menjelaskan definisi konsep dasar namun belum konsisten dalam contoh.',
        cakap: 'Mampu menjelaskan konsep dan memberikan contoh kontekstual secara runtut.',
        mahir: 'Mampu menguraikan konsep, menganalisis keterkaitan, dan memecahkan variasi masalah baru.',
      },
      {
        kriteria: 'Kemampuan Kolaborasi & Komunikasi',
        baruBerkembang: 'Pasif dalam diskusi dan memerlukan dorongan berkelanjutan.',
        layak: 'Terlibat dalam pembagian tugas kelompok namun kontribusi masih terbatas.',
        cakap: 'Aktif berdiskusi, mendengarkan rekan, dan menyampaikan pendapat secara terbuka.',
        mahir: 'Menginisiasi kerja sama, memfasilitasi solusi kelompok, dan mempresentasikan hasil dengan percaya diri.',
      },
    ],

    pengayaanDanRemedial: {
      pengayaan: `Diberikan kepada peserta didik yang telah mencapai ketuntasan tujuan pembelajaran (KKTP) berupa penugasan proyek eksplorasi mandiri atau pemecahan masalah tingkat lanjut yang membutuhkan penalaran analitis mendalam.`,
      remedial: `Diberikan bimbingan khusus individual atau tutor sebaya terhadap indikator TP yang belum dicapai, difokuskan pada penguatan konsep dasar dengan analogi sederhana dan latihan terarah.`,
    },

    refleksiGuru: [
      'Apakah seluruh peserta didik terlibat aktif dan antusias selama kegiatan pembelajaran berlangsung?',
      'Langkah atau instruksi manakah yang paling efektif dan bagian mana yang masih perlu perbaikan?',
      'Apakah alokasi waktu yang direncanakan sudah memadai untuk menyelesaikan seluruh tahapan kegiatan?',
    ],
    refleksiSiswa: [
      'Hal baru dan paling menarik apa yang saya pelajari pada materi hari ini?',
      'Bagian materi mana yang menurut saya masih paling menantang atau membutuhkan latihan tambahan?',
      'Bagaimana kontribusi saya dalam membantu kelompok saya menyelesaikan tugas LKPD?',
    ],

    glosarium,
    daftarPustaka: [
      `Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi Republik Indonesia. Buku Panduan Guru & Siswa ${profile.mataPelajaranUtama} Kelas ${profile.kelasUtama}. Jakarta: Kemendikbudristek.`,
      `Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen Kurikulum Merdeka.`,
      `Sumber referensi literatur dan media pembelajaran digital terkait topik ${tp.materiPokok}.`,
    ],
  };
}

interface LKPDSectionResult {
  judul: string;
  alokasiWaktu: string;
  petunjukPengerjaan: string[];
  stimulusKasus: {
    judul: string;
    teks: string;
    pertanyaanAwal?: string;
  };
  eksperimenData?: LKPDEksperimenData;
  diferensiasiData?: LKPDDiferensiasiData;
  proyekData?: LKPDProyekData;
  langkahAktivitas: {
    langkahKe: number;
    judulLangkah?: string;
    instruksi: string;
    bantuanAtauTabel?: string[];
  }[];
  pertanyaanAnalisis: LKPDPertanyaanItem[];
  kesimpulanRefleksi: string[];
}

function buildSectionAdapter(
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType,
  konteks?: string
): LKPDSectionResult {
  const curated = buildCuratedOrAdaptiveLKPDContent(tp, profile, presetType, konteks);
  return {
    judul: curated.subJudulTopik,
    alokasiWaktu: curated.alokasiWaktu,
    petunjukPengerjaan: curated.petunjukPengerjaan,
    stimulusKasus: curated.stimulusKasus,
    eksperimenData: curated.eksperimenData,
    diferensiasiData: curated.diferensiasiData,
    proyekData: curated.proyekData,
    langkahAktivitas: curated.langkahAktivitas,
    pertanyaanAnalisis: curated.pertanyaanAnalisis,
    kesimpulanRefleksi: curated.kesimpulanRefleksi,
  };
}

export function buildKasusSection(
  tp: CustomTPItem,
  profile: SchoolProfile,
  konteks?: string
): LKPDSectionResult {
  return buildSectionAdapter(tp, profile, 'kasus', konteks);
}

export function buildEksperimenSection(
  tp: CustomTPItem,
  profile: SchoolProfile,
  konteks?: string
): LKPDSectionResult {
  return buildSectionAdapter(tp, profile, 'eksperimen', konteks);
}

export function buildDiferensiasiSection(
  tp: CustomTPItem,
  profile: SchoolProfile,
  konteks?: string
): LKPDSectionResult {
  return buildSectionAdapter(tp, profile, 'diferensiasi', konteks);
}

export function buildProyekSection(
  tp: CustomTPItem,
  profile: SchoolProfile,
  konteks?: string
): LKPDSectionResult {
  return buildSectionAdapter(tp, profile, 'proyek', konteks);
}

/**
 * Pembuat Lembar Kerja Peserta Didik (LKPD) Kontekstual, Terkurasi & Tervalidasi
 * Mendukung seluruh jenjang (SD/MI, SMP/MTs, SMA/MA, SMK) & mapel umum + Kemenag.
 */
export function buildSmartLKPD(
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType = 'kasus',
  konteksAktual?: string
): LKPDDokumen {
  const normalizedKonteks = konteksAktual?.trim() || undefined;
  const content = buildCuratedOrAdaptiveLKPDContent(tp, profile, presetType, normalizedKonteks);
  const tpHash = computeTPContentHash(tp);
  const doc = buildLKPDDokumenFromCurated(
    tp,
    profile,
    presetType,
    content,
    normalizedKonteks,
    tpHash
  );
  const validation = validateLKPDDokumen(doc, tp, profile, {
    sourceMode: content.isCuratedFixture ? 'curated' : 'adaptive_fallback',
  });
  return {
    ...doc,
    catatanValidasi: validation,
  };
}

/**
 * Pembuat Alur Tujuan Pembelajaran (ATP) 1 Semester / 1 Tahun
 */
export function buildSmartATP(
  tpList: CustomTPItem[],
  profile: SchoolProfile
): ATPDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const plan = getSemesterCurriculumPlan(
    profile.mataPelajaranUtama,
    jenjangFase,
    profile.kelasUtama,
    profile.semester
  );

  const profilOptions = [
    ['Bernalar Kritis', 'Mandiri'],
    ['Gotong Royong', 'Bernalar Kritis'],
    ['Kreatif', 'Bernalar Kritis'],
    ['Mandiri', 'Bergotong Royong'],
  ];

  const items: ATPItem[] = tpList.map((tp, idx) => ({
    no: idx + 1,
    kodeTP: tp.kode,
    elemen: tp.elemen,
    lingkupMateri: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiJP: Number(tp.alokasiJP) || 12,
    profilPancasila: profilOptions[idx % profilOptions.length],
    indikatorKetercapaian:
      tp.buktiKetercapaian && tp.buktiKetercapaian.length > 0
        ? tp.buktiKetercapaian.join('; ')
        : `Peserta didik mampu menunjukkan penguasaan kompetensi "${tp.kompetensiInti || tp.tujuanPembelajaran}" pada materi ${tp.materiPokok} dengan bukti kerja yang terukur.`,
    asesmen: 'Formatif (Observasi kinerja & LKPD) dan Sumatif (Tes tertulis lingkup materi)',
    kataKunci: tp.materiPokok.split(' ').slice(0, 3).join(', '),
  }));

  const totalJP = items.reduce((acc, it) => acc + it.alokasiJP, 0);

  return {
    id: `atp-${profile.kelasUtama}-${Date.now().toString(36)}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    tahunAjaran: profile.tahunAjaran,
    satuanPendidikan: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    capaianPembelajaranFase: plan.capaianPembelajaran,
    items,
    totalJP,
  };
}

/**
 * Pembuat Program Tahunan (Prota) Semester 1 & 2
 */
export function buildSmartProta(
  profile: SchoolProfile,
  tpListSem1: CustomTPItem[]
): ProtaDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);

  // Buat TP Semester 2 otomatis jika belum ada
  const planSem2 = getSemesterCurriculumPlan(
    profile.mataPelajaranUtama,
    jenjangFase,
    profile.kelasUtama,
    '2 (Genap)'
  );

  const itemsSemester1: ProtaItem[] = tpListSem1.map((tp, idx) => ({
    no: idx + 1,
    semester: '1 (Ganjil)',
    kodeTP: tp.kode,
    lingkupMateri: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiJP: Number(tp.alokasiJP) || 12,
    keterangan: 'Tuntas Semester Ganjil',
  }));

  const itemsSemester2: ProtaItem[] = planSem2.tpList.map((tp, idx) => ({
    no: idx + 1,
    semester: '2 (Genap)',
    kodeTP: tp.kode,
    lingkupMateri: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiJP: Number(tp.alokasiJP) || 12,
    keterangan: 'Tuntas Semester Genap',
  }));

  const totalJPSemester1 = itemsSemester1.reduce((sum, it) => sum + it.alokasiJP, 0);
  const totalJPSemester2 = itemsSemester2.reduce((sum, it) => sum + it.alokasiJP, 0);

  return {
    id: `prota-${profile.kelasUtama}-${Date.now().toString(36)}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    tahunAjaran: profile.tahunAjaran,
    satuanPendidikan: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    itemsSemester1,
    itemsSemester2,
    totalJPSemester1,
    totalJPSemester2,
    totalJPTahunan: totalJPSemester1 + totalJPSemester2,
  };
}

/**
 * Pembuat Program Semester (Promes) Visual Minggu Efektif
 */
export function buildSmartPromes(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): PromesDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const isSem1 = !profile.semester.startsWith('2');

  const bulanList = isSem1
    ? [
        { nama: 'Juli', jumlahMinggu: 4, nonEfektif: [1] }, // M1: MPLS
        { nama: 'Agustus', jumlahMinggu: 4, nonEfektif: [] },
        { nama: 'September', jumlahMinggu: 4, nonEfektif: [4] }, // M4: PTS/STS
        { nama: 'Oktober', jumlahMinggu: 5, nonEfektif: [] },
        { nama: 'November', jumlahMinggu: 4, nonEfektif: [] },
        { nama: 'Desember', jumlahMinggu: 4, nonEfektif: [2, 3, 4] }, // PAS & Libur
      ]
    : [
        { nama: 'Januari', jumlahMinggu: 4, nonEfektif: [1] },
        { nama: 'Februari', jumlahMinggu: 4, nonEfektif: [] },
        { nama: 'Maret', jumlahMinggu: 4, nonEfektif: [3] }, // STS
        { nama: 'April', jumlahMinggu: 4, nonEfektif: [2] }, // Libur Idul Fitri / Hari Besar
        { nama: 'Mei', jumlahMinggu: 5, nonEfektif: [] },
        { nama: 'Juni', jumlahMinggu: 4, nonEfektif: [2, 3, 4] }, // SAS & Pembagian Rapor
      ];

  const columns: PromesMingguColumn[] = [];
  bulanList.forEach((bln) => {
    for (let m = 1; m <= bln.jumlahMinggu; m++) {
      const isEfektif = !bln.nonEfektif.includes(m);
      let labelKegiatan: string | undefined = undefined;
      if (!isEfektif) {
        if (bln.nama === 'Juli' && m === 1) labelKegiatan = 'MPLS';
        else if ((bln.nama === 'September' || bln.nama === 'Maret') && (m === 3 || m === 4)) labelKegiatan = 'STS';
        else if ((bln.nama === 'Desember' || bln.nama === 'Juni') && m === 2) labelKegiatan = 'SAS';
        else if ((bln.nama === 'Desember' || bln.nama === 'Juni') && m >= 3) labelKegiatan = 'Libur';
        else labelKegiatan = 'Non-Efektif';
      }
      columns.push({
        bulanNama: bln.nama,
        mingguKe: m,
        isEfektif,
        labelKegiatan,
      });
    }
  });

  // Distribusikan alokasi JP per TP ke minggu-minggu efektif secara berurutan
  let colPointer = 0;
  const rows: PromesRowItem[] = tpList.map((tp, idx) => {
    const jpPerWeek = 4; // Bawaan rata-rata 4 JP per minggu
    let sisaJP = Number(tp.alokasiJP) || 12;
    const distribusiJP: { [colIndex: number]: number } = {};

    while (sisaJP > 0 && colPointer < columns.length) {
      if (columns[colPointer].isEfektif) {
        const alokasi = Math.min(sisaJP, jpPerWeek);
        distribusiJP[colPointer] = alokasi;
        sisaJP -= alokasi;
        if (sisaJP <= 0) {
          colPointer++;
          break;
        }
      }
      colPointer++;
    }

    return {
      no: idx + 1,
      kodeTP: tp.kode,
      materiPokok: tp.materiPokok,
      tujuanPembelajaran: tp.tujuanPembelajaran,
      alokasiJP: Number(tp.alokasiJP) || 12,
      distribusiJP,
    };
  });

  const totalJPEfektif = rows.reduce((sum, r) => sum + r.alokasiJP, 0);

  return {
    id: `promes-${profile.kelasUtama}-${Date.now().toString(36)}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    satuanPendidikan: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    columns,
    rows,
    totalJPEfektif,
  };
}
