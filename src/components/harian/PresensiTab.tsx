import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Printer,
  Plus,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import type {
  KelasHarianData,
  SiswaItem,
  StatusKehadiran,
} from '../../types/kelasHarian';
import { exportPresensiToDocx } from '../../utils/docxExporter';
import { applyNewStudentRoster } from '../../utils/kelasHarianStorage';
import { ImportSiswaModal } from './ImportSiswaModal';

interface PresensiTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList?: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
}

export const PresensiTab: React.FC<PresensiTabProps> = ({
  schoolProfile,
  kelasHarian,
  tpList = [],
  onUpdateKelasHarian,
  onToast,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'fokus'>('matrix');
  const [selectedPertemuan, setSelectedPertemuan] = useState<number>(1);
  const [showAddSiswa, setShowAddSiswa] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newNis, setNewNis] = useState('');
  const [newJK, setNewJK] = useState<'L' | 'P'>('L');

  const handleImportStudents = (newStudents: SiswaItem[], resetExistingScores: boolean) => {
    const updated = applyNewStudentRoster(kelasHarian, newStudents, tpList, resetExistingScores);
    onUpdateKelasHarian(updated);
    onToast(`Berhasil mengimpor ${newStudents.length} siswa ke kelas ${schoolProfile.rombelAktif}!`);
  };

  const totalPertemuan = Math.min(16, kelasHarian.daftarPresensi.length);
  const activePertemuan = kelasHarian.daftarPresensi.slice(0, totalPertemuan);

  // Hitung total statistik kehadiran
  let totalH = 0;
  let totalS = 0;
  let totalI = 0;
  let totalA = 0;
  let totalSlot = 0;

  kelasHarian.daftarSiswa.forEach((siswa) => {
    activePertemuan.forEach((p) => {
      const st = p.statusMap[siswa.id] || 'H';
      totalSlot++;
      if (st === 'H') totalH++;
      else if (st === 'S') totalS++;
      else if (st === 'I') totalI++;
      else if (st === 'A') totalA++;
    });
  });

  const classAvgPct = totalSlot > 0 ? Math.round((totalH / totalSlot) * 100) : 100;

  // Handler toggle status
  const handleToggleStatus = (siswaId: string, pertemuanKe: number) => {
    const updatedPresensi = kelasHarian.daftarPresensi.map((p) => {
      if (p.pertemuanKe !== pertemuanKe) return p;
      const current = p.statusMap[siswaId] || 'H';
      const nextStatus: Record<StatusKehadiran, StatusKehadiran> = {
        H: 'S',
        S: 'I',
        I: 'A',
        A: 'H',
      };
      return {
        ...p,
        statusMap: {
          ...p.statusMap,
          [siswaId]: nextStatus[current],
        },
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarPresensi: updatedPresensi,
    });
  };

  // Handler set status langsung
  const handleSetStatus = (siswaId: string, pertemuanKe: number, status: StatusKehadiran) => {
    const updatedPresensi = kelasHarian.daftarPresensi.map((p) => {
      if (p.pertemuanKe !== pertemuanKe) return p;
      return {
        ...p,
        statusMap: {
          ...p.statusMap,
          [siswaId]: status,
        },
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarPresensi: updatedPresensi,
    });
  };

  // Handler Tandai Semua Hadir untuk pertemuan tertentu
  const handleSetAllHadir = (pertemuanKe: number) => {
    const updatedPresensi = kelasHarian.daftarPresensi.map((p) => {
      if (p.pertemuanKe !== pertemuanKe) return p;
      const statusMap: { [siswaId: string]: StatusKehadiran } = {};
      kelasHarian.daftarSiswa.forEach((s) => {
        statusMap[s.id] = 'H';
      });
      return {
        ...p,
        statusMap,
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarPresensi: updatedPresensi,
    });
    onToast(`Semua siswa ditandai Hadir (H) untuk Pertemuan ${pertemuanKe}!`);
  };

  // Handler Tambah Siswa
  const handleAddSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) return;

    const newId = `siswa_${Date.now()}`;
    const nextNo = kelasHarian.daftarSiswa.length + 1;
    const newSiswa: SiswaItem = {
      id: newId,
      noUrut: nextNo,
      nis: newNis.trim() || `2425${String(nextNo).padStart(3, '0')}`,
      nama: newNama.trim(),
      jenisKelamin: newJK,
    };

    const updatedPresensi = kelasHarian.daftarPresensi.map((p) => ({
      ...p,
      statusMap: {
        ...p.statusMap,
        [newId]: 'H' as StatusKehadiran,
      },
    }));

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarSiswa: [...kelasHarian.daftarSiswa, newSiswa],
      daftarPresensi: updatedPresensi,
    });

    setNewNama('');
    setNewNis('');
    setShowAddSiswa(false);
    onToast(`Siswa "${newSiswa.nama}" berhasil ditambahkan!`);
  };

  // Handler Hapus Siswa
  const handleDeleteSiswa = (siswaId: string, nama: string) => {
    if (!confirm(`Hapus data siswa "${nama}" dari daftar kelas?`)) return;

    const filtered = kelasHarian.daftarSiswa
      .filter((s) => s.id !== siswaId)
      .map((s, idx) => ({ ...s, noUrut: idx + 1 }));

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarSiswa: filtered,
    });
    onToast(`Siswa "${nama}" telah dihapus.`);
  };

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
              Administrasi Kelas • Presensi & Kehadiran
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Kelas {schoolProfile.rombelAktif} • {kelasHarian.daftarSiswa.length} Siswa
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            Daftar Presensi Harian Siswa (16 Pertemuan Semester)
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Toggle View Mode */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: 8,
              padding: 2,
              border: '1px solid #cbd5e1',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'matrix' ? '#2563eb' : 'transparent',
                color: viewMode === 'matrix' ? '#ffffff' : '#475569',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Matriks 16 Pertemuan
            </button>
            <button
              type="button"
              onClick={() => setViewMode('fokus')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'fokus' ? '#2563eb' : 'transparent',
                color: viewMode === 'fokus' ? '#ffffff' : '#475569',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fokus Per Pertemuan
            </button>
          </div>

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
            <FileSpreadsheet size={14} /> Impor dari Excel
          </button>

          <button
            type="button"
            onClick={() => setShowAddSiswa(!showAddSiswa)}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12 }}
          >
            <Plus size={13} /> Tambah Manual
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12 }}
          >
            <Printer size={13} /> Cetak
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await exportPresensiToDocx(schoolProfile, kelasHarian);
                onToast('File Word Presensi (.docx) berhasil diunduh!');
              } catch (e: any) {
                alert('Gagal mengunduh presensi: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
            style={{ fontSize: 12 }}
          >
            <Download size={13} /> Unduh Presensi (.docx)
          </button>
        </div>
      </div>

      {/* Form Tambah Siswa Baru */}
      {showAddSiswa && (
        <form
          onSubmit={handleAddSiswa}
          style={{
            background: '#f8fafc',
            border: '1px solid #bfdbfe',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a8a' }}>Tambah Peserta Didik:</div>
          <input
            type="text"
            className="form-input"
            style={{ width: 120, fontSize: 12, padding: '5px 10px' }}
            placeholder="NIS (mis: 2425031)"
            value={newNis}
            onChange={(e) => setNewNis(e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, minWidth: 200, fontSize: 12, padding: '5px 10px' }}
            placeholder="Nama Lengkap Siswa"
            value={newNama}
            onChange={(e) => setNewNama(e.target.value)}
            required
          />
          <select
            className="form-input"
            style={{ width: 90, fontSize: 12, padding: '5px 8px' }}
            value={newJK}
            onChange={(e) => setNewJK(e.target.value as 'L' | 'P')}
          >
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
          <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
            Simpan
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={() => setShowAddSiswa(false)}
          >
            Batal
          </button>
        </form>
      )}

      {/* Strip Statistik Kehadiran Kelas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Rata-rata Kehadiran</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: classAvgPct >= 85 ? '#15803d' : '#b91c1c' }}>
            {classAvgPct}%
          </div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Total Hadir (H)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{totalH}</div>
        </div>
        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>Total Sakit (S)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#a16207' }}>{totalS}</div>
        </div>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>Total Izin (I)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>{totalI}</div>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>Total Alfa (A)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{totalA}</div>
        </div>
      </div>

      {/* MODE 1: MATRIKS 16 PERTEMUAN */}
      {viewMode === 'matrix' && (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                <th style={{ padding: '8px 4px', border: '1px solid #cbd5e1', width: 35, textAlign: 'center' }}>No</th>
                <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', width: 75, textAlign: 'center' }}>NIS</th>
                <th style={{ padding: '8px 8px', border: '1px solid #cbd5e1', minWidth: 160, textAlign: 'left' }}>
                  Nama Lengkap Siswa
                </th>
                <th style={{ padding: '8px 4px', border: '1px solid #cbd5e1', width: 35, textAlign: 'center' }}>L/P</th>
                {activePertemuan.map((p) => (
                  <th
                    key={p.pertemuanKe}
                    style={{
                      padding: '6px 2px',
                      border: '1px solid #cbd5e1',
                      width: 28,
                      textAlign: 'center',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                    title={`Klik untuk tandai semua hadir pada Pertemuan ${p.pertemuanKe} (${p.tanggal})`}
                    onClick={() => handleSetAllHadir(p.pertemuanKe)}
                  >
                    P{p.pertemuanKe}
                    <div style={{ fontSize: 9, opacity: 0.8 }}>Semua H</div>
                  </th>
                ))}
                <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 30, textAlign: 'center', background: '#059669' }}>H</th>
                <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 30, textAlign: 'center', background: '#d97706' }}>S</th>
                <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 30, textAlign: 'center', background: '#2563eb' }}>I</th>
                <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 30, textAlign: 'center', background: '#dc2626' }}>A</th>
                <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 50, textAlign: 'center', background: '#1e3a8a' }}>%</th>
                <th style={{ padding: '6px 4px', border: '1px solid #cbd5e1', width: 35, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {kelasHarian.daftarSiswa.map((siswa, sIdx) => {
                let sH = 0;
                let sS = 0;
                let sI = 0;
                let sA = 0;

                return (
                  <tr key={siswa.id} style={{ background: sIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{siswa.noUrut}</td>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>{siswa.nis}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>
                      {siswa.nama}
                    </td>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{siswa.jenisKelamin}</td>

                    {/* Sel Pertemuan 1 - 16 */}
                    {activePertemuan.map((p) => {
                      const st = p.statusMap[siswa.id] || 'H';
                      if (st === 'H') sH++;
                      else if (st === 'S') sS++;
                      else if (st === 'I') sI++;
                      else if (st === 'A') sA++;

                      const colorBg =
                        st === 'H' ? '#f0fdf4' : st === 'S' ? '#fef9c3' : st === 'I' ? '#eff6ff' : '#fee2e2';
                      const colorText =
                        st === 'H' ? '#15803d' : st === 'S' ? '#a16207' : st === 'I' ? '#1d4ed8' : '#b91c1c';

                      return (
                        <td
                          key={p.pertemuanKe}
                          onClick={() => handleToggleStatus(siswa.id, p.pertemuanKe)}
                          title={`Klik untuk ganti status (H -> S -> I -> A)`}
                          style={{
                            padding: '4px 2px',
                            border: '1px solid #e2e8f0',
                            textAlign: 'center',
                            fontWeight: 800,
                            background: colorBg,
                            color: colorText,
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          {st}
                        </td>
                      );
                    })}

                    {/* Rekap per siswa */}
                    {(() => {
                      const pct = totalPertemuan > 0 ? Math.round((sH / totalPertemuan) * 100) : 100;
                      return (
                        <>
                          <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#15803d' }}>{sH}</td>
                          <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#a16207' }}>{sS}</td>
                          <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{sI}</td>
                          <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{sA}</td>
                          <td
                            style={{
                              padding: '6px 4px',
                              border: '1px solid #e2e8f0',
                              textAlign: 'center',
                              fontWeight: 800,
                              color: pct >= 85 ? '#15803d' : '#dc2626',
                            }}
                          >
                            {pct}%
                          </td>
                          <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteSiswa(siswa.id, siswa.nama)}
                              title="Hapus Siswa"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: 2,
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '8px 12px', background: '#f8fafc', fontSize: 11.5, color: '#64748b', display: 'flex', gap: 16 }}>
            <span>💡 <strong>Tip Cepat:</strong> Klik huruf pada kolom pertemuan untuk mengubah status (<strong>H</strong>adir &rarr; <strong>S</strong>akit &rarr; <strong>I</strong>zin &rarr; <strong>A</strong>lfa).</span>
            <span>Klik judul kolom <strong>P1, P2...</strong> untuk otomatis menandai seluruh kelas Hadir.</span>
          </div>
        </div>
      )}

      {/* MODE 2: FOKUS PER PERTEMUAN (TOUCH-FRIENDLY & CEPAT) */}
      {viewMode === 'fokus' && (
        <div>
          {/* Selector Pertemuan */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
              overflowX: 'auto',
              paddingBottom: 6,
            }}
          >
            {activePertemuan.map((p) => {
              const active = selectedPertemuan === p.pertemuanKe;
              return (
                <button
                  key={p.pertemuanKe}
                  type="button"
                  onClick={() => setSelectedPertemuan(p.pertemuanKe)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: active ? '#2563eb' : '#ffffff',
                    color: active ? '#ffffff' : '#334155',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  P{p.pertemuanKe} ({p.tanggal.slice(5)})
                </button>
              );
            })}
          </div>

          {/* Quick bar pertemuan aktif */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: '#eff6ff',
              borderRadius: 8,
              marginBottom: 14,
            }}
          >
            <div>
              <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: 14 }}>
                Pertemuan Ke-{selectedPertemuan}
              </span>
              <span style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>
                Tanggal: {activePertemuan.find((p) => p.pertemuanKe === selectedPertemuan)?.tanggal}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSetAllHadir(selectedPertemuan)}
              className="btn btn-sm btn-outline"
              style={{ background: '#ffffff', borderColor: '#2563eb', color: '#2563eb', fontSize: 12 }}
            >
              <CheckCircle2 size={14} /> Tandai Semua Hadir (H)
            </button>
          </div>

          {/* Grid Kartu Siswa */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 10,
            }}
          >
            {kelasHarian.daftarSiswa.map((siswa) => {
              const curPertemuan = activePertemuan.find((p) => p.pertemuanKe === selectedPertemuan);
              const status: StatusKehadiran = (curPertemuan?.statusMap[siswa.id] as StatusKehadiran) || 'H';

              return (
                <div
                  key={siswa.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      #{siswa.noUrut} • NIS {siswa.nis} ({siswa.jenisKelamin})
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{siswa.nama}</div>
                  </div>

                  {/* Tombol Status H, S, I, A */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['H', 'S', 'I', 'A'] as StatusKehadiran[]).map((st) => {
                      const isActive = status === st;
                      const activeColor =
                        st === 'H' ? '#15803d' : st === 'S' ? '#a16207' : st === 'I' ? '#2563eb' : '#dc2626';
                      const activeBg =
                        st === 'H' ? '#dcfce7' : st === 'S' ? '#fef9c3' : st === 'I' ? '#dbeafe' : '#fee2e2';

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleSetStatus(siswa.id, selectedPertemuan, st)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: isActive ? `2px solid ${activeColor}` : '1px solid #cbd5e1',
                            background: isActive ? activeBg : '#ffffff',
                            color: isActive ? activeColor : '#64748b',
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
