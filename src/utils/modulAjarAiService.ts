import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { jenjangToDefaultFase } from './schoolProfileStorage';
import type {
  CooperativeTechniqueVariant,
  FaseKegiatanLangkah,
  KegiatanPembelajaranLangkah,
  ModulAjarDokumen,
  ModulAjarQualityValidation,
  ModulAsesmenDetail,
  ModulContohLKPD,
  ModulDiferensiasiOperasional,
  ModulJalurDiferensiasi,
  ModulReferensiSumberItem,
  PengalamanBelajarPM,
  PrinsipPembelajaranPM,
  TahapKegiatanTerstruktur,
} from '../types/perangkatAjar';
import {
  COOPERATIVE_TECHNIQUE_VARIANTS,
  LEGACY_MODUL_MODEL_IDS,
  MODUL_AJAR_MODELS,
  getModulAjarModelDefinition,
  isValidModulAjarModelType,
  type ModulAjarModelDefinition,
  type ModulAjarModelType,
} from './modulPedagogicalModels';
import {
  computeMeetingsNeededForTP,
  reconcileSessionStageDurations,
  resolveModulTimePreset,
  syncLegacyArraysFromStructuredStages,
} from './modulTimeBudget';
import {
  resolveRecommendedLKPDPresetForModel,
  resolveModulKKTPConfig,
  summarizeAsesmenDetailToLegacy,
} from './modulOperationalContent';
import { validateModulAjarDokumen } from './modulAjarValidator';
import {
  buildReferensiPromptBlock,
  formatReferensiSumberCitation,
} from './modulReferensiSumber';
import { resolveSubjectApproachRule, resolveSubjectFamily } from './lkpdSubjectBlueprints';
import { buildSmartModulAjar } from './perangkatAjarEngine';
import { callGeminiStructuredJSON, executeMeteredAICall } from '../services/geminiClient';
import { requireActiveLicenseForAction, deductQuota } from './licenseManager';

export {
  requireActiveLicenseForAction,
  deductQuota,
  MODUL_AJAR_MODELS,
  COOPERATIVE_TECHNIQUE_VARIANTS,
  LEGACY_MODUL_MODEL_IDS,
  getModulAjarModelDefinition,
  isValidModulAjarModelType,
};
export type { ModulAjarModelType, ModulAjarModelDefinition };

export interface ModulAjarGenerationTimeOptions {
  jpPerPertemuan?: number;
  menitPerJP?: number;
  jumlahPertemuan?: number;
  smkTrackOverride?: 'umum' | 'kejuruan';
  variasiTeknikModel?: CooperativeTechniqueVariant;
  referensiSumber?: ModulReferensiSumberItem[];
}

export interface ContextualModulAjarResult {
  modul: ModulAjarDokumen;
  usedFallback: boolean;
  aiFailed?: boolean;
  repairAttempted?: boolean;
  quotaError?: boolean;
  validation?: ModulAjarQualityValidation;
  validationErrors?: string[];
  errorMsg?: string;
}

export const MODUL_AJAR_SYSTEM_INSTRUCTION = [
  'Anda adalah Instructional Designer profesional dan guru senior Kurikulum Indonesia.',
  'Prinsip wajib penyusunan Modul Ajar:',
  '1. Konkret & operasional: setiap tahap kegiatan guru dan siswa harus dapat langsung dipraktikkan di kelas (memuat objek media/data, instruksi konkret, langkah siswa, dan bukti belajar). DILARANG menulis deskripsi generik seperti "Guru menjelaskan materi" atau "Siswa berdiskusi" tanpa rincian objek dan tugas.',
  '2. Autentik sesuai sintaks model: ikuti tahapan persis model pedagogik terpilih. Jangan mencampur PBL dengan PjBL, atau Discovery dengan Inquiry.',
  '3. Materi ajar mendalam 7 komponen: konsep utama, subkonsep, istilah penting materi, contoh konkret kehidupan/lingkungan sesuai jenjang, contoh penyelesaian/demonstrasi langkah demi langkah, hubungan dengan TP, serta potensi miskonsepsi dan cara meluruskannya.',
  '4. Kesesuaian jenjang & rumpun ilmu: gunakan bahasa konkret visual tanpa konteks dunia kerja/industri pada SD/MI; sertakan prosedur dan K3 pada SMK kejuruan; sesuaikan bentuk asesmen dengan karakteristik mata pelajaran.',
  '5. Asesmen & KKTP dinamis: sediakan instrumen konkret untuk diagnostik, formatif, dan asesmen akhir beserta kunci/contoh respons dan pedoman penilaian. DILARANG menanamkan angka ketuntasan tetap seperti 71 secara sembarangan jika tidak ditetapkan sekolah.',
  '6. Diferensiasi operasional 3 tingkat (kesiapan dasar, berkembang, mahir) yang semuanya menuju TP yang sama.',
  '7. Pembelajaran Mendalam & Profil Lulusan selektif: integrasikan pengalaman/prinsip Pembelajaran Mendalam hanya pada tahap yang relevan (tidak dipaksakan ke semua tahap), pilih 2-4 dimensi Profil Lulusan yang benar-benar relevan.',
  '8. Kejujuran rujukan: gunakan hanya metadata buku dan catatan materi yang benar-benar disediakan guru. DILARANG mengarang penulis, tahun terbit, nomor ISBN, kutipan langsung fiktif, nomor halaman spesifik di luar input guru, URL SIBI fiktif, atau mengklaim membaca isi buku dari tautan URL secara otomatis.',
].join('\n');

class ModulAIValidationRejectionError extends Error {
  issues: string[];
  repairAttempted: boolean;

  constructor(issues: string[], repairAttempted: boolean) {
    super(`Keluaran AI belum memenuhi syarat kualitas modul ajar (${issues[0] || 'struktur tidak lengkap'}).`);
    this.name = 'ModulAIValidationRejectionError';
    this.issues = issues;
    this.repairAttempted = repairAttempted;
  }
}

/**
 * Membangun prompt Gemini AI yang operasional & mendalam untuk Modul Ajar Kurikulum Merdeka
 * berbasis 7 model pedagogik terstruktur dengan konteks CP/TP/Sub-TP, jenjang, rumpun mapel, dan waktu akurat.
 */
export function buildModulAjarGeminiPrompt(
  tp: CustomTPItem,
  profile: SchoolProfile,
  model: ModulAjarModelType = 'pbl',
  konteksLokal?: string,
  timeOptions?: ModulAjarGenerationTimeOptions
): string {
  const modelDef = getModulAjarModelDefinition(model);
  const jenjangFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const timePreset = resolveModulTimePreset(profile, {
    jpPerPertemuan: timeOptions?.jpPerPertemuan,
    menitPerJP: timeOptions?.menitPerJP,
    smkTrackOverride: timeOptions?.smkTrackOverride,
  });
  const totalAlokasiJPTP = Math.max(1, Number(tp.alokasiJP) || timePreset.jpPerPertemuan);
  const effectiveSessionJP =
    typeof timeOptions?.jpPerPertemuan === 'number' &&
    Number.isFinite(timeOptions.jpPerPertemuan)
      ? timePreset.jpPerPertemuan
      : Math.min(timePreset.jpPerPertemuan, totalAlokasiJPTP);
  const meetingPlan = computeMeetingsNeededForTP(
    totalAlokasiJPTP,
    effectiveSessionJP,
    timePreset.menitPerJP,
    timeOptions?.jumlahPertemuan
  );
  const jumlahPertemuan = meetingPlan.jumlahPertemuanAktif;
  const menitPerJP = meetingPlan.menitPerJP;
  const menitPerPertemuan = meetingPlan.totalMenitPertemuan;
  const jpPertemuanAktif = meetingPlan.jpPerPertemuan;
  const teknikNote =
    modelDef.id === 'cooperative' && timeOptions?.variasiTeknikModel
      ? ` (Teknik Kooperatif: ${timeOptions.variasiTeknikModel})`
      : '';

  const subjectFamily = resolveSubjectFamily(profile.mataPelajaranUtama || '');
  const lkpdPreset = resolveRecommendedLKPDPresetForModel(modelDef.id, subjectFamily);
  const subjectRule = resolveSubjectApproachRule(subjectFamily, lkpdPreset);
  const kktpRef = resolveModulKKTPConfig(tp, profile);

  const subTPText =
    tp.subTP && tp.subTP.length > 0
      ? tp.subTP.map((s) => `  - ${s.kode}: ${s.kompetensi} (bukti: ${s.buktiKetercapaian})`).join('\n')
      : `  - ${tp.kode}: ${tp.tujuanPembelajaran}`;
  const prasyaratText =
    tp.prasyarat && tp.prasyarat.length > 0
      ? tp.prasyarat.join('; ')
      : `Pemahaman pengantar elemen ${tp.elemen}`;
  const buktiText =
    tp.buktiKetercapaian && tp.buktiKetercapaian.length > 0
      ? tp.buktiKetercapaian.join('; ')
      : tp.kompetensiInti || tp.tujuanPembelajaran;
  const cpMetaText = tp.referensiCP?.teksCP
    ? `- Referensi CP Terkait (${tp.referensiCP.elemenCP || tp.elemen}): ${tp.referensiCP.teksCP}`
    : '';
  const konteks =
    konteksLokal && konteksLokal.trim().length > 0
      ? konteksLokal.trim()
      : `Penerapan nyata materi ${tp.materiPokok} sesuai jenjang ${profile.jenjang || 'SMP/MTs'}`;

  const gradeConstraint =
    timePreset.jenjangKategori === 'SD/MI'
      ? 'PENTING KHUSUS SD/MI: Gunakan bahasa ramah anak usia SD, contoh visual atau benda nyata di rumah/kelas/sekolah. DILARANG memakai istilah "dunia kerja", "industri", "bengkel", atau jargon perkuliahan.'
      : timePreset.jenjangKategori === 'SMK' && timePreset.smkTrack === 'kejuruan'
      ? 'PENTING KHUSUS SMK KEJURUAN: Wajib menyertakan prosedur kerja (SOP), persiapan alat/bahan, kontrol mutu hasil, dan aspek keselamatan kerja (K3) yang relevan.'
      : timePreset.jenjangKategori === 'SMA/MA'
      ? 'PENTING KHUSUS SMA/MA: Tekankan penalaran konseptual mendalam, pengujian asumsi/syarat batas, dan argumentasi berbasis bukti.'
      : 'Sesuaikan kedalaman konsep, contoh konkret, dan tingkat analisis dengan perkembangan kognitif jenjang kelas.';

  const kktpInstruction =
    kktpRef.mode === 'dinamis_sekolah'
      ? `KKTP Aktif Sekolah/TP: minimal tuntas kategori Cakap mulai skor ${kktpRef.minTuntas}. Susun pedoman penilaian dan deskripsi pencapaian konsisten dengan ambang ${kktpRef.minTuntas}.`
      : 'KKTP Numerik Sekolah BELUM Ditetapkan: Gunakan penilaian kualitatif 4 tingkat (Baru Berkembang, Layak, Cakap, Mahir) pada rubrik dan pedoman penilaian. DILARANG menanamkan angka ketuntasan tetap seperti 71 secara sembarangan.';
  const referensiPromptBlock = buildReferensiPromptBlock(timeOptions?.referensiSumber);

  const aiPromptMeetings = 1;
  const contohPertemuanJson = Array.from({ length: aiPromptMeetings }, (_, idx) => ({
    pertemuan: idx + 1,
    alokasiMenit: menitPerPertemuan,
    tahapTerstruktur: [
      {
        fase: 'pendahuluan',
        namaTahap: 'Pendahuluan & Kesiapan Belajar',
        tujuanTahap: '...',
        aktivitasGuru: 'Kalimat konkret aksi guru (objek media + instruksi + langkah cek)...',
        aktivitasSiswa: 'Kalimat konkret aksi siswa + luaran yang dicatat/dilakukan...',
        instruksiPertanyaan: 'Pertanyaan atau instruksi lisan yang benar-benar diucapkan guru...',
        mediaBahan: 'Alat/media spesifik...',
        durasiMenit: Math.min(20, Math.max(5, Math.round(menitPerPertemuan * 0.12))),
        buktiBelajar: 'Bukti nyata yang diamati guru...',
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Berkesadaran'],
      },
    ],
  }));

  return `
Susun dokumen Modul Ajar (RPP Plus Kurikulum Merdeka) yang MENDALAM, KONKRET, OPERASIONAL, dan SIAP PAKAI MENGAJAR tanpa isi klise atau bagian kosong.

IDENTITAS & PROFIL PEMBELAJARAN:
- Satuan Pendidikan: ${profile.namaSekolah || 'Sekolah Penggerak Merdeka'} (${profile.kotaSekolah || 'Nusantara'})
- Jenjang & Kelas: ${profile.jenjang || 'SMP'} / ${jenjangFase} - Kelas ${profile.kelasUtama || '8'} (${profile.rombelAktif || 'Rombel Utama'})
- Mata Pelajaran & Rumpun Ilmu: ${profile.mataPelajaranUtama || 'Mata Pelajaran Utama'} (Rumpun: ${subjectRule.labelRumpun})
- Syarat Karakteristik Mapel: ${subjectRule.stimulusRequirement} ${subjectRule.activityRequirement}
- Topik / Materi Pokok: ${tp.materiPokok}
- Kode & Elemen TP: ${tp.kode} (${tp.elemen})
- Capaian / Tujuan Pembelajaran (TP): ${tp.tujuanPembelajaran}
- Arahan Konten/Materi TP: ${tp.arahanRangkuman || '-'}
${cpMetaText}
- Prasyarat Awal Siswa: ${prasyaratText}
- Bukti Ketercapaian (KKTP): ${buktiText}
- Rincian Sub-TP:
${subTPText}
- Alokasi Waktu TP: ${totalAlokasiJPTP} JP (${jumlahPertemuan} Pertemuan x ${jpPertemuanAktif} JP = ${menitPerPertemuan} Menit/pertemuan, standar ${menitPerJP} menit/JP)
- Model Pembelajaran Terpilih: ${modelDef.label}${teknikNote}
- Deskripsi Pendekatan Model: ${modelDef.deskripsi}
- SINTAKS PEDAGOGIS WAJIB:
${modelDef.tahapanSintaks.map((s) => `  ${s.urutan}. ${s.namaTahap} — ${s.tujuanTahap}`).join('\n')}
- TEMA / KONTEKS LOKAL NYATA: "${konteks}"
- ${gradeConstraint}
- ${kktpInstruction}

${referensiPromptBlock}

KETENTUAN KUALITAS TIAP BAGIAN (WAJIB DIPENUHI):
1. "bahanBacaan" (MATERI AJAR KONKRET 7 KOMPONEN):
   - "penjelasanKonsepUtama": uraian utuh materi (minimal 3 kalimat substantif, bukan ringkasan 1-2 kalimat) sesuai kedalaman jenjang dan rumpun mapel.
   - "subKonsep": array minimal 2 objek { "judul", "uraian" } yang menguraikan konsep penting secara nyata.
   - "istilahPenting": array minimal 3 objek { "istilah", "pengertian" } khusus istilah konsep pelajaran dalam bahasa sesuai jenjang (BUKAN istilah administrasi CP/TP).
   - "contohKonkret": array minimal 2 contoh nyata yang relevan dengan kehidupan/lingkungan siswa pada jenjang ini.
   - "contohPenyelesaian": objek { "judulContoh", "konteks", "langkahPenyelesaian": [minimal 3 langkah konkret], "kesimpulanHasil" } berupa demonstrasi langkah demi langkah sesuai sifat ilmu mapel.
   - "hubunganDenganTP": penjelasan eksplisit bagaimana materi menghantarkan pencapaian TP ${tp.kode}.
   - "potensiMiskonsepsi": array minimal 2 objek { "miskonsepsi", "caraMeluruskan" } berisi kesalahan konsep umum siswa dan langkah konkret guru meluruskannya.
2. "profilPelajarPancasila": pilih HANYA 2 sampai 4 dimensi Profil Lulusan yang paling relevan dengan TP & kegiatan (dari 8 dimensi Profil Lulusan), jangan memaksakan seluruh dimensi.
3. "kegiatanPembelajaran": susun ${aiPromptMeetings} pertemuan inti yang representatif (masing-masing tepat ${menitPerPertemuan} menit; sistem akan mendistribusikan ke total ${jumlahPertemuan} pertemuan TP secara proporsional).
   - "tahapTerstruktur" mencakup fase "pendahuluan", seluruh tahapan sintaks "${modelDef.label}" pada fase "inti", dan fase "penutup".
   - Jumlah "durasiMenit" seluruh tahap dalam 1 pertemuan HARUS tepat ${menitPerPertemuan} menit.
   - Setiap tahap wajib menuliskan "aktivitasGuru" dan "aktivitasSiswa" secara operasional (>= 40 karakter, berisi objek/media nyata, instruksi spesifik, dan tindakan teramati), "instruksiPertanyaan" langsung pakai guru, "mediaBahan", dan "buktiBelajar".
   - Integrasikan tag "pengalamanBelajar" ('Memahami'|'Mengaplikasi'|'Merefleksi') dan "prinsipPembelajaran" ('Berkesadaran'|'Bermakna'|'Menggembirakan') hanya pada tahap yang relevan (jangan menempelkan ketiga prinsip sekaligus ke seluruh tahap).
4. "asesmenDetail" (ASESMEN KONKRET):
   - "diagnostik": "tujuanPemeriksaanPrasyarat", "pertanyaanAtauTugasAwal" (minimal 2 tugas/pertanyaan konkret), "indikatorInterpretasi".
   - "formatif": "instruksiAktivitas", "pertanyaanAtauTugas" (minimal 2 butir cek proses), "buktiYangDiamati" (minimal 2 bukti nyata), "umpanBalikGuru".
   - "akhir": "bentukUtama" sesuai karakter mapel, "butirTugas" (minimal 2 butir dengan { "nomor", "bentuk", "pertanyaanAtauTugas", "kunciAtauContohRespons" }), "pedomanPenilaian".
   - "rubrikPenilaianSingkat": minimal 2 kriteria dengan deskripsi jelas di level baruBerkembang, layak, cakap, mahir.
5. "diferensiasiOperasional": 3 jalur nyata ("kesiapanDasar", "kesiapanBerkembang", "kesiapanMahir") yang masing-masing memuat "targetKesiapan", "dukunganScaffolding", "aktivitasKonkret" (minimal 2 aktivitas konkret), "mediaPendukung", dan "buktiBelajarJalur" serta "prinsipKesetaraanTP".
6. "contohLKPD": 1 contoh LKPD terintegrasi relevan TP (preset "${lkpdPreset}") memuat "presetType", "judul", "konteksTugas", "tujuanPengerjaan", "petunjukSiswa" (>=2), "bahanAtauData" (>=1), "langkahPengerjaan" (>=2), "pertanyaanAtauRuangKerja" (>=2), "hasilYangDiharapkan", "kriteriaPenilaian" (>=2).
7. "daftarPustaka": cantumkan rujukan jujur; DILARANG mengarang ISBN, halaman spesifik, atau URL SIBI fiktif.
8. KEPADATAN & KECEPATAN JSON (WAJIB): Tulis setiap nilai string secara PADAT, SPESIFIK, dan LANGSUNG OPERASIONAL (1-2 kalimat padat per field; aktivitasGuru & aktivitasSiswa masing-masing 65-130 karakter berisi objek/media nyata + tindakan teramati; penjelasanKonsepUtama tepat 3 kalimat padat >= 100 karakter; tepat 2 item per array). Jangan menulis esai bertele-tele agar total JSON selesai di bawah 1.800 token dan tidak terpotong.

Kembalikan HANYA 1 objek JSON valid tanpa markdown fence (\`\`\`json) dan tanpa teks pengantar:
{
  "judul": "Modul Ajar: ${tp.materiPokok} - ${modelDef.label}",
  "pemahamanBermakna": "...",
  "pertanyaanPemantik": ["...", "...", "..."],
  "kompetensiAwal": ["..."],
  "profilPelajarPancasila": ["...", "..."],
  "saranaPrasarana": ["..."],
  "targetPesertaDidik": "...",
  "modelPembelajaran": "${modelDef.label}${teknikNote}",
  "bahanBacaan": {
    "penjelasanKonsepUtama": "...",
    "subKonsep": [{ "judul": "...", "uraian": "..." }, { "judul": "...", "uraian": "..." }],
    "istilahPenting": [{ "istilah": "...", "pengertian": "..." }, { "istilah": "...", "pengertian": "..." }, { "istilah": "...", "pengertian": "..." }],
    "contohKonkret": ["...", "..."],
    "contohPenyelesaian": {
      "judulContoh": "...",
      "konteks": "...",
      "langkahPenyelesaian": ["Langkah 1...", "Langkah 2...", "Langkah 3..."],
      "kesimpulanHasil": "..."
    },
    "hubunganDenganTP": "...",
    "potensiMiskonsepsi": [{ "miskonsepsi": "...", "caraMeluruskan": "..." }],
    "referensiCatatan": "Lengkapi/sesuaikan rujukan bacaan dengan buku teks utama satuan pendidikan."
  },
  "kegiatanPembelajaran": ${JSON.stringify(contohPertemuanJson, null, 2)},
  "asesmenDetail": {
    "diagnostik": {
      "tujuanPemeriksaanPrasyarat": "...",
      "pertanyaanAtauTugasAwal": ["...", "..."],
      "indikatorInterpretasi": "..."
    },
    "formatif": {
      "instruksiAktivitas": "...",
      "pertanyaanAtauTugas": ["...", "..."],
      "buktiYangDiamati": ["...", "..."],
      "umpanBalikGuru": "..."
    },
    "akhir": {
      "bentukUtama": "...",
      "butirTugas": [
        { "nomor": 1, "bentuk": "...", "pertanyaanAtauTugas": "...", "kunciAtauContohRespons": "..." },
        { "nomor": 2, "bentuk": "...", "pertanyaanAtauTugas": "...", "kunciAtauContohRespons": "..." }
      ],
      "pedomanPenilaian": "..."
    }
  },
  "rubrikPenilaianSingkat": [
    { "kriteria": "...", "baruBerkembang": "...", "layak": "...", "cakap": "...", "mahir": "..." },
    { "kriteria": "...", "baruBerkembang": "...", "layak": "...", "cakap": "...", "mahir": "..." }
  ],
  "diferensiasiOperasional": {
    "prinsipKesetaraanTP": "...",
    "kesiapanDasar": { "targetKesiapan": "...", "dukunganScaffolding": "...", "aktivitasKonkret": ["...", "..."], "mediaPendukung": "...", "buktiBelajarJalur": "..." },
    "kesiapanBerkembang": { "targetKesiapan": "...", "dukunganScaffolding": "...", "aktivitasKonkret": ["...", "..."], "mediaPendukung": "...", "buktiBelajarJalur": "..." },
    "kesiapanMahir": { "targetKesiapan": "...", "dukunganScaffolding": "...", "aktivitasKonkret": ["...", "..."], "mediaPendukung": "...", "buktiBelajarJalur": "..." }
  },
  "contohLKPD": {
    "presetType": "${lkpdPreset}",
    "judul": "...",
    "konteksTugas": "...",
    "tujuanPengerjaan": "...",
    "petunjukSiswa": ["...", "..."],
    "bahanAtauData": ["..."],
    "langkahPengerjaan": ["...", "..."],
    "pertanyaanAtauRuangKerja": ["...", "..."],
    "hasilYangDiharapkan": "...",
    "kriteriaPenilaian": ["...", "..."]
  },
  "refleksiGuru": ["..."],
  "refleksiSiswa": ["..."],
  "glosarium": [{ "istilah": "...", "definisi": "..." }],
  "daftarPustaka": ["[Lengkapi referensi satuan pendidikan] Buku teks utama mata pelajaran sesuai edisi kelas."]
}
`.trim();
}

function asCleanString(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function asCleanStringList(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

interface StrictModulNormalizationResult {
  doc: ModulAjarDokumen;
  structuralErrors: string[];
  maxTokensCut: boolean;
}

/**
 * Normalisasi ketat respon JSON AI tanpa menyisipkan teks template generik diam-diam
 * untuk menutup kekosongan struktur (kekurangan struktur dilaporkan ke validator & repair loop).
 */
function normalizeAIResponseStrict(
  parsed: any,
  tp: CustomTPItem,
  profile: SchoolProfile,
  model: ModulAjarModelType,
  _konteksLokal: string | undefined,
  fallback: ModulAjarDokumen
): StrictModulNormalizationResult {
  const modelDef = getModulAjarModelDefinition(model);
  const structuralErrors: string[] = [];
  const maxTokensCut = parsed?._geminiFinishReason === 'MAX_TOKENS';
  const kktpRef = resolveModulKKTPConfig(tp, profile);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    structuralErrors.push('Respons AI bukan objek JSON yang valid.');
  }

  const judul = asCleanString(parsed?.judul) || `Modul Ajar: ${tp.materiPokok} (${modelDef.label})`;
  const pemahamanBermakna = asCleanString(parsed?.pemahamanBermakna);
  if (pemahamanBermakna.length < 20) {
    structuralErrors.push('Pemahaman bermakna kosong atau terlalu singkat.');
  }

  const pertanyaanPemantik = asCleanStringList(parsed?.pertanyaanPemantik);
  if (pertanyaanPemantik.length === 0) {
    structuralErrors.push('Pertanyaan pemantik tidak dihasilkan AI.');
  }

  const kompetensiAwal =
    asCleanStringList(parsed?.kompetensiAwal).length > 0
      ? asCleanStringList(parsed?.kompetensiAwal)
      : fallback.kompetensiAwal;
  const profilPelajarPancasila = asCleanStringList(parsed?.profilPelajarPancasila);
  if (profilPelajarPancasila.length === 0) {
    structuralErrors.push('Dimensi Profil Lulusan relevan belum dipilih.');
  }

  const saranaPrasarana =
    asCleanStringList(parsed?.saranaPrasarana).length > 0
      ? asCleanStringList(parsed?.saranaPrasarana)
      : fallback.saranaPrasarana;
  const targetPesertaDidik =
    asCleanString(parsed?.targetPesertaDidik) || fallback.targetPesertaDidik;
  const modelPembelajaran =
    asCleanString(parsed?.modelPembelajaran) || `${modelDef.label} - ${modelDef.deskripsi}`;

  // Bahan Bacaan (7 elemen konkret)
  const rawBB = parsed?.bahanBacaan;
  let bahanBacaan: ModulAjarDokumen['bahanBacaan'];
  if (!rawBB || typeof rawBB !== 'object') {
    structuralErrors.push('Objek bahanBacaan (materi ajar konkret) tidak dikembalikan AI.');
  } else {
    const konsepUtama = asCleanString(rawBB.penjelasanKonsepUtama) || asCleanString(rawBB.ringkasanInti);
    const subKonsep = Array.isArray(rawBB.subKonsep)
      ? rawBB.subKonsep
          .filter((s: any) => s && typeof s === 'object')
          .map((s: any) => ({ judul: asCleanString(s.judul), uraian: asCleanString(s.uraian) }))
          .filter((s: { judul: string; uraian: string }) => s.judul && s.uraian)
      : [];
    const istilahPenting = Array.isArray(rawBB.istilahPenting)
      ? rawBB.istilahPenting
          .filter((it: any) => it && typeof it === 'object')
          .map((it: any) => ({ istilah: asCleanString(it.istilah), pengertian: asCleanString(it.pengertian) }))
          .filter((it: { istilah: string; pengertian: string }) => it.istilah && it.pengertian)
      : [];
    const contohKonkret = asCleanStringList(rawBB.contohKonkret);
    const rawCp = rawBB.contohPenyelesaian;
    const contohPenyelesaian =
      rawCp && typeof rawCp === 'object'
        ? {
            judulContoh: asCleanString(rawCp.judulContoh),
            konteks: asCleanString(rawCp.konteks),
            langkahPenyelesaian: asCleanStringList(rawCp.langkahPenyelesaian),
            kesimpulanHasil: asCleanString(rawCp.kesimpulanHasil),
          }
        : undefined;
    const hubunganDenganTP = asCleanString(rawBB.hubunganDenganTP);
    const potensiMiskonsepsi = Array.isArray(rawBB.potensiMiskonsepsi)
      ? rawBB.potensiMiskonsepsi
          .filter((m: any) => m && typeof m === 'object')
          .map((m: any) => ({
            miskonsepsi: asCleanString(m.miskonsepsi),
            caraMeluruskan: asCleanString(m.caraMeluruskan),
          }))
          .filter((m: { miskonsepsi: string; caraMeluruskan: string }) => m.miskonsepsi && m.caraMeluruskan)
      : [];

    const konsepKunci =
      asCleanStringList(rawBB.konsepKunci).length > 0
        ? asCleanStringList(rawBB.konsepKunci)
        : subKonsep.map((s: { judul: string }) => s.judul);

    bahanBacaan = {
      ringkasanInti: asCleanString(rawBB.ringkasanInti) || konsepUtama,
      konsepKunci,
      referensiCatatan:
        asCleanString(rawBB.referensiCatatan) || fallback.bahanBacaan?.referensiCatatan,
      penjelasanKonsepUtama: konsepUtama,
      subKonsep,
      istilahPenting,
      contohKonkret,
      ...(contohPenyelesaian ? { contohPenyelesaian } : {}),
      hubunganDenganTP,
      potensiMiskonsepsi,
    };
  }

  // Kegiatan Pembelajaran terstruktur
  const validPengalaman: Set<PengalamanBelajarPM> = new Set([
    'Memahami',
    'Mengaplikasi',
    'Merefleksi',
  ]);
  const validPrinsip: Set<PrinsipPembelajaranPM> = new Set([
    'Berkesadaran',
    'Bermakna',
    'Menggembirakan',
  ]);
  const validFase: Set<FaseKegiatanLangkah> = new Set([
    'pendahuluan',
    'inti',
    'penutup',
  ]);

  let kegiatanPembelajaran: KegiatanPembelajaranLangkah[] = [];
  if (!Array.isArray(parsed?.kegiatanPembelajaran) || parsed.kegiatanPembelajaran.length === 0) {
    structuralErrors.push('AI tidak mengembalikan array kegiatanPembelajaran.');
  } else {
    kegiatanPembelajaran = parsed.kegiatanPembelajaran.map(
      (item: any, idx: number): KegiatanPembelajaranLangkah => {
        const fb = fallback.kegiatanPembelajaran[idx] || fallback.kegiatanPembelajaran[0];
        const targetAlokasi = fb.alokasiMenit;
        let tahapTerstruktur: TahapKegiatanTerstruktur[] = [];

        if (Array.isArray(item?.tahapTerstruktur) && item.tahapTerstruktur.length > 0) {
          const normalizedStages: TahapKegiatanTerstruktur[] = item.tahapTerstruktur.map(
            (st: any, sIdx: number): TahapKegiatanTerstruktur => {
              const fase: FaseKegiatanLangkah = validFase.has(st?.fase)
                ? st.fase
                : sIdx === 0
                ? 'pendahuluan'
                : sIdx === item.tahapTerstruktur.length - 1
                ? 'penutup'
                : 'inti';
              const peng = validPengalaman.has(st?.pengalamanBelajar)
                ? (st.pengalamanBelajar as PengalamanBelajarPM)
                : undefined;
              const prinsRaw = Array.isArray(st?.prinsipPembelajaran)
                ? (st.prinsipPembelajaran.filter((p: any) =>
                    validPrinsip.has(p)
                  ) as PrinsipPembelajaranPM[])
                : undefined;

              return {
                id: `p${idx + 1}_ai_s${sIdx + 1}`,
                urutan: sIdx + 1,
                fase,
                namaTahap: asCleanString(st?.namaTahap),
                tujuanTahap: asCleanString(st?.tujuanTahap),
                aktivitasGuru: asCleanString(st?.aktivitasGuru),
                aktivitasSiswa: asCleanString(st?.aktivitasSiswa),
                instruksiPertanyaan: asCleanString(st?.instruksiPertanyaan),
                mediaBahan: asCleanString(st?.mediaBahan),
                durasiMenit:
                  typeof st?.durasiMenit === 'number' && st.durasiMenit > 0
                    ? Math.round(st.durasiMenit)
                    : 10,
                buktiBelajar: asCleanString(st?.buktiBelajar),
                ...(peng ? { pengalamanBelajar: peng } : {}),
                ...(prinsRaw && prinsRaw.length > 0 ? { prinsipPembelajaran: prinsRaw } : {}),
              };
            }
          );
          tahapTerstruktur = reconcileSessionStageDurations(normalizedStages, targetAlokasi);
        } else {
          structuralErrors.push(
            `Pertemuan ${idx + 1} pada respons AI tidak menyertakan tahapTerstruktur yang valid.`
          );
        }

        const synced =
          tahapTerstruktur.length > 0
            ? syncLegacyArraysFromStructuredStages(tahapTerstruktur)
            : {
                pendahuluan: asCleanStringList(item?.pendahuluan),
                inti: asCleanStringList(item?.inti),
                penutup: asCleanStringList(item?.penutup),
              };

        return {
          pertemuan: typeof item?.pertemuan === 'number' ? item.pertemuan : idx + 1,
          alokasiMenit: targetAlokasi,
          jpPertemuan: fb.jpPertemuan,
          fokusPertemuan: fb.fokusPertemuan,
          pendahuluan:
            asCleanStringList(item?.pendahuluan).length > 0
              ? asCleanStringList(item?.pendahuluan)
              : synced.pendahuluan,
          inti:
            asCleanStringList(item?.inti).length > 0 ? asCleanStringList(item?.inti) : synced.inti,
          penutup:
            asCleanStringList(item?.penutup).length > 0
              ? asCleanStringList(item?.penutup)
              : synced.penutup,
          tahapTerstruktur,
        };
      }
    );

    if (
      kegiatanPembelajaran.length > 0 &&
      kegiatanPembelajaran.length < fallback.kegiatanPembelajaran.length
    ) {
      const baseCount = kegiatanPembelajaran.length;
      for (let idx = baseCount; idx < fallback.kegiatanPembelajaran.length; idx++) {
        const templateKeg = kegiatanPembelajaran[idx % baseCount];
        const fb = fallback.kegiatanPembelajaran[idx] || fallback.kegiatanPembelajaran[0];
        const targetAlokasi = fb.alokasiMenit;
        const clonedStages = reconcileSessionStageDurations(
          (templateKeg.tahapTerstruktur || []).map((st, sIdx) => ({
            ...st,
            id: `p${idx + 1}_ai_s${sIdx + 1}`,
            urutan: sIdx + 1,
          })),
          targetAlokasi
        );
        const synced = syncLegacyArraysFromStructuredStages(clonedStages);
        kegiatanPembelajaran.push({
          ...templateKeg,
          pertemuan: idx + 1,
          alokasiMenit: targetAlokasi,
          jpPertemuan: fb.jpPertemuan,
          fokusPertemuan: fb.fokusPertemuan,
          pendahuluan: synced.pendahuluan,
          inti: synced.inti,
          penutup: synced.penutup,
          tahapTerstruktur: clonedStages,
        });
      }
    }
  }

  // Asesmen Konkret Detail
  let asesmenDetail: ModulAsesmenDetail | undefined;
  const rawAD = parsed?.asesmenDetail;
  if (rawAD && typeof rawAD === 'object') {
    const rawDiag = rawAD.diagnostik || {};
    const rawForm = rawAD.formatif || {};
    const rawAkhir = rawAD.akhir || {};
    asesmenDetail = {
      diagnostik: {
        tujuanPemeriksaanPrasyarat: asCleanString(rawDiag.tujuanPemeriksaanPrasyarat),
        pertanyaanAtauTugasAwal: asCleanStringList(rawDiag.pertanyaanAtauTugasAwal),
        indikatorInterpretasi: asCleanString(rawDiag.indikatorInterpretasi),
      },
      formatif: {
        instruksiAktivitas: asCleanString(rawForm.instruksiAktivitas),
        pertanyaanAtauTugas: asCleanStringList(rawForm.pertanyaanAtauTugas),
        buktiYangDiamati: asCleanStringList(rawForm.buktiYangDiamati),
        umpanBalikGuru: asCleanString(rawForm.umpanBalikGuru),
      },
      akhir: {
        bentukUtama: asCleanString(rawAkhir.bentukUtama),
        butirTugas: Array.isArray(rawAkhir.butirTugas)
          ? rawAkhir.butirTugas
              .filter((b: any) => b && typeof b === 'object')
              .map((b: any, idx: number) => ({
                nomor: typeof b.nomor === 'number' ? b.nomor : idx + 1,
                bentuk: asCleanString(b.bentuk) || 'Uraian/Unjuk Kerja',
                pertanyaanAtauTugas: asCleanString(b.pertanyaanAtauTugas),
                kunciAtauContohRespons: asCleanString(b.kunciAtauContohRespons),
              }))
          : [],
        pedomanPenilaian: asCleanString(rawAkhir.pedomanPenilaian),
        kktpReferensi: kktpRef,
      },
    };
  } else {
    structuralErrors.push('Objek asesmenDetail (diagnostik, formatif, akhir) tidak dikembalikan AI.');
  }

  const asesmen = asesmenDetail
    ? summarizeAsesmenDetailToLegacy(asesmenDetail)
    : {
        diagnostik: asCleanString(parsed?.asesmen?.diagnostik),
        formatif: asCleanString(parsed?.asesmen?.formatif),
        sumatif: asCleanString(parsed?.asesmen?.sumatif),
      };

  const rubrikPenilaianSingkat = Array.isArray(parsed?.rubrikPenilaianSingkat)
    ? parsed.rubrikPenilaianSingkat
        .filter((r: any) => r && typeof r === 'object')
        .map((r: any) => ({
          kriteria: asCleanString(r.kriteria),
          baruBerkembang: asCleanString(r.baruBerkembang),
          layak: asCleanString(r.layak),
          cakap: asCleanString(r.cakap),
          mahir: asCleanString(r.mahir),
        }))
    : [];

  // Diferensiasi Operasional 3 jalur
  let diferensiasiOperasional: ModulDiferensiasiOperasional | undefined;
  const rawDiff = parsed?.diferensiasiOperasional;
  const mapTier = (t: any): ModulJalurDiferensiasi => ({
    targetKesiapan: asCleanString(t?.targetKesiapan),
    dukunganScaffolding: asCleanString(t?.dukunganScaffolding),
    aktivitasKonkret: asCleanStringList(t?.aktivitasKonkret),
    mediaPendukung: asCleanString(t?.mediaPendukung),
    buktiBelajarJalur: asCleanString(t?.buktiBelajarJalur),
  });
  if (rawDiff && typeof rawDiff === 'object') {
    diferensiasiOperasional = {
      prinsipKesetaraanTP:
        asCleanString(rawDiff.prinsipKesetaraanTP) ||
        `Seluruh jalur kesiapan menargetkan TP ${tp.kode}: ${tp.tujuanPembelajaran}.`,
      kesiapanDasar: mapTier(rawDiff.kesiapanDasar),
      kesiapanBerkembang: mapTier(rawDiff.kesiapanBerkembang),
      kesiapanMahir: mapTier(rawDiff.kesiapanMahir),
    };
  } else {
    structuralErrors.push('Objek diferensiasiOperasional (3 jalur kesiapan) tidak dikembalikan AI.');
  }

  // Contoh LKPD Terintegrasi
  let contohLKPD: ModulContohLKPD | undefined;
  const rawLKPD = parsed?.contohLKPD;
  if (rawLKPD && typeof rawLKPD === 'object') {
    const rawPreset = asCleanString(rawLKPD.presetType);
    const presetType = (['kasus', 'eksperimen', 'diferensiasi', 'proyek'].includes(rawPreset)
      ? rawPreset
      : fallback.contohLKPD?.presetType || 'kasus') as ModulContohLKPD['presetType'];
    contohLKPD = {
      presetType,
      judul: asCleanString(rawLKPD.judul),
      konteksTugas: asCleanString(rawLKPD.konteksTugas),
      tujuanPengerjaan: asCleanString(rawLKPD.tujuanPengerjaan),
      petunjukSiswa: asCleanStringList(rawLKPD.petunjukSiswa),
      bahanAtauData: asCleanStringList(rawLKPD.bahanAtauData),
      langkahPengerjaan: asCleanStringList(rawLKPD.langkahPengerjaan),
      pertanyaanAtauRuangKerja: asCleanStringList(rawLKPD.pertanyaanAtauRuangKerja),
      hasilYangDiharapkan: asCleanString(rawLKPD.hasilYangDiharapkan),
      kriteriaPenilaian: asCleanStringList(rawLKPD.kriteriaPenilaian),
      sumberLKPD: 'ai_generated',
    };
  } else {
    structuralErrors.push('Objek contohLKPD terintegrasi tidak dikembalikan AI.');
  }

  const pengayaanDanRemedial = {
    pengayaan:
      asCleanString(parsed?.pengayaanDanRemedial?.pengayaan) ||
      diferensiasiOperasional?.kesiapanMahir.aktivitasKonkret[0] ||
      '',
    remedial:
      asCleanString(parsed?.pengayaanDanRemedial?.remedial) ||
      diferensiasiOperasional?.kesiapanDasar.dukunganScaffolding ||
      '',
  };

  const refleksiGuru =
    asCleanStringList(parsed?.refleksiGuru).length > 0
      ? asCleanStringList(parsed?.refleksiGuru)
      : fallback.refleksiGuru;
  const refleksiSiswa =
    asCleanStringList(parsed?.refleksiSiswa).length > 0
      ? asCleanStringList(parsed?.refleksiSiswa)
      : fallback.refleksiSiswa;

  const glosarium = Array.isArray(parsed?.glosarium) && parsed.glosarium.length > 0
    ? parsed.glosarium
        .filter((g: any) => g && typeof g.istilah === 'string' && g.istilah.trim())
        .map((g: any) => ({ istilah: String(g.istilah).trim(), definisi: String(g.definisi || '').trim() }))
    : bahanBacaan?.istilahPenting?.map((it) => ({ istilah: it.istilah, definisi: it.pengertian })) || [];

  const teacherFormattedRefs = (fallback.referensiSumber || []).map(formatReferensiSumberCitation);
  const rawAiDaftarPustaka = asCleanStringList(parsed?.daftarPustaka).filter(
    (entry) => !/^\s*\[Lengkapi referensi satuan pendidikan\]/i.test(entry)
  );
  const daftarPustaka =
    teacherFormattedRefs.length > 0
      ? Array.from(new Set([...teacherFormattedRefs, ...rawAiDaftarPustaka]))
      : rawAiDaftarPustaka.length > 0
      ? rawAiDaftarPustaka
      : fallback.daftarPustaka;

  const doc: ModulAjarDokumen = {
    ...fallback,
    tpId: fallback.tpId,
    schoolId: fallback.schoolId,
    tpSourceHash: fallback.tpSourceHash,
    needsReview: false,
    targetSubTP: fallback.targetSubTP,
    prasyaratMateri: fallback.prasyaratMateri,
    buktiKetercapaian: fallback.buktiKetercapaian,
    modelType: modelDef.id,
    sintaksModelId: modelDef.id,
    ...(timeOptionsUsedFromFallback(fallback)),
    draftSource: 'ai_generated',
    judul,
    modelPembelajaran,
    jumlahPertemuan: kegiatanPembelajaran.length || fallback.jumlahPertemuan,
    alokasiWaktuDetail: fallback.alokasiWaktuDetail
      ? {
          ...fallback.alokasiWaktuDetail,
          jumlahPertemuan: kegiatanPembelajaran.length || fallback.jumlahPertemuan,
        }
      : undefined,
    pemahamanBermakna,
    pertanyaanPemantik,
    kompetensiAwal,
    profilPelajarPancasila,
    saranaPrasarana,
    targetPesertaDidik,
    bahanBacaan,
    kegiatanPembelajaran,
    asesmen,
    asesmenDetail,
    rubrikPenilaianSingkat,
    diferensiasiOperasional,
    contohLKPD,
    pengayaanDanRemedial,
    refleksiGuru,
    refleksiSiswa,
    glosarium,
    daftarPustaka,
    // Selalu pertahankan metadata sumber dari input guru/kurasi — jangan pernah menerima referensiSumber buatan AI
    ...(fallback.referensiSumber ? { referensiSumber: fallback.referensiSumber } : {}),
  };

  return { doc, structuralErrors, maxTokensCut };
}

function timeOptionsUsedFromFallback(
  fallback: ModulAjarDokumen
): Partial<Pick<ModulAjarDokumen, 'variasiTeknikModel'>> {
  return fallback.variasiTeknikModel ? { variasiTeknikModel: fallback.variasiTeknikModel } : {};
}

function buildModulAjarRepairPrompt(
  originalPrompt: string,
  previousDraft: unknown,
  blockingErrors: string[]
): string {
  const errorList = blockingErrors.map((e, i) => `${i + 1}. ${e}`).join('\n');
  const serialized = JSON.stringify(previousDraft ?? {}).slice(0, 5500);
  return `${originalPrompt}

PERBAIKAN WAJIB DARI VALIDATOR KUALITAS MODUL AJAR (MAKSIMAL 1 KALI REPAIR):
Draf JSON sebelumnya DITOLAK karena temuan berikut:
${errorList}

CUPLIKAN DRAF SEBELUMNYA YANG HARUS DIPERBAIKI:
${serialized}

Susun ulang 1 objek JSON Modul Ajar yang LENGKAP, memperbaiki SEMUA kendala di atas secara konkret & operasional, menjaga sintaks model terpilih dan total durasi menit, serta tanpa referensi SIBI/ISBN fiktif.`;
}

function buildHonestTemplateFallback(
  fallback: ModulAjarDokumen,
  extraReasons: string[] = [],
  repairAttempted = false
): ModulAjarDokumen {
  const baseWarnings = fallback.catatanValidasi?.semanticReviewWarnings || [];
  return {
    ...fallback,
    draftSource: 'template',
    catatanValidasi: {
      status: 'template_awal',
      usedFallback: true,
      repairAttempted,
      structuralIssues: [],
      relevanceAndAntiSlopIssues: [],
      semanticReviewWarnings: Array.from(
        new Set([
          ...baseWarnings,
          ...extraReasons,
        ])
      ),
    },
  };
}

/**
 * Layanan Pembuatan Modul Ajar (RPP Plus) Operasional Berbasis AI Gemini
 * dengan validator kualitas, maksimal 1 kali repair terpandu, integritas kuota atomik
 * (tidak memotong 2x dan refund saat gagal/ditolak), serta fallback Template/Draf Awal yang jujur.
 */
export async function generateContextualModulAjarWithAI(
  tp: CustomTPItem,
  profile: SchoolProfile,
  model: ModulAjarModelType = 'pbl',
  konteksLokal?: string,
  timeOptions?: ModulAjarGenerationTimeOptions
): Promise<ContextualModulAjarResult> {
  const modelDef = getModulAjarModelDefinition(model);
  const fallback = buildSmartModulAjar(tp, profile, {
    model: modelDef.id,
    jpPerPertemuan: timeOptions?.jpPerPertemuan,
    menitPerJP: timeOptions?.menitPerJP,
    jumlahPertemuan: timeOptions?.jumlahPertemuan,
    smkTrackOverride: timeOptions?.smkTrackOverride,
    variasiTeknikModel: timeOptions?.variasiTeknikModel,
    konteksLokal,
    referensiSumber: timeOptions?.referensiSumber,
  });

  try {
    const meteredResult = await executeMeteredAICall(async () => {
      const prompt = buildModulAjarGeminiPrompt(
        tp,
        profile,
        modelDef.id,
        konteksLokal,
        timeOptions
      );
      const parsed = await callGeminiStructuredJSON({
        prompt,
        systemInstruction: MODUL_AJAR_SYSTEM_INSTRUCTION,
        maxOutputTokens: 8192,
        temperature: 0.4,
      });

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Respon Gemini tidak menghasilkan format dokumen JSON yang valid.');
      }

      const firstPass = normalizeAIResponseStrict(
        parsed,
        tp,
        profile,
        modelDef.id,
        konteksLokal,
        fallback
      );
      const firstValidation = validateModulAjarDokumen(firstPass.doc, tp, profile, {
        sourceMode: 'ai',
        expectedModel: modelDef.id,
        maxTokensCut: firstPass.maxTokensCut,
      });
      const firstIssues = Array.from(
        new Set([
          ...firstPass.structuralErrors,
          ...firstValidation.structuralIssues,
          ...firstValidation.relevanceAndAntiSlopIssues,
        ])
      );

      if (firstIssues.length === 0) {
        return {
          modul: {
            ...firstPass.doc,
            catatanValidasi: firstValidation,
          },
          repairAttempted: false,
          validation: firstValidation,
        };
      }

      // Maksimal 1 kali repair loop (masih dalam satu eksekusi kuota yang sama — tidak memotong 2x)
      const repairPrompt = buildModulAjarRepairPrompt(prompt, parsed, firstIssues);
      const repairedRaw = await callGeminiStructuredJSON({
        prompt: repairPrompt,
        systemInstruction: MODUL_AJAR_SYSTEM_INSTRUCTION,
        maxOutputTokens: 8192,
        temperature: 0.2,
      });

      if (!repairedRaw || typeof repairedRaw !== 'object') {
        throw new ModulAIValidationRejectionError(firstIssues, true);
      }

      const secondPass = normalizeAIResponseStrict(
        repairedRaw,
        tp,
        profile,
        modelDef.id,
        konteksLokal,
        fallback
      );
      const secondValidation = validateModulAjarDokumen(secondPass.doc, tp, profile, {
        sourceMode: 'ai',
        expectedModel: modelDef.id,
        maxTokensCut: secondPass.maxTokensCut,
      });
      const secondIssues = Array.from(
        new Set([
          ...secondPass.structuralErrors,
          ...secondValidation.structuralIssues,
          ...secondValidation.relevanceAndAntiSlopIssues,
        ])
      );

      if (secondIssues.length === 0) {
        return {
          modul: {
            ...secondPass.doc,
            catatanValidasi: {
              ...secondValidation,
              repairAttempted: true,
            },
          },
          repairAttempted: true,
          validation: {
            ...secondValidation,
            repairAttempted: true,
          },
        };
      }

      // Tetap gagal setelah 1x repair -> tolak secara jujur agar executeMeteredAICall me-refund kuota
      throw new ModulAIValidationRejectionError(secondIssues, true);
    });

    return {
      modul: meteredResult.modul,
      usedFallback: false,
      aiFailed: false,
      repairAttempted: meteredResult.repairAttempted,
      validation: meteredResult.validation,
    };
  } catch (err: unknown) {
    const isQuotaErr =
      err instanceof Error && /kuota|lisensi|masa berlaku/i.test(err.message);
    const isValidationRejection = err instanceof ModulAIValidationRejectionError;
    const errorMsg =
      err instanceof Error
        ? err.message
        : 'Gagal menghubungi server AI Gemini. Draf template awal tersedia sebagai alternatif.';

    const markedFallback = buildHonestTemplateFallback(
      fallback,
      isValidationRejection
        ? [
            `Respons AI ditolak validator setelah 1x perbaikan (${err.issues[0] || 'belum memenuhi syarat'}). Kuota AI dikembalikan dan draf Template / Draf Awal disiapkan terpisah.`,
          ]
        : [],
      isValidationRejection ? err.repairAttempted : false
    );

    return {
      modul: markedFallback,
      usedFallback: true,
      aiFailed: true,
      repairAttempted: isValidationRejection ? err.repairAttempted : false,
      quotaError: isQuotaErr,
      validationErrors: isValidationRejection ? err.issues : undefined,
      validation: markedFallback.catatanValidasi,
      errorMsg,
    };
  }
}
