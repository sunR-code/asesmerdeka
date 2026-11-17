import type { JenjangFase } from '../types/assessment';
import { getSavedCPEntries, cpEntryToReferenceMeta } from './cpStorage';
import { isSameFase, normalizeFaseShortLabel } from './atpSequencingEngine';
import {
  type CPReferenceMeta,
  type CustomTPItem,
  type SchoolProfile,
  getSavedCustomTPList,
  jenjangToDefaultFase,
  saveCustomTPList,
} from './schoolProfileStorage';
import {
  ATP_STORAGE_V2_KEY,
  type AcademicProfileLike,
  buildCPScopeKey,
  createCustomImmutableTPId,
  resolveAcademicContext,
  resolveSemesterCode,
} from './storageIdentity';

export interface ATPAllocationMapping {
  tpId: string;
  tahunAjaran: string;
  kelas: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  alokasiJP?: number;
}

export interface PhaseATPPlan {
  id: string;
  schoolId?: string;
  satuanPendidikan: string;
  jenjang: string;
  fase: string;
  mataPelajaran: string;
  referensiCP?: CPReferenceMeta;
  cpEntryIds?: string[];
  orderedTpIds: string[];
  previousOrderedTpIds?: string[];
  allocations: ATPAllocationMapping[];
  statusPenyusunan: 'draft' | 'disetujui';
  versi: number;
  tanggalDisusun: string;
  updatedAt: string;
  catatanGuru?: string;
}

export function listGradeLevelsInFase(jenjang: string, fase: string): string[] {
  const norm = normalizeFaseShortLabel(fase);
  if (norm === 'fase a') return ['1', '2'];
  if (norm === 'fase b') return ['3', '4'];
  if (norm === 'fase c') return ['5', '6'];
  if (norm === 'fase d') return ['7', '8', '9'];
  if (norm === 'fase e') return ['10'];
  if (norm === 'fase f') return ['11', '12'];
  if (jenjang.includes('SD')) return ['1', '2', '3', '4', '5', '6'];
  if (jenjang.includes('SMP')) return ['7', '8', '9'];
  return ['10', '11', '12'];
}

function readAllATPScopeMap(): Record<string, PhaseATPPlan> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(ATP_STORAGE_V2_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, PhaseATPPlan>)
      : {};
  } catch {
    return {};
  }
}

function writeAllATPScopeMap(map: Record<string, PhaseATPPlan>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ATP_STORAGE_V2_KEY, JSON.stringify(map));
}

export function getSavedPhaseATPPlan(
  profile?: AcademicProfileLike | null,
  explicitFase?: string
): PhaseATPPlan | null {
  const scopeKey = buildCPScopeKey(profile, explicitFase);
  const allMap = readAllATPScopeMap();
  const entry = allMap[scopeKey];
  if (!entry || typeof entry !== 'object' || !Array.isArray(entry.orderedTpIds)) {
    return null;
  }
  return entry;
}

export function savePhaseATPPlan(
  profile: AcademicProfileLike | null | undefined,
  plan: PhaseATPPlan,
  explicitFase?: string
): PhaseATPPlan {
  const scopeKey = buildCPScopeKey(profile, explicitFase || plan.fase);
  const allMap = readAllATPScopeMap();
  const cleanOrderedIds = Array.from(
    new Set((plan.orderedTpIds || []).map((id) => String(id).trim()).filter(Boolean))
  );

  // Jaga agar tidak ada duplikasi pemetaan tpId pada tahun ajaran yang sama
  const seenAlloc = new Set<string>();
  const cleanAllocations: ATPAllocationMapping[] = [];
  for (const alloc of plan.allocations || []) {
    if (!alloc?.tpId) continue;
    const dedupKey = `${alloc.tpId}::${alloc.tahunAjaran}`;
    if (seenAlloc.has(dedupKey)) continue;
    seenAlloc.add(dedupKey);
    cleanAllocations.push({
      tpId: alloc.tpId,
      tahunAjaran: alloc.tahunAjaran,
      kelas: alloc.kelas,
      semester: alloc.semester,
      ...(alloc.alokasiJP !== undefined ? { alokasiJP: Number(alloc.alokasiJP) || 0 } : {}),
    });
  }

  const sanitized: PhaseATPPlan = {
    ...plan,
    orderedTpIds: cleanOrderedIds,
    allocations: cleanAllocations,
    updatedAt: new Date().toISOString(),
  };

  allMap[scopeKey] = sanitized;
  writeAllATPScopeMap(allMap);
  return sanitized;
}

export interface PhaseCollectedTPResult {
  tpItems: CustomTPItem[];
  tpById: Map<string, CustomTPItem>;
  originByTpId: Map<string, { kelas: string; semester: '1 (Ganjil)' | '2 (Genap)'; tahunAjaran: string }>;
}

/**
 * Mengumpulkan seluruh TP dalam satu fase (lintas kelas dan semester dalam fase yang sama)
 * tanpa menduplikasi TP maupun mencampurkan TP dari fase lain.
 */
export function collectPhaseTPItems(
  profile: SchoolProfile,
  activeTpList: CustomTPItem[],
  explicitFase?: string
): PhaseCollectedTPResult {
  const targetFase = explicitFase || jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const tpById = new Map<string, CustomTPItem>();
  const tpItems: CustomTPItem[] = [];
  const originByTpId = new Map<
    string,
    { kelas: string; semester: '1 (Ganjil)' | '2 (Genap)'; tahunAjaran: string }
  >();

  const registerItem = (
    tp: CustomTPItem,
    origin: { kelas: string; semester: '1 (Ganjil)' | '2 (Genap)'; tahunAjaran: string }
  ) => {
    if (!tp) return;
    if (tp.referensiCP?.fase && !isSameFase(targetFase, tp.referensiCP.fase)) {
      return; // Cegah pencampuran TP fase berbeda
    }
    const stableId = tp.id && tp.id.trim() ? tp.id.trim() : createCustomImmutableTPId(profile);
    const normalized: CustomTPItem = stableId === tp.id ? tp : { ...tp, id: stableId };
    if (!tpById.has(stableId)) {
      tpById.set(stableId, normalized);
      tpItems.push(normalized);
      originByTpId.set(stableId, origin);
    }
  };

  const activeSem: '1 (Ganjil)' | '2 (Genap)' = resolveSemesterCode(profile.semester) === 'sem2'
    ? '2 (Genap)'
    : '1 (Ganjil)';
  const activeKelasClean = (profile.kelasUtama || '').trim().toLowerCase();

  // Kumpulkan TP secara kronologis per tingkat kelas & semester dalam satu fase yang sama
  const gradesInFase = listGradeLevelsInFase(profile.jenjang, targetFase);
  const semesters: Array<'1 (Ganjil)' | '2 (Genap)'> = ['1 (Ganjil)', '2 (Genap)'];
  for (const grade of gradesInFase) {
    for (const sem of semesters) {
      const isCurrentActiveSlot =
        grade.toLowerCase() === activeKelasClean && sem === activeSem;
      if (isCurrentActiveSlot && activeTpList.length > 0) {
        for (const tp of activeTpList) {
          registerItem(tp, {
            kelas: profile.kelasUtama,
            semester: activeSem,
            tahunAjaran: profile.tahunAjaran,
          });
        }
        continue;
      }

      const saved = getSavedCustomTPList(
        profile.mataPelajaranUtama,
        grade,
        sem,
        {
          ...profile,
          kelasUtama: grade,
          semester: sem,
        }
      );
      if (Array.isArray(saved)) {
        for (const tp of saved) {
          registerItem(tp, {
            kelas: grade,
            semester: sem,
            tahunAjaran: profile.tahunAjaran,
          });
        }
      }
    }
  }

  for (const tp of activeTpList) {
    registerItem(tp, {
      kelas: profile.kelasUtama,
      semester: activeSem,
      tahunAjaran: profile.tahunAjaran,
    });
  }

  return { tpItems, tpById, originByTpId };
}

export function initializeOrSyncPhaseATPPlan(
  profile: SchoolProfile,
  activeTpList: CustomTPItem[],
  defaultRefCP?: CPReferenceMeta,
  explicitFase?: string
): PhaseATPPlan {
  const ctx = resolveAcademicContext(profile, explicitFase);
  const targetFase = (explicitFase || ctx.fase) as JenjangFase;
  const collected = collectPhaseTPItems(profile, activeTpList, targetFase);
  const existing = getSavedPhaseATPPlan(profile, targetFase);
  const savedCPs = getSavedCPEntries(profile, targetFase);
  const resolvedRefCP =
    (savedCPs[0] ? cpEntryToReferenceMeta(savedCPs[0]) : undefined) ||
    existing?.referensiCP ||
    activeTpList.find((t) => t.referensiCP)?.referensiCP ||
    defaultRefCP;

  const existingOrdered = existing?.orderedTpIds.filter((id) => collected.tpById.has(id)) || [];
  const missingFromOrder = collected.tpItems
    .map((t) => t.id)
    .filter((id) => !existingOrdered.includes(id));

  const nextOrderedTpIds =
    existingOrdered.length > 0 ? [...existingOrdered, ...missingFromOrder] : collected.tpItems.map((t) => t.id);

  const allocMap = new Map<string, ATPAllocationMapping>();
  for (const a of existing?.allocations || []) {
    if (collected.tpById.has(a.tpId)) {
      allocMap.set(`${a.tpId}::${a.tahunAjaran}`, a);
    }
  }
  for (const tp of collected.tpItems) {
    const key = `${tp.id}::${ctx.tahunAjaran}`;
    if (!allocMap.has(key)) {
      const orig = collected.originByTpId.get(tp.id);
      allocMap.set(key, {
        tpId: tp.id,
        tahunAjaran: orig?.tahunAjaran || ctx.tahunAjaran,
        kelas: orig?.kelas || ctx.kelas,
        semester: orig?.semester || (ctx.semesterCode === 'sem2' ? '2 (Genap)' : '1 (Ganjil)'),
        alokasiJP: Number(tp.alokasiJP) || 12,
      });
    }
  }

  const now = new Date().toISOString();
  const base: PhaseATPPlan = existing
    ? {
        ...existing,
        satuanPendidikan: profile.namaSekolah || existing.satuanPendidikan,
        referensiCP: resolvedRefCP || existing.referensiCP,
        cpEntryIds: savedCPs.length > 0 ? savedCPs.map((c) => c.id) : existing.cpEntryIds,
        orderedTpIds: nextOrderedTpIds,
        allocations: Array.from(allocMap.values()),
      }
    : {
        id: `atp_fase_${Date.now().toString(36)}`,
        schoolId: ctx.schoolId,
        satuanPendidikan: profile.namaSekolah || '',
        jenjang: profile.jenjang,
        fase: targetFase,
        mataPelajaran: profile.mataPelajaranUtama,
        referensiCP: resolvedRefCP,
        cpEntryIds: savedCPs.map((c) => c.id),
        orderedTpIds: nextOrderedTpIds,
        allocations: Array.from(allocMap.values()),
        statusPenyusunan: 'draft',
        versi: 1,
        tanggalDisusun: now,
        updatedAt: now,
      };

  return base;
}

export function applyPhaseOrderAndPersist(params: {
  profile: SchoolProfile;
  currentPlan: PhaseATPPlan;
  nextOrderedTpIds: string[];
  activeTpList: CustomTPItem[];
  savePreviousForUndo?: boolean;
}): {
  updatedPlan: PhaseATPPlan;
  updatedActiveTpList: CustomTPItem[];
} {
  const { profile, currentPlan, nextOrderedTpIds, activeTpList, savePreviousForUndo = true } = params;
  const rank = new Map<string, number>();
  nextOrderedTpIds.forEach((id, idx) => rank.set(id, idx));

  const updatedPlan = savePhaseATPPlan(profile, {
    ...currentPlan,
    previousOrderedTpIds: savePreviousForUndo
      ? [...currentPlan.orderedTpIds]
      : currentPlan.previousOrderedTpIds,
    orderedTpIds: nextOrderedTpIds,
    versi: (currentPlan.versi || 1) + 1,
  });

  // Urutkan ulang TP semester aktif mengikuti urutan ATP fase tanpa mengubah id maupun kodeTP.
  const activeRankable = [...activeTpList].sort((a, b) => {
    const rA = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const rB = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return rA - rB;
  });

  return {
    updatedPlan,
    updatedActiveTpList: activeRankable,
  };
}

export function allocateTPToScheduleAndPersist(params: {
  profile: SchoolProfile;
  currentPlan: PhaseATPPlan;
  allocation: ATPAllocationMapping;
  phaseTPs: CustomTPItem[];
}): PhaseATPPlan {
  const { profile, currentPlan, allocation } = params;
  const filtered = currentPlan.allocations.filter(
    (a) => !(a.tpId === allocation.tpId && a.tahunAjaran === allocation.tahunAjaran)
  );
  filtered.push(allocation);

  return savePhaseATPPlan(profile, {
    ...currentPlan,
    allocations: filtered,
    versi: (currentPlan.versi || 1) + 1,
  });
}

/**
 * Mengembalikan daftar TP untuk semester target sesuai pemetaan & urutan ATP fase yang tersimpan,
 * jika tersedia. Bila tidak ada pemetaan ATP fase tersimpan, mengembalikan null (gunakan fallback legacy).
 */
export function resolveSemesterTPListFromPhaseATP(
  profile: SchoolProfile,
  targetSemester: '1 (Ganjil)' | '2 (Genap)',
  activeSemesterTpList?: CustomTPItem[]
): CustomTPItem[] | null {
  const fase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const plan = getSavedPhaseATPPlan(profile, fase);
  if (!plan || plan.allocations.length === 0) {
    return null;
  }

  const targetSemCode = resolveSemesterCode(targetSemester);
  const cleanKelas = (profile.kelasUtama || '').trim().toLowerCase();
  const matchingAllocations = plan.allocations.filter((a) => {
    const semMatch = resolveSemesterCode(a.semester) === targetSemCode;
    const taMatch = !a.tahunAjaran || a.tahunAjaran === profile.tahunAjaran;
    const kelasMatch = !a.kelas || a.kelas.trim().toLowerCase() === cleanKelas;
    return semMatch && taMatch && kelasMatch;
  });

  if (matchingAllocations.length === 0) {
    return null;
  }

  const collected = collectPhaseTPItems(profile, activeSemesterTpList || [], fase);
  const allocByTpId = new Map<string, ATPAllocationMapping>();
  for (const alloc of matchingAllocations) {
    allocByTpId.set(alloc.tpId, alloc);
  }

  const orderedResult: CustomTPItem[] = [];
  const added = new Set<string>();
  for (const tpId of plan.orderedTpIds) {
    if (!allocByTpId.has(tpId) || added.has(tpId)) continue;
    const baseTp = collected.tpById.get(tpId);
    if (!baseTp) continue;
    const alloc = allocByTpId.get(tpId)!;
    added.add(tpId);
    orderedResult.push({
      ...baseTp,
      alokasiJP: alloc.alokasiJP !== undefined ? alloc.alokasiJP : baseTp.alokasiJP,
    });
  }

  // Sertakan allocation tersisa jika ada tpId yang belum masuk orderedTpIds
  for (const alloc of matchingAllocations) {
    if (added.has(alloc.tpId)) continue;
    const baseTp = collected.tpById.get(alloc.tpId);
    if (!baseTp) continue;
    added.add(alloc.tpId);
    orderedResult.push({
      ...baseTp,
      alokasiJP: alloc.alokasiJP !== undefined ? alloc.alokasiJP : baseTp.alokasiJP,
    });
  }

  return orderedResult.length > 0 ? orderedResult : null;
}

export function syncUpdatedTPListPreservingScope(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): void {
  saveCustomTPList(
    profile.mataPelajaranUtama,
    profile.kelasUtama,
    profile.semester,
    tpList,
    profile
  );
}

/**
 * Memperbarui satu item TP baik yang berada pada daftar semester aktif maupun pada
 * kelas/semester lain dalam satu fase yang sama (Layer 1 Phase ATP tanpa duplikasi TP).
 */
export function updatePhaseTPItemInOriginScope(params: {
  profile: SchoolProfile;
  tpId: string;
  origin?: { kelas: string; semester: '1 (Ganjil)' | '2 (Genap)'; tahunAjaran: string };
  fallbackTp?: CustomTPItem;
  activeTpList: CustomTPItem[];
  updater: (tp: CustomTPItem) => CustomTPItem;
}): {
  updatedActiveTpList?: CustomTPItem[];
  updatedOrigin: boolean;
} {
  const { profile, tpId, origin, fallbackTp, activeTpList, updater } = params;
  if (activeTpList.some((item) => item.id === tpId)) {
    return {
      updatedActiveTpList: activeTpList.map((item) => (item.id === tpId ? updater(item) : item)),
      updatedOrigin: false,
    };
  }

  if (!origin) {
    return { updatedOrigin: false };
  }

  const originProfile: SchoolProfile = {
    ...profile,
    kelasUtama: origin.kelas,
    semester: origin.semester,
    tahunAjaran: origin.tahunAjaran || profile.tahunAjaran,
  };
  const savedOrigin = getSavedCustomTPList(
    profile.mataPelajaranUtama,
    origin.kelas,
    origin.semester,
    originProfile
  );
  if (Array.isArray(savedOrigin) && savedOrigin.some((item) => item.id === tpId)) {
    const nextOrigin = savedOrigin.map((item) => (item.id === tpId ? updater(item) : item));
    saveCustomTPList(
      profile.mataPelajaranUtama,
      origin.kelas,
      origin.semester,
      nextOrigin,
      originProfile
    );
    return { updatedOrigin: true };
  }

  if (fallbackTp) {
    const nextOrigin = savedOrigin ? [...savedOrigin, updater(fallbackTp)] : [updater(fallbackTp)];
    saveCustomTPList(
      profile.mataPelajaranUtama,
      origin.kelas,
      origin.semester,
      nextOrigin,
      originProfile
    );
    return { updatedOrigin: true };
  }

  return { updatedOrigin: false };
}
