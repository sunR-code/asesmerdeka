import type { JenjangFase } from '../types/assessment';
import type { CustomTPItem } from './schoolProfileStorage';
import { getRichCurriculumTopics } from '../data/kurikulumTopicBank';
import { resolveCPReferenceMetadata } from '../data/kurikulumMerdekaCP';

export type JenjangKategori = 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK';

export interface JenjangConfig {
  id: JenjangKategori;
  label: string;
  subLabel: string;
  kelasList: { kelas: string; fase: JenjangFase }[];
  mapelUmum: string[];
  mapelMadrasah: string[];
}

export const KURIKULUM_CATALOG: Record<JenjangKategori, {
  id: JenjangKategori;
  label: string;
  subLabel: string;
  kelasList: { kelas: string; fase: JenjangFase }[];
  mapelUmum: string[];
  mapelMadrasah: string[];
}> = {
  'SD/MI': {
    id: 'SD/MI',
    label: 'SD / MI',
    subLabel: 'Fase A, B, C (Kelas 1–6)',
    kelasList: [
      { kelas: '1', fase: 'Fase A (Kelas 1-2 SD)' },
      { kelas: '2', fase: 'Fase A (Kelas 1-2 SD)' },
      { kelas: '3', fase: 'Fase B (Kelas 3-4 SD)' },
      { kelas: '4', fase: 'Fase B (Kelas 3-4 SD)' },
      { kelas: '5', fase: 'Fase C (Kelas 5-6 SD)' },
      { kelas: '6', fase: 'Fase C (Kelas 5-6 SD)' },
    ],
    mapelUmum: [
      'Matematika',
      'Bahasa Indonesia',
      'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
      'Pendidikan Pancasila',
      'Bahasa Inggris',
      'SENI dan Budaya',
      'PJOK',
      'Pendidikan Agama Islam & Budi Pekerti',
    ],
    mapelMadrasah: [
      'Al-Qur\'an Hadis (MI)',
      'Akidah Akhlak (MI)',
      'Fikih (MI)',
      'Sejarah Kebudayaan Islam / SKI (MI)',
      'Bahasa Arab (MI)',
    ],
  },
  'SMP/MTs': {
    id: 'SMP/MTs',
    label: 'SMP / MTs',
    subLabel: 'Fase D (Kelas 7–9)',
    kelasList: [
      { kelas: '7', fase: 'Fase D (Kelas 7-9 SMP)' },
      { kelas: '8', fase: 'Fase D (Kelas 7-9 SMP)' },
      { kelas: '9', fase: 'Fase D (Kelas 7-9 SMP)' },
    ],
    mapelUmum: [
      'Matematika',
      'Bahasa Indonesia',
      'IPA (Ilmu Pengetahuan Alam)',
      'IPS (Ilmu Pengetahuan Sosial)',
      'Bahasa Inggris',
      'Pendidikan Pancasila',
      'Informatika',
      'PJOK',
      'Seni Budaya / Prakarya',
      'Pendidikan Agama Islam & Budi Pekerti',
    ],
    mapelMadrasah: [
      'Al-Qur\'an Hadis (MTs)',
      'Akidah Akhlak (MTs)',
      'Fikih (MTs)',
      'Sejarah Kebudayaan Islam / SKI (MTs)',
      'Bahasa Arab (MTs)',
    ],
  },
  'SMA/MA': {
    id: 'SMA/MA',
    label: 'SMA / MA',
    subLabel: 'Fase E & F (Kelas 10–12)',
    kelasList: [
      { kelas: '10', fase: 'Fase E (Kelas 10 SMA/SMK)' },
      { kelas: '11', fase: 'Fase F (Kelas 11-12 SMA/SMK)' },
      { kelas: '12', fase: 'Fase F (Kelas 11-12 SMA/SMK)' },
    ],
    mapelUmum: [
      'Matematika',
      'Bahasa Indonesia',
      'Bahasa Inggris',
      'Fisika',
      'Kimia',
      'Biologi',
      'Ekonomi',
      'Sosiologi',
      'Geografi',
      'Sejarah',
      'Pendidikan Pancasila',
      'Informatika',
    ],
    mapelMadrasah: [
      'Al-Qur\'an Hadis (MA)',
      'Akidah Akhlak (MA)',
      'Fikih / Ushul Fikih (MA)',
      'Sejarah Kebudayaan Islam / SKI (MA)',
      'Bahasa Arab (MA)',
    ],
  },
  'SMK': {
    id: 'SMK',
    label: 'SMK / MAK',
    subLabel: 'Fase E & F (Kejuruan 10–12)',
    kelasList: [
      { kelas: '10', fase: 'Fase E (Kelas 10 SMA/SMK)' },
      { kelas: '11', fase: 'Fase F (Kelas 11-12 SMA/SMK)' },
      { kelas: '12', fase: 'Fase F (Kelas 11-12 SMA/SMK)' },
    ],
    mapelUmum: [
      'Matematika Kejuruan',
      'Bahasa Indonesia',
      'Bahasa Inggris Profesi',
      'Projek IPAS (SMK)',
      'Informatika / Dasar Kejuruan',
      'Produk Kreatif dan Kewirausahaan (PKK)',
      'Pendidikan Pancasila',
      'Sejarah',
    ],
    mapelMadrasah: [
      'Pendidikan Agama Islam & Budi Pekerti',
      'Bahasa Arab Kejuruan',
    ],
  },
};

export function detectKategoriFromFase(fase: JenjangFase, mataPelajaran?: string): JenjangKategori {
  if (fase.includes('SD')) return 'SD/MI';
  if (fase.includes('SMP')) return 'SMP/MTs';
  if (mataPelajaran) {
    const lower = mataPelajaran.toLowerCase();
    if (
      lower.includes('kejuruan') ||
      lower.includes('profesi') ||
      lower.includes('pkk') ||
      lower.includes('projek ipas') ||
      lower.includes('smk')
    ) {
      return 'SMK';
    }
  }
  return 'SMA/MA';
}

export interface TopicSuggestion {
  topik: string;
  elemen?: string;
  arahanRangkuman: string;
  tujuanPembelajaran: string;
  kompetensiInti?: string;
  prasyarat?: string[];
  buktiKetercapaian?: string[];
  estimasiMenitSesi?: number;
  subTP?: {
    kodeSuffix: string;
    kompetensi: string;
    fokusMateri: string;
    buktiKetercapaian: string;
    estimasiMenit?: number;
  }[];
}

/**
 * Menghasilkan daftar rekomendasi topik, arahan rangkuman, elemen CP, dan TP
 * berdasarkan Mata Pelajaran, Jenjang Fase, dan Kelas.
 */
export function getSuggestedTopics(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string
): TopicSuggestion[] {
  return getRichCurriculumTopics(mataPelajaran, jenjangFase, kelas);
}

export interface SemesterCurriculumPlan {
  capaianPembelajaran: string;
  referensiCatatan: string;
  referensiCP?: CustomTPItem['referensiCP'];
  tpList: CustomTPItem[];
}

export function getSemesterCurriculumPlan(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string,
  semester: string = '1 (Ganjil)'
): SemesterCurriculumPlan {
  const richTopics = getRichCurriculumTopics(mataPelajaran, jenjangFase, kelas);
  const isSem2 = semester.startsWith('2') || semester.toLowerCase().includes('genap');

  // Urutan penempatan topik semester (rancangan ATP aplikasi, dapat diubah guru)
  const ordered = isSem2 && richTopics.length >= 4
    ? [richTopics[2], richTopics[3], richTopics[0], richTopics[1], ...richTopics.slice(4)]
    : richTopics;

  const uniqueTopics: typeof richTopics = [];
  const seen = new Set<string>();
  for (const item of ordered) {
    const key = item.topik.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTopics.push(item);
    }
    if (uniqueTopics.length >= 4) break;
  }

  const cleanKelas = kelas.replace(/[^0-9]/g, '') || '8';

  const tpList: CustomTPItem[] = uniqueTopics.map((item, idx) => {
    const nomorTP = isSem2 ? idx + 5 : idx + 1;
    const kode = `${cleanKelas}.${nomorTP}`;
    const mingguMulai = idx * 4 + 1;
    const mingguSelesai = (idx + 1) * 4;
    const refCP = resolveCPReferenceMetadata(mataPelajaran, jenjangFase, item.elemen);

    return {
      id: `tp-${cleanKelas}-${nomorTP}`,
      kode,
      elemen: item.elemen,
      materiPokok: item.topik,
      tujuanPembelajaran: item.tujuanPembelajaran,
      arahanRangkuman: item.arahanRangkuman,
      alokasiJP: idx === 1 || idx === 2 ? 16 : 12,
      mingguMulai,
      mingguSelesai,
      kompetensiInti: item.kompetensiInti,
      lingkupMateri: item.topik,
      prasyarat: item.prasyarat,
      buktiKetercapaian: item.buktiKetercapaian,
      estimasiMenitSesi: item.estimasiMenitSesi,
      statusReview: 'draft',
      referensiCP: refCP,
      subTP: item.subTP.map((sub) => ({
        id: `subtp-${cleanKelas}-${nomorTP}-${sub.kodeSuffix.toLowerCase()}`,
        kode: `${kode}.${sub.kodeSuffix}`,
        kompetensi: sub.kompetensi,
        fokusMateri: sub.fokusMateri,
        buktiKetercapaian: sub.buktiKetercapaian,
        estimasiMenit: sub.estimasiMenit,
      })),
    };
  });

  const faseShort = jenjangFase.split('(')[0].trim();
  const elemenUnik = Array.from(new Set(tpList.map((t) => t.elemen)));
  const ringkasanMateri = tpList.map((t) => t.materiPokok).join('; ');
  const firstRef = tpList[0]?.referensiCP;

  const capaianPembelajaran = `Ringkasan rancangan cakupan semester (${faseShort}, Kelas ${cleanKelas} Semester ${
    isSem2 ? 'Genap' : 'Ganjil'
  }) untuk ${mataPelajaran} meliputi elemen ${elemenUnik.join(', ')} dengan materi: ${ringkasanMateri}. Catatan: Ini adalah ringkasan perencanaan ATP buatan aplikasi, bukan kutipan naskah keputusan resmi SK CP nasional — harap ditinjau guru sebelum digunakan.`;

  return {
    capaianPembelajaran,
    referensiCatatan:
      firstRef?.catatan ||
      'Susunan elemen dan pembagian semester merupakan rancangan aplikasi; mohon tinjau terhadap CP fase satuan pendidikan Anda.',
    referensiCP: firstRef,
    tpList,
  };
}
