import type { GenerationRequest, LevelKognitif } from '../../types/assessment';

export interface PGTemplate {
  stimulus: string;
  pertanyaan: string;
  opsi5: string[]; // A, B, C, D, E
  kunci: string;
  pembahasan: string;
  levelKognitif: string;
  indikatorSoal: string;
}

export interface PGKTemplate {
  stimulus: string;
  pertanyaan: string;
  pernyataan: { teks: string; isBenar: boolean }[];
  pembahasan: string;
  levelKognitif: string;
  indikatorSoal: string;
}

export interface UraianTemplate {
  stimulus: string;
  pertanyaan: string;
  pedomanPenskoran: string;
  contohJawaban: string;
  levelKognitif: string;
  indikatorSoal: string;
}

export interface QuestionBank {
  capaianPembelajaran: string;
  tujuanPembelajaranDefault: string;
  pgPool: PGTemplate[];
  pgkPool: PGKTemplate[];
  uraianPool: UraianTemplate[];
}

export function isSDRequest(req: GenerationRequest): boolean {
  const f = req.jenjangFase.toLowerCase();
  const k = req.kelas.trim();
  return (
    f.includes('sd') ||
    f.includes('fase a') ||
    f.includes('fase b') ||
    f.includes('fase c') ||
    ['1', '2', '3', '4', '5', '6'].includes(k)
  );
}

export function isSMARequest(req: GenerationRequest): boolean {
  const f = req.jenjangFase.toLowerCase();
  const k = req.kelas.trim();
  return (
    f.includes('sma') ||
    f.includes('smk') ||
    f.includes('fase e') ||
    f.includes('fase f') ||
    ['10', '11', '12'].includes(k)
  );
}

/**
 * Menyesuaikan label Level Kognitif dengan pilihan guru pada form (LOTS / MOTS / HOTS / Campuran)
 */
export function formatCognitiveLevel(
  defaultLevel: string,
  requestedLevel: LevelKognitif,
  index: number
): string {
  if (requestedLevel === 'LOTS (C1-C2)') {
    return index % 2 === 0
      ? 'C1 (Mengingat Konsep Dasar)'
      : 'C2 (Memahami Makna & Informasi)';
  }
  if (requestedLevel === 'MOTS (C3)') {
    return 'C3 (Menerapkan Kaidah / Konsep)';
  }
  if (requestedLevel === 'HOTS (C4-C6)') {
    if (defaultLevel.startsWith('C4') || defaultLevel.startsWith('C5') || defaultLevel.startsWith('C6')) {
      return defaultLevel;
    }
    return index % 2 === 0
      ? 'C4 (Menganalisis Informasi & Penalaran)'
      : 'C5 (Mengevaluasi Kebenaran Konsep)';
  }
  return defaultLevel;
}

/**
 * Menyeimbangkan distribusi kunci jawaban (A, B, C, D, [E]) agar tidak monoton di B/C saja
 */
export function balanceOptionAndKey(
  tpl: PGTemplate,
  optionLetters: ('A' | 'B' | 'C' | 'D' | 'E')[],
  targetIndex: number
): {
  pilihan: { label: 'A' | 'B' | 'C' | 'D' | 'E'; teks: string }[];
  kunci: 'A' | 'B' | 'C' | 'D' | 'E';
  pembahasan: string;
} {
  const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  const origKeyIdx = letterToIndex[tpl.kunci] ?? 1;
  const rawOptions = [...tpl.opsi5];

  // Pastikan opsi yang tersedia minimal sepanjang optionLetters
  while (rawOptions.length < optionLetters.length) {
    rawOptions.push(`Pernyataan pelengkap ${rawOptions.length + 1}`);
  }

  const correctText = rawOptions[origKeyIdx] ?? rawOptions[0];
  const safeTargetIdx = targetIndex % optionLetters.length;
  const targetLetter = optionLetters[safeTargetIdx];

  // Bangun array opsi sesuai jumlah optionLetters (4 untuk SD/SMP, 5 untuk SMA/SMK)
  const trimmedOptions = rawOptions.slice(0, optionLetters.length);
  if (origKeyIdx >= optionLetters.length) {
    // Jika kunci asli ada di E padahal jenjang SD/SMP (4 opsi), masukkan jawaban benar ke safeTargetIdx
    trimmedOptions[safeTargetIdx] = correctText;
  } else if (origKeyIdx !== safeTargetIdx) {
    // Tukar posisi jawaban benar dari origKeyIdx ke safeTargetIdx
    const temp = trimmedOptions[safeTargetIdx];
    trimmedOptions[safeTargetIdx] = trimmedOptions[origKeyIdx];
    trimmedOptions[origKeyIdx] = temp;
  }

  // Perbarui referensi "(Pilihan X)" atau "adalah X" di akhir pembahasan agar konsisten dengan kunci baru
  const updatedPembahasan = tpl.pembahasan
    .replace(/\(Pilihan\s+[A-E]\)/g, `(Pilihan ${targetLetter})`)
    .replace(/adalah\s+pilihan\s+[A-E]\b/gi, `adalah pilihan ${targetLetter}`)
    .replace(/jawaban\s+yang\s+tepat\s+adalah\s+[A-E]\b/gi, `jawaban yang tepat adalah ${targetLetter}`);

  return {
    pilihan: optionLetters.map((label, idx) => ({
      label,
      teks: trimmedOptions[idx],
    })),
    kunci: targetLetter,
    pembahasan: `${updatedPembahasan} [Kunci: ${targetLetter}]`,
  };
}
