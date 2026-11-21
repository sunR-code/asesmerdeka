import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  ClipboardList,
  Download,
  Printer,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  SlidersHorizontal,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import type {
  BobotNilaiKebijakan,
  BuktiAsesmenSubTP,
  KelasHarianData,
  SiswaItem,
  StatusFinalisasiRapor,
} from '../../types/kelasHarian';
import { exportDaftarNilaiToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import {
  DEFAULT_BOBOT_NILAI,
  normalizeBobotKebijakan,
  validateBobotKebijakan,
  computeNilaiAkhir,
  computeClassGradeSummary,
  generateAutoDeskripsiRapor,
  applyNewStudentRoster,
  applySampleScoresSafely,
  createEmptyKelasHarianData,
  loadDemoKelasHarianData,
  confirmLegacyKelasHarianAsActual,
  confirmSimulationExportIfNeeded,
  isKelasHarianSimulated,
  getFormatifScoreForTP,
  getActiveFormatifScores,
  setFormatifScoreForTP,
} from '../../utils/kelasHarianStorage';
import {
  analyzeClassLearningMastery,
  computeDynamicKKTPBands,
  resolveEffectiveKKTPThreshold,
} from '../../utils/learningMasteryEngine';
import {
  evaluateClassRemedialOverview,
  isEvidenceProtectedFromDeletion,
  recordNonDestructiveReassessment,
  upsertStudentRemedialPlan,
  type RecordReassessmentInput,
  type UpsertRemedialPlanInput,
} from '../../utils/remedialTrackingEngine';
import { ImportSiswaModal } from './ImportSiswaModal';
import { RemedialTrackingPanel } from './RemedialTrackingPanel';
import { SimulatedDataNoticeBanner } from './SimulatedDataNoticeBanner';
import { StudentEvidenceModal } from './StudentEvidenceModal';

interface BukuNilaiTabProps {
  schoolProfile: SchoolProfile;
  kelasHarian: KelasHarianData;
  tpList: CustomTPItem[];
  onUpdateKelasHarian: (updated: KelasHarianData) => void;
  onToast: (msg: string) => void;
  isSeparateDemoPreview?: boolean;
  onOpenSeparateDemoPreview?: () => void;
  onExitDemoPreview?: () => void;
}

export const BukuNilaiTab: React.FC<BukuNilaiTabProps> = ({
  schoolProfile,
  kelasHarian,
  tpList,
  onUpdateKelasHarian,
  onToast,
  isSeparateDemoPreview = false,
  onOpenSeparateDemoPreview,
  onExitDemoPreview,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showBobotEditor, setShowBobotEditor] = useState(false);
  const [showMasteryPanel, setShowMasteryPanel] = useState(false);
  const [showRemedialPanel, setShowRemedialPanel] = useState(false);
  const [remedialFilterTpId, setRemedialFilterTpId] = useState<string>('');
  const [evidenceModalSiswaId, setEvidenceModalSiswaId] = useState<string | null>(null);

  const activeBobot = useMemo(
    () => normalizeBobotKebijakan(kelasHarian.bobotNilai || DEFAULT_BOBOT_NILAI),
    [kelasHarian.bobotNilai]
  );

  const activeKKTPMin = useMemo(
    () => resolveEffectiveKKTPThreshold({ bobotPolicy: activeBobot, schoolProfile }),
    [activeBobot, schoolProfile]
  );
  const kktpBands = useMemo(() => computeDynamicKKTPBands(activeKKTPMin), [activeKKTPMin]);

  const [draftBobot, setDraftBobot] = useState<BobotNilaiKebijakan>(activeBobot);

  useEffect(() => {
    setDraftBobot(activeBobot);
  }, [activeBobot]);

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
        ? `Berhasil menambahkan ${newStudents.length} siswa baru ke kelas ${schoolProfile.rombelAktif}!`
        : `Berhasil mengimpor ${newStudents.length} siswa ke kelas ${schoolProfile.rombelAktif}!`
    );
  };

  const parseScoreInput = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const num = Number(trimmed);
    if (Number.isNaN(num)) return null;
    return Math.min(100, Math.max(0, Math.round(num)));
  };

  // Update score formatif inline (selalu disimpan memakai immutable TP ID; kosong != 0)
  const handleScoreChange = (siswaId: string, tp: CustomTPItem, rawVal: string) => {
    const parsedScore = parseScoreInput(rawVal);

    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (item.siswaId !== siswaId) return item;

      const newFormatif = setFormatifScoreForTP(item.nilaiFormatif, tp, parsedScore);

      const { na, predikat, statusNilai } = computeNilaiAkhir(
        newFormatif,
        item.nilaiSTS,
        item.nilaiSAS,
        tpList,
        activeBobot,
        item.nilaiPraktik
      );
      const deskripsi = generateAutoDeskripsiRapor(newFormatif, tpList, item.nama, {
        bobotPolicy: activeBobot,
        schoolProfile,
        nilaiSTS: item.nilaiSTS,
        nilaiSAS: item.nilaiSAS,
        nilaiPraktik: item.nilaiPraktik,
        buktiAsesmenSubTP: item.buktiAsesmenSubTP,
        riwayatRemedial: item.riwayatRemedial,
      });

      return {
        ...item,
        nilaiFormatif: newFormatif,
        nilaiAkhir: na,
        predikatKKTP: predikat,
        statusNilai,
        statusRapor: (
          statusNilai === 'lengkap'
            ? item.statusRapor === 'final'
              ? 'final'
              : 'draf'
            : 'belum_lengkap'
        ) as StatusFinalisasiRapor,
        deskripsiRapor: deskripsi,
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarNilai: updatedNilai,
    });
  };

  // Update STS / SAS / Praktik inline (kosong disimpan null, 0 disimpan 0)
  const handleSumatifChange = (
    siswaId: string,
    type: 'STS' | 'SAS' | 'PRAKTIK',
    rawVal: string
  ) => {
    const parsedScore = parseScoreInput(rawVal);

    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (item.siswaId !== siswaId) return item;

      const newSTS = type === 'STS' ? parsedScore : item.nilaiSTS;
      const newSAS = type === 'SAS' ? parsedScore : item.nilaiSAS;
      const newPraktik = type === 'PRAKTIK' ? parsedScore : item.nilaiPraktik;

      const { na, predikat, statusNilai } = computeNilaiAkhir(
        item.nilaiFormatif,
        newSTS,
        newSAS,
        tpList,
        activeBobot,
        newPraktik
      );
      const deskripsi = generateAutoDeskripsiRapor(item.nilaiFormatif, tpList, item.nama, {
        bobotPolicy: activeBobot,
        schoolProfile,
        nilaiSTS: newSTS,
        nilaiSAS: newSAS,
        nilaiPraktik: newPraktik,
        buktiAsesmenSubTP: item.buktiAsesmenSubTP,
        riwayatRemedial: item.riwayatRemedial,
      });

      return {
        ...item,
        nilaiSTS: newSTS,
        nilaiSAS: newSAS,
        nilaiPraktik: newPraktik,
        nilaiAkhir: na,
        predikatKKTP: predikat,
        statusNilai,
        statusRapor: (
          statusNilai === 'lengkap'
            ? item.statusRapor === 'final'
              ? 'final'
              : 'draf'
            : 'belum_lengkap'
        ) as StatusFinalisasiRapor,
        deskripsiRapor: deskripsi,
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      daftarNilai: updatedNilai,
    });
  };

  const bobotCheck = validateBobotKebijakan(draftBobot);

  const handleSaveBobot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bobotCheck.valid) {
      onToast(bobotCheck.message || 'Total bobot harus 100%.');
      return;
    }

    const recalculated = kelasHarian.daftarNilai.map((item) => {
      const { na, predikat, statusNilai } = computeNilaiAkhir(
        item.nilaiFormatif,
        item.nilaiSTS,
        item.nilaiSAS,
        tpList,
        draftBobot,
        item.nilaiPraktik
      );
      return {
        ...item,
        nilaiAkhir: na,
        predikatKKTP: predikat,
        statusNilai,
        statusRapor: (
          statusNilai === 'lengkap'
            ? item.statusRapor === 'final'
              ? 'final'
              : 'draf'
            : 'belum_lengkap'
        ) as StatusFinalisasiRapor,
        deskripsiRapor:
          item.statusRapor === 'final'
            ? item.deskripsiRapor
            : generateAutoDeskripsiRapor(item.nilaiFormatif, tpList, item.nama, {
                bobotPolicy: draftBobot,
                schoolProfile,
                nilaiSTS: item.nilaiSTS,
                nilaiSAS: item.nilaiSAS,
                nilaiPraktik: item.nilaiPraktik,
                buktiAsesmenSubTP: item.buktiAsesmenSubTP,
                riwayatRemedial: item.riwayatRemedial,
              }),
      };
    });

    onUpdateKelasHarian({
      ...kelasHarian,
      bobotNilai: draftBobot,
      daftarNilai: recalculated,
    });
    setShowBobotEditor(false);
    onToast('Kebijakan bobot & KKTP diperbarui; seluruh status ketercapaian dihitung ulang tanpa mengubah nilai mentah.');
  };

  const handleAddEvidence = (siswaId: string, entry: BuktiAsesmenSubTP) => {
    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (item.siswaId !== siswaId) return item;
      const nextEvidences = [...(item.buktiAsesmenSubTP || []), entry];
      return {
        ...item,
        buktiAsesmenSubTP: nextEvidences,
        deskripsiRapor:
          item.statusRapor === 'final'
            ? item.deskripsiRapor
            : generateAutoDeskripsiRapor(item.nilaiFormatif, tpList, item.nama, {
                bobotPolicy: activeBobot,
                schoolProfile,
                nilaiSTS: item.nilaiSTS,
                nilaiSAS: item.nilaiSAS,
                nilaiPraktik: item.nilaiPraktik,
                buktiAsesmenSubTP: nextEvidences,
                riwayatRemedial: item.riwayatRemedial,
              }),
      };
    });
    onUpdateKelasHarian({ ...kelasHarian, daftarNilai: updatedNilai });
    onToast('Bukti asesmen TP/Sub-TP disimpan.');
  };

  const handleRemoveEvidence = (siswaId: string, evidenceId: string) => {
    const targetRow = kelasHarian.daftarNilai.find((n) => n.siswaId === siswaId);
    if (targetRow) {
      const protection = isEvidenceProtectedFromDeletion(targetRow, evidenceId);
      if (protection.protected) {
        onToast(protection.reason || 'Bukti penilaian ini dilindungi dan tidak dapat dihapus.');
        return;
      }
    }
    const updatedNilai = kelasHarian.daftarNilai.map((item) => {
      if (item.siswaId !== siswaId) return item;
      const nextEvidences = (item.buktiAsesmenSubTP || []).filter((e) => e.id !== evidenceId);
      return {
        ...item,
        buktiAsesmenSubTP: nextEvidences,
      };
    });
    onUpdateKelasHarian({ ...kelasHarian, daftarNilai: updatedNilai });
    onToast('Bukti asesmen dihapus.');
  };

  const handleSaveRemedialPlan = (
    input: Omit<UpsertRemedialPlanInput, 'kelasHarian' | 'schoolProfile'>
  ) => {
    const res = upsertStudentRemedialPlan({
      ...input,
      kelasHarian,
      schoolProfile,
    });
    onUpdateKelasHarian(res.kelasHarian);
    onToast(
      res.finalReportPreserved
        ? 'Catatan remedial tersimpan terpisah; nilai & deskripsi Rapor Final tetap terkunci.'
        : 'Rencana & status tindak lanjut remedial tersimpan tanpa mengubah nilai awal.'
    );
  };

  const handleSaveReassessment = (
    input: Omit<RecordReassessmentInput, 'kelasHarian' | 'schoolProfile'>
  ) => {
    const res = recordNonDestructiveReassessment({
      ...input,
      kelasHarian,
      schoolProfile,
    });
    onUpdateKelasHarian(res.kelasHarian);
    onToast(
      res.finalReportPreserved
        ? 'Hasil reassessment dicatat sebagai bukti baru; bukti awal dan Rapor Final tetap utuh.'
        : 'Hasil reassessment dicatat sebagai bukti baru terpisah tanpa menimpa nilai awal.'
    );
  };

  const isSimulationDataset = isKelasHarianSimulated(kelasHarian);

  const handlePopulateRealisticScores = () => {
    if (!isSimulationDataset) {
      if (onOpenSeparateDemoPreview) {
        if (
          typeof window !== 'undefined' &&
          typeof window.confirm === 'function' &&
          window.confirm(
            'Dataset ini berisi data aktual / lama, bukan dataset simulasi.\n\nNilai siswa aktual TIDAK akan ditimpa. Ingin membuka pratinjau dataset demo terpisah untuk melihat contoh nilai?'
          )
        ) {
          onOpenSeparateDemoPreview();
        }
      } else {
        onToast('Nilai aktual dilindungi: data contoh hanya tersedia pada mode simulasi.');
      }
      return;
    }

    if (
      typeof window !== 'undefined' &&
      typeof window.confirm === 'function' &&
      !window.confirm('Muat ulang contoh nilai simulasi pada 30 siswa contoh ini?')
    ) {
      return;
    }

    const res = applySampleScoresSafely(kelasHarian, tpList);
    if (res.status === 'applied_demo') {
      onUpdateKelasHarian(res.updated);
    }
    onToast(res.message);
  };

  const handleFillEmptyCellsOnly = () => {
    const res = applySampleScoresSafely(kelasHarian, tpList, { fillEmptyOnly: true });
    if (res.filledCellCount > 0) {
      onUpdateKelasHarian(res.updated);
    }
    onToast(res.message);
  };

  const archivedIdSet = useMemo(
    () => new Set((kelasHarian.archivedSiswa || []).map((s) => s.id)),
    [kelasHarian.archivedSiswa]
  );

  const activeDaftarNilai = useMemo(
    () => kelasHarian.daftarNilai.filter((item) => !archivedIdSet.has(item.siswaId)),
    [kelasHarian.daftarNilai, archivedIdSet]
  );

  const archivedDaftarNilai = useMemo(
    () => kelasHarian.daftarNilai.filter((item) => archivedIdSet.has(item.siswaId)),
    [kelasHarian.daftarNilai, archivedIdSet]
  );

  const summary = useMemo(
    () => computeClassGradeSummary(activeDaftarNilai, tpList, activeBobot),
    [activeDaftarNilai, tpList, activeBobot]
  );

  const masteryReport = useMemo(
    () =>
      analyzeClassLearningMastery({
        daftarNilai: activeDaftarNilai,
        tpList,
        bobotPolicy: activeBobot,
        schoolProfile,
      }),
    [activeDaftarNilai, tpList, activeBobot, schoolProfile]
  );

  const remedialTargetOverview = useMemo(
    () =>
      evaluateClassRemedialOverview({
        kelasHarian,
        tpList,
        bobotPolicy: activeBobot,
        schoolProfile,
      }),
    [kelasHarian, tpList, activeBobot, schoolProfile]
  );

  const activeEvidenceStudent = useMemo(
    () => activeDaftarNilai.find((n) => n.siswaId === evidenceModalSiswaId) || null,
    [activeDaftarNilai, evidenceModalSiswaId]
  );

  const hasPraktik = (activeBobot.bobotPraktik ?? 0) > 0;

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
            Buku nilai per TP
          </h2>
          <p className="tabular-nums" style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
            Kelas {schoolProfile.rombelAktif} · Bobot: Formatif {activeBobot.bobotFormatif}% · STS{' '}
            {activeBobot.bobotSTS}% · SAS {activeBobot.bobotSAS}%
            {hasPraktik ? ` · Praktik ${activeBobot.bobotPraktik}%` : ''} ·{' '}
            <strong>KKTP ≥ {kktpBands.minTuntas}</strong>
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowBobotEditor((v) => !v)}
            className="btn btn-sm btn-outline"
            aria-expanded={showBobotEditor}
            title="Atur proporsi bobot nilai dan ambang KKTP"
          >
            <SlidersHorizontal size={13} aria-hidden="true" /> Atur Bobot &amp; KKTP
          </button>

          <button
            type="button"
            onClick={() => setShowMasteryPanel((v) => !v)}
            className={`btn btn-sm ${showMasteryPanel ? 'btn-primary' : 'btn-outline'}`}
            aria-expanded={showMasteryPanel}
            title="Lihat analisis ketercapaian per TP/Sub-TP dan rekomendasi tindak lanjut"
          >
            <BarChart3 size={13} aria-hidden="true" /> Analisis TP
          </button>

          <button
            type="button"
            onClick={() => setShowRemedialPanel((v) => !v)}
            className={`btn btn-sm ${showRemedialPanel ? 'btn-primary' : 'btn-outline'}`}
            aria-expanded={showRemedialPanel}
            title="Kelola siswa sasaran remedial dan pencatatan reassessment non-destruktif"
          >
            <RefreshCw size={13} aria-hidden="true" /> Tindak Lanjut Remedial (
            {remedialTargetOverview.counts.totalTargets})
          </button>

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
            onClick={handleFillEmptyCellsOnly}
            className="btn btn-sm btn-outline"
            title="Isi hanya kolom nilai yang masih kosong tanpa mengubah nilai yang sudah terisi"
          >
            <Sparkles size={13} aria-hidden="true" /> Lengkapi sel kosong
          </button>

          {isSimulationDataset ? (
            <button
              type="button"
              onClick={handlePopulateRealisticScores}
              className="btn btn-sm btn-outline"
              title="Muat ulang contoh nilai pada dataset simulasi ini"
            >
              <Sparkles size={13} aria-hidden="true" /> Isi contoh nilai
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePopulateRealisticScores}
              className="btn btn-sm btn-outline"
              title="Nilai aktual dilindungi; buka pratinjau dataset demo terpisah bila ingin melihat contoh"
            >
              <Sparkles size={13} aria-hidden="true" /> Contoh nilai (Mode Demo)
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!confirmSimulationExportIfNeeded(kelasHarian, 'dokumen Buku Nilai')) return;
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
              if (!confirmSimulationExportIfNeeded(kelasHarian, 'file Word Buku Nilai')) return;
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

      {/* Pengaturan Bobot Nilai */}
      {showBobotEditor && (
        <form
          onSubmit={handleSaveBobot}
          className="no-print"
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 10,
          }}
        >
          <div style={{ minWidth: 96 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 3 }}>
              Formatif (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="form-input"
              value={draftBobot.bobotFormatif}
              onChange={(e) =>
                setDraftBobot({ ...draftBobot, bobotFormatif: Number(e.target.value) || 0 })
              }
              style={{ width: 88, padding: '5px 8px', fontSize: 13 }}
            />
          </div>
          <div style={{ minWidth: 96 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 3 }}>
              STS (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="form-input"
              value={draftBobot.bobotSTS}
              onChange={(e) =>
                setDraftBobot({ ...draftBobot, bobotSTS: Number(e.target.value) || 0 })
              }
              style={{ width: 88, padding: '5px 8px', fontSize: 13 }}
            />
          </div>
          <div style={{ minWidth: 96 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 3 }}>
              SAS (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="form-input"
              value={draftBobot.bobotSAS}
              onChange={(e) =>
                setDraftBobot({ ...draftBobot, bobotSAS: Number(e.target.value) || 0 })
              }
              style={{ width: 88, padding: '5px 8px', fontSize: 13 }}
            />
          </div>
          <div style={{ minWidth: 96 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 3 }}>
              Praktik/Proyek (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="form-input"
              value={draftBobot.bobotPraktik ?? 0}
              onChange={(e) =>
                setDraftBobot({ ...draftBobot, bobotPraktik: Number(e.target.value) || 0 })
              }
              style={{ width: 88, padding: '5px 8px', fontSize: 13 }}
            />
          </div>
          <div style={{ minWidth: 108 }}>
            <label
              htmlFor="kktp-min-tuntas-input"
              style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 3, color: '#1d4ed8' }}
            >
              KKTP Min. Tuntas
            </label>
            <input
              id="kktp-min-tuntas-input"
              type="number"
              min={1}
              max={100}
              className="form-input"
              value={draftBobot.kktpMinTuntas ?? 71}
              onChange={(e) =>
                setDraftBobot({
                  ...draftBobot,
                  kktpMinTuntas: Math.min(100, Math.max(1, Number(e.target.value) || 71)),
                })
              }
              style={{ width: 96, padding: '5px 8px', fontSize: 13 }}
            />
          </div>
          <div style={{ minWidth: 136 }}>
            <label
              htmlFor="ambang-klasikal-input"
              style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 3, color: '#475569' }}
            >
              Ambang Klasikal (%)
            </label>
            <input
              id="ambang-klasikal-input"
              type="number"
              min={1}
              max={100}
              className="form-input"
              title="Heuristik produk yang dapat disesuaikan guru untuk menyarankan penguatan klasikal"
              value={draftBobot.ambangKelasTindakLanjutPersen ?? 30}
              onChange={(e) =>
                setDraftBobot({
                  ...draftBobot,
                  ambangKelasTindakLanjutPersen: Math.min(100, Math.max(1, Number(e.target.value) || 30)),
                })
              }
              style={{ width: 108, padding: '5px 8px', fontSize: 13 }}
            />
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: bobotCheck.valid ? '#15803d' : '#b91c1c',
              paddingBottom: 6,
            }}
          >
            Total: {bobotCheck.total}% {bobotCheck.valid ? '(Valid)' : bobotCheck.message || '(Harus 100%)'}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" disabled={!bobotCheck.valid} className="btn btn-sm btn-primary">
              Simpan Bobot &amp; KKTP
            </button>
            <button
              type="button"
              onClick={() => setDraftBobot({ ...DEFAULT_BOBOT_NILAI })}
              className="btn btn-sm btn-outline"
            >
              Reset 50/25/25
            </button>
          </div>
        </form>
      )}

      <SimulatedDataNoticeBanner
        kelasHarian={kelasHarian}
        contextLabel={`Buku Nilai Kelas ${schoolProfile.rombelAktif}`}
        isSeparateDemoPreview={isSeparateDemoPreview}
        onExitDemoPreview={onExitDemoPreview}
        onConfirmLegacyActual={() => {
          const confirmed = confirmLegacyKelasHarianAsActual(schoolProfile, kelasHarian);
          onUpdateKelasHarian(confirmed);
          onToast('Data kelas dikonfirmasi sebagai data aktual sekolah Anda.');
        }}
        onStartEmptyClass={() => {
          if (
            typeof window !== 'undefined' &&
            typeof window.confirm === 'function' &&
            !window.confirm('Kosongkan data kelas ini dan mulai buku nilai dengan kelas kosong?')
          ) {
            return;
          }
          onUpdateKelasHarian(createEmptyKelasHarianData(schoolProfile, tpList));
          onToast('Kelas dikosongkan. Silakan impor siswa dari Excel/CSV untuk mulai menginput nilai.');
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onLoadDemoData={() => {
          if (onOpenSeparateDemoPreview) {
            onOpenSeparateDemoPreview();
            onToast('Membuka pratinjau dataset demo terpisah. Data asli Anda tetap aman.');
          } else {
            onUpdateKelasHarian(loadDemoKelasHarianData(schoolProfile, tpList));
            onToast('Data simulasi buku nilai dimuat kembali.');
          }
        }}
      />

      {/* Ringkasan Capaian Nilai Kelas */}
      <div
        className="tabular-nums"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          {
            label: `Rata-rata (${summary.gradedCount} dinilai)`,
            val: summary.avgKelas !== null ? summary.avgKelas : '—',
            dot: '#2563eb',
          },
          {
            label: `Tercapai (≥ ${kktpBands.minTuntas})`,
            val:
              summary.gradedCount > 0
                ? `${summary.totalTercapai}/${summary.gradedCount} (${summary.persentaseTercapai ?? 0}%)`
                : '0/0',
            dot: '#16a34a',
          },
          {
            label: `Sangat Baik (${kktpBands.sangatBaikMin}–100)`,
            val: `${summary.totalSangatBaik} siswa`,
            dot: '#15803d',
          },
          {
            label: `Baik (${kktpBands.minTuntas}–${Math.max(kktpBands.minTuntas, kktpBands.sangatBaikMin - 1)})`,
            val: `${summary.totalBaik} siswa`,
            dot: '#0284c7',
          },
          {
            label: `Cukup (${kktpBands.cukupMin}–${Math.max(kktpBands.cukupMin, kktpBands.minTuntas - 1)})`,
            val: `${summary.totalCukup} siswa`,
            dot: '#d97706',
          },
          {
            label: `Perlu Bimbingan (< ${kktpBands.cukupMin})`,
            val: `${summary.totalPerluBimbingan} siswa`,
            dot: '#dc2626',
          },
          {
            label: 'Belum Dinilai',
            val: `${summary.belumDinilaiCount} siswa`,
            dot: '#64748b',
          },
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: stat.dot, flexShrink: 0 }} />
              <span>{stat.label}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#172033', marginTop: 2 }}>{stat.val}</div>
          </div>
        ))}
      </div>

      {/* Analisis Ketercapaian Per TP & Rekomendasi Tindak Lanjut */}
      {showMasteryPanel && (
        <div
          className="no-print"
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 14,
            fontSize: 12.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <strong style={{ color: '#0f172a', fontSize: 13.5 }}>
              Ringkasan Ketercapaian Per TP &amp; Rekomendasi Tindak Lanjut
            </strong>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              Denominator persentase hanya menghitung siswa yang sudah memiliki bukti penilaian valid (ambang heuristik produk: {masteryReport.ambangHeuristikPersen}%, dapat disesuaikan guru)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {masteryReport.tpSummaries.map((tpSum) => {
              const recTone =
                tpSum.rekomendasi.kind === 'belum_perlu_tindak_lanjut'
                  ? { bg: '#dcfce7', fg: '#15803d', border: '#86efac' }
                  : tpSum.rekomendasi.kind === 'belum_dapat_ditentukan'
                  ? { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' }
                  : tpSum.rekomendasi.kind === 'kelas_keseluruhan'
                  ? { bg: '#fee2e2', fg: '#b91c1c', border: '#fca5a5' }
                  : { bg: '#fffbeb', fg: '#b45309', border: '#fcd34d' };

              return (
                <div
                  key={tpSum.tpId}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, color: '#1e3a8a' }}>
                      TP {tpSum.tpKode} — {tpSum.materiPokok} (KKTP ≥ {tpSum.thresholdKKTP})
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        background: recTone.bg,
                        color: recTone.fg,
                        border: `1px solid ${recTone.border}`,
                      }}
                    >
                      {tpSum.rekomendasi.label}
                    </span>
                  </div>

                  <div className="tabular-nums" style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>
                    Dinilai: <strong>{tpSum.dinilaiCount}/{tpSum.totalSiswa}</strong> · Tercapai:{' '}
                    <strong style={{ color: '#15803d' }}>{tpSum.tercapaiCount}</strong> · Perlu Bimbingan:{' '}
                    <strong style={{ color: '#b45309' }}>{tpSum.perluBimbinganCount}</strong> · Belum Dinilai:{' '}
                    <strong>{tpSum.belumDinilaiCount}</strong> · Ketuntasan:{' '}
                    <strong>{tpSum.persentaseTercapai !== null ? `${tpSum.persentaseTercapai}%` : '—'}</strong>
                  </div>

                  <div style={{ fontSize: 11.5, color: '#475569' }}>
                    {tpSum.rekomendasi.alasan} ({tpSum.rekomendasi.dasarData})
                  </div>

                  {tpSum.hasSpecificSubTPEvidence ? (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tpSum.subTpSummaries.map((sub) => (
                        <span
                          key={sub.subTpId}
                          style={{
                            fontSize: 11,
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                          }}
                        >
                          Sub-TP {sub.subTpKode}: {sub.dinilaiCount > 0 ? `${sub.tercapaiCount}/${sub.dinilaiCount} tuntas` : 'Bukti belum cukup'}
                        </span>
                      ))}
                    </div>
                  ) : tpSum.subTpSummaries.length > 0 ? (
                    <div style={{ marginTop: 4, fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                      Hanya tersedia capaian tingkat TP; rincian Sub-TP belum memiliki bukti spesifik.
                    </div>
                  ) : null}

                  {tpSum.perluBimbinganCount > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 11.5 }}
                        onClick={() => {
                          setRemedialFilterTpId(tpSum.tpId);
                          setShowRemedialPanel(true);
                        }}
                      >
                        <RefreshCw size={11} aria-hidden="true" /> Kelola Remedial TP {tpSum.tpKode} (
                        {tpSum.perluBimbinganCount} siswa)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel Pelacakan Remedial & Reassessment Non-Destruktif */}
      {showRemedialPanel && (
        <RemedialTrackingPanel
          schoolProfile={schoolProfile}
          kelasHarian={kelasHarian}
          tpList={tpList}
          selectedTpId={remedialFilterTpId}
          onChangeSelectedTpId={setRemedialFilterTpId}
          onSaveRemedialPlan={handleSaveRemedialPlan}
          onSaveReassessment={handleSaveReassessment}
          onOpenStudentEvidenceModal={(sid) => setEvidenceModalSiswaId(sid)}
        />
      )}

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
                  key={tp.id || tp.kode}
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
              {hasPraktik && <th style={{ width: 56, textAlign: 'center' }}>Praktik</th>}
              <th style={{ width: 64, textAlign: 'center', color: '#15803d', borderLeft: '2px solid #cbd5e1' }}>
                N.Akhir
              </th>
              <th style={{ width: 115, textAlign: 'center' }}>Predikat</th>
            </tr>
          </thead>
          <tbody>
            {activeDaftarNilai.map((item, idx) => {
              const scores = getActiveFormatifScores(item.nilaiFormatif, tpList);
              const avgFormatif =
                scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

              const computed = computeNilaiAkhir(
                item.nilaiFormatif,
                item.nilaiSTS,
                item.nilaiSAS,
                tpList,
                activeBobot,
                item.nilaiPraktik
              );
              const displayNA = computed.na;
              const isBlankStudent = computed.statusNilai === 'belum_dinilai' || displayNA === null;

              return (
                <tr key={item.siswaId} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                    {item.nis || '—'}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>
                    {item.nama}
                  </td>

                  {/* Input Formatif per TP (kosong ditampilkan '-', bukan angka bayangan 75) */}
                  {tpList.map((tp) => {
                    const score = getFormatifScoreForTP(item.nilaiFormatif, tp);
                    const hasScore = typeof score === 'number' && !Number.isNaN(score);
                    const tpThresh = resolveEffectiveKKTPThreshold({ tp, bobotPolicy: activeBobot, schoolProfile });
                    const tpBands = computeDynamicKKTPBands(tpThresh);
                    const cellColor = !hasScore
                      ? '#64748b'
                      : score >= tpBands.minTuntas
                      ? '#15803d'
                      : score >= tpBands.cukupMin
                      ? '#a16207'
                      : '#b91c1c';
                    return (
                      <td key={tp.id || tp.kode} style={{ padding: '4px 2px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="-"
                          aria-label={`Nilai formatif ${tp.kode} untuk ${item.nama}`}
                          value={hasScore ? score : ''}
                          onChange={(e) => handleScoreChange(item.siswaId, tp, e.target.value)}
                          style={{
                            width: 44,
                            padding: '3px 2px',
                            textAlign: 'center',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 700,
                            color: cellColor,
                          }}
                        />
                      </td>
                    );
                  })}

                  {/* Rata-rata Formatif */}
                  <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                    {avgFormatif !== null ? avgFormatif : '—'}
                  </td>

                  {/* Input STS */}
                  <td style={{ padding: '4px 2px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="-"
                      aria-label={`Nilai STS untuk ${item.nama}`}
                      value={typeof item.nilaiSTS === 'number' ? item.nilaiSTS : ''}
                      onChange={(e) => handleSumatifChange(item.siswaId, 'STS', e.target.value)}
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
                      placeholder="-"
                      aria-label={`Nilai SAS untuk ${item.nama}`}
                      value={typeof item.nilaiSAS === 'number' ? item.nilaiSAS : ''}
                      onChange={(e) => handleSumatifChange(item.siswaId, 'SAS', e.target.value)}
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

                  {hasPraktik && (
                    <td style={{ padding: '4px 2px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="-"
                        aria-label={`Nilai Praktik untuk ${item.nama}`}
                        value={typeof item.nilaiPraktik === 'number' ? item.nilaiPraktik : ''}
                        onChange={(e) => handleSumatifChange(item.siswaId, 'PRAKTIK', e.target.value)}
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
                  )}

                  {/* Nilai Akhir (NA) */}
                  <td
                    style={{
                      padding: '6px 4px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                      fontWeight: 800,
                      background: isBlankStudent
                        ? '#f8fafc'
                        : computed.predikat === 'Sangat Baik' || computed.predikat === 'Baik'
                        ? '#f0fdf4'
                        : computed.predikat === 'Cukup'
                        ? '#fef9c3'
                        : '#fee2e2',
                      color: isBlankStudent
                        ? '#64748b'
                        : computed.predikat === 'Sangat Baik' || computed.predikat === 'Baik'
                        ? '#15803d'
                        : computed.predikat === 'Cukup'
                        ? '#a16207'
                        : '#b91c1c',
                      fontSize: 13,
                    }}
                  >
                    {isBlankStudent ? '—' : displayNA}
                    {computed.statusNilai === 'sebagian' && (
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#b45309' }}>Parsial</div>
                    )}
                  </td>

                  {/* Predikat KKTP Badge & Akses Rincian Bukti */}
                  <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    {isBlankStudent || computed.predikat === 'Belum Dinilai' ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: '#f1f5f9',
                          color: '#64748b',
                        }}
                      >
                        Belum Dinilai
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontSize: 10.5,
                          fontWeight: 800,
                          background:
                            computed.predikat === 'Sangat Baik'
                              ? '#dcfce7'
                              : computed.predikat === 'Baik'
                              ? '#dbeafe'
                              : computed.predikat === 'Cukup'
                              ? '#fef9c3'
                              : '#fee2e2',
                          color:
                            computed.predikat === 'Sangat Baik'
                              ? '#15803d'
                              : computed.predikat === 'Baik'
                              ? '#1d4ed8'
                              : computed.predikat === 'Cukup'
                              ? '#a16207'
                              : '#b91c1c',
                        }}
                      >
                        {computed.predikat}
                      </span>
                    )}
                    <div className="no-print" style={{ marginTop: 3 }}>
                      <button
                        type="button"
                        onClick={() => setEvidenceModalSiswaId(item.siswaId)}
                        aria-label={`Lihat bukti asesmen ${item.nama}`}
                        style={{
                          background: 'transparent',
                          border: '1px solid #cbd5e1',
                          borderRadius: 5,
                          padding: '1px 6px',
                          fontSize: 10.5,
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <ClipboardList size={10} aria-hidden="true" />
                        Bukti ({item.buktiAsesmenSubTP?.length || 0})
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '9px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
          <strong style={{ color: '#334155' }}>Keterangan KKTP Dinamis (Min. Tuntas {kktpBands.minTuntas}):</strong>{' '}
          {kktpBands.sangatBaikMin}–100 (Sangat Baik) · {kktpBands.minTuntas}–{Math.max(kktpBands.minTuntas, kktpBands.sangatBaikMin - 1)} (Baik) · {kktpBands.cukupMin}–{Math.max(kktpBands.cukupMin, kktpBands.minTuntas - 1)} (Cukup) · 0–{Math.max(0, kktpBands.cukupMin - 1)} (Perlu Bimbingan). Sel kosong (<code>-</code>) berstatus <strong>Belum Dinilai</strong> dan berbeda dari skor <code>0</code>.
        </div>
      </div>

      {archivedDaftarNilai.length > 0 && (
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
          <strong>Arsip Nilai Siswa Mutasi / Nonaktif ({archivedDaftarNilai.length}):</strong>{' '}
          {archivedDaftarNilai
            .map((item) => {
              const naRes = computeNilaiAkhir(
                item.nilaiFormatif,
                item.nilaiSTS,
                item.nilaiSAS,
                tpList,
                activeBobot,
                item.nilaiPraktik
              );
              return `${item.nama} (N.Akhir: ${naRes.na !== null ? naRes.na : '-'})`;
            })
            .join(' · ')}
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

      {/* Modal Bukti Asesmen & Rincian Ketercapaian TP/Sub-TP */}
      <StudentEvidenceModal
        isOpen={Boolean(activeEvidenceStudent)}
        siswaNilai={activeEvidenceStudent}
        tpList={tpList}
        bobotPolicy={activeBobot}
        schoolProfile={schoolProfile}
        onAddEvidence={handleAddEvidence}
        onRemoveEvidence={handleRemoveEvidence}
        onClose={() => setEvidenceModalSiswaId(null)}
      />
    </div>
  );
};
