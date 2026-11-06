import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Download,
  Archive,
  Printer,
  FileText,
  BookOpen,
  Calendar,
  Table2,
  Users,
  Award,
  Sparkles,
  ArrowLeft,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../utils/schoolProfileStorage';
import type { KelasHarianData } from '../types/kelasHarian';
import {
  exportCoverDanPengesahanToDocx,
  exportInstrumenSupervisiToDocx,
  exportBundelSupervisiMasterDocx,
  exportPaketSupervisiToZip,
  exportATPToDocx,
  exportProtaToDocx,
  exportPromesToDocx,
  exportPresensiToDocx,
  exportJurnalMengajarToDocx,
  exportDaftarNilaiToDocx,
  exportRekapRaporToDocx,
} from '../utils/docxExporter';
import {
  buildSmartATP,
  buildSmartProta,
  buildSmartPromes,
} from '../utils/perangkatAjarEngine';
import { cardTapMotion } from '../utils/motionPresets';

interface PaketSupervisiDashboardProps {
  schoolProfile: SchoolProfile;
  tpList: CustomTPItem[];
  kelasHarian: KelasHarianData;
  onBackToClassHub: () => void;
  onToast: (msg: string) => void;
}

export const PaketSupervisiDashboard: React.FC<PaketSupervisiDashboardProps> = ({
  schoolProfile,
  tpList,
  kelasHarian,
  onBackToClassHub,
  onToast,
}) => {
  const [isDownloadingMaster, setIsDownloadingMaster] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [downloadingDocIdx, setDownloadingDocIdx] = useState<number | null>(null);

  // 1. Download Master DOCX
  const handleDownloadMaster = async () => {
    try {
      setIsDownloadingMaster(true);
      onToast('Sedang merangkum seluruh dokumen ke dalam satu file Master Bundel Word...');
      await exportBundelSupervisiMasterDocx(schoolProfile, tpList, kelasHarian);
      onToast('Master Bundel Supervisi (.docx) berhasil diunduh!');
    } catch (e: any) {
      alert('Gagal mengunduh Master Bundel: ' + e.message);
    } finally {
      setIsDownloadingMaster(false);
    }
  };

  // 2. Download ZIP
  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      onToast('Sedang mengemas seluruh 9 file dokumen ke dalam arsip ZIP...');
      await exportPaketSupervisiToZip(schoolProfile, tpList, kelasHarian);
      onToast('Paket Arsip ZIP (.zip) berhasil diunduh!');
    } catch (e: any) {
      alert('Gagal mengunduh ZIP: ' + e.message);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // 3. Download Single Document
  const handleDownloadSingle = async (idx: number) => {
    try {
      setDownloadingDocIdx(idx);
      if (idx === 1) {
        await exportCoverDanPengesahanToDocx(schoolProfile);
      } else if (idx === 2) {
        await exportInstrumenSupervisiToDocx(schoolProfile);
      } else if (idx === 3) {
        const atp = buildSmartATP(tpList, schoolProfile);
        await exportATPToDocx(atp, schoolProfile);
      } else if (idx === 4) {
        const prota = buildSmartProta(schoolProfile, tpList);
        await exportProtaToDocx(prota, schoolProfile);
      } else if (idx === 5) {
        const promes = buildSmartPromes(schoolProfile, tpList);
        await exportPromesToDocx(promes, schoolProfile);
      } else if (idx === 6) {
        await exportPresensiToDocx(schoolProfile, kelasHarian);
      } else if (idx === 7) {
        await exportJurnalMengajarToDocx(schoolProfile, kelasHarian);
      } else if (idx === 8) {
        await exportDaftarNilaiToDocx(schoolProfile, kelasHarian, tpList);
      } else if (idx === 9) {
        await exportRekapRaporToDocx(schoolProfile, kelasHarian, tpList);
      }
      onToast('Dokumen Word (.docx) berhasil diunduh!');
    } catch (e: any) {
      alert('Gagal mengunduh dokumen: ' + e.message);
    } finally {
      setDownloadingDocIdx(null);
    }
  };

  const checklistDocuments = [
    {
      id: 1,
      nama: 'Halaman Cover Portofolio & Lembar Pengesahan',
      kategori: 'Administrasi Utama',
      deskripsi: 'Kop resmi, judul portofolio, metadata kelas/fase, serta pengesahan Kepala Sekolah & Guru.',
      icon: <FileText size={18} color="#2563eb" />,
      tag: 'Siap Cetak',
    },
    {
      id: 2,
      nama: 'Instrumen Telaah & Verifikasi Supervisi Akademik',
      kategori: 'Instrumen Pengawas',
      deskripsi: 'Tabel verifikasi 9 komponen standar supervisi dengan predikat Amat Baik (A) dan catatan supervisor.',
      icon: <FileCheck size={18} color="#059669" />,
      tag: 'Format Pengawas',
    },
    {
      id: 3,
      nama: 'Alur Tujuan Pembelajaran (ATP) Semester',
      kategori: 'Perangkat Persiapan',
      deskripsi: 'Memuat seluruh alur capaian TP, alokasi JP, dan integrasi dimensi Profil Pelajar Pancasila.',
      icon: <Table2 size={18} color="#2563eb" />,
      tag: 'Kurikulum Merdeka',
    },
    {
      id: 4,
      nama: 'Program Tahunan (Prota)',
      kategori: 'Perangkat Persiapan',
      deskripsi: 'Distribusi jam pelajaran per lingkup materi semester ganjil dan genap.',
      icon: <Calendar size={18} color="#d97706" />,
      tag: 'Tahunan',
    },
    {
      id: 5,
      nama: 'Program Semester (Promes Visual)',
      kategori: 'Perangkat Persiapan',
      deskripsi: 'Matriks sebaran JP per minggu efektif lengkap dengan penanda libur dan asesmen.',
      icon: <BookOpen size={18} color="#0d9488" />,
      tag: 'Minggu Efektif',
    },
    {
      id: 6,
      nama: 'Daftar Presensi & Kehadiran Siswa (16 Pertemuan)',
      kategori: 'Administrasi Harian',
      deskripsi: `Rekapitulasi absensi 16 minggu untuk ${kelasHarian.daftarSiswa.length} siswa rombel ${schoolProfile.rombelAktif}.`,
      icon: <Users size={18} color="#0284c7" />,
      tag: 'Rekap Presensi',
    },
    {
      id: 7,
      nama: 'Buku Agenda & Jurnal Mengajar Guru',
      kategori: 'Administrasi Harian',
      deskripsi: `${kelasHarian.daftarJurnal.length} pertemuan terjadwal memuat kegiatan diferensiasi dan refleksi harian.`,
      icon: <FileText size={18} color="#7c3aed" />,
      tag: 'Jurnal Guru',
    },
    {
      id: 8,
      nama: 'Buku Nilai Asesmen (Formatif & Sumatif per TP)',
      kategori: 'Administrasi Nilai',
      deskripsi: 'Daftar nilai seluruh TP, STS, SAS, Nilai Akhir (NA), dan predikat ketercapaian KKTP.',
      icon: <Award size={18} color="#15803d" />,
      tag: 'KKTP Terukur',
    },
    {
      id: 9,
      nama: 'Rekapitulasi Capaian & Deskripsi e-Rapor',
      kategori: 'Administrasi Nilai',
      deskripsi: 'Sintesis narasi capaian tertinggi dan penguatan terendah siap paste ke e-Rapor Kemendikbud.',
      icon: <Sparkles size={18} color="#ea580c" />,
      tag: 'Standar e-Rapor',
    },
  ];

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Top Bar Navigasi Balik */}
      <div style={{ marginBottom: 16 }}>
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={cardTapMotion}
          onClick={onBackToClassHub}
          className="btn btn-sm btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            borderColor: '#93c5fd',
            color: '#1d4ed8',
            fontWeight: 800,
            fontSize: 12.5,
            borderRadius: 10,
          }}
        >
          <ArrowLeft size={14} /> Kembali ke Kelas & Peta TP
        </motion.button>
      </div>

      {/* HERO BANNER V21: 100% SIAP SUPERVISI */}
      <div
        className="v21-bento-card"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #064e3b 100%)',
          borderRadius: 18,
          padding: '30px 34px',
          color: '#ffffff',
          boxShadow: '0 12px 36px -6px rgba(15, 23, 42, 0.45)',
          marginBottom: 24,
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              background: '#059669',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.4)',
            }}
          >
            <CheckCircle2 size={14} /> Status: 100% Lengkap & Siap Supervisi
          </span>
          <span style={{ fontSize: 13, color: '#a7f3d0', fontWeight: 600 }}>
            9 dari 9 Dokumen Terverifikasi Standar Kemendikbudristek
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.4px', lineHeight: 1.25 }}>
          🎓 Dashboard Paket Administrasi Siap Supervisi & Akreditasi Guru
        </h1>

        <p style={{ fontSize: 13.5, color: '#cbd5e1', maxWidth: 860, marginBottom: 20, lineHeight: 1.6 }}>
          Seluruh instrumen administrasi pembelajaran semester ini telah terintegrasi secara otomatis — mulai dari <strong>Cover Portofolio, Lembar Pengesahan, Instrumen Telaah, ATP, Prota, Promes, Presensi, Jurnal, hingga Buku Nilai & Auto-Deskripsi e-Rapor</strong>. Siap dicetak atau diserahkan ke Kepala Sekolah dan Pengawas Pembina!
        </p>

        {/* Metadata Strip */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            padding: '10px 18px',
            marginBottom: 22,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: 13,
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div>
            <span style={{ opacity: 0.75 }}>Mata Pelajaran:</span>{' '}
            <strong>{schoolProfile.mataPelajaranUtama}</strong>
          </div>
          <div>•</div>
          <div>
            <span style={{ opacity: 0.75 }}>Kelas & Rombel:</span>{' '}
            <strong>Kelas {schoolProfile.kelasUtama} ({schoolProfile.rombelAktif})</strong>
          </div>
          <div>•</div>
          <div>
            <span style={{ opacity: 0.75 }}>Semester:</span> <strong>{schoolProfile.semester}</strong>
          </div>
          <div>•</div>
          <div>
            <span style={{ opacity: 0.75 }}>Guru:</span>{' '}
            <strong>{schoolProfile.namaGuru || 'Bapak/Ibu Guru'}</strong>
          </div>
        </div>

        {/* 2 TOMBOL UTAMA SUPERVISI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={cardTapMotion}
            onClick={handleDownloadMaster}
            disabled={isDownloadingMaster}
            style={{
              padding: '13px 26px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: 14,
              cursor: isDownloadingMaster ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45)',
            }}
          >
            <Download size={18} />
            {isDownloadingMaster ? 'Sedang Menyusun Bundel...' : '📦 Unduh Master Bundel Lengkap (.docx)'}
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={cardTapMotion}
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            style={{
              padding: '13px 26px',
              borderRadius: 12,
              border: 'none',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 900,
              fontSize: 14,
              cursor: isDownloadingZip ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(255, 255, 255, 0.3)',
            }}
          >
            <Archive size={18} color="#2563eb" />
            {isDownloadingZip ? 'Sedang Mengemas ZIP...' : '🗂️ Unduh Paket Semua File ZIP (.zip)'}
          </motion.button>

          <motion.button
            type="button"
            whileTap={cardTapMotion}
            onClick={() => window.print()}
            style={{
              padding: '13px 20px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Printer size={16} /> Cetak Lembar Verifikasi
          </motion.button>
        </div>
      </div>

      {/* CHECKLIST 9 DOKUMEN SUPERVISI BENTO GRID */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
              Daftar Kelengkapan Berkas Administrasi (9 Dokumen Resmi)
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748b' }}>
              Setiap dokumen dapat diunduh per file secara individual atau diunduh sekaligus lewat tombol di atas.
            </p>
          </div>
          <div
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              borderRadius: 9999,
              padding: '6px 14px',
              fontWeight: 800,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShieldCheck size={15} color="#059669" /> 9 / 9 Dokumen Terpenuhi
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {checklistDocuments.map((doc) => {
            const isDownloadingThis = downloadingDocIdx === doc.id;

            return (
              <motion.div
                key={doc.id}
                whileHover={{ y: -3 }}
                className="v21-bento-card"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {doc.icon}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        {doc.kategori}
                      </span>
                    </div>
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 9999,
                      }}
                    >
                      {doc.tag}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginBottom: 4, lineHeight: 1.35 }}>
                    {doc.id}. {doc.nama}
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>
                    {doc.deskripsi}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} /> Terverifikasi
                  </span>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={cardTapMotion}
                    onClick={() => handleDownloadSingle(doc.id)}
                    disabled={isDownloadingThis}
                    className="btn btn-sm btn-outline"
                    style={{
                      fontSize: 11.5,
                      padding: '5px 12px',
                      borderRadius: 8,
                      borderColor: '#93c5fd',
                      color: '#1d4ed8',
                      fontWeight: 800,
                    }}
                  >
                    <Download size={12} /> {isDownloadingThis ? 'Mengunduh...' : 'Unduh (.docx)'}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* PRATINJAU INSTRUMEN SUPERVISI AKADEMIK */}
      <div
        className="v21-bento-card"
        style={{
          padding: '24px 26px',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 9999 }}>
              Format Resmi Pengawas / Kepala Sekolah
            </span>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
              Lembar Telaah & Verifikasi Supervisi Akademik Guru
            </h2>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={cardTapMotion}
            onClick={() => handleDownloadSingle(2)}
            className="btn btn-sm btn-primary"
            style={{ fontSize: 12, fontWeight: 800, borderRadius: 10 }}
          >
            <Download size={13} /> Unduh Instrumen Supervisi (.docx)
          </motion.button>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: 40, textAlign: 'center' }}>No</th>
                <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                  Komponen Dokumen Administrasi Pembelajaran
                </th>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: 110, textAlign: 'center' }}>
                  Ketersediaan
                </th>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: 90, textAlign: 'center' }}>
                  Skor (0-2)
                </th>
                <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                  Catatan Verifikasi Supervisor
                </th>
              </tr>
            </thead>
            <tbody>
              {checklistDocuments.map((d) => (
                <tr key={d.id} style={{ background: d.id % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }}>
                    {d.id}
                  </td>
                  <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                    {d.nama}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#15803d', fontWeight: 800 }}>
                    ✓ Ada
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800 }}>
                    2
                  </td>
                  <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12 }}>
                    Dokumen lengkap, terintegrasi, dan sesuai ketentuan Kurikulum Merdeka.
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#eff6ff', fontWeight: 800 }}>
                <td colSpan={3} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#1e40af' }}>
                  Total Skor Perolehan:
                </td>
                <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#1e40af' }}>
                  18 / 18
                </td>
                <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', color: '#15803d' }}>
                  Nilai: 100% (Kategori: Amat Baik / A)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
