import type {
  BobotNilaiKebijakan,
  BuktiAsesmenSubTP,
  JenisBuktiAsesmen,
  JenisIntervensiRemedial,
  KelasHarianData,
  NilaiSiswaItem,
  RemedialAuditAction,
  RemedialAuditEvent,
  RiwayatRemedialItem,
  StatusKetercapaianBukti,
  StatusTindakLanjutRemedial,
  SumberBuktiAsesmen,
} from '../types/kelasHarian';
import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import {
  analyzeStudentTPMastery,
  classifyMasteryStatusKKTP,
  createBuktiAsesmenEntry,
  createRemedialHistoryEntry,
  normalizeEvidenceScoreToScale100,
  recordRemedialAttemptOnStudent,
  resolveEffectiveKKTPThreshold,
  type MasteryEvidenceItemView,
  type StudentSubTPMasteryResult,
  type StudentTPMasteryResult,
} from './learningMasteryEngine';
import {
  buildKelasHarianStorageKeyV2,
  hashIdentifier32,
  resolveAcademicContext,
} from './storageIdentity';

export const STATUS_REMEDIAL_META: Record<
  StatusTindakLanjutRemedial,
  { label: string; badgeBg: string; badgeFg: string; badgeBorder: string }
> = {
  perlu_tindak_lanjut: {
    label: 'Perlu Tindak Lanjut',
    badgeBg: '#fef2f2',
    badgeFg: '#b91c1c',
    badgeBorder: '#fecaca',
  },
  direncanakan: {
    label: 'Direncanakan',
    badgeBg: '#eff6ff',
    badgeFg: '#1d4ed8',
    badgeBorder: '#bfdbfe',
  },
  berlangsung: {
    label: 'Sedang Berlangsung',
    badgeBg: '#fffbeb',
    badgeFg: '#b45309',
    badgeBorder: '#fde68a',
  },
  selesai_perlu_reassessment: {
    label: 'Menunggu Reassessment',
    badgeBg: '#f5f3ff',
    badgeFg: '#6d28d9',
    badgeBorder: '#ddd6fe',
  },
  selesai: {
    label: 'Selesai',
    badgeBg: '#f0fdf4',
    badgeFg: '#15803d',
    badgeBorder: '#bbf7d0',
  },
  tuntas_setelah_remedial: {
    label: 'Selesai · Tuntas setelah Reassessment',
    badgeBg: '#dcfce7',
    badgeFg: '#15803d',
    badgeBorder: '#86efac',
  },
  belum_tuntas: {
    label: 'Selesai · Belum Tuntas',
    badgeBg: '#fff7ed',
    badgeFg: '#c2410c',
    badgeBorder: '#fed7aa',
  },
};

export const JENIS_INTERVENSI_LABELS: Record<JenisIntervensiRemedial, string> = {
  bimbingan_individu: 'Bimbingan Individu',
  kelompok_kecil: 'Bimbingan Kelompok Kecil',
  pengulangan_klasikal: 'Pengulangan / Penguatan Klasikal',
  penugasan_terbimbing: 'Penugasan Terbimbing',
  pendekatan_ulang: 'Pendekatan & Strategi Belajar Ulang',
};

export const REMEDIAL_STATUS_SELECT_OPTIONS: {
  value: StatusTindakLanjutRemedial;
  label: string;
}[] = [
  { value: 'perlu_tindak_lanjut', label: 'Perlu Tindak Lanjut' },
  { value: 'direncanakan', label: 'Direncanakan' },
  { value: 'berlangsung', label: 'Sedang Berlangsung' },
  { value: 'selesai_perlu_reassessment', label: 'Selesai Kegiatan · Menunggu Reassessment' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'tuntas_setelah_remedial', label: 'Tuntas setelah Reassessment' },
  { value: 'belum_tuntas', label: 'Belum Tuntas setelah Reassessment' },
];

export interface RemedialScopeIdentity {
  schoolId: string;
  classId: string;
  semesterId: 'sem1' | 'sem2';
  tahunAjaran: string;
  rombel: string;
  mataPelajaran: string;
}

export type RemedialVisualCategory =
  | 'belum_ada_bukti'
  | 'tuntas_awal'
  | 'perlu_remedial'
  | 'direncanakan_remedial'
  | 'sedang_remedial'
  | 'menunggu_reassessment'
  | 'sudah_reassessment_tuntas'
  | 'sudah_reassessment_belum_tuntas'
  | 'selesai_tanpa_reassessment';

export interface ReassessmentSummaryView {
  hasReassessment: boolean;
  evidences: MasteryEvidenceItemView[];
  latestEvidence: MasteryEvidenceItemView | null;
  latestScore100: number | null;
  latestStatus: StatusKetercapaianBukti | null;
  improvedFromInitial: boolean;
  label: string;
  note: string;
}

export interface StudentTPRemedialEvaluation {
  siswaId: string;
  namaSiswa: string;
  nis: string;
  tpId: string;
  tpKode: string;
  materiPokok: string;
  thresholdKKTP: number;
  eligibleForRemedial: boolean;
  hasInitialEvidence: boolean;
  isUnassessed: boolean;
  visualCategory: RemedialVisualCategory;
  alasanKetidaktercapaian: string[];
  unachievedSubTps: StudentSubTPMasteryResult[];
  catatanMiskonsepsiGuru: string[];
  initialAssessment: {
    formatifScore: number | null;
    normalizedEvidenceAvg100: number | null;
    effectiveScore100: number | null;
    status: StatusKetercapaianBukti;
    alasanStatus: string;
    evidences: MasteryEvidenceItemView[];
    primaryEvidenceId?: string;
    masteryResult: StudentTPMasteryResult;
  };
  remedialRecords: RiwayatRemedialItem[];
  latestRemedial: RiwayatRemedialItem | null;
  reassessment: ReassessmentSummaryView;
  effectiveDisplayStatusLabel: string;
  isFinalReportLocked: boolean;
}

export interface ClassRemedialOverview {
  scope: RemedialScopeIdentity;
  activeClassKKTP: number;
  targets: StudentTPRemedialEvaluation[];
  unassessedEntries: StudentTPRemedialEvaluation[];
  allEvaluations: StudentTPRemedialEvaluation[];
  counts: {
    totalTargets: number;
    perluTindakLanjut: number;
    direncanakan: number;
    sedangBerlangsung: number;
    menungguReassessment: number;
    sudahReassessmentTuntas: number;
    sudahReassessmentBelumTuntas: number;
    belumAdaBuktiEntries: number;
    belumAdaBuktiUniqueStudents: number;
    lockedFinalTargets: number;
  };
}

export function buildRemedialScopeIdentity(
  profile?: SchoolProfile | null
): RemedialScopeIdentity {
  const ctx = resolveAcademicContext(profile);
  return {
    schoolId: ctx.schoolId,
    classId: buildKelasHarianStorageKeyV2(profile),
    semesterId: ctx.semesterCode,
    tahunAjaran: ctx.tahunAjaran,
    rombel: ctx.rombel,
    mataPelajaran: ctx.mataPelajaran,
  };
}

export function doesRemedialRecordMatchScope(
  record: Pick<RiwayatRemedialItem, 'schoolId' | 'classId' | 'semesterId'>,
  scope: RemedialScopeIdentity
): boolean {
  if (record.schoolId && record.schoolId !== scope.schoolId) return false;
  if (record.classId && record.classId !== scope.classId) return false;
  if (record.semesterId && record.semesterId !== scope.semesterId) return false;
  return true;
}

export function doesEvidenceMatchScope(
  ev: Pick<BuktiAsesmenSubTP, 'schoolId' | 'classId' | 'semesterId'>,
  scope: RemedialScopeIdentity
): boolean {
  if (ev.schoolId && ev.schoolId !== scope.schoolId) return false;
  if (ev.classId && ev.classId !== scope.classId) return false;
  if (ev.semesterId && ev.semesterId !== scope.semesterId) return false;
  return true;
}

function doesRecordMatchTP(
  tpIdVal: string | undefined,
  tpKodeVal: string | undefined,
  tp: CustomTPItem
): boolean {
  if (tpIdVal && tp.id && tpIdVal === tp.id) return true;
  if (tpIdVal && tp.legacyTpId && tpIdVal === tp.legacyTpId) return true;
  if (tpKodeVal && tp.kode && tpKodeVal.trim().toLowerCase() === tp.kode.trim().toLowerCase()) {
    return true;
  }
  return false;
}

function getRemedialTimestamp(item: RiwayatRemedialItem): string {
  return item.updatedAt || item.createdAt || item.tanggalIntervensi || '';
}

function getEvidenceTimestamp(ev: BuktiAsesmenSubTP): string {
  return ev.updatedAt || ev.createdAt || ev.tanggal || '';
}

function buildFactualReasons(
  mastery: StudentTPMasteryResult,
  unachievedSubTps: StudentSubTPMasteryResult[]
): string[] {
  const reasons: string[] = [];
  const { formatifScore, normalizedEvidenceAvg100, thresholdKKTP, status } = mastery;

  if (formatifScore !== null && formatifScore < thresholdKKTP) {
    reasons.push(
      `Nilai formatif awal (${formatifScore}) berada di bawah KKTP aktif (${thresholdKKTP}).`
    );
  }

  if (normalizedEvidenceAvg100 !== null && normalizedEvidenceAvg100 < thresholdKKTP) {
    reasons.push(
      `Rata-rata bukti penilaian awal (${normalizedEvidenceAvg100}/100) berada di bawah KKTP (${thresholdKKTP}).`
    );
  } else if (
    formatifScore === null &&
    normalizedEvidenceAvg100 === null &&
    status === 'Perlu Bimbingan'
  ) {
    reasons.push('Bukti observasi awal guru menandai status Perlu Bimbingan.');
  }

  if (unachievedSubTps.length > 0) {
    const subLabels = unachievedSubTps
      .map((s) =>
        s.averageScore100 !== null ? `${s.subTpKode} (${s.averageScore100})` : s.subTpKode
      )
      .join(', ');
    reasons.push(`Sub-TP dengan bukti belum mencapai KKTP: ${subLabels}.`);
  }

  for (const note of mastery.catatanMiskonsepsiGuru) {
    reasons.push(`Miskonsepsi tercatat: ${note}`);
  }

  return reasons;
}

function deriveVisualCategoryAndLabel(params: {
  isUnassessed: boolean;
  eligibleForRemedial: boolean;
  latestRemedial: RiwayatRemedialItem | null;
  latestReassessment: MasteryEvidenceItemView | null;
}): {
  visualCategory: RemedialVisualCategory;
  effectiveDisplayStatusLabel: string;
} {
  const { isUnassessed, eligibleForRemedial, latestRemedial, latestReassessment } = params;

  if (latestReassessment) {
    if (latestReassessment.status === 'Tercapai') {
      return {
        visualCategory: 'sudah_reassessment_tuntas',
        effectiveDisplayStatusLabel: 'Sudah Reassessment · Mencapai KKTP (Terpisah dari Nilai Awal)',
      };
    }
    if (latestReassessment.status === 'Perlu Bimbingan') {
      return {
        visualCategory: 'sudah_reassessment_belum_tuntas',
        effectiveDisplayStatusLabel: 'Sudah Reassessment · Belum Mencapai KKTP',
      };
    }
  }

  if (latestRemedial) {
    switch (latestRemedial.statusTindakLanjut) {
      case 'tuntas_setelah_remedial':
        return {
          visualCategory: 'sudah_reassessment_tuntas',
          effectiveDisplayStatusLabel: STATUS_REMEDIAL_META.tuntas_setelah_remedial.label,
        };
      case 'belum_tuntas':
        return {
          visualCategory: 'sudah_reassessment_belum_tuntas',
          effectiveDisplayStatusLabel: STATUS_REMEDIAL_META.belum_tuntas.label,
        };
      case 'selesai_perlu_reassessment':
        return {
          visualCategory: 'menunggu_reassessment',
          effectiveDisplayStatusLabel: STATUS_REMEDIAL_META.selesai_perlu_reassessment.label,
        };
      case 'berlangsung':
        return {
          visualCategory: 'sedang_remedial',
          effectiveDisplayStatusLabel: STATUS_REMEDIAL_META.berlangsung.label,
        };
      case 'direncanakan':
        return {
          visualCategory: 'direncanakan_remedial',
          effectiveDisplayStatusLabel: STATUS_REMEDIAL_META.direncanakan.label,
        };
      case 'selesai':
        return {
          visualCategory: 'selesai_tanpa_reassessment',
          effectiveDisplayStatusLabel: STATUS_REMEDIAL_META.selesai.label,
        };
      case 'perlu_tindak_lanjut':
      default:
        return {
          visualCategory: 'perlu_remedial',
          effectiveDisplayStatusLabel: STATUS_REMEDIAL_META.perlu_tindak_lanjut.label,
        };
    }
  }

  if (eligibleForRemedial) {
    return {
      visualCategory: 'perlu_remedial',
      effectiveDisplayStatusLabel: 'Belum Ditindaklanjuti (Perlu Remedial)',
    };
  }

  if (isUnassessed) {
    return {
      visualCategory: 'belum_ada_bukti',
      effectiveDisplayStatusLabel: 'Belum Ada Bukti Penilaian',
    };
  }

  return {
    visualCategory: 'tuntas_awal',
    effectiveDisplayStatusLabel: 'Tercapai KKTP Awal',
  };
}

/**
 * Evaluasi deterministik kelayakan remedial & ketercapaian terbaru satu siswa pada satu TP
 * tanpa pernah mengubah atau menimpa bukti penilaian awal maupun skor rapor.
 */
export function evaluateStudentTPRemedialTarget(params: {
  siswaNilai: NilaiSiswaItem;
  tp: CustomTPItem;
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null;
  schoolProfile?: SchoolProfile | null;
  scope?: RemedialScopeIdentity;
}): StudentTPRemedialEvaluation {
  const { siswaNilai, tp, bobotPolicy, schoolProfile } = params;
  const scope = params.scope || buildRemedialScopeIdentity(schoolProfile);

  const scopedEvidences = (siswaNilai.buktiAsesmenSubTP || []).filter((ev) =>
    doesEvidenceMatchScope(ev, scope)
  );
  const scopedStudent: NilaiSiswaItem = {
    ...siswaNilai,
    buktiAsesmenSubTP: scopedEvidences,
  };

  const mastery = analyzeStudentTPMastery(scopedStudent, tp, {
    bobotPolicy,
    schoolProfile,
  });

  const initialEvidenceViews = mastery.initialEvidences || [];
  const reassessmentViewsAll = mastery.reassessmentEvidences || [];
  const unachievedSubTps = mastery.subTpResults.filter(
    (sub) => sub.status === 'Perlu Bimbingan'
  );

  // Bukti ada bila ada nilai formatif numerik (termasuk 0!) ATAU minimal 1 bukti awal valid
  const hasNumericFormatif = mastery.formatifScore !== null;
  const hasInitialObsEvidence = initialEvidenceViews.some(
    (v) => v.normalizedScore100 !== null || v.status !== 'Belum Dinilai'
  );
  const hasInitialEvidence = hasNumericFormatif || hasInitialObsEvidence;
  const isUnassessed =
    !hasInitialEvidence &&
    mastery.status === 'Belum Dinilai' &&
    unachievedSubTps.length === 0;

  // JANGAN menetapkan siswa belum tuntas bila memang belum ada bukti penilaian!
  const eligibleForRemedial =
    !isUnassessed && (mastery.status === 'Perlu Bimbingan' || unachievedSubTps.length > 0);

  const remedialRecords = (siswaNilai.riwayatRemedial || [])
    .filter((r) => doesRemedialRecordMatchScope(r, scope) && doesRecordMatchTP(r.tpId, r.tpKode, tp))
    .slice()
    .sort((a, b) => getRemedialTimestamp(a).localeCompare(getRemedialTimestamp(b)));

  const latestRemedial =
    remedialRecords.length > 0 ? remedialRecords[remedialRecords.length - 1] : null;

  const sortedReassessments = reassessmentViewsAll
    .slice()
    .sort((a, b) =>
      getEvidenceTimestamp(a.evidence).localeCompare(getEvidenceTimestamp(b.evidence))
    );
  const latestReassessView =
    sortedReassessments.length > 0 ? sortedReassessments[sortedReassessments.length - 1] : null;

  const latestReassessScore100 = latestReassessView?.normalizedScore100 ?? null;
  const initialRefScore = mastery.effectiveScore100;
  const improvedFromInitial =
    latestReassessScore100 !== null &&
    initialRefScore !== null &&
    latestReassessScore100 > initialRefScore;

  const reassessment: ReassessmentSummaryView = {
    hasReassessment: sortedReassessments.length > 0,
    evidences: sortedReassessments,
    latestEvidence: latestReassessView,
    latestScore100: latestReassessScore100,
    latestStatus: latestReassessView?.status || null,
    improvedFromInitial,
    label: !latestReassessView
      ? 'Belum ada reassessment'
      : latestReassessView.status === 'Tercapai'
      ? `Tercapai pada Reassessment${latestReassessScore100 !== null ? ` (${latestReassessScore100})` : ''}`
      : latestReassessView.status === 'Perlu Bimbingan'
      ? `Belum Tuntas pada Reassessment${latestReassessScore100 !== null ? ` (${latestReassessScore100})` : ''}`
      : 'Observasi Reassessment Tercatat',
    note: latestReassessView
      ? 'Bukti reassessment disimpan terpisah dan tidak menimpa nilai/bukti awal maupun e-Rapor final.'
      : 'Menunggu pencatatan reassessment sebagai bukti penilaian baru.',
  };

  const alasanKetidaktercapaian = eligibleForRemedial
    ? buildFactualReasons(mastery, unachievedSubTps)
    : [];

  const { visualCategory, effectiveDisplayStatusLabel } = deriveVisualCategoryAndLabel({
    isUnassessed,
    eligibleForRemedial,
    latestRemedial,
    latestReassessment: latestReassessView,
  });

  const primaryInitialEvidenceId = initialEvidenceViews[0]?.evidence.id;

  return {
    siswaId: siswaNilai.siswaId,
    namaSiswa: siswaNilai.nama,
    nis: siswaNilai.nis,
    tpId: tp.id || tp.kode,
    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    thresholdKKTP: mastery.thresholdKKTP,
    eligibleForRemedial,
    hasInitialEvidence,
    isUnassessed,
    visualCategory,
    alasanKetidaktercapaian,
    unachievedSubTps,
    catatanMiskonsepsiGuru: mastery.catatanMiskonsepsiGuru,
    initialAssessment: {
      formatifScore: mastery.formatifScore,
      normalizedEvidenceAvg100: mastery.normalizedEvidenceAvg100,
      effectiveScore100: mastery.effectiveScore100,
      status: mastery.status,
      alasanStatus: mastery.alasanStatus,
      evidences: initialEvidenceViews,
      primaryEvidenceId: primaryInitialEvidenceId,
      masteryResult: mastery,
    },
    remedialRecords,
    latestRemedial,
    reassessment,
    effectiveDisplayStatusLabel,
    isFinalReportLocked: siswaNilai.statusRapor === 'final',
  };
}

/**
 * Menghitung daftar sasaran remedial sekelas tanpa mencampur siswa non-aktif/arsip
 * dan tanpa menandai siswa yang belum dinilai sebagai belum tuntas.
 */
export function evaluateClassRemedialOverview(params: {
  kelasHarian: KelasHarianData;
  tpList: CustomTPItem[];
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null;
  schoolProfile?: SchoolProfile | null;
  tpFilterId?: string;
}): ClassRemedialOverview {
  const { kelasHarian, tpList, bobotPolicy, schoolProfile, tpFilterId } = params;
  const scope = buildRemedialScopeIdentity(schoolProfile);
  const resolvedBobot = bobotPolicy || kelasHarian.bobotNilai;
  const activeClassKKTP = resolveEffectiveKKTPThreshold({
    bobotPolicy: resolvedBobot,
    schoolProfile,
  });

  const archivedIds = new Set((kelasHarian.archivedSiswa || []).map((s) => s.id));
  const activeDaftarNilai = (kelasHarian.daftarNilai || []).filter(
    (n) => !archivedIds.has(n.siswaId)
  );
  const filteredTPs = tpFilterId
    ? tpList.filter((t) => (t.id || t.kode) === tpFilterId || t.kode === tpFilterId)
    : tpList;

  const allEvaluations: StudentTPRemedialEvaluation[] = [];
  for (const siswaNilai of activeDaftarNilai) {
    for (const tp of filteredTPs) {
      allEvaluations.push(
        evaluateStudentTPRemedialTarget({
          siswaNilai,
          tp,
          bobotPolicy: resolvedBobot,
          schoolProfile,
          scope,
        })
      );
    }
  }

  // Sasaran mencakup siswa yang saat ini eligible ATAU sudah memiliki riwayat remedial agar histori tidak hilang
  const targets = allEvaluations.filter(
    (ev) => ev.eligibleForRemedial || ev.remedialRecords.length > 0
  );
  const unassessedEntries = allEvaluations.filter(
    (ev) => ev.isUnassessed && ev.remedialRecords.length === 0
  );

  const uniqueUnassessedStudents = new Set(unassessedEntries.map((e) => e.siswaId));
  const lockedStudents = new Set(targets.filter((t) => t.isFinalReportLocked).map((t) => t.siswaId));

  return {
    scope,
    activeClassKKTP,
    targets,
    unassessedEntries,
    allEvaluations,
    counts: {
      totalTargets: targets.length,
      perluTindakLanjut: targets.filter((t) => t.visualCategory === 'perlu_remedial').length,
      direncanakan: targets.filter((t) => t.visualCategory === 'direncanakan_remedial').length,
      sedangBerlangsung: targets.filter((t) => t.visualCategory === 'sedang_remedial').length,
      menungguReassessment: targets.filter((t) => t.visualCategory === 'menunggu_reassessment').length,
      sudahReassessmentTuntas: targets.filter((t) => t.visualCategory === 'sudah_reassessment_tuntas').length,
      sudahReassessmentBelumTuntas: targets.filter((t) => t.visualCategory === 'sudah_reassessment_belum_tuntas').length,
      belumAdaBuktiEntries: unassessedEntries.length,
      belumAdaBuktiUniqueStudents: uniqueUnassessedStudents.size,
      lockedFinalTargets: lockedStudents.size,
    },
  };
}

function createAuditEvent(params: {
  idSeed: string;
  action: RemedialAuditAction;
  fromStatus?: StatusTindakLanjutRemedial;
  toStatus?: StatusTindakLanjutRemedial;
  summary: string;
  evidenceId?: string;
}): RemedialAuditEvent {
  return {
    id: `aud_${hashIdentifier32(params.idSeed)}`,
    at: new Date().toISOString(),
    action: params.action,
    ...(params.fromStatus ? { fromStatus: params.fromStatus } : {}),
    ...(params.toStatus ? { toStatus: params.toStatus } : {}),
    summary: params.summary,
    ...(params.evidenceId ? { evidenceId: params.evidenceId } : {}),
  };
}

export interface UpsertRemedialPlanInput {
  kelasHarian: KelasHarianData;
  schoolProfile?: SchoolProfile | null;
  tp: CustomTPItem;
  siswaId: string;
  remedialId?: string;
  subTpIds?: string[];
  jenisIntervensi: JenisIntervensiRemedial;
  tanggalIntervensi?: string;
  statusTindakLanjut?: StatusTindakLanjutRemedial;
  rencanaKegiatan?: string;
  hasilKegiatan?: string;
  catatanGuru?: string;
  originalEvidenceId?: string;
  auditEventIdSeed?: string;
}

export interface RemedialMutationResult {
  kelasHarian: KelasHarianData;
  record: RiwayatRemedialItem;
  reassessmentEvidence?: BuktiAsesmenSubTP;
  finalReportPreserved: boolean;
}

/**
 * Membuat atau memperbarui catatan kegiatan & status remedial secara non-destruktif dan idempoten.
 * Nilai awal, bukti awal, dan rapor yang sudah berstatus Final tidak pernah diubah.
 */
export function upsertStudentRemedialPlan(
  params: UpsertRemedialPlanInput
): RemedialMutationResult {
  const {
    kelasHarian,
    schoolProfile,
    tp,
    siswaId,
    remedialId,
    subTpIds,
    jenisIntervensi,
    tanggalIntervensi,
    statusTindakLanjut = 'direncanakan',
    rencanaKegiatan,
    hasilKegiatan,
    catatanGuru,
    originalEvidenceId,
    auditEventIdSeed,
  } = params;

  const targetItem = kelasHarian.daftarNilai.find((n) => n.siswaId === siswaId);
  if (!targetItem) {
    throw new Error(`Data nilai siswa (${siswaId}) tidak ditemukan di kelas ini.`);
  }

  const scope = buildRemedialScopeIdentity(schoolProfile);
  const evaluation = evaluateStudentTPRemedialTarget({
    siswaNilai: targetItem,
    tp,
    bobotPolicy: kelasHarian.bobotNilai,
    schoolProfile,
    scope,
  });

  const existingRecord = remedialId
    ? (targetItem.riwayatRemedial || []).find((r) => r.id === remedialId)
    : undefined;

  const stableRecordId =
    remedialId?.trim() ||
    `remed_${hashIdentifier32(`${scope.schoolId}|${scope.classId}|${scope.semesterId}`)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const resolvedSubIds =
    subTpIds && subTpIds.length > 0
      ? [...subTpIds]
      : existingRecord?.subTpIds ||
        (evaluation.unachievedSubTps.length > 0
          ? evaluation.unachievedSubTps.map((s) => s.subTpId)
          : undefined);

  const subTpList = Array.isArray(tp.subTP) ? tp.subTP : [];
  const resolvedSubKodes =
    resolvedSubIds && resolvedSubIds.length > 0
      ? resolvedSubIds
          .map((id) => subTpList.find((s) => s.id === id)?.kode)
          .filter((k): k is string => Boolean(k))
      : existingRecord?.subTpKodes;

  const snapshotInitialScore = evaluation.initialAssessment.effectiveScore100;
  const hasilSebelum =
    existingRecord?.hasilSebelum ||
    (snapshotInitialScore !== null || evaluation.initialAssessment.status !== 'Belum Dinilai'
      ? {
          skor: snapshotInitialScore,
          skalaSkor: 100,
          persentase: snapshotInitialScore,
          status: evaluation.initialAssessment.status,
        }
      : undefined);

  const linkedInitialEvidenceId =
    existingRecord?.originalEvidenceId ||
    existingRecord?.attemptAwalId ||
    originalEvidenceId ||
    evaluation.initialAssessment.primaryEvidenceId;

  const reasonsSummary =
    existingRecord?.alasanRemedial ||
    (evaluation.alasanKetidaktercapaian.length > 0
      ? evaluation.alasanKetidaktercapaian.join(' ')
      : undefined);

  const normalizedRencana =
    rencanaKegiatan !== undefined ? rencanaKegiatan.trim() : existingRecord?.rencanaKegiatan;
  const normalizedHasil =
    hasilKegiatan !== undefined ? hasilKegiatan.trim() : existingRecord?.hasilKegiatan;
  const normalizedCatatan =
    catatanGuru !== undefined ? catatanGuru.trim() : existingRecord?.catatanGuru;
  const normalizedTanggal =
    tanggalIntervensi || existingRecord?.tanggalIntervensi || new Date().toISOString().split('T')[0];

  const isExactRetryNoChange =
    Boolean(existingRecord) &&
    existingRecord!.jenisIntervensi === jenisIntervensi &&
    existingRecord!.statusTindakLanjut === statusTindakLanjut &&
    existingRecord!.tanggalIntervensi === normalizedTanggal &&
    (existingRecord!.rencanaKegiatan || '') === (normalizedRencana || '') &&
    (existingRecord!.hasilKegiatan || '') === (normalizedHasil || '') &&
    (existingRecord!.catatanGuru || '') === (normalizedCatatan || '') &&
    JSON.stringify(existingRecord!.subTpIds || []) === JSON.stringify(resolvedSubIds || []);

  if (isExactRetryNoChange) {
    return {
      kelasHarian,
      record: existingRecord!,
      finalReportPreserved: targetItem.statusRapor === 'final',
    };
  }

  const auditEvents: RemedialAuditEvent[] = [];
  if (!existingRecord) {
    auditEvents.push(
      createAuditEvent({
        idSeed: auditEventIdSeed || `${stableRecordId}|created`,
        action: 'created',
        toStatus: statusTindakLanjut,
        summary: `Remedial dibuat (${JENIS_INTERVENSI_LABELS[jenisIntervensi]}) dengan status ${STATUS_REMEDIAL_META[statusTindakLanjut].label}.`,
        evidenceId: linkedInitialEvidenceId,
      })
    );
  } else {
    if (existingRecord.statusTindakLanjut !== statusTindakLanjut) {
      auditEvents.push(
        createAuditEvent({
          idSeed:
            auditEventIdSeed ||
            `${stableRecordId}|status|${existingRecord.statusTindakLanjut}|${statusTindakLanjut}|${existingRecord.auditTrail?.length || 0}`,
          action: 'status_changed',
          fromStatus: existingRecord.statusTindakLanjut,
          toStatus: statusTindakLanjut,
          summary: `Status berubah dari ${STATUS_REMEDIAL_META[existingRecord.statusTindakLanjut]?.label || existingRecord.statusTindakLanjut} ke ${STATUS_REMEDIAL_META[statusTindakLanjut].label}.`,
        })
      );
    } else {
      auditEvents.push(
        createAuditEvent({
          idSeed:
            auditEventIdSeed ||
            `${stableRecordId}|activity|${normalizedTanggal}|${normalizedRencana || ''}|${normalizedHasil || ''}|${normalizedCatatan || ''}|${existingRecord.auditTrail?.length || 0}`,
          action: 'activity_updated',
          toStatus: statusTindakLanjut,
          summary: `Catatan / kegiatan remedial diperbarui (${JENIS_INTERVENSI_LABELS[jenisIntervensi]}).`,
        })
      );
    }
  }

  const nextEntry = createRemedialHistoryEntry({
    id: stableRecordId,
    siswaId,
    schoolId: existingRecord?.schoolId || scope.schoolId,
    classId: existingRecord?.classId || scope.classId,
    semesterId: existingRecord?.semesterId || scope.semesterId,
    tp: { id: tp.id || tp.kode, kode: tp.kode },
    subTpIds: resolvedSubIds,
    subTpKodes: resolvedSubKodes,
    originalEvidenceId: linkedInitialEvidenceId,
    attemptAwalId: linkedInitialEvidenceId,
    tanggalIntervensi: tanggalIntervensi || existingRecord?.tanggalIntervensi,
    jenisIntervensi,
    alasanRemedial: reasonsSummary,
    rencanaKegiatan:
      rencanaKegiatan !== undefined ? rencanaKegiatan : existingRecord?.rencanaKegiatan,
    hasilKegiatan: hasilKegiatan !== undefined ? hasilKegiatan : existingRecord?.hasilKegiatan,
    reassessmentEvidenceId:
      existingRecord?.reassessmentEvidenceId || existingRecord?.asesmenUlangId,
    asesmenUlangId: existingRecord?.asesmenUlangId || existingRecord?.reassessmentEvidenceId,
    hasilSebelum,
    hasilSesudah: existingRecord?.hasilSesudah,
    statusTindakLanjut,
    catatanGuru: catatanGuru !== undefined ? catatanGuru : existingRecord?.catatanGuru,
    createdAt: existingRecord?.createdAt,
    auditTrail: auditEvents,
  });

  const updatedStudent = recordRemedialAttemptOnStudent(targetItem, nextEntry);
  // Pastikan field nilai & rapor final 100% identik dengan targetItem awal
  const guardedStudent: NilaiSiswaItem = {
    ...targetItem,
    riwayatRemedial: updatedStudent.riwayatRemedial,
  };
  const persistedRecord =
    (guardedStudent.riwayatRemedial || []).find((r) => r.id === stableRecordId) || nextEntry;

  return {
    kelasHarian: {
      ...kelasHarian,
      daftarNilai: kelasHarian.daftarNilai.map((row) =>
        row.siswaId === siswaId ? guardedStudent : row
      ),
    },
    record: persistedRecord,
    finalReportPreserved: targetItem.statusRapor === 'final',
  };
}

export interface RecordReassessmentInput {
  kelasHarian: KelasHarianData;
  schoolProfile?: SchoolProfile | null;
  tp: CustomTPItem;
  siswaId: string;
  remedialId?: string;
  reassessmentEvidenceId?: string;
  subTpId?: string;
  jenisBukti: JenisBuktiAsesmen;
  sumberBukti?: SumberBuktiAsesmen;
  tanggal?: string;
  skor?: number | null;
  skalaSkor?: number;
  manualStatus?: StatusKetercapaianBukti;
  indikatorYangDiamati: string;
  catatanGuru?: string;
  markCompletedStatus?: StatusTindakLanjutRemedial;
}

/**
 * Mencatat hasil reassessment sebagai `BuktiAsesmenSubTP` baru bertanda `peranBukti: 'reassessment'`.
 * Secara ketat mempertahankan bukti awal, nilai formatif/STS/SAS/NA, dan rapor Final yang terkunci.
 */
export function recordNonDestructiveReassessment(
  params: RecordReassessmentInput
): RemedialMutationResult {
  const {
    kelasHarian,
    schoolProfile,
    tp,
    siswaId,
    remedialId,
    reassessmentEvidenceId,
    subTpId,
    jenisBukti,
    sumberBukti = 'asesmen',
    tanggal,
    skor,
    skalaSkor = 100,
    manualStatus,
    indikatorYangDiamati,
    catatanGuru,
    markCompletedStatus,
  } = params;

  const targetItem = kelasHarian.daftarNilai.find((n) => n.siswaId === siswaId);
  if (!targetItem) {
    throw new Error(`Data nilai siswa (${siswaId}) tidak ditemukan di kelas ini.`);
  }

  const scope = buildRemedialScopeIdentity(schoolProfile);
  const tpThreshold = resolveEffectiveKKTPThreshold({
    tp,
    bobotPolicy: kelasHarian.bobotNilai,
    schoolProfile,
  });

  // Pastikan selalu tertaut ke catatan remedial yang sah
  let workingKelas = kelasHarian;
  let linkedRemedial = remedialId
    ? (targetItem.riwayatRemedial || []).find((r) => r.id === remedialId)
    : (targetItem.riwayatRemedial || [])
        .filter((r) => doesRemedialRecordMatchScope(r, scope) && doesRecordMatchTP(r.tpId, r.tpKode, tp))
        .slice(-1)[0];

  if (!linkedRemedial) {
    const bootstrapped = upsertStudentRemedialPlan({
      kelasHarian: workingKelas,
      schoolProfile,
      tp,
      siswaId,
      jenisIntervensi: 'pendekatan_ulang',
      tanggalIntervensi: tanggal,
      statusTindakLanjut: 'selesai_perlu_reassessment',
      rencanaKegiatan: 'Tindak lanjut remedial sebelum penilaian ulang.',
      catatanGuru,
    });
    workingKelas = bootstrapped.kelasHarian;
    linkedRemedial = bootstrapped.record;
  }

  const currentStudent = workingKelas.daftarNilai.find((n) => n.siswaId === siswaId)!;
  const subTpObj = subTpId
    ? (tp.subTP || []).find((s) => s.id === subTpId || s.kode === subTpId)
    : undefined;

  const normalizedScore = normalizeEvidenceScoreToScale100(skor, skalaSkor);
  const reassessStatus: StatusKetercapaianBukti =
    normalizedScore !== null
      ? classifyMasteryStatusKKTP(normalizedScore, tpThreshold)
      : manualStatus || 'Belum Dinilai';

  const originalEvidenceId =
    linkedRemedial.originalEvidenceId || linkedRemedial.attemptAwalId;
  const resolvedTanggal = tanggal || new Date().toISOString().split('T')[0];
  const resolvedIndikator =
    indikatorYangDiamati.trim() || `Reassessment ${tp.kode} — ${tp.materiPokok}`;
  const resolvedSkor = skor === undefined ? null : skor;
  const resolvedSkala = skalaSkor > 0 ? skalaSkor : 100;

  // Deteksi duplikat identik agar retry / double-submit tidak menggandakan bukti reassessment
  const matchingExistingReassess = !reassessmentEvidenceId?.trim()
    ? (currentStudent.buktiAsesmenSubTP || []).find(
        (ev) =>
          ev.peranBukti === 'reassessment' &&
          ev.remedialRecordId === linkedRemedial!.id &&
          ev.jenisBukti === jenisBukti &&
          ev.tanggal === resolvedTanggal &&
          (ev.subTpId || '') === (subTpObj?.id || '') &&
          (ev.skor ?? null) === resolvedSkor &&
          (ev.skalaSkor ?? 100) === resolvedSkala &&
          ev.indikatorYangDiamati === resolvedIndikator &&
          (ev.catatanGuru || '') === (catatanGuru?.trim() || '')
      )
    : undefined;

  const stableEvidenceId =
    reassessmentEvidenceId?.trim() ||
    matchingExistingReassess?.id ||
    `reassess_${hashIdentifier32(`${linkedRemedial.id}|${resolvedTanggal}|${resolvedSkor ?? 'obs'}`)}_${Date.now().toString(36)}`;

  const existingEvidence = (currentStudent.buktiAsesmenSubTP || []).find(
    (ev) => ev.id === stableEvidenceId
  );

  const newEvidence = createBuktiAsesmenEntry({
    id: stableEvidenceId,
    tp: { id: tp.id || tp.kode, kode: tp.kode },
    subTp: subTpObj ? { id: subTpObj.id, kode: subTpObj.kode } : undefined,
    jenisBukti,
    sumberBukti,
    peranBukti: 'reassessment',
    remedialRecordId: linkedRemedial.id,
    originalEvidenceId,
    siswaId,
    schoolId: scope.schoolId,
    classId: scope.classId,
    semesterId: scope.semesterId,
    tanggal: resolvedTanggal,
    skor: resolvedSkor,
    skalaSkor: resolvedSkala,
    kktpMinTuntas: tpThreshold,
    statusKetercapaian: reassessStatus,
    indikatorYangDiamati: resolvedIndikator,
    catatanGuru,
    createdAt: existingEvidence?.createdAt,
  });

  // Simpan bukti secara non-destruktif (tambah baru atau update entri reassessment ber-ID sama)
  const existingEvList = Array.isArray(currentStudent.buktiAsesmenSubTP)
    ? [...currentStudent.buktiAsesmenSubTP]
    : [];
  const evIdx = existingEvList.findIndex((e) => e.id === newEvidence.id);
  if (evIdx >= 0) {
    existingEvList[evIdx] = {
      ...existingEvList[evIdx],
      ...newEvidence,
      peranBukti: 'reassessment',
      remedialRecordId: linkedRemedial.id,
      originalEvidenceId,
      createdAt: existingEvList[evIdx].createdAt || newEvidence.createdAt,
    };
  } else {
    existingEvList.push(newEvidence);
  }

  const nextRemedialStatus: StatusTindakLanjutRemedial =
    markCompletedStatus ||
    (reassessStatus === 'Tercapai'
      ? 'tuntas_setelah_remedial'
      : reassessStatus === 'Perlu Bimbingan'
      ? 'belum_tuntas'
      : 'selesai');

  const reassessAuditEvent = createAuditEvent({
    idSeed: `${linkedRemedial.id}|reassessment|${newEvidence.id}|${normalizedScore ?? reassessStatus}`,
    action: 'reassessment_recorded',
    fromStatus: linkedRemedial.statusTindakLanjut,
    toStatus: nextRemedialStatus,
    summary: `Reassessment dicatat (${jenisBukti}${
      normalizedScore !== null ? `, skor ${skor}/${skalaSkor} = ${normalizedScore}%` : `, status ${reassessStatus}`
    }) sebagai bukti baru tanpa menimpa nilai awal.`,
    evidenceId: newEvidence.id,
  });

  const updatedRemedial = createRemedialHistoryEntry({
    id: linkedRemedial.id,
    siswaId,
    schoolId: linkedRemedial.schoolId || scope.schoolId,
    classId: linkedRemedial.classId || scope.classId,
    semesterId: linkedRemedial.semesterId || scope.semesterId,
    tp: { id: tp.id || tp.kode, kode: tp.kode },
    subTpIds: linkedRemedial.subTpIds,
    subTpKodes: linkedRemedial.subTpKodes,
    originalEvidenceId,
    attemptAwalId: originalEvidenceId,
    tanggalIntervensi: linkedRemedial.tanggalIntervensi,
    jenisIntervensi: linkedRemedial.jenisIntervensi,
    alasanRemedial: linkedRemedial.alasanRemedial,
    rencanaKegiatan: linkedRemedial.rencanaKegiatan,
    hasilKegiatan: linkedRemedial.hasilKegiatan,
    reassessmentEvidenceId: newEvidence.id,
    asesmenUlangId: newEvidence.id,
    hasilSebelum: linkedRemedial.hasilSebelum,
    hasilSesudah: {
      skor: skor === undefined ? null : skor,
      skalaSkor: skalaSkor > 0 ? skalaSkor : 100,
      persentase: normalizedScore,
      status: reassessStatus,
    },
    statusTindakLanjut: nextRemedialStatus,
    catatanGuru: catatanGuru?.trim() ? catatanGuru.trim() : linkedRemedial.catatanGuru,
    createdAt: linkedRemedial.createdAt,
    auditTrail: [reassessAuditEvent],
  });

  const withEvidence: NilaiSiswaItem = {
    ...currentStudent,
    buktiAsesmenSubTP: existingEvList,
  };
  const withRemedial = recordRemedialAttemptOnStudent(withEvidence, updatedRemedial);

  // Jaga agar nilaiFormatif, nilaiSTS, nilaiSAS, nilaiPraktik, nilaiAkhir, predikatKKTP, statusRapor,
  // finalizedAt, dan deskripsiRapor awal TIDAK berubah diam-diam!
  const finalGuardedStudent: NilaiSiswaItem = {
    ...targetItem,
    buktiAsesmenSubTP: withRemedial.buktiAsesmenSubTP,
    riwayatRemedial: withRemedial.riwayatRemedial,
  };

  const finalRecord =
    (finalGuardedStudent.riwayatRemedial || []).find((r) => r.id === linkedRemedial!.id) ||
    updatedRemedial;

  return {
    kelasHarian: {
      ...workingKelas,
      daftarNilai: workingKelas.daftarNilai.map((row) =>
        row.siswaId === siswaId ? finalGuardedStudent : row
      ),
    },
    record: finalRecord,
    reassessmentEvidence: newEvidence,
    finalReportPreserved: targetItem.statusRapor === 'final',
  };
}

/**
 * Melindungi bukti penilaian awal atau bukti yang tertaut pada remedial / rapor final dari penghapusan.
 */
export function isEvidenceProtectedFromDeletion(
  item: NilaiSiswaItem,
  evidenceId: string
): { protected: boolean; reason?: string } {
  if (item.statusRapor === 'final') {
    return {
      protected: true,
      reason: 'Rapor siswa berstatus Final terkunci sehingga bukti penilaian tidak dapat dihapus.',
    };
  }
  const linkedByRemedial = (item.riwayatRemedial || []).some(
    (r) =>
      r.attemptAwalId === evidenceId ||
      r.originalEvidenceId === evidenceId ||
      r.asesmenUlangId === evidenceId ||
      r.reassessmentEvidenceId === evidenceId
  );
  if (linkedByRemedial) {
    return {
      protected: true,
      reason:
        'Bukti ini tertaut sebagai referensi pada catatan remedial dan dilindungi untuk menjaga audit trail.',
    };
  }
  const linkedByReassessment = (item.buktiAsesmenSubTP || []).some(
    (ev) => ev.originalEvidenceId === evidenceId
  );
  if (linkedByReassessment) {
    return {
      protected: true,
      reason: 'Bukti awal ini menjadi rujukan reassessment sehingga tidak dapat dihapus.',
    };
  }
  return { protected: false };
}
