import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { jenjangToDefaultFase, computeTPContentHash } from './schoolProfileStorage';
import type {
  LKPDPresetType,
  LKPDDokumen,
  LKPDEksperimenData,
  LKPDDiferensiasiData,
  LKPDProyekData,
  LKPDPertanyaanItem,
  LKPDTeacherGuide,
  LKPDStimulusData,
  LKPDWorkMode,
  LKPDRuangJawabanJenis,
} from '../types/perangkatAjar';
import { buildSmartLKPD } from './perangkatAjarEngine';
import { deductQuota, refundQuota } from './paymentGateway';
import { callGeminiStructuredJSON } from '../services/geminiClient';
import { validateLKPDDokumen } from './lkpdValidator';
import {
  resolveSubjectFamily,
  resolveJenjangPedagogicalProfile,
  resolveSubjectApproachRule,
} from './lkpdSubjectBlueprints';

export interface ContextualLKPDResult {
  lkpd: LKPDDokumen;
  usedFallback: boolean;
  errorMsg?: string;
}

export const LKPD_SYSTEM_INSTRUCTION = [
  'Anda adalah Instructional Designer profesional dan reviewer materi pelajaran Kurikulum Indonesia (Kemendikbudristek & Kemenag).',
  'Prinsip wajib:',
  '1. Keselarasan penuh: Tujuan Pembelajaran (TP) -> Aktivitas Kerja Siswa -> Pertanyaan Asesmen -> Kunci & Rubrik Guru.',
  '2. Data konkret siap dikerjakan: stimulus wajib memuat angka bersatuan, kutipan teks utuh, contoh berharakat/kode, atau tabel data nyata — DILARANG memakai narasi kosong seperti "suatu kelompok masyarakat" atau pertanyaan klise "profesi masa depan".',
  '3. Kesesuaian jenjang: sesuaikan panjang bacaan, kompleksitas bahasa, kemandirian siswa, dan scaffolding secara spesifik dengan jenjang/fase.',
  '4. Akurasi ilmiah & matematis: jika topik melibatkan perhitungan (misal SPLDV, Pythagoras, statistika, aritmetika sosial, keseimbangan pasar), uji sendiri langkah penyelesaiannya agar tepat 100% dan konsisten.',
  '5. Pemisahan Lembar Siswa vs Panduan Guru: jangan membocorkan kunci jawaban ke dalam stimulus atau langkah kerja siswa; letakkan kunci lengkap, miskonsepsi, dan rubrik ke dalam objek "panduanGuru".',
  '6. Kejujuran rujukan: jangan mengarang nomor SK resmi, nomor ayat, atau data empiris yang tidak pasti.',
].join('\n');

function safeWorkMode(raw: unknown, defaultMode: LKPDWorkMode): LKPDWorkMode {
  if (raw === 'Individu' || raw === 'Berpasangan' || raw === 'Kelompok Kecil (3–4 Siswa)') {
    return raw;
  }
  return defaultMode;
}

function safeAnswerSpaceType(raw: unknown): LKPDRuangJawabanJenis | undefined {
  if (
    raw === 'perhitungan' ||
    raw === 'tabel' ||
    raw === 'uraian_singkat' ||
    raw === 'uraian_panjang' ||
    raw === 'langkah_algoritma'
  ) {
    return raw;
  }
  return undefined;
}

function buildSynthesizedTeacherGuide(
  pertanyaanAnalisis: LKPDPertanyaanItem[],
  tp: CustomTPItem
): LKPDTeacherGuide {
  return {
    kunciDanContohJawaban: pertanyaanAnalisis.map((q) => ({
      nomor: q.nomor,
      jawabanInti:
        q.panduanJawabanSingkat || 'Evaluasi kesesuaian argumen dan data siswa terhadap stimulus.',
      langkahPenyelesaian: q.petunjukPengerjaan ? [q.petunjukPengerjaan] : [],
      alternatifValid: q.alternatifJawabanValid,
    })),
    miskonsepsiUmum: [
      {
        miskonsepsi: `Menjawab langsung tanpa menautkan fakta atau bukti data dari stimulus "${tp.materiPokok}".`,
        caraMenangani: 'Minta siswa menandai informasi atau angka sumber di kotak stimulus sebelum menyusun jawaban.',
      },
    ],
    pemetaanTP: [
      {
        kodeSubTP: tp.kode,
        kompetensiTarget: tp.tujuanPembelajaran,
        aktivitasTerkait: 'Langkah Aktivitas & Pertanyaan Evaluasi LKPD',
      },
    ],
    rubrikPenilaian: [
      {
        aspek: `Ketepatan Penguasaan ${tp.materiPokok}`,
        perluBimbingan: 'Belum mengolah data/teks stimulus dan langkah masih terlewat.',
        berkembang: 'Mencatat data stimulus dengan benar tetapi alasan/perhitungan belum lengkap.',
        cakap: 'Menjawab tepat dan runtut sesuai tujuan pembelajaran dan bukti stimulus.',
        mahir: 'Menjawab lengkap disertai pemeriksaan balik atau penalaran kondisi batas.',
      },
    ],
  };
}

/**
 * Membangun prompt instruksi terstruktur untuk Google Gemini API
 * menyesuaikan jenjang, karakteristik rumpun mata pelajaran, dan preset kegiatan.
 */
export function buildLKPDGeminiPrompt(
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType,
  topikKonteks: string
): string {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const jenjangProf = resolveJenjangPedagogicalProfile(profile.jenjang, profile.kelasUtama);
  const family = resolveSubjectFamily(profile.mataPelajaranUtama);
  const rule = resolveSubjectApproachRule(family, presetType);

  let archetypeGuidance = '';
  switch (presetType) {
    case 'eksperimen':
      archetypeGuidance = `
Mode Preset: Penyelidikan Terstruktur / Eksperimen / Uji Data (${rule.preferredModesByPreset.eksperimen}).
Wajib menyertakan properti "eksperimenData":
- "alatDanBahan": daftar alat/bahan realistis dan mudah tersedia di sekolah Indonesia.
- "hipotesisAwal": rumusan dugaan ilmiah yang dapat diuji dari data tabel.
- "keselamatanKerja": array poin keselamatan/ketertiban alat atau ruang praktik (wajib diisi bila ada alat tajam, panas, kimia, cermin/laser, atau gerak fisik).
- "tabelObservasi": { "kolom": string[], "baris": string[][] } minimal 3 baris terukur.`;
      break;

    case 'diferensiasi':
      archetypeGuidance = `
Mode Preset: Tugas Berdiferensiasi Berjenjang Kesiapan (${rule.preferredModesByPreset.diferensiasi}).
Wajib menyertakan properti "diferensiasiData" dengan 3 jalur nyata yang tetap mengarah ke TP yang sama:
- "tingkatDasar": { "instruksi": string, "tugas": string[] (minimal 2 tugas terpandu) }
- "tingkatMenengah": { "instruksi": string, "tugas": string[] (minimal 2 tugas inti) }
- "tingkatMahir": { "instruksi": string, "tugas": string[] (minimal 2 tugas perluasan/verifikasi sesuai usia jenjang) }`;
      break;

    case 'proyek':
      archetypeGuidance = `
Mode Preset: Proyek / Tugas Unjuk Kerja (${rule.preferredModesByPreset.proyek}).
Wajib menyertakan properti "proyekData":
- "tujuanProyek": produk/karya nyata yang menjawab TP & konteks "${topikKonteks || tp.materiPokok}".
- "tahapanWaktu": pembagian sesi/minggu realistis untuk jenjang ${profile.jenjang}.
- "peranAnggota": array peran tim nyata beserta tanggungJawab spesifik terhadap konsep materi.
- "rubrikKarya": array minimal 3 kriteria penilaian berbasis bukti konsep.`;
      break;

    case 'kasus':
    default:
      archetypeGuidance = `
Mode Preset: Analisis Kasus / Masalah / Teks Nyata (${rule.preferredModesByPreset.kasus}).
Fokus pada "stimulusKasus" & "stimulusData" yang benar-benar memuat seluruh informasi/angka/kutipan sehingga siswa bisa menjawab tanpa mencari bahan luar yang tidak ada.`;
      break;
  }

  const subTPText =
    tp.subTP && tp.subTP.length > 0
      ? tp.subTP.map((s) => `  - [${s.kode}] ${s.kompetensi}`).join('\n')
      : `  - [${tp.kode}] ${tp.tujuanPembelajaran}`;

  return `
PROFIL KELAS & KURIKULUM:
- Satuan Pendidikan: ${profile.namaSekolah} (${profile.kotaSekolah})
- Jenjang & Fase & Kelas: ${jenjangProf.labelJenjang} — Fase ${jenjangFase}, Kelas ${profile.kelasUtama}
- Karakteristik Peserta Didik Jenjang Ini: ${jenjangProf.readingParagraphsHint}; Gaya bahasa: ${jenjangProf.languageTone}; Scaffolding: ${jenjangProf.scaffoldingNote}
- Mata Pelajaran & Rumpun: ${profile.mataPelajaranUtama} (Rumpun: ${rule.labelRumpun})
- Elemen CP: ${tp.elemen}
- Kode & Materi Pokok: ${tp.kode} — ${tp.materiPokok}
- Tujuan Pembelajaran Utama: ${tp.tujuanPembelajaran}
- Rincian Sub-TP yang Harus Tercapai:
${subTPText}
${tp.prasyarat?.length ? `- Prasyarat Materi: ${tp.prasyarat.join('; ')}` : ''}
${topikKonteks ? `- Fokus Konteks Guru: "${topikKonteks}"` : ''}

KEBUTUHAN KHUSUS RUMPUN MATA PELAJARAN (${rule.labelRumpun}):
- Syarat Stimulus: ${rule.stimulusRequirement}
- Syarat Aktivitas: ${rule.activityRequirement}
- Pendekatan yang Disarankan: ${rule.preferredModesByPreset[presetType]}

${archetypeGuidance}

ATURAN FORMAT JSON KELUARAN:
Kembalikan HANYA 1 objek JSON valid (tanpa markdown fence) dengan kunci:
{
  "judul": "Judul spesifik LKPD tanpa mengulang kata 'LKPD' jika tidak perlu",
  "pendekatanKegiatan": "${rule.preferredModesByPreset[presetType]}",
  "modeKerja": "${jenjangProf.defaultWorkMode}",
  "alokasiWaktu": "${jenjangProf.defaultDurationMinutes} Menit",
  "targetBelajarSiswa": ["Sasaran bahasa ramah siswa sesuai Sub-TP"],
  "prasyaratMateri": ["Kompetensi/pengetahuan prasyarat spesifik"],
  "petunjukPengerjaan": ["Petunjuk konkret yang berguna bagi siswa"],
  "stimulusKasus": {
    "judul": "Judul konteks/kasus/teks konkret",
    "teks": "Bacaan/data konkret yang lengkap (memuat bilangan ber-satuan / kutipan utuh / fakta nyata agar bisa dikerjakan langsung)",
    "pertanyaanAwal": "1 pertanyaan orientasi langsung ke data stimulus"
  },
  "stimulusData": {
    "jenisData": "tabel | persamaan | kutipan_teks | daftar_fakta | algoritma",
    "tabelData": { "kolom": ["..."], "baris": [["..."]] },
    "poinKunci": ["Fakta atau syarat penting dari stimulus"],
    "catatanAsumsi": "Catatan syarat/batasan jika relevan"
  },
  "langkahAktivitas": [
    {
      "langkahKe": 1,
      "judulLangkah": "Nama langkah spesifik materi",
      "instruksi": "Instruksi kerja operasional berbasis data stimulus",
      "bantuanAtauTabel": ["Panduan / tabel isian terbimbing"],
      "ruangJawabanJenis": "perhitungan | tabel | uraian_singkat | uraian_panjang | langkah_algoritma",
      "pemetaanSubTP": "${tp.kode}"
    }
  ],
  "pemeriksaanHasil": ["Langkah konkret memeriksa ulang kebenaran hasil"],
  "pertanyaanAnalisis": [
    {
      "nomor": 1,
      "tingkatKognitif": "Dasar | Menengah | Mahir",
      "alasanTingkatKognitif": "Justifikasi singkat tuntutan kognitif tugas (bukan label kosong)",
      "pemetaanSubTP": "${tp.kode}",
      "ruangJawabanJenis": "perhitungan | tabel | uraian_singkat | uraian_panjang | langkah_algoritma",
      "pertanyaan": "Pertanyaan yang menguji langsung TP & data stimulus",
      "petunjukPengerjaan": "Petunjuk singkat untuk siswa",
      "panduanJawabanSingkat": "Jawaban inti lengkap beserta hasil hitungan akurat",
      "alternatifJawabanValid": "Cara penyelesaian sah lain bila ada"
    }
  ],
  "dukunganTambahan": "Bantuan langkah bagi siswa yang masih mengalami hambatan",
  "pengayaan": { "instruksi": "Pengayaan terkait TP:", "tugas": ["1 tantangan pendalaman"] },
  "kesimpulanRefleksi": ["Kalimat kesimpulan terarah berdasar temuan", "1 refleksi kesulitan/langkah penting"],
  "panduanGuru": {
    "kunciDanContohJawaban": [
      { "nomor": 1, "jawabanInti": "...", "langkahPenyelesaian": ["Langkah 1...", "Langkah 2..."], "alternatifValid": "..." }
    ],
    "miskonsepsiUmum": [
      { "miskonsepsi": "Kesalahan khas siswa pada materi ini", "caraMenangani": "Tindakan perbaikan guru" }
    ],
    "pemetaanTP": [
      { "kodeSubTP": "${tp.kode}", "kompetensiTarget": "...", "aktivitasTerkait": "Langkah X, Soal Y" }
    ],
    "rubrikPenilaian": [
      { "aspek": "Aspek spesifik materi", "perluBimbingan": "...", "berkembang": "...", "cakap": "...", "mahir": "..." }
    ]
  }
}
`.trim();
}

interface StrictNormalizationResult {
  doc: LKPDDokumen;
  structuralErrors: string[];
  maxTokensCut: boolean;
}

function normalizeAIResponseStrict(
  raw: any,
  tp: CustomTPItem,
  profile: SchoolProfile,
  presetType: LKPDPresetType,
  topikKonteks: string,
  fallback: LKPDDokumen
): StrictNormalizationResult {
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const jenjangProf = resolveJenjangPedagogicalProfile(profile.jenjang, profile.kelasUtama);
  const normalizedKonteks = topikKonteks.trim() || undefined;
  const structuralErrors: string[] = [];
  const maxTokensCut = raw?._geminiFinishReason === 'MAX_TOKENS';

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    structuralErrors.push('Respons AI bukan objek JSON yang valid.');
  }

  const rawStimulusTeks =
    typeof raw?.stimulusKasus?.teks === 'string' ? raw.stimulusKasus.teks.trim() : '';
  if (rawStimulusTeks.length <= 30) {
    structuralErrors.push('AI tidak mengembalikan teks stimulus yang memadai (> 30 karakter).');
  }

  const hasSteps = Array.isArray(raw?.langkahAktivitas) && raw.langkahAktivitas.length > 0;
  if (!hasSteps) {
    structuralErrors.push('AI tidak mengembalikan daftar langkahAktivitas siswa.');
  }

  const hasQuestions =
    Array.isArray(raw?.pertanyaanAnalisis) && raw.pertanyaanAnalisis.length > 0;
  if (!hasQuestions) {
    structuralErrors.push('AI tidak mengembalikan daftar pertanyaanAnalisis.');
  }

  if (presetType === 'eksperimen') {
    if (
      !raw?.eksperimenData ||
      !Array.isArray(raw.eksperimenData.alatDanBahan) ||
      !raw.eksperimenData.tabelObservasi
    ) {
      structuralErrors.push('AI tidak menyertakan objek eksperimenData lengkap pada mode eksperimen.');
    }
  } else if (presetType === 'diferensiasi') {
    if (
      !raw?.diferensiasiData?.tingkatDasar ||
      !raw?.diferensiasiData?.tingkatMenengah ||
      !raw?.diferensiasiData?.tingkatMahir
    ) {
      structuralErrors.push('AI tidak menyertakan 3 jalur kesiapan diferensiasiData.');
    }
  } else if (presetType === 'proyek') {
    if (
      !raw?.proyekData ||
      typeof raw.proyekData.tujuanProyek !== 'string' ||
      !Array.isArray(raw.proyekData.peranAnggota)
    ) {
      structuralErrors.push('AI tidak menyertakan objek proyekData lengkap pada mode proyek.');
    }
  }

  const petunjukPengerjaan =
    Array.isArray(raw?.petunjukPengerjaan) && raw.petunjukPengerjaan.length > 0
      ? raw.petunjukPengerjaan.map((p: any) => String(p ?? '').trim()).filter(Boolean)
      : fallback.petunjukPengerjaan;

  const stimulusKasus = {
    judul:
      typeof raw?.stimulusKasus?.judul === 'string' && raw.stimulusKasus.judul.trim()
        ? raw.stimulusKasus.judul.trim()
        : fallback.stimulusKasus.judul,
    teks: rawStimulusTeks,
    pertanyaanAwal:
      typeof raw?.stimulusKasus?.pertanyaanAwal === 'string' &&
      raw.stimulusKasus.pertanyaanAwal.trim()
        ? raw.stimulusKasus.pertanyaanAwal.trim()
        : fallback.stimulusKasus.pertanyaanAwal,
  };

  let stimulusData: LKPDStimulusData | undefined;
  if (raw?.stimulusData && typeof raw.stimulusData === 'object') {
    stimulusData = {
      jenisData: raw.stimulusData.jenisData,
      tabelData:
        raw.stimulusData.tabelData &&
        Array.isArray(raw.stimulusData.tabelData.kolom) &&
        Array.isArray(raw.stimulusData.tabelData.baris)
          ? {
              kolom: raw.stimulusData.tabelData.kolom.map(String),
              baris: raw.stimulusData.tabelData.baris.map((r: any) =>
                Array.isArray(r) ? r.map(String) : [String(r)]
              ),
            }
          : undefined,
      poinKunci: Array.isArray(raw.stimulusData.poinKunci)
        ? raw.stimulusData.poinKunci.map(String)
        : undefined,
      catatanAsumsi:
        typeof raw.stimulusData.catatanAsumsi === 'string'
          ? raw.stimulusData.catatanAsumsi.trim()
          : undefined,
    };
  }

  const langkahAktivitas = hasSteps
    ? raw.langkahAktivitas.map((item: any, idx: number) => ({
        langkahKe: typeof item?.langkahKe === 'number' ? item.langkahKe : idx + 1,
        judulLangkah:
          typeof item?.judulLangkah === 'string' ? item.judulLangkah.trim() : undefined,
        instruksi:
          typeof item?.instruksi === 'string' ? item.instruksi.trim() : '',
        bantuanAtauTabel: Array.isArray(item?.bantuanAtauTabel)
          ? item.bantuanAtauTabel.map((b: any) => String(b ?? ''))
          : undefined,
        ruangJawabanJenis: safeAnswerSpaceType(item?.ruangJawabanJenis),
        pemetaanSubTP:
          typeof item?.pemetaanSubTP === 'string' ? item.pemetaanSubTP.trim() : undefined,
      }))
    : [];

  const pertanyaanAnalisis: LKPDPertanyaanItem[] = hasQuestions
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
        alasanTingkatKognitif:
          typeof q?.alasanTingkatKognitif === 'string'
            ? q.alasanTingkatKognitif.trim()
            : undefined,
        pemetaanSubTP:
          typeof q?.pemetaanSubTP === 'string' ? q.pemetaanSubTP.trim() : undefined,
        ruangJawabanJenis: safeAnswerSpaceType(q?.ruangJawabanJenis),
        pertanyaan: typeof q?.pertanyaan === 'string' ? q.pertanyaan.trim() : '',
        petunjukPengerjaan:
          typeof q?.petunjukPengerjaan === 'string' ? q.petunjukPengerjaan.trim() : undefined,
        panduanJawabanSingkat:
          typeof q?.panduanJawabanSingkat === 'string'
            ? q.panduanJawabanSingkat.trim()
            : undefined,
        alternatifJawabanValid:
          typeof q?.alternatifJawabanValid === 'string'
            ? q.alternatifJawabanValid.trim()
            : undefined,
      }))
    : [];

  const kesimpulanRefleksi =
    Array.isArray(raw?.kesimpulanRefleksi) && raw.kesimpulanRefleksi.length > 0
      ? raw.kesimpulanRefleksi.map((k: any) => String(k ?? ''))
      : fallback.kesimpulanRefleksi;

  let eksperimenData: LKPDEksperimenData | undefined;
  if (
    presetType === 'eksperimen' &&
    raw?.eksperimenData &&
    Array.isArray(raw.eksperimenData.alatDanBahan) &&
    raw.eksperimenData.tabelObservasi
  ) {
    eksperimenData = {
      alatDanBahan: raw.eksperimenData.alatDanBahan.map((a: any) => String(a ?? '')),
      hipotesisAwal:
        typeof raw.eksperimenData.hipotesisAwal === 'string'
          ? raw.eksperimenData.hipotesisAwal.trim()
          : '',
      keselamatanKerja: Array.isArray(raw.eksperimenData.keselamatanKerja)
        ? raw.eksperimenData.keselamatanKerja.map((s: any) => String(s ?? ''))
        : undefined,
      tabelObservasi: {
        kolom: Array.isArray(raw.eksperimenData.tabelObservasi.kolom)
          ? raw.eksperimenData.tabelObservasi.kolom.map((c: any) => String(c ?? ''))
          : [],
        baris: Array.isArray(raw.eksperimenData.tabelObservasi.baris)
          ? raw.eksperimenData.tabelObservasi.baris.map((row: any) =>
              Array.isArray(row) ? row.map((cell: any) => String(cell ?? '')) : []
            )
          : [],
      },
    };
  }

  let diferensiasiData: LKPDDiferensiasiData | undefined;
  if (
    presetType === 'diferensiasi' &&
    raw?.diferensiasiData?.tingkatDasar &&
    raw?.diferensiasiData?.tingkatMenengah &&
    raw?.diferensiasiData?.tingkatMahir
  ) {
    diferensiasiData = {
      tingkatDasar: {
        instruksi: String(raw.diferensiasiData.tingkatDasar.instruksi ?? '').trim(),
        tugas: Array.isArray(raw.diferensiasiData.tingkatDasar.tugas)
          ? raw.diferensiasiData.tingkatDasar.tugas.map((t: any) => String(t ?? ''))
          : [],
      },
      tingkatMenengah: {
        instruksi: String(raw.diferensiasiData.tingkatMenengah.instruksi ?? '').trim(),
        tugas: Array.isArray(raw.diferensiasiData.tingkatMenengah.tugas)
          ? raw.diferensiasiData.tingkatMenengah.tugas.map((t: any) => String(t ?? ''))
          : [],
      },
      tingkatMahir: {
        instruksi: String(raw.diferensiasiData.tingkatMahir.instruksi ?? '').trim(),
        tugas: Array.isArray(raw.diferensiasiData.tingkatMahir.tugas)
          ? raw.diferensiasiData.tingkatMahir.tugas.map((t: any) => String(t ?? ''))
          : [],
      },
    };
  }

  let proyekData: LKPDProyekData | undefined;
  if (
    presetType === 'proyek' &&
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
  }

  let panduanGuru: LKPDTeacherGuide;
  if (raw?.panduanGuru && typeof raw.panduanGuru === 'object') {
    panduanGuru = {
      kunciDanContohJawaban: Array.isArray(raw.panduanGuru.kunciDanContohJawaban)
        ? raw.panduanGuru.kunciDanContohJawaban.map((k: any, i: number) => ({
            nomor: typeof k?.nomor === 'number' ? k.nomor : i + 1,
            jawabanInti: String(k?.jawabanInti ?? '').trim(),
            langkahPenyelesaian: Array.isArray(k?.langkahPenyelesaian)
              ? k.langkahPenyelesaian.map(String)
              : [],
            alternatifValid:
              typeof k?.alternatifValid === 'string' ? k.alternatifValid.trim() : undefined,
          }))
        : buildSynthesizedTeacherGuide(pertanyaanAnalisis, tp).kunciDanContohJawaban,
      miskonsepsiUmum: Array.isArray(raw.panduanGuru.miskonsepsiUmum)
        ? raw.panduanGuru.miskonsepsiUmum.map((m: any) => ({
            miskonsepsi: String(m?.miskonsepsi ?? '').trim(),
            caraMenangani: String(m?.caraMenangani ?? '').trim(),
          }))
        : buildSynthesizedTeacherGuide(pertanyaanAnalisis, tp).miskonsepsiUmum,
      pemetaanTP: Array.isArray(raw.panduanGuru.pemetaanTP)
        ? raw.panduanGuru.pemetaanTP.map((p: any) => ({
            kodeSubTP: String(p?.kodeSubTP ?? tp.kode).trim(),
            kompetensiTarget: String(p?.kompetensiTarget ?? tp.tujuanPembelajaran).trim(),
            aktivitasTerkait: String(p?.aktivitasTerkait ?? 'Aktivitas LKPD').trim(),
          }))
        : buildSynthesizedTeacherGuide(pertanyaanAnalisis, tp).pemetaanTP,
      rubrikPenilaian: Array.isArray(raw.panduanGuru.rubrikPenilaian)
        ? raw.panduanGuru.rubrikPenilaian.map((r: any) => ({
            aspek: String(r?.aspek ?? tp.materiPokok).trim(),
            perluBimbingan: String(r?.perluBimbingan ?? '').trim(),
            berkembang: String(r?.berkembang ?? '').trim(),
            cakap: String(r?.cakap ?? '').trim(),
            mahir: String(r?.mahir ?? '').trim(),
          }))
        : buildSynthesizedTeacherGuide(pertanyaanAnalisis, tp).rubrikPenilaian,
    };
  } else {
    panduanGuru = buildSynthesizedTeacherGuide(pertanyaanAnalisis, tp);
  }

  const doc: LKPDDokumen = {
    id: `lkpd-${tp.id}-${Date.now().toString(36)}`,
    tpId: tp.id,
    presetType,
    konteksAktual: normalizedKonteks,
    judul:
      typeof raw?.judul === 'string' && raw.judul.trim()
        ? raw.judul.trim()
        : fallback.judul,
    pendekatanKegiatan:
      typeof raw?.pendekatanKegiatan === 'string' && raw.pendekatanKegiatan.trim()
        ? raw.pendekatanKegiatan.trim()
        : fallback.pendekatanKegiatan,
    modeKerja: safeWorkMode(raw?.modeKerja, jenjangProf.defaultWorkMode),
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
    elemen: tp.elemen,
    materiPokok: tp.materiPokok,
    tujuanPembelajaran: tp.tujuanPembelajaran,
    targetBelajarSiswa: Array.isArray(raw?.targetBelajarSiswa)
      ? raw.targetBelajarSiswa.map(String)
      : fallback.targetBelajarSiswa,
    prasyaratMateri: Array.isArray(raw?.prasyaratMateri)
      ? raw.prasyaratMateri.map(String)
      : fallback.prasyaratMateri,
    targetSubTP: tp.subTP?.map((s) => ({
      id: s.id,
      kode: s.kode,
      kompetensi: s.kompetensi,
    })),
    alokasiWaktu:
      typeof raw?.alokasiWaktu === 'string' && raw.alokasiWaktu.trim()
        ? raw.alokasiWaktu.trim()
        : fallback.alokasiWaktu,
    tpSourceHash: computeTPContentHash(tp),
    needsReview: false,

    petunjukPengerjaan,
    stimulusKasus,
    stimulusData,
    eksperimenData,
    diferensiasiData,
    proyekData,
    langkahAktivitas,
    pemeriksaanHasil: Array.isArray(raw?.pemeriksaanHasil)
      ? raw.pemeriksaanHasil.map(String)
      : fallback.pemeriksaanHasil,
    pertanyaanAnalisis,
    dukunganTambahan:
      typeof raw?.dukunganTambahan === 'string' && raw.dukunganTambahan.trim()
        ? raw.dukunganTambahan.trim()
        : fallback.dukunganTambahan,
    pengayaan:
      raw?.pengayaan && typeof raw.pengayaan === 'object' && Array.isArray(raw.pengayaan.tugas)
        ? {
            instruksi: String(raw.pengayaan.instruksi ?? 'Pengayaan terkait TP:').trim(),
            tugas: raw.pengayaan.tugas.map(String),
          }
        : fallback.pengayaan,
    kesimpulanRefleksi,
    panduanGuru,
  };

  return { doc, structuralErrors, maxTokensCut };
}

function buildRepairPrompt(
  originalPrompt: string,
  previousDraft: unknown,
  allErrors: string[]
): string {
  const errorList = allErrors.map((e, idx) => `${idx + 1}. ${e}`).join('\n');
  const serialized = JSON.stringify(previousDraft ?? {}).slice(0, 4500);
  return `${originalPrompt}

PERBAIKAN WAJIB DARI VALIDATOR SISTEM:
Draf JSON sebelumnya DITOLAK karena kendala berikut:
${errorList}

DRAF SEBELUMNYA (untuk diperbaiki kekurangannya):
${serialized}

Susun ulang 1 JSON LKPD lengkap yang memperbaiki SEMUA poin penolakan di atas, menjaga keakuratan hitungan/fakta, serta bebas dari potongan teks atau kalimat generik.`;
}

function buildMarkedFallback(
  fallback: LKPDDokumen,
  extraIssues: string[] = []
): LKPDDokumen {
  const existingIssues = fallback.catatanValidasi?.issues || [];
  return {
    ...fallback,
    catatanValidasi: {
      status: fallback.catatanValidasi?.status || 'perlu_review_guru',
      usedFallback: true,
      isCuratedFixture: fallback.catatanValidasi?.isCuratedFixture ?? false,
      issues: Array.from(new Set([...existingIssues, ...extraIssues])),
      warnings: fallback.catatanValidasi?.warnings || [],
      mathVerificationNote: fallback.catatanValidasi?.mathVerificationNote,
    },
  };
}

/**
 * Layanan Pembuatan LKPD Kontekstual Berbasis AI Gemini
 * dengan validasi ketat, maksimal 1 kali repair terpandu, deduksi/refund kuota jujur,
 * dan fallback terkurasi tanpa menyamarkan kegagalan API sebagai keluaran AI valid.
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
      lkpd: buildMarkedFallback(fallback),
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
      systemInstruction: LKPD_SYSTEM_INSTRUCTION,
      maxOutputTokens: 4096,
      temperature: 0.35,
    });

    const firstPass = normalizeAIResponseStrict(
      parsed,
      tp,
      profile,
      presetType,
      topikKonteks,
      fallback
    );
    const firstValidation = validateLKPDDokumen(firstPass.doc, tp, profile, {
      sourceMode: 'ai',
      maxTokensCut: firstPass.maxTokensCut,
    });
    const combinedFirstIssues = Array.from(
      new Set([...firstPass.structuralErrors, ...firstValidation.issues])
    );

    if (combinedFirstIssues.length === 0) {
      return {
        lkpd: {
          ...firstPass.doc,
          catatanValidasi: firstValidation,
        },
        usedFallback: false,
      };
    }

    // 3. Maksimal 1 kali loop perbaikan terpandu jika keluaran AI cacat/terpotong/slop/salah hitung
    const repairPrompt = buildRepairPrompt(prompt, parsed, combinedFirstIssues);
    const repairedRaw = await callGeminiStructuredJSON({
      prompt: repairPrompt,
      systemInstruction: LKPD_SYSTEM_INSTRUCTION,
      maxOutputTokens: 4096,
      temperature: 0.2,
    });
    const secondPass = normalizeAIResponseStrict(
      repairedRaw,
      tp,
      profile,
      presetType,
      topikKonteks,
      fallback
    );
    const secondValidation = validateLKPDDokumen(secondPass.doc, tp, profile, {
      sourceMode: 'ai',
      maxTokensCut: secondPass.maxTokensCut,
    });
    const combinedSecondIssues = Array.from(
      new Set([...secondPass.structuralErrors, ...secondValidation.issues])
    );

    if (combinedSecondIssues.length === 0) {
      return {
        lkpd: {
          ...secondPass.doc,
          catatanValidasi: secondValidation,
        },
        usedFallback: false,
      };
    }

    // Tetap gagal validasi setelah 1x repair -> refund kuota & kembalikan fallback jujur
    refundQuota();
    return {
      lkpd: buildMarkedFallback(fallback, [
        `Keluaran AI ditolak validator (${combinedSecondIssues[0]}); dialihkan ke draf mesin kurikulum.`,
      ]),
      usedFallback: true,
      errorMsg: `Respons AI belum memenuhi syarat kualitas (${combinedSecondIssues.join('; ')}). Draf dialihkan ke mesin kurikulum.`,
    };
  } catch (err: any) {
    // Refund kuota jika terjadi kegagalan jaringan atau parsing
    refundQuota();

    const errorMessage =
      err instanceof Error
        ? err.message
        : 'Gagal menghubungi server AI Gemini. Beralih ke generator kurikulum otomatis.';

    return {
      lkpd: buildMarkedFallback(fallback),
      usedFallback: true,
      errorMsg: errorMessage,
    };
  }
}
