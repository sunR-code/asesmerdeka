import { callGeminiStructuredJSON, executeMeteredAICall } from '../services/geminiClient';
import {
  cpEntryToReferenceMeta,
  type CPAnalysisResult,
  type CPAnalysisTPCandidate,
  type SavedCPEntry,
} from './cpStorage';
import type { CustomTPItem, SubTPItem } from './schoolProfileStorage';
import { createCustomImmutableTPId, type AcademicProfileLike } from './storageIdentity';

export interface AnalyzeCPRequest {
  cpEntry: SavedCPEntry;
  kelas: string;
  semester: string;
  alokasiJPDefault?: number;
}

export interface AnalyzeCPServiceOutcome {
  ok: boolean;
  analysis: CPAnalysisResult;
  aiUnavailableReason?: string;
}

const CP_ANALYSIS_SYSTEM_INSTRUCTION = `Anda adalah asisten pakar desain kurikulum Merdeka Kemendikdasmen 2025.
Tugas Anda adalah membantu guru menganalisis teks Capaian Pembelajaran (CP) menjadi komponen pedagogis:
1. Kompetensi yang perlu dikuasai murid (kata kerja/kemampuan inti dalam CP).
2. Lingkup Materi atau konten esensial.
3. Kata Kerja Operasional (KKO) yang relevan dan terukur untuk TP.
4. Contoh bukti ketercapaian yang dapat diamati guru di kelas.
5. Usulan pembagian menjadi 1 sampai maksimal 4 Tujuan Pembelajaran (TP) yang proporsional.

ATURAN WAJIB:
- JANGAN mengubah, menulis ulang, atau memalsukan teks CP asli yang diberikan guru.
- HINDARI memecah satu kalimat CP menjadi terlalu banyak TP mikro yang tidak realistis. Gabungkan gagasan yang saling terkait erat ke dalam 1-4 TP bermakna untuk satu fase/elemen.
- Seluruh keluaran merupakan USULAN untuk ditinjau dan disetujui guru, bukan dokumen resmi final.`;

function cleanStringArray(val: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(val)) return fallback;
  return val
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function normalizeTPCandidateList(
  rawList: unknown,
  cpEntry: SavedCPEntry
): CPAnalysisTPCandidate[] {
  if (!Array.isArray(rawList)) return [];
  // Batasi maksimal 4 kandidat TP per analisis elemen agar tidak terjadi over-splitting kalimat CP.
  return rawList.slice(0, 4).map((raw, idx) => {
    const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const bukti = cleanStringArray(obj.buktiKetercapaian);
    const prasyarat = cleanStringArray(obj.prasyaratSaran);
    return {
      id:
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : `tp_cand_${Date.now().toString(36)}_${idx + 1}`,
      kodeSaran:
        typeof obj.kodeSaran === 'string' && obj.kodeSaran.trim()
          ? obj.kodeSaran.trim()
          : `TP.${idx + 1}`,
      elemenCP:
        typeof obj.elemenCP === 'string' && obj.elemenCP.trim()
          ? obj.elemenCP.trim()
          : cpEntry.elemenCP,
      kompetensi: typeof obj.kompetensi === 'string' ? obj.kompetensi.trim() : '',
      lingkupMateri: typeof obj.lingkupMateri === 'string' ? obj.lingkupMateri.trim() : '',
      materiPokok:
        typeof obj.materiPokok === 'string' && obj.materiPokok.trim()
          ? obj.materiPokok.trim()
          : typeof obj.lingkupMateri === 'string'
          ? obj.lingkupMateri.trim()
          : cpEntry.elemenCP,
      tujuanPembelajaran:
        typeof obj.tujuanPembelajaran === 'string' ? obj.tujuanPembelajaran.trim() : '',
      buktiKetercapaian: bukti,
      prasyaratSaran: prasyarat.length > 0 ? prasyarat : undefined,
      catatan: typeof obj.catatan === 'string' && obj.catatan.trim() ? obj.catatan.trim() : undefined,
    };
  });
}

export function createBlankManualCPAnalysis(
  cpEntry: SavedCPEntry,
  kelas: string = '8'
): CPAnalysisResult {
  const now = new Date().toISOString();
  const cleanKelas = (kelas || '8').replace(/[^0-9]/g, '') || '8';
  return {
    id: `acp_${Date.now().toString(36)}`,
    cpEntryId: cpEntry.id,
    elemenCPAsal: cpEntry.elemenCP,
    teksCPAsli: cpEntry.teksCP,
    kompetensi: [],
    lingkupMateri: [],
    kkoRelevan: [],
    contohBuktiKetercapaian: [],
    saranPembagianTP: [
      {
        id: `tp_cand_${Date.now().toString(36)}_1`,
        kodeSaran: `${cleanKelas}.1`,
        elemenCP: cpEntry.elemenCP,
        kompetensi: '',
        lingkupMateri: '',
        materiPokok: '',
        tujuanPembelajaran: '',
        buktiKetercapaian: [],
      },
    ],
    sumberAnalisis: 'manual_guru',
    statusPersetujuan: 'usulan_belum_disetujui',
    referensiCP: cpEntryToReferenceMeta(cpEntry),
    dibuatPada: now,
  };
}

export async function analyzeCPWithAI(
  request: AnalyzeCPRequest
): Promise<AnalyzeCPServiceOutcome> {
  const { cpEntry, kelas, semester } = request;
  if (!cpEntry.teksCP || cpEntry.teksCP.trim().length < 12) {
    return {
      ok: false,
      analysis: createBlankManualCPAnalysis(cpEntry, kelas),
      aiUnavailableReason:
        'Teks CP asli masih kosong atau terlalu singkat. Tempel teks CP terlebih dahulu atau isi analisis manual.',
    };
  }

  const prompt = `Analisis teks Capaian Pembelajaran (CP) berikut tanpa mengubah teks aslinya:

Mata Pelajaran: ${cpEntry.mataPelajaran}
Jenjang / Fase: ${cpEntry.jenjang} / ${cpEntry.fase}
Kelas / Semester target guru: Kelas ${kelas}, ${semester}
Elemen CP Asal: ${cpEntry.elemenCP}
Dokumen Rujukan: ${cpEntry.nomorDokumen} (${cpEntry.tahunVersiDokumen})
Teks CP Asli:
"""
${cpEntry.teksCP}
"""

Keluarkan JSON dengan struktur persis:
{
  "kompetensi": ["daftar kompetensi kunci yang ditargetkan CP"],
  "lingkupMateri": ["daftar lingkup materi atau konten esensial dalam CP"],
  "kkoRelevan": ["daftar 3-6 kata kerja operasional terukur yang relevan dengan CP"],
  "contohBuktiKetercapaian": ["daftar contoh bukti ketercapaian konkret yang dapat diamati"],
  "saranPembagianTP": [
    {
      "kodeSaran": "${kelas.replace(/[^0-9]/g, '') || '8'}.1",
      "elemenCP": "${cpEntry.elemenCP}",
      "kompetensi": "kompetensi inti untuk TP ini",
      "lingkupMateri": "lingkup materi esensial TP ini",
      "materiPokok": "judul topik/bab singkat",
      "tujuanPembelajaran": "kalimat TP utuh memuat Kompetensi + Lingkup Materi",
      "buktiKetercapaian": ["indikator bukti teramati 1", "indikator bukti teramati 2"],
      "prasyaratSaran": ["prasyarat jika ada"]
    }
  ]
}
Pastikan saranPembagianTP hanya 1 hingga maksimal 4 TP yang utuh dan bermakna (jangan memecah kalimat secara berlebihan).`;

  try {
    const raw = await executeMeteredAICall(() =>
      callGeminiStructuredJSON({
        prompt,
        systemInstruction: CP_ANALYSIS_SYSTEM_INSTRUCTION,
        temperature: 0.3,
        maxOutputTokens: 3072,
      })
    );

    const kompetensi = cleanStringArray(raw?.kompetensi);
    const lingkupMateri = cleanStringArray(raw?.lingkupMateri);
    const kkoRelevan = cleanStringArray(raw?.kkoRelevan);
    const contohBukti = cleanStringArray(raw?.contohBuktiKetercapaian);
    const saranPembagianTP = normalizeTPCandidateList(raw?.saranPembagianTP, cpEntry);

    if (
      kompetensi.length === 0 &&
      lingkupMateri.length === 0 &&
      saranPembagianTP.length === 0
    ) {
      return {
        ok: false,
        analysis: createBlankManualCPAnalysis(cpEntry, kelas),
        aiUnavailableReason:
          'Respon analisis AI tidak menghasilkan Kompetensi atau Lingkup Materi yang valid. Silakan isi form analisis manual.',
      };
    }

    return {
      ok: true,
      analysis: {
        id: `acp_${Date.now().toString(36)}`,
        cpEntryId: cpEntry.id,
        elemenCPAsal: cpEntry.elemenCP,
        // Selalu pertahankan teks CP asli dari cpEntry, bukan hasil penulisan ulang AI.
        teksCPAsli: cpEntry.teksCP,
        kompetensi,
        lingkupMateri,
        kkoRelevan,
        contohBuktiKetercapaian: contohBukti,
        saranPembagianTP:
          saranPembagianTP.length > 0
            ? saranPembagianTP
            : createBlankManualCPAnalysis(cpEntry, kelas).saranPembagianTP,
        sumberAnalisis: 'ai_usulan',
        statusPersetujuan: 'usulan_belum_disetujui',
        referensiCP: cpEntryToReferenceMeta(cpEntry),
        dibuatPada: new Date().toISOString(),
      },
    };
  } catch (err) {
    const reason =
      err instanceof Error
        ? err.message
        : 'Layanan AI tidak tersedia saat ini. Gunakan form analisis manual.';
    return {
      ok: false,
      analysis: createBlankManualCPAnalysis(cpEntry, kelas),
      aiUnavailableReason: reason,
    };
  }
}

export function updateCPAnalysisDraft(
  analysis: CPAnalysisResult,
  patch: Partial<CPAnalysisResult>
): CPAnalysisResult {
  return {
    ...analysis,
    ...patch,
    // Invariant: teks CP asli dan elemen asal tidak boleh berubah akibat proses analisis/penyuntingan analisis.
    teksCPAsli: analysis.teksCPAsli,
    elemenCPAsal: analysis.elemenCPAsal,
    cpEntryId: analysis.cpEntryId,
  };
}

export function approveCPAnalysis(
  analysis: CPAnalysisResult,
  catatanGuru?: string
): CPAnalysisResult {
  return {
    ...analysis,
    statusPersetujuan: 'disetujui_guru',
    disetujuiPada: new Date().toISOString(),
    catatanGuru: catatanGuru !== undefined ? catatanGuru : analysis.catatanGuru,
  };
}

export function buildTPDraftFromApprovedAnalysis(params: {
  analysis: CPAnalysisResult;
  candidateIndex?: number;
  profile: AcademicProfileLike;
  existingTPCount?: number;
  alokasiJP?: number;
  cpEntry?: SavedCPEntry;
}): CustomTPItem {
  const { analysis, candidateIndex = 0, profile, existingTPCount = 0, alokasiJP = 12, cpEntry } =
    params;
  if (analysis.statusPersetujuan !== 'disetujui_guru') {
    throw new Error(
      'Hasil Analisis CP harus ditinjau dan disetujui guru terlebih dahulu sebelum diteruskan menjadi TP.'
    );
  }

  const candidate = analysis.saranPembagianTP[candidateIndex];
  const cleanKelas = (profile.kelasUtama || '8').replace(/[^0-9]/g, '') || '8';
  const isSem2 = (profile.semester || '').startsWith('2');
  const defaultNum = isSem2 ? existingTPCount + 5 : existingTPCount + 1;
  const tpId = createCustomImmutableTPId(profile);

  const kompetensiValue =
    (candidate?.kompetensi || '').trim() ||
    analysis.kompetensi.join('; ') ||
    'Kompetensi terukur sesuai elemen CP';
  const lingkupValue =
    (candidate?.lingkupMateri || '').trim() ||
    analysis.lingkupMateri.join('; ') ||
    analysis.elemenCPAsal;
  const materiValue =
    (candidate?.materiPokok || '').trim() ||
    lingkupValue ||
    `Materi ${analysis.elemenCPAsal}`;
  const tpSentence =
    (candidate?.tujuanPembelajaran || '').trim() ||
    `Peserta didik mampu ${kompetensiValue} pada lingkup materi ${lingkupValue}.`;
  const buktiList =
    candidate?.buktiKetercapaian && candidate.buktiKetercapaian.length > 0
      ? candidate.buktiKetercapaian
      : analysis.contohBuktiKetercapaian;

  const kodeTP = (candidate?.kodeSaran || '').trim() || `${cleanKelas}.${defaultNum}`;
  const subTP: SubTPItem[] =
    buktiList.length > 0
      ? buktiList.slice(0, 3).map((b, sIdx) => ({
          id: `${tpId}__sub_${String.fromCharCode(97 + sIdx)}`,
          kode: `${kodeTP}.${String.fromCharCode(65 + sIdx)}`,
          kompetensi: sIdx === 0 ? kompetensiValue : b,
          fokusMateri: lingkupValue,
          buktiKetercapaian: b,
        }))
      : [];

  const nextIdx = existingTPCount + 1;
  const refMeta = cpEntry ? cpEntryToReferenceMeta(cpEntry) : analysis.referensiCP;

  return {
    id: tpId,
    kode: kodeTP,
    elemen: candidate?.elemenCP || analysis.elemenCPAsal,
    materiPokok: materiValue,
    tujuanPembelajaran: tpSentence,
    arahanRangkuman: `Fokus kompetensi: ${kompetensiValue}. Lingkup materi esensial: ${lingkupValue}.`,
    alokasiJP,
    mingguMulai: Math.min(18, (nextIdx - 1) * 4 + 1),
    mingguSelesai: Math.min(20, nextIdx * 4),
    kompetensiInti: kompetensiValue,
    lingkupMateri: lingkupValue,
    prasyarat: candidate?.prasyaratSaran,
    buktiKetercapaian: buktiList.length > 0 ? buktiList : undefined,
    statusReview: 'disetujui',
    referensiCP: refMeta,
    analisisCPId: analysis.id,
    subTP: subTP.length > 0 ? subTP : undefined,
  };
}
