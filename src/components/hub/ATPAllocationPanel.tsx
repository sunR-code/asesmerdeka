import React from 'react';
import { AlertTriangle, Calendar, GitBranch, Layers, X } from 'lucide-react';
import { ATP_ASSESSMENT_FORMS, type ATPAssessmentForm } from '../../utils/atpSequencingEngine';
import {
  listGradeLevelsInFase,
  type ATPAllocationMapping,
  type PhaseATPPlan,
} from '../../utils/atpStorage';
import type { CustomTPItem, SchoolProfile } from '../../utils/schoolProfileStorage';

interface TPPrerequisiteEditorProps {
  tp: CustomTPItem;
  allPhaseTPs: CustomTPItem[];
  dependents: string[];
  tpById: Map<string, CustomTPItem>;
  onSavePrereqs: (targetTpId: string, prereqTpIds: string[]) => void;
  onClose: () => void;
}

export const TPPrerequisiteEditor: React.FC<TPPrerequisiteEditorProps> = ({
  tp,
  allPhaseTPs,
  dependents,
  tpById,
  onSavePrereqs,
  onClose,
}) => {
  const [draftSelectedIds, setDraftSelectedIds] = React.useState<string[]>(() =>
    Array.isArray(tp.prasyaratTpIds) ? tp.prasyaratTpIds : []
  );

  React.useEffect(() => {
    setDraftSelectedIds(Array.isArray(tp.prasyaratTpIds) ? tp.prasyaratTpIds : []);
  }, [tp.id, tp.prasyaratTpIds]);

  const selectedSet = new Set(draftSelectedIds);
  const otherTPs = allPhaseTPs.filter((item) => item.id !== tp.id);

  const toggleCandidate = (candId: string) => {
    setDraftSelectedIds((prev) =>
      prev.includes(candId) ? prev.filter((id) => id !== candId) : [...prev, candId]
    );
  };

  return (
    <div
      className="modal-overlay no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`prereq-modal-title-${tp.id}`}
    >
      <div className="modal-content atp-modal-dialog">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 10,
            paddingBottom: 10,
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <strong
              id={`prereq-modal-title-${tp.id}`}
              style={{
                color: '#1e3a8a',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
              }}
            >
              <GitBranch size={15} aria-hidden="true" /> Atur Prasyarat — TP {tp.kode}
            </strong>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2, wordBreak: 'break-word' }}>
              {tp.materiPokok}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            aria-label="Tutup editor prasyarat"
            style={{ fontSize: 11.5, padding: '4px 9px', flexShrink: 0 }}
            onClick={onClose}
          >
            <X size={13} aria-hidden="true" /> Tutup
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '10px 2px', flex: 1, minHeight: 0, fontSize: 12.5 }}>
          {tp.prasyarat && tp.prasyarat.length > 0 && (
            <div
              style={{
                marginBottom: 8,
                padding: '7px 10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                color: '#475569',
              }}
            >
              <strong>Deskripsi prasyarat bebas (tetap dipertahankan):</strong>{' '}
              {tp.prasyarat.join('; ')}
            </div>
          )}

          {dependents.length > 0 && (
            <div
              style={{
                marginBottom: 8,
                padding: '7px 10px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 6,
                color: '#0369a1',
              }}
            >
              <strong>TP yang bergantung pada TP {tp.kode}:</strong>{' '}
              {dependents.map((did) => tpById.get(did)?.kode || did).join(', ')}
            </div>
          )}

          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 6 }}>
            Pilih TP dalam fase yang sama yang menjadi prasyarat sebelum mempelajari TP {tp.kode}:
          </div>

          {otherTPs.length === 0 ? (
            <div style={{ color: '#64748b', padding: '8px 0' }}>
              Belum ada TP lain pada fase ini untuk dijadikan prasyarat.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {otherTPs.map((cand) => (
                <label
                  key={cand.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '7px 9px',
                    background: selectedSet.has(cand.id) ? '#eff6ff' : '#ffffff',
                    border: selectedSet.has(cand.id) ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                    borderRadius: 7,
                    cursor: 'pointer',
                    minWidth: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ marginTop: 2, flexShrink: 0 }}
                    checked={selectedSet.has(cand.id)}
                    onChange={() => toggleCandidate(cand.id)}
                  />
                  <span style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                    <strong style={{ color: '#1d4ed8' }}>TP {cand.kode}</strong> — {cand.materiPokok}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            flexWrap: 'wrap',
            paddingTop: 10,
            borderTop: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>
            Tutup
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              onSavePrereqs(tp.id, draftSelectedIds);
              onClose();
            }}
          >
            Simpan Prasyarat
          </button>
        </div>
      </div>
    </div>
  );
};

interface TPAssessmentEditorProps {
  tp: CustomTPItem;
  currentBentuk: ATPAssessmentForm[];
  currentDeskripsi: string;
  onSaveAssessment: (tpId: string, bentuk: ATPAssessmentForm[], deskripsi: string, edited: boolean) => void;
  onClose: () => void;
}

export const TPAssessmentEditor: React.FC<TPAssessmentEditorProps> = ({
  tp,
  currentBentuk,
  currentDeskripsi,
  onSaveAssessment,
  onClose,
}) => {
  const [selectedForms, setSelectedForms] = React.useState<ATPAssessmentForm[]>(currentBentuk);
  const [desc, setDesc] = React.useState(currentDeskripsi);

  React.useEffect(() => {
    setSelectedForms(currentBentuk);
    setDesc(currentDeskripsi);
  }, [tp.id, currentBentuk, currentDeskripsi]);

  const toggleForm = (form: ATPAssessmentForm) => {
    setSelectedForms((prev) =>
      prev.includes(form) ? prev.filter((f) => f !== form) : [...prev, form]
    );
  };

  return (
    <div
      className="modal-overlay no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`assess-modal-title-${tp.id}`}
    >
      <div className="modal-content atp-modal-dialog">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 10,
            paddingBottom: 10,
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <strong id={`assess-modal-title-${tp.id}`} style={{ color: '#166534', fontSize: 14 }}>
              Sunting Rencana Asesmen — TP {tp.kode}
            </strong>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2, wordBreak: 'break-word' }}>
              {tp.materiPokok}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            aria-label="Tutup editor asesmen"
            style={{ fontSize: 11.5, padding: '4px 9px', flexShrink: 0 }}
            onClick={onClose}
          >
            <X size={13} aria-hidden="true" /> Tutup
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '10px 2px', flex: 1, minHeight: 0, fontSize: 12.5 }}>
          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 6 }}>
            Pilih bentuk asesmen utama:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {ATP_ASSESSMENT_FORMS.map((form) => (
              <label
                key={form}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 8px',
                  background: selectedForms.includes(form) ? '#dcfce7' : '#ffffff',
                  border: selectedForms.includes(form) ? '1px solid #4ade80' : '1px solid #cbd5e1',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedForms.includes(form)}
                  onChange={() => toggleForm(form)}
                />
                {form}
              </label>
            ))}
          </div>

          <label
            htmlFor={`assess-desc-${tp.id}`}
            style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}
          >
            Deskripsi Rencana Asesmen:
          </label>
          <textarea
            id={`assess-desc-${tp.id}`}
            className="form-textarea"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            paddingTop: 10,
            borderTop: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              onSaveAssessment(tp.id, [], '', false);
              onClose();
            }}
          >
            Kembalikan ke Rekomendasi
          </button>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                onSaveAssessment(
                  tp.id,
                  selectedForms.length > 0 ? selectedForms : ['Observasi'],
                  desc.trim() || currentDeskripsi,
                  true
                );
                onClose();
              }}
            >
              Simpan Rencana Asesmen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ATPAllocationPanelProps {
  schoolProfile: SchoolProfile;
  phasePlan: PhaseATPPlan;
  orderedTPs: CustomTPItem[];
  totalJPPerSemester?: { semester1: number; semester2: number };
  kapasitasJPPerSemester?: { semester1: number; semester2: number };
  onUpdateAllocation: (mapping: ATPAllocationMapping) => void;
}

export const ATPAllocationPanel: React.FC<ATPAllocationPanelProps> = ({
  schoolProfile,
  phasePlan,
  orderedTPs,
  totalJPPerSemester,
  kapasitasJPPerSemester,
  onUpdateAllocation,
}) => {
  const gradeOptions = listGradeLevelsInFase(schoolProfile.jenjang, phasePlan.fase);
  const allocMap = new Map<string, ATPAllocationMapping>();
  phasePlan.allocations.forEach((a) => allocMap.set(a.tpId, a));

  const sem1Overflow =
    Boolean(kapasitasJPPerSemester?.semester1) &&
    (totalJPPerSemester?.semester1 || 0) > (kapasitasJPPerSemester?.semester1 || 0);
  const sem2Overflow =
    Boolean(kapasitasJPPerSemester?.semester2) &&
    (totalJPPerSemester?.semester2 || 0) > (kapasitasJPPerSemester?.semester2 || 0);

  return (
    <div
      className="no-print"
      style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 14,
        fontSize: 12.5,
        boxSizing: 'border-box',
        maxWidth: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <strong style={{ color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color="#2563eb" aria-hidden="true" />
          Lapisan 2 — Pemetaan ATP Fase ke Tahun Ajaran, Kelas, Semester &amp; JP
        </strong>
        <span style={{ fontSize: 11.5, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Layers size={12} aria-hidden="true" /> Mengubah pemetaan tidak memutus urutan ATP Fase
        </span>
      </div>

      {(sem1Overflow || sem2Overflow) && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#92400e',
            borderRadius: 8,
            padding: '7px 10px',
            marginBottom: 10,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>
            {sem1Overflow
              ? `Semester 1 (seluruh kelas dalam fase): ${totalJPPerSemester?.semester1} JP melebihi kapasitas kalender (${kapasitasJPPerSemester?.semester1} JP). `
              : ''}
            {sem2Overflow
              ? `Semester 2 (seluruh kelas dalam fase): ${totalJPPerSemester?.semester2} JP melebihi kapasitas kalender (${kapasitasJPPerSemester?.semester2} JP).`
              : ''}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orderedTPs.map((tp) => {
          const alloc = allocMap.get(tp.id) || {
            tpId: tp.id,
            tahunAjaran: schoolProfile.tahunAjaran,
            kelas: schoolProfile.kelasUtama,
            semester: schoolProfile.semester,
            alokasiJP: tp.alokasiJP,
          };

          return (
            <div key={tp.id} className="atp-alloc-row">
              <div className="atp-alloc-tp-label">
                <strong style={{ color: '#1d4ed8' }}>TP {tp.kode}</strong>{' '}
                <span style={{ color: '#0f172a' }}>{tp.materiPokok}</span>
              </div>
              <div className="atp-alloc-fields">
                <label className="atp-alloc-field">
                  <span className="atp-alloc-field-label">Tahun Ajaran</span>
                  <input
                    type="text"
                    className="form-input"
                    aria-label={`Tahun ajaran TP ${tp.kode}`}
                    value={alloc.tahunAjaran}
                    onChange={(e) => onUpdateAllocation({ ...alloc, tahunAjaran: e.target.value })}
                  />
                </label>
                <label className="atp-alloc-field">
                  <span className="atp-alloc-field-label">Kelas</span>
                  <select
                    className="form-input"
                    aria-label={`Kelas TP ${tp.kode}`}
                    value={gradeOptions.includes(alloc.kelas) ? alloc.kelas : gradeOptions[0]}
                    onChange={(e) => onUpdateAllocation({ ...alloc, kelas: e.target.value })}
                  >
                    {gradeOptions.map((g) => (
                      <option key={g} value={g}>
                        Kelas {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="atp-alloc-field">
                  <span className="atp-alloc-field-label">Semester</span>
                  <select
                    className="form-input"
                    aria-label={`Semester TP ${tp.kode}`}
                    value={alloc.semester}
                    onChange={(e) =>
                      onUpdateAllocation({
                        ...alloc,
                        semester: e.target.value as '1 (Ganjil)' | '2 (Genap)',
                      })
                    }
                  >
                    <option value="1 (Ganjil)">1 (Ganjil)</option>
                    <option value="2 (Genap)">2 (Genap)</option>
                  </select>
                </label>
                <label className="atp-alloc-field">
                  <span className="atp-alloc-field-label">Alokasi JP</span>
                  <input
                    type="number"
                    min={1}
                    aria-label={`Alokasi JP TP ${tp.kode}`}
                    className="form-input"
                    value={alloc.alokasiJP ?? tp.alokasiJP}
                    onChange={(e) =>
                      onUpdateAllocation({
                        ...alloc,
                        alokasiJP: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
