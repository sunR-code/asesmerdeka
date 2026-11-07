import {
  exportBackupDataJson,
  importBackupDataJson,
  setConfirmedClassSetup,
} from './schoolProfileStorage';
import { getUserQuota, isLicensed } from './licenseManager';

const STORAGE_KEY_TEACHER_PIN = 'asesmerdeka_cloud_teacher_pin_v1';
const STORAGE_KEY_LAST_SYNC_AT = 'asesmerdeka_cloud_last_sync_at_v1';

export function getSavedTeacherSyncPin(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY_TEACHER_PIN) || '').trim();
  } catch {
    return '';
  }
}

export function saveTeacherSyncPin(pin: string): void {
  try {
    const clean = pin.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
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

function setLastCloudSyncAt(isoStr: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC_AT, isoStr);
  } catch {
    // ignore
  }
}

export function isSchoolCollectiveLicenseCode(rawCode?: string): boolean {
  const clean = (rawCode || '').trim().toUpperCase();
  return (
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
    const rawJson = exportBackupDataJson();
    const parsed = JSON.parse(rawJson);
    if (parsed && typeof parsed.entries === 'object' && parsed.entries) {
      return parsed.entries as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Menyimpan (Push) riwayat pengisian guru dari perangkat ini ke Cloud berdasarkan Kode Lisensi
 */
export async function pushWorkspaceToCloud(
  explicitLicenseCode?: string,
  explicitTeacherPin?: string
): Promise<{
  ok: boolean;
  cloudConfigured?: boolean;
  updatedAt?: string;
  message: string;
}> {
  const quota = getUserQuota();
  const licenseCode = (explicitLicenseCode || quota.licenseKey || '').trim().toUpperCase();
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

  const entries = collectWorkspaceSyncEntries();

  try {
    const res = await fetch('/api/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'push',
        licenseCode,
        teacherPin,
        deviceId: quota.deviceId,
        entries,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      if (data.updatedAt) {
        setLastCloudSyncAt(data.updatedAt);
      }
      return {
        ok: true,
        cloudConfigured: Boolean(data.cloudConfigured),
        updatedAt: data.updatedAt,
        message: data.message || 'Riwayat berhasil disimpan ke Cloud.',
      };
    }

    return {
      ok: false,
      message: data?.message || 'Gagal menyinkronkan data ke Cloud.',
    };
  } catch {
    return {
      ok: false,
      message: 'Tidak dapat terhubung ke server sinkronisasi Cloud (periksa koneksi internet).',
    };
  }
}

/**
 * Menarik (Pull) dan memulihkan riwayat pengisian guru dari Cloud ke perangkat ini berdasarkan Kode Lisensi
 */
export async function pullWorkspaceFromCloud(
  explicitLicenseCode?: string,
  explicitTeacherPin?: string
): Promise<{
  ok: boolean;
  found: boolean;
  restoredCount: number;
  updatedAt?: string;
  message: string;
}> {
  const quota = getUserQuota();
  const licenseCode = (explicitLicenseCode || quota.licenseKey || '').trim().toUpperCase();
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

  try {
    const res = await fetch('/api/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pull',
        licenseCode,
        teacherPin,
        deviceId: quota.deviceId,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        found: false,
        restoredCount: 0,
        message: data?.message || 'Gagal mengambil data dari Cloud.',
      };
    }

    if (!data.found || !data.entries || Object.keys(data.entries).length === 0) {
      return {
        ok: true,
        found: false,
        restoredCount: 0,
        message: 'Belum ada riwayat tersimpan di Cloud pada kode lisensi ini.',
      };
    }

    const wrappedBackup = JSON.stringify({
      app: 'AsesMerdeka Studio',
      version: '1.0.0',
      exportedAt: data.updatedAt || new Date().toISOString(),
      entries: data.entries,
    });

    const importRes = importBackupDataJson(wrappedBackup);
    if (importRes.success) {
      setConfirmedClassSetup(true);
      if (data.updatedAt) {
        setLastCloudSyncAt(data.updatedAt);
      }
    }

    return {
      ok: importRes.success,
      found: true,
      restoredCount: importRes.restoredCount,
      updatedAt: data.updatedAt,
      message: importRes.success
        ? `☁️ Riwayat pengisian Anda dari perangkat sebelumnya berhasil dipulihkan otomatis (${importRes.restoredCount} kelompok data kelas & dokumen)!`
        : importRes.message,
    };
  } catch {
    return {
      ok: false,
      found: false,
      restoredCount: 0,
      message: 'Gagal menghubungi server Cloud untuk memulihkan riwayat.',
    };
  }
}

