import { describe, it, expect, beforeEach, afterEach } from 'vitest';

class LocalStorageMock {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: LocalStorageMock }).localStorage = new LocalStorageMock();
}
if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}
if (typeof (globalThis as unknown as { addEventListener?: unknown }).addEventListener !== 'function') {
  (globalThis as unknown as { addEventListener: () => void }).addEventListener = () => {};
}
if (typeof (globalThis as unknown as { removeEventListener?: unknown }).removeEventListener !== 'function') {
  (globalThis as unknown as { removeEventListener: () => void }).removeEventListener = () => {};
}
if (typeof (globalThis as unknown as { dispatchEvent?: unknown }).dispatchEvent !== 'function') {
  (globalThis as unknown as { dispatchEvent: () => boolean }).dispatchEvent = () => true;
}

import {
  saveCustomTPList,
  saveSchoolProfile,
  getSavedCustomTPList,
  getSchoolProfile,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import {
  createEmptyKelasHarianData,
  getKelasHarianData,
  saveKelasHarianData,
} from '../kelasHarianStorage';
import type { SiswaItem } from '../../types/kelasHarian';
import * as licenseManager from '../licenseManager';
import {
  getCloudSyncUiStatus,
  getLastCloudSyncAt,
  getPendingLegacyPinRecovery,
  getSavedTeacherSyncPin,
  pullWorkspaceFromCloud,
  pushWorkspaceToCloud,
  saveTeacherSyncPin,
  submitLegacyPinRecovery,
} from '../cloudSyncManager';

// @ts-expect-error serverless JS handler tested directly with mock req/res
import cloudSyncHandler, {
  CURRENT_SECURITY_SCHEMA_VERSION,
  LEGACY_INTERNAL_SECURITY_SCHEMA_VERSION,
  MIN_PRODUCTION_PEPPER_LENGTH,
  MIN_PRODUCTION_PEPPER_UNIQUE_CHARS,
  clearCloudSyncRateLimitStore,
  clearLocalDevCloudSyncStore,
  getPepperKeyId,
  hasSufficientPepperEntropy,
  isEligibleLegacyDefaultPepperRecord,
  resetCloudSyncMigrationMetrics,
  validateProductionPepperConfig,
} from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS module tested with clean memory stores
import { localRevokedLicensesSet, localSeatMemoryStore } from '../../../api/activate-license.js';

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_task6_4_2_closure',
    instansiDinas: 'Dinas Pendidikan Kota Yogyakarta',
    namaSekolah: 'SMP Negeri 5 Yogyakarta',
    alamatSekolah: 'Jl. Wardhani No. 1',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII A',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    namaKepalaSekolah: 'Dra. Siti Aminah, M.Pd.',
    nipKepalaSekolah: '197002101996012001',
    namaGuru: 'Ibu Rina Kusuma, S.Pd.',
    nipGuru: '198904152015022003',
    kotaTanggal: 'Yogyakarta',
    ...overrides,
  };
}

function makeSampleTPs(): CustomTPItem[] {
  return [
    {
      id: 'tpid_642_1',
      kode: '8.1',
      materi: 'Teorema Pythagoras',
      deskripsi: 'Membuktikan dan menerapkan Teorema Pythagoras dalam masalah kontekstual.',
    },
    {
      id: 'tpid_642_2',
      kode: '8.2',
      materi: 'Lingkaran',
      deskripsi: 'Menentukan keliling, luas, dan panjang busur lingkaran.',
    },
  ];
}

function makeSiswa(
  id: string,
  noUrut: number,
  nama: string,
  nis: string,
  statusAktif: 'aktif' | 'arsip' = 'aktif'
): SiswaItem {
  return {
    id,
    noUrut,
    nama,
    nis,
    jenisKelamin: noUrut % 2 === 1 ? 'L' : 'P',
    statusAktif,
  };
}

async function invokeCloudSyncApi(
  body: Record<string, unknown>,
  headers: Record<string, string> = { 'x-forwarded-for': '203.0.113.88' }
): Promise<{ statusCode: number; headers: Record<string, string>; body: Record<string, unknown> }> {
  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  const outHeaders: Record<string, string> = {};

  const req = {
    method: 'POST',
    headers,
    body,
  };
  const res = {
    setHeader(name: string, value: string) {
      outHeaders[name] = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      responseBody = payload;
      return this;
    },
  };

  await cloudSyncHandler(req, res);
  return { statusCode, headers: outHeaders, body: responseBody };
}

function installPersistentUpstashAndApiBridge(
  backingRedisKv: Map<string, string>,
  backingTtlMap: Map<string, number> = new Map<string, number>()
) {
  const originalFetch = globalThis.fetch;
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  let forceOutage = false;

  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.asesmerdeka.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-upstash-token-synthetic-642';

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input.toString();

    if (urlStr.includes('/api/cloud-sync')) {
      const parsedBody = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      const result = await invokeCloudSyncApi(parsedBody);
      return {
        ok: result.statusCode >= 200 && result.statusCode < 300,
        status: result.statusCode,
        json: async () => result.body,
      } as Response;
    }

    if (urlStr.startsWith('https://mock-upstash.asesmerdeka.test')) {
      if (forceOutage) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: 'Simulated Redis outage' }),
        } as Response;
      }

      if (urlStr.includes('/get/')) {
        const key = decodeURIComponent(urlStr.split('/get/')[1] || '');
        const raw = backingRedisKv.has(key) ? backingRedisKv.get(key)! : null;
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: raw }),
        } as Response;
      }

      const cmd = init?.body ? (JSON.parse(String(init.body)) as string[]) : [];
      if (cmd[0] === 'EVAL') {
        const script = cmd[1] || '';
        const key = cmd[3] || '';
        const currentRaw = backingRedisKv.get(key) || null;

        if (script.includes('ASESMERDEKA_RATE_LIMIT_V1')) {
          const op = cmd[4] || 'CHECK';
          const windowMs = Number(cmd[5]) || 300000;
          const now = Date.now();
          let state: { attempts: number; windowStart: number } | null = null;
          if (currentRaw) {
            try {
              state = JSON.parse(currentRaw) as { attempts: number; windowStart: number };
            } catch {
              state = null;
            }
          }
          if (op === 'RESET') {
            backingRedisKv.delete(key);
            backingTtlMap.delete(key);
            return { ok: true, status: 200, json: async () => ({ result: [0, 0] }) } as Response;
          }
          if (op === 'RECORD_FAIL') {
            if (!state || now - state.windowStart > windowMs) {
              state = { attempts: 1, windowStart: now };
            } else {
              state.attempts += 1;
            }
            backingRedisKv.set(key, JSON.stringify(state));
            backingTtlMap.set(key, windowMs);
            return {
              ok: true,
              status: 200,
              json: async () => ({ result: [state!.attempts, windowMs] }),
            } as Response;
          }
          if (!state || now - state.windowStart > windowMs) {
            if (state) backingRedisKv.delete(key);
            return { ok: true, status: 200, json: async () => ({ result: [0, 0] }) } as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              result: [state!.attempts, Math.max(1000, state!.windowStart + windowMs - now)],
            }),
          } as Response;
        }

        if (script.includes('STALE')) {
          if (!currentRaw) {
            return { ok: true, status: 200, json: async () => ({ result: ['MISSING'] }) } as Response;
          }
          const current = JSON.parse(currentRaw) as { revision?: number };
          const expectedRev = Number(cmd[4]);
          if ((Number(current.revision) || 1) !== expectedRev) {
            return { ok: true, status: 200, json: async () => ({ result: ['STALE'] }) } as Response;
          }
          backingRedisKv.set(key, cmd[5]);
          return { ok: true, status: 200, json: async () => ({ result: ['OK'] }) } as Response;
        }

        const expectedRev = Number(cmd[4]);
        const nextRecordJson = cmd[5] || '{}';
        const reqId = cmd[6] || '';
        const reqHash = cmd[7] || '';
        const reqDevice = cmd[8] || '';

        if (!currentRaw) {
          if (!Number.isNaN(expectedRev) && expectedRev > 0) {
            return { ok: true, status: 200, json: async () => ({ result: ['CONFLICT', '0', ''] }) } as Response;
          }
          backingRedisKv.set(key, nextRecordJson);
          return { ok: true, status: 200, json: async () => ({ result: ['OK', nextRecordJson] }) } as Response;
        }

        const current = JSON.parse(currentRaw) as Record<string, unknown>;
        const currentRev = Number(current.revision) || 1;

        if (reqId && current.lastRequestId === reqId) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: ['IDEMPOTENT', String(currentRev), currentRaw] }),
          } as Response;
        }
        if (
          reqHash &&
          current.lastContentHash === reqHash &&
          current.deviceId === reqDevice &&
          (expectedRev === -1 || currentRev === expectedRev + 1)
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: ['IDEMPOTENT', String(currentRev), currentRaw] }),
          } as Response;
        }
        if (expectedRev < 0 ? currentRev > 0 : currentRev !== expectedRev) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ result: ['CONFLICT', String(currentRev), currentRaw] }),
          } as Response;
        }

        backingRedisKv.set(key, nextRecordJson);
        return { ok: true, status: 200, json: async () => ({ result: ['OK', nextRecordJson] }) } as Response;
      }
    }

    throw new Error(`Unexpected fetch URL in mock: ${urlStr}`);
  }) as typeof fetch;

  return {
    setOutage(down: boolean) {
      forceOutage = down;
    },
    restore() {
      globalThis.fetch = originalFetch;
      if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
      if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    },
  };
}

describe('Task 6.4.2 — Legacy PIN Recovery UX & Production Pepper Policy Consistency', () => {
  let prevPepper: string | undefined;
  let prevPepperPrev: string | undefined;
  let prevSunsetAt: string | undefined;
  let prevDisableLegacy: string | undefined;
  let prevVercelEnv: string | undefined;
  let prevNodeEnv: string | undefined;

  beforeEach(() => {
    localStorage.clear();
    clearLocalDevCloudSyncStore();
    clearCloudSyncRateLimitStore();
    resetCloudSyncMigrationMetrics();
    localSeatMemoryStore.clear();
    localRevokedLicensesSet.clear();

    prevPepper = process.env.CLOUD_SYNC_PIN_PEPPER;
    prevPepperPrev = process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    prevSunsetAt = process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT;
    prevDisableLegacy = process.env.CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER;
    prevVercelEnv = process.env.VERCEL_ENV;
    prevNodeEnv = process.env.NODE_ENV;

    delete process.env.CLOUD_SYNC_PIN_PEPPER;
    delete process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    delete process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT;
    delete process.env.CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER;
    delete process.env.VERCEL_ENV;
    delete process.env.NODE_ENV;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  afterEach(() => {
    if (prevPepper === undefined) delete process.env.CLOUD_SYNC_PIN_PEPPER;
    else process.env.CLOUD_SYNC_PIN_PEPPER = prevPepper;
    if (prevPepperPrev === undefined) delete process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    else process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = prevPepperPrev;
    if (prevSunsetAt === undefined) delete process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT;
    else process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT = prevSunsetAt;
    if (prevDisableLegacy === undefined) delete process.env.CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER;
    else process.env.CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER = prevDisableLegacy;
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercelEnv;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
  });

  it('1. Konsistensi kebijakan pepper produksi: minimal 32 karakter acak berentropi tinggi untuk PRIMARY dan PREVIOUS + isolasi dev/test', async () => {
    expect(MIN_PRODUCTION_PEPPER_LENGTH).toBe(32);
    expect(MIN_PRODUCTION_PEPPER_UNIQUE_CHARS).toBe(8);

    // A. Non-production tetap aman menggunakan fallback terisolasi tanpa pepper env
    expect(validateProductionPepperConfig().valid).toBe(true);
    expect(hasSufficientPepperEntropy('16chars-short-ok')).toBe(false);
    expect(hasSufficientPepperEntropy('A'.repeat(32))).toBe(false);
    expect(hasSufficientPepperEntropy('synthetic-high-entropy-prod-pepper-2026!')).toBe(true);

    // B. Production menolak missing, < 32 char (termasuk 16 & 31 char), dan low-entropy primary pepper
    process.env.VERCEL_ENV = 'production';
    const license = licenseManager.computeSerialLicenseCode('PEP32TST');

    delete process.env.CLOUD_SYNC_PIN_PEPPER;
    expect(validateProductionPepperConfig().reason).toBe('MISSING_PRODUCTION_PEPPER');

    process.env.CLOUD_SYNC_PIN_PEPPER = '16chars-only-bad'; // 16 char -> harus DITOLAK
    expect(validateProductionPepperConfig().reason).toBe('WEAK_PRODUCTION_PEPPER');
    const shortRes16 = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-PEP-1',
      teacherPin: 'PIN88',
    });
    expect(shortRes16.statusCode).toBe(503);
    expect(shortRes16.body.pepperMisconfigured).toBe(true);

    process.env.CLOUD_SYNC_PIN_PEPPER = '31chars-almost-enough-but-short'; // 31 char -> harus DITOLAK
    expect(validateProductionPepperConfig().reason).toBe('WEAK_PRODUCTION_PEPPER');

    process.env.CLOUD_SYNC_PIN_PEPPER = 'X'.repeat(36); // >= 32 char tapi entropi rendah -> harus DITOLAK
    expect(validateProductionPepperConfig().reason).toBe('WEAK_PRODUCTION_PEPPER');

    // C. Primary valid >= 32 char tetapi CLOUD_SYNC_PIN_PEPPER_PREVIOUS < 32 char / entropi rendah / fallback dev -> DITOLAK
    process.env.CLOUD_SYNC_PIN_PEPPER = 'prod-primary-9f8e7d6c5b4a3210-valid-key';
    process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = 'prev-only-20-char-no'; // 20 char < 32
    const weakPrevConfig = validateProductionPepperConfig();
    expect(weakPrevConfig.valid).toBe(false);
    expect(weakPrevConfig.reason).toBe('WEAK_PREVIOUS_PRODUCTION_PEPPER');

    process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = 'B'.repeat(40); // entropi rendah
    expect(validateProductionPepperConfig().reason).toBe('WEAK_PREVIOUS_PRODUCTION_PEPPER');

    process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = 'asesmerdeka-server-only-pin-pepper-v2-2026';
    expect(validateProductionPepperConfig().reason).toBe(
      'DEFAULT_PEPPER_FORBIDDEN_AS_PREVIOUS_IN_PRODUCTION'
    );

    // D. Kedua pepper >= 32 karakter acak berentropi tinggi -> DITERIMA
    process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = 'prev-rotation-8d7c6b5a4e3f2109-valid-old';
    const validDualConfig = validateProductionPepperConfig();
    expect(validDualConfig.valid).toBe(true);
    expect(validDualConfig.minProductionLength).toBe(32);
    expect(typeof validDualConfig.activeKid).toBe('string');
    expect(typeof validDualConfig.previousKid).toBe('string');
  });

  it('2. Pasca-sunset HTTP 403 membuka state recovery -> Verifikasi Ulang PIN Lama sukses -> record naik ke active schema v2 -> normal push/pull lancar & 100% data akademik utuh', async () => {
    const sharedRedisKv = new Map<string, string>();
    const bridge = installPersistentUpstashAndApiBridge(sharedRedisKv);

    try {
      const schoolLicense = licenseManager.computeSerialLicenseCode('SEKOLAH642A');
      const profile = makeProfile();
      const tps = makeSampleTPs();

      // Siapkan data akademik lengkap pada perangkat (siswa aktif, arsip siswa, presensi, jurnal, nilai & e-Rapor final)
      saveSchoolProfile(profile);
      saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);
      const harian = createEmptyKelasHarianData();
      harian.daftarSiswa = [
        makeSiswa('s-1', 1, 'Andi Wijaya', '26001', 'aktif'),
        makeSiswa('s-2', 2, 'Bunga Citra', '26002', 'aktif'),
      ];
      harian.archivedSiswa = [makeSiswa('s-3', 3, 'Candra Putra (Pindah)', '26003', 'arsip')];
      harian.daftarPresensi = [
        {
          id: 'pres-1',
          pertemuanKe: 1,
          tanggal: '2026-11-10',
          statusKeterlaksanaan: 'terlaksana',
          catatanPertemuan: 'Latihan soal Pythagoras',
          statusMap: { 's-1': 'H', 's-2': 'I' },
        },
      ];
      harian.daftarJurnal = [
        {
          id: 'jur-1',
          tanggal: '2026-11-10',
          pertemuanKe: 1,
          materiPokok: 'Teorema Pythagoras',
          tpTerkait: ['8.1'],
          kegiatanSingkat: 'Eksplorasi segitiga siku-siku',
          refleksi: '90% siswa aktif berdiskusi',
        },
      ];
      harian.daftarNilai = [
        {
          siswaId: 's-1',
          nilaiFormatif: { tpid_642_1: 90, tpid_642_2: 92 },
          nilaiSTS: 88,
          nilaiSAS: 94,
          nilaiPraktik: 91,
          catatanGuru: 'Sangat konsisten',
          statusRapor: 'final',
          finalizedAt: '2026-11-12T10:00:00.000Z',
          deskripsiRapor: 'Menunjukkan penguasaan sangat baik pada Teorema Pythagoras dan Lingkaran.',
        },
      ];
      saveKelasHarianData(profile, harian);

      // A. Buat record awal di mode dev lama (tanpa CLOUD_SYNC_PIN_PEPPER -> internal fallback schema v1)
      const actRes = licenseManager.activateLicense(schoolLicense);
      expect(actRes.success).toBe(true);
      saveTeacherSyncPin('GURU-RINA-77');

      const devPush = await pushWorkspaceToCloud(schoolLicense, 'GURU-RINA-77');
      expect(devPush.ok).toBe(true);
      expect(devPush.revision).toBe(1);

      const cleanCode = schoolLicense.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const cloudKey = `asesmerdeka:sync:v1:${cleanCode}:guru_GURU-RINA-77`;
      const rawBeforeSunset = JSON.parse(sharedRedisKv.get(cloudKey)!) as Record<string, unknown>;
      expect(rawBeforeSunset.securitySchemaVersion).toBe(LEGACY_INTERNAL_SECURITY_SCHEMA_VERSION);
      expect(isEligibleLegacyDefaultPepperRecord(rawBeforeSunset)).toBe(true);

      // B. Production diaktifkan & batas sunset sudah terlewati
      process.env.VERCEL_ENV = 'production';
      const prodPepper = 'prod-recovery-secret-32chars-minimum-2026!';
      const activeKid = getPepperKeyId(prodPepper);
      process.env.CLOUD_SYNC_PIN_PEPPER = prodPepper;
      process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT = '2026-01-01T00:00:00.000Z';

      // Pull rutin terblokir 403 pinReverificationRequired: true -> membuka state pending recovery UI
      const blockedPull = await pullWorkspaceFromCloud(schoolLicense, 'GURU-RINA-77');
      expect(blockedPull.ok).toBe(false);
      expect(blockedPull.statusCode).toBe(403);
      expect(blockedPull.pinReverificationRequired).toBe(true);
      expect(blockedPull.legacySunsetExpired).toBe(true);
      expect(blockedPull.recoverySupported).toBe(true);

      const pendingRecovery = getPendingLegacyPinRecovery();
      expect(pendingRecovery).not.toBeNull();
      expect(pendingRecovery?.failedAction).toBe('pull');
      expect(pendingRecovery?.recoverySupported).toBe(true);
      expect(getCloudSyncUiStatus()).toBe('reverify_required');
      // Lisensi aktif TIDAK dicabut
      expect(licenseManager.isLicensed(licenseManager.getUserQuota().tier)).toBe(true);

      // C. Guru memilih Opsi 1: Verifikasi Ulang PIN Lama
      const recoveryRes = await submitLegacyPinRecovery({
        mode: 'reverify',
        currentPin: 'GURU-RINA-77',
      });
      expect(recoveryRes.ok).toBe(true);
      expect(recoveryRes.resumedAction).toBe('pull');
      expect(recoveryRes.statusCode).toBe(200);
      expect(getPendingLegacyPinRecovery()).toBeNull();
      expect(getCloudSyncUiStatus()).toBe('synced');

      // Record Cloud kini memakai active production pepper schema v2
      const upgradedRecord = JSON.parse(sharedRedisKv.get(cloudKey)!) as Record<string, unknown>;
      expect(upgradedRecord.securitySchemaVersion).toBe(CURRENT_SECURITY_SCHEMA_VERSION);
      expect(upgradedRecord.pepperMode).toBe('configured-pepper');
      expect(upgradedRecord.pepperKid).toBe(activeKid);
      expect(isEligibleLegacyDefaultPepperRecord(upgradedRecord)).toBe(false);

      // D. Verifikasi 100% integritas data akademik & sinkronisasi normal berikutnya (push + pull)
      const restoredHarian = getKelasHarianData(profile, tps);
      expect(restoredHarian.daftarSiswa).toHaveLength(2);
      expect(restoredHarian.archivedSiswa).toHaveLength(1);
      expect(restoredHarian.daftarPresensi[0]?.statusMap['s-1']).toBe('H');
      expect(restoredHarian.daftarJurnal[0]?.refleksi).toBe('90% siswa aktif berdiskusi');
      expect(restoredHarian.daftarNilai[0]?.statusRapor).toBe('final');
      expect(restoredHarian.daftarNilai[0]?.deskripsiRapor).toContain('Teorema Pythagoras');
      expect(getSavedCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, profile)).toHaveLength(2);
      expect(getSchoolProfile().namaKepalaSekolah).toBe('Dra. Siti Aminah, M.Pd.');

      // Push normal baru setelah migrasi (tanpa flag recovery) harus berhasil mulus
      restoredHarian.daftarNilai[0].nilaiPraktik = 95;
      saveKelasHarianData(profile, restoredHarian);
      const nextPush = await pushWorkspaceToCloud();
      expect(nextPush.ok).toBe(true);
      expect(nextPush.revision).toBe(2);

      const nextPull = await pullWorkspaceFromCloud();
      expect(nextPull.ok).toBe(true);
      expect(nextPull.revision).toBe(2);
      expect(getKelasHarianData(profile, tps).daftarNilai[0]?.nilaiPraktik).toBe(95);
    } finally {
      bridge.restore();
    }
  });

  it('3. Konfirmasi PIN mismatch / PIN lama salah (403) tidak menghapus data; Ganti PIN Baru sukses & migrasi active pepper', async () => {
    const sharedRedisKv = new Map<string, string>();
    const bridge = installPersistentUpstashAndApiBridge(sharedRedisKv);

    try {
      const schoolLicense = licenseManager.computeSerialLicenseCode('SEKOLAH642B');
      const profile = makeProfile({ schoolId: 'sch_replace_pin_642' });
      const tps = makeSampleTPs();

      saveSchoolProfile(profile);
      saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);
      const harian = createEmptyKelasHarianData();
      harian.daftarSiswa = [makeSiswa('s-99', 1, 'Dina Kartika', '26099', 'aktif')];
      harian.daftarNilai = [
        {
          siswaId: 's-99',
          nilaiFormatif: { tpid_642_1: 86, tpid_642_2: 88 },
          nilaiSTS: 89,
          nilaiSAS: 90,
          nilaiPraktik: 88,
          statusRapor: 'final',
          deskripsiRapor: 'Capaian sangat baik',
        },
      ];
      saveKelasHarianData(profile, harian);

      licenseManager.activateLicense(schoolLicense);
      saveTeacherSyncPin('PIN-AWAL-11');
      const initPush = await pushWorkspaceToCloud(schoolLicense, 'PIN-AWAL-11');
      expect(initPush.ok).toBe(true);

      // Aktifkan production sunset
      process.env.VERCEL_ENV = 'production';
      const prodPepper = 'prod-newpin-32chars-secret-token-2026!!';
      const activeKid = getPepperKeyId(prodPepper);
      process.env.CLOUD_SYNC_PIN_PEPPER = prodPepper;
      process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT = '2026-01-01T00:00:00.000Z';

      // Trigger sunset gate saat push perubahan baru
      const edited = getKelasHarianData(profile, tps);
      edited.daftarPresensi = [
        {
          id: 'pres-new',
          pertemuanKe: 1,
          tanggal: '2026-11-14',
          statusKeterlaksanaan: 'terlaksana',
          catatanPertemuan: 'Presensi sebelum ganti PIN',
          statusMap: { 's-99': 'H' },
        },
      ];
      saveKelasHarianData(profile, edited);

      const blockedPush = await pushWorkspaceToCloud();
      expect(blockedPush.ok).toBe(false);
      expect(blockedPush.statusCode).toBe(403);
      expect(blockedPush.pinReverificationRequired).toBe(true);
      expect(getPendingLegacyPinRecovery()?.failedAction).toBe('push');

      // A. Konfirmasi PIN baru tidak cocok -> gagal bersih tanpa menyentuh Cloud/lokal
      const mismatchRes = await submitLegacyPinRecovery({
        mode: 'replace',
        currentPin: 'PIN-AWAL-11',
        newPin: 'PIN-BARU-2026',
        confirmNewPin: 'PIN-BEDA-9999',
      });
      expect(mismatchRes.ok).toBe(false);
      expect(mismatchRes.message).toMatch(/Konfirmasi PIN Guru baru tidak cocok/i);
      expect(getPendingLegacyPinRecovery()).not.toBeNull();
      expect(getKelasHarianData(profile, tps).daftarSiswa).toHaveLength(1);
      expect(getKelasHarianData(profile, tps).daftarNilai[0]?.nilaiSAS).toBe(90);

      // B. PIN lama salah -> HTTP 403, data lokal & Cloud tetap 100% utuh
      const wrongOldRes = await submitLegacyPinRecovery({
        mode: 'replace',
        currentPin: 'PIN-SALAH-XX',
        newPin: 'PIN-BARU-2026',
        confirmNewPin: 'PIN-BARU-2026',
      });
      expect(wrongOldRes.ok).toBe(false);
      expect(wrongOldRes.statusCode).toBe(403);
      expect(getPendingLegacyPinRecovery()).not.toBeNull();
      expect(getKelasHarianData(profile, tps).daftarPresensi[0]?.catatanPertemuan).toBe(
        'Presensi sebelum ganti PIN'
      );

      // C. Verifikasi PIN lama benar + Ganti PIN Baru berhasil
      const replaceOk = await submitLegacyPinRecovery({
        mode: 'replace',
        currentPin: 'PIN-AWAL-11',
        newPin: 'PIN-BARU-2026',
        confirmNewPin: 'PIN-BARU-2026',
      });
      expect(replaceOk.ok).toBe(true);
      expect(replaceOk.resumedAction).toBe('push');
      expect(replaceOk.revision).toBe(2);
      expect(getPendingLegacyPinRecovery()).toBeNull();
      expect(getSavedTeacherSyncPin()).toBe('PIN-BARU-2026');
      expect(getCloudSyncUiStatus()).toBe('synced');

      // Cek record Cloud pada key tujuan memakai active production pepper schema v2
      const cleanCode = schoolLicense.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const destKey = `asesmerdeka:sync:v1:${cleanCode}:guru_PIN-BARU-2026`;
      const destRaw = sharedRedisKv.get(destKey);
      expect(destRaw).toBeDefined();
      const destRecord = JSON.parse(destRaw!) as Record<string, unknown>;
      expect(destRecord.securitySchemaVersion).toBe(CURRENT_SECURITY_SCHEMA_VERSION);
      expect(destRecord.pepperMode).toBe('configured-pepper');
      expect(destRecord.pepperKid).toBe(activeKid);

      // PIN lama tidak lagi dapat mengakses workspace lama
      const oldPinAttempt = await pullWorkspaceFromCloud(schoolLicense, 'PIN-AWAL-11');
      expect(oldPinAttempt.ok).toBe(false);
      expect(oldPinAttempt.statusCode).toBe(403);

      // Reset error flag dengan pull menggunakan PIN baru & lanjutkan sync normal
      const newPinPull = await pullWorkspaceFromCloud();
      expect(newPinPull.ok).toBe(true);
      expect(newPinPull.revision).toBe(2);
      expect(getKelasHarianData(profile, tps).daftarNilai[0]?.deskripsiRapor).toBe('Capaian sangat baik');
    } finally {
      bridge.restore();
    }
  });

  it('4. Rate limit HTTP 429 & gangguan server Redis HTTP 503 ditangani jujur tanpa status Tersinkron palsu', async () => {
    const sharedRedisKv = new Map<string, string>();
    const bridge = installPersistentUpstashAndApiBridge(sharedRedisKv);

    try {
      const license = licenseManager.computeSerialLicenseCode('ERR642RL');
      licenseManager.activateLicense(license);
      saveTeacherSyncPin('GURU-RL-11');

      // Simpan snapshot awal di dev mode
      const initPush = await pushWorkspaceToCloud(license, 'GURU-RL-11');
      expect(initPush.ok).toBe(true);
      expect(typeof getLastCloudSyncAt()).toBe('string');

      // Masuk ke production pasca-sunset & picu pending recovery
      process.env.VERCEL_ENV = 'production';
      process.env.CLOUD_SYNC_PIN_PEPPER = 'prod-ratelimit-outage-32chars-pepper-2026';
      process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT = '2026-01-01T00:00:00.000Z';

      const gateRes = await pullWorkspaceFromCloud(license, 'GURU-RL-11');
      expect(gateRes.pinReverificationRequired).toBe(true);

      // A. Picu brute-force rate limit 429 pada recovery
      for (let i = 0; i < 8; i++) {
        const failRes = await submitLegacyPinRecovery({
          mode: 'reverify',
          currentPin: `SALAH-${i}`,
        });
        expect(failRes.ok).toBe(false);
        expect(failRes.statusCode).toBe(403);
      }

      const limitedRes = await submitLegacyPinRecovery({
        mode: 'reverify',
        currentPin: 'GURU-RL-11',
      });
      expect(limitedRes.ok).toBe(false);
      expect(limitedRes.statusCode).toBe(429);
      expect(limitedRes.rateLimited).toBe(true);
      expect(limitedRes.retryAfterSeconds).toBeGreaterThan(0);
      expect(limitedRes.message).toMatch(/detik/i);

      // Clear rate limit untuk uji Redis Outage 503
      for (const k of Array.from(sharedRedisKv.keys())) {
        if (k.includes(':ratelimit:')) sharedRedisKv.delete(k);
      }
      clearCloudSyncRateLimitStore();

      // Recovery selesai terlebih dahulu lalu simulasikan Redis 503 pada sync berikutnya
      const recoverNow = await submitLegacyPinRecovery({
        mode: 'reverify',
        currentPin: 'GURU-RL-11',
      });
      expect(recoverNow.ok).toBe(true);
      expect(getCloudSyncUiStatus()).toBe('synced');

      // B. Simulasikan Redis outage (HTTP 503) -> tidak boleh tetap berstatus 'synced'
      bridge.setOutage(true);
      const outagePush = await pushWorkspaceToCloud();
      expect(outagePush.ok).toBe(false);
      expect(outagePush.statusCode).toBe(503);
      expect(outagePush.redisUnavailable).toBe(true);
      expect(getCloudSyncUiStatus()).toBe('sync_error');
      expect(getCloudSyncUiStatus()).not.toBe('synced');

      // Pulih kembali setelah Redis kembali normal
      bridge.setOutage(false);
      const recoverAfterOutage = await pushWorkspaceToCloud();
      expect(recoverAfterOutage.ok).toBe(true);
      expect(getCloudSyncUiStatus()).toBe('synced');
    } finally {
      bridge.restore();
    }
  });
});
