import React, { useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Table2,
  Calendar,
  FileSpreadsheet,
  Users,
  FileText,
  Award,
  ShieldCheck,
  FolderOpen,
  PlusCircle,
  School,
  ChevronRight,
  Key,
  HeartHandshake,
  X,
  HelpCircle,
} from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';
import type { UserQuota } from '../../types/assessment';
import { isLicensed, getTierBadgeLabel, getTierDisplayName } from '../../utils/licenseManager';
import { BrandLogo } from '../BrandLogo';

export type SidebarTabId =
  | 'tp_list'
  | 'atp'
  | 'prota'
  | 'promes'
  | 'presensi'
  | 'jurnal'
  | 'nilai'
  | 'rapor'
  | 'supervisi'
  | 'bank'
  | 'ujian_semester'
  | 'p5_project'
  | 'generator'
  | 'rangkuman_gen';

interface NavItem {
  id: SidebarTabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AppSidebarProps {
  activeTab: SidebarTabId | string;
  onSelectTab: (tab: SidebarTabId) => void;
  schoolProfile: SchoolProfile;
  quota: UserQuota;
  bankCount: number;
  onOpenClassModal: () => void;
  onOpenSchoolModal: () => void;
  onOpenLicenseModal: () => void;
  onOpenHelpModal?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  schoolProfile,
  quota,
  bankCount,
  onOpenClassModal,
  onOpenSchoolModal,
  onOpenLicenseModal,
  onOpenHelpModal,
  isMobileOpen = false,
  onCloseMobile,
  returnFocusRef,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasMobileOpenRef = useRef(false);

  useEffect(() => {
    if (isMobileOpen) {
      wasMobileOpenRef.current = true;
      closeButtonRef.current?.focus();
    } else if (wasMobileOpenRef.current) {
      wasMobileOpenRef.current = false;
      returnFocusRef?.current?.focus();
    }
  }, [isMobileOpen, returnFocusRef]);

  useEffect(() => {
    if (!isMobileOpen || !onCloseMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const navSections: NavSection[] = [
    {
      title: 'Perangkat Semester',
      items: [
        {
          id: 'tp_list',
          label: 'Peta TP & Modul Ajar',
          icon: <BookOpen size={16} />,
        },
        {
          id: 'atp',
          label: 'Alur Tujuan (ATP)',
          icon: <Table2 size={16} />,
        },
        {
          id: 'prota',
          label: 'Program Tahunan',
          icon: <Calendar size={16} />,
        },
        {
          id: 'promes',
          label: 'Program Semester',
          icon: <FileSpreadsheet size={16} />,
        },
        {
          id: 'p5_project',
          label: 'Modul Projek P5',
          icon: <HeartHandshake size={16} />,
        },
      ],
    },
    {
      title: 'Kelas Harian & Rapor',
      items: [
        {
          id: 'presensi',
          label: 'Presensi Siswa',
          icon: <Users size={16} />,
        },
        {
          id: 'jurnal',
          label: 'Jurnal Mengajar',
          icon: <FileText size={16} />,
        },
        {
          id: 'nilai',
          label: 'Buku Nilai Asesmen',
          icon: <Award size={16} />,
        },
        {
          id: 'rapor',
          label: 'Auto-Deskripsi e-Rapor',
          icon: <Sparkles size={16} />,
        },
      ],
    },
    {
      title: 'Supervisi & Ekspor',
      items: [
        {
          id: 'supervisi',
          label: 'Paket Siap Supervisi',
          icon: <ShieldCheck size={16} />,
        },
      ],
    },
    {
      title: 'Evaluasi & Arsip',
      items: [
        {
          id: 'ujian_semester',
          label: 'Naskah Ujian STS & SAS',
          icon: <Award size={16} />,
        },
        {
          id: 'bank',
          label: 'Bank Soal & Arsip',
          icon: <FolderOpen size={16} />,
          count: bankCount,
        },
        {
          id: 'generator',
          label: 'Buat Soal Evaluasi AI',
          icon: <PlusCircle size={16} />,
        },
        {
          id: 'rangkuman_gen',
          label: 'Buat Rangkuman AI',
          icon: <BookOpen size={16} />,
        },
      ],
    },
  ];

  const handleItemClick = (id: SidebarTabId) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const isUnlocked = isLicensed(quota.tier);
  const badgeLabel = getTierBadgeLabel(quota.tier);
  const tierTitle = getTierDisplayName(quota.tier);
  const semesterNum = schoolProfile.semester.startsWith('2') ? '2' : '1';

  return (
    <>
      {isMobileOpen && (
        <div
          className="mobile-sidebar-backdrop no-print"
          onClick={onCloseMobile}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(23, 32, 51, 0.4)',
            zIndex: 998,
          }}
        />
      )}

      <aside
        className={`app-sidebar no-print ${isMobileOpen ? 'is-mobile-open' : ''}`}
        role={isMobileOpen ? 'dialog' : undefined}
        aria-modal={isMobileOpen ? true : undefined}
        aria-label="Navigasi workspace"
        style={{
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          position: 'sticky',
          top: 0,
          zIndex: 999,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* 1. Brand Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={32} />
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#172033',
                  letterSpacing: '-0.015em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>AsesMerdeka</span>
                {isUnlocked && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #a7f3d0',
                      padding: '1px 5px',
                      borderRadius: 5,
                    }}
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 400 }}>
                Administrasi semester
              </div>
            </div>
          </div>

          {onCloseMobile && (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onCloseMobile}
              className="mobile-sidebar-close"
              aria-label="Tutup menu navigasi"
              title="Tutup menu"
            >
              <X size={17} />
            </button>
          )}
        </div>

        {/* 2. Konteks Kelas Ringkas */}
        <div style={{ padding: '12px 12px 6px', flexShrink: 0 }}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#172033',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Kelas {schoolProfile.rombelAktif} · Sem {semesterNum}
              </span>
              <button
                type="button"
                onClick={() => {
                  onOpenClassModal();
                  if (onCloseMobile) onCloseMobile();
                }}
                style={{
                  fontSize: 11.5,
                  color: '#2563eb',
                  fontWeight: 600,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '2px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Ganti
              </button>
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: '#475569',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={`${schoolProfile.mataPelajaranUtama} — ${schoolProfile.namaSekolah || 'Sekolah belum diatur'}`}
            >
              {schoolProfile.mataPelajaranUtama}
            </div>
          </div>
        </div>

        {/* 3. Navigasi Scrollable */}
        <nav
          aria-label="Navigasi fitur"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '8px 10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {navSections.map((sec) => (
            <div key={sec.title}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#64748b',
                  padding: '2px 10px 4px',
                }}
              >
                {sec.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sec.items.map((item) => {
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`v21-sidebar-item ${isActive ? 'is-active' : ''}`}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            color: isActive ? '#2563eb' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </span>
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.label}
                        </span>
                      </span>

                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '1px 7px',
                            borderRadius: 6,
                            background: isActive ? '#dbeafe' : '#f1f5f9',
                            color: isActive ? '#1d4ed8' : '#475569',
                            flexShrink: 0,
                          }}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* 4. Footer Tenang: Lisensi, Kuota & Utilitas */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid #e2e8f0',
            padding: '10px 12px 12px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              padding: '9px 11px',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#172033' }}>
                {isUnlocked ? tierTitle : 'Mode Pratinjau'}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 5,
                  background: isUnlocked ? '#ecfdf5' : '#f1f5f9',
                  color: isUnlocked ? '#047857' : '#475569',
                  border: isUnlocked ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                }}
              >
                {isUnlocked ? 'Aktif' : 'Terbatas'}
              </span>
            </div>

            <div
              className="tabular-nums"
              style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}
            >
              {isUnlocked
                ? `Kuota AI: ${quota.remainingCredits} / ${quota.maxCredits}`
                : 'Ekspor Word & ZIP terkunci'}
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenLicenseModal();
                if (onCloseMobile) onCloseMobile();
              }}
              className="btn btn-sm btn-outline"
              style={{
                width: '100%',
                marginTop: 8,
                fontSize: 12,
                padding: '5px 10px',
                justifyContent: 'center',
              }}
            >
              <Key size={12} />
              <span>{isUnlocked ? 'Kelola lisensi' : 'Aktivasi lisensi'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenSchoolModal();
              if (onCloseMobile) onCloseMobile();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              border: 'none',
              borderRadius: 8,
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 500,
              color: '#475569',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <School size={14} style={{ color: '#64748b' }} />
              <span>Profil kop sekolah</span>
            </span>
            <ChevronRight size={13} style={{ color: '#94a3b8' }} />
          </button>

          {onOpenHelpModal && (
            <button
              type="button"
              onClick={() => {
                onOpenHelpModal();
                if (onCloseMobile) onCloseMobile();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                border: 'none',
                borderRadius: 8,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 500,
                color: '#475569',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <HelpCircle size={14} style={{ color: '#64748b' }} />
                <span>Pusat bantuan</span>
              </span>
              <ChevronRight size={13} style={{ color: '#94a3b8' }} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
