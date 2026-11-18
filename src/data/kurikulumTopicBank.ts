import type { JenjangFase } from '../types/assessment';
import {
  resolveCPReferenceMetadata,
  resolveDefaultCPRegulationPreset,
  isAgamaBudiPekertiSubject,
  isKepercayaanSubject,
  isKemenagSubject,
} from './kurikulumMerdekaCP';
import {
  deriveDefaultDocumentSourceStatus,
  parseExactFaseCode,
  resolveNormalizedJenjang,
  resolveSafePedagogicalReviewStatus,
  type CurriculumContextKind,
  type CurriculumTopicEntry,
  type ExactFaseCode,
  type SubjectFaseCoverageEntry,
  type TopicBankQueryResult,
  type TopicDocumentSourceStatus,
  type TopicJenjangCategory,
  type TopicPedagogicalReviewStatus,
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
  konteksKurikulum: CurriculumContextKind;
  noteIfCrossSharedGeneral?: string;
  unavailableReason?: string;
  preferredEmptyStatus: TopicSourceVerificationStatus;
  preferredDocSourceStatus?: TopicDocumentSourceStatus;
}

function isExplicitVocationalMusicSubject(lowerMapel: string): boolean {
  if (lowerMapel.includes('(umum)')) return false;
  return (
    lowerMapel.includes('seni musik smk') ||
    lowerMapel.includes('seni musik (smk)') ||
    lowerMapel.includes('seni musik kejuruan') ||
    lowerMapel.includes('konsentrasi keahlian seni musik') ||
    lowerMapel.includes('pertunjukan musik') ||
    lowerMapel.includes('produksi musik') ||
    lowerMapel.includes('produksi & siaran') ||
    lowerMapel.includes('karawitan')
  );
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
    'pertunjukan musik',
    'produksi & siaran',
  ];
  return vocationalTokens.some((tok) => lowerMapel.includes(tok));
}

function resolveCanonicalQueryScope(
  mataPelajaran: string,
  jenjangFase: JenjangFase | string,
  kelas?: string,
  explicitJenjang?: TopicJenjangCategory
): ResolvedQueryScope {
  const lower = (mataPelajaran || '').toLowerCase().trim();
  const jenjang = explicitJenjang || resolveNormalizedJenjang(jenjangFase, mataPelajaran, kelas);

  if (!lower) {
    return {
      canonicalKey: null,
      targetJenjang: jenjang,
      konteksKurikulum: 'umum',
      preferredEmptyStatus: 'belum_tersedia',
      preferredDocSourceStatus: 'belum_terverifikasi',
      unavailableReason: 'Mata pelajaran belum dipilih.',
    };
  }

  // 1. Pendidikan Kepercayaan — BKPDM No. 021 Tahun 2026: terpisah mutlak dari Agama!
  if (isKepercayaanSubject(mataPelajaran)) {
    return {
      canonicalKey: null,
      targetJenjang: jenjang,
      konteksKurikulum: 'kepercayaan',
      preferredEmptyStatus: 'belum_tersedia',
      preferredDocSourceStatus: 'dokumen_resmi_teridentifikasi',
      unavailableReason:
        'Rujukan regulasi teridentifikasi pada Keputusan Kepala BKPDM No. 021 Tahun 2026 (teks CP lengkap belum diverifikasi secara lokal). Anda tetap dapat menempelkan/memilih CP dan menyusun topik secara mandiri.',
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
      konteksKurikulum: 'agama_budi_pekerti',
      preferredEmptyStatus: 'belum_tersedia',
      preferredDocSourceStatus: 'dokumen_resmi_teridentifikasi',
      unavailableReason:
        `Rujukan regulasi mengacu Keputusan Kepala BKPDM No. 020 Tahun 2026 atas SK BSKAP 046/H/KR/2025, namun naskah CP & topik khusus ${mataPelajaran} belum dikurasi secara lokal dan tidak pernah digantikan oleh materi agama lain.`,
    };
  }

  // 3. SMK Konsentrasi Keahlian atau Seni Musik Kejuruan SMK: jangan salin bank umum SMA!
  if (
    isVocationalConcentrationOrUncuratedSMK(lower) ||
    isExplicitVocationalMusicSubject(lower) ||
    (resolveNormalizedJenjang(jenjangFase, mataPelajaran, kelas) === 'SMK' && lower.includes('seni musik') && !lower.includes('(umum)'))
  ) {
    const isMusicVocation = lower.includes('musik') || lower.includes('karawitan') || lower.includes('audio');
    return {
      canonicalKey: null,
      targetJenjang: 'SMK',
      konteksKurikulum: 'konsentrasi_keahlian_smk',
      preferredEmptyStatus: 'input_guru_dibutuhkan',
      preferredDocSourceStatus: 'belum_terverifikasi',
      unavailableReason: isMusicVocation
        ? 'Mata pelajaran Kejuruan / Konsentrasi Keahlian Musik SMK tidak mewarisi bank topik Seni Musik umum secara otomatis. Gunakan CP Program/Konsentrasi Keahlian resmi sekolah Anda atau pilih "Seni Musik (Umum)" bila mengajar mapel umum Fase E.'
        : `Konsentrasi keahlian "${mataPelajaran}" pada SMK membutuhkan CP program/konsentrasi keahlian yang berlaku (tidak dikarang otomatis oleh sistem).`,
    };
  }

  // 4. Rumpun Madrasah Kemenag (tetap terpisah dari katalog reguler)
  if (lower.includes('fikih')) return { canonicalKey: 'fikih', targetJenjang: jenjang, konteksKurikulum: 'madrasah_kemenag', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes("qur'an") || lower.includes('quran') || lower.includes('hadis')) {
    return { canonicalKey: 'quran_hadis', targetJenjang: jenjang, konteksKurikulum: 'madrasah_kemenag', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('akidah') || lower.includes('akhlak')) {
    return { canonicalKey: 'akidah_akhlak', targetJenjang: jenjang, konteksKurikulum: 'madrasah_kemenag', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('ski') || lower.includes('kebudayaan islam')) {
    return { canonicalKey: 'ski', targetJenjang: jenjang, konteksKurikulum: 'madrasah_kemenag', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('arab kejuruan') || (jenjang === 'SMK' && lower.includes('arab'))) {
    return { canonicalKey: 'bahasa_arab_kejuruan', targetJenjang: 'SMK', konteksKurikulum: 'kejuruan_smk', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('arab')) {
    return { canonicalKey: 'bahasa_arab', targetJenjang: jenjang, konteksKurikulum: 'madrasah_kemenag', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('agama islam') || /\bpai\b/.test(lower)) {
    return {
      canonicalKey: 'pai',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      konteksKurikulum: 'agama_budi_pekerti',
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
      return { canonicalKey: 'matematika_kejuruan', targetJenjang: 'SMK', konteksKurikulum: 'kejuruan_smk', preferredEmptyStatus: 'belum_tersedia' };
    }
    return { canonicalKey: 'matematika', targetJenjang: jenjang, konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('inggris')) {
    if (jenjang === 'SMK' || lower.includes('profesi')) {
      return { canonicalKey: 'bahasa_inggris_profesi', targetJenjang: 'SMK', konteksKurikulum: 'kejuruan_smk', preferredEmptyStatus: 'belum_tersedia' };
    }
    return { canonicalKey: 'bahasa_inggris', targetJenjang: jenjang, konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  }

  // 6. Bahasa Indonesia
  if (lower.includes('bahasa indonesia') || lower === 'indonesia') {
    return {
      canonicalKey: 'bahasa_indonesia',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      konteksKurikulum: 'umum',
      noteIfCrossSharedGeneral:
        jenjang === 'SMK'
          ? 'Menggunakan rujukan mapel umum nasional Bahasa Indonesia Fase E/F (SK Kepala BSKAP No. 046/H/KR/2025).'
          : undefined,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }

  // 7. Sains & IPAS
  if (lower.includes('projek ipas')) {
    return { canonicalKey: 'projek_ipas_smk', targetJenjang: 'SMK', konteksKurikulum: 'kejuruan_smk', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('ipas')) return { canonicalKey: 'ipas', targetJenjang: 'SD/MI', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('fisika')) return { canonicalKey: 'fisika', targetJenjang: 'SMA/MA', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('kimia')) return { canonicalKey: 'kimia', targetJenjang: 'SMA/MA', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('biologi')) return { canonicalKey: 'biologi', targetJenjang: 'SMA/MA', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('ilmu pengetahuan alam') || /\bipa\b/.test(lower)) {
    return { canonicalKey: 'ipa', targetJenjang: 'SMP/MTs', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  }

  // 8. IPS & Humaniora
  if (lower.includes('ekonomi')) return { canonicalKey: 'ekonomi', targetJenjang: 'SMA/MA', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('geografi')) return { canonicalKey: 'geografi', targetJenjang: 'SMA/MA', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('sosiologi')) return { canonicalKey: 'sosiologi', targetJenjang: 'SMA/MA', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  if (lower.includes('sejarah')) {
    return {
      canonicalKey: 'sejarah',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      konteksKurikulum: 'umum',
      noteIfCrossSharedGeneral:
        jenjang === 'SMK'
          ? 'Menggunakan rujukan mapel umum nasional Sejarah Fase E/F (SK Kepala BSKAP No. 046/H/KR/2025).'
          : undefined,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }
  if (lower.includes('ilmu pengetahuan sosial') || /\bips\b/.test(lower)) {
    return { canonicalKey: 'ips', targetJenjang: 'SMP/MTs', konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  }

  // 9. Informatika & PKK
  if (lower.includes('pkk') || lower.includes('kewirausahaan')) {
    return { canonicalKey: 'pkk', targetJenjang: 'SMK', konteksKurikulum: 'kejuruan_smk', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('dasar kejuruan')) {
    return { canonicalKey: 'informatika_kejuruan', targetJenjang: 'SMK', konteksKurikulum: 'kejuruan_smk', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('informatika')) {
    return {
      canonicalKey: 'informatika',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      konteksKurikulum: jenjang === 'SMK' ? 'kejuruan_smk' : 'umum',
      preferredEmptyStatus: 'belum_tersedia',
    };
  }

  // 10. Pendidikan Pancasila & PJOK
  if (lower.includes('pancasila') || lower.includes('ppkn')) {
    return {
      canonicalKey: 'pendidikan_pancasila',
      targetJenjang: jenjang === 'SMK' ? 'SMA/MA' : jenjang,
      konteksKurikulum: 'umum',
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
      konteksKurikulum: 'umum',
      preferredEmptyStatus: 'belum_tersedia',
    };
  }

  // 11. Seni Budaya / Prakarya vs Seni Musik Umum vs Seni Rupa/Tari/Teater Mandiri (TIDAK ADA catch-all!)
  if (
    lower.includes('seni budaya') ||
    lower.includes('seni dan budaya') ||
    lower.includes('prakarya')
  ) {
    return { canonicalKey: 'seni_budaya_prakarya', targetJenjang: jenjang, konteksKurikulum: 'umum', preferredEmptyStatus: 'belum_tersedia' };
  }
  if (lower.includes('seni musik') || lower === 'musik') {
    const isGeneralSMK = jenjang === 'SMK';
    return {
      canonicalKey: 'seni_musik',
      targetJenjang: isGeneralSMK ? 'SMA/MA' : jenjang,
      konteksKurikulum: 'umum',
      noteIfCrossSharedGeneral: isGeneralSMK
        ? 'Menggunakan rujukan Mata Pelajaran Umum Seni Musik Fase E–F (Panduan Seni Musik Rev. 3, 13 Sep 2025 untuk SMA/MA/SMK/MAK); BUKAN Konsentrasi Keahlian Musik SMK.'
        : undefined,
      preferredEmptyStatus: 'belum_tersedia',
    };
  }

  // Seni Rupa, Seni Tari, Seni Teater mandiri tetap jujur belum_tersedia (tidak dicampur ke Seni Budaya/Prakarya)
  // 12. Mata pelajaran lain di luar bank terkurasi -> jujur belum_tersedia!
  return {
    canonicalKey: null,
    targetJenjang: jenjang,
    konteksKurikulum: jenjang === 'SMK' ? 'kejuruan_smk' : 'umum',
    preferredEmptyStatus: 'belum_tersedia',
    preferredDocSourceStatus: 'belum_terverifikasi',
    unavailableReason: `Kurasi khusus mata pelajaran ${mataPelajaran} pada ${jenjang} belum tersedia dalam bank topik terkurasi (tersedia penyusunan mandiri berbasis CP).`,
  };
}

/**
 * Mengambil entri bank topik terkurasi dengan pencocokan eksak Mapel × Jenjang × Fase (tanpa fallback palsu).
 */
export function lookupCuratedTopicBank(
  mataPelajaran: string,
  jenjangFase: JenjangFase | string,
  kelas: string,
  semester: string = '1 (Ganjil)',
  options?: { jenjang?: TopicJenjangCategory }
): TopicBankQueryResult {
  const faseCode = parseExactFaseCode(jenjangFase, kelas);
  const resolvedJenjang = options?.jenjang || resolveNormalizedJenjang(jenjangFase, mataPelajaran, kelas);
  const isSem2 = (semester || '').startsWith('2') || (semester || '').toLowerCase().includes('genap');
  const normSemester: '1 (Ganjil)' | '2 (Genap)' = isSem2 ? '2 (Genap)' : '1 (Ganjil)';
  const scope = resolveCanonicalQueryScope(mataPelajaran, jenjangFase, kelas, options?.jenjang);
  const cpRefFallback = resolveCPReferenceMetadata(mataPelajaran, jenjangFase as JenjangFase, '', resolvedJenjang);
  const section13Prefix = `Bank topik terkurasi untuk ${mataPelajaran || 'mata pelajaran ini'} ${faseCode} (${resolvedJenjang}) belum tersedia. Anda tetap dapat menyusun topik dan tujuan pembelajaran sendiri berdasarkan CP.`;

  if (!scope.canonicalKey) {
    return {
      mataPelajaran,
      jenjang: resolvedJenjang,
      fase: (jenjangFase || `${faseCode}`) as JenjangFase,
      faseCode,
      kelas: kelas || '',
      semester: normSemester,
      coverageStatus: scope.preferredEmptyStatus,
      statusSumberDokumen: scope.preferredDocSourceStatus || 'belum_terverifikasi',
      statusReviewPedagogis: 'belum_ditinjau',
      konteksKurikulum: scope.konteksKurikulum,
      sumberDokumen: cpRefFallback.namaDokumenSumber || cpRefFallback.sumber,
      urlReferensi: cpRefFallback.urlReferensi || 'https://kurikulum.kemendikdasmen.go.id/',
      isAvailable: false,
      emptyStateMessage: scope.unavailableReason
        ? `${section13Prefix} ${scope.unavailableReason}`
        : section13Prefix,
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
      statusSumberDokumen: scope.preferredDocSourceStatus || 'dokumen_resmi_teridentifikasi',
      statusReviewPedagogis: 'belum_ditinjau',
      konteksKurikulum: scope.konteksKurikulum,
      sumberDokumen: cpRefFallback.namaDokumenSumber || cpRefFallback.sumber,
      urlReferensi: cpRefFallback.urlReferensi || 'https://kurikulum.kemendikdasmen.go.id/',
      isAvailable: false,
      emptyStateMessage:
        effectivePhaseTopics.length === 0
          ? section13Prefix
          : `Rekomendasi topik terkurasi untuk ${mataPelajaran} ${faseCode} (${resolvedJenjang}) ${normSemester} belum tersedia. Anda tetap dapat menyusun topik dan tujuan pembelajaran sendiri berdasarkan CP.`,
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
    statusSumberDokumen:
      primary.statusSumberDokumen ||
      deriveDefaultDocumentSourceStatus(primary.statusVerifikasiSumber, primary.jenisKonten),
    statusReviewPedagogis: resolveSafePedagogicalReviewStatus(
      primary.statusReviewPedagogis,
      primary.expertReviewerName,
      primary.expertReviewedAt
    ),
    konteksKurikulum: scope.konteksKurikulum,
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
      statusSumberDokumen: TopicDocumentSourceStatus;
      statusReviewPedagogis: TopicPedagogicalReviewStatus;
      s1: number;
      s2: number;
      sumber: string;
      elemenSet: Set<string>;
    }
  >();

  for (const entry of ALL_CURATED_TOPIC_ENTRIES) {
    const key = `${entry.mataPelajaran}::${entry.jenjang}::${entry.faseCode}`;
    const prev = bucketMap.get(key) || {
      mataPelajaran: entry.mataPelajaran,
      jenjang: entry.jenjang,
      faseCode: entry.faseCode,
      status: entry.statusVerifikasiSumber,
      statusSumberDokumen:
        entry.statusSumberDokumen ||
        deriveDefaultDocumentSourceStatus(entry.statusVerifikasiSumber, entry.jenisKonten),
      statusReviewPedagogis: resolveSafePedagogicalReviewStatus(
        entry.statusReviewPedagogis,
        entry.expertReviewerName,
        entry.expertReviewedAt
      ),
      s1: 0,
      s2: 0,
      sumber: entry.sumberDokumen,
      elemenSet: new Set<string>(),
    };
    if (entry.suggestedSemester === '1 (Ganjil)') prev.s1 += 1;
    else prev.s2 += 1;
    if (entry.elemenCP) prev.elemenSet.add(entry.elemenCP);
    bucketMap.set(key, prev);
  }

  const curatedRows: SubjectFaseCoverageEntry[] = Array.from(bucketMap.entries()).map(([key, v]) => {
    const preset = resolveDefaultCPRegulationPreset(v.mataPelajaran);
    const isBalanced = v.s1 >= 3 && v.s2 >= 3;
    const isKemenag = isKemenagSubject(v.mataPelajaran);
    const isMusic = v.mataPelajaran.toLowerCase().includes('seni musik');
    const elemenCPTercakup = Array.from(v.elemenSet);
    return {
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
          ? 'Disusun mengacu contoh & struktur elemen Panduan Mata Pelajaran resmi Kemendikdasmen; belum diverifikasi ahli mapel internal.'
          : 'Kurasi internal AsesMerdeka merujuk judul regulasi CP; perbandingan kata-per-kata terhadap naskah CP & panduan mapel tetap dianjurkan.',
      rujukanCP: preset.nomorDokumen,
      panduanMapel: isMusic
        ? 'Final Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 Sep 2025 — BSKAP)'
        : isKemenag
        ? 'KMA Kurikulum Madrasah (teks lengkap lokal belum diverifikasi)'
        : 'Panduan Mata Pelajaran & PPA Revisi 2025 (perlu verifikasi mapel per fase)',
      elemenCPTercakup,
      tingkatKelengkapan: isBalanced
        ? `Terstruktur (${v.s1} Sem 1 + ${v.s2} Sem 2; ${elemenCPTercakup.length} elemen)`
        : `Sebagian (${v.s1} Sem 1 + ${v.s2} Sem 2; perlu tinjauan kelengkapan)`,
      statusSumberDokumen: v.statusSumberDokumen,
      statusReviewPedagogis: v.statusReviewPedagogis,
      catatanKesenjanganKonten: isMusic
        ? 'Telah diverifikasi ke PDF Panduan Seni Musik 2025 (hlm. 11–162); menunggu tinjauan guru/ahli mapel.'
        : isKemenag
        ? 'Naskah KMA Kemenag belum diinspeksi penuh secara lokal; guru perlu menyelaraskan dengan KMA aktif.'
        : v.s1 < 3 || v.s2 < 3
        ? 'Jumlah topik masih terbatas per semester; cek kesesuaian seluruh elemen CP fase ini.'
        : 'Topik progresif tersedia dari kurasi internal; naskah Panduan Mapel khusus belum diaudit halaman-per-halaman.',
    };
  });

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
      rujukanCP: 'Keputusan Kepala BKPDM No. 021 Tahun 2026',
      panduanMapel: 'Belum diverifikasi secara lokal',
      elemenCPTercakup: [],
      tingkatKelengkapan: '0% (Empty State Jujur — Input CP Mandiri)',
      statusSumberDokumen: 'dokumen_resmi_teridentifikasi',
      statusReviewPedagogis: 'belum_ditinjau',
      catatanKesenjanganKonten: 'Naskah lengkap BKPDM 021/2026 belum tertanam; dipisahkan mutlak dari Pendidikan Agama.',
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
      rujukanCP: 'Keputusan Kepala BKPDM No. 020 Tahun 2026',
      panduanMapel: 'Belum diverifikasi secara lokal per agama',
      elemenCPTercakup: [],
      tingkatKelengkapan: '0% (Empty State Jujur — Dapat Dipilih & Input CP Mandiri)',
      statusSumberDokumen: 'dokumen_resmi_teridentifikasi',
      statusReviewPedagogis: 'belum_ditinjau',
      catatanKesenjanganKonten: 'Siaran pers resmi BKPDM 020/2026 terkonfirmasi, namun naskah CP & bank topik agama selain Islam belum dikurasi.',
    },
    {
      key: 'seni_mandiri_non_musik::all',
      mataPelajaran: 'Seni Rupa / Seni Tari / Seni Teater (Mata Pelajaran Mandiri)',
      jenjang: 'SMP/MTs',
      faseCode: 'Fase D',
      status: 'belum_tersedia',
      totalTopikSem1: 0,
      totalTopikSem2: 0,
      sumberUtama: 'SK Kepala BSKAP No. 046/H/KR/2025',
      catatan: 'Mata pelajaran Seni Rupa, Seni Tari, dan Seni Teater dapat dipilih terpisah, dengan empty state jujur (tidak menimpa ke Seni Budaya/Prakarya).',
      rujukanCP: 'SK Kepala BSKAP No. 046/H/KR/2025',
      panduanMapel: 'Panduan Seni Rupa/Tari/Teater 2025 belum diaudit halaman-per-halaman',
      elemenCPTercakup: [],
      tingkatKelengkapan: '0% (Dapat Dipilih — Belum Dikurasi Terpisah)',
      statusSumberDokumen: 'belum_terverifikasi',
      statusReviewPedagogis: 'belum_ditinjau',
      catatanKesenjanganKonten: 'Perlu kurasi terpisah per cabang seni mengacu Panduan Seni Rupa/Tari/Teater 2025.',
    },
    {
      key: 'seni_musik_umum_smk::SMK::Fase E',
      mataPelajaran: 'Seni Musik (Umum) — SMK',
      jenjang: 'SMK',
      faseCode: 'Fase E',
      status: 'berdasarkan_contoh_panduan',
      totalTopikSem1: 3,
      totalTopikSem2: 3,
      sumberUtama: 'Panduan Mata Pelajaran Seni Musik Revisi 3 (13 Sep 2025 — mencakup SMA/MA/SMK/MAK Fase E)',
      catatan: 'Merujuk MP Umum Seni Musik Fase E pada Panduan Seni Musik 2025; dibedakan dari Konsentrasi Keahlian SMK.',
      rujukanCP: 'SK Kepala BSKAP No. 046/H/KR/2025',
      panduanMapel: 'Final Panduan Mata Pelajaran Seni Musik (Revisi 3, 13 Sep 2025)',
      elemenCPTercakup: ['Mengalami', 'Merefleksikan', 'Berpikir Artistik', 'Menciptakan', 'Berdampak'],
      tingkatKelengkapan: 'Terstruktur (Rujukan MP Umum Fase E SMA/MA/SMK)',
      statusSumberDokumen: 'contoh_panduan',
      statusReviewPedagogis: 'belum_ditinjau',
      catatanKesenjanganKonten: 'Berlaku sebagai MP Umum sesuai Panduan Seni Musik hlm. 13 & 73; tidak boleh disamakan dengan Konsentrasi Keahlian Musik SMK.',
    },
    {
      key: 'seni_musik_smk::SMK::Fase F',
      mataPelajaran: 'Konsentrasi Keahlian Seni Musik / Pertunjukan Musik (SMK)',
      jenjang: 'SMK',
      faseCode: 'Fase F',
      status: 'input_guru_dibutuhkan',
      totalTopikSem1: 0,
      totalTopikSem2: 0,
      sumberUtama: 'CP Konsentrasi Keahlian SMK / Input Satuan Pendidikan',
      catatan: 'Bank Seni Musik umum SMA/SMP tidak disalin ke SMK kejuruan tanpa CP konsentrasi terkait.',
      rujukanCP: 'CP Konsentrasi Keahlian SMK (Input Sekolah)',
      panduanMapel: 'Dokumen Konsentrasi Keahlian SMK terkait',
      elemenCPTercakup: [],
      tingkatKelengkapan: '0% (Konteks Kejuruan — Wajib Input CP Konsentrasi)',
      statusSumberDokumen: 'belum_terverifikasi',
      statusReviewPedagogis: 'belum_ditinjau',
      catatanKesenjanganKonten: 'Mencegah pencampuran Seni Musik umum dengan kompetensi industri konsentrasi keahlian SMK.',
    },
    {
      key: 'konsentrasi_kejuruan_smk::SMK::Fase F',
      mataPelajaran: 'Mata Pelajaran Konsentrasi Keahlian SMK (TKJ, RPL, Akuntansi, Kuliner, DKV, dll.)',
      jenjang: 'SMK',
      faseCode: 'Fase F',
      status: 'input_guru_dibutuhkan',
      totalTopikSem1: 0,
      totalTopikSem2: 0,
      sumberUtama: 'CP Program/Konsentrasi Keahlian Kemendikdasmen',
      catatan: 'Membutuhkan input CP konsentrasi keahlian oleh guru atau tim program keahlian sekolah.',
      rujukanCP: 'CP Program/Konsentrasi Keahlian SMK',
      panduanMapel: 'Sesuai Spektrum Keahlian SMK',
      elemenCPTercakup: [],
      tingkatKelengkapan: '0% (Wajib Input CP Program/Konsentrasi Keahlian)',
      statusSumberDokumen: 'belum_terverifikasi',
      statusReviewPedagogis: 'belum_ditinjau',
      catatanKesenjanganKonten: 'Daftar konsentrasi sangat beragam; sistem tidak mengarang kompetensi kejuruan.',
    },
  ];

  return [...curatedRows, ...explicitlyUnavailableOrGuruRequired];
}

export function getSubjectFaseCoverageStatus(
  mataPelajaran: string,
  jenjangFase: JenjangFase | string,
  kelas?: string,
  options?: { jenjang?: TopicJenjangCategory }
): TopicSourceVerificationStatus {
  const res = lookupCuratedTopicBank(mataPelajaran, jenjangFase, kelas || '', '1 (Ganjil)', options);
  return res.coverageStatus;
}
