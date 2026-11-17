import type { JenjangFase } from '../types/assessment';

export type TopicProgressionStage =
  | 'pengenalan'
  | 'pengembangan'
  | 'penerapan'
  | 'integrasi'
  | 'pendalaman';

export type TopicSourceKind =
  | 'referensi_resmi'
  | 'contoh_panduan'
  | 'kurasi_sistem'
  | 'usulan_ai'
  | 'input_guru';

export type TopicSourceVerificationStatus =
  | 'terkurasi_dan_terverifikasi'
  | 'berdasarkan_contoh_panduan'
  | 'kurasi_internal'
  | 'input_guru_dibutuhkan'
  | 'belum_tersedia';

export type TopicJenjangCategory = 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK';

export type ExactFaseCode = 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D' | 'Fase E' | 'Fase F';

export interface SubTPBlueprint {
  kodeSuffix: string;
  kompetensi: string;
  fokusMateri: string;
  buktiKetercapaian: string;
  estimasiMenit?: number;
}

export interface SpiralTopicRelation {
  previousTopicId: string;
  previousTopicTitle?: string;
  reactivatedConcept: string;
  newCompetency: string;
  depthDifference: string;
  newContextOrApplication: string;
  pedagogicalReason: string;
}

export interface RichTopicSuggestion {
  topik: string;
  elemen: string;
  arahanRangkuman: string;
  tujuanPembelajaran: string;
  kompetensiInti: string;
  prasyarat: string[];
  buktiKetercapaian: string[];
  estimasiMenitSesi: number;
  subTP: SubTPBlueprint[];
}

export interface CurriculumTopicEntry extends RichTopicSuggestion {
  topicId: string;
  mataPelajaran: string;
  jenjang: TopicJenjangCategory;
  fase: JenjangFase;
  faseCode: ExactFaseCode;
  elemenCP: string;
  judulTopik: string;
  lingkupMateri: string;
  deskripsiTopik: string;
  kompetensiYangDikembangkan: string;
  prasyaratTopicIds?: string[];
  progressionStage: TopicProgressionStage;
  relatedTopicIds?: string[];
  spiralRelation?: SpiralTopicRelation;
  suggestedGrade?: string;
  suggestedSemester?: '1 (Ganjil)' | '2 (Genap)';
  relevansiCP: string;
  sumberDokumen: string;
  tahunVersi: string;
  urlReferensi: string;
  nomorHalamanAtauBagian?: string;
  statusVerifikasiSumber: TopicSourceVerificationStatus;
  jenisKonten: TopicSourceKind;
}

export interface SubjectFaseCoverageEntry {
  key: string;
  mataPelajaran: string;
  jenjang: TopicJenjangCategory;
  faseCode: ExactFaseCode;
  status: TopicSourceVerificationStatus;
  totalTopikSem1: number;
  totalTopikSem2: number;
  sumberUtama: string;
  catatan: string;
}

export interface TopicBankQueryResult {
  mataPelajaran: string;
  jenjang: TopicJenjangCategory;
  fase: JenjangFase;
  faseCode: ExactFaseCode;
  kelas: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  coverageStatus: TopicSourceVerificationStatus;
  sumberDokumen: string;
  urlReferensi: string;
  isAvailable: boolean;
  emptyStateMessage?: string;
  emptyStateActions?: Array<'tempel_cp' | 'pilih_referensi_cp' | 'susun_manual' | 'usulan_ai'>;
  topics: CurriculumTopicEntry[];
  allPhaseTopics: CurriculumTopicEntry[];
}

export type TopicValidationSeverity = 'blocking' | 'warning' | 'info';

export interface TopicValidationIssue {
  id: string;
  severity: TopicValidationSeverity;
  code:
    | 'DUPLICATE_TOPIC_ID'
    | 'DUPLICATE_TITLE_SCOPE'
    | 'SAME_TOPIC_ACROSS_SEMESTERS_NO_PROGRESSION'
    | 'SPIRAL_WITHOUT_COMPETENCY_PROGRESSION'
    | 'COSMETIC_SUFFIX_DUPLICATE'
    | 'MISSING_ELEMEN_CP'
    | 'FASE_MISMATCH'
    | 'MISSING_PREREQUISITE_TOPIC'
    | 'PROGRESSION_JUMP_WARNING';
  topicId?: string;
  mataPelajaran?: string;
  message: string;
}

export interface TopicBankValidationReport {
  isValid: boolean;
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  issues: TopicValidationIssue[];
}

export const PROGRESSION_STAGE_ORDER: Record<TopicProgressionStage, number> = {
  pengenalan: 1,
  pengembangan: 2,
  penerapan: 3,
  integrasi: 4,
  pendalaman: 5,
};

export const PROGRESSION_STAGE_LABELS: Record<TopicProgressionStage, string> = {
  pengenalan: 'Pengenalan',
  pengembangan: 'Pengembangan',
  penerapan: 'Penerapan',
  integrasi: 'Integrasi',
  pendalaman: 'Pendalaman',
};

export const TOPIC_SOURCE_KIND_LABELS: Record<TopicSourceKind, string> = {
  referensi_resmi: 'Referensi Resmi Pemerintah',
  contoh_panduan: 'Contoh / Inspirasi Panduan Mapel',
  kurasi_sistem: 'Kurasi Pedagogis Sistem',
  usulan_ai: 'Usulan AI — perlu ditinjau guru',
  input_guru: 'Dibuat / Disesuaikan Guru',
};

export const TOPIC_VERIFICATION_LABELS: Record<TopicSourceVerificationStatus, string> = {
  terkurasi_dan_terverifikasi: 'Terkurasi & Terverifikasi',
  berdasarkan_contoh_panduan: 'Berdasarkan Contoh Panduan',
  kurasi_internal: 'Kurasi Internal Sistem',
  input_guru_dibutuhkan: 'Perlu Penyesuaian / Input Guru',
  belum_tersedia: 'Belum Tersedia di Bank Topik',
};

export function createDefaultSubTPs(
  topik: string,
  tujuan: string,
  bukti: string[],
  estimasiMenit = 80
): SubTPBlueprint[] {
  const half = Math.max(35, Math.round(estimasiMenit / 2));
  return [
    {
      kodeSuffix: 'A',
      kompetensi: `Mengidentifikasi konsep inti dan informasi penting pada ${topik}`,
      fokusMateri: topik,
      buktiKetercapaian:
        bukti[0] || `Peserta didik mencatat konsep atau data kunci ${topik} dengan benar.`,
      estimasiMenit: half,
    },
    {
      kodeSuffix: 'B',
      kompetensi: tujuan,
      fokusMateri: topik,
      buktiKetercapaian:
        bukti[1] ||
        `Peserta didik menerapkan konsep ${topik} pada tugas terstruktur dan menjelaskan alasannya.`,
      estimasiMenit: half,
    },
  ];
}

export function slugifyTopicKey(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export function faseCodeToDefaultJenjangFase(
  faseCode: ExactFaseCode,
  jenjang?: TopicJenjangCategory
): JenjangFase {
  switch (faseCode) {
    case 'Fase A':
      return 'Fase A (Kelas 1-2 SD)';
    case 'Fase B':
      return 'Fase B (Kelas 3-4 SD)';
    case 'Fase C':
      return 'Fase C (Kelas 5-6 SD)';
    case 'Fase D':
      return 'Fase D (Kelas 7-9 SMP)';
    case 'Fase E':
      return jenjang === 'SMK' ? 'Fase E (Kelas 10 SMA/SMK)' : 'Fase E (Kelas 10 SMA/SMK)';
    case 'Fase F':
      return 'Fase F (Kelas 11-12 SMA/SMK)';
  }
}

export function parseExactFaseCode(jenjangFase: JenjangFase | string, kelas?: string): ExactFaseCode {
  const f = (jenjangFase || '').toLowerCase();
  if (f.includes('fase a')) return 'Fase A';
  if (f.includes('fase b')) return 'Fase B';
  if (f.includes('fase c')) return 'Fase C';
  if (f.includes('fase d')) return 'Fase D';
  if (f.includes('fase e')) return 'Fase E';
  if (f.includes('fase f')) return 'Fase F';

  const k = parseInt((kelas || '').replace(/[^0-9]/g, ''), 10);
  if (k === 1 || k === 2) return 'Fase A';
  if (k === 3 || k === 4) return 'Fase B';
  if (k === 5 || k === 6) return 'Fase C';
  if (k >= 7 && k <= 9) return 'Fase D';
  if (k === 10) return 'Fase E';
  if (k === 11 || k === 12) return 'Fase F';
  if (f.includes('sd')) return 'Fase B';
  if (f.includes('smp')) return 'Fase D';
  return 'Fase E';
}

export function resolveNormalizedJenjang(
  jenjangFase: JenjangFase | string,
  mataPelajaran: string,
  kelas?: string
): TopicJenjangCategory {
  const f = (jenjangFase || '').toLowerCase();
  const m = (mataPelajaran || '').toLowerCase();
  if (
    m.includes('kejuruan') ||
    m.includes('profesi') ||
    m.includes('pkk') ||
    m.includes('kewirausahaan') ||
    m.includes('projek ipas') ||
    m.includes('konsentrasi') ||
    m.includes('(smk)') ||
    /\bsmk\b/.test(m) ||
    /\bsmk\b/.test(f) && !f.includes('sma/smk')
  ) {
    return 'SMK';
  }
  const faseCode = parseExactFaseCode(jenjangFase, kelas);
  if (faseCode === 'Fase A' || faseCode === 'Fase B' || faseCode === 'Fase C') return 'SD/MI';
  if (faseCode === 'Fase D') return 'SMP/MTs';
  if (f.includes('sd')) return 'SD/MI';
  if (f.includes('smp')) return 'SMP/MTs';
  return 'SMA/MA';
}

export interface MakeTopicInput {
  topicId: string;
  mataPelajaran: string;
  jenjang: TopicJenjangCategory;
  faseCode: ExactFaseCode;
  fase?: JenjangFase;
  elemen: string;
  topik: string;
  lingkupMateri?: string;
  deskripsiTopik?: string;
  tujuanPembelajaran: string;
  arahanRangkuman: string;
  kompetensiInti: string;
  prasyarat: string[];
  prasyaratTopicIds?: string[];
  progressionStage: TopicProgressionStage;
  relatedTopicIds?: string[];
  spiralRelation?: SpiralTopicRelation;
  suggestedGrade?: string;
  suggestedSemester: '1 (Ganjil)' | '2 (Genap)';
  relevansiCP?: string;
  buktiKetercapaian: string[];
  estimasiMenitSesi?: number;
  subTP?: SubTPBlueprint[];
  sumberDokumen?: string;
  tahunVersi?: string;
  urlReferensi?: string;
  nomorHalamanAtauBagian?: string;
  statusVerifikasiSumber?: TopicSourceVerificationStatus;
  jenisKonten?: TopicSourceKind;
}

export function makeTopicEntry(input: MakeTopicInput): CurriculumTopicEntry {
  const fase = input.fase || faseCodeToDefaultJenjangFase(input.faseCode, input.jenjang);
  const estimasiMenitSesi = input.estimasiMenitSesi ?? 80;
  return {
    topicId: input.topicId,
    mataPelajaran: input.mataPelajaran,
    jenjang: input.jenjang,
    fase,
    faseCode: input.faseCode,
    elemen: input.elemen,
    elemenCP: input.elemen,
    topik: input.topik,
    judulTopik: input.topik,
    lingkupMateri: input.lingkupMateri || input.topik,
    deskripsiTopik: input.deskripsiTopik || input.tujuanPembelajaran,
    tujuanPembelajaran: input.tujuanPembelajaran,
    arahanRangkuman: input.arahanRangkuman,
    kompetensiInti: input.kompetensiInti,
    kompetensiYangDikembangkan: input.kompetensiInti,
    prasyarat: input.prasyarat,
    prasyaratTopicIds: input.prasyaratTopicIds,
    progressionStage: input.progressionStage,
    relatedTopicIds: input.relatedTopicIds,
    spiralRelation: input.spiralRelation,
    suggestedGrade: input.suggestedGrade,
    suggestedSemester: input.suggestedSemester,
    relevansiCP:
      input.relevansiCP ||
      `Selaras dengan elemen ${input.elemen} pada ${input.faseCode} mata pelajaran ${input.mataPelajaran}.`,
    buktiKetercapaian: input.buktiKetercapaian,
    estimasiMenitSesi,
    subTP:
      input.subTP ||
      createDefaultSubTPs(input.topik, input.tujuanPembelajaran, input.buktiKetercapaian, estimasiMenitSesi),
    sumberDokumen: input.sumberDokumen || 'Kurasi Pedagogis Sistem AsesMerdeka (merujuk SK BSKAP No. 046/H/KR/2025)',
    tahunVersi: input.tahunVersi || '2025/2026',
    urlReferensi: input.urlReferensi || 'https://kurikulum.kemendikdasmen.go.id/',
    nomorHalamanAtauBagian: input.nomorHalamanAtauBagian,
    statusVerifikasiSumber: input.statusVerifikasiSumber || 'kurasi_internal',
    jenisKonten: input.jenisKonten || 'kurasi_sistem',
  };
}
