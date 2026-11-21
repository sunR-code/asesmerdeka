import type { SchoolProfile, CustomTPItem } from './schoolProfileStorage';
import type {
  SiswaItem,
  PresensiPertemuan,
  JurnalMengajarItem,
  NilaiSiswaItem,
  KelasHarianData,
  KelasHarianDataSource,
  BobotNilaiKebijakan,
  BuktiAsesmenSubTP,
  RiwayatRemedialItem,
  PredikatKKTP,
  StatusKelengkapanNilai,
  StatusFinalisasiRapor,
  StudentValidationResult,
  ImportPreviewRow,
  ImportValidationSummary,
} from '../types/kelasHarian';
import {
  DEFAULT_CLASS_INTERVENTION_HEURISTIC_PERCENT,
  DEFAULT_KKTP_MIN_TUNTAS,
  classifyPredikatKKTPWithThreshold,
  computeDynamicKKTPBands,
  normalizeEvidenceScoreToScale100,
  resolveEffectiveKKTPThreshold,
} from './learningMasteryEngine';
import {
  buildKelasHarianStorageKeyV2,
  getPersistedActiveSchoolId,
  resolveAcademicContext,
} from './storageIdentity';
import {
  getClassRosterRecord,
  saveClassRosterRecord,
  syncKelasHarianWithClassRoster,
} from './rosterStorage';

export const DEFAULT_BOBOT_NILAI: BobotNilaiKebijakan = {
  bobotFormatif: 50,
  bobotSTS: 25,
  bobotSAS: 25,
  bobotPraktik: 0,
  kktpMinTuntas: DEFAULT_KKTP_MIN_TUNTAS,
  ambangKelasTindakLanjutPersen: DEFAULT_CLASS_INTERVENTION_HEURISTIC_PERCENT,
};

export const SIMULATION_NOTICE_TEXT =
  'SIMULASI / DATA CONTOH — BUKAN DATA AKTUAL SEKOLAH';

export const LEGACY_UNVERIFIED_NOTICE_TEXT =
  'DATA LAMA BELUM TERVERIFIKASI — KONFIRMASI ASAL DATA SEBELUM PENGESAHAN';

const DEFAULT_SISWA_LIST: Omit<SiswaItem, 'id' | 'noUrut'>[] = [
  { nis: '2425001', nama: 'Aditia Pratama', jenisKelamin: 'L' },
  { nis: '2425002', nama: 'Aisyah Putri Rahmadani', jenisKelamin: 'P' },
  { nis: '2425003', nama: 'Ahmad Rizky Fauzan', jenisKelamin: 'L' },
  { nis: '2425004', nama: 'Amanda Salsa Bella', jenisKelamin: 'P' },
  { nis: '2425005', nama: 'Andika Bagus Setiawan', jenisKelamin: 'L' },
  { nis: '2425006', nama: 'Annisa Nurul Fadilah', jenisKelamin: 'P' },
  { nis: '2425007', nama: 'Arya Bayu Samudra', jenisKelamin: 'L' },
  { nis: '2425008', nama: 'Aurelia Citra Dewi', jenisKelamin: 'P' },
  { nis: '2425009', nama: 'Bagas Dwi Cahyono', jenisKelamin: 'L' },
  { nis: '2425010', nama: 'Cantika Maharani', jenisKelamin: 'P' },
  { nis: '2425011', nama: 'Daffa Ibnu Sina', jenisKelamin: 'L' },
  { nis: '2425012', nama: 'Dewi Ayu Lestari', jenisKelamin: 'P' },
  { nis: '2425013', nama: 'Dimas Arya Saputra', jenisKelamin: 'L' },
  { nis: '2425014', nama: 'Fadhil Muhammad', jenisKelamin: 'L' },
  { nis: '2425015', nama: 'Fatimah Zahra', jenisKelamin: 'P' },
  { nis: '2425016', nama: 'Gilang Ramadhan', jenisKelamin: 'L' },
  { nis: '2425017', nama: 'Hani Safitri', jenisKelamin: 'P' },
  { nis: '2425018', nama: 'Ilham Maulana', jenisKelamin: 'L' },
  { nis: '2425019', nama: 'Intan Permata Sari', jenisKelamin: 'P' },
  { nis: '2425020', nama: 'Kevin Ardiansyah', jenisKelamin: 'L' },
  { nis: '2425021', nama: 'Laila Ramadhani', jenisKelamin: 'P' },
  { nis: '2425022', nama: 'Muhammad Alif Haidar', jenisKelamin: 'L' },
  { nis: '2425023', nama: 'Nabila Putri Utami', jenisKelamin: 'P' },
  { nis: '2425024', nama: 'Rafi Danendra', jenisKelamin: 'L' },
  { nis: '2425025', nama: 'Raisya Nur Aini', jenisKelamin: 'P' },
  { nis: '2425026', nama: 'Rendy Wahyu Kurniawan', jenisKelamin: 'L' },
  { nis: '2425027', nama: 'Siti Nurhaliza', jenisKelamin: 'P' },
  { nis: '2425028', nama: 'Tegar Prasetyo', jenisKelamin: 'L' },
  { nis: '2425029', nama: 'Vina Novita Sari', jenisKelamin: 'P' },
  { nis: '2425030', nama: 'Zaidan Akbar', jenisKelamin: 'L' },
];

function getLegacyStorageKey(profile: SchoolProfile): string {
  const p = profile || ({} as SchoolProfile);
  const cleanSchool = (p.namaSekolah || 'sekolah').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanMapel = (p.mataPelajaranUtama || 'mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKelas = (p.kelasUtama || '7').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanRombel = (p.rombelAktif || 'A').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSemester = (p.semester || '1').includes('2') ? 'sem2' : 'sem1';
  return `asesmerdeka_harian_${cleanSchool}_${cleanMapel}_${cleanKelas}_${cleanRombel}_${cleanSemester}`;
}

export function getPrimaryFormatifKey(tp: Pick<CustomTPItem, 'id' | 'kode'>): string {
  return tp.id || tp.kode;
}

export function getFormatifScoreForTP(
  nilaiFormatif: { [tpKey: string]: number | null | undefined } | undefined | null,
  tp: Pick<CustomTPItem, 'id' | 'kode'>
): number | undefined {
  if (!nilaiFormatif || typeof nilaiFormatif !== 'object') return undefined;
  const idVal = tp.id ? nilaiFormatif[tp.id] : undefined;
  if (typeof idVal === 'number' && !Number.isNaN(idVal)) {
    return idVal;
  }
  const kodeVal = tp.kode ? nilaiFormatif[tp.kode] : undefined;
  if (typeof kodeVal === 'number' && !Number.isNaN(kodeVal)) {
    return kodeVal;
  }
  return undefined;
}

export function getActiveFormatifScores(
  nilaiFormatif: { [tpKey: string]: number | null | undefined } | undefined | null,
  tpList?: CustomTPItem[]
): number[] {
  if (!nilaiFormatif || typeof nilaiFormatif !== 'object') return [];
  if (Array.isArray(tpList) && tpList.length > 0) {
    const out: number[] = [];
    for (const tp of tpList) {
      const score = getFormatifScoreForTP(nilaiFormatif, tp);
      if (typeof score === 'number' && !Number.isNaN(score)) {
        out.push(score);
      }
    }
    return out;
  }
  return Object.values(nilaiFormatif).filter(
    (v): v is number => typeof v === 'number' && !Number.isNaN(v)
  );
}

export function setFormatifScoreForTP(
  nilaiFormatif: { [tpKey: string]: number | null | undefined } | undefined | null,
  tp: Pick<CustomTPItem, 'id' | 'kode'>,
  score: number | null | undefined
): { [tpKey: string]: number } {
  const next: { [tpKey: string]: number } = {};
  if (nilaiFormatif && typeof nilaiFormatif === 'object') {
    for (const [k, v] of Object.entries(nilaiFormatif)) {
      if (typeof v === 'number' && !Number.isNaN(v)) {
        next[k] = v;
      }
    }
  }
  const primaryKey = getPrimaryFormatifKey(tp);
  if (typeof score === 'number' && !Number.isNaN(score)) {
    next[primaryKey] = Math.min(100, Math.max(0, score));
  } else {
    delete next[primaryKey];
  }
  if (tp.id && tp.kode && tp.kode !== primaryKey && Object.prototype.hasOwnProperty.call(next, tp.kode)) {
    delete next[tp.kode];
  }
  return next;
}

export function normalizeBobotKebijakan(
  bobot?: Partial<BobotNilaiKebijakan> | null
): BobotNilaiKebijakan {
  if (!bobot || typeof bobot !== 'object') return { ...DEFAULT_BOBOT_NILAI };
  return {
    bobotFormatif:
      typeof bobot.bobotFormatif === 'number' && !Number.isNaN(bobot.bobotFormatif)
        ? bobot.bobotFormatif
        : DEFAULT_BOBOT_NILAI.bobotFormatif,
    bobotSTS:
      typeof bobot.bobotSTS === 'number' && !Number.isNaN(bobot.bobotSTS)
        ? bobot.bobotSTS
        : DEFAULT_BOBOT_NILAI.bobotSTS,
    bobotSAS:
      typeof bobot.bobotSAS === 'number' && !Number.isNaN(bobot.bobotSAS)
        ? bobot.bobotSAS
        : DEFAULT_BOBOT_NILAI.bobotSAS,
    bobotPraktik:
      typeof bobot.bobotPraktik === 'number' && !Number.isNaN(bobot.bobotPraktik)
        ? bobot.bobotPraktik
        : 0,
    kktpMinTuntas:
      typeof bobot.kktpMinTuntas === 'number' && !Number.isNaN(bobot.kktpMinTuntas)
        ? Math.min(100, Math.max(1, Math.round(bobot.kktpMinTuntas)))
        : DEFAULT_KKTP_MIN_TUNTAS,
    ambangKelasTindakLanjutPersen:
      typeof bobot.ambangKelasTindakLanjutPersen === 'number' &&
      !Number.isNaN(bobot.ambangKelasTindakLanjutPersen)
        ? Math.min(100, Math.max(1, Math.round(bobot.ambangKelasTindakLanjutPersen)))
        : DEFAULT_CLASS_INTERVENTION_HEURISTIC_PERCENT,
  };
}

export function validateBobotKebijakan(bobot: BobotNilaiKebijakan): {
  valid: boolean;
  total: number;
  message?: string;
} {
  const wf = Number(bobot.bobotFormatif);
  const ws = Number(bobot.bobotSTS);
  const wa = Number(bobot.bobotSAS);
  const wp = Number(bobot.bobotPraktik ?? 0);
  const kktp = bobot.kktpMinTuntas ?? DEFAULT_KKTP_MIN_TUNTAS;
  const weights = [wf, ws, wa, wp];
  if (weights.some((w) => !Number.isFinite(w) || w < 0 || w > 100)) {
    return {
      valid: false,
      total: weights.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
      message: 'Setiap bobot penilaian harus bernilai antara 0% sampai 100%.',
    };
  }
  if (!Number.isFinite(kktp) || kktp < 1 || kktp > 100) {
    return {
      valid: false,
      total: Math.round((wf + ws + wa + wp) * 100) / 100,
      message: 'Ambang KKTP minimal tuntas harus bernilai antara 1 sampai 100.',
    };
  }
  const total = Math.round((wf + ws + wa + wp) * 100) / 100;
  if (total !== 100) {
    return {
      valid: false,
      total,
      message: `Total bobot saat ini ${total}%. Jumlah bobot penilaian harus tepat 100%.`,
    };
  }
  return { valid: true, total: 100 };
}

export function classifyPredikatKKTP(
  na: number | null | undefined,
  kktpMinTuntas: number = DEFAULT_KKTP_MIN_TUNTAS
): PredikatKKTP {
  return classifyPredikatKKTPWithThreshold(na, kktpMinTuntas);
}

export function computeNilaiAkhir(
  nilaiFormatif: { [kodeTP: string]: number | null | undefined },
  sts: number | null | undefined,
  sas: number | null | undefined,
  tpList?: CustomTPItem[],
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null,
  nilaiPraktik?: number | null | undefined
): {
  na: number | null;
  predikat: PredikatKKTP;
  statusNilai: StatusKelengkapanNilai;
  isComplete: boolean;
  avgFormatif: number | null;
} {
  const bobot = normalizeBobotKebijakan(bobotPolicy);
  const scores = getActiveFormatifScores(nilaiFormatif, tpList);
  const avgFormatif =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const hasSTS = typeof sts === 'number' && !Number.isNaN(sts);
  const hasSAS = typeof sas === 'number' && !Number.isNaN(sas);
  const hasPraktik = typeof nilaiPraktik === 'number' && !Number.isNaN(nilaiPraktik);
  const wF = bobot.bobotFormatif;
  const wSTS = bobot.bobotSTS;
  const wSAS = bobot.bobotSAS;
  const wPr = bobot.bobotPraktik ?? 0;

  let weightedSum = 0;
  let activeWeight = 0;

  if (wF > 0 && avgFormatif !== null) {
    weightedSum += avgFormatif * wF;
    activeWeight += wF;
  }
  if (wSTS > 0 && hasSTS) {
    weightedSum += (sts as number) * wSTS;
    activeWeight += wSTS;
  }
  if (wSAS > 0 && hasSAS) {
    weightedSum += (sas as number) * wSAS;
    activeWeight += wSAS;
  }
  if (wPr > 0 && hasPraktik) {
    weightedSum += (nilaiPraktik as number) * wPr;
    activeWeight += wPr;
  }

  const allTPsGraded =
    Array.isArray(tpList) && tpList.length > 0
      ? scores.length === tpList.length
      : scores.length > 0;
  const formatifReady = wF === 0 || allTPsGraded;
  const stsReady = wSTS === 0 || hasSTS;
  const sasReady = wSAS === 0 || hasSAS;
  const praktikReady = wPr === 0 || hasPraktik;

  const isComplete = formatifReady && stsReady && sasReady && praktikReady;
  const hasAnyScore =
    avgFormatif !== null || hasSTS || hasSAS || (wPr > 0 && hasPraktik);

  if (!hasAnyScore || activeWeight === 0) {
    return {
      na: null,
      predikat: 'Belum Dinilai',
      statusNilai: 'belum_dinilai',
      isComplete: false,
      avgFormatif: null,
    };
  }

  const totalPolicyWeight = wF + wSTS + wSAS + wPr;
  const denominator =
    isComplete && totalPolicyWeight > 0 ? totalPolicyWeight : activeWeight;
  const na = Math.round(weightedSum / denominator);
  const predikat = classifyPredikatKKTP(na, bobot.kktpMinTuntas ?? DEFAULT_KKTP_MIN_TUNTAS);
  const statusNilai: StatusKelengkapanNilai = isComplete ? 'lengkap' : 'sebagian';

  return {
    na,
    predikat,
    statusNilai,
    isComplete,
    avgFormatif: avgFormatif !== null ? Math.round(avgFormatif) : null,
  };
}

export interface AutoDeskripsiRaporOptions {
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null;
  schoolProfile?: Pick<SchoolProfile, 'kktpMinTuntas'> | null;
  nilaiSTS?: number | null;
  nilaiSAS?: number | null;
  nilaiPraktik?: number | null;
  buktiAsesmenSubTP?: BuktiAsesmenSubTP[];
  riwayatRemedial?: RiwayatRemedialItem[];
}

export function generateAutoDeskripsiRapor(
  nilaiFormatif: { [kodeTP: string]: number | null | undefined },
  tpList: CustomTPItem[],
  namaSiswa: string,
  options?: AutoDeskripsiRaporOptions
): string {
  if (!Array.isArray(tpList) || tpList.length === 0) {
    return `${namaSiswa} telah mengikuti rangkaian pembelajaran semester ini, namun tujuan pembelajaran belum dikonfigurasi.`;
  }

  const classThreshold = resolveEffectiveKKTPThreshold({
    bobotPolicy: options?.bobotPolicy,
    schoolProfile: options?.schoolProfile,
  });
  const classBands = computeDynamicKKTPBands(classThreshold);

  const recorded: { tp: CustomTPItem; score: number; threshold: number; bands: ReturnType<typeof computeDynamicKKTPBands> }[] = [];
  for (const tp of tpList) {
    let score = getFormatifScoreForTP(nilaiFormatif, tp);
    if (score === undefined && Array.isArray(options?.buktiAsesmenSubTP)) {
      const tpEvs = options.buktiAsesmenSubTP.filter(
        (ev) =>
          ev.peranBukti !== 'reassessment' &&
          ((ev.tpId && tp.id && ev.tpId === tp.id) ||
            (ev.tpKode && tp.kode && ev.tpKode.trim().toLowerCase() === tp.kode.trim().toLowerCase()))
      );
      const normScores = tpEvs
        .map((ev) => normalizeEvidenceScoreToScale100(ev.skor, ev.skalaSkor))
        .filter((v): v is number => v !== null);
      if (normScores.length > 0) {
        score = Math.round(normScores.reduce((a, b) => a + b, 0) / normScores.length);
      }
    }
    if (typeof score === 'number' && !Number.isNaN(score)) {
      const tpThresh = resolveEffectiveKKTPThreshold({
        tp,
        bobotPolicy: options?.bobotPolicy,
        schoolProfile: options?.schoolProfile,
      });
      recorded.push({
        tp,
        score,
        threshold: tpThresh,
        bands: computeDynamicKKTPBands(tpThresh),
      });
    }
  }

  const hasSTS = typeof options?.nilaiSTS === 'number' && !Number.isNaN(options.nilaiSTS);
  const hasSAS = typeof options?.nilaiSAS === 'number' && !Number.isNaN(options.nilaiSAS);
  const hasPraktik =
    typeof options?.nilaiPraktik === 'number' && !Number.isNaN(options.nilaiPraktik);

  const subTpNotes: string[] = [];
  if (Array.isArray(options?.buktiAsesmenSubTP) && options.buktiAsesmenSubTP.length > 0) {
    const specificSubEvs = options.buktiAsesmenSubTP.filter(
      (ev) => ev.peranBukti !== 'reassessment' && Boolean(ev.subTpKode || ev.subTpId)
    );
    if (specificSubEvs.length > 0) {
      const achievedSubs: string[] = [];
      const guidedSubs: string[] = [];
      specificSubEvs.forEach((ev) => {
        const label = ev.subTpKode || ev.indikatorYangDiamati.slice(0, 35);
        const norm = normalizeEvidenceScoreToScale100(ev.skor, ev.skalaSkor);
        const isGood =
          norm !== null ? norm >= classThreshold : ev.statusKetercapaian === 'Tercapai';
        const isNeedHelp =
          norm !== null ? norm < classThreshold : ev.statusKetercapaian === 'Perlu Bimbingan';
        if (isGood && !achievedSubs.includes(label)) achievedSubs.push(label);
        else if (isNeedHelp && !guidedSubs.includes(label)) guidedSubs.push(label);
      });
      if (achievedSubs.length > 0 || guidedSubs.length > 0) {
        const subParts: string[] = [];
        if (achievedSubs.length > 0) subParts.push(`menguasai bukti Sub-TP ${achievedSubs.join(', ')}`);
        if (guidedSubs.length > 0) subParts.push(`memerlukan penguatan pada Sub-TP ${guidedSubs.join(', ')}`);
        subTpNotes.push(`Berdasarkan bukti spesifik, peserta didik ${subParts.join(' serta ')}.`);
      }
    }
  }

  const remedialImprovements: string[] = [];
  if (Array.isArray(options?.riwayatRemedial)) {
    for (const r of options.riwayatRemedial) {
      const beforePct = r.hasilSebelum?.persentase;
      const afterPct = r.hasilSesudah?.persentase;
      const hasNumericGain =
        typeof beforePct === 'number' && typeof afterPct === 'number' && afterPct > beforePct;
      const hasVerifiedCompletion = r.statusTindakLanjut === 'tuntas_setelah_remedial';
      if (hasVerifiedCompletion || hasNumericGain) {
        const matchedTp = tpList.find(
          (t) => t.id === r.tpId || (r.tpKode && t.kode === r.tpKode)
        );
        const topic = matchedTp?.materiPokok || r.tpKode || 'tujuan pembelajaran terkait';
        if (!remedialImprovements.includes(topic)) {
          remedialImprovements.push(topic);
        }
      }
    }
  }

  const sumatifParts: string[] = [];
  if (hasSTS) {
    sumatifParts.push(
      `STS (${options!.nilaiSTS}, ${options!.nilaiSTS! >= classThreshold ? 'memenuhi KKTP' : 'di bawah KKTP'})`
    );
  }
  if (hasSAS) {
    sumatifParts.push(
      `SAS (${options!.nilaiSAS}, ${options!.nilaiSAS! >= classThreshold ? 'memenuhi KKTP' : 'di bawah KKTP'})`
    );
  }
  if (hasPraktik) {
    sumatifParts.push(
      `Praktik (${options!.nilaiPraktik}, ${options!.nilaiPraktik! >= classThreshold ? 'memenuhi KKTP' : 'di bawah KKTP'})`
    );
  }
  const sumatifSuffix =
    sumatifParts.length > 0 ? ` Capaian asesmen sumatif/praktik tercatat: ${sumatifParts.join('; ')}.` : '';
  const subTpSuffix = subTpNotes.length > 0 ? ` ${subTpNotes.join(' ')}` : '';
  const improvementSuffix =
    remedialImprovements.length > 0
      ? ` Menunjukkan peningkatan capaian setelah tindak lanjut pembelajaran pada ${remedialImprovements.join(', ')}.`
      : '';

  if (recorded.length === 0) {
    if (hasSTS || hasSAS || hasPraktik || subTpNotes.length > 0) {
      return `Nilai formatif per TP untuk ${namaSiswa} belum lengkap${sumatifSuffix}${subTpSuffix}${improvementSuffix} Silakan lengkapi bukti formatif sebelum finalisasi e-Rapor.`.trim();
    }
    return `Data penilaian formatif untuk ${namaSiswa} belum diinput. Silakan lengkapi nilai pada Buku Nilai sebelum memfinalisasi deskripsi capaian e-Rapor.`;
  }

  const missingCount = tpList.length - recorded.length;
  const missingSuffix =
    missingCount > 0 ? ` (${missingCount} TP lainnya belum dinilai.)` : '';

  if (recorded.length === 1) {
    const single = recorded[0];
    const ringkasan =
      single.tp.materiPokok || single.tp.tujuanPembelajaran.slice(0, 60);
    let body = '';
    if (single.score >= single.bands.sangatBaikMin) {
      body = `Menunjukkan penguasaan yang sangat baik dalam memahami dan menerapkan konsep ${ringkasan}.`;
    } else if (single.score >= single.bands.minTuntas) {
      body = `Menunjukkan penguasaan yang baik dalam memahami materi ${ringkasan}.`;
    } else if (single.score >= single.bands.cukupMin) {
      body = `Menunjukkan pemahaman dasar yang cukup pada materi ${ringkasan} dan masih perlu penguatan latihan kontekstual.`;
    } else {
      body = `Memerlukan bimbingan intensif serta pendampingan latihan tambahan pada materi ${ringkasan}.`;
    }
    return `${body}${sumatifSuffix}${subTpSuffix}${improvementSuffix}${missingSuffix}`;
  }

  // Pilih TP tertinggi dan terendah dengan jaminan dua TP berbeda
  let maxEntry = recorded[0];
  for (const entry of recorded) {
    if (entry.score > maxEntry.score) {
      maxEntry = entry;
    }
  }
  const remainingForMin = recorded.filter(
    (entry) => (entry.tp.id || entry.tp.kode) !== (maxEntry.tp.id || maxEntry.tp.kode)
  );
  let minEntry = remainingForMin[0] || recorded[recorded.length - 1];
  for (const entry of remainingForMin) {
    if (entry.score <= minEntry.score) {
      minEntry = entry;
    }
  }

  const ringkasanMax =
    maxEntry.tp.materiPokok || maxEntry.tp.tujuanPembelajaran.slice(0, 60);
  const ringkasanMin =
    minEntry.tp.materiPokok || minEntry.tp.tujuanPembelajaran.slice(0, 60);

  let narrative = '';
  if (
    maxEntry.score >= classBands.sangatBaikMin &&
    minEntry.score >= classBands.sangatBaikMin
  ) {
    narrative = `Menunjukkan penguasaan yang sangat memuaskan dan istimewa dalam ${ringkasanMax}, serta konsisten menguasai seluruh capaian pembelajaran hingga ${ringkasanMin} dengan sangat baik.`;
  } else if (maxEntry.score >= maxEntry.threshold && minEntry.score < minEntry.threshold) {
    narrative = `Menunjukkan penguasaan yang sangat baik dalam memahami ${ringkasanMax}, namun perlu pendampingan dan latihan tambahan dalam penguasaan materi ${ringkasanMin}.`;
  } else if (maxEntry.score < maxEntry.threshold) {
    narrative = `Mulai menunjukkan pemahaman dasar dalam materi ${ringkasanMax}, namun memerlukan bimbingan intensif dan evaluasi bertahap pada materi ${ringkasanMin}.`;
  } else {
    narrative = `Menunjukkan penguasaan yang baik dalam materi ${ringkasanMax}, serta cukup terampil dan aktif dalam ${ringkasanMin}.`;
  }

  return `${narrative}${sumatifSuffix}${subTpSuffix}${improvementSuffix}${missingSuffix}`;
}

export function generateDefaultPresensi(
  daftarSiswa: SiswaItem[],
  totalPertemuan: number = 16
): PresensiPertemuan[] {
  const result: PresensiPertemuan[] = [];
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - 2); // Set roughly around start of semester

  for (let i = 1; i <= totalPertemuan; i++) {
    const meetingDate = new Date(baseDate);
    meetingDate.setDate(meetingDate.getDate() + (i - 1) * 7); // 1 minggu sekali
    const dateStr = meetingDate.toISOString().split('T')[0];

    const statusMap: { [siswaId: string]: 'H' | 'S' | 'I' | 'A' } = {};
    daftarSiswa.forEach((s, idx) => {
      // 95% hadir secara realistis, beberapa izin/sakit
      if (i === 3 && idx === 4) statusMap[s.id] = 'S';
      else if (i === 6 && idx === 12) statusMap[s.id] = 'I';
      else if (i === 10 && idx === 18) statusMap[s.id] = 'S';
      else statusMap[s.id] = 'H';
    });

    result.push({
      id: `presensi_p${i}`,
      pertemuanKe: i,
      tanggal: dateStr,
      statusMap,
    });
  }

  return result;
}

export function generateDefaultJurnal(
  tpList: CustomTPItem[],
  totalPertemuan: number = 16
): JurnalMengajarItem[] {
  const result: JurnalMengajarItem[] = [];
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - 2);

  for (let i = 1; i <= totalPertemuan; i++) {
    const meetingDate = new Date(baseDate);
    meetingDate.setDate(meetingDate.getDate() + (i - 1) * 7);
    const dateStr = meetingDate.toISOString().split('T')[0];

    const tpIndex = tpList.length > 0 ? (i - 1) % tpList.length : 0;
    const currentTP = tpList[tpIndex];

    const kodeTP = currentTP ? currentTP.kode : `TP.${i}`;
    const materiPokok = currentTP ? currentTP.materiPokok : `Materi Pokok Pertemuan ${i}`;
    const tpText = currentTP ? currentTP.tujuanPembelajaran : `Mencapai tujuan pembelajaran pertemuan ke-${i}`;

    result.push({
      id: `jurnal_p${i}`,
      pertemuanKe: i,
      tanggal: dateStr,
      jamKe: '1 - 3 (07.30 - 09.30)',
      tpId: currentTP?.id,
      subTpIds: Array.isArray(currentTP?.subTP) && currentTP.subTP.length > 0 ? [currentTP.subTP[0].id] : undefined,
      kodeTP,
      materiPokok,
      jumlahJP: currentTP?.alokasiJP ? Math.min(4, Math.max(2, Math.round(currentTP.alokasiJP / 2))) : 2,
      kegiatanPembelajaran: `Pembelajaran berdiferensiasi dan diskusi kelompok terarah mengenai "${materiPokok}". Siswa aktif mengeksplorasi konsep: ${tpText.slice(0, 80)}. Ditutup dengan refleksi formatif singkat.`,
      siswaTidakHadir: 'Nihil (Semua Hadir)',
      catatanRefleksi: 'Siswa antusias dan aktif berdiskusi. Sebagian siswa memerlukan pendalaman konsep dasar saat kerja kelompok.',
      statusKeterlaksanaan: 'terlaksana',
    });
  }

  return result;
}

export function generateDefaultNilai(
  daftarSiswa: SiswaItem[],
  tpList: CustomTPItem[]
): NilaiSiswaItem[] {
  return daftarSiswa.map((siswa, idx) => {
    // Beri variasi nilai yang realistis berkisar antara 72 hingga 95
    const baseScore = 76 + (idx % 8) * 2.5;
    const nilaiFormatif: { [kodeTP: string]: number } = {};

    tpList.forEach((tp, tIdx) => {
      const variation = ((idx + tIdx) % 5) - 2;
      const score = Math.min(98, Math.max(68, Math.round(baseScore + variation)));
      nilaiFormatif[getPrimaryFormatifKey(tp)] = score;
    });

    const sts = Math.min(97, Math.max(70, Math.round(baseScore + ((idx % 3) - 1))));
    const sas = Math.min(98, Math.max(70, Math.round(baseScore + ((idx % 4) - 1))));
    const { na, predikat, statusNilai } = computeNilaiAkhir(nilaiFormatif, sts, sas, tpList);
    const deskripsi = generateAutoDeskripsiRapor(nilaiFormatif, tpList, siswa.nama);

    return {
      siswaId: siswa.id,
      nama: siswa.nama,
      nis: siswa.nis,
      nisn: siswa.nisn,
      nilaiFormatif,
      nilaiSTS: sts,
      nilaiSAS: sas,
      nilaiPraktik: null,
      nilaiAkhir: na,
      predikatKKTP: predikat,
      statusNilai,
      statusRapor: statusNilai === 'lengkap' ? 'draf' : 'belum_lengkap',
      deskripsiRapor: deskripsi,
    };
  });
}

export function hasUntouchedDefaultRoster(daftarSiswa: SiswaItem[] | undefined): boolean {
  if (!Array.isArray(daftarSiswa) || daftarSiswa.length !== DEFAULT_SISWA_LIST.length) {
    return false;
  }
  return daftarSiswa.every(
    (s, idx) =>
      s.id === `siswa_${idx + 1}` &&
      s.nama === DEFAULT_SISWA_LIST[idx].nama &&
      s.nis === DEFAULT_SISWA_LIST[idx].nis
  );
}

export function containsSimulatedDummyStudents(daftarSiswa: SiswaItem[] | undefined): boolean {
  if (!Array.isArray(daftarSiswa) || daftarSiswa.length === 0) return false;
  return daftarSiswa.some((s) => {
    const match = /^siswa_(\d+)$/.exec(s.id || '');
    if (!match) return false;
    const idx = Number(match[1]) - 1;
    const ref = DEFAULT_SISWA_LIST[idx];
    return Boolean(ref && ref.nama === s.nama && ref.nis === s.nis);
  });
}

export function resolveKelasHarianDataSource(
  data?: Partial<KelasHarianData> | null
): KelasHarianDataSource {
  if (!data) return 'simulation_demo';
  if (
    data.dataSource === 'simulation_demo' ||
    data.dataSource === 'empty_class' ||
    data.dataSource === 'user_imported' ||
    data.dataSource === 'user_manual' ||
    data.dataSource === 'legacy_unverified'
  ) {
    return data.dataSource;
  }
  const roster = Array.isArray(data.daftarSiswa) ? data.daftarSiswa : [];
  if (typeof data.isSimulated === 'boolean') {
    if (data.isSimulated) return 'simulation_demo';
    return roster.length === 0 ? 'empty_class' : 'user_manual';
  }
  // Migrasi data lama tanpa metadata asal-usul: jangan otomatis dianggap data aktual
  if (roster.length === 0) return 'empty_class';
  if (hasUntouchedDefaultRoster(roster)) {
    return 'simulation_demo';
  }
  return 'legacy_unverified';
}

export function isKelasHarianSimulated(data?: Partial<KelasHarianData> | null): boolean {
  return resolveKelasHarianDataSource(data) === 'simulation_demo';
}

export function isKelasHarianLegacyUnverified(data?: Partial<KelasHarianData> | null): boolean {
  return resolveKelasHarianDataSource(data) === 'legacy_unverified';
}

export function needsExportVerificationWarning(data?: Partial<KelasHarianData> | null): boolean {
  return isKelasHarianSimulated(data) || isKelasHarianLegacyUnverified(data);
}

export function getExportVerificationNoticeText(data?: Partial<KelasHarianData> | null): string | null {
  if (isKelasHarianSimulated(data)) return SIMULATION_NOTICE_TEXT;
  if (isKelasHarianLegacyUnverified(data)) return LEGACY_UNVERIFIED_NOTICE_TEXT;
  return null;
}

export function confirmSimulationExportIfNeeded(
  data: Partial<KelasHarianData> | undefined | null,
  actionLabel: string
): boolean {
  if (!needsExportVerificationWarning(data)) {
    return true;
  }
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (isKelasHarianLegacyUnverified(data)) {
      return window.confirm(
        `PERINGATAN VERIFIKASI DATA LAMA:\n\nData untuk ${actionLabel} berasal dari penyimpanan versi lama dan belum terverifikasi apakah merupakan data aktual sekolah atau sisa simulasi.\n\nDisarankan klik "Konfirmasi sebagai Data Aktual" terlebih dahulu bila data ini benar milik kelas Anda.\n\nTetap lanjutkan ekspor? Dokumen hasil akan diberi penanda "${LEGACY_UNVERIFIED_NOTICE_TEXT}".`
      );
    }
    return window.confirm(
      `PERINGATAN DATA SIMULASI:\n\nData untuk ${actionLabel} masih menggunakan 30 siswa contoh/simulasi (Aditia Pratama, dkk.), bukan data aktual kelas Anda.\n\nDisarankan mengimpor daftar siswa asli atau memulai dengan kelas kosong terlebih dahulu.\n\nTetap lanjutkan ekspor? Dokumen hasil akan diberi penanda "${SIMULATION_NOTICE_TEXT}".`
    );
  }
  return true;
}

export function confirmLegacyKelasHarianAsActual(
  profile: SchoolProfile,
  data: KelasHarianData
): KelasHarianData {
  const confirmed: KelasHarianData = {
    ...data,
    isSimulated: false,
    dataSource: 'user_manual',
    verifiedActualAt: new Date().toISOString(),
  };
  saveKelasHarianData(profile, confirmed);
  return confirmed;
}

export function createSeparateDemoDataset(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): KelasHarianData {
  const safeTPList = Array.isArray(tpList) ? tpList : [];
  return createSimulationKelasHarianObject(profile, safeTPList);
}

export function fillEmptyScoreCellsOnly(
  data: KelasHarianData,
  tpList: CustomTPItem[],
  defaultScore: number = 75
): { updated: KelasHarianData; filledCellCount: number } {
  const safeTPList = Array.isArray(tpList) ? tpList : [];
  let filledCellCount = 0;

  const updatedNilai = data.daftarNilai.map((item) => {
    let rowChanged = false;
    const formatif: { [kodeTP: string]: number | null | undefined } = {
      ...(item.nilaiFormatif || {}),
    };
    const usesLegacyKodeKeysOnly =
      safeTPList.some((tp) => tp.kode && typeof formatif[tp.kode] === 'number' && !formatif[tp.id]) &&
      safeTPList.every((tp) => !tp.id || !tp.id.startsWith('tpid_'));

    safeTPList.forEach((tp) => {
      const cur = getFormatifScoreForTP(formatif, tp);
      if (cur === undefined || cur === null || typeof cur !== 'number' || Number.isNaN(cur)) {
        const targetKey = usesLegacyKodeKeysOnly ? tp.kode : getPrimaryFormatifKey(tp);
        formatif[targetKey] = defaultScore;
        filledCellCount++;
        rowChanged = true;
      }
    });

    let sts = item.nilaiSTS;
    if (sts === undefined || sts === null || typeof sts !== 'number' || Number.isNaN(sts)) {
      sts = defaultScore;
      filledCellCount++;
      rowChanged = true;
    }

    let sas = item.nilaiSAS;
    if (sas === undefined || sas === null || typeof sas !== 'number' || Number.isNaN(sas)) {
      sas = defaultScore;
      filledCellCount++;
      rowChanged = true;
    }

    if (!rowChanged) return item;
    const { na, predikat } = computeNilaiAkhir(formatif, sts, sas, safeTPList, data.bobotNilai, item.nilaiPraktik);
    return {
      ...item,
      nilaiFormatif: formatif,
      nilaiSTS: sts,
      nilaiSAS: sas,
      nilaiAkhir: na,
      predikatKKTP: predikat,
      deskripsiRapor: generateAutoDeskripsiRapor(formatif, safeTPList, item.nama, {
        bobotPolicy: data.bobotNilai,
        nilaiSTS: sts,
        nilaiSAS: sas,
        nilaiPraktik: item.nilaiPraktik,
        buktiAsesmenSubTP: item.buktiAsesmenSubTP,
        riwayatRemedial: item.riwayatRemedial,
      }),
    };
  });

  return {
    updated: {
      ...data,
      daftarNilai: updatedNilai,
    },
    filledCellCount,
  };
}

export interface SafeSampleScoreResult {
  updated: KelasHarianData;
  status: 'applied_demo' | 'filled_empty_only' | 'blocked_actual_data' | 'empty_roster';
  filledCellCount: number;
  message: string;
}

export function applySampleScoresSafely(
  data: KelasHarianData,
  tpList: CustomTPItem[],
  options?: { fillEmptyOnly?: boolean }
): SafeSampleScoreResult {
  if (!data.daftarSiswa || data.daftarSiswa.length === 0) {
    return {
      updated: data,
      status: 'empty_roster',
      filledCellCount: 0,
      message: 'Belum ada daftar siswa. Impor siswa atau muat data demo terpisah terlebih dahulu.',
    };
  }

  if (options?.fillEmptyOnly) {
    const { updated, filledCellCount } = fillEmptyScoreCellsOnly(data, tpList);
    return {
      updated,
      status: 'filled_empty_only',
      filledCellCount,
      message:
        filledCellCount > 0
          ? `${filledCellCount} sel nilai yang masih kosong berhasil dilengkapi tanpa menimpa nilai yang sudah ada.`
          : 'Semua sel nilai sudah terisi; tidak ada nilai yang diubah.',
    };
  }

  if (!isKelasHarianSimulated(data)) {
    return {
      updated: data,
      status: 'blocked_actual_data',
      filledCellCount: 0,
      message:
        'Pengisian nilai contoh ditolak agar nilai aktual siswa Anda tidak tertimpa. Gunakan pengisian sel kosong atau buka dataset demo terpisah.',
    };
  }

  const regenerated = generateDefaultNilai(data.daftarSiswa, Array.isArray(tpList) ? tpList : []);
  return {
    updated: {
      ...data,
      isSimulated: true,
      dataSource: 'simulation_demo',
      daftarNilai: regenerated,
    },
    status: 'applied_demo',
    filledCellCount: regenerated.length,
    message: 'Nilai contoh simulasi berhasil dimuat pada dataset demo.',
  };
}

function createSimulationKelasHarianObject(
  profile: SchoolProfile,
  safeTPList: CustomTPItem[]
): KelasHarianData {
  const daftarSiswa: SiswaItem[] = DEFAULT_SISWA_LIST.map((s, idx) => ({
    id: `siswa_${idx + 1}`,
    noUrut: idx + 1,
    nis: s.nis,
    nama: s.nama,
    jenisKelamin: s.jenisKelamin,
  }));

  const daftarPresensi = generateDefaultPresensi(daftarSiswa, 16);
  const daftarJurnal = generateDefaultJurnal(safeTPList, 16);
  const daftarNilai = generateDefaultNilai(daftarSiswa, safeTPList);

  return {
    rombel: profile?.rombelAktif || 'A',
    mataPelajaran: profile?.mataPelajaranUtama || 'Mata Pelajaran',
    semester: profile?.semester || '1 (Ganjil)',
    tahunAjaran: profile?.tahunAjaran || '2026/2027',
    isSimulated: true,
    dataSource: 'simulation_demo',
    daftarSiswa,
    daftarPresensi,
    daftarJurnal,
    daftarNilai,
  };
}

export function createEmptyKelasHarianData(
  profile: SchoolProfile,
  _tpList: CustomTPItem[] = []
): KelasHarianData {
  const emptyPresensi = generateDefaultPresensi([], 16);
  const emptyData: KelasHarianData = {
    rombel: profile?.rombelAktif || 'A',
    mataPelajaran: profile?.mataPelajaranUtama || 'Mata Pelajaran',
    semester: profile?.semester || '1 (Ganjil)',
    tahunAjaran: profile?.tahunAjaran || '2026/2027',
    isSimulated: false,
    dataSource: 'empty_class',
    daftarSiswa: [],
    daftarPresensi: emptyPresensi,
    daftarJurnal: [],
    daftarNilai: [],
  };
  saveKelasHarianData(profile, emptyData);
  return emptyData;
}

export function loadDemoKelasHarianData(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): KelasHarianData {
  const safeTPList = Array.isArray(tpList) ? tpList : [];
  const demo = createSimulationKelasHarianObject(profile, safeTPList);
  saveKelasHarianData(profile, demo);
  return demo;
}

function normalizeStoredKelasHarian(
  parsed: KelasHarianData,
  safeTPList: CustomTPItem[]
): KelasHarianData {
  const inferredSource = resolveKelasHarianDataSource(parsed);
  const inferredSimulated = isKelasHarianSimulated(parsed);
  parsed.dataSource = inferredSource;
  parsed.isSimulated = inferredSimulated;
  const bobot = normalizeBobotKebijakan(parsed.bobotNilai);
  parsed.bobotNilai = bobot;

  if (Array.isArray(parsed.daftarJurnal) && safeTPList.length > 0) {
    parsed.daftarJurnal = parsed.daftarJurnal.map((j) => {
      if (j.tpId && safeTPList.some((t) => t.id === j.tpId)) {
        return j;
      }
      const matched = safeTPList.find(
        (t) =>
          (j.tpId && t.id === j.tpId) ||
          (j.kodeTP && t.kode.trim().toLowerCase() === j.kodeTP.trim().toLowerCase())
      );
      return matched ? { ...j, tpId: matched.id } : j;
    });
  }

  if (parsed.daftarNilai && parsed.daftarNilai.length > 0) {
    parsed.daftarNilai = parsed.daftarNilai.map((item) => {
      let updated = false;
      const formatif: { [kodeTP: string]: number | null | undefined } = {
        ...(item.nilaiFormatif || {}),
      };
      safeTPList.forEach((tp) => {
        const existingScore = getFormatifScoreForTP(formatif, tp);
        const primaryKey = getPrimaryFormatifKey(tp);
        if (existingScore === undefined) {
          // Hanya dataset simulasi yang boleh menambal TP baru dengan nilai contoh 80;
          // dataset aktual harus mempertahankan sel kosong sebagai belum dinilai!
          if (inferredSource === 'simulation_demo') {
            formatif[primaryKey] = 80;
            updated = true;
          }
        } else if (
          tp.id &&
          tp.id.startsWith('tpid_') &&
          formatif[tp.id] === undefined &&
          typeof formatif[tp.kode] === 'number'
        ) {
          formatif[tp.id] = formatif[tp.kode];
          delete formatif[tp.kode];
          updated = true;
        }
      });

      const { na, predikat, statusNilai } = computeNilaiAkhir(
        formatif,
        item.nilaiSTS,
        item.nilaiSAS,
        safeTPList,
        bobot,
        item.nilaiPraktik
      );
      if (item.statusRapor === 'final' && statusNilai === 'lengkap') {
        return updated ? { ...item, nilaiFormatif: formatif } : item;
      }

      if (
        updated ||
        !item.deskripsiRapor ||
        item.nilaiAkhir !== na ||
        item.predikatKKTP !== predikat ||
        item.statusNilai !== statusNilai
      ) {
        return {
          ...item,
          nilaiFormatif: formatif,
          nilaiAkhir: na,
          predikatKKTP: predikat,
          statusNilai,
          statusRapor:
            item.statusRapor === 'final' && statusNilai === 'lengkap'
              ? 'final'
              : statusNilai === 'lengkap'
              ? item.statusRapor && item.statusRapor !== 'belum_lengkap'
                ? item.statusRapor
                : 'draf'
              : 'belum_lengkap',
          deskripsiRapor:
            item.deskripsiRapor && !updated
              ? item.deskripsiRapor
              : generateAutoDeskripsiRapor(formatif, safeTPList, item.nama, {
                  bobotPolicy: bobot,
                  nilaiSTS: item.nilaiSTS,
                  nilaiSAS: item.nilaiSAS,
                  nilaiPraktik: item.nilaiPraktik,
                  buktiAsesmenSubTP: item.buktiAsesmenSubTP,
                  riwayatRemedial: item.riwayatRemedial,
                }),
        };
      }
      return item;
    });
  }
  return parsed;
}

function createInitialDataFromSharedRoster(
  profile: SchoolProfile,
  roster: ReturnType<typeof getClassRosterRecord>,
  safeTPList: CustomTPItem[]
): KelasHarianData {
  if (!roster) {
    return createSimulationKelasHarianObject(profile, safeTPList);
  }
  const daftarSiswa = roster.daftarSiswa;
  const daftarPresensi = generateDefaultPresensi(daftarSiswa, 16);
  // Untuk roster non-simulasi yang sudah diimpor/dibuat manual, jangan mengisi presensi fiktif sakit/izin atau nilai demo lintas mapel
  if (roster.dataSource !== 'simulation_demo') {
    daftarPresensi.forEach((p) => {
      daftarSiswa.forEach((s) => {
        p.statusMap[s.id] = 'H';
      });
    });
  }

  const daftarNilai: NilaiSiswaItem[] =
    roster.dataSource === 'simulation_demo'
      ? generateDefaultNilai(daftarSiswa, safeTPList)
      : daftarSiswa.map((siswa) => {
          const emptyFormatif: { [kodeTP: string]: number } = {};
          return {
            siswaId: siswa.id,
            nama: siswa.nama,
            nis: siswa.nis,
            nisn: siswa.nisn,
            nilaiFormatif: emptyFormatif,
            nilaiSTS: null,
            nilaiSAS: null,
            nilaiPraktik: null,
            nilaiAkhir: null,
            predikatKKTP: 'Belum Dinilai',
            statusNilai: 'belum_dinilai',
            statusRapor: 'belum_lengkap',
            deskripsiRapor: `Data penilaian formatif untuk ${siswa.nama} belum diinput.`,
          };
        });

  const daftarJurnal =
    daftarSiswa.length > 0 ? generateDefaultJurnal(safeTPList, 16) : [];

  return {
    rombel: profile?.rombelAktif || roster.rombel || 'A',
    mataPelajaran: profile?.mataPelajaranUtama || 'Mata Pelajaran',
    semester: profile?.semester || '1 (Ganjil)',
    tahunAjaran: profile?.tahunAjaran || roster.tahunAjaran || '2026/2027',
    isSimulated: roster.dataSource === 'simulation_demo',
    dataSource: roster.dataSource,
    verifiedActualAt: roster.verifiedActualAt,
    archivedSiswa: roster.archivedSiswa || [],
    daftarSiswa,
    daftarPresensi,
    daftarJurnal,
    daftarNilai,
  };
}

export function getKelasHarianData(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): KelasHarianData {
  const safeTPList = Array.isArray(tpList) ? tpList : [];
  const v2Key = buildKelasHarianStorageKeyV2(profile);
  const sharedRoster = getClassRosterRecord(profile);
  const storedV2 = localStorage.getItem(v2Key);

  if (storedV2) {
    try {
      const parsed: KelasHarianData = JSON.parse(storedV2);
      const normalized = normalizeStoredKelasHarian(parsed, safeTPList);
      if (sharedRoster) {
        const { synced, changed } = syncKelasHarianWithClassRoster(
          normalized,
          sharedRoster,
          safeTPList
        );
        if (changed) {
          saveKelasHarianData(profile, synced, { skipRosterSync: true });
          return synced;
        }
      }
      return normalized;
    } catch (e) {
      console.error('Failed to parse v2 kelas harian data:', e);
    }
  }

  // Fallback legacy v1 hanya jika profil tidak menunjuk ke schoolId eksplisit lain
  const ctx = resolveAcademicContext(profile);
  const activePersistedSchoolId = getPersistedActiveSchoolId();
  const allowsLegacyLookup =
    !profile?.schoolId ||
    profile.schoolId === 'sch_local_default' ||
    profile.schoolId === activePersistedSchoolId ||
    ctx.schoolId === activePersistedSchoolId;

  if (allowsLegacyLookup) {
    const legacyKey = getLegacyStorageKey(profile);
    const storedLegacy = localStorage.getItem(legacyKey);
    if (storedLegacy) {
      try {
        const parsed: KelasHarianData = JSON.parse(storedLegacy);
        const normalized = normalizeStoredKelasHarian(parsed, safeTPList);
        if (sharedRoster) {
          const { synced } = syncKelasHarianWithClassRoster(
            normalized,
            sharedRoster,
            safeTPList
          );
          return synced;
        }
        return normalized;
      } catch (e) {
        console.error('Failed to parse legacy kelas harian data:', e);
      }
    }
  }

  if (sharedRoster) {
    const seededFromRoster = createInitialDataFromSharedRoster(
      profile,
      sharedRoster,
      safeTPList
    );
    saveKelasHarianData(profile, seededFromRoster, { skipRosterSync: true });
    return seededFromRoster;
  }

  // Buat data default pertama kali (ditandai eksplisit sebagai simulasi demo)
  const initialData = createSimulationKelasHarianObject(profile, safeTPList);
  saveKelasHarianData(profile, initialData);
  return initialData;
}

export function saveKelasHarianData(
  profile: SchoolProfile,
  data: KelasHarianData,
  options?: { skipRosterSync?: boolean }
): void {
  const v2Key = buildKelasHarianStorageKeyV2(profile);
  try {
    const resolvedSource = resolveKelasHarianDataSource(data);
    const normalized: KelasHarianData = {
      ...data,
      isSimulated: resolvedSource === 'simulation_demo',
      dataSource: resolvedSource,
    };
    localStorage.setItem(v2Key, JSON.stringify(normalized));

    if (!options?.skipRosterSync) {
      saveClassRosterRecord(profile, {
        daftarSiswa: normalized.daftarSiswa || [],
        archivedSiswa: normalized.archivedSiswa,
        isSimulated: Boolean(normalized.isSimulated),
        dataSource: resolvedSource,
        verifiedActualAt: normalized.verifiedActualAt,
      });
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('asesmerdeka:kelas-harian-updated'));
    }
  } catch (e) {
    console.error('Failed to save kelas harian data:', e);
  }
}

export function resetKelasHarianData(profile: SchoolProfile, tpList: CustomTPItem[]): KelasHarianData {
  localStorage.removeItem(buildKelasHarianStorageKeyV2(profile));
  localStorage.removeItem(getLegacyStorageKey(profile));
  return getKelasHarianData(profile, tpList);
}

export function createBlankNilaiItem(
  siswa: SiswaItem,
  tpList: CustomTPItem[]
): NilaiSiswaItem {
  return {
    siswaId: siswa.id,
    nama: siswa.nama,
    nis: siswa.nis,
    nisn: siswa.nisn,
    nilaiFormatif: {},
    nilaiSTS: null,
    nilaiSAS: null,
    nilaiPraktik: null,
    nilaiAkhir: null,
    predikatKKTP: 'Belum Dinilai',
    statusNilai: 'belum_dinilai',
    statusRapor: 'belum_lengkap',
    deskripsiRapor: generateAutoDeskripsiRapor({}, tpList, siswa.nama),
  };
}

export function applyNewStudentRoster(
  currentData: KelasHarianData,
  newStudents: SiswaItem[],
  tpList: CustomTPItem[],
  resetExistingScores: boolean = false,
  options?: {
    source?: 'user_imported' | 'user_manual';
    initializeEmptyScores?: boolean;
  }
): KelasHarianData {
  const safeTPList = Array.isArray(tpList) ? tpList : [];
  const daftarSiswa = newStudents.map((s, idx) => ({
    ...s,
    noUrut: idx + 1,
    statusAktif: s.statusAktif || 'aktif',
  }));

  // Update presensi: ganti penuh dengan daftar siswa baru (pertahankan catatan siswa arsip non-dummy jika ada)
  const archivedIds = new Set((currentData.archivedSiswa || []).map((s) => s.id));
  const updatedPresensi = currentData.daftarPresensi.map((p) => {
    const newStatusMap: { [siswaId: string]: 'H' | 'S' | 'I' | 'A' } = {};
    daftarSiswa.forEach((s) => {
      newStatusMap[s.id] = resetExistingScores ? 'H' : p.statusMap[s.id] || 'H';
    });
    if (!resetExistingScores) {
      archivedIds.forEach((archId) => {
        if (p.statusMap[archId]) {
          newStatusMap[archId] = p.statusMap[archId];
        }
      });
    }
    return {
      ...p,
      statusMap: newStatusMap,
    };
  });

  // Update nilai: ganti penuh dengan daftar siswa baru (hapus semua nilai siswa dummy lama)
  let updatedNilai: NilaiSiswaItem[] = [];
  if (resetExistingScores) {
    updatedNilai = options?.initializeEmptyScores
      ? daftarSiswa.map((s) => createBlankNilaiItem(s, safeTPList))
      : generateDefaultNilai(daftarSiswa, safeTPList);
  } else {
    updatedNilai = daftarSiswa.map((siswa) => {
      // Hanya pertahankan nilai lama jika ID sama ATAU (NIS & Nama sama persis, bukan bentrok NIS dummy)
      const existing = currentData.daftarNilai.find(
        (n) =>
          n.siswaId === siswa.id ||
          (Boolean(siswa.nis) &&
            n.nis === siswa.nis &&
            n.nama.trim().toLowerCase() === siswa.nama.trim().toLowerCase())
      );
      if (existing) {
        return {
          ...existing,
          siswaId: siswa.id,
          nama: siswa.nama,
          nis: siswa.nis,
          nisn: siswa.nisn ?? existing.nisn,
          deskripsiRapor: generateAutoDeskripsiRapor(
            existing.nilaiFormatif || {},
            safeTPList,
            siswa.nama
          ),
        };
      }
      if (options?.initializeEmptyScores) {
        return createBlankNilaiItem(siswa, safeTPList);
      }
      const defaultFormatif: { [kode: string]: number } = {};
      safeTPList.forEach((tp) => {
        defaultFormatif[getPrimaryFormatifKey(tp)] = 80;
      });
      const sts = 80;
      const sas = 80;
      const { na, predikat, statusNilai } = computeNilaiAkhir(
        defaultFormatif,
        sts,
        sas,
        safeTPList,
        currentData.bobotNilai
      );
      return {
        siswaId: siswa.id,
        nama: siswa.nama,
        nis: siswa.nis,
        nisn: siswa.nisn,
        nilaiFormatif: defaultFormatif,
        nilaiSTS: sts,
        nilaiSAS: sas,
        nilaiPraktik: null,
        nilaiAkhir: na,
        predikatKKTP: predikat,
        statusNilai,
        statusRapor: statusNilai === 'lengkap' ? 'draf' : 'belum_lengkap',
        deskripsiRapor: generateAutoDeskripsiRapor(defaultFormatif, safeTPList, siswa.nama),
      };
    });

    // Pertahankan riwayat nilai historis bagi siswa yang diarsipkan / pindah rombel
    const activeIdsAfter = new Set(daftarSiswa.map((s) => s.id));
    (currentData.daftarNilai || []).forEach((n) => {
      if (archivedIds.has(n.siswaId) && !activeIdsAfter.has(n.siswaId)) {
        updatedNilai.push(n);
      }
    });
  }

  // Bersihkan nama siswa dummy pada kolom siswaTidakHadir di Jurnal Mengajar jika masih bawaan default
  const updatedJurnal = (currentData.daftarJurnal || []).map((j) => {
    if (
      j.siswaTidakHadir === 'Andika Bagus (Sakit)' ||
      j.siswaTidakHadir === 'Dimas Arya (Izin)'
    ) {
      return {
        ...j,
        siswaTidakHadir: 'Nihil (Semua Hadir)',
      };
    }
    return j;
  });

  let nextSource: KelasHarianDataSource;
  if (daftarSiswa.length === 0) {
    nextSource = 'empty_class';
  } else if (options?.source === 'user_imported') {
    nextSource = 'user_imported';
  } else if (hasUntouchedDefaultRoster(daftarSiswa) || containsSimulatedDummyStudents(daftarSiswa)) {
    nextSource = 'simulation_demo';
  } else if (currentData.dataSource === 'legacy_unverified') {
    nextSource = 'legacy_unverified';
  } else {
    nextSource = options?.source || 'user_manual';
  }

  return {
    ...currentData,
    isSimulated: nextSource === 'simulation_demo',
    dataSource: nextSource,
    daftarSiswa,
    daftarPresensi: updatedPresensi,
    daftarNilai: updatedNilai,
    daftarJurnal: updatedJurnal,
  };
}

export function filterSiswaRoster(daftarSiswa: SiswaItem[], query: string): SiswaItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return daftarSiswa;
  return daftarSiswa.filter(
    (s) =>
      s.nama.toLowerCase().includes(q) ||
      (s.nis || '').toLowerCase().includes(q) ||
      (s.nisn || '').toLowerCase().includes(q)
  );
}

// ============================================================================
// GELOMBANG B: VALIDASI SISWA, EDIT IDENTITAS, MUTASI ROMBEL, IMPOR TERVALIDASI
// ============================================================================

export function validateStudentInput(
  candidate: { nama: string; nis?: string; nisn?: string; jenisKelamin?: 'L' | 'P' },
  existingStudents: SiswaItem[],
  editingId?: string
): StudentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmedName = (candidate.nama || '').trim();
  const trimmedNis = (candidate.nis || '').trim();
  const trimmedNisn = (candidate.nisn || '').trim();

  if (trimmedName.length < 2) {
    errors.push('Nama lengkap siswa wajib diisi minimal 2 karakter.');
  }

  const others = (existingStudents || []).filter(
    (s) => s.id !== editingId && (s.statusAktif || 'aktif') === 'aktif'
  );

  if (trimmedNis) {
    const dupNis = others.find((s) => (s.nis || '').trim() === trimmedNis);
    if (dupNis) {
      errors.push(`NIS "${trimmedNis}" sudah terdaftar pada siswa "${dupNis.nama}".`);
    }
  }

  if (trimmedNisn) {
    if (!/^\d{10}$/.test(trimmedNisn)) {
      warnings.push(`Format NISN "${trimmedNisn}" umumnya terdiri dari 10 digit angka.`);
    }
    const dupNisn = others.find((s) => (s.nisn || '').trim() === trimmedNisn);
    if (dupNisn) {
      errors.push(`NISN "${trimmedNisn}" sudah terdaftar pada siswa "${dupNisn.nama}".`);
    }
  }

  if (trimmedName.length >= 2) {
    const dupName = others.find(
      (s) => s.nama.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (dupName) {
      warnings.push(
        `Nama "${dupName.nama}" sudah ada di rombel ini (${dupName.nis ? `NIS ${dupName.nis}` : 'tanpa NIS'}). Pastikan ini siswa berbeda.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function updateStudentIdentity(
  currentData: KelasHarianData,
  siswaId: string,
  patch: { nama: string; nis?: string; nisn?: string; jenisKelamin: 'L' | 'P' },
  tpList: CustomTPItem[]
): { updated: KelasHarianData; validation: StudentValidationResult } {
  const validation = validateStudentInput(patch, currentData.daftarSiswa, siswaId);
  if (!validation.valid) {
    return { updated: currentData, validation };
  }

  const cleanNama = patch.nama.trim();
  const cleanNis = (patch.nis ?? '').trim();
  const cleanNisn = patch.nisn !== undefined ? patch.nisn.trim() : undefined;

  const updatedSiswa = currentData.daftarSiswa.map((s) =>
    s.id === siswaId
      ? {
          ...s,
          nama: cleanNama,
          nis: cleanNis,
          nisn: cleanNisn !== undefined ? cleanNisn || undefined : s.nisn,
          jenisKelamin: patch.jenisKelamin,
        }
      : s
  );

  const updatedNilai = currentData.daftarNilai.map((n) => {
    if (n.siswaId !== siswaId) return n;
    return {
      ...n,
      nama: cleanNama,
      nis: cleanNis,
      nisn: cleanNisn !== undefined ? cleanNisn || undefined : n.nisn,
      deskripsiRapor: generateAutoDeskripsiRapor(n.nilaiFormatif || {}, tpList, cleanNama),
    };
  });

  return {
    validation,
    updated: {
      ...currentData,
      daftarSiswa: updatedSiswa,
      daftarNilai: updatedNilai,
      isSimulated: false,
      dataSource:
        currentData.dataSource === 'simulation_demo' || currentData.dataSource === 'empty_class'
          ? 'user_manual'
          : currentData.dataSource,
    },
  };
}

export function transferStudentRombel(
  profile: SchoolProfile,
  currentData: KelasHarianData,
  siswaId: string,
  targetRombel: string,
  tpList: CustomTPItem[],
  options?: { tanggalMutasi?: string; catatanMutasi?: string; mode?: 'transfer' | 'archive' }
): { updated: KelasHarianData; transferredStudent: SiswaItem | null; error?: string } {
  const isArchiveOnly = options?.mode === 'archive' || targetRombel === '__ARCHIVE__';
  const target = (targetRombel || '').trim();
  if (!isArchiveOnly && !target) {
    return { updated: currentData, transferredStudent: null, error: 'Rombel tujuan wajib dipilih.' };
  }
  if (!isArchiveOnly && target.toLowerCase() === (profile.rombelAktif || '').trim().toLowerCase()) {
    return {
      updated: currentData,
      transferredStudent: null,
      error: 'Rombel tujuan tidak boleh sama dengan rombel saat ini.',
    };
  }

  const student = currentData.daftarSiswa.find((s) => s.id === siswaId);
  if (!student) {
    return { updated: currentData, transferredStudent: null, error: 'Siswa tidak ditemukan di rombel ini.' };
  }

  const tanggalMutasi = options?.tanggalMutasi || new Date().toISOString().split('T')[0];
  const archivedRecord: SiswaItem = {
    ...student,
    statusAktif: isArchiveOnly ? 'keluar' : 'pindah_rombel',
    rombelTujuan: isArchiveOnly ? undefined : target,
    tanggalMutasi,
    catatanMutasi:
      options?.catatanMutasi ||
      (isArchiveOnly
        ? `Diarsipkan / nonaktif dari rombel ${profile.rombelAktif}`
        : `Pindah dari ${profile.rombelAktif} ke ${target}`),
  };

  // Pertahankan nilai di daftarNilai & riwayat statusMap pada daftarPresensi, hanya keluarkan dari roster aktif
  const nextActiveSiswa = currentData.daftarSiswa
    .filter((s) => s.id !== siswaId)
    .map((s, idx) => ({ ...s, noUrut: idx + 1 }));

  const nextArchive = [
    ...(currentData.archivedSiswa || []).filter((s) => s.id !== siswaId),
    archivedRecord,
  ];

  const updatedCurrent: KelasHarianData = {
    ...currentData,
    daftarSiswa: nextActiveSiswa,
    archivedSiswa: nextArchive,
    dataSource:
      nextActiveSiswa.length === 0
        ? 'empty_class'
        : currentData.dataSource === 'simulation_demo'
        ? 'user_manual'
        : currentData.dataSource,
    isSimulated: false,
  };
  saveKelasHarianData(profile, updatedCurrent);

  if (isArchiveOnly) {
    return { updated: updatedCurrent, transferredStudent: archivedRecord };
  }

  // Tambahkan siswa dengan ID imutabel yang sama ke roster rombel tujuan (tanpa mencampur 30 siswa simulasi)
  const targetProfile: SchoolProfile = { ...profile, rombelAktif: target };
  const rawTargetData = getKelasHarianData(targetProfile, tpList);
  const targetData =
    rawTargetData.dataSource === 'simulation_demo'
      ? createEmptyKelasHarianData(targetProfile, tpList)
      : rawTargetData;

  const transferredActive: SiswaItem = {
    id: student.id,
    noUrut: targetData.daftarSiswa.length + 1,
    nis: student.nis,
    nisn: student.nisn,
    nama: student.nama,
    jenisKelamin: student.jenisKelamin,
    statusAktif: 'aktif',
    rombelAsal: profile.rombelAktif,
    tanggalMutasi,
    catatanMutasi: options?.catatanMutasi || `Pindahan dari rombel ${profile.rombelAktif}`,
  };

  const mergedTargetSiswa = [
    ...targetData.daftarSiswa.filter((s) => s.id !== student.id),
    transferredActive,
  ].map((s, idx) => ({ ...s, noUrut: idx + 1 }));

  const updatedTarget: KelasHarianData = {
    ...targetData,
    isSimulated: false,
    dataSource: 'user_manual',
    daftarSiswa: mergedTargetSiswa,
    daftarNilai: targetData.daftarNilai.some((n) => n.siswaId === student.id)
      ? targetData.daftarNilai
      : [...targetData.daftarNilai, createBlankNilaiItem(transferredActive, tpList)],
    daftarPresensi: targetData.daftarPresensi.map((p) => ({
      ...p,
      statusMap: {
        ...p.statusMap,
        [student.id]: p.statusMap[student.id] || 'H',
      },
    })),
  };
  saveKelasHarianData(targetProfile, updatedTarget);

  return { updated: updatedCurrent, transferredStudent: transferredActive };
}

export function parseAndValidateStudentImport(
  rawText: string,
  existingStudents: SiswaItem[] = []
): ImportValidationSummary {
  if (!rawText || !rawText.trim()) {
    return {
      totalRows: 0,
      validRows: [],
      duplicateRows: [],
      invalidRows: [],
      allRows: [],
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const allRows: ImportPreviewRow[] = [];
  const seenNisInFile = new Map<string, number>();
  const seenNisnInFile = new Map<string, number>();
  const existingActive = existingStudents.filter((s) => (s.statusAktif || 'aktif') === 'aktif');
  let rowCounter = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      (lower.includes('nama') && (lower.includes('nis') || lower.includes('jk') || lower.includes('l/p'))) ||
      lower.startsWith('no\t') ||
      lower.startsWith('no;') ||
      lower.startsWith('no,')
    ) {
      continue;
    }

    let tokens: string[] = [];
    if (line.includes('\t')) {
      tokens = line.split('\t').map((t) => t.trim());
    } else if (line.includes(';')) {
      tokens = line.split(';').map((t) => t.trim());
    } else if (line.includes(',')) {
      tokens = line.split(',').map((t) => t.trim());
    } else {
      tokens = [line];
    }

    tokens = tokens.filter((t) => t.length > 0);
    if (tokens.length === 0) continue;

    rowCounter++;
    let nis = '';
    let nisn = '';
    let nama = '';
    let jk: 'L' | 'P' = 'L';

    if (tokens.length >= 5) {
      // [No, NIS, NISN, Nama, JK]
      nis = tokens[1];
      nisn = tokens[2];
      nama = tokens[3];
      const rawJK = tokens[4].toUpperCase();
      jk = rawJK.startsWith('P') || rawJK === 'PEREMPUAN' ? 'P' : 'L';
    } else if (tokens.length === 4) {
      // [No, NIS, Nama, JK] atau [NIS, NISN, Nama, JK]
      if (/^\d{10}$/.test(tokens[1])) {
        nis = tokens[0];
        nisn = tokens[1];
        nama = tokens[2];
      } else {
        nis = tokens[1];
        nama = tokens[2];
      }
      const rawJK = tokens[3].toUpperCase();
      jk = rawJK.startsWith('P') || rawJK === 'PEREMPUAN' ? 'P' : 'L';
    } else if (tokens.length === 3) {
      if (tokens[2].toUpperCase() === 'L' || tokens[2].toUpperCase() === 'P' || tokens[2].toUpperCase() === 'PEREMPUAN' || tokens[2].toUpperCase() === 'LAKI-LAKI') {
        nis = tokens[0];
        nama = tokens[1];
        jk = tokens[2].toUpperCase().startsWith('P') ? 'P' : 'L';
      } else {
        nis = tokens[1];
        nama = tokens[2];
      }
    } else if (tokens.length === 2) {
      if (tokens[1].toUpperCase() === 'L' || tokens[1].toUpperCase() === 'P') {
        nama = tokens[0];
        jk = tokens[1].toUpperCase() === 'P' ? 'P' : 'L';
      } else {
        nis = tokens[0];
        nama = tokens[1];
      }
    } else {
      nama = tokens[0];
    }

    nama = nama.replace(/^"|"$/g, '').replace(/^\d+[.)-]\s*/, '').trim();
    nis = nis.replace(/^"|"$/g, '').trim();
    nisn = nisn.replace(/^"|"$/g, '').trim();

    if (/^\d{1,2}$/.test(nis) && Number(nis) <= 60) {
      nis = '';
    }

    const siswa: SiswaItem = {
      id: `siswa_imp_preview_${rowCounter}`,
      noUrut: rowCounter,
      nis,
      nisn: nisn || undefined,
      nama,
      jenisKelamin: jk,
      statusAktif: 'aktif',
    };

    if (!nama || nama.length < 2) {
      allRows.push({
        rowIndex: rowCounter,
        siswa,
        status: 'invalid',
        message: 'Nama siswa kosong atau kurang dari 2 huruf.',
      });
      continue;
    }

    if (nis && seenNisInFile.has(nis)) {
      allRows.push({
        rowIndex: rowCounter,
        siswa,
        status: 'duplicate_in_file',
        message: `NIS "${nis}" ganda di dalam file impor (baris ke-${seenNisInFile.get(nis)}).`,
      });
      continue;
    }

    if (nisn && seenNisnInFile.has(nisn)) {
      allRows.push({
        rowIndex: rowCounter,
        siswa,
        status: 'duplicate_in_file',
        message: `NISN "${nisn}" ganda di dalam file impor (baris ke-${seenNisnInFile.get(nisn)}).`,
      });
      continue;
    }

    if (nis) seenNisInFile.set(nis, rowCounter);
    if (nisn) seenNisnInFile.set(nisn, rowCounter);

    const dupExistingNis = nis ? existingActive.find((s) => (s.nis || '').trim() === nis) : undefined;
    if (dupExistingNis) {
      allRows.push({
        rowIndex: rowCounter,
        siswa,
        status: 'duplicate_nis',
        message: `NIS "${nis}" sudah ada di rombel (${dupExistingNis.nama}).`,
      });
      continue;
    }

    const dupExistingNisn = nisn ? existingActive.find((s) => (s.nisn || '').trim() === nisn) : undefined;
    if (dupExistingNisn) {
      allRows.push({
        rowIndex: rowCounter,
        siswa,
        status: 'duplicate_nisn',
        message: `NISN "${nisn}" sudah ada di rombel (${dupExistingNisn.nama}).`,
      });
      continue;
    }

    allRows.push({
      rowIndex: rowCounter,
      siswa,
      status: 'valid',
    });
  }

  return {
    totalRows: allRows.length,
    validRows: allRows.filter((r) => r.status === 'valid'),
    duplicateRows: allRows.filter(
      (r) =>
        r.status === 'duplicate_nis' ||
        r.status === 'duplicate_nisn' ||
        r.status === 'duplicate_in_file'
    ),
    invalidRows: allRows.filter((r) => r.status === 'invalid'),
    allRows,
  };
}

// ============================================================================
// GELOMBANG C: VALIDASI PRESENSI & JURNAL MENGAJAR + TRACEABILITY TP
// ============================================================================

export function updatePertemuanDate(
  currentData: KelasHarianData,
  pertemuanKe: number,
  newTanggal: string
): { valid: boolean; updated: KelasHarianData; error?: string } {
  const cleanDate = (newTanggal || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return {
      valid: false,
      updated: currentData,
      error: 'Format tanggal pertemuan tidak valid (gunakan YYYY-MM-DD).',
    };
  }

  const dup = currentData.daftarPresensi.find(
    (p) => p.pertemuanKe !== pertemuanKe && (p.tanggal || '').trim() === cleanDate
  );
  if (dup) {
    return {
      valid: false,
      updated: currentData,
      error: `Tanggal ${cleanDate} sudah tercatat pada Pertemuan ${dup.pertemuanKe}.`,
    };
  }

  const nextPresensi = currentData.daftarPresensi.map((p) =>
    p.pertemuanKe === pertemuanKe ? { ...p, tanggal: cleanDate } : p
  );

  return {
    valid: true,
    updated: {
      ...currentData,
      daftarPresensi: nextPresensi,
    },
  };
}

export interface StudentAttendanceRecap {
  siswaId: string;
  nama: string;
  nis: string;
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
  totalPertemuan: number;
  persentaseHadir: number;
}

export function computeAttendanceRecap(
  data: KelasHarianData,
  options?: { monthFilter?: string; includeArchived?: boolean }
): {
  meetings: PresensiPertemuan[];
  perStudent: Record<string, StudentAttendanceRecap>;
  summary: {
    totalH: number;
    totalS: number;
    totalI: number;
    totalA: number;
    totalSlot: number;
    classAvgPct: number;
  };
} {
  const monthFilter = (options?.monthFilter || '').trim();
  const baseMeetings = (data.daftarPresensi || []).slice(0, 16);
  const meetings = monthFilter
    ? baseMeetings.filter((m) => (m.tanggal || '').startsWith(monthFilter))
    : baseMeetings;

  const students = options?.includeArchived
    ? [...(data.daftarSiswa || []), ...(data.archivedSiswa || [])]
    : data.daftarSiswa || [];

  const perStudent: Record<string, StudentAttendanceRecap> = {};
  let totalH = 0;
  let totalS = 0;
  let totalI = 0;
  let totalA = 0;
  let totalSlot = 0;

  students.forEach((siswa) => {
    let h = 0;
    let s = 0;
    let i = 0;
    let a = 0;
    let studentMeetings = 0;

    meetings.forEach((m) => {
      // Bagi siswa yang sudah mutasi keluar pada tanggal X, jangan hitung pertemuan setelah tanggalMutasi
      if (
        siswa.statusAktif &&
        siswa.statusAktif !== 'aktif' &&
        siswa.tanggalMutasi &&
        m.tanggal > siswa.tanggalMutasi &&
        !m.statusMap?.[siswa.id]
      ) {
        return;
      }
      const st = m.statusMap?.[siswa.id] || 'H';
      studentMeetings++;
      totalSlot++;
      if (st === 'H') {
        h++;
        totalH++;
      } else if (st === 'S') {
        s++;
        totalS++;
      } else if (st === 'I') {
        i++;
        totalI++;
      } else if (st === 'A') {
        a++;
        totalA++;
      }
    });

    perStudent[siswa.id] = {
      siswaId: siswa.id,
      nama: siswa.nama,
      nis: siswa.nis,
      hadir: h,
      sakit: s,
      izin: i,
      alfa: a,
      totalPertemuan: studentMeetings,
      persentaseHadir:
        studentMeetings > 0 ? Math.round((h / studentMeetings) * 100) : 100,
    };
  });

  return {
    meetings,
    perStudent,
    summary: {
      totalH,
      totalS,
      totalI,
      totalA,
      totalSlot,
      classAvgPct: totalSlot > 0 ? Math.round((totalH / totalSlot) * 100) : 100,
    },
  };
}

export function syncJurnalAbsentFromPresensi(
  daftarPresensi: PresensiPertemuan[],
  daftarSiswa: SiswaItem[],
  pertemuanKe?: number,
  tanggal?: string
): string {
  const matched =
    (pertemuanKe ? daftarPresensi.find((p) => p.pertemuanKe === pertemuanKe) : undefined) ||
    (tanggal ? daftarPresensi.find((p) => p.tanggal === tanggal) : undefined);

  if (!matched) return 'Nihil (Semua Hadir)';

  const absents: string[] = [];
  daftarSiswa.forEach((siswa) => {
    const st = matched.statusMap?.[siswa.id];
    if (st && st !== 'H') {
      const label = st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : 'Alfa';
      absents.push(`${siswa.nama} (${label})`);
    }
  });

  return absents.length > 0 ? absents.join(', ') : 'Nihil (Semua Hadir)';
}

export function validateJurnalEntry(
  candidate: Partial<JurnalMengajarItem>,
  existingEntries: JurnalMengajarItem[],
  tpList: CustomTPItem[],
  editingId?: string
): { valid: boolean; errors: string[]; resolvedTP?: CustomTPItem } {
  const errors: string[] = [];
  const tanggal = (candidate.tanggal || '').trim();
  const jamKe = (candidate.jamKe || '').trim();
  const materiPokok = (candidate.materiPokok || '').trim();
  const kegiatan = (candidate.kegiatanPembelajaran || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    errors.push('Tanggal pertemuan jurnal wajib diisi dengan format valid (YYYY-MM-DD).');
  }
  if (!jamKe) {
    errors.push('Jam pelajaran (JP) wajib diisi.');
  }
  if (candidate.jumlahJP !== undefined && (candidate.jumlahJP < 1 || candidate.jumlahJP > 12)) {
    errors.push('Alokasi jumlah JP per pertemuan harus antara 1 sampai 12 JP.');
  }
  if (!materiPokok) {
    errors.push('Materi pokok pada jurnal wajib diisi.');
  }
  if (!kegiatan || kegiatan.length < 5) {
    errors.push('Uraian kegiatan pembelajaran wajib diisi minimal 5 karakter.');
  }

  const dup = existingEntries.find(
    (j) =>
      j.id !== editingId &&
      (j.tanggal || '').trim() === tanggal &&
      (j.jamKe || '').trim().toLowerCase() === jamKe.toLowerCase()
  );
  if (dup) {
    errors.push(
      `Jurnal untuk tanggal ${tanggal} jam "${jamKe}" sudah tercatat pada Pertemuan ${dup.pertemuanKe}.`
    );
  }

  const resolvedTP = tpList.find(
    (t) =>
      (candidate.tpId && t.id === candidate.tpId) ||
      (candidate.kodeTP && t.kode === candidate.kodeTP)
  );

  return {
    valid: errors.length === 0,
    errors,
    resolvedTP,
  };
}

// ============================================================================
// GELOMBANG D & E: RINGKASAN NILAI KELAS, e-RAPOR TERINTEGRASI & FINALIZATION GUARD
// ============================================================================

export interface ClassGradeSummary {
  totalSiswa: number;
  gradedCount: number;
  completeCount: number;
  belumDinilaiCount: number;
  avgKelas: number | null;
  totalSangatBaik: number;
  totalBaik: number;
  totalCukup: number;
  totalPerluBimbingan: number;
  kktpMinTuntas: number;
  totalTercapai: number;
  totalBelumTuntas: number;
  persentaseTercapai: number | null;
}

export function computeClassGradeSummary(
  daftarNilai: NilaiSiswaItem[],
  tpList: CustomTPItem[],
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null
): ClassGradeSummary {
  const normalizedBobot = normalizeBobotKebijakan(bobotPolicy);
  const kktpMinTuntas = normalizedBobot.kktpMinTuntas ?? DEFAULT_KKTP_MIN_TUNTAS;
  let gradedCount = 0;
  let completeCount = 0;
  let belumDinilaiCount = 0;
  let sumNA = 0;
  let totalSangatBaik = 0;
  let totalBaik = 0;
  let totalCukup = 0;
  let totalPerluBimbingan = 0;
  let totalTercapai = 0;
  let totalBelumTuntas = 0;

  daftarNilai.forEach((item) => {
    const res = computeNilaiAkhir(
      item.nilaiFormatif || {},
      item.nilaiSTS,
      item.nilaiSAS,
      tpList,
      normalizedBobot,
      item.nilaiPraktik
    );
    if (res.statusNilai === 'belum_dinilai' || res.na === null) {
      belumDinilaiCount++;
      return;
    }
    gradedCount++;
    if (res.statusNilai === 'lengkap') completeCount++;
    sumNA += res.na;
    if (res.na >= kktpMinTuntas) totalTercapai++;
    else totalBelumTuntas++;

    if (res.predikat === 'Sangat Baik') totalSangatBaik++;
    else if (res.predikat === 'Baik') totalBaik++;
    else if (res.predikat === 'Cukup') totalCukup++;
    else if (res.predikat === 'Perlu Bimbingan') totalPerluBimbingan++;
  });

  return {
    totalSiswa: daftarNilai.length,
    gradedCount,
    completeCount,
    belumDinilaiCount,
    avgKelas: gradedCount > 0 ? Math.round(sumNA / gradedCount) : null,
    totalSangatBaik,
    totalBaik,
    totalCukup,
    totalPerluBimbingan,
    kktpMinTuntas,
    totalTercapai,
    totalBelumTuntas,
    persentaseTercapai: gradedCount > 0 ? Math.round((totalTercapai / gradedCount) * 100) : null,
  };
}

export interface ERaporStudentSummary {
  siswaId: string;
  nama: string;
  nis: string;
  nisn?: string;
  nilaiAkhir: number | null;
  predikatKKTP: PredikatKKTP;
  statusNilai: StatusKelengkapanNilai;
  statusRapor: StatusFinalisasiRapor;
  missingComponents: string[];
  canFinalize: boolean;
  deskripsiRapor: string;
  catatanGuru: string;
  kehadiran: {
    hadir: number;
    sakit: number;
    izin: number;
    alfa: number;
    persentaseHadir: number;
  };
}

export function computeERaporStudentSummary(
  siswa: SiswaItem | undefined,
  nilaiItem: NilaiSiswaItem,
  daftarPresensi: PresensiPertemuan[],
  tpList: CustomTPItem[],
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null
): ERaporStudentSummary {
  const bobot = normalizeBobotKebijakan(bobotPolicy);
  const res = computeNilaiAkhir(
    nilaiItem.nilaiFormatif || {},
    nilaiItem.nilaiSTS,
    nilaiItem.nilaiSAS,
    tpList,
    bobot,
    nilaiItem.nilaiPraktik
  );

  const missingComponents: string[] = [];
  if (bobot.bobotFormatif > 0) {
    tpList.forEach((tp) => {
      if (getFormatifScoreForTP(nilaiItem.nilaiFormatif, tp) === undefined) {
        missingComponents.push(`Formatif ${tp.kode}`);
      }
    });
  }
  if (bobot.bobotSTS > 0 && (nilaiItem.nilaiSTS === null || nilaiItem.nilaiSTS === undefined)) {
    missingComponents.push('STS');
  }
  if (bobot.bobotSAS > 0 && (nilaiItem.nilaiSAS === null || nilaiItem.nilaiSAS === undefined)) {
    missingComponents.push('SAS');
  }
  if (
    (bobot.bobotPraktik ?? 0) > 0 &&
    (nilaiItem.nilaiPraktik === null || nilaiItem.nilaiPraktik === undefined)
  ) {
    missingComponents.push('Praktik');
  }

  let hadir = 0;
  let sakit = 0;
  let izin = 0;
  let alfa = 0;
  const activeMeetings = (daftarPresensi || []).slice(0, 16);
  activeMeetings.forEach((p) => {
    const st = p.statusMap?.[nilaiItem.siswaId] || 'H';
    if (st === 'H') hadir++;
    else if (st === 'S') sakit++;
    else if (st === 'I') izin++;
    else if (st === 'A') alfa++;
  });
  const totalMeet = activeMeetings.length;
  const persentaseHadir = totalMeet > 0 ? Math.round((hadir / totalMeet) * 100) : 100;

  const trimmedDesc = (nilaiItem.deskripsiRapor || '').trim();
  const hasPlaceholderDesc =
    trimmedDesc.includes('belum diinput') || trimmedDesc.includes('belum memiliki nilai tercatat');
  const canFinalize =
    res.statusNilai === 'lengkap' &&
    missingComponents.length === 0 &&
    trimmedDesc.length >= 15 &&
    !hasPlaceholderDesc;

  let statusRapor: StatusFinalisasiRapor;
  if (!canFinalize) {
    statusRapor = 'belum_lengkap';
  } else if (nilaiItem.statusRapor === 'final') {
    statusRapor = 'final';
  } else if (nilaiItem.statusRapor === 'siap_diperiksa') {
    statusRapor = 'siap_diperiksa';
  } else {
    statusRapor = 'draf';
  }

  return {
    siswaId: nilaiItem.siswaId,
    nama: siswa?.nama || nilaiItem.nama,
    nis: siswa?.nis || nilaiItem.nis,
    nisn: siswa?.nisn || nilaiItem.nisn,
    nilaiAkhir: res.na,
    predikatKKTP: res.predikat,
    statusNilai: res.statusNilai,
    statusRapor,
    missingComponents,
    canFinalize,
    deskripsiRapor:
      trimmedDesc ||
      generateAutoDeskripsiRapor(nilaiItem.nilaiFormatif || {}, tpList, nilaiItem.nama, {
        bobotPolicy: bobot,
        nilaiSTS: nilaiItem.nilaiSTS,
        nilaiSAS: nilaiItem.nilaiSAS,
        nilaiPraktik: nilaiItem.nilaiPraktik,
        buktiAsesmenSubTP: nilaiItem.buktiAsesmenSubTP,
        riwayatRemedial: nilaiItem.riwayatRemedial,
      }),
    catatanGuru: nilaiItem.catatanGuru || '',
    kehadiran: {
      hadir,
      sakit,
      izin,
      alfa,
      persentaseHadir,
    },
  };
}

export function finalizeERaporStudent(
  nilaiItem: NilaiSiswaItem,
  daftarPresensi: PresensiPertemuan[],
  tpList: CustomTPItem[],
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null
): { success: boolean; updated: NilaiSiswaItem; message: string } {
  const summary = computeERaporStudentSummary(
    undefined,
    nilaiItem,
    daftarPresensi,
    tpList,
    bobotPolicy
  );

  if (!summary.canFinalize) {
    const reason =
      summary.missingComponents.length > 0
        ? `Komponen belum lengkap: ${summary.missingComponents.join(', ')}.`
        : 'Deskripsi capaian e-Rapor masih kosong atau belum final.';
    return {
      success: false,
      updated: {
        ...nilaiItem,
        statusNilai: summary.statusNilai,
        statusRapor: 'belum_lengkap',
      },
      message: `Gagal finalisasi e-Rapor ${nilaiItem.nama}: ${reason}`,
    };
  }

  return {
    success: true,
    updated: {
      ...nilaiItem,
      nilaiAkhir: summary.nilaiAkhir,
      predikatKKTP: summary.predikatKKTP,
      statusNilai: 'lengkap',
      statusRapor: 'final',
      finalizedAt: new Date().toISOString(),
    },
    message: `e-Rapor ${nilaiItem.nama} berhasil difinalisasi.`,
  };
}

export function finalizeClassERapor(
  currentData: KelasHarianData,
  tpList: CustomTPItem[]
): {
  updated: KelasHarianData;
  finalizedCount: number;
  blockedStudents: { nama: string; missingComponents: string[] }[];
} {
  let finalizedCount = 0;
  const blockedStudents: { nama: string; missingComponents: string[] }[] = [];
  const activeIds = new Set((currentData.daftarSiswa || []).map((s) => s.id));

  const updatedNilai = currentData.daftarNilai.map((item) => {
    if (!activeIds.has(item.siswaId)) {
      return item;
    }
    const summary = computeERaporStudentSummary(
      currentData.daftarSiswa.find((s) => s.id === item.siswaId),
      item,
      currentData.daftarPresensi,
      tpList,
      currentData.bobotNilai
    );
    if (!summary.canFinalize) {
      blockedStudents.push({
        nama: item.nama,
        missingComponents:
          summary.missingComponents.length > 0
            ? summary.missingComponents
            : ['Deskripsi rapor belum diisi'],
      });
      return {
        ...item,
        statusNilai: summary.statusNilai,
        statusRapor: 'belum_lengkap' as const,
      };
    }
    finalizedCount++;
    return {
      ...item,
      nilaiAkhir: summary.nilaiAkhir,
      predikatKKTP: summary.predikatKKTP,
      statusNilai: 'lengkap' as const,
      statusRapor: 'final' as const,
      finalizedAt: new Date().toISOString(),
    };
  });

  return {
    updated: {
      ...currentData,
      daftarNilai: updatedNilai,
    },
    finalizedCount,
    blockedStudents,
  };
}
