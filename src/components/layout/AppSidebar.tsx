import React from 'react';
import { motion } from 'framer-motion';
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
  RefreshCw,
  Key,
  HeartHandshake,
  Crown,
  UserCheck,
  X,
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
  badge?: string;
  count?: number;
  highlight?: boolean;
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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navSections: NavSection[] = [
    {
      title: 'PERANGKAT SEMESTER',
      items: [
        {
          id: 'tp_list',
          label: 'Peta TP & Modul Ajar',
          icon: <BookOpen size={17} />,
          badge: 'Inti',
        },
        {
          id: 'atp',
          label: 'Alur Tujuan (ATP)',
          icon: <Table2 size={17} />,
        },
        {
          id: 'prota',
          label: 'Program Tahunan (Prota)',
          icon: <Calendar size={17} />,
        },
        {
          id: 'promes',
          label: 'Program Semester (Promes)',
          icon: <FileSpreadsheet size={17} />,
        },
        {
          id: 'p5_project',
          label: 'Modul Projek P5',
          icon: <HeartHandshake size={17} />,
          badge: 'Kokurikuler',
        },
      ],
    },
    {
      title: 'KELAS HARIAN & RAPOR',
      items: [
        {
          id: 'presensi',
          label: 'Presensi Siswa',
          icon: <Users size={17} />,
          badge: '16 Pertemuan',
        },
        {
          id: 'jurnal',
          label: 'Jurnal Mengajar Guru',
          icon: <FileText size={17} />,
        },
        {
          id: 'nilai',
          label: 'Buku Nilai Asesmen',
          icon: <Award size={17} />,
        },
        {
          id: 'rapor',
          label: 'Auto-Deskripsi e-Rapor',
          icon: <Sparkles size={17} />,
          badge: 'Otomatis',
        },
      ],
    },
    {
      title: 'SUPERVISI & EKSPOR',
      items: [
        {
          id: 'supervisi',
          label: 'Paket Siap Supervisi',
          icon: <ShieldCheck size={17} />,
          highlight: true,
          badge: '1-Klik Master',
        },
      ],
    },
    {
      title: 'EVALUASI & ARSIP',
      items: [
        {
          id: 'ujian_semester',
          label: 'Naskah Ujian STS & SAS',
          icon: <Award size={17} />,
          badge: 'Resmi',
          highlight: true,
        },
        {
          id: 'bank',
          label: 'Bank Soal & Arsip Guru',
          icon: <FolderOpen size={17} />,
          count: bankCount,
        },
        {
          id: 'generator',
          label: 'Buat Soal Evaluasi AI',
          icon: <PlusCircle size={17} />,
        },
        {
          id: 'rangkuman_gen',
          label: 'Buat Rangkuman AI',
          icon: <BookOpen size={17} />,
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

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="mobile-sidebar-backdrop no-print"
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 998,
          }}
        />
      )}

      <aside
        className={`app-sidebar no-print ${isMobileOpen ? 'is-mobile-open' : ''}`}
        style={{
          width: 288,
          background: '#ffffff',
          borderRight: '1px solid rgba(226, 232, 240, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 999,
          boxShadow: '1px 0 12px rgba(15, 23, 42, 0.03)',
        }}
      >
        {/* 1. Header Brand V21 */}
        <div
          style={{
            padding: '16px 18px 14px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={38} />
            <div>
              <div
                style={{
                  fontSize: 16.5,
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Ases<span style={{ color: '#2563eb' }}>Merdeka</span>
                {isUnlocked && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background:
                        quota.tier === 'pro' || quota.tier === 'sekolah_pro'
                          ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                          : 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: 4,
                      letterSpacing: '0.4px',
                    }}
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                Administrasi Guru Semester
              </div>
            </div>
          </div>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="mobile-sidebar-close"
              aria-label="Tutup menu navigasi"
              title="Tutup menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 2. Profil Guru & Kelas Aktif Switcher (V21 Style Card) */}
        <div style={{ padding: '12px 14px 8px' }}>
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            onClick={onOpenClassModal}
            className="v21-bento-card"
            style={{
              padding: '11px 13px',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
              border: '1px solid #bfdbfe',
            }}
            title="Klik untuk mengganti jenjang, kelas, atau mata pelajaran"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                  }}
                >
                  <UserCheck size={12} />
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#1d4ed8',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {schoolProfile.namaGuru ? schoolProfile.namaGuru.split(',')[0] : 'Guru Pengampu'}
                </span>
              </div>

              <span
                style={{
                  fontSize: 11,
                  color: '#1d4ed8',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  background: '#ffffff',
                  border: '1px solid #93c5fd',
                  padding: '2px 7px',
                  borderRadius: 6,
                  boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                }}
              >
                <RefreshCw size={10} /> Ganti
              </span>
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Kelas {schoolProfile.rombelAktif} • {schoolProfile.mataPelajaranUtama}
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: '#64748b',
                marginTop: 2,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {schoolProfile.namaSekolah || 'Sekolah Belum Diatur'} • Sem {schoolProfile.semester.slice(0, 1)}
            </div>
          </motion.div>
        </div>

        {/* 3. Daftar Navigasi Berkelompok (V21 Clean Capsule List) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {navSections.map((sec) => (
            <div key={sec.title}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#64748b',
                  padding: '3px 10px 5px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {sec.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sec.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const isSupervisiHighlight = item.highlight;

                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => handleItemClick(item.id)}
                      className={`v21-sidebar-item ${isActive ? (isSupervisiHighlight ? 'is-supervisi-active' : 'is-active') : ''}`}
                      style={{
                        background: isActive
                          ? isSupervisiHighlight
                            ? '#7c3aed'
                            : '#2563eb'
                          : isSupervisiHighlight
                          ? 'rgba(124, 58, 237, 0.06)'
                          : 'transparent',
                        color: isActive
                          ? '#ffffff'
                          : isSupervisiHighlight
                          ? '#6d28d9'
                          : '#1e293b',
                        fontWeight: isActive || isSupervisiHighlight ? 800 : 600,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            color: isActive
                              ? '#ffffff'
                              : isSupervisiHighlight
                              ? '#7c3aed'
                              : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 6,
                              background: isActive
                                ? 'rgba(255,255,255,0.22)'
                                : isSupervisiHighlight
                                ? 'rgba(124, 58, 237, 0.12)'
                                : '#e2e8f0',
                              color: isActive
                                ? '#ffffff'
                                : isSupervisiHighlight
                                ? '#6d28d9'
                                : '#334155',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}

                        {item.count !== undefined && item.count > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '1px 7px',
                              borderRadius: 99,
                              background: isActive ? '#ffffff' : '#e2e8f0',
                              color: isActive ? '#1d4ed8' : '#1e293b',
                            }}
                          >
                            {item.count}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 4. Footer Sidebar: V21 Unlock Pro Glass Card & Profil Kop Sekolah */}
        <div
          style={{
            borderTop: '1px solid #f1f5f9',
            padding: '12px 12px 14px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* V21 Unlock Pro Glass Card */}
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            onClick={onOpenLicenseModal}
            className="v21-glass-pro-card"
            style={{
              padding: '12px 14px',
              cursor: 'pointer',
            }}
            title="Kelola status aktivasi lisensi resmi Mayar"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Crown size={15} color={isUnlocked ? '#fbbf24' : '#a5b4fc'} />
                <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.02em' }}>
                  {isUnlocked ? `LISENSI ${badgeLabel}` : 'ASESMERDEKA'}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: isUnlocked ? '#059669' : 'rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
                }}
              >
                {isUnlocked ? 'AKTIF' : 'UJI COBA'}
              </span>
            </div>

            <p style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4, margin: '2px 0 8px' }}>
              {isUnlocked
                ? `${tierTitle} — Akses penuh dokumen & otomatisasi tak terbatas.`
                : `Sisa kuota: ${quota.remainingCredits} dari ${quota.maxCredits} dokumen.`}
            </p>

            <button
              type="button"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                border: 'none',
                background: isUnlocked
                  ? 'rgba(255, 255, 255, 0.18)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: isUnlocked ? 'none' : '0 2px 8px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Key size={13} />
              {isUnlocked ? 'Kelola Lisensi & Perangkat' : 'Aktivasi Lisensi Resmi'}
            </button>
          </motion.div>

          {/* Profil Kop Sekolah Link */}
          <button
            type="button"
            onClick={onOpenSchoolModal}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              border: '1px solid #f1f5f9',
              borderRadius: 8,
              background: '#f8fafc',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              color: '#334155',
              transition: 'background 0.15s ease',
            }}
            title="Ubah Kop & Data Instansi Sekolah"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <School size={14} color="#2563eb" />
              <span>Profil Kop Surat Sekolah</span>
            </div>
            <ChevronRight size={13} color="#94a3b8" />
          </button>
        </div>
      </aside>
    </>
  );
};
