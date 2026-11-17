import type { CustomTPItem } from './schoolProfileStorage';
import {
  PROGRESSION_STAGE_ORDER,
  parseExactFaseCode,
  type CurriculumTopicEntry,
  type SpiralTopicRelation,
  type TopicBankValidationReport,
  type TopicValidationIssue,
} from '../data/kurikulumTopicBankTypes';

const COSMETIC_SPIRAL_SUFFIX_RE =
  /\s*(?:\(|-|—|:)?\s*(?:kelanjutan\s+spiral|pendalaman\s+spiral|lanjutan\s+sem(?:ester)?\s*(?:2|genap)|lanjutan|bagian\s*[2ii]|tahap\s*[2ii]|part\s*[2ii])\)?\s*$/i;

export function normalizeTopicSemanticKey(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripCosmeticTopicSuffix(title: string): string {
  let prev = (title || '').trim();
  for (let i = 0; i < 3; i++) {
    const next = prev.replace(COSMETIC_SPIRAL_SUFFIX_RE, '').trim();
    if (next === prev) break;
    prev = next;
  }
  return normalizeTopicSemanticKey(prev);
}

export function isValidSpiralProgression(
  relation: SpiralTopicRelation | undefined,
  prevEntry?: Partial<Pick<CurriculumTopicEntry, 'tujuanPembelajaran' | 'kompetensiInti'>>,
  nextEntry?: Partial<Pick<CurriculumTopicEntry, 'tujuanPembelajaran' | 'kompetensiInti'>>
): boolean {
  if (!relation) return false;
  const hasRequiredFields =
    Boolean(relation.previousTopicId?.trim()) &&
    Boolean(relation.reactivatedConcept?.trim()) &&
    Boolean(relation.newCompetency?.trim()) &&
    Boolean(relation.depthDifference?.trim()) &&
    Boolean(relation.newContextOrApplication?.trim()) &&
    Boolean(relation.pedagogicalReason?.trim());

  if (!hasRequiredFields) return false;

  if (prevEntry && nextEntry) {
    const prevComp = normalizeTopicSemanticKey(
      `${prevEntry.tujuanPembelajaran || ''} ${prevEntry.kompetensiInti || ''}`
    );
    const nextComp = normalizeTopicSemanticKey(
      `${nextEntry.tujuanPembelajaran || ''} ${nextEntry.kompetensiInti || ''}`
    );
    if (prevComp && nextComp && prevComp === nextComp) {
      return false;
    }
  }
  return true;
}

/**
 * Validator murni bank topik untuk mendeteksi duplikasi ID, duplikasi antarsemester
 * tanpa progresi, label spiral kosong, fase tertukar, prasyarat hilang, atau lompatan tahap.
 */
export function validateTopicBankEntries(entries: CurriculumTopicEntry[]): TopicBankValidationReport {
  const issues: TopicValidationIssue[] = [];
  const byId = new Map<string, CurriculumTopicEntry>();
  const scopeTitleMap = new Map<string, CurriculumTopicEntry[]>();
  const scopeBaseTitleMap = new Map<string, CurriculumTopicEntry[]>();

  for (const entry of entries) {
    // 1. Duplikasi topicId
    if (byId.has(entry.topicId)) {
      issues.push({
        id: `dup_id::${entry.topicId}`,
        severity: 'blocking',
        code: 'DUPLICATE_TOPIC_ID',
        topicId: entry.topicId,
        mataPelajaran: entry.mataPelajaran,
        message: `Duplikasi topicId "${entry.topicId}" pada mata pelajaran ${entry.mataPelajaran}.`,
      });
    } else {
      byId.set(entry.topicId, entry);
    }

    // 2. Elemen CP tidak boleh kosong
    if (!entry.elemenCP?.trim() || !entry.relevansiCP?.trim()) {
      issues.push({
        id: `missing_cp::${entry.topicId}`,
        severity: 'warning',
        code: 'MISSING_ELEMEN_CP',
        topicId: entry.topicId,
        mataPelajaran: entry.mataPelajaran,
        message: `Topik "${entry.judulTopik}" (${entry.topicId}) belum memiliki elemen CP atau relevansi CP yang memadai.`,
      });
    }

    // 3. Kesesuaian fase pada label fase vs faseCode
    const parsedFromLabel = parseExactFaseCode(entry.fase, entry.suggestedGrade);
    if (parsedFromLabel !== entry.faseCode) {
      issues.push({
        id: `fase_mismatch::${entry.topicId}`,
        severity: 'blocking',
        code: 'FASE_MISMATCH',
        topicId: entry.topicId,
        mataPelajaran: entry.mataPelajaran,
        message: `Topik "${entry.judulTopik}" menuliskan fase "${entry.fase}" namun faseCode "${entry.faseCode}".`,
      });
    }

    // 4. Label spiral wajib punya progresi kompetensi terjelaskan
    const titleLooksSpiral = /\bspiral\b/i.test(
      `${entry.judulTopik} ${entry.kompetensiYangDikembangkan} ${entry.tujuanPembelajaran}`
    );
    if (entry.spiralRelation || titleLooksSpiral) {
      const prev = entry.spiralRelation?.previousTopicId
        ? byId.get(entry.spiralRelation.previousTopicId)
        : undefined;
      if (!isValidSpiralProgression(entry.spiralRelation, prev, entry)) {
        issues.push({
          id: `invalid_spiral::${entry.topicId}`,
          severity: 'blocking',
          code: 'SPIRAL_WITHOUT_COMPETENCY_PROGRESSION',
          topicId: entry.topicId,
          mataPelajaran: entry.mataPelajaran,
          message: `Topik "${entry.judulTopik}" (${entry.topicId}) menyebut atau menautkan spiral tanpa penjelasan lengkap kompetensi baru, perbedaan kedalaman, dan alasan pedagogis.`,
        });
      }
    }

    // 5. Kumpulkan berdasarkan scope (mapel + jenjang + fase)
    const exactScopeKey = [
      normalizeTopicSemanticKey(entry.mataPelajaran),
      entry.jenjang,
      entry.faseCode,
      normalizeTopicSemanticKey(entry.judulTopik),
    ].join('::');

    const prevExactList = scopeTitleMap.get(exactScopeKey) || [];
    for (const existing of prevExactList) {
      if (existing.suggestedSemester === entry.suggestedSemester) {
        issues.push({
          id: `dup_title::${existing.topicId}::${entry.topicId}`,
          severity: 'blocking',
          code: 'DUPLICATE_TITLE_SCOPE',
          topicId: entry.topicId,
          mataPelajaran: entry.mataPelajaran,
          message: `Judul topik identik "${entry.judulTopik}" muncul ganda pada ${entry.mataPelajaran} ${entry.faseCode} (${entry.suggestedSemester}).`,
        });
      } else {
        // Muncul di Sem 1 & Sem 2: sah HANYA bila ada spiralRelation yang valid
        const isLegalSpiral =
          isValidSpiralProgression(entry.spiralRelation, existing, entry) ||
          isValidSpiralProgression(existing.spiralRelation, entry, existing);
        if (!isLegalSpiral) {
          issues.push({
            id: `cross_sem_no_prog::${existing.topicId}::${entry.topicId}`,
            severity: 'blocking',
            code: 'SAME_TOPIC_ACROSS_SEMESTERS_NO_PROGRESSION',
            topicId: entry.topicId,
            mataPelajaran: entry.mataPelajaran,
            message: `Topik "${entry.judulTopik}" muncul di dua semester (${entry.mataPelajaran} ${entry.faseCode}) tanpa hubungan progresi spiral yang sah.`,
          });
        }
      }
    }
    scopeTitleMap.set(exactScopeKey, [...prevExactList, entry]);

    const strippedScopeKey = [
      normalizeTopicSemanticKey(entry.mataPelajaran),
      entry.jenjang,
      entry.faseCode,
      stripCosmeticTopicSuffix(entry.judulTopik),
    ].join('::');
    const prevStrippedList = scopeBaseTitleMap.get(strippedScopeKey) || [];
    for (const existing of prevStrippedList) {
      if (existing.topicId === entry.topicId) continue;
      if (normalizeTopicSemanticKey(existing.judulTopik) !== normalizeTopicSemanticKey(entry.judulTopik)) {
        const compA = normalizeTopicSemanticKey(existing.tujuanPembelajaran);
        const compB = normalizeTopicSemanticKey(entry.tujuanPembelajaran);
        if (compA === compB) {
          issues.push({
            id: `cosmetic_dup::${existing.topicId}::${entry.topicId}`,
            severity: 'blocking',
            code: 'COSMETIC_SUFFIX_DUPLICATE',
            topicId: entry.topicId,
            mataPelajaran: entry.mataPelajaran,
            message: `Topik "${entry.judulTopik}" hanya berbeda imbuhan judul dari "${existing.judulTopik}" dengan tujuan pembelajaran yang identik.`,
          });
        }
      }
    }
    scopeBaseTitleMap.set(strippedScopeKey, [...prevStrippedList, entry]);
  }

  // 6. Cek prasyaratTopicIds & lompatan progresi
  for (const entry of entries) {
    for (const prereqId of entry.prasyaratTopicIds || []) {
      const prereq = byId.get(prereqId);
      if (!prereq) {
        issues.push({
          id: `missing_prereq::${entry.topicId}::${prereqId}`,
          severity: 'warning',
          code: 'MISSING_PREREQUISITE_TOPIC',
          topicId: entry.topicId,
          mataPelajaran: entry.mataPelajaran,
          message: `Prasyarat topik "${prereqId}" yang dirujuk oleh "${entry.judulTopik}" tidak ditemukan pada kumpulan bank topik yang diperiksa.`,
        });
      } else {
        const diff = PROGRESSION_STAGE_ORDER[entry.progressionStage] - PROGRESSION_STAGE_ORDER[prereq.progressionStage];
        if (diff >= 4) {
          issues.push({
            id: `jump_warn::${entry.topicId}::${prereqId}`,
            severity: 'info',
            code: 'PROGRESSION_JUMP_WARNING',
            topicId: entry.topicId,
            mataPelajaran: entry.mataPelajaran,
            message: `Topik "${entry.judulTopik}" (${entry.progressionStage}) melompat jauh langsung dari "${prereq.judulTopik}" (${prereq.progressionStage}); pertimbangkan langkah pengembangan antara.`,
          });
        }
      }
    }
  }

  const blockingCount = issues.filter((i) => i.severity === 'blocking').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    isValid: blockingCount === 0,
    blockingCount,
    warningCount,
    infoCount,
    issues,
  };
}

/**
 * Memvalidasi dua daftar TP / Topik (Semester 1 vs Semester 2) dalam satu kelas/fase
 * untuk mendeteksi kloning otomatis atau duplikasi tanpa perkembangan kompetensi.
 */
export function validateSemesterPlanProgression(
  sem1Topics: Array<Pick<CustomTPItem, 'id' | 'kode' | 'materiPokok' | 'tujuanPembelajaran' | 'kompetensiInti' | 'spiralRelation'>>,
  sem2Topics: Array<Pick<CustomTPItem, 'id' | 'kode' | 'materiPokok' | 'tujuanPembelajaran' | 'kompetensiInti' | 'spiralRelation'>>
): TopicValidationIssue[] {
  const issues: TopicValidationIssue[] = [];
  const sem1ByBaseTitle = new Map<string, (typeof sem1Topics)[number]>();

  for (const t1 of sem1Topics) {
    const key = stripCosmeticTopicSuffix(t1.materiPokok);
    if (key) sem1ByBaseTitle.set(key, t1);
  }

  for (const t2 of sem2Topics) {
    const baseKey = stripCosmeticTopicSuffix(t2.materiPokok);
    const matchingSem1 = sem1ByBaseTitle.get(baseKey);
    const hasLegacySpiralSuffix =
      (t2.kompetensiInti || '').includes('Pendalaman spiral Semester Genap') ||
      /kelanjutan\s+spiral/i.test(`${t2.materiPokok} ${t2.kompetensiInti || ''}`);

    if (matchingSem1) {
      const hasValidSpiral = isValidSpiralProgression(
        t2.spiralRelation,
        matchingSem1,
        t2
      );
      if (!hasValidSpiral || hasLegacySpiralSuffix) {
        issues.push({
          id: `sem2_clone::${t2.id}`,
          severity: hasLegacySpiralSuffix ? 'warning' : 'warning',
          code: hasLegacySpiralSuffix
            ? 'COSMETIC_SUFFIX_DUPLICATE'
            : 'SAME_TOPIC_ACROSS_SEMESTERS_NO_PROGRESSION',
          topicId: t2.id,
          message: hasLegacySpiralSuffix
            ? `Materi Semester 2 (${t2.kode}: "${t2.materiPokok}") terindikasi menggunakan label spiral generik lama yang mengulang Semester 1 (${matchingSem1.kode}).`
            : `Materi Semester 2 (${t2.kode}: "${t2.materiPokok}") sama dengan Semester 1 (${matchingSem1.kode}) tanpa catatan progresi spiral yang memadai.`,
        });
      }
    }
  }

  return issues;
}

export interface LegacySem2CloneReport {
  hasSuspectedClones: boolean;
  suspectedTpIds: string[];
  issues: TopicValidationIssue[];
  /** Salinan daftar Semester 2 yang sudah diberi penanda non-destruktif perlu_ditinjau (jika belum disetujui guru). */
  annotatedSem2List: CustomTPItem[];
}

/**
 * Audit non-destruktif untuk data tersimpan lama Semester 2.
 * Jika suatu TP Semester 2 identik dengan TP Semester 1 dan belum disetujui guru (`statusReview !== 'disetujui'`),
 * sistem menandainya sebagai `perlu_ditinjau` tanpa menghapus atau menimpa data guru.
 */
export function detectSuspectedLegacySem2Clones(
  sem1List: CustomTPItem[],
  sem2List: CustomTPItem[],
  options?: { isEditedByGuru?: boolean }
): LegacySem2CloneReport {
  const issues = validateSemesterPlanProgression(sem1List, sem2List);
  const suspectedIds = new Set(issues.map((i) => i.topicId).filter(Boolean) as string[]);

  const annotatedSem2List = sem2List.map((tp) => {
    if (!suspectedIds.has(tp.id)) return tp;
    if (tp.legacyDuplicationReview?.status === 'disetujui_guru' || tp.statusReview === 'disetujui') {
      return tp;
    }
    // Pertahankan data asli guru sepenuhnya; hanya tambahkan metadata peninjauan
    return {
      ...tp,
      legacyDuplicationReview: {
        isSuspectedLegacyClone: true,
        status: 'perlu_ditinjau' as const,
        reason: options?.isEditedByGuru
          ? 'Materi serupa dengan Semester 1 ditemukan pada data tersimpan — mohon tinjau apakah memang dimaksudkan sebagai kelanjutan spiral berprogresi.'
          : 'Terdeteksi pengulangan otomatis dari template Semester 1 sebelumnya; pertimbangkan memperbarui ke topik progresif Semester 2.',
      },
    };
  });

  return {
    hasSuspectedClones: suspectedIds.size > 0,
    suspectedTpIds: Array.from(suspectedIds),
    issues,
    annotatedSem2List,
  };
}
