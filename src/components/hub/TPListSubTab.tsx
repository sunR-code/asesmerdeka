import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  FileText,
  Plus,
  Edit3,
  RotateCcw,
  Check,
  Sliders,
  Sparkles,
  Trash2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { workspaceAccordionTransition } from '../../utils/motionPresets';

interface TPListSubTabProps {
  schoolProfile: SchoolProfile;
  tpList: CustomTPItem[];
  isCustomTP: boolean;
  currentFase: string;
  capaianPembelajaran: string;
  editingTPId: string | null;
  draftTP: CustomTPItem | null;
  setEditingTPId: (id: string | null) => void;
  setDraftTP: (tp: CustomTPItem | null) => void;
  onStartEditTP: (tp: CustomTPItem) => void;
  onSaveEditTP: () => void;
  onAddNewTP: () => void;
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
}

export const TPListSubTab: React.FC<TPListSubTabProps> = ({
  schoolProfile,
  tpList,
  isCustomTP,
  currentFase,
  capaianPembelajaran,
  editingTPId,
  draftTP,
  setEditingTPId,
  setDraftTP,
  onStartEditTP,
  onSaveEditTP,
  onAddNewTP,
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
}) => {
  const [showCPDetail, setShowCPDetail] = useState(false);
  const [activeGeneratingTPId, setActiveGeneratingTPId] = useState<string | null>(null);
  const isBusy = isGeneratingAssessment || isGeneratingRangkuman;

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
              <span>{showCPDetail ? 'Tutup deskripsi CP' : 'Lihat teks lengkap CP'}</span>
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
              title="Kembalikan materi ke standar Kemendikbudristek"
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

      {/* Accordion Capaian Pembelajaran (CP) */}
      <AnimatePresence initial={false}>
        {showCPDetail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={workspaceAccordionTransition}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 14,
              fontSize: 13,
              color: '#334155',
              lineHeight: 1.55,
              overflow: 'hidden',
            }}
          >
            <strong style={{ color: '#172033', display: 'block', marginBottom: 4 }}>
              Capaian Pembelajaran (CP) Fase {currentFase}:
            </strong>
            {capaianPembelajaran}
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
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1d4ed8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Edit3 size={15} aria-hidden="true" /> Ubah Materi / Tujuan Pembelajaran (TP {draftTP.kode})
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Judul Materi Pokok / Bab</label>
                    <input
                      type="text"
                      className="form-input"
                      value={draftTP.materiPokok}
                      onChange={(e) => setDraftTP({ ...draftTP, materiPokok: e.target.value })}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Tujuan Pembelajaran (TP)</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={draftTP.tujuanPembelajaran}
                      onChange={(e) => setDraftTP({ ...draftTP, tujuanPembelajaran: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTPId(null);
                        setDraftTP(null);
                      }}
                      className="btn btn-sm btn-outline"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={onSaveEditTP}
                      className="btn btn-sm btn-primary"
                    >
                      <Check size={14} aria-hidden="true" /> Simpan Perubahan
                    </button>
                  </div>
                </div>
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
                      </div>

                      <div style={{ fontSize: 15.5, fontWeight: 700, color: '#172033', marginBottom: 3 }}>
                        {tp.materiPokok}
                      </div>

                      <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>
                        {tp.tujuanPembelajaran}
                      </div>
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
