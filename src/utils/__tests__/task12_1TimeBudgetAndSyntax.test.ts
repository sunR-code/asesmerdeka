import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import type { ModulAjarDokumen } from '../../types/perangkatAjar';
import {
  COOPERATIVE_TECHNIQUE_VARIANTS,
  LEGACY_MODUL_MODEL_IDS,
  MODUL_AJAR_MODELS as CATALOG_MODELS,
  getAllSearchableModulModelIds,
  getModulAjarModelDefinition,
  isLegacyModulAjarModelId,
  isValidModulAjarModelType,
  type ModulAjarModelType,
} from '../modulPedagogicalModels';
import {
  MODUL_AJAR_MODELS as AI_SERVICE_MODELS,
  buildModulAjarGeminiPrompt,
  generateContextualModulAjarWithAI,
} from '../modulAjarAiService';
import {
  classifySMKSubjectTrack,
  computeMeetingsNeededForTP,
  computeSessionTotalMinutes,
  distributeActivitiesIntoMeetings,
  distributeStageDurations,
  normalizeJenjangKategori,
  reconcileSessionStageDurations,
  resolveModulTimePreset,
  validateModulTimeBudget,
  validateSessionTimeBudget,
} from '../modulTimeBudget';
import { saveSubjectJPConfig } from '../jpConfigStorage';
import { buildSmartModulAjar } from '../perangkatAjarEngine';
import {
  loadLatestModulAjarDraft,
  loadModulAjarDraft,
  saveModulAjarDraft,
} from '../perangkatDraftStorage';
import {
  exportBackupDataJson,
  importBackupDataJson,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { buildModulAjarDraftStorageKey } from '../storageIdentity';
import { analyzeWorkspaceConflict } from '../cloudSyncManager';
import { exportModulAjarToDocx } from '../docx/docxPerangkatAjar';
import { ModulAjarViewer } from '../../components/ModulAjarViewer';
import * as geminiClient from '../../services/geminiClient';

vi.mock('file-saver', () => ({
  default: vi.fn(),
}));

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
  (globalThis as unknown as { localStorage: LocalStorageMock }).localStorage =
    new LocalStorageMock();
}

function makeProfile(overrides?: Partial<SchoolProfile>): SchoolProfile {
  return {
    schoolId: 'sch_task12_1_test',
    instansiDinas: 'Dinas Pendidikan Uji',
    namaSekolah: 'Sekolah Uji Task 12.1',
    alamatSekolah: 'Jl. Kurikulum No. 12',
    namaGuru: 'Guru Uji, S.Pd.',
    nipGuru: '198801012015011001',
    namaKepalaSekolah: 'Kepala Uji, M.Pd.',
    nipKepalaSekolah: '197001011998011001',
    kotaSekolah: 'Yogyakarta',
    jenjang: 'SMP/MTs',
    kelasUtama: '8',
    mataPelajaranUtama: 'Matematika',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    rombelAktif: 'VIII-A',
    daftarRombel: ['VIII-A'],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

function makeTP(overrides?: Partial<CustomTPItem>): CustomTPItem {
  return {
    id: 'tpid_12_1',
    kode: 'TP-12.1',
    elemen: 'Bilangan',
    materiPokok: 'Fotosintesis pada Tumbuhan Hijau',
    tujuanPembelajaran:
      'Mengidentifikasi bahan dan hasil proses fotosintesis melalui pengamatan langsung.',
    arahanRangkuman: 'Fokus pada peran air, cahaya, karbon dioksida, dan klorofil.',
    alokasiJP: 6,
    mingguMulai: 1,
    mingguSelesai: 2,
    prasyarat: ['Bagian utama tumbuhan (akar, batang, daun)'],
    subTP: [
      {
        id: 'sub_1',
        kode: '12.1.A',
        kompetensi: 'Mengidentifikasi bahan utama fotosintesis',
        fokusMateri: 'Air, CO2, dan Cahaya',
        buktiKetercapaian: 'Mengelompokkan bahan fotosintesis dengan tepat.',
      },
      {
        id: 'sub_2',
        kode: '12.1.B',
        kompetensi: 'Menjelaskan hasil fotosintesis dan perannya',
        fokusMateri: 'Makanan Tumbuhan dan Oksigen',
        buktiKetercapaian: 'Menuliskan persamaan sederhana fotosintesis.',
      },
    ],
    ...overrides,
  };
}

describe('Task 12.1 — Time-Budget Engine & Pedagogical Syntax Foundation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // A. UNIT TESTS: TIME-BUDGET ENGINE & JPCONFIG REUSE
  // =========================================================================
  describe('A. Time-Budget Engine & Preset Waktu', () => {
    it('menghasilkan preset default SD 2 JP (70 mnt), SMP 3 JP (120 mnt), SMA 3 JP (135 mnt), SMK Umum 3 JP (135 mnt), dan SMK Kejuruan 4 JP (180 mnt)', () => {
      const sd = resolveModulTimePreset(
        makeProfile({ jenjang: 'SD/MI', kelasUtama: '4', mataPelajaranUtama: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)' })
      );
      expect(sd.jenjangKategori).toBe('SD/MI');
      expect(sd.jpPerPertemuan).toBe(2);
      expect(sd.menitPerJP).toBe(35);
      expect(sd.totalMenitPertemuan).toBe(70);

      const smp = resolveModulTimePreset(
        makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' })
      );
      expect(smp.jenjangKategori).toBe('SMP/MTs');
      expect(smp.jpPerPertemuan).toBe(3);
      expect(smp.menitPerJP).toBe(40);
      expect(smp.totalMenitPertemuan).toBe(120);

      const sma = resolveModulTimePreset(
        makeProfile({ jenjang: 'SMA/MA', kelasUtama: '10', mataPelajaranUtama: 'Bahasa Indonesia' })
      );
      expect(sma.jenjangKategori).toBe('SMA/MA');
      expect(sma.jpPerPertemuan).toBe(3);
      expect(sma.menitPerJP).toBe(45);
      expect(sma.totalMenitPertemuan).toBe(135);

      const smkUmum = resolveModulTimePreset(
        makeProfile({ jenjang: 'SMK', kelasUtama: '10', mataPelajaranUtama: 'Bahasa Indonesia' })
      );
      expect(smkUmum.jenjangKategori).toBe('SMK');
      expect(smkUmum.smkTrack).toBe('umum');
      expect(smkUmum.jpPerPertemuan).toBe(3);
      expect(smkUmum.menitPerJP).toBe(45);
      expect(smkUmum.totalMenitPertemuan).toBe(135);

      const smkMath = resolveModulTimePreset(
        makeProfile({ jenjang: 'SMK', kelasUtama: '10', mataPelajaranUtama: 'Matematika Kejuruan' })
      );
      expect(smkMath.smkTrack).toBe('umum');
      expect(smkMath.totalMenitPertemuan).toBe(135);

      const smkKejuruan1 = resolveModulTimePreset(
        makeProfile({ jenjang: 'SMK', kelasUtama: '10', mataPelajaranUtama: 'Projek IPAS (SMK)' })
      );
      expect(smkKejuruan1.smkTrack).toBe('kejuruan');
      expect(smkKejuruan1.jpPerPertemuan).toBe(4);
      expect(smkKejuruan1.menitPerJP).toBe(45);
      expect(smkKejuruan1.totalMenitPertemuan).toBe(180);

      const smkKejuruan2 = resolveModulTimePreset(
        makeProfile({
          jenjang: 'SMK',
          kelasUtama: '11',
          mataPelajaranUtama: 'Konsentrasi Keahlian Teknik Komputer & Jaringan (SMK)',
        })
      );
      expect(smkKejuruan2.smkTrack).toBe('kejuruan');
      expect(smkKejuruan2.jpPerPertemuan).toBe(4);
      expect(smkKejuruan2.totalMenitPertemuan).toBe(180);

      // Mapel SMK tidak dikenal -> aman 3 JP + flag pilihan manual + override kejuruan
      const smkUnknownProfile = makeProfile({
        jenjang: 'SMK',
        kelasUtama: '11',
        mataPelajaranUtama: 'Muatan Lokal Kustom Daerah',
      });
      expect(classifySMKSubjectTrack(smkUnknownProfile.mataPelajaranUtama)).toBe('tidak_teridentifikasi');
      const smkUnknown = resolveModulTimePreset(smkUnknownProfile);
      expect(smkUnknown.needsManualTrackSelection).toBe(true);
      expect(smkUnknown.jpPerPertemuan).toBe(3);
      expect(smkUnknown.totalMenitPertemuan).toBe(135);

      const smkManualKejuruan = resolveModulTimePreset(smkUnknownProfile, {
        smkTrackOverride: 'kejuruan',
      });
      expect(smkManualKejuruan.needsManualTrackSelection).toBe(false);
      expect(smkManualKejuruan.smkTrack).toBe('kejuruan');
      expect(smkManualKejuruan.jpPerPertemuan).toBe(4);
      expect(smkManualKejuruan.totalMenitPertemuan).toBe(180);
    });

    it('mempertahankan konfigurasi sekolah yang sudah dikonfirmasi di jpConfigStorage serta mendukung custom JP & custom durasi', () => {
      const profile = makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'IPA' });
      saveSubjectJPConfig(
        profile,
        { jpPerMinggu: 6, pertemuanPerMinggu: 3, durasiJPMinut: 35 },
        true
      );

      const fromSchool = resolveModulTimePreset(profile);
      expect(fromSchool.sumberPreset).toBe('konfigurasi_sekolah');
      expect(fromSchool.jpPerPertemuan).toBe(2); // 6 / 3 = 2 JP
      expect(fromSchool.menitPerJP).toBe(35);
      expect(fromSchool.totalMenitPertemuan).toBe(70);

      const customGuru = resolveModulTimePreset(profile, { jpPerPertemuan: 4, menitPerJP: 45 });
      expect(customGuru.sumberPreset).toBe('override_guru');
      expect(customGuru.jpPerPertemuan).toBe(4);
      expect(customGuru.menitPerJP).toBe(45);
      expect(customGuru.totalMenitPertemuan).toBe(180);
      expect(computeSessionTotalMinutes(4, 45)).toBe(180);
    });

    it('membedakan alokasi JP TP dari JP per pertemuan dan membagi beberapa pertemuan dengan tepat', () => {
      const plan1 = computeMeetingsNeededForTP(6, 3, 40);
      expect(plan1.totalAlokasiJPTP).toBe(6);
      expect(plan1.jpPerPertemuan).toBe(3);
      expect(plan1.jumlahPertemuanDisarankan).toBe(2);
      expect(plan1.jumlahPertemuanAktif).toBe(2);
      expect(plan1.totalMenitPertemuan).toBe(120);
      expect(plan1.totalJPTercakup).toBe(6);

      const plan2 = computeMeetingsNeededForTP(8, 3, 45);
      expect(plan2.jumlahPertemuanDisarankan).toBe(3);
      expect(plan2.pertemuanList).toHaveLength(3);

      const customPlan = computeMeetingsNeededForTP(4, 2, 35, 3);
      expect(customPlan.jumlahPertemuanDisarankan).toBe(2);
      expect(customPlan.jumlahPertemuanAktif).toBe(3);

      const slices = distributeActivitiesIntoMeetings({
        tp: makeTP({ alokasiJP: 6 }),
        jumlahPertemuan: 2,
        jpPerPertemuan: 3,
        menitPerJP: 40,
      });
      expect(slices).toHaveLength(2);
      expect(slices[0].targetSubTPPertemuan[0].kode).toBe('12.1.A');
      expect(slices[1].targetSubTPPertemuan[0].kode).toBe('12.1.B');
    });

    it('memastikan sum(durasiMenit seluruh tahap pada satu pertemuan) === jpPerPertemuan * menitPerJP untuk seluruh 7 model, seluruh jenjang, dan durasi kustom', () => {
      const jenjangProfiles: SchoolProfile[] = [
        makeProfile({ jenjang: 'SD/MI', kelasUtama: '4', mataPelajaranUtama: 'IPAS' }),
        makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' }),
        makeProfile({ jenjang: 'SMA/MA', kelasUtama: '10', mataPelajaranUtama: 'Bahasa Indonesia' }),
        makeProfile({ jenjang: 'SMK', kelasUtama: '10', mataPelajaranUtama: 'Bahasa Inggris Profesi' }),
        makeProfile({ jenjang: 'SMK', kelasUtama: '11', mataPelajaranUtama: 'Produk Kreatif dan Kewirausahaan (PKK)' }),
      ];

      for (const profile of jenjangProfiles) {
        const expectedPreset = resolveModulTimePreset(profile);
        for (const modelDef of CATALOG_MODELS) {
          const modul = buildSmartModulAjar(makeTP({ alokasiJP: 4 }), profile, {
            model: modelDef.id,
          });
          expect(modul.alokasiWaktuDetail?.totalMenitPertemuan).toBe(
            expectedPreset.totalMenitPertemuan
          );
          const validation = validateModulTimeBudget(modul, profile);
          expect(validation.isValid).toBe(true);
          for (const keg of modul.kegiatanPembelajaran) {
            const sum = (keg.tahapTerstruktur || []).reduce(
              (acc, s) => acc + s.durasiMenit,
              0
            );
            expect(sum).toBe(expectedPreset.jpPerPertemuan * expectedPreset.menitPerJP);
          }
        }
      }

      // Uji kombinasi kustom (termasuk non-kelipatan 5 seperti 3 × 37 = 111 menit dan 1 × 25 = 25 menit)
      for (const [jp, mnt] of [
        [1, 25],
        [2, 35],
        [3, 37],
        [4, 45],
        [6, 45],
      ]) {
        const modelDef = getModulAjarModelDefinition('discovery');
        const dist = distributeStageDurations(jp * mnt, modelDef.tahapanSintaks);
        const total =
          dist.pendahuluanMenit +
          dist.penutupMenit +
          Object.values(dist.intiMenitMap).reduce((a, b) => a + b, 0);
        expect(total).toBe(jp * mnt);

        const modulCustom = buildSmartModulAjar(makeTP(), jenjangProfiles[1], {
          model: 'discovery',
          jpPerPertemuan: jp,
          menitPerJP: mnt,
          jumlahPertemuan: 1,
        });
        const vCustom = validateSessionTimeBudget(modulCustom.kegiatanPembelajaran[0], jp, mnt);
        expect(vCustom.isValid).toBe(true);
        expect(vCustom.actualTotalMenit).toBe(jp * mnt);
      }
    });

    it('mengubah jenjang mengubah preset alokasi waktu secara tepat', () => {
      expect(normalizeJenjangKategori('SD/MI')).toBe('SD/MI');
      expect(normalizeJenjangKategori('SMP/MTs')).toBe('SMP/MTs');
      expect(normalizeJenjangKategori('SMA/MA')).toBe('SMA/MA');
      expect(normalizeJenjangKategori('SMK/MAK')).toBe('SMK');

      const asSD = resolveModulTimePreset(makeProfile({ jenjang: 'SD/MI', kelasUtama: '4', mataPelajaranUtama: 'Matematika' }));
      const asSMP = resolveModulTimePreset(makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' }));
      const asSMA = resolveModulTimePreset(makeProfile({ jenjang: 'SMA/MA', kelasUtama: '10', mataPelajaranUtama: 'Matematika' }));

      expect(asSD.totalMenitPertemuan).toBe(70);
      expect(asSMP.totalMenitPertemuan).toBe(120);
      expect(asSMA.totalMenitPertemuan).toBe(135);

      // Micro-TP alokasiJP = 2 pada SMP tidak meluap ke 3 JP secara otomatis, namun TP >= 3 JP memakai default 3 JP & override eksplisit tetap diutamakan
      const microSMP = buildSmartModulAjar(
        makeTP({ alokasiJP: 2 }),
        makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' })
      );
      expect(microSMP.alokasiWaktuDetail?.totalMenitPertemuan).toBe(80);
      const overrideMicroSMP = buildSmartModulAjar(
        makeTP({ alokasiJP: 2 }),
        makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'Matematika' }),
        { jpPerPertemuan: 3 }
      );
      expect(overrideMicroSMP.alokasiWaktuDetail?.totalMenitPertemuan).toBe(120);

      // Rekonsiliasi durasi tahap saat guru mengubah durasi pertemuan menjaga seluruh tahap >= 1 menit & jumlah tepat
      const scaled = reconcileSessionStageDurations(
        overrideMicroSMP.kegiatanPembelajaran[0].tahapTerstruktur!,
        90
      );
      expect(scaled.every((s) => s.durasiMenit >= 1)).toBe(true);
      expect(scaled.reduce((acc, s) => acc + s.durasiMenit, 0)).toBe(90);
    });
  });

  // =========================================================================
  // B. PEDAGOGICAL TESTS: 7 MODELS, STRUCTURAL DIFFERENCE, FALLBACK & GRADE TONE
  // =========================================================================
  describe('B. Katalog 7 Model Pedagogik, Fallback & Kesesuaian Jenjang', () => {
    it('menggunakan satu sumber kebenaran untuk 7 model aktif tanpa mencampur Inquiry vs Discovery ataupun menjadikan Diferensiasi model sintaks', () => {
      expect(CATALOG_MODELS).toHaveLength(7);
      expect(AI_SERVICE_MODELS).toBe(CATALOG_MODELS);

      const ids = CATALOG_MODELS.map((m) => m.id);
      expect(ids).toEqual([
        'pbl',
        'pjbl',
        'inquiry',
        'discovery',
        'cooperative',
        'explicit',
        'kontekstual',
      ]);
      expect(isValidModulAjarModelType('diferensiasi')).toBe(false);
      expect(isLegacyModulAjarModelId('diferensiasi')).toBe(true);
      expect(LEGACY_MODUL_MODEL_IDS).toContain('diferensiasi');

      // Tidak ada dua model yang punya daftar nama tahap sintaks identik
      const signatureSet = new Set(CATALOG_MODELS.map((m) => m.sintaksUtama.join('|')));
      expect(signatureSet.size).toBe(7);

      // Inquiry !== Discovery
      const inq = getModulAjarModelDefinition('inquiry');
      const disc = getModulAjarModelDefinition('discovery');
      expect(inq.sintaksUtama).not.toEqual(disc.sintaksUtama);
      expect(disc.sintaksUtama.join(' ')).toContain('Stimulation');
      expect(disc.sintaksUtama.join(' ')).toContain('Generalization');
      expect(inq.sintaksUtama.join(' ')).toContain('Pertanyaan Penyelidikan');
    });

    it('menghasilkan tahapan terstruktur 8 atribut yang benar-benar berbeda per model dan variasi Cooperative tanpa memaksa tag PM di semua tahap', () => {
      const profile = makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'IPA' });
      const tp = makeTP({ alokasiJP: 3 });

      const byModel = {} as Record<ModulAjarModelType, ModulAjarDokumen>;
      for (const m of CATALOG_MODELS) {
        const doc = buildSmartModulAjar(tp, profile, { model: m.id, jumlahPertemuan: 1 });
        byModel[m.id] = doc;
        expect(doc.modelType).toBe(m.id);
        expect(doc.sintaksModelId).toBe(m.id);

        const stages = doc.kegiatanPembelajaran[0].tahapTerstruktur || [];
        const intiStages = stages.filter((s) => s.fase === 'inti');
        expect(intiStages).toHaveLength(m.tahapanSintaks.length);

        intiStages.forEach((st, idx) => {
          expect(st.namaTahap).toContain(m.tahapanSintaks[idx].namaTahap);
          expect(st.tujuanTahap.trim().length).toBeGreaterThan(10);
          expect(st.aktivitasGuru.trim().length).toBeGreaterThan(10);
          expect(st.aktivitasSiswa.trim().length).toBeGreaterThan(10);
          expect(st.instruksiPertanyaan.trim().length).toBeGreaterThan(10);
          expect(st.mediaBahan.trim().length).toBeGreaterThan(5);
          expect(st.buktiBelajar.trim().length).toBeGreaterThan(5);
          expect(st.durasiMenit).toBeGreaterThan(0);
        });

        // Pemetaan PM bersifat opsional — ada tahap yang tidak dipaksa punya keduanya
        const allHaveBothPMTags = stages.every(
          (st) => Boolean(st.pengalamanBelajar) && (st.prinsipPembelajaran?.length ?? 0) > 0
        );
        expect(allHaveBothPMTags).toBe(false);
      }

      // PjBL !== PBL
      const pblInti = byModel.pbl.kegiatanPembelajaran[0].tahapTerstruktur!
        .filter((s) => s.fase === 'inti')
        .map((s) => s.namaTahap);
      const pjblInti = byModel.pjbl.kegiatanPembelajaran[0].tahapTerstruktur!
        .filter((s) => s.fase === 'inti')
        .map((s) => s.namaTahap);
      expect(pjblInti).not.toEqual(pblInti);
      expect(pjblInti.join(' ')).toContain('Jadwal');
      expect(pjblInti.join(' ')).toContain('Produk');

      // Inquiry !== Discovery
      const inqInti = byModel.inquiry.kegiatanPembelajaran[0].tahapTerstruktur!
        .filter((s) => s.fase === 'inti')
        .map((s) => s.namaTahap);
      const discInti = byModel.discovery.kegiatanPembelajaran[0].tahapTerstruktur!
        .filter((s) => s.fase === 'inti')
        .map((s) => s.namaTahap);
      expect(inqInti).not.toEqual(discInti);

      // Explicit Instruction memuat I Do / We Do / You Do
      const expText = byModel.explicit.kegiatanPembelajaran[0].tahapTerstruktur!
        .map((s) => `${s.namaTahap} ${s.aktivitasGuru}`)
        .join(' ');
      expect(expText).toContain('I Do');
      expect(expText).toContain('We Do');
      expect(expText).toContain('You Do');

      // CTL mempertahankan konteks nyata
      const ctlText = byModel.kontekstual.kegiatanPembelajaran[0].tahapTerstruktur!
        .map((s) => s.namaTahap)
        .join(' ');
      expect(ctlText).toContain('Konstruktivisme');
      expect(ctlText).toContain('Masyarakat Belajar');

      // Cooperative variations: Think-Pair-Share, Jigsaw, STAD
      expect(COOPERATIVE_TECHNIQUE_VARIANTS).toEqual(['Think-Pair-Share', 'Jigsaw', 'STAD']);
      const jigsawDoc = buildSmartModulAjar(tp, profile, {
        model: 'cooperative',
        variasiTeknikModel: 'Jigsaw',
      });
      expect(jigsawDoc.variasiTeknikModel).toBe('Jigsaw');
      expect(
        jigsawDoc.kegiatanPembelajaran[0].tahapTerstruktur!.map((s) => s.aktivitasSiswa).join(' ')
      ).toContain('Kelompok Ahli');
    });

    it('memastikan fallback generateContextualModulAjarWithAI dan prompt AI memakai model serta alokasi waktu terpilih, bukan PBL 2 pertemuan', async () => {
      vi.spyOn(geminiClient, 'callGeminiStructuredJSON').mockRejectedValueOnce(
        new Error('Network offline test')
      );

      const sdProfile = makeProfile({
        jenjang: 'SD/MI',
        kelasUtama: '4',
        mataPelajaranUtama: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
      });
      const tpSD = makeTP({ alokasiJP: 2 });

      const prompt = buildModulAjarGeminiPrompt(tpSD, sdProfile, 'discovery');
      expect(prompt).toContain('Discovery Learning');
      expect(prompt).toContain('70 Menit');
      expect(prompt).toContain('DILARANG memakai istilah "dunia kerja"');

      const res = await generateContextualModulAjarWithAI(tpSD, sdProfile, 'discovery');
      expect(res.usedFallback).toBe(true);
      expect(res.modul.modelType).toBe('discovery');
      expect(res.modul.jumlahPertemuan).toBe(1);
      expect(res.modul.alokasiWaktuDetail?.totalMenitPertemuan).toBe(70);
      const stageNames = res.modul.kegiatanPembelajaran[0].tahapTerstruktur!.map((s) => s.namaTahap);
      expect(stageNames.join(' ')).toContain('Stimulation');
      expect(stageNames.join(' ')).not.toContain('Orientasi pada Masalah Autentik');

      // Test AI path dengan tahapTerstruktur yang durasinya meleset -> otomatis direkonsiliasi tepat 120 menit
      vi.spyOn(geminiClient, 'callGeminiStructuredJSON').mockResolvedValueOnce({
        judul: 'Modul Uji AI Rekonsiliasi',
        kegiatanPembelajaran: [
          {
            pertemuan: 1,
            alokasiMenit: 100,
            tahapTerstruktur: [
              {
                fase: 'pendahuluan',
                namaTahap: 'Pembuka',
                tujuanTahap: 'Siap belajar',
                aktivitasGuru: 'Guru mengecek kesiapan',
                aktivitasSiswa: 'Siswa menjawab pemanasan',
                instruksiPertanyaan: 'Siap?',
                mediaBahan: 'Papan',
                durasiMenit: 10,
                buktiBelajar: 'Respon',
              },
              {
                fase: 'inti',
                namaTahap: '1. Tahap Inti AI',
                tujuanTahap: 'Eksplorasi',
                aktivitasGuru: 'Guru memandu pengamatan',
                aktivitasSiswa: 'Siswa mencatat hasil',
                instruksiPertanyaan: 'Mengapa?',
                mediaBahan: 'LKPD',
                durasiMenit: 30,
                buktiBelajar: 'Tabel',
              },
              {
                fase: 'penutup',
                namaTahap: 'Penutup',
                tujuanTahap: 'Refleksi',
                aktivitasGuru: 'Guru menyimpulkan',
                aktivitasSiswa: 'Siswa mengisi exit ticket',
                instruksiPertanyaan: 'Apa hasilnya?',
                mediaBahan: 'Kartu',
                durasiMenit: 10,
                buktiBelajar: 'Exit ticket',
              },
            ],
          },
        ],
      });

      const smpProfile = makeProfile({ jenjang: 'SMP/MTs', kelasUtama: '8', mataPelajaranUtama: 'IPA' });
      const aiRes = await generateContextualModulAjarWithAI(makeTP({ alokasiJP: 3 }), smpProfile, 'inquiry');
      expect(aiRes.usedFallback).toBe(false);
      const totalReconciled = aiRes.modul.kegiatanPembelajaran[0].tahapTerstruktur!.reduce(
        (sum, s) => sum + s.durasiMenit,
        0
      );
      expect(totalReconciled).toBe(120);
    });

    it('menyesuaikan bahasa dengan jenjang: modul SD bebas istilah "dunia kerja/industri/bengkel" dan modul SMK Kejuruan menyertakan prosedur/K3', () => {
      const sdProfile = makeProfile({
        jenjang: 'SD/MI',
        kelasUtama: '4',
        mataPelajaranUtama: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
      });
      const tpSD = makeTP({ alokasiJP: 2 });

      for (const m of CATALOG_MODELS) {
        const modSD = buildSmartModulAjar(tpSD, sdProfile, { model: m.id });
        const serialized = JSON.stringify(modSD).toLowerCase();
        expect(serialized).not.toMatch(/\bdunia kerja\b|\bindustri\b|\bbengkel\b|\bk3 bengkel\b/);
      }

      const smkKejuruan = makeProfile({
        jenjang: 'SMK',
        kelasUtama: '11',
        mataPelajaranUtama: 'Produk Kreatif dan Kewirausahaan (PKK)',
      });
      const modSMK = buildSmartModulAjar(
        makeTP({
          materiPokok: 'Perakitan Prototipe Kemasan Produk',
          tujuanPembelajaran: 'Membuat prototipe kemasan sesuai standar mutu dan K3.',
          alokasiJP: 4,
        }),
        smkKejuruan,
        { model: 'explicit' }
      );
      expect(modSMK.alokasiWaktuDetail?.totalMenitPertemuan).toBe(180);
      expect(JSON.stringify(modSMK)).toContain('K3');
      expect(modSMK.glosarium.some((g) => g.istilah.includes('Perakitan Prototipe'))).toBe(true);
      expect(modSMK.glosarium.some((g) => g.istilah === 'Capaian Pembelajaran (CP)')).toBe(false);
    });
  });

  // =========================================================================
  // C. BACKWARD COMPATIBILITY: LEGACY DRAFTS, STORAGE, BACKUP & CLOUD SYNC
  // =========================================================================
  describe('C. Backward Compatibility, Ekspor DOCX & Cloud Sync', () => {
    it('membuka, merender UI, menyimpan ulang, dan mengekspor DOCX draf lama tanpa tahapTerstruktur serta draf legacy modelType="diferensiasi"', async () => {
      const profile = makeProfile();
      const tp = makeTP({ id: 'tp_legacy_1', kode: 'TP-L1' });

      const legacyUnstructured: ModulAjarDokumen = {
        id: 'modul-legacy-unstructured',
        tpId: tp.id,
        modelType: 'diferensiasi',
        draftSource: 'user_edited',
        schoolId: profile.schoolId,
        judul: 'Modul Lama Berdiferensiasi',
        mataPelajaran: profile.mataPelajaranUtama,
        jenjangFase: 'Fase D (Kelas 7-9 SMP)',
        kelas: profile.kelasUtama,
        rombel: profile.rombelAktif,
        semester: profile.semester,
        tahunAjaran: profile.tahunAjaran,
        alokasiWaktu: '3 JP (120 Menit)',
        jumlahPertemuan: 1,
        namaSekolah: profile.namaSekolah,
        namaGuru: profile.namaGuru,
        nipGuru: profile.nipGuru,
        namaKepalaSekolah: profile.namaKepalaSekolah,
        nipKepalaSekolah: profile.nipKepalaSekolah,
        kotaSekolah: profile.kotaSekolah,
        createdAt: '10 November 2026',
        tpKode: tp.kode,
        materiPokok: tp.materiPokok,
        elemen: tp.elemen,
        tujuanPembelajaran: tp.tujuanPembelajaran,
        kompetensiAwal: ['Mengetahui bagian tumbuhan'],
        profilPelajarPancasila: ['Bernalar Kritis'],
        saranaPrasarana: ['Papan tulis'],
        targetPesertaDidik: 'Reguler',
        modelPembelajaran: 'Pembelajaran Berdiferensiasi (Konten, Proses, Produk)',
        pemahamanBermakna: 'Tumbuhan berperan menjaga oksigen.',
        pertanyaanPemantik: ['Bagaimana tumbuhan membuat makanan?'],
        kegiatanPembelajaran: [
          {
            pertemuan: 1,
            alokasiMenit: 120,
            pendahuluan: ['Salam dan apersepsi lama'],
            inti: ['Aktivitas stasiun belajar berdiferensiasi lama'],
            penutup: ['Refleksi lama'],
          },
        ],
        asesmen: {
          diagnostik: 'Tanya jawab awal',
          formatif: 'Cek diskusi',
          sumatif: 'Tes tertulis',
        },
        rubrikPenilaianSingkat: [
          {
            kriteria: 'Pemahaman Konsep',
            baruBerkembang: 'Perlu bimbingan',
            layak: 'Cukup memahami',
            cakap: 'Memahami dengan baik',
            mahir: 'Menganalisis mendalam',
          },
        ],
        pengayaanDanRemedial: {
          pengayaan: 'Tugas pengayaan lama',
          remedial: 'Bimbingan remedial lama',
        },
        refleksiGuru: ['Apakah waktu cukup?'],
        refleksiSiswa: ['Apa yang dipelajari?'],
        glosarium: [{ istilah: 'Fotosintesis', definisi: 'Pembuatan makanan pada daun.' }],
        daftarPustaka: ['Buku sekolah'],
      };

      // 1. Simpan sebagai draf legacy & verifikasi lookup menemukan model 'diferensiasi'
      expect(getAllSearchableModulModelIds()).toContain('diferensiasi');
      saveModulAjarDraft(profile, tp, 'diferensiasi', legacyUnstructured, 'user_edited');

      const latest = loadLatestModulAjarDraft(profile, tp);
      expect(latest).not.toBeNull();
      expect(latest?.variant).toBe('diferensiasi');
      expect(latest?.doc.kegiatanPembelajaran[0].inti[0]).toBe(
        'Aktivitas stasiun belajar berdiferensiasi lama'
      );

      // 2. Render di ModulAjarViewer tanpa crash & tampilkan langkah legacy
      const htmlLegacy = renderToStaticMarkup(
        React.createElement(ModulAjarViewer, {
          modul: latest!.doc,
          schoolProfile: profile,
          customTP: tp,
          onPrint: vi.fn(),
          onBackToClassHub: vi.fn(),
        })
      );
      expect(htmlLegacy).toContain('Aktivitas stasiun belajar berdiferensiasi lama');
      expect(htmlLegacy).toContain('label model lama');
      expect(htmlLegacy).not.toContain('undefined');

      // 3. Simpan ulang & ekspor DOCX draf legacy
      await exportModulAjarToDocx(latest!.doc, profile);
      const legacyCalls = vi.mocked(saveAs).mock.calls;
      const blobLegacy = legacyCalls[legacyCalls.length - 1]?.[0] as Blob;
      expect(blobLegacy).toBeDefined();
      expect(blobLegacy.size).toBeGreaterThan(1000);
      const xmlLegacy = await (await JSZip.loadAsync(await blobLegacy.arrayBuffer()))
        .file('word/document.xml')!
        .async('text');
      expect(xmlLegacy).toContain('Aktivitas stasiun belajar berdiferensiasi lama');
      expect(xmlLegacy).not.toContain('undefined');
      expect(xmlLegacy).not.toContain('[object Object]');

      // 4. Render & ekspor DOCX draf terstruktur baru (Discovery SD 70 mnt)
      const sdProfile = makeProfile({
        jenjang: 'SD/MI',
        kelasUtama: '4',
        mataPelajaranUtama: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
      });
      const newDoc = buildSmartModulAjar(makeTP({ alokasiJP: 2 }), sdProfile, {
        model: 'discovery',
      });
      const htmlNew = renderToStaticMarkup(
        React.createElement(ModulAjarViewer, {
          modul: newDoc,
          schoolProfile: sdProfile,
          customTP: makeTP({ alokasiJP: 2 }),
          onPrint: vi.fn(),
          onBackToClassHub: vi.fn(),
        })
      );
      expect(htmlNew).toContain('Stimulation (Pemberian Rangsangan)');
      expect(htmlNew).toContain('Total 70 mnt/pertemuan');
      expect(htmlNew).toContain('Aktivitas Guru:');

      await exportModulAjarToDocx(newDoc, sdProfile);
      const calls = vi.mocked(saveAs).mock.calls;
      const lastBlob = calls[calls.length - 1]?.[0] as Blob;
      const xmlNew = await (await JSZip.loadAsync(await lastBlob.arrayBuffer()))
        .file('word/document.xml')!
        .async('text');
      expect(xmlNew).toContain('Stimulation (Pemberian Rangsangan)');
      expect(xmlNew).toContain('Aktivitas Guru:');
      expect(xmlNew).not.toContain('undefined');
      expect(xmlNew).not.toContain('[object Object]');
    });

    it('menjaga field baru pada Backup/Restore JSON dan Cloud Sync 3-way merge tanpa kehilangan data', () => {
      const profile = makeProfile({ jenjang: 'SMA/MA', kelasUtama: '10', mataPelajaranUtama: 'Fisika' });
      const tp = makeTP({ id: 'tp_sync_1', kode: '10.1', alokasiJP: 3 });

      const newModul = buildSmartModulAjar(tp, profile, {
        model: 'cooperative',
        variasiTeknikModel: 'Jigsaw',
      });
      const saved = saveModulAjarDraft(profile, tp, 'cooperative', newModul, 'template');
      expect(saved.ok).toBe(true);

      const draftKey = buildModulAjarDraftStorageKey(profile, tp.id, 'cooperative');
      const backupRaw = exportBackupDataJson();
      localStorage.clear();
      const restored = importBackupDataJson(backupRaw);
      expect(restored.success).toBe(true);

      const loadedAfterRestore = loadModulAjarDraft(profile, tp, 'cooperative');
      expect(loadedAfterRestore).not.toBeNull();
      expect(loadedAfterRestore?.sintaksModelId).toBe('cooperative');
      expect(loadedAfterRestore?.variasiTeknikModel).toBe('Jigsaw');
      expect(loadedAfterRestore?.alokasiWaktuDetail?.totalMenitPertemuan).toBe(135);
      expect(loadedAfterRestore?.kegiatanPembelajaran[0].tahapTerstruktur?.length).toBe(7);

      // Cloud Sync 3-way merge dengan draf lokal baru vs server base kosong
      const baseEntries: Record<string, unknown> = {};
      const localEntries: Record<string, unknown> = {
        [draftKey]: loadedAfterRestore,
      };
      const serverEntries: Record<string, unknown> = {
        asesmerdeka_custom_tp_v2: { scope1: [tp] },
      };

      const mergeResult = analyzeWorkspaceConflict(baseEntries, localEntries, serverEntries);
      expect(mergeResult.conflicts).toHaveLength(0);
      const syncedModul = mergeResult.mergedEntries[draftKey] as ModulAjarDokumen;
      expect(syncedModul.alokasiWaktuDetail?.totalMenitPertemuan).toBe(135);
      expect(syncedModul.kegiatanPembelajaran[0].tahapTerstruktur?.length).toBe(7);
      expect(validateModulTimeBudget(syncedModul, profile).isValid).toBe(true);
    });
  });
});
