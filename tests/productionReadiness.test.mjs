import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(import.meta.dirname, '..');

// Mock localStorage in-memory untuk pengujian unit & regresi
class LocalStorageMock {
  constructor() {
    this.store = new Map();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new LocalStorageMock();

const moduleCache = new Map();

function loadTsModule(relPath) {
  const fullPath = path.resolve(projectRoot, relPath);
  if (moduleCache.has(fullPath)) {
    return moduleCache.get(fullPath).exports;
  }

  const rawSource = fs.readFileSync(fullPath, 'utf8');
  const source = rawSource.replace(/import\.meta/g, '({ env: {} })');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: fullPath,
  });

  const mod = { exports: {} };
  moduleCache.set(fullPath, mod);

  const customRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const base = path.resolve(path.dirname(fullPath), specifier);
      const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        path.join(base, 'index.ts'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return loadTsModule(path.relative(projectRoot, candidate));
        }
      }
    }
    return require(specifier);
  };

  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText}\n})`,
    { filename: fullPath }
  );
  wrapper(mod.exports, customRequire, mod, fullPath, path.dirname(fullPath));
  return mod.exports;
}

const licenseManager = loadTsModule('src/utils/licenseManager.ts');
const kelasHarianStorage = loadTsModule('src/utils/kelasHarianStorage.ts');
const schoolProfileStorage = loadTsModule('src/utils/schoolProfileStorage.ts');
const aiGenerator = loadTsModule('src/services/aiGenerator.ts');
const paymentGateway = loadTsModule('src/utils/paymentGateway.ts');

test('AUD-002: Pengguna belum aktivasi (Mode Pratinjau) memiliki 0 kuota gratis dan hanya bisa melihat fitur', () => {
  globalThis.localStorage.clear();

  const initial = licenseManager.getUserQuota();
  assert.equal(initial.tier, 'free');
  assert.equal(initial.remainingCredits, 0);
  assert.equal(initial.maxCredits, 0);

  const deducted = licenseManager.deductQuota();
  assert.equal(deducted.success, false, 'Tanpa aktivasi lisensi, deductQuota harus ditolak (hanya pratinjau)');
  assert.equal(deducted.quota.remainingCredits, 0);
});

test('AUD-002: Manipulasi tier="pro" di localStorage tanpa signature valid ditolak (Anti-Bypass)', () => {
  globalThis.localStorage.clear();

  const quota = licenseManager.getUserQuota();

  // Simulasi penyerang mengubah tier menjadi 'pro' langsung di DevTools localStorage
  const forged = {
    ...quota,
    tier: 'pro',
    remainingCredits: 999999,
    licenseKey: 'PRO-MERDEKA-PALSU',
  };
  globalThis.localStorage.setItem('asesmerdeka_user_quota', JSON.stringify(forged));

  const verified = licenseManager.getUserQuota();
  assert.equal(verified.tier, 'free', 'Tier palsu harus dikembalikan ke free');
  assert.equal(verified.remainingCredits, 0, 'Kredit pengguna belum aktivasi harus tetap 0');
});

test('AUD-002: Menghapus asesmerdeka_user_quota tetap mempertahankan status 0 kuota sampai lisensi diaktifkan', () => {
  globalThis.localStorage.clear();

  const exhausted = licenseManager.deductQuota();
  assert.equal(exhausted.success, false);
  assert.equal(exhausted.quota.remainingCredits, 0);

  // Simulasi pengguna menghapus key kuota utama
  globalThis.localStorage.removeItem('asesmerdeka_user_quota');
  globalThis.localStorage.removeItem('asesmerdeka_quota_sig');

  const afterDelete = licenseManager.getUserQuota();
  assert.equal(afterDelete.remainingCredits, 0, 'Kuota harus tetap 0 (Mode Pratinjau)');
});

test('AUD-002: Aktivasi Lisensi Guru Pro menerima kode perangkat maupun kode kolektif sekolah (25 guru)', () => {
  globalThis.localStorage.clear();

  const deviceId = licenseManager.getOrCreateDeviceId();

  // Kode sembarang dengan prefix PRO-MERDEKA- harus ditolak
  const invalidAttempt = licenseManager.activateLicense('PRO-MERDEKA-12345');
  assert.equal(invalidAttempt.success, false);
  assert.equal(invalidAttempt.quota.tier, 'free');

  // Kode resmi perangkat harus diterima dan bertahan setelah reload getUserQuota()
  const validCode = licenseManager.computeLicenseCodeForDevice(deviceId);
  const validAttempt = licenseManager.activateLicense(validCode);
  assert.equal(validAttempt.success, true);
  assert.equal(validAttempt.quota.tier, 'guru');

  const reloaded = licenseManager.getUserQuota();
  assert.equal(reloaded.tier, 'guru');
  assert.equal(reloaded.licenseKey, validCode);

  // Uji juga batch 25 kode sekolah untuk kemitraan Bibi
  const schoolCodes = licenseManager.generateSchoolBatchLicenses('SMAN1', 25);
  assert.equal(schoolCodes.length, 25);
  assert.equal(licenseManager.isValidLicenseCode(schoolCodes[0], deviceId), true);
  assert.equal(licenseManager.isValidLicenseCode(schoolCodes[24], deviceId), true);
});

test('AUD-004: Perubahan nama sekolah memigrasikan data kelas harian agar tidak yatim (orphaned)', () => {
  globalThis.localStorage.clear();

  const initialProfile = schoolProfileStorage.getSchoolProfile();
  // Saat profil awal namaSekolah masih kosong (''), key default memakai fallback 'sekolah'
  const defaultEmptyKey = 'asesmerdeka_harian_sekolah_Matematika_8_VIII_A_sem1';
  globalThis.localStorage.setItem(defaultEmptyKey, JSON.stringify({ marker: 'DATA_PRESENSI_PENTING' }));

  const firstNamedProfile = {
    ...initialProfile,
    namaSekolah: 'SMP Negeri 1 Merdeka Belajar',
  };
  schoolProfileStorage.saveSchoolProfile(firstNamedProfile);

  const firstNamedKey = 'asesmerdeka_harian_SMP_Negeri_1_Merdeka_Belajar_Matematika_8_VIII_A_sem1';
  assert.ok(globalThis.localStorage.getItem(firstNamedKey), 'Data kelas harian harus bermigrasi dari key kosong ke nama sekolah pertama');

  const updatedProfile = {
    ...firstNamedProfile,
    namaSekolah: 'SMP Negeri 2 Nusantara',
  };
  schoolProfileStorage.saveSchoolProfile(updatedProfile);

  const newKey = 'asesmerdeka_harian_SMP_Negeri_2_Nusantara_Matematika_8_VIII_A_sem1';
  const migratedRaw = globalThis.localStorage.getItem(newKey);
  assert.ok(migratedRaw, 'Data kelas harian harus ikut bermigrasi ke key sekolah baru');
  assert.equal(JSON.parse(migratedRaw).marker, 'DATA_PRESENSI_PENTING');
});

test('AUD-014: Perhitungan Nilai Akhir (50% Formatif, 25% STS, 25% SAS) dan Predikat akurat', () => {
  const { na, predikat } = kelasHarianStorage.computeNilaiAkhir(
    { 'TP.1': 80, 'TP.2': 90 }, // Rata-rata formatif = 85 -> 50% = 42.5
    80, // 25% = 20
    90  // 25% = 22.5 -> Total NA = 85
  );
  assert.equal(na, 85);
  assert.equal(predikat, 'Baik');

  const sangatBaik = kelasHarianStorage.computeNilaiAkhir({ 'TP.1': 92 }, 88, 90);
  assert.equal(sangatBaik.na, 91);
  assert.equal(sangatBaik.predikat, 'Sangat Baik');

  const perluBimbingan = kelasHarianStorage.computeNilaiAkhir({ 'TP.1': 50 }, 50, 50);
  assert.equal(perluBimbingan.na, 50);
  assert.equal(perluBimbingan.predikat, 'Perlu Bimbingan');
});

test('AUD-014: Generator Deskripsi Rapor Otomatis menyusun capaian tertinggi dan terendah dengan benar', () => {
  const tpList = [
    {
      id: '1',
      kode: 'TP.1',
      elemen: 'Bilangan',
      materiPokok: 'Operasi Bilangan Bulat',
      tujuanPembelajaran: 'Memahami operasi bilangan bulat',
      arahanRangkuman: '',
      alokasiJP: 4,
      mingguMulai: 1,
      mingguSelesai: 2,
    },
    {
      id: '2',
      kode: 'TP.2',
      elemen: 'Aljabar',
      materiPokok: 'Persamaan Linear Satu Variabel',
      tujuanPembelajaran: 'Menyelesaikan persamaan linear satu variabel',
      arahanRangkuman: '',
      alokasiJP: 4,
      mingguMulai: 3,
      mingguSelesai: 4,
    },
  ];

  const deskripsi = kelasHarianStorage.generateAutoDeskripsiRapor(
    { 'TP.1': 92, 'TP.2': 65 },
    tpList,
    'Ahmad Fauzi'
  );

  assert.match(deskripsi, /Operasi Bilangan Bulat/);
  assert.match(deskripsi, /Persamaan Linear Satu Variabel/);
  assert.match(deskripsi, /pendampingan dan latihan tambahan/);
});

test('AUD-007: normalizeButirSoal memvalidasi JSON AI rusak/tidak lengkap secara aman tanpa crash', () => {
  const fallbackSoal = {
    id: 'fallback-1',
    nomor: 1,
    tipe: 'pilihan_ganda',
    levelKognitif: 'C3',
    indikatorSoal: 'Indikator fallback',
    stimulus: 'Stimulus fallback',
    pertanyaan: 'Pertanyaan fallback?',
    pilihan: [
      { kode: 'A', teks: 'Opsi A' },
      { kode: 'B', teks: 'Opsi B' },
    ],
    kunciJawaban: 'A',
    pembahasan: 'Pembahasan fallback',
    skorMaksimal: 10,
  };

  // Input rusak tanpa array pilihan harus mengembalikan fallback, bukan crash
  const malformed = aiGenerator.normalizeButirSoal({ tipe: 'pilihan_ganda', pertanyaan: null }, 0, fallbackSoal);
  assert.deepEqual(malformed, fallbackSoal);

  // Input valid dengan field parsial dinormalisasi dengan aman
  const validPartial = aiGenerator.normalizeButirSoal(
    {
      tipe: 'pilihan_ganda',
      pertanyaan: 'Berapakah hasil 2 + 3?',
      pilihan: [
        { kode: 'A', teks: '4' },
        { kode: 'B', teks: '5' },
      ],
      kunciJawaban: 'B',
    },
    2
  );
  assert.equal(validPartial.nomor, 3);
  assert.equal(validPartial.kunci, 'B');
  assert.equal(validPartial.pilihan.length, 2);
});

test('AUD-201: PaymentGateway menolak verifikasi pembayaran tanpa kode lisensi yang sah', () => {
  globalThis.localStorage.clear();
  const deviceId = licenseManager.getOrCreateDeviceId();

  const qrisInvoice = paymentGateway.createPaymentInvoiceSession({
    planId: 'pro_individu',
    methodId: 'qris',
    buyerName: 'Ibu Siti Aminah, S.Pd.',
    buyerEmail: 'siti@smpn1.sch.id',
    deviceId,
  });

  assert.equal(qrisInvoice.baseAmount, 99000);
  assert.equal(qrisInvoice.totalAmount, 99000);
  assert.ok(qrisInvoice.invoiceId.startsWith('INV-'));
  assert.ok(qrisInvoice.qrisPayload);

  const vaInvoice = paymentGateway.createPaymentInvoiceSession({
    planId: 'pro_sekolah',
    methodId: 'va_bri',
    buyerName: 'SMP Negeri 1 Merdeka',
    buyerEmail: 'admin@smpn1.sch.id',
    deviceId,
  });

  assert.equal(vaInvoice.baseAmount, 749000);
  assert.ok(vaInvoice.totalAmount > 749000);
  assert.ok(vaInvoice.virtualAccountNumber.startsWith('88810'));

  // Klik verifikasi tanpa kode atau dengan kode palsu harus ditolak!
  const emptyVerify = paymentGateway.verifyGatewayReceiptCode('');
  assert.equal(emptyVerify.success, false);
  assert.equal(emptyVerify.quota.tier, 'free');

  const fakeVerify = paymentGateway.verifyGatewayReceiptCode('PRO-MERDEKA-PALSU');
  assert.equal(fakeVerify.success, false);
  assert.equal(fakeVerify.quota.tier, 'free');

  // Hanya kode lisensi perangkat resmi atau kode voucher sekolah yang diterima
  const validDeviceKey = licenseManager.computeLicenseCodeForDevice(deviceId);
  const validVerify = paymentGateway.verifyGatewayReceiptCode(validDeviceKey);
  assert.equal(validVerify.success, true);
  assert.equal(validVerify.quota.tier, 'guru');
});

test('AUD-202: PIN Admin diverifikasi dengan one-way hash dan tidak tersimpan plaintext di kode sumber', () => {
  const sourceCode = fs.readFileSync(path.resolve(projectRoot, 'src/utils/licenseManager.ts'), 'utf8');
  assert.equal(sourceCode.includes('141317!@#'), false, 'PIN Admin tidak boleh tertulis plaintext di licenseManager.ts');

  assert.equal(licenseManager.verifyAdminKeygenPin('000000'), false);
  assert.equal(licenseManager.verifyAdminKeygenPin('123456'), false);
  assert.equal(licenseManager.verifyAdminKeygenPin('141317!@#'), true);
});

test('AUD-205: Backup & Restore JSON mencadangkan data kelas secara utuh namun menolak injeksi kuota lisensi', () => {
  globalThis.localStorage.clear();
  const profile = schoolProfileStorage.getSchoolProfile();
  schoolProfileStorage.saveSchoolProfile({ ...profile, namaSekolah: 'SMA Negeri 1 Backup Test' });

  const backupJson = schoolProfileStorage.exportBackupDataJson();
  globalThis.localStorage.clear();

  // Coba sisipkan key kuota palsu ke dalam JSON backup
  const tamperedObj = JSON.parse(backupJson);
  tamperedObj.entries['asesmerdeka_user_quota'] = { tier: 'pro', remainingCredits: 999999 };
  const restoreRes = schoolProfileStorage.importBackupDataJson(JSON.stringify(tamperedObj));

  assert.equal(restoreRes.success, true);
  assert.equal(schoolProfileStorage.getSchoolProfile().namaSekolah, 'SMA Negeri 1 Backup Test');
  assert.equal(licenseManager.getUserQuota().tier, 'free', 'Restore backup tidak boleh mengizinkan injeksi tier pro');
});

test('AUD-206: Kode lisensi dikunci berdasarkan batas maksimal perangkat (Anti-Share / Anti-Jual Ulang)', () => {
  globalThis.localStorage.clear();

  // 1. Kode Kunci Perangkat (PRO-MERDEKA-XXXXXX) hanya valid di 1 ID Perangkat dan ditolak di perangkat lain
  const dev1 = 'DEV-LAPTOP01-GURU';
  const dev2 = 'DEV-LAPTOP02-ORANGLAIN';
  const dev1Key = licenseManager.computeLicenseCodeForDevice(dev1);
  assert.equal(licenseManager.isValidLicenseCode(dev1Key, dev1), true);
  assert.equal(licenseManager.isValidLicenseCode(dev1Key, dev2), false, 'Kode perangkat 1 tidak boleh bisa dipakai di perangkat 2');

  // 2. Kode Mayar/Bibi menerapkan batas maksimal kursi perangkat (default 2: 1 Laptop + 1 HP, tolak perangkat ke-3)
  const mayarKey = licenseManager.generateSchoolBatchLicenses('MAYAR', 1)[0];
  assert.equal(licenseManager.getMaxDevicesForLicenseCode(mayarKey), 2);

  globalThis.localStorage.setItem('asesmerdeka_device_id', 'DEV-GURU1-LAPTOP');
  const claim1 = licenseManager.activateLicense(mayarKey);
  assert.equal(claim1.success, true);
  assert.equal(claim1.usedSeats, 1);
  assert.equal(claim1.maxSeats, 2);

  globalThis.localStorage.setItem('asesmerdeka_device_id', 'DEV-GURU1-HP');
  const claim2 = licenseManager.activateLicense(mayarKey);
  assert.equal(claim2.success, true);
  assert.equal(claim2.usedSeats, 2);

  // Perangkat ke-3 (dijual ulang ke guru lain) WAJIB DITOLAK!
  globalThis.localStorage.setItem('asesmerdeka_device_id', 'DEV-PEMBELI-GELAP-03');
  const claim3 = licenseManager.activateLicense(mayarKey);
  assert.equal(claim3.success, false, 'Perangkat ke-3 wajib ditolak agar kode tidak bisa dijual ulang');
  assert.match(claim3.message, /batas maksimal perangkat/i);

  // 3. Kode dengan prefix SOLO dikunci ketat maksimal 1 perangkat saja
  const soloKey = licenseManager.generateSchoolBatchLicenses('SOLO', 1)[0];
  assert.equal(licenseManager.getMaxDevicesForLicenseCode(soloKey), 1);

  globalThis.localStorage.setItem('asesmerdeka_device_id', 'DEV-SOLO-OWNER');
  const soloClaim1 = licenseManager.activateLicense(soloKey);
  assert.equal(soloClaim1.success, true);

  globalThis.localStorage.setItem('asesmerdeka_device_id', 'DEV-SOLO-SECOND');
  const soloClaim2 = licenseManager.activateLicense(soloKey);
  assert.equal(soloClaim2.success, false, 'Kode SOLO wajib menolak perangkat ke-2');
});

test('AUD-207: Verifikasi dan aktivasi kode lisensi Mayar membedakan kuota perangkat Individu (2) dan Sekolah (25)', async () => {
  globalThis.localStorage.clear();

  // Pastikan ID Produk default Individu & Sekolah terdefinisi tepat
  assert.equal(licenseManager.getMayarProductId(), 'c1db962a-7cc5-46cc-969e-2c7c930f5bdc');
  assert.equal(licenseManager.getMayarSchoolProductId(), '17cece7f-e711-4fdc-af44-e6ceb4b4bff7');

  // Simulasikan respon endpoint serverless /api/activate-license untuk paket sekolah
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url === '/api/activate-license') {
      return {
        ok: true,
        json: async () => ({
          valid: true,
          planType: 'sekolah',
          maxSeats: 25,
          message: 'Lisensi Kolektif Sekolah (25 Guru) berhasil diverifikasi dan aktif.',
        }),
      };
    }
    return origFetch(url);
  };

  try {
    const schoolMayarCode = 'MYR-SEKOLAH-25-TEST';
    const verifyRes = await licenseManager.verifyMayarLicenseOnline(schoolMayarCode, 'DEV-GURU-01');
    assert.equal(verifyRes.valid, true);
    assert.equal(verifyRes.planType, 'sekolah');
    assert.equal(verifyRes.maxSeats, 25);

    // Sekarang kode sekolah Mayar ini harus otomatis terdeteksi punya kuota 25 perangkat
    assert.equal(licenseManager.getMaxDevicesForLicenseCode(schoolMayarCode), 25);

    // Aktivasi di guru ke-1 berhasil
    globalThis.localStorage.setItem('asesmerdeka_device_id', 'DEV-GURU-01');
    const act1 = licenseManager.activateLicense(schoolMayarCode);
    assert.equal(act1.success, true);
    assert.equal(act1.maxSeats, 25);
    assert.equal(act1.usedSeats, 1);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('AUD-208: Serverless API menangani ketiadaan MAYAR_API_KEY dengan pesan ramah panduan KYC', async () => {
  const handlerMod = await import('../api/activate-license.js');
  const handler = handlerMod.default;

  const prevKey = process.env.MAYAR_API_KEY;
  delete process.env.MAYAR_API_KEY;

  let statusCode = 200;
  let responseData = null;
  const req = {
    method: 'POST',
    body: { licenseCode: 'TEST-CODE', deviceId: 'DEV-TEST' },
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  try {
    await handler(req, res);
    assert.equal(statusCode, 503);
    assert.equal(responseData.valid, false);
    assert.equal(responseData.kycPending, true);
    assert.match(responseData.message, /KYC|verifikasi akun Mayar/i);
  } finally {
    if (prevKey) process.env.MAYAR_API_KEY = prevKey;
  }
});

test('AUD-209: Motion Presets Dashboard V21 terdefinisi dengan parameter spring physics valid', () => {
  const motionPresets = loadTsModule('src/utils/motionPresets.ts');
  assert.ok(motionPresets.springPillTransition);
  assert.equal(motionPresets.springPillTransition.type, 'spring');
  assert.equal(motionPresets.cardHoverMotion.y, -4);
  assert.equal(motionPresets.cardTapMotion.scale, 0.985);
  assert.ok(motionPresets.bentoCardVariants.visible.transition.type, 'spring');
  assert.ok(motionPresets.staggerContainerVariants.visible.transition.staggerChildren > 0);
});

test('AUD-210: Perangkat baru menampilkan Langkah 1 (Pilih Kelas & Mapel) terlebih dahulu sebelum Daftar Bab/TP', () => {
  globalThis.localStorage.clear();
  assert.equal(
    schoolProfileStorage.hasConfirmedClassSetup(),
    false,
    'Perangkat baru wajib memulai dari Langkah 1 (hasConfirmedClassSetup = false)'
  );

  schoolProfileStorage.setConfirmedClassSetup(true);
  assert.equal(
    schoolProfileStorage.hasConfirmedClassSetup(),
    true,
    'Setelah guru memilih kelas & klik mulai, status terkonfirmasi disimpan'
  );

  schoolProfileStorage.setConfirmedClassSetup(false);
  assert.equal(
    schoolProfileStorage.hasConfirmedClassSetup(),
    false,
    'Guru dapat kembali ke Langkah 1 kapan saja untuk mengganti pengaturan kelas'
  );
});

test('AUD-211: Serverless Cloud Sync (/api/cloud-sync) menyimpan dan memulihkan riwayat lintas perangkat (HP <-> Laptop) serta memisahkan guru pada Lisensi Sekolah', async () => {
  const { default: cloudSyncHandler } = await import('../api/cloud-sync.js');

  function makeMockRes() {
    let statusCode = 200;
    let body = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader() {
        return this;
      },
      json(data) {
        body = data;
        return this;
      },
      get result() {
        return { statusCode, body };
      },
    };
  }

  // 1. Lisensi Guru Mandiri (Individu): Push dari HP lalu Pull dari Komputer dengan 1 Kode Lisensi
  const individuLicense = 'ASM-GM26-1TAT-1QBM-133R';
  const hpEntries = {
    asesmerdeka_school_profile_v1: {
      namaSekolah: 'SMPN 5 Sinkronisasi Cloud',
      jenjang: 'SMP/MTs',
      kelasUtama: '9',
      mataPelajaranUtama: 'IPA',
    },
    asesmerdeka_onboarding_confirmed_v1: 'true',
  };

  const pushRes = makeMockRes();
  await cloudSyncHandler(
    {
      method: 'POST',
      body: {
        action: 'push',
        licenseCode: individuLicense,
        deviceId: 'DEV-HP-GURU',
        entries: hpEntries,
      },
    },
    pushRes
  );
  assert.equal(pushRes.result.statusCode, 200);
  assert.equal(pushRes.result.body.ok, true);

  const pullRes = makeMockRes();
  await cloudSyncHandler(
    {
      method: 'POST',
      body: {
        action: 'pull',
        licenseCode: individuLicense,
        deviceId: 'DEV-LAPTOP-GURU',
      },
    },
    pullRes
  );
  assert.equal(pullRes.result.statusCode, 200);
  assert.equal(pullRes.result.body.ok, true);
  assert.equal(pullRes.result.body.found, true);
  assert.equal(
    pullRes.result.body.entries.asesmerdeka_school_profile_v1.namaSekolah,
    'SMPN 5 Sinkronisasi Cloud'
  );

  // 2. Lisensi Kolektif Sekolah (25 Guru): Wajib menyertakan Nama/PIN Guru agar data 25 guru tidak saling menimpa
  const schoolLicense = 'ASM-SK26-239A-25I3-UYJ8';
  const noPinRes = makeMockRes();
  await cloudSyncHandler(
    {
      method: 'POST',
      body: {
        action: 'push',
        licenseCode: schoolLicense,
        entries: hpEntries,
      },
    },
    noPinRes
  );
  assert.equal(noPinRes.result.statusCode, 400);
  assert.equal(noPinRes.result.body.requiresPin, true);

  // Guru A (FAJAR) menyimpan data Matematika, Guru B (SITI) menyimpan data Bahasa Inggris pada Kode Sekolah yang sama
  const pushGuruA = makeMockRes();
  await cloudSyncHandler(
    {
      method: 'POST',
      body: {
        action: 'push',
        licenseCode: schoolLicense,
        teacherPin: 'FAJAR',
        entries: { mapel: 'Matematika' },
      },
    },
    pushGuruA
  );
  assert.equal(pushGuruA.result.statusCode, 200);

  const pushGuruB = makeMockRes();
  await cloudSyncHandler(
    {
      method: 'POST',
      body: {
        action: 'push',
        licenseCode: schoolLicense,
        teacherPin: 'SITI',
        entries: { mapel: 'Bahasa Inggris' },
      },
    },
    pushGuruB
  );
  assert.equal(pushGuruB.result.statusCode, 200);

  const pullGuruA = makeMockRes();
  await cloudSyncHandler(
    {
      method: 'POST',
      body: {
        action: 'pull',
        licenseCode: schoolLicense,
        teacherPin: 'FAJAR',
      },
    },
    pullGuruA
  );
  assert.equal(pullGuruA.result.body.entries.mapel, 'Matematika');
});

test('AUD-212: Profil sekolah & data kop default pada perangkat baru dimulai dalam keadaan kosong (tidak berisi nama dummy)', () => {
  globalThis.localStorage.clear();
  const defaultProf = schoolProfileStorage.getSchoolProfile();
  assert.equal(defaultProf.instansiDinas, '');
  assert.equal(defaultProf.namaSekolah, '');
  assert.equal(defaultProf.alamatSekolah, '');
  assert.equal(defaultProf.kotaSekolah, '');
  assert.equal(defaultProf.namaGuru, '');
  assert.equal(defaultProf.nipGuru, '');
  assert.equal(defaultProf.namaKepalaSekolah, '');
  assert.equal(defaultProf.nipKepalaSekolah, '');
});

test('AUD-213: Kode lisensi terenkripsi (ASM-...) tidak menampilkan nomor urut polos dan Serverless API menolak perangkat ke-3 (Laptop + HP = 2/2)', async () => {
  const code1 = licenseManager.computeSerialLicenseCode('MAYAR001');
  const code2 = licenseManager.computeSerialLicenseCode('MAYAR002');

  assert.ok(code1.startsWith('ASM-GM26-'), 'Kode harus memakai format terenkripsi ASM-GM26-...');
  assert.equal(code1.includes('MAYAR'), false, 'Kode terenkripsi tidak boleh menampilkan kata MAYAR001 secara polos');
  assert.notEqual(code1, code2);

  // Mengubah 1 huruf saja pada kode terenkripsi wajib membuatnya tidak valid
  const tampered = code1.slice(0, -1) + (code1.endsWith('A') ? 'B' : 'A');
  assert.equal(licenseManager.isValidLicenseCode(tampered, 'DEV-1'), false);

  const activateHandler = (await import('../api/activate-license.js')).default;
  const makeMockRes = () => {
    const out = { statusCode: 200, headers: {}, body: null };
    return {
      setHeader(k, v) {
        out.headers[k] = v;
      },
      status(code) {
        out.statusCode = code;
        return this;
      },
      json(payload) {
        out.body = payload;
        return this;
      },
      get result() {
        return out;
      },
    };
  };

  // Perangkat 1 (Laptop Fajar) -> Diterima (1/2)
  const res1 = makeMockRes();
  await activateHandler(
    { method: 'POST', body: { licenseCode: code1, deviceId: 'DEV-LAPTOP-FAJAR' } },
    res1
  );
  assert.equal(res1.result.statusCode, 200);
  assert.equal(res1.result.body.valid, true);
  assert.equal(res1.result.body.usedSeats, 1);

  // Perangkat 2 (HP Fajar) -> Diterima (2/2)
  const res2 = makeMockRes();
  await activateHandler(
    { method: 'POST', body: { licenseCode: code1, deviceId: 'DEV-HP-FAJAR' } },
    res2
  );
  assert.equal(res2.result.statusCode, 200);
  assert.equal(res2.result.body.valid, true);
  assert.equal(res2.result.body.usedSeats, 2);

  // Perangkat 3 (HP Istri / Orang Lain) -> WAJIB DITOLAK (403 Seat Limit Exceeded)
  const res3 = makeMockRes();
  await activateHandler(
    { method: 'POST', body: { licenseCode: code1, deviceId: 'DEV-HP-ISTRI-03' } },
    res3
  );
  assert.equal(res3.result.statusCode, 403);
  assert.equal(res3.result.body.valid, false);
  assert.equal(res3.result.body.seatLimitExceeded, true);

  // Kode lama PRO-MERDEKA-MAYAR001-1EN8 WAJIB DITOLAK permanen baik di klien maupun server
  assert.equal(licenseManager.isValidLicenseCode('PRO-MERDEKA-MAYAR001-1EN8', 'DEV-LAPTOP-FAJAR'), false);
  const resLegacy = makeMockRes();
  await activateHandler(
    { method: 'POST', body: { licenseCode: 'PRO-MERDEKA-MAYAR001-1EN8', deviceId: 'DEV-LAPTOP-FAJAR' } },
    resLegacy
  );
  assert.equal(resLegacy.result.statusCode, 403);
  assert.equal(resLegacy.result.body.legacyRevoked, true);

  // Perangkat yang sebelumnya pernah memakai kode lama otomatis di-reset menjadi kosong saat getUserQuota dipanggil
  globalThis.localStorage.setItem(
    'asesmerdeka_user_quota',
    JSON.stringify({
      tier: 'guru',
      remainingCredits: 999999,
      maxCredits: 999999,
      deviceId: 'DEV-LAPTOP-FAJAR',
      licenseKey: 'PRO-MERDEKA-MAYAR001-1EN8',
    })
  );
  globalThis.localStorage.setItem('asesmerdeka_class_setup_confirmed_v1', 'true');
  const purgedQuota = licenseManager.getUserQuota();
  assert.equal(purgedQuota.tier, 'free');
  assert.equal(purgedQuota.licenseKey, undefined);
  assert.equal(globalThis.localStorage.getItem('asesmerdeka_class_setup_confirmed_v1'), null);
});

test('AUD-214: Impor siswa baru dari Excel otomatis menghapus seluruh 30 siswa dummy beserta presensi, nilai, dan jurnal bawaannya', () => {
  globalThis.localStorage.clear();
  const profile = schoolProfileStorage.getSchoolProfile();
  const tpList = [
    {
      id: 'tp-1',
      kode: '7.1',
      elemen: 'Bilangan',
      materiPokok: 'Bilangan Bulat',
      tujuanPembelajaran: 'Memahami operasi bilangan bulat',
      arahanRangkuman: 'Ringkasan bilangan bulat',
      alokasiJP: 12,
      mingguMulai: 1,
      mingguSelesai: 4,
    },
  ];

  // 1. Awalnya terdapat 30 siswa dummy bawaan (Aditia Pratama, dkk.)
  const initialData = kelasHarianStorage.getKelasHarianData(profile, tpList);
  assert.equal(initialData.daftarSiswa.length, 30);
  assert.equal(initialData.daftarSiswa[0].nama, 'Aditia Pratama');

  // 2. Guru mengimpor 3 siswa baru dari Excel (meskipun NIS otomatisnya sama 2425001..2425003)
  const excelStudents = [
    { id: 'siswa_imp_1', noUrut: 1, nis: '2425001', nama: 'Budi Santoso', jenisKelamin: 'L' },
    { id: 'siswa_imp_2', noUrut: 2, nis: '2425002', nama: 'Citra Lestari', jenisKelamin: 'P' },
    { id: 'siswa_imp_3', noUrut: 3, nis: '2425003', nama: 'Deni Kurniawan', jenisKelamin: 'L' },
  ];

  const afterImport = kelasHarianStorage.applyNewStudentRoster(initialData, excelStudents, tpList, false);

  // Pastikan 30 siswa dummy terhapus total dan digantikan tepat oleh 3 siswa baru
  assert.equal(afterImport.daftarSiswa.length, 3);
  assert.deepEqual(
    afterImport.daftarSiswa.map((s) => s.nama),
    ['Budi Santoso', 'Citra Lestari', 'Deni Kurniawan']
  );

  // Pastikan matriks presensi hanya berisi 3 siswa baru (tidak ada ID siswa dummy lama)
  assert.equal(Object.keys(afterImport.daftarPresensi[0].statusMap).length, 3);
  assert.equal(afterImport.daftarPresensi[0].statusMap['siswa_1'], undefined);
  assert.equal(afterImport.daftarPresensi[0].statusMap['siswa_imp_1'], 'H');

  // Pastikan buku nilai hanya berisi 3 siswa baru dan nilai dummy lama tidak bocor karena kesamaan NIS 2425001
  assert.equal(afterImport.daftarNilai.length, 3);
  assert.equal(afterImport.daftarNilai[0].nama, 'Budi Santoso');
  assert.equal(afterImport.daftarNilai[0].nilaiSTS, 80);

  // Pastikan nama dummy pada Jurnal Mengajar ("Andika Bagus (Sakit)") ikut dibersihkan
  const hasDummyInJurnal = afterImport.daftarJurnal.some(
    (j) => j.siswaTidakHadir.includes('Andika Bagus') || j.siswaTidakHadir.includes('Dimas Arya')
  );
  assert.equal(hasDummyInJurnal, false);
});

test('AUD-215: API feedback-reports menangani POST laporan baru, menolak GET/PATCH/DELETE tanpa PIN, dan mengizinkan pengelolaan jika PIN benar', async () => {
  const { default: feedbackHandler } = await import('../api/feedback-reports.js');

  const makeMockRes = () => {
    const out = { statusCode: 200, headers: {}, body: null };
    return {
      setHeader(k, v) {
        out.headers[k] = v;
        return this;
      },
      status(code) {
        out.statusCode = code;
        return this;
      },
      json(payload) {
        out.body = payload;
        return this;
      },
      end() {
        return this;
      },
      get result() {
        return out;
      },
    };
  };

  // 1. POST kendala tanpa kategori/deskripsi ditolak (400)
  const invalidPostRes = makeMockRes();
  await feedbackHandler(
    {
      method: 'POST',
      body: { category: '', description: '   ' },
    },
    invalidPostRes
  );
  assert.equal(invalidPostRes.result.statusCode, 400);
  assert.equal(invalidPostRes.result.body.ok, false);

  // 2. POST kendala valid diterima (200) tanpa perlu PIN admin
  const postRes = makeMockRes();
  await feedbackHandler(
    {
      method: 'POST',
      body: {
        category: 'fitur_error',
        description: 'Tombol unduh rapor lemot saat di klik di HP',
        contact: '08123456789 (Pak Guru)',
        context: {
          activeTab: 'rekap',
          kelas: '7',
          mapel: 'Informatika',
          deviceId: 'DEV-TEST-001',
        },
      },
    },
    postRes
  );
  assert.equal(postRes.result.statusCode, 200);
  assert.equal(postRes.result.body.ok, true);
  assert.ok(postRes.result.body.report);
  assert.ok(postRes.result.body.report.id.startsWith('REP-'));
  assert.equal(postRes.result.body.report.status, 'baru');
  assert.equal(postRes.result.body.report.category, 'fitur_error');
  assert.equal(postRes.result.body.report.description, 'Tombol unduh rapor lemot saat di klik di HP');
  const reportId = postRes.result.body.report.id;

  // 3. GET tanpa PIN ditolak (401)
  const getNoPinRes = makeMockRes();
  await feedbackHandler({ method: 'GET', query: {} }, getNoPinRes);
  assert.equal(getNoPinRes.result.statusCode, 401);
  assert.equal(getNoPinRes.result.body.ok, false);
  assert.equal(getNoPinRes.result.body.error, 'Unauthorized: PIN Admin tidak valid');

  // 4. GET dengan PIN salah ditolak (401)
  const getWrongPinRes = makeMockRes();
  await feedbackHandler({ method: 'GET', query: { adminPin: '999999' } }, getWrongPinRes);
  assert.equal(getWrongPinRes.result.statusCode, 401);
  assert.equal(getWrongPinRes.result.body.ok, false);
  assert.equal(getWrongPinRes.result.body.error, 'Unauthorized: PIN Admin tidak valid');

  // 5. GET dengan PIN benar ('141317!@#') berhasil dan menampilkan daftar laporan
  const getValidPinRes = makeMockRes();
  await feedbackHandler({ method: 'GET', query: { adminPin: '141317!@#' } }, getValidPinRes);
  assert.equal(getValidPinRes.result.statusCode, 200);
  assert.equal(getValidPinRes.result.body.ok, true);
  assert.ok(Array.isArray(getValidPinRes.result.body.reports));
  assert.ok(getValidPinRes.result.body.reports.some((r) => r.id === reportId));

  // 6. PATCH tanpa PIN ditolak (401)
  const patchNoPinRes = makeMockRes();
  await feedbackHandler(
    {
      method: 'PATCH',
      body: { reportId, status: 'ditinjau' },
    },
    patchNoPinRes
  );
  assert.equal(patchNoPinRes.result.statusCode, 401);
  assert.equal(patchNoPinRes.result.body.ok, false);

  // 7. PATCH dengan PIN benar memperbarui status laporan
  const patchValidRes = makeMockRes();
  await feedbackHandler(
    {
      method: 'PATCH',
      body: { adminPin: '141317!@#', reportId, status: 'ditinjau' },
    },
    patchValidRes
  );
  assert.equal(patchValidRes.result.statusCode, 200);
  assert.equal(patchValidRes.result.body.ok, true);
  assert.equal(patchValidRes.result.body.report.status, 'ditinjau');

  // 8. DELETE tanpa PIN ditolak (401)
  const deleteNoPinRes = makeMockRes();
  await feedbackHandler(
    {
      method: 'DELETE',
      body: { reportId },
    },
    deleteNoPinRes
  );
  assert.equal(deleteNoPinRes.result.statusCode, 401);
  assert.equal(deleteNoPinRes.result.body.ok, false);

  // 9. DELETE dengan PIN benar menghapus laporan
  const deleteValidRes = makeMockRes();
  await feedbackHandler(
    {
      method: 'DELETE',
      body: { adminPin: '141317!@#', reportId },
    },
    deleteValidRes
  );
  assert.equal(deleteValidRes.result.statusCode, 200);
  assert.equal(deleteValidRes.result.body.ok, true);
  assert.equal(deleteValidRes.result.body.deleted, true);

  // 10. Verifikasi laporan sudah hilang dari list
  const verifyDeletedRes = makeMockRes();
  await feedbackHandler({ method: 'GET', query: { adminPin: '141317!@#' } }, verifyDeletedRes);
  assert.equal(
    verifyDeletedRes.result.body.reports.some((r) => r.id === reportId),
    false
  );
});

test('AUD-216: Feedback client service menangani kategori meta, offline-first storage fallback, dan AI markdown formatting', async () => {
  const feedbackService = loadTsModule('src/utils/feedbackService.ts');
  const {
    FEEDBACK_CATEGORY_META,
    FEEDBACK_CATEGORIES,
    STORAGE_KEY_OFFLINE_FEEDBACK,
    getOfflineFeedbackReports,
    saveOfflineFeedbackReports,
    clearOfflineFeedbackReports,
    addOfflineFeedbackReport,
    updateOfflineReportStatus,
    removeOfflineReport,
    submitFeedbackReport,
    formatReportsForAiMarkdown,
  } = feedbackService;

  // 1. Verifikasi konfigurasi kategori & label meta
  assert.equal(STORAGE_KEY_OFFLINE_FEEDBACK, 'asesmerdeka_offline_feedback_reports_v1');
  assert.equal(FEEDBACK_CATEGORIES.length, 5);
  assert.equal(FEEDBACK_CATEGORY_META.fitur_error.label, 'Fitur Error / Macet');
  assert.equal(FEEDBACK_CATEGORY_META.fitur_error.icon, '🚨');
  assert.equal(FEEDBACK_CATEGORY_META.data_dummy.label, 'Masih Ada Data Dummy');
  assert.equal(FEEDBACK_CATEGORY_META.data_dummy.icon, '🧩');
  assert.equal(FEEDBACK_CATEGORY_META.ui_tampilan.label, 'Tampilan / UI Kurang Pas');
  assert.equal(FEEDBACK_CATEGORY_META.ui_tampilan.icon, '📱');
  assert.equal(FEEDBACK_CATEGORY_META.unduh_dokumen.label, 'Masalah Unduh Word / ZIP');
  assert.equal(FEEDBACK_CATEGORY_META.unduh_dokumen.icon, '📄');
  assert.equal(FEEDBACK_CATEGORY_META.saran_fitur.label, 'Saran Fitur Baru');
  assert.equal(FEEDBACK_CATEGORY_META.saran_fitur.icon, '💡');

  // 2. Verifikasi offline storage handling
  clearOfflineFeedbackReports();
  assert.deepEqual(getOfflineFeedbackReports(), []);

  saveOfflineFeedbackReports([]);
  assert.deepEqual(getOfflineFeedbackReports(), []);

  const local1 = addOfflineFeedbackReport({
    category: 'fitur_error',
    description: 'Tombol simpan tidak merespons di Safari HP',
    contact: '0811223344',
    context: { activeTab: 'harian', kelas: '5', mapel: 'IPAS', deviceId: 'DEV-OFFLINE-01', isPro: true },
  });
  assert.ok(local1.id.startsWith('LOCAL-REP-'));
  assert.equal(local1.status, 'baru');
  assert.equal(getOfflineFeedbackReports().length, 1);

  // Update status lokal
  updateOfflineReportStatus(local1.id, 'ditinjau');
  assert.equal(getOfflineFeedbackReports()[0].status, 'ditinjau');

  // Hapus laporan lokal
  removeOfflineReport(local1.id);
  assert.deepEqual(getOfflineFeedbackReports(), []);

  // 3. Verifikasi validasi klien submitFeedbackReport
  const invalidRes = await submitFeedbackReport({
    category: '',
    description: '  ',
    context: {},
  });
  assert.equal(invalidRes.ok, false);
  assert.equal(invalidRes.message, 'Kategori dan deskripsi kendala wajib diisi.');

  // 4. Verifikasi offline fallback saat jaringan terputus (fetch gagal)
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error('Failed to fetch: No internet connection');
    };

    clearOfflineFeedbackReports();
    const offlineSubmitRes = await submitFeedbackReport({
      category: 'ui_tampilan',
      description: 'Tabel nilai meluber ke kanan di layar ponsel',
      contact: 'guru@sekolah.sch.id',
      context: {
        activeTab: 'rekap',
        jenjang: 'SMP',
        kelas: '8',
        mapel: 'Matematika',
        deviceId: 'HP-GURU-001',
        isPro: false,
      },
    });

    assert.equal(offlineSubmitRes.ok, true);
    assert.equal(
      offlineSubmitRes.message,
      'Laporan disimpan secara lokal (offline) dan akan disinkronkan saat terhubung kembali.'
    );
    assert.ok(offlineSubmitRes.report);
    assert.ok(offlineSubmitRes.report.id.startsWith('LOCAL-REP-'));
    assert.equal(getOfflineFeedbackReports().length, 1);
    assert.equal(getOfflineFeedbackReports()[0].category, 'ui_tampilan');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 5. Verifikasi format AI Markdown Generator
  const mockReports = [
    {
      id: 'REP-001',
      createdAt: '2026-11-08T08:00:00.000Z',
      category: 'fitur_error',
      description: 'Gagal mengekspor berkas Word modul ajar',
      contact: 'Pak Budi (0812345678)',
      context: {
        activeTab: 'perangkat',
        jenjang: 'SD',
        kelas: '4',
        mapel: 'Bahasa Indonesia',
        deviceId: 'DEV-TEST-001',
        isPro: true,
      },
      status: 'baru',
    },
    {
      id: 'REP-002',
      createdAt: '2026-11-08T08:15:00.000Z',
      category: 'data_dummy',
      description: 'Masih muncul nama siswa "Budi Santoso" padahal sudah import excel',
      contact: '',
      context: {
        activeTab: 'harian',
        jenjang: 'SMA',
        kelas: '10',
        mapel: 'Biologi',
        deviceId: 'DEV-TEST-002',
        isPro: false,
      },
      status: 'ditinjau',
    },
    {
      id: 'REP-003',
      createdAt: '2026-11-08T08:30:00.000Z',
      category: 'saran_fitur',
      description: 'Mohon tambahkan opsi cetak PDF langsung tanpa lewat Word',
      contact: 'Ibu Siti',
      context: {
        activeTab: 'rekap',
        jenjang: 'SMP',
        kelas: '7',
        mapel: 'Informatika',
        deviceId: 'DEV-TEST-003',
        isPro: true,
      },
      status: 'selesai',
    },
  ];

  const mdOutput = formatReportsForAiMarkdown(mockReports);

  // Periksa header & statistik
  assert.ok(mdOutput.includes('# 📋 Rangkuman Laporan Kendala Guru'));
  assert.ok(mdOutput.includes('Total Laporan:** 3'));
  assert.ok(mdOutput.includes('Baru: 1'));
  assert.ok(mdOutput.includes('Ditinjau: 1'));
  assert.ok(mdOutput.includes('Selesai: 1'));

  // Periksa seksi pengelompokan
  assert.ok(mdOutput.includes('## 🔴 Laporan Baru (Prioritas Perbaikan) (1)'));
  assert.ok(mdOutput.includes('## 🟡 Laporan Sedang Ditinjau (1)'));
  assert.ok(mdOutput.includes('## 🟢 Laporan Selesai Ditangani (1)'));

  // Periksa isi laporan 1 (Baru)
  assert.ok(mdOutput.includes('🚨 Fitur Error / Macet'));
  assert.ok(mdOutput.includes('REP-001'));
  assert.ok(mdOutput.includes('Tanggal / Waktu:** 2026-11-08T08:00:00.000Z'));
  assert.ok(mdOutput.includes('Halaman / Tab: perangkat'));
  assert.ok(mdOutput.includes('Mata Pelajaran: Bahasa Indonesia'));
  assert.ok(mdOutput.includes('Jenjang / Kelas: SD / 4'));
  assert.ok(mdOutput.includes('Device ID: DEV-TEST-001'));
  assert.ok(mdOutput.includes('Status Lisensi: Guru Pro'));
  assert.ok(mdOutput.includes('> Gagal mengekspor berkas Word modul ajar'));

  // Periksa isi laporan 2 (Ditinjau)
  assert.ok(mdOutput.includes('🧩 Masih Ada Data Dummy'));
  assert.ok(mdOutput.includes('REP-002'));
  assert.ok(mdOutput.includes('Status Lisensi: Free / Preview'));
  assert.ok(mdOutput.includes('> Masih muncul nama siswa "Budi Santoso"'));

  // Periksa laporan kosong
  const emptyMd = formatReportsForAiMarkdown([]);
  assert.ok(emptyMd.includes('Total Laporan:** 0'));
  assert.ok(emptyMd.includes('Tidak ada laporan kendala yang ditemukan.'));
});

test('AUD-217: Anti-Bypass Cetak PDF & Guarded Export Toast memblokir aksi unlicensed dan mencegah nama dummy di Jurnal', () => {
  globalThis.localStorage.clear();

  // 1. Unlicensed (Free tier) harus diblokir saat cetak PDF atau ekspor
  let dispatchedEvent = null;
  const previousWindow = globalThis.window;
  globalThis.window = {
    dispatchEvent: (evt) => {
      dispatchedEvent = evt;
      return true;
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  };

  try {
    const initial = licenseManager.getUserQuota();
    assert.equal(initial.tier, 'free');

    // requireActiveLicenseForAction harus return false & dispatch event
    const canPrintFree = licenseManager.requireActiveLicenseForAction('mencetak dokumen');
    assert.equal(canPrintFree, false);
    assert.ok(dispatchedEvent);
    assert.equal(dispatchedEvent.type, 'asesmerdeka:require-license');
    assert.ok(dispatchedEvent.detail?.message?.includes('mencetak dokumen'));

    // 2. Saat lisensi diaktifkan (Pro / Sekolah), requireActiveLicenseForAction return true
    const deviceId = licenseManager.getOrCreateDeviceId();
    const validCode = licenseManager.computeLicenseCodeForDevice(deviceId);
    const activated = licenseManager.activateLicense(validCode);
    assert.ok(activated.success);
    dispatchedEvent = null;
    const canPrintLicensed = licenseManager.requireActiveLicenseForAction('mencetak dokumen');
    assert.equal(canPrintLicensed, true);
    assert.equal(dispatchedEvent, null);

    // 3. Verifikasi generateDefaultJurnal tidak mengandung nama dummy bawaan
    const defaultJurnal = kelasHarianStorage.generateDefaultJurnal([], 8);
    assert.ok(Array.isArray(defaultJurnal));
    assert.equal(defaultJurnal.length, 8);
    for (const entry of defaultJurnal) {
      assert.equal(entry.siswaTidakHadir, 'Nihil (Semua Hadir)');
      assert.equal(entry.siswaTidakHadir.includes('Andika'), false);
      assert.equal(entry.siswaTidakHadir.includes('Dimas'), false);
    }
  } finally {
    globalThis.window = previousWindow;
  }
});

test('AUD-218: Endpoint /api/admin-portal mengamankan registri lisensi, mendukung pembuatan kode, status perangkat, reset kursi, dan hapus lisensi', async () => {
  const { default: adminHandler } = await import('../api/admin-portal.js');

  const makeMockRes = () => {
    const out = { statusCode: 200, headers: {}, body: null };
    return {
      setHeader(k, v) {
        out.headers[k] = v;
        return this;
      },
      status(code) {
        out.statusCode = code;
        return this;
      },
      json(payload) {
        out.body = payload;
        return this;
      },
      end() {
        return this;
      },
      get result() {
        return out;
      },
    };
  };

  // 1. Metode selain POST (misal GET) ditolak dengan status 405
  const getRes = makeMockRes();
  await adminHandler({ method: 'GET', body: {} }, getRes);
  assert.equal(getRes.result.statusCode, 405);
  assert.equal(getRes.result.body?.ok, false);

  // 2. Request tanpa adminPin atau dengan PIN salah ditolak dengan status 403
  const noPinRes = makeMockRes();
  await adminHandler({ method: 'POST', body: { action: 'auth' } }, noPinRes);
  assert.equal(noPinRes.result.statusCode, 403);
  assert.equal(noPinRes.result.body?.ok, false);

  const wrongPinRes = makeMockRes();
  await adminHandler({ method: 'POST', body: { adminPin: '999999', action: 'auth' } }, wrongPinRes);
  assert.equal(wrongPinRes.result.statusCode, 403);
  assert.equal(wrongPinRes.result.body?.ok, false);

  // 3. Action 'auth' dengan PIN valid ('141317!@#') berhasil
  const authRes = makeMockRes();
  await adminHandler({ method: 'POST', body: { adminPin: '141317!@#', action: 'auth' } }, authRes);
  assert.equal(authRes.result.statusCode, 200);
  assert.equal(authRes.result.body?.ok, true);

  // 4. Action 'create_license' membuat kode lisensi baru dengan label pembeli
  const createRes = makeMockRes();
  await adminHandler(
    {
      method: 'POST',
      body: {
        adminPin: '141317!@#',
        action: 'create_license',
        planType: 'individu',
        label: 'Bu Rina SDN 1 Merdeka',
        count: 1,
      },
    },
    createRes
  );
  assert.equal(createRes.result.statusCode, 200);
  assert.equal(createRes.result.body?.ok, true);
  assert.ok(Array.isArray(createRes.result.body?.created));
  assert.equal(createRes.result.body.created.length, 1);
  const createdItem = createRes.result.body.created[0];
  assert.match(createdItem.code, /^ASM-GM26-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(createdItem.label, 'Bu Rina SDN 1 Merdeka');
  assert.equal(createdItem.maxSeats, 2);
  assert.equal(createdItem.tier, 'guru');
  assert.equal(createdItem.status, 'belum_aktif');
  assert.equal(createdItem.usedSeats, 0);

  // 5. Action 'list_licenses' menampilkan lisensi yang dibuat
  const listRes1 = makeMockRes();
  await adminHandler(
    {
      method: 'POST',
      body: { adminPin: '141317!@#', action: 'list_licenses' },
    },
    listRes1
  );
  assert.equal(listRes1.result.statusCode, 200);
  assert.equal(listRes1.result.body?.ok, true);
  assert.ok(Array.isArray(listRes1.result.body?.licenses));
  const foundLicense = listRes1.result.body.licenses.find((l) => l.code === createdItem.code);
  assert.ok(foundLicense);
  assert.equal(foundLicense.label, 'Bu Rina SDN 1 Merdeka');
  assert.equal(foundLicense.status, 'belum_aktif');
  assert.equal(foundLicense.usedSeats, 0);
  assert.deepEqual(foundLicense.devices, []);

  // 6. Simulasikan perangkat mengklaim kursi (via activate-license handler)
  const activateHandler = (await import('../api/activate-license.js')).default;
  const actRes = makeMockRes();
  await activateHandler(
    {
      method: 'POST',
      body: { licenseCode: createdItem.code, deviceId: 'DEV-RINA-LAPTOP' },
    },
    actRes
  );
  assert.equal(actRes.result.statusCode, 200);
  assert.equal(actRes.result.body?.valid, true);

  // list_licenses sekarang menampilkan status 'aktif', usedSeats 1, dan devices berisi DEV-RINA-LAPTOP
  const listRes2 = makeMockRes();
  await adminHandler(
    {
      method: 'POST',
      body: { adminPin: '141317!@#', action: 'list_licenses' },
    },
    listRes2
  );
  assert.equal(listRes2.result.statusCode, 200);
  const activeLicense = listRes2.result.body.licenses.find((l) => l.code === createdItem.code);
  assert.ok(activeLicense);
  assert.equal(activeLicense.status, 'aktif');
  assert.equal(activeLicense.usedSeats, 1);
  assert.ok(activeLicense.devices.includes('DEV-RINA-LAPTOP'));

  // 7. Action 'reset_license_seats' me-reset perangkat terkunci
  const resetRes = makeMockRes();
  await adminHandler(
    {
      method: 'POST',
      body: {
        adminPin: '141317!@#',
        action: 'reset_license_seats',
        licenseCode: createdItem.code,
      },
    },
    resetRes
  );
  assert.equal(resetRes.result.statusCode, 200);
  assert.equal(resetRes.result.body?.ok, true);

  // list_licenses setelah reset menunjukkan devices [] dan status 'belum_aktif'
  const listRes3 = makeMockRes();
  await adminHandler(
    {
      method: 'POST',
      body: { adminPin: '141317!@#', action: 'list_licenses' },
    },
    listRes3
  );
  assert.equal(listRes3.result.statusCode, 200);
  const resetLicense = listRes3.result.body.licenses.find((l) => l.code === createdItem.code);
  assert.ok(resetLicense);
  assert.equal(resetLicense.status, 'belum_aktif');
  assert.equal(resetLicense.usedSeats, 0);
  assert.deepEqual(resetLicense.devices, []);

  // 8. Action 'delete_license' menghapus lisensi dari registri
  const deleteRes = makeMockRes();
  await adminHandler(
    {
      method: 'POST',
      body: {
        adminPin: '141317!@#',
        action: 'delete_license',
        licenseCode: createdItem.code,
      },
    },
    deleteRes
  );
  assert.equal(deleteRes.result.statusCode, 200);
  assert.equal(deleteRes.result.body?.ok, true);

  // list_licenses memastikan lisensi telah terhapus
  const listRes4 = makeMockRes();
  await adminHandler(
    {
      method: 'POST',
      body: { adminPin: '141317!@#', action: 'list_licenses' },
    },
    listRes4
  );
  assert.equal(listRes4.result.statusCode, 200);
  assert.equal(listRes4.result.body.licenses.some((l) => l.code === createdItem.code), false);
});

test('AUD-219: Client service adminService mengelola sesi, registri lisensi, enrich kursi, dan fallback offline', async () => {
  const adminTypes = loadTsModule('src/types/admin.ts');
  const adminService = loadTsModule('src/utils/adminService.ts');

  // 1. Verifikasi tipe dan metadata paket
  assert.ok(adminTypes.ADMIN_PLAN_META);
  assert.equal(adminTypes.ADMIN_PLAN_META.individu.defaultMaxSeats, 2);
  assert.equal(adminTypes.ADMIN_PLAN_META.individu.prefix, 'GM26');
  assert.equal(adminTypes.ADMIN_PLAN_META.solo.defaultMaxSeats, 1);
  assert.equal(adminTypes.ADMIN_PLAN_META.solo.prefix, 'SL26');
  assert.equal(adminTypes.ADMIN_PLAN_META.sekolah.defaultMaxSeats, 25);
  assert.equal(adminTypes.ADMIN_PLAN_META.sekolah.prefix, 'SK26');
  assert.equal(adminTypes.ADMIN_PLAN_META.pro.defaultMaxSeats, 2);
  assert.equal(adminTypes.ADMIN_PLAN_META.pro.prefix, 'GP26');
  assert.equal(adminTypes.ADMIN_PLAN_META.sekolah_pro.defaultMaxSeats, 25);
  assert.equal(adminTypes.ADMIN_PLAN_META.sekolah_pro.prefix, 'SP26');
  assert.equal(adminTypes.ADMIN_PLANS.length, 5);

  // 2. Session PIN storage
  adminService.clearAdminSessionPin();
  assert.equal(adminService.getAdminSessionPin(), '');
  adminService.saveAdminSessionPin('141317!@#');
  assert.equal(adminService.getAdminSessionPin(), '141317!@#');
  adminService.clearAdminSessionPin();
  assert.equal(adminService.getAdminSessionPin(), '');

  // 3. Verifikasi sesi admin (verifyAdminSession)
  const emptyVerify = await adminService.verifyAdminSession('');
  assert.equal(emptyVerify.ok, false);

  const wrongVerify = await adminService.verifyAdminSession('000000');
  assert.equal(wrongVerify.ok, false);

  const validVerify = await adminService.verifyAdminSession('141317!@#');
  assert.equal(validVerify.ok, true);

  // 4. Pembuatan lisensi (createAdminLicense)
  // Menolak jika PIN salah
  const rejectCreate = await adminService.createAdminLicense('000000', {
    planType: 'individu',
    label: 'Pak Joko',
  });
  assert.equal(rejectCreate.ok, false);

  // Bersihkan penyimpanan lisensi lokal sebelum pengujian
  adminService.clearStoredAdminLicenses();
  assert.equal(adminService.getStoredAdminLicenses().length, 0);

  // Buat lisensi baru dengan PIN valid
  const createRes = await adminService.createAdminLicense('141317!@#', {
    planType: 'individu',
    label: 'Ibu Ratna - SDN 01 Merdeka',
    count: 1,
    customMaxSeats: 2,
  });
  assert.equal(createRes.ok, true);
  assert.ok(Array.isArray(createRes.created));
  assert.equal(createRes.created.length, 1);
  const createdLic = createRes.created[0];
  assert.ok(createdLic.code.startsWith('ASM-GM26-'));
  assert.equal(createdLic.label, 'Ibu Ratna - SDN 01 Merdeka');
  assert.equal(createdLic.maxSeats, 2);
  assert.equal(createdLic.status, 'belum_aktif');
  assert.equal(createdLic.usedSeats, 0);

  // Verifikasi kode lisensi yang dibuat valid menurut licenseManager
  assert.equal(licenseManager.isValidLicenseCode(createdLic.code, 'DEV-RATNA-HP'), true);

  // 5. Mengambil daftar lisensi (fetchAdminLicenses)
  const fetchRes = await adminService.fetchAdminLicenses('141317!@#');
  assert.equal(fetchRes.ok, true);
  assert.ok(Array.isArray(fetchRes.licenses));
  const found = fetchRes.licenses.find((l) => l.code === createdLic.code);
  assert.ok(found);
  assert.equal(found.status, 'belum_aktif');
  assert.equal(found.usedSeats, 0);

  // 6. Simulasikan penguncian perangkat (klaim kursi oleh guru)
  const claimRes = licenseManager.checkAndClaimLicenseSeat(createdLic.code, 'DEV-RATNA-LAPTOP');
  assert.equal(claimRes.allowed, true);
  assert.equal(claimRes.usedSeats, 1);

  // Ambil ulang lisensi: status sekarang harus 'aktif', usedSeats 1, dan devices mencatat 'DEV-RATNA-LAPTOP'
  const fetchActive = await adminService.fetchAdminLicenses('141317!@#');
  assert.equal(fetchActive.ok, true);
  const activeFound = fetchActive.licenses.find((l) => l.code === createdLic.code);
  assert.ok(activeFound);
  assert.equal(activeFound.status, 'aktif');
  assert.equal(activeFound.usedSeats, 1);
  assert.ok(activeFound.devices.includes('DEV-RATNA-LAPTOP'));

  // 7. Reset kursi perangkat (resetAdminLicenseSeats)
  const wrongReset = await adminService.resetAdminLicenseSeats('000000', createdLic.code);
  assert.equal(wrongReset.ok, false);

  const resetRes = await adminService.resetAdminLicenseSeats('141317!@#', createdLic.code);
  assert.equal(resetRes.ok, true);

  // Setelah reset: status kembali 'belum_aktif', usedSeats 0, devices kosong
  const fetchAfterReset = await adminService.fetchAdminLicenses('141317!@#');
  const resetFound = fetchAfterReset.licenses.find((l) => l.code === createdLic.code);
  assert.ok(resetFound);
  assert.equal(resetFound.status, 'belum_aktif');
  assert.equal(resetFound.usedSeats, 0);
  assert.deepEqual(resetFound.devices, []);

  // 8. Hapus lisensi (deleteAdminLicense)
  const wrongDelete = await adminService.deleteAdminLicense('000000', createdLic.code);
  assert.equal(wrongDelete.ok, false);

  const deleteRes = await adminService.deleteAdminLicense('141317!@#', createdLic.code);
  assert.equal(deleteRes.ok, true);

  // Pastikan lisensi sudah tidak ada di registri
  const fetchAfterDelete = await adminService.fetchAdminLicenses('141317!@#');
  assert.equal(fetchAfterDelete.licenses.some((l) => l.code === createdLic.code), false);
});













