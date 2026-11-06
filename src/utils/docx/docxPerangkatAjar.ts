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
} from 'docx';
import saveAs from 'file-saver';
import type {
  ModulAjarDokumen,
  LKPDDokumen,
  ATPDokumen,
  ProtaDokumen,
  ProtaItem,
  PromesDokumen,
} from '../../types/perangkatAjar';
import { getSchoolProfile } from '../schoolProfileStorage';
import type { SchoolProfile } from '../schoolProfileStorage';
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
export async function exportLKPDToDocx(lkpd: LKPDDokumen, userProfile?: SchoolProfile): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

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
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: 'LEMBAR KERJA PESERTA DIDIK (LKPD)', bold: true, size: 26, color: '0D9488', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: lkpd.materiPokok.toUpperCase(), bold: true, size: 22, font: 'Calibri' })],
    })
  );

  // Tabel Identitas Kelompok
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran : ${lkpd.mataPelajaran}`, bold: true, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Kelas / Rombel : Kelas ${lkpd.kelas} (${profile.rombelAktif || lkpd.rombel})`, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Alokasi Waktu : ${lkpd.alokasiWaktu}`, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Tujuan Belajar : ${lkpd.tujuanPembelajaran}`, size: 18 })] }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Kelompok : ...................................', bold: true, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Anggota  :', bold: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: '1. .................................................', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: '2. .................................................', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: '3. .................................................', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: '4. .................................................', size: 18 })] }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

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
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: `I. STIMULUS KASUS: ${lkpd.stimulusKasus.judul}`, bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 80, after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: lkpd.stimulusKasus.teks, italics: true, size: 19 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Tantangan Awal: ${lkpd.stimulusKasus.pertanyaanAwal}`, bold: true, size: 19, color: 'B45309' })],
      spacing: { after: 120 },
    })
  );

  // Langkah Aktivitas
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: 'II. LANGKAH KERJA EKSPLORASI KELOMPOK', bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 80, after: 60 },
    })
  );
  lkpd.langkahAktivitas.forEach((act) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Langkah ${act.langkahKe}: ${act.instruksi}`, bold: true, size: 19 })],
        spacing: { before: 40, after: 30 },
      })
    );
    if (act.bantuanAtauTabel) {
      act.bantuanAtauTabel.forEach((b) => {
        children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: b, size: 18, color: '555555' })], spacing: { after: 20 } }));
      });
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Ruang Kerja / Catatan Diskusi Kelompok:\n..........................................................................................................................................................................................................................................................................................................................................................................................', color: '888888', size: 18 })],
          spacing: { after: 60 },
        })
      );
    }
  });

  // Pertanyaan Diskusi Kritis
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: 'III. PERTANYAAN DISKUSI KRITIS & ANALISIS', bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 100, after: 60 },
    })
  );
  lkpd.pertanyaanAnalisis.forEach((pa) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${pa.nomor}. ${pa.pertanyaan}`, bold: true, size: 19 })],
        spacing: { before: 40, after: 20 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Jawaban Kelompok:\n..........................................................................................................................................................................................................................................................................................................................................................................................', color: '888888', size: 18 })],
        spacing: { after: 60 },
      })
    );
  });

  // Kesimpulan & Refleksi Siswa
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: 'IV. KESIMPULAN & REFLEKSI MANDIRI', bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 100, after: 40 },
    })
  );
  lkpd.kesimpulanRefleksi.forEach((kr) => {
    children.push(new Paragraph({ children: [new TextRun({ text: kr, size: 18 })], spacing: { after: 40 } }));
  });

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const cleanFilename = `LKPD_${lkpd.materiPokok.replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Siswa'}`;
  saveAs(blob, `${cleanFilename}.docx`);
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
