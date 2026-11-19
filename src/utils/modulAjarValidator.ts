import type {
  ModulAjarDokumen,
  ModulAjarQualityValidation,
  ModulAjarValidationStatus,
  ModulReferensiSumberItem,
  TahapKegiatanTerstruktur,
} from '../types/perangkatAjar';
import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import { hasSuspiciousTruncation, isGenericSlopText } from './lkpdValidator';
import { isValidModulAjarModelType, type ModulAjarModelType } from './modulPedagogicalModels';
import { validateReferensiUrl } from './modulReferensiSumber';
import { classifySMKSubjectTrack, normalizeJenjangKategori, validateModulTimeBudget } from './modulTimeBudget';

const STOPWORDS = new Set([
  'yang', 'dan', 'atau', 'dari', 'dalam', 'pada', 'untuk', 'dengan', 'oleh',
  'adalah', 'secara', 'melalui', 'terhadap', 'serta', 'agar', 'karena', 'sebagai',
  'siswa', 'peserta', 'didik', 'guru', 'pembelajaran', 'tujuan', 'materi', 'kelas',
  'mampu', 'dapat', 'menjelaskan', 'memahami', 'menganalisis', 'mengidentifikasi',
  'menerapkan', 'mengevaluasi', 'menyelesaikan', 'konsep', 'masalah', 'soal',
]);

const BARE_ACTIVITY_PHRASES: { pattern: RegExp; label: string }[] = [
  { pattern: /\bguru\s+menjelaskan\s+materi\b/i, label: '"Guru menjelaskan materi"' },
  { pattern: /\bguru\s+menerangkan\s+materi\b/i, label: '"Guru menerangkan materi"' },
  { pattern: /\bguru\s+memberikan\s+tugas\b/i, label: '"Guru memberikan tugas"' },
  { pattern: /\bguru\s+membimbing\s+siswa\b/i, label: '"Guru membimbing siswa"' },
  { pattern: /\bsiswa\s+berdiskusi\b/i, label: '"Siswa berdiskusi"' },
  { pattern: /\bsiswa\s+melakukan\s+presentasi\b/i, label: '"Siswa melakukan presentasi"' },
  { pattern: /\bsiswa\s+mengerjakan\s+(?:tugas|soal)\b/i, label: '"Siswa mengerjakan tugas/soal"' },
  { pattern: /\bsiswa\s+menyimak\s+penjelasan\b/i, label: '"Siswa menyimak penjelasan"' },
];

const PLACEHOLDER_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(?:lorem\s+ipsum|todo:|tbd\b|placeholder|isi\s+teks\s+di\s+sini|lengkapi\s+di\s+sini)\b/i, label: 'Placeholder belum terisi' },
  { pattern: /\bundefined\b|\[object\s+object\]/i, label: 'Nilai undefined atau [object Object] terdeteksi' },
  { pattern: /^\.{3,}$|^-$/i, label: 'Teks hanya berupa titik/strip kosong' },
];

const CONCRETE_OBJECT_REGEX =
  /\b(tabel|gambar|foto|diagram|grafik|kartu|lkpd|rubrik|daftar\s+cek|ceklis|benda|alat|bahan|objek|kutipan|teks|wacana|dialog|artikel|data|angka|rumus|persamaan|variabel|prototipe|produk|karya|job\s+sheet|sop|k3|5r|es|air|termometer|exit\s+ticket|kuis|papan|skenario|kasus|contoh|pasangan|kelompok\s+ahli|pertanyaan|hipotesis|dugaan|rancangan|argumen)\b/i;

const OPERATIONAL_ACTION_REGEX =
  /\b(menampilkan|meminta|mengisi|mencatat|mengamati|membandingkan|mengukur|menguji|menandai|menyusun|menghitung|membuktikan|menunjukkan|membaca\s+teliti|menyunting|mendemonstrasikan|memeriksa|mengecek|merumuskan|mempresentasikan\s+alur|mengumpulkan\s+data|mengklasifikasikan|berdasarkan\s+bukti|mematuhi|menerapkan\s+langkah|dengan\s+menyebutkan|perbedaan|kondisi|sebelum\s+dan\s+sesudah|memandu|menuliskan|memilih|memilah)\b/i;

const GENERIC_NON_GROUNDED_FILLERS =
  /^(?:guru\s+menjelaskan\s+materi(?:\s+pelajaran)?(?:\s+kepada\s+siswa)?|siswa\s+berdiskusi(?:\s+dalam\s+kelompok)?(?:\s+(?:dan|lalu)\s+siswa\s+melakukan\s+presentasi)?|guru\s+memberikan\s+tugas(?:\s+(?:dan|lalu)\s+siswa\s+(?:mengerjakan(?:nya)?|melakukan\s+presentasi))?|siswa\s+melakukan\s+presentasi(?:\s+di\s+depan\s+kelas)?|siswa\s+menyimak\s+penjelasan\s+guru)[\s.!]*$/i;

function extractKeywords(sources: string[]): string[] {
  const out = new Set<string>();
  for (const s of sources) {
    const words = (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
    words.forEach((w) => out.add(w));
  }
  return Array.from(out);
}

/**
 * Menilai apakah kalimat aktivitas guru/siswa cukup operasional atau hanya berisi klise generik/placeholder.
 * Tidak semata menolak frasa seperti "guru menjelaskan materi" atau "siswa berdiskusi" bila disertai
 * objek konkret, instruksi operasional, dan bukti belajar spesifik.
 */
export function evaluateOperationalActivitySpecificity(
  text: string,
  role: 'guru' | 'siswa'
): { isGenericSlop: boolean; reason?: string } {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      isGenericSlop: true,
      reason: `Aktivitas ${role} masih kosong.`,
    };
  }

  for (const ph of PLACEHOLDER_PATTERNS) {
    if (ph.pattern.test(trimmed)) {
      return {
        isGenericSlop: true,
        reason: `Aktivitas ${role} mengandung placeholder/teks cacat (${ph.label}).`,
      };
    }
  }

  const slop = isGenericSlopText(trimmed);
  if (slop.matched) {
    return {
      isGenericSlop: true,
      reason: `Aktivitas ${role} mengandung narasi generik (${slop.phrase}).`,
    };
  }

  const trunc = hasSuspiciousTruncation(trimmed);
  if (trunc.truncated) {
    return {
      isGenericSlop: true,
      reason: `Aktivitas ${role} tampak terpotong: ${trunc.reason}`,
    };
  }

  if (GENERIC_NON_GROUNDED_FILLERS.test(trimmed)) {
    const bareMatch = BARE_ACTIVITY_PHRASES.find((p) => p.pattern.test(trimmed));
    return {
      isGenericSlop: true,
      reason: bareMatch
        ? `Frasa ${bareMatch.label} pada aktivitas ${role} hanya berupa pernyataan umum tanpa objek kerja, instruksi, dan bukti belajar konkret.`
        : `Aktivitas ${role} hanya berupa pernyataan umum tanpa objek kerja, instruksi, dan bukti belajar konkret.`,
    };
  }

  const bareMatch = BARE_ACTIVITY_PHRASES.find((p) => p.pattern.test(trimmed));
  if (bareMatch) {
    const hasObject = CONCRETE_OBJECT_REGEX.test(trimmed);
    const hasAction = OPERATIONAL_ACTION_REGEX.test(trimmed);
    if (trimmed.length < 55 || !(hasObject && hasAction)) {
      return {
        isGenericSlop: true,
        reason: `Frasa ${bareMatch.label} pada aktivitas ${role} belum disertai objek media/data dan instruksi langkah yang operasional.`,
      };
    }
  }

  if (trimmed.length < 25) {
    return {
      isGenericSlop: true,
      reason: `Aktivitas ${role} terlalu singkat (${trimmed.length} karakter).`,
    };
  }

  return { isGenericSlop: false };
}

/**
 * Mendeteksi kemungkinan referensi buku fiktif (ISBN karangan, halaman spesifik karangan, atau tautan SIBI fiktif).
 * Tautan URL SIBI resmi dan halaman yang benar-benar berasal dari `referensiSumber` guru diperbolehkan.
 */
export function detectFabricatedBookReference(
  daftarPustaka: string[],
  referensiCatatan?: string,
  referensiSumber?: ModulReferensiSumberItem[]
): string[] {
  const findings: string[] = [];
  const entries = [...(daftarPustaka || []), referensiCatatan || ''].filter(Boolean);
  const refs = Array.isArray(referensiSumber) ? referensiSumber : [];

  const allowedUrls = new Set<string>();
  const allowedPages = new Set<string>();
  const teacherNotesJoined = refs
    .map((r) => `${r.judulBuku || ''} ${r.catatanMateriGuru || ''}`)
    .join(' ');

  for (const ref of refs) {
    if (ref.urlSumber) {
      const check = validateReferensiUrl(ref.urlSumber, ref.jenisSumber);
      if (check.valid && check.normalizedUrl) {
        allowedUrls.add(check.normalizedUrl);
        allowedUrls.add(check.normalizedUrl.replace(/\/$/, ''));
      }
    }
    if (ref.halaman) {
      const normFull = ref.halaman.replace(/[–—]/g, '-').replace(/\s+/g, '');
      if (normFull) allowedPages.add(normFull);
      ref.halaman
        .split(/[,;]/)
        .map((part) => part.replace(/[–—]/g, '-').replace(/\s+/g, ''))
        .filter(Boolean)
        .forEach((p) => allowedPages.add(p));
    }
  }

  for (const entry of entries) {
    const clean = entry.trim();
    if (/^\s*\[Lengkapi referensi satuan pendidikan\]/i.test(clean)) {
      continue;
    }

    const isbnMatches = clean.match(/\bISBN(?:-1[03])?[:\s-]*[0-9xX-]{9,}/gi) || [];
    for (const isbnToken of isbnMatches) {
      if (!teacherNotesJoined.includes(isbnToken.trim())) {
        findings.push(`Potensi nomor ISBN karangan ditemukan pada rujukan: "${clean.slice(0, 80)}..."`);
      }
    }

    const urlMatches =
      clean.match(/https?:\/\/[^\s]*?(?:kemdikbud|kemendikdasmen)\.go\.id[^\s)\],;]*/gi) || [];
    for (const rawFoundUrl of urlMatches) {
      const trimmedUrl = rawFoundUrl.replace(/[.,;)]+$/, '');
      let normalizedFound = trimmedUrl;
      try {
        normalizedFound = new URL(trimmedUrl).toString();
      } catch {
        // biarkan apa adanya bila tidak dapat diparse
      }
      const normalizedNoTrailing = normalizedFound.replace(/\/$/, '');
      if (!allowedUrls.has(normalizedFound) && !allowedUrls.has(normalizedNoTrailing)) {
        findings.push(
          `Potensi URL rujukan SIBI tidak terverifikasi ditemukan pada daftar pustaka: "${clean.slice(0, 80)}..."`
        );
      }
    }

    const pageRegex = /\b(?:halaman|hlm|hal)\.?\s*(\d{1,4}(?:\s*[-–—]\s*\d{1,4})?)/gi;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pageRegex.exec(clean)) !== null) {
      const candidatePage = pMatch[1].replace(/[–—]/g, '-').replace(/\s+/g, '');
      if (!allowedPages.has(candidatePage)) {
        findings.push(
          `Potensi nomor halaman buku fiktif tanpa sumber terkurasi: "${clean.slice(0, 80)}..."`
        );
      }
    }
  }
  return findings;
}

function checkModelSyntaxAlignment(
  modelId: ModulAjarModelType,
  intiStages: TahapKegiatanTerstruktur[]
): string[] {
  const issues: string[] = [];
  const joined = intiStages
    .map((s) => `${s.namaTahap} ${s.tujuanTahap} ${s.aktivitasGuru} ${s.aktivitasSiswa}`)
    .join(' ')
    .toLowerCase();

  switch (modelId) {
    case 'pbl': {
      if (!/masalah|orientasi/.test(joined) || !/penyelidikan|solusi|karya/.test(joined)) {
        issues.push('Tahapan inti PBL harus memuat orientasi masalah autentik, penyelidikan, dan penyajian/evaluasi solusi.');
      }
      break;
    }
    case 'pjbl': {
      const hasProjectCore =
        /pertanyaan mendasar|essential question|proyek|produk|prototipe|jadwal|rancangan karya/.test(joined);
      if (!hasProjectCore) {
        issues.push('Model Project-Based Learning (PjBL) wajib memuat sintaks pertanyaan mendasar, perancangan produk/proyek, jadwal, dan uji/presentasi produk (bukan sekadar PBL).');
      }
      break;
    }
    case 'inquiry': {
      if (/stimulation \(pemberian rangsangan\)|generalization \(menarik kesimpulan\)/.test(joined)) {
        issues.push('Sintaks Inquiry-Based Learning tertukar dengan Discovery Learning.');
      }
      if (!/fenomena|pertanyaan|dugaan|investigasi|bukti|argumen/.test(joined)) {
        issues.push('Tahapan inti Inquiry harus memuat rumusan pertanyaan penyelidikan, investigasi bukti, dan pengujian argumen.');
      }
      break;
    }
    case 'discovery': {
      if (
        /orientasi pada masalah autentik/.test(joined) &&
        !/stimulation|rangsangan|problem statement|data processing|verification|generalization/.test(joined)
      ) {
        issues.push('Sintaks Discovery Learning tidak boleh sekadar memakai tahapan PBL tanpa rangsangan-pengumpulan-pengolahan-pembuktian-generalisasi.');
      }
      if (!/stimulation|rangsangan|data|verifikasi|verification|generalisasi|generalization/.test(joined)) {
        issues.push('Tahapan inti Discovery Learning belum menunjukkan ciri rangsangan, pengolahan data, verifikasi, dan generalisasi.');
      }
      break;
    }
    case 'cooperative': {
      if (!/tim|kelompok|pasangan|kooperatif|jigsaw|stad|think-pair-share|ahli|individu/.test(joined)) {
        issues.push('Tahapan inti Cooperative Learning harus mencerminkan kerja tim heterogen/teknik kooperatif dan uji akuntabilitas individu.');
      }
      break;
    }
    case 'explicit': {
      if (!/demonstrasi|i do|memodelkan|pemodelan/.test(joined) || !/terbimbing|we do|mandiri|you do/.test(joined)) {
        issues.push('Tahapan inti Explicit Instruction wajib memuat pemodelan/demonstrasi (I Do), latihan terbimbing (We Do), dan latihan mandiri (You Do).');
      }
      break;
    }
    case 'kontekstual': {
      if (!/konstruktivisme|pengalaman|konteks|lingkungan|pemodelan|masyarakat belajar|autentik/.test(joined)) {
        issues.push('Tahapan inti CTL harus menghubungkan pengalaman nyata siswa, pemodelan konteks lokal, dan masyarakat belajar.');
      }
      break;
    }
  }
  return issues;
}

/**
 * Validator kualitas Modul Ajar Kurikulum Merdeka (Task 12.2 Task F).
 * Memisahkan masalah struktur & relevansi/anti-slop dari catatan tinjauan semantik guru.
 */
export function validateModulAjarDokumen(
  doc: ModulAjarDokumen,
  tp: CustomTPItem,
  profile: SchoolProfile,
  options?: {
    sourceMode?: 'ai' | 'template' | 'draft';
    expectedModel?: ModulAjarModelType;
    maxTokensCut?: boolean;
  }
): ModulAjarQualityValidation {
  const sourceMode = options?.sourceMode ?? (doc.draftSource === 'ai_generated' ? 'ai' : doc.draftSource === 'template' ? 'template' : 'draft');
  const structuralIssues: string[] = [];
  const relevanceAndAntiSlopIssues: string[] = [];
  const semanticReviewWarnings: string[] = [
    'Pemeriksaan otomatis mengevaluasi kelengkapan struktur, sinkronisasi sintaks/waktu, dan deteksi kalimat klise; guru tetap meninjau ketepatan ilmiah serta kesesuaian konteks lokal kelas.',
  ];

  if (options?.maxTokensCut) {
    structuralIssues.push('Keluaran AI terpotong oleh batas panjang respons (MAX_TOKENS).');
  }

  // 1. Struktur & Kelengkapan Materi Ajar (Task A)
  const bb = doc.bahanBacaan;
  if (!bb) {
    structuralIssues.push('Bagian materi ajar (bahanBacaan) belum tersedia.');
  } else {
    const konsepUtama = (bb.penjelasanKonsepUtama || bb.ringkasanInti || '').trim();
    if (konsepUtama.length < 80) {
      structuralIssues.push('Penjelasan konsep utama materi ajar terlalu pendek (< 80 karakter) untuk dipakai mengajar.');
    }
    if (!Array.isArray(bb.subKonsep) || bb.subKonsep.length < 2 || bb.subKonsep.some((s) => !s.judul?.trim() || !s.uraian?.trim())) {
      structuralIssues.push('Materi ajar minimal harus menguraikan 2 subkonsep yang jelas beserta uraiannya.');
    }
    if (!Array.isArray(bb.istilahPenting) || bb.istilahPenting.length < 2 || bb.istilahPenting.some((it) => !it.istilah?.trim() || !it.pengertian?.trim())) {
      structuralIssues.push('Materi ajar wajib memuat minimal 2 istilah penting materi beserta pengertiannya.');
    }
    if (!Array.isArray(bb.contohKonkret) || bb.contohKonkret.length < 1 || bb.contohKonkret.some((c) => !c?.trim() || c.trim().length < 25)) {
      structuralIssues.push('Materi ajar wajib menyertakan minimal 1 contoh konkret yang relevan dengan kehidupan/lingkungan siswa.');
    }
    if (
      !bb.contohPenyelesaian ||
      !bb.contohPenyelesaian.judulContoh?.trim() ||
      !Array.isArray(bb.contohPenyelesaian.langkahPenyelesaian) ||
      bb.contohPenyelesaian.langkahPenyelesaian.length < 2
    ) {
      structuralIssues.push('Materi ajar wajib menyertakan contoh penyelesaian atau demonstrasi minimal 2 langkah.');
    }
    if (!bb.hubunganDenganTP?.trim() || bb.hubunganDenganTP.trim().length < 25) {
      structuralIssues.push('Hubungan materi ajar dengan Tujuan Pembelajaran belum dijelaskan.');
    }
    if (
      !Array.isArray(bb.potensiMiskonsepsi) ||
      bb.potensiMiskonsepsi.length < 1 ||
      bb.potensiMiskonsepsi.some((m) => !m.miskonsepsi?.trim() || !m.caraMeluruskan?.trim())
    ) {
      structuralIssues.push('Materi ajar wajib mencantumkan minimal 1 potensi miskonsepsi siswa beserta cara guru meluruskannya.');
    }
  }

  // 2. Struktur Kegiatan Pembelajaran & Time-Budget
  if (!Array.isArray(doc.kegiatanPembelajaran) || doc.kegiatanPembelajaran.length === 0) {
    structuralIssues.push('Langkah kegiatan pembelajaran masih kosong.');
  } else {
    doc.kegiatanPembelajaran.forEach((keg, kIdx) => {
      const stages = keg.tahapTerstruktur || [];
      if (stages.length < 3) {
        structuralIssues.push(`Pertemuan ${keg.pertemuan || kIdx + 1} belum memiliki tahapTerstruktur minimal (pendahuluan, inti, penutup).`);
        return;
      }
      const hasPendahuluan = stages.some((s) => s.fase === 'pendahuluan');
      const intiStages = stages.filter((s) => s.fase === 'inti');
      const hasPenutup = stages.some((s) => s.fase === 'penutup');
      if (!hasPendahuluan || intiStages.length < 2 || !hasPenutup) {
        structuralIssues.push(`Pertemuan ${keg.pertemuan || kIdx + 1} wajib memiliki fase pendahuluan, minimal 2 tahap inti, dan penutup.`);
      }

      // Cek tiap tahap & deteksi duplikasi aktivitas
      const seenTeacher = new Set<string>();
      const seenStudent = new Set<string>();
      let duplicatedStages = 0;

      stages.forEach((st) => {
        if (!st.namaTahap?.trim() || !st.tujuanTahap?.trim() || !st.mediaBahan?.trim() || !st.buktiBelajar?.trim()) {
          structuralIssues.push(`Tahap "${st.namaTahap || '?'}" pada pertemuan ${keg.pertemuan} masih memiliki field kosong (tujuan/media/bukti).`);
        }
        if (!st.instruksiPertanyaan?.trim() || st.instruksiPertanyaan.trim().length < 15) {
          structuralIssues.push(`Tahap "${st.namaTahap || '?'}" belum memuat instruksi atau pertanyaan kunci yang operasional.`);
        }
        if (typeof st.durasiMenit !== 'number' || st.durasiMenit <= 0) {
          structuralIssues.push(`Durasi menit tahap "${st.namaTahap || '?'}" tidak valid.`);
        }

        const tCheck = evaluateOperationalActivitySpecificity(st.aktivitasGuru || '', 'guru');
        if (tCheck.isGenericSlop) {
          relevanceAndAntiSlopIssues.push(`Pertemuan ${keg.pertemuan} (${st.namaTahap}): ${tCheck.reason}`);
        }
        const sCheck = evaluateOperationalActivitySpecificity(st.aktivitasSiswa || '', 'siswa');
        if (sCheck.isGenericSlop) {
          relevanceAndAntiSlopIssues.push(`Pertemuan ${keg.pertemuan} (${st.namaTahap}): ${sCheck.reason}`);
        }

        const normT = (st.aktivitasGuru || '').trim().toLowerCase();
        const normS = (st.aktivitasSiswa || '').trim().toLowerCase();
        if (normT.length > 20 && seenTeacher.has(normT)) duplicatedStages++;
        if (normS.length > 20 && seenStudent.has(normS)) duplicatedStages++;
        seenTeacher.add(normT);
        seenStudent.add(normS);
      });

      if (duplicatedStages > 0) {
        relevanceAndAntiSlopIssues.push(`Pertemuan ${keg.pertemuan} memiliki pengulangan deskripsi aktivitas yang identik antar tahap.`);
      }
    });

    const timeVal = validateModulTimeBudget(doc, profile);
    if (!timeVal.isValid) {
      structuralIssues.push(`Alokasi waktu pertemuan belum seimbang: ${timeVal.summaryMessage}`);
    }
  }

  // 3. Kelengkapan Asesmen Konkret & Rubrik (Task C)
  const ad = doc.asesmenDetail;
  if (!ad) {
    structuralIssues.push('Struktur asesmen terperinci (asesmenDetail: diagnostik, formatif, akhir) belum tersedia.');
  } else {
    if (
      !ad.diagnostik?.tujuanPemeriksaanPrasyarat?.trim() ||
      !Array.isArray(ad.diagnostik?.pertanyaanAtauTugasAwal) ||
      ad.diagnostik.pertanyaanAtauTugasAwal.length === 0 ||
      !ad.diagnostik?.indikatorInterpretasi?.trim()
    ) {
      structuralIssues.push('Asesmen diagnostik harus memuat tujuan pemeriksaan prasyarat, minimal 1 tugas awal, dan indikator interpretasi.');
    }
    if (
      !ad.formatif?.instruksiAktivitas?.trim() ||
      !Array.isArray(ad.formatif?.pertanyaanAtauTugas) ||
      ad.formatif.pertanyaanAtauTugas.length === 0 ||
      !Array.isArray(ad.formatif?.buktiYangDiamati) ||
      ad.formatif.buktiYangDiamati.length === 0 ||
      !ad.formatif?.umpanBalikGuru?.trim()
    ) {
      structuralIssues.push('Asesmen formatif wajib memuat instruksi aktivitas, tugas/pertanyaan, bukti yang diamati, dan umpan balik guru.');
    }
    if (
      !ad.akhir?.bentukUtama?.trim() ||
      !Array.isArray(ad.akhir?.butirTugas) ||
      ad.akhir.butirTugas.length < 2 ||
      ad.akhir.butirTugas.some((b) => !b.pertanyaanAtauTugas?.trim() || !b.kunciAtauContohRespons?.trim()) ||
      !ad.akhir?.pedomanPenilaian?.trim()
    ) {
      structuralIssues.push('Asesmen akhir wajib memuat bentuk utama, minimal 2 butir tugas beserta kunci/contoh respons, dan pedoman penilaian.');
    }
    // Cek tidak menanamkan angka 71 hardcoded jika sekolah/TP tidak menetapkan kktpMinTuntas
    const hasExplicitKKTP =
      typeof tp.kktpMinTuntas === 'number' || typeof profile.kktpMinTuntas === 'number';
    if (!hasExplicitKKTP && ad.akhir?.pedomanPenilaian && /\b71\b/.test(ad.akhir.pedomanPenilaian)) {
      relevanceAndAntiSlopIssues.push('Pedoman penilaian menanamkan angka ketuntasan tetap 71 padahal sekolah/TP belum menetapkan KKTP numerik tersebut.');
    }
  }

  if (!Array.isArray(doc.rubrikPenilaianSingkat) || doc.rubrikPenilaianSingkat.length < 2) {
    structuralIssues.push('Rubrik penilaian singkat minimal harus memuat 2 kriteria dengan 4 tingkat capaian.');
  } else if (
    doc.rubrikPenilaianSingkat.some(
      (r) => !r.kriteria?.trim() || !r.baruBerkembang?.trim() || !r.layak?.trim() || !r.cakap?.trim() || !r.mahir?.trim()
    )
  ) {
    structuralIssues.push('Masih terdapat sel rubrik penilaian yang kosong.');
  }

  // 4. Kelengkapan Diferensiasi Operasional 3 Jalur (Task D)
  const diff = doc.diferensiasiOperasional;
  if (!diff) {
    structuralIssues.push('Struktur diferensiasi operasional 3 jalur (dasar, berkembang, mahir) belum tersedia.');
  } else {
    const tiers = [
      { key: 'Kesiapan Dasar', val: diff.kesiapanDasar },
      { key: 'Kesiapan Berkembang', val: diff.kesiapanBerkembang },
      { key: 'Kesiapan Mahir', val: diff.kesiapanMahir },
    ];
    for (const tier of tiers) {
      if (
        !tier.val ||
        !tier.val.dukunganScaffolding?.trim() ||
        !Array.isArray(tier.val.aktivitasKonkret) ||
        tier.val.aktivitasKonkret.length < 1 ||
        tier.val.aktivitasKonkret.some((a) => !a?.trim() || a.trim().length < 25) ||
        !tier.val.mediaPendukung?.trim() ||
        !tier.val.buktiBelajarJalur?.trim()
      ) {
        structuralIssues.push(`Jalur diferensiasi "${tier.key}" wajib memiliki scaffolding, aktivitas konkret operasional, media, dan bukti belajar.`);
      }
    }
    const sigDasar = (diff.kesiapanDasar?.aktivitasKonkret || []).join(' ').trim().toLowerCase();
    const sigMahir = (diff.kesiapanMahir?.aktivitasKonkret || []).join(' ').trim().toLowerCase();
    if (sigDasar && sigDasar === sigMahir) {
      relevanceAndAntiSlopIssues.push('Aktivitas jalur Kesiapan Dasar dan Kesiapan Mahir identik sehingga tidak mencerminkan diferensiasi nyata.');
    }
  }

  // 5. Kelengkapan Contoh LKPD Terintegrasi (Task E)
  const lkpd = doc.contohLKPD;
  if (!lkpd) {
    structuralIssues.push('Contoh LKPD terintegrasi pada modul belum tersedia.');
  } else {
    if (
      !lkpd.judul?.trim() ||
      !lkpd.konteksTugas?.trim() ||
      !lkpd.tujuanPengerjaan?.trim() ||
      !Array.isArray(lkpd.petunjukSiswa) ||
      lkpd.petunjukSiswa.length < 2 ||
      !Array.isArray(lkpd.bahanAtauData) ||
      lkpd.bahanAtauData.length < 1 ||
      !Array.isArray(lkpd.langkahPengerjaan) ||
      lkpd.langkahPengerjaan.length < 2 ||
      !Array.isArray(lkpd.pertanyaanAtauRuangKerja) ||
      lkpd.pertanyaanAtauRuangKerja.length < 2 ||
      !lkpd.hasilYangDiharapkan?.trim() ||
      !Array.isArray(lkpd.kriteriaPenilaian) ||
      lkpd.kriteriaPenilaian.length < 2
    ) {
      structuralIssues.push('Contoh LKPD terintegrasi wajib memuat konteks, tujuan, petunjuk, bahan/data, langkah kerja, pertanyaan/ruang kerja, hasil diharapkan, dan kriteria penilaian.');
    }
  }

  // 6. Keselarasan Model Pedagogis (Task B/F)
  const expectedModel: ModulAjarModelType =
    options?.expectedModel ||
    (isValidModulAjarModelType(doc.sintaksModelId)
      ? doc.sintaksModelId
      : isValidModulAjarModelType(doc.modelType)
      ? doc.modelType
      : 'pbl');

  const firstIntiStages = (doc.kegiatanPembelajaran?.[0]?.tahapTerstruktur || []).filter(
    (s) => s.fase === 'inti'
  );
  if (firstIntiStages.length > 0) {
    relevanceAndAntiSlopIssues.push(...checkModelSyntaxAlignment(expectedModel, firstIntiStages));
  }

  // 7. Kesesuaian Jenjang, Konteks TP, & Etika Rujukan (Task A/F/H)
  const jenjangKat = normalizeJenjangKategori(profile.jenjang);
  const smkTrack = jenjangKat === 'SMK' ? classifySMKSubjectTrack(profile.mataPelajaranUtama) : undefined;
  const serializedAll = JSON.stringify({
    bahanBacaan: doc.bahanBacaan,
    kegiatan: doc.kegiatanPembelajaran,
    asesmenDetail: doc.asesmenDetail,
    diferensiasi: doc.diferensiasiOperasional,
  }).toLowerCase();

  if (jenjangKat === 'SD/MI') {
    if (/\bdunia kerja\b|\bindustri\b|\bbengkel\b|\bk3 bengkel\b/.test(serializedAll)) {
      relevanceAndAntiSlopIssues.push(
        'Modul jenjang SD/MI memuat istilah tidak relevan usia SD ("dunia kerja", "industri", atau "bengkel").'
      );
    }
  } else if (jenjangKat === 'SMK' && smkTrack === 'kejuruan') {
    if (!/\b(sop|prosedur|k3|keselamatan|alat|job sheet)\b/.test(serializedAll)) {
      relevanceAndAntiSlopIssues.push(
        'Modul SMK Kejuruan belum memuat konteks prosedur kerja (SOP), penggunaan alat, atau keselamatan kerja (K3).'
      );
    }
  }

  const tpKeywords = extractKeywords([
    tp.materiPokok,
    tp.tujuanPembelajaran,
    tp.elemen,
    ...(tp.subTP || []).map((s) => `${s.fokusMateri} ${s.kompetensi}`),
  ]);
  if (tpKeywords.length >= 2) {
    const bodyForTopicCheck = [
      doc.judul,
      doc.pemahamanBermakna,
      doc.bahanBacaan?.penjelasanKonsepUtama || doc.bahanBacaan?.ringkasanInti || '',
      ...(doc.kegiatanPembelajaran?.[0]?.tahapTerstruktur || []).map(
        (s) => `${s.aktivitasGuru} ${s.aktivitasSiswa} ${s.instruksiPertanyaan}`
      ),
      ...(doc.asesmenDetail?.akhir?.butirTugas || []).map((b) => b.pertanyaanAtauTugas),
    ]
      .join(' ')
      .toLowerCase();

    const hits = tpKeywords.filter((kw) => bodyForTopicCheck.includes(kw));
    if (hits.length === 0) {
      relevanceAndAntiSlopIssues.push(
        `Konten modul tidak merujuk pada istilah kunci materi TP "${tp.materiPokok}".`
      );
    } else if (tpKeywords.length >= 4 && hits.length === 1) {
      semanticReviewWarnings.push(
        `Keterkaitan istilah kunci TP "${tp.materiPokok}" masih tipis di naskah (hanya 1 kata kunci terdeteksi).`
      );
    }
  }

  // Pembelajaran Mendalam & Profil Lulusan naturalness check (Task H)
  const firstStages = doc.kegiatanPembelajaran?.[0]?.tahapTerstruktur || [];
  if (firstStages.length >= 4) {
    const forcedAllThreeCount = firstStages.filter(
      (s) => Array.isArray(s.prinsipPembelajaran) && s.prinsipPembelajaran.length >= 3
    ).length;
    if (forcedAllThreeCount >= firstStages.length) {
      relevanceAndAntiSlopIssues.push(
        'Seluruh tahap pembelajaran ditempeli ketiga label prinsip Pembelajaran Mendalam sekaligus secara tidak selektif.'
      );
    }
  }
  if ((doc.profilPelajarPancasila || []).length >= 7) {
    relevanceAndAntiSlopIssues.push(
      `Terlalu banyak dimensi Profil Lulusan dipaksakan (${doc.profilPelajarPancasila.length} dimensi); pilih 2–4 dimensi yang benar-benar relevan.`
    );
  }

  // Anti-referensi SIBI fiktif & provenance jujur (Task 12 / 12.3)
  const docRefs = Array.isArray(doc.referensiSumber) ? doc.referensiSumber : [];
  for (const ref of docRefs) {
    if (!ref.judulBuku?.trim()) {
      structuralIssues.push('Terdapat entri referensi sumber ajar tanpa judul buku.');
    }
    const urlCheck = validateReferensiUrl(ref.urlSumber, ref.jenisSumber);
    if (!urlCheck.valid && urlCheck.error) {
      relevanceAndAntiSlopIssues.push(urlCheck.error);
    }
    if (sourceMode === 'ai' && ref.statusVerifikasi === 'terkurasi_terverifikasi') {
      relevanceAndAntiSlopIssues.push(
        'AI tidak diperbolehkan menaikkan status verifikasi referensi menjadi terkurasi secara sepihak.'
      );
    }
  }

  const fabRefs = detectFabricatedBookReference(
    doc.daftarPustaka || [],
    doc.bahanBacaan?.referensiCatatan,
    docRefs
  );
  if (fabRefs.length > 0) {
    if (sourceMode === 'ai') {
      relevanceAndAntiSlopIssues.push(...fabRefs);
    } else {
      semanticReviewWarnings.push(...fabRefs);
    }
  }

  const hasDirectProvidedText = docRefs.some(
    (ref) => ref.catatanMateriGuru && ref.jenisAksesMateri === 'teks_disediakan_guru'
  );
  if (sourceMode === 'ai' && !hasDirectProvidedText) {
    const readingClaimCorpus = [
      doc.bahanBacaan?.penjelasanKonsepUtama || '',
      doc.bahanBacaan?.referensiCatatan || '',
      ...(doc.daftarPustaka || []),
    ].join(' ');
    if (
      /(?:telah|sudah)\s+membaca\s+(?:langsung\s+)?(?:isi\s+)?(?:buku|tautan|halaman)\s+(?:sibi|kemendikdasmen|tersebut)|mengakses\s+(?:langsung\s+)?(?:tautan|url|isi\s+buku)\s+(?:sibi|di\s+atas)|berdasarkan\s+isi\s+lengkap\s+buku\s+yang\s+(?:telah\s+)?(?:saya|kami)\s+baca/i.test(
        readingClaimCorpus
      )
    ) {
      relevanceAndAntiSlopIssues.push(
        'Keluaran AI mengeklaim membaca isi buku SIBI/tautan URL secara langsung padahal hanya menerima metadata sumber.'
      );
    }
  }

  // Anti-glosarium administratif kosong
  if (
    Array.isArray(doc.glosarium) &&
    doc.glosarium.some((g) => /^capaian pembelajaran \(cp\)|^alur tujuan pembelajaran/i.test(g.istilah || ''))
  ) {
    relevanceAndAntiSlopIssues.push('Glosarium masih berisi istilah administratif CP/ATP alih-alih istilah materi pelajaran.');
  }

  const totalBlocking = structuralIssues.length + relevanceAndAntiSlopIssues.length;
  let status: ModulAjarValidationStatus;
  if (totalBlocking > 0) {
    status = sourceMode === 'ai' ? 'gagal_validasi' : 'perlu_review_guru';
  } else if (sourceMode === 'ai') {
    status = 'valid_ai';
  } else if (sourceMode === 'template') {
    status = 'template_awal';
  } else {
    status = 'perlu_review_guru';
  }

  return {
    status,
    usedFallback: sourceMode === 'template',
    structuralIssues,
    relevanceAndAntiSlopIssues,
    semanticReviewWarnings,
  };
}
