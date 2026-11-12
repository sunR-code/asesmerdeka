import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import type { AppTab } from '../../App';

const HUB_SETUP_TABS: ReadonlySet<AppTab> = new Set([
  'tp_list',
  'atp',
  'prota',
  'promes',
  'presensi',
  'jurnal',
  'nilai',
  'rapor',
  'supervisi',
]);

export function getTabHeaderInfo(
  activeTab: AppTab,
  schoolProfile: SchoolProfile,
  studentCount: number,
  isClassConfirmed: boolean = true
): { title: string; subtitle: string; section?: string } {
  const semesterLabel = schoolProfile.semester.startsWith('2') ? 'Semester 2' : 'Semester 1';

  if (!isClassConfirmed && HUB_SETUP_TABS.has(activeTab)) {
    return {
      section: 'Pengaturan',
      title: 'Pengaturan ruang kerja',
      subtitle: `${schoolProfile.jenjang} · Tahun ajaran ${schoolProfile.tahunAjaran}`,
    };
  }
  switch (activeTab) {
    case 'tp_list':
      return {
        section: 'Perangkat Semester',
        title: 'Peta materi & TP',
        subtitle: `Kelas ${schoolProfile.rombelAktif} · ${schoolProfile.mataPelajaranUtama} · ${semesterLabel}`,
      };
    case 'atp':
      return {
        section: 'Perangkat Semester',
        title: 'Alur tujuan pembelajaran',
        subtitle: `${schoolProfile.mataPelajaranUtama} · Kelas ${schoolProfile.rombelAktif}`,
      };
    case 'prota':
      return {
        section: 'Perangkat Semester',
        title: 'Program tahunan',
        subtitle: `${schoolProfile.mataPelajaranUtama} · Tahun ajaran ${schoolProfile.tahunAjaran}`,
      };
    case 'promes':
      return {
        section: 'Perangkat Semester',
        title: 'Program semester',
        subtitle: `${schoolProfile.mataPelajaranUtama} · ${semesterLabel}`,
      };
    case 'p5_project':
      return {
        section: 'Perangkat Semester',
        title: 'Modul projek P5',
        subtitle: `Fase ${
          schoolProfile.jenjang === 'SD/MI'
            ? 'C'
            : schoolProfile.jenjang === 'SMP/MTs'
            ? 'D'
            : 'E'
        } · Kokurikuler`,
      };
    case 'presensi':
      return {
        section: 'Kelas Harian',
        title: 'Presensi siswa',
        subtitle: `Kelas ${schoolProfile.rombelAktif} · ${studentCount} siswa · ${semesterLabel}`,
      };
    case 'jurnal':
      return {
        section: 'Kelas Harian',
        title: 'Jurnal mengajar',
        subtitle: `Kelas ${schoolProfile.rombelAktif} · ${schoolProfile.mataPelajaranUtama} · ${semesterLabel}`,
      };
    case 'nilai':
      return {
        section: 'Kelas Harian',
        title: 'Buku nilai asesmen',
        subtitle: `Kelas ${schoolProfile.rombelAktif} · ${schoolProfile.mataPelajaranUtama}`,
      };
    case 'rapor':
      return {
        section: 'Kelas Harian',
        title: 'Auto-deskripsi e-Rapor',
        subtitle: `Kelas ${schoolProfile.rombelAktif} · ${schoolProfile.mataPelajaranUtama}`,
      };
    case 'supervisi':
      return {
        section: 'Supervisi & Ekspor',
        title: 'Paket siap supervisi',
        subtitle: `Kelas ${schoolProfile.rombelAktif} · 9 dokumen semester (.docx & .zip)`,
      };
    case 'ujian_semester':
      return {
        section: 'Evaluasi & Arsip',
        title: 'Naskah ujian STS & SAS',
        subtitle: `Kelas ${schoolProfile.kelasUtama} (${schoolProfile.rombelAktif}) · ${schoolProfile.mataPelajaranUtama}`,
      };
    case 'bank':
      return {
        section: 'Evaluasi & Arsip',
        title: 'Bank soal & arsip',
        subtitle: `Koleksi asesmen tersimpan · ${schoolProfile.mataPelajaranUtama}`,
      };
    case 'generator':
      return {
        section: 'Evaluasi & Arsip',
        title: 'Generator soal AI',
        subtitle: `${schoolProfile.mataPelajaranUtama} · Kelas ${schoolProfile.rombelAktif}`,
      };
    case 'rangkuman_gen':
      return {
        section: 'Evaluasi & Arsip',
        title: 'Generator rangkuman AI',
        subtitle: `${schoolProfile.mataPelajaranUtama} · Kelas ${schoolProfile.rombelAktif}`,
      };
    case 'worksheet':
      return {
        section: 'Dokumen Asesmen',
        title: 'Lembar soal & asesmen',
        subtitle: 'Pratinjau siap cetak & ekspor Word',
      };
    case 'kisi_kisi':
      return {
        section: 'Dokumen Asesmen',
        title: 'Kisi-kisi & kartu soal',
        subtitle: 'Distribusi indikator soal dan level kognitif',
      };
    case 'teacher_guide':
      return {
        section: 'Dokumen Asesmen',
        title: 'Panduan & rubrik guru',
        subtitle: 'Kunci jawaban dan kriteria KKTP',
      };
    case 'modul_ajar':
      return {
        section: 'Perangkat Ajar',
        title: 'Modul ajar',
        subtitle: 'Dokumen siap telaah supervisi & ekspor Word',
      };
    case 'lkpd':
      return {
        section: 'Perangkat Ajar',
        title: 'Lembar kerja peserta didik',
        subtitle: 'Aktivitas belajar siswa siap cetak & ekspor',
      };
    case 'rangkuman_view':
      return {
        section: 'Perangkat Ajar',
        title: 'Rangkuman materi siswa',
        subtitle: 'Bahan bacaan ringkas siap cetak',
      };
    default:
      return {
        section: 'Workspace',
        title: 'Ruang kerja semester',
        subtitle: `Kelas ${schoolProfile.rombelAktif} · ${schoolProfile.mataPelajaranUtama}`,
      };
  }
}

