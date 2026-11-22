# Laporan Decommission Payment Gateway Mayar — AsesMerdeka

- **Tanggal:** 22 November 2026
- **Branch Pengerjaan:** `staging` (`HEAD` tetap di `911ddac315527733716a6c4eceb48279061fc26e`, belum di-commit/push)
- **Baseline Production (`main` & `origin/main`):** `b5072c7a7409f7e36008b66956c24536642566af` (tidak tersentuh)
- **Status Akhir:** **READY FOR STAGING PREVIEW** *(Pembaruan Task 13.2 **`PASS`** & Task 13.3 | Production Payment Status: **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`** | Production Redis Inspection: **`NOT INDEPENDENTLY VERIFIED`**)*

---

## 1. Ringkasan Eksekutif & Penilaian Akhir (`CONDITIONAL PASS`)

Keputusan bisnis untuk menghentikan penggunaan **Mayar (`mayar.id`)** sebagai payment provider aktif pada AsesMerdeka telah diimplementasikan secara menyeluruh pada branch `staging` tanpa mengganggu alur bisnis aktif maupun data historis pelanggan.

**Alasan Status `CONDITIONAL PASS` (Jujur & Terukur):**
1. **Seluruh Kriteria Teknis, Kode, UI, API, Konfigurasi, dan Regresi — PASS 100%:**
   - Tidak ada checkout/invoice/payment link/webhook/cron Mayar baru yang dapat dijalankan (endpoint terkait mengembalikan `HTTP 410 Gone` dengan `reason: 'MAYAR_DECOMMISSIONED'`).
   - Tidak ada referensi Mayar di UI aktif (`LicenseModal.tsx`, `AdminSettingsTab.tsx`), CSP (`vercel.json`), dev middleware (`vite.config.ts`), pembacaan env aktif (`process.env.MAYAR_*` & `VITE_MAYAR_*` / `VITE_PAYMENT_LINK_*`), maupun koneksi jaringan keluar ke `api.mayar.*`.
   - Seluruh jalur historis Redis (`asesmerdeka:mayar:*`), 135 kode lisensi seeded (`OFFICIAL_SEEDED_LICENSES`), dan catatan kursi pelanggan non-`ASM-*` yang sudah tersimpan (`asesmerdeka:seats:v1:*`) tetap terbaca dan berfungsi tanpa memanggil Mayar.
   - Seluruh alur aktif tetap berjalan penuh: checkout manual WhatsApp Admin (`https://wa.me/6282114625243`), aktivasi lisensi Guru Mandiri & Kolektif Sekolah (25 guru × 2 perangkat), Payment Authority Registry generik, isolasi environment `staging` (`ASM-STG2-*`) vs `production`, seat locks, dan Admin Portal.
   - `npx tsc -b` (0 error), `npm run lint` (0 warning, 0 error pada 202 file), `npm run build` (berhasil, 2.501 modul), `npx vitest run` (47 file, 392/392 tes lulus), dan `npm test` (30/30 tes lulus).
2. **Satu Kondisi Operasional Pra-Promosi (Belum Dapat Diakses dari Workspace Staging):**
   - Sesuai aturan keselamatan task, workspace lokal `staging` **tidak mengakses/memodifikasi Redis Production (`upstash-kv-sky-fountain`) maupun konfigurasi Vercel Dashboard** (terlebih Data Browser Production memerlukan 2FA Upstash). Oleh karena itu, status transaksi Mayar nonterminal (`PENDING`, `PROCESSING`, atau antrean `asesmerdeka:mayar:reconcile_queue:v1`) di Redis **Production langsung** belum diinspeksi secara live.
   - Kondisi ini wajib diverifikasi secara **read-only** oleh pemilik proyek melalui Upstash Console (2FA) sebelum melakukan promosi `staging` ke `main` (lihat Bagian 8).

---

## 2. Inventory Awal Integrasi Mayar

Audit menyeluruh di seluruh repositori sebelum perubahan menemukan komponen berikut:

| Kategori | File / Komponen | Peran Sebelum Decommission |
|---|---|---|
| **Serverless API** | `api/mayar-webhook.js` (2.840 baris) | Webhook receiver aktif Mayar (`payment.received`, `payment.pending`, `payment.failed`, `license.renewed`), korelasi API V2 (`/hl/v2/invoices/{id}`), Lua CAS settlement commit |
| **Serverless Cron** | `api/cron/mayar-reconcile.js` (144 baris) | Scheduled cron rekonsiliasi transaksi Mayar pending via `reconcilePendingWebhooks` |
| **Serverless License & Order** | `api/activate-license.js` (3.272 baris) | `resolveMayarApiV2Config`, `createMayarInvoiceViaApi`, opsi `createMayarInvoice`/`mayarInvoiceId` pada `create_payment_order`, serta fallback verifikasi online Mayar (`/saas/v2/license/verify`) dan pesan `kycPending` |
| **Serverless Diagnostics** | `api/diagnostics/staging-redis.js` | Mengimpor helper generik `timingSafeEqualStrings` dari `../mayar-webhook.js` |
| **Master Seeds** | `api/officialSeeds.js`, `src/data/officialSeeds.ts` | 135 kode lisensi historis (100 berlabel `Stok Mayar.id #1..100`, 25 `Pegangan Bibi`, 10 `Kolektif Sekolah`) |
| **Konfigurasi** | `vercel.json`, `vite.config.ts`, `.env.example`, `.env` | `https://api.mayar.id` pada CSP `connect-src` (`vercel.json`), mount `/api/mayar-webhook` di `devApiPlugin` (`vite.config.ts`), variabel `MAYAR_*`, `VITE_PAYMENT_LINK_*`, `VITE_MAYAR_*` di `.env.example` (catatan: `.env` tidak diubah) |
| **Dependensi NPM** | `package.json` | **0 paket Mayar** (tidak ada SDK/library khusus Mayar di `dependencies` maupun `devDependencies`) |
| **Frontend Utilities** | `src/utils/paymentGateway.ts`, `src/utils/licenseManager.ts` | `getMayarPaymentLink`, `saveMayarPaymentLinks`, `externalCheckoutUrl` Mayar, `getMayarProductId`/`SchoolProductId`, `verifyMayarLicenseOnline`, key local cache `asesmerdeka_verified_mayar_codes_v1` |
| **Frontend UI** | `src/components/admin/AdminSettingsTab.tsx`, `src/components/LicenseModal.tsx` | Card 1 *Integrasi Checkout Mayar.id* (4 input URL & Product ID) di Admin Settings; pemanggilan `verifyMayarLicenseOnline` & pesan fallback menyebut `Mayar.id` di `LicenseModal` |
| **Redis Keys** | `asesmerdeka:mayar:order:v1:*`, `asesmerdeka:mayar:tx:v1:*`, `asesmerdeka:mayar:event:v1:*`, `asesmerdeka:mayar:inv_idx:v1:*`, `asesmerdeka:mayar:reconcile_queue:v1`, `asesmerdeka:mayar:webhook_audit:v1` | Penyimpanan order, transaksi webhook, event idempotency, reverse index invoice Mayar, antrean rekonsiliasi, & audit log |
| **Dokumentasi & Tests** | `docs/superpowers/plans/2026-11-06-mayar-model-a-license-integration.md`, `docs/LICENSE_ENVIRONMENT_ISOLATION.md`, `docs/superpowers/specs/2026-11-08-admin-portal-design.md`, 8 suite Vitest (`task7*`, `task9*`, `task10*`, dll.), `tests/productionReadiness.test.mjs` | Dokumentasi rencana integrasi awal, skenario webhook/API V2/cron/isolasi |

---

## 3. File yang Diubah, Dipensiunkan, dan Ditambahkan

File lama endpoint tidak dihapus mentah agar routing SPA fallback `{ "source": "/(.*)", "destination": "/index.html" }` pada `vercel.json` tidak membalas `HTTP 200 index.html` ke webhook retry lama, melainkan diubah menjadi tombstone `HTTP 410 Gone` (`MAYAR_DECOMMISSIONED`).

### File Runtime & Konfigurasi (Diubah / Dipensiunkan)
1. `api/activate-license.js` — Mengekspor `timingSafeEqualStrings`; memensiunkan `resolveMayarApiV2Config` dan `createMayarInvoiceViaApi` (nol akses env `MAYAR_*`, nol `fetch`); menolak parameter Mayar pada `create_payment_order` (`HTTP 410`); menetralkan pesan `verify_payment_order`; mengganti fallback API Mayar dengan lookup catatan kursi historis di Redis (`getSeatRecordFromRedis`) sebelum menolak kode tak dikenal (`HTTP 400 LICENSE_NOT_FOUND`, `providerRetired: 'mayar'`, tanpa `kycPending`).
2. `api/mayar-webhook.js` — Dipensiunkan permanen (`HTTP 410 Gone`, `MAYAR_DECOMMISSIONED`, nol baca `MAYAR_*`, nol `fetch`, nol mutasi Redis); mempertahankan re-ekspor symbol generik/bacaan historis serta stub `reconcilePendingWebhooks`, `correlateMayarTransactionViaApi`, `verifyMayarWebhookSignature` yang aman agar modul/tes lama tidak rusak saat resolve ESM.
3. `api/cron/mayar-reconcile.js` — Dipensiunkan permanen (`HTTP 410 Gone`, `MAYAR_DECOMMISSIONED`), mempertahankan guard `GET`-only (`405`), tolak secret di query (`401`), `Cache-Control: no-store`, dan validasi `Authorization: Bearer CRON_SECRET` bila `CRON_SECRET` dikonfigurasi, tanpa menyentuh Redis maupun Mayar.
4. `api/diagnostics/staging-redis.js` — Memindahkan impor `timingSafeEqualStrings` dari `../mayar-webhook.js` ke `../activate-license.js` (0 ketergantungan ke modul Mayar).
5. `vercel.json` — Menghapus `https://api.mayar.id` dari direktif CSP `connect-src`.
6. `vite.config.ts` — Menghapus mounting `'/api/mayar-webhook': 'api/mayar-webhook.js'` pada `devApiPlugin`.
7. `.env.example` — Menghapus deklarasi variabel aktif `MAYAR_*`, `VITE_PAYMENT_LINK_*`, dan `VITE_MAYAR_*`, serta memberi catatan status `RETIRED`.
8. `src/utils/paymentGateway.ts` — `getMayarPaymentLink` selalu `''`, `saveMayarPaymentLinks` menjadi no-op `@deprecated`, menghapus pembacaan `VITE_PAYMENT_LINK_*` dan `externalCheckoutUrl` Mayar, menetralkan pesan error browser (`Mayar.id` → server pembayaran AsesMerdeka), sambil menjaga lookup kunci historis `asesmerdeka:mayar:order:v1:*` & `tx:v1:*` serta alur WhatsApp Admin.
9. `src/utils/licenseManager.ts` — Mengekspor `verifyLicenseOnline` generik (dan menjaga alias `@deprecated verifyMayarLicenseOnline`), mengosongkan `getMayarProductId`/`getMayarSchoolProductId` (nol akses `VITE_MAYAR_*`), menetralkan pesan error kode tidak ditemukan, sambil mempertahankan kompatibilitas cache perangkat historis (`asesmerdeka_verified_mayar_codes_v1`).
10. `src/components/LicenseModal.tsx` — Memakai `verifyLicenseOnline`, menghapus referensi/pesan `Mayar.id`, mempertahankan UI 2 paket utama + checkout WhatsApp Admin.
11. `src/components/admin/AdminSettingsTab.tsx` — Menghapus Card 1 *Integrasi Checkout Mayar.id* beserta 4 input URL/Product ID dan state-nya; menggantinya dengan Card informasional *1. Kanal Pembelian Lisensi Aktif (WhatsApp Admin Manual)* serta mempertahankan Card 2 (*Device Seat Binding*) dan Card 3 (*Cloud Seat Tracker*).

### Dokumentasi Historis (Dilabeli, Tidak Dihapus)
12. `docs/superpowers/plans/2026-11-06-mayar-model-a-license-integration.md` — Ditambahkan banner `STATUS: RETIRED — HISTORICAL REFERENCE ONLY`.
13. `docs/LICENSE_ENVIRONMENT_ISOLATION.md` — Memperbarui catatan butir 5 bahwa `/api/mayar-webhook` & fallback Mayar telah dipensiunkan permanen (`HTTP 410 Gone`).
14. `docs/superpowers/specs/2026-11-08-admin-portal-design.md` — Ditambahkan catatan historis `RETIRED — HISTORICAL REFERENCE ONLY` pada bagian Tab 3.

### Pengujian (Diperbarui & Ditambahkan)
15. `src/utils/__tests__/task7LicensingEntitlementIntegrity.test.ts` — Skenario 12–16 beralih ke Payment Authority Registry & validasi `410 Gone` webhook.
16. `src/utils/__tests__/task7_1PaymentAndAdminSecurity.test.ts` — Tes zero-trust browser, Payment Authority server, & Admin Portal tetap aktif; skenario khusus webhook Mayar ditandai `RETIRED` (`410 Gone`).
17. `src/utils/__tests__/task7_1_1PaymentAuthorityAndWebhookContract.test.ts` — Persistensi Redis, lintas-isolate restart, & keselamatan data akademik tetap aktif; skenario webhook Mayar ditandai `RETIRED` (`410 Gone`).
18. `src/utils/__tests__/task7_1_2MayarIdentityAndDistributedAtomicity.test.ts` — Scenario D (race last seat 2 worker), Scenario F (Redis outage fail-closed `503`), & Scenario 9 (data akademik + lookup historis) tetap aktif; skenario webhook ditandai `RETIRED` (`410 Gone`).
19. `src/utils/__tests__/task7_1_2_1MayarInvoiceCorrelationAndRecovery.test.ts` — Ditandai `RETIRED` (digantikan `task13_mayarDecommissionRegression.test.ts`); memverifikasi penolakan `410 Gone` serta keterbacaan read-only seluruh prefix `asesmerdeka:mayar:*`.
20. `src/utils/__tests__/task7_1_2_2MayarApiV2AndCronAuth.test.ts` — Ditandai `RETIRED`; memverifikasi audit statis nol `process.env.MAYAR_*` & `api.mayar.*` di `api/` dan `vercel.json`, stub API V2 retired, serta security guards + `410 Gone` pada cron.
21. `src/utils/__tests__/task7_1_3AStagingRedisDiagnostics.test.ts` — Tes 5 diperbarui untuk memverifikasi `/api/cron/mayar-reconcile` mengembalikan `410 Gone` tanpa menyentuh Redis/Mayar.
22. `src/utils/__tests__/task7_1_3B_2EnvironmentBoundSigning.test.ts` — Tes 15 & 16 mempertahankan seluruh penegakan batas environment di `activate-license`/`admin-portal`/`cloud-sync`/`gemini`/`shared-curriculum`, sekaligus memastikan webhook Mayar `410 Gone` tanpa mutasi serta menghapus 1 import tak terpakai.
23. `tests/productionReadiness.test.mjs` — Memperbarui `AUD-207`, `AUD-208` (penolakan `400 LICENSE_NOT_FOUND` + tetap mengaktifkan catatan kursi non-`ASM-*` historis tanpa memanggil Mayar), dan `AUD-220` (`/api/mayar-webhook` `410 Gone` + aktivasi lisensi resmi & sinkronisasi ke Admin Portal).
24. **[BARU]** `src/utils/__tests__/task13_mayarDecommissionRegression.test.ts` — Suite regresi khusus decommission Mayar (6 kelompok uji penuh).
25. **[BARU]** `docs/research/MAYAR_DECOMMISSION_REPORT.md` — Laporan decommission ini.

---

## 4. Endpoint yang Dipensiunkan

| Method & Path | Perilaku Baru | Respons & Status HTTP |
|---|---|---|
| `GET/POST /api/mayar-webhook` | Permanently Retired | `HTTP 410 Gone`, `Cache-Control: no-store`, `{ ok: false, retired: true, provider: 'mayar', reason: 'MAYAR_DECOMMISSIONED' }` (`OPTIONS` tetap `200`). Nol baca env `MAYAR_*`, nol `fetch`, nol mutasi Redis. |
| `GET /api/cron/mayar-reconcile` | Permanently Retired | Mempertahankan guard metode (`405`), tolak query secret (`401 QUERY_SECRET_FORBIDDEN`), validasi `Bearer CRON_SECRET` bila terpasang (`401 UNAUTHORIZED_CRON`), lalu mengembalikan `HTTP 410 Gone` (`MAYAR_DECOMMISSIONED`). Non-aktif menyentuh Redis maupun Mayar. |
| `POST /api/activate-license` (`action: 'create_payment_order'` dengan `createMayarInvoice`, `mayarInvoiceId`, atau `provider: 'mayar'`) | Ditolak Permanen | `HTTP 410 Gone`, `{ ok: false, retired: true, provider: 'mayar', reason: 'MAYAR_DECOMMISSIONED' }`. |
| `POST /api/activate-license` (fallback non-`ASM-*` ke Mayar API) | Diganti Historical Seat Lookup + Clean Rejection | Pertama mengecek `getSeatRecordFromRedis(rawCode)`: bila catatan historis ada di Redis dan lolos batas environment, klaim seat tetap berjalan; bila tidak ada, mengembalikan `HTTP 400` `{ valid: false, reason: 'LICENSE_NOT_FOUND', providerRetired: 'mayar' }` tanpa memanggil Mayar atau mengembalikan `kycPending`. |

---

## 5. Cron Jobs yang Dinonaktifkan

- Endpoint `/api/cron/mayar-reconcile` telah dipensiunkan permanen (`HTTP 410 Gone`, nol proses rekonsiliasi, nol akses Redis/Mayar).
- Pemeriksaan pada `vercel.json` memastikan **tidak ada** blok `"crons"` aktif yang menjadwalkan `/api/cron/mayar-reconcile` maupun job Mayar lain.

---

## 6. Environment Variables yang Tidak Lagi Digunakan

Seluruh pembacaan variabel berikut telah dihapus dari kode aplikasi (`api/*.js` dan `src/**`) serta dari `.env.example` (tidak ada nilai rahasia yang dibuka atau ditampilkan dalam laporan ini):

**Server-side (Vercel Serverless):**
- `MAYAR_API_KEY`
- `MAYAR_WEBHOOK_SECRET`
- `MAYAR_WEBHOOK_SECRET_PREVIOUS`
- `MAYAR_API_BASE_URL`
- `MAYAR_SANDBOX`
- `MAYAR_ENV`
- `MAYAR_API_TIMEOUT_MS`
- `MAYAR_PRODUCT_ID`
- `MAYAR_SCHOOL_PRODUCT_ID`

**Client-side (Vite Build):**
- `VITE_PAYMENT_LINK_INDIVIDU`
- `VITE_PAYMENT_LINK_SEKOLAH`
- `VITE_MAYAR_PRODUCT_ID`
- `VITE_MAYAR_SCHOOL_PRODUCT_ID`

**Catatan Variabel Generik yang Tetap Digunakan:**
- `CRON_SECRET` tetap dipertahankan karena dipakai oleh endpoint diagnostik `/api/diagnostics/staging-redis` dan guard auth cron internal.
- `GEMINI_API_KEY`, `ADMIN_PIN`, `ASESMERDEKA_LICENSE_SIGNING_SECRET`, `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET`, `UPSTASH_REDIS_REST_*`, `CLOUD_SYNC_PIN_PEPPER*`, dan `VITE_MAX_INDIVIDU_DEVICES` tetap aktif dan tidak diubah.
- Penghapusan variabel `MAYAR_*` / `VITE_MAYAR_*` / `VITE_PAYMENT_LINK_*` dari Vercel Dashboard **tidak dilakukan dalam task ini** sesuai larangan mengubah konfigurasi Vercel/Production dan aman dilakukan secara administratif *setelah* promosi mendatang.

---

## 7. Historical Records & Lisensi Pelanggan yang Dipertahankan

Seluruh aset historis dan hak pelanggan lama dilindungi 100%:
1. **Redis Historical Keys (`asesmerdeka:mayar:*`):** Tidak ada perintah `DEL`/penghapusan. Helper baca server (`getPaymentOrderRecord`, `getWebhookTransactionRecord`, `getWebhookEventRecord`, `getOrderIdByMayarInvoiceId`, `getReconcileQueueRecords`, `getSanitizedWebhookAuditLog`) serta `action: 'verify_payment_order'` pada `api/activate-license.js` dan fallback map historis pada `src/utils/paymentGateway.ts` tetap membaca key berprefix `asesmerdeka:mayar:*` secara utuh.
2. **135 Kode Lisensi Seeded (`OFFICIAL_SEEDED_LICENSES`):** Seluruh kode di `api/officialSeeds.js` dan `src/data/officialSeeds.ts` (100 kode stok individu + 25 kode Pegangan Bibi + 10 kode Kolektif Sekolah) dipertahankan tanpa pengurangan satu kode pun.
3. **Catatan Kursi Pelanggan Lama (`asesmerdeka:seats:v1:*`):** Pada `api/activate-license.js`, kode non-`ASM-*` yang sudah tercatat sebelumnya di Redis (`getSeatRecordFromRedis(rawCode)`) tetap dapat melakukan aktivasi/klaim perangkat kedua sesuai `maxSeats` dan status lifecycle-nya tanpa menghubungi Mayar.
4. **Cache Verifikasi Lokal Perangkat (`asesmerdeka_verified_mayar_codes_v1`):** Tetap dipertahankan pada `src/utils/licenseManager.ts` agar perangkat pelanggan yang sudah pernah aktif tetap terdeteksi offline maupun online.
5. **Dokumentasi Historis:** `docs/superpowers/plans/2026-11-06-mayar-model-a-license-integration.md` dan spesifikasi terkait dipertahankan utuh dengan label jelas `RETIRED — HISTORICAL REFERENCE ONLY`.

---

## 8. Status Transaksi Mayar Nonterminal & Prosedur Penanganan

**Kondisi Fakta Saat Ini:**
- Pada UI aplikasi produksi sebelumnya (Task 9.0), alur klik paket pada `LicenseModal.tsx` sudah diarahkan ke pembelian manual **WhatsApp Admin** alih-alih checkout link Mayar otomatis.
- Dari workspace lokal `staging` ini, **Redis Production (`upstash-kv-sky-fountain`) TIDAK diakses** (dilarang menyentuh Production dan dilindungi 2FA Upstash Console). Oleh karena itu, keberadaan key `asesmerdeka:mayar:reconcile_queue:v1` atau key `asesmerdeka:mayar:order:v1:*` berstatus nonterminal (`pending_payment`, `pending_reconciliation`, `settling`) di Redis Production **belum terverifikasi secara live** dan tidak boleh diklaim nihil tanpa bukti.

**Checklist Wajib Read-Only Pra-Promosi (Oleh Pemilik Proyek via Upstash Console 2FA):**
1. Buka Data Browser Upstash untuk database Production `upstash-kv-sky-fountain` (`2a5ff96e-1dbd-4e64-a576-fd2520a656f9`).
2. Periksa key `asesmerdeka:mayar:reconcile_queue:v1` dan key bertipe `asesmerdeka:mayar:order:v1:*` yang memiliki `status !== 'paid'` atau `status === 'settling'`.
3. Jika ditemukan transaksi nonterminal yang berpotensi sudah dibayar pelanggan:
   - **Jangan** menghapus record Redis maupun memaksa penerbitan lisensi otomatis tanpa verifikasi pembayaran.
   - Verifikasi bukti transfer/pembayaran secara manual bersama pembeli; apabila sah terbayar, terbitkan lisensi resmi `ASM-GM26-*` / `ASM-SK26-*` melalui Admin Portal dengan label merujuk `orderId` lama.
4. Jika antrean kosong dan tidak ada order nonterminal terbayar yang tertunda, promosi dari `staging` ke `main` dapat dilanjutkan.

---

## 9. Komponen Generik yang Dipertahankan & Arsitektur Payment Provider Masa Depan

### Komponen Generik yang Dipertahankan
- `withDistributedLock` + `fenceToken` + Lua CAS helpers (`api/activate-license.js`)
- `timingSafeEqualStrings` & `redactWebhookUrlForLog`
- Payment Authority Registry (`create_payment_order`, `verify_payment_order`, `SERVER_PLAN_CATALOG`)
- Mekanisme `Device Seat Binding` (`checkAndClaimServerSeat`, 2 perangkat untuk Guru Mandiri, 25 guru × 2 perangkat untuk Sekolah)
- Checkout manual WhatsApp Admin (`buildAdminWhatsAppPurchaseUrl` di `src/utils/paymentGateway.ts` & `LicenseModal.tsx`)
- Isolasi kriptografis environment `ASM-STG2-*` (`validateLicenseEnvironmentBoundary`, `validateStagingBranchContext`)
- Admin Portal (`api/admin-portal.js` dan komponen `src/components/admin/*`)

### Arsitektur Payment Provider Masa Depan (`Provider Adapter Pattern`)
Sesuai desain target dan ketentuan pemisahan sistem (belum diimplementasikan dalam task ini), setiap integrasi payment gateway berikutnya wajib memakai arsitektur **Provider Adapter** agar tidak lagi terikat ke API satu vendor:

```text
Checkout Request (Order Server)
   └── PaymentCheckoutProviderAdapter (misal DOKU / Midtrans / Xendit)
          ├── Isolasi Adapter Checkout: membuat sesi pembayaran & mengembalikan orderId kanonik AsesMerdeka
          ├── Isolasi Webhook Handler: endpoint khusus per provider (/api/webhooks/<provider>) yang memverifikasi signature provider lalu memanggil core settlement generik
          ├── Isolasi Settlement Reconciliation: job rekonsiliasi terpisah berstatus eksplisit (pending_settlement -> settled) berdasarkan laporan settlement T+N provider
          ├── Isolasi Payout Provider: adapter pencairan/disbursement (misal Domestic Payouts) terpisah dari adapter checkout penerimaan pembayaran
          └── Reseller Ledger & Seat Registry Provider-Agnostic: buku besar reseller, perhitungan fee, & hak lisensi hanya membaca entitas order/settlement kanonik internal AsesMerdeka tanpa ketergantungan ke skema API vendor eksternal
```

---

## 10. Hasil Pengujian Regresi & Verifikasi (Setelah Edit Terakhir)

Seluruh pemeriksaan berikut dijalankan ulang di `C:\Users\fajar\.gemini\antigravity\scratch\asesmerdeka` setelah perubahan terakhir dan lulus 100% tanpa skip:

| Pemeriksaan | Perintah | Hasil Observasi Eksak |
|---|---|---|
| TypeScript | `npx tsc -b` | Lulus — exit code `0`, 0 error |
| Linter | `npm run lint` (`oxlint`) | Lulus — `Found 0 warnings and 0 errors` (202 file, 114 aturan, 211ms) |
| Production Build | `npm run build` (`tsc -b && vite build`) | Lulus — 2.501 modul ditransformasi, `dist/` selesai dalam `806ms` |
| Unit & Regression Suite | `npx vitest run --reporter=default` | **Lulus 100%** — `Test Files 47 passed (47)`, `Tests 392 passed (392)`, 0 failed, 0 skipped (11.85s), mencakup 6 skenario baru di `task13_mayarDecommissionRegression.test.ts` serta seluruh tes lisensi, sekolah, Admin Portal, Cloud Sync, Payment Authority, dan isolasi environment |
| Production Readiness Suite | `npm test` (`node --test tests/productionReadiness.test.mjs`) | **Lulus 100%** — `tests 30`, `pass 30`, `fail 0`, `skipped 0` (`AUD-002` s.d. `AUD-224`, 1726.7ms) |
| Residual Runtime Scan | Scan Python seluruh `src/`, `api/`, `vercel.json`, `vite.config.ts`, `.env.example`, `package.json` | 0 pembacaan `process.env.MAYAR_*`, 0 URL `api.mayar.*`, 0 elemen UI Mayar di `LicenseModal.tsx` & `AdminSettingsTab.tsx`, 0 paket Mayar di `package.json`. Hanya tersisa read-key historis `asesmerdeka:mayar:*`, local key kompatibilitas `asesmerdeka_verified_mayar_codes_v1`, 135 label stok seeded, stub/alias `@deprecated`, & tombstone `410 Gone`. |

---

## 11. Git Diff Summary & Konfirmasi Production Tidak Berubah

- **Branch Aktif:** `staging`
- **Commit & Push:** **TIDAK ADA** `git commit` maupun `git push` yang dilakukan (perubahan bersifat lokal/uncommitted di working tree `staging`).
- **Verifikasi Hash Branch:**
  - `HEAD` (`staging`): `911ddac315527733716a6c4eceb48279061fc26e` (tetap sama)
  - `main`: `b5072c7a7409f7e36008b66956c24536642566af` (tidak berubah)
  - `origin/main`: `b5072c7a7409f7e36008b66956c24536642566af` (tidak berubah)
- **Konfirmasi Production:** Tidak ada perubahan ke `main`, tidak ada deployment Production, tidak ada perubahan environment variables atau konfigurasi Vercel, dan tidak ada penghapusan/modifikasi data Redis Production.

**Ringkasan `git diff --stat`:**
- 23 file dimodifikasi: `1303 insertions(+), 7324 deletions(-)`
  - `.env.example` (-27 net line cleanup), `api/activate-license.js` (-437 net diff), `api/cron/mayar-reconcile.js`, `api/diagnostics/staging-redis.js`, `api/mayar-webhook.js` (2.604 baris runtime diganti tombstone `410`), `docs/LICENSE_ENVIRONMENT_ISOLATION.md`, `docs/superpowers/plans/2026-11-06-mayar-model-a-license-integration.md`, `docs/superpowers/specs/2026-11-08-admin-portal-design.md`, `src/components/LicenseModal.tsx`, `src/components/admin/AdminSettingsTab.tsx`, `src/utils/licenseManager.ts`, `src/utils/paymentGateway.ts`, `vercel.json`, `vite.config.ts`, `tests/productionReadiness.test.mjs`, dan 8 file tes Vitest terkait.
- 2 file baru ditambahkan:
  - `src/utils/__tests__/task13_mayarDecommissionRegression.test.ts`
  - `docs/research/MAYAR_DECOMMISSION_REPORT.md`

---

## 12. Addendum Pembaruan Status (Task 13.2 & Task 13.3)

1. **Task 13.2 — **`PASS`** ([`TASK_13_2_PAYMENT_SECURITY_REGRESSION.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/research/TASK_13_2_PAYMENT_SECURITY_REGRESSION.md)):**
   - Memulihkan regression test keamanan pembayaran yang hilang pada audit Task 13.1: server-side `AMOUNT_MISMATCH` (`HTTP 400`) + validasi ketat `Number.isFinite(Number(txRecord.amount))`, `STALE_LOCK_FENCE` (`HTTP 409`), `LOCK_CONTENTION_TIMEOUT` (`HTTP 409`), serta menambahkan `src/utils/__tests__/task13_2PaymentSecurityAndLegacyFallback.test.ts` (`10` test deterministik).
   - Memperketat fallback lisensi legacy non-`ASM-*` pada [`api/activate-license.js`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/api/activate-license.js) dengan allowlist eksplisit `ALLOWED_VERIFY_LIFECYCLE_STATES = Set(['paid', 'active'])`, menolak `revoked`, `suspended`, `pending_reconciliation`, `settling`, `pending_payment`, `payment_failed`, `expired` (tanpa/dengan `expiresAt` tidak valid), dan record tanpa `lifecycleState` yang tidak memiliki bukti pembayaran terverifikasi di server (`403 paymentUnverified: true`).
2. **Hasil Verifikasi Terbaru (Fresh Run pada Branch `staging`):**
   - `npx vitest run`: **402/402 tests passed** (`48/48` file, `13.55s`, exit code `0`).
   - `npm test`: **30/30 production readiness tests passed** (`2280.66ms`, exit code `0`).
   - `npx tsc -b`: **PASS** (`0 errors`, exit code `0`).
   - `npm run lint`: **PASS** (`0 warnings, 0 errors`, `203` file, `335ms`, exit code `0`).
   - `npm run build`: **PASS** (`2501` modul, `1.04s`, exit code `0`).
3. **Konfirmasi Bisnis & Status Redis Production (Task 13.3):**
   - **Production Payment Status:** **`OWNER-CONFIRMED: NO PRODUCTION PAYMENTS`** — Pemilik proyek mengonfirmasi secara eksplisit bahwa **belum pernah ada pembayaran pelanggan yang selesai di Production**, sehingga tidak ada transaksi Mayar berbayar yang memerlukan settlement finansial atau fulfillment lisensi.
   - **Production Redis Inspection Status:** **`NOT INDEPENDENTLY VERIFIED`** — Database Production Upstash Redis (`upstash-kv-sky-fountain`) **tidak di-scan secara independen** dari workspace ini.
   - **Historical Data Preservation:** Seluruh catatan pembayaran historis (`asesmerdeka:mayar:*`), catatan kursi (`asesmerdeka:seats:v1:*`), dan 135 kode seeded resmi tetap dipertahankan tanpa penghapusan.
4. **Checklist Final Kesiapan Rilis:** Lihat [`TASK_13_3_MAYAR_RETIREMENT_RELEASE_CHECKLIST.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/research/TASK_13_3_MAYAR_RETIREMENT_RELEASE_CHECKLIST.md) — Status: **`READY FOR STAGING PREVIEW`**.
5. **Ringkasan `git diff` Kumulatif Branch `staging` (Pre-Commit):** `23` file termodifikasi (`1595 insertions(+), 7377 deletions(-)`), ditambah file tes & laporan riset Task 13/13.1/13.2/13.3 (`HEAD` tetap `911ddac315527733716a6c4eceb48279061fc26e`, `main` tetap `b5072c7a7409f7e36008b66956c24536642566af`).
