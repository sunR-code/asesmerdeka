export type StatusSiswa = 'aktif' | 'pindah_rombel' | 'keluar';

export interface SiswaItem {
  id: string;
  noUrut: number;
  nis: string;
  nisn?: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  statusAktif?: StatusSiswa;
  rombelAsal?: string;
  rombelTujuan?: string;
  tanggalMutasi?: string;
  catatanMutasi?: string;
}

export type StatusKehadiran = 'H' | 'S' | 'I' | 'A';

export interface PresensiPertemuan {
  id: string;
  pertemuanKe: number;
  tanggal: string;
  statusMap: { [siswaId: string]: StatusKehadiran };
  catatanPertemuan?: string;
  statusKeterlaksanaan?: 'terlaksana' | 'libur';
}

export type JurnalStatusKeterlaksanaan =
  | 'terlaksana'
  | 'perlu_tindak_lanjut'
  | 'ditunda';

export interface JurnalMengajarItem {
  id: string;
  pertemuanKe: number;
  tanggal: string;
  jamKe: string;
  tpId?: string;
  subTpIds?: string[];
  kodeTP: string;
  materiPokok: string;
  jumlahJP?: number;
  kegiatanPembelajaran: string;
  siswaTidakHadir: string;
  catatanRefleksi: string;
  statusKeterlaksanaan?: JurnalStatusKeterlaksanaan;
  tindakLanjut?: string;
}

export type PredikatKKTP =
  | 'Sangat Baik'
  | 'Baik'
  | 'Cukup'
  | 'Perlu Bimbingan';

export type StatusKelengkapanNilai = 'belum_dinilai' | 'sebagian' | 'lengkap';

export type StatusFinalisasiRapor =
  | 'belum_lengkap'
  | 'draf'
  | 'siap_diperiksa'
  | 'final';

export interface BobotNilaiKebijakan {
  bobotFormatif: number;
  bobotSTS: number;
  bobotSAS: number;
  bobotPraktik?: number;
  kktpMinTuntas?: number;
}

export interface NilaiSiswaItem {
  siswaId: string;
  nama: string;
  nis: string;
  nisn?: string;
  nilaiFormatif: { [kodeTP: string]: number | null | undefined };
  nilaiSTS: number | null;
  nilaiSAS: number | null;
  nilaiPraktik?: number | null;
  nilaiAkhir: number | null;
  predikatKKTP: PredikatKKTP;
  statusNilai?: StatusKelengkapanNilai;
  deskripsiRapor: string;
  catatanGuru?: string;
  statusRapor?: StatusFinalisasiRapor;
  finalizedAt?: string;
}

export type KelasHarianDataSource =
  | 'simulation_demo'
  | 'empty_class'
  | 'user_imported'
  | 'user_manual'
  | 'legacy_unverified';

export interface KelasHarianData {
  rombel: string;
  mataPelajaran: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  tahunAjaran: string;
  isSimulated?: boolean;
  dataSource?: KelasHarianDataSource;
  verifiedActualAt?: string;
  bobotNilai?: BobotNilaiKebijakan;
  archivedSiswa?: SiswaItem[];
  daftarSiswa: SiswaItem[];
  daftarPresensi: PresensiPertemuan[];
  daftarJurnal: JurnalMengajarItem[];
  daftarNilai: NilaiSiswaItem[];
}

export interface StudentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewRow {
  rowIndex: number;
  siswa: SiswaItem;
  status: 'valid' | 'duplicate_nis' | 'duplicate_nisn' | 'duplicate_in_file' | 'invalid';
  message?: string;
}

export interface ImportValidationSummary {
  totalRows: number;
  validRows: ImportPreviewRow[];
  duplicateRows: ImportPreviewRow[];
  invalidRows: ImportPreviewRow[];
  allRows: ImportPreviewRow[];
}
