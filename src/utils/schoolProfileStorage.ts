import type { JenjangFase } from '../types/assessment';
import {
  SCHOOL_ID_STORAGE_KEY,
  CP_STORAGE_V2_KEY,
  ATP_STORAGE_V2_KEY,
  V2_BACKUP_STORAGE_PREFIXES,
  buildCustomTPScopeKey,
  generateNewSchoolId,
  getPersistedActiveSchoolId,
  normalizeNamespaceSegment,
  type AcademicProfileLike,
} from './storageIdentity';

export interface SubTPItem {
  id: string;
  kode: string;
  kompetensi: string;
  fokusMateri: string;
  buktiKetercapaian: string;
  estimasiMenit?: number;
}

export type CPAsalSumber = 'referensi_sistem' | 'input_guru';
export type CPStatusVerifikasi =
  | 'resmi_terverifikasi'
  | 'referensi_belum_verifikasi'
  | 'input_guru';

export interface CPReferenceMeta {
  sumber: string;
  elemenCP: string;
  fase: string;
  terverifikasiResmi: boolean;
  catatan: string;
  mataPelajaran?: string;
  jenjang?: string;
  teksCP?: string;
  asalCP?: CPAsalSumber;
  namaDokumenSumber?: string;
  nomorDokumen?: string;
  tahunVersiDokumen?: string;
  urlReferensi?: string;
  statusVerifikasi?: CPStatusVerifikasi;
  catatanPenyesuaianGuru?: string;
  cpEntryId?: string;
}

export type TPReviewStatus = 'draft' | 'ditinjau' | 'disetujui';

export interface CustomTPItem {
  id: string;
  legacyTpId?: string;
  kode: string;
  elemen: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  arahanRangkuman: string;
  alokasiJP: number;
  mingguMulai: number;
  mingguSelesai: number;
  kompetensiInti?: string;
  lingkupMateri?: string;
  prasyarat?: string[];
  prasyaratTpIds?: string[];
  buktiKetercapaian?: string[];
  rencanaAsesmen?: {
    bentukUtama: string[];
    deskripsi: string;
    isEditedByGuru?: boolean;
  };
  estimasiMenitSesi?: number;
  kktpMinTuntas?: number;
  statusReview?: TPReviewStatus;
  referensiCP?: CPReferenceMeta;
  analisisCPId?: string;
  subTP?: SubTPItem[];
  // Task 8.3C backward-compatible metadata asal topik & progresi semester
  sourceTopicId?: string;
  progressionStage?: 'pengenalan' | 'pengembangan' | 'penerapan' | 'integrasi' | 'pendalaman';
  topicJenisKonten?: 'referensi_resmi' | 'contoh_panduan' | 'kurasi_sistem' | 'usulan_ai' | 'input_guru';
  topicStatusVerifikasi?:
    | 'terkurasi_dan_terverifikasi'
    | 'berdasarkan_contoh_panduan'
    | 'kurasi_internal'
    | 'input_guru_dibutuhkan'
    | 'belum_tersedia';
  spiralRelation?: {
    previousTopicId: string;
    previousTopicTitle?: string;
    reactivatedConcept: string;
    newCompetency: string;
    depthDifference: string;
    newContextOrApplication: string;
    pedagogicalReason: string;
  };
  legacyDuplicationReview?: {
    isSuspectedLegacyClone: boolean;
    status: 'perlu_ditinjau' | 'disetujui_guru';
    reason: string;
  };
}

export function computeTPContentHash(
  tp: Pick<CustomTPItem, 'kode' | 'elemen' | 'materiPokok' | 'tujuanPembelajaran' | 'alokasiJP'> &
    Partial<
      Pick<
        CustomTPItem,
        | 'arahanRangkuman'
        | 'kompetensiInti'
        | 'lingkupMateri'
        | 'prasyarat'
        | 'buktiKetercapaian'
        | 'subTP'
        | 'referensiCP'
        | 'analisisCPId'
      >
    >
): string {
  const subTpSignature = Array.isArray(tp.subTP)
    ? tp.subTP.map((s) => `${s.kode}:${s.kompetensi}:${s.fokusMateri}:${s.buktiKetercapaian}`).join(';')
    : '';
  const prasyaratSignature = Array.isArray(tp.prasyarat) ? tp.prasyarat.join(';') : '';
  const baseFields = [
    tp.kode || '',
    tp.elemen || '',
    tp.materiPokok || '',
    tp.tujuanPembelajaran || '',
    String(tp.alokasiJP || ''),
    tp.arahanRangkuman || '',
    tp.kompetensiInti || '',
    prasyaratSignature,
    subTpSignature,
  ];

  // Pertahankan backward-compatibility: field tambahan kosong / undefined atau lingkupMateri === materiPokok
  // tidak boleh mengubah signature hash TP lama agar draf existing tidak otomatis terkena flag needsReview.
  const trimmedLingkup = (tp.lingkupMateri || '').trim();
  const trimmedMateri = (tp.materiPokok || '').trim();
  if (trimmedLingkup && trimmedLingkup !== trimmedMateri) {
    baseFields.push(`lm:${trimmedLingkup}`);
  }

  const payload = baseFields.join('|');
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash + payload.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export interface SchoolProfile {
  schoolId?: string;
  instansiDinas: string;
  namaSekolah: string;
  alamatSekolah: string;
  jenjang: 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK';
  kelasUtama: string;
  rombelAktif: string;
  daftarRombel: string[];
  mataPelajaranUtama: string;
  namaGuru: string;
  nipGuru: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  kotaSekolah: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  tahunAjaran: string;
  kktpMinTuntas?: number;
  tampilkanTandaTangan: boolean;
  pakaiFormatKopSekolah: boolean;
}

const PROFILE_STORAGE_KEY = 'asesmerdeka_school_profile_v1';
const CUSTOM_TP_STORAGE_KEY = 'asesmerdeka_custom_tp_map_v1';
const CUSTOM_TP_STORAGE_V2_KEY = 'asesmerdeka_custom_tp_v2';
const ONBOARDING_CONFIRMED_KEY = 'asesmerdeka_onboarding_confirmed_v1';

export function hasConfirmedClassSetup(): boolean {
  try {
    const confirmedFlag = localStorage.getItem(ONBOARDING_CONFIRMED_KEY);
    if (confirmedFlag === 'true') return true;
    // Jika pengguna lama sudah pernah menyimpan profil sekolah di perangkat ini, anggap sudah onboarding
    const existingProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    return existingProfile !== null;
  } catch {
    return false;
  }
}

export function setConfirmedClassSetup(confirmed: boolean): void {
  try {
    if (confirmed) {
      localStorage.setItem(ONBOARDING_CONFIRMED_KEY, 'true');
    } else {
      localStorage.removeItem(ONBOARDING_CONFIRMED_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

const DEFAULT_PROFILE: SchoolProfile = {
  instansiDinas: '',
  namaSekolah: '',
  alamatSekolah: '',
  jenjang: 'SMP/MTs',
  kelasUtama: '8',
  rombelAktif: 'VIII A',
  daftarRombel: ['VIII A', 'VIII B', 'VIII C'],
  mataPelajaranUtama: 'Matematika',
  namaGuru: '',
  nipGuru: '',
  namaKepalaSekolah: '',
  nipKepalaSekolah: '',
  kotaSekolah: '',
  semester: '1 (Ganjil)',
  tahunAjaran: '2026/2027',
  tampilkanTandaTangan: true,
  pakaiFormatKopSekolah: true,
};

export function angkaKeRomawiKelas(kelas: string): string {
  const map: Record<string, string> = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
    '5': 'V',
    '6': 'VI',
    '7': 'VII',
    '8': 'VIII',
    '9': 'IX',
    '10': 'X',
    '11': 'XI',
    '12': 'XII',
  };
  return map[kelas.trim()] || kelas.trim();
}

export function getSchoolProfile(): SchoolProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    const merged: SchoolProfile = {
      ...DEFAULT_PROFILE,
      ...parsed,
    };
    if (!merged.schoolId) {
      const persistedId = getPersistedActiveSchoolId();
      if (persistedId) {
        merged.schoolId = persistedId;
      }
    }
    if (!Array.isArray(merged.daftarRombel) || merged.daftarRombel.length === 0) {
      const rom = angkaKeRomawiKelas(merged.kelasUtama || '8');
      merged.daftarRombel = [`${rom} A`, `${rom} B`];
      merged.rombelAktif = `${rom} A`;
    }
    return merged;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveSchoolProfile(profile: SchoolProfile): SchoolProfile {
  let profileToSave: SchoolProfile = profile;
  try {
    const prev = getSchoolProfile();
    const isSwitchingToDistinctExplicitSchool =
      Boolean(profile.schoolId && prev.schoolId && profile.schoolId.trim() !== prev.schoolId.trim());

    const resolvedSchoolId =
      (profile.schoolId && profile.schoolId.trim()) ||
      (prev.schoolId && prev.schoolId.trim()) ||
      getPersistedActiveSchoolId() ||
      generateNewSchoolId();

    profileToSave = {
      ...profile,
      schoolId: resolvedSchoolId,
    };

    localStorage.setItem(SCHOOL_ID_STORAGE_KEY, resolvedSchoolId);

    // Migrasi otomatis key harian legacy jika nama sekolah diubah dalam sekolah yang sama (kompatibilitas AUD-004)
    if (!isSwitchingToDistinctExplicitSchool) {
      const oldCleanSchool = (prev.namaSekolah || 'sekolah').replace(/[^a-zA-Z0-9]/g, '_');
      const newCleanSchool = (profile.namaSekolah || 'sekolah').replace(/[^a-zA-Z0-9]/g, '_');

      if (oldCleanSchool !== newCleanSchool) {
        const oldPrefix = `asesmerdeka_harian_${oldCleanSchool}_`;
        const newPrefix = `asesmerdeka_harian_${newCleanSchool}_`;
        const keysToMigrate: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(oldPrefix)) {
            keysToMigrate.push(k);
          }
        }
        for (const oldKey of keysToMigrate) {
          const suffix = oldKey.slice(oldPrefix.length);
          const newKey = `${newPrefix}${suffix}`;
          if (!localStorage.getItem(newKey)) {
            const val = localStorage.getItem(oldKey);
            if (val) {
              localStorage.setItem(newKey, val);
            }
          }
        }
      }
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileToSave));
  } catch (e) {
    console.error('Gagal menyimpan profil sekolah:', e);
  }
  return profileToSave;
}

export function jenjangToDefaultFase(
  jenjang: SchoolProfile['jenjang'],
  kelas?: string
): JenjangFase {
  const k = parseInt(kelas || '', 10);
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

export function getCustomTPStorageKey(
  mataPelajaran: string,
  kelas: string,
  semester: string,
  profile?: AcademicProfileLike
): string {
  if (profile) {
    return buildCustomTPScopeKey({
      ...profile,
      mataPelajaranUtama: mataPelajaran,
      kelasUtama: kelas,
      semester,
    });
  }
  return `${mataPelajaran.toLowerCase().trim()}__kls_${kelas.trim()}__sem_${semester.startsWith('2') ? '2' : '1'}`;
}

export function getSavedCustomTPList(
  mataPelajaran: string,
  kelas: string,
  semester: string,
  profile?: AcademicProfileLike
): CustomTPItem[] | null {
  try {
    const rawV2 = localStorage.getItem(CUSTOM_TP_STORAGE_V2_KEY);
    if (rawV2) {
      const v2Map = JSON.parse(rawV2) as Record<string, CustomTPItem[]>;
      const v2Key = buildCustomTPScopeKey({
        ...(profile || {}),
        mataPelajaranUtama: mataPelajaran,
        kelasUtama: kelas,
        semester,
      });
      if (Array.isArray(v2Map[v2Key]) && v2Map[v2Key].length > 0) {
        return v2Map[v2Key];
      }
    }

    // Fallback aman ke key legacy hanya bila belum ada entri v2 dan bukan profil sekolah eksplisit berbeda
    const hasExplicitDifferentSchool =
      Boolean(profile?.schoolId && profile.schoolId.trim() && profile.schoolId !== getPersistedActiveSchoolId());
    if (hasExplicitDifferentSchool) {
      return null;
    }

    const raw = localStorage.getItem(CUSTOM_TP_STORAGE_KEY);
    if (!raw) return null;
    const allMap = JSON.parse(raw) as Record<string, CustomTPItem[]>;
    const legacyKey = getCustomTPStorageKey(mataPelajaran, kelas, semester);
    return allMap[legacyKey] || null;
  } catch {
    return null;
  }
}

export function saveCustomTPList(
  mataPelajaran: string,
  kelas: string,
  semester: string,
  items: CustomTPItem[],
  profile?: AcademicProfileLike
): void {
  try {
    const rawV2 = localStorage.getItem(CUSTOM_TP_STORAGE_V2_KEY);
    const v2Map: Record<string, CustomTPItem[]> = rawV2 ? JSON.parse(rawV2) : {};
    const v2Key = buildCustomTPScopeKey({
      ...(profile || {}),
      mataPelajaranUtama: mataPelajaran,
      kelasUtama: kelas,
      semester,
    });
    v2Map[v2Key] = items;
    localStorage.setItem(CUSTOM_TP_STORAGE_V2_KEY, JSON.stringify(v2Map));
  } catch (e) {
    console.error('Gagal menyimpan daftar TP kustom:', e);
  }
}

export function resetCustomTPList(
  mataPelajaran: string,
  kelas: string,
  semester: string,
  profile?: AcademicProfileLike
): void {
  try {
    const rawV2 = localStorage.getItem(CUSTOM_TP_STORAGE_V2_KEY);
    if (rawV2) {
      const v2Map: Record<string, CustomTPItem[]> = JSON.parse(rawV2);
      const v2Key = buildCustomTPScopeKey({
        ...(profile || {}),
        mataPelajaranUtama: mataPelajaran,
        kelasUtama: kelas,
        semester,
      });
      delete v2Map[v2Key];
      localStorage.setItem(CUSTOM_TP_STORAGE_V2_KEY, JSON.stringify(v2Map));
    }

    const raw = localStorage.getItem(CUSTOM_TP_STORAGE_KEY);
    if (raw) {
      const allMap: Record<string, CustomTPItem[]> = JSON.parse(raw);
      const legacyKey = getCustomTPStorageKey(mataPelajaran, kelas, semester);
      delete allMap[legacyKey];
      localStorage.setItem(CUSTOM_TP_STORAGE_KEY, JSON.stringify(allMap));
    }
  } catch {
    // ignore
  }
}

const ALLOWED_BACKUP_PREFIXES = [
  PROFILE_STORAGE_KEY,
  CUSTOM_TP_STORAGE_KEY,
  CUSTOM_TP_STORAGE_V2_KEY,
  CP_STORAGE_V2_KEY,
  ATP_STORAGE_V2_KEY,
  ONBOARDING_CONFIRMED_KEY,
  'asesmerdeka_harian_',
  'asesmerdeka_supervisi_',
  'asesmerdeka_bank_soal',
  'asesmerdeka_bank_rangkuman',
  'modul_ajar_',
  'lkpd_',
  ...V2_BACKUP_STORAGE_PREFIXES,
];

export function isAllowedBackupKey(key: string): boolean {
  return ALLOWED_BACKUP_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix));
}

export function collectAllowedBackupEntries(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (typeof localStorage === 'undefined') {
    return data;
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isAllowedBackupKey(key)) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
    }
  }
  return data;
}

export function exportBackupDataJson(): string {
  const data = collectAllowedBackupEntries();
  return JSON.stringify(
    {
      app: 'AsesMerdeka Studio',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      entries: data,
    },
    null,
    2
  );
}

export function markSavedLKPDDraftsNeedsReview(
  tpId: string,
  latestTP: CustomTPItem,
  profile?: AcademicProfileLike
): number {
  let updatedCount = 0;
  try {
    if (typeof localStorage === 'undefined') return 0;
    const legacyPrefix = `lkpd_${tpId}_`;
    const normTpMarker = `__tp_${normalizeNamespaceSegment(tpId, 'tp')}__pst_`;
    const newHash = computeTPContentHash(latestTP);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const matchesLegacy = key.startsWith(legacyPrefix);
      const matchesV2 = key.startsWith('asesmerdeka_lkpd_v2__') && key.includes(normTpMarker);
      if (!matchesLegacy && !matchesV2) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (
          profile?.mataPelajaranUtama &&
          parsed?.mataPelajaran &&
          parsed.mataPelajaran.trim().toLowerCase() !== profile.mataPelajaranUtama.trim().toLowerCase()
        ) {
          continue;
        }
        if (parsed && typeof parsed === 'object' && parsed.tpSourceHash !== newHash) {
          parsed.needsReview = true;
          localStorage.setItem(key, JSON.stringify(parsed));
          updatedCount++;
        }
      } catch {
        // ignore malformed saved draft
      }
    }
  } catch {
    // ignore storage errors
  }
  return updatedCount;
}

export function importBackupDataJson(rawJson: string): {
  success: boolean;
  restoredCount: number;
  message: string;
} {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.entries !== 'object' || !parsed.entries) {
      return {
        success: false,
        restoredCount: 0,
        message: 'Format berkas cadangan (.json) tidak valid atau bukan berasal dari AsesMerdeka.',
      };
    }

    let restoredCount = 0;
    const entries = parsed.entries as Record<string, unknown>;
    for (const [key, value] of Object.entries(entries)) {
      // Hanya pulihkan data akademik/sekolah, tolak manipulasi key lisensi/kuota
      if (isAllowedBackupKey(key)) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
        restoredCount++;
      }
    }

    return {
      success: restoredCount > 0,
      restoredCount,
      message:
        restoredCount > 0
          ? `Berhasil memulihkan ${restoredCount} kelompok data kelas, nilai, presensi, dan bank soal!`
          : 'Tidak ada data kelas yang ditemukan di dalam berkas cadangan.',
    };
  } catch {
    return {
      success: false,
      restoredCount: 0,
      message: 'Gagal membaca berkas cadangan (.json). Pastikan berkas tidak rusak.',
    };
  }
}

