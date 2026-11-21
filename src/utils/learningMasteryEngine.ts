import type {
  BobotNilaiKebijakan,
  BuktiAsesmenSubTP,
  JenisBuktiAsesmen,
  JenisIntervensiRemedial,
  NilaiSiswaItem,
  PeranBuktiAsesmen,
  PredikatKKTP,
  RemedialAuditEvent,
  RiwayatRemedialItem,
  StatusKetercapaianBukti,
  StatusTindakLanjutRemedial,
  SumberBuktiAsesmen,
} from '../types/kelasHarian';
import type { CustomTPItem, SchoolProfile, SubTPItem } from './schoolProfileStorage';

export const DEFAULT_KKTP_MIN_TUNTAS = 71;
export const DEFAULT_CLASS_INTERVENTION_HEURISTIC_PERCENT = 30;

export interface DynamicKKTPBands {
  minTuntas: number;
  sangatBaikMin: number;
  cukupMin: number;
}

export interface MasteryEvidenceItemView {
  evidence: BuktiAsesmenSubTP;
  normalizedScore100: number | null;
  status: StatusKetercapaianBukti;
}

export interface StudentSubTPMasteryResult {
  subTpId: string;
  subTpKode: string;
  fokusMateri: string;
  status: StatusKetercapaianBukti | 'Bukti belum cukup';
  evidences: MasteryEvidenceItemView[];
  averageScore100: number | null;
  alasan: string;
}

export interface StudentTPMasteryResult {
  siswaId: string;
  namaSiswa: string;
  tpId: string;
  tpKode: string;
  materiPokok: string;
  thresholdKKTP: number;
  formatifScore: number | null;
  normalizedEvidenceAvg100: number | null;
  effectiveScore100: number | null;
  status: StatusKetercapaianBukti;
  insufficientEvidence: boolean;
  alasanStatus: string;
  evidences: MasteryEvidenceItemView[];
  initialEvidences?: MasteryEvidenceItemView[];
  reassessmentEvidences?: MasteryEvidenceItemView[];
  subTpResults: StudentSubTPMasteryResult[];
  subTpAnalysisNote: string;
  catatanMiskonsepsiGuru: string[];
  riwayatRemedialTP: RiwayatRemedialItem[];
}

export interface StudentMasteryOverview {
  siswaId: string;
  namaSiswa: string;
  tpResults: StudentTPMasteryResult[];
  dinilaiTPCount: number;
  tercapaiTPCount: number;
  perluBimbinganTPCount: number;
  belumDinilaiTPCount: number;
}

export type FollowUpRecommendationKind =
  | 'individu'
  | 'kelompok_kecil'
  | 'kelas_keseluruhan'
  | 'belum_perlu_tindak_lanjut'
  | 'belum_dapat_ditentukan';

export interface FollowUpRecommendation {
  kind: FollowUpRecommendationKind;
  label: string;
  alasan: string;
  dasarData: string;
  targetSiswaIds: string[];
  targetSiswaNames: string[];
  ambangHeuristikPersen: number;
  sumberAturan: 'heuristik_produk_dapat_disesuaikan';
}

export interface ClassSubTPMasterySummary {
  subTpId: string;
  subTpKode: string;
  fokusMateri: string;
  dinilaiCount: number;
  tercapaiCount: number;
  perluBimbinganCount: number;
  belumDinilaiCount: number;
  persentaseTercapai: number | null;
}

export interface ClassTPMasterySummary {
  tpId: string;
  tpKode: string;
  materiPokok: string;
  thresholdKKTP: number;
  totalSiswa: number;
  dinilaiCount: number;
  belumDinilaiCount: number;
  tercapaiCount: number;
  perluBimbinganCount: number;
  persentaseTercapai: number | null;
  persentasePerluBimbingan: number | null;
  hasSpecificSubTPEvidence: boolean;
  subTpSummaries: ClassSubTPMasterySummary[];
  catatanMiskonsepsiTerkumpul: { siswaNama: string; subTpKode?: string; catatan: string }[];
  rekomendasi: FollowUpRecommendation;
}

export interface ClassLearningMasteryReport {
  kktpDefaultKelas: number;
  ambangHeuristikPersen: number;
  totalSiswa: number;
  tpSummaries: ClassTPMasterySummary[];
  studentOverviews: StudentMasteryOverview[];
}

function clampThreshold(val: unknown): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  const rounded = Math.round(val);
  if (rounded < 1 || rounded > 100) return null;
  return rounded;
}

export function resolveEffectiveKKTPThreshold(params?: {
  tp?: Pick<CustomTPItem, 'kktpMinTuntas'> | null;
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null;
  schoolProfile?: Pick<SchoolProfile, 'kktpMinTuntas'> | null;
}): number {
  const tpVal = clampThreshold(params?.tp?.kktpMinTuntas);
  if (tpVal !== null) return tpVal;
  const bobotVal = clampThreshold(params?.bobotPolicy?.kktpMinTuntas);
  if (bobotVal !== null) return bobotVal;
  const profileVal = clampThreshold(params?.schoolProfile?.kktpMinTuntas);
  if (profileVal !== null) return profileVal;
  return DEFAULT_KKTP_MIN_TUNTAS;
}

/**
 * Menghitung batas rentang predikat KKTP secara proporsional dari `kktpMinTuntas` aktual.
 * Untuk nilai default 71: Sangat Baik >= 86, Baik = 71..85, Cukup = 61..70, Perlu Bimbingan = 0..60.
 */
export function computeDynamicKKTPBands(kktpMinTuntas?: number | null): DynamicKKTPBands {
  const minTuntas = clampThreshold(kktpMinTuntas) ?? DEFAULT_KKTP_MIN_TUNTAS;
  const sangatBaikMin =
    minTuntas >= 100
      ? 100
      : Math.min(100, Math.max(minTuntas + 1, Math.round(minTuntas + (100 - minTuntas) * 0.5)));
  const cukupMin =
    minTuntas <= 1 ? 1 : Math.max(1, minTuntas - Math.min(10, Math.max(1, Math.floor(minTuntas / 3))));

  return {
    minTuntas,
    sangatBaikMin,
    cukupMin,
  };
}

export function classifyPredikatKKTPWithThreshold(
  na: number | null | undefined,
  kktpMinTuntas?: number | null
): PredikatKKTP {
  if (typeof na !== 'number' || Number.isNaN(na)) {
    return 'Belum Dinilai';
  }
  const { minTuntas, sangatBaikMin, cukupMin } = computeDynamicKKTPBands(kktpMinTuntas);
  if (na >= sangatBaikMin) return 'Sangat Baik';
  if (na >= minTuntas) return 'Baik';
  if (na >= cukupMin) return 'Cukup';
  return 'Perlu Bimbingan';
}

export function classifyMasteryStatusKKTP(
  score100: number | null | undefined,
  kktpMinTuntas?: number | null
): StatusKetercapaianBukti {
  if (typeof score100 !== 'number' || Number.isNaN(score100)) {
    return 'Belum Dinilai';
  }
  const threshold = clampThreshold(kktpMinTuntas) ?? DEFAULT_KKTP_MIN_TUNTAS;
  return score100 >= threshold ? 'Tercapai' : 'Perlu Bimbingan';
}

export function isScoreTercapaiKKTP(
  score: number | null | undefined,
  kktpMinTuntas?: number | null
): boolean {
  if (typeof score !== 'number' || Number.isNaN(score)) return false;
  const threshold = clampThreshold(kktpMinTuntas) ?? DEFAULT_KKTP_MIN_TUNTAS;
  return score >= threshold;
}

export function normalizeEvidenceScoreToScale100(
  skor: number | null | undefined,
  skalaSkor?: number | null
): number | null {
  if (typeof skor !== 'number' || Number.isNaN(skor)) return null;
  const scale = typeof skalaSkor === 'number' && Number.isFinite(skalaSkor) && skalaSkor > 0 ? skalaSkor : 100;
  const pct = (skor / scale) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

function readFormatifScoreLocal(
  nilaiFormatif: { [tpKey: string]: number | null | undefined } | undefined | null,
  tp: Pick<CustomTPItem, 'id' | 'kode' | 'legacyTpId'>
): number | null {
  if (!nilaiFormatif || typeof nilaiFormatif !== 'object') return null;
  const candidates = [tp.id, tp.kode, tp.legacyTpId].filter(Boolean) as string[];
  for (const key of candidates) {
    const val = nilaiFormatif[key];
    if (typeof val === 'number' && !Number.isNaN(val)) {
      return val;
    }
  }
  return null;
}

function doesEvidenceMatchTP(ev: BuktiAsesmenSubTP, tp: CustomTPItem): boolean {
  if (ev.tpId && tp.id && ev.tpId === tp.id) return true;
  if (ev.tpId && tp.legacyTpId && ev.tpId === tp.legacyTpId) return true;
  if (ev.tpKode && tp.kode && ev.tpKode.trim().toLowerCase() === tp.kode.trim().toLowerCase()) {
    return true;
  }
  return false;
}

function doesEvidenceMatchSubTP(ev: BuktiAsesmenSubTP, sub: SubTPItem): boolean {
  if (ev.subTpId && sub.id && ev.subTpId === sub.id) return true;
  if (ev.subTpKode && sub.kode && ev.subTpKode.trim().toLowerCase() === sub.kode.trim().toLowerCase()) {
    return true;
  }
  return false;
}

export function createBuktiAsesmenEntry(params: {
  id?: string;
  tp: Pick<CustomTPItem, 'id' | 'kode'>;
  subTp?: Pick<SubTPItem, 'id' | 'kode'> | null;
  jenisBukti: JenisBuktiAsesmen;
  sumberBukti: SumberBuktiAsesmen;
  peranBukti?: PeranBuktiAsesmen;
  remedialRecordId?: string;
  originalEvidenceId?: string;
  siswaId?: string;
  schoolId?: string;
  classId?: string;
  semesterId?: string;
  tanggal?: string;
  skor?: number | null;
  skalaSkor?: number;
  kktpMinTuntas?: number;
  statusKetercapaian?: StatusKetercapaianBukti;
  indikatorYangDiamati: string;
  asesmenId?: string;
  rangkumanId?: string;
  lkpdId?: string;
  jurnalId?: string;
  catatanGuru?: string;
  catatanMiskonsepsi?: string;
  createdAt?: string;
}): BuktiAsesmenSubTP {
  const normalized = normalizeEvidenceScoreToScale100(params.skor, params.skalaSkor);
  const autoStatus: StatusKetercapaianBukti =
    params.statusKetercapaian ||
    (normalized !== null ? classifyMasteryStatusKKTP(normalized, params.kktpMinTuntas) : 'Belum Dinilai');
  const nowIso = new Date().toISOString();

  return {
    id:
      params.id?.trim() ||
      `bukti_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    tpId: params.tp.id || params.tp.kode,
    tpKode: params.tp.kode,
    ...(params.subTp ? { subTpId: params.subTp.id, subTpKode: params.subTp.kode } : {}),
    jenisBukti: params.jenisBukti,
    tanggal: params.tanggal || nowIso.split('T')[0],
    sumberBukti: params.sumberBukti,
    ...(params.peranBukti ? { peranBukti: params.peranBukti } : {}),
    ...(params.remedialRecordId ? { remedialRecordId: params.remedialRecordId } : {}),
    ...(params.originalEvidenceId ? { originalEvidenceId: params.originalEvidenceId } : {}),
    ...(params.siswaId ? { siswaId: params.siswaId } : {}),
    ...(params.schoolId ? { schoolId: params.schoolId } : {}),
    ...(params.classId ? { classId: params.classId } : {}),
    ...(params.semesterId ? { semesterId: params.semesterId } : {}),
    ...(params.asesmenId ? { asesmenId: params.asesmenId } : {}),
    ...(params.rangkumanId ? { rangkumanId: params.rangkumanId } : {}),
    ...(params.lkpdId ? { lkpdId: params.lkpdId } : {}),
    ...(params.jurnalId ? { jurnalId: params.jurnalId } : {}),
    skor: params.skor === undefined ? null : params.skor,
    skalaSkor: params.skalaSkor && params.skalaSkor > 0 ? params.skalaSkor : 100,
    statusKetercapaian: autoStatus,
    indikatorYangDiamati: params.indikatorYangDiamati.trim(),
    ...(params.catatanGuru?.trim() ? { catatanGuru: params.catatanGuru.trim() } : {}),
    ...(params.catatanMiskonsepsi?.trim()
      ? { catatanMiskonsepsi: params.catatanMiskonsepsi.trim() }
      : {}),
    createdAt: params.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

export function createRemedialHistoryEntry(params: {
  id?: string;
  siswaId?: string;
  schoolId?: string;
  classId?: string;
  semesterId?: string;
  tp: Pick<CustomTPItem, 'id' | 'kode'>;
  subTpIds?: string[];
  subTpKodes?: string[];
  attemptAwalId?: string;
  originalEvidenceId?: string;
  tanggalIntervensi?: string;
  jenisIntervensi: JenisIntervensiRemedial;
  alasanRemedial?: string;
  rencanaKegiatan?: string;
  hasilKegiatan?: string;
  materiPengulanganId?: string;
  asesmenUlangId?: string;
  reassessmentEvidenceId?: string;
  hasilSebelum?: RiwayatRemedialItem['hasilSebelum'];
  hasilSesudah?: RiwayatRemedialItem['hasilSesudah'];
  statusTindakLanjut?: StatusTindakLanjutRemedial;
  catatanGuru?: string;
  createdAt?: string;
  auditTrail?: RemedialAuditEvent[];
}): RiwayatRemedialItem {
  const nowIso = new Date().toISOString();
  const linkedInitialId = params.originalEvidenceId || params.attemptAwalId;
  const linkedReassessId = params.reassessmentEvidenceId || params.asesmenUlangId;

  return {
    id:
      params.id?.trim() ||
      `remed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    ...(params.siswaId ? { siswaId: params.siswaId } : {}),
    ...(params.schoolId ? { schoolId: params.schoolId } : {}),
    ...(params.classId ? { classId: params.classId } : {}),
    ...(params.semesterId ? { semesterId: params.semesterId } : {}),
    tpId: params.tp.id || params.tp.kode,
    tpKode: params.tp.kode,
    ...(params.subTpIds && params.subTpIds.length > 0 ? { subTpIds: [...params.subTpIds] } : {}),
    ...(params.subTpKodes && params.subTpKodes.length > 0
      ? { subTpKodes: [...params.subTpKodes] }
      : {}),
    ...(linkedInitialId
      ? { attemptAwalId: linkedInitialId, originalEvidenceId: linkedInitialId }
      : {}),
    tanggalIntervensi: params.tanggalIntervensi || nowIso.split('T')[0],
    jenisIntervensi: params.jenisIntervensi,
    ...(params.alasanRemedial?.trim() ? { alasanRemedial: params.alasanRemedial.trim() } : {}),
    ...(params.rencanaKegiatan?.trim() ? { rencanaKegiatan: params.rencanaKegiatan.trim() } : {}),
    ...(params.hasilKegiatan?.trim() ? { hasilKegiatan: params.hasilKegiatan.trim() } : {}),
    ...(params.materiPengulanganId ? { materiPengulanganId: params.materiPengulanganId } : {}),
    ...(linkedReassessId
      ? { asesmenUlangId: linkedReassessId, reassessmentEvidenceId: linkedReassessId }
      : {}),
    ...(params.hasilSebelum ? { hasilSebelum: { ...params.hasilSebelum } } : {}),
    ...(params.hasilSesudah ? { hasilSesudah: { ...params.hasilSesudah } } : {}),
    statusTindakLanjut: params.statusTindakLanjut || 'direncanakan',
    ...(params.catatanGuru?.trim() ? { catatanGuru: params.catatanGuru.trim() } : {}),
    createdAt: params.createdAt || nowIso,
    updatedAt: nowIso,
    ...(params.auditTrail && params.auditTrail.length > 0
      ? { auditTrail: params.auditTrail.map((ev) => ({ ...ev })) }
      : {}),
  };
}

function mergeRemedialAuditTrails(
  prevTrail?: RemedialAuditEvent[],
  nextTrail?: RemedialAuditEvent[]
): RemedialAuditEvent[] | undefined {
  const combined = [...(prevTrail || []), ...(nextTrail || [])];
  if (combined.length === 0) return undefined;
  const byId = new Map<string, RemedialAuditEvent>();
  for (const ev of combined) {
    if (ev && ev.id && !byId.has(ev.id)) {
      byId.set(ev.id, { ...ev });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Menambahkan atau memperbarui riwayat tindak lanjut secara non-destruktif
 * tanpa menimpa `hasilSebelum`, `attemptAwalId`, `originalEvidenceId`, `createdAt`, maupun nilai awal siswa.
 */
export function recordRemedialAttemptOnStudent(
  item: NilaiSiswaItem,
  entry: RiwayatRemedialItem
): NilaiSiswaItem {
  const existing = Array.isArray(item.riwayatRemedial) ? [...item.riwayatRemedial] : [];
  const idx = existing.findIndex((r) => r.id === entry.id);
  const nowIso = new Date().toISOString();
  if (idx >= 0) {
    const prev = existing[idx];
    const preservedInitialId =
      prev.originalEvidenceId ||
      prev.attemptAwalId ||
      entry.originalEvidenceId ||
      entry.attemptAwalId;
    const mergedReassessId =
      entry.reassessmentEvidenceId ||
      entry.asesmenUlangId ||
      prev.reassessmentEvidenceId ||
      prev.asesmenUlangId;
    const mergedAudit = mergeRemedialAuditTrails(prev.auditTrail, entry.auditTrail);

    existing[idx] = {
      ...prev,
      ...entry,
      siswaId: prev.siswaId || entry.siswaId || item.siswaId,
      schoolId: prev.schoolId || entry.schoolId,
      classId: prev.classId || entry.classId,
      semesterId: prev.semesterId || entry.semesterId,
      ...(preservedInitialId
        ? { attemptAwalId: preservedInitialId, originalEvidenceId: preservedInitialId }
        : {}),
      ...(mergedReassessId
        ? { asesmenUlangId: mergedReassessId, reassessmentEvidenceId: mergedReassessId }
        : {}),
      hasilSebelum: prev.hasilSebelum || entry.hasilSebelum,
      createdAt: prev.createdAt || entry.createdAt || nowIso,
      ...(mergedAudit ? { auditTrail: mergedAudit } : {}),
      updatedAt: nowIso,
    };
  } else {
    existing.push({
      ...entry,
      siswaId: entry.siswaId || item.siswaId,
      createdAt: entry.createdAt || nowIso,
      updatedAt: entry.updatedAt || nowIso,
    });
  }
  return {
    ...item,
    riwayatRemedial: existing,
  };
}

function toMasteryEvidenceItemView(
  ev: BuktiAsesmenSubTP,
  thresholdKKTP: number
): MasteryEvidenceItemView {
  const norm = normalizeEvidenceScoreToScale100(ev.skor, ev.skalaSkor);
  const evStatus: StatusKetercapaianBukti =
    norm !== null
      ? classifyMasteryStatusKKTP(norm, thresholdKKTP)
      : ev.statusKetercapaian || 'Belum Dinilai';
  return {
    evidence: ev,
    normalizedScore100: norm,
    status: evStatus,
  };
}

export function analyzeStudentTPMastery(
  item: NilaiSiswaItem,
  tp: CustomTPItem,
  options?: {
    bobotPolicy?: Partial<BobotNilaiKebijakan> | null;
    schoolProfile?: Pick<SchoolProfile, 'kktpMinTuntas'> | null;
  }
): StudentTPMasteryResult {
  const thresholdKKTP = resolveEffectiveKKTPThreshold({
    tp,
    bobotPolicy: options?.bobotPolicy,
    schoolProfile: options?.schoolProfile,
  });
  const formatifScore = readFormatifScoreLocal(item.nilaiFormatif, tp);
  const matchingEvidences = (item.buktiAsesmenSubTP || []).filter((ev) => doesEvidenceMatchTP(ev, tp));

  const evidenceViews = matchingEvidences.map((ev) => toMasteryEvidenceItemView(ev, thresholdKKTP));
  // Pisahkan bukti awal dari bukti reassessment agar reassessment tidak menimpa capaian awal
  const initialEvidenceViews = evidenceViews.filter(
    (v) => v.evidence.peranBukti !== 'reassessment'
  );
  const reassessmentEvidenceViews = evidenceViews.filter(
    (v) => v.evidence.peranBukti === 'reassessment'
  );

  const scoredInitialEvidenceViews = initialEvidenceViews.filter(
    (v) => v.normalizedScore100 !== null
  );
  const normalizedEvidenceAvg100 =
    scoredInitialEvidenceViews.length > 0
      ? Math.round(
          scoredInitialEvidenceViews.reduce((sum, v) => sum + (v.normalizedScore100 as number), 0) /
            scoredInitialEvidenceViews.length
        )
      : null;

  let effectiveScore100: number | null = formatifScore;
  let status: StatusKetercapaianBukti = 'Belum Dinilai';
  let insufficientEvidence = false;
  let alasanStatus = 'Belum ada nilai formatif maupun bukti asesmen untuk TP ini.';

  if (formatifScore !== null) {
    status = classifyMasteryStatusKKTP(formatifScore, thresholdKKTP);
    alasanStatus =
      status === 'Tercapai'
        ? `Nilai formatif (${formatifScore}) memenuhi KKTP (>= ${thresholdKKTP})${
            initialEvidenceViews.length > 0
              ? ` dengan ${initialEvidenceViews.length} bukti pendukung`
              : ''
          }.`
        : `Nilai formatif (${formatifScore}) berada di bawah KKTP (${thresholdKKTP})${
            initialEvidenceViews.length > 0
              ? ` dengan ${initialEvidenceViews.length} bukti pendukung`
              : ''
          }.`;
  } else if (normalizedEvidenceAvg100 !== null) {
    effectiveScore100 = normalizedEvidenceAvg100;
    status = classifyMasteryStatusKKTP(normalizedEvidenceAvg100, thresholdKKTP);
    alasanStatus = `Dihitung dari ${scoredInitialEvidenceViews.length} bukti asesmen ternormalisasi ke skala 0–100 (rata-rata ${normalizedEvidenceAvg100} vs KKTP ${thresholdKKTP}).`;
  } else if (initialEvidenceViews.length > 0) {
    const decided = initialEvidenceViews.filter((v) => v.status !== 'Belum Dinilai');
    if (decided.some((v) => v.status === 'Perlu Bimbingan')) {
      status = 'Perlu Bimbingan';
      alasanStatus = `Berdasarkan ${decided.length} bukti observasi guru tanpa skor angka yang menandai perlu bimbingan.`;
    } else if (decided.length > 0) {
      status = 'Tercapai';
      alasanStatus = `Berdasarkan ${decided.length} bukti observasi guru tanpa skor angka yang menandai tercapai.`;
    } else {
      status = 'Belum Dinilai';
      insufficientEvidence = true;
      alasanStatus = `Bukti belum cukup: terdapat ${initialEvidenceViews.length} catatan observasi tanpa skor dan belum ditetapkan status ketercapaiannya.`;
    }
  } else {
    insufficientEvidence = true;
  }

  // Sub-TP Analysis: STRICTLY uses initial Sub-TP-specific evidence so reassessment never mutates initial Sub-TP state!
  const subTpList = Array.isArray(tp.subTP) ? tp.subTP : [];
  let hasAnySubTpEvidence = false;
  const subTpResults: StudentSubTPMasteryResult[] = subTpList.map((sub) => {
    const subEvidences = initialEvidenceViews.filter((v) => doesEvidenceMatchSubTP(v.evidence, sub));
    if (subEvidences.length === 0) {
      return {
        subTpId: sub.id,
        subTpKode: sub.kode,
        fokusMateri: sub.fokusMateri,
        status: 'Bukti belum cukup',
        evidences: [],
        averageScore100: null,
        alasan: 'Bukti belum cukup untuk menyimpulkan ketercapaian Sub-TP ini secara spesifik.',
      };
    }

    hasAnySubTpEvidence = true;
    const scoredSub = subEvidences.filter((v) => v.normalizedScore100 !== null);
    if (scoredSub.length > 0) {
      const avg = Math.round(
        scoredSub.reduce((s, v) => s + (v.normalizedScore100 as number), 0) / scoredSub.length
      );
      const subStatus = classifyMasteryStatusKKTP(avg, thresholdKKTP);
      return {
        subTpId: sub.id,
        subTpKode: sub.kode,
        fokusMateri: sub.fokusMateri,
        status: subStatus,
        evidences: subEvidences,
        averageScore100: avg,
        alasan:
          subStatus === 'Tercapai'
            ? `Rata-rata ${scoredSub.length} bukti Sub-TP ${sub.kode} (${avg}) memenuhi KKTP (>= ${thresholdKKTP}).`
            : `Rata-rata ${scoredSub.length} bukti Sub-TP ${sub.kode} (${avg}) di bawah KKTP (${thresholdKKTP}).`,
      };
    }

    const decidedSub = subEvidences.filter((v) => v.status !== 'Belum Dinilai');
    if (decidedSub.length === 0) {
      return {
        subTpId: sub.id,
        subTpKode: sub.kode,
        fokusMateri: sub.fokusMateri,
        status: 'Bukti belum cukup',
        evidences: subEvidences,
        averageScore100: null,
        alasan: 'Bukti observasi Sub-TP belum memiliki skor maupun status ketercapaian.',
      };
    }

    const obsStatus: StatusKetercapaianBukti = decidedSub.some((v) => v.status === 'Perlu Bimbingan')
      ? 'Perlu Bimbingan'
      : 'Tercapai';
    return {
      subTpId: sub.id,
      subTpKode: sub.kode,
      fokusMateri: sub.fokusMateri,
      status: obsStatus,
      evidences: subEvidences,
      averageScore100: null,
      alasan: `Ditentukan dari ${decidedSub.length} bukti observasi Sub-TP ${sub.kode}.`,
    };
  });

  const subTpAnalysisNote =
    subTpList.length === 0
      ? 'TP ini belum memiliki rincian Sub-TP.'
      : hasAnySubTpEvidence
      ? 'Analisis Sub-TP menggunakan bukti spesifik Sub-TP yang tercatat; Sub-TP tanpa bukti ditandai "Bukti belum cukup".'
      : 'Hanya tersedia data tingkat TP; bukti spesifik per Sub-TP belum tersedia sehingga tidak menyimpulkan Sub-TP bermasalah.';

  const catatanMiskonsepsiGuru = initialEvidenceViews
    .map((v) => (v.evidence.catatanMiskonsepsi || '').trim())
    .filter(Boolean);

  const riwayatRemedialTP = (item.riwayatRemedial || []).filter(
    (r) =>
      r.tpId === tp.id ||
      (r.tpKode && tp.kode && r.tpKode.trim().toLowerCase() === tp.kode.trim().toLowerCase())
  );

  return {
    siswaId: item.siswaId,
    namaSiswa: item.nama,
    tpId: tp.id || tp.kode,
    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    thresholdKKTP,
    formatifScore,
    normalizedEvidenceAvg100,
    effectiveScore100,
    status,
    insufficientEvidence,
    alasanStatus,
    evidences: evidenceViews,
    initialEvidences: initialEvidenceViews,
    reassessmentEvidences: reassessmentEvidenceViews,
    subTpResults,
    subTpAnalysisNote,
    catatanMiskonsepsiGuru,
    riwayatRemedialTP,
  };
}

export function analyzeStudentMasteryOverview(
  item: NilaiSiswaItem,
  tpList: CustomTPItem[],
  options?: {
    bobotPolicy?: Partial<BobotNilaiKebijakan> | null;
    schoolProfile?: Pick<SchoolProfile, 'kktpMinTuntas'> | null;
  }
): StudentMasteryOverview {
  const tpResults = tpList.map((tp) => analyzeStudentTPMastery(item, tp, options));
  const dinilaiTPCount = tpResults.filter((r) => r.status !== 'Belum Dinilai').length;
  const tercapaiTPCount = tpResults.filter((r) => r.status === 'Tercapai').length;
  const perluBimbinganTPCount = tpResults.filter((r) => r.status === 'Perlu Bimbingan').length;
  const belumDinilaiTPCount = tpResults.filter((r) => r.status === 'Belum Dinilai').length;

  return {
    siswaId: item.siswaId,
    namaSiswa: item.nama,
    tpResults,
    dinilaiTPCount,
    tercapaiTPCount,
    perluBimbinganTPCount,
    belumDinilaiTPCount,
  };
}

export function analyzeClassLearningMastery(params: {
  daftarNilai: NilaiSiswaItem[];
  tpList: CustomTPItem[];
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null;
  schoolProfile?: Pick<SchoolProfile, 'kktpMinTuntas'> | null;
  ambangKelasHeuristikPersen?: number;
}): ClassLearningMasteryReport {
  const { daftarNilai, tpList, bobotPolicy, schoolProfile } = params;
  const kktpDefaultKelas = resolveEffectiveKKTPThreshold({ bobotPolicy, schoolProfile });
  const rawAmbang =
    params.ambangKelasHeuristikPersen ??
    bobotPolicy?.ambangKelasTindakLanjutPersen ??
    DEFAULT_CLASS_INTERVENTION_HEURISTIC_PERCENT;
  const ambangHeuristikPersen = Math.min(100, Math.max(1, Math.round(rawAmbang)));

  const studentOverviews = daftarNilai.map((item) =>
    analyzeStudentMasteryOverview(item, tpList, { bobotPolicy, schoolProfile })
  );

  const tpSummaries: ClassTPMasterySummary[] = tpList.map((tp) => {
    const thresholdKKTP = resolveEffectiveKKTPThreshold({ tp, bobotPolicy, schoolProfile });
    const perStudent = studentOverviews.map(
      (ov) =>
        ov.tpResults.find((r) => r.tpId === (tp.id || tp.kode) && r.tpKode === tp.kode) ||
        ov.tpResults.find((r) => r.tpKode === tp.kode)!
    );

    const tercapaiList = perStudent.filter((r) => r.status === 'Tercapai');
    const perluBimbinganList = perStudent.filter((r) => r.status === 'Perlu Bimbingan');
    const belumDinilaiList = perStudent.filter((r) => r.status === 'Belum Dinilai');

    const totalSiswa = perStudent.length;
    const dinilaiCount = tercapaiList.length + perluBimbinganList.length;
    const tercapaiCount = tercapaiList.length;
    const perluBimbinganCount = perluBimbinganList.length;
    const belumDinilaiCount = belumDinilaiList.length;

    const persentaseTercapai =
      dinilaiCount > 0 ? Math.round((tercapaiCount / dinilaiCount) * 100) : null;
    const persentasePerluBimbingan =
      dinilaiCount > 0 ? Math.round((perluBimbinganCount / dinilaiCount) * 100) : null;

    const catatanMiskonsepsiTerkumpul: { siswaNama: string; subTpKode?: string; catatan: string }[] = [];
    for (const r of perStudent) {
      for (const v of r.evidences) {
        const note = (v.evidence.catatanMiskonsepsi || '').trim();
        if (note) {
          catatanMiskonsepsiTerkumpul.push({
            siswaNama: r.namaSiswa,
            subTpKode: v.evidence.subTpKode,
            catatan: note,
          });
        }
      }
    }

    const subTpList = Array.isArray(tp.subTP) ? tp.subTP : [];
    const subTpSummaries: ClassSubTPMasterySummary[] = subTpList.map((sub) => {
      const subRows = perStudent
        .map((r) => r.subTpResults.find((sr) => sr.subTpId === sub.id || sr.subTpKode === sub.kode))
        .filter((sr): sr is StudentSubTPMasteryResult => Boolean(sr));
      const subTercapai = subRows.filter((sr) => sr.status === 'Tercapai').length;
      const subPerlu = subRows.filter((sr) => sr.status === 'Perlu Bimbingan').length;
      const subDinilai = subTercapai + subPerlu;
      const subBelum = subRows.length - subDinilai;
      return {
        subTpId: sub.id,
        subTpKode: sub.kode,
        fokusMateri: sub.fokusMateri,
        dinilaiCount: subDinilai,
        tercapaiCount: subTercapai,
        perluBimbinganCount: subPerlu,
        belumDinilaiCount: subBelum,
        persentaseTercapai: subDinilai > 0 ? Math.round((subTercapai / subDinilai) * 100) : null,
      };
    });

    const hasSpecificSubTPEvidence = subTpSummaries.some((s) => s.dinilaiCount > 0);

    // Follow-up Recommendation Logic (explicitly excludes unassessed students from denominator!)
    const targetIds = perluBimbinganList.map((r) => r.siswaId);
    const targetNames = perluBimbinganList.map((r) => r.namaSiswa);
    const dasarDataBase = `${dinilaiCount} siswa dinilai (${tercapaiCount} tercapai, ${perluBimbinganCount} perlu bimbingan) dari ${totalSiswa} siswa (${belumDinilaiCount} belum dinilai tidak dihitung gagal).`;

    let rekomendasi: FollowUpRecommendation;
    if (dinilaiCount === 0) {
      rekomendasi = {
        kind: 'belum_dapat_ditentukan',
        label: 'Belum Dapat Ditentukan (Bukti Belum Cukup)',
        alasan: `Belum ada bukti penilaian valid pada TP ${tp.kode}. Lengkapi penilaian atau catatan bukti terlebih dahulu.`,
        dasarData: dasarDataBase,
        targetSiswaIds: [],
        targetSiswaNames: [],
        ambangHeuristikPersen,
        sumberAturan: 'heuristik_produk_dapat_disesuaikan',
      };
    } else if (perluBimbinganCount === 0) {
      rekomendasi = {
        kind: 'belum_perlu_tindak_lanjut',
        label: 'Belum Perlu Tindak Lanjut Remedial',
        alasan: `Seluruh ${dinilaiCount} siswa yang sudah dinilai memenuhi KKTP >= ${thresholdKKTP} pada TP ${tp.kode}.`,
        dasarData: dasarDataBase,
        targetSiswaIds: [],
        targetSiswaNames: [],
        ambangHeuristikPersen,
        sumberAturan: 'heuristik_produk_dapat_disesuaikan',
      };
    } else if (perluBimbinganCount === 1) {
      rekomendasi = {
        kind: 'individu',
        label: 'Pendampingan Individu',
        alasan: `1 peserta didik (${targetNames[0]}) berada di bawah KKTP ${thresholdKKTP}. Disarankan bimbingan individual sesuai catatan bukti/kompetensi terkait.`,
        dasarData: dasarDataBase,
        targetSiswaIds: targetIds,
        targetSiswaNames: targetNames,
        ambangHeuristikPersen,
        sumberAturan: 'heuristik_produk_dapat_disesuaikan',
      };
    } else if ((persentasePerluBimbingan ?? 0) > ambangHeuristikPersen) {
      rekomendasi = {
        kind: 'kelas_keseluruhan',
        label: 'Tinjau Pendekatan Pembelajaran Kelas',
        alasan: `Proporsi siswa dinilai yang belum mencapai KKTP (${persentasePerluBimbingan}% = ${perluBimbinganCount}/${dinilaiCount}) melampaui ambang heuristik guru ${ambangHeuristikPersen}%. Disarankan penguatan/peninjauan ulang pembelajaran secara klasikal.`,
        dasarData: dasarDataBase,
        targetSiswaIds: targetIds,
        targetSiswaNames: targetNames,
        ambangHeuristikPersen,
        sumberAturan: 'heuristik_produk_dapat_disesuaikan',
      };
    } else {
      rekomendasi = {
        kind: 'kelompok_kecil',
        label: 'Bimbingan Kelompok Kecil',
        alasan: `${perluBimbinganCount} peserta didik (${persentasePerluBimbingan}% dari siswa dinilai) berada di bawah KKTP ${thresholdKKTP}. Disarankan bimbingan kelompok kecil yang terdiferensiasi.`,
        dasarData: dasarDataBase,
        targetSiswaIds: targetIds,
        targetSiswaNames: targetNames,
        ambangHeuristikPersen,
        sumberAturan: 'heuristik_produk_dapat_disesuaikan',
      };
    }

    return {
      tpId: tp.id || tp.kode,
      tpKode: tp.kode,
      materiPokok: tp.materiPokok,
      thresholdKKTP,
      totalSiswa,
      dinilaiCount,
      belumDinilaiCount,
      tercapaiCount,
      perluBimbinganCount,
      persentaseTercapai,
      persentasePerluBimbingan,
      hasSpecificSubTPEvidence,
      subTpSummaries,
      catatanMiskonsepsiTerkumpul,
      rekomendasi,
    };
  });

  return {
    kktpDefaultKelas,
    ambangHeuristikPersen,
    totalSiswa: daftarNilai.length,
    tpSummaries,
    studentOverviews,
  };
}
