import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  X,
  Send,
  Lock,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Sparkles,
  Phone,
  MessageSquare,
  ShieldAlert,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type {
  FeedbackCategory,
  FeedbackStatus,
  FeedbackReport,
} from '../types/feedback';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_META,
} from '../types/feedback';
import {
  submitFeedbackReport,
  fetchFeedbackReports,
  updateFeedbackReportStatus,
  deleteFeedbackReport,
  formatReportsForAiMarkdown,
} from '../utils/feedbackService';
import { verifyAdminKeygenPin } from '../utils/licenseManager';
import type { SchoolProfile } from '../utils/schoolProfileStorage';

export interface HelpFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTabName?: string;
  activeTabId?: string;
  schoolProfile: SchoolProfile;
  deviceId: string;
  isPro: boolean;
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

export const HelpFeedbackModal: React.FC<HelpFeedbackModalProps> = ({
  isOpen,
  onClose,
  activeTabName,
  activeTabId,
  schoolProfile,
  deviceId,
  isPro,
}) => {
  // Modal Navigation
  const [activeTab, setActiveTab] = useState<'kirim' | 'admin'>('kirim');

  // Tab 1: Form Sisi Guru
  const [category, setCategory] = useState<FeedbackCategory>('fitur_error');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    ok: boolean;
    message: string;
    report?: FeedbackReport;
  } | null>(null);

  // Tab 2: Admin Inbox
  const [adminPin, setAdminPin] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'semua' | 'perlu_ditangani' | 'selesai'>('semua');
  const [copiedAi, setCopiedAi] = useState(false);
  const [adminNotice, setAdminNotice] = useState<{ text: string; isError: boolean } | null>(null);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Context strings
  const activePage = activeTabName || activeTabId || 'Dashboard Utama';
  const kelasLabel = [schoolProfile.kelasUtama, schoolProfile.rombelAktif].filter(Boolean).join(' ');
  const kelasMapel = `Kelas ${kelasLabel || '-'} • ${schoolProfile.mataPelajaranUtama || '-'}`;

  if (!isOpen) return null;

  // Submit Feedback Handler (Guru)
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setSubmitResult({
        ok: false,
        message: 'Deskripsi kendala wajib diisi sebelum mengirim laporan.',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await submitFeedbackReport({
        category,
        description: description.trim(),
        contact: contact.trim(),
        context: {
          activeTab: activePage,
          jenjang: schoolProfile.jenjang || undefined,
          kelas: kelasLabel || undefined,
          mapel: schoolProfile.mataPelajaranUtama || undefined,
          deviceId: deviceId || undefined,
          isPro: Boolean(isPro),
        },
      });

      setSubmitResult(res);
      if (res.ok) {
        setDescription('');
        setContact('');
      }
    } catch (err) {
      setSubmitResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Terjadi kegagalan saat mengirim laporan kendala.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load Admin Reports
  const loadAdminReports = async (pin: string) => {
    setIsLoadingReports(true);
    setAdminNotice(null);
    try {
      const res = await fetchFeedbackReports(pin);
      if (res.ok) {
        setReports(res.reports || []);
      } else {
        setAdminNotice({ text: res.message, isError: true });
        setReports(res.reports || []);
      }
    } catch (err) {
      setAdminNotice({
        text: err instanceof Error ? err.message : 'Gagal memuat laporan kendala.',
        isError: true,
      });
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Unlock Admin Inbox Handler
  const handleUnlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = adminPin.trim();
    if (!cleanPin) {
      setPinError('PIN Admin wajib diisi.');
      return;
    }

    if (verifyAdminKeygenPin(cleanPin)) {
      setPinError(null);
      setIsAdminUnlocked(true);
      await loadAdminReports(cleanPin);
    } else {
      setPinError('PIN Admin tidak sesuai atau tidak memiliki hak akses.');
    }
  };

  // Update Status Handler
  const handleUpdateStatus = async (reportId: string, newStatus: FeedbackStatus) => {
    const res = await updateFeedbackReportStatus(adminPin, reportId, newStatus);
    if (res.ok) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
      setAdminNotice({ text: 'Status laporan berhasil diperbarui.', isError: false });
      setTimeout(() => setAdminNotice(null), 2500);
    } else {
      setAdminNotice({ text: res.message, isError: true });
    }
  };

  // Delete Report Handler
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus laporan ini secara permanen?')) {
      return;
    }
    const res = await deleteFeedbackReport(adminPin, reportId);
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setAdminNotice({ text: 'Laporan berhasil dihapus.', isError: false });
      setTimeout(() => setAdminNotice(null), 2500);
    } else {
      setAdminNotice({ text: res.message, isError: true });
    }
  };

  // Copy For AI Handler
  const handleCopyForAi = async () => {
    try {
      const markdown = formatReportsForAiMarkdown(reports);
      await navigator.clipboard.writeText(markdown);
      setCopiedAi(true);
      setTimeout(() => setCopiedAi(false), 3000);
    } catch {
      setAdminNotice({ text: 'Gagal menyalin ke papan klip.', isError: true });
    }
  };

  // Filtered reports calculation
  const pendingCount = reports.filter((r) => r.status === 'baru' || r.status === 'ditinjau').length;
  const doneCount = reports.filter((r) => r.status === 'selesai').length;

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'perlu_ditangani') {
      return r.status === 'baru' || r.status === 'ditinjau';
    }
    if (statusFilter === 'selesai') {
      return r.status === 'selesai';
    }
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pusat Bantuan & Lapor Kendala"
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 680,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '22px 24px',
          borderRadius: 18,
          background: '#ffffff',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.22)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #bfdbfe',
              }}
            >
              <HelpCircle size={22} color="#2563eb" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Pusat Bantuan & Lapor Kendala
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
                Sampaikan kendala, masukan data dummy, atau usulan fitur langsung kepada pengembang.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{
              padding: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Tutup jendela bantuan"
            aria-label="Tutup jendela bantuan"
          >
            <X size={16} />
          </button>
        </div>

        {/* Top Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 18,
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('kirim')}
            className={`btn btn-sm ${activeTab === 'kirim' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
            }}
          >
            <MessageSquare size={14} />
            Kirim Laporan / Bantuan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`btn btn-sm ${activeTab === 'admin' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
            }}
          >
            <ShieldAlert size={14} />
            Kotak Masuk Admin
            {isAdminUnlocked && reports.length > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  padding: '1px 7px',
                  fontSize: 10,
                  borderRadius: 99,
                  background: activeTab === 'admin' ? '#ffffff' : '#dbeafe',
                  color: activeTab === 'admin' ? '#2563eb' : '#1e40af',
                  fontWeight: 800,
                }}
              >
                {reports.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: FORM PENGIRIMAN LAPORAN (SISI GURU) */}
        {activeTab === 'kirim' && (
          <div>
            {submitResult?.ok ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                  border: '2px solid #10b981',
                  borderRadius: 14,
                  padding: '24px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: '#d1fae5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#064e3b', margin: '0 0 4px 0' }}>
                    Laporan Kendala Berhasil Dikirim!
                  </h3>
                  <p style={{ fontSize: 12, color: '#047857', maxWidth: 440, margin: '0 auto', lineHeight: 1.5 }}>
                    {submitResult.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitResult(null)}
                  className="btn btn-sm btn-outline"
                  style={{
                    background: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 4,
                    padding: '7px 16px',
                  }}
                >
                  <RotateCcw size={14} />
                  Kirim Laporan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Kategori Kendala */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 8,
                    }}
                  >
                    Pilih Kategori Kendala:
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {FEEDBACK_CATEGORIES.map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#1e40af' : '#1e293b',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 1px 4px rgba(37, 99, 235, 0.15)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2, flexShrink: 0 }} aria-hidden="true">
                            {cat.icon}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: isSelected ? 800 : 700, lineHeight: 1.3 }}>
                              {cat.label}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: isSelected ? '#2563eb' : '#64748b',
                                marginTop: 2,
                                lineHeight: 1.35,
                              }}
                            >
                              {cat.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Deskripsi Kendala */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    htmlFor="feedback-desc"
                    className="form-label"
                    style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'block' }}
                  >
                    Deskripsi Kendala / Masukan <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    id="feedback-desc"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Jelaskan kendala yang dialami secara rinci. Contoh: Saat menekan tombol unduh Word di modul ajar kelas 4, halaman freeze dan berkas tidak terunduh..."
                    className="form-textarea"
                    style={{
                      width: '100%',
                      minHeight: 90,
                      fontSize: 12.5,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      lineHeight: 1.5,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                {/* 3. Kontak Guru (Opsional) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    htmlFor="feedback-contact"
                    className="form-label"
                    style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'block' }}
                  >
                    Kontak Guru <span style={{ fontWeight: 400, color: '#64748b' }}>(Opsional)</span>
                  </label>
                  <input
                    id="feedback-contact"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Nomor WhatsApp atau Nama Guru (Contoh: 0812-3456-7890 / Bu Siti)"
                    className="form-input"
                    style={{
                      width: '100%',
                      fontSize: 12.5,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0 0' }}>
                    Diisi jika Anda bersedia dihubungi oleh pengembang untuk konfirmasi perbaikan kendala.
                  </p>
                </div>

                {/* 4. Konteks Otomatis (Anti-Repot) */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <span>📌</span>
                    <span>Konteks Otomatis Terlampir (Anti-Repot)</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 8,
                      fontSize: 11.5,
                      color: '#475569',
                    }}
                  >
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>Halaman:</span>
                      <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {activePage}
                      </span>
                    </div>
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>Kelas/Mapel:</span>
                      <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {kelasMapel}
                      </span>
                    </div>
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>Perangkat:</span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: '#2563eb',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          fontWeight: 700,
                        }}
                      >
                        {deviceId || '-'}
                      </span>
                    </div>
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>Status Lisensi:</span>
                      <span style={{ fontWeight: 800, color: isPro ? '#059669' : '#d97706' }}>
                        {isPro ? '✓ Lisensi PRO Aktif' : 'Mode Pratinjau'}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 10.5, color: '#94a3b8', margin: '8px 0 0 0' }}>
                    Informasi di atas otomatis disertakan agar tim pengembang dapat langsung mereproduksi kendala tanpa bertanya bolak-balik.
                  </p>
                </div>

                {/* Alert jika gagal kirim */}
                {submitResult && !submitResult.ok && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 600,
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{submitResult.message}</span>
                  </div>
                )}

                {/* Tombol Kirim */}
                <button
                  type="submit"
                  disabled={isSubmitting || !description.trim()}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    fontSize: 13.5,
                    fontWeight: 800,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: isSubmitting || !description.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || !description.trim() ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Mengirim Laporan Kendala...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Kirim Laporan Kendala</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: KOTAK MASUK ADMIN (PIN GATE) */}
        {activeTab === 'admin' && (
          <div>
            {!isAdminUnlocked ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '24px 20px',
                  maxWidth: 380,
                  margin: '10px auto',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                  }}
                >
                  <Lock size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                    Area Khusus Admin / Pengembang
                  </h3>
                  <p style={{ fontSize: 11.5, color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                    Masukkan PIN Admin Asesmen Merdeka untuk mengakses kotak masuk laporan kendala dari para guru.
                  </p>
                </div>
                <form
                  onSubmit={handleUnlockAdmin}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}
                >
                  <div>
                    <label
                      htmlFor="admin-pin-input"
                      style={{
                        display: 'block',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: 4,
                      }}
                    >
                      PIN Admin
                    </label>
                    <input
                      id="admin-pin-input"
                      type="password"
                      value={adminPin}
                      onChange={(e) => {
                        setAdminPin(e.target.value);
                        if (pinError) setPinError(null);
                      }}
                      placeholder="Masukkan PIN Admin"
                      className="form-input"
                      style={{
                        width: '100%',
                        fontSize: 13,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        boxSizing: 'border-box',
                      }}
                      autoFocus
                    />
                  </div>

                  {pinError && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoadingReports}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {isLoadingReports ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={15} />
                        <span>Buka Kotak Masuk</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Admin Subheader & Filter Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    paddingBottom: 10,
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('semua')}
                      style={{
                        padding: '5px 12px',
                        fontSize: 11.5,
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
                        padding: '5px 12px',
                        fontSize: 11.5,
                        borderRadius: 8,
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: statusFilter === 'perlu_ditangani' ? '#d97706' : '#fef3c7',
                        color: statusFilter === 'perlu_ditangani' ? '#ffffff' : '#92400e',
                      }}
                    >
                      Perlu Ditangani ({pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('selesai')}
                      style={{
                        padding: '5px 12px',
                        fontSize: 11.5,
                        borderRadius: 8,
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: statusFilter === 'selesai' ? '#059669' : '#d1fae5',
                        color: statusFilter === 'selesai' ? '#ffffff' : '#065f46',
                      }}
                    >
                      Selesai ({doneCount})
                    </button>
                  </div>

                  {/* Top Right Admin Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => loadAdminReports(adminPin)}
                      disabled={isLoadingReports}
                      title="Segarkan Laporan"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <RefreshCw size={13} className={isLoadingReports ? 'animate-spin' : ''} />
                      <span style={{ fontSize: 11.5 }}>Segarkan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminUnlocked(false);
                        setAdminPin('');
                      }}
                      title="Kunci Kotak Masuk"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Lock size={12} />
                      <span style={{ fontSize: 11.5 }}>Kunci</span>
                    </button>
                  </div>
                </div>

                {/* Highlighted Banner: Salin Laporan untuk AI */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                    border: '1px solid #bfdbfe',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ maxWidth: 420 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: '#1e3a8a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Sparkles size={14} color="#2563eb" />
                      Format Rangkuman untuk AI
                    </div>
                    <p style={{ fontSize: 11, color: '#3b82f6', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                      Salin seluruh laporan kendala ke format Markdown terstruktur untuk diperbaiki secara instan oleh AI Assistant.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyForAi}
                    className={`btn btn-sm ${copiedAi ? 'btn-success' : 'btn-primary'}`}
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '8px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {copiedAi ? (
                      <>
                        <Check size={14} />
                        <span>Rangkuman Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>📋 Salin Laporan untuk AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Toast feedback jika berhasil salin AI */}
                {copiedAi && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={16} color="#059669" />
                    <span>Rangkuman Laporan Tersalin! Siap Ditempel ke Chat AI</span>
                  </div>
                )}

                {/* Notice message */}
                {adminNotice && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: adminNotice.isError ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${adminNotice.isError ? '#fecaca' : '#a7f3d0'}`,
                      color: adminNotice.isError ? '#b91c1c' : '#15803d',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{adminNotice.text}</span>
                  </div>
                )}

                {/* Report Cards List */}
                {isLoadingReports ? (
                  <div
                    style={{
                      padding: '36px 0',
                      textAlign: 'center',
                      fontSize: 12,
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Loader2 size={18} className="animate-spin" color="#2563eb" />
                    <span>Memuat daftar laporan kendala...</span>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div
                    style={{
                      padding: '36px 20px',
                      textAlign: 'center',
                      fontSize: 12,
                      color: '#94a3b8',
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    Tidak ada laporan kendala dalam filter ini.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                          }}
                        >
                          {/* Top Row: Category, Date, Status Selector & Delete */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 8,
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
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                {formatReportDate(report.createdAt)}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                  padding: '4px 8px',
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
                                title="Hapus Laporan"
                                aria-label="Hapus laporan ini"
                                className="btn btn-outline btn-sm"
                                style={{
                                  padding: 5,
                                  color: '#dc2626',
                                  borderColor: '#fecaca',
                                  borderRadius: 6,
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Description Block */}
                          <div
                            style={{
                              fontSize: 12.5,
                              color: '#1e293b',
                              background: '#f8fafc',
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.5,
                            }}
                          >
                            {report.description}
                          </div>

                          {/* Contact Info (If available) */}
                          {report.contact && (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Phone size={12} color="#059669" />
                              <span>Kontak Pengirim:</span>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{report.contact}</span>
                            </div>
                          )}

                          {/* Context Badges */}
                          <div
                            style={{
                              paddingTop: 8,
                              borderTop: '1px solid #f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                              fontSize: 10.5,
                              color: '#64748b',
                            }}
                          >
                            <span style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>
                              Tab: {report.context?.activeTab || '-'}
                            </span>
                            <span style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>
                              Kelas/Mapel:{' '}
                              {[report.context?.kelas, report.context?.mapel].filter(Boolean).join(' • ') || '-'}
                            </span>
                            <span style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>
                              Device: {report.context?.deviceId || '-'}
                            </span>
                            <span
                              style={{
                                padding: '2px 6px',
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
          </div>
        )}
      </motion.div>
    </div>
  );
};
