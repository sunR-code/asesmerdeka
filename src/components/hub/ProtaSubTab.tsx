import React, { useMemo, useState } from 'react';
import {
  Download,
  Printer,
  Calendar,
  SlidersHorizontal,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartProta } from '../../utils/perangkatAjarEngine';
import { exportProtaToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import { AcademicScheduleConfigPanel } from './AcademicScheduleConfigPanel';

interface ProtaSubTabProps {
  tpList: CustomTPItem[];
  schoolProfile: SchoolProfile;
  onUpdateTPList?: (nextList: CustomTPItem[]) => void;
  onToast: (msg: string) => void;
}

export const ProtaSubTab: React.FC<ProtaSubTabProps> = ({
  tpList,
  schoolProfile,
  onUpdateTPList,
  onToast,
}) => {
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  const protaDoc = useMemo(
    () => buildSmartProta(schoolProfile, tpList),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schoolProfile, tpList, scheduleVersion]
  );

  return (
    <div key="prota">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
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
          <p className="tabular-nums" style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            Tahun Ajaran {protaDoc.tahunAjaran} • Total Alokasi:{' '}
            <strong>{protaDoc.totalJPTahunan} JP</strong> •{' '}
            <strong>{protaDoc.mingguEfektifTahunan ?? '-'} Minggu Efektif</strong> (Sem 1:{' '}
            {protaDoc.mingguEfektifSemester1 ?? '-'} mg · Sem 2:{' '}
            {protaDoc.mingguEfektifSemester2 ?? '-'} mg)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowConfigPanel((prev) => !prev)}
            className={`btn btn-sm ${showConfigPanel ? 'btn-primary' : 'btn-outline'}`}
            aria-expanded={showConfigPanel}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />{' '}
            {showConfigPanel ? 'Tutup Pengaturan Kalender & JP' : 'Atur Kalender & JP'}
          </button>
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

      {showConfigPanel && (
        <AcademicScheduleConfigPanel
          schoolProfile={schoolProfile}
          tpList={tpList}
          onUpdateTPList={onUpdateTPList}
          defaultSemesterTab={schoolProfile.semester}
          allowSemesterSwitch={true}
          onScheduleChanged={() => setScheduleVersion((v) => v + 1)}
          onToast={onToast}
        />
      )}

      {/* Catatan Kalender, JP & Spiral Learning */}
      {protaDoc.peringatanProta && protaDoc.peringatanProta.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 13px',
            borderRadius: 10,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#78350f',
            fontSize: 12,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {protaDoc.peringatanProta.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Ringkasan Kapasitas Tahunan */}
      <div
        className="tabular-nums"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Semester 1 (Ganjil)</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8', marginTop: 2 }}>
            {protaDoc.totalJPSemester1} JP / {protaDoc.kapasitasJPSemester1 ?? '-'} JP kap.
          </div>
          <div style={{ fontSize: 11, color: '#475569' }}>
            {protaDoc.mingguEfektifSemester1 ?? '-'} minggu efektif • Sumber:{' '}
            {protaDoc.sumberSemester1 === 'saved' ? 'Tersimpan Guru' : 'Katalog Default'}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Semester 2 (Genap)</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d', marginTop: 2 }}>
            {protaDoc.totalJPSemester2} JP / {protaDoc.kapasitasJPSemester2 ?? '-'} JP kap.
          </div>
          <div style={{ fontSize: 11, color: '#475569' }}>
            {protaDoc.mingguEfektifSemester2 ?? '-'} minggu efektif • Sumber:{' '}
            {protaDoc.sumberSemester2 === 'saved' ? 'Tersimpan Guru' : 'Katalog Default'}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1e40af' }}>Total Tahunan</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', marginTop: 2 }}>
            {protaDoc.totalJPTahunan} JP ({protaDoc.mingguEfektifTahunan ?? '-'} Mg Efektif)
          </div>
          <div style={{ fontSize: 11, color: '#1e40af' }}>
            {protaDoc.jpConfig
              ? `${protaDoc.jpConfig.jpPerMinggu} JP/mg × ${protaDoc.jpConfig.durasiJPMinut} mnt`
              : ''}
          </div>
        </div>
      </div>

      {/* Semester 1 */}
      <div style={{ marginBottom: 20 }}>
        <div
          className="tabular-nums"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#172033',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} aria-hidden="true" />
            A. Semester 1 (Ganjil) — Total {protaDoc.totalJPSemester1} JP ({protaDoc.mingguEfektifSemester1 ?? '-'} Mg Efektif)
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
            {protaDoc.sumberSemester1 === 'saved' ? 'TP Tersimpan Sekolah/Guru' : 'Katalog Default'}
          </span>
        </div>
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th style={{ width: 48, textAlign: 'center' }}>No</th>
                <th style={{ width: 78, textAlign: 'center' }}>Kode</th>
                <th style={{ minWidth: 170, textAlign: 'left' }}>Lingkup Materi</th>
                <th style={{ minWidth: 240, textAlign: 'left' }}>Tujuan Pembelajaran</th>
                <th style={{ width: 95, textAlign: 'center' }}>Alokasi JP</th>
                <th style={{ minWidth: 150, textAlign: 'left' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {protaDoc.itemsSemester1.map((it) => (
                <tr key={it.tpId || `${it.kodeTP}-${it.no}`}>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: '#64748b' }}>{it.no}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{it.kodeTP}</td>
                  <td style={{ fontWeight: 600, color: '#172033' }}>{it.lingkupMateri}</td>
                  <td style={{ color: '#334155', lineHeight: 1.5 }}>{it.tujuanPembelajaran}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#172033' }}>{it.alokasiJP} JP</td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{it.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Semester 2 */}
      <div>
        <div
          className="tabular-nums"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#172033',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} aria-hidden="true" />
            B. Semester 2 (Genap) — Total {protaDoc.totalJPSemester2} JP ({protaDoc.mingguEfektifSemester2 ?? '-'} Mg Efektif)
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
            {protaDoc.sumberSemester2 === 'saved' ? 'TP Tersimpan Sekolah/Guru' : 'Katalog Default'}
          </span>
        </div>
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th style={{ width: 48, textAlign: 'center' }}>No</th>
                <th style={{ width: 78, textAlign: 'center' }}>Kode</th>
                <th style={{ minWidth: 170, textAlign: 'left' }}>Lingkup Materi</th>
                <th style={{ minWidth: 240, textAlign: 'left' }}>Tujuan Pembelajaran</th>
                <th style={{ width: 95, textAlign: 'center' }}>Alokasi JP</th>
                <th style={{ minWidth: 170, textAlign: 'left' }}>Keterangan / Progres</th>
              </tr>
            </thead>
            <tbody>
              {protaDoc.itemsSemester2.map((it) => (
                <tr key={it.tpId || `${it.kodeTP}-${it.no}`}>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: '#64748b' }}>{it.no}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{it.kodeTP}</td>
                  <td style={{ fontWeight: 600, color: '#172033' }}>{it.lingkupMateri}</td>
                  <td style={{ color: '#334155', lineHeight: 1.5 }}>
                    {it.tujuanPembelajaran}
                    {it.progresSpiral && (
                      <div style={{ marginTop: 4, fontSize: 11.5, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Sparkles size={12} aria-hidden="true" />
                        <span>{it.progresSpiral}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#172033' }}>{it.alokasiJP} JP</td>
                  <td style={{ fontSize: 12, color: it.progresSpiral ? '#1d4ed8' : '#475569', fontWeight: it.progresSpiral ? 600 : 400 }}>
                    {it.keterangan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
