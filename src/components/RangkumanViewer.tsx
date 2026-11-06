import React, { useState, useRef } from 'react';
import {
  FileDown,
  Printer,
  Copy,
  Check,
  Image,
  Sparkles,
  Lightbulb,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Compass,
  Smile,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  FileText,
  AlertTriangle
} from 'lucide-react';
import type { RangkumanDokumen } from '../types/summary';
import { exportRangkumanToDocx } from '../utils/docxExporter';
import { exportElementToImage } from '../utils/imageExporter';
import { generateRangkumanMateri } from '../services/aiGenerator';
import type { SchoolProfile } from '../utils/schoolProfileStorage';
import { getSchoolProfile } from '../utils/schoolProfileStorage';

interface RangkumanViewerProps {
  rangkuman: RangkumanDokumen;
  schoolProfile?: SchoolProfile;
  onPrint: () => void;
  onGoToGenerator: () => void;
  onBackToClassHub?: () => void;
  onCreateAssessmentFromRangkuman?: () => void;
  onUpdateRangkuman?: (updated: RangkumanDokumen) => void;
}

export const RangkumanViewer: React.FC<RangkumanViewerProps> = ({
  rangkuman,
  schoolProfile,
  onPrint,
  onGoToGenerator,
  onBackToClassHub,
  onCreateAssessmentFromRangkuman,
  onUpdateRangkuman,
}) => {
  const activeProfile = schoolProfile || getSchoolProfile();
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [revealedQuiz, setRevealedQuiz] = useState<Record<number, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const summarySheetRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyText = () => {
    let text = `LEMBAR RANGKUMAN CERDAS: ${rangkuman.judul}\n`;
    text += `Mata Pelajaran: ${rangkuman.mataPelajaran} | Kelas: ${rangkuman.kelas} (${rangkuman.jenjangFase})\n\n`;
    text += `💡 INTISARI:\n"${rangkuman.ringkasanSatuKalimat}"\n\n`;

    if (rangkuman.petaKonsep.length > 0) {
      text += `🗺️ PETA ALUR KONSEP:\n`;
      rangkuman.petaKonsep.forEach((pk, i) => {
        text += `${i + 1}. ${pk}\n`;
      });
      text += '\n';
    }

    if (rangkuman.rumusAtauPola && rangkuman.rumusAtauPola.length > 0) {
      text += `📌 STRUKTUR / RUMUS & KAIDAH INTI:\n`;
      rangkuman.rumusAtauPola.forEach((rp) => {
        text += `• ${rp.label}:\n  ${rp.isi}\n`;
      });
      text += '\n';
    }

    text += `📖 PEMBAHASAN KONSEP:\n`;
    rangkuman.poinUtama.forEach((p, idx) => {
      text += `\n${idx + 1}. ${p.judul}\n`;
      text += `${p.penjelasan}\n`;
      if (p.analogi) text += `Analogi: ${p.analogi}\n`;
      if (p.poinKunci) {
        p.poinKunci.forEach(pk => text += ` - ${pk}\n`);
      }
    });

    if (rangkuman.contohKonkret) {
      text += `\n📄 ${rangkuman.contohKonkret.judulContoh.toUpperCase()}:\n`;
      text += `${rangkuman.contohKonkret.teksContoh}\n`;
      if (rangkuman.contohKonkret.bedahAnalisis.length > 0) {
        text += `\nBedah Analisis:\n`;
        rangkuman.contohKonkret.bedahAnalisis.forEach((b) => (text += `${b}\n`));
      }
    }

    if (rangkuman.tipsUjian && rangkuman.tipsUjian.length > 0) {
      text += `\n🎯 TIPS JITU UJIAN & JEBAKAN UMUM:\n`;
      rangkuman.tipsUjian.forEach((t) => (text += `- ${t}\n`));
    }

    if (rangkuman.faktaMenarik.length > 0) {
      text += `\n✨ TAHUKAH KAMU?:\n`;
      rangkuman.faktaMenarik.forEach(fm => text += `- ${fm}\n`);
    }

    if (rangkuman.glosarium.length > 0) {
      text += `\n📚 GLOSARIUM:\n`;
      rangkuman.glosarium.forEach(g => text += `- ${g.istilah}: ${g.makna}\n`);
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportImage = async () => {
    if (!summarySheetRef.current) return;
    setIsExportingImage(true);
    try {
      const cleanTitle = rangkuman.judul.replace(/[^a-zA-Z0-9_\s]/g, '').trim() || 'Rangkuman_Materi';
      await exportElementToImage(summarySheetRef.current, `Rangkuman_${cleanTitle}`);
      showToast('📸 Gambar PNG berhasil diunduh! Siap dibagikan di WhatsApp.');
    } catch (err: any) {
      alert('Gagal mengunduh gambar: ' + err.message);
    } finally {
      setIsExportingImage(false);
    }
  };

  const toggleQuizAnswer = (nomor: number) => {
    setRevealedQuiz(prev => ({
      ...prev,
      [nomor]: !prev[nomor]
    }));
  };

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

      {/* Top Action Controls Bar */}
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
          <span className="badge badge-emerald">
            🌟 Lembar Rangkuman Belajar Visual
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Dibuat: {rangkuman.createdAt}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {onUpdateRangkuman && (
            <button
              onClick={async () => {
                showToast('⏳ Memperbarui & memperkaya isi rangkuman...');
                const refreshed = await generateRangkumanMateri({
                  modeInput: rangkuman.sumberAsal,
                  topik: rangkuman.topik,
                  mataPelajaran: rangkuman.mataPelajaran,
                  jenjangFase: rangkuman.jenjangFase,
                  kelas: rangkuman.kelas,
                  gayaBahasa: rangkuman.gayaBahasa,
                });
                onUpdateRangkuman(refreshed);
                showToast('✨ Isi rangkuman berhasil diperbarui menjadi lebih lengkap & mendalam (0 Kuota)!');
              }}
              className="btn btn-sm btn-outline"
              style={{ borderColor: '#93c5fd', color: '#1d4ed8', background: '#eff6ff' }}
              title="Perbarui struktur & contoh rangkuman ini tanpa mengurangi kuota"
            >
              <RotateCcw size={14} /> Perbarui Isi Rangkuman
            </button>
          )}

          <button onClick={onGoToGenerator} className="btn btn-sm btn-outline" title="Buat materi atau topik baru">
            <Sparkles size={14} /> Buat Rangkuman Baru
          </button>

          <button onClick={handleCopyText} className="btn btn-sm btn-outline">
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copied ? 'Tersalin!' : 'Salin Teks'}
          </button>

          <button
            onClick={handleExportImage}
            disabled={isExportingImage}
            className="btn btn-sm btn-secondary"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', color: '#ffffff' }}
            title="Download gambar PNG berkualitas tinggi (Cocok untuk share ke WhatsApp kelas / murid)"
          >
            <Image size={14} /> {isExportingImage ? 'Memproses...' : 'Unduh Gambar (.png)'}
          </button>

          <button
            onClick={async () => {
              try {
                await exportRangkumanToDocx(rangkuman);
              } catch (e: any) {
                alert('Gagal mengekspor Word: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            title="Download file Microsoft Word (.docx)"
          >
            <FileDown size={14} /> Unduh Word (.docx)
          </button>

          <button onClick={onPrint} className="btn btn-sm btn-success">
            <Printer size={14} /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* VISUAL INFOGRAPHIC / STUDY SHEET CANVAS */}
      <div ref={summarySheetRef} className="print-sheet" style={{
        background: '#ffffff',
        color: '#1e293b',
        borderRadius: 'var(--radius-lg)',
        padding: '36px 44px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        minHeight: 800,
        overflow: 'hidden'
      }}>

        {/* Decorative Top Accent Bar */}
        <div style={{
          height: 6,
          background: 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 50%, #10b981 100%)',
          borderRadius: '4px 4px 0 0',
          marginBottom: 20
        }} />

        {/* Kop Resmi Sekolah (Jika diaktifkan oleh Guru) */}
        {activeProfile.pakaiFormatKopSekolah && (
          <div style={{
            textAlign: 'center',
            borderBottom: '3px double #334155',
            paddingBottom: 10,
            marginBottom: 18
          }}>
            {activeProfile.instansiDinas && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {activeProfile.instansiDinas}
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              {activeProfile.namaSekolah}
            </div>
            {activeProfile.alamatSekolah && (
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {activeProfile.alamatSekolah} {activeProfile.kotaSekolah ? `• ${activeProfile.kotaSekolah}` : ''}
              </div>
            )}
          </div>
        )}

        {/* Header Rangkuman */}
        <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px dashed #e2e8f0', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: 9999, fontWeight: 700 }}>
              LEMBAR BELAJAR MANDIRI
            </span>
            <span style={{ fontSize: 11, background: '#ccfbf1', color: '#0f766e', padding: '3px 10px', borderRadius: 9999, fontWeight: 700 }}>
              {rangkuman.mataPelajaran}
            </span>
            <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 9999, fontWeight: 700 }}>
              Kelas {activeProfile.rombelAktif || rangkuman.kelas}
            </span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '6px 0', lineHeight: 1.3 }}>
            {rangkuman.judul}
          </h1>

          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            {rangkuman.jenjangFase} • Kelas {activeProfile.rombelAktif || rangkuman.kelas} • Semester {activeProfile.semester} • TA {activeProfile.tahunAjaran}
          </div>
        </div>

        {/* 1. Intisari Satu Kalimat */}
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #ede9fe 100%)',
          borderLeft: '5px solid #6366f1',
          borderRadius: 8,
          padding: '14px 20px',
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lightbulb size={14} color="#f59e0b" /> Intisari Emas Pembelajaran:
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{rangkuman.ringkasanSatuKalimat}"
          </div>
        </div>

        {/* 2. Peta Alur Konsep */}
        {rangkuman.petaKonsep.length > 0 && (
          <div style={{ marginBottom: 26, background: '#f8fafc', padding: '14px 18px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Compass size={14} color="#0d9488" /> Peta Alur Konsep:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {rangkuman.petaKonsep.map((pk, idx) => (
                <div key={idx} style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span style={{ background: '#4f46e5', color: '#ffffff', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                    {idx + 1}
                  </span>
                  <span>{pk.replace(/^\d+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2B. Struktur / Rumus & Kaidah Inti (Baru!) */}
        {rangkuman.rumusAtauPola && rangkuman.rumusAtauPola.length > 0 && (
          <div style={{
            marginBottom: 26,
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%)',
            padding: '18px 20px',
            borderRadius: 10,
            border: '1px solid #bfdbfe'
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#1e40af',
              textTransform: 'uppercase',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Sparkles size={15} color="#2563eb" /> Struktur Inti, Rumus & Kaidah Utama:
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 12
            }}>
              {rangkuman.rumusAtauPola.map((rp, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #dbeafe',
                    borderRadius: 8,
                    padding: '12px 14px',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)'
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1d4ed8', marginBottom: 6 }}>
                    {rp.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                    {rp.isi}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Poin-Poin Konsep Utama & Analogi */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 6, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={17} color="#2563eb" /> Pembahasan Konsep Kunci
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {rangkuman.poinUtama.map((point, pIdx) => (
              <div key={pIdx} style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                    {pIdx + 1}
                  </span>
                  {point.judul}
                </h3>

                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: 10 }}>
                  {point.penjelasan}
                </p>

                {/* Analogi Box */}
                {point.analogi && (
                  <div style={{
                    background: '#f0fdf4',
                    borderLeft: '4px solid #10b981',
                    borderRadius: '0 6px 6px 0',
                    padding: '8px 14px',
                    fontSize: 12,
                    color: '#065f46',
                    marginBottom: 10,
                    lineHeight: 1.5
                  }}>
                    <strong>🎯 Analogi Dunia Nyata:</strong> {point.analogi}
                  </div>
                )}

                {/* Poin Kunci Checklist */}
                {point.poinKunci && point.poinKunci.length > 0 && (
                  <div style={{ paddingLeft: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {point.poinKunci.map((pk, kIdx) => (
                      <div key={kIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#475569' }}>
                        <CheckCircle2 size={14} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>{pk}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3B. Contoh Teks Model / Contoh Soal & Bedah Analisis (Baru!) */}
        {rangkuman.contohKonkret && (
          <div style={{
            marginBottom: 28,
            background: '#f8fafc',
            border: '2px solid #cbd5e1',
            borderRadius: 10,
            padding: '20px 22px'
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 800,
              color: '#0f172a',
              textTransform: 'uppercase',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 8
            }}>
              <FileText size={17} color="#0d9488" /> {rangkuman.contohKonkret.judulContoh}
            </div>

            {/* Kotak Teks Contoh / Model Text */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderLeft: '4px solid #0d9488',
              borderRadius: 8,
              padding: '14px 18px',
              fontSize: 13,
              color: '#1e293b',
              lineHeight: 1.65,
              whiteSpace: 'pre-line',
              marginBottom: 14,
              fontFamily: 'inherit'
            }}>
              {rangkuman.contohKonkret.teksContoh}
            </div>

            {/* Bedah Analisis Contoh */}
            {rangkuman.contohKonkret.bedahAnalisis && rangkuman.contohKonkret.bedahAnalisis.length > 0 && (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                padding: '12px 16px'
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#065f46', marginBottom: 8, textTransform: 'uppercase' }}>
                  🔍 Bedah Analisis Struktur & Kaidah:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rangkuman.contohKonkret.bedahAnalisis.map((analisis, aIdx) => (
                    <div key={aIdx} style={{ fontSize: 12, color: '#064e3b', lineHeight: 1.5 }}>
                      {analisis}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3C. Tips Jitu Ujian & Jebakan yang Sering Keliru (Baru!) */}
        {rangkuman.tipsUjian && rangkuman.tipsUjian.length > 0 && (
          <div style={{
            marginBottom: 26,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '16px 20px'
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#991b1b',
              textTransform: 'uppercase',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertTriangle size={16} color="#dc2626" /> 🎯 Tips Jitu Ujian & Jebakan yang Sering Keliru
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rangkuman.tipsUjian.map((tip, tIdx) => (
                <div key={tIdx} style={{ fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#dc2626' }}>•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Tahukah Kamu? (Fakta Menarik) */}
        {rangkuman.faktaMenarik.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 26
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#d97706" /> ✨ Tahukah Kamu? (Fakta Menakjubkan)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rangkuman.faktaMenarik.map((fakta, fIdx) => (
                <div key={fIdx} style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>💡</span>
                  <span>{fakta.replace(/^Tahukah Kamu\?\s*/i, '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Glosarium Mini */}
        {rangkuman.glosarium.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={15} color="#4f46e5" /> 📚 Glosarium Istilah Penting
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 10
            }}>
              {rangkuman.glosarium.map((g, gIdx) => (
                <div key={gIdx} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12
                }}>
                  <strong style={{ color: '#4338ca', display: 'block', marginBottom: 2 }}>
                    {g.istilah}
                  </strong>
                  <span style={{ color: '#475569', lineHeight: 1.4 }}>
                    {g.makna}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Kuis Kilat Cek Pemahaman */}
        {rangkuman.kuisKilat.length > 0 && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 24
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={15} color="#15803d" /> ⚡ Kuis Kilat: Uji Pemahamanmu!
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rangkuman.kuisKilat.map((quiz) => {
                const isRevealed = !!revealedQuiz[quiz.nomor];
                return (
                  <div key={quiz.nomor} style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: 12.5
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <strong>{quiz.nomor}. {quiz.pertanyaan}</strong>
                      </div>
                      <button
                        onClick={() => toggleQuizAnswer(quiz.nomor)}
                        className="btn btn-sm btn-outline no-print"
                        style={{ fontSize: 11, padding: '2px 8px', whiteSpace: 'nowrap' }}
                      >
                        {isRevealed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isRevealed ? 'Tutup' : 'Lihat Kunci'}
                      </button>
                    </div>

                    <div className={!isRevealed ? 'no-print-hide' : ''} style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px dashed #e2e8f0',
                      color: '#15803d',
                      fontWeight: 600,
                      fontSize: 12,
                      display: isRevealed ? 'block' : 'none'
                    }}>
                      Jawaban: {quiz.jawaban}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7. Pesan Inspirasi Penutup */}
        {rangkuman.pesanInspirasi && (
          <div style={{
            textAlign: 'center',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            color: '#3730a3',
            fontStyle: 'italic',
            border: '1px solid #e0e7ff',
            marginBottom: 20
          }}>
            <Smile size={16} color="#4f46e5" style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />
            "{rangkuman.pesanInspirasi}"
          </div>
        )}

        {/* Blok Pengesahan Kepala Sekolah & Guru (Jika diaktifkan) */}
        {activeProfile.tampilkanTandaTangan && (
          <div style={{
            marginTop: 28,
            marginBottom: 20,
            paddingTop: 16,
            borderTop: '1px dashed #cbd5e1',
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
              <div style={{ marginBottom: 52 }}>Kepala Sekolah / Madrasah</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {activeProfile.namaKepalaSekolah || '......................................................'}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {activeProfile.nipKepalaSekolah ? `NIP. ${activeProfile.nipKepalaSekolah}` : 'NIP. -'}
              </div>
            </div>
            <div>
              <div>
                {activeProfile.kotaSekolah || 'Indonesia'}, {rangkuman.createdAt}
              </div>
              <div style={{ marginBottom: 52 }}>Guru Mata Pelajaran</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {activeProfile.namaGuru || '......................................................'}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {activeProfile.nipGuru ? `NIP. ${activeProfile.nipGuru}` : 'NIP. -'}
              </div>
            </div>
          </div>
        )}

        {/* Footer Lembar */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
          <div>{activeProfile.namaSekolah} • AsesMerdeka Kurikulum Merdeka</div>
          <div>Bahan Ajar & Lembar Belajar Siswa</div>
        </div>

      </div>

      {/* Panel "Langkah Berikutnya" ala KapurBiru */}
      <div className="no-print glass-panel" style={{
        marginTop: 20,
        padding: '18px 24px',
        border: '1px solid #a7f3d0',
        background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            🧭 Langkah Berikutnya untuk Kelas Bapak/Ibu
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-main)', marginTop: 2 }}>
            Rangkuman <strong>"{rangkuman.topik}"</strong> sudah jadi. Lanjutkan ke penyusunan Soal & Kisi-Kisi otomatis:
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onGoToGenerator} className="btn btn-sm btn-outline" style={{ background: '#ffffff' }}>
            Buat Rangkuman Lain
          </button>
          {onCreateAssessmentFromRangkuman && (
            <button
              onClick={onCreateAssessmentFromRangkuman}
              className="btn btn-sm btn-primary"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            >
              <Sparkles size={14} /> Buat Soal Asesmen & Kisi-Kisi dari Rangkuman Ini <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
