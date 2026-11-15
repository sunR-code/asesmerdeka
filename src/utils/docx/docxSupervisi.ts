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
import type { LKPDDokumen, ModulAjarDokumen } from '../../types/perangkatAjar';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import { jenjangToDefaultFase } from '../schoolProfileStorage';
import { getSemesterCurriculumPlan } from '../kurikulumCatalog';
import {
  buildSmartATP,
  buildSmartProta,
  buildSmartPromes,
  buildSmartModulAjar,
  buildSmartLKPD,
} from '../perangkatAjarEngine';
import {
  loadLatestLKPDDraft,
  loadLatestModulAjarDraft,
} from '../perangkatDraftStorage';
import { getExportVerificationNoticeText } from '../kelasHarianStorage';
import {
  createDefaultSupervisiInstrumentData,
  evaluateSupervisiInstrument,
  getSupervisiDocumentsReadiness,
  getSupervisiInstrumentData,
  SUPERVISI_DOCUMENT_DEFINITIONS,
  SUPERVISI_STATUS_LABELS,
  type SupervisiInstrumentData,
  type SupervisiItemStatus,
} from '../supervisiStorage';
import {
  buildSignatureBlockTable,
  createMultiSectionStyledDocxDocument,
  createStyledDocxDocument,
} from './docxShared';
import {
  buildATPElements,
  buildLKPDElements,
  buildModulAjarElements,
  buildPromesElements,
  buildProtaElements,
} from './docxPerangkatAjar';
import {
  buildDaftarNilaiElements,
  buildJurnalMengajarElements,
  buildPresensiElements,
  buildRekapRaporElements,
} from './docxKelasHarian';

/**
 * =========================================================================
 * MODUL TAHAP 4: PAKET SIAP SUPERVISI & AKREDITASI GURU (BUNDEL MASTER & ZIP)
 * =========================================================================
 */

export interface SupervisiExportOptions {
  instrument?: SupervisiInstrumentData;
  activeModulAjar?: ModulAjarDokumen | null;
  activeLKPD?: LKPDDokumen | null;
  /**
   * Hook opsional untuk pengujian integritas / fault-injection pembuatan dokumen tertentu (1..9).
   */
  docBlobOverrides?: Partial<Record<number, () => Promise<Blob>>>;
}

export interface SupervisiZipFileEntry {
  id: number;
  kode: string;
  nama: string;
  fileName: string;
  byteSize: number;
}

export interface SupervisiZipExportResult {
  zipBlob: Blob;
  zipFileName: string;
  folderName: string;
  files: SupervisiZipFileEntry[];
}

export interface SupervisiMasterBundleResult {
  blob: Blob;
  fileName: string;
  sections: string[];
}

function maybeBuildVerificationBanner(kelasHarian?: KelasHarianData): Paragraph[] {
  if (!kelasHarian) return [];
  const noticeText = getExportVerificationNoticeText(kelasHarian);
  if (!noticeText) return [];
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 120 },
      children: [
        new TextRun({
          text: `[${noticeText}]`,
          bold: true,
          size: 18,
          color: 'B45309',
          font: 'Calibri',
        }),
      ],
    }),
  ];
}

function pageBreakParagraph(): Paragraph {
  return new Paragraph({
    pageBreakBefore: true,
    children: [new TextRun({ text: '' })],
  });
}

function statusCellShading(status: SupervisiItemStatus): string {
  if (status === 'ada') return 'DCFCE7';
  if (status === 'perlu_perbaikan') return 'FEF3C7';
  if (status === 'tidak_ada') return 'FEE2E2';
  return 'F1F5F9';
}

function statusTextColor(status: SupervisiItemStatus): string {
  if (status === 'ada') return '15803D';
  if (status === 'perlu_perbaikan') return 'B45309';
  if (status === 'tidak_ada') return 'B91C1C';
  return '475569';
}

async function packAndValidateDocxBlob(
  doc: Document,
  docLabel: string
): Promise<Blob> {
  const blob = await Packer.toBlob(doc);
  if (!blob || blob.size === 0) {
    throw new Error(`Dokumen ${docLabel} menghasilkan file kosong (0 byte).`);
  }
  const buffer = await blob.arrayBuffer();
  const parsedZip = await JSZip.loadAsync(buffer);
  const xmlFile = parsedZip.file('word/document.xml');
  if (!xmlFile) {
    throw new Error(`Dokumen ${docLabel} tidak memiliki struktur word/document.xml yang valid.`);
  }
  const xmlText = await xmlFile.async('string');
  if (!xmlText || xmlText.length < 200) {
    throw new Error(`Dokumen ${docLabel} tidak memiliki isi dokumen yang memadai.`);
  }
  return blob;
}

/**
 * 13. ELEMEN COVER, IDENTITAS, STATUS KELENGKAPAN & LEMBAR PENGESAHAN RESMI
 */
export function buildCoverDanPengesahanElements(
  profile: SchoolProfile,
  kelasHarian?: KelasHarianData,
  instrument?: SupervisiInstrumentData,
  tpList?: CustomTPItem[]
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const evalSummary = evaluateSupervisiInstrument(
    instrument || createDefaultSupervisiInstrumentData()
  );
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: profile.instansiDinas.toUpperCase(),
            bold: true,
            size: 22,
            color: '475569',
            font: 'Calibri',
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
          text: (profile.namaSekolah || 'SEKOLAH').toUpperCase(),
          bold: true,
          size: 28,
          font: 'Calibri',
        }),
      ],
    })
  );

  if (profile.alamatSekolah) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `${profile.alamatSekolah}${profile.kotaSekolah ? ' • ' + profile.kotaSekolah : ''}`,
            size: 18,
            color: '64748B',
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: '══════════════════════════════════════════════',
          bold: true,
          size: 20,
          color: '1E3A8A',
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'BUNDEL ADMINISTRASI PEMBELAJARAN',
          bold: true,
          size: 32,
          color: '1E3A8A',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: '& PORTOFOLIO SUPERVISI AKADEMIK GURU',
          bold: true,
          size: 28,
          color: '2563EB',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'KURIKULUM MERDEKA',
          bold: true,
          size: 24,
          color: '0D9488',
          font: 'Calibri',
        }),
      ],
    })
  );

  children.push(...maybeBuildVerificationBanner(kelasHarian));

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
                new Paragraph({
                  spacing: { before: 100, after: 40 },
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'IDENTITAS ADMINISTRASI PEMBELAJARAN',
                      bold: true,
                      size: 20,
                      color: '1E3A8A',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({ text: '  Satuan Pendidikan : ', bold: true, size: 19 }),
                    new TextRun({ text: profile.namaSekolah || 'Belum diisi', size: 19 }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({ text: '  Mata Pelajaran    : ', bold: true, size: 19 }),
                    new TextRun({ text: profile.mataPelajaranUtama, size: 19 }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({ text: '  Jenjang / Kelas     : ', bold: true, size: 19 }),
                    new TextRun({
                      text: `${profile.jenjang || '-'} • Kelas ${profile.kelasUtama} (${profile.rombelAktif || 'A'})`,
                      size: 19,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({ text: '  Semester / TA       : ', bold: true, size: 19 }),
                    new TextRun({ text: `${profile.semester} • ${profile.tahunAjaran}`, size: 19 }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({ text: '  Guru Pengampu       : ', bold: true, size: 19 }),
                    new TextRun({
                      text: profile.namaGuru || '..........................................',
                      bold: true,
                      size: 19,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({ text: '  NIP Guru            : ', bold: true, size: 19 }),
                    new TextRun({
                      text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -',
                      size: 19,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 100 },
                  children: [
                    new TextRun({ text: '  Status Telaah       : ', bold: true, size: 19 }),
                    new TextRun({
                      text: evalSummary.isPenilaianLengkap
                        ? `Selesai dinilai (${evalSummary.skorTerkumpul}/${evalSummary.skorMaksimalTotal} • ${evalSummary.predikat})`
                        : evalSummary.alasanBelumLengkap || 'Menunggu pemeriksaan pengawas',
                      size: 18,
                      color: evalSummary.isPenilaianLengkap ? '15803D' : 'B45309',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Ringkasan status ketersediaan 9 dokumen di workspace apabila tersedia konteks TP & kelas harian
  if (tpList && kelasHarian) {
    const readiness = getSupervisiDocumentsReadiness(profile, tpList, kelasHarian);
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: 'DAFTAR ISI & STATUS KETERSEDIAAN DOKUMEN PAKET (01–09)',
            bold: true,
            size: 20,
            color: '1E3A8A',
          }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 8, type: WidthType.PERCENTAGE },
                shading: { fill: '1E3A8A' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Kode', bold: true, color: 'FFFFFF', size: 15 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 38, type: WidthType.PERCENTAGE },
                shading: { fill: '1E3A8A' },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'Nama Dokumen', bold: true, color: 'FFFFFF', size: 15 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 16, type: WidthType.PERCENTAGE },
                shading: { fill: '1E3A8A' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Status Data', bold: true, color: 'FFFFFF', size: 15 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 38, type: WidthType.PERCENTAGE },
                shading: { fill: '1E3A8A' },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'Keterangan Aktual Workspace', bold: true, color: 'FFFFFF', size: 15 })],
                  }),
                ],
              }),
            ],
          }),
          ...readiness.map(
            (r) =>
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: r.kode, bold: true, size: 15 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: r.nama, bold: true, size: 15 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: {
                      fill: !r.tersedia ? 'FEE2E2' : r.perluPerhatianData ? 'FEF3C7' : 'DCFCE7',
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: !r.tersedia
                              ? 'Belum tersedia'
                              : r.perluPerhatianData
                              ? 'Perlu verifikasi'
                              : 'Tersedia',
                            bold: true,
                            size: 14,
                            color: !r.tersedia
                              ? 'B91C1C'
                              : r.perluPerhatianData
                              ? 'B45309'
                              : '15803D',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: r.ringkasan, size: 14, color: '334155' })],
                      }),
                    ],
                  }),
                ],
              })
          ),
        ],
      }),
      new Paragraph({ spacing: { after: 140 } })
    );
  }

  // PAGE BREAK: LEMBAR PENGESAHAN
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: 'LEMBAR PENGESAHAN DOKUMEN ADMINISTRASI',
          bold: true,
          size: 28,
          color: '1E3A8A',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: 'PERANGKAT PEMBELAJARAN & PORTOFOLIO SUPERVISI AKADEMIK GURU',
          bold: true,
          size: 22,
          color: '334155',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Dokumen Administrasi Pembelajaran dan Portofolio Guru Mata Pelajaran ${profile.mataPelajaranUtama} Kelas ${profile.kelasUtama} (${profile.rombelAktif || 'A'}) Semester ${profile.semester} Tahun Pelajaran ${profile.tahunAjaran} diajukan oleh:`,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: '  Nama Guru  : ', bold: true, size: 20 }),
        new TextRun({
          text: profile.namaGuru || '..........................................',
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: '  NIP Guru   : ', bold: true, size: 20 }),
        new TextRun({
          text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -',
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: '  Unit Kerja : ', bold: true, size: 20 }),
        new TextRun({
          text: profile.namaSekolah || '..........................................',
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: evalSummary.isPenilaianLengkap
            ? `Berdasarkan hasil telaah instrumen supervisi akademik (${evalSummary.skorTerkumpul}/${evalSummary.skorMaksimalTotal}, Predikat: ${evalSummary.predikat}), dokumen ini dinyatakan telah diperiksa untuk dipergunakan pada satuan pendidikan terkait.`
            : 'Dokumen ini disiapkan untuk dilakukan pemeriksaan, telaah kelengkapan, dan pengesahan resmi oleh Kepala Sekolah dan Pengawas Pembina sesuai hasil observasi supervisi akademik.',
          size: 20,
        }),
      ],
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mengetahui,', size: 19 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 650 }, children: [new TextRun({ text: 'Kepala Sekolah', size: 19 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: profile.namaKepalaSekolah || '................................',
                      bold: true,
                      underline: {},
                      size: 19,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: profile.nipKepalaSekolah ? `NIP. ${profile.nipKepalaSekolah}` : 'NIP. -',
                      size: 17,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Telah Ditelaah,', size: 19 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 650 }, children: [new TextRun({ text: 'Pengawas / Supervisor', size: 19 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: instrument?.namaPengawas?.trim() || '................................',
                      bold: true,
                      underline: {},
                      size: 19,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: instrument?.nipPengawas?.trim() ? `NIP. ${instrument.nipPengawas.trim()}` : 'NIP. -',
                      size: 17,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `${profile.kotaSekolah || 'Indonesia'}, ${todayStr}`, size: 19 })],
                }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 650 }, children: [new TextRun({ text: 'Guru Mata Pelajaran', size: 19 })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: profile.namaGuru || '................................',
                      bold: true,
                      underline: {},
                      size: 19,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -',
                      size: 17,
                    }),
                  ],
                }),
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
 * 14. INSTRUMEN TELAAH & VERIFIKASI SUPERVISI AKADEMIK GURU (TANPA SKOR OTOMATIS PALSU)
 */
export function buildInstrumenSupervisiElements(
  profile: SchoolProfile,
  instrumentData?: SupervisiInstrumentData
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const instrument = instrumentData || getSupervisiInstrumentData(profile);
  const summary = evaluateSupervisiInstrument(instrument);

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: 'INSTRUMEN VERIFIKASI & TELAAH ADMINISTRASI GURU',
          bold: true,
          size: 26,
          color: '1E3A8A',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'LEMBAR PENILAIAN PENGAWAS / KEPALA SEKOLAH (KURIKULUM MERDEKA)',
          bold: true,
          size: 20,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `Satuan Pendidikan: ${profile.namaSekolah} • Mapel: ${profile.mataPelajaranUtama} • Kelas: ${profile.kelasUtama} (${profile.rombelAktif || 'A'}) • Semester: ${profile.semester}`,
          size: 18,
          color: '334155',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `Pengawas / Penelaah: ${instrument.namaPengawas.trim() || '........................'} (${instrument.jabatanPengawas || 'Pengawas'}) • Tanggal Telaah: ${instrument.tanggalSupervisi.trim() || '........................'}`,
          size: 18,
          color: '334155',
        }),
      ],
    })
  );

  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 6, type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 15 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A' },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Komponen Dokumen Pembelajaran', bold: true, color: 'FFFFFF', size: 15 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 14, type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Status Telaah', bold: true, color: 'FFFFFF', size: 14 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Skor (0-2)', bold: true, color: 'FFFFFF', size: 14 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 42, type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A' },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Catatan, Rekomendasi & Tindak Lanjut', bold: true, color: 'FFFFFF', size: 15 })],
          }),
        ],
      }),
    ],
  });

  const dataRows: TableRow[] = instrument.items.map((it) => {
    const statusLabel = SUPERVISI_STATUS_LABELS[it.status];
    const scoreDisplay = typeof it.skor === 'number' ? String(it.skor) : '-';
    const noteParagraphs: Paragraph[] = [];
    if (it.catatan.trim()) {
      noteParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Catatan: ', bold: true, size: 13 }),
            new TextRun({ text: it.catatan.trim(), size: 13 }),
          ],
        })
      );
    }
    if (it.rekomendasi.trim()) {
      noteParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Rekomendasi: ', bold: true, size: 13 }),
            new TextRun({ text: it.rekomendasi.trim(), size: 13 }),
          ],
        })
      );
    }
    if (it.tindakLanjut.trim()) {
      noteParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Tindak Lanjut: ', bold: true, size: 13 }),
            new TextRun({ text: it.tindakLanjut.trim(), size: 13 }),
          ],
        })
      );
    }
    if (noteParagraphs.length === 0) {
      noteParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Belum ada catatan telaah pengawas.',
              italics: true,
              size: 13,
              color: '64748B',
            }),
          ],
        })
      );
    }

    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: it.kode, size: 15 })],
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: it.komponen, bold: true, size: 15 })],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: statusCellShading(it.status) },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: statusLabel,
                  bold: true,
                  color: statusTextColor(it.status),
                  size: 13,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: typeof it.skor === 'number' ? 'EFF6FF' : 'F8FAFC' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: scoreDisplay,
                  bold: true,
                  color: typeof it.skor === 'number' ? '1D4ED8' : '64748B',
                  size: 15,
                }),
              ],
            }),
          ],
        }),
        new TableCell({ children: noteParagraphs }),
      ],
    });
  });

  const summaryStatusText = summary.isPenilaianLengkap
    ? `${summary.jumlahDiperiksa}/${summary.totalKomponen} Selesai`
    : `${summary.jumlahDinilai}/${summary.totalKomponen} Dinilai`;

  const summaryScoreText =
    summary.jumlahDinilai === 0
      ? 'Belum dinilai'
      : summary.isPenilaianLengkap
      ? `${summary.skorTerkumpul} / ${summary.skorMaksimalTotal}`
      : `${summary.skorTerkumpul} / ${summary.skorMaksimalDiperiksa}`;

  const summaryPredicateText = summary.isPenilaianLengkap
    ? `PREDIKAT: ${summary.predikat?.toUpperCase()} (${summary.persentaseDinilai}%)`
    : `PREDIKAT BELUM DITETAPKAN — ${summary.alasanBelumLengkap}`;

  const totalRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', size: 14 })] })] }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `REKAPITULASI SKOR SUPERVISI (MAKS. ${summary.skorMaksimalTotal}):`,
                bold: true,
                size: 14,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: summary.isPenilaianLengkap ? 'DCFCE7' : 'F1F5F9' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: summaryStatusText,
                bold: true,
                color: summary.isPenilaianLengkap ? '15803D' : '475569',
                size: 13,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: summary.jumlahDinilai > 0 ? 'DBEAFE' : 'F1F5F9' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: summaryScoreText,
                bold: true,
                color: summary.jumlahDinilai > 0 ? '1E3A8A' : '64748B',
                size: 14,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        shading: { fill: summary.isPenilaianLengkap ? 'DCFCE7' : 'FEF3C7' },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: summaryPredicateText,
                bold: true,
                color: summary.isPenilaianLengkap ? '15803D' : '92400E',
                size: 13,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows, totalRow],
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

  children.push(
    new Paragraph({
      spacing: { after: 30 },
      children: [new TextRun({ text: 'Catatan Umum Pengawas:', bold: true, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: instrument.catatanUmum.trim() || 'Belum diisi oleh pengawas.',
          size: 17,
          italics: !instrument.catatanUmum.trim(),
          color: instrument.catatanUmum.trim() ? '1E293B' : '64748B',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 30 },
      children: [new TextRun({ text: 'Rekomendasi Supervisi:', bold: true, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: instrument.rekomendasiUmum.trim() || 'Belum diisi oleh pengawas.',
          size: 17,
          italics: !instrument.rekomendasiUmum.trim(),
          color: instrument.rekomendasiUmum.trim() ? '1E293B' : '64748B',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 30 },
      children: [new TextRun({ text: 'Rencana Tindak Lanjut:', bold: true, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: instrument.tindakLanjutUmum.trim() || 'Belum diisi oleh pengawas.',
          size: 17,
          italics: !instrument.tindakLanjutUmum.trim(),
          color: instrument.tindakLanjutUmum.trim() ? '1E293B' : '64748B',
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
 * 02. REFERENSI CAPAIAN PEMBELAJARAN (CP) & TUJUAN PEMBELAJARAN (TP)
 */
export function buildReferensiCapaianDanTPElements(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const fase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
  const plan = getSemesterCurriculumPlan(
    profile.mataPelajaranUtama,
    fase,
    profile.kelasUtama,
    profile.semester,
    { schoolId: profile.schoolId, tahunAjaran: profile.tahunAjaran }
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: 'REFERENSI CAPAIAN & TUJUAN PEMBELAJARAN (CP / TP)',
          bold: true,
          size: 28,
          color: '1D4ED8',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: (profile.namaSekolah || 'SATUAN PENDIDIKAN').toUpperCase(),
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `MAPEL: ${profile.mataPelajaranUtama.toUpperCase()} • ${fase} • KELAS ${profile.kelasUtama} (${profile.rombelAktif || 'A'}) • SEMESTER ${profile.semester.toUpperCase()}`,
          size: 18,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: 'A. Capaian Pembelajaran (CP) Fase Acuan:',
          bold: true,
          size: 20,
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: plan.capaianPembelajaran || 'Capaian pembelajaran mengikuti dokumen kurikulum satuan pendidikan.',
          size: 19,
        }),
      ],
    })
  );

  if (plan.referensiCatatan) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: 'Sumber Acuan Kurikulum: ', bold: true, size: 17, color: '475569' }),
          new TextRun({ text: plan.referensiCatatan, italics: true, size: 17, color: '475569' }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `B. Daftar Tujuan Pembelajaran (TP) Aktif (${tpList.length} TP):`,
          bold: true,
          size: 20,
          color: '1E3A8A',
        }),
      ],
    })
  );

  if (tpList.length === 0) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: 'Catatan: Belum ada Tujuan Pembelajaran yang ditetapkan untuk mata pelajaran dan kelas ini.',
            italics: true,
            size: 18,
            color: '64748B',
          }),
        ],
      })
    );
  } else {
    const headerRow = new TableRow({
      children: [
        ['No', 6],
        ['Kode TP', 10],
        ['Elemen', 16],
        ['Materi Pokok', 20],
        ['Tujuan Pembelajaran', 32],
        ['JP', 8],
        ['Minggu', 8],
      ].map(
        ([label, w]) =>
          new TableCell({
            width: { size: w as number, type: WidthType.PERCENTAGE },
            shading: { fill: '1E3A8A' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: label as string, bold: true, color: 'FFFFFF', size: 16 })],
              }),
            ],
          })
      ),
    });

    const dataRows = tpList.map(
      (tp, idx) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: String(idx + 1), size: 16 })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: tp.kode, bold: true, size: 16 })],
                }),
              ],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: tp.elemen, size: 16 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: tp.materiPokok, bold: true, size: 16 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: tp.tujuanPembelajaran, size: 16 })] })],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `${tp.alokasiJP} JP`, size: 16 })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `M${tp.mingguMulai}-${tp.mingguSelesai}`, size: 15 })],
                }),
              ],
            }),
          ],
        })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
      }),
      new Paragraph({ spacing: { after: 140 } })
    );
  }

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  return children;
}

function doesDraftMatchSupervisiContext(
  draft: {
    tpId?: string;
    tpKode?: string;
    materiPokok?: string;
    mataPelajaran?: string;
    kelas?: string;
    semester?: string;
    schoolId?: string;
  },
  tp: CustomTPItem,
  profile: SchoolProfile
): boolean {
  const idMatch = draft.tpId
    ? draft.tpId === tp.id
    : draft.tpKode === tp.kode && draft.materiPokok === tp.materiPokok;
  if (!idMatch) return false;
  if (
    draft.mataPelajaran &&
    draft.mataPelajaran.trim().toLowerCase() !== profile.mataPelajaranUtama.trim().toLowerCase()
  ) {
    return false;
  }
  if (
    draft.kelas &&
    draft.kelas.trim().toLowerCase() !== profile.kelasUtama.trim().toLowerCase()
  ) {
    return false;
  }
  if (draft.semester) {
    const draftSem2 = draft.semester.trim().startsWith('2');
    const profileSem2 = (profile.semester || '1').trim().startsWith('2');
    if (draftSem2 !== profileSem2) return false;
  }
  if (draft.schoolId && profile.schoolId && draft.schoolId !== profile.schoolId) {
    return false;
  }
  return true;
}

export function resolveSupervisiTPDocuments(
  profile: SchoolProfile,
  tp: CustomTPItem,
  options?: SupervisiExportOptions
): {
  modulDoc: ModulAjarDokumen;
  modulStatusLabel: string;
  modulIsSavedDraft: boolean;
  lkpdDoc: LKPDDokumen;
  lkpdStatusLabel: string;
  lkpdIsSavedDraft: boolean;
} {
  const persistedModul = loadLatestModulAjarDraft(profile, tp);
  const activeModul = options?.activeModulAjar;
  const activeModulValid = Boolean(
    activeModul && doesDraftMatchSupervisiContext(activeModul, tp, profile)
  );

  let modulDoc: ModulAjarDokumen;
  let modulStatusLabel: string;
  let modulIsSavedDraft = false;

  if (persistedModul && (!activeModulValid || !activeModul?.savedAt || (persistedModul.savedAt || '') >= activeModul.savedAt)) {
    modulDoc = persistedModul.doc;
    modulIsSavedDraft = true;
    modulStatusLabel =
      persistedModul.origin === 'saved_ai'
        ? `Draf Tersimpan Hasil AI / Suntingan Guru (Model: ${persistedModul.variant.toUpperCase()})`
        : `Draf Tersimpan / Disunting Guru (Model: ${persistedModul.variant.toUpperCase()})`;
  } else if (activeModulValid && activeModul) {
    modulDoc = activeModul;
    modulIsSavedDraft = true;
    modulStatusLabel =
      activeModul.draftSource === 'ai_generated'
        ? 'Draf Aktif Hasil AI / Suntingan Guru'
        : 'Draf Aktif / Disunting Guru';
  } else {
    modulDoc = buildSmartModulAjar(tp, profile);
    modulIsSavedDraft = false;
    modulStatusLabel = 'Template Bawaan Sistem (Belum Disunting Guru)';
  }

  const persistedLKPD = loadLatestLKPDDraft(profile, tp);
  const activeLKPD = options?.activeLKPD;
  const activeLKPDValid = Boolean(
    activeLKPD && doesDraftMatchSupervisiContext(activeLKPD, tp, profile)
  );

  let lkpdDoc: LKPDDokumen;
  let lkpdStatusLabel: string;
  let lkpdIsSavedDraft = false;

  if (persistedLKPD && (!activeLKPDValid || !activeLKPD?.savedAt || (persistedLKPD.savedAt || '') >= activeLKPD.savedAt)) {
    lkpdDoc = persistedLKPD.doc;
    lkpdIsSavedDraft = true;
    lkpdStatusLabel =
      persistedLKPD.origin === 'saved_ai'
        ? `Draf Tersimpan Hasil AI / Suntingan Guru (Preset: ${persistedLKPD.variant})`
        : `Draf Tersimpan / Disunting Guru (Preset: ${persistedLKPD.variant})`;
  } else if (activeLKPDValid && activeLKPD) {
    lkpdDoc = activeLKPD;
    lkpdIsSavedDraft = true;
    lkpdStatusLabel =
      activeLKPD.draftSource === 'ai_generated'
        ? 'Draf Aktif Hasil AI / Suntingan Guru'
        : 'Draf Aktif / Disunting Guru';
  } else {
    lkpdDoc = buildSmartLKPD(tp, profile);
    lkpdIsSavedDraft = false;
    lkpdStatusLabel = 'Template Bawaan Sistem (Belum Disunting Guru)';
  }

  return {
    modulDoc,
    modulStatusLabel,
    modulIsSavedDraft,
    lkpdDoc,
    lkpdStatusLabel,
    lkpdIsSavedDraft,
  };
}

/**
 * 06. MODUL AJAR & LAMPIRAN LKPD (DARI TP AKTUAL + DRAF TERSIMPAN GURU)
 */
export function buildModulAjarDanLKPDElements(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  options?: SupervisiExportOptions
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: 'KOMPILASI MODUL AJAR & LEMBAR KERJA PESERTA DIDIK (LKPD)',
          bold: true,
          size: 28,
          color: '1D4ED8',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${profile.namaSekolah} • ${profile.mataPelajaranUtama} • Kelas ${profile.kelasUtama} (${profile.rombelAktif || 'A'}) • Semester ${profile.semester}`,
          size: 18,
          color: '475569',
        }),
      ],
    })
  );

  if (tpList.length === 0) {
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({
            text: 'Catatan: Belum ada Tujuan Pembelajaran aktif sehingga Modul Ajar dan LKPD belum dapat disusun.',
            italics: true,
            size: 18,
            color: '64748B',
          }),
        ],
      })
    );
    return children;
  }

  tpList.forEach((tp, idx) => {
    const {
      modulDoc,
      modulStatusLabel,
      modulIsSavedDraft,
      lkpdDoc,
      lkpdStatusLabel,
      lkpdIsSavedDraft,
    } = resolveSupervisiTPDocuments(profile, tp, options);

    if (idx > 0) {
      children.push(pageBreakParagraph());
    }
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 20 },
        children: [
          new TextRun({
            text: `UNIT ${idx + 1} (${tp.kode}): MODUL AJAR — ${tp.materiPokok.toUpperCase()}`,
            bold: true,
            size: 21,
            color: '1E3A8A',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `Status Draf: ${modulStatusLabel}`,
            italics: true,
            size: 16,
            color: modulIsSavedDraft ? '15803D' : 'B45309',
          }),
        ],
      }),
      ...buildModulAjarElements(modulDoc, profile),
      pageBreakParagraph(),
      new Paragraph({
        spacing: { before: 40, after: 20 },
        children: [
          new TextRun({
            text: `LAMPIRAN UNIT ${idx + 1} (${tp.kode}): LKPD — ${lkpdDoc.materiPokok.toUpperCase()}`,
            bold: true,
            size: 21,
            color: '0D9488',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `Status Draf: ${lkpdStatusLabel}`,
            italics: true,
            size: 16,
            color: lkpdIsSavedDraft ? '15803D' : 'B45309',
          }),
        ],
      }),
      ...buildLKPDElements(lkpdDoc, profile, true)
    );
  });

  return children;
}

/**
 * Helper pembangun masing-masing dari 9 dokumen Paket Supervisi (dipakai ZIP & ekspor tunggal)
 */
async function buildSupervisiNumberedDocumentBlob(
  docId: number,
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  kelasHarian: KelasHarianData,
  options?: SupervisiExportOptions
): Promise<Blob> {
  const def = SUPERVISI_DOCUMENT_DEFINITIONS.find((d) => d.id === docId);
  const label = def ? `${def.kode} (${def.nama})` : String(docId);

  if (options?.docBlobOverrides?.[docId]) {
    const overridden = await options.docBlobOverrides[docId]!();
    const buffer = await overridden.arrayBuffer();
    const parsedZip = await JSZip.loadAsync(buffer);
    if (!parsedZip.file('word/document.xml')) {
      throw new Error(`Dokumen ${label} tidak memiliki word/document.xml yang valid.`);
    }
    return overridden;
  }

  const instrument = options?.instrument || getSupervisiInstrumentData(profile);
  let children: (Paragraph | Table)[];

  if (docId === 1) {
    children = [
      ...buildCoverDanPengesahanElements(profile, kelasHarian, instrument, tpList),
      pageBreakParagraph(),
      ...buildInstrumenSupervisiElements(profile, instrument),
    ];
  } else if (docId === 2) {
    children = buildReferensiCapaianDanTPElements(profile, tpList);
  } else if (docId === 3) {
    children = buildATPElements(buildSmartATP(tpList, profile), profile);
  } else if (docId === 4) {
    children = buildProtaElements(buildSmartProta(profile, tpList), profile);
  } else if (docId === 5) {
    children = buildPromesElements(buildSmartPromes(profile, tpList), profile);
  } else if (docId === 6) {
    children = buildModulAjarDanLKPDElements(profile, tpList, options);
  } else if (docId === 7) {
    children = buildPresensiElements(profile, kelasHarian);
  } else if (docId === 8) {
    children = buildJurnalMengajarElements(profile, kelasHarian);
  } else if (docId === 9) {
    children = [
      ...buildDaftarNilaiElements(profile, kelasHarian, tpList),
      pageBreakParagraph(),
      ...buildRekapRaporElements(profile, kelasHarian, tpList),
    ];
  } else {
    throw new Error(`Nomor dokumen supervisi tidak dikenal: ${docId}`);
  }

  const isLandscape = docId === 5 || docId === 7;
  const doc = createStyledDocxDocument(
    profile,
    def ? `${def.kode}. ${def.nama}` : 'Paket Supervisi',
    children,
    { landscape: isLandscape }
  );
  return packAndValidateDocxBlob(doc, label);
}

/**
 * EXPORT 01 DOCX: IDENTITAS & PERANGKAT ADMINISTRASI
 */
export async function exportCoverDanPengesahanToDocx(
  profile: SchoolProfile,
  kelasHarian?: KelasHarianData,
  tpList?: CustomTPItem[],
  instrument?: SupervisiInstrumentData
): Promise<Blob> {
  const resolvedInstrument = instrument || getSupervisiInstrumentData(profile);
  const children: (Paragraph | Table)[] = [
    ...buildCoverDanPengesahanElements(profile, kelasHarian, resolvedInstrument, tpList),
    pageBreakParagraph(),
    ...buildInstrumenSupervisiElements(profile, resolvedInstrument),
  ];
  const doc = createStyledDocxDocument(
    profile,
    '01. Identitas dan Perangkat Administrasi',
    children
  );
  const blob = await packAndValidateDocxBlob(doc, '01 (Identitas dan Perangkat Administrasi)');
  saveAs(
    blob,
    `01_Identitas_dan_Perangkat_Administrasi_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}.docx`
  );
  return blob;
}

/**
 * EXPORT 02 DOCX: REFERENSI CP & TP
 */
export async function exportReferensiCPTPToDocx(
  profile: SchoolProfile,
  tpList: CustomTPItem[]
): Promise<Blob> {
  const children = buildReferensiCapaianDanTPElements(profile, tpList);
  const doc = createStyledDocxDocument(
    profile,
    '02. Referensi Capaian dan Tujuan Pembelajaran',
    children
  );
  const blob = await packAndValidateDocxBlob(doc, '02 (Referensi CP dan TP)');
  saveAs(
    blob,
    `02_Referensi_Capaian_dan_TP_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}.docx`
  );
  return blob;
}

/**
 * EXPORT 06 DOCX: MODUL AJAR & LKPD SEMESTER
 */
export async function exportModulAjarSemesterSupervisiToDocx(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  options?: SupervisiExportOptions
): Promise<Blob> {
  const children = buildModulAjarDanLKPDElements(profile, tpList, options);
  const doc = createStyledDocxDocument(profile, '06. Modul Ajar & LKPD', children);
  const blob = await packAndValidateDocxBlob(doc, '06 (Modul Ajar & LKPD)');
  saveAs(
    blob,
    `06_Modul_Ajar_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}.docx`
  );
  return blob;
}

/**
 * EXPORT 09 DOCX: BUKU NILAI & e-RAPOR
 */
export async function exportBukuNilaiDanRaporSupervisiToDocx(
  profile: SchoolProfile,
  kelasHarian: KelasHarianData,
  tpList: CustomTPItem[]
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    ...buildDaftarNilaiElements(profile, kelasHarian, tpList),
    pageBreakParagraph(),
    ...buildRekapRaporElements(profile, kelasHarian, tpList),
  ];
  const doc = createStyledDocxDocument(profile, '09. Buku Nilai dan e-Rapor', children);
  const blob = await packAndValidateDocxBlob(doc, '09 (Buku Nilai dan e-Rapor)');
  saveAs(
    blob,
    `09_Buku_Nilai_dan_eRapor_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}.docx`
  );
  return blob;
}

/**
 * EXPORT MANDIRI: INSTRUMEN SUPERVISI
 */
export async function exportInstrumenSupervisiToDocx(
  profile: SchoolProfile,
  instrumentData?: SupervisiInstrumentData
): Promise<Blob> {
  const children = buildInstrumenSupervisiElements(profile, instrumentData);
  const doc = createStyledDocxDocument(profile, 'Instrumen Supervisi Akademik', children);
  const blob = await packAndValidateDocxBlob(doc, 'Instrumen Supervisi');
  saveAs(
    blob,
    `Instrumen_Supervisi_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}.docx`
  );
  return blob;
}

/**
 * 15. EKSPOR MASTER BUNDEL LENGKAP SUPERVISI (SATU FILE DOCX BESAR SEMESTER PENUH)
 * Menggunakan document builder modul yang sama sehingga 100% sinkron dengan ekspor masing-masing modul & ZIP.
 */
export async function exportBundelSupervisiMasterDocx(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  kelasHarian: KelasHarianData,
  options?: SupervisiExportOptions
): Promise<SupervisiMasterBundleResult> {
  const instrument = options?.instrument || getSupervisiInstrumentData(profile);
  const atpDoc = buildSmartATP(tpList, profile);
  const protaDoc = buildSmartProta(profile, tpList);
  const promesDoc = buildSmartPromes(profile, tpList);

  const masterDoc = createMultiSectionStyledDocxDocument(
    profile,
    'Master Bundel Supervisi Akademik (01–09)',
    [
      {
        // Bagian Portrait 1: 01 Cover & Pengesahan & Instrumen, 02 CP/TP, 03 ATP, 04 Prota
        landscape: false,
        children: [
          ...buildCoverDanPengesahanElements(profile, kelasHarian, instrument, tpList),
          pageBreakParagraph(),
          ...buildInstrumenSupervisiElements(profile, instrument),
          pageBreakParagraph(),
          ...buildReferensiCapaianDanTPElements(profile, tpList),
          pageBreakParagraph(),
          ...buildATPElements(atpDoc, profile),
          pageBreakParagraph(),
          ...buildProtaElements(protaDoc, profile),
        ],
      },
      {
        // Bagian Landscape 1: 05 Program Semester (matriks 25+ kolom mingguan)
        landscape: true,
        children: buildPromesElements(promesDoc, profile),
      },
      {
        // Bagian Portrait 2: 06 Modul Ajar & Lampiran LKPD
        landscape: false,
        children: buildModulAjarDanLKPDElements(profile, tpList, options),
      },
      {
        // Bagian Landscape 2: 07 Daftar Presensi (16 pertemuan + H/S/I/A/%)
        landscape: true,
        children: buildPresensiElements(profile, kelasHarian),
      },
      {
        // Bagian Portrait 3: 08 Jurnal Mengajar & 09 Buku Nilai & Rekap e-Rapor
        landscape: false,
        children: [
          ...buildJurnalMengajarElements(profile, kelasHarian),
          pageBreakParagraph(),
          ...buildDaftarNilaiElements(profile, kelasHarian, tpList),
          pageBreakParagraph(),
          ...buildRekapRaporElements(profile, kelasHarian, tpList),
        ],
      },
    ]
  );
  const blob = await packAndValidateDocxBlob(masterDoc, 'Master Bundel Supervisi');
  const fileName = `Bundel_Supervisi_Lengkap_${profile.mataPelajaranUtama}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}_${profile.semester.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
  saveAs(blob, fileName);

  return {
    blob,
    fileName,
    sections: SUPERVISI_DOCUMENT_DEFINITIONS.map((d) => `${d.kode}. ${d.nama}`),
  };
}

/**
 * 16. EKSPOR PAKET ARSIP ZIP (BERISI 9 FILE DOCX LENGKAP DARI DOCUMENT BUILDER MODUL)
 * Jika salah satu dari 9 dokumen gagal dibuat atau tidak valid, ekspor ZIP dibatalkan dan melempar Error eksplisit.
 */
export async function exportPaketSupervisiToZip(
  profile: SchoolProfile,
  tpList: CustomTPItem[],
  kelasHarian: KelasHarianData,
  options?: SupervisiExportOptions
): Promise<SupervisiZipExportResult> {
  const zip = new JSZip();
  const folderName = `Paket_Supervisi_${profile.mataPelajaranUtama.replace(/[^a-zA-Z0-9]/g, '_')}_Kelas_${profile.kelasUtama}${profile.rombelAktif || 'A'}`;
  const folder = zip.folder(folderName) || zip;

  const builtFiles: SupervisiZipFileEntry[] = [];
  const failures: string[] = [];

  for (const def of SUPERVISI_DOCUMENT_DEFINITIONS) {
    try {
      const docBlob = await buildSupervisiNumberedDocumentBlob(
        def.id,
        profile,
        tpList,
        kelasHarian,
        options
      );
      folder.file(def.zipFileName, docBlob);
      builtFiles.push({
        id: def.id,
        kode: def.kode,
        nama: def.nama,
        fileName: def.zipFileName,
        byteSize: docBlob.size,
      });
    } catch (err: any) {
      const reason = err?.message || String(err);
      failures.push(`${def.kode}. ${def.nama}: ${reason}`);
    }
  }

  if (failures.length > 0 || builtFiles.length !== SUPERVISI_DOCUMENT_DEFINITIONS.length) {
    throw new Error(
      `Gagal menyusun Paket Supervisi ZIP secara lengkap (${builtFiles.length}/${SUPERVISI_DOCUMENT_DEFINITIONS.length} dokumen berhasil). Kegagalan pada: ${failures.join(' | ')}`
    );
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFileName = `${folderName}_Lengkap.zip`;
  saveAs(zipBlob, zipFileName);

  return {
    zipBlob,
    zipFileName,
    folderName,
    files: builtFiles,
  };
}
