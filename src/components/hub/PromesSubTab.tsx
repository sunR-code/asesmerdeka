import React from 'react';
import { Download, Printer, FileSpreadsheet } from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartPromes } from '../../utils/perangkatAjarEngine';
import { exportPromesToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';

interface PromesSubTabProps {
  tpList: CustomTPItem[];
  schoolProfile: SchoolProfile;
  onToast: (msg: string) => void;
}

export const PromesSubTab: React.FC<PromesSubTabProps> = ({
  tpList,
  schoolProfile,
  onToast,
}) => {
  const promesDoc = buildSmartPromes(schoolProfile, tpList);

  return (
    <div key="promes">
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <FileSpreadsheet size={16} color="#2563eb" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
              Distribusi Jadwal Mingguan
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
            Program Semester (Promes Visual) — {promesDoc.mataPelajaran}
          </h2>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            Semester {promesDoc.semester} • Total {promesDoc.totalJPEfektif} Jam Pelajaran Terjadwal
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak dokumen Promes')) return;
              window.print();
            }}
            className="btn btn-sm btn-outline"
          >
            <Printer size={14} aria-hidden="true" /> Cetak
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const ok = await exportPromesToDocx(promesDoc, schoolProfile);
                if (ok) {
                  onToast('File Word Promes (.docx) berhasil diunduh!');
                }
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Download size={14} aria-hidden="true" /> Unduh Promes (.docx)
          </button>
        </div>
      </div>

      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th style={{ width: '3%', textAlign: 'center' }}>No</th>
              <th style={{ width: '6%', textAlign: 'center' }}>Kode</th>
              <th style={{ width: '25%', textAlign: 'left' }}>Materi Pokok & TP</th>
              <th style={{ width: '5%', textAlign: 'center' }}>JP</th>
              {promesDoc.columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: '6px 4px',
                    background: col.isEfektif ? '#f8fafc' : '#e2e8f0',
                    color: col.isEfektif ? '#172033' : '#475569',
                    fontSize: 10.5,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {col.bulanNama.slice(0, 3)}
                  <br />M{col.mingguKe}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promesDoc.rows.map((row) => (
              <tr key={row.no}>
                <td style={{ textAlign: 'center', fontWeight: 500, color: '#64748b' }}>{row.no}</td>
                <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{row.kodeTP}</td>
                <td>
                  <div style={{ fontWeight: 600, color: '#172033' }}>{row.materiPokok}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{row.tujuanPembelajaran}</div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 600, color: '#172033' }}>{row.alokasiJP}</td>
                {promesDoc.columns.map((col, cIdx) => {
                  const jp = row.distribusiJP[cIdx];
                  return (
                    <td
                      key={cIdx}
                      style={{
                        padding: '6px 3px',
                        textAlign: 'center',
                        background: jp ? '#eff6ff' : col.isEfektif ? 'transparent' : '#f1f5f9',
                        color: jp ? '#1d4ed8' : '#94a3b8',
                        fontWeight: jp ? 700 : 400,
                      }}
                    >
                      {jp ? `${jp}` : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
