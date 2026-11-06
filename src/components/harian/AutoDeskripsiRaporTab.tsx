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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                background: '#dcfce7',
                color: '#166534',
                fontWeight: 800,
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 99,
              }}
            >
              Standar e-Rapor Kurikulum Merdeka (Kemendikbudristek)
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Sintesis Otomatis TP Tertinggi & Terendah Siswa
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            Rekapitulasi Capaian & Auto-Deskripsi Rapor Siswa
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRegenerateAll}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12, color: '#0369a1', borderColor: '#7dd3fc' }}
            title="Sintesis ulang seluruh kalimat deskripsi berdasarkan nilai TP"
          >
            <RefreshCw size={13} /> Refresh Sintesis
          </button>

          <button
            type="button"
            onClick={handleCopyAllTSV}
            className="btn btn-sm btn-outline"
            style={{
              fontSize: 12,
              borderColor: copiedAll ? '#15803d' : '#2563eb',
              color: copiedAll ? '#15803d' : '#2563eb',
              background: copiedAll ? '#dcfce7' : '#eff6ff',
            }}
          >
            {copiedAll ? <Check size={13} /> : <Copy size={13} />} Salin ke Excel (Ctrl+V)
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12 }}
          >
            <Printer size={13} /> Cetak
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await exportRekapRaporToDocx(schoolProfile, kelasHarian, tpList);
                onToast('File Word Rekap Rapor (.docx) berhasil diunduh!');
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
            style={{ fontSize: 12 }}
          >
            <Download size={13} /> Unduh Rekap Rapor (.docx)
          </button>
        </div>
      </div>

      {/* Info Banner Edukatif */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 12.5, color: '#1e3a8a', lineHeight: 1.5 }}>
          ✨ <strong>Panduan e-Rapor Kurikulum Merdeka:</strong> Kalimat deskripsi dirumuskan secara naratif dengan menyebutkan <strong>capaian tertinggi yang dikuasai optimal</strong> dan <strong>materi yang perlu bimbingan/penguatan lanjutan</strong>. Klik tombol <strong>Salin</strong> di sebelah kanan untuk langsung menempelkan (paste) kalimat ke aplikasi e-Rapor sekolah!
        </div>
      </div>

      {/* Tabel Deskripsi Rapor */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
              <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', width: 40, textAlign: 'center' }}>No</th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', width: 80, textAlign: 'center' }}>NIS</th>
              <th style={{ padding: '10px 10px', border: '1px solid #cbd5e1', width: 170, textAlign: 'left' }}>
                Nama Peserta Didik
              </th>
              <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', width: 60, textAlign: 'center', background: '#059669' }}>
                N.Akhir
              </th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', width: 95, textAlign: 'center' }}>
                Predikat
              </th>
              <th style={{ padding: '10px 10px', border: '1px solid #cbd5e1', minWidth: 320, textAlign: 'left' }}>
                Capaian Kompetensi (Deskripsi Naratif e-Rapor)
              </th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', width: 85, textAlign: 'center' }}>
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
