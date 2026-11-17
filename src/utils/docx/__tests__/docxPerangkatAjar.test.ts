import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { exportLKPDToDocx, exportModulAjarToDocx, formatTargetSubTPList } from '../docxPerangkatAjar';
import { buildSmartLKPD, buildSmartModulAjar } from '../../perangkatAjarEngine';
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

  it('formatTargetSubTPList handles legacy string array, object array {kode, kompetensi}, and empty values safely', () => {
    expect(formatTargetSubTPList(['8.1.A: Mengenali sifat cahaya', '8.1.B: Menguji pemantulan'])).toBe(
      '8.1.A: Mengenali sifat cahaya; 8.1.B: Menguji pemantulan'
    );
    expect(
      formatTargetSubTPList([
        { id: 'sub-1', kode: '8.1.A', kompetensi: 'Menjelaskan pemantulan cahaya' },
        { id: 'sub-2', kode: '8.1.B', kompetensi: 'Menganalisis pembiasan cahaya' },
      ])
    ).toBe('8.1.A: Menjelaskan pemantulan cahaya; 8.1.B: Menganalisis pembiasan cahaya');
    expect(formatTargetSubTPList([])).toBe('');
    expect(formatTargetSubTPList(undefined)).toBe('');
    expect(formatTargetSubTPList(null)).toBe('');
  });

  it('exports Modul Ajar and LKPD DOCX with object/string/empty targetSubTP without [object Object]', async () => {
    const subObjects = [
      { id: 'sub-a', kode: 'TP-1.A', kompetensi: 'Mengidentifikasi pemantulan cahaya pada cermin datar' },
      { id: 'sub-b', kode: 'TP-1.B', kompetensi: 'Menyimpulkan hukum pembiasan cahaya' },
    ];
    const readSavedDocxXml = async (): Promise<string> => {
      const mockCalls = vi.mocked(saveAs).mock.calls;
      const lastBlob = mockCalls[mockCalls.length - 1]?.[0] as Blob;
      expect(lastBlob).toBeDefined();
      const zip = await JSZip.loadAsync(await lastBlob.arrayBuffer());
      return (await zip.file('word/document.xml')?.async('text')) || '';
    };

    const modulObj = buildSmartModulAjar(tp, profile);
    modulObj.targetSubTP = subObjects;
    await exportModulAjarToDocx(modulObj, profile);
    const modulXmlObj = await readSavedDocxXml();
    expect(modulXmlObj).not.toContain('[object Object]');
    expect(modulXmlObj).toContain('TP-1.A: Mengidentifikasi pemantulan cahaya pada cermin datar');
    expect(modulXmlObj).toContain('TP-1.B: Menyimpulkan hukum pembiasan cahaya');

    const lkpdObj = buildSmartLKPD(tp, profile, 'kasus');
    lkpdObj.targetSubTP = subObjects;
    const lkpdBlobObj = await exportLKPDToDocx(lkpdObj, profile);
    const lkpdXmlObj = await (await JSZip.loadAsync(await lkpdBlobObj.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(lkpdXmlObj).not.toContain('[object Object]');
    expect(lkpdXmlObj).toContain('TP-1.A: Mengidentifikasi pemantulan cahaya pada cermin datar');

    // Legacy string[] format
    const modulLegacyStr = buildSmartModulAjar(tp, profile);
    (modulLegacyStr as any).targetSubTP = ['Sub-TP Legacy Pertama', 'Sub-TP Legacy Kedua'];
    await exportModulAjarToDocx(modulLegacyStr, profile);
    const modulXmlStr = await readSavedDocxXml();
    expect(modulXmlStr).not.toContain('[object Object]');
    expect(modulXmlStr).toContain('Sub-TP Legacy Pertama; Sub-TP Legacy Kedua');

    const lkpdLegacyStr = buildSmartLKPD(tp, profile, 'kasus');
    (lkpdLegacyStr as any).targetSubTP = ['Sub-TP LKPD String'];
    const lkpdBlobStr = await exportLKPDToDocx(lkpdLegacyStr, profile);
    const lkpdXmlStr = await (await JSZip.loadAsync(await lkpdBlobStr.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(lkpdXmlStr).not.toContain('[object Object]');
    expect(lkpdXmlStr).toContain('Sub-TP LKPD String');

    // Empty / undefined targetSubTP
    const modulEmpty = buildSmartModulAjar(tp, profile);
    modulEmpty.targetSubTP = undefined;
    await exportModulAjarToDocx(modulEmpty, profile);
    const modulXmlEmpty = await readSavedDocxXml();
    expect(modulXmlEmpty).not.toContain('[object Object]');
    expect(modulXmlEmpty).not.toContain('Indikator / Sub-TP:');

    const lkpdEmpty = buildSmartLKPD(tp, profile, 'kasus');
    lkpdEmpty.targetSubTP = [];
    const lkpdBlobEmpty = await exportLKPDToDocx(lkpdEmpty, profile);
    const lkpdXmlEmpty = await (await JSZip.loadAsync(await lkpdBlobEmpty.arrayBuffer()))
      .file('word/document.xml')!
      .async('text');
    expect(lkpdXmlEmpty).not.toContain('[object Object]');
    expect(lkpdXmlEmpty).not.toContain('Indikator Sub-TP :');
  });
});
