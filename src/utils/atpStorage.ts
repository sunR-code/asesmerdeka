import type { JenjangFase } from '../types/assessment';
import { getSavedCPEntries, cpEntryToReferenceMeta, type SavedCPEntry } from './cpStorage';
import { isSameFase, normalizeFaseShortLabel } from './atpSequencingEngine';
import {
  type CPReferenceMeta,
  type CustomTPItem,
  type SchoolProfile,
  computeTPContentHash,
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

export interface PhaseATPApprovalSummary {
  scopeKey: string;
  cpFingerprint: string;
  orderedTpIds: string[];
  tpSubstantiveHashes: Record<string, string>;
  prasyaratHashByTpId: Record<string, string>;
  assessHashByTpId: Record<string, string>;
  allocationHash: string;
}

export type EffectiveATPApprovalStatus = 'draft' | 'disetujui' | 'perlu_ditinjau';

export interface ATPApprovalEvaluation {
  effectiveStatus: EffectiveATPApprovalStatus;
  currentFingerprint: string;
  currentSummary: PhaseATPApprovalSummary;
  isApprovedValid: boolean;
  isStaleApproval: boolean;
  reasons: string[];
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
  approvedContentHash?: string;
  approvedAt?: string;
  approvedSummary?: PhaseATPApprovalSummary;
  needsReapprovalReview?: boolean;
  staleApprovalReasons?: string[];
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

  const saved = savePhaseATPPlan(profile, {
    ...currentPlan,
    previousOrderedTpIds: savePreviousForUndo
      ? [...currentPlan.orderedTpIds]
      : currentPlan.previousOrderedTpIds,
    orderedTpIds: nextOrderedTpIds,
    versi: (currentPlan.versi || 1) + 1,
  });

  const collected = collectPhaseTPItems(profile, activeTpList, saved.fase);
  const { plan: updatedPlan } = invalidatePhaseATPApprovalIfChanged({
    profile,
    plan: saved,
    orderedTpIds: saved.orderedTpIds,
    tpById: collected.tpById,
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

/**
 * Serialisasi JSON kanonik (urutan key objek deterministik, urutan elemen array tetap terjaga).
 */
function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(',')}}`;
}

/**
 * Hash deterministik 64-bit (dua putaran FNV-1a independen -> 16 char hex) agar tahan tabrakan.
 */
function hashCanonicalPayload(payload: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + ((i + 1) & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function canonicalCPMeta(meta?: CPReferenceMeta) {
  if (!meta) return null;
  return {
    sumber: (meta.sumber || '').trim(),
    namaDokumenSumber: (meta.namaDokumenSumber || '').trim(),
    nomorDokumen: (meta.nomorDokumen || '').trim(),
    tahunVersiDokumen: (meta.tahunVersiDokumen || '').trim(),
    elemenCP: (meta.elemenCP || '').trim(),
    fase: (meta.fase || '').trim(),
    teksCP: (meta.teksCP || '').trim(),
    statusVerifikasi: meta.statusVerifikasi || '',
    terverifikasiResmi: Boolean(meta.terverifikasiResmi),
    asalCP: meta.asalCP || '',
    cpEntryId: (meta.cpEntryId || '').trim(),
    catatan: (meta.catatan || '').trim(),
  };
}

export function computePhaseATPApprovalFingerprint(params: {
  profile: AcademicProfileLike & Pick<SchoolProfile, 'jenjang' | 'mataPelajaranUtama' | 'kelasUtama' | 'tahunAjaran'>;
  plan: Pick<PhaseATPPlan, 'fase' | 'orderedTpIds' | 'allocations' | 'referensiCP'>;
  orderedTpIds: string[];
  tpById: Map<string, CustomTPItem>;
  savedCPs?: SavedCPEntry[];
  resolvedRefCP?: CPReferenceMeta;
}): { fingerprint: string; summary: PhaseATPApprovalSummary } {
  const { profile, plan, orderedTpIds, tpById, savedCPs, resolvedRefCP } = params;
  const ctx = resolveAcademicContext(profile, plan.fase);
  const scopeKey = buildCPScopeKey(profile, plan.fase || ctx.fase);
  const cpEntries = savedCPs ?? getSavedCPEntries(profile, plan.fase || ctx.fase);

  const effectiveRefCP =
    (cpEntries[0] ? cpEntryToReferenceMeta(cpEntries[0]) : undefined) ||
    resolvedRefCP ||
    plan.referensiCP ||
    orderedTpIds.map((id) => tpById.get(id)?.referensiCP).find(Boolean);

  const cpPayload = {
    refCP: canonicalCPMeta(effectiveRefCP),
    savedCPs: [...cpEntries]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((cp) => ({
        id: cp.id,
        elemenCP: (cp.elemenCP || '').trim(),
        teksCP: (cp.teksCP || '').trim(),
        namaDokumenSumber: (cp.namaDokumenSumber || '').trim(),
        asalCP: cp.asalCP || '',
        statusVerifikasi: cp.statusVerifikasi || '',
        terverifikasiResmi: Boolean(cp.terverifikasiResmi),
      })),
  };
  const cpFingerprint = hashCanonicalPayload(canonicalStringify(cpPayload));

  const cleanOrderedIds = orderedTpIds.filter((id) => tpById.has(id));
  const tpSubstantiveHashes: Record<string, string> = {};
  const prasyaratHashByTpId: Record<string, string> = {};
  const assessHashByTpId: Record<string, string> = {};

  for (const id of cleanOrderedIds) {
    const tp = tpById.get(id)!;
    const tpSubstantiveObj = {
      id: tp.id,
      baseHash: computeTPContentHash(tp),
      kode: (tp.kode || '').trim(),
      elemen: (tp.elemen || '').trim(),
      materiPokok: (tp.materiPokok || '').trim(),
      kompetensiInti: (tp.kompetensiInti || '').trim(),
      lingkupMateri: ((tp.lingkupMateri || tp.materiPokok) || '').trim(),
      tujuanPembelajaran: (tp.tujuanPembelajaran || '').trim(),
      alokasiJP: Number(tp.alokasiJP) || 0,
      buktiKetercapaian: Array.isArray(tp.buktiKetercapaian)
        ? tp.buktiKetercapaian.map((b) => String(b || '').trim())
        : [],
      prasyarat: Array.isArray(tp.prasyarat)
        ? tp.prasyarat.map((p) => String(p || '').trim())
        : [],
      subTP: Array.isArray(tp.subTP)
        ? tp.subTP.map((s) => ({
            kode: (s.kode || '').trim(),
            kompetensi: (s.kompetensi || '').trim(),
            fokusMateri: (s.fokusMateri || '').trim(),
            buktiKetercapaian: (s.buktiKetercapaian || '').trim(),
          }))
        : [],
      refCP: canonicalCPMeta(tp.referensiCP),
    };
    tpSubstantiveHashes[id] = hashCanonicalPayload(canonicalStringify(tpSubstantiveObj));

    const normPrereq = Array.from(
      new Set((Array.isArray(tp.prasyaratTpIds) ? tp.prasyaratTpIds : []).map((p) => String(p).trim()).filter(Boolean))
    ).sort();
    prasyaratHashByTpId[id] = hashCanonicalPayload(canonicalStringify(normPrereq));

    const normAssess = tp.rencanaAsesmen
      ? {
          bentukUtama: Array.from(
            new Set((tp.rencanaAsesmen.bentukUtama || []).map((f) => String(f).trim()).filter(Boolean))
          ).sort(),
          deskripsi: (tp.rencanaAsesmen.deskripsi || '').trim(),
          isEditedByGuru: Boolean(tp.rencanaAsesmen.isEditedByGuru),
        }
      : null;
    assessHashByTpId[id] = hashCanonicalPayload(canonicalStringify(normAssess));
  }

  const orderedSet = new Set(cleanOrderedIds);
  const normAllocations = (plan.allocations || [])
    .filter((a) => orderedSet.has(a.tpId))
    .map((a) => ({
      tpId: a.tpId,
      tahunAjaran: (a.tahunAjaran || '').trim(),
      kelas: (a.kelas || '').trim(),
      semester: a.semester,
      alokasiJP: a.alokasiJP !== undefined ? Number(a.alokasiJP) || 0 : null,
    }))
    .sort((a, b) => `${a.tpId}::${a.tahunAjaran}`.localeCompare(`${b.tpId}::${b.tahunAjaran}`));
  const allocationHash = hashCanonicalPayload(canonicalStringify(normAllocations));

  const summary: PhaseATPApprovalSummary = {
    scopeKey,
    cpFingerprint,
    orderedTpIds: cleanOrderedIds,
    tpSubstantiveHashes,
    prasyaratHashByTpId,
    assessHashByTpId,
    allocationHash,
  };

  const fullPayload = canonicalStringify({
    v: 1,
    scope: {
      schoolId: (ctx.schoolId || '').trim(),
      jenjang: (ctx.jenjang || '').trim().toLowerCase(),
      mataPelajaran: (ctx.mataPelajaran || '').trim().toLowerCase(),
      fase: normalizeFaseShortLabel(plan.fase || ctx.fase),
    },
    summary,
  });

  return {
    fingerprint: hashCanonicalPayload(fullPayload),
    summary,
  };
}

function detectChangedATPReasons(
  prev: PhaseATPApprovalSummary | undefined,
  curr: PhaseATPApprovalSummary,
  tpById: Map<string, CustomTPItem>
): string[] {
  if (!prev) {
    return ['Substansi ATP berubah setelah persetujuan terakhir.'];
  }
  const reasons: string[] = [];

  if (prev.cpFingerprint !== curr.cpFingerprint) {
    reasons.push('Referensi atau teks Capaian Pembelajaran (CP) dasar berubah.');
  }
  if (canonicalStringify(prev.orderedTpIds) !== canonicalStringify(curr.orderedTpIds)) {
    const prevSet = new Set(prev.orderedTpIds);
    const currSet = new Set(curr.orderedTpIds);
    const addedOrRemoved =
      prev.orderedTpIds.some((id) => !currSet.has(id)) ||
      curr.orderedTpIds.some((id) => !prevSet.has(id));
    reasons.push(
      addedOrRemoved
        ? 'Daftar atau jumlah TP dalam fase berubah (penambahan/penghapusan TP).'
        : 'Urutan Tujuan Pembelajaran (TP) berubah.'
    );
  }

  const changedTpCodes: string[] = [];
  let prereqChanged = false;
  let assessChanged = false;

  const allIds = new Set([...prev.orderedTpIds, ...curr.orderedTpIds]);
  for (const id of allIds) {
    if (prev.tpSubstantiveHashes[id] && curr.tpSubstantiveHashes[id]) {
      if (prev.tpSubstantiveHashes[id] !== curr.tpSubstantiveHashes[id]) {
        const kode = tpById.get(id)?.kode;
        if (kode && !changedTpCodes.includes(kode)) changedTpCodes.push(kode);
      }
      if (prev.prasyaratHashByTpId[id] !== curr.prasyaratHashByTpId[id]) {
        prereqChanged = true;
      }
      if (prev.assessHashByTpId[id] !== curr.assessHashByTpId[id]) {
        assessChanged = true;
      }
    }
  }

  if (changedTpCodes.length > 0) {
    reasons.push(
      `Isi Tujuan Pembelajaran, kompetensi, lingkup materi, Sub-TP, atau bukti ketercapaian berubah (TP ${changedTpCodes.join(', ')}).`
    );
  }
  if (prereqChanged) {
    reasons.push('Relasi prasyarat antar-TP berubah.');
  }
  if (assessChanged) {
    reasons.push('Rencana asesmen TP berubah.');
  }
  if (prev.allocationHash !== curr.allocationHash) {
    reasons.push('Pemetaan kelas, tahun ajaran, semester, atau alokasi JP berubah.');
  }

  if (reasons.length === 0) {
    reasons.push('Substansi atau lingkup ATP berubah setelah persetujuan terakhir.');
  }
  return reasons;
}

export function evaluatePhaseATPApproval(params: {
  profile: SchoolProfile;
  plan: PhaseATPPlan | null | undefined;
  orderedTpIds: string[];
  tpById: Map<string, CustomTPItem>;
  savedCPs?: SavedCPEntry[];
  resolvedRefCP?: CPReferenceMeta;
}): ATPApprovalEvaluation {
  const { profile, plan, orderedTpIds, tpById, savedCPs, resolvedRefCP } = params;
  const fallbackPlan: Pick<PhaseATPPlan, 'fase' | 'orderedTpIds' | 'allocations' | 'referensiCP'> =
    plan || {
      fase: jenjangToDefaultFase(profile.jenjang, profile.kelasUtama),
      orderedTpIds,
      allocations: [],
      referensiCP: resolvedRefCP,
    };

  const { fingerprint: currentFingerprint, summary: currentSummary } =
    computePhaseATPApprovalFingerprint({
      profile,
      plan: fallbackPlan,
      orderedTpIds,
      tpById,
      savedCPs,
      resolvedRefCP,
    });

  if (!plan) {
    return {
      effectiveStatus: 'draft',
      currentFingerprint,
      currentSummary,
      isApprovedValid: false,
      isStaleApproval: false,
      reasons: [],
    };
  }

  // ATP legacy yang bertanda 'disetujui' tanpa bukti snapshot hash tidak boleh diklaim disetujui
  if (plan.statusPenyusunan === 'disetujui' && !plan.approvedContentHash) {
    const legacyReason = [
      'Snapshot persetujuan ATP belum tersedia pada dokumen lama; harap tinjau dan setujui ulang.',
    ];
    return {
      effectiveStatus: 'perlu_ditinjau',
      currentFingerprint,
      currentSummary,
      isApprovedValid: false,
      isStaleApproval: true,
      reasons: legacyReason,
    };
  }

  if (plan.statusPenyusunan === 'disetujui' && plan.approvedContentHash) {
    if (plan.approvedContentHash === currentFingerprint) {
      return {
        effectiveStatus: 'disetujui',
        currentFingerprint,
        currentSummary,
        isApprovedValid: true,
        isStaleApproval: false,
        reasons: [],
      };
    }

    const reasons = detectChangedATPReasons(plan.approvedSummary, currentSummary, tpById);
    return {
      effectiveStatus: 'perlu_ditinjau',
      currentFingerprint,
      currentSummary,
      isApprovedValid: false,
      isStaleApproval: true,
      reasons,
    };
  }

  if (plan.needsReapprovalReview) {
    return {
      effectiveStatus: 'perlu_ditinjau',
      currentFingerprint,
      currentSummary,
      isApprovedValid: false,
      isStaleApproval: true,
      reasons:
        plan.staleApprovalReasons && plan.staleApprovalReasons.length > 0
          ? plan.staleApprovalReasons
          : ['Substansi ATP berubah setelah persetujuan sebelumnya.'],
    };
  }

  return {
    effectiveStatus: 'draft',
    currentFingerprint,
    currentSummary,
    isApprovedValid: false,
    isStaleApproval: false,
    reasons: [],
  };
}

export function approvePhaseATPPlan(params: {
  profile: SchoolProfile;
  plan: PhaseATPPlan;
  orderedTpIds: string[];
  tpById: Map<string, CustomTPItem>;
  savedCPs?: SavedCPEntry[];
  resolvedRefCP?: CPReferenceMeta;
  hasBlockingValidation?: boolean;
}): { ok: boolean; error?: string; updatedPlan: PhaseATPPlan } {
  const {
    profile,
    plan,
    orderedTpIds,
    tpById,
    savedCPs,
    resolvedRefCP,
    hasBlockingValidation,
  } = params;

  if (hasBlockingValidation) {
    return {
      ok: false,
      error:
        'ATP belum dapat disetujui karena masih terdapat siklus prasyarat atau relasi error yang harus diperbaiki.',
      updatedPlan: plan,
    };
  }

  const { fingerprint, summary } = computePhaseATPApprovalFingerprint({
    profile,
    plan,
    orderedTpIds,
    tpById,
    savedCPs,
    resolvedRefCP,
  });

  const saved = savePhaseATPPlan(profile, {
    ...plan,
    orderedTpIds: summary.orderedTpIds,
    statusPenyusunan: 'disetujui',
    approvedContentHash: fingerprint,
    approvedAt: new Date().toISOString(),
    approvedSummary: summary,
    needsReapprovalReview: false,
    staleApprovalReasons: undefined,
    versi: (plan.versi || 1) + 1,
  });

  return { ok: true, updatedPlan: saved };
}

/**
 * Menginvalidasi status persetujuan ATP di penyimpanan apabila substansi berubah.
 * Bersifat idempoten: hanya menulis bila plan masih berstatus 'disetujui' & snapshot sudah usang.
 */
export function invalidatePhaseATPApprovalIfChanged(params: {
  profile: SchoolProfile;
  plan: PhaseATPPlan;
  orderedTpIds: string[];
  tpById: Map<string, CustomTPItem>;
  savedCPs?: SavedCPEntry[];
  resolvedRefCP?: CPReferenceMeta;
}): { plan: PhaseATPPlan; invalidated: boolean; evaluation: ATPApprovalEvaluation } {
  const { profile, plan, orderedTpIds, tpById, savedCPs, resolvedRefCP } = params;
  const evaluation = evaluatePhaseATPApproval({
    profile,
    plan,
    orderedTpIds,
    tpById,
    savedCPs,
    resolvedRefCP,
  });

  if (plan.statusPenyusunan === 'disetujui' && evaluation.isStaleApproval) {
    const invalidatedPlan = savePhaseATPPlan(profile, {
      ...plan,
      statusPenyusunan: 'draft',
      needsReapprovalReview: true,
      staleApprovalReasons: evaluation.reasons,
      versi: (plan.versi || 1) + 1,
    });
    return {
      plan: invalidatedPlan,
      invalidated: true,
      evaluation: {
        ...evaluation,
        effectiveStatus: 'perlu_ditinjau',
        isApprovedValid: false,
        isStaleApproval: true,
      },
    };
  }

  return {
    plan,
    invalidated: false,
    evaluation,
  };
}

/**
 * Helper terpusat untuk dipanggil setelah mutasi TP, CP, prasyarat, asesmen, atau alokasi
 * pada suatu scope akademik. Tidak melakukan penulisan ulang bila ATP memang sudah draft.
 */
export function reconcilePhaseATPApprovalForScope(
  profile: SchoolProfile,
  activeTpList: CustomTPItem[] = [],
  explicitFase?: string
): PhaseATPPlan | null {
  const ctx = resolveAcademicContext(profile, explicitFase);
  const targetFase = (explicitFase || ctx.fase) as JenjangFase;
  const existing = getSavedPhaseATPPlan(profile, targetFase);
  if (!existing || existing.statusPenyusunan !== 'disetujui') {
    return existing;
  }

  const collected = collectPhaseTPItems(profile, activeTpList, targetFase);
  const synced = initializeOrSyncPhaseATPPlan(profile, activeTpList, undefined, targetFase);
  const { plan: checkedPlan } = invalidatePhaseATPApprovalIfChanged({
    profile,
    plan: {
      ...synced,
      statusPenyusunan: existing.statusPenyusunan,
      approvedContentHash: existing.approvedContentHash,
      approvedSummary: existing.approvedSummary,
      approvedAt: existing.approvedAt,
    },
    orderedTpIds: synced.orderedTpIds,
    tpById: collected.tpById,
  });

  return checkedPlan;
}

export function allocateTPToScheduleAndPersist(params: {
  profile: SchoolProfile;
  currentPlan: PhaseATPPlan;
  allocation: ATPAllocationMapping;
  phaseTPs: CustomTPItem[];
}): PhaseATPPlan {
  const { profile, currentPlan, allocation, phaseTPs } = params;
  const filtered = currentPlan.allocations.filter(
    (a) => !(a.tpId === allocation.tpId && a.tahunAjaran === allocation.tahunAjaran)
  );
  filtered.push(allocation);

  const saved = savePhaseATPPlan(profile, {
    ...currentPlan,
    allocations: filtered,
    versi: (currentPlan.versi || 1) + 1,
  });

  const tpById = new Map<string, CustomTPItem>();
  const collected = collectPhaseTPItems(profile, phaseTPs, saved.fase);
  collected.tpItems.forEach((t) => tpById.set(t.id, t));
  phaseTPs.forEach((t) => tpById.set(t.id, t));

  const { plan: reconciled } = invalidatePhaseATPApprovalIfChanged({
    profile,
    plan: saved,
    orderedTpIds: saved.orderedTpIds,
    tpById,
  });
  return reconciled;
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
    reconcilePhaseATPApprovalForScope(profile, activeTpList);
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
    reconcilePhaseATPApprovalForScope(profile, activeTpList);
    return { updatedOrigin: true };
  }

  return { updatedOrigin: false };
}
