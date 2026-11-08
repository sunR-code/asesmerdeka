import React from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, FileSpreadsheet } from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartPromes } from '../../utils/perangkatAjarEngine';
import { exportPromesToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import { cardTapMotion } from '../../utils/motionPresets';

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
          <motion.button
            type="button"
            whileTap={cardTapMotion}
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak dokumen Promes')) return;
              window.print();
            }}
            className="btn btn-sm btn-outline"
            style={{ borderRadius: 10, fontSize: 12.5, fontWeight: 700 }}
          >
            <Printer size={14} /> Cetak
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={cardTapMotion}
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
            style={{ borderRadius: 10, fontSize: 12.5, fontWeight: 800, padding: '7px 14px' }}
          >
            <Download size={14} /> Unduh Promes (.docx)
          </motion.button>
        </div>
      </div>

      <div className="v21-bento-card" style={{ overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff', textAlign: 'center' }}>
                <th style={{ padding: '8px', border: '1px solid #3b82f6', width: '3%' }}>No</th>
                <th style={{ padding: '8px', border: '1px solid #3b82f6', width: '6%' }}>Kode</th>
                <th style={{ padding: '8px', border: '1px solid #3b82f6', width: '25%', textAlign: 'left' }}>Materi Pokok & TP</th>
                <th style={{ padding: '8px', border: '1px solid #3b82f6', width: '5%' }}>JP</th>
                {promesDoc.columns.map((col, idx) => (
                  <th
                    key={idx}
                    style={{
                      padding: '6px 4px',
                      border: '1px solid #3b82f6',
                      background: col.isEfektif ? '#1e3a8a' : '#334155',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {col.bulanNama.slice(0, 3)}<br />M{col.mingguKe}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promesDoc.rows.map((row, rIdx) => (
                <tr key={row.no} style={{ background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '8px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600 }}>{row.no}</td>
                  <td style={{ padding: '8px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>{row.kodeTP}</td>
                  <td style={{ padding: '8px 8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{row.materiPokok}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{row.tujuanPembelajaran}</div>
                  </td>
                  <td style={{ padding: '8px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#0369a1' }}>{row.alokasiJP}</td>
                  {promesDoc.columns.map((col, cIdx) => {
                    const jp = row.distribusiJP[cIdx];
                    return (
                      <td
                        key={cIdx}
                        style={{
                          padding: '6px 3px',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                          background: jp ? '#dbeafe' : col.isEfektif ? 'transparent' : '#f1f5f9',
                          color: jp ? '#1e40af' : '#94a3b8',
                          fontWeight: jp ? 800 : 400,
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
    </div>
  );
};
