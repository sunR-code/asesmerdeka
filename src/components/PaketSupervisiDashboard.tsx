import React, { useState } from 'react';
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
      const ok = await exportBundelSupervisiMasterDocx(schoolProfile, tpList, kelasHarian);
      if (ok) {
        onToast('Master Bundel Supervisi (.docx) berhasil diunduh!');
      }
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
      const ok = await exportPaketSupervisiToZip(schoolProfile, tpList, kelasHarian);
      if (ok) {
        onToast('Paket Arsip ZIP (.zip) berhasil diunduh!');
      }
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
      let ok: any = false;
      if (idx === 1) {
        ok = await exportCoverDanPengesahanToDocx(schoolProfile);
      } else if (idx === 2) {
        ok = await exportInstrumenSupervisiToDocx(schoolProfile);
      } else if (idx === 3) {
        const atp = buildSmartATP(tpList, schoolProfile);
        ok = await exportATPToDocx(atp, schoolProfile);
      } else if (idx === 4) {
        const prota = buildSmartProta(schoolProfile, tpList);
        ok = await exportProtaToDocx(prota, schoolProfile);
      } else if (idx === 5) {
        const promes = buildSmartPromes(schoolProfile, tpList);
        ok = await exportPromesToDocx(promes, schoolProfile);
      } else if (idx === 6) {
        ok = await exportPresensiToDocx(schoolProfile, kelasHarian);
      } else if (idx === 7) {
        ok = await exportJurnalMengajarToDocx(schoolProfile, kelasHarian);
      } else if (idx === 8) {
        ok = await exportDaftarNilaiToDocx(schoolProfile, kelasHarian, tpList);
      } else if (idx === 9) {
        ok = await exportRekapRaporToDocx(schoolProfile, kelasHarian, tpList);
      }
      if (ok) {
        onToast('Dokumen Word (.docx) berhasil diunduh!');
      }
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
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4px 0 28px' }}>
      {/* Top Bar Navigasi Balik */}
      <div style={{ marginBottom: 14 }}>
        <button
          type="button"
          onClick={onBackToClassHub}
          className="btn btn-sm btn-outline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Kembali ke Kelas & Peta TP</span>
        </button>
      </div>

      {/* Header Card Calm Workspace: Paket Administrasi Supervisi */}
      <div
        className="v21-bento-card"
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '22px 24px',
          color: '#172033',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 20,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span
            className="tabular-nums"
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontWeight: 600,
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>{checklistDocuments.length} dokumen paket semester tersedia</span>
          </span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.25, color: '#172033' }}>
          Paket administrasi supervisi
        </h1>

        <p style={{ fontSize: 13.5, color: '#475569', maxWidth: 820, marginBottom: 16, lineHeight: 1.55 }}>
          Susun dan unduh dokumen administrasi pembelajaran semester ini — mencakup cover portofolio, lembar pengesahan, instrumen telaah, ATP, Prota, Promes, presensi, jurnal mengajar, hingga rekap nilai dan deskripsi rapor.
        </p>

        {/* Metadata Strip */}
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 9,
            padding: '10px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 12.5,
            color: '#475569',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            Mapel: <strong style={{ color: '#172033' }}>{schoolProfile.mataPelajaranUtama}</strong>
          </div>
          <span aria-hidden="true" style={{ color: '#cbd5e1' }}>·</span>
          <div>
            Kelas & Rombel:{' '}
            <strong style={{ color: '#172033' }}>
              Kelas {schoolProfile.kelasUtama} ({schoolProfile.rombelAktif})
            </strong>
          </div>
          <span aria-hidden="true" style={{ color: '#cbd5e1' }}>·</span>
          <div>
            Semester: <strong style={{ color: '#172033' }}>{schoolProfile.semester}</strong>
          </div>
          <span aria-hidden="true" style={{ color: '#cbd5e1' }}>·</span>
          <div>
            Guru:{' '}
            <strong style={{ color: '#172033' }}>
              {schoolProfile.namaGuru || 'Belum diisi'}
            </strong>
          </div>
        </div>

        {/* Tombol Ekspor Paket */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownloadMaster}
            disabled={isDownloadingMaster}
            className="btn btn-primary"
          >
            <Download size={16} aria-hidden="true" />
            <span>
              {isDownloadingMaster
                ? 'Menyusun bundel...'
                : 'Unduh master bundel (.docx)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            className="btn btn-outline"
          >
            <Archive size={16} aria-hidden="true" />
            <span>
              {isDownloadingZip
                ? 'Mengemas ZIP...'
                : 'Unduh arsip per file (.zip)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-outline"
          >
            <Printer size={15} aria-hidden="true" />
            <span>Cetak lembar daftar</span>
          </button>
        </div>
      </div>

      {/* Daftar Dokumen Administrasi */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#172033', margin: 0 }}>
              Daftar dokumen dalam paket ({checklistDocuments.length} berkas)
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
              Unduh masing-masing berkas secara terpisah atau unduh sekaligus melalui tombol di atas.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 12 }}>
          {checklistDocuments.map((doc) => {
            const isDownloadingThis = downloadingDocIdx === doc.id;

            return (
              <div
                key={doc.id}
                className="v21-bento-card"
                style={{
                  padding: '15px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {doc.icon}
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                        {doc.kategori}
                      </span>
                    </div>
                    <span
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #e2e8f0',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {doc.tag}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#172033', margin: '0 0 4px', lineHeight: 1.35 }}>
                    <span className="tabular-nums">{doc.id}.</span> {doc.nama}
                  </h3>
                  <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: '0 0 12px' }}>
                    {doc.deskripsi}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <ShieldCheck size={13} style={{ color: '#2563eb' }} aria-hidden="true" />
                    <span>Format .docx</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(doc.id)}
                    disabled={isDownloadingThis}
                    className="btn btn-sm btn-outline"
                  >
                    <Download size={12} aria-hidden="true" />
                    <span>{isDownloadingThis ? 'Mengunduh...' : 'Unduh (.docx)'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ringkasan Format Instrumen Supervisi */}
      <div
        className="v21-bento-card"
        style={{
          padding: '18px 20px',
          background: '#ffffff',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#172033', margin: 0 }}>
              Pratinjau daftar telaah dokumen supervisi
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
              Kolom skor diisi oleh kepala sekolah atau pengawas saat kegiatan telaah berlangsung.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadSingle(2)}
            className="btn btn-sm btn-outline"
          >
            <Download size={13} aria-hidden="true" />
            <span>Unduh instrumen supervisi (.docx)</span>
          </button>
        </div>

        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>No</th>
                <th style={{ textAlign: 'left' }}>
                  Komponen dokumen administrasi
                </th>
                <th style={{ width: 130, textAlign: 'center' }}>
                  Sumber data
                </th>
                <th style={{ width: 110, textAlign: 'center' }}>
                  Skor telaah
                </th>
                <th style={{ textAlign: 'left' }}>
                  Catatan supervisor
                </th>
              </tr>
            </thead>
            <tbody>
              {checklistDocuments.map((d) => (
                <tr key={d.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                    {d.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {d.nama}
                  </td>
                  <td style={{ textAlign: 'center', color: '#15803d', fontWeight: 600 }}>
                    Tersedia di kelas
                  </td>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>
                    (0–2)
                  </td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>
                    Diperiksa saat supervisi {schoolProfile.rombelAktif}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
