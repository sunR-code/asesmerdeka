import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { jenjangToDefaultFase } from './schoolProfileStorage';
import type {
  CooperativeTechniqueVariant,
  FaseKegiatanLangkah,
  KegiatanPembelajaranLangkah,
  ModulAjarDokumen,
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
import { buildSmartModulAjar } from './perangkatAjarEngine';
import { callGeminiStructuredJSON } from '../services/geminiClient';
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
}

export interface ContextualModulAjarResult {
  modul: ModulAjarDokumen;
  usedFallback: boolean;
  errorMsg?: string;
}

/**
 * Membangun prompt Gemini AI yang kaya pedagogis untuk menyusun Modul Ajar (RPP Plus)
 * Kurikulum Merdeka berbasis 7 model pedagogik terstruktur dengan konteks jenjang & alokasi waktu akurat.
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
  const subTPText =
    tp.subTP && tp.subTP.length > 0
      ? tp.subTP.map((s) => `  - ${s.kode}: ${s.kompetensi} (${s.buktiKetercapaian})`).join('\n')
      : `  - ${tp.kode}: ${tp.tujuanPembelajaran}`;
  const prasyaratText =
    tp.prasyarat && tp.prasyarat.length > 0 ? tp.prasyarat.join('; ') : 'Pemahaman pengantar elemen ' + tp.elemen;
  const buktiText =
    tp.buktiKetercapaian && tp.buktiKetercapaian.length > 0
      ? tp.buktiKetercapaian.join('; ')
      : tp.kompetensiInti || tp.tujuanPembelajaran;
  const konteks =
    konteksLokal && konteksLokal.trim().length > 0
      ? konteksLokal.trim()
      : `Penerapan nyata materi ${tp.materiPokok} sesuai jenjang ${profile.jenjang || 'SMP/MTs'}`;
  const gradeConstraint =
    timePreset.jenjangKategori === 'SD/MI'
      ? 'PENTING KHUSUS SD/MI: Gunakan bahasa ramah anak usia SD dan konteks lingkungan rumah/kelas/sekolah. DILARANG memakai istilah "dunia kerja", "industri", atau jargon perkuliahan.'
      : timePreset.jenjangKategori === 'SMK' && timePreset.smkTrack === 'kejuruan'
      ? 'PENTING KHUSUS SMK KEJURUAN: Sertakan prosedur praktik terukur, persiapan alat/bahan, dan aspek keselamatan kerja (K3) yang relevan.'
      : 'Sesuaikan kedalaman abstraksi dan contoh dengan tingkat perkembangan jenjang kelas.';

  const contohPertemuanJson = Array.from({ length: jumlahPertemuan }, (_, idx) => ({
    pertemuan: idx + 1,
    alokasiMenit: menitPerPertemuan,
    pendahuluan: ['...'],
    inti: ['...'],
    penutup: ['...'],
    tahapTerstruktur: [
      {
        fase: 'pendahuluan',
        namaTahap: 'Pendahuluan & Kesiapan Belajar',
        tujuanTahap: '...',
        aktivitasGuru: '...',
        aktivitasSiswa: '...',
        instruksiPertanyaan: '...',
        mediaBahan: '...',
        durasiMenit: Math.min(20, Math.max(5, Math.round(menitPerPertemuan * 0.12))),
        buktiBelajar: '...',
        pengalamanBelajar: 'Memahami',
        prinsipPembelajaran: ['Berkesadaran'],
      },
    ],
  }));

  return `
Anda adalah Guru Penggerak Teladan Nasional, Pakar Kurikulum Merdeka, dan Perancang Modul Ajar Terbaik di Indonesia.
Tugas Anda: Susun dokumen Modul Ajar (RPP Plus Kurikulum Merdeka) yang MENDALAM, SANGAT OPERASIONAL, BERMUTU TINGGI, dan MENGANGKAT KONTEKS LOKAL.

IDENTITAS & PROFIL PEMBELAJARAN:
- Satuan Pendidikan: ${profile.namaSekolah || 'Sekolah Penggerak Merdeka'} (${profile.kotaSekolah || 'Nusantara'})
- Jenjang & Kelas: ${profile.jenjang || 'SMP'} / Fase ${jenjangFase} - Kelas ${profile.kelasUtama || '8'} (${profile.rombelAktif || 'Rombel Utama'})
- Mata Pelajaran: ${profile.mataPelajaranUtama || 'Mata Pelajaran Utama'}
- Topik / Materi Pokok: ${tp.materiPokok}
- Kode & Elemen TP: ${tp.kode} (${tp.elemen})
- Capaian / Tujuan Pembelajaran (TP): ${tp.tujuanPembelajaran}
- Arahan Konten/Materi TP: ${tp.arahanRangkuman}
- Prasyarat Awal Siswa: ${prasyaratText}
- Bukti Ketercapaian (KKTP): ${buktiText}
- Rincian Sub-TP:
${subTPText}
- Alokasi Waktu TP: ${totalAlokasiJPTP} JP (${jumlahPertemuan} Pertemuan x ${jpPertemuanAktif} JP = ${menitPerPertemuan} Menit/pertemuan, standar ${menitPerJP} menit/JP)
- Model Pembelajaran Kurikulum Merdeka yang Diterapkan: ${modelDef.label}${teknikNote}
- Deskripsi Pendekatan Model: ${modelDef.deskripsi}
- SINTAKS PEDAGOGIS WAJIB:
${modelDef.tahapanSintaks.map((s) => `  ${s.urutan}. ${s.namaTahap} — ${s.tujuanTahap}`).join('\n')}
- TEMA / TOPIK KONTEKS LOKAL NYATA: "${konteks}"
- ${gradeConstraint}

PANDUAN KOMPONEN INTI KURIKULUM MERDEKA:
1. "pemahamanBermakna": Rumuskan 1-2 kalimat pemahaman mendalam dan aplikatif mengenai esensi materi "${tp.materiPokok}" dalam konteks "${konteks}".
2. "pertanyaanPemantik": Susun minimal 3 butir pertanyaan pemantik berpikir kritis yang memancing eksplorasi terhadap "${tp.materiPokok}".
3. "profilPelajarPancasila": Pilih 3-4 dimensi profil lulusan yang paling relevan dengan rincian sikap aplikatif.
4. "saranaPrasarana": Tuliskan alat, media peraga, bahan ajar, dan sumber belajar kontekstual yang digunakan.
5. "bahanBacaan": Susun ringkasan materi ajar guru & siswa serta minimal 3 poin konsep kunci spesifik topik "${tp.materiPokok}".
6. "kegiatanPembelajaran": Susun tepat ${jumlahPertemuan} pertemuan. Setiap pertemuan wajib berdurasi tepat ${menitPerPertemuan} menit (${jpPertemuanAktif} JP x ${menitPerJP} menit).
   - Isi "tahapTerstruktur" untuk setiap pertemuan mencakup fase "pendahuluan", seluruh tahapan sintaks "${modelDef.label}" pada fase "inti", dan fase "penutup".
   - Total "durasiMenit" seluruh tahap pada satu pertemuan HARUS tepat ${menitPerPertemuan} menit.
   - Setiap tahap wajib berisi instruksi guru konkret, aktivitas siswa konkret, pertanyaan kunci, media, durasiMenit, dan buktiBelajar (tanpa deskripsi umum seperti "guru menjelaskan" atau "siswa berdiskusi").
7. "asesmen": Deskripsikan instrumen diagnostik awal, asesmen formatif proses, dan asesmen sumatif akhir secara operasional.
8. "rubrikPenilaianSingkat": Sediakan rubrik penilaian singkat dengan kriteria dan 4 level capaian (baruBerkembang, layak, cakap, mahir).
9. "pengayaanDanRemedial": Rancang strategi pengayaan analitis dan bimbingan remedial terarah.
10. "glosarium": Minimal 3 istilah kunci konsep materi (bukan istilah administrasi CP/TP) beserta definisinya.
11. "daftarPustaka": Cantumkan kerangka referensi jujur TANPA MENGARANG nama penulis, tahun terbit, nomor ISBN, atau halaman buku fiktif. Gunakan format panduan agar guru melengkapi edisi buku teks resmi sekolah.

PETUNJUK OUTPUT JSON MURNI:
Kembalikan HANYA format JSON valid tanpa tanda markdown pembuka/penutup (\`\`\`json) dan tanpa kalimat pengantar:
{
  "judul": "Modul Ajar: ${tp.materiPokok} - ${modelDef.label}",
  "pemahamanBermakna": "...",
  "pertanyaanPemantik": [
    "Pertanyaan pemantik 1",
    "Pertanyaan pemantik 2",
    "Pertanyaan pemantik 3"
  ],
  "kompetensiAwal": ["..."],
  "profilPelajarPancasila": ["..."],
  "saranaPrasarana": ["..."],
  "targetPesertaDidik": "...",
  "modelPembelajaran": "${modelDef.label}${teknikNote}",
  "bahanBacaan": {
    "ringkasanInti": "...",
    "konsepKunci": ["...", "...", "..."],
    "referensiCatatan": "Lengkapi/sesuaikan sumber bacaan dengan buku teks utama satuan pendidikan."
  },
  "kegiatanPembelajaran": ${JSON.stringify(contohPertemuanJson, null, 2)},
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
  const modelDef = getModulAjarModelDefinition(model);

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

  let kegiatanPembelajaran: KegiatanPembelajaranLangkah[] = fallback.kegiatanPembelajaran;
  if (Array.isArray(parsed?.kegiatanPembelajaran) && parsed.kegiatanPembelajaran.length > 0) {
    kegiatanPembelajaran = parsed.kegiatanPembelajaran.map(
      (item: any, idx: number): KegiatanPembelajaranLangkah => {
        const fb = fallback.kegiatanPembelajaran[idx] || fallback.kegiatanPembelajaran[0];
        const targetAlokasi = fb.alokasiMenit;
        let tahapTerstruktur: TahapKegiatanTerstruktur[] | undefined = fb.tahapTerstruktur;

        if (Array.isArray(item?.tahapTerstruktur) && item.tahapTerstruktur.length >= 3) {
          const normalizedStages: TahapKegiatanTerstruktur[] = item.tahapTerstruktur.map(
            (st: any, sIdx: number): TahapKegiatanTerstruktur => {
              const fbSt = fb.tahapTerstruktur?.[sIdx] || fb.tahapTerstruktur?.[0];
              const fase: FaseKegiatanLangkah = validFase.has(st?.fase)
                ? st.fase
                : sIdx === 0
                ? 'pendahuluan'
                : sIdx === item.tahapTerstruktur.length - 1
                ? 'penutup'
                : 'inti';
              const peng = validPengalaman.has(st?.pengalamanBelajar)
                ? (st.pengalamanBelajar as PengalamanBelajarPM)
                : fbSt?.pengalamanBelajar;
              const prinsRaw = Array.isArray(st?.prinsipPembelajaran)
                ? (st.prinsipPembelajaran.filter((p: any) =>
                    validPrinsip.has(p)
                  ) as PrinsipPembelajaranPM[])
                : undefined;
              const prinsip =
                prinsRaw && prinsRaw.length > 0 ? prinsRaw : fbSt?.prinsipPembelajaran;

              return {
                id: `p${idx + 1}_ai_s${sIdx + 1}`,
                urutan: sIdx + 1,
                fase,
                namaTahap:
                  typeof st?.namaTahap === 'string' && st.namaTahap.trim()
                    ? st.namaTahap.trim()
                    : fbSt?.namaTahap || `Tahap ${sIdx + 1}`,
                tujuanTahap:
                  typeof st?.tujuanTahap === 'string' && st.tujuanTahap.trim()
                    ? st.tujuanTahap.trim()
                    : fbSt?.tujuanTahap || '-',
                aktivitasGuru:
                  typeof st?.aktivitasGuru === 'string' && st.aktivitasGuru.trim()
                    ? st.aktivitasGuru.trim()
                    : fbSt?.aktivitasGuru || '-',
                aktivitasSiswa:
                  typeof st?.aktivitasSiswa === 'string' && st.aktivitasSiswa.trim()
                    ? st.aktivitasSiswa.trim()
                    : fbSt?.aktivitasSiswa || '-',
                instruksiPertanyaan:
                  typeof st?.instruksiPertanyaan === 'string' && st.instruksiPertanyaan.trim()
                    ? st.instruksiPertanyaan.trim()
                    : fbSt?.instruksiPertanyaan || '-',
                mediaBahan:
                  typeof st?.mediaBahan === 'string' && st.mediaBahan.trim()
                    ? st.mediaBahan.trim()
                    : fbSt?.mediaBahan || '-',
                durasiMenit:
                  typeof st?.durasiMenit === 'number' && st.durasiMenit > 0
                    ? Math.round(st.durasiMenit)
                    : fbSt?.durasiMenit || 10,
                buktiBelajar:
                  typeof st?.buktiBelajar === 'string' && st.buktiBelajar.trim()
                    ? st.buktiBelajar.trim()
                    : fbSt?.buktiBelajar || '-',
                ...(peng ? { pengalamanBelajar: peng } : {}),
                ...(prinsip && prinsip.length > 0 ? { prinsipPembelajaran: prinsip } : {}),
              };
            }
          );
          tahapTerstruktur = reconcileSessionStageDurations(normalizedStages, targetAlokasi);
        }

        const legacyFromStructured = tahapTerstruktur
          ? syncLegacyArraysFromStructuredStages(tahapTerstruktur)
          : null;

        return {
          pertemuan: typeof item?.pertemuan === 'number' ? item.pertemuan : idx + 1,
          alokasiMenit: targetAlokasi,
          jpPertemuan: fb.jpPertemuan,
          fokusPertemuan: fb.fokusPertemuan,
          pendahuluan:
            Array.isArray(item?.pendahuluan) && item.pendahuluan.length > 0
              ? item.pendahuluan.map(String)
              : legacyFromStructured?.pendahuluan || fb.pendahuluan,
          inti:
            Array.isArray(item?.inti) && item.inti.length > 0
              ? item.inti.map(String)
              : legacyFromStructured?.inti || fb.inti,
          penutup:
            Array.isArray(item?.penutup) && item.penutup.length > 0
              ? item.penutup.map(String)
              : legacyFromStructured?.penutup || fb.penutup,
          tahapTerstruktur,
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

  const bahanBacaan =
    parsed?.bahanBacaan && typeof parsed.bahanBacaan === 'object'
      ? {
          ringkasanInti:
            typeof parsed.bahanBacaan.ringkasanInti === 'string' &&
            parsed.bahanBacaan.ringkasanInti.trim().length > 0
              ? parsed.bahanBacaan.ringkasanInti.trim()
              : fallback.bahanBacaan?.ringkasanInti || tp.arahanRangkuman,
          konsepKunci:
            Array.isArray(parsed.bahanBacaan.konsepKunci) &&
            parsed.bahanBacaan.konsepKunci.length > 0
              ? parsed.bahanBacaan.konsepKunci.map(String)
              : fallback.bahanBacaan?.konsepKunci || [tp.materiPokok],
          referensiCatatan:
            typeof parsed.bahanBacaan.referensiCatatan === 'string' &&
            parsed.bahanBacaan.referensiCatatan.trim().length > 0
              ? parsed.bahanBacaan.referensiCatatan.trim()
              : fallback.bahanBacaan?.referensiCatatan,
        }
      : fallback.bahanBacaan;

  return {
    ...fallback,
    tpId: fallback.tpId,
    schoolId: fallback.schoolId,
    tpSourceHash: fallback.tpSourceHash,
    needsReview: false,
    targetSubTP: fallback.targetSubTP,
    prasyaratMateri: fallback.prasyaratMateri,
    buktiKetercapaian: fallback.buktiKetercapaian,
    modelType: model,
    sintaksModelId: modelDef.id,
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
  });

  try {
    const prompt = buildModulAjarGeminiPrompt(
      tp,
      profile,
      modelDef.id,
      konteksLokal,
      timeOptions
    );
    const parsed = await callGeminiStructuredJSON({
      prompt,
      temperature: 0.45,
    });

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Respon Gemini tidak menghasilkan format dokumen JSON yang valid.');
    }

    // Deduksi kuota jika pengguna berlisensi aktif
    deductQuota();

    const modul = normalizeAIResponseToModulAjar(
      parsed,
      tp,
      profile,
      modelDef.id,
      konteksLokal,
      fallback
    );
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
