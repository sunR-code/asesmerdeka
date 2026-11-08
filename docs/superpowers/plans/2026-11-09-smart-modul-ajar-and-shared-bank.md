# Smart Modul Ajar AI & Bank Referensi Kurikulum Bersama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghadirkan generator AI berbasis Gemini untuk Modul Ajar (RPP Kurikulum Merdeka) yang kaya skenario kontekstual dan terintegrasi dengan Bank Referensi Kurikulum Bersama di Cloud Redis (0 detik waktu tunggu untuk referensi komunitas, privasi Zero PII, dan tombol berbagi sukarela).

**Architecture:** Backend Serverless `/api/shared-curriculum` mengelola pembacaan dan penyimpanan dokumen kurikulum anonim di Upstash Redis berbasis kunci komposit `{jenjang}_{kelas}_{mapelSlug}_{tpKode}_{materiSlug}_{model}`. Frontend service `sharedCurriculumService.ts` mengelola cache lokal, generator `modulAjarAiService.ts` memanggil Gemini API dengan skema terstruktur 5 model pembelajaran, dan `ModulAjarViewer.tsx` menyediakan bilah kustomisasi AI, tombol berbagi, serta kanvas pengeditan langsung sebelum diunduh ke Word atau dicetak.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node.js Test Runner, Upstash Redis REST API, Google Gemini 2.5 Flash / 1.5 Pro via Serverless API (`/api/gemini`), docx 9.

**Spec:** `docs/superpowers/specs/2026-11-09-smart-modul-ajar-and-shared-bank-design.md`

## Global Constraints

- Upstash Redis REST API kompatibel via `process.env.UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`.
- Zero PII Leakage: Data nama sekolah, nama guru, NIP, alamat sekolah, atau kontak wajib dihapus sebelum disimpan ke Cloud Shared Bank.
- Zero Crash Offline Fallback: Jika offline atau Redis tidak terkonfigurasi, sistem wajib jatuh tempo ke draf terstruktur lokal tanpa error.
- All 27 existing tests in `tests/productionReadiness.test.mjs` must remain passing, plus new AUD-222 test suite.
- 0 Oxlint warnings (`npx oxlint --deny-warnings`) dan clean Vite build (`npm run build`).

## Review Focus

1. **Collision Protection:** Pastikan kunci komposit `{jenjang}_{kelas}_{mapelSlug}_{tpKode}_{materiSlug}_{model}` membedakan materi Kelas 7 vs Kelas 8 dengan kode TP yang sama.
2. **PII Sanitization:** Pastikan payload yang dikirim ke Redis tidak mengandung `namaSekolah`, `namaGuru`, `nip`, `alamatSekolah`, atau data privat lainnya.
3. **Local Hydration:** Pastikan saat dokumen ditarik dari Redis, Kop Surat, nama sekolah, nama guru, dan NIP langsung diisi dengan profil guru yang sedang aktif di perangkat lokal.
4. **Vandalism / Malformed Payload Rejection:** Pastikan endpoint `/api/shared-curriculum` menolak draf kosong, teks rusak, atau tanpa pertanyaan pemantik/langkah inti.
5. **License Check for Publishing:** Pastikan hanya pengguna dengan kode lisensi resmi yang diizinkan mempublikasikan draf ke Bank Bersama.

---

### Task 1: Backend Serverless API untuk Bank Kurikulum Bersama (`api/shared-curriculum.js`)

**Files:**
- Create: `api/shared-curriculum.js`
- Test: `tests/productionReadiness.test.mjs`

**Interfaces:**
- Consumes: `getRedisCredentials()` from `api/activate-license.js`, `isValidLicenseCode` logic from license manager.
- Produces: `handler(req, res)` handling `GET` and `POST` for shared curriculum modules.

- [ ] **Step 1: Write the failing test for AUD-222 in `tests/productionReadiness.test.mjs`**

```javascript
test('AUD-222: Serverless /api/shared-curriculum mengelola Bank Referensi Modul Ajar & LKPD, membersihkan PII, dan menolak draf rusak', async () => {
  const { default: sharedHandler, buildSharedCurriculumKey, sanitizeCurriculumForSharing } = await import('../api/shared-curriculum.js');

  const makeMockRes = () => {
    const out = { statusCode: 200, headers: {}, body: null };
    return {
      setHeader(k, v) { out.headers[k] = v; return this; },
      status(code) { out.statusCode = code; return this; },
      json(payload) { out.body = payload; return this; },
      end() { return this; },
      get result() { return out; },
    };
  };

  // 1. Uji sanitasi Zero PII
  const rawDoc = {
    namaSekolah: 'SMP Negeri 1 Merdeka',
    namaGuru: 'Budi Santoso, S.Pd.',
    nip: '198501012010011001',
    materiPokok: 'Teorema Pythagoras',
    pemahamanBermakna: 'Memahami hubungan sisi segitiga siku-siku dalam arsitektur.',
    pertanyaanPemantik: ['Bagaimana tukang bangunan memastikan sudut siku?'],
  };
  const sanitized = sanitizeCurriculumForSharing(rawDoc);
  assert.equal(sanitized.namaSekolah, undefined);
  assert.equal(sanitized.namaGuru, undefined);
  assert.equal(sanitized.nip, undefined);
  assert.equal(sanitized.materiPokok, 'Teorema Pythagoras');

  // 2. Uji pembentukan kunci komposit
  const key = buildSharedCurriculumKey({
    type: 'modul_ajar',
    jenjang: 'SMP',
    kelas: '8',
    mapel: 'Matematika',
    tpKode: '8.1',
    materiPokok: 'Teorema Pythagoras',
    model: 'pbl',
  });
  assert.equal(key, 'asesmerdeka:shared:modul_ajar:smp:8:matematika:8-1:teorema-pythagoras:pbl');

  // 3. POST draf modul ajar baru
  const postRes = makeMockRes();
  await sharedHandler(
    {
      method: 'POST',
      body: {
        type: 'modul_ajar',
        jenjang: 'SMP',
        kelas: '8',
        mapel: 'Matematika',
        tpKode: '8.1',
        materiPokok: 'Teorema Pythagoras',
        model: 'pbl',
        licenseCode: 'ASM-GM26-V9SN-QR2U-136V',
        data: {
          materiPokok: 'Teorema Pythagoras',
          pemahamanBermakna: 'Memahami hubungan kuadrat sisi miring segitiga siku-siku.',
          pertanyaanPemantik: ['Apa yang terjadi jika tangga disandarkan terlalu miring?'],
          langkahPembelajaran: [{ pertemuanKe: 1, inti: ['Penyelidikan masalah'] }],
        },
      },
    },
    postRes
  );
  assert.equal(postRes.result.statusCode, 200);
  assert.equal(postRes.result.body?.ok, true);

  // 4. GET draf yang baru disimpan
  const getRes = makeMockRes();
  await sharedHandler(
    {
      method: 'GET',
      query: {
        type: 'modul_ajar',
        jenjang: 'SMP',
        kelas: '8',
        mapel: 'Matematika',
        tpKode: '8.1',
        materiPokok: 'Teorema Pythagoras',
        model: 'pbl',
      },
    },
    getRes
  );
  assert.equal(getRes.result.statusCode, 200);
  assert.equal(getRes.result.body?.found, true);
  assert.equal(getRes.result.body?.data?.materiPokok, 'Teorema Pythagoras');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/productionReadiness.test.mjs`
Expected: FAIL with `Cannot find module '../api/shared-curriculum.js'`

- [ ] **Step 3: Implement `api/shared-curriculum.js`**

Implementasi fungsi:
- `slugify(str)`: normalisasi teks untuk pembentuk kunci.
- `buildSharedCurriculumKey({ type, jenjang, kelas, mapel, tpKode, materiPokok, model })`: menghasilkan string kunci Redis standar.
- `sanitizeCurriculumForSharing(doc)`: menghapus `namaSekolah`, `namaGuru`, `nip`, `alamatSekolah`, `kotaSekolah`, `tahunAjaran`, dsb.
- `handler(req, res)`:
  - GET: mengambil data dari Redis (atau memori lokal saat dev/test) dan mengembalikan `{ found: boolean, data?: any }`.
  - POST: memvalidasi parameter, membersihkan data PII, menyimpan ke Redis dengan kunci komposit, dan mengembalikan `{ ok: true, message: string }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/productionReadiness.test.mjs`
Expected: PASS all 28 tests.

- [ ] **Step 5: Commit**

```bash
git add api/shared-curriculum.js tests/productionReadiness.test.mjs
git commit -m "feat(api): add shared curriculum bank serverless endpoint with zero PII sanitization"
```

---

### Task 2: Client Service untuk Bank Kurikulum Bersama (`src/utils/sharedCurriculumService.ts`)

**Files:**
- Create: `src/utils/sharedCurriculumService.ts`
- Test: `tests/productionReadiness.test.mjs`

**Interfaces:**
- Consumes: `SchoolProfile` from `src/utils/schoolProfileStorage.ts`, `CustomTPItem`.
- Produces: `fetchSharedCurriculum()`, `publishSharedCurriculum()`, `hydrateSharedDocWithLocalProfile()`.

- [ ] **Step 1: Write test assertions in `tests/productionReadiness.test.mjs`**

Test client service:
- `hydrateSharedDocWithLocalProfile` menyuntikkan `activeProfile.namaSekolah`, `activeProfile.namaGuru`, `activeProfile.nip` ke modul referensi yang diunduh.
- `fetchSharedCurriculum` memeriksa `localStorage` terlebih dahulu sebelum memanggil API.

- [ ] **Step 2: Implement `src/utils/sharedCurriculumService.ts`**

Fitur:
- Fungsi `getSharedCacheKey(...)`
- Fungsi `fetchSharedCurriculum(...)`: memanggil `GET /api/shared-curriculum`, menyimpan ke cache lokal jika ditemukan.
- Fungsi `publishSharedCurriculum(...)`: memanggil `POST /api/shared-curriculum` dengan lisensi aktif.
- Fungsi `hydrateSharedDocWithLocalProfile(doc, profile)`: mengembalikan dokumen baru dengan identitas sekolah dan guru lokal yang sedang aktif.

- [ ] **Step 3: Run test to verify it passes**

Run: `node --test tests/productionReadiness.test.mjs`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/sharedCurriculumService.ts tests/productionReadiness.test.mjs
git commit -m "feat(service): add shared curriculum client service with local profile hydration"
```

---

### Task 3: Modul Ajar AI Generator Engine (`src/utils/modulAjarAiService.ts`)

**Files:**
- Create: `src/utils/modulAjarAiService.ts`
- Test: `tests/productionReadiness.test.mjs`

**Interfaces:**
- Consumes: `callGeminiStructuredJSON` from `src/services/geminiClient.ts`, `ModulAjarDokumen` type.
- Produces: `generateContextualModulAjarWithAI(tp, profile, modelPembelajaran, konteksLokal)`.

- [ ] **Step 1: Write test assertions for `modulAjarAiService`**

Memverifikasi builder prompt mencakup 5 model pembelajaran Kurikulum Merdeka (PBL, PjBL, Inkuiri, Diferensiasi, Kontekstual) dan memformat struktur JSON yang sesuai dengan `ModulAjarDokumen`.

- [ ] **Step 2: Implement `src/utils/modulAjarAiService.ts`**

Membangun prompt pedagogis yang kaya:
- Orientasi materi kontekstual.
- Pertanyaan pemantik HOTS (minimal 3 butir berbobot).
- Pemahaman bermakna mendalam yang aplikatif.
- Rangkaian kegiatan belajar dengan alokasi waktu dan sintaks model (Pendahuluan, Inti, Penutup).
- Rubrik asesmen formatif (Kriteria, Baru Berkembang, Layak, Cakap, Mahir).
- Fallback cerdas ke `buildSmartModulAjar` jika API gagal/offline.

- [ ] **Step 3: Run test to verify it passes**

Run: `node --test tests/productionReadiness.test.mjs`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/modulAjarAiService.ts tests/productionReadiness.test.mjs
git commit -m "feat(ai): implement smart modul ajar AI generator service with 5 pedagogical models"
```

---

### Task 4: Pembaruan UI & Kanvas Interaktif Modul Ajar (`src/components/ModulAjarViewer.tsx`)

**Files:**
- Modify: `src/components/ModulAjarViewer.tsx`
- Modify: `src/App.tsx` (passing callbacks/props jika diperlukan)

**Interfaces:**
- Consumes: `generateContextualModulAjarWithAI`, `fetchSharedCurriculum`, `publishSharedCurriculum`, `requireActiveLicenseForAction`.
- Produces: Interactive editable viewer with AI regeneration and community sharing.

- [ ] **Step 1: Tambahkan state dan kontrol di `ModulAjarViewer.tsx`**

1. Tambahkan state:
   - `selectedModel`: `'pbl' | 'pjbl' | 'inquiry' | 'diferensiasi' | 'kontekstual'` (default `'pbl'`).
   - `konteksInput`: string input konteks lokal.
   - `isGenerating`: boolean loading AI.
   - `isPublishing`: boolean loading share.
   - `isFromCommunity`: boolean jika dokumen dimuat dari Bank Bersama.
   - `editableDoc`: state lokal `ModulAjarDokumen` yang dapat diedit langsung.
2. Tambahkan Top Control Bar:
   - Select dropdown Model Pembelajaran.
   - Input teks *"Konteks / Isu Nyata (Opsional)"*.
   - Tombol *"✨ Buat dengan AI"*.
   - Tombol *"🤝 Bagikan ke Bank Referensi"*.
   - Banner apresiasi ringkas saat `isFromCommunity === true`:
     `Draf berikut adalah referensi guru lainnya • Siap disesuaikan`

- [ ] **Step 2: Ganti teks statis pada lembar cetak dengan `AutoExpandingTextarea`**

Ubah bagian:
- Pemahaman Bermakna
- Pertanyaan Pemantik
- Langkah Kegiatan Pendahuluan, Inti, dan Penutup
- Rencana Asesmen Formatif
Menjadi field input auto-expanding yang tersimpan otomatis di `localStorage` (`modul_ajar_<tpId>_<model>`), sehingga guru bebas mengetik dan memformat sesuai kebutuhan kelas mereka.

- [ ] **Step 3: Hubungkan tombol "Unduh Word (.docx)" dan "Cetak / PDF"**

Pastikan fungsi unduh Word `exportModulAjarToDocx` membaca state dokumen editan terbaru (`editableDoc`) lengkap dengan Kop Surat Sekolah.

- [ ] **Step 4: Run linter dan test visual**

Run: `npx oxlint "src/components/ModulAjarViewer.tsx" --deny-warnings`
Expected: 0 warnings, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ModulAjarViewer.tsx
git commit -m "feat(ui): add AI controls, community bank sharing, and inline text editing to ModulAjarViewer"
```

---

### Task 5: Verifikasi Menyeluruh, Audit Kesiapan, dan Build Produksi

**Files:**
- Test: `tests/productionReadiness.test.mjs`
- Build check: `npm run build`

- [ ] **Step 1: Jalankan seluruh test suite**

Run: `npm --prefix "C:\Users\fajar\.gemini\antigravity\scratch\asesmerdeka" test`
Expected: 28/28 tests PASS (AUD-002 s/d AUD-222).

- [ ] **Step 2: Jalankan Oxlint di seluruh direktori `src` dan `api`**

Run: `npx --prefix "C:\Users\fajar\.gemini\antigravity\scratch\asesmerdeka" oxlint "C:\Users\fajar\.gemini\antigravity\scratch\asesmerdeka\src" "C:\Users\fajar\.gemini\antigravity\scratch\asesmerdeka\api" --deny-warnings`
Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Jalankan Build Produksi Vite**

Run: `npm --prefix "C:\Users\fajar\.gemini\antigravity\scratch\asesmerdeka" run build`
Expected: Build sukses tanpa error TypeScript.

- [ ] **Step 4: Commit dan Push**

```bash
git add .
git commit -m "feat(modul-ajar): integrate smart AI generation and shared curriculum bank"
git push origin main
```
