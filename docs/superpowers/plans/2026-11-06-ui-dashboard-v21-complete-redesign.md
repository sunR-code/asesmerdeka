# UI Dashboard V21 Complete Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merombak seluruh komponen antarmuka yang tersisa (TopHeader, TPList, ATP/Prota/Promes, Paket Supervisi, dan Modal Lisensi/Profil) mengadopsi estetika Bento Grid modern, animasi *spring physics*, dan *clean glassmorphism* ala Dashboard V21.

**Architecture:** Menerapkan komponen `motion` dari `framer-motion` dan utility class `.v21-bento-card` serta `.v21-glass-pro-card` ke dalam kartu aksi modul, header, command center supervisi, serta modal aktivasi lisensi tanpa mengubah struktur logika bisnis data atau ekspor DOCX/ZIP.

**Tech Stack:** React 19, TypeScript, `framer-motion`, Lucide React, Vite, Node.js Test Runner.

**Spec:** `docs/superpowers/specs/2026-11-06-ui-dashboard-v21-redesign.md`

## Global Constraints

- Wajib mempertahankan seluruh 15 pengujian unit yang ada (`npm test` 100% PASS).
- Linter wajib tetap bersih (0 error, 0 warning dari `oxlint`).
- Build produksi Vite (`npm run build`) harus selesai tanpa error kompilasi TypeScript.
- Fungsionalitas ekspor DOCX, ZIP, kalkulasi asesmen, dan penyimpanan lokal (localStorage) tidak boleh terganggu.
- Animasi menggunakan akselerasi GPU (`transform`, `opacity`) dan ramah aksesibilitas (*reduced motion*).

## Review Focus

1. **Modal Overlay & Stacking Context:** Modal aktivasi lisensi dan profil sekolah harus memiliki z-index yang tepat di atas sidebar dan header.
2. **Tombol Aksi AI & Export:** Tombol generator AI dan ekspor DOCX/ZIP harus tetap menampilkan state loading (`isBusy`) yang jelas saat proses berlangsung.
3. **Responsivitas Tabel & Kartu:** Layout kartu TP dan tabel ATP/Prota/Promes harus tetap rapi pada berbagai ukuran layar.
4. **Kontras Teks & Aksesibilitas:** Seluruh teks pada kartu baru wajib memenuhi standar kontras WCAG AA.
5. **Performa HMR:** Kode baru harus mendukung Hot Module Replacement secara bersih tanpa memicu re-render berlebih.

---

### Task 1: TopHeader & AppChrome V21 Upgrade

**Files:**
- Modify: `src/components/layout/TopHeader.tsx`
- Modify: `src/components/layout/AppChrome.tsx`

**Interfaces:**
- Consumes: `TopHeaderProps`, `motion` dari `framer-motion`
- Produces: Header atas bernuansa glassmorphism dengan indikator penyimpanan real-time, badge sekolah, dan status PRO bernuansa emas/emerald.

- [ ] **Step 1: Rombak TopHeader dengan elemen V21**
Tambahkan animasi *spring tap* pada tombol navigasi sekolah dan lisensi, serta pill status simpan otomatis yang lebih halus.

- [ ] **Step 2: Sempurnakan AppChrome (Floating bar, error banner, toast)**
Berikan styling modern dengan sudut membulat 14px dan soft shadow.

- [ ] **Step 3: Verifikasi linter**
Run: `npm run lint`

---

### Task 2: Perombakan TP & Perangkat Semester (Bento Cards & Action Pills)

**Files:**
- Modify: `src/components/hub/TPListSubTab.tsx`
- Modify: `src/components/hub/ATPSubTab.tsx`
- Modify: `src/components/hub/ProtaSubTab.tsx`
- Modify: `src/components/hub/PromesSubTab.tsx`

**Interfaces:**
- Consumes: `TPListSubTabProps`, `CustomTPItem`, `motionPresets`
- Produces: Kartu Tujuan Pembelajaran (TP) bergaya Bento dengan tombol aksi kilat AI (Modul Ajar, LKPD, Asesmen, Rangkuman) dan tabel perangkat yang rapi.

- [ ] **Step 1: Rombak Kartu TP di `TPListSubTab.tsx`**
Bungkus kartu TP dalam `motion.div` dengan varian `bentoCardVariants` dan `whileHover={{ y: -3 }}`. Susun tombol aksi generator menjadi kapsul horizontal modern.

- [ ] **Step 2: Tingkatkan tampilan ATP, Prota, dan Promes**
Perbarui kontainer tabel dengan `.v21-bento-card` dan tombol ekspor DOCX yang konsisten.

- [ ] **Step 3: Verifikasi linter dan tes unit**
Run: `npm run lint && npm test`

---

### Task 3: Command Center Paket Supervisi V21

**Files:**
- Modify: `src/components/PaketSupervisiDashboard.tsx`

**Interfaces:**
- Consumes: `PaketSupervisiDashboardProps`, `exportBundelSupervisiMasterDocx`, `exportPaketSupervisiToZip`
- Produces: Dashboard supervisi modern dengan kartu sorotan utama (1-Klik Master DOCX & ZIP) serta grid kartu individual 9 dokumen semester.

- [ ] **Step 1: Rombak Hero Card Supervisi**
Tampilkan dua kartu aksi utama (Master Bundel Word & Arsip ZIP Lengkap) dengan latar gradien halus dan efek glowing.

- [ ] **Step 2: Tata ulang 9 Dokumen ke dalam Grid Bento**
Setiap dokumen (Cover, Instrumen, ATP, Prota, Promes, Presensi, Jurnal, Nilai, Rapor) menjadi kartu Bento dengan badge status dan tombol unduh langsung.

- [ ] **Step 3: Verifikasi linter**
Run: `npm run lint`

---

### Task 4: Modals V21 Glassmorphism & Aktivasi Lisensi

**Files:**
- Modify: `src/components/LicenseModal.tsx`
- Modify: `src/components/SchoolProfileModal.tsx`
- Modify: `src/components/layout/ClassSelectorModal.tsx`

**Interfaces:**
- Consumes: `LicenseModalProps`, `SchoolProfileModalProps`, `framer-motion`
- Produces: Modal dialog modern dengan animasi pop halus, kartu paket lisensi bertingkat, dan input form yang nyaman.

- [ ] **Step 1: Rombak LicenseModal**
Perbarui kartu pilihan paket lisensi Mayar (Individu vs Sekolah) dengan styling V21 yang menonjolkan fitur unggulan, input kode lisensi yang responsif, dan panel aktivasi yang jelas.

- [ ] **Step 2: Rombak SchoolProfileModal & ClassSelectorModal**
Berikan sentuhan sudut membulat modern, tipografi bersih, dan animasi pop.

- [ ] **Step 3: Verifikasi linter dan tes unit**
Run: `npm run lint && npm test`

---

### Task 5: Build Produksi & Verifikasi Akhir

**Files:**
- Test: `npm run build`
- Test: `npm test`
- Test: `npm run lint`

- [ ] **Step 1: Jalankan kompilasi TypeScript dan Vite build**
Run: `npm run build`
Pastikan 0 error TypeScript.

- [ ] **Step 2: Jalankan pengujian unit lengkap**
Run: `npm test`
Pastikan 15/15 tes lulus.

- [ ] **Step 3: Periksa live dev server di browser**
Buka `http://localhost:5173/` dan pastikan seluruh halaman berjalan mulus.

