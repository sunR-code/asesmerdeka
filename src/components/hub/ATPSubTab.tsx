import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  GitBranch,
  Printer,
  RotateCcw,
  Sparkles,
  Table2,
} from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../../utils/schoolProfileStorage';
import { buildSmartATP } from '../../utils/perangkatAjarEngine';
import { exportATPToDocx } from '../../utils/docxExporter';
import { requireActiveLicenseForAction } from '../../utils/licenseManager';
import { resolveCPStatusLabel } from '../../utils/cpStorage';
import {
  analyzeATPDependencyGraph,
  deduplicateATPValidationIssues,
  recommendATPAssessmentPlan,
  recommendATPOrder,
  reorderTpIdsByStep,
  type ATPAssessmentForm,
  type ATPOrderRecommendation,
} from '../../utils/atpSequencingEngine';
import {
  allocateTPToScheduleAndPersist,
  applyPhaseOrderAndPersist,
  approvePhaseATPPlan,
  collectPhaseTPItems,
  evaluatePhaseATPApproval,
  initializeOrSyncPhaseATPPlan,
  invalidatePhaseATPApprovalIfChanged,
  savePhaseATPPlan,
  updatePhaseTPItemInOriginScope,
  type ATPAllocationMapping,
  type PhaseATPPlan,
} from '../../utils/atpStorage';
import {
  ATPAllocationPanel,
  TPAssessmentEditor,
  TPPrerequisiteEditor,
} from './ATPAllocationPanel';

interface ATPSubTabProps {
  tpList: CustomTPItem[];
  schoolProfile: SchoolProfile;
  onUpdateTPList?: (nextList: CustomTPItem[]) => void;
  onToast: (msg: string) => void;
}

export const ATPSubTab: React.FC<ATPSubTabProps> = ({
  tpList,
  schoolProfile,
  onUpdateTPList,
  onToast,
}) => {
  const [phasePlan, setPhasePlan] = useState<PhaseATPPlan>(() =>
    initializeOrSyncPhaseATPPlan(schoolProfile, tpList)
  );
  const [recommendationPreview, setRecommendationPreview] =
    useState<ATPOrderRecommendation | null>(null);
  const [openPrereqTpId, setOpenPrereqTpId] = useState<string | null>(null);
  const [openAssessTpId, setOpenAssessTpId] = useState<string | null>(null);
  const [showAllocationPanel, setShowAllocationPanel] = useState(false);
  const [includeAllocationInDocx, setIncludeAllocationInDocx] = useState(true);
  const [tpRevision, setTpRevision] = useState(0);

  useEffect(() => {
    const synced = initializeOrSyncPhaseATPPlan(schoolProfile, tpList);
    const localCollected = collectPhaseTPItems(schoolProfile, tpList, synced.fase);
    const { plan: reconciled } = invalidatePhaseATPApprovalIfChanged({
      profile: schoolProfile,
      plan: synced,
      orderedTpIds: synced.orderedTpIds,
      tpById: localCollected.tpById,
    });
    setPhasePlan(reconciled);
    setRecommendationPreview(null);
  }, [
    schoolProfile.schoolId,
    schoolProfile.jenjang,
    schoolProfile.kelasUtama,
    schoolProfile.mataPelajaranUtama,
    schoolProfile.tahunAjaran,
    tpList,
  ]);

  const collected = useMemo(
    () => collectPhaseTPItems(schoolProfile, tpList, phasePlan.fase),
    [schoolProfile, tpList, phasePlan.fase, tpRevision]
  );

  const orderedPhaseTPs = useMemo(() => {
    const out: CustomTPItem[] = [];
    const seen = new Set<string>();
    for (const id of phasePlan.orderedTpIds) {
      const tp = collected.tpById.get(id);
      if (tp && !seen.has(id)) {
        seen.add(id);
        out.push(tp);
      }
    }
    for (const tp of collected.tpItems) {
      if (!seen.has(tp.id)) {
        seen.add(tp.id);
        out.push(tp);
      }
    }
    return out;
  }, [phasePlan.orderedTpIds, collected]);

  const graphAnalysis = useMemo(
    () =>
      analyzeATPDependencyGraph(
        orderedPhaseTPs.map((t) => t.id),
        collected.tpById,
        phasePlan.fase
      ),
    [orderedPhaseTPs, collected.tpById, phasePlan.fase]
  );

  const atpDoc = useMemo(
    () =>
      buildSmartATP(tpList, schoolProfile, {
        phasePlan,
        includeAllocationColumn: includeAllocationInDocx,
      }),
    [tpList, schoolProfile, phasePlan, includeAllocationInDocx]
  );

  const commitOrderChange = (
    nextOrderedIds: string[],
    toastMessage: string,
    savePrevious = true
  ) => {
    const { updatedPlan, updatedActiveTpList } = applyPhaseOrderAndPersist({
      profile: schoolProfile,
      currentPlan: phasePlan,
      nextOrderedTpIds: nextOrderedIds,
      activeTpList: tpList,
      savePreviousForUndo: savePrevious,
    });
    setPhasePlan(updatedPlan);
    if (onUpdateTPList) {
      onUpdateTPList(updatedActiveTpList);
    }
    onToast(toastMessage);
  };

  const handleMoveTP = (tpId: string, direction: 'up' | 'down') => {
    const currentIds = orderedPhaseTPs.map((t) => t.id);
    const nextIds = reorderTpIdsByStep(currentIds, tpId, direction);
    if (nextIds.join('|') === currentIds.join('|')) return;

    const afterAnalysis = analyzeATPDependencyGraph(nextIds, collected.tpById, phasePlan.fase);
    const movedTp = collected.tpById.get(tpId);
    const warnMsg = afterAnalysis.hasOutOfOrder
      ? `Urutan TP ${movedTp?.kode || ''} diperbarui, namun terdapat prasyarat yang berada setelah turunannya.`
      : `Urutan TP ${movedTp?.kode || ''} diperbarui tanpa mengubah ID maupun kode TP.`;
    commitOrderChange(nextIds, warnMsg, true);
  };

  const handleRequestRecommendation = () => {
    const currentIds = orderedPhaseTPs.map((t) => t.id);
    const rec = recommendATPOrder(currentIds, collected.tpById, phasePlan.fase);
    setRecommendationPreview(rec);
  };

  const handleApplyRecommendation = () => {
    if (!recommendationPreview || recommendationPreview.hasBlockingCycle) return;
    commitOrderChange(
      recommendationPreview.recommendedOrder,
      'Urutan rekomendasi ATP diterapkan.',
      true
    );
    setRecommendationPreview(null);
  };

  const handleUndoOrder = () => {
    if (!phasePlan.previousOrderedTpIds || phasePlan.previousOrderedTpIds.length === 0) return;
    const prevIds = [...phasePlan.previousOrderedTpIds];
    const { updatedPlan, updatedActiveTpList } = applyPhaseOrderAndPersist({
      profile: schoolProfile,
      currentPlan: phasePlan,
      nextOrderedTpIds: prevIds,
      activeTpList: tpList,
      savePreviousForUndo: false,
    });
    const clearedUndo = savePhaseATPPlan(schoolProfile, {
      ...updatedPlan,
      previousOrderedTpIds: undefined,
    });
    setPhasePlan(clearedUndo);
    if (onUpdateTPList) {
      onUpdateTPList(updatedActiveTpList);
    }
    onToast('Urutan ATP dikembalikan ke posisi sebelumnya.');
  };

  const commitSingleTPMutation = (
    tpId: string,
    updater: (tp: CustomTPItem) => CustomTPItem
  ) => {
    const res = updatePhaseTPItemInOriginScope({
      profile: schoolProfile,
      tpId,
      origin: collected.originByTpId.get(tpId),
      fallbackTp: collected.tpById.get(tpId),
      activeTpList: tpList,
      updater,
    });
    if (res.updatedActiveTpList && onUpdateTPList) {
      onUpdateTPList(res.updatedActiveTpList);
    } else if (res.updatedOrigin) {
      setTpRevision((r) => r + 1);
    }
  };

  const handleSavePrereqs = (targetTpId: string, nextPrereqIds: string[]) => {
    const targetTp = collected.tpById.get(targetTpId);
    if (!targetTp) return;

    const cleanedIds = Array.from(new Set(nextPrereqIds.filter((id) => id && id !== targetTpId)));
    commitSingleTPMutation(targetTpId, (item) => ({
      ...item,
      prasyaratTpIds: cleanedIds,
    }));

    const updatedMap = new Map(collected.tpById);
    updatedMap.set(targetTpId, { ...targetTp, prasyaratTpIds: cleanedIds });
    const touchedBase = savePhaseATPPlan(schoolProfile, {
      ...phasePlan,
      versi: (phasePlan.versi || 1) + 1,
    });
    const { plan: checkedPlan } = invalidatePhaseATPApprovalIfChanged({
      profile: schoolProfile,
      plan: touchedBase,
      orderedTpIds: orderedPhaseTPs.map((t) => t.id),
      tpById: updatedMap,
    });
    setPhasePlan(checkedPlan);
    onToast(`Relasi prasyarat TP ${targetTp.kode} disimpan.`);
  };

  const handleSaveAssessment = (
    tpId: string,
    bentukUtama: ATPAssessmentForm[],
    deskripsi: string,
    edited: boolean
  ) => {
    const targetTp = collected.tpById.get(tpId);
    const nextAssess = edited
      ? { bentukUtama, deskripsi, isEditedByGuru: true }
      : undefined;

    commitSingleTPMutation(tpId, (item) => ({
      ...item,
      rencanaAsesmen: nextAssess,
    }));

    if (targetTp) {
      const updatedMap = new Map(collected.tpById);
      updatedMap.set(tpId, { ...targetTp, rencanaAsesmen: nextAssess });
      const { plan: checkedPlan } = invalidatePhaseATPApprovalIfChanged({
        profile: schoolProfile,
        plan: phasePlan,
        orderedTpIds: orderedPhaseTPs.map((t) => t.id),
        tpById: updatedMap,
      });
      setPhasePlan(checkedPlan);
    }

    onToast(edited ? 'Rencana asesmen TP disimpan.' : 'Rencana asesmen dikembalikan ke rekomendasi.');
  };

  const handleUpdateAllocation = (mapping: ATPAllocationMapping) => {
    const nextPlan = allocateTPToScheduleAndPersist({
      profile: schoolProfile,
      currentPlan: phasePlan,
      allocation: mapping,
      phaseTPs: orderedPhaseTPs,
    });
    setPhasePlan(nextPlan);
    if (mapping.alokasiJP !== undefined) {
      commitSingleTPMutation(mapping.tpId, (t) => ({ ...t, alokasiJP: mapping.alokasiJP! }));
    }
    onToast('Pemetaan kelas/tahun/semester ATP disimpan.');
  };

  const approvalEval = useMemo(
    () =>
      evaluatePhaseATPApproval({
        profile: schoolProfile,
        plan: phasePlan,
        orderedTpIds: orderedPhaseTPs.map((t) => t.id),
        tpById: collected.tpById,
      }),
    [schoolProfile, phasePlan, orderedPhaseTPs, collected.tpById]
  );

  const handleToggleApproveATP = () => {
    if (approvalEval.effectiveStatus === 'disetujui') {
      const saved = savePhaseATPPlan(schoolProfile, {
        ...phasePlan,
        statusPenyusunan: 'draft',
        needsReapprovalReview: false,
        staleApprovalReasons: undefined,
        versi: (phasePlan.versi || 1) + 1,
      });
      setPhasePlan(saved);
      onToast('ATP Fase dikembalikan ke status Draf.');
      return;
    }

    const res = approvePhaseATPPlan({
      profile: schoolProfile,
      plan: phasePlan,
      orderedTpIds: orderedPhaseTPs.map((t) => t.id),
      tpById: collected.tpById,
      hasBlockingValidation:
        graphAnalysis.hasBlockingCycle ||
        graphAnalysis.hasMissingTargets ||
        graphAnalysis.hasCrossPhase,
    });
    if (!res.ok) {
      onToast(res.error || 'ATP belum dapat disetujui karena validasi prasyarat masih bermasalah.');
      return;
    }
    setPhasePlan(res.updatedPlan);
    onToast('ATP Fase disetujui guru (snapshot substansi tersimpan).');
  };

  const blockingOrWarnIssues = useMemo(
    () =>
      deduplicateATPValidationIssues(
        graphAnalysis.issues.filter((i) => i.severity !== 'info')
      ),
    [graphAnalysis.issues]
  );

  const phaseClassCount = useMemo(() => {
    const classes = new Set<string>();
    for (const it of atpDoc.items) {
      if (it.alokasiKelas) classes.add(it.alokasiKelas.trim());
    }
    return Math.max(1, classes.size);
  }, [atpDoc.items]);

  const effectiveBadgeStatus = approvalEval.effectiveStatus;
  const activePrereqTp = openPrereqTpId ? collected.tpById.get(openPrereqTpId) : undefined;
  const activeAssessTp = openAssessTpId ? collected.tpById.get(openAssessTpId) : undefined;
  const activeAssessRec = activeAssessTp
    ? recommendATPAssessmentPlan(activeAssessTp, schoolProfile.mataPelajaranUtama)
    : null;

  return (
    <div key="atp">
      {/* Header & Ringkasan Identitas ATP Fase */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <Table2 size={16} color="#2563eb" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
              Alur Tujuan Pembelajaran (ATP) Tingkat Fase
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background:
                  effectiveBadgeStatus === 'disetujui'
                    ? '#f0fdf4'
                    : effectiveBadgeStatus === 'perlu_ditinjau'
                    ? '#fff7ed'
                    : '#fffbeb',
                border:
                  effectiveBadgeStatus === 'disetujui'
                    ? '1px solid #86efac'
                    : effectiveBadgeStatus === 'perlu_ditinjau'
                    ? '1px solid #fb923c'
                    : '1px solid #fcd34d',
                color:
                  effectiveBadgeStatus === 'disetujui'
                    ? '#166534'
                    : effectiveBadgeStatus === 'perlu_ditinjau'
                    ? '#9a3412'
                    : '#92400e',
              }}
            >
              {effectiveBadgeStatus === 'disetujui'
                ? 'Disetujui Guru'
                : effectiveBadgeStatus === 'perlu_ditinjau'
                ? 'Perlu Ditinjau Ulang'
                : 'Draf'}{' '}
              · v{phasePlan.versi || 1}
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>
            ATP {atpDoc.mataPelajaran} — {atpDoc.jenjangFase}
          </h2>
          <p className="tabular-nums" style={{ fontSize: 12.5, color: '#475569', marginTop: 3 }}>
            <strong>Total ATP Fase ({orderedPhaseTPs.length} TP · {phaseClassCount} kelas): {atpDoc.totalJP} JP</strong> •{' '}
            Semester 1 (seluruh kelas dalam fase): {atpDoc.totalJPPerSemester?.semester1 ?? 0} JP · Semester 2 (seluruh kelas dalam fase):{' '}
            {atpDoc.totalJPPerSemester?.semester2 ?? 0} JP • TA {atpDoc.tahunAjaran}
          </p>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
            Cakupan JP ATP menghitung seluruh kelas dalam fase, sedangkan Prota &amp; Promes menghitung TP kelas aktif (Kelas {schoolProfile.kelasUtama}).
          </div>
          {atpDoc.referensiCP && (
            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
              <strong>Referensi CP:</strong>{' '}
              {atpDoc.referensiCP.nomorDokumen || atpDoc.referensiCP.sumber} (
              {resolveCPStatusLabel(
                atpDoc.referensiCP.statusVerifikasi,
                atpDoc.referensiCP.terverifikasiResmi,
                atpDoc.referensiCP.asalCP
              )}
              )
            </div>
          )}
        </div>

        <div className="no-print" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleRequestRecommendation}
          >
            <Sparkles size={13} aria-hidden="true" /> Rekomendasikan Urutan ATP
          </button>
          {phasePlan.previousOrderedTpIds && phasePlan.previousOrderedTpIds.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleUndoOrder}
            >
              <RotateCcw size={13} aria-hidden="true" /> Kembalikan ke Urutan Sebelumnya
            </button>
          )}
          <button
            type="button"
            className={`btn btn-sm ${showAllocationPanel ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowAllocationPanel((prev) => !prev)}
          >
            <Calendar size={13} aria-hidden="true" />{' '}
            {showAllocationPanel ? 'Tutup Pemetaan Semester' : 'Pemetaan Kelas & Semester'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleToggleApproveATP}
          >
            <CheckCircle2 size={13} aria-hidden="true" />{' '}
            {effectiveBadgeStatus === 'disetujui'
              ? 'Ubah ke Draf'
              : effectiveBadgeStatus === 'perlu_ditinjau'
              ? 'Setujui Ulang ATP'
              : 'Setujui ATP'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!requireActiveLicenseForAction('mencetak dokumen ATP')) return;
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
                const ok = await exportATPToDocx(atpDoc, schoolProfile);
                if (ok) {
                  onToast('File Word ATP (.docx) berhasil diunduh!');
                }
              } catch (e: any) {
                alert('Gagal mengunduh: ' + e.message);
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Download size={14} aria-hidden="true" /> Unduh ATP (.docx)
          </button>
        </div>
      </div>

      {/* Pilihan Ekspor Pemetaan */}
      <div className="no-print" style={{ marginBottom: 10, fontSize: 12, color: '#475569' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeAllocationInDocx}
            onChange={(e) => setIncludeAllocationInDocx(e.target.checked)}
          />
          Sertakan kolom pemetaan Kelas / Tahun Ajaran / Semester pada file Word ATP (.docx)
        </label>
      </div>

      {/* CP Fase */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 12,
          fontSize: 12.5,
          color: '#334155',
          lineHeight: 1.55,
          whiteSpace: 'pre-line',
        }}
      >
        <strong style={{ color: '#172033', display: 'block', marginBottom: 3 }}>
          Capaian Pembelajaran (CP) Fase
        </strong>
        {atpDoc.capaianPembelajaranFase}
      </div>

      {/* Peringatan Persetujuan Kedaluwarsa / Perlu Ditinjau Ulang */}
      {effectiveBadgeStatus === 'perlu_ditinjau' && (
        <div
          role="alert"
          style={{
            background: '#fff7ed',
            border: '1.5px solid #fb923c',
            color: '#9a3412',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 12.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: '1 1 280px' }}>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <AlertTriangle size={15} aria-hidden="true" />
                Perlu Ditinjau Ulang — Persetujuan ATP Sebelumnya Tidak Lagi Berlaku
              </strong>
              <p style={{ margin: '0 0 6px', lineHeight: 1.45 }}>
                Isi TP, prasyarat, atau pemetaan ATP telah berubah setelah persetujuan terakhir. Tinjau kembali dokumen dan lakukan persetujuan ulang sebelum digunakan sebagai ATP final.
              </p>
              {approvalEval.reasons.length > 0 && (
                <ul style={{ margin: '0 0 0 18px', padding: 0, fontSize: 12 }}>
                  {approvalEval.reasons.map((r, rIdx) => (
                    <li key={rIdx}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary no-print"
              onClick={handleToggleApproveATP}
            >
              <CheckCircle2 size={13} aria-hidden="true" /> Setujui Ulang ATP
            </button>
          </div>
        </div>
      )}

      {/* Validasi Graf Prasyarat & Kapasitas */}
      {blockingOrWarnIssues.length > 0 && (
        <div
          className="no-print"
          style={{
            background: graphAnalysis.hasBlockingCycle ? '#fef2f2' : '#fffbeb',
            border: graphAnalysis.hasBlockingCycle ? '1px solid #fca5a5' : '1px solid #fcd34d',
            color: graphAnalysis.hasBlockingCycle ? '#991b1b' : '#92400e',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <AlertTriangle size={14} aria-hidden="true" />
            Peringatan Struktur Prasyarat &amp; Alur ATP:
          </strong>
          <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
            {blockingOrWarnIssues.map((iss) => (
              <li key={iss.id}>{iss.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pratinjau Rekomendasi Urutan ATP */}
      {recommendationPreview && (
        <div
          className="no-print"
          style={{
            background: '#eff6ff',
            border: '1.5px solid #2563eb',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 14,
            fontSize: 12.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <strong style={{ color: '#1e3a8a' }}>Pratinjau Perubahan Urutan Rekomendasi ATP</strong>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setRecommendationPreview(null)}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={recommendationPreview.hasBlockingCycle}
                onClick={handleApplyRecommendation}
              >
                Terapkan Urutan Rekomendasi
              </button>
            </div>
          </div>

          <p style={{ margin: '0 0 8px', color: '#1e293b' }}>
            {recommendationPreview.blockingReason || recommendationPreview.summaryMessage}
          </p>

          {!recommendationPreview.hasBlockingCycle && recommendationPreview.changes.length > 0 && (
            <div className="ws-two-col" style={{ gap: 10, background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #bfdbfe' }}>
              <div>
                <strong style={{ fontSize: 11.5, color: '#64748b' }}>Urutan Awal:</strong>
                <ol style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12 }}>
                  {recommendationPreview.currentOrder.map((id) => {
                    const tp = collected.tpById.get(id);
                    return (
                      <li key={id}>
                        TP {tp?.kode} — {tp?.materiPokok}
                      </li>
                    );
                  })}
                </ol>
              </div>
              <div>
                <strong style={{ fontSize: 11.5, color: '#1d4ed8' }}>Urutan Rekomendasi:</strong>
                <ol style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12 }}>
                  {recommendationPreview.recommendedOrder.map((id) => {
                    const tp = collected.tpById.get(id);
                    const ch = recommendationPreview.changes.find((c) => c.tpId === id);
                    return (
                      <li key={id}>
                        TP {tp?.kode} — {tp?.materiPokok}
                        {ch && (
                          <span style={{ color: '#1d4ed8', fontSize: 11 }}>
                            {' '}
                            ({ch.reason})
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lapisan 2: Pemetaan Kelas/Tahun Ajaran/Semester */}
      {showAllocationPanel && (
        <ATPAllocationPanel
          schoolProfile={schoolProfile}
          phasePlan={phasePlan}
          orderedTPs={orderedPhaseTPs}
          totalJPPerSemester={atpDoc.totalJPPerSemester}
          kapasitasJPPerSemester={atpDoc.kapasitasJPPerSemester}
          onUpdateAllocation={handleUpdateAllocation}
        />
      )}

      {/* Tabel Utama ATP dengan Reorder, Prasyarat, Indikator & Rencana Asesmen */}
      <div className="ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th style={{ width: '7%', textAlign: 'center' }}>Urutan</th>
              <th style={{ width: '7%', textAlign: 'center' }}>Kode</th>
              <th style={{ width: '16%', textAlign: 'left' }}>Kompetensi &amp; Elemen</th>
              <th style={{ width: '14%', textAlign: 'left' }}>Lingkup Materi</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Tujuan Pembelajaran</th>
              <th style={{ width: '12%', textAlign: 'left' }}>Prasyarat</th>
              <th style={{ width: '12%', textAlign: 'left' }}>Indikator Ketercapaian</th>
              <th style={{ width: '10%', textAlign: 'left' }}>Rencana Asesmen</th>
              <th style={{ width: '5%', textAlign: 'center' }}>JP</th>
            </tr>
          </thead>
          <tbody>
            {atpDoc.items.map((it, idx) => {
              const tpId = it.tpId || `idx_${idx}`;
              const tpObj = collected.tpById.get(tpId);
              const tpIssues = (graphAnalysis.issuesByTpId[tpId] || []).filter(
                (iss) => iss.severity !== 'info'
              );
              const dependents = graphAnalysis.dependentsMap[tpId] || [];

              return (
                <React.Fragment key={tpId}>
                  <tr>
                    <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{it.no}</div>
                      {tpObj && (
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
                          <button
                            type="button"
                            aria-label={`Naikkan urutan TP ${it.kodeTP}`}
                            title="Naikkan urutan"
                            disabled={idx === 0}
                            onClick={() => handleMoveTP(tpObj.id, 'up')}
                            style={{
                              padding: '2px 4px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              opacity: idx === 0 ? 0.4 : 1,
                            }}
                          >
                            <ArrowUp size={12} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Turunkan urutan TP ${it.kodeTP}`}
                            title="Turunkan urutan"
                            disabled={idx === atpDoc.items.length - 1}
                            onClick={() => handleMoveTP(tpObj.id, 'down')}
                            style={{
                              padding: '2px 4px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              cursor: idx === atpDoc.items.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: idx === atpDoc.items.length - 1 ? 0.4 : 1,
                            }}
                          >
                            <ArrowDown size={12} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8', verticalAlign: 'top' }}>
                      <div>{it.kodeTP}</div>
                      {it.alokasiSemester && (
                        <div style={{ fontSize: 10.5, fontWeight: 500, color: '#64748b', marginTop: 2 }}>
                          Kls {it.alokasiKelas} · {it.alokasiSemester.startsWith('2') ? 'Sem 2' : 'Sem 1'}
                        </div>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', marginBottom: 2 }}>
                        {it.elemen}
                      </div>
                      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.45 }}>
                        {it.kompetensi || it.tujuanPembelajaran}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#172033', verticalAlign: 'top' }}>
                      {it.lingkupMateri}
                    </td>
                    <td style={{ color: '#334155', lineHeight: 1.5, verticalAlign: 'top' }}>
                      {it.tujuanPembelajaran}
                    </td>
                    <td style={{ fontSize: 11.5, verticalAlign: 'top' }}>
                      {it.prasyaratKodeLabels && it.prasyaratKodeLabels.length > 0 && (
                        <div style={{ marginBottom: 3 }}>
                          <strong style={{ color: '#1e3a8a' }}>Prasyarat TP:</strong>{' '}
                          {it.prasyaratKodeLabels.join(', ')}
                        </div>
                      )}
                      {it.deskripsiPrasyarat && it.deskripsiPrasyarat.length > 0 && (
                        <div style={{ color: '#475569', marginBottom: 3 }}>
                          {it.deskripsiPrasyarat.join('; ')}
                        </div>
                      )}
                      {dependents.length > 0 && (
                        <div style={{ fontSize: 11, color: '#0369a1' }}>
                          Prasyarat bagi:{' '}
                          {dependents.map((d) => collected.tpById.get(d)?.kode || d).join(', ')}
                        </div>
                      )}
                      {tpIssues.length > 0 && (
                        <div style={{ color: '#b91c1c', fontWeight: 600, marginTop: 3 }}>
                          {tpIssues.map((iss) => iss.message).join(' ')}
                        </div>
                      )}
                      {tpObj && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline no-print"
                          style={{ fontSize: 11, padding: '2px 7px', marginTop: 4 }}
                          onClick={() => {
                            setOpenAssessTpId(null);
                            setOpenPrereqTpId(openPrereqTpId === tpObj.id ? null : tpObj.id);
                          }}
                        >
                          <GitBranch size={11} aria-hidden="true" /> Atur Prasyarat
                        </button>
                      )}
                    </td>
                    <td style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.45, verticalAlign: 'top' }}>
                      {it.buktiKetercapaianList && it.buktiKetercapaianList.length > 0 ? (
                        <ul style={{ margin: '0 0 0 14px', padding: 0 }}>
                          {it.buktiKetercapaianList.map((b, bIdx) => (
                            <li key={bIdx}>{b}</li>
                          ))}
                        </ul>
                      ) : (
                        it.indikatorKetercapaian
                      )}
                    </td>
                    <td style={{ fontSize: 11.5, color: '#334155', verticalAlign: 'top' }}>
                      {it.bentukAsesmen && it.bentukAsesmen.length > 0 && (
                        <div style={{ fontWeight: 700, color: '#166534', marginBottom: 2 }}>
                          {it.bentukAsesmen.join(', ')}
                        </div>
                      )}
                      <div>{it.asesmen}</div>
                      {tpObj && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline no-print"
                          style={{ fontSize: 11, padding: '2px 7px', marginTop: 4 }}
                          onClick={() => {
                            setOpenPrereqTpId(null);
                            setOpenAssessTpId(openAssessTpId === tpObj.id ? null : tpObj.id);
                          }}
                        >
                          <Edit3 size={11} aria-hidden="true" /> Edit Asesmen
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#172033', verticalAlign: 'top' }}>
                      {it.alokasiJP}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Responsif Editor Prasyarat & Asesmen (di luar .ws-table-wrap agar bebas clipping di mobile) */}
      {activePrereqTp && (
        <TPPrerequisiteEditor
          tp={activePrereqTp}
          allPhaseTPs={orderedPhaseTPs}
          dependents={graphAnalysis.dependentsMap[activePrereqTp.id] || []}
          tpById={collected.tpById}
          onSavePrereqs={handleSavePrereqs}
          onClose={() => setOpenPrereqTpId(null)}
        />
      )}

      {activeAssessTp && activeAssessRec && (
        <TPAssessmentEditor
          tp={activeAssessTp}
          currentBentuk={activeAssessRec.bentukUtama}
          currentDeskripsi={activeAssessRec.deskripsi}
          onSaveAssessment={handleSaveAssessment}
          onClose={() => setOpenAssessTpId(null)}
        />
      )}
    </div>
  );
};
