export interface KegiatanPembelajaranLangkah {
  pertemuan: number;
  alokasiMenit: number;
  pendahuluan: string[];
  inti: string[];
  penutup: string[];
}

export interface ModulAjarDokumen {
  id: string;
  judul: string;
  mataPelajaran: string;
  jenjangFase: string;
  kelas: string;
  rombel: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  tahunAjaran: string;
  alokasiWaktu: string;
  jumlahPertemuan: number;
  namaSekolah: string;
  namaGuru: string;
  nipGuru: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  kotaSekolah: string;
  createdAt: string;

  // Komponen Kurikulum Merdeka
  tpKode: string;
  materiPokok: string;
  elemen: string;
  tujuanPembelajaran: string;
  kompetensiAwal: string[];
  profilPelajarPancasila: string[];
  saranaPrasarana: string[];
  targetPesertaDidik: string;
  modelPembelajaran: string;

  // Komponen Inti
  pemahamanBermakna: string;
  pertanyaanPemantik: string[];
  kegiatanPembelajaran: KegiatanPembelajaranLangkah[];

  // Asesmen
  asesmen: {
    diagnostik: string;
    formatif: string;
    sumatif: string;
  };
  rubrikPenilaianSingkat: {
    kriteria: string;
    baruBerkembang: string;
    layak: string;
    cakap: string;
    mahir: string;
  }[];

  // Penutup & Lampiran
  pengayaanDanRemedial: {
    pengayaan: string;
    remedial: string;
  };
  refleksiGuru: string[];
  refleksiSiswa: string[];
  glosarium: { istilah: string; definisi: string }[];
  daftarPustaka: string[];
}

export interface LKPDDokumen {
  id: string;
  judul: string;
  mataPelajaran: string;
  jenjangFase: string;
  kelas: string;
  rombel: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
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
  stimulusKasus: {
    judul: string;
    teks: string;
    pertanyaanAwal: string;
  };
  langkahAktivitas: {
    langkahKe: number;
    instruksi: string;
    bantuanAtauTabel?: string[];
  }[];
  pertanyaanAnalisis: {
    nomor: number;
    pertanyaan: string;
    petunjukPengerjaan?: string;
  }[];
  kesimpulanRefleksi: string[];
}

export interface ATPItem {
  no: number;
  kodeTP: string;
  elemen: string;
  lingkupMateri: string;
  tujuanPembelajaran: string;
  alokasiJP: number;
  profilPancasila: string[];
  indikatorKetercapaian: string;
  asesmen: string;
  kataKunci: string;
}

export interface ATPDokumen {
  id: string;
  mataPelajaran: string;
  jenjangFase: string;
  kelas: string;
  tahunAjaran: string;
  satuanPendidikan: string;
  namaGuru: string;
  nipGuru: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  kotaSekolah: string;
  capaianPembelajaranFase: string;
  items: ATPItem[];
  totalJP: number;
}

export interface ProtaItem {
  no: number;
  semester: '1 (Ganjil)' | '2 (Genap)';
  kodeTP: string;
  lingkupMateri: string;
  tujuanPembelajaran: string;
  alokasiJP: number;
  keterangan: string;
}

export interface ProtaDokumen {
  id: string;
  mataPelajaran: string;
  jenjangFase: string;
  kelas: string;
  tahunAjaran: string;
  satuanPendidikan: string;
  namaGuru: string;
  nipGuru: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  kotaSekolah: string;
  itemsSemester1: ProtaItem[];
  itemsSemester2: ProtaItem[];
  totalJPSemester1: number;
  totalJPSemester2: number;
  totalJPTahunan: number;
}

export interface PromesMingguColumn {
  bulanNama: string; // "Juli", "Agustus", dsb.
  mingguKe: number;  // 1..5
  isEfektif: boolean;
  labelKegiatan?: string; // e.g. "MPLS", "STS", "SAS", "Libur"
}

export interface PromesRowItem {
  no: number;
  kodeTP: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  alokasiJP: number;
  distribusiJP: { [colIndex: number]: number }; // index kolom -> jam
}

export interface PromesDokumen {
  id: string;
  mataPelajaran: string;
  jenjangFase: string;
  kelas: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  tahunAjaran: string;
  satuanPendidikan: string;
  namaGuru: string;
  nipGuru: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  kotaSekolah: string;
  columns: PromesMingguColumn[];
  rows: PromesRowItem[];
  totalJPEfektif: number;
}

