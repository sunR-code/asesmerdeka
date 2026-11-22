# Isolasi & Penandatanganan Lisensi Berbasis Environment & Git Branch (Production vs Staging Preview)

Dokumen ini menjelaskan arsitektur pemisahan lisensi antara environment **Production** dan **Vercel Preview (`staging` branch)** setelah **Task 7.1.3B.2.1**.

## 1. Format Kode Lisensi

### A. Format Production / Legacy (Tidak Berubah — 100% Kompatibel)
Seluruh lisensi Production yang sudah terbit dan stok resmi tetap menggunakan format lama tanpa perubahan apa pun:
- `ASM-GM26-<CIPHER1>-<CIPHER2>-<SIG>` (Guru Mandiri, max 2 perangkat)
- `ASM-SL26-<CIPHER1>-<CIPHER2>-<SIG>` (Guru Solo, max 1 perangkat)
- `ASM-GP26-<CIPHER1>-<CIPHER2>-<SIG>` (Pro AI, max 2 perangkat)
- `ASM-SK26-<CIPHER1>-<CIPHER2>-<SIG>` (Sekolah Kolektif, max 25 guru × 2 perangkat/guru)
- `ASM-SP26-<CIPHER1>-<CIPHER2>-<SIG>` (Sekolah Pro AI, max 25 guru × 2 perangkat/guru)
- `ASM-DV26-XXXXXX` (Lisensi perangkat 1 device)
- Daftar `OFFICIAL_SEEDED_LICENSES` (Production master seeds)

Pelanggan lama **tidak perlu** migrasi atau mengganti kode lisensi mereka.

### B. Format Staging / Preview (`ASM-STG2-*`)
Setiap lisensi baru yang diterbitkan pada environment **Vercel Preview (`VERCEL_ENV === 'preview'`) khusus branch Git `staging` (`VERCEL_GIT_COMMIT_REF === 'staging'`)** menggunakan format terikat environment dan branch:

```
ASM-STG2-<PLAN>-<NONCE8>-<SIG32>
```

- `<PLAN>`: salah satu dari `GM26`, `SL26`, `GP26`, `SK26`, `SP26`.
- `<NONCE8>`: 8 karakter uppercase alfanumerik/hex unik.
- `<SIG32>`: **128-bit authentication tag** direpresentasikan sebagai **32 karakter hex uppercase** hasil **HMAC-SHA256** (16 byte pertama; canonical input: `ASESMERDEKA:LICENSE:ENV_BOUND:V2|env=staging|branch=staging|plan=<PLAN>|nonce=<NONCE8>`) menggunakan secret server `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET`.

> **Penolakan Eksplisit `ASM-STG1-*`:** Format `STG1` (64-bit / 16 karakter hex) telah dinonaktifkan dan **selalu ditolak** secara eksplisit pada semua environment tanpa fallback.

## 2. Secret & Keamanan Kriptografi
- `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET` adalah **server-only secret** (TIDAK boleh memiliki prefix `VITE_*`, TIDAK boleh dibundle ke `dist/`, dan TIDAK pernah menggunakan fallback ke konstanta client/Production seperti `ASESMERDEKA_2026_MASTER` atau `4B3A2918_KEY`).
- Minimum panjang adalah **32 karakter acak** berentropi tinggi; string placeholder/dev ditolak (*fail-closed*).
- Pada client (`src/utils/licenseManager.ts`), kode `ASM-STG2-*` hanya diperiksa secara struktural, **tidak pernah** lulus verifikasi offline, dan wajib melalui verifikasi HMAC server `/api/activate-license`.
- Perbandingan signature pada server memverifikasi panjang exact 32 karakter hex (16 byte = 128 bit) terlebih dahulu sebelum `crypto.timingSafeEqual`.

## 3. Konfigurasi Vercel Environment Variable (Branch-Specific Strategy)

Atur variabel `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET` di **Vercel Dashboard -> Project Settings -> Environment Variables** dengan ketentuan ketat berikut:

1. **Name:** `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET` (tanpa prefix `VITE_`)
2. **Environments:** centang **Preview** saja (**JANGAN** centang **Production** maupun Development umum bila tidak diperlukan)
3. **Git Branch (Preview Branch Override):** pilih **Specific Git Branch** dan isi **`staging`** saja (JANGAN dibiarkan berlaku untuk semua Preview branch)
4. **Value:** buat nilai acak kuat minimal 32 karakter (misalnya `openssl rand -hex 32`). **Jangan** tempelkan nilai secret ke chat, file `.env` yang ter-commit, atau repositori Git.

Dengan konfigurasi ini:
- Production tidak memiliki secret staging dan tetap menolak seluruh `ASM-STG2-*` / `ASM-STG1-*`.
- Preview pada branch lain (seperti `main`, `feature/*`, atau metadata branch kosong) tidak mendapatkan secret dan ditolak oleh server-side guard `VERCEL_GIT_COMMIT_REF === 'staging'`.

## 4. Matriks Penegakan per Environment & Branch

| Environment & Branch (`resolveLicenseRuntimeEnvironment()` + `VERCEL_GIT_COMMIT_REF`) | Format Diterima | Format Ditolak | Kebijakan Fail-Closed & Pencabutan |
|---|---|---|---|
| **Production** (`VERCEL_ENV === 'production'`) | Hanya lisensi Production/Legacy (`ASM-GM26`, `SK26`, `GP26`, `SP26`, `SL26`, `DV26`, seeded, & order Production) | Semua `ASM-STG2-*`, `ASM-STG1-*`, atau record berlabel `environment: 'staging'` ditolak (`HTTP 403`) di semua endpoint | `delete_license` hanya mencabut di blacklist Production (`asesmerdeka:admin:revoked_licenses:v1`) |
| **Preview / `staging`** (`VERCEL_ENV === 'preview'` && `VERCEL_GIT_COMMIT_REF === 'staging'`) | Hanya `ASM-STG2-*` dengan HMAC-SHA256 128-bit (`SIG32`) valid | Semua `ASM-STG1-*`, serial Production/Legacy, & `OFFICIAL_SEEDED_LICENSES` ditolak (`HTTP 403`) | Fail-closed (`HTTP 503`) bila secret kosong/lemah; pencabutan diisolasi di `asesmerdeka:admin:revoked_licenses:staging:v1` |
| **Preview / Non-Staging** (`VERCEL_ENV === 'preview'` && (`VERCEL_GIT_COMMIT_REF !== 'staging'` atau kosong)) | **Tidak ada** (seluruh penerbitan, verifikasi, aktivasi, klaim seat, Cloud Sync, AI entitlement, & webhook ditolak) | Seluruh operasi & kode staging maupun Production ditolak (`HTTP 403`) | Fail-closed (`STAGING_BRANCH_MISMATCH` / `MISSING_STAGING_BRANCH_METADATA`) |
| **Local Dev / Test** | `ASM-STG2-*` ke verifier HMAC staging; format legacy ke verifier legacy | `ASM-STG1-*` dan serial staging dengan signature salah ditolak | Wajib secret valid (>=32 karakter) untuk mencetak/memverifikasi `ASM-STG2-*`; tanpa fallback ke secret Production |

> **Catatan `VERCEL_ENV` vs `NODE_ENV`:** Vercel Preview menetapkan `VERCEL_ENV=preview` sekaligus `NODE_ENV=production`. Karena itu `resolveLicenseRuntimeEnvironment()` selalu memeriksa `VERCEL_ENV` **sebelum** `NODE_ENV`.

## 5. Penanganan Kode Palsu / Dimanipulasi
- Setiap pemotongan atau manipulasi pada `<SIG32>` (termasuk panjang bukan 32 karakter hex), `<PLAN>`, `<NONCE8>`, atau penggunaan format lama `ASM-STG1-*` / `ASM-PRD1-*` / `ASM-PROD-*` langsung ditolak pada `/api/activate-license`, `/api/admin-portal`, `/api/cloud-sync`, `/api/gemini`, dan `/api/shared-curriculum` sebelum menyentuh Redis. Endpoint `/api/mayar-webhook` dan fallback Mayar API telah dipensiunkan permanen (`HTTP 410 Gone`, `RETIRED — HISTORICAL REFERENCE ONLY`).
