// src/utils/__tests__/perangkatAjarEngine.test.ts
import { describe, it, expect } from 'vitest';
import { buildSmartLKPD } from '../perangkatAjarEngine';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';

const mockTP: CustomTPItem = {
  id: 'tp-1',
  kode: 'TP-1',
  elemen: 'Pemahaman IPA',
  materiPokok: 'Ekosistem dan Rantai Makanan',
  tujuanPembelajaran: 'Menganalisis hubungan antarmakhluk hidup dalam ekosistem',
  arahanRangkuman: 'Fokus pada rantai makanan dan hubungan antar komponen biotik',
  alokasiJP: 4,
  mingguMulai: 1,
  mingguSelesai: 2,
};

const mockProfile: SchoolProfile = {
  instansiDinas: 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA',
  namaSekolah: 'SMP Merdeka Belajar',
  alamatSekolah: 'Jl. Merdeka Belajar No. 1, Jakarta',
  namaGuru: 'Budi Santoso, S.Pd.',
  nipGuru: '198501012010011001',
  namaKepalaSekolah: 'Dr. H. Ahmad Dahlan, M.Pd.',
  nipKepalaSekolah: '197001011995011001',
  kotaSekolah: 'Jakarta',
  jenjang: 'SMP/MTs',
  kelasUtama: 'VII',
  mataPelajaranUtama: 'Ilmu Pengetahuan Alam (IPA)',
  semester: '1 (Ganjil)',
  tahunAjaran: '2024/2025',
  rombelAktif: 'VII-A',
  daftarRombel: ['VII-A', 'VII-B'],
  tampilkanTandaTangan: true,
  pakaiFormatKopSekolah: true,
};

describe('buildSmartLKPD multi-archetype generator', () => {
  it('defaults to kasus preset when presetType is omitted', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile);
    expect(lkpd.presetType).toBe('kasus');
    expect(lkpd.stimulusKasus).toBeDefined();
    expect(lkpd.stimulusKasus.teks.length).toBeGreaterThan(50);
    expect(lkpd.langkahAktivitas.length).toBeGreaterThan(0);
    expect(lkpd.pertanyaanAnalisis.length).toBeGreaterThan(0);
  });

  it('generates valid experimental worksheet with observation table', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'eksperimen');
    expect(lkpd.presetType).toBe('eksperimen');
    expect(lkpd.eksperimenData).toBeDefined();
    expect(lkpd.eksperimenData?.alatDanBahan.length).toBeGreaterThan(0);
    expect(lkpd.eksperimenData?.tabelObservasi.kolom.length).toBeGreaterThan(0);
    expect(lkpd.eksperimenData?.tabelObservasi.baris.length).toBeGreaterThan(0);
  });

  it('generates valid differentiated worksheet with 3 tiers', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'diferensiasi');
    expect(lkpd.presetType).toBe('diferensiasi');
    expect(lkpd.diferensiasiData).toBeDefined();
    expect(lkpd.diferensiasiData?.tingkatDasar.tugas.length).toBeGreaterThan(0);
    expect(lkpd.diferensiasiData?.tingkatMenengah.tugas.length).toBeGreaterThan(0);
    expect(lkpd.diferensiasiData?.tingkatMahir.tugas.length).toBeGreaterThan(0);
  });

  it('generates valid collaborative project worksheet with roles', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'proyek');
    expect(lkpd.presetType).toBe('proyek');
    expect(lkpd.proyekData).toBeDefined();
    expect(lkpd.proyekData?.peranAnggota.length).toBeGreaterThan(0);
    expect(lkpd.proyekData?.rubrikKarya.length).toBeGreaterThan(0);
  });

  it('embeds contextual trend topic when provided', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'kasus', 'Limbah Mikroplastik di Sungai Ciliwung');
    expect(lkpd.konteksAktual).toBe('Limbah Mikroplastik di Sungai Ciliwung');
    expect(lkpd.stimulusKasus.teks).toContain('Limbah Mikroplastik di Sungai Ciliwung');
  });
});
