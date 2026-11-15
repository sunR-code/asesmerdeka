import type {
  BloomLevel,
  ButirSoal,
  CognitiveTier,
  LevelKognitif,
} from '../types/assessment';

export interface CognitiveAnalysisResult {
  inferredBloom: BloomLevel;
  inferredTier: CognitiveTier;
  claimedBloom: BloomLevel | null;
  claimedTier: CognitiveTier | null;
  isMismatch: boolean;
  mismatchReason?: string;
  needsTeacherReview: boolean;
  rationale: string;
}

export interface CognitiveDistributionReport {
  total: number;
  counts: Record<CognitiveTier, number>;
  percentages: Record<CognitiveTier, number>;
  meetsRequestedTarget: boolean;
  warning?: string;
}

const BLOOM_TO_TIER: Record<BloomLevel, CognitiveTier> = {
  C1: 'LOTS',
  C2: 'LOTS',
  C3: 'MOTS',
  C4: 'HOTS',
  C5: 'HOTS',
  C6: 'HOTS',
};

const C6_VERBS =
  /\b(rancang|merancang|ciptakan|menciptakan|susunlah\s+(?:rencana|proyek|solusi|strategi|model)|desainlah|rumuskan\s+solusi|rekomendasikan\s+strategi|proyeksikan|design|create|formulate|construct)\b/i;
const C5_VERBS =
  /\b(evaluasi|mengevaluasi|nilai(?:lah)?\s+kebenaran|kritisi|putuskan|justifikasi|verifikasi|manakah\s+(?:pernyataan|kesimpulan|pendapat)\s+yang\s+paling\s+(?:tepat|benar|valid|keliru)|evaluate|justify|critique|judge)\b/i;
const C4_VERBS =
  /\b(analisis|menganalisis|analisislah|bandingkan|membandingkan|bedakan|korelasikan|mengapa\s+(?:hal|kejadian|hasil)|dampak(?:nya)?|kesalahan\s+pada\s+langkah|berdasarkan\s+(?:data|tabel|grafik|studi\s+kasus|wacana|teks)|interpretasikan|simpulkan|analyze|compare|contrast|infer)\b/i;
const C3_VERBS =
  /\b(hitunglah|tentukan\s+(?:nilai|hasil|besar|keliling|luas|volume|persentase|himpunan)|selesaikan|terapkan|aplikasikan|gunakan\s+(?:rumus|konsep|aturan)|konversikan|demonstrasikan|calculate|solve|apply|determine)\b/i;
const C2_VERBS =
  /\b(jelaskan\s+(?:pengertian|makna|arti)|uraikan\s+definisi|ringkaslah|berikan\s+contoh\s+sederhana|maksud\s+dari|interpretasi\s+sederhana|explain|summarize|classify)\b/i;
const C1_VERBS =
  /\b(sebutkan|siapa|kapan|di\s+mana|apa\s+(?:yang\s+dimaksud|arti|pengertian|nama|ibu\s+kota)|tuliskan\s+(?:definisi|urutan|bunyi)|manakah\s+yang\s+termasuk|definisi\s+dari|define|list|name|recall|identify)\b/i;

export function parseBloomLevel(raw?: string): BloomLevel | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const match = upper.match(/\bC([1-6])\b/);
  if (match) {
    return `C${match[1]}` as BloomLevel;
  }
  if (upper.includes('LOTS') || upper.includes('MENGINGAT')) return 'C1';
  if (upper.includes('MEMAHAMI')) return 'C2';
  if (upper.includes('MOTS') || upper.includes('MENERAPKAN')) return 'C3';
  if (upper.includes('MENGANALISIS') || upper.includes('ANALISIS')) return 'C4';
  if (upper.includes('MENGEVALUASI') || upper.includes('EVALUASI')) return 'C5';
  if (upper.includes('MENCIPTA') || upper.includes('KREASI')) return 'C6';
  if (upper.includes('HOTS')) return 'C4';
  return null;
}

export function bloomToTier(bloom: BloomLevel): CognitiveTier {
  return BLOOM_TO_TIER[bloom];
}

export function formatBloomLabel(bloom: BloomLevel): string {
  const desc: Record<BloomLevel, string> = {
    C1: 'Mengingat (LOTS)',
    C2: 'Memahami (LOTS)',
    C3: 'Menerapkan (MOTS)',
    C4: 'Menganalisis (HOTS)',
    C5: 'Mengevaluasi (HOTS)',
    C6: 'Mencipta (HOTS)',
  };
  return `${bloom} (${desc[bloom]})`;
}

export function analyzeQuestionCognitiveDemand(soal: ButirSoal): CognitiveAnalysisResult {
  const claimedBloom = parseBloomLevel(soal.bloomLevel || soal.levelKognitif);
  const claimedTier = claimedBloom ? BLOOM_TO_TIER[claimedBloom] : null;

  const stimulus = (soal.stimulus || '').trim();
  const stem = (soal.pertanyaan || '').trim();
  const indicator = (soal.indikatorSoal || '').trim();
  const combinedText = `${stimulus}\n${stem}\n${indicator}`.trim();

  const hasSubstantialStimulus = stimulus.length >= 60;
  const hasMultiStepNumbers = (combinedText.match(/\b\d+(?:[.,]\d+)?\b/g) || []).length >= 2;
  const hasContextualReasoningCue =
    /\b(jika|apabila|mengapa|bagaimana\s+jika|berdampak|solusi|strategi|kelemahan|kelebihan|kesimpulan)\b/i.test(
      stem
    );

  let inferredBloom: BloomLevel = 'C2';
  const rationaleParts: string[] = [];

  if (C6_VERBS.test(stem)) {
    inferredBloom = 'C6';
    rationaleParts.push('Meminta peserta didik merancang/merumuskan solusi atau strategi (C6).');
  } else if (C5_VERBS.test(stem)) {
    inferredBloom = 'C5';
    rationaleParts.push('Meminta evaluasi, validasi kebenaran, atau pengambilan keputusan (C5).');
  } else if (
    C4_VERBS.test(stem) ||
    (hasSubstantialStimulus && hasContextualReasoningCue) ||
    (soal.tipe === 'pilihan_ganda_kompleks' && hasSubstantialStimulus)
  ) {
    inferredBloom = 'C4';
    rationaleParts.push(
      'Menuntut analisis stimulus/data/kasus atau penalaran hubungan sebab-akibat (C4).'
    );
  } else if (C3_VERBS.test(stem) || (hasMultiStepNumbers && /\b(hitung|nilai|hasil|harga|waktu|jarak)\b/i.test(stem))) {
    inferredBloom = 'C3';
    rationaleParts.push('Menuntut penerapan prosedur/konsep/rumus pada konteks masalah (C3).');
  } else if (C1_VERBS.test(stem) && !hasContextualReasoningCue && !hasSubstantialStimulus) {
    inferredBloom = 'C1';
    rationaleParts.push('Menanyakan hafalan fakta/definisi langsung tanpa transfer konteks (C1).');
  } else if (C2_VERBS.test(stem) || stem.length > 0) {
    inferredBloom = 'C2';
    rationaleParts.push('Menguji pemahaman konsep atau klasifikasi dasar (C2).');
  }

  const inferredTier = BLOOM_TO_TIER[inferredBloom];

  let isMismatch = false;
  let mismatchReason: string | undefined;

  if (claimedTier && claimedTier !== inferredTier) {
    // Allow teacher/AI to mark C3 application on rich stimulus as MOTS vs HOTS only if tier jump is suspicious:
    // Flag clear LOTS recall masquerading as HOTS, or complex HOTS labeled C1 recall
    if (claimedTier === 'HOTS' && inferredTier === 'LOTS') {
      isMismatch = true;
      mismatchReason = `Label ${claimedBloom || soal.levelKognitif} (HOTS) tidak sebanding dengan redaksi soal yang masih menanyakan ingatan/pemahaman langsung (${inferredBloom}).`;
    } else if (claimedTier === 'LOTS' && inferredTier === 'HOTS') {
      isMismatch = true;
      mismatchReason = `Label ${claimedBloom || soal.levelKognitif} (LOTS) terlalu rendah untuk soal analisis/evaluasi berbasis kasus (${inferredBloom}).`;
    } else if (
      (claimedTier === 'HOTS' && inferredTier === 'MOTS' && !hasSubstantialStimulus && !C4_VERBS.test(stem) && !C5_VERBS.test(stem) && !C6_VERBS.test(stem)) ||
      (claimedTier === 'LOTS' && inferredTier === 'MOTS')
    ) {
      isMismatch = true;
      mismatchReason = `Klaim level ${claimedBloom || soal.levelKognitif} (${claimedTier}) berbeda dengan tuntutan kata kerja operasional soal (${inferredBloom}/${inferredTier}).`;
    }
  }

  const needsTeacherReview = Boolean(isMismatch && !soal.teacherVerifiedCognitive);

  return {
    inferredBloom,
    inferredTier,
    claimedBloom,
    claimedTier,
    isMismatch,
    mismatchReason,
    needsTeacherReview,
    rationale: rationaleParts.join(' '),
  };
}

export function analyzeCognitiveDistribution(
  soalList: ButirSoal[],
  requestedLevel?: LevelKognitif
): CognitiveDistributionReport {
  const counts: Record<CognitiveTier, number> = { LOTS: 0, MOTS: 0, HOTS: 0 };
  for (const soal of soalList) {
    const analysis = analyzeQuestionCognitiveDemand(soal);
    const effectiveTier =
      soal.teacherVerifiedCognitive && analysis.claimedTier
        ? analysis.claimedTier
        : analysis.inferredTier;
    counts[effectiveTier]++;
  }

  const total = soalList.length;
  const pct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);
  const percentages: Record<CognitiveTier, number> = {
    LOTS: pct(counts.LOTS),
    MOTS: pct(counts.MOTS),
    HOTS: pct(counts.HOTS),
  };

  let meetsRequestedTarget = true;
  let warning: string | undefined;

  if (total > 0 && requestedLevel) {
    if (requestedLevel === 'LOTS (C1-C2)' && counts.LOTS < Math.ceil(total * 0.7)) {
      meetsRequestedTarget = false;
      warning = `Permintaan level LOTS (C1-C2), tetapi hanya ${percentages.LOTS}% soal yang terukur sebagai LOTS.`;
    } else if (requestedLevel === 'MOTS (C3)' && counts.MOTS < Math.ceil(total * 0.6)) {
      meetsRequestedTarget = false;
      warning = `Permintaan level MOTS (C3), tetapi hanya ${percentages.MOTS}% soal yang terukur sebagai MOTS.`;
    } else if (requestedLevel === 'HOTS (C4-C6)' && counts.HOTS < Math.ceil(total * 0.7)) {
      meetsRequestedTarget = false;
      warning = `Permintaan level HOTS (C4-C6), tetapi baru ${percentages.HOTS}% soal yang terukur memenuhi tuntutan penalaran C4-C6.`;
    } else if (requestedLevel === 'Campuran Berimbang' && total >= 5) {
      // Target: ~20% LOTS, ~50% MOTS, ~30% HOTS (toleransi ±20 poin persentase untuk paket sedang)
      if (counts.HOTS === 0) {
        meetsRequestedTarget = false;
        warning =
          'Distribusi Campuran Berimbang (target 20% LOTS / 50% MOTS / 30% HOTS) belum memiliki soal HOTS (C4-C6) yang valid.';
      } else if (Math.abs(percentages.HOTS - 30) > 25 || Math.abs(percentages.LOTS - 20) > 25) {
        meetsRequestedTarget = false;
        warning = `Komposisi aktual LOTS ${percentages.LOTS}% / MOTS ${percentages.MOTS}% / HOTS ${percentages.HOTS}% menyimpang cukup jauh dari acuan seimbang 20% / 50% / 30%.`;
      }
    }
  }

  return {
    total,
    counts,
    percentages,
    meetsRequestedTarget,
    warning,
  };
}
