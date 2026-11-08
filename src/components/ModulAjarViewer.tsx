import React, { useRef, useState, useEffect } from 'react';
import {
  FileDown,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Share2,
} from 'lucide-react';
import type { ModulAjarDokumen } from '../types/perangkatAjar';
import type { SchoolProfile, CustomTPItem } from '../utils/schoolProfileStorage';
import { getSchoolProfile } from '../utils/schoolProfileStorage';
import { exportModulAjarToDocx } from '../utils/docxExporter';
import {
  generateContextualModulAjarWithAI,
  MODUL_AJAR_MODELS,
  type ModulAjarModelType,
} from '../utils/modulAjarAiService';
import {
  fetchSharedCurriculum,
  publishSharedCurriculum,
  hydrateSharedDocWithLocalProfile,
} from '../utils/sharedCurriculumService';
import { requireActiveLicenseForAction } from '../utils/licenseManager';

interface ModulAjarViewerProps {
  modul: ModulAjarDokumen;
  schoolProfile?: SchoolProfile;
  customTP?: CustomTPItem | null;
  onPrint: () => void;
  onBackToClassHub: () => void;
}

interface AutoExpandingTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoExpandingTextarea: React.FC<AutoExpandingTextareaProps> = ({
  value,
  onChange,
  style,
  rows = 1,
  className = 'lkpd-inline-textarea',
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={rows}
      value={value}
      onChange={(e) => {
        adjustHeight();
        onChange?.(e);
      }}
      className={className}
      style={{
        overflow: 'hidden',
        resize: 'none',
        display: 'block',
        ...style,
      }}
      {...props}
    />
  );
};

export const ModulAjarViewer: React.FC<ModulAjarViewerProps> = ({
  modul,
  schoolProfile,
  customTP,
  onPrint,
  onBackToClassHub,
}) => {
  const activeProfile = schoolProfile || getSchoolProfile();
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [selectedModel, setSelectedModel] = useState<ModulAjarModelType>('pbl');
  const [konteksInput, setKonteksInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFromCommunity, setIsFromCommunity] = useState(false);
  const [editableDoc, setEditableDoc] = useState<ModulAjarDokumen>(modul);

  const effectiveTP: CustomTPItem = customTP || {
    id: `tp-${modul.tpKode}`,
    kode: modul.tpKode,
    elemen: modul.elemen || '',
    materiPokok: modul.materiPokok || '',
    tujuanPembelajaran: modul.tujuanPembelajaran || '',
    arahanRangkuman: '',
    alokasiJP: 2,
    mingguMulai: 1,
    mingguSelesai: 1,
  };

  const tpKode = effectiveTP.kode || modul.tpKode;
  const jenjang = activeProfile.jenjang || modul.jenjangFase || 'SD/MI';
  const kelas = modul.kelas || activeProfile.kelasUtama || '4';
  const mapel = modul.mataPelajaran || activeProfile.mataPelajaranUtama || 'Umum';
  const materiPokok = effectiveTP.materiPokok || modul.materiPokok || 'Umum';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const saveToLocalStorage = (doc: ModulAjarDokumen) => {
    try {
      if (typeof window !== 'undefined') {
        const storageKey = `modul_ajar_${tpKode}_${selectedModel}`;
        localStorage.setItem(storageKey, JSON.stringify(doc));
      }
    } catch {
      // ignore
    }
  };

  // Auto-Loading Shared Bank / Local Draft saat TP atau selectedModel berubah
  const prevModelRef = useRef<ModulAjarModelType | null>(null);

  useEffect(() => {
    let isMounted = true;
    const isModelChange =
      prevModelRef.current !== null && prevModelRef.current !== selectedModel;
    prevModelRef.current = selectedModel;

    const storageKey = `modul_ajar_${tpKode}_${selectedModel}`;
    const selectedModelDef =
      MODUL_AJAR_MODELS.find((m) => m.id === selectedModel) || MODUL_AJAR_MODELS[0];

    const getFallbackDoc = (): ModulAjarDokumen => ({
      ...modul,
      modelPembelajaran: selectedModelDef.deskripsi
        ? `${selectedModelDef.label} - ${selectedModelDef.deskripsi}`
        : selectedModelDef.label,
    });

    const loadDraft = async () => {
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (saved) {
          const parsed = JSON.parse(saved) as ModulAjarDokumen;
          if (isMounted && parsed && parsed.tpKode) {
            setEditableDoc(parsed);
            setIsFromCommunity(false);
            return;
          }
        }

        // Jika tidak di localStorage, cari di Bank Referensi Bersama
        const res = await fetchSharedCurriculum<ModulAjarDokumen>({
          type: 'modul_ajar',
          jenjang,
          kelas,
          mapel,
          tpKode,
          materiPokok,
          model: selectedModel,
        });

        if (!isMounted) return;

        if (res.found && res.data) {
          const hydrated = hydrateSharedDocWithLocalProfile(res.data, activeProfile);
          setEditableDoc(hydrated);
          setIsFromCommunity(true);
          showToast('Draf referensi guru komunitas berhasil dimuat!');
        } else {
          setEditableDoc(getFallbackDoc());
          setIsFromCommunity(false);
          if (isModelChange) {
            showToast(
              `Draf untuk model ${selectedModelDef.label} belum tersedia. Silakan klik "✨ Buat / Regenerasi AI" untuk merancang modul baru.`
            );
          }
        }
      } catch {
        if (isMounted) {
          setEditableDoc(getFallbackDoc());
          setIsFromCommunity(false);
          if (isModelChange) {
            showToast(
              `Draf untuk model ${selectedModelDef.label} belum tersedia. Silakan klik "✨ Buat / Regenerasi AI" untuk merancang modul baru.`
            );
          }
        }
      }
    };

    loadDraft();

    return () => {
      isMounted = false;
    };
  }, [tpKode, selectedModel, modul]);

  const handleGenerateAI = async () => {
    if (!requireActiveLicenseForAction('membuat draf Modul Ajar AI')) {
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateContextualModulAjarWithAI(
        effectiveTP,
        activeProfile,
        selectedModel,
        konteksInput.trim() || undefined
      );
      setEditableDoc(result.modul);
      saveToLocalStorage(result.modul);
      setIsFromCommunity(false);
      if (result.usedFallback) {
        showToast('Draf dibuat dengan template otomatis (offline/fallback).');
      } else {
        showToast('✨ Modul Ajar AI berhasil dibuat!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      alert('Gagal membuat modul ajar: ' + msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishToSharedBank = async () => {
    if (!requireActiveLicenseForAction('membagikan draf ke Bank Referensi Guru')) {
      return;
    }
    setIsPublishing(true);
    try {
      const res = await publishSharedCurriculum({
        type: 'modul_ajar',
        jenjang,
        kelas,
        mapel,
        tpKode,
        materiPokok,
        model: selectedModel,
        data: editableDoc as unknown as Record<string, unknown>,
      });
      if (res.ok) {
        showToast('Draf berhasil dibagikan ke Bank Referensi Guru!');
      } else {
        alert(res.message || 'Gagal membagikan ke Bank Referensi Guru.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      alert('Terjadi kesalahan saat membagikan draf: ' + msg);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyText = () => {
    let text = `MODUL AJAR KURIKULUM MERDEKA: ${editableDoc.materiPokok}\n`;
    text += `Mata Pelajaran: ${editableDoc.mataPelajaran} | Kelas: ${editableDoc.kelas} (${editableDoc.jenjangFase})\n`;
    text += `Alokasi Waktu: ${editableDoc.alokasiWaktu}\n\n`;
    text += `TUJUAN PEMBELAJARAN (TP ${editableDoc.tpKode}):\n${editableDoc.tujuanPembelajaran}\n\n`;
    text += `PEMAHAMAN BERMAKNA:\n${editableDoc.pemahamanBermakna}\n\n`;
    text += `PERTANYAAN PEMANTIK:\n${(editableDoc.pertanyaanPemantik || []).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`;
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
          padding: '16px 20px',
          marginBottom: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Baris 1: Navigasi, Badge, & Tombol Ekspor */}
        <div
          style={{
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
              TP {editableDoc.tpKode || modul.tpKode} • {editableDoc.alokasiWaktu || modul.alokasiWaktu}
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
                  const ok = await exportModulAjarToDocx(editableDoc, activeProfile);
                  if (ok) {
                    showToast('File Word (.docx) berhasil diunduh!');
                  }
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Terjadi kesalahan';
                  alert('Gagal mengunduh file Word: ' + msg);
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

        {/* Baris 2: Kontrol Model Pedagogis, Konteks, AI & Bank Referensi */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            paddingTop: 12,
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 280px', minWidth: 240 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              Model:
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModulAjarModelType)}
              className="form-select form-select-sm"
              style={{
                fontSize: 13,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                background: '#ffffff',
                color: '#0f172a',
                width: '100%',
              }}
            >
              {MODUL_AJAR_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '2 1 260px', minWidth: 220 }}>
            <input
              type="text"
              placeholder="Konteks / Isu Nyata (Opsional, misal: Limbah pasar lokal)"
              value={konteksInput}
              onChange={(e) => setKonteksInput(e.target.value)}
              className="form-input form-input-sm"
              style={{
                width: '100%',
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="btn btn-sm btn-primary"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: '#ffffff',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Membuat AI...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> ✨ Buat / Regenerasi AI
                </>
              )}
            </button>

            <button
              onClick={handlePublishToSharedBank}
              disabled={isPublishing}
              className="btn btn-sm btn-outline"
              style={{
                borderColor: '#818cf8',
                color: '#4338ca',
                background: '#eef2ff',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
              title="Bagikan draf modul ke Bank Referensi Guru"
            >
              {isPublishing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Membagikan...
                </>
              ) : (
                <>
                  <Share2 size={14} /> 🤝 Bagikan ke Bank Referensi
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Community Reference Banner */}
      {isFromCommunity && (
        <div
          className="no-print"
          style={{
            padding: '8px 16px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            color: '#1e40af',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          💡 Draf berikut adalah referensi guru lainnya • Siap disesuaikan
        </div>
      )}

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
            {editableDoc.namaSekolah || activeProfile.namaSekolah}
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
            TAHUN AJARAN {editableDoc.tahunAjaran || activeProfile.tahunAjaran} • SEMESTER {(editableDoc.semester || '1').toUpperCase()}
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
                <td style={{ padding: '6px 8px' }}>: {editableDoc.namaSekolah || activeProfile.namaSekolah}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Penyusun / Guru Mapel</td>
                <td style={{ padding: '6px 8px' }}>: {editableDoc.namaGuru || activeProfile.namaGuru}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Mata Pelajaran</td>
                <td style={{ padding: '6px 8px' }}>: <strong>{editableDoc.mataPelajaran}</strong></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Fase / Kelas / Rombel</td>
                <td style={{ padding: '6px 8px' }}>: {editableDoc.jenjangFase} / Kelas {editableDoc.kelas} ({activeProfile.rombelAktif || editableDoc.rombel})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Elemen Capaian</td>
                <td style={{ padding: '6px 8px' }}>: {editableDoc.elemen}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Alokasi Waktu</td>
                <td style={{ padding: '6px 8px' }}>: {editableDoc.alokasiWaktu}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Model Pembelajaran</td>
                <td style={{ padding: '6px 8px' }}>: {editableDoc.modelPembelajaran}</td>
              </tr>
            </tbody>
          </table>

          {/* Profil Pancasila & Sarana */}
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: '#1e40af' }}>Profil Pelajar Pancasila yang Dikembangkan:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#334155' }}>
                {(editableDoc.profilPelajarPancasila || []).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ color: '#1e40af' }}>Sarana & Prasarana:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#334155' }}>
                {(editableDoc.saranaPrasarana || []).map((s, i) => (
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
              A. Tujuan Pembelajaran (TP {editableDoc.tpKode}):
            </div>
            <div style={{ fontSize: 13, color: '#1e293b', background: '#eff6ff', padding: '10px 14px', borderRadius: 8, marginTop: 4 }}>
              {editableDoc.tujuanPembelajaran}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
              B. Pemahaman Bermakna:
            </div>
            <AutoExpandingTextarea
              value={editableDoc.pemahamanBermakna || ''}
              onChange={(e) => {
                const updated = { ...editableDoc, pemahamanBermakna: e.target.value };
                setEditableDoc(updated);
                saveToLocalStorage(updated);
              }}
              rows={2}
              style={{ fontStyle: 'italic', color: '#334155', fontSize: 13 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              C. Pertanyaan Pemantik:
            </div>
            <ol style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 13, color: '#334155' }}>
              {(editableDoc.pertanyaanPemantik || []).map((q, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <AutoExpandingTextarea
                    value={q}
                    onChange={(e) => {
                      const list = [...(editableDoc.pertanyaanPemantik || [])];
                      list[i] = e.target.value;
                      const updated = { ...editableDoc, pertanyaanPemantik: list };
                      setEditableDoc(updated);
                      saveToLocalStorage(updated);
                    }}
                    rows={1}
                    style={{ fontSize: 13, color: '#334155' }}
                  />
                </li>
              ))}
            </ol>
          </div>

          {/* Rincian Kegiatan Pembelajaran per Pertemuan */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              D. Langkah-Langkah Kegiatan Pembelajaran:
            </div>

            {(editableDoc.kegiatanPembelajaran || []).map((keg, kIdx) => (
              <div
                key={keg.pertemuan || kIdx}
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
                    {(keg.pendahuluan || []).map((p, pIdx) => (
                      <li key={pIdx} style={{ marginBottom: 4 }}>
                        <AutoExpandingTextarea
                          value={p}
                          onChange={(e) => {
                            const updatedKegiatan = [...(editableDoc.kegiatanPembelajaran || [])];
                            const targetKeg = { ...updatedKegiatan[kIdx] };
                            const newPendahuluan = [...(targetKeg.pendahuluan || [])];
                            newPendahuluan[pIdx] = e.target.value;
                            targetKeg.pendahuluan = newPendahuluan;
                            updatedKegiatan[kIdx] = targetKeg;

                            const updated = { ...editableDoc, kegiatanPembelajaran: updatedKegiatan };
                            setEditableDoc(updated);
                            saveToLocalStorage(updated);
                          }}
                          rows={1}
                          style={{ fontSize: 12.5, color: '#334155' }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 12.5, color: '#047857' }}>2. Kegiatan Inti:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#334155' }}>
                    {(keg.inti || []).map((it, iIdx) => (
                      <li key={iIdx} style={{ marginBottom: 4 }}>
                        <AutoExpandingTextarea
                          value={it}
                          onChange={(e) => {
                            const updatedKegiatan = [...(editableDoc.kegiatanPembelajaran || [])];
                            const targetKeg = { ...updatedKegiatan[kIdx] };
                            const newInti = [...(targetKeg.inti || [])];
                            newInti[iIdx] = e.target.value;
                            targetKeg.inti = newInti;
                            updatedKegiatan[kIdx] = targetKeg;

                            const updated = { ...editableDoc, kegiatanPembelajaran: updatedKegiatan };
                            setEditableDoc(updated);
                            saveToLocalStorage(updated);
                          }}
                          rows={1}
                          style={{ fontSize: 12.5, color: '#334155' }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong style={{ fontSize: 12.5, color: '#b45309' }}>3. Kegiatan Penutup & Refleksi:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#334155' }}>
                    {(keg.penutup || []).map((pn, pnIdx) => (
                      <li key={pnIdx} style={{ marginBottom: 4 }}>
                        <AutoExpandingTextarea
                          value={pn}
                          onChange={(e) => {
                            const updatedKegiatan = [...(editableDoc.kegiatanPembelajaran || [])];
                            const targetKeg = { ...updatedKegiatan[kIdx] };
                            const newPenutup = [...(targetKeg.penutup || [])];
                            newPenutup[pnIdx] = e.target.value;
                            targetKeg.penutup = newPenutup;
                            updatedKegiatan[kIdx] = targetKeg;

                            const updated = { ...editableDoc, kegiatanPembelajaran: updatedKegiatan };
                            setEditableDoc(updated);
                            saveToLocalStorage(updated);
                          }}
                          rows={1}
                          style={{ fontSize: 12.5, color: '#334155' }}
                        />
                      </li>
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
            <div style={{ marginBottom: 6 }}>
              <strong>• Asesmen Diagnostik:</strong>
              <AutoExpandingTextarea
                value={editableDoc.asesmen?.diagnostik || ''}
                onChange={(e) => {
                  const updated = {
                    ...editableDoc,
                    asesmen: {
                      ...editableDoc.asesmen,
                      diagnostik: e.target.value,
                    },
                  };
                  setEditableDoc(updated);
                  saveToLocalStorage(updated);
                }}
                rows={1}
                style={{ fontSize: 12.5, color: '#334155', marginTop: 2 }}
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>• Asesmen Formatif:</strong>
              <AutoExpandingTextarea
                value={editableDoc.asesmen?.formatif || ''}
                onChange={(e) => {
                  const updated = {
                    ...editableDoc,
                    asesmen: {
                      ...editableDoc.asesmen,
                      formatif: e.target.value,
                    },
                  };
                  setEditableDoc(updated);
                  saveToLocalStorage(updated);
                }}
                rows={1}
                style={{ fontSize: 12.5, color: '#334155', marginTop: 2 }}
              />
            </div>
            <div>
              <strong>• Asesmen Sumatif:</strong>
              <AutoExpandingTextarea
                value={editableDoc.asesmen?.sumatif || ''}
                onChange={(e) => {
                  const updated = {
                    ...editableDoc,
                    asesmen: {
                      ...editableDoc.asesmen,
                      sumatif: e.target.value,
                    },
                  };
                  setEditableDoc(updated);
                  saveToLocalStorage(updated);
                }}
                rows={1}
                style={{ fontSize: 12.5, color: '#334155', marginTop: 2 }}
              />
            </div>
          </div>

          {editableDoc.rubrikPenilaianSingkat && editableDoc.rubrikPenilaianSingkat.length > 0 && (
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
                {editableDoc.rubrikPenilaianSingkat.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.kriteria}
                        onChange={(e) => {
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], kriteria: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontWeight: 700, fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.baruBerkembang}
                        onChange={(e) => {
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], baruBerkembang: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontSize: 11.5 }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.layak}
                        onChange={(e) => {
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], layak: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontSize: 11.5 }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.cakap}
                        onChange={(e) => {
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], cakap: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontSize: 11.5 }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.mahir}
                        onChange={(e) => {
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], mahir: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontSize: 11.5 }}
                      />
                    </td>
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
              <div style={{ paddingLeft: 12, marginTop: 2 }}>• Pengayaan: {editableDoc.pengayaanDanRemedial?.pengayaan}</div>
              <div style={{ paddingLeft: 12, marginTop: 2 }}>• Remedial: {editableDoc.pengayaanDanRemedial?.remedial}</div>
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>B. Glosarium:</strong>
              {(editableDoc.glosarium || []).map((g, i) => (
                <div key={i} style={{ paddingLeft: 12, marginTop: 2 }}>
                  • <strong>{g.istilah}:</strong> {g.definisi}
                </div>
              ))}
            </div>
            <div>
              <strong>C. Daftar Pustaka:</strong>
              {(editableDoc.daftarPustaka || []).map((dp, i) => (
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
                {activeProfile.kotaSekolah || 'Indonesia'}, {editableDoc.createdAt || modul.createdAt}
              </div>
              <div style={{ marginBottom: 54 }}>Guru Mata Pelajaran</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {editableDoc.namaGuru || activeProfile.namaGuru || '......................................................'}
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
