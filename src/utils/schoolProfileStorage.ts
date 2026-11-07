import type { JenjangFase } from '../types/assessment';

export interface CustomTPItem {
  id: string;
  kode: string;
  elemen: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  arahanRangkuman: string;
  alokasiJP: number;
  mingguMulai: number;
  mingguSelesai: number;
}

export interface SchoolProfile {
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
  tampilkanTandaTangan: boolean;
  pakaiFormatKopSekolah: boolean;
}

const PROFILE_STORAGE_KEY = 'asesmerdeka_school_profile_v1';
const CUSTOM_TP_STORAGE_KEY = 'asesmerdeka_custom_tp_map_v1';
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
  instansiDinas: 'PEMERINTAH PROVINSI / KABUPATEN DINAS PENDIDIKAN',
  namaSekolah: 'SMP Negeri 1 Merdeka Belajar',
  alamatSekolah: 'Jl. Pendidikan Nasional No. 45, Indonesia',
  jenjang: 'SMP/MTs',
  kelasUtama: '8',
  rombelAktif: 'VIII A',
  daftarRombel: ['VIII A', 'VIII B', 'VIII C'],
  mataPelajaranUtama: 'Matematika',
  namaGuru: 'Fajar Hidayat, S.Pd.',
  nipGuru: '19920514 201903 1 008',
  namaKepalaSekolah: 'Drs. H. Budi Santoso, M.Pd.',
  nipKepalaSekolah: '19690817 199512 1 003',
  kotaSekolah: 'Jakarta',
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
  try {
    const prev = getSchoolProfile();
    const oldCleanSchool = (prev.namaSekolah || 'sekolah').replace(/[^a-zA-Z0-9]/g, '_');
    const newCleanSchool = (profile.namaSekolah || 'sekolah').replace(/[^a-zA-Z0-9]/g, '_');

    // Migrasi otomatis data kelas harian jika nama sekolah diubah agar data presensi/nilai tidak hilang
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

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Gagal menyimpan profil sekolah:', e);
  }
  return profile;
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
  semester: string
): string {
  return `${mataPelajaran.toLowerCase().trim()}__kls_${kelas.trim()}__sem_${semester.startsWith('2') ? '2' : '1'}`;
}

export function getSavedCustomTPList(
  mataPelajaran: string,
  kelas: string,
  semester: string
): CustomTPItem[] | null {
  try {
    const raw = localStorage.getItem(CUSTOM_TP_STORAGE_KEY);
    if (!raw) return null;
    const allMap = JSON.parse(raw) as Record<string, CustomTPItem[]>;
    const key = getCustomTPStorageKey(mataPelajaran, kelas, semester);
    return allMap[key] || null;
  } catch {
    return null;
  }
}

export function saveCustomTPList(
  mataPelajaran: string,
  kelas: string,
  semester: string,
  items: CustomTPItem[]
): void {
  try {
    const raw = localStorage.getItem(CUSTOM_TP_STORAGE_KEY);
    const allMap: Record<string, CustomTPItem[]> = raw ? JSON.parse(raw) : {};
    const key = getCustomTPStorageKey(mataPelajaran, kelas, semester);
    allMap[key] = items;
    localStorage.setItem(CUSTOM_TP_STORAGE_KEY, JSON.stringify(allMap));
  } catch (e) {
    console.error('Gagal menyimpan daftar TP kustom:', e);
  }
}

export function resetCustomTPList(
  mataPelajaran: string,
  kelas: string,
  semester: string
): void {
  try {
    const raw = localStorage.getItem(CUSTOM_TP_STORAGE_KEY);
    if (!raw) return;
    const allMap: Record<string, CustomTPItem[]> = JSON.parse(raw);
    const key = getCustomTPStorageKey(mataPelajaran, kelas, semester);
    delete allMap[key];
    localStorage.setItem(CUSTOM_TP_STORAGE_KEY, JSON.stringify(allMap));
  } catch {
    // ignore
  }
}

const ALLOWED_BACKUP_PREFIXES = [
  PROFILE_STORAGE_KEY,
  CUSTOM_TP_STORAGE_KEY,
  ONBOARDING_CONFIRMED_KEY,
  'asesmerdeka_harian_',
  'asesmerdeka_bank_soal',
  'asesmerdeka_bank_rangkuman',
  'lkpd_',
];

function isAllowedBackupKey(key: string): boolean {
  return ALLOWED_BACKUP_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix));
}

export function exportBackupDataJson(): string {
  const data: Record<string, unknown> = {};
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

