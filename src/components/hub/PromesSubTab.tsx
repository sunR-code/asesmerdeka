import React, { useMemo, useState } from 'react';
import {
  Download,
  Printer,
  FileSpreadsheet,
  SlidersHorizontal,
  Edit3,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartPromes } from '../../utils/perangkatAjarEngine';
import { exportPromesToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import {
  clearPromesManualOverrides,
  getPromesManualOverrides,
  savePromesManualOverrides,
} from '../../utils/academicCalendarStorage';
import { AcademicScheduleConfigPanel } from './AcademicScheduleConfigPanel';

interface PromesSubTabProps {
  tpList: CustomTPItem[];
  schoolProfile: SchoolProfile;
  onUpdateTPList?: (nextList: CustomTPItem[]) => void;
  onToast: (msg: string) => void;
}

function shortTag(label?: string): string {
  const up = (label || '').toUpperCase();
  if (up.includes('MPLS')) return 'MPLS';
  if (up.includes('STS') || up.includes('PTS')) return 'STS';
  if (up.includes('SAS') || up.includes('PAS') || up.includes('SAT')) return 'SAS';
  if (up.includes('RAPOR')) return 'RPR';
  if (up.includes('LIBUR')) return 'LBR';
  if (!label) return 'NE';
  return label.slice(0, 4);
}

export const PromesSubTab: React.FC<PromesSubTabProps> = ({
  tpList,
  schoolProfile,
  onUpdateTPList,
  onToast,
}) => {
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  const promesDoc = useMemo(
    () => buildSmartPromes(schoolProfile, tpList),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schoolProfile, tpList, scheduleVersion]
  );

  const monthGroups = useMemo(() => {
    const groups: Array<{ bulanNama: string; count: number }> = [];
    for (const col of promesDoc.columns) {
      const last = groups[groups.length - 1];
      if (last && last.bulanNama === col.bulanNama) {
        last.count++;
      } else {
        groups.push({ bulanNama: col.bulanNama, count: 1 });
      }
    }
    return groups;
  }, [promesDoc.columns]);

  const totalKapasitas = promesDoc.totalKapasitasJPSemester ?? 0;
  const totalDibutuhkan = promesDoc.totalJPDibutuhkanTP ?? 0;
  const totalTerjadwal = promesDoc.totalJPTerjadwal ?? promesDoc.totalJPEfektif;
  const capacityPct =
    totalKapasitas > 0 ? Math.min(100, Math.round((totalDibutuhkan / totalKapasitas) * 100)) : 0;
  const hasAnyManualOverride = promesDoc.rows.some((r) => r.isManualOverride);

  const handleManualCellChange = (
    tpId: string | undefined,
    colIndex: number,
    newJP: number
  ) => {
    if (!tpId) return;
    const col = promesDoc.columns[colIndex];
    if (!col || !col.isEfektif) {
      onToast('Minggu libur / non-efektif tidak boleh diisi jam pembelajaran.');
      return;
    }
    const existingAll = getPromesManualOverrides(schoolProfile);
    const targetRow = promesDoc.rows.find((r) => r.tpId === tpId);
    const currentRowOverrides: Record<string, number> = {
      ...(existingAll[tpId] || {}),
    };

    // Jika baru pertama kali masuk manual untuk TP ini, salin distribusi otomatis saat ini agar sel lain tidak hilang
    if (!existingAll[tpId] && targetRow) {
      promesDoc.columns.forEach((c, idx) => {
        const wk = c.weekKey;
        const val = targetRow.distribusiJP[idx];
        if (wk && val) {
          currentRowOverrides[wk] = val;
        }
      });
    }

    const weekKey = col.weekKey || `${col.bulanNama}-${col.mingguKe}`;
    const cleanVal = Math.max(0, Math.min(24, Math.floor(newJP) || 0));
    if (cleanVal <= 0) {
      delete currentRowOverrides[weekKey];
    } else {
      currentRowOverrides[weekKey] = cleanVal;
    }

    const nextAll = {
      ...existingAll,
      [tpId]: currentRowOverrides,
    };
    savePromesManualOverrides(schoolProfile, nextAll);
    setScheduleVersion((v) => v + 1);
  };

  const handleResetManualOverrides = () => {
    clearPromesManualOverrides(schoolProfile);
    setScheduleVersion((v) => v + 1);
    onToast('Distribusi Promes dikembalikan ke penjadwalan otomatis berbasis rentang TP.');
  };

  const errorIssues = (promesDoc.validationIssues || []).filter((i) => i.severity === 'error');
  const warningIssues = (promesDoc.validationIssues || []).filter((i) => i.severity === 'warning');
  const infoIssues = (promesDoc.validationIssues || []).filter((i) => i.severity === 'info');

  return (
    <div key="promes" style={{ minWidth: 0, maxWidth: '100%' }}>
      {/* Header */}
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
            <FileSpreadsheet size={16} color="#2563eb" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
              Distribusi Jadwal Mingguan
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
            Program Semester (Promes Visual) — {promesDoc.mataPelajaran}
          </h2>
          <p className="tabular-nums" style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
            Semester {promesDoc.semester} •{' '}
            <strong>{promesDoc.totalMingguEfektif ?? '-'} Minggu Efektif</strong> (
            {promesDoc.totalMingguNonEfektif ?? '-'} Non-Efektif) •{' '}
            <strong>{totalTerjadwal} JP Terjadwal</strong> dari {totalDibutuhkan} JP TP
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
            onClick={() => setIsManualMode((prev) => !prev)}
            className={`btn btn-sm ${isManualMode ? 'btn-primary' : 'btn-outline'}`}
            aria-pressed={isManualMode}
          >
            <Edit3 size={14} aria-hidden="true" />{' '}
            {isManualMode ? 'Selesai Sesuaikan Manual' : 'Sesuaikan Manual'}
          </button>
          {hasAnyManualOverride && (
            <button
              type="button"
              onClick={handleResetManualOverrides}
              className="btn btn-sm btn-outline"
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset Otomatis
            </button>
          )}
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

      {/* Panel Konfigurasi Kalender & Alokasi JP */}
      {showConfigPanel && (
        <AcademicScheduleConfigPanel
          schoolProfile={schoolProfile}
          tpList={tpList}
          onUpdateTPList={onUpdateTPList}
          defaultSemesterTab={schoolProfile.semester}
          allowSemesterSwitch={false}
          onScheduleChanged={() => setScheduleVersion((v) => v + 1)}
          onToast={onToast}
        />
      )}

      {/* Indikator Kapasitas JP */}
      <div
        className="tabular-nums"
        style={{
          padding: '12px 14px',
          borderRadius: 10,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
            Kapasitas Minggu Efektif vs Kebutuhan TP ({promesDoc.jpPerMinggu ?? 4} JP/minggu ×{' '}
            {promesDoc.durasiJPMinut ?? 40} mnt, {promesDoc.pertemuanPerMinggu ?? 2} pertemuan)
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: (promesDoc.defisitJP ?? 0) > 0 ? '#b91c1c' : '#1d4ed8' }}>
            Terjadwal: {totalTerjadwal} JP / Kebutuhan: {totalDibutuhkan} JP / Kapasitas:{' '}
            {totalKapasitas} JP
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            borderRadius: 999,
            background: '#e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${capacityPct}%`,
              height: '100%',
              background:
                totalDibutuhkan > totalKapasitas
                  ? '#dc2626'
                  : (promesDoc.totalJPBelumTerjadwal ?? 0) > 0
                  ? '#d97706'
                  : '#16a34a',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 6,
            fontSize: 11.5,
            color: '#475569',
          }}
        >
          <span>
            Status Kalender:{' '}
            <strong>
              {promesDoc.kalenderTerkonfirmasi
                ? 'Terkonfirmasi Sekolah'
                : 'Template (Belum Dikonfirmasi)'}
            </strong>{' '}
            • Status JP:{' '}
            <strong>
              {promesDoc.jpTerkonfirmasi ? 'Terkonfirmasi Guru' : 'Estimasi Awal'}
            </strong>
          </span>
          <span>
            {(promesDoc.defisitJP ?? 0) > 0
              ? `Defisit / Overflow: ${promesDoc.defisitJP} JP`
              : (promesDoc.surplusJP ?? 0) > 0
              ? `Sisa Kapasitas: ${promesDoc.surplusJP} JP`
              : 'Kapasitas Seimbang (0 JP sisa)'}
          </span>
        </div>
      </div>

      {/* Peringatan Konflik & Validasi */}
      {(errorIssues.length > 0 || warningIssues.length > 0 || infoIssues.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {errorIssues.map((iss, idx) => (
            <div
              key={`err-${idx}`}
              role="alert"
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <span>{iss.pesan}</span>
            </div>
          ))}
          {warningIssues.map((iss, idx) => (
            <div
              key={`warn-${idx}`}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <span>{iss.pesan}</span>
            </div>
          ))}
          {infoIssues.map((iss, idx) => (
            <div
              key={`info-${idx}`}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e3a8a',
                fontSize: 11.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <span>{iss.pesan}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid Promes */}
      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: 36, textAlign: 'center' }}>No</th>
              <th rowSpan={2} style={{ width: 58, textAlign: 'center' }}>Kode</th>
              <th rowSpan={2} style={{ minWidth: 210, textAlign: 'left' }}>Materi Pokok & TP</th>
              <th rowSpan={2} style={{ width: 64, textAlign: 'center' }}>Mg</th>
              <th rowSpan={2} style={{ width: 64, textAlign: 'center' }}>JP</th>
              {monthGroups.map((grp, gIdx) => (
                <th
                  key={`${grp.bulanNama}-${gIdx}`}
                  colSpan={grp.count}
                  style={{
                    padding: '5px 4px',
                    background: '#1e3a8a',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                    textAlign: 'center',
                    borderBottom: '1px solid #3b82f6',
                  }}
                >
                  {grp.bulanNama}
                </th>
              ))}
            </tr>
            <tr>
              {promesDoc.columns.map((col, idx) => (
                <th
                  key={col.weekKey || idx}
                  title={`${col.startDate || ''} s.d. ${col.endDate || ''} • ${
                    col.isEfektif
                      ? `Efektif (Kap. ${col.kapasitasJP} JP)${
                          col.catatanHariLibur ? ` • ${col.catatanHariLibur}` : ''
                        }`
                      : col.labelKegiatan || 'Non-Efektif'
                  }`}
                  style={{
                    padding: '4px 3px',
                    background: col.isEfektif ? '#f8fafc' : '#e2e8f0',
                    color: col.isEfektif ? '#172033' : '#475569',
                    fontSize: 10,
                    fontWeight: 600,
                    textAlign: 'center',
                    minWidth: isManualMode ? 44 : 34,
                  }}
                >
                  <div>M{col.mingguKe}</div>
                  <div style={{ fontSize: 9, color: col.isEfektif ? '#64748b' : '#b91c1c' }}>
                    {col.isEfektif ? `#${col.semesterWeekNumber ?? idx + 1}` : shortTag(col.labelKegiatan)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promesDoc.rows.map((row) => {
              const rowScheduled = row.jpTerjadwal ?? 0;
              const rowUnscheduled = row.jpBelumTerjadwal ?? 0;
              return (
                <tr key={row.tpId || `${row.kodeTP}-${row.no}`}>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: '#64748b' }}>
                    {row.no}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>
                    {row.kodeTP}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#172033' }}>{row.materiPokok}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      {row.tujuanPembelajaran}
                    </div>
                    {row.konflikJadwal && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#b91c1c', marginTop: 3 }}>
                        ! {row.konflikJadwal}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 11.5, color: '#475569', whiteSpace: 'nowrap' }}>
                    M{row.mingguMulai ?? 1}–M{row.mingguSelesai ?? promesDoc.columns.length}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      fontWeight: 700,
                      color: rowUnscheduled > 0 ? '#b91c1c' : '#172033',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {rowUnscheduled > 0 ? `${rowScheduled}/${row.alokasiJP}` : row.alokasiJP}
                  </td>
                  {promesDoc.columns.map((col, cIdx) => {
                    const jp = col.isEfektif ? row.distribusiJP[cIdx] : undefined;
                    const inTargetRange =
                      (col.semesterWeekNumber ?? cIdx + 1) >= (row.mingguMulai ?? 1) &&
                      (col.semesterWeekNumber ?? cIdx + 1) <=
                        (row.mingguSelesai ?? promesDoc.columns.length);

                    return (
                      <td
                        key={cIdx}
                        title={
                          !col.isEfektif
                            ? `${col.labelKegiatan || 'Non-Efektif'} (Libur/Agenda — tidak dapat diisi JP)`
                            : `${col.bulanNama} M${col.mingguKe} (${col.startDate})`
                        }
                        style={{
                          padding: isManualMode && col.isEfektif ? '3px 2px' : '6px 3px',
                          textAlign: 'center',
                          background: !col.isEfektif
                            ? '#e2e8f0'
                            : jp
                            ? '#eff6ff'
                            : inTargetRange
                            ? '#fafaf9'
                            : 'transparent',
                          color: !col.isEfektif ? '#64748b' : jp ? '#1d4ed8' : '#94a3b8',
                          fontWeight: jp ? 700 : 400,
                          fontSize: !col.isEfektif ? 9.5 : 12,
                        }}
                      >
                        {!col.isEfektif ? (
                          <span>{shortTag(col.labelKegiatan)}</span>
                        ) : isManualMode && row.tpId ? (
                          <input
                            aria-label={`JP manual ${row.kodeTP} ${col.bulanNama} M${col.mingguKe}`}
                            type="number"
                            min={0}
                            max={24}
                            value={jp || ''}
                            placeholder="0"
                            onChange={(e) =>
                              handleManualCellChange(
                                row.tpId,
                                cIdx,
                                Number(e.target.value) || 0
                              )
                            }
                            style={{
                              width: 36,
                              textAlign: 'center',
                              fontSize: 11,
                              padding: '2px 2px',
                              border: '1px solid #cbd5e1',
                              borderRadius: 4,
                              background: '#ffffff',
                            }}
                          />
                        ) : jp ? (
                          `${jp}`
                        ) : (
                          ''
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
              <td colSpan={4} style={{ textAlign: 'right', fontSize: 12, color: '#0f172a' }}>
                Total JP Terjadwal per Minggu:
              </td>
              <td style={{ textAlign: 'center', color: '#1d4ed8', fontSize: 12.5 }}>
                {totalTerjadwal}
              </td>
              {promesDoc.columns.map((col, cIdx) => {
                const colSum = col.isEfektif
                  ? promesDoc.rows.reduce((s, r) => s + (r.distribusiJP[cIdx] || 0), 0)
                  : 0;
                const cap = col.kapasitasJP ?? promesDoc.jpPerMinggu ?? 99;
                const isOver = col.isEfektif && colSum > cap;
                return (
                  <td
                    key={`foot-${cIdx}`}
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      background: !col.isEfektif ? '#cbd5e1' : isOver ? '#fef2f2' : '#f8fafc',
                      color: !col.isEfektif ? '#475569' : isOver ? '#b91c1c' : '#0f172a',
                    }}
                  >
                    {col.isEfektif ? colSum : '-'}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
