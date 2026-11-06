import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  Trash2,
} from 'lucide-react';
import type { SiswaItem } from '../../types/kelasHarian';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_UPLOAD_EXTENSIONS = ['.txt', '.csv', '.tsv'];

interface ImportSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newStudents: SiswaItem[], resetExistingScores: boolean) => void;
  currentCount: number;
  rombelName: string;
}

export const ImportSiswaModal: React.FC<ImportSiswaModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentCount,
  rombelName,
}) => {
  const [rawText, setRawText] = useState('');
  const [resetScores, setResetScores] = useState(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Parser cerdas untuk data Excel (Tab-delimited, Comma, atau baris nama)
  const parseRawText = (text: string): SiswaItem[] => {
    if (!text.trim()) return [];

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: SiswaItem[] = [];
    let count = 0;

    for (const line of lines) {
      // Lewati header jika ada
      const lower = line.toLowerCase();
      if (
        (lower.includes('nama') && lower.includes('nis')) ||
        lower.startsWith('no\t') ||
        lower.startsWith('no;') ||
        lower.startsWith('no,')
      ) {
        continue;
      }

      // Deteksi separator: TAB (dari Excel), semicolon, atau comma
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t').map((t) => t.trim());
      } else if (line.includes(';')) {
        tokens = line.split(';').map((t) => t.trim());
      } else if (line.includes(',')) {
        tokens = line.split(',').map((t) => t.trim());
      } else {
        tokens = [line];
      }

      // Filter tokens kosong
      tokens = tokens.filter((t) => t.length > 0);
      if (tokens.length === 0) continue;

      let nis = '';
      let nama = '';
      let jk: 'L' | 'P' = 'L';

      // Logika pemisahan token cerdas
      if (tokens.length >= 4) {
        // Misal: [No, NIS, Nama, JK]
        nis = tokens[1];
        nama = tokens[2];
        const rawJK = tokens[3].toUpperCase();
        jk = rawJK.startsWith('P') || rawJK === 'PEREMPUAN' ? 'P' : 'L';
      } else if (tokens.length === 3) {
        // Kemungkinan 1: [NIS, Nama, JK]
        // Kemungkinan 2: [No, NIS, Nama]
        if (tokens[2].toUpperCase() === 'L' || tokens[2].toUpperCase() === 'P') {
          nis = tokens[0];
          nama = tokens[1];
          jk = tokens[2].toUpperCase() === 'P' ? 'P' : 'L';
        } else {
          nis = tokens[1];
          nama = tokens[2];
        }
      } else if (tokens.length === 2) {
        // [NIS, Nama] atau [Nama, JK]
        if (tokens[1].toUpperCase() === 'L' || tokens[1].toUpperCase() === 'P') {
          nama = tokens[0];
          jk = tokens[1].toUpperCase() === 'P' ? 'P' : 'L';
        } else {
          nis = tokens[0];
          nama = tokens[1];
        }
      } else {
        // Hanya nama
        nama = tokens[0];
      }

      // Bersihkan nama dari tanda kutip atau nomor depan jika ada
      nama = nama.replace(/^"|"$/g, '').trim();
      nama = nama.replace(/^\d+[.)-]\s*/, '').trim();

      if (!nama || nama.length < 2) continue;

      count++;
      // Jika NIS kosong atau berupa nomor urut pendek, buat NIS standar
      if (!nis || nis.length < 3 || /^\d{1,2}$/.test(nis)) {
        nis = `2425${String(count).padStart(3, '0')}`;
      }

      parsed.push({
        id: `siswa_imp_${nis}_${count}`,
        noUrut: count,
        nis,
        nama,
        jenisKelamin: jk,
      });
    }

    return parsed;
  };

  const parsedStudents = parseRawText(rawText);

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
2425005\tAnisa Rahmawati\tP
2425006\tArif Budiman\tL
2425007\tAulia Nur Safitri\tP
2425008\tBagas Saputra\tL
2425009\tBunga Cantika Dewi\tP
2425010\tDaniel Christian\tL`;
    setRawText(sample);
  };

  const handleSubmit = () => {
    if (parsedStudents.length === 0) {
      alert('Tidak ada data siswa yang valid untuk diimpor. Silakan tempelkan (paste) teks dari Excel terlebih dahulu.');
      return;
    }
    const ts = Date.now();
    const stampedStudents = parsedStudents.map((s, idx) => ({
      ...s,
      id: `siswa_imp_${ts}_${idx + 1}`,
    }));
    onImport(stampedStudents, resetScores);
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
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="animate-modal-content"
        style={{
          background: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 780,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Impor Data Siswa dari Excel / Dapodik
              </h2>
              <p style={{ fontSize: 12.5, color: '#475569' }}>
                Salin daftar nama siswa kelas <strong>{rombelName}</strong> dalam 1 klik tanpa ketik manual
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigasi Mode */}
        <div style={{ padding: '16px 24px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
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
            <Upload size={15} /> 2. Unggah File CSV / TXT
          </button>
        </div>

        {/* Body Modal */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Petunjuk Penggunaan Praktis */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              padding: '14px 18px',
              fontSize: 13,
              color: '#1e293b',
              lineHeight: 1.6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              💡 <strong>Langkah Mudah:</strong> Buka file Excel daftar siswa dari sekolah / TU Bapak/Ibu, <strong>blok kolom NIS, Nama Siswa, dan L/P</strong>, tekan <strong>Ctrl + C (Salin)</strong>, lalu klik di dalam kotak di bawah ini dan tekan <strong>Ctrl + V (Tempel)</strong>.
            </div>
            <button
              type="button"
              onClick={handleApplySample}
              style={{
                background: '#ffffff',
                border: '1px solid #10b981',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#047857',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(16,185,129,0.12)',
              }}
            >
              Lihat Contoh Data
            </button>
          </div>

          {activeTab === 'paste' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                  Tempelkan (Paste) Teks dari Spreadsheet Excel:
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
                rows={6}
                className="form-textarea"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #cbd5e1',
                }}
                placeholder="Contoh format paste dari Excel:&#10;2425001	Ahmad Fauzan	L&#10;2425002	Aisyah Nurul Aini	P&#10;2425003	Andika Bagus Pratama	L"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </div>
          ) : (
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 14,
                padding: '28px 20px',
                textAlign: 'center',
                background: '#f8fafc',
              }}
            >
              <Upload size={32} color="#059669" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                Pilih Berkas CSV atau TXT dari Komputer
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Mendukung berkas ekspor Dapodik (.csv atau .txt)
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

          {/* Pratinjau Realtime Hasil Pembacaan */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                  Pratinjau Hasil Impor:
                </span>
                <span
                  style={{
                    background: parsedStudents.length > 0 ? '#dcfce7' : '#f1f5f9',
                    color: parsedStudents.length > 0 ? '#15803d' : '#64748b',
                    fontSize: 11.5,
                    fontWeight: 800,
                    padding: '2px 9px',
                    borderRadius: 99,
                  }}
                >
                  {parsedStudents.length} Siswa Terdeteksi
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                Saat ini di kelas: {currentCount} Siswa
              </span>
            </div>

            {parsedStudents.length > 0 ? (
              <div
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  background: '#ffffff',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '6px 8px', width: 40, textAlign: 'center' }}>No</th>
                      <th style={{ padding: '6px 10px', width: 100, textAlign: 'center' }}>NIS</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left' }}>Nama Lengkap Siswa</th>
                      <th style={{ padding: '6px 10px', width: 50, textAlign: 'center' }}>L/P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedStudents.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>
                          {s.nis}
                        </td>
                        <td style={{ padding: '5px 12px', fontWeight: 700, color: '#0f172a' }}>{s.nama}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                          {s.jenisKelamin}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  padding: '20px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 10,
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 12.5,
                }}
              >
                Belum ada data siswa. Silakan tempelkan daftar nama siswa di atas.
              </div>
            )}
          </div>

          {/* Opsi Reset Nilai */}
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
              <strong>Bersihkan / Reset Nilai & Presensi:</strong> Buat nilai formatif dan presensi awal yang baru untuk semua siswa ini (direkomendasikan jika ini kelas baru).
            </label>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {parsedStudents.length > 0 && (
              <span>
                ✅ <strong>{parsedStudents.length} siswa</strong> akan diterapkan ke rombel {rombelName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ fontSize: 13, padding: '9px 18px' }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={parsedStudents.length === 0}
              className="btn btn-primary"
              style={{
                fontSize: 13,
                fontWeight: 800,
                padding: '9px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: parsedStudents.length > 0 ? '#059669' : '#94a3b8',
                borderColor: parsedStudents.length > 0 ? '#059669' : '#94a3b8',
                cursor: parsedStudents.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: parsedStudents.length > 0 ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
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
