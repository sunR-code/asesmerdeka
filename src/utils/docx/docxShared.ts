import {
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import type { SchoolProfile } from '../schoolProfileStorage';

export function buildSignatureBlockTable(profile: SchoolProfile, namaPenyusun?: string): Table {
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return new Table({
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
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mengetahui,', size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: 'Kepala Sekolah / Madrasah', size: 20 })] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: profile.namaKepalaSekolah || '..........................................',
                    bold: true,
                    underline: {},
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: profile.nipKepalaSekolah ? `NIP. ${profile.nipKepalaSekolah}` : 'NIP. -',
                    size: 18,
                  }),
                ],
              }),
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
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${profile.kotaSekolah || 'Indonesia'}, ${todayStr}`, size: 20 })],
              }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: 'Guru Mata Pelajaran', size: 20 })] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: namaPenyusun || profile.namaGuru || '..........................................',
                    bold: true,
                    underline: {},
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -',
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
