import {
  LKPD_PRESET_TYPES,
  type LKPDDokumen,
  type LKPDPresetType,
  type ModulAjarDokumen,
} from '../types/perangkatAjar';
import {
  getAllSearchableModulModelIds,
  type ModulAjarModelType,
} from './modulPedagogicalModels';
import { normalizeStoredLKPDDraft } from './lkpdValidator';
import { computeTPContentHash, type CustomTPItem } from './schoolProfileStorage';
import {
  buildLKPDDraftStorageKey,
  buildLKPDLatestIndexKey,
  buildModulAjarDraftStorageKey,
  buildModulAjarLatestIndexKey,
  getPersistedActiveSchoolId,
  normalizeNamespaceSegment,
  resolveAcademicContext,
  type AcademicProfileLike,
} from './storageIdentity';

export interface DraftSaveResult<T> {
  ok: boolean;
  savedAt: string;
  storageKey: string;
  doc: T;
  error?: string;
}

export interface ResolvedSavedDraft<T> {
  doc: T;
  variant: string;
  origin: 'saved_ai' | 'saved_manual';
  savedAt?: string;
  storageKey: string;
}

export type ModulAjarDraftSource = 'user_edited' | 'ai_generated' | 'template' | 'community';

interface LatestDraftIndexEntry {
  variant: string;
  savedAt: string;
  draftSource?: ModulAjarDraftSource;
  tpKode?: string;
  tpId?: string;
}

function isLegacyContextFallbackAllowed(profile?: AcademicProfileLike | null): boolean {
  const activePersisted = getPersistedActiveSchoolId();
  if (!profile?.schoolId) return true;
  if (profile.schoolId === 'sch_local_default') return true;
  return Boolean(activePersisted && profile.schoolId === activePersisted);
}

function matchesProfileMetadata(
  draft: {
    mataPelajaran?: string;
    kelas?: string;
    semester?: string;
    schoolId?: string;
    namaSekolah?: string;
  },
  profile?: AcademicProfileLike | null
): boolean {
  const ctx = resolveAcademicContext(profile);
  if (draft.schoolId && draft.schoolId !== ctx.schoolId) {
    return false;
  }
  if (
    draft.mataPelajaran &&
    draft.mataPelajaran.trim().toLowerCase() !== ctx.mataPelajaran.toLowerCase()
  ) {
    return false;
  }
  if (
    draft.kelas &&
    draft.kelas.trim().toLowerCase() !== ctx.kelas.toLowerCase()
  ) {
    return false;
  }
  if (draft.semester) {
    const draftSem = draft.semester.trim().startsWith('2') ? 'sem2' : 'sem1';
    if (draftSem !== ctx.semesterCode) return false;
  }
  if (
    !draft.schoolId &&
    ctx.namaSekolah &&
    draft.namaSekolah &&
    draft.namaSekolah.trim().toLowerCase() !== ctx.namaSekolah.toLowerCase()
  ) {
    return false;
  }
  return true;
}

function resolveOriginFromDraft(draft: {
  draftSource?: ModulAjarDraftSource;
}): 'saved_ai' | 'saved_manual' {
  return draft.draftSource === 'ai_generated' ? 'saved_ai' : 'saved_manual';
}

function notifyWorkspaceDraftSaved(storageKey: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('asesmerdeka:workspace-draft-saved', {
          detail: { storageKey },
        })
      );
    }
  } catch {
    // ignore outside DOM
  }
}

export function saveModulAjarDraft(
  profile: AcademicProfileLike | null | undefined,
  tp: Pick<CustomTPItem, 'id' | 'kode'>,
  model: ModulAjarModelType | string,
  doc: ModulAjarDokumen,
  source?: ModulAjarDraftSource
): DraftSaveResult<ModulAjarDokumen> {
  const ctx = resolveAcademicContext(profile);
  const tpId = tp.id || doc.tpId || tp.kode;
  const savedAt = new Date().toISOString();
  const resolvedSource = source || doc.draftSource || 'user_edited';

  const enriched: ModulAjarDokumen = {
    ...doc,
    tpId,
    tpKode: tp.kode || doc.tpKode,
    modelType: String(model),
    draftSource: resolvedSource,
    savedAt,
    schoolId: ctx.schoolId,
    mataPelajaran: doc.mataPelajaran || ctx.mataPelajaran,
    kelas: doc.kelas || ctx.kelas,
    semester: (doc.semester || ctx.semester) as ModulAjarDokumen['semester'],
    tahunAjaran: doc.tahunAjaran || ctx.tahunAjaran,
  };

  const storageKey = buildModulAjarDraftStorageKey(profile, tpId, model);
  try {
    if (typeof localStorage === 'undefined') {
      return { ok: false, savedAt, storageKey, doc: enriched, error: 'Penyimpanan lokal tidak tersedia.' };
    }
    localStorage.setItem(storageKey, JSON.stringify(enriched));
    const latestIdx: LatestDraftIndexEntry = {
      variant: String(model),
      savedAt,
      draftSource: resolvedSource,
      tpKode: enriched.tpKode,
      tpId,
    };
    localStorage.setItem(
      buildModulAjarLatestIndexKey(profile, tpId),
      JSON.stringify(latestIdx)
    );
    notifyWorkspaceDraftSaved(storageKey);
    return { ok: true, savedAt, storageKey, doc: enriched };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : 'Batas kuota penyimpanan lokal penuh.';
    return { ok: false, savedAt, storageKey, doc: enriched, error: reason };
  }
}

export function loadModulAjarDraft(
  profile: AcademicProfileLike | null | undefined,
  tp: Pick<CustomTPItem, 'id' | 'kode'>,
  model: ModulAjarModelType | string
): ModulAjarDokumen | null {
  if (typeof localStorage === 'undefined') return null;
  const tpId = tp.id || tp.kode;
  const v2Key = buildModulAjarDraftStorageKey(profile, tpId, model);

  try {
    const rawV2 = localStorage.getItem(v2Key);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as ModulAjarDokumen;
      if (parsed && typeof parsed === 'object' && parsed.tpKode && matchesProfileMetadata(parsed, profile)) {
        return {
          ...parsed,
          tpId: parsed.tpId || tpId,
          modelType: parsed.modelType || String(model),
        };
      }
    }
  } catch {
    // ignore corrupt v2 draft
  }

  // Fallback legacy modul_ajar_<kode>_<model> hanya jika konteks meta cocok tanpa ambigu lintas mapel/sekolah
  if (isLegacyContextFallbackAllowed(profile) && tp.kode) {
    try {
      const legacyKey = `modul_ajar_${tp.kode}_${model}`;
      const rawLegacy = localStorage.getItem(legacyKey);
      if (rawLegacy) {
        const parsed = JSON.parse(rawLegacy) as ModulAjarDokumen;
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed.mataPelajaran &&
          parsed.kelas &&
          matchesProfileMetadata(parsed, profile)
        ) {
          return {
            ...parsed,
            tpId: parsed.tpId || tpId,
            modelType: parsed.modelType || String(model),
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function loadLatestModulAjarDraft(
  profile: AcademicProfileLike | null | undefined,
  tp: Pick<CustomTPItem, 'id' | 'kode'>
): ResolvedSavedDraft<ModulAjarDokumen> | null {
  if (typeof localStorage === 'undefined') return null;
  const tpId = tp.id || tp.kode;

  try {
    const rawIdx = localStorage.getItem(buildModulAjarLatestIndexKey(profile, tpId));
    if (rawIdx) {
      const idx = JSON.parse(rawIdx) as LatestDraftIndexEntry;
      if (idx?.variant) {
        const hit = loadModulAjarDraft(profile, tp, idx.variant);
        if (hit) {
          return {
            doc: hit,
            variant: idx.variant,
            origin: resolveOriginFromDraft(hit),
            savedAt: hit.savedAt || idx.savedAt,
            storageKey: buildModulAjarDraftStorageKey(profile, tpId, idx.variant),
          };
        }
      }
    }
  } catch {
    // fallback scan below
  }

  // Pindai seluruh model standar & legacy (termasuk 'diferensiasi') terurut dari yang terbaru diedit
  let best: ResolvedSavedDraft<ModulAjarDokumen> | null = null;
  for (const modelId of getAllSearchableModulModelIds()) {
    const candidate = loadModulAjarDraft(profile, tp, modelId);
    if (!candidate) continue;
    const candidateTs = candidate.savedAt ? Date.parse(candidate.savedAt) : 0;
    const bestTs = best?.savedAt ? Date.parse(best.savedAt) : -1;
    if (!best || candidateTs >= bestTs) {
      best = {
        doc: candidate,
        variant: modelId,
        origin: resolveOriginFromDraft(candidate),
        savedAt: candidate.savedAt,
        storageKey: buildModulAjarDraftStorageKey(profile, tpId, modelId),
      };
    }
  }
  return best;
}

export function saveLKPDDraft(
  profile: AcademicProfileLike | null | undefined,
  tp: Pick<CustomTPItem, 'id' | 'kode'>,
  preset: LKPDPresetType | string,
  doc: LKPDDokumen,
  source?: 'user_edited' | 'ai_generated' | 'template'
): DraftSaveResult<LKPDDokumen> {
  const ctx = resolveAcademicContext(profile);
  const tpId = tp.id || doc.tpId || tp.kode;
  const savedAt = new Date().toISOString();
  const resolvedSource = source || doc.draftSource || 'user_edited';

  const enriched: LKPDDokumen = {
    ...doc,
    tpId,
    tpKode: tp.kode || doc.tpKode,
    presetType: preset as LKPDPresetType,
    draftSource: resolvedSource,
    savedAt,
    schoolId: ctx.schoolId,
    mataPelajaran: doc.mataPelajaran || ctx.mataPelajaran,
    kelas: doc.kelas || ctx.kelas,
    semester: (doc.semester || ctx.semester) as LKPDDokumen['semester'],
    tahunAjaran: doc.tahunAjaran || ctx.tahunAjaran,
  };

  const storageKey = buildLKPDDraftStorageKey(profile, tpId, preset);
  try {
    if (typeof localStorage === 'undefined') {
      return { ok: false, savedAt, storageKey, doc: enriched, error: 'Penyimpanan lokal tidak tersedia.' };
    }
    localStorage.setItem(storageKey, JSON.stringify(enriched));
    const latestIdx: LatestDraftIndexEntry = {
      variant: String(preset),
      savedAt,
      draftSource: resolvedSource,
      tpKode: enriched.tpKode,
      tpId,
    };
    localStorage.setItem(
      buildLKPDLatestIndexKey(profile, tpId),
      JSON.stringify(latestIdx)
    );
    notifyWorkspaceDraftSaved(storageKey);
    return { ok: true, savedAt, storageKey, doc: enriched };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : 'Batas kuota penyimpanan lokal penuh.';
    return { ok: false, savedAt, storageKey, doc: enriched, error: reason };
  }
}

export function loadLKPDDraft(
  profile: AcademicProfileLike | null | undefined,
  tp: Pick<CustomTPItem, 'id' | 'kode'> & Partial<CustomTPItem>,
  preset: LKPDPresetType | string,
  fallbackReference?: LKPDDokumen
): LKPDDokumen | null {
  if (typeof localStorage === 'undefined') return null;
  const tpId = tp.id || tp.kode;
  const expectedHash = tp.materiPokok && tp.tujuanPembelajaran
    ? computeTPContentHash({
        kode: tp.kode,
        elemen: tp.elemen || '',
        materiPokok: tp.materiPokok,
        tujuanPembelajaran: tp.tujuanPembelajaran,
        alokasiJP: tp.alokasiJP || 0,
      })
    : undefined;

  const hydrate = (parsed: unknown): LKPDDokumen | null => {
    if (!parsed || typeof parsed !== 'object') return null;
    const raw = parsed as LKPDDokumen;
    if (!matchesProfileMetadata(raw, profile)) return null;
    if (fallbackReference) {
      return normalizeStoredLKPDDraft(raw, fallbackReference, expectedHash);
    }
    return {
      ...raw,
      tpId: raw.tpId || tpId,
      presetType: (raw.presetType || preset) as LKPDPresetType,
    };
  };

  try {
    const rawV2 = localStorage.getItem(buildLKPDDraftStorageKey(profile, tpId, preset));
    if (rawV2) {
      const hydrated = hydrate(JSON.parse(rawV2));
      if (hydrated) return hydrated;
    }
  } catch {
    // ignore corrupt v2
  }

  if (isLegacyContextFallbackAllowed(profile)) {
    const legacyCandidates = [`lkpd_${tpId}_${preset}`];
    if (tp.kode && tp.kode !== tpId) {
      legacyCandidates.push(`lkpd_${tp.kode}_${preset}`);
    }
    for (const legacyKey of legacyCandidates) {
      try {
        const rawLegacy = localStorage.getItem(legacyKey);
        if (!rawLegacy) continue;
        const parsed = JSON.parse(rawLegacy) as LKPDDokumen;
        if (parsed && parsed.mataPelajaran && parsed.kelas) {
          const hydrated = hydrate(parsed);
          if (hydrated) return hydrated;
        }
      } catch {
        // ignore
      }
    }
  }

  return null;
}

export function loadLatestLKPDDraft(
  profile: AcademicProfileLike | null | undefined,
  tp: Pick<CustomTPItem, 'id' | 'kode'> & Partial<CustomTPItem>
): ResolvedSavedDraft<LKPDDokumen> | null {
  if (typeof localStorage === 'undefined') return null;
  const tpId = tp.id || tp.kode;

  try {
    const rawIdx = localStorage.getItem(buildLKPDLatestIndexKey(profile, tpId));
    if (rawIdx) {
      const idx = JSON.parse(rawIdx) as LatestDraftIndexEntry;
      if (idx?.variant) {
        const hit = loadLKPDDraft(profile, tp, idx.variant);
        if (hit) {
          return {
            doc: hit,
            variant: idx.variant,
            origin: resolveOriginFromDraft(hit),
            savedAt: hit.savedAt || idx.savedAt,
            storageKey: buildLKPDDraftStorageKey(profile, tpId, idx.variant),
          };
        }
      }
    }
  } catch {
    // fallback scan below
  }

  let best: ResolvedSavedDraft<LKPDDokumen> | null = null;
  for (const p of LKPD_PRESET_TYPES) {
    const candidate = loadLKPDDraft(profile, tp, p);
    if (!candidate) continue;
    const candidateTs = candidate.savedAt ? Date.parse(candidate.savedAt) : 0;
    const bestTs = best?.savedAt ? Date.parse(best.savedAt) : -1;
    if (!best || candidateTs >= bestTs) {
      best = {
        doc: candidate,
        variant: p,
        origin: resolveOriginFromDraft(candidate),
        savedAt: candidate.savedAt,
        storageKey: buildLKPDDraftStorageKey(profile, tpId, p),
      };
    }
  }
  return best;
}

export function deleteLKPDDraft(
  profile: AcademicProfileLike | null | undefined,
  tpId: string,
  tpKode: string | undefined,
  preset: LKPDPresetType | string
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(buildLKPDDraftStorageKey(profile, tpId, preset));
    if (isLegacyContextFallbackAllowed(profile)) {
      localStorage.removeItem(`lkpd_${tpId}_${preset}`);
      if (tpKode && tpKode !== tpId) {
        localStorage.removeItem(`lkpd_${tpKode}_${preset}`);
      }
    }
    const latestKey = buildLKPDLatestIndexKey(profile, tpId);
    const rawIdx = localStorage.getItem(latestKey);
    if (rawIdx) {
      const idx = JSON.parse(rawIdx) as LatestDraftIndexEntry;
      if (idx?.variant === String(preset)) {
        localStorage.removeItem(latestKey);
      }
    }
  } catch {
    // ignore
  }
}

export function countSavedDraftsForTPList(
  profile: AcademicProfileLike | null | undefined,
  tpList: CustomTPItem[]
): {
  modulSavedCount: number;
  lkpdSavedCount: number;
  totalTP: number;
} {
  let modulSavedCount = 0;
  let lkpdSavedCount = 0;
  for (const tp of tpList) {
    if (loadLatestModulAjarDraft(profile, tp)) modulSavedCount++;
    if (loadLatestLKPDDraft(profile, tp)) lkpdSavedCount++;
  }
  return {
    modulSavedCount,
    lkpdSavedCount,
    totalTP: tpList.length,
  };
}

export function listSavedModulAjarV2KeysForTP(
  tpId: string
): string[] {
  if (typeof localStorage === 'undefined') return [];
  const normTp = normalizeNamespaceSegment(tpId, 'tp');
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('asesmerdeka_modul_v2__') && k.includes(`__tp_${normTp}__mdl_`)) {
      keys.push(k);
    }
  }
  return keys;
}

export interface PendingLKPDSaveController {
  markDirty: (doc: LKPDDokumen, profile: AcademicProfileLike, tp: CustomTPItem, preset: LKPDPresetType) => void;
  flushNow: () => DraftSaveResult<LKPDDokumen> | null;
  hasPending: () => boolean;
}

export function createPendingLKPDSaveController(): PendingLKPDSaveController {
  let dirty = false;
  let pending: {
    doc: LKPDDokumen;
    profile: AcademicProfileLike;
    tp: CustomTPItem;
    preset: LKPDPresetType;
  } | null = null;

  return {
    markDirty(doc, profile, tp, preset) {
      dirty = true;
      pending = { doc, profile, tp, preset };
    },
    flushNow() {
      if (!dirty || !pending) return null;
      const res = saveLKPDDraft(
        pending.profile,
        pending.tp,
        pending.preset,
        pending.doc,
        pending.doc.draftSource || 'user_edited'
      );
      if (res.ok) {
        dirty = false;
      }
      return res;
    },
    hasPending() {
      return dirty;
    },
  };
}
