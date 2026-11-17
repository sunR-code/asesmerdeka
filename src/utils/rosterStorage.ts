import type {
  KelasHarianData,
  KelasHarianDataSource,
  NilaiSiswaItem,
  SiswaItem,
  StatusKehadiran,
} from '../types/kelasHarian';
import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import {
  buildRosterStorageKey,
  resolveAcademicContext,
  type AcademicProfileLike,
} from './storageIdentity';

export interface ClassRosterRecord {
  version: 2;
  schoolId: string;
  tahunAjaran: string;
  jenjang: string;
  kelas: string;
  rombel: string;
  daftarSiswa: SiswaItem[];
  archivedSiswa?: SiswaItem[];
  isSimulated: boolean;
  dataSource: KelasHarianDataSource;
  verifiedActualAt?: string;
  updatedAt: string;
}

export function normalizeRosterList(siswaList: SiswaItem[]): SiswaItem[] {
  return (Array.isArray(siswaList) ? siswaList : []).map((s, idx) => ({
    ...s,
    noUrut: idx + 1,
    statusAktif: s.statusAktif || 'aktif',
  }));
}

export function areRostersEquivalent(a: SiswaItem[], b: SiswaItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const sa = a[i];
    const sb = b[i];
    if (
      (sa.nis || '').trim() !== (sb.nis || '').trim() ||
      (sa.nisn || '').trim() !== (sb.nisn || '').trim() ||
      (sa.nama || '').trim().toLowerCase() !== (sb.nama || '').trim().toLowerCase() ||
      sa.jenisKelamin !== sb.jenisKelamin ||
      (sa.statusAktif || 'aktif') !== (sb.statusAktif || 'aktif')
    ) {
      return false;
    }
  }
  return true;
}

export function getClassRosterRecord(
  profile?: AcademicProfileLike | null
): ClassRosterRecord | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const key = buildRosterStorageKey(profile);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClassRosterRecord>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.daftarSiswa)) {
      return null;
    }
    const ctx = resolveAcademicContext(profile);
    return {
      version: 2,
      schoolId: parsed.schoolId || ctx.schoolId,
      tahunAjaran: parsed.tahunAjaran || ctx.tahunAjaran,
      jenjang: parsed.jenjang || ctx.jenjang,
      kelas: parsed.kelas || ctx.kelas,
      rombel: parsed.rombel || ctx.rombel,
      daftarSiswa: normalizeRosterList(parsed.daftarSiswa),
      archivedSiswa: Array.isArray(parsed.archivedSiswa)
        ? parsed.archivedSiswa
        : [],
      isSimulated: parsed.dataSource === 'simulation_demo' || Boolean(parsed.isSimulated),
      dataSource: parsed.dataSource || (parsed.daftarSiswa.length === 0 ? 'empty_class' : 'user_manual'),
      verifiedActualAt: parsed.verifiedActualAt,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveClassRosterRecord(
  profile: AcademicProfileLike | null | undefined,
  params: {
    daftarSiswa: SiswaItem[];
    archivedSiswa?: SiswaItem[];
    isSimulated: boolean;
    dataSource: KelasHarianDataSource;
    verifiedActualAt?: string;
  }
): ClassRosterRecord {
  const ctx = resolveAcademicContext(profile);
  const existing = getClassRosterRecord(profile);
  const mergedArchiveMap = new Map<string, SiswaItem>();
  (existing?.archivedSiswa || []).forEach((s) => mergedArchiveMap.set(s.id, s));
  (params.archivedSiswa || []).forEach((s) => mergedArchiveMap.set(s.id, s));
  // If a student is restored back into active daftarSiswa, remove from archivedSiswa
  params.daftarSiswa.forEach((s) => {
    if ((s.statusAktif || 'aktif') === 'aktif') {
      mergedArchiveMap.delete(s.id);
    }
  });

  const record: ClassRosterRecord = {
    version: 2,
    schoolId: ctx.schoolId,
    tahunAjaran: ctx.tahunAjaran,
    jenjang: ctx.jenjang,
    kelas: ctx.kelas,
    rombel: ctx.rombel,
    daftarSiswa: normalizeRosterList(params.daftarSiswa),
    archivedSiswa: Array.from(mergedArchiveMap.values()),
    isSimulated: params.dataSource === 'simulation_demo' || params.isSimulated,
    dataSource: params.dataSource,
    verifiedActualAt: params.verifiedActualAt,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(buildRosterStorageKey(profile), JSON.stringify(record));
    }
  } catch (e) {
    console.error('Gagal menyimpan roster kelas terpusat:', e);
  }
  return record;
}

export function syncKelasHarianWithClassRoster(
  data: KelasHarianData,
  roster: ClassRosterRecord,
  tpList: CustomTPItem[],
  buildDefaultScore?: (siswa: SiswaItem, tps: CustomTPItem[]) => NilaiSiswaItem
): { synced: KelasHarianData; changed: boolean } {
  const targetStudents = normalizeRosterList(roster.daftarSiswa);
  const combinedArchive = new Map<string, SiswaItem>();
  (data.archivedSiswa || []).forEach((s) => combinedArchive.set(s.id, s));
  (roster.archivedSiswa || []).forEach((s) => combinedArchive.set(s.id, s));
  const archivedList = Array.from(combinedArchive.values());
  const archivedIdSet = new Set(archivedList.map((s) => s.id));

  const rosterMatches =
    areRostersEquivalent(data.daftarSiswa || [], targetStudents) &&
    data.daftarSiswa.length === targetStudents.length &&
    data.daftarSiswa.every((s, idx) => s.id === targetStudents[idx].id) &&
    (data.archivedSiswa || []).length === archivedList.length;

  const sourceMatches =
    data.dataSource === roster.dataSource &&
    Boolean(data.isSimulated) === Boolean(roster.isSimulated) &&
    (data.verifiedActualAt || '') === (roster.verifiedActualAt || '');

  if (rosterMatches && sourceMatches) {
    return { synced: data, changed: false };
  }

  const nextPresensi = (data.daftarPresensi || []).map((p) => {
    const newStatusMap: { [siswaId: string]: StatusKehadiran } = {};
    targetStudents.forEach((s) => {
      newStatusMap[s.id] = p.statusMap?.[s.id] || 'H';
    });
    // Pertahankan riwayat presensi bagi siswa mutasi/arsip jika tercatat sebelumnya
    archivedIdSet.forEach((archId) => {
      if (p.statusMap?.[archId]) {
        newStatusMap[archId] = p.statusMap[archId];
      }
    });
    return {
      ...p,
      statusMap: newStatusMap,
    };
  });

  const existingById = new Map<string, NilaiSiswaItem>();
  const existingByIdentity = new Map<string, NilaiSiswaItem>();
  (data.daftarNilai || []).forEach((n) => {
    existingById.set(n.siswaId, n);
    existingByIdentity.set(`${(n.nis || '').trim()}|${(n.nama || '').trim().toLowerCase()}`, n);
  });

  const nextNilai: NilaiSiswaItem[] = targetStudents.map((siswa) => {
    const matched =
      existingById.get(siswa.id) ||
      existingByIdentity.get(`${(siswa.nis || '').trim()}|${(siswa.nama || '').trim().toLowerCase()}`);

    if (matched) {
      return {
        ...matched,
        siswaId: siswa.id,
        nama: siswa.nama,
        nis: siswa.nis,
        nisn: siswa.nisn ?? matched.nisn,
      };
    }

    if (buildDefaultScore) {
      return buildDefaultScore(siswa, tpList);
    }

    const emptyFormatif: { [tpKey: string]: number } = {};
    return {
      siswaId: siswa.id,
      nama: siswa.nama,
      nis: siswa.nis,
      nisn: siswa.nisn,
      nilaiFormatif: emptyFormatif,
      nilaiSTS: null,
      nilaiSAS: null,
      nilaiPraktik: null,
      nilaiAkhir: null,
      predikatKKTP: 'Belum Dinilai',
      statusNilai: 'belum_dinilai',
      statusRapor: 'belum_lengkap',
      deskripsiRapor: `Data penilaian untuk ${siswa.nama} belum diinput.`,
    };
  });

  // Pertahankan catatan nilai historis milik siswa yang sudah diarsipkan/mutasi
  const targetIdSet = new Set(targetStudents.map((s) => s.id));
  (data.daftarNilai || []).forEach((n) => {
    if (archivedIdSet.has(n.siswaId) && !targetIdSet.has(n.siswaId)) {
      nextNilai.push(n);
    }
  });

  return {
    changed: true,
    synced: {
      ...data,
      isSimulated: roster.dataSource === 'simulation_demo',
      dataSource: roster.dataSource,
      verifiedActualAt: roster.verifiedActualAt,
      daftarSiswa: targetStudents,
      archivedSiswa: archivedList,
      daftarPresensi: nextPresensi,
      daftarNilai: nextNilai,
    },
  };
}

export function buildRosterOwnershipLabel(profile: SchoolProfile): string {
  return `${profile.namaSekolah || 'Sekolah Aktif'} · TA ${profile.tahunAjaran} · ${profile.jenjang} Kelas ${profile.kelasUtama} (${profile.rombelAktif})`;
}
