/**
 * Layanan Klien Bank Referensi Kurikulum Bersama (Shared Community Bank)
 * Menangani pengambilan draf terstruktur dengan cache lokal (0 detik latency),
 * publikasi draf sukarela dengan proteksi Zero PII, serta penyuntikan instan
 * profil sekolah dan guru lokal (Local Profile Hydration).
 */

import type { SchoolProfile } from './schoolProfileStorage';
import { getSchoolProfile } from './schoolProfileStorage';
import type { ModulAjarDokumen, LKPDDokumen } from '../types/perangkatAjar';
import { getUserQuota, getOrCreateDeviceId } from './licenseManager';

export type SharedCurriculumType = 'modul_ajar' | 'lkpd';

export interface FetchSharedParams {
  type: SharedCurriculumType;
  jenjang: string;
  kelas: string;
  mapel: string;
  tpKode: string;
  materiPokok: string;
  model?: string;
}

export interface PublishSharedParams {
  type: SharedCurriculumType;
  jenjang: string;
  kelas: string;
  mapel: string;
  tpKode: string;
  materiPokok: string;
  model?: string;
  licenseCode?: string;
  deviceId?: string;
  data: Record<string, unknown>;
}

export interface SharedCurriculumFetchResult<T = unknown> {
  found: boolean;
  data?: T;
  message?: string;
}

export interface SharedCurriculumPublishResult {
  ok: boolean;
  message: string;
  key?: string;
}

/**
 * Daftar field identitas pribadi / sekolah yang wajib dibersihkan (Zero PII)
 */
const PII_KEYS = new Set([
  'namasekolah',
  'namaguru',
  'nip',
  'nipguru',
  'nip_guru',
  'alamatsekolah',
  'kotasekolah',
  'kontak',
  'email',
  'telepon',
  'nohp',
  'nomorhp',
  'telp',
  'kepalasekolah',
  'namakepsek',
  'namakepalasekolah',
  'nipkepsek',
  'nipkepalasekolah',
  'nip_kepala_sekolah',
  'kopsekolah',
  'logosekolah',
  'tahunajaran',
  'semester',
  'namasiswa',
  'nisn',
  'identitasguru',
  'profilguru',
]);

/**
 * Helper aman untuk mengakses penyimpanan lokal peramban / Node test
 */
export function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

/**
 * Menyimpan data ke storage secara aman dengan penanganan QuotaExceededError
 */
export function safeSetStorageItem(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    // Tangani QuotaExceededError atau batasan penyimpanan lokal secara aman tanpa error
    return false;
  }
}

/**
 * Normalisasi segmen teks menjadi slug untuk pembentuk kunci cache yang presisi
 */
export function slugifySegment(input: string | undefined | null): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[\s./\\+]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Membangun kunci cache lokal dan Redis untuk Bank Kurikulum Bersama
 * Format: asesmerdeka:shared:{type}:{jenjang}:{kelas}:{mapel}:{tpKode}:{materiPokok}:{model}
 * Mendukung pemanggilan berbasis objek parameter maupun argumen terpisah.
 */
export function getSharedCacheKey(
  paramsOrType: FetchSharedParams | SharedCurriculumType | string,
  jenjang?: string,
  kelas?: string,
  mapel?: string,
  tpKode?: string,
  materiPokok?: string,
  model?: string
): string {
  let segType = 'modul_ajar';
  let segJenjang = '';
  let segKelas = '';
  let segMapel = '';
  let segTp = '';
  let segMateri = '';
  let segModel = 'pbl';

  if (typeof paramsOrType === 'object' && paramsOrType !== null) {
    segType = paramsOrType.type || 'modul_ajar';
    segJenjang = paramsOrType.jenjang || '';
    segKelas = paramsOrType.kelas || '';
    segMapel = paramsOrType.mapel || '';
    segTp = paramsOrType.tpKode || '';
    segMateri = paramsOrType.materiPokok || '';
    segModel = paramsOrType.model || 'pbl';
  } else {
    segType = paramsOrType || 'modul_ajar';
    segJenjang = jenjang || '';
    segKelas = kelas || '';
    segMapel = mapel || '';
    segTp = tpKode || '';
    segMateri = materiPokok || '';
    segModel = model || 'pbl';
  }

  return `asesmerdeka:shared:${slugifySegment(segType)}:${slugifySegment(segJenjang)}:${slugifySegment(
    segKelas
  )}:${slugifySegment(segMapel)}:${slugifySegment(segTp)}:${slugifySegment(
    segMateri
  )}:${slugifySegment(segModel)}`;
}

/**
 * Membersihkan seluruh identitas pribadi dan sekolah sebelum draf dikirim ke cloud (Zero PII)
 */
export function sanitizeCurriculumForSharing<T extends Record<string, unknown>>(doc: T): Partial<T> {
  if (!doc || typeof doc !== 'object') return {};
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    const lower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!PII_KEYS.has(lower) && !lower.startsWith('nip')) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}

/**
 * Mengambil referensi kurikulum bersama dari cache lokal (0 detik)
 * atau dari Serverless API (/api/shared-curriculum)
 */
export async function fetchSharedCurriculum<T = unknown>(
  params: FetchSharedParams
): Promise<SharedCurriculumFetchResult<T>> {
  if (
    !params.type ||
    !params.jenjang ||
    !params.kelas ||
    !params.mapel ||
    !params.tpKode ||
    !params.materiPokok
  ) {
    return {
      found: false,
      message: 'Parameter pencarian tidak lengkap.',
    };
  }

  const cacheKey = getSharedCacheKey(params);
  const storage = getStorage();

  // 1. Cek cache lokal terlebih dahulu (0 ms latency)
  if (storage) {
    try {
      const cached = storage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as T;
        if (parsed && typeof parsed === 'object') {
          return {
            found: true,
            data: parsed,
            message: 'Ditemukan di cache lokal perangkat.',
          };
        }
      }
    } catch {
      // Lanjut ke jaringan jika gagal membaca cache lokal
    }
  }

  // 2. Hubungi endpoint Serverless Bank Bersama Cloud
  if (typeof fetch === 'undefined') {
    return {
      found: false,
      message: 'Lingkungan eksekusi tidak mendukung fetch.',
    };
  }

  try {
    const query = new URLSearchParams({
      type: params.type,
      jenjang: params.jenjang,
      kelas: params.kelas,
      mapel: params.mapel,
      tpKode: params.tpKode,
      materiPokok: params.materiPokok,
      ...(params.model ? { model: params.model } : {}),
    });

    const response = await fetch(`/api/shared-curriculum?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        found: false,
        message: `Gagal memuat referensi dari server (Status ${response.status}).`,
      };
    }

    const result = (await response.json().catch(() => null)) as {
      found?: boolean;
      data?: T;
      message?: string;
    } | null;

    if (result && result.found && result.data) {
      // Simpan ke cache lokal untuk mempercepat pembukaan berikutnya
      if (storage) {
        safeSetStorageItem(storage, cacheKey, JSON.stringify(result.data));
      }
      return {
        found: true,
        data: result.data,
        message: result.message || 'Berhasil memuat dari Bank Komunitas.',
      };
    }

    return {
      found: false,
      message: result?.message || 'Draf kurikulum belum tersedia di Bank Referensi Bersama.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Koneksi terputus';
    return {
      found: false,
      message: `Tidak dapat terhubung ke server (mode offline): ${msg}`,
    };
  }
}

/**
 * Mempublikasikan modul ajar atau LKPD ke Bank Referensi Kurikulum Bersama di Cloud
 * Membutuhkan lisensi aktif resmi dan menyaring seluruh data pribadi guru/sekolah (Zero PII).
 */
export async function publishSharedCurriculum(
  params: PublishSharedParams
): Promise<SharedCurriculumPublishResult> {
  if (
    !params.type ||
    !params.jenjang ||
    !params.kelas ||
    !params.mapel ||
    !params.tpKode ||
    !params.materiPokok
  ) {
    return {
      ok: false,
      message: 'Parameter kurikulum tidak lengkap.',
    };
  }

  if (!params.data || typeof params.data !== 'object') {
    return {
      ok: false,
      message: 'Data draf kurikulum tidak valid.',
    };
  }

  // Ambil lisensi & deviceId dari parameter atau active user quota
  let licenseCode = params.licenseCode;
  let deviceId = params.deviceId;

  try {
    const quota = getUserQuota();
    if (!licenseCode && quota.licenseKey) {
      licenseCode = quota.licenseKey;
    }
    if (!deviceId) {
      deviceId = quota.deviceId || getOrCreateDeviceId();
    }
  } catch {
    // ignore
  }

  if (!licenseCode) {
    return {
      ok: false,
      message:
        'Aktivasi Lisensi Guru Mandiri atau Sekolah diperlukan untuk membagikan modul ke Bank Bersama.',
    };
  }

  // Bersihkan data PII sebelum dikirim ke jaringan (Zero PII client defense)
  const cleanedData = sanitizeCurriculumForSharing(params.data);

  if (typeof fetch === 'undefined') {
    return {
      ok: false,
      message: 'Lingkungan eksekusi tidak mendukung fetch.',
    };
  }

  try {
    const response = await fetch('/api/shared-curriculum', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: params.type,
        jenjang: params.jenjang,
        kelas: params.kelas,
        mapel: params.mapel,
        tpKode: params.tpKode,
        materiPokok: params.materiPokok,
        model: params.model || 'pbl',
        licenseCode,
        deviceId,
        data: cleanedData,
      }),
    });

    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      key?: string;
    } | null;

    if (response.ok && result?.ok) {
      // Simpan draf bersih ke cache lokal
      const cacheKey = getSharedCacheKey(params);
      const storage = getStorage();
      if (storage) {
        safeSetStorageItem(storage, cacheKey, JSON.stringify(cleanedData));
      }
      return {
        ok: true,
        message: result.message || 'Berhasil mempublikasikan ke Bank Referensi Kurikulum Bersama.',
        key: result.key,
      };
    }

    return {
      ok: false,
      message:
        result?.message || `Gagal mempublikasikan ke Bank Komunitas (Status ${response.status}).`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Koneksi terputus';
    return {
      ok: false,
      message: `Gagal mempublikasikan draf (koneksi terputus): ${msg}`,
    };
  }
}

/**
 * Menyuntikkan identitas sekolah, nama guru, NIP, tahun ajaran, dan semester lokal
 * ke dalam dokumen referensi yang diunduh dari Bank Komunitas secara instan tanpa memutasi dokumen asli.
 */
export function hydrateSharedDocWithLocalProfile<T extends ModulAjarDokumen | LKPDDokumen | Record<string, unknown>>(
  doc: T,
  profile?: Partial<SchoolProfile> | null
): T {
  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  let activeProfile: Partial<SchoolProfile> = profile || {};
  if (!profile) {
    try {
      activeProfile = getSchoolProfile();
    } catch {
      activeProfile = {};
    }
  }

  return {
    ...doc,
    namaSekolah:
      activeProfile.namaSekolah !== undefined
        ? activeProfile.namaSekolah
        : ((doc as Record<string, unknown>).namaSekolah ?? ''),
    namaGuru:
      activeProfile.namaGuru !== undefined
        ? activeProfile.namaGuru
        : ((doc as Record<string, unknown>).namaGuru ?? ''),
    nipGuru:
      activeProfile.nipGuru !== undefined
        ? activeProfile.nipGuru
        : ((doc as Record<string, unknown>).nipGuru ?? ''),
    namaKepalaSekolah:
      activeProfile.namaKepalaSekolah !== undefined
        ? activeProfile.namaKepalaSekolah
        : ((doc as Record<string, unknown>).namaKepalaSekolah ?? ''),
    nipKepalaSekolah:
      activeProfile.nipKepalaSekolah !== undefined
        ? activeProfile.nipKepalaSekolah
        : ((doc as Record<string, unknown>).nipKepalaSekolah ?? ''),
    kotaSekolah:
      activeProfile.kotaSekolah !== undefined
        ? activeProfile.kotaSekolah
        : ((doc as Record<string, unknown>).kotaSekolah ?? ''),
    semester:
      activeProfile.semester !== undefined
        ? activeProfile.semester
        : ((doc as Record<string, unknown>).semester ?? '1 (Ganjil)'),
    tahunAjaran:
      activeProfile.tahunAjaran !== undefined
        ? activeProfile.tahunAjaran
        : ((doc as Record<string, unknown>).tahunAjaran ?? '2026/2027'),
  };
}
