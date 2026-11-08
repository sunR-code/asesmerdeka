/**
 * Layanan Klien Frontend untuk Sistem Bantuan & Laporan Kendala Guru
 * Menangani komunikasi ke serverless API (/api/feedback-reports)
 * dengan fallback penyimpanan lokal (offline-first) dan formatter AI Markdown.
 */

import type {
  FeedbackCategory,
  FeedbackStatus,
  FeedbackReport,
} from '../types/feedback';
import {
  FEEDBACK_CATEGORY_META,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUS_META,
} from '../types/feedback';

export type {
  FeedbackCategory,
  FeedbackStatus,
  FeedbackReport,
};
export {
  FEEDBACK_CATEGORY_META,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUS_META,
};

export const STORAGE_KEY_OFFLINE_FEEDBACK = 'asesmerdeka_offline_feedback_reports_v1';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

/**
 * Mengambil daftar laporan kendala yang tersimpan di localStorage saat offline
 */
export function getOfflineFeedbackReports(): FeedbackReport[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(STORAGE_KEY_OFFLINE_FEEDBACK);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackReport[]) : [];
  } catch {
    return [];
  }
}

/**
 * Menyimpan seluruh daftar laporan offline ke localStorage
 */
export function saveOfflineFeedbackReports(reports: FeedbackReport[]): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY_OFFLINE_FEEDBACK, JSON.stringify(reports));
  } catch {
    // ignore
  }
}

/**
 * Menghapus seluruh antrean laporan offline
 */
export function clearOfflineFeedbackReports(): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(STORAGE_KEY_OFFLINE_FEEDBACK);
  } catch {
    // ignore
  }
}

/**
 * Menambahkan laporan kendala baru ke penyimpanan offline lokal
 */
export function addOfflineFeedbackReport(
  payload: Omit<FeedbackReport, 'id' | 'createdAt' | 'status'>
): FeedbackReport {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const localReport: FeedbackReport = {
    id: `LOCAL-REP-${Date.now()}-${rand}`,
    createdAt: new Date().toISOString(),
    category: payload.category,
    description: payload.description,
    contact: payload.contact || '',
    context: payload.context || {},
    status: 'baru',
  };

  const current = getOfflineFeedbackReports();
  current.unshift(localReport);
  saveOfflineFeedbackReports(current);
  return localReport;
}

/**
 * Menghapus laporan tertentu dari penyimpanan offline lokal
 */
export function removeOfflineReport(reportId: string): void {
  const current = getOfflineFeedbackReports();
  const filtered = current.filter((r) => r.id !== reportId);
  if (filtered.length !== current.length) {
    saveOfflineFeedbackReports(filtered);
  }
}

/**
 * Memperbarui status laporan tertentu di penyimpanan offline lokal
 */
export function updateOfflineReportStatus(reportId: string, status: FeedbackStatus): void {
  const current = getOfflineFeedbackReports();
  const index = current.findIndex((r) => r.id === reportId);
  if (index !== -1) {
    current[index] = {
      ...current[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    saveOfflineFeedbackReports(current);
  }
}

/**
 * Menyinkronkan seluruh laporan kendala offline ke server jika sudah terhubung kembali
 */
export async function syncOfflineReports(
  _adminPin?: string
): Promise<{ syncedCount: number; remainingCount: number }> {
  const offline = getOfflineFeedbackReports();
  if (offline.length === 0) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  const remaining: FeedbackReport[] = [];
  let syncedCount = 0;

  for (const report of offline) {
    try {
      const res = await fetch('/api/feedback-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: report.category,
          description: report.description,
          contact: report.contact,
          context: report.context,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        syncedCount++;
      } else {
        remaining.push(report);
      }
    } catch {
      remaining.push(report);
    }
  }

  saveOfflineFeedbackReports(remaining);
  return { syncedCount, remainingCount: remaining.length };
}

/**
 * Mengirim laporan kendala baru dari pengguna (guru).
 * Jika gagal terhubung ke server, otomatis disimpan di localStorage (offline fallback).
 */
export async function submitFeedbackReport(
  payload: Omit<FeedbackReport, 'id' | 'createdAt' | 'status'>
): Promise<{ ok: boolean; message: string; report?: FeedbackReport }> {
  if (!payload || !payload.category || !payload.description?.trim()) {
    return {
      ok: false,
      message: 'Kategori dan deskripsi kendala wajib diisi.',
    };
  }

  try {
    const res = await fetch('/api/feedback-reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: payload.category,
        description: payload.description.trim(),
        contact: (payload.contact || '').trim(),
        context: payload.context || {},
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok && data?.report) {
      return {
        ok: true,
        message: 'Laporan kendala berhasil dikirim. Terima kasih atas masukan Anda!',
        report: data.report,
      };
    }

    if (res.status === 400) {
      return {
        ok: false,
        message: data?.error || 'Kategori dan deskripsi kendala wajib diisi.',
      };
    }

    // Kegagalan server selain validasi klien -> simpan lokal offline
    const localReport = addOfflineFeedbackReport(payload);
    return {
      ok: true,
      message: 'Laporan disimpan secara lokal (offline) dan akan disinkronkan saat terhubung kembali.',
      report: localReport,
    };
  } catch {
    // Kegagalan jaringan / offline -> simpan lokal offline
    const localReport = addOfflineFeedbackReport(payload);
    return {
      ok: true,
      message: 'Laporan disimpan secara lokal (offline) dan akan disinkronkan saat terhubung kembali.',
      report: localReport,
    };
  }
}

/**
 * Mengambil seluruh daftar laporan kendala untuk admin (wajib PIN Admin).
 * Otomatis menyinkronkan dan menggabungkan antrean offline lokal.
 */
export async function fetchFeedbackReports(
  adminPin: string
): Promise<{ ok: boolean; message: string; reports: FeedbackReport[] }> {
  const cleanPin = (adminPin || '').trim();
  if (!cleanPin) {
    return {
      ok: false,
      message: 'PIN Admin wajib diisi.',
      reports: [],
    };
  }

  try {
    const res = await fetch(`/api/feedback-reports?adminPin=${encodeURIComponent(cleanPin)}`, {
      method: 'GET',
      headers: {
        'x-admin-pin': cleanPin,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        message: data?.error || 'PIN Admin tidak valid atau gagal memuat laporan kendala.',
        reports: [],
      };
    }

    let reports: FeedbackReport[] = Array.isArray(data.reports) ? data.reports : [];

    // Sinkronkan antrean laporan offline jika ada
    const offlineReports = getOfflineFeedbackReports();
    if (offlineReports.length > 0) {
      try {
        const syncRes = await syncOfflineReports(cleanPin);
        if (syncRes.syncedCount > 0) {
          const reloadRes = await fetch(
            `/api/feedback-reports?adminPin=${encodeURIComponent(cleanPin)}`,
            {
              method: 'GET',
              headers: { 'x-admin-pin': cleanPin },
            }
          );
          const reloadData = await reloadRes.json().catch(() => null);
          if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.reports)) {
            reports = reloadData.reports;
          }
        }
      } catch {
        // Abaikan kegagalan sync, gabungkan secara visual
      }

      // Gabungkan laporan offline yang belum terunggah ke daftar admin
      const remainingOffline = getOfflineFeedbackReports();
      if (remainingOffline.length > 0) {
        const existingIds = new Set(reports.map((r) => r.id));
        const unmerged = remainingOffline.filter((r) => !existingIds.has(r.id));
        if (unmerged.length > 0) {
          reports = [...unmerged, ...reports];
        }
      }
    }

    return {
      ok: true,
      message: 'Daftar laporan kendala berhasil dimuat.',
      reports,
    };
  } catch (err) {
    const offline = getOfflineFeedbackReports();
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : 'Koneksi jaringan terputus. Menampilkan laporan yang tersimpan secara lokal.',
      reports: offline,
    };
  }
}

/**
 * Memperbarui status penanganan laporan kendala ('baru' | 'ditinjau' | 'selesai')
 */
export async function updateFeedbackReportStatus(
  adminPin: string,
  reportId: string,
  status: FeedbackStatus
): Promise<{ ok: boolean; message: string }> {
  const cleanPin = (adminPin || '').trim();
  if (!cleanPin) {
    return { ok: false, message: 'PIN Admin wajib diisi.' };
  }
  if (!reportId || !status) {
    return { ok: false, message: 'ID laporan dan status valid wajib diisi.' };
  }

  try {
    const res = await fetch('/api/feedback-reports', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': cleanPin,
      },
      body: JSON.stringify({
        adminPin: cleanPin,
        reportId,
        status,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      updateOfflineReportStatus(reportId, status);
      return {
        ok: true,
        message: 'Status laporan berhasil diperbarui.',
      };
    }

    return {
      ok: false,
      message: data?.error || 'Gagal memperbarui status laporan.',
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : 'Koneksi jaringan gagal. Gagal memperbarui status laporan.',
    };
  }
}

/**
 * Menghapus laporan kendala dari sistem (khusus admin)
 */
export async function deleteFeedbackReport(
  adminPin: string,
  reportId: string
): Promise<{ ok: boolean; message: string }> {
  const cleanPin = (adminPin || '').trim();
  if (!cleanPin) {
    return { ok: false, message: 'PIN Admin wajib diisi.' };
  }
  if (!reportId) {
    return { ok: false, message: 'ID laporan wajib diisi.' };
  }

  try {
    const res = await fetch('/api/feedback-reports', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': cleanPin,
      },
      body: JSON.stringify({
        adminPin: cleanPin,
        reportId,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      removeOfflineReport(reportId);
      return {
        ok: true,
        message: 'Laporan berhasil dihapus.',
      };
    }

    return {
      ok: false,
      message: data?.error || 'Gagal menghapus laporan.',
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : 'Koneksi jaringan gagal. Gagal menghapus laporan.',
    };
  }
}

/**
 * Memformat daftar laporan kendala ke format Markdown yang bersih, terstruktur,
 * dan siap ditempelkan langsung ke AI coding assistant untuk perbaikan cepat.
 */
export function formatReportsForAiMarkdown(reports: FeedbackReport[]): string {
  if (!Array.isArray(reports) || reports.length === 0) {
    return [
      '# 📋 Rangkuman Laporan Kendala Guru (Asesmen Merdeka)',
      '',
      '- **Total Laporan:** 0',
      '- **Status:** Baru: 0 | Ditinjau: 0 | Selesai: 0',
      '',
      'Tidak ada laporan kendala yang ditemukan.',
    ].join('\n');
  }

  const baruList = reports.filter((r) => r.status === 'baru');
  const ditinjauList = reports.filter((r) => r.status === 'ditinjau');
  const selesaiList = reports.filter((r) => r.status === 'selesai');

  const lines: string[] = [
    '# 📋 Rangkuman Laporan Kendala Guru (Asesmen Merdeka)',
    '',
    '> Rangkuman otomatis laporan kendala guru untuk ditinjau dan diperbaiki oleh AI Assistant.',
    '',
    '**Statistik Laporan:**',
    `- **Total Laporan:** ${reports.length}`,
    `- **Status:** Baru: ${baruList.length} | Ditinjau: ${ditinjauList.length} | Selesai: ${selesaiList.length}`,
    '',
    '---',
  ];

  const renderGroup = (title: string, group: FeedbackReport[]) => {
    lines.push(`## ${title} (${group.length})`, '');
    if (group.length === 0) {
      lines.push('_(Tidak ada laporan)_', '');
      return;
    }

    group.forEach((item, index) => {
      const meta = FEEDBACK_CATEGORY_META[item.category] || {
        label: item.category,
        icon: '📌',
      };
      const context = item.context || {};
      const statusLabel =
        item.status === 'baru'
          ? 'Baru'
          : item.status === 'ditinjau'
            ? 'Ditinjau'
            : 'Selesai';

      lines.push(
        `### ${index + 1}. [${meta.icon} ${meta.label}] (ID: ${item.id})`,
        `- **Tanggal / Waktu:** ${item.createdAt || '-'}`,
        `- **Kategori:** ${meta.label} (\`${item.category}\`)`,
        `- **Status:** ${statusLabel}`,
        `- **Kontak Pengirim:** ${item.contact || 'Tidak dicantumkan'}`,
        `- **Konteks Aplikasi:**`,
        `  - Halaman / Tab: ${context.activeTab || '-'}`,
        `  - Mata Pelajaran: ${context.mapel || '-'}`,
        `  - Jenjang / Kelas: ${context.jenjang || '-'} / ${context.kelas || '-'}`,
        `  - Device ID: ${context.deviceId || '-'}`,
        `  - Status Lisensi: ${context.isPro ? 'Guru Pro' : 'Free / Preview'}`,
        `- **Deskripsi Kendala:**`,
        `  > ${(item.description || '').replace(/\n/g, '\n  > ')}`,
        ''
      );
    });
  };

  renderGroup('🔴 Laporan Baru (Prioritas Perbaikan)', baruList);
  renderGroup('🟡 Laporan Sedang Ditinjau', ditinjauList);
  renderGroup('🟢 Laporan Selesai Ditangani', selesaiList);

  return lines.join('\n');
}
