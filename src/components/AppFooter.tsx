import React from 'react';

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
      borderTop: '1px solid rgba(226, 232, 240, 0.8)',
      background: '#ffffff',
      padding: '16px 28px',
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
          © 2026 <strong>AsesMerdeka Studio</strong> — Platform Administrasi & Pembelajaran Guru Terintegrasi
        </span>
        {onOpenAdminPortal && (
          <button
            type="button"
            onClick={onOpenAdminPortal}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 8px',
              borderRadius: 6,
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#475569';
              e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Pengaturan Sistem"
          >
            🔒 Sistem
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 700 }} onClick={onOpenClassModal}>
          Ganti Kelas/Mapel
        </span>
        <span style={{ color: '#cbd5e1' }}>•</span>
        <span style={{ color: '#0d9488', cursor: 'pointer', fontWeight: 700 }} onClick={onOpenSchoolModal}>
          Kop Sekolah
        </span>
        <span style={{ color: '#cbd5e1' }}>•</span>
        <span style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 700 }} onClick={onOpenLicenseModal}>
          Lisensi PRO
        </span>
        {onOpenHelpModal && (
          <>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ color: '#0284c7', cursor: 'pointer', fontWeight: 700 }} onClick={onOpenHelpModal}>
              Bantuan & Lapor
            </span>
          </>
        )}
      </div>
    </div>
  </footer>
);

export default AppFooter;
