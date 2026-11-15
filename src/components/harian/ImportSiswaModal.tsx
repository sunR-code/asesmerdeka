import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import type { SiswaItem } from '../../types/kelasHarian';
import { parseAndValidateStudentImport } from '../../utils/kelasHarianStorage';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_UPLOAD_EXTENSIONS = ['.txt', '.csv', '.tsv'];

interface ImportSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    newStudents: SiswaItem[],
    resetExistingScores: boolean,
    mode?: 'replace' | 'merge'
  ) => void;
  currentCount: number;
  rombelName: string;
  existingStudents?: SiswaItem[];
}

export const ImportSiswaModal: React.FC<ImportSiswaModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentCount,
  rombelName,
  existingStudents = [],
}) => {
  const [rawText, setRawText] = useState('');
  const [resetScores, setResetScores] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Dalam mode replace seluruh rombel, duplikat dicek antar-baris file; dalam mode merge, dicek juga terhadap roster eksisting
  const validationSummary = useMemo(
    () =>
      parseAndValidateStudentImport(
        rawText,
        importMode === 'merge' ? existingStudents : []
      ),
    [rawText, importMode, existingStudents]
  );

  if (!isOpen) return null;

  const validStudents = validationSummary.validRows.map((r) => r.siswa);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      alert('Ukuran file terlalu besar (maksimal 2 MB). Silakan unggah file teks atau CSV yang lebih kecil.');
      e.target.value = '';
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isAllowedExt = ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!isAllowedExt) {
      alert('Format file tidak didukung. Silakan unggah file berformat .csv, .txt, atau .tsv.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content.slice(0, 200_000));
        setActiveTab('paste');
      }
    };
    reader.readAsText(file);
  };

  const handleApplySample = () => {
    const sample = `2425001\tAchmad Rizky Pratama\tL
2425002\tAdelia Putri Kirana\tP
2425003\tAldo Firmansyah\tL
2425004\tAmanda Citra Lestari\tP
2425005\tAnisa Rahmawati\tP`;
    setRawText(sample);
  };

  const handleSubmit = () => {
    if (validStudents.length === 0) {
      alert('Tidak ada data siswa yang valid untuk diimpor. Periksa kembali format atau duplikasi NIS/NISN.');
      return;
    }
    const ts = Date.now();
    const stampedStudents = validStudents.map((s, idx) => ({
      ...s,
      id: `siswa_imp_${ts}_${idx + 1}`,
      noUrut: idx + 1,
      statusAktif: 'aktif' as const,
    }));
    onImport(
      stampedStudents,
      importMode === 'merge' ? false : resetScores,
      importMode
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Impor Data Siswa"
      className="animate-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        overflowX: 'hidden',
      }}
      onClick={onClose}
    >
      <div
        className="animate-modal-content"
        style={{
          background: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 'min(820px, calc(100vw - 24px))',
          minWidth: 0,
          maxHeight: '92vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#059669',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Impor &amp; Validasi Data Siswa (Excel / CSV / Dapodik)
              </h2>
              <p style={{ fontSize: 12.5, color: '#475569', margin: '2px 0 0' }}>
                Pratinjau baris, deteksi duplikat NIS/NISN, dan pilih mode impor untuk kelas{' '}
                <strong>{rombelName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal impor siswa"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
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
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigasi Mode */}
        <div style={{ padding: '14px 18px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              borderBottom: activeTab === 'paste' ? '3px solid #059669' : '3px solid transparent',
              background: activeTab === 'paste' ? '#ecfdf5' : 'transparent',
              color: activeTab === 'paste' ? '#065f46' : '#64748b',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ClipboardPaste size={15} /> 1. Tempel (Paste) dari Excel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '3px solid #059669' : '3px solid transparent',
              background: activeTab === 'upload' ? '#ecfdf5' : 'transparent',
              color: activeTab === 'upload' ? '#065f46' : '#64748b',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Upload size={15} /> 2. Unggah File CSV / TSV / TXT
          </button>
        </div>

        {/* Body Modal */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Petunjuk Penggunaan Praktis */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 12.5,
              color: '#1e293b',
              lineHeight: 1.55,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>Format didukung:</strong> <code>NIS | Nama | L/P</code> atau{' '}
              <code>NIS | NISN | Nama | L/P</code> (pisahkan dengan Tab Excel, titik koma, atau koma). NIS/NISN bersifat opsional.
            </div>
            <button
              type="button"
              onClick={handleApplySample}
              style={{
                background: '#ffffff',
                border: '1px solid #10b981',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#047857',
                cursor: 'pointer',
              }}
            >
              Isi Contoh Format
            </button>
          </div>

          {activeTab === 'paste' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                  Tempelkan (Paste) Teks dari Spreadsheet Excel / CSV:
                </label>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Trash2 size={12} /> Hapus Teks
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                className="form-textarea"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                  width: '100%',
                }}
                placeholder="Contoh format paste dari Excel:&#10;2425001	Ahmad Fauzan	L&#10;2425002	Aisyah Nurul Aini	P&#10;2425003	0091234567	Andika Bagus Pratama	L"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </div>
          ) : (
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 14,
                padding: '24px 18px',
                textAlign: 'center',
                background: '#f8fafc',
              }}
            >
              <Upload size={30} color="#059669" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                Pilih Berkas CSV, TSV, atau TXT
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Mendukung berkas ekspor Dapodik / Excel (.csv, .tsv, .txt) hingga 2 MB
              </p>
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="btn btn-sm btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Pilih Berkas
              </label>
            </div>
          )}

          {/* Pilihan Mode Impor: Ganti vs Gabungkan */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 8,
            }}
          >
            <label
              style={{
                border: importMode === 'replace' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: importMode === 'replace' ? '#eff6ff' : '#ffffff',
                borderRadius: 10,
                padding: '9px 12px',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                style={{ marginTop: 2 }}
              />
              <span>
                <strong>Ganti seluruh roster ({currentCount} siswa)</strong>
                <br />
                <span style={{ color: '#64748b' }}>Cocok untuk mengganti data contoh/awal dengan kelas baru.</span>
              </span>
            </label>

            <label
              style={{
                border: importMode === 'merge' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                background: importMode === 'merge' ? '#ecfdf5' : '#ffffff',
                borderRadius: 10,
                padding: '9px 12px',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                style={{ marginTop: 2 }}
              />
              <span>
                <strong>Gabungkan (tambah siswa baru saja)</strong>
                <br />
                <span style={{ color: '#64748b' }}>Menjaga siswa &amp; nilai lama, melewati NIS/NISN duplikat.</span>
              </span>
            </label>
          </div>

          {/* Pratinjau & Ringkasan Validasi Baris */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                  Pratinjau Validasi:
                </span>
                <span
                  style={{
                    background: validStudents.length > 0 ? '#dcfce7' : '#f1f5f9',
                    color: validStudents.length > 0 ? '#15803d' : '#64748b',
                    fontSize: 11.5,
                    fontWeight: 800,
                    padding: '2px 9px',
                    borderRadius: 99,
                  }}
                >
                  {validStudents.length} Valid Siap Diimpor
                </span>
                {validationSummary.duplicateRows.length > 0 && (
                  <span
                    style={{
                      background: '#fef3c7',
                      color: '#b45309',
                      fontSize: 11.5,
                      fontWeight: 800,
                      padding: '2px 9px',
                      borderRadius: 99,
                    }}
                  >
                    {validationSummary.duplicateRows.length} Duplikat Dilewati
                  </span>
                )}
                {validationSummary.invalidRows.length > 0 && (
                  <span
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: 11.5,
                      fontWeight: 800,
                      padding: '2px 9px',
                      borderRadius: 99,
                    }}
                  >
                    {validationSummary.invalidRows.length} Tidak Valid
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                Aktif saat ini: {currentCount} siswa
              </span>
            </div>

            {validationSummary.allRows.length > 0 ? (
              <div
                style={{
                  maxHeight: 190,
                  overflowY: 'auto',
                  overflowX: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  background: '#ffffff',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '6px 8px', width: 36, textAlign: 'center' }}>No</th>
                      <th style={{ padding: '6px 8px', width: 88, textAlign: 'center' }}>NIS</th>
                      <th style={{ padding: '6px 8px', width: 96, textAlign: 'center' }}>NISN</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Nama Lengkap Siswa</th>
                      <th style={{ padding: '6px 8px', width: 42, textAlign: 'center' }}>L/P</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationSummary.allRows.map((row) => {
                      const isOk = row.status === 'valid';
                      const isDup =
                        row.status === 'duplicate_nis' ||
                        row.status === 'duplicate_nisn' ||
                        row.status === 'duplicate_in_file';
                      return (
                        <tr
                          key={row.rowIndex}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isOk ? '#ffffff' : isDup ? '#fffbeb' : '#fef2f2',
                          }}
                        >
                          <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>
                            {row.rowIndex}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>
                            {row.siswa.nis || '—'}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', color: '#475569' }}>
                            {row.siswa.nisn || '—'}
                          </td>
                          <td style={{ padding: '5px 10px', fontWeight: 700, color: '#0f172a' }}>
                            {row.siswa.nama || '(Kosong)'}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                            {row.siswa.jenisKelamin}
                          </td>
                          <td style={{ padding: '5px 10px', fontSize: 11.5 }}>
                            {isOk ? (
                              <span style={{ color: '#15803d', fontWeight: 700 }}>Siap diimpor</span>
                            ) : (
                              <span
                                style={{
                                  color: isDup ? '#b45309' : '#b91c1c',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <AlertTriangle size={12} aria-hidden="true" />
                                {row.message}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  padding: '18px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 10,
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 12.5,
                }}
              >
                Belum ada data siswa. Tempelkan daftar nama siswa dari Excel atau unggah file CSV/TSV.
              </div>
            )}
          </div>

          {/* Opsi Reset Nilai */}
          {importMode === 'replace' && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <input
                type="checkbox"
                id="reset-scores-chk"
                checked={resetScores}
                onChange={(e) => setResetScores(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="reset-scores-chk" style={{ fontSize: 12.5, color: '#92400e', cursor: 'pointer' }}>
                <strong>Bersihkan Nilai &amp; Presensi Sebelumnya:</strong> Kosongkan seluruh nilai dan tandai presensi awal bersih (direkomendasikan jika mengganti rombel contoh menjadi kelas nyata).
              </label>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {validStudents.length > 0 && (
              <span>
                <strong>{validStudents.length} siswa valid</strong> akan{' '}
                {importMode === 'merge' ? 'ditambahkan ke' : 'menggantikan daftar di'} rombel {rombelName}.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={validStudents.length === 0}
              className="btn btn-primary"
              style={{
                fontSize: 13,
                fontWeight: 800,
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: validStudents.length > 0 ? '#059669' : '#94a3b8',
                borderColor: validStudents.length > 0 ? '#059669' : '#94a3b8',
                cursor: validStudents.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              <Check size={16} /> Terapkan ke Kelas {rombelName}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
