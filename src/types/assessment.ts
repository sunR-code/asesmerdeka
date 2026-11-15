import type { RangkumanDokumen } from './summary';

export type JenjangFase = 
  | 'Fase A (Kelas 1-2 SD)'
  | 'Fase B (Kelas 3-4 SD)'
  | 'Fase C (Kelas 5-6 SD)'
  | 'Fase D (Kelas 7-9 SMP)'
  | 'Fase E (Kelas 10 SMA/SMK)'
  | 'Fase F (Kelas 11-12 SMA/SMK)';

export type TipeAsesmen = 
  | 'Formatif (Diagnostik Awal)'
  | 'Formatif (Proses Pembelajaran)'
  | 'Sumatif (Tengah Semester / STS)'
  | 'Sumatif (Akhir Semester / SAS)'
  | 'Sumatif (Akhir Fase / Ujian Sekolah)';

export type LevelKognitif = 'LOTS (C1-C2)' | 'MOTS (C3)' | 'HOTS (C4-C6)' | 'Campuran Berimbang';

export type TipeSoal = 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'uraian';

export type BloomLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

export type CognitiveTier = 'LOTS' | 'MOTS' | 'HOTS';

export type DifficultyLevel = 'Mudah' | 'Sedang' | 'Sulit';

export type GenerationSource =
  | 'ai_generated'
  | 'curated_bank'
  | 'adaptive_fallback'
  | 'manual'
  | 'sample_demo';

export interface QuestionTraceabilityFields {
  tpId?: string;
  tpKode?: string;
  subTpId?: string;
  subTpDeskripsi?: string;
  bloomLevel?: BloomLevel;
  cognitiveTier?: CognitiveTier;
  cognitiveRationale?: string;
  needsCognitiveReview?: boolean;
  cognitiveMismatchReason?: string;
  teacherVerifiedCognitive?: boolean;
  difficultyLevel?: DifficultyLevel;
  sourceRef?: string;
  sourceType?: GenerationSource;
  isSimulated?: boolean;
}

export interface RubrikKriteriaUraian {
  kriteria: string;
  bobot: number;
  indikator?: string;
}

export interface SoalPilihanGanda extends QuestionTraceabilityFields {
  id: string;
  nomor: number;
  tipe: 'pilihan_ganda';
  stimulus?: string; // Teks bacaan, data, skenario konteks nyata
  pertanyaan: string;
  pilihan: {
    label: 'A' | 'B' | 'C' | 'D' | 'E';
    teks: string;
  }[];
  kunci: 'A' | 'B' | 'C' | 'D' | 'E';
  pembahasan: string;
  levelKognitif: string; // misal: C4 (Menganalisis)
  indikatorSoal: string;
  skor: number;
}

export interface SoalPilihanGandaKompleks extends QuestionTraceabilityFields {
  id: string;
  nomor: number;
  tipe: 'pilihan_ganda_kompleks';
  stimulus?: string;
  pertanyaan: string;
  pernyataan: {
    id: string;
    teks: string;
    isBenar: boolean;
  }[];
  pembahasan: string;
  levelKognitif: string;
  indikatorSoal: string;
  skor: number;
}

export interface SoalUraian extends QuestionTraceabilityFields {
  id: string;
  nomor: number;
  tipe: 'uraian';
  stimulus?: string;
  pertanyaan: string;
  pedomanPenskoran: string;
  rubrikPenskoran?: RubrikKriteriaUraian[];
  contohJawaban: string;
  levelKognitif: string;
  indikatorSoal: string;
  skorMaksimal: number;
}

export type ButirSoal = SoalPilihanGanda | SoalPilihanGandaKompleks | SoalUraian;

export interface QuestionValidationIssue {
  questionId: string;
  nomor: number;
  severity: 'error' | 'warning';
  code:
    | 'empty_question'
    | 'invalid_key'
    | 'missing_explanation'
    | 'duplicate_option'
    | 'weak_distractor'
    | 'duplicate_question'
    | 'explanation_key_mismatch'
    | 'cognitive_mismatch'
    | 'missing_tp_alignment'
    | 'generic_slop'
    | 'missing_rubric';
  message: string;
}

export interface AssessmentQualitySummary {
  status: 'valid' | 'needs_review' | 'invalid';
  score: number;
  totalIssues: number;
  duplicateCount: number;
  keyMismatchCount: number;
  missingExplanationCount: number;
  cognitiveMismatchCount: number;
  unmappedTpCount: number;
  distribution: {
    LOTS: number;
    MOTS: number;
    HOTS: number;
  };
  tpCoverageMap: Record<string, number>;
  issues: QuestionValidationIssue[];
  warnings: string[];
  canFinalize: boolean;
}

export interface KriteriaRubrik {
  tujuanPembelajaran: string;
  buktiKetercapaian: string;
  perluBimbingan: string;  // 0 - 60
  cukup: string;            // 61 - 70
  baik: string;             // 71 - 85
  sangatBaik: string;       // 86 - 100
}

export interface TPTraceabilityItem {
  id: string;
  kode: string;
  materiPokok: string;
  deskripsi: string;
  subTP?: { id: string; kode: string; deskripsi: string }[];
}

export interface AsesmenDokumen {
  id: string;
  createdAt: string;
  judul: string;
  mataPelajaran: string;
  jenjangFase: JenjangFase;
  kelas: string;
  rombel?: string;
  semester?: string;
  schoolId?: string;
  tipeAsesmen: TipeAsesmen;
  alokasiWaktu: string;
  tahunAjaran: string;
  namaSekolah: string;
  namaPenyusun: string;

  // Relasi Kurikulum Merdeka & Immutable TP/Sub-TP
  capaianPembelajaran: string;
  tujuanPembelajaran: string[];
  tpIds?: string[];
  subTpIds?: string[];
  tpMap?: TPTraceabilityItem[];
  materiPokok: string;
  profilPelajarPancasila: string[];

  // Provenance, Validasi & Kejujuran Sumber
  generationSource?: GenerationSource;
  usedFallback?: boolean;
  fallbackReason?: string;
  isSimulated?: boolean;
  difficultyLevel?: DifficultyLevel;
  sourceRef?: string;
  sertakanRubrik?: boolean;
  qualitySummary?: AssessmentQualitySummary;

  // Konten Soal & Rubrik
  petunjukUmum: string[];
  soalList: ButirSoal[];
  rubrikKKTP: KriteriaRubrik[];

  // Security / Anti-Piracy watermark
  licenseId?: string;
  authorEmail?: string;
  watermarkText?: string;
}

export interface GenerationRequest {
  mataPelajaran: string;
  jenjangFase: JenjangFase;
  kelas: string;
  rombel?: string;
  semester?: string;
  tahunAjaran?: string;
  schoolId?: string;
  tipeAsesmen: TipeAsesmen;
  materiPokok: string;
  tujuanPembelajaranInput: string;
  tpId?: string;
  tpKode?: string;
  tpListContext?: TPTraceabilityItem[];
  subTpIds?: string[];
  jumlahPG: number;
  jumlahPGK: number;
  jumlahUraian: number;
  levelKognitif: LevelKognitif;
  difficultyLevel?: DifficultyLevel;
  sertakanRubrik: boolean;
  alokasiWaktu: string;
  namaSekolah?: string;
  namaGuru?: string;
  geminiApiKey?: string;
  sourceRangkuman?: RangkumanDokumen;
  allowOfflineFallback?: boolean;
}

export type LicenseTier = 'free' | 'guru' | 'sekolah' | 'pro' | 'sekolah_pro';

export type QuotaLifecycleState =
  | 'pending_payment'
  | 'paid'
  | 'active'
  | 'expired'
  | 'revoked'
  | 'suspended'
  | 'payment_failed';

export interface UserQuota {
  tier: LicenseTier;
  remainingCredits: number;
  maxCredits: number;
  deviceId: string;
  licenseKey?: string;
  lastResetDate?: string;
  lifecycleState?: QuotaLifecycleState;
  expiresAt?: string | null;
  teacherSeatKey?: string;
}
