# Spesifikasi Desain: Perombakan UI Dashboard V21 (Beranda & Sidebar)

## 1. Latar Belakang & Tujuan (Intent & Why)
Pengguna menginginkan tampilan antarmuka (UI) aplikasi AsesMerdeka menjadi jauh lebih modern, elegan, dan dinamis, terinspirasi langsung dari video referensi **Dashboard V21**. Fokus tahap pertama ini adalah merombak **Sidebar Navigasi** (`AppSidebar.tsx`) dan **Beranda Utama Guru** (`ClassSemesterHub.tsx`) dengan konsep **Bento Grid** dan animasi *spring physics* menggunakan pustaka `framer-motion`.

## 2. Sasaran (Goals, Non-Goals, Anti-Goals)
* **Goals:**
  * Mengintegrasikan pustaka `framer-motion` untuk menghasilkan transisi halaman dan interaksi yang halus.
  * Menerapkan tata letak **Bento Grid** pada Beranda Guru dengan kartu-kartu ber-sudut membulat (`rounded-2xl`/`rounded-3xl`), *hairline border*, dan bayangan difusi lembut.
  * Membuat **Top Sliding Pill Tabs** (kapsul navigasi geser animasi) untuk berpindah sub-tab administrasi kurikulum.
  * Merombak **Sidebar Navigasi** dengan header profil guru/sekolah yang segar ("*Selamat Datang, Bapak/Ibu Guru*") dan kartu promo PRO bergaya *glassmorphism* di bagian bawah.
  * Memberikan efek interaktif *hover lift* (`whileHover={{ y: -4 }}`) dan *tap feel* pada setiap kartu.
* **Non-Goals:**
  * Belum merombak halaman formulir generator butir soal AI, bank soal, dan form e-rapor (ditunda ke tahap berikutnya sesuai kesepakatan bertahap).
  * Tidak mengubah arsitektur data kurikulum, penyimpanan data harian, maupun logika verifikasi lisensi.
* **Anti-Goals:**
  * Tidak menggunakan animasi berlebihan (*AI-slop / motion overload*) yang memperlambat kinerja aplikasi atau mengganggu kenyamanan guru saat bekerja.
  * Tidak merusak responsivitas mobile (tampilan HP tetap harus rapi dan fungsional).

## 3. Batasan Teknis (Constraints)
* React 19.3.x kompatibel.
* Pertahankan semua data profil sekolah, TP/ATP, presensi, jurnal, dan status lisensi yang ada di `localStorage`.
* Tetap lulus semua 14 unit test (`npm test`) dan 0 kesalahan linter (`npm run lint`).
* Ukuran bundle tetap optimal melalui *tree-shaking* dan konfigurasi chunk Vite.

## 4. Pendekatan yang Dipilih (Approaches)
* **Pendekatan 1 (Dipilih): `framer-motion` Native.**
  * Menghadirkan *spring physics*, *staggered entrance* kartu Bento, dan *sliding layoutId pill* persis seperti di video Dashboard V21.
* *Pendekatan 2 (Ditolak): Pure CSS.*
  * Tidak dipilih karena tidak mampu menghasilkan efek kapsul meluncur dinamis dan terasa lebih kaku.

## 5. Detail Rancang Bangun (Architecture & How It Gets Built)

### A. Sidebar Navigasi (`src/components/layout/AppSidebar.tsx`)
1. **Header Profil Atas:**
   * Kartu profil guru: Avatar inisial dengan cincin gradien halus, sapaan "Selamat Datang", nama sekolah aktif, dan tombol ganti kelas/sekolah yang ringkas.
2. **Navigasi Menu:**
   * Item menu dikelompokkan rapi (Kurikulum & Perangkat Ajar, Administrasi Kelas Harian, Bank & Evaluasi).
   * Status aktif menggunakan kapsul lembut bertanda warna aksen indigo/emerald dengan animasi transisi.
3. **Kartu Bawah (Upgrade PRO):**
   * Mengadopsi kartu "Unlock Pro Account" ala V21: latar belakang *glass-card* dengan aksen gradien biru-indigo, lencana bintang, status kuota, dan tombol CTA yang mencolok.

### B. Beranda Utama Guru (`src/components/ClassSemesterHub.tsx`)
1. **Top Pill Sliding Switcher:**
   * Navigasi antar tahapan kurikulum (TP/ATP, Prota/Promes, Administrasi Harian, Supervisi) menggunakan `motion.div` dengan `layoutId="activeTabPill"` sehingga latar belakang kapsul meluncur mulus mengikuti klik pengguna.
2. **Hero Bento Card (Ringkasan Kelas):**
   * Menampilkan nama mata pelajaran, fase, kelas, dan semester dengan tipografi besar modern dan lencana status kesiapan kurikulum.
3. **Bento Grid Action Cards:**
   * **Kartu 1 (TP & Alur Tujuan):** Menampilkan jumlah TP yang sudah disusun, tombol kelola, dan indikator persentase.
   * **Kartu 2 (Perencanaan Waktu):** Kartu Prota & Promes dengan alokasi JP per minggu.
   * **Kartu 3 (Administrasi Harian):** Shortcut cepat ke Presensi, Jurnal Mengajar, dan Buku Nilai dengan micro-badges.
   * **Kartu 4 (Paket Supervisi Kepala Sekolah):** Kartu sorotan dengan aksen emerald untuk ekspor ZIP supervisi lengkap.
   * **Kartu 5 (Generator Kilat AI):** Tombol aksi cepat untuk membuat Modul Ajar dan LKPD sekali klik.
4. **Animasi Efek:**
   * Seluruh kartu masuk dengan *staggered spring animation* (`initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}`).
   * Interaksi kursor: `whileHover={{ y: -4, transition: { duration: 0.2 } }}`.

## 6. Verifikasi & Pengujian
* `npm test`: Memastikan seluruh 14 tes regresi tetap lulus.
* `npm run lint`: Memastikan 0 error pada kode baru.
* `npm run build`: Memastikan kompilasi bundler Vite sukses.
* Uji coba langsung di browser pada `http://localhost:5173/`.

