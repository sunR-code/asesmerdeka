// src/components/__tests__/LKPDViewer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LKPDViewer } from '../LKPDViewer';
import { buildSmartLKPD } from '../../utils/perangkatAjarEngine';
import type { CustomTPItem, SchoolProfile } from '../../utils/schoolProfileStorage';

declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void> {
    toBeInTheDocument(): R;
  }
}

expect.extend({
  toBeInTheDocument(received: any) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => (pass ? 'expected element not to be in document' : 'expected element to be in document'),
    };
  },
});

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
  elemen: 'Bilangan',
  materiPokok: 'Pecahan',
  tujuanPembelajaran: 'Operasi pecahan',
  arahanRangkuman: 'Fokus pada penjumlahan pecahan berbeda penyebut',
  alokasiJP: 2,
  mingguMulai: 1,
  mingguSelesai: 2,
};

const mockProfile: SchoolProfile = {
  namaSekolah: 'SD Merdeka',
  namaGuru: 'Guru',
  nipGuru: '-',
  kotaSekolah: 'Bandung',
  jenjang: 'SD/MI',
  kelasUtama: 'IV',
  mataPelajaranUtama: 'Matematika',
  semester: '1 (Ganjil)',
  tahunAjaran: '2024/2025',
  rombelAktif: 'IV-A',
  instansiDinas: 'Dinas Pendidikan',
  alamatSekolah: 'Jl. Merdeka',
  namaKepalaSekolah: 'Kepsek',
  nipKepalaSekolah: '-',
  daftarRombel: ['IV-A'],
  tampilkanTandaTangan: true,
  pakaiFormatKopSekolah: true,
};

describe('LKPDViewer Studio', () => {
  it('renders all 4 archetype pill buttons and switches active tab', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'kasus');

    render(
      <LKPDViewer
        lkpd={lkpd}
        schoolProfile={mockProfile}
        onPrint={vi.fn()}
        onBackToClassHub={vi.fn()}
      />
    );

    expect(screen.getByText(/Studi Kasus/i)).toBeInTheDocument();
    expect(screen.getByText(/Eksperimen/i)).toBeInTheDocument();
    expect(screen.getByText(/Berdiferensiasi/i)).toBeInTheDocument();
    expect(screen.getByText(/Proyek/i)).toBeInTheDocument();
  });

  it('renders experimental archetype sections properly', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'eksperimen');

    render(
      <LKPDViewer
        lkpd={lkpd}
        schoolProfile={mockProfile}
        onPrint={vi.fn()}
        onBackToClassHub={vi.fn()}
      />
    );

    expect(screen.getByText(/Penyelidikan Ilmiah/i)).toBeInTheDocument();
    expect(screen.getByText(/Alat dan Bahan/i)).toBeInTheDocument();
    expect(screen.getByText(/Hipotesis Awal/i)).toBeInTheDocument();
    expect(screen.getByText(/Tabel Observasi/i)).toBeInTheDocument();
  });

  it('renders differentiated archetype 3-tier task cards properly', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'diferensiasi');

    render(
      <LKPDViewer
        lkpd={lkpd}
        schoolProfile={mockProfile}
        onPrint={vi.fn()}
        onBackToClassHub={vi.fn()}
      />
    );

    expect(screen.getByText(/Tugas Berdiferensiasi/i)).toBeInTheDocument();
    expect(screen.getByText(/Jalur Fondasi/i)).toBeInTheDocument();
    expect(screen.getByText(/Jalur Penerapan/i)).toBeInTheDocument();
    expect(screen.getByText(/Jalur Kreasi/i)).toBeInTheDocument();
  });

  it('renders collaborative project archetype with team roles and rubrics', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'proyek');

    render(
      <LKPDViewer
        lkpd={lkpd}
        schoolProfile={mockProfile}
        onPrint={vi.fn()}
        onBackToClassHub={vi.fn()}
      />
    );

    expect(screen.getByText(/Rencana Proyek Kolaboratif/i)).toBeInTheDocument();
    expect(screen.getByText(/Tujuan Produk Akhir/i)).toBeInTheDocument();
    expect(screen.getByText(/Peran Tim/i)).toBeInTheDocument();
    expect(screen.getByText(/Rubrik Penilaian Karya/i)).toBeInTheDocument();
  });

  it('renders controls for contextual generation and teacher guide toggle', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'kasus');

    render(
      <LKPDViewer
        lkpd={lkpd}
        schoolProfile={mockProfile}
        onPrint={vi.fn()}
        onBackToClassHub={vi.fn()}
      />
    );

    expect(screen.getByText(/Smart LKPD Preset Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate Ulang/i)).toBeInTheDocument();
    expect(screen.getByText(/Tampilkan Panduan Guru \/ Kunci/i)).toBeInTheDocument();
    expect(screen.getByText(/Tambah Pertanyaan/i)).toBeInTheDocument();
  });

  it('lazily restores previous edits from localStorage on initial render', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'kasus');
    const modifiedDraft = {
      ...lkpd,
      judul: 'Topik Khusus Hasil Edit Guru',
      stimulusKasus: {
        ...lkpd.stimulusKasus,
        judul: 'Stimulus Khusus Tersimpan',
      },
    };

    localStorage.setItem('lkpd_tp-1_kasus', JSON.stringify(modifiedDraft));

    render(
      <LKPDViewer
        lkpd={lkpd}
        schoolProfile={mockProfile}
        onPrint={vi.fn()}
        onBackToClassHub={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('Topik Khusus Hasil Edit Guru')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Stimulus Khusus Tersimpan')).toBeInTheDocument();

    localStorage.removeItem('lkpd_tp-1_kasus');
  });

  it('lazily restores preset-specific draft when preset is loaded', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'eksperimen');
    const eksDraft = {
      ...lkpd,
      eksperimenData: {
        alatDanBahan: ['Tabung Reaksi Khusus', 'Pipet Tetes Khusus'],
        hipotesisAwal: 'Hipotesis khusus yang telah tersimpan di localStorage',
        tabelObservasi: {
          kolom: ['No', 'Parameter', 'Hasil'],
          baris: [['1', 'Suhu', '37 C']],
        },
      },
    };

    localStorage.setItem('lkpd_tp-1_eksperimen', JSON.stringify(eksDraft));

    render(
      <LKPDViewer
        lkpd={lkpd}
        schoolProfile={mockProfile}
        onPrint={vi.fn()}
        onBackToClassHub={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue(/Hipotesis khusus yang telah tersimpan/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tabung Reaksi Khusus')).toBeInTheDocument();

    localStorage.removeItem('lkpd_tp-1_eksperimen');
  });
});
