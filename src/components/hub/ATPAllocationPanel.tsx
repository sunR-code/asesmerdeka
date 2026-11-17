import React from 'react';
import { AlertTriangle, Calendar, GitBranch, Layers } from 'lucide-react';
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
  onTogglePrereq: (targetTpId: string, prereqTpId: string) => void;
  onClose: () => void;
}

export const TPPrerequisiteEditor: React.FC<TPPrerequisiteEditorProps> = ({
  tp,
  allPhaseTPs,
  dependents,
  tpById,
  onTogglePrereq,
  onClose,
}) => {
  const selectedIds = new Set(tp.prasyaratTpIds || []);
  const otherTPs = allPhaseTPs.filter((item) => item.id !== tp.id);

  return (
    <div
      className="no-print"
      style={{
        marginTop: 8,
        padding: '10px 12px',
        background: '#f8fafc',
        border: '1px solid #93c5fd',
        borderRadius: 8,
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong style={{ color: '#1e3a8a', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <GitBranch size={13} aria-hidden="true" /> Relasi Prasyarat Antar-TP untuk TP {tp.kode}
        </strong>
        <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: 11, padding: '2px 8px' }} onClick={onClose}>
          Tutup
        </button>
      </div>

      {tp.prasyarat && tp.prasyarat.length > 0 && (
        <div style={{ marginBottom: 6, color: '#475569' }}>
          <strong>Deskripsi prasyarat bebas (tetap dipertahankan):</strong> {tp.prasyarat.join('; ')}
        </div>
      )}

      {dependents.length > 0 && (
        <div style={{ marginBottom: 6, color: '#0369a1' }}>
          <strong>TP yang bergantung pada TP {tp.kode}:</strong>{' '}
          {dependents.map((did) => tpById.get(did)?.kode || did).join(', ')}
        </div>
      )}

      {otherTPs.length === 0 ? (
        <div style={{ color: '#64748b' }}>Belum ada TP lain pada fase ini untuk dijadikan prasyarat.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {otherTPs.map((cand) => (
            <label
              key={cand.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 6px',
                background: selectedIds.has(cand.id) ? '#eff6ff' : '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(cand.id)}
                onChange={() => onTogglePrereq(tp.id, cand.id)}
              />
              <span>
                <strong>TP {cand.kode}</strong> — {cand.materiPokok}
              </span>
            </label>
          ))}
        </div>
      )}
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

  const toggleForm = (form: ATPAssessmentForm) => {
    setSelectedForms((prev) =>
      prev.includes(form) ? prev.filter((f) => f !== form) : [...prev, form]
    );
  };

  return (
    <div
      className="no-print"
      style={{
        marginTop: 8,
        padding: '10px 12px',
        background: '#f8fafc',
        border: '1px solid #86efac',
        borderRadius: 8,
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong style={{ color: '#166534' }}>Sunting Rencana Asesmen — TP {tp.kode}</strong>
        <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: 11, padding: '2px 8px' }} onClick={onClose}>
          Batal
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {ATP_ASSESSMENT_FORMS.map((form) => (
          <label
            key={form}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 7px',
              background: selectedForms.includes(form) ? '#dcfce7' : '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11.5,
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
      <textarea
        className="form-textarea"
        rows={2}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          style={{ fontSize: 11 }}
          onClick={() => {
            onSaveAssessment(tp.id, [], '', false);
            onClose();
          }}
        >
          Kembalikan ke Rekomendasi
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          style={{ fontSize: 11 }}
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
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            {sem1Overflow
              ? `Semester 1: ${totalJPPerSemester?.semester1} JP melebihi kapasitas kalender (${kapasitasJPPerSemester?.semester1} JP). `
              : ''}
            {sem2Overflow
              ? `Semester 2: ${totalJPPerSemester?.semester2} JP melebihi kapasitas kalender (${kapasitasJPPerSemester?.semester2} JP).`
              : ''}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {orderedTPs.map((tp) => {
          const alloc = allocMap.get(tp.id) || {
            tpId: tp.id,
            tahunAjaran: schoolProfile.tahunAjaran,
            kelas: schoolProfile.kelasUtama,
            semester: schoolProfile.semester,
            alokasiJP: tp.alokasiJP,
          };

          return (
            <div
              key={tp.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 110px 95px 135px 80px',
                gap: 8,
                alignItems: 'center',
                background: '#ffffff',
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <strong style={{ color: '#1d4ed8' }}>TP {tp.kode}</strong>{' '}
                <span style={{ color: '#0f172a' }}>{tp.materiPokok}</span>
              </div>
              <input
                type="text"
                className="form-input"
                aria-label={`Tahun ajaran TP ${tp.kode}`}
                value={alloc.tahunAjaran}
                onChange={(e) => onUpdateAllocation({ ...alloc, tahunAjaran: e.target.value })}
              />
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
