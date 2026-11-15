import type {
  GenerationSource,
  SoalPilihanGanda,
  SoalPilihanGandaKompleks,
  SoalUraian,
} from './assessment';

export type TipeUjianSemester = 'STS' | 'SAS';

export interface KunciJawabanUjian {
  nomor: number;
  tipe: 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'uraian';
  kunci: string;
  pembahasan?: string;
  levelKognitif?: string;
  skor: number;
}

export interface RubrikUraianUjian {
  nomor: number;
  soalRingkas: string;
  contohJawaban?: string;
  pedomanPenskoran?: string;
  kriteriaSkor: { skor: number; deskripsi: string }[];
  skorMaksimal: number;
}

export interface NaskahUjianDokumen {
  id: string;
  schoolId?: string;
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
  tpIds?: string[];
  tpTerliput: {
    id?: string;
    kode: string;
    materiPokok: string;
    alokasiSoal: number;
    subTpCovered?: string[];
  }[];
  soalPG: SoalPilihanGanda[];
  soalPGK: SoalPilihanGandaKompleks[];
  soalUraian: SoalUraian[];
  kunciPG: KunciJawabanUjian[];
  kunciPGK?: KunciJawabanUjian[];
  rubrikUraian: RubrikUraianUjian[];
  totalSoal: number;
  skorMaksimalTotal: number;
  tanggalPenyusunan: string;
  generationSource?: GenerationSource;
  usedFallback?: boolean;
  sourceSummary?: {
    fromBankSoal: number;
    fromDomainBank: number;
    fromFallback: number;
  };
  validationWarnings?: string[];
  isFinalized?: boolean;
}
