# Spesifikasi Desain: Sistem Bantuan & Kotak Masuk Laporan Kendala Guru (In-App Feedback System)

## 1. Latar Belakang & Tujuan (Intent & Why)
Dalam pengujian lapangan nyata, sering kali ditemukan celah fitur yang belum sempurna, tombol yang belum berfungsi, atau data yang masih berupa data *dummy* (seperti contoh nama siswa di jurnal atau bentrok NIS pada impor Excel). 

Pengguna (guru) membutuhkan cara mudah untuk melaporkan kendala langsung dari dalam aplikasi tanpa keluar halaman. Sementara pemilik/admin membutuhkan **Kotak Masuk Laporan Terpusat** di dalam aplikasi yang dilindungi **PIN Admin**, lengkap dengan tombol **"Salin Laporan untuk Perbaiki"** agar kendala pengguna bisa langsung ditempelkan ke AI coding assistant untuk dieksekusi perbaikannya saat itu juga.

---

## 2. Sasaran (Goals, Non-Goals, Anti-Goals)

### Goals:
1. **Akses Cepat & Merata**: Tombol "Bantuan & Lapor" dapat diakses dari TopHeader, Sidebar navigasi, dan Footer di semua perangkat (Laptop & HP).
2. **Formulir Laporan Otomatis (Sisi Guru)**:
   - Pilihan kategori kendala yang jelas: `Fitur Error/Macet`, `Masih Data Dummy`, `Tampilan/UI Kurang Pas`, `Masalah Unduh Word/ZIP`, `Saran Fitur Baru`.
   - Input pesan kendala & kontak opsional (Nama/No. WA).
   - Pengumpulan konteks otomatis: Halaman aktif (`activeTab`), Jenjang/Kelas/Mapel aktif, ID Perangkat (`deviceId`), dan waktu kejadian tanpa membebani guru.
3. **Penyimpanan Terpusat di Cloud**:
   - Disimpan di Upstash Redis melalui endpoint serverless `/api/feedback-reports`.
   - Memiliki mekanisme *fallback* lokal/offline yang aman jika koneksi internet sedang terputus.
4. **Kotak Masuk Admin Terintegrasi (Sisi Admin)**:
   - Tab "Kotak Masuk Laporan" di dalam modal bantuan yang terbuka setelah memasukkan PIN Admin yang valid.
   - Menampilkan daftar laporan: status (`Baru`, `Ditinjau`, `Selesai`), kategori, waktu, konteks halaman, dan isi keluhan guru.
   - Fitur ubah status laporan dan hapus laporan yang sudah diselesaikan.
   - **Fitur Unggulan**: Tombol **"📋 Salin Laporan untuk AI"** yang langsung menyalin rangkuman semua laporan aktif dalam format Markdown siap tempel.

### Non-Goals:
- Tidak membuat sistem obrolan/live-chat dua arah yang membutuhkan WebSocket *realtime* (terlalu berat dan boros sumber daya).
- Tidak mengintegrasikan ticketing pihak ketiga berbayar (Zendesk, Jira, Freshdesk).

### Anti-Goals:
- Jangan memunculkan *floating widget* mengambang yang menutupi tombol navigasi bawah pada layar HP (*mobile bottom nav*).
- Jangan membocorkan daftar laporan ke publik tanpa verifikasi PIN Admin yang sah.

---

## 3. Batasan Teknis (Constraints)
- Menggunakan database **Upstash Redis** yang sudah aktif pada project (`UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`).
- Verifikasi PIN Admin wajib menggunakan fungsi hash satu arah yang sudah teruji di [`verifyAdminKeygenPin`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/src/utils/licenseManager.ts).
- Seluruh pengujian otomatis (`npm test`) wajib tetap 100% lulus, 0 *oxlint warning/error*, dan `npm run build` sukses.

---

## 4. Pendekatan Rancang Bangun (Approaches)

### Pendekatan 1 (Dipilih): Modal Bantuan Mandiri (`HelpFeedbackModal.tsx`) + Kotak Masuk Admin Terintegrasi
- **Alasan Pemilihan**: Memisahkan alur bantuan/kendala dari pop-up lisensi/pembayaran sehingga antarmuka tetap bersih, fokus, dan nyaman digunakan untuk membaca banyak laporan.
- **Fitur Ekstra**: Tersedia tombol "Salin Laporan untuk AI" yang mempercepat siklus *bug fixing* bersama asisten AI.

### Pendekatan 2 (Ditolak): Menggabungkan Laporan ke dalam Panel `@admin` Lisensi
- **Alasan Penolakan**: Modal lisensi sudah sangat padat dengan konfigurasi payment gateway Mayar, batas perangkat, dan generator batch key. Menumpuk daftar laporan di sana akan menyulitkan admin saat membaca laporan panjang di layar kecil/HP.

---

## 5. Detail Arsitektur & Rancang Bangun

### A. Endpoint Serverless Backend (`api/feedback-reports.js`)
Mendukung metode:
1. `POST`: Menerima laporan baru dari pengguna umum (guru).
   - Validasi payload: `category`, `description`, `context` (`activeTab`, `kelas`, `mapel`, `deviceId`).
   - Menyimpan item ke Upstash Redis list `asesmerdeka:feedback_reports:list` dengan ID unik `REP-<timestamp>-<random>` dan status awal `'baru'`.
2. `GET`: Mengambil seluruh daftar laporan (Wajib menyertakan header/body `adminPin` yang valid).
3. `PATCH`: Memperbarui status laporan (`'baru'` | `'ditinjau'` | `'selesai'`) (Wajib verifikasi PIN Admin).
4. `DELETE`: Menghapus laporan berdasarkan ID (Wajib verifikasi PIN Admin).

### B. Komponen Antarmuka (`src/components/HelpFeedbackModal.tsx`)
1. **Tab 1: Kirim Kendala / Bantuan (Untuk Guru)**:
   - Header ramah: *"Pusat Bantuan & Lapor Kendala"*.
   - Pilihan kategori berupa chips/tombol pill yang mudah diklik di HP.
   - Textarea deskripsi dengan placeholder informatif.
   - Ringkasan konteks otomatis yang akan dilampirkan (nama mapel & tab yang sedang dibuka).
   - Tombol kirim dengan indikator *loading* & notifikasi sukses.
2. **Tab 2: Kotak Masuk Admin (Dilindungi PIN)**:
   - Form otentikasi PIN jika belum dibuka.
   - Tampilan list kartu laporan dengan *badge* status berwarna (`Baru` = Merah/Kuning, `Ditinjau` = Biru, `Selesai` = Hijau).
   - Filter laporan: *Semua*, *Perlu Ditangani (Baru/Ditinjau)*, *Selesai*.
   - Tombol aksi: Ganti Status, Hapus Laporan, dan **Salin Rangkuman untuk AI**.

### C. Integrasi Navigasi (`TopHeader.tsx`, `AppSidebar.tsx`, `AppFooter.tsx`, `App.tsx`)
- Di **TopHeader**: Ditambahkan tombol *pill* bantuan ringkas bergaya modern di sebelah tombol Lisensi.
- Di **Sidebar**: Ditambahkan menu *"Bantuan & Lapor Kendala"* di bagian bawah.
- Di **Footer**: Ditambahkan tautan *"Bantuan & Lapor"*.
- Di **App.tsx**: State global `isHelpModalOpen` dan trigger pembuka modal.

---

## 6. Rencana Verifikasi & Pengujian
1. **Unit Test & API Integration (`tests/productionReadiness.test.mjs`)**:
   - `AUD-215`: Pengujian alur pengiriman laporan, penolakan akses admin tanpa PIN yang valid, otentikasi admin yang berhasil, pembaruan status laporan, serta format salin ringkasan laporan.
2. **Linter & Code Quality**:
   - `npx oxlint --deny-warnings` wajib 0 error dan 0 warning.
3. **Bundle & Build Test**:
   - `npm run build` berhasil tanpa TypeScript error.

