import type { RangkumanRequest, RangkumanDokumen } from '../types/summary';
import { cleanTopicTitle, applyGayaBahasaToRangkuman } from './rangkuman/helpers';
import { buildEnglishTopicRangkuman } from './rangkuman/englishRangkuman';
import { buildMathTopicRangkuman } from './rangkuman/mathRangkuman';
import { buildIndonesianTopicRangkuman } from './rangkuman/indonesianRangkuman';
import { buildScienceTopicRangkuman } from './rangkuman/scienceRangkuman';
import {
  buildContextualSubjectRangkuman,
  buildRangkumanFromUploadedText,
} from './rangkuman/contextualSubjectRangkuman';

/**
 * Engine Pintar Pembuat Rangkuman Kurikulum Merdeka (Domain-Aware, Grade-Aware & Topic-Specific)
 * Menjamin hasil rangkuman 100% relevan dengan Mata Pelajaran, Jenjang Kelas (SD vs SMP vs SMA/SMK),
 * serta Tema/Topik yang dipilih guru.
 */
export function buildSmartCurriculumRangkuman(
  req: RangkumanRequest,
  noteTag?: string
): RangkumanDokumen {
  const id = 'RNG-' + Date.now().toString(36).toUpperCase();
  const createdAt = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const stampContext = (doc: RangkumanDokumen): RangkumanDokumen => {
    const withStyle = applyGayaBahasaToRangkuman(doc, req);
    return {
      ...withStyle,
      tpId: withStyle.tpId || req.tpId,
      tpKode: withStyle.tpKode || req.tpKode,
      subTpId: withStyle.subTpId || req.subTpId,
      subTP: withStyle.subTP || req.subTP,
      tujuanPembelajaran: withStyle.tujuanPembelajaran || req.tujuanPembelajaran,
      prasyarat: withStyle.prasyarat || req.prasyarat,
      buktiKetercapaian: withStyle.buktiKetercapaian || req.buktiKetercapaian,
      schoolId: withStyle.schoolId || req.schoolId,
      tahunAjaran: withStyle.tahunAjaran || req.tahunAjaran,
      semester: withStyle.semester || req.semester,
      namaFile: withStyle.namaFile || req.namaFile,
      draftSource: withStyle.draftSource || (req.modeInput === 'upload' ? 'upload_heuristic' : 'template'),
      usedFallback: withStyle.usedFallback ?? true,
      fallbackReason:
        withStyle.fallbackReason ||
        'Disusun menggunakan kerangka templat luring (non-AI); harap tinjau kesesuaian isi dengan konteks TP.',
    };
  };

  if (req.modeInput === 'upload' && req.teksUpload && req.teksUpload.trim().length > 20) {
    return stampContext(buildRangkumanFromUploadedText(req, id, createdAt, noteTag));
  }

  const rawTopik = cleanTopicTitle(req.topik || 'Materi Pokok Kurikulum Merdeka');
  const lowerTopik = rawTopik.toLowerCase();
  const lowerMapel = req.mataPelajaran.toLowerCase();

  // 1. DETEKSI BAHASA INGGRIS (SD vs SMP vs SMA/SMK)
  if (
    lowerMapel.includes('inggris') ||
    lowerTopik.includes('descriptive') ||
    lowerTopik.includes('procedure') ||
    lowerTopik.includes('recount') ||
    lowerTopik.includes('narrative') ||
    lowerTopik.includes('exposition') ||
    lowerTopik.includes('application letter')
  ) {
    return stampContext(buildEnglishTopicRangkuman(req, rawTopik, lowerTopik, id, createdAt, noteTag));
  }

  // 2. DETEKSI MATEMATIKA (SD vs SMP vs SMA/SMK dengan Contoh Soal Terhitung Nyata)
  if (
    lowerMapel.includes('matematika') ||
    lowerTopik.includes('spldv') ||
    lowerTopik.includes('persamaan linear') ||
    lowerTopik.includes('pythagoras') ||
    lowerTopik.includes('trigonometri') ||
    lowerTopik.includes('pecahan') ||
    lowerTopik.includes('bangun datar') ||
    lowerTopik.includes('barisan') ||
    lowerTopik.includes('deret') ||
    lowerTopik.includes('matriks') ||
    lowerTopik.includes('peluang') ||
    lowerTopik.includes('statistika')
  ) {
    return stampContext(buildMathTopicRangkuman(req, rawTopik, lowerTopik, id, createdAt, noteTag));
  }

  // 3. DETEKSI BAHASA INDONESIA
  if (lowerMapel.includes('indonesia')) {
    return stampContext(buildIndonesianTopicRangkuman(req, rawTopik, lowerTopik, id, createdAt, noteTag));
  }

  // 4. DETEKSI IPA / IPAS / FISIKA / KIMIA / BIOLOGI / PROJEK IPAS
  if (
    lowerMapel.includes('ipa') ||
    lowerMapel.includes('fisika') ||
    lowerMapel.includes('kimia') ||
    lowerMapel.includes('biologi') ||
    lowerTopik.includes('fotosintesis') ||
    lowerTopik.includes('ekosistem') ||
    lowerTopik.includes('tata surya') ||
    lowerTopik.includes('energi') ||
    lowerTopik.includes('hukum newton')
  ) {
    return stampContext(buildScienceTopicRangkuman(req, rawTopik, lowerTopik, id, createdAt, noteTag));
  }

  // 5. DETEKSI MATA PELAJARAN LAINNYA (IPS, Ekonomi, Sejarah, Pancasila, PAI/Madrasah, Informatika/PKK, PJOK, Seni Budaya)
  return stampContext(buildContextualSubjectRangkuman(req, rawTopik, id, createdAt, noteTag));
}
