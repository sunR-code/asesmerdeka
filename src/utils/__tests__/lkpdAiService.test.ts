// src/utils/__tests__/lkpdAiService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateContextualLKPDWithAI } from '../lkpdAiService';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import * as licenseManager from '../licenseManager';
import { saveGeminiKey } from '../licenseManager';

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
  (globalThis as any).localStorage = new LocalStorageMock();
}

const mockTP: CustomTPItem = {
  id: 'tp-1',
  kode: 'TP-1',
  elemen: 'Pemahaman Geografi',
  materiPokok: 'Pemanasan Global',
  tujuanPembelajaran: 'Menganalisis dampak pemanasan global',
  arahanRangkuman: 'Fokus pada dampak kenaikan permukaan laut',
  alokasiJP: 2,
  mingguMulai: 1,
  mingguSelesai: 2,
};

const mockProfile: SchoolProfile = {
  namaSekolah: 'SMA Nusantara',
  namaGuru: 'Siti Aminah, M.Pd.',
  nipGuru: '198002022005012002',
  kotaSekolah: 'Surabaya',
  jenjang: 'SMA/MA',
  kelasUtama: 'X',
  mataPelajaranUtama: 'Geografi',
  semester: '2 (Genap)',
  tahunAjaran: '2024/2025',
  rombelAktif: 'X-1',
  instansiDinas: 'Dinas Pendidikan Jawa Timur',
  alamatSekolah: 'Jl. Pemuda No. 10',
  namaKepalaSekolah: 'Drs. H. Mulyadi',
  nipKepalaSekolah: '197001011995011001',
  daftarRombel: ['X-1', 'X-2'],
  tampilkanTandaTangan: true,
  pakaiFormatKopSekolah: true,
};

describe('generateContextualLKPDWithAI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    licenseManager.activateLicense('PRO-MERDEKA-MAYAR001-1EN8');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back gracefully to offline heuristic engine when API key is missing or offline', async () => {
    // No API key set
    const result = await generateContextualLKPDWithAI(mockTP, mockProfile, 'kasus', 'Banjir Rob Pesisir Utara');
    expect(result.lkpd).toBeDefined();
    expect(result.lkpd.presetType).toBe('kasus');
    expect(result.usedFallback).toBe(true);
    expect(result.lkpd.stimulusKasus.teks.length).toBeGreaterThan(50);
  });

  it('calls Gemini API and parses contextual LKPD response when API key is available', async () => {
    saveGeminiKey('test-api-key-123');

    const fakeGeminiResponse = {
      judul: 'LKPD Kasus AI: Banjir Rob Surabaya Utara',
      alokasiWaktu: '2 x 45 Menit',
      petunjukPengerjaan: ['Petunjuk 1 dari AI', 'Petunjuk 2 dari AI'],
      stimulusKasus: {
        judul: 'Fenomena Banjir Rob di Wilayah Surabaya Utara',
        teks: 'Banjir rob semakin sering menggenangi wilayah Surabaya Utara akibat naiknya permukaan air laut...',
        pertanyaanAwal: 'Faktor apa yang paling dominan memicu banjir rob ini?',
      },
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Observasi Lapangan',
          instruksi: 'Amati peta elevasi dan riwayat pasang surut air laut.',
          bantuanAtauTabel: ['Data Pasang Surut', 'Data Kerugian'],
        },
      ],
      pertanyaanAnalisis: [
        {
          nomor: 1,
          tingkatKognitif: 'Menengah',
          pertanyaan: 'Bagaimana keterkaitan pemanasan global dengan kenaikan pasang air laut?',
          petunjukPengerjaan: 'Gunakan data suhu global.',
          panduanJawabanSingkat: 'Pemanasan global mencairkan es kutub dan memicu kenaikan muka air laut.',
        },
      ],
      kesimpulanRefleksi: [
        'Solusi mitigasi pesisir harus memperhatikan aspek ekologis dan sosial.',
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(fakeGeminiResponse) }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deductSpy = vi.spyOn(licenseManager, 'deductQuota');

    const result = await generateContextualLKPDWithAI(mockTP, mockProfile, 'kasus', 'Banjir Rob Surabaya Utara');

    expect(result.usedFallback).toBe(false);
    expect(result.lkpd.judul).toBe('LKPD Kasus AI: Banjir Rob Surabaya Utara');
    expect(result.lkpd.stimulusKasus.judul).toBe('Fenomena Banjir Rob di Wilayah Surabaya Utara');
    expect(result.lkpd.konteksAktual).toBe('Banjir Rob Surabaya Utara');
    expect(result.lkpd.presetType).toBe('kasus');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(deductSpy).toHaveBeenCalled();
  });

  it('falls back to heuristic engine and refunds quota when Gemini API fails with network error', async () => {
    saveGeminiKey('test-api-key-123');

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error / offline'));
    vi.stubGlobal('fetch', mockFetch);

    const refundSpy = vi.spyOn(licenseManager, 'refundQuota');

    const result = await generateContextualLKPDWithAI(mockTP, mockProfile, 'eksperimen', 'Uji Efek Rumah Kaca Mini');

    expect(result.usedFallback).toBe(true);
    expect(result.errorMsg).toBeDefined();
    expect(result.lkpd.presetType).toBe('eksperimen');
    expect(result.lkpd.eksperimenData).toBeDefined();
    expect(refundSpy).toHaveBeenCalled();
  });

  it('falls back gracefully without calling API when quota is exhausted', async () => {
    saveGeminiKey('test-api-key-123');

    vi.spyOn(licenseManager, 'deductQuota').mockReturnValue({
      success: false,
      quota: {
        tier: 'free',
        remainingCredits: 0,
        maxCredits: 3,
        deviceId: 'DEV-TEST',
        lastResetDate: '2026-11-06',
      },
      message: 'Kuota habis',
    });

    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await generateContextualLKPDWithAI(mockTP, mockProfile, 'proyek', 'Pembuatan Biopori Sekolah');

    expect(result.usedFallback).toBe(true);
    expect(result.errorMsg).toContain('Kuota');
    expect(result.lkpd.presetType).toBe('proyek');
    expect(result.lkpd.proyekData).toBeDefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('supports generating contextual LKPD for diferensiasi preset archetype', async () => {
    saveGeminiKey('test-api-key-123');

    const fakeDiferensiasiResponse = {
      judul: 'LKPD Diferensiasi AI: Emisi Karbon Kendaraan',
      alokasiWaktu: '80 Menit',
      petunjukPengerjaan: ['Pilih jalur kesiapan belajarmu'],
      stimulusKasus: {
        judul: 'Wacana Emisi Karbon di Kota Industri',
        teks: 'Aktivitas transportasi di perkotaan berkontribusi besar pada jejak karbon...',
      },
      diferensiasiData: {
        tingkatDasar: { instruksi: 'Tugas dasar AI', tugas: ['Sebutkan gas rumah kaca'] },
        tingkatMenengah: { instruksi: 'Tugas menengah AI', tugas: ['Hitung emisi rata-rata'] },
        tingkatMahir: { instruksi: 'Tugas mahir AI', tugas: ['Rancang usulan car-free day'] },
      },
      langkahAktivitas: [
        {
          langkahKe: 1,
          judulLangkah: 'Pemilihan Jalur',
          instruksi: 'Tentukan tingkat kesiapan belajarmu.',
        },
      ],
      pertanyaanAnalisis: [
        {
          nomor: 1,
          tingkatKognitif: 'Mahir',
          pertanyaan: 'Strategi apa yang paling realistis diterapkan di sekolah kita?',
        },
      ],
      kesimpulanRefleksi: ['Setiap siswa dapat berkontribusi mengurangi emisi karbon.'],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(fakeDiferensiasiResponse) }] } }],
      }),
    }));

    const result = await generateContextualLKPDWithAI(mockTP, mockProfile, 'diferensiasi', 'Emisi Karbon Kendaraan');

    expect(result.usedFallback).toBe(false);
    expect(result.lkpd.presetType).toBe('diferensiasi');
    expect(result.lkpd.diferensiasiData?.tingkatDasar.tugas).toContain('Sebutkan gas rumah kaca');
  });
});
