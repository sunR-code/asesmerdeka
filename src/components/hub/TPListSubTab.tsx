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
import {
  bentoCardVariants,
  staggerContainerVariants,
  cardTapMotion,
} from '../../utils/motionPresets';

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                background: '#ecfdf5',
                color: '#065f46',
                fontWeight: 800,
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 9999,
                border: '1px solid #a7f3d0',
              }}
            >
              Langkah 2 • Peta Materi & Capaian Semester
            </span>
            <button
              type="button"
              onClick={() => setShowCPDetail(!showCPDetail)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{showCPDetail ? 'Tutup Deskripsi CP' : 'Lihat Teks Lengkap Capaian (CP)'}</span>
              {showCPDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
            Daftar Bab & Tujuan Pembelajaran (TP) — {schoolProfile.mataPelajaranUtama}
          </h2>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            Kelas {schoolProfile.rombelAktif} • Fase {currentFase} • Semester {schoolProfile.semester} ({tpList.length} Materi Pembelajaran)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCustomTP && (
            <motion.button
              type="button"
              whileTap={cardTapMotion}
              onClick={onResetDefaultTP}
              className="btn btn-sm btn-outline"
              style={{ fontSize: 12, fontWeight: 700, borderRadius: 10 }}
              title="Kembalikan materi ke standar Kemendikbudristek"
            >
              <RotateCcw size={13} /> Standar Kurikulum Merdeka
            </motion.button>
          )}

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={cardTapMotion}
            onClick={onAddNewTP}
            className="btn btn-sm btn-primary"
            style={{ fontSize: 12.5, fontWeight: 800, borderRadius: 10, padding: '7px 14px' }}
          >
            <Plus size={14} /> + Tambah Materi Baru
          </motion.button>
        </div>
      </div>

      {/* Accordion Capaian Pembelajaran (CP) */}
      <AnimatePresence>
        {showCPDetail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="v21-bento-card"
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '14px 18px',
              marginBottom: 16,
              fontSize: 12.5,
              color: '#1e3a8a',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#1d4ed8', display: 'block', marginBottom: 4 }}>
              Capaian Pembelajaran (CP) Fase {currentFase}:
            </strong>
            {capaianPembelajaran}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daftar Kartu TP Bento Grid */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {tpList.map((tp, index) => {
          const isEditing = editingTPId === tp.id && draftTP;
          const isThisGenerating = isBusy && activeGeneratingTPId === tp.id;

          return (
            <motion.div
              key={tp.id}
              variants={bentoCardVariants}
              whileHover={{ y: -2 }}
              className="v21-bento-card"
              style={{
                padding: '18px 20px',
                border: isEditing
                  ? '2px solid #2563eb'
                  : isThisGenerating
                  ? '2px solid #0d9488'
                  : '1px solid rgba(226, 232, 240, 0.85)',
                boxShadow: isEditing || isThisGenerating
                  ? '0 6px 20px rgba(37, 99, 235, 0.15)'
                  : undefined,
              }}
            >
              {isEditing ? (
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 900, color: '#1d4ed8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Edit3 size={15} /> Ubah Materi / Tujuan Pembelajaran (TP {draftTP.kode})
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
                      style={{ borderRadius: 8 }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={onSaveEditTP}
                      className="btn btn-sm btn-primary"
                      style={{ borderRadius: 8 }}
                    >
                      <Check size={14} /> Simpan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Baris Atas: Nomor, Badge, Judul & Deskripsi TP */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        border: '1.5px solid #bfdbfe',
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        fontWeight: 900,
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(37,99,235,0.08)',
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          TP {tp.kode}
                        </span>
                        <span style={{ fontSize: 11.5, color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Layers size={13} color="#64748b" /> {tp.elemen}
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontSize: 11.5, color: '#0369a1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={13} color="#0284c7" /> Alokasi: {tp.alokasiJP} JP
                        </span>
                      </div>

                      <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px', marginBottom: 4 }}>
                        {tp.materiPokok}
                      </div>

                      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55 }}>
                        {tp.tujuanPembelajaran}
                      </div>
                    </div>
                  </div>

                  {/* Baris Bawah: Tombol Aksi Kilat Modul & Generator */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      paddingTop: 12,
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    {/* 4 Tombol Utama Aksi Kilat */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={cardTapMotion}
                        onClick={() => onOpenModulAjar(tp, schoolProfile)}
                        className="btn btn-sm"
                        style={{
                          background: '#1e40af',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 14px',
                          fontSize: 12.5,
                          fontWeight: 800,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(30, 64, 175, 0.22)',
                        }}
                        title="Buka & Unduh Modul Ajar (RPP Kurikulum Merdeka) untuk materi ini"
                      >
                        <BookOpen size={14} /> 📘 Modul Ajar (RPP)
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={cardTapMotion}
                        onClick={() => onOpenLKPD(tp, schoolProfile)}
                        className="btn btn-sm"
                        style={{
                          background: '#047857',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 14px',
                          fontSize: 12.5,
                          fontWeight: 800,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(4, 120, 87, 0.22)',
                        }}
                        title="Buka & Unduh Lembar Kerja Peserta Didik (LKPD) untuk materi ini"
                      >
                        <FileText size={14} /> 📄 LKPD Siswa
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={cardTapMotion}
                        disabled={isBusy}
                        onClick={async () => {
                          setActiveGeneratingTPId(tp.id);
                          try {
                            await onInstantGenerateAssessment(tp, schoolProfile);
                          } finally {
                            setActiveGeneratingTPId(null);
                          }
                        }}
                        className="btn btn-sm"
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 14px',
                          fontSize: 12.5,
                          fontWeight: 800,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.22)',
                        }}
                      >
                        <Sparkles size={14} />
                        {isThisGenerating && isGeneratingAssessment
                          ? 'Menyusun Soal...'
                          : '📝 Buat Soal Evaluasi'}
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={cardTapMotion}
                        disabled={isBusy}
                        onClick={async () => {
                          setActiveGeneratingTPId(tp.id);
                          try {
                            await onInstantGenerateRangkuman(tp, schoolProfile);
                          } finally {
                            setActiveGeneratingTPId(null);
                          }
                        }}
                        className="btn btn-sm"
                        style={{
                          background: '#0d9488',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 14px',
                          fontSize: 12.5,
                          fontWeight: 800,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 8px rgba(13, 148, 136, 0.22)',
                        }}
                      >
                        <BookOpen size={14} />
                        {isThisGenerating && isGeneratingRangkuman
                          ? 'Merangkum...'
                          : '📖 Rangkuman'}
                      </motion.button>
                    </div>

                    {/* Pengaturan Sekunder */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => onCustomAssessmentForm(tp, schoolProfile)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 11.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Atur jumlah soal PG, Uraian, dan tingkat kesulitan"
                      >
                        <Sliders size={12} /> Atur Soal
                      </button>

                      <button
                        type="button"
                        onClick={() => onCustomRangkumanForm(tp, schoolProfile)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 11.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Atur cakupan dan panjang materi rangkuman"
                      >
                        <Sliders size={12} /> Atur Rangkuman
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartEditTP(tp)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 11.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Edit teks materi atau tujuan pembelajaran"
                      >
                        <Edit3 size={12} /> Edit
                      </button>

                      {tpList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteTP(tp.id, tp.kode)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: 11.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Hapus materi ini dari daftar semester"
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
