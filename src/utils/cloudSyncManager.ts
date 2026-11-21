import {
  collectAllowedBackupEntries,
  importBackupDataJson,
  setConfirmedClassSetup,
  type CustomTPItem,
} from './schoolProfileStorage';
import { getUserQuota, isLicensed, normalizeLicenseCodeInput } from './licenseManager';
import { computeNilaiAkhir, generateAutoDeskripsiRapor } from './kelasHarianStorage';
import {
  computeCanonicalDigestHex,
  computeEntriesDelta,
  computeWorkspaceEntryDigests,
  decodeEntriesFromCloudSync,
  encodeEntriesForCloudSync,
  measureUtf8Bytes,
  planWorkspaceUploadChunks,
  type WorkspaceEntryDigests,
} from './cloudSyncPayloadCodec';
import type {
  JurnalMengajarItem,
  KelasHarianData,
  NilaiSiswaItem,
  PresensiPertemuan,
  SiswaItem,
  StatusKehadiran,
} from '../types/kelasHarian';

const STORAGE_KEY_TEACHER_PIN = 'asesmerdeka_cloud_teacher_pin_v1';
const STORAGE_KEY_LAST_SYNC_AT = 'asesmerdeka_cloud_last_sync_at_v1';
const STORAGE_KEY_CLOUD_CONFIGURED = 'asesmerdeka_cloud_configured_v1';
const STORAGE_KEY_BASE_REVISION_MAP = 'asesmerdeka_cloud_base_revision_map_v1';
const STORAGE_KEY_BASE_SNAPSHOT_MAP = 'asesmerdeka_cloud_base_snapshot_map_v1';
const STORAGE_KEY_BASE_ENTRY_HASHES_MAP = 'asesmerdeka_cloud_base_entry_hashes_v1';
const STORAGE_KEY_PENDING_CONFLICT = 'asesmerdeka_cloud_pending_conflict_v1';
const STORAGE_KEY_PRE_CONFLICT_BACKUP = 'asesmerdeka_cloud_pre_conflict_backup_v1';
const STORAGE_KEY_LAST_SYNC_ERROR = 'asesmerdeka_cloud_last_sync_error_v1';
const STORAGE_KEY_LAST_SYNC_ERROR_DETAIL = 'asesmerdeka_cloud_last_sync_error_detail_v1';
const STORAGE_KEY_INFLIGHT_SYNC = 'asesmerdeka_cloud_inflight_sync_v1';
const STORAGE_KEY_PENDING_PIN_RECOVERY = 'asesmerdeka_cloud_pending_pin_recovery_v1';

const DEFAULT_CLOUD_SYNC_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_CHUNK_BYTES = 280_000;

export const CLOUD_SYNC_STATUS_EVENT = 'asesmerdeka:cloud-sync-status';

export type CloudSyncErrorKind =
  | 'payload_too_large'
  | 'partial_sync'
  | 'timeout'
  | 'rate_limited'
  | 'server_unavailable'
  | 'network_error'
  | 'pin_reverification_required'
  | 'other';

export interface CloudSyncErrorDetail {
  kind: CloudSyncErrorKind;
  statusCode?: number;
  message: string;
  occurredAt: string;
  action: 'push' | 'pull';
  uploadedChunks?: number;
  failedChunkIndex?: number;
  totalChunks?: number;
  maxBytes?: number;
  actualBytes?: number;
  retryAfterSeconds?: number;
}

export type HonestCloudStatus =
  | 'local'
  | 'unconfigured'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'reverify_required'
  | 'sync_error';

export type CloudConflictCategory = 'siswa' | 'presensi' | 'jurnal' | 'nilai' | 'umum';

export type ConflictChoice = 'local' | 'server';

export type CloudConflictLocator =
  | {
      kind: 'harian_scalar';
      storageKey: string;
      field: keyof KelasHarianData;
    }
  | {
      kind: 'harian_siswa';
      storageKey: string;
      collection: 'daftarSiswa' | 'archivedSiswa';
      siswaId: string;
      field: keyof SiswaItem;
    }
  | {
      kind: 'harian_presensi_status';
      storageKey: string;
      pertemuanId: string;
      siswaId: string;
    }
  | {
      kind: 'harian_presensi_field';
      storageKey: string;
      pertemuanId: string;
      field: 'tanggal' | 'pertemuanKe' | 'catatanPertemuan' | 'statusKeterlaksanaan';
    }
  | {
      kind: 'harian_jurnal_field';
      storageKey: string;
      jurnalId: string;
      field: keyof JurnalMengajarItem;
    }
  | {
      kind: 'harian_nilai_formatif';
      storageKey: string;
      siswaId: string;
      kodeTP: string;
    }
  | {
      kind: 'harian_nilai_field';
      storageKey: string;
      siswaId: string;
      field:
        | 'nilaiSTS'
        | 'nilaiSAS'
        | 'nilaiPraktik'
        | 'catatanGuru'
        | 'statusRapor'
        | 'finalizedAt'
        | 'deskripsiRapor';
    }
  | {
      kind: 'harian_nilai_subrecord';
      storageKey: string;
      siswaId: string;
      collection: 'buktiAsesmenSubTP' | 'riwayatRemedial';
      itemId: string;
    }
  | {
      kind: 'roster_siswa';
      storageKey: string;
      collection: 'daftarSiswa' | 'archivedSiswa';
      siswaId: string;
      field: keyof SiswaItem;
    }
  | {
      kind: 'object_key';
      storageKey: string;
      propKey: string;
    }
  | {
      kind: 'modul_referensi_item';
      storageKey: string;
      itemId: string;
    }
  | {
      kind: 'whole_entry';
      storageKey: string;
    };

export interface CloudConflictItem {
  id: string;
  storageKey: string;
  category: CloudConflictCategory;
  label: string;
  fieldLabel: string;
  localValue: unknown;
  serverValue: unknown;
  baseValue?: unknown;
  defaultChoice: ConflictChoice;
  locator: CloudConflictLocator;
}

export interface WorkspaceConflictAnalysis {
  mergedEntries: Record<string, unknown>;
  conflicts: CloudConflictItem[];
  autoMergedSummary: string[];
}

export interface CloudPendingConflict {
  licenseCode: string;
  teacherPin: string;
  deviceId: string;
  detectedAt: string;
  baseRevision: number | null;
  serverRevision: number;
  serverUpdatedAt: string | null;
  lastDeviceId: string;
  cloudConfigured: boolean;
  localEntries: Record<string, unknown>;
  serverEntries: Record<string, unknown>;
  mergedEntries: Record<string, unknown>;
  conflicts: CloudConflictItem[];
  autoMergedSummary: string[];
}

export interface CloudPreConflictBackup {
  savedAt: string;
  reason: 'conflict_409' | 'pre_resolution' | 'pre_pull';
  licenseCode: string;
  teacherPin: string;
  baseRevision: number | null;
  entries: Record<string, unknown>;
}

export interface CloudPendingPinRecovery {
  licenseCode: string;
  teacherPinHintUsed: boolean;
  lockedNamespaceDigest?: string;
  failedAction: 'pull' | 'push';
  sunsetIso?: string;
  recoverySupported: boolean;
  detectedAt: string;
  message: string;
}

export interface LegacyPinRecoverySubmission {
  mode: 'reverify' | 'replace';
  currentPin: string;
  newPin?: string;
  confirmNewPin?: string;
  licenseCode?: string;
  resumeAction?: 'pull' | 'push';
}

export interface LegacyPinRecoveryResult {
  ok: boolean;
  mode: 'reverify' | 'replace';
  resumedAction: 'pull' | 'push';
  statusCode?: number;
  revision?: number;
  restoredCount?: number;
  cloudConfigured?: boolean;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  redisUnavailable?: boolean;
  pinReverificationRequired?: boolean;
  message: string;
}

export interface CloudSyncPushResult {
  ok: boolean;
  conflict?: boolean;
  idempotent?: boolean;
  cloudConfigured?: boolean;
  revision?: number;
  serverRevision?: number;
  serverUpdatedAt?: string | null;
  lastDeviceId?: string;
  updatedAt?: string;
  conflicts?: CloudConflictItem[];
  autoMergedSummary?: string[];
  statusCode?: number;
  pinReverificationRequired?: boolean;
  legacySunsetExpired?: boolean;
  recoverySupported?: boolean;
  sunsetIso?: string;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  redisUnavailable?: boolean;
  payloadTooLarge?: boolean;
  partialSync?: boolean;
  timedOut?: boolean;
  skippedUnchanged?: boolean;
  uploadedChunks?: number;
  failedChunkIndex?: number;
  totalChunks?: number;
  maxBytes?: number;
  actualBytes?: number;
  mode?: 'inline' | 'delta' | 'chunked' | 'skipped_unchanged';
  requestCount?: number;
  rawBytes?: number;
  wireBytes?: number;
  maxRequestBytes?: number;
  changedRecords?: number;
  totalDocuments?: number;
  durationMs?: number;
  message: string;
}

export interface CloudSyncPullResult {
  ok: boolean;
  found: boolean;
  restoredCount: number;
  cloudConfigured?: boolean;
  revision?: number;
  updatedAt?: string;
  lastDeviceId?: string;
  statusCode?: number;
  pinReverificationRequired?: boolean;
  legacySunsetExpired?: boolean;
  recoverySupported?: boolean;
  sunsetIso?: string;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  redisUnavailable?: boolean;
  payloadTooLarge?: boolean;
  partialSync?: boolean;
  timedOut?: boolean;
  uploadedChunks?: number;
  failedChunkIndex?: number;
  totalChunks?: number;
  mode?: 'inline' | 'chunked_pull';
  requestCount?: number;
  rawBytes?: number;
  maxRequestBytes?: number;
  totalDocuments?: number;
  durationMs?: number;
  message: string;
}

export interface CloudConflictResolutionResult {
  ok: boolean;
  strategy: 'merge_safe' | 'use_server' | 'force_local';
  conflict?: boolean;
  cloudConfigured?: boolean;
  revision?: number;
  updatedAt?: string;
  restoredCount?: number;
  message: string;
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function deepClone<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') {
    return value;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function canonicalStringify(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  const obj = val as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(',')}}`;
}

function stableEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return canonicalStringify(a) === canonicalStringify(b);
}

function buildWorkspaceScope(licenseCode: string, teacherPin: string): string {
  const cleanCode = normalizeLicenseCodeInput(licenseCode || '');
  const cleanPin = (teacherPin || '').trim().toUpperCase().replace(/[^A-Z0-9_:#-]/g, '');
  return `${cleanCode}::${cleanPin || 'MAIN'}`;
}

export function getSavedTeacherSyncPin(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY_TEACHER_PIN) || '').trim();
  } catch {
    return '';
  }
}

export function saveTeacherSyncPin(pin: string): void {
  try {
    const clean = pin.trim().toUpperCase().replace(/[^A-Z0-9_:#-]/g, '');
    if (clean) {
      localStorage.setItem(STORAGE_KEY_TEACHER_PIN, clean);
    } else {
      localStorage.removeItem(STORAGE_KEY_TEACHER_PIN);
    }
  } catch {
    // ignore
  }
}

export function getLastCloudSyncAt(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC_AT);
  } catch {
    return null;
  }
}

function setLastCloudSyncAt(isoStr: string | null): void {
  try {
    if (isoStr) {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC_AT, isoStr);
    } else {
      localStorage.removeItem(STORAGE_KEY_LAST_SYNC_AT);
    }
  } catch {
    // ignore
  }
}

export function isCloudBackendConfigured(): boolean | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOUD_CONFIGURED);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function setCloudConfiguredFlag(configured: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_CLOUD_CONFIGURED, configured ? 'true' : 'false');
  } catch {
    // ignore
  }
}

interface StoredWorkspaceEntryHashes {
  revision: number | null;
  workspaceDigest: string;
  entryDigests: Record<string, string>;
  entryCount: number;
  updatedAt: string;
}

interface InflightSyncState {
  action: 'push' | 'pull';
  scope: string;
  digest: string;
  startedAt: string;
}

interface AutoSyncSuppressionRecord {
  kind: CloudSyncErrorKind;
  failures: number;
  blockedPermanent?: boolean;
  retryAfterMs: number;
  lastDigest: string;
}

const autoSyncSuppressionMap = new Map<string, AutoSyncSuppressionRecord>();

export function clearCloudSyncAutoRetrySuppression(): void {
  autoSyncSuppressionMap.clear();
}

function hasLastSyncError(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC_ERROR) === 'true';
  } catch {
    return false;
  }
}

function setLastSyncErrorFlag(hasError: boolean): void {
  try {
    if (hasError) {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC_ERROR, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_LAST_SYNC_ERROR);
    }
  } catch {
    // ignore
  }
}

export function getLastCloudSyncErrorDetail(): CloudSyncErrorDetail | null {
  try {
    return safeParseJson<CloudSyncErrorDetail | null>(
      localStorage.getItem(STORAGE_KEY_LAST_SYNC_ERROR_DETAIL),
      null
    );
  } catch {
    return null;
  }
}

function saveLastSyncErrorDetail(detail: CloudSyncErrorDetail | null): void {
  try {
    if (detail) {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC_ERROR_DETAIL, JSON.stringify(detail));
    } else {
      localStorage.removeItem(STORAGE_KEY_LAST_SYNC_ERROR_DETAIL);
    }
  } catch {
    // ignore
  }
}

function getInflightSyncState(): InflightSyncState | null {
  try {
    return safeParseJson<InflightSyncState | null>(
      localStorage.getItem(STORAGE_KEY_INFLIGHT_SYNC),
      null
    );
  } catch {
    return null;
  }
}

function setInflightSyncState(state: InflightSyncState | null): void {
  try {
    if (state) {
      localStorage.setItem(STORAGE_KEY_INFLIGHT_SYNC, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY_INFLIGHT_SYNC);
    }
  } catch {
    // ignore
  }
}

function getWorkspaceBaseEntryHashes(
  licenseCode?: string,
  teacherPin?: string
): StoredWorkspaceEntryHashes | null {
  try {
    const quota = getUserQuota();
    const cleanCode = normalizeLicenseCodeInput(licenseCode || quota.licenseKey || '');
    const cleanPin = (
      teacherPin !== undefined ? teacherPin : getSavedTeacherSyncPin()
    ).trim();
    if (!cleanCode) return null;
    const scope = buildWorkspaceScope(cleanCode, cleanPin);
    const map = safeParseJson<Record<string, StoredWorkspaceEntryHashes>>(
      localStorage.getItem(STORAGE_KEY_BASE_ENTRY_HASHES_MAP),
      {}
    );
    return map[scope] || null;
  } catch {
    return null;
  }
}

function setWorkspaceBaseEntryHashes(
  licenseCode: string,
  teacherPin: string,
  revision: number | null,
  digests: WorkspaceEntryDigests
): void {
  try {
    const scope = buildWorkspaceScope(licenseCode, teacherPin);
    const map = safeParseJson<Record<string, StoredWorkspaceEntryHashes>>(
      localStorage.getItem(STORAGE_KEY_BASE_ENTRY_HASHES_MAP),
      {}
    );
    map[scope] = {
      revision,
      workspaceDigest: digests.workspaceDigest,
      entryDigests: digests.entryDigests,
      entryCount: digests.entryCount,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_BASE_ENTRY_HASHES_MAP, JSON.stringify(map));
  } catch {
    // ignore quota error on hash map
  }
}

export function getWorkspaceBaseRevision(
  explicitLicenseCode?: string,
  explicitTeacherPin?: string
): number | null {
  try {
    const quota = getUserQuota();
    const licenseCode = normalizeLicenseCodeInput(explicitLicenseCode || quota.licenseKey || '');
    const teacherPin = (
      explicitTeacherPin !== undefined ? explicitTeacherPin : getSavedTeacherSyncPin()
    ).trim();
    if (!licenseCode) return null;
    const scope = buildWorkspaceScope(licenseCode, teacherPin);
    const revMap = safeParseJson<Record<string, number>>(
      localStorage.getItem(STORAGE_KEY_BASE_REVISION_MAP),
      {}
    );
    const val = revMap[scope];
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}

function setWorkspaceBaseRevision(
  licenseCode: string,
  teacherPin: string,
  revision: number | null
): void {
  try {
    const scope = buildWorkspaceScope(licenseCode, teacherPin);
    const revMap = safeParseJson<Record<string, number>>(
      localStorage.getItem(STORAGE_KEY_BASE_REVISION_MAP),
      {}
    );
    if (typeof revision === 'number' && Number.isFinite(revision)) {
      revMap[scope] = revision;
    } else {
      delete revMap[scope];
    }
    localStorage.setItem(STORAGE_KEY_BASE_REVISION_MAP, JSON.stringify(revMap));
  } catch {
    // ignore
  }
}

export function getWorkspaceBaseSnapshot(
  explicitLicenseCode?: string,
  explicitTeacherPin?: string
): Record<string, unknown> | null {
  try {
    const quota = getUserQuota();
    const licenseCode = normalizeLicenseCodeInput(explicitLicenseCode || quota.licenseKey || '');
    const teacherPin = (
      explicitTeacherPin !== undefined ? explicitTeacherPin : getSavedTeacherSyncPin()
    ).trim();
    if (!licenseCode) return null;
    const scope = buildWorkspaceScope(licenseCode, teacherPin);
    const snapMap = safeParseJson<Record<string, Record<string, unknown>>>(
      localStorage.getItem(STORAGE_KEY_BASE_SNAPSHOT_MAP),
      {}
    );
    return snapMap[scope] || null;
  } catch {
    return null;
  }
}

function setWorkspaceBaseSnapshot(
  licenseCode: string,
  teacherPin: string,
  entries: Record<string, unknown>
): void {
  const scope = buildWorkspaceScope(licenseCode, teacherPin);
  const cloned = deepClone(entries);
  try {
    const snapMap = safeParseJson<Record<string, Record<string, unknown>>>(
      localStorage.getItem(STORAGE_KEY_BASE_SNAPSHOT_MAP),
      {}
    );
    snapMap[scope] = cloned;
    localStorage.setItem(STORAGE_KEY_BASE_SNAPSHOT_MAP, JSON.stringify(snapMap));
  } catch {
    // Fallback on QuotaExceededError: prune other scopes so active scope fits cleanly
    try {
      localStorage.setItem(
        STORAGE_KEY_BASE_SNAPSHOT_MAP,
        JSON.stringify({ [scope]: cloned })
      );
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY_BASE_SNAPSHOT_MAP);
      } catch {
        // ignore storage cleanup failure
      }
    }
  }
}

export function getPendingCloudConflict(): CloudPendingConflict | null {
  try {
    return safeParseJson<CloudPendingConflict | null>(
      localStorage.getItem(STORAGE_KEY_PENDING_CONFLICT),
      null
    );
  } catch {
    return null;
  }
}

export function syncPendingCloudConflictWithLocalState(
  entriesOverride?: Record<string, unknown>
): CloudPendingConflict | null {
  const pending = getPendingCloudConflict();
  if (!pending) return null;

  const liveEntries = entriesOverride || collectWorkspaceSyncEntries();
  if (!liveEntries || Object.keys(liveEntries).length === 0) {
    return pending;
  }
  if (stableEqual(liveEntries, pending.localEntries)) {
    return pending;
  }

  const baseSnapshot = getWorkspaceBaseSnapshot(pending.licenseCode, pending.teacherPin);
  const analysis = analyzeWorkspaceConflict(baseSnapshot, liveEntries, pending.serverEntries);
  const updated: CloudPendingConflict = {
    ...pending,
    localEntries: deepClone(liveEntries),
    mergedEntries: analysis.mergedEntries,
    conflicts: analysis.conflicts,
    autoMergedSummary: analysis.autoMergedSummary,
  };
  savePendingCloudConflict(updated);
  return updated;
}

function savePendingCloudConflict(conflict: CloudPendingConflict | null): void {
  try {
    if (conflict) {
      localStorage.setItem(STORAGE_KEY_PENDING_CONFLICT, JSON.stringify(conflict));
    } else {
      localStorage.removeItem(STORAGE_KEY_PENDING_CONFLICT);
    }
  } catch {
    // ignore
  }
}

export function getPendingLegacyPinRecovery(): CloudPendingPinRecovery | null {
  try {
    return safeParseJson<CloudPendingPinRecovery | null>(
      localStorage.getItem(STORAGE_KEY_PENDING_PIN_RECOVERY),
      null
    );
  } catch {
    return null;
  }
}

function savePendingLegacyPinRecovery(recovery: CloudPendingPinRecovery | null): void {
  try {
    if (recovery) {
      localStorage.setItem(STORAGE_KEY_PENDING_PIN_RECOVERY, JSON.stringify(recovery));
    } else {
      localStorage.removeItem(STORAGE_KEY_PENDING_PIN_RECOVERY);
    }
  } catch {
    // ignore
  }
}

export function clearPendingLegacyPinRecovery(): void {
  savePendingLegacyPinRecovery(null);
  emitCloudSyncStatus(getCloudSyncUiStatus());
}

export function getPreConflictBackup(): CloudPreConflictBackup | null {
  try {
    return safeParseJson<CloudPreConflictBackup | null>(
      localStorage.getItem(STORAGE_KEY_PRE_CONFLICT_BACKUP),
      null
    );
  } catch {
    return null;
  }
}

export function savePreConflictBackup(
  reason: CloudPreConflictBackup['reason'],
  licenseCode: string,
  teacherPin: string,
  baseRevision: number | null,
  entries?: Record<string, unknown>
): CloudPreConflictBackup | null {
  try {
    const snapshot = deepClone(entries || collectWorkspaceSyncEntries());
    const backup: CloudPreConflictBackup = {
      savedAt: new Date().toISOString(),
      reason,
      licenseCode: normalizeLicenseCodeInput(licenseCode || ''),
      teacherPin: (teacherPin || '').trim(),
      baseRevision,
      entries: snapshot,
    };
    localStorage.setItem(STORAGE_KEY_PRE_CONFLICT_BACKUP, JSON.stringify(backup));
    return backup;
  } catch {
    return null;
  }
}

export function restorePreConflictBackup(): {
  ok: boolean;
  restoredCount: number;
  message: string;
} {
  const backup = getPreConflictBackup();
  if (!backup || !backup.entries || Object.keys(backup.entries).length === 0) {
    return {
      ok: false,
      restoredCount: 0,
      message: 'Belum ada snapshot backup pra-konflik yang tersimpan.',
    };
  }

  const wrappedBackup = JSON.stringify({
    app: 'AsesMerdeka Studio',
    version: '1.0.0',
    exportedAt: backup.savedAt,
    entries: backup.entries,
  });

  const importRes = importBackupDataJson(wrappedBackup);
  if (importRes.success) {
    setConfirmedClassSetup(true);
    savePendingCloudConflict(null);
    emitCloudSyncStatus(getCloudSyncUiStatus());
    return {
      ok: true,
      restoredCount: importRes.restoredCount,
      message: `Snapshot lokal sebelum konflik berhasil dipulihkan (${importRes.restoredCount} kelompok data).`,
    };
  }

  return {
    ok: false,
    restoredCount: 0,
    message: importRes.message || 'Gagal memulihkan snapshot lokal pra-konflik.',
  };
}

export function getCloudSyncUiStatus(options?: {
  isSyncing?: boolean;
  lastError?: boolean;
}): HonestCloudStatus {
  const quota = getUserQuota();
  if (!isLicensed(quota.tier) || !quota.licenseKey) {
    return 'local';
  }
  if (getPendingCloudConflict()) {
    return 'conflict';
  }
  if (getPendingLegacyPinRecovery()) {
    return 'reverify_required';
  }
  if (options?.isSyncing) {
    return 'syncing';
  }
  if (options?.lastError || hasLastSyncError()) {
    return 'sync_error';
  }
  const configured = isCloudBackendConfigured();
  if (configured === false) {
    return 'unconfigured';
  }
  const inflight = getInflightSyncState();
  if (inflight) {
    const scope = buildWorkspaceScope(quota.licenseKey, getSavedTeacherSyncPin());
    if (inflight.scope === scope) {
      return 'local';
    }
  }
  if (configured === true && getLastCloudSyncAt()) {
    return 'synced';
  }
  return 'local';
}

export function emitCloudSyncStatus(
  status?: HonestCloudStatus,
  detail?: Record<string, unknown>
): void {
  if (status === 'sync_error') {
    setLastSyncErrorFlag(true);
  } else if (
    status === 'synced' ||
    status === 'unconfigured' ||
    status === 'local' ||
    status === 'conflict' ||
    status === 'reverify_required'
  ) {
    setLastSyncErrorFlag(false);
    saveLastSyncErrorDetail(null);
  }
  const resolvedStatus = status || getCloudSyncUiStatus();
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent(CLOUD_SYNC_STATUS_EVENT, {
          detail: {
            status: resolvedStatus,
            ...(detail || {}),
          },
        })
      );
    }
  } catch {
    // ignore outside DOM
  }
}

export function isSchoolCollectiveLicenseCode(rawCode?: string): boolean {
  const clean = normalizeLicenseCodeInput(rawCode || '');
  return (
    clean.startsWith('ASM-SK26-') ||
    clean.startsWith('ASM-SP26-') ||
    clean.startsWith('ASM-STG2-SK26-') ||
    clean.startsWith('ASM-STG2-SP26-') ||
    clean.includes('SEKOLAH') ||
    clean.includes('SMAN') ||
    clean.includes('SMPN') ||
    clean.includes('SDN') ||
    clean.includes('SCH')
  );
}

/**
 * Mengambil seluruh data akademik yang aman untuk disinkronkan ke Cloud
 */
export function collectWorkspaceSyncEntries(): Record<string, unknown> {
  try {
    return collectAllowedBackupEntries();
  } catch {
    return {};
  }
}

function createSyncRequestId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `req_${crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// =========================================================================
// 3-WAY MERGE & CONFLICT ANALYSIS ENGINE
// =========================================================================

function isEmptyOrNullish(val: unknown): boolean {
  return val === undefined || val === null || val === '';
}

function resolveThreeWayField(
  hasBase: boolean,
  baseVal: unknown,
  localVal: unknown,
  serverVal: unknown,
  options?: { additiveIfNoBase?: boolean }
): { resolved: unknown; hasConflict: boolean } {
  if (stableEqual(localVal, serverVal)) {
    return { resolved: deepClone(localVal), hasConflict: false };
  }

  if (hasBase) {
    if (stableEqual(localVal, baseVal)) {
      return { resolved: deepClone(serverVal), hasConflict: false };
    }
    if (stableEqual(serverVal, baseVal)) {
      return { resolved: deepClone(localVal), hasConflict: false };
    }
    return { resolved: deepClone(localVal), hasConflict: true };
  }

  // Tanpa ancestor eksplisit (atau key baru dibuat di kedua sisi):
  if (options?.additiveIfNoBase) {
    if (isEmptyOrNullish(localVal) && !isEmptyOrNullish(serverVal)) {
      return { resolved: deepClone(serverVal), hasConflict: false };
    }
    if (!isEmptyOrNullish(localVal) && isEmptyOrNullish(serverVal)) {
      return { resolved: deepClone(localVal), hasConflict: false };
    }
  }

  if (localVal === undefined && serverVal !== undefined) {
    return { resolved: deepClone(serverVal), hasConflict: false };
  }
  if (serverVal === undefined && localVal !== undefined) {
    return { resolved: deepClone(localVal), hasConflict: false };
  }

  return { resolved: deepClone(localVal), hasConflict: true };
}

function isKelasHarianEntry(key: string, value: unknown): value is KelasHarianData {
  if (!key.startsWith('asesmerdeka_harian_')) return false;
  if (!isPlainObject(value)) return false;
  return (
    Array.isArray(value.daftarSiswa) ||
    Array.isArray(value.daftarNilai) ||
    Array.isArray(value.daftarPresensi) ||
    Array.isArray(value.daftarJurnal)
  );
}

function isRosterEntry(key: string, value: unknown): boolean {
  return (
    key.startsWith('asesmerdeka_roster_v2__') &&
    isPlainObject(value) &&
    (Array.isArray(value.daftarSiswa) || Array.isArray(value.archivedSiswa))
  );
}

function extractCustomTPsForHarian(
  mergedEntries: Record<string, unknown>,
  harian: Partial<KelasHarianData>
): CustomTPItem[] {
  const mapObj = mergedEntries['asesmerdeka_custom_tp_v2'];
  if (!isPlainObject(mapObj)) return [];
  const targetMapel = String(harian.mataPelajaran || '').trim().toLowerCase();
  const targetSem = String(harian.semester || '').toLowerCase().includes('2') ? 'sem2' : 'sem1';
  for (const [k, list] of Object.entries(mapObj)) {
    if (!Array.isArray(list)) continue;
    const normKey = k.toLowerCase();
    if (
      (!targetMapel || normKey.includes(targetMapel.replace(/[^a-z0-9]+/g, '_'))) &&
      normKey.includes(targetSem)
    ) {
      return list as CustomTPItem[];
    }
  }
  return [];
}

function areSiswaContentEqualExcludingNoUrut(
  a: SiswaItem | undefined,
  b: SiswaItem | undefined
): boolean {
  if (!a || !b) return false;
  return stableEqual({ ...a, noUrut: 0 }, { ...b, noUrut: 0 });
}

function mergeSiswaLists(params: {
  storageKey: string;
  collection: 'daftarSiswa' | 'archivedSiswa';
  locatorKind: 'harian_siswa' | 'roster_siswa';
  baseList: SiswaItem[];
  localList: SiswaItem[];
  serverList: SiswaItem[];
  hasBase: boolean;
  conflicts: CloudConflictItem[];
  autoMergedSummary: string[];
}): SiswaItem[] {
  const {
    storageKey,
    collection,
    locatorKind,
    baseList,
    localList,
    serverList,
    hasBase,
    conflicts,
    autoMergedSummary,
  } = params;

  const baseMap = new Map<string, SiswaItem>(baseList.map((s) => [s.id, s]));
  const localMap = new Map<string, SiswaItem>(localList.map((s) => [s.id, s]));
  const serverMap = new Map<string, SiswaItem>(serverList.map((s) => [s.id, s]));

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  const pushId = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      orderedIds.push(id);
    }
  };
  localList.forEach((s) => pushId(s.id));
  serverList.forEach((s) => pushId(s.id));

  const fields: (keyof SiswaItem)[] = [
    'nis',
    'nisn',
    'nama',
    'jenisKelamin',
    'statusAktif',
    'rombelAsal',
    'rombelTujuan',
    'tanggalMutasi',
    'catatanMutasi',
  ];

  const merged: SiswaItem[] = [];
  let addedFromOtherDevice = 0;
  let removedCleanly = 0;

  for (const id of orderedIds) {
    const b = baseMap.get(id);
    const l = localMap.get(id);
    const s = serverMap.get(id);

    // Dihapus pada salah satu sisi (abaikan pergeseran nomor urut noUrut akibat mutasi/hapus siswa lain)
    if (!l && s) {
      if (hasBase && b && areSiswaContentEqualExcludingNoUrut(b, s)) {
        // Dihapus secara sadar oleh lokal, server tidak menyentuh
        removedCleanly++;
        continue;
      }
      if (!b) {
        addedFromOtherDevice++;
      }
      merged.push(deepClone(s));
      continue;
    }
    if (l && !s) {
      if (hasBase && b && areSiswaContentEqualExcludingNoUrut(b, l)) {
        // Dihapus secara sadar oleh server, lokal tidak menyentuh
        removedCleanly++;
        continue;
      }
      merged.push(deepClone(l));
      continue;
    }
    if (!l || !s) continue;

    if (stableEqual(l, s)) {
      merged.push(deepClone(l));
      continue;
    }

    const mergedSiswa: SiswaItem = deepClone(l);
    for (const field of fields) {
      const res = resolveThreeWayField(Boolean(b), b?.[field], l[field], s[field], {
        additiveIfNoBase: true,
      });
      (mergedSiswa as unknown as Record<string, unknown>)[field] = res.resolved;
      if (res.hasConflict) {
        conflicts.push({
          id: `${storageKey}::${collection}::${id}::${String(field)}`,
          storageKey,
          category: 'siswa',
          label: `Siswa: ${l.nama || s.nama || id}`,
          fieldLabel: String(field),
          localValue: l[field],
          serverValue: s[field],
          baseValue: b?.[field],
          defaultChoice: 'local',
          locator:
            locatorKind === 'harian_siswa'
              ? {
                  kind: 'harian_siswa',
                  storageKey,
                  collection,
                  siswaId: id,
                  field,
                }
              : {
                  kind: 'roster_siswa',
                  storageKey,
                  collection,
                  siswaId: id,
                  field,
                },
        });
      }
    }
    merged.push(mergedSiswa);
  }

  if (addedFromOtherDevice > 0) {
    autoMergedSummary.push(
      `${addedFromOtherDevice} data siswa (${collection === 'daftarSiswa' ? 'aktif' : 'arsip'}) dari perangkat lain digabung aman.`
    );
  }
  if (removedCleanly > 0) {
    autoMergedSummary.push(
      `${removedCleanly} pemindahan/penghapusan siswa (${collection === 'daftarSiswa' ? 'aktif' : 'arsip'}) diterapkan sinkron.`
    );
  }

  return merged.map((item, idx) => ({
    ...item,
    noUrut: idx + 1,
  }));
}

function reconcileActiveAndArchivedSiswa(
  activeList: SiswaItem[],
  archivedList: SiswaItem[],
  autoMergedSummary: string[]
): { active: SiswaItem[]; archived: SiswaItem[] } {
  if (!archivedList.length || !activeList.length) {
    return { active: activeList, archived: archivedList };
  }
  const archivedIds = new Set(archivedList.map((s) => s.id));
  const filteredActive: SiswaItem[] = [];
  let deduplicatedCount = 0;

  for (const item of activeList) {
    if (archivedIds.has(item.id)) {
      deduplicatedCount++;
      continue;
    }
    filteredActive.push(item);
  }

  if (deduplicatedCount > 0) {
    autoMergedSummary.push(
      `${deduplicatedCount} siswa yang diarsipkan dide-duplikasi dari daftar siswa aktif tanpa menghapus histori nilai/presensi.`
    );
  }

  return {
    active: filteredActive.map((item, idx) => ({
      ...item,
      noUrut: idx + 1,
    })),
    archived: archivedList.map((item, idx) => ({
      ...item,
      noUrut: idx + 1,
    })),
  };
}

function buildPresensiCompositeKey(p: PresensiPertemuan): string {
  return `${p.pertemuanKe}::${String(p.tanggal || '').trim()}`;
}

function mergePresensiLists(params: {
  storageKey: string;
  baseList: PresensiPertemuan[];
  localList: PresensiPertemuan[];
  serverList: PresensiPertemuan[];
  hasBase: boolean;
  siswaNameById: Map<string, string>;
  conflicts: CloudConflictItem[];
  autoMergedSummary: string[];
}): PresensiPertemuan[] {
  const {
    storageKey,
    baseList,
    localList,
    serverList,
    hasBase,
    siswaNameById,
    conflicts,
    autoMergedSummary,
  } = params;

  const baseById = new Map(baseList.map((p) => [p.id, p]));
  const localById = new Map(localList.map((p) => [p.id, p]));
  const serverById = new Map(serverList.map((p) => [p.id, p]));

  // Pasangkan pertemuan baru yang dibuat terpisah di 2 perangkat pada pertemuanKe + tanggal yang sama
  const serverIdRemap = new Map<string, PresensiPertemuan>();
  const localByComposite = new Map<string, PresensiPertemuan>();
  for (const l of localList) {
    localByComposite.set(buildPresensiCompositeKey(l), l);
  }
  const serverRemappedIds = new Set<string>();
  for (const s of serverList) {
    if (!localById.has(s.id) && !baseById.has(s.id)) {
      const comp = buildPresensiCompositeKey(s);
      const localMatch = localByComposite.get(comp);
      if (localMatch && !baseById.has(localMatch.id)) {
        serverIdRemap.set(localMatch.id, s);
        serverRemappedIds.add(s.id);
      }
    }
  }

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  localList.forEach((p) => {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      orderedIds.push(p.id);
    }
  });
  serverList.forEach((p) => {
    if (!serverRemappedIds.has(p.id) && !seen.has(p.id)) {
      seen.add(p.id);
      orderedIds.push(p.id);
    }
  });

  const merged: PresensiPertemuan[] = [];
  let addedMeetings = 0;

  for (const id of orderedIds) {
    const b = baseById.get(id);
    const l = localById.get(id);
    const s = serverById.get(id) || serverIdRemap.get(id);

    if (!l && s) {
      if (hasBase && b && stableEqual(b, s)) continue;
      addedMeetings++;
      merged.push(deepClone(s));
      continue;
    }
    if (l && !s) {
      if (hasBase && b && stableEqual(b, l)) continue;
      merged.push(deepClone(l));
      continue;
    }
    if (!l || !s) continue;

    if (stableEqual(l, s)) {
      merged.push(deepClone(l));
      continue;
    }

    const out: PresensiPertemuan = deepClone(l);
    const metaFields: ('tanggal' | 'pertemuanKe' | 'catatanPertemuan' | 'statusKeterlaksanaan')[] = [
      'tanggal',
      'pertemuanKe',
      'catatanPertemuan',
      'statusKeterlaksanaan',
    ];
    for (const field of metaFields) {
      const res = resolveThreeWayField(Boolean(b), b?.[field], l[field], s[field], {
        additiveIfNoBase: true,
      });
      (out as unknown as Record<string, unknown>)[field] = res.resolved;
      if (res.hasConflict) {
        conflicts.push({
          id: `${storageKey}::presensi::${id}::${field}`,
          storageKey,
          category: 'presensi',
          label: `Presensi Pertemuan ${l.pertemuanKe} (${l.tanggal})`,
          fieldLabel: field,
          localValue: l[field],
          serverValue: s[field],
          baseValue: b?.[field],
          defaultChoice: 'local',
          locator: {
            kind: 'harian_presensi_field',
            storageKey,
            pertemuanId: id,
            field,
          },
        });
      }
    }

    const bMap = b?.statusMap || {};
    const lMap = l.statusMap || {};
    const sMap = s.statusMap || {};
    const allStudentIds = new Set([...Object.keys(lMap), ...Object.keys(sMap)]);
    const mergedMap: Record<string, StatusKehadiran> = {};
    for (const sid of allStudentIds) {
      const hasStudentBase = Boolean(b) && Object.prototype.hasOwnProperty.call(bMap, sid);
      const res = resolveThreeWayField(hasStudentBase, bMap[sid], lMap[sid], sMap[sid], {
        additiveIfNoBase: true,
      });
      if (res.resolved !== undefined) {
        mergedMap[sid] = res.resolved as StatusKehadiran;
      }
      if (res.hasConflict) {
        const studentName = siswaNameById.get(sid) || sid;
        conflicts.push({
          id: `${storageKey}::presensi::${id}::status::${sid}`,
          storageKey,
          category: 'presensi',
          label: `Presensi P${l.pertemuanKe} (${l.tanggal}) — ${studentName}`,
          fieldLabel: 'Status Kehadiran',
          localValue: lMap[sid],
          serverValue: sMap[sid],
          baseValue: bMap[sid],
          defaultChoice: 'local',
          locator: {
            kind: 'harian_presensi_status',
            storageKey,
            pertemuanId: id,
            siswaId: sid,
          },
        });
      }
    }
    out.statusMap = mergedMap;
    merged.push(out);
  }

  if (addedMeetings > 0) {
    autoMergedSummary.push(
      `${addedMeetings} pertemuan presensi dari perangkat lain digabung otomatis.`
    );
  }

  return merged.sort((a, b) => a.pertemuanKe - b.pertemuanKe);
}

function mergeJurnalLists(params: {
  storageKey: string;
  baseList: JurnalMengajarItem[];
  localList: JurnalMengajarItem[];
  serverList: JurnalMengajarItem[];
  hasBase: boolean;
  conflicts: CloudConflictItem[];
  autoMergedSummary: string[];
}): JurnalMengajarItem[] {
  const { storageKey, baseList, localList, serverList, hasBase, conflicts, autoMergedSummary } =
    params;

  const baseById = new Map(baseList.map((j) => [j.id, j]));
  const localById = new Map(localList.map((j) => [j.id, j]));
  const serverById = new Map(serverList.map((j) => [j.id, j]));

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  localList.forEach((j) => {
    if (!seen.has(j.id)) {
      seen.add(j.id);
      orderedIds.push(j.id);
    }
  });
  serverList.forEach((j) => {
    if (!seen.has(j.id)) {
      seen.add(j.id);
      orderedIds.push(j.id);
    }
  });

  const fields: (keyof JurnalMengajarItem)[] = [
    'pertemuanKe',
    'tanggal',
    'jamKe',
    'tpId',
    'subTpIds',
    'kodeTP',
    'materiPokok',
    'jumlahJP',
    'kegiatanPembelajaran',
    'siswaTidakHadir',
    'catatanRefleksi',
    'statusKeterlaksanaan',
    'tindakLanjut',
  ];

  const merged: JurnalMengajarItem[] = [];
  let addedCount = 0;

  for (const id of orderedIds) {
    const b = baseById.get(id);
    const l = localById.get(id);
    const s = serverById.get(id);

    if (!l && s) {
      if (hasBase && b && stableEqual(b, s)) continue;
      addedCount++;
      merged.push(deepClone(s));
      continue;
    }
    if (l && !s) {
      if (hasBase && b && stableEqual(b, l)) continue;
      merged.push(deepClone(l));
      continue;
    }
    if (!l || !s) continue;

    if (stableEqual(l, s)) {
      merged.push(deepClone(l));
      continue;
    }

    const out: JurnalMengajarItem = deepClone(l);
    for (const field of fields) {
      const res = resolveThreeWayField(Boolean(b), b?.[field], l[field], s[field], {
        additiveIfNoBase: true,
      });
      (out as unknown as Record<string, unknown>)[field] = res.resolved;
      if (res.hasConflict) {
        conflicts.push({
          id: `${storageKey}::jurnal::${id}::${String(field)}`,
          storageKey,
          category: 'jurnal',
          label: `Jurnal P${l.pertemuanKe} (${l.tanggal})`,
          fieldLabel: String(field),
          localValue: l[field],
          serverValue: s[field],
          baseValue: b?.[field],
          defaultChoice: 'local',
          locator: {
            kind: 'harian_jurnal_field',
            storageKey,
            jurnalId: id,
            field,
          },
        });
      }
    }
    merged.push(out);
  }

  if (addedCount > 0) {
    autoMergedSummary.push(`${addedCount} entri jurnal mengajar dari perangkat lain digabung.`);
  }

  return merged.sort((a, b) => a.pertemuanKe - b.pertemuanKe);
}

function recomputeNilaiRow(
  item: NilaiSiswaItem,
  tpList: CustomTPItem[],
  bobotPolicy?: KelasHarianData['bobotNilai'],
  forceRefreshDeskripsi = false
): NilaiSiswaItem {
  const computed = computeNilaiAkhir(
    item.nilaiFormatif || {},
    item.nilaiSTS,
    item.nilaiSAS,
    tpList.length > 0 ? tpList : undefined,
    bobotPolicy,
    item.nilaiPraktik
  );
  const next: NilaiSiswaItem = {
    ...item,
    nilaiAkhir: computed.na,
    predikatKKTP: computed.predikat,
    statusNilai: computed.statusNilai,
  };
  if (forceRefreshDeskripsi && tpList.length > 0) {
    next.deskripsiRapor = generateAutoDeskripsiRapor(item.nilaiFormatif || {}, tpList, item.nama, {
      bobotPolicy,
      nilaiSTS: item.nilaiSTS,
      nilaiSAS: item.nilaiSAS,
      nilaiPraktik: item.nilaiPraktik,
      buktiAsesmenSubTP: item.buktiAsesmenSubTP,
      riwayatRemedial: item.riwayatRemedial,
    });
  }
  return next;
}

function mergeNilaiSubRecordArray<T extends { id: string }>(params: {
  storageKey: string;
  siswaId: string;
  studentName: string;
  collection: 'buktiAsesmenSubTP' | 'riwayatRemedial';
  labelPrefix: string;
  baseList: T[];
  localList: T[];
  serverList: T[];
  hasStudentBase: boolean;
  conflicts: CloudConflictItem[];
}): { merged: T[]; addedOrUpdatedCount: number } {
  const {
    storageKey,
    siswaId,
    studentName,
    collection,
    labelPrefix,
    baseList,
    localList,
    serverList,
    hasStudentBase,
    conflicts,
  } = params;

  const baseById = new Map(baseList.filter((r) => r?.id).map((r) => [r.id, r]));
  const localById = new Map(localList.filter((r) => r?.id).map((r) => [r.id, r]));
  const serverById = new Map(serverList.filter((r) => r?.id).map((r) => [r.id, r]));

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  localList.forEach((r) => {
    if (r?.id && !seen.has(r.id)) {
      seen.add(r.id);
      orderedIds.push(r.id);
    }
  });
  serverList.forEach((r) => {
    if (r?.id && !seen.has(r.id)) {
      seen.add(r.id);
      orderedIds.push(r.id);
    }
  });

  const merged: T[] = [];
  let addedOrUpdatedCount = 0;

  for (const id of orderedIds) {
    const b = baseById.get(id);
    const l = localById.get(id);
    const s = serverById.get(id);

    if (!l && s) {
      if (hasStudentBase && b && stableEqual(b, s)) continue;
      merged.push(deepClone(s));
      addedOrUpdatedCount++;
      continue;
    }
    if (l && !s) {
      if (hasStudentBase && b && stableEqual(b, l)) continue;
      merged.push(deepClone(l));
      continue;
    }
    if (!l || !s) continue;

    if (stableEqual(l, s)) {
      merged.push(deepClone(l));
      continue;
    }

    const res = resolveThreeWayField(Boolean(hasStudentBase && b), b, l, s, {
      additiveIfNoBase: false,
    });
    if (res.hasConflict) {
      merged.push(deepClone(l));
      conflicts.push({
        id: `${storageKey}::nilai::${siswaId}::${collection}::${id}`,
        storageKey,
        category: 'nilai',
        label: `${labelPrefix} — ${studentName}`,
        fieldLabel: `${labelPrefix} (${id})`,
        localValue: l,
        serverValue: s,
        baseValue: b,
        defaultChoice: 'local',
        locator: {
          kind: 'harian_nilai_subrecord',
          storageKey,
          siswaId,
          collection,
          itemId: id,
        },
      });
    } else {
      const chosen = res.resolved as T;
      merged.push(deepClone(chosen));
      if (!stableEqual(chosen, l)) {
        addedOrUpdatedCount++;
      }
    }
  }

  return { merged, addedOrUpdatedCount };
}

function mergeNilaiLists(params: {
  storageKey: string;
  baseList: NilaiSiswaItem[];
  localList: NilaiSiswaItem[];
  serverList: NilaiSiswaItem[];
  hasBase: boolean;
  tpList: CustomTPItem[];
  bobotPolicy?: KelasHarianData['bobotNilai'];
  conflicts: CloudConflictItem[];
  autoMergedSummary: string[];
}): NilaiSiswaItem[] {
  const {
    storageKey,
    baseList,
    localList,
    serverList,
    hasBase,
    tpList,
    bobotPolicy,
    conflicts,
    autoMergedSummary,
  } = params;

  const baseById = new Map(baseList.map((n) => [n.siswaId, n]));
  const localById = new Map(localList.map((n) => [n.siswaId, n]));
  const serverById = new Map(serverList.map((n) => [n.siswaId, n]));

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  localList.forEach((n) => {
    if (!seen.has(n.siswaId)) {
      seen.add(n.siswaId);
      orderedIds.push(n.siswaId);
    }
  });
  serverList.forEach((n) => {
    if (!seen.has(n.siswaId)) {
      seen.add(n.siswaId);
      orderedIds.push(n.siswaId);
    }
  });

  const merged: NilaiSiswaItem[] = [];
  let autoMergedScoresCount = 0;

  for (const sid of orderedIds) {
    const b = baseById.get(sid);
    const l = localById.get(sid);
    const s = serverById.get(sid);

    if (!l && s) {
      if (hasBase && b && stableEqual(b, s)) continue;
      merged.push(deepClone(s));
      continue;
    }
    if (l && !s) {
      if (hasBase && b && stableEqual(b, l)) continue;
      merged.push(deepClone(l));
      continue;
    }
    if (!l || !s) continue;

    if (stableEqual(l, s)) {
      merged.push(deepClone(l));
      continue;
    }

    const out: NilaiSiswaItem = deepClone(l);
    const studentName = l.nama || s.nama || sid;

    // 1. Merge nilaiFormatif per TP secara granular
    const bFmt = b?.nilaiFormatif || {};
    const lFmt = l.nilaiFormatif || {};
    const sFmt = s.nilaiFormatif || {};
    const allTpKeys = new Set([...Object.keys(lFmt), ...Object.keys(sFmt)]);
    const mergedFmt: Record<string, number | null | undefined> = {};
    let scoreChangedFromMerge = false;

    for (const tpKey of allTpKeys) {
      const hasTpBase = Boolean(b) && Object.prototype.hasOwnProperty.call(bFmt, tpKey);
      const res = resolveThreeWayField(hasTpBase, bFmt[tpKey], lFmt[tpKey], sFmt[tpKey], {
        additiveIfNoBase: true,
      });
      mergedFmt[tpKey] = res.resolved as number | null | undefined;
      if (res.hasConflict) {
        conflicts.push({
          id: `${storageKey}::nilai::${sid}::fmt::${tpKey}`,
          storageKey,
          category: 'nilai',
          label: `Nilai Formatif (${tpKey}) — ${studentName}`,
          fieldLabel: `Nilai ${tpKey}`,
          localValue: lFmt[tpKey],
          serverValue: sFmt[tpKey],
          baseValue: bFmt[tpKey],
          defaultChoice: 'local',
          locator: {
            kind: 'harian_nilai_formatif',
            storageKey,
            siswaId: sid,
            kodeTP: tpKey,
          },
        });
      } else if (!stableEqual(res.resolved, lFmt[tpKey])) {
        scoreChangedFromMerge = true;
        autoMergedScoresCount++;
      }
    }
    out.nilaiFormatif = mergedFmt;

    // 2. Merge STS, SAS, Praktik, Catatan Guru, Status Rapor
    const scalarFields: {
      field: 'nilaiSTS' | 'nilaiSAS' | 'nilaiPraktik' | 'catatanGuru' | 'statusRapor' | 'finalizedAt';
      label: string;
    }[] = [
      { field: 'nilaiSTS', label: 'Nilai STS' },
      { field: 'nilaiSAS', label: 'Nilai SAS' },
      { field: 'nilaiPraktik', label: 'Nilai Praktik' },
      { field: 'catatanGuru', label: 'Catatan Guru Rapor' },
      { field: 'statusRapor', label: 'Status Finalisasi Rapor' },
      { field: 'finalizedAt', label: 'Waktu Finalisasi Rapor' },
    ];

    for (const { field, label } of scalarFields) {
      const res = resolveThreeWayField(Boolean(b), b?.[field], l[field], s[field], {
        additiveIfNoBase: true,
      });
      (out as unknown as Record<string, unknown>)[field] = res.resolved;
      if (res.hasConflict) {
        conflicts.push({
          id: `${storageKey}::nilai::${sid}::${field}`,
          storageKey,
          category: 'nilai',
          label: `${label} — ${studentName}`,
          fieldLabel: label,
          localValue: l[field],
          serverValue: s[field],
          baseValue: b?.[field],
          defaultChoice: 'local',
          locator: {
            kind: 'harian_nilai_field',
            storageKey,
            siswaId: sid,
            field,
          },
        });
      } else if (
        (field === 'nilaiSTS' || field === 'nilaiSAS' || field === 'nilaiPraktik') &&
        !stableEqual(res.resolved, l[field])
      ) {
        scoreChangedFromMerge = true;
        autoMergedScoresCount++;
      }
    }

    // 2b. Merge buktiAsesmenSubTP & riwayatRemedial secara granular per ID
    const buktiRes = mergeNilaiSubRecordArray({
      storageKey,
      siswaId: sid,
      studentName,
      collection: 'buktiAsesmenSubTP',
      labelPrefix: 'Bukti Asesmen Sub-TP',
      baseList: b?.buktiAsesmenSubTP || [],
      localList: l.buktiAsesmenSubTP || [],
      serverList: s.buktiAsesmenSubTP || [],
      hasStudentBase: Boolean(b),
      conflicts,
    });
    if (buktiRes.merged.length > 0) {
      out.buktiAsesmenSubTP = buktiRes.merged;
    } else if (l.buktiAsesmenSubTP || s.buktiAsesmenSubTP) {
      out.buktiAsesmenSubTP = [];
    }
    if (buktiRes.addedOrUpdatedCount > 0) {
      autoMergedScoresCount += buktiRes.addedOrUpdatedCount;
    }

    const remedialRes = mergeNilaiSubRecordArray({
      storageKey,
      siswaId: sid,
      studentName,
      collection: 'riwayatRemedial',
      labelPrefix: 'Riwayat Tindak Lanjut Remedial',
      baseList: b?.riwayatRemedial || [],
      localList: l.riwayatRemedial || [],
      serverList: s.riwayatRemedial || [],
      hasStudentBase: Boolean(b),
      conflicts,
    });
    if (remedialRes.merged.length > 0) {
      out.riwayatRemedial = remedialRes.merged;
    } else if (l.riwayatRemedial || s.riwayatRemedial) {
      out.riwayatRemedial = [];
    }
    if (remedialRes.addedOrUpdatedCount > 0) {
      autoMergedScoresCount += remedialRes.addedOrUpdatedCount;
    }

    // 3. Handle deskripsiRapor:
    // Jika nilai formatif mengalami merge bersih dan deskripsi hanya otomatis, hitung ulang deskripsi agar akurat
    const descRes = resolveThreeWayField(
      Boolean(b),
      b?.deskripsiRapor,
      l.deskripsiRapor,
      s.deskripsiRapor,
      { additiveIfNoBase: true }
    );
    const shouldRecomputeAutoDesc =
      scoreChangedFromMerge &&
      tpList.length > 0 &&
      (stableEqual(l.nilaiFormatif, s.nilaiFormatif) === false);

    if (shouldRecomputeAutoDesc) {
      out.deskripsiRapor = generateAutoDeskripsiRapor(out.nilaiFormatif, tpList, studentName, {
        bobotPolicy,
        nilaiSTS: out.nilaiSTS,
        nilaiSAS: out.nilaiSAS,
        nilaiPraktik: out.nilaiPraktik,
        buktiAsesmenSubTP: out.buktiAsesmenSubTP,
        riwayatRemedial: out.riwayatRemedial,
      });
    } else if (descRes.hasConflict) {
      out.deskripsiRapor = l.deskripsiRapor;
      conflicts.push({
        id: `${storageKey}::nilai::${sid}::deskripsiRapor`,
        storageKey,
        category: 'nilai',
        label: `Deskripsi Capaian e-Rapor — ${studentName}`,
        fieldLabel: 'Deskripsi Rapor',
        localValue: l.deskripsiRapor,
        serverValue: s.deskripsiRapor,
        baseValue: b?.deskripsiRapor,
        defaultChoice: 'local',
        locator: {
          kind: 'harian_nilai_field',
          storageKey,
          siswaId: sid,
          field: 'deskripsiRapor',
        },
      });
    } else {
      out.deskripsiRapor = String(descRes.resolved || l.deskripsiRapor || '');
    }

    merged.push(recomputeNilaiRow(out, tpList, bobotPolicy, false));
  }

  if (autoMergedScoresCount > 0) {
    autoMergedSummary.push(
      `${autoMergedScoresCount} komponen nilai non-bentrok antar perangkat digabung dan Nilai Akhir dihitung ulang.`
    );
  }

  return merged;
}

interface ReferensiRecordLike {
  id: string;
  judulBuku?: string;
  [key: string]: unknown;
}

function isReferensiArrayEntry(val: unknown): val is ReferensiRecordLike[] {
  return (
    Array.isArray(val) &&
    val.every((item) => isPlainObject(item) && typeof item.id === 'string' && item.id.trim().length > 0)
  );
}

function mergeReferensiSumberArrays(params: {
  storageKey: string;
  baseVal: unknown;
  localVal: unknown;
  serverVal: unknown;
  hasBase: boolean;
  conflicts: CloudConflictItem[];
  autoMergedSummary: string[];
}): ReferensiRecordLike[] {
  const { storageKey, baseVal, localVal, serverVal, hasBase, conflicts, autoMergedSummary } = params;
  const baseList = isReferensiArrayEntry(baseVal) ? baseVal : [];
  const localList = isReferensiArrayEntry(localVal) ? localVal : [];
  const serverList = isReferensiArrayEntry(serverVal) ? serverVal : [];

  const baseById = new Map(baseList.map((it) => [it.id, it]));
  const localById = new Map(localList.map((it) => [it.id, it]));
  const serverById = new Map(serverList.map((it) => [it.id, it]));
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  for (const list of [localList, serverList, baseList]) {
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        orderedIds.push(item.id);
      }
    }
  }

  const merged: ReferensiRecordLike[] = [];
  let addedFromCloud = 0;

  for (const id of orderedIds) {
    const b = baseById.get(id);
    const l = localById.get(id);
    const s = serverById.get(id);

    if (!l && s) {
      if (hasBase && b && stableEqual(b, s)) {
        // Dihapus secara sadar oleh perangkat lokal
        continue;
      }
      merged.push(deepClone(s));
      addedFromCloud++;
      continue;
    }

    if (!s && l) {
      if (hasBase && b && stableEqual(b, l)) {
        // Dihapus secara sadar oleh perangkat lain di cloud
        continue;
      }
      merged.push(deepClone(l));
      continue;
    }

    if (!l || !s) continue;

    if (stableEqual(l, s)) {
      merged.push(deepClone(l));
      continue;
    }

    const res = resolveThreeWayField(Boolean(hasBase && b), b, l, s, {
      additiveIfNoBase: true,
    });
    merged.push(deepClone(res.resolved as ReferensiRecordLike));
    if (res.hasConflict) {
      conflicts.push({
        id: `${storageKey}::ref::${id}`,
        storageKey,
        category: 'umum',
        label: `Referensi Sumber Modul (${String(l.judulBuku || s.judulBuku || id)})`,
        fieldLabel: `Referensi "${String(l.judulBuku || id)}"`,
        localValue: l,
        serverValue: s,
        baseValue: b,
        defaultChoice: 'local',
        locator: {
          kind: 'modul_referensi_item',
          storageKey,
          itemId: id,
        },
      });
    }
  }

  if (addedFromCloud > 0) {
    autoMergedSummary.push(
      `${addedFromCloud} referensi sumber ajar dari perangkat lain digabung otomatis ke Modul Ajar.`
    );
  }
  return merged;
}

function mergeGenericObjectThreeWay(params: {
  storageKey: string;
  baseObj: Record<string, unknown> | undefined;
  localObj: Record<string, unknown>;
  serverObj: Record<string, unknown>;
  hasBase: boolean;
  conflicts: CloudConflictItem[];
  autoMergedSummary: string[];
}): Record<string, unknown> {
  const { storageKey, baseObj, localObj, serverObj, hasBase, conflicts, autoMergedSummary } = params;
  const keys = new Set([...Object.keys(localObj), ...Object.keys(serverObj)]);
  const merged: Record<string, unknown> = {};
  const isModulDraftKey =
    storageKey.startsWith('asesmerdeka_modul_v2__') || storageKey.startsWith('modul_ajar_');

  for (const key of keys) {
    const hasPropBase = Boolean(hasBase && baseObj && Object.prototype.hasOwnProperty.call(baseObj, key));
    const bVal = baseObj?.[key];
    const lVal = localObj[key];
    const sVal = serverObj[key];

    if (
      isModulDraftKey &&
      key === 'referensiSumber' &&
      (Array.isArray(lVal) || Array.isArray(sVal))
    ) {
      merged[key] = mergeReferensiSumberArrays({
        storageKey,
        baseVal: bVal,
        localVal: lVal,
        serverVal: sVal,
        hasBase,
        conflicts,
        autoMergedSummary,
      });
      continue;
    }

    if (lVal === undefined && sVal !== undefined) {
      if (hasPropBase && stableEqual(bVal, sVal)) continue;
      merged[key] = deepClone(sVal);
      continue;
    }
    if (sVal === undefined && lVal !== undefined) {
      if (hasPropBase && stableEqual(bVal, lVal)) continue;
      merged[key] = deepClone(lVal);
      continue;
    }

    const res = resolveThreeWayField(hasPropBase, bVal, lVal, sVal, {
      additiveIfNoBase: true,
    });
    merged[key] = res.resolved;

    if (res.hasConflict) {
      conflicts.push({
        id: `${storageKey}::obj::${key}`,
        storageKey,
        category: 'umum',
        label: `Pengaturan / Data (${storageKey.replace(/^asesmerdeka_/, '')})`,
        fieldLabel: key,
        localValue: lVal,
        serverValue: sVal,
        baseValue: bVal,
        defaultChoice: 'local',
        locator: {
          kind: 'object_key',
          storageKey,
          propKey: key,
        },
      });
    }
  }

  return merged;
}

export function analyzeWorkspaceConflict(
  baseEntries: Record<string, unknown> | null,
  localEntries: Record<string, unknown>,
  serverEntries: Record<string, unknown>
): WorkspaceConflictAnalysis {
  const hasBase = Boolean(baseEntries && isPlainObject(baseEntries));
  const base = baseEntries || {};
  const mergedEntries: Record<string, unknown> = {};
  const conflicts: CloudConflictItem[] = [];
  const autoMergedSummary: string[] = [];

  const allKeys = new Set([...Object.keys(localEntries), ...Object.keys(serverEntries)]);

  // Proses custom TP lebih awal agar tersedia untuk regenerasi deskripsi e-Rapor bila nilai digabung
  const orderedKeys = Array.from(allKeys).sort((a, b) => {
    if (a === 'asesmerdeka_custom_tp_v2') return -1;
    if (b === 'asesmerdeka_custom_tp_v2') return 1;
    return a.localeCompare(b);
  });

  for (const key of orderedKeys) {
    const hasKeyBase = hasBase && Object.prototype.hasOwnProperty.call(base, key);
    const bVal = base[key];
    const lVal = localEntries[key];
    const sVal = serverEntries[key];

    if (lVal === undefined && sVal !== undefined) {
      if (hasKeyBase && stableEqual(bVal, sVal)) {
        // Dihapus secara sadar oleh lokal
        continue;
      }
      mergedEntries[key] = deepClone(sVal);
      autoMergedSummary.push(`Data baru dari Cloud (${key}) ditambahkan.`);
      continue;
    }

    if (sVal === undefined && lVal !== undefined) {
      if (hasKeyBase && stableEqual(bVal, lVal)) {
        // Dihapus secara sadar oleh server
        continue;
      }
      mergedEntries[key] = deepClone(lVal);
      continue;
    }

    if (stableEqual(lVal, sVal)) {
      mergedEntries[key] = deepClone(lVal);
      continue;
    }

    if (hasKeyBase) {
      if (stableEqual(lVal, bVal)) {
        mergedEntries[key] = deepClone(sVal);
        continue;
      }
      if (stableEqual(sVal, bVal)) {
        mergedEntries[key] = deepClone(lVal);
        continue;
      }
    }

    // 1. Merge granular KelasHarianData (Siswa, Presensi, Jurnal, Nilai, e-Rapor)
    if (isKelasHarianEntry(key, lVal) && isKelasHarianEntry(key, sVal)) {
      const bHarian = isKelasHarianEntry(key, bVal) ? bVal : undefined;
      const mergedHarian: KelasHarianData = deepClone(lVal);

      // Scalar fields pada KelasHarianData
      const scalarHarianFields: (keyof KelasHarianData)[] = [
        'rombel',
        'mataPelajaran',
        'semester',
        'tahunAjaran',
        'isSimulated',
        'dataSource',
        'verifiedActualAt',
        'bobotNilai',
      ];
      for (const field of scalarHarianFields) {
        const res = resolveThreeWayField(
          Boolean(bHarian),
          bHarian?.[field],
          lVal[field],
          sVal[field],
          { additiveIfNoBase: true }
        );
        (mergedHarian as unknown as Record<string, unknown>)[field] = res.resolved;
        if (res.hasConflict) {
          conflicts.push({
            id: `${key}::scalar::${String(field)}`,
            storageKey: key,
            category: 'umum',
            label: `Data Kelas ${lVal.rombel || ''} (${lVal.mataPelajaran || ''})`,
            fieldLabel: String(field),
            localValue: lVal[field],
            serverValue: sVal[field],
            baseValue: bHarian?.[field],
            defaultChoice: 'local',
            locator: {
              kind: 'harian_scalar',
              storageKey: key,
              field,
            },
          });
        }
      }

      mergedHarian.daftarSiswa = mergeSiswaLists({
        storageKey: key,
        collection: 'daftarSiswa',
        locatorKind: 'harian_siswa',
        baseList: bHarian?.daftarSiswa || [],
        localList: lVal.daftarSiswa || [],
        serverList: sVal.daftarSiswa || [],
        hasBase: Boolean(bHarian),
        conflicts,
        autoMergedSummary,
      });

      mergedHarian.archivedSiswa = mergeSiswaLists({
        storageKey: key,
        collection: 'archivedSiswa',
        locatorKind: 'harian_siswa',
        baseList: bHarian?.archivedSiswa || [],
        localList: lVal.archivedSiswa || [],
        serverList: sVal.archivedSiswa || [],
        hasBase: Boolean(bHarian),
        conflicts,
        autoMergedSummary,
      });

      const reconciledHarianSiswa = reconcileActiveAndArchivedSiswa(
        mergedHarian.daftarSiswa || [],
        mergedHarian.archivedSiswa || [],
        autoMergedSummary
      );
      mergedHarian.daftarSiswa = reconciledHarianSiswa.active;
      mergedHarian.archivedSiswa = reconciledHarianSiswa.archived;

      const siswaNameById = new Map<string, string>();
      [...(mergedHarian.daftarSiswa || []), ...(mergedHarian.archivedSiswa || [])].forEach((st) => {
        siswaNameById.set(st.id, st.nama);
      });

      mergedHarian.daftarPresensi = mergePresensiLists({
        storageKey: key,
        baseList: bHarian?.daftarPresensi || [],
        localList: lVal.daftarPresensi || [],
        serverList: sVal.daftarPresensi || [],
        hasBase: Boolean(bHarian),
        siswaNameById,
        conflicts,
        autoMergedSummary,
      });

      mergedHarian.daftarJurnal = mergeJurnalLists({
        storageKey: key,
        baseList: bHarian?.daftarJurnal || [],
        localList: lVal.daftarJurnal || [],
        serverList: sVal.daftarJurnal || [],
        hasBase: Boolean(bHarian),
        conflicts,
        autoMergedSummary,
      });

      const tpList = extractCustomTPsForHarian(mergedEntries, mergedHarian);
      mergedHarian.daftarNilai = mergeNilaiLists({
        storageKey: key,
        baseList: bHarian?.daftarNilai || [],
        localList: lVal.daftarNilai || [],
        serverList: sVal.daftarNilai || [],
        hasBase: Boolean(bHarian),
        tpList,
        bobotPolicy: mergedHarian.bobotNilai,
        conflicts,
        autoMergedSummary,
      });

      mergedEntries[key] = mergedHarian;
      continue;
    }

    // 2. Merge granular Roster V2
    if (isRosterEntry(key, lVal) && isRosterEntry(key, sVal)) {
      const bRoster = isRosterEntry(key, bVal) ? (bVal as Record<string, unknown>) : undefined;
      const mergedRoster = deepClone(lVal) as Record<string, unknown>;
      mergedRoster.daftarSiswa = mergeSiswaLists({
        storageKey: key,
        collection: 'daftarSiswa',
        locatorKind: 'roster_siswa',
        baseList: Array.isArray(bRoster?.daftarSiswa) ? (bRoster.daftarSiswa as SiswaItem[]) : [],
        localList: Array.isArray((lVal as Record<string, unknown>).daftarSiswa)
          ? ((lVal as Record<string, unknown>).daftarSiswa as SiswaItem[])
          : [],
        serverList: Array.isArray((sVal as Record<string, unknown>).daftarSiswa)
          ? ((sVal as Record<string, unknown>).daftarSiswa as SiswaItem[])
          : [],
        hasBase: Boolean(bRoster),
        conflicts,
        autoMergedSummary,
      });
      mergedRoster.archivedSiswa = mergeSiswaLists({
        storageKey: key,
        collection: 'archivedSiswa',
        locatorKind: 'roster_siswa',
        baseList: Array.isArray(bRoster?.archivedSiswa)
          ? (bRoster.archivedSiswa as SiswaItem[])
          : [],
        localList: Array.isArray((lVal as Record<string, unknown>).archivedSiswa)
          ? ((lVal as Record<string, unknown>).archivedSiswa as SiswaItem[])
          : [],
        serverList: Array.isArray((sVal as Record<string, unknown>).archivedSiswa)
          ? ((sVal as Record<string, unknown>).archivedSiswa as SiswaItem[])
          : [],
        hasBase: Boolean(bRoster),
        conflicts,
        autoMergedSummary,
      });

      const reconciledRosterSiswa = reconcileActiveAndArchivedSiswa(
        mergedRoster.daftarSiswa as SiswaItem[],
        mergedRoster.archivedSiswa as SiswaItem[],
        autoMergedSummary
      );
      mergedRoster.daftarSiswa = reconciledRosterSiswa.active;
      mergedRoster.archivedSiswa = reconciledRosterSiswa.archived;

      mergedEntries[key] = mergedRoster;
      continue;
    }

    // 3. Merge object entries (mis. profil sekolah, map TP per scope, draf modul ajar)
    if (isPlainObject(lVal) && isPlainObject(sVal)) {
      mergedEntries[key] = mergeGenericObjectThreeWay({
        storageKey: key,
        baseObj: isPlainObject(bVal) ? bVal : undefined,
        localObj: lVal,
        serverObj: sVal,
        hasBase: hasKeyBase,
        conflicts,
        autoMergedSummary,
      });
      continue;
    }

    // 4. Whole entry collision fallback
    mergedEntries[key] = deepClone(lVal);
    conflicts.push({
      id: `${key}::whole`,
      storageKey: key,
      category: 'umum',
      label: `Dokumen (${key})`,
      fieldLabel: 'Seluruh isi',
      localValue: lVal,
      serverValue: sVal,
      baseValue: bVal,
      defaultChoice: 'local',
      locator: {
        kind: 'whole_entry',
        storageKey: key,
      },
    });
  }

  return {
    mergedEntries,
    conflicts,
    autoMergedSummary,
  };
}

export function applyConflictChoicesToMergedEntries(
  pending: CloudPendingConflict,
  choices: Record<string, ConflictChoice>
): Record<string, unknown> {
  const result = deepClone(pending.mergedEntries);
  const touchedHarianNilai = new Set<string>();

  for (const conflict of pending.conflicts) {
    const choice: ConflictChoice = choices[conflict.id] || conflict.defaultChoice || 'local';
    const chosenVal = deepClone(choice === 'server' ? conflict.serverValue : conflict.localValue);
    const loc = conflict.locator;

    if (loc.kind === 'whole_entry') {
      if (chosenVal === undefined) {
        delete result[loc.storageKey];
      } else {
        result[loc.storageKey] = chosenVal;
      }
      continue;
    }

    if (loc.kind === 'object_key') {
      const obj = result[loc.storageKey];
      if (isPlainObject(obj)) {
        if (chosenVal === undefined) {
          delete obj[loc.propKey];
        } else {
          obj[loc.propKey] = chosenVal;
        }
      }
      continue;
    }

    if (loc.kind === 'modul_referensi_item') {
      const modulObj = result[loc.storageKey];
      if (isPlainObject(modulObj)) {
        const list = isReferensiArrayEntry(modulObj.referensiSumber)
          ? [...modulObj.referensiSumber]
          : [];
        const existingIdx = list.findIndex((it) => it.id === loc.itemId);
        if (chosenVal === undefined) {
          if (existingIdx >= 0) list.splice(existingIdx, 1);
        } else if (existingIdx >= 0) {
          list[existingIdx] = chosenVal as ReferensiRecordLike;
        } else {
          list.push(chosenVal as ReferensiRecordLike);
        }
        modulObj.referensiSumber = list;
      }
      continue;
    }

    if (loc.kind === 'roster_siswa') {
      const roster = result[loc.storageKey];
      if (isPlainObject(roster) && Array.isArray(roster[loc.collection])) {
        const list = roster[loc.collection] as SiswaItem[];
        const target = list.find((s) => s.id === loc.siswaId);
        if (target) {
          (target as unknown as Record<string, unknown>)[loc.field] = chosenVal;
        }
      }
      continue;
    }

    const harian = result[loc.storageKey];
    if (!isKelasHarianEntry(loc.storageKey, harian)) continue;

    if (loc.kind === 'harian_scalar') {
      (harian as unknown as Record<string, unknown>)[loc.field] = chosenVal;
    } else if (loc.kind === 'harian_siswa') {
      const list = harian[loc.collection] || [];
      const target = list.find((s) => s.id === loc.siswaId);
      if (target) {
        (target as unknown as Record<string, unknown>)[loc.field] = chosenVal;
      }
    } else if (loc.kind === 'harian_presensi_field') {
      const target = harian.daftarPresensi.find((p) => p.id === loc.pertemuanId);
      if (target) {
        (target as unknown as Record<string, unknown>)[loc.field] = chosenVal;
      }
    } else if (loc.kind === 'harian_presensi_status') {
      const target = harian.daftarPresensi.find((p) => p.id === loc.pertemuanId);
      if (target) {
        if (chosenVal === undefined) {
          delete target.statusMap[loc.siswaId];
        } else {
          target.statusMap[loc.siswaId] = chosenVal as StatusKehadiran;
        }
      }
    } else if (loc.kind === 'harian_jurnal_field') {
      const target = harian.daftarJurnal.find((j) => j.id === loc.jurnalId);
      if (target) {
        (target as unknown as Record<string, unknown>)[loc.field] = chosenVal;
      }
    } else if (loc.kind === 'harian_nilai_formatif') {
      const target = harian.daftarNilai.find((n) => n.siswaId === loc.siswaId);
      if (target) {
        if (!target.nilaiFormatif) target.nilaiFormatif = {};
        if (chosenVal === undefined) {
          delete target.nilaiFormatif[loc.kodeTP];
        } else {
          target.nilaiFormatif[loc.kodeTP] = chosenVal as number | null;
        }
        touchedHarianNilai.add(`${loc.storageKey}::${loc.siswaId}`);
      }
    } else if (loc.kind === 'harian_nilai_field') {
      const target = harian.daftarNilai.find((n) => n.siswaId === loc.siswaId);
      if (target) {
        (target as unknown as Record<string, unknown>)[loc.field] = chosenVal;
        if (loc.field === 'nilaiSTS' || loc.field === 'nilaiSAS' || loc.field === 'nilaiPraktik') {
          touchedHarianNilai.add(`${loc.storageKey}::${loc.siswaId}`);
        }
      }
    } else if (loc.kind === 'harian_nilai_subrecord') {
      const target = harian.daftarNilai.find((n) => n.siswaId === loc.siswaId);
      if (target) {
        const list = Array.isArray(target[loc.collection]) ? [...target[loc.collection]!] : [];
        const existingIdx = list.findIndex((entry) => entry.id === loc.itemId);
        if (chosenVal === undefined) {
          if (existingIdx >= 0) list.splice(existingIdx, 1);
        } else if (existingIdx >= 0) {
          list[existingIdx] = chosenVal as never;
        } else {
          list.push(chosenVal as never);
        }
        (target as unknown as Record<string, unknown>)[loc.collection] = list;
        touchedHarianNilai.add(`${loc.storageKey}::${loc.siswaId}`);
      }
    }
  }

  for (const composite of touchedHarianNilai) {
    const [storageKey, siswaId] = composite.split('::');
    const harian = result[storageKey];
    if (!isKelasHarianEntry(storageKey, harian)) continue;
    const idx = harian.daftarNilai.findIndex((n) => n.siswaId === siswaId);
    if (idx < 0) continue;
    const tpList = extractCustomTPsForHarian(result, harian);
    harian.daftarNilai[idx] = recomputeNilaiRow(
      harian.daftarNilai[idx],
      tpList,
      harian.bobotNilai,
      false
    );
  }

  return result;
}

// =========================================================================
// PUSH & PULL & CONFLICT RESOLUTION API
// =========================================================================

function extractClientNamespaceSegment(rawPin: string): string {
  const trimmed = String(rawPin || '').trim();
  const sepMatch = trimmed.match(/^([A-Za-z0-9_-]{2,40})[:#](.{2,64})$/);
  const base = sepMatch ? sepMatch[1] : trimmed;
  return base.toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 64);
}

function hashWorkspaceNamespaceToken(licenseCode: string, rawPin: string): string {
  const cleanCode = normalizeLicenseCodeInput(licenseCode || '');
  const namespaceSegment = extractClientNamespaceSegment(rawPin);
  if (!cleanCode || !namespaceSegment || !isSchoolCollectiveLicenseCode(cleanCode)) {
    return '';
  }
  const input = `asesmerdeka:ns-lock:v1:${cleanCode}:${namespaceSegment}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

interface PostCloudSyncResponse {
  ok: boolean;
  status: number;
  timedOut?: boolean;
  networkError?: boolean;
  data: Record<string, unknown> | null;
  requestBytes: number;
}

interface RequestStatsTracker {
  requestCount: number;
  wireBytes: number;
  maxRequestBytes: number;
}

function recordRequestStat(stats: RequestStatsTracker, reqBytes: number): void {
  stats.requestCount += 1;
  stats.wireBytes += reqBytes;
  if (reqBytes > stats.maxRequestBytes) {
    stats.maxRequestBytes = reqBytes;
  }
}

async function postCloudSyncJson(
  payload: Record<string, unknown>,
  timeoutMs: number,
  stats?: RequestStatsTracker
): Promise<PostCloudSyncResponse> {
  const bodyStr = JSON.stringify(payload);
  const requestBytes = measureUtf8Bytes(bodyStr);
  if (stats) {
    recordRequestStat(stats, requestBytes);
  }

  const effectiveTimeout =
    typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_CLOUD_SYNC_TIMEOUT_MS;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timerId = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // ignore abort error
      }
      resolve({ timedOut: true });
    }, effectiveTimeout);
  });

  try {
    const fetchPromise = fetch('/api/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      ...(controller ? { signal: controller.signal } : {}),
    });

    const raceResult = await Promise.race([
      fetchPromise.then((response) => ({ timedOut: false as const, response })),
      timeoutPromise,
    ]);

    if (raceResult.timedOut) {
      return {
        ok: false,
        status: 408,
        timedOut: true,
        data: {
          ok: false,
          timedOut: true,
          message:
            'Batas waktu koneksi sinkronisasi Cloud habis (HTTP 408). Perubahan lokal tetap aman tersimpan di peramban.',
        },
        requestBytes,
      };
    }

    const res = raceResult.response;
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.status === 408) {
      return {
        ok: false,
        status: 408,
        timedOut: true,
        data: data || {
          ok: false,
          timedOut: true,
          message:
            'Server sinkronisasi Cloud mengalami batas waktu (HTTP 408). Perubahan lokal Anda tetap aman.',
        },
        requestBytes,
      };
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      requestBytes,
    };
  } catch (err: unknown) {
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' || /abort|timeout/i.test(err.message));
    if (isAbort) {
      return {
        ok: false,
        status: 408,
        timedOut: true,
        data: {
          ok: false,
          timedOut: true,
          message:
            'Batas waktu permintaan sinkronisasi Cloud habis. Perubahan lokal Anda tetap aman.',
        },
        requestBytes,
      };
    }
    return {
      ok: false,
      status: 0,
      networkError: true,
      data: null,
      requestBytes,
    };
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  }
}

function recordAutoSyncFailureSuppression(
  scope: string,
  digest: string,
  kind: CloudSyncErrorKind,
  retryAfterSeconds?: number
): void {
  const prev = autoSyncSuppressionMap.get(scope);
  const sameDigest = prev && prev.lastDigest === digest;
  const failures = sameDigest ? prev.failures + 1 : 1;

  if (kind === 'payload_too_large') {
    autoSyncSuppressionMap.set(scope, {
      kind,
      failures,
      blockedPermanent: true,
      retryAfterMs: Number.POSITIVE_INFINITY,
      lastDigest: digest,
    });
    return;
  }

  if (kind === 'rate_limited') {
    const cooldownMs =
      typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 60_000;
    autoSyncSuppressionMap.set(scope, {
      kind,
      failures,
      blockedPermanent: false,
      retryAfterMs: Date.now() + cooldownMs,
      lastDigest: digest,
    });
    return;
  }

  const backoffMs = failures === 1 ? 5_000 : 15_000;
  autoSyncSuppressionMap.set(scope, {
    kind,
    failures,
    blockedPermanent: failures >= 2,
    retryAfterMs: Date.now() + backoffMs,
    lastDigest: digest,
  });
}

function buildCloudSyncFailureFields(
  action: 'pull' | 'push',
  statusCode: number,
  data: Record<string, unknown> | null,
  licenseCode: string,
  teacherPin: string,
  fallbackMessage: string,
  extraContext?: {
    timedOut?: boolean;
    networkError?: boolean;
    scope?: string;
    digest?: string;
  }
) {
  const message =
    typeof data?.message === 'string' && data.message.trim()
      ? data.message
      : fallbackMessage;

  if (statusCode === 403 && data?.pinReverificationRequired) {
    const sunsetIso = typeof data.sunsetIso === 'string' ? data.sunsetIso : undefined;
    const lockedNamespaceDigest = hashWorkspaceNamespaceToken(licenseCode, teacherPin);
    savePendingLegacyPinRecovery({
      licenseCode,
      teacherPinHintUsed: Boolean(teacherPin),
      lockedNamespaceDigest: lockedNamespaceDigest || undefined,
      failedAction: action,
      sunsetIso,
      recoverySupported: Boolean(data.recoverySupported ?? true),
      detectedAt: new Date().toISOString(),
      message,
    });
    emitCloudSyncStatus('reverify_required', { sunsetIso, failedAction: action });
    return {
      ok: false as const,
      cloudConfigured: typeof data.cloudConfigured === 'boolean' ? data.cloudConfigured : undefined,
      statusCode: 403,
      pinReverificationRequired: true,
      legacySunsetExpired: Boolean(data.legacySunsetExpired),
      recoverySupported: Boolean(data.recoverySupported ?? true),
      sunsetIso,
      message,
    };
  }

  const recordErr = (
    kind: CloudSyncErrorKind,
    extraDetail: Partial<CloudSyncErrorDetail> = {}
  ) => {
    const detail: CloudSyncErrorDetail = {
      kind,
      statusCode: statusCode || undefined,
      message,
      occurredAt: new Date().toISOString(),
      action,
      ...extraDetail,
    };
    saveLastSyncErrorDetail(detail);
    if (extraContext?.scope && extraContext?.digest) {
      recordAutoSyncFailureSuppression(
        extraContext.scope,
        extraContext.digest,
        kind,
        extraDetail.retryAfterSeconds
      );
    }
  };

  if (statusCode === 413 || data?.payloadTooLarge) {
    const maxBytes =
      typeof data?.maxBytes === 'number' && Number.isFinite(data.maxBytes)
        ? data.maxBytes
        : undefined;
    const actualBytes =
      typeof data?.actualBytes === 'number' && Number.isFinite(data.actualBytes)
        ? data.actualBytes
        : undefined;
    recordErr('payload_too_large', { maxBytes, actualBytes });
    emitCloudSyncStatus('sync_error', { statusCode: 413, payloadTooLarge: true });
    return {
      ok: false as const,
      cloudConfigured:
        typeof data?.cloudConfigured === 'boolean' ? data.cloudConfigured : undefined,
      statusCode: 413,
      payloadTooLarge: true,
      maxBytes,
      actualBytes,
      message,
    };
  }

  if (statusCode === 408 || extraContext?.timedOut || data?.timedOut) {
    recordErr('timeout');
    emitCloudSyncStatus('sync_error', { statusCode: 408, timedOut: true });
    return {
      ok: false as const,
      cloudConfigured:
        typeof data?.cloudConfigured === 'boolean' ? data.cloudConfigured : undefined,
      statusCode: 408,
      timedOut: true,
      message,
    };
  }

  if (statusCode === 429) {
    const retryAfterSeconds =
      typeof data?.retryAfterSeconds === 'number' && Number.isFinite(data.retryAfterSeconds)
        ? data.retryAfterSeconds
        : undefined;
    recordErr('rate_limited', { retryAfterSeconds });
    emitCloudSyncStatus('sync_error', { rateLimited: true, retryAfterSeconds });
    return {
      ok: false as const,
      cloudConfigured:
        typeof data?.cloudConfigured === 'boolean' ? data.cloudConfigured : undefined,
      statusCode: 429,
      rateLimited: true,
      retryAfterSeconds,
      message,
    };
  }

  if (statusCode === 503 || statusCode === 500 || statusCode === 502 || statusCode === 504) {
    if (typeof data?.cloudConfigured === 'boolean') {
      setCloudConfiguredFlag(data.cloudConfigured);
    }
    const redisUnavailable = Boolean(data?.redisUnavailable || statusCode === 503);
    recordErr('server_unavailable');
    emitCloudSyncStatus('sync_error', {
      statusCode,
      redisUnavailable,
    });
    return {
      ok: false as const,
      cloudConfigured:
        typeof data?.cloudConfigured === 'boolean' ? data.cloudConfigured : undefined,
      statusCode,
      redisUnavailable: statusCode === 503 ? Boolean(data?.redisUnavailable) : false,
      message,
    };
  }

  if (extraContext?.networkError || statusCode === 0) {
    recordErr('network_error');
    emitCloudSyncStatus('sync_error', { networkError: true });
    return {
      ok: false as const,
      cloudConfigured:
        typeof data?.cloudConfigured === 'boolean' ? data.cloudConfigured : undefined,
      message,
    };
  }

  recordErr('other');
  emitCloudSyncStatus('sync_error', { statusCode });
  return {
    ok: false as const,
    cloudConfigured: typeof data?.cloudConfigured === 'boolean' ? data.cloudConfigured : undefined,
    statusCode,
    message,
  };
}

function buildPartialSyncFailure(params: {
  action: 'push' | 'pull';
  statusCode: number;
  data: Record<string, unknown> | null;
  uploadedChunks: number;
  failedChunkIndex: number;
  totalChunks: number;
  licenseCode: string;
  teacherPin: string;
  timedOut?: boolean;
  networkError?: boolean;
  scope: string;
  digest: string;
}) {
  const {
    action,
    statusCode,
    data,
    uploadedChunks,
    failedChunkIndex,
    totalChunks,
    licenseCode,
    teacherPin,
    timedOut,
    networkError,
    scope,
    digest,
  } = params;

  if (statusCode === 403 && data?.pinReverificationRequired) {
    return buildCloudSyncFailureFields(
      action,
      statusCode,
      data,
      licenseCode,
      teacherPin,
      String(data.message || 'Verifikasi ulang PIN diperlukan.'),
      { scope, digest }
    );
  }

  const baseReason =
    typeof data?.message === 'string' && data.message.trim()
      ? data.message
      : timedOut
      ? 'Batas waktu habis saat mengirim/mengambil bagian data.'
      : networkError
      ? 'Koneksi internet terputus di tengah proses sinkronisasi bertahap.'
      : `Gagal memproses bagian ke-${failedChunkIndex + 1} dari ${totalChunks}.`;

  const message = `Sinkronisasi bertahap terhenti pada bagian ${failedChunkIndex + 1}/${totalChunks} (${baseReason}). Workspace Cloud maupun lokal tetap utuh tanpa penulisan sebagian; silakan coba ulang dengan aman.`;

  const detail: CloudSyncErrorDetail = {
    kind: 'partial_sync',
    statusCode: statusCode || undefined,
    message,
    occurredAt: new Date().toISOString(),
    action,
    uploadedChunks,
    failedChunkIndex,
    totalChunks,
  };
  saveLastSyncErrorDetail(detail);
  recordAutoSyncFailureSuppression(
    scope,
    digest,
    statusCode === 413 ? 'payload_too_large' : 'partial_sync',
    typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined
  );
  emitCloudSyncStatus('sync_error', {
    statusCode: statusCode || undefined,
    partialSync: true,
    uploadedChunks,
    failedChunkIndex,
    totalChunks,
  });

  return {
    ok: false as const,
    partialSync: true,
    statusCode: statusCode || undefined,
    timedOut: Boolean(timedOut),
    payloadTooLarge: statusCode === 413 || Boolean(data?.payloadTooLarge),
    rateLimited: statusCode === 429 || undefined,
    retryAfterSeconds:
      typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined,
    redisUnavailable: statusCode === 503 ? Boolean(data?.redisUnavailable) : undefined,
    cloudConfigured:
      typeof data?.cloudConfigured === 'boolean' ? data.cloudConfigured : undefined,
    uploadedChunks,
    failedChunkIndex,
    totalChunks,
    message,
  };
}

interface ChunkRefDescriptor {
  index?: number;
  hash: string;
}

async function fetchChunkedEntriesViaPullChunk(params: {
  chunkRefs: ChunkRefDescriptor[];
  expectedChecksum?: string;
  licenseCode: string;
  teacherPin: string;
  deviceId: string;
  timeoutMs: number;
  stats: RequestStatsTracker;
  scope: string;
  digest: string;
  action: 'push' | 'pull';
}): Promise<
  | { ok: true; entries: Record<string, unknown> }
  | { ok: false; failure: ReturnType<typeof buildPartialSyncFailure> }
> {
  const {
    chunkRefs,
    expectedChecksum,
    licenseCode,
    teacherPin,
    deviceId,
    timeoutMs,
    stats,
    scope,
    digest,
    action,
  } = params;

  const assembled: Record<string, unknown> = {};
  const totalChunks = chunkRefs.length;

  for (let i = 0; i < totalChunks; i += 1) {
    const ref = chunkRefs[i];
    const res = await postCloudSyncJson(
      {
        action: 'pull_chunk',
        licenseCode,
        teacherPin,
        deviceId,
        chunkHash: ref?.hash || '',
      },
      timeoutMs,
      stats
    );

    if (!res.ok || !res.data?.ok || !isPlainObject(res.data.entriesChunk)) {
      return {
        ok: false,
        failure: buildPartialSyncFailure({
          action,
          statusCode: res.status,
          data: res.data,
          uploadedChunks: i,
          failedChunkIndex: i,
          totalChunks,
          licenseCode,
          teacherPin,
          timedOut: res.timedOut,
          networkError: res.networkError,
          scope,
          digest,
        }),
      };
    }

    Object.assign(assembled, res.data.entriesChunk);
  }

  if (
    expectedChecksum &&
    computeCanonicalDigestHex(assembled) !== expectedChecksum
  ) {
    return {
      ok: false,
      failure: buildPartialSyncFailure({
        action,
        statusCode: 500,
        data: {
          message:
            'Checksum gabungan potongan Cloud tidak cocok; pemulihan dibatalkan agar data lokal tidak rusak.',
        },
        uploadedChunks: totalChunks,
        failedChunkIndex: Math.max(0, totalChunks - 1),
        totalChunks,
        licenseCode,
        teacherPin,
        scope,
        digest,
      }),
    };
  }

  return {
    ok: true,
    entries: decodeEntriesFromCloudSync(assembled),
  };
}

/**
 * Menyimpan (Push) riwayat pengisian guru dari perangkat ini ke Cloud berdasarkan Kode Lisensi
 * dengan Optimistic Concurrency Control (baseRevision + 409 Conflict detection),
 * delta sync, deduplikasi wire lossless, serta chunked staging upload.
 */
export async function pushWorkspaceToCloud(
  explicitLicenseCode?: string,
  explicitTeacherPin?: string,
  options?: {
    requestId?: string;
    baseRevisionOverride?: number | null;
    entriesOverride?: Record<string, unknown>;
    reverifyLegacyPin?: boolean;
    newTeacherPin?: string;
    isAutoSync?: boolean;
    timeoutMs?: number;
    maxChunkBytes?: number;
    forceChunked?: boolean;
  }
): Promise<CloudSyncPushResult> {
  const startedAt = Date.now();
  const quota = getUserQuota();
  const licenseCode = normalizeLicenseCodeInput(explicitLicenseCode || quota.licenseKey || '');
  const teacherPin = (
    explicitTeacherPin !== undefined ? explicitTeacherPin : getSavedTeacherSyncPin()
  ).trim();

  if (!licenseCode || (!explicitLicenseCode && !isLicensed(quota.tier))) {
    return {
      ok: false,
      message: 'Sinkronisasi Cloud hanya aktif untuk pengguna dengan Kode Lisensi Resmi.',
    };
  }

  if (isSchoolCollectiveLicenseCode(licenseCode) && !teacherPin) {
    return {
      ok: false,
      message:
        'Untuk Lisensi Sekolah (25 Guru), silakan isi Nama Singkat / PIN Pribadi Guru agar data Anda tidak tertukar dengan guru lain.',
    };
  }

  const scope = buildWorkspaceScope(licenseCode, teacherPin);
  if (!options?.isAutoSync) {
    autoSyncSuppressionMap.delete(scope);
  }

  const pending = getPendingCloudConflict();
  if (
    pending &&
    pending.licenseCode === licenseCode &&
    pending.teacherPin === teacherPin &&
    options?.baseRevisionOverride === undefined
  ) {
    const syncedPending = syncPendingCloudConflictWithLocalState(options?.entriesOverride) || pending;
    emitCloudSyncStatus('conflict');
    return {
      ok: false,
      conflict: true,
      cloudConfigured: syncedPending.cloudConfigured,
      serverRevision: syncedPending.serverRevision,
      serverUpdatedAt: syncedPending.serverUpdatedAt,
      lastDeviceId: syncedPending.lastDeviceId,
      conflicts: syncedPending.conflicts,
      autoMergedSummary: syncedPending.autoMergedSummary,
      statusCode: 409,
      message:
        'Terdapat konflik sinkronisasi yang belum diselesaikan. Selesaikan konflik di Panel Lisensi & Cloud Sync terlebih dahulu agar data perangkat lain tidak tertimpa.',
    };
  }

  const entries = options?.entriesOverride || collectWorkspaceSyncEntries();
  const baseRevision =
    options?.baseRevisionOverride !== undefined
      ? options.baseRevisionOverride
      : getWorkspaceBaseRevision(licenseCode, teacherPin);
  const requestId = options?.requestId || createSyncRequestId();
  const nextPinTrimmed = options?.newTeacherPin ? options.newTeacherPin.trim() : '';
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CLOUD_SYNC_TIMEOUT_MS;
  const maxChunkBytes = options?.maxChunkBytes ?? DEFAULT_MAX_CHUNK_BYTES;

  const currentDigests = computeWorkspaceEntryDigests(entries);
  const rawBytes = measureUtf8Bytes(entries);
  const storedHashes = getWorkspaceBaseEntryHashes(licenseCode, teacherPin);

  if (options?.isAutoSync) {
    const sup = autoSyncSuppressionMap.get(scope);
    if (sup && sup.lastDigest === currentDigests.workspaceDigest) {
      if (sup.blockedPermanent || Date.now() < sup.retryAfterMs) {
        const lastErr = getLastCloudSyncErrorDetail();
        return {
          ok: false,
          skippedUnchanged: false,
          mode: 'skipped_unchanged',
          requestCount: 0,
          rawBytes,
          wireBytes: 0,
          maxRequestBytes: 0,
          changedRecords: 0,
          totalDocuments: currentDigests.entryCount,
          durationMs: Date.now() - startedAt,
          payloadTooLarge: sup.kind === 'payload_too_large',
          rateLimited: sup.kind === 'rate_limited',
          partialSync: sup.kind === 'partial_sync',
          timedOut: sup.kind === 'timeout',
          statusCode: lastErr?.statusCode,
          message:
            lastErr?.message ||
            'Sinkronisasi otomatis dihentikan sementara untuk mencegah pengulangan gagal pada payload yang sama.',
        };
      }
    } else if (sup && sup.lastDigest !== currentDigests.workspaceDigest) {
      autoSyncSuppressionMap.delete(scope);
    }

    if (
      !options.forceChunked &&
      options.entriesOverride === undefined &&
      baseRevision !== null &&
      baseRevision > 0 &&
      storedHashes?.revision === baseRevision &&
      storedHashes.workspaceDigest === currentDigests.workspaceDigest &&
      isCloudBackendConfigured() === true &&
      !hasLastSyncError() &&
      !getInflightSyncState()
    ) {
      return {
        ok: true,
        skippedUnchanged: true,
        mode: 'skipped_unchanged',
        cloudConfigured: true,
        revision: baseRevision,
        updatedAt: getLastCloudSyncAt() || undefined,
        requestCount: 0,
        rawBytes,
        wireBytes: 0,
        maxRequestBytes: 0,
        changedRecords: 0,
        totalDocuments: currentDigests.entryCount,
        durationMs: Date.now() - startedAt,
        message: 'Data lokal sudah identik dengan revisi Cloud terbaru.',
      };
    }
  }

  const stats: RequestStatsTracker = {
    requestCount: 0,
    wireBytes: 0,
    maxRequestBytes: 0,
  };

  setInflightSyncState({
    action: 'push',
    scope,
    digest: currentDigests.workspaceDigest,
    startedAt: new Date().toISOString(),
  });
  emitCloudSyncStatus('syncing');

  try {
    const recoveryExtras = {
      ...(options?.reverifyLegacyPin ? { reverifyLegacyPin: true } : {}),
      ...(nextPinTrimmed ? { newTeacherPin: nextPinTrimmed } : {}),
      supportsChunkedPull: true,
    };

    const handleConflictFromServer = async (
      data: Record<string, unknown>,
      status: number
    ): Promise<CloudSyncPushResult> => {
      let serverEntries: Record<string, unknown>;
      if (data.serverEntriesChunked && Array.isArray(data.chunkRefs)) {
        const chunkPullRes = await fetchChunkedEntriesViaPullChunk({
          chunkRefs: data.chunkRefs as ChunkRefDescriptor[],
          expectedChecksum:
            typeof data.workspaceChecksum === 'string' ? data.workspaceChecksum : undefined,
          licenseCode,
          teacherPin,
          deviceId: quota.deviceId,
          timeoutMs,
          stats,
          scope,
          digest: currentDigests.workspaceDigest,
          action: 'push',
        });
        if (!chunkPullRes.ok) {
          return {
            ...chunkPullRes.failure,
            requestCount: stats.requestCount,
            rawBytes,
            wireBytes: stats.wireBytes,
            maxRequestBytes: stats.maxRequestBytes,
            totalDocuments: currentDigests.entryCount,
            durationMs: Date.now() - startedAt,
          };
        }
        serverEntries = chunkPullRes.entries;
      } else {
        serverEntries = isPlainObject(data.serverEntries)
          ? decodeEntriesFromCloudSync(data.serverEntries)
          : {};
      }

      const serverRevision = Number(data.serverRevision) || 1;
      const cloudConfigured = Boolean(data.cloudConfigured);

      setCloudConfiguredFlag(cloudConfigured);
      savePreConflictBackup('conflict_409', licenseCode, teacherPin, baseRevision, entries);

      const baseSnapshot = getWorkspaceBaseSnapshot(licenseCode, teacherPin);
      const analysis = analyzeWorkspaceConflict(baseSnapshot, entries, serverEntries);

      const conflictPayload: CloudPendingConflict = {
        licenseCode,
        teacherPin,
        deviceId: quota.deviceId,
        detectedAt: new Date().toISOString(),
        baseRevision,
        serverRevision,
        serverUpdatedAt: typeof data.serverUpdatedAt === 'string' ? data.serverUpdatedAt : null,
        lastDeviceId: String(data.lastDeviceId || ''),
        cloudConfigured,
        localEntries: deepClone(entries),
        serverEntries: deepClone(serverEntries),
        mergedEntries: analysis.mergedEntries,
        conflicts: analysis.conflicts,
        autoMergedSummary: analysis.autoMergedSummary,
      };
      savePendingCloudConflict(conflictPayload);
      emitCloudSyncStatus('conflict', {
        serverRevision,
        conflictCount: analysis.conflicts.length,
      });

      return {
        ok: false,
        conflict: true,
        cloudConfigured,
        serverRevision,
        serverUpdatedAt: conflictPayload.serverUpdatedAt,
        lastDeviceId: conflictPayload.lastDeviceId,
        conflicts: analysis.conflicts,
        autoMergedSummary: analysis.autoMergedSummary,
        statusCode: status || 409,
        requestCount: stats.requestCount,
        rawBytes,
        wireBytes: stats.wireBytes,
        maxRequestBytes: stats.maxRequestBytes,
        totalDocuments: currentDigests.entryCount,
        durationMs: Date.now() - startedAt,
        message:
          (typeof data.message === 'string' && data.message) ||
          `Konflik sinkronisasi terdeteksi (Server Revisi #${serverRevision}). Pilih strategi penggabungan agar tidak menimpa data perangkat lain.`,
      };
    };

    const finalizePushSuccess = (
      data: Record<string, unknown>,
      statusCode: number,
      mode: CloudSyncPushResult['mode'],
      changedRecords: number,
      extraMeta?: Partial<CloudSyncPushResult>
    ): CloudSyncPushResult => {
      const cloudConfigured = Boolean(data.cloudConfigured);
      const nextRev =
        typeof data.revision === 'number'
          ? data.revision
          : (baseRevision ?? 0) + 1;
      const effectivePinScope = nextPinTrimmed || teacherPin;
      const effectiveScope = buildWorkspaceScope(licenseCode, effectivePinScope);

      autoSyncSuppressionMap.delete(scope);
      autoSyncSuppressionMap.delete(effectiveScope);

      setCloudConfiguredFlag(cloudConfigured);
      setWorkspaceBaseRevision(licenseCode, effectivePinScope, nextRev);
      setWorkspaceBaseEntryHashes(licenseCode, effectivePinScope, nextRev, currentDigests);
      setWorkspaceBaseSnapshot(licenseCode, effectivePinScope, entries);
      if (nextPinTrimmed) {
        saveTeacherSyncPin(nextPinTrimmed);
      }
      savePendingCloudConflict(null);
      savePendingLegacyPinRecovery(null);

      if (cloudConfigured && typeof data.updatedAt === 'string') {
        setLastCloudSyncAt(data.updatedAt);
      } else if (!cloudConfigured) {
        setLastCloudSyncAt(null);
      }

      emitCloudSyncStatus(cloudConfigured ? 'synced' : 'unconfigured', {
        revision: nextRev,
        cloudConfigured,
      });

      return {
        ok: true,
        idempotent: Boolean(data.idempotent),
        cloudConfigured,
        revision: nextRev,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
        lastDeviceId: typeof data.lastDeviceId === 'string' ? data.lastDeviceId : undefined,
        statusCode,
        mode,
        requestCount: stats.requestCount,
        rawBytes,
        wireBytes: stats.wireBytes,
        maxRequestBytes: stats.maxRequestBytes,
        changedRecords,
        totalDocuments: currentDigests.entryCount,
        durationMs: Date.now() - startedAt,
        ...(extraMeta || {}),
        message:
          (typeof data.message === 'string' && data.message) ||
          (cloudConfigured
            ? 'Riwayat berhasil disimpan ke Cloud.'
            : 'Data tersimpan di memori dev lokal saja (Cloud Redis belum dikonfigurasi).'),
      };
    };

    const runChunkedUpload = async (
      uploadEntries: Record<string, unknown>,
      chunkMode: 'full' | 'delta',
      chunkDeletes: string[],
      changedRecords: number
    ): Promise<CloudSyncPushResult | { retryFullMode: true }> => {
      const chunks = planWorkspaceUploadChunks(uploadEntries, maxChunkBytes);
      const uploadId = `upl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

      for (let i = 0; i < chunks.length; i += 1) {
        const chunkRes = await postCloudSyncJson(
          {
            action: 'push_chunk',
            licenseCode,
            teacherPin,
            deviceId: quota.deviceId,
            uploadId,
            chunkIndex: i,
            totalChunks: chunks.length,
            chunk: chunks[i],
            ...(options?.reverifyLegacyPin ? { reverifyLegacyPin: true } : {}),
            ...(nextPinTrimmed ? { newTeacherPin: nextPinTrimmed } : {}),
          },
          timeoutMs,
          stats
        );

        if (!chunkRes.ok || !chunkRes.data?.ok) {
          return {
            ...buildPartialSyncFailure({
              action: 'push',
              statusCode: chunkRes.status,
              data: chunkRes.data,
              uploadedChunks: i,
              failedChunkIndex: i,
              totalChunks: chunks.length,
              licenseCode,
              teacherPin,
              timedOut: chunkRes.timedOut,
              networkError: chunkRes.networkError,
              scope,
              digest: currentDigests.workspaceDigest,
            }),
            mode: 'chunked',
            requestCount: stats.requestCount,
            rawBytes,
            wireBytes: stats.wireBytes,
            maxRequestBytes: stats.maxRequestBytes,
            changedRecords,
            totalDocuments: currentDigests.entryCount,
            durationMs: Date.now() - startedAt,
          };
        }
      }

      const commitRes = await postCloudSyncJson(
        {
          action: 'commit_chunks',
          licenseCode,
          teacherPin,
          deviceId: quota.deviceId,
          uploadId,
          totalChunks: chunks.length,
          mode: chunkMode,
          ...(chunkMode === 'delta' ? { deletes: chunkDeletes } : {}),
          baseRevision,
          requestId,
          expectedEntryCount: currentDigests.entryCount,
          workspaceChecksum: currentDigests.workspaceDigest,
          ...recoveryExtras,
        },
        timeoutMs,
        stats
      );

      if (commitRes.status === 409 && commitRes.data?.deltaMismatch && chunkMode === 'delta') {
        return { retryFullMode: true };
      }
      if (commitRes.status === 409 && commitRes.data?.conflict) {
        return await handleConflictFromServer(commitRes.data, commitRes.status);
      }
      if (commitRes.ok && commitRes.data?.ok) {
        return finalizePushSuccess(
          commitRes.data,
          commitRes.status,
          'chunked',
          changedRecords,
          { totalChunks: chunks.length, uploadedChunks: chunks.length }
        );
      }

      return {
        ...buildPartialSyncFailure({
          action: 'push',
          statusCode: commitRes.status,
          data: commitRes.data,
          uploadedChunks: chunks.length,
          failedChunkIndex: Math.max(0, chunks.length - 1),
          totalChunks: chunks.length,
          licenseCode,
          teacherPin,
          timedOut: commitRes.timedOut,
          networkError: commitRes.networkError,
          scope,
          digest: currentDigests.workspaceDigest,
        }),
        mode: 'chunked',
        requestCount: stats.requestCount,
        rawBytes,
        wireBytes: stats.wireBytes,
        maxRequestBytes: stats.maxRequestBytes,
        changedRecords,
        totalDocuments: currentDigests.entryCount,
        durationMs: Date.now() - startedAt,
      };
    };

    const encodedFull = encodeEntriesForCloudSync(entries);
    const encodedFullWireBytes = measureUtf8Bytes(encodedFull);

    // 1. Delta Sync Path when prior revision + entry digests match cleanly
    const canAttemptDelta =
      !options?.forceChunked &&
      options?.entriesOverride === undefined &&
      options?.baseRevisionOverride === undefined &&
      !options?.reverifyLegacyPin &&
      !options?.newTeacherPin &&
      baseRevision !== null &&
      baseRevision > 0 &&
      storedHashes?.revision === baseRevision &&
      Object.keys(storedHashes.entryDigests || {}).length > 0;

    if (canAttemptDelta) {
      const delta = computeEntriesDelta(storedHashes!.entryDigests, entries);
      const changedRecords = delta.changedCount + delta.deletedCount;
      if (delta.changedCount < currentDigests.entryCount || changedRecords === 0) {
        const encodedDeltaUpserts = encodeEntriesForCloudSync(delta.upserts, entries);
        const deltaPayloadBytes = measureUtf8Bytes({
          upserts: encodedDeltaUpserts,
          deletes: delta.deletes,
        });

        if (deltaPayloadBytes <= maxChunkBytes) {
          const deltaRes = await postCloudSyncJson(
            {
              action: 'push_delta',
              licenseCode,
              teacherPin,
              deviceId: quota.deviceId,
              baseRevision,
              requestId,
              upserts: encodedDeltaUpserts,
              deletes: delta.deletes,
              expectedEntryCount: currentDigests.entryCount,
              workspaceChecksum: currentDigests.workspaceDigest,
              supportsChunkedPull: true,
            },
            timeoutMs,
            stats
          );

          if (deltaRes.status === 409 && deltaRes.data?.conflict) {
            return await handleConflictFromServer(deltaRes.data, deltaRes.status);
          }

          if (deltaRes.ok && deltaRes.data?.ok) {
            return finalizePushSuccess(deltaRes.data, deltaRes.status, 'delta', changedRecords);
          }

          const shouldFallbackFull =
            (deltaRes.status === 409 && Boolean(deltaRes.data?.deltaMismatch)) ||
            (deltaRes.status === 413 && Boolean(deltaRes.data?.supportsChunkedUpload));

          if (!shouldFallbackFull) {
            return {
              ...buildCloudSyncFailureFields(
                'push',
                deltaRes.status,
                deltaRes.data,
                licenseCode,
                teacherPin,
                'Gagal menyinkronkan perubahan data ke Cloud.',
                {
                  timedOut: deltaRes.timedOut,
                  networkError: deltaRes.networkError,
                  scope,
                  digest: currentDigests.workspaceDigest,
                }
              ),
              mode: 'delta',
              requestCount: stats.requestCount,
              rawBytes,
              wireBytes: stats.wireBytes,
              maxRequestBytes: stats.maxRequestBytes,
              changedRecords,
              totalDocuments: currentDigests.entryCount,
              durationMs: Date.now() - startedAt,
            };
          }
        } else if (deltaPayloadBytes < encodedFullWireBytes * 0.8) {
          const chunkedDeltaOut = await runChunkedUpload(
            encodedDeltaUpserts,
            'delta',
            delta.deletes,
            changedRecords
          );
          if (!('retryFullMode' in chunkedDeltaOut)) {
            return chunkedDeltaOut;
          }
        }
      }
    }

    // 2. Inline Full Push when wire payload fits safely within single-request chunk threshold
    if (!options?.forceChunked && encodedFullWireBytes <= maxChunkBytes) {
      const inlineRes = await postCloudSyncJson(
        {
          action: 'push',
          licenseCode,
          teacherPin,
          deviceId: quota.deviceId,
          baseRevision,
          requestId,
          entries: encodedFull,
          ...recoveryExtras,
        },
        timeoutMs,
        stats
      );

      if (inlineRes.status === 409 && inlineRes.data?.conflict) {
        return await handleConflictFromServer(inlineRes.data, inlineRes.status);
      }

      if (inlineRes.ok && inlineRes.data?.ok) {
        return finalizePushSuccess(
          inlineRes.data,
          inlineRes.status,
          'inline',
          currentDigests.entryCount
        );
      }

      if (!(inlineRes.status === 413 && inlineRes.data?.supportsChunkedUpload)) {
        return {
          ...buildCloudSyncFailureFields(
            'push',
            inlineRes.status,
            inlineRes.data,
            licenseCode,
            teacherPin,
            'Gagal menyinkronkan data ke Cloud.',
            {
              timedOut: inlineRes.timedOut,
              networkError: inlineRes.networkError,
              scope,
              digest: currentDigests.workspaceDigest,
            }
          ),
          mode: 'inline',
          requestCount: stats.requestCount,
          rawBytes,
          wireBytes: stats.wireBytes,
          maxRequestBytes: stats.maxRequestBytes,
          changedRecords: currentDigests.entryCount,
          totalDocuments: currentDigests.entryCount,
          durationMs: Date.now() - startedAt,
        };
      }
    }

    // 3. Multi-Part Staged Chunked Upload for large workspaces / fallback on 413
    const chunkedOut = await runChunkedUpload(
      encodedFull,
      'full',
      [],
      currentDigests.entryCount
    );
    if ('retryFullMode' in chunkedOut) {
      return {
        ...buildCloudSyncFailureFields(
          'push',
          409,
          null,
          licenseCode,
          teacherPin,
          'Checksum sinkronisasi tidak cocok saat verifikasi akhir.',
          { scope, digest: currentDigests.workspaceDigest }
        ),
        mode: 'chunked',
        requestCount: stats.requestCount,
        rawBytes,
        wireBytes: stats.wireBytes,
        maxRequestBytes: stats.maxRequestBytes,
        changedRecords: currentDigests.entryCount,
        totalDocuments: currentDigests.entryCount,
        durationMs: Date.now() - startedAt,
      };
    }
    return chunkedOut;
  } catch {
    return {
      ...buildCloudSyncFailureFields(
        'push',
        0,
        null,
        licenseCode,
        teacherPin,
        'Tidak dapat terhubung ke server sinkronisasi Cloud (periksa koneksi internet).',
        {
          networkError: true,
          scope,
          digest: currentDigests.workspaceDigest,
        }
      ),
      requestCount: stats.requestCount,
      rawBytes,
      wireBytes: stats.wireBytes,
      maxRequestBytes: stats.maxRequestBytes,
      totalDocuments: currentDigests.entryCount,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    setInflightSyncState(null);
  }
}

/**
 * Menarik (Pull) dan memulihkan riwayat pengisian guru dari Cloud ke perangkat ini berdasarkan Kode Lisensi
 */
export async function pullWorkspaceFromCloud(
  explicitLicenseCode?: string,
  explicitTeacherPin?: string,
  options?: {
    reverifyLegacyPin?: boolean;
    newTeacherPin?: string;
    timeoutMs?: number;
  }
): Promise<CloudSyncPullResult> {
  const startedAt = Date.now();
  const quota = getUserQuota();
  const licenseCode = normalizeLicenseCodeInput(explicitLicenseCode || quota.licenseKey || '');
  const teacherPin = (
    explicitTeacherPin !== undefined ? explicitTeacherPin : getSavedTeacherSyncPin()
  ).trim();

  if (!licenseCode) {
    return {
      ok: false,
      found: false,
      restoredCount: 0,
      message: 'Kode lisensi belum tersedia.',
    };
  }

  if (isSchoolCollectiveLicenseCode(licenseCode) && !teacherPin) {
    return {
      ok: false,
      found: false,
      restoredCount: 0,
      message:
        'Untuk Lisensi Sekolah (25 Guru), masukkan Nama Singkat / PIN Pribadi Guru terlebih dahulu untuk memulihkan data Anda.',
    };
  }

  const nextPinTrimmed = options?.newTeacherPin ? options.newTeacherPin.trim() : '';
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CLOUD_SYNC_TIMEOUT_MS;
  const scope = buildWorkspaceScope(licenseCode, teacherPin);
  const stats: RequestStatsTracker = {
    requestCount: 0,
    wireBytes: 0,
    maxRequestBytes: 0,
  };

  setInflightSyncState({
    action: 'pull',
    scope,
    digest: '',
    startedAt: new Date().toISOString(),
  });
  emitCloudSyncStatus('syncing');

  try {
    const res = await postCloudSyncJson(
      {
        action: 'pull',
        licenseCode,
        teacherPin,
        deviceId: quota.deviceId,
        supportsChunkedPull: true,
        ...(options?.reverifyLegacyPin ? { reverifyLegacyPin: true } : {}),
        ...(nextPinTrimmed ? { newTeacherPin: nextPinTrimmed } : {}),
      },
      timeoutMs,
      stats
    );

    const data = res.data;
    if (!res.ok || !data?.ok) {
      return {
        ...buildCloudSyncFailureFields(
          'pull',
          res.status,
          data,
          licenseCode,
          teacherPin,
          'Gagal mengambil data dari Cloud.',
          { timedOut: res.timedOut, networkError: res.networkError }
        ),
        found: false,
        restoredCount: 0,
        requestCount: stats.requestCount,
        maxRequestBytes: stats.maxRequestBytes,
        durationMs: Date.now() - startedAt,
      };
    }

    const cloudConfigured = Boolean(data.cloudConfigured);
    const effectivePinScope = nextPinTrimmed || teacherPin;
    setCloudConfiguredFlag(cloudConfigured);
    savePendingLegacyPinRecovery(null);

    if (!data.found) {
      const serverRev = typeof data.revision === 'number' ? data.revision : 0;
      setWorkspaceBaseRevision(licenseCode, effectivePinScope, serverRev);
      if (nextPinTrimmed) {
        saveTeacherSyncPin(nextPinTrimmed);
      }
      emitCloudSyncStatus(cloudConfigured ? 'local' : 'unconfigured', {
        revision: serverRev,
        cloudConfigured,
      });
      return {
        ok: true,
        found: false,
        restoredCount: 0,
        cloudConfigured,
        revision: serverRev,
        statusCode: res.status,
        mode: 'inline',
        requestCount: stats.requestCount,
        maxRequestBytes: stats.maxRequestBytes,
        durationMs: Date.now() - startedAt,
        message: cloudConfigured
          ? 'Belum ada riwayat tersimpan di Cloud pada kode lisensi ini.'
          : 'Cloud Redis belum dikonfigurasi pada server ini; belum ada riwayat di memori dev lokal.',
      };
    }

    let pulledEntries: Record<string, unknown> | null = null;
    let pullMode: 'inline' | 'chunked_pull' = 'inline';

    if (data.chunked && Array.isArray(data.chunkRefs)) {
      pullMode = 'chunked_pull';
      const chunkRes = await fetchChunkedEntriesViaPullChunk({
        chunkRefs: data.chunkRefs as ChunkRefDescriptor[],
        expectedChecksum:
          typeof data.workspaceChecksum === 'string' ? data.workspaceChecksum : undefined,
        licenseCode,
        teacherPin,
        deviceId: quota.deviceId,
        timeoutMs,
        stats,
        scope,
        digest: typeof data.workspaceChecksum === 'string' ? data.workspaceChecksum : '',
        action: 'pull',
      });
      if (!chunkRes.ok) {
        return {
          ...chunkRes.failure,
          found: false,
          restoredCount: 0,
          mode: 'chunked_pull',
          requestCount: stats.requestCount,
          maxRequestBytes: stats.maxRequestBytes,
          durationMs: Date.now() - startedAt,
        };
      }
      pulledEntries = chunkRes.entries;
    } else if (isPlainObject(data.entries)) {
      pulledEntries = decodeEntriesFromCloudSync(data.entries);
    }

    if (!pulledEntries || Object.keys(pulledEntries).length === 0) {
      const serverRev = typeof data.revision === 'number' ? data.revision : 0;
      setWorkspaceBaseRevision(licenseCode, effectivePinScope, serverRev);
      if (nextPinTrimmed) {
        saveTeacherSyncPin(nextPinTrimmed);
      }
      emitCloudSyncStatus(cloudConfigured ? 'local' : 'unconfigured', {
        revision: serverRev,
        cloudConfigured,
      });
      return {
        ok: true,
        found: false,
        restoredCount: 0,
        cloudConfigured,
        revision: serverRev,
        statusCode: res.status,
        mode: pullMode,
        requestCount: stats.requestCount,
        maxRequestBytes: stats.maxRequestBytes,
        durationMs: Date.now() - startedAt,
        message: cloudConfigured
          ? 'Belum ada riwayat tersimpan di Cloud pada kode lisensi ini.'
          : 'Cloud Redis belum dikonfigurasi pada server ini; belum ada riwayat di memori dev lokal.',
      };
    }

    // Cadangkan data lokal sebelum menimpa melalui pull manual
    const currentLocal = collectWorkspaceSyncEntries();
    if (Object.keys(currentLocal).length > 0) {
      savePreConflictBackup(
        'pre_pull',
        licenseCode,
        teacherPin,
        getWorkspaceBaseRevision(licenseCode, teacherPin),
        currentLocal
      );
    }

    const wrappedBackup = JSON.stringify({
      app: 'AsesMerdeka Studio',
      version: '1.0.0',
      exportedAt: (typeof data.updatedAt === 'string' && data.updatedAt) || new Date().toISOString(),
      entries: pulledEntries,
    });

    const importRes = importBackupDataJson(wrappedBackup);
    const serverRev = typeof data.revision === 'number' ? data.revision : 1;
    const pulledDigests = computeWorkspaceEntryDigests(pulledEntries);
    const rawBytes = measureUtf8Bytes(pulledEntries);

    if (importRes.success) {
      autoSyncSuppressionMap.delete(scope);
      autoSyncSuppressionMap.delete(buildWorkspaceScope(licenseCode, effectivePinScope));
      setConfirmedClassSetup(true);
      setWorkspaceBaseRevision(licenseCode, effectivePinScope, serverRev);
      setWorkspaceBaseEntryHashes(licenseCode, effectivePinScope, serverRev, pulledDigests);
      setWorkspaceBaseSnapshot(licenseCode, effectivePinScope, pulledEntries);
      if (nextPinTrimmed) {
        saveTeacherSyncPin(nextPinTrimmed);
      }
      savePendingCloudConflict(null);

      if (cloudConfigured && typeof data.updatedAt === 'string') {
        setLastCloudSyncAt(data.updatedAt);
      } else if (!cloudConfigured) {
        setLastCloudSyncAt(null);
      }

      emitCloudSyncStatus(cloudConfigured ? 'synced' : 'unconfigured', {
        revision: serverRev,
        cloudConfigured,
      });
    } else {
      emitCloudSyncStatus('sync_error');
    }

    return {
      ok: importRes.success,
      found: true,
      restoredCount: importRes.restoredCount,
      cloudConfigured,
      revision: serverRev,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
      lastDeviceId: typeof data.lastDeviceId === 'string' ? data.lastDeviceId : undefined,
      statusCode: res.status,
      mode: pullMode,
      requestCount: stats.requestCount,
      rawBytes,
      maxRequestBytes: stats.maxRequestBytes,
      totalDocuments: pulledDigests.entryCount,
      durationMs: Date.now() - startedAt,
      message: importRes.success
        ? cloudConfigured
          ? `☁️ Riwayat pengisian Anda dari Cloud (Revisi #${serverRev}) berhasil dipulihkan (${importRes.restoredCount} kelompok data)!`
          : `Data dipulihkan dari memori dev lokal (${importRes.restoredCount} kelompok data). Catatan: Cloud Redis belum dikonfigurasi.`
        : importRes.message,
    };
  } catch {
    return {
      ...buildCloudSyncFailureFields(
        'pull',
        0,
        null,
        licenseCode,
        teacherPin,
        'Gagal menghubungi server Cloud untuk memulihkan riwayat.',
        { networkError: true }
      ),
      found: false,
      restoredCount: 0,
      requestCount: stats.requestCount,
      maxRequestBytes: stats.maxRequestBytes,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    setInflightSyncState(null);
  }
}

function normalizePinSegmentLength(raw: string): number {
  const trimmed = raw.trim();
  const sepIdx = trimmed.search(/[:#]/);
  const secretPart = sepIdx >= 0 ? trimmed.slice(sepIdx + 1).trim() : trimmed;
  return secretPart.replace(/[^A-Za-z0-9_-]/g, '').length;
}

/**
 * Menjalankan pemulihan dan migrasi keamanan PIN legacy pasca-sunset
 * (baik verifikasi ulang PIN lama maupun penggantian ke PIN baru) lalu melanjutkan sinkronisasi.
 */
export async function submitLegacyPinRecovery(
  input: LegacyPinRecoverySubmission
): Promise<LegacyPinRecoveryResult> {
  const quota = getUserQuota();
  const pending = getPendingLegacyPinRecovery();
  const licenseCode = normalizeLicenseCodeInput(
    input.licenseCode || pending?.licenseCode || quota.licenseKey || ''
  );
  const resumedAction: 'pull' | 'push' =
    input.resumeAction || pending?.failedAction || 'pull';

  if (!licenseCode) {
    return {
      ok: false,
      mode: input.mode,
      resumedAction,
      message: 'Kode lisensi aktif tidak ditemukan. Data lokal Anda tetap aman.',
    };
  }

  const currentPin = (input.currentPin || '').trim();
  if (!currentPin || normalizePinSegmentLength(currentPin) < 2) {
    return {
      ok: false,
      mode: input.mode,
      resumedAction,
      message: 'Masukkan PIN Guru saat ini (minimal 2 karakter) untuk memverifikasi identitas Anda.',
    };
  }

  if (pending?.lockedNamespaceDigest && pending.licenseCode === licenseCode) {
    const enteredDigest = hashWorkspaceNamespaceToken(licenseCode, currentPin);
    if (enteredDigest && enteredDigest !== pending.lockedNamespaceDigest) {
      return {
        ok: false,
        mode: input.mode,
        resumedAction,
        statusCode: 403,
        message:
          'Akses workspace ditolak karena PIN Guru tidak cocok dengan akun yang sedang dipulihkan. Data Anda tetap aman.',
      };
    }
  }

  let nextPin = '';
  if (input.mode === 'replace') {
    nextPin = (input.newPin || '').trim();
    const confirmPin = (input.confirmNewPin || '').trim();
    if (!nextPin || normalizePinSegmentLength(nextPin) < 2) {
      return {
        ok: false,
        mode: 'replace',
        resumedAction,
        message: 'PIN Guru baru wajib diisi minimal 2 karakter.',
      };
    }
    if (nextPin !== confirmPin) {
      return {
        ok: false,
        mode: 'replace',
        resumedAction,
        message:
          'Konfirmasi PIN Guru baru tidak cocok. Pastikan PIN baru dan konfirmasi PIN sama persis.',
      };
    }
  }

  const recoveryOptions =
    input.mode === 'replace'
      ? { newTeacherPin: nextPin }
      : { reverifyLegacyPin: true };

  if (resumedAction === 'push') {
    const pushRes = await pushWorkspaceToCloud(licenseCode, currentPin, recoveryOptions);
    if (pushRes.ok) {
      saveTeacherSyncPin(input.mode === 'replace' ? nextPin : currentPin);
      clearPendingLegacyPinRecovery();
      return {
        ok: true,
        mode: input.mode,
        resumedAction: 'push',
        statusCode: pushRes.statusCode,
        revision: pushRes.revision,
        cloudConfigured: pushRes.cloudConfigured,
        message:
          input.mode === 'replace'
            ? `Verifikasi & pembaruan PIN Guru ke standar keamanan aktif berhasil! Riwayat berhasil disinkronkan ke Cloud (Revisi #${pushRes.revision || 1}).`
            : `Verifikasi ulang PIN lama berhasil dan keamanan workspace telah dimigrasikan ke standar aktif (Revisi #${pushRes.revision || 1})!`,
      };
    }
    return {
      ok: false,
      mode: input.mode,
      resumedAction: 'push',
      statusCode: pushRes.statusCode,
      cloudConfigured: pushRes.cloudConfigured,
      rateLimited: pushRes.rateLimited,
      retryAfterSeconds: pushRes.retryAfterSeconds,
      redisUnavailable: pushRes.redisUnavailable,
      pinReverificationRequired: pushRes.pinReverificationRequired,
      message: pushRes.message,
    };
  }

  const pullRes = await pullWorkspaceFromCloud(licenseCode, currentPin, recoveryOptions);
  if (pullRes.ok) {
    saveTeacherSyncPin(input.mode === 'replace' ? nextPin : currentPin);
    clearPendingLegacyPinRecovery();
    return {
      ok: true,
      mode: input.mode,
      resumedAction: 'pull',
      statusCode: pullRes.statusCode,
      revision: pullRes.revision,
      restoredCount: pullRes.restoredCount,
      cloudConfigured: pullRes.cloudConfigured,
      message:
        input.mode === 'replace'
          ? `Verifikasi & pembaruan PIN Guru berhasil! Keamanan workspace dimigrasikan ke standar aktif dan data Cloud (${pullRes.restoredCount} kelompok data) siap digunakan.`
          : `Verifikasi ulang PIN lama berhasil dan keamanan workspace dimigrasikan ke standar aktif (${pullRes.restoredCount} kelompok data dipulihkan)!`,
    };
  }

  return {
    ok: false,
    mode: input.mode,
    resumedAction: 'pull',
    statusCode: pullRes.statusCode,
    cloudConfigured: pullRes.cloudConfigured,
    rateLimited: pullRes.rateLimited,
    retryAfterSeconds: pullRes.retryAfterSeconds,
    redisUnavailable: pullRes.redisUnavailable,
    pinReverificationRequired: pullRes.pinReverificationRequired,
    message: pullRes.message,
  };
}

/**
 * Menyelesaikan konflik sinkronisasi Cloud secara aman:
 * - 'merge_safe': menggabungkan perubahan non-bentrok kedua perangkat + pilihan per bidang yang bentrok, lalu push dengan baseRevision server
 * - 'use_server': mencadangkan kondisi lokal ke backup pra-konflik dan memakai seluruh snapshot server terbaru
 * - 'force_local': mempertahankan seluruh snapshot lokal setelah konfirmasi pengguna dan mendorongnya ke server pada serverRevision terbaru
 */
export async function resolveCloudConflict(
  strategy: 'merge_safe' | 'use_server' | 'force_local',
  options?: {
    choices?: Record<string, ConflictChoice>;
    allowDefaultForUnchosen?: boolean;
  }
): Promise<CloudConflictResolutionResult> {
  const pending = syncPendingCloudConflictWithLocalState();
  if (!pending) {
    return {
      ok: false,
      strategy,
      message: 'Tidak ada konflik sinkronisasi yang tertunda.',
    };
  }

  savePreConflictBackup(
    'pre_resolution',
    pending.licenseCode,
    pending.teacherPin,
    pending.baseRevision,
    pending.localEntries
  );

  if (strategy === 'use_server') {
    const wrappedBackup = JSON.stringify({
      app: 'AsesMerdeka Studio',
      version: '1.0.0',
      exportedAt: pending.serverUpdatedAt || new Date().toISOString(),
      entries: pending.serverEntries,
    });
    const importRes = importBackupDataJson(wrappedBackup);
    if (!importRes.success) {
      return {
        ok: false,
        strategy,
        message: importRes.message || 'Gagal menerapkan snapshot versi Cloud.',
      };
    }

    setConfirmedClassSetup(true);
    setWorkspaceBaseRevision(pending.licenseCode, pending.teacherPin, pending.serverRevision);
    setWorkspaceBaseEntryHashes(
      pending.licenseCode,
      pending.teacherPin,
      pending.serverRevision,
      computeWorkspaceEntryDigests(pending.serverEntries)
    );
    setWorkspaceBaseSnapshot(pending.licenseCode, pending.teacherPin, pending.serverEntries);
    autoSyncSuppressionMap.delete(buildWorkspaceScope(pending.licenseCode, pending.teacherPin));
    setInflightSyncState(null);
    setCloudConfiguredFlag(pending.cloudConfigured);
    if (pending.cloudConfigured && pending.serverUpdatedAt) {
      setLastCloudSyncAt(pending.serverUpdatedAt);
    } else if (!pending.cloudConfigured) {
      setLastCloudSyncAt(null);
    }
    savePendingCloudConflict(null);
    emitCloudSyncStatus(pending.cloudConfigured ? 'synced' : 'unconfigured', {
      revision: pending.serverRevision,
    });

    return {
      ok: true,
      strategy,
      cloudConfigured: pending.cloudConfigured,
      revision: pending.serverRevision,
      updatedAt: pending.serverUpdatedAt || undefined,
      restoredCount: importRes.restoredCount,
      message: `Versi Cloud (Revisi #${pending.serverRevision}) berhasil diterapkan. Snapshot lokal sebelum konflik tetap aman tersimpan di cadangan.`,
    };
  }

  let targetEntries: Record<string, unknown>;
  if (strategy === 'force_local') {
    targetEntries = deepClone(pending.localEntries);
  } else {
    const choices = options?.choices || {};
    if (!options?.allowDefaultForUnchosen && pending.conflicts.length > 0) {
      const missingChoice = pending.conflicts.some((c) => !choices[c.id]);
      if (missingChoice) {
        return {
          ok: false,
          strategy,
          message:
            'Masih terdapat data yang bentrok. Pilih versi Lokal atau Cloud untuk setiap butir konflik terlebih dahulu.',
        };
      }
    }
    targetEntries = applyConflictChoicesToMergedEntries(pending, choices);
  }

  const wrappedTarget = JSON.stringify({
    app: 'AsesMerdeka Studio',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    entries: targetEntries,
  });
  const importRes = importBackupDataJson(wrappedTarget);
  if (!importRes.success) {
    return {
      ok: false,
      strategy,
      message: importRes.message || 'Gagal menyimpan hasil resolusi ke penyimpanan lokal.',
    };
  }
  setConfirmedClassSetup(true);

  const pushRes = await pushWorkspaceToCloud(pending.licenseCode, pending.teacherPin, {
    baseRevisionOverride: pending.serverRevision,
    entriesOverride: targetEntries,
  });

  if (!pushRes.ok) {
    return {
      ok: false,
      strategy,
      conflict: pushRes.conflict,
      cloudConfigured: pushRes.cloudConfigured,
      revision: pushRes.serverRevision,
      message: pushRes.message,
    };
  }

  return {
    ok: true,
    strategy,
    cloudConfigured: pushRes.cloudConfigured,
    revision: pushRes.revision,
    updatedAt: pushRes.updatedAt,
    restoredCount: importRes.restoredCount,
    message:
      strategy === 'force_local'
        ? `Versi lokal berhasil diterapkan dan disinkronkan sebagai Revisi #${pushRes.revision}.`
        : `Gabungan aman (Safe Merge) berhasil diterapkan dan disinkronkan sebagai Revisi #${pushRes.revision}.`,
  };
}
