import type { RangkumanDokumen } from './summary';

export type JenjangFase = 
  | 'Fase A (Kelas 1-2 SD)'
  | 'Fase B (Kelas 3-4 SD)'
  | 'Fase C (Kelas 5-6 SD)'
  | 'Fase D (Kelas 7-9 SMP)'
  | 'Fase E (Kelas 10 SMA/SMK)'
  | 'Fase F (Kelas 11-12 SMA/SMK)';

export type TipeAsesmen = 
  | 'Formatif (Diagnostik Awal)'
  | 'Formatif (Proses Pembelajaran)'
  | 'Sumatif (Tengah Semester / STS)'
  | 'Sumatif (Akhir Semester / SAS)'
  | 'Sumatif (Akhir Fase / Ujian Sekolah)';

export type LevelKognitif = 'LOTS (C1-C2)' | 'MOTS (C3)' | 'HOTS (C4-C6)' | 'Campuran Berimbang';

export type TipeSoal = 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'menjodohkan' | 'uraian';

export interface SoalPilihanGanda {
  id: string;
  nomor: number;
  tipe: 'pilihan_ganda';
  stimulus?: string; // Teks bacaan, data, skenario konteks nyata
  pertanyaan: string;
  pilihan: {
    label: 'A' | 'B' | 'C' | 'D' | 'E';
    teks: string;
  }[];
  kunci: 'A' | 'B' | 'C' | 'D' | 'E';
  pembahasan: string;
  levelKognitif: string; // misal: C4 (Menganalisis)
  indikatorSoal: string;
  skor: number;
}

export interface SoalPilihanGandaKompleks {
  id: string;
  nomor: number;
  tipe: 'pilihan_ganda_kompleks';
  stimulus?: string;
  pertanyaan: string;
  pernyataan: {
    id: string;
    teks: string;
    isBenar: boolean;
  }[];
  pembahasan: string;
  levelKognitif: string;
  indikatorSoal: string;
  skor: number;
}

export interface SoalUraian {
  id: string;
  nomor: number;
  tipe: 'uraian';
  stimulus?: string;
  pertanyaan: string;
  pedomanPenskoran: string;
  contohJawaban: string;
  levelKognitif: string;
  indikatorSoal: string;
  skorMaksimal: number;
}

export type ButirSoal = SoalPilihanGanda | SoalPilihanGandaKompleks | SoalUraian;

export interface KriteriaRubrik {
  tujuanPembelajaran: string;
  buktiKetercapaian: string;
  perluBimbingan: string;  // 0 - 60
  cukup: string;            // 61 - 70
  baik: string;             // 71 - 85
  sangatBaik: string;       // 86 - 100
}

export interface AsesmenDokumen {
  id: string;
  createdAt: string;
  judul: string;
  mataPelajaran: string;
  jenjangFase: JenjangFase;
  kelas: string;
  tipeAsesmen: TipeAsesmen;
  alokasiWaktu: string;
  tahunAjaran: string;
  namaSekolah: string;
  namaPenyusun: string;
  
  // Konsep Kurikulum Merdeka
  capaianPembelajaran: string;
  tujuanPembelajaran: string[];
  materiPokok: string;
  profilPelajarPancasila: string[];

  // Konten Soal & Rubrik
  petunjukUmum: string[];
  soalList: ButirSoal[];
  rubrikKKTP: KriteriaRubrik[];

  // Security / Anti-Piracy watermark
  licenseId?: string;
  authorEmail?: string;
  watermarkText?: string;
}

export interface GenerationRequest {
  mataPelajaran: string;
  jenjangFase: JenjangFase;
  kelas: string;
  tipeAsesmen: TipeAsesmen;
  materiPokok: string;
  tujuanPembelajaranInput: string;
  jumlahPG: number;
  jumlahPGK: number;
  jumlahUraian: number;
  levelKognitif: LevelKognitif;
  sertakanRubrik: boolean;
  alokasiWaktu: string;
  namaSekolah?: string;
  namaGuru?: string;
  geminiApiKey?: string;
  sourceRangkuman?: RangkumanDokumen;
}

export type LicenseTier = 'free' | 'guru' | 'sekolah' | 'pro' | 'sekolah_pro';

export interface UserQuota {
  tier: LicenseTier;
  remainingCredits: number;
  maxCredits: number;
  deviceId: string;
  licenseKey?: string;
  lastResetDate?: string;
}
