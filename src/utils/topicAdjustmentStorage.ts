import {
  parseExactFaseCode,
  resolveNormalizedJenjang,
  resolveSafePedagogicalReviewStatus,
  type CurriculumTopicEntry,
  type ExactFaseCode,
  type TopicJenjangCategory,
  type TopicPedagogicalReviewStatus,
} from '../data/kurikulumTopicBankTypes';
import {
  TOPIC_ADJUSTMENT_STORAGE_V2_KEY,
  buildTopicAdjustmentScopeKey,
  resolveAcademicContext,
  type AcademicProfileLike,
} from './storageIdentity';

export interface TeacherTopicAdjustment {
  id: string;
  scopeKey: string;
  schoolId: string;
  jenjang: TopicJenjangCategory;
  mataPelajaran: string;
  faseCode: ExactFaseCode;
  topicId: string;
  originalTitle: string;
  proposedTitle?: string;
  proposedLingkupMateri?: string;
  proposedSemester?: '1 (Ganjil)' | '2 (Genap)';
  cpAlignmentNote?: string;
  inappropriateReason?: string;
  pedagogicalReviewStatus: TopicPedagogicalReviewStatus;
  needsReReview: boolean;
  updatedAt: string;
}

export interface SaveTopicAdjustmentInput {
  topicId: string;
  originalTitle: string;
  proposedTitle?: string;
  proposedLingkupMateri?: string;
  proposedSemester?: '1 (Ganjil)' | '2 (Genap)' | '';
  cpAlignmentNote?: string;
  inappropriateReason?: string;
  pedagogicalReviewStatus?: TopicPedagogicalReviewStatus;
  needsReReview?: boolean;
}

function readAdjustmentStore(): Record<string, TeacherTopicAdjustment> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(TOPIC_ADJUSTMENT_STORAGE_V2_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, TeacherTopicAdjustment>;
  } catch {
    return {};
  }
}

function writeAdjustmentStore(store: Record<string, TeacherTopicAdjustment>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TOPIC_ADJUSTMENT_STORAGE_V2_KEY, JSON.stringify(store));
  } catch {
    // ignore storage quota errors cleanly
  }
}

export function buildTopicAdjustmentCompositeId(
  scopeKey: string,
  topicId: string
): string {
  return `${scopeKey}::${topicId}`;
}

export function getTopicAdjustmentsForScope(
  profile?: AcademicProfileLike | null,
  explicitFase?: string
): Record<string, TeacherTopicAdjustment> {
  const scopeKey = buildTopicAdjustmentScopeKey(profile, explicitFase);
  const store = readAdjustmentStore();
  const scoped: Record<string, TeacherTopicAdjustment> = {};
  for (const item of Object.values(store)) {
    if (item && item.scopeKey === scopeKey && item.topicId) {
      scoped[item.topicId] = item;
    }
  }
  return scoped;
}

export function getTopicAdjustment(
  profile: AcademicProfileLike | null | undefined,
  topicId: string,
  explicitFase?: string
): TeacherTopicAdjustment | null {
  const scopeKey = buildTopicAdjustmentScopeKey(profile, explicitFase);
  const store = readAdjustmentStore();
  const compositeId = buildTopicAdjustmentCompositeId(scopeKey, topicId);
  return store[compositeId] || null;
}

/**
 * Menyimpan koreksi / penyesuaian topik lokal sekolah secara non-destruktif:
 * tidak mengubah bank topik global, tidak menimpa TP tersimpan, dan tidak membatalkan ATP.
 */
export function saveTopicAdjustment(
  profile: AcademicProfileLike | null | undefined,
  input: SaveTopicAdjustmentInput,
  explicitFase?: string
): TeacherTopicAdjustment {
  const ctx = resolveAcademicContext(profile, explicitFase);
  const scopeKey = buildTopicAdjustmentScopeKey(profile, explicitFase);
  const compositeId = buildTopicAdjustmentCompositeId(scopeKey, input.topicId);
  const faseCode = parseExactFaseCode(ctx.fase, ctx.kelas);
  const jenjang = (profile?.jenjang as TopicJenjangCategory) ||
    resolveNormalizedJenjang(ctx.fase, ctx.mataPelajaran, ctx.kelas);

  const safeStatus = resolveSafePedagogicalReviewStatus(input.pedagogicalReviewStatus);
  const record: TeacherTopicAdjustment = {
    id: compositeId,
    scopeKey,
    schoolId: ctx.schoolId,
    jenjang,
    mataPelajaran: ctx.mataPelajaran,
    faseCode,
    topicId: input.topicId,
    originalTitle: input.originalTitle,
    proposedTitle: input.proposedTitle?.trim() || undefined,
    proposedLingkupMateri: input.proposedLingkupMateri?.trim() || undefined,
    proposedSemester:
      input.proposedSemester === '1 (Ganjil)' || input.proposedSemester === '2 (Genap)'
        ? input.proposedSemester
        : undefined,
    cpAlignmentNote: input.cpAlignmentNote?.trim() || undefined,
    inappropriateReason: input.inappropriateReason?.trim() || undefined,
    pedagogicalReviewStatus: safeStatus,
    needsReReview: Boolean(input.needsReReview || safeStatus === 'perlu_revisi'),
    updatedAt: new Date().toISOString(),
  };

  const store = readAdjustmentStore();
  store[compositeId] = record;
  writeAdjustmentStore(store);
  return record;
}

export function removeTopicAdjustment(
  profile: AcademicProfileLike | null | undefined,
  topicId: string,
  explicitFase?: string
): void {
  const scopeKey = buildTopicAdjustmentScopeKey(profile, explicitFase);
  const compositeId = buildTopicAdjustmentCompositeId(scopeKey, topicId);
  const store = readAdjustmentStore();
  if (Object.prototype.hasOwnProperty.call(store, compositeId)) {
    delete store[compositeId];
    writeAdjustmentStore(store);
  }
}

export interface AdjustedCurriculumTopicEntry extends CurriculumTopicEntry {
  hasTeacherAdjustment?: boolean;
  teacherAdjustment?: TeacherTopicAdjustment;
}

/**
 * Menerapkan penyesuaian guru ke salinan lokal daftar topik tanpa memutasi bank global.
 */
export function applyTeacherAdjustmentsToTopicList(
  topics: CurriculumTopicEntry[],
  adjustments: Record<string, TeacherTopicAdjustment>
): AdjustedCurriculumTopicEntry[] {
  return topics.map((topic) => {
    const adj = adjustments[topic.topicId];
    if (!adj) return { ...topic };
    const effectiveTitle = adj.proposedTitle?.trim() || topic.judulTopik;
    return {
      ...topic,
      topik: effectiveTitle,
      judulTopik: effectiveTitle,
      lingkupMateri: adj.proposedLingkupMateri?.trim() || topic.lingkupMateri,
      suggestedSemester: adj.proposedSemester || topic.suggestedSemester,
      statusReviewPedagogis: adj.pedagogicalReviewStatus,
      hasTeacherAdjustment: true,
      teacherAdjustment: adj,
    };
  });
}
