import React from 'react';
import {
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  Users,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import type { KelasHarianData } from '../../types/kelasHarian';
import {
  isKelasHarianSimulated,
  isKelasHarianLegacyUnverified,
} from '../../utils/kelasHarianStorage';

interface SimulatedDataNoticeBannerProps {
  kelasHarian: KelasHarianData;
  contextLabel?: string;
  onStartEmptyClass: () => void;
  onOpenImportModal?: () => void;
  onLoadDemoData: () => void;
  onConfirmLegacyActual?: () => void;
  onAcknowledgeDemo?: () => void;
  demoAcknowledged?: boolean;
  isSeparateDemoPreview?: boolean;
  onExitDemoPreview?: () => void;
}

export const SimulatedDataNoticeBanner: React.FC<SimulatedDataNoticeBannerProps> = ({
  kelasHarian,
  contextLabel = 'kelas ini',
  onStartEmptyClass,
  onOpenImportModal,
  onLoadDemoData,
  onConfirmLegacyActual,
  onAcknowledgeDemo,
  demoAcknowledged = false,
  isSeparateDemoPreview = false,
  onExitDemoPreview,
}) => {
  const isSimulated = isKelasHarianSimulated(kelasHarian);
  const isLegacyUnverified = isKelasHarianLegacyUnverified(kelasHarian);
  const isEmpty = kelasHarian.daftarSiswa.length === 0;

  if (isSeparateDemoPreview) {
    return (
      <div
        role="status"
        className="no-print"
        style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, maxWidth: 680 }}>
          <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
              Pratinjau Dataset Demo Terpisah Aktif
            </div>
            <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5 }}>
              Anda sedang meninjau data contoh pada sandbox terpisah. Data siswa dan nilai aktual Anda tetap tersimpan aman dan tidak ditimpa.
            </div>
          </div>
        </div>

        {onExitDemoPreview && (
          <button
            type="button"
            onClick={onExitDemoPreview}
            className="btn btn-sm btn-primary"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            <span>Kembali ke data asli saya</span>
          </button>
        )}
      </div>
    );
  }

  if (isLegacyUnverified) {
    return (
      <div
        role="status"
        className="no-print"
        style={{
          background: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle
            size={18}
            color="#1d4ed8"
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden="true"
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 2 }}>
              Data Lama Perlu Verifikasi Asal-Usul ({kelasHarian.daftarSiswa.length} siswa)
            </div>
            <div style={{ fontSize: 12.5, color: '#1e40af', lineHeight: 1.5 }}>
              Data pada {contextLabel} berasal dari penyimpanan versi sebelumnya tanpa metadata sumber (status: <strong>legacy_unverified</strong>). Seluruh data tetap dipertahankan utuh. Pastikan apakah daftar ini benar data aktual kelas Anda atau sisa data simulasi sebelum mencetak/mengekspor.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {onConfirmLegacyActual && (
            <button
              type="button"
              onClick={onConfirmLegacyActual}
              className="btn btn-sm btn-primary"
            >
              <ShieldCheck size={13} aria-hidden="true" />
              <span>Konfirmasi sebagai data aktual</span>
            </button>
          )}

          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="btn btn-sm btn-outline"
              style={{ background: '#ffffff' }}
            >
              <FileSpreadsheet size={13} aria-hidden="true" />
              <span>Impor daftar siswa baru</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStartEmptyClass}
            className="btn btn-sm btn-outline"
            style={{ background: '#ffffff', color: '#991b1b', borderColor: '#fecaca' }}
          >
            <Trash2 size={13} aria-hidden="true" />
            <span>Mulai dengan kelas kosong</span>
          </button>

          <button
            type="button"
            onClick={onLoadDemoData}
            className="btn btn-sm btn-outline"
            style={{ background: '#ffffff' }}
          >
            <Sparkles size={13} aria-hidden="true" />
            <span>Lihat data demo terpisah</span>
          </button>
        </div>
      </div>
    );
  }

  if (isSimulated) {
    return (
      <div
        role="status"
        className="no-print"
        style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle
            size={18}
            color="#b45309"
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden="true"
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
              Mode Data Contoh / Simulasi Aktif ({kelasHarian.daftarSiswa.length} siswa fiktif)
            </div>
            <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5 }}>
              Daftar siswa, presensi, jurnal, dan nilai pada {contextLabel} masih menggunakan data simulasi bawaan (Aditia Pratama, dkk.), bukan data aktual sekolah Anda. Ekspor dokumen dari data ini akan meminta konfirmasi dan ditandai sebagai <strong>DATA SIMULASI</strong>.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onStartEmptyClass}
            className="btn btn-sm btn-outline"
            style={{ background: '#ffffff', borderColor: '#f59e0b', color: '#92400e', fontWeight: 600 }}
          >
            <Trash2 size={13} aria-hidden="true" />
            <span>Mulai dengan kelas kosong</span>
          </button>

          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="btn btn-sm btn-primary"
            >
              <FileSpreadsheet size={13} aria-hidden="true" />
              <span>Impor daftar siswa</span>
            </button>
          )}

          {onAcknowledgeDemo && !demoAcknowledged && (
            <button
              type="button"
              onClick={onAcknowledgeDemo}
              className="btn btn-sm btn-outline"
              style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#475569' }}
            >
              <Sparkles size={13} aria-hidden="true" />
              <span>Lanjut lihat data demo</span>
            </button>
          )}
          {demoAcknowledged && (
            <span style={{ fontSize: 11.5, color: '#92400e', fontWeight: 600 }}>
              Sedang meninjau data demo
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        role="status"
        className="no-print"
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, maxWidth: 620 }}>
          <Users size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#172033', marginBottom: 2 }}>
              Kelas kosong siap diisi ({contextLabel})
            </div>
            <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
              Belum ada siswa aktif pada rombel ini. Impor daftar siswa asli dari Excel/CSV, tambahkan manual di tab Presensi, atau muat data contoh untuk eksplorasi.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="btn btn-sm btn-primary"
            >
              <FileSpreadsheet size={13} aria-hidden="true" />
              <span>Impor siswa</span>
            </button>
          )}
          <button
            type="button"
            onClick={onLoadDemoData}
            className="btn btn-sm btn-outline"
          >
            <Sparkles size={13} aria-hidden="true" />
            <span>Lihat data demo</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
