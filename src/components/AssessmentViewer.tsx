import React, { useState, useRef } from 'react';
import { 
  Copy, 
  Printer, 
  Check,
  FileDown,
  Pencil,
  Sparkles,
  Trash2,
  Save,
  X,
  PlusCircle,
  RotateCcw,
  Image,
  Table2,
  BookOpen,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import type { 
  AsesmenDokumen, 
  UserQuota, 
  ButirSoal, 
  SoalPilihanGanda,
  SoalUraian 
} from '../types/assessment';
import type { SchoolProfile } from '../utils/schoolProfileStorage';
import { getSchoolProfile } from '../utils/schoolProfileStorage';
import { exportToDocx, exportKisiKisiToDocx } from '../utils/docxExporter';
import { exportElementToImage } from '../utils/imageExporter';
import { isLicensed } from '../utils/licenseManager';
import { regenerateSingleQuestion } from '../services/aiGenerator';

interface AssessmentViewerProps {
  assessment: AsesmenDokumen;
  mode: 'worksheet' | 'teacher_guide' | 'kisi_kisi';
  quota: UserQuota;
  schoolProfile?: SchoolProfile;
  onPrint: () => void;
  onUpdateAssessment?: (updated: AsesmenDokumen) => void;
  onSwitchMode?: (newMode: 'worksheet' | 'teacher_guide' | 'kisi_kisi') => void;
  onCreateRangkumanFromAssessment?: () => void;
  onBackToClassHub?: () => void;
}

export const AssessmentViewer: React.FC<AssessmentViewerProps> = ({
  assessment,
  mode,
  quota,
  schoolProfile,
  onPrint,
  onUpdateAssessment,
  onSwitchMode,
  onCreateRangkumanFromAssessment,
  onBackToClassHub,
}) => {
  const activeProfile = schoolProfile || getSchoolProfile();
  const [copied, setCopied] = useState(false);
  const [editingSoalId, setEditingSoalId] = useState<string | null>(null);
  const [draftSoal, setDraftSoal] = useState<ButirSoal | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [showKartuSoal, setShowKartuSoal] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportImage = async () => {
    if (!sheetRef.current) return;
    setIsExportingImage(true);
    try {
      const suffix = mode === 'worksheet' ? 'Lembar_Siswa' : mode === 'kisi_kisi' ? 'Kisi_Kisi_Soal' : 'Kunci_Guru';
      const filename = `${assessment.judul}_${suffix}`;
      await exportElementToImage(sheetRef.current, filename);
      showToast('📸 Gambar PNG berhasil diunduh!');
    } catch (err: any) {
      alert('Gagal mengunduh gambar: ' + err.message);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleCopyText = () => {
    let text = `${assessment.namaSekolah}\n`;
    text += `${assessment.judul.toUpperCase()}\n`;
    text += `Mata Pelajaran: ${assessment.mataPelajaran} | Kelas: ${assessment.kelas}\n`;
    text += `Alokasi Waktu: ${assessment.alokasiWaktu}\n\n`;
    
    text += `PETUNJUK UMUM:\n`;
    assessment.petunjukUmum.forEach((p, idx) => {
      text += `${idx + 1}. ${p}\n`;
    });
    text += `\n--- BUTIR SOAL ---\n\n`;

    assessment.soalList.forEach((soal) => {
      if (soal.tipe === 'pilihan_ganda') {
        text += `${soal.nomor}. ${soal.pertanyaan}\n`;
        if (soal.stimulus) text += `(Stimulus: ${soal.stimulus})\n`;
        soal.pilihan.forEach(opt => {
          text += `   ${opt.label}. ${opt.teks}\n`;
        });
        if (mode === 'teacher_guide') {
          text += `   [Kunci: ${soal.kunci}] - Pembahasan: ${soal.pembahasan}\n`;
        }
        text += '\n';
      } else if (soal.tipe === 'pilihan_ganda_kompleks') {
        text += `${soal.nomor}. [AKM] ${soal.pertanyaan}\n`;
        if (soal.stimulus) text += `(Stimulus: ${soal.stimulus})\n`;
        soal.pernyataan.forEach((p, i) => {
          text += `   ${i + 1}. ${p.teks} -> [${p.isBenar ? 'BENAR' : 'SALAH'}]\n`;
        });
        text += '\n';
      } else if (soal.tipe === 'uraian') {
        text += `${soal.nomor}. [URAIAN] ${soal.pertanyaan}\n`;
        if (mode === 'teacher_guide') {
          text += `   Pedoman Penskoran: ${soal.pedomanPenskoran}\n`;
        }
        text += '\n';
      }
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Start Editing
  const startEdit = (soal: ButirSoal) => {
    setEditingSoalId(soal.id);
    setDraftSoal(JSON.parse(JSON.stringify(soal))); // deep copy
  };

  // Save Editing
  const saveEdit = () => {
    if (!draftSoal || !onUpdateAssessment) return;
    const updatedList = assessment.soalList.map(s => s.id === draftSoal.id ? draftSoal : s);
    const updatedDoc: AsesmenDokumen = {
      ...assessment,
      soalList: updatedList
    };
    onUpdateAssessment(updatedDoc);
    setEditingSoalId(null);
    setDraftSoal(null);
    showToast(`Perubahan Soal No. ${draftSoal.nomor} berhasil disimpan.`);
  };

  // Cancel Editing
  const cancelEdit = () => {
    setEditingSoalId(null);
    setDraftSoal(null);
  };

  // Regenerate 1 Question
  const handleRegenerate = async (soal: ButirSoal) => {
    if (!onUpdateAssessment) return;
    setRegeneratingId(soal.id);
    try {
      const newQuestion = await regenerateSingleQuestion(assessment, soal);
      const updatedList = assessment.soalList.map(s => s.id === soal.id ? newQuestion : s);
      const updatedDoc: AsesmenDokumen = {
        ...assessment,
        soalList: updatedList
      };
      onUpdateAssessment(updatedDoc);
      showToast(`✨ Soal No. ${soal.nomor} berhasil diregenerasi oleh AI!`);
    } catch (e: any) {
      alert('Gagal meregenerasi butir soal: ' + e.message);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Delete Question
  const handleDeleteSoal = (soalId: string, nomor: number) => {
    if (!onUpdateAssessment) return;
    if (!confirm(`Hapus Butir Soal No. ${nomor}? Nomor butir soal lainnya akan otomatis diurutkan kembali.`)) {
      return;
    }
    const filtered = assessment.soalList.filter(s => s.id !== soalId);
    // Re-numbering
    const reindexed = filtered.map((s, idx) => ({
      ...s,
      nomor: idx + 1
    }));
    const updatedDoc: AsesmenDokumen = {
      ...assessment,
      soalList: reindexed
    };
    onUpdateAssessment(updatedDoc);
    showToast(`Soal No. ${nomor} berhasil dihapus.`);
  };

  // Add New Question
  const handleAddNewQuestion = (tipe: 'pilihan_ganda' | 'uraian') => {
    if (!onUpdateAssessment) return;
    const nextNomor = assessment.soalList.length + 1;
    let newSoal: ButirSoal;

    if (tipe === 'pilihan_ganda') {
      newSoal = {
        id: `pg-manual-${Date.now().toString(36)}`,
        nomor: nextNomor,
        tipe: 'pilihan_ganda',
        stimulus: 'Tulis stimulus atau konteks soal di sini...',
        pertanyaan: 'Tulis pertanyaan pilihan ganda baru di sini...',
        pilihan: [
          { label: 'A', teks: 'Pilihan jawaban A' },
          { label: 'B', teks: 'Pilihan jawaban B' },
          { label: 'C', teks: 'Pilihan jawaban C' },
          { label: 'D', teks: 'Pilihan jawaban D' }
        ],
        kunci: 'A',
        pembahasan: 'Tulis pembahasan kunci jawaban di sini...',
        levelKognitif: 'C3 (Aplikasi)',
        indikatorSoal: 'Indikator ketercapaian soal baru.',
        skor: 10
      };
    } else {
      newSoal = {
        id: `ur-manual-${Date.now().toString(36)}`,
        nomor: nextNomor,
        tipe: 'uraian',
        stimulus: 'Tulis stimulus kasus di sini...',
        pertanyaan: 'Tulis pertanyaan uraian HOTS di sini...',
        pedomanPenskoran: 'Skor 4: Menjawab lengkap dan logis.\nSkor 2: Menjawab sebagian.\nSkor 0: Tidak menjawab.',
        contohJawaban: 'Contoh jawaban ideal siswa...',
        levelKognitif: 'C4 (Analisis)',
        indikatorSoal: 'Menganalisis permasalahan...',
        skorMaksimal: 20
      };
    }

    const updatedDoc: AsesmenDokumen = {
      ...assessment,
      soalList: [...assessment.soalList, newSoal]
    };
    onUpdateAssessment(updatedDoc);
    startEdit(newSoal);
    showToast(`Butir Soal No. ${nextNomor} ditambahkan. Silakan edit isinya.`);
  };

  const isPro = isLicensed(quota.tier);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 950, margin: '24px auto', padding: '0 16px' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print" style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 999,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <Check size={16} /> {toastMessage}
        </div>
      )}

      {/* Top Controls Action Bar */}
      <div className="no-print glass-panel" style={{
        padding: '16px 24px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {onBackToClassHub && (
            <button
              onClick={onBackToClassHub}
              className="btn btn-sm btn-outline"
              style={{ borderColor: '#cbd5e1', background: '#f8fafc', fontWeight: 700 }}
              title="Kembali ke Daftar Materi / TP Kelas"
            >
              <ArrowLeft size={14} /> Materi Kelas
            </button>
          )}
          <span className="badge badge-indigo">
            {mode === 'worksheet'
              ? '📄 Lembar Siswa Siap Ujian'
              : mode === 'kisi_kisi'
              ? '📋 Kisi-Kisi & Kartu Soal Otomatis (0 Kuota)'
              : '📘 Kunci Jawaban & Rubrik KKTP'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Dibuat: {assessment.createdAt}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {mode === 'kisi_kisi' && (
            <button
              onClick={() => setShowKartuSoal(!showKartuSoal)}
              className="btn btn-sm btn-outline"
              style={{ borderColor: '#93c5fd', color: '#1d4ed8', background: '#eff6ff' }}
            >
              <Table2 size={14} /> {showKartuSoal ? 'Sembunyikan Kartu Soal' : 'Tampilkan Kartu Soal'}
            </button>
          )}

          <button onClick={handleCopyText} className="btn btn-sm btn-outline">
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copied ? 'Tersalin!' : 'Salin Teks'}
          </button>

          <button 
            onClick={async () => {
              try {
                if (mode === 'kisi_kisi') {
                  await exportKisiKisiToDocx(assessment);
                } else {
                  await exportToDocx(assessment, mode === 'teacher_guide');
                }
              } catch (e: any) {
                alert('Gagal mengekspor file Word: ' + e.message);
              }
            }} 
            className="btn btn-sm btn-primary"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            title="Download file Microsoft Word (.docx) yang bisa diedit langsung"
          >
            <FileDown size={14} /> {mode === 'kisi_kisi' ? 'Unduh Kisi-Kisi (.docx)' : 'Unduh Word (.docx)'}
          </button>

          <button
            onClick={handleExportImage}
            disabled={isExportingImage}
            className="btn btn-sm btn-secondary"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', color: '#ffffff' }}
            title="Download lembar ini sebagai Gambar (.png) berkualitas tinggi untuk dibagikan di WhatsApp"
          >
            <Image size={14} /> {isExportingImage ? 'Memproses...' : 'Unduh Gambar (.png)'}
          </button>
          
          <button onClick={onPrint} className="btn btn-sm btn-success">
            <Printer size={14} /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet Canvas */}
      <div ref={sheetRef} className="print-sheet" style={{
        background: '#ffffff',
        color: '#1e293b',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 48px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        minHeight: 800,
        overflow: 'hidden'
      }}>
        
        {/* Anti-piracy watermark for Free tier */}
        {!isPro && (
          <div style={{
            position: 'absolute',
            top: '40%',
            left: '10%',
            right: '10%',
            textAlign: 'center',
            transform: 'rotate(-25deg)',
            fontSize: 32,
            fontWeight: 800,
            color: 'rgba(79, 70, 229, 0.06)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 1
          }}>
            ASESMERDEKA • LISENSI EVALUASI PRIBADI
          </div>
        )}

        {/* Kop Surat / Header Asesmen */}
        <div className="print-kop" style={{
          textAlign: 'center',
          borderBottom: '3px double #334155',
          paddingBottom: 12,
          marginBottom: 24,
          position: 'relative'
        }}>
          {activeProfile.pakaiFormatKopSekolah && activeProfile.instansiDinas && (
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#475569', marginBottom: 2 }}>
              {activeProfile.instansiDinas}
            </div>
          )}
          <h2 style={{ fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0f172a' }}>
            {assessment.namaSekolah || activeProfile.namaSekolah}
          </h2>
          {activeProfile.pakaiFormatKopSekolah && activeProfile.alamatSekolah && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0' }}>
              {activeProfile.alamatSekolah} {activeProfile.kotaSekolah ? `• ${activeProfile.kotaSekolah}` : ''}
            </p>
          )}
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '6px 0 4px' }}>
            {mode === 'kisi_kisi'
              ? `KISI-KISI PENULISAN SOAL • ${assessment.judul.toUpperCase()}`
              : assessment.judul.toUpperCase()}
          </h1>
          <p style={{ fontSize: 12, color: '#475569' }}>
            TAHUN AJARAN {assessment.tahunAjaran || activeProfile.tahunAjaran} • SEMESTER {activeProfile.semester.toUpperCase()} • KURIKULUM MERDEKA
          </p>
        </div>

        {/* Identitas Siswa & Mata Pelajaran */}
        <div className="doc-identity-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          background: '#f8fafc',
          padding: '14px 20px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          marginBottom: 24,
          fontSize: 13
        }}>
          <div>
            <div style={{ marginBottom: 4 }}><strong>Mata Pelajaran:</strong> {assessment.mataPelajaran}</div>
            <div style={{ marginBottom: 4 }}>
              <strong>Kelas / Rombel:</strong> {activeProfile.rombelAktif || `Kelas ${assessment.kelas}`} ({assessment.jenjangFase.split(' ')[0]} {assessment.jenjangFase.split(' ')[1]})
            </div>
            <div><strong>Materi Pokok:</strong> {assessment.materiPokok}</div>
          </div>
          <div>
            {mode === 'worksheet' ? (
              <>
                <div style={{ marginBottom: 4 }}>Nama Siswa : ....................................................</div>
                <div style={{ marginBottom: 4 }}>No. Absen / NIS : ....................................................</div>
                <div>Waktu : {assessment.alokasiWaktu}</div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 4 }}><strong>Guru Penyusun:</strong> {assessment.namaPenyusun || activeProfile.namaGuru}</div>
                <div style={{ marginBottom: 4 }}><strong>Tipe Asesmen:</strong> {assessment.tipeAsesmen}</div>
                <div><strong>Jumlah Soal:</strong> {assessment.soalList.length} Butir ({assessment.alokasiWaktu})</div>
              </>
            )}
          </div>
        </div>

        {/* MODE KHUSUS: KISI-KISI & KARTU SOAL */}
        {mode === 'kisi_kisi' && (
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: 8 }}>
                I. Matriks Kisi-Kisi Penulisan Soal
              </h3>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 12, background: '#f1f5f9', padding: '10px 14px', borderRadius: 6 }}>
                <strong>Capaian Pembelajaran (CP):</strong> {assessment.capaianPembelajaran}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: '#ffffff', textAlign: 'center' }}>
                    <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', width: '4%' }}>No</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '24%', textAlign: 'left' }}>Tujuan Pembelajaran (TP)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '16%', textAlign: 'left' }}>Materi Pokok</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '26%', textAlign: 'left' }}>Indikator Soal</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', width: '10%' }}>Level Kognitif</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', width: '10%' }}>Bentuk Soal</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', width: '5%' }}>No. Soal</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', width: '5%' }}>Bobot</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.soalList.map((soal, idx) => {
                    const tpText = assessment.tujuanPembelajaran[idx % assessment.tujuanPembelajaran.length] || assessment.tujuanPembelajaran[0] || '-';
                    const bentukLabel = soal.tipe === 'pilihan_ganda' ? 'Pilihan Ganda' : soal.tipe === 'pilihan_ganda_kompleks' ? 'PG Kompleks (AKM)' : 'Uraian HOTS';
                    const bobot = soal.tipe === 'uraian' ? soal.skorMaksimal : soal.skor;

                    return (
                      <tr key={soal.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '8px 6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', verticalAlign: 'top' }}>{tpText}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', verticalAlign: 'top' }}>{assessment.materiPokok}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', verticalAlign: 'top' }}>{soal.indikatorSoal}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, color: '#1e40af' }}>{soal.levelKognitif}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{bentukLabel}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }}>{soal.nomor}</td>
                        <td style={{ padding: '8px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{bobot}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* KARTU SOAL INDIVIDUAL */}
            {showKartuSoal && (
              <div style={{ marginTop: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: 12 }}>
                  II. Lampiran Kartu Soal Kurikulum Merdeka
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {assessment.soalList.map((soal, idx) => {
                    const tpText = assessment.tujuanPembelajaran[idx % assessment.tujuanPembelajaran.length] || assessment.tujuanPembelajaran[0] || '-';
                    const kunciText =
                      soal.tipe === 'pilihan_ganda'
                        ? `Opsi ${soal.kunci}`
                        : soal.tipe === 'pilihan_ganda_kompleks'
                        ? soal.pernyataan.map((p, i) => `${i + 1}:${p.isBenar ? 'B' : 'S'}`).join(', ')
                        : soal.contohJawaban;

                    return (
                      <div key={soal.id} style={{ border: '1px solid #94a3b8', borderRadius: 6, overflow: 'hidden', pageBreakInside: 'avoid' }}>
                        <div style={{ background: '#f1f5f9', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                          <span>KARTU SOAL NOMOR {soal.nomor} ({soal.tipe === 'pilihan_ganda' ? 'PILIHAN GANDA' : soal.tipe === 'pilihan_ganda_kompleks' ? 'AKM KOMPLEKS' : 'URAIAN'})</span>
                          <span>Level: {soal.levelKognitif} • Skor: {soal.tipe === 'uraian' ? soal.skorMaksimal : soal.skor}</span>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '28%', padding: '6px 10px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', fontWeight: 600, background: '#f8fafc' }}>Tujuan Pembelajaran</td>
                              <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{tpText}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', fontWeight: 600, background: '#f8fafc' }}>Indikator Soal</td>
                              <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{soal.indikatorSoal}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', fontWeight: 600, background: '#f8fafc', verticalAlign: 'top' }}>Rumusan Butir Soal</td>
                              <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>
                                {soal.stimulus && <div style={{ fontStyle: 'italic', color: '#475569', marginBottom: 4 }}>Stimulus: {soal.stimulus}</div>}
                                <div style={{ fontWeight: 600 }}>{soal.pertanyaan}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0', fontWeight: 600, background: '#f0fdf4', color: '#166534' }}>Kunci / Pedoman Skor</td>
                              <td style={{ padding: '6px 10px', background: '#f0fdf4', color: '#166534', fontWeight: 600 }}>{kunciText}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Petunjuk Umum */}
        {mode === 'worksheet' && (
          <div style={{ marginBottom: 24, fontSize: 12, background: '#f1f5f9', padding: '10px 16px', borderRadius: 6 }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>Petunjuk Umum Pengerjaan:</strong>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              {assessment.petunjukUmum.map((pt, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{pt}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Content Section: Butir Soal (Tampil pada mode worksheet & teacher_guide) */}
        {mode !== 'kisi_kisi' && (
        <div style={{ position: 'relative', zIndex: 2 }}>
          
          {assessment.soalList.map((soal) => {
            const isEditing = editingSoalId === soal.id && draftSoal;
            const isRegenerating = regeneratingId === soal.id;

            return (
              <div 
                key={soal.id} 
                style={{
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: '1px dashed #cbd5e1',
                  pageBreakInside: 'avoid',
                  position: 'relative'
                }}
              >
                
                {/* Non-print action buttons: Edit, Regenerate, Delete */}
                <div className="no-print" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 6,
                  marginBottom: 8
                }}>
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => startEdit(soal)}
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 11, padding: '3px 8px', borderColor: '#cbd5e1', color: '#475569' }}
                        title="Edit Teks & Opsi Butir Soal Ini"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleRegenerate(soal)}
                        disabled={isRegenerating}
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 11, padding: '3px 8px', borderColor: '#818cf8', color: '#4f46e5' }}
                        title="Buat ulang butir nomor ini dengan AI"
                      >
                        {isRegenerating ? (
                          <>
                            <RotateCcw size={12} className="spin-animation" /> Membuat...
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} /> Regenerasi AI
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteSoal(soal.id, soal.nomor)}
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 11, padding: '3px 8px', borderColor: '#fca5a5', color: '#dc2626' }}
                        title="Hapus Butir Soal Ini"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>

                {/* MODE EDIT FORM */}
                {isEditing && draftSoal && (
                  <div className="no-print" style={{
                    background: '#f8fafc',
                    border: '2px solid #6366f1',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 16
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <strong style={{ fontSize: 13, color: '#4338ca' }}>
                        ✏️ Edit Soal No. {draftSoal.nomor} ({draftSoal.tipe.replace('_', ' ').toUpperCase()})
                      </strong>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={saveEdit} className="btn btn-sm btn-success" style={{ fontSize: 12 }}>
                          <Save size={13} /> Simpan
                        </button>
                        <button onClick={cancelEdit} className="btn btn-sm btn-outline" style={{ fontSize: 12 }}>
                          <X size={13} /> Batal
                        </button>
                      </div>
                    </div>

                    {/* Stimulus Edit */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4, color: '#334155' }}>
                        Stimulus / Teks Bacaan:
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        value={draftSoal.stimulus || ''}
                        onChange={(e) => setDraftSoal({ ...draftSoal, stimulus: e.target.value })}
                        style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    {/* Pertanyaan Edit */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4, color: '#334155' }}>
                        Pertanyaan:
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        value={draftSoal.pertanyaan}
                        onChange={(e) => setDraftSoal({ ...draftSoal, pertanyaan: e.target.value })}
                        style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    {/* If PG: Edit Options & Kunci */}
                    {draftSoal.tipe === 'pilihan_ganda' && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6, color: '#334155' }}>
                          Pilihan Jawaban & Kunci:
                        </label>
                        {(draftSoal as SoalPilihanGanda).pilihan.map((opt, oIdx) => (
                          <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <input
                              type="radio"
                              name={`kunci-${draftSoal.id}`}
                              checked={(draftSoal as SoalPilihanGanda).kunci === opt.label}
                              onChange={() => setDraftSoal({ ...draftSoal, kunci: opt.label } as SoalPilihanGanda)}
                              style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }}
                              title="Pilih sebagai kunci jawaban"
                            />
                            <span style={{ fontWeight: 700, width: 20 }}>{opt.label}.</span>
                            <input
                              type="text"
                              className="form-input"
                              value={opt.teks}
                              onChange={(e) => {
                                const newPilihan = [...(draftSoal as SoalPilihanGanda).pilihan];
                                newPilihan[oIdx].teks = e.target.value;
                                setDraftSoal({ ...draftSoal, pilihan: newPilihan } as SoalPilihanGanda);
                              }}
                              style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', fontSize: 13 }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pembahasan or Uraian Scoring Edit */}
                    {draftSoal.tipe === 'uraian' ? (
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4, color: '#334155' }}>
                          Pedoman Penskoran:
                        </label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          value={(draftSoal as SoalUraian).pedomanPenskoran || ''}
                          onChange={(e) => setDraftSoal({ ...draftSoal, pedomanPenskoran: e.target.value } as SoalUraian)}
                          style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', fontSize: 13 }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4, color: '#334155' }}>
                          Pembahasan Guru:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={draftSoal.pembahasan || ''}
                          onChange={(e) => setDraftSoal({ ...draftSoal, pembahasan: e.target.value } as any)}
                          style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', fontSize: 13 }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW REGULER / PRINT TAMPILAN SOAL */}
                {/* Stimulus Kontekstual */}
                {soal.stimulus && (
                  <div style={{
                    background: '#f8fafc',
                    borderLeft: '4px solid #4f46e5',
                    padding: '10px 14px',
                    borderRadius: '0 8px 8px 0',
                    marginBottom: 10,
                    fontSize: 13,
                    fontStyle: 'italic',
                    color: '#334155',
                    lineHeight: 1.5
                  }}>
                    <strong>Stimulus Soal No. {soal.nomor}:</strong> {soal.stimulus}
                  </div>
                )}

                {/* Header Soal & Indikator (Guru Mode) */}
                {mode === 'teacher_guide' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      {soal.levelKognitif}
                    </span>
                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4 }}>
                      Skor: {soal.tipe === 'uraian' ? soal.skorMaksimal : soal.skor}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      Indikator: {soal.indikatorSoal}
                    </span>
                  </div>
                )}

                {/* Pertanyaan */}
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
                  {soal.nomor}. {soal.pertanyaan}
                </div>

                {/* Tipe 1: Pilihan Ganda */}
                {soal.tipe === 'pilihan_ganda' && (
                  <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    {soal.pilihan.map((opt) => (
                      <div 
                        key={opt.label}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          padding: mode === 'teacher_guide' && opt.label === soal.kunci ? '4px 8px' : '2px 0',
                          background: mode === 'teacher_guide' && opt.label === soal.kunci ? '#dcfce7' : 'transparent',
                          borderRadius: 4,
                          fontWeight: mode === 'teacher_guide' && opt.label === soal.kunci ? 700 : 400,
                          color: mode === 'teacher_guide' && opt.label === soal.kunci ? '#15803d' : '#334155'
                        }}
                      >
                        <span style={{ fontWeight: 700, width: 20 }}>{opt.label}.</span>
                        <span>{opt.teks}</span>
                        {mode === 'teacher_guide' && opt.label === soal.kunci && (
                          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700 }}>[KUNCI JAWABAN]</span>
                        )}
                      </div>
                    ))}
                    
                    {mode === 'teacher_guide' && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#166534' }}>
                        <strong>Pembahasan Tuntas:</strong> {soal.pembahasan}
                      </div>
                    )}
                  </div>
                )}

                {/* Tipe 2: Pilihan Ganda Kompleks (AKM) */}
                {soal.tipe === 'pilihan_ganda_kompleks' && (
                  <div style={{ marginTop: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                          <th style={{ padding: '6px 10px', border: '1px solid #cbd5e1' }}>Pernyataan</th>
                          <th style={{ width: 80, padding: '6px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Benar</th>
                          <th style={{ width: 80, padding: '6px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Salah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {soal.pernyataan.map((p, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1' }}>{p.teks}</td>
                            <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', textAlign: 'center', background: mode === 'teacher_guide' && p.isBenar ? '#dcfce7' : '' }}>
                              {mode === 'teacher_guide' && p.isBenar ? '✔ (Kunci)' : '○'}
                            </td>
                            <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', textAlign: 'center', background: mode === 'teacher_guide' && !p.isBenar ? '#fee2e2' : '' }}>
                              {mode === 'teacher_guide' && !p.isBenar ? '✔ (Kunci)' : '○'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {mode === 'teacher_guide' && (
                      <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#166534' }}>
                        <strong>Analisis Pembahasan:</strong> {soal.pembahasan}
                      </div>
                    )}
                  </div>
                )}

                {/* Tipe 3: Uraian */}
                {soal.tipe === 'uraian' && (
                  <div style={{ marginTop: 8 }}>
                    {mode === 'worksheet' ? (
                      <div style={{
                        height: 100,
                        border: '1px dashed #94a3b8',
                        borderRadius: 6,
                        background: '#f8fafc',
                        padding: 10,
                        fontSize: 11,
                        color: '#94a3b8'
                      }}>
                        Lembar Jawab Siswa:
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ padding: '8px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                          <strong>Pedoman Penskoran:</strong>
                          <pre style={{ fontFamily: 'inherit', margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                            {soal.pedomanPenskoran}
                          </pre>
                        </div>
                        <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#166534' }}>
                          <strong>Contoh Jawaban Ideal:</strong> {soal.contohJawaban}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}

          {/* Tombol Tambah Butir Soal Baru (Non-Print) */}
          <div className="no-print" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '20px 0',
            borderTop: '2px dashed #cbd5e1',
            marginTop: 16
          }}>
            <button
              onClick={() => handleAddNewQuestion('pilihan_ganda')}
              className="btn btn-sm btn-outline"
              style={{ color: '#4f46e5', borderColor: '#818cf8' }}
            >
              <PlusCircle size={14} /> Tambah Soal Pilihan Ganda
            </button>
            <button
              onClick={() => handleAddNewQuestion('uraian')}
              className="btn btn-sm btn-outline"
              style={{ color: '#0d9488', borderColor: '#2dd4bf' }}
            >
              <PlusCircle size={14} /> Tambah Soal Uraian HOTS
            </button>
          </div>

          {/* Section Rubrik KKTP */}
          {assessment.rubrikKKTP.length > 0 && (
            <div className="print-page-break" style={{ marginTop: 32 }}>
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 6, marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a' }}>
                  Rubrik Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)
                </h3>
                <p style={{ fontSize: 12, color: '#64748b' }}>
                  Pedoman penilaian formatif & sumatif berbasis 4 interval capaian peserta didik
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '25%' }}>Tujuan Pembelajaran / Bukti</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#fee2e2' }}>Perlu Bimbingan (0-60)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#fef3c7' }}>Cukup (61-70)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#e0e7ff' }}>Baik (71-85)</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '21%', background: '#dcfce7' }}>Sangat Baik (86-100)</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.rubrikKKTP.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top' }}>
                        <strong>{r.tujuanPembelajaran}</strong>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Bukti: {r.buktiKetercapaian}</div>
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', fontSize: 11 }}>{r.perluBimbingan}</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', fontSize: 11 }}>{r.cukup}</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', fontSize: 11 }}>{r.baik}</td>
                      <td style={{ padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', fontSize: 11 }}>{r.sangatBaik}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
        )}

        {/* Blok Pengesahan Tanda Tangan Kepala Sekolah & Guru (Otomatis dari Data Kelas) */}
        {activeProfile.tampilkanTandaTangan && mode !== 'worksheet' && (
          <div style={{
            marginTop: 36,
            paddingTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            textAlign: 'center',
            fontSize: 12,
            color: '#1e293b',
            pageBreakInside: 'avoid'
          }}>
            <div>
              <div>Mengetahui,</div>
              <div style={{ marginBottom: 56 }}>Kepala Sekolah / Madrasah</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {activeProfile.namaKepalaSekolah || '......................................................'}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {activeProfile.nipKepalaSekolah ? `NIP. ${activeProfile.nipKepalaSekolah}` : 'NIP. -'}
              </div>
            </div>
            <div>
              <div>
                {activeProfile.kotaSekolah || 'Indonesia'}, {assessment.createdAt}
              </div>
              <div style={{ marginBottom: 56 }}>Guru Mata Pelajaran</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {assessment.namaPenyusun || activeProfile.namaGuru}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {activeProfile.nipGuru ? `NIP. ${activeProfile.nipGuru}` : 'NIP. -'}
              </div>
            </div>
          </div>
        )}

        {/* Footer Dokumen */}
        <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
          <div>Dokumen Sah Pembelajaran Kurikulum Merdeka • {assessment.namaSekolah || activeProfile.namaSekolah}</div>
          <div>Disusun melalui AsesMerdeka</div>
        </div>

      </div>

      {/* Panel "Langkah Berikutnya" ala KapurBiru (Interconnected Workflow) */}
      <div className="no-print glass-panel" style={{
        marginTop: 20,
        padding: '18px 24px',
        border: '1px solid #bfdbfe',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🧭 Rangkaian Dokumen Bapak/Ibu ({assessment.mataPelajaran} • Kelas {assessment.kelas})
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-main)', marginTop: 2 }}>
            Semua dokumen di bawah ini otomatis tersambung dengan topik <strong>"{assessment.materiPokok}"</strong>:
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {onSwitchMode && mode !== 'kisi_kisi' && (
            <button
              onClick={() => onSwitchMode('kisi_kisi')}
              className="btn btn-sm btn-outline"
              style={{ borderColor: '#93c5fd', color: '#1d4ed8', background: '#ffffff' }}
            >
              <Table2 size={14} /> Lihat Tabel Kisi-Kisi & Kartu Soal ›
            </button>
          )}
          {onSwitchMode && mode !== 'teacher_guide' && (
            <button
              onClick={() => onSwitchMode('teacher_guide')}
              className="btn btn-sm btn-outline"
              style={{ borderColor: '#6ee7b7', color: '#047857', background: '#ffffff' }}
            >
              Lihat Kunci & Rubrik KKTP ›
            </button>
          )}
          {onCreateRangkumanFromAssessment && (
            <button
              onClick={onCreateRangkumanFromAssessment}
              className="btn btn-sm btn-primary"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' }}
            >
              <BookOpen size={14} /> Langkah Berikutnya: Buat Rangkuman Materi Topik Ini <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
