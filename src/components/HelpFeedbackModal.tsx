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
  FEEDBACK_STATUS_META,
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
          padding: 24,
        }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Pusat Bantuan & Lapor Kendala
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sampaikan kendala, masukan data dummy, atau usulan fitur langsung kepada pengembang.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela bantuan"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('kirim')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'kirim'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare size={15} />
            Kirim Laporan / Bantuan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert size={15} />
            Kotak Masuk Admin
            {isAdminUnlocked && reports.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 font-bold">
                {reports.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: FORM PENGIRIMAN LAPORAN (SISI GURU) */}
        {activeTab === 'kirim' && (
          <div>
            {submitResult?.ok ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="text-base font-bold text-emerald-900">
                  Laporan Kendala Berhasil Dikirim!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                  {submitResult.message}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSubmitResult(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Kirim Laporan Lain
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                {/* 1. Kategori Kendala */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Pilih Kategori Kendala:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FEEDBACK_CATEGORIES.map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-start text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer min-h-[44px] ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-1 ring-blue-500 font-semibold shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-base mr-2 flex-shrink-0" aria-hidden="true">
                            {cat.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs leading-snug">{cat.label}</div>
                            <div className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                              {cat.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Deskripsi Kendala */}
                <div>
                  <label htmlFor="feedback-desc" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Deskripsi Kendala / Masukan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="feedback-desc"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Jelaskan kendala yang dialami secara rinci. Contoh: Saat menekan tombol unduh Word di modul ajar kelas 4, halaman freeze dan berkas tidak terunduh..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-slate-800 placeholder:text-slate-400 leading-relaxed"
                    required
                  />
                </div>

                {/* 3. Kontak Guru (Opsional) */}
                <div>
                  <label htmlFor="feedback-contact" className="block text-xs font-bold text-slate-700 mb-1">
                    Kontak Guru <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    id="feedback-contact"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Nomor WhatsApp atau Nama Guru (Contoh: 0812-3456-7890 / Bu Siti)"
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Diisi jika Anda bersedia dihubungi oleh pengembang untuk konfirmasi perbaikan kendala.
                  </p>
                </div>

                {/* 4. Konteks Otomatis (Anti-Repot) */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <span>📌</span>
                    <span>Konteks Otomatis Terlampir (Anti-Repot)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1 truncate bg-white px-2 py-1 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Halaman:</span>
                      <span className="truncate">{activePage}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate bg-white px-2 py-1 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Kelas/Mapel:</span>
                      <span className="truncate">{kelasMapel}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate bg-white px-2 py-1 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Perangkat:</span>
                      <span className="truncate">{deviceId || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate bg-white px-2 py-1 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Status Lisensi:</span>
                      <span className="font-semibold text-blue-700">
                        {isPro ? 'PRO Aktif' : 'Pratinjau'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Informasi di atas otomatis disertakan agar tim pengembang dapat langsung mereproduksi kendala tanpa bertanya bolak-balik.
                  </p>
                </div>

                {/* Alert jika gagal kirim */}
                {submitResult && !submitResult.ok && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    <span>{submitResult.message}</span>
                  </div>
                )}

                {/* Tombol Kirim */}
                <button
                  type="submit"
                  disabled={isSubmitting || !description.trim()}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed min-h-[44px]"
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
              <div className="py-6 px-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Area Khusus Admin / Pengembang
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Masukkan PIN Admin Asesmen Merdeka untuk mengakses kotak masuk laporan kendala dari para guru.
                  </p>
                </div>
                <form onSubmit={handleUnlockAdmin} className="space-y-3 text-left">
                  <div>
                    <label htmlFor="admin-pin-input" className="block text-xs font-semibold text-slate-700 mb-1">
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
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      autoFocus
                    />
                  </div>

                  {pinError && (
                    <div className="text-xs text-rose-600 flex items-center gap-1.5">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoadingReports}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all min-h-[40px]"
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
              <div className="space-y-4">
                {/* Admin Subheader & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('semua')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                        statusFilter === 'semua'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Semua ({reports.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('perlu_ditangani')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                        statusFilter === 'perlu_ditangani'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      Perlu Ditangani ({pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('selesai')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                        statusFilter === 'selesai'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      Selesai ({doneCount})
                    </button>
                  </div>

                  {/* Top Right Admin Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => loadAdminReports(adminPin)}
                      disabled={isLoadingReports}
                      title="Segarkan Laporan"
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={15} className={isLoadingReports ? 'animate-spin' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminUnlocked(false);
                        setAdminPin('');
                      }}
                      title="Kunci Kotak Masuk"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Lock size={12} />
                      Kunci
                    </button>
                  </div>
                </div>

                {/* Highlighted Banner: Salin Laporan untuk AI */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-blue-600 flex-shrink-0" />
                      Format Rangkuman untuk AI
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Salin seluruh laporan kendala ke format Markdown terstruktur untuk diperbaiki secara instan oleh AI Assistant.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyForAi}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer shadow-xs min-h-[38px] ${
                      copiedAi
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
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
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Rangkuman Laporan Tersalin! Siap Ditempel ke Chat AI</span>
                  </div>
                )}

                {/* Notice message */}
                {adminNotice && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      adminNotice.isError
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{adminNotice.text}</span>
                  </div>
                )}

                {/* Report Cards List */}
                {isLoadingReports ? (
                  <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span>Memuat daftar laporan kendala...</span>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                    Tidak ada laporan kendala dalam filter ini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((report) => {
                      const catMeta = FEEDBACK_CATEGORY_META[report.category] || {
                        label: report.category,
                        icon: '📌',
                        description: '',
                      };
                      const statusMeta = FEEDBACK_STATUS_META[report.status] || {
                        label: report.status,
                        icon: '⚪',
                        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                      };

                      return (
                        <div
                          key={report.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs space-y-2.5"
                        >
                          {/* Top Row: Category, Date, Status Selector & Delete */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
                                <span>{catMeta.icon}</span>
                                <span>{catMeta.label}</span>
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {formatReportDate(report.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Status Dropdown */}
                              <select
                                value={report.status}
                                onChange={(e) =>
                                  handleUpdateStatus(report.id, e.target.value as FeedbackStatus)
                                }
                                aria-label="Ubah status laporan"
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${statusMeta.badgeClass}`}
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
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Description Block */}
                          <div className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 whitespace-pre-wrap leading-relaxed">
                            {report.description}
                          </div>

                          {/* Contact Info (If available) */}
                          {report.contact && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                              <Phone size={12} className="text-emerald-600 flex-shrink-0" />
                              <span>Kontak Pengirim:</span>
                              <span className="font-semibold text-slate-900">{report.contact}</span>
                            </div>
                          )}

                          {/* Context Badges */}
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
                              Tab: {report.context?.activeTab || '-'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
                              Kelas/Mapel: {[report.context?.kelas, report.context?.mapel].filter(Boolean).join(' • ') || '-'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
                              Device: {report.context?.deviceId || '-'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
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
