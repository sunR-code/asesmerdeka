import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Lock,
  Printer,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import type { CustomTPItem, SchoolProfile } from '../../utils/schoolProfileStorage';
import type {
  KelasHarianData,
  NilaiSiswaItem,
  SiswaItem,
  StatusFinalisasiRapor,
} from '../../types/kelasHarian';
import { exportRekapRaporToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import {
  applyNewStudentRoster,
  computeERaporStudentSummary,
  confirmLegacyKelasHarianAsActual,
  confirmSimulationExportIfNeeded,
  createEmptyKelasHarianData,
  finalizeClassERapor,
  finalizeERaporStudent,
  generateAutoDeskripsiRapor,
  loadDemoKelasHarianData,
  normalizeBobotKebijakan,
  type ERaporStudentSummary,
} from '../../utils/kelasHarianStorage';
import { computeDynamicKKTPBands } from '../../utils/learningMasteryEngine';
import { ImportSiswaModal } from './ImportSiswaModal';
import { SimulatedDataNoticeBanner } from './SimulatedDataNoticeBanner';

interface AutoDeskripsiRaporTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
  isSeparateDemoPreview?: boolean;
  onOpenSeparateDemoPreview?: () => void;
  onExitDemoPreview?: () => void;
}

const STATUS_BADGE_MAP: Record<
  StatusFinalisasiRapor,
  { label: string; bg: string; fg: string; border: string }
> = {
  belum_lengkap: {
    label: 'Belum Lengkap',
    bg: '#fef2f2',
    fg: '#b91c1c',
    border: '#fecaca',
  },
  draf: {
    label: 'Draf',
    bg: '#fffbeb',
    fg: '#b45309',
    border: '#fde68a',
  },
  siap_diperiksa: {
    label: 'Siap Diperiksa',
    bg: '#eff6ff',
    fg: '#1d4ed8',
    border: '#bfdbfe',
  },
  final: {
    label: 'Final',
    bg: '#ecfdf5',
    fg: '#047857',
    border: '#a7f3d0',
  },
};

export const AutoDeskripsiRaporTab: React.FC<AutoDeskripsiRaporTabProps> = ({
  schoolProfile,
  kelasHarian,
  tpList,
  onUpdateKelasHarian,
  onToast,
  isSeparateDemoPreview = false,
  onOpenSeparateDemoPreview,
  onExitDemoPreview,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'semua' | StatusFinalisasiRapor>('semua');
  const [blockedSummaryBanner, setBlockedSummaryBanner] = useState<
    { nama: string; missingComponents: string[] }[]
  >([]);
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);

  const activeBobot = useMemo(
    () => normalizeBobotKebijakan(kelasHarian.bobotNilai),
    [kelasHarian.bobotNilai]
  );
  const kktpMinTuntas = activeBobot.kktpMinTuntas ?? 71;
  const kktpBands = useMemo(() => computeDynamicKKTPBands(kktpMinTuntas), [kktpMinTuntas]);

  const siswaById = useMemo(() => {
    const map = new Map<string, SiswaItem>();
    kelasHarian.daftarSiswa.forEach((s) => map.set(s.id, s));
    return map;
  }, [kelasHarian.daftarSiswa]);

  const archivedById = useMemo(() => {
    const map = new Map<string, SiswaItem>();
    (kelasHarian.archivedSiswa || []).forEach((s) => map.set(s.id, s));
    return map;
  }, [kelasHarian.archivedSiswa]);

  const studentRows = useMemo(() => {
    return kelasHarian.daftarNilai
      .filter((item) => siswaById.has(item.siswaId) || !archivedById.has(item.siswaId))
      .map((item) => {
        const siswa = siswaById.get(item.siswaId);
        const summary = computeERaporStudentSummary(
          siswa,
          item,
          kelasHarian.daftarPresensi,
          tpList,
          kelasHarian.bobotNilai
        );
        return { item, siswa, summary };
      });
  }, [
    kelasHarian.daftarNilai,
    kelasHarian.daftarPresensi,
    kelasHarian.bobotNilai,
    siswaById,
    archivedById,
    tpList,
  ]);

  const archivedStudentRows = useMemo(() => {
    return kelasHarian.daftarNilai
      .filter((item) => archivedById.has(item.siswaId) && !siswaById.has(item.siswaId))
      .map((item) => {
        const siswa = archivedById.get(item.siswaId);
        const summary = computeERaporStudentSummary(
          siswa,
          item,
          kelasHarian.daftarPresensi,
          tpList,
          kelasHarian.bobotNilai
        );
        return { item, siswa, summary };
      });
  }, [
    kelasHarian.daftarNilai,
    kelasHarian.daftarPresensi,
    kelasHarian.bobotNilai,
    archivedById,
    siswaById,
    tpList,
  ]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'semua') return studentRows;
    return studentRows.filter((row) => row.summary.statusRapor === statusFilter);
  }, [studentRows, statusFilter]);

  const readinessStats = useMemo(() => {
    let totalFinal = 0;
    let totalSiap = 0;
    let totalDraf = 0;
    let totalBelumLengkap = 0;
    studentRows.forEach(({ summary }) => {
      if (summary.statusRapor === 'final') totalFinal++;
      else if (summary.statusRapor === 'siap_diperiksa') totalSiap++;
      else if (summary.statusRapor === 'draf') totalDraf++;
      else totalBelumLengkap++;
    });
    return {
      total: studentRows.length,
      totalFinal,
      totalSiap,
      totalDraf,
      totalBelumLengkap,
    };
  }, [studentRows]);

  const activePreviewRow = useMemo(
    () =>
      studentRows.find((r) => r.item.siswaId === previewStudentId) ||
      archivedStudentRows.find((r) => r.item.siswaId === previewStudentId) ||
      null,
    [studentRows, archivedStudentRows, previewStudentId]
  );

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
    setBlockedSummaryBanner([]);
    onToast(
      mode === 'merge'
        ? `Berhasil menambahkan ${newStudents.length} siswa ke daftar e-Rapor kelas ${schoolProfile.rombelAktif}!`
        : `Berhasil mengimpor ${newStudents.length} siswa ke daftar e-Rapor kelas ${schoolProfile.rombelAktif}!`
    );
  };

  const handleCopySingle = (id: string, text: string, nama: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onToast(`Deskripsi e-Rapor ${nama} disalin ke clipboard!`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyAllTSV = () => {
    const header =
      'No\tNIS\tNISN\tNama Siswa\tNilai Akhir\tPredikat\tSakit\tIzin\tAlfa\tStatus Rapor\tDeskripsi Capaian Kompetensi\tCatatan Guru';
    const rows = studentRows.map(({ item, summary }, idx) => {
      const naStr = summary.nilaiAkhir !== null ? String(summary.nilaiAkhir) : '-';
      const predStr = summary.statusNilai === 'lengkap' ? summary.predikatKKTP : 'Belum Lengkap';
      const statusLabel = STATUS_BADGE_MAP[summary.statusRapor].label;
      return `${idx + 1}\t${summary.nis}\t${summary.nisn || ''}\t${summary.nama}\t${naStr}\t${predStr}\t${summary.kehadiran.sakit}\t${summary.kehadiran.izin}\t${summary.kehadiran.alfa}\t${statusLabel}\t${(item.deskripsiRapor || summary.deskripsiRapor).replace(/\n/g, ' ')}\t${(item.catatanGuru || '').replace(/\n/g, ' ')}`;
    });
    navigator.clipboard.writeText(`${header}\n${rows.join('\n')}`);
    onToast(
      'Seluruh rekapan e-Rapor (Nilai, S/I/A, Status, Deskripsi, Catatan) disalin dalam format Excel (TSV)!'
    );
  };

  const handleRegenerateAll = () => {
    let lockedFinalCount = 0;
    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (archivedById.has(item.siswaId) && !siswaById.has(item.siswaId)) {
        return item;
      }
      if (item.statusRapor === 'final') {
        lockedFinalCount++;
        return item;
      }
      return {
        ...item,
        deskripsiRapor: generateAutoDeskripsiRapor(item.nilaiFormatif, tpList, item.nama, {
          bobotPolicy: activeBobot,
          schoolProfile,
          nilaiSTS: item.nilaiSTS,
          nilaiSAS: item.nilaiSAS,
          nilaiPraktik: item.nilaiPraktik,
          buktiAsesmenSubTP: item.buktiAsesmenSubTP,
          riwayatRemedial: item.riwayatRemedial,
        }),
      };
    });
    onUpdateKelasHarian({ ...kelasHarian, daftarNilai: updatedNilai });
    onToast(
      lockedFinalCount > 0
        ? `Deskripsi disusun ulang untuk siswa draf (${lockedFinalCount} rapor Final tetap dikunci).`
        : 'Seluruh deskripsi capaian e-Rapor berhasil disusun ulang sesuai nilai aktual per TP!'
    );
  };

  const handleEditDeskripsi = (siswaId: string, val: string) => {
    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (item.siswaId !== siswaId) return item;
      if (item.statusRapor === 'final') return item;
      return { ...item, deskripsiRapor: val };
    });
    onUpdateKelasHarian({ ...kelasHarian, daftarNilai: updatedNilai });
  };

  const handleEditCatatanGuru = (siswaId: string, val: string) => {
    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (item.siswaId !== siswaId) return item;
      if (item.statusRapor === 'final') return item;
      return { ...item, catatanGuru: val };
    });
    onUpdateKelasHarian({ ...kelasHarian, daftarNilai: updatedNilai });
  };

  const handleToggleReadyOrUnlock = (
    item: NilaiSiswaItem,
    summary: ERaporStudentSummary,
    targetStatus: StatusFinalisasiRapor
  ) => {
    const updatedNilai = kelasHarian.daftarNilai.map((row) => {
      if (row.siswaId !== item.siswaId) return row;
      if (targetStatus === 'draf') {
        return {
          ...row,
          statusRapor: summary.canFinalize ? ('draf' as const) : ('belum_lengkap' as const),
          finalizedAt: undefined,
        };
      }
      return {
        ...row,
        statusRapor: targetStatus,
      };
    });
    onUpdateKelasHarian({ ...kelasHarian, daftarNilai: updatedNilai });
    onToast(
      targetStatus === 'siap_diperiksa'
        ? `Status e-Rapor ${summary.nama} ditandai Siap Diperiksa.`
        : `Kunci e-Rapor ${summary.nama} dibuka kembali ke mode Draf.`
    );
  };

  const handleFinalizeSingle = (item: NilaiSiswaItem) => {
    const res = finalizeERaporStudent(
      item,
      kelasHarian.daftarPresensi,
      tpList,
      kelasHarian.bobotNilai
    );
    const updatedNilai = kelasHarian.daftarNilai.map((row) =>
      row.siswaId === item.siswaId ? res.updated : row
    );
    onUpdateKelasHarian({ ...kelasHarian, daftarNilai: updatedNilai });
    onToast(res.message);
  };

  const handleFinalizeClass = () => {
    const res = finalizeClassERapor(kelasHarian, tpList);
    onUpdateKelasHarian(res.updated);
    setBlockedSummaryBanner(res.blockedStudents);
    if (res.blockedStudents.length === 0 && res.finalizedCount > 0) {
      onToast(`Berhasil memfinalisasi e-Rapor untuk ${res.finalizedCount} siswa!`);
    } else if (res.finalizedCount > 0) {
      onToast(
        `${res.finalizedCount} rapor difinalisasi; ${res.blockedStudents.length} siswa tertahan karena nilai/deskripsi belum lengkap.`
      );
    } else {
      onToast(
        `Finalisasi kelas tertahan: ${res.blockedStudents.length} siswa belum memenuhi syarat kelengkapan nilai & deskripsi.`
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 4,
        }}
      >
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#172033', margin: 0 }}>
            Rekap capaian kompetensi e-Rapor
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
            Kelas {schoolProfile.rombelAktif} · Sinkron otomatis dengan Buku Nilai &amp; Presensi H/S/I/A (KKTP Terpadu ≥ {kktpMinTuntas})
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
            onClick={handleRegenerateAll}
            className="btn btn-sm btn-outline"
          >
            <Sparkles size={13} aria-hidden="true" /> Susun Ulang Deskripsi
          </button>

          <button
            type="button"
            onClick={handleFinalizeClass}
            className="btn btn-sm btn-primary"
            style={{ background: '#047857', borderColor: '#047857', color: '#fff' }}
            title="Kunci e-Rapor siswa yang nilai dan deskripsinya sudah lengkap"
          >
            <CheckCircle2 size={13} aria-hidden="true" /> Finalisasi Rapor Kelas
          </button>

          <button
            type="button"
            onClick={handleCopyAllTSV}
            className="btn btn-sm btn-outline"
            style={{ color: '#4f46e5', borderColor: '#c7d2fe' }}
          >
            <Copy size={13} aria-hidden="true" /> Salin Semua (Excel/e-Rapor)
          </button>

          <button
            type="button"
            onClick={() => {
              if (!confirmSimulationExportIfNeeded(kelasHarian, 'dokumen Rekap e-Rapor')) return;
              if (!requireActiveLicenseForAction('mencetak Rekap Deskripsi e-Rapor')) return;
              window.print();
            }}
            className="btn btn-sm btn-outline"
          >
            <Printer size={13} aria-hidden="true" /> Cetak
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!confirmSimulationExportIfNeeded(kelasHarian, 'file Word Rekap e-Rapor')) return;
              try {
                const ok = await exportRekapRaporToDocx(schoolProfile, kelasHarian, tpList);
                if (ok) {
                  onToast('Dokumen Word (.docx) Rekap Deskripsi e-Rapor berhasil diunduh!');
                }
              } catch {
                onToast('Gagal mengekspor dokumen Word.');
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Download size={13} aria-hidden="true" /> Word (.docx)
          </button>
        </div>
      </div>

      {/* Notice banner */}
      <SimulatedDataNoticeBanner
        kelasHarian={kelasHarian}
        contextLabel="rekap e-Rapor kelas ini"
        isSeparateDemoPreview={isSeparateDemoPreview}
        onExitDemoPreview={onExitDemoPreview}
        onConfirmLegacyActual={() => {
          onUpdateKelasHarian(confirmLegacyKelasHarianAsActual(schoolProfile, kelasHarian));
          onToast('Data kelas dikonfirmasi sebagai data aktual sekolah Anda.');
        }}
        onStartEmptyClass={() => {
          if (
            typeof window !== 'undefined' &&
            typeof window.confirm === 'function' &&
            !window.confirm('Kosongkan daftar siswa & mulai e-Rapor dengan kelas kosong?')
          ) {
            return;
          }
          onUpdateKelasHarian(createEmptyKelasHarianData(schoolProfile, tpList));
          setBlockedSummaryBanner([]);
          onToast('Kelas dikosongkan. Silakan impor siswa dari Excel/CSV untuk mulai menyusun e-Rapor.');
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onLoadDemoData={() => {
          if (onOpenSeparateDemoPreview) {
            onOpenSeparateDemoPreview();
            onToast('Membuka pratinjau dataset demo terpisah. Data asli Anda tetap aman.');
          } else {
            onUpdateKelasHarian(loadDemoKelasHarianData(schoolProfile, tpList));
            onToast('Data simulasi rekap e-Rapor dimuat kembali.');
          }
        }}
      />

      {/* Alert Guard Hasil Finalisasi Kelas */}
      {blockedSummaryBanner.length > 0 && (
        <div
          role="alert"
          className="no-print"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
              <AlertTriangle size={14} aria-hidden="true" />
              {blockedSummaryBanner.length} siswa belum dapat difinalisasi karena komponen belum lengkap:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {blockedSummaryBanner.slice(0, 6).map((b, i) => (
                <li key={i}>
                  <strong>{b.nama}</strong>: belum ada {b.missingComponents.join(', ')}
                </li>
              ))}
              {blockedSummaryBanner.length > 6 && (
                <li>...dan {blockedSummaryBanner.length - 6} siswa lainnya.</li>
              )}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setBlockedSummaryBanner([])}
            aria-label="Tutup peringatan finalisasi"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#991b1b',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Ringkasan Kesiapan Rapor & Filter Status */}
      <div
        className="no-print tabular-nums"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: '#fff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {(
            [
              { id: 'semua', label: `Semua (${readinessStats.total})` },
              { id: 'final', label: `Final (${readinessStats.totalFinal})` },
              { id: 'siap_diperiksa', label: `Siap Diperiksa (${readinessStats.totalSiap})` },
              { id: 'draf', label: `Draf (${readinessStats.totalDraf})` },
              { id: 'belum_lengkap', label: `Belum Lengkap (${readinessStats.totalBelumLengkap})` },
            ] as const
          ).map((chip) => {
            const active = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                style={{
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  padding: '5px 10px',
                  borderRadius: 99,
                  border: active ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                  background: active ? '#eef2ff' : '#f8fafc',
                  color: active ? '#4338ca' : '#475569',
                  cursor: 'pointer',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          TP aktif: <strong style={{ color: '#0f172a' }}>{tpList.length} TP</strong> · Pertemuan tercatat:{' '}
          <strong style={{ color: '#0f172a' }}>{kelasHarian.daftarPresensi.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          overflowX: 'auto',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 38 }}>
                No
              </th>
              <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 175 }}>
                Peserta Didik &amp; NIS/NISN
              </th>
              <th style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: '#4f46e5', width: 64 }}>
                N.Akhir
              </th>
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 112 }}>
                Predikat &amp; Status
              </th>
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#0f766e', width: 118 }}>
                Kehadiran (H/S/I/A)
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>
                Deskripsi Capaian Kompetensi &amp; Catatan Guru
              </th>
              <th className="no-print" style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 132 }}>
                Aksi &amp; Rapor
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
                  {studentRows.length === 0
                    ? 'Belum ada data siswa. Impor daftar siswa atau muat contoh kelas terlebih dahulu.'
                    : 'Tidak ada siswa pada filter status rapor ini.'}
                </td>
              </tr>
            ) : (
              filteredRows.map(({ item, summary }, idx) => {
                const badge = STATUS_BADGE_MAP[summary.statusRapor];
                const isFinal = summary.statusRapor === 'final';
                const nilaiDisplay = summary.nilaiAkhir !== null ? summary.nilaiAkhir : '-';
                const nilaiColor =
                  summary.nilaiAkhir === null
                    ? '#64748b'
                    : summary.nilaiAkhir >= kktpBands.minTuntas
                    ? '#15803d'
                    : summary.nilaiAkhir >= kktpBands.cukupMin
                    ? '#a16207'
                    : '#b91c1c';

                return (
                  <tr
                    key={item.siswaId}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                    }}
                  >
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#64748b', verticalAlign: 'top' }}>
                      {idx + 1}
                    </td>

                    <td style={{ padding: '10px 10px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{summary.nama}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                        NIS: {summary.nis || '-'}
                      </div>
                      {summary.nisn && (
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                          NISN: {summary.nisn}
                        </div>
                      )}
                    </td>

                    <td
                      className="tabular-nums"
                      style={{
                        padding: '10px 6px',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: 14,
                        verticalAlign: 'top',
                        color: nilaiColor,
                      }}
                    >
                      {nilaiDisplay}
                    </td>

                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            summary.statusNilai === 'belum_dinilai'
                              ? '#64748b'
                              : summary.statusNilai === 'lengkap'
                              ? '#1e293b'
                              : '#a16207',
                          marginBottom: 4,
                        }}
                      >
                        {summary.statusNilai === 'belum_dinilai'
                          ? 'Belum Dinilai'
                          : summary.statusNilai === 'lengkap'
                          ? summary.predikatKKTP
                          : `${summary.predikatKKTP} (Nilai Parsial)`}
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.fg,
                          border: `1px solid ${badge.border}`,
                        }}
                        title={
                          summary.missingComponents.length > 0
                            ? `Belum terisi: ${summary.missingComponents.join(', ')}`
                            : badge.label
                        }
                      >
                        {badge.label}
                      </span>
                      {summary.missingComponents.length > 0 && (
                        <div style={{ fontSize: 10, color: '#b91c1c', marginTop: 4, lineHeight: 1.3 }}>
                          Kurang: {summary.missingComponents.slice(0, 3).join(', ')}
                          {summary.missingComponents.length > 3
                            ? ` (+${summary.missingComponents.length - 3})`
                            : ''}
                        </div>
                      )}
                    </td>

                    <td
                      className="tabular-nums"
                      style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top', fontSize: 11.5 }}
                    >
                      <div style={{ fontWeight: 700, color: '#0f766e' }}>
                        {summary.kehadiran.persentaseHadir}% Hadir
                      </div>
                      <div style={{ color: '#475569', marginTop: 3 }}>
                        H:{summary.kehadiran.hadir} · S:{summary.kehadiran.sakit} · I:{summary.kehadiran.izin} ·{' '}
                        <span style={{ color: summary.kehadiran.alfa > 0 ? '#dc2626' : '#475569', fontWeight: summary.kehadiran.alfa > 0 ? 700 : 400 }}>
                          A:{summary.kehadiran.alfa}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      <textarea
                        value={item.deskripsiRapor}
                        readOnly={isFinal}
                        onChange={(e) => handleEditDeskripsi(item.siswaId, e.target.value)}
                        rows={3}
                        aria-label={`Deskripsi capaian e-Rapor ${summary.nama}`}
                        style={{
                          width: '100%',
                          padding: '6px 9px',
                          border: isFinal ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                          borderRadius: 6,
                          fontSize: 12,
                          lineHeight: 1.5,
                          resize: 'vertical',
                          color: '#1e293b',
                          background: isFinal ? '#f0fdf4' : '#ffffff',
                          fontFamily: 'inherit',
                        }}
                      />
                      <input
                        type="text"
                        value={item.catatanGuru || ''}
                        readOnly={isFinal}
                        onChange={(e) => handleEditCatatanGuru(item.siswaId, e.target.value)}
                        placeholder="Catatan pembinaan guru / pesan ke orang tua (opsional)..."
                        aria-label={`Catatan guru untuk ${summary.nama}`}
                        style={{
                          width: '100%',
                          marginTop: 5,
                          padding: '5px 8px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          fontSize: 11.5,
                          color: '#334155',
                          background: isFinal ? '#f8fafc' : '#fff',
                        }}
                      />
                    </td>

                    <td className="no-print" style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <button
                          type="button"
                          onClick={() => setPreviewStudentId(item.siswaId)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#1e293b',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          <Eye size={12} aria-hidden="true" /> Pratinjau Rapor
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopySingle(
                              item.siswaId,
                              item.deskripsiRapor || summary.deskripsiRapor,
                              summary.nama
                            )
                          }
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            background: copiedId === item.siswaId ? '#dcfce7' : '#fff',
                            color: copiedId === item.siswaId ? '#15803d' : '#4f46e5',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          {copiedId === item.siswaId ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === item.siswaId ? 'Disalin' : 'Salin Teks'}
                        </button>

                        {isFinal ? (
                          <button
                            type="button"
                            onClick={() => handleToggleReadyOrUnlock(item, summary, 'draf')}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #fde68a',
                              background: '#fffbeb',
                              color: '#b45309',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                            }}
                          >
                            <Unlock size={11} aria-hidden="true" /> Buka Kunci
                          </button>
                        ) : (
                          <>
                            {summary.canFinalize && summary.statusRapor !== 'siap_diperiksa' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleReadyOrUnlock(item, summary, 'siap_diperiksa')
                                }
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #bfdbfe',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Tandai Siap
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleFinalizeSingle(item)}
                              disabled={!summary.canFinalize}
                              title={
                                summary.canFinalize
                                  ? 'Finalisasi & kunci e-Rapor siswa ini'
                                  : `Tidak dapat difinalisasi — lengkapi: ${summary.missingComponents.join(', ') || 'deskripsi'}`
                              }
                              style={{
                                padding: '5px 8px',
                                borderRadius: 6,
                                border: summary.canFinalize
                                  ? '1px solid #047857'
                                  : '1px solid #e2e8f0',
                                background: summary.canFinalize ? '#047857' : '#f1f5f9',
                                color: summary.canFinalize ? '#fff' : '#94a3b8',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: summary.canFinalize ? 'pointer' : 'not-allowed',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                              }}
                            >
                              <Lock size={11} aria-hidden="true" /> Finalisasi
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {archivedStudentRows.length > 0 && (
        <div
          style={{
            marginTop: 12,
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 9,
            padding: '10px 12px',
            fontSize: 12,
            color: '#475569',
          }}
        >
          <strong>Arsip e-Rapor Siswa Mutasi / Nonaktif ({archivedStudentRows.length}):</strong>{' '}
          {archivedStudentRows
            .map(
              ({ summary }) =>
                `${summary.nama} (N.Akhir: ${summary.nilaiAkhir !== null ? summary.nilaiAkhir : '-'} · H:${summary.kehadiran.hadir} S:${summary.kehadiran.sakit} I:${summary.kehadiran.izin} A:${summary.kehadiran.alfa})`
            )
            .join(' · ')}
        </div>
      )}

      {/* Modal Pratinjau Kartu e-Rapor Siswa */}
      {activePreviewRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau e-Rapor ${activePreviewRow.summary.nama}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15, 23, 42, 0.58)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(15,23,42,0.28)',
              border: '1px solid #e2e8f0',
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid #1e293b',
                paddingBottom: 12,
                marginBottom: 14,
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                  Laporan Capaian Hasil Belajar (e-Rapor Kurikulum Merdeka)
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  {schoolProfile.namaSekolah}
                </h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {schoolProfile.alamatSekolah || 'Alamat Sekolah'} · Tahun Ajaran {schoolProfile.tahunAjaran}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStudentId(null)}
                aria-label="Tutup pratinjau e-Rapor"
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  borderRadius: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <X size={14} /> Tutup
              </button>
            </div>

            {/* Identitas Siswa */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 8,
                background: '#f8fafc',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 12.5,
                marginBottom: 14,
              }}
            >
              <div>
                <div>
                  <span style={{ color: '#64748b' }}>Nama Peserta Didik: </span>
                  <strong style={{ color: '#0f172a' }}>{activePreviewRow.summary.nama}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>NIS / NISN: </span>
                  <strong>
                    {activePreviewRow.summary.nis || '-'} / {activePreviewRow.summary.nisn || '-'}
                  </strong>
                </div>
              </div>
              <div>
                <div>
                  <span style={{ color: '#64748b' }}>Kelas / Rombel: </span>
                  <strong>{schoolProfile.rombelAktif}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Semester / Status Rapor: </span>
                  <strong>
                    {schoolProfile.semester} · {STATUS_BADGE_MAP[activePreviewRow.summary.statusRapor].label}
                  </strong>
                </div>
              </div>
            </div>

            {/* Tabel Capaian Mata Pelajaran */}
            <div style={{ overflowX: 'auto', marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                    <th style={{ padding: 8, textAlign: 'left', border: '1px solid #cbd5e1' }}>Mata Pelajaran</th>
                    <th style={{ padding: 8, textAlign: 'center', border: '1px solid #cbd5e1', width: 78 }}>
                      Nilai Akhir
                    </th>
                    <th style={{ padding: 8, textAlign: 'center', border: '1px solid #cbd5e1', width: 105 }}>
                      Predikat KKTP
                    </th>
                    <th style={{ padding: 8, textAlign: 'left', border: '1px solid #cbd5e1' }}>
                      Capaian Kompetensi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: 8, border: '1px solid #cbd5e1', fontWeight: 700, verticalAlign: 'top' }}>
                      {schoolProfile.mataPelajaranUtama}
                    </td>
                    <td
                      className="tabular-nums"
                      style={{
                        padding: 8,
                        border: '1px solid #cbd5e1',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: 15,
                        verticalAlign: 'top',
                      }}
                    >
                      {activePreviewRow.summary.nilaiAkhir !== null
                        ? activePreviewRow.summary.nilaiAkhir
                        : '-'}
                    </td>
                    <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top', fontWeight: 600 }}>
                      {activePreviewRow.summary.statusNilai === 'lengkap'
                        ? activePreviewRow.summary.predikatKKTP
                        : 'Belum Lengkap'}
                    </td>
                    <td style={{ padding: 8, border: '1px solid #cbd5e1', lineHeight: 1.55, verticalAlign: 'top' }}>
                      {activePreviewRow.item.deskripsiRapor || activePreviewRow.summary.deskripsiRapor}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Ringkasan Ketidakhadiran & Catatan Guru */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Ketidakhadiran (Tersinkron dari Presensi)
                </div>
                <div className="tabular-nums" style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7 }}>
                  <div>Hadir: <strong>{activePreviewRow.summary.kehadiran.hadir}</strong> ({activePreviewRow.summary.kehadiran.persentaseHadir}%)</div>
                  <div>Sakit: <strong>{activePreviewRow.summary.kehadiran.sakit}</strong> hari</div>
                  <div>Izin: <strong>{activePreviewRow.summary.kehadiran.izin}</strong> hari</div>
                  <div>Tanpa Keterangan (Alfa): <strong>{activePreviewRow.summary.kehadiran.alfa}</strong> hari</div>
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Catatan Guru / Pembinaan
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.55 }}>
                  {(activePreviewRow.item.catatanGuru || '').trim() ||
                    'Terus pertahankan sikap belajar positif dan tingkatkan keaktifan dalam diskusi kelas.'}
                </p>
              </div>
            </div>

            {/* Blok Tanda Tangan */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                textAlign: 'center',
                fontSize: 11.5,
                color: '#334155',
                borderTop: '1px dashed #cbd5e1',
                paddingTop: 14,
              }}
            >
              <div>
                <div>Mengetahui,</div>
                <div>Orang Tua / Wali</div>
                <div style={{ height: 42 }} />
                <div style={{ fontWeight: 700, textDecoration: 'underline' }}>( ............................ )</div>
              </div>
              <div>
                <div>Mengetahui,</div>
                <div>Kepala Sekolah</div>
                <div style={{ height: 42 }} />
                <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                  {schoolProfile.namaKepalaSekolah || 'Kepala Sekolah'}
                </div>
                {schoolProfile.nipKepalaSekolah && <div>NIP. {schoolProfile.nipKepalaSekolah}</div>}
              </div>
              <div>
                <div>Guru Mata Pelajaran</div>
                <div>{schoolProfile.mataPelajaranUtama}</div>
                <div style={{ height: 42 }} />
                <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                  {schoolProfile.namaGuru || 'Guru Mapel'}
                </div>
                {schoolProfile.nipGuru && <div>NIP. {schoolProfile.nipGuru}</div>}
              </div>
            </div>
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
        existingStudents={kelasHarian.daftarSiswa}
      />
    </div>
  );
};
