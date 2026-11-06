# Mayar Model A License Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menuntaskan integrasi Model A (Mayar Payment Link + Verifikasi Lisensi Serverless) dengan penanganan transisi KYC Mayar belum aktif dan aktivasi kode cadangan offline 100% siap produksi.

**Architecture:** Frontend mengarahkan pembelian ke Payment Link resmi Mayar (Individu Rp 99.000 / Sekolah Rp 749.000). Aktivasi kode lisensi Mayar diverifikasi melalui fungsi serverless Vercel (`api/activate-license.js`) dengan pembatasan 2 perangkat (Individu) dan 25 perangkat (Sekolah). Jika `MAYAR_API_KEY` belum dipasang (karena KYC sedang ditinjau), sistem memberikan pesan panduan yang ramah dan tetap mengizinkan aktivasi kode offline (`PRO-MERDEKA-...`) tanpa hambatan.

**Tech Stack:** React 19, TypeScript, Vite, Node.js Test Runner (`node:test`), Vercel Serverless Functions.

**Spec:** Persetujuan short design Model A pada sesi diskusi 2026-11-06.

## Global Constraints

- Preserve existing business logic and all 13 passing unit tests.
- Zero secrets or API keys in frontend client bundle (`.env` vs Vercel server environment).
- Keep offline voucher codes (`PRO-MERDEKA-BIBI...`) working 100% offline without network requirement.
- All user-facing error and status messages in polite, professional Bahasa Indonesia.

## Review Focus

- **MAYAR_API_KEY belum terpasang (KYC Pending):** Ketika guru memasukkan kode Mayar sebelum KYC selesai, sistem memberikan panduan jelas, bukan error 500 crash yang membingungkan.
- **Deteksi Otomatis Paket:** Kode dari Produk Individu (`c1db962a...`) mendapatkan batas 2 perangkat; kode dari Produk Sekolah (`17cece7f...`) mendapatkan batas 25 perangkat.
- **Perangkat ke-3 (Individu) & Perangkat ke-26 (Sekolah) ditolak:** Mencegah kode diperjualbelikan ulang ke guru lain.
- **Kloning LocalStorage:** Dicegah melalui tanda tangan kriptografis `generateSignature` yang memvalidasi *Hardware Fingerprint*.
- **Offline Fallback:** Kode serial bertanda tangan lokal tetap valid meski tidak ada koneksi internet.

---

### Task 1: Respons Ramah Transisi KYC Pending pada Serverless Function

**Files:**
- Modify: `api/activate-license.js:20-30`
- Test: `tests/productionReadiness.test.mjs`

**Interfaces:**
- Consumes: `process.env.MAYAR_API_KEY`, `req.body.licenseCode`, `req.body.deviceId`
- Produces: JSON response `{ valid: false, message: string, kycPending: true }` saat API key belum ada

- [ ] **Step 1: Tulis unit test untuk verifikasi penanganan ketiadaan MAYAR_API_KEY**

```javascript
test('AUD-208: Serverless API menangani ketiadaan MAYAR_API_KEY dengan pesan ramah panduan KYC', async () => {
  const handlerMod = await import('../api/activate-license.js');
  const handler = handlerMod.default;

  const prevKey = process.env.MAYAR_API_KEY;
  delete process.env.MAYAR_API_KEY;

  let statusCode = 200;
  let responseData = null;
  const req = {
    method: 'POST',
    body: { licenseCode: 'TEST-CODE', deviceId: 'DEV-TEST' }
  };
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
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
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `node --test tests/productionReadiness.test.mjs`
Expected: FAIL dengan `statusCode` 500 bukan 503 dan belum ada properti `kycPending: true`.

- [ ] **Step 3: Perbarui `api/activate-license.js`**

Perbarui respon ketiadaan `MAYAR_API_KEY` menjadi HTTP 503 dengan pesan panduan ramah bahwa akun Mayar sedang dalam tahap verifikasi KYC.

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `node --test tests/productionReadiness.test.mjs`
Expected: PASS (14 tests pass)

---

### Task 2: Penyempurnaan Tampilan Panduan Aktivasi & Status KYC di Frontend

**Files:**
- Modify: `src/components/LicenseModal.tsx`
- Modify: `src/utils/licenseManager.ts`

**Interfaces:**
- Consumes: Respon dari `/api/activate-license`
- Produces: Banner status informatif di modal aktivasi jika guru memasukkan kode saat KYC belum selesai

- [ ] **Step 1: Perbarui fungsi `verifyMayarLicenseOnline` di `src/utils/licenseManager.ts`**

Pastikan pesan dari respon `kycPending` diteruskan ke antarmuka pengguna dengan panduan alternatif (hubungi Admin atau gunakan kode voucher Bibi).

- [ ] **Step 2: Jalankan linter dan test regresi**

Run: `npm test && npm run lint`
Expected: PASS 14 tests, 0 warnings, 0 errors.

---

### Task 3: Verifikasi Build dan Pengemasan Deployment Vercel

**Files:**
- Modify: `vercel.json`
- Test: `npm run build`

**Interfaces:**
- Consumes: Seluruh modul frontend dan backend serverless
- Produces: Artefak `dist/` dan routing Vercel yang siap rilis

- [ ] **Step 1: Jalankan kompilasi TypeScript dan bundler Vite**

Run: `npm run build`
Expected: Build sukses, bundle size di bawah 220 kB untuk chunk utama, file routing `vercel.json` valid.

- [ ] **Step 2: Jalankan linting menyeluruh**

Run: `npm run lint`
Expected: 0 warnings, 0 errors.

