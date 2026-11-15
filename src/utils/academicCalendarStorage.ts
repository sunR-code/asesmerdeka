import type {
  PromesWeekCategory,
  SemesterAcademicCalendar,
} from '../types/academicSchedule';
import type { PromesMingguColumn } from '../types/perangkatAjar';
import {
  buildAcademicCalendarStorageKey,
  buildPromesScheduleStorageKey,
  resolveAcademicContext,
  resolveSemesterCode,
  type AcademicProfileLike,
} from './storageIdentity';

const BULAN_INDO = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function parseAcademicYearSpan(tahunAjaran?: string): { startYear: number; endYear: number } {
  const raw = (tahunAjaran || '').trim();
  const match = raw.match(/(\d{4})\s*[/-]\s*(\d{4})/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);
    if (startYear >= 2000 && endYear >= startYear) {
      return { startYear, endYear };
    }
  }
  const single = raw.match(/(\d{4})/);
  if (single) {
    const y = parseInt(single[1], 10);
    return { startYear: y, endYear: y + 1 };
  }
  return { startYear: 2026, endYear: 2027 };
}

function makeUTCDate(year: number, month1Based: number, day: number): Date {
  return new Date(Date.UTC(year, month1Based - 1, day));
}

export function parseISODateUTC(iso: string | undefined | null): Date | null {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const dt = makeUTCDate(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function formatISODateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysUTC(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/**
 * Mencari tanggal hari Senin ke-N pada bulan tertentu (1-based).
 */
function nthMondayOfMonth(year: number, month1Based: number, nth: number): Date {
  const firstDay = makeUTCDate(year, month1Based, 1);
  const dow = firstDay.getUTCDay(); // 0=Sun..6=Sat
  const offsetToMon = (1 - dow + 7) % 7;
  const firstMonday = addDaysUTC(firstDay, offsetToMon);
  return addDaysUTC(firstMonday, (nth - 1) * 7);
}

function lastDayOfMonth(year: number, month1Based: number): Date {
  return new Date(Date.UTC(year, month1Based, 0));
}

/**
 * Membuat template kalender awal per semester berbasis tanggal nyata Tahun Ajaran.
 * Status awal selalu 'template_belum_dikonfirmasi' — tidak mengklaim sebagai kalender resmi sekolah,
 * dan tidak menyuntikkan hari libur keagamaan tetap secara hardcoded (seperti Idul Fitri April M2).
 */
export function createDefaultSemesterCalendarTemplate(
  profile?: AcademicProfileLike | null,
  semesterOverride?: string
): SemesterAcademicCalendar {
  const ctx = resolveAcademicContext(profile);
  const semCode = semesterOverride ? resolveSemesterCode(semesterOverride) : ctx.semesterCode;
  const semesterLabel: '1 (Ganjil)' | '2 (Genap)' = semCode === 'sem2' ? '2 (Genap)' : '1 (Ganjil)';
  const { startYear, endYear } = parseAcademicYearSpan(ctx.tahunAjaran);

  if (semCode === 'sem1') {
    const startMon = nthMondayOfMonth(startYear, 7, 2); // Senin ke-2 Juli
    const mplsEnd = addDaysUTC(startMon, 2); // 3 hari MPLS (Sen-Rab)
    const stsMon = nthMondayOfMonth(startYear, 9, 4); // Senin ke-4 September
    const stsFri = addDaysUTC(stsMon, 4);
    const sasMon = nthMondayOfMonth(startYear, 12, 1); // Senin ke-1 Desember
    const sasFri = addDaysUTC(sasMon, 4);
    const raporFri = addDaysUTC(nthMondayOfMonth(startYear, 12, 3), 4); // Jumat pekan ke-3 Des
    const breakStart = addDaysUTC(raporFri, 1);
    const breakEnd = lastDayOfMonth(startYear, 12);

    return {
      schoolId: ctx.schoolId,
      tahunAjaran: ctx.tahunAjaran,
      semester: semesterLabel,
      statusKonfirmasi: 'template_belum_dikonfirmasi',
      hariSekolahPerMinggu: 5,
      tanggalMulaiSemester: formatISODateUTC(startMon),
      tanggalAkhirSemester: formatISODateUTC(raporFri),
      mplsRange: {
        startDate: formatISODateUTC(startMon),
        endDate: formatISODateUTC(mplsEnd),
        label: 'MPLS / Masa Pengenalan Lingkungan Sekolah',
      },
      stsRange: {
        startDate: formatISODateUTC(stsMon),
        endDate: formatISODateUTC(stsFri),
        label: 'Sumatif Tengah Semester (STS)',
      },
      sasRange: {
        startDate: formatISODateUTC(sasMon),
        endDate: formatISODateUTC(sasFri),
        label: 'Sumatif Akhir Semester (SAS)',
      },
      pembagianRaporDate: formatISODateUTC(raporFri),
      liburSekolah: [
        {
          id: 'lib_akhir_sem1',
          nama: 'Libur Akhir Semester Ganjil',
          startDate: formatISODateUTC(breakStart),
          endDate: formatISODateUTC(breakEnd),
          kategori: 'libur_sekolah',
          blokirPembelajaran: true,
        },
      ],
      liburNasionalKeagamaan: [],
      kegiatanKhususSekolah: [],
      manualWeekOverrides: {},
      catatanKalender:
        'Template estimasi awal Semester 1 (belum dikonfirmasi). Mohon sesuaikan tanggal mulai/akhir, STS, SAS, libur nasional/keagamaan sesuai SKB 3 Menteri & Kalender Pendidikan Dinas/Madrasah setempat.',
    };
  }

  // Semester 2 (Genap)
  const startMon = nthMondayOfMonth(endYear, 1, 1); // Senin ke-1 Januari
  const stsMon = nthMondayOfMonth(endYear, 3, 2); // Senin ke-2 Maret
  const stsFri = addDaysUTC(stsMon, 4);
  const sasMon = nthMondayOfMonth(endYear, 6, 1); // Senin ke-1 Juni
  const sasFri = addDaysUTC(sasMon, 4);
  const raporFri = addDaysUTC(nthMondayOfMonth(endYear, 6, 3), 4); // Jumat pekan ke-3 Juni
  const breakStart = addDaysUTC(raporFri, 1);
  const breakEnd = lastDayOfMonth(endYear, 6);

  return {
    schoolId: ctx.schoolId,
    tahunAjaran: ctx.tahunAjaran,
    semester: semesterLabel,
    statusKonfirmasi: 'template_belum_dikonfirmasi',
    hariSekolahPerMinggu: 5,
    tanggalMulaiSemester: formatISODateUTC(startMon),
    tanggalAkhirSemester: formatISODateUTC(raporFri),
    mplsRange: null,
    stsRange: {
      startDate: formatISODateUTC(stsMon),
      endDate: formatISODateUTC(stsFri),
      label: 'Sumatif Tengah Semester (STS)',
    },
    sasRange: {
      startDate: formatISODateUTC(sasMon),
      endDate: formatISODateUTC(sasFri),
      label: 'Sumatif Akhir Tahun (SAT / SAS)',
    },
    pembagianRaporDate: formatISODateUTC(raporFri),
    liburSekolah: [
      {
        id: 'lib_akhir_sem2',
        nama: 'Libur Akhir Tahun / Kenaikan Kelas',
        startDate: formatISODateUTC(breakStart),
        endDate: formatISODateUTC(breakEnd),
        kategori: 'libur_sekolah',
        blokirPembelajaran: true,
      },
    ],
    liburNasionalKeagamaan: [],
    kegiatanKhususSekolah: [],
    manualWeekOverrides: {},
    catatanKalender:
      'Template estimasi awal Semester 2 (belum dikonfirmasi). Libur hari besar keagamaan/nasional (termasuk Idul Fitri, Nyepi, Wafat Isa Almasih, dll.) tidak di-hardcode dan harus diisi sesuai tahun berjalan.',
  };
}

function isDateBetween(dateStr: string, startStr?: string, endStr?: string): boolean {
  if (!startStr || !endStr) return false;
  const s = startStr <= endStr ? startStr : endStr;
  const e = startStr <= endStr ? endStr : startStr;
  return dateStr >= s && dateStr <= e;
}

interface DayClassification {
  blocked: boolean;
  kategori: PromesWeekCategory;
  label: string;
}

function classifySchoolDay(dateStr: string, cal: SemesterAcademicCalendar): DayClassification {
  // 1. Cek di luar batas tanggal semester aktif (normalisasi jika urutan tanggal tertukar)
  const rawStart = cal.tanggalMulaiSemester || '';
  const rawEnd = cal.tanggalAkhirSemester || '';
  const effStart = rawStart && rawEnd && rawStart > rawEnd ? rawEnd : rawStart;
  const effEnd = rawStart && rawEnd && rawStart > rawEnd ? rawStart : rawEnd;

  if (effStart && dateStr < effStart) {
    return { blocked: true, kategori: 'non_efektif', label: 'Belum Masuk Sem.' };
  }
  if (effEnd && dateStr > effEnd) {
    // Cek apakah termasuk libur sekolah terkonfigurasi
    const libEnd = cal.liburSekolah.find((ev) => isDateBetween(dateStr, ev.startDate, ev.endDate));
    return {
      blocked: true,
      kategori: 'libur_sekolah',
      label: libEnd ? libEnd.nama : 'Libur Semester',
    };
  }

  // 2. Cek Libur Nasional & Keagamaan (prioritas tinggi agar libur tidak pernah dianggap efektif)
  for (const ev of cal.liburNasionalKeagamaan || []) {
    if (ev.blokirPembelajaran !== false && isDateBetween(dateStr, ev.startDate, ev.endDate)) {
      return { blocked: true, kategori: 'libur_nasional', label: ev.nama || 'Libur Nasional' };
    }
  }

  // 3. Cek Libur Sekolah
  for (const ev of cal.liburSekolah || []) {
    if (ev.blokirPembelajaran !== false && isDateBetween(dateStr, ev.startDate, ev.endDate)) {
      return { blocked: true, kategori: 'libur_sekolah', label: ev.nama || 'Libur Sekolah' };
    }
  }

  // 4. Cek MPLS
  if (cal.mplsRange && isDateBetween(dateStr, cal.mplsRange.startDate, cal.mplsRange.endDate)) {
    return { blocked: true, kategori: 'mpls', label: cal.mplsRange.label || 'MPLS' };
  }

  // 5. Cek STS & SAS
  if (cal.stsRange && isDateBetween(dateStr, cal.stsRange.startDate, cal.stsRange.endDate)) {
    return { blocked: true, kategori: 'sts', label: cal.stsRange.label || 'STS' };
  }
  if (cal.sasRange && isDateBetween(dateStr, cal.sasRange.startDate, cal.sasRange.endDate)) {
    return { blocked: true, kategori: 'sas', label: cal.sasRange.label || 'SAS' };
  }

  // 6. Cek Pembagian Rapor
  if (cal.pembagianRaporDate && dateStr === cal.pembagianRaporDate) {
    return { blocked: true, kategori: 'rapor', label: 'Pembagian Rapor' };
  }

  // 7. Cek Kegiatan Khusus Sekolah
  for (const ev of cal.kegiatanKhususSekolah || []) {
    if (isDateBetween(dateStr, ev.startDate, ev.endDate)) {
      if (ev.blokirPembelajaran) {
        return { blocked: true, kategori: 'kegiatan_khusus', label: ev.nama || 'Kegiatan Sekolah' };
      }
      return { blocked: false, kategori: 'efektif', label: ev.nama || 'Kegiatan Sekolah' };
    }
  }

  return { blocked: false, kategori: 'efektif', label: '' };
}

function compactWeekLabel(label: string, kategori: PromesWeekCategory): string {
  const trimmed = (label || '').trim();
  if (!trimmed) {
    if (kategori === 'mpls') return 'MPLS';
    if (kategori === 'sts') return 'STS';
    if (kategori === 'sas') return 'SAS';
    if (kategori === 'rapor') return 'Rapor';
    if (kategori === 'libur_nasional') return 'Libur Nas.';
    if (kategori === 'libur_sekolah') return 'Libur Sek.';
    if (kategori === 'kegiatan_khusus') return 'Kegiatan';
    return 'Non-Efektif';
  }
  return trimmed;
}

/**
 * Menghasilkan kolom-kolom minggu kalender Promes secara deterministik dari SemesterAcademicCalendar.
 * Menggunakan aturan ISO Thursday sehingga setiap minggu kalender hanya dimiliki oleh tepat 1 bulan.
 */
export function generateSemesterWeekColumns(
  calendar: SemesterAcademicCalendar,
  jpPerMinggu: number
): PromesMingguColumn[] {
  const { startYear, endYear } = parseAcademicYearSpan(calendar.tahunAjaran);
  const isSem2 = resolveSemesterCode(calendar.semester) === 'sem2';
  const targetYear = isSem2 ? endYear : startYear;
  const startMonth = isSem2 ? 1 : 7;
  const endMonth = isSem2 ? 6 : 12;

  const defaultStart = makeUTCDate(targetYear, startMonth, 1);
  const defaultEnd = lastDayOfMonth(targetYear, endMonth);

  // Dukung kalender kustom lintas bulan/lintas tahun (dibatasi aman ±90 hari dari rentang bawaan)
  const parsedStartRaw = parseISODateUTC(calendar.tanggalMulaiSemester);
  const parsedEndRaw = parseISODateUTC(calendar.tanggalAkhirSemester);
  let semStartDate = parsedStartRaw;
  let semEndDate = parsedEndRaw;
  if (semStartDate && semEndDate && semStartDate > semEndDate) {
    [semStartDate, semEndDate] = [semEndDate, semStartDate];
  }
  const minClamped = addDaysUTC(defaultStart, -90);
  const maxClamped = addDaysUTC(defaultEnd, 90);
  const clampedStart =
    semStartDate && semStartDate >= minClamped && semStartDate <= maxClamped ? semStartDate : null;
  const clampedEnd =
    semEndDate && semEndDate >= minClamped && semEndDate <= maxClamped ? semEndDate : null;

  const loopStart = clampedStart && clampedStart < defaultStart ? clampedStart : defaultStart;
  const loopEnd = clampedEnd && clampedEnd > defaultEnd ? clampedEnd : defaultEnd;

  // Cari hari Senin pada pekan yang memuat tanggal awal loop
  const firstDow = loopStart.getUTCDay(); // 0=Sun..6=Sat
  const offsetToMonday = firstDow === 0 ? -6 : 1 - firstDow;
  let curMonday = addDaysUTC(loopStart, offsetToMonday);

  const monthWeekCounter: Record<string, number> = {};
  const columns: PromesMingguColumn[] = [];
  const hariNormal = calendar.hariSekolahPerMinggu === 6 ? 6 : 5;
  const safeJPPerWeek = Math.max(1, Number(jpPerMinggu) || 2);

  let semesterWeekNumber = 1;
  while (true) {
    const thursday = addDaysUTC(curMonday, 3);
    const weekLastSchoolDay = addDaysUTC(curMonday, hariNormal - 1);
    if (thursday > loopEnd && curMonday > loopEnd) break;

    const thuYear = thursday.getUTCFullYear();
    const thuMonth = thursday.getUTCMonth() + 1;
    const inDefaultSemesterWindow =
      thuYear === targetYear && thuMonth >= startMonth && thuMonth <= endMonth;
    const overlapsCustomSemesterDates = Boolean(
      (clampedStart || clampedEnd) &&
        weekLastSchoolDay >= (clampedStart || defaultStart) &&
        curMonday <= (clampedEnd || defaultEnd)
    );

    if (inDefaultSemesterWindow || overlapsCustomSemesterDates) {
      const monthCounterKey = `${thuYear}-${thuMonth}`;
      monthWeekCounter[monthCounterKey] = (monthWeekCounter[monthCounterKey] || 0) + 1;
      const mingguKe = monthWeekCounter[monthCounterKey];
      const bulanNama = BULAN_INDO[thuMonth - 1];
      const weekKey = `${thuYear}-${String(thuMonth).padStart(2, '0')}-W${mingguKe}`;
      const weekStartStr = formatISODateUTC(curMonday);
      const weekEndStr = formatISODateUTC(weekLastSchoolDay);

      let blockedDays = 0;
      const categoryCounts: Record<PromesWeekCategory, number> = {
        efektif: 0,
        mpls: 0,
        sts: 0,
        sas: 0,
        rapor: 0,
        libur_sekolah: 0,
        libur_nasional: 0,
        kegiatan_khusus: 0,
        non_efektif: 0,
      };
      const blockedLabels: string[] = [];
      const nonBlockingEventLabels: string[] = [];

      for (let d = 0; d < hariNormal; d++) {
        const dayStr = formatISODateUTC(addDaysUTC(curMonday, d));
        const res = classifySchoolDay(dayStr, calendar);
        if (res.blocked) {
          blockedDays++;
          categoryCounts[res.kategori]++;
          if (res.label && !blockedLabels.includes(res.label)) {
            blockedLabels.push(res.label);
          }
        } else {
          categoryCounts.efektif++;
          if (res.label && !nonBlockingEventLabels.includes(res.label)) {
            nonBlockingEventLabels.push(res.label);
          }
        }
      }

      const hariEfektif = Math.max(0, hariNormal - blockedDays);
      const halfThreshold = Math.ceil(hariNormal / 2);

      // Tentukan kategori dominan bila diblokir
      let dominantCat: PromesWeekCategory = 'efektif';
      let maxCatCount = 0;
      const priorityCats: PromesWeekCategory[] = [
        'libur_nasional',
        'libur_sekolah',
        'mpls',
        'sts',
        'sas',
        'rapor',
        'kegiatan_khusus',
        'non_efektif',
      ];
      for (const cat of priorityCats) {
        if (categoryCounts[cat] > maxCatCount) {
          maxCatCount = categoryCounts[cat];
          dominantCat = cat;
        }
      }

      let isEfektif = blockedDays < halfThreshold && hariEfektif > 0;
      let kategoriMinggu: PromesWeekCategory = isEfektif ? 'efektif' : dominantCat;
      let labelKegiatan: string | undefined = isEfektif
        ? nonBlockingEventLabels.length > 0
          ? nonBlockingEventLabels.join(', ')
          : undefined
        : compactWeekLabel(blockedLabels.join(' / '), dominantCat);

      let catatanHariLibur: string | undefined =
        isEfektif && blockedDays > 0 && blockedLabels.length > 0
          ? `${blockedDays}h libur/agenda (${blockedLabels.join(', ')})`
          : nonBlockingEventLabels.length > 0
          ? nonBlockingEventLabels.join(', ')
          : undefined;

      // Penyesuaian manual minggu oleh guru (override)
      const override = calendar.manualWeekOverrides?.[weekKey];
      if (override) {
        isEfektif = override.isEfektif;
        if (!isEfektif) {
          kategoriMinggu = override.kategori || 'non_efektif';
          labelKegiatan = override.labelKegiatan?.trim() || blockedLabels.join(' / ') || 'Non-Efektif (Manual)';
        } else {
          kategoriMinggu = 'efektif';
          labelKegiatan = override.labelKegiatan?.trim() || undefined;
          catatanHariLibur = blockedLabels.length > 0 ? `Penyesuaian manual (catatan kalender: ${blockedLabels.join(', ')})` : undefined;
        }
      }

      let kapasitasJP = 0;
      if (isEfektif) {
        if (override && override.isEfektif) {
          kapasitasJP = safeJPPerWeek;
        } else if (hariEfektif === hariNormal) {
          kapasitasJP = safeJPPerWeek;
        } else {
          kapasitasJP = Math.max(1, Math.floor((safeJPPerWeek * hariEfektif) / hariNormal));
        }
      }

      columns.push({
        weekKey,
        semesterWeekNumber,
        bulanNama,
        mingguKe,
        startDate: weekStartStr,
        endDate: weekEndStr,
        isEfektif,
        kategoriMinggu,
        labelKegiatan,
        kapasitasJP,
        hariEfektif: isEfektif ? Math.max(1, hariEfektif) : 0,
        hariSekolahNormal: hariNormal,
        catatanHariLibur,
      });
      semesterWeekNumber++;
    }

    curMonday = addDaysUTC(curMonday, 7);
  }

  return columns;
}

export function getAcademicCalendarForContext(
  profile?: AcademicProfileLike | null,
  semesterOverride?: string
): SemesterAcademicCalendar {
  const template = createDefaultSemesterCalendarTemplate(profile, semesterOverride);
  try {
    if (typeof localStorage === 'undefined') return template;
    const key = buildAcademicCalendarStorageKey(profile, semesterOverride);
    const raw = localStorage.getItem(key);
    if (!raw) return template;
    const parsed = JSON.parse(raw) as Partial<SemesterAcademicCalendar>;
    if (!parsed || typeof parsed !== 'object') return template;
    return {
      ...template,
      ...parsed,
      schoolId: template.schoolId,
      tahunAjaran: template.tahunAjaran,
      semester: template.semester,
      liburSekolah: Array.isArray(parsed.liburSekolah) ? parsed.liburSekolah : template.liburSekolah,
      liburNasionalKeagamaan: Array.isArray(parsed.liburNasionalKeagamaan)
        ? parsed.liburNasionalKeagamaan
        : template.liburNasionalKeagamaan,
      kegiatanKhususSekolah: Array.isArray(parsed.kegiatanKhususSekolah)
        ? parsed.kegiatanKhususSekolah
        : template.kegiatanKhususSekolah,
      manualWeekOverrides:
        parsed.manualWeekOverrides && typeof parsed.manualWeekOverrides === 'object'
          ? parsed.manualWeekOverrides
          : {},
    };
  } catch {
    return template;
  }
}

export function saveAcademicCalendar(
  profile: AcademicProfileLike | null | undefined,
  calendar: SemesterAcademicCalendar,
  confirmSchoolOfficial: boolean = false
): SemesterAcademicCalendar {
  const ctx = resolveAcademicContext(profile);
  const nowIso = new Date().toISOString();
  const normalized: SemesterAcademicCalendar = {
    ...calendar,
    schoolId: ctx.schoolId,
    tahunAjaran: ctx.tahunAjaran,
    semester: resolveSemesterCode(calendar.semester) === 'sem2' ? '2 (Genap)' : '1 (Ganjil)',
    statusKonfirmasi: confirmSchoolOfficial ? 'dikonfirmasi_sekolah' : calendar.statusKonfirmasi,
    confirmedAt: confirmSchoolOfficial ? nowIso : calendar.confirmedAt,
    updatedAt: nowIso,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const key = buildAcademicCalendarStorageKey(profile, normalized.semester);
      localStorage.setItem(key, JSON.stringify(normalized));
    }
  } catch (e) {
    console.error('Gagal menyimpan kalender akademik:', e);
  }
  return normalized;
}

export function resetAcademicCalendarToTemplate(
  profile?: AcademicProfileLike | null,
  semesterOverride?: string
): SemesterAcademicCalendar {
  try {
    if (typeof localStorage !== 'undefined') {
      const key = buildAcademicCalendarStorageKey(profile, semesterOverride);
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  return createDefaultSemesterCalendarTemplate(profile, semesterOverride);
}

/**
 * Penyimpanan penyesuaian manual distribusi JP Promes per TP (diindeks oleh immutable tpId -> weekKey -> JP).
 */
export type PromesManualOverridesMap = Record<string, Record<string, number>>;

export function getPromesManualOverrides(profile?: AcademicProfileLike | null): PromesManualOverridesMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const key = buildPromesScheduleStorageKey(profile);
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PromesManualOverridesMap) : {};
  } catch {
    return {};
  }
}

export function savePromesManualOverrides(
  profile: AcademicProfileLike | null | undefined,
  overrides: PromesManualOverridesMap
): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = buildPromesScheduleStorageKey(profile);
    localStorage.setItem(key, JSON.stringify(overrides));
  } catch (e) {
    console.error('Gagal menyimpan penyesuaian manual Promes:', e);
  }
}

export function clearPromesManualOverrides(profile?: AcademicProfileLike | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = buildPromesScheduleStorageKey(profile);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
