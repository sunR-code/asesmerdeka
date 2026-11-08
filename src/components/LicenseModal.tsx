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
  Link2,
} from 'lucide-react';
import type { UserQuota } from '../types/assessment';
import {
  activateLicense,
  saveGeminiKey,
  getSavedGeminiKey,
  computeLicenseCodeForDevice,
  generateSchoolBatchLicenses,
  verifyAdminKeygenPin,
  getConfiguredIndividuMaxDevices,
  setConfiguredIndividuMaxDevices,
  getLicenseSeatStatus,
  getCloudSeatTrackerUrl,
  saveCloudSeatTrackerUrl,
  verifyAndClaimSeatOnline,
  verifyMayarLicenseOnline,
  getMayarProductId,
  saveMayarProductId,
  getMayarSchoolProductId,
  saveMayarSchoolProductId,
  isLicensed,
  getTierDisplayName,
  getTierBadgeLabel,
} from '../utils/licenseManager';
import {
  ONE_TIME_PLANS,
  getMayarPaymentLink,
  saveMayarPaymentLinks,
  type OneTimePlanId,
} from '../utils/paymentGateway';
import {
  getSavedTeacherSyncPin,
  saveTeacherSyncPin,
  getLastCloudSyncAt,
  isSchoolCollectiveLicenseCode,
  pushWorkspaceToCloud,
  pullWorkspaceFromCloud,
} from '../utils/cloudSyncManager';

const GOOGLE_APPS_SCRIPT_TEMPLATE = `// Tempel kode ini di Google Sheet -> Extensions -> Apps Script -> Deploy as Web App (Anyone)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents);
    var code = String(body.licenseCode || '').toUpperCase().trim();
    var deviceId = String(body.deviceId || '').toUpperCase().trim();
    var maxSeats = Number(body.maxSeats || 2);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var devices = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === code) {
        if (devices.indexOf(String(data[i][1])) === -1) devices.push(String(data[i][1]));
      }
    }
    if (devices.indexOf(deviceId) !== -1) {
      return ContentService.createTextOutput(JSON.stringify({ allowed: true, usedSeats: devices.length, maxSeats: maxSeats })).setMimeType(ContentService.MimeType.JSON);
    }
    if (devices.length >= maxSeats) {
      return ContentService.createTextOutput(JSON.stringify({
        allowed: false,
        usedSeats: devices.length,
        maxSeats: maxSeats,
        message: 'Batas perangkat terlampaui (' + devices.length + '/' + maxSeats + ' perangkat). Kode lisensi sudah terkunci pada perangkat pemilik pertama dan tidak dapat dijual ulang.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    sheet.appendRow([code, deviceId, body.hardwareFp || '', new Date().toISOString()]);
    devices.push(deviceId);
    return ContentService.createTextOutput(JSON.stringify({ allowed: true, usedSeats: devices.length, maxSeats: maxSeats })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: UserQuota;
  onUpdateQuota: (newQuota: UserQuota) => void;
  onRestoredFromCloud?: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  quota,
  onUpdateQuota,
  onRestoredFromCloud,
}) => {
  const [licenseInput, setLicenseInput] = useState('');
  const [teacherPinInput, setTeacherPinInput] = useState(() => getSavedTeacherSyncPin());
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => getLastCloudSyncAt());
  const [apiKeyInput, setApiKeyInput] = useState(() => getSavedGeminiKey());
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedDevice, setCopiedDevice] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState<OneTimePlanId>('pro_individu');
  const [activeSubTab, setActiveSubTab] = useState<'order' | 'byok'>('order');

  // State khusus Panel Kalkulator Kode Lisensi & Konfigurasi Mayar Admin / Mitra (Ketik @admin)
  const [showAdminGate, setShowAdminGate] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('admin') === '1';
    } catch {
      return false;
    }
  });
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [targetBuyerDeviceId, setTargetBuyerDeviceId] = useState('');
  const [generatedBuyerKey, setGeneratedBuyerKey] = useState('');
  const [schoolBatchPrefix, setSchoolBatchPrefix] = useState('MAYAR');
  const [batchCount, setBatchCount] = useState(100);
  const [generatedBatchKeys, setGeneratedBatchKeys] = useState<string[]>([]);
  const [copiedAdminKey, setCopiedAdminKey] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [adminSaveFeedback, setAdminSaveFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // State Link Mayar & Batas Perangkat di Panel Admin
  const [mayarIndividuUrl, setMayarIndividuUrl] = useState(() => getMayarPaymentLink('pro_individu'));
  const [mayarSekolahUrl, setMayarSekolahUrl] = useState(() => getMayarPaymentLink('pro_sekolah'));
  const [mayarProductIdInput, setMayarProductIdInput] = useState(() => getMayarProductId());
  const [mayarSchoolProductIdInput, setMayarSchoolProductIdInput] = useState(() => getMayarSchoolProductId());
  const [maxIndividuSeats, setMaxIndividuSeats] = useState(() => getConfiguredIndividuMaxDevices());
  const [cloudTrackerUrl, setCloudTrackerUrl] = useState(() => getCloudSeatTrackerUrl());

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isUnlocked = isLicensed(quota.tier);
  const isPro = isUnlocked;
  const currentPlan = ONE_TIME_PLANS[selectedPlanId] || ONE_TIME_PLANS['pro_individu'];
  const activeSeatInfo = isUnlocked && quota.licenseKey ? getLicenseSeatStatus(quota.licenseKey) : null;
  const tierName = getTierDisplayName(quota.tier);
  const badgeName = getTierBadgeLabel(quota.tier);

  const handlePayViaMayar = () => {
    setStatusMessage(null);
    const targetUrl = getMayarPaymentLink(selectedPlanId);

    if (targetUrl) {
      try {
        const url = new URL(targetUrl);
        url.searchParams.set('device_id', quota.deviceId);
        window.open(url.toString(), '_blank', 'noopener,noreferrer');
      } catch {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
      setStatusMessage({
        text: 'Halaman pembayaran resmi Mayar.id telah dibuka di tab baru. Setelah pembayaran QRIS / Virtual Account selesai, tempel Kode Lisensi yang Anda terima pada kolom aktivasi di bawah.',
        isError: false,
      });
    } else {
      setStatusMessage({
        text: 'Tautan Payment Link Mayar.id belum diisi oleh Admin. Ketik "@admin" pada kolom Kode Lisensi di bawah untuk menempelkan URL Payment Link Mayar Anda.',
        isError: true,
      });
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = licenseInput.trim();
    if (!trimmed) return;

    // Pintu rahasia Admin/Mitra: ketik "@admin" untuk membuka verifikasi PIN Keygen & Link Mayar
    if (trimmed.toLowerCase() === '@admin') {
      setShowAdminGate(true);
      setLicenseInput('');
      setStatusMessage(null);
      return;
    }

    setIsActivating(true);
    try {
      // 1. Verifikasi apakah kode berasal dari Mayar Software License API (atau kode internal PRO-MERDEKA-...)
      const mayarVerify = await verifyMayarLicenseOnline(trimmed, quota.deviceId);
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

      const res = activateLicense(trimmed);
      if (res.success) {
        onUpdateQuota(res.quota);
        setLicenseInput('');
        if (teacherPinInput.trim()) {
          saveTeacherSyncPin(teacherPinInput.trim());
        }

        // 3. Otomatis cek apakah ada riwayat pengisian dari perangkat sebelumnya (misal dari HP ke Laptop)
        const pullRes = await pullWorkspaceFromCloud(trimmed, teacherPinInput.trim());
        if (pullRes.ok && pullRes.found && pullRes.restoredCount > 0) {
          setLastSyncTime(pullRes.updatedAt || new Date().toISOString());
          setStatusMessage({
            text: `${res.message} ${pullRes.message}`,
            isError: false,
          });
          if (onRestoredFromCloud) {
            onRestoredFromCloud();
          }
        } else {
          // Jika belum ada data di cloud, unggah data perangkat saat ini sebagai data awal lisensi
          const pushRes = await pushWorkspaceToCloud(trimmed, teacherPinInput.trim());
          if (pushRes.ok && pushRes.updatedAt) {
            setLastSyncTime(pushRes.updatedAt);
          }
          setStatusMessage({
            text: `${res.message} Sinkronisasi Cloud antar perangkat (HP ↔ Laptop) kini aktif otomatis!`,
            isError: false,
          });
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

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminKeygenPin(adminPinInput)) {
      setIsAdminUnlocked(true);
      setTargetBuyerDeviceId(quota.deviceId);
      setGeneratedBuyerKey(computeLicenseCodeForDevice(quota.deviceId));
      setStatusMessage(null);
    } else {
      setStatusMessage({
        text: 'PIN Admin tidak sesuai.',
        isError: true,
      });
    }
  };

  const handleSaveMayarLinks = () => {
    const showFeedback = (text: string, isError: boolean) => {
      setAdminSaveFeedback({ text, isError });
      setTimeout(() => setAdminSaveFeedback(null), 6000);
    };

    const individu = mayarIndividuUrl.trim();
    const sekolah = mayarSekolahUrl.trim();
    const tracker = cloudTrackerUrl.trim();

    // Validasi input sebelum disimpan
    if (!individu && !sekolah) {
      showFeedback('❌ Gagal: Isi minimal 1 URL Payment Link Mayar (Paket Individu atau Sekolah).', true);
      return;
    }
    const invalidUrl = [individu, sekolah, tracker].find((u) => u && !/^https:\/\/\S+$/i.test(u));
    if (invalidUrl) {
      showFeedback(`❌ Gagal: URL tidak valid (wajib diawali https://): ${invalidUrl}`, true);
      return;
    }

    saveMayarPaymentLinks(individu, sekolah);
    saveMayarProductId(mayarProductIdInput);
    saveMayarSchoolProductId(mayarSchoolProductIdInput);
    setConfiguredIndividuMaxDevices(maxIndividuSeats);
    saveCloudSeatTrackerUrl(tracker);

    // Verifikasi ulang bahwa data benar-benar tersimpan di browser
    const savedIndividu = getMayarPaymentLink('pro_individu');
    const savedSekolah = getMayarPaymentLink('pro_sekolah');
    const ok = (!individu || savedIndividu === individu) && (!sekolah || savedSekolah === sekolah);

    if (ok) {
      showFeedback(
        `✅ Berhasil disimpan! Link Mayar aktif • Batas ${maxIndividuSeats} perangkat per kode Individu.`,
        false
      );
    } else {
      showFeedback(
        '❌ Gagal menyimpan ke browser (penyimpanan diblokir / mode penyamaran). Coba gunakan browser biasa.',
        true
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pembelian Sekali Beli & Aktivasi Lisensi Guru PRO"
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}
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
                    } Perangkat)`
                  : 'Mode Pratinjau (Lihat Fitur) — Aktifkan Lisensi untuk Buat & Unduh Dokumen Tanpa Batas'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: 6, borderRadius: '50%' }}>
            <X size={16} />
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
              <Sparkles size={13} /> Informasi Lisensi PRO
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

        {/* LAYAR UTAMA: PILIH PAKET MAYAR.ID + INPUT KODE LISENSI DALAM 1 HALAMAN RINGKAS */}
        {activeSubTab === 'order' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. Pilihan 4 Paket (Guru Mandiri, Sekolah, Guru PRO, Sekolah PRO) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {(['pro_individu', 'pro_sekolah', 'pro_ai', 'sekolah_pro'] as OneTimePlanId[]).map((planKey) => {
                const plan = ONE_TIME_PLANS[planKey];
                const isSelected = selectedPlanId === planKey;
                const isSchoolPlan = planKey === 'pro_sekolah';
                const isAIPro = plan.isComingSoon;

                let cardBorder = '1px solid var(--border-subtle)';
                let cardBg = '#ffffff';
                if (isSelected) {
                  cardBorder = isSchoolPlan ? '2px solid #059669' : isAIPro ? '2px solid #7c3aed' : '2px solid #2563eb';
                  cardBg = isSchoolPlan ? '#ecfdf5' : isAIPro ? '#faf5ff' : '#eff6ff';
                }

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      if (!plan.isComingSoon) {
                        setSelectedPlanId(plan.id);
                      }
                    }}
                    style={{
                      border: cardBorder,
                      background: cardBg,
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      cursor: plan.isComingSoon ? 'default' : 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      opacity: plan.isComingSoon ? 0.9 : 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 99,
                        background: isSchoolPlan ? '#d1fae5' : isAIPro ? '#ede9fe' : '#dbeafe',
                        color: isSchoolPlan ? '#065f46' : isAIPro ? '#6d28d9' : '#1e40af',
                        display: 'inline-block',
                        marginBottom: 8,
                      }}
                    >
                      {plan.badge}
                    </span>

                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{plan.name}</div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0 4px' }}>
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          color: isSchoolPlan ? '#059669' : isAIPro ? '#7c3aed' : '#2563eb',
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

                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
                      {plan.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#334155' }}>
                      {plan.features.map((feat, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <CheckCircle2
                            size={13}
                            color={isSchoolPlan ? '#059669' : isAIPro ? '#7c3aed' : '#2563eb'}
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Tombol Langsung ke Checkout Resmi Mayar.id */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                onClick={handlePayViaMayar}
                className="btn btn-primary"
                disabled={Boolean(currentPlan.isComingSoon)}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  fontSize: 14,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: currentPlan.isComingSoon ? 0.6 : 1,
                  cursor: currentPlan.isComingSoon ? 'not-allowed' : 'pointer',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <ExternalLink size={17} /> Bayar Sekali {currentPlan.priceFormatted} via Payment Gateway (QRIS / Bank / E-Wallet) &rarr;
              </button>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                Mendukung QRIS (Semua Bank & E-Wallet), BRI, Mandiri, BCA, BNI, GoPay, DANA, OVO & ShopeePay melalui Mayar Payment Gateway.
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
                    Sudah Membayar / Punya Kode dari Mitra? Masukkan Kode Lisensi:
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

              {/* Panel Sinkronisasi Cloud Antar Perangkat (HP <-> Laptop) ketika Lisensi Aktif */}
              {isUnlocked && quota.licenseKey && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px dashed #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                      ☁️ Sinkronisasi Riwayat Antar Perangkat (HP ↔ Komputer)
                    </span>
                    {lastSyncTime && (
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
                        Tersinkron: {new Date(lastSyncTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {quota.tier === 'sekolah' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>ID/PIN Guru:</span>
                      <input
                        type="text"
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
                        setIsSyncingCloud(true);
                        try {
                          const res = await pushWorkspaceToCloud(quota.licenseKey, teacherPinInput);
                          if (res.ok && res.updatedAt) setLastSyncTime(res.updatedAt);
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
                        setIsSyncingCloud(true);
                        try {
                          const res = await pullWorkspaceFromCloud(quota.licenseKey, teacherPinInput);
                          if (res.ok && res.updatedAt) setLastSyncTime(res.updatedAt);
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
                </div>
              )}
            </div>

            {/* Panel Mitra / Admin (Hanya muncul jika mengetik "@admin" di kolom lisensi di atas) */}
            {showAdminGate && (
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
                {!isAdminUnlocked ? (
                  <form
                    onSubmit={handleUnlockAdmin}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#f1f5f9',
                      padding: '10px 12px',
                      borderRadius: 8,
                    }}
                  >
                    <Lock size={14} color="#475569" />
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Masukkan PIN Admin..."
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      style={{ fontSize: 12, padding: '6px 10px', maxWidth: 200 }}
                    />
                    <button type="submit" className="btn btn-sm btn-primary" style={{ fontSize: 11.5 }}>
                      Buka Panel Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdminGate(false)}
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: 11.5 }}
                    >
                      Tutup
                    </button>
                  </form>
                ) : (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #93c5fd',
                      borderRadius: 10,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: '#1e3a8a' }}>
                        🔑 Panel Admin, Link Mayar.id & Kunci Batas Perangkat
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdminUnlocked(false);
                          setShowAdminGate(false);
                          setAdminPinInput('');
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                      >
                        Kunci Kembali
                      </button>
                    </div>

                    {/* A. Pengaturan Link Checkout Mayar.id & Batas Perangkat */}
                    <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Link2 size={13} color="#2563eb" /> 1. Atur URL Payment Link Mayar.id & Batas Perangkat:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="URL Mayar Paket Individu Rp 99.000 (https://...mayar.link/...)"
                          value={mayarIndividuUrl}
                          onChange={(e) => setMayarIndividuUrl(e.target.value)}
                          style={{ fontSize: 12, padding: '6px 10px' }}
                        />
                        <input
                          type="url"
                          className="form-input"
                          placeholder="URL Mayar Paket Sekolah Rp 749.000 (https://...mayar.link/...)"
                          value={mayarSekolahUrl}
                          onChange={(e) => setMayarSekolahUrl(e.target.value)}
                          style={{ fontSize: 12, padding: '6px 10px' }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="ID Produk Mayar Individu (Contoh: c1db962a-7cc5-46cc-969e-2c7c930f5bdc)"
                          value={mayarProductIdInput}
                          onChange={(e) => setMayarProductIdInput(e.target.value)}
                          style={{ fontSize: 12, padding: '6px 10px', fontFamily: 'monospace' }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="ID Produk Mayar Sekolah (Contoh: 17cece7f-e711-4fdc-af44-e6ceb4b4bff7)"
                          value={mayarSchoolProductIdInput}
                          onChange={(e) => setMayarSchoolProductIdInput(e.target.value)}
                          style={{ fontSize: 12, padding: '6px 10px', fontFamily: 'monospace' }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                            Batas Maksimal Perangkat Kode Individu (MAYAR / BIBI):
                          </span>
                          <select
                            className="form-select"
                            value={maxIndividuSeats}
                            onChange={(e) => setMaxIndividuSeats(Number(e.target.value))}
                            style={{ fontSize: 11.5, padding: '4px 8px', maxWidth: 240 }}
                          >
                            <option value={1}>Ketat: Maksimal 1 Perangkat Saja</option>
                            <option value={2}>Standar: Maksimal 2 Perangkat (1 Laptop + 1 HP)</option>
                            <option value={3}>Longgar: Maksimal 3 Perangkat</option>
                          </select>
                        </div>

                        <input
                          type="url"
                          className="form-input"
                          placeholder="(Opsional) URL Google Apps Script Anti-Share Lintas Internet (https://script.google.com/macros/s/.../exec)"
                          value={cloudTrackerUrl}
                          onChange={(e) => setCloudTrackerUrl(e.target.value)}
                          style={{ fontSize: 11.5, padding: '6px 10px' }}
                        />

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                          <button
                            type="button"
                            onClick={handleSaveMayarLinks}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11.5 }}
                          >
                            Simpan Konfigurasi Mayar & Kunci Perangkat
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                              setCopiedScript(true);
                              setTimeout(() => setCopiedScript(false), 2500);
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: 11 }}
                            title="Salin kode Google Apps Script gratis untuk melacak pemakaian 100 kode Mayar secara online di Google Sheet"
                          >
                            {copiedScript ? 'Script Tersalin!' : 'Salin Script Google Sheet (Cloud Lock Gratis)'}
                          </button>
                        </div>
                        {adminSaveFeedback && (
                          <div
                            role="status"
                            aria-live="polite"
                            style={{
                              marginTop: 6,
                              padding: '8px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              lineHeight: 1.45,
                              background: adminSaveFeedback.isError ? '#fef2f2' : '#f0fdf4',
                              border: `1px solid ${adminSaveFeedback.isError ? '#ef4444' : '#10b981'}`,
                              color: adminSaveFeedback.isError ? '#b91c1c' : '#15803d',
                            }}
                          >
                            {adminSaveFeedback.text}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* B. Generator Stok Kode Lisensi Mayar / Bibi */}
                    <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                        2. Cetak Stok Kode Lisensi (Prefix SOLO = 1 Device, MAYAR/BIBI = {maxIndividuSeats} Device, SEKOLAH = 25 Device):
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Prefix (MAYAR / BIBI / SOLO)"
                          value={schoolBatchPrefix}
                          onChange={(e) => setSchoolBatchPrefix(e.target.value)}
                          style={{ fontSize: 12, padding: '6px 10px', maxWidth: 140 }}
                        />
                        <input
                          type="number"
                          className="form-input"
                          min={1}
                          max={500}
                          value={batchCount}
                          onChange={(e) => setBatchCount(Number(e.target.value) || 100)}
                          style={{ fontSize: 12, padding: '6px 10px', maxWidth: 90 }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const batch = generateSchoolBatchLicenses(schoolBatchPrefix, batchCount);
                            setGeneratedBatchKeys(batch);
                          }}
                          className="btn btn-sm btn-primary"
                          style={{ fontSize: 11.5 }}
                        >
                          Buat {batchCount} Kode Lisensi
                        </button>
                        {generatedBatchKeys.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedBatchKeys.join('\n'));
                              setCopiedAdminKey(true);
                              setTimeout(() => setCopiedAdminKey(false), 2000);
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: 11.5 }}
                          >
                            {copiedAdminKey ? 'Tersalin!' : 'Salin Semua Kode'}
                          </button>
                        )}
                      </div>
                      {generatedBatchKeys.length > 0 && (
                        <textarea
                          readOnly
                          value={generatedBatchKeys.join('\n')}
                          rows={5}
                          style={{
                            width: '100%',
                            marginTop: 8,
                            fontSize: 11,
                            fontFamily: 'monospace',
                            padding: 8,
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                          }}
                        />
                      )}
                    </div>

                    {/* C. Generator Kode Perangkat Individu (100% Terkunci Mati ke 1 Device ID Tanpa Database) */}
                    <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                        3. Cetak Kode Kunci Mati 1 ID Perangkat (100% Tidak Bisa Dipakai di Perangkat Lain):
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Contoh: DEV-ZL9NEV96-MVJ9TZQ0"
                          value={targetBuyerDeviceId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTargetBuyerDeviceId(val);
                            setGeneratedBuyerKey(val.trim() ? computeLicenseCodeForDevice(val) : '');
                          }}
                          style={{ fontSize: 12, padding: '6px 10px', fontFamily: 'monospace' }}
                        />
                      </div>
                      {generatedBuyerKey && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            padding: '6px 10px',
                            borderRadius: 6,
                          }}
                        >
                          <code style={{ fontSize: 13, fontWeight: 900, color: '#065f46' }}>{generatedBuyerKey}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedBuyerKey);
                              setCopiedAdminKey(true);
                              setTimeout(() => setCopiedAdminKey(false), 2000);
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: 11, padding: '3px 8px', background: '#ffffff' }}
                          >
                            {copiedAdminKey ? 'Tersalin!' : 'Salin Kode Guru'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
    </div>
  );
};
