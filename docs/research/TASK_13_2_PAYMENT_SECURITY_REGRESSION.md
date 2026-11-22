# Task 13.2 — Payment Security Regression Coverage & Legacy License Fallback Hardening

- **Tanggal:** 2026-11-22
- **Branch Aktif:** `staging` (`HEAD: 911ddac315527733716a6c4eceb48279061fc26e`, uncommitted)
- **Baseline Main / Production:** `main` & `origin/main` tetap tidak tersentuh pada `b5072c7a7409f7e36008b66956c24536642566af`
- **Status Implementasi Task 13.2:** **`PASS`** (seluruh celah cakupan tes & hardening Task 13.1 ditutup; `402/402` Vitest, `30/30` production readiness, `tsc -b`, `lint`, & `build` lulus; 0 pelonggaran guard; Mayar tetap nonaktif permanen)
- **Production Payment Status (Pembaruan Task 13.3):** **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`** *(konfirmasi eksplisit pemilik proyek bahwa belum pernah ada pembayaran pelanggan yang selesai di Production)*
- **Production Redis Inspection Status:** **`NOT INDEPENDENTLY VERIFIED`** *(Production Redis tidak di-scan secara independen; seluruh catatan historis tetap dipertahankan)*
- **Status Kesiapan Rilis Terkini (Task 13.3):** **`READY FOR STAGING PREVIEW`** *(lihat `TASK_13_3_MAYAR_RETIREMENT_RELEASE_CHECKLIST.md`)*

---

## 1. Temuan Awal (Tindak Lanjut Audit Independen Task 13.1)

Berdasarkan laporan audit independen Task 13.1 ([`TASK_13_1_MAYAR_DECOMMISSION_REVIEW.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/research/TASK_13_1_MAYAR_DECOMMISSION_REVIEW.md)), terdapat 4 celah teknis pasca-decommission Mayar yang perlu ditutup pada `staging` sebelum promosi ke Production:

1. **Hilangnya cakupan tes server-side `AMOUNT_MISMATCH` (`HTTP 400`) & celah `NaN`/`Infinity`:** Validasi `verify_payment_order` di `api/activate-license.js` masih aktif di kode, namun kehilangan seluruh automated test pasca pensiunnya tes webhook Task 7. Selain itu, perbandingan `Number(txRecord.amount) < planSpec.price` tidak menolak nilai korup yang menghasilkan `NaN`, `null`, string kosong, atau tidak finite. Jalur `requirePaymentProof` juga belum memvalidasi nominal transaksi terhadap harga kanonik `SERVER_PLAN_CATALOG`.
2. **Hilangnya cakupan tes `STALE_LOCK_FENCE` (`HTTP 409`) & `LOCK_CONTENTION_TIMEOUT` (`HTTP 409`):** `withDistributedLock` dan Lua CAS tetap berfungsi, tetapi setelah pensiunnya Skenario E di `task7_1_2`, jalur `FencedWriteConflictError` (`409 STALE_LOCK_FENCE`) dan `LockContentionError` (`409 LOCK_CONTENTION_TIMEOUT`) memiliki **0 eksekusi automated test**.
3. **Hardening jalur legacy non-`ASM-*` (`api/activate-license.js`):** Fungsi `checkAndClaimServerSeat` sebelumnya hanya menggunakan blocklist terbatas (`expired` berbasis `expiresAt` saja, `suspended`, `pending_payment`, `payment_failed`) tanpa allowlist eksplisit `lifecycleState` (`['paid', 'active']`). Akibatnya status `pending_reconciliation`, `settling`, `expired` dengan `expiresAt: null`/malformed, state tak dikenal, atau record tanpa `lifecycleState` berisiko lolos bila tersimpan di seat Redis. Respons `403` pada jalur legacy non-`ASM-*` juga belum menyertakan flag `paymentUnverified` dan `revoked`.
4. **Kontrak Generic Webhook Verifier belum terdokumentasi:** Primitif kriptografi (`timingSafeEqualStrings`) sudah dipindahkan ke `api/activate-license.js`, tetapi kontrak verifier generik untuk calon provider baru (tanpa mengaktifkan kembali Mayar maupun membuat adaptor provider-spesifik premature) perlu dirumuskan sebelum integrasi masa depan.

---

## 2. File yang Diubah dan Ditambahkan

| File | Jenis | Ringkasan Perubahan |
|---|---|---|
| [`api/activate-license.js`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/api/activate-license.js) | Modified (`+311 / -72` baris pada Task 13.2) | Menambahkan `parseValidPaymentAmount` (`Number.isFinite` + `> 0`), allowlist eksplisit `ALLOWED_VERIFY_LIFECYCLE_STATES`, `hasInvalidExpirationContract`, `validateSeatRecordLifecycle`, `verifyLegacySeatPaymentAuthority`, validasi amount di `requirePaymentProof`, enforcement di `verify_payment_order`, `check_status`, `checkAndClaimServerSeat`, dan jalur legacy non-`ASM-*` (beserta flag `paymentUnverified` & `revoked` pada `403`), serta override `ASESMERDEKA_LOCK_WAIT_TIMEOUT_MS` untuk uji timeout lock deterministik. |
| [`src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts) | Added (10 test cases) | Suite regresi deterministik dengan simulator `DeterministicLuaRedis` lengkap untuk `AMOUNT_MISMATCH` + `Number.isFinite`, `STALE_LOCK_FENCE`, `LOCK_CONTENTION_TIMEOUT`, konkurensi klaim kursi terakhir, Redis outage `503`, matriks hardening legacy fallback + `check_status`, isolasi Staging/Production, `timingSafeEqualStrings`, serta `410 MAYAR_DECOMMISSIONED`. |
| [`docs/research/TASK_13_2_PAYMENT_SECURITY_REGRESSION.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/research/TASK_13_2_PAYMENT_SECURITY_REGRESSION.md) | Added | Laporan perubahan, hasil tes, kontrak webhook generik, risiko tersisa, dan diff summary Task 13.2. |

*(Tidak ada file Mayar yang diaktifkan kembali; tidak ada perubahan pada `main`, `.env`, Production, Vercel, ataupun historical Redis records.)*

---

## 3. Test yang Dipulihkan dan Test Case Baru

Seluruh cakupan keamanan yang sebelumnya hilang dari suite webhook Task 7 dipulihkan dan diperluas pada [`task13_2PaymentSecurityAndLegacyFallback.test.ts`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts):

### A. Pemulihan & Penguatan `AMOUNT_MISMATCH` (`Test 1` & `Test 2`)
- **Validasi Harga Kanonik (`Test 1`):** Memverifikasi bahwa transaksi `paid` bernominal kurang untuk paket Individu (`50.000 < 99.000`) dan paket Sekolah (`99.000 < 749.000`) ditolak dengan **`HTTP 400`** dan **`reason: 'AMOUNT_MISMATCH'`** baik pada `action: 'verify_payment_order'` maupun jalur aktivasi `requirePaymentProof: true`. Memastikan `ok: false`, `verified: false`, `activated: false`, `licenseCode: undefined`, order tetap `pending_payment` (tidak dinaikkan ke `paid`), dan tidak ada seat Redis yang tercipta.
- **Fail-Closed `Number.isFinite(Number(txRecord.amount))` (`Test 2`):** Menguji langsung helper `parseValidPaymentAmount` dan eksekusi end-to-end `verify_payment_order` untuk nilai korup/ekstrem: `undefined`, `null`, `NaN`, `'NaN'`, `Infinity`, `-Infinity`, `'Infinity'`, `''`, `'   '`, `'abc'`, `0`, `-99000`, `true`, dan `{}`, serta kasus order sintetis dengan `paidAmount: null` (`baseAmount: 99000`). Seluruh input tidak valid ditolak **`HTTP 400 AMOUNT_MISMATCH`**, sementara pembayaran valid tepat `99000` tetap lulus `200`.

### B. Pemulihan Lock Fence & Concurrency Regressions (`Test 3` s.d. `Test 6`)
- **`STALE_LOCK_FENCE` (`HTTP 409`) pada Aktivasi Seat (`Test 3`):** Menggunakan `beforeEvalHook` deterministik (tanpa sleep/timer flaky) saat Proses A hendak menulis `SEAT_CAS`. Lock Proses A disimulasikan kedaluwarsa, Proses B masuk dan menang dengan fence baru (`DEV-WINNER-B`), lalu Proses A yang melanjutkan eksekusi ditolak **`HTTP 409`**, **`staleLockFence: true`**, **`reason: 'STALE_LOCK_FENCE'`**, tanpa menimpa record Proses B (`devices` tetap `['DEV-WINNER-B']`, `usedSeats: 1`).
- **`STALE_LOCK_FENCE` (`HTTP 409`) pada `create_payment_order` & Uji Lua `STALE_FENCE` Murni (`Test 4`):** Memverifikasi proses order terlambat tidak dapat menimpa order `paid` yang sudah memiliki `fenceToken: 5` (`HTTP 409 STALE_LOCK_FENCE`), serta menguji langsung `savePaymentOrderRecord` (`FencedWriteConflictError`) dan `atomicSaveSeatRecordWithCas` (`reason: 'STALE_FENCE'`) ketika lock owner cocok tetapi `expectedFenceToken < storedFenceToken`.
- **`LOCK_CONTENTION_TIMEOUT` (`HTTP 409`) Deterministik (`Test 5`):** Mengunci key lock oleh peer (`LOCK_PEER_ACTIVE`) dengan `ASESMERDEKA_LOCK_WAIT_TIMEOUT_MS=60`; baik klaim seat maupun `create_payment_order` gagal bersih **`HTTP 409`**, **`lockContention: true`**, **`reason: 'LOCK_CONTENTION_TIMEOUT'`**, tanpa melepas lock peer atau menulis state Redis apa pun.
- **Konkurensi Last-Seat & Redis Outage Fail-Closed (`Test 6`):** Dua klaim paralel memperebutkan slot ke-2 dari 2 menghasilkan tepat 1 menang (`200`) dan 1 ditolak (`403 seatLimitExceeded: true`), `devices.length === 2` (nol double seat allocation). Mode `outageMode = true` mengembalikan **`HTTP 503 REDIS_UNAVAILABLE`** untuk aktivasi seat, `create_payment_order`, dan `verify_payment_order` dengan `localSeatMemoryStore.size === 0` dan `localPaymentOrderStore.size === 0`.

### C. Pengujian Legacy Fallback Hardening & Primitif Generik (`Test 7` s.d. `Test 10`)
- **Matriks Lifecycle Allowlist (`Test 7`):** Menguji penolakan `403` + konsistensi `check_status` & `evaluateServerLifecycleState` untuk status `revoked`, `pending_reconciliation` (baik pada `lifecycleState` maupun `consistencyState`), `settling`, `pending_payment`, `payment_failed`, `expired` (dengan `expiresAt: null`), `expiresAt` malformed (`'bukan-tanggal-iso'` / `12345`), serta state tak dikenal (`'trial_unverified'`).
- **Missing `lifecycleState` Fail-Closed vs Otoritas Sah (`Test 8`):** Record non-`ASM-*` tanpa `lifecycleState` ditolak `403 paymentUnverified: true` (`MISSING_LIFECYCLE_AND_PAYMENT_AUTHORITY`) bila tidak ada TX atau TX underpaid; namun jika didukung TX `paid` penuh di server untuk `licenseCode` yang sama (`amount >= price`), record historis sah tetap dapat diverifikasi dan menjaga kuota `maxSeats`.
- **Kompatibilitas Historis Valid, Tolak Kode Palsu, & Isolasi Environment (`Test 9`):** Record `active` (`expiresAt: null`) dan `paid` (`expiresAt` masa depan) lolos dengan `legacyRecord: true`; kode non-`ASM` acak -> `400 LICENSE_NOT_FOUND`; kode `ASM-*` palsu -> `403 INVALID_LICENSE_SIGNATURE`; isolasi dua arah `Staging ↔ Production` (`ASM-STG2-*` & legacy bertanda `environment: 'staging'`) utuh.
- **Primitif Keamanan & Tombstone Mayar (`Test 10`):** Unit test langsung `timingSafeEqualStrings` (sama, beda karakter, beda panjang, string kosong) serta konfirmasi `/api/mayar-webhook`, `/api/cron/mayar-reconcile`, dan `create_payment_order(provider='mayar')` tetap `410 MAYAR_DECOMMISSIONED` dengan 0 outbound call ke Mayar.

---

## 4. Perubahan Perilaku Legacy License Fallback

Audit & perbaikan diterapkan pada [`api/activate-license.js`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/api/activate-license.js) (fungsi `validateSeatRecordLifecycle`, `verifyLegacySeatPaymentAuthority`, `checkAndClaimServerSeat`, `check_status`, dan handler legacy non-`ASM-*`):

| Kondisi Record Legacy Non-`ASM-*` | Perilaku Sebelumnya | Perilaku Baru (Hardened Fail-Closed) |
|---|---|---|
| `lifecycleState: 'paid'` / `'active'` + `expiresAt: null` atau tanggal masa depan valid | Diterima (`200`, `legacyRecord: true`) | **Tetap diterima (`200`, `legacyRecord: true`)** via allowlist `ALLOWED_VERIFY_LIFECYCLE_STATES = new Set(['paid', 'active'])` |
| `lifecycleState: 'revoked'` / `revoked: true` / `deleted: true` | Diblokir hanya di Redis blacklist atas; `checkAndClaimServerSeat` tidak memblokir langsung | **Ditolak eksplisit `403`** (`revoked: true`, `lifecycleState: 'revoked'`, `reason: 'LICENSE_REVOKED'`) di dalam lock `checkAndClaimServerSeat` & `check_status` |
| `lifecycleState` atau `consistencyState`: `'pending_reconciliation'` / `'settling'` | **Berisiko lolos** bila tersimpan di record seat karena tidak termasuk blocklist | **Ditolak eksplisit `403`** (`paymentUnverified: true`, `reason: 'PAYMENT_PENDING_RECONCILIATION'` / `'PAYMENT_SETTLING'`) |
| `lifecycleState: 'expired'` dengan `expiresAt: null` / kosong | **Berisiko lolos** karena cek lama hanya memanggil `isLicenseExpired(existing.expiresAt)` | **Ditolak eksplisit `403`** (`expired: true`, `lifecycleState: 'expired'`, `reason: 'LICENSE_EXPIRED'`) |
| `expiresAt` malformed / tipe bukan string (`'invalid-date'`, `12345`) | `Date.parse` menghasilkan `NaN`, lalu `isLicenseExpired` mengembalikan `false` (lolos) | **Ditolak eksplisit `403`** via `hasInvalidExpirationContract` (`expired: true`, `reason: 'INVALID_EXPIRATION_METADATA'`) |
| `lifecycleState` tidak dikenal (di luar `'paid'` & `'active'`) | **Berisiko lolos** karena tidak masuk daftar penolakan | **Ditolak eksplisit `403`** (`paymentUnverified: true`, `reason: 'UNSUPPORTED_LIFECYCLE_STATE'`) |
| Record tanpa `lifecycleState` | Diasumsikan aktif dan dapat diklaim otomatis | **Fail-closed `403`** (`paymentUnverified: true`, `reason: 'MISSING_LIFECYCLE_AND_PAYMENT_AUTHORITY'`) **kecuali** `verifyLegacySeatPaymentAuthority` menemukan catatan order/transaksi `status: 'paid'` di server dengan nominal `>= harga paket` dan `licenseCode` cocok |
| Respons `403` jalur legacy non-`ASM-*` (`api/activate-license.js`) | Field `paymentUnverified` dan `revoked` tidak dikirim pada respons `403` jalur legacy | **`paymentUnverified: Boolean(seatCheck.paymentUnverified)` & `revoked: Boolean(seatCheck.revoked)` selalu dikirim** di `403` jalur legacy maupun `check_status` |
| Race / penghapusan record antara lookup awal & akuisisi lock | `checkAndClaimServerSeat` dapat memperlakukan `existing === null` sebagai aktivasi baru | `requireExistingRecord: true` memaksa `checkAndClaimServerSeat` gagal bersih **`paymentUnverified: true` (`LEGACY_RECORD_NOT_FOUND`)** bila record hilang sebelum lock didapat |

---

## 5. Kontrak Generic Webhook Verifier (Dokumentasi Desain — Section D)

Sesuai batasan Task 13.2, **tidak ada adaptor provider baru maupun reaktivasi Mayar yang diimplementasikan**. Saat nanti AsesMerdeka mengintegrasikan payment gateway pengganti (mis. DOKU / provider adapter masa depan), implementasi **wajib** memenuhi kontrak verifier webhook generik berikut sebelum endpoint webhook baru diaktifkan:

1. **Raw Body Integrity & Constant-Time Signature Verification:**
   - Endpoint wajib membaca byte mentah HTTP request (`rawBody`, bukan hasil re-serialisasi `JSON.stringify(req.body)`) sebagai masukan verifikasi HMAC-SHA256 / RSA-SHA256 (SNAP) sesuai algoritma provider adapter.
   - Seluruh perbandingan secret/signature/Bearer/API-token wajib menggunakan **`timingSafeEqualStrings`** (atau `crypto.timingSafeEqual` pada digest byte tetap).
   - Mendukung **graceful secret rotation** (`CURRENT_SECRET` + `PREVIOUS_SECRET` opsional selama masa transisi) dengan pemisahan ketat `PREVIEW/STAGING` vs `PRODUCTION`.
2. **Transport & Credential Hygiene:**
   - **Dilarang menerima secret/token melalui URL query parameter** (tolak segera HTTP `401 QUERY_SECRET_FORBIDDEN`).
   - Seluruh log diagnostik URL wajib melewati sanitasi `redactWebhookUrlForLog` dan dilarang keras mencatat payload PII mentah atau header autentikasi.
   - Fail-closed HTTP `503` bila secret verifier provider belum dikonfigurasi pada runtime non-local.
3. **Anti-Replay Window & Persistent Event Deduplication:**
   - Wajib memvalidasi timestamp header provider (`|now - timestamp| <= maxSkewSeconds`, mis. 300 detik) dan menolak request kedaluwarsa dengan `401`.
   - Setiap `providerEventId` & `providerTransactionId` wajib diakuisisi dengan **distributed lock (`withDistributedLock`) + Lua fenced CAS (`LUA_COMMIT_WEBHOOK_SETTLEMENT_SCRIPT`)** secara fail-closed ke Redis (HTTP `503` saat Redis down; `409 STALE_LOCK_FENCE` / `LOCK_CONTENTION_TIMEOUT` pada konflik lock).
   - Replay event idempoten untuk `(providerTransactionId, orderId, licenseCode)` yang sama wajib menjaga perangkat/kursi yang sudah terikat tetap utuh; pemakaian ulang 1 `transactionId` untuk order/lisensi berbeda wajib ditolak **`HTTP 409 TRANSACTION_ALREADY_BOUND`**.
4. **Amount, Currency, & Status Authority Verification:**
   - Mata uang non-`IDR` ditolak permanen.
   - Nominal wajib melewati **`parseValidPaymentAmount`** (menolak `null`, `NaN`, `Infinity`, `<= 0`) dan dibandingkan terhadap harga kanonik `SERVER_PLAN_CATALOG[order.planId].price` (tolak `HTTP 400 AMOUNT_MISMATCH`).
   - Status webhook harus melewati verifikasi balik API Otoritatif / Detail Status transaksi provider bila adapter mensyaratkan (tidak pernah mempercayai field status client/redirect URL).
   - Status `pending`/`unpaid` tidak pernah mengaktifkan seat (hanya `pending_payment` / `pending_reconciliation`); status `paid` terlambat tidak boleh diturunkan oleh event `failed`/`expired` yang datang lebih lambat.

---

## 6. Bukti Hasil Eksekusi Tes & Verifikasi (Section E)

Seluruh perintah verifikasi dijalankan ulang setelah perubahan final pada working tree `staging`:

### A. Eksekusi Eksplisit Suite Task 13.2 (`--reporter=verbose`)
Perintah: `npx vitest run src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts --reporter=verbose` (`exit code 0`, durasi `606ms`, `1 passed (1)`, `10 passed (10)`):
- `✓ 1. AMOUNT_MISMATCH (HTTP 400): server menolak transaksi underpaid di verify_payment_order & requirePaymentProof tanpa menerbitkan lisensi atau mengubah seat` (`27ms`)
- `✓ 2. AMOUNT_MISMATCH fail-closed Number.isFinite(Number(txRecord.amount)): amount hilang/null/NaN/Infinity/invalid ditolak HTTP 400` (`8ms`)
- `✓ 3. STALE_LOCK_FENCE (HTTP 409) pada aktivasi seat: proses lambat yang kehilangan lock tidak boleh menimpa pemegang fence baru` (`3ms`)
- `✓ 4. STALE_LOCK_FENCE (HTTP 409) pada create_payment_order & penolakan murni STALE_FENCE oleh Lua saat fenceToken tersimpan lebih tinggi` (`3ms`)
- `✓ 5. LOCK_CONTENTION_TIMEOUT (HTTP 409) deterministik pada aktivasi seat & create_payment_order tanpa mutasi state` (`64ms`)
- `✓ 6. Konkurensi klaim kursi terakhir (Individu 2/2) menolak double allocation & Redis outage tetap fail-closed HTTP 503` (`38ms`)
- `✓ 7. Hardening Legacy non-ASM-* allowlist: tolak eksplisit revoked, pending_reconciliation, settling, suspended, expired (tanpa/invalid expiresAt), dan state tak dikenal` (`11ms`)
- `✓ 8. Legacy non-ASM-* tanpa lifecycleState wajib fail-closed (403 paymentUnverified) kecuali didukung otoritas pembayaran server sah` (`5ms`)
- `✓ 9. Lisensi historis valid (active/paid + lifetime/unexpired) tetap lolos, kode palsu ditolak, & isolasi Staging/Production utuh` (`6ms`)
- `✓ 10. Primitif timingSafeEqualStrings valid & endpoint Mayar tetap 410 MAYAR_DECOMMISSIONED tanpa panggilan keluar` (`2ms`)

### B. Full Vitest, Task 7 & Task 13 Suites, `npm test`, TypeScript, Lint, & Build

| Pemeriksaan | Perintah | Hasil | Bukti / Detail |
|---|---|---|---|
| **Full Vitest Suite** | `npx vitest run` | **PASS** | `Test Files 48 passed (48)`, `Tests 402 passed (402)`, durasi `13.37s`, exit code `0` |
| **Task 7 & Task 13 Regression Suites** *(bagian dari Full Vitest)* | *(termasuk dalam run di atas)* | **ALL PASS** | • `task7LicensingEntitlementIntegrity.test.ts`: **25/25** (`730ms`)<br>• `task7_1PaymentAndAdminSecurity.test.ts`: **18/18** (`120ms`)<br>• `task7_1_1PaymentAuthorityAndWebhookContract.test.ts`: **13/13** (`120ms`)<br>• `task7_1_2MayarIdentityAndDistributedAtomicity.test.ts`: **9/9** (`769ms`)<br>• `task7_1_2_1MayarInvoiceCorrelationAndRecovery.test.ts`: **4/4** (`63ms`)<br>• `task7_1_2_2MayarApiV2AndCronAuth.test.ts`: **3/3** (`15ms`)<br>• `task7_1_3AStagingRedisDiagnostics.test.ts`: **12/12** (`92ms`)<br>• `task7_1_3BCloudSyncOutageAndRecovery.test.ts`: **5/5** (`5517ms`)<br>• `task7_1_3B_2EnvironmentBoundSigning.test.ts`: **20/20** (`123ms`)<br>• `task13_mayarDecommissionRegression.test.ts`: **6/6** (`249ms`)<br>• `task13_2PaymentSecurityAndLegacyFallback.test.ts`: **10/10** (`214ms`) |
| **Production Readiness Suite** | `npm test` (`node --test tests/productionReadiness.test.mjs`) | **PASS** | `30 passed`, `0 failed`, `0 skipped` (termasuk `AUD-207`, `AUD-208`, `AUD-213`, `AUD-218`, `AUD-220`, `AUD-221`), durasi `2201.95ms`, exit code `0` |
| **TypeScript Check** | `npx tsc -b` | **PASS** | `0 errors`, exit code `0` |
| **Linter** | `npm run lint` (`oxlint`) | **PASS** | `0 warnings, 0 errors` pada `203 files` (`114 rules`), durasi `286ms`, exit code `0` |
| **Production Build** | `npm run build` (`tsc -b && vite build`) | **PASS** | `2501 modules transformed`, `✓ built in 869ms`, exit code `0` |

---

## 7. Risiko Tersisa

1. **[Status Pembayaran & Redis Production — Task 13.3]:**
   - **Production Payment Status:** **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`** *(pemilik proyek telah mengonfirmasi secara eksplisit bahwa belum pernah ada pembayaran pelanggan yang selesai di Production sehingga tidak ada kewajiban settlement finansial ataupun fulfillment lisensi Mayar tertunda).*
   - **Production Redis Inspection Status:** **`NOT INDEPENDENTLY VERIFIED`** *(Production Upstash Redis `upstash-kv-sky-fountain`, ID `2a5ff96e-1dbd-4e64-a576-fd2520a656f9`, tetap tidak di-scan secara independen dari workspace ini; seluruh catatan historis `asesmerdeka:mayar:*` tetap dipertahankan).*
2. **[Konsistensi Endpoint Sekunder]:** `api/activate-license.js` kini menolak eksplisit `pending_reconciliation`, `settling`, state tak dikenal, dan missing `lifecycleState` tanpa otoritas bayar; sementara `api/cloud-sync.js` & `api/gemini.js` masih memakai pengecekan status blocklist lama (`expired`, `suspended`, `pending_payment`, `payment_failed`), dan `api/shared-curriculum.js` tetap mengecek kode `ASM-*` / `OFFICIAL_SEEDED_LICENSES`. Disarankan menyelaraskan kedua endpoint tersebut ke helper `validateSeatRecordLifecycle` pada iterasi berikutnya.
3. **[Generic Webhook Verifier Belum Dibangun Sebagai Modul Kode]:** Sengaja hanya didokumentasikan kontraknya pada Task 13.2 Bagian D; wajib diimplementasikan dengan uji lengkap sebelum webhook provider pengganti (mis. DOKU) dibuka.
4. **[Env Vars Usang Vercel]:** Variabel lingkungan `MAYAR_*`, `VITE_MAYAR_*`, dan `VITE_PAYMENT_LINK_*` di Vercel Dashboard tetap perlu dibersihkan pasca-cutover Production stabil (tanpa menyentuh key Redis historis).

---

## 8. Git Diff Summary & Verdict

### Git Diff Summary (Branch `staging`, Uncommitted)
- `staging` HEAD: `911ddac315527733716a6c4eceb48279061fc26e`
- `main` & `origin/main`: `b5072c7a7409f7e36008b66956c24536642566af` *(0 perubahan)*
- Diff kumulatif `api/activate-license.js` terhadap `HEAD` (gabungan Task 13 + Task 13.2): `395 insertions(+), 387 deletions(-)` (kontribusi perubahan murni Task 13.2 pada `api/activate-license.js`: `+311 / -72` baris).
- Untracked files pada working tree `staging`:
  - `src/utils/__tests__/task13_mayarDecommissionRegression.test.ts` (Task 13)
  - `src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts` (Task 13.2)
  - `docs/research/MAYAR_DECOMMISSION_REPORT.md` (Task 13)
  - `docs/research/TASK_13_1_MAYAR_DECOMMISSION_REVIEW.md` (Task 13.1)
  - `docs/research/TASK_13_2_PAYMENT_SECURITY_REGRESSION.md` (Task 13.2)
  *(Selain dokumen riset lain yang memang berada di `docs/research/`).*

### Final Verdict
- **Acceptance Criteria Task 13.2:** **`PASS`** — Ketiga celah regression coverage (`AMOUNT_MISMATCH` + `Number.isFinite`, `STALE_LOCK_FENCE` + `LOCK_CONTENTION_TIMEOUT`, dan legacy fallback allowlist + `paymentUnverified`) telah ditutup secara deterministik, tanpa melonggarkan guard keamanan, tanpa mengaktifkan kembali Mayar, tanpa mengubah `main`/Production, dan seluruh suite (`48/48` file / `402/402` tes Vitest, `30/30` `npm test`, `tsc -b`, `oxlint`, `vite build`) lulus 100%.
- **Pembaruan Status Release Readiness (Task 13.3):** **`READY FOR STAGING PREVIEW`** — Dengan **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`** dan **`Redis Inspection: NOT INDEPENDENTLY VERIFIED`** (catatan historis tetap utuh). Lihat [`TASK_13_3_MAYAR_RETIREMENT_RELEASE_CHECKLIST.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/research/TASK_13_3_MAYAR_RETIREMENT_RELEASE_CHECKLIST.md).
