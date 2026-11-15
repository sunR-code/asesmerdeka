import {
  AlignmentType,
  BorderStyle,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import saveAs from 'file-saver';
import type { KelasHarianData, StatusFinalisasiRapor } from '../../types/kelasHarian';
import type { CustomTPItem, SchoolProfile } from '../schoolProfileStorage';
import {
  computeClassGradeSummary,
  computeERaporStudentSummary,
  computeNilaiAkhir,
  getExportVerificationNoticeText,
  getFormatifScoreForTP,
  normalizeBobotKebijakan,
} from '../kelasHarianStorage';
import { buildSignatureBlockTable, createStyledDocxDocument } from './docxShared';

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
} as const;

const COMPACT_MARGINS = { top: 55, bottom: 55, left: 75, right: 75 } as const;

const STATUS_RAPOR_LABELS: Record<StatusFinalisasiRapor, string> = {
  belum_lengkap: 'Belum Lengkap',
  draf: 'Draf',
  siap_diperiksa: 'Siap Diperiksa',
  final: 'Final',
};

function buildKopAndTitle(
  profile: SchoolProfile,
  title: string,
  subtitle: string,
  data?: KelasHarianData
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: profile.instansiDinas.toUpperCase(),
            bold: true,
            size: 18,
            color: '475569',
          }),
        ],
      })
    );
  }
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: (profile.namaSekolah || 'SATUAN PENDIDIKAN').toUpperCase(),
          bold: true,
          size: 24,
          color: '0F172A',
        }),
      ],
    })
  );
  if (profile.pakaiFormatKopSekolah && profile.alamatSekolah) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `${profile.alamatSekolah}${profile.kotaSekolah ? ` • ${profile.kotaSekolah}` : ''}`,
            size: 16,
            color: '64748B',
          }),
        ],
      })
    );
  }
  const noticeText = data ? getExportVerificationNoticeText(data) : '';
  if (noticeText) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 90 },
        shading: { fill: 'FEF3C7' },
        children: [
          new TextRun({
            text: noticeText,
            bold: true,
            size: 16,
            color: '92400E',
          }),
        ],
      })
    );
  }
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [new TextRun({ text: title, bold: true, size: 24, color: '1E3A8A' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [new TextRun({ text: subtitle, size: 17, color: '475569' })],
    })
  );
  return paragraphs;
}

function makeHeaderCell(
  text: string,
  widthPct: number,
  options?: { fill?: string; color?: string; fontSize?: number; rowSpan?: number; columnSpan?: number }
): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    rowSpan: options?.rowSpan,
    columnSpan: options?.columnSpan,
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    margins: COMPACT_MARGINS,
    shading: { fill: options?.fill || '1E3A8A' },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            color: options?.color || 'FFFFFF',
            size: options?.fontSize || 16,
          }),
        ],
      }),
    ],
  });
}

function makeTextCell(
  paragraphs: Paragraph[],
  widthPct: number,
  options?: { fill?: string }
): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    borders: CELL_BORDERS,
    margins: COMPACT_MARGINS,
    shading: options?.fill ? { fill: options.fill } : undefined,
    children: paragraphs,
  });
}

function formatScoreCell(val: number | null | undefined): string {
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return String(val);
  }
  return '-';
}

/**
 * 1. BUILDER PRESENSI (16 PERTEMUAN)
 */
export function buildPresensiElements(
  profile: SchoolProfile,
  data: KelasHarianData
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const rombel = data.rombel || profile.rombelAktif;
  const mapel = data.mataPelajaran || profile.mataPelajaranUtama;

  children.push(
    ...buildKopAndTitle(
      profile,
      'DAFTAR PRESENSI HARIAN PESERTA DIDIK (16 PERTEMUAN)',
      `Mata Pelajaran: ${mapel} | Kelas / Rombel: ${rombel} | Semester: ${data.semester} | TA: ${data.tahunAjaran}`,
      data
    )
  );

  const activeCount = data.daftarSiswa.length;
  const archivedCount = data.archivedSiswa?.length || 0;
  const scheduledDates = data.daftarPresensi.filter((p) => (p.tanggal || '').trim().length > 0).length;

  children.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `Siswa Aktif: ${activeCount} orang${archivedCount > 0 ? ` · Riwayat Mutasi/Arsip: ${archivedCount} orang` : ''} · Pertemuan Tercatat: ${scheduledDates}/16`,
          size: 16,
          color: '334155',
        }),
      ],
    })
  );

  const wNo = 3.5;
  const wNis = 10.5;
  const wNama = 20;
  const wJK = 3;
  const wMeet = 3; // 16 * 3 = 48
  const wSummary = 3.75; // 4 * 3.75 = 15 (Total = 100)

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      makeHeaderCell('No', wNo, { fontSize: 15 }),
      makeHeaderCell('NIS / NISN', wNis, { fontSize: 15 }),
      makeHeaderCell('Nama Peserta Didik', wNama, { fontSize: 15 }),
      makeHeaderCell('L/P', wJK, { fontSize: 15 }),
      ...Array.from({ length: 16 }, (_, i) => {
        const meet = data.daftarPresensi[i];
        const shortDate =
          meet?.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(meet.tanggal)
            ? `${meet.tanggal.slice(8, 10)}/${meet.tanggal.slice(5, 7)}`
            : '';
        return new TableCell({
          width: { size: wMeet, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          borders: CELL_BORDERS,
          margins: { top: 40, bottom: 40, left: 20, right: 20 },
          shading: { fill: '1E3A8A' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(i + 1), bold: true, color: 'FFFFFF', size: 14 })],
            }),
            ...(shortDate
              ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: shortDate, color: 'E2E8F0', size: 11 })],
                  }),
                ]
              : []),
          ],
        });
      }),
      makeHeaderCell('H', wSummary, { fill: '0F766E', fontSize: 15 }),
      makeHeaderCell('S', wSummary, { fill: 'D97706', fontSize: 15 }),
      makeHeaderCell('I', wSummary, { fill: '0284C7', fontSize: 15 }),
      makeHeaderCell('A', wSummary, { fill: 'DC2626', fontSize: 15 }),
    ],
  });

  const dataRows = data.daftarSiswa.map((s, idx) => {
    let h = 0;
    let sCount = 0;
    let iz = 0;
    let a = 0;
    const rowFill = idx % 2 === 1 ? 'F8FAFC' : undefined;

    const meetCells = Array.from({ length: 16 }, (_, i) => {
      const meet = data.daftarPresensi[i];
      const st = meet ? meet.statusMap?.[s.id] || 'H' : 'H';
      if (st === 'H') h++;
      else if (st === 'S') sCount++;
      else if (st === 'I') iz++;
      else if (st === 'A') a++;
      const displayChar = st === 'H' ? '•' : st;
      const color =
        st === 'S' ? 'D97706' : st === 'I' ? '0284C7' : st === 'A' ? 'DC2626' : '334155';
      return new TableCell({
        width: { size: wMeet, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: CELL_BORDERS,
        margins: { top: 40, bottom: 40, left: 20, right: 20 },
        shading: rowFill ? { fill: rowFill } : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: displayChar,
                bold: st !== 'H',
                color,
                size: 14,
              }),
            ],
          }),
        ],
      });
    });

    const idParagraphs: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: s.nis || '-', size: 14 })],
      }),
    ];
    if (s.nisn) {
      idParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: s.nisn, size: 12, color: '64748B' })],
        })
      );
    }

    return new TableRow({
      cantSplit: true,
      children: [
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 15 })] })],
          wNo,
          { fill: rowFill }
        ),
        makeTextCell(idParagraphs, wNis, { fill: rowFill }),
        makeTextCell(
          [new Paragraph({ children: [new TextRun({ text: s.nama, bold: true, size: 15 })] })],
          wNama,
          { fill: rowFill }
        ),
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.jenisKelamin, size: 15 })] })],
          wJK,
          { fill: rowFill }
        ),
        ...meetCells,
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(h), bold: true, size: 15, color: '0F766E' })] })],
          wSummary,
          { fill: rowFill }
        ),
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sCount), size: 15, color: 'D97706' })] })],
          wSummary,
          { fill: rowFill }
        ),
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(iz), size: 15, color: '0284C7' })] })],
          wSummary,
          { fill: rowFill }
        ),
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(a), bold: a > 0, size: 15, color: 'DC2626' })] })],
          wSummary,
          { fill: rowFill }
        ),
      ],
    });
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: 'Keterangan: • = Hadir (H), S = Sakit, I = Izin, A = Alfa (Tanpa Keterangan).',
          size: 16,
          italics: true,
          color: '64748B',
        }),
      ],
    })
  );

  if (data.archivedSiswa && data.archivedSiswa.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `Arsip Mutasi/Keluar: ${data.archivedSiswa
              .map((a) => `${a.nama} (${a.nis}${a.rombelTujuan ? ` → ${a.rombelTujuan}` : ''})`)
              .join('; ')}`,
            size: 15,
            color: '475569',
          }),
        ],
      })
    );
  }

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  return children;
}

export async function exportPresensiToDocx(
  profile: SchoolProfile,
  data: KelasHarianData
): Promise<void> {
  const children = buildPresensiElements(profile, data);
  const doc = createStyledDocxDocument(profile, 'Daftar Presensi Siswa', children, {
    landscape: true,
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Daftar_Presensi_${data.mataPelajaran}_Kelas_${data.rombel}.docx`);
}

/**
 * 2. BUILDER JURNAL MENGAJAR GURU
 */
export function buildJurnalMengajarElements(
  profile: SchoolProfile,
  data: KelasHarianData,
  tpList?: CustomTPItem[]
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const rombel = data.rombel || profile.rombelAktif;
  const mapel = data.mataPelajaran || profile.mataPelajaranUtama;

  children.push(
    ...buildKopAndTitle(
      profile,
      'AGENDA & JURNAL MENGAJAR GURU',
      `Mata Pelajaran: ${mapel} | Kelas / Rombel: ${rombel} | Semester: ${data.semester} | TA: ${data.tahunAjaran}`,
      data
    )
  );

  const totalJP = data.daftarJurnal.reduce((acc, j) => acc + (j.jumlahJP ?? 2), 0);
  const terlaksanaCount = data.daftarJurnal.filter(
    (j) => !j.statusKeterlaksanaan || j.statusKeterlaksanaan === 'terlaksana'
  ).length;
  const tindakLanjutCount = data.daftarJurnal.filter(
    (j) => j.statusKeterlaksanaan === 'perlu_tindak_lanjut'
  ).length;
  const ditundaCount = data.daftarJurnal.filter(
    (j) => j.statusKeterlaksanaan === 'ditunda'
  ).length;

  children.push(
    new Paragraph({
      spacing: { after: 110 },
      children: [
        new TextRun({
          text: `Total Entri: ${data.daftarJurnal.length} Pertemuan · Total Jam Pelajaran: ${totalJP} JP · Terlaksana: ${terlaksanaCount}${tindakLanjutCount > 0 ? ` · Perlu Tindak Lanjut: ${tindakLanjutCount}` : ''}${ditundaCount > 0 ? ` · Ditunda: ${ditundaCount}` : ''}`,
          size: 16,
          color: '334155',
        }),
      ],
    })
  );

  const wPert = 13;
  const wTp = 24;
  const wKeg = 28;
  const wAbs = 15;
  const wRef = 20;

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      makeHeaderCell('Pert. / Tgl', wPert, { fontSize: 16 }),
      makeHeaderCell('TP, Sub-TP & Materi', wTp, { fontSize: 16 }),
      makeHeaderCell('Kegiatan Pembelajaran & Status', wKeg, { fontSize: 16 }),
      makeHeaderCell('Presensi (Tidak Hadir)', wAbs, { fontSize: 16 }),
      makeHeaderCell('Catatan Refleksi', wRef, { fontSize: 16 }),
    ],
  });

  const rows: TableRow[] = [headerRow];

  if (data.daftarJurnal.length === 0) {
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            columnSpan: 5,
            borders: CELL_BORDERS,
            margins: COMPACT_MARGINS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Belum ada entri jurnal mengajar yang tercatat.',
                    italics: true,
                    size: 16,
                    color: '64748B',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  } else {
    data.daftarJurnal.forEach((j, idx) => {
      const rowFill = idx % 2 === 1 ? 'F8FAFC' : undefined;
      const resolvedTP = tpList?.find(
        (t) => (j.tpId && t.id === j.tpId) || t.kode === j.kodeTP
      );
      const displayKodeTP = resolvedTP?.kode || j.kodeTP || '-';
      const jpText = `${j.jumlahJP ?? 2} JP`;
      const statusLabel =
        j.statusKeterlaksanaan === 'ditunda'
          ? 'Ditunda'
          : j.statusKeterlaksanaan === 'perlu_tindak_lanjut'
          ? 'Perlu Tindak Lanjut'
          : 'Terlaksana';
      const statusColor =
        j.statusKeterlaksanaan === 'ditunda'
          ? 'B91C1C'
          : j.statusKeterlaksanaan === 'perlu_tindak_lanjut'
          ? 'D97706'
          : '047857';

      const tpParagraphs: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({ text: `TP ${displayKodeTP}`, bold: true, size: 16, color: '1E3A8A' }),
            new TextRun({ text: ` (${jpText})`, bold: true, size: 15, color: '475569' }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: j.materiPokok, bold: true, size: 16 })],
        }),
      ];

      if (resolvedTP?.subTP && j.subTpIds && j.subTpIds.length > 0) {
        const subLabels = resolvedTP.subTP
          .filter((sub) => j.subTpIds?.includes(sub.id))
          .map((sub) => `${sub.kode ? `${sub.kode} ` : ''}${sub.fokusMateri}`);
        if (subLabels.length > 0) {
          tpParagraphs.push(
            new Paragraph({
              spacing: { before: 30 },
              children: [
                new TextRun({
                  text: `Sub-TP: ${subLabels.join('; ')}`,
                  size: 14,
                  color: '475569',
                }),
              ],
            })
          );
        }
      }

      const kegParagraphs: Paragraph[] = [
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({ text: `[${statusLabel}]`, bold: true, size: 14, color: statusColor }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: j.kegiatanPembelajaran || '-', size: 16 })],
        }),
      ];
      if (j.tindakLanjut && j.tindakLanjut.trim()) {
        kegParagraphs.push(
          new Paragraph({
            spacing: { before: 30 },
            children: [
              new TextRun({
                text: `Tindak Lanjut: ${j.tindakLanjut}`,
                size: 14,
                italics: true,
                color: '334155',
              }),
            ],
          })
        );
      }

      rows.push(
        new TableRow({
          cantSplit: true,
          children: [
            makeTextCell(
              [
                new Paragraph({
                  children: [new TextRun({ text: `#${j.pertemuanKe}`, bold: true, size: 16 })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: j.tanggal || '-', size: 15, color: '334155' })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: j.jamKe || '-', size: 14, color: '64748B' })],
                }),
              ],
              wPert,
              { fill: rowFill }
            ),
            makeTextCell(tpParagraphs, wTp, { fill: rowFill }),
            makeTextCell(kegParagraphs, wKeg, { fill: rowFill }),
            makeTextCell(
              [
                new Paragraph({
                  children: [new TextRun({ text: j.siswaTidakHadir || 'Nihil', size: 15 })],
                }),
              ],
              wAbs,
              { fill: rowFill }
            ),
            makeTextCell(
              [
                new Paragraph({
                  children: [new TextRun({ text: j.catatanRefleksi || '-', size: 15 })],
                }),
              ],
              wRef,
              { fill: rowFill }
            ),
          ],
        })
      );
    });
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    })
  );

  if (profile.tampilkanTandaTangan) {
    children.push(new Paragraph({ spacing: { after: 140 } }));
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  return children;
}

export async function exportJurnalMengajarToDocx(
  profile: SchoolProfile,
  data: KelasHarianData,
  tpList?: CustomTPItem[]
): Promise<void> {
  const children = buildJurnalMengajarElements(profile, data, tpList);
  const doc = createStyledDocxDocument(profile, 'Jurnal Mengajar Guru', children, {
    landscape: false,
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Jurnal_Mengajar_${data.mataPelajaran}_Kelas_${data.rombel}.docx`);
}

/**
 * 3. BUILDER DAFTAR NILAI PER TP
 */
export function buildDaftarNilaiElements(
  profile: SchoolProfile,
  data: KelasHarianData,
  tpList: CustomTPItem[]
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const rombel = data.rombel || profile.rombelAktif;
  const mapel = data.mataPelajaran || profile.mataPelajaranUtama;
  const activeBobot = normalizeBobotKebijakan(data.bobotNilai);
  const kktpMin = activeBobot.kktpMinTuntas ?? 71;
  const hasPraktik = (activeBobot.bobotPraktik ?? 0) > 0;
  const summary = computeClassGradeSummary(data.daftarNilai, tpList, activeBobot);

  children.push(
    ...buildKopAndTitle(
      profile,
      'DAFTAR NILAI ASESMEN FORMATIF & SUMATIF',
      `Mata Pelajaran: ${mapel} | Kelas / Rombel: ${rombel} | Semester: ${data.semester} | TA: ${data.tahunAjaran}`,
      data
    )
  );

  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `Kebijakan Bobot Nilai: Formatif ${activeBobot.bobotFormatif}% · STS ${activeBobot.bobotSTS}% · SAS ${activeBobot.bobotSAS}%${hasPraktik ? ` · Praktik/Proyek ${activeBobot.bobotPraktik}%` : ''} | Kriteria Tuntas KKTP: ≥ ${kktpMin}`,
          bold: true,
          size: 16,
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 110 },
      children: [
        new TextRun({
          text: `Ringkasan Kelas: Rata-rata ${summary.avgKelas ?? '-'} (${summary.gradedCount}/${summary.totalSiswa} siswa bernilai) · Sangat Baik: ${summary.totalSangatBaik} · Baik: ${summary.totalBaik} · Cukup: ${summary.totalCukup} · Perlu Bimbingan: ${summary.totalPerluBimbingan}`,
          size: 16,
          color: '334155',
        }),
      ],
    })
  );

  const wNo = 4;
  const wNis = 11;
  const wNama = 22;
  const tpCount = Math.max(1, tpList.length);
  const wSTS = 6;
  const wSAS = 6;
  const wPraktik = hasPraktik ? 6 : 0;
  const wNA = 7;
  const wPred = 12;
  const wTPPool = 100 - (wNo + wNis + wNama + wSTS + wSAS + wPraktik + wNA + wPred);
  const wPerTP = Number((wTPPool / tpCount).toFixed(2));

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      makeHeaderCell('No', wNo, { fontSize: 15 }),
      makeHeaderCell('NIS / NISN', wNis, { fontSize: 15 }),
      makeHeaderCell('Nama Peserta Didik', wNama, { fontSize: 15 }),
      ...(tpList.length > 0
        ? tpList.map((t) => makeHeaderCell(t.kode, wPerTP, { fontSize: 14 }))
        : [makeHeaderCell('Formatif', wTPPool, { fontSize: 14 })]),
      makeHeaderCell('STS', wSTS, { fontSize: 15 }),
      makeHeaderCell('SAS', wSAS, { fontSize: 15 }),
      ...(hasPraktik ? [makeHeaderCell('Praktik', wPraktik, { fontSize: 14 })] : []),
      makeHeaderCell('N. Akhir', wNA, { fill: '0F766E', fontSize: 15 }),
      makeHeaderCell('Predikat KKTP', wPred, { fill: '0F766E', fontSize: 15 }),
    ],
  });

  const dataRows = data.daftarNilai.map((item, idx) => {
    const rowFill = idx % 2 === 1 ? 'F8FAFC' : undefined;
    const computed = computeNilaiAkhir(
      item.nilaiFormatif || {},
      item.nilaiSTS,
      item.nilaiSAS,
      tpList,
      activeBobot,
      item.nilaiPraktik
    );
    const naText = computed.na !== null ? String(computed.na) : '-';
    const naColor =
      computed.na === null ? '64748B' : computed.na >= kktpMin ? '15803D' : 'B91C1C';
    const predikatLabel =
      computed.statusNilai === 'lengkap'
        ? computed.predikat
        : computed.statusNilai === 'sebagian'
        ? 'Sebagian'
        : 'Belum Dinilai';

    return new TableRow({
      cantSplit: true,
      children: [
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 15 })] })],
          wNo,
          { fill: rowFill }
        ),
        makeTextCell(
          [
            new Paragraph({ children: [new TextRun({ text: item.nis || '-', size: 14 })] }),
            ...(item.nisn
              ? [new Paragraph({ children: [new TextRun({ text: item.nisn, size: 12, color: '64748B' })] })]
              : []),
          ],
          wNis,
          { fill: rowFill }
        ),
        makeTextCell(
          [new Paragraph({ children: [new TextRun({ text: item.nama, bold: true, size: 15 })] })],
          wNama,
          { fill: rowFill }
        ),
        ...(tpList.length > 0
          ? tpList.map((tp) => {
              const sc = getFormatifScoreForTP(item.nilaiFormatif, tp);
              return makeTextCell(
                [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: formatScoreCell(sc),
                        size: 15,
                        color: typeof sc === 'number' ? '0F172A' : '94A3B8',
                      }),
                    ],
                  }),
                ],
                wPerTP,
                { fill: rowFill }
              );
            })
          : [
              makeTextCell(
                [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '-', size: 15, color: '94A3B8' })] })],
                wTPPool,
                { fill: rowFill }
              ),
            ]),
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatScoreCell(item.nilaiSTS), size: 15, color: typeof item.nilaiSTS === 'number' ? '0F172A' : '94A3B8' })] })],
          wSTS,
          { fill: rowFill }
        ),
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatScoreCell(item.nilaiSAS), size: 15, color: typeof item.nilaiSAS === 'number' ? '0F172A' : '94A3B8' })] })],
          wSAS,
          { fill: rowFill }
        ),
        ...(hasPraktik
          ? [
              makeTextCell(
                [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatScoreCell(item.nilaiPraktik), size: 15, color: typeof item.nilaiPraktik === 'number' ? '0F172A' : '94A3B8' })] })],
                wPraktik,
                { fill: rowFill }
              ),
            ]
          : []),
        makeTextCell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: naText, bold: true, size: 15, color: naColor })],
            }),
          ],
          wNA,
          { fill: rowFill }
        ),
        makeTextCell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: predikatLabel,
                  bold: computed.statusNilai === 'lengkap',
                  size: 14,
                  color: computed.statusNilai === 'lengkap' ? '0F172A' : '64748B',
                }),
              ],
            }),
          ],
          wPred,
          { fill: rowFill }
        ),
      ],
    });
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [new TextRun({ text: 'Keterangan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP Terpadu):', bold: true, size: 16 })],
    }),
    new Paragraph({ children: [new TextRun({ text: '• 86 - 100 : Sangat Baik   • 71 - 85 : Baik   • 61 - 70 : Cukup   • 0 - 60 : Perlu Bimbingan', size: 15, color: '334155' })] }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: '• Tanda "-" menandakan nilai belum diinput dan berbeda dengan nilai angka 0.',
          size: 15,
          italics: true,
          color: '64748B',
        }),
      ],
    })
  );

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  return children;
}

export async function exportDaftarNilaiToDocx(
  profile: SchoolProfile,
  data: KelasHarianData,
  tpList: CustomTPItem[]
): Promise<void> {
  const children = buildDaftarNilaiElements(profile, data, tpList);
  const doc = createStyledDocxDocument(profile, 'Daftar Nilai Siswa', children, {
    landscape: true,
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Daftar_Nilai_${data.mataPelajaran}_Kelas_${data.rombel}.docx`);
}

/**
 * 4. BUILDER REKAP DESKRIPSI E-RAPOR
 */
export function buildRekapRaporElements(
  profile: SchoolProfile,
  data: KelasHarianData,
  tpList: CustomTPItem[]
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const rombel = data.rombel || profile.rombelAktif;
  const mapel = data.mataPelajaran || profile.mataPelajaranUtama;
  const activeBobot = normalizeBobotKebijakan(data.bobotNilai);
  const kktpMin = activeBobot.kktpMinTuntas ?? 71;

  children.push(
    ...buildKopAndTitle(
      profile,
      'REKAPITULASI CAPAIAN KOMPETENSI (e-RAPOR)',
      `Mata Pelajaran: ${mapel} | Kelas / Rombel: ${rombel} | Semester: ${data.semester} | TA: ${data.tahunAjaran}`,
      data
    )
  );

  const siswaMap = new Map(data.daftarSiswa.map((s) => [s.id, s]));
  const summaries = data.daftarNilai.map((item) => ({
    item,
    summary: computeERaporStudentSummary(
      siswaMap.get(item.siswaId),
      item,
      data.daftarPresensi,
      tpList,
      data.bobotNilai
    ),
  }));

  const finalCount = summaries.filter((s) => s.summary.statusRapor === 'final').length;
  const siapCount = summaries.filter((s) => s.summary.statusRapor === 'siap_diperiksa').length;
  const drafCount = summaries.filter((s) => s.summary.statusRapor === 'draf').length;
  const incompleteCount = summaries.filter((s) => s.summary.statusRapor === 'belum_lengkap').length;

  children.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `Status Kesiapan e-Rapor (${summaries.length} siswa): Final ${finalCount} · Siap Diperiksa ${siapCount} · Draf ${drafCount} · Belum Lengkap ${incompleteCount}`,
          size: 16,
          color: '334155',
        }),
      ],
    })
  );

  const wNo = 4;
  const wNis = 11;
  const wNama = 17;
  const wNA = 7;
  const wPred = 11;
  const wAbs = 9;
  const wDesc = 41;

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      makeHeaderCell('No', wNo, { fontSize: 15 }),
      makeHeaderCell('NIS / NISN', wNis, { fontSize: 15 }),
      makeHeaderCell('Nama Peserta Didik', wNama, { fontSize: 15 }),
      makeHeaderCell('N. Akhir', wNA, { fontSize: 15 }),
      makeHeaderCell('Predikat & Status', wPred, { fontSize: 15 }),
      makeHeaderCell('H / S / I / A', wAbs, { fill: '0F766E', fontSize: 14 }),
      makeHeaderCell('Deskripsi Capaian Kompetensi & Catatan Guru', wDesc, { fontSize: 15 }),
    ],
  });

  const dataRows = summaries.map(({ item, summary }, idx) => {
    const rowFill = idx % 2 === 1 ? 'F8FAFC' : undefined;
    const naText = summary.nilaiAkhir !== null ? String(summary.nilaiAkhir) : '-';
    const naColor =
      summary.nilaiAkhir === null
        ? '64748B'
        : summary.nilaiAkhir >= kktpMin
        ? '15803D'
        : 'D97706';
    const predText =
      summary.statusNilai === 'lengkap' ? summary.predikatKKTP : 'Belum Lengkap';
    const statusLabel = STATUS_RAPOR_LABELS[summary.statusRapor];

    const descParagraphs: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: item.deskripsiRapor || summary.deskripsiRapor || '-',
            size: 15,
          }),
        ],
      }),
    ];
    if (item.catatanGuru && item.catatanGuru.trim()) {
      descParagraphs.push(
        new Paragraph({
          spacing: { before: 40 },
          children: [
            new TextRun({ text: 'Catatan Guru: ', bold: true, size: 14, color: '1E3A8A' }),
            new TextRun({ text: item.catatanGuru.trim(), italics: true, size: 14, color: '334155' }),
          ],
        })
      );
    }

    return new TableRow({
      cantSplit: true,
      children: [
        makeTextCell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 15 })] })],
          wNo,
          { fill: rowFill }
        ),
        makeTextCell(
          [
            new Paragraph({ children: [new TextRun({ text: summary.nis || '-', size: 14 })] }),
            ...(summary.nisn
              ? [new Paragraph({ children: [new TextRun({ text: summary.nisn, size: 12, color: '64748B' })] })]
              : []),
          ],
          wNis,
          { fill: rowFill }
        ),
        makeTextCell(
          [new Paragraph({ children: [new TextRun({ text: summary.nama, bold: true, size: 15 })] })],
          wNama,
          { fill: rowFill }
        ),
        makeTextCell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: naText, bold: true, size: 15, color: naColor })],
            }),
          ],
          wNA,
          { fill: rowFill }
        ),
        makeTextCell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: predText, bold: true, size: 14 })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `[${statusLabel}]`, size: 13, color: summary.statusRapor === 'final' ? '047857' : '475569' })],
            }),
          ],
          wPred,
          { fill: rowFill }
        ),
        makeTextCell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${summary.kehadiran.hadir}/${summary.kehadiran.sakit}/${summary.kehadiran.izin}/${summary.kehadiran.alfa}`,
                  size: 14,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `(${summary.kehadiran.persentaseHadir}%)`,
                  size: 13,
                  color: '0F766E',
                }),
              ],
            }),
          ],
          wAbs,
          { fill: rowFill }
        ),
        makeTextCell(descParagraphs, wDesc, { fill: rowFill }),
      ],
    });
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    })
  );

  if (profile.tampilkanTandaTangan) {
    children.push(new Paragraph({ spacing: { after: 140 } }));
    children.push(buildSignatureBlockTable(profile, profile.namaGuru));
  }

  return children;
}

export async function exportRekapRaporToDocx(
  profile: SchoolProfile,
  data: KelasHarianData,
  tpList: CustomTPItem[]
): Promise<void> {
  const children = buildRekapRaporElements(profile, data, tpList);
  const doc = createStyledDocxDocument(profile, 'Rekap Deskripsi e-Rapor', children, {
    landscape: true,
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Rekap_eRapor_${data.mataPelajaran}_Kelas_${data.rombel}.docx`);
}
