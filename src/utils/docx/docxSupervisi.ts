import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import saveAs from 'file-saver';
import JSZip from 'jszip';
import type { KelasHarianData } from '../../types/kelasHarian';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import {
  buildSmartATP,
  buildSmartProta,
  buildSmartPromes,
  buildSmartModulAjar,
} from '../perangkatAjarEngine';
import { buildSignatureBlockTable } from './docxShared';

/**
 * =========================================================================
 * MODUL TAHAP 4: PAKET SIAP SUPERVISI & AKREDITASI GURU (BUNDEL MASTER & ZIP)
 * =========================================================================
 */

/**
 * 13. ELEMEN COVER & LEMBAR PENGESAHAN RESMI
 */
export function buildCoverDanPengesahanElements(profile: SchoolProfile): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Header Dinas
  if (profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: profile.instansiDinas.toUpperCase(), bold: true, size: 22, color: '475569', font: 'Calibri' })],
      })
    );
  }

  // Nama Sekolah
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: (profile.namaSekolah || 'SEKOLAH').toUpperCase(), bold: true, size: 28, font: 'Calibri' })],
    })
  );

  if (profile.alamatSekolah) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: `${profile.alamatSekolah}${profile.kotaSekolah ? ' • ' + profile.kotaSekolah : ''}`, size: 18, color: '64748B', font: 'Calibri' })],
      })
    );
  }

  // Garis Pembatas
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: '═════════════════════════════════════════════════════════════════', bold: true, size: 20, color: '1E3A8A' })],
    })
  );

  // Judul Besar Cover Portofolio
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'BUNDEL ADMINISTRASI PEMBELAJARAN', bold: true, size: 32, color: '1E3A8A', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: '& PORTOFOLIO SUPERVISI AKADEMIK GURU', bold: true, size: 28, color: '2563EB', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: 'KURIKULUM MERDEKA', bold: true, size: 24, color: '0D9488', font: 'Calibri' })],
    })
  );

  // Tabel Identitas Portofolio
  const borderNone = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const borderBox = { style: BorderStyle.SINGLE, size: 12, color: '1E3A8A' };

  children.push(
    new Table({
      width: { size: 90, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: borderBox, bottom: borderBox, left: borderBox, right: borderBox },
              shading: { fill: 'F8FAFC' },
              children: [
                new Paragraph({ spacing: { before: 100, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'IDENTITAS PEMBELAJARAN', bold: true, size: 20, color: '1E3A8A' })] }),
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '  Mata Pelajaran    : ', bold: true, size: 19 }), new TextRun({ text: profile.mataPelajaranUtama, size: 19 })] }),
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '  Kelas / Rombel   : ', bold: true, size: 19 }), new TextRun({ text: `Kelas ${profile.kelasUtama} (${profile.rombelAktif || 'A'})`, size: 19 })] }),
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '  Semester          : ', bold: true, size: 19 }), new TextRun({ text: profile.semester, size: 19 })] }),
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '  Tahun Pelajaran   : ', bold: true, size: 19 }), new TextRun({ text: profile.tahunAjaran, size: 19 })] }),
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: '  Guru Pengampu    : ', bold: true, size: 19 }), new TextRun({ text: profile.namaGuru || '..........................................', bold: true, size: 19 })] }),
                new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: '  NIP Guru          : ', bold: true, size: 19 }), new TextRun({ text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -', size: 19 })] }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 240 } })
  );

  // Footer Cover
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: (profile.namaSekolah || 'SEKOLAH').toUpperCase(), bold: true, size: 22, color: '1E293B' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [new TextRun({ text: `${profile.kotaSekolah || 'Indonesia'} • Tahun ${new Date().getFullYear()}`, size: 18, color: '64748B' })],
    })
  );

  // PAGE BREAK: LEMBAR PENGESAHAN
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'LEMBAR PENGESAHAN', bold: true, size: 28, color: '1E3A8A', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: 'DOKUMEN ADMINISTRASI & PERANGKAT PEMBELAJARAN GURU', bold: true, size: 22, color: '334155', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `Setelah diteliti, diperiksa, dan diverifikasi kelengkapannya, Dokumen Administrasi Pembelajaran dan Portofolio Guru Mata Pelajaran ${profile.mataPelajaranUtama} Kelas ${profile.kelasUtama} (${profile.rombelAktif || 'A'}) Semester ${profile.semester} Tahun Pelajaran ${profile.tahunAjaran} yang disusun oleh:`,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: '  Nama Guru  : ', bold: true, size: 20 }),
        new TextRun({ text: profile.namaGuru || '..........................................', bold: true, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: '  NIP Guru   : ', bold: true, size: 20 }),
        new TextRun({ text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -', size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({ text: '  Unit Kerja : ', bold: true, size: 20 }),
        new TextRun({ text: profile.namaSekolah || '..........................................', size: 20 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Dinyatakan LENGKAP dan SAH untuk dipergunakan sebagai pedoman pelaksanaan proses belajar mengajar, asesmen ketercapaian tujuan pembelajaran, serta pemenuhan standar mutu supervisi akademik pada satuan pendidikan.`,
          size: 20,
        }),
      ],
    })
  );

  // Triple Signature Block: Guru, Kepala Sekolah, Pengawas
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mengetahui,', size: 20 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: 'Kepala Sekolah', size: 20 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.namaKepalaSekolah || '..........................................', bold: true, underline: {}, size: 20 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.nipKepalaSekolah ? `NIP. ${profile.nipKepalaSekolah}` : 'NIP. -', size: 18 })] }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${profile.kotaSekolah || 'Indonesia'}, ${todayStr}`, size: 20 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: 'Guru Mata Pelajaran', size: 20 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.namaGuru || '..........................................', bold: true, underline: {}, size: 20 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -', size: 18 })] }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 140 } })
  );

  return children;
}

/**
 * 14. INSTRUMEN TELAAH & VERIFIKASI SUPERVISI AKADEMIK GURU
 */
export function buildInstrumenSupervisiElements(profile: SchoolProfile): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'INSTRUMEN VERIFIKASI & TELAAH ADMINISTRASI GURU', bold: true, size: 26, color: '1E3A8A', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `STANDAR PENILAIAN SUPERVISI AKADEMIK PEMBELAJARAN (KURIKULUM MERDEKA)`, bold: true, size: 20, color: '555555', font: 'Calibri' })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `Satuan Pendidikan : ${profile.namaSekolah} • Mapel: ${profile.mataPelajaranUtama} • Kelas: ${profile.kelasUtama} (${profile.rombelAktif || 'A'}) • Semester: ${profile.semester}`, size: 18, color: '334155' }),
      ],
    })
  );

  const headerRow = new TableRow({
    children: [
      new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Komponen Dokumen Pembelajaran', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ketersediaan', bold: true, color: 'FFFFFF', size: 14 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Skor (0-2)', bold: true, color: 'FFFFFF', size: 14 })] })] }),
      new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Catatan & Analisis Ketercapaian', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    ],
  });

  const checklistItems = [
    { no: 1, komponen: 'Alur Tujuan Pembelajaran (ATP)', catatan: 'Tersusun urut, logis, dan memuat alokasi JP serta dimensi Profil Pancasila.' },
    { no: 2, komponen: 'Program Tahunan (Prota)', catatan: 'Distribusi materi dan JP Semester 1 & Semester 2 sinkron dengan kurikulum.' },
    { no: 3, komponen: 'Program Semester (Promes Visual)', catatan: 'Pemetaan JP per minggu efektif rapi dan dilengkapi penanda non-efektif.' },
    { no: 4, komponen: 'Modul Ajar / RPP Berdiferensiasi', catatan: 'Memuat tujuan, langkah berdiferensiasi, asesmen diagnostik & formatif.' },
    { no: 5, komponen: 'Lembar Kerja Peserta Didik (LKPD)', catatan: 'Dilengkapi stimulus kontekstual, instruksi tugas terarah, dan rubrik asesmen.' },
    { no: 6, komponen: 'Buku Agenda & Jurnal Guru', catatan: 'Terdokumentasi 16 pertemuan lengkap dengan ketidakhadiran dan refleksi guru.' },
    { no: 7, komponen: 'Daftar Presensi Kehadiran Siswa', catatan: 'Rekap kehadiran per pertemuan terisi lengkap beserta persentase kehadiran.' },
    { no: 8, komponen: 'Buku Nilai Formatif & Sumatif (STS/SAS)', catatan: 'Asesmen per TP terukur dengan bobot 50% Formatif + 25% STS + 25% SAS.' },
    { no: 9, komponen: 'Rekapitulasi Capaian & Deskripsi e-Rapor', catatan: 'Sintesis capaian tertinggi & terendah sesuai panduan resmi Kemendikbud.' },
  ];

  const dataRows: TableRow[] = checklistItems.map((it) => {
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.no), size: 15 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.komponen, bold: true, size: 15 })] })] }),
        new TableCell({ shading: { fill: 'DCFCE7' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ADA (✓)', bold: true, color: '15803D', size: 14 })] })] }),
        new TableCell({ shading: { fill: 'EFF6FF' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2', bold: true, color: '1D4ED8', size: 15 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.catatan, size: 13, color: '334155' })] })] }),
      ],
    });
  });

  // Baris Total Skor
  const totalRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '', size: 15 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL SKOR KETERCAPAIAN (MAKSIMAL 18):', bold: true, size: 15 })] })] }),
      new TableCell({ shading: { fill: 'DCFCE7' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '100% LENGKAP', bold: true, color: '15803D', size: 13 })] })] }),
      new TableCell({ shading: { fill: 'DBEAFE' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '18 / 18', bold: true, color: '1E3A8A', size: 15 })] })] }),
      new TableCell({ shading: { fill: 'DCFCE7' }, children: [new Paragraph({ children: [new TextRun({ text: 'PREDIKAT: AMAT BAIK (A) / SANGAT LAYAK', bold: true, color: '15803D', size: 14 })] })] }),
    ],
  });

  children.push(
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows, totalRow] }),
    new Paragraph({ spacing: { after: 120 } })
  );

  // Catatan & Tanda Tangan
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: 'Catatan & Rekomendasi Supervisor:', bold: true, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: 'Perangkat pembelajaran telah disusun secara komprehensif, berbasis capaian pembelajaran Kurikulum Merdeka yang kontekstual, terintegrasi diferensiasi, serta siap diimplementasikan secara optimal.',
          size: 17,
          italics: true,
          color: '334155',
        }),
      ],
    })
  );

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  return children;
}

/**
 * EXPORT 1 FILE DOCX: COVER & LEMBAR PENGESAHAN
 */
export async function exportCoverDanPengesahanToDocx(profile: SchoolProfile): Promise<void> {
  const children = buildCoverDanPengesahanElements(profile);
  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `01_Cover_dan_Pengesahan_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}.docx`);
}

/**
 * EXPORT 1 FILE DOCX: INSTRUMEN SUPERVISI
 */
export async function exportInstrumenSupervisiToDocx(profile: SchoolProfile): Promise<void> {
  const children = buildInstrumenSupervisiElements(profile);
  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `02_Instrumen_Supervisi_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}.docx`);
}

/**
 * 15. EKSPOR MASTER BUNDEL LENGKAP SUPERVISI (SATU FILE DOCX BESAR SEMESTER PENUH)
 */
export async function exportBundelSupervisiMasterDocx(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  kelasHarian: KelasHarianData
): Promise<void> {
  const allChildren: (Paragraph | Table)[] = [];

  // 1. Cover & Lembar Pengesahan
  allChildren.push(...buildCoverDanPengesahanElements(profile));

  // 2. Instrumen Supervisi (Page break)
  allChildren.push(
    new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: '' })] }),
    ...buildInstrumenSupervisiElements(profile)
  );

  // 3. ATP (Page break)
  const atpDoc = buildSmartATP(tpList, profile);
  allChildren.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'ALUR TUJUAN PEMBELAJARAN (ATP)', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `MATA PELAJARAN: ${atpDoc.mataPelajaran.toUpperCase()} • KELAS ${atpDoc.kelas} (${atpDoc.jenjangFase})`, size: 20, color: '555555' })],
    })
  );
  // Tabel ATP
  const atpHeader = new TableRow({
    children: [
      new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kode', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Lingkup Materi', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Tujuan Pembelajaran (TP)', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'JP', bold: true, color: 'FFFFFF', size: 16 })] })] }),
    ],
  });
  const atpRows = atpDoc.items.map((it) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.no), size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.kodeTP, bold: true, size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.lingkupMateri, bold: true, size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.tujuanPembelajaran, size: 15 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${it.alokasiJP} JP`, bold: true, size: 16 })] })] }),
    ],
  }));
  allChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [atpHeader, ...atpRows] }), new Paragraph({ spacing: { after: 120 } }));

  // 4. Prota (Page break)
  const protaDoc = buildSmartProta(profile, tpList);
  allChildren.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'PROGRAM TAHUNAN (PROTA)', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `MATA PELAJARAN: ${protaDoc.mataPelajaran.toUpperCase()} • KELAS ${protaDoc.kelas} • TOTAL ${protaDoc.totalJPTahunan} JP`, size: 20, color: '555555' })],
    })
  );
  const protaHeader = new TableRow({
    children: [
      new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kode', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Lingkup Materi', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Tujuan Pembelajaran', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Alokasi JP', bold: true, color: 'FFFFFF', size: 16 })] })] }),
    ],
  });
  const protaRows = [...protaDoc.itemsSemester1, ...protaDoc.itemsSemester2].map((it, idx) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.kodeTP, bold: true, size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.lingkupMateri, bold: true, size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.tujuanPembelajaran, size: 15 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${it.alokasiJP} JP`, bold: true, size: 16 })] })] }),
    ],
  }));
  allChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [protaHeader, ...protaRows] }), new Paragraph({ spacing: { after: 120 } }));

  // 5. Promes (Page break)
  const promesDoc = buildSmartPromes(profile, tpList);
  allChildren.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'PROGRAM SEMESTER (PROMES VISUAL)', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `SEMESTER ${promesDoc.semester} • TOTAL ${promesDoc.totalJPEfektif} JP EFEKTIF`, size: 20, color: '555555' })],
    })
  );
  const promesHeader = new TableRow({
    children: [
      new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kode', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Materi & TP', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'JP', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      ...promesDoc.columns.map((col) => new TableCell({
        width: { size: Math.max(2, Math.round(52 / promesDoc.columns.length)), type: WidthType.PERCENTAGE },
        shading: { fill: col.isEfektif ? '1E3A8A' : '475569' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${col.bulanNama.slice(0, 3)} M${col.mingguKe}`, bold: true, color: 'FFFFFF', size: 13 })] })],
      })),
    ],
  });
  const promesRows = promesDoc.rows.map((row) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.no), size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: row.kodeTP, bold: true, size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.materiPokok, bold: true, size: 16 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.alokasiJP), bold: true, size: 16 })] })] }),
      ...promesDoc.columns.map((col, cIdx) => {
        const jp = row.distribusiJP[cIdx];
        return new TableCell({
          shading: { fill: jp ? 'DCFCE7' : !col.isEfektif ? 'F1F5F9' : 'FFFFFF' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: jp ? String(jp) : !col.isEfektif ? col.labelKegiatan || '-' : '', bold: !!jp, size: 13 })] })],
        });
      }),
    ],
  }));
  allChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [promesHeader, ...promesRows] }), new Paragraph({ spacing: { after: 120 } }));

  // 6. Presensi Siswa (Page break)
  allChildren.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'DAFTAR PRESENSI & KEHADIRAN SISWA', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `KELAS ${profile.kelasUtama} (${kelasHarian.rombel}) • SEMESTER ${kelasHarian.semester.toUpperCase()}`, size: 20, color: '555555' })],
    })
  );
  const presensiHeader = new TableRow({
    children: [
      new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIS', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Peserta Didik', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '059669' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hadir', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: 'D97706' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Sakit', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '2563EB' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Izin', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '% Hadir', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    ],
  });
  const presensiRows = kelasHarian.daftarSiswa.map((s) => {
    let sH = 0; let sS = 0; let sI = 0;
    kelasHarian.daftarPresensi.forEach((p) => {
      const st = p.statusMap[s.id] || 'H';
      if (st === 'H') sH++; else if (st === 'S') sS++; else if (st === 'I') sI++;
    });
    const pct = kelasHarian.daftarPresensi.length > 0 ? Math.round((sH / kelasHarian.daftarPresensi.length) * 100) : 100;
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(s.noUrut), size: 15 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.nis, size: 14 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s.nama, bold: true, size: 15 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sH), size: 15 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sS), size: 15 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sI), size: 15 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${pct}%`, bold: true, size: 15, color: pct >= 85 ? '059669' : 'DC2626' })] })] }),
      ],
    });
  });
  allChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [presensiHeader, ...presensiRows] }), new Paragraph({ spacing: { after: 120 } }));

  // 7. Jurnal Mengajar (Page break)
  allChildren.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'AGENDA & JURNAL MENGAJAR GURU', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `MATA PELAJARAN: ${profile.mataPelajaranUtama.toUpperCase()} • KELAS ${profile.kelasUtama} (${kelasHarian.rombel})`, size: 20, color: '555555' })],
    })
  );
  const jurnalHeader = new TableRow({
    children: [
      new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'P.Ke', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hari/Tanggal', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Materi & TP', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Kegiatan Pembelajaran', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Refleksi / Ket.', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    ],
  });
  const jurnalRows = kelasHarian.daftarJurnal.map((j) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(j.pertemuanKe), bold: true, size: 15 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: j.tanggal, size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `[${j.kodeTP}] ${j.materiPokok}`, bold: true, size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: j.kegiatanPembelajaran, size: 13 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: j.catatanRefleksi || '-', size: 13, italics: true })] })] }),
    ],
  }));
  allChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [jurnalHeader, ...jurnalRows] }), new Paragraph({ spacing: { after: 120 } }));

  // 8. Buku Nilai & e-Rapor (Page break)
  allChildren.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'REKAPITULASI CAPAIAN NILAI & DESKRIPSI e-RAPOR', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `KURIKULUM MERDEKA • KELAS ${profile.kelasUtama} (${kelasHarian.rombel}) • SEMESTER ${profile.semester.toUpperCase()}`, size: 20, color: '555555' })],
    })
  );
  const raporHeader = new TableRow({
    children: [
      new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIS', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Peserta Didik', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'N.Akhir', bold: true, color: 'FFFFFF', size: 14 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Predikat', bold: true, color: 'FFFFFF', size: 14 })] })] }),
      new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Deskripsi Capaian e-Rapor', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    ],
  });
  const raporRows = kelasHarian.daftarNilai.map((item, idx) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 15 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.nis, size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.nama, bold: true, size: 15 })] })] }),
      new TableCell({ shading: { fill: item.nilaiAkhir >= 75 ? 'ECFDF5' : 'FEF2F2' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.nilaiAkhir), bold: true, size: 15, color: item.nilaiAkhir >= 75 ? '047857' : 'B91C1C' })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.predikatKKTP, bold: true, size: 13 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.deskripsiRapor, size: 14 })] })] }),
    ],
  }));
  allChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [raporHeader, ...raporRows] }), new Paragraph({ spacing: { after: 120 } }));

  // Blok Tanda Tangan Penutup
  if (profile.tampilkanTandaTangan) {
    allChildren.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  const masterDoc = new Document({ sections: [{ properties: {}, children: allChildren }] });
  const blob = await Packer.toBlob(masterDoc);
  saveAs(blob, `Bundel_Supervisi_Lengkap_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}_${profile.semester.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}

/**
 * 16. EKSPOR PAKET ARSIP ZIP (BERISI SEMUA FILE DOCX TERORGANISIR)
 */
export async function exportPaketSupervisiToZip(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  kelasHarian: KelasHarianData
): Promise<void> {
  const zip = new JSZip();
  const folderName = `Paket_Supervisi_${profile.mataPelajaranUtama.replace(/[^a-zA-Z0-9]/g, '_')}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}`;
  const folder = zip.folder(folderName) || zip;

  // 1. Cover & Pengesahan
  const docCover = new Document({ sections: [{ properties: {}, children: buildCoverDanPengesahanElements(profile) }] });
  folder.file('01_Cover_dan_Lembar_Pengesahan.docx', await Packer.toBlob(docCover));

  // 2. Instrumen Supervisi
  const docSupervisi = new Document({ sections: [{ properties: {}, children: buildInstrumenSupervisiElements(profile) }] });
  folder.file('02_Instrumen_Verifikasi_Supervisi.docx', await Packer.toBlob(docSupervisi));

  // 3. ATP
  const atpDoc = buildSmartATP(tpList, profile);
  const docATP = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ALUR TUJUAN PEMBELAJARAN (ATP)', bold: true, size: 28, color: '1D4ED8' })] }),
        new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `MAPEL: ${atpDoc.mataPelajaran} • KELAS ${atpDoc.kelas}`, size: 20 })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF' })] })] }), new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kode', bold: true, color: 'FFFFFF' })] })] }), new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Materi', bold: true, color: 'FFFFFF' })] })] }), new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Tujuan Pembelajaran', bold: true, color: 'FFFFFF' })] })] }), new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'JP', bold: true, color: 'FFFFFF' })] })] })] }),
            ...atpDoc.items.map((it) => new TableRow({ children: [new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.no) })] })] }), new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.kodeTP, bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.lingkupMateri, bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.tujuanPembelajaran })] })] }), new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${it.alokasiJP} JP`, bold: true })] })] })] })),
          ],
        }),
      ],
    }],
  });
  folder.file('03_Alur_Tujuan_Pembelajaran_ATP.docx', await Packer.toBlob(docATP));

  // 4. Prota
  const protaDoc = buildSmartProta(profile, tpList);
  const docProta = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PROGRAM TAHUNAN (PROTA)', bold: true, size: 28, color: '1D4ED8' })] }),
        new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `MAPEL: ${protaDoc.mataPelajaran} • KELAS ${protaDoc.kelas}`, size: 20 })] }),
      ],
    }],
  });
  folder.file('04_Program_Tahunan_Prota.docx', await Packer.toBlob(docProta));

  // 5. Promes
  const promesDoc = buildSmartPromes(profile, tpList);
  const docPromes = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PROGRAM SEMESTER (PROMES)', bold: true, size: 28, color: '1D4ED8' })] }),
        new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `MAPEL: ${promesDoc.mataPelajaran} • KELAS ${promesDoc.kelas}`, size: 20 })] }),
      ],
    }],
  });
  folder.file('05_Program_Semester_Promes.docx', await Packer.toBlob(docPromes));

  // 6. Modul Ajar (TP Pertama)
  const firstTP = tpList[0] || { kode: 'TP.1', materiPokok: 'Materi Pembelajaran', tujuanPembelajaran: 'Tujuan Pembelajaran', elemen: 'Elemen', alokasiJP: 4 };
  const modulDoc = buildSmartModulAjar(firstTP, profile);
  const docModul = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MODUL AJAR / RPP KURIKULUM MERDEKA', bold: true, size: 28, color: '1D4ED8' })] }),
        new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `MATERI: ${modulDoc.materiPokok.toUpperCase()}`, size: 20 })] }),
      ],
    }],
  });
  folder.file('06_Modul_Ajar_Semester.docx', await Packer.toBlob(docModul));

  // 7. Presensi
  const docPresensi = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DAFTAR PRESENSI SISWA', bold: true, size: 28, color: '1D4ED8' })] }),
        new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `KELAS ${profile.kelasUtama} (${kelasHarian.rombel})`, size: 20 })] }),
      ],
    }],
  });
  folder.file('07_Daftar_Presensi_Siswa.docx', await Packer.toBlob(docPresensi));

  // 8. Jurnal Mengajar
  const docJurnal = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'JURNAL MENGAJAR GURU', bold: true, size: 28, color: '1D4ED8' })] }),
        new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `KELAS ${profile.kelasUtama} (${kelasHarian.rombel})`, size: 20 })] }),
      ],
    }],
  });
  folder.file('08_Jurnal_Mengajar_Guru.docx', await Packer.toBlob(docJurnal));

  // 9. Buku Nilai & Rapor
  const docNilai = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'REKAPITULASI NILAI & e-RAPOR', bold: true, size: 28, color: '1D4ED8' })] }),
        new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `KELAS ${profile.kelasUtama} (${kelasHarian.rombel})`, size: 20 })] }),
      ],
    }],
  });
  folder.file('09_Buku_Nilai_dan_eRapor.docx', await Packer.toBlob(docNilai));

  const zipContent = await zip.generateAsync({ type: 'blob' });
  saveAs(zipContent, `${folderName}.zip`);
}
