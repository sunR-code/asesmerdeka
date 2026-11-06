export interface SiswaItem {
  id: string;
  noUrut: number;
  nis: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
}

export type StatusKehadiran = 'H' | 'S' | 'I' | 'A';

export interface PresensiPertemuan {
  id: string;
  pertemuanKe: number;
  tanggal: string;
  statusMap: { [siswaId: string]: StatusKehadiran };
}

export interface JurnalMengajarItem {
  id: string;
  pertemuanKe: number;
  tanggal: string;
  jamKe: string;
  kodeTP: string;
  materiPokok: string;
  kegiatanPembelajaran: string;
  siswaTidakHadir: string;
  catatanRefleksi: string;
}

export interface NilaiSiswaItem {
  siswaId: string;
  nama: string;
  nis: string;
  nilaiFormatif: { [kodeTP: string]: number };
  nilaiSTS: number;
  nilaiSAS: number;
  nilaiAkhir: number;
  predikatKKTP: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
  deskripsiRapor: string;
}

export interface KelasHarianData {
  rombel: string;
  mataPelajaran: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  tahunAjaran: string;
  daftarSiswa: SiswaItem[];
  daftarPresensi: PresensiPertemuan[];
  daftarJurnal: JurnalMengajarItem[];
  daftarNilai: NilaiSiswaItem[];
}

