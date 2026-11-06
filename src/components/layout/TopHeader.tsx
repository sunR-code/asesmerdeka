import React from 'react';
import { motion } from 'framer-motion';
import { Menu, School, Sparkles, ShieldCheck } from 'lucide-react';
import type { SchoolProfile } from '../../utils/schoolProfileStorage';

interface TopHeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
  schoolProfile: SchoolProfile;
  onOpenSchoolModal: () => void;
  onOpenLicenseModal?: () => void;
  isPro?: boolean;
  onToggleMobileSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  pageTitle,
  pageSubtitle,
  schoolProfile,
  onOpenSchoolModal,
  onOpenLicenseModal,
  isPro,
  onToggleMobileSidebar,
}) => {
  return (
    <header
      className="no-print"
      style={{
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          style={{
            display: 'none',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '6px 8px',
            cursor: 'pointer',
          }}
          className="mobile-sidebar-toggle"
          title="Buka menu navigasi"
        >
          <Menu size={18} />
        </button>

        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.3px',
              lineHeight: 1.25,
            }}
          >
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 2, fontWeight: 500 }}>
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Status Penyimpanan Otomatis Real-time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 9999,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 800,
            color: '#065f46',
            boxShadow: '0 1px 3px rgba(5, 150, 105, 0.08)',
          }}
          title="Semua perubahan data langsung tersimpan aman secara otomatis di peramban komputer Anda"
        >
          <span
            className="animate-pulse-subtle"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
            }}
          />
          <ShieldCheck size={14} color="#059669" />
          <span>Data Tersimpan Aman</span>
        </div>

        {/* Sekolah Pill Button */}
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenSchoolModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 9999,
            padding: '5px 13px',
            fontSize: 12,
            fontWeight: 800,
            color: '#1e293b',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
          title="Klik untuk mengubah Kop & Identitas Sekolah"
        >
          <School size={14} color="#2563eb" />
          <span>{schoolProfile.namaSekolah || 'Set Kop Sekolah'}</span>
        </motion.button>

        {/* Lisensi PRO Status Pill */}
        {onOpenLicenseModal && (
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenLicenseModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isPro
                ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                : 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
              border: `1px solid ${isPro ? '#a7f3d0' : '#bfdbfe'}`,
              borderRadius: 9999,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 800,
              color: isPro ? '#065f46' : '#1d4ed8',
              cursor: 'pointer',
              boxShadow: isPro
                ? '0 2px 8px rgba(16, 185, 129, 0.16)'
                : '0 2px 8px rgba(37, 99, 235, 0.12)',
            }}
            title={isPro ? 'Lisensi Guru PRO Aktif Permanen' : 'Upgrade Guru PRO Sekali Beli via Mayar'}
          >
            <Sparkles size={14} color={isPro ? '#059669' : '#2563eb'} />
            <span>{isPro ? 'PRO Lifetime' : 'PRO Sekali Beli'}</span>
          </motion.button>
        )}
      </div>
    </header>
  );
};
