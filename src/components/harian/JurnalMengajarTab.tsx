import React, { useState } from 'react';
import {
  Download,
  Printer,
  Plus,
  Edit2,
  Trash2,
  Save,
  Sparkles,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import type {
  KelasHarianData,
  JurnalMengajarItem,
} from '../../types/kelasHarian';
import { exportJurnalMengajarToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import { generateDefaultJurnal } from '../../utils/kelasHarianStorage';

interface JurnalMengajarTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
}

export const JurnalMengajarTab: React.FC<JurnalMengajarTabProps> = ({
  schoolProfile,
  kelasHarian,
  tpList,
  onUpdateKelasHarian,
  onToast,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<JurnalMengajarItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New agenda state
  const [newTanggal, setNewTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [newJam, setNewJam] = useState('1 - 3 (07.30 - 09.30)');
  const [newKodeTP, setNewKodeTP] = useState(tpList[0]?.kode || 'TP.1');
  const [newMateri, setNewMateri] = useState(tpList[0]?.materiPokok || 'Materi Pembelajaran');
  const [newKegiatan, setNewKegiatan] = useState('');
  const [newAbsen, setNewAbsen] = useState('Nihil (Semua Hadir)');
  const [newRefleksi, setNewRefleksi] = useState('');

  // Start edit
  const handleStartEdit = (item: JurnalMengajarItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editForm) return;

    const updatedJurnal = kelasHarian.daftarJurnal.map((j) =>
      j.id === editForm.id ? editForm : j
    );

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarJurnal: updatedJurnal,
    });

    setEditingId(null);
    setEditForm(null);
    onToast(`Catatan Jurnal Pertemuan ${editForm.pertemuanKe} berhasil diperbarui!`);
  };

  // Tambah agenda pertemuan baru
  const handleAddNewAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    const nextPertemuan = kelasHarian.daftarJurnal.length + 1;
    const newEntry: JurnalMengajarItem = {
      id: `jurnal_${Date.now()}`,
      pertemuanKe: nextPertemuan,
      tanggal: newTanggal,
      jamKe: newJam,
      kodeTP: newKodeTP,
      materiPokok: newMateri,
      kegiatanPembelajaran:
        newKegiatan.trim() ||
        `Pembelajaran berdiferensiasi dan pendalaman materi ${newMateri} dengan metode diskusi kelompok dan penugasan lembar kerja formatif.`,
      siswaTidakHadir: newAbsen,
      catatanRefleksi:
        newRefleksi.trim() || 'Peserta didik aktif berdiskusi dan antusias mengikuti seluruh tahapan pembelajaran.',
    };

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarJurnal: [...kelasHarian.daftarJurnal, newEntry],
    });

    setShowAddModal(false);
    onToast(`Pertemuan ${nextPertemuan} berhasil ditambahkan ke agenda jurnal!`);
  };

  // Hapus pertemuan
  const handleDeleteAgenda = (id: string, pertemuanKe: number) => {
    if (!confirm(`Hapus catatan jurnal pertemuan ke-${pertemuanKe}?`)) return;

    const filtered = kelasHarian.daftarJurnal
      .filter((j) => j.id !== id)
      .map((j, idx) => ({ ...j, pertemuanKe: idx + 1 }));

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarJurnal: filtered,
    });

    onToast(`Catatan jurnal telah dihapus.`);
  };

  // Auto-Sync dari TP Semester
  const handleAutoSyncFromTP = () => {
    if (!confirm('Sinkronkan ulang seluruh 16 jurnal pertemuan dari Peta TP dan Promes? Catatan manual akan diperbarui.')) {
      return;
    }

    const newJurnalList = generateDefaultJurnal(tpList, 16);
    onUpdateKelasHarian({
      ...kelasHarian,
      daftarJurnal: newJurnalList,
    });
    onToast('Agenda & Jurnal Guru berhasil disinkronkan dari Peta TP semester!');
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
              Administrasi Kelas • Agenda & Jurnal Guru
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {schoolProfile.mataPelajaranUtama} • Kelas {schoolProfile.rombelAktif} ({kelasHarian.daftarJurnal.length} Pertemuan Terjadwal)
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            Buku Agenda & Jurnal Mengajar Guru Harian
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleAutoSyncFromTP}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12, color: '#0369a1', borderColor: '#7dd3fc' }}
            title="Sinkronkan materi dan tujuan pembelajaran secara otomatis dari Promes"
          >
            <Sparkles size={13} /> Auto-Isi dari TP
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-sm btn-outline"
            style={{ fontSize: 12 }}
          >
            <Plus size={13} /> Tambah Pertemuan
          </button>

          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak dokumen Jurnal Mengajar')) return;
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
                const ok = await exportJurnalMengajarToDocx(schoolProfile, kelasHarian);
                if (ok) {
                  onToast('File Word Jurnal Mengajar (.docx) berhasil diunduh!');
                }
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
            style={{ fontSize: 12 }}
          >
            <Download size={13} /> Unduh Jurnal (.docx)
          </button>
        </div>
      </div>

      {/* Modal Tambah Pertemuan */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 600,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>
              Tambah Agenda Jurnal Mengajar Baru
            </h3>
            <form onSubmit={handleAddNewAgenda}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Tanggal Pertemuan:
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={newTanggal}
                    onChange={(e) => setNewTanggal(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Jam Pelajaran:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newJam}
                    onChange={(e) => setNewJam(e.target.value)}
                    placeholder="mis: 1 - 3 (07.30 - 09.30)"
                    required
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Pilih Tujuan Pembelajaran (TP):
                  </label>
                  <select
                    className="form-input"
                    value={newKodeTP}
                    onChange={(e) => {
                      const selected = tpList.find((t) => t.kode === e.target.value);
                      setNewKodeTP(e.target.value);
                      if (selected) setNewMateri(selected.materiPokok);
                    }}
                  >
                    {tpList.map((tp) => (
                      <option key={tp.kode} value={tp.kode}>
                        [{tp.kode}] {tp.materiPokok}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Materi Pokok:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newMateri}
                    onChange={(e) => setNewMateri(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Uraian Kegiatan Pembelajaran:
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={newKegiatan}
                  onChange={(e) => setNewKegiatan(e.target.value)}
                  placeholder="Kegiatan pendahuluan, inti, penutup..."
                />
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Siswa Tidak Hadir:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newAbsen}
                    onChange={(e) => setNewAbsen(e.target.value)}
                    placeholder="mis: Nihil / Budi (Sakit)"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Catatan Refleksi Guru:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newRefleksi}
                    onChange={(e) => setNewRefleksi(e.target.value)}
                    placeholder="mis: Pembelajaran berjalan kondusif..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-sm btn-primary">
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daftar Jurnal / Tabel Agenda */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
              <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', width: 45, textAlign: 'center' }}>P.Ke</th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', width: 140, textAlign: 'left' }}>
                Hari / Tanggal & Jam
              </th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', width: 180, textAlign: 'left' }}>
                Kode TP & Materi Pokok
              </th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', minWidth: 260, textAlign: 'left' }}>
                Uraian Kegiatan Pembelajaran
              </th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', width: 130, textAlign: 'left' }}>
                Ketidakhadiran
              </th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', width: 160, textAlign: 'left' }}>
                Catatan Refleksi
              </th>
              <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', width: 65, textAlign: 'center' }}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {kelasHarian.daftarJurnal.map((item, idx) => {
              const isEditing = editingId === item.id;

              if (isEditing && editForm) {
                return (
                  <tr key={item.id} style={{ background: '#fef3c7' }}>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800 }}>
                      {editForm.pertemuanKe}
                    </td>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                      <input
                        type="date"
                        className="form-input"
                        style={{ fontSize: 11.5, padding: '3px 6px', marginBottom: 4 }}
                        value={editForm.tanggal}
                        onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: 11, padding: '3px 6px' }}
                        value={editForm.jamKe}
                        onChange={(e) => setEditForm({ ...editForm, jamKe: e.target.value })}
                      />
                    </td>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                      <select
                        className="form-input"
                        style={{ fontSize: 11.5, padding: '3px 6px', marginBottom: 4 }}
                        value={editForm.kodeTP}
                        onChange={(e) => {
                          const t = tpList.find((x) => x.kode === e.target.value);
                          setEditForm({
                            ...editForm,
                            kodeTP: e.target.value,
                            materiPokok: t ? t.materiPokok : editForm.materiPokok,
                          });
                        }}
                      >
                        {tpList.map((tp) => (
                          <option key={tp.kode} value={tp.kode}>
                            {tp.kode} - {tp.materiPokok.slice(0, 25)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: 11, padding: '3px 6px' }}
                        value={editForm.materiPokok}
                        onChange={(e) => setEditForm({ ...editForm, materiPokok: e.target.value })}
                      />
                    </td>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                      <textarea
                        className="form-input"
                        rows={3}
                        style={{ fontSize: 11.5, padding: 6 }}
                        value={editForm.kegiatanPembelajaran}
                        onChange={(e) => setEditForm({ ...editForm, kegiatanPembelajaran: e.target.value })}
                      />
                    </td>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: 11.5, padding: '4px 6px' }}
                        value={editForm.siswaTidakHadir}
                        onChange={(e) => setEditForm({ ...editForm, siswaTidakHadir: e.target.value })}
                      />
                    </td>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                      <textarea
                        className="form-input"
                        rows={2}
                        style={{ fontSize: 11, padding: 6 }}
                        value={editForm.catatanRefleksi}
                        onChange={(e) => setEditForm({ ...editForm, catatanRefleksi: e.target.value })}
                      />
                    </td>
                    <td style={{ padding: 6, border: '1px solid #cbd5e1', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="btn btn-sm btn-primary"
                          style={{ padding: '3px 6px', fontSize: 11 }}
                        >
                          <Save size={11} /> Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(null);
                          }}
                          className="btn btn-sm btn-outline"
                          style={{ padding: '3px 6px', fontSize: 11 }}
                        >
                          Batal
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '10px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1e3a8a' }}>
                    {item.pertemuanKe}
                  </td>
                  <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.tanggal}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{item.jamKe}</div>
                  </td>
                  <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0' }}>
                    <span
                      style={{
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10.5,
                        fontWeight: 800,
                        marginRight: 6,
                      }}
                    >
                      {item.kodeTP}
                    </span>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{item.materiPokok}</span>
                  </td>
                  <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', lineHeight: 1.45, color: '#334155' }}>
                    {item.kegiatanPembelajaran}
                  </td>
                  <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', fontSize: 11.5 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: item.siswaTidakHadir.includes('Nihil') ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {item.siswaTidakHadir}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', fontStyle: 'italic', color: '#64748b', fontSize: 11.5 }}>
                    {item.catatanRefleksi || '-'}
                  </td>
                  <td style={{ padding: '8px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        title="Edit Pertemuan"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAgenda(item.id, item.pertemuanKe)}
                        title="Hapus Pertemuan"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
