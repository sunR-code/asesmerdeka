# UI Dashboard V21 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah antarmuka Beranda Guru (`ClassSemesterHub.tsx`) dan Sidebar Navigasi (`AppSidebar.tsx`) mengadopsi estetika Bento Grid modern, animasi *spring physics*, dan *sliding pill tabs* ala Dashboard V21 menggunakan `framer-motion`.

**Architecture:** Memasang `framer-motion` untuk menangani transisi tab dinamis (`layoutId="activeTabPill"`), efek kartu melayang saat disentuh (`whileHover={{ y: -4 }}`), serta *staggered entrance* saat halaman dimuat. Mengorganisasi konten Beranda Guru ke dalam komposisi Bento Grid asimetris yang rapi, dan merombak Sidebar dengan kartu profil guru serta kartu PRO bergaya *glassmorphism*.

**Tech Stack:** React 19, TypeScript, `framer-motion`, Lucide React, Vite, Node.js Test Runner.

**Spec:** `docs/superpowers/specs/2026-11-06-ui-dashboard-v21-redesign.md`

## Global Constraints

- Kompatibel dengan React 19.3.x tanpa merusak fungsionalitas tombol ekspor, presensi, jurnal, atau penyimpanan kurikulum.
- Seluruh 14 pengujian unit yang ada wajib tetap lulus (`npm test`).
- Linter wajib tetap bersih (0 error, 0 warning dari `oxlint`).
- Build produksi Vite (`npm run build`) harus selesai tanpa error kompilasi TypeScript.
- Menjaga responsivitas layar mobile (tombol menu drawer mobile tetap berfungsi normal).

## Review Focus

- **React 19 Peer Dependency:** Pemasangan `framer-motion` harus berjalan lancar pada React 19 (atau menggunakan `motion` / flag `--legacy-peer-deps` jika diperlukan).
- **Z-Index & Stacking Context:** Efek animasi *hover lift* kartu Bento tidak boleh tertutup oleh elemen di sekitarnya.
- **Scroll & Overflow:** Animasi transisi tab tidak boleh menimbulkan lonjakan *horizontal scrollbar* (*overflow-x*).
- **Aksesibilitas Kontras:** Teks di atas kartu gradien dan *glassmorphism* wajib memiliki kontras warna tinggi (WCAG AA) agar mudah dibaca guru.
- **Performa Transisi:** Animasi harus menggunakan akselerasi perangkat keras GPU (`transform` dan `opacity`), bukan mengubah `top`/`left`/`width` secara langsung.

---

### Task 1: Pemasangan `framer-motion` & Konfigurasi Animasi

**Files:**
- Modify: `package.json`
- Create: `src/utils/motionPresets.ts`
- Test: `tests/productionReadiness.test.mjs`

**Interfaces:**
- Consumes: Node packages
- Produces: Objek preset animasi `bentoCardVariants`, `staggerContainerVariants`, `springPillTransition`

- [ ] **Step 1: Pasang pustaka `framer-motion`**

Run: `npm install framer-motion` (atau periksa kompatibilitas dengan React 19)

- [ ] **Step 2: Buat utilitas preset animasi di `src/utils/motionPresets.ts`**

Mendefinisikan varian animasi standar V21:
- `cardHover`: `{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }`
- `cardTap`: `{ scale: 0.98 }`
- `fadeInUp`: `{ initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } }`
- `staggerContainer`: `{ animate: { transition: { staggerChildren: 0.06 } } }`

- [ ] **Step 3: Tambahkan tes unit di `tests/productionReadiness.test.mjs`**

Memastikan modul `motionPresets` dapat di-import dan preset animasi terdefinisi dengan tepat.

- [ ] **Step 4: Jalankan tes unit dan linter**

Run: `npm test && npm run lint`
Expected: PASS (15 tests pass), 0 warnings.

---

### Task 2: Perombakan Sidebar Navigasi (`src/components/layout/AppSidebar.tsx`)

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/index.css` (penambahan gaya glassmorphism dan sidebar pill)

**Interfaces:**
- Consumes: `AppSidebarProps`, `motion` dari `framer-motion`, `SchoolProfile`, `UserQuota`
- Produces: Komponen Sidebar modern V21 dengan Header Profil, Navigasi Kapsul, dan Kartu PRO Glassmorphism

- [ ] **Step 1: Rombak Bagian Header Atas Sidebar**

Tampilkan kartu profil guru elegan:
- Sapaan "*Selamat Datang*"
- Nama Sekolah aktif & jenjang kelas
- Tombol ringkas ganti kelas/profil sekolah

- [ ] **Step 2: Rombak Menu Navigasi Menjadi Kapsul V21**

Item menu menggunakan sudut `rounded-xl`, penataan ikon bersih, dengan indikator aktif yang kontras dan nyaman dipandang.

- [ ] **Step 3: Rombak Kartu Bawah Promo/Status PRO**

Mengadopsi kartu *Unlock Pro* ala V21:
- Latar belakang gradien biru-indigo gelap atau glassmorphism
- Status kuota / lencana lisensi
- Tombol aksi langsung "Upgrade PRO" / "Kelola Lisensi"

- [ ] **Step 4: Jalankan verifikasi linting**

Run: `npm run lint`
Expected: 0 warnings, 0 errors.

---

### Task 3: Perombakan Beranda Utama Guru (`src/components/ClassSemesterHub.tsx` & `HubStandaloneNavigation.tsx`)

**Files:**
- Modify: `src/components/ClassSemesterHub.tsx`
- Modify: `src/components/hub/HubStandaloneNavigation.tsx`
- Modify: `src/components/hub/ClassSetupStepView.tsx`

**Interfaces:**
- Consumes: `ClassSemesterHubProps`, `framer-motion`
- Produces: Tampilan Beranda Bento Grid V21 dengan Top Sliding Pill Tabs dan kartu modul interaktif

- [ ] **Step 1: Implementasi Top Sliding Pill Tabs di `HubStandaloneNavigation.tsx`**

Gunakan `motion.div` dengan `layoutId="activeSubTabPill"` pada tombol tab sehingga kapsul penanda meluncur secara mulus ke tab yang dipilih.

- [ ] **Step 2: Rombak Komposisi Beranda Menjadi Bento Grid di `ClassSetupStepView.tsx`**

Tata ulang kartu-kartu aksi menjadi Bento Grid asimetris:
- **Hero Card (Ukuran 2 Kolom):** Status kesiapan kurikulum semester, nama mapel, dan jumlah TP.
- **Card 1 (TP & ATP):** Indikator progres perumusan tujuan pembelajaran.
- **Card 2 (Prota & Promes):** Pengaturan alokasi JP mingguan.
- **Card 3 (Administrasi Harian):** Shortcut ke Presensi, Jurnal Mengajar, dan Buku Nilai dengan badge cepat.
- **Card 4 (Paket Supervisi):** Sorotan ekspor ZIP dokumen supervisi bebas watermark.
- **Card 5 (Generator Kilat AI):** Tombol aksi instan untuk menyusun Modul Ajar dan LKPD.

- [ ] **Step 3: Tambahkan Animasi `whileHover` & `staggerChildren`**

Bungkus kartu-kartu Bento dengan `motion.div` agar terangkat halus (`y: -4`) saat kursor mendekat dan muncul berurutan saat halaman dimuat.

- [ ] **Step 4: Jalankan tes unit dan linter**

Run: `npm test && npm run lint`
Expected: 15/15 tests pass, 0 warnings.

---

### Task 4: Polish Visual, CSS & Verifikasi Akhir

**Files:**
- Modify: `src/index.css`
- Test: `npm run build`

**Interfaces:**
- Consumes: Seluruh modul yang telah dirombak
- Produces: Build produksi `dist/` yang stabil dan siap tayang di browser

- [ ] **Step 1: Sempurnakan CSS variables dan utility classes**

Pastikan bayangan kartu Bento menggunakan soft diffusion (`box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05)`), border `rgba(226, 232, 240, 0.8)`, dan sudut membulat `18px` (`--radius-lg`).

- [ ] **Step 2: Jalankan build produksi penuh**

Run: `npm run build`
Expected: Build sukses, chunking optimal, ukuran bundle terkontrol.

- [ ] **Step 3: Verifikasi hasil visual di browser**

Buka `http://localhost:5173/` dan pastikan interaksi animasi tab dan Bento Grid bekerja mulus.

