import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  Layers,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  PROGRESSION_STAGE_LABELS,
  TOPIC_SOURCE_KIND_LABELS,
  TOPIC_VERIFICATION_LABELS,
  getTopicById,
  lookupCuratedTopicBank,
  type CurriculumTopicEntry,
} from '../../data/kurikulumTopicBank';
import {
  buildCustomTPFromTopicEntry,
  detectKategoriFromFase,
  getSemesterCurriculumPlan,
} from '../../utils/kurikulumCatalog';
import {
  getSavedCustomTPList,
  type CustomTPItem,
  type SchoolProfile,
} from '../../utils/schoolProfileStorage';
import { detectSuspectedLegacySem2Clones } from '../../utils/topicProgressionValidator';
import type { SavedCPEntry } from '../../utils/cpStorage';
import { analyzeCPWithAI } from '../../utils/cpAnalysisService';
import type { JenjangFase } from '../../types/assessment';

interface TopicBankBrowserPanelProps {
  schoolProfile: SchoolProfile;
  currentFase: string;
  tpList: CustomTPItem[];
  savedCPEntries: SavedCPEntry[];
  onOpenCPPanel: () => void;
  onAddNewTP: () => void;
  onAddTopicDraftAsTP: (tp: CustomTPItem) => void;
  onUpdateTPList?: (nextList: CustomTPItem[]) => void;
  onToast?: (msg: string) => void;
}

const VERIF_STYLE_MAP: Record<
  CurriculumTopicEntry['statusVerifikasiSumber'] | 'belum_tersedia' | 'input_guru_dibutuhkan',
  { bg: string; fg: string; border: string }
> = {
  terkurasi_dan_terverifikasi: { bg: '#f0fdf4', fg: '#166534', border: '#86efac' },
  berdasarkan_contoh_panduan: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
  kurasi_internal: { bg: '#fefce8', fg: '#854d0e', border: '#fde68a' },
  input_guru_dibutuhkan: { bg: '#fff7ed', fg: '#9a3412', border: '#fed7aa' },
  belum_tersedia: { bg: '#f8fafc', fg: '#475569', border: '#cbd5e1' },
};

const STAGE_STYLE_MAP: Record<CurriculumTopicEntry['progressionStage'], { bg: string; fg: string }> = {
  pengenalan: { bg: '#e0f2fe', fg: '#0369a1' },
  pengembangan: { bg: '#ede9fe', fg: '#6d28d9' },
  penerapan: { bg: '#dcfce7', fg: '#15803d' },
  integrasi: { bg: '#fef3c7', fg: '#b45309' },
  pendalaman: { bg: '#ffe4e6', fg: '#be123c' },
};

export const TopicBankBrowserPanel: React.FC<TopicBankBrowserPanelProps> = ({
  schoolProfile,
  currentFase,
  tpList,
  savedCPEntries,
  onOpenCPPanel,
  onAddNewTP,
  onAddTopicDraftAsTP,
  onUpdateTPList,
  onToast,
}) => {
  const initialSem: '1 (Ganjil)' | '2 (Genap)' = schoolProfile.semester.startsWith('2')
    ? '2 (Genap)'
    : '1 (Ganjil)';
  const [viewMode, setViewMode] = useState<'sem1' | 'sem2' | 'compare'>(
    initialSem === '2 (Genap)' ? 'sem2' : 'sem1'
  );
  const [expandedSpiralId, setExpandedSpiralId] = useState<string | null>(null);
  const [aiProposedTopics, setAiProposedTopics] = useState<CustomTPItem[]>([]);
  const [isGeneratingAIProposal, setIsGeneratingAIProposal] = useState(false);

  const sem1Bank = useMemo(
    () =>
      lookupCuratedTopicBank(
        schoolProfile.mataPelajaranUtama,
        currentFase,
        schoolProfile.kelasUtama,
        '1 (Ganjil)'
      ),
    [schoolProfile.mataPelajaranUtama, currentFase, schoolProfile.kelasUtama]
  );

  const sem2Bank = useMemo(
    () =>
      lookupCuratedTopicBank(
        schoolProfile.mataPelajaranUtama,
        currentFase,
        schoolProfile.kelasUtama,
        '2 (Genap)'
      ),
    [schoolProfile.mataPelajaranUtama, currentFase, schoolProfile.kelasUtama]
  );

  const activeBank = viewMode === 'sem2' ? sem2Bank : sem1Bank;
  const verifStyle = VERIF_STYLE_MAP[activeBank.coverageStatus] || VERIF_STYLE_MAP.belum_tersedia;

  // Audit duplikasi data tersimpan Semester 2 secara non-destruktif
  const legacyCloneAudit = useMemo(() => {
    if (!schoolProfile.semester.startsWith('2') || tpList.length === 0) {
      return null;
    }
    const sem1Saved = getSavedCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      '1 (Ganjil)',
      schoolProfile
    );
    const sem1Fallback =
      sem1Saved && sem1Saved.length > 0
        ? sem1Saved
        : getSemesterCurriculumPlan(
            schoolProfile.mataPelajaranUtama,
            currentFase as JenjangFase,
            schoolProfile.kelasUtama,
            '1 (Ganjil)',
            { schoolId: schoolProfile.schoolId, tahunAjaran: schoolProfile.tahunAjaran }
          ).tpList;

    const audit = detectSuspectedLegacySem2Clones(sem1Fallback, tpList);
    const unacknowledged = audit.annotatedSem2List.filter(
      (t) => t.legacyDuplicationReview?.status === 'perlu_ditinjau'
    );
    if (unacknowledged.length === 0) return null;
    return audit;
  }, [schoolProfile, currentFase, tpList]);

  const existingTopicKeys = useMemo(
    () => new Set(tpList.map((t) => (t.materiPokok || '').toLowerCase().trim())),
    [tpList]
  );

  const handleDeriveTopicToTP = (entry: CurriculumTopicEntry) => {
    const cleanKelas = schoolProfile.kelasUtama.replace(/[^0-9]/g, '') || '8';
    const nextNomor = schoolProfile.semester.startsWith('2')
      ? tpList.length + 5
      : tpList.length + 1;
    const tp = buildCustomTPFromTopicEntry(entry, {
      mataPelajaran: schoolProfile.mataPelajaranUtama,
      jenjangFase: currentFase as JenjangFase,
      jenjangCategory: detectKategoriFromFase(currentFase as JenjangFase, schoolProfile.mataPelajaranUtama),
      cleanKelas,
      semester: schoolProfile.semester.startsWith('2') ? '2 (Genap)' : '1 (Ganjil)',
      nomorTP: nextNomor,
      mingguMulai: Math.min(18, tpList.length * 4 + 2),
      mingguSelesai: Math.min(22, (tpList.length + 1) * 4 + 1),
      alokasiJP: 12,
      schoolId: schoolProfile.schoolId,
      tahunAjaran: schoolProfile.tahunAjaran,
      savedCPEntries,
    });
    onAddTopicDraftAsTP({ ...tp, statusReview: 'draft' });
  };

  const handleGenerateAIFromSavedCP = async () => {
    const cp = savedCPEntries[0];
    if (!cp || !cp.teksCP.trim()) {
      onOpenCPPanel();
      if (onToast) {
        onToast('Tempel atau pilih teks CP terlebih dahulu pada panel Kelola Sumber CP untuk membuat usulan AI.');
      }
      return;
    }
    setIsGeneratingAIProposal(true);
    try {
      const result = await analyzeCPWithAI({
        cpEntry: cp,
        kelas: schoolProfile.kelasUtama,
        semester: schoolProfile.semester,
      });
      if (!result.ok && result.aiUnavailableReason) {
        if (onToast) onToast(result.aiUnavailableReason);
      }
      const cleanKelas = schoolProfile.kelasUtama.replace(/[^0-9]/g, '') || '8';
      const baseNum = schoolProfile.semester.startsWith('2') ? tpList.length + 5 : tpList.length + 1;
      const drafts: CustomTPItem[] = result.analysis.saranPembagianTP.map((s, idx) => ({
        id: `ai_prop_${Date.now().toString(36)}_${idx}`,
        kode: `${cleanKelas}.${baseNum + idx}`,
        elemen: s.elemenCP || cp.elemenCP,
        materiPokok: s.materiPokok,
        lingkupMateri: s.lingkupMateri || s.materiPokok,
        kompetensiInti: s.kompetensi,
        tujuanPembelajaran: s.tujuanPembelajaran,
        arahanRangkuman: `Usulan AI (perlu ditinjau guru): jelaskan ${s.materiPokok} sesuai CP ${cp.elemenCP}.`,
        alokasiJP: 12,
        mingguMulai: Math.min(18, idx * 4 + 2),
        mingguSelesai: Math.min(22, (idx + 1) * 4 + 1),
        buktiKetercapaian: s.buktiKetercapaian,
        prasyarat: s.prasyaratSaran,
        statusReview: 'draft',
        topicJenisKonten: 'usulan_ai',
        topicStatusVerifikasi: 'input_guru_dibutuhkan',
        referensiCP: {
          sumber: `${cp.namaDokumenSumber} + Usulan AI (perlu ditinjau guru)`,
          elemenCP: s.elemenCP || cp.elemenCP,
          fase: currentFase,
          terverifikasiResmi: false,
          asalCP: cp.asalCP,
          catatan: 'Usulan AI — perlu ditinjau guru sebelum disetujui.',
        },
      }));
      setAiProposedTopics(drafts);
      if (onToast) {
        onToast('Usulan topik dari CP dibuat dengan label "Usulan AI — perlu ditinjau guru".');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membuat usulan AI.';
      if (onToast) onToast(message);
    } finally {
      setIsGeneratingAIProposal(false);
    }
  };

  const renderTopicCard = (entry: CurriculumTopicEntry) => {
    const stageStyle = STAGE_STYLE_MAP[entry.progressionStage] || STAGE_STYLE_MAP.pengenalan;
    const isSpiralExpanded = expandedSpiralId === entry.topicId;
    const alreadyInList = existingTopicKeys.has(entry.topik.toLowerCase().trim());
    const prereqTitles = (entry.prasyaratTopicIds || [])
      .map((pid) => getTopicById(pid)?.judulTopik || pid)
      .filter(Boolean);

    return (
      <div
        key={entry.topicId}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 9,
          padding: '11px 13px',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 99,
                background: stageStyle.bg,
                color: stageStyle.fg,
              }}
            >
              {PROGRESSION_STAGE_LABELS[entry.progressionStage]}
            </span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
              <Layers size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} aria-hidden="true" />
              {entry.elemenCP}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 6,
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #e2e8f0',
              }}
            >
              {TOPIC_SOURCE_KIND_LABELS[entry.jenisKonten]}
            </span>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${alreadyInList ? 'btn-outline' : 'btn-primary'}`}
            style={{ fontSize: 11, padding: '4px 9px', minHeight: 28 }}
            onClick={() => handleDeriveTopicToTP(entry)}
          >
            <Plus size={12} aria-hidden="true" />
            {alreadyInList ? 'Tambah Lagi ke TP' : 'Turunkan ke Draf TP'}
          </button>
        </div>

        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere' }}>
          {entry.judulTopik}
        </div>
        <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
          <strong>Kompetensi dikembangkan:</strong> {entry.kompetensiYangDikembangkan}
        </div>
        <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
          <strong>Relevansi CP ({entry.faseCode}):</strong> {entry.relevansiCP}
        </div>

        {prereqTitles.length > 0 && (
          <div style={{ fontSize: 11, color: '#475569', background: '#f8fafc', padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <strong>Terhubung dengan topik sebelumnya:</strong> {prereqTitles.join(' · ')}
          </div>
        )}

        {entry.spiralRelation && (
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
            <button
              type="button"
              onClick={() => setExpandedSpiralId(isSpiralExpanded ? null : entry.topicId)}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <GitBranch size={12} aria-hidden="true" />
              {isSpiralExpanded ? 'Tutup Alasan Progresi Spiral' : 'Lihat Hubungan & Alasan Progresi Spiral'}
            </button>
            {isSpiralExpanded && (
              <div
                style={{
                  marginTop: 7,
                  padding: '8px 10px',
                  borderRadius: 7,
                  background: '#f8fafc',
                  border: '1px solid #bfdbfe',
                  fontSize: 11.5,
                  color: '#1e293b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <div><strong>Topik terdahulu:</strong> {entry.spiralRelation.previousTopicTitle || entry.spiralRelation.previousTopicId}</div>
                <div><strong>Konsep diaktifkan kembali:</strong> {entry.spiralRelation.reactivatedConcept}</div>
                <div><strong>Kompetensi baru yang dituju:</strong> {entry.spiralRelation.newCompetency}</div>
                <div><strong>Perbedaan kedalaman:</strong> {entry.spiralRelation.depthDifference}</div>
                <div><strong>Konteks/aplikasi baru:</strong> {entry.spiralRelation.newContextOrApplication}</div>
                <div><strong>Alasan pedagogis:</strong> {entry.spiralRelation.pedagogicalReason}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      aria-label="Bank Topik & Progresi Semester"
      className="v21-bento-card"
      style={{
        marginBottom: 16,
        padding: '14px 16px',
        borderRadius: 10,
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        minWidth: 0,
      }}
    >
      {/* Baris Identitas & Status Verifikasi Bank Topik */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <BookOpen size={15} color="#2563eb" aria-hidden="true" />
            <strong style={{ fontSize: 14, color: '#0f172a' }}>
              Bank Topik Terkurasi &amp; Progresi Semester
            </strong>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 99,
                background: verifStyle.bg,
                color: verifStyle.fg,
                border: `1px solid ${verifStyle.border}`,
              }}
            >
              {TOPIC_VERIFICATION_LABELS[activeBank.coverageStatus]}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4, overflowWrap: 'anywhere' }}>
            <strong>{activeBank.mataPelajaran}</strong> · {activeBank.jenjang} · {activeBank.faseCode} ·{' '}
            <span>Sumber: {activeBank.sumberDokumen}</span>
            {activeBank.urlReferensi && (
              <>
                {' '}
                <a
                  href={activeBank.urlReferensi}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                >
                  Rujukan <ExternalLink size={10} aria-hidden="true" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Toggle Semester 1 / Semester 2 / Perbandingan */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'sem1', label: 'Semester 1 (Ganjil)' },
              { id: 'sem2', label: 'Semester 2 (Genap)' },
              { id: 'compare', label: 'Bandingkan Sem 1 → Sem 2' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`btn btn-sm ${viewMode === tab.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 11.5, minHeight: 30, padding: '4px 10px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Peringatan Non-Destruktif Data Duplikat Lama Semester 2 (Section 15) */}
      {legacyCloneAudit && legacyCloneAudit.hasSuspectedClones && (
        <div
          role="status"
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#78350f',
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <AlertTriangle size={15} color="#d97706" aria-hidden="true" />
            Terdeteksi {legacyCloneAudit.suspectedTpIds.length} TP Semester 2 yang Serupa dengan Semester 1 (Perlu Ditinjau)
          </div>
          <div style={{ lineHeight: 1.45 }}>
            Data tersimpan Anda tetap aman dan tidak ditimpa otomatis. Anda dapat mempertahankan materi yang sudah disusun atau memperbarui dengan rekomendasi progresif Semester 2:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ background: '#ffffff', fontSize: 11.5 }}
              onClick={() => {
                if (!onUpdateTPList) return;
                const nextList = tpList.map((tp) =>
                  legacyCloneAudit.suspectedTpIds.includes(tp.id)
                    ? {
                        ...tp,
                        legacyDuplicationReview: {
                          isSuspectedLegacyClone: true,
                          status: 'disetujui_guru' as const,
                          reason: 'Dipertahankan berdasarkan konfirmasi guru.',
                        },
                      }
                    : tp
                );
                onUpdateTPList(nextList);
                if (onToast) onToast('Data Semester 2 Anda dipertahankan dan ditandai disetujui guru.');
              }}
            >
              <CheckCircle2 size={12} aria-hidden="true" /> Pertahankan Data Ini
            </button>
            {sem2Bank.isAvailable && sem2Bank.topics.length > 0 && onUpdateTPList && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ fontSize: 11.5 }}
                onClick={() => {
                  const freshSem2 = getSemesterCurriculumPlan(
                    schoolProfile.mataPelajaranUtama,
                    currentFase as JenjangFase,
                    schoolProfile.kelasUtama,
                    '2 (Genap)',
                    {
                      schoolId: schoolProfile.schoolId,
                      tahunAjaran: schoolProfile.tahunAjaran,
                      savedCPEntries,
                    }
                  ).tpList;
                  onUpdateTPList(freshSem2);
                  if (onToast) onToast('Rekomendasi progresif Semester 2 diterapkan tanpa menyalin Semester 1.');
                }}
              >
                <RefreshCw size={12} aria-hidden="true" /> Terapkan Rekomendasi Progresif Sem 2
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State Jujur bila Bank Topik Belum Tersedia */}
      {!activeBank.isAvailable ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #94a3b8',
            borderRadius: 9,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <ShieldAlert size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              <strong>Bank topik terkurasi untuk mata pelajaran dan fase ini belum tersedia.</strong>
              <div style={{ color: '#475569', marginTop: 2 }}>
                {activeBank.emptyStateMessage} Sistem tidak mengisi topik generik palsu. Silakan gunakan CP resmi atau susun topik secara mandiri.
              </div>
            </div>
          </div>

          <div className="topic-bank-empty-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
            <style>{`.topic-bank-empty-actions > .btn { max-width: 100%; white-space: normal; text-align: left; overflow-wrap: anywhere; }`}</style>
            <button type="button" className="btn btn-sm btn-primary" onClick={onOpenCPPanel}>
              <FileText size={13} aria-hidden="true" /> Tempel / Masukkan CP
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={onOpenCPPanel}>
              <Layers size={13} aria-hidden="true" /> Pilih Referensi CP Tersedia
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={onAddNewTP}>
              <Plus size={13} aria-hidden="true" /> Susun Topik Manual
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={isGeneratingAIProposal}
              onClick={handleGenerateAIFromSavedCP}
            >
              <Sparkles size={13} aria-hidden="true" />
              {isGeneratingAIProposal ? 'Menyusun Usulan AI...' : 'Buat Usulan Topik dari CP (AI)'}
            </button>
          </div>

          {aiProposedTopics.length > 0 && (
            <div style={{ marginTop: 6, borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9' }}>
                Usulan AI — perlu ditinjau guru (belum otomatis disetujui)
              </div>
              {aiProposedTopics.map((draft) => (
                <div
                  key={draft.id}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 7,
                    border: '1px solid #ddd6fe',
                    background: '#faf5ff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{draft.materiPokok}</div>
                    <div style={{ fontSize: 11.5, color: '#475569' }}>{draft.tujuanPembelajaran}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => onAddTopicDraftAsTP(draft)}
                  >
                    <Plus size={12} aria-hidden="true" /> Tambah sebagai Draf TP
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : viewMode === 'compare' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                background: '#e0f2fe',
                color: '#0369a1',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Semester 1 (Ganjil) — Kompetensi Fondasi ({sem1Bank.topics.length} topik)
            </div>
            {sem1Bank.topics.map(renderTopicCard)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                background: '#dcfce7',
                color: '#15803d',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowRight size={13} aria-hidden="true" />
              Semester 2 (Genap) — Progresi Kompetensi Lanjutan ({sem2Bank.topics.length} topik)
            </div>
            {sem2Bank.topics.length > 0 ? (
              sem2Bank.topics.map(renderTopicCard)
            ) : (
              <div style={{ padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                Topik rekomendasi Semester 2 belum tersedia; silakan susun manual atau atur pemetaan di ATP Fase.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {activeBank.topics.map(renderTopicCard)}
        </div>
      )}
    </section>
  );
};
