/**
 * Tipe data untuk Sistem Bantuan & Laporan Kendala Guru (In-App Feedback System)
 */

export type FeedbackCategory =
  | 'fitur_error'
  | 'data_dummy'
  | 'ui_tampilan'
  | 'unduh_dokumen'
  | 'saran_fitur';

export type FeedbackStatus = 'baru' | 'ditinjau' | 'selesai';

export interface FeedbackContext {
  activeTab?: string;
  jenjang?: string;
  kelas?: string;
  mapel?: string;
  deviceId?: string;
  isPro?: boolean;
}

export interface FeedbackReport {
  id: string;
  createdAt: string;
  updatedAt?: string;
  category: FeedbackCategory;
  description: string;
  contact?: string;
  context: FeedbackContext;
  status: FeedbackStatus;
}

export interface FeedbackCategoryMeta {
  id: FeedbackCategory;
  label: string;
  icon: string;
  description: string;
}

export const FEEDBACK_CATEGORY_META: Record<FeedbackCategory, { label: string; icon: string; description: string }> = {
  fitur_error: {
    label: 'Fitur Error / Macet',
    icon: '🚨',
    description: 'Tombol tidak merespons, alur macet, atau layar freeze.',
  },
  data_dummy: {
    label: 'Masih Ada Data Dummy',
    icon: '🧩',
    description: 'Ada nama siswa contoh, sekolah contoh, atau teks placeholder yang belum diganti.',
  },
  ui_tampilan: {
    label: 'Tampilan / UI Kurang Pas',
    icon: '📱',
    description: 'Teks terpotong, font berantakan, atau tombol sulit ditekan di HP.',
  },
  unduh_dokumen: {
    label: 'Masalah Unduh Word / ZIP',
    icon: '📄',
    description: 'Gagal mengunduh berkas Word/ZIP, format berantakan, atau dokumen kosong.',
  },
  saran_fitur: {
    label: 'Saran Fitur Baru',
    icon: '💡',
    description: 'Ide fitur baru atau usulan penyempurnaan alur kerja asesmen.',
  },
};

export const FEEDBACK_CATEGORIES: FeedbackCategoryMeta[] = [
  { id: 'fitur_error', ...FEEDBACK_CATEGORY_META.fitur_error },
  { id: 'data_dummy', ...FEEDBACK_CATEGORY_META.data_dummy },
  { id: 'ui_tampilan', ...FEEDBACK_CATEGORY_META.ui_tampilan },
  { id: 'unduh_dokumen', ...FEEDBACK_CATEGORY_META.unduh_dokumen },
  { id: 'saran_fitur', ...FEEDBACK_CATEGORY_META.saran_fitur },
];

export const FEEDBACK_STATUS_META: Record<FeedbackStatus, { label: string; icon: string; badgeClass: string }> = {
  baru: {
    label: 'Baru',
    icon: '🔴',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  },
  ditinjau: {
    label: 'Ditinjau',
    icon: '🟡',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  selesai: {
    label: 'Selesai',
    icon: '🟢',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
};
