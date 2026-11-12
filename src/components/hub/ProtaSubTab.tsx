import React from 'react';
import { Download, Printer, Calendar } from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartProta } from '../../utils/perangkatAjarEngine';
import { exportProtaToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';

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
          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak dokumen Prota')) return;
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
                const ok = await exportProtaToDocx(protaDoc, schoolProfile);
                if (ok) {
                  onToast('File Word Prota (.docx) berhasil diunduh!');
                }
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Download size={14} aria-hidden="true" /> Unduh Prota (.docx)
          </button>
        </div>
      </div>

      {/* Semester 1 */}
      <div style={{ marginBottom: 20 }}>
        <div className="tabular-nums" style={{ fontSize: 14, fontWeight: 700, color: '#172033', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} aria-hidden="true" />
          A. Semester 1 (Ganjil) — Total {protaDoc.totalJPSemester1} JP
        </div>
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th style={{ width: '5%', textAlign: 'center' }}>No</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Kode</th>
                <th style={{ width: '25%', textAlign: 'left' }}>Lingkup Materi</th>
                <th style={{ width: '45%', textAlign: 'left' }}>Tujuan Pembelajaran</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Alokasi JP</th>
              </tr>
            </thead>
            <tbody>
              {protaDoc.itemsSemester1.map((it) => (
                <tr key={it.no}>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: '#64748b' }}>{it.no}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{it.kodeTP}</td>
                  <td style={{ fontWeight: 600, color: '#172033' }}>{it.lingkupMateri}</td>
                  <td style={{ color: '#334155', lineHeight: 1.5 }}>{it.tujuanPembelajaran}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#172033' }}>{it.alokasiJP} JP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Semester 2 */}
      <div>
        <div className="tabular-nums" style={{ fontSize: 14, fontWeight: 700, color: '#172033', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} aria-hidden="true" />
          B. Semester 2 (Genap) — Total {protaDoc.totalJPSemester2} JP
        </div>
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th style={{ width: '5%', textAlign: 'center' }}>No</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Kode</th>
                <th style={{ width: '25%', textAlign: 'left' }}>Lingkup Materi</th>
                <th style={{ width: '45%', textAlign: 'left' }}>Tujuan Pembelajaran</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Alokasi JP</th>
              </tr>
            </thead>
            <tbody>
              {protaDoc.itemsSemester2.map((it) => (
                <tr key={it.no}>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: '#64748b' }}>{it.no}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{it.kodeTP}</td>
                  <td style={{ fontWeight: 600, color: '#172033' }}>{it.lingkupMateri}</td>
                  <td style={{ color: '#334155', lineHeight: 1.5 }}>{it.tujuanPembelajaran}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#172033' }}>{it.alokasiJP} JP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
