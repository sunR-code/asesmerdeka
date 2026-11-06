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
import type { NaskahUjianDokumen } from '../../types/examSemester';
import { getSchoolProfile } from '../schoolProfileStorage';
import type { SchoolProfile } from '../schoolProfileStorage';
import { buildSignatureBlockTable } from './docxShared';

/**
 * Ekspor Naskah Ujian Semester (STS / SAS) Terpadu
 * Lengkap dengan:
 * 1. Kop Resmi & Identitas Siswa
 * 2. Soal PG, PGK, dan Uraian
 * 3. Lembar Jawaban Siswa (LJK Kertas Ujian)
 * 4. Kunci Jawaban & Rubrik Penskoran Guru + Tanda Tangan
 */
export async function exportNaskahUjianToDocx(
  naskah: NaskahUjianDokumen,
  userProfile?: SchoolProfile
): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  // ==========================================
  // BAGIAN 1: KOP RESMI SEKOLAH
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
          text: (naskah.namaSekolah || profile.namaSekolah).toUpperCase(),
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

  // Garis Pembatas Kop Ganda
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.DOUBLE, size: 18, space: 1, color: '000000' },
      },
      spacing: { after: 140 },
    })
  );

  // Judul Naskah Ujian
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: naskah.namaUjian.toUpperCase(),
          bold: true,
          size: 24,
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
          text: `TAHUN AJARAN ${naskah.tahunAjaran} • KURIKULUM MERDEKA`,
          bold: true,
          size: 20,
          color: '334155',
          font: 'Calibri',
        }),
      ],
    })
  );

  // ==========================================
  // BAGIAN 2: TABEL IDENTITAS UJIAN & SISWA
  // ==========================================
  const identitasTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          // Kolom Kiri: Info Ujian
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran\t: `, bold: true, size: 20 }), new TextRun({ text: naskah.mataPelajaran, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: `Kelas / Jenjang\t: `, bold: true, size: 20 }), new TextRun({ text: `${naskah.kelas} (${naskah.jenjang})`, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: `Hari, Tanggal\t: `, bold: true, size: 20 }), new TextRun({ text: `..........................................`, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: `Alokasi Waktu\t: `, bold: true, size: 20 }), new TextRun({ text: naskah.alokasiWaktu, size: 20 })] }),
            ],
          }),
          // Kolom Kanan: Identitas Peserta
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Nama Peserta\t: `, bold: true, size: 20 }), new TextRun({ text: `...................................`, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: `Nomor Peserta\t: `, bold: true, size: 20 }), new TextRun({ text: `...................................`, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: `Ruang / Sesi\t: `, bold: true, size: 20 }), new TextRun({ text: `...................................`, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: `Nilai / Paraf\t: `, bold: true, size: 20 }), new TextRun({ text: `[          ] / [          ]`, bold: true, size: 20 })] }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(identitasTable);

  // Petunjuk Umum
  children.push(
    new Paragraph({
      spacing: { before: 140, after: 60 },
      children: [new TextRun({ text: 'PETUNJUK UMUM:', bold: true, size: 20, font: 'Calibri' })],
    })
  );
  naskah.petunjukUmum.forEach((ptk, idx) => {
    children.push(
      new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: `${idx + 1}. ${ptk}`, size: 19, font: 'Calibri', color: '334155' })],
      })
    );
  });

  // ==========================================
  // BAGIAN 3: SOAL PILIHAN GANDA (PG)
  // ==========================================
  if (naskah.soalPG && naskah.soalPG.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 180, after: 100 },
        children: [
          new TextRun({
            text: 'I. PILIHAN GANDA',
            bold: true,
            size: 22,
            font: 'Calibri',
            color: '1E3A8A',
          }),
          new TextRun({
            text: ' — Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, D, atau E!',
            italics: true,
            size: 20,
            font: 'Calibri',
            color: '475569',
          }),
        ],
      })
    );

    naskah.soalPG.forEach((soal) => {
      // Stimulus jika ada
      if (soal.stimulus) {
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: `[Wacana/Stimulus]: ${soal.stimulus}`,
                italics: true,
                size: 19,
                font: 'Calibri',
                color: '334155',
              }),
            ],
          })
        );
      }

      // Pertanyaan
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({
              text: `${soal.nomor}. `,
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: soal.pertanyaan,
              size: 20,
              font: 'Calibri',
            }),
          ],
        })
      );

      // Pilihan Opsi A, B, C, D, E
      soal.pilihan.forEach((pil) => {
        children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: `${pil.label}. `,
                bold: true,
                size: 20,
                font: 'Calibri',
              }),
              new TextRun({
                text: pil.teks,
                size: 20,
                font: 'Calibri',
              }),
            ],
          })
        );
      });
    });
  }

  // ==========================================
  // BAGIAN 4: SOAL PILIHAN GANDA KOMPLEKS (PGK)
  // ==========================================
  if (naskah.soalPGK && naskah.soalPGK.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'II. PILIHAN GANDA KOMPLEKS',
            bold: true,
            size: 22,
            font: 'Calibri',
            color: '1E3A8A',
          }),
          new TextRun({
            text: ' — Cermatilah stimulus berikut, kemudian tentukan Benar atau Salah pada setiap pernyataan dengan memberi tanda centang (✓)!',
            italics: true,
            size: 20,
            font: 'Calibri',
            color: '475569',
          }),
        ],
      })
    );

    naskah.soalPGK.forEach((soal) => {
      if (soal.stimulus) {
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: `[Stimulus]: ${soal.stimulus}`,
                italics: true,
                size: 19,
                font: 'Calibri',
                color: '334155',
              }),
            ],
          })
        );
      }

      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({
              text: `${soal.nomor}. `,
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: soal.pertanyaan,
              size: 20,
              font: 'Calibri',
            }),
          ],
        })
      );

      // Tabel Pernyataan Benar / Salah
      const pgkTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 10, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 19 })] })],
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                children: [new Paragraph({ children: [new TextRun({ text: 'Pernyataan Analitis', bold: true, size: 19 })] })],
              }),
              new TableCell({
                width: { size: 10, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Benar', bold: true, size: 19 })] })],
              }),
              new TableCell({
                width: { size: 10, type: WidthType.PERCENTAGE },
                shading: { fill: 'F1F5F9' },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Salah', bold: true, size: 19 })] })],
              }),
            ],
          }),
          ...soal.pernyataan.map((p, pIdx) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(pIdx + 1), size: 19 })] })],
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: p.teks, size: 19 })] })],
                }),
                new TableCell({
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[   ]', size: 19 })] })],
                }),
                new TableCell({
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[   ]', size: 19 })] })],
                }),
              ],
            })
          ),
        ],
      });
      children.push(pgkTable);
    });
  }

  // ==========================================
  // BAGIAN 5: SOAL URAIAN
  // ==========================================
  if (naskah.soalUraian && naskah.soalUraian.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'III. SOAL URAIAN',
            bold: true,
            size: 22,
            font: 'Calibri',
            color: '1E3A8A',
          }),
          new TextRun({
            text: ' — Jawablah pertanyaan-pertanyaan berikut dengan jelas, sistematis, dan komprehensif pada lembar jawaban yang tersedia!',
            italics: true,
            size: 20,
            font: 'Calibri',
            color: '475569',
          }),
        ],
      })
    );

    naskah.soalUraian.forEach((soal) => {
      if (soal.stimulus) {
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: `[Kasus]: ${soal.stimulus}`,
                italics: true,
                size: 19,
                font: 'Calibri',
                color: '334155',
              }),
            ],
          })
        );
      }

      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${soal.nomor}. `,
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: soal.pertanyaan,
              size: 20,
              font: 'Calibri',
            }),
          ],
        })
      );
    });
  }

  // ==========================================
  // BAGIAN 6: LEMBAR JAWABAN SISWA (LJK RESMI)
  // ==========================================
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `LEMBAR JAWABAN PESERTA UJIAN (LJK)`,
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${naskah.namaUjian} • ${naskah.namaSekolah.toUpperCase()}`,
          bold: true,
          size: 20,
          font: 'Calibri',
          color: '475569',
        }),
      ],
    })
  );

  // Form Identitas Siswa pada LJK
  const ljkIdTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Nama Siswa\t: `, bold: true, size: 19 }), new TextRun({ text: `.........................................`, size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: `Nomor Peserta\t: `, bold: true, size: 19 }), new TextRun({ text: `.........................................`, size: 19 })] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Kelas / Rombel\t: `, bold: true, size: 19 }), new TextRun({ text: `${naskah.kelas} / ${naskah.rombel}`, size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran\t: `, bold: true, size: 19 }), new TextRun({ text: naskah.mataPelajaran, size: 19 })] }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(ljkIdTable);

  // Grid Lembar Jawaban Pilihan Ganda (Matrix 5 Kolom Bulatan)
  if (naskah.soalPG && naskah.soalPG.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [new TextRun({ text: 'A. LEMBAR JAWABAN PILIHAN GANDA (Beri tanda X atau hitamkan opsi):', bold: true, size: 20 })],
      })
    );

    // Susun grid tabel: No | Pilihan Jawaban
    const rowsPG: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 19 })] })] }),
          new TableCell({ width: { size: 85, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, children: [new Paragraph({ children: [new TextRun({ text: 'Pilihan Jawaban', bold: true, size: 19 })] })] }),
        ],
      }),
    ];

    naskah.soalPG.forEach((pg) => {
      const optionsStr = (profile.jenjang === 'SMA/MA' || profile.jenjang === 'SMK')
        ? '[ A ]   [ B ]   [ C ]   [ D ]   [ E ]'
        : '[ A ]   [ B ]   [ C ]   [ D ]';
      rowsPG.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(pg.nomor), bold: true, size: 19 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: optionsStr, size: 19, font: 'Courier New' })] })],
            }),
          ],
        })
      );
    });

    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsPG }));
  }

  // Lembar Jawaban Uraian
  if (naskah.soalUraian && naskah.soalUraian.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [new TextRun({ text: 'B. LEMBAR JAWABAN SOAL URAIAN:', bold: true, size: 20 })],
      })
    );
    naskah.soalUraian.forEach((u) => {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 20 },
          children: [new TextRun({ text: `Jawaban Nomor ${u.nomor}:`, bold: true, size: 19 })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: '....................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................',
              size: 19,
              color: '94A3B8',
            }),
          ],
        })
      );
    });
  }

  // Tanda Tangan Peserta & Pengawas di LJK
  const ttdLjkTable = new Table({
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
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: 'Tanda Tangan Pengawas Ujian,', size: 19 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 500 }, children: [new TextRun({ text: '( .................................................... )', size: 19 })] }),
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
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: 'Tanda Tangan Peserta Ujian,', size: 19 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 500 }, children: [new TextRun({ text: '( .................................................... )', size: 19 })] }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(ttdLjkTable);

  // ==========================================
  // BAGIAN 7: DOKUMEN RAHASIA - KUNCI & RUBRIK PENSKORAN
  // ==========================================
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `[DOKUMEN GURU - RAHASIA]`,
          bold: true,
          size: 22,
          color: 'DC2626',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `KUNCI JAWABAN & PEDOMAN PENSKORAN`,
          bold: true,
          size: 24,
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
          text: `${naskah.namaUjian} • ${naskah.mataPelajaran} • KELAS ${naskah.kelas}`,
          bold: true,
          size: 20,
          color: '475569',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Tabel Kunci Jawaban PG
  if (naskah.kunciPG && naskah.kunciPG.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [new TextRun({ text: 'A. KUNCI JAWABAN SOAL PILIHAN GANDA & PEMBAHASAN:', bold: true, size: 20 })],
      })
    );

    const rowsKunciPG: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kunci', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Pembahasan / Rasionalisasi Ilmiah', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Skor', bold: true, color: 'FFFFFF', size: 19 })] })] }),
        ],
      }),
      ...naskah.kunciPG.map((k) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(k.nomor), bold: true, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.kunci, bold: true, size: 20, color: '1E3A8A' })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.pembahasan || '-', size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(k.skor), size: 19 })] })] }),
          ],
        })
      ),
    ];
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsKunciPG }));
  }

  // Tabel Kunci PGK
  if (naskah.kunciPGK && naskah.kunciPGK.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [new TextRun({ text: 'B. KUNCI JAWABAN PILIHAN GANDA KOMPLEKS (PGK):', bold: true, size: 20 })],
      })
    );

    const rowsKunciPGK: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kunci Validasi (B / S)', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Keterangan', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Skor', bold: true, color: 'FFFFFF', size: 19 })] })] }),
        ],
      }),
      ...naskah.kunciPGK.map((k) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(k.nomor), bold: true, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.kunci, bold: true, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k.pembahasan || '-', size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(k.skor), size: 19 })] })] }),
          ],
        })
      ),
    ];
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsKunciPGK }));
  }

  // Rubrik Penskoran Soal Uraian
  if (naskah.rubrikUraian && naskah.rubrikUraian.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [new TextRun({ text: 'C. RUBRIK PENSKORAN SOAL URAIAN HOTS:', bold: true, size: 20 })],
      })
    );

    naskah.rubrikUraian.forEach((rub) => {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 30 },
          children: [
            new TextRun({ text: `Butir Soal Nomor ${rub.nomor}: `, bold: true, size: 19 }),
            new TextRun({ text: `${rub.soalRingkas} (Skor Maksimal = ${rub.skorMaksimal})`, italics: true, size: 19 }),
          ],
        })
      );

      const rowsRub: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '334155' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Skor', bold: true, color: 'FFFFFF', size: 19 })] })] }),
            new TableCell({ width: { size: 85, type: WidthType.PERCENTAGE }, shading: { fill: '334155' }, children: [new Paragraph({ children: [new TextRun({ text: 'Indikator / Kriteria Capaian Jawaban Peserta Didik', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          ],
        }),
        ...rub.kriteriaSkor.map((kr) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(kr.skor), bold: true, size: 19 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: kr.deskripsi, size: 19 })] })] }),
            ],
          })
        ),
      ];
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsRub }));
    });
  }

  // Pedoman Perhitungan Nilai Akhir
  children.push(
    new Paragraph({
      spacing: { before: 140, after: 60 },
      children: [new TextRun({ text: 'D. PEDOMAN PENGHITUNGAN NILAI AKHIR (NA):', bold: true, size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `Rumus Nilai: Nilai Akhir (NA) = (Total Skor Perolehan / Skor Maksimal Total: ${naskah.skorMaksimalTotal}) × 100`,
          bold: true,
          size: 20,
          color: '1E3A8A',
        }),
      ],
    })
  );

  // Blok Tanda Tangan
  if (profile.tampilkanTandaTangan) {
    children.push(
      new Paragraph({ spacing: { before: 120 } }),
      buildSignatureBlockTable(profile, naskah.namaGuru)
    );
  }

  // Buat file Document & SaveAs
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
  const cleanMapel = (naskah.mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKelas = (naskah.kelas || 'Semua').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Naskah_Ujian_${naskah.tipe}_${cleanMapel}_Kelas_${cleanKelas}.docx`;
  saveAs(blob, filename);
}
