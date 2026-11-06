import React, { useRef, useState } from 'react';
import {
  FileDown,
  Printer,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import type { ModulAjarDokumen } from '../types/perangkatAjar';
import type { SchoolProfile } from '../utils/schoolProfileStorage';
import { getSchoolProfile } from '../utils/schoolProfileStorage';
import { exportModulAjarToDocx } from '../utils/docxExporter';

interface ModulAjarViewerProps {
  modul: ModulAjarDokumen;
  schoolProfile?: SchoolProfile;
  onPrint: () => void;
  onBackToClassHub: () => void;
}

export const ModulAjarViewer: React.FC<ModulAjarViewerProps> = ({
  modul,
  schoolProfile,
  onPrint,
  onBackToClassHub,
}) => {
  const activeProfile = schoolProfile || getSchoolProfile();
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const handleCopyText = () => {
    let text = `MODUL AJAR KURIKULUM MERDEKA: ${modul.materiPokok}\n`;
    text += `Mata Pelajaran: ${modul.mataPelajaran} | Kelas: ${modul.kelas} (${modul.jenjangFase})\n`;
    text += `Alokasi Waktu: ${modul.alokasiWaktu}\n\n`;
    text += `TUJUAN PEMBELAJARAN (TP ${modul.tpKode}):\n${modul.tujuanPembelajaran}\n\n`;
    text += `PEMAHAMAN BERMAKNA:\n${modul.pemahamanBermakna}\n\n`;
    text += `PERTANYAAN PEMANTIK:\n${modul.pertanyaanPemantik.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Teks Modul Ajar berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
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
          <span className="badge badge-indigo">
            📘 Modul Ajar (RPP Kurikulum Merdeka)
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            TP {modul.tpKode} • {modul.alokasiWaktu}
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
                await exportModulAjarToDocx(modul, activeProfile);
                showToast('File Word (.docx) berhasil diunduh!');
              } catch (e: any) {
                alert('Gagal mengunduh file Word: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            title="Download file Microsoft Word (.docx) yang bisa diedit langsung"
          >
            <FileDown size={14} /> Unduh Word (.docx)
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
            marginBottom: 24,
          }}
        >
          {activeProfile.pakaiFormatKopSekolah && activeProfile.instansiDinas && (
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#475569', marginBottom: 2 }}>
              {activeProfile.instansiDinas}
            </div>
          )}
          <h2 style={{ fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0f172a' }}>
            {modul.namaSekolah || activeProfile.namaSekolah}
          </h2>
          {activeProfile.pakaiFormatKopSekolah && activeProfile.alamatSekolah && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0' }}>
              {activeProfile.alamatSekolah} {activeProfile.kotaSekolah ? `• ${activeProfile.kotaSekolah}` : ''}
            </p>
          )}
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', margin: '6px 0 2px' }}>
            MODUL AJAR KURIKULUM MERDEKA
          </h1>
          <p style={{ fontSize: 12, color: '#475569' }}>
            TAHUN AJARAN {modul.tahunAjaran || activeProfile.tahunAjaran} • SEMESTER {modul.semester.toUpperCase()}
          </p>
        </div>

        {/* I. INFORMASI UMUM */}
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: 4, marginBottom: 12 }}>
            I. INFORMASI UMUM
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', width: '28%', fontWeight: 700, color: '#475569' }}>Satuan Pendidikan</td>
                <td style={{ padding: '6px 8px' }}>: {modul.namaSekolah || activeProfile.namaSekolah}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Penyusun / Guru Mapel</td>
                <td style={{ padding: '6px 8px' }}>: {modul.namaGuru || activeProfile.namaGuru}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Mata Pelajaran</td>
                <td style={{ padding: '6px 8px' }}>: <strong>{modul.mataPelajaran}</strong></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Fase / Kelas / Rombel</td>
                <td style={{ padding: '6px 8px' }}>: {modul.jenjangFase} / Kelas {modul.kelas} ({activeProfile.rombelAktif || modul.rombel})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Elemen Capaian</td>
                <td style={{ padding: '6px 8px' }}>: {modul.elemen}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Alokasi Waktu</td>
                <td style={{ padding: '6px 8px' }}>: {modul.alokasiWaktu}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Model Pembelajaran</td>
                <td style={{ padding: '6px 8px' }}>: {modul.modelPembelajaran}</td>
              </tr>
            </tbody>
          </table>

          {/* Profil Pancasila & Sarana */}
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: '#1e40af' }}>Profil Pelajar Pancasila yang Dikembangkan:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#334155' }}>
                {modul.profilPelajarPancasila.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ color: '#1e40af' }}>Sarana & Prasarana:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#334155' }}>
                {modul.saranaPrasarana.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* II. KOMPONEN INTI */}
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: 4, marginBottom: 12 }}>
            II. KOMPONEN INTI PEMBELAJARAN
          </h3>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              A. Tujuan Pembelajaran (TP {modul.tpKode}):
            </div>
            <div style={{ fontSize: 13, color: '#1e293b', background: '#eff6ff', padding: '10px 14px', borderRadius: 8, marginTop: 4 }}>
              {modul.tujuanPembelajaran}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              B. Pemahaman Bermakna:
            </div>
            <div style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', marginTop: 2 }}>
              "{modul.pemahamanBermakna}"
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              C. Pertanyaan Pemantik:
            </div>
            <ol style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 13, color: '#334155' }}>
              {modul.pertanyaanPemantik.map((q, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{q}</li>
              ))}
            </ol>
          </div>

          {/* Rincian Kegiatan Pembelajaran per Pertemuan */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              D. Langkah-Langkah Kegiatan Pembelajaran:
            </div>

            {modul.kegiatanPembelajaran.map((keg) => (
              <div
                key={keg.pertemuan}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0d9488', marginBottom: 8 }}>
                  Pertemuan Ke-{keg.pertemuan} ({keg.alokasiMenit} Menit)
                </div>

                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 12.5, color: '#1e40af' }}>1. Kegiatan Pendahuluan:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#334155' }}>
                    {keg.pendahuluan.map((p, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 12.5, color: '#047857' }}>2. Kegiatan Inti (Sintaks PBL / Inkuiri):</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#334155' }}>
                    {keg.inti.map((it, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{it}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong style={{ fontSize: 12.5, color: '#b45309' }}>3. Kegiatan Penutup & Refleksi:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#334155' }}>
                    {keg.penutup.map((pn, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{pn}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* III. ASESMEN & RUBRIK KKTP */}
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: 4, marginBottom: 12 }}>
            III. ASESMEN PEMBELAJARAN & RUBRIK KRITERIA (KKTP)
          </h3>

          <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 12 }}>
            <div style={{ marginBottom: 4 }}><strong>• Asesmen Diagnostik:</strong> {modul.asesmen.diagnostik}</div>
            <div style={{ marginBottom: 4 }}><strong>• Asesmen Formatif:</strong> {modul.asesmen.formatif}</div>
            <div><strong>• Asesmen Sumatif:</strong> {modul.asesmen.sumatif}</div>
          </div>

          {modul.rubrikPenilaianSingkat && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1e3a8a', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '25%' }}>Kriteria Penilaian</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#b91c1c' }}>Baru Berkembang (0-60)</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#b45309' }}>Layak (61-70)</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#1d4ed8' }}>Cakap (71-85)</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '21%', background: '#047857' }}>Mahir (86-100)</th>
                </tr>
              </thead>
              <tbody>
                {modul.rubrikPenilaianSingkat.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{r.kriteria}</td>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontSize: 11.5 }}>{r.baruBerkembang}</td>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontSize: 11.5 }}>{r.layak}</td>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontSize: 11.5 }}>{r.cakap}</td>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontSize: 11.5 }}>{r.mahir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* IV. LAMPIRAN & REFERENSI */}
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: 4, marginBottom: 12 }}>
            IV. LAMPIRAN & REFERENSI
          </h3>
          <div style={{ fontSize: 12.5, color: '#334155' }}>
            <div style={{ marginBottom: 6 }}>
              <strong>A. Pengayaan & Remedial:</strong>
              <div style={{ paddingLeft: 12, marginTop: 2 }}>• Pengayaan: {modul.pengayaanDanRemedial.pengayaan}</div>
              <div style={{ paddingLeft: 12, marginTop: 2 }}>• Remedial: {modul.pengayaanDanRemedial.remedial}</div>
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>B. Glosarium:</strong>
              {modul.glosarium.map((g, i) => (
                <div key={i} style={{ paddingLeft: 12, marginTop: 2 }}>
                  • <strong>{g.istilah}:</strong> {g.definisi}
                </div>
              ))}
            </div>
            <div>
              <strong>C. Daftar Pustaka:</strong>
              {modul.daftarPustaka.map((dp, i) => (
                <div key={i} style={{ paddingLeft: 12, marginTop: 2 }}>• {dp}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Blok Pengesahan Tanda Tangan */}
        {activeProfile.tampilkanTandaTangan && (
          <div
            style={{
              marginTop: 36,
              paddingTop: 16,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              textAlign: 'center',
              fontSize: 12,
              color: '#1e293b',
              pageBreakInside: 'avoid',
            }}
          >
            <div>
              <div>Mengetahui,</div>
              <div style={{ marginBottom: 54 }}>Kepala Sekolah / Madrasah</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {activeProfile.namaKepalaSekolah || '......................................................'}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {activeProfile.nipKepalaSekolah ? `NIP. ${activeProfile.nipKepalaSekolah}` : 'NIP. -'}
              </div>
            </div>
            <div>
              <div>
                {activeProfile.kotaSekolah || 'Indonesia'}, {modul.createdAt}
              </div>
              <div style={{ marginBottom: 54 }}>Guru Mata Pelajaran</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {modul.namaGuru || activeProfile.namaGuru}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {activeProfile.nipGuru ? `NIP. ${activeProfile.nipGuru}` : 'NIP. -'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
