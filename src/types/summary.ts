import type { JenjangFase } from './assessment';

export type GayaRangkuman = 
  | 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)'
  | 'Struktur Ringkas & Poin Kunci (Infografis)'
  | 'Analitis & Mendalam (Cocok SMA/SMK)'
  | 'Tanya-Jawab & Rumus Praktis';

export interface PoinRangkuman {
  judul: string;
  penjelasan: string;
  analogi?: string;
  poinKunci?: string[];
}

export interface IstilahGlosarium {
  istilah: string;
  makna: string;
}

export interface KuisKilatRangkuman {
  nomor: number;
  pertanyaan: string;
  jawaban: string;
}

export interface RumusAtauPolaItem {
  label: string;
  isi: string;
}

export interface ContohKonkretRangkuman {
  judulContoh: string;
  teksContoh: string;
  bedahAnalisis: string[];
}

export interface RangkumanDokumen {
  id: string;
  createdAt: string;
  judul: string;
  mataPelajaran: string;
  jenjangFase: JenjangFase;
  kelas: string;
  topik: string;
  sumberAsal: 'upload' | 'keinginan_user';
  gayaBahasa: GayaRangkuman;
  
  // Konten Rangkuman Menarik & Mendalam
  ringkasanSatuKalimat: string;
  petaKonsep: string[];
  rumusAtauPola?: RumusAtauPolaItem[]; // Struktur Teks / Grammar / Rumus Cepat / Kerangka Inti
  poinUtama: PoinRangkuman[];
  contohKonkret?: ContohKonkretRangkuman; // Contoh Teks Model / Contoh Soal & Bedah Analisis
  tipsUjian?: string[]; // Tips Jitu Ujian & Kesalahan yang Sering Terjadi
  faktaMenarik: string[]; // "Tahukah Kamu?"
  glosarium: IstilahGlosarium[]; // Istilah-istilah penting / Vocabulary Bank
  kuisKilat: KuisKilatRangkuman[]; // Pertanyaan pemantik & latihan pemahaman
  pesanInspirasi: string; // Catatan penyemangat belajar
}

export interface RangkumanRequest {
  modeInput: 'upload' | 'keinginan_user';
  teksUpload?: string;
  namaFile?: string;
  topik?: string;
  catatanKeinginan?: string;
  mataPelajaran: string;
  jenjangFase: JenjangFase;
  kelas: string;
  gayaBahasa: GayaRangkuman;
  geminiApiKey?: string;
}

