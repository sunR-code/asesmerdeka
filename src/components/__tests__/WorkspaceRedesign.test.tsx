import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassSetupStepView } from '../hub/ClassSetupStepView';
import { PresensiTab } from '../harian/PresensiTab';
import { TopHeader } from '../layout/TopHeader';
import { getTabHeaderInfo } from '../layout/headerMetadata';
import { filterSiswaRoster } from '../../utils/kelasHarianStorage';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import type { KelasHarianData } from '../../types/kelasHarian';

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

const mockProfile: SchoolProfile = {
  instansiDinas: 'DINAS PENDIDIKAN',
  namaSekolah: 'SMP Negeri 2 Nusantara',
  alamatSekolah: 'Jl. Pendidikan No. 5',
  jenjang: 'SMP/MTs',
  kelasUtama: '7',
  rombelAktif: 'VII A',
  daftarRombel: ['VII A', 'VII B', 'VII C'],
  mataPelajaranUtama: 'Ilmu Pengetahuan Alam (IPA)',
  namaGuru: 'Budi Santoso, S.Pd.',
  nipGuru: '198501012010011001',
  namaKepalaSekolah: 'Dra. Siti Aminah',
  nipKepalaSekolah: '197001011995012001',
  kotaSekolah: 'Bandung',
  semester: '1 (Ganjil)',
  tahunAjaran: '2025/2026',
  tampilkanTandaTangan: true,
  pakaiFormatKopSekolah: true,
};

const mockKelasHarian: KelasHarianData = {
  rombel: 'VII A',
  mataPelajaran: 'Ilmu Pengetahuan Alam (IPA)',
  semester: '1 (Ganjil)',
  tahunAjaran: '2025/2026',
  daftarSiswa: [
    { id: 's1', noUrut: 1, nis: '2401', nama: 'Ahmad Fauzi', jenisKelamin: 'L' },
    { id: 's2', noUrut: 2, nis: '2402', nama: 'Citra Dewi', jenisKelamin: 'P' },
  ],
  daftarPresensi: [
    { id: 'p1', pertemuanKe: 1, tanggal: '2025-07-14', statusMap: { s1: 'H', s2: 'S' } },
    { id: 'p2', pertemuanKe: 2, tanggal: '2025-07-21', statusMap: { s1: 'H', s2: 'H' } },
  ],
  daftarJurnal: [],
  daftarNilai: [],
};

describe('Calm Workspace Redesign Regressions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('filterSiswaRoster filters students accurately by nama or NIS without mutating source', () => {
    expect(filterSiswaRoster(mockKelasHarian.daftarSiswa, '')).toHaveLength(2);
    expect(filterSiswaRoster(mockKelasHarian.daftarSiswa, 'citra')).toEqual([
      mockKelasHarian.daftarSiswa[1],
    ]);
    expect(filterSiswaRoster(mockKelasHarian.daftarSiswa, '2401')).toEqual([
      mockKelasHarian.daftarSiswa[0],
    ]);
    expect(filterSiswaRoster(mockKelasHarian.daftarSiswa, 'tidak-ada')).toHaveLength(0);
  });

  it('headerMetadata provides contextual breadcrumbs without emojis', () => {
    const setupInfo = getTabHeaderInfo('tp_list', mockProfile, 2, false);
    expect(setupInfo.section).toBe('Pengaturan');
    expect(setupInfo.title).toBe('Pengaturan ruang kerja');
    expect(setupInfo.title).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);

    const setupFromPresensi = getTabHeaderInfo('presensi', mockProfile, 2, false);
    expect(setupFromPresensi.section).toBe('Pengaturan');
    expect(setupFromPresensi.title).toBe('Pengaturan ruang kerja');

    const presensiInfo = getTabHeaderInfo('presensi', mockProfile, 2, true);
    expect(presensiInfo.section).toBe('Kelas Harian');
    expect(presensiInfo.title).toBe('Presensi siswa');
    expect(presensiInfo.subtitle).toContain('2 siswa');
  });

  it('TopHeader renders truthful storage indicator labels and never claims "Data Tersimpan Aman"', () => {
    const localHtml = renderToStaticMarkup(
      <TopHeader
        pageSection="Kelas Harian"
        pageTitle="Presensi siswa"
        schoolProfile={mockProfile}
        storageStatus="local"
        onOpenSchoolModal={vi.fn()}
        onToggleMobileSidebar={vi.fn()}
      />
    );
    expect(localHtml).toContain('Tersimpan lokal');
    expect(localHtml).not.toMatch(/Data Tersimpan Aman/i);

    const syncedHtml = renderToStaticMarkup(
      <TopHeader
        pageSection="Kelas Harian"
        pageTitle="Presensi siswa"
        schoolProfile={mockProfile}
        storageStatus="synced"
        onOpenSchoolModal={vi.fn()}
        onToggleMobileSidebar={vi.fn()}
      />
    );
    expect(syncedHtml).toContain('Lokal &amp; cloud');
  });

  it('ClassSetupStepView renders calm heading, collapsed optional identity disclosure, live summary, and primary CTA', () => {
    const html = renderToStaticMarkup(
      <ClassSetupStepView
        schoolProfile={mockProfile}
        updateAndPersistProfile={vi.fn()}
        onOpenSchoolModal={vi.fn()}
        onOpenLicenseModal={vi.fn()}
        onConfirmClassSetup={vi.fn()}
        onToast={vi.fn()}
      />
    );

    expect(html).toContain('Siapkan ruang kerja semester');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Ilmu Pengetahuan Alam (IPA)');
    expect(html).toContain('VII A (3 total)');
    expect(html).toContain('Buka ruang kerja');
    expect(html).toContain('Pulihkan dari kode lisensi');
  });

  it('PresensiTab renders real search control, neutral summary metrics, and accessible column & cell buttons', () => {
    const html = renderToStaticMarkup(
      <PresensiTab
        schoolProfile={mockProfile}
        kelasHarian={mockKelasHarian}
        onUpdateKelasHarian={vi.fn()}
        onToast={vi.fn()}
      />
    );

    expect(html).toContain('Presensi siswa');
    expect(html).toContain('Matriks semester');
    expect(html).toContain('Per pertemuan');
    expect(html).toContain('aria-label="Cari nama atau NIS siswa"');
    expect(html).toContain('aria-label="Tandai semua hadir pada pertemuan 1"');
    expect(html).toContain('Ahmad Fauzi');
    expect(html).toContain('Citra Dewi');
    expect(html).toContain('75%');
    expect(html).toContain('Unduh .docx');
  });
});
