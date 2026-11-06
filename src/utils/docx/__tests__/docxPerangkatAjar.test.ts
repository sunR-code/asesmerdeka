import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { exportLKPDToDocx } from '../docxPerangkatAjar';
import { buildSmartLKPD } from '../../perangkatAjarEngine';
import type { CustomTPItem, SchoolProfile } from '../../schoolProfileStorage';

vi.mock('file-saver', () => ({
  default: vi.fn(),
}));

describe('exportLKPDToDocx archetype support', () => {
  const profile: SchoolProfile = {
    namaSekolah: 'SMP 1',
    namaGuru: 'Guru',
    nipGuru: '-',
    kotaSekolah: 'Jakarta',
    jenjang: 'SMP/MTs',
    kelasUtama: 'VIII',
    mataPelajaranUtama: 'IPA',
    semester: '1 (Ganjil)',
    tahunAjaran: '2024/2025',
    rombelAktif: 'VIII-A',
    instansiDinas: 'Dinas Pendidikan',
    alamatSekolah: 'Jl. Merdeka',
    namaKepalaSekolah: 'Kepsek',
    nipKepalaSekolah: '-',
    daftarRombel: ['VIII-A'],
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
  };
  const tp: CustomTPItem = {
    id: 'tp-1',
    kode: 'TP-1',
    elemen: 'Pemahaman IPA',
    materiPokok: 'Cahaya',
    tujuanPembelajaran: 'Sifat cahaya',
    arahanRangkuman: 'Rangkuman sifat cahaya',
    alokasiJP: 2,
    mingguMulai: 1,
    mingguSelesai: 2,
  };

  it('exports valid DOCX blob for experimental archetype without throwing', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'eksperimen');
    const blob = await exportLKPDToDocx(lkpd, profile);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const docXml = await zip.file('word/document.xml')?.async('text');
    expect(docXml).toBeDefined();
    expect(docXml).toContain('HIPOTESIS');
    expect(docXml).toContain('TABEL OBSERVASI');
  });

  it('exports valid DOCX blob for differentiated archetype without throwing', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'diferensiasi');
    const blob = await exportLKPDToDocx(lkpd, profile);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const docXml = await zip.file('word/document.xml')?.async('text');
    expect(docXml).toBeDefined();
    expect(docXml).toContain('Tingkat Dasar');
    expect(docXml).toContain('Tingkat Menengah');
    expect(docXml).toContain('Tingkat Mahir');
  });

  it('exports valid DOCX blob for project archetype without throwing', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'proyek');
    const blob = await exportLKPDToDocx(lkpd, profile);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const docXml = await zip.file('word/document.xml')?.async('text');
    expect(docXml).toBeDefined();
    expect(docXml).toContain('PERAN ANGGOTA');
    expect(docXml).toContain('RUBRIK PENILAIAN KARYA');
  });

  it('filters out panduanJawabanSingkat unless isTeacherMode === true', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'kasus');
    expect(lkpd.pertanyaanAnalisis[0].panduanJawabanSingkat).toBeTruthy();
    const answerGuideText = lkpd.pertanyaanAnalisis[0].panduanJawabanSingkat!;

    // Student mode: answer guide must NOT appear
    const studentBlob = await exportLKPDToDocx(lkpd, profile, false);
    const studentZip = await JSZip.loadAsync(await studentBlob.arrayBuffer());
    const studentXml = await studentZip.file('word/document.xml')?.async('text');
    expect(studentXml).not.toContain(answerGuideText);

    // Teacher mode: answer guide MUST appear
    const teacherBlob = await exportLKPDToDocx(lkpd, profile, true);
    const teacherZip = await JSZip.loadAsync(await teacherBlob.arrayBuffer());
    const teacherXml = await teacherZip.file('word/document.xml')?.async('text');
    expect(teacherXml).toContain(answerGuideText);
  });

  it('guards single column observation tables and missing column safely', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'eksperimen');
    lkpd.eksperimenData!.tabelObservasi = {
      kolom: ['No'],
      baris: [['1'], ['2']],
    };
    const blob = await exportLKPDToDocx(lkpd, profile);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(500);
  });

  it('guards differentiated tiers when tugas array or instruksi is undefined', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'diferensiasi');
    (lkpd.diferensiasiData!.tingkatDasar as any).tugas = undefined;
    (lkpd.diferensiasiData!.tingkatMenengah as any).tugas = null;
    const blob = await exportLKPDToDocx(lkpd, profile);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(500);
  });

  it('generates filename with presetType suffix in exportLKPDToDocx', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'eksperimen');
    await exportLKPDToDocx(lkpd, profile);
    expect(saveAs).toHaveBeenCalledWith(expect.anything(), 'LKPD_Cahaya_eksperimen.docx');
  });
});
