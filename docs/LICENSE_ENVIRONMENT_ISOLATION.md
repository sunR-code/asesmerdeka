# Isolasi & Penandatanganan Lisensi Berbasis Environment (Production vs Staging Preview)

Dokumen ini menjelaskan arsitektur pemisahan lisensi antara environment **Production** dan **Vercel Preview (Staging)** setelah **Task 7.1.3B.2**.

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

### B. Format Staging / Preview (`ASM-STG1-*`)
Setiap lisensi baru yang diterbitkan pada environment **Vercel Preview (`VERCEL_ENV === 'preview'`)** — baik lewat Admin Portal Preview maupun pembelian Mayar Sandbox — menggunakan format terikat environment:

```
ASM-STG1-<PLAN>-<NONCE8>-<SIG16>
```

- `<PLAN>`: salah satu dari `GM26`, `SL26`, `GP26`, `SK26`, `SP26`.
- `<NONCE8>`: 8 karakter uppercase alfanumerik/hex unik.
- `<SIG16>`: 16 karakter hex uppercase hasil **HMAC-SHA256** (canonical input: `ASESMERDEKA:LICENSE:ENV_BOUND:V1|env=staging|plan=<PLAN>|nonce=<NONCE8>`) menggunakan secret server `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET`.

## 2. Secret & Keamanan Kriptografi
- `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET` adalah **server-only secret** (TIDAK boleh memiliki prefix `VITE_*`, TIDAK boleh dibundle ke `dist/`, dan TIDAK pernah menggunakan fallback ke konstanta client/Production seperti `ASESMERDEKA_2026_MASTER` atau `4B3A2918_KEY`).
- Minimum panjang adalah **32 karakter** dan string placeholder/dev ditolak (*fail-closed*).
- Pada client (`src/utils/licenseManager.ts`), kode `ASM-STG1-*` **tidak pernah** lulus verifikasi offline dan wajib melalui verifikasi server `/api/activate-license`.

## 3. Matriks Penegakan per Environment

| Environment Runtime (`resolveLicenseRuntimeEnvironment()`) | Format Diterima | Format Ditolak | Kebijakan Fail-Closed & Pencabutan |
|---|---|---|---|
| **Production** (`VERCEL_ENV === 'production'`) | Hanya lisensi Production/Legacy (`ASM-GM26`, `SK26`, `GP26`, `SP26`, `SL26`, `DV26`, seeded, & order Production) | Semua `ASM-STG1-*` atau record Redis berlabel `environment: 'staging'` ditolak (`HTTP 403`) di semua endpoint | `delete_license` hanya mencabut di blacklist Production (`asesmerdeka:admin:revoked_licenses:v1`) |
| **Preview / Staging** (`VERCEL_ENV === 'preview'`) | Hanya `ASM-STG1-*` dengan HMAC-SHA256 valid | Semua serial Production/Legacy & `OFFICIAL_SEEDED_LICENSES` ditolak (`HTTP 403`) | Fail-closed (`HTTP 503`) bila `ASESMERDEKA_STAGING_LICENSE_SIGNING_SECRET` kosong/lemah; pencabutan diisolasi di `asesmerdeka:admin:revoked_licenses:staging:v1` |
| **Local Dev / Test** | `ASM-STG1-*` ke verifier HMAC staging; format legacy ke verifier legacy | Serial staging dengan signature/env-claim salah ditolak | Wajib secret valid (>=32 karakter) untuk mencetak atau memverifikasi `ASM-STG1-*` |

> **Catatan `VERCEL_ENV` vs `NODE_ENV`:** Vercel Preview menetapkan `VERCEL_ENV=preview` sekaligus `NODE_ENV=production`. Karena itu `resolveLicenseRuntimeEnvironment()` selalu memeriksa `VERCEL_ENV` **sebelum** `NODE_ENV`.

## 4. Penanganan Kode Palsu / Dimanipulasi
- Setiap manipulasi pada `<SIG16>`, `<PLAN>`, atau segmen environment (misalnya `ASM-PRD1-...`, `ASM-PROD-...`, `ASM-DEV1-...`) langsung ditolak pada endpoint aktivasi, Cloud Sync, AI proxy, shared curriculum, admin portal, dan webhook sebelum menyentuh Redis atau fallback Mayar API.
- Pemakaian perbandingan HMAC menggunakan `crypto.timingSafeEqual`.
