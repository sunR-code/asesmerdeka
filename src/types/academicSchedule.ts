export type PromesWeekCategory =
  | 'efektif'
  | 'mpls'
  | 'sts'
  | 'sas'
  | 'rapor'
  | 'libur_sekolah'
  | 'libur_nasional'
  | 'kegiatan_khusus'
  | 'non_efektif';

export type CalendarEventCategory =
  | 'libur_sekolah'
  | 'libur_nasional'
  | 'kegiatan_khusus';

export interface AcademicDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label?: string;
}

export interface AcademicSpecialEvent {
  id: string;
  nama: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  kategori: CalendarEventCategory;
  blokirPembelajaran: boolean;
  catatan?: string;
}

export interface ManualWeekOverride {
  isEfektif: boolean;
  labelKegiatan?: string;
  kategori?: PromesWeekCategory;
}

export type CalendarConfirmationStatus =
  | 'template_belum_dikonfirmasi'
  | 'dikonfirmasi_sekolah';

export interface SemesterAcademicCalendar {
  schoolId: string;
  tahunAjaran: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  statusKonfirmasi: CalendarConfirmationStatus;
  confirmedAt?: string;
  updatedAt?: string;
  hariSekolahPerMinggu: 5 | 6;
  tanggalMulaiSemester: string;
  tanggalAkhirSemester: string;
  mplsRange: AcademicDateRange | null;
  stsRange: AcademicDateRange;
  sasRange: AcademicDateRange;
  pembagianRaporDate: string;
  liburSekolah: AcademicSpecialEvent[];
  liburNasionalKeagamaan: AcademicSpecialEvent[];
  kegiatanKhususSekolah: AcademicSpecialEvent[];
  manualWeekOverrides: Record<string, ManualWeekOverride>;
  catatanKalender?: string;
}

export type JPConfirmationStatus =
  | 'estimasi_belum_dikonfirmasi'
  | 'dikonfirmasi_sekolah';

export interface SubjectJPConfig {
  schoolId: string;
  jenjang: string;
  kelas: string;
  mataPelajaran: string;
  jpPerMinggu: number;
  durasiJPMinut: number;
  pertemuanPerMinggu: number;
  tersediaDiKatalogDefault: boolean;
  statusKonfirmasi: JPConfirmationStatus;
  sumberReferensi: string;
  catatan?: string;
  updatedAt?: string;
}

export interface PromesValidationIssue {
  kode:
    | 'OVERFLOW_ALOKASI'
    | 'OVERFLOW_RENTANG_TP'
    | 'DEFISIT_KAPASITAS'
    | 'SURPLUS_KAPASITAS'
    | 'RENTANG_MINGGU_TIDAK_VALID'
    | 'KALENDER_BELUM_DIKONFIRMASI'
    | 'JP_BELUM_DIKONFIRMASI'
    | 'KONFLIK_LIBUR_MANUAL';
  severity: 'error' | 'warning' | 'info';
  tpKode?: string;
  pesan: string;
}
