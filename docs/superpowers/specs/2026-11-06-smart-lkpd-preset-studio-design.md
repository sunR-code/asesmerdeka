# Design Document: Smart LKPD Preset Studio & Contextual Generator

- **Status**: Draft / Under Review
- **Author**: Antigravity & User (Fajar)
- **Target Release**: AsesMerdeka v1.1.0
- **Location**: `docs/superpowers/specs/2026-11-06-smart-lkpd-preset-studio-design.md`

---

## 1. Intent and The Why

### Background
Di dalam ekosistem Kurikulum Merdeka di Indonesia, Kementerian Pendidikan (Kemendikbudristek/BSKAP) tidak menetapkan satu format baku tunggal yang kaku untuk Lembar Kerja Peserta Didik (LKPD). Namun di lapangan nyata:
1. **Pengawas Sekolah / Asesor Supervisi Dinas**: Setiap pengawas atau dinas daerah sering memiliki preferensi instrumen pembelajaran tertentu (misal: wajib menyertakan rubrik diferensiasi, asesmen formatif berkelanjutan, atau studi kasus berbasis profil karakter).
2. **Kebutuhan Relevansi Kelas**: Guru memerlukan materi dan wacana yang peka zaman (*relatable*) bagi peserta didik (misal: isu kecerdasan buatan, perubahan iklim, literasi finansial digital, atau kearifan lokal daerah).
3. **Keterbatasan Format Saat Ini**: LKPD di AsesMerdeka sebelumnya hanya menghasilkan satu format umum berbasis 3 langkah studi kasus deterministik statis tanpa opsi modifikasi format atau kustomisasi langsung di layar.

### Intent
Menyediakan fitur **"Smart LKPD Preset Studio"** pada antarmuka pratinjau LKPD, di mana guru dapat:
- Memilih **4 Archetype Gaya Template LKPD** resmi Kurikulum Merdeka dalam 1 klik.
- Memasukkan kata kunci **Konteks Tren / Isu Aktual** untuk menghasilkan draf studi kasus dan pertanyaan cerdas (Hybrid: AI Gemini jika online/ada API key, atau Algoritma Heuristik Cerdas jika offline).
- Melakukan **Inline Live Editing** (klik-dan-ketik langsung) pada judul, stimulus wacana, langkah aktivitas, butir pertanyaan, dan rubrik penilaian sebelum mencetak atau mengunduh dokumen Word (.docx).

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **G-1 (Multi-Archetype Presets)**: Mendukung 4 gaya pedagogis LKPD:
  1. *Studi Kasus Kontekstual & Literasi Kritis* (default wacana berbasis isu aktual).
  2. *Eksperimen & Penyelidikan Sains/Praktik* (alat/bahan, hipotesis, tabel data pengamatan, analisis).
  3. *Tugas Berdiferensiasi* (aktivitas bertingkat 3 jenjang: Dasar/Perintis, Menengah/Cakap, Mahir).
  4. *Proyek Kolaboratif & Desain Solusi* (pembagian peran tim, panduan pembuatan produk, rubrik presentasi).
- **G-2 (Hybrid Contextual Generator)**:
  - Input cepat kata kunci konteks (misal: *"Isu Sampah Plastik di Pantai"*, *"Etika AI di Kalangan Siswa"*, *"Peluang Wirausaha Remaja"*).
  - Mode Online: Menggunakan Gemini API (dengan BYOK / backend key) menghasilkan narasi dan pertanyaan kontekstual berkualitas tinggi.
  - Mode Offline: Menggunakan generator heuristik berbasis aturan kurikulum lokal tanpa dependensi internet.
- **G-3 (Inline Live Editable Preview)**:
  - Seluruh bagian teks di layar pratinjau (Judul, Stimulus, Instruksi, Pertanyaan) dapat diklik dan diedit langsung.
  - Guru dapat menambah (`[+ Tambah Pertanyaan]`), menghapus, atau menata ulang urutan butir soal.
- **G-4 (Zero-Friction DOCX & Print Export)**:
  - Ekspor DOCX (`exportLKPDToDocx`) dan fungsi Cetak/Export Image langsung mencerminkan teks yang telah diedit guru secara *real-time*.
- **G-5 (Local Persistence)**:
  - Perubahan draf LKPD yang disesuaikan disimpan otomatis di penyimpanan lokal (IndexedDB / LocalStorage) terasosiasi dengan ID TP, sehingga hasil kerja guru tidak hilang saat menutup tab atau berpindah halaman.

### Non-Goals
- Tidak membuat form builder kanvas drag-and-drop yang rumit (seperti Google Forms / Notion block builder) yang memperlambat guru.
- Tidak mengganti atau merusak struktur kurikulum (CP, TP, ATP, Prota, Promes) yang sudah berjalan.
- Tidak mewajibkan koneksi internet atau kunci API (fitur wajib berjalan offline secara mandiri).

### Anti-Goals
- **Anti-Goal 1**: Jangan membuat guru terbebani formulir bertahap yang panjang sebelum melihat hasil. Pengalaman harus tetap *"1-Klik Draf Jadi"*.
- **Anti-Goal 2**: Jangan sampai format ekspor DOCX berantakan atau kehilangan tabel/rubrik saat dibuka di Microsoft Word versi desktop.

---

## 3. Constraints

- **Keamanan & Lisensi**: Fitur tetap tunduk pada sistem lisensi Mayar (Tier Trial/Individu/Sekolah). Ekspor Word dan fitur AI tetap terlindungi oleh validator lisensi yang sudah ada.
- **Offline-First Resilience**: Generator heuristik offline harus selalu siap sedia jika pemanggilan API Gemini gagal, timeout, atau tanpa internet.
- **Desain UI Dashboard V21**: Komponen kontrol baru harus menggunakan arsitektur visual Bento Card, Liquid sliding pill tabs, dan micro-interaction yang konsisten dengan estetika Dashboard V21.

---

## 4. Approaches Considered

1. **Pendekatan 1: Smart Preset Studio (Live Inline Editor Langsung di Lembar LKPD)** — *DIPILIH*
   - Toolbar kontrol di atas lembar dokumen (pilihan 4 archetype + kolom konteks isu aktual + tombol regenerate).
   - Tampilan lembar kerja bersifat WYSIWYG dan inline editable.
   - Ekspor Word langsung mengambil state aktif.
   - *Alasan Dipilih*: Mempertahankan filosofi kecepatan kerja guru (serba cepat, 1 klik jadi draf lengkap, namun bebas diedit sesuai selera pengawas).

2. **Pendekatan 2: Step-by-Step Generator Modal (Wizard 4 Langkah)** — *DITOLAK*
   - Mengharuskan guru melewati formulir langkah demi langkah sebelum melihat hasilnya.
   - *Alasan Ditolak*: Terlalu lambat dan kaku bagi guru yang butuh dokumen supervisi cepat.

3. **Pendekatan 3: Modular Block Builder (Kanvas Bebas Mirip Notion)** — *DITOLAK*
   - Membuat block-based editor dari nol.
   - *Alasan Ditolak*: Terlalu rumit (*over-engineered*), menyita waktu pengembangan, dan membingungkan guru awam.

---

## 5. Detailed Architecture & Design Decisions

### 5.1 Model Data (`src/types/perangkatAjar.ts`)
Perluasan tipe `LKPDDokumen` dengan properti terstruktur khusus untuk tiap archetype (menjamin kemudahan rendering tabel dan keutuhan ekspor DOCX tanpa regex parsing):

```typescript
export type LKPDPresetType = 'kasus' | 'eksperimen' | 'diferensiasi' | 'proyek';

export interface LKPDPertanyaanItem {
  id: string;
  nomor: number;
  pertanyaan: string;
  tingkatKognitif?: 'Dasar' | 'Menengah' | 'Mahir';
  panduanJawabanSingkat?: string; // Dapat disembunyikan/ditampilkan via toggle guru
}

export interface LKPDDokumen {
  // Metadata dasar
  id: string;
  tpId: string;
  presetType: LKPDPresetType;
  konteksAktual?: string;
  judul: string;
  mataPelajaran: string;
  jenjangFase: string;
  kelas: string;
  rombel: string;
  semester: string;
  tahunAjaran: string;
  namaSekolah: string;
  namaGuru: string;
  nipGuru: string;
  kotaSekolah: string;
  createdAt: string;

  tpKode: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  alokasiWaktu: string;
  petunjukPengerjaan: string[];

  // Stimulus Umum
  stimulusKasus: {
    judul: string;
    teks: string;
    pertanyaanAwal?: string;
  };

  // Archetype 1 & 2: Eksperimen & Penyelidikan Terstruktur
  eksperimenData?: {
    alatDanBahan: string[];
    hipotesisAwal: string;
    tabelObservasi: {
      kolom: string[];
      baris: string[][];
    };
  };

  // Archetype 3: Tugas Berdiferensiasi Terstruktur
  diferensiasiData?: {
    tingkatDasar: { instruksi: string; tugas: string[] };
    tingkatMenengah: { instruksi: string; tugas: string[] };
    tingkatMahir: { instruksi: string; tugas: string[] };
  };

  // Archetype 4: Proyek & Pembagian Peran Tim Terstruktur
  proyekData?: {
    tujuanProyek: string;
    tahapanWaktu: string;
    peranAnggota: { peran: string; tanggungJawab: string }[];
    rubrikKarya: { kriteria: string; deskripsiSkor: string }[];
  };

  // Aktivitas Inti & Pertanyaan
  langkahAktivitas: {
    langkahKe: number;
    judulLangkah?: string;
    instruksi: string;
    bantuanAtauTabel?: string[];
  }[];

  pertanyaanAnalisis: LKPDPertanyaanItem[];
}
```

### 5.2 Manajemen Draf & Lifecycle Perpindahan Archetype
- **Independent Draft per Preset**: Sistem menyimpan draf tersendiri per tipe preset (kunci penyimpanan: `lkpd_${tpId}_${presetType}`).
- Saat guru berpindah tab dari "Kasus" ke "Eksperimen", editan pada "Kasus" tidak akan terhapus atau tertimpa. Guru dapat leluasa mengeksplorasi dan membandingkan format tanpa risiko kehilangan data.
- Tombol *"Reset Draf"* hanya mengembalikan preset yang sedang aktif ke draf awal bawaan.

### 5.3 Visibilitas Panduan / Kunci Jawaban
- Di antarmuka `LKPDViewer`, terdapat pill sakelar: `[👁️ Tampilkan Panduan Guru / Kunci Jawaban]`.
- **Mode Siswa (Default)**: `panduanJawabanSingkat` disembunyikan pada pratinjau dan tidak dicetak/diekspor ke Word siswa.
- **Mode Guru**: Guru dapat melihat panduan jawaban sebagai referensi pegangan pengajar.

### 5.2 Antarmuka Pengguna (`src/components/LKPDViewer.tsx`)
Komponen pratinjau diperbarui menjadi **Studio Interaktif**:
1. **Header Action Bar**:
   - Tab Pill 4 Archetype: `[📖 Kasus & Wacana]` `[🔬 Eksperimen & Data]` `[🎯 Berdiferensiasi]` `[🤝 Proyek Tim]`.
   - Input Konteks: Kolom teks ringkas *"Isu/Konteks Khusus (Contoh: Dampak AI bagi Remaja, Banjir Pesisir)"*.
   - Tombol *"⚡ Generate Ulang"* dengan animasi spinner.
2. **Lembar Pratinjau Dokumen (Kertas A4 Putih Bersih)**:
   - Header Kop Sekolah (Logo, Nama Sekolah, Alamat).
   - Tabel Identitas Siswa & Mata Pelajaran.
   - Blok TP & Materi (Teks dapat diedit langsung).
   - Blok Stimulus Wacana (Textarea auto-expand berpenampilan teks biasa).
   - Blok Langkah & Pertanyaan:
     - Setiap butir pertanyaan memiliki tombol hapus (*trash icon*) saat mouse diarahkan.
     - Tombol `[+ Tambah Pertanyaan]` di bawah daftar.
   - Blok Rubrik Penilaian / Asesmen Diri Siswa.
3. **Floating / Sticky Action Bar**:
   - Indikator Status Auto-Save: *"Tersimpan otomatis di peramban"*.
   - Tombol *"Reset ke Draf Awal"*.
   - Tombol *"Salin Teks"*, *"Ekspor Gambar WA"*, *"Cetak"*, dan *"Download Word (.docx)"*.

### 5.4 Mesin Generator & Kebijakan Kuota AI (`src/utils/perangkatAjarEngine.ts`)
- **Generator 4 Archetype Bawaan (Gratis & Mandiri)**:
  - Perpindahan antar 4 tab preset standar selalu **100% Gratis & Bebas Kuota**, menggunakan generator heuristik lokal kurikulum tanpa dependensi internet.
- **Generator Kontekstual Berbasis Topik Tren (AI Priority)**:
  - Ketika guru memasukkan kata kunci tren khusus lalu menekan tombol *"⚡ Generate Ulang"*:
    - **Prioritas Utama**: Memanggil Gemini AI dengan prompt terstruktur agar wacana kasus dan pertanyaan analisis HOTS sangat kaya konteks (*relatable*, dinamis, dan hidup). Operasi ini memotong 1 kredit kuota AI (`deductQuota()`) bagi pengguna Trial/Individu, atau bebas bagi Sekolah.
    - **Smart Fallback Safety Net**: Jika kuota AI habis atau koneksi internet terputus, sistem secara otomatis beralih menggunakan generator heuristik lokal dengan notifikasi ramah: *"Mode offline / kuota AI habis: Draf disusun menggunakan mesin cerdas lokal"*. Aplikasi tidak akan pernah crash, macet, atau menampilkan layar kosong.

### 5.5 Ekspor DOCX (`src/utils/docx/docxPerangkatAjar.ts`)
- Fungsi `exportLKPDToDocx` diperbarui untuk merender tabel dan struktur khusus sesuai `presetType`:
  - Jika `eksperimen`: Merender tabel pengamatan dan kotak hipotesis yang rapi.
  - Jika `diferensiasi`: Merender tabel tugas bertingkat (Tingkat Dasar, Menengah, Mahir).
  - Jika `proyek`: Merender tabel pembagian peran dan matriks rubrik penilaian karya.
  - Menjamin kompatibilitas 100% pada Microsoft Word 2016-2024 dan WPS Office tanpa distorsi tabel.

---

## 6. What's Left to the Builder

Hal-hal teknis implementasi yang diserahkan sepenuhnya kepada implementer:
- Tata letak komponen CSS/Tailwind di dalam `LKPDViewer.tsx` agar tetap rapi dan responsif di layar ponsel maupun desktop.
- Pemilihan library/metode penyimpanan lokal (IndexedDB melalui `idb-keyval` atau `localStorage` dengan kompresi JSON).
- Penanganan auto-save debounce (misal 500ms setelah guru selesai mengetik).
- Format styling warna bordir dan header tabel Word XML di `docxPerangkatAjar.ts` agar senada dengan identitas Kurikulum Merdeka.

---

## 7. Verification Plan

1. **Unit & Engine Tests**:
   - Uji pembuatan 4 tipe preset LKPD menghasilkan struktur data yang valid.
   - Uji fallback heuristik saat fungsi AI diputus atau tanpa API key.
2. **Interactive UI Verification**:
   - Membuka LKPDViewer di peramban, beralih antar 4 tab preset, mengetik teks custom, menambah pertanyaan baru.
   - Memastikan auto-save berjalan dan data tidak hilang saat refresh.
3. **Export Document Verification**:
   - Mengunduh file `.docx` untuk keempat tipe preset.
   - Memverifikasi bahwa dokumen DOCX terbuka tanpa error di Microsoft Word/LibreOffice dan semua hasil editan guru tercetak persis.

