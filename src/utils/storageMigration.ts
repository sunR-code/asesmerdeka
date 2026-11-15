import type {
  KelasHarianData,
  KelasHarianDataSource,
} from '../types/kelasHarian';
import type {
  LKPDDokumen,
  LKPDPresetType,
  ModulAjarDokumen,
} from '../types/perangkatAjar';
import {
  getSchoolProfile,
  jenjangToDefaultFase,
  saveCustomTPList,
  saveSchoolProfile,
  type CustomTPItem,
  type SchoolProfile,
} from './schoolProfileStorage';
import { getSemesterCurriculumPlan } from './kurikulumCatalog';
import {
  buildCustomTPScopeKey,
  buildKelasHarianStorageKeyV2,
  buildLKPDDraftStorageKey,
  buildModulAjarDraftStorageKey,
  buildRosterStorageKey,
  buildSupervisiStorageKeyV2,
  createImmutableDefaultTPId,
  deriveDefaultFase,
  generateNewSchoolId,
  getPersistedActiveSchoolId,
} from './storageIdentity';
import {
  areRostersEquivalent,
  getClassRosterRecord,
  saveClassRosterRecord,
} from './rosterStorage';
import {
  resolveKelasHarianDataSource,
  setFormatifScoreForTP,
} from './kelasHarianStorage';
import {
  saveLKPDDraft,
  saveModulAjarDraft,
} from './perangkatDraftStorage';
import type { ModulAjarModelType } from './modulAjarAiService';
import type { AsesmenDokumen } from '../types/assessment';
import type { RangkumanDokumen } from '../types/summary';
import {
  LEGACY_BANK_SOAL_KEY,
  saveToBankSoal,
  buildScopeForAsesmenDoc,
} from './bankSoalStorage';
import {
  LEGACY_BANK_RANGKUMAN_KEY,
  saveToBankRangkuman,
  buildScopeForRangkumanDoc,
} from './bankRangkumanStorage';

export const STORAGE_MIGRATION_VERSION_KEY = 'asesmerdeka_storage_migration_version';
export const CURRENT_STORAGE_MIGRATION_VERSION = 1;
export const SCHEDULE_MIGRATION_VERSION_KEY = 'asesmerdeka_schedule_migration_version_v1';
export const CURRENT_SCHEDULE_MIGRATION_VERSION = '1';
export const ASSESSMENT_MIGRATION_VERSION_KEY = 'asesmerdeka_assessment_migration_v2';
export const CURRENT_ASSESSMENT_MIGRATION_VERSION = '1';
export const LEGACY_BACKUP_STORAGE_KEY = 'asesmerdeka_legacy_backup_v1';
export const MIGRATION_CONFLICTS_STORAGE_KEY = 'asesmerdeka_migration_conflicts_v1';

export interface AmbiguousLegacyDraftItem {
  id: string;
  legacyKey: string;
  kind: 'modul_ajar' | 'lkpd';
  detectedKode: string;
  detectedMapel?: string;
  detectedKelas?: string;
  detectedSemester?: string;
  previewTitle: string;
  modelOrPreset: string;
  reason: string;
  resolvedAt?: string;
  resolutionAction?: 'attached' | 'discarded';
  assignedTargetSummary?: string;
}

export interface LegacyRosterConflictCandidate {
  legacyKey: string;
  mataPelajaran: string;
  semester: string;
  studentCount: number;
  sampleNames: string[];
  dataSource: KelasHarianDataSource;
}

export interface LegacyRosterConflictItem {
  id: string;
  classScopeKey: string;
  tahunAjaran: string;
  jenjang: string;
  kelas: string;
  rombel: string;
  candidates: LegacyRosterConflictCandidate[];
  resolvedAt?: string;
  chosenLegacyKey?: string;
}

export interface MigrationReportState {
  version: number;
  scheduleMigrationVersion?: string;
  migratedAt: string;
  migratedCounts: {
    customTPs: number;
    kelasHarian: number;
    rosters: number;
    modulAjar: number;
    lkpd: number;
    supervisi: number;
  };
  ambiguousDrafts: AmbiguousLegacyDraftItem[];
  rosterConflicts: LegacyRosterConflictItem[];
}

interface LegacyBackupPayload {
  version: number;
  createdAt: string;
  entries: Record<string, string>;
}

const KNOWN_TP_SEARCH_MAPELS_BY_JENJANG: Record<SchoolProfile['jenjang'], string[]> = {
  'SD/MI': [
    'Matematika',
    'Bahasa Indonesia',
    'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
    'Pendidikan Pancasila',
    'Bahasa Inggris',
    'SENI dan Budaya',
    'PJOK',
    'Pendidikan Agama Islam & Budi Pekerti',
  ],
  'SMP/MTs': [
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
  'SMA/MA': [
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
  ],
  SMK: [
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'Informatika',
    'Projek IPAS',
    'Pendidikan Pancasila',
  ],
};

function readLegacyBackup(): LegacyBackupPayload {
  try {
    const raw = localStorage.getItem(LEGACY_BACKUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LegacyBackupPayload>;
      if (parsed && typeof parsed.entries === 'object' && parsed.entries) {
        return {
          version: Number(parsed.version) || CURRENT_STORAGE_MIGRATION_VERSION,
          createdAt: parsed.createdAt || new Date().toISOString(),
          entries: { ...parsed.entries },
        };
      }
    }
  } catch {
    // fallback fresh
  }
  return {
    version: CURRENT_STORAGE_MIGRATION_VERSION,
    createdAt: new Date().toISOString(),
    entries: {},
  };
}

function recordLegacyBackupEntry(
  backup: LegacyBackupPayload,
  key: string,
  value: string
): void {
  if (!Object.prototype.hasOwnProperty.call(backup.entries, key)) {
    backup.entries[key] = value;
  }
}

export function getMigrationReportState(): MigrationReportState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MIGRATION_CONFLICTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MigrationReportState;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...parsed,
      ambiguousDrafts: Array.isArray(parsed.ambiguousDrafts) ? parsed.ambiguousDrafts : [],
      rosterConflicts: Array.isArray(parsed.rosterConflicts) ? parsed.rosterConflicts : [],
    };
  } catch {
    return null;
  }
}

function saveMigrationReportState(state: MigrationReportState): void {
  try {
    localStorage.setItem(MIGRATION_CONFLICTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

function inferJenjangFromKelas(
  kelas: string,
  fallbackJenjang: SchoolProfile['jenjang']
): SchoolProfile['jenjang'] {
  const k = parseInt((kelas || '').replace(/[^0-9]/g, ''), 10);
  if (k >= 1 && k <= 6) return 'SD/MI';
  if (k >= 7 && k <= 9) return 'SMP/MTs';
  if (k >= 10 && k <= 12) {
    return fallbackJenjang === 'SMK' ? 'SMK' : 'SMA/MA';
  }
  return fallbackJenjang;
}

function resolveCandidateTPList(
  mapel: string,
  jenjang: SchoolProfile['jenjang'],
  kelas: string,
  semester: string,
  profile: SchoolProfile
): CustomTPItem[] {
  const fase = jenjangToDefaultFase(jenjang, kelas);
  const plan = getSemesterCurriculumPlan(mapel, fase, kelas, semester, {
    schoolId: profile.schoolId,
    tahunAjaran: profile.tahunAjaran,
  });
  return plan.tpList;
}

function findUnambiguousMatchingTP(
  draft: {
    tpId?: string;
    tpKode?: string;
    materiPokok?: string;
    mataPelajaran?: string;
    kelas?: string;
    semester?: string;
    jenjangFase?: string;
  },
  profile: SchoolProfile
): { tp: CustomTPItem; targetProfile: SchoolProfile } | { ambiguousReason: string } {
  const mapel = (draft.mataPelajaran || '').trim();
  const kelas = (draft.kelas || profile.kelasUtama || '8').trim();
  const semester = (draft.semester || profile.semester || '1 (Ganjil)').trim();
  const jenjang = inferJenjangFromKelas(kelas, profile.jenjang);

  if (!mapel) {
    return {
      ambiguousReason:
        'Draf lama tidak memiliki informasi mata pelajaran sehingga berisiko tertukar dengan mapel lain.',
    };
  }

  const targetProfile: SchoolProfile = {
    ...profile,
    jenjang,
    kelasUtama: kelas,
    mataPelajaranUtama: mapel,
    semester: semester.startsWith('2') ? '2 (Genap)' : '1 (Ganjil)',
  };

  const candidates = resolveCandidateTPList(mapel, jenjang, kelas, semester, targetProfile);

  // Cocokkan paling ketat: tpId persis ATAU (tpKode + materiPokok mirip)
  if (draft.tpId) {
    const exactIdMatch = candidates.find((t) => t.id === draft.tpId);
    if (exactIdMatch) {
      return { tp: exactIdMatch, targetProfile };
    }
  }

  const cleanKode = (draft.tpKode || '').trim().toLowerCase();
  const cleanMateri = (draft.materiPokok || '').trim().toLowerCase();

  // Jika hanya kode generik (mis. 8.1 atau TP-1) tanpa materiPokok yang konsisten, flag verifikasi bila mapel juga memakai judul generik/berbeda
  const byMateri = cleanMateri
    ? candidates.filter((t) => t.materiPokok.trim().toLowerCase() === cleanMateri)
    : [];

  if (byMateri.length === 1) {
    return { tp: byMateri[0], targetProfile };
  }

  // Jika kode persis cocok DAN materiPokok sebagian cocok pada mapel tersebut
  if (cleanKode && cleanMateri) {
    const kodeAndPartialMateri = candidates.filter(
      (t) =>
        t.kode.trim().toLowerCase() === cleanKode &&
        (t.materiPokok.trim().toLowerCase().includes(cleanMateri) ||
          cleanMateri.includes(t.materiPokok.trim().toLowerCase()))
    );
    if (kodeAndPartialMateri.length === 1) {
      return { tp: kodeAndPartialMateri[0], targetProfile };
    }
  }

  // Cek apakah mapel memang berasal dari katalog aktif (jika ya, cek apakah kode unik di dalam mapel tsb)
  const mapelKnownList = KNOWN_TP_SEARCH_MAPELS_BY_JENJANG[jenjang] || [];
  const isKnownCatalogMapel = mapelKnownList.some(
    (m) => m.toLowerCase() === mapel.toLowerCase()
  );
  if (isKnownCatalogMapel && cleanKode && cleanMateri) {
    const byKodeOnly = candidates.filter((t) => t.kode.trim().toLowerCase() === cleanKode);
    if (byKodeOnly.length === 1 && cleanMateri.length >= 4) {
      // Materi mungkin disunting oleh guru di draf, tapi mapel & kode eksplisit ada di draf
      return { tp: byKodeOnly[0], targetProfile };
    }
  }

  return {
    ambiguousReason: `Draf kode "${draft.tpKode || '-'}" (Mapel: ${mapel}) tidak dapat dipastikan otomatis TP tujuannya. Silakan konfirmasi tujuan pemulihan.`,
  };
}

function parseLegacyDraftKeyInfo(key: string): {
  kind: 'modul_ajar' | 'lkpd';
  rawTpPart: string;
  variant: string;
} | null {
  if (key.startsWith('modul_ajar_')) {
    const rest = key.slice('modul_ajar_'.length);
    const lastUnderscore = rest.lastIndexOf('_');
    if (lastUnderscore <= 0) return null;
    return {
      kind: 'modul_ajar',
      rawTpPart: rest.slice(0, lastUnderscore),
      variant: rest.slice(lastUnderscore + 1),
    };
  }
  if (key.startsWith('lkpd_')) {
    const rest = key.slice('lkpd_'.length);
    const lastUnderscore = rest.lastIndexOf('_');
    if (lastUnderscore <= 0) return null;
    return {
      kind: 'lkpd',
      rawTpPart: rest.slice(0, lastUnderscore),
      variant: rest.slice(lastUnderscore + 1),
    };
  }
  return null;
}

/**
 * Menjalankan migrasi data non-destruktif & idempoten dari format kunci v1 ke namespace v2.
 * - Tidak pernah menghapus data legacy maupun menimpa data v2 yang sudah ada.
 * - Mempertahankan status isSimulated / legacy_unverified / verifiedActualAt.
 * - Menandai entri ambigu untuk diverifikasi manual oleh guru.
 */
export function runNonDestructiveStorageMigration(
  explicitProfile?: SchoolProfile
): MigrationReportState {
  const existingReport = getMigrationReportState();
  const baseReport: MigrationReportState = existingReport || {
    version: CURRENT_STORAGE_MIGRATION_VERSION,
    migratedAt: new Date().toISOString(),
    migratedCounts: {
      customTPs: 0,
      kelasHarian: 0,
      rosters: 0,
      modulAjar: 0,
      lkpd: 0,
      supervisi: 0,
    },
    ambiguousDrafts: [],
    rosterConflicts: [],
  };

  if (typeof localStorage === 'undefined') {
    return baseReport;
  }

  let profile = explicitProfile || getSchoolProfile();
  const hasStoredProfile = localStorage.getItem('asesmerdeka_school_profile_v1') !== null;
  if (!profile.schoolId) {
    const persisted = getPersistedActiveSchoolId();
    const resolvedId = persisted || (hasStoredProfile ? generateNewSchoolId() : 'sch_local_default');
    profile = { ...profile, schoolId: resolvedId };
    if (hasStoredProfile) {
      profile = saveSchoolProfile(profile);
    }
  }

  const backup = readLegacyBackup();
  const knownAmbiguousByKey = new Map<string, AmbiguousLegacyDraftItem>(
    baseReport.ambiguousDrafts.map((a) => [a.legacyKey, a])
  );
  const knownConflictsByScope = new Map<string, LegacyRosterConflictItem>(
    baseReport.rosterConflicts.map((c) => [c.classScopeKey, c])
  );

  // 1. Migrasi Custom TP legacy (`asesmerdeka_custom_tp_map_v1`) tanpa menimpa v2
  try {
    const legacyCustomRaw = localStorage.getItem('asesmerdeka_custom_tp_map_v1');
    if (legacyCustomRaw) {
      recordLegacyBackupEntry(backup, 'asesmerdeka_custom_tp_map_v1', legacyCustomRaw);
      const parsedMap = JSON.parse(legacyCustomRaw) as Record<string, CustomTPItem[]>;
      const existingV2Raw = localStorage.getItem('asesmerdeka_custom_tp_v2');
      const existingV2Map: Record<string, CustomTPItem[]> = existingV2Raw
        ? JSON.parse(existingV2Raw)
        : {};

      for (const [legacyKey, list] of Object.entries(parsedMap || {})) {
        if (!Array.isArray(list) || list.length === 0) continue;
        const parts = legacyKey.split('__');
        const mapelSlug = parts[0] || profile.mataPelajaranUtama;
        const klsPart = (parts.find((p) => p.startsWith('kls_')) || '').replace('kls_', '') || profile.kelasUtama;
        const semPart = (parts.find((p) => p.startsWith('sem_')) || '').includes('2')
          ? '2 (Genap)'
          : '1 (Ganjil)';

        const matchedMapel =
          Object.values(KNOWN_TP_SEARCH_MAPELS_BY_JENJANG)
            .flat()
            .find((m) => m.toLowerCase() === mapelSlug.toLowerCase()) ||
          (profile.mataPelajaranUtama.toLowerCase() === mapelSlug.toLowerCase()
            ? profile.mataPelajaranUtama
            : mapelSlug);

        const jenjang = inferJenjangFromKelas(klsPart, profile.jenjang);
        const derivedProfile: SchoolProfile = {
          ...profile,
          jenjang,
          kelasUtama: klsPart,
          mataPelajaranUtama: matchedMapel,
          semester: semPart,
        };

        // Hanya isi v2 bila belum ada di v2, sekaligus pastikan ID TP permanen (`tpid_...`) unik per semester/konteks
        const exactV2Key = buildCustomTPScopeKey(derivedProfile, deriveDefaultFase(jenjang, klsPart));
        if (!Array.isArray(existingV2Map[exactV2Key]) || existingV2Map[exactV2Key].length === 0) {
          const derivedFase = deriveDefaultFase(jenjang, klsPart);
          const normalizedList = list.map((item, idx) => {
            if (item.id && item.id.startsWith('tpid_')) {
              return item;
            }
            const nextId = createImmutableDefaultTPId({
              schoolId: derivedProfile.schoolId,
              tahunAjaran: derivedProfile.tahunAjaran,
              jenjangFase: derivedFase,
              kelas: klsPart,
              semester: semPart,
              mataPelajaran: matchedMapel,
              topicKey: `${item.kode || idx + 1}|${item.materiPokok || ''}|${item.id || ''}`,
            });
            return {
              ...item,
              legacyTpId: item.legacyTpId || item.id,
              id: nextId,
            };
          });
          saveCustomTPList(matchedMapel, klsPart, semPart, normalizedList, derivedProfile);
          baseReport.migratedCounts.customTPs++;
        }
      }
    }
  } catch {
    // ignore corrupt legacy custom TP map
  }

  // 2. Kumpulkan seluruh key localStorage untuk scan aman
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) allKeys.push(k);
  }

  // Kelompokkan legacy Kelas Harian per scope kelas (tahunAjaran + jenjang + kelas + rombel) untuk mendeteksi konflik roster lintas mapel
  const rosterCandidatesByClassScope = new Map<
    string,
    Array<{
      legacyKey: string;
      derivedProfile: SchoolProfile;
      data: KelasHarianData;
      resolvedSource: KelasHarianDataSource;
    }>
  >();

  for (const key of allKeys) {
    if (!key.startsWith('asesmerdeka_harian_') || key.startsWith('asesmerdeka_harian_v2__')) {
      continue;
    }
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    recordLegacyBackupEntry(backup, key, raw);

    try {
      const parsed = JSON.parse(raw) as KelasHarianData;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.daftarSiswa)) {
        continue;
      }

      const inferredKelas = (profile.kelasUtama || '8').trim();
      const inferredJenjang = inferJenjangFromKelas(inferredKelas, profile.jenjang);
      const inferredSem: SchoolProfile['semester'] =
        (parsed.semester || '').startsWith('2') || key.endsWith('_sem2')
          ? '2 (Genap)'
          : '1 (Ganjil)';

      const derivedProfile: SchoolProfile = {
        ...profile,
        jenjang: inferredJenjang,
        kelasUtama: inferredKelas,
        rombelAktif: parsed.rombel || profile.rombelAktif,
        mataPelajaranUtama: parsed.mataPelajaran || profile.mataPelajaranUtama,
        semester: inferredSem,
        tahunAjaran: parsed.tahunAjaran || profile.tahunAjaran,
      };

      const resolvedSource = resolveKelasHarianDataSource(parsed);
      const tpCandidates = resolveCandidateTPList(
        derivedProfile.mataPelajaranUtama,
        derivedProfile.jenjang,
        derivedProfile.kelasUtama,
        derivedProfile.semester,
        derivedProfile
      );

      // Salin nilaiFormatif kode legacy -> immutable TP ID non-destruktif pada salinan v2
      const upgradedNilai = (parsed.daftarNilai || []).map((row) => {
        let formatif = { ...(row.nilaiFormatif || {}) };
        tpCandidates.forEach((tp) => {
          if (formatif[tp.id] === undefined && typeof formatif[tp.kode] === 'number') {
            formatif = setFormatifScoreForTP(formatif, tp, formatif[tp.kode]);
          }
        });
        return {
          ...row,
          nilaiFormatif: formatif,
        };
      });

      const v2Key = buildKelasHarianStorageKeyV2(derivedProfile);
      if (!localStorage.getItem(v2Key)) {
        const migratedData: KelasHarianData = {
          ...parsed,
          isSimulated: resolvedSource === 'simulation_demo',
          dataSource: resolvedSource,
          daftarNilai: upgradedNilai,
        };
        localStorage.setItem(v2Key, JSON.stringify(migratedData));
        baseReport.migratedCounts.kelasHarian++;
      }

      const classScopeKey = buildRosterStorageKey(derivedProfile);
      const list = rosterCandidatesByClassScope.get(classScopeKey) || [];
      list.push({
        legacyKey: key,
        derivedProfile,
        data: parsed,
        resolvedSource,
      });
      rosterCandidatesByClassScope.set(classScopeKey, list);
    } catch {
      // ignore corrupt legacy entry
    }
  }

  // Rekonsiliasi roster per rombel + TA
  for (const [classScopeKey, entries] of rosterCandidatesByClassScope.entries()) {
    const existingSharedRoster = getClassRosterRecord(entries[0].derivedProfile);
    if (existingSharedRoster) continue;

    const nonDemoEntries = entries.filter((e) => e.resolvedSource !== 'simulation_demo');
    const sourceGroup = nonDemoEntries.length > 0 ? nonDemoEntries : entries;
    const reference = sourceGroup[0];

    const hasConflictingRosters = sourceGroup.some(
      (item) => !areRostersEquivalent(item.data.daftarSiswa, reference.data.daftarSiswa)
    );

    if (!hasConflictingRosters) {
      saveClassRosterRecord(reference.derivedProfile, {
        daftarSiswa: reference.data.daftarSiswa,
        isSimulated: reference.resolvedSource === 'simulation_demo',
        dataSource: reference.resolvedSource,
        verifiedActualAt: reference.data.verifiedActualAt,
      });
      baseReport.migratedCounts.rosters++;
    } else if (!knownConflictsByScope.has(classScopeKey)) {
      // Jangan menebak diam-diam saat dua mapel punya daftar siswa berbeda!
      knownConflictsByScope.set(classScopeKey, {
        id: `conflict_${classScopeKey}`,
        classScopeKey,
        tahunAjaran: reference.derivedProfile.tahunAjaran,
        jenjang: reference.derivedProfile.jenjang,
        kelas: reference.derivedProfile.kelasUtama,
        rombel: reference.derivedProfile.rombelAktif,
        candidates: sourceGroup.map((item) => ({
          legacyKey: item.legacyKey,
          mataPelajaran: item.derivedProfile.mataPelajaranUtama,
          semester: item.derivedProfile.semester,
          studentCount: item.data.daftarSiswa.length,
          sampleNames: item.data.daftarSiswa.slice(0, 3).map((s) => s.nama),
          dataSource: item.resolvedSource,
        })),
      });
    }
  }

  // 3. Migrasi Supervisi legacy (`asesmerdeka_supervisi_`)
  for (const key of allKeys) {
    if (!key.startsWith('asesmerdeka_supervisi_') || key.startsWith('asesmerdeka_supervisi_v2__')) {
      continue;
    }
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    recordLegacyBackupEntry(backup, key, raw);

    // Pindahkan ke scope aktif apabila cocok secara default hanya bila v2 belum ada
    const targetV2 = buildSupervisiStorageKeyV2(profile);
    if (!localStorage.getItem(targetV2)) {
      localStorage.setItem(targetV2, raw);
      baseReport.migratedCounts.supervisi++;
    }
  }

  // 4. Migrasi Modul Ajar & LKPD legacy (`modul_ajar_*`, `lkpd_*`)
  for (const key of allKeys) {
    const info = parseLegacyDraftKeyInfo(key);
    if (!info) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    recordLegacyBackupEntry(backup, key, raw);

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') continue;

      if (info.kind === 'modul_ajar') {
        const doc = parsed as ModulAjarDokumen;
        const resolution = findUnambiguousMatchingTP(
          {
            tpId: doc.tpId,
            tpKode: doc.tpKode || info.rawTpPart,
            materiPokok: doc.materiPokok,
            mataPelajaran: doc.mataPelajaran,
            kelas: doc.kelas,
            semester: doc.semester,
            jenjangFase: doc.jenjangFase,
          },
          profile
        );

        if ('tp' in resolution) {
          const targetV2Key = buildModulAjarDraftStorageKey(
            resolution.targetProfile,
            resolution.tp.id,
            info.variant
          );
          if (!localStorage.getItem(targetV2Key)) {
            const v2Result = saveModulAjarDraft(
              resolution.targetProfile,
              resolution.tp,
              info.variant as ModulAjarModelType,
              doc,
              doc.draftSource || 'user_edited'
            );
            if (v2Result.ok) {
              baseReport.migratedCounts.modulAjar++;
            }
          }
        } else if (!knownAmbiguousByKey.has(key)) {
          knownAmbiguousByKey.set(key, {
            id: `ambig_${key}`,
            legacyKey: key,
            kind: 'modul_ajar',
            detectedKode: doc.tpKode || info.rawTpPart,
            detectedMapel: doc.mataPelajaran,
            detectedKelas: doc.kelas,
            detectedSemester: doc.semester,
            previewTitle: doc.judul || doc.materiPokok || `Modul Ajar (${info.rawTpPart})`,
            modelOrPreset: info.variant,
            reason: resolution.ambiguousReason,
          });
        }
      } else {
        const doc = parsed as LKPDDokumen;
        const resolution = findUnambiguousMatchingTP(
          {
            tpId: doc.tpId || info.rawTpPart,
            tpKode: doc.tpKode,
            materiPokok: doc.materiPokok,
            mataPelajaran: doc.mataPelajaran,
            kelas: doc.kelas,
            semester: doc.semester,
            jenjangFase: doc.jenjangFase,
          },
          profile
        );

        if ('tp' in resolution) {
          const targetV2Key = buildLKPDDraftStorageKey(
            resolution.targetProfile,
            resolution.tp.id,
            info.variant
          );
          if (!localStorage.getItem(targetV2Key)) {
            const v2Result = saveLKPDDraft(
              resolution.targetProfile,
              resolution.tp,
              info.variant as LKPDPresetType,
              doc,
              doc.draftSource || 'user_edited'
            );
            if (v2Result.ok) {
              baseReport.migratedCounts.lkpd++;
            }
          }
        } else if (!knownAmbiguousByKey.has(key)) {
          knownAmbiguousByKey.set(key, {
            id: `ambig_${key}`,
            legacyKey: key,
            kind: 'lkpd',
            detectedKode: doc.tpKode || info.rawTpPart,
            detectedMapel: doc.mataPelajaran,
            detectedKelas: doc.kelas,
            detectedSemester: doc.semester,
            previewTitle: doc.judul || doc.materiPokok || `LKPD (${info.rawTpPart})`,
            modelOrPreset: info.variant,
            reason: resolution.ambiguousReason,
          });
        }
      }
    } catch {
      // ignore malformed legacy draft
    }
  }

  // 4. Backward-compatibility Task 4 (Prota/Promes/Kalender): tetap berjalan untuk pengguna v1 -> Task 4 tanpa merusak ID tpid_* atau editan
  const alreadyMigratedSchedule =
    localStorage.getItem(SCHEDULE_MIGRATION_VERSION_KEY) === CURRENT_SCHEDULE_MIGRATION_VERSION;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('asesmerdeka_kalender_') ||
          k.startsWith('asesmerdeka_prota_') ||
          k.startsWith('asesmerdeka_promes_')) &&
        !k.includes('_v2__')
      ) {
        const val = localStorage.getItem(k);
        if (val) recordLegacyBackupEntry(backup, k, val);
      }
    }

    if (!alreadyMigratedSchedule) {
      const v2CustomRaw = localStorage.getItem('asesmerdeka_custom_tp_v2');
      if (v2CustomRaw) {
        recordLegacyBackupEntry(backup, 'asesmerdeka_custom_tp_v2__pre_schedule', v2CustomRaw);
        const v2Map = JSON.parse(v2CustomRaw) as Record<string, CustomTPItem[]>;
        let v2Changed = false;
        const upgradedIdPairs = new Map<string, string>();

        for (const [scopeKey, items] of Object.entries(v2Map || {})) {
          if (!Array.isArray(items) || items.length === 0) continue;
          const scopeParts = scopeKey.split('__');
          const scopeSchool = scopeParts[0] || profile.schoolId || 'sch_local_default';
          const scopeTA = scopeParts[1] || profile.tahunAjaran || '2026-2027';
          const scopeFase = scopeParts[2] || deriveDefaultFase(profile.jenjang, profile.kelasUtama);
          const scopeKelas = scopeParts[3] || profile.kelasUtama;
          const scopeSem = scopeParts[4] || 'sem1';
          const scopeMapel = scopeParts[5] || profile.mataPelajaranUtama;

          const nextItems = items.map((item, idx) => {
            if (item.id && item.id.startsWith('tpid_')) {
              return item;
            }
            const nextId = createImmutableDefaultTPId({
              schoolId: scopeSchool,
              tahunAjaran: scopeTA,
              jenjangFase: scopeFase,
              kelas: scopeKelas,
              semester: scopeSem === 'sem2' ? '2 (Genap)' : '1 (Ganjil)',
              mataPelajaran: scopeMapel,
              topicKey: `${item.kode || idx + 1}|${item.materiPokok || ''}|${item.id || ''}`,
            });
            if (item.id && item.id !== nextId) {
              upgradedIdPairs.set(item.id, nextId);
            }
            v2Changed = true;
            return {
              ...item,
              legacyTpId: item.legacyTpId || item.id,
              id: nextId,
            };
          });
          v2Map[scopeKey] = nextItems;
        }

        if (v2Changed) {
          localStorage.setItem('asesmerdeka_custom_tp_v2', JSON.stringify(v2Map));
          baseReport.migratedCounts.customTPs++;
        }

        // Jika ada item v2 non-tpid yang baru dinaikkan, cegah orphan pada draft / nilai terkait tanpa menghapus data lama
        if (upgradedIdPairs.size > 0) {
          for (const draftStoreKey of ['asesmerdeka_modul_ajar_v2', 'asesmerdeka_lkpd_v2']) {
            const rawDrafts = localStorage.getItem(draftStoreKey);
            if (!rawDrafts) continue;
            const draftMap = JSON.parse(rawDrafts) as Record<string, Record<string, unknown>>;
            let draftChanged = false;
            for (const [dKey, dVal] of Object.entries(draftMap || {})) {
              const docObj = (dVal && typeof dVal === 'object' ? (dVal as { document?: { tpId?: string }; tpId?: string }) : null);
              const oldTpId = docObj?.document?.tpId || docObj?.tpId;
              if (oldTpId && upgradedIdPairs.has(oldTpId)) {
                const newTpId = upgradedIdPairs.get(oldTpId)!;
                const newKey = dKey.replace(`__${oldTpId}__`, `__${newTpId}__`);
                if (newKey !== dKey && !draftMap[newKey]) {
                  const cloned = JSON.parse(JSON.stringify(dVal)) as { document?: { tpId?: string }; tpId?: string };
                  if (cloned.document) cloned.document.tpId = newTpId;
                  if (typeof cloned.tpId === 'string') cloned.tpId = newTpId;
                  draftMap[newKey] = cloned;
                  draftChanged = true;
                }
              }
            }
            if (draftChanged) {
              localStorage.setItem(draftStoreKey, JSON.stringify(draftMap));
            }
          }
        }
      }
      localStorage.setItem(SCHEDULE_MIGRATION_VERSION_KEY, CURRENT_SCHEDULE_MIGRATION_VERSION);
    }
  } catch {
    // ignore storage errors
  }

  // 5. Backward-compatibility Task 5 (Bank Soal & Bank Rangkuman V2 scoping & demo marker)
  const alreadyMigratedAssessment =
    localStorage.getItem(ASSESSMENT_MIGRATION_VERSION_KEY) === CURRENT_ASSESSMENT_MIGRATION_VERSION;

  try {
    const rawLegacyBankSoal = localStorage.getItem(LEGACY_BANK_SOAL_KEY);
    if (rawLegacyBankSoal) {
      recordLegacyBackupEntry(backup, LEGACY_BANK_SOAL_KEY, rawLegacyBankSoal);
      if (!alreadyMigratedAssessment) {
        const parsedSoal = JSON.parse(rawLegacyBankSoal);
        if (Array.isArray(parsedSoal)) {
          for (const item of parsedSoal as AsesmenDokumen[]) {
            if (!item || !item.id || !Array.isArray(item.soalList)) continue;
            const isKnownSample =
              Boolean(item.isSimulated) ||
              item.id.startsWith('ASM-SAMPLE-') ||
              item.id === 'ASM-INITIAL-SAMPLE';
            const migratedItem: AsesmenDokumen = {
              ...item,
              schoolId: item.schoolId || profile.schoolId,
              tahunAjaran: item.tahunAjaran || profile.tahunAjaran || '2026/2027',
              semester: item.semester || profile.semester || '1 (Ganjil)',
              isSimulated: isKnownSample ? true : item.isSimulated,
              generationSource:
                item.generationSource || (isKnownSample ? 'sample_demo' : undefined),
            };
            const itemScope = buildScopeForAsesmenDoc(migratedItem, profile);
            saveToBankSoal(migratedItem, itemScope);
          }
        }
      }
    }

    const rawLegacyRangkuman = localStorage.getItem(LEGACY_BANK_RANGKUMAN_KEY);
    if (rawLegacyRangkuman) {
      recordLegacyBackupEntry(backup, LEGACY_BANK_RANGKUMAN_KEY, rawLegacyRangkuman);
      if (!alreadyMigratedAssessment) {
        const parsedRangkuman = JSON.parse(rawLegacyRangkuman);
        if (Array.isArray(parsedRangkuman)) {
          for (const item of parsedRangkuman as RangkumanDokumen[]) {
            if (!item || !item.id) continue;
            const isKnownSample =
              Boolean(item.isSimulated) ||
              item.id === 'RNG-FOTOSINTESIS-SAMPLE' ||
              item.id === 'RNG-PREVIEW-SIMULASI';
            const migratedDoc: RangkumanDokumen = {
              ...item,
              schoolId: item.schoolId || profile.schoolId,
              tahunAjaran: item.tahunAjaran || profile.tahunAjaran || '2026/2027',
              semester: item.semester || profile.semester || '1 (Ganjil)',
              isSimulated: isKnownSample ? true : item.isSimulated,
              draftSource: item.draftSource || (isKnownSample ? 'sample_demo' : undefined),
            };
            const itemScope = buildScopeForRangkumanDoc(migratedDoc, profile);
            saveToBankRangkuman(migratedDoc, itemScope);
          }
        }
      }
    }

    localStorage.setItem(ASSESSMENT_MIGRATION_VERSION_KEY, CURRENT_ASSESSMENT_MIGRATION_VERSION);
  } catch {
    // ignore storage errors
  }

  const finalReport: MigrationReportState = {
    ...baseReport,
    version: CURRENT_STORAGE_MIGRATION_VERSION,
    scheduleMigrationVersion: CURRENT_SCHEDULE_MIGRATION_VERSION,
    migratedAt: new Date().toISOString(),
    ambiguousDrafts: Array.from(knownAmbiguousByKey.values()),
    rosterConflicts: Array.from(knownConflictsByScope.values()),
  };

  try {
    localStorage.setItem(LEGACY_BACKUP_STORAGE_KEY, JSON.stringify(backup));
    localStorage.setItem(
      STORAGE_MIGRATION_VERSION_KEY,
      String(CURRENT_STORAGE_MIGRATION_VERSION)
    );
    saveMigrationReportState(finalReport);
  } catch {
    // ignore storage quota errors
  }

  return finalReport;
}

export function getPendingAmbiguousLegacyDrafts(): AmbiguousLegacyDraftItem[] {
  const state = getMigrationReportState();
  if (!state) return [];
  return state.ambiguousDrafts.filter((d) => !d.resolvedAt);
}

export function getPendingLegacyRosterConflicts(): LegacyRosterConflictItem[] {
  const state = getMigrationReportState();
  if (!state) return [];
  return state.rosterConflicts.filter((c) => !c.resolvedAt);
}

export function resolveAmbiguousLegacyDraft(
  legacyKey: string,
  action: 'attach' | 'discard',
  targetProfile?: SchoolProfile,
  targetTP?: CustomTPItem
): boolean {
  if (typeof localStorage === 'undefined') return false;
  const state = getMigrationReportState();
  if (!state) return false;

  const entry = state.ambiguousDrafts.find((d) => d.legacyKey === legacyKey);
  if (!entry) return false;

  if (action === 'attach') {
    if (!targetProfile || !targetTP) return false;
    const backup = readLegacyBackup();
    const raw = localStorage.getItem(legacyKey) || backup.entries[legacyKey];
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw);
      if (entry.kind === 'modul_ajar') {
        const doc: ModulAjarDokumen = {
          ...parsed,
          mataPelajaran: targetProfile.mataPelajaranUtama,
          kelas: targetProfile.kelasUtama,
          semester: targetProfile.semester,
          tpId: targetTP.id,
          tpKode: targetTP.kode,
        };
        saveModulAjarDraft(
          targetProfile,
          targetTP,
          entry.modelOrPreset as ModulAjarModelType,
          doc,
          'user_edited'
        );
      } else {
        const doc: LKPDDokumen = {
          ...parsed,
          mataPelajaran: targetProfile.mataPelajaranUtama,
          kelas: targetProfile.kelasUtama,
          semester: targetProfile.semester,
          tpId: targetTP.id,
          tpKode: targetTP.kode,
        };
        saveLKPDDraft(
          targetProfile,
          targetTP,
          entry.modelOrPreset as LKPDPresetType,
          doc,
          'user_edited'
        );
      }
      entry.resolutionAction = 'attached';
      entry.assignedTargetSummary = `${targetProfile.mataPelajaranUtama} · Kelas ${targetProfile.kelasUtama} · TP ${targetTP.kode}`;
    } catch {
      return false;
    }
  } else {
    entry.resolutionAction = 'discarded';
  }

  entry.resolvedAt = new Date().toISOString();
  saveMigrationReportState(state);
  return true;
}

export function resolveLegacyRosterConflict(
  conflictId: string,
  chosenLegacyKey: string,
  activeProfile?: SchoolProfile
): boolean {
  if (typeof localStorage === 'undefined') return false;
  const state = getMigrationReportState();
  if (!state) return false;

  const conflict = state.rosterConflicts.find((c) => c.id === conflictId);
  if (!conflict) return false;

  const backup = readLegacyBackup();
  const raw = localStorage.getItem(chosenLegacyKey) || backup.entries[chosenLegacyKey];
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as KelasHarianData;
    const baseProfile = activeProfile || getSchoolProfile();
    const targetProfile: SchoolProfile = {
      ...baseProfile,
      tahunAjaran: conflict.tahunAjaran,
      jenjang: conflict.jenjang as SchoolProfile['jenjang'],
      kelasUtama: conflict.kelas,
      rombelAktif: conflict.rombel,
    };
    const resolvedSource = resolveKelasHarianDataSource(parsed);
    saveClassRosterRecord(targetProfile, {
      daftarSiswa: parsed.daftarSiswa || [],
      isSimulated: resolvedSource === 'simulation_demo',
      dataSource: resolvedSource,
      verifiedActualAt: parsed.verifiedActualAt,
    });
    conflict.chosenLegacyKey = chosenLegacyKey;
    conflict.resolvedAt = new Date().toISOString();
    saveMigrationReportState(state);
    return true;
  } catch {
    return false;
  }
}
