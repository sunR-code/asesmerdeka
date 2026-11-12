import React from 'react';
import { Download, Printer, Table2 } from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartATP } from '../../utils/perangkatAjarEngine';
import { exportATPToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';

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
          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak dokumen ATP')) return;
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
                const ok = await exportATPToDocx(atpDoc, schoolProfile);
                if (ok) {
                  onToast('File Word ATP (.docx) berhasil diunduh!');
                }
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Download size={14} aria-hidden="true" /> Unduh ATP (.docx)
          </button>
        </div>
      </div>

      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 14,
          fontSize: 13,
          color: '#334155',
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: '#172033', display: 'block', marginBottom: 3 }}>
          Capaian Pembelajaran (CP) Fase
        </strong>
        {atpDoc.capaianPembelajaranFase}
      </div>

      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>No</th>
              <th style={{ width: '9%', textAlign: 'center' }}>Kode</th>
              <th style={{ width: '15%', textAlign: 'left' }}>Elemen</th>
              <th style={{ width: '18%', textAlign: 'left' }}>Lingkup Materi</th>
              <th style={{ width: '28%', textAlign: 'left' }}>Tujuan Pembelajaran</th>
              <th style={{ width: '6%', textAlign: 'center' }}>JP</th>
              <th style={{ width: '19%', textAlign: 'left' }}>Dimensi Profil</th>
            </tr>
          </thead>
          <tbody>
            {atpDoc.items.map((it) => (
              <tr key={it.no}>
                <td style={{ textAlign: 'center', fontWeight: 500, color: '#64748b' }}>{it.no}</td>
                <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{it.kodeTP}</td>
                <td>{it.elemen}</td>
                <td style={{ fontWeight: 600, color: '#172033' }}>{it.lingkupMateri}</td>
                <td style={{ color: '#334155', lineHeight: 1.5 }}>{it.tujuanPembelajaran}</td>
                <td style={{ textAlign: 'center', fontWeight: 600, color: '#172033' }}>{it.alokasiJP}</td>
                <td style={{ fontSize: 12, color: '#475569' }}>{it.profilPancasila.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
