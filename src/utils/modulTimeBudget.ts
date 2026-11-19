import type {
  AlokasiWaktuModulDetail,
  KegiatanPembelajaranLangkah,
  ModulAjarDokumen,
  SMKSubjectTrack,
  TahapKegiatanTerstruktur,
} from '../types/perangkatAjar';
import { defaultDurasiMenitByJenjang, getSubjectJPConfig } from './jpConfigStorage';
import { resolveAcademicContext, type AcademicProfileLike } from './storageIdentity';
import type { CustomTPItem } from './schoolProfileStorage';

export type JenjangKategoriModul = 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'SMK';

export interface ModulTimePreset {
  jenjangKategori: JenjangKategoriModul;
  smkTrack?: SMKSubjectTrack;
  needsManualTrackSelection: boolean;
  jpPerPertemuan: number;
  menitPerJP: number;
  totalMenitPertemuan: number;
  sumberPreset: AlokasiWaktuModulDetail['sumberPreset'];
  presetOptionsJP: number[];
  catatanPreset: string;
}

export interface ModulMeetingPlanItem {
  pertemuanKe: number;
  jpPertemuan: number;
  alokasiMenit: number;
}

export interface ModulMeetingPlan {
  totalAlokasiJPTP: number;
  jpPerPertemuan: number;
  menitPerJP: number;
  totalMenitPertemuan: number;
  jumlahPertemuanDisarankan: number;
  jumlahPertemuanAktif: number;
  totalJPTercakup: number;
  selisihJP: number;
  pertemuanList: ModulMeetingPlanItem[];
}

export interface DistributedMeetingSlice {
  pertemuan: number;
  jpPertemuan: number;
  alokasiMenit: number;
  fokusPertemuan: string;
  targetSubTPPertemuan: { id: string; kode: string; kompetensi: string }[];
}

export interface SessionTimeBudgetValidation {
  pertemuan: number;
  expectedTotalMenit: number;
  actualTotalMenit: number;
  isValid: boolean;
  selisihMenit: number;
  isLegacyUnstructured: boolean;
  message: string;
}

export interface ModulTimeBudgetValidation {
  isValid: boolean;
  expectedMenitPerPertemuan: number;
  perPertemuan: SessionTimeBudgetValidation[];
  summaryMessage: string;
}

const PRESET_OPTIONS_BY_JENJANG: Record<JenjangKategoriModul, number[]> = {
  'SD/MI': [1, 2, 3, 4],
  'SMP/MTs': [2, 3, 4],
  'SMA/MA': [2, 3, 4],
  SMK: [2, 3, 4, 6],
};

function clampInt(val: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.round(val)));
}

export function normalizeJenjangKategori(jenjang?: string): JenjangKategoriModul {
  const upper = (jenjang || '').toUpperCase().trim();
  if (upper.includes('SMK') || upper.includes('MAK')) return 'SMK';
  if (upper.includes('SD') || upper === 'MI' || /\bMI\b/.test(upper)) return 'SD/MI';
  if (upper.includes('SMP') || upper.includes('MTS')) return 'SMP/MTs';
  if (upper.includes('SMA') || upper === 'MA' || /\bMA\b/.test(upper)) return 'SMA/MA';
  return 'SMP/MTs';
}

export function classifySMKSubjectTrack(mataPelajaran?: string): SMKSubjectTrack {
  const lower = (mataPelajaran || '').toLowerCase().trim();
  if (!lower) return 'tidak_teridentifikasi';

  // Mapel Umum SMK (termasuk label adaptasi seperti Matematika Kejuruan / Bahasa Inggris Profesi / Bahasa Arab Kejuruan)
  if (
    lower.includes('matematika') ||
    lower.includes('bahasa indonesia') ||
    lower.includes('bahasa inggris') ||
    lower.includes('bahasa arab') ||
    lower.includes('pancasila') ||
    lower.includes('ppkn') ||
    lower.includes('sejarah') ||
    lower.includes('agama') ||
    lower.includes('budi pekerti') ||
    lower.includes('kepercayaan') ||
    lower.includes('pjok') ||
    lower.includes('jasmani') ||
    /\(umum\)/i.test(lower) ||
    lower.startsWith('seni ') ||
    lower === 'seni'
  ) {
    // Pastikan "Konsentrasi Keahlian Seni Musik (SMK)" tetap masuk kejuruan
    if (!lower.includes('konsentrasi keahlian') && !lower.includes('pertunjukan')) {
      return 'umum';
    }
  }

  // Mapel Kejuruan & Praktik SMK
  const kejuruanKeywords = [
    'konsentrasi keahlian',
    'dasar kejuruan',
    'dasar-dasar program keahlian',
    'projek ipas',
    'informatika',
    'produk kreatif',
    'kewirausahaan',
    'pkk',
    'produktif',
    'kejuruan',
    'teknik',
    'rekayasa',
    'akuntansi',
    'desain komunikasi visual',
    'dkv',
    'kuliner',
    'perhotelan',
    'farmasi',
    'keperawatan',
    'otomotif',
    'tkj',
    'rpl',
    'tata boga',
    'tata busana',
    'agribisnis',
    'pemesinan',
    'kelistrikan',
    'listrik',
    'elektronika',
    'bengkel',
    'pertunjukan',
    'siaran program',
    'produksi',
    'bisnis',
    'pemasaran',
    'perkantoran',
    'logistik',
  ];

  if (kejuruanKeywords.some((kw) => lower.includes(kw))) {
    return 'kejuruan';
  }

  return 'tidak_teridentifikasi';
}

export function computeSessionTotalMinutes(
  jpPerPertemuan: number,
  menitPerJP: number
): number {
  const safeJP = clampInt(jpPerPertemuan, 1, 12, 2);
  const safeMenit = clampInt(menitPerJP, 20, 90, 40);
  return safeJP * safeMenit;
}

export function resolveModulTimePreset(
  profile?: AcademicProfileLike | null,
  options?: {
    jpPerPertemuan?: number;
    menitPerJP?: number;
    smkTrackOverride?: 'umum' | 'kejuruan';
    ignoreSavedSchoolConfig?: boolean;
  }
): ModulTimePreset {
  const ctx = resolveAcademicContext(profile);
  const jenjangKategori = normalizeJenjangKategori(ctx.jenjang);
  const jpConfig = getSubjectJPConfig(profile);
  const defaultMenit = defaultDurasiMenitByJenjang(jenjangKategori);

  let smkTrack: SMKSubjectTrack | undefined;
  let needsManualTrackSelection = false;

  if (jenjangKategori === 'SMK') {
    if (options?.smkTrackOverride) {
      smkTrack = options.smkTrackOverride;
    } else {
      smkTrack = classifySMKSubjectTrack(ctx.mataPelajaran);
      if (smkTrack === 'tidak_teridentifikasi') {
        needsManualTrackSelection = true;
      }
    }
  }

  let defaultJP =
    jenjangKategori === 'SD/MI'
      ? 2
      : jenjangKategori === 'SMK' && smkTrack === 'kejuruan'
      ? 4
      : 3;

  let menitPerJP = defaultMenit;
  let sumberPreset: AlokasiWaktuModulDetail['sumberPreset'] = 'preset_jenjang';

  const hasSavedSchoolConfig =
    !options?.ignoreSavedSchoolConfig &&
    jpConfig.statusKonfirmasi === 'dikonfirmasi_sekolah';

  if (hasSavedSchoolConfig) {
    menitPerJP = clampInt(jpConfig.durasiJPMinut, 20, 90, defaultMenit);
    if (!options?.smkTrackOverride) {
      const derivedSchoolJP = Math.round(
        jpConfig.jpPerMinggu / Math.max(1, jpConfig.pertemuanPerMinggu)
      );
      defaultJP = clampInt(derivedSchoolJP, 1, 12, defaultJP);
    }
    sumberPreset = 'konfigurasi_sekolah';
  }

  let jpPerPertemuan = defaultJP;
  if (typeof options?.jpPerPertemuan === 'number' && Number.isFinite(options.jpPerPertemuan)) {
    jpPerPertemuan = clampInt(options.jpPerPertemuan, 1, 12, defaultJP);
    if (jpPerPertemuan !== defaultJP) {
      sumberPreset = 'override_guru';
    }
  }

  if (typeof options?.menitPerJP === 'number' && Number.isFinite(options.menitPerJP)) {
    const customMenit = clampInt(options.menitPerJP, 20, 90, menitPerJP);
    if (customMenit !== menitPerJP) {
      menitPerJP = customMenit;
      sumberPreset = 'override_guru';
    }
  }

  const totalMenitPertemuan = computeSessionTotalMinutes(jpPerPertemuan, menitPerJP);

  let catatanPreset = '';
  if (jenjangKategori === 'SD/MI') {
    catatanPreset = `Preset SD/MI (${jpPerPertemuan} JP × ${menitPerJP} mnt = ${totalMenitPertemuan} mnt).`;
  } else if (jenjangKategori === 'SMP/MTs') {
    catatanPreset = `Preset SMP/MTs (${jpPerPertemuan} JP × ${menitPerJP} mnt = ${totalMenitPertemuan} mnt).`;
  } else if (jenjangKategori === 'SMA/MA') {
    catatanPreset = `Preset SMA/MA (${jpPerPertemuan} JP × ${menitPerJP} mnt = ${totalMenitPertemuan} mnt).`;
  } else if (smkTrack === 'kejuruan') {
    catatanPreset = `Preset SMK Kejuruan/Praktik (${jpPerPertemuan} JP × ${menitPerJP} mnt = ${totalMenitPertemuan} mnt).`;
  } else if (smkTrack === 'umum') {
    catatanPreset = `Preset SMK Mapel Umum (${jpPerPertemuan} JP × ${menitPerJP} mnt = ${totalMenitPertemuan} mnt).`;
  } else {
    catatanPreset = `Jenis mapel SMK "${ctx.mataPelajaran || '-'}" belum teridentifikasi otomatis — memakai preset aman ${jpPerPertemuan} JP (${totalMenitPertemuan} mnt). Pilih Umum atau Kejuruan secara manual bila perlu.`;
  }

  return {
    jenjangKategori,
    smkTrack,
    needsManualTrackSelection,
    jpPerPertemuan,
    menitPerJP,
    totalMenitPertemuan,
    sumberPreset,
    presetOptionsJP: PRESET_OPTIONS_BY_JENJANG[jenjangKategori],
    catatanPreset,
  };
}

export function computeMeetingsNeededForTP(
  totalAlokasiJPTP: number,
  jpPerPertemuan: number,
  menitPerJP: number = 40,
  customJumlahPertemuan?: number
): ModulMeetingPlan {
  const safeAlokasiTP = clampInt(totalAlokasiJPTP, 1, 64, clampInt(jpPerPertemuan, 1, 12, 2));
  const safeJPPerPertemuan = clampInt(jpPerPertemuan, 1, 12, 2);
  const safeMenitPerJP = clampInt(menitPerJP, 20, 90, 40);
  const totalMenitPertemuan = computeSessionTotalMinutes(safeJPPerPertemuan, safeMenitPerJP);

  const jumlahPertemuanDisarankan = Math.max(
    1,
    Math.ceil(safeAlokasiTP / safeJPPerPertemuan)
  );
  const jumlahPertemuanAktif =
    typeof customJumlahPertemuan === 'number' && Number.isFinite(customJumlahPertemuan)
      ? clampInt(customJumlahPertemuan, 1, 12, jumlahPertemuanDisarankan)
      : jumlahPertemuanDisarankan;

  const totalJPTercakup = jumlahPertemuanAktif * safeJPPerPertemuan;
  const selisihJP = totalJPTercakup - safeAlokasiTP;

  const pertemuanList: ModulMeetingPlanItem[] = Array.from(
    { length: jumlahPertemuanAktif },
    (_, idx) => ({
      pertemuanKe: idx + 1,
      jpPertemuan: safeJPPerPertemuan,
      alokasiMenit: totalMenitPertemuan,
    })
  );

  return {
    totalAlokasiJPTP: safeAlokasiTP,
    jpPerPertemuan: safeJPPerPertemuan,
    menitPerJP: safeMenitPerJP,
    totalMenitPertemuan,
    jumlahPertemuanDisarankan,
    jumlahPertemuanAktif,
    totalJPTercakup,
    selisihJP,
    pertemuanList,
  };
}

function apportionIntegerBudget(
  total: number,
  weights: number[],
  unitStep: number
): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const canUseStep =
    unitStep > 1 && total % unitStep === 0 && total >= n * unitStep;
  const step = canUseStep ? unitStep : 1;
  const totalUnits = Math.round(total / step);

  if (totalUnits <= n) {
    return weights.map((_, idx) => (idx < totalUnits ? step : 0));
  }

  const remainingUnits = totalUnits - n;
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 1));
  const weightSum = safeWeights.reduce((a, b) => a + b, 0);

  const rawUnits = safeWeights.map((w) => (w / weightSum) * remainingUnits);
  const floors = rawUnits.map((r) => Math.floor(r));
  let left = remainingUnits - floors.reduce((a, b) => a + b, 0);

  const rankedIndices = rawUnits
    .map((r, idx) => ({ idx, rem: r - floors[idx], weight: safeWeights[idx] }))
    .sort((a, b) => (b.rem !== a.rem ? b.rem - a.rem : b.weight - a.weight));

  let cursor = 0;
  while (left > 0 && rankedIndices.length > 0) {
    floors[rankedIndices[cursor % rankedIndices.length].idx] += 1;
    left -= 1;
    cursor += 1;
  }

  return floors.map((f) => (1 + f) * step);
}

export function distributeStageDurations(
  totalMenitPertemuan: number,
  intiStages: readonly { id: string; bobotDurasi: number }[]
): {
  pendahuluanMenit: number;
  intiMenitMap: Record<string, number>;
  penutupMenit: number;
} {
  const safeTotal = Math.max(intiStages.length + 2, Math.round(totalMenitPertemuan));
  const countInti = Math.max(1, intiStages.length);

  let pendahuluanMenit: number;
  let penutupMenit: number;

  if (safeTotal >= 40 && safeTotal % 5 === 0) {
    const snapped = Math.max(5, Math.min(25, Math.round((safeTotal * 0.12) / 5) * 5));
    pendahuluanMenit = snapped;
    penutupMenit = snapped;
    if (safeTotal - pendahuluanMenit - penutupMenit < countInti * 5) {
      pendahuluanMenit = 5;
      penutupMenit = 5;
    }
  } else {
    const rawSide = Math.max(1, Math.round(safeTotal * 0.13));
    const maxSide = Math.max(1, Math.floor((safeTotal - countInti) / 2));
    pendahuluanMenit = Math.min(rawSide, maxSide);
    penutupMenit = Math.min(rawSide, maxSide);
  }

  const intiBudget = Math.max(countInti, safeTotal - pendahuluanMenit - penutupMenit);
  const allocatedInti = apportionIntegerBudget(
    intiBudget,
    intiStages.map((s) => s.bobotDurasi),
    5
  );

  const intiMenitMap: Record<string, number> = {};
  intiStages.forEach((stage, idx) => {
    intiMenitMap[stage.id] = allocatedInti[idx] ?? 1;
  });

  // Pastikan penjumlahan tepat === safeTotal
  const actualSum =
    pendahuluanMenit +
    penutupMenit +
    Object.values(intiMenitMap).reduce((a, b) => a + b, 0);
  const diff = safeTotal - actualSum;
  if (diff !== 0 && intiStages.length > 0) {
    const targetStage = intiStages[0];
    intiMenitMap[targetStage.id] = Math.max(1, (intiMenitMap[targetStage.id] || 1) + diff);
  }

  return { pendahuluanMenit, intiMenitMap, penutupMenit };
}

export function distributeActivitiesIntoMeetings(params: {
  tp: CustomTPItem;
  jumlahPertemuan: number;
  jpPerPertemuan: number;
  menitPerJP: number;
}): DistributedMeetingSlice[] {
  const { tp, jumlahPertemuan, jpPerPertemuan, menitPerJP } = params;
  const count = clampInt(jumlahPertemuan, 1, 12, 1);
  const alokasiMenit = computeSessionTotalMinutes(jpPerPertemuan, menitPerJP);
  const subTPs = (tp.subTP || []).map((s) => ({
    id: s.id,
    kode: s.kode,
    kompetensi: s.kompetensi || s.fokusMateri || tp.tujuanPembelajaran,
  }));

  const fallbackFocusLabels = [
    `Pemahaman konsep inti & eksplorasi dasar ${tp.materiPokok}`,
    `Pendalaman, aplikasi kasus nyata, & penguatan ${tp.materiPokok}`,
    `Pengayaan analisis, penyajian karya, & evaluasi ${tp.materiPokok}`,
  ];

  return Array.from({ length: count }, (_, idx) => {
    const startIdx = Math.floor((idx * subTPs.length) / count);
    const endIdx = Math.floor(((idx + 1) * subTPs.length) / count);
    const slice = subTPs.slice(startIdx, endIdx);
    const activeSubs = slice.length > 0 ? slice : subTPs;

    let fokusPertemuan = '';
    if (count === 1) {
      fokusPertemuan =
        subTPs.length > 0
          ? `${tp.materiPokok} (${subTPs.map((s) => s.kode).join(', ')})`
          : tp.materiPokok;
    } else if (slice.length > 0) {
      fokusPertemuan = `Pertemuan ${idx + 1}: ${slice.map((s) => `${s.kode} — ${s.kompetensi}`).join('; ')}`;
    } else {
      fokusPertemuan = `Pertemuan ${idx + 1}: ${fallbackFocusLabels[Math.min(idx, fallbackFocusLabels.length - 1)]}`;
    }

    return {
      pertemuan: idx + 1,
      jpPertemuan: jpPerPertemuan,
      alokasiMenit,
      fokusPertemuan,
      targetSubTPPertemuan: activeSubs,
    };
  });
}

export function reconcileSessionStageDurations(
  stages: TahapKegiatanTerstruktur[],
  targetTotalMenit: number
): TahapKegiatanTerstruktur[] {
  if (!Array.isArray(stages) || stages.length === 0) return [];
  const safeTarget = Math.max(stages.length, Math.round(targetTotalMenit));
  const weights = stages.map((s) => (s.durasiMenit > 0 ? s.durasiMenit : 5));
  const newDurations = apportionIntegerBudget(safeTarget, weights, 5);
  return stages.map((stage, idx) => ({
    ...stage,
    durasiMenit: newDurations[idx] ?? 1,
  }));
}

export function formatLegacyStepLine(
  stageName: string,
  durasiMenit: number,
  body: string
): string {
  return `${stageName} (${durasiMenit} Menit): ${body}`;
}

export function syncLegacyArraysFromStructuredStages(
  stages: TahapKegiatanTerstruktur[]
): Pick<KegiatanPembelajaranLangkah, 'pendahuluan' | 'inti' | 'penutup'> {
  const pendahuluan = stages
    .filter((s) => s.fase === 'pendahuluan')
    .map((s) => formatLegacyStepLine(s.namaTahap, s.durasiMenit, `${s.aktivitasGuru} ${s.aktivitasSiswa}`.trim()));
  const inti = stages
    .filter((s) => s.fase === 'inti')
    .map((s) => formatLegacyStepLine(s.namaTahap, s.durasiMenit, `${s.aktivitasGuru} ${s.aktivitasSiswa}`.trim()));
  const penutup = stages
    .filter((s) => s.fase === 'penutup')
    .map((s) => formatLegacyStepLine(s.namaTahap, s.durasiMenit, `${s.aktivitasGuru} ${s.aktivitasSiswa}`.trim()));

  return { pendahuluan, inti, penutup };
}

export function validateSessionTimeBudget(
  kegiatan: KegiatanPembelajaranLangkah,
  expectedJpPerPertemuan: number,
  expectedMenitPerJP: number
): SessionTimeBudgetValidation {
  const expectedTotalMenit = computeSessionTotalMinutes(
    expectedJpPerPertemuan,
    expectedMenitPerJP
  );

  if (!Array.isArray(kegiatan.tahapTerstruktur) || kegiatan.tahapTerstruktur.length === 0) {
    const actualLegacy = Number(kegiatan.alokasiMenit) || 0;
    const isValid = actualLegacy === expectedTotalMenit;
    return {
      pertemuan: kegiatan.pertemuan,
      expectedTotalMenit,
      actualTotalMenit: actualLegacy,
      isValid,
      selisihMenit: actualLegacy - expectedTotalMenit,
      isLegacyUnstructured: true,
      message: isValid
        ? `Draf lama: total ${actualLegacy} / ${expectedTotalMenit} menit sesuai.`
        : `Draf lama: alokasi tercatat ${actualLegacy} menit vs target ${expectedTotalMenit} menit.`,
    };
  }

  const invalidZeroOrNeg = kegiatan.tahapTerstruktur.some(
    (s) => !Number.isFinite(s.durasiMenit) || s.durasiMenit <= 0
  );
  const actualTotalMenit = kegiatan.tahapTerstruktur.reduce(
    (sum, s) => sum + (Number.isFinite(s.durasiMenit) ? Math.round(s.durasiMenit) : 0),
    0
  );
  const selisihMenit = actualTotalMenit - expectedTotalMenit;
  const isValid = !invalidZeroOrNeg && selisihMenit === 0;

  let message: string;
  if (invalidZeroOrNeg) {
    message = `Pertemuan ${kegiatan.pertemuan}: terdapat tahap dengan durasi ≤ 0 menit.`;
  } else if (isValid) {
    message = `Pertemuan ${kegiatan.pertemuan}: total ${actualTotalMenit} / ${expectedTotalMenit} menit tepat.`;
  } else {
    const sign = selisihMenit > 0 ? `+${selisihMenit}` : String(selisihMenit);
    message = `Pertemuan ${kegiatan.pertemuan}: total ${actualTotalMenit} menit (${sign} menit dari target ${expectedTotalMenit} menit).`;
  }

  return {
    pertemuan: kegiatan.pertemuan,
    expectedTotalMenit,
    actualTotalMenit,
    isValid,
    selisihMenit,
    isLegacyUnstructured: false,
    message,
  };
}

export function validateModulTimeBudget(
  doc: ModulAjarDokumen,
  profile?: AcademicProfileLike | null
): ModulTimeBudgetValidation {
  const detail = doc.alokasiWaktuDetail;
  const preset = resolveModulTimePreset(profile, {
    jpPerPertemuan: detail?.jpPerPertemuan,
    menitPerJP: detail?.menitPerJP,
    smkTrackOverride:
      detail?.smkTrack === 'umum' || detail?.smkTrack === 'kejuruan'
        ? detail.smkTrack
        : undefined,
  });
  const expectedJp = detail?.jpPerPertemuan || preset.jpPerPertemuan;
  const expectedMenit = detail?.menitPerJP || preset.menitPerJP;
  const expectedTotal = computeSessionTotalMinutes(expectedJp, expectedMenit);

  const list = Array.isArray(doc.kegiatanPembelajaran) ? doc.kegiatanPembelajaran : [];
  const perPertemuan = list.map((keg) =>
    validateSessionTimeBudget(
      keg,
      keg.jpPertemuan || expectedJp,
      expectedMenit
    )
  );
  const isValid = perPertemuan.length > 0 && perPertemuan.every((p) => p.isValid);
  const summaryMessage =
    perPertemuan.length === 0
      ? 'Belum ada pertemuan terjadwal pada modul ini.'
      : isValid
      ? `Seluruh ${perPertemuan.length} pertemuan sesuai anggaran waktu (${expectedTotal} menit/pertemuan).`
      : perPertemuan
          .filter((p) => !p.isValid)
          .map((p) => p.message)
          .join(' ');

  return {
    isValid,
    expectedMenitPerPertemuan: expectedTotal,
    perPertemuan,
    summaryMessage,
  };
}

export function formatAlokasiWaktuLabel(plan: ModulMeetingPlan): string {
  const totalJPModul = plan.totalJPTercakup;
  if (plan.jumlahPertemuanAktif === 1) {
    return `${totalJPModul} JP (1 Pertemuan × ${plan.jpPerPertemuan} JP = ${plan.totalMenitPertemuan} Menit, ${plan.menitPerJP} mnt/JP)`;
  }
  return `${totalJPModul} JP (${plan.jumlahPertemuanAktif} Pertemuan × ${plan.jpPerPertemuan} JP = ${plan.totalMenitPertemuan} Menit/pertemuan, ${plan.menitPerJP} mnt/JP)`;
}
