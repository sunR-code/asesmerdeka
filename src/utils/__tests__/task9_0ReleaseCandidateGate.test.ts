import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

class LocalStorageMock {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: LocalStorageMock }).localStorage = new LocalStorageMock();
}
if (typeof (globalThis as unknown as { addEventListener?: unknown }).addEventListener !== 'function') {
  (globalThis as unknown as { addEventListener: () => void }).addEventListener = () => {};
}
if (typeof (globalThis as unknown as { removeEventListener?: unknown }).removeEventListener !== 'function') {
  (globalThis as unknown as { removeEventListener: () => void }).removeEventListener = () => {};
}
if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}

import { LicenseModal } from '../../components/LicenseModal';
import type { UserQuota } from '../../types/assessment';
import * as paymentGateway from '../paymentGateway';
import {
  getTopicById,
  lookupCuratedTopicBank,
  resolveSafePedagogicalReviewStatus,
} from '../../data/kurikulumTopicBank';
import {
  buildCustomTPFromTopicEntry,
  getSemesterCurriculumPlan,
  resolveSubjectCatalogMetadata,
} from '../kurikulumCatalog';
import {
  exportBackupDataJson,
  importBackupDataJson,
  saveCustomTPList,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { getSavedCPEntries, saveCPEntry } from '../cpStorage';
import {
  approvePhaseATPPlan,
  initializeOrSyncPhaseATPPlan,
  invalidatePhaseATPApprovalIfChanged,
} from '../atpStorage';
import { buildSmartPromes, buildSmartProta } from '../perangkatAjarEngine';
import {
  classifyPredikatKKTP,
  computeNilaiAkhir,
} from '../kelasHarianStorage';
import {
  classifyMasteryStatusKKTP,
  resolveEffectiveKKTPThreshold,
} from '../learningMasteryEngine';
import { analyzeWorkspaceConflict } from '../cloudSyncManager';
import { TOPIC_ADJUSTMENT_STORAGE_V2_KEY } from '../storageIdentity';
import {
  getTopicAdjustment,
  saveTopicAdjustment,
} from '../topicAdjustmentStorage';

function makeQuota(overrides: Partial<UserQuota> = {}): UserQuota {
  return {
    tier: 'free',
    remainingCredits: 0,
    maxCredits: 0,
    deviceId: 'DEV-RC90-TEST',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch-rc90-test',
    instansiDinas: 'DINAS PENDIDIKAN KABUPATEN RC',
    namaSekolah: 'SDN Uji Rilis RC 9.0',
    alamatSekolah: 'Jl. Pendidikan No. 90',
    namaGuru: 'Guru Rilis, S.Pd.',
    nipGuru: '199101012024011001',
    namaKepalaSekolah: 'Kepala Rilis, M.Pd.',
    nipKepalaSekolah: '197601012001011001',
    kotaSekolah: 'Bandung',
    jenjang: 'SD/MI',
    kelasUtama: '4',
    rombelAktif: 'IV A',
    daftarRombel: ['IV A'],
    mataPelajaranUtama: 'Seni Musik',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

describe('Task 9.0 — Production Readiness & Release Candidate Gate', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('1. P1 Fix & Admin Isolation: hanya 2 paket utama tampil, checkout Mayar tetap nonaktif, bebas bocoran @admin, & alur WhatsApp Admin siap', () => {
    paymentGateway.saveMayarPaymentLinks(
      'https://pay.mayar.id/guru-test',
      'https://pay.mayar.id/sekolah-test'
    );

    const htmlPublic = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
      })
    );
    expect(htmlPublic).toContain('Lisensi Guru Mandiri');
    expect(htmlPublic).toContain('Rp 99.000');
    expect(htmlPublic).toContain('Lisensi Kolektif Sekolah');
    expect(htmlPublic).toContain('Rp 749.000');
    expect(htmlPublic).not.toContain('Lisensi Guru Mandiri PRO');
    expect(htmlPublic).not.toContain('Lisensi Kolektif Sekolah PRO');
    expect(htmlPublic).not.toContain('via Payment Gateway');
    expect(htmlPublic).toContain('Info Pembelian &amp; WhatsApp Admin');
    expect(htmlPublic).toContain('Aktivasi &amp; Sinkronkan');
    expect(htmlPublic).not.toContain('@admin');

    const htmlWhatsAppModal = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
        initialWhatsAppModalPlanId: 'pro_sekolah',
      })
    );
    expect(htmlWhatsAppModal).toContain('Pembelian Online Sementara Belum Tersedia');
    expect(htmlWhatsAppModal).toContain('Hubungi Admin via WhatsApp');
    expect(htmlWhatsAppModal).toContain('Kembali / Tutup');
    expect(htmlWhatsAppModal).not.toContain('@admin');
  });

  it('2. Regresi Alur Inti A-C & Task 8.3C.1: regulasi, empty state jujur, CP->TP->ATP->Prota/Promes, & penyesuaian guru non-destruktif', () => {
    const kristenMeta = resolveSubjectCatalogMetadata(
      'Pendidikan Agama Kristen dan Budi Pekerti',
      'SMP/MTs'
    );
    expect(kristenMeta.regulationNomor).toMatch(/020.*2026/i);
    const kristenPlan = getSemesterCurriculumPlan(
      'Pendidikan Agama Kristen dan Budi Pekerti',
      'Fase D (Kelas 7-9 SMP)',
      '8',
      '1 (Ganjil)'
    );
    expect(kristenPlan.isEmptyState).toBe(true);
    expect(kristenPlan.tpList).toEqual([]);

    const kepercayaanMeta = resolveSubjectCatalogMetadata(
      'Pendidikan Kepercayaan terhadap Tuhan Yang Maha Esa dan Budi Pekerti',
      'SMP/MTs'
    );
    expect(kepercayaanMeta.regulationNomor).toMatch(/021.*2026/i);
    expect(kepercayaanMeta.isKepercayaan).toBe(true);
    expect(kepercayaanMeta.isAgama).toBe(false);

    const smkKons = lookupCuratedTopicBank(
      'Konsentrasi Keahlian Seni Musik / Pertunjukan Musik (SMK)',
      'Fase F (Kelas 11-12 SMA/SMK)',
      '11',
      '1 (Ganjil)',
      { jenjang: 'SMK' }
    );
    expect(smkKons.isAvailable).toBe(false);
    expect(smkKons.coverageStatus).toBe('input_guru_dibutuhkan');
    expect(resolveSafePedagogicalReviewStatus('ditinjau_ahli_mapel')).toBe('belum_ditinjau');

    const profile = makeProfile();
    const savedCP = saveCPEntry(profile, {
      mataPelajaran: 'Seni Musik',
      jenjang: 'SD/MI',
      fase: 'Fase B (Kelas 3-4 SD)',
      elemenCP: 'Mengalami',
      teksCP: 'Peserta didik mengenali nada dan irama secara musikal.',
      asalCP: 'input_guru',
    });
    expect(getSavedCPEntries(profile)[0].teksCP).toBe(
      'Peserta didik mengenali nada dan irama secara musikal.'
    );

    const bank = lookupCuratedTopicBank('Seni Musik', 'Fase B (Kelas 3-4 SD)', '4', '1 (Ganjil)', {
      jenjang: 'SD/MI',
    });
    expect(bank.isAvailable).toBe(true);
    const tps: CustomTPItem[] = bank.topics.map((topic, i) =>
      buildCustomTPFromTopicEntry(topic, {
        mataPelajaran: 'Seni Musik',
        jenjangFase: 'Fase B (Kelas 3-4 SD)',
        jenjangCategory: 'SD/MI',
        cleanKelas: '4',
        semester: '1 (Ganjil)',
        nomorTP: i + 1,
        mingguMulai: i * 4 + 2,
        mingguSelesai: (i + 1) * 4 + 1,
        alokasiJP: 8,
        schoolId: profile.schoolId,
        tahunAjaran: profile.tahunAjaran,
        savedCPEntries: [savedCP],
      })
    );
    saveCustomTPList('Seni Musik', '4', '1 (Ganjil)', tps, profile);

    const tpById = new Map(tps.map((t) => [t.id, t]));
    const phasePlan = initializeOrSyncPhaseATPPlan(profile, tps, [savedCP]);
    const approveRes = approvePhaseATPPlan({
      profile,
      plan: phasePlan,
      orderedTpIds: phasePlan.orderedTpIds,
      tpById,
      savedCPs: [savedCP],
    });
    expect(approveRes.ok).toBe(true);

    saveTopicAdjustment(
      profile,
      {
        topicId: bank.topics[0].topicId,
        originalTitle: bank.topics[0].judulTopik,
        proposedTitle: 'Penyesuaian Lokal Sekolah RC 9.0',
        pedagogicalReviewStatus: 'ditinjau_guru',
      },
      'Fase B (Kelas 3-4 SD)'
    );
    expect(getTopicById(bank.topics[0].topicId)?.judulTopik).toBe(bank.topics[0].judulTopik);
    expect(
      invalidatePhaseATPApprovalIfChanged({
        profile,
        plan: approveRes.updatedPlan,
        orderedTpIds: approveRes.updatedPlan.orderedTpIds,
        tpById,
        savedCPs: [savedCP],
      }).invalidated
    ).toBe(false);

    const modifiedTpById = new Map(tpById);
    modifiedTpById.set(tps[0].id, {
      ...tps[0],
      tujuanPembelajaran: 'Perubahan substansial tujuan pembelajaran RC 9.0.',
    });
    expect(
      invalidatePhaseATPApprovalIfChanged({
        profile,
        plan: approveRes.updatedPlan,
        orderedTpIds: approveRes.updatedPlan.orderedTpIds,
        tpById: modifiedTpById,
        savedCPs: [savedCP],
      }).invalidated
    ).toBe(true);

    const prota = buildSmartProta(profile, tps);
    const promes = buildSmartPromes(profile, tps);
    expect(prota.itemsSemester1.length).toBe(tps.length);
    expect(promes.rows.length).toBe(tps.length);
    expect(JSON.stringify(prota)).not.toContain('[object Object]');
    expect(JSON.stringify(promes)).not.toContain('[object Object]');
  });

  it('3. Penilaian, KKTP Dinamis, Backup/Restore asesmerdeka_topic_adj_v2, & Cloud Sync Merge Tanpa Hilang Data', () => {
    const profile = makeProfile({ kktpMinTuntas: 75 });
    const bank = lookupCuratedTopicBank('Seni Musik', 'Fase B (Kelas 3-4 SD)', '4', '1 (Ganjil)', {
      jenjang: 'SD/MI',
    });
    const tps = bank.topics.map((topic, i) =>
      buildCustomTPFromTopicEntry(topic, {
        mataPelajaran: 'Seni Musik',
        jenjangFase: 'Fase B (Kelas 3-4 SD)',
        jenjangCategory: 'SD/MI',
        cleanKelas: '4',
        semester: '1 (Ganjil)',
        nomorTP: i + 1,
        mingguMulai: i * 4 + 2,
        mingguSelesai: (i + 1) * 4 + 1,
        alokasiJP: 8,
        schoolId: profile.schoolId,
        tahunAjaran: profile.tahunAjaran,
      })
    );

    const blankRes = computeNilaiAkhir({}, null, null, tps, { kktpMinTuntas: 75 });
    expect(blankRes.na).toBeNull();
    expect(blankRes.statusNilai).toBe('belum_dinilai');
    expect(classifyPredikatKKTP(null, 75)).toBe('Belum Dinilai');
    expect(classifyMasteryStatusKKTP(null, 75)).toBe('Belum Dinilai');

    const zeroRes = computeNilaiAkhir({ [tps[0].id]: 0 }, 0, 0, [tps[0]], {
      kktpMinTuntas: 75,
    });
    expect(zeroRes.na).toBe(0);
    expect(zeroRes.statusNilai).toBe('lengkap');
    expect(classifyPredikatKKTP(0, 75)).toBe('Perlu Bimbingan');
    expect(classifyMasteryStatusKKTP(0, 75)).toBe('Perlu Bimbingan');

    expect(
      resolveEffectiveKKTPThreshold({
        tp: { ...tps[0], kktpMinTuntas: 82 },
        bobotPolicy: { kktpMinTuntas: 76 },
        schoolProfile: profile,
      })
    ).toBe(82);

    saveTopicAdjustment(
      profile,
      {
        topicId: bank.topics[0].topicId,
        originalTitle: bank.topics[0].judulTopik,
        proposedTitle: 'Penyesuaian Backup RC 9.0',
        pedagogicalReviewStatus: 'ditinjau_guru',
      },
      'Fase B (Kelas 3-4 SD)'
    );
    const localAdjStore = JSON.parse(
      globalThis.localStorage.getItem(TOPIC_ADJUSTMENT_STORAGE_V2_KEY) || '{}'
    );
    const backupJson = exportBackupDataJson();
    expect(backupJson).toContain(TOPIC_ADJUSTMENT_STORAGE_V2_KEY);

    globalThis.localStorage.clear();
    const restoreRes = importBackupDataJson(backupJson);
    expect(restoreRes.success).toBe(true);
    expect(
      getTopicAdjustment(profile, bank.topics[0].topicId, 'Fase B (Kelas 3-4 SD)')?.proposedTitle
    ).toBe('Penyesuaian Backup RC 9.0');

    const mergeRes = analyzeWorkspaceConflict(
      { [TOPIC_ADJUSTMENT_STORAGE_V2_KEY]: {} },
      { [TOPIC_ADJUSTMENT_STORAGE_V2_KEY]: localAdjStore },
      {
        [TOPIC_ADJUSTMENT_STORAGE_V2_KEY]: {
          sch_remote__b: {
            id: 'sch_remote__b',
            topicId: 'musik-fb-s2-penyajian-ansambel-daerah',
            proposedTitle: 'Penyesuaian Perangkat B',
          },
        },
      }
    );
    const mergedKeys = Object.keys(
      mergeRes.mergedEntries[TOPIC_ADJUSTMENT_STORAGE_V2_KEY] as Record<string, unknown>
    );
    expect(mergedKeys).toContain('sch_remote__b');
    expect(mergedKeys.length).toBe(2);
  });
});
