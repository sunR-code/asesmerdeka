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
  Save,
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
import {
  loadModulAjarDraft,
  saveModulAjarDraft,
} from '../utils/perangkatDraftStorage';
import { buildAcademicContextKey } from './modulAjarHelpers';
import { requireActiveLicenseForAction } from '../utils/licenseManager';

interface ModulAjarViewerProps {
  modul: ModulAjarDokumen;
  schoolProfile?: SchoolProfile;
  customTP?: CustomTPItem | null;
  onPrint: () => void;
  onBackToClassHub: () => void;
  onDraftSaved?: (doc: ModulAjarDokumen) => void;
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
  onDraftSaved,
}) => {
  const activeProfile = schoolProfile || getSchoolProfile();
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const initialModel: ModulAjarModelType =
    (modul.modelType as ModulAjarModelType) &&
    MODUL_AJAR_MODELS.some((m) => m.id === modul.modelType)
      ? (modul.modelType as ModulAjarModelType)
      : 'pbl';

  const [selectedModel, setSelectedModel] = useState<ModulAjarModelType>(initialModel);
  const [konteksInput, setKonteksInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFromCommunity, setIsFromCommunity] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'Tersimpan' | 'Menyimpan...' | 'Gagal menyimpan'>('Tersimpan');
  const [editableDoc, setEditableDoc] = useState<ModulAjarDokumen>(() => {
    const initialTP: CustomTPItem = customTP || {
      id: modul.tpId || `tp-${modul.tpKode}`,
      kode: modul.tpKode,
      elemen: modul.elemen || '',
      materiPokok: modul.materiPokok || '',
      tujuanPembelajaran: modul.tujuanPembelajaran || '',
      arahanRangkuman: '',
      alokasiJP: 2,
      mingguMulai: 1,
      mingguSelesai: 1,
    };
    const restored = loadModulAjarDraft(activeProfile, initialTP, initialModel);
    return restored || modul;
  });

  const effectiveTP: CustomTPItem = customTP || {
    id: editableDoc.tpId || modul.tpId || `tp-${modul.tpKode}`,
    kode: modul.tpKode,
    elemen: modul.elemen || '',
    materiPokok: modul.materiPokok || '',
    tujuanPembelajaran: modul.tujuanPembelajaran || '',
    arahanRangkuman: '',
    alokasiJP: 2,
    mingguMulai: 1,
    mingguSelesai: 1,
  };

  const tpId = effectiveTP.id;
  const tpKode = effectiveTP.kode || modul.tpKode;
  const jenjang = activeProfile.jenjang || modul.jenjangFase || 'SD/MI';
  const kelas = modul.kelas || activeProfile.kelasUtama || '4';
  const mapel = modul.mataPelajaran || activeProfile.mataPelajaranUtama || 'Umum';
  const materiPokok = effectiveTP.materiPokok || modul.materiPokok || 'Umum';
  const academicContextKey = buildAcademicContextKey(activeProfile);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const pendingFlushRef = useRef<{
    dirty: boolean;
    doc: ModulAjarDokumen;
    profile: SchoolProfile;
    tp: CustomTPItem;
    model: ModulAjarModelType;
  }>({
    dirty: false,
    doc: editableDoc,
    profile: activeProfile,
    tp: effectiveTP,
    model: selectedModel,
  });

  const flushModulSaveNow = (
    overrideDoc?: ModulAjarDokumen,
    overrideSource?: 'user_edited' | 'ai_generated' | 'template'
  ) => {
    const payload = pendingFlushRef.current;
    const docToSave = overrideDoc || payload.doc;
    if (!overrideDoc && !payload.dirty) return;
    const res = saveModulAjarDraft(
      payload.profile,
      payload.tp,
      payload.model,
      docToSave,
      overrideSource || docToSave.draftSource || 'user_edited'
    );
    pendingFlushRef.current.dirty = false;
    pendingFlushRef.current.doc = res.doc;
    if (res.ok) {
      setSaveStatus('Tersimpan');
      onDraftSaved?.(res.doc);
    } else {
      setSaveStatus('Gagal menyimpan');
    }
  };

  const saveToLocalStorage = (
    doc: ModulAjarDokumen,
    source: 'user_edited' | 'ai_generated' | 'template' = 'user_edited'
  ) => {
    setSaveStatus('Menyimpan...');
    pendingFlushRef.current = {
      dirty: true,
      doc,
      profile: activeProfile,
      tp: effectiveTP,
      model: selectedModel,
    };
    flushModulSaveNow(doc, source);
  };

  useEffect(() => {
    const handleFlushOnExit = () => {
      flushModulSaveNow();
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushModulSaveNow();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handleFlushOnExit);
      window.addEventListener('beforeunload', handleFlushOnExit);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      flushModulSaveNow();
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handleFlushOnExit);
        window.removeEventListener('beforeunload', handleFlushOnExit);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  // Auto-Loading Shared Bank / Local Draft saat TP, konteks kelas, atau selectedModel berubah
  const prevModelRef = useRef<ModulAjarModelType | null>(null);

  useEffect(() => {
    let isMounted = true;
    const isModelChange =
      prevModelRef.current !== null && prevModelRef.current !== selectedModel;
    prevModelRef.current = selectedModel;

    pendingFlushRef.current = {
      dirty: false,
      doc: editableDoc,
      profile: activeProfile,
      tp: effectiveTP,
      model: selectedModel,
    };

    const selectedModelDef =
      MODUL_AJAR_MODELS.find((m) => m.id === selectedModel) || MODUL_AJAR_MODELS[0];

    const getFallbackDoc = (): ModulAjarDokumen => ({
      ...modul,
      tpId,
      modelType: selectedModel,
      modelPembelajaran: selectedModelDef.deskripsi
        ? `${selectedModelDef.label} - ${selectedModelDef.deskripsi}`
        : selectedModelDef.label,
    });

    const loadDraft = async () => {
      try {
        const localDraft = loadModulAjarDraft(activeProfile, effectiveTP, selectedModel);
        if (localDraft) {
          if (isMounted) {
            setEditableDoc(localDraft);
            pendingFlushRef.current.doc = localDraft;
            pendingFlushRef.current.dirty = false;
            setSaveStatus('Tersimpan');
            setIsFromCommunity(false);
          }
          return;
        }

        // Jika tidak di penyimpanan lokal terisolasi, cari di Bank Referensi Bersama
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
          pendingFlushRef.current.doc = hydrated;
          setIsFromCommunity(true);
          showToast('Draf referensi guru komunitas berhasil dimuat!');
        } else {
          const fallback = getFallbackDoc();
          setEditableDoc(fallback);
          pendingFlushRef.current.doc = fallback;
          setIsFromCommunity(false);
          if (isModelChange) {
            showToast(
              `Draf untuk model ${selectedModelDef.label} belum tersedia. Silakan klik "✨ Buat / Regenerasi AI" untuk merancang modul baru.`
            );
          }
        }
      } catch {
        if (isMounted) {
          const fallback = getFallbackDoc();
          setEditableDoc(fallback);
          pendingFlushRef.current.doc = fallback;
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
  }, [tpId, tpKode, academicContextKey, selectedModel, modul]);

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
      const sourceKind = result.usedFallback ? 'template' : 'ai_generated';
      const nextDoc: ModulAjarDokumen = {
        ...result.modul,
        tpId: effectiveTP.id,
        modelType: selectedModel,
        draftSource: sourceKind,
      };
      setEditableDoc(nextDoc);
      saveToLocalStorage(nextDoc, sourceKind);
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
              onClick={() => {
                flushModulSaveNow();
                onBackToClassHub();
              }}
              className="btn btn-sm btn-outline"
              style={{ borderColor: '#cbd5e1', background: '#f8fafc', fontWeight: 700 }}
            >
              <ArrowLeft size={14} /> Materi Kelas
            </button>
            <span className="badge badge-indigo">
              📘 Modul Ajar (RPP Kurikulum Merdeka)
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 999,
                background:
                  editableDoc.draftSource === 'ai_generated'
                    ? '#ecfdf5'
                    : editableDoc.draftSource === 'template'
                      ? '#fffbeb'
                      : '#eff6ff',
                color:
                  editableDoc.draftSource === 'ai_generated'
                    ? '#047857'
                    : editableDoc.draftSource === 'template'
                      ? '#b45309'
                      : '#1d4ed8',
                border: '1px solid currentColor',
              }}
            >
              {editableDoc.draftSource === 'ai_generated'
                ? '✨ Draf AI'
                : editableDoc.draftSource === 'template'
                  ? '🧩 Template Adaptif'
                  : '✏️ Edit Guru'}
            </span>
            <span
              role="status"
              style={{
                fontSize: 12,
                color: saveStatus === 'Gagal menyimpan' ? '#dc2626' : '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
              }}
            >
              <Save size={13} /> {saveStatus}
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
              onChange={(e) => {
                flushModulSaveNow();
                setSelectedModel(e.target.value as ModulAjarModelType);
              }}
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
          padding: 'clamp(18px, 4vw, 40px) clamp(14px, 4vw, 48px)',
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

          <div className="print-table-scroll" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
          </div>

          {/* Kompetensi Awal, Profil Pancasila & Sarana */}
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
            <div style={{ marginBottom: 10 }}>
              <strong style={{ color: '#1e40af' }}>Kompetensi Awal (Prasyarat Peserta Didik):</strong>
              {(editableDoc.kompetensiAwal && editableDoc.kompetensiAwal.length > 0 ? editableDoc.kompetensiAwal : ['']).map((ka, idx) => (
                <div key={idx} style={{ marginTop: 4 }}>
                  <AutoExpandingTextarea
                    value={ka}
                    onChange={(e) => {
                      const list = [...(editableDoc.kompetensiAwal || [''])];
                      list[idx] = e.target.value;
                      const updated = { ...editableDoc, kompetensiAwal: list };
                      setEditableDoc(updated);
                      saveToLocalStorage(updated);
                    }}
                    rows={1}
                    style={{ fontSize: 12.5, color: '#334155' }}
                    placeholder="Isi pengetahuan/keterampilan prasyarat sebelum materi ini..."
                  />
                </div>
              ))}
            </div>
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
            {editableDoc.targetSubTP && editableDoc.targetSubTP.length > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: 12 }}>
                <strong style={{ color: '#1e40af' }}>Target Sub-TP / Indikator Pertemuan:</strong>
                <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#334155' }}>
                  {editableDoc.targetSubTP.map((sub, sIdx) => (
                    <li key={sub.id || sIdx} style={{ marginBottom: 2 }}>
                      <strong>{sub.kode}:</strong> {sub.kompetensi}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {editableDoc.bahanBacaan && (
            <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                Ringkasan Bahan Bacaan Guru & Siswa:
              </div>
              <AutoExpandingTextarea
                value={editableDoc.bahanBacaan.ringkasanInti || ''}
                onChange={(e) => {
                  const updated = {
                    ...editableDoc,
                    bahanBacaan: {
                      ...(editableDoc.bahanBacaan || { konsepKunci: [] }),
                      ringkasanInti: e.target.value,
                    },
                  };
                  setEditableDoc(updated);
                  saveToLocalStorage(updated);
                }}
                rows={2}
                style={{ fontSize: 12.5, color: '#14532d' }}
              />
              {editableDoc.bahanBacaan.konsepKunci && editableDoc.bahanBacaan.konsepKunci.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {editableDoc.bahanBacaan.konsepKunci.map((kk, kIdx) => (
                    <span
                      key={kIdx}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: '#dcfce7',
                        color: '#166534',
                        border: '1px solid #86efac',
                      }}
                    >
                      {kk}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
                  <strong style={{ fontSize: 12.5, color: '#047857' }}>
                    2. Kegiatan Inti ({editableDoc.modelPembelajaran || 'Model Terpilih'}):
                  </strong>
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
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12 }}>
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
            </div>
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
            {(editableDoc.refleksiGuru?.length || editableDoc.refleksiSiswa?.length) ? (
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                {editableDoc.refleksiGuru && editableDoc.refleksiGuru.length > 0 && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                    <strong>D. Refleksi Guru:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {editableDoc.refleksiGuru.map((rg, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <AutoExpandingTextarea
                            value={rg}
                            onChange={(e) => {
                              const list = [...(editableDoc.refleksiGuru || [])];
                              list[idx] = e.target.value;
                              const updated = { ...editableDoc, refleksiGuru: list };
                              setEditableDoc(updated);
                              saveToLocalStorage(updated);
                            }}
                            rows={1}
                            style={{ fontSize: 12, color: '#334155' }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {editableDoc.refleksiSiswa && editableDoc.refleksiSiswa.length > 0 && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                    <strong>E. Refleksi Peserta Didik:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {editableDoc.refleksiSiswa.map((rs, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <AutoExpandingTextarea
                            value={rs}
                            onChange={(e) => {
                              const list = [...(editableDoc.refleksiSiswa || [])];
                              list[idx] = e.target.value;
                              const updated = { ...editableDoc, refleksiSiswa: list };
                              setEditableDoc(updated);
                              saveToLocalStorage(updated);
                            }}
                            rows={1}
                            style={{ fontSize: 12, color: '#334155' }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Blok Pengesahan Tanda Tangan */}
        {activeProfile.tampilkanTandaTangan && (
          <div
            style={{
              marginTop: 36,
              paddingTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
