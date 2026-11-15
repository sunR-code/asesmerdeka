import type { KelasHarianData } from '../types/kelasHarian';
import type { CustomTPItem, SchoolProfile } from './schoolProfileStorage';
import {
  isKelasHarianLegacyUnverified,
  isKelasHarianSimulated,
} from './kelasHarianStorage';
import {
  buildSupervisiStorageKeyV2,
  getPersistedActiveSchoolId,
} from './storageIdentity';
import { countSavedDraftsForTPList } from './perangkatDraftStorage';

export type SupervisiItemStatus =
  | 'belum_diperiksa'
  | 'ada'
  | 'tidak_ada'
  | 'perlu_perbaikan';

export const SUPERVISI_STATUS_LABELS: Record<SupervisiItemStatus, string> = {
  belum_diperiksa: 'Belum diperiksa',
  ada: 'Ada',
  tidak_ada: 'Tidak ada',
  perlu_perbaikan: 'Perlu perbaikan',
};

export interface SupervisiDocumentDefinition {
  id: number;
  kode: string;
  nama: string;
  kategori: string;
  deskripsi: string;
  tag: string;
  zipFileName: string;
}

export const SUPERVISI_DOCUMENT_DEFINITIONS: SupervisiDocumentDefinition[] = [
  {
    id: 1,
    kode: '01',
    nama: 'Identitas dan Perangkat Administrasi',
    kategori: 'Administrasi Utama',
    deskripsi:
      'Cover portofolio, identitas sekolah & guru, lembar pengesahan, ringkasan status perangkat, serta instrumen telaah pengawas.',
    tag: 'Identitas & Telaah',
    zipFileName: '01_Identitas_dan_Perangkat_Administrasi.docx',
  },
  {
    id: 2,
    kode: '02',
    nama: 'Referensi Capaian dan Tujuan Pembelajaran',
    kategori: 'Kurikulum & CP/TP',
    deskripsi:
      'Capaian Pembelajaran (CP) fase acuan kurikulum dan daftar seluruh Tujuan Pembelajaran (TP) aktif beserta alokasi JP.',
    tag: 'Referensi CP & TP',
    zipFileName: '02_Referensi_Capaian_dan_Tujuan_Pembelajaran.docx',
  },
  {
    id: 3,
    kode: '03',
    nama: 'Alur Tujuan Pembelajaran (ATP)',
    kategori: 'Perangkat Persiapan',
    deskripsi:
      'Matriks lengkap No, Kode TP, Elemen, Lingkup Materi, TP, JP, Profil Pelajar Pancasila, dan Rencana Asesmen.',
    tag: 'ATP Lengkap',
    zipFileName: '03_Alur_Tujuan_Pembelajaran_ATP.docx',
  },
  {
    id: 4,
    kode: '04',
    nama: 'Program Tahunan (Prota)',
    kategori: 'Perangkat Persiapan',
    deskripsi:
      'Distribusi jam pelajaran per lingkup materi Semester 1 (Ganjil) dan Semester 2 (Genap) lengkap dengan rekap JP tahunan.',
    tag: 'Prota Tahunan',
    zipFileName: '04_Program_Tahunan_Prota.docx',
  },
  {
    id: 5,
    kode: '05',
    nama: 'Program Semester (Promes)',
    kategori: 'Perangkat Persiapan',
    deskripsi:
      'Matriks sebaran JP per minggu efektif semester aktif beserta penanda minggu asesmen dan kalender non-efektif.',
    tag: 'Promes Visual',
    zipFileName: '05_Program_Semester_Promes.docx',
  },
  {
    id: 6,
    kode: '06',
    nama: 'Modul Ajar',
    kategori: 'Perangkat Pembelajaran',
    deskripsi:
      'Modul Ajar/RPP berdiferensiasi dan lampiran LKPD kontekstual berdasarkan TP semester aktif.',
    tag: 'Modul Ajar & LKPD',
    zipFileName: '06_Modul_Ajar.docx',
  },
  {
    id: 7,
    kode: '07',
    nama: 'Presensi',
    kategori: 'Administrasi Harian',
    deskripsi:
      'Daftar presensi per pertemuan dengan rekap Hadir (H), Sakit (S), Izin (I), Alfa (A), dan persentase kehadiran siswa.',
    tag: 'Presensi H/S/I/A',
    zipFileName: '07_Daftar_Presensi_Siswa.docx',
  },
  {
    id: 8,
    kode: '08',
    nama: 'Jurnal Mengajar',
    kategori: 'Administrasi Harian',
    deskripsi:
      'Agenda mengajar harian guru per pertemuan mencakup materi/TP, uraian kegiatan, ketidakhadiran, dan catatan refleksi.',
    tag: 'Jurnal Guru',
    zipFileName: '08_Jurnal_Mengajar_Guru.docx',
  },
  {
    id: 9,
    kode: '09',
    nama: 'Buku Nilai dan e-Rapor',
    kategori: 'Administrasi Penilaian',
    deskripsi:
      'Daftar nilai Formatif per TP, STS, SAS, Nilai Akhir, predikat KKTP, serta rekapitulasi deskripsi capaian e-Rapor.',
    tag: 'Nilai & e-Rapor',
    zipFileName: '09_Buku_Nilai_dan_eRapor.docx',
  },
];

export interface SupervisiChecklistItemState {
  id: number;
  kode: string;
  komponen: string;
  status: SupervisiItemStatus;
  skor: number | null;
  catatan: string;
  rekomendasi: string;
  tindakLanjut: string;
}

export interface SupervisiInstrumentData {
  namaPengawas: string;
  nipPengawas: string;
  jabatanPengawas: string;
  tanggalSupervisi: string;
  catatanUmum: string;
  rekomendasiUmum: string;
  tindakLanjutUmum: string;
  items: SupervisiChecklistItemState[];
  updatedAt?: string;
}

export interface SupervisiEvaluationSummary {
  totalKomponen: number;
  jumlahDiperiksa: number;
  jumlahDinilai: number;
  jumlahAda: number;
  jumlahPerluPerbaikan: number;
  jumlahTidakAda: number;
  jumlahBelumDiperiksa: number;
  skorTerkumpul: number;
  skorMaksimalDiperiksa: number;
  skorMaksimalTotal: number;
  persentaseDinilai: number | null;
  isPenilaianLengkap: boolean;
  predikat: string | null;
  alasanBelumLengkap: string | null;
}

export interface SupervisiReadinessItem {
  id: number;
  kode: string;
  nama: string;
  tersedia: boolean;
  ringkasan: string;
  perluPerhatianData: boolean;
}

export function getLegacySupervisiStorageKey(profile: SchoolProfile): string {
  const cleanSchool = (profile.namaSekolah || 'sekolah').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanMapel = (profile.mataPelajaranUtama || 'mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKelas = (profile.kelasUtama || '7').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanRombel = (profile.rombelAktif || 'A').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSemester = (profile.semester || '1').includes('2') ? 'sem2' : 'sem1';
  return `asesmerdeka_supervisi_${cleanSchool}_${cleanMapel}_${cleanKelas}_${cleanRombel}_${cleanSemester}`;
}

export function getSupervisiStorageKey(profile: SchoolProfile): string {
  return buildSupervisiStorageKeyV2(profile);
}

export function createDefaultSupervisiInstrumentData(): SupervisiInstrumentData {
  return {
    namaPengawas: '',
    nipPengawas: '',
    jabatanPengawas: 'Kepala Sekolah / Pengawas Pembina',
    tanggalSupervisi: '',
    catatanUmum: '',
    rekomendasiUmum: '',
    tindakLanjutUmum: '',
    items: SUPERVISI_DOCUMENT_DEFINITIONS.map((def) => ({
      id: def.id,
      kode: def.kode,
      komponen: def.nama,
      status: 'belum_diperiksa',
      skor: null,
      catatan: '',
      rekomendasi: '',
      tindakLanjut: '',
    })),
  };
}

function normalizeSupervisiStatus(raw: unknown): SupervisiItemStatus {
  if (
    raw === 'belum_diperiksa' ||
    raw === 'ada' ||
    raw === 'tidak_ada' ||
    raw === 'perlu_perbaikan'
  ) {
    return raw;
  }
  return 'belum_diperiksa';
}

function normalizeSupervisiScore(
  rawScore: unknown,
  status: SupervisiItemStatus
): number | null {
  if (status === 'belum_diperiksa') return null;
  if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) return null;
  if (rawScore <= 0) return 0;
  if (rawScore >= 2) return 2;
  return 1;
}

export function normalizeSupervisiInstrumentData(
  raw?: Partial<SupervisiInstrumentData> | null
): SupervisiInstrumentData {
  const defaults = createDefaultSupervisiInstrumentData();
  if (!raw || typeof raw !== 'object') return defaults;

  const incomingMap = new Map<number, Partial<SupervisiChecklistItemState>>();
  if (Array.isArray(raw.items)) {
    raw.items.forEach((it) => {
      if (it && typeof it.id === 'number') {
        incomingMap.set(it.id, it);
      }
    });
  }

  return {
    namaPengawas: typeof raw.namaPengawas === 'string' ? raw.namaPengawas : '',
    nipPengawas: typeof raw.nipPengawas === 'string' ? raw.nipPengawas : '',
    jabatanPengawas:
      typeof raw.jabatanPengawas === 'string' && raw.jabatanPengawas.trim()
        ? raw.jabatanPengawas
        : defaults.jabatanPengawas,
    tanggalSupervisi: typeof raw.tanggalSupervisi === 'string' ? raw.tanggalSupervisi : '',
    catatanUmum: typeof raw.catatanUmum === 'string' ? raw.catatanUmum : '',
    rekomendasiUmum: typeof raw.rekomendasiUmum === 'string' ? raw.rekomendasiUmum : '',
    tindakLanjutUmum: typeof raw.tindakLanjutUmum === 'string' ? raw.tindakLanjutUmum : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    items: defaults.items.map((defItem) => {
      const match = incomingMap.get(defItem.id);
      if (!match) return defItem;
      const status = normalizeSupervisiStatus(match.status);
      return {
        ...defItem,
        status,
        skor: normalizeSupervisiScore(match.skor, status),
        catatan: typeof match.catatan === 'string' ? match.catatan : '',
        rekomendasi: typeof match.rekomendasi === 'string' ? match.rekomendasi : '',
        tindakLanjut: typeof match.tindakLanjut === 'string' ? match.tindakLanjut : '',
      };
    }),
  };
}

export function getSupervisiInstrumentData(
  profile: SchoolProfile
): SupervisiInstrumentData {
  if (typeof localStorage === 'undefined') {
    return createDefaultSupervisiInstrumentData();
  }
  const key = getSupervisiStorageKey(profile);
  let raw = localStorage.getItem(key);
  if (!raw) {
    const activeSchoolId = getPersistedActiveSchoolId();
    const allowsLegacy = !profile.schoolId || profile.schoolId === activeSchoolId || profile.schoolId === 'sch_local_default';
    if (allowsLegacy) {
      raw = localStorage.getItem(getLegacySupervisiStorageKey(profile));
    }
  }
  if (!raw) return createDefaultSupervisiInstrumentData();
  try {
    const parsed = JSON.parse(raw) as Partial<SupervisiInstrumentData>;
    return normalizeSupervisiInstrumentData(parsed);
  } catch {
    return createDefaultSupervisiInstrumentData();
  }
}

export function saveSupervisiInstrumentData(
  profile: SchoolProfile,
  data: SupervisiInstrumentData
): SupervisiInstrumentData {
  const normalized: SupervisiInstrumentData = {
    ...normalizeSupervisiInstrumentData(data),
    updatedAt: new Date().toISOString(),
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(getSupervisiStorageKey(profile), JSON.stringify(normalized));
    } catch {
      // ignore storage quota errors
    }
  }
  return normalized;
}

export function resetSupervisiInstrumentData(
  profile: SchoolProfile
): SupervisiInstrumentData {
  const fresh = createDefaultSupervisiInstrumentData();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(getSupervisiStorageKey(profile));
    } catch {
      // ignore storage errors
    }
  }
  return fresh;
}

export function evaluateSupervisiInstrument(
  instrument: SupervisiInstrumentData
): SupervisiEvaluationSummary {
  const items = instrument.items || [];
  const totalKomponen = items.length || SUPERVISI_DOCUMENT_DEFINITIONS.length;
  const skorMaksimalTotal = totalKomponen * 2;

  let jumlahDiperiksa = 0;
  let jumlahDinilai = 0;
  let jumlahAda = 0;
  let jumlahPerluPerbaikan = 0;
  let jumlahTidakAda = 0;
  let jumlahBelumDiperiksa = 0;
  let skorTerkumpul = 0;

  items.forEach((item) => {
    if (item.status === 'belum_diperiksa') {
      jumlahBelumDiperiksa += 1;
      return;
    }
    jumlahDiperiksa += 1;
    if (item.status === 'ada') jumlahAda += 1;
    else if (item.status === 'perlu_perbaikan') jumlahPerluPerbaikan += 1;
    else if (item.status === 'tidak_ada') jumlahTidakAda += 1;

    if (typeof item.skor === 'number' && !Number.isNaN(item.skor)) {
      jumlahDinilai += 1;
      skorTerkumpul += item.skor;
    }
  });

  const skorMaksimalDiperiksa = jumlahDinilai * 2;
  const persentaseDinilai =
    jumlahDinilai > 0 ? Math.round((skorTerkumpul / skorMaksimalDiperiksa) * 100) : null;

  const isPenilaianLengkap =
    totalKomponen > 0 &&
    jumlahBelumDiperiksa === 0 &&
    jumlahDiperiksa === totalKomponen &&
    jumlahDinilai === totalKomponen;

  let predikat: string | null = null;
  let alasanBelumLengkap: string | null = null;

  if (!isPenilaianLengkap) {
    if (jumlahDinilai === 0 && jumlahDiperiksa === 0) {
      alasanBelumLengkap = 'Belum ada komponen yang diperiksa oleh pengawas.';
    } else {
      alasanBelumLengkap = `Baru ${jumlahDinilai}/${totalKomponen} komponen memiliki status dan skor telaah.`;
    }
  } else {
    const finalPct = Math.round((skorTerkumpul / skorMaksimalTotal) * 100);
    if (finalPct >= 90) predikat = 'Amat Baik (A)';
    else if (finalPct >= 75) predikat = 'Baik (B)';
    else if (finalPct >= 60) predikat = 'Cukup (C)';
    else predikat = 'Perlu Pembinaan (D)';
  }

  return {
    totalKomponen,
    jumlahDiperiksa,
    jumlahDinilai,
    jumlahAda,
    jumlahPerluPerbaikan,
    jumlahTidakAda,
    jumlahBelumDiperiksa,
    skorTerkumpul,
    skorMaksimalDiperiksa,
    skorMaksimalTotal,
    persentaseDinilai,
    isPenilaianLengkap,
    predikat,
    alasanBelumLengkap,
  };
}

export function getSupervisiDocumentsReadiness(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  kelasHarian: KelasHarianData
): SupervisiReadinessItem[] {
  const hasSchoolIdentity = Boolean(
    profile.namaSekolah?.trim() && profile.namaGuru?.trim()
  );
  const tpCount = tpList.length;
  const studentCount = kelasHarian.daftarSiswa.length;
  const meetingCount = kelasHarian.daftarPresensi.length;
  const journalCount = kelasHarian.daftarJurnal.length;
  const isSimulated = isKelasHarianSimulated(kelasHarian);
  const isLegacy = isKelasHarianLegacyUnverified(kelasHarian);
  const hasDailyWarning = isSimulated || isLegacy;

  const nilaiTerisiCount = kelasHarian.daftarNilai.filter(
    (n) =>
      Object.values(n.nilaiFormatif || {}).some(
        (v) => typeof v === 'number' && !Number.isNaN(v)
      ) ||
      (typeof n.nilaiSTS === 'number' && !Number.isNaN(n.nilaiSTS)) ||
      (typeof n.nilaiSAS === 'number' && !Number.isNaN(n.nilaiSAS))
  ).length;

  const deskripsiCount = kelasHarian.daftarNilai.filter(
    (n) => Boolean(n.deskripsiRapor && n.deskripsiRapor.trim())
  ).length;

  const draftStats = countSavedDraftsForTPList(profile, tpList);
  const modulAjarSummary =
    tpCount === 0
      ? 'Belum tersedia karena daftar TP kosong'
      : draftStats.modulSavedCount > 0 || draftStats.lkpdSavedCount > 0
      ? `Draf tersimpan guru/AI: ${draftStats.modulSavedCount}/${tpCount} Modul Ajar · ${draftStats.lkpdSavedCount}/${tpCount} LKPD`
      : `0/${tpCount} disunting guru — memakai template bawaan sistem`;

  const dailyFlagLabel = isSimulated
    ? ' (data simulasi)'
    : isLegacy
    ? ' (data lama belum diverifikasi)'
    : '';

  return [
    {
      id: 1,
      kode: '01',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[0].nama,
      tersedia: hasSchoolIdentity,
      ringkasan: hasSchoolIdentity
        ? `${profile.namaSekolah} · Guru: ${profile.namaGuru}`
        : 'Identitas sekolah atau nama guru belum lengkap',
      perluPerhatianData: !hasSchoolIdentity,
    },
    {
      id: 2,
      kode: '02',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[1].nama,
      tersedia: tpCount > 0,
      ringkasan:
        tpCount > 0
          ? `${tpCount} Tujuan Pembelajaran aktif`
          : 'Belum ada TP aktif untuk semester ini',
      perluPerhatianData: tpCount === 0,
    },
    {
      id: 3,
      kode: '03',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[2].nama,
      tersedia: tpCount > 0,
      ringkasan:
        tpCount > 0
          ? `${tpCount} alur TP tersusun`
          : 'Belum tersedia karena daftar TP kosong',
      perluPerhatianData: tpCount === 0,
    },
    {
      id: 4,
      kode: '04',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[3].nama,
      tersedia: tpCount > 0,
      ringkasan:
        tpCount > 0
          ? `Distribusi tahunan dari ${tpCount} TP`
          : 'Belum tersedia karena daftar TP kosong',
      perluPerhatianData: tpCount === 0,
    },
    {
      id: 5,
      kode: '05',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[4].nama,
      tersedia: tpCount > 0,
      ringkasan:
        tpCount > 0
          ? `Pemetaan minggu efektif dari ${tpCount} TP`
          : 'Belum tersedia karena daftar TP kosong',
      perluPerhatianData: tpCount === 0,
    },
    {
      id: 6,
      kode: '06',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[5].nama,
      tersedia: tpCount > 0,
      ringkasan: modulAjarSummary,
      perluPerhatianData: tpCount === 0,
    },
    {
      id: 7,
      kode: '07',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[6].nama,
      tersedia: studentCount > 0 && meetingCount > 0,
      ringkasan:
        studentCount > 0
          ? `${studentCount} siswa · ${meetingCount} pertemuan${dailyFlagLabel}`
          : 'Kelas masih kosong (0 siswa)',
      perluPerhatianData: studentCount === 0 || hasDailyWarning,
    },
    {
      id: 8,
      kode: '08',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[7].nama,
      tersedia: journalCount > 0,
      ringkasan:
        journalCount > 0
          ? `${journalCount} agenda pertemuan${dailyFlagLabel}`
          : 'Belum ada entri jurnal mengajar',
      perluPerhatianData: journalCount === 0 || hasDailyWarning,
    },
    {
      id: 9,
      kode: '09',
      nama: SUPERVISI_DOCUMENT_DEFINITIONS[8].nama,
      tersedia: studentCount > 0 && (nilaiTerisiCount > 0 || deskripsiCount > 0),
      ringkasan:
        studentCount > 0
          ? `${nilaiTerisiCount}/${studentCount} nilai terisi · ${deskripsiCount} deskripsi rapor${dailyFlagLabel}`
          : 'Kelas masih kosong (0 siswa)',
      perluPerhatianData:
        studentCount === 0 || nilaiTerisiCount === 0 || hasDailyWarning,
    },
  ];
}
