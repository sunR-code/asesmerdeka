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
  TableLayoutType,
  VerticalAlign,
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
import { resolveModulKKTPConfig } from '../modulOperationalContent';
import {
  getReferensiStatusLabel,
  JENIS_REFERENSI_LABELS,
  PROVENANCE_MSG_UNLINKED,
} from '../modulReferensiSumber';
import { buildSignatureBlockTable, createStyledDocxDocument } from './docxShared';

/**
 * Formatter aman untuk daftar Sub-TP pada ekspor DOCX.
 * Mendukung array string legacy, array objek { kode, kompetensi }, maupun nilai kosong/invalid
 * agar tidak pernah menghasilkan "[object Object]".
 */
export function formatTargetSubTPList(targetSubTP: unknown): string {
  if (!Array.isArray(targetSubTP) || targetSubTP.length === 0) {
    return '';
  }

  return targetSubTP
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const kode = typeof obj.kode === 'string' ? obj.kode.trim() : '';
        const kompetensi =
          typeof obj.kompetensi === 'string'
            ? obj.kompetensi.trim()
            : typeof obj.fokusMateri === 'string'
            ? obj.fokusMateri.trim()
            : '';
        if (kode && kompetensi) {
          return `${kode}: ${kompetensi}`;
        }
        return kode || kompetensi;
      }
      return '';
    })
    .filter((entry): entry is string => Boolean(entry))
    .join('; ');
}

/**
 * Ekspor Modul Ajar (RPP Kurikulum Merdeka) ke Microsoft Word (.docx)
 */
export function buildModulAjarElements(modul: ModulAjarDokumen, userProfile?: SchoolProfile): (Paragraph | Table)[] {
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

  const safeProfil = Array.isArray(modul.profilPelajarPancasila) ? modul.profilPelajarPancasila : [];
  const safeSarana = Array.isArray(modul.saranaPrasarana) ? modul.saranaPrasarana : [];
  const safePemantik = Array.isArray(modul.pertanyaanPemantik) ? modul.pertanyaanPemantik : [];
  const safeKegiatan = Array.isArray(modul.kegiatanPembelajaran) ? modul.kegiatanPembelajaran : [];
  const safeGlosarium = Array.isArray(modul.glosarium) ? modul.glosarium : [];
  const safeDaftarPustaka = Array.isArray(modul.daftarPustaka) ? modul.daftarPustaka : [];

  const modelLabelDocx = modul.variasiTeknikModel
    ? `${modul.modelPembelajaran || '-'} (${modul.variasiTeknikModel})`
    : modul.modelPembelajaran || '-';

  const infoRows = [
    ['Satuan Pendidikan', modul.namaSekolah || profile.namaSekolah || '-'],
    ['Penyusun / Guru', modul.namaGuru || profile.namaGuru || '-'],
    ['Mata Pelajaran', modul.mataPelajaran || '-'],
    ['Fase / Kelas / Semester', `${modul.jenjangFase || '-'} / Kelas ${modul.kelas || '-'} (${modul.rombel || profile.rombelAktif || '-'}) / ${modul.semester || '-'}`],
    ['Elemen Capaian', modul.elemen || '-'],
    ['Alokasi Waktu', modul.alokasiWaktu || '-'],
    ['Target Peserta Didik', modul.targetPesertaDidik || '-'],
    ['Model Pembelajaran', modelLabelDocx],
    ...(modul.kompetensiAwal?.length ? [['Kompetensi Awal', modul.kompetensiAwal.join('; ')]] : []),
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

  // Profil Pelajar Pancasila / Profil Lulusan
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'Profil Pelajar Pancasila yang Dikembangkan:', bold: true, size: 20 })], spacing: { before: 60, after: 30 } })
  );
  safeProfil.forEach((p) => {
    children.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 20 }, children: [new TextRun({ text: `• ${p}`, size: 19 })] }));
  });

  // Sarana & Prasarana
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'Sarana dan Prasarana Pembelajaran:', bold: true, size: 20 })], spacing: { before: 60, after: 30 } })
  );
  safeSarana.forEach((s) => {
    children.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 20 }, children: [new TextRun({ text: `• ${s}`, size: 19 })] }));
  });

  // Bagian II: Komponen Inti
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 140, after: 80 },
      children: [new TextRun({ text: 'II. KOMPONEN INTI PEMBELAJARAN', bold: true, size: 22, color: '1E3A8A' })],
    }),
    new Paragraph({ children: [new TextRun({ text: `A. Tujuan Pembelajaran (TP ${modul.tpKode || '-'}):`, bold: true, size: 20 })], spacing: { after: 30 } }),
    new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: modul.tujuanPembelajaran || '-', size: 19 })], spacing: { after: 60 } }),
    ...(() => {
      const formattedSubTP = formatTargetSubTPList(modul.targetSubTP);
      return formattedSubTP
        ? [
            new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: `Indikator / Sub-TP: ${formattedSubTP}`, size: 18, color: '334155' })], spacing: { after: 60 } }),
          ]
        : [];
    })(),
    new Paragraph({ children: [new TextRun({ text: 'B. Pemahaman Bermakna:', bold: true, size: 20 })], spacing: { after: 30 } }),
    new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: modul.pemahamanBermakna || '-', size: 19, italics: true })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: 'C. Pertanyaan Pemantik:', bold: true, size: 20 })], spacing: { after: 30 } })
  );
  safePemantik.forEach((q, idx) => {
    children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: `${idx + 1}. ${q}`, size: 19 })], spacing: { after: 30 } }));
  });

  // Langkah Kegiatan Pembelajaran Rinci (mendukung tahapTerstruktur maupun draf legacy)
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'D. Langkah-Langkah Kegiatan Pembelajaran:', bold: true, size: 20 })], spacing: { before: 80, after: 60 } })
  );
  safeKegiatan.forEach((keg) => {
    const jpText = keg.jpPertemuan ? `${keg.jpPertemuan} JP • ` : '';
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Pertemuan Ke-${keg.pertemuan} (${jpText}${keg.alokasiMenit} Menit)`, bold: true, size: 20, color: '0D9488' })],
        spacing: { before: 60, after: 30 },
      })
    );
    if (keg.fokusPertemuan) {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          spacing: { after: 30 },
          children: [new TextRun({ text: `Fokus Pertemuan: ${keg.fokusPertemuan}`, italics: true, size: 18, color: '475569' })],
        })
      );
    }

    if (Array.isArray(keg.tahapTerstruktur) && keg.tahapTerstruktur.length > 0) {
      const renderPhaseGroup = (fase: 'pendahuluan' | 'inti' | 'penutup', title: string) => {
        const stages = keg.tahapTerstruktur!.filter((s) => s.fase === fase);
        if (stages.length === 0) return;
        children.push(
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 19 })],
            indent: { left: 240 },
            spacing: { before: 40, after: 20 },
          })
        );
        stages.forEach((st) => {
          const pmLabels: string[] = [];
          if (st.pengalamanBelajar) pmLabels.push(st.pengalamanBelajar);
          if (Array.isArray(st.prinsipPembelajaran) && st.prinsipPembelajaran.length > 0) {
            pmLabels.push(...st.prinsipPembelajaran);
          }
          const pmSuffix = pmLabels.length > 0 ? ` [${pmLabels.join(', ')}]` : '';
          children.push(
            new Paragraph({
              indent: { left: 420 },
              spacing: { before: 20, after: 10 },
              children: [
                new TextRun({
                  text: `• ${st.namaTahap || 'Tahap Kegiatan'} (${st.durasiMenit || 0} Menit)${pmSuffix}`,
                  bold: true,
                  size: 18,
                  color: '0F172A',
                }),
              ],
            }),
            new Paragraph({
              indent: { left: 600 },
              spacing: { after: 10 },
              children: [
                new TextRun({ text: 'Tujuan: ', bold: true, size: 17, color: '334155' }),
                new TextRun({ text: st.tujuanTahap || '-', size: 17, color: '334155' }),
              ],
            }),
            new Paragraph({
              indent: { left: 600 },
              spacing: { after: 10 },
              children: [
                new TextRun({ text: 'Aktivitas Guru: ', bold: true, size: 17, color: '1E3A8A' }),
                new TextRun({ text: st.aktivitasGuru || '-', size: 17 }),
              ],
            }),
            new Paragraph({
              indent: { left: 600 },
              spacing: { after: 10 },
              children: [
                new TextRun({ text: 'Aktivitas Siswa: ', bold: true, size: 17, color: '047857' }),
                new TextRun({ text: st.aktivitasSiswa || '-', size: 17 }),
              ],
            }),
            new Paragraph({
              indent: { left: 600 },
              spacing: { after: 10 },
              children: [
                new TextRun({ text: 'Instruksi / Pertanyaan: ', bold: true, size: 17, color: '475569' }),
                new TextRun({ text: st.instruksiPertanyaan || '-', size: 17, italics: true }),
              ],
            }),
            new Paragraph({
              indent: { left: 600 },
              spacing: { after: 20 },
              children: [
                new TextRun({ text: 'Media & Bahan: ', bold: true, size: 17, color: '475569' }),
                new TextRun({ text: `${st.mediaBahan || '-'} | Bukti Belajar: ${st.buktiBelajar || '-'}`, size: 17, color: '334155' }),
              ],
            })
          );
        });
      };

      renderPhaseGroup('pendahuluan', '1. Kegiatan Pendahuluan:');
      renderPhaseGroup('inti', `2. Kegiatan Inti (${modul.modelPembelajaran || 'Pembelajaran Aktif'}):`);
      renderPhaseGroup('penutup', '3. Kegiatan Penutup & Refleksi:');
    } else {
      children.push(
        new Paragraph({ children: [new TextRun({ text: '1. Kegiatan Pendahuluan:', bold: true, size: 19 })], indent: { left: 240 }, spacing: { after: 20 } })
      );
      (keg.pendahuluan || []).forEach((p) => {
        children.push(new Paragraph({ indent: { left: 480 }, children: [new TextRun({ text: `• ${p}`, size: 18 })], spacing: { after: 20 } }));
      });

      children.push(new Paragraph({ children: [new TextRun({ text: `2. Kegiatan Inti (${modul.modelPembelajaran || 'Pembelajaran Aktif'}):`, bold: true, size: 19 })], indent: { left: 240 }, spacing: { before: 40, after: 20 } }));
      (keg.inti || []).forEach((it) => {
        children.push(new Paragraph({ indent: { left: 480 }, children: [new TextRun({ text: `• ${it}`, size: 18 })], spacing: { after: 20 } }));
      });

      children.push(new Paragraph({ children: [new TextRun({ text: '3. Kegiatan Penutup & Refleksi:', bold: true, size: 19 })], indent: { left: 240 }, spacing: { before: 40, after: 20 } }));
      (keg.penutup || []).forEach((pn) => {
        children.push(new Paragraph({ indent: { left: 480 }, children: [new TextRun({ text: `• ${pn}`, size: 18 })], spacing: { after: 20 } }));
      });
    }
  });

  // Asesmen & Rubrik
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 140, after: 80 },
      children: [new TextRun({ text: 'III. ASESMEN & KRITERIA KETERCAPAIAN (KKTP)', bold: true, size: 22, color: '1E3A8A' })],
    }),
    new Paragraph({ children: [new TextRun({ text: `• Asesmen Diagnostik: `, bold: true, size: 19 }), new TextRun({ text: modul.asesmen?.diagnostik || '-', size: 19 })], spacing: { after: 30 } }),
    new Paragraph({ children: [new TextRun({ text: `• Asesmen Formatif: `, bold: true, size: 19 }), new TextRun({ text: modul.asesmen?.formatif || '-', size: 19 })], spacing: { after: 30 } }),
    new Paragraph({ children: [new TextRun({ text: `• Asesmen Sumatif: `, bold: true, size: 19 }), new TextRun({ text: modul.asesmen?.sumatif || '-', size: 19 })], spacing: { after: 80 } })
  );

  if (modul.asesmenDetail) {
    const ad = modul.asesmenDetail;
    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Rincian Instrumen Asesmen & Kunci/Pedoman:', bold: true, size: 19, color: '1E3A8A' })], spacing: { before: 40, after: 30 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `1. Diagnostik (${ad.diagnostik?.tujuanPemeriksaanPrasyarat || '-'}): `, bold: true, size: 18 }), new TextRun({ text: (ad.diagnostik?.pertanyaanAtauTugasAwal || []).join(' | ') || '-', size: 18 })], spacing: { after: 20 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `   Indikator Interpretasi: `, bold: true, size: 17 }), new TextRun({ text: ad.diagnostik?.indikatorInterpretasi || '-', size: 17 })], spacing: { after: 30 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `2. Formatif (${ad.formatif?.instruksiAktivitas || '-'}): `, bold: true, size: 18 }), new TextRun({ text: `Tugas: ${(ad.formatif?.pertanyaanAtauTugas || []).join(' | ') || '-'} • Bukti: ${(ad.formatif?.buktiYangDiamati || []).join('; ') || '-'}`, size: 18 })], spacing: { after: 20 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `   Umpan Balik Guru: `, bold: true, size: 17 }), new TextRun({ text: ad.formatif?.umpanBalikGuru || '-', size: 17 })], spacing: { after: 30 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `3. Asesmen Akhir (${ad.akhir?.bentukUtama || '-'}):`, bold: true, size: 18 })], spacing: { after: 20 } })
    );
    (ad.akhir?.butirTugas || []).forEach((bt) => {
      children.push(
        new Paragraph({
          indent: { left: 420 },
          spacing: { after: 15 },
          children: [
            new TextRun({ text: `Butir ${bt.nomor || '-'} (${bt.bentuk || '-'}): `, bold: true, size: 17 }),
            new TextRun({ text: `${bt.pertanyaanAtauTugas || '-'} | Kunci/Respons: ${bt.kunciAtauContohRespons || '-'}`, size: 17 }),
          ],
        })
      );
    });
    if (ad.akhir?.pedomanPenilaian) {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          spacing: { after: 60 },
          children: [
            new TextRun({ text: 'Pedoman Penilaian & KKTP: ', bold: true, size: 17 }),
            new TextRun({ text: ad.akhir.pedomanPenilaian, size: 17 }),
          ],
        })
      );
    }
  }

  // Rubrik Singkat dengan Header KKTP Dinamis
  if (modul.rubrikPenilaianSingkat && modul.rubrikPenilaianSingkat.length > 0) {
    const kktpLabels =
      modul.asesmenDetail?.akhir?.kktpReferensi?.rentangLabel ||
      resolveModulKKTPConfig(undefined, profile).rentangLabel;
    const rubHeaders = [
      'Kriteria Penilaian',
      kktpLabels?.baruBerkembang || 'Baru Berkembang',
      kktpLabels?.layak || 'Layak',
      kktpLabels?.cakap || 'Cakap',
      kktpLabels?.mahir || 'Mahir',
    ];
    const rubRows = [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: rubHeaders.map(
          (h) => new TableCell({ shading: { fill: '1E3A8A' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17 })] })] })
        ),
      }),
    ];
    modul.rubrikPenilaianSingkat.forEach((r) => {
      rubRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.kriteria || '-', bold: true, size: 17 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.baruBerkembang || '-', size: 17 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.layak || '-', size: 17 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.cakap || '-', size: 17 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.mahir || '-', size: 17 })] })] }),
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
    new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• Pengayaan: ${modul.pengayaanDanRemedial?.pengayaan || '-'}`, size: 18 })], spacing: { after: 20 } }),
    new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• Remedial: ${modul.pengayaanDanRemedial?.remedial || '-'}`, size: 18 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: 'B. Glosarium:', bold: true, size: 20 })], spacing: { after: 30 } })
  );
  safeGlosarium.forEach((g) => {
    children.push(new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `• ${g.istilah || '-'}: `, bold: true, size: 18 }), new TextRun({ text: g.definisi || '-', size: 18 })], spacing: { after: 20 } }));
  });

  const safeReferensiSumber = Array.isArray(modul.referensiSumber) ? modul.referensiSumber : [];
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'C. Referensi Sumber Ajar & Daftar Pustaka:', bold: true, size: 20 })],
      spacing: { before: 60, after: 30 },
    })
  );
  if (safeReferensiSumber.length > 0) {
    safeReferensiSumber.forEach((ref) => {
      const jenisLabel = JENIS_REFERENSI_LABELS[ref.jenisSumber] || 'Sumber Ajar';
      children.push(
        new Paragraph({
          indent: { left: 240 },
          spacing: { after: 15 },
          children: [
            new TextRun({ text: `• [${jenisLabel}] `, bold: true, size: 18, color: '1E3A8A' }),
            new TextRun({ text: ref.judulBuku, bold: true, size: 18 }),
          ],
        })
      );
      const metaParts: string[] = [];
      if (ref.penulis) metaParts.push(`Penulis: ${ref.penulis}`);
      if (ref.edisiAtauTahun) metaParts.push(`Edisi/Tahun: ${ref.edisiAtauTahun}`);
      const ctxParts = [
        ref.jenjang,
        ref.kelas ? `Kelas ${ref.kelas}` : undefined,
        ref.mataPelajaran,
      ]
        .filter(Boolean)
        .join(' · ');
      if (ctxParts) metaParts.push(ctxParts);
      if (ref.babAtauSubbab) metaParts.push(`Bab/Subbab: ${ref.babAtauSubbab}`);
      if (ref.halaman) metaParts.push(`Halaman: ${ref.halaman}`);
      if (ref.urlSumber) metaParts.push(`Tautan: ${ref.urlSumber}`);
      if (metaParts.length > 0) {
        children.push(
          new Paragraph({
            indent: { left: 380 },
            spacing: { after: 15 },
            children: [new TextRun({ text: metaParts.join(' | '), size: 17, color: '334155' })],
          })
        );
      }
      const statusText = ref.domainResmiSibi
        ? `${getReferensiStatusLabel(ref.statusVerifikasi)} (Tautan domain resmi buku.kemendikdasmen.go.id)`
        : getReferensiStatusLabel(ref.statusVerifikasi);
      children.push(
        new Paragraph({
          indent: { left: 380 },
          spacing: { after: ref.catatanMateriGuru ? 10 : 25 },
          children: [new TextRun({ text: `Status Verifikasi: ${statusText}`, italics: true, size: 16, color: '475569' })],
        })
      );
      if (ref.catatanMateriGuru) {
        children.push(
          new Paragraph({
            indent: { left: 380 },
            spacing: { after: 25 },
            children: [
              new TextRun({ text: 'Catatan Materi Guru: ', bold: true, size: 17, color: '334155' }),
              new TextRun({ text: ref.catatanMateriGuru, size: 17, color: '334155' }),
            ],
          })
        );
      }
    });
    const nonPlaceholderDaftar = safeDaftarPustaka.filter(
      (dp) =>
        !/^\s*\[Lengkapi referensi satuan pendidikan\]/i.test(dp) &&
        !safeReferensiSumber.some((ref) => dp.includes(ref.judulBuku))
    );
    nonPlaceholderDaftar.forEach((dp) => {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          children: [new TextRun({ text: `• ${dp}`, size: 18 })],
          spacing: { after: 20 },
        })
      );
    });
  } else {
    children.push(
      new Paragraph({
        indent: { left: 240 },
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: PROVENANCE_MSG_UNLINKED,
            italics: true,
            size: 17,
            color: '64748B',
          }),
        ],
      })
    );
    safeDaftarPustaka.forEach((dp) => {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          children: [new TextRun({ text: `• ${dp}`, size: 18 })],
          spacing: { after: 20 },
        })
      );
    });
  }

  if (modul.diferensiasiOperasional) {
    const diff = modul.diferensiasiOperasional;
    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Diferensiasi Operasional 3 Jalur Kesiapan:', bold: true, size: 20 })], spacing: { before: 80, after: 30 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: diff.prinsipKesetaraanTP || '-', italics: true, size: 18 })], spacing: { after: 20 } })
    );
    [
      { label: 'Jalur Dasar', val: diff.kesiapanDasar },
      { label: 'Jalur Berkembang', val: diff.kesiapanBerkembang },
      { label: 'Jalur Mahir', val: diff.kesiapanMahir },
    ].forEach(({ label, val }) => {
      if (!val) return;
      children.push(
        new Paragraph({
          indent: { left: 240 },
          spacing: { after: 25 },
          children: [
            new TextRun({ text: `• ${label}: `, bold: true, size: 18 }),
            new TextRun({
              text: `${val.dukunganScaffolding || '-'} Aktivitas: ${(val.aktivitasKonkret || []).join('; ') || '-'} (Media: ${val.mediaPendukung || '-'} | Bukti: ${val.buktiBelajarJalur || '-'})`,
              size: 18,
            }),
          ],
        })
      );
    });
  }

  if (modul.contohLKPD) {
    const lkpd = modul.contohLKPD;
    children.push(
      new Paragraph({ children: [new TextRun({ text: `Contoh LKPD Terintegrasi (${(lkpd.presetType || 'kasus').toUpperCase()}): ${lkpd.judul || '-'}`, bold: true, size: 20 })], spacing: { before: 80, after: 30 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `Tujuan: ${lkpd.tujuanPengerjaan || '-'} | Konteks: ${lkpd.konteksTugas || '-'}`, size: 18 })], spacing: { after: 20 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `Bahan/Data: ${(lkpd.bahanAtauData || []).join('; ') || '-'}`, size: 18 })], spacing: { after: 20 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `Langkah: ${(lkpd.langkahPengerjaan || []).join(' • ') || '-'}`, size: 18 })], spacing: { after: 20 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `Pertanyaan Inti: ${(lkpd.pertanyaanAtauRuangKerja || []).join(' | ') || '-'}`, size: 18 })], spacing: { after: 20 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `Hasil & Kriteria: ${lkpd.hasilYangDiharapkan || '-'} (${(lkpd.kriteriaPenilaian || []).join('; ') || '-'})`, size: 18 })], spacing: { after: 40 } })
    );
  }

  if (modul.bahanBacaan) {
    const bb = modul.bahanBacaan;
    children.push(
      new Paragraph({ children: [new TextRun({ text: 'D. Bahan Bacaan & Materi Ajar Konkret:', bold: true, size: 20 })], spacing: { before: 80, after: 30 } }),
      new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: bb.penjelasanKonsepUtama || bb.ringkasanInti || '-', size: 18 })], spacing: { after: 30 } })
    );
    if (bb.subKonsep?.length) {
      bb.subKonsep.forEach((sk) => {
        children.push(
          new Paragraph({ indent: { left: 360 }, spacing: { after: 15 }, children: [new TextRun({ text: `• ${sk.judul || '-'}: `, bold: true, size: 18 }), new TextRun({ text: sk.uraian || '-', size: 18 })] })
        );
      });
    }
    if (bb.contohKonkret?.length) {
      children.push(
        new Paragraph({ indent: { left: 240 }, spacing: { after: 20 }, children: [new TextRun({ text: 'Contoh Konkret: ', bold: true, size: 18 }), new TextRun({ text: bb.contohKonkret.join(' | '), size: 18 })] })
      );
    }
    if (bb.contohPenyelesaian?.langkahPenyelesaian?.length) {
      children.push(
        new Paragraph({ indent: { left: 240 }, spacing: { after: 20 }, children: [new TextRun({ text: `${bb.contohPenyelesaian.judulContoh || 'Contoh Penyelesaian'}: `, bold: true, size: 18 }), new TextRun({ text: `${bb.contohPenyelesaian.langkahPenyelesaian.join(' -> ')} (${bb.contohPenyelesaian.kesimpulanHasil || '-'})`, size: 18 })] })
      );
    }
    if (bb.hubunganDenganTP) {
      children.push(
        new Paragraph({ indent: { left: 240 }, spacing: { after: 20 }, children: [new TextRun({ text: 'Hubungan dengan TP: ', bold: true, size: 18 }), new TextRun({ text: bb.hubunganDenganTP, size: 18 })] })
      );
    }
    if (bb.potensiMiskonsepsi?.length) {
      bb.potensiMiskonsepsi.forEach((mk) => {
        children.push(
          new Paragraph({ indent: { left: 360 }, spacing: { after: 15 }, children: [new TextRun({ text: `• Miskonsepsi (${mk.miskonsepsi || '-'}): `, bold: true, size: 18 }), new TextRun({ text: mk.caraMeluruskan || '-', size: 18 })] })
        );
      });
    }
    if (bb.konsepKunci?.length) {
      children.push(
        new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: `Konsep Kunci: ${bb.konsepKunci.join(' • ')}`, italics: true, size: 18 })], spacing: { after: 40 } })
      );
    }
  }

  if (modul.refleksiGuru?.length || modul.refleksiSiswa?.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'E. Refleksi Guru & Peserta Didik:', bold: true, size: 20 })], spacing: { before: 80, after: 30 } }));
    if (modul.refleksiGuru?.length) {
      children.push(new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: '• Refleksi Guru: ', bold: true, size: 18 }), new TextRun({ text: modul.refleksiGuru.join(' '), size: 18 })], spacing: { after: 20 } }));
    }
    if (modul.refleksiSiswa?.length) {
      children.push(new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: '• Refleksi Peserta Didik: ', bold: true, size: 18 }), new TextRun({ text: modul.refleksiSiswa.join(' '), size: 18 })], spacing: { after: 40 } }));
    }
  }

  if (profile.tampilkanTandaTangan) {
    children.push(new Paragraph({ spacing: { after: 200 } }), buildSignatureBlockTable(profile, modul.namaGuru));
  }

  return children;
}

/**
 * Ekspor Modul Ajar (RPP Kurikulum Merdeka) ke Microsoft Word (.docx)
 */
export async function exportModulAjarToDocx(modul: ModulAjarDokumen, userProfile?: SchoolProfile): Promise<void> {
  const children = buildModulAjarElements(modul, userProfile);
  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const cleanFilename = `Modul_Ajar_${(modul.materiPokok || '').replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Kurikulum_Merdeka'}`;
  saveAs(blob, `${cleanFilename}.docx`);
}

/**
 * Menyusun elemen DOCX LKPD agar dapat digunakan baik pada ekspor mandiri maupun Bundel Supervisi
 */
export function buildLKPDElements(
  lkpd: LKPDDokumen,
  userProfile?: SchoolProfile,
  isTeacherMode?: boolean
): (Paragraph | Table)[] {
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
                new Paragraph({ children: [new TextRun({ text: `Kelas / Rombel : Kelas ${lkpd.kelas} (${lkpd.rombel || profile.rombelAktif || '-'})`, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Alokasi Waktu  : ${lkpd.alokasiWaktu}`, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: `Tujuan Belajar : ${lkpd.tujuanPembelajaran}`, size: 18 })] }),
                ...(() => {
                  const formattedLkpdSubTP = formatTargetSubTPList(lkpd.targetSubTP);
                  return formattedLkpdSubTP
                    ? [new Paragraph({ children: [new TextRun({ text: `Indikator Sub-TP : ${formattedLkpdSubTP}`, size: 17, color: '475569' })] })]
                    : [];
                })(),
                ...(lkpd.konteksAktual
                  ? [new Paragraph({ children: [new TextRun({ text: `Konteks Belajar : ${lkpd.konteksAktual}`, size: 17, color: '475569' })] })]
                  : []),
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
          new TextRun({ text: lkpd.prasyaratMateri.map((p) => p.trim().replace(/[.]+$/, '')).join('; '), size: 18, color: '475569' }),
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

  if (lkpd.produkHasilBelajar) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'TARGET PRODUK / BUKTI HASIL BELAJAR:', bold: true, size: 20, color: '1E3A8A' })],
        spacing: { before: 80, after: 30 },
      }),
      new Paragraph({
        children: [new TextRun({ text: lkpd.produkHasilBelajar, size: 18, color: '0F172A' })],
        spacing: { after: 40 },
      })
    );
  }

  if (lkpd.kriteriaPenilaianSiswa && lkpd.kriteriaPenilaianSiswa.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Kriteria Keberhasilan Hasil Kerjamu:', bold: true, size: 18, color: '334155' })],
        spacing: { before: 40, after: 20 },
      })
    );
    lkpd.kriteriaPenilaianSiswa.forEach((krit) => {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          children: [new TextRun({ text: `• ${krit}`, size: 18 })],
          spacing: { after: 20 },
        })
      );
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
      keepNext: true,
      children: [new TextRun({ text: kesimpulanHeading, bold: true, size: 21, color: '0D9488' })],
      spacing: { before: 100, after: 40 },
    })
  );
  lkpd.kesimpulanRefleksi.forEach((kr) => {
    children.push(
      new Paragraph({ children: [new TextRun({ text: kr, size: 18, bold: true })], spacing: { before: 30, after: 20 } }),
      new Paragraph({
        children: [
          new TextRun({
            text: '................................................................................................................................................',
            size: 18,
            color: '94A3B8',
          }),
        ],
        spacing: { after: 40 },
      })
    );
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

  return children;
}

/**
 * Ekspor Lembar Kerja Peserta Didik (LKPD) ke Microsoft Word (.docx)
 */
export async function exportLKPDToDocx(
  lkpd: LKPDDokumen,
  userProfile?: SchoolProfile,
  isTeacherMode?: boolean
): Promise<Blob> {
  const children = buildLKPDElements(lkpd, userProfile, isTeacherMode);
  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const cleanMateri = (lkpd.materiPokok || '').replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Siswa';
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
 * Menyusun elemen DOCX Alur Tujuan Pembelajaran (ATP)
 */
function safeATPCellText(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function formatATPPrasyaratCell(it: ATPDokumen['items'][number]): string {
  const parts: string[] = [];
  if (Array.isArray(it.prasyaratKodeLabels) && it.prasyaratKodeLabels.length > 0) {
    parts.push(`Relasi TP: ${it.prasyaratKodeLabels.join(', ')}`);
  }
  if (Array.isArray(it.deskripsiPrasyarat) && it.deskripsiPrasyarat.length > 0) {
    const cleanDesc = it.deskripsiPrasyarat.map((d) => safeATPCellText(d, '')).filter(Boolean);
    if (cleanDesc.length > 0) {
      parts.push(cleanDesc.join('; '));
    }
  }
  return parts.length > 0 ? parts.join(' | ') : 'Tidak ada prasyarat khusus';
}

export function buildATPElements(atp: ATPDokumen, userProfile?: SchoolProfile): (Paragraph | Table)[] {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];
  const statusLabel =
    atp.statusPenyusunan === 'disetujui'
      ? 'Disetujui Guru'
      : atp.statusPenyusunan === 'perlu_ditinjau'
      ? 'DRAF — PERLU DITINJAU ULANG'
      : 'Draf Penyusunan';
  const versiLabel = atp.versi ? `v${atp.versi}` : 'v1';
  const refCPLabel = atp.referensiCP
    ? `${safeATPCellText(atp.referensiCP.nomorDokumen || atp.referensiCP.sumber)} (${safeATPCellText(
        atp.referensiCP.elemenCP,
        'Umum'
      )})`
    : 'Rujukan Satuan Pendidikan';

  // Kop & Judul ATP
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: 'ALUR TUJUAN PEMBELAJARAN (ATP)', bold: true, size: 28, color: '1D4ED8', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: safeATPCellText(atp.satuanPendidikan || profile.namaSekolah, 'SATUAN PENDIDIKAN').toUpperCase(),
          bold: true,
          size: 24,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `MATA PELAJARAN: ${safeATPCellText(atp.mataPelajaran).toUpperCase()} • ${safeATPCellText(
            atp.jenjang || profile.jenjang
          )} (${safeATPCellText(atp.jenjangFase)}) • TA ${safeATPCellText(atp.tahunAjaran)}`,
          size: 19,
          color: '475569',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Referensi CP: ${refCPLabel} • Status: ${statusLabel} (${versiLabel}) • Total Alokasi Fase: ${Number(atp.totalJP) || 0} JP`,
          size: 17,
          color: '334155',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Capaian Pembelajaran Fase
  if (atp.statusPenyusunan === 'perlu_ditinjau') {
    const reasonText =
      atp.alasanTinjauUlang && atp.alasanTinjauUlang.length > 0
        ? atp.alasanTinjauUlang.join(' ')
        : 'Substansi TP, prasyarat, atau pemetaan ATP telah berubah setelah persetujuan terakhir.';
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `PERHATIAN STATUS DOKUMEN (DRAF — PERLU DITINJAU ULANG): ${reasonText}`,
            bold: true,
            size: 17,
            color: 'B45309',
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Capaian Pembelajaran (CP) Fase:', bold: true, size: 19 })],
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: [new TextRun({ text: safeATPCellText(atp.capaianPembelajaranFase, '-'), size: 18, italics: true })],
      spacing: { after: 100 },
    })
  );

  const includeAllocation = Boolean(
    atp.sertakanPemetaanDiDocx &&
      (atp.items || []).some((it) => Boolean(it.alokasiKelas || it.alokasiSemester || it.alokasiTahunAjaran))
  );

  const headers = includeAllocation
    ? [
        'No',
        'Kode TP',
        'Kompetensi & Elemen',
        'Lingkup Materi',
        'Tujuan Pembelajaran (TP)',
        'Prasyarat',
        'Indikator Ketercapaian',
        'Rencana Asesmen & Profil Pelajar Pancasila',
        'JP',
        'Pemetaan Kls/Sem',
      ]
    : [
        'No',
        'Kode TP',
        'Kompetensi & Elemen',
        'Lingkup Materi',
        'Tujuan Pembelajaran (TP)',
        'Prasyarat',
        'Indikator Ketercapaian',
        'Rencana Asesmen & Profil Pelajar Pancasila',
        'JP',
      ];
  const widths = includeAllocation
    ? [4, 7, 13, 12, 19, 11, 14, 10, 4, 6]
    : [4, 7, 14, 13, 21, 11, 15, 10, 5];

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  const cellMargins = { top: 60, bottom: 60, left: 75, right: 75 };

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h, idx) =>
        new TableCell({
          width: { size: widths[idx], type: WidthType.PERCENTAGE },
          shading: { fill: '1E3A8A' },
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 15 })],
            }),
          ],
        })
    ),
  });

  const dataRows = (atp.items || []).map((it, idx) => {
    const kompetensiValue = safeATPCellText(it.kompetensi || it.tujuanPembelajaran, '-');
    const elemenValue = safeATPCellText(it.elemen, '-');
    const pemetaanText = it.alokasiSemester
      ? `Kls ${safeATPCellText(it.alokasiKelas || atp.kelas)} · ${
          it.alokasiSemester.startsWith('2') ? 'Sem 2' : 'Sem 1'
        } (${safeATPCellText(it.alokasiTahunAjaran || atp.tahunAjaran)})`
      : '-';

    const rowCells = [
      new TableCell({
        width: { size: widths[0], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.no || idx + 1), size: 16 })] })],
      }),
      new TableCell({
        width: { size: widths[1], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: safeATPCellText(it.kodeTP), bold: true, size: 16 })] })],
      }),
      new TableCell({
        width: { size: widths[2], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({ children: [new TextRun({ text: elemenValue, bold: true, size: 14, color: '1E3A8A' })], spacing: { after: 20 } }),
          new Paragraph({ children: [new TextRun({ text: kompetensiValue, size: 15 })] }),
        ],
      }),
      new TableCell({
        width: { size: widths[3], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: safeATPCellText(it.lingkupMateri), bold: true, size: 15 })] })],
      }),
      new TableCell({
        width: { size: widths[4], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: safeATPCellText(it.tujuanPembelajaran), size: 15 })] })],
      }),
      new TableCell({
        width: { size: widths[5], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: formatATPPrasyaratCell(it), size: 14 })] })],
      }),
      new TableCell({
        width: { size: widths[6], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: safeATPCellText(it.indikatorKetercapaian), size: 14 })] })],
      }),
      new TableCell({
        width: { size: widths[7], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({ children: [new TextRun({ text: safeATPCellText(it.asesmen), size: 14 })] }),
          ...(Array.isArray(it.profilPancasila) && it.profilPancasila.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 30 },
                  children: [
                    new TextRun({ text: 'Profil: ', bold: true, size: 13, color: '475569' }),
                    new TextRun({ text: safeATPCellText(it.profilPancasila), size: 13, color: '475569' }),
                  ],
                }),
              ]
            : []),
        ],
      }),
      new TableCell({
        width: { size: widths[8], type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${Number(it.alokasiJP) || 0} JP`, size: 15, bold: true })] })],
      }),
    ];

    if (includeAllocation) {
      rowCells.push(
        new TableCell({
          width: { size: widths[9], type: WidthType.PERCENTAGE },
          borders: cellBorders,
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: pemetaanText, size: 14 })] })],
        })
      );
    }

    return new TableRow({ children: rowCells });
  });

  children.push(
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
    new Paragraph({ spacing: { after: 120 } })
  );

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, atp.namaGuru, { compact: true }));
  }

  return children;
}

/**
 * Ekspor Alur Tujuan Pembelajaran (ATP) ke Microsoft Word (.docx)
 */
export async function exportATPToDocx(atp: ATPDokumen, userProfile?: SchoolProfile): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children = buildATPElements(atp, profile);
  const doc = createStyledDocxDocument(profile, `ATP ${atp.mataPelajaran}`, children, {
    landscape: true,
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `ATP_${(atp.mataPelajaran || 'Mapel').replace(/[^a-zA-Z0-9_\s]/g, '_')}_Fase_${(atp.jenjangFase || atp.kelas).replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}

function shortActivityCode(label?: string, isEfektif?: boolean): string {
  if (isEfektif) return '';
  const l = (label || '').toUpperCase();
  if (l.includes('BELUM MASUK') || l.includes('PRA')) return 'PRE';
  if (l.includes('MPLS')) return 'MPL';
  if (l.includes('STS') || l.includes('PTS')) return 'STS';
  if (l.includes('SAS') || l.includes('PAS') || l.includes('SAT')) return 'SAS';
  if (l.includes('RAPOR')) return 'RPR';
  if (l.includes('LIBUR')) return 'LBR';
  if (!label) return 'NE';
  return label.slice(0, 3);
}

/**
 * Menyusun elemen DOCX Program Tahunan (Prota)
 */
export function buildProtaElements(prota: ProtaDokumen, userProfile?: SchoolProfile): (Paragraph | Table)[] {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  const gridBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const cellBorders = { top: gridBorder, bottom: gridBorder, left: gridBorder, right: gridBorder };
  const cellMargins = { top: 65, bottom: 65, left: 90, right: 90 };

  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: profile.instansiDinas.toUpperCase(),
            bold: true,
            size: 19,
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
          text: (prota.satuanPendidikan || profile.namaSekolah || 'SATUAN PENDIDIKAN').toUpperCase(),
          bold: true,
          size: 24,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: 'PROGRAM TAHUNAN (PROTA)',
          bold: true,
          size: 26,
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
          text: `MATA PELAJARAN: ${prota.mataPelajaran.toUpperCase()} • KELAS ${prota.kelas} (${prota.jenjangFase}) • TAHUN AJARAN ${prota.tahunAjaran}`,
          size: 19,
          color: '475569',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Tabel Identitas Administrasi Prota (lebar DXA 9600 twips)
  const idWidths = [2000, 2800, 2000, 2800];
  const jpMingguText = prota.jpConfig
    ? `${prota.jpConfig.jpPerMinggu} JP/minggu × ${prota.jpConfig.durasiJPMinut} mnt (${prota.jpConfig.pertemuanPerMinggu} pertemuan)`
    : 'Mengikuti konfigurasi sekolah';
  const mingguEfektifText =
    typeof prota.mingguEfektifTahunan === 'number'
      ? `${prota.mingguEfektifTahunan} Minggu (Sem 1: ${prota.mingguEfektifSemester1 ?? '-'} • Sem 2: ${prota.mingguEfektifSemester2 ?? '-'})`
      : 'Mengikuti kalender akademik sekolah';
  const statusKalenderText =
    prota.kalenderSem1Terkonfirmasi && prota.kalenderSem2Terkonfirmasi
      ? 'Kalender Resmi Sekolah (Terkonfirmasi)'
      : 'Template Awal (Belum Dikonfirmasi Penuh)';

  const idRowsData: Array<[string, string, string, string]> = [
    [
      'Satuan Pendidikan',
      prota.satuanPendidikan || profile.namaSekolah || '-',
      'Tahun Ajaran',
      prota.tahunAjaran,
    ],
    [
      'Mata Pelajaran',
      prota.mataPelajaran,
      'Kelas / Fase',
      `Kelas ${prota.kelas} / ${prota.jenjangFase}`,
    ],
    [
      'Guru Pengampu',
      `${prota.namaGuru || profile.namaGuru || '-'}${prota.nipGuru ? ` (NIP: ${prota.nipGuru})` : ''}`,
      'Beban Belajar',
      jpMingguText,
    ],
    [
      'Minggu Efektif / Th',
      mingguEfektifText,
      'Status Kalender',
      statusKalenderText,
    ],
  ];

  children.push(
    new Table({
      width: { size: 9600, type: WidthType.DXA },
      columnWidths: idWidths,
      layout: TableLayoutType.FIXED,
      rows: idRowsData.map(
        ([k1, v1, k2, v2]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: idWidths[0], type: WidthType.DXA },
                borders: cellBorders,
                margins: cellMargins,
                shading: { fill: 'F8FAFC' },
                children: [new Paragraph({ children: [new TextRun({ text: k1, bold: true, size: 17 })] })],
              }),
              new TableCell({
                width: { size: idWidths[1], type: WidthType.DXA },
                borders: cellBorders,
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: v1, size: 17 })] })],
              }),
              new TableCell({
                width: { size: idWidths[2], type: WidthType.DXA },
                borders: cellBorders,
                margins: cellMargins,
                shading: { fill: 'F8FAFC' },
                children: [new Paragraph({ children: [new TextRun({ text: k2, bold: true, size: 17 })] })],
              }),
              new TableCell({
                width: { size: idWidths[3], type: WidthType.DXA },
                borders: cellBorders,
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: v2, size: 17 })] })],
              }),
            ],
          })
      ),
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

  // Tabel Semester 1 & 2 (lebar DXA eksplisit total 9600 twips agar columnSpan presisi di MS Word)
  const colWidths = [520, 880, 1950, 3800, 850, 1600]; // sum = 9600
  const span4Width = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]; // 7150

  const renderProtaSemester = (
    judulSem: string,
    items: ProtaItem[],
    totalJP: number,
    mingguEfektifSem?: number,
    kapasitasSem?: number
  ) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: judulSem, bold: true, size: 20, color: '0D9488' }),
          ...(typeof mingguEfektifSem === 'number'
            ? [
                new TextRun({
                  text: `  (${mingguEfektifSem} Minggu Efektif${
                    typeof kapasitasSem === 'number' ? ` • Kapasitas ± ${kapasitasSem} JP` : ''
                  })`,
                  size: 17,
                  color: '475569',
                }),
              ]
            : []),
        ],
        spacing: { before: 80, after: 50 },
      })
    );

    const headers = ['No', 'Kode TP', 'Lingkup Materi', 'Tujuan Pembelajaran', 'Alokasi JP', 'Keterangan / Progres'];

    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map(
        (h, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            borders: cellBorders,
            margins: cellMargins,
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: '1E3A8A' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17 })],
              }),
            ],
          })
      ),
    });

    const dataRows = items.map(
      (it) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: colWidths[0], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.no), size: 17 })] })],
            }),
            new TableCell({
              width: { size: colWidths[1], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.kodeTP, bold: true, size: 17 })] })],
            }),
            new TableCell({
              width: { size: colWidths[2], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: it.lingkupMateri, bold: true, size: 17 })] })],
            }),
            new TableCell({
              width: { size: colWidths[3], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              children: [
                new Paragraph({ children: [new TextRun({ text: it.tujuanPembelajaran, size: 17 })] }),
                ...(it.progresSpiral
                  ? [
                      new Paragraph({
                        spacing: { before: 30 },
                        children: [
                          new TextRun({
                            text: `Catatan Progres: ${it.progresSpiral}`,
                            italics: true,
                            size: 15,
                            color: '1D4ED8',
                          }),
                        ],
                      }),
                    ]
                  : []),
              ],
            }),
            new TableCell({
              width: { size: colWidths[4], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${it.alokasiJP} JP`, bold: true, size: 17 })] })],
            }),
            new TableCell({
              width: { size: colWidths[5], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.keterangan, size: 16, color: '334155' })] })],
            }),
          ],
        })
    );

    // Row Total (columnSpan: 4 -> lebar DXA tepat sama dengan penjumlahan 4 kolom pertama = 7150 twips)
    dataRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: span4Width, type: WidthType.DXA },
            columnSpan: 4,
            borders: cellBorders,
            margins: cellMargins,
            shading: { fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `Total Alokasi Waktu ${judulSem}:`, bold: true, size: 17 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: colWidths[4], type: WidthType.DXA },
            borders: cellBorders,
            margins: cellMargins,
            shading: { fill: 'EFF6FF' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${totalJP} JP`, bold: true, size: 17, color: '1D4ED8' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: colWidths[5], type: WidthType.DXA },
            borders: cellBorders,
            margins: cellMargins,
            shading: { fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: typeof mingguEfektifSem === 'number' ? `${mingguEfektifSem} Mg Efektif` : '-',
                    size: 16,
                    color: '475569',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    children.push(
      new Table({
        width: { size: 9600, type: WidthType.DXA },
        columnWidths: colWidths,
        layout: TableLayoutType.FIXED,
        rows: [headerRow, ...dataRows],
      }),
      new Paragraph({ spacing: { after: 100 } })
    );
  };

  renderProtaSemester(
    'A. Semester 1 (Ganjil)',
    prota.itemsSemester1,
    prota.totalJPSemester1,
    prota.mingguEfektifSemester1,
    prota.kapasitasJPSemester1
  );
  renderProtaSemester(
    'B. Semester 2 (Genap)',
    prota.itemsSemester2,
    prota.totalJPSemester2,
    prota.mingguEfektifSemester2,
    prota.kapasitasJPSemester2
  );

  // Tabel Rekapitulasi Tahunan
  const recapWidths = [4600, 1650, 1650, 1700];
  children.push(
    new Table({
      width: { size: 9600, type: WidthType.DXA },
      columnWidths: recapWidths,
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: recapWidths[0], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              shading: { fill: 'EFF6FF' },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'REKAPITULASI PROGRAM TAHUNAN (SEMESTER 1 + SEMESTER 2)',
                      bold: true,
                      size: 18,
                      color: '1D4ED8',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: recapWidths[1], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              shading: { fill: 'F8FAFC' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `Sem 1: ${prota.totalJPSemester1} JP`, bold: true, size: 17 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: recapWidths[2], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              shading: { fill: 'F8FAFC' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `Sem 2: ${prota.totalJPSemester2} JP`, bold: true, size: 17 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: recapWidths[3], type: WidthType.DXA },
              borders: cellBorders,
              margins: cellMargins,
              shading: { fill: 'DBEAFE' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `Total: ${prota.totalJPTahunan} JP`,
                      bold: true,
                      size: 18,
                      color: '1E3A8A',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 70, after: 90 },
      children: [
        new TextRun({
          text: `TOTAL ALOKASI WAKTU 1 TAHUN AJARAN: ${prota.totalJPTahunan} JAM PELAJARAN (JP)${
            typeof prota.mingguEfektifTahunan === 'number'
              ? ` • ${prota.mingguEfektifTahunan} MINGGU EFEKTIF TAHUNAN`
              : ''
          }`,
          bold: true,
          size: 20,
          color: '1D4ED8',
        }),
      ],
    })
  );

  if (prota.peringatanProta && prota.peringatanProta.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 30 },
        children: [new TextRun({ text: 'Catatan Kalender & Validasi Prota:', bold: true, size: 17, color: '334155' })],
      })
    );
    prota.peringatanProta.forEach((msg) => {
      children.push(
        new Paragraph({
          indent: { left: 240 },
          spacing: { after: 20 },
          children: [new TextRun({ text: `• ${msg}`, size: 16, color: '475569' })],
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 80 } }));
  }

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, prota.namaGuru));
  }

  return children;
}

/**
 * Ekspor Program Tahunan (Prota) ke Microsoft Word (.docx)
 */
export async function exportProtaToDocx(prota: ProtaDokumen, userProfile?: SchoolProfile): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children = buildProtaElements(prota, profile);
  const doc = createStyledDocxDocument(profile, 'Program Tahunan (Prota)', children);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Prota_${prota.mataPelajaran}_Kelas_${prota.kelas}.docx`);
}

/**
 * Menyusun elemen DOCX Program Semester (Promes)
 */
export function buildPromesElements(promes: PromesDokumen, userProfile?: SchoolProfile): (Paragraph | Table)[] {
  const profile = userProfile || getSchoolProfile();
  const children: (Paragraph | Table)[] = [];

  const gridBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const cellBorders = { top: gridBorder, bottom: gridBorder, left: gridBorder, right: gridBorder };
  const cellMargins = { top: 50, bottom: 50, left: 60, right: 60 };

  if (profile.pakaiFormatKopSekolah && profile.instansiDinas) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: profile.instansiDinas.toUpperCase(),
            bold: true,
            size: 19,
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
      spacing: { after: 25 },
      children: [
        new TextRun({
          text: (promes.satuanPendidikan || profile.namaSekolah || 'SATUAN PENDIDIKAN').toUpperCase(),
          bold: true,
          size: 24,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 25 },
      children: [
        new TextRun({
          text: 'PROGRAM SEMESTER (PROMES)',
          bold: true,
          size: 26,
          color: '1D4ED8',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `MATA PELAJARAN: ${promes.mataPelajaran.toUpperCase()} • KELAS ${promes.kelas} (${promes.jenjangFase}) • SEMESTER ${promes.semester.toUpperCase()} • TA ${promes.tahunAjaran}`,
          size: 18,
          color: '475569',
          font: 'Calibri',
        }),
      ],
    })
  );

  // Ringkasan Identitas, Kalender & Beban JP (Landscape ~14.700 twips)
  const totalTerjadwal = promes.totalJPTerjadwal ?? promes.totalJPEfektif;
  const totalDibutuhkan = promes.totalJPDibutuhkanTP ?? promes.rows.reduce((s, r) => s + r.alokasiJP, 0);
  const totalKapasitas = promes.totalKapasitasJPSemester;
  const mingguEfektif = promes.totalMingguEfektif ?? promes.columns.filter((c) => c.isEfektif).length;
  const mingguNonEfektif =
    promes.totalMingguNonEfektif ?? Math.max(0, promes.columns.length - mingguEfektif);
  const jpPerMingguLabel = promes.jpPerMinggu
    ? `${promes.jpPerMinggu} JP/minggu × ${promes.durasiJPMinut ?? 40} mnt (${promes.pertemuanPerMinggu ?? 2} pertemuan/mg)`
    : 'Mengikuti jadwal mapel';

  const infoWidths = [2400, 4950, 2400, 4950]; // sum = 14700
  const infoPairs: Array<[string, string, string, string]> = [
    [
      'Satuan Pendidikan',
      promes.satuanPendidikan || profile.namaSekolah || '-',
      'Semester / Tahun Ajaran',
      `${promes.semester} • TA ${promes.tahunAjaran}`,
    ],
    [
      'Guru Pengampu',
      `${promes.namaGuru || profile.namaGuru || '-'}${promes.nipGuru ? ` (NIP: ${promes.nipGuru})` : ''}`,
      'Alokasi Mapel',
      jpPerMingguLabel,
    ],
    [
      'Kalender Minggu',
      `${mingguEfektif} Minggu Efektif • ${mingguNonEfektif} Minggu Non-Efektif (dari ${promes.columns.length} minggu)`,
      'Rekap JP Semester',
      `Terjadwal: ${totalTerjadwal} JP • Kebutuhan TP: ${totalDibutuhkan} JP${
        typeof totalKapasitas === 'number' ? ` • Kapasitas: ${totalKapasitas} JP` : ''
      }`,
    ],
  ];

  children.push(
    new Table({
      width: { size: 14700, type: WidthType.DXA },
      columnWidths: infoWidths,
      layout: TableLayoutType.FIXED,
      rows: infoPairs.map(
        ([k1, v1, k2, v2]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: infoWidths[0], type: WidthType.DXA },
                borders: cellBorders,
                margins: cellMargins,
                shading: { fill: 'F8FAFC' },
                children: [new Paragraph({ children: [new TextRun({ text: k1, bold: true, size: 16 })] })],
              }),
              new TableCell({
                width: { size: infoWidths[1], type: WidthType.DXA },
                borders: cellBorders,
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: v1, size: 16 })] })],
              }),
              new TableCell({
                width: { size: infoWidths[2], type: WidthType.DXA },
                borders: cellBorders,
                margins: cellMargins,
                shading: { fill: 'F8FAFC' },
                children: [new Paragraph({ children: [new TextRun({ text: k2, bold: true, size: 16 })] })],
              }),
              new TableCell({
                width: { size: infoWidths[3], type: WidthType.DXA },
                borders: cellBorders,
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: v2, size: 16 })] })],
              }),
            ],
          })
      ),
    }),
    new Paragraph({ spacing: { after: 90 } })
  );

  // Kelompokkan bulan untuk header 2 baris Promes
  const monthGroups: Array<{ bulanNama: string; count: number }> = [];
  for (const col of promes.columns) {
    const last = monthGroups[monthGroups.length - 1];
    if (last && last.bulanNama === col.bulanNama) {
      last.count++;
    } else {
      monthGroups.push({ bulanNama: col.bulanNama, count: 1 });
    }
  }

  // Tabel Promes (lebar DXA eksplisit agar rapi pada kertas A4 Landscape ~14700 twips)
  const wNo = 440;
  const wKode = 600;
  const wMateri = 3140;
  const wRentang = 680;
  const wJP = 620;
  const fixedSum = wNo + wKode + wMateri + wRentang + wJP; // 5480
  const weekCellMargins = { top: 30, bottom: 30, left: 12, right: 12 };
  const colWeekWidth =
    promes.columns.length > 0 ? Math.max(310, Math.floor((14700 - fixedSum) / promes.columns.length)) : 360;
  const totalTableWidth = fixedSum + colWeekWidth * promes.columns.length;
  const tableColWidths = [wNo, wKode, wMateri, wRentang, wJP, ...promes.columns.map(() => colWeekWidth)];

  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: wNo, type: WidthType.DXA },
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        shading: { fill: '1E3A8A' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, color: 'FFFFFF', size: 14 })] })],
      }),
      new TableCell({
        width: { size: wKode, type: WidthType.DXA },
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        shading: { fill: '1E3A8A' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kode', bold: true, color: 'FFFFFF', size: 14 })] })],
      }),
      new TableCell({
        width: { size: wMateri, type: WidthType.DXA },
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        shading: { fill: '1E3A8A' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Materi Pokok & Tujuan Pembelajaran', bold: true, color: 'FFFFFF', size: 14 })] })],
      }),
      new TableCell({
        width: { size: wRentang, type: WidthType.DXA },
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        shading: { fill: '1E3A8A' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Minggu', bold: true, color: 'FFFFFF', size: 14 })] })],
      }),
      new TableCell({
        width: { size: wJP, type: WidthType.DXA },
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        shading: { fill: '1E3A8A' },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'JP', bold: true, color: 'FFFFFF', size: 14 })] })],
      }),
      ...monthGroups.map(
        (grp) =>
          new TableCell({
            width: { size: grp.count * colWeekWidth, type: WidthType.DXA },
            columnSpan: grp.count,
            verticalAlign: VerticalAlign.CENTER,
            borders: cellBorders,
            shading: { fill: '1E3A8A' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: grp.bulanNama, bold: true, color: 'FFFFFF', size: 13 })],
              }),
            ],
          })
      ),
    ],
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: promes.columns.map((col, idx) => {
      const shortTag = shortActivityCode(col.labelKegiatan, col.isEfektif);
      return new TableCell({
        width: { size: colWeekWidth, type: WidthType.DXA },
        borders: cellBorders,
        margins: weekCellMargins,
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: col.isEfektif ? '2563EB' : '475569' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `M${col.mingguKe}`,
                bold: true,
                color: 'FFFFFF',
                size: 11,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: shortTag || `(${col.semesterWeekNumber ?? idx + 1})`,
                color: 'E2E8F0',
                size: 9,
              }),
            ],
          }),
        ],
      });
    }),
  });

  const dataRows = promes.rows.map((row) => {
    const rowScheduled =
      typeof row.jpTerjadwal === 'number'
        ? row.jpTerjadwal
        : Object.values(row.distribusiJP).reduce((a, b) => a + b, 0);
    const hasUnscheduled = rowScheduled < row.alokasiJP;
    const rentangText =
      row.mingguMulai && row.mingguSelesai ? `M${row.mingguMulai}–M${row.mingguSelesai}` : '-';
    const jpSummaryText = hasUnscheduled ? `${rowScheduled}/${row.alokasiJP}` : `${row.alokasiJP}`;

    return new TableRow({
      children: [
        new TableCell({
          width: { size: wNo, type: WidthType.DXA },
          borders: cellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.no), size: 14 })] })],
        }),
        new TableCell({
          width: { size: wKode, type: WidthType.DXA },
          borders: cellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: row.kodeTP, bold: true, size: 14 })] })],
        }),
        new TableCell({
          width: { size: wMateri, type: WidthType.DXA },
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({ children: [new TextRun({ text: `${row.materiPokok}`, bold: true, size: 14 })] }),
            new Paragraph({ children: [new TextRun({ text: row.tujuanPembelajaran, size: 13, color: '334155' })] }),
            ...(row.konflikJadwal
              ? [
                  new Paragraph({
                    spacing: { before: 20 },
                    children: [new TextRun({ text: `! ${row.konflikJadwal}`, bold: true, size: 12, color: 'B91C1C' })],
                  }),
                ]
              : []),
          ],
        }),
        new TableCell({
          width: { size: wRentang, type: WidthType.DXA },
          borders: cellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rentangText, size: 13 })] })],
        }),
        new TableCell({
          width: { size: wJP, type: WidthType.DXA },
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: jpSummaryText,
                  bold: true,
                  size: 14,
                  color: hasUnscheduled ? 'B91C1C' : '0F172A',
                }),
              ],
            }),
          ],
        }),
        ...promes.columns.map((col, cIdx) => {
          // Pastikan minggu non-efektif/libur tidak pernah mencetak JP pembelajaran
          const jp = col.isEfektif ? row.distribusiJP[cIdx] : undefined;
          const nonEfCode = !col.isEfektif ? shortActivityCode(col.labelKegiatan, false) : '';
          const textVal = jp ? String(jp) : nonEfCode;
          return new TableCell({
            width: { size: colWeekWidth, type: WidthType.DXA },
            borders: cellBorders,
            margins: weekCellMargins,
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: jp ? 'DCFCE7' : !col.isEfektif ? 'E2E8F0' : 'FFFFFF' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: textVal,
                    bold: !!jp,
                    size: jp ? 13 : 9,
                    color: jp ? '047857' : '64748B',
                  }),
                ],
              }),
            ],
          });
        }),
      ],
    });
  });

  // Baris Total JP per Minggu (sinkron 100% dengan preview)
  const totalRow = new TableRow({
    children: [
      new TableCell({
        width: { size: wNo + wKode + wMateri + wRentang, type: WidthType.DXA },
        columnSpan: 4,
        borders: cellBorders,
        margins: cellMargins,
        shading: { fill: 'F1F5F9' },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'TOTAL JP TERJADWAL PER MINGGU:', bold: true, size: 14 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: wJP, type: WidthType.DXA },
        borders: cellBorders,
        shading: { fill: 'DBEAFE' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${totalTerjadwal}`, bold: true, size: 14, color: '1E3A8A' })],
          }),
        ],
      }),
      ...promes.columns.map((col, cIdx) => {
        const colSum = col.isEfektif
          ? promes.rows.reduce((s, r) => s + (r.distribusiJP[cIdx] || 0), 0)
          : 0;
        return new TableCell({
          width: { size: colWeekWidth, type: WidthType.DXA },
          borders: cellBorders,
          shading: { fill: col.isEfektif ? 'F8FAFC' : 'CBD5E1' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: col.isEfektif ? (colSum > 0 ? String(colSum) : '0') : '-',
                  bold: colSum > 0,
                  size: 12,
                  color: colSum > (col.kapasitasJP ?? promes.jpPerMinggu ?? 99) ? 'B91C1C' : '1E293B',
                }),
              ],
            }),
          ],
        });
      }),
    ],
  });

  children.push(
    new Table({
      width: { size: totalTableWidth, type: WidthType.DXA },
      columnWidths: tableColWidths,
      layout: TableLayoutType.FIXED,
      rows: [headerRow1, headerRow2, ...dataRows, totalRow],
    }),
    new Paragraph({ spacing: { after: 100 } })
  );

  // Keterangan Libur, Agenda Kalender Non-Efektif & Validasi Kapasitas
  const nonEffectiveWeeks = promes.columns.filter((c) => !c.isEfektif);
  if (nonEffectiveWeeks.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 30 },
        children: [
          new TextRun({
            text: `Keterangan Minggu Non-Efektif & Hari Libur (${nonEffectiveWeeks.length} minggu):`,
            bold: true,
            size: 17,
            color: '1E293B',
          }),
        ],
      })
    );
    const nonEfSummaries = nonEffectiveWeeks.map(
      (c) =>
        `${c.bulanNama} M${c.mingguKe}${c.startDate ? ` (${c.startDate} s.d. ${c.endDate})` : ''}: ${
          c.labelKegiatan || 'Non-Efektif'
        }`
    );
    children.push(
      new Paragraph({
        indent: { left: 200 },
        spacing: { after: 60 },
        children: [new TextRun({ text: nonEfSummaries.join('  |  '), size: 15, color: '475569' })],
      })
    );
  }

  if (promes.calendarSummary) {
    const cal = promes.calendarSummary;
    const calItems: string[] = [
      `Periode Semester: ${cal.tanggalMulaiSemester} s.d. ${cal.tanggalAkhirSemester}`,
      ...(cal.mplsRange ? [`MPLS: ${cal.mplsRange.startDate} s.d. ${cal.mplsRange.endDate}`] : []),
      `STS: ${cal.stsRange.startDate} s.d. ${cal.stsRange.endDate}`,
      `SAS: ${cal.sasRange.startDate} s.d. ${cal.sasRange.endDate}`,
      `Pembagian Rapor: ${cal.pembagianRaporDate}`,
      ...(cal.liburNasionalKeagamaan || []).map(
        (ev) => `Libur Nasional/Keagamaan (${ev.nama}): ${ev.startDate} s.d. ${ev.endDate}`
      ),
      ...(cal.liburSekolah || []).map(
        (ev) => `Libur Sekolah (${ev.nama}): ${ev.startDate} s.d. ${ev.endDate}`
      ),
      ...(cal.kegiatanKhususSekolah || []).map(
        (ev) => `Kegiatan Sekolah (${ev.nama}): ${ev.startDate} s.d. ${ev.endDate}`
      ),
    ];
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: 'Rincian Agenda Kalender Sekolah: ', bold: true, size: 16, color: '334155' }),
          new TextRun({ text: calItems.join(' • '), size: 15, color: '475569' }),
        ],
      })
    );
  }

  if (promes.validationIssues && promes.validationIssues.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 30, after: 25 },
        children: [new TextRun({ text: 'Catatan Validasi Jadwal & Kapasitas JP:', bold: true, size: 16, color: '334155' })],
      })
    );
    promes.validationIssues.forEach((issue) => {
      children.push(
        new Paragraph({
          indent: { left: 200 },
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: `• [${issue.severity.toUpperCase()}] ${issue.pesan}`,
              size: 15,
              color: issue.severity === 'error' ? 'B91C1C' : issue.severity === 'warning' ? 'B45309' : '475569',
            }),
          ],
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 40 } }));
  }

  if (profile.tampilkanTandaTangan) {
    children.push(buildSignatureBlockTable(profile, promes.namaGuru, { compact: true }));
  }

  return children;
}

/**
 * Ekspor Program Semester (Promes Visual) ke Microsoft Word (.docx)
 */
export async function exportPromesToDocx(promes: PromesDokumen, userProfile?: SchoolProfile): Promise<void> {
  const profile = userProfile || getSchoolProfile();
  const children = buildPromesElements(promes, profile);
  const doc = createStyledDocxDocument(profile, 'Program Semester (Promes)', children, { landscape: true });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Promes_${promes.mataPelajaran}_Kelas_${promes.kelas}_${promes.semester.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}
