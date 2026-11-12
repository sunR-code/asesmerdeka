import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Key,
  BookOpen,
  Users,
  Sparkles,
  ShieldCheck,
  Menu,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { SidebarTabId } from './AppSidebar';

export const AppErrorBanner: React.FC<{
  message: string | null;
  onDismiss: () => void;
}> = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div className="no-print" style={{ marginBottom: 16 }}>
      <div
        role="alert"
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 10,
          color: '#b91c1c',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <AlertCircle size={17} style={{ color: '#dc2626', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>{message}</div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup pemberitahuan error"
          style={{
            background: 'none',
            border: 'none',
            color: '#b91c1c',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            padding: 4,
            borderRadius: 6,
          }}
        >
          <X size={16} />
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
    <div className="no-print" style={{ marginBottom: 14 }}>
      <button
        type="button"
        onClick={onBack}
        className="btn btn-sm btn-outline"
        style={{ fontSize: 13 }}
      >
        <ArrowLeft size={15} />
        <span>Kembali ke Peta TP</span>
      </button>
    </div>
  );
};

export { AppFooter } from '../AppFooter';
export type { AppFooterProps } from '../AppFooter';

export const FloatingProPromoBar: React.FC<{
  visible: boolean;
  onOpenLicenseModal: () => void;
  onDismiss: () => void;
}> = ({ visible, onOpenLicenseModal, onDismiss }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="no-print floating-pro-promo-bar"
          style={{
            position: 'fixed',
            bottom: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 660,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            boxShadow: '0 8px 24px -6px rgba(23, 32, 51, 0.14)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 900,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                flexShrink: 0,
              }}
            >
              <Key size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#172033' }}>
                Aktifkan lisensi untuk cetak & unduh dokumen
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Mode pratinjau membatasi unduhan Word dan arsip ZIP.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onOpenLicenseModal}
              className="btn btn-sm btn-primary"
            >
              Aktivasi lisensi
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Tutup bilah info lisensi"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                padding: 4,
                borderRadius: 6,
              }}
            >
              <X size={16} />
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
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="no-print app-toast-banner"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#172033',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: 10,
            boxShadow: '0 10px 24px -4px rgba(23, 32, 51, 0.25)',
            zIndex: 99999,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            border: '1px solid #334155',
            maxWidth: 420,
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#34d399', flexShrink: 0 }} />
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
    <nav className="mobile-bottom-nav no-print" aria-label="Navigasi cepat">
      <button
        type="button"
        onClick={() => onSelectTab('tp_list')}
        className={`mobile-bottom-nav-item ${isPersiapan ? 'is-active' : ''}`}
      >
        <BookOpen size={18} />
        <span>Materi & TP</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('presensi')}
        className={`mobile-bottom-nav-item ${isHarian ? 'is-active' : ''}`}
      >
        <Users size={18} />
        <span>Kelas Harian</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('generator')}
        className={`mobile-bottom-nav-item ${isSoalAi ? 'is-active' : ''}`}
      >
        <Sparkles size={18} />
        <span>Soal AI</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('supervisi')}
        className={`mobile-bottom-nav-item ${isSupervisi ? 'is-active' : ''}`}
      >
        <ShieldCheck size={18} />
        <span>Supervisi</span>
      </button>

      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="mobile-bottom-nav-item"
      >
        <Menu size={18} />
        <span>Menu</span>
      </button>
    </nav>
  );
};
