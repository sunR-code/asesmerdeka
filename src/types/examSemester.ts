import type { SoalPilihanGanda, SoalPilihanGandaKompleks, SoalUraian } from './assessment';

export type TipeUjianSemester = 'STS' | 'SAS';

export interface KunciJawabanUjian {
  nomor: number;
  tipe: 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'uraian';
  kunci: string;
  pembahasan?: string;
  skor: number;
}

export interface RubrikUraianUjian {
  nomor: number;
  soalRingkas: string;
  kriteriaSkor: { skor: number; deskripsi: string }[];
  skorMaksimal: number;
}

export interface NaskahUjianDokumen {
  id: string;
  tipe: TipeUjianSemester;
  namaUjian: string;
  mataPelajaran: string;
  jenjang: string;
  kelas: string;
  rombel: string;
  semester: string;
  tahunAjaran: string;
  alokasiWaktu: string;
  namaSekolah: string;
  namaGuru: string;
  nipGuru: string;
  petunjukUmum: string[];
  tpTerliput: { kode: string; materiPokok: string; alokasiSoal: number }[];
  soalPG: SoalPilihanGanda[];
  soalPGK: SoalPilihanGandaKompleks[];
  soalUraian: SoalUraian[];
  kunciPG: KunciJawabanUjian[];
  kunciPGK?: KunciJawabanUjian[];
  rubrikUraian: RubrikUraianUjian[];
  totalSoal: number;
  skorMaksimalTotal: number;
  tanggalPenyusunan: string;
}
