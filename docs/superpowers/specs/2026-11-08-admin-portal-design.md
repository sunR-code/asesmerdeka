# Spesifikasi Desain: Portal Admin Terpusat (Admin Portal & License Manager)

## 1. Latar Belakang & Tujuan (Intent & Why)
Saat ini fitur administratif pada aplikasi Asesmen Merdeka terbagi-bagi di beberapa tempat:
- Kotak masuk laporan kendala guru berada di tab kedua modal Bantuan (`HelpFeedbackModal.tsx`).
- Generator lisensi dan konfigurasi payment link Mayar tersembunyi di dalam modal lisensi (`LicenseModal.tsx`) lewat kode rahasia `@admin`.
- Belum ada antarmuka visual terpadu untuk melihat daftar seluruh lisensi yang pernah dibuat, mengecek apakah lisensi tersebut sudah aktif atau belum, melihat perangkat (`deviceId`) mana saja yang terkunci, me-reset kunci perangkat (*device unbind*) saat guru berganti HP/laptop, atau mencabut lisensi.

Pemilik aplikasi (admin) membutuhkan **satu tempat terpusat berupa Halaman Admin Layar Penuh (*Dedicated Admin Portal*)** yang memiliki ruang kerja lega, navigasi intuitif, dan memenuhi standar keamanan tinggi untuk mengelola lisensi, me-reset perangkat, memantau laporan kendala guru, serta mengonfigurasi pembayaran.

---

## 2. Sasaran (Goals, Non-Goals, Anti-Goals)

### Goals:
1. **Halaman Layar Penuh Khusus (`?page=admin` atau `?admin=portal`)**:
   - Membuka halaman dasbor admin berlayar penuh yang bersih, profesional, dan nyaman untuk membaca data tabular yang padat di desktop maupun HP.
   - Dilengkapi tombol navigasi kembali yang jelas: `← Kembali ke Aplikasi Guru` untuk kembali ke workspace guru tanpa kehilangan konteks.
2. **Keamanan Tingkat Tinggi (High Security Architecture)**:
   - Gerbang otentikasi PIN Admin wajib (*Lock Screen*) sebelum antarmuka admin dan data sensitif dirender.
   - PIN diverifikasi dengan *one-way cryptographic salted hash* (`verifyAdminKeygenPin`).
   - Seluruh pemanggilan API backend (`list`, `create`, `reset_seats`, `delete`) wajib memvalidasi PIN Admin; server menolak memberikan data lisensi jika PIN tidak valid atau tidak disertakan.
   - Sesi admin disimpan secara aman di memori/sessionStorage dan otomatis terkunci (*auto-lock*) jika tab ditutup atau saat menekan tombol `Kunci Portal`.
3. **Manajemen Lisensi Khusus & Reset Kunci Perangkat**:
   - **Pembuatan Kode Lisensi Baru**: Mendukung paket Guru Mandiri (2 perangkat: Laptop + HP), Solo (1 perangkat terkunci), Kolektif Sekolah (25 guru), Guru Mandiri PRO (AI), dan Sekolah PRO (AI) dengan format resmi terenkripsi `ASM-XXXX-...`.
   - **Pemberian Catatan / Label Pemesan**: Setiap kode yang dibuat dapat diberi label identitas pembeli (misal: *"Bu Rina SDN 1 Merdeka - WA 0812345678"*).
   - **Pemantauan Status Real-time**: Menampilkan tabel daftar kode, label pembeli, tipe paket, tanggal pembuatan, status kursi (`Belum Aktif` vs `Aktif (1/2 atau 2/2 Perangkat)`), dan daftar `deviceId` yang sedang terkunci.
   - **Reset Kunci Perangkat (*Device Unbind*)**: Tombol aksi satu-klik untuk me-reset daftar perangkat yang terkunci di Cloud Redis pada kode tersebut, sehingga pembeli bisa langsung mengaktifkan lisensinya di perangkat baru jika berganti gadget.
   - **Pencabutan / Hapus Lisensi**: Menghapus atau membatalkan kode lisensi jika terjadi pembatalan transaksi.
4. **Penyatuan Kotak Masuk Laporan Kendala Guru (Unified Inbox)**:
   - Memindahkan pengelolaan pesan/laporan kendala dari modal bantuan ke Portal Admin ini. Modal bantuan guru (`HelpFeedbackModal.tsx`) menjadi bersih murni formulir pelaporan tanpa tab admin.
   - Admin dapat melihat, memfilter (`Semua`, `Perlu Ditangani`, `Selesai`), mengubah status, menghapus laporan, serta menekan tombol **"📋 Salin Rangkuman untuk AI"**.
5. **Konfigurasi Pembayaran & Batas Perangkat**:
   - Tempat terpadu untuk mengatur Payment Link Mayar (Individu & Sekolah), Mayar Product ID, batas default kursi individu, dan URL Cloud Tracker.

### Non-Goals:
- Tidak membuat sistem otentikasi berbasis email/password multi-user yang rumit (cukup PIN Admin Master yang aman dan praktis bagi *single-owner*).
- Tidak menggunakan database SQL eksternal baru (memaksimalkan Upstash Redis yang sudah ada di proyek).

### Anti-Goals:
- Jangan pernah mengekspos daftar lisensi atau ID perangkat pembeli ke pengguna biasa tanpa PIN Admin yang terverifikasi.
- Jangan membuat admin terkunci di halaman admin tanpa tombol kembali yang mudah ke aplikasi guru.

---

## 3. Batasan Teknis & Keamanan (Constraints)
- **Otentikasi Backend**: Endpoint serverless `api/admin-portal.js` memvalidasi PIN Admin pada setiap aksi (`list`, `create`, `reset`, `delete`).
- **Database**: Menggunakan Upstash Redis dengan *key* terstruktur:
  - Indeks lisensi: `asesmerdeka:admin:license_registry:v1`
  - Kursi perangkat per lisensi: `asesmerdeka:seats:v1:<LICENSE_CODE>`
  - Laporan kendala: `asesmerdeka:feedback_reports:list`
  - Didukung penyimpanan *fallback* lokal jika Redis offline / lingkungan pengujian.
- **Kualitas Kode**:
  - `npm test` 100% lulus.
  - `npx oxlint --deny-warnings` 0 warning & 0 error.
  - `npm run build` sukses tanpa galat TypeScript.

---

## 4. Alur & Struktur Komponen Antarmuka

### A. Tampilan Kunci Masuk (Lock Screen)
- Desain minimalis elegan: latar gelap / navy profesional dengan ikon gembok berpelindung.
- Judul: **Portal Admin Asesmen Merdeka**.
- Input PIN Admin (disamarkan/password) dengan tombol masuk dan pesan error jika salah.
- Tombol: `← Kembali ke Dashboard Guru`.

### B. Dasbor Admin (Saat Berhasil Terbuka)
- **Top Navigation Bar**:
  - Logo & Judul: **Portal Pengelola Lisensi & Layanan Asesmen Merdeka**.
  - Status Koneksi Database (Online Cloud / Local Fallback).
  - Tombol **🔒 Kunci Portal**.
  - Tombol **← Kembali ke Aplikasi Guru**.
- **3 Tab Utama**:
  1. **Tab 1: Lisensi Khusus & Kunci Perangkat**:
     - *Sub-panel 1 (Generator)*: Pilihan tipe paket, label pemesan/instansi, kuota perangkat, tombol buat kode.
     - *Sub-panel 2 (Tabel Daftar Lisensi)*:
       - Kolom: Kode Lisensi, Label/Pemesan, Paket, Status Perangkat (misal `2/2 Terkunci: DEV-A, DEV-B`), Tanggal.
       - Aksi: Salin Kode, 🔄 Reset Perangkat, 🗑️ Hapus Lisensi.
       - Fitur Pencarian & Filter Cepat (Cari berdasarkan kode, nama pembeli, atau filter aktif/belum aktif).
  2. **Tab 2: Kotak Masuk Laporan Kendala Guru**:
     - Membawa seluruh fitur inbox laporan: filter status, daftar laporan detail, tombol ubah status, tombol hapus, dan banner **"📋 Salin Laporan untuk AI"**.
  3. **Tab 3: Konfigurasi Pembayaran & Sistem**:
     - Pengaturan URL Payment Link Mayar Individu & Sekolah.
     - Pengaturan Product ID Mayar & Batas Perangkat Guru Mandiri (1 atau 2).
     - Tombol Simpan Pengaturan.

---

## 5. Rencana Pengujian Otomatis
- Menambahkan test suite **`AUD-218`** di `tests/productionReadiness.test.mjs`:
  1. Verifikasi `api/admin-portal.js` menolak request tanpa PIN Admin yang sah.
  2. Verifikasi pembuatan lisensi baru tersimpan dengan label pemesan dan batas kursi yang sesuai.
  3. Verifikasi aksi `reset_seats` membersihkan daftar perangkat terkunci sehingga kode dapat digunakan kembali di perangkat baru.
  4. Verifikasi aksi `delete_license` menghapus lisensi dari registri.

