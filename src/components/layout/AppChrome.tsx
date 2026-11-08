import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft, Crown, BookOpen, Users, Sparkles, ShieldCheck, Menu } from 'lucide-react';
import type { SidebarTabId } from './AppSidebar';

export const AppErrorBanner: React.FC<{
  message: string | null;
  onDismiss: () => void;
}> = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div className="no-print" style={{ marginBottom: 18 }}>
      <div
        className="v21-bento-card"
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <AlertCircle size={18} color="#dc2626" />
        <div style={{ flex: 1 }}>{message}</div>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#b91c1c',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export const BackToHubButton: React.FC<{
  visible: boolean;
  onBack: () => void;
}> = ({ visible, onBack }) => {
  if (!visible) return null;
  return (
    <div className="no-print" style={{ marginBottom: 18 }}>
      <motion.button
        type="button"
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onBack}
        className="btn btn-sm btn-outline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: '#ffffff',
          borderColor: '#bfdbfe',
          color: '#1d4ed8',
          fontWeight: 800,
          fontSize: 13,
          padding: '8px 16px',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
        }}
      >
        <ArrowLeft size={16} /> Kembali ke Peta TP & Perangkat Semester
      </motion.button>
    </div>
  );
};

export interface AppFooterProps {
  onOpenClassModal: () => void;
  onOpenSchoolModal: () => void;
  onOpenLicenseModal: () => void;
  onOpenHelpModal?: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onOpenClassModal,
  onOpenSchoolModal,
  onOpenLicenseModal,
  onOpenHelpModal,
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
      <div>
        © 2026 <strong>AsesMerdeka Studio</strong> — Platform Administrasi & Pembelajaran Guru Terintegrasi
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

export const FloatingProPromoBar: React.FC<{
  visible: boolean;
  onOpenLicenseModal: () => void;
  onDismiss: () => void;
}> = ({ visible, onOpenLicenseModal, onDismiss }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className="no-print v21-glass-pro-card floating-pro-promo-bar"
          style={{
            position: 'fixed',
            bottom: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 720,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            zIndex: 9999,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <Crown size={20} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: '#ffffff' }}>
                Buka Seluruh Fitur Otomatisasi Guru Tanpa Batas
              </div>
              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 1 }}>
                Bebas watermark • Unduh ZIP 1-Klik • Lisensi Resmi Mayar Sekali Beli Aktif Selamanya
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenLicenseModal}
              style={{
                padding: '8px 16px',
                fontSize: 12.5,
                fontWeight: 800,
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              }}
            >
              Aktivasi Lisensi PRO →
            </motion.button>
            <button
              type="button"
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 18,
                padding: '0 4px',
              }}
              title="Tutup bilah"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const AppToastBanner: React.FC<{ message: string | null }> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="no-print app-toast-banner"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.35)',
            zIndex: 99999,
            fontSize: 13,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: 440,
          }}
        >
          <span style={{ fontSize: 16 }}>✨</span>
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileBottomNav: React.FC<{
  activeTab: string;
  onSelectTab: (tab: SidebarTabId) => void;
  onOpenMobileMenu: () => void;
}> = ({ activeTab, onSelectTab, onOpenMobileMenu }) => {
  const isPersiapan = ['tp_list', 'atp', 'prota', 'promes', 'modul_ajar', 'lkpd'].includes(activeTab);
  const isHarian = ['presensi', 'jurnal', 'nilai', 'rapor'].includes(activeTab);
  const isSoalAi = ['generator', 'rangkuman_gen', 'worksheet', 'kisi_kisi', 'teacher_guide', 'rangkuman_view', 'bank'].includes(activeTab);
  const isSupervisi = activeTab === 'supervisi' || activeTab === 'ujian_semester' || activeTab === 'p5_project';

  return (
    <nav className="mobile-bottom-nav no-print" aria-label="Navigasi Cepat HP">
      <button
        type="button"
        onClick={() => onSelectTab('tp_list')}
        className={`mobile-bottom-nav-item ${isPersiapan ? 'is-active' : ''}`}
      >
        <BookOpen size={19} />
        <span>Materi & TP</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('presensi')}
        className={`mobile-bottom-nav-item ${isHarian ? 'is-active' : ''}`}
      >
        <Users size={19} />
        <span>Kelas Harian</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('generator')}
        className={`mobile-bottom-nav-item ${isSoalAi ? 'is-active' : ''}`}
      >
        <Sparkles size={19} />
        <span>Soal AI</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('supervisi')}
        className={`mobile-bottom-nav-item ${isSupervisi ? 'is-active' : ''}`}
      >
        <ShieldCheck size={19} />
        <span>Supervisi</span>
      </button>

      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="mobile-bottom-nav-item"
      >
        <Menu size={19} />
        <span>Menu</span>
      </button>
    </nav>
  );
};
