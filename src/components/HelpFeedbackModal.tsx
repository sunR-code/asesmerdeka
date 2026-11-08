import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type {
  FeedbackCategory,
  FeedbackReport,
} from '../types/feedback';
import {
  FEEDBACK_CATEGORIES,
} from '../types/feedback';
import {
  submitFeedbackReport,
} from '../utils/feedbackService';
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

export const HelpFeedbackModal: React.FC<HelpFeedbackModalProps> = ({
  isOpen,
  onClose,
  activeTabName,
  activeTabId,
  schoolProfile,
  deviceId,
  isPro,
}) => {
  const [category, setCategory] = useState<FeedbackCategory>('fitur_error');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    ok: boolean;
    message: string;
    report?: FeedbackReport;
  } | null>(null);

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

        {/* Content: Form Pengiriman Laporan (Sisi Guru) */}
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
      </motion.div>
    </div>
  );
};

export default HelpFeedbackModal;
