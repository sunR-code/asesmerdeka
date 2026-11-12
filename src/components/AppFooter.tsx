import React from 'react';
import { Lock } from 'lucide-react';

export interface AppFooterProps {
  onOpenClassModal: () => void;
  onOpenSchoolModal: () => void;
  onOpenLicenseModal: () => void;
  onOpenHelpModal?: () => void;
  onOpenAdminPortal?: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onOpenClassModal,
  onOpenSchoolModal,
  onOpenLicenseModal,
  onOpenHelpModal,
  onOpenAdminPortal,
}) => (
  <footer
    className="no-print"
    style={{
      borderTop: '1px solid #e2e8f0',
      background: '#ffffff',
      padding: '14px 28px',
      fontSize: 12,
      color: '#64748b',
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>
          © 2026 <strong style={{ color: '#172033', fontWeight: 600 }}>AsesMerdeka</strong> · Workspace Administrasi Guru
        </span>
        {onOpenAdminPortal && (
          <button
            type="button"
            onClick={onOpenAdminPortal}
            className="ws-footer-link"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              padding: '2px 8px',
              borderRadius: 6,
              color: '#94a3b8',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Pengaturan Sistem"
          >
            <Lock size={11} />
            <span>Sistem</span>
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onOpenClassModal}
          className="ws-footer-link"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#475569',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Ganti kelas/mapel
        </button>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <button
          type="button"
          onClick={onOpenSchoolModal}
          className="ws-footer-link"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#475569',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Profil sekolah
        </button>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <button
          type="button"
          onClick={onOpenLicenseModal}
          className="ws-footer-link"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#475569',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Lisensi
        </button>
        {onOpenHelpModal && (
          <>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <button
              type="button"
              onClick={onOpenHelpModal}
              className="ws-footer-link"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#475569',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Bantuan
            </button>
          </>
        )}
      </div>
    </div>
  </footer>
);

export default AppFooter;
