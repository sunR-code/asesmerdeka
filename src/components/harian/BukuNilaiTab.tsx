import React, { useState } from 'react';
import {
  Download,
  Printer,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import type {
  KelasHarianData,
  SiswaItem,
} from '../../types/kelasHarian';
import { exportDaftarNilaiToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import {
  computeNilaiAkhir,
  generateAutoDeskripsiRapor,
  generateDefaultNilai,
  applyNewStudentRoster,
} from '../../utils/kelasHarianStorage';
import { ImportSiswaModal } from './ImportSiswaModal';

interface BukuNilaiTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
}

export const BukuNilaiTab: React.FC<BukuNilaiTabProps> = ({
  schoolProfile,
  kelasHarian,
  tpList,
  onUpdateKelasHarian,
  onToast,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleImportStudents = (newStudents: SiswaItem[], resetExistingScores: boolean) => {
    const updated = applyNewStudentRoster(kelasHarian, newStudents, tpList, resetExistingScores);
    onUpdateKelasHarian(updated);
    onToast(`Berhasil mengimpor ${newStudents.length} siswa ke kelas ${schoolProfile.rombelAktif}!`);
  };
  // Update score formatif inline
  const handleScoreChange = (siswaId: string, kodeTP: string, val: number) => {
    const clampedVal = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));

    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (item.siswaId !== siswaId) return item;

      const newFormatif = {
        ...item.nilaiFormatif,
        [kodeTP]: clampedVal,
      };

      const { na, predikat } = computeNilaiAkhir(newFormatif, item.nilaiSTS, item.nilaiSAS);
      const deskripsi = generateAutoDeskripsiRapor(newFormatif, tpList, item.nama);

      return {
        ...item,
        nilaiFormatif: newFormatif,
        nilaiAkhir: na,
        predikatKKTP: predikat,
        deskripsiRapor: deskripsi,
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarNilai: updatedNilai,
    });
  };

  // Update STS / SAS inline
  const handleSumatifChange = (siswaId: string, type: 'STS' | 'SAS', val: number) => {
    const clampedVal = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));

    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (item.siswaId !== siswaId) return item;

      const newSTS = type === 'STS' ? clampedVal : item.nilaiSTS;
      const newSAS = type === 'SAS' ? clampedVal : item.nilaiSAS;

      const { na, predikat } = computeNilaiAkhir(item.nilaiFormatif, newSTS, newSAS);
      const deskripsi = generateAutoDeskripsiRapor(item.nilaiFormatif, tpList, item.nama);

      return {
        ...item,
        nilaiSTS: newSTS,
        nilaiSAS: newSAS,
        nilaiAkhir: na,
        predikatKKTP: predikat,
        deskripsiRapor: deskripsi,
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarNilai: updatedNilai,
    });
  };

  // Isi contoh nilai realistis
  const handlePopulateRealisticScores = () => {
    if (!confirm('Isi otomatis dengan contoh nilai realistis (rentang 72-96)? Nilai saat ini akan disesuaikan.')) {
      return;
    }

    const newNilaiList = generateDefaultNilai(kelasHarian.daftarSiswa, tpList);
    onUpdateKelasHarian({
      ...kelasHarian,
      daftarNilai: newNilaiList,
    });
    onToast('Contoh nilai asesmen realistis berhasil dimuat!');
  };

  // Hitung rata-rata kelas
  const totalSiswa = kelasHarian.daftarNilai.length;
  const avgKelas =
    totalSiswa > 0
      ? Math.round(kelasHarian.daftarNilai.reduce((acc, curr) => acc + curr.nilaiAkhir, 0) / totalSiswa)
      : 0;

  let totalSangatBaik = 0;
  let totalBaik = 0;
  let totalCukup = 0;
  let totalPerluBimbingan = 0;

  kelasHarian.daftarNilai.forEach((item) => {
    if (item.predikatKKTP === 'Sangat Baik') totalSangatBaik++;
    else if (item.predikatKKTP === 'Baik') totalBaik++;
    else if (item.predikatKKTP === 'Cukup') totalCukup++;
    else totalPerluBimbingan++;
  });

  return (
    <div>
      {/* Header Info & Actions */}
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
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#172033', margin: 0 }}>
            Buku nilai per TP
          </h2>
          <p className="tabular-nums" style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
            Kelas {schoolProfile.rombelAktif} · Bobot nilai akhir: Formatif 50% · STS 25% · SAS 25%
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-sm btn-outline"
            title="Impor atau salin nama siswa dari file Excel / Dapodik"
          >
            <FileSpreadsheet size={14} aria-hidden="true" /> Impor Excel
          </button>

          <button
            type="button"
            onClick={handlePopulateRealisticScores}
            className="btn btn-sm btn-outline"
            title="Isi contoh nilai asesmen secara otomatis"
          >
            <Sparkles size={13} aria-hidden="true" /> Isi contoh nilai
          </button>

          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak Buku Nilai Siswa')) return;
              window.print();
            }}
            className="btn btn-sm btn-outline"
          >
            <Printer size={13} aria-hidden="true" /> Cetak
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                const ok = await exportDaftarNilaiToDocx(schoolProfile, kelasHarian, tpList);
                if (ok) {
                  onToast('File Word Buku Nilai (.docx) berhasil diunduh!');
                }
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Download size={13} aria-hidden="true" /> Unduh Nilai (.docx)
          </button>
        </div>
      </div>

      {/* Ringkasan Capaian Nilai Kelas */}
      <div
        className="tabular-nums"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { label: 'Rata-rata kelas', val: avgKelas, dot: '#2563eb' },
          { label: 'Sangat Baik (>= 86)', val: `${totalSangatBaik} siswa`, dot: '#16a34a' },
          { label: 'Baik (71–85)', val: `${totalBaik} siswa`, dot: '#0284c7' },
          { label: 'Cukup (56–70)', val: `${totalCukup} siswa`, dot: '#d97706' },
          { label: 'Perlu Bimbingan (< 56)', val: `${totalPerluBimbingan} siswa`, dot: '#dc2626' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: stat.dot, flexShrink: 0 }} />
              <span>{stat.label}</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#172033', marginTop: 2 }}>{stat.val}</div>
          </div>
        ))}
      </div>

      {/* Tabel Nilai Lengkap */}
      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th style={{ width: 38, textAlign: 'center' }}>No</th>
              <th style={{ width: 78, textAlign: 'center' }}>NIS</th>
              <th style={{ minWidth: 160, textAlign: 'left', borderRight: '2px solid #cbd5e1' }}>
                Nama Peserta Didik
              </th>

              {/* Kolom Formatif per TP */}
              {tpList.map((tp, idx) => (
                <th
                  key={tp.kode}
                  style={{
                    width: 54,
                    textAlign: 'center',
                    fontSize: 11.5,
                    borderRight: idx === tpList.length - 1 ? '2px solid #cbd5e1' : undefined,
                  }}
                  title={tp.materiPokok}
                >
                  <div>{tp.kode}</div>
                  <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 500 }}>Form</div>
                </th>
              ))}

              <th style={{ width: 58, textAlign: 'center', color: '#1d4ed8' }}>R.Form</th>
              <th style={{ width: 54, textAlign: 'center' }}>STS</th>
              <th style={{ width: 54, textAlign: 'center' }}>SAS</th>
              <th style={{ width: 60, textAlign: 'center', color: '#15803d', borderLeft: '2px solid #cbd5e1' }}>
                N.Akhir
              </th>
              <th style={{ width: 105, textAlign: 'center' }}>Predikat</th>
            </tr>
          </thead>
          <tbody>
            {kelasHarian.daftarNilai.map((item, idx) => {
              const scores = Object.values(item.nilaiFormatif);
              const avgFormatif =
                scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

              return (
                <tr key={item.siswaId} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                    {item.nis}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>
                    {item.nama}
                  </td>

                  {/* Input Formatif per TP */}
                  {tpList.map((tp) => {
                    const score = item.nilaiFormatif[tp.kode] ?? 75;
                    return (
                      <td key={tp.kode} style={{ padding: '4px 2px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={score}
                          onChange={(e) => handleScoreChange(item.siswaId, tp.kode, parseInt(e.target.value) || 0)}
                          style={{
                            width: 44,
                            padding: '3px 2px',
                            textAlign: 'center',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 700,
                            color: score >= 75 ? '#15803d' : '#b91c1c',
                          }}
                        />
                      </td>
                    );
                  })}

                  {/* Rata-rata Formatif */}
                  <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                    {avgFormatif}
                  </td>

                  {/* Input STS */}
                  <td style={{ padding: '4px 2px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.nilaiSTS}
                      onChange={(e) => handleSumatifChange(item.siswaId, 'STS', parseInt(e.target.value) || 0)}
                      style={{
                        width: 44,
                        padding: '3px 2px',
                        textAlign: 'center',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />
                  </td>

                  {/* Input SAS */}
                  <td style={{ padding: '4px 2px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.nilaiSAS}
                      onChange={(e) => handleSumatifChange(item.siswaId, 'SAS', parseInt(e.target.value) || 0)}
                      style={{
                        width: 44,
                        padding: '3px 2px',
                        textAlign: 'center',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />
                  </td>

                  {/* Nilai Akhir (NA) */}
                  <td
                    style={{
                      padding: '6px 4px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                      fontWeight: 800,
                      background: item.nilaiAkhir >= 75 ? '#f0fdf4' : '#fee2e2',
                      color: item.nilaiAkhir >= 75 ? '#15803d' : '#b91c1c',
                      fontSize: 13,
                    }}
                  >
                    {item.nilaiAkhir}
                  </td>

                  {/* Predikat KKTP Badge */}
                  <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontSize: 10.5,
                        fontWeight: 800,
                        background:
                          item.predikatKKTP === 'Sangat Baik'
                            ? '#dcfce7'
                            : item.predikatKKTP === 'Baik'
                            ? '#dbeafe'
                            : item.predikatKKTP === 'Cukup'
                            ? '#fef9c3'
                            : '#fee2e2',
                        color:
                          item.predikatKKTP === 'Sangat Baik'
                            ? '#15803d'
                            : item.predikatKKTP === 'Baik'
                            ? '#1d4ed8'
                            : item.predikatKKTP === 'Cukup'
                            ? '#a16207'
                            : '#b91c1c',
                      }}
                    >
                      {item.predikatKKTP}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '9px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
          <strong style={{ color: '#334155' }}>Keterangan KKTP:</strong> &ge; 86 (Sangat Baik) · 71–85 (Baik) · 56–70 (Cukup) · &lt; 56 (Perlu Bimbingan). Perubahan nilai tersimpan lokal di perangkat Anda.
        </div>
      </div>

      {/* Modal Impor Data Siswa dari Excel / Dapodik */}
      <ImportSiswaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportStudents}
        currentCount={kelasHarian.daftarSiswa.length}
        rombelName={schoolProfile.rombelAktif}
      />
    </div>
  );
};
