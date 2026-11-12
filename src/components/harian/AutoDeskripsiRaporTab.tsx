import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Printer,
  RefreshCw,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import type {
  KelasHarianData,
} from '../../types/kelasHarian';
import { exportRekapRaporToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import { generateAutoDeskripsiRapor } from '../../utils/kelasHarianStorage';

interface AutoDeskripsiRaporTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
}

export const AutoDeskripsiRaporTab: React.FC<AutoDeskripsiRaporTabProps> = ({
  schoolProfile,
  kelasHarian,
  tpList,
  onUpdateKelasHarian,
  onToast,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Copy single deskripsi
  const handleCopyDeskripsi = (siswaId: string, deskripsi: string) => {
    navigator.clipboard.writeText(deskripsi);
    setCopiedId(siswaId);
    onToast('Deskripsi capaian rapor berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy all into Excel-compatible TSV
  const handleCopyAllTSV = () => {
    const headers = ['No', 'NIS', 'Nama Siswa', 'Nilai Akhir', 'Predikat', 'Deskripsi Capaian e-Rapor'];
    const rows = kelasHarian.daftarNilai.map((item, idx) => [
      idx + 1,
      item.nis,
      item.nama,
      item.nilaiAkhir,
      item.predikatKKTP,
      `"${item.deskripsiRapor.replace(/"/g, '""')}"`,
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopiedAll(true);
    onToast('Seluruh data rapor berhasil disalin! Anda bisa langsung Paste (Ctrl+V) di Microsoft Excel atau Google Sheets.');
    setTimeout(() => setCopiedAll(false), 3000);
  };

  // Regenerate all descriptions
  const handleRegenerateAll = () => {
    const updated = kelasHarian.daftarNilai.map((item) => ({
      ...item,
      deskripsiRapor: generateAutoDeskripsiRapor(item.nilaiFormatif, tpList, item.nama),
    }));

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarNilai: updated,
    });
    onToast('Seluruh kalimat deskripsi rapor berhasil diperbarui berdasarkan capaian TP terbaru!');
  };

  // Edit custom deskripsi inline
  const handleDeskripsiChange = (siswaId: string, newText: string) => {
    const updated = kelasHarian.daftarNilai.map((item) =>
      item.siswaId === siswaId ? { ...item, deskripsiRapor: newText } : item
    );
    onUpdateKelasHarian({
      ...kelasHarian,
      daftarNilai: updated,
    });
  };

  return (
    <div>
      {/* Header Info & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#172033', margin: 0 }}>
            Auto-deskripsi rapor siswa
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
            Kelas {schoolProfile.rombelAktif} · Sintesis kalimat e-Rapor dari nilai TP tertinggi dan terendah
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRegenerateAll}
            className="btn btn-sm btn-outline"
            title="Sintesis ulang seluruh kalimat deskripsi berdasarkan nilai TP"
          >
            <RefreshCw size={13} aria-hidden="true" /> Segarkan sintesis
          </button>

          <button
            type="button"
            onClick={handleCopyAllTSV}
            className="btn btn-sm btn-outline"
            style={{
              borderColor: copiedAll ? '#15803d' : undefined,
              color: copiedAll ? '#15803d' : undefined,
              background: copiedAll ? '#ecfdf5' : undefined,
            }}
          >
            {copiedAll ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} Salin semua (TSV)
          </button>

          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak Rekap Rapor')) return;
              window.print();
            }}
            className="btn btn-sm btn-outline"
          >
            <Printer size={13} aria-hidden="true" /> Cetak
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                const ok = await exportRekapRaporToDocx(schoolProfile, kelasHarian, tpList);
                if (ok) {
                  onToast('File Word Rekap Rapor (.docx) berhasil diunduh!');
                }
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Download size={13} aria-hidden="true" /> Unduh Rekap Rapor (.docx)
          </button>
        </div>
      </div>

      {/* Info Ringkas e-Rapor */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 14,
          fontSize: 12.5,
          color: '#334155',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: '#172033' }}>Catatan e-Rapor:</strong> Deskripsi dirumuskan dari TP dengan capaian tertinggi dan TP yang masih perlu penguatan. Anda dapat menyunting teks langsung di tabel lalu menyalinnya ke aplikasi e-Rapor.
      </div>

      {/* Tabel Deskripsi Rapor */}
      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>No</th>
              <th style={{ width: 82, textAlign: 'center' }}>NIS</th>
              <th style={{ width: 170, textAlign: 'left' }}>Nama Peserta Didik</th>
              <th style={{ width: 64, textAlign: 'center', color: '#15803d' }}>N.Akhir</th>
              <th style={{ width: 105, textAlign: 'center' }}>Predikat</th>
              <th style={{ minWidth: 320, textAlign: 'left' }}>
                Capaian Kompetensi (Deskripsi Naratif e-Rapor)
              </th>
              <th style={{ width: 85, textAlign: 'center' }}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {kelasHarian.daftarNilai.map((item, idx) => {
              const isCopied = copiedId === item.siswaId;

              return (
                <tr key={item.siswaId} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '10px 6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                    {item.nis}
                  </td>
                  <td style={{ padding: '10px 10px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#1e293b' }}>
                    {item.nama}
                  </td>
                  <td
                    style={{
                      padding: '10px 6px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                      fontWeight: 800,
                      background: item.nilaiAkhir >= 75 ? '#f0fdf4' : '#fee2e2',
                      color: item.nilaiAkhir >= 75 ? '#15803d' : '#b91c1c',
                      fontSize: 13,
                    }}
                  >
                    {item.nilaiAkhir}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 800,
                        background:
                          item.predikatKKTP === 'Sangat Baik'
                            ? '#dcfce7'
                            : item.predikatKKTP === 'Baik'
                            ? '#dbeafe'
                            : item.predikatKKTP === 'Cukup'
                            ? '#fef9c3'
                            : '#fee2e2',
                        color:
                          item.predikatKKTP === 'Sangat Baik'
                            ? '#15803d'
                            : item.predikatKKTP === 'Baik'
                            ? '#1d4ed8'
                            : item.predikatKKTP === 'Cukup'
                            ? '#a16207'
                            : '#b91c1c',
                      }}
                    >
                      {item.predikatKKTP}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={item.deskripsiRapor}
                      onChange={(e) => handleDeskripsiChange(item.siswaId, e.target.value)}
                      style={{
                        fontSize: 12,
                        lineHeight: 1.45,
                        width: '100%',
                        border: '1px solid transparent',
                        background: 'transparent',
                        resize: 'vertical',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#93c5fd';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyDeskripsi(item.siswaId, item.deskripsiRapor)}
                      className="btn btn-sm btn-outline"
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        borderColor: isCopied ? '#15803d' : '#cbd5e1',
                        color: isCopied ? '#15803d' : '#2563eb',
                        background: isCopied ? '#dcfce7' : '#ffffff',
                      }}
                      title="Salin deskripsi ke clipboard untuk e-Rapor"
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />} {isCopied ? 'Tersalin' : 'Salin'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
