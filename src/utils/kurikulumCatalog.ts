import type { JenjangFase } from '../types/assessment';
import type { CustomTPItem } from './schoolProfileStorage';
import type { SavedCPEntry } from './cpStorage';
import {
  getRichCurriculumTopics,
  lookupCuratedTopicBank,
  resolveNormalizedJenjang,
  type CurriculumTopicEntry,
  type TopicSourceVerificationStatus,
} from '../data/kurikulumTopicBank';
import {
  getAvailableCPReferenceEntries,
  resolveCPReferenceMetadata,
} from '../data/kurikulumMerdekaCP';
import { createImmutableDefaultTPId } from './storageIdentity';
import { resolveDefaultSubjectJPConfig } from './jpConfigStorage';
import type { ATPAllocationMapping, PhaseATPPlan } from './atpStorage';

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
  return resolveNormalizedJenjang(fase, mataPelajaran || '');
}

export interface TopicSuggestion {
  topicId?: string;
  topik: string;
  elemen?: string;
  arahanRangkuman: string;
  tujuanPembelajaran: string;
  kompetensiInti?: string;
  prasyarat?: string[];
  prasyaratTopicIds?: string[];
  progressionStage?: CurriculumTopicEntry['progressionStage'];
  spiralRelation?: CurriculumTopicEntry['spiralRelation'];
  buktiKetercapaian?: string[];
  estimasiMenitSesi?: number;
  sumberDokumen?: string;
  statusVerifikasiSumber?: TopicSourceVerificationStatus;
  jenisKonten?: CurriculumTopicEntry['jenisKonten'];
  urlReferensi?: string;
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
 * berdasarkan Mata Pelajaran, Jenjang Fase, Kelas, dan (opsional) Semester.
 */
export function getSuggestedTopics(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string,
  semester?: string
): TopicSuggestion[] {
  return getRichCurriculumTopics(mataPelajaran, jenjangFase, kelas, semester);
}

export interface SemesterCurriculumPlan {
  capaianPembelajaran: string;
  referensiCatatan: string;
  referensiCP?: CustomTPItem['referensiCP'];
  tpList: CustomTPItem[];
  coverageStatus?: TopicSourceVerificationStatus;
  isEmptyState?: boolean;
  emptyStateMessage?: string;
  emptyStateActions?: Array<'tempel_cp' | 'pilih_referensi_cp' | 'susun_manual' | 'usulan_ai'>;
  hasVerifiedOfficialCP?: boolean;
  isSyntheticSummary?: boolean;
  sumberDokumen?: string;
  progressionTopics?: CurriculumTopicEntry[];
}

export interface SemesterPlanContext {
  schoolId?: string;
  tahunAjaran?: string;
  savedCPEntries?: SavedCPEntry[];
  phaseATPPlan?: PhaseATPPlan | null;
  availablePhaseTPs?: CustomTPItem[];
}

export function buildCustomTPFromTopicEntry(
  item: CurriculumTopicEntry,
  params: {
    mataPelajaran: string;
    jenjangFase: JenjangFase;
    jenjangCategory: JenjangKategori;
    cleanKelas: string;
    semester: '1 (Ganjil)' | '2 (Genap)';
    nomorTP: number;
    mingguMulai: number;
    mingguSelesai: number;
    alokasiJP: number;
    schoolId?: string;
    tahunAjaran?: string;
    savedCPEntries?: SavedCPEntry[];
  }
): CustomTPItem {
  const {
    mataPelajaran,
    jenjangFase,
    jenjangCategory,
    cleanKelas,
    semester,
    nomorTP,
    mingguMulai,
    mingguSelesai,
    alokasiJP,
    schoolId,
    tahunAjaran,
    savedCPEntries,
  } = params;

  const kode = `${cleanKelas}.${nomorTP}`;
  const matchingSavedCP = (savedCPEntries || []).find(
    (cp) => cp.elemenCP.toLowerCase().trim() === item.elemen.toLowerCase().trim()
  ) || savedCPEntries?.[0];

  const baseRefCP = resolveCPReferenceMetadata(mataPelajaran, jenjangFase, item.elemen, jenjangCategory);
  const refCP: CustomTPItem['referensiCP'] = matchingSavedCP
    ? {
        ...baseRefCP,
        sumber: matchingSavedCP.namaDokumenSumber || baseRefCP.sumber,
        elemenCP: matchingSavedCP.elemenCP || item.elemen,
        teksCP: matchingSavedCP.teksCP,
        asalCP: matchingSavedCP.asalCP,
        namaDokumenSumber: matchingSavedCP.namaDokumenSumber,
        nomorDokumen: matchingSavedCP.nomorDokumen,
        tahunVersiDokumen: matchingSavedCP.tahunVersiDokumen,
        urlReferensi: matchingSavedCP.urlReferensi || item.urlReferensi,
        statusVerifikasi: matchingSavedCP.statusVerifikasi,
        terverifikasiResmi: matchingSavedCP.terverifikasiResmi,
        cpEntryId: matchingSavedCP.id,
        catatan: matchingSavedCP.catatan || baseRefCP.catatan,
      }
    : {
        ...baseRefCP,
        namaDokumenSumber: baseRefCP.namaDokumenSumber || item.sumberDokumen,
        urlReferensi: item.urlReferensi || baseRefCP.urlReferensi,
      };

  const immutableTpId = createImmutableDefaultTPId({
    schoolId,
    tahunAjaran,
    jenjangFase,
    kelas: cleanKelas,
    semester,
    mataPelajaran,
    topicKey: `${item.topik}::${nomorTP}`,
  });

  return {
    id: immutableTpId,
    kode,
    elemen: item.elemen,
    materiPokok: item.topik,
    tujuanPembelajaran: item.tujuanPembelajaran,
    arahanRangkuman: item.arahanRangkuman,
    alokasiJP,
    mingguMulai,
    mingguSelesai,
    kompetensiInti: item.kompetensiInti,
    lingkupMateri: item.lingkupMateri || item.topik,
    prasyarat: item.prasyarat,
    buktiKetercapaian: item.buktiKetercapaian,
    estimasiMenitSesi: item.estimasiMenitSesi,
    statusReview: 'draft',
    referensiCP: refCP,
    subTP: item.subTP.map((sub) => ({
      id: `${immutableTpId}__sub_${sub.kodeSuffix.toLowerCase()}`,
      kode: `${kode}.${sub.kodeSuffix}`,
      kompetensi: sub.kompetensi,
      fokusMateri: sub.fokusMateri,
      buktiKetercapaian: sub.buktiKetercapaian,
      estimasiMenit: sub.estimasiMenit,
    })),
    sourceTopicId: item.topicId,
    progressionStage: item.progressionStage,
    topicJenisKonten: item.jenisKonten,
    topicStatusVerifikasi: item.statusVerifikasiSumber,
    spiralRelation: item.spiralRelation,
  };
}

export function getSemesterCurriculumPlan(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string,
  semester: string = '1 (Ganjil)',
  context?: SemesterPlanContext
): SemesterCurriculumPlan {
  const isSem2 = semester.startsWith('2') || semester.toLowerCase().includes('genap');
  const normSemester: '1 (Ganjil)' | '2 (Genap)' = isSem2 ? '2 (Genap)' : '1 (Ganjil)';
  const cleanKelas = kelas.replace(/[^0-9]/g, '') || '8';
  const jenjangCategory = detectKategoriFromFase(jenjangFase, mataPelajaran);

  // 1. Jika Phase ATP sudah dipetakan untuk semester & kelas target, hormati pemetaan ATP tersebut
  if (context?.phaseATPPlan && Array.isArray(context.availablePhaseTPs) && context.availablePhaseTPs.length > 0) {
    const semCodeTarget = isSem2 ? '2' : '1';
    const tpById = new Map(context.availablePhaseTPs.map((t) => [t.id, t]));
    const allocMap = new Map<string, ATPAllocationMapping>();
    for (const a of context.phaseATPPlan.allocations) {
      const aSem = a.semester.startsWith('2') ? '2' : '1';
      if (aSem === semCodeTarget && (!a.kelas || a.kelas.replace(/[^0-9]/g, '') === cleanKelas)) {
        allocMap.set(a.tpId, a);
      }
    }
    const atpMappedTPs = context.phaseATPPlan.orderedTpIds
      .filter((id) => allocMap.has(id) && tpById.has(id))
      .map((id) => {
        const tp = tpById.get(id)!;
        const alloc = allocMap.get(id)!;
        return alloc.alokasiJP !== undefined ? { ...tp, alokasiJP: alloc.alokasiJP } : tp;
      });

    if (atpMappedTPs.length > 0) {
      const refFromCP = context.savedCPEntries?.[0];
      return {
        capaianPembelajaran: refFromCP?.teksCP
          ? refFromCP.teksCP
          : `Menggunakan pemetaan ATP Fase (${context.phaseATPPlan.fase}) untuk ${mataPelajaran} Kelas ${cleanKelas} ${normSemester}.`,
        referensiCatatan:
          context.phaseATPPlan.referensiCP?.catatan ||
          'Urutan dan semester TP bersumber dari Alur Tujuan Pembelajaran (ATP) fase yang sedang aktif.',
        referensiCP: context.phaseATPPlan.referensiCP || atpMappedTPs[0]?.referensiCP,
        tpList: atpMappedTPs,
        coverageStatus: atpMappedTPs[0]?.topicStatusVerifikasi || 'kurasi_internal',
        isEmptyState: false,
        hasVerifiedOfficialCP: Boolean(refFromCP?.terverifikasiResmi),
        isSyntheticSummary: false,
        sumberDokumen: context.phaseATPPlan.referensiCP?.namaDokumenSumber,
      };
    }
  }

  // 2. Cari bank topik terkurasi khusus Mapel × Jenjang × Fase × Semester (TANPA cloning Sem 1 → Sem 2)
  const bankResult = lookupCuratedTopicBank(mataPelajaran, jenjangFase, kelas, normSemester);
  const cpCandidates = getAvailableCPReferenceEntries(mataPelajaran, jenjangFase);
  const savedCPPrimary = context?.savedCPEntries?.[0];
  const baseRefCP = resolveCPReferenceMetadata(
    mataPelajaran,
    jenjangFase,
    cpCandidates[0]?.elemenCP || bankResult.topics[0]?.elemen || '',
    jenjangCategory
  );

  if (!bankResult.isAvailable || bankResult.topics.length === 0) {
    const emptyMessage =
      bankResult.emptyStateMessage ||
      'Bank topik terkurasi untuk mata pelajaran dan fase ini belum tersedia.';
    return {
      capaianPembelajaran: savedCPPrimary?.teksCP
        ? savedCPPrimary.teksCP
        : emptyMessage,
      referensiCatatan: savedCPPrimary
        ? `CP tersimpan ditemukan (${savedCPPrimary.namaDokumenSumber}); silakan turunkan topik dan TP dari panel Analisis CP.`
        : baseRefCP.catatan,
      referensiCP: baseRefCP,
      tpList: [],
      coverageStatus: bankResult.coverageStatus,
      isEmptyState: true,
      emptyStateMessage: emptyMessage,
      emptyStateActions: bankResult.emptyStateActions || [
        'tempel_cp',
        'pilih_referensi_cp',
        'susun_manual',
        'usulan_ai',
      ],
      hasVerifiedOfficialCP: Boolean(savedCPPrimary?.terverifikasiResmi),
      isSyntheticSummary: false,
      sumberDokumen: bankResult.sumberDokumen,
      progressionTopics: [],
    };
  }

  // Ambil daftar unik per semester (maksimal 4 topik per rancangan default semester tanpa menduplikasi)
  const uniqueTopics: CurriculumTopicEntry[] = [];
  const seenTopicKey = new Set<string>();
  for (const item of bankResult.topics) {
    const k = item.topik.toLowerCase().trim();
    if (!seenTopicKey.has(k)) {
      seenTopicKey.add(k);
      uniqueTopics.push(item);
    }
    if (uniqueTopics.length >= 4) break;
  }

  const defaultJpCfg = resolveDefaultSubjectJPConfig({
    jenjang: jenjangCategory,
    kelasUtama: cleanKelas,
    mataPelajaranUtama: mataPelajaran,
  });
  const jpPerWeek = Math.max(2, defaultJpCfg.jpPerMinggu);
  const totalCount = Math.max(1, uniqueTopics.length);

  const defaultWeekWindows: Array<[number, number]> =
    totalCount <= 3
      ? [
          [2, 8],
          [9, 15],
          [16, 22],
        ]
      : [
          [2, 7],
          [8, 13],
          [14, 18],
          [19, 23],
        ];

  const rawTPs: CustomTPItem[] = uniqueTopics.map((item, idx) => {
    const nomorTP = isSem2 ? idx + 5 : idx + 1;
    const [mingguMulai, mingguSelesai] = defaultWeekWindows[idx] || [idx * 5 + 2, (idx + 1) * 5 + 1];
    const weekSpanMultiplier = idx === 1 || idx === 2 ? 4 : 3;
    const alokasiJP = jpPerWeek * weekSpanMultiplier;

    return buildCustomTPFromTopicEntry(item, {
      mataPelajaran,
      jenjangFase,
      jenjangCategory,
      cleanKelas,
      semester: normSemester,
      nomorTP,
      mingguMulai,
      mingguSelesai,
      alokasiJP,
      schoolId: context?.schoolId,
      tahunAjaran: context?.tahunAjaran,
      savedCPEntries: context?.savedCPEntries,
    });
  });

  // Hubungkan prasyaratTpIds antartopik yang memang satu semester/daftar saat tersedia
  const tpIdBySourceTopicId = new Map<string, string>(
    rawTPs.filter((t) => t.sourceTopicId).map((t) => [t.sourceTopicId!, t.id])
  );
  const tpList: CustomTPItem[] = rawTPs.map((tp, idx) => {
    const srcTopic = uniqueTopics[idx];
    const resolvedPrereqIds = (srcTopic?.prasyaratTopicIds || [])
      .map((tid) => tpIdBySourceTopicId.get(tid))
      .filter((id): id is string => Boolean(id && id !== tp.id));
    return resolvedPrereqIds.length > 0 ? { ...tp, prasyaratTpIds: resolvedPrereqIds } : tp;
  });

  const faseShort = jenjangFase.split('(')[0].trim();
  const elemenUnik = Array.from(new Set(tpList.map((t) => t.elemen)));
  const firstRef = tpList[0]?.referensiCP || baseRefCP;
  const hasRealCP = Boolean(savedCPPrimary?.teksCP);

  const capaianPembelajaran = hasRealCP
    ? savedCPPrimary!.teksCP
    : `Rujukan kerja (${faseShort}, ${mataPelajaran}, ${normSemester}) mencakup elemen ${elemenUnik.join(
        ', '
      )} berdasarkan ${bankResult.sumberDokumen}. Catatan jujur: naskah CP lengkap SK pemerintah tidak di-hardcode di sini; harap masukkan atau verifikasi teks CP resmi pada panel Kelola Sumber CP.`;

  return {
    capaianPembelajaran,
    referensiCatatan:
      firstRef.catatan ||
      'Pembagian topik semester bersifat progresif dan dapat disesuaikan guru terhadap kalender serta ATP fase satuan pendidikan.',
    referensiCP: firstRef,
    tpList,
    coverageStatus: bankResult.coverageStatus,
    isEmptyState: false,
    hasVerifiedOfficialCP: Boolean(savedCPPrimary?.terverifikasiResmi),
    isSyntheticSummary: !hasRealCP,
    sumberDokumen: bankResult.sumberDokumen,
    progressionTopics: uniqueTopics,
  };
}
