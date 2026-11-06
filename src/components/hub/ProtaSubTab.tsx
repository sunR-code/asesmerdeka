import React from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, Calendar } from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartProta } from '../../utils/perangkatAjarEngine';
import { exportProtaToDocx } from '../../utils/docxExporter';
import { cardTapMotion } from '../../utils/motionPresets';

interface ProtaSubTabProps {
  tpList: CustomTPItem[];
  schoolProfile: SchoolProfile;
  onToast: (msg: string) => void;
}

export const ProtaSubTab: React.FC<ProtaSubTabProps> = ({
  tpList,
  schoolProfile,
  onToast,
}) => {
  const protaDoc = buildSmartProta(schoolProfile, tpList);

  return (
    <div key="prota">
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
            <Calendar size={16} color="#2563eb" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
              Dokumen Perangkat Tahunan
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
            Program Tahunan (Prota) — {protaDoc.mataPelajaran}
          </h2>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            Tahun Ajaran {protaDoc.tahunAjaran} • Total Alokasi: {protaDoc.totalJPTahunan} JP
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            type="button"
            whileTap={cardTapMotion}
            onClick={() => window.print()}
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
                await exportProtaToDocx(protaDoc, schoolProfile);
                onToast('File Word Prota (.docx) berhasil diunduh!');
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
            style={{ borderRadius: 10, fontSize: 12.5, fontWeight: 800, padding: '7px 14px' }}
          >
            <Download size={14} /> Unduh Prota (.docx)
          </motion.button>
        </div>
      </div>

      {/* Semester 1 */}
      <div className="v21-bento-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0d9488', display: 'inline-block' }} />
          A. Semester 1 (Ganjil) — Total {protaDoc.totalJPSemester1} JP
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '5%', textAlign: 'center' }}>No</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '10%', textAlign: 'center' }}>Kode</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '25%' }}>Lingkup Materi</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '45%' }}>Tujuan Pembelajaran</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '15%', textAlign: 'center' }}>Alokasi JP</th>
              </tr>
            </thead>
            <tbody>
              {protaDoc.itemsSemester1.map((it, idx) => (
                <tr key={it.no} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600 }}>{it.no}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>{it.kodeTP}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{it.lingkupMateri}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.5 }}>{it.tujuanPembelajaran}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#0369a1' }}>{it.alokasiJP} JP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Semester 2 */}
      <div className="v21-bento-card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0d9488', display: 'inline-block' }} />
          B. Semester 2 (Genap) — Total {protaDoc.totalJPSemester2} JP
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '5%', textAlign: 'center' }}>No</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '10%', textAlign: 'center' }}>Kode</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '25%' }}>Lingkup Materi</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '45%' }}>Tujuan Pembelajaran</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '15%', textAlign: 'center' }}>Alokasi JP</th>
              </tr>
            </thead>
            <tbody>
              {protaDoc.itemsSemester2.map((it, idx) => (
                <tr key={it.no} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600 }}>{it.no}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>{it.kodeTP}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{it.lingkupMateri}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.5 }}>{it.tujuanPembelajaran}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#0369a1' }}>{it.alokasiJP} JP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
