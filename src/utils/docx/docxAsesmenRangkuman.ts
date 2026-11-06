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
  BorderStyle,
} from 'docx';
import saveAs from 'file-saver';
import type { AsesmenDokumen } from '../../types/assessment';
import type { RangkumanDokumen } from '../../types/summary';
import { getSchoolProfile } from '../schoolProfileStorage';
import { buildSignatureBlockTable } from './docxShared';

export async function exportToDocx(assessment: AsesmenDokumen, includeKeyAndRubric = true): Promise<void> {
  const profile = getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  // 1. Kop Sekolah / Header
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
            color: '334155',
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: (assessment.namaSekolah || profile.namaSekolah).toUpperCase(),
          bold: true,
          size: 28, // 14pt
          font: 'Calibri',
        }),
      ],
    })
  );

  if (profile.pakaiFormatKopSekolah && profile.alamatSekolah) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
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
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: assessment.judul.toUpperCase(),
          bold: true,
          size: 26, // 13pt
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `TAHUN AJARAN ${assessment.tahunAjaran || profile.tahunAjaran} • SEMESTER ${profile.semester.toUpperCase()} • KURIKULUM MERDEKA`,
          size: 20, // 10pt
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  );

  // 2. Tabel Identitas Siswa & Mata Pelajaran
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
              },
              children: [
                new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran : ${assessment.mataPelajaran}`, bold: true, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `Kelas / Rombel : ${profile.rombelAktif || assessment.kelas} (${assessment.jenjangFase})`, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `Alokasi Waktu : ${assessment.alokasiWaktu}`, size: 20 })] }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '888888' },
              },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Nama Siswa  : .......................................', size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: 'No. Absen   : .......................................', size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Hari/Tgl     : .......................................', size: 20 })] }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 140 } })
  );

  // 3. Petunjuk Umum
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: 'PETUNJUK UMUM:', bold: true, size: 22 })],
    })
  );
  assessment.petunjukUmum.forEach((pt, idx) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${idx + 1}. ${pt}`, size: 20 })],
        spacing: { after: 40 },
      })
    );
  });
  children.push(new Paragraph({ spacing: { after: 160 } }));

  // 4. Butir Soal
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 120 },
      children: [new TextRun({ text: 'I. LEMBAR SOAL ASESMEN', bold: true, size: 24 })],
    })
  );

  assessment.soalList.forEach((soal) => {
    // Stimulus (jika ada)
    if (soal.stimulus) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({
              text: `[Stimulus Soal No. ${soal.nomor}] `,
              bold: true,
              italics: true,
              size: 20,
              color: '2563EB',
            }),
            new TextRun({
              text: soal.stimulus,
              italics: true,
              size: 20,
              color: '333333',
            }),
          ],
        })
      );
    }

    // Pertanyaan
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({
            text: `${soal.nomor}. ${soal.pertanyaan}`,
            bold: true,
            size: 21,
          }),
        ],
      })
    );

    // Opsi PG
    if (soal.tipe === 'pilihan_ganda') {
      soal.pilihan.forEach((opt) => {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 30 },
            children: [
              new TextRun({ text: `${opt.label}. `, bold: true, size: 20 }),
              new TextRun({ text: opt.teks, size: 20 }),
            ],
          })
        );
      });
    } else if (soal.tipe === 'pilihan_ganda_kompleks') {
      // Tabel Benar / Salah AKM
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: 'Pernyataan Stimulus', bold: true, size: 20 })] })],
            }),
            new TableCell({
              width: { size: 12.5, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Benar', bold: true, size: 20 })] })],
            }),
            new TableCell({
              width: { size: 12.5, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Salah', bold: true, size: 20 })] })],
            }),
          ],
        }),
      ];

      soal.pernyataan.forEach((p) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.teks, size: 19 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[  ]', size: 19 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[  ]', size: 19 })] })] }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      );
    } else if (soal.tipe === 'uraian') {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 120 },
          children: [
            new TextRun({
              text: 'Lembar Jawab: ...........................................................................................................................................\n.......................................................................................................................................................................',
              color: '888888',
              size: 19,
            }),
          ],
        })
      );
    }

    children.push(new Paragraph({ spacing: { after: 100 } }));
  });

  // 5. Bagian Kunci Jawaban & Rubrik KKTP (Jika diaktifkan)
  if (includeKeyAndRubric) {
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: 'II. KUNCI JAWABAN, PEMBAHASAN & PEDOMAN PENSKORAN',
            bold: true,
            size: 24,
            color: '15803D',
          }),
        ],
      })
    );

    assessment.soalList.forEach((soal) => {
      if (soal.tipe === 'pilihan_ganda') {
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 20 },
            children: [
              new TextRun({ text: `No. ${soal.nomor} — Kunci: `, bold: true, size: 20 }),
              new TextRun({ text: soal.kunci, bold: true, color: '15803D', size: 21 }),
              new TextRun({ text: ` | Tingkat: ${soal.levelKognitif}`, size: 19, color: '555555' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `Pembahasan: ${soal.pembahasan}`, size: 19, italics: true }),
            ],
          })
        );
      } else if (soal.tipe === 'pilihan_ganda_kompleks') {
        const kunciAKM = soal.pernyataan.map((p, i) => `(${i + 1}) ${p.isBenar ? 'BENAR' : 'SALAH'}`).join(', ');
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 20 },
            children: [
              new TextRun({ text: `No. ${soal.nomor} (AKM) — Kunci: `, bold: true, size: 20 }),
              new TextRun({ text: kunciAKM, bold: true, color: '15803D', size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `Pembahasan: ${soal.pembahasan}`, size: 19, italics: true }),
            ],
          })
        );
      } else if (soal.tipe === 'uraian') {
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 20 },
            children: [
              new TextRun({ text: `No. ${soal.nomor} (Uraian) — Pedoman Penskoran:`, bold: true, size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 30 },
            children: [new TextRun({ text: soal.pedomanPenskoran, size: 19 })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: `Contoh Jawaban Ideal: ${soal.contohJawaban}`, size: 19, italics: true, color: '1E3A8A' })],
          })
        );
      }
    });

    // Tabel Rubrik KKTP
    if (assessment.rubrikKKTP.length > 0) {
      children.push(
        new Paragraph({
          pageBreakBefore: true,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: 'III. RUBRIK KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)',
              bold: true,
              size: 22,
            }),
          ],
        })
      );

      const rubricRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tujuan Pembelajaran', bold: true, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Perlu Bimbingan (0-60)', bold: true, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cukup (61-70)', bold: true, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Baik (71-85)', bold: true, size: 18 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sangat Baik (86-100)', bold: true, size: 18 })] })] }),
          ],
        }),
      ];

      assessment.rubrikKKTP.forEach((r) => {
        rubricRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.tujuanPembelajaran, bold: true, size: 18 }), new TextRun({ text: `\nBukti: ${r.buktiKetercapaian}`, size: 17 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.perluBimbingan, size: 17 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.cukup, size: 17 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.baik, size: 17 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.sangatBaik, size: 17 })] })] }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rubricRows,
        }),
        new Paragraph({ spacing: { after: 200 } })
      );
    }

    if (profile.tampilkanTandaTangan) {
      children.push(buildSignatureBlockTable(profile, assessment.namaPenyusun));
    }
  }

  // Buat Document docx
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanFilename = assessment.judul.replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Asesmen_Kurikulum_Merdeka';
  saveAs(blob, `${cleanFilename}.docx`);
}

/**
 * Ekspor Rangkuman Materi ke Microsoft Word (.docx)
 */
export async function exportRangkumanToDocx(rangkuman: RangkumanDokumen): Promise<void> {
  const profile = getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  // 1. Kop Sekolah (Jika diaktifkan) & Judul Rangkuman
  if (profile.pakaiFormatKopSekolah) {
    if (profile.instansiDinas) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: profile.instansiDinas.toUpperCase(),
              bold: true,
              size: 20,
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
            text: profile.namaSekolah.toUpperCase(),
            bold: true,
            size: 26,
            font: 'Calibri',
          }),
        ],
      })
    );
    if (profile.alamatSekolah) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
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
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'LEMBAR RANGKUMAN CERDAS SISWA',
          bold: true,
          size: 24, // 12pt
          color: '4F46E5',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: rangkuman.judul.toUpperCase(),
          bold: true,
          size: 28, // 14pt
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `${rangkuman.mataPelajaran} • ${rangkuman.jenjangFase} • Kelas ${profile.rombelAktif || rangkuman.kelas} • TA ${profile.tahunAjaran}`,
          size: 20,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  );

  // 2. Intisari Satu Kalimat
  children.push(
    new Paragraph({
      spacing: { before: 80, after: 140 },
      children: [
        new TextRun({ text: '💡 Intisari Pokok: ', bold: true, size: 21, color: 'D97706' }),
        new TextRun({ text: `"${rangkuman.ringkasanSatuKalimat}"`, italics: true, size: 21 }),
      ],
    })
  );

  // 3. Peta Konsep
  if (rangkuman.petaKonsep.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 80, after: 60 },
        children: [new TextRun({ text: '🗺️ Peta Alur Konsep:', bold: true, size: 22 })],
      })
    );
    rangkuman.petaKonsep.forEach((pk, i) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${i + 1}. ${pk}`, size: 20 })],
          spacing: { after: 30 },
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // 3B. Struktur Inti / Rumus & Kaidah Utama
  if (rangkuman.rumusAtauPola && rangkuman.rumusAtauPola.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 80, after: 60 },
        children: [new TextRun({ text: '📌 Struktur Inti, Rumus & Kaidah Utama:', bold: true, size: 22, color: '1D4ED8' })],
      })
    );
    rangkuman.rumusAtauPola.forEach((rp) => {
      children.push(
        new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: rp.label, bold: true, size: 20, color: '1E3A8A' })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: rp.isi, size: 19 })],
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 100 } }));
  }

  // 4. Pembahasan Poin-Poin Utama
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 100, after: 80 },
      children: [new TextRun({ text: '📖 Konsep Penting & Analogi Nyata', bold: true, size: 24, color: '1E3A8A' })],
    })
  );

  rangkuman.poinUtama.forEach((p, idx) => {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [new TextRun({ text: `${idx + 1}. ${p.judul}`, bold: true, size: 21 })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: p.penjelasan, size: 20 })],
      })
    );

    if (p.analogi) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: '🎯 Analogi: ', bold: true, italics: true, size: 19, color: '059669' }),
            new TextRun({ text: p.analogi, italics: true, size: 19, color: '047857' }),
          ],
        })
      );
    }

    if (p.poinKunci && p.poinKunci.length > 0) {
      p.poinKunci.forEach((pk) => {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 20 },
            children: [
              new TextRun({ text: '• ', bold: true, size: 19 }),
              new TextRun({ text: pk, size: 19 }),
            ],
          })
        );
      });
    }

    children.push(new Paragraph({ spacing: { after: 80 } }));
  });

  // 4B. Contoh Teks Model / Contoh Soal & Bedah Analisis
  if (rangkuman.contohKonkret) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 100, after: 60 },
        children: [new TextRun({ text: `📄 ${rangkuman.contohKonkret.judulContoh}`, bold: true, size: 22, color: '0F766E' })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: rangkuman.contohKonkret.teksContoh, size: 19 })],
      })
    );

    if (rangkuman.contohKonkret.bedahAnalisis && rangkuman.contohKonkret.bedahAnalisis.length > 0) {
      rangkuman.contohKonkret.bedahAnalisis.forEach((ba) => {
        children.push(
          new Paragraph({
            indent: { left: 240 },
            spacing: { after: 30 },
            children: [new TextRun({ text: ba, size: 19, color: '065F46' })],
          })
        );
      });
    }
    children.push(new Paragraph({ spacing: { after: 100 } }));
  }

  // 4C. Tips Jitu Ujian & Jebakan Umum
  if (rangkuman.tipsUjian && rangkuman.tipsUjian.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 100, after: 60 },
        children: [new TextRun({ text: '🎯 Tips Jitu Ujian & Jebakan yang Sering Keliru:', bold: true, size: 22, color: 'B91C1C' })],
      })
    );
    rangkuman.tipsUjian.forEach((tip) => {
      children.push(
        new Paragraph({
          spacing: { after: 35 },
          children: [new TextRun({ text: `• ${tip}`, size: 19, color: '7F1D1D' })],
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 100 } }));
  }

  // 5. Fakta Menarik (Tahukah Kamu?)
  if (rangkuman.faktaMenarik.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 120, after: 60 },
        children: [new TextRun({ text: '✨ Tahukah Kamu? (Fakta Menakjubkan)', bold: true, size: 22, color: 'B45309' })],
      })
    );
    rangkuman.faktaMenarik.forEach((fm) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `🌟 ${fm}`, italics: true, size: 19 })],
          spacing: { after: 40 },
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // 6. Glosarium Mini
  if (rangkuman.glosarium.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 100, after: 60 },
        children: [new TextRun({ text: '📚 Glosarium Istilah Kunci:', bold: true, size: 22 })],
      })
    );
    rangkuman.glosarium.forEach((g) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `• ${g.istilah}: `, bold: true, size: 19 }),
            new TextRun({ text: g.makna, size: 19 }),
          ],
          spacing: { after: 30 },
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // 7. Kuis Kilat
  if (rangkuman.kuisKilat.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 100, after: 60 },
        children: [new TextRun({ text: '⚡ Kuis Kilat Cek Pemahaman:', bold: true, size: 22, color: '047857' })],
      })
    );
    rangkuman.kuisKilat.forEach((k) => {
      children.push(
        new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: `Tanya ${k.nomor}: ${k.pertanyaan}`, bold: true, size: 19 })],
        }),
        new Paragraph({
          spacing: { after: 50 },
          children: [new TextRun({ text: `Jawaban: ${k.jawaban}`, italics: true, size: 18, color: '059669' })],
        })
      );
    });
  }

  // Pesan Inspirasi
  if (rangkuman.pesanInspirasi) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 140, after: 180 },
        children: [
          new TextRun({
            text: `💬 "${rangkuman.pesanInspirasi}"`,
            italics: true,
            bold: true,
            size: 20,
            color: '4338CA',
          }),
        ],
      })
    );
  }

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile));
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const cleanFilename = rangkuman.judul.replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Rangkuman_Materi';
  saveAs(blob, `${cleanFilename}.docx`);
}

export async function exportKisiKisiToDocx(assessment: AsesmenDokumen): Promise<void> {
  const profile = getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  // 1. Header Kisi-Kisi
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'KISI-KISI PENULISAN SOAL ASESMEN KURIKULUM MERDEKA',
          bold: true,
          size: 26,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: (assessment.namaSekolah || profile.namaSekolah).toUpperCase(),
          bold: true,
          size: 24,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: `TAHUN AJARAN ${assessment.tahunAjaran || profile.tahunAjaran} • SEMESTER ${profile.semester.toUpperCase()}`,
          size: 20,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  );

  // 2. Identitas Dokumen
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `Mata Pelajaran : ${assessment.mataPelajaran}`, bold: true, size: 20 }),
        new TextRun({ text: `   |   Kelas / Fase : ${assessment.kelas} (${assessment.jenjangFase})`, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: `Materi Pokok   : ${assessment.materiPokok}`, size: 20 }),
        new TextRun({ text: `   |   Penyusun : ${assessment.namaPenyusun || profile.namaGuru}`, size: 20 }),
      ],
    })
  );

  // 3. Tabel Kisi-Kisi
  const headerNames = ['No', 'Tujuan Pembelajaran (TP)', 'Materi Pokok', 'Indikator Soal', 'Level Kognitif', 'Bentuk Soal', 'No. Soal', 'Bobot'];
  const colWidths = [5, 22, 16, 27, 10, 10, 5, 5];

  const headerRow = new TableRow({
    children: headerNames.map((name, i) =>
      new TableCell({
        width: { size: colWidths[i], type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: name, bold: true, color: 'FFFFFF', size: 18 })],
          }),
        ],
      })
    ),
  });

  const dataRows = assessment.soalList.map((soal, idx) => {
    const tpText = assessment.tujuanPembelajaran[idx % assessment.tujuanPembelajaran.length] || assessment.tujuanPembelajaran[0] || '-';
    const bentukLabel = soal.tipe === 'pilihan_ganda' ? 'PG' : soal.tipe === 'pilihan_ganda_kompleks' ? 'PG Kompleks (AKM)' : 'Uraian HOTS';
    const bobot = soal.tipe === 'uraian' ? soal.skorMaksimal : soal.skor;

    const cells = [
      String(idx + 1),
      tpText,
      assessment.materiPokok,
      soal.indikatorSoal,
      soal.levelKognitif,
      bentukLabel,
      String(soal.nomor),
      String(bobot),
    ];

    return new TableRow({
      children: cells.map((val, cIdx) =>
        new TableCell({
          width: { size: colWidths[cIdx], type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: cIdx === 0 || cIdx >= 4 ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [new TextRun({ text: val, size: 18 })],
            }),
          ],
        })
      ),
    });
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    }),
    new Paragraph({ spacing: { after: 240 } })
  );

  // 4. Blok Tanda Tangan Pengesahan
  if (profile.tampilkanTandaTangan) {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    children.push(
      new Table({
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
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.namaKepalaSekolah || '..........................................', bold: true, underline: {}, size: 20 })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.nipKepalaSekolah ? `NIP. ${profile.nipKepalaSekolah}` : 'NIP. -', size: 18 })] }),
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
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${profile.kotaSekolah || 'Indonesia'}, ${todayStr}`, size: 20 })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: 'Guru Mata Pelajaran', size: 20 })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: assessment.namaPenyusun || profile.namaGuru, bold: true, underline: {}, size: 20 })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: profile.nipGuru ? `NIP. ${profile.nipGuru}` : 'NIP. -', size: 18 })] }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const cleanFilename = assessment.judul.replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Kisi_Kisi_Soal';
  saveAs(blob, `Kisi_Kisi_${cleanFilename}.docx`);
}
