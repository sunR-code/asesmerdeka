import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import {
  jenjangToDefaultFase,
  computeTPContentHash,
  getSavedCustomTPList,
} from './schoolProfileStorage';
import { resolveCPStatusLabel, getSavedCPEntries, cpEntryToReferenceMeta } from './cpStorage';
import {
  analyzeATPDependencyGraph,
  deduplicateATPValidationIssues,
  isSameFase,
  recommendATPAssessmentPlan,
} from './atpSequencingEngine';
import {
  collectPhaseTPItems,
  evaluatePhaseATPApproval,
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
  CooperativeTechniqueVariant,
  KegiatanPembelajaranLangkah,
  ModulReferensiSumberItem,
  TahapKegiatanTerstruktur,
} from '../types/perangkatAjar';
import {
  COOPERATIVE_TECHNIQUE_VARIANTS,
  getModulAjarModelDefinition,
  isValidModulAjarModelType,
  type ModulAjarModelType,
  type PedagogicalSyntaxStageDefinition,
} from './modulPedagogicalModels';
import {
  computeMeetingsNeededForTP,
  distributeActivitiesIntoMeetings,
  distributeStageDurations,
  formatAlokasiWaktuLabel,
  resolveModulTimePreset,
  syncLegacyArraysFromStructuredStages,
  type JenjangKategoriModul,
} from './modulTimeBudget';
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
import { resolveSubjectFamily } from './lkpdSubjectBlueprints';
import { validateLKPDDokumen } from './lkpdValidator';
import {
  buildModulLKPDSummaryFromDoc,
  buildOperationalAsesmenDetail,
  buildOperationalBahanBacaan,
  buildOperationalDiferensiasi,
  resolveRecommendedLKPDPresetForModel,
  selectRelevantProfilLulusanDimensions,
  summarizeAsesmenDetailToLegacy,
} from './modulOperationalContent';
import {
  buildReferensiBahanBacaanNote,
  formatReferensiSumberCitation,
} from './modulReferensiSumber';

export interface BuildSmartModulAjarOptions {
  model?: ModulAjarModelType;
  jumlahPertemuan?: number;
  jpPerPertemuan?: number;
  menitPerJP?: number;
  smkTrackOverride?: 'umum' | 'kejuruan';
  variasiTeknikModel?: CooperativeTechniqueVariant;
  konteksLokal?: string;
  referensiSumber?: ModulReferensiSumberItem[];
}

interface GradeScaffoldingTone {
  konteksLingkungan: string;
  karakteristikAktivitas: string;
  mediaKhas: string;
  targetPeserta: string;
  asesmenAwalContoh: string;
  asesmenFormatifContoh: string;
  asesmenSumatifContoh: string;
  pengayaanStrategi: string;
  remedialStrategi: string;
}

function resolveGradeScaffoldingTone(
  jenjang: JenjangKategoriModul,
  smkTrack: 'umum' | 'kejuruan' | 'tidak_teridentifikasi' | undefined,
  materi: string,
  mapel: string
): GradeScaffoldingTone {
  if (jenjang === 'SD/MI') {
    return {
      konteksLingkungan: 'kehidupan sehari-hari di rumah, kelas, dan halaman sekolah',
      karakteristikAktivitas: 'pengamatan benda nyata, kartu gambar/peraga, serta tanya jawab sederhana yang menyenangkan',
      mediaKhas: `kartu peraga, benda nyata di sekitar kelas, papan tulis, dan lembar aktivitas bergambar "${materi}"`,
      targetPeserta:
        'Peserta didik SD/MI reguler dengan pendampingan visual-konkret dan dukungan bertahap sesuai kesiapan belajar.',
      asesmenAwalContoh: `Kuis kartu Benar/Salah atau tanya jawab lisan singkat dengan 2 contoh benda nyata terkait "${materi}".`,
      asesmenFormatifContoh: `Cek langsung pengisian bagan/lembar aktivitas siswa serta kejelasan penjelasan lisan saat praktik kelompok kecil.`,
      asesmenSumatifContoh: `Uji pemahaman tertulis sederhana (isian singkat, menjodohkan, dan cerita bergambar) sesuai indikator TP ${mapel}.`,
      pengayaanStrategi: `Memberikan tantangan permainan teka-teki lanjutan atau membuat 1 contoh soal cerita bergambar tentang "${materi}" bersama teman.`,
      remedialStrategi: `Pendampingan kelompok kecil menggunakan alat peraga konkret dan latihan bertahap 1-langkah-demi-1-langkah pada bagian dasar "${materi}".`,
    };
  }

  if (jenjang === 'SMP/MTs') {
    return {
      konteksLingkungan: 'permasalahan sehari-hari di sekolah, rumah tangga, dan lingkungan masyarakat sekitar',
      karakteristikAktivitas: 'eksplorasi kasus terpandu, pencatatan tabel data, diskusi peran kelompok, dan penyajian temuan',
      mediaKhas: `LKPD terstruktur, papan tulis/proyektor, kartu data kasus nyata, serta buku rujukan ${mapel}`,
      targetPeserta:
        'Peserta didik SMP/MTs reguler dengan diferensiasi dukungan terpandu (dasar, menengah, mahir).',
      asesmenAwalContoh: `1–2 soal pengecekan konsep prasyarat sebelum memasuki penyelidikan "${materi}".`,
      asesmenFormatifContoh: `Observasi ketepatan langkah analisis pada LKPD, pemeriksaan silang alasan jawaban, dan presentasi singkat.`,
      asesmenSumatifContoh: `Soal aplikasi kontekstual (Pilihan Ganda, AKM Kompleks, dan Uraian penyelesaian masalah "${materi}").`,
      pengayaanStrategi: `Menyelesaikan variasi kasus multi-langkah "${materi}" dengan data terbuka atau bertindak sebagai tutor sebaya.`,
      remedialStrategi: `Bimbingan terarah mengulas konsep prasyarat menggunakan contoh terbimbing bertahap dan latihan terfokus per indikator yang belum tuntas.`,
    };
  }

  if (jenjang === 'SMK' && smkTrack === 'kejuruan') {
    return {
      konteksLingkungan: 'simulasi praktik bengkel/lab, standar mutu pelayanan, serta prosedur operasional dunia kerja kejuruan',
      karakteristikAktivitas: 'pemodelan SOP kerja, pengecekan alat dan Keselamatan Kerja (K3), praktik terukur, serta uji mutu hasil',
      mediaKhas: `peralatan praktik/simulasi ${mapel}, lembar job sheet & ceklis K3, alat ukur/bahan praktik, dan panduan SOP`,
      targetPeserta:
        'Peserta didik SMK kejuruan dengan pendampingan penguasaan prosedur standar, keselamatan kerja (K3), dan ketelitian praktik.',
      asesmenAwalContoh: `Verifikasi kesiapan prasyarat teori dasar serta pengecekan kelengkapan alat dan pemahaman aturan K3 sebelum praktik.`,
      asesmenFormatifContoh: `Observasi unjuk kerja praktik menggunakan lembar ceklis langkah SOP, penerapan K3, kerapian area kerja (5R), dan akurasi hasil.`,
      asesmenSumatifContoh: `Uji kompetensi/unjuk kerja produk sesuai spesifikasi mutu kejuruan dan tes analisis troubleshooting "${materi}".`,
      pengayaanStrategi: `Penugasan optimasi waktu/efisiensi kerja atau analisis kasus troubleshooting lanjutan pada praktik "${materi}".`,
      remedialStrategi: `Pendampingan ulang demonstrasi langkah kritis SOP bersama instruktur/guru serta praktik terbimbing satu-per-satu hingga memenuhi standar aman dan akurat.`,
    };
  }

  if (jenjang === 'SMK') {
    return {
      konteksLingkungan: 'konteks keseharian siswa, literasi sosial-profesi, dan situasi praktis kehidupan bermasyarakat',
      karakteristikAktivitas: 'analisis kasus nyata, diskusi argumen terstruktur, pemodelan konsep, dan aplikasi fungsional',
      mediaKhas: `LKPD kasus kontekstual, teks/data referensi ${mapel}, papan tulis, dan perangkat presentasi`,
      targetPeserta:
        'Peserta didik SMK mapel umum dengan pendekatan aplikatif kontekstual dan diferensiasi dukungan sesuai kesiapan.',
      asesmenAwalContoh: `Tanya jawab pemetaan pengetahuan awal dan 2 butir cek prasyarat ringkas terkait "${materi}".`,
      asesmenFormatifContoh: `Penilaian ketepatan argumen, kelengkapan analisis data pada LKPD, dan keaktifan presentasi kelompok.`,
      asesmenSumatifContoh: `Asesmen terpadu (Pilihan Ganda Analitis, Pilihan Ganda Kompleks, dan Uraian Kontekstual) untuk TP "${materi}".`,
      pengayaanStrategi: `Analisis studi kasus lintas-bidang terapan terkait "${materi}" dengan sumber pembanding tambahan.`,
      remedialStrategi: `Penguatan konsep dasar dengan kerangka langkah sederhana dan latihan terbimbing terfokus pada indikator yang belum tercapai.`,
    };
  }

  // SMA/MA
  return {
    konteksLingkungan: 'isu aktual, fenomena ilmiah-sosial, serta analisis kritis berbasis data dan literatur',
    karakteristikAktivitas: 'investigasi bukti mendalam, verifikasi argumen/model analitis, dan evaluasi kritis lintas perspektif',
    mediaKhas: `artikel/data primer kasus nyata, LKPD investigasi analitis, perangkat presentasi, dan rujukan utama ${mapel}`,
    targetPeserta:
      'Peserta didik SMA/MA Fase E/F dengan variasi kedalaman analisis konseptual dan kemandirian berpikir kritis.',
    asesmenAwalContoh: `Kuis diagnostik singkat 2 butir soal konseptual untuk mendeteksi miskonsepsi awal pada "${materi}".`,
    asesmenFormatifContoh: `Evaluasi kualitas penalaran bukti pada LKPD, ketajaman sanggahan/umpan balik sejawat, dan akurasi simpulan.`,
    asesmenSumatifContoh: `Instrumen analitis HOTS (PG berbasis stimulus data, PGK, dan Uraian argumentatif) sesuai KKTP "${materi}".`,
    pengayaanStrategi: `Kajian kritis sumber pembanding lanjutan atau pemodelan skenario kompleks untuk mengeksplorasi batas berlaku konsep "${materi}".`,
    remedialStrategi: `Pemetaan miskonsepsi spesifik siswa melalui jembatan prasyarat konseptual, contoh terbimbing terurai, dan uji pemahaman bertahap.`,
  };
}

function buildModelIntiStageContent(params: {
  model: ModulAjarModelType;
  stage: PedagogicalSyntaxStageDefinition;
  jenjang: JenjangKategoriModul;
  smkTrack: 'umum' | 'kejuruan' | 'tidak_teridentifikasi' | undefined;
  materi: string;
  konteks: string;
  fokus: string;
  tone: GradeScaffoldingTone;
  cooperativeVariant: CooperativeTechniqueVariant;
}): {
  aktivitasGuru: string;
  aktivitasSiswa: string;
  instruksiPertanyaan: string;
  mediaBahan: string;
  buktiBelajar: string;
} {
  const {
    model,
    stage,
    jenjang,
    smkTrack,
    materi,
    konteks,
    fokus,
    tone,
    cooperativeVariant,
  } = params;
  const isSD = jenjang === 'SD/MI';
  const isKejuruan = jenjang === 'SMK' && smkTrack === 'kejuruan';

  switch (model) {
    case 'pbl': {
      switch (stage.id) {
        case 'pbl_orientasi_masalah':
          return {
            aktivitasGuru: `Guru menyajikan skenario masalah nyata "${konteks}" terkait ${fokus} tanpa langsung memberi rumus/jawaban, lalu memandu siswa mengidentifikasi inti persoalan.`,
            aktivitasSiswa: isSD
              ? `Siswa mengamati cerita/gambar masalah tentang "${materi}" lalu menyebutkan fakta penting dan hal yang perlu dicari.`
              : `Siswa membaca dan membedah skenario masalah autentik, menandai informasi diketahui, serta merumuskan pokok masalah ${fokus}.`,
            instruksiPertanyaan: `"Informasi apa saja yang sudah tersedia pada masalah '${konteks}' ini, dan keputusan apa yang harus kalian pecahkan?"`,
            mediaBahan: `Kartu skenario masalah "${materi}", ${tone.mediaKhas}`,
            buktiBelajar: 'Catatan identifikasi masalah dan daftar data diketahui/ditanya.',
          };
        case 'pbl_organisasi_belajar':
          return {
            aktivitasGuru:
              'Guru membagi siswa ke dalam kelompok 3–4 orang heterogen, menetapkan peran anggota, dan menjelaskan target penyelesaian pada LKPD.',
            aktivitasSiswa:
              'Siswa membagi tugas penyelidikan di kelompok dan menyusun rencana langkah untuk memecahkan masalah.',
            instruksiPertanyaan: `"Langkah apa yang perlu kita uji lebih dahulu untuk menjawab tantangan '${fokus}'?"`,
            mediaBahan: 'LKPD PBL, pembagian peran kelompok',
            buktiBelajar: 'Rencana kerja kelompok & pembagian peran tertulis.',
          };
        case 'pbl_penyelidikan':
          return {
            aktivitasGuru: isKejuruan
              ? 'Guru mendampingi kelompok menguji data teknis, memastikan ketepatan prosedur dan aspek K3, serta memberi scaffolding pertanyaan bila ada kelompok yang buntu.'
              : `Guru berkeliling memeriksa proses penalaran kelompok saat mengolah bukti "${materi}" dan meluruskan kekeliruan langkah secara bertahap.`,
            aktivitasSiswa: isKejuruan
              ? `Siswa melakukan pengujian solusi secara prosedural dengan mematuhi standar K3 dan mencatat hasil pengukuran/analisis.`
              : `Siswa mengumpulkan data pendukung, menguji strategi pemecahan masalah "${fokus}", dan mengecek ulang kebenaran hasil sementara.`,
            instruksiPertanyaan: `"Mengapa kelompok kalian memilih strategi ini? Coba uji apakah jawaban sementara sudah memenuhi syarat pada kasus awal."`,
            mediaBahan: tone.mediaKhas,
            buktiBelajar: 'Draf solusi terstruktur & catatan pengujian data di LKPD.',
          };
        case 'pbl_penyajian_karya':
          return {
            aktivitasGuru:
              'Guru memfasilitasi 2–3 kelompok menyajikan solusi dengan strategi berbeda dan memandu kelompok lain membandingkan argumennya.',
            aktivitasSiswa:
              'Perwakilan kelompok mempresentasikan alur pemecahan masalah dan menanggapi pertanyaan atau masukan teman sekelas.',
            instruksiPertanyaan: `"Bandingkan solusi yang dipaparkan dengan langkah kelompokmu: mana bagian yang paling efisien atau berbeda?"`,
            mediaBahan: 'Papan tulis / kertas plano hasil kerja kelompok',
            buktiBelajar: 'Paparan solusi kelompok dan catatan umpan balik antar-kelompok.',
          };
        default:
          return {
            aktivitasGuru:
              'Guru bersama kelas mengevaluasi ketepatan solusi, menegaskan konsep kunci yang ditemukan, dan mengklarifikasi miskonsepsi umum.',
            aktivitasSiswa:
              'Siswa memperbaiki catatan penyelesaian masing-masing dan menuliskan poin prinsip utama agar kesalahan serupa tidak terulang.',
            instruksiPertanyaan: `"Bagian langkah mana pada pemecahan '${materi}' yang paling rawan keliru, dan bagaimana cara mengeceknya?"`,
            mediaBahan: 'Papan ringkasan konsep & lembar kerja terverifikasi',
            buktiBelajar: 'Simpulan perbaikan solusi pribadi siswa.',
          };
      }
    }

    case 'pjbl': {
      switch (stage.id) {
        case 'pjbl_pertanyaan_mendasar':
          return {
            aktivitasGuru: `Guru memantik tantangan proyek kontekstual "${konteks}" lalu bersama kelas menetapkan pertanyaan mendasar sebagai target produk "${materi}".`,
            aktivitasSiswa:
              'Siswa mendiskusikan tantangan proyek dan menyepakati wujud produk/karya nyata yang akan diciptakan.',
            instruksiPertanyaan: `"Produk atau karya seperti apa pada topik '${materi}' yang benar-benar bermanfaat menjawab tantangan '${konteks}'?"`,
            mediaBahan: `Contoh produk pembanding & deskripsi proyek "${materi}"`,
            buktiBelajar: 'Rumusan Pertanyaan Mendasar & target spesifikasi karya.',
          };
        case 'pjbl_desain_perencanaan':
          return {
            aktivitasGuru:
              'Guru memandu kelompok merancang desain/rancangan produk, daftar alat-bahan, serta mengenalkan kriteria rubrik penilaian karya.',
            aktivitasSiswa: isKejuruan
              ? 'Siswa menyusun gambar kerja/blueprint proyek, daftar kebutuhan bahan, dan daftar cek keselamatan kerja (K3).'
              : 'Siswa merancang sketsa/kerangka produk beserta komponen konsep materi yang wajib termuat di dalamnya.',
            instruksiPertanyaan: `"Komponen konsep '${fokus}' mana yang wajib tampak jelas pada desain karya kalian agar memenuhi kriteria layak?"`,
            mediaBahan: 'Templat rancangan proyek & rubrik kualitas karya',
            buktiBelajar: 'Rancangan/sketsa desain proyek beserta daftar alat-bahan.',
          };
        case 'pjbl_jadwal_peran':
          return {
            aktivitasGuru:
              'Guru membantu tim memecah proyek menjadi tonggak (milestone) berdurasi jelas dan memastikan setiap anggota memegang tugas terukur.',
            aktivitasSiswa:
              'Siswa mengisi tabel jadwal kerja per tahap dan menandatangani pembagian peran masing-masing anggota tim.',
            instruksiPertanyaan: `"Target apa yang harus selesai pada setengah waktu pengerjaan agar produk dapat diuji sebelum penutupan?"`,
            mediaBahan: 'Kartu linimasa proyek & tabel pembagian peran',
            buktiBelajar: 'Jadwal kerja & matriks tanggung jawab tiap anggota.',
          };
        case 'pjbl_monitor_progres':
          return {
            aktivitasGuru: isKejuruan
              ? 'Guru memonitor progres pengerjaan di area kerja menggunakan ceklis mutu & K3 serta memberi umpan balik korektif langsung.'
              : `Guru melakukan pengecekan progres tiap tim pada titik kontrol waktu, memastikan konten "${materi}" akurat, dan membantu tim yang tertinggal.`,
            aktivitasSiswa:
              'Siswa merakit/menyusun produk proyek sesuai desain, mencatat kendala yang ditemui di log progres, dan melakukan uji coba awal.',
            instruksiPertanyaan: `"Apakah bagian yang sedang kalian kerjakan sudah sesuai ukuran/konsep pada rancangan? Kendala teknis apa yang muncul?"`,
            mediaBahan: tone.mediaKhas,
            buktiBelajar: 'Prototipe/produk setengah jadi & log progres kelompok.',
          };
        case 'pjbl_uji_presentasi':
          return {
            aktivitasGuru:
              'Guru mengoordinasikan uji fungsi/kualitas produk sesuai rubrik serta memfasilitasi demo karya tiap tim.',
            aktivitasSiswa:
              'Siswa menguji hasil karyanya, mendemonstrasikan cara kerja/kandungan konsepnya, serta menjawab pertanyaan penguji sejawat.',
            instruksiPertanyaan: `"Tunjukkan bukti bahwa produk kalian bekerja sesuai konsep '${fokus}' dan memenuhi syarat masalah awal!"`,
            mediaBahan: 'Produk/karya jadi & rubrik uji kelayakan',
            buktiBelajar: 'Artefak produk final & skor ceklis uji kelayakan.',
          };
        default:
          return {
            aktivitasGuru:
              'Guru memandu evaluasi keseluruhan pengalaman proyek (mutu karya, kolaborasi tim, dan rencana perbaikan) serta memberi penguatan.',
            aktivitasSiswa:
              'Siswa menuliskan evaluasi proses pembuatan proyek, kontribusi pribadi, dan perbaikan jika proyek dikembangkan ulang.',
            instruksiPertanyaan: `"Apa pelajaran konseptual terpenting dari proyek '${materi}', dan bagian desain mana yang akan kalian perbaiki nanti?"`,
            mediaBahan: 'Lembar refleksi evaluasi proyek',
            buktiBelajar: 'Catatan evaluasi pengalaman proyek individu.',
          };
      }
    }

    case 'inquiry': {
      switch (stage.id) {
        case 'inq_orientasi_fenomena':
          return {
            aktivitasGuru: `Guru memperlihatkan fenomena atau dua sumber bukti pembanding terkait "${materi}" di "${konteks}" tanpa langsung menyimpulkan jawabannya.`,
            aktivitasSiswa: isSD
              ? 'Siswa mengamati fenomena nyata dengan cermat dan menceritakan hal aneh atau menarik yang mereka lihat.'
              : 'Siswa mengamati fenomena/data pembanding secara kritis lalu mencatat pola, perbedaan, atau anomali yang muncul.',
            instruksiPertanyaan: `"Gejala atau perbedaan apa yang langsung terlihat pada fenomena '${materi}' ini, dan hal apa yang masih belum terjawab?"`,
            mediaBahan: `Objek/fenomena pembanding atau dua teks/data primer "${materi}"`,
            buktiBelajar: 'Daftar catatan pengamatan fenomena/anomali awal.',
          };
        case 'inq_rumusan_pertanyaan':
          return {
            aktivitasGuru:
              'Guru memandu kelompok memilih 1–2 pertanyaan terbuka yang dapat diselidiki dari fenomena lalu meminta siswa menuliskan dugaan sementara (hipotesis awal) pada kolom LKPD Inkuiri.',
            aktivitasSiswa:
              'Siswa merumuskan 1–2 pertanyaan penyelidikan ilmiah/analitis terkait fokus materi dan menuliskan dugaan jawabannya disertai alasan awal.',
            instruksiPertanyaan: `"Pertanyaan apa yang paling tepat untuk menguji dugaan kita tentang '${fokus}', dan bukti apa yang perlu dicari?"`,
            mediaBahan: 'LKPD Inkuiri (kolom Pertanyaan & Dugaan Awal)',
            buktiBelajar: 'Rumusan pertanyaan penyelidikan & dugaan awal tertulis.',
          };
        case 'inq_investigasi_bukti':
          return {
            aktivitasGuru:
              'Guru memfasilitasi siswa menjalankan prosedur penyelidikan (pengamatan, pencatatan bukti teks/data, atau uji terarah) dan menjaga objektivitas pencatatan.',
            aktivitasSiswa:
              'Siswa melakukan investigasi sesuai rencana, mengumpulkan bukti faktual tanpa mengubah data agar cocok dengan dugaan awal.',
            instruksiPertanyaan: `"Bukti apa yang benar-benar kalian amati atau temukan? Catat data apa adanya meskipun berbeda dari dugaan semula!"`,
            mediaBahan: tone.mediaKhas,
            buktiBelajar: 'Tabel/catatan bukti hasil investigasi terisi.',
          };
        case 'inq_analisis_argumen':
          return {
            aktivitasGuru:
              'Guru menantang siswa membandingkan bukti temuan dengan dugaan awal serta menguji kekuatan argumen kelompok lain.',
            aktivitasSiswa:
              'Siswa menganalisis pola bukti, menandai klaim yang didukung data vs klaim lemah, dan menyusun argumen berbasis bukti.',
            instruksiPertanyaan: `"Bukti mana yang mendukung dugaan kalian, dan bukti mana yang justru menggugurkan dugaan awal tersebut?"`,
            mediaBahan: 'Matriks Bukti vs Dugaan di LKPD Inkuiri',
            buktiBelajar: 'Analisis kecocokan bukti-dugaan & draf argumen tertulis.',
          };
        default:
          return {
            aktivitasGuru:
              'Guru memimpin forum presentasi simpulan penyelidikan dan memandu siswa merefleksikan perubahan pemahaman mereka.',
            aktivitasSiswa:
              'Siswa memaparkan simpulan berbasis bukti dan menuliskan perbedaan antara pemahaman sebelum dan sesudah menyelidiki.',
            instruksiPertanyaan: `"Berdasarkan seluruh bukti yang terkumpul, bagaimana simpulan akhir kalian tentang '${materi}' dan apa yang mengubah pikiran kalian?"`,
            mediaBahan: 'Papan sintesis simpulan kelas & kartu refleksi',
            buktiBelajar: 'Simpulan berbasis bukti & catatan pergeseran pemahaman.',
          };
      }
    }

    case 'discovery': {
      switch (stage.id) {
        case 'disc_stimulation':
          return {
            aktivitasGuru: `Guru menyajikan rangsangan konkret berupa pasangan contoh-bukan contoh atau fenomena "${materi}" (tanpa menyebutkan aturan/definisinya lebih dulu).`,
            aktivitasSiswa:
              'Siswa mengamati stimulus dengan teliti dan mencatat ciri-ciri yang tampak pada contoh yang diberikan guru.',
            instruksiPertanyaan: `"Amati perbedaan ciri antara contoh kelompok A dan kelompok B tentang '${fokus}' — pola apa yang mulai terlihat?"`,
            mediaBahan: `Kartu/display contoh vs bukan contoh "${materi}"`,
            buktiBelajar: 'Catatan pengamatan ciri dari bahan rangsangan.',
          };
        case 'disc_problem_statement':
          return {
            aktivitasGuru:
              'Guru memancing siswa mengidentifikasi masalah inti dari rangsangan lalu menuliskan jawaban dugaan (konjektur) atas aturan konsep.',
            aktivitasSiswa:
              'Siswa merumuskan persoalan utama dan menuliskan tebakan terarah tentang aturan atau pola konsep yang sedang dicari.',
            instruksiPertanyaan: `"Kira-kira syarat atau aturan apa yang membuat suatu kasus masuk ke konsep '${materi}'? Tuliskan dugaan awal kelompokmu!"`,
            mediaBahan: 'Kolom Dugaan Awal pada LKPD Discovery',
            buktiBelajar: 'Rumusan masalah & pernyataan dugaan sementara.',
          };
        case 'disc_data_collection':
          return {
            aktivitasGuru:
              'Guru membagikan himpunan kasus, data, atau objek eksplorasi terstruktur kepada kelompok dan mengamati ketelitian pencatatan data siswa.',
            aktivitasSiswa: isSD
              ? 'Siswa mengelompokkan benda/kartu contoh dan mencatat sifat-sifat yang muncul pada tabel pengamatan.'
              : 'Siswa mengumpulkan data pendukung dari bahan kajian, pengukuran, atau serangkaian soal kasus eksplorasi.',
            instruksiPertanyaan: `"Periksa seluruh contoh kasus pada lembar kerja dan catat hasil pengamatanmu dengan rapi ke dalam tabel data."`,
            mediaBahan: tone.mediaKhas,
            buktiBelajar: 'Tabel pengumpulan data terisi lengkap.',
          };
        case 'disc_data_processing':
          return {
            aktivitasGuru:
              'Guru memandu siswa mengklasifikasikan, menghitung, atau membandingkan baris-baris data hasil pengumpulan hingga pola keteraturan menonjol.',
            aktivitasSiswa:
              'Siswa mengolah data pada tabel (membandingkan hasil, mengelompokkan pola, dan mencari keteraturan antar-kasus).',
            instruksiPertanyaan: `"Lihat kolom hasil pada baris 1 sampai 4 — hubungan tetap apa yang selalu berulang di setiap kasus?"`,
            mediaBahan: 'Tabel pengolahan pola pada LKPD Discovery',
            buktiBelajar: 'Hasil klasifikasi/perhitungan pola di LKPD.',
          };
        case 'disc_verification':
          return {
            aktivitasGuru:
              'Guru memberikan 1–2 kasus uji baru dan meminta siswa menguji apakah dugaan pola mereka masih berlaku atau perlu direvisi.',
            aktivitasSiswa:
              'Siswa menguji rumusan aturan yang mereka temukan pada kasus baru serta memverifikasinya terhadap rujukan materi.',
            instruksiPertanyaan: `"Jika kita terapkan pola temuan kalian pada contoh uji yang baru ini, apakah hasilnya tetap tepat?"`,
            mediaBahan: 'Kartu kasus verifikasi / rujukan ringkas konsep',
            buktiBelajar: 'Catatan hasil uji kecocokan dugaan vs kasus verifikasi.',
          };
        default:
          return {
            aktivitasGuru:
              'Guru memfasilitasi perumusan generalisasi kelas agar siswa menyatakan kaidah/konsep inti dengan tepat lalu menegaskan istilah resminya.',
            aktivitasSiswa:
              'Siswa menyusun kesimpulan umum (generalisasi) kaidah konsep yang berhasil ditemukan sendiri dengan bahasa yang runtut.',
            instruksiPertanyaan: `"Lengkapilah kaidah umum untuk '${materi}' dengan kata-kata kalian sendiri setelah terbukti pada langkah verifikasi!"`,
            mediaBahan: 'Papan kesimpulan kelas & kotak generalisasi LKPD',
            buktiBelajar: 'Kalimat generalisasi konsep tertulis milik siswa.',
          };
      }
    }

    case 'cooperative': {
      const techniqueGuide =
        cooperativeVariant === 'Jigsaw'
          ? 'teknik Jigsaw (pembagian sub-bagian materi di Kelompok Ahli lalu mengajar kembali ke Kelompok Asal)'
          : cooperativeVariant === 'STAD'
          ? 'teknik STAD (belajar dalam tim heterogen untuk latihan bersama dilanjutkan kuis individu mandiri)'
          : 'teknik Think-Pair-Share (berpikir mandiri, berdiskusi berpasangan, lalu berbagi ke kelompok besar/kelas)';

      switch (stage.id) {
        case 'coop_orientasi_tim':
          return {
            aktivitasGuru: `Guru menyampaikan target bersama serta mengatur pasangan/tim belajar heterogen menggunakan ${techniqueGuide}.`,
            aktivitasSiswa:
              'Siswa bergabung ke pasangan/tim heterogennya dan memahami tujuan ketuntasan tiap individu di dalam tim.',
            instruksiPertanyaan: `"Dalam teknik ${cooperativeVariant}, keberhasilan tim bergantung pada pemahaman setiap anggota — siapa memegang bagian tugas mana?"`,
            mediaBahan: `Kartu tim ${cooperativeVariant} & peta tugas "${materi}"`,
            buktiBelajar: 'Daftar pembagian tim & peran anggota.',
          };
        case 'coop_penyajian_peran':
          return {
            aktivitasGuru: `Guru memaparkan kerangka konsep inti "${fokus}" menggunakan papan ringkasan dan memperagakan aturan main serta giliran tugas ${cooperativeVariant}.`,
            aktivitasSiswa:
              'Siswa mencatat istilah kunci dari ringkasan konsep di papan, menandai pembagian tugas masing-masing pada kartu peran tim, dan mengajukan pertanyaan klarifikasi alur peran.',
            instruksiPertanyaan: `"Perhatikan contoh inti berikut: bagian mana yang harus dipastikan dikuasai oleh seluruh anggota tim kalian?"`,
            mediaBahan: 'Papan/slide ringkasan konsep inti & petunjuk teknik',
            buktiBelajar: 'Catatan kerangka konsep awal siswa.',
          };
        case 'coop_kerja_tim':
          return {
            aktivitasGuru: `Guru berkeliling memantau interaksi saling-mengajar antar-anggota pada tahap ${cooperativeVariant}, menjaga agar tidak ada siswa pasif.`,
            aktivitasSiswa:
              cooperativeVariant === 'Jigsaw'
                ? `Siswa berkumpul di Kelompok Ahli mempelajari sub-bagian materi "${materi}", lalu kembali ke Kelompok Asal untuk mengajar teman satu tim.`
                : cooperativeVariant === 'Think-Pair-Share'
                ? `Siswa berpikir dan mencatat ide sendiri dulu (Think), mencocokkan alasan dengan teman sebangku (Pair), lalu memoles jawaban pasangan.`
                : `Siswa berlatih menyelesaikan soal/tugas "${fokus}" dalam tim, saling menjelaskan alasan, dan tidak lanjut sebelum semua rekan paham.`,
            instruksiPertanyaan: `"Jangan hanya menyalin jawaban teman! Minta rekan timmu menjelaskan 'mengapa' langkah tersebut benar."`,
            mediaBahan: tone.mediaKhas,
            buktiBelajar: 'Lembar catatan ahli/pasangan & hasil diskusi tim.',
          };
        case 'coop_uji_individu_tim':
          return {
            aktivitasGuru:
              'Guru memberikan cek/kuis pemahaman individu singkat (tanpa bantuan tim) diikuti paparan ringkas hasil kolaborasi tim.',
            aktivitasSiswa:
              'Setiap siswa mengerjakan cek pemahaman secara mandiri untuk membuktikan penguasaan konsep masing-masing.',
            instruksiPertanyaan: `"Sekarang buktikan penguasaan pribadimu: kerjakan 2 pertanyaan cek '${fokus}' ini secara mandiri!"`,
            mediaBahan: 'Kartu kuis individu & lembar hasil tim',
            buktiBelajar: 'Skor cek pemahaman individu & produk gabungan tim.',
          };
        default:
          return {
            aktivitasGuru:
              'Guru mengumumkan peningkatan capaian tim/pasangan, memberi pengakuan konstruktif, dan memandu refleksi kerja sama.',
            aktivitasSiswa:
              'Siswa merayakan progres belajar bersama tim dan mencatat 1 hal yang terbantu berkat belajar bersama teman.',
            instruksiPertanyaan: `"Penjelasan teman tim mana yang paling membantumu memahami '${materi}' hari ini?"`,
            mediaBahan: 'Papan skor progres / apresiasi kolaborasi',
            buktiBelajar: 'Catatan refleksi kontribusi tim.',
          };
      }
    }

    case 'explicit': {
      switch (stage.id) {
        case 'exp_orientasi_prasyarat':
          return {
            aktivitasGuru: `Guru menyampaikan keterampilan spesifik "${fokus}" yang harus dikuasai hari ini dan mengecek kesiapan langkah prasyarat di kelas.`,
            aktivitasSiswa:
              'Siswa mengulas keterampilan prasyarat melalui latihan cepat 2 menit dan mengenali tujuan langkah kerja hari ini.',
            instruksiPertanyaan: `"Sebelum mempelajari langkah '${materi}', mari uji ingatan langkah prasyarat ini bersama di papan."`,
            mediaBahan: 'Papan tulis & ceklis keterampilan prasyarat',
            buktiBelajar: 'Kesiapan jawaban review prasyarat siswa.',
          };
        case 'exp_demonstrasi_guru':
          return {
            aktivitasGuru: isKejuruan
              ? `Guru mendemonstrasikan prosedur teknis "${materi}" langkah demi langkah secara eksplisit lengkap dengan penegasan aturan keselamatan K3 (I Do).`
              : `Guru memodelkan cara menyelesaikan contoh "${materi}" step-by-step sambil menyuarakan alasan berpikir di tiap langkah dan memperingatkan jebakan umum (I Do).`,
            aktivitasSiswa:
              'Siswa mengamati demonstrasi guru secara saksama, menandai urutan langkah penting, dan mengajukan tanya jika ada transisi yang belum paham.',
            instruksiPertanyaan: `"Perhatikan langkah ke-2: mengapa saya melakukan cara ini dan bukan sebaliknya? Kesalahan apa yang sering terjadi di sini?"`,
            mediaBahan: isKejuruan
              ? `Alat praktik/peraga standar & lembar SOP "${materi}"`
              : `Contoh terpecahkan bertahap pada papan/slide "${materi}"`,
            buktiBelajar: 'Catatan langkah prosedural terstruktur milik siswa.',
          };
        case 'exp_latihan_terbimbing':
          return {
            aktivitasGuru:
              'Guru memandu siswa mengerjakan contoh serupa bersama langkah-demi-langkah (We Do) dan mengecek kesiapan serentak (papan mini/angkat kartu) sebelum melepas mandiri.',
            aktivitasSiswa:
              'Siswa meniru dan mempraktikkan prosedur langkah bersama arahan isyarat guru sambil memverifikasi ketepatan tiap langkah.',
            instruksiPertanyaan: `"Sekarang kerjakan langkah pertama saja di papan/buku masing-masing — angkat atau tunjukkan bila sudah siap kita lanjut ke langkah ke-2!"`,
            mediaBahan: 'Lembar latihan terbimbing & papan mini / buku latihan',
            buktiBelajar: 'Hasil pengerjaan terbimbing terverifikasi ≥80% benar sebelum latihan mandiri.',
          };
        case 'exp_latihan_mandiri':
          return {
            aktivitasGuru:
              'Guru memberikan rangkaian latihan mandiri bertingkat (dari mudah ke variasi standar) sambil berkeliling memberi umpan balik korektif cepat (You Do).',
            aktivitasSiswa: isKejuruan
              ? 'Siswa mempraktikkan prosedur kerja secara mandiri dengan mematuhi checklist K3 dan melakukan koreksi segera bila diberi catatan guru.'
              : 'Siswa mengerjakan latihan mandiri bertahap untuk melatih kelancaran dan ketepatan prosedur.',
            instruksiPertanyaan: `"Lanjutkan nomor 1–3 secara mandiri menggunakan 3 langkah kunci tadi; angkat tangan jika menemui kendala di bagian tertentu."`,
            mediaBahan: tone.mediaKhas,
            buktiBelajar: 'Hasil kerja latihan mandiri individu.',
          };
        default:
          return {
            aktivitasGuru:
              'Guru melakukan rekap ketepatan langkah yang paling dikuasai vs masih keliru serta merangkum daftar cek (checklist) pengingat prosedur.',
            aktivitasSiswa:
              'Siswa menyusun 3 aturan cek mandiri singkat dan mencatat bagian prosedur yang masih perlu latihan.',
            instruksiPertanyaan: `"Sebutkan kembali 3 langkah berurutan yang tidak boleh tertukar saat mempraktikkan '${materi}'!"`,
            mediaBahan: 'Kartu checklist langkah kunci',
            buktiBelajar: 'Checklist pengingat prosedur pribadi siswa.',
          };
      }
    }

    case 'kontekstual':
    default: {
      switch (stage.id) {
        case 'ctl_konstruktivisme':
          return {
            aktivitasGuru: `Guru membuka dialog pengalaman sehari-hari siswa yang bersinggungan dengan "${konteks}" untuk mengaktifkan pengetahuan bermakna tentang "${materi}".`,
            aktivitasSiswa:
              'Siswa menceritakan pengalaman nyata di rumah atau lingkungan sekitar yang berkaitan dengan konsep materi.',
            instruksiPertanyaan: `"Di mana kalian pernah melihat atau mengalami kejadian seperti '${konteks}'? Bagaimana kalian biasa menyikapinya?"`,
            mediaBahan: 'Foto/cerita fenomena lokal sekitar sekolah',
            buktiBelajar: 'Catatan kaitan pengalaman pribadi dengan konsep baru.',
          };
        case 'ctl_pemodelan_bertanya':
          return {
            aktivitasGuru: `Guru menghadirkan contoh/model konkret nyata terkait "${fokus}" dan memandu siswa mengajukan pertanyaan kritis mengenai cara kerjanya.`,
            aktivitasSiswa:
              'Siswa mengamati demonstrasi/model kontekstual yang ditunjukkan guru lalu merumuskan pertanyaan kritis "mengapa" dan "bagaimana".',
            instruksiPertanyaan: `"Setelah mengamati model nyata ini, pertanyaan apa yang muncul di benak kalian tentang pengaruh '${materi}'?"`,
            mediaBahan: `Benda/model konkret kontekstual & contoh kasus "${materi}"`,
            buktiBelajar: 'Daftar pertanyaan kritis siswa terkait konteks lokal.',
          };
        case 'ctl_menemukan_konteks':
          return {
            aktivitasGuru:
              'Guru membimbing kelompok mengumpulkan atau menganalisis informasi nyata di lingkungan sekitar/kasus lokal untuk menemukan makna konsep.',
            aktivitasSiswa:
              'Siswa menganalisis kasus nyata lokal pada LKPD, mengidentifikasi hubungan sebab-akibat, dan menghubungkannya dengan prinsip materi.',
            instruksiPertanyaan: `"Data lokal apa yang mendukung jawaban kelompok kalian, dan bagaimana prinsip '${materi}' menjelaskannya?"`,
            mediaBahan: tone.mediaKhas,
            buktiBelajar: 'Analisis kasus kontekstual lokal terisi di LKPD.',
          };
        case 'ctl_masyarakat_belajar':
          return {
            aktivitasGuru:
              'Guru membentuk komunitas belajar saling tukar temuan antar-kelompok agar siswa melihat penerapan materi dalam beragam situasi nyata.',
            aktivitasSiswa:
              'Siswa berkolaborasi mendiskusikan penerapan konsep pada konteks berbeda lalu mempresentasikan hasil aplikasinya.',
            instruksiPertanyaan: `"Jika kondisi di lingkungan sekitar berubah, bagaimana penerapan konsep '${fokus}' perlu disesuaikan?"`,
            mediaBahan: 'LKPD CTL & papan pajang temuan kelompok',
            buktiBelajar: 'Paparan aplikasi kontekstual & catatan komentar kelompok lain.',
          };
        default:
          return {
            aktivitasGuru:
              'Guru memfasilitasi refleksi kebermaknaan materi dan menilai penguasaan siswa melalui tugas autentik singkat.',
            aktivitasSiswa:
              'Siswa menuliskan manfaat konkret konsep hari ini untuk keseharian mereka dan menyelesaikan tugas evaluasi autentik.',
            instruksiPertanyaan: `"Bagaimana pemahamanmu tentang '${materi}' hari ini membantumu mengambil keputusan yang lebih tepat dalam kehidupan nyata?"`,
            mediaBahan: 'Kartu refleksi bermakna & tugas autentik akhir',
            buktiBelajar: 'Hasil tugas autentik & jurnal refleksi bermakna.',
          };
      }
    }
  }
}

function buildStructuredMeetingStages(params: {
  pertemuanKe: number;
  jpPertemuan: number;
  menitPerJP: number;
  fokusPertemuan: string;
  model: ModulAjarModelType;
  jenjang: JenjangKategoriModul;
  smkTrack: 'umum' | 'kejuruan' | 'tidak_teridentifikasi' | undefined;
  materi: string;
  konteks: string;
  mapel: string;
  tone: GradeScaffoldingTone;
  cooperativeVariant: CooperativeTechniqueVariant;
}): TahapKegiatanTerstruktur[] {
  const {
    pertemuanKe,
    jpPertemuan,
    menitPerJP,
    fokusPertemuan,
    model,
    jenjang,
    smkTrack,
    materi,
    konteks,
    mapel,
    tone,
    cooperativeVariant,
  } = params;
  const modelDef = getModulAjarModelDefinition(model);
  const totalMenit = jpPertemuan * menitPerJP;
  const { pendahuluanMenit, intiMenitMap, penutupMenit } = distributeStageDurations(
    totalMenit,
    modelDef.tahapanSintaks
  );

  const isSD = jenjang === 'SD/MI';
  const isKejuruan = jenjang === 'SMK' && smkTrack === 'kejuruan';

  const pembukaStage: TahapKegiatanTerstruktur = {
    id: `p${pertemuanKe}_pendahuluan`,
    urutan: 1,
    fase: 'pendahuluan',
    namaTahap: 'Pendahuluan & Kesiapan Belajar',
    tujuanTahap: `Menyiapkan kesadaran belajar, mengaitkan prasyarat dengan ${fokusPertemuan}, dan memetakan kesiapan awal siswa.`,
    aktivitasGuru:
      pertemuanKe === 1
        ? isKejuruan
          ? `Guru membuka pelajaran dengan doa, mengecek kesiapan alat serta komitmen K3, melakukan apersepsi dengan situasi praktik nyata "${konteks}", dan menyampaikan tujuan serta alur ${modelDef.namaSingkat}.`
          : `Guru membuka dengan salam dan doa, mengecek kesiapan belajar siswa, melakukan apersepsi singkat mengenai ${tone.konteksLingkungan}, dan menjelaskan tujuan pertemuan "${fokusPertemuan}".`
        : `Guru mengulas temuan penting pertemuan sebelumnya, mengecek kendala yang tersisa pada ${fokusPertemuan}, dan menyampaikan target lanjutan sesi ini.`,
    aktivitasSiswa: isSD
      ? `Siswa berdoa bersama, menjawab sapaan kesiapan belajar, dan menanggapi pertanyaan pembuka tentang contoh "${materi}" di sekitarnya.`
      : `Siswa mengikuti doa dan cek kesiapan, menjawab kuis pemanasan prasyarat secara lisan/tertulis, dan mencermati target asesmen pertemuan.`,
    instruksiPertanyaan: `"Sebelum memulai '${fokusPertemuan}', apa yang sudah kalian ketahui atau temui tentang hal ini?"`,
    mediaBahan: tone.mediaKhas,
    durasiMenit: pendahuluanMenit,
    buktiBelajar: 'Respon apersepsi & catatan kesiapan prasyarat awal.',
    pengalamanBelajar: 'Memahami',
    prinsipPembelajaran: ['Berkesadaran'],
  };

  const intiStages: TahapKegiatanTerstruktur[] = modelDef.tahapanSintaks.map((stage, sIdx) => {
    const built = buildModelIntiStageContent({
      model,
      stage,
      jenjang,
      smkTrack,
      materi,
      konteks,
      fokus: fokusPertemuan,
      tone,
      cooperativeVariant,
    });
    return {
      id: `p${pertemuanKe}_${stage.id}`,
      urutan: sIdx + 2,
      fase: 'inti',
      namaTahap: `${stage.urutan}. ${stage.namaTahap}`,
      tujuanTahap: stage.tujuanTahap,
      aktivitasGuru: built.aktivitasGuru,
      aktivitasSiswa: built.aktivitasSiswa,
      instruksiPertanyaan: built.instruksiPertanyaan,
      mediaBahan: built.mediaBahan,
      durasiMenit: intiMenitMap[stage.id] ?? 10,
      buktiBelajar: built.buktiBelajar,
      ...(stage.pengalamanBelajar ? { pengalamanBelajar: stage.pengalamanBelajar } : {}),
      ...(stage.prinsipPembelajaran ? { prinsipPembelajaran: [...stage.prinsipPembelajaran] } : {}),
    };
  });

  const penutupStage: TahapKegiatanTerstruktur = {
    id: `p${pertemuanKe}_penutup`,
    urutan: intiStages.length + 2,
    fase: 'penutup',
    namaTahap: 'Penutup, Cek Pemahaman & Refleksi',
    tujuanTahap: `Memastikan ketercapaian inti ${fokusPertemuan}, merefleksikan proses belajar, dan menutup sesi dengan tindak lanjut jelas.`,
    aktivitasGuru: isKejuruan
      ? `Guru memandu pemeriksaan kerapian alat/area kerja (5R), memberikan cek pemahaman cepat ${mapel}, memfasilitasi refleksi, dan memberi arahan sesi berikutnya.`
      : `Guru bersama siswa merangkum konsep inti "${fokusPertemuan}", memberikan cek pemahaman cepat (exit ticket), memandu refleksi singkat, dan menyampaikan agenda berikutnya.`,
    aktivitasSiswa:
      'Siswa menjawab pertanyaan cek akhir secara mandiri, menuliskan satu hal yang dipahami dan bagian yang masih perlu latihan, lalu berdoa penutup.',
    instruksiPertanyaan: `"Satu konsep kunci apa yang paling kamu kuasai dari '${fokusPertemuan}', dan bagian mana yang masih ingin ditanyakan?"`,
    mediaBahan: 'Kartu cek akhir (exit ticket) / lembar refleksi singkat',
    durasiMenit: penutupMenit,
    buktiBelajar: 'Hasil cek pemahaman akhir & catatan refleksi individu.',
    pengalamanBelajar: 'Merefleksi',
    prinsipPembelajaran: ['Berkesadaran', 'Bermakna'],
  };

  return [pembukaStage, ...intiStages, penutupStage];
}

function buildTopicRelevantGlossary(
  tp: CustomTPItem,
  modelLabel: string
): { istilah: string; definisi: string }[] {
  const terms: { istilah: string; definisi: string }[] = [
    {
      istilah: tp.materiPokok,
      definisi: `Konsep utama yang dipelajari pada elemen ${tp.elemen || 'terkait'}: ${tp.tujuanPembelajaran}`,
    },
  ];
  if (tp.subTP && tp.subTP.length > 0) {
    tp.subTP.slice(0, 3).forEach((sub) => {
      terms.push({
        istilah: sub.fokusMateri || sub.kode,
        definisi: sub.kompetensi || sub.buktiKetercapaian || `Fokus materi pada ${sub.kode}.`,
      });
    });
  } else {
    terms.push(
      {
        istilah: `Elemen ${tp.elemen || tp.materiPokok}`,
        definisi: `Lingkup kompetensi pada tujuan pembelajaran ${tp.kode}: ${tp.kompetensiInti || tp.tujuanPembelajaran}`,
      },
      {
        istilah: 'Bukti Ketercapaian (KKTP)',
        definisi:
          tp.buktiKetercapaian?.[0] ||
          `Indikator teramati yang menunjukkan peserta didik telah menguasai ${tp.materiPokok} (${modelLabel}).`,
      }
    );
  }
  return terms;
}

/**
 * Pembuat Modul Ajar (RPP Kurikulum Merdeka) Lengkap, Sadar-Model & Sadar-Jenjang
 */
export function buildSmartModulAjar(
  tp: CustomTPItem,
  profile: SchoolProfile,
  jumlahPertemuanOrOptions?: number | BuildSmartModulAjarOptions
): ModulAjarDokumen {
  const opts: BuildSmartModulAjarOptions =
    typeof jumlahPertemuanOrOptions === 'number'
      ? { jumlahPertemuan: jumlahPertemuanOrOptions }
      : jumlahPertemuanOrOptions || {};

  const model: ModulAjarModelType = isValidModulAjarModelType(opts.model) ? opts.model : 'pbl';
  const modelDef = getModulAjarModelDefinition(model);
  const cooperativeVariant: CooperativeTechniqueVariant =
    model === 'cooperative'
      ? COOPERATIVE_TECHNIQUE_VARIANTS.includes(opts.variasiTeknikModel as CooperativeTechniqueVariant)
        ? (opts.variasiTeknikModel as CooperativeTechniqueVariant)
        : 'Think-Pair-Share'
      : 'Think-Pair-Share';

  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const timePreset = resolveModulTimePreset(profile, {
    jpPerPertemuan: opts.jpPerPertemuan,
    menitPerJP: opts.menitPerJP,
    smkTrackOverride: opts.smkTrackOverride,
  });
  const totalAlokasiJPTP = Math.max(1, Number(tp.alokasiJP) || timePreset.jpPerPertemuan);
  const effectiveSessionJP =
    typeof opts.jpPerPertemuan === 'number' && Number.isFinite(opts.jpPerPertemuan)
      ? timePreset.jpPerPertemuan
      : Math.min(timePreset.jpPerPertemuan, totalAlokasiJPTP);
  const meetingPlan = computeMeetingsNeededForTP(
    totalAlokasiJPTP,
    effectiveSessionJP,
    timePreset.menitPerJP,
    opts.jumlahPertemuan
  );
  const meetingSlices = distributeActivitiesIntoMeetings({
    tp,
    jumlahPertemuan: meetingPlan.jumlahPertemuanAktif,
    jpPerPertemuan: meetingPlan.jpPerPertemuan,
    menitPerJP: meetingPlan.menitPerJP,
  });

  const tone = resolveGradeScaffoldingTone(
    timePreset.jenjangKategori,
    timePreset.smkTrack,
    tp.materiPokok,
    profile.mataPelajaranUtama
  );
  const konteks =
    opts.konteksLokal && opts.konteksLokal.trim().length > 0
      ? opts.konteksLokal.trim()
      : `${tone.konteksLingkungan} terkait ${tp.materiPokok}`;

  const subjectFamily = resolveSubjectFamily(profile.mataPelajaranUtama || '');
  const profilList = selectRelevantProfilLulusanDimensions(
    tp,
    profile,
    timePreset.jenjangKategori,
    timePreset.smkTrack
  );

  const saranaList = [
    tone.mediaKhas,
    'Buku teks utama & buku panduan guru yang digunakan satuan pendidikan (lengkapi edisi & bab/halaman pada daftar pustaka)',
    'Papan tulis / spidol / media presentasi atau alat peraga kelas',
  ];

  const pemantik =
    timePreset.jenjangKategori === 'SD/MI'
      ? [
          `Pernahkah kalian melihat kejadian atau contoh "${tp.materiPokok}" di rumah atau di sekitar sekolah kita?`,
          `Kira-kira apa yang terjadi jika kita keliru menerapkan "${tp.materiPokok}" saat membantu kegiatan sehari-hari?`,
          `Bagaimana cara paling mudah untuk menceritakan kembali aturan penting dari "${tp.materiPokok}" kepada temanmu?`,
        ]
      : [
          `Mengapa penguasaan konsep "${tp.materiPokok}" penting untuk menjawab persoalan nyata pada "${konteks}"?`,
          `Faktor atau data kunci apa yang membedakan pendekatan yang tepat dan keliru saat menerapkan "${tp.materiPokok}"?`,
          `Jika kondisi pada kasus "${konteks}" berubah, bagaimana kesimpulan atau strategi penyelesaianmu ikut menyesuaikan?`,
        ];

  const pemahamanBermakna =
    timePreset.jenjangKategori === 'SD/MI'
      ? `Peserta didik memahami bahwa "${tp.materiPokok}" membantu mereka mengenali kejadian nyata dan menyelesaikan masalah sederhana di ${tone.konteksLingkungan}.`
      : `Peserta didik memahami bahwa konsep "${tp.materiPokok}" merupakan prinsip aplikatif untuk menganalisis persoalan secara logis dan mengambil keputusan tepat pada ${tone.konteksLingkungan}.`;

  const kompetensiAwal =
    tp.prasyarat && tp.prasyarat.length > 0
      ? [
          ...tp.prasyarat.map((p) => `Peserta didik telah memahami prasyarat: ${p}.`),
          `Peserta didik siap mengikuti ${tone.karakteristikAktivitas}.`,
        ]
      : [
          `Peserta didik mengenal konsep dasar pada elemen ${tp.elemen} sebagai pengantar "${tp.materiPokok}".`,
          `Peserta didik siap mengikuti alur belajar ${modelDef.namaSingkat} secara bertahap.`,
        ];

  const safeReferensiSumber =
    Array.isArray(opts.referensiSumber) && opts.referensiSumber.length > 0
      ? opts.referensiSumber
      : undefined;
  const rawBahanBacaan = buildOperationalBahanBacaan({
    tp,
    profile,
    jenjang: timePreset.jenjangKategori,
    smkTrack: timePreset.smkTrack,
    konteks,
  });
  const bahanBacaanNoteFromRefs = buildReferensiBahanBacaanNote(safeReferensiSumber);
  const bahanBacaan = bahanBacaanNoteFromRefs
    ? { ...rawBahanBacaan, referensiCatatan: bahanBacaanNoteFromRefs }
    : rawBahanBacaan;

  const asesmenDetail = buildOperationalAsesmenDetail({
    tp,
    profile,
    jenjang: timePreset.jenjangKategori,
    smkTrack: timePreset.smkTrack,
    konteks,
  });
  const legacyAsesmenSummary = summarizeAsesmenDetailToLegacy(asesmenDetail);

  const diferensiasiOperasional = buildOperationalDiferensiasi({
    tp,
    profile,
    jenjang: timePreset.jenjangKategori,
    smkTrack: timePreset.smkTrack,
    konteks,
  });

  const recommendedPreset = resolveRecommendedLKPDPresetForModel(modelDef.id, subjectFamily);
  const linkedLKPD = buildSmartLKPD(
    tp,
    profile,
    recommendedPreset,
    opts.konteksLokal?.trim() || undefined
  );
  const contohLKPD = buildModulLKPDSummaryFromDoc(linkedLKPD, 'modul_terintegrasi');

  const glossaryFromMaterials =
    bahanBacaan.istilahPenting && bahanBacaan.istilahPenting.length > 0
      ? bahanBacaan.istilahPenting.map((it) => ({
          istilah: it.istilah,
          definisi: it.pengertian,
        }))
      : buildTopicRelevantGlossary(tp, modelDef.namaSingkat);

  const kegiatanPembelajaran: KegiatanPembelajaranLangkah[] = meetingSlices.map((slice) => {
    const tahapTerstruktur = buildStructuredMeetingStages({
      pertemuanKe: slice.pertemuan,
      jpPertemuan: slice.jpPertemuan,
      menitPerJP: meetingPlan.menitPerJP,
      fokusPertemuan: slice.fokusPertemuan,
      model,
      jenjang: timePreset.jenjangKategori,
      smkTrack: timePreset.smkTrack,
      materi: tp.materiPokok,
      konteks,
      mapel: profile.mataPelajaranUtama,
      tone,
      cooperativeVariant,
    });
    const legacySteps = syncLegacyArraysFromStructuredStages(tahapTerstruktur);

    return {
      pertemuan: slice.pertemuan,
      alokasiMenit: slice.alokasiMenit,
      jpPertemuan: slice.jpPertemuan,
      fokusPertemuan: slice.fokusPertemuan,
      ...legacySteps,
      tahapTerstruktur,
    };
  });

  const modelLabelDisplay =
    model === 'cooperative'
      ? `${modelDef.label} (${cooperativeVariant}) - ${modelDef.deskripsi}`
      : `${modelDef.label} - ${modelDef.deskripsi}`;

  return {
    id: `modul-${tp.id}-${Date.now().toString(36)}`,
    tpId: tp.id,
    schoolId: profile.schoolId,
    tpSourceHash: computeTPContentHash(tp),
    needsReview: false,
    modelType: modelDef.id,
    sintaksModelId: modelDef.id,
    ...(model === 'cooperative' ? { variasiTeknikModel: cooperativeVariant } : {}),
    draftSource: 'template',
    judul: `Modul Ajar: ${tp.materiPokok} (${modelDef.namaSingkat})`,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    rombel: profile.rombelAktif,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    alokasiWaktu: formatAlokasiWaktuLabel(meetingPlan),
    alokasiWaktuDetail: {
      jenjangKategori: timePreset.jenjangKategori,
      ...(timePreset.smkTrack ? { smkTrack: timePreset.smkTrack } : {}),
      jpPerPertemuan: meetingPlan.jpPerPertemuan,
      menitPerJP: meetingPlan.menitPerJP,
      totalMenitPertemuan: meetingPlan.totalMenitPertemuan,
      jumlahPertemuan: meetingPlan.jumlahPertemuanAktif,
      totalAlokasiJPTP: meetingPlan.totalAlokasiJPTP,
      sumberPreset: timePreset.sumberPreset,
    },
    jumlahPertemuan: meetingPlan.jumlahPertemuanAktif,
    namaSekolah: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    namaKepalaSekolah: profile.namaKepalaSekolah,
    nipKepalaSekolah: profile.nipKepalaSekolah,
    kotaSekolah: profile.kotaSekolah,
    createdAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),

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
    targetPesertaDidik: tone.targetPeserta,
    modelPembelajaran: modelLabelDisplay,

    pemahamanBermakna,
    pertanyaanPemantik: pemantik,
    bahanBacaan,
    kegiatanPembelajaran,

    asesmen: legacyAsesmenSummary,
    asesmenDetail,
    rubrikPenilaianSingkat: [
      {
        kriteria: `Penguasaan Konsep ${tp.materiPokok}`,
        baruBerkembang: 'Belum mampu mengenali unsur inti konsep meski telah mendapat bimbingan guru.',
        layak: 'Mampu menjelaskan bagian dasar konsep namun belum konsisten menerapkannya.',
        cakap: `Mampu menjelaskan konsep "${tp.materiPokok}" dan menerapkannya pada contoh kontekstual dengan tepat.`,
        mahir: `Mampu menganalisis konsep "${tp.materiPokok}", menguji kebenaran argumen, dan memecahkan variasi situasi baru secara mandiri.`,
      },
      {
        kriteria: `Proses Belajar (${modelDef.namaSingkat})`,
        baruBerkembang: 'Memerlukan arahan intensif di setiap tahapan untuk menyelesaikan tugas.',
        layak: 'Mengikuti sebagian tahapan pembelajaran dengan bimbingan berkala.',
        cakap: 'Melaksanakan tahapan pembelajaran secara runtut, aktif bekerja sama, dan menyajikan bukti belajar yang jelas.',
        mahir: 'Memimpin penyelidikan/kolaborasi secara efektif, memverifikasi ketepatan bukti, dan memberi umpan balik konstruktif.',
      },
    ],

    diferensiasiOperasional,
    contohLKPD,
    catatanValidasi: {
      status: 'template_awal',
      usedFallback: true,
      structuralIssues: [],
      relevanceAndAntiSlopIssues: [],
      semanticReviewWarnings: [
        'Draf ini merupakan Template / Draf Awal adaptif berbasis TP dan jenjang. Periksa kesesuaian contoh konkret, butir asesmen, serta buku rujukan kelas sebelum digunakan mengajar.',
      ],
    },

    pengayaanDanRemedial: {
      pengayaan: `${diferensiasiOperasional.kesiapanMahir.aktivitasKonkret[0]} (${diferensiasiOperasional.kesiapanMahir.dukunganScaffolding})`,
      remedial: `${diferensiasiOperasional.kesiapanDasar.dukunganScaffolding} Latihan utama: ${diferensiasiOperasional.kesiapanDasar.aktivitasKonkret[0]}`,
    },

    refleksiGuru: [
      `Apakah alokasi waktu ${meetingPlan.totalMenitPertemuan} menit per pertemuan cukup bagi siswa menyelesaikan seluruh tahap ${modelDef.namaSingkat}?`,
      `Tahap manakah yang paling membantu siswa memahami "${tp.materiPokok}", dan miskonsepsi apa yang perlu diperkuat?`,
      'Apakah penyesuaian pendampingan (kesiapan dasar, berkembang, dan mahir) sudah menjangkau kebutuhan belajar di kelas?',
    ],
    refleksiSiswa: [
      `Hal baru apa tentang "${tp.materiPokok}" yang paling jelas saya pahami hari ini?`,
      'Bagian langkah atau konsep mana yang masih membingungkan dan perlu saya latih lagi?',
      'Bagaimana peran aktif saya membantu teman atau kelompok saat pembelajaran berlangsung?',
    ],

    glosarium: glossaryFromMaterials,
    daftarPustaka: safeReferensiSumber
      ? [
          ...safeReferensiSumber.map(formatReferensiSumberCitation),
          'Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka.',
        ]
      : [
          `[Lengkapi referensi satuan pendidikan] Buku teks/panduan resmi ${profile.mataPelajaranUtama} Kelas ${profile.kelasUtama} yang digunakan sekolah (cantumkan penulis, tahun terbit, penerbit, bab, dan halaman sesuai edisi aktual).`,
          `Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka.`,
          `Catatan ajar guru & perangkat kontekstual terkait materi "${tp.materiPokok}".`,
        ],
    ...(safeReferensiSumber ? { referensiSumber: safeReferensiSumber } : {}),
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

  const dedupedGraphIssues = deduplicateATPValidationIssues(
    graphAnalysis.issues.filter((iss) => iss.severity !== 'info')
  );
  const peringatanValidasi: string[] = dedupedGraphIssues.map((iss) => iss.message);

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

  const approvalEvaluation = evaluatePhaseATPApproval({
    profile,
    plan: savedPhasePlan,
    orderedTpIds: orderedTpList.map((t) => t.id),
    tpById,
    savedCPs,
  });

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
    statusPenyusunan: approvalEvaluation.effectiveStatus,
    alasanTinjauUlang: approvalEvaluation.isStaleApproval
      ? approvalEvaluation.reasons
      : undefined,
    disetujuiPada: approvalEvaluation.isApprovedValid ? savedPhasePlan?.approvedAt : undefined,
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

  const sem1ByTopicKey = new Map<string, CustomTPItem>();
  for (const tp of sem1Resolved.list) {
    const norm = normalizeProtaTopicKey(tp.materiPokok);
    if (norm && !sem1ByTopicKey.has(norm)) sem1ByTopicKey.set(norm, tp);
  }

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

  let hasDocumentedSpiralTopic = false;
  let hasUnverifiedCloneTopic = false;
  const itemsSemester2: ProtaItem[] = sem2Resolved.list.map((tp, idx) => {
    const normTopic = normalizeProtaTopicKey(tp.materiPokok);
    const matchingSem1 = normTopic ? sem1ByTopicKey.get(normTopic) : undefined;
    const hasExplicitSpiralRelation = Boolean(
      tp.spiralRelation?.newCompetency?.trim() && tp.spiralRelation?.pedagogicalReason?.trim()
    );
    const hasDistinctGoal =
      matchingSem1 &&
      normalizeProtaTopicKey(tp.tujuanPembelajaran) !== normalizeProtaTopicKey(matchingSem1.tujuanPembelajaran);

    let progresSpiral: string | undefined;
    let keterangan = 'Tuntas Semester Genap';

    if (hasExplicitSpiralRelation && tp.spiralRelation) {
      hasDocumentedSpiralTopic = true;
      progresSpiral = `Spiral terdokumentasi: ${tp.spiralRelation.newCompetency} (${tp.spiralRelation.pedagogicalReason})`;
      keterangan = 'Pendalaman Spiral Terdokumentasi';
    } else if (matchingSem1 && hasDistinctGoal) {
      hasDocumentedSpiralTopic = true;
      progresSpiral = `Kelanjutan konsep Sem 1 dengan target kompetensi baru: ${tp.tujuanPembelajaran}`;
      keterangan = 'Pendalaman Spiral (Lanjutan Sem 1)';
    } else if (matchingSem1 && !hasDistinctGoal) {
      hasUnverifiedCloneTopic = true;
      keterangan = 'Perlu Tinjauan Guru (Serupa Sem 1)';
    }

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
      keterangan,
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
  if (hasDocumentedSpiralTopic) {
    peringatanProta.push(
      'Terdapat materi Semester 2 yang terhubung secara spiral terdokumentasi dengan pengayaan kompetensi baru dari Semester 1.'
    );
  }
  if (hasUnverifiedCloneTopic) {
    peringatanProta.push(
      'Perlu ditinjau: ada materi Semester 2 yang identik dengan Semester 1 tanpa penjelasan peningkatan kompetensi.'
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
