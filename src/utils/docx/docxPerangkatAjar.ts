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
  PageBreak,
} from 'docx';
import saveAs from 'file-saver';
import type {
  ModulAjarDokumen,
  LKPDDokumen,
  LKPDPresetType,
  ATPDokumen,
  ProtaDokumen,
  ProtaItem,
  PromesDokumen,
} from '../../types/perangkatAjar';
import { getSchoolProfile } from '../schoolProfileStorage';
import type { SchoolProfile } from '../schoolProfileStorage';
import { cleanTopicHeading } from '../lkpdSubjectBlueprints';
import { buildSignatureBlockTable } from './docxShared';

/**
 * Ekspor Modul Ajar (RPP Kurikulum Merdeka) ke Microsoft Word (.docx)
 */
export async function exportModulAjarToDocx(modul: ModulAjarDokumen, userProfile?: SchoolProfile): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  // Kop Sekolah
  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [new TextRun({ text: profile.instansiDinas.toUpperCase(), bold: true, size: 20, color: '475569', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: (modul.namaSekolah || profile.namaSekolah).toUpperCase(), bold: true, size: 26, font: 'Calibri' })],
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

  // Judul Dokumen
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'MODUL AJAR KURIKULUM MERDEKA', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [new TextRun({ text: `TAHUN AJARAN ${modul.tahunAjaran || profile.tahunAjaran} • SEMESTER ${modul.semester.toUpperCase()}`, size: 20, color: '555555', font: 'Calibri' })],
    })
  );

  // Bagian I: Informasi Umum
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 100, after: 80 },
      children: [new TextRun({ text: 'I. INFORMASI UMUM', bold: true, size: 22, color: '1E3A8A' })],
    })
  );

  const infoRows = [
    ['Satuan Pendidikan', modul.namaSekolah || profile.namaSekolah],
    ['Penyusun / Guru', modul.namaGuru || profile.namaGuru],
    ['Mata Pelajaran', modul.mataPelajaran],
    ['Fase / Kelas / Semester', `${modul.jenjangFase} / Kelas ${modul.kelas} (${profile.rombelAktif || modul.rombel}) / ${modul.semester}`],
    ['Elemen Capaian', modul.elemen],
    ['Alokasi Waktu', modul.alokasiWaktu],
    ['Target Peserta Didik', modul.targetPesertaDidik],
    ['Model Pembelajaran', modul.modelPembelajaran],
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows.map(
        ([label, val]) =>
          new TableRow({
            children: [
              new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 19 })] })] }),
              new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: val, size: 19 })] })] }),
            ],
          })
      ),
    }),
    new Paragraph({ spacing: { after: 100 } })
  );

  // Profil Pelajar Pancasila
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'Profil Pelajar Pancasila yang Dikembangkan:', bold: true, size: 20 })], spacing: { before: 60, after: 30 } })
  );
  modul.profilPelajarPancasila.forEach((p) => {
    children.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 20 }, children: [new TextRun({ text: `• ${p}`, size: 19 })] }));
  });

  // Sarana & Prasarana
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'Sarana dan Prasarana Pembelajaran:', bold: true, size: 20 })], spacing: { before: 60, after: 30 } })
  );
  modul.saranaPrasarana.forEach((s) => {
    children.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 20 }, children: [new TextRun({ text: `• ${s}`, size: 19 })] }));
  });

  // Bagian II: Komponen Inti
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 140, after: 80 },
      children: [new TextRun({ text: 'II. KOMPONEN INTI PEMBELAJARAN', bold: true, size: 22, color: '1E3A8A' })],
    }),
    new Paragraph({ children: [new TextRun({ text: `A. Tujuan Pembelajaran (TP ${modul.tpKode}):`, bold: true, size: 20 })], spacing: { after: 30 } }),
    new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: modul.tujuanPembelajaran, size: 19 })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: 'B. Pemahaman Bermakna:', bold: true, size: 20 })], spacing: { after: 30 } }),
    new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: modul.pemahamanBermakna, size: 19, italics: true })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: 'C. Pertanyaan Pemantik:', bold: true, size: 20 })], spacing: { after: 30 } })
  );
  modul.pertanyaanPemantik.forEach((q, idx) => {
    children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: `${idx + 1}. ${q}`, size: 19 })], spacing: { after: 30 } }));
  });

  // Langkah Kegiatan Pembelajaran Rinci
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'D. Langkah-Langkah Kegiatan Pembelajaran:', bold: true, size: 20 })], spacing: { before: 80, after: 60 } })
  );
  modul.kegiatanPembelajaran.forEach((keg) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Pertemuan Ke-${keg.pertemuan} (${keg.alokasiMenit} Menit)`, bold: true, size: 20, color: '0D9488' })],
        spacing: { before: 60, after: 40 },
      }),
      new Paragraph({ children: [new TextRun({ text: '1. Kegiatan Pendahuluan:', bold: true, size: 19 })], indent: { left: 240 }, spacing: { after: 20 } })
    );
    keg.pendahuluan.forEach((p) => {
      children.push(new Paragraph({ indent: { left: 480 }, children: [new TextRun({ text: `• ${p}`, size: 18 })], spacing: { after: 20 } }));
    });

    children.push(new Paragraph({ children: [new TextRun({ text: '2. Kegiatan Inti (Sintaks PBL/Discovery):', bold: true, size: 19 })], indent: { left: 240 }, spacing: { before: 40, after: 20 } }));
    keg.inti.forEach((it) => {
      children.push(new Paragraph({ indent: { left: 480 }, children: [new TextRun({ text: `• ${it}`, size: 18 })], spacing: { after: 20 } }));
    });

    children.push(new Paragraph({ children: [new TextRun({ text: '3. Kegiatan Penutup & Refleksi:', bold: true, size: 19 })], indent: { left: 240 }, spacing: { before: 40, after: 20 } }));
    keg.penutup.forEach((pn) => {
      children.push(new Paragraph({ indent: { left: 480 }, children: [new TextRun({ text: `• ${pn}`, size: 18 })], spacing: { after: 20 } }));
    });
  });

  // Asesmen & Rubrik
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 140, after: 80 },
      children: [new TextRun({ text: 'III. ASESMEN & KRITERIA KETERCAPAIAN (KKTP)', bold: true, size: 22, color: '1E3A8A' })],
    }),
    new Paragraph({ children: [new TextRun({ text: `• Asesmen Diagnostik: `, bold: true, size: 19 }), new TextRun({ text: modul.asesmen.diagnostik, size: 19 })], spacing: { after: 30 } }),
    new Paragraph({ children: [new TextRun({ text: `• Asesmen Formatif: `, bold: true, size: 19 }), new TextRun({ text: modul.asesmen.formatif, size: 19 })], spacing: { after: 30 } }),
    new Paragraph({ children: [new TextRun({ text: `• Asesmen Sumatif: `, bold: true, size: 19 }), new TextRun({ text: modul.asesmen.sumatif, size: 19 })], spacing: { after: 80 } })
  );

  // Rubrik Singkat
  if (modul.rubrikPenilaianSingkat && modul.rubrikPenilaianSingkat.length > 0) {
    const rubRows = [
      new TableRow({
        children: ['Kriteria Penilaian', 'Baru Berkembang (0-60)', 'Layak (61-70)', 'Cakap (71-85)', 'Mahir (86-100)'].map(
          (h) => new TableCell({ shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17 })] })] })
        ),
      }),
    ];
    modul.rubrikPenilaianSingkat.forEach((r) => {
      rubRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.kriteria, bold: true, size: 17 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.baruBerkembang, size: 17 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.layak, size: 17 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.cakap, size: 17 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.mahir, size: 17 })] })] }),
          ],
        })
      );
    });
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rubRows }), new Paragraph({ spacing: { after: 120 } }));
  }

  // Bagian IV: Lampiran, Glosarium & Daftar Pustaka
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 140, after: 80 },
      children: [new TextRun({ text: 'IV. LAMPIRAN & REFERENSI', bold: true, size: 22, color: '1E3A8A' })],
    }),
    new Paragraph({ children: [new TextRun({ text: 'A. Pengayaan & Remedial:', bold: true, size: 20 })], spacing: { after: 30 } }),
    new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• Pengayaan: ${modul.pengayaanDanRemedial.pengayaan}`, size: 18 })], spacing: { after: 20 } }),
    new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• Remedial: ${modul.pengayaanDanRemedial.remedial}`, size: 18 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: 'B. Glosarium:', bold: true, size: 20 })], spacing: { after: 30 } })
  );
  modul.glosarium.forEach((g) => {
    children.push(new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• ${g.istilah}: `, bold: true, size: 18 }), new TextRun({ text: g.definisi, size: 18 })], spacing: { after: 20 } }));
  });

  children.push(new Paragraph({ children: [new TextRun({ text: 'C. Daftar Pustaka:', bold: true, size: 20 })], spacing: { before: 60, after: 30 } }));
  modul.daftarPustaka.forEach((dp) => {
    children.push(new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• ${dp}`, size: 18 })], spacing: { after: 20 } }));
  });

  if (profile.tampilkanTandaTangan) {
    children.push(new Paragraph({ spacing: { after: 200 } }), buildSignatureBlockTable(profile, modul.namaGuru));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const cleanFilename = `Modul_Ajar_${modul.materiPokok.replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Kurikulum_Merdeka'}`;
  saveAs(blob, `${cleanFilename}.docx`);
}

/**
 * Ekspor Lembar Kerja Peserta Didik (LKPD) ke Microsoft Word (.docx)
 */
export async function exportLKPDToDocx(
  lkpd: LKPDDokumen,
  userProfile?: SchoolProfile,
  isTeacherMode?: boolean
): Promise<Blob> {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];
  const presetType: LKPDPresetType =
    lkpd.presetType ||
    (lkpd.eksperimenData
      ? 'eksperimen'
      : lkpd.diferensiasiData
      ? 'diferensiasi'
      : lkpd.proyekData
      ? 'proyek'
      : 'kasus');

  const cleanBorder = { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' };
  const cellBorders = { top: cleanBorder, bottom: cleanBorder, left: cleanBorder, right: cleanBorder };
  const cellPadding = { top: 80, bottom: 80, left: 120, right: 120 };

  // Kop Sekolah
  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: profile.instansiDinas.toUpperCase(), bold: true, size: 20, color: '475569', font: 'Calibri' })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: (lkpd.namaSekolah || profile.namaSekolah).toUpperCase(), bold: true, size: 24, font: 'Calibri' })],
    })
  );

  // Header LKPD
  const headerRuns: TextRun[] = [
    new TextRun({ text: 'LEMBAR KERJA PESERTA DIDIK (LKPD)', bold: true, size: 26, color: '0D9488', font: 'Calibri' }),
  ];
  if (isTeacherMode) {
    headerRuns.push(
      new TextRun({ text: '  [EDISI PEGANGAN GURU / KUNCI JAWABAN]', bold: true, size: 18, color: 'DC2626', font: 'Calibri' })
    );
  }

  const cleanTopic = cleanTopicHeading(lkpd.judul || lkpd.materiPokok).toUpperCase();

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: headerRuns,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: lkpd.pendekatanKegiatan ? 30 : 120 },
      children: [new TextRun({ text: cleanTopic, bold: true, size: 22, font: 'Calibri' })],
    })
  );

  if (lkpd.pendekatanKegiatan || lkpd.elemen) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: [lkpd.pendekatanKegiatan, lkpd.elemen ? `Elemen: ${lkpd.elemen}` : '']
              .filter(Boolean)
              .join('  •  '),
            italics: true,
            size: 18,
            color: '475569',
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  const identityRightChildren: Paragraph[] =
    lkpd.modeKerja === 'Individu'
      ? [
          new Paragraph({ children: [new TextRun({ text: 'Nama Siswa  : ..........................................', bold: true, size: 19 })] }),
          new Paragraph({ children: [new TextRun({ text: 'No. Absen   : ..........................................', size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: 'Tanggal     : ..........................................', size: 18 })] }),
        ]
      : lkpd.modeKerja === 'Berpasangan'
      ? [
          new Paragraph({ children: [new TextRun({ text: 'Mode Kerja : Berpasangan (2 Siswa)', bold: true, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: '1. .................................................', size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: '2. .................................................', size: 18 })] }),
        ]
      : [
          new Paragraph({ children: [new TextRun({ text: 'Kelompok : ...................................', bold: true, size: 19 })] }),
          new Paragraph({ children: [new TextRun({ text: 'Anggota  :', bold: true, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: '1. .................................................', size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: '2. .................................................', size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: '3. .................................................', size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: '4. .................................................', size: 18 })] }),
        ];

  // Tabel Identitas Siswa / Kelompok
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              margins: cellPadding,
              children: [
                new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran : ${lkpd.mataPelajaran}`, bold: true, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Kelas / Rombel : Kelas ${lkpd.kelas} (${profile.rombelAktif || lkpd.rombel})`, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Alokasi Waktu  : ${lkpd.alokasiWaktu}`, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Tujuan Belajar : ${lkpd.tujuanPembelajaran}`, size: 18 })] }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              margins: cellPadding,
              children: identityRightChildren,
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 100 } })
  );

  // Sasaran Belajar & Prasyarat (Bila Ada)
  if (lkpd.targetBelajarSiswa?.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'SASARAN BELAJAR SESI INI:', bold: true, size: 19, color: '0F172A' })],
        spacing: { after: 30 },
      })
    );
    lkpd.targetBelajarSiswa.forEach((tb) => {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          children: [new TextRun({ text: `• ${tb}`, size: 18 })],
          spacing: { after: 20 },
        })
      );
    });
  }

  if (lkpd.prasyaratMateri?.length) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Prasyarat Pengetahuan: ', bold: true, size: 18, color: '334155' }),
          new TextRun({ text: lkpd.prasyaratMateri.join('; '), size: 18, color: '475569' }),
        ],
        spacing: { before: 20, after: 80 },
      })
    );
  }

  // Petunjuk
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: 'PETUNJUK PENGERJAAN:', bold: true, size: 20 })],
      spacing: { after: 40 },
    })
  );
  lkpd.petunjukPengerjaan.forEach((pt, i) => {
    children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${pt}`, size: 19 })], spacing: { after: 20 } }));
  });

  // Stimulus Kasus
  const stimulusHeading =
    presetType === 'eksperimen'
      ? `I. STIMULUS & FENOMENA: ${lkpd.stimulusKasus.judul}`
      : presetType === 'proyek'
      ? `I. TANTANGAN DESAIN PROYEK: ${lkpd.stimulusKasus.judul}`
      : `I. STIMULUS KASUS: ${lkpd.stimulusKasus.judul}`;

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: stimulusHeading, bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 80, after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: lkpd.stimulusKasus.teks, size: 19 })],
      spacing: { after: 40 },
    })
  );

  // Tabel Data Terstruktur Stimulus & Poin Kunci
  if (lkpd.stimulusData?.tabelData && lkpd.stimulusData.tabelData.kolom.length > 0) {
    const stimCols = lkpd.stimulusData.tabelData.kolom;
    const widthPct = Math.floor(100 / Math.max(1, stimCols.length));
    const stimHeader = new TableRow({
      children: stimCols.map(
        (col) =>
          new TableCell({
            width: { size: widthPct, type: WidthType.PERCENTAGE },
            shading: { fill: 'E2E8F0' },
            borders: cellBorders,
            margins: cellPadding,
            children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, size: 18, color: '0F172A' })] })],
          })
      ),
    });
    const stimRows = lkpd.stimulusData.tabelData.baris.map(
      (row) =>
        new TableRow({
          children: stimCols.map((_, ci) =>
            new TableCell({
              width: { size: widthPct, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              margins: cellPadding,
              children: [new Paragraph({ children: [new TextRun({ text: row[ci] || '', size: 18 })] })],
            })
          ),
        })
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [stimHeader, ...stimRows],
      }),
      new Paragraph({ spacing: { after: 60 } })
    );
  }

  if (lkpd.stimulusData?.poinKunci?.length) {
    lkpd.stimulusData.poinKunci.forEach((pk) => {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          children: [new TextRun({ text: `• ${pk}`, size: 18, color: '1E293B' })],
          spacing: { after: 20 },
        })
      );
    });
  }

  if (lkpd.stimulusData?.catatanAsumsi) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Catatan/Asumsi: ${lkpd.stimulusData.catatanAsumsi}`, italics: true, size: 18, color: '475569' })],
        spacing: { after: 40 },
      })
    );
  }

  if (lkpd.stimulusKasus.pertanyaanAwal) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Tantangan Awal: ${lkpd.stimulusKasus.pertanyaanAwal}`, bold: true, size: 19, color: 'B45309' })],
        spacing: { after: 120 },
      })
    );
  }

  // MODUL KHUSUS ARCHETYPE:
  // ARCHETYPE 2: EKSPERIMEN
  if (presetType === 'eksperimen' && lkpd.eksperimenData) {
    const exp = lkpd.eksperimenData;

    // Alat & Bahan
    if (exp.alatDanBahan && exp.alatDanBahan.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: 'ALAT DAN BAHAN PRAKTIKUM', bold: true, size: 20, color: '0284C7' })],
          spacing: { before: 80, after: 30 },
        })
      );
      exp.alatDanBahan.forEach((item) => {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            children: [new TextRun({ text: `• ${item}`, size: 19 })],
            spacing: { after: 20 },
          })
        );
      });
    }

    if (exp.keselamatanKerja && exp.keselamatanKerja.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: 'KESELAMATAN & KETERTIBAN KERJA', bold: true, size: 19, color: 'C2410C' })],
          spacing: { before: 60, after: 20 },
        })
      );
      exp.keselamatanKerja.forEach((kk) => {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            children: [new TextRun({ text: `! ${kk}`, size: 18, color: '9A3412' })],
            spacing: { after: 20 },
          })
        );
      });
    }

    // Hipotesis Awal Box
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'HIPOTESIS AWAL (DUGAAN SEMENTARA KELOMPOK)', bold: true, size: 20, color: '0284C7' })],
        spacing: { before: 80, after: 40 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                margins: cellPadding,
                shading: { fill: 'F8FAFC' },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Rumusan Hipotesis:\n', bold: true, size: 18, color: '0369A1' }),
                      new TextRun({
                        text: exp.hipotesisAwal || '(Tuliskan rumusan hipotesis pengujian kelompok di sini...)',
                        italics: !exp.hipotesisAwal,
                        size: 19,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 80 } })
    );

    // Tabel Observasi & Pengumpulan Data
    if (exp.tabelObservasi && exp.tabelObservasi.kolom?.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: 'TABEL OBSERVASI & PENGUMPULAN DATA', bold: true, size: 20, color: '0284C7' })],
          spacing: { before: 80, after: 40 },
        })
      );

      const colCount = exp.tabelObservasi.kolom.length;
      const isFirstNo = exp.tabelObservasi.kolom[0]?.toLowerCase() === 'no';
      const colWidth = colCount > 1 ? Math.floor(92 / (colCount - 1)) : 100;
      const colWidths = exp.tabelObservasi.kolom.map((_, idx) => {
        if (isFirstNo) {
          return colCount > 1 ? (idx === 0 ? 8 : colWidth) : 100;
        }
        return colCount > 0 ? Math.floor(100 / colCount) : 100;
      });

      const obsHeaderRow = new TableRow({
        children: exp.tabelObservasi.kolom.map(
          (col, idx) =>
            new TableCell({
              width: { size: colWidths[idx], type: WidthType.PERCENTAGE },
              shading: { fill: 'F1F5F9' },
              borders: cellBorders,
              margins: cellPadding,
              children: [
                new Paragraph({
                  alignment: idx === 0 && isFirstNo ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: [new TextRun({ text: col, bold: true, size: 18, color: '0F172A' })],
                }),
              ],
            })
        ),
      });

      const obsDataRows = (exp.tabelObservasi.baris || []).map(
        (row) =>
          new TableRow({
            children: exp.tabelObservasi.kolom.map((_, idx) => {
              const val = row[idx] || '';
              return new TableCell({
                width: { size: colWidths[idx], type: WidthType.PERCENTAGE },
                borders: cellBorders,
                margins: cellPadding,
                children: [
                  new Paragraph({
                    alignment: idx === 0 && isFirstNo ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: [new TextRun({ text: val, size: 18 })],
                  }),
                ],
              });
            }),
          })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [obsHeaderRow, ...obsDataRows],
        }),
        new Paragraph({ spacing: { after: 100 } })
      );
    }
  }

  // ARCHETYPE 3: DIFERENSIASI
  if (presetType === 'diferensiasi' && lkpd.diferensiasiData) {
    const dif = lkpd.diferensiasiData;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'TUGAS BERDIFERENSIASI (PILIHAN JALUR KESIAPAN BELAJAR)', bold: true, size: 21, color: '0D9488' })],
        spacing: { before: 100, after: 60 },
      })
    );

    const tiers = [
      {
        badge: 'JALUR FONDASI (Tingkat Dasar)',
        fill: 'F0FDF4',
        borderCol: 'BBF7D0',
        textCol: '166534',
        data: dif.tingkatDasar,
      },
      {
        badge: 'JALUR PENERAPAN (Tingkat Menengah)',
        fill: 'F0F9FF',
        borderCol: 'BAE6FD',
        textCol: '0369A1',
        data: dif.tingkatMenengah,
      },
      {
        badge: 'JALUR KREASI & SOLUSI (Tingkat Mahir)',
        fill: 'FAF5FF',
        borderCol: 'E9D5FF',
        textCol: '6D28D9',
        data: dif.tingkatMahir,
      },
    ];

    tiers.forEach((tier) => {
      if (!tier.data) return;
      const tierBorder = { style: BorderStyle.SINGLE, size: 8, color: tier.borderCol };
      const tierBorders = { top: tierBorder, bottom: tierBorder, left: tierBorder, right: tierBorder };

      const taskParagraphs: Paragraph[] = [
        new Paragraph({
          children: [new TextRun({ text: tier.badge, bold: true, size: 19, color: tier.textCol })],
          spacing: { after: 30 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Instruksi Khusus: ', bold: true, size: 18 }),
            new TextRun({ text: tier.data?.instruksi || '', italics: true, size: 18 }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Daftar Tugas Jalur:', bold: true, size: 18 })],
          spacing: { after: 20 },
        }),
      ];

      (tier.data?.tugas || []).forEach((t, tidx) => {
        taskParagraphs.push(
          new Paragraph({
            indent: { left: 240 },
            children: [new TextRun({ text: `${tidx + 1}. ${t}`, size: 18 })],
            spacing: { after: 20 },
          })
        );
      });

      taskParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Lembar Jawaban / Catatan Pengerjaan:\n........................................................................................................................................................................................................................................................................................................',
              color: '94A3B8',
              size: 17,
            }),
          ],
          spacing: { before: 40, after: 20 },
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: tierBorders,
                  margins: cellPadding,
                  shading: { fill: tier.fill },
                  children: taskParagraphs,
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ spacing: { after: 80 } })
      );
    });
  }

  // ARCHETYPE 4: PROYEK
  if (presetType === 'proyek' && lkpd.proyekData) {
    const pro = lkpd.proyekData;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'RENCANA PROYEK KOLABORATIF TIM', bold: true, size: 21, color: '0D9488' })],
        spacing: { before: 100, after: 60 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                margins: cellPadding,
                shading: { fill: 'F8FAFC' },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Tujuan Produk Akhir: ', bold: true, size: 18, color: '0D9488' }),
                      new TextRun({ text: pro.tujuanProyek, size: 18 }),
                    ],
                    spacing: { after: 30 },
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Tahapan & Alokasi Waktu: ', bold: true, size: 18, color: '0D9488' }),
                      new TextRun({ text: pro.tahapanWaktu, size: 18 }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 80 } })
    );

    // Tabel Pembagian Peran Anggota Tim
    if (pro.peranAnggota && pro.peranAnggota.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: 'STRUKTUR & PERAN ANGGOTA TIM', bold: true, size: 20, color: '0D9488' })],
          spacing: { before: 80, after: 40 },
        })
      );

      const peranHeaderRow = new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            borders: cellBorders,
            margins: cellPadding,
            children: [new Paragraph({ children: [new TextRun({ text: 'Peran Tim', bold: true, size: 18, color: '0F172A' })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            borders: cellBorders,
            margins: cellPadding,
            children: [new Paragraph({ children: [new TextRun({ text: 'Tanggung Jawab Spesifik', bold: true, size: 18, color: '0F172A' })] })],
          }),
        ],
      });

      const peranRows = pro.peranAnggota.map(
        (pa) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: pa.peran, bold: true, size: 18 })] })],
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: pa.tanggungJawab, size: 18 })] })],
              }),
            ],
          })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [peranHeaderRow, ...peranRows],
        }),
        new Paragraph({ spacing: { after: 100 } })
      );
    }

    // Tabel Rubrik Penilaian Karya Proyek
    if (pro.rubrikKarya && pro.rubrikKarya.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: 'RUBRIK PENILAIAN KARYA PROYEK', bold: true, size: 20, color: '0D9488' })],
          spacing: { before: 80, after: 40 },
        })
      );

      const rubrikHeaderRow = new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            borders: cellBorders,
            margins: cellPadding,
            children: [new Paragraph({ children: [new TextRun({ text: 'Kriteria Penilaian', bold: true, size: 18, color: '0F172A' })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9' },
            borders: cellBorders,
            margins: cellPadding,
            children: [new Paragraph({ children: [new TextRun({ text: 'Deskripsi Kualitas / Standar Skor', bold: true, size: 18, color: '0F172A' })] })],
          }),
        ],
      });

      const rubrikRows = pro.rubrikKarya.map(
        (rk) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: rk.kriteria, bold: true, size: 18 })] })],
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                margins: cellPadding,
                children: [new Paragraph({ children: [new TextRun({ text: rk.deskripsiSkor, size: 18 })] })],
              }),
            ],
          })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [rubrikHeaderRow, ...rubrikRows],
        }),
        new Paragraph({ spacing: { after: 100 } })
      );
    }
  }

  // Langkah Aktivitas
  const langkahHeading =
    presetType === 'eksperimen'
      ? 'III. LANGKAH KERJA PRAKTIKUM'
      : presetType === 'proyek'
      ? 'III. LANGKAH KERJA PENGEMBANGAN PROYEK'
      : 'II. LANGKAH KERJA EKSPLORASI KELOMPOK';

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: langkahHeading, bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 80, after: 60 },
    })
  );

  lkpd.langkahAktivitas.forEach((act) => {
    const actText = act.judulLangkah
      ? `Langkah ${act.langkahKe} (${act.judulLangkah}): ${act.instruksi}`
      : `Langkah ${act.langkahKe}: ${act.instruksi}`;

    children.push(
      new Paragraph({
        children: [new TextRun({ text: actText, bold: true, size: 19 })],
        spacing: { before: 40, after: 30 },
      })
    );
    if (act.bantuanAtauTabel) {
      act.bantuanAtauTabel.forEach((b) => {
        children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: b, size: 18, color: '555555' })], spacing: { after: 20 } }));
      });
      if (act.ruangJawabanJenis === 'perhitungan') {
        children.push(
          new Paragraph({
            indent: { left: 240 },
            children: [
              new TextRun({
                text: 'Ruang Perhitungan:\n................................................................................................................................................\n................................................................................................................................................',
                color: '94A3B8',
                size: 18,
              }),
            ],
            spacing: { before: 30, after: 50 },
          })
        );
      }
    } else {
      const workPrompt =
        act.ruangJawabanJenis === 'perhitungan'
          ? 'Ruang Pemodelan & Perhitungan (tulis permisalan dan langkah hitungan):\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................'
          : act.ruangJawabanJenis === 'langkah_algoritma'
          ? 'Tabel Penelusuran / Alur Proses:\n................................................................................................................................................\n................................................................................................................................................'
          : 'Ruang Kerja / Catatan Siswa:\n................................................................................................................................................\n................................................................................................................................................';
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: workPrompt,
              color: '888888',
              size: 18,
            }),
          ],
          spacing: { after: 60 },
        })
      );
    }
  });

  if (lkpd.pemeriksaanHasil && lkpd.pemeriksaanHasil.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'CEK KEMBALI HASIL KERJAMU:', bold: true, size: 19, color: '0369A1' })],
        spacing: { before: 60, after: 30 },
      })
    );
    lkpd.pemeriksaanHasil.forEach((ph) => {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          children: [new TextRun({ text: `[  ] ${ph}`, size: 18, color: '0C4A6E' })],
          spacing: { after: 20 },
        })
      );
    });
  }

  // Pertanyaan Diskusi Kritis & Analisis
  const pertanyaanHeading =
    presetType === 'eksperimen'
      ? 'IV. PERTANYAAN ANALISIS DATA & PENYELIDIKAN'
      : presetType === 'proyek'
      ? 'IV. PERTANYAAN REFLEKSI & EVALUASI PROYEK'
      : 'III. PERTANYAAN DISKUSI KRITIS & ANALISIS';

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: pertanyaanHeading, bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 100, after: 60 },
    })
  );

  lkpd.pertanyaanAnalisis.forEach((pa) => {
    const cognitiveBadge = pa.tingkatKognitif ? ` [Tingkat: ${pa.tingkatKognitif}]` : '';
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${pa.nomor}. `, bold: true, size: 19 }),
          new TextRun({ text: pa.pertanyaan, bold: true, size: 19 }),
          ...(pa.tingkatKognitif
            ? [new TextRun({ text: cognitiveBadge, italics: true, size: 17, color: '0D9488' })]
            : []),
        ],
        spacing: { before: 40, after: 20 },
      })
    );

    if (pa.petunjukPengerjaan) {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          children: [
            new TextRun({ text: 'Petunjuk: ', bold: true, size: 17, color: '64748B' }),
            new TextRun({ text: pa.petunjukPengerjaan, italics: true, size: 17, color: '64748B' }),
          ],
          spacing: { after: 20 },
        })
      );
    }

    if (isTeacherMode && pa.panduanJawabanSingkat) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 6, color: 'A7F3D0' },
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'A7F3D0' },
                    left: { style: BorderStyle.SINGLE, size: 6, color: 'A7F3D0' },
                    right: { style: BorderStyle.SINGLE, size: 6, color: 'A7F3D0' },
                  },
                  margins: cellPadding,
                  shading: { fill: 'ECFDF5' },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: '💡 Kunci Jawaban / Panduan Guru:\n', bold: true, size: 17, color: '065F46' }),
                        new TextRun({ text: pa.panduanJawabanSingkat, size: 18, color: '064E3B' }),
                        ...(pa.alternatifJawabanValid
                          ? [new TextRun({ text: `\nAlternatif Sah: ${pa.alternatifJawabanValid}`, italics: true, size: 17, color: '047857' })]
                          : []),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ spacing: { after: 40 } })
      );
    } else {
      const answerLines =
        pa.ruangJawabanJenis === 'perhitungan' || pa.ruangJawabanJenis === 'uraian_panjang'
          ? 'Ruang Penyelesaian / Jawaban:\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................\n................................................................................................................................................'
          : 'Ruang Jawaban:\n................................................................................................................................................\n................................................................................................................................................';
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: answerLines,
              color: '888888',
              size: 18,
            }),
          ],
          spacing: { after: 60 },
        })
      );
    }
  });

  // Bantuan Pemula & Pengayaan (Student Safe)
  if (lkpd.dukunganTambahan) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Bantuan Langkah Awal: ', bold: true, size: 18, color: '0F172A' }),
          new TextRun({ text: lkpd.dukunganTambahan, size: 18, color: '334155' }),
        ],
        spacing: { before: 60, after: 40 },
      })
    );
  }
  if (lkpd.pengayaan && lkpd.pengayaan.tugas?.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: lkpd.pengayaan.instruksi || 'Tantangan Pengayaan:', bold: true, size: 18, color: '0F172A' })],
        spacing: { before: 40, after: 20 },
      })
    );
    lkpd.pengayaan.tugas.forEach((tg) => {
      children.push(new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• ${tg}`, size: 18 })], spacing: { after: 20 } }));
    });
  }

  // Kesimpulan & Refleksi Mandiri
  const kesimpulanHeading =
    presetType === 'eksperimen'
      ? 'V. KESIMPULAN & REFLEKSI PRAKTIKUM'
      : presetType === 'proyek'
      ? 'V. KESIMPULAN & REFLEKSI KARYA'
      : 'IV. KESIMPULAN & REFLEKSI MANDIRI';

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: kesimpulanHeading, bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 100, after: 40 },
    })
  );
  lkpd.kesimpulanRefleksi.forEach((kr) => {
    children.push(new Paragraph({ children: [new TextRun({ text: kr, size: 18 })], spacing: { after: 40 } }));
  });

  // Tanda Tangan
  if (profile.tampilkanTandaTangan) {
    children.push(new Paragraph({ spacing: { after: 160 } }), buildSignatureBlockTable(profile, lkpd.namaGuru));
  }

  // LAMPIRAN PANDUAN GURU TERPISAH (HANYA JIKA isTeacherMode === true)
  if (isTeacherMode && lkpd.panduanGuru) {
    const pg = lkpd.panduanGuru;
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'LAMPIRAN PEGANGAN GURU (PANDUAN, KUNCI, MISKONSEPSI & RUBRIK)', bold: true, size: 22, color: '92400E' })],
        spacing: { after: 100 },
      })
    );

    if (pg.kunciDanContohJawaban.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '1. Kunci Jawaban & Langkah Penyelesaian', bold: true, size: 20, color: '0F172A' })],
          spacing: { before: 60, after: 40 },
        })
      );
      pg.kunciDanContohJawaban.forEach((kj) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Butir ${kj.nomor}: ${kj.jawabanInti}`, bold: true, size: 18 })],
            spacing: { before: 30, after: 20 },
          })
        );
        kj.langkahPenyelesaian.forEach((st, idx) => {
          children.push(new Paragraph({ indent: { left: 280 }, children: [new TextRun({ text: `${idx + 1}. ${st}`, size: 18 })], spacing: { after: 15 } }));
        });
        if (kj.alternatifValid) {
          children.push(new Paragraph({ indent: { left: 280 }, children: [new TextRun({ text: `Alternatif Sah: ${kj.alternatifValid}`, italics: true, size: 17, color: '047857' })], spacing: { after: 30 } }));
        }
      });
    }

    if (pg.miskonsepsiUmum.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '2. Miskonsepsi Umum & Cara Menangani', bold: true, size: 20, color: '0F172A' })],
          spacing: { before: 80, after: 40 },
        })
      );
      pg.miskonsepsiUmum.forEach((ms) => {
        children.push(
          new Paragraph({
            indent: { left: 240 },
            children: [
              new TextRun({ text: `• Miskonsepsi: ${ms.miskonsepsi} `, bold: true, size: 18 }),
              new TextRun({ text: `→ Penanganan: ${ms.caraMenangani}`, size: 18 }),
            ],
            spacing: { after: 25 },
          })
        );
      });
    }

    if (pg.pemetaanTP.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '3. Pemetaan Sub-TP ke Tugas & Soal', bold: true, size: 20, color: '0F172A' })],
          spacing: { before: 80, after: 40 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['Sub-TP', 'Kompetensi Target', 'Aktivitas / Soal Terkait'].map(
                (col, ci) =>
                  new TableCell({
                    width: { size: ci === 0 ? 18 : ci === 1 ? 47 : 35, type: WidthType.PERCENTAGE },
                    shading: { fill: 'FEF3C7' },
                    borders: cellBorders,
                    margins: cellPadding,
                    children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, size: 17 })] })],
                  })
              ),
            }),
            ...pg.pemetaanTP.map(
              (mapRow) =>
                new TableRow({
                  children: [mapRow.kodeSubTP, mapRow.kompetensiTarget, mapRow.aktivitasTerkait].map(
                    (val, ci) =>
                      new TableCell({
                        width: { size: ci === 0 ? 18 : ci === 1 ? 47 : 35, type: WidthType.PERCENTAGE },
                        borders: cellBorders,
                        margins: cellPadding,
                        children: [new Paragraph({ children: [new TextRun({ text: val, size: 17 })] })],
                      })
                  ),
                })
            ),
          ],
        })
      );
    }

    if (pg.rubrikPenilaian.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '4. Rubrik Penilaian Berbasis Bukti Kinerja', bold: true, size: 20, color: '0F172A' })],
          spacing: { before: 100, after: 40 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['Aspek', 'Perlu Bimbingan', 'Berkembang', 'Cakap', 'Mahir'].map(
                (col) =>
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: { fill: 'FEF3C7' },
                    borders: cellBorders,
                    margins: cellPadding,
                    children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, size: 17 })] })],
                  })
              ),
            }),
            ...pg.rubrikPenilaian.map(
              (r) =>
                new TableRow({
                  children: [r.aspek, r.perluBimbingan, r.berkembang, r.cakap, r.mahir].map(
                    (val) =>
                      new TableCell({
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        borders: cellBorders,
                        margins: cellPadding,
                        children: [new Paragraph({ children: [new TextRun({ text: val, size: 16 })] })],
                      })
                  ),
                })
            ),
          ],
        })
      );
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const cleanMateri = lkpd.materiPokok.replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Siswa';
  const cleanFilename = isTeacherMode
    ? `Panduan_Guru_LKPD_${cleanMateri}_${lkpd.presetType || 'kasus'}.docx`
    : `LKPD_${cleanMateri}_${lkpd.presetType || 'kasus'}.docx`;
  if (typeof window !== 'undefined') {
    saveAs(blob, cleanFilename);
  } else {
    try {
      saveAs(blob, cleanFilename);
    } catch {
      // non-browser fallback
    }
  }
  return blob;
}

/**
 * Ekspor Alur Tujuan Pembelajaran (ATP) ke Microsoft Word (.docx)
 */
export async function exportATPToDocx(atp: ATPDokumen, userProfile?: SchoolProfile): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  // Kop & Judul ATP
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'ALUR TUJUAN PEMBELAJARAN (ATP)', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: (atp.satuanPendidikan || profile.namaSekolah).toUpperCase(), bold: true, size: 24, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [new TextRun({ text: `MATA PELAJARAN: ${atp.mataPelajaran.toUpperCase()} • KELAS ${atp.kelas} (${atp.jenjangFase}) • TA ${atp.tahunAjaran}`, size: 20, color: '555555', font: 'Calibri' })],
    })
  );

  // Capaian Pembelajaran Fase
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'Capaian Pembelajaran (CP) Fase:', bold: true, size: 20 })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: atp.capaianPembelajaranFase, size: 19, italics: true })], spacing: { after: 120 } })
  );

  // Tabel Matriks ATP
  const headers = ['No', 'Kode TP', 'Elemen', 'Lingkup Materi', 'Tujuan Pembelajaran (TP)', 'JP', 'Profil Pelajar Pancasila', 'Asesmen'];
  const widths = [4, 8, 14, 16, 26, 6, 14, 12];

  const headerRow = new TableRow({
    children: headers.map(
      (h, idx) =>
        new TableCell({
          width: { size: widths[idx], type: WidthType.PERCENTAGE },
          shading: { fill: '1E3A8A' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17 })] })],
        })
    ),
  });

  const dataRows = atp.items.map(
    (it) =>
      new TableRow({
        children: [
          new TableCell({ width: { size: widths[0], type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.no), size: 17 })] })] }),
          new TableCell({ width: { size: widths[1], type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.kodeTP, bold: true, size: 17 })] })] }),
          new TableCell({ width: { size: widths[2], type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: it.elemen, size: 17 })] })] }),
          new TableCell({ width: { size: widths[3], type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: it.lingkupMateri, bold: true, size: 17 })] })] }),
          new TableCell({ width: { size: widths[4], type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: it.tujuanPembelajaran, size: 17 })] })] }),
          new TableCell({ width: { size: widths[5], type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${it.alokasiJP} JP`, size: 17 })] })] }),
          new TableCell({ width: { size: widths[6], type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: it.profilPancasila.join(', '), size: 16 })] })] }),
          new TableCell({ width: { size: widths[7], type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: it.asesmen, size: 16 })] })] }),
        ],
      })
  );

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }), new Paragraph({ spacing: { after: 140 } }));

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, atp.namaGuru));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `ATP_${atp.mataPelajaran}_Kelas_${atp.kelas}.docx`);
}

/**
 * Ekspor Program Tahunan (Prota) ke Microsoft Word (.docx)
 */
export async function exportProtaToDocx(prota: ProtaDokumen, userProfile?: SchoolProfile): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'PROGRAM TAHUNAN (PROTA)', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: (prota.satuanPendidikan || profile.namaSekolah).toUpperCase(), bold: true, size: 24, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [new TextRun({ text: `MATA PELAJARAN: ${prota.mataPelajaran.toUpperCase()} • KELAS ${prota.kelas} • TAHUN AJARAN ${prota.tahunAjaran}`, size: 20, color: '555555', font: 'Calibri' })],
    })
  );

  const renderProtaSemester = (judulSem: string, items: ProtaItem[], totalJP: number) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: judulSem, bold: true, size: 20, color: '0D9488' })],
        spacing: { before: 60, after: 40 },
      })
    );

    const headers = ['No', 'Kode TP', 'Lingkup Materi', 'Tujuan Pembelajaran', 'Alokasi JP', 'Keterangan'];
    const widths = [6, 12, 24, 38, 10, 10];

    const headerRow = new TableRow({
      children: headers.map(
        (h, i) =>
          new TableCell({
            width: { size: widths[i], type: WidthType.PERCENTAGE },
            shading: { fill: '1E3A8A' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17 })] })],
          })
      ),
    });

    const dataRows = items.map(
      (it) =>
        new TableRow({
          children: [
            new TableCell({ width: { size: widths[0], type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.no), size: 17 })] })] }),
            new TableCell({ width: { size: widths[1], type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.kodeTP, bold: true, size: 17 })] })] }),
            new TableCell({ width: { size: widths[2], type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: it.lingkupMateri, bold: true, size: 17 })] })] }),
            new TableCell({ width: { size: widths[3], type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: it.tujuanPembelajaran, size: 17 })] })] }),
            new TableCell({ width: { size: widths[4], type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${it.alokasiJP} JP`, size: 17 })] })] }),
            new TableCell({ width: { size: widths[5], type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.keterangan, size: 16 })] })] }),
          ],
        })
    );

    // Row Total
    dataRows.push(
      new TableRow({
        children: [
          new TableCell({ width: { size: 80, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Total Alokasi Waktu ${judulSem}:`, bold: true, size: 18 })] })] }),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalJP} JP`, bold: true, size: 18 })] })] }),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: '-', size: 16 })] })] }),
        ],
      })
    );

    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }), new Paragraph({ spacing: { after: 100 } }));
  };

  renderProtaSemester('A. Semester 1 (Ganjil)', prota.itemsSemester1, prota.totalJPSemester1);
  renderProtaSemester('B. Semester 2 (Genap)', prota.itemsSemester2, prota.totalJPSemester2);

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 120 },
      children: [new TextRun({ text: `TOTAL ALOKASI WAKTU 1 TAHUN AJARAN: ${prota.totalJPTahunan} JAM PELAJARAN (JP)`, bold: true, size: 21, color: '1D4ED8' })],
    })
  );

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, prota.namaGuru));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Prota_${prota.mataPelajaran}_Kelas_${prota.kelas}.docx`);
}

/**
 * Ekspor Program Semester (Promes Visual) ke Microsoft Word (.docx)
 */
export async function exportPromesToDocx(promes: PromesDokumen, userProfile?: SchoolProfile): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'PROGRAM SEMESTER (PROMES)', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: (promes.satuanPendidikan || profile.namaSekolah).toUpperCase(), bold: true, size: 24, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [new TextRun({ text: `MATA PELAJARAN: ${promes.mataPelajaran.toUpperCase()} • KELAS ${promes.kelas} • SEMESTER ${promes.semester.toUpperCase()} • TA ${promes.tahunAjaran}`, size: 20, color: '555555', font: 'Calibri' })],
    })
  );

  // Tabel Promes
  const headerRow1 = new TableRow({
    children: [
      new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kode', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ children: [new TextRun({ text: 'Materi Pokok & TP', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'JP', bold: true, color: 'FFFFFF', size: 16 })] })] }),
      ...promes.columns.map(
        (col) =>
          new TableCell({
            width: { size: Math.max(2, Math.round(52 / promes.columns.length)), type: WidthType.PERCENTAGE },
            shading: { fill: col.isEfektif ? '1E3A8A' : '475569' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${col.bulanNama.slice(0, 3)} M${col.mingguKe}`, bold: true, color: 'FFFFFF', size: 14 })] })],
          })
      ),
    ],
  });

  const dataRows = promes.rows.map(
    (row) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.no), size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: row.kodeTP, bold: true, size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${row.materiPokok}\n`, bold: true, size: 16 }), new TextRun({ text: row.tujuanPembelajaran, size: 15 })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${row.alokasiJP}`, bold: true, size: 16 })] })] }),
          ...promes.columns.map((col, cIdx) => {
            const jp = row.distribusiJP[cIdx];
            const textVal = jp ? String(jp) : !col.isEfektif ? col.labelKegiatan || 'X' : '';
            return new TableCell({
              shading: { fill: jp ? 'DCFCE7' : !col.isEfektif ? 'F1F5F9' : 'FFFFFF' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: textVal, bold: !!jp, size: 14, color: jp ? '047857' : '64748B' })] })],
            });
          }),
        ],
      })
  );

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow1, ...dataRows] }), new Paragraph({ spacing: { after: 140 } }));

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, promes.namaGuru));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Promes_${promes.mataPelajaran}_Kelas_${promes.kelas}_${promes.semester.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}
