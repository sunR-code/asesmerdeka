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
} from 'docx';
import saveAs from 'file-saver';
import type { KelasHarianData } from '../../types/kelasHarian';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import { buildSignatureBlockTable } from './docxShared';

/**
 * 9. EKSPOR DAFTAR PRESENSI & KEHADIRAN SISWA KE WORD (.DOCX)
 */
export async function exportPresensiToDocx(profile: SchoolProfile, data: KelasHarianData): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Kop Sekolah
  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: profile.instansiDinas.toUpperCase(), bold: true, size: 22, color: '334155', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: (profile.namaSekolah || 'SEKOLAH').toUpperCase(), bold: true, size: 26, font: 'Calibri' })],
    })
  );
  if (profile.pakaiFormatKopSekolah && profile.alamatSekolah) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: `${profile.alamatSekolah}${profile.kotaSekolah ? ' • ' + profile.kotaSekolah : ''}`, size: 18, color: '64748B', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: '_________________________________________________________________________________', bold: true, size: 18, color: '1E3A8A' })],
    })
  );

  // Judul
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'DAFTAR PRESENSI & KEHADIRAN SISWA', bold: true, size: 26, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `MATA PELAJARAN: ${data.mataPelajaran.toUpperCase()} • KELAS: ${profile.kelasUtama} (${data.rombel}) • SEMESTER: ${data.semester.toUpperCase()} • TA: ${data.tahunAjaran}`,
          size: 19,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  );

  const totalPertemuan = Math.min(16, data.daftarPresensi.length);
  const activePertemuan = data.daftarPresensi.slice(0, totalPertemuan);

  // Header Table Presensi
  const headerCells: TableCell[] = [
    new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIS', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Lengkap Siswa', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'L/P', bold: true, color: 'FFFFFF', size: 15 })] })] }),
  ];

  activePertemuan.forEach((p) => {
    headerCells.push(
      new TableCell({
        width: { size: 2, type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `P${p.pertemuanKe}`, bold: true, color: 'FFFFFF', size: 13 })] })],
      })
    );
  });

  headerCells.push(
    new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, shading: { fill: '059669' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'H', bold: true, color: 'FFFFFF', size: 14 })] })] }),
    new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, shading: { fill: 'D97706' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'S', bold: true, color: 'FFFFFF', size: 14 })] })] }),
    new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, shading: { fill: '2563EB' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'I', bold: true, color: 'FFFFFF', size: 14 })] })] }),
    new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, shading: { fill: 'DC2626' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'A', bold: true, color: 'FFFFFF', size: 14 })] })] }),
    new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '%', bold: true, color: 'FFFFFF', size: 14 })] })] })
  );

  const headerRow = new TableRow({ children: headerCells });

  const dataRows: TableRow[] = data.daftarSiswa.map((siswa) => {
    let countH = 0;
    let countS = 0;
    let countI = 0;
    let countA = 0;

    const cells: TableCell[] = [
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(siswa.noUrut), size: 15 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: siswa.nis, size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: siswa.nama, bold: true, size: 15 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: siswa.jenisKelamin, size: 15 })] })] }),
    ];

    activePertemuan.forEach((p) => {
      const st = p.statusMap[siswa.id] || 'H';
      if (st === 'H') countH++;
      else if (st === 'S') countS++;
      else if (st === 'I') countI++;
      else if (st === 'A') countA++;

      cells.push(
        new TableCell({
          shading: { fill: st === 'H' ? 'F0FDF4' : st === 'S' ? 'FEF3C7' : st === 'I' ? 'EFF6FF' : 'FEE2E2' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: st, size: 13, bold: st !== 'H' })] })],
        })
      );
    });

    const pct = totalPertemuan > 0 ? Math.round((countH / totalPertemuan) * 100) : 100;

    cells.push(
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(countH), size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(countS), size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(countI), size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(countA), size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${pct}%`, bold: true, size: 14, color: pct >= 85 ? '059669' : 'DC2626' })] })] })
    );

    return new TableRow({ children: cells });
  });

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }), new Paragraph({ spacing: { after: 140 } }));

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Presensi_${data.mataPelajaran}_Kelas_${profile.kelasUtama}${data.rombel}_${data.semester.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}

/**
 * 10. EKSPOR AGENDA & JURNAL MENGAJAR GURU KE WORD (.DOCX)
 */
export async function exportJurnalMengajarToDocx(profile: SchoolProfile, data: KelasHarianData): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Kop Sekolah
  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: profile.instansiDinas.toUpperCase(), bold: true, size: 22, color: '334155', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: (profile.namaSekolah || 'SEKOLAH').toUpperCase(), bold: true, size: 26, font: 'Calibri' })],
    })
  );
  if (profile.pakaiFormatKopSekolah && profile.alamatSekolah) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: `${profile.alamatSekolah}${profile.kotaSekolah ? ' • ' + profile.kotaSekolah : ''}`, size: 18, color: '64748B', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: '_________________________________________________________________________________', bold: true, size: 18, color: '1E3A8A' })],
    })
  );

  // Judul
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'AGENDA & JURNAL MENGAJAR GURU', bold: true, size: 26, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `MATA PELAJARAN: ${data.mataPelajaran.toUpperCase()} • KELAS: ${profile.kelasUtama} (${data.rombel}) • SEMESTER: ${data.semester.toUpperCase()} • TA: ${data.tahunAjaran}`,
          size: 19,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  );

  const headerRow = new TableRow({
    children: [
      new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'P.Ke', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hari / Tanggal / Jam', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Materi Pokok & TP', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 36, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Uraian Kegiatan Pembelajaran', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Ketidakhadiran', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Refleksi / Catatan', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    ],
  });

  const dataRows: TableRow[] = data.daftarJurnal.map((jurnal) => {
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(jurnal.pertemuanKe), bold: true, size: 15 })] })] }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: `${jurnal.tanggal}\n`, bold: true, size: 14 }), new TextRun({ text: jurnal.jamKe, size: 13, color: '64748B' })] }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: `[${jurnal.kodeTP}] `, bold: true, color: '1D4ED8', size: 14 }), new TextRun({ text: jurnal.materiPokok, bold: true, size: 14 })] }),
          ],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: jurnal.kegiatanPembelajaran, size: 14 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: jurnal.siswaTidakHadir || 'Nihil', size: 13, color: jurnal.siswaTidakHadir.includes('Nihil') ? '059669' : 'DC2626' })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: jurnal.catatanRefleksi || '-', size: 13, italics: true })] })],
        }),
      ],
    });
  });

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }), new Paragraph({ spacing: { after: 140 } }));

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Jurnal_Mengajar_${data.mataPelajaran}_Kelas_${profile.kelasUtama}${data.rombel}_${data.semester.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}

/**
 * 11. EKSPOR DAFTAR NILAI FORMATIF & SUMATIF KE WORD (.DOCX)
 */
export async function exportDaftarNilaiToDocx(
  profile: SchoolProfile,
  data: KelasHarianData,
  tpList: CustomTPItem[]
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Kop Sekolah
  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: profile.instansiDinas.toUpperCase(), bold: true, size: 22, color: '334155', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: (profile.namaSekolah || 'SEKOLAH').toUpperCase(), bold: true, size: 26, font: 'Calibri' })],
    })
  );
  if (profile.pakaiFormatKopSekolah && profile.alamatSekolah) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: `${profile.alamatSekolah}${profile.kotaSekolah ? ' • ' + profile.kotaSekolah : ''}`, size: 18, color: '64748B', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: '_________________________________________________________________________________', bold: true, size: 18, color: '1E3A8A' })],
    })
  );

  // Judul
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'DAFTAR NILAI ASESMEN FORMATIF & SUMATIF', bold: true, size: 26, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `MATA PELAJARAN: ${data.mataPelajaran.toUpperCase()} • KELAS: ${profile.kelasUtama} (${data.rombel}) • SEMESTER: ${data.semester.toUpperCase()} • TA: ${data.tahunAjaran}`,
          size: 19,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Header Table
  const headerCells: TableCell[] = [
    new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIS', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Peserta Didik', bold: true, color: 'FFFFFF', size: 15 })] })] }),
  ];

  tpList.forEach((tp) => {
    headerCells.push(
      new TableCell({
        width: { size: 5, type: WidthType.PERCENTAGE },
        shading: { fill: '1E3A8A' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tp.kode, bold: true, color: 'FFFFFF', size: 13 })] })],
      })
    );
  });

  headerCells.push(
    new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, shading: { fill: '2563EB' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'R.Formatif', bold: true, color: 'FFFFFF', size: 13 })] })] }),
    new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: 'D97706' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STS', bold: true, color: 'FFFFFF', size: 14 })] })] }),
    new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: 'D97706' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SAS', bold: true, color: 'FFFFFF', size: 14 })] })] }),
    new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, shading: { fill: '059669' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'N.Akhir', bold: true, color: 'FFFFFF', size: 14 })] })] }),
    new TableCell({ width: { size: 9, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Predikat', bold: true, color: 'FFFFFF', size: 13 })] })] })
  );

  const headerRow = new TableRow({ children: headerCells });

  const dataRows: TableRow[] = data.daftarNilai.map((item, idx) => {
    const scores = Object.values(item.nilaiFormatif);
    const avgFormatif = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const cells: TableCell[] = [
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 15 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.nis, size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.nama, bold: true, size: 15 })] })] }),
    ];

    tpList.forEach((tp) => {
      const score = item.nilaiFormatif[tp.kode] ?? '-';
      cells.push(
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(score), size: 14 })] })],
        })
      );
    });

    cells.push(
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(avgFormatif), bold: true, size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.nilaiSTS), size: 14 })] })] }),
      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.nilaiSAS), size: 14 })] })] }),
      new TableCell({
        shading: { fill: item.nilaiAkhir >= 75 ? 'ECFDF5' : 'FEF2F2' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.nilaiAkhir), bold: true, size: 15, color: item.nilaiAkhir >= 75 ? '047857' : 'B91C1C' })] })],
      }),
      new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.predikatKKTP, bold: true, size: 13 })] })],
      })
    );

    return new TableRow({ children: cells });
  });

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }), new Paragraph({ spacing: { after: 100 } }));

  // Catatan KKTP
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'Keterangan Interval Kriteria Ketercapaian Tujuan Pembelajaran (KKTP):',
          bold: true,
          size: 16,
          color: '334155',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: '• 86 - 100 : Sangat Baik (Mencapai KKTP secara optimal)\n• 71 - 85   : Baik (Mencapai KKTP)\n• 56 - 70   : Cukup (Perlu penguatan konsep)\n• 0 - 55     : Perlu Bimbingan (Belum mencapai KKTP, perlu intervensi remedial)',
          size: 15,
          color: '64748B',
        }),
      ],
    })
  );

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Daftar_Nilai_${data.mataPelajaran}_Kelas_${profile.kelasUtama}${data.rombel}_${data.semester.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}

/**
 * 12. EKSPOR REKAPITULASI CAPAIAN & DESKRIPSI e-RAPOR KURIKULUM MERDEKA KE WORD (.DOCX)
 */
export async function exportRekapRaporToDocx(
  profile: SchoolProfile,
  data: KelasHarianData,
  _tpList: CustomTPItem[]
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Kop Sekolah
  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: profile.instansiDinas.toUpperCase(), bold: true, size: 22, color: '334155', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: (profile.namaSekolah || 'SEKOLAH').toUpperCase(), bold: true, size: 26, font: 'Calibri' })],
    })
  );
  if (profile.pakaiFormatKopSekolah && profile.alamatSekolah) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: `${profile.alamatSekolah}${profile.kotaSekolah ? ' • ' + profile.kotaSekolah : ''}`, size: 18, color: '64748B', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: '_________________________________________________________________________________', bold: true, size: 18, color: '1E3A8A' })],
    })
  );

  // Judul
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'REKAPITULASI CAPAIAN KOMPETENSI (e-RAPOR)', bold: true, size: 26, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `MATA PELAJARAN: ${data.mataPelajaran.toUpperCase()} • KELAS: ${profile.kelasUtama} (${data.rombel}) • SEMESTER: ${data.semester.toUpperCase()} • TA: ${data.tahunAjaran}`,
          size: 19,
          color: '555555',
          font: 'Calibri',
        }),
      ],
    })
  );

  const headerRow = new TableRow({
    children: [
      new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 9, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIS', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Peserta Didik', bold: true, color: 'FFFFFF', size: 15 })] })] }),
      new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nilai Akhir', bold: true, color: 'FFFFFF', size: 14 })] })] }),
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Predikat', bold: true, color: 'FFFFFF', size: 14 })] })] }),
      new TableCell({ width: { size: 48, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Capaian Kompetensi (Deskripsi Rapor)', bold: true, color: 'FFFFFF', size: 15 })] })] }),
    ],
  });

  const dataRows: TableRow[] = data.daftarNilai.map((item, idx) => {
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 15 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.nis, size: 14 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.nama, bold: true, size: 15 })] })] }),
        new TableCell({
          shading: { fill: item.nilaiAkhir >= 75 ? 'ECFDF5' : 'FEF2F2' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.nilaiAkhir), bold: true, size: 15, color: item.nilaiAkhir >= 75 ? '047857' : 'B91C1C' })] })],
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.predikatKKTP, bold: true, size: 13 })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: item.deskripsiRapor, size: 14 })] })],
        }),
      ],
    });
  });

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }), new Paragraph({ spacing: { after: 140 } }));

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Rekap_eRapor_${data.mataPelajaran}_Kelas_${profile.kelasUtama}${data.rombel}_${data.semester.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}
