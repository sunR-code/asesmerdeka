import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { jenjangToDefaultFase } from './schoolProfileStorage';
import type {
  LKPDPresetType,
  LKPDDokumen,
  LKPDEksperimenData,
  LKPDDiferensiasiData,
  LKPDProyekData,
  LKPDPertanyaanItem,
} from '../types/perangkatAjar';
import { buildSmartLKPD } from './perangkatAjarEngine';
import { deductQuota, refundQuota } from './paymentGateway';
import { callGeminiStructuredJSON } from '../services/geminiClient';

export interface ContextualLKPDResult {
  lkpd: LKPDDokumen;
  usedFallback: boolean;
  errorMsg?: string;
}

/**
 * Membangun prompt instruksi terstruktur untuk Google Gemini API
 * menyesuaikan 4 Archetype Pedagogis Kurikulum Merdeka.
 */
export function buildLKPDGeminiPrompt(
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType,
  topikKonteks: string
): string {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);

  let archetypeGuidance = '';
  switch (presetType) {
    case 'eksperimen':
      archetypeGuidance = `
Tipe Preset: Eksperimen & Penyelidikan Sains/Praktik Kontekstual.
Wajib menyertakan properti "eksperimenData" dengan spesifikasi:
- "alatDanBahan": daftar alat dan bahan sederhana yang relevan dengan topik "${topikKonteks}".
- "hipotesisAwal": rumusan hipotesis awal ilmiah yang logis untuk diuji siswa.
- "tabelObservasi": objek berisi "kolom" (array nama kolom, misal No, Variabel, Hasil, Keterangan) dan "baris" (minimal 3 baris data/pengamatan panduan).
Sediakan juga "langkahAktivitas" praktis pengujian dan "pertanyaanAnalisis" berdasarkan hasil observasi.
`;
      break;

    case 'diferensiasi':
      archetypeGuidance = `
Tipe Preset: Tugas Berdiferensiasi Terstruktur (Berdasarkan Kesiapan Belajar Siswa).
Wajib menyertakan properti "diferensiasiData" dengan spesifikasi 3 jalur kesiapan:
- "tingkatDasar": objek { "instruksi": string, "tugas": string[] (minimal 3 butir tugas penguasaan konsep dasar) }
- "tingkatMenengah": objek { "instruksi": string, "tugas": string[] (minimal 3 butir tugas penerapan & analisis) }
- "tingkatMahir": objek { "instruksi": string, "tugas": string[] (minimal 3 butir tugas evaluasi kritis & kreasi solusi) }
Sediakan juga wacana kontekstual dan pertanyaan reflektif tingkat kesiapan.
`;
      break;

    case 'proyek':
      archetypeGuidance = `
Tipe Preset: Proyek Kolaboratif & Desain Solusi (PjBL).
Wajib menyertakan properti "proyekData" dengan spesifikasi:
- "tujuanProyek": rumusan karya/produk nyata yang ingin dihasilkan siswa untuk mengatasi isu "${topikKonteks}".
- "tahapanWaktu": jadwal tahapan kerja (misal Minggu 1: Riset, Minggu 2: Produksi, Minggu 3: Pameran).
- "peranAnggota": array 4 peran tim spesifik (misal Ketua Tim, Spesialis Riset, Desainer Produk, Presenter) lengkap dengan "peran" dan "tanggungJawab".
- "rubrikKarya": array minimal 3 kriteria penilaian kualitas karya ({ "kriteria": string, "deskripsiSkor": string }).
Sediakan tahapan aktivitas proyek dan pertanyaan refleksi gotong royong.
`;
      break;

    case 'kasus':
    default:
      archetypeGuidance = `
Tipe Preset: Studi Kasus Kontekstual & Literasi Kritis.
Fokus pada narasi wacana atau skenario studi kasus nyata yang mendalam terkait fenomena "${topikKonteks}".
Sajikan "stimulusKasus" yang kaya fakta aktual, minimal 3 "langkahAktivitas" analisis masalah, dan 3 butir "pertanyaanAnalisis" berjenjang kognitif HOTS (Dasar, Menengah, Mahir).
`;
      break;
  }

  return `
Anda adalah Guru Penggerak Teladan Nasional, Ahli Kurikulum Merdeka, dan Desainer Pembelajaran Inkuiri Kontekstual Terbaik di Indonesia.
Tugas Anda: Susun Lembar Kerja Peserta Didik (LKPD) yang SANGAT SPESIFIK, NYATA, MENDALAM, dan MENARIK berbasis Kurikulum Merdeka.

PROFIL PEMBELAJARAN:
- Satuan Pendidikan: ${profile.namaSekolah} (${profile.kotaSekolah})
- Jenjang & Kelas: ${profile.jenjang} / Fase ${jenjangFase} - Kelas ${profile.kelasUtama} (${profile.rombelAktif})
- Mata Pelajaran: ${profile.mataPelajaranUtama}
- Materi Pokok: ${tp.materiPokok}
- Capaian/Tujuan Pembelajaran: ${tp.tujuanPembelajaran}
- TOPIK / ISU KONTEKSTUAL NYATA: "${topikKonteks}"

PANDUAN ARSIP TIPE PRESET:
${archetypeGuidance}

KETENTUAN KELUARAN (OUTPUT JSON):
1. Kembalikan HANYA dokumen JSON murni tanpa markdown \`\`\`json atau teks pembuka/penutup.
2. Struktur JSON wajib memiliki kunci-kunci berikut:
{
  "judul": "Judul LKPD tematik kontekstual lengkap",
  "alokasiWaktu": "Contoh: 2 x 45 Menit (80-90 Menit)",
  "petunjukPengerjaan": ["petunjuk 1", "petunjuk 2", "..."],
  "stimulusKasus": {
    "judul": "Judul wacana/kasus/isu",
    "teks": "Narasi kontekstual nyata yang mendalam (minimal 2 paragraf berbobot mengenai isu ${topikKonteks})",
    "pertanyaanAwal": "Pertanyaan pemantik orientasi masalah"
  },
  "eksperimenData": {
    "alatDanBahan": ["..."],
    "hipotesisAwal": "...",
    "tabelObservasi": {
      "kolom": ["No", "Variabel", "Hasil Pengamatan", "Keterangan"],
      "baris": [["1", "...", "...", "..."]]
    }
  },
  "diferensiasiData": {
    "tingkatDasar": { "instruksi": "...", "tugas": ["..."] },
    "tingkatMenengah": { "instruksi": "...", "tugas": ["..."] },
    "tingkatMahir": { "instruksi": "...", "tugas": ["..."] }
  },
  "proyekData": {
    "tujuanProyek": "...",
    "tahapanWaktu": "...",
    "peranAnggota": [{ "peran": "...", "tanggungJawab": "..." }],
    "rubrikKarya": [{ "kriteria": "...", "deskripsiSkor": "..." }]
  },
  "langkahAktivitas": [
    {
      "langkahKe": 1,
      "judulLangkah": "Judul langkah",
      "instruksi": "Instruksi pengerjaan kelompok",
      "bantuanAtauTabel": ["panduan 1", "panduan 2"]
    }
  ],
  "pertanyaanAnalisis": [
    {
      "nomor": 1,
      "tingkatKognitif": "Dasar",
      "pertanyaan": "Teks pertanyaan 1",
      "petunjukPengerjaan": "Petunjuk",
      "panduanJawabanSingkat": "Kunci/rubrik singkat"
    },
    {
      "nomor": 2,
      "tingkatKognitif": "Menengah",
      "pertanyaan": "Teks pertanyaan 2",
      "petunjukPengerjaan": "Petunjuk",
      "panduanJawabanSingkat": "Kunci/rubrik singkat"
    },
    {
      "nomor": 3,
      "tingkatKognitif": "Mahir",
      "pertanyaan": "Teks pertanyaan 3",
      "petunjukPengerjaan": "Petunjuk",
      "panduanJawabanSingkat": "Kunci/rubrik singkat"
    }
  ],
  "kesimpulanRefleksi": [
    "Poin refleksi 1",
    "Poin refleksi 2"
  ]
}
`.trim();
}

function normalizeAIResponseToLKPD(
  raw: any,
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType,
  topikKonteks: string,
  fallback: LKPDDokumen
): LKPDDokumen {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const normalizedKonteks = topikKonteks.trim() || undefined;

  // 1. Petunjuk Pengerjaan
  const petunjukPengerjaan =
    Array.isArray(raw?.petunjukPengerjaan) && raw.petunjukPengerjaan.length > 0
      ? raw.petunjukPengerjaan.map((p: any) => String(p ?? ''))
      : fallback.petunjukPengerjaan;

  // 2. Stimulus Kasus
  const stimulusKasus = {
    judul:
      typeof raw?.stimulusKasus?.judul === 'string' && raw.stimulusKasus.judul.trim()
        ? raw.stimulusKasus.judul.trim()
        : fallback.stimulusKasus.judul,
    teks:
      typeof raw?.stimulusKasus?.teks === 'string' && raw.stimulusKasus.teks.trim().length > 30
        ? raw.stimulusKasus.teks.trim()
        : fallback.stimulusKasus.teks,
    pertanyaanAwal:
      typeof raw?.stimulusKasus?.pertanyaanAwal === 'string' && raw.stimulusKasus.pertanyaanAwal.trim()
        ? raw.stimulusKasus.pertanyaanAwal.trim()
        : fallback.stimulusKasus.pertanyaanAwal,
  };

  // 3. Langkah Aktivitas
  const langkahAktivitas =
    Array.isArray(raw?.langkahAktivitas) && raw.langkahAktivitas.length > 0
      ? raw.langkahAktivitas.map((item: any, idx: number) => ({
          langkahKe: typeof item?.langkahKe === 'number' ? item.langkahKe : idx + 1,
          judulLangkah:
            typeof item?.judulLangkah === 'string' ? item.judulLangkah.trim() : undefined,
          instruksi:
            typeof item?.instruksi === 'string' ? item.instruksi.trim() : `Langkah ${idx + 1}`,
          bantuanAtauTabel: Array.isArray(item?.bantuanAtauTabel)
            ? item.bantuanAtauTabel.map((b: any) => String(b ?? ''))
            : undefined,
        }))
      : fallback.langkahAktivitas;

  // 4. Pertanyaan Analisis
  const pertanyaanAnalisis: LKPDPertanyaanItem[] =
    Array.isArray(raw?.pertanyaanAnalisis) && raw.pertanyaanAnalisis.length > 0
      ? raw.pertanyaanAnalisis.map((q: any, idx: number) => ({
          id: typeof q?.id === 'string' ? q.id : `q-${presetType}-${idx + 1}`,
          nomor: typeof q?.nomor === 'number' ? q.nomor : idx + 1,
          tingkatKognitif: (['Dasar', 'Menengah', 'Mahir'].includes(q?.tingkatKognitif)
            ? q.tingkatKognitif
            : idx === 0
            ? 'Dasar'
            : idx === 1
            ? 'Menengah'
            : 'Mahir') as 'Dasar' | 'Menengah' | 'Mahir',
          pertanyaan:
            typeof q?.pertanyaan === 'string' && q.pertanyaan.trim()
              ? q.pertanyaan.trim()
              : `Pertanyaan analisis materi nomor ${idx + 1}?`,
          petunjukPengerjaan:
            typeof q?.petunjukPengerjaan === 'string' ? q.petunjukPengerjaan.trim() : undefined,
          panduanJawabanSingkat:
            typeof q?.panduanJawabanSingkat === 'string'
              ? q.panduanJawabanSingkat.trim()
              : undefined,
        }))
      : fallback.pertanyaanAnalisis;

  // 5. Kesimpulan Refleksi
  const kesimpulanRefleksi =
    Array.isArray(raw?.kesimpulanRefleksi) && raw.kesimpulanRefleksi.length > 0
      ? raw.kesimpulanRefleksi.map((k: any) => String(k ?? ''))
      : fallback.kesimpulanRefleksi;

  // 6. Data Spesifik Archetype
  let eksperimenData: LKPDEksperimenData | undefined;
  if (presetType === 'eksperimen') {
    if (
      raw?.eksperimenData &&
      Array.isArray(raw.eksperimenData.alatDanBahan) &&
      raw.eksperimenData.tabelObservasi
    ) {
      eksperimenData = {
        alatDanBahan: raw.eksperimenData.alatDanBahan.map((a: any) => String(a ?? '')),
        hipotesisAwal:
          typeof raw.eksperimenData.hipotesisAwal === 'string'
            ? raw.eksperimenData.hipotesisAwal.trim()
            : fallback.eksperimenData?.hipotesisAwal || '',
        tabelObservasi: {
          kolom: Array.isArray(raw.eksperimenData.tabelObservasi.kolom)
            ? raw.eksperimenData.tabelObservasi.kolom.map((c: any) => String(c ?? ''))
            : fallback.eksperimenData?.tabelObservasi.kolom || [],
          baris: Array.isArray(raw.eksperimenData.tabelObservasi.baris)
            ? raw.eksperimenData.tabelObservasi.baris.map((row: any) =>
                Array.isArray(row) ? row.map((cell: any) => String(cell ?? '')) : []
              )
            : fallback.eksperimenData?.tabelObservasi.baris || [],
        },
      };
    } else {
      eksperimenData = fallback.eksperimenData;
    }
  }

  let diferensiasiData: LKPDDiferensiasiData | undefined;
  if (presetType === 'diferensiasi') {
    if (
      raw?.diferensiasiData?.tingkatDasar &&
      raw?.diferensiasiData?.tingkatMenengah &&
      raw?.diferensiasiData?.tingkatMahir
    ) {
      diferensiasiData = {
        tingkatDasar: {
          instruksi:
            typeof raw.diferensiasiData.tingkatDasar.instruksi === 'string'
              ? raw.diferensiasiData.tingkatDasar.instruksi.trim()
              : fallback.diferensiasiData?.tingkatDasar.instruksi || '',
          tugas: Array.isArray(raw.diferensiasiData.tingkatDasar.tugas)
            ? raw.diferensiasiData.tingkatDasar.tugas.map((t: any) => String(t ?? ''))
            : fallback.diferensiasiData?.tingkatDasar.tugas || [],
        },
        tingkatMenengah: {
          instruksi:
            typeof raw.diferensiasiData.tingkatMenengah.instruksi === 'string'
              ? raw.diferensiasiData.tingkatMenengah.instruksi.trim()
              : fallback.diferensiasiData?.tingkatMenengah.instruksi || '',
          tugas: Array.isArray(raw.diferensiasiData.tingkatMenengah.tugas)
            ? raw.diferensiasiData.tingkatMenengah.tugas.map((t: any) => String(t ?? ''))
            : fallback.diferensiasiData?.tingkatMenengah.tugas || [],
        },
        tingkatMahir: {
          instruksi:
            typeof raw.diferensiasiData.tingkatMahir.instruksi === 'string'
              ? raw.diferensiasiData.tingkatMahir.instruksi.trim()
              : fallback.diferensiasiData?.tingkatMahir.instruksi || '',
          tugas: Array.isArray(raw.diferensiasiData.tingkatMahir.tugas)
            ? raw.diferensiasiData.tingkatMahir.tugas.map((t: any) => String(t ?? ''))
            : fallback.diferensiasiData?.tingkatMahir.tugas || [],
        },
      };
    } else {
      diferensiasiData = fallback.diferensiasiData;
    }
  }

  let proyekData: LKPDProyekData | undefined;
  if (presetType === 'proyek') {
    if (
      raw?.proyekData &&
      typeof raw.proyekData.tujuanProyek === 'string' &&
      Array.isArray(raw.proyekData.peranAnggota)
    ) {
      proyekData = {
        tujuanProyek: raw.proyekData.tujuanProyek.trim(),
        tahapanWaktu:
          typeof raw.proyekData.tahapanWaktu === 'string'
            ? raw.proyekData.tahapanWaktu.trim()
            : fallback.proyekData?.tahapanWaktu || '',
        peranAnggota: raw.proyekData.peranAnggota.map((p: any) => ({
          peran: typeof p?.peran === 'string' ? p.peran.trim() : 'Anggota Tim',
          tanggungJawab:
            typeof p?.tanggungJawab === 'string' ? p.tanggungJawab.trim() : 'Membantu kerja tim',
        })),
        rubrikKarya: Array.isArray(raw.proyekData.rubrikKarya)
          ? raw.proyekData.rubrikKarya.map((r: any) => ({
              kriteria: typeof r?.kriteria === 'string' ? r.kriteria.trim() : 'Kriteria',
              deskripsiSkor:
                typeof r?.deskripsiSkor === 'string' ? r.deskripsiSkor.trim() : 'Deskripsi skor',
            }))
          : fallback.proyekData?.rubrikKarya || [],
      };
    } else {
      proyekData = fallback.proyekData;
    }
  }

  return {
    id: `lkpd-${tp.id}-${Date.now().toString(36)}`,
    tpId: tp.id,
    presetType,
    konteksAktual: normalizedKonteks,
    judul:
      typeof raw?.judul === 'string' && raw.judul.trim()
        ? raw.judul.trim()
        : fallback.judul,
    mataPelajaran: profile.mataPelajaranUtama,
    jenjangFase,
    kelas: profile.kelasUtama,
    rombel: profile.rombelAktif,
    semester: profile.semester,
    tahunAjaran: profile.tahunAjaran,
    namaSekolah: profile.namaSekolah,
    namaGuru: profile.namaGuru,
    nipGuru: profile.nipGuru,
    kotaSekolah: profile.kotaSekolah,
    createdAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),

    tpKode: tp.kode,
    materiPokok: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    alokasiWaktu:
      typeof raw?.alokasiWaktu === 'string' && raw.alokasiWaktu.trim()
        ? raw.alokasiWaktu.trim()
        : fallback.alokasiWaktu,

    petunjukPengerjaan,
    stimulusKasus,
    eksperimenData,
    diferensiasiData,
    proyekData,
    langkahAktivitas,
    pertanyaanAnalisis,
    kesimpulanRefleksi,
  };
}

/**
 * Layanan Pembuatan LKPD Kontekstual Berbasis AI Gemini
 * dengan deduksi kuota otomatis dan fallback anggun (graceful fallback) ke Heuristic Engine.
 */
export async function generateContextualLKPDWithAI(
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType = 'kasus',
  topikKonteks: string = ''
): Promise<ContextualLKPDResult> {
  const fallback = buildSmartLKPD(tp, profile, presetType, topikKonteks);

  // 1. Deduksi kuota lisensi guru sebelum eksekusi AI
  const quotaResult = deductQuota();
  if (!quotaResult.success) {
    return {
      lkpd: fallback,
      usedFallback: true,
      errorMsg:
        quotaResult.message ||
        'Kuota AI pembuatan lembar kerja telah habis. Beralih ke mesin kurikulum otomatis.',
    };
  }

  // 2. Panggil Google Gemini AI (via Serverless Function /api/gemini atau BYOK)
  try {
    const prompt = buildLKPDGeminiPrompt(tp, profile, presetType, topikKonteks);
    const parsed = await callGeminiStructuredJSON({
      prompt,
      temperature: 0.45,
    });
    const lkpd = normalizeAIResponseToLKPD(parsed, tp, profile, presetType, topikKonteks, fallback);

    return {
      lkpd,
      usedFallback: false,
    };
  } catch (err: any) {
    // Refund kuota jika terjadi kegagalan jaringan atau parsing
    refundQuota();

    const errorMessage =
      err instanceof Error
        ? err.message
        : 'Gagal menghubungi server AI Gemini. Beralih ke generator kurikulum otomatis.';

    return {
      lkpd: fallback,
      usedFallback: true,
      errorMsg: errorMessage,
    };
  }
}
