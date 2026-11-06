import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle 
} from 'docx';
import saveAs from 'file-saver';
import type { P5ProjectDocument } from '../types/p5Project';
import type { SchoolProfile } from './schoolProfileStorage';
import { getSchoolProfile } from './schoolProfileStorage';

export async function exportP5ToDocx(
  p5Doc: P5ProjectDocument,
  userProfile?: SchoolProfile
): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  // ==========================================
  // HALAMAN 1: COVER MODUL PROJEK P5 RESMI
  // ==========================================
  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: profile.instansiDinas.toUpperCase(),
            bold: true,
            size: 22,
            font: 'Calibri',
            color: '1E293B',
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: (p5Doc.namaSekolah || profile.namaSekolah).toUpperCase(),
          bold: true,
          size: 28,
          font: 'Calibri',
          color: '0F172A',
        }),
      ],
    })
  );

  if (profile.alamatSekolah) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `${profile.alamatSekolah}${profile.kotaSekolah ? ' • ' + profile.kotaSekolah : ''}`,
            size: 18,
            color: '475569',
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // Double Border Pembatas Kop
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.DOUBLE, size: 18, space: 1, color: '000000' },
      },
      spacing: { after: 200 },
    })
  );

  // Judul Utama Modul Projek
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'MODUL PROJEK PENGUATAN PROFIL PELAJAR PANCASILA',
          bold: true,
          size: 26,
          font: 'Calibri',
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `(PROJEK P5 — KURIKULUM MERDEKA)`,
          bold: true,
          size: 20,
          font: 'Calibri',
          color: '475569',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `TEMA: ${p5Doc.tema.toUpperCase()}`,
          bold: true,
          size: 22,
          font: 'Calibri',
          color: 'D97706',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `"${p5Doc.judulProjek.toUpperCase()}"`,
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '0F172A',
        }),
      ],
    })
  );

  // Tabel Identitas Singkat Modul
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Fase / Jenjang', bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `${p5Doc.fase} / ${p5Doc.jenjang}`, size: 20 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Sasaran Kelas', bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `Kelas ${p5Doc.kelas}`, size: 20 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Alokasi Total Waktu', bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `${p5Doc.alokasiTotalJP} Jam Pelajaran (JP)`, bold: true, size: 20 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Tahun Ajaran', bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: p5Doc.tahunAjaran, size: 20 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Koordinator Projek', bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: p5Doc.koordinatorProjek, bold: true, size: 20 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Tim Fasilitator', bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: p5Doc.fasilitatorList.join(', '), size: 19 })] })],
          }),
        ],
      }),
    ],
  });
  children.push(infoTable);

  // ==========================================
  // HALAMAN 2: DESKRIPSI & RELEVANSI PROJEK
  // ==========================================
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: 'A. DESKRIPSI SINGKAT PROJEK', bold: true, size: 22, color: '1E3A8A' })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: p5Doc.deskripsiSingkat, size: 20, font: 'Calibri' })],
    }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: 'B. RELEVANSI PROJEK DENGAN LINGKUNGAN SEKOLAH', bold: true, size: 22, color: '1E3A8A' })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: p5Doc.relevansiProjek, size: 20, font: 'Calibri' })],
    })
  );

  // ==========================================
  // HALAMAN 3: DIMENSI, ELEMEN, & TARGET FASE
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: 'C. PEMETAAN DIMENSI, ELEMEN, & TARGET PENCAPAIAN PROFIL PELAJAR PANCASILA',
          bold: true,
          size: 22,
          color: '1E3A8A',
        }),
      ],
    })
  );

  const dimensiTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Dimensi', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Elemen', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Sub-Elemen', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Target Pencapaian Akhir Fase', bold: true, color: 'FFFFFF', size: 19 })] })] }),
        ],
      }),
      ...p5Doc.dimensiTarget.map((dt) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dt.dimensi, bold: true, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dt.elemen, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dt.subElemen, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dt.targetFase, size: 19 })] })] }),
          ],
        })
      ),
    ],
  });
  children.push(dimensiTable);

  // ==========================================
  // RUBRIK PERKEMBANGAN DIMENSI PANCASILA
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 80 },
      children: [
        new TextRun({
          text: 'D. RUBRIK PERKEMBANGAN SUB-ELEMEN PROFIL PELAJAR PANCASILA (BB, MB, BSH, SB)',
          bold: true,
          size: 22,
          color: '1E3A8A',
        }),
      ],
    })
  );

  p5Doc.dimensiTarget.forEach((dt) => {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 30 },
        children: [
          new TextRun({ text: `Sub-Elemen: ${dt.subElemen} `, bold: true, size: 19 }),
          new TextRun({ text: `(${dt.dimensi} - ${dt.elemen})`, italics: true, size: 18, color: '475569' }),
        ],
      })
    );

    const rubTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: 'FEE2E2' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Belum Berkembang (BB)', bold: true, size: 18, color: '991B1B' })] })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: 'FEF3C7' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mulai Berkembang (MB)', bold: true, size: 18, color: '92400E' })] })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: 'DCFCE7' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Berkembang Sesuai Harapan (BSH)', bold: true, size: 18, color: '166534' })] })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: 'DBEAFE' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Sangat Berkembang (SB)', bold: true, size: 18, color: '1E40AF' })] })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dt.rubrik.bb, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dt.rubrik.mb, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dt.rubrik.bsh, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dt.rubrik.sb, size: 18 })] })] }),
          ],
        }),
      ],
    });
    children.push(rubTable);
  });

  // ==========================================
  // HALAMAN 4: ALUR RANGKAIAN AKTIVITAS PROJEK
  // ==========================================
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: 'E. ALUR RANGKAIAN AKTIVITAS PEMBELAJARAN PROJEK',
          bold: true,
          size: 22,
          color: '1E3A8A',
        }),
      ],
    })
  );

  const alurTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Tahapan & JP', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Kegiatan & Tujuan', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Langkah Aktivitas Siswa', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Alat & Bentuk Asesmen', bold: true, color: 'FFFFFF', size: 19 })] })] }),
        ],
      }),
      ...p5Doc.alurAktivitas.map((akt) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(akt.no), bold: true, size: 19 })] })] }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: akt.tahap, bold: true, size: 19, color: '1E3A8A' })] }),
                new Paragraph({ children: [new TextRun({ text: `(${akt.alokasiJP} JP)`, italics: true, size: 18, color: '64748B' })] }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: akt.namaAktivitas, bold: true, size: 19 })] }),
                new Paragraph({ spacing: { before: 20 }, children: [new TextRun({ text: `Tujuan: ${akt.tujuanAktivitas}`, size: 18 })] }),
              ],
            }),
            new TableCell({
              children: akt.langkahKegiatan.map(
                (lk, lkIdx) =>
                  new Paragraph({
                    spacing: { after: 20 },
                    children: [new TextRun({ text: `${lkIdx + 1}. ${lk}`, size: 18 })],
                  })
              ),
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: `Alat: ${akt.alatDanBahan.join(', ')}`, size: 18 })] }),
                akt.bentukAsesmen
                  ? new Paragraph({ spacing: { before: 20 }, children: [new TextRun({ text: `Asesmen: ${akt.bentukAsesmen}`, bold: true, size: 18, color: '047857' })] })
                  : new Paragraph({}),
              ],
            }),
          ],
        })
      ),
    ],
  });
  children.push(alurTable);

  // ==========================================
  // RENCANA ASESMEN P5
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 60 },
      children: [new TextRun({ text: 'F. RENCANA ASESMEN PROJEK P5', bold: true, size: 22, color: '1E3A8A' })],
    }),
    new Paragraph({
      spacing: { after: 30 },
      children: [
        new TextRun({ text: '1. Asesmen Diagnostik (Awal Projek): ', bold: true, size: 20 }),
        new TextRun({ text: p5Doc.rencanaAsesmen.diagnostik, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 30 },
      children: [
        new TextRun({ text: '2. Asesmen Formatif (Proses Kegiatan): ', bold: true, size: 20 }),
        new TextRun({ text: p5Doc.rencanaAsesmen.formatif, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({ text: '3. Asesmen Sumatif (Gelar Karya / Produk Akhir): ', bold: true, size: 20 }),
        new TextRun({ text: p5Doc.rencanaAsesmen.sumatif, size: 20 }),
      ],
    })
  );

  // ==========================================
  // HALAMAN 5: LEMBAR OBSERVASI SISWA (RAPOR P5)
  // ==========================================
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'LEMBAR OBSERVASI PERKEMBANGAN DIMENSI PROFIL PELAJAR PANCASILA',
          bold: true,
          size: 22,
          font: 'Calibri',
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `(Lampiran Portofolio & Bahan Input Rapor P5 Siswa Kelas ${p5Doc.kelas})`,
          bold: true,
          size: 19,
          color: '475569',
        }),
      ],
    })
  );

  const obsTableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 18 })] })] }),
        new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Siswa', bold: true, color: 'FFFFFF', size: 18 })] })] }),
        ...p5Doc.dimensiTarget.map((dt) =>
          new TableCell({
            width: { size: Math.floor(40 / p5Doc.dimensiTarget.length), type: WidthType.PERCENTAGE },
            shading: { fill: '1E3A8A' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: dt.dimensi.split(',')[0], bold: true, color: 'FFFFFF', size: 17 })],
              }),
            ],
          })
        ),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Catatan Deskripsi Proses Guru', bold: true, color: 'FFFFFF', size: 18 })] })] }),
      ],
    }),
    ...p5Doc.rekapObservasiSiswa.map((sis, sIdx) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sIdx + 1), size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sis.nama, bold: true, size: 18 })] })] }),
          ...p5Doc.dimensiTarget.map((dt) => {
            const predikat = sis.nilaiDimensi[dt.dimensi] || 'BSH';
            const colorCode = predikat === 'SB' ? '1E40AF' : predikat === 'BSH' ? '15803D' : predikat === 'MB' ? 'B45309' : 'B91C1C';
            return new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: predikat, bold: true, color: colorCode, size: 18 })],
                }),
              ],
            });
          }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sis.catatanProses, size: 17 })] })] }),
        ],
      })
    ),
  ];
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: obsTableRows }));

  // Lembar Pengesahan
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const ttdTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: 'Mengetahui,', size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: 'Kepala Sekolah / Madrasah', size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.namaKepalaSekolah || '( .................................................... )', bold: true, underline: {}, size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIP. ${profile.nipKepalaSekolah || '...........................................'}`, size: 19 })] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: `${profile.kotaSekolah || 'Ditetapkan'}, ${todayStr}`, size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: 'Koordinator Projek P5', size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: p5Doc.koordinatorProjek || profile.namaGuru || '( .................................................... )', bold: true, underline: {}, size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIP. ${profile.nipGuru || '...........................................'}`, size: 19 })] }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(new Paragraph({ spacing: { before: 160 } }), ttdTable);

  // Buat Dokumen & Ekspor Blob
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1200,
              right: 1200,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTema = p5Doc.tema.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKelas = (p5Doc.kelas || 'Semua').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Modul_Projek_P5_${cleanTema}_Kelas_${cleanKelas}.docx`;
  saveAs(blob, filename);
}

