import React from 'react';
import {
  Menu,
  School,
  Key,
  HelpCircle,
  HardDrive,
  Cloud,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';

export type WorkspaceStorageStatus = 'local' | 'syncing' | 'synced' | 'sync_error';

interface TopHeaderProps {
  pageSection?: string;
  pageTitle: string;
  pageSubtitle?: string;
  schoolProfile: SchoolProfile;
  onOpenSchoolModal: () => void;
  onOpenLicenseModal?: () => void;
  onOpenHelpModal?: () => void;
  isPro?: boolean;
  storageStatus?: WorkspaceStorageStatus;
  onToggleMobileSidebar: () => void;
  mobileMenuButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const STORAGE_STATUS_META: Record<
  WorkspaceStorageStatus,
  {
    label: string;
    title: string;
    dotColor: string;
    textColor: string;
    icon: 'local' | 'syncing' | 'synced' | 'sync_error';
  }
> = {
  local: {
    label: 'Tersimpan lokal',
    title: 'Perubahan tersimpan di penyimpanan peramban perangkat ini',
    dotColor: '#64748b',
    textColor: '#475569',
    icon: 'local',
  },
  syncing: {
    label: 'Menyinkronkan...',
    title: 'Menyimpan perubahan ke cadangan cloud lisensi Anda',
    dotColor: '#2563eb',
    textColor: '#1d4ed8',
    icon: 'syncing',
  },
  synced: {
    label: 'Lokal & cloud',
    title: 'Data tersimpan di perangkat ini dan tersinkron ke cloud lisensi aktif',
    dotColor: '#059669',
    textColor: '#047857',
    icon: 'synced',
  },
  sync_error: {
    label: 'Hanya lokal',
    title: 'Sinkronisasi cloud gagal saat ini; data tetap tersimpan di peramban perangkat ini',
    dotColor: '#d97706',
    textColor: '#b45309',
    icon: 'sync_error',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  pageSection,
  pageTitle,
  pageSubtitle,
  schoolProfile,
  onOpenSchoolModal,
  onOpenLicenseModal,
  onOpenHelpModal,
  isPro,
  storageStatus = 'local',
  onToggleMobileSidebar,
  mobileMenuButtonRef,
}) => {
  const statusInfo = STORAGE_STATUS_META[storageStatus] || STORAGE_STATUS_META.local;

  return (
    <header
      className="app-top-header no-print"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '11px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        className="app-top-header-left"
        style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}
      >
        <button
          ref={mobileMenuButtonRef}
          type="button"
          onClick={onToggleMobileSidebar}
          className="mobile-sidebar-toggle"
          aria-label="Buka menu navigasi"
          title="Buka menu navigasi"
        >
          <Menu size={19} />
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {pageSection && (
              <>
                <span
                  className="app-top-header-breadcrumb"
                  style={{
                    fontSize: 12.5,
                    color: '#64748b',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pageSection}
                </span>
                <span
                  className="app-top-header-breadcrumb"
                  style={{ fontSize: 12.5, color: '#cbd5e1' }}
                  aria-hidden="true"
                >
                  /
                </span>
              </>
            )}
            <h1
              className="app-top-header-title"
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: '#172033',
                letterSpacing: '-0.015em',
                lineHeight: 1.3,
              }}
            >
              {pageTitle}
            </h1>
          </div>
          {pageSubtitle && (
            <p
              className="app-top-header-subtitle"
              style={{
                fontSize: 12.5,
                color: '#64748b',
                marginTop: 1,
                fontWeight: 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      <div
        className="app-top-header-right"
        style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
      >
        {/* Indikator penyimpanan sesuai kondisi nyata perangkat/cloud */}
        <div
          className="header-pill-autosave"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: 12,
            fontWeight: 500,
            color: statusInfo.textColor,
          }}
          title={statusInfo.title}
        >
          {statusInfo.icon === 'syncing' ? (
            <RefreshCw size={13} className="animate-spin" style={{ color: statusInfo.dotColor }} />
          ) : statusInfo.icon === 'synced' ? (
            <Cloud size={13} style={{ color: statusInfo.dotColor }} />
          ) : statusInfo.icon === 'sync_error' ? (
            <AlertTriangle size={13} style={{ color: statusInfo.dotColor }} />
          ) : (
            <HardDrive size={13} style={{ color: statusInfo.dotColor }} />
          )}
          <span className="header-pill-autosave-text">{statusInfo.label}</span>
        </div>

        {/* Profil sekolah (aksi sekunder) */}
        <button
          type="button"
          onClick={onOpenSchoolModal}
          className="header-pill-btn header-pill-school"
          title="Pengaturan profil & kop surat sekolah"
          aria-label="Profil sekolah"
        >
          <School size={14} style={{ color: '#475569', flexShrink: 0 }} />
          <span className="header-pill-school-text">
            {schoolProfile.namaSekolah || 'Profil sekolah'}
          </span>
        </button>

        {/* Status Lisensi (aksi sekunder) */}
        {onOpenLicenseModal && (
          <button
            type="button"
            onClick={onOpenLicenseModal}
            className="header-pill-btn header-pill-license"
            style={{
              borderColor: isPro ? '#a7f3d0' : '#e2e8f0',
              background: isPro ? '#ecfdf5' : '#ffffff',
              color: isPro ? '#047857' : '#334155',
            }}
            title={isPro ? 'Kelola lisensi aktif' : 'Aktivasi kode lisensi'}
            aria-label={isPro ? 'Lisensi aktif' : 'Lisensi'}
          >
            <Key size={14} style={{ color: isPro ? '#059669' : '#475569', flexShrink: 0 }} />
            <span className="header-pill-license-text">{isPro ? 'Lisensi aktif' : 'Lisensi'}</span>
          </button>
        )}

        {/* Bantuan */}
        {onOpenHelpModal && (
          <button
            type="button"
            onClick={onOpenHelpModal}
            className="header-pill-btn header-pill-help"
            title="Pusat bantuan & lapor kendala"
            aria-label="Bantuan"
          >
            <HelpCircle size={14} style={{ color: '#475569', flexShrink: 0 }} />
            <span className="header-pill-help-text">Bantuan</span>
          </button>
        )}
      </div>
    </header>
  );
};
