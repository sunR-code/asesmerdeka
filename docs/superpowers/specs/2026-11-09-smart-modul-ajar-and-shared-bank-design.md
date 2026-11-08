# Desain Sistem: Smart Modul Ajar AI & Bank Referensi Kurikulum Bersama

Tanggal: 2026-11-09  
Status: Menunggu Persetujuan Final Pengguna (Approved by Reviewer)

---

## 1. Latar Belakang & Tujuan (Intent and Why)

Saat guru mengonfigurasi profil sekolah dan memilih kelas/mata pelajaran, gerbang pertama yang mereka buka adalah **Peta Materi & Modul Ajar**. Dalam evaluasi pengguna riil, seorang guru mengamati bahwa membuat LKPD dan Modul Ajar di ChatGPT web terasa lebih hidup dan berbobot dibandingkan tampilan awal di aplikasi.

Hasil audit teknis pada basis kode menunjukkan:
1. `buildSmartModulAjar` di `src/utils/perangkatAjarEngine.ts` saat ini masih berupa **template statis tanpa integrasi AI**.
2. `LKPDViewer.tsx` saat dibuka pertama kali menampilkan draf teks generik ("Dalam kehidupan nyata...").
3. Guru yang terbiasa dengan AI menginginkan skenario masalah riil, pemantik kritis, dan langkah belajar mendalam (PBL, PjBL, dsb.), bukan template kalimat pengisi seragam.

**Tujuan Sistem Baru:**
* Menghadirkan generator AI berbasis Gemini yang cerdas untuk Modul Ajar dengan pilihan model pembelajaran (PBL, PjBL, Inkuiri, Berdiferensiasi, Kontekstual) dan input konteks lokal.
* Mengintegrasikan **Bank Referensi Kurikulum Bersama (Shared Cloud Bank)** di Upstash Redis: saat suatu materi sudah pernah disempurnakan oleh guru, dokumen tersebut dapat dibagikan sebagai referensi siap pakai bagi guru lain di jenjang/kelas/mapel yang sama (0 detik waktu tunggu, hemat token API).
* Menyediakan tombol eksplisit **"🤝 Bagikan ke Bank Referensi"** (Opsi B) agar guru berlisensi aktif bisa membagikan draf hasil modifikasi mereka secara anonim untuk rekan sejawat.

---

## 2. Sasaran (Goals, Non-Goals, Anti-Goals)

### Goals
1. **Modul Ajar Cerdas Berbasis AI (`modulAjarAiService.ts`)**:
   - Menghasilkan narasi kontekstual, pemahaman bermakna mendalam, pertanyaan pemantik HOTS, langkah pembelajaran runtut (Pendahuluan, Inti sesuai sintaks model, Penutup), dan rubrik asesmen formatif.
2. **Bank Referensi Bersama Cerdas (`/api/shared-curriculum`)**:
   - Endpoint serverless untuk membaca (`GET`) dan menyimpan (`POST`) draf referensi Modul Ajar & LKPD berbasis kunci komposit presisi:
     `asesmerdeka:shared:<type>:<jenjang>:<kelas>:<mapelSlug>:<tpKode>:<materiSlug>:<model>`
   - Sanitasi otomatis: Menghapus seluruh properti privat (`namaSekolah`, `namaGuru`, `nip`, `alamatSekolah`, kontak).
3. **Penyuntikan Identitas Lokal Otomatis (Local Hydration)**:
   - Saat guru memuat dokumen dari bank bersama, Kop Surat, Nama Sekolah, Nama Guru, dan NIP langsung diisi dari `schoolProfileStorage` perangkat guru tersebut.
4. **Editor Teks Interaktif di Layar**:
   - Guru dapat mengedit langsung setiap bagian teks Modul Ajar (`AutoExpandingTextarea`) sebelum mencetak atau mengunduh Word.
5. **Indikator Banner Referensi Ringkas**:
   - Menampilkan penanda ramah dan ringkas saat draf berasal dari bank komunitas:
     **"Draf berikut adalah referensi guru lainnya • Siap disesuaikan"**.
6. **Hak Akses & Pengamanan**:
   - Membaca dan menggunakan draf referensi terbuka untuk semua guru (termasuk mode uji coba).
   - Pembuatan versi AI baru dan penerbitan ke Bank Bersama dilindungi hak lisensi aktif (`requireActiveLicenseForAction`) untuk mencegah spam dan menjamin kualitas konten.

### Non-Goals
* Tidak menggantikan sistem Bank Soal / Asesmen dan Buku Nilai yang sudah berjalan stabil.
* Tidak memaksa guru harus selalu terhubung ke internet saat mencetak draf awal (sistem tetap menyediakan fallback lokal instan).

### Anti-Goals
* **Anti-Kebocoran Data (Zero PII Leakage)**: Dilarang keras menyimpan nama sekolah, nama kepala sekolah, NIP, atau identitas siswa ke Cloud Shared Bank.
* **Anti-Tabrakan Kelas (Zero Collisions)**: Mencegah materi kelas yang berbeda tertukar dengan menyertakan `kelas` dan `materiSlug` dalam kunci database.
* **Anti-Vandalisme**: Mencegah draf kosong atau rusak menimpa bank komunitas dengan validasi skema ketat sebelum penyimpanan.

---

## 3. Pendekatan yang Dipilih (Selected Approach)

**Hybrid: One-Click AI + Shared Community Bank dengan Kontribusi Sukarela (Opsi B)**
* Dokumen dibuka seketika dari Shared Bank jika sudah ada referensi teruji (0 detik loading).
* Jika belum ada, sistem menyajikan draf awal terstruktur dengan bilah kustomisasi AI di atasnya.
* Guru dapat menekan **"✨ Buat Ulang dengan AI"** dengan memasukkan konteks lokal pilihan mereka.
* Guru dapat menekan **"🤝 Bagikan ke Bank Referensi"** untuk mendaftarkan draf terbaik mereka ke komunitas.

---

## 4. Rincian Desain Arsitektur & Komponen

### A. Backend: Endpoint Serverless `/api/shared-curriculum`
* **Metode `GET`**:
  * Query/Body: `type`, `jenjang`, `kelas`, `mapel`, `tpKode`, `materiPokok`, `model`.
  * Membaca kunci komposit dari Upstash Redis. Jika tidak ditemukan, mengembalikan `{ found: false }`.
* **Metode `POST`**:
  * Body: `{ type, jenjang, kelas, mapel, tpKode, materiPokok, model, licenseCode, data }`.
  * Validasi:
    1. Cek kode lisensi resmi aktif.
    2. Validasi konten minimum (judul, pemahamanBermakna, minimal 3 pertanyaan pemantik, minimal 3 tahapan inti, asesmen).
  * Sanitasi: Menghapus identitas guru dan sekolah sebelum disimpan.
  * Penyimpanan: Upstash Redis dengan TTL permanen.

### B. Frontend Service: `src/utils/sharedCurriculumService.ts`
* `fetchSharedCurriculumDocument`: Memeriksa cache lokal `localStorage`, jika tidak ada menghubungi `/api/shared-curriculum`.
* `publishSharedCurriculumDocument`: Mengirim draf ke `/api/shared-curriculum`.

### C. Generator AI: `src/utils/modulAjarAiService.ts`
* Memanggil `callGeminiStructuredJSON` dengan panduan model pembelajaran:
  1. *Problem-Based Learning (PBL)*
  2. *Project-Based Learning (PjBL)*
  3. *Inquiry / Discovery Learning*
  4. *Pembelajaran Berdiferensiasi*
  5. *Pembelajaran Kontekstual (CTL)*
* Menghasilkan struktur `ModulAjarDokumen` lengkap.

### D. Peningkatan UI `ModulAjarViewer.tsx`
* **Top Control Bar**:
  * Pemilih Model Belajar (PBL, PjBL, Inkuiri, Diferensiasi, Kontekstual).
  * Input Konteks Lokal (contoh: *"Pasar tradisional"*, *"Pemanfaatan gadget"*).
  * Tombol **"✨ Buat / Regenerasi AI"**.
  * Tombol **"🤝 Bagikan ke Bank Referensi"**.
  * Banner informatif ringkas jika memuat dari bank bersama:
    `Draf berikut adalah referensi guru lainnya • Siap disesuaikan`
* **Area Cetak Interaktif**:
  * Setiap butir teks menggunakan `AutoExpandingTextarea` untuk pengeditan instan sebelum dicetak/diunduh.

### E. Integrasi Ekspor Word (`docxExporter.ts`)
* Format dokumen Word `.docx` otomatis mengompilasi draf editan terbaru lengkap dengan Kop Surat Sekolah resmi.

---

## 5. Keputusan Teknis Pelaksana (Builder Calls yang Sudah Disepakati)
1. **Format Kunci Komposit**: Disepakati menggunakan `asesmerdeka:shared:<type>:<jenjang>:<kelas>:<mapelSlug>:<tpKode>:<materiSlug>:<model>` untuk menghindari tabrakan antar kelas atau TP kustom.
2. **Validasi Anti-Draf Rusak**: Sistem menolak penyimpanan draf yang teksnya kurang dari panjang minimal standar modul ajar.
3. **Penyimpanan Draf Lokal**: Dokumen lokal yang pernah diedit guru di browser disimpan di key `modul_ajar_<tpId>_<model>` agar hasil editan mereka tidak hilang saat berpindah menu.
4. **Pengujian Menyeluruh**: Menambahkan suite uji otomatis baru di `tests/productionReadiness.test.mjs` (AUD-222) untuk memverifikasi isolasi PII, pembacaan shared bank, dan ketepatan format ekspor Word.
