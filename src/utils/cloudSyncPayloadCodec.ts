import { syncLegacyArraysFromStructuredStages } from './modulTimeBudget';
import { summarizeAsesmenDetailToLegacy } from './modulOperationalContent';
import type {
  ModulAsesmenDetail,
  TahapKegiatanTerstruktur,
} from '../types/perangkatAjar';

const utf8Encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

export function measureUtf8Bytes(input: unknown): number {
  const str =
    typeof input === 'string'
      ? input
      : input === undefined
      ? ''
      : JSON.stringify(input) ?? '';
  if (utf8Encoder) {
    return utf8Encoder.encode(str).length;
  }
  return str.length;
}

export function canonicalStringifySync(val: unknown): string {
  if (val === null || val === undefined || typeof val !== 'object') {
    if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
      return 'null';
    }
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val
      .map((item) =>
        item === undefined || typeof item === 'function' || typeof item === 'symbol'
          ? 'null'
          : canonicalStringifySync(item)
      )
      .join(',')}]`;
  }
  const obj = val as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter(
      (k) =>
        obj[k] !== undefined &&
        typeof obj[k] !== 'function' &&
        typeof obj[k] !== 'symbol'
    )
    .sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalStringifySync(obj[k])}`)
    .join(',')}}`;
}

/**
 * Deterministic 128-bit synchronous checksum over canonical JSON representation.
 * Mirrored identically in api/cloud-sync.js so browser and Node agree bit-for-bit.
 */
export function computeCanonicalDigestHex(val: unknown): string {
  const input = canonicalStringifySync(val);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ ((ch + i) & 0xffff), 0x85ebca6b);
    h3 = Math.imul(h3 ^ (ch + (i << 1)), 0xc2b2ae35);
    h4 = Math.imul(h4 ^ ((ch << 5) ^ i), 0x27d4eb2f);
  }

  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  );
}

export interface WorkspaceEntryDigests {
  workspaceDigest: string;
  entryDigests: Record<string, string>;
  entryCount: number;
}

export function computeWorkspaceEntryDigests(
  entries: Record<string, unknown>
): WorkspaceEntryDigests {
  const entryDigests: Record<string, string> = {};
  const keys = Object.keys(entries || {}).sort();
  for (const key of keys) {
    entryDigests[key] = computeCanonicalDigestHex(entries[key]);
  }
  return {
    workspaceDigest: computeCanonicalDigestHex(entries || {}),
    entryDigests,
    entryCount: keys.length,
  };
}

export interface EntriesDeltaPlan {
  upserts: Record<string, unknown>;
  deletes: string[];
  changedCount: number;
  deletedCount: number;
  unchangedCount: number;
  totalCount: number;
}

export function computeEntriesDelta(
  baseEntryDigests: Record<string, string>,
  currentEntries: Record<string, unknown>
): EntriesDeltaPlan {
  const upserts: Record<string, unknown> = {};
  const deletes: string[] = [];
  let changedCount = 0;
  let unchangedCount = 0;

  const currentKeys = Object.keys(currentEntries || {}).sort();
  for (const key of currentKeys) {
    const curDigest = computeCanonicalDigestHex(currentEntries[key]);
    if (baseEntryDigests[key] === curDigest) {
      unchangedCount += 1;
    } else {
      upserts[key] = currentEntries[key];
      changedCount += 1;
    }
  }

  const currentKeySet = new Set(currentKeys);
  const baseKeys = Object.keys(baseEntryDigests || {}).sort();
  for (const baseKey of baseKeys) {
    if (!currentKeySet.has(baseKey)) {
      deletes.push(baseKey);
    }
  }

  return {
    upserts,
    deletes,
    changedCount,
    deletedCount: deletes.length,
    unchangedCount,
    totalCount: currentKeys.length,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isModulDraftStorageKey(key: string): boolean {
  return key.startsWith('asesmerdeka_modul_v2__') || key.startsWith('modul_ajar_');
}

function canonicalEqualSync(a: unknown, b: unknown): boolean {
  return canonicalStringifySync(a) === canonicalStringifySync(b);
}

function stripStageCloneMetadata(stage: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(stage)) {
    if (k === 'id' || k === 'urutan' || k === 'durasiMenit') continue;
    out[k] = v;
  }
  return out;
}

function hasStandardCloneMetaFields(stage: Record<string, unknown>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(stage, 'id') &&
    Object.prototype.hasOwnProperty.call(stage, 'urutan') &&
    Object.prototype.hasOwnProperty.call(stage, 'durasiMenit')
  );
}

function encodeModulAjarForWire(rawDoc: Record<string, unknown>): Record<string, unknown> {
  if (
    Object.prototype.hasOwnProperty.call(rawDoc, '__syncDerivedAsesmen') ||
    Object.prototype.hasOwnProperty.call(rawDoc, '__syncDerivedSteps')
  ) {
    return rawDoc;
  }

  const out: Record<string, unknown> = { ...rawDoc };

  // 1. Omit deterministically derived asesmen summary if identical to summarizeAsesmenDetailToLegacy(asesmenDetail)
  if (isPlainRecord(out.asesmenDetail) && isPlainRecord(out.asesmen)) {
    const ad = out.asesmenDetail as unknown as Partial<ModulAsesmenDetail>;
    if (
      ad.diagnostik &&
      Array.isArray(ad.diagnostik.pertanyaanAtauTugasAwal) &&
      ad.formatif &&
      Array.isArray(ad.formatif.buktiYangDiamati) &&
      ad.akhir &&
      Array.isArray(ad.akhir.butirTugas)
    ) {
      const derivedSummary = summarizeAsesmenDetailToLegacy(ad as ModulAsesmenDetail);
      if (canonicalEqualSync(out.asesmen, derivedSummary)) {
        delete out.asesmen;
        out.__syncDerivedAsesmen = 1;
      }
    }
  }

  // 2. Deduplicate derived pendahuluan/inti/penutup & cloned multi-meeting stages in kegiatanPembelajaran
  if (Array.isArray(out.kegiatanPembelajaran) && out.kegiatanPembelajaran.length > 0) {
    const rawMeetings = out.kegiatanPembelajaran;
    const baseMeeting = isPlainRecord(rawMeetings[0]) ? rawMeetings[0] : null;
    const baseStages =
      baseMeeting && Array.isArray(baseMeeting.tahapTerstruktur)
        ? baseMeeting.tahapTerstruktur
        : null;

    out.kegiatanPembelajaran = rawMeetings.map((meetingRaw, idx) => {
      if (!isPlainRecord(meetingRaw)) return meetingRaw;
      const keg: Record<string, unknown> = { ...meetingRaw };

      if (
        !Object.prototype.hasOwnProperty.call(keg, '__syncDerivedSteps') &&
        Array.isArray(keg.tahapTerstruktur) &&
        keg.tahapTerstruktur.length > 0 &&
        Array.isArray(keg.pendahuluan) &&
        Array.isArray(keg.inti) &&
        Array.isArray(keg.penutup)
      ) {
        const derivedSteps = syncLegacyArraysFromStructuredStages(
          keg.tahapTerstruktur as TahapKegiatanTerstruktur[]
        );
        if (
          canonicalEqualSync(keg.pendahuluan, derivedSteps.pendahuluan) &&
          canonicalEqualSync(keg.inti, derivedSteps.inti) &&
          canonicalEqualSync(keg.penutup, derivedSteps.penutup)
        ) {
          delete keg.pendahuluan;
          delete keg.inti;
          delete keg.penutup;
          keg.__syncDerivedSteps = 1;
        }
      }

      if (
        idx > 0 &&
        baseStages &&
        baseStages.length > 0 &&
        Array.isArray(keg.tahapTerstruktur) &&
        keg.tahapTerstruktur.length === baseStages.length
      ) {
        const curStages = keg.tahapTerstruktur;
        const canCloneFromZero = curStages.every((stRaw, sIdx) => {
          const baseSt = baseStages[sIdx];
          if (!isPlainRecord(stRaw) || !isPlainRecord(baseSt)) return false;
          if (!hasStandardCloneMetaFields(stRaw) || !hasStandardCloneMetaFields(baseSt)) {
            return false;
          }
          return canonicalEqualSync(
            stripStageCloneMetadata(stRaw),
            stripStageCloneMetadata(baseSt)
          );
        });
        if (canCloneFromZero) {
          keg.tahapTerstruktur = {
            __syncCloneOfPertemuan: 0,
            overrides: curStages.map((stRaw) => {
              const st = stRaw as Record<string, unknown>;
              return {
                id: st.id,
                urutan: st.urutan,
                durasiMenit: st.durasiMenit,
              };
            }),
          };
        }
      }

      return keg;
    });
  }

  return out;
}

function decodeModulAjarFromWire(rawDoc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...rawDoc };

  if (out.__syncDerivedAsesmen === 1 && isPlainRecord(out.asesmenDetail)) {
    const ad = out.asesmenDetail as unknown as Partial<ModulAsesmenDetail>;
    if (
      ad.diagnostik &&
      Array.isArray(ad.diagnostik.pertanyaanAtauTugasAwal) &&
      ad.formatif &&
      Array.isArray(ad.formatif.buktiYangDiamati) &&
      ad.akhir &&
      Array.isArray(ad.akhir.butirTugas)
    ) {
      out.asesmen = summarizeAsesmenDetailToLegacy(ad as ModulAsesmenDetail);
    }
    delete out.__syncDerivedAsesmen;
  }

  if (Array.isArray(out.kegiatanPembelajaran)) {
    // First pass: expand any __syncCloneOfPertemuan stage blocks
    const expandedMeetings = out.kegiatanPembelajaran.map((meetingRaw) =>
      isPlainRecord(meetingRaw) ? { ...meetingRaw } : meetingRaw
    );

    const baseMeeting = isPlainRecord(expandedMeetings[0]) ? expandedMeetings[0] : null;
    const baseStages =
      baseMeeting && Array.isArray(baseMeeting.tahapTerstruktur)
        ? baseMeeting.tahapTerstruktur
        : null;

    for (let idx = 0; idx < expandedMeetings.length; idx += 1) {
      const keg = expandedMeetings[idx];
      if (!isPlainRecord(keg)) continue;

      if (
        idx > 0 &&
        baseStages &&
        isPlainRecord(keg.tahapTerstruktur) &&
        keg.tahapTerstruktur.__syncCloneOfPertemuan === 0 &&
        Array.isArray(keg.tahapTerstruktur.overrides)
      ) {
        const overrides = keg.tahapTerstruktur.overrides;
        if (overrides.length === baseStages.length) {
          keg.tahapTerstruktur = overrides.map((ovRaw, sIdx) => {
            const baseSt = isPlainRecord(baseStages[sIdx]) ? baseStages[sIdx] : {};
            const ov = isPlainRecord(ovRaw) ? ovRaw : {};
            return {
              ...baseSt,
              id: ov.id,
              urutan: ov.urutan,
              durasiMenit: ov.durasiMenit,
            };
          });
        }
      }

      if (keg.__syncDerivedSteps === 1) {
        if (Array.isArray(keg.tahapTerstruktur) && keg.tahapTerstruktur.length > 0) {
          const derivedSteps = syncLegacyArraysFromStructuredStages(
            keg.tahapTerstruktur as TahapKegiatanTerstruktur[]
          );
          keg.pendahuluan = derivedSteps.pendahuluan;
          keg.inti = derivedSteps.inti;
          keg.penutup = derivedSteps.penutup;
        }
        delete keg.__syncDerivedSteps;
      }
    }

    out.kegiatanPembelajaran = expandedMeetings;
  }

  return out;
}

function encodeLegacyBackupForWire(
  rawBackup: Record<string, unknown>,
  workspaceContext: Record<string, unknown>
): Record<string, unknown> {
  if (
    Object.prototype.hasOwnProperty.call(rawBackup, '__syncDedupedKeys') ||
    !isPlainRecord(rawBackup.entries)
  ) {
    return rawBackup;
  }

  const backupEntries = rawBackup.entries;
  const slimEntries: Record<string, unknown> = {};
  const dedupedKeys: string[] = [];

  for (const [subKey, rawStr] of Object.entries(backupEntries)) {
    if (
      typeof rawStr === 'string' &&
      Object.prototype.hasOwnProperty.call(workspaceContext, subKey)
    ) {
      const topVal = workspaceContext[subKey];
      let reconstructedRaw: string;
      if (isModulDraftStorageKey(subKey) && isPlainRecord(topVal)) {
        const roundTripped = decodeModulAjarFromWire(encodeModulAjarForWire(topVal));
        reconstructedRaw = JSON.stringify(roundTripped);
      } else {
        reconstructedRaw = typeof topVal === 'string' ? topVal : JSON.stringify(topVal);
      }
      if (reconstructedRaw === rawStr) {
        dedupedKeys.push(subKey);
        continue;
      }
    }
    slimEntries[subKey] = rawStr;
  }

  if (dedupedKeys.length === 0) {
    return rawBackup;
  }

  return {
    ...rawBackup,
    entries: slimEntries,
    __syncDedupedKeys: dedupedKeys,
  };
}

function decodeLegacyBackupFromWire(
  rawBackup: Record<string, unknown>,
  workspaceContext: Record<string, unknown>
): Record<string, unknown> {
  if (!Array.isArray(rawBackup.__syncDedupedKeys)) {
    return rawBackup;
  }

  const out: Record<string, unknown> = { ...rawBackup };
  const reconstructedEntries: Record<string, unknown> = isPlainRecord(rawBackup.entries)
    ? { ...rawBackup.entries }
    : {};

  for (const subKey of rawBackup.__syncDedupedKeys) {
    if (
      typeof subKey === 'string' &&
      Object.prototype.hasOwnProperty.call(workspaceContext, subKey)
    ) {
      const topVal = workspaceContext[subKey];
      reconstructedEntries[subKey] =
        typeof topVal === 'string' ? topVal : JSON.stringify(topVal);
    }
  }

  out.entries = reconstructedEntries;
  delete out.__syncDedupedKeys;
  return out;
}

/**
 * Lossless wire compaction for Cloud Sync transport.
 * Never mutates input and restores exact deep-equal domain objects on decode.
 */
export function encodeEntriesForCloudSync(
  entries: Record<string, unknown>,
  workspaceContext?: Record<string, unknown>
): Record<string, unknown> {
  const ctx = workspaceContext || entries;
  const encoded: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entries || {})) {
    if (isModulDraftStorageKey(key) && isPlainRecord(value)) {
      encoded[key] = encodeModulAjarForWire(value);
      continue;
    }
    if (key === 'asesmerdeka_legacy_backup_v1' && isPlainRecord(value)) {
      encoded[key] = encodeLegacyBackupForWire(value, ctx);
      continue;
    }
    encoded[key] = value;
  }

  return encoded;
}

export function decodeEntriesFromCloudSync(
  entries: Record<string, unknown>,
  workspaceContext?: Record<string, unknown>
): Record<string, unknown> {
  const decoded: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entries || {})) {
    if (key === 'asesmerdeka_legacy_backup_v1') continue;
    if (isModulDraftStorageKey(key) && isPlainRecord(value)) {
      decoded[key] = decodeModulAjarFromWire(value);
      continue;
    }
    decoded[key] = value;
  }

  if (Object.prototype.hasOwnProperty.call(entries || {}, 'asesmerdeka_legacy_backup_v1')) {
    const rawBackup = (entries || {})['asesmerdeka_legacy_backup_v1'];
    const mergedContext = workspaceContext
      ? { ...workspaceContext, ...decoded }
      : decoded;
    decoded['asesmerdeka_legacy_backup_v1'] = isPlainRecord(rawBackup)
      ? decodeLegacyBackupFromWire(rawBackup, mergedContext)
      : rawBackup;
  }

  return decoded;
}

export type UploadChunkPayload =
  | {
      kind: 'entries';
      entriesChunk: Record<string, unknown>;
    }
  | {
      kind: 'oversized_part';
      key: string;
      partIndex: number;
      totalParts: number;
      slice: string;
      valueType: 'json' | 'string';
    };

function splitOversizedEntryToChunks(
  key: string,
  value: unknown,
  maxChunkBytes: number
): UploadChunkPayload[] {
  const valueType: 'json' | 'string' = typeof value === 'string' ? 'string' : 'json';
  const rawStr = valueType === 'string' ? (value as string) : JSON.stringify(value) ?? 'null';

  const makeTestBytes = (slice: string) =>
    measureUtf8Bytes({
      kind: 'oversized_part',
      key,
      partIndex: 9999,
      totalParts: 9999,
      slice,
      valueType,
    });

  const slices: string[] = [];
  let cursor = 0;

  while (cursor < rawStr.length) {
    let low = cursor + 1;
    let high = rawStr.length;
    let best = cursor + 1;

    while (low <= high) {
      let mid = Math.floor((low + high) / 2);
      if (
        mid < rawStr.length &&
        rawStr.charCodeAt(mid - 1) >= 0xd800 &&
        rawStr.charCodeAt(mid - 1) <= 0xdbff
      ) {
        if (mid + 1 <= rawStr.length) {
          mid += 1;
        } else {
          mid -= 1;
        }
      }
      if (mid <= cursor) {
        mid = Math.min(rawStr.length, cursor + 1);
      }

      const candidate = rawStr.slice(cursor, mid);
      if (makeTestBytes(candidate) <= maxChunkBytes) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Avoid splitting surrogate pair if best landed mid-pair
    if (
      best < rawStr.length &&
      best > cursor + 1 &&
      rawStr.charCodeAt(best - 1) >= 0xd800 &&
      rawStr.charCodeAt(best - 1) <= 0xdbff
    ) {
      best -= 1;
    }

    slices.push(rawStr.slice(cursor, best));
    cursor = best;
  }

  return slices.map((slice, idx) => ({
    kind: 'oversized_part',
    key,
    partIndex: idx,
    totalParts: slices.length,
    slice,
    valueType,
  }));
}

/**
 * Splits a workspace entries map into UTF-8 byte-bounded chunks for sequential staged upload.
 */
export function planWorkspaceUploadChunks(
  entries: Record<string, unknown>,
  maxChunkBytes = 280_000
): UploadChunkPayload[] {
  const safeBudget = Math.max(4_096, Math.round(maxChunkBytes));
  const sortedKeys = Object.keys(entries || {}).sort();
  if (sortedKeys.length === 0) {
    return [{ kind: 'entries', entriesChunk: {} }];
  }

  const chunks: UploadChunkPayload[] = [];
  let currentEntries: Record<string, unknown> = {};
  let currentBytes = measureUtf8Bytes({ kind: 'entries', entriesChunk: {} });

  const flushCurrent = () => {
    if (Object.keys(currentEntries).length > 0) {
      chunks.push({ kind: 'entries', entriesChunk: currentEntries });
      currentEntries = {};
      currentBytes = measureUtf8Bytes({ kind: 'entries', entriesChunk: {} });
    }
  };

  for (const key of sortedKeys) {
    const val = entries[key];
    const singleEnvelopeBytes = measureUtf8Bytes({
      kind: 'entries',
      entriesChunk: { [key]: val },
    });

    if (singleEnvelopeBytes > safeBudget) {
      flushCurrent();
      const splitParts = splitOversizedEntryToChunks(key, val, safeBudget);
      chunks.push(...splitParts);
      continue;
    }

    const entryDeltaBytes = measureUtf8Bytes(key) + measureUtf8Bytes(val) + 6;
    if (
      Object.keys(currentEntries).length > 0 &&
      currentBytes + entryDeltaBytes > safeBudget
    ) {
      const candidate = { ...currentEntries, [key]: val };
      const exactCandidateBytes = measureUtf8Bytes({
        kind: 'entries',
        entriesChunk: candidate,
      });
      if (exactCandidateBytes > safeBudget) {
        flushCurrent();
      }
    }

    currentEntries[key] = val;
    currentBytes = measureUtf8Bytes({
      kind: 'entries',
      entriesChunk: currentEntries,
    });
  }

  flushCurrent();
  return chunks.length > 0 ? chunks : [{ kind: 'entries', entriesChunk: {} }];
}
