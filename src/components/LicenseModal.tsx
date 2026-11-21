import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Key,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Lock,
  MessageCircle,
  Users,
  ArrowLeft,
  Info,
} from 'lucide-react';
import type { UserQuota } from '../types/assessment';
import {
  activateLicense,
  saveGeminiKey,
  getSavedGeminiKey,
  getConfiguredIndividuMaxDevices,
  getLicenseSeatStatus,
  getCloudSeatTrackerUrl,
  verifyAndClaimSeatOnline,
  verifyMayarLicenseOnline,
  isLicensed,
  getTierDisplayName,
  getTierBadgeLabel,
  verifyActiveLicenseWithServer,
  getUserQuota,
  getLastLicenseStatusMetadata,
} from '../utils/licenseManager';
import {
  ONE_TIME_PLANS,
  PUBLIC_VISIBLE_PLAN_IDS,
  buildAdminWhatsAppPurchaseUrl,
  type OneTimePlanId,
} from '../utils/paymentGateway';
import {
  getSavedTeacherSyncPin,
  saveTeacherSyncPin,
  getLastCloudSyncAt,
  isSchoolCollectiveLicenseCode,
  pushWorkspaceToCloud,
  pullWorkspaceFromCloud,
  CLOUD_SYNC_STATUS_EVENT,
  getWorkspaceBaseRevision,
  isCloudBackendConfigured,
  getPendingCloudConflict,
  syncPendingCloudConflictWithLocalState,
  getPendingLegacyPinRecovery,
  submitLegacyPinRecovery,
  getCloudSyncUiStatus,
  getLastCloudSyncErrorDetail,
  getPreConflictBackup,
  resolveCloudConflict,
  restorePreConflictBackup,
  type CloudPendingConflict,
  type CloudPendingPinRecovery,
  type CloudPreConflictBackup,
  type CloudSyncErrorDetail,
  type ConflictChoice,
  type HonestCloudStatus,
} from '../utils/cloudSyncManager';
import {
  isAdminShortcutInput,
  triggerAdminPortalShortcut,
} from '../utils/adminPortalRouting';

function formatConflictPreviewValue(val: unknown): string {
  if (val === undefined || val === null || val === '') return '(Kosong)';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'string') return val.length > 90 ? `${val.slice(0, 87)}...` : val;
  try {
    const json = JSON.stringify(val);
    return json.length > 90 ? `${json.slice(0, 87)}...` : json;
  } catch {
    return String(val);
  }
}

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: UserQuota;
  onUpdateQuota: (newQuota: UserQuota) => void;
  onRestoredFromCloud?: () => void;
  initialWhatsAppModalPlanId?: OneTimePlanId | null;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  quota,
  onUpdateQuota,
  onRestoredFromCloud,
  initialWhatsAppModalPlanId = null,
}) => {
  const [licenseInput, setLicenseInput] = useState('');
  const [teacherPinInput, setTeacherPinInput] = useState(() => getSavedTeacherSyncPin());
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => getLastCloudSyncAt());
  const [cloudConfigured, setCloudConfigured] = useState<boolean | null>(() =>
    isCloudBackendConfigured()
  );
  const [baseRevision, setBaseRevision] = useState<number | null>(() =>
    getWorkspaceBaseRevision(quota.licenseKey, getSavedTeacherSyncPin())
  );
  const [pendingConflict, setPendingConflict] = useState<CloudPendingConflict | null>(() =>
    getPendingCloudConflict()
  );
  const [pendingPinRecovery, setPendingPinRecovery] = useState<CloudPendingPinRecovery | null>(
    () => getPendingLegacyPinRecovery()
  );
  const [cloudUiStatus, setCloudUiStatus] = useState<HonestCloudStatus>(() =>
    getCloudSyncUiStatus()
  );
  const [lastSyncErrorDetail, setLastSyncErrorDetail] = useState<CloudSyncErrorDetail | null>(() =>
    getLastCloudSyncErrorDetail()
  );
  const [recoveryMode, setRecoveryMode] = useState<'reverify' | 'replace'>('reverify');
  const [recoveryCurrentPin, setRecoveryCurrentPin] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState('');
  const [recoveryFeedback, setRecoveryFeedback] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [preConflictBackup, setPreConflictBackup] = useState<CloudPreConflictBackup | null>(() =>
    getPreConflictBackup()
  );
  const [conflictChoices, setConflictChoices] = useState<Record<string, ConflictChoice>>({});
  const [apiKeyInput, setApiKeyInput] = useState(() => getSavedGeminiKey());
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedDevice, setCopiedDevice] = useState(false);
  const [copiedLicenseKey, setCopiedLicenseKey] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showChangeLicense, setShowChangeLicense] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState<OneTimePlanId>('pro_individu');
  const [whatsAppModalPlanId, setWhatsAppModalPlanId] = useState<OneTimePlanId | null>(
    initialWhatsAppModalPlanId
  );
  const [activeSubTab, setActiveSubTab] = useState<'order' | 'byok'>('order');
  const maxIndividuSeats = getConfiguredIndividuMaxDevices();

  const refreshCloudSyncSnapshot = () => {
    setLastSyncTime(getLastCloudSyncAt());
    setCloudConfigured(isCloudBackendConfigured());
    const q = getUserQuota();
    setBaseRevision(getWorkspaceBaseRevision(q.licenseKey || quota.licenseKey, teacherPinInput));
    const nextConflict = syncPendingCloudConflictWithLocalState() || getPendingCloudConflict();
    setPendingConflict(nextConflict);
    setPendingPinRecovery(getPendingLegacyPinRecovery());
    setCloudUiStatus(getCloudSyncUiStatus());
    setLastSyncErrorDetail(getLastCloudSyncErrorDetail());
    setPreConflictBackup(getPreConflictBackup());
    if (nextConflict && nextConflict.conflicts.length > 0) {
      setConflictChoices((prev) => {
        const next: Record<string, ConflictChoice> = {};
        for (const item of nextConflict.conflicts) {
          next[item.id] = prev[item.id] || item.defaultChoice || 'local';
        }
        return next;
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshCloudSyncSnapshot();
    }
    const onCloudEvent = () => {
      refreshCloudSyncSnapshot();
    };
    window.addEventListener(CLOUD_SYNC_STATUS_EVENT, onCloudEvent);
    return () => window.removeEventListener(CLOUD_SYNC_STATUS_EVENT, onCloudEvent);
  }, [isOpen, quota.licenseKey]);

  useEffect(() => {
    if (!isOpen) {
      setWhatsAppModalPlanId(null);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (whatsAppModalPlanId) {
          setWhatsAppModalPlanId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, whatsAppModalPlanId]);

  // Validasi live ke server apakah lisensi aktif pada perangkat ini masih sah
  // (Mendeteksi seketika jika Admin baru saja menghapus lisensi atau melepas perangkat)
  useEffect(() => {
    if (!isOpen || !isLicensed(quota.tier) || !quota.licenseKey) return;
    let active = true;
    verifyActiveLicenseWithServer(teacherPinInput.trim() || undefined).then((res) => {
      if (!active) return;
      if (!res.valid) {
        onUpdateQuota(getUserQuota());
        setStatusMessage({
          text: res.message || 'Lisensi pada perangkat ini telah dinonaktifkan atau dihapus oleh Administrator.',
          isError: true,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [isOpen, quota.tier, quota.licenseKey, onUpdateQuota]);

  if (!isOpen) return null;

  const isUnlocked = isLicensed(quota.tier);
  const isPro = isUnlocked;
  const safeSelectedPlanId: OneTimePlanId = PUBLIC_VISIBLE_PLAN_IDS.includes(selectedPlanId)
    ? selectedPlanId
    : 'pro_individu';
  const currentPlan = ONE_TIME_PLANS[safeSelectedPlanId] || ONE_TIME_PLANS['pro_individu'];
  const activeSeatInfo = isUnlocked && quota.licenseKey ? getLicenseSeatStatus(quota.licenseKey) : null;
  const lastLicenseStatus = !isUnlocked ? getLastLicenseStatusMetadata() : null;
  const tierName = getTierDisplayName(quota.tier);
  const badgeName = getTierBadgeLabel(quota.tier);

  const whatsAppModalPlan = whatsAppModalPlanId
    ? ONE_TIME_PLANS[whatsAppModalPlanId] || ONE_TIME_PLANS.pro_individu
    : null;
  const whatsAppPurchaseUrl = whatsAppModalPlanId
    ? buildAdminWhatsAppPurchaseUrl(whatsAppModalPlanId)
    : '';

  const handleOpenPurchaseFlow = (planId: OneTimePlanId) => {
    setStatusMessage(null);
    setSelectedPlanId(planId);
    // Rilis awal menonaktifkan checkout otomatis Mayar dan mengarahkan calon pembeli
    // ke modal informasi pembelian via WhatsApp Admin.
    setWhatsAppModalPlanId(planId);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = licenseInput.trim();
    if (!trimmed) return;

    // Pintasan Admin: tutup modal lisensi dan buka Dedicated Admin Portal (Lock Screen)
    if (isAdminShortcutInput(trimmed)) {
      setLicenseInput('');
      setStatusMessage(null);
      setWhatsAppModalPlanId(null);
      triggerAdminPortalShortcut(onClose);
      return;
    }

    setIsActivating(true);
    try {
      const isSchoolLicenseKey =
        isSchoolCollectiveLicenseCode(trimmed) ||
        selectedPlanId === 'pro_sekolah' ||
        selectedPlanId === 'sekolah_pro';
      const cleanTeacherPin = teacherPinInput.trim();
      if (isSchoolCollectiveLicenseCode(trimmed) && cleanTeacherPin.length < 2) {
        setStatusMessage({
          text: 'Lisensi Kolektif Sekolah (25 Guru) mewajibkan Nama Singkat / PIN Pribadi Guru minimal 2 karakter agar kursi (maks. 2 perangkat per guru) tidak bentrok dengan guru lain.',
          isError: true,
        });
        return;
      }

      // 1. Verifikasi apakah kode berasal dari Mayar / Registry AsesMerdeka & klaim seat (Individu 2 perangkat / Sekolah 25 Guru × 2 perangkat)
      const mayarVerify = await verifyMayarLicenseOnline(
        trimmed,
        quota.deviceId,
        isSchoolLicenseKey ? cleanTeacherPin : undefined
      );
      if (!mayarVerify.valid) {
        setStatusMessage({
          text:
            mayarVerify.message ||
            'Kode lisensi tidak valid. Pastikan Anda memasukkan kode lisensi yang dikirim oleh Mayar.id atau Mitra Resmi.',
          isError: true,
        });
        return;
      }

      // 2. Jika Cloud Seat Tracker URL diaktifkan, verifikasi kuota kursi perangkat lintas internet terlebih dahulu
      if (getCloudSeatTrackerUrl()) {
        const onlineCheck = await verifyAndClaimSeatOnline(trimmed, quota.deviceId);
        if (!onlineCheck.allowed) {
          setStatusMessage({
            text:
              onlineCheck.message ||
              `Aktivasi Ditolak! Kode lisensi ini sudah mencapai batas maksimal perangkat (${onlineCheck.usedSeats}/${onlineCheck.maxSeats}).`,
            isError: true,
          });
          return;
        }
      }

      const res = activateLicense(trimmed, {
        teacherPin: isSchoolLicenseKey ? cleanTeacherPin : undefined,
        expiresAt: mayarVerify.expiresAt,
      });
      if (res.success) {
        onUpdateQuota(res.quota);
        setLicenseInput('');
        setShowChangeLicense(false);
        if (teacherPinInput.trim()) {
          saveTeacherSyncPin(teacherPinInput.trim());
        }

        // 3. Otomatis cek apakah ada riwayat pengisian dari perangkat sebelumnya (misal dari HP ke Laptop)
        const pullRes = await pullWorkspaceFromCloud(trimmed, teacherPinInput.trim());
        refreshCloudSyncSnapshot();
        if (pullRes.ok && pullRes.found && pullRes.restoredCount > 0) {
          setStatusMessage({
            text: `${res.message} ${pullRes.message}`,
            isError: false,
          });
          if (onRestoredFromCloud) {
            onRestoredFromCloud();
          }
        } else if (pullRes.pinReverificationRequired) {
          setStatusMessage({
            text: `${res.message} ${pullRes.message} Selesaikan verifikasi PIN pada panel pemulihan di bawah (lisensi Anda tetap aktif).`,
            isError: true,
          });
        } else {
          // Jika belum ada data di cloud, unggah data perangkat saat ini sebagai data awal lisensi
          const pushRes = await pushWorkspaceToCloud(trimmed, teacherPinInput.trim());
          refreshCloudSyncSnapshot();
          if (pushRes.conflict) {
            setStatusMessage({
              text: `${res.message} Konflik sinkronisasi terdeteksi! Silakan pilih strategi penggabungan pada Panel Resolusi Konflik di bawah.`,
              isError: true,
            });
          } else if (pushRes.pinReverificationRequired) {
            setStatusMessage({
              text: `${res.message} ${pushRes.message} Selesaikan verifikasi PIN pada panel pemulihan di bawah (lisensi Anda tetap aktif).`,
              isError: true,
            });
          } else if (pushRes.ok && pushRes.cloudConfigured === false) {
            setStatusMessage({
              text: `${res.message} Catatan: Cloud Redis belum dikonfigurasi pada server ini, sehingga data tersimpan lokal pada memori perangkat.`,
              isError: false,
            });
          } else if (pushRes.ok && pushRes.cloudConfigured) {
            setStatusMessage({
              text: `${res.message} Sinkronisasi Cloud antar perangkat (HP ↔ Laptop) kini aktif (Revisi #${pushRes.revision || 1})!`,
              isError: false,
            });
          } else {
            setStatusMessage({
              text: `${res.message} (${pushRes.message})`,
              isError: !pushRes.ok,
            });
          }
        }
      } else {
        setStatusMessage({
          text: res.message,
          isError: true,
        });
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleSubmitLegacyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const submittedCurrentPin = recoveryCurrentPin;
    const submittedNewPin = recoveryNewPin;
    const submittedConfirmPin = recoveryConfirmPin;

    // Segera kosongkan input PIN agar tidak tersimpan atau tampil ulang di state/DOM
    setRecoveryCurrentPin('');
    setRecoveryNewPin('');
    setRecoveryConfirmPin('');
    setRecoveryFeedback(null);
    setIsSyncingCloud(true);

    try {
      const res = await submitLegacyPinRecovery({
        mode: recoveryMode,
        currentPin: submittedCurrentPin,
        newPin: submittedNewPin,
        confirmNewPin: submittedConfirmPin,
        licenseCode: quota.licenseKey,
        resumeAction: pendingPinRecovery?.failedAction || 'pull',
      });
      refreshCloudSyncSnapshot();
      setTeacherPinInput(getSavedTeacherSyncPin());
      setStatusMessage({ text: res.message, isError: !res.ok });
      if (res.ok) {
        setRecoveryFeedback(null);
        if (res.resumedAction === 'pull' && (res.restoredCount || 0) > 0 && onRestoredFromCloud) {
          onRestoredFromCloud();
        }
      } else {
        const extraHint = res.rateLimited
          ? ` (Batas percobaan sementara aktif${res.retryAfterSeconds ? `, tunggu ${res.retryAfterSeconds} detik` : ''}). Data Anda tetap aman.`
          : res.redisUnavailable
          ? ' Data lokal Anda tetap utuh dan tidak dihapus.'
          : '';
        setRecoveryFeedback({
          text: `${res.message}${extraHint}`,
          isError: true,
        });
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveGeminiKey(apiKeyInput);
    setStatusMessage({
      text: 'API Key Gemini berhasil disimpan untuk akun PRO Anda.',
      isError: false,
    });
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(quota.deviceId);
    setCopiedDevice(true);
    setTimeout(() => setCopiedDevice(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        isUnlocked
          ? `Lisensi ${tierName} Aktif Permanen`
          : 'Aktivasi Lisensi Resmi — Cukup Sekali Beli'
      }
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
          width: '100%',
          maxWidth: 'min(680px, calc(100vw - 24px))',
          maxHeight: '92vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: isPro ? '#d1fae5' : '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isUnlocked ? <ShieldCheck size={22} color="#059669" /> : <CreditCard size={20} color="#2563eb" />}
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                {isUnlocked ? `Lisensi ${tierName} Aktif Permanen` : 'Aktivasi Lisensi Resmi — Cukup Sekali Beli'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isUnlocked
                  ? `Status: LISENSI ${badgeName} AKTIF • Kode: ${quota.licenseKey || 'RESMI'} (${
                      activeSeatInfo ? `${Math.max(1, activeSeatInfo.usedSeats)}/${activeSeatInfo.maxSeats}` : '1/1'
                    } ${quota.tier === 'sekolah' || quota.tier === 'sekolah_pro' ? 'Guru' : 'Perangkat'})`
                  : 'Mode Pratinjau (Lihat Fitur) — Aktifkan Lisensi untuk Buat & Unduh Dokumen Tanpa Batas'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{ padding: 6, borderRadius: '50%' }}
            aria-label="Tutup jendela lisensi"
            title="Tutup jendela lisensi"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Status Message Alert */}
        {statusMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: statusMessage.isError ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${statusMessage.isError ? '#ef4444' : '#10b981'}`,
              color: statusMessage.isError ? '#b91c1c' : '#15803d',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Lifecycle Status Notice when previously licensed (Expired / Revoked / Suspended) */}
        {!isUnlocked &&
          lastLicenseStatus &&
          (lastLicenseStatus.state === 'expired' ||
            lastLicenseStatus.state === 'revoked' ||
            lastLicenseStatus.state === 'suspended') && (
            <div
              data-testid="license-lifecycle-notice"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#fffbeb',
                border: '1px solid #f59e0b',
                color: '#92400e',
                fontSize: 12.5,
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4 }}>
                {lastLicenseStatus.state === 'expired'
                  ? 'Masa Berlaku Lisensi Telah Berakhir'
                  : lastLicenseStatus.state === 'suspended'
                  ? 'Lisensi Sedang Ditangguhkan / Kursi Guru Dinonaktifkan'
                  : 'Lisensi Dinonaktifkan / Dicabut'}
              </div>
              <div>
                {lastLicenseStatus.message ||
                  'Aplikasi beralih ke Mode Pratinjau. Silakan aktivasi ulang atau perpanjang lisensi Anda.'}
              </div>
              <div style={{ marginTop: 6, fontWeight: 700, color: '#065f46' }}>
                Seluruh data siswa, nilai, presensi, jurnal, dan e-Rapor di perangkat Anda tetap utuh 100% dan tidak dihapus.
              </div>
            </div>
          )}

        {/* Device Fingerprint Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              ID Perangkat Lisensi (Anti-Kloning) • Status:{' '}
              {isUnlocked ? `LISENSI ${badgeName} TERKUNCI` : 'MODE PRATINJAU (BELUM AKTIVASI)'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
              {quota.deviceId}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handleCopyDeviceId}
              className="btn btn-outline btn-sm"
              style={{ fontSize: 11, padding: '5px 10px' }}
              title="Salin ID Perangkat Anda untuk pemesanan lisensi"
            >
              {copiedDevice ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              {copiedDevice ? 'ID Tersalin' : 'Salin ID Perangkat'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Hanya tampil jika sudah PRO untuk pengaturan API Key opsional) */}
        {isPro && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 16,
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveSubTab('order')}
              className={`btn btn-sm ${activeSubTab === 'order' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 12 }}
            >
              <Sparkles size={13} /> Status Lisensi & Sinkronisasi Cloud
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('byok')}
              className={`btn btn-sm ${activeSubTab === 'byok' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 12 }}
            >
              <CreditCard size={13} /> Kustom API Key (PRO)
            </button>
          </div>
        )}

        {/* LAYAR UTAMA: JIKA SUDAH AKTIVASI -> TAMPILKAN SERTIFIKAT LISENSI AKTIF & CLOUD SYNC */}
        {activeSubTab === 'order' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isUnlocked && (
              <>
                {/* 1. Kartu Sertifikat Lisensi Aktif Permanen */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                    border: '2px solid #10b981',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 99,
                          background: '#059669',
                          color: '#ffffff',
                          display: 'inline-block',
                          marginBottom: 6,
                          letterSpacing: '0.03em',
                        }}
                      >
                        ✓ TERVERIFIKASI RESMI • AKTIF SELAMANYA (LIFETIME)
                      </span>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#064e3b' }}>
                        Paket {tierName}
                      </div>
                      <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                        Seluruh fitur generator AI, dokumen kurikulum, dan unduhan Word (.docx) / ZIP bebas batas kuota & tanpa watermark.
                      </div>
                    </div>
                  </div>

                  {/* Ringkasan Kode Lisensi & Kuota Perangkat */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 10,
                      background: '#ffffff',
                      border: '1px solid #a7f3d0',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Kode Lisensi Anda (Simpan untuk Perangkat ke-2)
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <code
                          style={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: '#065f46',
                            background: '#ecfdf5',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          {quota.licenseKey || 'RESMI'}
                        </code>
                        {quota.licenseKey && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(quota.licenseKey || '');
                              setCopiedLicenseKey(true);
                              setTimeout(() => setCopiedLicenseKey(false), 2000);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11, padding: '3px 8px', background: '#ffffff' }}
                          >
                            {copiedLicenseKey ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            {copiedLicenseKey ? 'Kode Tersalin' : 'Salin Kode'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Kuota Perangkat & Masa Aktif
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginTop: 5 }}>
                        {activeSeatInfo
                          ? quota.tier === 'sekolah' || quota.tier === 'sekolah_pro'
                            ? `${Math.max(1, activeSeatInfo.usedSeats)} dari ${activeSeatInfo.maxSeats} Kursi Guru Aktif`
                            : `${Math.max(1, activeSeatInfo.usedSeats)} dari ${activeSeatInfo.maxSeats} Perangkat Aktif`
                          : '1 Perangkat Aktif'}
                      </div>
                      <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                        {quota.tier === 'sekolah' || quota.tier === 'sekolah_pro'
                          ? 'Lisensi Kolektif Sekolah (Maks. 25 Guru × 2 Perangkat/Guru)'
                          : 'Dapat dipakai di Laptop/Komputer & HP Anda (Maks. 2 Perangkat)'}
                      </div>
                      {quota.expiresAt && (
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginTop: 2 }}>
                          Berlaku hingga: {new Date(quota.expiresAt).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Daftar Hak Akses Aktif */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                      gap: 8,
                      fontSize: 12,
                      color: '#064e3b',
                      fontWeight: 600,
                    }}
                  >
                    {[
                      'Generator Soal Evaluasi, Kisi-kisi & Kunci Jawaban AI Tanpa Batas',
                      'Generator Rangkuman Materi, LKPD & Modul Ajar Otomatis',
                      'ATP, Prota, Promes, Jurnal Mengajar, Presensi & Nilai Rapor',
                      'Unduh Word (.docx) Resmi & Paket Supervisi (.zip) Tanpa Watermark',
                    ].map((benefit, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <CheckCircle2 size={14} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Panel Sinkronisasi Cloud Antar Perangkat (HP <-> Laptop) */}
                {quota.licenseKey && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        ☁️ Sinkronisasi Riwayat Antar Perangkat (HP ↔ Laptop/Komputer)
                      </span>
                      {pendingConflict ? (
                        <span
                          data-testid="cloud-sync-status-badge"
                          style={{
                            fontSize: 11,
                            color: '#b91c1c',
                            fontWeight: 700,
                            background: '#fef2f2',
                            padding: '2px 8px',
                            borderRadius: 99,
                            border: '1px solid #fecaca',
                          }}
                        >
                          ⚠️ Konflik Revisi #{pendingConflict.serverRevision}
                        </span>
                      ) : pendingPinRecovery ? (
                        <span
                          data-testid="cloud-sync-status-badge"
                          style={{
                            fontSize: 11,
                            color: '#b45309',
                            fontWeight: 700,
                            background: '#fffbeb',
                            padding: '2px 8px',
                            borderRadius: 99,
                            border: '1px solid #fcd34d',
                          }}
                        >
                          🔒 Perlu Verifikasi Ulang PIN Legacy
                        </span>
                      ) : cloudUiStatus === 'sync_error' ? (
                        <span
                          data-testid="cloud-sync-status-badge"
                          style={{
                            fontSize: 11,
                            color: '#b91c1c',
                            fontWeight: 700,
                            background: '#fef2f2',
                            padding: '2px 8px',
                            borderRadius: 99,
                            border: '1px solid #fecaca',
                          }}
                        >
                          ⚠️ Sinkronisasi Terkendala / Server Tidak Tersedia
                        </span>
                      ) : cloudConfigured === false ? (
                        <span
                          data-testid="cloud-sync-status-badge"
                          style={{
                            fontSize: 11,
                            color: '#92400e',
                            fontWeight: 700,
                            background: '#fffbeb',
                            padding: '2px 8px',
                            borderRadius: 99,
                            border: '1px solid #fde68a',
                          }}
                        >
                          Mode Dev Lokal (Cloud Redis Belum Dikonfigurasi)
                        </span>
                      ) : cloudConfigured === true && lastSyncTime ? (
                        <span
                          data-testid="cloud-sync-status-badge"
                          style={{
                            fontSize: 11,
                            color: '#059669',
                            fontWeight: 700,
                            background: '#ecfdf5',
                            padding: '2px 8px',
                            borderRadius: 99,
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          ✓ Tersinkron{baseRevision ? ` (Rev #${baseRevision})` : ''}:{' '}
                          {new Date(lastSyncTime).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : null}
                    </div>

                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                      {cloudConfigured === false
                        ? 'Server lokal saat ini menggunakan memori dev tanpa Upstash Redis, sehingga data hanya bertahan selama sesi dev berjalan dan tetap tersimpan di peramban perangkat ini.'
                        : 'Identitas sekolah, pengaturan kelas, daftar siswa, nilai harian, dan bank soal Anda tersimpan dengan kontrol revisi atomik (OCC) pada kode lisensi ini agar perubahan dari perangkat lain tidak tertimpa diam-diam.'}
                    </p>

                    {cloudUiStatus === 'sync_error' && lastSyncErrorDetail && (
                      <div
                        data-testid="cloud-sync-error-detail"
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fcd34d',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>
                          {lastSyncErrorDetail.kind === 'payload_too_large'
                            ? 'Batas Ukuran Payload Cloud Sync (HTTP 413)'
                            : lastSyncErrorDetail.kind === 'partial_sync'
                              ? `Sinkronisasi Bertahap Terhenti${
                                  lastSyncErrorDetail.failedChunkIndex !== undefined &&
                                  lastSyncErrorDetail.totalChunks
                                    ? ` (Bagian ${lastSyncErrorDetail.failedChunkIndex + 1}/${lastSyncErrorDetail.totalChunks})`
                                    : ''
                                }`
                              : lastSyncErrorDetail.kind === 'timeout'
                                ? 'Batas Waktu Permintaan Habis (HTTP 408)'
                                : lastSyncErrorDetail.kind === 'rate_limited'
                                  ? 'Batas Percobaan Sementara (HTTP 429)'
                                  : lastSyncErrorDetail.kind === 'server_unavailable'
                                    ? 'Server Penyimpanan Cloud Sementara Tidak Tersedia'
                                    : 'Kendala Koneksi Sinkronisasi Cloud'}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#78350f', lineHeight: 1.45 }}>
                          {lastSyncErrorDetail.message}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46' }}>
                          Seluruh draf lokal di peramban Anda dan ekspor dokumen Word (.docx) tetap aman 100%.
                        </div>
                      </div>
                    )}

                    {(quota.tier === 'sekolah' ||
                      quota.tier === 'sekolah_pro' ||
                      isSchoolCollectiveLicenseCode(quota.licenseKey)) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>ID/PIN Pribadi Guru:</span>
                        <input
                          type="password"
                          autoComplete="off"
                          className="form-input"
                          placeholder="Misal: FAJAR88"
                          value={teacherPinInput}
                          onChange={(e) => {
                            setTeacherPinInput(e.target.value);
                            saveTeacherSyncPin(e.target.value);
                          }}
                          style={{ fontSize: 12, padding: '5px 10px', maxWidth: 180 }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={isSyncingCloud}
                        onClick={async () => {
                          setRecoveryFeedback(null);
                          setIsSyncingCloud(true);
                          try {
                            const res = await pushWorkspaceToCloud(quota.licenseKey, teacherPinInput);
                            refreshCloudSyncSnapshot();
                            setStatusMessage({ text: res.message, isError: !res.ok });
                          } finally {
                            setIsSyncingCloud(false);
                          }
                        }}
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: 12 }}
                      >
                        ☁️ Simpan Riwayat ke Cloud Sekarang
                      </button>

                      <button
                        type="button"
                        disabled={isSyncingCloud}
                        onClick={async () => {
                          setRecoveryFeedback(null);
                          setIsSyncingCloud(true);
                          try {
                            const res = await pullWorkspaceFromCloud(quota.licenseKey, teacherPinInput);
                            refreshCloudSyncSnapshot();
                            setStatusMessage({ text: res.message, isError: !res.ok });
                            if (res.ok && res.found && onRestoredFromCloud) {
                              onRestoredFromCloud();
                            }
                          } finally {
                            setIsSyncingCloud(false);
                          }
                        }}
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 12, background: '#ffffff' }}
                      >
                        🔄 Ambil Riwayat dari Perangkat Lain (HP/Laptop)
                      </button>
                    </div>

                    {/* Panel Pemulihan & Migrasi Keamanan PIN Legacy */}
                    {pendingPinRecovery && (
                      <form
                        onSubmit={handleSubmitLegacyRecovery}
                        data-testid="cloud-pin-recovery-panel"
                        style={{
                          marginTop: 4,
                          padding: '12px 14px',
                          background: '#fffbeb',
                          border: '1px solid #fcd34d',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Lock size={14} /> Pemulihan &amp; Verifikasi Ulang PIN Cloud Sync
                          </span>
                          <span style={{ fontSize: 11.5, color: '#78350f', lineHeight: 1.5 }}>
                            Masa transisi keamanan PIN lama telah berakhir. Data siswa, presensi, jurnal mengajar, nilai, dan e-Rapor Anda tetap aman dan tidak terhapus. Anda juga tidak perlu mengaktifkan ulang lisensi — silakan verifikasi ulang menggunakan PIN lama atau ganti ke PIN baru untuk melanjutkan sinkronisasi:
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            data-testid="recovery-mode-reverify"
                            disabled={isSyncingCloud}
                            onClick={() => {
                              setRecoveryMode('reverify');
                              setRecoveryFeedback(null);
                            }}
                            style={{
                              flex: '1 1 165px',
                              padding: '7px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border:
                                recoveryMode === 'reverify'
                                  ? '1.5px solid #d97706'
                                  : '1px solid #cbd5e1',
                              background: recoveryMode === 'reverify' ? '#fef3c7' : '#ffffff',
                              color: '#78350f',
                            }}
                          >
                            1. Verifikasi Ulang PIN Lama
                          </button>
                          <button
                            type="button"
                            data-testid="recovery-mode-replace"
                            disabled={isSyncingCloud}
                            onClick={() => {
                              setRecoveryMode('replace');
                              setRecoveryFeedback(null);
                            }}
                            style={{
                              flex: '1 1 165px',
                              padding: '7px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border:
                                recoveryMode === 'replace'
                                  ? '1.5px solid #2563eb'
                                  : '1px solid #cbd5e1',
                              background: recoveryMode === 'replace' ? '#eff6ff' : '#ffffff',
                              color: '#1e3a8a',
                            }}
                          >
                            2. Verifikasi &amp; Ganti ke PIN Baru
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label
                              htmlFor="recovery-current-pin"
                              style={{ fontSize: 11.5, fontWeight: 700, color: '#78350f' }}
                            >
                              PIN Guru Lama / Saat Ini
                            </label>
                            <input
                              id="recovery-current-pin"
                              data-testid="recovery-current-pin-input"
                              type="password"
                              autoComplete="off"
                              spellCheck={false}
                              disabled={isSyncingCloud}
                              className="form-input"
                              placeholder="Masukkan PIN lama Anda"
                              value={recoveryCurrentPin}
                              onChange={(e) => setRecoveryCurrentPin(e.target.value)}
                              style={{
                                fontSize: 12,
                                padding: '7px 10px',
                                width: '100%',
                                boxSizing: 'border-box',
                                background: '#ffffff',
                              }}
                            />
                          </div>

                          {recoveryMode === 'replace' && (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: 8,
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label
                                  htmlFor="recovery-new-pin"
                                  style={{ fontSize: 11.5, fontWeight: 700, color: '#1e3a8a' }}
                                >
                                  PIN Guru Baru (Min. 2 karakter)
                                </label>
                                <input
                                  id="recovery-new-pin"
                                  data-testid="recovery-new-pin-input"
                                  type="password"
                                  autoComplete="off"
                                  spellCheck={false}
                                  disabled={isSyncingCloud}
                                  className="form-input"
                                  placeholder="Masukkan PIN baru"
                                  value={recoveryNewPin}
                                  onChange={(e) => setRecoveryNewPin(e.target.value)}
                                  style={{
                                    fontSize: 12,
                                    padding: '7px 10px',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: '#ffffff',
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label
                                  htmlFor="recovery-confirm-pin"
                                  style={{ fontSize: 11.5, fontWeight: 700, color: '#1e3a8a' }}
                                >
                                  Konfirmasi PIN Guru Baru
                                </label>
                                <input
                                  id="recovery-confirm-pin"
                                  data-testid="recovery-confirm-pin-input"
                                  type="password"
                                  autoComplete="off"
                                  spellCheck={false}
                                  disabled={isSyncingCloud}
                                  className="form-input"
                                  placeholder="Ulangi PIN baru"
                                  value={recoveryConfirmPin}
                                  onChange={(e) => setRecoveryConfirmPin(e.target.value)}
                                  style={{
                                    fontSize: 12,
                                    padding: '7px 10px',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: '#ffffff',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {recoveryFeedback && (
                          <div
                            data-testid="recovery-feedback-alert"
                            style={{
                              padding: '8px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              lineHeight: 1.45,
                              background: recoveryFeedback.isError ? '#fef2f2' : '#ecfdf5',
                              border: `1px solid ${recoveryFeedback.isError ? '#fecaca' : '#a7f3d0'}`,
                              color: recoveryFeedback.isError ? '#b91c1c' : '#065f46',
                            }}
                          >
                            {recoveryFeedback.text}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            type="submit"
                            data-testid="recovery-submit-button"
                            disabled={isSyncingCloud}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 12 }}
                          >
                            {isSyncingCloud
                              ? '⏳ Memproses Verifikasi...'
                              : recoveryMode === 'replace'
                              ? '🔒 Verifikasi, Perbarui PIN & Lanjutkan Sync'
                              : '✓ Verifikasi PIN Lama & Lanjutkan Sync'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Panel Resolusi Konflik Sinkronisasi */}
                    {pendingConflict && (
                      <div
                        data-testid="cloud-conflict-panel"
                        style={{
                          marginTop: 4,
                          padding: '12px 14px',
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#9f1239' }}>
                            ⚠️ Panel Resolusi Konflik Sinkronisasi (Server Revisi #{pendingConflict.serverRevision})
                          </span>
                          <span style={{ fontSize: 11.5, color: '#881337', lineHeight: 1.45 }}>
                            Perangkat lain ({pendingConflict.lastDeviceId || 'Perangkat Lain'}) telah menyimpan revisi lebih baru
                            {pendingConflict.serverUpdatedAt
                              ? ` pada ${new Date(pendingConflict.serverUpdatedAt).toLocaleString('id-ID')}`
                              : ''}
                            , sementara perangkat ini berbasis Revisi #{pendingConflict.baseRevision ?? 0}. Pilih cara penyelesaian agar tidak ada data yang hilang diam-diam:
                          </span>
                        </div>

                        {pendingConflict.autoMergedSummary.length > 0 && (
                          <div
                            style={{
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              borderRadius: 6,
                              padding: '8px 10px',
                              fontSize: 11,
                              color: '#065f46',
                            }}
                          >
                            <strong>Perubahan non-bentrok siap digabung otomatis:</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                              {pendingConflict.autoMergedSummary.map((line, idx) => (
                                <li key={idx}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {pendingConflict.conflicts.length > 0 && (
                          <div
                            style={{
                              maxHeight: 230,
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                            }}
                          >
                            {pendingConflict.conflicts.map((item) => {
                              const selectedChoice =
                                conflictChoices[item.id] || item.defaultChoice || 'local';
                              return (
                                <div
                                  key={item.id}
                                  data-testid={`conflict-item-${item.id}`}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #fecdd3',
                                    borderRadius: 6,
                                    padding: '8px 10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                  }}
                                >
                                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1e293b' }}>
                                    {item.label} <span style={{ color: '#64748b', fontWeight: 500 }}>({item.fieldLabel})</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConflictChoices((prev) => ({
                                          ...prev,
                                          [item.id]: 'local',
                                        }))
                                      }
                                      style={{
                                        flex: '1 1 140px',
                                        textAlign: 'left',
                                        padding: '6px 8px',
                                        borderRadius: 6,
                                        fontSize: 11,
                                        cursor: 'pointer',
                                        border:
                                          selectedChoice === 'local'
                                            ? '1.5px solid #2563eb'
                                            : '1px solid #cbd5e1',
                                        background: selectedChoice === 'local' ? '#eff6ff' : '#f8fafc',
                                        color: '#0f172a',
                                      }}
                                    >
                                      <strong>Versi Perangkat Ini:</strong>{' '}
                                      {formatConflictPreviewValue(item.localValue)}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConflictChoices((prev) => ({
                                          ...prev,
                                          [item.id]: 'server',
                                        }))
                                      }
                                      style={{
                                        flex: '1 1 140px',
                                        textAlign: 'left',
                                        padding: '6px 8px',
                                        borderRadius: 6,
                                        fontSize: 11,
                                        cursor: 'pointer',
                                        border:
                                          selectedChoice === 'server'
                                            ? '1.5px solid #059669'
                                            : '1px solid #cbd5e1',
                                        background: selectedChoice === 'server' ? '#ecfdf5' : '#f8fafc',
                                        color: '#0f172a',
                                      }}
                                    >
                                      <strong>Versi Cloud:</strong>{' '}
                                      {formatConflictPreviewValue(item.serverValue)}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={isSyncingCloud}
                            onClick={async () => {
                              setIsSyncingCloud(true);
                              try {
                                const res = await resolveCloudConflict('merge_safe', {
                                  choices: conflictChoices,
                                  allowDefaultForUnchosen: true,
                                });
                                refreshCloudSyncSnapshot();
                                setStatusMessage({ text: res.message, isError: !res.ok });
                                if (res.ok && onRestoredFromCloud) {
                                  onRestoredFromCloud();
                                }
                              } finally {
                                setIsSyncingCloud(false);
                              }
                            }}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11.5 }}
                          >
                            Gabungkan Aman (Safe Merge)
                          </button>

                          <button
                            type="button"
                            disabled={isSyncingCloud}
                            onClick={async () => {
                              setIsSyncingCloud(true);
                              try {
                                const res = await resolveCloudConflict('use_server');
                                refreshCloudSyncSnapshot();
                                setStatusMessage({ text: res.message, isError: !res.ok });
                                if (res.ok && onRestoredFromCloud) {
                                  onRestoredFromCloud();
                                }
                              } finally {
                                setIsSyncingCloud(false);
                              }
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: 11.5, background: '#ffffff' }}
                          >
                            Gunakan Versi Cloud (Rev #{pendingConflict.serverRevision})
                          </button>

                          <button
                            type="button"
                            disabled={isSyncingCloud}
                            onClick={async () => {
                              setIsSyncingCloud(true);
                              try {
                                const res = await resolveCloudConflict('force_local');
                                refreshCloudSyncSnapshot();
                                setStatusMessage({ text: res.message, isError: !res.ok });
                              } finally {
                                setIsSyncingCloud(false);
                              }
                            }}
                            className="btn btn-sm btn-outline"
                            style={{
                              fontSize: 11.5,
                              background: '#ffffff',
                              color: '#9f1239',
                              borderColor: '#fda4af',
                            }}
                          >
                            Pertahankan Versi Perangkat Ini
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Backup Otomatis Pra-Konflik */}
                    {preConflictBackup && (
                      <div
                        data-testid="cloud-preconflict-backup"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                          padding: '8px 10px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          fontSize: 11,
                          color: '#334155',
                        }}
                      >
                        <span>
                          Snapshot cadangan pra-konflik tersedia (
                          {new Date(preConflictBackup.savedAt).toLocaleTimeString('id-ID')})
                        </span>
                        <button
                          type="button"
                          disabled={isSyncingCloud}
                          onClick={() => {
                            const res = restorePreConflictBackup();
                            refreshCloudSyncSnapshot();
                            setStatusMessage({ text: res.message, isError: !res.ok });
                            if (res.ok && onRestoredFromCloud) {
                              onRestoredFromCloud();
                            }
                          }}
                          className="btn btn-sm btn-outline"
                          style={{ fontSize: 11, background: '#ffffff', padding: '3px 8px' }}
                        >
                          Pulihkan Snapshot Pra-Konflik
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tombol Selesai & Opsi Ganti Kode / Upgrade Paket (Tersembunyi Rapi Secara Default) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowChangeLicense((prev) => !prev)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11.5, color: '#475569' }}
                  >
                    <Key size={13} />
                    {showChangeLicense
                      ? 'Sembunyikan Opsi Ganti Kode / Paket Lain'
                      : 'Ganti Kode Lisensi / Lihat Paket Sekolah'}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-success"
                    style={{ padding: '9px 20px', fontSize: 13, fontWeight: 800 }}
                  >
                    ✓ Selesai & Lanjutkan Buat Perangkat Ajar
                  </button>
                </div>
              </>
            )}

            {/* TAMPILKAN PILIHAN PAKET & FORM INPUT KODE HANYA JIKA BELUM AKTIVASI ATAU KLIK "GANTI KODE" */}
            {(!isUnlocked || showChangeLicense) && (
              <>
                {/* 1. Pilihan 2 Paket Utama (Guru Mandiri & Kolektif Sekolah) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {PUBLIC_VISIBLE_PLAN_IDS.map((planKey) => {
                    const plan = ONE_TIME_PLANS[planKey];
                    const isSelected = safeSelectedPlanId === planKey;
                    const isSchoolPlan = planKey === 'pro_sekolah';

                    let cardBorder = '1px solid var(--border-subtle)';
                    let cardBg = '#ffffff';
                    if (isSelected) {
                      cardBorder = isSchoolPlan ? '2px solid #059669' : '2px solid #2563eb';
                      cardBg = isSchoolPlan ? '#ecfdf5' : '#eff6ff';
                    }

                    return (
                      <div
                        key={plan.id}
                        data-testid={`license-plan-card-${plan.id}`}
                        onClick={() => setSelectedPlanId(plan.id)}
                        style={{
                          border: cardBorder,
                          background: cardBg,
                          padding: '16px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: '3px 9px',
                              borderRadius: 99,
                              background: isSchoolPlan ? '#d1fae5' : '#dbeafe',
                              color: isSchoolPlan ? '#065f46' : '#1e40af',
                              display: 'inline-block',
                              marginBottom: 8,
                            }}
                          >
                            {plan.badge}
                          </span>

                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>{plan.name}</div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0 4px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: 21,
                                fontWeight: 900,
                                color: isSchoolPlan ? '#059669' : '#2563eb',
                              }}
                            >
                              {plan.priceFormatted}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                color: '#94a3b8',
                                textDecoration: 'line-through',
                                fontWeight: 600,
                              }}
                            >
                              {plan.originalPriceFormatted}
                            </span>
                            <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 700 }}>• Sekali Bayar</span>
                          </div>

                          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.45 }}>
                            {plan.subtitle}
                          </p>

                          <div
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: isSchoolPlan ? '#065f46' : '#1e3a8a',
                              background: isSchoolPlan ? '#ecfdf5' : '#f8fafc',
                              border: `1px solid ${isSchoolPlan ? '#a7f3d0' : '#e2e8f0'}`,
                              borderRadius: 8,
                              padding: '6px 10px',
                              marginBottom: 10,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Users size={13} style={{ flexShrink: 0 }} aria-hidden="true" />
                            <span>{plan.targetAudience}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5, color: '#334155' }}>
                            {plan.features.map((feat, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                <CheckCircle2
                                  size={13}
                                  color={isSchoolPlan ? '#059669' : '#2563eb'}
                                  style={{ marginTop: 2, flexShrink: 0 }}
                                />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPurchaseFlow(plan.id);
                          }}
                          className={`btn ${isSchoolPlan ? 'btn-success' : 'btn-primary'}`}
                          style={{
                            width: '100%',
                            minHeight: 44,
                            padding: '10px 14px',
                            fontSize: 13,
                            fontWeight: 800,
                            whiteSpace: 'normal',
                            lineHeight: 1.35,
                            textAlign: 'center',
                          }}
                        >
                          <MessageCircle size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
                          <span>Beli {plan.name} ({plan.priceFormatted})</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Tombol Utama Lanjutkan Pembelian Paket Terpilih */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenPurchaseFlow(currentPlan.id)}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      minHeight: 46,
                      padding: '12px 18px',
                      fontSize: 14,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      whiteSpace: 'normal',
                      lineHeight: 1.35,
                      textAlign: 'center',
                    }}
                  >
                    <MessageCircle size={17} style={{ flexShrink: 0 }} aria-hidden="true" />
                    <span>
                      Beli {currentPlan.name} ({currentPlan.priceFormatted}) — Info Pembelian &amp; WhatsApp Admin
                    </span>
                  </button>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.45 }}>
                    Pembelian online otomatis melalui website sementara belum aktif. Klik tombol di atas untuk panduan pemesanan melalui WhatsApp Admin atau masukkan kode lisensi di bawah.
                  </div>
                </div>

                {/* 3. Kolom Aktivasi Kode Lisensi (Dilengkapi Kunci Perangkat Anti-Jual Ulang) */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Key size={15} color="#2563eb" />
                      <h3 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-main)' }}>
                        {isUnlocked
                          ? 'Ganti Kode Lisensi / Masukkan Kode Paket Sekolah:'
                          : 'Sudah Membayar / Punya Kode dari Mitra? Masukkan Kode Lisensi:'}
                      </h3>
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 8px',
                        borderRadius: 99,
                        border: '1px solid #fde68a',
                      }}
                    >
                      🔒 Terkunci ke Perangkat (Anti-Share)
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Setiap kode lisensi otomatis mengunci sidik jari perangkat (maksimal {maxIndividuSeats} perangkat pribadi untuk kode Individu) dan tidak dapat diperjualbelikan ulang.
                  </p>

                  <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Contoh: ASM-GM26-XXXX-XXXX-XXXX"
                        value={licenseInput}
                        onChange={(e) => setLicenseInput(e.target.value)}
                        style={{ fontSize: 13, fontFamily: 'monospace', flex: 1, minWidth: 210 }}
                        required
                      />
                      <button
                        type="submit"
                        disabled={isActivating}
                        className="btn btn-success"
                        style={{ whiteSpace: 'nowrap', padding: '10px 18px', fontWeight: 800 }}
                      >
                        {isActivating ? 'Memverifikasi & Sinkron...' : 'Aktivasi & Sinkronkan'}
                      </button>
                    </div>

                    {/* Jika kode sekolah atau sedang memilih paket sekolah, tampilkan input Nama/PIN Guru untuk pemisah data Cloud */}
                    {(isSchoolCollectiveLicenseCode(licenseInput) ||
                      selectedPlanId === 'pro_sekolah' ||
                      quota.tier === 'sekolah') && (
                      <div
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: 8,
                          padding: '10px 12px',
                        }}
                      >
                        <label
                          style={{
                            display: 'block',
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: '#065f46',
                            marginBottom: 4,
                          }}
                        >
                          👤 Nama Singkat / PIN Pribadi Guru (Khusus Lisensi Sekolah 25 Guru):
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Contoh: FAJAR_MATEMATIKA atau FAJAR88"
                          value={teacherPinInput}
                          onChange={(e) => {
                            setTeacherPinInput(e.target.value);
                            saveTeacherSyncPin(e.target.value);
                          }}
                          style={{ fontSize: 12.5, padding: '7px 10px', background: '#ffffff' }}
                          required={isSchoolCollectiveLicenseCode(licenseInput)}
                        />
                        <div style={{ fontSize: 11, color: '#047857', marginTop: 4 }}>
                          Digunakan agar riwayat kelas & soal Anda di HP dan Laptop tersinkronisasi khusus milik Anda sendiri tanpa tertukar dengan 24 guru lain di sekolah.
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: BYOK (HANYA MUNCUL JIKA SUDAH PRO) */}
        {activeSubTab === 'byok' && isPro && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
              Kustomisasi Google Gemini API Key (Khusus Pengguna PRO)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Sebagai pemilik Lisensi PRO, Anda juga dapat menghubungkan kunci Google Gemini API pribadi Anda untuk kecepatan pemrosesan kustom.
            </p>

            <form onSubmit={handleSaveApiKey} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                type="password"
                className="form-input"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <button type="submit" className="btn btn-secondary" style={{ whiteSpace: 'nowrap', padding: '0 16px' }}>
                Simpan Key
              </button>
            </form>

            <div style={{ fontSize: 11 }}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
              >
                Kelola API Key di Google AI Studio &rarr;
              </a>
            </div>
          </div>
        )}
      </motion.div>

      {/* MODAL PEMBERITAHUAN PEMBELIAN WHATSAPP ADMIN */}
      {whatsAppModalPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pembelian Online Sementara Belum Tersedia"
          data-testid="whatsapp-purchase-modal"
          onClick={() => setWhatsAppModalPlanId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #cbd5e1',
              boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.28)',
              maxWidth: 520,
              width: '100%',
              maxHeight: '90dvh',
              overflowY: 'auto',
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Info size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                    Pembelian Online Sementara Belum Tersedia
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
                    Pemesanan &amp; aktivasi lisensi dibantu langsung oleh Admin resmi AsesMerdeka
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppModalPlanId(null)}
                aria-label="Tutup modal pembelian WhatsApp"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  flexShrink: 0,
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
                fontSize: 13.5,
                color: '#334155',
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <p style={{ margin: 0 }}>Terima kasih atas minat Anda menggunakan AsesMerdeka.</p>
              <p style={{ margin: 0 }}>
                Saat ini pembayaran otomatis melalui website belum tersedia. Namun, Bapak/Ibu tetap dapat membeli lisensi AsesMerdeka dengan menghubungi Admin melalui WhatsApp.
              </p>
              <p style={{ margin: 0 }}>
                Admin akan membantu menjelaskan paket, proses pembelian, dan aktivasi lisensi.
              </p>
            </div>

            {/* Rincian Paket Pilihan */}
            <div
              data-testid="whatsapp-selected-plan-summary"
              style={{
                border: whatsAppModalPlan.id === 'pro_sekolah' ? '1.5px solid #10b981' : '1.5px solid #3b82f6',
                background: whatsAppModalPlan.id === 'pro_sekolah' ? '#ecfdf5' : '#eff6ff',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <strong style={{ fontSize: 15, color: '#0f172a' }}>{whatsAppModalPlan.name}</strong>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: '#ffffff',
                    color: whatsAppModalPlan.id === 'pro_sekolah' ? '#047857' : '#1d4ed8',
                    border: '1px solid currentColor',
                  }}
                >
                  {whatsAppModalPlan.badge}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: whatsAppModalPlan.id === 'pro_sekolah' ? '#047857' : '#1d4ed8',
                  }}
                >
                  {whatsAppModalPlan.priceFormatted}
                </span>
                <span style={{ fontSize: 12, color: '#64748b', textDecoration: 'line-through' }}>
                  {whatsAppModalPlan.originalPriceFormatted}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  • Harga Resmi Berlaku (Sekali Bayar)
                </span>
              </div>

              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>
                Cakupan Pengguna: {whatsAppModalPlan.targetAudience}
              </div>

              <ul style={{ margin: '2px 0 0 18px', padding: 0, fontSize: 12, color: '#334155', lineHeight: 1.55 }}>
                {whatsAppModalPlan.features.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            </div>

            {!whatsAppPurchaseUrl ? (
              <div
                role="alert"
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                Kontak WhatsApp Admin belum terkonfigurasi. Hubungi pengelola melalui Pusat Bantuan atau periksa konfigurasi helper WhatsApp.
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                Pesan otomatis sudah disiapkan dengan nama paket pilihan Anda dan masih dapat dibaca atau diubah sebelum dikirim di WhatsApp.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {whatsAppPurchaseUrl ? (
                <a
                  href={whatsAppPurchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success"
                  style={{
                    width: '100%',
                    minHeight: 46,
                    padding: '11px 16px',
                    fontSize: 14,
                    fontWeight: 800,
                    whiteSpace: 'normal',
                    lineHeight: 1.35,
                    textAlign: 'center',
                  }}
                >
                  <MessageCircle size={17} style={{ flexShrink: 0 }} aria-hidden="true" />
                  <span>Hubungi Admin via WhatsApp</span>
                  <ExternalLink size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn btn-outline"
                  style={{ width: '100%', minHeight: 46, fontWeight: 700, whiteSpace: 'normal' }}
                >
                  Hubungi Admin via WhatsApp (Kontak Belum Tersedia)
                </button>
              )}

              <button
                type="button"
                onClick={() => setWhatsAppModalPlanId(null)}
                className="btn btn-outline"
                style={{
                  width: '100%',
                  minHeight: 44,
                  padding: '10px 16px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  whiteSpace: 'normal',
                }}
              >
                <ArrowLeft size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
                <span>Kembali / Tutup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
