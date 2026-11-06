// src/types/__tests__/perangkatAjar.test.ts
import { describe, it, expect } from 'vitest';
import type { LKPDDokumen, LKPDPresetType, LKPDPertanyaanItem } from '../perangkatAjar';

describe('LKPDDokumen types', () => {
  it('supports all 4 archetype presets and structured data', () => {
    const presets: LKPDPresetType[] = ['kasus', 'eksperimen', 'diferensiasi', 'proyek'];
    expect(presets).toHaveLength(4);

    const doc: Partial<LKPDDokumen> = {
      presetType: 'eksperimen',
      eksperimenData: {
        alatDanBahan: ['Tabung reaksi', 'Air'],
        hipotesisAwal: 'Dugaan sementara...',
        tabelObservasi: {
          kolom: ['No', 'Perlakuan', 'Hasil'],
          baris: [['1', 'Uji A', 'Berubah warna']],
        },
      },
    };
    expect(doc.presetType).toBe('eksperimen');
    expect(doc.eksperimenData?.alatDanBahan).toHaveLength(2);
  });

  it('supports differentiated, project, and question item schemas', () => {
    const pertanyaan: LKPDPertanyaanItem = {
      id: 'q-1',
      nomor: 1,
      pertanyaan: 'Bagaimana perbandingan hasil uji?',
      tingkatKognitif: 'Menengah',
      panduanJawabanSingkat: 'Hasil uji menunjukkan perubahan warna...',
    };

    const doc: Partial<LKPDDokumen> = {
      presetType: 'diferensiasi',
      konteksAktual: 'Pengelolaan Sampah Plastik',
      diferensiasiData: {
        tingkatDasar: {
          instruksi: 'Identifikasi 3 jenis sampah plastik',
          tugas: ['Buat daftar jenis plastik', 'Kelompokkan berdasarkan kode'],
        },
        tingkatMenengah: {
          instruksi: 'Analisis dampak mikroplastik',
          tugas: ['Jelaskan rantai makanan yang terdampak'],
        },
        tingkatMahir: {
          instruksi: 'Rancang solusi daur ulang inovatif',
          tugas: ['Buat prototipe sistem komposting/daur ulang'],
        },
      },
      proyekData: {
        tujuanProyek: 'Merancang kampanye minim sampah',
        tahapanWaktu: '2 Minggu (4 Pertemuan)',
        peranAnggota: [
          { peran: 'Ketua Tim', tanggungJawab: 'Mengkoordinasi kerja tim' },
          { peran: 'Perancang Media', tanggungJawab: 'Membuat infografis' },
        ],
        rubrikKarya: [
          { kriteria: 'Orisinalitas Ide', deskripsiSkor: 'Kreatif dan dapat diaplikasikan' },
        ],
      },
      pertanyaanAnalisis: [pertanyaan],
    };

    expect(doc.presetType).toBe('diferensiasi');
    expect(doc.konteksAktual).toBe('Pengelolaan Sampah Plastik');
    expect(doc.diferensiasiData?.tingkatDasar.tugas).toHaveLength(2);
    expect(doc.proyekData?.peranAnggota).toHaveLength(2);
    expect(doc.pertanyaanAnalisis?.[0].tingkatKognitif).toBe('Menengah');
  });
});
