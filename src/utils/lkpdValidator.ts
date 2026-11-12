import type {
  LKPDDokumen,
  LKPDPipelineValidation,
  LKPDValidationStatus,
} from '../types/perangkatAjar';
import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { verifySPLDVDokumenConsistency } from './lkpdMathVerifier';
import {
  resolveSubjectFamily,
  resolveSubjectApproachRule,
} from './lkpdSubjectBlueprints';

const GENERIC_SLOP_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /suatu\s+kelompok\s+masyarakat/i, label: 'Narasi generik "suatu kelompok masyarakat"' },
  { pattern: /profesi\s+masa\s+depan/i, label: 'Pertanyaan generik "profesi masa depan"' },
  {
    pattern: /carilah\s+informasi\s+dari\s+internet\s+atau\s+buku\s+paket\s+secara\s+umum/i,
    label: 'Instruksi umum tanpa objek kajian spesifik',
  },
  {
    pattern: /diskusikan\s+masalah\s+di\s+atas\s+dalam\s+kelompok\s+dan\s+tuliskan\s+hasilnya/i,
    label: 'Instruksi diskusi klise tanpa target langkah kerja',
  },
  {
    pattern: /\b(?:lorem\s+ipsum|todo:|placeholder|isi\s+teks\s+di\s+sini)\b/i,
    label: 'Placeholder belum terisi',
  },
];

const STOPWORDS = new Set([
  'yang', 'dan', 'atau', 'dari', 'dalam', 'pada', 'untuk', 'dengan', 'oleh',
  'adalah', 'secara', 'melalui', 'terhadap', 'serta', 'agar', 'karena', 'sebagai',
  'siswa', 'peserta', 'didik', 'guru', 'pembelajaran', 'tujuan', 'materi', 'kelas',
  'mampu', 'dapat', 'menjelaskan', 'memahami', 'menganalisis', 'mengidentifikasi',
  'menerapkan', 'mengevaluasi', 'menyelesaikan', 'konsep', 'masalah', 'soal',
  'studi', 'kasus', 'topik', 'berbagai', 'secara', 'sederhana', 'kontekstual',
]);

export function isGenericSlopText(text: string): { matched: boolean; phrase?: string } {
  if (!text) return { matched: false };
  for (const item of GENERIC_SLOP_PATTERNS) {
    if (item.pattern.test(text)) {
      return { matched: true, phrase: item.label };
    }
  }
  return { matched: false };
}

export function hasSuspiciousTruncation(text: string): { truncated: boolean; reason?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { truncated: false };

  // Deteksi potongan mendadak di akhir kata penghubung atau tanda koma
  if (/[,;(]\s*$/.test(trimmed)) {
    return { truncated: true, reason: 'Teks berhenti mendadak setelah tanda baca pembuka/koma.' };
  }
  if (
    trimmed.length > 40 &&
    /\b(dan|atau|yang|untuk|dengan|pada|di|ke|dari|karena|yaitu|sehingga|adalah)$/i.test(trimmed)
  ) {
    return { truncated: true, reason: 'Kalimat terpotong di tengah sebelum kata utama selesai.' };
  }

  // Hitung kurung buka-tutup yang tidak seimbang
  const openParen = (trimmed.match(/\(/g) || []).length;
  const closeParen = (trimmed.match(/\)/g) || []).length;
  if (openParen > closeParen + 1) {
    return { truncated: true, reason: 'Terdapat tanda kurung terbuka yang terpotong.' };
  }

  return { truncated: false };
}

function extractDomainKeywords(sources: string[]): string[] {
  const tokens = new Set<string>();
  for (const src of sources) {
    const words = src
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
    for (const w of words) {
      tokens.add(w);
    }
  }
  return Array.from(tokens);
}

function countNumericTokens(text: string): number {
  const matches = text.match(/\b\d+(?:[.,]\d+)?\b/g);
  return matches ? matches.length : 0;
}

export function validateLKPDDokumen(
  doc: LKPDDokumen,
  tp?: CustomTPItem,
  profile?: SchoolProfile,
  options?: {
    sourceMode?: 'ai' | 'curated' | 'adaptive_fallback' | 'draft';
    maxTokensCut?: boolean;
  }
): LKPDPipelineValidation {
  const issues: string[] = [];
  const warnings: string[] = [];

  const sourceMode = options?.sourceMode ?? 'draft';
  const preset = doc.presetType ?? 'kasus';
  const subjectName = profile?.mataPelajaranUtama || doc.mataPelajaran || '';
  const family = resolveSubjectFamily(subjectName);
  const rule = resolveSubjectApproachRule(family, preset);

  if (options?.maxTokensCut) {
    issues.push('Respons AI terpotong oleh batas panjang keluaran (MAX_TOKENS).');
  }

  // 1. Kelengkapan komponen dasar
  if (!doc.judul?.trim() || doc.judul.trim().length < 4) {
    issues.push('Judul LKPD terlalu pendek atau kosong.');
  }
  const stimulusText = doc.stimulusKasus?.teks?.trim() || '';
  if (stimulusText.length < 30) {
    issues.push('Stimulus utama terlalu singkat sehingga belum menyediakan konteks/data yang cukup.');
  }
  if (!Array.isArray(doc.langkahAktivitas) || doc.langkahAktivitas.length === 0) {
    issues.push('Langkah aktivitas kerja siswa masih kosong.');
  }
  if (!Array.isArray(doc.pertanyaanAnalisis) || doc.pertanyaanAnalisis.length === 0) {
    issues.push('Pertanyaan evaluasi/analisis masih kosong.');
  }

  // 2. Cek frasa generik lintas materi (anti-slop) & deteksi pemotongan
  const allChecks = [
    { label: 'Stimulus', text: stimulusText },
    ...(doc.langkahAktivitas || []).map((l, idx) => ({
      label: `Langkah ${l.langkahKe || idx + 1}`,
      text: l.instruksi || '',
    })),
    ...(doc.pertanyaanAnalisis || []).map((q, idx) => ({
      label: `Pertanyaan ${q.nomor || idx + 1}`,
      text: q.pertanyaan || '',
    })),
  ];

  for (const item of allChecks) {
    const slop = isGenericSlopText(item.text);
    if (slop.matched) {
      issues.push(`${item.label} terdeteksi mengandung pola klise/placeholder: ${slop.phrase}.`);
    }
    const trunc = hasSuspiciousTruncation(item.text);
    if (trunc.truncated) {
      issues.push(`${item.label} diduga terpotong: ${trunc.reason}`);
    }
  }

  // 3. Cek koherensi topik / keselarasan TP -> LKPD
  const materiRef = tp?.materiPokok || doc.materiPokok || '';
  const tpRef = tp?.tujuanPembelajaran || doc.tujuanPembelajaran || '';
  const keywords = extractDomainKeywords([
    materiRef,
    tpRef,
    tp?.kompetensiInti || '',
    tp?.arahanRangkuman || '',
    doc.konteksAktual || '',
  ]);
  if (keywords.length >= 2) {
    const combinedBody = [
      doc.judul,
      doc.stimulusKasus?.judul || '',
      stimulusText,
      ...(doc.langkahAktivitas || []).map((l) => `${l.judulLangkah || ''} ${l.instruksi}`),
      ...(doc.pertanyaanAnalisis || []).map((q) => q.pertanyaan),
    ]
      .join(' ')
      .toLowerCase();

    const matchedCount = keywords.filter((kw) => combinedBody.includes(kw)).length;
    if (matchedCount === 0) {
      issues.push(
        `Isi LKPD belum merujuk langsung pada istilah kunci materi "${materiRef || doc.judul}".`
      );
    }
  }

  // 4. Aturan khusus eksperimen / praktik & keselamatan kerja
  if (preset === 'eksperimen') {
    if (!doc.eksperimenData || !doc.eksperimenData.alatDanBahan?.length) {
      issues.push('LKPD mode eksperimen wajib mencantumkan daftar alat dan bahan yang jelas.');
    } else {
      const joinedTools = doc.eksperimenData.alatDanBahan.join(' ').toLowerCase();
      const needsSafety =
        rule.requiresEquipmentAndSafetyCheck ||
        /(panas|api|listrik|baterai|laser|kaca|cermin|asam|basa|cutter|gunting|jarum|olahraga|lari|angkat)/i.test(
          joinedTools
        );
      const hasSafetyText =
        (doc.eksperimenData.keselamatanKerja && doc.eksperimenData.keselamatanKerja.length > 0) ||
        /hati-hati|keselamatan|aman|jangan|pelindung|pemanasan/i.test(
          `${stimulusText} ${(doc.petunjukPengerjaan || []).join(' ')}`
        );
      if (needsSafety && !hasSafetyText) {
        warnings.push(
          'Kegiatan praktik/eksperimen ini melibatkan alat/fisik yang sebaiknya disertai catatan keselamatan kerja.'
        );
      }
    }
    if (!doc.eksperimenData?.tabelObservasi?.kolom?.length) {
      issues.push('LKPD mode eksperimen wajib menyediakan kolom tabel observasi.');
    }
  }

  // 5. Verifikasi khusus SPLDV (data numerik konkret, konsistensi solusi, pertanyaan pemodelan)
  const spldvTriggerText = `${materiRef} ${tpRef} ${doc.judul} ${stimulusText}`.toLowerCase();
  const isSPLDV =
    spldvTriggerText.includes('spldv') ||
    spldvTriggerText.includes('sistem persamaan linear dua variabel') ||
    spldvTriggerText.includes('persamaan linear dua variabel');

  let mathVerificationNote: string | undefined;
  if (isSPLDV) {
    if (countNumericTokens(stimulusText) < 2) {
      issues.push(
        'Stimulus SPLDV tidak memiliki minimal dua besaran/nilai numerik konkret untuk dimodelkan menjadi dua persamaan.'
      );
    }
    const questionsText = (doc.pertanyaanAnalisis || []).map((q) => q.pertanyaan).join(' ').toLowerCase();
    if (
      !/(variabel|persamaan|harga|nilai|model|eliminasi|substitusi|periksa|grafik|banyak)/i.test(
        questionsText
      )
    ) {
      issues.push(
        'Pertanyaan analisis pada topik SPLDV harus langsung menguji pemodelan persamaan, penyelesaian variabel, atau pembuktian.'
      );
    }
    const mathCheck = verifySPLDVDokumenConsistency(doc);
    if (!mathCheck.verified) {
      issues.push(...mathCheck.issues);
    } else if (mathCheck.note) {
      mathVerificationNote = mathCheck.note;
    }
  }

  // 6. Cek kebersihan lembar siswa (kunci jawaban tidak bocor ke teks stimulus/langkah siswa)
  const studentVisibleText = [
    stimulusText,
    ...(doc.langkahAktivitas || []).map((l) => l.instruksi),
  ].join(' ');
  if (/\[?\s*kunci\s*jawaban\s*\]?|panduan\s+guru:/i.test(studentVisibleText)) {
    issues.push('Draf lembar siswa masih berisi label kunci jawaban atau panduan guru.');
  }

  // 7. Peringatan kelengkapan alasan kognitif & panduan guru (warning, bukan blok keras AI minimal)
  const hasHighCognitiveWithoutReason = (doc.pertanyaanAnalisis || []).some(
    (q) =>
      (q.tingkatKognitif === 'Mahir' || q.tingkatKognitif === 'Menengah') &&
      !q.alasanTingkatKognitif?.trim()
  );
  if (hasHighCognitiveWithoutReason && sourceMode !== 'ai') {
    warnings.push(
      'Sebagian butir Menengah/Mahir belum menyertakan justifikasi singkat tuntutan kognitifnya.'
    );
  }

  if (doc.catatanValidasi?.isCuratedFixture === false && sourceMode === 'adaptive_fallback') {
    warnings.push(
      'Topik kustom memakai draf kerangka adaptif rumpun mapel; periksa dan lengkapi data lokal bila diperlukan.'
    );
  }

  const prevCurated = doc.catatanValidasi?.isCuratedFixture ?? sourceMode === 'curated';
  let status: LKPDValidationStatus;
  if (issues.length > 0) {
    status = sourceMode === 'ai' ? 'gagal_validasi' : 'perlu_review_guru';
  } else if (sourceMode === 'ai') {
    status = 'valid_ai';
  } else if (prevCurated && sourceMode !== 'adaptive_fallback') {
    status = 'valid_terkurasi';
  } else {
    status = 'perlu_review_guru';
  }

  return {
    status,
    usedFallback: sourceMode !== 'ai' && (doc.catatanValidasi?.usedFallback ?? sourceMode === 'adaptive_fallback'),
    isCuratedFixture: sourceMode === 'ai' ? false : prevCurated,
    issues,
    warnings,
    mathVerificationNote,
  };
}

/**
 * Migrasi aman draf LKPD lama dari localStorage agar field terstruktur baru tetap terisi
 * tanpa menimpa editan manual guru, sekaligus menandai bila TP sumber berubah.
 */
export function normalizeStoredLKPDDraft(
  saved: Partial<LKPDDokumen>,
  freshReference: LKPDDokumen,
  currentTPHash?: string
): LKPDDokumen {
  const hashChanged =
    Boolean(currentTPHash) &&
    Boolean(saved.tpSourceHash) &&
    saved.tpSourceHash !== currentTPHash;

  return {
    ...freshReference,
    ...saved,
    stimulusKasus: {
      ...freshReference.stimulusKasus,
      ...(saved.stimulusKasus || {}),
    },
    petunjukPengerjaan:
      Array.isArray(saved.petunjukPengerjaan) && saved.petunjukPengerjaan.length > 0
        ? saved.petunjukPengerjaan
        : freshReference.petunjukPengerjaan,
    langkahAktivitas:
      Array.isArray(saved.langkahAktivitas) && saved.langkahAktivitas.length > 0
        ? saved.langkahAktivitas
        : freshReference.langkahAktivitas,
    pertanyaanAnalisis:
      Array.isArray(saved.pertanyaanAnalisis) && saved.pertanyaanAnalisis.length > 0
        ? saved.pertanyaanAnalisis
        : freshReference.pertanyaanAnalisis,
    kesimpulanRefleksi:
      Array.isArray(saved.kesimpulanRefleksi) && saved.kesimpulanRefleksi.length > 0
        ? saved.kesimpulanRefleksi
        : freshReference.kesimpulanRefleksi,
    panduanGuru: saved.panduanGuru || freshReference.panduanGuru,
    needsReview: Boolean(saved.needsReview || hashChanged),
  };
}
