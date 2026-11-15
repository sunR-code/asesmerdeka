import type { SubjectJPConfig } from '../types/academicSchedule';
import {
  buildSubjectJPConfigStorageKey,
  resolveAcademicContext,
  type AcademicProfileLike,
} from './storageIdentity';

function defaultDurasiMenitByJenjang(jenjang: string): number {
  if (jenjang === 'SD/MI') return 35;
  if (jenjang === 'SMP/MTs') return 40;
  return 45; // SMA/MA, SMK
}

function parseKelasNumber(kelas: string): number {
  const n = parseInt((kelas || '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 8;
}

interface SubjectJPPresetMatch {
  jpPerMinggu: number;
  pertemuanPerMinggu: number;
  tersedia: boolean;
  catatanBasis: string;
}

function matchSubjectJPPreset(
  jenjang: string,
  kelas: string,
  mataPelajaran: string
): SubjectJPPresetMatch {
  const lower = (mataPelajaran || '').toLowerCase().trim();
  const kelasNum = parseKelasNumber(kelas);

  // Mapel Kemenag / Madrasah
  if (
    lower.includes('fikih') ||
    lower.includes('akidah') ||
    lower.includes('qur') ||
    lower.includes('hadis') ||
    lower.includes('ski') ||
    lower.includes('kebudayaan islam')
  ) {
    return {
      jpPerMinggu: 2,
      pertemuanPerMinggu: 1,
      tersedia: true,
      catatanBasis:
        'Estimasi beban belajar rumpun PAI Madrasah (2 JP/minggu, 1 pertemuan). Harap konfirmasi terhadap struktur kurikulum madrasah Anda.',
    };
  }

  if (lower.includes('bahasa arab')) {
    const jp = jenjang === 'SD/MI' ? 2 : 3;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: jp >= 3 ? 2 : 1,
      tersedia: true,
      catatanBasis: `Estimasi beban belajar Bahasa Arab (${jp} JP/minggu). Konfirmasikan terhadap jadwal madrasah/SMK setempat.`,
    };
  }

  if (lower.includes('agama') || lower.includes('budi pekerti')) {
    return {
      jpPerMinggu: 3,
      pertemuanPerMinggu: 1,
      tersedia: true,
      catatanBasis:
        'Estimasi beban belajar PAI & Budi Pekerti (3 JP/minggu, 1 pertemuan). Sesuaikan jika satuan pendidikan membagi ke P5/kokurikuler.',
    };
  }

  if (lower.includes('pancasila') || lower.includes('ppkn')) {
    const jp = jenjang === 'SD/MI' ? 4 : 2;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: jp >= 4 ? 2 : 1,
      tersedia: true,
      catatanBasis: `Estimasi beban belajar Pendidikan Pancasila jenjang ${jenjang} (${jp} JP/minggu). Mohon verifikasi dengan jadwal sekolah.`,
    };
  }

  if (lower.includes('matematika')) {
    const jp =
      jenjang === 'SD/MI' || jenjang === 'SMP/MTs'
        ? 5
        : jenjang === 'SMK' && kelasNum >= 11
        ? 3
        : 4;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: 2,
      tersedia: true,
      catatanBasis: `Estimasi beban belajar Matematika jenjang ${jenjang} Kelas ${kelas} (${jp} JP/minggu dalam 2 pertemuan). Konfirmasikan dengan jadwal mengajar Anda.`,
    };
  }

  if (lower.includes('bahasa indonesia')) {
    const jp = jenjang === 'SD/MI' || jenjang === 'SMP/MTs' ? 6 : 4;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: jp >= 6 ? 3 : 2,
      tersedia: true,
      catatanBasis: `Estimasi beban belajar Bahasa Indonesia jenjang ${jenjang} (${jp} JP/minggu). Periksa kesesuaian dengan pembagian intrakurikuler sekolah.`,
    };
  }

  if (lower.includes('bahasa inggris')) {
    const jp =
      jenjang === 'SD/MI'
        ? 2
        : jenjang === 'SMP/MTs'
        ? 4
        : jenjang === 'SMK'
        ? 4
        : 3;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: jp >= 4 ? 2 : 1,
      tersedia: true,
      catatanBasis: `Estimasi beban belajar Bahasa Inggris jenjang ${jenjang} (${jp} JP/minggu). Sesuaikan dengan KOSP sekolah.`,
    };
  }

  if (lower.includes('projek ipas')) {
    return {
      jpPerMinggu: 6,
      pertemuanPerMinggu: 2,
      tersedia: true,
      catatanBasis:
        'Estimasi beban belajar Projek IPAS SMK (6 JP/minggu). Konfirmasikan pembagian tatap muka dan praktik bengkel/lab.',
    };
  }

  if (lower.includes('ipas') || lower === 'ipa' || lower.startsWith('ipa ')) {
    const jp = 5;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: 2,
      tersedia: true,
      catatanBasis: `Estimasi beban belajar ${mataPelajaran} jenjang ${jenjang} (${jp} JP/minggu). Harap konfirmasi dengan jadwal laboratorium/kelas.`,
    };
  }

  if (lower === 'ips' || lower.startsWith('ips ')) {
    const jp = jenjang === 'SMP/MTs' ? 4 : 3;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: 2,
      tersedia: true,
      catatanBasis: `Estimasi awal beban belajar IPS jenjang ${jenjang} (${jp} JP/minggu, belum dikonfirmasi sekolah). Sesuaikan dengan KOSP & jadwal resmi sekolah.`,
    };
  }

  if (
    lower.includes('fisika') ||
    lower.includes('kimia') ||
    lower.includes('biologi') ||
    lower.includes('ekonomi') ||
    lower.includes('sosiologi') ||
    lower.includes('geografi')
  ) {
    const isFaseF = kelasNum >= 11;
    const jp = isFaseF ? 5 : 3;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: 2,
      tersedia: true,
      catatanBasis: `Estimasi awal beban belajar ${mataPelajaran} Kelas ${kelas} (${
        isFaseF ? 'mapel pilihan Fase F: 5 JP/minggu' : 'Fase E: 3 JP/minggu'
      }, belum resmi). Konfirmasikan dengan struktur KOSP sekolah Anda.`,
    };
  }

  if (lower.includes('sejarah')) {
    const jp = kelasNum === 10 ? 3 : 2;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: 1,
      tersedia: true,
      catatanBasis: `Estimasi awal beban belajar Sejarah Kelas ${kelas} (${jp} JP/minggu, belum dikonfirmasi sekolah). Verifikasi terhadap jadwal mengajar setempat.`,
    };
  }

  if (lower.includes('informatika') || lower.includes('dasar kejuruan')) {
    const jp = jenjang === 'SMK' ? 4 : kelasNum >= 11 ? 5 : 2;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: jp >= 4 ? 2 : 1,
      tersedia: true,
      catatanBasis: `Estimasi awal beban belajar ${mataPelajaran} Kelas ${kelas} (${jp} JP/minggu, belum resmi). Konfirmasikan alokasi praktik/teori di sekolah.`,
    };
  }

  if (lower.includes('pkk') || lower.includes('kewirausahaan')) {
    return {
      jpPerMinggu: 5,
      pertemuanPerMinggu: 2,
      tersedia: true,
      catatanBasis:
        'Estimasi awal beban belajar PKK SMK (5 JP/minggu, belum dikonfirmasi). Harap sesuaikan dengan jadwal blok/reguler SMK.',
    };
  }

  if (lower.includes('pjok') || lower.includes('jasmani')) {
    return {
      jpPerMinggu: 3,
      pertemuanPerMinggu: 1,
      tersedia: true,
      catatanBasis:
        'Estimasi awal beban belajar PJOK (3 JP/minggu, 1 pertemuan; belum resmi). Konfirmasikan dengan jadwal intrakurikuler sekolah.',
    };
  }

  if (lower.includes('seni') || lower.includes('prakarya')) {
    const jp = jenjang === 'SD/MI' ? 3 : 2;
    return {
      jpPerMinggu: jp,
      pertemuanPerMinggu: 1,
      tersedia: true,
      catatanBasis: `Estimasi awal beban belajar ${mataPelajaran} jenjang ${jenjang} (${jp} JP/minggu, belum resmi). Sesuaikan dengan KOSP/jadwal sekolah.`,
    };
  }

  return {
    jpPerMinggu: 2,
    pertemuanPerMinggu: 1,
    tersedia: false,
    catatanBasis:
      'Alokasi JP mata pelajaran ini belum tersedia di preset aplikasi. Nilai 2 JP hanya pengisi awal dan bukan ketentuan resmi — wajib diisi & dikonfirmasi sesuai KOSP/jadwal resmi sekolah.',
  };
}

/**
 * Menghasilkan konfigurasi estimasi JP awal yang berbeda per jenjang & mata pelajaran.
 * Tidak memaksakan 4 JP/minggu untuk semua mapel dan tidak mengklaim regulasi resmi tanpa konfirmasi guru.
 */
export function resolveDefaultSubjectJPConfig(profile?: AcademicProfileLike | null): SubjectJPConfig {
  const ctx = resolveAcademicContext(profile);
  const preset = matchSubjectJPPreset(ctx.jenjang, ctx.kelas, ctx.mataPelajaran);
  const durasiJPMinut = defaultDurasiMenitByJenjang(ctx.jenjang);

  return {
    schoolId: ctx.schoolId,
    jenjang: ctx.jenjang,
    kelas: ctx.kelas,
    mataPelajaran: ctx.mataPelajaran,
    jpPerMinggu: preset.jpPerMinggu,
    durasiJPMinut,
    pertemuanPerMinggu: preset.pertemuanPerMinggu,
    tersediaDiKatalogDefault: preset.tersedia,
    statusKonfirmasi: 'estimasi_belum_dikonfirmasi',
    sumberReferensi: preset.tersedia
      ? 'Estimasi awal AsesMerdeka berbasis pola alokasi intrakurikuler jenjang/mapel (BUKAN ketentuan resmi — wajib dikonfirmasi guru sesuai KOSP & jadwal sekolah)'
      : 'Belum tersedia di preset AsesMerdeka (BUKAN ketentuan resmi) — wajib diisi & dikonfirmasi guru sesuai KOSP/jadwal sekolah',
    catatan: preset.catatanBasis,
  };
}

export function getSubjectJPConfig(profile?: AcademicProfileLike | null): SubjectJPConfig {
  const fallback = resolveDefaultSubjectJPConfig(profile);
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const key = buildSubjectJPConfigStorageKey(profile);
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SubjectJPConfig>;
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      ...fallback,
      ...parsed,
      schoolId: fallback.schoolId,
      jenjang: fallback.jenjang,
      kelas: fallback.kelas,
      mataPelajaran: fallback.mataPelajaran,
      jpPerMinggu: Math.max(1, Math.min(24, Number(parsed.jpPerMinggu) || fallback.jpPerMinggu)),
      durasiJPMinut: Math.max(20, Math.min(90, Number(parsed.durasiJPMinut) || fallback.durasiJPMinut)),
      pertemuanPerMinggu: Math.max(1, Math.min(7, Number(parsed.pertemuanPerMinggu) || fallback.pertemuanPerMinggu)),
    };
  } catch {
    return fallback;
  }
}

export function saveSubjectJPConfig(
  profile: AcademicProfileLike | null | undefined,
  config: Partial<SubjectJPConfig>,
  confirmByTeacher: boolean = false
): SubjectJPConfig {
  const current = getSubjectJPConfig(profile);
  const nowIso = new Date().toISOString();
  const next: SubjectJPConfig = {
    ...current,
    ...config,
    schoolId: current.schoolId,
    jenjang: current.jenjang,
    kelas: current.kelas,
    mataPelajaran: current.mataPelajaran,
    jpPerMinggu: Math.max(1, Math.min(24, Number(config.jpPerMinggu ?? current.jpPerMinggu) || current.jpPerMinggu)),
    durasiJPMinut: Math.max(20, Math.min(90, Number(config.durasiJPMinut ?? current.durasiJPMinut) || current.durasiJPMinut)),
    pertemuanPerMinggu: Math.max(
      1,
      Math.min(7, Number(config.pertemuanPerMinggu ?? current.pertemuanPerMinggu) || current.pertemuanPerMinggu)
    ),
    statusKonfirmasi: confirmByTeacher ? 'dikonfirmasi_sekolah' : config.statusKonfirmasi || current.statusKonfirmasi,
    updatedAt: nowIso,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const key = buildSubjectJPConfigStorageKey(profile);
      localStorage.setItem(key, JSON.stringify(next));
    }
  } catch (e) {
    console.error('Gagal menyimpan konfigurasi JP mata pelajaran:', e);
  }

  return next;
}

export function resetSubjectJPConfigToPreset(profile?: AcademicProfileLike | null): SubjectJPConfig {
  try {
    if (typeof localStorage !== 'undefined') {
      const key = buildSubjectJPConfigStorageKey(profile);
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  return resolveDefaultSubjectJPConfig(profile);
}
