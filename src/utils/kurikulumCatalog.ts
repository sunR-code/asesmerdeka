import type { JenjangFase } from '../types/assessment';
import type { CustomTPItem } from './schoolProfileStorage';
import type { SavedCPEntry } from './cpStorage';
import {
  getRichCurriculumTopics,
  lookupCuratedTopicBank,
  resolveNormalizedJenjang,
  type CurriculumContextKind,
  type CurriculumTopicEntry,
  type TopicDocumentSourceStatus,
  type TopicJenjangCategory,
  type TopicPedagogicalReviewStatus,
  type TopicSourceVerificationStatus,
} from '../data/kurikulumTopicBank';
import {
  getAvailableCPReferenceEntries,
  isAgamaBudiPekertiSubject,
  isKemenagSubject,
  isKepercayaanSubject,
  resolveCPReferenceMetadata,
  resolveDefaultCPRegulationPreset,
} from '../data/kurikulumMerdekaCP';
import { createImmutableDefaultTPId } from './storageIdentity';
import { resolveDefaultSubjectJPConfig } from './jpConfigStorage';
import type { ATPAllocationMapping, PhaseATPPlan } from './atpStorage';

export type JenjangKategori = 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK';

export interface JenjangConfig {
  id: JenjangKategori;
  label: string;
  subLabel: string;
  kelasList: { kelas: string; fase: JenjangFase }[];
  mapelUmum: string[];
  mapelMadrasah: string[];
  mapelAgamaBudiPekerti: string[];
  mapelKepercayaan: string[];
  mapelSeniDanPilihan: string[];
  mapelKejuruanSMK?: string[];
  mapelKonsentrasiKeahlianSMK?: string[];
}

export const STANDARD_AGAMA_BUDI_PEKERTI_LIST: string[] = [
  'Pendidikan Agama Islam & Budi Pekerti',
  'Pendidikan Agama Kristen dan Budi Pekerti',
  'Pendidikan Agama Katolik dan Budi Pekerti',
  'Pendidikan Agama Hindu dan Budi Pekerti',
  'Pendidikan Agama Buddha dan Budi Pekerti',
  'Pendidikan Agama Khonghucu dan Budi Pekerti',
];

export const STANDARD_KEPERCAYAAN_LIST: string[] = [
  'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti',
];

export const KURIKULUM_CATALOG: Record<JenjangKategori, JenjangConfig> = {
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
      'Seni Musik',
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
    mapelAgamaBudiPekerti: STANDARD_AGAMA_BUDI_PEKERTI_LIST,
    mapelKepercayaan: STANDARD_KEPERCAYAAN_LIST,
    mapelSeniDanPilihan: [
      'Seni Musik',
      'Seni Rupa',
      'Seni Tari',
      'Seni Teater',
      'SENI dan Budaya',
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
      'Seni Musik',
      'Pendidikan Agama Islam & Budi Pekerti',
    ],
    mapelMadrasah: [
      'Al-Qur\'an Hadis (MTs)',
      'Akidah Akhlak (MTs)',
      'Fikih (MTs)',
      'Sejarah Kebudayaan Islam / SKI (MTs)',
      'Bahasa Arab (MTs)',
    ],
    mapelAgamaBudiPekerti: STANDARD_AGAMA_BUDI_PEKERTI_LIST,
    mapelKepercayaan: STANDARD_KEPERCAYAAN_LIST,
    mapelSeniDanPilihan: [
      'Seni Musik',
      'Seni Rupa',
      'Seni Tari',
      'Seni Teater',
      'Seni Budaya / Prakarya',
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
      'PJOK',
      'Seni Musik',
    ],
    mapelMadrasah: [
      'Al-Qur\'an Hadis (MA)',
      'Akidah Akhlak (MA)',
      'Fikih / Ushul Fikih (MA)',
      'Sejarah Kebudayaan Islam / SKI (MA)',
      'Bahasa Arab (MA)',
    ],
    mapelAgamaBudiPekerti: STANDARD_AGAMA_BUDI_PEKERTI_LIST,
    mapelKepercayaan: STANDARD_KEPERCAYAAN_LIST,
    mapelSeniDanPilihan: [
      'Seni Musik',
      'Seni Rupa',
      'Seni Tari',
      'Seni Teater',
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
      'Seni Musik (Umum)',
    ],
    mapelMadrasah: [
      'Pendidikan Agama Islam & Budi Pekerti',
      'Bahasa Arab Kejuruan',
    ],
    mapelAgamaBudiPekerti: STANDARD_AGAMA_BUDI_PEKERTI_LIST,
    mapelKepercayaan: STANDARD_KEPERCAYAAN_LIST,
    mapelSeniDanPilihan: [
      'Seni Musik (Umum)',
      'Seni Rupa (Umum)',
      'Seni Tari (Umum)',
      'Seni Teater (Umum)',
    ],
    mapelKejuruanSMK: [
      'Matematika Kejuruan',
      'Bahasa Inggris Profesi',
      'Projek IPAS (SMK)',
      'Informatika / Dasar Kejuruan',
      'Produk Kreatif dan Kewirausahaan (PKK)',
      'Bahasa Arab Kejuruan',
    ],
    mapelKonsentrasiKeahlianSMK: [
      'Konsentrasi Keahlian Seni Musik / Pertunjukan Musik (SMK)',
      'Konsentrasi Keahlian Produksi & Siaran Program Musik/Audio (SMK)',
      'Konsentrasi Keahlian Teknik Komputer & Jaringan (SMK)',
      'Konsentrasi Keahlian Rekayasa Perangkat Lunak (SMK)',
      'Konsentrasi Keahlian Akuntansi & Keuangan Lembaga (SMK)',
      'Konsentrasi Keahlian Desain Komunikasi Visual / DKV (SMK)',
      'Konsentrasi Keahlian Kuliner / Perhotelan (SMK)',
    ],
  },
};

export interface SelectableSubjectGroup {
  id:
    | 'umum'
    | 'agama'
    | 'kepercayaan'
    | 'seni_pilihan'
    | 'kejuruan_smk'
    | 'konsentrasi_smk'
    | 'madrasah_kemenag';
  label: string;
  regulationHint: string;
  subjects: string[];
}

export function getSelectableSubjectGroups(
  jenjang: JenjangKategori,
  options?: { madrasahMode?: boolean }
): SelectableSubjectGroup[] {
  const cfg = KURIKULUM_CATALOG[jenjang] || KURIKULUM_CATALOG['SMP/MTs'];
  if (options?.madrasahMode) {
    return [
      {
        id: 'madrasah_kemenag',
        label:
          jenjang === 'SMK'
            ? 'Rumpun Agama & Bahasa Arab Kejuruan'
            : 'Rumpun PAI & Bahasa Arab Madrasah (KMA Kemenag)',
        regulationHint:
          jenjang === 'SMK'
            ? 'Regulasi Agama BKPDM 020/2026 & Kejuruan SMK'
            : 'Regulasi CP Kemenag (KMA) — terpisah dari sekolah umum',
        subjects: cfg.mapelMadrasah,
      },
      {
        id: 'umum',
        label: 'Mata Pelajaran Umum Pendukung di Madrasah',
        regulationHint: 'SK Kepala BSKAP No. 046/H/KR/2025',
        subjects: cfg.mapelUmum.filter((m) => !isAgamaBudiPekertiSubject(m)),
      },
    ];
  }

  const seniSet = new Set(cfg.mapelSeniDanPilihan);
  const agamaSet = new Set(cfg.mapelAgamaBudiPekerti);
  const kepercayaanSet = new Set(cfg.mapelKepercayaan);
  const kejuruanSet = new Set(cfg.mapelKejuruanSMK || []);

  const umumCore = cfg.mapelUmum.filter(
    (m) =>
      !seniSet.has(m) &&
      !agamaSet.has(m) &&
      !kepercayaanSet.has(m) &&
      !kejuruanSet.has(m)
  );
  if (jenjang === 'SMK' && !umumCore.includes('PJOK')) {
    umumCore.push('PJOK');
  }

  const groups: SelectableSubjectGroup[] = [
    {
      id: 'umum',
      label: 'Mata Pelajaran Umum',
      regulationHint: 'SK Kepala BSKAP No. 046/H/KR/2025',
      subjects: umumCore,
    },
    {
      id: 'agama',
      label: 'Pendidikan Agama dan Budi Pekerti (BKPDM No. 020/2026)',
      regulationHint: 'Keputusan Kepala BKPDM No. 020 Tahun 2026',
      subjects: cfg.mapelAgamaBudiPekerti,
    },
    {
      id: 'kepercayaan',
      label: 'Pendidikan Kepercayaan terhadap Tuhan YME (BKPDM No. 021/2026)',
      regulationHint: 'Keputusan Kepala BKPDM No. 021 Tahun 2026 (tersendiri)',
      subjects: cfg.mapelKepercayaan,
    },
    {
      id: 'seni_pilihan',
      label:
        jenjang === 'SMK'
          ? 'Seni & Mata Pelajaran Umum Pilihan (Bukan Konsentrasi SMK)'
          : 'Mata Pelajaran Seni & Pilihan',
      regulationHint: 'SK Kepala BSKAP No. 046/H/KR/2025 & Panduan Seni 2025',
      subjects: cfg.mapelSeniDanPilihan,
    },
  ];

  if (jenjang === 'SMK') {
    if (cfg.mapelKejuruanSMK && cfg.mapelKejuruanSMK.length > 0) {
      groups.push({
        id: 'kejuruan_smk',
        label: 'Mata Pelajaran Kelompok Kejuruan SMK',
        regulationHint: 'SK BSKAP 046/H/KR/2025 & Spektrum Keahlian SMK',
        subjects: cfg.mapelKejuruanSMK,
      });
    }
    if (cfg.mapelKonsentrasiKeahlianSMK && cfg.mapelKonsentrasiKeahlianSMK.length > 0) {
      groups.push({
        id: 'konsentrasi_smk',
        label: 'Konsentrasi Keahlian SMK (Wajib Input / Verifikasi CP Sekolah)',
        regulationHint: 'CP Program/Konsentrasi Keahlian SMK',
        subjects: cfg.mapelKonsentrasiKeahlianSMK,
      });
    }
  }

  return groups;
}

export function getAllSelectableSubjectsForJenjang(
  jenjang: JenjangKategori,
  options?: { includeMadrasah?: boolean }
): string[] {
  const regular = getSelectableSubjectGroups(jenjang, { madrasahMode: false }).flatMap(
    (g) => g.subjects
  );
  const madrasah = options?.includeMadrasah
    ? getSelectableSubjectGroups(jenjang, { madrasahMode: true }).flatMap((g) => g.subjects)
    : [];
  return Array.from(new Set([...regular, ...madrasah]));
}

export interface SubjectCatalogMetadata {
  mataPelajaran: string;
  jenjang: JenjangKategori;
  konteksKurikulum: CurriculumContextKind;
  konteksLabel: string;
  regulationNomor: string;
  regulationLabel: string;
  regulationUrl: string;
  isMadrasah: boolean;
  isKepercayaan: boolean;
  isAgama: boolean;
  isKejuruanSMK: boolean;
  isKonsentrasiSMK: boolean;
}

export function resolveSubjectCatalogMetadata(
  mataPelajaran: string,
  jenjang: JenjangKategori
): SubjectCatalogMetadata {
  const clean = (mataPelajaran || '').trim();
  const lower = clean.toLowerCase();
  const cfg = KURIKULUM_CATALOG[jenjang] || KURIKULUM_CATALOG['SMP/MTs'];
  const preset = resolveDefaultCPRegulationPreset(clean);
  const isMadrasah = isKemenagSubject(clean) || cfg.mapelMadrasah.includes(clean);
  const isKepercayaan = isKepercayaanSubject(clean);
  const isAgama = isAgamaBudiPekertiSubject(clean);
  const isKonsentrasiSMK =
    jenjang === 'SMK' &&
    ((cfg.mapelKonsentrasiKeahlianSMK || []).includes(clean) ||
      lower.includes('konsentrasi keahlian') ||
      lower.includes('pertunjukan musik') ||
      lower.includes('produksi & siaran') ||
      (lower.includes('seni musik') && !lower.includes('(umum)')));
  const isKejuruanSMK =
    jenjang === 'SMK' &&
    !isKonsentrasiSMK &&
    ((cfg.mapelKejuruanSMK || []).includes(clean) ||
      lower.includes('kejuruan') ||
      lower.includes('profesi') ||
      lower.includes('pkk') ||
      lower.includes('projek ipas'));

  let konteksKurikulum: CurriculumContextKind = 'umum';
  let konteksLabel = 'Mata Pelajaran Umum';
  if (isMadrasah) {
    konteksKurikulum = 'madrasah_kemenag';
    konteksLabel = 'Konteks Madrasah / Kemenag (KMA)';
  } else if (isKepercayaan) {
    konteksKurikulum = 'kepercayaan';
    konteksLabel = 'Pendidikan Kepercayaan (Terpisah dari Agama)';
  } else if (isAgama) {
    konteksKurikulum = 'agama_budi_pekerti';
    konteksLabel = 'Pendidikan Agama & Budi Pekerti';
  } else if (isKonsentrasiSMK) {
    konteksKurikulum = 'konsentrasi_keahlian_smk';
    konteksLabel = 'Konsentrasi Keahlian SMK';
  } else if (isKejuruanSMK) {
    konteksKurikulum = 'kejuruan_smk';
    konteksLabel = 'Mata Pelajaran Kejuruan SMK';
  }

  return {
    mataPelajaran: clean,
    jenjang,
    konteksKurikulum,
    konteksLabel,
    regulationNomor: isKonsentrasiSMK
      ? 'CP Konsentrasi Keahlian SMK (Sesuai Program Keahlian Sekolah)'
      : preset.nomorDokumen,
    regulationLabel: isKonsentrasiSMK
      ? 'Konsentrasi Keahlian SMK — Gunakan CP Konsentrasi Resmi Sekolah'
      : preset.label,
    regulationUrl: preset.urlReferensi,
    isMadrasah,
    isKepercayaan,
    isAgama,
    isKejuruanSMK,
    isKonsentrasiSMK,
  };
}

export function detectKategoriFromFase(fase: JenjangFase, mataPelajaran?: string): JenjangKategori {
  return resolveNormalizedJenjang(fase, mataPelajaran || '');
}

export interface TopicSuggestion {
  topicId?: string;
  topik: string;
  elemen?: string;
  arahanRangkuman: string;
  tujuanPembelajaran: string;
  kompetensiInti?: string;
  prasyarat?: string[];
  prasyaratTopicIds?: string[];
  progressionStage?: CurriculumTopicEntry['progressionStage'];
  spiralRelation?: CurriculumTopicEntry['spiralRelation'];
  buktiKetercapaian?: string[];
  estimasiMenitSesi?: number;
  sumberDokumen?: string;
  statusVerifikasiSumber?: TopicSourceVerificationStatus;
  jenisKonten?: CurriculumTopicEntry['jenisKonten'];
  urlReferensi?: string;
  subTP?: {
    kodeSuffix: string;
    kompetensi: string;
    fokusMateri: string;
    buktiKetercapaian: string;
    estimasiMenit?: number;
  }[];
}

/**
 * Menghasilkan daftar rekomendasi topik, arahan rangkuman, elemen CP, dan TP
 * berdasarkan Mata Pelajaran, Jenjang Fase, Kelas, dan (opsional) Semester.
 */
export function getSuggestedTopics(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string,
  semester?: string
): TopicSuggestion[] {
  return getRichCurriculumTopics(mataPelajaran, jenjangFase, kelas, semester);
}

export interface SemesterCurriculumPlan {
  capaianPembelajaran: string;
  referensiCatatan: string;
  referensiCP?: CustomTPItem['referensiCP'];
  tpList: CustomTPItem[];
  coverageStatus?: TopicSourceVerificationStatus;
  statusSumberDokumen?: TopicDocumentSourceStatus;
  statusReviewPedagogis?: TopicPedagogicalReviewStatus;
  konteksKurikulum?: CurriculumContextKind;
  isEmptyState?: boolean;
  emptyStateMessage?: string;
  emptyStateActions?: Array<'tempel_cp' | 'pilih_referensi_cp' | 'susun_manual' | 'usulan_ai'>;
  hasVerifiedOfficialCP?: boolean;
  isSyntheticSummary?: boolean;
  sumberDokumen?: string;
  progressionTopics?: CurriculumTopicEntry[];
}

export interface SemesterPlanContext {
  schoolId?: string;
  tahunAjaran?: string;
  jenjang?: TopicJenjangCategory;
  savedCPEntries?: SavedCPEntry[];
  phaseATPPlan?: PhaseATPPlan | null;
  availablePhaseTPs?: CustomTPItem[];
}

export function buildCustomTPFromTopicEntry(
  item: CurriculumTopicEntry,
  params: {
    mataPelajaran: string;
    jenjangFase: JenjangFase;
    jenjangCategory: JenjangKategori;
    cleanKelas: string;
    semester: '1 (Ganjil)' | '2 (Genap)';
    nomorTP: number;
    mingguMulai: number;
    mingguSelesai: number;
    alokasiJP: number;
    schoolId?: string;
    tahunAjaran?: string;
    savedCPEntries?: SavedCPEntry[];
  }
): CustomTPItem {
  const {
    mataPelajaran,
    jenjangFase,
    jenjangCategory,
    cleanKelas,
    semester,
    nomorTP,
    mingguMulai,
    mingguSelesai,
    alokasiJP,
    schoolId,
    tahunAjaran,
    savedCPEntries,
  } = params;

  const kode = `${cleanKelas}.${nomorTP}`;
  const matchingSavedCP = (savedCPEntries || []).find(
    (cp) => cp.elemenCP.toLowerCase().trim() === item.elemen.toLowerCase().trim()
  ) || savedCPEntries?.[0];

  const baseRefCP = resolveCPReferenceMetadata(mataPelajaran, jenjangFase, item.elemen, jenjangCategory);
  const refCP: CustomTPItem['referensiCP'] = matchingSavedCP
    ? {
        ...baseRefCP,
        sumber: matchingSavedCP.namaDokumenSumber || baseRefCP.sumber,
        elemenCP: matchingSavedCP.elemenCP || item.elemen,
        teksCP: matchingSavedCP.teksCP,
        asalCP: matchingSavedCP.asalCP,
        namaDokumenSumber: matchingSavedCP.namaDokumenSumber,
        nomorDokumen: matchingSavedCP.nomorDokumen,
        tahunVersiDokumen: matchingSavedCP.tahunVersiDokumen,
        urlReferensi: matchingSavedCP.urlReferensi || item.urlReferensi,
        statusVerifikasi: matchingSavedCP.statusVerifikasi,
        terverifikasiResmi: matchingSavedCP.terverifikasiResmi,
        cpEntryId: matchingSavedCP.id,
        catatan: matchingSavedCP.catatan || baseRefCP.catatan,
      }
    : {
        ...baseRefCP,
        namaDokumenSumber: baseRefCP.namaDokumenSumber || item.sumberDokumen,
        urlReferensi: item.urlReferensi || baseRefCP.urlReferensi,
      };

  const immutableTpId = createImmutableDefaultTPId({
    schoolId,
    tahunAjaran,
    jenjangFase,
    kelas: cleanKelas,
    semester,
    mataPelajaran,
    topicKey: `${item.topik}::${nomorTP}`,
  });

  return {
    id: immutableTpId,
    kode,
    elemen: item.elemen,
    materiPokok: item.topik,
    tujuanPembelajaran: item.tujuanPembelajaran,
    arahanRangkuman: item.arahanRangkuman,
    alokasiJP,
    mingguMulai,
    mingguSelesai,
    kompetensiInti: item.kompetensiInti,
    lingkupMateri: item.lingkupMateri || item.topik,
    prasyarat: item.prasyarat,
    buktiKetercapaian: item.buktiKetercapaian,
    estimasiMenitSesi: item.estimasiMenitSesi,
    statusReview: 'draft',
    referensiCP: refCP,
    subTP: item.subTP.map((sub) => ({
      id: `${immutableTpId}__sub_${sub.kodeSuffix.toLowerCase()}`,
      kode: `${kode}.${sub.kodeSuffix}`,
      kompetensi: sub.kompetensi,
      fokusMateri: sub.fokusMateri,
      buktiKetercapaian: sub.buktiKetercapaian,
      estimasiMenit: sub.estimasiMenit,
    })),
    sourceTopicId: item.topicId,
    progressionStage: item.progressionStage,
    topicJenisKonten: item.jenisKonten,
    topicStatusVerifikasi: item.statusVerifikasiSumber,
    spiralRelation: item.spiralRelation,
  };
}

export function getSemesterCurriculumPlan(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string,
  semester: string = '1 (Ganjil)',
  context?: SemesterPlanContext
): SemesterCurriculumPlan {
  const isSem2 = semester.startsWith('2') || semester.toLowerCase().includes('genap');
  const normSemester: '1 (Ganjil)' | '2 (Genap)' = isSem2 ? '2 (Genap)' : '1 (Ganjil)';
  const cleanKelas = kelas.replace(/[^0-9]/g, '') || '8';
  const jenjangCategory = detectKategoriFromFase(jenjangFase, mataPelajaran);

  // 1. Jika Phase ATP sudah dipetakan untuk semester & kelas target, hormati pemetaan ATP tersebut
  if (context?.phaseATPPlan && Array.isArray(context.availablePhaseTPs) && context.availablePhaseTPs.length > 0) {
    const semCodeTarget = isSem2 ? '2' : '1';
    const tpById = new Map(context.availablePhaseTPs.map((t) => [t.id, t]));
    const allocMap = new Map<string, ATPAllocationMapping>();
    for (const a of context.phaseATPPlan.allocations) {
      const aSem = a.semester.startsWith('2') ? '2' : '1';
      if (aSem === semCodeTarget && (!a.kelas || a.kelas.replace(/[^0-9]/g, '') === cleanKelas)) {
        allocMap.set(a.tpId, a);
      }
    }
    const atpMappedTPs = context.phaseATPPlan.orderedTpIds
      .filter((id) => allocMap.has(id) && tpById.has(id))
      .map((id) => {
        const tp = tpById.get(id)!;
        const alloc = allocMap.get(id)!;
        return alloc.alokasiJP !== undefined ? { ...tp, alokasiJP: alloc.alokasiJP } : tp;
      });

    if (atpMappedTPs.length > 0) {
      const refFromCP = context.savedCPEntries?.[0];
      return {
        capaianPembelajaran: refFromCP?.teksCP
          ? refFromCP.teksCP
          : `Menggunakan pemetaan ATP Fase (${context.phaseATPPlan.fase}) untuk ${mataPelajaran} Kelas ${cleanKelas} ${normSemester}.`,
        referensiCatatan:
          context.phaseATPPlan.referensiCP?.catatan ||
          'Urutan dan semester TP bersumber dari Alur Tujuan Pembelajaran (ATP) fase yang sedang aktif.',
        referensiCP: context.phaseATPPlan.referensiCP || atpMappedTPs[0]?.referensiCP,
        tpList: atpMappedTPs,
        coverageStatus: atpMappedTPs[0]?.topicStatusVerifikasi || 'kurasi_internal',
        isEmptyState: false,
        hasVerifiedOfficialCP: Boolean(refFromCP?.terverifikasiResmi),
        isSyntheticSummary: false,
        sumberDokumen: context.phaseATPPlan.referensiCP?.namaDokumenSumber,
      };
    }
  }

  // 2. Cari bank topik terkurasi khusus Mapel × Jenjang × Fase × Semester (TANPA cloning Sem 1 → Sem 2)
  const bankResult = lookupCuratedTopicBank(
    mataPelajaran,
    jenjangFase,
    kelas,
    normSemester,
    context?.jenjang ? { jenjang: context.jenjang } : undefined
  );
  const cpCandidates = getAvailableCPReferenceEntries(mataPelajaran, jenjangFase);
  const savedCPPrimary = context?.savedCPEntries?.[0];
  const baseRefCP = resolveCPReferenceMetadata(
    mataPelajaran,
    jenjangFase,
    cpCandidates[0]?.elemenCP || bankResult.topics[0]?.elemen || '',
    jenjangCategory
  );

  if (!bankResult.isAvailable || bankResult.topics.length === 0) {
    const emptyMessage =
      bankResult.emptyStateMessage ||
      'Bank topik terkurasi untuk mata pelajaran dan fase ini belum tersedia.';
    return {
      capaianPembelajaran: savedCPPrimary?.teksCP
        ? savedCPPrimary.teksCP
        : emptyMessage,
      referensiCatatan: savedCPPrimary
        ? `CP tersimpan ditemukan (${savedCPPrimary.namaDokumenSumber}); silakan turunkan topik dan TP dari panel Analisis CP.`
        : baseRefCP.catatan,
      referensiCP: baseRefCP,
      tpList: [],
      coverageStatus: bankResult.coverageStatus,
      statusSumberDokumen: bankResult.statusSumberDokumen,
      statusReviewPedagogis: bankResult.statusReviewPedagogis,
      konteksKurikulum: bankResult.konteksKurikulum,
      isEmptyState: true,
      emptyStateMessage: emptyMessage,
      emptyStateActions: bankResult.emptyStateActions || [
        'tempel_cp',
        'pilih_referensi_cp',
        'susun_manual',
        'usulan_ai',
      ],
      hasVerifiedOfficialCP: Boolean(savedCPPrimary?.terverifikasiResmi),
      isSyntheticSummary: false,
      sumberDokumen: bankResult.sumberDokumen,
      progressionTopics: [],
    };
  }

  // Ambil daftar unik per semester (maksimal 4 topik per rancangan default semester tanpa menduplikasi)
  const uniqueTopics: CurriculumTopicEntry[] = [];
  const seenTopicKey = new Set<string>();
  for (const item of bankResult.topics) {
    const k = item.topik.toLowerCase().trim();
    if (!seenTopicKey.has(k)) {
      seenTopicKey.add(k);
      uniqueTopics.push(item);
    }
    if (uniqueTopics.length >= 4) break;
  }

  const defaultJpCfg = resolveDefaultSubjectJPConfig({
    jenjang: jenjangCategory,
    kelasUtama: cleanKelas,
    mataPelajaranUtama: mataPelajaran,
  });
  const jpPerWeek = Math.max(2, defaultJpCfg.jpPerMinggu);
  const totalCount = Math.max(1, uniqueTopics.length);

  const defaultWeekWindows: Array<[number, number]> =
    totalCount <= 3
      ? [
          [2, 8],
          [9, 15],
          [16, 22],
        ]
      : [
          [2, 7],
          [8, 13],
          [14, 18],
          [19, 23],
        ];

  const rawTPs: CustomTPItem[] = uniqueTopics.map((item, idx) => {
    const nomorTP = isSem2 ? idx + 5 : idx + 1;
    const [mingguMulai, mingguSelesai] = defaultWeekWindows[idx] || [idx * 5 + 2, (idx + 1) * 5 + 1];
    const weekSpanMultiplier = idx === 1 || idx === 2 ? 4 : 3;
    const alokasiJP = jpPerWeek * weekSpanMultiplier;

    return buildCustomTPFromTopicEntry(item, {
      mataPelajaran,
      jenjangFase,
      jenjangCategory,
      cleanKelas,
      semester: normSemester,
      nomorTP,
      mingguMulai,
      mingguSelesai,
      alokasiJP,
      schoolId: context?.schoolId,
      tahunAjaran: context?.tahunAjaran,
      savedCPEntries: context?.savedCPEntries,
    });
  });

  // Hubungkan prasyaratTpIds antartopik yang memang satu semester/daftar saat tersedia
  const tpIdBySourceTopicId = new Map<string, string>(
    rawTPs.filter((t) => t.sourceTopicId).map((t) => [t.sourceTopicId!, t.id])
  );
  const tpList: CustomTPItem[] = rawTPs.map((tp, idx) => {
    const srcTopic = uniqueTopics[idx];
    const resolvedPrereqIds = (srcTopic?.prasyaratTopicIds || [])
      .map((tid) => tpIdBySourceTopicId.get(tid))
      .filter((id): id is string => Boolean(id && id !== tp.id));
    return resolvedPrereqIds.length > 0 ? { ...tp, prasyaratTpIds: resolvedPrereqIds } : tp;
  });

  const faseShort = jenjangFase.split('(')[0].trim();
  const elemenUnik = Array.from(new Set(tpList.map((t) => t.elemen)));
  const firstRef = tpList[0]?.referensiCP || baseRefCP;
  const hasRealCP = Boolean(savedCPPrimary?.teksCP);

  const capaianPembelajaran = hasRealCP
    ? savedCPPrimary!.teksCP
    : `Rujukan kerja (${faseShort}, ${mataPelajaran}, ${normSemester}) mencakup elemen ${elemenUnik.join(
        ', '
      )} berdasarkan ${bankResult.sumberDokumen}. Catatan jujur: naskah CP lengkap SK pemerintah tidak di-hardcode di sini; harap masukkan atau verifikasi teks CP resmi pada panel Kelola Sumber CP.`;

  return {
    capaianPembelajaran,
    referensiCatatan:
      firstRef.catatan ||
      'Pembagian topik semester bersifat progresif dan dapat disesuaikan guru terhadap kalender serta ATP fase satuan pendidikan.',
    referensiCP: firstRef,
    tpList,
    coverageStatus: bankResult.coverageStatus,
    statusSumberDokumen: bankResult.statusSumberDokumen,
    statusReviewPedagogis: bankResult.statusReviewPedagogis,
    konteksKurikulum: bankResult.konteksKurikulum,
    isEmptyState: false,
    hasVerifiedOfficialCP: Boolean(savedCPPrimary?.terverifikasiResmi),
    isSyntheticSummary: !hasRealCP,
    sumberDokumen: bankResult.sumberDokumen,
    progressionTopics: uniqueTopics,
  };
}
