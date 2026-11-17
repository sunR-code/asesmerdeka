import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import {
  jenjangToDefaultFase,
  computeTPContentHash,
  getSavedCustomTPList,
} from './schoolProfileStorage';
import { resolveCPStatusLabel, getSavedCPEntries, cpEntryToReferenceMeta } from './cpStorage';
import {
  analyzeATPDependencyGraph,
  isSameFase,
  recommendATPAssessmentPlan,
} from './atpSequencingEngine';
import {
  collectPhaseTPItems,
  getSavedPhaseATPPlan,
  resolveSemesterTPListFromPhaseATP,
  type ATPAllocationMapping,
  type PhaseATPPlan,
} from './atpStorage';
import type {
  ModulAjarDokumen,
  LKPDDokumen,
  LKPDPresetType,
  ATPDokumen,
  ATPItem,
  ProtaDokumen,
  ProtaItem,
  PromesDokumen,
  PromesMingguColumn,
  PromesRowItem,
} from '../types/perangkatAjar';
import type {
  PromesValidationIssue,
  SemesterAcademicCalendar,
  SubjectJPConfig,
} from '../types/academicSchedule';
import { getSemesterCurriculumPlan } from './kurikulumCatalog';
import {
  generateSemesterWeekColumns,
  getAcademicCalendarForContext,
  getPromesManualOverrides,
  type PromesManualOverridesMap,
} from './academicCalendarStorage';
import { getSubjectJPConfig } from './jpConfigStorage';
import { resolveSemesterCode } from './storageIdentity';
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

  // Kompetensi Awal (spesifik dari prasyarat TP bila tersedia)
  const kompetensiAwal =
    tp.prasyarat && tp.prasyarat.length > 0
      ? [
          ...tp.prasyarat.map((p) => `Peserta didik telah memahami: ${p}.`),
          `Peserta didik siap melakukan eksplorasi terstruktur terkait "${tp.materiPokok}".`,
        ]
      : [
          `Peserta didik telah memiliki pengetahuan dasar pada elemen ${tp.elemen} sebagai pengantar "${tp.materiPokok}".`,
          `Peserta didik mampu membaca informasi terstruktur dan menyampaikan pendapat dalam diskusi.`,
        ];

  const bahanBacaan = {
    ringkasanInti:
      tp.arahanRangkuman?.trim() ||
      `Materi "${tp.materiPokok}" memfokuskan peserta didik pada pencapaian: ${tp.tujuanPembelajaran}`,
    konsepKunci: [
      `Pokok bahasan utama: ${tp.materiPokok} (Elemen ${tp.elemen})`,
      ...(tp.buktiKetercapaian?.slice(0, 2) || [`Kompetensi inti: ${tp.kompetensiInti || tp.tujuanPembelajaran}`]),
      ...(tp.subTP?.slice(0, 2).map((s) => `${s.kode}: ${s.fokusMateri}`) || []),
    ],
    referensiCatatan:
      'Ringkasan bahan bacaan disusun dari metadata TP aktif. Guru disarankan melengkapi dengan contoh kasus atau kutipan halaman buku teks sekolah.',
  };

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
    tpId: tp.id,
    schoolId: profile.schoolId,
    tpSourceHash: computeTPContentHash(tp),
    needsReview: false,
    modelType: 'pbl',
    draftSource: 'template',
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
    targetSubTP: tp.subTP?.map((s) => ({
      id: s.id,
      kode: s.kode,
      kompetensi: s.kompetensi,
    })),
    prasyaratMateri: tp.prasyarat?.join('; '),
    buktiKetercapaian: tp.buktiKetercapaian,
    kompetensiAwal,
    profilPelajarPancasila: profilList,
    saranaPrasarana: saranaList,
    targetPesertaDidik: 'Peserta didik reguler/tipikal umum (dapat mengikuti pembelajaran tanpa hambatan belajar khusus, dengan diferensiasi proses dan produk).',
    modelPembelajaran: 'Problem-Based Learning (PBL) dipadukan dengan diskusi kelompok, inkuiri kontekstual, dan presentasi kolaboratif.',

    pemahamanBermakna,
    pertanyaanPemantik: pemantik,
    bahanBacaan,
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
      `[Lengkapi referensi satuan pendidikan] Buku teks/panduan resmi ${profile.mataPelajaranUtama} Kelas ${profile.kelasUtama} yang digunakan sekolah (cantumkan penulis, tahun terbit, dan penerbit sesuai edisi).`,
      `Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka.`,
      `Catatan ajar guru & sumber belajar kontekstual terkait materi "${tp.materiPokok}".`,
    ],
  };
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
  const mergedIssues = Array.from(
    new Set([...(validation.issues || []), ...(content.validationStatus?.issues || [])])
  );
  const mergedWarnings = Array.from(
    new Set([...(validation.warnings || []), ...(content.validationStatus?.warnings || [])])
  );
  return {
    ...doc,
    catatanValidasi: {
      ...validation,
      issues: mergedIssues,
      warnings: mergedWarnings,
    },
  };
}

export interface BuildATPOptions {
  phasePlan?: PhaseATPPlan | null;
  includeAllocationColumn?: boolean;
}

/**
 * Pembuat Alur Tujuan Pembelajaran (ATP) Tingkat Fase (Kompatibel Penuh dengan Draf Lama)
 */
export function buildSmartATP(
  tpList: CustomTPItem[],
  profile: SchoolProfile,
  options?: BuildATPOptions
): ATPDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const semesterPlan = getSemesterCurriculumPlan(
    profile.mataPelajaranUtama,
    jenjangFase,
    profile.kelasUtama,
    profile.semester,
    { schoolId: profile.schoolId, tahunAjaran: profile.tahunAjaran }
  );

  const savedPhasePlan =
    options?.phasePlan !== undefined
      ? options.phasePlan
      : getSavedPhaseATPPlan(profile, jenjangFase);
  const collected = collectPhaseTPItems(profile, tpList, jenjangFase);
  const savedCPs = getSavedCPEntries(profile, jenjangFase);

  // Tentukan urutan TP: ikuti PhaseATPPlan jika tersedia, sambil menyertakan TP baru yang belum masuk orderedTpIds.
  const orderedTpList: CustomTPItem[] = [];
  const seenIds = new Set<string>();
  const addTP = (tp: CustomTPItem | undefined) => {
    if (!tp || !tp.id || seenIds.has(tp.id)) return;
    if (tp.referensiCP?.fase && !isSameFase(jenjangFase, tp.referensiCP.fase)) return;
    seenIds.add(tp.id);
    orderedTpList.push(tp);
  };

  if (savedPhasePlan && savedPhasePlan.orderedTpIds.length > 0) {
    for (const id of savedPhasePlan.orderedTpIds) {
      addTP(collected.tpById.get(id));
    }
    for (const tp of collected.tpItems) {
      addTP(tp);
    }
  } else {
    for (const tp of collected.tpItems) {
      addTP(tp);
    }
  }

  const tpById = new Map<string, CustomTPItem>();
  orderedTpList.forEach((tp) => tpById.set(tp.id, tp));

  const allocationByTpId = new Map<string, ATPAllocationMapping>();
  for (const alloc of savedPhasePlan?.allocations || []) {
    if (!allocationByTpId.has(alloc.tpId) || alloc.tahunAjaran === profile.tahunAjaran) {
      allocationByTpId.set(alloc.tpId, alloc);
    }
  }

  const graphAnalysis = analyzeATPDependencyGraph(
    orderedTpList.map((t) => t.id),
    tpById,
    jenjangFase
  );

  const profilOptions = [
    ['Bernalar Kritis', 'Mandiri'],
    ['Gotong Royong', 'Bernalar Kritis'],
    ['Kreatif', 'Bernalar Kritis'],
    ['Mandiri', 'Gotong Royong'],
  ];

  const items: ATPItem[] = orderedTpList.map((tp, idx) => {
    const alloc = allocationByTpId.get(tp.id);
    const origin = collected.originByTpId.get(tp.id);
    const alokasiKelas = alloc?.kelas || origin?.kelas || profile.kelasUtama;
    const alokasiTahunAjaran = alloc?.tahunAjaran || origin?.tahunAjaran || profile.tahunAjaran;
    const alokasiSemester = alloc?.semester || origin?.semester;
    const alokasiJP =
      alloc?.alokasiJP !== undefined ? Math.max(1, Number(alloc.alokasiJP) || 1) : Number(tp.alokasiJP) || 12;

    const buktiList =
      Array.isArray(tp.buktiKetercapaian) && tp.buktiKetercapaian.length > 0
        ? tp.buktiKetercapaian
        : tp.subTP && tp.subTP.length > 0
        ? tp.subTP.map((s) => `${s.kode}: ${s.buktiKetercapaian}`).filter(Boolean)
        : [];

    const indikatorKetercapaian =
      buktiList.length > 0
        ? buktiList.join('; ')
        : `Peserta didik mampu menunjukkan penguasaan kompetensi "${tp.kompetensiInti || tp.tujuanPembelajaran}" pada materi ${tp.materiPokok} dengan bukti kerja yang terukur.`;

    const asesmenPlan = recommendATPAssessmentPlan(tp, profile.mataPelajaranUtama);
    const prasyaratTpIds = Array.isArray(tp.prasyaratTpIds) ? tp.prasyaratTpIds : [];
    const prasyaratKodeLabels = prasyaratTpIds
      .map((pid) => tpById.get(pid)?.kode || '')
      .filter(Boolean);

    return {
      no: idx + 1,
      tpId: tp.id,
      kodeTP: tp.kode,
      elemen: tp.elemen,
      kompetensi: tp.kompetensiInti || tp.tujuanPembelajaran,
      lingkupMateri: tp.lingkupMateri || tp.materiPokok,
      tujuanPembelajaran: tp.tujuanPembelajaran,
      alokasiJP,
      profilPancasila: profilOptions[idx % profilOptions.length],
      indikatorKetercapaian,
      buktiKetercapaianList: buktiList,
      asesmen: asesmenPlan.deskripsi,
      bentukAsesmen: asesmenPlan.bentukUtama,
      kataKunci: (tp.materiPokok || '').split(' ').slice(0, 3).join(', '),
      deskripsiPrasyarat: tp.prasyarat,
      prasyaratTpIds: prasyaratTpIds.length > 0 ? prasyaratTpIds : undefined,
      prasyaratKodeLabels: prasyaratKodeLabels.length > 0 ? prasyaratKodeLabels : undefined,
      fase: tp.referensiCP?.fase || jenjangFase,
      alokasiTahunAjaran,
      alokasiKelas,
      alokasiSemester,
    };
  });

  const totalJP = items.reduce((acc, it) => acc + it.alokasiJP, 0);
  const sem1JP = items
    .filter((it) => resolveSemesterCode(it.alokasiSemester) !== 'sem2')
    .reduce((sum, it) => sum + it.alokasiJP, 0);
  const sem2JP = items
    .filter((it) => resolveSemesterCode(it.alokasiSemester) === 'sem2')
    .reduce((sum, it) => sum + it.alokasiJP, 0);

  const jpConfig = getSubjectJPConfig(profile);
  const calSem1 = getAcademicCalendarForContext(profile, '1 (Ganjil)');
  const calSem2 = getAcademicCalendarForContext(profile, '2 (Genap)');
  const kapSem1 = generateSemesterWeekColumns(calSem1, jpConfig.jpPerMinggu).reduce(
    (s, c) => s + (c.isEfektif ? c.kapasitasJP ?? jpConfig.jpPerMinggu : 0),
    0
  );
  const kapSem2 = generateSemesterWeekColumns(calSem2, jpConfig.jpPerMinggu).reduce(
    (s, c) => s + (c.isEfektif ? c.kapasitasJP ?? jpConfig.jpPerMinggu : 0),
    0
  );

  const peringatanValidasi: string[] = graphAnalysis.issues
    .filter((iss) => iss.severity !== 'info')
    .map((iss) => iss.message);

  if (kapSem1 > 0 && sem1JP > kapSem1) {
    peringatanValidasi.push(
      `Alokasi Semester 1 (${sem1JP} JP) melebihi kapasitas kalender aktif (${kapSem1} JP).`
    );
  }
  if (kapSem2 > 0 && sem2JP > kapSem2) {
    peringatanValidasi.push(
      `Alokasi Semester 2 (${sem2JP} JP) melebihi kapasitas kalender aktif (${kapSem2} JP).`
    );
  }

  const resolvedRefCP =
    (savedCPs[0] ? cpEntryToReferenceMeta(savedCPs[0]) : undefined) ||
    savedPhasePlan?.referensiCP ||
    orderedTpList.find((t) => t.referensiCP)?.referensiCP ||
    semesterPlan.referensiCP;

  const cpFaseText =
    savedCPs.length > 0
      ? savedCPs
          .map(
            (cp) =>
              `[${cp.elemenCP} — ${resolveCPStatusLabel(cp.statusVerifikasi, cp.terverifikasiResmi, cp.asalCP)}] ${cp.teksCP}`
          )
          .join('\n')
      : semesterPlan.capaianPembelajaran;

  return {
    id: savedPhasePlan?.id || `atp-${profile.kelasUtama}-${Date.now().toString(36)}`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjang: profile.jenjang,
    jenjangFase,
    kelas: profile.kelasUtama,
    tahunAjaran: profile.tahunAjaran,
    satuanPendidikan: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    capaianPembelajaranFase: cpFaseText,
    referensiCP: resolvedRefCP,
    tanggalDisusun: savedPhasePlan?.tanggalDisusun || new Date().toISOString(),
    versi: savedPhasePlan?.versi || 1,
    statusPenyusunan: savedPhasePlan?.statusPenyusunan || 'draft',
    sertakanPemetaanDiDocx: options?.includeAllocationColumn ?? Boolean(savedPhasePlan),
    peringatanValidasi: peringatanValidasi.length > 0 ? peringatanValidasi : undefined,
    totalJPPerSemester: { semester1: sem1JP, semester2: sem2JP },
    kapasitasJPPerSemester: { semester1: kapSem1, semester2: kapSem2 },
    items,
    totalJP,
  };
}

export interface BuildProtaOptions {
  tpListSem1?: CustomTPItem[];
  tpListSem2?: CustomTPItem[];
  calendarSem1?: SemesterAcademicCalendar;
  calendarSem2?: SemesterAcademicCalendar;
  jpConfig?: SubjectJPConfig;
}

function normalizeProtaTopicKey(topic: string): string {
  return (topic || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function resolveSemesterTPListIndependently(
  profile: SchoolProfile,
  jenjangFase: ReturnType<typeof jenjangToDefaultFase>,
  targetSemester: '1 (Ganjil)' | '2 (Genap)',
  explicitList?: CustomTPItem[],
  activeSemesterTpList?: CustomTPItem[]
): { list: CustomTPItem[]; sumber: 'saved' | 'catalog' } {
  if (explicitList && explicitList.length > 0) {
    return { list: explicitList, sumber: 'saved' };
  }

  const fromPhaseATP = resolveSemesterTPListFromPhaseATP(
    profile,
    targetSemester,
    activeSemesterTpList
  );
  if (fromPhaseATP && fromPhaseATP.length > 0) {
    return { list: fromPhaseATP, sumber: 'saved' };
  }

  const saved = getSavedCustomTPList(
    profile.mataPelajaranUtama,
    profile.kelasUtama,
    targetSemester,
    profile
  );

  const targetCode = resolveSemesterCode(targetSemester);
  const activeCode = resolveSemesterCode(profile.semester);

  if (targetCode === activeCode && activeSemesterTpList && activeSemesterTpList.length > 0) {
    return {
      list: activeSemesterTpList,
      sumber: saved && saved.length > 0 ? 'saved' : 'catalog',
    };
  }

  if (saved && saved.length > 0) {
    return { list: saved, sumber: 'saved' };
  }

  const plan = getSemesterCurriculumPlan(
    profile.mataPelajaranUtama,
    jenjangFase,
    profile.kelasUtama,
    targetSemester,
    { schoolId: profile.schoolId, tahunAjaran: profile.tahunAjaran }
  );
  return { list: plan.tpList, sumber: 'catalog' };
}

/**
 * Pembuat Program Tahunan (Prota) Semester 1 & 2 secara independen (anti-duplikasi antarsemester)
 */
export function buildSmartProta(
  profile: SchoolProfile,
  activeSemesterTpList?: CustomTPItem[],
  options?: BuildProtaOptions
): ProtaDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const jpConfig = options?.jpConfig || getSubjectJPConfig(profile);
  const calendarSem1 = options?.calendarSem1 || getAcademicCalendarForContext(profile, '1 (Ganjil)');
  const calendarSem2 = options?.calendarSem2 || getAcademicCalendarForContext(profile, '2 (Genap)');

  const colsSem1 = generateSemesterWeekColumns(calendarSem1, jpConfig.jpPerMinggu);
  const colsSem2 = generateSemesterWeekColumns(calendarSem2, jpConfig.jpPerMinggu);
  const mingguEfektifSemester1 = colsSem1.filter((c) => c.isEfektif).length;
  const mingguEfektifSemester2 = colsSem2.filter((c) => c.isEfektif).length;
  const mingguEfektifTahunan = mingguEfektifSemester1 + mingguEfektifSemester2;
  const kapasitasJPSemester1 = colsSem1.reduce(
    (s, c) => s + (c.isEfektif ? c.kapasitasJP ?? jpConfig.jpPerMinggu : 0),
    0
  );
  const kapasitasJPSemester2 = colsSem2.reduce(
    (s, c) => s + (c.isEfektif ? c.kapasitasJP ?? jpConfig.jpPerMinggu : 0),
    0
  );
  const kapasitasJPTahunan = kapasitasJPSemester1 + kapasitasJPSemester2;

  const sem1Resolved = resolveSemesterTPListIndependently(
    profile,
    jenjangFase,
    '1 (Ganjil)',
    options?.tpListSem1,
    activeSemesterTpList
  );
  const sem2Resolved = resolveSemesterTPListIndependently(
    profile,
    jenjangFase,
    '2 (Genap)',
    options?.tpListSem2,
    activeSemesterTpList
  );

  const sem1TopicKeys = new Set(
    sem1Resolved.list.map((tp) => normalizeProtaTopicKey(tp.materiPokok)).filter(Boolean)
  );

  const itemsSemester1: ProtaItem[] = sem1Resolved.list.map((tp, idx) => ({
    no: idx + 1,
    tpId: tp.id,
    semester: '1 (Ganjil)',
    kodeTP: tp.kode,
    lingkupMateri: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiJP: Math.max(0, Number(tp.alokasiJP) || 0),
    mingguMulai: tp.mingguMulai,
    mingguSelesai: tp.mingguSelesai,
    keterangan: 'Tuntas Semester Ganjil',
  }));

  let hasSpiralTopic = false;
  const itemsSemester2: ProtaItem[] = sem2Resolved.list.map((tp, idx) => {
    const normTopic = normalizeProtaTopicKey(tp.materiPokok);
    const isSpiralContinuation = normTopic !== '' && sem1TopicKeys.has(normTopic);
    if (isSpiralContinuation) {
      hasSpiralTopic = true;
    }
    const progresSpiral = isSpiralContinuation
      ? 'Pembelajaran spiral: pendalaman konsep, variasi kasus kompleks, dan transfer lintas konteks dari Semester 1'
      : undefined;

    return {
      no: idx + 1,
      tpId: tp.id,
      semester: '2 (Genap)',
      kodeTP: tp.kode,
      lingkupMateri: tp.materiPokok,
      tujuanPembelajaran: tp.tujuanPembelajaran,
      alokasiJP: Math.max(0, Number(tp.alokasiJP) || 0),
      mingguMulai: tp.mingguMulai,
      mingguSelesai: tp.mingguSelesai,
      progresSpiral,
      keterangan: isSpiralContinuation
        ? 'Pendalaman Spiral (Lanjutan Sem 1)'
        : 'Tuntas Semester Genap',
    };
  });

  const totalJPSemester1 = itemsSemester1.reduce((sum, it) => sum + it.alokasiJP, 0);
  const totalJPSemester2 = itemsSemester2.reduce((sum, it) => sum + it.alokasiJP, 0);
  const totalJPTahunan = totalJPSemester1 + totalJPSemester2;

  const peringatanProta: string[] = [];
  if (
    calendarSem1.statusKonfirmasi !== 'dikonfirmasi_sekolah' ||
    calendarSem2.statusKonfirmasi !== 'dikonfirmasi_sekolah'
  ) {
    peringatanProta.push(
      'Kalender akademik masih menggunakan template awal (belum dikonfirmasi sekolah) — jumlah minggu efektif dapat berubah setelah dikonfirmasi.'
    );
  }
  if (jpConfig.statusKonfirmasi !== 'dikonfirmasi_sekolah') {
    peringatanProta.push(
      `Alokasi ${jpConfig.jpPerMinggu} JP/minggu (${jpConfig.durasiJPMinut} menit/JP) merupakan estimasi awal dan perlu dikonfirmasi terhadap jadwal sekolah.`
    );
  }
  if (totalJPSemester1 > kapasitasJPSemester1) {
    peringatanProta.push(
      `Semester 1 kelebihan alokasi TP (${totalJPSemester1} JP vs kapasitas ${kapasitasJPSemester1} JP pada ${mingguEfektifSemester1} minggu efektif).`
    );
  }
  if (totalJPSemester2 > kapasitasJPSemester2) {
    peringatanProta.push(
      `Semester 2 kelebihan alokasi TP (${totalJPSemester2} JP vs kapasitas ${kapasitasJPSemester2} JP pada ${mingguEfektifSemester2} minggu efektif).`
    );
  }
  if (hasSpiralTopic) {
    peringatanProta.push(
      'Beberapa lingkup materi muncul kembali di Semester 2 sebagai kelanjutan spiral (pendalaman kompetensi bertahap), bukan duplikasi materi identik.'
    );
  }

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
    totalJPTahunan,
    sumberSemester1: sem1Resolved.sumber,
    sumberSemester2: sem2Resolved.sumber,
    mingguEfektifSemester1,
    mingguEfektifSemester2,
    mingguEfektifTahunan,
    kapasitasJPSemester1,
    kapasitasJPSemester2,
    kapasitasJPTahunan,
    kalenderSem1Terkonfirmasi: calendarSem1.statusKonfirmasi === 'dikonfirmasi_sekolah',
    kalenderSem2Terkonfirmasi: calendarSem2.statusKonfirmasi === 'dikonfirmasi_sekolah',
    jpConfig,
    peringatanProta,
  };
}

export interface BuildPromesOptions {
  calendar?: SemesterAcademicCalendar;
  jpConfig?: SubjectJPConfig;
  manualDistributions?: PromesManualOverridesMap;
}

/**
 * Pembuat Program Semester (Promes) Visual berbasis Kalender Sekolah, Konfigurasi JP Mapel,
 * rentang mingguMulai–mingguSelesai TP, dan validasi kapasitas/defisit/overflow tanpa membuang JP diam-diam.
 */
export function buildSmartPromes(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  options?: BuildPromesOptions
): PromesDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const calendar = options?.calendar || getAcademicCalendarForContext(profile, profile.semester);
  const jpConfig = options?.jpConfig || getSubjectJPConfig(profile);
  const manualOverrides = options?.manualDistributions ?? getPromesManualOverrides(profile);

  const columns: PromesMingguColumn[] = generateSemesterWeekColumns(
    calendar,
    jpConfig.jpPerMinggu
  );

  const remainingCap = columns.map((col) =>
    col.isEfektif ? Math.max(0, col.kapasitasJP ?? jpConfig.jpPerMinggu) : 0
  );
  const weekKeyToColIndex = new Map<string, number>();
  columns.forEach((col, cIdx) => {
    if (col.weekKey) {
      weekKeyToColIndex.set(col.weekKey, cIdx);
    }
  });

  const validationIssues: PromesValidationIssue[] = [];

  if (calendar.statusKonfirmasi !== 'dikonfirmasi_sekolah') {
    validationIssues.push({
      kode: 'KALENDER_BELUM_DIKONFIRMASI',
      severity: 'info',
      pesan:
        'Kalender akademik semester ini masih berstatus template awal (belum dikonfirmasi sekolah). Atur tanggal libur nasional/keagamaan, MPLS, STS, SAS, dan rapor agar akurat.',
    });
  }

  if (
    jpConfig.statusKonfirmasi !== 'dikonfirmasi_sekolah' ||
    !jpConfig.tersediaDiKatalogDefault
  ) {
    validationIssues.push({
      kode: 'JP_BELUM_DIKONFIRMASI',
      severity: !jpConfig.tersediaDiKatalogDefault ? 'warning' : 'info',
      pesan: !jpConfig.tersediaDiKatalogDefault
        ? `Alokasi JP default untuk "${profile.mataPelajaranUtama}" belum tersedia di preset — harap isi & konfirmasi JP/minggu sesuai jadwal sekolah.`
        : `Konfigurasi ${jpConfig.jpPerMinggu} JP/minggu (${jpConfig.durasiJPMinut} menit, ${jpConfig.pertemuanPerMinggu} pertemuan) masih berupa estimasi dan belum dikonfirmasi oleh guru.`,
    });
  }

  const promesSemester: '1 (Ganjil)' | '2 (Genap)' =
    resolveSemesterCode(profile.semester) === 'sem2' ? '2 (Genap)' : '1 (Ganjil)';
  const effectiveTpList =
    resolveSemesterTPListFromPhaseATP(profile, promesSemester, tpList) || tpList;

  const rows: PromesRowItem[] = effectiveTpList.map((tp, idx) => {
    const alokasiJP = Math.max(0, Number(tp.alokasiJP) || 0);
    const rawMulai = Number(tp.mingguMulai);
    const rawSelesai = Number(tp.mingguSelesai);
    const hasExplicitRange = Number.isFinite(rawMulai) && Number.isFinite(rawSelesai);
    const mingguMulai = Number.isFinite(rawMulai) ? Math.max(1, Math.floor(rawMulai)) : 1;
    const mingguSelesai = Number.isFinite(rawSelesai)
      ? Math.max(1, Math.floor(rawSelesai))
      : columns.length;

    const distribusiJP: { [colIndex: number]: number } = {};
    let konflikJadwal: string | undefined = undefined;
    const tpManual = tp.id ? manualOverrides[tp.id] : undefined;
    const hasManualForTP = Boolean(tpManual && Object.keys(tpManual).length > 0);

    if (hasExplicitRange && rawMulai > rawSelesai) {
      konflikJadwal = `Rentang minggu tidak valid (${rawMulai} > ${rawSelesai}).`;
      validationIssues.push({
        kode: 'RENTANG_MINGGU_TIDAK_VALID',
        severity: 'error',
        tpKode: tp.kode,
        pesan: `TP ${tp.kode}: mingguMulai (${rawMulai}) lebih besar daripada mingguSelesai (${rawSelesai}).`,
      });
    } else if (hasManualForTP && tpManual) {
      let rejectedHolidayCount = 0;
      for (const [weekKey, rawVal] of Object.entries(tpManual)) {
        const val = Math.max(0, Math.floor(Number(rawVal) || 0));
        if (val <= 0) continue;
        const cIdx = weekKeyToColIndex.get(weekKey);
        if (cIdx === undefined) continue;
        const col = columns[cIdx];
        if (!col.isEfektif) {
          rejectedHolidayCount += val;
          continue;
        }
        distribusiJP[cIdx] = val;
        remainingCap[cIdx] = remainingCap[cIdx] - val;
      }
      if (rejectedHolidayCount > 0) {
        validationIssues.push({
          kode: 'KONFLIK_LIBUR_MANUAL',
          severity: 'warning',
          tpKode: tp.kode,
          pesan: `TP ${tp.kode}: ${rejectedHolidayCount} JP dari penyesuaian manual diabaikan karena jatuh pada minggu libur/non-efektif.`,
        });
      }
    } else {
      // Penjadwalan otomatis STRICT mengikuti [mingguMulai .. mingguSelesai] dan melewati minggu non-efektif/libur
      let sisaJP = alokasiJP;
      const clampedStart = Math.max(1, mingguMulai);
      const clampedEnd = Math.min(columns.length, mingguSelesai);

      if (hasExplicitRange && (rawMulai < 1 || rawSelesai > columns.length)) {
        validationIssues.push({
          kode: 'RENTANG_MINGGU_TIDAK_VALID',
          severity: 'warning',
          tpKode: tp.kode,
          pesan: `TP ${tp.kode} menetapkan rentang Minggu ${rawMulai}–${rawSelesai}, sedangkan kalender semester memiliki ${columns.length} minggu.`,
        });
      }

      for (let cIdx = 0; cIdx < columns.length && sisaJP > 0; cIdx++) {
        const col = columns[cIdx];
        const semWeek = col.semesterWeekNumber ?? cIdx + 1;
        if (semWeek < clampedStart || semWeek > clampedEnd) {
          continue;
        }
        if (!col.isEfektif || remainingCap[cIdx] <= 0) {
          continue;
        }
        const alloc = Math.min(sisaJP, remainingCap[cIdx]);
        if (alloc > 0) {
          distribusiJP[cIdx] = alloc;
          remainingCap[cIdx] -= alloc;
          sisaJP -= alloc;
        }
      }
    }

    const jpTerjadwal = Object.values(distribusiJP).reduce((s, v) => s + v, 0);
    const jpBelumTerjadwal = Math.max(0, alokasiJP - jpTerjadwal);

    if (jpBelumTerjadwal > 0 && !konflikJadwal) {
      konflikJadwal = `${jpBelumTerjadwal} JP belum terjadwal pada Minggu ${mingguMulai}–${mingguSelesai}`;
      validationIssues.push({
        kode: 'OVERFLOW_RENTANG_TP',
        severity: 'warning',
        tpKode: tp.kode,
        pesan: `TP ${tp.kode} (${tp.materiPokok}) membutuhkan ${alokasiJP} JP pada Minggu ${mingguMulai}–${mingguSelesai}, tetapi hanya ${jpTerjadwal} JP yang muat di minggu efektif rentang tersebut (kurang / belum terjadwal ${jpBelumTerjadwal} JP).`,
      });
    }

    return {
      no: idx + 1,
      tpId: tp.id,
      kodeTP: tp.kode,
      materiPokok: tp.materiPokok,
      tujuanPembelajaran: tp.tujuanPembelajaran,
      alokasiJP,
      mingguMulai,
      mingguSelesai,
      jpTerjadwal,
      jpBelumTerjadwal,
      konflikJadwal,
      isManualOverride: hasManualForTP,
      distribusiJP,
    };
  });

  // Cek apakah ada minggu yang terisi melebihi kapasitas mingguan akibat penyesuaian manual
  columns.forEach((col, cIdx) => {
    const colSum = rows.reduce((s, r) => s + (r.distribusiJP[cIdx] || 0), 0);
    const colCap = col.isEfektif ? col.kapasitasJP ?? jpConfig.jpPerMinggu : 0;
    if (colSum > colCap) {
      validationIssues.push({
        kode: 'OVERFLOW_ALOKASI',
        severity: 'error',
        pesan: `Minggu ${col.bulanNama} M${col.mingguKe} (Minggu ke-${col.semesterWeekNumber ?? cIdx + 1}) terisi ${colSum} JP melebihi kapasitas ${colCap} JP/minggu.`,
      });
    }
  });

  const totalMingguKalender = columns.length;
  const totalMingguEfektif = columns.filter((c) => c.isEfektif).length;
  const totalMingguNonEfektif = totalMingguKalender - totalMingguEfektif;
  const totalKapasitasJPSemester = columns.reduce(
    (s, c) => s + (c.isEfektif ? c.kapasitasJP ?? jpConfig.jpPerMinggu : 0),
    0
  );
  const totalJPDibutuhkanTP = rows.reduce((s, r) => s + r.alokasiJP, 0);
  const totalJPTerjadwal = rows.reduce((s, r) => s + (r.jpTerjadwal ?? 0), 0);
  const totalJPBelumTerjadwal = Math.max(0, totalJPDibutuhkanTP - totalJPTerjadwal);
  const selisihKapasitasJP = totalKapasitasJPSemester - totalJPDibutuhkanTP;
  const defisitJP = Math.max(0, totalJPDibutuhkanTP - totalKapasitasJPSemester);
  const surplusJP = Math.max(0, totalKapasitasJPSemester - totalJPDibutuhkanTP);

  if (totalJPDibutuhkanTP > totalKapasitasJPSemester) {
    validationIssues.push({
      kode: 'OVERFLOW_ALOKASI',
      severity: 'error',
      pesan: `Overflow Alokasi JP: Total kebutuhan TP (${totalJPDibutuhkanTP} JP) melebihi kapasitas minggu efektif semester (${totalKapasitasJPSemester} JP) sebesar ${defisitJP} JP.`,
    });
    validationIssues.push({
      kode: 'DEFISIT_KAPASITAS',
      severity: 'error',
      pesan: `Defisit Kapasitas Semester: Tersedia ${totalKapasitasJPSemester} JP efektif, kurang ${defisitJP} JP untuk menuntaskan seluruh TP. Tambah JP/minggu, tambah minggu efektif, atau kurangi alokasi JP TP.`,
    });
  } else if (totalJPBelumTerjadwal > 0) {
    validationIssues.push({
      kode: 'DEFISIT_KAPASITAS',
      severity: 'warning',
      pesan: `Defisit Slot Rentang Minggu: Masih ada ${totalJPBelumTerjadwal} JP alokasi TP yang belum terjadwal pada rentang minggu mulai–selesai yang dipilih.`,
    });
  }

  if (surplusJP > 0) {
    const isScheduleConfirmed =
      calendar.statusKonfirmasi === 'dikonfirmasi_sekolah' &&
      jpConfig.statusKonfirmasi === 'dikonfirmasi_sekolah';
    const rangeDetail =
      totalJPBelumTerjadwal > 0
        ? ` (catatan: baru ${totalJPTerjadwal} JP yang masuk ke rentang minggu TP terpilih dan ${totalJPBelumTerjadwal} JP masih perlu perluasan rentang minggu)`
        : '';
    const basisNote = isScheduleConfirmed
      ? 'Sisa jam ini dapat dimanfaatkan untuk pengayaan, remedial, proyek/kokurikuler, atau cadangan asesmen formatif.'
      : 'Angka sisa masih berbasis kalender/JP estimasi awal dan dapat berkurang setelah hari libur nasional/keagamaan serta agenda sekolah ditambahkan.';
    validationIssues.push({
      kode: 'SURPLUS_KAPASITAS',
      severity: 'info',
      pesan: `Sisa Kapasitas Efektif (${surplusJP} JP): Total kapasitas minggu efektif saat ini (${totalKapasitasJPSemester} JP) menyisakan ${surplusJP} JP di luar total kebutuhan TP (${totalJPDibutuhkanTP} JP)${rangeDetail}. ${basisNote}`,
    });
  }

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
    totalJPEfektif: totalJPTerjadwal,
    jpPerMinggu: jpConfig.jpPerMinggu,
    durasiJPMinut: jpConfig.durasiJPMinut,
    pertemuanPerMinggu: jpConfig.pertemuanPerMinggu,
    totalMingguKalender,
    totalMingguEfektif,
    totalMingguNonEfektif,
    totalKapasitasJPSemester,
    totalJPDibutuhkanTP,
    totalJPTerjadwal,
    totalJPBelumTerjadwal,
    selisihKapasitasJP,
    defisitJP,
    surplusJP,
    kalenderTerkonfirmasi: calendar.statusKonfirmasi === 'dikonfirmasi_sekolah',
    jpTerkonfirmasi: jpConfig.statusKonfirmasi === 'dikonfirmasi_sekolah',
    calendarSummary: calendar,
    jpConfig,
    validationIssues,
  };
}
