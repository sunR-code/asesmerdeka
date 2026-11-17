import type { JenjangFase } from '../types/assessment';
import type { LKPDPresetType } from '../types/perangkatAjar';
import type { ModulAjarModelType } from './modulAjarAiService';

export interface AcademicProfileLike {
  schoolId?: string;
  namaSekolah?: string;
  tahunAjaran?: string;
  jenjang?: 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK' | string;
  kelasUtama?: string;
  rombelAktif?: string;
  mataPelajaranUtama?: string;
  semester?: '1 (Ganjil)' | '2 (Genap)' | string;
}

export interface ResolvedAcademicContext {
  schoolId: string;
  namaSekolah: string;
  tahunAjaran: string;
  jenjang: string;
  fase: JenjangFase | string;
  kelas: string;
  rombel: string;
  mataPelajaran: string;
  semester: string;
  semesterCode: 'sem1' | 'sem2';
}

export const SCHOOL_ID_STORAGE_KEY = 'asesmerdeka_school_id_v1';
export const CP_STORAGE_V2_KEY = 'asesmerdeka_cp_v2';

export const V2_BACKUP_STORAGE_PREFIXES = [
  SCHOOL_ID_STORAGE_KEY,
  CP_STORAGE_V2_KEY,
  'asesmerdeka_roster_v2__',
  'asesmerdeka_harian_v2__',
  'asesmerdeka_custom_tp_v2',
  'asesmerdeka_modul_v2__',
  'asesmerdeka_modul_latest_v2__',
  'asesmerdeka_lkpd_v2__',
  'asesmerdeka_lkpd_latest_v2__',
  'asesmerdeka_supervisi_v2__',
  'asesmerdeka_kalender_v2__',
  'asesmerdeka_jp_v2__',
  'asesmerdeka_prota_v2__',
  'asesmerdeka_promes_v2__',
  'asesmerdeka_bank_soal_v2__',
  'asesmerdeka_bank_rangkuman_v2__',
  'asesmerdeka_ujian_v2__',
  'asesmerdeka_storage_migration_version',
  'asesmerdeka_schedule_migration_version_v1',
  'asesmerdeka_assessment_migration_v2',
  'asesmerdeka_legacy_backup_v1',
  'asesmerdeka_migration_conflicts_v1',
] as const;

export function hashIdentifier32(input: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(36).padStart(6, '0');
}

export function normalizeNamespaceSegment(value: string | undefined | null, fallback: string): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    return fallback;
  }
  const lower = raw.toLowerCase();
  const slug = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
  const suffix = hashIdentifier32(lower).slice(0, 5);
  return `${slug.slice(0, 28)}_${suffix}`;
}

export function resolveSemesterCode(semester: string | undefined | null): 'sem1' | 'sem2' {
  const raw = (semester || '1').trim().toLowerCase();
  return raw.startsWith('2') || raw.includes('genap') ? 'sem2' : 'sem1';
}

export function deriveDefaultFase(jenjang: string | undefined, kelas: string | undefined): string {
  const k = parseInt((kelas || '').replace(/[^0-9]/g, ''), 10);
  if (jenjang === 'SD/MI') {
    if (k === 1 || k === 2) return 'Fase A (Kelas 1-2 SD)';
    if (k === 3 || k === 4) return 'Fase B (Kelas 3-4 SD)';
    return 'Fase C (Kelas 5-6 SD)';
  }
  if (jenjang === 'SMP/MTs') {
    return 'Fase D (Kelas 7-9 SMP)';
  }
  if (jenjang === 'SMA/MA' || jenjang === 'SMK') {
    if (k === 10) return 'Fase E (Kelas 10 SMA/SMK)';
    return 'Fase F (Kelas 11-12 SMA/SMK)';
  }
  return 'Fase D (Kelas 7-9 SMP)';
}

export function getPersistedActiveSchoolId(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const val = localStorage.getItem(SCHOOL_ID_STORAGE_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function generateNewSchoolId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `sch_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    }
  } catch {
    // fallback below
  }
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `sch_${ts}_${rand}`;
}

export function resolveSchoolId(profile?: AcademicProfileLike | null): string {
  return resolveAcademicContext(profile).schoolId;
}

export function resolveAcademicContext(
  profile?: AcademicProfileLike | null,
  explicitFase?: string
): ResolvedAcademicContext {
  const p = profile || {};
  const schoolId =
    (p.schoolId && p.schoolId.trim()) ||
    getPersistedActiveSchoolId() ||
    'sch_local_default';
  const namaSekolah = (p.namaSekolah || '').trim();
  const tahunAjaran = (p.tahunAjaran || '2026/2027').trim();
  const jenjang = (p.jenjang || 'SMP/MTs').trim();
  const kelas = (p.kelasUtama || '8').trim();
  const rombel = (p.rombelAktif || 'A').trim();
  const mataPelajaran = (p.mataPelajaranUtama || 'Matematika').trim();
  const semester = (p.semester || '1 (Ganjil)').trim();
  const semesterCode = resolveSemesterCode(semester);
  const fase = (explicitFase || deriveDefaultFase(jenjang, kelas)).trim();

  return {
    schoolId,
    namaSekolah,
    tahunAjaran,
    jenjang,
    fase,
    kelas,
    rombel,
    mataPelajaran,
    semester,
    semesterCode,
  };
}

function formatSchoolSegment(ctx: ResolvedAcademicContext): string {
  return normalizeNamespaceSegment(ctx.schoolId, 'sch_local');
}

function formatClassScopePrefix(ctx: ResolvedAcademicContext): string {
  const sSchool = formatSchoolSegment(ctx);
  const sTA = normalizeNamespaceSegment(ctx.tahunAjaran, '2026_2027');
  const sJenjang = normalizeNamespaceSegment(ctx.jenjang, 'smp_mts');
  const sKelas = normalizeNamespaceSegment(ctx.kelas, 'kls');
  const sRombel = normalizeNamespaceSegment(ctx.rombel, 'rmb_a');
  return `${sSchool}__ta_${sTA}__jnj_${sJenjang}__kls_${sKelas}__rmb_${sRombel}`;
}

function formatCurriculumScopePrefix(ctx: ResolvedAcademicContext): string {
  const sSchool = formatSchoolSegment(ctx);
  const sTA = normalizeNamespaceSegment(ctx.tahunAjaran, '2026_2027');
  const sJenjang = normalizeNamespaceSegment(ctx.jenjang, 'smp_mts');
  const sKelas = normalizeNamespaceSegment(ctx.kelas, 'kls');
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  return `${sSchool}__ta_${sTA}__jnj_${sJenjang}__kls_${sKelas}__mpl_${sMapel}__${ctx.semesterCode}`;
}

/**
 * Scope Roster Siswa: Sekolah + Tahun Ajaran + Jenjang + Kelas + Rombel.
 * Bebas dari mataPelajaran dan semester agar roster konsisten lintas mapel/semester dalam rombel & TA sama.
 */
export function buildRosterStorageKey(profile?: AcademicProfileLike | null): string {
  const ctx = resolveAcademicContext(profile);
  return `asesmerdeka_roster_v2__${formatClassScopePrefix(ctx)}`;
}

/**
 * Scope Presensi, Jurnal Mengajar, Buku Nilai per Mapel & Semester dalam rombel + TA + sekolah.
 */
export function buildKelasHarianStorageKeyV2(profile?: AcademicProfileLike | null): string {
  const ctx = resolveAcademicContext(profile);
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  return `asesmerdeka_harian_v2__${formatClassScopePrefix(ctx)}__mpl_${sMapel}__${ctx.semesterCode}`;
}

/**
 * Scope Custom TP per Sekolah + Tahun Ajaran + Jenjang + Fase + Kelas + Mapel + Semester.
 */
export function buildCustomTPScopeKey(
  profile?: AcademicProfileLike | null,
  explicitFase?: string
): string {
  const ctx = resolveAcademicContext(profile, explicitFase);
  const sFase = normalizeNamespaceSegment(ctx.fase, 'fase');
  return `${formatCurriculumScopePrefix(ctx)}__fas_${sFase}`;
}

/**
 * Scope Capaian Pembelajaran (CP) per Sekolah + Jenjang + Fase + Mata Pelajaran.
 * Berbasis fase (tidak dikunci per kelas/semester agar CP fase konsisten).
 */
export function buildCPScopeKey(
  profile?: AcademicProfileLike | null,
  explicitFase?: string
): string {
  const ctx = resolveAcademicContext(profile, explicitFase);
  const sSchool = formatSchoolSegment(ctx);
  const sJenjang = normalizeNamespaceSegment(ctx.jenjang, 'smp_mts');
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  const sFase = normalizeNamespaceSegment(ctx.fase, 'fase');
  return `${sSchool}__jnj_${sJenjang}__mpl_${sMapel}__fas_${sFase}`;
}

/**
 * Scope Supervisi Akademik per Sekolah + TA + Jenjang + Kelas + Rombel + Mapel + Semester.
 */
export function buildSupervisiStorageKeyV2(profile?: AcademicProfileLike | null): string {
  const ctx = resolveAcademicContext(profile);
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  return `asesmerdeka_supervisi_v2__${formatClassScopePrefix(ctx)}__mpl_${sMapel}__${ctx.semesterCode}`;
}

/**
 * Scope Draf Modul Ajar per Konteks Kurikulum + Immutable TP ID + Model Pembelajaran.
 */
export function buildModulAjarDraftStorageKey(
  profile: AcademicProfileLike | null | undefined,
  tpId: string,
  model: ModulAjarModelType | string
): string {
  const ctx = resolveAcademicContext(profile);
  const sTp = normalizeNamespaceSegment(tpId, 'tp');
  const sModel = normalizeNamespaceSegment(String(model || 'pbl'), 'pbl');
  return `asesmerdeka_modul_v2__${formatCurriculumScopePrefix(ctx)}__tp_${sTp}__mdl_${sModel}`;
}

export function buildModulAjarLatestIndexKey(
  profile: AcademicProfileLike | null | undefined,
  tpId: string
): string {
  const ctx = resolveAcademicContext(profile);
  const sTp = normalizeNamespaceSegment(tpId, 'tp');
  return `asesmerdeka_modul_latest_v2__${formatCurriculumScopePrefix(ctx)}__tp_${sTp}`;
}

/**
 * Scope Draf LKPD per Konteks Kurikulum + Immutable TP ID + Preset Aktivitas.
 */
export function buildLKPDDraftStorageKey(
  profile: AcademicProfileLike | null | undefined,
  tpId: string,
  preset: LKPDPresetType | string
): string {
  const ctx = resolveAcademicContext(profile);
  const sTp = normalizeNamespaceSegment(tpId, 'tp');
  const sPreset = normalizeNamespaceSegment(String(preset || 'kasus'), 'kasus');
  return `asesmerdeka_lkpd_v2__${formatCurriculumScopePrefix(ctx)}__tp_${sTp}__pst_${sPreset}`;
}

export function buildLKPDLatestIndexKey(
  profile: AcademicProfileLike | null | undefined,
  tpId: string
): string {
  const ctx = resolveAcademicContext(profile);
  const sTp = normalizeNamespaceSegment(tpId, 'tp');
  return `asesmerdeka_lkpd_latest_v2__${formatCurriculumScopePrefix(ctx)}__tp_${sTp}`;
}

/**
 * Scope Kalender Akademik Sekolah: Sekolah + Tahun Ajaran + Semester (Sem 1 dan Sem 2 terpisah).
 */
export function buildAcademicCalendarStorageKey(
  profile?: AcademicProfileLike | null,
  semesterOverride?: string
): string {
  const ctx = resolveAcademicContext(profile);
  const sSchool = formatSchoolSegment(ctx);
  const sTA = normalizeNamespaceSegment(ctx.tahunAjaran, '2026_2027');
  const semCode = semesterOverride ? resolveSemesterCode(semesterOverride) : ctx.semesterCode;
  return `asesmerdeka_kalender_v2__${sSchool}__ta_${sTA}__${semCode}`;
}

/**
 * Scope Kebijakan Alokasi JP: Sekolah + Jenjang + Kelas + Mata Pelajaran.
 */
export function buildSubjectJPConfigStorageKey(
  profile?: AcademicProfileLike | null
): string {
  const ctx = resolveAcademicContext(profile);
  const sSchool = formatSchoolSegment(ctx);
  const sJenjang = normalizeNamespaceSegment(ctx.jenjang, 'smp_mts');
  const sKelas = normalizeNamespaceSegment(ctx.kelas, 'kls');
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  return `asesmerdeka_jp_v2__${sSchool}__jnj_${sJenjang}__kls_${sKelas}__mpl_${sMapel}`;
}

/**
 * Scope Pengaturan Prota Tahunan: Sekolah + Tahun Ajaran + Jenjang + Kelas + Mata Pelajaran.
 */
export function buildProtaConfigStorageKey(
  profile?: AcademicProfileLike | null
): string {
  const ctx = resolveAcademicContext(profile);
  const sSchool = formatSchoolSegment(ctx);
  const sTA = normalizeNamespaceSegment(ctx.tahunAjaran, '2026_2027');
  const sJenjang = normalizeNamespaceSegment(ctx.jenjang, 'smp_mts');
  const sKelas = normalizeNamespaceSegment(ctx.kelas, 'kls');
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  return `asesmerdeka_prota_v2__${sSchool}__ta_${sTA}__jnj_${sJenjang}__kls_${sKelas}__mpl_${sMapel}`;
}

/**
 * Scope Penyesuaian Jadwal Promes: Sekolah + TA + Jenjang + Kelas + Rombel + Mapel + Semester.
 */
export function buildPromesScheduleStorageKey(
  profile?: AcademicProfileLike | null
): string {
  const ctx = resolveAcademicContext(profile);
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  return `asesmerdeka_promes_v2__${formatClassScopePrefix(ctx)}__mpl_${sMapel}__${ctx.semesterCode}`;
}

/**
 * Scope Bank Soal (V2): Sekolah + TA + Jenjang + Kelas + Mapel + Semester.
 * Memisahkan arsip soal antar sekolah, tahun ajaran, jenjang/kelas, mapel, dan semester.
 */
export function buildBankSoalStorageKey(
  profile?: AcademicProfileLike | null
): string {
  const ctx = resolveAcademicContext(profile);
  const sSchool = formatSchoolSegment(ctx);
  const sTA = normalizeNamespaceSegment(ctx.tahunAjaran, '2026_2027');
  const sJenjang = normalizeNamespaceSegment(ctx.jenjang, 'smp_mts');
  const sKelas = normalizeNamespaceSegment(ctx.kelas, 'kls');
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  return `asesmerdeka_bank_soal_v2__${sSchool}__ta_${sTA}__jnj_${sJenjang}__kls_${sKelas}__mpl_${sMapel}__${ctx.semesterCode}`;
}

/**
 * Scope Bank Rangkuman Materi (V2): Sekolah + TA + Jenjang + Kelas + Mapel + Semester.
 */
export function buildBankRangkumanStorageKey(
  profile?: AcademicProfileLike | null
): string {
  const ctx = resolveAcademicContext(profile);
  const sSchool = formatSchoolSegment(ctx);
  const sTA = normalizeNamespaceSegment(ctx.tahunAjaran, '2026_2027');
  const sJenjang = normalizeNamespaceSegment(ctx.jenjang, 'smp_mts');
  const sKelas = normalizeNamespaceSegment(ctx.kelas, 'kls');
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  return `asesmerdeka_bank_rangkuman_v2__${sSchool}__ta_${sTA}__jnj_${sJenjang}__kls_${sKelas}__mpl_${sMapel}__${ctx.semesterCode}`;
}

/**
 * Scope Draf Naskah Ujian Semester (STS/SAS): Sekolah + TA + Jenjang + Kelas + Rombel + Mapel + Semester + Tipe.
 */
export function buildUjianSemesterStorageKey(
  profile?: AcademicProfileLike | null,
  tipe?: 'STS' | 'SAS'
): string {
  const ctx = resolveAcademicContext(profile);
  const sMapel = normalizeNamespaceSegment(ctx.mataPelajaran, 'mapel');
  const tipeSeg = tipe ? `__${tipe.toLowerCase()}` : '';
  return `asesmerdeka_ujian_v2__${formatClassScopePrefix(ctx)}__mpl_${sMapel}__${ctx.semesterCode}${tipeSeg}`;
}

/**
 * Generator ID Internal TP Imutabel untuk katalog bawaan maupun TP buatan guru.
 * Tidak memakai nomor urut array maupun display kode semata, dan terisolasi lintas mapel/jenjang/semester/TA/sekolah.
 */
export function createImmutableDefaultTPId(params: {
  schoolId?: string;
  tahunAjaran?: string;
  jenjangFase: string;
  kelas: string;
  semester: string;
  mataPelajaran: string;
  topicKey: string;
}): string {
  const schoolPart = (params.schoolId || 'sch_local_default').trim().toLowerCase();
  const taPart = (params.tahunAjaran || '2026/2027').trim().toLowerCase();
  const fasePart = (params.jenjangFase || '').trim().toLowerCase();
  const kelasPart = (params.kelas || '').trim().toLowerCase();
  const semPart = resolveSemesterCode(params.semester);
  const mapelPart = (params.mataPelajaran || '').trim().toLowerCase();
  const topicPart = (params.topicKey || '').trim().toLowerCase();

  const fingerprint = hashIdentifier32(
    [schoolPart, taPart, fasePart, kelasPart, semPart, mapelPart, topicPart].join('|')
  );
  const mapelSlug =
    mapelPart.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 10) || 'mapel';
  const klsSlug = kelasPart.replace(/[^a-z0-9]+/g, '') || 'x';
  return `tpid_${mapelSlug}_k${klsSlug}_${semPart}_${fingerprint}`;
}

export function createCustomImmutableTPId(profile?: AcademicProfileLike | null): string {
  const ctx = resolveAcademicContext(profile);
  const scopeHash = hashIdentifier32(
    [ctx.schoolId, ctx.tahunAjaran, ctx.jenjang, ctx.kelas, ctx.mataPelajaran, ctx.semesterCode].join('|')
  );
  let uniq = '';
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      uniq = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
    }
  } catch {
    // fallback below
  }
  if (!uniq) {
    uniq = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
  return `tpid_custom_${scopeHash}_${uniq}`;
}
