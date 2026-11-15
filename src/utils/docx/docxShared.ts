import {
  Document,
  Footer,
  Header,
  PageNumber,
  PageOrientation,
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

export interface DocxSectionSpec {
  children: (Paragraph | Table)[];
  landscape?: boolean;
}

/**
 * Helper pembuat Document DOCX multi-section terstandar dengan dukungan orientasi Portrait/Landscape
 */
export function createMultiSectionStyledDocxDocument(
  profile: SchoolProfile,
  docTitle: string,
  sectionsSpec: DocxSectionSpec[]
): Document {
  const schoolName = profile.namaSekolah || 'Satuan Pendidikan';
  const teacherName = profile.namaGuru || 'Guru Pengampu';
  const classLabel = `Kelas ${profile.kelasUtama || '-'}${profile.rombelAktif ? ` (${profile.rombelAktif})` : ''}`;

  const defaultHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: `${schoolName} • ${profile.mataPelajaranUtama} • ${classLabel} • ${docTitle}`,
            size: 15,
            color: '64748B',
            font: 'Calibri',
          }),
        ],
      }),
    ],
  });

  const defaultFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: `${teacherName} | TA ${profile.tahunAjaran || '-'} | Halaman `,
            size: 15,
            color: '64748B',
            font: 'Calibri',
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 15,
            color: '64748B',
            font: 'Calibri',
          }),
          new TextRun({
            text: ' dari ',
            size: 15,
            color: '64748B',
            font: 'Calibri',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 15,
            color: '64748B',
            font: 'Calibri',
          }),
        ],
      }),
    ],
  });

  return new Document({
    sections: sectionsSpec.map((sec) => ({
      properties: sec.landscape
        ? {
            page: {
              size: {
                orientation: PageOrientation.LANDSCAPE,
                width: 11906,
                height: 16838,
              },
              margin: { top: 520, right: 680, bottom: 480, left: 680, header: 260, footer: 260 },
            },
          }
        : {
            page: {
              size: {
                orientation: PageOrientation.PORTRAIT,
                width: 11906,
                height: 16838,
              },
              margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
            },
          },
      headers: { default: defaultHeader },
      footers: { default: defaultFooter },
      children: sec.children,
    })),
  });
}

/**
 * Helper pembuat Document DOCX terstandar dengan header & footer identitas sekolah/guru
 */
export function createStyledDocxDocument(
  profile: SchoolProfile,
  docTitle: string,
  children: (Paragraph | Table)[],
  options?: { landscape?: boolean }
): Document {
  return createMultiSectionStyledDocxDocument(profile, docTitle, [
    { children, landscape: options?.landscape },
  ]);
}

export function buildSignatureBlockTable(
  profile: SchoolProfile,
  namaPenyusun?: string,
  options?: { compact?: boolean }
): Table {
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const compact = Boolean(options?.compact);
  const signGap = compact ? 360 : 700;
  const lineSize = compact ? 18 : 20;
  const nipSize = compact ? 16 : 18;
  const pTight = compact ? { before: 0, after: 0 } : undefined;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: compact ? { top: 60, bottom: 0, left: 40, right: 40 } : undefined,
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({ spacing: pTight, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mengetahui,', size: lineSize })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: signGap }, children: [new TextRun({ text: 'Kepala Sekolah / Madrasah', size: lineSize })] }),
              new Paragraph({
                spacing: pTight,
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: profile.namaKepalaSekolah || '..........................................',
                    bold: true,
                    underline: {},
                    size: lineSize,
                  }),
                ],
              }),
              new Paragraph({
                spacing: pTight,
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: profile.nipKepalaSekolah ? `NIP. ${profile.nipKepalaSekolah}` : 'NIP. -',
                    size: nipSize,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: compact ? { top: 60, bottom: 0, left: 40, right: 40 } : undefined,
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({
                spacing: pTight,
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${profile.kotaSekolah || 'Indonesia'}, ${todayStr}`, size: lineSize })],
              }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: signGap }, children: [new TextRun({ text: 'Guru Mata Pelajaran', size: lineSize })] }),
              new Paragraph({
                spacing: pTight,
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: namaPenyusun || profile.namaGuru || '..........................................',
                    bold: true,
                    underline: {},
                    size: lineSize,
                  }),
                ],
              }),
              new Paragraph({
                spacing: pTight,
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -',
                    size: nipSize,
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
