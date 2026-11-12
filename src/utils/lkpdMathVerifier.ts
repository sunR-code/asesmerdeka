import type { LKPDDokumen } from '../types/perangkatAjar';

export interface SPLDVVerificationResult {
  solvable: boolean;
  determinant: number;
  x: number | null;
  y: number | null;
  checkEq1: number | null;
  checkEq2: number | null;
  isConsistent: boolean;
  diagnostic: string;
}

/**
 * Menyelesaikan dan memverifikasi sistem persamaan linear dua variabel:
 *   a1*x + b1*y = c1
 *   a2*x + b2*y = c2
 */
export function solveAndVerifySPLDV(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number,
  options?: { requireNonNegative?: boolean }
): SPLDVVerificationResult {
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-9) {
    return {
      solvable: false,
      determinant: 0,
      x: null,
      y: null,
      checkEq1: null,
      checkEq2: null,
      isConsistent: false,
      diagnostic: 'Determinan sama dengan nol (kedua persamaan sejajar atau berimpit; tidak memiliki solusi tunggal).',
    };
  }

  const x = (c1 * b2 - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  const checkEq1 = a1 * x + b1 * y;
  const checkEq2 = a2 * x + b2 * y;

  const eqOk = Math.abs(checkEq1 - c1) < 1e-6 && Math.abs(checkEq2 - c2) < 1e-6;
  const domainOk = options?.requireNonNegative ? x >= 0 && y >= 0 : true;
  const isConsistent = eqOk && domainOk;

  return {
    solvable: true,
    determinant: det,
    x,
    y,
    checkEq1,
    checkEq2,
    isConsistent,
    diagnostic: isConsistent
      ? `Terverifikasi: det=${det}, x=${x}, y=${y}, cek persamaan 1=${checkEq1} (${c1}), cek persamaan 2=${checkEq2} (${c2}).`
      : `Ketidakkonsistenan solusi/domain: det=${det}, x=${x}, y=${y}.`,
  };
}

function parseIndoNumber(raw: string): number {
  const cleaned = raw.replace(/\s+/g, '');
  // Pola ribuan titik Indonesia seperti 18.000 atau 3.000
  if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ''));
  }
  // Pola ribuan koma seperti 18,000
  if (/^-?\d{1,3}(,\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/,/g, ''));
  }
  return Number(cleaned.replace(',', '.'));
}

export interface ExtractedLinearEquation {
  a: number;
  b: number;
  c: number;
  raw: string;
}

export function extractLinearEquations2Var(text: string): ExtractedLinearEquation[] {
  const equations: ExtractedLinearEquation[] = [];
  const regex =
    /(-?\d+(?:[.,]\d+)?)\s*x\s*([+-])\s*(\d+(?:[.,]\d+)?)\s*y\s*=\s*(?:Rp\.?\s*)?(-?\d+(?:[.,]\d{3})*|\d+(?:[.,]\d+)?)/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const a = parseIndoNumber(match[1]);
    const sign = match[2] === '-' ? -1 : 1;
    const b = sign * parseIndoNumber(match[3]);
    const c = parseIndoNumber(match[4]);
    if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
      equations.push({ a, b, c, raw: match[0] });
    }
  }
  return equations;
}

function extractClaimedXY(text: string): { x?: number; y?: number } {
  const xMatch = text.match(/\bx\s*=\s*(?:Rp\.?\s*)?(-?\d+(?:[.,]\d{3})*|\d+(?:[.,]\d+)?)/i);
  const yMatch = text.match(/\by\s*=\s*(?:Rp\.?\s*)?(-?\d+(?:[.,]\d{3})*|\d+(?:[.,]\d+)?)/i);
  const result: { x?: number; y?: number } = {};
  if (xMatch) result.x = parseIndoNumber(xMatch[1]);
  if (yMatch) result.y = parseIndoNumber(yMatch[1]);
  return result;
}

export interface MathDocValidationOutcome {
  verified: boolean;
  issues: string[];
  note?: string;
}

export function verifySPLDVDokumenConsistency(doc: LKPDDokumen): MathDocValidationOutcome {
  const guideBlob = [
    ...(doc.panduanGuru?.kunciDanContohJawaban.flatMap((k) => [
      k.jawabanInti,
      ...k.langkahPenyelesaian,
      k.alternatifValid || '',
    ]) || []),
    ...doc.pertanyaanAnalisis.map((q) => q.panduanJawabanSingkat || ''),
  ].join('\n');

  const equations = extractLinearEquations2Var(guideBlob);
  if (equations.length < 2) {
    return {
      verified: false,
      issues: [
        'Panduan guru materi SPLDV harus memuat minimal 2 persamaan linear dua variabel yang terdefinisi jelas (mis. 2x + 3y = 18.000).',
      ],
    };
  }

  const eq1 = equations[0];
  const eq2 = equations[1];
  const isPriceOrItemContext = /harga|rp|rupiah|buku|pensil|buah|kg|tiket|unit/i.test(
    `${doc.stimulusKasus.teks} ${guideBlob}`
  );

  const solved = solveAndVerifySPLDV(eq1.a, eq1.b, eq1.c, eq2.a, eq2.b, eq2.c, {
    requireNonNegative: isPriceOrItemContext,
  });

  if (!solved.solvable || !solved.isConsistent || solved.x === null || solved.y === null) {
    return {
      verified: false,
      issues: [`Verifikasi persamaan SPLDV gagal: ${solved.diagnostic}`],
    };
  }

  const claimed = extractClaimedXY(guideBlob);
  if (claimed.x !== undefined && Math.abs(claimed.x - solved.x) > 1e-2) {
    return {
      verified: false,
      issues: [
        `Nilai x pada panduan guru (${claimed.x}) tidak cocok dengan solusi sistem persamaan (${solved.x}).`,
      ],
    };
  }
  if (claimed.y !== undefined && Math.abs(claimed.y - solved.y) > 1e-2) {
    return {
      verified: false,
      issues: [
        `Nilai y pada panduan guru (${claimed.y}) tidak cocok dengan solusi sistem persamaan (${solved.y}).`,
      ],
    };
  }

  return {
    verified: true,
    issues: [],
    note: solved.diagnostic,
  };
}

export function verifyRightTriangleSides(a: number, b: number, c: number): boolean {
  return Math.abs(a * a + b * b - c * c) < 1e-6;
}

export function verifyDescriptiveStats(values: number[]): {
  mean: number;
  median: number;
  sorted: number[];
} {
  const sorted = [...values].sort((u, v) => u - v);
  const mean = sorted.reduce((acc, n) => acc + n, 0) / Math.max(1, sorted.length);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { mean, median, sorted };
}
