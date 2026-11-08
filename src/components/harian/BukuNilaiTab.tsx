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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 800,
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 99,
              }}
            >
              Administrasi Kelas • Buku Nilai Formatif & Sumatif
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Bobot: Formatif 50% • STS 25% • SAS 25%
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            Buku & Rekap Nilai Asesmen Per TP (Kurikulum Merdeka)
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-sm btn-outline"
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: '#047857',
              borderColor: '#6ee7b7',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Import atau salin nama siswa langsung dari file Excel / Dapodik"
          >
            <FileSpreadsheet size={14} /> Impor Siswa dari Excel
          </button>

          <button
            type="button"
            onClick={handlePopulateRealisticScores}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12, color: '#166534', borderColor: '#86efac' }}
            title="Isi contoh nilai asesmen secara otomatis"
          >
            <Sparkles size={13} /> 🎲 Isi Contoh Nilai
          </button>

          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak Buku Nilai Siswa')) return;
              window.print();
            }}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12 }}
          >
            <Printer size={13} /> Cetak
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
            style={{ fontSize: 12 }}
          >
            <Download size={13} /> Unduh Nilai (.docx)
          </button>
        </div>
      </div>

      {/* Strip Statistik Capaian Nilai Kelas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Rata-rata Nilai Kelas</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a' }}>{avgKelas}</div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Sangat Baik (&ge; 86)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{totalSangatBaik} Siswa</div>
        </div>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>Baik (71 - 85)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>{totalBaik} Siswa</div>
        </div>
        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>Cukup (56 - 70)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#a16207' }}>{totalCukup} Siswa</div>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>Perlu Bimbingan (&lt; 56)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{totalPerluBimbingan} Siswa</div>
        </div>
      </div>

      {/* Tabel Nilai Lengkap */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
              <th style={{ padding: '8px 4px', border: '1px solid #cbd5e1', width: 35, textAlign: 'center' }}>No</th>
              <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', width: 75, textAlign: 'center' }}>NIS</th>
              <th style={{ padding: '8px 8px', border: '1px solid #cbd5e1', minWidth: 160, textAlign: 'left' }}>
                Nama Peserta Didik
              </th>

              {/* Kolom Formatif per TP */}
              {tpList.map((tp) => (
                <th
                  key={tp.kode}
                  style={{
                    padding: '6px 4px',
                    border: '1px solid #cbd5e1',
                    width: 52,
                    textAlign: 'center',
                    fontSize: 11,
                  }}
                  title={tp.materiPokok}
                >
                  {tp.kode}
                  <div style={{ fontSize: 8.5, opacity: 0.8, fontWeight: 'normal' }}>Formatif</div>
                </th>
              ))}

              <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 55, textAlign: 'center', background: '#2563eb' }}>
                R.Form
              </th>
              <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 52, textAlign: 'center', background: '#d97706' }}>
                STS
              </th>
              <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 52, textAlign: 'center', background: '#d97706' }}>
                SAS
              </th>
              <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 55, textAlign: 'center', background: '#059669' }}>
                N.Akhir
              </th>
              <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: 95, textAlign: 'center' }}>
                Predikat KKTP
              </th>
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
        <div style={{ padding: '8px 12px', background: '#f8fafc', fontSize: 11.5, color: '#64748b' }}>
          💡 <strong>Keterangan KKTP:</strong> &ge; 86 (Sangat Baik) • 71 - 85 (Baik / Tuntas) • 56 - 70 (Cukup) • &lt; 56 (Perlu Bimbingan / Remedial). Seluruh perubahan angka otomatis tersimpan & memperbarui deskripsi rapor siswa!
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
