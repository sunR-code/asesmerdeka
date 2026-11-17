import type { JenjangFase } from '../types/assessment';
import {
  resolveCPReferenceMetadata,
  isAgamaBudiPekertiSubject,
  isKepercayaanSubject,
} from './kurikulumMerdekaCP';
import {
  parseExactFaseCode,
  resolveNormalizedJenjang,
  type CurriculumTopicEntry,
  type ExactFaseCode,
  type SubjectFaseCoverageEntry,
  type TopicBankQueryResult,
  type TopicJenjangCategory,
  type TopicSourceVerificationStatus,
} from './kurikulumTopicBankTypes';
import { CORE_SUBJECT_TOPICS } from './topicBankCoreSubjects';
import { SOCIAL_ARTS_RELIGION_TOPICS } from './topicBankSocialArtsReligion';
import { EXTENSION_SUBJECT_TOPICS } from './topicBankCoverageExtensions';

export * from './kurikulumTopicBankTypes';

export const ALL_CURATED_TOPIC_ENTRIES: CurriculumTopicEntry[] = [
  ...CORE_SUBJECT_TOPICS,
  ...SOCIAL_ARTS_RELIGION_TOPICS,
  ...EXTENSION_SUBJECT_TOPICS,
];

type CanonicalBankKey =
  | 'matematika'
  | 'matematika_kejuruan'
  | 'bahasa_indonesia'
  | 'bahasa_inggris'
  | 'bahasa_inggris_profesi'
  | 'ipas'
  | 'ipa'
  | 'projek_ipas_smk'
  | 'fisika'
  | 'kimia'
  | 'biologi'
  | 'ips'
  | 'ekonomi'
  | 'geografi'
  | 'sosiologi'
  | 'sejarah'
  | 'informatika'
  | 'informatika_kejuruan'
  | 'pkk'
  | 'pendidikan_pancasila'
  | 'pjok'
  | 'pai'
  | 'fikih'
  | 'quran_hadis'
  | 'akidah_akhlak'
  | 'ski'
  | 'bahasa_arab'
  | 'bahasa_arab_kejuruan'
  | 'seni_musik'
  | 'seni_budaya_prakarya';

function canonicalKeyOfStoredTopic(entry: CurriculumTopicEntry): CanonicalBankKey {
  const lower = entry.mataPelajaran.toLowerCase();
  if (lower.includes('matematika kejuruan')) return 'matematika_kejuruan';
  if (lower.includes('matematika')) return 'matematika';
  if (lower.includes('indonesia')) return 'bahasa_indonesia';
  if (lower.includes('inggris profesi')) return 'bahasa_inggris_profesi';
  if (lower.includes('inggris')) return 'bahasa_inggris';
  if (lower.includes('projek ipas')) return 'projek_ipas_smk';
  if (lower.includes('ipas')) return 'ipas';
  if (lower.includes('fisika')) return 'fisika';
  if (lower.includes('kimia')) return 'kimia';
  if (lower.includes('biologi')) return 'biologi';
  if (lower === 'ipa (ilmu pengetahuan alam)' || /\bipa\b/.test(lower)) return 'ipa';
  if (lower.includes('ekonomi')) return 'ekonomi';
  if (lower.includes('geografi')) return 'geografi';
  if (lower.includes('sosiologi')) return 'sosiologi';
  if (lower.includes('sejarah kebudayaan islam') || lower.includes('ski')) return 'ski';
  if (lower.includes('sejarah')) return 'sejarah';
  if (lower.includes('ips')) return 'ips';
  if (lower.includes('dasar kejuruan')) return 'informatika_kejuruan';
  if (lower.includes('informatika')) return 'informatika';
  if (lower.includes('pkk') || lower.includes('kewirausahaan')) return 'pkk';
  if (lower.includes('pancasila') || lower.includes('ppkn')) return 'pendidikan_pancasila';
  if (lower.includes('pjok')) return 'pjok';
  if (lower.includes('fikih')) return 'fikih';
  if (lower.includes('qur') || lower.includes('hadis')) return 'quran_hadis';
  if (lower.includes('akidah') || lower.includes('akhlak')) return 'akidah_akhlak';
  if (lower.includes('arab kejuruan')) return 'bahasa_arab_kejuruan';
  if (lower.includes('arab')) return 'bahasa_arab';
  if (lower.includes('agama islam')) return 'pai';
  if (lower.includes('seni musik')) return 'seni_musik';
  return 'seni_budaya_prakarya';
}

interface ResolvedQueryScope {
  canonicalKey: CanonicalBankKey | null;
  targetJenjang: TopicJenjangCategory;
  noteIfCrossSharedGeneral?: string;
  unavailableReason?: string;
  preferredEmptyStatus: TopicSourceVerificationStatus;
}

function isVocationalConcentrationOrUncuratedSMK(lowerMapel: string): boolean {
  const vocationalTokens = [
    'konsentrasi keahlian',
    'teknik komputer',
    'tkj',
    'tjkt',
    'rekayasa perangkat lunak',
    'rpl',
    'akuntansi',
    'perbankan',
    'tata boga',
    'kuliner',
    'perhotelan',
    'tata busana',
    'desain komunikasi visual',
    'dkv',
    'teknik kendaraan ringan',
    'teknik sepeda motor',
    'farmasi',
    'keperawatan',
    'agribisnis',
    'teknik mesin',
    'teknik instalasi tenaga listrik',
    'produksi audio',
    'karawitan',
  ];
  return vocationalTokens.some((tok) => lowerMapel.includes(tok));
}

function resolveCanonicalQueryScope(
  mataPelajaran: string,
  jenjangFase: JenjangFase | string,
  kelas?: string
): ResolvedQueryScope {
  const lower = (mataPelajaran || '').toLowerCase().trim();
  const jenjang = resolveNormalizedJenjang(jenjangFase, mataPelajaran, kelas);

  if (!lower) {
    return {
      canonicalKey: null,
      targetJenjang: jenjang,
      preferredEmptyStatus: 'belum_tersedia',
      unavailableReason: 'Mata pelajaran belum dipilih.',
    };
  }

  // 1. Pendidikan Kepercayaan — BKPDM No. 021 Tahun 2026: jangan pernah memakai bank PAI/Seni!
  if (isKepercayaanSubject(mataPelajaran)) {
    return {
      canonicalKey: null,
      targetJenjang: jenjang,
      preferredEmptyStatus: 'belum_tersedia',
      unavailableReason:
        'Bank topik terkurasi untuk Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti (Keputusan Kepala BKPDM No. 021 Tahun 2026) belum tersedia. Silakan tempel/pilih CP resmi dan susun topik secara manual.',
    };
  }

  // 2. Pendidikan Agama non-Islam — BKPDM No. 020 Tahun 2026: jangan jatuh ke bank PAI Islam!
  if (
    isAgamaBudiPekertiSubject(mataPelajaran) &&
    !lower.includes('islam') &&
    !/\bpai\b/.test(lower)
  ) {
    return {
      canonicalKey: null,
      targetJenjang: jenjang,
      preferredEmptyStatus: 'belum_tersedia',
      unavailableReason:
        `Bank topik terkurasi untuk ${mataPelajaran} (Keputusan Kepala BKPDM No. 020 Tahun 2026) belum tersedia secara lokal. Silakan masukkan teks CP resmi atau susun topik Anda sendiri.`,
    };
  }

  // 3. SMK Konsentrasi Keahlian atau Seni Musik SMK: jangan salin bank umum SMA begitu saja!
  if (
    isVocationalConcentrationOrUncuratedSMK(lower) ||
    (jenjang === 'SMK' && lower.includes('seni musik'))
  ) {
    return {
      canonicalKey: null,
      targetJenjang: 'SMK',
      preferredEmptyStatus: 'input_guru_dibutuhkan',
      unavailableReason: lower.includes('seni musik')
        ? 'Bank topik umum Seni Musik tidak disalin otomatis ke konsentrasi keahlian SMK. Silakan masukkan CP program keahlian/konsentrasi SMK yang berlaku lalu turunkan topiknya.'
        : `Bank topik untuk konsentrasi keahlian "${mataPelajaran}" di SMK belum tersedia secara terkurasi. Gunakan CP program/konsentrasi keahlian resmi sekolah Anda untuk menyusun topik dan TP.`,
    };
  }

  // 4. Rumpun Madrasah Kemenag
  if (lower.includes('fikih')) return { canonicalKey: 'fikih', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes("qur'an") || lower.includes('quran') || lower.includes('hadis')) {
    return { canonicalKey: 'quran_hadis', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('akidah') || lower.includes('akhlak')) {
    return { canonicalKey: 'akidah_akhlak', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('ski') || lower.includes('kebudayaan islam')) {
    return { canonicalKey: 'ski', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('arab kejuruan') || (jenjang === 'SMK' && lower.includes('arab'))) {
    return { canonicalKey: 'bahasa_arab_kejuruan', targetJenjang: 'SMK', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('arab')) {
    return { canonicalKey: 'bahasa_arab', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('agama islam') || /\bpai\b/.test(lower)) {
    return {
      canonicalKey: 'pai',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      noteIfCrossSharedGeneral:
        jenjang === 'SMK'
          ? 'Menggunakan rujukan mapel umum nasional PAI & Budi Pekerti Fase E/F (BKPDM No. 020 Tahun 2026) yang berlaku bagi SMA/SMK.'
          : undefined,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }

  // 5. Matematika & Bahasa Inggris (bedakan umum vs SMK kejuruan/profesi!)
  if (lower.includes('matematika')) {
    if (jenjang === 'SMK' || lower.includes('kejuruan') || lower.includes('teknik')) {
      return { canonicalKey: 'matematika_kejuruan', targetJenjang: 'SMK', preferredEmptyStatus: 'belum_tersedia' };
    }
    return { canonicalKey: 'matematika', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('inggris')) {
    if (jenjang === 'SMK' || lower.includes('profesi')) {
      return { canonicalKey: 'bahasa_inggris_profesi', targetJenjang: 'SMK', preferredEmptyStatus: 'belum_tersedia' };
    }
    return { canonicalKey: 'bahasa_inggris', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  }

  // 6. Bahasa Indonesia
  if (lower.includes('bahasa indonesia') || lower === 'indonesia') {
    return {
      canonicalKey: 'bahasa_indonesia',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      noteIfCrossSharedGeneral:
        jenjang === 'SMK'
          ? 'Menggunakan rujukan mapel umum nasional Bahasa Indonesia Fase E/F (SK Kepala BSKAP No. 046/H/KR/2025).'
          : undefined,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }

  // 7. Sains & IPAS
  if (lower.includes('projek ipas')) {
    return { canonicalKey: 'projek_ipas_smk', targetJenjang: 'SMK', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('ipas')) return { canonicalKey: 'ipas', targetJenjang: 'SD/MI', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('fisika')) return { canonicalKey: 'fisika', targetJenjang: 'SMA/MA', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('kimia')) return { canonicalKey: 'kimia', targetJenjang: 'SMA/MA', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('biologi')) return { canonicalKey: 'biologi', targetJenjang: 'SMA/MA', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('ilmu pengetahuan alam') || /\bipa\b/.test(lower)) {
    return { canonicalKey: 'ipa', targetJenjang: 'SMP/MTs', preferredEmptyStatus: 'belum_tersedia' };
  }

  // 8. IPS & Humaniora
  if (lower.includes('ekonomi')) return { canonicalKey: 'ekonomi', targetJenjang: 'SMA/MA', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('geografi')) return { canonicalKey: 'geografi', targetJenjang: 'SMA/MA', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('sosiologi')) return { canonicalKey: 'sosiologi', targetJenjang: 'SMA/MA', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('sejarah')) {
    return {
      canonicalKey: 'sejarah',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      noteIfCrossSharedGeneral:
        jenjang === 'SMK'
          ? 'Menggunakan rujukan mapel umum nasional Sejarah Fase E/F (SK Kepala BSKAP No. 046/H/KR/2025).'
          : undefined,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }
  if (lower.includes('ilmu pengetahuan sosial') || /\bips\b/.test(lower)) {
    return { canonicalKey: 'ips', targetJenjang: 'SMP/MTs', preferredEmptyStatus: 'belum_tersedia' };
  }

  // 9. Informatika & PKK
  if (lower.includes('pkk') || lower.includes('kewirausahaan')) {
    return { canonicalKey: 'pkk', targetJenjang: 'SMK', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('dasar kejuruan')) {
    return { canonicalKey: 'informatika_kejuruan', targetJenjang: 'SMK', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('informatika')) {
    return {
      canonicalKey: 'informatika',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }

  // 10. Pendidikan Pancasila & PJOK
  if (lower.includes('pancasila') || lower.includes('ppkn')) {
    return {
      canonicalKey: 'pendidikan_pancasila',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      noteIfCrossSharedGeneral:
        jenjang === 'SMK'
          ? 'Menggunakan rujukan mapel umum nasional Pendidikan Pancasila Fase E/F (SK Kepala BSKAP No. 046/H/KR/2025).'
          : undefined,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }
  if (lower.includes('pjok') || lower.includes('pendidikan jasmani') || lower.includes('jasmani')) {
    return {
      canonicalKey: 'pjok',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }

  // 11. Seni Budaya / Prakarya vs Seni Musik (TIDAK ADA catch-all!)
  // Periksa Seni Budaya / Rupa / Prakarya lebih dulu agar label gabungan seperti
  // "Seni Rupa / Seni Musik / Prakarya" mengarah ke rumpun Seni Budaya & Prakarya.
  if (
    lower.includes('seni budaya') ||
    lower.includes('seni dan budaya') ||
    lower.includes('prakarya') ||
    lower.includes('seni rupa')
  ) {
    return { canonicalKey: 'seni_budaya_prakarya', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('seni musik') || lower === 'musik') {
    return { canonicalKey: 'seni_musik', targetJenjang: jenjang, preferredEmptyStatus: 'belum_tersedia' };
  }

  // 12. Mata pelajaran lain di luar bank terkurasi -> jujur belum_tersedia!
  return {
    canonicalKey: null,
    targetJenjang: jenjang,
    preferredEmptyStatus: 'belum_tersedia',
    unavailableReason: `Bank topik terkurasi untuk mata pelajaran "${mataPelajaran}" pada ${jenjang} belum tersedia.`,
  };
}

/**
 * Mengambil entri bank topik terkurasi dengan pencocokan eksak Mapel × Jenjang × Fase (tanpa fallback palsu).
 */
export function lookupCuratedTopicBank(
  mataPelajaran: string,
  jenjangFase: JenjangFase | string,
  kelas: string,
  semester: string = '1 (Ganjil)'
): TopicBankQueryResult {
  const faseCode = parseExactFaseCode(jenjangFase, kelas);
  const resolvedJenjang = resolveNormalizedJenjang(jenjangFase, mataPelajaran, kelas);
  const isSem2 = (semester || '').startsWith('2') || (semester || '').toLowerCase().includes('genap');
  const normSemester: '1 (Ganjil)' | '2 (Genap)' = isSem2 ? '2 (Genap)' : '1 (Ganjil)';
  const scope = resolveCanonicalQueryScope(mataPelajaran, jenjangFase, kelas);
  const cpRefFallback = resolveCPReferenceMetadata(mataPelajaran, jenjangFase as JenjangFase, '', resolvedJenjang);

  if (!scope.canonicalKey) {
    return {
      mataPelajaran,
      jenjang: resolvedJenjang,
      fase: (jenjangFase || `${faseCode}`) as JenjangFase,
      faseCode,
      kelas: kelas || '',
      semester: normSemester,
      coverageStatus: scope.preferredEmptyStatus,
      sumberDokumen: cpRefFallback.namaDokumenSumber || cpRefFallback.sumber,
      urlReferensi: cpRefFallback.urlReferensi || 'https://kurikulum.kemendikdasmen.go.id/',
      isAvailable: false,
      emptyStateMessage:
        scope.unavailableReason ||
        'Bank topik terkurasi untuk mata pelajaran dan fase ini belum tersedia.',
      emptyStateActions: ['tempel_cp', 'pilih_referensi_cp', 'susun_manual', 'usulan_ai'],
      topics: [],
      allPhaseTopics: [],
    };
  }

  const allPhaseTopics = ALL_CURATED_TOPIC_ENTRIES.filter(
    (entry) =>
      canonicalKeyOfStoredTopic(entry) === scope.canonicalKey &&
      entry.jenjang === scope.targetJenjang &&
      entry.faseCode === faseCode
  );

  // Khusus Informatika SMK jika Fase E belum punya entri SMK-specific, gunakan Informatika umum Fase E (SK 046/2025)
  const effectivePhaseTopics =
    allPhaseTopics.length > 0
      ? allPhaseTopics
      : resolvedJenjang === 'SMK' && scope.canonicalKey === 'informatika_kejuruan' && faseCode === 'Fase E'
      ? ALL_CURATED_TOPIC_ENTRIES.filter(
          (entry) =>
            canonicalKeyOfStoredTopic(entry) === 'informatika' &&
            entry.jenjang === 'SMA/MA' &&
            entry.faseCode === 'Fase E'
        )
      : [];

  const semesterTopics = effectivePhaseTopics.filter(
    (entry) => entry.suggestedSemester === normSemester
  );

  if (effectivePhaseTopics.length === 0 || semesterTopics.length === 0) {
    return {
      mataPelajaran,
      jenjang: resolvedJenjang,
      fase: (jenjangFase || `${faseCode}`) as JenjangFase,
      faseCode,
      kelas: kelas || '',
      semester: normSemester,
      coverageStatus: scope.preferredEmptyStatus,
      sumberDokumen: cpRefFallback.namaDokumenSumber || cpRefFallback.sumber,
      urlReferensi: cpRefFallback.urlReferensi || 'https://kurikulum.kemendikdasmen.go.id/',
      isAvailable: false,
      emptyStateMessage:
        effectivePhaseTopics.length === 0
          ? `Bank topik terkurasi untuk ${mataPelajaran} pada ${faseCode} (${resolvedJenjang}) belum tersedia.`
          : `Rekomendasi topik terkurasi untuk ${mataPelajaran} ${faseCode} ${normSemester} belum tersedia.`,
      emptyStateActions: ['tempel_cp', 'pilih_referensi_cp', 'susun_manual', 'usulan_ai'],
      topics: [],
      allPhaseTopics: effectivePhaseTopics,
    };
  }

  const primary = semesterTopics[0];
  return {
    mataPelajaran,
    jenjang: resolvedJenjang,
    fase: (jenjangFase || primary.fase) as JenjangFase,
    faseCode,
    kelas: kelas || '',
    semester: normSemester,
    coverageStatus: primary.statusVerifikasiSumber,
    sumberDokumen: scope.noteIfCrossSharedGeneral
      ? `${primary.sumberDokumen} (${scope.noteIfCrossSharedGeneral})`
      : primary.sumberDokumen,
    urlReferensi: primary.urlReferensi,
    isAvailable: true,
    topics: semesterTopics,
    allPhaseTopics: effectivePhaseTopics,
  };
}

/**
 * Wrapper kompatibilitas mundur. Mengembalikan topik terkurasi untuk fase tersebut
 * (atau `[]` bila bank topik belum tersedia — TIDAK lagi mengembalikan topik Seni Budaya acak).
 */
export function getRichCurriculumTopics(
  mataPelajaran: string,
  jenjangFase: JenjangFase,
  kelas: string,
  semester?: string
): CurriculumTopicEntry[] {
  if (semester) {
    return lookupCuratedTopicBank(mataPelajaran, jenjangFase, kelas, semester).topics;
  }
  const sem1 = lookupCuratedTopicBank(mataPelajaran, jenjangFase, kelas, '1 (Ganjil)');
  const sem2 = lookupCuratedTopicBank(mataPelajaran, jenjangFase, kelas, '2 (Genap)');
  const merged = [...sem1.topics, ...sem2.topics];
  if (merged.length > 0) return merged;
  return sem1.allPhaseTopics;
}

export function getTopicById(topicId: string): CurriculumTopicEntry | undefined {
  return ALL_CURATED_TOPIC_ENTRIES.find((t) => t.topicId === topicId);
}

/**
 * Mengembalikan matriks cakupan seluruh kombinasi mata pelajaran × jenjang × fase
 * yang terdaftar dalam bank topik serta entri yang belum tersedia secara jujur.
 */
export function getTopicBankCoverageMatrix(): SubjectFaseCoverageEntry[] {
  const bucketMap = new Map<
    string,
    {
      mataPelajaran: string;
      jenjang: TopicJenjangCategory;
      faseCode: ExactFaseCode;
      status: TopicSourceVerificationStatus;
      s1: number;
      s2: number;
      sumber: string;
    }
  >();

  for (const entry of ALL_CURATED_TOPIC_ENTRIES) {
    const key = `${entry.mataPelajaran}::${entry.jenjang}::${entry.faseCode}`;
    const prev = bucketMap.get(key) || {
      mataPelajaran: entry.mataPelajaran,
      jenjang: entry.jenjang,
      faseCode: entry.faseCode,
      status: entry.statusVerifikasiSumber,
      s1: 0,
      s2: 0,
      sumber: entry.sumberDokumen,
    };
    if (entry.suggestedSemester === '1 (Ganjil)') prev.s1 += 1;
    else prev.s2 += 1;
    bucketMap.set(key, prev);
  }

  const curatedRows: SubjectFaseCoverageEntry[] = Array.from(bucketMap.entries()).map(([key, v]) => ({
    key,
    mataPelajaran: v.mataPelajaran,
    jenjang: v.jenjang,
    faseCode: v.faseCode,
    status: v.status,
    totalTopikSem1: v.s1,
    totalTopikSem2: v.s2,
    sumberUtama: v.sumber,
    catatan:
      v.status === 'berdasarkan_contoh_panduan'
        ? 'Disusun mengacu contoh & struktur elemen Panduan Mata Pelajaran resmi Kemendikdasmen.'
        : 'Kurasi internal AsesMerdeka merujuk struktur CP; tinjauan guru tetap dianjurkan.',
  }));

  const explicitlyUnavailableOrGuruRequired: SubjectFaseCoverageEntry[] = [
    {
      key: 'kepercayaan::all',
      mataPelajaran: 'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti',
      jenjang: 'SMP/MTs',
      faseCode: 'Fase D',
      status: 'belum_tersedia',
      totalTopikSem1: 0,
      totalTopikSem2: 0,
      sumberUtama: 'Keputusan Kepala BKPDM No. 021 Tahun 2026',
      catatan: 'Belum ada bank topik terkurasi; gunakan input CP resmi dari BKPDM No. 021/2026.',
    },
    {
      key: 'agama_non_islam::all',
      mataPelajaran: 'Pendidikan Agama (Kristen/Katolik/Hindu/Buddha/Khonghucu) & Budi Pekerti',
      jenjang: 'SMP/MTs',
      faseCode: 'Fase D',
      status: 'belum_tersedia',
      totalTopikSem1: 0,
      totalTopikSem2: 0,
      sumberUtama: 'Keputusan Kepala BKPDM No. 020 Tahun 2026',
      catatan: 'Belum ada bank topik terkurasi lokal untuk agama selain Islam; tidak pernah menimpa dengan materi PAI.',
    },
    {
      key: 'seni_musik_smk::SMK::Fase F',
      mataPelajaran: 'Seni Musik / Konsentrasi Keahlian Seni Pertunjukan (SMK)',
      jenjang: 'SMK',
      faseCode: 'Fase F',
      status: 'input_guru_dibutuhkan',
      totalTopikSem1: 0,
      totalTopikSem2: 0,
      sumberUtama: 'CP Konsentrasi Keahlian SMK / Input Satuan Pendidikan',
      catatan: 'Bank Seni Musik umum SMA/SMP tidak disalin ke SMK kejuruan tanpa CP konsentrasi terkait.',
    },
    {
      key: 'konsentrasi_kejuruan_smk::SMK::Fase F',
      mataPelajaran: 'Mata Pelajaran Konsentrasi Keahlian SMK (TKJ, Akuntansi, Kuliner, DKV, dll.)',
      jenjang: 'SMK',
      faseCode: 'Fase F',
      status: 'input_guru_dibutuhkan',
      totalTopikSem1: 0,
      totalTopikSem2: 0,
      sumberUtama: 'CP Program/Konsentrasi Keahlian Kemendikdasmen',
      catatan: 'Membutuhkan input CP konsentrasi keahlian oleh guru atau tim program keahlian sekolah.',
    },
  ];

  return [...curatedRows, ...explicitlyUnavailableOrGuruRequired];
}

export function getSubjectFaseCoverageStatus(
  mataPelajaran: string,
  jenjangFase: JenjangFase | string,
  kelas?: string
): TopicSourceVerificationStatus {
  const res = lookupCuratedTopicBank(mataPelajaran, jenjangFase, kelas || '', '1 (Ganjil)');
  return res.coverageStatus;
}
