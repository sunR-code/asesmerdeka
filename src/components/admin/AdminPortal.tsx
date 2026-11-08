import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  ArrowLeft,
  Key,
  MessageSquare,
  Settings,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Trash2,
  Phone,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { AdminPortalTab } from '../../types/admin';
import type {
  FeedbackReport,
  FeedbackStatus,
} from '../../types/feedback';
import { FEEDBACK_CATEGORY_META } from '../../types/feedback';
import {
  getAdminSessionPin,
  saveAdminSessionPin,
  clearAdminSessionPin,
  verifyAdminSession,
} from '../../utils/adminService';
import {
  fetchFeedbackReports,
  updateFeedbackReportStatus,
  deleteFeedbackReport,
  formatReportsForAiMarkdown,
} from '../../utils/feedbackService';
import { AdminLicenseTab } from './AdminLicenseTab';
import { AdminSettingsTab } from './AdminSettingsTab';

export interface AdminPortalProps {
  onBack: () => void;
}

function formatReportDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString || '-';
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString || '-';
  }
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBack }) => {
  // Session & Authentication State
  const [adminPin, setAdminPin] = useState<string>(() => getAdminSessionPin());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);

  // Lock Screen Input State
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Active Tab State
  const [activeTab, setActiveTab] = useState<AdminPortalTab>('licenses');

  // Feedback Reports Inbox State
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'semua' | 'perlu_ditangani' | 'selesai'>('semua');
  const [copiedAi, setCopiedAi] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ text: string; isError: boolean } | null>(null);

  // Auto-verify stored session on mount
  useEffect(() => {
    let isMounted = true;
    const checkExistingSession = async () => {
      const stored = getAdminSessionPin();
      if (!stored) {
        if (isMounted) setIsVerifyingSession(false);
        return;
      }
      try {
        const res = await verifyAdminSession(stored);
        if (isMounted) {
          if (res.ok) {
            setIsAuthenticated(true);
            setAdminPin(stored);
          } else {
            clearAdminSessionPin();
            setIsAuthenticated(false);
            setAdminPin('');
          }
          setIsVerifyingSession(false);
        }
      } catch {
        if (isMounted) {
          setIsVerifyingSession(false);
        }
      }
    };
    checkExistingSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Feedback Reports when entering feedback tab
  const loadReports = useCallback(async (pin: string) => {
    if (!pin) return;
    setIsLoadingReports(true);
    setFeedbackNotice(null);
    try {
      const res = await fetchFeedbackReports(pin);
      if (res.ok) {
        setReports(res.reports || []);
      } else {
        setFeedbackNotice({ text: res.message, isError: true });
        setReports(res.reports || []);
      }
    } catch (err) {
      setFeedbackNotice({
        text: err instanceof Error ? err.message : 'Gagal memuat laporan kendala.',
        isError: true,
      });
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'feedback' && adminPin) {
      loadReports(adminPin);
    }
  }, [isAuthenticated, activeTab, adminPin, loadReports]);

  // Handle Login on Lock Screen
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinInput.trim();
    if (!clean) {
      setPinError('PIN Admin wajib diisi.');
      return;
    }

    setIsLoggingIn(true);
    setPinError(null);

    try {
      const res = await verifyAdminSession(clean);
      if (res.ok) {
        saveAdminSessionPin(clean);
        setAdminPin(clean);
        setIsAuthenticated(true);
        setPinInput('');
      } else {
        setPinError(res.message || 'PIN Admin tidak sesuai atau tidak memiliki hak akses.');
      }
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Gagal memverifikasi PIN Admin.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick Lock Portal
  const handleLockPortal = () => {
    clearAdminSessionPin();
    setIsAuthenticated(false);
    setAdminPin('');
    setPinInput('');
    setPinError(null);
  };

  // Feedback Actions
  const handleUpdateStatus = async (reportId: string, newStatus: FeedbackStatus) => {
    const res = await updateFeedbackReportStatus(adminPin, reportId, newStatus);
    if (res.ok) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
      setFeedbackNotice({ text: 'Status laporan berhasil diperbarui.', isError: false });
      setTimeout(() => setFeedbackNotice(null), 2500);
    } else {
      setFeedbackNotice({ text: res.message, isError: true });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Hapus laporan kendala ini secara permanen dari server?')) {
      return;
    }
    const res = await deleteFeedbackReport(adminPin, reportId);
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setFeedbackNotice({ text: 'Laporan kendala berhasil dihapus.', isError: false });
      setTimeout(() => setFeedbackNotice(null), 2500);
    } else {
      setFeedbackNotice({ text: res.message, isError: true });
    }
  };

  const handleCopyForAi = async () => {
    try {
      const markdown = formatReportsForAiMarkdown(reports);
      await navigator.clipboard.writeText(markdown);
      setCopiedAi(true);
      setTimeout(() => setCopiedAi(false), 3000);
    } catch {
      setFeedbackNotice({ text: 'Gagal menyalin rangkuman ke papan klip.', isError: true });
    }
  };

  const pendingFeedbackCount = reports.filter((r) => r.status === 'baru' || r.status === 'ditinjau').length;
  const doneFeedbackCount = reports.filter((r) => r.status === 'selesai').length;

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'perlu_ditangani') {
      return r.status === 'baru' || r.status === 'ditinjau';
    }
    if (statusFilter === 'selesai') {
      return r.status === 'selesai';
    }
    return true;
  });

  // 1. Initial Session Verifying Screen
  if (isVerifyingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <Loader2 size={32} className="animate-spin" color="#38bdf8" />
        <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
          Memverifikasi sesi aman...
        </div>
      </div>
    );
  }

  // 2. High-Security Dark/Navy Lock Screen (Unauthenticated)
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #0a0f1d 80%)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Top Navigation: Return to Teacher App */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn btn-outline"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              backdropFilter: 'blur(8px)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>
        </div>

        {/* Center Lock Screen Card */}
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            margin: '40px auto',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 24,
            padding: '36px 32px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(56, 189, 248, 0.12)',
            backdropFilter: 'blur(16px)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Shield Lock Icon with Glow */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(56, 189, 248, 0.2) 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)',
            }}
          >
            <Shield size={32} />
          </div>

          <div>
            <h2
              style={{
                fontSize: 21,
                fontWeight: 900,
                color: '#ffffff',
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Autentikasi Akses
            </h2>
            <p
              style={{
                fontSize: 12.5,
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Masukkan PIN otentikasi untuk membuka halaman.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
            <div>
              <label
                htmlFor="lock-admin-pin"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#cbd5e1',
                  marginBottom: 6,
                }}
              >
                PIN Keamanan
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="lock-admin-pin"
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError(null);
                  }}
                  placeholder="Masukkan PIN"
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: 12,
                    background: 'rgba(2, 6, 23, 0.8)',
                    border: pinError ? '1.5px solid #ef4444' : '1.5px solid rgba(255, 255, 255, 0.16)',
                    color: '#ffffff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {pinError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !pinInput.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px 18px',
                fontSize: 13.5,
                fontWeight: 800,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 18px rgba(37, 99, 235, 0.4)',
                cursor: isLoggingIn || !pinInput.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoggingIn || !pinInput.trim() ? 0.6 : 1,
              }}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>

          <div
            style={{
              paddingTop: 12,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 11,
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            🔒 Sistem terproteksi enkripsi aman.
          </div>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', fontSize: 11.5, color: '#475569' }}>
          Asesmen Merdeka Studio • Platform Asesmen Kurikulum Merdeka
        </div>
      </div>
    );
  }

  // 3. Full-Screen Dashboard Shell (Authenticated)
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-page)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '14px 24px',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: 'var(--text-main)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Portal Admin Asesmen Merdeka
                </h1>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  ADMIN MASTER
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '1px 0 0 0' }}>
                Pusat Pengelolaan Lisensi Khusus, Reset Kunci Perangkat & Layanan Guru
              </p>
            </div>
          </div>

          {/* Right Header Controls: Database Status, Lock Button & Return Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 'var(--radius-full)',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                fontSize: 11.5,
                fontWeight: 700,
                color: '#065f46',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                }}
              />
              <span>Cloud Redis: Siap</span>
            </div>

            {/* Quick Lock Button */}
            <button
              type="button"
              onClick={handleLockPortal}
              className="btn btn-outline btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                color: '#475569',
              }}
              title="Kunci sesi admin dan kembali ke layar PIN"
            >
              <Lock size={13} />
              <span>Kunci Portal</span>
            </button>

            {/* Return to Teacher Workspace Button */}
            <button
              type="button"
              onClick={onBack}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 800,
              }}
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Aplikasi Guru</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Tab Navigation */}
      <main
        style={{
          flex: 1,
          maxWidth: 1240,
          width: '100%',
          margin: '0 auto',
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '2px solid var(--border-subtle)',
            paddingBottom: 4,
            overflowX: 'auto',
          }}
        >
          {/* Tab 1: Licenses */}
          <button
            type="button"
            onClick={() => setActiveTab('licenses')}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              border: 'none',
              background: activeTab === 'licenses' ? '#ffffff' : 'transparent',
              color: activeTab === 'licenses' ? '#2563eb' : 'var(--text-secondary)',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: activeTab === 'licenses' ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -6,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Key size={16} />
            <span>Kelola Lisensi & Kunci Perangkat</span>
          </button>

          {/* Tab 2: Feedback */}
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              border: 'none',
              background: activeTab === 'feedback' ? '#ffffff' : 'transparent',
              color: activeTab === 'feedback' ? '#2563eb' : 'var(--text-secondary)',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: activeTab === 'feedback' ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -6,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <MessageSquare size={16} />
            <span>Kotak Masuk Guru</span>
            {pendingFeedbackCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: 99,
                  background: '#ef4444',
                  color: '#ffffff',
                }}
              >
                {pendingFeedbackCount}
              </span>
            )}
          </button>

          {/* Tab 3: Settings */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              border: 'none',
              background: activeTab === 'settings' ? '#ffffff' : 'transparent',
              color: activeTab === 'settings' ? '#2563eb' : 'var(--text-secondary)',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: activeTab === 'settings' ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -6,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Settings size={16} />
            <span>Pengaturan Pembayaran & Sistem</span>
          </button>
        </div>

        {/* Tab 1: Licenses Content */}
        {activeTab === 'licenses' && <AdminLicenseTab adminPin={adminPin} />}

        {/* Tab 2: Feedback Content */}
        {activeTab === 'feedback' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Feedback Controls Subheader */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '14px 18px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {/* Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setStatusFilter('semua')}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    borderRadius: 8,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: statusFilter === 'semua' ? '#0f172a' : '#f1f5f9',
                    color: statusFilter === 'semua' ? '#ffffff' : '#475569',
                  }}
                >
                  Semua ({reports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('perlu_ditangani')}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    borderRadius: 8,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: statusFilter === 'perlu_ditangani' ? '#d97706' : '#fef3c7',
                    color: statusFilter === 'perlu_ditangani' ? '#ffffff' : '#92400e',
                  }}
                >
                  Perlu Ditangani ({pendingFeedbackCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('selesai')}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    borderRadius: 8,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: statusFilter === 'selesai' ? '#059669' : '#d1fae5',
                    color: statusFilter === 'selesai' ? '#ffffff' : '#065f46',
                  }}
                >
                  Selesai ({doneFeedbackCount})
                </button>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => loadReports(adminPin)}
                disabled={isLoadingReports}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} className={isLoadingReports ? 'animate-spin' : ''} />
                <span>Segarkan Data</span>
              </button>
            </div>

            {/* AI Summary Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                border: '1.5px solid #bfdbfe',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ maxWidth: 540 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#1e3a8a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Sparkles size={16} color="#2563eb" />
                  <span>Rangkuman Laporan Siap Tempel ke AI</span>
                </div>
                <p style={{ fontSize: 12, color: '#3b82f6', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                  Salin seluruh daftar laporan kendala yang masuk ke format Markdown lengkap untuk dianalisis dan diperbaiki seketika oleh coding assistant.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyForAi}
                className={`btn ${copiedAi ? 'btn-success' : 'btn-primary'}`}
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  padding: '9px 18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {copiedAi ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedAi ? 'Rangkuman Tersalin!' : '📋 Salin Rangkuman untuk AI'}</span>
              </button>
            </div>

            {/* Feedback Notice Toast */}
            {feedbackNotice && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: feedbackNotice.isError ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${feedbackNotice.isError ? '#fecaca' : '#a7f3d0'}`,
                  color: feedbackNotice.isError ? '#b91c1c' : '#15803d',
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{feedbackNotice.text}</span>
              </div>
            )}

            {/* Reports List */}
            {isLoadingReports ? (
              <div
                style={{
                  padding: '48px 20px',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--text-muted)',
                }}
              >
                <Loader2 size={24} className="animate-spin" color="#2563eb" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Memuat laporan kendala dari guru...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div
                style={{
                  padding: '48px 20px',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                <MessageSquare size={32} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  Kotak Masuk Bersih
                </div>
                <p style={{ fontSize: 12, margin: '4px 0 0 0' }}>
                  Tidak ada laporan kendala dalam filter ini.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredReports.map((report) => {
                  const catMeta = FEEDBACK_CATEGORY_META[report.category] || {
                    label: report.category,
                    icon: '📌',
                    description: '',
                  };

                  return (
                    <div
                      key={report.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {/* Top Bar: Category, Time, Status Selector, Delete */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              fontSize: 11,
                              fontWeight: 800,
                              borderRadius: 6,
                              background: '#f1f5f9',
                              color: '#1e293b',
                              border: '1px solid #e2e8f0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>{catMeta.icon}</span>
                            <span>{catMeta.label}</span>
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {formatReportDate(report.createdAt)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Status Dropdown */}
                          <select
                            value={report.status}
                            onChange={(e) =>
                              handleUpdateStatus(report.id, e.target.value as FeedbackStatus)
                            }
                            aria-label="Ubah status laporan"
                            className="form-select"
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background:
                                report.status === 'baru'
                                  ? '#fee2e2'
                                  : report.status === 'ditinjau'
                                  ? '#fef3c7'
                                  : '#d1fae5',
                              color:
                                report.status === 'baru'
                                  ? '#991b1b'
                                  : report.status === 'ditinjau'
                                  ? '#92400e'
                                  : '#065f46',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="baru">🔴 Baru</option>
                            <option value="ditinjau">🟡 Ditinjau</option>
                            <option value="selesai">🟢 Selesai</option>
                          </select>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(report.id)}
                            title="Hapus Laporan Kendala"
                            className="btn btn-outline btn-sm"
                            style={{
                              padding: '5px 8px',
                              color: '#dc2626',
                              borderColor: '#fecaca',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text-main)',
                          background: '#f8fafc',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #e2e8f0',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.55,
                        }}
                      >
                        {report.description}
                      </div>

                      {/* Contact Info */}
                      {report.contact && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Phone size={13} color="#059669" />
                          <span>Kontak Pengirim:</span>
                          <strong style={{ color: 'var(--text-main)' }}>{report.contact}</strong>
                        </div>
                      )}

                      {/* Context Metadata Badges */}
                      <div
                        style={{
                          paddingTop: 8,
                          borderTop: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                          fontSize: 11,
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: 4 }}>
                          Halaman: {report.context?.activeTab || '-'}
                        </span>
                        <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: 4 }}>
                          Kelas/Mapel: {[report.context?.kelas, report.context?.mapel].filter(Boolean).join(' • ') || '-'}
                        </span>
                        <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: 4, fontFamily: 'monospace' }}>
                          ID: {report.context?.deviceId || '-'}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            background: report.context?.isPro ? '#ecfdf5' : '#f1f5f9',
                            color: report.context?.isPro ? '#059669' : '#64748b',
                            fontWeight: 700,
                            borderRadius: 4,
                          }}
                        >
                          {report.context?.isPro ? '⭐ Guru PRO' : 'Pratinjau'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Settings Content */}
        {activeTab === 'settings' && <AdminSettingsTab />}
      </main>
    </div>
  );
};
