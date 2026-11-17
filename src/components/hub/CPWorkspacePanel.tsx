import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileCheck2,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  CP_REGULATION_PRESETS,
  OFFICIAL_CP_REFERENCES,
  getAvailableCPReferenceEntries,
  resolveDefaultCPRegulationPreset,
  type CPRegulationPresetId,
} from '../../data/kurikulumMerdekaCP';
import {
  approveCPAnalysis,
  analyzeCPWithAI,
  buildTPDraftFromApprovedAnalysis,
  createBlankManualCPAnalysis,
  updateCPAnalysisDraft,
} from '../../utils/cpAnalysisService';
import {
  deleteCPEntry,
  getSavedCPEntries,
  resolveCPStatusLabel,
  saveCPAnalysisToEntry,
  saveCPEntry,
  type CPAnalysisResult,
  type CPAnalysisTPCandidate,
  type SavedCPEntry,
} from '../../utils/cpStorage';
import type {
  CPAsalSumber,
  CPReferenceMeta,
  CPStatusVerifikasi,
  CustomTPItem,
  SchoolProfile,
} from '../../utils/schoolProfileStorage';

interface CPWorkspacePanelProps {
  schoolProfile: SchoolProfile;
  currentFase: string;
  capaianPembelajaranRingkas: string;
  referensiCatatan?: string;
  defaultReferensiCP?: CPReferenceMeta;
  existingTPCount: number;
  onCreateTPFromAnalysis: (newTP: CustomTPItem) => void;
  onCPListChanged?: (entries: SavedCPEntry[]) => void;
  onToast?: (msg: string) => void;
}

function StatusBadge({
  status,
  terverifikasiResmi,
  asalCP,
}: {
  status?: CPStatusVerifikasi;
  terverifikasiResmi?: boolean;
  asalCP?: CPAsalSumber;
}) {
  const label = resolveCPStatusLabel(status, terverifikasiResmi, asalCP);
  const isVerified = status === 'resmi_terverifikasi' || (terverifikasiResmi === true && asalCP !== 'input_guru');
  const isTeacher = asalCP === 'input_guru' || status === 'input_guru';

  const palette = isVerified
    ? { bg: '#f0fdf4', border: '#86efac', text: '#166534' }
    : isTeacher
    ? { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' }
    : { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.text,
      }}
    >
      {isVerified ? <CheckCircle2 size={12} aria-hidden="true" /> : <ShieldAlert size={12} aria-hidden="true" />}
      {label}
    </span>
  );
}

export const CPWorkspacePanel: React.FC<CPWorkspacePanelProps> = ({
  schoolProfile,
  currentFase,
  capaianPembelajaranRingkas,
  referensiCatatan,
  defaultReferensiCP,
  existingTPCount,
  onCreateTPFromAnalysis,
  onCPListChanged,
  onToast,
}) => {
  const defaultPreset = resolveDefaultCPRegulationPreset(schoolProfile.mataPelajaranUtama);
  const availableSystemRefs = getAvailableCPReferenceEntries(
    schoolProfile.mataPelajaranUtama,
    currentFase as any
  );

  const [savedEntries, setSavedEntries] = useState<SavedCPEntry[]>(() =>
    getSavedCPEntries(schoolProfile, currentFase)
  );
  const [showCPForm, setShowCPForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [asalCP, setAsalCP] = useState<CPAsalSumber>('input_guru');
  const [regulationPresetId, setRegulationPresetId] = useState<CPRegulationPresetId>(defaultPreset.id);
  const [elemenCP, setElemenCP] = useState('');
  const [teksCP, setTeksCP] = useState('');
  const [namaDokumenSumber, setNamaDokumenSumber] = useState(defaultPreset.namaDokumenSumber);
  const [nomorDokumen, setNomorDokumen] = useState(defaultPreset.nomorDokumen);
  const [tahunVersiDokumen, setTahunVersiDokumen] = useState(defaultPreset.tahunVersiDokumen);
  const [urlReferensi, setUrlReferensi] = useState<string>(defaultPreset.urlReferensi);
  const [catatanPenyesuaianGuru, setCatatanPenyesuaianGuru] = useState('');
  const [verifiedOfficialCopy, setVerifiedOfficialCopy] = useState(false);

  const [activeAnalysisEntry, setActiveAnalysisEntry] = useState<SavedCPEntry | null>(null);
  const [analysisDraft, setAnalysisDraft] = useState<CPAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState<string | null>(null);

  useEffect(() => {
    const entries = getSavedCPEntries(schoolProfile, currentFase);
    setSavedEntries(entries);
    if (onCPListChanged) onCPListChanged(entries);
    const nextDefault = resolveDefaultCPRegulationPreset(schoolProfile.mataPelajaranUtama);
    setRegulationPresetId(nextDefault.id);
    setNamaDokumenSumber(nextDefault.namaDokumenSumber);
    setNomorDokumen(nextDefault.nomorDokumen);
    setTahunVersiDokumen(nextDefault.tahunVersiDokumen);
    setUrlReferensi(nextDefault.urlReferensi);
    setActiveAnalysisEntry(null);
    setAnalysisDraft(null);
    setAnalysisNotice(null);
  }, [
    schoolProfile.schoolId,
    schoolProfile.mataPelajaranUtama,
    schoolProfile.jenjang,
    currentFase,
  ]);

  const refreshEntries = () => {
    const entries = getSavedCPEntries(schoolProfile, currentFase);
    setSavedEntries(entries);
    if (onCPListChanged) onCPListChanged(entries);
  };

  const resetCPFormToDefaults = () => {
    const preset = resolveDefaultCPRegulationPreset(schoolProfile.mataPelajaranUtama);
    setEditingEntryId(null);
    setAsalCP('input_guru');
    setRegulationPresetId(preset.id);
    setElemenCP('');
    setTeksCP('');
    setNamaDokumenSumber(preset.namaDokumenSumber);
    setNomorDokumen(preset.nomorDokumen);
    setTahunVersiDokumen(preset.tahunVersiDokumen);
    setUrlReferensi(preset.urlReferensi);
    setCatatanPenyesuaianGuru('');
    setVerifiedOfficialCopy(false);
  };

  const handlePresetChange = (presetId: CPRegulationPresetId) => {
    setRegulationPresetId(presetId);
    const found = CP_REGULATION_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setNamaDokumenSumber(found.namaDokumenSumber);
    setNomorDokumen(found.nomorDokumen);
    setTahunVersiDokumen(found.tahunVersiDokumen);
    setUrlReferensi(found.urlReferensi);
    if (presetId === 'input_guru_sekolah') {
      setAsalCP('input_guru');
      setVerifiedOfficialCopy(false);
    }
  };

  const handlePickSystemReference = (refId: string) => {
    const selected = availableSystemRefs.find((r) => r.id === refId);
    if (!selected) return;
    setShowCPForm(true);
    setEditingEntryId(null);
    setAsalCP('referensi_sistem');
    setElemenCP(selected.elemenCP);
    setTeksCP('');
    setNamaDokumenSumber(selected.referensiMeta.namaDokumenSumber || defaultPreset.namaDokumenSumber);
    setNomorDokumen(selected.referensiMeta.nomorDokumen || defaultPreset.nomorDokumen);
    setTahunVersiDokumen(selected.referensiMeta.tahunVersiDokumen || defaultPreset.tahunVersiDokumen);
    setUrlReferensi(selected.referensiMeta.urlReferensi || defaultPreset.urlReferensi);
    setCatatanPenyesuaianGuru(
      `Rujukan fokus aplikasi: ${selected.ringkasanFokusAplikasi}. Tempel naskah CP asli pemerintah pada kotak Teks CP sebelum verifikasi.`
    );
    setVerifiedOfficialCopy(false);
  };

  const handleStartEditCP = (entry: SavedCPEntry) => {
    setShowCPForm(true);
    setEditingEntryId(entry.id);
    setAsalCP(entry.asalCP);
    setElemenCP(entry.elemenCP);
    setTeksCP(entry.teksCP);
    setNamaDokumenSumber(entry.namaDokumenSumber);
    setNomorDokumen(entry.nomorDokumen);
    setTahunVersiDokumen(entry.tahunVersiDokumen);
    setUrlReferensi(entry.urlReferensi || '');
    setCatatanPenyesuaianGuru(entry.catatanPenyesuaianGuru || '');
    setVerifiedOfficialCopy(entry.statusVerifikasi === 'resmi_terverifikasi' && entry.asalCP !== 'input_guru');
  };

  const handleSaveCP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!elemenCP.trim() || !teksCP.trim()) {
      setAnalysisNotice('Elemen CP dan Teks CP asli wajib diisi sebelum menyimpan.');
      return;
    }

    const canVerifyOfficial =
      asalCP === 'referensi_sistem' &&
      verifiedOfficialCopy &&
      nomorDokumen.trim().length > 0 &&
      teksCP.trim().length > 0;

    const saved = saveCPEntry(schoolProfile, {
      id: editingEntryId || undefined,
      mataPelajaran: schoolProfile.mataPelajaranUtama,
      jenjang: schoolProfile.jenjang,
      fase: currentFase,
      elemenCP: elemenCP.trim(),
      teksCP: teksCP.trim(),
      asalCP,
      regulationPresetId,
      namaDokumenSumber: namaDokumenSumber.trim(),
      nomorDokumen: nomorDokumen.trim(),
      tahunVersiDokumen: tahunVersiDokumen.trim(),
      urlReferensi: urlReferensi.trim(),
      statusVerifikasi:
        asalCP === 'input_guru'
          ? 'input_guru'
          : canVerifyOfficial
          ? 'resmi_terverifikasi'
          : 'referensi_belum_verifikasi',
      terverifikasiResmi: canVerifyOfficial,
      catatanPenyesuaianGuru: catatanPenyesuaianGuru.trim(),
    });

    refreshEntries();
    setShowCPForm(false);
    resetCPFormToDefaults();
    setActiveAnalysisEntry(saved);
    setAnalysisDraft(saved.analisisTersimpan || null);
    if (onToast) {
      onToast(`CP elemen "${saved.elemenCP}" tersimpan (${resolveCPStatusLabel(saved.statusVerifikasi, saved.terverifikasiResmi, saved.asalCP)}).`);
    }
  };

  const handleDeleteCP = (entry: SavedCPEntry) => {
    deleteCPEntry(schoolProfile, entry.id, currentFase);
    if (activeAnalysisEntry?.id === entry.id) {
      setActiveAnalysisEntry(null);
      setAnalysisDraft(null);
    }
    refreshEntries();
    if (onToast) onToast(`CP elemen "${entry.elemenCP}" dihapus dari daftar.`);
  };

  const handleOpenAnalysisForEntry = (entry: SavedCPEntry) => {
    setActiveAnalysisEntry(entry);
    setAnalysisNotice(null);
    setAnalysisDraft(entry.analisisTersimpan || null);
  };

  const handleRunAIAnalysis = async () => {
    if (!activeAnalysisEntry) return;
    setIsAnalyzing(true);
    setAnalysisNotice(null);
    try {
      const outcome = await analyzeCPWithAI({
        cpEntry: activeAnalysisEntry,
        kelas: schoolProfile.kelasUtama,
        semester: schoolProfile.semester,
      });
      setAnalysisDraft(outcome.analysis);
      if (!outcome.ok) {
        setAnalysisNotice(
          outcome.aiUnavailableReason ||
            'AI tidak tersedia saat ini. Form Analisis Manual dibuka agar Anda dapat mengisi Kompetensi dan Lingkup Materi secara langsung.'
        );
      } else {
        setAnalysisNotice(
          'Usulan Analisis AI selesai disusun. Silakan periksa, sunting Kompetensi & Lingkup Materi bila perlu, lalu klik Setujui.'
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartManualAnalysis = () => {
    if (!activeAnalysisEntry) return;
    setAnalysisNotice('Mode Analisis Manual aktif. Teks CP asli tetap terjaga di atas sebagai rujukan.');
    setAnalysisDraft(createBlankManualCPAnalysis(activeAnalysisEntry, schoolProfile.kelasUtama));
  };

  const handleUpdateCandidate = (idx: number, patch: Partial<CPAnalysisTPCandidate>) => {
    if (!analysisDraft) return;
    const nextList = analysisDraft.saranPembagianTP.map((cand, cIdx) =>
      cIdx === idx ? { ...cand, ...patch } : cand
    );
    setAnalysisDraft(
      updateCPAnalysisDraft(analysisDraft, {
        saranPembagianTP: nextList,
        statusPersetujuan: 'usulan_belum_disetujui',
      })
    );
  };

  const handleAddCandidate = () => {
    if (!analysisDraft || analysisDraft.saranPembagianTP.length >= 4 || !activeAnalysisEntry) return;
    const nextNum = analysisDraft.saranPembagianTP.length + 1;
    const cleanKelas = (schoolProfile.kelasUtama || '8').replace(/[^0-9]/g, '') || '8';
    const nextCand: CPAnalysisTPCandidate = {
      id: `tp_cand_${Date.now().toString(36)}_${nextNum}`,
      kodeSaran: `${cleanKelas}.${nextNum}`,
      elemenCP: activeAnalysisEntry.elemenCP,
      kompetensi: analysisDraft.kompetensi[0] || '',
      lingkupMateri: analysisDraft.lingkupMateri[0] || '',
      materiPokok: '',
      tujuanPembelajaran: '',
      buktiKetercapaian: analysisDraft.contohBuktiKetercapaian.slice(0, 2),
    };
    setAnalysisDraft(
      updateCPAnalysisDraft(analysisDraft, {
        saranPembagianTP: [...analysisDraft.saranPembagianTP, nextCand],
        statusPersetujuan: 'usulan_belum_disetujui',
      })
    );
  };

  const handleApproveAnalysis = () => {
    if (!analysisDraft || !activeAnalysisEntry) return;
    const approved = approveCPAnalysis(analysisDraft);
    setAnalysisDraft(approved);
    const updatedEntry = saveCPAnalysisToEntry(
      schoolProfile,
      activeAnalysisEntry.id,
      approved,
      currentFase
    );
    if (updatedEntry) {
      setActiveAnalysisEntry(updatedEntry);
      refreshEntries();
    }
    setAnalysisNotice(
      'Hasil Analisis CP disetujui guru dan tersimpan bersama teks CP asli. Klik "Buat TP dari Kandidat" untuk meneruskan ke form TP.'
    );
    if (onToast) onToast('Hasil Analisis CP disetujui guru.');
  };

  const handleApplyCandidateToTP = (candidateIdx: number) => {
    if (!analysisDraft || analysisDraft.statusPersetujuan !== 'disetujui_guru') return;
    const tpDraft = buildTPDraftFromApprovedAnalysis({
      analysis: analysisDraft,
      candidateIndex: candidateIdx,
      profile: schoolProfile,
      existingTPCount,
      cpEntry: activeAnalysisEntry || undefined,
    });
    onCreateTPFromAnalysis(tpDraft);
  };

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 16,
        fontSize: 13,
        color: '#334155',
      }}
    >
      {/* Ringkasan & Tautan Regulasi Resmi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <strong style={{ color: '#0f172a', fontSize: 14 }}>
              Capaian Pembelajaran (CP) — {schoolProfile.mataPelajaranUtama} ({currentFase})
            </strong>
            <StatusBadge
              status={defaultReferensiCP?.statusVerifikasi}
              terverifikasiResmi={defaultReferensiCP?.terverifikasiResmi}
              asalCP={defaultReferensiCP?.asalCP}
            />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 12.5, lineHeight: 1.5, color: '#475569' }}>
            {capaianPembelajaranRingkas}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11.5, color: '#475569' }}>
            <span>
              <strong>Regulasi Default:</strong> {defaultPreset.nomorDokumen} ({defaultPreset.tahunVersiDokumen})
            </span>
            <a
              href={OFFICIAL_CP_REFERENCES.SK_BSKAP_046_2025_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 3 }}
            >
              SK 046/H/KR/2025 <ExternalLink size={11} aria-hidden="true" />
            </a>
            <a
              href={OFFICIAL_CP_REFERENCES.PANDUAN_MAPEL_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 3 }}
            >
              Panduan Mapel <ExternalLink size={11} aria-hidden="true" />
            </a>
            <a
              href={OFFICIAL_CP_REFERENCES.PPA_REVISI_2025_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 3 }}
            >
              PPA Edisi Revisi 2025 <ExternalLink size={11} aria-hidden="true" />
            </a>
          </div>
          {referensiCatatan && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: '#64748b' }}>
              Catatan: {referensiCatatan}
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => {
            if (!showCPForm) resetCPFormToDefaults();
            setShowCPForm(!showCPForm);
          }}
        >
          <Plus size={14} aria-hidden="true" /> {showCPForm ? 'Tutup Form CP' : 'Tempel / Tambah CP'}
        </button>
      </div>

      {/* Pilihan Referensi Katalog Sistem yang Tersedia */}
      {availableSystemRefs.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
            Referensi Katalog Sistem Tersedia (Belum Verifikasi Naskah SK Penuh — klik untuk menautkan & melengkapi teks CP):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableSystemRefs.map((ref) => (
              <button
                key={ref.id}
                type="button"
                className="btn btn-sm btn-outline"
                style={{ fontSize: 11.5, padding: '4px 9px' }}
                onClick={() => handlePickSystemReference(ref.id)}
                title={ref.ringkasanFokusAplikasi}
              >
                <BookOpen size={12} aria-hidden="true" /> {ref.elemenCP}: {ref.ringkasanFokusAplikasi}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form Input / Edit CP & Metadata Sumber */}
      {showCPForm && (
        <form
          onSubmit={handleSaveCP}
          style={{
            background: '#ffffff',
            border: '1.5px solid #2563eb',
            borderRadius: 10,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1d4ed8', marginBottom: 10 }}>
            {editingEntryId ? 'Edit CP & Metadata Sumber' : 'Simpan CP Baru Berdasarkan Mapel, Fase & Elemen'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="form-label" style={{ fontSize: 12 }}>Asal CP</label>
              <select
                className="form-input"
                value={asalCP}
                onChange={(e) => {
                  const val = e.target.value as CPAsalSumber;
                  setAsalCP(val);
                  if (val === 'input_guru') setVerifiedOfficialCopy(false);
                }}
              >
                <option value="input_guru">Input / Penyesuaian Guru & Sekolah</option>
                <option value="referensi_sistem">Rujukan Dokumen Kurikulum Pemerintah / Sistem</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: 12 }}>Versi Regulasi / Dokumen Rujukan</label>
              <select
                className="form-input"
                value={regulationPresetId}
                onChange={(e) => handlePresetChange(e.target.value as CPRegulationPresetId)}
              >
                {CP_REGULATION_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: 12 }}>Elemen CP *</label>
              <input
                type="text"
                className="form-input"
                value={elemenCP}
                onChange={(e) => setElemenCP(e.target.value)}
                placeholder="Mis. Aljabar / Membaca & Memirsa / Akidah"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 12 }}>
              Teks CP Asli * (dipertahankan utuh sebagai sumber rujukan; analisis tidak akan menimpa teks ini)
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={teksCP}
              onChange={(e) => setTeksCP(e.target.value)}
              placeholder="Tempel teks CP asli sesuai SK 046/H/KR/2025, BKPDM 020/2026, atau tuliskan CP operasional guru..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="form-label" style={{ fontSize: 12 }}>Nama Dokumen Sumber</label>
              <input
                type="text"
                className="form-input"
                value={namaDokumenSumber}
                onChange={(e) => setNamaDokumenSumber(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 12 }}>Nomor Dokumen</label>
              <input
                type="text"
                className="form-input"
                value={nomorDokumen}
                onChange={(e) => setNomorDokumen(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 12 }}>Tahun / Versi</label>
              <input
                type="text"
                className="form-input"
                value={tahunVersiDokumen}
                onChange={(e) => setTahunVersiDokumen(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 12 }}>URL Referensi (Opsional)</label>
              <input
                type="url"
                className="form-input"
                value={urlReferensi}
                onChange={(e) => setUrlReferensi(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Catatan Sumber / Penyesuaian Guru (Opsional)</label>
            <input
              type="text"
              className="form-input"
              value={catatanPenyesuaianGuru}
              onChange={(e) => setCatatanPenyesuaianGuru(e.target.value)}
              placeholder="Contoh: Disesuaikan konteks lokal SMK / disalin dari lampiran halaman 14 SK 046/2025"
            />
          </div>

          {asalCP === 'referensi_sistem' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1e293b', marginBottom: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={verifiedOfficialCopy}
                onChange={(e) => setVerifiedOfficialCopy(e.target.checked)}
              />
              <span>
                Saya mengonfirmasi teks CP di atas disalin utuh dan telah dibandingkan dengan naskah resmi ({nomorDokumen || 'dokumen sumber'}).
              </span>
            </label>
          ) : (
            <div style={{ fontSize: 11.5, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: 6, marginBottom: 12 }}>
              CP input guru tetap dilabeli sebagai <strong>CP Input / Penyesuaian Guru</strong> dan tidak diklaim sebagai CP resmi pemerintah.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                setShowCPForm(false);
                resetCPFormToDefaults();
              }}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-sm btn-primary">
              Simpan CP Elemen
            </button>
          </div>
        </form>
      )}

      {/* Daftar CP Tersimpan untuk Mapel & Fase Aktif */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
          Daftar CP Tersimpan ({savedEntries.length} elemen pada {schoolProfile.mataPelajaranUtama} · {currentFase})
        </div>
        {savedEntries.length === 0 ? (
          <div style={{ fontSize: 12, color: '#64748b', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '10px 12px' }}>
            Belum ada teks CP asli yang disimpan guru untuk fase ini. Klik <strong>Tempel / Tambah CP</strong> di atas untuk memasukkan teks CP sesuai SK BSKAP 046/H/KR/2025 atau Keputusan BKPDM 020/2026 lalu analisis menjadi Kompetensi &amp; Lingkup Materi.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: '#ffffff',
                  border: activeAnalysisEntry?.id === entry.id ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#0f172a', fontSize: 13 }}>{entry.elemenCP}</strong>
                      <StatusBadge
                        status={entry.statusVerifikasi}
                        terverifikasiResmi={entry.terverifikasiResmi}
                        asalCP={entry.asalCP}
                      />
                      {entry.analisisTersimpan?.statusPersetujuan === 'disetujui_guru' && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#166534', background: '#f0fdf4', border: '1px solid #86efac', padding: '1px 7px', borderRadius: 999 }}>
                          Analisis Disetujui
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      {entry.nomorDokumen} ({entry.tahunVersiDokumen}) · {entry.namaDokumenSumber}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: 11.5, padding: '4px 9px' }}
                      onClick={() => handleOpenAnalysisForEntry(entry)}
                    >
                      <FileCheck2 size={12} aria-hidden="true" /> Analisis CP → TP
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: 11.5, padding: '4px 9px' }}
                      onClick={() => handleStartEditCP(entry)}
                    >
                      <Edit3 size={12} aria-hidden="true" /> Edit CP
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: 11.5, padding: '4px 9px', color: '#b91c1c', borderColor: '#fecaca' }}
                      onClick={() => handleDeleteCP(entry)}
                    >
                      <Trash2 size={12} aria-hidden="true" /> Hapus
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5, background: '#f8fafc', padding: '7px 10px', borderRadius: 6 }}>
                  {entry.teksCP}
                </div>
                {entry.catatanPenyesuaianGuru && (
                  <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
                    Catatan: {entry.catatanPenyesuaianGuru}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workspace Analisis CP (Kompetensi + Lingkup Materi + TP Candidates) */}
      {activeAnalysisEntry && (
        <div
          style={{
            marginTop: 14,
            background: '#ffffff',
            border: '1.5px solid #0284c7',
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14.5, color: '#0f172a' }}>
                Analisis CP: Elemen {activeAnalysisEntry.elemenCP}
              </h3>
              <div style={{ fontSize: 11.5, color: '#475569' }}>
                Identifikasi <strong>Kompetensi</strong> dan <strong>Lingkup Materi</strong> tanpa mengubah teks CP asli.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={isAnalyzing}
                onClick={handleRunAIAnalysis}
              >
                <Sparkles size={13} aria-hidden="true" />
                {isAnalyzing ? 'Menganalisis...' : 'Analisis CP (Usulan AI)'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={isAnalyzing}
                onClick={handleStartManualAnalysis}
              >
                Isi Analisis Manual
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setActiveAnalysisEntry(null);
                  setAnalysisDraft(null);
                }}
              >
                Tutup
              </button>
            </div>
          </div>

          {/* Teks CP Asli (Immutable Reference) */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 3 }}>
              Teks CP Asli (Sumber Rujukan — Tetap Utuh)
            </div>
            <div style={{ fontSize: 12.5, color: '#0f172a', lineHeight: 1.55 }}>
              {activeAnalysisEntry.teksCP}
            </div>
          </div>

          {analysisNotice && (
            <div
              role="status"
              style={{
                background: '#eff6ff',
                border: '1px solid #93c5fd',
                color: '#1e3a8a',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              {analysisNotice}
            </div>
          )}

          {analysisDraft && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: analysisDraft.sumberAnalisis === 'ai_usulan' ? '#f5f3ff' : '#f1f5f9',
                    color: analysisDraft.sumberAnalisis === 'ai_usulan' ? '#5b21b6' : '#334155',
                    border: analysisDraft.sumberAnalisis === 'ai_usulan' ? '1px solid #ddd6fe' : '1px solid #cbd5e1',
                  }}
                >
                  {analysisDraft.sumberAnalisis === 'ai_usulan'
                    ? 'Usulan Analisis AI (Wajib Diperiksa & Disetujui Guru)'
                    : 'Analisis Manual Guru'}
                </span>

                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: analysisDraft.statusPersetujuan === 'disetujui_guru' ? '#f0fdf4' : '#fffbeb',
                    color: analysisDraft.statusPersetujuan === 'disetujui_guru' ? '#166534' : '#92400e',
                    border: analysisDraft.statusPersetujuan === 'disetujui_guru' ? '1px solid #86efac' : '1px solid #fcd34d',
                  }}
                >
                  {analysisDraft.statusPersetujuan === 'disetujui_guru'
                    ? 'Disetujui Guru — Siap Diteruskan ke TP'
                    : 'Belum Disetujui Guru'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Kompetensi (satu poin per baris)
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={analysisDraft.kompetensi.join('\n')}
                    onChange={(e) =>
                      setAnalysisDraft(
                        updateCPAnalysisDraft(analysisDraft, {
                          kompetensi: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                          statusPersetujuan: 'usulan_belum_disetujui',
                        })
                      )
                    }
                    placeholder="Contoh: memodelkan dan menyelesaikan masalah kontekstual..."
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Lingkup Materi / Konten Esensial (satu poin per baris)
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={analysisDraft.lingkupMateri.join('\n')}
                    onChange={(e) =>
                      setAnalysisDraft(
                        updateCPAnalysisDraft(analysisDraft, {
                          lingkupMateri: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                          statusPersetujuan: 'usulan_belum_disetujui',
                        })
                      )
                    }
                    placeholder="Contoh: Sistem Persamaan Linear Dua Variabel"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Kata Kerja Operasional (KKO) Relevan (pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={analysisDraft.kkoRelevan.join(', ')}
                    onChange={(e) =>
                      setAnalysisDraft(
                        updateCPAnalysisDraft(analysisDraft, {
                          kkoRelevan: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          statusPersetujuan: 'usulan_belum_disetujui',
                        })
                      )
                    }
                    placeholder="mengidentifikasi, memodelkan, menyelesaikan, membuktikan"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Contoh Bukti Ketercapaian (pisahkan dengan titik koma ;)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={analysisDraft.contohBuktiKetercapaian.join('; ')}
                    onChange={(e) =>
                      setAnalysisDraft(
                        updateCPAnalysisDraft(analysisDraft, {
                          contohBuktiKetercapaian: e.target.value.split(';').map((s) => s.trim()).filter(Boolean),
                          statusPersetujuan: 'usulan_belum_disetujui',
                        })
                      )
                    }
                    placeholder="Menuliskan model matematika lengkap dengan variabel dan satuan"
                  />
                </div>
              </div>

              {/* Saran Pembagian TP (Maks 4 untuk mencegah over-splitting) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 12.5, color: '#0f172a' }}>
                    Rancangan Tujuan Pembelajaran (TP) dari Elemen {analysisDraft.elemenCPAsal} (Maks. 4 TP Proporsional)
                  </strong>
                  {analysisDraft.saranPembagianTP.length < 4 && (
                    <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: 11.5 }} onClick={handleAddCandidate}>
                      <Plus size={12} aria-hidden="true" /> Tambah Kandidat TP
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {analysisDraft.saranPembagianTP.map((cand, cIdx) => (
                    <div
                      key={cand.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: 10,
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label className="form-label" style={{ fontSize: 11 }}>Kode Saran</label>
                          <input
                            type="text"
                            className="form-input"
                            value={cand.kodeSaran}
                            onChange={(e) => handleUpdateCandidate(cIdx, { kodeSaran: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 11 }}>Kompetensi</label>
                          <input
                            type="text"
                            className="form-input"
                            value={cand.kompetensi}
                            onChange={(e) => handleUpdateCandidate(cIdx, { kompetensi: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 11 }}>Lingkup Materi</label>
                          <input
                            type="text"
                            className="form-input"
                            value={cand.lingkupMateri}
                            onChange={(e) => handleUpdateCandidate(cIdx, { lingkupMateri: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label className="form-label" style={{ fontSize: 11 }}>Materi Pokok / Topik</label>
                          <input
                            type="text"
                            className="form-input"
                            value={cand.materiPokok}
                            onChange={(e) => handleUpdateCandidate(cIdx, { materiPokok: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 11 }}>Rumusan Tujuan Pembelajaran (TP)</label>
                          <input
                            type="text"
                            className="form-input"
                            value={cand.tujuanPembelajaran}
                            onChange={(e) => handleUpdateCandidate(cIdx, { tujuanPembelajaran: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          Elemen Asal: {cand.elemenCP}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={analysisDraft.statusPersetujuan !== 'disetujui_guru'}
                          title={
                            analysisDraft.statusPersetujuan === 'disetujui_guru'
                              ? 'Teruskan hasil analisis ke form TP tanpa input ulang'
                              : 'Setujui hasil analisis terlebih dahulu sebelum meneruskan ke TP'
                          }
                          onClick={() => handleApplyCandidateToTP(cIdx)}
                        >
                          <Plus size={12} aria-hidden="true" /> Buat TP dari Kandidat Ini
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleApproveAnalysis}
                >
                  <CheckCircle2 size={14} aria-hidden="true" /> Setujui Hasil Analisis Guru
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
