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
  | 'Belum Dinilai'
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

export type JenisBuktiAsesmen =
  | 'tes'
  | 'lkpd'
  | 'praktik'
  | 'proyek'
  | 'observasi';

export type SumberBuktiAsesmen =
  | 'asesmen'
  | 'lkpd'
  | 'jurnal'
  | 'praktik'
  | 'input_guru';

export type StatusKetercapaianBukti =
  | 'Belum Dinilai'
  | 'Perlu Bimbingan'
  | 'Tercapai';

export type PeranBuktiAsesmen = 'awal' | 'reassessment';

export interface BuktiAsesmenSubTP {
  id: string;
  tpId: string;
  tpKode?: string;
  subTpId?: string;
  subTpKode?: string;
  jenisBukti: JenisBuktiAsesmen;
  tanggal: string;
  sumberBukti: SumberBuktiAsesmen;
  peranBukti?: PeranBuktiAsesmen;
  remedialRecordId?: string;
  originalEvidenceId?: string;
  siswaId?: string;
  schoolId?: string;
  classId?: string;
  semesterId?: string;
  asesmenId?: string;
  rangkumanId?: string;
  lkpdId?: string;
  jurnalId?: string;
  skor?: number | null;
  skalaSkor?: number;
  statusKetercapaian?: StatusKetercapaianBukti;
  indikatorYangDiamati: string;
  catatanGuru?: string;
  catatanMiskonsepsi?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type JenisIntervensiRemedial =
  | 'bimbingan_individu'
  | 'kelompok_kecil'
  | 'pengulangan_klasikal'
  | 'penugasan_terbimbing'
  | 'pendekatan_ulang';

export type StatusTindakLanjutRemedial =
  | 'perlu_tindak_lanjut'
  | 'direncanakan'
  | 'berlangsung'
  | 'selesai_perlu_reassessment'
  | 'selesai'
  | 'tuntas_setelah_remedial'
  | 'belum_tuntas';

export type RemedialAuditAction =
  | 'created'
  | 'status_changed'
  | 'activity_updated'
  | 'reassessment_recorded';

export interface RemedialAuditEvent {
  id: string;
  at: string;
  action: RemedialAuditAction;
  fromStatus?: StatusTindakLanjutRemedial;
  toStatus?: StatusTindakLanjutRemedial;
  summary: string;
  evidenceId?: string;
}

export interface HasilPenilaianRemedial {
  skor?: number | null;
  skalaSkor?: number;
  persentase?: number | null;
  status?: StatusKetercapaianBukti;
}

export interface RiwayatRemedialItem {
  id: string;
  siswaId?: string;
  schoolId?: string;
  classId?: string;
  semesterId?: string;
  tpId: string;
  tpKode?: string;
  subTpIds?: string[];
  subTpKodes?: string[];
  attemptAwalId?: string;
  originalEvidenceId?: string;
  tanggalIntervensi: string;
  jenisIntervensi: JenisIntervensiRemedial;
  alasanRemedial?: string;
  rencanaKegiatan?: string;
  hasilKegiatan?: string;
  materiPengulanganId?: string;
  asesmenUlangId?: string;
  reassessmentEvidenceId?: string;
  hasilSebelum?: HasilPenilaianRemedial;
  hasilSesudah?: HasilPenilaianRemedial;
  statusTindakLanjut: StatusTindakLanjutRemedial;
  catatanGuru?: string;
  createdAt?: string;
  updatedAt?: string;
  auditTrail?: RemedialAuditEvent[];
}

export interface BobotNilaiKebijakan {
  bobotFormatif: number;
  bobotSTS: number;
  bobotSAS: number;
  bobotPraktik?: number;
  kktpMinTuntas?: number;
  ambangKelasTindakLanjutPersen?: number;
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
  buktiAsesmenSubTP?: BuktiAsesmenSubTP[];
  riwayatRemedial?: RiwayatRemedialItem[];
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
