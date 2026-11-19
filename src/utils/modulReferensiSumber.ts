import type {
  JenisAksesMateriReferensi,
  JenisReferensiSumber,
  ModulReferensiSumberItem,
  StatusVerifikasiReferensi,
} from '../types/perangkatAjar';

export const SIBI_CATALOG_URL = 'https://buku.kemendikdasmen.go.id/katalog';
export const SIBI_OFFICIAL_HOSTNAME = 'buku.kemendikdasmen.go.id';

export const PROVENANCE_MSG_UNLINKED =
  'Referensi buku belum ditautkan. Materi disusun berdasarkan konteks CP/TP dan informasi yang diberikan guru.';
export const PROVENANCE_MSG_TEACHER_INPUT =
  'Referensi diinput oleh guru — belum diverifikasi secara independen.';
export const PROVENANCE_MSG_CURATED_VERIFIED =
  'Metadata terkurasi dan diverifikasi.';

export const JENIS_REFERENSI_LABELS: Record<JenisReferensiSumber, string> = {
  sibi_kemendikdasmen: 'Buku SIBI Kemendikdasmen',
  buku_teks_lain: 'Buku Teks / Panduan Lain',
  modul_atau_sumber_guru: 'Modul / Catatan Sumber Guru',
};

export const JENIS_AKSES_MATERI_LABELS: Record<JenisAksesMateriReferensi, string> = {
  metadata_saja: 'Hanya metadata sumber (AI tidak membaca isi buku dari tautan)',
  catatan_ringkas_guru: 'Catatan ringkas materi yang ditulis guru',
  teks_disediakan_guru: 'Petikan/teks materi yang disediakan langsung oleh guru',
};

export interface ReferensiUrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  isOfficialSibiDomain: boolean;
  isSibiCatalogPath: boolean;
  warning?: string;
  error?: string;
}

/**
 * Validasi ketat URL sumber ajar:
 * - Hanya mengizinkan protokol HTTPS
 * - Memeriksa hostname secara eksak menggunakan URL parser
 * - Menolak typo domain, subdomain tidak sah, userinfo spoofing, maupun domain resmi di path/query
 * - Tidak pernah menganggap seluruh domain resmi otomatis sebagai halaman katalog buku
 */
export function validateReferensiUrl(
  rawUrl: string | undefined,
  jenisSumber: JenisReferensiSumber = 'sibi_kemendikdasmen'
): ReferensiUrlValidationResult {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      valid: true,
      normalizedUrl: undefined,
      isOfficialSibiDomain: false,
      isSibiCatalogPath: false,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      isOfficialSibiDomain: false,
      isSibiCatalogPath: false,
      error: 'Format URL tidak valid. Gunakan tautan lengkap yang diawali https://.',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      isOfficialSibiDomain: false,
      isSibiCatalogPath: false,
      error: 'Tautan referensi wajib menggunakan protokol HTTPS (https://).',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      isOfficialSibiDomain: false,
      isSibiCatalogPath: false,
      error: 'Tautan referensi tidak boleh menyertakan kredensial (user@host).',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isExactSibiHost = host === SIBI_OFFICIAL_HOSTNAME;

  if (isExactSibiHost && parsed.port !== '') {
    return {
      valid: false,
      isOfficialSibiDomain: false,
      isSibiCatalogPath: false,
      error: 'Tautan resmi SIBI tidak menggunakan nomor port non-standar.',
    };
  }

  if (jenisSumber === 'sibi_kemendikdasmen' && !isExactSibiHost) {
    return {
      valid: false,
      isOfficialSibiDomain: false,
      isSibiCatalogPath: false,
      error:
        'URL sumber SIBI harus berasal tepat dari host resmi https://buku.kemendikdasmen.go.id (bukan HTTP, domain mirip, subdomain lain, atau domain resmi di path/query).',
    };
  }

  const normPath = parsed.pathname.toLowerCase();
  const isSibiCatalogPath =
    isExactSibiHost && (normPath === '/katalog' || normPath.startsWith('/katalog/'));

  const warning =
    isExactSibiHost && !isSibiCatalogPath
      ? 'Tautan berasal dari domain resmi buku.kemendikdasmen.go.id, tetapi bukan halaman katalog buku (/katalog/...). Pastikan tautan merujuk ke halaman buku yang dimaksud.'
      : undefined;

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    isOfficialSibiDomain: isExactSibiHost,
    isSibiCatalogPath,
    warning,
  };
}

export function getReferensiStatusLabel(status?: StatusVerifikasiReferensi): string {
  if (status === 'terkurasi_terverifikasi') {
    return PROVENANCE_MSG_CURATED_VERIFIED;
  }
  if (status === 'diinput_guru') {
    return PROVENANCE_MSG_TEACHER_INPUT;
  }
  return PROVENANCE_MSG_UNLINKED;
}

export interface NormalizeReferensiResult {
  ok: boolean;
  item?: ModulReferensiSumberItem;
  warning?: string;
  error?: string;
}

function generateReferensiId(): string {
  return `ref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function cleanOptionalText(val: string | undefined): string | undefined {
  const s = (val || '').trim();
  return s ? s : undefined;
}

/**
 * Normalisasi input referensi guru serta penegakan status kejujuran provenance:
 * kecocokan domain resmi tidak pernah menaikkan status verifikasi metadata menjadi terverifikasi.
 */
export function normalizeReferensiSumberInput(
  input: Partial<ModulReferensiSumberItem>,
  defaults?: {
    jenjang?: string;
    kelas?: string;
    mataPelajaran?: string;
    allowCuratedStatus?: boolean;
  }
): NormalizeReferensiResult {
  const jenisSumber: JenisReferensiSumber = input.jenisSumber || 'sibi_kemendikdasmen';
  const judulBuku = (input.judulBuku || '').trim();
  if (judulBuku.length < 3) {
    return {
      ok: false,
      error: 'Judul buku/sumber wajib diisi minimal 3 karakter.',
    };
  }

  const urlCheck = validateReferensiUrl(input.urlSumber, jenisSumber);
  if (!urlCheck.valid) {
    return {
      ok: false,
      error: urlCheck.error || 'Tautan URL referensi tidak valid.',
    };
  }

  const catatanMateriGuru = cleanOptionalText(input.catatanMateriGuru);
  const jenisAksesMateri: JenisAksesMateriReferensi = !catatanMateriGuru
    ? 'metadata_saja'
    : input.jenisAksesMateri === 'teks_disediakan_guru'
    ? 'teks_disediakan_guru'
    : 'catatan_ringkas_guru';

  const statusVerifikasi: StatusVerifikasiReferensi =
    defaults?.allowCuratedStatus === true &&
    input.statusVerifikasi === 'terkurasi_terverifikasi'
      ? 'terkurasi_terverifikasi'
      : 'diinput_guru';

  const item: ModulReferensiSumberItem = {
    id: (input.id || '').trim() || generateReferensiId(),
    jenisSumber,
    jenjang: cleanOptionalText(input.jenjang) || cleanOptionalText(defaults?.jenjang),
    kelas: cleanOptionalText(input.kelas) || cleanOptionalText(defaults?.kelas),
    mataPelajaran:
      cleanOptionalText(input.mataPelajaran) || cleanOptionalText(defaults?.mataPelajaran),
    judulBuku,
    penulis: cleanOptionalText(input.penulis),
    edisiAtauTahun: cleanOptionalText(input.edisiAtauTahun),
    babAtauSubbab: cleanOptionalText(input.babAtauSubbab),
    halaman: cleanOptionalText(input.halaman),
    urlSumber: urlCheck.normalizedUrl,
    catatanMateriGuru,
    jenisAksesMateri,
    domainResmiSibi: urlCheck.isOfficialSibiDomain,
    statusVerifikasi,
    diperbaruiPada: new Date().toISOString(),
  };

  return {
    ok: true,
    item,
    warning: urlCheck.warning,
  };
}

/**
 * Merangkai sitasi jujur hanya dari field metadata yang benar-benar terisi oleh guru/kurasi.
 */
export function formatReferensiSumberCitation(ref: ModulReferensiSumberItem): string {
  const jenisLabel = JENIS_REFERENSI_LABELS[ref.jenisSumber] || 'Sumber Ajar';
  const parts: string[] = [`[${jenisLabel}] ${ref.judulBuku}`];
  if (ref.penulis) parts.push(`Penulis: ${ref.penulis}`);
  if (ref.edisiAtauTahun) parts.push(`Edisi/Tahun: ${ref.edisiAtauTahun}`);
  const contextMeta = [ref.jenjang, ref.kelas ? `Kelas ${ref.kelas}` : undefined, ref.mataPelajaran]
    .filter(Boolean)
    .join(' · ');
  if (contextMeta) parts.push(contextMeta);
  if (ref.babAtauSubbab) parts.push(`Bab/Subbab: ${ref.babAtauSubbab}`);
  if (ref.halaman) parts.push(`Halaman: ${ref.halaman}`);
  if (ref.urlSumber) parts.push(`Tautan: ${ref.urlSumber}`);
  parts.push(`Status: ${getReferensiStatusLabel(ref.statusVerifikasi)}`);
  return parts.join(' | ');
}

/**
 * Ringkasan catatan rujukan untuk bahanBacaan modul agar jujur dan konsisten dengan referensiSumber.
 */
export function buildReferensiBahanBacaanNote(refs?: ModulReferensiSumberItem[]): string | undefined {
  if (!refs || refs.length === 0) return undefined;
  const titles = refs.map((r) => `"${r.judulBuku}"`).join('; ');
  const hasCurated = refs.every((r) => r.statusVerifikasi === 'terkurasi_terverifikasi');
  const statusSummary = hasCurated
    ? PROVENANCE_MSG_CURATED_VERIFIED
    : PROVENANCE_MSG_TEACHER_INPUT;
  return `Acuan sumber ajar yang ditautkan: ${titles}. (${statusSummary})`;
}

/**
 * Blok konteks referensi jujur untuk prompt Gemini Modul Ajar.
 * Memisahkan tegas metadata buku, catatan ringkasan guru, dan teks buku yang benar-benar disediakan guru.
 */
export function buildReferensiPromptBlock(refs?: ModulReferensiSumberItem[]): string {
  const list = Array.isArray(refs) ? refs : [];
  if (list.length === 0) {
    return [
      'REFERENSI SUMBER AJAR & ATURAN PROVENANCE:',
      `- Status rujukan buku: ${PROVENANCE_MSG_UNLINKED}`,
      '- DILARANG mengarang judul buku teks tertentu, penulis, edisi/tahun terbit, nomor ISBN, nomor halaman spesifik, kutipan langsung fiktif, atau URL SIBI.',
      `- Pada "bahanBacaan.referensiCatatan" dan "daftarPustaka", sampaikan secara jujur bahwa referensi buku belum ditautkan dan materi dikembangkan dari CP/TP.`,
    ].join('\n');
  }

  const metadataLines = list.map((ref, idx) => {
    const jenisLabel = JENIS_REFERENSI_LABELS[ref.jenisSumber] || 'Sumber Ajar';
    const fields: string[] = [`  ${idx + 1}. [${jenisLabel}] Judul: ${ref.judulBuku}`];
    if (ref.penulis) fields.push(`Penulis: ${ref.penulis}`);
    if (ref.edisiAtauTahun) fields.push(`Edisi/Tahun: ${ref.edisiAtauTahun}`);
    if (ref.jenjang || ref.kelas || ref.mataPelajaran) {
      fields.push(
        `Sasaran: ${[ref.jenjang, ref.kelas ? `Kelas ${ref.kelas}` : undefined, ref.mataPelajaran]
          .filter(Boolean)
          .join(' / ')}`
      );
    }
    if (ref.babAtauSubbab) fields.push(`Bab/Subbab: ${ref.babAtauSubbab}`);
    if (ref.halaman) fields.push(`Halaman: ${ref.halaman}`);
    if (ref.urlSumber) {
      fields.push(
        `URL Sumber: ${ref.urlSumber}${ref.domainResmiSibi ? ' (domain resmi Kemendikdasmen, tidak dibaca otomatis oleh AI)' : ''}`
      );
    }
    fields.push(`Status Verifikasi: ${getReferensiStatusLabel(ref.statusVerifikasi)}`);
    return fields.join(' | ');
  });

  const teacherNotes = list.filter(
    (ref) => ref.catatanMateriGuru && ref.jenisAksesMateri !== 'teks_disediakan_guru'
  );
  const teacherFullTexts = list.filter(
    (ref) => ref.catatanMateriGuru && ref.jenisAksesMateri === 'teks_disediakan_guru'
  );

  const sections: string[] = [
    'REFERENSI SUMBER AJAR YANG DITAUTKAN GURU (PROVENANCE JUJUR):',
    'A. Metadata Sumber (HANYA metadata — AI tidak mengakses atau membaca isi tautan URL secara otomatis):',
    ...metadataLines,
  ];

  if (teacherNotes.length > 0) {
    sections.push('B. Catatan Ringkas Materi yang Disediakan Guru:');
    teacherNotes.forEach((ref, idx) => {
      sections.push(`  ${idx + 1}. Dari "${ref.judulBuku}": ${ref.catatanMateriGuru}`);
    });
  } else {
    sections.push('B. Catatan Ringkas Materi Guru: (Belum ada catatan ringkasan khusus yang diisikan guru).');
  }

  if (teacherFullTexts.length > 0) {
    sections.push('C. Teks / Isi Materi yang Disediakan Langsung oleh Guru:');
    teacherFullTexts.forEach((ref, idx) => {
      sections.push(`  ${idx + 1}. Kutipan/Teks dari "${ref.judulBuku}": ${ref.catatanMateriGuru}`);
    });
  } else {
    sections.push('C. Teks / Isi Buku Langsung dari Guru: (Tidak tersedia — AI hanya menerima metadata/catatan di atas).');
  }

  sections.push(
    'ATURAN WAJIB PENGGUNAAN REFERENSI:',
    '1. Gunakan catatan/teks materi guru di atas sebagai konteks pengembangan materi ajar dan aktivitas pembelajaran yang konsisten dengan TP & Sub-TP serta bahasa sesuai jenjang.',
    '2. DILARANG membuat kutipan langsung fiktif atau nomor halaman spesifik di luar rentang halaman yang benar-benar diberikan guru di Bagian A/C.',
    '3. DILARANG mengklaim telah membaca isi buku SIBI atau mengakses tautan URL secara langsung apabila hanya menerima metadata judul dan tautan.',
    '4. DILARANG mengarang penulis, edisi, tahun terbit, atau nomor ISBN baru yang tidak tercantum di Bagian A.',
    '5. Cantumkan sumber yang diberikan guru secara jujur ke dalam "daftarPustaka" sesuai metadata yang tersedia.'
  );

  return sections.join('\n');
}
