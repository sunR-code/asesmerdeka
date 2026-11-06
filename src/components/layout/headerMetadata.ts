import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import type { AppTab } from '../../App';

export function getTabHeaderInfo(
  activeTab: AppTab,
  schoolProfile: SchoolProfile,
  studentCount: number
): { title: string; subtitle: string } {
  switch (activeTab) {
    case 'tp_list':
      return {
        title: '🎯 Peta Materi & Tujuan Pembelajaran (TP)',
        subtitle: `Materi 1 semester untuk Kelas ${schoolProfile.rombelAktif} • Buat Modul Ajar, LKPD, Soal, & Rangkuman 1-klik`,
      };
    case 'atp':
      return {
        title: '📋 Alur Tujuan Pembelajaran (ATP)',
        subtitle: `Alur sebaran kompetensi dan Jam Pelajaran (JP) ${schoolProfile.mataPelajaranUtama}`,
      };
    case 'prota':
      return {
        title: '📅 Program Tahunan (Prota)',
        subtitle: `Rencana alokasi waktu pembelajaran 2 semester tahun ajaran ${schoolProfile.tahunAjaran}`,
      };
    case 'promes':
      return {
        title: '🗓️ Program Semester (Promes Visual)',
        subtitle: `Matriks distribusi JP per minggu efektif semester ${schoolProfile.semester}`,
      };
    case 'p5_project':
      return {
        title: '🌟 Modul Projek P5 (Profil Pelajar Pancasila)',
        subtitle: `Panduan Kokurikuler Kurikulum Merdeka Fase ${
          schoolProfile.jenjang === 'SD/MI'
            ? 'C'
            : schoolProfile.jenjang === 'SMP/MTs'
            ? 'D'
            : 'E'
        } • Alur 5 Tahap & Rapor Observasi Karakter`,
      };
    case 'presensi':
      return {
        title: '👥 Presensi Siswa',
        subtitle: `Rekapitulasi kehadiran 16 pertemuan untuk ${studentCount} siswa rombel ${schoolProfile.rombelAktif}`,
      };
    case 'jurnal':
      return {
        title: '📖 Agenda & Jurnal Mengajar Guru',
        subtitle: `Catatan pelaksanaan pembelajaran 16 pertemuan dengan diferensiasi & refleksi`,
      };
    case 'nilai':
      return {
        title: '📊 Buku Nilai Asesmen (Formatif & Sumatif)',
        subtitle: `Daftar nilai seluruh TP, STS, SAS, dan predikat ketercapaian KKTP`,
      };
    case 'rapor':
      return {
        title: '📝 Auto-Deskripsi e-Rapor',
        subtitle: `Sintesis capaian tertinggi dan penguatan siap salin (paste) ke e-Rapor Kemendikbud`,
      };
    case 'supervisi':
      return {
        title: '🎓 Paket Administrasi Siap Supervisi & Akreditasi',
        subtitle: `1-Klik Unduh Master Bundel Lengkap (~35 Halaman) & Arsip ZIP 9 Dokumen`,
      };
    case 'ujian_semester':
      return {
        title: '📝 Naskah Ujian Semester (STS & SAS)',
        subtitle: `Naskah ujian resmi terpadu dari seluruh TP Kelas ${schoolProfile.kelasUtama} (${schoolProfile.rombelAktif}) • Lengkap LJK & Rubrik Penskoran`,
      };
    case 'bank':
      return {
        title: '📁 Bank Soal & Arsip Guru',
        subtitle: `Koleksi soal dan asesmen tersimpan milik Bapak/Ibu`,
      };
    case 'generator':
      return {
        title: '⚡ Generator Soal Evaluasi AI',
        subtitle: `Buat soal asesmen kustom lengkap dengan rubrik & kisi-kisi`,
      };
    case 'rangkuman_gen':
      return {
        title: '📖 Generator Rangkuman Belajar AI',
        subtitle: `Susun ringkasan materi siap ajar dengan bahasa terstruktur`,
      };
    case 'worksheet':
      return {
        title: '📄 Lembar Soal & Asesmen Siswa',
        subtitle: `Pratinjau lembar evaluasi siap cetak & unduh Word`,
      };
    case 'kisi_kisi':
      return {
        title: '📋 Kisi-Kisi & Kartu Soal Otomatis',
        subtitle: `Distribusi indikator soal dan tingkat kognitif`,
      };
    case 'teacher_guide':
      return {
        title: '📘 Panduan & Rubrik Asesmen Guru',
        subtitle: `Kunci jawaban dan kriteria ketercapaian tujuan pembelajaran`,
      };
    case 'modul_ajar':
      return {
        title: '📘 Modul Ajar (RPP Kurikulum Merdeka)',
        subtitle: `Perangkat ajar lengkap siap telaah supervisi dan ekspor Word`,
      };
    case 'lkpd':
      return {
        title: '📄 Lembar Kerja Peserta Didik (LKPD)',
        subtitle: `Aktivitas penemuan konsep terstruktur untuk siswa`,
      };
    case 'rangkuman_view':
      return {
        title: '📚 Lembar Rangkuman Materi Siswa',
        subtitle: `Bahan bacaan ringkas siap cetak dan pelengkap belajar`,
      };
    default:
      return {
        title: 'Ruang Kerja Administrasi Guru',
        subtitle: `Kelas ${schoolProfile.rombelAktif} • ${schoolProfile.mataPelajaranUtama}`,
      };
  }
}

