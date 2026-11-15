import type { GenerationRequest, LevelKognitif } from '../../types/assessment';
import { repairBalancedPGOptions } from '../assessmentQualityEngine';

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
 * Menjaga integritas level kognitif asli templat (tidak menimpa paksa label HOTS/LOTS secara kosmetik).
 * Perbedaan antara defaultLevel dan requestedLevel ditandai oleh cognitiveLevelEngine agar jujur bagi guru.
 */
export function formatCognitiveLevel(
  defaultLevel: string,
  _requestedLevel: LevelKognitif,
  _index: number
): string {
  return defaultLevel;
}

/**
 * Menyeimbangkan distribusi kunci jawaban (A, B, C, D, [E]) tanpa menghilangkan opsi benar
 * ketika jenjang SD/SMP memakai 4 opsi, sekaligus memperbarui rujukan huruf di pembahasan.
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
  return repairBalancedPGOptions(tpl, optionLetters, targetIndex);
}
