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
  exportBackupDataJson,
  importBackupDataJson,
  saveCustomTPList,
  saveSchoolProfile,
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
  pullWorkspaceFromCloud,
  pushWorkspaceToCloud,
  resolveCloudConflict,
} from '../cloudSyncManager';

// @ts-expect-error serverless JS handler tested directly with mock req/res
import cloudSyncHandler, {
  CURRENT_SECURITY_SCHEMA_VERSION,
  LEGACY_INTERNAL_SECURITY_SCHEMA_VERSION,
  classifyRecordPinSecurity,
  clearCloudSyncRateLimitStore,
  clearLocalDevCloudSyncStore,
  getCloudSyncMigrationMetrics,
  getPepperKeyId,
  hashTeacherPin,
  hashTeacherPinLegacySha256,
  inspectWorkspaceMigrationSummary,
  isEligibleLegacyDefaultPepperRecord,
  isLegacyDefaultPepperSunsetActive,
  localDevMemoryStore,
  resetCloudSyncMigrationMetrics,
} from '../../../api/cloud-sync.js';
// @ts-expect-error serverless JS module tested with clean memory stores
import { localRevokedLicensesSet, localSeatMemoryStore } from '../../../api/activate-license.js';

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch_task6_4_1_closure',
    instansiDinas: 'Dinas Pendidikan Kota Semarang',
    namaSekolah: 'SMP Negeri 2 Semarang',
    alamatSekolah: 'Jl. Brigjen Katamso No. 14',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    rombelAktif: 'VIII C',
    mataPelajaranUtama: 'IPA',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    namaKepalaSekolah: 'Dra. Sri Lestari, M.Pd.',
    nipKepalaSekolah: '196901151995122002',
    namaGuru: 'Pak Hendro, S.Pd.',
    nipGuru: '198705202014021001',
    kotaTanggal: 'Semarang',
    ...overrides,
  };
}

function makeSampleTPs(): CustomTPItem[] {
  return [
    {
      id: 'tpid_641_1',
      kode: '8.1',
      materi: 'Sel dan Mikroskop',
      deskripsi: 'Menjelaskan struktur sel hewan dan tumbuhan menggunakan mikroskop.',
    },
  ];
}

function makeSiswa(id: string, noUrut: number, nama: string, nis: string): SiswaItem {
  return {
    id,
    noUrut,
    nama,
    nis,
    jenisKelamin: noUrut % 2 === 1 ? 'L' : 'P',
    statusAktif: 'aktif',
  };
}

function buildHarianKey(profile: SchoolProfile): string {
  return [
    profile.schoolId,
    profile.tahunAjaran,
    profile.jenjang,
    profile.kelasUtama,
    profile.rombelAktif,
    profile.mataPelajaranUtama,
    profile.semester,
  ].join('::');
}

async function invokeCloudSyncApi(
  body: Record<string, unknown>,
  headers: Record<string, string> = { 'x-forwarded-for': '198.51.100.55' }
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

function snapshotLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) out[k] = localStorage.getItem(k) || '';
  }
  return out;
}

function restoreLocalStorage(snapshot: Record<string, string>) {
  localStorage.clear();
  for (const [k, v] of Object.entries(snapshot)) {
    localStorage.setItem(k, v);
  }
}

describe('Task 6.4.1 — Legacy Pepper Migration Closure & Staging Readiness', () => {
  let prevUrl: string | undefined;
  let prevToken: string | undefined;
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

    prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    prevPepper = process.env.CLOUD_SYNC_PIN_PEPPER;
    prevPepperPrev = process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    prevSunsetAt = process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT;
    prevDisableLegacy = process.env.CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER;
    prevVercelEnv = process.env.VERCEL_ENV;
    prevNodeEnv = process.env.NODE_ENV;

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.CLOUD_SYNC_PIN_PEPPER;
    delete process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    delete process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT;
    delete process.env.CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    if (prevToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
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

  it('1. Inventaris 6 kategori record legacy/aktif dan metrik agregat tidak mengekspos PIN, hash, atau identitas guru', () => {
    const prodPepper = 'synthetic-prod-pepper-active-2026';
    const prevRotPepper = 'synthetic-prod-pepper-previous-2025';
    process.env.VERCEL_ENV = 'production';
    process.env.CLOUD_SYNC_PIN_PEPPER = prodPepper;
    process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = prevRotPepper;

    const activeKid = getPepperKeyId(prodPepper);
    const prevKid = getPepperKeyId(prevRotPepper);

    const recPlain = {
      licenseCode: 'ASM-INV-1',
      teacherPin: 'RAHASIA-PLAIN-01',
      deviceId: 'DEV-INV-1',
    };
    const recSha = {
      licenseCode: 'ASM-INV-2',
      teacherPinHash: hashTeacherPinLegacySha256('RAHASIA-SHA-02'),
      deviceId: 'DEV-INV-2',
    };
    const recOldScrypt = {
      licenseCode: 'ASM-INV-3',
      teacherPinHash: hashTeacherPin('RAHASIA-SCRYPT-03', undefined, { N: 16384, r: 8, p: 1, keylen: 32 }),
      pepperKid: activeKid,
      securitySchemaVersion: CURRENT_SECURITY_SCHEMA_VERSION,
      pepperMode: 'configured-pepper',
    };
    const recInternalPepper = {
      licenseCode: 'ASM-INV-4',
      teacherPinHash: hashTeacherPin('RAHASIA-INTERNAL-04', undefined, {
        pepperSecret: 'asesmerdeka-server-only-pin-pepper-v2-2026',
      }),
      securitySchemaVersion: LEGACY_INTERNAL_SECURITY_SCHEMA_VERSION,
      pepperMode: 'dev-internal-fallback',
    };
    const recPreviousPepper = {
      licenseCode: 'ASM-INV-5',
      teacherPinHash: hashTeacherPin('RAHASIA-PREV-05', undefined, { pepperSecret: prevRotPepper }),
      pepperKid: prevKid,
      securitySchemaVersion: CURRENT_SECURITY_SCHEMA_VERSION,
      pepperMode: 'configured-pepper',
    };
    const recActiveProd = {
      licenseCode: 'ASM-INV-6',
      teacherPinHash: hashTeacherPin('RAHASIA-ACT-06'),
      pepperKid: activeKid,
      securitySchemaVersion: CURRENT_SECURITY_SCHEMA_VERSION,
      pepperMode: 'configured-pepper',
    };

    expect(classifyRecordPinSecurity(recPlain).category).toBe('legacy_plaintext');
    expect(classifyRecordPinSecurity(recSha).category).toBe('legacy_sha256');
    expect(classifyRecordPinSecurity(recOldScrypt).category).toBe('legacy_scrypt');
    expect(classifyRecordPinSecurity(recInternalPepper).category).toBe('legacy_internal_pepper');
    expect(classifyRecordPinSecurity(recPreviousPepper).category).toBe('previous_pepper');
    expect(classifyRecordPinSecurity(recActiveProd).category).toBe('active_production_pepper');
    expect(classifyRecordPinSecurity(recActiveProd).needsMigration).toBe(false);

    const summary = inspectWorkspaceMigrationSummary([
      recPlain,
      recSha,
      recOldScrypt,
      recInternalPepper,
      recPreviousPepper,
      recActiveProd,
    ]);
    expect(summary.totalRecords).toBe(6);
    expect(summary.byCategory).toEqual({
      legacy_plaintext: 1,
      legacy_sha256: 1,
      legacy_scrypt: 1,
      legacy_internal_pepper: 1,
      previous_pepper: 1,
      active_production_pepper: 1,
      no_pin: 0,
    });
    expect(summary.pendingLegacyDefaultPepperCount).toBe(1);
    expect(summary.pendingPreviousPepperCount).toBe(1);
    expect(summary.pendingAnyLegacyCount).toBe(5);
    expect(summary.readyToRemovePreviousPepper).toBe(false);
    expect(summary.readyToDisableLegacyDefaultPepper).toBe(false);

    // Pastikan tidak ada PII, plaintext PIN, pepper secret, maupun hash lengkap yang bocor
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('RAHASIA-');
    expect(serialized).not.toContain('ASM-INV-');
    expect(serialized).not.toContain('DEV-INV-');
    expect(serialized).not.toContain(prodPepper);
    expect(serialized).not.toContain(prevRotPepper);
    expect(serialized).not.toContain('scrypt$v1$');
  });

  it('2. Kebijakan sunset sebelum & sesudah batas waktu + pemulihan aman PIN tanpa kehilangan data & blokir permanen fallback v2', async () => {
    const license = licenseManager.computeSerialLicenseCode('SUNSET01');
    const teacherKey = `asesmerdeka:sync:v1:${license}:guru_PAK_BUDI`;
    const prodPepper = 'synthetic-sunset-production-pepper-2026';

    // Buat record awal menggunakan environment dev lama (internal default pepper)
    delete process.env.CLOUD_SYNC_PIN_PEPPER;
    const initPush = await invokeCloudSyncApi({
      action: 'push',
      licenseCode: license,
      deviceId: 'DEV-BUDI-HP',
      teacherId: 'PAK_BUDI',
      teacherPin: 'PIN-LAMA-88',
      baseRevision: 0,
      entries: { jurnal: [{ topik: 'Ekosistem' }], nilaiSiswa: 90 },
    });
    expect(initPush.statusCode).toBe(200);
    const devRecord = localDevMemoryStore.get(teacherKey) as Record<string, unknown>;
    expect(devRecord.securitySchemaVersion).toBe(LEGACY_INTERNAL_SECURITY_SCHEMA_VERSION);
    expect(isEligibleLegacyDefaultPepperRecord(devRecord)).toBe(true);

    // Aktifkan Production dengan active pepper & tanggal sunset sudah lewat
    process.env.VERCEL_ENV = 'production';
    process.env.CLOUD_SYNC_PIN_PEPPER = prodPepper;
    process.env.CLOUD_SYNC_LEGACY_PEPPER_SUNSET_AT = '2026-01-01T00:00:00.000Z';
    expect(isLegacyDefaultPepperSunsetActive().sunsetPassed).toBe(true);

    // A. Login rutin pasca-sunset harus meminta verifikasi ulang / pembaruan PIN aman (403) TANPA menghapus data
    const blockedPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-BUDI-HP',
      teacherId: 'PAK_BUDI',
      teacherPin: 'PIN-LAMA-88',
    });
    expect(blockedPull.statusCode).toBe(403);
    expect(blockedPull.body.pinReverificationRequired).toBe(true);
    expect(blockedPull.body.legacySunsetExpired).toBe(true);
    expect(blockedPull.body.recoverySupported).toBe(true);
    expect(blockedPull.body.entries).toBeUndefined();
    expect(localDevMemoryStore.get(teacherKey)).toBeDefined();

    // B. Pemulihan dengan PIN lama yang salah tetap ditolak & perangkat ke-3 ilegal ditolak
    const wrongRecovery = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-BUDI-HP',
      teacherId: 'PAK_BUDI',
      teacherPin: 'PIN-ASAL-TEBAK',
      newTeacherPin: 'PIN-BARU-99',
    });
    expect(wrongRecovery.statusCode).toBe(403);
    expect(wrongRecovery.body.pinReverificationRequired).toBeUndefined();

    // C. Pemulihan aman oleh guru sah (PIN lama benar + newTeacherPin valid + perangkat terdaftar) -> sukses & naik ke schema v2
    const recoveryPull = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-BUDI-HP',
      teacherId: 'PAK_BUDI',
      teacherPin: 'PIN-LAMA-88',
      newTeacherPin: 'PIN-BARU-99',
    });
    expect(recoveryPull.statusCode).toBe(200);
    expect((recoveryPull.body.entries as Record<string, unknown>).nilaiSiswa).toBe(90);

    const upgradedRecord = localDevMemoryStore.get(teacherKey) as Record<string, unknown>;
    expect(upgradedRecord.securitySchemaVersion).toBe(CURRENT_SECURITY_SCHEMA_VERSION);
    expect(upgradedRecord.pepperMode).toBe('configured-pepper');
    expect(upgradedRecord.pepperKid).toBe(getPepperKeyId(prodPepper));
    expect(typeof upgradedRecord.pinHashUpgradedAt).toBe('string');
    // Jaminan anti-downgrade: record v2 TIDAK pernah memenuhi syarat fallback internal default pepper
    expect(isEligibleLegacyDefaultPepperRecord(upgradedRecord)).toBe(false);
    expect(isEligibleLegacyDefaultPepperRecord({ ...upgradedRecord, pepperKid: undefined })).toBe(false);

    // D. Sesi berikutnya berjalan mulus dengan PIN baru & jalur lama tidak lagi diterima
    const normalPullWithNewPin = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-BUDI-HP',
      teacherId: 'PAK_BUDI',
      teacherPin: 'PIN-BARU-99',
    });
    expect(normalPullWithNewPin.statusCode).toBe(200);

    const oldPinNowRejected = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: license,
      deviceId: 'DEV-BUDI-HP',
      teacherId: 'PAK_BUDI',
      teacherPin: 'PIN-LAMA-88',
    });
    expect(oldPinNowRejected.statusCode).toBe(403);

    const metrics = getCloudSyncMigrationMetrics();
    expect(metrics.sunsetBlockedCount).toBe(1);
    expect(metrics.migratedBySource.post_sunset_recovery).toBe(1);
  });

  it('3. Pelacakan rotasi CLOUD_SYNC_PIN_PEPPER_PREVIOUS memastikan previous pepper baru aman dihapus setelah seluruh akun bermigrasi', async () => {
    process.env.VERCEL_ENV = 'production';
    const pepperV1 = 'synthetic-rot-pepper-v1-secret-2026';
    const pepperV2 = 'synthetic-rot-pepper-v2-secret-2027';
    const schoolLicense = licenseManager.computeSerialLicenseCode('ROTSAFE1');

    // Dua guru mendaftar di bawah pepper v1
    process.env.CLOUD_SYNC_PIN_PEPPER = pepperV1;
    await invokeCloudSyncApi({
      action: 'push',
      licenseCode: schoolLicense,
      deviceId: 'DEV-G1',
      teacherId: 'GURU_1',
      teacherPin: 'PIN-G1-11',
      baseRevision: 0,
      entries: { mapel: 'Fisika' },
    });
    await invokeCloudSyncApi({
      action: 'push',
      licenseCode: schoolLicense,
      deviceId: 'DEV-G2',
      teacherId: 'GURU_2',
      teacherPin: 'PIN-G2-22',
      baseRevision: 0,
      entries: { mapel: 'Kimia' },
    });

    // Rotasi ke pepperV2 sambil menyimpan pepperV1 di CLOUD_SYNC_PIN_PEPPER_PREVIOUS
    process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS = pepperV1;
    process.env.CLOUD_SYNC_PIN_PEPPER = pepperV2;

    const beforeAnyLogin = inspectWorkspaceMigrationSummary(localDevMemoryStore);
    expect(beforeAnyLogin.pendingPreviousPepperCount).toBe(2);
    expect(beforeAnyLogin.readyToRemovePreviousPepper).toBe(false);

    // Baru Guru 1 login -> masih tersisa 1 guru di previous pepper (JANGAN hapus previous pepper dulu)
    const pullG1 = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolLicense,
      deviceId: 'DEV-G1',
      teacherId: 'GURU_1',
      teacherPin: 'PIN-G1-11',
    });
    expect(pullG1.statusCode).toBe(200);
    const afterOneLogin = inspectWorkspaceMigrationSummary(localDevMemoryStore);
    expect(afterOneLogin.pendingPreviousPepperCount).toBe(1);
    expect(afterOneLogin.readyToRemovePreviousPepper).toBe(false);

    // Guru 2 login -> semua record berpindah ke active pepperV2 -> siap membersihkan PREVIOUS
    const pullG2 = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolLicense,
      deviceId: 'DEV-G2',
      teacherId: 'GURU_2',
      teacherPin: 'PIN-G2-22',
    });
    expect(pullG2.statusCode).toBe(200);
    const afterAllMigrated = inspectWorkspaceMigrationSummary(localDevMemoryStore);
    expect(afterAllMigrated.pendingPreviousPepperCount).toBe(0);
    expect(afterAllMigrated.readyToRemovePreviousPepper).toBe(true);

    // Setelah PREVIOUS dihapus, kedua guru tetap mengakses dengan lancar
    delete process.env.CLOUD_SYNC_PIN_PEPPER_PREVIOUS;
    const pullAfterCleanup = await invokeCloudSyncApi({
      action: 'pull',
      licenseCode: schoolLicense,
      deviceId: 'DEV-G2',
      teacherId: 'GURU_2',
      teacherPin: 'PIN-G2-22',
    });
    expect(pullAfterCleanup.statusCode).toBe(200);
  });

  it('4. Regresi penuh pasca-hardening: SHA-256 legacy, scrypt p=1, rate limit, 2-device 409 merge, backup/restore & license manager', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.CLOUD_SYNC_PIN_PEPPER = 'synthetic-regression-prod-pepper-641';
    process.env.CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER = 'true';

    // Mock /api/cloud-sync fetch ke handler in-process
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (urlStr.includes('/api/cloud-sync')) {
        const parsedBody = init?.body ? JSON.parse(String(init.body)) : {};
        const result = await invokeCloudSyncApi(parsedBody);
        return {
          ok: result.statusCode >= 200 && result.statusCode < 300,
          status: result.statusCode,
          json: async () => result.body,
        } as Response;
      }
      throw new Error(`Unexpected fetch URL: ${urlStr}`);
    }) as typeof fetch;

    try {
      const license = licenseManager.computeSerialLicenseCode('REGR641');
      const schoolKeySha = `asesmerdeka:sync:v1:${license}:guru_LEG_SHA`;
      localDevMemoryStore.set(schoolKeySha, {
        licenseCode: license,
        teacherPinHash: hashTeacherPinLegacySha256('PIN-SHA-641'),
        deviceId: 'DEV-REG-1',
        revision: 3,
        entries: { warisan: 'sha256-tetap-aman' },
      });

      // Legacy SHA-256 tetap terverifikasi meski CLOUD_SYNC_DISABLE_LEGACY_DEFAULT_PEPPER=true
      const resSha = await invokeCloudSyncApi({
        action: 'pull',
        licenseCode: license,
        deviceId: 'DEV-REG-1',
        teacherId: 'LEG_SHA',
        teacherPin: 'PIN-SHA-641',
      });
      expect(resSha.statusCode).toBe(200);
      expect(classifyRecordPinSecurity(localDevMemoryStore.get(schoolKeySha)).category).toBe(
        'active_production_pepper'
      );

      // Backup & Restore + Konflik Konkurensi 2 Perangkat
      const profile = makeProfile();
      const tps = makeSampleTPs();
      const harianKey = buildHarianKey(profile);

      saveSchoolProfile(profile);
      saveCustomTPList(profile.mataPelajaranUtama, profile.kelasUtama, profile.semester, tps, profile);
      const harian = createEmptyKelasHarianData();
      harian.daftarSiswa = [makeSiswa('siswa-641', 1, 'Dewi Lestari', '264101')];
      saveKelasHarianData(harianKey, harian);

      // Uji backup & restore menolak injeksi kuota palsu saat masih mode Pratinjau
      const backupJson = exportBackupDataJson();
      const parsedBackup = JSON.parse(backupJson) as {
        entries?: Record<string, unknown>;
      };
      if (parsedBackup.entries) {
        parsedBackup.entries.asesmerdeka_user_quota = JSON.stringify({ tier: 'pro', hacked: true });
      }
      const restoreRes = importBackupDataJson(JSON.stringify(parsedBackup));
      expect(restoreRes.success).toBe(true);
      expect(restoreRes.restoredCount).toBeGreaterThan(0);
      expect(licenseManager.isLicensed(licenseManager.getUserQuota().tier)).toBe(false);

      // Aktivasi lisensi resmi memvalidasi status Pro
      const actRes = licenseManager.activateLicense(license);
      expect(actRes.success).toBe(true);
      expect(licenseManager.isLicensed(licenseManager.getUserQuota().tier)).toBe(true);

      // Push Revisi 1 & uji konflik 409 + merge 2 perangkat
      const push1 = await pushWorkspaceToCloud(license);
      expect(push1.ok).toBe(true);
      expect(push1.revision).toBe(1);

      const snapRev1 = snapshotLocalStorage();
      await pullWorkspaceFromCloud(license);
      const snapDev2 = snapshotLocalStorage();

      // Dev 1 update nilaiSTS -> Rev 2
      restoreLocalStorage(snapRev1);
      await pullWorkspaceFromCloud(license);
      const d1 = getKelasHarianData(harianKey);
      d1.daftarNilai = [
        {
          siswaId: 'siswa-641',
          formatifTPs: { '8.1': 88 },
          nilaiSTS: 93,
          nilaiSAS: 90,
          nilaiPraktik: 91,
          catatanGuru: 'Sangat baik',
          statusRapor: 'final',
        },
      ];
      saveKelasHarianData(harianKey, d1);
      const push2 = await pushWorkspaceToCloud(license);
      expect(push2.ok).toBe(true);
      expect(push2.revision).toBe(2);

      // Dev 2 update presensi -> 409 Conflict -> merge -> Rev 3
      restoreLocalStorage(snapDev2);
      const d2 = getKelasHarianData(harianKey);
      d2.daftarPresensi = [
        {
          id: 'pres-641',
          pertemuanKe: 1,
          tanggal: '2026-11-14',
          statusKeterlaksanaan: 'terlaksana',
          catatanPertemuan: 'Presensi perangkat 2',
          statusMap: { 'siswa-641': 'H' },
        },
      ];
      saveKelasHarianData(harianKey, d2);
      const pushConflict = await pushWorkspaceToCloud(license);
      expect(pushConflict.ok).toBe(false);
      expect(pushConflict.conflict).toBe(true);

      const mergedRes = await resolveCloudConflict('merge');
      expect(mergedRes.ok).toBe(true);
      const merged = getKelasHarianData(harianKey);
      expect(merged.daftarNilai[0]?.nilaiSTS).toBe(93);
      expect(merged.daftarPresensi[0]?.catatanPertemuan).toBe('Presensi perangkat 2');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
