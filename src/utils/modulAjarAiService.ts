import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { jenjangToDefaultFase } from './schoolProfileStorage';
import type {
  ModulAjarDokumen,
  KegiatanPembelajaranLangkah,
} from '../types/perangkatAjar';
import { buildSmartModulAjar } from './perangkatAjarEngine';
import { callGeminiStructuredJSON } from '../services/geminiClient';
import { requireActiveLicenseForAction, deductQuota } from './licenseManager';

export { requireActiveLicenseForAction, deductQuota };

export type ModulAjarModelType = 'pbl' | 'pjbl' | 'inquiry' | 'diferensiasi' | 'kontekstual';

export interface ModulAjarModelDefinition {
  id: ModulAjarModelType;
  label: string;
  namaSingkat: string;
  deskripsi: string;
  sintaksUtama: string[];
  karakteristikKonteks: string;
}

export interface ContextualModulAjarResult {
  modul: ModulAjarDokumen;
  usedFallback: boolean;
  errorMsg?: string;
}

export const MODUL_AJAR_MODELS: readonly ModulAjarModelDefinition[] = [
  {
    id: 'pbl',
    label: 'Problem-Based Learning (PBL)',
    namaSingkat: 'PBL (Masalah Nyata)',
    deskripsi: 'Pembelajaran berbasis masalah kontekstual nyata untuk memicu nalar kritis dan pemecahan masalah.',
    sintaksUtama: [
      'Orientasi peserta didik pada masalah autentik',
      'Mengorganisasikan peserta didik untuk belajar dan meneliti',
      'Membimbing penyelidikan mandiri dan kelompok',
      'Mengembangkan dan menyajikan hasil karya pemecahan masalah',
      'Menganalisis dan mengevaluasi proses pemecahan masalah',
    ],
    karakteristikKonteks: 'Menghadapkan siswa pada studi kasus lokal atau dilema nyata yang membutuhkan solusi analitis.',
  },
  {
    id: 'pjbl',
    label: 'Project-Based Learning (PjBL)',
    namaSingkat: 'PjBL (Karya Proyek)',
    deskripsi: 'Pembelajaran berbasis proyek autentik terencana untuk menghasilkan artefak/produk nyata yang bermanfaat.',
    sintaksUtama: [
      'Penentuan pertanyaan mendasar (essential question)',
      'Mendesain perencanaan produk/proyek',
      'Menyusun jadwal pembuatan dan target penyelesaian',
      'Memonitor keaktifan dan perkembangan progres proyek',
      'Menguji hasil dan mempresentasikan produk',
      'Mengevaluasi pengalaman dan refleksi pembelajaran',
    ],
    karakteristikKonteks: 'Menghasilkan prototipe, karya terapan, atau produk kontekstual yang menjawab kebutuhan lingkungan sekitar.',
  },
  {
    id: 'inquiry',
    label: 'Inquiry / Discovery Learning',
    namaSingkat: 'Inquiry (Penyelidikan Mandiri)',
    deskripsi: 'Eksplorasi mandiri berbasis rasa ingin tahu melalui perumusan hipotesis dan pembuktian data empiris.',
    sintaksUtama: [
      'Stimulasi / Pemberian rangsangan fenomena',
      'Identifikasi masalah dan perumusan hipotesis',
      'Pengumpulan data melalui observasi atau eksperimen',
      'Pengolahan dan interpretasi data temuan',
      'Pembuktian / Verifikasi kebenaran hipotesis',
      'Menarik kesimpulan dan generalisasi prinsip',
    ],
    karakteristikKonteks: 'Mendorong rasa ingin tahu siswa mengamati pola dan data di alam atau keseharian mereka.',
  },
  {
    id: 'diferensiasi',
    label: 'Pembelajaran Berdiferensiasi (Konten, Proses, Produk)',
    namaSingkat: 'Berdiferensiasi (Kesiapan Belajar)',
    deskripsi: 'Akomodasi keragaman kesiapan, profil, dan minat peserta didik dengan scaffolding bertingkat.',
    sintaksUtama: [
      'Pemetaan diagnostik kesiapan, minat, dan profil belajar',
      'Diferensiasi Konten: penyediaan ragam tingkat kesulitan dan media bahan ajar',
      'Diferensiasi Proses: scaffolding terarah, stasiun rotasi, dan pendampingan bertingkat',
      'Diferensiasi Produk: kebebasan memilih unjuk pemahaman sesuai kekuatan peserta didik',
      'Refleksi komprehensif dan umpan balik personal',
    ],
    karakteristikKonteks: 'Memastikan semua siswa dari tingkat dasar, menengah, hingga mahir dapat bertumbuh optimal.',
  },
  {
    id: 'kontekstual',
    label: 'Contextual Teaching and Learning (CTL)',
    namaSingkat: 'CTL (Kearifan & Konteks Lokal)',
    deskripsi: 'Menghubungkan materi pelajaran dengan situasi dunia nyata, tradisi lokal, dan ekosistem peserta didik.',
    sintaksUtama: [
      'Konstruktivisme: mengaitkan pengetahuan baru dengan pengalaman nyata siswa',
      'Inkuiri (Menemukan): mengamati fenomena dan kearifan lokal sekitar',
      'Bertanya (Questioning): memantik rasa ingin tahu dan dialog kritis',
      'Masyarakat Belajar (Learning Community): kerja sama kolaboratif antar-siswa',
      'Pemodelan (Modeling): demonstrasi contoh konkret atau figur teladan',
      'Refleksi & Asesmen Autentik: evaluasi pemahaman bermakna dalam kehidupan nyata',
    ],
    karakteristikKonteks: 'Memanfaatkan potensi lokal, budaya daerah, dan lingkungan alam sekitar sekolah sebagai laboratorium belajar.',
  },
] as const;

/**
 * Membangun prompt Gemini AI yang kaya pedagogis untuk menyusun Modul Ajar (RPP Plus)
 * Kurikulum Merdeka berbasis 5 model pembelajaran utama dengan konteks lokal.
 */
export function buildModulAjarGeminiPrompt(
  tp: CustomTPItem,
  profile: SchoolProfile,
  model: ModulAjarModelType = 'pbl',
  konteksLokal?: string
): string {
  const modelDef = MODUL_AJAR_MODELS.find((m) => m.id === model) || MODUL_AJAR_MODELS[0];
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const alokasiJP = Number(tp.alokasiJP) || 8;
  const konteks =
    konteksLokal && konteksLokal.trim().length > 0
      ? konteksLokal.trim()
      : `Penerapan nyata materi ${tp.materiPokok} dalam lingkungan kehidupan sehari-hari peserta didik`;

  return `
Anda adalah Guru Penggerak Teladan Nasional, Dewan Pakar Kurikulum Merdeka Kemendikbudristek RI, dan Perancang Modul Ajar Terbaik di Indonesia.
Tugas Anda: Susun dokumen Modul Ajar (RPP Plus Kurikulum Merdeka) yang MENDALAM, SANGAT OPERASIONAL, BERMUTU TINGGI, dan MENGANGKAT KONTEKS LOKAL.

IDENTITAS & PROFIL PEMBELAJARAN:
- Satuan Pendidikan: ${profile.namaSekolah || 'Sekolah Penggerak Merdeka'} (${profile.kotaSekolah || 'Nusantara'})
- Jenjang & Kelas: ${profile.jenjang || 'SMP'} / Fase ${jenjangFase} - Kelas ${profile.kelasUtama || '8'} (${profile.rombelAktif || 'Rombel Utama'})
- Mata Pelajaran: ${profile.mataPelajaranUtama || 'Mata Pelajaran Utama'}
- Topik / Materi Pokok: ${tp.materiPokok}
- Capaian / Tujuan Pembelajaran (TP): ${tp.tujuanPembelajaran}
- Alokasi Waktu: ${alokasiJP} JP (2 Pertemuan x 80 Menit)
- Model Pembelajaran Kurikulum Merdeka yang Diterapkan: ${modelDef.label}
- Deskripsi Pendekatan Model: ${modelDef.deskripsi}
- SINTAKS PEDAGOGIS WAJIB:
${modelDef.sintaksUtama.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')}
- TEMA / TOPIK KONTEKS LOKAL NYATA: "${konteks}"

PANDUAN KOMPONEN INTI KURIKULUM MERDEKA:
1. "pemahamanBermakna": Rumuskan 1-2 kalimat pemahaman mendalam dan aplikatif mengenai esensi materi "${tp.materiPokok}" dalam menjawab tantangan nyata "${konteks}".
2. "pertanyaanPemantik": Susun minimal 3 butir pertanyaan pemantik berpikir kritis (HOTS) yang memancing eksplorasi peserta didik terhadap keterkaitan "${tp.materiPokok}" dan "${konteks}".
3. "profilPelajarPancasila": Pilih 3-4 dimensi Profil Pelajar Pancasila yang paling relevan (misal Bernalar Kritis, Gotong Royong, Mandiri, Kreatif) dengan rincian sikap aplikatif.
4. "saranaPrasarana": Tuliskan alat, media peraga, bahan ajar, dan sumber belajar kontekstual yang digunakan.
5. "kegiatanPembelajaran": Susun 2 pertemuan terstruktur yang memuat langkah pembuka, inti, dan penutup.
   Pada bagian "inti", WAJIB MENERAPKAN SINTAKS ${modelDef.label} secara eksplisit dan runut per tahap.
6. "asesmen": Deskripsikan instrumen diagnostik awal, asesmen formatif proses, dan asesmen sumatif akhir secara komprehensif.
7. "rubrikPenilaianSingkat": Sediakan rubrik penilaian singkat dengan kriteria dan 4 level capaian (baruBerkembang, layak, cakap, mahir).
8. "pengayaanDanRemedial": Rancang strategi pengayaan analitis dan bimbingan remedial terarah.
9. "glosarium": Minimal 3 istilah kunci beserta definisinya.
10. "daftarPustaka": Minimal 2 referensi buku sumber resmi Kurikulum Merdeka atau rujukan ilmiah terpercaya.

PETUNJUK OUTPUT JSON MURNI:
Kembalikan HANYA format JSON valid tanpa tanda markdown pembuka/penutup (\`\`\`json) dan tanpa kalimat pengantar:
{
  "judul": "Modul Ajar: ${tp.materiPokok} - ${modelDef.label}",
  "pemahamanBermakna": "...",
  "pertanyaanPemantik": [
    "Pertanyaan pemantik 1 (HOTS)",
    "Pertanyaan pemantik 2 (HOTS)",
    "Pertanyaan pemantik 3 (HOTS)"
  ],
  "kompetensiAwal": ["..."],
  "profilPelajarPancasila": ["..."],
  "saranaPrasarana": ["..."],
  "targetPesertaDidik": "Peserta didik reguler dengan diferensiasi proses dan produk",
  "modelPembelajaran": "${modelDef.label}",
  "kegiatanPembelajaran": [
    {
      "pertemuan": 1,
      "alokasiMenit": 80,
      "pendahuluan": ["..."],
      "inti": ["..."],
      "penutup": ["..."]
    },
    {
      "pertemuan": 2,
      "alokasiMenit": 80,
      "pendahuluan": ["..."],
      "inti": ["..."],
      "penutup": ["..."]
    }
  ],
  "asesmen": {
    "diagnostik": "...",
    "formatif": "...",
    "sumatif": "..."
  },
  "rubrikPenilaianSingkat": [
    {
      "kriteria": "...",
      "baruBerkembang": "...",
      "layak": "...",
      "cakap": "...",
      "mahir": "..."
    }
  ],
  "pengayaanDanRemedial": {
    "pengayaan": "...",
    "remedial": "..."
  },
  "refleksiGuru": ["..."],
  "refleksiSiswa": ["..."],
  "glosarium": [
    { "istilah": "...", "definisi": "..." }
  ],
  "daftarPustaka": ["..."]
}
`.trim();
}

/**
 * Normalisasi dan validasi respon JSON dari Gemini agar menghasilkan dokumen ModulAjarDokumen
 * yang aman, lengkap, dan tidak menyisakan field null/undefined.
 */
function normalizeAIResponseToModulAjar(
  parsed: any,
  tp: CustomTPItem,
  _profile: SchoolProfile,
  model: ModulAjarModelType,
  _konteksLokal: string | undefined,
  fallback: ModulAjarDokumen
): ModulAjarDokumen {
  const modelDef = MODUL_AJAR_MODELS.find((m) => m.id === model) || MODUL_AJAR_MODELS[0];

  const judul =
    typeof parsed?.judul === 'string' && parsed.judul.trim().length > 0
      ? parsed.judul.trim()
      : `Modul Ajar: ${tp.materiPokok} (${modelDef.label})`;

  const pemahamanBermakna =
    typeof parsed?.pemahamanBermakna === 'string' && parsed.pemahamanBermakna.trim().length > 0
      ? parsed.pemahamanBermakna.trim()
      : fallback.pemahamanBermakna;

  const pertanyaanPemantik =
    Array.isArray(parsed?.pertanyaanPemantik) && parsed.pertanyaanPemantik.length > 0
      ? parsed.pertanyaanPemantik.map(String)
      : fallback.pertanyaanPemantik;

  const kompetensiAwal =
    Array.isArray(parsed?.kompetensiAwal) && parsed.kompetensiAwal.length > 0
      ? parsed.kompetensiAwal.map(String)
      : fallback.kompetensiAwal;

  const profilPelajarPancasila =
    Array.isArray(parsed?.profilPelajarPancasila) && parsed.profilPelajarPancasila.length > 0
      ? parsed.profilPelajarPancasila.map(String)
      : fallback.profilPelajarPancasila;

  const saranaPrasarana =
    Array.isArray(parsed?.saranaPrasarana) && parsed.saranaPrasarana.length > 0
      ? parsed.saranaPrasarana.map(String)
      : fallback.saranaPrasarana;

  const targetPesertaDidik =
    typeof parsed?.targetPesertaDidik === 'string' && parsed.targetPesertaDidik.trim().length > 0
      ? parsed.targetPesertaDidik.trim()
      : fallback.targetPesertaDidik;

  const modelPembelajaran =
    typeof parsed?.modelPembelajaran === 'string' && parsed.modelPembelajaran.trim().length > 0
      ? parsed.modelPembelajaran.trim()
      : `${modelDef.label} - ${modelDef.deskripsi}`;

  // Normalisasi Langkah Kegiatan Pembelajaran
  let kegiatanPembelajaran: KegiatanPembelajaranLangkah[] = fallback.kegiatanPembelajaran;
  if (Array.isArray(parsed?.kegiatanPembelajaran) && parsed.kegiatanPembelajaran.length > 0) {
    kegiatanPembelajaran = parsed.kegiatanPembelajaran.map(
      (item: any, idx: number): KegiatanPembelajaranLangkah => {
        const fb = fallback.kegiatanPembelajaran[idx] || fallback.kegiatanPembelajaran[0];
        return {
          pertemuan: typeof item?.pertemuan === 'number' ? item.pertemuan : idx + 1,
          alokasiMenit:
            typeof item?.alokasiMenit === 'number' ? item.alokasiMenit : fb.alokasiMenit,
          pendahuluan:
            Array.isArray(item?.pendahuluan) && item.pendahuluan.length > 0
              ? item.pendahuluan.map(String)
              : fb.pendahuluan,
          inti:
            Array.isArray(item?.inti) && item.inti.length > 0
              ? item.inti.map(String)
              : fb.inti,
          penutup:
            Array.isArray(item?.penutup) && item.penutup.length > 0
              ? item.penutup.map(String)
              : fb.penutup,
        };
      }
    );
  }

  // Normalisasi Asesmen
  const asesmen = {
    diagnostik:
      typeof parsed?.asesmen?.diagnostik === 'string' && parsed.asesmen.diagnostik.trim().length > 0
        ? parsed.asesmen.diagnostik.trim()
        : fallback.asesmen.diagnostik,
    formatif:
      typeof parsed?.asesmen?.formatif === 'string' && parsed.asesmen.formatif.trim().length > 0
        ? parsed.asesmen.formatif.trim()
        : fallback.asesmen.formatif,
    sumatif:
      typeof parsed?.asesmen?.sumatif === 'string' && parsed.asesmen.sumatif.trim().length > 0
        ? parsed.asesmen.sumatif.trim()
        : fallback.asesmen.sumatif,
  };

  // Normalisasi Rubrik Penilaian Singkat
  let rubrikPenilaianSingkat = fallback.rubrikPenilaianSingkat;
  if (
    Array.isArray(parsed?.rubrikPenilaianSingkat) &&
    parsed.rubrikPenilaianSingkat.length > 0
  ) {
    rubrikPenilaianSingkat = parsed.rubrikPenilaianSingkat.map((r: any, idx: number) => {
      const fb = fallback.rubrikPenilaianSingkat[idx] || fallback.rubrikPenilaianSingkat[0];
      return {
        kriteria: typeof r?.kriteria === 'string' ? r.kriteria : fb.kriteria,
        baruBerkembang:
          typeof r?.baruBerkembang === 'string' ? r.baruBerkembang : fb.baruBerkembang,
        layak: typeof r?.layak === 'string' ? r.layak : fb.layak,
        cakap: typeof r?.cakap === 'string' ? r.cakap : fb.cakap,
        mahir: typeof r?.mahir === 'string' ? r.mahir : fb.mahir,
      };
    });
  }

  // Normalisasi Pengayaan dan Remedial
  const pengayaanSource =
    parsed?.pengayaanDanRemedial?.pengayaan || parsed?.remedialDanPengayaan?.pengayaan;
  const remedialSource =
    parsed?.pengayaanDanRemedial?.remedial || parsed?.remedialDanPengayaan?.remedial;

  const pengayaanDanRemedial = {
    pengayaan:
      typeof pengayaanSource === 'string' && pengayaanSource.trim().length > 0
        ? pengayaanSource.trim()
        : fallback.pengayaanDanRemedial.pengayaan,
    remedial:
      typeof remedialSource === 'string' && remedialSource.trim().length > 0
        ? remedialSource.trim()
        : fallback.pengayaanDanRemedial.remedial,
  };

  const refleksiGuru =
    Array.isArray(parsed?.refleksiGuru) && parsed.refleksiGuru.length > 0
      ? parsed.refleksiGuru.map(String)
      : fallback.refleksiGuru;

  const refleksiSiswa =
    Array.isArray(parsed?.refleksiSiswa) && parsed.refleksiSiswa.length > 0
      ? parsed.refleksiSiswa.map(String)
      : fallback.refleksiSiswa;

  let glosarium = fallback.glosarium;
  if (Array.isArray(parsed?.glosarium) && parsed.glosarium.length > 0) {
    glosarium = parsed.glosarium
      .filter((g: any) => g && typeof g.istilah === 'string')
      .map((g: any) => ({
        istilah: String(g.istilah),
        definisi: String(g.definisi || ''),
      }));
    if (glosarium.length === 0) {
      glosarium = fallback.glosarium;
    }
  }

  const daftarPustaka =
    Array.isArray(parsed?.daftarPustaka) && parsed.daftarPustaka.length > 0
      ? parsed.daftarPustaka.map(String)
      : fallback.daftarPustaka;

  return {
    ...fallback,
    judul,
    modelPembelajaran,
    pemahamanBermakna,
    pertanyaanPemantik,
    kompetensiAwal,
    profilPelajarPancasila,
    saranaPrasarana,
    targetPesertaDidik,
    kegiatanPembelajaran,
    asesmen,
    rubrikPenilaianSingkat,
    pengayaanDanRemedial,
    refleksiGuru,
    refleksiSiswa,
    glosarium,
    daftarPustaka,
  };
}

/**
 * Layanan Pembuatan Modul Ajar (RPP Plus) Kontekstual Berbasis AI Gemini
 * mendukung 5 Model Pembelajaran Kurikulum Merdeka dengan fallback aman ke Perangkat Ajar Heuristic Engine.
 */
export async function generateContextualModulAjarWithAI(
  tp: CustomTPItem,
  profile: SchoolProfile,
  model: ModulAjarModelType = 'pbl',
  konteksLokal?: string
): Promise<ContextualModulAjarResult> {
  const fallback = buildSmartModulAjar(tp, profile);
  const modelDef = MODUL_AJAR_MODELS.find((m) => m.id === model) || MODUL_AJAR_MODELS[0];
  if (modelDef) {
    fallback.modelPembelajaran = `${modelDef.label} - ${modelDef.deskripsi}`;
  }

  try {
    const prompt = buildModulAjarGeminiPrompt(tp, profile, model, konteksLokal);
    const parsed = await callGeminiStructuredJSON({
      prompt,
      temperature: 0.45,
    });

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Respon Gemini tidak menghasilkan format dokumen JSON yang valid.');
    }

    // Deduksi kuota jika pengguna berlisensi aktif
    deductQuota();

    const modul = normalizeAIResponseToModulAjar(parsed, tp, profile, model, konteksLokal, fallback);
    return {
      modul,
      usedFallback: false,
    };
  } catch (err: any) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : 'Gagal menghubungi server AI Gemini. Beralih ke generator modul ajar otomatis.';

    return {
      modul: fallback,
      usedFallback: true,
      errorMsg,
    };
  }
}
