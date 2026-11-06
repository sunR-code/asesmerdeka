import React, { useRef, useState } from 'react';
import {
  FileDown,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Image,
} from 'lucide-react';
import type { LKPDDokumen } from '../types/perangkatAjar';
import type { SchoolProfile } from '../utils/schoolProfileStorage';
import { getSchoolProfile } from '../utils/schoolProfileStorage';
import { exportLKPDToDocx } from '../utils/docxExporter';
import { exportElementToImage } from '../utils/imageExporter';

interface LKPDViewerProps {
  lkpd: LKPDDokumen;
  schoolProfile?: SchoolProfile;
  onPrint: () => void;
  onBackToClassHub: () => void;
}

export const LKPDViewer: React.FC<LKPDViewerProps> = ({
  lkpd,
  schoolProfile,
  onPrint,
  onBackToClassHub,
}) => {
  const activeProfile = schoolProfile || getSchoolProfile();
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const handleCopyText = () => {
    let text = `LEMBAR KERJA PESERTA DIDIK (LKPD): ${lkpd.materiPokok}\n`;
    text += `Mata Pelajaran: ${lkpd.mataPelajaran} | Kelas: ${lkpd.kelas} (${lkpd.jenjangFase})\n\n`;
    text += `TUJUAN PEMBELAJARAN (TP ${lkpd.tpKode}):\n${lkpd.tujuanPembelajaran}\n\n`;
    text += `STIMULUS KASUS: ${lkpd.stimulusKasus.judul}\n${lkpd.stimulusKasus.teks}\n\n`;
    text += `PERTANYAAN DISKUSI:\n`;
    lkpd.pertanyaanAnalisis.forEach((pa) => {
      text += `${pa.nomor}. ${pa.pertanyaan}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Teks LKPD berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportImage = async () => {
    if (!sheetRef.current) return;
    setIsExportingImage(true);
    showToast('📸 Menyiapkan gambar LKPD resolusi tinggi...');
    try {
      const cleanName = `LKPD_${lkpd.materiPokok.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await exportElementToImage(sheetRef.current, cleanName);
      showToast('Gambar LKPD berhasil disimpan! Siap dibagikan ke WhatsApp.');
    } catch (e: any) {
      alert('Gagal mengekspor gambar: ' + e.message);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 960, margin: '20px auto', padding: '0 16px' }}>
      {toastMsg && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#059669',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(5, 150, 105, 0.28)',
            zIndex: 999,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Check size={16} /> {toastMsg}
        </div>
      )}

      {/* Top Controls Action Bar */}
      <div
        className="no-print glass-panel"
        style={{
          padding: '14px 20px',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onBackToClassHub}
            className="btn btn-sm btn-outline"
            style={{ borderColor: '#cbd5e1', background: '#f8fafc', fontWeight: 700 }}
          >
            <ArrowLeft size={14} /> Materi Kelas
          </button>
          <span className="badge badge-emerald">
            📑 Lembar Kerja Peserta Didik (LKPD)
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            TP {lkpd.tpKode} • {lkpd.alokasiWaktu}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleCopyText} className="btn btn-sm btn-outline">
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copied ? 'Tersalin!' : 'Salin Teks'}
          </button>

          <button
            onClick={async () => {
              try {
                await exportLKPDToDocx(lkpd, activeProfile);
                showToast('File Word LKPD (.docx) berhasil diunduh!');
              } catch (e: any) {
                alert('Gagal mengunduh file Word: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' }}
            title="Download file Microsoft Word (.docx) siap cetak"
          >
            <FileDown size={14} /> Unduh Word (.docx)
          </button>

          <button
            onClick={handleExportImage}
            disabled={isExportingImage}
            className="btn btn-sm btn-secondary"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff' }}
            title="Download gambar PNG resolusi tinggi untuk dibagikan di WhatsApp kelas"
          >
            <Image size={14} /> {isExportingImage ? 'Memproses...' : 'Unduh Gambar (.png)'}
          </button>

          <button onClick={onPrint} className="btn btn-sm btn-success">
            <Printer size={14} /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet Canvas */}
      <div
        ref={sheetRef}
        className="print-sheet"
        style={{
          background: '#ffffff',
          color: '#1e293b',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 48px',
          boxShadow: 'var(--shadow-lg)',
          minHeight: 800,
        }}
      >
        {/* Kop Surat Sekolah */}
        <div
          className="print-kop"
          style={{
            textAlign: 'center',
            borderBottom: '3px double #334155',
            paddingBottom: 12,
            marginBottom: 20,
          }}
        >
          {activeProfile.pakaiFormatKopSekolah && activeProfile.instansiDinas && (
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#475569', marginBottom: 2 }}>
              {activeProfile.instansiDinas}
            </div>
          )}
          <h2 style={{ fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0f172a' }}>
            {lkpd.namaSekolah || activeProfile.namaSekolah}
          </h2>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0d9488', margin: '4px 0 2px' }}>
            LEMBAR KERJA PESERTA DIDIK (LKPD)
          </h1>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
            TOPIK: {lkpd.materiPokok.toUpperCase()}
          </p>
        </div>

        {/* Tabel Identitas Siswa & Mata Pelajaran */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 16,
            background: '#f8fafc',
            padding: '14px 18px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            marginBottom: 20,
            fontSize: 12.5,
          }}
        >
          <div>
            <div style={{ marginBottom: 4 }}><strong>Mata Pelajaran:</strong> {lkpd.mataPelajaran}</div>
            <div style={{ marginBottom: 4 }}><strong>Kelas / Rombel:</strong> Kelas {lkpd.kelas} ({activeProfile.rombelAktif || lkpd.rombel}) • Sem. {lkpd.semester}</div>
            <div style={{ marginBottom: 4 }}><strong>Waktu:</strong> {lkpd.alokasiWaktu}</div>
            <div><strong>Tujuan Belajar:</strong> {lkpd.tujuanPembelajaran}</div>
          </div>
          <div>
            <div style={{ marginBottom: 4 }}><strong>Nama Kelompok:</strong> ....................................................</div>
            <div style={{ marginBottom: 2 }}><strong>Anggota Kelompok:</strong></div>
            <div style={{ color: '#475569', fontSize: 12 }}>1. ............................................................................</div>
            <div style={{ color: '#475569', fontSize: 12 }}>2. ............................................................................</div>
            <div style={{ color: '#475569', fontSize: 12 }}>3. ............................................................................</div>
            <div style={{ color: '#475569', fontSize: 12 }}>4. ............................................................................</div>
          </div>
        </div>

        {/* Petunjuk Belajar */}
        <div style={{ marginBottom: 22, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 6 }}>
            📌 Petunjuk Pengerjaan LKPD:
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#14532d', lineHeight: 1.5 }}>
            {lkpd.petunjukPengerjaan.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ol>
        </div>

        {/* I. STIMULUS KASUS */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 8 }}>
            I. Stimulus Kasus: {lkpd.stimulusKasus.judul}
          </h3>
          <div style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', lineHeight: 1.6, background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 }}>
            "{lkpd.stimulusKasus.teks}"
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#b45309' }}>
            ⚡ Tantangan Awal: {lkpd.stimulusKasus.pertanyaanAwal}
          </div>
        </div>

        {/* II. LANGKAH KERJA EKSPLORASI */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 12 }}>
            II. Langkah Kerja Eksplorasi Kelompok
          </h3>

          {lkpd.langkahAktivitas.map((act) => (
            <div key={act.langkahKe} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                Langkah {act.langkahKe}: {act.instruksi}
              </div>
              {act.bantuanAtauTabel ? (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#475569' }}>
                  {act.bantuanAtauTabel.map((b, bi) => (
                    <div key={bi} style={{ marginBottom: 4 }}>{b}</div>
                  ))}
                </div>
              ) : (
                <div style={{ border: '1px dashed #cbd5e1', borderRadius: 6, padding: '14px 16px', minHeight: 70, color: '#94a3b8', fontSize: 12 }}>
                  Catatan penyelidikan / perhitungan kelompok:
                </div>
              )}
            </div>
          ))}
        </div>

        {/* III. PERTANYAAN DISKUSI ANALISIS */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 12 }}>
            III. Pertanyaan Diskusi Kritis & Analisis
          </h3>

          {lkpd.pertanyaanAnalisis.map((pa) => (
            <div key={pa.nomor} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                {pa.nomor}. {pa.pertanyaan}
              </div>
              {pa.petunjukPengerjaan && (
                <div style={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic', marginBottom: 4 }}>
                  (Petunjuk: {pa.petunjukPengerjaan})
                </div>
              )}
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: 6, padding: '14px 16px', minHeight: 60, color: '#94a3b8', fontSize: 12 }}>
                Lembar jawaban kelompok:
              </div>
            </div>
          ))}
        </div>

        {/* IV. KESIMPULAN & REFLEKSI */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 10 }}>
            IV. Kesimpulan & Refleksi Mandiri
          </h3>
          {lkpd.kesimpulanRefleksi.map((kr, i) => (
            <div key={i} style={{ fontSize: 12.5, color: '#334155', marginBottom: 8, background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              {kr}
            </div>
          ))}
        </div>

        {/* Footer Dokumen */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
          <div>{lkpd.namaSekolah || activeProfile.namaSekolah} • Kurikulum Merdeka</div>
          <div>Lembar Kerja Peserta Didik (LKPD)</div>
        </div>
      </div>
    </div>
  );
};
