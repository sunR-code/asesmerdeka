# Task 13.1 — Independent Review Mayar Decommission & Production Readiness

- **Tanggal Review:** 2026-11-22
- **Reviewer Mode:** Independent Read-Only Adversarial Audit (Branch `staging`, pre-commit)
- **Repository:** `asesmerdeka` (`C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka`)
- **Branch Aktif:** `staging` (`HEAD: 911ddac315527733716a6c4eceb48279061fc26e`, working tree berisi perubahan Task 13 yang belum di-commit)
- **Production / Main Baseline:** `main` & `origin/main` tetap tidak tersentuh pada `b5072c7a7409f7e36008b66956c24536642566af`
- **Verdict Historis Saat Audit Awal (Task 13.1):** **`CONDITIONAL PASS`** *(Temuan #2, #3, #5 kemudian diselesaikan pada Task 13.2 dengan hasil **`PASS`**)*
- **Status Pembayaran Production (Task 13.3):** **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`**
- **Status Inspeksi Redis Production:** **`NOT INDEPENDENTLY VERIFIED`** *(Production Upstash Redis `upstash-kv-sky-fountain` tidak di-scan secara independen)*
- **Status Kesiapan Rilis Terkini (Task 13.3):** **`READY FOR STAGING PREVIEW`** *(lihat `TASK_13_3_MAYAR_RETIREMENT_RELEASE_CHECKLIST.md`)*

---

## Ringkasan Eksekutif & Daftar Temuan Independen

Penghapusan integrasi **Mayar (`mayar.id`)** pada branch `staging` berhasil memutus seluruh jalur transaksi, checkout, webhook, cron rekonsiliasi, CSP, dan UI Mayar tanpa merusak aktivasi lisensi resmi (`ASM-*`), 135 kode seeded historis, pencatatan seat perangkat/sekolah, Admin Portal, checkout manual WhatsApp Admin, maupun isolasi `Staging ↔ Production` (`ASM-STG2-*`). Seluruh suite verifikasi (`Vitest` 47 file / 392 tes, `npm test` 30 tes, `tsc -b`, `oxlint`, `vite build`) lulus pada run independen saat review ini.

Namun, audit independen terhadap implementasi dan diff test menemukan **6 kondisi/temuan penting** (tidak ada regresi runtime aktif ataupun bypass otorisasi yang dapat dieksploitasi saat ini, tetapi terdapat gate Production yang belum terverifikasi dan kehilangan cakupan tes pada jalur pembayaran/concurrency):

| # | Tingkat | Kategori | Ringkasan Temuan Independen | Status |
|---|---|---|---|---|
| **1** | **GATE (WAJIB)** | Production Data Gate | Akses Production Upstash Redis (`upstash-kv-sky-fountain`, ID `2a5ff96e-1dbd-4e64-a576-fd2520a656f9`) tidak tersedia di workspace ini; isi `asesmerdeka:mayar:reconcile_queue:v1` dan `asesmerdeka:mayar:order:v1:*` belum diperiksa. **Tidak boleh mengklaim 0 transaksi tertunda.** | **`NOT VERIFIED`** |
| **2** | **MEDIUM** | Test Coverage & Edge Guard | Validasi server-side `AMOUNT_MISMATCH` (`api/activate-license.js:2541`) tetap aktif di kode, tetapi **kehilangan seluruh automated test** setelah tes webhook Mayar (`task7` S15, `task7_1` T8, `task7_1_2_2` T7) dipensiunkan. Selain itu, perbandingan `Number(txRecord.amount) < planSpec.price` berisiko membiarkan `NaN` jika `amount` korup/hilang (`!Number.isFinite(Number(txRecord.amount))` disarankan). | **Perlu Pemulihan Tes + Guard** |
| **3** | **MEDIUM** | Test Coverage (`409` Fence/Contention) | `withDistributedLock` + `LUA_ATOMIC_SEAT_CAS_SCRIPT` tetap teruji lintas 2 `worker_threads` (`task7_1_2` Skenario D) dan fail-closed `503` tetap teruji (Skenario F), namun `task7_1_2` Skenario E yang memicu `FencedWriteConflictError` (`STALE_LOCK_FENCE` `409`) dipensiunkan. Kini **0 tes otomatis** mengeksekusi jalur `409 STALE_LOCK_FENCE` dan `409 LOCK_CONTENTION_TIMEOUT` di `api/activate-license.js:2999-3020`. | **Perlu Pemulihan Tes** |
| **4** | **MEDIUM** | Generic Webhook Auth | Primitif kriptografi generik tetap utuh (`timingSafeEqualStrings` di `api/activate-license.js`, dipakai `api/diagnostics/staging-redis.js` & `api/cron/mayar-reconcile.js`; `computeMayarHmacSignature` & `redactWebhookUrlForLog` di `api/mayar-webhook.js`), namun `verifyMayarWebhookSignature` dipensiunkan tanpa mengekstrak helper verifier webhook provider-agnostik baru, dan `timingSafeEqualStrings` belum memiliki unit test langsung. Aman selama belum ada webhook pembayaran aktif. | **Conditional (Prasyarat Provider Baru)** |
| **5** | **MEDIUM** | Defense-in-Depth (Legacy Seat & Contracts) | Di `api/activate-license.js:1711-1746`, `checkAndClaimServerSeat` menolak `expired`, `suspended`, `pending_payment`, `payment_failed` (dan `isLicenseRevokedInRedis` menolak revoked pada baris 2683), namun belum memakai allowlist `lifecycleState` eksplisit (mis. status literal `pending_reconciliation`, `settling`, `revoked`, atau `expired` tanpa `expiresAt`). Pada jalur legacy non-`ASM-*` (`baris 2938`), respons `403` juga kehilangan field `paymentUnverified: Boolean(seatCheck.paymentUnverified)` (tidak sinkron dengan baris 2865). Catatan pra-Task 13: `api/shared-curriculum.js:165-178` belum membaca `getSeatRecordFromRedis` untuk kode non-`ASM` non-seeded. | **Disarankan Hardening** |
| **6** | **LOW** | Dead Export & Mock Rigor | `parseMayarV2ResponseEnvelope` (`api/activate-license.js:1288-1363`) masih diekspor sebagai helper murni tanpa caller runtime aktif; mock `SimpleRedisKV` pada `task13_mayarDecommissionRegression.test.ts:234-243` mengembalikan `OK` statis untuk `ASESMERDEKA_ATOMIC_SEAT_CAS_V1` (terkompensasi oleh `task7_1_2` Skenario D); belum ada tes eksplisit di `task13` untuk order historis berstatus `pending_reconciliation`/`settling`/`payment_failed` pada `verify_payment_order`. | **Low / Cleanup Opsional** |

---

## A. Git Diff Review

Baseline working tree `staging` (`911ddac315527733716a6c4eceb48279061fc26e`): **23 file termodifikasi (`1,303 insertions(+), 7,324 deletions(-)` )** ditambah `src/utils/__tests__/task13_mayarDecommissionRegression.test.ts` dan `docs/research/MAYAR_DECOMMISSION_REPORT.md` sebelum laporan review ini dibuat. Tidak ada perubahan pada `main`.

### 1. Backend Serverless & Konfigurasi Runtime

| File | Hasil Audit Perubahan & Keutuhan Fungsi Generik |
|---|---|
| `api/activate-license.js` (`437 +---`) | **Utuh & bersih dari koneksi Mayar.** Tidak ada pembacaan `process.env.MAYAR_*` ataupun `fetch` ke `api.mayar.*`. Fungsi `resolveMayarApiV2Config` (baris 1278) dan `createMayarInvoiceViaApi` (baris 1365) dipensiunkan menjadi stub inert `MAYAR_DECOMMISSIONED`. Action `create_payment_order` (baris 2348–2361) menolak `createMayarInvoice`, `mayarInvoiceId`, atau `provider === 'mayar'` dengan `HTTP 410 Gone`, sementara order generik non-Mayar tetap berjalan dengan `withDistributedLock` dan `atomicSaveFencedRecord`. Action `verify_payment_order` (baris 2459–2690) dan `requirePaymentProof` (baris 2825–2847) tetap menegakkan status `paid`, kecocokan harga (`AMOUNT_MISMATCH`), kepemilikan transaksi (`TRANSACTION_OWNERSHIP_MISMATCH`), dan pembacaan catatan historis `getVerifiedTxRecordForOrder`. Helper konstan-waktu `timingSafeEqualStrings` dipindahkan ke file ini sehingga tetap tersedia lintas endpoint. **Temuan #2, #3, #5, #6 berlaku di file ini.** |
| `api/mayar-webhook.js` (`2604 +---`) | **Tombstone `410 Gone` bersih.** Handler (baris 307–322) menetapkan `Cache-Control: no-store`, menjawab `200` untuk `OPTIONS`, dan menolak seluruh metode HTTP lain dengan `HTTP 410` (`retired: true`, `provider: 'mayar'`, `reason: 'MAYAR_DECOMMISSIONED'`) tanpa membaca `MAYAR_*` env, tanpa request keluar, dan tanpa mutasi Redis. Ekspor generik/kompatibilitas tetap dipertahankan: `withTransactionLock`, `LUA_COMMIT_WEBHOOK_SETTLEMENT_SCRIPT`, `redactWebhookUrlForLog`, `computeMayarHmacSignature`, serta re-ekspor key/store historis dari `./activate-license.js`. Verifikasi di seluruh direktori `api/` memastikan **0 file runtime lain mengimpor dari `api/mayar-webhook.js`**. **Temuan #4 berlaku di file ini.** |
| `api/cron/mayar-reconcile.js` (`147 +-`) | **Tombstone `410 Gone` dengan security guard tetap aktif.** Endpoint (67 baris) tetap menegakkan: hanya `GET` (`405 METHOD_NOT_ALLOWED`), larangan query secret (`401 QUERY_SECRET_FORBIDDEN`), dan verifikasi header `Authorization: Bearer` via `timingSafeEqualStrings` bila `CRON_SECRET` terpasang (`401 UNAUTHORIZED_CRON`), lalu selalu mengembalikan `410 MAYAR_DECOMMISSIONED` tanpa menyentuh Redis atau Mayar. Jadwal cron di `vercel.json` telah dihapus. |
| `api/diagnostics/staging-redis.js` (`2 +-`) | **Aman.** Satu-satunya perubahan adalah memindahkan import `timingSafeEqualStrings` dari `../mayar-webhook.js` ke `../activate-license.js` agar endpoint diagnostik tidak bergantung pada modul webhook yang dipensiunkan. |
| `vercel.json`, `vite.config.ts`, `.env.example` | **Bersih.** `vercel.json` menghapus `https://api.mayar.id` dari `connect-src` CSP dan menghapus entry cron `/api/cron/mayar-reconcile`. `vite.config.ts` menghapus dev middleware `/api/mayar-webhook`. `.env.example` menonaktifkan definisi `MAYAR_*`, `VITE_PAYMENT_LINK_*`, dan `VITE_MAYAR_*` menjadi komentar penanda `RETIRED`. |

### 2. Frontend Libraries & Komponen UI

| File | Hasil Audit Perubahan & Keutuhan Alur |
|---|---|
| `src/utils/paymentGateway.ts` (`65 +-`) | **Aman.** `getMayarPaymentLink` mengembalikan `''`, `saveMayarPaymentLinks` menjadi no-op, `ONE_TIME_PLANS.*.paymentLinkEnv` dikosongkan (`''`), dan `createPaymentInvoiceSession` selalu menyetel `externalCheckoutUrl: undefined`. Jalur otoritas zero-trust (`applyPaymentGatewayCallback`, `verifyPaymentOrderStatusOnline`, `verifyGatewayReceiptCode`) serta jalur WhatsApp Admin (`buildAdminWhatsAppPurchaseUrl`, `getAdminWhatsAppNumber`, `buildWhatsAppPurchaseMessage` menuju `6282114625243` secara default) **100% utuh**. |
| `src/utils/licenseManager.ts` (`69 +-`) | **Aman.** Konstanta dan getter/setter Product ID Mayar (`DEFAULT_MAYAR_PRODUCT_ID`, `DEFAULT_MAYAR_SCHOOL_PRODUCT_ID`, `getMayarProductId`, `getMayarSchoolProductId`, `saveMayar*`) mengembalikan `''` / no-op. `verifyLicenseOnline` menjadi fungsi kanonik dengan alias `@deprecated` `verifyMayarLicenseOnline`. Cache lokal `STORAGE_KEY_VERIFIED_MAYAR_CODES` (`asesmerdeka_verified_mayar_codes_v1`) dipertahankan untuk kompatibilitas mundur pelanggan lama yang telah terverifikasi server, dan `isValidLicenseCode` tetap memblokir kode `ASM-STG2-*` serta kode non-`ASM` acak saat offline. |
| `src/components/LicenseModal.tsx` (`17 +-`) | **Bersih (0 referensi `mayar`).** Pemilihan paket (`pro_individu` Rp 99.000 & `pro_sekolah` Rp 749.000) langsung memicu modal WhatsApp Admin (`setWhatsAppModalPlanId`), pintasan `@admin` menuju Admin Portal tetap utuh, dan aktivasi online + Cloud Sync berjalan normal. |
| `src/components/admin/AdminSettingsTab.tsx` (`144 +-`) | **Bersih (0 referensi `mayar`).** Kartu pengaturan payment link & Product ID Mayar dihapus dan diganti kartu informasional `1. Kanal Pembelian Lisensi Aktif` (WhatsApp Admin Manual + arsitektur *Provider Adapter* untuk integrasi masa depan), sementara `2. Batas Kursi Perangkat` dan `3. Cloud Seat Tracker` tetap berfungsi penuh. |

### 3. Audit Test Suites Task 7, Task 13, dan `tests/productionReadiness.test.mjs`

Audit independen memeriksa judul, implementasi, dan assertion (tidak sekadar status hijau Vitest) pada 9 file tes yang dimodifikasi serta `task13_mayarDecommissionRegression.test.ts`:

- **Penyesuaian tes yang sah (valid retirement):**
  - Pengalihan assertion endpoint `/api/mayar-webhook`, `/api/cron/mayar-reconcile`, dan `create_payment_order` (dengan flag Mayar) ke `HTTP 410 MAYAR_DECOMMISSIONED` pada `task7_1_1`, `task7_1_2_1`, `task7_1_2_2`, `task7_1_3A`, `task7_1_3B_2`, `task13`, serta `AUD-207`/`AUD-208`/`AUD-220` di `tests/productionReadiness.test.mjs`.
  - Pengalihan penulisan state order `paid` di tes integrasi `task7`, `task7_1`, `task7_1_1` dari webhook Mayar ke seeded Redis state agar alur `verify_payment_order` -> `requirePaymentProof` -> `activate-license` -> `cloud-sync` tetap diuji end-to-end.
  - Verifikasi isolasi environment (`ASM-STG2-*`), penolakan `PRO-MERDEKA-*`/`ASES-*`, keutuhan 135 seeded codes, dan pembacaan key historis `asesmerdeka:mayar:*` tetap diuji dengan assertion substansial (bukan tautologis).
- **Celah cakupan tes yang ditemukan saat pensiun tes Task 7 (Temuan #2, #3, #6):**
  1. **Hilangnya tes server-side `AMOUNT_MISMATCH` (`HTTP 400`):** Sebelumnya diuji pada `task7` S15, `task7_1` T8, dan `task7_1_2_2` T7 via handler webhook. Di `task7` S15 setelah revisi Task 13, assertion hanya menguji client-side `verifyGatewayReceiptCode` (`/tidak mencukupi/i`). Pencarian di seluruh `src/utils/__tests__/` dan `tests/` mengonfirmasi **0 kemunculan `AMOUNT_MISMATCH`** sebagai assertion aktif untuk `verify_payment_order` di `api/activate-license.js`.
  2. **Hilangnya tes `STALE_LOCK_FENCE` (`409`) & `LOCK_CONTENTION_TIMEOUT` (`409`):** Pada `task7_1_2`, Skenario D tetap menguji konkurensi seat lock lintas 2 `worker_threads` (`LUA_ATOMIC_SEAT_CAS_SCRIPT`) dan Skenario F tetap menguji Redis outage fail-closed `503`. Namun Skenario E (Lock Expiration & Stale Fence Token `409`) dipensiunkan menjadi tes `410` webhook, sehingga `FencedWriteConflictError` dan `LockContentionError` (`api/activate-license.js:2999-3020`) kini **tidak teruji saat runtime**.
  3. **Mock CAS simplifikasi di `task13`:** Pada `task13_mayarDecommissionRegression.test.ts:234-243`, `SimpleRedisKV` mengembalikan `['OK', '']` tanpa mengevaluasi ulang logika fence Lua untuk `ASESMERDEKA_FENCED_RECORD_WRITE_V1` dan `ASESMERDEKA_ATOMIC_SEAT_CAS_V1`. Ini aman hanya selama `task7_1_2` Skenario D tetap dipertahankan.
  4. **Tes order historis non-`paid` di `verify_payment_order`:** Belum ada kasus tes di `task13` yang secara khusus memverifikasi bahwa order historis `asesmerdeka:mayar:order:v1:*` berstatus `pending_reconciliation`, `settling`, atau `payment_failed` ditolak mentah-mentah oleh `verify_payment_order`.

---

## B. License Integrity Verification

| # | Kriteria | Status | Bukti Teknis Terverifikasi |
|---|---|---|---|
| **1** | **Semua 135 seeded license records tetap utuh** | **PASS** | `git diff api/officialSeeds.js src/data/officialSeeds.ts` kosong (0 perubahan). Verifikasi langsung via Node & Python mengonfirmasi `135` kode unik (`ASM-GM26-1TAT-1QBM-133R` s.d. `ASM-SK26-9KDV-1T46-1HPD`) dengan kecocokan himpunan dan urutan `100%` (`exact_order_match=True`) antara `api/officialSeeds.js` dan `src/data/officialSeeds.ts`. |
| **2** | **Existing customer licenses tetap dapat diverifikasi** | **PASS** | Pemilik kode `ASM-*` (Guru Mandiri, Kolektif Sekolah 25 guru × 2 perangkat, Pro) terverifikasi penuh melalui `verifyInternalSerialOrDeviceCode` di `api/activate-license.js`, `api/cloud-sync.js`, dan `api/gemini.js`. Pemilik kode non-`ASM-*` pelanggan lama tetap terverifikasi di server melalui catatan seat Redis (`getSeatRecordFromRedis` di `activate-license.js:2909`, `getSeatRecordStrict` di `cloud-sync.js:1770`, dan `getSeatRecordFromRedis` di `gemini.js:114`) serta di browser via `asesmerdeka_verified_mayar_codes_v1`. *(Catatan pra-Task 13: `api/shared-curriculum.js:165-178` hanya mengecek `verifyInternalSerialOrDeviceCode` / `OFFICIAL_SEEDED_LICENSES` dan tidak membaca `getSeatRecordFromRedis`, bukan regresi Task 13).* |
| **3** | **Historical Redis seat records tetap terbaca** | **PASS** | Fungsi `getSeatRecordFromRedis`, `checkAndClaimServerSeat`, `check_status`, dan `autoRegisterLicenseInAdminRegistry` di `api/activate-license.js` membaca seluruh key `asesmerdeka:seats:v1:*` tanpa migrasi destruktif, menjaga perangkat terdaftar, kuota `maxSeats`, `teacherSeats`, dan flag `legacyRecord: true` untuk record non-`ASM-*`. Teruji pada `task13` Test 3 & `AUD-208`. |
| **4** | **Tidak ada lisensi lama yang salah dinyatakan invalid** | **PASS** | Kode valid `ASM-GM26`, `ASM-SK26`, `ASM-GP26`, `ASM-SP26`, `ASM-SL26`, `ASM-DV26`, dan kode non-`ASM-*` dengan `existingSeatRecord` aktif tidak ditolak. Penolakan `legacyRevoked` hanya berlaku pada format usang `PRO-MERDEKA-*` dan `ASES-*` (kebijakan pra-Task 13 sejak `ASM-*` dirilis). |
| **5** | **Tidak ada fallback yang dapat mengaktifkan lisensi tanpa payment authority yang valid** | **PASS** *(dengan catatan Temuan #5)* | Pada server: kode non-`ASM` tak dikenal di Redis ditolak `400 LICENSE_NOT_FOUND` (baris 2980) tanpa fallback Mayar/KYC; `ASM-*` palsu ditolak `403 INVALID_LICENSE_SIGNATURE` (baris 2898); jalur berbukti bayar (`requirePaymentProof` / `invoiceId` / `orderId` / `transactionId`, baris 2825–2847) dan `verify_payment_order` (baris 2459–2569) hanya menerima bukti `paid` dari registry Redis. Pada client: `verifyLicenseOnline` (`licenseManager.ts:1116`) berhenti langsung saat server mengembalikan `valid: false` (offline fallback hanya berjalan bila request jaringan gagal/error atau respons bukan JSON penolakan eksplisit, serta `ASM-STG2-*` selalu ditolak offline kecuali sudah terverifikasi server pada `deviceId` yang sama). |
| **6** | **`ASM-STG2` tetap terisolasi dari Production** | **PASS** | `validateLicenseEnvironmentBoundary` menolak `ASM-STG2-*` ketika runtime adalah `production`, dan menolak kode non-`ASM-STG2` ketika runtime adalah `preview`/staging pada `activate-license.js`, `cloud-sync.js`, `gemini.js`, `shared-curriculum.js`, dan `admin-portal.js`. Teruji di `task13` Test 5 dan `task7_1_3B_2`. |
| **7** | **Legacy Mayar transaction tidak dianggap otomatis `paid`** | **PASS** | Terverifikasi di `api/activate-license.js`: `getVerifiedTxRecordForOrder` (baris 1558) hanya membangun sintesis TX dari order jika `order.status === 'paid' && (order.transactionId \|\| order.paidAmount \|\| order.amount)`. Pada `verify_payment_order` (baris 2489), setiap `txRecord.status !== 'paid'` (termasuk `pending_payment`, `pending_reconciliation`, `settling`, `payment_failed`) ditolak dengan `verified: false, activated: false`. `checkAndClaimServerSeat` (baris 1733–1745) juga menolak seat berstatus `pending_payment` dan `payment_failed`. |

---

## C. Payment Security Review

| Aspek Keamanan | Status | Analisis Independen |
|---|---|---|
| **Tidak ada Mayar checkout baru** | **PASS** | `create_payment_order` mengembalikan `410 MAYAR_DECOMMISSIONED` jika menerima `createMayarInvoice: true`, `mayarInvoiceId`, atau `provider === 'mayar'`. `getMayarPaymentLink` selalu `''`, `externalCheckoutUrl` selalu `undefined`, CSP tidak mengizinkan `api.mayar.id`. Checkout aktif hanya WhatsApp Admin manual (`wa.me/6282114625243`). |
| **Tidak ada webhook Mayar baru yang mengubah data** | **PASS** | `/api/mayar-webhook` (`api/mayar-webhook.js:307-322`) dan `/api/cron/mayar-reconcile` (`api/cron/mayar-reconcile.js:9-67`) langsung mengembalikan `HTTP 410 Gone` (`no-store`) tanpa membaca `MAYAR_*` env, tanpa menulis ke Redis/registry/seat, dan tanpa melakukan `fetch` keluar. |
| **Tidak ada provider fallback yang melewati otorisasi** | **PASS** | Tidak ada fallback ke Mayar V1/V2 API, tidak ada `kycPending` bypass, dan tidak ada auto-approve client-side. `applyPaymentGatewayCallback` menolak `PLAN_TAMPERED`, `UNVERIFIED_PAYMENT_TRANSACTION`, `AMOUNT_MANIPULATED`, dan `TRANSACTION_OWNERSHIP_MISMATCH`. |
| **Generic webhook authentication tetap aktif** | **CONDITIONAL (Temuan #4)** | **Primitif keamanan tetap ada**, yaitu `timingSafeEqualStrings` (dipindah ke `api/activate-license.js`, aktif dipakai oleh `api/cron/mayar-reconcile.js` & `api/diagnostics/staging-redis.js`), `computeMayarHmacSignature` (HMAC-SHA256 hex murni), dan `redactWebhookUrlForLog` (penyamaran token/secret di URL). **Namun**, fungsi verifier webhook utuh (`verifyMayarWebhookSignature`) kini menjadi stub pensiun (`{ ok: false, retired: true }`) dan belum digantikan fungsi verifier generik terpadu. Karena saat ini `/api/mayar-webhook` selalu membalas `410 Gone` dan belum ada webhook pembayaran aktif, tidak ada celah runtime; namun sebelum integrasi payment gateway baru (mis. DOKU), verifier webhook generik + anti-replay + unit test `timingSafeEqualStrings` wajib dibuat. |
| **Amount mismatch validation tetap aktif** | **PASS (Kode) / CONDITION (Tes — Temuan #2)** | Server (`api/activate-license.js:2541`) tetap mengecek `Number(txRecord.amount) < planSpec.price` -> `HTTP 400 AMOUNT_MISMATCH`, dan client (`src/utils/paymentGateway.ts:525-549, 775-785`) tetap mengecek `AMOUNT_MANIPULATED` dan `AMOUNT_MISMATCH`. Namun tes server-side `AMOUNT_MISMATCH` hilang saat tes webhook dipensiunkan (perlu dipulihkan bersama guard `!Number.isFinite(Number(txRecord.amount))`). |
| **Distributed locking dan Lua CAS tetap berfungsi** | **PASS (Lock & CAS) / CONDITION (Fence Test — Temuan #3)** | `withDistributedLock` (`ASESMERDEKA_ACQUIRE_MULTI_LOCK_V1` & `RELEASE`), `LUA_ATOMIC_SEAT_CAS_SCRIPT` (`ASESMERDEKA_ATOMIC_SEAT_CAS_V1`), `LUA_FENCED_RECORD_WRITE_SCRIPT`, dan `LUA_UPSERT_ADMIN_REGISTRY_SCRIPT` tetap utuh dan digunakan aktif oleh `create_payment_order`, `checkAndClaimServerSeat`, dan `autoRegisterLicenseInAdminRegistry`. Konkurensi 2 `worker_threads` (`task7_1_2` D) & fail-closed `503` (Skenario F) tetap lulus; tes `STALE_LOCK_FENCE` (`409`) & `LOCK_CONTENTION_TIMEOUT` (`409`) perlu dipulihkan. |
| **Existing payment authority registry tetap dapat membaca data historis** | **PASS** | Key & pembaca Redis historis utuh dan berfungsi (`asesmerdeka:mayar:order:v1:*`, `asesmerdeka:mayar:tx:v1:*`, `asesmerdeka:mayar:evt:v1:*`, `asesmerdeka:mayar:inv_idx:v1:*`, `asesmerdeka:mayar:reconcile_queue:v1`, `asesmerdeka:mayar:webhook_audit:v1`), termasuk `getPaymentOrderRecord`, `getWebhookTransactionRecord`, `getOrderIdByMayarInvoiceId`, `getReconcileQueueRecords`, `getSanitizedWebhookAuditLog`, dan `getVerifiedTxRecordForOrder`. |

---

## D. Production Pending Transaction Gate

### Status Gate: **`NOT VERIFIED`**

> [!CAUTION]
> **Peringatan Penting:** Workspace ini tidak memiliki akses ke Production Upstash Redis (dan akses langsung/mutasi ke Production dilarang keras sesuai aturan keselamatan). Oleh karena itu, **gate ini WAJIB ditandai `NOT VERIFIED`**, dan review ini **TIDAK mengklaim bahwa tidak ada transaksi tertunda di Production**. Pemilik proyek harus menjalankan prosedur READ-ONLY berikut di **Upstash Console** sebelum menyetujui promosi ke `main` / Production.

### Target Database Production (Sesuai Audit Task 12.4.7.2)
- **Vercel Storage / Database Name:** `upstash-kv-sky-fountain`
- **Upstash Database ID:** `2a5ff96e-1dbd-4e64-a576-fd2520a656f9`
- **Console URL:** `https://console.upstash.com/` (memerlukan login & 2FA pemilik proyek)

### Prosedur Audit READ-ONLY Step-by-Step untuk Pemilik Proyek

1. **Login & Pilih Database Production:**
   - Buka `https://console.upstash.com/`, login, dan selesaikan verifikasi 2FA.
   - Pilih database **`upstash-kv-sky-fountain`** (`2a5ff96e-1dbd-4e64-a576-fd2520a656f9`).
   - Pastikan **TIDAK** mengklik tombol *Delete*, *Edit*, *Flush DB*, atau *Reset Token*. Gunakan **Data Browser** atau **Redis CLI (hanya perintah baca)**.

2. **Periksa Antrean Rekonsiliasi Historis (`asesmerdeka:mayar:reconcile_queue:v1`):**
   - Jalankan perintah READ-ONLY:
     ```redis
     GET asesmerdeka:mayar:reconcile_queue:v1
     ```
   - Catat hasil:
     - Jika `(nil)` atau `[]`: antrean rekonsiliasi kosong.
     - Jika berupa array JSON non-kosong: periksa setiap elemen (`jobKey`, `orderId`, `mayarInvoiceId`, `transactionId`, `status`, `attempts`, `createdAt`). Catat hanya ID yang sudah dimasking (contoh: `INV-2026****-4A9F`).

3. **Pindai Seluruh Order Historis (`asesmerdeka:mayar:order:v1:*`) Secara Non-Blocking:**
   - Hindari `KEYS *`; gunakan `SCAN` berulang kali sampai cursor kembali ke `0`:
     ```redis
     SCAN 0 MATCH asesmerdeka:mayar:order:v1:* COUNT 100
     ```
   - Untuk setiap key yang muncul dari hasil `SCAN`, jalankan `GET` READ-ONLY:
     ```redis
     GET asesmerdeka:mayar:order:v1:<ORDER_ID>
     ```
   - Evaluasi field `status` (dan `consistencyState` bila ada):
     - **Status Terminal (Aman):** `paid`, `payment_failed`, `expired`, `cancelled`.
     - **Status Nonterminal (Menghalangi Rilis / Perlu Penyelesaian):** `pending_payment`, `pending_reconciliation`, `settling`, atau nilai kosong / tidak dikenal.

4. **Aturan Privasi & Keamanan Saat Melakukan Audit:**
   - **Dilarang keras** menyalin atau membagikan `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, email pembeli (`buyerEmail`), nama lengkap (`buyerName`), maupun kode lisensi utuh ke chat/log.
   - Selalu lakukan **masking** pada ID saat mencatat temuan (misalnya sisakan 4 karakter pertama & 4 karakter terakhir: `INV-2026****AB12`, `TX-****9012`).
   - **Dilarang** menghapus atau mengubah key Redis historis (`asesmerdeka:mayar:*` maupun `asesmerdeka:seats:v1:*`).

5. **Klasifikasi Keputusan Gate Setelah Inspeksi:**
   - **Jika ditemukan >= 1 transaksi nonterminal** di `reconcile_queue:v1` atau `order:v1:*`:
     - Tandai Gate = **`BLOCKED`**.
     - Buat daftar ID transaksi termasking beserta `status`, `planId`, dan `createdAt`.
     - **Langkah penyelesaian sebelum rilis Production:** Verifikasi bukti transfer/mutasi dana atau status riwayat dashboard Mayar sebelum decommission untuk tiap ID nonterminal. Jika pembayaran sah masuk, terbitkan/serahkan kode lisensi dan daftarkan manual melalui Portal Admin (dan kontak pembeli bila perlu). Jika transaksi memang kedaluwarsa/dibatalkan dan tidak ada dana masuk, dokumentasikan status akhir agar tidak memicu keluhan pelanggan pasca-`410`.
   - **Jika 0 transaksi nonterminal** (`reconcile_queue:v1` kosong/`nil` dan seluruh `order:v1:*` berstatus terminal):
     - Tandai Gate = **`CLEAR`** — memenuhi syarat data gate untuk promosi ke Production.

---

## E. Runtime Reference Scan (Klasifikasi Lengkap 35 File)

Pemindaian menyeluruh ke seluruh repositori (mengecualikan `.git`, `node_modules`, `dist`, `.vite`, `coverage`, `.env*` selain `.env.example`) menemukan **35 file unik** yang masih memuat kata kunci `mayar` (case-insensitive).

### Verifikasi Jalur Transaksi Aktif
- **Active runtime integration: `0 file`.**
- Tidak ada kode runtime di `api/` ataupun `src/` (selain test/docs) yang membaca `process.env.MAYAR_*`, `VITE_MAYAR_*`, atau `VITE_PAYMENT_LINK_*`, ataupun membentuk URL/permintaan HTTP menuju `api.mayar.id`, `api.mayar.club`, atau `pay.mayar.id`. Kemunculan string `MAYAR_API_*` di `api/activate-license.js:1294-1351` hanyalah literal alasan error di dalam helper murni `parseMayarV2ResponseEnvelope` (tanpa pemanggilan jaringan maupun caller runtime aktif).

### Tabel Klasifikasi Seluruh 35 File

| Kategori | Jumlah | Daftar File & Peran Aktual |
|---|---|---|
| **1. Active runtime integration** | **0** | *(Kosong — 100% terputus. Tidak ada jalur transaksi aktif yang dapat memanggil API Mayar atau membuka Payment Link Mayar).* |
| **2. Historical compatibility** | **5** | 1. `api/activate-license.js` (konstanta & pembaca key Redis historis `asesmerdeka:mayar:order:v1:*`, `tx:v1:*`, `evt:v1:*`, `inv_idx:v1:*`, `reconcile_queue:v1`, `webhook_audit:v1`; legacy non-`ASM-*` seat fallback)<br>2. `api/officialSeeds.js` (135 master seeded codes termasuk `MAYAR_100_CODES` / label stok historis)<br>3. `src/data/officialSeeds.ts` (135 master seeded codes di Admin Portal)<br>4. `src/utils/licenseManager.ts` (cache lokal historis `asesmerdeka_verified_mayar_codes_v1` untuk kompatibilitas perangkat pelanggan lama)<br>5. `src/utils/paymentGateway.ts` (lookup kompatibilitas prefix key `asesmerdeka:mayar:order:v1:` / `tx:v1:` pada `getServerAuthorityOrder` & `getServerVerifiedTransaction`) |
| **3. Deprecated aliases & `410 Gone` tombstones** | **2 dedicated** *(+ 3 tumpang tindih dengan Kategori 2)* | *File khusus tombstone:*<br>1. `api/mayar-webhook.js` (`HTTP 410 MAYAR_DECOMMISSIONED`, stub `verifyMayarWebhookSignature`, `correlateMayarTransactionViaApi`, `extractMayarWebhookIdentifiers`, `reconcilePendingWebhooks`)<br>2. `api/cron/mayar-reconcile.js` (`HTTP 410 MAYAR_DECOMMISSIONED`)<br>*Simbol `@deprecated` pada file Kategori 2:*<br>- `api/activate-license.js`: `resolveMayarApiV2Config`, `createMayarInvoiceViaApi`, `parseMayarV2ResponseEnvelope`<br>- `src/utils/licenseManager.ts`: `DEFAULT_MAYAR_PRODUCT_ID`, `DEFAULT_MAYAR_SCHOOL_PRODUCT_ID`, `getMayarProductId`, `saveMayarProductId`, `getMayarSchoolProductId`, `saveMayarSchoolProductId`, `verifyMayarLicenseOnline`<br>- `src/utils/paymentGateway.ts`: `getMayarPaymentLink`, `saveMayarPaymentLinks` |
| **4. Test fixtures & test suites** | **15** | 1. `src/utils/__tests__/task13_mayarDecommissionRegression.test.ts`<br>2. `src/utils/__tests__/task7LicensingEntitlementIntegrity.test.ts`<br>3. `src/utils/__tests__/task7_1PaymentAndAdminSecurity.test.ts`<br>4. `src/utils/__tests__/task7_1_1PaymentAuthorityAndWebhookContract.test.ts`<br>5. `src/utils/__tests__/task7_1_2MayarIdentityAndDistributedAtomicity.test.ts`<br>6. `src/utils/__tests__/task7_1_2_1MayarInvoiceCorrelationAndRecovery.test.ts`<br>7. `src/utils/__tests__/task7_1_2_2MayarApiV2AndCronAuth.test.ts`<br>8. `src/utils/__tests__/task7_1_3AStagingRedisDiagnostics.test.ts`<br>9. `src/utils/__tests__/task7_1_3B_2EnvironmentBoundSigning.test.ts`<br>10. `src/utils/__tests__/task7_1_3BCloudSyncOutageAndRecovery.test.ts`<br>11. `src/utils/__tests__/task9_0ReleaseCandidateGate.test.ts`<br>12. `src/utils/__tests__/task10_1AdminPortalUnification.test.ts`<br>13. `src/utils/__tests__/task11_1CoreRemedialTrackingAndReassessment.test.ts`<br>14. `src/utils/__tests__/task12_4_6CloudSyncPayloadReliability.test.ts`<br>15. `tests/productionReadiness.test.mjs` |
| **5. Historical documentation & retired env comments** | **13** | 1. `.env.example`<br>2. `docs/LICENSE_ENVIRONMENT_ISOLATION.md`<br>3. `docs/research/MAYAR_DECOMMISSION_REPORT.md`<br>4. `docs/research/RESELLER_LEDGER_PAYOUT_DESIGN.md`<br>5. `docs/superpowers/plans/2026-11-06-mayar-model-a-license-integration.md` (berlabel `RETIRED — HISTORICAL REFERENCE ONLY`)<br>6. `docs/superpowers/plans/2026-11-06-ui-dashboard-v21-complete-redesign.md`<br>7. `docs/superpowers/plans/2026-11-08-unified-admin-portal.md`<br>8. `docs/superpowers/plans/task-3-brief.md`<br>9. `docs/superpowers/specs/2026-11-06-smart-lkpd-preset-studio-design.md`<br>10. `docs/superpowers/specs/2026-11-08-admin-portal-design.md` (catatan historis `RETIRED`)<br>11. `docs/superpowers/specs/2026-11-08-help-feedback-system-design.md`<br>12. `.superpowers/sdd/2026-11-06-mayar-model-a-license-integration/progress.md`<br>13. `.superpowers/sdd/2026-11-06-ui-dashboard-v21-complete-redesign/progress.md` |

*Total file unik terklasifikasi: `0 + 5 + 2 + 15 + 13 = 35` file (`100%` tercakup; zero Redis historical record deletions).*

---

## F. Verification Results (Fresh Run During Independent Review)

Seluruh pemeriksaan dijalankan ulang secara segar pada working tree `staging` saat review independen ini (2026-11-22):

| Pemeriksaan | Perintah | Hasil | Detail Output |
|---|---|---|---|
| **Full Vitest** | `npx vitest run` | **PASS** | `47 passed (47)` test files, `392 passed (392)` tests, durasi `11.65s`, exit code `0` |
| **Production Readiness** | `npm test` (`node --test tests/productionReadiness.test.mjs`) | **PASS** | `30 passed`, `0 failed`, `0 skipped`, durasi `1.68s`, exit code `0` |
| **TypeScript Check** | `npx tsc -b` | **PASS** | `0 errors`, exit code `0` |
| **Linter** | `npm run lint` (`oxlint`) | **PASS** | `0 warnings`, `0 errors` pada `202 files` (`114 rules`), `210ms`, exit code `0` |
| **Production Build** | `npm run build` (`tsc -b && vite build`) | **PASS** | `2501 modules transformed`, `✓ built in 793ms`, exit code `0` |
| **Git Status & Diff** | `git branch --show-current`, `git status -sb`, `git diff --stat` | **SESUAI** | Branch `staging` (`911ddac315527733716a6c4eceb48279061fc26e`); `main` & `origin/main` tidak berubah (`b5072c7a7409f7e36008b66956c24536642566af`); 23 file dimodifikasi (`1,303 + / 7,324 -`) |

---

## G. Final Verdict & Rekomendasi Sebelum Promosi Production

### Verdict: **`CONDITIONAL PASS`**

**Alasan Pemilihan Verdict:**
- **Bukan `FAIL`:** Tidak ditemukan regresi fungsional aktif maupun celah otorisasi yang dapat dieksploitasi saat ini; pemutusan Mayar tuntas (0 jalur aktif), 135 seeded codes & lisensi pelanggan lama utuh, WhatsApp Admin checkout berfungsi penuh, isolasi `ASM-STG2-*` ketat, dan 100% build/lint/types/test suite lulus.
- **Bukan `PASS` penuh:** Gate wajib **Section D (Production Pending Transaction Gate)** masih berstatus **`NOT VERIFIED`**, dan review independen menemukan penyusutan cakupan tes pada skenario kritis pembayaran/konkurensi (`AMOUNT_MISMATCH` server-side dan `STALE_LOCK_FENCE` `409`) serta dua peluang hardening ringan di kode runtime (`Temuan #2`–`#5`).

### Syarat & Langkah Tindakan Sebelum Promosi ke `main` / Production

1. **[WAJIB — Gate Section D]** Pemilik proyek menjalankan prosedur READ-ONLY pada Section D di Upstash Console untuk database Production `upstash-kv-sky-fountain` (`2a5ff96e-1dbd-4e64-a576-fd2520a656f9`). Pastikan Gate berstatus **`CLEAR`** (atau selesaikan seluruh transaksi nonterminal terlebih dahulu jika berstatus **`BLOCKED`**).
2. **[SANGAT DISARANKAN SEBELUM COMMIT/PROMOSI]** Pulihkan dan lengkapi automated test pada `staging`:
   - Tambahkan tes `verify_payment_order` di `api/activate-license.js` yang memastikan `txRecord.amount < planSpec.price` dan nilai non-numerik/`NaN` ditolak `HTTP 400 AMOUNT_MISMATCH`, serta perkeras baris `2541` dengan `!Number.isFinite(Number(txRecord.amount))`.
   - Pulihkan tes `FencedWriteConflictError` (`HTTP 409 STALE_LOCK_FENCE`) dan `LockContentionError` (`HTTP 409 LOCK_CONTENTION_TIMEOUT`) pada `activate-license.js`.
   - Tambahkan unit test langsung untuk `timingSafeEqualStrings` serta tes `verify_payment_order` yang memastikan order historis berstatus `pending_reconciliation`, `settling`, dan `payment_failed` tetap ditolak.
3. **[DISARANKAN — Defense-in-Depth Runtime]** Pada `api/activate-license.js`:
   - Di `checkAndClaimServerSeat` (baris `1711–1746`), tambahkan penolakan eksplisit jika `existing.lifecycleState` termasuk `revoked`, `expired` (walaupun `expiresAt` null), `pending_reconciliation`, atau `settling`.
   - Di jalur legacy non-`ASM-*` baris `2938`, sertakan `paymentUnverified: Boolean(seatCheck.paymentUnverified)` agar kontrak respons `403` konsisten dengan jalur `ASM-*`.
4. **[PRASYARAT SEBELUM INTEGRASI PROVIDER BARU (MIS. DOKU)]** Ekstrak helper autentikasi webhook generik yang provider-agnostik (HMAC + `timingSafeEqualStrings` + anti-replay timestamp/event ID) dan evaluasi dukungan `getSeatRecordFromRedis` di `api/shared-curriculum.js:165` untuk lisensi non-`ASM-*`.
5. **[PASCA-CUTOVER PRODUCTION]** Setelah rilis Production terverifikasi sehat dan rekonsiliasi selesai, bersihkan environment variable `MAYAR_*`, `VITE_MAYAR_*`, dan `VITE_PAYMENT_LINK_*` yang sudah usang dari dashboard Vercel (tanpa menghapus key Redis historis `asesmerdeka:mayar:*`).

---

## Addendum — Resolusi Task 13.2 & Finalisasi Task 13.3

- **Task 13.2 — **`PASS`** ([`TASK_13_2_PAYMENT_SECURITY_REGRESSION.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/research/TASK_13_2_PAYMENT_SECURITY_REGRESSION.md)):**
  - Temuan #2 (`AMOUNT_MISMATCH` server-side `HTTP 400` + guard `Number.isFinite`), Temuan #3 (`STALE_LOCK_FENCE` `409` & `LOCK_CONTENTION_TIMEOUT` `409`), dan Temuan #5 (hardening allowlist legacy non-`ASM-*` + flag `paymentUnverified` pada `403`) telah diimplementasikan pada [`api/activate-license.js`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/api/activate-license.js) dan diverifikasi secara deterministik pada [`task13_2PaymentSecurityAndLegacyFallback.test.ts`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts).
  - Kontrak verifier webhook generik telah didokumentasikan untuk integrasi provider masa depan tanpa mengimplementasikan adaptor provider-spesifik dan tanpa mengaktifkan Mayar.
- **Verifikasi Ulang Penuh Pasca-Task 13.2:**
  - `npx vitest run`: **402/402 tests passed** (`48/48` file, `13.55s`, exit `0`).
  - `npm test`: **30/30 production readiness tests passed** (`2280.66ms`, exit `0`).
  - `npx tsc -b`, `npm run lint` (`0 warnings, 0 errors`, `203` file), dan `npm run build` (`2501` modul, `1.04s`) seluruhnya **PASS**.
- **Pembaruan Gate Bagian D (Task 13.3):**
  - **Production Payment Status:** **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`** (pemilik proyek secara eksplisit mengonfirmasi bahwa tidak ada pembayaran pelanggan yang pernah selesai di Production, sehingga tidak ada transaksi Mayar berbayar yang memerlukan settlement finansial atau fulfillment lisensi).
  - **Production Redis Inspection Status:** **`NOT INDEPENDENTLY VERIFIED`** (Production Upstash Redis tetap tidak di-scan secara independen; seluruh catatan historis tetap dipertahankan).
- **Status Kesiapan Rilis:** Lihat [`TASK_13_3_MAYAR_RETIREMENT_RELEASE_CHECKLIST.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/research/TASK_13_3_MAYAR_RETIREMENT_RELEASE_CHECKLIST.md) — **`READY FOR STAGING PREVIEW`**.
