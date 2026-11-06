import React from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, Table2 } from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartATP } from '../../utils/perangkatAjarEngine';
import { exportATPToDocx } from '../../utils/docxExporter';
import { cardTapMotion } from '../../utils/motionPresets';

interface ATPSubTabProps {
  tpList: CustomTPItem[];
  schoolProfile: SchoolProfile;
  onToast: (msg: string) => void;
}

export const ATPSubTab: React.FC<ATPSubTabProps> = ({
  tpList,
  schoolProfile,
  onToast,
}) => {
  const atpDoc = buildSmartATP(tpList, schoolProfile);

  return (
    <div key="atp">
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
            <Table2 size={16} color="#2563eb" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
              Dokumen Perangkat Pembelajaran
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
            Alur Tujuan Pembelajaran (ATP) — {atpDoc.mataPelajaran}
          </h2>
          <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            Kelas {atpDoc.kelas} ({atpDoc.jenjangFase}) • Total {atpDoc.totalJP} Jam Pelajaran (JP)
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
                await exportATPToDocx(atpDoc, schoolProfile);
                onToast('File Word ATP (.docx) berhasil diunduh!');
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
            style={{ borderRadius: 10, fontSize: 12.5, fontWeight: 800, padding: '7px 14px' }}
          >
            <Download size={14} /> Unduh ATP (.docx)
          </motion.button>
        </div>
      </div>

      <div
        className="v21-bento-card"
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '12px 18px',
          marginBottom: 16,
          fontSize: 12.5,
          color: '#1e3a8a',
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: '#1d4ed8', display: 'block', marginBottom: 2 }}>
          Capaian Pembelajaran (CP) Fase:
        </strong>
        {atpDoc.capaianPembelajaranFase}
      </div>

      <div className="v21-bento-card" style={{ overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '5%', textAlign: 'center' }}>No</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '8%', textAlign: 'center' }}>Kode</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '15%' }}>Elemen</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '18%' }}>Lingkup Materi</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '28%' }}>Tujuan Pembelajaran</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '6%', textAlign: 'center' }}>JP</th>
                <th style={{ padding: '10px 12px', border: '1px solid #3b82f6', width: '20%' }}>Profil Pancasila</th>
              </tr>
            </thead>
            <tbody>
              {atpDoc.items.map((it, idx) => (
                <tr
                  key={it.no}
                  style={{
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600 }}>{it.no}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>{it.kodeTP}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0' }}>{it.elemen}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{it.lingkupMateri}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.5 }}>{it.tujuanPembelajaran}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#0369a1' }}>{it.alokasiJP}</td>
                  <td style={{ padding: '9px 12px', border: '1px solid #e2e8f0', fontSize: 11.5, color: '#475569' }}>{it.profilPancasila.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
