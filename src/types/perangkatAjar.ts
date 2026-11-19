import type {
  PromesValidationIssue,
  PromesWeekCategory,
  SemesterAcademicCalendar,
  SubjectJPConfig,
} from './academicSchedule';
import type { CPReferenceMeta } from '../utils/schoolProfileStorage';

export type PengalamanBelajarPM = 'Memahami' | 'Mengaplikasi' | 'Merefleksi';

export type PrinsipPembelajaranPM = 'Berkesadaran' | 'Bermakna' | 'Menggembirakan';

export type FaseKegiatanLangkah = 'pendahuluan' | 'inti' | 'penutup';

export type SMKSubjectTrack = 'umum' | 'kejuruan' | 'tidak_teridentifikasi';

export type CooperativeTechniqueVariant = 'Think-Pair-Share' | 'Jigsaw' | 'STAD';

export interface TahapKegiatanTerstruktur {
  id: string;
  urutan: number;
  fase: FaseKegiatanLangkah;
  namaTahap: string;
  tujuanTahap: string;
  aktivitasGuru: string;
  aktivitasSiswa: string;
  instruksiPertanyaan: string;
  mediaBahan: string;
  durasiMenit: number;
  buktiBelajar: string;
  pengalamanBelajar?: PengalamanBelajarPM;
  prinsipPembelajaran?: PrinsipPembelajaranPM[];
}

export interface AlokasiWaktuModulDetail {
  jenjangKategori: 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK';
  smkTrack?: SMKSubjectTrack;
  jpPerPertemuan: number;
  menitPerJP: number;
  totalMenitPertemuan: number;
  jumlahPertemuan: number;
  totalAlokasiJPTP: number;
  sumberPreset: 'preset_jenjang' | 'konfigurasi_sekolah' | 'override_guru';
}

export interface KegiatanPembelajaranLangkah {
  pertemuan: number;
  alokasiMenit: number;
  jpPertemuan?: number;
  fokusPertemuan?: string;
  pendahuluan: string[];
  inti: string[];
  penutup: string[];
  tahapTerstruktur?: TahapKegiatanTerstruktur[];
}

export interface ModulSubKonsepItem {
  judul: string;
  uraian: string;
}

export interface ModulIstilahPentingItem {
  istilah: string;
  pengertian: string;
}

export interface ModulContohLangkahItem {
  judulContoh: string;
  konteks: string;
  langkahPenyelesaian: string[];
  kesimpulanHasil: string;
}

export interface ModulMiskonsepsiItem {
  miskonsepsi: string;
  caraMeluruskan: string;
}

export interface ModulAsesmenDiagnostikDetail {
  tujuanPemeriksaanPrasyarat: string;
  pertanyaanAtauTugasAwal: string[];
  indikatorInterpretasi: string;
}

export interface ModulAsesmenFormatifDetail {
  instruksiAktivitas: string;
  pertanyaanAtauTugas: string[];
  buktiYangDiamati: string[];
  umpanBalikGuru: string;
}

export interface ModulAsesmenAkhirButir {
  nomor: number;
  bentuk: string;
  pertanyaanAtauTugas: string;
  kunciAtauContohRespons: string;
}

export interface ModulKKTPReferensi {
  mode: 'dinamis_sekolah' | 'deskriptif_rubrik';
  minTuntas?: number;
  rentangLabel?: {
    baruBerkembang: string;
    layak: string;
    cakap: string;
    mahir: string;
  };
  catatan: string;
}

export interface ModulAsesmenAkhirDetail {
  bentukUtama: string;
  butirTugas: ModulAsesmenAkhirButir[];
  pedomanPenilaian: string;
  kktpReferensi?: ModulKKTPReferensi;
}

export interface ModulAsesmenDetail {
  diagnostik: ModulAsesmenDiagnostikDetail;
  formatif: ModulAsesmenFormatifDetail;
  akhir: ModulAsesmenAkhirDetail;
}

export interface ModulJalurDiferensiasi {
  targetKesiapan: string;
  dukunganScaffolding: string;
  aktivitasKonkret: string[];
  mediaPendukung: string;
  buktiBelajarJalur: string;
}

export interface ModulDiferensiasiOperasional {
  prinsipKesetaraanTP: string;
  kesiapanDasar: ModulJalurDiferensiasi;
  kesiapanBerkembang: ModulJalurDiferensiasi;
  kesiapanMahir: ModulJalurDiferensiasi;
}

export interface ModulContohLKPD {
  presetType: LKPDPresetType;
  judul: string;
  konteksTugas: string;
  tujuanPengerjaan: string;
  petunjukSiswa: string[];
  bahanAtauData: string[];
  langkahPengerjaan: string[];
  pertanyaanAtauRuangKerja: string[];
  hasilYangDiharapkan: string;
  kriteriaPenilaian: string[];
  sumberLKPD: 'lkpd_studio_draft' | 'modul_terintegrasi' | 'ai_generated';
}

export type ModulAjarValidationStatus =
  | 'valid_ai'
  | 'template_awal'
  | 'perlu_review_guru'
  | 'gagal_validasi';

export interface ModulAjarQualityValidation {
  status: ModulAjarValidationStatus;
  usedFallback: boolean;
  repairAttempted?: boolean;
  structuralIssues: string[];
  relevanceAndAntiSlopIssues: string[];
  semanticReviewWarnings: string[];
}

export interface ModulAjarDokumen {
  id: string;
  tpId?: string;
  modelType?: string;
  sintaksModelId?: string;
  variasiTeknikModel?: CooperativeTechniqueVariant | string;
  draftSource?: 'user_edited' | 'ai_generated' | 'template' | 'community';
  savedAt?: string;
  schoolId?: string;
  tpSourceHash?: string;
  needsReview?: boolean;
  judul: string;
  mataPelajaran: string;
  jenjangFase: string;
  kelas: string;
  rombel: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  tahunAjaran: string;
  alokasiWaktu: string;
  alokasiWaktuDetail?: AlokasiWaktuModulDetail;
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
  targetSubTP?: { id: string; kode: string; kompetensi: string }[];
  prasyaratMateri?: string;
  buktiKetercapaian?: string[];
  kompetensiAwal: string[];
  profilPelajarPancasila: string[];
  saranaPrasarana: string[];
  targetPesertaDidik: string;
  modelPembelajaran: string;

  // Komponen Inti & Bahan Ajar Substantif
  pemahamanBermakna: string;
  pertanyaanPemantik: string[];
  bahanBacaan?: {
    ringkasanInti: string;
    konsepKunci: string[];
    referensiCatatan?: string;
    penjelasanKonsepUtama?: string;
    subKonsep?: ModulSubKonsepItem[];
    istilahPenting?: ModulIstilahPentingItem[];
    contohKonkret?: string[];
    contohPenyelesaian?: ModulContohLangkahItem;
    hubunganDenganTP?: string;
    potensiMiskonsepsi?: ModulMiskonsepsiItem[];
  };
  kegiatanPembelajaran: KegiatanPembelajaranLangkah[];

  // Asesmen
  asesmen: {
    diagnostik: string;
    formatif: string;
    sumatif: string;
  };
  asesmenDetail?: ModulAsesmenDetail;
  rubrikPenilaianSingkat: {
    kriteria: string;
    baruBerkembang: string;
    layak: string;
    cakap: string;
    mahir: string;
  }[];

  // Diferensiasi Operasional & Contoh LKPD Terintegrasi (Task 12.2)
  diferensiasiOperasional?: ModulDiferensiasiOperasional;
  contohLKPD?: ModulContohLKPD;
  catatanValidasi?: ModulAjarQualityValidation;

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

export type LKPDPresetType = 'kasus' | 'eksperimen' | 'diferensiasi' | 'proyek';

export const LKPD_PRESET_TYPES: readonly LKPDPresetType[] = [
  'kasus',
  'eksperimen',
  'diferensiasi',
  'proyek',
] as const;

export type LKPDWorkMode = 'Individu' | 'Berpasangan' | 'Kelompok Kecil (3–4 Siswa)';

export type LKPDRuangJawabanJenis =
  | 'perhitungan'
  | 'tabel'
  | 'uraian_singkat'
  | 'uraian_panjang'
  | 'langkah_algoritma';

export type LKPDValidationStatus =
  | 'valid_ai'
  | 'valid_terkurasi'
  | 'perlu_review_guru'
  | 'gagal_validasi';

export interface LKPDPertanyaanItem {
  id?: string;
  nomor: number;
  pertanyaan: string;
  tingkatKognitif?: 'Dasar' | 'Menengah' | 'Mahir';
  alasanTingkatKognitif?: string;
  pemetaanSubTP?: string;
  ruangJawabanJenis?: LKPDRuangJawabanJenis;
  panduanJawabanSingkat?: string;
  alternatifJawabanValid?: string;
  petunjukPengerjaan?: string;
}

export interface LKPDEksperimenData {
  alatDanBahan: string[];
  hipotesisAwal: string;
  keselamatanKerja?: string[];
  tabelObservasi: {
    kolom: string[];
    baris: string[][];
  };
}

export interface LKPDDiferensiasiData {
  tingkatDasar: { instruksi: string; tugas: string[] };
  tingkatMenengah: { instruksi: string; tugas: string[] };
  tingkatMahir: { instruksi: string; tugas: string[] };
}

export interface LKPDProyekData {
  tujuanProyek: string;
  tahapanWaktu: string;
  peranAnggota: { peran: string; tanggungJawab: string }[];
  rubrikKarya: { kriteria: string; deskripsiSkor: string }[];
}

export interface LKPDStimulusData {
  jenisData?: 'tabel' | 'persamaan' | 'kutipan_teks' | 'daftar_fakta' | 'algoritma';
  tabelData?: {
    kolom: string[];
    baris: string[][];
  };
  poinKunci?: string[];
  catatanAsumsi?: string;
}

export interface LKPDTeacherAnswerKeyItem {
  nomor: number;
  jawabanInti: string;
  langkahPenyelesaian: string[];
  alternatifValid?: string;
}

export interface LKPDTeacherMisconception {
  miskonsepsi: string;
  caraMenangani: string;
}

export interface LKPDTeacherTPMapping {
  kodeSubTP: string;
  kompetensiTarget: string;
  aktivitasTerkait: string;
}

export interface LKPDTeacherRubricRow {
  aspek: string;
  perluBimbingan: string;
  berkembang: string;
  cakap: string;
  mahir: string;
}

export interface LKPDTeacherGuide {
  kunciDanContohJawaban: LKPDTeacherAnswerKeyItem[];
  miskonsepsiUmum: LKPDTeacherMisconception[];
  pemetaanTP: LKPDTeacherTPMapping[];
  rubrikPenilaian: LKPDTeacherRubricRow[];
  dukunganTambahanGuru?: string;
  pengayaanGuru?: string;
  catatanKurikulum?: string;
}

export interface LKPDPipelineValidation {
  status: LKPDValidationStatus;
  usedFallback: boolean;
  isCuratedFixture: boolean;
  issues: string[];
  warnings: string[];
  mathVerificationNote?: string;
}

export interface LKPDDokumen {
  id: string;
  tpId?: string;
  presetType?: LKPDPresetType;
  draftSource?: 'user_edited' | 'ai_generated' | 'template';
  savedAt?: string;
  schoolId?: string;
  konteksAktual?: string;
  judul: string;
  pendekatanKegiatan?: string;
  modeKerja?: LKPDWorkMode;
  mataPelajaran: string;
  jenjangFase: string;
  kelas: string;
  rombel: string;
  semester: '1 (Ganjil)' | '2 (Genap)' | string;
  tahunAjaran: string;
  namaSekolah: string;
  namaGuru: string;
  nipGuru: string;
  kotaSekolah: string;
  createdAt: string;

  tpKode: string;
  elemen?: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  targetBelajarSiswa?: string[];
  prasyaratMateri?: string[];
  targetSubTP?: { id: string; kode: string; kompetensi: string }[];
  alokasiWaktu: string;
  tpSourceHash?: string;
  needsReview?: boolean;

  petunjukPengerjaan: string[];
  stimulusKasus: {
    judul: string;
    teks: string;
    pertanyaanAwal?: string;
  };
  stimulusData?: LKPDStimulusData;

  // Model aktivitas terstruktur
  eksperimenData?: LKPDEksperimenData;
  diferensiasiData?: LKPDDiferensiasiData;
  proyekData?: LKPDProyekData;

  langkahAktivitas: {
    langkahKe: number;
    judulLangkah?: string;
    instruksi: string;
    bantuanAtauTabel?: string[];
    ruangJawabanJenis?: LKPDRuangJawabanJenis;
    pemetaanSubTP?: string;
  }[];
  pemeriksaanHasil?: string[];
  pertanyaanAnalisis: LKPDPertanyaanItem[];
  produkHasilBelajar?: string;
  kriteriaPenilaianSiswa?: string[];
  dukunganTambahan?: string;
  pengayaan?: {
    instruksi: string;
    tugas: string[];
  };
  kesimpulanRefleksi: string[];

  panduanGuru?: LKPDTeacherGuide;
  catatanValidasi?: LKPDPipelineValidation;
}

export interface ATPItem {
  no: number;
  tpId?: string;
  kodeTP: string;
  elemen: string;
  kompetensi?: string;
  lingkupMateri: string;
  tujuanPembelajaran: string;
  alokasiJP: number;
  profilPancasila: string[];
  indikatorKetercapaian: string;
  buktiKetercapaianList?: string[];
  asesmen: string;
  bentukAsesmen?: string[];
  kataKunci: string;
  deskripsiPrasyarat?: string[];
  prasyaratTpIds?: string[];
  prasyaratKodeLabels?: string[];
  fase?: string;
  alokasiTahunAjaran?: string;
  alokasiKelas?: string;
  alokasiSemester?: '1 (Ganjil)' | '2 (Genap)';
}

export interface ATPDokumen {
  id: string;
  mataPelajaran: string;
  jenjang?: string;
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
  referensiCP?: CPReferenceMeta;
  tanggalDisusun?: string;
  versi?: number;
  statusPenyusunan?: 'draft' | 'disetujui' | 'perlu_ditinjau';
  alasanTinjauUlang?: string[];
  disetujuiPada?: string;
  sertakanPemetaanDiDocx?: boolean;
  peringatanValidasi?: string[];
  totalJPPerSemester?: { semester1: number; semester2: number };
  kapasitasJPPerSemester?: { semester1: number; semester2: number };
  items: ATPItem[];
  totalJP: number;
}

export interface ProtaItem {
  no: number;
  tpId?: string;
  semester: '1 (Ganjil)' | '2 (Genap)';
  kodeTP: string;
  lingkupMateri: string;
  tujuanPembelajaran: string;
  alokasiJP: number;
  mingguMulai?: number;
  mingguSelesai?: number;
  progresSpiral?: string;
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
  sumberSemester1?: 'saved' | 'catalog';
  sumberSemester2?: 'saved' | 'catalog';
  mingguEfektifSemester1?: number;
  mingguEfektifSemester2?: number;
  mingguEfektifTahunan?: number;
  kapasitasJPSemester1?: number;
  kapasitasJPSemester2?: number;
  kapasitasJPTahunan?: number;
  kalenderSem1Terkonfirmasi?: boolean;
  kalenderSem2Terkonfirmasi?: boolean;
  jpConfig?: SubjectJPConfig;
  peringatanProta?: string[];
}

export interface PromesMingguColumn {
  weekKey?: string;
  semesterWeekNumber?: number;
  bulanNama: string; // "Juli", "Agustus", dsb.
  mingguKe: number;  // 1..5
  startDate?: string;
  endDate?: string;
  isEfektif: boolean;
  kategoriMinggu?: PromesWeekCategory;
  labelKegiatan?: string; // e.g. "MPLS", "STS", "SAS", "Libur"
  kapasitasJP?: number;
  hariEfektif?: number;
  hariSekolahNormal?: number;
  catatanHariLibur?: string;
}

export interface PromesRowItem {
  no: number;
  tpId?: string;
  kodeTP: string;
  materiPokok: string;
  tujuanPembelajaran: string;
  alokasiJP: number;
  mingguMulai?: number;
  mingguSelesai?: number;
  jpTerjadwal?: number;
  jpBelumTerjadwal?: number;
  konflikJadwal?: string;
  isManualOverride?: boolean;
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
  totalJPEfektif: number; // Sama dengan totalJPTerjadwal (total jam yang benar-benar terjadwal)
  jpPerMinggu?: number;
  durasiJPMinut?: number;
  pertemuanPerMinggu?: number;
  totalMingguKalender?: number;
  totalMingguEfektif?: number;
  totalMingguNonEfektif?: number;
  totalKapasitasJPSemester?: number;
  totalJPDibutuhkanTP?: number;
  totalJPTerjadwal?: number;
  totalJPBelumTerjadwal?: number;
  selisihKapasitasJP?: number;
  defisitJP?: number;
  surplusJP?: number;
  kalenderTerkonfirmasi?: boolean;
  jpTerkonfirmasi?: boolean;
  calendarSummary?: SemesterAcademicCalendar;
  jpConfig?: SubjectJPConfig;
  validationIssues?: PromesValidationIssue[];
}

