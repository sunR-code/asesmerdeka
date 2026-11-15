import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Edit2,
  ArrowRightLeft,
  Calendar,
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
  createEmptyKelasHarianData,
  loadDemoKelasHarianData,
  confirmLegacyKelasHarianAsActual,
  confirmSimulationExportIfNeeded,
  isKelasHarianLegacyUnverified,
  validateStudentInput,
  updateStudentIdentity,
  transferStudentRombel,
  updatePertemuanDate,
  computeAttendanceRecap,
} from '../../utils/kelasHarianStorage';
import { ImportSiswaModal } from './ImportSiswaModal';
import { SimulatedDataNoticeBanner } from './SimulatedDataNoticeBanner';
import { workspacePopoverVariants } from '../../utils/motionPresets';

interface PresensiTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList?: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
  isSeparateDemoPreview?: boolean;
  onOpenSeparateDemoPreview?: () => void;
  onExitDemoPreview?: () => void;
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
  isSeparateDemoPreview = false,
  onOpenSeparateDemoPreview,
  onExitDemoPreview,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'fokus'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'fokus' : 'matrix'
  );
  const [selectedPertemuan, setSelectedPertemuan] = useState<number>(1);
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSiswa, setShowAddSiswa] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newNis, setNewNis] = useState('');
  const [newNisn, setNewNisn] = useState('');
  const [newJK, setNewJK] = useState<'L' | 'P'>('L');
  const [addError, setAddError] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<SiswaItem | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editNis, setEditNis] = useState('');
  const [editNisn, setEditNisn] = useState('');
  const [editJK, setEditJK] = useState<'L' | 'P'>('L');
  const [editError, setEditError] = useState<string | null>(null);
  const [transferringStudent, setTransferringStudent] = useState<SiswaItem | null>(null);
  const [transferMode, setTransferMode] = useState<'transfer' | 'archive'>('transfer');
  const [transferTargetRombel, setTransferTargetRombel] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [transferNote, setTransferNote] = useState('');
  const [demoAcknowledged, setDemoAcknowledged] = useState(false);
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
    resetExistingScores: boolean,
    mode: 'replace' | 'merge' = 'replace'
  ) => {
    const finalRoster =
      mode === 'merge' ? [...kelasHarian.daftarSiswa, ...newStudents] : newStudents;
    const updated = applyNewStudentRoster(
      kelasHarian,
      finalRoster,
      tpList,
      mode === 'merge' ? false : resetExistingScores,
      { source: 'user_imported', initializeEmptyScores: true }
    );
    onUpdateKelasHarian(updated);
    onToast(
      mode === 'merge'
        ? `Berhasil menambahkan ${newStudents.length} siswa baru ke kelas ${schoolProfile.rombelAktif}.`
        : `Berhasil mengimpor ${newStudents.length} siswa ke kelas ${schoolProfile.rombelAktif}.`
    );
  };

  const handleStartEmptyClass = () => {
    if (
      typeof window !== 'undefined' &&
      typeof window.confirm === 'function' &&
      !window.confirm('Kosongkan daftar siswa simulasi dan mulai dengan kelas kosong siap isi?')
    ) {
      return;
    }
    const empty = createEmptyKelasHarianData(schoolProfile, tpList);
    onUpdateKelasHarian(empty);
    setDemoAcknowledged(false);
    onToast('Kelas dikosongkan. Silakan impor daftar siswa atau tambah siswa secara manual.');
  };

  const handleLoadDemoData = () => {
    if (isKelasHarianLegacyUnverified(kelasHarian) && onOpenSeparateDemoPreview) {
      onOpenSeparateDemoPreview();
      onToast('Membuka pratinjau data demo terpisah; data lama Anda tetap dipertahankan.');
      return;
    }
    const demo = loadDemoKelasHarianData(schoolProfile, tpList);
    onUpdateKelasHarian(demo);
    setDemoAcknowledged(true);
    onToast('Data contoh/simulasi (30 siswa) dimuat kembali untuk eksplorasi.');
  };

  const handleConfirmLegacyActual = () => {
    const confirmed = confirmLegacyKelasHarianAsActual(schoolProfile, kelasHarian);
    onUpdateKelasHarian(confirmed);
    onToast('Data kelas lama berhasil dikonfirmasi sebagai data aktual sekolah.');
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    (kelasHarian.daftarPresensi || []).slice(0, 16).forEach((p) => {
      if (p.tanggal && p.tanggal.length >= 7) {
        months.add(p.tanggal.slice(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [kelasHarian.daftarPresensi]);

  const attendanceRecap = useMemo(
    () => computeAttendanceRecap(kelasHarian, { monthFilter: monthFilter || undefined }),
    [kelasHarian, monthFilter]
  );

  const totalPertemuan = attendanceRecap.meetings.length;
  const activePertemuan = attendanceRecap.meetings;
  const { totalH, totalS, totalI, totalA, classAvgPct } = attendanceRecap.summary;
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

  const handleUpdateMeetingDate = (pertemuanKe: number, newTanggal: string) => {
    const res = updatePertemuanDate(kelasHarian, pertemuanKe, newTanggal);
    if (!res.valid) {
      onToast(res.error || 'Tanggal pertemuan tidak valid.');
      return;
    }
    onUpdateKelasHarian(res.updated);
    onToast(`Tanggal Pertemuan ${pertemuanKe} diperbarui ke ${newTanggal}.`);
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
    setAddError(null);
    const validation = validateStudentInput(
      { nama: newNama, nis: newNis, nisn: newNisn, jenisKelamin: newJK },
      kelasHarian.daftarSiswa
    );
    if (!validation.valid) {
      setAddError(validation.errors[0]);
      return;
    }

    const newId = `siswa_${Date.now()}`;
    const nextNo = kelasHarian.daftarSiswa.length + 1;
    const newSiswa: SiswaItem = {
      id: newId,
      noUrut: nextNo,
      nis: newNis.trim(),
      nisn: newNisn.trim() || undefined,
      nama: newNama.trim(),
      jenisKelamin: newJK,
      statusAktif: 'aktif',
    };

    const updated = applyNewStudentRoster(
      kelasHarian,
      [...kelasHarian.daftarSiswa, newSiswa],
      tpList,
      false,
      { source: 'user_manual', initializeEmptyScores: true }
    );

    onUpdateKelasHarian(updated);

    setNewNama('');
    setNewNis('');
    setNewNisn('');
    setAddError(null);
    setShowAddSiswa(false);
    if (validation.warnings.length > 0) {
      onToast(`Siswa "${newSiswa.nama}" ditambahkan. Catatan: ${validation.warnings[0]}`);
    } else {
      onToast(`Siswa "${newSiswa.nama}" ditambahkan.`);
    }
  };

  const handleOpenEditStudent = (siswa: SiswaItem) => {
    setEditingStudent(siswa);
    setEditNama(siswa.nama);
    setEditNis(siswa.nis || '');
    setEditNisn(siswa.nisn || '');
    setEditJK(siswa.jenisKelamin);
    setEditError(null);
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const res = updateStudentIdentity(
      kelasHarian,
      editingStudent.id,
      {
        nama: editNama,
        nis: editNis,
        nisn: editNisn,
        jenisKelamin: editJK,
      },
      tpList
    );
    if (!res.validation.valid) {
      setEditError(res.validation.errors[0]);
      return;
    }
    onUpdateKelasHarian(res.updated);
    setEditingStudent(null);
    onToast(`Identitas "${editNama.trim()}" diperbarui tanpa menghapus riwayat nilai & presensi.`);
  };

  const handleOpenTransferModal = (siswa: SiswaItem) => {
    const otherRombels = (schoolProfile.daftarRombel || []).filter(
      (r) => r.trim().toLowerCase() !== (schoolProfile.rombelAktif || '').trim().toLowerCase()
    );
    setTransferringStudent(siswa);
    setTransferMode('transfer');
    setTransferTargetRombel(otherRombels[0] || '');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferNote('');
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringStudent) return;
    const res = transferStudentRombel(
      schoolProfile,
      kelasHarian,
      transferringStudent.id,
      transferMode === 'archive' ? '__ARCHIVE__' : transferTargetRombel,
      tpList,
      { tanggalMutasi: transferDate, catatanMutasi: transferNote, mode: transferMode }
    );
    if (res.error) {
      onToast(res.error);
      return;
    }
    onUpdateKelasHarian(res.updated);
    onToast(
      transferMode === 'archive'
        ? `${transferringStudent.nama} diarsipkan; riwayat nilai & presensi tetap tersimpan.`
        : `${transferringStudent.nama} dipindahkan ke rombel ${transferTargetRombel}; riwayat akademik tetap terarsip.`
    );
    setTransferringStudent(null);
  };

  const handleDeleteSiswa = (siswaId: string, nama: string) => {
    if (!confirm(`Hapus data siswa "${nama}" dari daftar kelas?`)) return;

    const filtered = kelasHarian.daftarSiswa
      .filter((s) => s.id !== siswaId)
      .map((s, idx) => ({ ...s, noUrut: idx + 1 }));

    const updated = applyNewStudentRoster(kelasHarian, filtered, tpList, false, {
      initializeEmptyScores: true,
    });
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, maxWidth: '100%' }}>
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
              if (!confirmSimulationExportIfNeeded(kelasHarian, 'dokumen Presensi')) return;
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
              if (!confirmSimulationExportIfNeeded(kelasHarian, 'file Word Presensi')) return;
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

      <SimulatedDataNoticeBanner
        kelasHarian={kelasHarian}
        contextLabel={`Presensi Kelas ${schoolProfile.rombelAktif}`}
        isSeparateDemoPreview={isSeparateDemoPreview}
        onExitDemoPreview={onExitDemoPreview}
        onConfirmLegacyActual={handleConfirmLegacyActual}
        onStartEmptyClass={handleStartEmptyClass}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onLoadDemoData={handleLoadDemoData}
        onAcknowledgeDemo={() => setDemoAcknowledged(true)}
        demoAcknowledged={demoAcknowledged}
      />

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

            <div style={{ flex: '1 1 110px' }}>
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
                onChange={(e) => {
                  setNewNis(e.target.value);
                  setAddError(null);
                }}
                style={{ padding: '6px 10px', fontSize: 13 }}
              />
            </div>

            <div style={{ flex: '1 1 115px' }}>
              <label
                htmlFor="presensi-add-nisn"
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                NISN (opsional)
              </label>
              <input
                id="presensi-add-nisn"
                type="text"
                className="form-input"
                placeholder="10 digit NISN"
                value={newNisn}
                onChange={(e) => {
                  setNewNisn(e.target.value);
                  setAddError(null);
                }}
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
              onClick={() => {
                setShowAddSiswa(false);
                setAddError(null);
              }}
              className="btn btn-sm btn-outline"
            >
              Batal
            </button>
            {addError && (
              <div
                role="alert"
                style={{
                  flexBasis: '100%',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 7,
                  padding: '6px 10px',
                }}
              >
                {addError}
              </div>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* View Mode Switcher + Period Filter + Student Search */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: '1 1 280px', justifyContent: 'flex-end' }}>
          {availableMonths.length > 0 && (
            <select
              aria-label="Filter rekap presensi per bulan"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="form-select"
              style={{
                width: 'auto',
                minWidth: 150,
                padding: '6px 10px',
                fontSize: 12.5,
                minHeight: 34,
              }}
            >
              <option value="">Semua bulan (Semester)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  Bulan {m}
                </option>
              ))}
            </select>
          )}

          {/* Real Student Search Input */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 200px',
              maxWidth: 280,
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
      </div>

      {/* Arsip Siswa Mutasi (jika ada) */}
      {(kelasHarian.archivedSiswa?.length || 0) > 0 && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 9,
            padding: '8px 12px',
            fontSize: 12,
            color: '#475569',
          }}
        >
          <strong>Arsip Mutasi / Nonaktif ({kelasHarian.archivedSiswa?.length}):</strong>{' '}
          {kelasHarian.archivedSiswa
            ?.map((a) =>
              a.statusAktif === 'keluar'
                ? `${a.nama} -> Diarsipkan (${a.tanggalMutasi || '-'})`
                : `${a.nama} -> Pindah ke ${a.rombelTujuan || 'Rombel lain'} (${a.tanggalMutasi || '-'})`
            )
            .join(' · ')}
        </div>
      )}

      {/* Mode 1: Semester Matrix Table */}
      {viewMode === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, maxWidth: '100%' }}>
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
                      title={`Tanggal pertemuan: ${p.tanggal}`}
                      style={{
                        textAlign: 'center',
                        minWidth: 44,
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
                      <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 500 }}>
                        {p.tanggal ? p.tanggal.slice(5) : ''}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSetAllHadir(p.pertemuanKe)}
                        aria-label={`Tandai semua hadir pada pertemuan ${p.pertemuanKe}`}
                        title={`Tandai semua hadir pada pertemuan ${p.pertemuanKe}`}
                        style={{
                          marginTop: 3,
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
                  <th className="no-print" style={{ textAlign: 'center', width: 88 }}>
                    Kelola
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
                    const recap = attendanceRecap.perStudent[siswa.id];
                    const sH = recap?.hadir ?? 0;
                    const sS = recap?.sakit ?? 0;
                    const sI = recap?.izin ?? 0;
                    const sA = recap?.alfa ?? 0;
                    const pct = recap?.persentaseHadir ?? 100;

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
                            {siswa.nis || 'Tanpa NIS'}
                            {siswa.nisn ? ` · NISN ${siswa.nisn}` : ''} · {siswa.jenisKelamin}
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
                        <td className="no-print" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudent(siswa)}
                            aria-label={`Edit identitas ${siswa.nama}`}
                            title="Edit Identitas Siswa"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#2563eb',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 6,
                              display: 'inline-flex',
                            }}
                          >
                            <Edit2 size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenTransferModal(siswa)}
                            aria-label={`Pindah rombel ${siswa.nama}`}
                            title="Mutasi / Pindah Rombel"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#d97706',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 6,
                              display: 'inline-flex',
                            }}
                          >
                            <ArrowRightLeft size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSiswa(siswa.id, siswa.nama)}
                            aria-label={`Hapus siswa ${siswa.nama}`}
                            title="Hapus Siswa"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 6,
                              display: 'inline-flex',
                            }}
                          >
                            <Trash2 size={13} aria-hidden="true" />
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {(() => {
                const curPert = kelasHarian.daftarPresensi.find(
                  (p) => p.pertemuanKe === selectedPertemuan
                );
                if (!curPert) return null;
                return (
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: '#334155',
                      fontWeight: 600,
                    }}
                  >
                    <Calendar size={13} aria-hidden="true" />
                    <input
                      type="date"
                      aria-label={`Tanggal Pertemuan ${selectedPertemuan}`}
                      value={curPert.tanggal}
                      onChange={(e) => handleUpdateMeetingDate(selectedPertemuan, e.target.value)}
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                    />
                  </label>
                );
              })()}

              <button
                type="button"
                onClick={() => handleSetAllHadir(selectedPertemuan)}
                className="btn btn-sm btn-outline"
              >
                <Check size={13} aria-hidden="true" />
                <span>Tandai semua hadir (P{selectedPertemuan})</span>
              </button>
            </div>
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

      {/* Modal Edit Identitas Siswa */}
      {editingStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Identitas Siswa"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <form
            onSubmit={handleSaveEditStudent}
            style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: 20,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Edit Identitas Siswa
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              Perubahan nama, NIS, NISN, atau jenis kelamin tidak akan menghapus riwayat presensi maupun nilai yang sudah tersimpan.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Nama Lengkap
              </label>
              <input
                type="text"
                className="form-input"
                value={editNama}
                onChange={(e) => {
                  setEditNama(e.target.value);
                  setEditError(null);
                }}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 84px', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  NIS (opsional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editNis}
                  onChange={(e) => {
                    setEditNis(e.target.value);
                    setEditError(null);
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  NISN (opsional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editNisn}
                  onChange={(e) => {
                    setEditNisn(e.target.value);
                    setEditError(null);
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  L / P
                </label>
                <select
                  className="form-select"
                  value={editJK}
                  onChange={(e) => setEditJK(e.target.value as 'L' | 'P')}
                >
                  <option value="L">L</option>
                  <option value="P">P</option>
                </select>
              </div>
            </div>
            {editError && (
              <div
                role="alert"
                style={{
                  fontSize: 12,
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 7,
                  padding: '6px 10px',
                }}
              >
                {editError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setEditingStudent(null)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-sm btn-primary">
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Mutasi / Pindah Rombel Siswa */}
      {transferringStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mutasi atau Pindah Rombel"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <form
            onSubmit={handleConfirmTransfer}
            style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: 20,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Mutasi / Arsip Siswa: {transferringStudent.nama}
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              Riwayat presensi &amp; nilai pada rombel <strong>{schoolProfile.rombelAktif}</strong> tetap tersimpan di arsip dan tidak terhapus.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => setTransferMode('transfer')}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: transferMode === 'transfer' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: transferMode === 'transfer' ? '#eff6ff' : '#ffffff',
                  color: transferMode === 'transfer' ? '#1d4ed8' : '#334155',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Pindah Rombel
              </button>
              <button
                type="button"
                onClick={() => setTransferMode('archive')}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: transferMode === 'archive' ? '2px solid #b45309' : '1px solid #cbd5e1',
                  background: transferMode === 'archive' ? '#fffbeb' : '#ffffff',
                  color: transferMode === 'archive' ? '#b45309' : '#334155',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Arsipkan Siswa
              </button>
            </div>
            {transferMode === 'transfer' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Rombel Tujuan
                </label>
                <input
                  type="text"
                  list="rombel-tujuan-list"
                  className="form-input"
                  placeholder="Mis: VII B / VIII B"
                  value={transferTargetRombel}
                  onChange={(e) => setTransferTargetRombel(e.target.value)}
                  required
                />
                <datalist id="rombel-tujuan-list">
                  {(schoolProfile.daftarRombel || [])
                    .filter((r) => r !== schoolProfile.rombelAktif)
                    .map((r) => (
                      <option key={r} value={r} />
                    ))}
                </datalist>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                {transferMode === 'archive' ? 'Tanggal Efektif Arsip' : 'Tanggal Efektif Mutasi'}
              </label>
              <input
                type="date"
                className="form-input"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Catatan (opsional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={
                  transferMode === 'archive'
                    ? 'Mis: Mutasi keluar sekolah / nonaktif'
                    : 'Mis: Penyesuaian rombel semester berjalan'
                }
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setTransferringStudent(null)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-sm btn-primary">
                {transferMode === 'archive' ? 'Konfirmasi Arsipkan' : 'Pindahkan Rombel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Impor Data Siswa dari Excel / Dapodik */}
      <ImportSiswaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportStudents}
        currentCount={kelasHarian.daftarSiswa.length}
        rombelName={schoolProfile.rombelAktif}
        existingStudents={kelasHarian.daftarSiswa}
      />
    </div>
  );
};
