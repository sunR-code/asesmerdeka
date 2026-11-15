import type {
  AsesmenDokumen,
  AssessmentQualitySummary,
  ButirSoal,
  QuestionValidationIssue,
  TPTraceabilityItem,
} from '../types/assessment';
import {
  analyzeCognitiveDistribution,
  analyzeQuestionCognitiveDemand,
} from './cognitiveLevelEngine';

export const UNIFIED_KKTP_INTERVALS = {
  perluBimbingan: '0 - 60',
  cukup: '61 - 70',
  baik: '71 - 85',
  sangatBaik: '86 - 100',
} as const;

const GENERIC_ASSESSMENT_SLOP_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /^\[(Variasi Penalaran|Analisis Lanjutan|Studi Kasus Lanjutan|Pengayaan Butir)\s*#\d+\]/i,
    reason: 'Butir hasil pengulangan/kloning templat otomatis',
  },
  {
    pattern: /mengapa\s+pemahaman\s+konsep\s+dasar\s+pada\s+materi/i,
    reason: 'Pertanyaan meta-generik yang hanya menyisipkan nama topik',
  },
  {
    pattern: /agar\s+bisa\s+menebak\s+tanpa\s+perlu\s+membaca\s+soal/i,
    reason: 'Distraktor klise tidak masuk akal secara pedagogis',
  },
  {
    pattern: /\b(lorem\s+ipsum|todo:|placeholder|pilihan\s+jawaban\s+\d+|pernyataan\s+pelengkap\s+\d+)\b/i,
    reason: 'Mengandung placeholder atau teks pelengkap generik',
  },
];

const TOPIC_STOPWORDS = new Set([
  'yang', 'dan', 'atau', 'dari', 'dalam', 'pada', 'untuk', 'dengan', 'oleh',
  'adalah', 'secara', 'melalui', 'terhadap', 'serta', 'agar', 'karena', 'sebagai',
  'peserta', 'didik', 'siswa', 'guru', 'materi', 'konsep', 'tujuan', 'pembelajaran',
  'mampu', 'dapat', 'menjelaskan', 'memahami', 'menganalisis', 'mengidentifikasi',
  'menentukan', 'berikut', 'manakah', 'pernyataan', 'tepat', 'benar', 'salah',
]);

export function normalizeQuestionText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/^\[[^\]]+\]\s*/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeTextJaccardSimilarity(a: string, b: string): number {
  const normA = normalizeQuestionText(a);
  const normB = normalizeQuestionText(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  const setA = new Set(normA.split(' ').filter((w) => w.length >= 2));
  const setB = new Set(normB.split(' ').filter((w) => w.length >= 2));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function extractMeaningfulKeywords(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !TOPIC_STOPWORDS.has(w));
}

export function isSDLevelPhase(jenjangFase?: string, kelas?: string): boolean {
  const f = (jenjangFase || '').toLowerCase();
  const k = (kelas || '').trim();
  return (
    f.includes('sd') ||
    f.includes('mi') ||
    f.includes('fase a') ||
    f.includes('fase b') ||
    f.includes('fase c') ||
    ['1', '2', '3', '4', '5', '6'].includes(k)
  );
}

export function isSMALevelPhase(jenjangFase?: string, kelas?: string): boolean {
  const f = (jenjangFase || '').toLowerCase();
  const k = (kelas || '').trim().toUpperCase();
  return (
    f.includes('sma') ||
    f.includes('smk') ||
    /\bma\b/.test(f) ||
    f.includes('fase e') ||
    f.includes('fase f') ||
    ['10', '11', '12', 'X', 'XI', 'XII'].includes(k)
  );
}

export function detectExplanationKeyContradiction(
  pembahasan: string,
  actualKey: string
): string | null {
  const cleanActual = (actualKey || '').trim().toUpperCase();
  if (!pembahasan || !cleanActual) return null;

  const patterns = [
    /\(Pilihan\s+([A-E])\)/gi,
    /\bjawaban\s+(?:yang\s+)?(?:benar|tepat)\s+adalah\s+(?:pilihan|opsi)?\s*([A-E])\b/gi,
    /\[Kunci:\s*([A-E])\]/gi,
    /\badalah\s+(?:pilihan|opsi)\s+([A-E])\b/gi,
  ];

  for (const regex of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(pembahasan)) !== null) {
      const mentioned = match[1]?.toUpperCase();
      if (mentioned && mentioned !== cleanActual) {
        return `Pembahasan merujuk opsi "${mentioned}", namun kunci resmi tercatat "${cleanActual}".`;
      }
    }
  }
  return null;
}

export function validateSingleQuestion(
  soal: ButirSoal,
  options?: {
    expectedOptionCount?: 4 | 5;
    tpMap?: TPTraceabilityItem[];
    peerQuestions?: ButirSoal[];
    materiPokok?: string;
    strictTpAlignment?: boolean;
  }
): QuestionValidationIssue[] {
  const issues: QuestionValidationIssue[] = [];
  const expectedOptionCount = options?.expectedOptionCount ?? 4;

  const addIssue = (
    severity: 'error' | 'warning',
    code: QuestionValidationIssue['code'],
    message: string
  ) => {
    issues.push({
      questionId: soal.id,
      nomor: soal.nomor,
      severity,
      code,
      message,
    });
  };

  // 1. Kelengkapan redaksi pertanyaan & anti-slop
  const stem = (soal.pertanyaan || '').trim();
  if (stem.length < 10) {
    addIssue('error', 'empty_question', `Butir #${soal.nomor}: redaksi pertanyaan kosong atau terlalu singkat.`);
  }
  const combinedForSlop = `${soal.stimulus || ''} ${stem} ${
    soal.tipe === 'pilihan_ganda' ? soal.pilihan.map((p) => p.teks).join(' ') : ''
  }`;
  for (const slop of GENERIC_ASSESSMENT_SLOP_PATTERNS) {
    if (slop.pattern.test(combinedForSlop)) {
      addIssue('warning', 'generic_slop', `Butir #${soal.nomor}: ${slop.reason}.`);
      break;
    }
  }

  // 2. Duplikasi terhadap butir lain
  if (options?.peerQuestions && stem.length >= 12) {
    const peerMatch = options.peerQuestions.find(
      (other) =>
        other.id !== soal.id &&
        other.nomor < soal.nomor &&
        computeTextJaccardSimilarity(stem, other.pertanyaan || '') >= 0.85
    );
    if (peerMatch) {
      addIssue(
        'error',
        'duplicate_question',
        `Butir #${soal.nomor} sangat mirip/duplikat dengan Butir #${peerMatch.nomor}.`
      );
    }
  }

  // 3. Validasi spesifik tipe soal
  if (soal.tipe === 'pilihan_ganda') {
    const pilihan = Array.isArray(soal.pilihan) ? soal.pilihan : [];
    if (pilihan.length < expectedOptionCount) {
      addIssue(
        'error',
        'invalid_key',
        `Butir #${soal.nomor}: jumlah pilihan (${pilihan.length}) kurang dari standar jenjang (${expectedOptionCount} opsi).`
      );
    }
    const labels = new Set(pilihan.map((p) => (p.label || '').toUpperCase()));
    const keyUpper = (soal.kunci || '').toUpperCase();
    if (!keyUpper || !labels.has(keyUpper)) {
      addIssue(
        'error',
        'invalid_key',
        `Butir #${soal.nomor}: kunci jawaban "${soal.kunci}" tidak ada dalam daftar opsi (${Array.from(labels).join('/') || 'kosong'}).`
      );
    }

    // Duplikasi atau opsi kosong
    const seenOptionText = new Set<string>();
    let hasDuplicateOpt = false;
    let hasEmptyOpt = false;
    const optLengths: number[] = [];
    for (const p of pilihan) {
      const cleanOpt = normalizeQuestionText(p.teks || '');
      if (!cleanOpt) {
        hasEmptyOpt = true;
      } else if (seenOptionText.has(cleanOpt)) {
        hasDuplicateOpt = true;
      } else {
        seenOptionText.add(cleanOpt);
      }
      optLengths.push((p.teks || '').trim().length);
    }
    if (hasEmptyOpt || hasDuplicateOpt) {
      addIssue(
        'error',
        'duplicate_option',
        `Butir #${soal.nomor}: terdapat pilihan jawaban yang kosong atau kembar identik.`
      );
    } else if (optLengths.length >= 3) {
      const keyOpt = pilihan.find((p) => p.label === soal.kunci);
      const avgOtherLen =
        pilihan
          .filter((p) => p.label !== soal.kunci)
          .reduce((acc, p) => acc + (p.teks || '').trim().length, 0) /
        Math.max(1, pilihan.length - 1);
      if (keyOpt && keyOpt.teks.trim().length > Math.max(45, avgOtherLen * 3.2)) {
        addIssue(
          'warning',
          'weak_distractor',
          `Butir #${soal.nomor}: opsi kunci jauh lebih panjang daripada pengecohnya sehingga mudah ditebak.`
        );
      }
    }

    const pembahasan = (soal.pembahasan || '').trim();
    if (pembahasan.length < 15) {
      addIssue(
        'error',
        'missing_explanation',
        `Butir #${soal.nomor}: pembahasan masih kosong atau terlalu singkat (< 15 karakter).`
      );
    } else {
      const contradiction = detectExplanationKeyContradiction(pembahasan, soal.kunci);
      if (contradiction) {
        addIssue('error', 'explanation_key_mismatch', `Butir #${soal.nomor}: ${contradiction}`);
      }
    }
  } else if (soal.tipe === 'pilihan_ganda_kompleks') {
    const statements = Array.isArray(soal.pernyataan) ? soal.pernyataan : [];
    if (statements.length < 3) {
      addIssue(
        'error',
        'invalid_key',
        `Butir #${soal.nomor} (PGK): minimal harus memiliki 3 pernyataan.`
      );
    } else {
      const hasTrue = statements.some((s) => s.isBenar);
      const hasFalse = statements.some((s) => !s.isBenar);
      if (!hasTrue || !hasFalse) {
        addIssue(
          'warning',
          'weak_distractor',
          `Butir #${soal.nomor} (PGK): semua pernyataan bernilai seragam; sebaiknya memuat kombinasi Benar dan Salah.`
        );
      }
      const seenSt = new Set<string>();
      for (const s of statements) {
        const norm = normalizeQuestionText(s.teks || '');
        if (!norm || seenSt.has(norm)) {
          addIssue(
            'error',
            'duplicate_option',
            `Butir #${soal.nomor} (PGK): terdapat pernyataan kosong atau duplikat.`
          );
          break;
        }
        seenSt.add(norm);
      }
    }
    if ((soal.pembahasan || '').trim().length < 15) {
      addIssue(
        'error',
        'missing_explanation',
        `Butir #${soal.nomor} (PGK): pembahasan alasan Benar/Salah masih kosong.`
      );
    }
  } else if (soal.tipe === 'uraian') {
    if ((soal.contohJawaban || '').trim().length < 10) {
      addIssue(
        'error',
        'missing_explanation',
        `Butir #${soal.nomor} (Uraian): contoh jawaban/kunci acuan masih kosong.`
      );
    }
    if ((soal.pedomanPenskoran || '').trim().length < 10) {
      addIssue(
        'error',
        'missing_rubric',
        `Butir #${soal.nomor} (Uraian): pedoman penskoran/rubrik masih kosong.`
      );
    }
  }

  // 4. Validasi level kognitif Bloom nyata
  const cog = analyzeQuestionCognitiveDemand(soal);
  if (cog.isMismatch && !soal.teacherVerifiedCognitive) {
    addIssue(
      'warning',
      'cognitive_mismatch',
      `Butir #${soal.nomor}: ${cog.mismatchReason}`
    );
  }

  // 5. Keterkaitan TP / Sub-TP
  if (options?.tpMap && options.tpMap.length > 0) {
    const matchedTp = soal.tpId
      ? options.tpMap.find((tp) => tp.id === soal.tpId)
      : undefined;
    if (!matchedTp) {
      addIssue(
        options.strictTpAlignment ? 'error' : 'warning',
        'missing_tp_alignment',
        `Butir #${soal.nomor} belum terikat ke TP spesifik (tpId).`
      );
    } else {
      const tpKeywords = extractMeaningfulKeywords(
        `${matchedTp.materiPokok} ${matchedTp.deskripsi}`
      );
      if (tpKeywords.length >= 2) {
        const qBody = `${soal.stimulus || ''} ${soal.pertanyaan} ${soal.indikatorSoal || ''}`.toLowerCase();
        const overlap = tpKeywords.some((kw) => qBody.includes(kw));
        if (!overlap) {
          addIssue(
            'warning',
            'missing_tp_alignment',
            `Butir #${soal.nomor}: topik soal tampak kurang menyinggung kata kunci TP "${matchedTp.kode} (${matchedTp.materiPokok})".`
          );
        }
      }
    }
  }

  return issues;
}

export function validateAsesmenDokumen(
  doc: AsesmenDokumen,
  options?: {
    requestedLevel?: AsesmenDokumen['soalList'] extends never ? never : 'LOTS (C1-C2)' | 'MOTS (C3)' | 'HOTS (C4-C6)' | 'Campuran Berimbang';
    peerBankQuestions?: ButirSoal[];
    strictTpAlignment?: boolean;
  }
): AssessmentQualitySummary {
  const isSMA = isSMALevelPhase(doc.jenjangFase, doc.kelas);
  const expectedOptionCount: 4 | 5 = isSMA ? 5 : 4;
  const allIssues: QuestionValidationIssue[] = [];
  const warnings: string[] = [];
  const tpCoverageMap: Record<string, number> = {};

  for (const tp of doc.tpMap || []) {
    tpCoverageMap[tp.id] = 0;
  }

  const soalList = Array.isArray(doc.soalList) ? doc.soalList : [];
  if (soalList.length === 0) {
    warnings.push('Dokumen asesmen belum memiliki butir soal.');
  }

  for (const soal of soalList) {
    const peerList = [...soalList, ...(options?.peerBankQuestions || [])];
    const qIssues = validateSingleQuestion(soal, {
      expectedOptionCount,
      tpMap: doc.tpMap,
      peerQuestions: peerList,
      materiPokok: doc.materiPokok,
      strictTpAlignment: options?.strictTpAlignment,
    });
    allIssues.push(...qIssues);
    if (soal.tpId) {
      tpCoverageMap[soal.tpId] = (tpCoverageMap[soal.tpId] || 0) + 1;
    }
  }

  const dist = analyzeCognitiveDistribution(soalList, options?.requestedLevel);
  if (dist.warning) {
    warnings.push(dist.warning);
  }

  if (doc.usedFallback || doc.generationSource === 'adaptive_fallback') {
    warnings.push(
      doc.fallbackReason ||
        'Asesmen disusun dengan kerangka templat offline (non-AI); wajib ditinjau guru sebelum digunakan.'
    );
  }

  if (doc.tpMap && doc.tpMap.length > 1) {
    const uncovered = doc.tpMap.filter((tp) => (tpCoverageMap[tp.id] || 0) === 0);
    if (uncovered.length > 0) {
      warnings.push(
        `TP berikut belum terwakili oleh butir soal apa pun: ${uncovered.map((t) => t.kode).join(', ')}.`
      );
    }
  }

  const duplicateCount = allIssues.filter((i) => i.code === 'duplicate_question').length;
  const keyMismatchCount = allIssues.filter(
    (i) => i.code === 'invalid_key' || i.code === 'explanation_key_mismatch' || i.code === 'duplicate_option'
  ).length;
  const missingExplanationCount = allIssues.filter(
    (i) => i.code === 'missing_explanation' || i.code === 'missing_rubric'
  ).length;
  const cognitiveMismatchCount = allIssues.filter((i) => i.code === 'cognitive_mismatch').length;
  const unmappedTpCount = allIssues.filter((i) => i.code === 'missing_tp_alignment').length;

  const errorCount = allIssues.filter((i) => i.severity === 'error').length;
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length + warnings.length;

  const rawScore = Math.max(0, 100 - errorCount * 15 - warningCount * 5);
  const status: AssessmentQualitySummary['status'] =
    soalList.length === 0 || errorCount > 0
      ? 'invalid'
      : warningCount > 0 || doc.usedFallback
        ? 'needs_review'
        : 'valid';

  return {
    status,
    score: rawScore,
    totalIssues: allIssues.length,
    duplicateCount,
    keyMismatchCount,
    missingExplanationCount,
    cognitiveMismatchCount,
    unmappedTpCount,
    distribution: dist.counts,
    tpCoverageMap,
    issues: allIssues,
    warnings,
    canFinalize: soalList.length > 0 && errorCount === 0,
  };
}

export function enrichDocWithQualityAndCognitive(
  doc: AsesmenDokumen,
  options?: {
    requestedLevel?: 'LOTS (C1-C2)' | 'MOTS (C3)' | 'HOTS (C4-C6)' | 'Campuran Berimbang';
    peerBankQuestions?: ButirSoal[];
  }
): AsesmenDokumen {
  const tpMap = doc.tpMap || [];
  const enrichedSoal: ButirSoal[] = (doc.soalList || []).map((soal, idx) => {
    const fallbackTp = tpMap.length > 0 ? tpMap[idx % tpMap.length] : undefined;
    const assignedTpId = soal.tpId || fallbackTp?.id;
    const assignedTpKode = soal.tpKode || fallbackTp?.kode;
    const cog = analyzeQuestionCognitiveDemand(soal);
    return {
      ...soal,
      tpId: assignedTpId,
      tpKode: assignedTpKode,
      bloomLevel: soal.bloomLevel || cog.claimedBloom || cog.inferredBloom,
      cognitiveTier: soal.cognitiveTier || cog.inferredTier,
      cognitiveRationale: soal.cognitiveRationale || cog.rationale,
      needsCognitiveReview: cog.needsTeacherReview,
      cognitiveMismatchReason: cog.mismatchReason,
    };
  });

  const tpIds = Array.from(
    new Set(enrichedSoal.map((s) => s.tpId).filter((id): id is string => Boolean(id)))
  );
  const subTpIds = Array.from(
    new Set(enrichedSoal.map((s) => s.subTpId).filter((id): id is string => Boolean(id)))
  );

  const nextDoc: AsesmenDokumen = {
    ...doc,
    tpIds: doc.tpIds?.length ? doc.tpIds : tpIds,
    subTpIds: doc.subTpIds?.length ? doc.subTpIds : subTpIds,
    soalList: enrichedSoal,
  };

  const summary = validateAsesmenDokumen(nextDoc, {
    requestedLevel: options?.requestedLevel,
    peerBankQuestions: options?.peerBankQuestions,
  });

  return {
    ...nextDoc,
    qualitySummary: summary,
  };
}

export function repairBalancedPGOptions(
  tpl: {
    opsi5: string[];
    kunci: string;
    pembahasan: string;
  },
  optionLetters: ('A' | 'B' | 'C' | 'D' | 'E')[],
  targetIndex: number
): {
  pilihan: { label: 'A' | 'B' | 'C' | 'D' | 'E'; teks: string }[];
  kunci: 'A' | 'B' | 'C' | 'D' | 'E';
  pembahasan: string;
} {
  const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  const cleanOptions = (tpl.opsi5 || []).map((opt) => (opt || '').trim()).filter(Boolean);
  const origKeyUpper = (tpl.kunci || '').trim().toUpperCase();
  const origKeyIdx =
    origKeyUpper in letterToIndex && letterToIndex[origKeyUpper] < cleanOptions.length
      ? letterToIndex[origKeyUpper]
      : 0;

  const correctText = cleanOptions[origKeyIdx] || cleanOptions[0] || 'Jawaban sesuai konsep materi';
  const distractors = cleanOptions.filter(
    (opt, idx) => idx !== origKeyIdx && normalizeQuestionText(opt) !== normalizeQuestionText(correctText)
  );

  const safeTargetIdx = Math.abs(targetIndex) % optionLetters.length;
  const targetLetter = optionLetters[safeTargetIdx];

  const finalTexts: string[] = new Array(optionLetters.length).fill('');
  finalTexts[safeTargetIdx] = correctText;

  let dCursor = 0;
  for (let idx = 0; idx < optionLetters.length; idx++) {
    if (idx === safeTargetIdx) continue;
    if (dCursor < distractors.length) {
      finalTexts[idx] = distractors[dCursor++];
    } else {
      finalTexts[idx] = `Alternatif pengecoh konteks ${optionLetters[idx]}`;
    }
  }

  let updatedPembahasan = (tpl.pembahasan || '').trim();
  updatedPembahasan = updatedPembahasan
    .replace(/\(Pilihan\s+[A-E]\)/gi, `(Pilihan ${targetLetter})`)
    .replace(/\badalah\s+(?:pilihan|opsi)\s+[A-E]\b/gi, `adalah pilihan ${targetLetter}`)
    .replace(/\bjawaban\s+(?:yang\s+)?(?:benar|tepat)\s+adalah\s+(?:pilihan|opsi)?\s*[A-E]\b/gi, `jawaban yang tepat adalah ${targetLetter}`)
    .replace(/\[Kunci:\s*[A-E]\]/gi, '')
    .trim();

  return {
    pilihan: optionLetters.map((label, idx) => ({
      label,
      teks: finalTexts[idx],
    })),
    kunci: targetLetter,
    pembahasan: `${updatedPembahasan} [Kunci: ${targetLetter}]`.trim(),
  };
}

export function selectSafeOptionIndexFromBank(
  rawOptions: string[],
  rawKeyLetter: string,
  expectedLength: number,
  targetSlotIdx: number
): {
  pilihan: { label: 'A' | 'B' | 'C' | 'D' | 'E'; teks: string }[];
  kunci: 'A' | 'B' | 'C' | 'D' | 'E';
  correctText: string;
} {
  const letters = (expectedLength <= 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']) as (
    | 'A'
    | 'B'
    | 'C'
    | 'D'
    | 'E'
  )[];
  const res = repairBalancedPGOptions(
    { opsi5: rawOptions, kunci: rawKeyLetter, pembahasan: '' },
    letters,
    targetSlotIdx
  );
  return {
    pilihan: res.pilihan,
    kunci: res.kunci,
    correctText: res.pilihan.find((p) => p.label === res.kunci)?.teks || '',
  };
}

export function buildAssessmentClipboardText(
  assessment: AsesmenDokumen,
  mode: 'worksheet' | 'teacher_guide' | 'kisi_kisi'
): string {
  let text = `${assessment.namaSekolah}\n`;
  text += `${assessment.judul.toUpperCase()}\n`;
  text += `Mata Pelajaran: ${assessment.mataPelajaran} | Kelas: ${assessment.kelas}\n`;
  text += `Alokasi Waktu: ${assessment.alokasiWaktu}\n\n`;

  text += `PETUNJUK UMUM:\n`;
  assessment.petunjukUmum.forEach((p, idx) => {
    text += `${idx + 1}. ${p}\n`;
  });
  text += `\n--- BUTIR SOAL ---\n\n`;

  assessment.soalList.forEach((soal) => {
    if (soal.tipe === 'pilihan_ganda') {
      text += `${soal.nomor}. ${soal.pertanyaan}\n`;
      if (soal.stimulus) text += `(Stimulus: ${soal.stimulus})\n`;
      soal.pilihan.forEach((opt) => {
        text += `   ${opt.label}. ${opt.teks}\n`;
      });
      if (mode === 'teacher_guide') {
        text += `   [Kunci: ${soal.kunci}] - Pembahasan: ${soal.pembahasan}\n`;
      }
      text += '\n';
    } else if (soal.tipe === 'pilihan_ganda_kompleks') {
      text += `${soal.nomor}. [AKM] ${soal.pertanyaan}\n`;
      if (soal.stimulus) text += `(Stimulus: ${soal.stimulus})\n`;
      soal.pernyataan.forEach((p, i) => {
        const suffix = mode === 'teacher_guide' ? ` -> [${p.isBenar ? 'BENAR' : 'SALAH'}]` : ' -> [Benar / Salah]';
        text += `   ${i + 1}. ${p.teks}${suffix}\n`;
      });
      if (mode === 'teacher_guide' && soal.pembahasan) {
        text += `   Pembahasan: ${soal.pembahasan}\n`;
      }
      text += '\n';
    } else if (soal.tipe === 'uraian') {
      text += `${soal.nomor}. [URAIAN] ${soal.pertanyaan}\n`;
      if (mode === 'teacher_guide') {
        text += `   Contoh Jawaban: ${soal.contohJawaban}\n`;
        text += `   Pedoman Penskoran: ${soal.pedomanPenskoran}\n`;
      }
      text += '\n';
    }
  });

  return text;
}
