import React from 'react';
import {
  BookOpen,
  Users,
  FolderOpen,
  RefreshCw,
  Check,
  Calendar,
  Table2,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import type { PerangkatSubTabType } from '../ClassSemesterHub';

export const HubStepIndicatorBar: React.FC<{
  isClassConfirmed: boolean;
  onSetConfirmedState?: (val: boolean) => void;
}> = ({ isClassConfirmed }) => {
  const steps = [
    { num: 1, label: 'Atur kelas & mapel', active: !isClassConfirmed, done: isClassConfirmed },
    { num: 2, label: 'Masuk ruang kerja semester', active: isClassConfirmed, done: false },
    { num: 3, label: 'Siapkan administrasi & supervisi', active: false, done: false },
  ];

  return (
    <nav
      aria-label="Tahap persiapan ruang kerja"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px 16px',
        padding: '10px 14px',
        marginBottom: 16,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
      }}
    >
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px 16px',
          margin: 0,
          padding: 0,
          listStyle: 'none',
          width: '100%',
        }}
      >
        {steps.map((step, idx) => (
          <li
            key={step.num}
            aria-current={step.active ? 'step' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: step.active ? '#172033' : '#64748b',
              fontSize: 13,
              fontWeight: step.active ? 600 : 500,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11.5,
                fontWeight: 700,
                background: step.active
                  ? '#2563eb'
                  : step.done
                    ? '#ecfdf5'
                    : '#f1f5f9',
                color: step.active
                  ? '#ffffff'
                  : step.done
                    ? '#15803d'
                    : '#64748b',
                border: step.done
                  ? '1px solid #bbf7d0'
                  : step.active
                    ? 'none'
                    : '1px solid #e2e8f0',
                flexShrink: 0,
              }}
            >
              {step.done ? <Check size={12} /> : step.num}
            </span>
            <span>{step.label}</span>
            {idx < steps.length - 1 && (
              <span
                aria-hidden="true"
                style={{
                  color: '#cbd5e1',
                  marginLeft: 6,
                  fontSize: 12,
                }}
              >
                /
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export const HubActiveClassBanner: React.FC<{
  schoolProfile: SchoolProfile;
  onSelectRombel: (rombel: string) => void;
  onChangeClassClick: () => void;
}> = ({ schoolProfile, onSelectRombel, onChangeClassClick }) => {
  const rombelList =
    schoolProfile.daftarRombel.length > 0
      ? schoolProfile.daftarRombel
      : [schoolProfile.rombelAktif];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        padding: '10px 14px',
        marginBottom: 12,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: '#172033',
          }}
        >
          {schoolProfile.mataPelajaranUtama}
        </span>
        <span style={{ color: '#cbd5e1' }} aria-hidden="true">
          ·
        </span>
        <span style={{ fontSize: 13, color: '#475569' }}>
          {schoolProfile.jenjang} · Kelas {schoolProfile.kelasUtama} · Semester{' '}
          {schoolProfile.semester}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
          Rombel aktif:
        </span>
        <div
          role="group"
          aria-label="Pilih rombel aktif"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}
        >
          {rombelList.map((rmb) => {
            const isSelected = rmb === schoolProfile.rombelAktif;
            return (
              <button
                key={rmb}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectRombel(rmb)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 7,
                  border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#475569',
                  fontFamily: 'var(--font-family)',
                  fontSize: 12,
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'border-color 140ms ease, background-color 140ms ease, color 140ms ease',
                }}
              >
                {isSelected && <Check size={12} aria-hidden="true" />}
                {rmb}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onChangeClassClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 7,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#334155',
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 140ms ease, border-color 140ms ease',
          }}
        >
          <RefreshCw size={12} aria-hidden="true" />
          <span>Ganti</span>
        </button>
      </div>
    </div>
  );
};

interface SubTabOption {
  id: PerangkatSubTabType;
  label: string;
  icon: React.ReactNode;
}

export const HubWorkspaceModeSwitcher: React.FC<{
  activeMainMode: 'persiapan' | 'harian' | 'supervisi';
  perangkatSubTab: PerangkatSubTabType;
  onSelectMainMode: (mode: 'persiapan' | 'harian' | 'supervisi') => void;
  onSelectSubTab: (tab: PerangkatSubTabType) => void;
}> = ({ activeMainMode, perangkatSubTab, onSelectMainMode, onSelectSubTab }) => {
  const modes: Array<{
    id: 'persiapan' | 'harian' | 'supervisi';
    label: string;
    defaultTab: PerangkatSubTabType;
    icon: React.ReactNode;
  }> = [
    {
      id: 'persiapan',
      label: 'Perangkat mengajar',
      defaultTab: 'tp_list',
      icon: <BookOpen size={14} aria-hidden="true" />,
    },
    {
      id: 'harian',
      label: 'Kelas harian & rapor',
      defaultTab: 'presensi',
      icon: <Users size={14} aria-hidden="true" />,
    },
    {
      id: 'supervisi',
      label: 'Paket supervisi',
      defaultTab: 'supervisi',
      icon: <FolderOpen size={14} aria-hidden="true" />,
    },
  ];

  const persiapanTabs: SubTabOption[] = [
    { id: 'tp_list', label: 'Peta TP & modul', icon: <FileText size={13} aria-hidden="true" /> },
    { id: 'atp', label: 'ATP', icon: <Sparkles size={13} aria-hidden="true" /> },
    { id: 'prota', label: 'Program tahunan', icon: <Calendar size={13} aria-hidden="true" /> },
    { id: 'promes', label: 'Program semester', icon: <Calendar size={13} aria-hidden="true" /> },
  ];

  const harianTabs: SubTabOption[] = [
    { id: 'presensi', label: 'Presensi siswa', icon: <Users size={13} aria-hidden="true" /> },
    { id: 'jurnal', label: 'Jurnal mengajar', icon: <BookOpen size={13} aria-hidden="true" /> },
    { id: 'nilai', label: 'Buku nilai TP', icon: <Table2 size={13} aria-hidden="true" /> },
    {
      id: 'rapor',
      label: 'Deskripsi rapor',
      icon: <FileSpreadsheet size={13} aria-hidden="true" />,
    },
  ];

  const localTabs =
    activeMainMode === 'persiapan'
      ? persiapanTabs
      : activeMainMode === 'harian'
        ? harianTabs
        : [];

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Workflow Mode Switcher */}
      <div
        role="tablist"
        aria-label="Kelompok ruang kerja"
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: 4,
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          maxWidth: '100%',
        }}
      >
        {modes.map((m) => {
          const isActive = activeMainMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                onSelectMainMode(m.id);
                onSelectSubTab(m.defaultTab);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 7,
                border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#172033' : '#64748b',
                boxShadow: isActive ? '0 1px 2px rgba(23, 32, 51, 0.05)' : 'none',
                fontFamily: 'var(--font-family)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'background-color 140ms ease, color 140ms ease, border-color 140ms ease',
              }}
            >
              <span style={{ color: isActive ? '#2563eb' : '#64748b', display: 'inline-flex' }}>
                {m.icon}
              </span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Local Underline Sub-tabs */}
      {localTabs.length > 0 && (
        <div
          role="tablist"
          aria-label="Halaman dalam ruang kerja"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 12,
            borderBottom: '1px solid #e2e8f0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {localTabs.map((tab) => {
            const isCurrent = perangkatSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                onClick={() => onSelectSubTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: isCurrent ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'transparent',
                  color: isCurrent ? '#1d4ed8' : '#64748b',
                  fontFamily: 'var(--font-family)',
                  fontSize: 13,
                  fontWeight: isCurrent ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginBottom: -1,
                  transition: 'color 140ms ease, border-color 140ms ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
