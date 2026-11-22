# Task 13.3 — Mayar Retirement Release Readiness & Checklist

- **Tanggal:** 2026-11-22
- **Branch Aktif:** `staging` (`HEAD: 911ddac315527733716a6c4eceb48279061fc26e`, uncommitted)
- **Baseline `main` / `origin/main`:** `b5072c7a7409f7e36008b66956c24536642566af` *(tidak berubah / tidak tersentuh)*
- **Task 13.2 Verification Status:** **`PASS`**
- **Production Payment Status:** **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`**
- **Production Redis Inspection Status:** **`NOT INDEPENDENTLY VERIFIED`** *(Production Upstash Redis tidak di-scan secara independen)*
- **Historical Records Status:** **100% PRESERVED** *(tidak ada penghapusan `asesmerdeka:mayar:*`, `asesmerdeka:seats:v1:*`, maupun 135 official seeds)*
- **Final Verdict:** **`READY FOR STAGING PREVIEW`**

---

## 1. Status Bisnis vs Status Teknis Redis Production (Pembedaan Eksplisit)

1. **Konfirmasi Pemilik Proyek — `OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`:**
   - Pemilik proyek telah mengonfirmasi secara eksplisit bahwa **tidak pernah ada pembayaran pelanggan yang selesai di Production**.
   - Konfirmasi ini menjadi bukti bisnis otoritatif bahwa tidak terdapat transaksi Mayar berbayar di Production yang memerlukan settlement finansial ataupun fulfillment lisensi tertunda sebelum pensiunnya endpoint Mayar.
2. **Batas Verifikasi Teknis Redis — `NOT INDEPENDENTLY VERIFIED`:**
   - Dari workspace lokal `staging`, **Production Upstash Redis (`upstash-kv-sky-fountain`, ID `2a5ff96e-1dbd-4e64-a576-fd2520a656f9`) tidak diakses dan tidak di-scan secara independen** (untuk menjaga isolasi keselamatan Production serta karena Console Data Browser memerlukan 2FA pemilik).
   - Dokumen ini tidak mengklaim bahwa key Redis Production telah diperiksa secara langsung.
3. **Pelestarian Data Historis:**
   - Tidak ada key Redis historis (`asesmerdeka:mayar:order:v1:*`, `tx:v1:*`, `event:v1:*`, `inv_idx:v1:*`, `reconcile_queue:v1`, `webhook_audit:v1`, `asesmerdeka:seats:v1:*`) yang dihapus atau diubah.

---

## 2. Final Diff Audit (Seluruh 23 File Termodifikasi + File Baru)

Audit ulang menyeluruh dilakukan terhadap seluruh working tree pada branch `staging` sebelum pembuatan laporan ini:

### A. Ringkasan Statistik File (`git diff --numstat`)

| # | File | `+` | `-` | Ruang Lingkup Audit Final |
|---|---|---|---|---|
| 1 | [`.env.example`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/.env.example) | +5 | -22 | Variabel `MAYAR_*`, `VITE_PAYMENT_LINK_*`, & `VITE_MAYAR_*` dinonaktifkan sebagai komentar `RETIRED`. |
| 2 | [`api/activate-license.js`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/api/activate-license.js) | +395 | -387 | `resolveMayarApiV2Config`/`createMayarInvoiceViaApi` retired (`410`); `create_payment_order` menolak Mayar (`410`); `parseValidPaymentAmount` (`Number.isFinite`); `ALLOWED_VERIFY_LIFECYCLE_STATES` & `validateSeatRecordLifecycle` memperketat legacy non-`ASM-*` secara fail-closed + `paymentUnverified`/`revoked`; `timingSafeEqualStrings`, locks, Lua CAS, dan baca historis tetap utuh. |
| 3 | [`api/cron/mayar-reconcile.js`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/api/cron/mayar-reconcile.js) | +35 | -112 | Tombstone permanen `HTTP 410 MAYAR_DECOMMISSIONED` + guard `GET`-only (`405`), tolak query secret (`401`), & constant-time `Bearer CRON_SECRET`. |
| 4 | [`api/diagnostics/staging-redis.js`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/api/diagnostics/staging-redis.js) | +1 | -1 | Memindahkan import `timingSafeEqualStrings` dari `mayar-webhook.js` ke `activate-license.js`. |
| 5 | [`api/mayar-webhook.js`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/api/mayar-webhook.js) | +43 | -2561 | Tombstone permanen `HTTP 410 MAYAR_DECOMMISSIONED` (`Cache-Control: no-store`), nol akses `MAYAR_*` env, nol fetch keluar, nol mutasi Redis; 0 file di `api/` mengimpor modul ini. |
| 6 | [`docs/LICENSE_ENVIRONMENT_ISOLATION.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/LICENSE_ENVIRONMENT_ISOLATION.md) | +1 | -1 | Pembaruan dokumentasi bahwa fallback & webhook Mayar dipensiunkan `410 Gone`. |
| 7 | [`docs/superpowers/plans/2026-11-06-mayar-model-a-license-integration.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/superpowers/plans/2026-11-06-mayar-model-a-license-integration.md) | +3 | -0 | Label `STATUS: RETIRED — HISTORICAL REFERENCE ONLY`. |
| 8 | [`docs/superpowers/specs/2026-11-08-admin-portal-design.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/superpowers/specs/2026-11-08-admin-portal-design.md) | +1 | -0 | Catatan `RETIRED — HISTORICAL REFERENCE ONLY` pada Tab 3 Mayar. |
| 9 | [`src/components/LicenseModal.tsx`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/components/LicenseModal.tsx) | +8 | -9 | Memakai `verifyLicenseOnline`, 0 kemunculan `mayar`, checkout WhatsApp Admin & pintasan `@admin` utuh. |
| 10 | [`src/components/admin/AdminSettingsTab.tsx`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/components/admin/AdminSettingsTab.tsx) | +29 | -115 | Menghapus konfigurasi Mayar, 0 kemunculan `mayar`, menampilkan status WhatsApp Admin Manual + arsitektur *Provider Adapter*. |
| 11 | [`src/utils/licenseManager.ts`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/utils/licenseManager.ts) | +31 | -38 | Alias `@deprecated verifyMayarLicenseOnline`, getter/setter Product ID Mayar inert (`''`/no-op), `STORAGE_KEY_VERIFIED_MAYAR_CODES` kompatibilitas historis utuh. |
| 12 | [`src/utils/paymentGateway.ts`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/utils/paymentGateway.ts) | +16 | -49 | `getMayarPaymentLink` = `''`, `saveMayarPaymentLinks` = no-op, `externalCheckoutUrl: undefined`, WhatsApp Admin (`wa.me/6282114625243`) & otoritas server zero-trust utuh. |
| 13 | [`vercel.json`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/vercel.json) | +1 | -1 | CSP bersih dari `https://api.mayar.id` & jadwal cron `/api/cron/mayar-reconcile` dihapus (0 referensi `mayar`). |
| 14 | [`vite.config.ts`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/vite.config.ts) | +0 | -1 | Dev middleware `/api/mayar-webhook` dihapus (0 referensi `mayar`). |
| 15–22 | 8 Suite Vitest Task 7 (`task7`, `task7_1`, `task7_1_1`, `task7_1_2`, `task7_1_2_1`, `task7_1_2_2`, `task7_1_3A`, `task7_1_3B_2`) | +826 | -3705 | Skenario webhook/cron Mayar dipensiunkan ke `410 Gone`; tes Payment Authority, seat concurrency (`worker_threads`), Redis outage `503`, diagnostik staging, & isolasi environment tetap utuh dan lulus. |
| 23 | [`tests/productionReadiness.test.mjs`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/tests/productionReadiness.test.mjs) | +102 | -103 | `AUD-207`, `AUD-208`, dan `AUD-220` menguji penolakan Mayar `410`/`400 LICENSE_NOT_FOUND` sekaligus keterbacaan record historis & aktivasi lisensi resmi (`30/30` lulus). |
| **Baru** | [`src/utils/__tests__/task13_mayarDecommissionRegression.test.ts`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/utils/__tests__/task13_mayarDecommissionRegression.test.ts) | — | — | `6/6` tes regresi decommission Mayar, WhatsApp Admin, UI SSR, & historical reads. |
| **Baru** | [`src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts) | — | — | `10/10` tes deterministik pemulihan `AMOUNT_MISMATCH` (`Number.isFinite`), `STALE_LOCK_FENCE`, `LOCK_CONTENTION_TIMEOUT`, legacy fallback allowlist + `check_status`, isolasi Staging/Production, & `timingSafeEqualStrings`. |
| **Baru/Update** | `docs/research/MAYAR_DECOMMISSION_REPORT.md`, `TASK_13_1_*.md`, `TASK_13_2_*.md`, `TASK_13_3_*.md` | — | — | Dokumentasi lengkap implementasi, review independen, regresi keamanan, dan release checklist. |

**Total 23 File Tracked:** `1595 insertions(+), 7377 deletions(-)`.

### B. Konfirmasi 8 Invarian Kritis

- [x] **Mayar tidak dapat membuat transaksi pembayaran baru:** `create_payment_order` (dengan flag/provider Mayar) mengembalikan `410 MAYAR_DECOMMISSIONED`, `createMayarInvoiceViaApi` stub retired, `getMayarPaymentLink` = `''`, `externalCheckoutUrl` = `undefined`, dan **0** pelanggaran URL `api.mayar.*`/`pay.mayar.*` ataupun `process.env.MAYAR_*` / `VITE_MAYAR_*` di seluruh file runtime & konfigurasi.
- [x] **Endpoint webhook & rekonsiliasi Mayar tetap tombstoned:** `/api/mayar-webhook` & `/api/cron/mayar-reconcile` membalas `HTTP 410 Gone` (`MAYAR_DECOMMISSIONED`, `Cache-Control: no-store`) dengan **0** mutasi Redis dan **0** outbound call.
- [x] **Generic license / payment authority tetap utuh:** Order generik, `verify_payment_order` (dengan `parseValidPaymentAmount` & `AMOUNT_MISMATCH`), `requirePaymentProof`, `withDistributedLock`, skrip Lua atomik CAS/fence, serta pembacaan key historis `asesmerdeka:mayar:*` berfungsi penuh.
- [x] **Checkout WhatsApp Admin utuh:** `buildAdminWhatsAppPurchaseUrl` (`https://wa.me/6282114625243?text=...`), UI `LicenseModal.tsx` (2 paket publik Rp 99.000 & Rp 749.000), serta `AdminSettingsTab.tsx` Card 1 siap digunakan.
- [x] **Semua 135 official seeds tidak berubah:** `git diff api/officialSeeds.js src/data/officialSeeds.ts` kosong (`0` perubahan); verifikasi langsung mengonfirmasi tepat `135` kode unik yang cocok 100% urutan dan himpunannya antara JS & TS.
- [x] **Legacy license fallback tetap fail-closed:** `ALLOWED_VERIFY_LIFECYCLE_STATES` hanya menerima `'paid'` dan `'active'`; menolak `revoked`, `suspended`, `pending_reconciliation`, `settling`, `pending_payment`, `payment_failed`, `expired` (termasuk tanpa/dengan `expiresAt` invalid), state tak dikenal, dan record tanpa `lifecycleState` (kecuali didukung bukti bayar sah `verifyLegacySeatPaymentAuthority`), disertai flag `paymentUnverified` dan `revoked` pada `403`.
- [x] **Isolasi environment tetap utuh:** Production menolak `ASM-STG2-*` & record bertanda `environment: 'staging'`; Preview Staging menolak kode Production & legacy non-`ASM-*`.
- [x] **Tidak ada perilaku tak diinginkan yang masuk:** Diverifikasi oleh seluruh `48/48` file Vitest (`402/402`), `30/30` `npm test`, `tsc -b`, `oxlint`, dan `vite build`.

---

## 3. Hasil Final Verification (Eksekusi Segar Task 13.3)

| Pemeriksaan | Perintah | Hasil | Output Teramati Eksak |
|---|---|---|---|
| **Vitest Full Suite** | `npx vitest run` | **PASS** | `Test Files 48 passed (48)`, `Tests 402 passed (402)`, durasi `13.55s`, exit code `0` |
| **Production Readiness Suite** | `npm test` (`node --test tests/productionReadiness.test.mjs`) | **PASS** | `tests 30`, `pass 30`, `fail 0`, `skipped 0`, durasi `2280.66ms` (`2.28s`), exit code `0` |
| **TypeScript Build Check** | `npx tsc -b` | **PASS** | `0 errors`, exit code `0` |
| **Linter** | `npm run lint` (`oxlint`) | **PASS** | `Found 0 warnings and 0 errors` (`203 files`, `114 rules`, `335ms`), exit code `0` |
| **Production Bundle Build** | `npm run build` (`tsc -b && vite build`) | **PASS** | `2501 modules transformed`, `✓ built in 1.04s`, exit code `0` |

---

## 4. Release Preparation Checklist (Belum Dieksekusi — Menunggu Otorisasi Pemilik)

> [!IMPORTANT]
> Seluruh langkah di bawah ini bersifat rencana rilis bertahap dan **belum ada satu pun yang dijalankan** (`git commit`, `git push`, `merge` ke `main`, deploy, maupun perubahan Vercel/Production tidak dilakukan pada Task 13.3).

### Tahap 1 — Commit, Push `staging`, & Validasi Staging Preview (Saat Pemilik Siap Menguji Preview)
- [ ] Review diff lokal sekali lagi (`git status -sb`, `git diff --stat`) oleh pemilik proyek sebelum commit ke `staging`.
- [ ] Commit perubahan pada branch `staging` (JANGAN menyentuh `main`) dan `git push origin staging`.
- [ ] Pastikan deployment Preview Vercel terbit dari branch `staging` (`asesmerdeka-git-staging-*.vercel.app`).
- [ ] Uji manual UI pada Staging Preview:
  - Buka modal lisensi -> pastikan hanya tampil 2 paket utama (**Lisensi Guru Mandiri Rp 99.000** & **Lisensi Kolektif Sekolah Rp 749.000**) tanpa tulisan/tautan Mayar.
  - Klik beli/info paket -> pastikan modal mengarahkan ke **WhatsApp Admin** (`wa.me/6282114625243`).
  - Buka `@admin` -> Tab Pengaturan -> pastikan tidak ada input URL/Product ID Mayar dan hanya tampil *1. Kanal Pembelian Lisensi Aktif (WhatsApp Admin Manual)*, *2. Device Seat Binding*, & *3. Cloud Seat Tracker*.
  - Terbitkan dan aktifkan kode `ASM-STG2-*` di Staging Preview -> verifikasi aktivasi & Cloud Sync berfungsi normal, dan uji bahwa kode Production ditolak `403 PRODUCTION_LICENSE_FORBIDDEN_IN_PREVIEW`.

### Tahap 2 — Konfirmasi Runtime Decommission Mayar pada Staging Preview
- [ ] Verifikasi `GET` dan `POST` ke `https://<staging-preview-domain>/api/mayar-webhook` mengembalikan `HTTP 410 Gone` (`reason: "MAYAR_DECOMMISSIONED"`, header `Cache-Control: no-store`).
- [ ] Verifikasi `GET https://<staging-preview-domain>/api/cron/mayar-reconcile` (dengan `Authorization: Bearer <CRON_SECRET>`) mengembalikan `HTTP 410 Gone` (`MAYAR_DECOMMISSIONED`), dan permintaan dengan `?secret=...` ditolak `HTTP 401 QUERY_SECRET_FORBIDDEN`.
- [ ] Verifikasi `POST /api/activate-license` dengan `{ "action": "create_payment_order", "planId": "pro_individu", "provider": "mayar" }` mengembalikan `HTTP 410 Gone`.
- [ ] Periksa header CSP (`Content-Security-Policy`) & Chrome DevTools Network tab pada Staging Preview: pastikan `https://api.mayar.id` sudah tidak ada di CSP dan **0** request jaringan menuju domain Mayar.

### Tahap 3 — Konfirmasi Pelestarian Data Historis & Attestasi Production
- [ ] Verifikasi di Admin Portal Staging (dan kelak Production) bahwa seluruh **135 kode seeded resmi** tetap terbaca di tab Daftar Lisensi.
- [ ] Pastikan kebijakan preservasi data dipatuhi: **tidak ada** `DEL` atau `FLUSH` pada key `asesmerdeka:mayar:*` maupun `asesmerdeka:seats:v1:*` di Staging maupun Production.
- [ ] Dokumentasikan status Production Data Gate untuk rilis:
  - Status bisnis pembayaran: **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`**.
  - Status inspeksi teknis Redis Production: **`NOT INDEPENDENTLY VERIFIED`** *(opsional: bila pemilik ingin verifikasi tambahan dua lapis sebelum cutover Production, ikuti prosedur READ-ONLY `SCAN 0 MATCH asesmerdeka:mayar:order:v1:* COUNT 100` & `GET asesmerdeka:mayar:reconcile_queue:v1` pada [`TASK_13_1_MAYAR_DECOMMISSION_REVIEW.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/research/TASK_13_1_MAYAR_DECOMMISSION_REVIEW.md) Bagian D)*.

### Tahap 4 — Promosi Branch `main` (Setelah Tahap 1–3 Lulus & Mendapat Persetujuan Eksplisit Pemilik)
- [ ] Verifikasi git preflight sebelum promosi:
  - `git fetch origin`
  - `git merge-base --is-ancestor origin/main origin/staging`
  - Pastikan `origin/main` masih berada pada baseline yang disetujui (`b5072c7a7409f7e36008b66956c24536642566af`).
- [ ] Lakukan promosi **FAST-FORWARD ONLY** (`git checkout main`, `git merge --ff-only origin/staging`, `git push origin main`).
- [ ] Dilarang squash merge, rebase, atau force push.
- [ ] Verifikasi Vercel Production selesai mem-build commit `main` baru tanpa error dan seluruh `/api/*` cron jobs hanya menyertakan job aktif (tanpa `/api/cron/mayar-reconcile`).

### Tahap 5 — Production Smoke Test (READ-ONLY)
- [ ] Buka domain Production resmi dan verifikasi build hash / deployment aktif sesuai commit promosi `main`.
- [ ] Uji READ-ONLY UI: hanya 2 paket lisensi tampil, modal pembelian mengarah ke WhatsApp Admin (`wa.me/6282114625243`), tidak ada referensi Mayar di UI maupun Network requests, CSP bebas `api.mayar.id`.
- [ ] Uji read-only endpoint tombstone: `/api/mayar-webhook` mengembalikan `HTTP 410` (`MAYAR_DECOMMISSIONED`).
- [ ] Uji batas environment: kode `ASM-STG2-*` ditolak `HTTP 403` pada Production (`STAGING_LICENSE_FORBIDDEN_IN_PRODUCTION`), dan kode Non-`ASM` acak ditolak bersih `HTTP 400 LICENSE_NOT_FOUND` (tanpa menulis data uji ke Redis Production).

### Tahap 6 — Pembersihan Environment Variables Mayar di Vercel Production (Pasca-Rilis Stabil)
- [ ] **Baru dikerjakan SETELAH Tahap 5 Smoke Test Production berhasil 100%:** buka Vercel Dashboard -> Settings -> Environment Variables (scope Production & Preview), hapus variabel Mayar usang:
  - `MAYAR_API_KEY`, `MAYAR_WEBHOOK_SECRET`, `MAYAR_WEBHOOK_SECRET_PREVIOUS`, `MAYAR_API_BASE_URL`, `MAYAR_SANDBOX`, `MAYAR_ENV`, `MAYAR_API_TIMEOUT_MS`, `MAYAR_PRODUCT_ID`, `MAYAR_SCHOOL_PRODUCT_ID`, `VITE_PAYMENT_LINK_INDIVIDU`, `VITE_PAYMENT_LINK_SEKOLAH`, `VITE_MAYAR_PRODUCT_ID`, `VITE_MAYAR_SCHOOL_PRODUCT_ID`.
- [ ] **WAJIB DIPERTAHANKAN (JANGAN DIHAPUS):** `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `GEMINI_API_KEY`, `ADMIN_PIN`, `ASESMERDEKA_LICENSE_SIGNING_SECRET`, `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET`, `CLOUD_SYNC_PIN_PEPPER*`, `VITE_MAX_INDIVIDU_DEVICES`.
- [ ] Setelah pembersihan env var, lakukan 1× redeploy terkontrol bila diperlukan agar snapshot build bebas dari env usang, dan uji ulang `/api/mayar-webhook` (`410`).

---

## 5. Final Verdict & Status Git Terkini

### Verdict: **`READY FOR STAGING PREVIEW`**

- Seluruh implementasi decommission Mayar (Task 13), audit independen (Task 13.1), pemulihan regression test + hardening legacy fallback fail-closed (Task 13.2 — **`PASS`**), dan finalisasi dokumentasi rilis (Task 13.3) telah tuntas dan terverifikasi pada branch `staging`.
- Status bisnis Production telah ditetapkan: **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`**, dengan status inspeksi teknis Redis Production tetap dicatat secara jujur sebagai **`NOT INDEPENDENTLY VERIFIED`**.
- **Production & `main` Tetap Tidak Tersentuh:**
  - `HEAD` (`staging`): `911ddac315527733716a6c4eceb48279061fc26e` (uncommitted working tree: `23` file termodifikasi `+1595 / -7377`, ditambah file baru Task 13/13.1/13.2/13.3).
  - `main` & `origin/main`: `b5072c7a7409f7e36008b66956c24536642566af` (**0** commit, **0** push, **0** deploy, **0** perubahan Redis/Vercel).
