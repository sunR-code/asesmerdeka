import type {
  GenerationRequest,
  AsesmenDokumen,
  ButirSoal,
  KriteriaRubrik,
  RubrikKriteriaUraian,
  SoalPilihanGanda,
  SoalPilihanGandaKompleks,
  SoalUraian,
  TPTraceabilityItem,
} from '../types/assessment';
import type { RangkumanRequest, RangkumanDokumen } from '../types/summary';
import { buildSmartCurriculumRangkuman } from '../utils/rangkumanKnowledgeEngine';
import { buildSmartCurriculumAsesmen, buildSingleRegeneratedQuestion } from '../utils/asesmenKnowledgeEngine';
import { callGeminiStructuredJSON } from './geminiClient';
import {
  UNIFIED_KKTP_INTERVALS,
  computeTextJaccardSimilarity,
  enrichDocWithQualityAndCognitive,
  isSDLevelPhase,
  isSMALevelPhase,
  normalizeQuestionText,
  validateAsesmenDokumen,
  validateSingleQuestion,
} from '../utils/assessmentQualityEngine';
import { bloomToTier, formatBloomLabel, parseBloomLevel } from '../utils/cognitiveLevelEngine';

export class AiGenerationError extends Error {
  readonly code: 'api_unavailable' | 'invalid_ai_output' | 'truncated_output';
  readonly canUseOfflineFallback: boolean;

  constructor(
    message: string,
    code: 'api_unavailable' | 'invalid_ai_output' | 'truncated_output' = 'api_unavailable',
    canUseOfflineFallback = true
  ) {
    super(message);
    this.name = 'AiGenerationError';
    this.code = code;
    this.canUseOfflineFallback = canUseOfflineFallback;
  }
}

export function normalizeButirSoal(
  raw: any,
  index: number,
  fallback?: ButirSoal,
  expectedOptionCount?: 4 | 5
): ButirSoal | null {
  if (!raw || typeof raw !== 'object') return fallback || null;
  const nomor = typeof raw.nomor === 'number' && raw.nomor > 0 ? raw.nomor : index + 1;
  const tipe = raw.tipe;

  const parsedBloom = parseBloomLevel(raw.bloomLevel || raw.levelKognitif);
  const resolvedLevelLabel =
    typeof raw.levelKognitif === 'string' && raw.levelKognitif.trim().length > 0
      ? raw.levelKognitif.trim()
      : parsedBloom
        ? formatBloomLabel(parsedBloom)
        : '';

  const baseMeta = {
    tpId: typeof raw.tpId === 'string' && raw.tpId.trim() ? raw.tpId.trim() : undefined,
    tpKode: typeof raw.tpKode === 'string' && raw.tpKode.trim() ? raw.tpKode.trim() : undefined,
    subTpId: typeof raw.subTpId === 'string' && raw.subTpId.trim() ? raw.subTpId.trim() : undefined,
    subTpDeskripsi:
      typeof raw.subTpDeskripsi === 'string' && raw.subTpDeskripsi.trim()
        ? raw.subTpDeskripsi.trim()
        : undefined,
    bloomLevel: parsedBloom || undefined,
    cognitiveTier: parsedBloom ? bloomToTier(parsedBloom) : undefined,
    cognitiveRationale:
      typeof raw.cognitiveRationale === 'string' && raw.cognitiveRationale.trim()
        ? raw.cognitiveRationale.trim()
        : undefined,
    difficultyLevel:
      raw.difficultyLevel === 'Mudah' || raw.difficultyLevel === 'Sedang' || raw.difficultyLevel === 'Sulit'
        ? raw.difficultyLevel
        : undefined,
    sourceRef: typeof raw.sourceRef === 'string' ? raw.sourceRef.trim() : undefined,
  };

  if (tipe === 'pilihan_ganda') {
    const rawPilihan = Array.isArray(raw.pilihan) ? raw.pilihan : [];
    const minRequiredOptions = expectedOptionCount ?? 2;
    const allLabels: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

    if (
      rawPilihan.length < minRequiredOptions ||
      typeof raw.pertanyaan !== 'string' ||
      raw.pertanyaan.trim().length < 8
    ) {
      return fallback || null;
    }

    const sliceCount = expectedOptionCount ?? Math.min(5, rawPilihan.length);
    const allowedLabels = allLabels.slice(0, sliceCount);
    const mappedPilihan = rawPilihan.slice(0, sliceCount).map((p: any, idx: number) => ({
      label: allowedLabels[idx],
      teks: typeof p?.teks === 'string' ? p.teks.trim() : String(p?.teks ?? '').trim(),
    }));

    if (mappedPilihan.some((p: { teks: string }) => !p.teks)) {
      return fallback || null;
    }

    // DILARANG KERAS menebak kunci ke 'A' jika kunci AI tidak valid/di luar opsi tersedia
    const rawKey = String(raw.kunci || raw.kunciJawaban || '').trim().toUpperCase();
    if (!allowedLabels.includes(rawKey as 'A' | 'B' | 'C' | 'D' | 'E')) {
      return fallback || null;
    }

    return {
      ...baseMeta,
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `pg-${nomor}`,
      nomor,
      tipe: 'pilihan_ganda',
      stimulus: typeof raw.stimulus === 'string' ? raw.stimulus.trim() : undefined,
      pertanyaan: raw.pertanyaan.trim(),
      pilihan: mappedPilihan,
      kunci: rawKey as 'A' | 'B' | 'C' | 'D' | 'E',
      pembahasan: typeof raw.pembahasan === 'string' ? raw.pembahasan.trim() : '',
      levelKognitif: resolvedLevelLabel || 'C2 (Memahami)',
      indikatorSoal: typeof raw.indikatorSoal === 'string' ? raw.indikatorSoal.trim() : '',
      skor: typeof raw.skor === 'number' && raw.skor > 0 ? raw.skor : 10,
    } as SoalPilihanGanda;
  }

  if (tipe === 'pilihan_ganda_kompleks') {
    const rawPernyataan = Array.isArray(raw.pernyataan) ? raw.pernyataan : [];
    if (
      rawPernyataan.length < 3 ||
      typeof raw.pertanyaan !== 'string' ||
      raw.pertanyaan.trim().length < 8
    ) {
      return fallback || null;
    }

    const mappedStatements = rawPernyataan.map((p: any, idx: number) => ({
      id: typeof p?.id === 'string' && p.id.trim() ? p.id : `p${idx + 1}`,
      teks: typeof p?.teks === 'string' ? p.teks.trim() : String(p?.teks ?? '').trim(),
      isBenar: Boolean(p?.isBenar),
    }));

    if (mappedStatements.some((s: { teks: string }) => !s.teks)) {
      return fallback || null;
    }

    return {
      ...baseMeta,
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `pgk-${nomor}`,
      nomor,
      tipe: 'pilihan_ganda_kompleks',
      stimulus: typeof raw.stimulus === 'string' ? raw.stimulus.trim() : undefined,
      pertanyaan: raw.pertanyaan.trim(),
      pernyataan: mappedStatements,
      pembahasan: typeof raw.pembahasan === 'string' ? raw.pembahasan.trim() : '',
      levelKognitif: resolvedLevelLabel || 'C4 (Menganalisis)',
      indikatorSoal: typeof raw.indikatorSoal === 'string' ? raw.indikatorSoal.trim() : '',
      skor: typeof raw.skor === 'number' && raw.skor > 0 ? raw.skor : 15,
    } as SoalPilihanGandaKompleks;
  }

  if (tipe === 'uraian') {
    if (typeof raw.pertanyaan !== 'string' || raw.pertanyaan.trim().length < 8) {
      return fallback || null;
    }

    const rubrikArr: RubrikKriteriaUraian[] | undefined = Array.isArray(raw.rubrikPenskoran)
      ? raw.rubrikPenskoran
          .filter((r: any) => typeof r?.kriteria === 'string' && r.kriteria.trim())
          .map((r: any) => ({
            kriteria: r.kriteria.trim(),
            bobot: typeof r.bobot === 'number' && r.bobot > 0 ? r.bobot : 5,
            indikator: typeof r.indikator === 'string' ? r.indikator.trim() : undefined,
          }))
      : undefined;

    return {
      ...baseMeta,
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `ur-${nomor}`,
      nomor,
      tipe: 'uraian',
      stimulus: typeof raw.stimulus === 'string' ? raw.stimulus.trim() : undefined,
      pertanyaan: raw.pertanyaan.trim(),
      pedomanPenskoran:
        typeof raw.pedomanPenskoran === 'string' ? raw.pedomanPenskoran.trim() : '',
      rubrikPenskoran: rubrikArr && rubrikArr.length > 0 ? rubrikArr : undefined,
      contohJawaban: typeof raw.contohJawaban === 'string' ? raw.contohJawaban.trim() : '',
      levelKognitif: resolvedLevelLabel || 'C4 (Menganalisis)',
      indikatorSoal: typeof raw.indikatorSoal === 'string' ? raw.indikatorSoal.trim() : '',
      skorMaksimal: typeof raw.skorMaksimal === 'number' && raw.skorMaksimal > 0 ? raw.skorMaksimal : 20,
    } as SoalUraian;
  }

  return fallback || null;
}

export async function generateAsesmen(request: GenerationRequest): Promise<AsesmenDokumen> {
  try {
    return await generateWithGeminiAPI(request);
  } catch (err: any) {
    if (request.allowOfflineFallback) {
      const reason =
        err instanceof Error
          ? err.message
          : 'Layanan Gemini AI tidak tersedia; beralih ke templat luring sesuai permintaan guru.';
      const fallback = buildSmartCurriculumAsesmen(request);
      return enrichDocWithQualityAndCognitive(
        {
          ...fallback,
          generationSource: 'adaptive_fallback',
          usedFallback: true,
          fallbackReason: reason,
        },
        { requestedLevel: request.levelKognitif }
      );
    }

    if (err instanceof AiGenerationError) {
      throw err;
    }
    throw new AiGenerationError(
      err?.message ||
        'Gagal menghasilkan soal dengan Gemini AI. Periksa koneksi/API Key, atau aktifkan Mode Templat Luring secara eksplisit.',
      'api_unavailable',
      true
    );
  }
}

function buildTPContextPromptBlock(req: GenerationRequest): {
  tpMap: TPTraceabilityItem[];
  promptBlock: string;
} {
  const tpMap: TPTraceabilityItem[] =
    req.tpListContext && req.tpListContext.length > 0
      ? req.tpListContext
      : [
          {
            id: req.tpId || 'tp_active_1',
            kode: req.tpKode || 'TP-1',
            materiPokok: req.materiPokok,
            deskripsi:
              req.tujuanPembelajaranInput ||
              `Peserta didik mampu memahami dan menerapkan konsep ${req.materiPokok}.`,
          },
        ];

  const promptBlock = tpMap
    .map((tp) => {
      const subs =
        tp.subTP && tp.subTP.length > 0
          ? `\n    Sub-TP: ${tp.subTP.map((s) => `[${s.id} | ${s.kode}] ${s.deskripsi}`).join('; ')}`
          : '';
      return `- [tpId: "${tp.id}" | kode: "${tp.kode}"] Materi: "${tp.materiPokok}" -> TP: ${tp.deskripsi}${subs}`;
    })
    .join('\n');

  return { tpMap, promptBlock };
}

function buildQuestionBatchPrompt(params: {
  req: GenerationRequest;
  tpPromptBlock: string;
  batchPG: number;
  batchPGK: number;
  batchUraian: number;
  startNo: number;
  avoidStems: string[];
  includeHeaderMeta: boolean;
}): string {
  const { req, tpPromptBlock, batchPG, batchPGK, batchUraian, startNo, avoidStems, includeHeaderMeta } =
    params;
  const isSMA = isSMALevelPhase(req.jenjangFase, req.kelas);
  const expectedOptions = isSMA ? 5 : 4;
  const optionRange = isSMA ? 'A, B, C, D, E' : 'A, B, C, D';

  const cognitiveGuide =
    req.levelKognitif === 'Campuran Berimbang'
      ? 'Komposisi WAJIB Campuran Berimbang: sekitar 20% LOTS (C1-C2 Mengingat/Memahami), 50% MOTS (C3 Menerapkan), 30% HOTS (C4-C6 Menganalisis/Mengevaluasi/Mencipta). Jangan melabeli soal hafalan C1 sebagai HOTS!'
      : `Fokus Level Kognitif: ${req.levelKognitif}. Pastikan kata kerja operasional, stimulus kasus, dan kedalaman pertanyaan BENAR-BENAR menuntut level tersebut (bukan sekadar mengganti label).`;

  const rangkumanContext = req.sourceRangkuman
    ? `\nKONTEKS RANGKUMAN SUMBER:\n- Intisari: ${req.sourceRangkuman.ringkasanSatuKalimat}\n- Poin Utama: ${req.sourceRangkuman.poinUtama
        .slice(0, 6)
        .map((p) => `${p.judul}: ${p.penjelasan}`)
        .join(' | ')}\n`
    : '';

  const avoidBlock =
    avoidStems.length > 0
      ? `\nSOAL YANG SUDAH ADA (DILARANG mengulang konsep/pertanyaan identik dengan daftar berikut):\n${avoidStems
          .slice(-20)
          .map((s, idx) => `${idx + 1}. ${s.slice(0, 140)}`)
          .join('\n')}\n`
      : '';

  return `
Anda adalah Pakar Kurikulum Merdeka dan Penulis Soal AKM/Ujian Nasional Indonesia.
Susun batch soal asesmen (${req.tipeAsesmen}) untuk:
- Mata Pelajaran: ${req.mataPelajaran}
- Jenjang/Fase & Kelas: ${req.jenjangFase} — Kelas ${req.kelas}${req.semester ? `, Semester ${req.semester}` : ''}
- Materi Pokok: ${req.materiPokok}
- Tingkat Kesulitan Dominan: ${req.difficultyLevel || 'Sedang'}
- Daftar TP & Sub-TP Rujukan (wajib dipetakan pada field tpId, tpKode, dan subTpId jika ada):
${tpPromptBlock}
${rangkumanContext}${avoidBlock}

ATURAN MUTU KETAT (WAJIB DIPATUHI):
1. DILARANG mengulang pertanyaan, DILARANG memakai opsi placeholder, dan DILARANG mengarang fakta/referensi palsu.
2. Pilihan Ganda WAJIB memiliki tepat ${expectedOptions} pilihan (${optionRange}), kunci harus valid dalam [${optionRange}], sebaran kunci merata, SEMUA opsi unik dan plausibel (distraktor masuk akal).
3. "pembahasan" WAJIB menjelaskan alasan ilmiah mengapa kunci benar dan mengapa pengecoh keliru (>= 25 karakter) dan HARUS konsisten dengan huruf kunci.
4. "indikatorSoal" WAJIB spesifik mengukur kompetensi TP.
5. ${cognitiveGuide}
6. Untuk Uraian: wajib memiliki "contohJawaban" konkret, "pedomanPenskoran", dan array "rubrikPenskoran" ({ kriteria, bobot }).
7. Nomor butir dimulai dari ${startNo}. Target batch ini: ${batchPG} PG ("pilihan_ganda"), ${batchPGK} PGK ("pilihan_ganda_kompleks", min 3 pernyataan campuran Benar/Salah), ${batchUraian} Uraian ("uraian").

KELUARKAN HANYA JSON VALID:
{
  ${
    includeHeaderMeta
      ? `"judul": "string",
  "capaianPembelajaran": "string ringkas sesuai Kurikulum Merdeka",
  "tujuanPembelajaran": ["string"],
  "profilPelajarPancasila": ["Bernalar Kritis", "Kreatif", "Mandiri"],
  "petunjukUmum": ["string"],`
      : ''
  }
  "soalList": [
    {
      "nomor": ${startNo},
      "tipe": "pilihan_ganda | pilihan_ganda_kompleks | uraian",
      "tpId": "id tp dari daftar rujukan",
      "tpKode": "kode tp",
      "subTpId": "opsional id sub-tp",
      "stimulus": "wacana/data/konteks nyata",
      "pertanyaan": "pertanyaan lengkap",
      "pilihan": [{"label": "A", "teks": "..."}],
      "kunci": "A",
      "pernyataan": [{"id": "p1", "teks": "...", "isBenar": true}],
      "pedomanPenskoran": "untuk uraian",
      "rubrikPenskoran": [{"kriteria": "...", "bobot": 10}],
      "contohJawaban": "untuk uraian",
      "pembahasan": "pembahasan tuntas",
      "bloomLevel": "C1|C2|C3|C4|C5|C6",
      "levelKognitif": "C3 (Menerapkan)",
      "cognitiveRationale": "alasan singkat mengapa soal ini menuntut level C tersebut",
      "indikatorSoal": "indikator spesifik",
      "skor": 10,
      "skorMaksimal": 20
    }
  ]${
    includeHeaderMeta && req.sertakanRubrik
      ? `,
  "rubrikKKTP": [
    {
      "tujuanPembelajaran": "string",
      "buktiKetercapaian": "string",
      "perluBimbingan": "Skor ${UNIFIED_KKTP_INTERVALS.perluBimbingan}: ...",
      "cukup": "Skor ${UNIFIED_KKTP_INTERVALS.cukup}: ...",
      "baik": "Skor ${UNIFIED_KKTP_INTERVALS.baik}: ...",
      "sangatBaik": "Skor ${UNIFIED_KKTP_INTERVALS.sangatBaik}: ..."
    }
  ]`
      : ''
  }
}
`;
}

async function generateWithGeminiAPI(req: GenerationRequest): Promise<AsesmenDokumen> {
  const isSMA = isSMALevelPhase(req.jenjangFase, req.kelas);
  const expectedOptionCount: 4 | 5 = isSMA ? 5 : 4;
  const { tpMap, promptBlock } = buildTPContextPromptBlock(req);

  const totalRequested = req.jumlahPG + req.jumlahPGK + req.jumlahUraian;
  if (totalRequested <= 0) {
    throw new AiGenerationError('Jumlah soal minimal 1 butir.', 'invalid_ai_output', false);
  }

  // Bagi menjadi batch agar tidak terpotong batas output token pada paket besar
  const BATCH_MAX = 10;
  type BatchPlan = { pg: number; pgk: number; ur: number };
  const batches: BatchPlan[] = [];
  let remPG = req.jumlahPG;
  let remPGK = req.jumlahPGK;
  let remUr = req.jumlahUraian;
  while (remPG > 0 || remPGK > 0 || remUr > 0) {
    const pg = Math.min(remPG, BATCH_MAX);
    remPG -= pg;
    const room1 = BATCH_MAX - pg;
    const pgk = Math.min(remPGK, room1);
    remPGK -= pgk;
    const room2 = room1 - pgk;
    const ur = Math.min(remUr, room2);
    remUr -= ur;
    batches.push({ pg, pgk, ur });
  }

  let parsedMeta: any = null;
  const collectedSoal: ButirSoal[] = [];
  const seenNormalizedStems = new Set<string>();
  let anyTruncated = false;

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batch = batches[bIdx];
    const startNo = collectedSoal.length + 1;
    const prompt = buildQuestionBatchPrompt({
      req,
      tpPromptBlock: promptBlock,
      batchPG: batch.pg,
      batchPGK: batch.pgk,
      batchUraian: batch.ur,
      startNo,
      avoidStems: collectedSoal.map((s) => s.pertanyaan),
      includeHeaderMeta: bIdx === 0,
    });

    const parsed = await callGeminiStructuredJSON({
      prompt,
      temperature: 0.35,
      maxOutputTokens: 7168,
      geminiApiKey: req.geminiApiKey,
    });

    if (bIdx === 0) parsedMeta = parsed;
    if (parsed?._geminiFinishReason === 'MAX_TOKENS') {
      anyTruncated = true;
    }

    const rawList = Array.isArray(parsed?.soalList) ? parsed.soalList : [];
    for (let i = 0; i < rawList.length; i++) {
      const normalized = normalizeButirSoal(rawList[i], collectedSoal.length, undefined, expectedOptionCount);
      if (!normalized) continue;
      const normKey = normalizeQuestionText(normalized.pertanyaan);
      const isDup =
        seenNormalizedStems.has(normKey) ||
        collectedSoal.some((existing) => computeTextJaccardSimilarity(existing.pertanyaan, normalized.pertanyaan) >= 0.85);
      if (!isDup) {
        seenNormalizedStems.add(normKey);
        collectedSoal.push({
          ...normalized,
          nomor: collectedSoal.length + 1,
          tpId: normalized.tpId || tpMap[collectedSoal.length % tpMap.length]?.id,
          tpKode: normalized.tpKode || tpMap[collectedSoal.length % tpMap.length]?.kode,
        });
      }
    }
  }

  // Jika ada soal kurang atau terdeteksi error validasi kunci/pembahasan, lakukan 1 kali perbaikan terarah
  const tempDoc: AsesmenDokumen = {
    id: 'DOC-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    judul:
      typeof parsedMeta?.judul === 'string' && parsedMeta.judul.trim()
        ? parsedMeta.judul.trim()
        : `${req.tipeAsesmen.split(' ')[0]} ${req.mataPelajaran} — ${req.materiPokok}`,
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    rombel: req.rombel,
    semester: req.semester,
    schoolId: req.schoolId,
    tipeAsesmen: req.tipeAsesmen,
    alokasiWaktu: req.alokasiWaktu,
    tahunAjaran: req.tahunAjaran || '2026/2027',
    namaSekolah: req.namaSekolah || 'Satuan Pendidikan Kurikulum Merdeka',
    namaPenyusun: req.namaGuru || 'Guru Mata Pelajaran',
    capaianPembelajaran:
      typeof parsedMeta?.capaianPembelajaran === 'string' && parsedMeta.capaianPembelajaran.trim()
        ? parsedMeta.capaianPembelajaran.trim()
        : `Capaian Pembelajaran ${req.mataPelajaran} ${req.jenjangFase}`,
    tujuanPembelajaran:
      Array.isArray(parsedMeta?.tujuanPembelajaran) && parsedMeta.tujuanPembelajaran.length > 0
        ? parsedMeta.tujuanPembelajaran
        : tpMap.map((t) => t.deskripsi).filter(Boolean),
    tpIds: tpMap.map((t) => t.id),
    subTpIds: req.subTpIds,
    tpMap,
    materiPokok: req.materiPokok,
    profilPelajarPancasila:
      Array.isArray(parsedMeta?.profilPelajarPancasila) && parsedMeta.profilPelajarPancasila.length > 0
        ? parsedMeta.profilPelajarPancasila
        : ['Bernalar Kritis', 'Kreatif', 'Mandiri'],
    generationSource: 'ai_generated',
    usedFallback: false,
    difficultyLevel: req.difficultyLevel,
    petunjukUmum:
      Array.isArray(parsedMeta?.petunjukUmum) && parsedMeta.petunjukUmum.length > 0
        ? parsedMeta.petunjukUmum
        : [
            'Awali dengan berdoa sebelum mulai mengerjakan asesmen.',
            'Tuliskan identitas lengkap pada lembar jawaban.',
            'Bacalah setiap stimulus dan soal dengan teliti.',
          ],
    soalList: collectedSoal,
    rubrikKKTP:
      req.sertakanRubrik && Array.isArray(parsedMeta?.rubrikKKTP) && parsedMeta.rubrikKKTP.length > 0
        ? parsedMeta.rubrikKKTP
        : req.sertakanRubrik
          ? buildDefaultKKTPRubric(req, tpMap)
          : [],
  };

  let validation = validateAsesmenDokumen(tempDoc, { requestedLevel: req.levelKognitif });
  const errorIssues = validation.issues.filter((i) => i.severity === 'error');

  if (tempDoc.soalList.length === 0 || (errorIssues.length > 0 && tempDoc.soalList.length <= totalRequested)) {
    const repairMissingCount = Math.max(0, totalRequested - tempDoc.soalList.length);
    if (errorIssues.length > 0 || repairMissingCount > 0) {
      const repairPrompt = `
Perbaiki dan lengkapi butir soal berikut agar memenuhi standar Kurikulum Merdeka untuk ${req.mataPelajaran} Kelas ${req.kelas} materi "${req.materiPokok}".
Daftar masalah yang ditemukan:
${errorIssues.map((e) => `- ${e.message}`).join('\n') || `- Jumlah soal baru ${tempDoc.soalList.length}/${totalRequested}, lengkapi ${repairMissingCount} butir unik tambahan.`}
Soal yang perlu diperbaiki/dilengkapi (kembalikan HANYA array JSON "repairedSoal"):
${JSON.stringify(
  errorIssues.length > 0
    ? tempDoc.soalList.filter((s) => errorIssues.some((e) => e.questionId === s.id))
    : []
)}
Pastikan opsi tepat ${expectedOptionCount} huruf, kunci sah, pembahasan tuntas dan konsisten, tanpa duplikasi.`;

      try {
        const repairedRaw = await callGeminiStructuredJSON({
          prompt: repairPrompt,
          temperature: 0.25,
          maxOutputTokens: 4096,
          geminiApiKey: req.geminiApiKey,
        });
        const repairedArr = Array.isArray(repairedRaw?.repairedSoal)
          ? repairedRaw.repairedSoal
          : Array.isArray(repairedRaw?.soalList)
            ? repairedRaw.soalList
            : [];
        for (const item of repairedArr) {
          const norm = normalizeButirSoal(item, tempDoc.soalList.length, undefined, expectedOptionCount);
          if (!norm) continue;
          const existingIdx = tempDoc.soalList.findIndex((s) => s.id === norm.id || s.nomor === norm.nomor);
          if (existingIdx >= 0 && errorIssues.some((e) => e.nomor === norm.nomor)) {
            tempDoc.soalList[existingIdx] = {
              ...norm,
              tpId: norm.tpId || tempDoc.soalList[existingIdx].tpId,
              tpKode: norm.tpKode || tempDoc.soalList[existingIdx].tpKode,
            };
          } else if (
            tempDoc.soalList.length < totalRequested &&
            !tempDoc.soalList.some((s) => computeTextJaccardSimilarity(s.pertanyaan, norm.pertanyaan) >= 0.85)
          ) {
            tempDoc.soalList.push({
              ...norm,
              nomor: tempDoc.soalList.length + 1,
              tpId: norm.tpId || tpMap[tempDoc.soalList.length % tpMap.length]?.id,
              tpKode: norm.tpKode || tpMap[tempDoc.soalList.length % tpMap.length]?.kode,
            });
          }
        }
        validation = validateAsesmenDokumen(tempDoc, { requestedLevel: req.levelKognitif });
      } catch {
        // biarkan hasil pengecekan akhir menentukan apakah harus gagal eksplisit
      }
    }
  }

  if (tempDoc.soalList.length === 0) {
    throw new AiGenerationError(
      anyTruncated
        ? 'Respons Gemini AI terpotong oleh batas token sebelum menghasilkan soal yang valid.'
        : 'Gemini AI tidak mengembalikan butir soal yang lolos validasi struktur dan kunci jawaban.',
      anyTruncated ? 'truncated_output' : 'invalid_ai_output',
      true
    );
  }

  if (anyTruncated && tempDoc.soalList.length < totalRequested) {
    tempDoc.fallbackReason = `Sebagian respons AI terpotong (MAX_TOKENS): dihasilkan ${tempDoc.soalList.length} dari ${totalRequested} soal valid tanpa duplikasi.`;
  }

  return enrichDocWithQualityAndCognitive(tempDoc, {
    requestedLevel: req.levelKognitif,
  });
}

function buildDefaultKKTPRubric(
  req: GenerationRequest,
  tpMap: TPTraceabilityItem[]
): KriteriaRubrik[] {
  const tpSummary = tpMap[0]?.deskripsi || req.tujuanPembelajaranInput || req.materiPokok;
  return [
    {
      tujuanPembelajaran: tpSummary,
      buktiKetercapaian: `Ketepatan menjawab soal konsep, penalaran stimulus, dan ketuntasan argumen uraian materi ${req.materiPokok}.`,
      perluBimbingan: `Belum memahami konsep dasar ${req.materiPokok} (Skor ${UNIFIED_KKTP_INTERVALS.perluBimbingan}).`,
      cukup: `Memahami konsep dasar namun masih keliru pada analisis konteks (Skor ${UNIFIED_KKTP_INTERVALS.cukup}).`,
      baik: `Mampu menerapkan dan menganalisis sebagian besar persoalan dengan tepat (Skor ${UNIFIED_KKTP_INTERVALS.baik}).`,
      sangatBaik: `Menguasai konsep secara tuntas serta mampu mengevaluasi dan menyusun solusi HOTS secara akurat (Skor ${UNIFIED_KKTP_INTERVALS.sangatBaik}).`,
    },
  ];
}

export async function regenerateSingleQuestion(
  assessment: AsesmenDokumen,
  targetSoal: ButirSoal,
  geminiApiKey?: string,
  options?: { allowOfflineFallback?: boolean }
): Promise<ButirSoal> {
  try {
    return await regenerateSingleQuestionWithGemini(assessment, targetSoal, geminiApiKey);
  } catch (e: any) {
    if (options?.allowOfflineFallback) {
      return buildSingleRegeneratedQuestion(assessment, targetSoal);
    }
    if (e instanceof AiGenerationError) {
      throw e;
    }
    throw new AiGenerationError(
      e?.message ||
        'Gagal meregenerasi butir soal dengan Gemini AI. Anda dapat memilih templat luring bila diperlukan.',
      'api_unavailable',
      true
    );
  }
}

async function regenerateSingleQuestionWithGemini(
  assessment: AsesmenDokumen,
  targetSoal: ButirSoal,
  geminiApiKey?: string
): Promise<ButirSoal> {
  const isSMA = isSMALevelPhase(assessment.jenjangFase, assessment.kelas);
  const expectedOptionCount: 4 | 5 = isSMA ? 5 : 4;
  const optionRange = isSMA ? 'A, B, C, D, E' : 'A, B, C, D';

  const existingQuestions = (assessment.soalList || [])
    .filter((s) => s.id !== targetSoal.id)
    .map((s) => s.pertanyaan.slice(0, 120));

  const targetTpText =
    assessment.tpMap?.find((t) => t.id === targetSoal.tpId)?.deskripsi ||
    assessment.tujuanPembelajaran[0] ||
    assessment.materiPokok;

  const prompt = `
Anda adalah Pakar Asesmen Kurikulum Merdeka.
Buat SATU butir soal pengganti yang benar-benar BARU untuk Nomor ${targetSoal.nomor}.
- Mata Pelajaran: ${assessment.mataPelajaran}
- Jenjang & Kelas: ${assessment.jenjangFase}, Kelas ${assessment.kelas}
- Materi Pokok: ${assessment.materiPokok}
- Tujuan Pembelajaran Rujukan (${targetSoal.tpKode || 'TP'}): ${targetTpText}
- Tipe Soal WAJIB: ${targetSoal.tipe}
- Level Kognitif Target: ${targetSoal.levelKognitif}
- Jumlah Pilihan PG WAJIB: ${expectedOptionCount} (${optionRange})
- Pertanyaan yang SUDAH ADA di naskah (DILARANG sama/mirip):
${existingQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n') || '-'}
- Soal lama yang diganti (buat sudut pandang baru, jangan menyalin ulang): ${targetSoal.pertanyaan}

Keluarkan HANYA 1 objek JSON butir soal valid (tanpa array, tanpa markdown), lengkap dengan kunci valid, pembahasan konsisten, indikatorSoal, bloomLevel, dan cognitiveRationale.
`;

  const parsed = await callGeminiStructuredJSON({
    prompt,
    temperature: 0.5,
    maxOutputTokens: 2048,
    geminiApiKey,
  });

  const normalized = normalizeButirSoal(parsed, targetSoal.nomor - 1, undefined, expectedOptionCount);
  if (!normalized) {
    throw new AiGenerationError(
      'Hasil regenerasi AI tidak memenuhi struktur atau kunci jawaban valid.',
      'invalid_ai_output',
      true
    );
  }

  const normalizedWithTP: ButirSoal = {
    ...normalized,
    id: normalized.id || targetSoal.id,
    nomor: targetSoal.nomor,
    tpId: targetSoal.tpId,
    tpKode: targetSoal.tpKode,
    subTpId: targetSoal.subTpId,
  };

  const singleIssues = validateSingleQuestion(normalizedWithTP, {
    expectedOptionCount,
    tpMap: assessment.tpMap,
    peerQuestions: assessment.soalList.filter((s) => s.id !== targetSoal.id),
    materiPokok: assessment.materiPokok,
  });

  if (singleIssues.some((i) => i.severity === 'error')) {
    throw new AiGenerationError(
      singleIssues.find((i) => i.severity === 'error')?.message ||
        'Soal hasil regenerasi belum memenuhi validasi mutu.',
      'invalid_ai_output',
      true
    );
  }

  return normalizedWithTP;
}

export async function generateRangkumanMateri(request: RangkumanRequest): Promise<RangkumanDokumen> {
  try {
    return await generateRangkumanWithGemini(request);
  } catch (err: any) {
    if (request.allowOfflineFallback) {
      const offline = buildSmartCurriculumRangkuman(request);
      return {
        ...offline,
        usedFallback: true,
        fallbackReason:
          err?.message ||
          'Layanan Gemini AI tidak tersedia; menggunakan kerangka rangkuman luring.',
      };
    }

    if (err instanceof AiGenerationError) {
      throw err;
    }
    throw new AiGenerationError(
      err?.message ||
        'Gagal menyusun rangkuman materi dengan Gemini AI. Periksa koneksi/API Key, atau aktifkan Kerangka Rangkuman Luring.',
      'api_unavailable',
      true
    );
  }
}

async function generateRangkumanWithGemini(req: RangkumanRequest): Promise<RangkumanDokumen> {
  const MAX_UPLOAD_CHARS = 100_000;
  const rawUpload = req.teksUpload || '';
  const sourceTruncated = req.modeInput === 'upload' && rawUpload.length > MAX_UPLOAD_CHARS;

  const tpContext =
    req.tujuanPembelajaran || req.subTP?.length || req.prasyarat
      ? `
KETERKAITAN KURIKULUM & TP:
- Kode/ID TP: ${req.tpKode || '-'} (${req.tpId || 'tanpa-id'})
- Tujuan Pembelajaran: ${req.tujuanPembelajaran || '-'}
- Sub-TP / Indikator: ${req.subTP?.join('; ') || '-'}
- Prasyarat: ${req.prasyarat || '-'}
- Bukti Ketercapaian: ${req.buktiKetercapaian?.join('; ') || '-'}
`
      : '';

  const gradeGuide = isSDLevelPhase(req.jenjangFase, req.kelas)
    ? 'Sesuaikan bahasa untuk peserta didik SD/MI: kalimat aktif sederhana, konkret, mudah dicerna, dan hindari jargon akademik SMA/universitas.'
    : 'Gunakan kedalaman konseptual, istilah ilmiah/akademik yang akurat, dan penalaran kritis sesuai jenjang SMP/SMA/SMK.';

  let contextSource = '';
  if (req.modeInput === 'upload') {
    contextSource = `
SUMBER MATERI DARI DOKUMEN/TEKS YANG DIUNGGAH GURU (${req.namaFile || 'Teks Materi'}):
${rawUpload.slice(0, MAX_UPLOAD_CHARS)}

ATURAN GROUNDING KETAT (MODE UNGGAHAN):
1. Rangkum isi teks unggahan secara setia, terstruktur, dan mendalam tanpa menghapus definisi, rumus, atau kaidah penting.
2. DILARANG mengarang statistik fiktif (mis. "meningkatkan ingatan 3x lipat" atau ">80%") dan DILARANG mengarang kutipan/rujukan buku yang tidak ada di dokumen.
3. Pisahkan dengan jelas antara fakta/intisari dari dokumen dan bagian pengayaan/analogi guru (beri label "[Dari Sumber]" atau "[Pengayaan Analogi]" bila menambahkan ilustrasi).
`;
  } else {
    contextSource = `
TOPIK / TEMA SPESIFIK YANG DIMINTA GURU:
- Topik Utama: "${req.topik}"
- Mata Pelajaran: "${req.mataPelajaran}"
- Jenjang & Kelas: ${req.jenjangFase} (Kelas ${req.kelas})
${tpContext}
- Catatan Khusus Guru: ${req.catatanKeinginan || 'Sajikan materi secara mendalam sesuai Kurikulum Merdeka, lengkap dengan rumus/pola struktur inti, contoh konkret dengan langkah analisis, serta kesalahan umum yang perlu dihindari.'}

ATURAN ANTI-HALUSINASI:
- DILARANG mencantumkan angka statistik persuasif/persentase karangan yang tidak memiliki sumber fakta ilmiah mapan.
- ${gradeGuide}
`;
  }

  const prompt = `
Anda adalah Pakar Kurikulum Merdeka dan Penulis Buku Ajar Profesional di Indonesia.
Susun Rangkuman Materi Pembelajaran yang AKURAT, MENDALAM, TERSTRUKTUR, dan BEBAS KLAIM FIKTIF untuk:
- Mata Pelajaran: "${req.mataPelajaran}"
- Topik: "${req.topik || req.namaFile || 'Materi Inti'}"
- Gaya Bahasa: ${req.gayaBahasa}
${contextSource}
Harus berupa JSON MURNI dengan properti lengkap:
judul, ringkasanSatuKalimat, petaKonsep (array string), rumusAtauPola (array {label, isi}), poinUtama (array {judul, penjelasan, analogi?, poinKunci}), contohKonkret ({judulContoh, teksContoh, bedahAnalisis}), tipsUjian (array string), faktaMenarik (array string faktual bebas statistik karangan), glosarium (array {istilah, makna}), kuisKilat (array {nomor, pertanyaan, jawaban}), pesanInspirasi.
`;

  const parsed = await callGeminiStructuredJSON({
    prompt,
    temperature: 0.3,
    maxOutputTokens: 6144,
    geminiApiKey: req.geminiApiKey,
  });

  const validPoinUtama =
    Array.isArray(parsed?.poinUtama) &&
    parsed.poinUtama.length > 0 &&
    parsed.poinUtama.every((p: any) => typeof p?.judul === 'string' && Array.isArray(p?.poinKunci))
      ? parsed.poinUtama
      : null;

  if (!validPoinUtama || typeof parsed?.ringkasanSatuKalimat !== 'string' || !parsed.ringkasanSatuKalimat.trim()) {
    throw new AiGenerationError(
      'Hasil rangkuman dari Gemini AI tidak lengkap atau terpotong. Silakan coba lagi atau gunakan kerangka luring secara eksplisit.',
      'invalid_ai_output',
      true
    );
  }

  const topicLabel = req.topik || req.namaFile || 'Materi Inti';

  return {
    id: 'RNG-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    judul:
      typeof parsed?.judul === 'string' && parsed.judul.trim()
        ? parsed.judul.trim()
        : `Rangkuman Materi: ${topicLabel}`,
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    topik: topicLabel,
    sumberAsal: req.modeInput,
    gayaBahasa: req.gayaBahasa,
    tpId: req.tpId,
    tpKode: req.tpKode,
    subTpId: req.subTpId,
    subTP: req.subTP,
    tujuanPembelajaran: req.tujuanPembelajaran,
    prasyarat: req.prasyarat,
    buktiKetercapaian: req.buktiKetercapaian,
    schoolId: req.schoolId,
    tahunAjaran: req.tahunAjaran,
    semester: req.semester,
    draftSource: 'ai_generated',
    usedFallback: false,
    namaFile: req.namaFile,
    sourceTruncated,
    sourceCharacterCount: req.modeInput === 'upload' ? rawUpload.length : undefined,
    ringkasanSatuKalimat: parsed.ringkasanSatuKalimat.trim(),
    petaKonsep:
      Array.isArray(parsed?.petaKonsep) && parsed.petaKonsep.length
        ? parsed.petaKonsep
        : validPoinUtama.map((p: { judul: string }) => p.judul),
    rumusAtauPola:
      Array.isArray(parsed?.rumusAtauPola) && parsed.rumusAtauPola.length ? parsed.rumusAtauPola : [],
    poinUtama: validPoinUtama,
    contohKonkret:
      parsed?.contohKonkret &&
      typeof parsed.contohKonkret.judulContoh === 'string' &&
      Array.isArray(parsed.contohKonkret.bedahAnalisis)
        ? parsed.contohKonkret
        : undefined,
    tipsUjian: Array.isArray(parsed?.tipsUjian) && parsed.tipsUjian.length ? parsed.tipsUjian : [],
    faktaMenarik:
      Array.isArray(parsed?.faktaMenarik) && parsed.faktaMenarik.length ? parsed.faktaMenarik : [],
    glosarium: Array.isArray(parsed?.glosarium) && parsed.glosarium.length ? parsed.glosarium : [],
    kuisKilat: Array.isArray(parsed?.kuisKilat) && parsed.kuisKilat.length ? parsed.kuisKilat : [],
    pesanInspirasi:
      typeof parsed?.pesanInspirasi === 'string' && parsed.pesanInspirasi.trim()
        ? parsed.pesanInspirasi.trim()
        : `Terus berlatih memahami inti materi ${topicLabel} dan kaitkan dengan persoalan nyata.`,
  };
}
