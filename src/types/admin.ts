/**
 * Tipe data untuk Portal Admin Terpusat (Admin Portal & License Manager)
 */

export type AdminPlanType = 'individu' | 'solo' | 'sekolah' | 'pro' | 'sekolah_pro';

export type AdminLicenseStatus = 'aktif' | 'belum_aktif';

export interface AdminLicenseItem {
  code: string;
  label: string;
  planType: AdminPlanType;
  tier: string;
  maxSeats: number;
  createdAt: string;
  updatedAt?: string;
  usedSeats: number;
  devices: string[];
  status: AdminLicenseStatus;
}

export interface CreateLicensePayload {
  planType: AdminPlanType;
  label: string;
  count?: number;
  customMaxSeats?: number;
}

export type AdminPortalTab = 'licenses' | 'feedback' | 'settings';

export interface AdminPlanMeta {
  id: AdminPlanType;
  name: string;
  prefix: string;
  tier: string;
  defaultMaxSeats: number;
  description: string;
  badge: string;
}

export const ADMIN_PLAN_META: Record<AdminPlanType, AdminPlanMeta> = {
  individu: {
    id: 'individu',
    name: 'Guru Mandiri (Laptop + HP)',
    prefix: 'GM26',
    tier: 'guru',
    defaultMaxSeats: 2,
    description: 'Lisensi personal untuk 1 guru di 2 perangkat pribadi (Laptop & HP).',
    badge: 'GURU MANDIRI',
  },
  solo: {
    id: 'solo',
    name: 'Guru Mandiri Solo (1 Perangkat)',
    prefix: 'SL26',
    tier: 'guru',
    defaultMaxSeats: 1,
    description: 'Lisensi personal terkunci ketat pada 1 perangkat saja.',
    badge: 'SOLO (1 DEV)',
  },
  sekolah: {
    id: 'sekolah',
    name: 'Kolektif Sekolah (25 Guru)',
    prefix: 'SK26',
    tier: 'sekolah',
    defaultMaxSeats: 25,
    description: 'Lisensi kelembagaan sekolah hingga 25 guru.',
    badge: 'SEKOLAH (25)',
  },
  pro: {
    id: 'pro',
    name: 'Guru Mandiri PRO (AI Cerdas)',
    prefix: 'GP26',
    tier: 'pro',
    defaultMaxSeats: 2,
    description: 'Lisensi guru dengan akses fitur lanjutan kecerdasan buatan.',
    badge: 'GURU PRO (AI)',
  },
  sekolah_pro: {
    id: 'sekolah_pro',
    name: 'Kolektif Sekolah PRO (AI Cerdas)',
    prefix: 'SP26',
    tier: 'sekolah_pro',
    defaultMaxSeats: 25,
    description: 'Lisensi sekolah 25 guru dengan akses penuh fitur AI cerdas.',
    badge: 'SEKOLAH PRO (AI)',
  },
};

export const ADMIN_PLANS: AdminPlanMeta[] = [
  ADMIN_PLAN_META.individu,
  ADMIN_PLAN_META.solo,
  ADMIN_PLAN_META.sekolah,
  ADMIN_PLAN_META.pro,
  ADMIN_PLAN_META.sekolah_pro,
];
