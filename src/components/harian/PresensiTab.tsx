import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Printer,
  Plus,
  Trash2,
  FileSpreadsheet,
  Search,
  X,
  Check,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import type {
  KelasHarianData,
  SiswaItem,
  StatusKehadiran,
} from '../../types/kelasHarian';
import { exportPresensiToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import {
  applyNewStudentRoster,
  filterSiswaRoster,
} from '../../utils/kelasHarianStorage';
import { ImportSiswaModal } from './ImportSiswaModal';
import { workspacePopoverVariants } from '../../utils/motionPresets';

interface PresensiTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList?: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
}

const STATUS_META: Record<
  StatusKehadiran,
  { label: string; bg: string; fg: string; border: string; dot: string }
> = {
  H: {
    label: 'Hadir',
    bg: '#ecfdf5',
    fg: '#15803d',
    border: '#bbf7d0',
    dot: '#16a34a',
  },
  S: {
    label: 'Sakit',
    bg: '#fffbeb',
    fg: '#b45309',
    border: '#fde68a',
    dot: '#d97706',
  },
  I: {
    label: 'Izin',
    bg: '#eff6ff',
    fg: '#1d4ed8',
    border: '#bfdbfe',
    dot: '#2563eb',
  },
  A: {
    label: 'Alfa',
    bg: '#fef2f2',
    fg: '#b91c1c',
    border: '#fecaca',
    dot: '#dc2626',
  },
};

interface ActiveCellMenu {
  siswaId: string;
  siswaNama: string;
  pertemuanKe: number;
  currentStatus: StatusKehadiran;
  top: number;
  left: number;
}

export const PresensiTab: React.FC<PresensiTabProps> = ({
  schoolProfile,
  kelasHarian,
  tpList = [],
  onUpdateKelasHarian,
  onToast,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'fokus'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'fokus' : 'matrix'
  );
  const [selectedPertemuan, setSelectedPertemuan] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSiswa, setShowAddSiswa] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newNis, setNewNis] = useState('');
  const [newJK, setNewJK] = useState<'L' | 'P'>('L');
  const [activeCellMenu, setActiveCellMenu] = useState<ActiveCellMenu | null>(null);
  const cellMenuRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!activeCellMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveCellMenu(null);
        lastTriggerRef.current?.focus();
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        cellMenuRef.current &&
        !cellMenuRef.current.contains(target) &&
        lastTriggerRef.current &&
        !lastTriggerRef.current.contains(target)
      ) {
        setActiveCellMenu(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [activeCellMenu]);

  const handleImportStudents = (
    newStudents: SiswaItem[],
    resetExistingScores: boolean
  ) => {
    const updated = applyNewStudentRoster(
      kelasHarian,
      newStudents,
      tpList,
      resetExistingScores
    );
    onUpdateKelasHarian(updated);
    onToast(
      `Berhasil mengimpor ${newStudents.length} siswa ke kelas ${schoolProfile.rombelAktif}.`
    );
  };

  const totalPertemuan = Math.min(16, kelasHarian.daftarPresensi.length);
  const activePertemuan = kelasHarian.daftarPresensi.slice(0, totalPertemuan);

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
  const filteredSiswa = filterSiswaRoster(kelasHarian.daftarSiswa, searchQuery);

  const handleSetStatus = (
    siswaId: string,
    pertemuanKe: number,
    status: StatusKehadiran
  ) => {
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
    onToast(`Semua siswa ditandai Hadir pada Pertemuan ${pertemuanKe}.`);
  };

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

    const updated = applyNewStudentRoster(
      kelasHarian,
      [...kelasHarian.daftarSiswa, newSiswa],
      tpList,
      false
    );

    onUpdateKelasHarian(updated);

    setNewNama('');
    setNewNis('');
    setShowAddSiswa(false);
    onToast(`Siswa "${newSiswa.nama}" ditambahkan.`);
  };

  const handleDeleteSiswa = (siswaId: string, nama: string) => {
    if (!confirm(`Hapus data siswa "${nama}" dari daftar kelas?`)) return;

    const filtered = kelasHarian.daftarSiswa
      .filter((s) => s.id !== siswaId)
      .map((s, idx) => ({ ...s, noUrut: idx + 1 }));

    const updated = applyNewStudentRoster(kelasHarian, filtered, tpList, false);
    onUpdateKelasHarian(updated);
    onToast(`Siswa "${nama}" dihapus dari daftar.`);
  };

  const openCellMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    siswa: SiswaItem,
    pertemuanKe: number,
    currentStatus: StatusKehadiran
  ) => {
    const isSame =
      activeCellMenu?.siswaId === siswa.id &&
      activeCellMenu?.pertemuanKe === pertemuanKe;
    if (isSame) {
      setActiveCellMenu(null);
      return;
    }

    lastTriggerRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 148;
    const menuHeight = 166;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    const left = Math.min(Math.max(8, rect.left), Math.max(8, vw - menuWidth - 12));
    const openUpward = rect.bottom + menuHeight + 8 > vh;
    const top = openUpward ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;

    setActiveCellMenu({
      siswaId: siswa.id,
      siswaNama: siswa.nama,
      pertemuanKe,
      currentStatus,
      top,
      left,
    });
  };

  const kpiItems = [
    { label: 'Tingkat kehadiran', value: `${classAvgPct}%`, dot: '#2563eb' },
    { label: 'Total Hadir (H)', value: totalH, dot: '#16a34a' },
    { label: 'Sakit (S)', value: totalS, dot: '#d97706' },
    { label: 'Izin (I)', value: totalI, dot: '#0284c7' },
    { label: 'Alfa (A)', value: totalA, dot: '#dc2626' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Page Header & Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#172033',
              lineHeight: 1.3,
            }}
          >
            Presensi siswa
          </h2>
          <p
            className="tabular-nums"
            style={{
              margin: '3px 0 0',
              fontSize: 13,
              color: '#64748b',
            }}
          >
            Kelas {schoolProfile.rombelAktif} · {kelasHarian.daftarSiswa.length} siswa ·{' '}
            {totalPertemuan} pertemuan · Semester {schoolProfile.semester}
          </p>
        </div>

        {/* Export & Data Management Actions */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-sm btn-outline"
            title="Impor atau salin nama siswa dari Excel / Dapodik"
          >
            <FileSpreadsheet size={14} aria-hidden="true" />
            <span>Impor Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddSiswa((prev) => !prev)}
            className="btn btn-sm btn-outline"
            aria-expanded={showAddSiswa}
          >
            <Plus size={14} aria-hidden="true" />
            <span>Tambah siswa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak dokumen Presensi')) return;
              window.print();
            }}
            className="btn btn-sm btn-outline"
          >
            <Printer size={14} aria-hidden="true" />
            <span>Cetak</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                const ok = await exportPresensiToDocx(schoolProfile, kelasHarian);
                if (ok) {
                  onToast('Dokumen Word Presensi (.docx) berhasil diunduh.');
                }
              } catch (err) {
                console.error(err);
                onToast('Gagal mengunduh file Word Presensi.');
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Download size={14} aria-hidden="true" />
            <span>Unduh .docx</span>
          </button>
        </div>
      </div>

      {/* Neutral Summary Strip */}
      <div
        className="tabular-nums"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
          gap: 8,
        }}
      >
        {kpiItems.map((item) => (
          <div
            key={item.label}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 500,
                color: '#64748b',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: item.dot,
                  flexShrink: 0,
                }}
              />
              <span>{item.label}</span>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#172033',
                lineHeight: 1.25,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Add Manual Student Strip */}
      <AnimatePresence initial={false}>
        {showAddSiswa && (
          <motion.form
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            onSubmit={handleAddSiswa}
            className="no-print"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 12,
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '2 1 180px' }}>
              <label
                htmlFor="presensi-add-nama"
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                Nama lengkap siswa
              </label>
              <input
                id="presensi-add-nama"
                type="text"
                className="form-input"
                placeholder="Nama siswa"
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                required
                style={{ padding: '6px 10px', fontSize: 13 }}
              />
            </div>

            <div style={{ flex: '1 1 120px' }}>
              <label
                htmlFor="presensi-add-nis"
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                NIS (opsional)
              </label>
              <input
                id="presensi-add-nis"
                type="text"
                className="form-input"
                placeholder="Contoh: 2425008"
                value={newNis}
                onChange={(e) => setNewNis(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 13 }}
              />
            </div>

            <div style={{ width: 92 }}>
              <label
                htmlFor="presensi-add-jk"
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                L / P
              </label>
              <select
                id="presensi-add-jk"
                className="form-select"
                value={newJK}
                onChange={(e) => setNewJK(e.target.value as 'L' | 'P')}
                style={{ padding: '6px 8px', fontSize: 13 }}
              >
                <option value="L">L</option>
                <option value="P">P</option>
              </select>
            </div>

            <button type="submit" className="btn btn-sm btn-primary">
              Simpan
            </button>
            <button
              type="button"
              onClick={() => setShowAddSiswa(false)}
              className="btn btn-sm btn-outline"
            >
              Batal
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* View Mode Switcher + Student Search */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {/* Segmented Control */}
        <div
          role="tablist"
          aria-label="Mode tampilan tabel presensi"
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            borderRadius: 9,
            padding: 3,
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'matrix'}
            onClick={() => setViewMode('matrix')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'matrix' ? '#ffffff' : 'transparent',
              color: viewMode === 'matrix' ? '#172033' : '#64748b',
              boxShadow:
                viewMode === 'matrix' ? '0 1px 2px rgba(23, 32, 51, 0.06)' : 'none',
              fontFamily: 'var(--font-family)',
              fontSize: 12.5,
              fontWeight: viewMode === 'matrix' ? 600 : 500,
              cursor: 'pointer',
              transition: 'background-color 140ms ease, color 140ms ease',
            }}
          >
            Matriks semester
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'fokus'}
            onClick={() => setViewMode('fokus')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'fokus' ? '#ffffff' : 'transparent',
              color: viewMode === 'fokus' ? '#172033' : '#64748b',
              boxShadow:
                viewMode === 'fokus' ? '0 1px 2px rgba(23, 32, 51, 0.06)' : 'none',
              fontFamily: 'var(--font-family)',
              fontSize: 12.5,
              fontWeight: viewMode === 'fokus' ? 600 : 500,
              cursor: 'pointer',
              transition: 'background-color 140ms ease, color 140ms ease',
            }}
          >
            Per pertemuan
          </button>
        </div>

        {/* Real Student Search Input */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 220px',
            maxWidth: 300,
          }}
        >
          <Search
            size={14}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            aria-label="Cari nama atau NIS siswa"
            placeholder="Cari nama atau NIS siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: 32,
              paddingRight: searchQuery ? 30 : 10,
              paddingTop: 6,
              paddingBottom: 6,
              fontSize: 13,
              minHeight: 34,
            }}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Hapus pencarian siswa"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                padding: 4,
              }}
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: Semester Matrix Table */}
      {viewMode === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 4,
                      background: '#f8fafc',
                      width: 38,
                      minWidth: 38,
                      textAlign: 'center',
                    }}
                  >
                    No
                  </th>
                  <th
                    style={{
                      position: 'sticky',
                      left: 38,
                      zIndex: 4,
                      background: '#f8fafc',
                      minWidth: 168,
                      textAlign: 'left',
                      borderRight: '2px solid #cbd5e1',
                    }}
                  >
                    Siswa
                  </th>
                  {activePertemuan.map((p, idx) => (
                    <th
                      key={p.pertemuanKe}
                      style={{
                        textAlign: 'center',
                        minWidth: 40,
                        padding: '7px 4px',
                        borderRight:
                          idx === activePertemuan.length - 1
                            ? '2px solid #cbd5e1'
                            : '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#172033' }}>
                        P{p.pertemuanKe}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSetAllHadir(p.pertemuanKe)}
                        aria-label={`Tandai semua hadir pada pertemuan ${p.pertemuanKe}`}
                        title={`Tandai semua hadir pada pertemuan ${p.pertemuanKe}`}
                        style={{
                          marginTop: 4,
                          padding: '2px 5px',
                          borderRadius: 5,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontFamily: 'var(--font-family)',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Semua H
                      </button>
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', width: 34, color: '#15803d' }}>H</th>
                  <th style={{ textAlign: 'center', width: 34, color: '#b45309' }}>S</th>
                  <th style={{ textAlign: 'center', width: 34, color: '#1d4ed8' }}>I</th>
                  <th style={{ textAlign: 'center', width: 34, color: '#b91c1c' }}>A</th>
                  <th style={{ textAlign: 'center', width: 46 }}>%</th>
                  <th className="no-print" style={{ textAlign: 'center', width: 44 }}>
                    Hapus
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSiswa.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activePertemuan.length + 8}
                      style={{
                        textAlign: 'center',
                        padding: '28px 16px',
                        color: '#64748b',
                        fontSize: 13,
                      }}
                    >
                      {searchQuery
                        ? `Tidak ada siswa yang cocok dengan "${searchQuery}".`
                        : 'Belum ada siswa di kelas ini. Impor dari Excel atau tambah secara manual.'}
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((siswa, idx) => {
                    let sH = 0;
                    let sS = 0;
                    let sI = 0;
                    let sA = 0;
                    activePertemuan.forEach((p) => {
                      const st = p.statusMap[siswa.id] || 'H';
                      if (st === 'H') sH++;
                      else if (st === 'S') sS++;
                      else if (st === 'I') sI++;
                      else if (st === 'A') sA++;
                    });
                    const pct =
                      activePertemuan.length > 0
                        ? Math.round((sH / activePertemuan.length) * 100)
                        : 100;

                    return (
                      <tr key={siswa.id}>
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            background: '#ffffff',
                            textAlign: 'center',
                            color: '#64748b',
                            fontWeight: 500,
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            position: 'sticky',
                            left: 38,
                            zIndex: 2,
                            background: '#ffffff',
                            borderRight: '2px solid #cbd5e1',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              color: '#172033',
                              fontSize: 13,
                              lineHeight: 1.3,
                            }}
                          >
                            {siswa.nama}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#64748b',
                              marginTop: 1,
                            }}
                          >
                            {siswa.nis} · {siswa.jenisKelamin}
                          </div>
                        </td>

                        {activePertemuan.map((p, pIdx) => {
                          const st = (p.statusMap[siswa.id] || 'H') as StatusKehadiran;
                          const meta = STATUS_META[st];
                          const isMenuOpen =
                            activeCellMenu?.siswaId === siswa.id &&
                            activeCellMenu?.pertemuanKe === p.pertemuanKe;

                          return (
                            <td
                              key={p.pertemuanKe}
                              style={{
                                textAlign: 'center',
                                padding: '5px 3px',
                                borderRight:
                                  pIdx === activePertemuan.length - 1
                                    ? '2px solid #cbd5e1'
                                    : undefined,
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) => openCellMenu(e, siswa, p.pertemuanKe, st)}
                                aria-label={`${siswa.nama}, Pertemuan ${p.pertemuanKe}: ${meta.label}. Klik untuk ubah status`}
                                aria-haspopup="menu"
                                aria-expanded={isMenuOpen}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 7,
                                  border: isMenuOpen
                                    ? `2px solid ${meta.dot}`
                                    : `1px solid ${meta.border}`,
                                  background: meta.bg,
                                  color: meta.fg,
                                  fontFamily: 'var(--font-family)',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {st}
                              </button>
                            </td>
                          );
                        })}

                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 600,
                            color: '#15803d',
                          }}
                        >
                          {sH}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 500,
                            color: sS > 0 ? '#b45309' : '#94a3b8',
                          }}
                        >
                          {sS}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 500,
                            color: sI > 0 ? '#1d4ed8' : '#94a3b8',
                          }}
                        >
                          {sI}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 500,
                            color: sA > 0 ? '#b91c1c' : '#94a3b8',
                          }}
                        >
                          {sA}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color: pct < 75 ? '#b91c1c' : '#172033',
                          }}
                        >
                          {pct}%
                        </td>
                        <td className="no-print" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteSiswa(siswa.id, siswa.nama)}
                            aria-label={`Hapus siswa ${siswa.nama}`}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 5,
                              borderRadius: 6,
                              display: 'inline-flex',
                            }}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Inline Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              fontSize: 12,
              color: '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {(['H', 'S', 'I', 'A'] as StatusKehadiran[]).map((code) => {
                const m = STATUS_META[code];
                return (
                  <span
                    key={code}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        background: m.bg,
                        color: m.fg,
                        border: `1px solid ${m.border}`,
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      {code}
                    </span>
                    <span>{m.label}</span>
                  </span>
                );
              })}
            </div>
            <span>Klik sel pertemuan untuk memilih status kehadiran (atau tekan Enter/Spasi).</span>
          </div>
        </div>
      )}

      {/* Mode 2: Focus Per Pertemuan */}
      {viewMode === 'fokus' && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginRight: 4 }}>
                Pertemuan:
              </span>
              {activePertemuan.map((p) => {
                const isSelected = selectedPertemuan === p.pertemuanKe;
                return (
                  <button
                    key={p.pertemuanKe}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedPertemuan(p.pertemuanKe)}
                    className="tabular-nums"
                    style={{
                      padding: '5px 10px',
                      borderRadius: 7,
                      border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : '#475569',
                      fontFamily: 'var(--font-family)',
                      fontSize: 12.5,
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    P{p.pertemuanKe}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleSetAllHadir(selectedPertemuan)}
              className="btn btn-sm btn-outline"
            >
              <Check size={13} aria-hidden="true" />
              <span>Tandai semua hadir (P{selectedPertemuan})</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 8,
            }}
          >
            {filteredSiswa.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: '16px 4px' }}>
                {searchQuery
                  ? `Tidak ada siswa yang cocok dengan "${searchQuery}".`
                  : 'Belum ada siswa terdaftar.'}
              </div>
            ) : (
              filteredSiswa.map((siswa, idx) => {
                const curPertemuan = activePertemuan.find(
                  (p) => p.pertemuanKe === selectedPertemuan
                );
                const status = (curPertemuan?.statusMap[siswa.id] || 'H') as StatusKehadiran;

                return (
                  <div
                    key={siswa.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="tabular-nums"
                        style={{ fontSize: 11.5, color: '#64748b' }}
                      >
                        #{idx + 1} · {siswa.nis} ({siswa.jenisKelamin})
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: '#172033',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {siswa.nama}
                      </div>
                    </div>

                    <div
                      role="radiogroup"
                      aria-label={`Status hadir ${siswa.nama} pertemuan ${selectedPertemuan}`}
                      style={{ display: 'flex', gap: 4, flexShrink: 0 }}
                    >
                      {(['H', 'S', 'I', 'A'] as StatusKehadiran[]).map((st) => {
                        const isActive = status === st;
                        const m = STATUS_META[st];
                        return (
                          <button
                            key={st}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            aria-label={m.label}
                            onClick={() =>
                              handleSetStatus(siswa.id, selectedPertemuan, st)
                            }
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 7,
                              border: isActive
                                ? `1.5px solid ${m.dot}`
                                : '1px solid #e2e8f0',
                              background: isActive ? m.bg : '#ffffff',
                              color: isActive ? m.fg : '#64748b',
                              fontFamily: 'var(--font-family)',
                              fontWeight: 700,
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
              })
            )}
          </div>
        </div>
      )}

      {/* Keyboard-accessible Floating Status Picker Popover */}
      <AnimatePresence>
        {activeCellMenu && (
          <motion.div
            ref={cellMenuRef}
            role="menu"
            aria-label={`Pilih status ${activeCellMenu.siswaNama} pertemuan ${activeCellMenu.pertemuanKe}`}
            variants={workspacePopoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: 'fixed',
              top: activeCellMenu.top,
              left: activeCellMenu.left,
              width: 148,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              boxShadow: '0 10px 24px rgba(23, 32, 51, 0.14)',
              padding: 6,
              zIndex: 1100,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <div
              style={{
                padding: '3px 6px 5px',
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              P{activeCellMenu.pertemuanKe} · {activeCellMenu.siswaNama}
            </div>
            {(['H', 'S', 'I', 'A'] as StatusKehadiran[]).map((st) => {
              const m = STATUS_META[st];
              const isCurrent = activeCellMenu.currentStatus === st;
              return (
                <button
                  key={st}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  onClick={() => {
                    handleSetStatus(
                      activeCellMenu.siswaId,
                      activeCellMenu.pertemuanKe,
                      st
                    );
                    setActiveCellMenu(null);
                    lastTriggerRef.current?.focus();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 7,
                    border: 'none',
                    background: isCurrent ? m.bg : 'transparent',
                    color: isCurrent ? m.fg : '#172033',
                    fontFamily: 'var(--font-family)',
                    fontSize: 12.5,
                    fontWeight: isCurrent ? 600 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: m.dot,
                      }}
                    />
                    <span>
                      {st} — {m.label}
                    </span>
                  </span>
                  {isCurrent && <Check size={13} aria-hidden="true" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

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
