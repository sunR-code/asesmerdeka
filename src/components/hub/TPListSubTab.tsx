import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  FileText,
  Plus,
  Edit3,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CPReferenceMeta, SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { getSavedCPEntries, resolveCPStatusLabel, type SavedCPEntry } from '../../utils/cpStorage';
import { workspaceAccordionTransition } from '../../utils/motionPresets';
import { CPWorkspacePanel } from './CPWorkspacePanel';
import { TPEditorForm } from './TPEditorForm';

interface TPListSubTabProps {
  schoolProfile: SchoolProfile;
  tpList: CustomTPItem[];
  isCustomTP: boolean;
  currentFase: string;
  capaianPembelajaran: string;
  referensiCatatan?: string;
  defaultReferensiCP?: CPReferenceMeta;
  editingTPId: string | null;
  draftTP: CustomTPItem | null;
  setEditingTPId: (id: string | null) => void;
  setDraftTP: (tp: CustomTPItem | null) => void;
  onStartEditTP: (tp: CustomTPItem) => void;
  onSaveEditTP: () => void;
  onToggleReviewTP?: (tp: CustomTPItem) => void;
  onAddNewTP: () => void;
  onCreateTPFromAnalysis?: (newTP: CustomTPItem) => void;
  onDeleteTP: (id: string, kode: string) => void;
  onResetDefaultTP: () => void;
  onOpenModulAjar: (tp: CustomTPItem, profile: SchoolProfile) => void;
  onOpenLKPD: (tp: CustomTPItem, profile: SchoolProfile) => void;
  onInstantGenerateAssessment: (tp: CustomTPItem, profile: SchoolProfile) => Promise<void>;
  onInstantGenerateRangkuman: (tp: CustomTPItem, profile: SchoolProfile) => Promise<void>;
  onCustomAssessmentForm: (tp: CustomTPItem, profile: SchoolProfile) => void;
  onCustomRangkumanForm: (tp: CustomTPItem, profile: SchoolProfile) => void;
  isGeneratingAssessment: boolean;
  isGeneratingRangkuman: boolean;
  onToast?: (msg: string) => void;
}

export const TPListSubTab: React.FC<TPListSubTabProps> = ({
  schoolProfile,
  tpList,
  isCustomTP,
  currentFase,
  capaianPembelajaran,
  referensiCatatan,
  defaultReferensiCP,
  editingTPId,
  draftTP,
  setEditingTPId,
  setDraftTP,
  onStartEditTP,
  onSaveEditTP,
  onToggleReviewTP,
  onAddNewTP,
  onCreateTPFromAnalysis,
  onDeleteTP,
  onResetDefaultTP,
  onOpenModulAjar,
  onOpenLKPD,
  onInstantGenerateAssessment,
  onInstantGenerateRangkuman,
  onCustomAssessmentForm,
  onCustomRangkumanForm,
  isGeneratingAssessment,
  isGeneratingRangkuman,
  onToast,
}) => {
  const [showCPDetail, setShowCPDetail] = useState(false);
  const [activeGeneratingTPId, setActiveGeneratingTPId] = useState<string | null>(null);
  const [savedCPEntries, setSavedCPEntries] = useState<SavedCPEntry[]>(() =>
    getSavedCPEntries(schoolProfile, currentFase)
  );
  const isBusy = isGeneratingAssessment || isGeneratingRangkuman;

  useEffect(() => {
    setSavedCPEntries(getSavedCPEntries(schoolProfile, currentFase));
  }, [schoolProfile.schoolId, schoolProfile.mataPelajaranUtama, schoolProfile.jenjang, currentFase]);

  return (
    <div key="tp_list">
      {/* Header Bar Kontrol Materi & Reset */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#172033', margin: 0 }}>
            Daftar bab & tujuan pembelajaran — {schoolProfile.mataPelajaranUtama}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <p className="tabular-nums" style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Kelas {schoolProfile.rombelAktif} · {currentFase} · Semester {schoolProfile.semester} · {tpList.length} materi
            </p>
            <button
              type="button"
              onClick={() => setShowCPDetail(!showCPDetail)}
              aria-expanded={showCPDetail}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontFamily: 'var(--font-family)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
              }}
            >
              <span>{showCPDetail ? 'Tutup Panel CP & Analisis CP' : 'Kelola Sumber CP & Analisis CP'}</span>
              {showCPDetail ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCustomTP && (
            <button
              type="button"
              onClick={onResetDefaultTP}
              className="btn btn-sm btn-outline"
              title="Kembalikan materi ke standar Kurikulum Merdeka"
            >
              <RotateCcw size={13} aria-hidden="true" /> Standar Kurikulum Merdeka
            </button>
          )}

          <button
            type="button"
            onClick={onAddNewTP}
            className="btn btn-sm btn-primary"
          >
            <Plus size={14} aria-hidden="true" /> Tambah Materi
          </button>
        </div>
      </div>

      {/* Accordion Sumber CP, Input/Edit CP, dan Analisis CP -> TP */}
      <AnimatePresence initial={false}>
        {showCPDetail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={workspaceAccordionTransition}
            style={{ overflow: 'hidden' }}
          >
            <CPWorkspacePanel
              schoolProfile={schoolProfile}
              currentFase={currentFase}
              capaianPembelajaranRingkas={capaianPembelajaran}
              referensiCatatan={referensiCatatan}
              defaultReferensiCP={defaultReferensiCP}
              existingTPCount={tpList.length}
              onCreateTPFromAnalysis={(newTP) => {
                if (onCreateTPFromAnalysis) {
                  onCreateTPFromAnalysis(newTP);
                }
              }}
              onCPListChanged={setSavedCPEntries}
              onToast={onToast}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daftar Tujuan Pembelajaran */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tpList.map((tp, index) => {
          const isEditing = editingTPId === tp.id && draftTP;
          const isThisGenerating = isBusy && activeGeneratingTPId === tp.id;

          return (
            <div
              key={tp.id}
              className="v21-bento-card"
              style={{
                padding: '16px 18px',
                borderRadius: 10,
                border: isEditing
                  ? '1.5px solid #2563eb'
                  : isThisGenerating
                  ? '1.5px solid #2563eb'
                  : '1px solid #e2e8f0',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {isEditing ? (
                <TPEditorForm
                  draftTP={draftTP}
                  schoolProfile={schoolProfile}
                  savedCPEntries={savedCPEntries}
                  onChangeDraft={setDraftTP}
                  onCancel={() => {
                    setEditingTPId(null);
                    setDraftTP(null);
                  }}
                  onSave={onSaveEditTP}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Baris Atas: Nomor, Metadata & Deskripsi TP */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      className="tabular-nums"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 9,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span
                          className="tabular-nums"
                          style={{
                            background: '#f1f5f9',
                            color: '#172033',
                            fontWeight: 600,
                            fontSize: 11.5,
                            padding: '2px 7px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          TP {tp.kode}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Layers size={12} aria-hidden="true" /> {tp.elemen}
                        </span>
                        <span style={{ color: '#cbd5e1' }} aria-hidden="true">·</span>
                        <span className="tabular-nums" style={{ fontSize: 12, color: '#475569', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} aria-hidden="true" /> {tp.alokasiJP} JP
                        </span>
                        {onToggleReviewTP && (
                          <button
                            type="button"
                            onClick={() => onToggleReviewTP(tp)}
                            title="Klik untuk memperbarui status tinjauan guru"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 6,
                              border: '1px solid',
                              cursor: 'pointer',
                              borderColor:
                                tp.statusReview === 'disetujui'
                                  ? '#86efac'
                                  : tp.statusReview === 'ditinjau'
                                  ? '#93c5fd'
                                  : '#fde68a',
                              background:
                                tp.statusReview === 'disetujui'
                                  ? '#f0fdf4'
                                  : tp.statusReview === 'ditinjau'
                                  ? '#eff6ff'
                                  : '#fffbeb',
                              color:
                                tp.statusReview === 'disetujui'
                                  ? '#166534'
                                  : tp.statusReview === 'ditinjau'
                                  ? '#1d4ed8'
                                  : '#92400e',
                            }}
                          >
                            {tp.statusReview === 'disetujui'
                              ? 'Disetujui Guru'
                              : tp.statusReview === 'ditinjau'
                              ? 'Sudah Ditinjau'
                              : 'Perlu Review Guru'}
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: 15.5, fontWeight: 700, color: '#172033', marginBottom: 3 }}>
                        {tp.materiPokok}
                      </div>

                      <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>
                        {tp.tujuanPembelajaran}
                      </div>

                      {(tp.kompetensiInti || tp.lingkupMateri || tp.prasyarat?.length || tp.buktiKetercapaian?.length || tp.subTP?.length || tp.referensiCP) ? (
                        <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9', fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(tp.kompetensiInti || tp.lingkupMateri) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                              {tp.kompetensiInti && (
                                <span>
                                  <strong style={{ color: '#334155' }}>Kompetensi:</strong> {tp.kompetensiInti}
                                </span>
                              )}
                              {tp.lingkupMateri && (
                                <span>
                                  <strong style={{ color: '#334155' }}>Lingkup Materi:</strong> {tp.lingkupMateri}
                                </span>
                              )}
                            </div>
                          )}
                          {tp.buktiKetercapaian && tp.buktiKetercapaian.length > 0 && (
                            <div>
                              <strong style={{ color: '#334155' }}>Bukti Ketercapaian:</strong> {tp.buktiKetercapaian.join(' · ')}
                            </div>
                          )}
                          {tp.prasyarat && tp.prasyarat.length > 0 && (
                            <div>
                              <strong style={{ color: '#334155' }}>Prasyarat:</strong> {tp.prasyarat.join(' · ')}
                            </div>
                          )}
                          {tp.subTP && tp.subTP.length > 0 && (
                            <div>
                              <strong style={{ color: '#334155' }}>Rincian Sub-TP ({tp.subTP.length}):</strong>{' '}
                              {tp.subTP.map((s) => `${s.kode}: ${s.kompetensi}`).join(' | ')}
                            </div>
                          )}
                          {tp.referensiCP && (
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                              <strong style={{ color: '#334155' }}>Sumber CP:</strong> {tp.referensiCP.elemenCP} ·{' '}
                              {resolveCPStatusLabel(
                                tp.referensiCP.statusVerifikasi,
                                tp.referensiCP.terverifikasiResmi,
                                tp.referensiCP.asalCP
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Baris Bawah: Aksi Utama & Sekunder */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      paddingTop: 10,
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={async () => {
                          setActiveGeneratingTPId(tp.id);
                          try {
                            await onInstantGenerateAssessment(tp, schoolProfile);
                          } finally {
                            setActiveGeneratingTPId(null);
                          }
                        }}
                        className="btn btn-sm btn-primary"
                      >
                        <Sparkles size={13} aria-hidden="true" />
                        <span>
                          {isThisGenerating && isGeneratingAssessment
                            ? 'Menyusun Soal...'
                            : 'Buat Soal Evaluasi'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenModulAjar(tp, schoolProfile)}
                        className="btn btn-sm btn-outline"
                        title="Buka & Unduh Modul Ajar (RPP Kurikulum Merdeka) untuk materi ini"
                      >
                        <BookOpen size={13} aria-hidden="true" />
                        <span>Modul Ajar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenLKPD(tp, schoolProfile)}
                        className="btn btn-sm btn-outline"
                        title="Buka & Unduh Lembar Kerja Peserta Didik (LKPD) untuk materi ini"
                      >
                        <FileText size={13} aria-hidden="true" />
                        <span>LKPD Siswa</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={async () => {
                          setActiveGeneratingTPId(tp.id);
                          try {
                            await onInstantGenerateRangkuman(tp, schoolProfile);
                          } finally {
                            setActiveGeneratingTPId(null);
                          }
                        }}
                        className="btn btn-sm btn-outline"
                      >
                        <BookOpen size={13} aria-hidden="true" />
                        <span>
                          {isThisGenerating && isGeneratingRangkuman
                            ? 'Merangkum...'
                            : 'Rangkuman'}
                        </span>
                      </button>
                    </div>

                    {/* Pengaturan Sekunder */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => onCustomAssessmentForm(tp, schoolProfile)}
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 12, padding: '5px 9px' }}
                        title="Atur jumlah soal PG, Uraian, dan tingkat kesulitan"
                      >
                        <Sliders size={12} aria-hidden="true" /> Atur Soal
                      </button>

                      <button
                        type="button"
                        onClick={() => onCustomRangkumanForm(tp, schoolProfile)}
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 12, padding: '5px 9px' }}
                        title="Atur cakupan dan panjang materi rangkuman"
                      >
                        <Sliders size={12} aria-hidden="true" /> Atur Rangkuman
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartEditTP(tp)}
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 12, padding: '5px 9px' }}
                        title="Edit teks materi atau tujuan pembelajaran"
                      >
                        <Edit3 size={12} aria-hidden="true" /> Edit
                      </button>

                      {tpList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteTP(tp.id, tp.kode)}
                          style={{
                            padding: '5px 9px',
                            borderRadius: 8,
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-family)',
                            fontWeight: 600,
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Hapus materi ini dari daftar semester"
                        >
                          <Trash2 size={12} aria-hidden="true" /> Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
