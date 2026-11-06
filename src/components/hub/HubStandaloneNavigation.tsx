import React from 'react';
import { motion } from 'framer-motion';
import {
  School,
  BookOpen,
  FileText,
  Users,
  Calendar,
  Table2,
  FileSpreadsheet,
  Sparkles,
  ShieldCheck,
  FolderOpen,
  RefreshCw,
  Check,
  Sparkle,
} from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import type { PerangkatSubTabType } from '../ClassSemesterHub';
import { springPillTransition } from '../../utils/motionPresets';

export const HubStepIndicatorBar: React.FC<{
  isClassConfirmed: boolean;
  onSetConfirmedState: (val: boolean) => void;
}> = ({ isClassConfirmed, onSetConfirmedState }) => (
  <div
    className="v21-bento-card"
    style={{
      padding: '12px 20px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 16,
      background: '#ffffff',
    }}
  >
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => onSetConfirmedState(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        opacity: !isClassConfirmed ? 1 : 0.7,
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: !isClassConfirmed ? '#2563eb' : '#10b981',
          color: '#fff',
          fontWeight: 800,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: !isClassConfirmed
            ? '0 2px 8px rgba(37, 99, 235, 0.35)'
            : '0 2px 8px rgba(16, 185, 129, 0.3)',
        }}
      >
        {isClassConfirmed ? <Check size={14} /> : '1'}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: !isClassConfirmed ? 800 : 600,
          color: !isClassConfirmed ? '#1d4ed8' : '#334155',
        }}
      >
        Atur Kelas & Mapel
      </span>
    </motion.button>

    <span style={{ color: '#cbd5e1', fontWeight: 800, fontSize: 13 }}>──→</span>

    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => onSetConfirmedState(true)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        opacity: isClassConfirmed ? 1 : 0.6,
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: isClassConfirmed ? '#2563eb' : '#94a3b8',
          color: '#fff',
          fontWeight: 800,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isClassConfirmed ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
        }}
      >
        2
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: isClassConfirmed ? 800 : 600,
          color: isClassConfirmed ? '#1d4ed8' : '#64748b',
        }}
      >
        Peta Materi & TP Semester
      </span>
    </motion.button>

    <span style={{ color: '#cbd5e1', fontWeight: 800, fontSize: 13 }}>──→</span>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#94a3b8',
          color: '#fff',
          fontWeight: 800,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        3
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
        Dokumen Siap Supervisi
      </span>
    </div>
  </div>
);

export const HubActiveClassBanner: React.FC<{
  schoolProfile: SchoolProfile;
  onSelectRombel: (rombel: string) => void;
  onChangeClassClick: () => void;
}> = ({ schoolProfile, onSelectRombel, onChangeClassClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="v21-bento-card"
    style={{
      padding: '16px 22px',
      marginBottom: 20,
      background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 50%, #eff6ff 100%)',
      border: '1px solid #bfdbfe',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 14,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
          flexShrink: 0,
        }}
      >
        <School size={22} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
          {schoolProfile.mataPelajaranUtama} • Kelas {schoolProfile.rombelAktif}
          <span
            style={{
              marginLeft: 8,
              fontSize: 11.5,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 6,
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
            }}
          >
            Semester {schoolProfile.semester}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3 }}>
          {schoolProfile.namaSekolah || 'Sekolah'} • Guru:{' '}
          <strong style={{ color: '#1e293b' }}>
            {schoolProfile.namaGuru || 'Guru Pengampu'}
          </strong>
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {schoolProfile.daftarRombel.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginRight: 6,
            background: '#ffffff',
            padding: 4,
            borderRadius: 9999,
            border: '1px solid #e2e8f0',
          }}
        >
          {schoolProfile.daftarRombel.map((rombel) => {
            const active = schoolProfile.rombelAktif === rombel;
            return (
              <button
                key={rombel}
                type="button"
                onClick={() => onSelectRombel(rombel)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 9999,
                  border: 'none',
                  background: active ? '#2563eb' : 'transparent',
                  color: active ? '#ffffff' : '#475569',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                }}
              >
                {rombel}
              </button>
            );
          })}
        </div>
      )}

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onChangeClassClick}
        style={{
          background: '#ffffff',
          border: '1.5px solid #93c5fd',
          color: '#1d4ed8',
          fontWeight: 800,
          fontSize: 12.5,
          padding: '8px 14px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
        }}
      >
        <RefreshCw size={13} /> Ganti Kelas / Mapel
      </motion.button>
    </div>
  </motion.div>
);

export const HubWorkspaceModeSwitcher: React.FC<{
  activeMainMode: 'persiapan' | 'harian' | 'supervisi';
  perangkatSubTab: PerangkatSubTabType;
  onSelectMainMode: (mode: 'persiapan' | 'harian' | 'supervisi') => void;
  onSelectSubTab: (tab: PerangkatSubTabType) => void;
}> = ({ activeMainMode, perangkatSubTab, onSelectMainMode, onSelectSubTab }) => {
  return (
    <div
      style={{
        marginBottom: 24,
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: 20,
      }}
    >
      {/* 3 Workspace Mode Bento Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Mode 1: Persiapan */}
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => {
            onSelectMainMode('persiapan');
            if (!['tp_list', 'atp', 'prota', 'promes'].includes(perangkatSubTab)) {
              onSelectSubTab('tp_list');
            }
          }}
          className="v21-bento-card"
          style={{
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            border:
              activeMainMode === 'persiapan'
                ? '2px solid #2563eb'
                : '1px solid rgba(226, 232, 240, 0.85)',
            background:
              activeMainMode === 'persiapan'
                ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)'
                : '#ffffff',
            boxShadow:
              activeMainMode === 'persiapan'
                ? '0 6px 20px rgba(37, 99, 235, 0.16)'
                : '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: activeMainMode === 'persiapan' ? '#2563eb' : '#f1f5f9',
              color: activeMainMode === 'persiapan' ? '#ffffff' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow:
                activeMainMode === 'persiapan' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
            }}
          >
            <FolderOpen size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 900,
                color: activeMainMode === 'persiapan' ? '#1d4ed8' : '#0f172a',
              }}
            >
              1. Persiapan Mengajar
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2, fontWeight: 500 }}>
              ATP, Prota, Promes, Modul & LKPD
            </div>
          </div>
        </motion.button>

        {/* Mode 2: Kelas Harian */}
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => {
            onSelectMainMode('harian');
            if (!['presensi', 'jurnal', 'nilai', 'rapor'].includes(perangkatSubTab)) {
              onSelectSubTab('presensi');
            }
          }}
          className="v21-bento-card"
          style={{
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            border:
              activeMainMode === 'harian'
                ? '2px solid #0284c7'
                : '1px solid rgba(226, 232, 240, 0.85)',
            background:
              activeMainMode === 'harian'
                ? 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)'
                : '#ffffff',
            boxShadow:
              activeMainMode === 'harian'
                ? '0 6px 20px rgba(2, 132, 199, 0.16)'
                : '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: activeMainMode === 'harian' ? '#0284c7' : '#f1f5f9',
              color: activeMainMode === 'harian' ? '#ffffff' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow:
                activeMainMode === 'harian' ? '0 4px 12px rgba(2, 132, 199, 0.3)' : 'none',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 900,
                color: activeMainMode === 'harian' ? '#0369a1' : '#0f172a',
              }}
            >
              2. Kelas Harian & Rapor
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2, fontWeight: 500 }}>
              Presensi, Jurnal, Nilai & Rapor
            </div>
          </div>
        </motion.button>

        {/* Mode 3: Siap Supervisi */}
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => {
            onSelectMainMode('supervisi');
            onSelectSubTab('supervisi');
          }}
          className="v21-bento-card"
          style={{
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            border:
              activeMainMode === 'supervisi'
                ? '2px solid #7c3aed'
                : '1px solid rgba(226, 232, 240, 0.85)',
            background:
              activeMainMode === 'supervisi'
                ? 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)'
                : '#ffffff',
            boxShadow:
              activeMainMode === 'supervisi'
                ? '0 6px 20px rgba(124, 58, 237, 0.16)'
                : '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: activeMainMode === 'supervisi' ? '#7c3aed' : '#f1f5f9',
              color: activeMainMode === 'supervisi' ? '#ffffff' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow:
                activeMainMode === 'supervisi' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 900,
                color: activeMainMode === 'supervisi' ? '#6d28d9' : '#0f172a',
              }}
            >
              3. Siap Supervisi
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2, fontWeight: 500 }}>
              1-Klik Unduh Master ZIP
            </div>
          </div>
        </motion.button>
      </div>

      {/* Sliding Pill Tabs: Persiapan Mengajar */}
      {activeMainMode === 'persiapan' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            background: '#f8fafc',
            padding: 5,
            borderRadius: 14,
            border: '1px solid #e2e8f0',
          }}
        >
          {[
            { id: 'tp_list', label: '🎯 Peta TP & Modul Ajar', icon: <BookOpen size={15} /> },
            { id: 'atp', label: '📋 Alur TP (ATP)', icon: <Table2 size={15} /> },
            { id: 'prota', label: '📅 Prota', icon: <Calendar size={15} /> },
            { id: 'promes', label: '🗓️ Promes Visual', icon: <FileSpreadsheet size={15} /> },
          ].map((tab) => {
            const active = perangkatSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectSubTab(tab.id as PerangkatSubTabType)}
                style={{
                  position: 'relative',
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: active ? '#ffffff' : '#475569',
                  fontWeight: active ? 800 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  outline: 'none',
                  zIndex: 1,
                  transition: 'color 0.15s ease',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="activeSubTabPill"
                    transition={springPillTransition}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: '#2563eb',
                      borderRadius: 10,
                      boxShadow: '0 3px 12px rgba(37, 99, 235, 0.28)',
                      zIndex: -1,
                    }}
                  />
                )}
                <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sliding Pill Tabs: Kelas Harian & Rapor */}
      {activeMainMode === 'harian' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            background: '#f0f9ff',
            padding: 5,
            borderRadius: 14,
            border: '1px solid #bae6fd',
          }}
        >
          {[
            { id: 'presensi', label: '👥 Presensi Siswa', icon: <Users size={15} /> },
            { id: 'jurnal', label: '📖 Jurnal Mengajar', icon: <FileText size={15} /> },
            { id: 'nilai', label: '📊 Buku Nilai TP', icon: <Table2 size={15} /> },
            { id: 'rapor', label: '✨ Auto-Deskripsi Rapor', icon: <Sparkles size={15} /> },
          ].map((tab) => {
            const active = perangkatSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectSubTab(tab.id as PerangkatSubTabType)}
                style={{
                  position: 'relative',
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: active ? '#ffffff' : '#0369a1',
                  fontWeight: active ? 800 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  outline: 'none',
                  zIndex: 1,
                  transition: 'color 0.15s ease',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="activeSubTabPill"
                    transition={springPillTransition}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: tab.id === 'rapor' ? '#16a34a' : '#0284c7',
                      borderRadius: 10,
                      boxShadow: '0 3px 12px rgba(2, 132, 199, 0.28)',
                      zIndex: -1,
                    }}
                  />
                )}
                <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Banner Mode: Siap Supervisi */}
      {activeMainMode === 'supervisi' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            padding: '12px 18px',
            borderRadius: 12,
            border: '1px solid #ddd6fe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkle size={18} color="#7c3aed" />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#5b21b6' }}>
              Ruang Supervisi Kepala Sekolah & Pengawas: 1-Klik Unduh Seluruh Dokumen Semester
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              color: '#6d28d9',
              fontWeight: 800,
              background: '#ffffff',
              padding: '3px 10px',
              borderRadius: 6,
              boxShadow: '0 1px 3px rgba(124, 58, 237, 0.12)',
            }}
          >
            9 Dokumen Otomatis Terintegrasi
          </span>
        </motion.div>
      )}
    </div>
  );
};
