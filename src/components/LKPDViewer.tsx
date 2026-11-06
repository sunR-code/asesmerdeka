import React, { useRef, useState, useEffect } from 'react';
import {
  FileDown,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Image,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  BookOpen,
  FlaskConical,
  Layers,
  Users,
  RefreshCw,
} from 'lucide-react';
import type {
  LKPDDokumen,
  LKPDPresetType,
  LKPDPertanyaanItem,
  LKPDEksperimenData,
  LKPDDiferensiasiData,
  LKPDProyekData,
} from '../types/perangkatAjar';
import type { CustomTPItem, SchoolProfile } from '../utils/schoolProfileStorage';
import { getSchoolProfile } from '../utils/schoolProfileStorage';
import { buildSmartLKPD } from '../utils/perangkatAjarEngine';
import { generateContextualLKPDWithAI } from '../utils/lkpdAiService';
import { exportLKPDToDocx } from '../utils/docxExporter';
import { exportElementToImage } from '../utils/imageExporter';

export interface LKPDViewerProps {
  lkpd: LKPDDokumen;
  schoolProfile?: SchoolProfile;
  customTP?: CustomTPItem;
  onPrint: () => void;
  onBackToClassHub: () => void;
}

const ARCHETYPES: {
  id: LKPDPresetType;
  label: string;
  badge: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'kasus',
    label: 'Studi Kasus & Wacana',
    badge: 'Kasus & Wacana',
    desc: 'Literasi kritis, analisis masalah nyata & pemecahan masalah',
    icon: <BookOpen size={16} />,
  },
  {
    id: 'eksperimen',
    label: 'Eksperimen & Data',
    badge: 'Eksperimen & Data',
    desc: 'Metode ilmiah, uji hipotesis, alat-bahan & tabel observasi',
    icon: <FlaskConical size={16} />,
  },
  {
    id: 'diferensiasi',
    label: 'Berdiferensiasi',
    badge: 'Berdiferensiasi',
    desc: '3 Jalur kesiapan belajar: Dasar, Menengah, Mahir (Inklusif)',
    icon: <Layers size={16} />,
  },
  {
    id: 'proyek',
    label: 'Proyek Kolaboratif',
    badge: 'Proyek Kolaboratif',
    desc: 'Kerja tim, pembagian peran, linimasa & rubrik karya nyata',
    icon: <Users size={16} />,
  },
];

export const LKPDViewer: React.FC<LKPDViewerProps> = ({
  lkpd,
  schoolProfile,
  customTP,
  onPrint,
  onBackToClassHub,
}) => {
  const activeProfile = schoolProfile || getSchoolProfile();

  // Current working LKPD and active preset
  const [currentDoc, setCurrentDoc] = useState<LKPDDokumen>(lkpd);
  const [currentPreset, setCurrentPreset] = useState<LKPDPresetType>(lkpd.presetType || 'kasus');
  const [konteksInput, setKonteksInput] = useState<string>(lkpd.konteksAktual || '');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('Tersimpan otomatis');
  const [showTeacherGuide, setShowTeacherGuide] = useState<boolean>(false);

  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const tpId = currentDoc.tpId || customTP?.id || 'tp-1';

  const effectiveTP: CustomTPItem = customTP || {
    id: tpId,
    kode: currentDoc.tpKode || 'TP-1',
    elemen: 'Pemahaman Konseptual',
    materiPokok: currentDoc.materiPokok || 'Materi Pokok',
    tujuanPembelajaran: currentDoc.tujuanPembelajaran || 'Tujuan Pembelajaran',
    arahanRangkuman: '',
    alokasiJP: 2,
    mingguMulai: 1,
    mingguSelesai: 2,
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  // Auto-save debounce (400ms) with key lkpd_${tpId}_${presetType}
  useEffect(() => {
    setSaveStatus('Menyimpan perubahan...');
    const timer = setTimeout(() => {
      try {
        const key = `lkpd_${tpId}_${currentPreset}`;
        localStorage.setItem(key, JSON.stringify(currentDoc));
        setSaveStatus('Tersimpan otomatis');
      } catch {
        setSaveStatus('Tersimpan lokal');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [currentDoc, tpId, currentPreset]);

  // Switch Archetype Preset
  const handleSwitchPreset = (presetId: LKPDPresetType) => {
    if (presetId === currentPreset) return;
    setCurrentPreset(presetId);

    const storageKey = `lkpd_${tpId}_${presetId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setCurrentDoc(parsed);
          showToast(`Draft preset "${presetId}" berhasil dimuat.`);
          return;
        }
      }
    } catch {
      // ignore
    }

    // Build fresh preset heuristic if no saved draft
    const fresh = buildSmartLKPD(effectiveTP, activeProfile, presetId, konteksInput);
    setCurrentDoc(fresh);
    showToast(`Preset "${presetId}" aktif.`);
  };

  // AI Re-generation
  const handleRegenerateAI = async () => {
    setIsGeneratingAI(true);
    showToast('⚡ Menghubungi AI Gemini untuk menyusun LKPD kontekstual...');
    try {
      const result = await generateContextualLKPDWithAI(
        effectiveTP,
        activeProfile,
        currentPreset,
        konteksInput
      );
      setCurrentDoc(result.lkpd);
      if (result.usedFallback) {
        showToast(
          result.errorMsg
            ? `Generator kurikulum: ${result.errorMsg}`
            : 'Generator kurikulum aktif (kuota/offline)'
        );
      } else {
        showToast('✨ LKPD Kontekstual AI berhasil diperbarui!');
      }
    } catch (err: any) {
      showToast('Gagal memproses AI: ' + (err?.message || 'Error'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCopyText = () => {
    let text = `LEMBAR KERJA PESERTA DIDIK (LKPD): ${currentDoc.judul || currentDoc.materiPokok}\n`;
    text += `Preset: ${currentPreset.toUpperCase()} | Konteks: ${currentDoc.konteksAktual || '-'}\n`;
    text += `Mata Pelajaran: ${currentDoc.mataPelajaran} | Kelas: ${currentDoc.kelas} (${currentDoc.jenjangFase})\n\n`;
    text += `TUJUAN PEMBELAJARAN (TP ${currentDoc.tpKode}):\n${currentDoc.tujuanPembelajaran}\n\n`;
    text += `STIMULUS: ${currentDoc.stimulusKasus.judul}\n${currentDoc.stimulusKasus.teks}\n\n`;

    if (currentDoc.eksperimenData) {
      text += `ALAT & BAHAN:\n${currentDoc.eksperimenData.alatDanBahan.map((a) => `- ${a}`).join('\n')}\n`;
      text += `HIPOTESIS AWAL:\n${currentDoc.eksperimenData.hipotesisAwal}\n\n`;
    }

    if (currentDoc.diferensiasiData) {
      text += `TUGAS BERDIFERENSIASI:\n`;
      text += `1. Tingkat Dasar: ${currentDoc.diferensiasiData.tingkatDasar.instruksi}\n`;
      text += `2. Tingkat Menengah: ${currentDoc.diferensiasiData.tingkatMenengah.instruksi}\n`;
      text += `3. Tingkat Mahir: ${currentDoc.diferensiasiData.tingkatMahir.instruksi}\n\n`;
    }

    if (currentDoc.proyekData) {
      text += `TUJUAN PROYEK:\n${currentDoc.proyekData.tujuanProyek}\n`;
      text += `TAHAPAN WAKTU:\n${currentDoc.proyekData.tahapanWaktu}\n\n`;
    }

    text += `PERTANYAAN DISKUSI:\n`;
    currentDoc.pertanyaanAnalisis.forEach((pa) => {
      text += `${pa.nomor}. ${pa.pertanyaan}\n`;
      if (showTeacherGuide && pa.panduanJawabanSingkat) {
        text += `   [Kunci/Panduan Guru]: ${pa.panduanJawabanSingkat}\n`;
      }
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
      const cleanName = `LKPD_${currentDoc.materiPokok.replace(/[^a-zA-Z0-9]/g, '_')}_${currentPreset}`;
      await exportElementToImage(sheetRef.current, cleanName);
      showToast('Gambar LKPD berhasil disimpan! Siap dibagikan ke WhatsApp.');
    } catch (e: any) {
      alert('Gagal mengekspor gambar: ' + e.message);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportDocxClick = async () => {
    try {
      await exportLKPDToDocx(currentDoc, activeProfile, showTeacherGuide);
      showToast('File Word LKPD (.docx) berhasil diunduh!');
    } catch (e: any) {
      alert('Gagal mengunduh file Word: ' + e.message);
    }
  };

  // Mutators for inline editing
  const updateDoc = (partial: Partial<LKPDDokumen>) => {
    setCurrentDoc((prev) => ({ ...prev, ...partial }));
  };

  const updateStimulus = (field: 'judul' | 'teks' | 'pertanyaanAwal', val: string) => {
    setCurrentDoc((prev) => ({
      ...prev,
      stimulusKasus: {
        ...prev.stimulusKasus,
        [field]: val,
      },
    }));
  };

  // Question mutators
  const addQuestion = () => {
    const nextNomor = currentDoc.pertanyaanAnalisis.length + 1;
    const newItem: LKPDPertanyaanItem = {
      id: `q-${Date.now()}`,
      nomor: nextNomor,
      pertanyaan: `Pertanyaan analisis baru ke-${nextNomor}`,
      tingkatKognitif: 'Menengah',
      panduanJawabanSingkat: 'Panduan jawaban atau rubrik untuk guru...',
      petunjukPengerjaan: 'Diskusikan bersama kelompok.',
    };
    setCurrentDoc((prev) => ({
      ...prev,
      pertanyaanAnalisis: [...prev.pertanyaanAnalisis, newItem],
    }));
    showToast('Pertanyaan baru ditambahkan.');
  };

  const deleteQuestion = (index: number) => {
    const updated = currentDoc.pertanyaanAnalisis
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, nomor: idx + 1 }));
    setCurrentDoc((prev) => ({ ...prev, pertanyaanAnalisis: updated }));
    showToast('Pertanyaan dihapus.');
  };

  const updateQuestion = (index: number, partial: Partial<LKPDPertanyaanItem>) => {
    const updated = [...currentDoc.pertanyaanAnalisis];
    updated[index] = { ...updated[index], ...partial };
    setCurrentDoc((prev) => ({ ...prev, pertanyaanAnalisis: updated }));
  };

  // Step mutators
  const addStep = () => {
    const nextLangkah = currentDoc.langkahAktivitas.length + 1;
    setCurrentDoc((prev) => ({
      ...prev,
      langkahAktivitas: [
        ...prev.langkahAktivitas,
        {
          langkahKe: nextLangkah,
          instruksi: `Langkah eksplorasi baru ke-${nextLangkah}`,
          bantuanAtauTabel: undefined,
        },
      ],
    }));
    showToast('Langkah kerja baru ditambahkan.');
  };

  const deleteStep = (index: number) => {
    const updated = currentDoc.langkahAktivitas
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, langkahKe: idx + 1 }));
    setCurrentDoc((prev) => ({ ...prev, langkahAktivitas: updated }));
  };

  const updateStepInstruksi = (index: number, val: string) => {
    const updated = [...currentDoc.langkahAktivitas];
    updated[index] = { ...updated[index], instruksi: val };
    setCurrentDoc((prev) => ({ ...prev, langkahAktivitas: updated }));
  };

  // Reflection mutators
  const addReflection = () => {
    setCurrentDoc((prev) => ({
      ...prev,
      kesimpulanRefleksi: [
        ...prev.kesimpulanRefleksi,
        'Apa hal paling berharga yang saya pelajari hari ini?',
      ],
    }));
  };

  const deleteReflection = (index: number) => {
    setCurrentDoc((prev) => ({
      ...prev,
      kesimpulanRefleksi: prev.kesimpulanRefleksi.filter((_, i) => i !== index),
    }));
  };

  const updateReflection = (index: number, val: string) => {
    const updated = [...currentDoc.kesimpulanRefleksi];
    updated[index] = val;
    setCurrentDoc((prev) => ({ ...prev, kesimpulanRefleksi: updated }));
  };

  // Eksperimen mutators
  const updateEksperimen = (partial: Partial<LKPDEksperimenData>) => {
    setCurrentDoc((prev) => ({
      ...prev,
      eksperimenData: {
        ...(prev.eksperimenData || {
          alatDanBahan: [],
          hipotesisAwal: '',
          tabelObservasi: { kolom: [], baris: [] },
        }),
        ...partial,
      },
    }));
  };

  // Diferensiasi mutators
  const updateDiferensiasi = (partial: Partial<LKPDDiferensiasiData>) => {
    setCurrentDoc((prev) => ({
      ...prev,
      diferensiasiData: {
        ...(prev.diferensiasiData || {
          tingkatDasar: { instruksi: '', tugas: [] },
          tingkatMenengah: { instruksi: '', tugas: [] },
          tingkatMahir: { instruksi: '', tugas: [] },
        }),
        ...partial,
      },
    }));
  };

  // Proyek mutators
  const updateProyek = (partial: Partial<LKPDProyekData>) => {
    setCurrentDoc((prev) => ({
      ...prev,
      proyekData: {
        ...(prev.proyekData || {
          tujuanProyek: '',
          tahapanWaktu: '',
          peranAnggota: [],
          rubrikKarya: [],
        }),
        ...partial,
      },
    }));
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

      {/* TOP BENTO CONTROL PANEL: SMART PRESET STUDIO */}
      <div className="no-print lkpd-studio-bento">
        {/* Navigation & Status Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: '1px solid #f1f5f9',
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
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 12.5,
                fontWeight: 800,
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
              }}
            >
              ✨ Smart LKPD Preset Studio
            </span>
            <span
              style={{
                fontSize: 12,
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
              }}
            >
              <Save size={13} /> {saveStatus}
            </span>
          </div>

          {/* Action Export Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowTeacherGuide((v) => !v)}
              className="btn btn-sm"
              style={{
                background: showTeacherGuide ? '#fef3c7' : '#f8fafc',
                color: showTeacherGuide ? '#92400e' : '#475569',
                border: showTeacherGuide ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                fontWeight: 700,
              }}
              title="Aktifkan/nonaktifkan kunci jawaban dan rubrik guru"
            >
              {showTeacherGuide ? <EyeOff size={14} /> : <Eye size={14} />}
              {showTeacherGuide ? '👁️ Sembunyikan Kunci Guru' : '👁️ Tampilkan Panduan Guru / Kunci'}
            </button>

            <button onClick={handleCopyText} className="btn btn-sm btn-outline">
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copied ? 'Tersalin!' : 'Salin Teks'}
            </button>

            <button
              onClick={handleExportDocxClick}
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
              title="Download gambar PNG resolusi tinggi untuk WhatsApp"
            >
              <Image size={14} /> {isExportingImage ? 'Memproses...' : 'Unduh Gambar (.png)'}
            </button>

            <button onClick={onPrint} className="btn btn-sm btn-success">
              <Printer size={14} /> Cetak / PDF
            </button>
          </div>
        </div>

        {/* 4 Archetype Pill Buttons */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748b', marginBottom: 8 }}>
            Pilih Model Pedagogis LKPD (4 Archetype Kurikulum Merdeka):
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ARCHETYPES.map((arch) => {
              const isActive = currentPreset === arch.id;
              return (
                <button
                  key={arch.id}
                  onClick={() => handleSwitchPreset(arch.id)}
                  className={`lkpd-archetype-pill ${isActive ? 'is-active' : ''}`}
                  title={arch.desc}
                >
                  {arch.icon}
                  <span>{arch.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Context Keyword Input + AI Regenerate Button */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 10,
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '10px 14px',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Konteks Nyata / Lingkungan Sekolah (Contextual Prompt):
            </div>
            <input
              type="text"
              value={konteksInput}
              onChange={(e) => setKonteksInput(e.target.value)}
              placeholder="Contoh: Banjir rob pesisir utara, pemanfaatan botol plastik daur ulang, kuliner pasar tradisional..."
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 12.5,
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
            <button
              onClick={handleRegenerateAI}
              disabled={isGeneratingAI}
              className="btn btn-sm btn-primary"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                color: '#ffffff',
                fontWeight: 700,
                padding: '8px 16px',
                height: 38,
              }}
              title="Generate ulang LKPD menggunakan model AI Gemini sesuai topik kontekstual"
            >
              {isGeneratingAI ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isGeneratingAI ? 'Memproses AI...' : '⚡ Generate Ulang'}
            </button>
          </div>
        </div>
      </div>

      {/* TEACHER GUIDE NOTICE BANNER */}
      {showTeacherGuide && (
        <div
          className="no-print"
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 16,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)',
          }}
        >
          <span style={{ fontSize: 20 }}>👁️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>
              Mode Panduan Guru & Kunci Jawaban Aktif
            </div>
            <div style={{ fontSize: 12, color: '#b45309' }}>
              Kunci jawaban, pedoman penilaian, dan rubrik guru ditampilkan. Anda dapat mencetak versi ini untuk pegangan guru atau menonaktifkannya untuk lembar siswa.
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE SHEET CANVAS WITH INLINE WYSIWYG EDITING */}
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
            {currentDoc.namaSekolah || activeProfile.namaSekolah}
          </h2>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0d9488', margin: '4px 0 2px' }}>
            LEMBAR KERJA PESERTA DIDIK (LKPD)
          </h1>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <span>TOPIK:</span>
            <input
              type="text"
              value={currentDoc.judul || currentDoc.materiPokok}
              onChange={(e) => updateDoc({ judul: e.target.value })}
              className="lkpd-inline-input"
              style={{ fontWeight: 800, textAlign: 'center', maxWidth: 450, color: '#0f172a' }}
              title="Klik untuk mengedit judul/topik LKPD"
            />
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
            Archetype: <strong style={{ color: '#0d9488' }}>{ARCHETYPES.find((a) => a.id === currentPreset)?.label}</strong>
            {currentDoc.konteksAktual && ` • Konteks: "${currentDoc.konteksAktual}"`}
          </div>
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
            <div style={{ marginBottom: 4 }}>
              <strong>Mata Pelajaran:</strong> {currentDoc.mataPelajaran}
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>Kelas / Rombel:</strong> Kelas {currentDoc.kelas} ({activeProfile.rombelAktif || currentDoc.rombel}) • Sem. {currentDoc.semester}
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>Alokasi Waktu:</strong> {currentDoc.alokasiWaktu}
            </div>
            <div>
              <strong>Tujuan Belajar:</strong> {currentDoc.tujuanPembelajaran}
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>
              <strong>Nama Kelompok:</strong> ....................................................
            </div>
            <div style={{ marginBottom: 2 }}>
              <strong>Anggota Kelompok:</strong>
            </div>
            <div style={{ color: '#475569', fontSize: 12 }}>1. ............................................................................</div>
            <div style={{ color: '#475569', fontSize: 12 }}>2. ............................................................................</div>
            <div style={{ color: '#475569', fontSize: 12 }}>3. ............................................................................</div>
            <div style={{ color: '#475569', fontSize: 12 }}>4. ............................................................................</div>
          </div>
        </div>

        {/* Petunjuk Belajar */}
        <div style={{ marginBottom: 22, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
              📌 Petunjuk Pengerjaan LKPD:
            </div>
            <button
              onClick={() => {
                updateDoc({
                  petunjukPengerjaan: [...currentDoc.petunjukPengerjaan, 'Petunjuk pengerjaan tambahan...'],
                });
              }}
              className="no-print lkpd-btn-add"
              style={{ fontSize: 11, padding: '2px 8px' }}
            >
              <Plus size={12} /> Tambah Petunjuk
            </button>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#14532d', lineHeight: 1.5 }}>
            {currentDoc.petunjukPengerjaan.map((pt, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="text"
                    value={pt}
                    onChange={(e) => {
                      const updated = [...currentDoc.petunjukPengerjaan];
                      updated[i] = e.target.value;
                      updateDoc({ petunjukPengerjaan: updated });
                    }}
                    className="lkpd-inline-input"
                    style={{ color: '#14532d', fontSize: 12 }}
                  />
                  {currentDoc.petunjukPengerjaan.length > 1 && (
                    <button
                      onClick={() => {
                        const updated = currentDoc.petunjukPengerjaan.filter((_, idx) => idx !== i);
                        updateDoc({ petunjukPengerjaan: updated });
                      }}
                      className="no-print lkpd-btn-icon-danger"
                      style={{ width: 20, height: 20 }}
                      title="Hapus petunjuk"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* I. STIMULUS KASUS / WACANA */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', margin: 0 }}>
              I. Stimulus Kasus:
            </h3>
            <input
              type="text"
              value={currentDoc.stimulusKasus.judul}
              onChange={(e) => updateStimulus('judul', e.target.value)}
              className="lkpd-inline-input"
              style={{ fontWeight: 800, fontSize: 14, color: '#0d9488', flex: 1 }}
              placeholder="Judul stimulus..."
            />
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 }}>
            <textarea
              rows={4}
              value={currentDoc.stimulusKasus.teks}
              onChange={(e) => updateStimulus('teks', e.target.value)}
              className="lkpd-inline-textarea"
              style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', lineHeight: 1.6 }}
              placeholder="Tulis narasi wacana / stimulus kontekstual di sini..."
            />
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚡ Tantangan Awal:</span>
            <input
              type="text"
              value={currentDoc.stimulusKasus.pertanyaanAwal || ''}
              onChange={(e) => updateStimulus('pertanyaanAwal', e.target.value)}
              className="lkpd-inline-input"
              style={{ fontWeight: 700, color: '#b45309', flex: 1 }}
              placeholder="Rumusan tantangan atau pertanyaan pemantik..."
            />
          </div>
        </div>

        {/* ARCHETYPE SPECIAL MODULE: EKSPERIMEN */}
        {currentPreset === 'eksperimen' && currentDoc.eksperimenData && (
          <div style={{ marginBottom: 24, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FlaskConical size={18} /> Penyelidikan Ilmiah & Pengamatan Data
            </h3>

            {/* Alat & Bahan */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Alat dan Bahan:</span>
                <button
                  onClick={() => {
                    const current = currentDoc.eksperimenData?.alatDanBahan || [];
                    updateEksperimen({ alatDanBahan: [...current, 'Alat/bahan baru...'] });
                  }}
                  className="no-print lkpd-btn-add"
                >
                  <Plus size={12} /> Tambah Alat/Bahan
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {currentDoc.eksperimenData.alatDanBahan.map((ab, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="text"
                        value={ab}
                        onChange={(e) => {
                          const updated = [...(currentDoc.eksperimenData?.alatDanBahan || [])];
                          updated[idx] = e.target.value;
                          updateEksperimen({ alatDanBahan: updated });
                        }}
                        className="lkpd-inline-input"
                        style={{ fontSize: 12 }}
                      />
                      <button
                        onClick={() => {
                          const updated = (currentDoc.eksperimenData?.alatDanBahan || []).filter((_, i) => i !== idx);
                          updateEksperimen({ alatDanBahan: updated });
                        }}
                        className="no-print lkpd-btn-icon-danger"
                        style={{ width: 20, height: 20 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hipotesis Awal */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                Hipotesis Awal (Dugaan Sementara Kelompok):
              </span>
              <textarea
                rows={2}
                value={currentDoc.eksperimenData.hipotesisAwal}
                onChange={(e) => updateEksperimen({ hipotesisAwal: e.target.value })}
                className="lkpd-inline-textarea"
                style={{ fontSize: 12.5, border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', background: '#ffffff' }}
                placeholder="Tulis rumusan hipotesis awal..."
              />
            </div>

            {/* Tabel Observasi */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Tabel Observasi & Pengumpulan Data:</span>
                <button
                  onClick={() => {
                    const table = currentDoc.eksperimenData?.tabelObservasi;
                    if (!table) return;
                    const newRow = table.kolom.map((_, i) => (i === 0 ? String(table.baris.length + 1) : '-'));
                    updateEksperimen({
                      tabelObservasi: {
                        ...table,
                        baris: [...table.baris, newRow],
                      },
                    });
                  }}
                  className="no-print lkpd-btn-add"
                >
                  <Plus size={12} /> Tambah Baris Observasi
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#ffffff' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {currentDoc.eksperimenData.tabelObservasi.kolom.map((col, ci) => (
                        <th key={ci} style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left', fontWeight: 800 }}>
                          {col}
                        </th>
                      ))}
                      <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 40, padding: 4 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDoc.eksperimenData.tabelObservasi.baris.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => {
                                const table = currentDoc.eksperimenData?.tabelObservasi;
                                if (!table) return;
                                const updatedRows = table.baris.map((r, rIndex) =>
                                  rIndex === ri
                                    ? r.map((c, cIndex) => (cIndex === ci ? e.target.value : c))
                                    : r
                                );
                                updateEksperimen({
                                  tabelObservasi: { ...table, baris: updatedRows },
                                });
                              }}
                              className="lkpd-inline-input"
                              style={{ fontSize: 12, padding: '2px 4px' }}
                            />
                          </td>
                        ))}
                        <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              const table = currentDoc.eksperimenData?.tabelObservasi;
                              if (!table) return;
                              const updatedRows = table.baris.filter((_, i) => i !== ri);
                              updateEksperimen({
                                tabelObservasi: { ...table, baris: updatedRows },
                              });
                            }}
                            className="lkpd-btn-icon-danger"
                            style={{ width: 22, height: 22 }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ARCHETYPE SPECIAL MODULE: BERDIFERENSIASI */}
        {currentPreset === 'diferensiasi' && currentDoc.diferensiasiData && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} /> Tugas Berdiferensiasi (Pilihan Jalur Kesiapan Belajar)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {/* Tingkat Dasar */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, background: '#22c55e', color: '#ffffff', padding: '2px 8px', borderRadius: 4 }}>
                    🟢 Jalur Fondasi (Dasar)
                  </span>
                  <button
                    onClick={() => {
                      const cur = currentDoc.diferensiasiData?.tingkatDasar;
                      if (!cur) return;
                      updateDiferensiasi({
                        tingkatDasar: { ...cur, tugas: [...cur.tugas, 'Tugas fondasi baru...'] },
                      });
                    }}
                    className="no-print lkpd-btn-add"
                    style={{ fontSize: 10, padding: '2px 6px' }}
                  >
                    <Plus size={10} /> Tambah
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={currentDoc.diferensiasiData.tingkatDasar.instruksi}
                  onChange={(e) => {
                    const cur = currentDoc.diferensiasiData?.tingkatDasar;
                    if (!cur) return;
                    updateDiferensiasi({ tingkatDasar: { ...cur, instruksi: e.target.value } });
                  }}
                  className="lkpd-inline-textarea"
                  style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 8 }}
                />
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#14532d' }}>
                  {currentDoc.diferensiasiData.tingkatDasar.tugas.map((t, ti) => (
                    <li key={ti} style={{ marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          value={t}
                          onChange={(e) => {
                            const cur = currentDoc.diferensiasiData?.tingkatDasar;
                            if (!cur) return;
                            const updated = [...cur.tugas];
                            updated[ti] = e.target.value;
                            updateDiferensiasi({ tingkatDasar: { ...cur, tugas: updated } });
                          }}
                          className="lkpd-inline-input"
                          style={{ fontSize: 11.5 }}
                        />
                        <button
                          onClick={() => {
                            const cur = currentDoc.diferensiasiData?.tingkatDasar;
                            if (!cur) return;
                            updateDiferensiasi({
                              tingkatDasar: { ...cur, tugas: cur.tugas.filter((_, idx) => idx !== ti) },
                            });
                          }}
                          className="no-print lkpd-btn-icon-danger"
                          style={{ width: 18, height: 18 }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tingkat Menengah */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: 4 }}>
                    🔵 Jalur Penerapan (Menengah)
                  </span>
                  <button
                    onClick={() => {
                      const cur = currentDoc.diferensiasiData?.tingkatMenengah;
                      if (!cur) return;
                      updateDiferensiasi({
                        tingkatMenengah: { ...cur, tugas: [...cur.tugas, 'Tugas penerapan baru...'] },
                      });
                    }}
                    className="no-print lkpd-btn-add"
                    style={{ fontSize: 10, padding: '2px 6px' }}
                  >
                    <Plus size={10} /> Tambah
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={currentDoc.diferensiasiData.tingkatMenengah.instruksi}
                  onChange={(e) => {
                    const cur = currentDoc.diferensiasiData?.tingkatMenengah;
                    if (!cur) return;
                    updateDiferensiasi({ tingkatMenengah: { ...cur, instruksi: e.target.value } });
                  }}
                  className="lkpd-inline-textarea"
                  style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}
                />
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#075985' }}>
                  {currentDoc.diferensiasiData.tingkatMenengah.tugas.map((t, ti) => (
                    <li key={ti} style={{ marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          value={t}
                          onChange={(e) => {
                            const cur = currentDoc.diferensiasiData?.tingkatMenengah;
                            if (!cur) return;
                            const updated = [...cur.tugas];
                            updated[ti] = e.target.value;
                            updateDiferensiasi({ tingkatMenengah: { ...cur, tugas: updated } });
                          }}
                          className="lkpd-inline-input"
                          style={{ fontSize: 11.5 }}
                        />
                        <button
                          onClick={() => {
                            const cur = currentDoc.diferensiasiData?.tingkatMenengah;
                            if (!cur) return;
                            updateDiferensiasi({
                              tingkatMenengah: { ...cur, tugas: cur.tugas.filter((_, idx) => idx !== ti) },
                            });
                          }}
                          className="no-print lkpd-btn-icon-danger"
                          style={{ width: 18, height: 18 }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tingkat Mahir */}
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, background: '#7c3aed', color: '#ffffff', padding: '2px 8px', borderRadius: 4 }}>
                    🟣 Jalur Kreasi & Solusi (Mahir)
                  </span>
                  <button
                    onClick={() => {
                      const cur = currentDoc.diferensiasiData?.tingkatMahir;
                      if (!cur) return;
                      updateDiferensiasi({
                        tingkatMahir: { ...cur, tugas: [...cur.tugas, 'Tugas kreasi baru...'] },
                      });
                    }}
                    className="no-print lkpd-btn-add"
                    style={{ fontSize: 10, padding: '2px 6px' }}
                  >
                    <Plus size={10} /> Tambah
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={currentDoc.diferensiasiData.tingkatMahir.instruksi}
                  onChange={(e) => {
                    const cur = currentDoc.diferensiasiData?.tingkatMahir;
                    if (!cur) return;
                    updateDiferensiasi({ tingkatMahir: { ...cur, instruksi: e.target.value } });
                  }}
                  className="lkpd-inline-textarea"
                  style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 8 }}
                />
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#581c87' }}>
                  {currentDoc.diferensiasiData.tingkatMahir.tugas.map((t, ti) => (
                    <li key={ti} style={{ marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          value={t}
                          onChange={(e) => {
                            const cur = currentDoc.diferensiasiData?.tingkatMahir;
                            if (!cur) return;
                            const updated = [...cur.tugas];
                            updated[ti] = e.target.value;
                            updateDiferensiasi({ tingkatMahir: { ...cur, tugas: updated } });
                          }}
                          className="lkpd-inline-input"
                          style={{ fontSize: 11.5 }}
                        />
                        <button
                          onClick={() => {
                            const cur = currentDoc.diferensiasiData?.tingkatMahir;
                            if (!cur) return;
                            updateDiferensiasi({
                              tingkatMahir: { ...cur, tugas: cur.tugas.filter((_, idx) => idx !== ti) },
                            });
                          }}
                          className="no-print lkpd-btn-icon-danger"
                          style={{ width: 18, height: 18 }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ARCHETYPE SPECIAL MODULE: PROYEK KOLABORATIF */}
        {currentPreset === 'proyek' && currentDoc.proyekData && (
          <div style={{ marginBottom: 24, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} /> Rencana Proyek Kolaboratif & Pembagian Peran Tim
            </h3>

            {/* Tujuan & Linimasa */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                  Tujuan Produk Akhir Proyek:
                </span>
                <textarea
                  rows={2}
                  value={currentDoc.proyekData.tujuanProyek}
                  onChange={(e) => updateProyek({ tujuanProyek: e.target.value })}
                  className="lkpd-inline-textarea"
                  style={{ fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', background: '#ffffff' }}
                />
              </div>
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                  Tahapan & Alokasi Waktu:
                </span>
                <textarea
                  rows={2}
                  value={currentDoc.proyekData.tahapanWaktu}
                  onChange={(e) => updateProyek({ tahapanWaktu: e.target.value })}
                  className="lkpd-inline-textarea"
                  style={{ fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', background: '#ffffff' }}
                />
              </div>
            </div>

            {/* Peran Anggota Tim */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Struktur & Tanggung Jawab Peran:</span>
                <button
                  onClick={() => {
                    const roles = currentDoc.proyekData?.peranAnggota || [];
                    updateProyek({
                      peranAnggota: [...roles, { peran: 'Peran Baru', tanggungJawab: 'Tanggung jawab tugas tim...' }],
                    });
                  }}
                  className="no-print lkpd-btn-add"
                >
                  <Plus size={12} /> Tambah Peran
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#ffffff' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left', width: '30%' }}>Peran Tim</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left' }}>Tanggung Jawab Spesifik</th>
                    <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 40, padding: 4 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDoc.proyekData.peranAnggota.map((pa, pi) => (
                    <tr key={pi}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                        <input
                          type="text"
                          value={pa.peran}
                          onChange={(e) => {
                            const updated = [...(currentDoc.proyekData?.peranAnggota || [])];
                            updated[pi] = { ...updated[pi], peran: e.target.value };
                            updateProyek({ peranAnggota: updated });
                          }}
                          className="lkpd-inline-input"
                          style={{ fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                        <input
                          type="text"
                          value={pa.tanggungJawab}
                          onChange={(e) => {
                            const updated = [...(currentDoc.proyekData?.peranAnggota || [])];
                            updated[pi] = { ...updated[pi], tanggungJawab: e.target.value };
                            updateProyek({ peranAnggota: updated });
                          }}
                          className="lkpd-inline-input"
                        />
                      </td>
                      <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            const updated = (currentDoc.proyekData?.peranAnggota || []).filter((_, idx) => idx !== pi);
                            updateProyek({ peranAnggota: updated });
                          }}
                          className="lkpd-btn-icon-danger"
                          style={{ width: 22, height: 22 }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rubrik Karya */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Rubrik Penilaian Karya Proyek:</span>
                <button
                  onClick={() => {
                    const rubriks = currentDoc.proyekData?.rubrikKarya || [];
                    updateProyek({
                      rubrikKarya: [...rubriks, { kriteria: 'Kriteria Baru', deskripsiSkor: 'Deskripsi pencapaian kriteria...' }],
                    });
                  }}
                  className="no-print lkpd-btn-add"
                >
                  <Plus size={12} /> Tambah Rubrik
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#ffffff' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left', width: '30%' }}>Kriteria Penilaian</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left' }}>Deskripsi Skor / Standar Kualitas</th>
                    <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 40, padding: 4 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDoc.proyekData.rubrikKarya.map((rk, ri) => (
                    <tr key={ri}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                        <input
                          type="text"
                          value={rk.kriteria}
                          onChange={(e) => {
                            const updated = [...(currentDoc.proyekData?.rubrikKarya || [])];
                            updated[ri] = { ...updated[ri], kriteria: e.target.value };
                            updateProyek({ rubrikKarya: updated });
                          }}
                          className="lkpd-inline-input"
                          style={{ fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>
                        <input
                          type="text"
                          value={rk.deskripsiSkor}
                          onChange={(e) => {
                            const updated = [...(currentDoc.proyekData?.rubrikKarya || [])];
                            updated[ri] = { ...updated[ri], deskripsiSkor: e.target.value };
                            updateProyek({ rubrikKarya: updated });
                          }}
                          className="lkpd-inline-input"
                        />
                      </td>
                      <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            const updated = (currentDoc.proyekData?.rubrikKarya || []).filter((_, idx) => idx !== ri);
                            updateProyek({ rubrikKarya: updated });
                          }}
                          className="lkpd-btn-icon-danger"
                          style={{ width: 22, height: 22 }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* II. LANGKAH KERJA EKSPLORASI */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', margin: 0 }}>
              II. Langkah Kerja Eksplorasi Kelompok
            </h3>
            <button onClick={addStep} className="no-print lkpd-btn-add">
              <Plus size={13} /> Tambah Langkah Kerja
            </button>
          </div>

          {currentDoc.langkahAktivitas.map((act, idx) => (
            <div key={act.langkahKe || idx} style={{ marginBottom: 14, background: '#fafafa', border: '1px solid #f1f5f9', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Langkah {act.langkahKe}:
                </span>
                {currentDoc.langkahAktivitas.length > 1 && (
                  <button
                    onClick={() => deleteStep(idx)}
                    className="no-print lkpd-btn-icon-danger"
                    style={{ width: 22, height: 22 }}
                    title="Hapus langkah kerja"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>

              <textarea
                rows={2}
                value={act.instruksi}
                onChange={(e) => updateStepInstruksi(idx, e.target.value)}
                className="lkpd-inline-textarea"
                style={{ fontSize: 12.5, color: '#334155', marginBottom: 6 }}
                placeholder="Instruksi kegiatan..."
              />

              {act.bantuanAtauTabel ? (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#475569' }}>
                  {act.bantuanAtauTabel.map((b, bi) => (
                    <div key={bi} style={{ marginBottom: 2 }}>{b}</div>
                  ))}
                </div>
              ) : (
                <div style={{ border: '1px dashed #cbd5e1', borderRadius: 6, padding: '12px 14px', minHeight: 60, color: '#94a3b8', fontSize: 12 }}>
                  Catatan penyelidikan / perhitungan kelompok:
                </div>
              )}
            </div>
          ))}
        </div>

        {/* III. PERTANYAAN DISKUSI ANALISIS */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', margin: 0 }}>
              III. Pertanyaan Diskusi Kritis & Analisis
            </h3>
            <button onClick={addQuestion} className="no-print lkpd-btn-add">
              <Plus size={13} /> Tambah Pertanyaan
            </button>
          </div>

          {currentDoc.pertanyaanAnalisis.map((pa, idx) => (
            <div
              key={pa.id || idx}
              style={{
                marginBottom: 16,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{pa.nomor}.</span>
                  <select
                    value={pa.tingkatKognitif || 'Menengah'}
                    onChange={(e) => updateQuestion(idx, { tingkatKognitif: e.target.value as any })}
                    className="no-print"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      padding: '2px 6px',
                      background: '#f8fafc',
                      color: '#475569',
                    }}
                  >
                    <option value="Dasar">🟢 Kognitif Dasar</option>
                    <option value="Menengah">🔵 Kognitif Menengah</option>
                    <option value="Mahir">🟣 Kognitif Mahir</option>
                  </select>
                </div>
                {currentDoc.pertanyaanAnalisis.length > 1 && (
                  <button
                    onClick={() => deleteQuestion(idx)}
                    className="no-print lkpd-btn-icon-danger"
                    title="Hapus butir pertanyaan"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <textarea
                rows={2}
                value={pa.pertanyaan}
                onChange={(e) => updateQuestion(idx, { pertanyaan: e.target.value })}
                className="lkpd-inline-textarea"
                style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}
                placeholder="Tulis kalimat pertanyaan..."
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>Petunjuk:</span>
                <input
                  type="text"
                  value={pa.petunjukPengerjaan || ''}
                  onChange={(e) => updateQuestion(idx, { petunjukPengerjaan: e.target.value })}
                  className="lkpd-inline-input"
                  style={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}
                  placeholder="Petunjuk singkat pengerjaan..."
                />
              </div>

              {/* TEACHER MODE: ANSWER KEY & SCORING GUIDE */}
              {showTeacherGuide ? (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 6,
                    padding: '8px 12px',
                    marginTop: 6,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#065f46', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>💡 Kunci Jawaban / Panduan Guru:</span>
                  </div>
                  <textarea
                    rows={2}
                    value={pa.panduanJawabanSingkat || ''}
                    onChange={(e) => updateQuestion(idx, { panduanJawabanSingkat: e.target.value })}
                    className="lkpd-inline-textarea"
                    style={{ fontSize: 12, color: '#064e3b', fontWeight: 600, background: 'transparent' }}
                    placeholder="Panduan kunci jawaban guru..."
                  />
                </div>
              ) : (
                <div style={{ border: '1px dashed #cbd5e1', borderRadius: 6, padding: '12px 14px', minHeight: 50, color: '#94a3b8', fontSize: 12 }}>
                  Lembar jawaban kelompok:
                </div>
              )}
            </div>
          ))}
        </div>

        {/* IV. KESIMPULAN & REFLEKSI MANDIRI */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #ccfbf1', paddingBottom: 4, marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', margin: 0 }}>
              IV. Kesimpulan & Refleksi Mandiri
            </h3>
            <button onClick={addReflection} className="no-print lkpd-btn-add">
              <Plus size={13} /> Tambah Refleksi
            </button>
          </div>

          {currentDoc.kesimpulanRefleksi.map((kr, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <textarea
                rows={2}
                value={kr}
                onChange={(e) => updateReflection(i, e.target.value)}
                className="lkpd-inline-textarea"
                style={{ fontSize: 12.5, color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', flex: 1 }}
              />
              {currentDoc.kesimpulanRefleksi.length > 1 && (
                <button
                  onClick={() => deleteReflection(i)}
                  className="no-print lkpd-btn-icon-danger"
                  style={{ width: 22, height: 22 }}
                  title="Hapus butir refleksi"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer Dokumen */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
          <div>{currentDoc.namaSekolah || activeProfile.namaSekolah} • Kurikulum Merdeka</div>
          <div>Lembar Kerja Peserta Didik (LKPD) • {ARCHETYPES.find((a) => a.id === currentPreset)?.badge}</div>
        </div>
      </div>
    </div>
  );
};
