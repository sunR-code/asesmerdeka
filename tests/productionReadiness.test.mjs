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

test('AUD-002: Kuota uji coba awal pengguna Free adalah 3 kredit (sekali pakai) dan deduct/refund bekerja akurat', () => {
  globalThis.localStorage.clear();

  const initial = licenseManager.getUserQuota();
  assert.equal(initial.tier, 'free');
  assert.equal(initial.remainingCredits, 3);
  assert.equal(initial.maxCredits, 3);

  const deducted = licenseManager.deductQuota();
  assert.equal(deducted.success, true);
  assert.equal(deducted.quota.remainingCredits, 2);

  const refunded = licenseManager.refundQuota();
  assert.equal(refunded.remainingCredits, 3);
});

test('AUD-002: Manipulasi tier="pro" di localStorage tanpa signature valid ditolak (Anti-Bypass)', () => {
  globalThis.localStorage.clear();

  const quota = licenseManager.getUserQuota();
  licenseManager.deductQuota(); // sisa 2

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
  assert.equal(verified.remainingCredits, 2, 'Sisa kredit uji coba harus tetap 2, bukan di-reset ke 3');
});

test('AUD-002: Menghapus asesmerdeka_user_quota setelah 3 kuota uji coba habis tidak me-reset kuota', () => {
  globalThis.localStorage.clear();

  for (let i = 0; i < 3; i++) {
    const res = licenseManager.deductQuota();
    assert.equal(res.success, true);
  }

  const exhausted = licenseManager.deductQuota();
  assert.equal(exhausted.success, false);
  assert.equal(exhausted.quota.remainingCredits, 0);

  // Simulasi pengguna menghapus key kuota utama untuk mencoba reset ke 3
  globalThis.localStorage.removeItem('asesmerdeka_user_quota');
  globalThis.localStorage.removeItem('asesmerdeka_quota_sig');

  const afterDelete = licenseManager.getUserQuota();
  assert.equal(afterDelete.remainingCredits, 0, 'Kuota uji coba tidak boleh kembali ke 3');
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
  const oldKey = 'asesmerdeka_harian_SMP_Negeri_1_Merdeka_Belajar_Matematika_8_VIII_A_sem1';
  globalThis.localStorage.setItem(oldKey, JSON.stringify({ marker: 'DATA_PRESENSI_PENTING' }));

  const updatedProfile = {
    ...initialProfile,
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
  assert.equal(sourceCode.includes('202688'), false, 'PIN Admin tidak boleh tertulis plaintext di licenseManager.ts');

  assert.equal(licenseManager.verifyAdminKeygenPin('000000'), false);
  assert.equal(licenseManager.verifyAdminKeygenPin('123456'), false);
  assert.equal(licenseManager.verifyAdminKeygenPin('202688'), true);
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





