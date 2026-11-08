import React, { useState } from 'react';
import {
  Link2,
  Save,
  Copy,
  Check,
  Smartphone,
  Cloud,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import {
  getMayarPaymentLink,
  saveMayarPaymentLinks,
} from '../../utils/paymentGateway';
import {
  getMayarProductId,
  saveMayarProductId,
  getMayarSchoolProductId,
  saveMayarSchoolProductId,
  getConfiguredIndividuMaxDevices,
  setConfiguredIndividuMaxDevices,
  getCloudSeatTrackerUrl,
  saveCloudSeatTrackerUrl,
} from '../../utils/licenseManager';

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

export const AdminSettingsTab: React.FC = () => {
  const [mayarIndividuUrl, setMayarIndividuUrl] = useState(() => getMayarPaymentLink('pro_individu'));
  const [mayarSekolahUrl, setMayarSekolahUrl] = useState(() => getMayarPaymentLink('pro_sekolah'));
  const [mayarProductIdInput, setMayarProductIdInput] = useState(() => getMayarProductId());
  const [mayarSchoolProductIdInput, setMayarSchoolProductIdInput] = useState(() => getMayarSchoolProductId());
  const [maxIndividuSeats, setMaxIndividuSeats] = useState(() => getConfiguredIndividuMaxDevices());
  const [cloudTrackerUrl, setCloudTrackerUrl] = useState(() => getCloudSeatTrackerUrl());

  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const individu = mayarIndividuUrl.trim();
    const sekolah = mayarSekolahUrl.trim();
    const tracker = cloudTrackerUrl.trim();

    // Validasi URL jika diisi
    const urlsToValidate = [
      { name: 'Payment Link Individu', url: individu },
      { name: 'Payment Link Sekolah', url: sekolah },
      { name: 'Cloud Seat Tracker URL', url: tracker },
    ];

    for (const item of urlsToValidate) {
      if (item.url && !/^https:\/\/\S+$/i.test(item.url)) {
        setFeedback({
          text: `URL untuk ${item.name} tidak valid. Wajib diawali protokol https://`,
          isError: true,
        });
        return;
      }
    }

    saveMayarPaymentLinks(individu, sekolah);
    saveMayarProductId(mayarProductIdInput.trim());
    saveMayarSchoolProductId(mayarSchoolProductIdInput.trim());
    setConfiguredIndividuMaxDevices(maxIndividuSeats);
    saveCloudSeatTrackerUrl(tracker);

    setFeedback({
      text: `Pengaturan berhasil disimpan! Batas kursi individu: ${maxIndividuSeats} perangkat. Link Mayar & Cloud Tracker siap digunakan.`,
      isError: false,
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner Notifikasi Feedback */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: feedback.isError ? '#fef2f2' : '#f0fdf4',
            border: `1.5px solid ${feedback.isError ? '#ef4444' : '#10b981'}`,
            color: feedback.isError ? '#b91c1c' : '#15803d',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {feedback.isError ? (
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Card 1: Integrasi Gateway Mayar.id */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
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
              <Link2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                1. Integrasi Checkout Mayar.id
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Konfigurasi tautan pembayaran resmi Mayar untuk paket Guru Mandiri dan Kolektif Sekolah.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mayar-individu-url" style={{ fontSize: 12.5 }}>
                <span>URL Payment Link Guru Mandiri (Rp 99.000)</span>
                {mayarIndividuUrl && <span style={{ color: '#059669', fontSize: 11 }}>● Terhubung</span>}
              </label>
              <input
                id="mayar-individu-url"
                type="url"
                className="form-input"
                placeholder="https://asesmerdeka.mayar.link/pl/guru-mandiri-pro"
                value={mayarIndividuUrl}
                onChange={(e) => setMayarIndividuUrl(e.target.value)}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Tautan yang dibuka otomatis saat guru memilih opsi bayar langsung lewat Mayar.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mayar-sekolah-url" style={{ fontSize: 12.5 }}>
                <span>URL Payment Link Kolektif Sekolah (Rp 749.000)</span>
                {mayarSekolahUrl && <span style={{ color: '#059669', fontSize: 11 }}>● Terhubung</span>}
              </label>
              <input
                id="mayar-sekolah-url"
                type="url"
                className="form-input"
                placeholder="https://asesmerdeka.mayar.link/pl/kolektif-sekolah-25"
                value={mayarSekolahUrl}
                onChange={(e) => setMayarSekolahUrl(e.target.value)}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Tautan pembayaran berbayar untuk paket kelembagaan instansi sekolah (25 guru).
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mayar-product-id" style={{ fontSize: 12.5 }}>
                ID Produk Mayar (Individu)
              </label>
              <input
                id="mayar-product-id"
                type="text"
                className="form-input"
                placeholder="Contoh: c1db962a-7cc5-46cc-969e-2c7c930f5bdc"
                value={mayarProductIdInput}
                onChange={(e) => setMayarProductIdInput(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Digunakan untuk verifikasi Software License API Mayar saat aktivasi online.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mayar-school-product-id" style={{ fontSize: 12.5 }}>
                ID Produk Mayar (Sekolah)
              </label>
              <input
                id="mayar-school-product-id"
                type="text"
                className="form-input"
                placeholder="Contoh: 17cece7f-e711-4fdc-af44-e6ceb4b4bff7"
                value={mayarSchoolProductIdInput}
                onChange={(e) => setMayarSchoolProductIdInput(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                ID Produk kelembagaan untuk memvalidasi lisensi sekolah di Mayar.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Batas Kursi Perangkat Guru Mandiri */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                2. Batas Kursi Perangkat (Device Seat Binding)
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Tentukan jumlah perangkat yang diizinkan untuk lisensi personal (Guru Mandiri).
              </p>
            </div>
          </div>

          <div style={{ maxWidth: 480 }}>
            <label className="form-label" htmlFor="max-seats-select" style={{ fontSize: 12.5 }}>
              Batas Default Perangkat Kode Individu (Guru Mandiri)
            </label>
            <select
              id="max-seats-select"
              className="form-select"
              value={maxIndividuSeats}
              onChange={(e) => setMaxIndividuSeats(Number(e.target.value))}
              style={{ fontWeight: 700 }}
            >
              <option value={1}>Ketat: Maksimal 1 Perangkat Saja (SOLO)</option>
              <option value={2}>Rekomendasi Standar: 2 Perangkat (1 Laptop + 1 HP Guru)</option>
              <option value={3}>Fleksibel: Maksimal 3 Perangkat</option>
            </select>
            <div
              style={{
                marginTop: 8,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 11.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              💡 <strong>Kenapa 2 Perangkat?</strong> Sebagian besar guru menyusun perangkat ajar di laptop sekolah, lalu memantau presensi dan jurnal mengajar di kelas lewat HP pribadi. Batas 2 perangkat mencegah kode diperjualbelikan ulang ke pihak lain secara bebas.
            </div>
          </div>
        </div>

        {/* Card 3: Cloud Seat Tracker & Anti-Share Lintas Internet */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                background: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cloud size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                3. Cloud Seat Tracker & Anti-Share Lintas Internet
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Pelacakan kuota kursi perangkat online gratis berbasis Google Apps Script atau Redis Webhook.
              </p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="cloud-tracker-url" style={{ fontSize: 12.5 }}>
              <span>URL Cloud Seat Tracker Web App</span>
              {cloudTrackerUrl && <span style={{ color: '#059669', fontSize: 11 }}>● Aktif</span>}
            </label>
            <input
              id="cloud-tracker-url"
              type="url"
              className="form-input"
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              value={cloudTrackerUrl}
              onChange={(e) => setCloudTrackerUrl(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12.5 }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Jika diisi, aplikasi akan mencatat setiap perangkat yang mengklaim kode lisensi ke Spreadsheet online secara real-time.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyScript}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {copiedScript ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copiedScript ? 'Script Tersalin ke Clipboard!' : 'Salin Script Google Sheet (Cloud Lock Gratis)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowScriptModal(!showScriptModal)}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FileCode size={14} />
              <span>{showScriptModal ? 'Sembunyikan Panduan Script' : 'Lihat Panduan Pemasangan'}</span>
            </button>
          </div>

          {showScriptModal && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                Cara Memasang Cloud Seat Tracker Gratis di Google Sheets:
              </div>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                <li>Buka Google Sheets baru di akun Google Anda.</li>
                <li>Buka menu <strong>Extensions (Ekstensi)</strong> → <strong>Apps Script</strong>.</li>
                <li>Hapus kode bawaan dan tempel kode script yang telah disalin dengan tombol di atas.</li>
                <li>Klik tombol <strong>Deploy</strong> → <strong>New deployment</strong>.</li>
                <li>Pilih jenis <strong>Web app</strong>, atur <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>.</li>
                <li>Salin Web App URL yang dihasilkan dan tempelkan ke kolom input di atas.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Action Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 800,
              boxShadow: 'var(--shadow-md)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Save size={18} />
            <span>Simpan Seluruh Pengaturan Sistem</span>
          </button>
        </div>
      </form>
    </div>
  );
};
