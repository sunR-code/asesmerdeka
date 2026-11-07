import type {
  GenerationRequest,
  AsesmenDokumen,
  ButirSoal,
} from '../types/assessment';
import type { RangkumanRequest, RangkumanDokumen } from '../types/summary';
import { buildSmartCurriculumRangkuman } from '../utils/rangkumanKnowledgeEngine';
import { buildSmartCurriculumAsesmen, buildSingleRegeneratedQuestion } from '../utils/asesmenKnowledgeEngine';
import { callGeminiStructuredJSON } from './geminiClient';

export function normalizeButirSoal(raw: any, index: number, fallback?: ButirSoal): ButirSoal | null {
  if (!raw || typeof raw !== 'object') return fallback || null;
  const nomor = typeof raw.nomor === 'number' ? raw.nomor : index + 1;
  const tipe = raw.tipe;

  if (tipe === 'pilihan_ganda') {
    const rawPilihan = Array.isArray(raw.pilihan) ? raw.pilihan : [];
    if (rawPilihan.length < 2 || typeof raw.pertanyaan !== 'string') {
      return fallback || null;
    }
    return {
      id: typeof raw.id === 'string' ? raw.id : `pg-${nomor}`,
      nomor,
      tipe: 'pilihan_ganda',
      stimulus: typeof raw.stimulus === 'string' ? raw.stimulus : undefined,
      pertanyaan: raw.pertanyaan,
      pilihan: rawPilihan.map((p: any, idx: number) => ({
        label: (['A', 'B', 'C', 'D', 'E'].includes(p?.label || p?.kode)
          ? (p.label || p.kode)
          : (['A', 'B', 'C', 'D', 'E'][idx] || 'A')) as 'A' | 'B' | 'C' | 'D' | 'E',
        teks: typeof p?.teks === 'string' ? p.teks : String(p?.teks ?? ''),
      })),
      kunci: (['A', 'B', 'C', 'D', 'E'].includes(raw.kunci || raw.kunciJawaban)
        ? (raw.kunci || raw.kunciJawaban)
        : 'A') as 'A' | 'B' | 'C' | 'D' | 'E',
      pembahasan: typeof raw.pembahasan === 'string' ? raw.pembahasan : '',
      levelKognitif: typeof raw.levelKognitif === 'string' ? raw.levelKognitif : 'C3 (Menerapkan)',
      indikatorSoal: typeof raw.indikatorSoal === 'string' ? raw.indikatorSoal : '',
      skor: typeof raw.skor === 'number' ? raw.skor : 10,
    };
  }

  if (tipe === 'pilihan_ganda_kompleks') {
    const rawPernyataan = Array.isArray(raw.pernyataan) ? raw.pernyataan : [];
    if (rawPernyataan.length === 0 || typeof raw.pertanyaan !== 'string') {
      return fallback || null;
    }
    return {
      id: typeof raw.id === 'string' ? raw.id : `pgk-${nomor}`,
      nomor,
      tipe: 'pilihan_ganda_kompleks',
      stimulus: typeof raw.stimulus === 'string' ? raw.stimulus : undefined,
      pertanyaan: raw.pertanyaan,
      pernyataan: rawPernyataan.map((p: any, idx: number) => ({
        id: typeof p?.id === 'string' ? p.id : `p${idx + 1}`,
        teks: typeof p?.teks === 'string' ? p.teks : String(p?.teks ?? ''),
        isBenar: Boolean(p?.isBenar),
      })),
      pembahasan: typeof raw.pembahasan === 'string' ? raw.pembahasan : '',
      levelKognitif: typeof raw.levelKognitif === 'string' ? raw.levelKognitif : 'C4 (Penalaran)',
      indikatorSoal: typeof raw.indikatorSoal === 'string' ? raw.indikatorSoal : '',
      skor: typeof raw.skor === 'number' ? raw.skor : 15,
    };
  }

  if (tipe === 'uraian') {
    if (typeof raw.pertanyaan !== 'string') {
      return fallback || null;
    }
    return {
      id: typeof raw.id === 'string' ? raw.id : `ur-${nomor}`,
      nomor,
      tipe: 'uraian',
      stimulus: typeof raw.stimulus === 'string' ? raw.stimulus : undefined,
      pertanyaan: raw.pertanyaan,
      pedomanPenskoran: typeof raw.pedomanPenskoran === 'string' ? raw.pedomanPenskoran : '',
      contohJawaban: typeof raw.contohJawaban === 'string' ? raw.contohJawaban : '',
      levelKognitif: typeof raw.levelKognitif === 'string' ? raw.levelKognitif : 'C4 (Menganalisis)',
      indikatorSoal: typeof raw.indikatorSoal === 'string' ? raw.indikatorSoal : '',
      skorMaksimal: typeof raw.skorMaksimal === 'number' ? raw.skorMaksimal : 20,
    };
  }

  return fallback || null;
}

export async function generateAsesmen(request: GenerationRequest): Promise<AsesmenDokumen> {
  try {
    return await generateWithGeminiAPI(request);
  } catch (err: any) {
    console.warn('Gemini AI generation failed, falling back to smart curriculum assessment engine:', err);
    return buildSmartCurriculumAsesmen(request);
  }
}

async function generateWithGeminiAPI(req: GenerationRequest): Promise<AsesmenDokumen> {
  const isSMA =
    req.jenjangFase.includes('SMA') ||
    req.jenjangFase.includes('SMK') ||
    req.jenjangFase.includes('Fase E') ||
    req.jenjangFase.includes('Fase F') ||
    ['10', '11', '12'].includes(req.kelas);

  const rangkumanContext = req.sourceRangkuman
    ? `\nKONTEKS RANGKUMAN MATERI SUMBER (Buat butir soal yang menguji langsung isi rangkuman ini):\n- Intisari: ${req.sourceRangkuman.ringkasanSatuKalimat}\n- Poin Utama: ${req.sourceRangkuman.poinUtama.map((p) => `${p.judul}: ${p.penjelasan}`).join(' | ')}\n- Contoh Konkret: ${req.sourceRangkuman.contohKonkret?.teksContoh || '-'}\n`
    : '';

  const prompt = `
Anda adalah Pakar Kurikulum Merdeka Kemendikbudristek RI dan Penulis Soal Ujian Nasional / AKM Terbaik.
Tugas Anda: Buat dokumen Asesmen Lengkap (${req.tipeAsesmen}) untuk jenjang ${req.jenjangFase}, Kelas ${req.kelas}, Mata Pelajaran: ${req.mataPelajaran}.

Materi Pokok: ${req.materiPokok}
Tujuan Pembelajaran (TP): ${req.tujuanPembelajaranInput || 'Siswa mampu memahami, menganalisis, dan memecahkan masalah kontekstual sesuai materi.'}
Alokasi Waktu: ${req.alokasiWaktu}
${rangkumanContext}
ATURAN KUALITAS SOAL WAJIB:
1. DILARANG KERAS membuat opsi pilihan ganda berpola template seperti "Alternatif penyelesaian A..." dan DILARANG mengulang soal yang sama! Setiap stimulus, pertanyaan, dan pilihan jawaban HARUS unik, spesifik, dan bermakna sesuai materi "${req.materiPokok}".
2. PENYESUAIAN JENJANG KELAS:
   - Untuk SD/MI (Kelas 1–6) & SMP/MTs (Kelas 7–9): Soal Pilihan Ganda menggunakan 4 opsi (A, B, C, D). Khusus SD, gunakan kalimat pendek, kosakata sederhana sesuai usia anak SD, dan konteks keseharian.
   - Untuk SMA/MA/SMK (Kelas 10–12): Soal Pilihan Ganda menggunakan 5 opsi (A, B, C, D, E) dengan stimulus analitis/kontekstual industri atau akademik.
   - Sebarkan posisi Kunci Jawaban secara merata dan acak di antara ${isSMA ? 'A, B, C, D, dan E' : 'A, B, C, dan D'} (jangan menumpuk di satu huruf!).
3. Jika Mata Pelajaran adalah Bahasa Inggris:
   - Teks bacaan (stimulus), kalimat pertanyaan, dan opsi pilihan jawaban WAJIB ditulis dalam Bahasa Inggris yang autentik dan sesuai level Kelas ${req.kelas}.
   - Bagian "pembahasan" ditulis dalam Bahasa Indonesia yang jelas agar mudah dipelajari siswa & guru.
4. Jika Mata Pelajaran adalah Matematika / Fisika / Kimia / Ekonomi:
   - Berikan soal cerita kontekstual atau data angka nyata, pilihan jawaban berupa angka/persamaan nyata, dan langkah perhitungan tuntas yang 100% akurat secara matematis pada "pembahasan".

Target Komposisi Soal:
- Pilihan Ganda (PG): ${req.jumlahPG} butir (dengan ${isSMA ? '5 pilihan A-E' : '4 pilihan A-D'}, kunci seimbang, pembahasan tuntas)
- Pilihan Ganda Kompleks (PGK standar AKM): ${req.jumlahPGK} butir (memiliki stimulus konteks nyata, 3 pernyataan Benar/Salah)
- Uraian/Essay: ${req.jumlahUraian} butir (dengan pedoman penskoran & contoh jawaban ideal)
- Level Kognitif Wajib: ${req.levelKognitif}
- Rubrik KKTP (Kriteria Ketercapaian Tujuan Pembelajaran): ${req.sertakanRubrik ? 'Sertakan rubrik 4 tingkatan (Perlu Bimbingan, Cukup, Baik, Sangat Baik)' : 'Opsional'}

WAJIB FORMAT OUTPUT HANYA JSON MURNI (tanpa teks pengantar) dengan struktur schema berikut:
{
  "judul": "string judul asesmen",
  "capaianPembelajaran": "string ringkasan CP",
  "tujuanPembelajaran": ["string butir TP 1", "string butir TP 2"],
  "profilPelajarPancasila": ["Bernalar Kritis", "Kreatif", "Mandiri", "Gotong Royong"],
  "petunjukUmum": ["string petunjuk 1", "string petunjuk 2"],
  "soalList": [],
  "rubrikKKTP": []
}
`;

  const parsed = await callGeminiStructuredJSON({
    prompt,
    temperature: 0.4,
    geminiApiKey: req.geminiApiKey,
  });
  const fallbackDoc = buildSmartCurriculumAsesmen(req);

  const rawSoalList = Array.isArray(parsed?.soalList) ? parsed.soalList : [];
  const normalizedSoalList: ButirSoal[] = rawSoalList
    .map((item: any, idx: number) => normalizeButirSoal(item, idx, fallbackDoc.soalList[idx]))
    .filter((item: ButirSoal | null): item is ButirSoal => item !== null);

  return {
    id: 'DOC-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    judul: typeof parsed?.judul === 'string' && parsed.judul ? parsed.judul : fallbackDoc.judul,
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    tipeAsesmen: req.tipeAsesmen,
    alokasiWaktu: req.alokasiWaktu,
    tahunAjaran: '2024/2025',
    namaSekolah: req.namaSekolah || 'Sekolah Penggerak Merdeka',
    namaPenyusun: req.namaGuru || 'Guru Pamong',
    capaianPembelajaran:
      typeof parsed?.capaianPembelajaran === 'string' && parsed.capaianPembelajaran
        ? parsed.capaianPembelajaran
        : fallbackDoc.capaianPembelajaran,
    tujuanPembelajaran:
      Array.isArray(parsed?.tujuanPembelajaran) && parsed.tujuanPembelajaran.length > 0
        ? parsed.tujuanPembelajaran
        : fallbackDoc.tujuanPembelajaran,
    materiPokok: req.materiPokok,
    profilPelajarPancasila:
      Array.isArray(parsed?.profilPelajarPancasila) && parsed.profilPelajarPancasila.length > 0
        ? parsed.profilPelajarPancasila
        : fallbackDoc.profilPelajarPancasila,
    petunjukUmum:
      Array.isArray(parsed?.petunjukUmum) && parsed.petunjukUmum.length > 0
        ? parsed.petunjukUmum
        : fallbackDoc.petunjukUmum,
    soalList: normalizedSoalList.length > 0 ? normalizedSoalList : fallbackDoc.soalList,
    rubrikKKTP:
      Array.isArray(parsed?.rubrikKKTP) && parsed.rubrikKKTP.length > 0
        ? parsed.rubrikKKTP
        : fallbackDoc.rubrikKKTP,
  };
}

export async function regenerateSingleQuestion(
  assessment: AsesmenDokumen,
  targetSoal: ButirSoal,
  geminiApiKey?: string
): Promise<ButirSoal> {
  try {
    return await regenerateSingleQuestionWithGemini(assessment, targetSoal, geminiApiKey);
  } catch (e) {
    console.warn('AI error during single question regen, fallback to smart curriculum engine:', e);
    return buildSingleRegeneratedQuestion(assessment, targetSoal);
  }
}

async function regenerateSingleQuestionWithGemini(
  assessment: AsesmenDokumen,
  targetSoal: ButirSoal,
  geminiApiKey?: string
): Promise<ButirSoal> {
  const prompt = `
Anda adalah Pakar Asesmen Kurikulum Merdeka.
Tugas Anda: Buat SATU butir soal baru pengganti untuk Nomor ${targetSoal.nomor}.
Mata Pelajaran: ${assessment.mataPelajaran}
Jenjang: ${assessment.jenjangFase}, Kelas ${assessment.kelas}
Materi Pokok: ${assessment.materiPokok}
Tipe Soal yang Diminta: ${targetSoal.tipe} (Wajib bertipe ini)

WAJIB FORMAT OUTPUT HANYA JSON MURNI dari 1 objek butir soal (tanpa array atau teks pengantar).
`;

  const parsed = await callGeminiStructuredJSON({
    prompt,
    temperature: 0.6,
    geminiApiKey,
  });
  const fallback = buildSingleRegeneratedQuestion(assessment, targetSoal);
  const normalized = normalizeButirSoal(parsed, targetSoal.nomor - 1, fallback);
  return normalized || fallback;
}

export async function generateRangkumanMateri(request: RangkumanRequest): Promise<RangkumanDokumen> {
  try {
    return await generateRangkumanWithGemini(request);
  } catch (err: any) {
    console.warn('Gemini API call failed for summary, using smart curriculum engine:', err);
    return buildSmartCurriculumRangkuman(request);
  }
}

async function generateRangkumanWithGemini(req: RangkumanRequest): Promise<RangkumanDokumen> {
  let contextSource = '';
  if (req.modeInput === 'upload') {
    contextSource = `
SUMBER MATERI DARI DOKUMEN/TEKS YANG DIUNGGAH USER:
${(req.teksUpload || '').slice(0, 100_000)}

Instruksi Khusus: Rangkum teks materi di atas secara menyeluruh, akurat, dan mendalam. Jangan tinggalkan definisi, rumus, struktur teks, atau contoh penting. Ubah bahasa yang kaku menjadi menarik, terstruktur, dan mudah dipahami siswa.
`;
  } else {
    contextSource = `
TOPIK / TEMA SPESIFIK YANG DIMINTA GURU:
Topik Utama: "${req.topik}"
Mata Pelajaran: "${req.mataPelajaran}"
Jenjang & Kelas: ${req.jenjangFase} (Kelas ${req.kelas})
Catatan Keinginan Khusus Guru: ${req.catatanKeinginan || 'Sajikan materi secara mendalam sesuai Kurikulum Merdeka, lengkap dengan rumus/pola struktur inti, contoh konkret beserta bedah analisisnya, serta tips jitu ujian.'}
`;
  }

  const prompt = `
Anda adalah Guru Teladan Nasional Indonesia, Pakar Kurikulum Merdeka, dan Penulis Buku Ajar Terbaik.
Tugas Anda: Buat Rangkuman Materi Pembelajaran yang SANGAT SPESIFIK, AKURAT, MENDALAM, dan MENARIK sesuai Mata Pelajaran "${req.mataPelajaran}" dengan Tema/Topik "${req.topik || req.namaFile}".
Gaya Bahasa & Penyampaian: ${req.gayaBahasa}.
${contextSource}
Harus berupa JSON MURNI dengan properti: judul, ringkasanSatuKalimat, petaKonsep, rumusAtauPola, poinUtama, contohKonkret, tipsUjian, faktaMenarik, glosarium, kuisKilat, pesanInspirasi.
`;

  const parsed = await callGeminiStructuredJSON({
    prompt,
    temperature: 0.35,
    geminiApiKey: req.geminiApiKey,
  });
  const fallbackDoc = buildSmartCurriculumRangkuman(req);

  const validPoinUtama =
    Array.isArray(parsed?.poinUtama) &&
    parsed.poinUtama.length > 0 &&
    parsed.poinUtama.every((p: any) => typeof p?.judul === 'string' && Array.isArray(p?.poinKunci))
      ? parsed.poinUtama
      : fallbackDoc.poinUtama;

  return {
    id: 'RNG-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    judul: typeof parsed?.judul === 'string' && parsed.judul ? parsed.judul : fallbackDoc.judul,
    mataPelajaran: req.mataPelajaran,
    jenjangFase: req.jenjangFase,
    kelas: req.kelas,
    topik: req.topik || req.namaFile || 'Materi Inti',
    sumberAsal: req.modeInput,
    gayaBahasa: req.gayaBahasa,
    ringkasanSatuKalimat:
      typeof parsed?.ringkasanSatuKalimat === 'string' && parsed.ringkasanSatuKalimat
        ? parsed.ringkasanSatuKalimat
        : fallbackDoc.ringkasanSatuKalimat,
    petaKonsep: Array.isArray(parsed?.petaKonsep) && parsed.petaKonsep.length ? parsed.petaKonsep : fallbackDoc.petaKonsep,
    rumusAtauPola:
      Array.isArray(parsed?.rumusAtauPola) && parsed.rumusAtauPola.length ? parsed.rumusAtauPola : fallbackDoc.rumusAtauPola,
    poinUtama: validPoinUtama,
    contohKonkret:
      parsed?.contohKonkret &&
      typeof parsed.contohKonkret.judulContoh === 'string' &&
      Array.isArray(parsed.contohKonkret.bedahAnalisis)
        ? parsed.contohKonkret
        : fallbackDoc.contohKonkret,
    tipsUjian: Array.isArray(parsed?.tipsUjian) && parsed.tipsUjian.length ? parsed.tipsUjian : fallbackDoc.tipsUjian,
    faktaMenarik:
      Array.isArray(parsed?.faktaMenarik) && parsed.faktaMenarik.length ? parsed.faktaMenarik : fallbackDoc.faktaMenarik,
    glosarium: Array.isArray(parsed?.glosarium) && parsed.glosarium.length ? parsed.glosarium : fallbackDoc.glosarium,
    kuisKilat: Array.isArray(parsed?.kuisKilat) && parsed.kuisKilat.length ? parsed.kuisKilat : fallbackDoc.kuisKilat,
    pesanInspirasi:
      typeof parsed?.pesanInspirasi === 'string' && parsed.pesanInspirasi
        ? parsed.pesanInspirasi
        : fallbackDoc.pesanInspirasi,
  };
}
