import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Key,
  Plus,
  RefreshCw,
  Search,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Sparkles,
  Loader2,
  Layers,
} from 'lucide-react';
import type {
  AdminLicenseItem,
  AdminPlanType,
  CreateLicensePayload,
} from '../../types/admin';
import { ADMIN_PLANS, ADMIN_PLAN_META } from '../../types/admin';
import {
  fetchAdminLicenses,
  createAdminLicense,
  resetAdminLicenseSeats,
  deleteAdminLicense,
} from '../../utils/adminService';

export interface AdminLicenseTabProps {
  adminPin: string;
}

function formatDate(isoString: string): string {
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

export const AdminLicenseTab: React.FC<AdminLicenseTabProps> = ({ adminPin }) => {
  // Data State
  const [licenses, setLicenses] = useState<AdminLicenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; isError: boolean } | null>(null);

  // Generator State
  const [selectedPlanType, setSelectedPlanType] = useState<AdminPlanType>('individu');
  const [buyerLabel, setBuyerLabel] = useState('');
  const [batchCount, setBatchCount] = useState<number>(1);
  const [customMaxSeats, setCustomMaxSeats] = useState<number | ''>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState<AdminLicenseItem[]>([]);
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'aktif' | 'belum_aktif'>('semua');
  const [planFilter, setPlanFilter] = useState<'semua' | AdminPlanType>('semua');

  // Interactive Actions State
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [resetConfirmLicense, setResetConfirmLicense] = useState<AdminLicenseItem | null>(null);
  const [deleteConfirmLicense, setDeleteConfirmLicense] = useState<AdminLicenseItem | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load licenses on mount or pin change
  const loadLicenses = useCallback(async () => {
    if (!adminPin) return;
    setIsLoading(true);
    try {
      const res = await fetchAdminLicenses(adminPin);
      if (res.ok) {
        setLicenses(res.licenses || []);
      } else {
        setActionNotice({ text: res.message || 'Gagal memuat registri lisensi.', isError: true });
      }
    } catch (err) {
      setActionNotice({
        text: err instanceof Error ? err.message : 'Terjadi kegagalan jaringan saat memuat lisensi.',
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [adminPin]);

  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  // Handle Generator Submission
  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = buyerLabel.trim();
    if (!cleanLabel) {
      setActionNotice({ text: 'Nama atau instansi pemesan wajib diisi sebagai identitas lisensi.', isError: true });
      return;
    }

    const count = Math.max(1, Math.min(100, Number(batchCount) || 1));
    const finalCustomSeats = typeof customMaxSeats === 'number' && customMaxSeats > 0 ? customMaxSeats : undefined;

    setIsGenerating(true);
    setActionNotice(null);

    const payload: CreateLicensePayload = {
      planType: selectedPlanType,
      label: cleanLabel,
      count,
      customMaxSeats: finalCustomSeats,
    };

    try {
      const res = await createAdminLicense(adminPin, payload);
      if (res.ok && res.created.length > 0) {
        setRecentlyCreated(res.created);
        setBuyerLabel('');
        setBatchCount(1);
        setCustomMaxSeats('');
        setActionNotice({
          text: `Berhasil membuat ${res.created.length} kode lisensi resmi untuk "${cleanLabel}"!`,
          isError: false,
        });
        // Reload list to synchronize
        await loadLicenses();
      } else {
        setActionNotice({
          text: res.message || 'Gagal membuat lisensi.',
          isError: true,
        });
      }
    } catch (err) {
      setActionNotice({
        text: err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat membuat lisensi.',
        isError: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy Single Code
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
    }
  };

  // Copy Batch Codes
  const handleCopyBatch = async () => {
    if (!recentlyCreated.length) return;
    try {
      const text = recentlyCreated.map((item) => `${item.code} | ${item.label} | ${item.tier}`).join('\n');
      await navigator.clipboard.writeText(text);
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2500);
    } catch {
      // fallback
    }
  };

  // Confirm Reset Device Seats
  const handleExecuteResetSeats = async () => {
    if (!resetConfirmLicense) return;
    setIsActionLoading(true);
    setActionNotice(null);
    try {
      const res = await resetAdminLicenseSeats(adminPin, resetConfirmLicense.code);
      if (res.ok) {
        setActionNotice({
          text: `Kunci perangkat untuk lisensi ${resetConfirmLicense.code} berhasil di-reset! Pembeli dapat mengikat perangkat baru.`,
          isError: false,
        });
        setResetConfirmLicense(null);
        await loadLicenses();
      } else {
        setActionNotice({ text: res.message, isError: true });
      }
    } catch (err) {
      setActionNotice({
        text: err instanceof Error ? err.message : 'Gagal me-reset kunci perangkat.',
        isError: true,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Confirm Delete License
  const handleExecuteDeleteLicense = async () => {
    if (!deleteConfirmLicense) return;
    setIsActionLoading(true);
    setActionNotice(null);
    try {
      const res = await deleteAdminLicense(adminPin, deleteConfirmLicense.code);
      if (res.ok) {
        setActionNotice({
          text: `Lisensi ${deleteConfirmLicense.code} (${deleteConfirmLicense.label}) berhasil dihapus permanen.`,
          isError: false,
        });
        setDeleteConfirmLicense(null);
        await loadLicenses();
      } else {
        setActionNotice({ text: res.message, isError: true });
      }
    } catch (err) {
      setActionNotice({
        text: err instanceof Error ? err.message : 'Gagal menghapus lisensi.',
        isError: true,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Calculated Stats
  const stats = useMemo(() => {
    const total = licenses.length;
    let activeCount = 0;
    let unusedCount = 0;
    let totalLockedDevices = 0;

    for (const lic of licenses) {
      const used = lic.usedSeats || (lic.devices ? lic.devices.length : 0);
      totalLockedDevices += used;
      if (lic.status === 'aktif' || used > 0) {
        activeCount++;
      } else {
        unusedCount++;
      }
    }

    return { total, activeCount, unusedCount, totalLockedDevices };
  }, [licenses]);

  // Filtered Licenses
  const filteredLicenses = useMemo(() => {
    return licenses.filter((item) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchLabel = (item.label || '').toLowerCase().includes(q);
        const matchTier = (item.tier || '').toLowerCase().includes(q);
        const matchDevices = (item.devices || []).some((d) => d.toLowerCase().includes(q));
        if (!matchCode && !matchLabel && !matchTier && !matchDevices) return false;
      }

      // Status filter
      if (statusFilter === 'aktif') {
        const used = item.usedSeats || (item.devices ? item.devices.length : 0);
        if (item.status !== 'aktif' && used === 0) return false;
      } else if (statusFilter === 'belum_aktif') {
        const used = item.usedSeats || (item.devices ? item.devices.length : 0);
        if (item.status === 'aktif' || used > 0) return false;
      }

      // Plan filter
      if (planFilter !== 'semua') {
        if (item.planType !== planFilter) return false;
      }

      return true;
    });
  }, [licenses, searchQuery, statusFilter, planFilter]);

  const activePlanMeta = ADMIN_PLAN_META[selectedPlanType] || ADMIN_PLAN_META.individu;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Notice Message Toast */}
      {actionNotice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: actionNotice.isError ? '#fef2f2' : '#f0fdf4',
            border: `1.5px solid ${actionNotice.isError ? '#ef4444' : '#10b981'}`,
            color: actionNotice.isError ? '#b91c1c' : '#15803d',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actionNotice.isError ? (
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 800,
              fontSize: 14,
              padding: '2px 6px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Live Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
        }}
      >
        {/* Total Lisensi */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '16px 18px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Key size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Lisensi Terdaftar
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.15 }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Aktif / Terkunci */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '16px 18px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
              Aktif Digunakan Guru
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#064e3b', lineHeight: 1.15 }}>
              {stats.activeCount}
            </div>
          </div>
        </div>

        {/* Belum Aktif / Stok */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '16px 18px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Belum Aktif (Stok Siap)
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#78350f', lineHeight: 1.15 }}>
              {stats.unusedCount}
            </div>
          </div>
        </div>

        {/* Total Perangkat Terkunci */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '16px 18px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Smartphone size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Perangkat Terkunci
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.15 }}>
              {stats.totalLockedDevices}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Generator Section Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Generator Kode Lisensi Khusus & Pembeli Resmi
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Hasilkan kode resmi terenkripsi (ASM-...) yang langsung terdaftar di sistem dengan label identitas pembeli.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleGenerateLicense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Plan Selector Buttons */}
          <div>
            <label className="form-label" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
              Pilih Paket Lisensi:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              {ADMIN_PLANS.map((plan) => {
                const isSelected = selectedPlanType === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlanType(plan.id);
                      if (customMaxSeats) setCustomMaxSeats('');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1e40af' : 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isSelected ? '#dbeafe' : '#f1f5f9',
                          color: isSelected ? '#1d4ed8' : '#475569',
                        }}
                      >
                        {plan.badge}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#2563eb' : '#64748b' }}>
                        {plan.defaultMaxSeats} Perangkat
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: isSelected ? 800 : 700, lineHeight: 1.3 }}>
                      {plan.name}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
              📌 {activePlanMeta.description} (Default kursi: <strong>{activePlanMeta.defaultMaxSeats} perangkat</strong>)
            </div>
          </div>

          {/* Form Inputs: Label, Count, Custom Seats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              alignItems: 'flex-end',
            }}
          >
            {/* Buyer Label */}
            <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
              <label htmlFor="admin-buyer-label" className="form-label" style={{ fontSize: 12 }}>
                Label / Identitas Pemesan <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="admin-buyer-label"
                type="text"
                value={buyerLabel}
                onChange={(e) => setBuyerLabel(e.target.value)}
                placeholder="Misal: Bu Rina - SDN 1 Merdeka (WA 0812345678)"
                className="form-input"
                required
              />
            </div>

            {/* Batch Count */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="admin-batch-count" className="form-label" style={{ fontSize: 12 }}>
                Jumlah Kode
              </label>
              <input
                id="admin-batch-count"
                type="number"
                min={1}
                max={100}
                value={batchCount}
                onChange={(e) => setBatchCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="form-input"
              />
            </div>

            {/* Custom Seats (Optional) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="admin-custom-seats" className="form-label" style={{ fontSize: 12 }}>
                Kustom Kursi (Opsional)
              </label>
              <input
                id="admin-custom-seats"
                type="number"
                min={1}
                max={250}
                value={customMaxSeats}
                onChange={(e) => setCustomMaxSeats(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={`Bawaan: ${activePlanMeta.defaultMaxSeats}`}
                className="form-input"
              />
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isGenerating || !buyerLabel.trim()}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontWeight: 800,
                  fontSize: 13,
                  opacity: isGenerating || !buyerLabel.trim() ? 0.6 : 1,
                  cursor: isGenerating || !buyerLabel.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Mencetak Lisensi...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Buat Lisensi Resmi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Recently Created Banner */}
        {recentlyCreated.length > 0 && (
          <div
            style={{
              marginTop: 10,
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} color="#059669" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#064e3b' }}>
                  {recentlyCreated.length} Kode Lisensi Berhasil Dicetak & Terdaftar:
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyBatch}
                className="btn btn-sm btn-outline"
                style={{ background: '#ffffff', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                {copiedBatch ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                <span>{copiedBatch ? 'Semua Kode Tersalin!' : 'Salin Semua Kode'}</span>
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                maxHeight: 180,
                overflowY: 'auto',
                background: '#ffffff',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #a7f3d0',
              }}
            >
              {recentlyCreated.map((item) => (
                <div
                  key={item.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    padding: '4px 0',
                    borderBottom: '1px dashed #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ color: '#0f172a' }}>{item.code}</strong>
                    <span style={{ color: '#64748b', fontSize: 11 }}>• {item.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(item.code)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                  >
                    {copiedCode === item.code ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Search, Filter & Refresh Bar */}
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
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode (ASM-...), pemesan, atau ID perangkat..."
            className="form-input"
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills & Selects */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Status Pills */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 3 }}>
            <button
              type="button"
              onClick={() => setStatusFilter('semua')}
              style={{
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: statusFilter === 'semua' ? '#0f172a' : 'transparent',
                color: statusFilter === 'semua' ? '#ffffff' : '#475569',
              }}
            >
              Semua ({licenses.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('aktif')}
              style={{
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: statusFilter === 'aktif' ? '#059669' : 'transparent',
                color: statusFilter === 'aktif' ? '#ffffff' : '#047857',
              }}
            >
              Aktif ({stats.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('belum_aktif')}
              style={{
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: statusFilter === 'belum_aktif' ? '#d97706' : 'transparent',
                color: statusFilter === 'belum_aktif' ? '#ffffff' : '#b45309',
              }}
            >
              Belum Aktif ({stats.unusedCount})
            </button>
          </div>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as 'semua' | AdminPlanType)}
            className="form-select"
            style={{ fontSize: 11.5, padding: '5px 10px', maxWidth: 160 }}
          >
            <option value="semua">Semua Paket</option>
            {ADMIN_PLANS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.badge}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadLicenses}
            disabled={isLoading}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            title="Muat Ulang Data Registri Lisensi"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span style={{ fontSize: 11.5 }}>Segarkan</span>
          </button>
        </div>
      </div>

      {/* 4. Table / Card List of Licenses */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {isLoading ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: 'var(--text-muted)',
            }}
          >
            <Loader2 size={24} className="animate-spin" color="#2563eb" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Memuat daftar lisensi dari serverless Upstash Redis...</span>
          </div>
        ) : filteredLicenses.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--text-muted)',
            }}
          >
            <Key size={32} color="#cbd5e1" />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
              Tidak Ada Lisensi Ditemukan
            </div>
            <p style={{ fontSize: 12, margin: 0, maxWidth: 360 }}>
              {searchQuery || statusFilter !== 'semua' || planFilter !== 'semua'
                ? 'Tidak ada lisensi yang cocok dengan kriteria pencarian Anda. Coba ubah kata kunci atau bersihkan filter.'
                : 'Belum ada lisensi resmi yang dibuat. Gunakan formulir generator di atas untuk membuat kode lisensi pertama.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 800,
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>Kode Lisensi</th>
                  <th style={{ padding: '12px 16px' }}>Label / Pemesan</th>
                  <th style={{ padding: '12px 16px' }}>Paket</th>
                  <th style={{ padding: '12px 16px' }}>Kuota Kursi</th>
                  <th style={{ padding: '12px 16px' }}>Perangkat Terkunci</th>
                  <th style={{ padding: '12px 16px' }}>Tanggal</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.map((item) => {
                  const used = item.usedSeats || (item.devices ? item.devices.length : 0);
                  const isFullyBound = used >= item.maxSeats;
                  const isUnused = used === 0;
                  const planMeta = ADMIN_PLAN_META[item.planType] || ADMIN_PLAN_META.individu;

                  return (
                    <tr
                      key={item.code}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* 1. Kode Lisensi with Quick Copy */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: 12.5,
                              color: '#0f172a',
                            }}
                          >
                            {item.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.code)}
                            title="Salin Kode Lisensi"
                            style={{
                              background: copiedCode === item.code ? '#d1fae5' : '#f1f5f9',
                              border: 'none',
                              borderRadius: 4,
                              padding: '3px 6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              color: copiedCode === item.code ? '#059669' : '#64748b',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {copiedCode === item.code ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedCode === item.code ? 'Tersalin' : ''}</span>
                          </button>
                        </div>
                      </td>

                      {/* 2. Label Pemesan */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>
                          {item.label || 'Umum'}
                        </div>
                      </td>

                      {/* 3. Paket Badge */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background:
                              item.planType === 'pro' || item.planType === 'sekolah_pro'
                                ? '#eff6ff'
                                : item.planType === 'sekolah'
                                ? '#f0fdfa'
                                : '#f8fafc',
                            color:
                              item.planType === 'pro' || item.planType === 'sekolah_pro'
                                ? '#2563eb'
                                : item.planType === 'sekolah'
                                ? '#0d9488'
                                : '#475569',
                            border: '1px solid #cbd5e1',
                            display: 'inline-block',
                          }}
                        >
                          {planMeta.badge}
                        </span>
                      </td>

                      {/* 4. Kuota Kursi */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: isUnused ? '#fef3c7' : isFullyBound ? '#fee2e2' : '#ecfdf5',
                              color: isUnused ? '#92400e' : isFullyBound ? '#991b1b' : '#065f46',
                            }}
                          >
                            {used} / {item.maxSeats} Kursi
                          </span>
                        </div>
                      </td>

                      {/* 5. Perangkat Terkunci (Device IDs) */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        {item.devices && item.devices.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {item.devices.map((dev) => (
                              <span
                                key={dev}
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: 11,
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  width: 'fit-content',
                                }}
                              >
                                <Smartphone size={10} color="#2563eb" />
                                <span>{dev}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                            Belum terikat perangkat
                          </span>
                        )}
                      </td>

                      {/* 6. Tanggal Dibuat */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatDate(item.createdAt)}
                        </span>
                      </td>

                      {/* 7. Aksi (Reset Seats, Delete) */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {/* Reset Kunci Perangkat */}
                          <button
                            type="button"
                            onClick={() => setResetConfirmLicense(item)}
                            title="Reset Kunci Perangkat (Unbind)"
                            className="btn btn-outline btn-sm"
                            style={{
                              padding: '5px 8px',
                              fontSize: 11,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: used > 0 ? '#b45309' : '#94a3b8',
                              borderColor: used > 0 ? '#fde68a' : '#e2e8f0',
                              background: used > 0 ? '#fffbeb' : '#ffffff',
                            }}
                          >
                            <RotateCcw size={12} />
                            <span>Reset Device</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmLicense(item)}
                            title="Hapus Lisensi Permanen"
                            className="btn btn-outline btn-sm"
                            style={{
                              padding: '5px 8px',
                              fontSize: 11,
                              color: '#dc2626',
                              borderColor: '#fecaca',
                              background: '#ffffff',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal: Reset Kunci Perangkat */}
      {resetConfirmLicense && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-overlay"
          onClick={() => !isActionLoading && setResetConfirmLicense(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              width: '100%',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Reset Kunci Perangkat?
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Device Unbind untuk lisensi {resetConfirmLicense.code}
                </p>
              </div>
            </div>

            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                background: '#f8fafc',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #e2e8f0',
              }}
            >
              Tindakan ini akan <strong>membersihkan seluruh daftar perangkat terkunci</strong> ({resetConfirmLicense.devices?.join(', ') || 'Belum ada'}) dari Cloud Redis. Pemesan (<strong>{resetConfirmLicense.label}</strong>) dapat langsung mengaktifkan lisensinya di perangkat / HP / laptop baru.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => setResetConfirmLicense(null)}
                className="btn btn-outline"
                style={{ fontSize: 12.5 }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleExecuteResetSeats}
                className="btn btn-primary"
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: '#d97706',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isActionLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Me-reset...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Ya, Reset Kunci Perangkat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete License */}
      {deleteConfirmLicense && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-overlay"
          onClick={() => !isActionLoading && setDeleteConfirmLicense(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              width: '100%',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  Hapus Lisensi Ini?
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                background: '#fef2f2',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #fecaca',
              }}
            >
              Apakah Anda yakin ingin menghapus lisensi <strong style={{ fontFamily: 'monospace' }}>{deleteConfirmLicense.code}</strong> milik <strong>{deleteConfirmLicense.label}</strong>? Kode lisensi ini tidak akan dapat digunakan lagi untuk aktivasi.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => setDeleteConfirmLicense(null)}
                className="btn btn-outline"
                style={{ fontSize: 12.5 }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleExecuteDeleteLicense}
                className="btn btn-primary"
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isActionLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
