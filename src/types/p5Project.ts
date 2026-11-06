export type P5Tema =
  | 'Gaya Hidup Berkelanjutan'
  | 'Kearifan Lokal'
  | 'Bhinneka Tunggal Ika'
  | 'Bangunlah Jiwa dan Raganya'
  | 'Suara Demokrasi'
  | 'Rekayasa dan Teknologi'
  | 'Kewirausahaan'
  | 'Kebekerjaan';

export type DimensiPancasila =
  | 'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia'
  | 'Berkebinekaan Global'
  | 'Bergotong Royong'
  | 'Mandiri'
  | 'Bernalar Kritis'
  | 'Kreatif';

export type KategoriPerkembanganP5 = 'BB' | 'MB' | 'BSH' | 'SB';

export type TahapAktivitasP5 = 
  | 'Pengenalan' 
  | 'Kontekstualisasi' 
  | 'Aksi' 
  | 'Refleksi' 
  | 'Tindak Lanjut' 
  | 'Refleksi & Tindak Lanjut' 
  | 'Aksi & Gelar Karya';

export interface TargetPerkembanganSubElemen {
  dimensi: DimensiPancasila;
  elemen: string;
  subElemen: string;
  targetFase: string;
  rubrik: {
    bb: string;  // Belum Berkembang
    mb: string;  // Mulai Berkembang
    bsh: string; // Berkembang Sesuai Harapan
    sb: string;  // Sangat Berkembang
  };
}

export interface AktivitasP5 {
  no: number;
  tahap: TahapAktivitasP5;
  namaAktivitas: string;
  alokasiJP: number;
  tujuanAktivitas: string;
  langkahKegiatan: string[];
  alatDanBahan: string[];
  peranGuru: string;
  bentukAsesmen?: string;
}

export interface SiswaObservasiP5 {
  nis: string;
  nama: string;
  nilaiDimensi: { [dimensiKey: string]: KategoriPerkembanganP5 };
  catatanProses: string;
}

export interface P5ProjectDocument {
  id: string;
  judulProjek: string;
  tema: P5Tema;
  jenjang: string;
  fase: string;
  kelas: string;
  tahunAjaran: string;
  alokasiTotalJP: number;
  namaSekolah: string;
  koordinatorProjek: string;
  fasilitatorList: string[];
  deskripsiSingkat: string;
  relevansiProjek: string;
  dimensiTarget: TargetPerkembanganSubElemen[];
  alurAktivitas: AktivitasP5[];
  rencanaAsesmen: {
    diagnostik: string;
    formatif: string;
    sumatif: string;
  };
  rekapObservasiSiswa: SiswaObservasiP5[];
  tanggalPenyusunan: string;
}
