import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getSemesterCurriculumPlan, type JenjangKategori } from '../kurikulumCatalog';
import {
  jenjangToDefaultFase,
  type CustomTPItem,
  type SchoolProfile,
} from '../schoolProfileStorage';
import { buildSmartLKPD, buildSmartModulAjar } from '../perangkatAjarEngine';
import { validateLKPDDokumen } from '../lkpdValidator';
import { LKPDViewer } from '../../components/LKPDViewer';

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

function makeProfile(
  jenjang: JenjangKategori,
  kelasUtama: string,
  mataPelajaranUtama: string,
  semester: '1 (Ganjil)' | '2 (Genap)' = '1 (Ganjil)'
): SchoolProfile {
  return {
    schoolId: `sch_task12_2_2_${jenjang.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    instansiDinas: 'Dinas Pendidikan Uji',
    namaSekolah: `Sekolah Uji ${jenjang}`,
    alamatSekolah: 'Jl. Pendidikan No. 1',
    namaGuru: 'Guru Uji, S.Pd.',
    nipGuru: '198001012010011001',
    namaKepalaSekolah: 'Kepala Sekolah Uji, M.Pd.',
    nipKepalaSekolah: '197501012000011001',
    kotaSekolah: 'Yogyakarta',
    jenjang,
    kelasUtama,
    mataPelajaranUtama,
    semester,
    tahunAjaran: '2026/2027',
    rombelAktif: `${kelasUtama}-A`,
    daftarRombel: [`${kelasUtama}-A`],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
  };
}

function makeCustomSainsTP(id: string, materiPokok: string, tujuanPembelajaran: string): CustomTPItem {
  return {
    id,
    kode: '4.99',
    elemen: 'Pemahaman Sains',
    materiPokok,
    tujuanPembelajaran,
    arahanRangkuman: materiPokok,
    alokasiJP: 4,
    mingguMulai: 1,
    mingguSelesai: 2,
  };
}

describe('Task 12.2.2 — Akurasi Konten Fixture LKPD (SD IPAS Fotosintesis & SMK PKK)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Bug A (Positif Fotosintesis): SD Kelas 4 IPAS TP 4.1 memilih stimulus tumbuhan & fotosintesis across seluruh preset dan Modul Ajar', () => {
    const profile = makeProfile('SD/MI', '4', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', '1 (Ganjil)');
    const plan = getSemesterCurriculumPlan(
      profile.mataPelajaranUtama,
      jenjangToDefaultFase(profile.jenjang, profile.kelasUtama),
      profile.kelasUtama,
      profile.semester
    );
    const fotosintesisTP = plan.tpList.find((tp) => /fotosintesis/i.test(tp.materiPokok))!;
    expect(fotosintesisTP).toBeDefined();

    for (const preset of ['kasus', 'eksperimen', 'diferensiasi', 'proyek'] as const) {
      const lkpd = buildSmartLKPD(fotosintesisTP, profile, preset);
      const serialized = JSON.stringify(lkpd);

      expect(lkpd.catatanValidasi?.isCuratedFixture).toBe(true);
      expect(lkpd.catatanValidasi?.status).toBe('valid_terkurasi');
      expect(lkpd.stimulusKasus.judul).toMatch(/tanaman hijau|fotosintesis/i);
      expect(lkpd.stimulusKasus.judul).not.toMatch(/perubahan wujud es/i);
      expect(serialized).toMatch(/fotosintesis|klorofil|daun|akar|cahaya matahari/i);
      expect(serialized).not.toMatch(/perubahan wujud es|es batu|mencair/i);

      const validation = validateLKPDDokumen(lkpd, fotosintesisTP, profile, {
        sourceMode: 'curated',
      });
      expect(validation.issues).toEqual([]);
      expect(validation.warnings).toEqual([]);
    }

    const modul = buildSmartModulAjar(fotosintesisTP, profile);
    const modulLkpdText = JSON.stringify(modul.contohLKPD);
    expect(modulLkpdText).toMatch(/tanaman|fotosintesis|daun|akar/i);
    expect(modulLkpdText).not.toMatch(/perubahan wujud es|es batu|mencair/i);
  });

  it('2. Bug A (Negatif Regex): kata mengandung substring es/ph/sel serta SD+larutan dan SMA Fotosintesis tidak salah memicu fixture lain', () => {
    const sdProfile = makeProfile('SD/MI', '4', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', '1 (Ganjil)');
    const smpIpaProfile = makeProfile('SMP/MTs', '8', 'IPA (Ilmu Pengetahuan Alam)', '1 (Ganjil)');
    const smaBioProfile = makeProfile('SMA/MA', '11', 'Biologi', '1 (Ganjil)');

    const sdNegativeCases = [
      makeCustomSainsTP(
        'neg-proses-air',
        'Proses Daur Air di Alam',
        'Mengurutkan tahapan evaporasi, kondensasi, dan presipitasi pada siklus air.'
      ),
      makeCustomSainsTP(
        'neg-proses-hewan',
        'Proses Perkembangbiakan Hewan',
        'Membedakan perkembangbiakan ovipar, vivipar, dan ovovivipar.'
      ),
      makeCustomSainsTP(
        'neg-sd-larutan',
        'Larutan Gula Sederhana di Dapur',
        'Mengamati pelarutan gula dan garam dalam air hangat di rumah.'
      ),
      makeCustomSainsTP(
        'neg-sd-sel',
        'Seluruh Ekosistem Pantai Selatan',
        'Mengidentifikasi komponen biotik dan abiotik di wilayah pesisir.'
      ),
    ];

    for (const tp of sdNegativeCases) {
      const lkpd = buildSmartLKPD(tp, sdProfile, 'kasus');
      expect(lkpd.catatanValidasi?.isCuratedFixture).toBe(false);
      expect(lkpd.stimulusKasus.judul).not.toMatch(/perubahan wujud es|lakmus|potongan kentang/i);
    }

    const smpPhCases = [
      makeCustomSainsTP(
        'neg-ph-metamorphosis',
        'Metamorphosis dan Ekosistem',
        'Membandingkan tahapan metamorphosis sempurna dan tidak sempurna.'
      ),
      makeCustomSainsTP(
        'neg-ph-chlorophyll',
        'Chlorophyll pada Tumbuhan',
        'Mengamati peran pigmen chlorophyll dalam menyerap cahaya.'
      ),
    ];

    for (const tp of smpPhCases) {
      const lkpd = buildSmartLKPD(tp, smpIpaProfile, 'kasus');
      expect(lkpd.catatanValidasi?.isCuratedFixture).toBe(false);
      expect(lkpd.stimulusKasus.judul).not.toMatch(/lakmus/i);
    }

    const bioSelNegativeCases = [
      makeCustomSainsTP(
        'neg-bio-seleksi',
        'Seleksi Alam dan Mekanisme Evolusi',
        'Menganalisis adaptasi dan seleksi alam pada populasi makhluk hidup.'
      ),
      makeCustomSainsTP(
        'neg-bio-selatan',
        'Pengamatan Seluruh Ekosistem Selatan',
        'Mengevaluasi keanekaragaman hayati wilayah selatan Indonesia.'
      ),
    ];

    for (const tp of bioSelNegativeCases) {
      const lkpd = buildSmartLKPD(tp, smaBioProfile, 'kasus');
      expect(lkpd.catatanValidasi?.isCuratedFixture).toBe(false);
      expect(lkpd.stimulusKasus.judul).not.toMatch(/potongan kentang/i);
    }

    // SMA Biologi Fotosintesis (Siklus Calvin) tidak boleh memakai fixture tanaman pot SD
    const bioPlan = getSemesterCurriculumPlan('Biologi', 'Fase F', '11', '1 (Ganjil)');
    const bioFotoTP = bioPlan.tpList.find((tp) => /fotosintesis|enzim/i.test(tp.materiPokok))!;
    expect(bioFotoTP).toBeDefined();
    const bioFotoLkpd = buildSmartLKPD(bioFotoTP, smaBioProfile, 'kasus');
    expect(bioFotoLkpd.stimulusKasus.judul).not.toMatch(/Dua Tanaman Hijau/i);
  });

  it('3. Bug A (Positif Preservasi): fixture Wujud Zat/Es SD, Asam-Basa Kimia SMA, dan Sel/Osmosis Biologi SMA tetap bekerja', () => {
    const sdProfile = makeProfile('SD/MI', '4', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', '1 (Ganjil)');
    const sdPlan = getSemesterCurriculumPlan(
      sdProfile.mataPelajaranUtama,
      jenjangToDefaultFase(sdProfile.jenjang, sdProfile.kelasUtama),
      sdProfile.kelasUtama,
      sdProfile.semester
    );
    const wujudTP = sdPlan.tpList.find((tp) => /wujud zat/i.test(tp.materiPokok))!;
    expect(wujudTP).toBeDefined();

    for (const tp of [
      wujudTP,
      makeCustomSainsTP('pos-es-batu', 'Pengamatan Es Batu Mencair', 'Mengamati mencairnya es batu akibat kalor.'),
    ]) {
      const lkpd = buildSmartLKPD(tp, sdProfile, 'kasus');
      expect(lkpd.catatanValidasi?.isCuratedFixture).toBe(true);
      expect(lkpd.stimulusKasus.judul).toBe('Mengamati Perubahan Wujud Es di Dua Tempat Berbeda');
      const v = validateLKPDDokumen(lkpd, tp, sdProfile, { sourceMode: 'curated' });
      expect(v.issues).toEqual([]);
    }

    const kimProfile = makeProfile('SMA/MA', '11', 'Kimia', '1 (Ganjil)');
    const kimPlan = getSemesterCurriculumPlan('Kimia', 'Fase F', '11', '1 (Ganjil)');
    const asamBasaTP = kimPlan.tpList.find((tp) => /asam.?basa/i.test(tp.materiPokok))!;
    expect(asamBasaTP).toBeDefined();
    const kimLkpd = buildSmartLKPD(asamBasaTP, kimProfile, 'kasus');
    expect(kimLkpd.catatanValidasi?.isCuratedFixture).toBe(true);
    expect(kimLkpd.stimulusKasus.judul).toBe('Data Uji Kertas Lakmus Tiga Sampel Cairan');

    const bioProfile = makeProfile('SMA/MA', '11', 'Biologi', '1 (Ganjil)');
    const bioPlan = getSemesterCurriculumPlan('Biologi', 'Fase F', '11', '1 (Ganjil)');
    const osmosisTP = bioPlan.tpList.find((tp) => /osmosis|transpor membran/i.test(tp.materiPokok))!;
    expect(osmosisTP).toBeDefined();
    const bioLkpd = buildSmartLKPD(osmosisTP, bioProfile, 'kasus');
    expect(bioLkpd.catatanValidasi?.isCuratedFixture).toBe(true);
    expect(bioLkpd.stimulusKasus.judul).toBe('Pengamatan Panjang Potongan Kentang dalam Dua Larutan');
  });

  it('4. Bug B (PKK SMK Kelas 11): bebas kebocoran istilah Informatika dan memuat konteks K3LH/5R/prototipe/produk/biaya HPP', () => {
    const pkkProfile = makeProfile('SMK', '11', 'Produk Kreatif dan Kewirausahaan (PKK)', '1 (Ganjil)');
    const plan = getSemesterCurriculumPlan(
      pkkProfile.mataPelajaranUtama,
      jenjangToDefaultFase(pkkProfile.jenjang, pkkProfile.kelasUtama),
      pkkProfile.kelasUtama,
      pkkProfile.semester
    );
    const pkkTP = plan.tpList[0];
    expect(pkkTP).toBeDefined();

    const lkpd = buildSmartLKPD(pkkTP, pkkProfile, 'kasus');
    expect(lkpd.catatanValidasi?.isCuratedFixture).toBe(true);
    expect(lkpd.stimulusData?.jenisData).toBe('tabel');

    const q2 = lkpd.pertanyaanAnalisis[1];
    expect(q2.alasanTingkatKognitif).toMatch(/5R|SOP/i);
    expect(q2.alasanTingkatKognitif).toMatch(/prototipe|produk|biaya|HPP/i);
    expect(lkpd.panduanGuru?.kunciDanContohJawaban[0].langkahPenyelesaian.join(' ')).toMatch(
      /APD|safety goggles/i
    );
    expect(lkpd.panduanGuru?.kunciDanContohJawaban[0].langkahPenyelesaian.join(' ')).toMatch(
      /prototipe|produksi/i
    );
    expect(lkpd.panduanGuru?.kunciDanContohJawaban[1].langkahPenyelesaian.join(' ')).toMatch(/5R/i);
    expect(lkpd.panduanGuru?.kunciDanContohJawaban[1].langkahPenyelesaian.join(' ')).toMatch(
      /prototipe|produk|biaya|HPP/i
    );
    expect(lkpd.panduanGuru?.miskonsepsiUmum[0].caraMenangani).toMatch(/APD|K3LH|5R/i);
    expect(lkpd.panduanGuru?.miskonsepsiUmum[0].caraMenangani).toMatch(/prototipe|biaya|produksi/i);

    const renderedViewerHtml = renderToStaticMarkup(
      React.createElement(LKPDViewer, {
        lkpd,
        schoolProfile: pkkProfile,
        customTP: pkkTP,
        onPrint: vi.fn(),
        onBackToClassHub: vi.fn(),
      })
    );

    const forbiddenInformatikaPattern =
      /off-by-one|strict inequality|boundary test|boundary values|trace kondisi|langkah_algoritma|penelusuran alur \/ debug|pseudocode|\bdebug\b|\bbug\b/i;

    expect(JSON.stringify(lkpd)).not.toMatch(forbiddenInformatikaPattern);
    expect(renderedViewerHtml).not.toMatch(forbiddenInformatikaPattern);

    const validation = validateLKPDDokumen(lkpd, pkkTP, pkkProfile, { sourceMode: 'curated' });
    expect(validation.issues).toEqual([]);

    const modul = buildSmartModulAjar(pkkTP, pkkProfile);
    expect(JSON.stringify(modul.contohLKPD)).not.toMatch(forbiddenInformatikaPattern);
  });

  it('5. Bug B (Preservasi Informatika): SMP Kelas 8 Informatika tetap mempertahankan panduan teknis trace dan boundary testing', () => {
    const infProfile = makeProfile('SMP/MTs', '8', 'Informatika', '1 (Ganjil)');
    const plan = getSemesterCurriculumPlan(
      infProfile.mataPelajaranUtama,
      jenjangToDefaultFase(infProfile.jenjang, infProfile.kelasUtama),
      infProfile.kelasUtama,
      infProfile.semester
    );
    const infTP = plan.tpList[0];
    expect(infTP).toBeDefined();

    const lkpd = buildSmartLKPD(infTP, infProfile, 'kasus');
    expect(lkpd.catatanValidasi?.isCuratedFixture).toBe(true);
    expect(lkpd.stimulusData?.jenisData).toBe('algoritma');
    expect(lkpd.pertanyaanAnalisis[1].alasanTingkatKognitif).toContain('off-by-one/strict inequality');
    expect(lkpd.pertanyaanAnalisis[1].alasanTingkatKognitif).toContain('boundary test cases');
    expect(lkpd.panduanGuru?.kunciDanContohJawaban[0].langkahPenyelesaian.join(' ')).toContain(
      'Trace kondisi batas 75'
    );
    expect(lkpd.panduanGuru?.kunciDanContohJawaban[1].langkahPenyelesaian.join(' ')).toContain(
      'Verifikasi boundary values 74, 75, 76'
    );
    expect(lkpd.panduanGuru?.miskonsepsiUmum[0].caraMenangani).toContain('boundary testing');

    const validation = validateLKPDDokumen(lkpd, infTP, infProfile, { sourceMode: 'curated' });
    expect(validation.issues).toEqual([]);
  });
});
