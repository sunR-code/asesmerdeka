import React, { useState, useMemo } from 'react';
import {
  Download,
  Printer,
  Plus,
  Edit2,
  Trash2,
  Save,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import type {
  KelasHarianData,
  JurnalMengajarItem,
  JurnalStatusKeterlaksanaan,
} from '../../types/kelasHarian';
import { exportJurnalMengajarToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import {
  generateDefaultJurnal,
  createEmptyKelasHarianData,
  loadDemoKelasHarianData,
  confirmLegacyKelasHarianAsActual,
  confirmSimulationExportIfNeeded,
  isKelasHarianLegacyUnverified,
  validateJurnalEntry,
  syncJurnalAbsentFromPresensi,
} from '../../utils/kelasHarianStorage';
import { SimulatedDataNoticeBanner } from './SimulatedDataNoticeBanner';

interface JurnalMengajarTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
  isSeparateDemoPreview?: boolean;
  onOpenSeparateDemoPreview?: () => void;
  onExitDemoPreview?: () => void;
}

const STATUS_KETERLAKSANAAN_LABEL: Record<JurnalStatusKeterlaksanaan, string> = {
  terlaksana: 'Terlaksana',
  perlu_tindak_lanjut: 'Perlu Tindak Lanjut',
  ditunda: 'Ditunda / Jadwal Ulang',
};

export const JurnalMengajarTab: React.FC<JurnalMengajarTabProps> = ({
  schoolProfile,
  kelasHarian,
  tpList,
  onUpdateKelasHarian,
  onToast,
  isSeparateDemoPreview = false,
  onOpenSeparateDemoPreview,
  onExitDemoPreview,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<JurnalMengajarItem | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterTpId, setFilterTpId] = useState('');

  // New agenda state (menggunakan tpId imutabel sebagai acuan utama)
  const firstTP = tpList[0];
  const [newTanggal, setNewTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [newJam, setNewJam] = useState('1 - 3 (07.30 - 09.30)');
  const [newJumlahJP, setNewJumlahJP] = useState<number>(2);
  const [newTpId, setNewTpId] = useState(firstTP?.id || '');
  const [newKodeTP, setNewKodeTP] = useState(firstTP?.kode || 'TP.1');
  const [newSubTpIds, setNewSubTpIds] = useState<string[]>([]);
  const [newMateri, setNewMateri] = useState(firstTP?.materiPokok || 'Materi Pembelajaran');
  const [newKegiatan, setNewKegiatan] = useState('');
  const [newAbsen, setNewAbsen] = useState('Nihil (Semua Hadir)');
  const [newRefleksi, setNewRefleksi] = useState('');
  const [newStatus, setNewStatus] = useState<JurnalStatusKeterlaksanaan>('terlaksana');
  const [newTindakLanjut, setNewTindakLanjut] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const selectedAddTP = useMemo(
    () => tpList.find((t) => (newTpId && t.id === newTpId) || t.kode === newKodeTP),
    [tpList, newTpId, newKodeTP]
  );

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    kelasHarian.daftarJurnal.forEach((j) => {
      if (j.tanggal && j.tanggal.length >= 7) {
        months.add(j.tanggal.slice(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [kelasHarian.daftarJurnal]);

  const filteredJurnal = useMemo(() => {
    return kelasHarian.daftarJurnal.filter((j) => {
      if (filterMonth && !(j.tanggal || '').startsWith(filterMonth)) return false;
      if (filterTpId) {
        const matchesId = j.tpId === filterTpId;
        const tp = tpList.find((t) => t.id === filterTpId);
        const matchesKode = tp && j.kodeTP === tp.kode;
        if (!matchesId && !matchesKode) return false;
      }
      return true;
    });
  }, [kelasHarian.daftarJurnal, filterMonth, filterTpId, tpList]);

  const totalJPTerlaksana = useMemo(
    () =>
      filteredJurnal
        .filter((j) => (j.statusKeterlaksanaan || 'terlaksana') !== 'ditunda')
        .reduce((sum, j) => sum + (Number(j.jumlahJP) || 2), 0),
    [filteredJurnal]
  );

  const totalTindakLanjut = useMemo(
    () =>
      filteredJurnal.filter(
        (j) =>
          j.statusKeterlaksanaan === 'perlu_tindak_lanjut' ||
          j.statusKeterlaksanaan === 'ditunda'
      ).length,
    [filteredJurnal]
  );

  // Start edit
  const handleStartEdit = (item: JurnalMengajarItem) => {
    const resolvedTP = tpList.find(
      (t) => (item.tpId && t.id === item.tpId) || t.kode === item.kodeTP
    );
    setEditingId(item.id);
    setEditForm({
      ...item,
      tpId: item.tpId || resolvedTP?.id,
      jumlahJP: item.jumlahJP ?? 2,
      statusKeterlaksanaan: item.statusKeterlaksanaan || 'terlaksana',
    });
    setEditError(null);
  };

  // Save edit with validation
  const handleSaveEdit = () => {
    if (!editForm) return;
    const validation = validateJurnalEntry(
      editForm,
      kelasHarian.daftarJurnal,
      tpList,
      editForm.id
    );
    if (!validation.valid) {
      setEditError(validation.errors[0]);
      onToast(validation.errors[0]);
      return;
    }

    const finalForm: JurnalMengajarItem = {
      ...editForm,
      tpId: validation.resolvedTP?.id || editForm.tpId,
      kodeTP: validation.resolvedTP?.kode || editForm.kodeTP,
    };

    const updatedJurnal = kelasHarian.daftarJurnal.map((j) =>
      j.id === finalForm.id ? finalForm : j
    );

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarJurnal: updatedJurnal,
    });

    setEditingId(null);
    setEditForm(null);
    setEditError(null);
    onToast(`Catatan Jurnal Pertemuan ${finalForm.pertemuanKe} berhasil diperbarui!`);
  };

  // Tambah agenda pertemuan baru dengan validasi & tpId imutabel
  const handleAddNewAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const nextPertemuan = kelasHarian.daftarJurnal.length + 1;
    const candidateKegiatan =
      newKegiatan.trim() ||
      `Pembelajaran berdiferensiasi dan pendalaman materi ${newMateri} dengan metode diskusi kelompok dan penugasan lembar kerja formatif.`;

    const candidate: Partial<JurnalMengajarItem> = {
      pertemuanKe: nextPertemuan,
      tanggal: newTanggal,
      jamKe: newJam,
      tpId: selectedAddTP?.id || newTpId || undefined,
      subTpIds: newSubTpIds.length > 0 ? newSubTpIds : undefined,
      kodeTP: selectedAddTP?.kode || newKodeTP,
      materiPokok: newMateri,
      jumlahJP: newJumlahJP,
      kegiatanPembelajaran: candidateKegiatan,
      siswaTidakHadir: newAbsen,
      catatanRefleksi:
        newRefleksi.trim() ||
        'Peserta didik aktif berdiskusi dan antusias mengikuti seluruh tahapan pembelajaran.',
      statusKeterlaksanaan: newStatus,
      tindakLanjut: newTindakLanjut.trim() || undefined,
    };

    const validation = validateJurnalEntry(candidate, kelasHarian.daftarJurnal, tpList);
    if (!validation.valid) {
      setAddError(validation.errors[0]);
      return;
    }

    const newEntry: JurnalMengajarItem = {
      id: `jurnal_${Date.now()}`,
      pertemuanKe: nextPertemuan,
      tanggal: newTanggal,
      jamKe: newJam.trim(),
      tpId: validation.resolvedTP?.id || candidate.tpId,
      subTpIds: candidate.subTpIds,
      kodeTP: validation.resolvedTP?.kode || candidate.kodeTP || 'TP.1',
      materiPokok: newMateri.trim(),
      jumlahJP: newJumlahJP,
      kegiatanPembelajaran: candidateKegiatan,
      siswaTidakHadir: newAbsen.trim() || 'Nihil (Semua Hadir)',
      catatanRefleksi: candidate.catatanRefleksi || '',
      statusKeterlaksanaan: newStatus,
      tindakLanjut: candidate.tindakLanjut,
    };

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarJurnal: [...kelasHarian.daftarJurnal, newEntry],
    });

    setShowAddModal(false);
    setAddError(null);
    setNewKegiatan('');
    setNewTindakLanjut('');
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

  const resolveDisplayTP = (item: JurnalMengajarItem): { kode: string; tp?: CustomTPItem } => {
    const matched = tpList.find(
      (t) => (item.tpId && t.id === item.tpId) || t.kode === item.kodeTP
    );
    return {
      kode: matched?.kode || item.kodeTP,
      tp: matched,
    };
  };

  return (
    <div style={{ minWidth: 0, maxWidth: '100%' }}>
      {/* Header Info & Actions */}
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
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#172033', margin: 0 }}>
            Jurnal mengajar harian
          </h2>
          <p className="tabular-nums" style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
            {schoolProfile.mataPelajaranUtama} · Kelas {schoolProfile.rombelAktif} ·{' '}
            {filteredJurnal.length} pertemuan · {totalJPTerlaksana} JP terlaksana
            {totalTindakLanjut > 0 ? ` · ${totalTindakLanjut} perlu tindak lanjut` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleAutoSyncFromTP}
            className="btn btn-sm btn-outline"
            title="Sinkronkan materi dan tujuan pembelajaran secara otomatis dari Promes"
          >
            <Sparkles size={13} aria-hidden="true" /> Auto-Isi dari TP
          </button>

          <button
            type="button"
            onClick={() => {
              const nextP = kelasHarian.daftarJurnal.length + 1;
              setNewAbsen(
                syncJurnalAbsentFromPresensi(
                  kelasHarian.daftarPresensi,
                  kelasHarian.daftarSiswa,
                  nextP,
                  newTanggal
                )
              );
              setAddError(null);
              setShowAddModal(true);
            }}
            className="btn btn-sm btn-outline"
          >
            <Plus size={13} aria-hidden="true" /> Tambah pertemuan
          </button>

          <button
            type="button"
            onClick={() => {
              if (!confirmSimulationExportIfNeeded(kelasHarian, 'dokumen Jurnal Mengajar')) return;
              if (!requireActiveLicenseForAction('mencetak dokumen Jurnal Mengajar')) return;
              window.print();
            }}
            className="btn btn-sm btn-outline"
          >
            <Printer size={13} aria-hidden="true" /> Cetak
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!confirmSimulationExportIfNeeded(kelasHarian, 'file Word Jurnal Mengajar')) return;
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
          >
            <Download size={13} aria-hidden="true" /> Unduh Jurnal (.docx)
          </button>
        </div>
      </div>

      <SimulatedDataNoticeBanner
        kelasHarian={kelasHarian}
        contextLabel={`Jurnal Mengajar Kelas ${schoolProfile.rombelAktif}`}
        isSeparateDemoPreview={isSeparateDemoPreview}
        onExitDemoPreview={onExitDemoPreview}
        onConfirmLegacyActual={() => {
          onUpdateKelasHarian(confirmLegacyKelasHarianAsActual(schoolProfile, kelasHarian));
          onToast('Data kelas lama berhasil dikonfirmasi sebagai data aktual sekolah.');
        }}
        onStartEmptyClass={() => {
          if (
            typeof window !== 'undefined' &&
            typeof window.confirm === 'function' &&
            !window.confirm('Kosongkan data kelas ini dan mulai dengan jurnal & kelas kosong?')
          ) {
            return;
          }
          onUpdateKelasHarian(createEmptyKelasHarianData(schoolProfile, tpList));
          onToast('Data kelas dikosongkan. Gunakan "+ Tambah pertemuan" atau "Auto-Isi dari TP".');
        }}
        onLoadDemoData={() => {
          if (isKelasHarianLegacyUnverified(kelasHarian) && onOpenSeparateDemoPreview) {
            onOpenSeparateDemoPreview();
            onToast('Membuka pratinjau data demo terpisah; data lama Anda tetap dipertahankan.');
            return;
          }
          onUpdateKelasHarian(loadDemoKelasHarianData(schoolProfile, tpList));
          onToast('Data demo/simulasi dimuat kembali untuk eksplorasi.');
        }}
      />

      {/* Filter Periode & TP */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <select
          aria-label="Filter jurnal berdasarkan bulan"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: 160, padding: '6px 10px', fontSize: 12.5 }}
        >
          <option value="">Semua bulan (Semester)</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              Bulan {m}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter jurnal berdasarkan TP"
          value={filterTpId}
          onChange={(e) => setFilterTpId(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: 200, maxWidth: '100%', padding: '6px 10px', fontSize: 12.5 }}
        >
          <option value="">Semua Tujuan Pembelajaran (TP)</option>
          {tpList.map((tp) => (
            <option key={tp.id || tp.kode} value={tp.id}>
              [{tp.kode}] {tp.materiPokok.slice(0, 42)}
            </option>
          ))}
        </select>
      </div>

      {/* Modal Tambah Pertemuan */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tambah Agenda Jurnal Mengajar"
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
              padding: 20,
              maxWidth: 640,
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>
              Tambah Agenda Jurnal Mengajar Baru
            </h3>
            <form onSubmit={handleAddNewAgenda}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Tanggal Pertemuan:
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={newTanggal}
                    onChange={(e) => {
                      setNewTanggal(e.target.value);
                      setAddError(null);
                    }}
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
                    onChange={(e) => {
                      setNewJam(e.target.value);
                      setAddError(null);
                    }}
                    placeholder="mis: 1 - 3 (07.30 - 09.30)"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Jml JP:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className="form-input"
                    value={newJumlahJP}
                    onChange={(e) => setNewJumlahJP(Number(e.target.value) || 1)}
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
                    value={newTpId || newKodeTP}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selected = tpList.find((t) => t.id === val || t.kode === val);
                      if (selected) {
                        setNewTpId(selected.id);
                        setNewKodeTP(selected.kode);
                        setNewMateri(selected.materiPokok);
                        setNewSubTpIds([]);
                      }
                    }}
                  >
                    {tpList.map((tp) => (
                      <option key={tp.id || tp.kode} value={tp.id || tp.kode}>
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

              {selectedAddTP?.subTP && selectedAddTP.subTP.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Sub-TP Terkait (opsional):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedAddTP.subTP.map((sub) => {
                      const checked = newSubTpIds.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          style={{
                            fontSize: 11.5,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: checked ? '1px solid #2563eb' : '1px solid #cbd5e1',
                            background: checked ? '#eff6ff' : '#f8fafc',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setNewSubTpIds((prev) =>
                                prev.includes(sub.id)
                                  ? prev.filter((id) => id !== sub.id)
                                  : [...prev, sub.id]
                              )
                            }
                          />
                          <span>
                            {sub.kode}: {sub.fokusMateri}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

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

              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                      Siswa Tidak Hadir:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewAbsen(
                          syncJurnalAbsentFromPresensi(
                            kelasHarian.daftarPresensi,
                            kelasHarian.daftarSiswa,
                            kelasHarian.daftarJurnal.length + 1,
                            newTanggal
                          )
                        )
                      }
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#2563eb',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <RefreshCw size={11} /> Sinkron Presensi
                    </button>
                  </div>
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
                    Status Keterlaksanaan:
                  </label>
                  <select
                    className="form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as JurnalStatusKeterlaksanaan)}
                  >
                    <option value="terlaksana">Terlaksana</option>
                    <option value="perlu_tindak_lanjut">Perlu Tindak Lanjut</option>
                    <option value="ditunda">Ditunda / Jadwal Ulang</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 14 }}>
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
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Tindak Lanjut / Remedial (opsional):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTindakLanjut}
                    onChange={(e) => setNewTindakLanjut(e.target.value)}
                    placeholder="mis: Penguatan konsep pertemuan berikutnya"
                  />
                </div>
              </div>

              {addError && (
                <div
                  role="alert"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#b91c1c',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 7,
                    padding: '7px 10px',
                    marginBottom: 12,
                  }}
                >
                  {addError}
                </div>
              )}

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
      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th style={{ width: 46, textAlign: 'center' }}>P.Ke</th>
              <th style={{ width: 145, textAlign: 'left' }}>Tanggal, Jam &amp; JP</th>
              <th style={{ width: 190, textAlign: 'left' }}>TP &amp; Materi Pokok</th>
              <th style={{ minWidth: 240, textAlign: 'left' }}>Uraian Kegiatan Pembelajaran</th>
              <th style={{ width: 130, textAlign: 'left' }}>Ketidakhadiran</th>
              <th style={{ width: 170, textAlign: 'left' }}>Refleksi &amp; Status</th>
              <th className="no-print" style={{ width: 68, textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredJurnal.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px 14px', color: '#64748b', fontSize: 13 }}>
                  Belum ada catatan jurnal mengajar yang sesuai filter ini.
                </td>
              </tr>
            ) : (
              filteredJurnal.map((item, idx) => {
                const isEditing = editingId === item.id;
                const displayTP = resolveDisplayTP(item);

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
                          style={{ fontSize: 11, padding: '3px 6px', marginBottom: 4 }}
                          value={editForm.jamKe}
                          onChange={(e) => setEditForm({ ...editForm, jamKe: e.target.value })}
                        />
                        <input
                          type="number"
                          min={1}
                          max={12}
                          className="form-input"
                          style={{ fontSize: 11, padding: '3px 6px', width: 70 }}
                          value={editForm.jumlahJP ?? 2}
                          onChange={(e) =>
                            setEditForm({ ...editForm, jumlahJP: Number(e.target.value) || 1 })
                          }
                        />
                      </td>
                      <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                        <select
                          className="form-input"
                          style={{ fontSize: 11.5, padding: '3px 6px', marginBottom: 4 }}
                          value={editForm.tpId || editForm.kodeTP}
                          onChange={(e) => {
                            const val = e.target.value;
                            const t = tpList.find((x) => x.id === val || x.kode === val);
                            setEditForm({
                              ...editForm,
                              tpId: t ? t.id : editForm.tpId,
                              kodeTP: t ? t.kode : editForm.kodeTP,
                              materiPokok: t ? t.materiPokok : editForm.materiPokok,
                            });
                          }}
                        >
                          {tpList.map((tp) => (
                            <option key={tp.id || tp.kode} value={tp.id || tp.kode}>
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
                          onChange={(e) =>
                            setEditForm({ ...editForm, kegiatanPembelajaran: e.target.value })
                          }
                        />
                      </td>
                      <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: 11.5, padding: '4px 6px', marginBottom: 4 }}
                          value={editForm.siswaTidakHadir}
                          onChange={(e) => setEditForm({ ...editForm, siswaTidakHadir: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm({
                              ...editForm,
                              siswaTidakHadir: syncJurnalAbsentFromPresensi(
                                kelasHarian.daftarPresensi,
                                kelasHarian.daftarSiswa,
                                editForm.pertemuanKe,
                                editForm.tanggal
                              ),
                            })
                          }
                          style={{
                            border: '1px solid #93c5fd',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            borderRadius: 5,
                            padding: '2px 6px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Sinkron Presensi
                        </button>
                      </td>
                      <td style={{ padding: 6, border: '1px solid #cbd5e1' }}>
                        <textarea
                          className="form-input"
                          rows={2}
                          style={{ fontSize: 11, padding: 6, marginBottom: 4 }}
                          value={editForm.catatanRefleksi}
                          onChange={(e) => setEditForm({ ...editForm, catatanRefleksi: e.target.value })}
                        />
                        <select
                          className="form-select"
                          style={{ fontSize: 11, padding: '3px 6px' }}
                          value={editForm.statusKeterlaksanaan || 'terlaksana'}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              statusKeterlaksanaan: e.target.value as JurnalStatusKeterlaksanaan,
                            })
                          }
                        >
                          <option value="terlaksana">Terlaksana</option>
                          <option value="perlu_tindak_lanjut">Perlu Tindak Lanjut</option>
                          <option value="ditunda">Ditunda</option>
                        </select>
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
                              setEditError(null);
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ padding: '3px 6px', fontSize: 11 }}
                          >
                            Batal
                          </button>
                        </div>
                        {editError && (
                          <div style={{ fontSize: 10, color: '#b91c1c', marginTop: 4 }}>{editError}</div>
                        )}
                      </td>
                    </tr>
                  );
                }

                const statusKey = item.statusKeterlaksanaan || 'terlaksana';
                const statusBadgeStyle =
                  statusKey === 'terlaksana'
                    ? { bg: '#ecfdf5', fg: '#15803d' }
                    : statusKey === 'perlu_tindak_lanjut'
                    ? { bg: '#fffbeb', fg: '#b45309' }
                    : { bg: '#fef2f2', fg: '#b91c1c' };

                return (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '10px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1e3a8a' }}>
                      {item.pertemuanKe}
                    </td>
                    <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.tanggal}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {item.jamKe} · {item.jumlahJP ?? 2} JP
                      </div>
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
                        {displayTP.kode}
                      </span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{item.materiPokok}</span>
                      {item.subTpIds && item.subTpIds.length > 0 && displayTP.tp?.subTP && (
                        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 3 }}>
                          Sub-TP:{' '}
                          {item.subTpIds
                            .map((sid) => displayTP.tp?.subTP?.find((s) => s.id === sid)?.kode)
                            .filter(Boolean)
                            .join(', ') || `${item.subTpIds.length} fokus`}
                        </div>
                      )}
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
                    <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', fontSize: 11.5 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 700,
                          background: statusBadgeStyle.bg,
                          color: statusBadgeStyle.fg,
                          marginBottom: 4,
                        }}
                      >
                        {STATUS_KETERLAKSANAAN_LABEL[statusKey]}
                      </span>
                      <div style={{ fontStyle: 'italic', color: '#64748b' }}>
                        {item.catatanRefleksi || '-'}
                      </div>
                      {item.tindakLanjut && (
                        <div style={{ color: '#92400e', marginTop: 2, fontWeight: 600 }}>
                          TL: {item.tindakLanjut}
                        </div>
                      )}
                    </td>
                    <td className="no-print" style={{ padding: '8px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Edit Pertemuan"
                          aria-label={`Edit pertemuan ${item.pertemuanKe}`}
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
                          aria-label={`Hapus pertemuan ${item.pertemuanKe}`}
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
