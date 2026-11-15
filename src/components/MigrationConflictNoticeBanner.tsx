import React, { useState } from 'react';
import { AlertTriangle, Check, Trash2, Users } from 'lucide-react';
import type { CustomTPItem, SchoolProfile } from '../utils/schoolProfileStorage';
import {
  resolveAmbiguousLegacyDraft,
  resolveLegacyRosterConflict,
  type AmbiguousLegacyDraftItem,
  type LegacyRosterConflictItem,
} from '../utils/storageMigration';

interface MigrationConflictNoticeBannerProps {
  schoolProfile: SchoolProfile;
  tpList: CustomTPItem[];
  ambiguousDrafts: AmbiguousLegacyDraftItem[];
  rosterConflicts: LegacyRosterConflictItem[];
  onResolved: () => void;
  onToast: (msg: string) => void;
}

export const MigrationConflictNoticeBanner: React.FC<
  MigrationConflictNoticeBannerProps
> = ({
  schoolProfile,
  tpList,
  ambiguousDrafts,
  rosterConflicts,
  onResolved,
  onToast,
}) => {
  const [selectedTPByDraft, setSelectedTPByDraft] = useState<Record<string, string>>({});

  if (ambiguousDrafts.length === 0 && rosterConflicts.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Verifikasi Data Migrasi Lama"
      className="no-print"
      style={{
        background: '#eff6ff',
        border: '1px solid #93c5fd',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <AlertTriangle
          size={18}
          color="#1d4ed8"
          style={{ flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e3a8a' }}>
            Ditemukan data versi lama yang memerlukan verifikasi tujuan
          </div>
          <div style={{ fontSize: 12.5, color: '#1e40af', lineHeight: 1.5, marginTop: 2 }}>
            Demi menjaga isolasi antar mata pelajaran dan kelas, sistem tidak memasangkan data lama yang ambigu secara otomatis. Data asli tetap tersimpan utuh di cadangan migrasi sampai Anda menentukan tujuannya.
          </div>
        </div>
      </div>

      {rosterConflicts.map((conflict) => (
        <div
          key={conflict.id}
          style={{
            background: '#ffffff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="#2563eb" aria-hidden="true" />
            <span>
              Konflik Roster Lintas Mapel — Kelas {conflict.kelas} ({conflict.rombel}) · TA {conflict.tahunAjaran}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {conflict.candidates.map((cand) => (
              <button
                key={cand.legacyKey}
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  const ok = resolveLegacyRosterConflict(conflict.id, cand.legacyKey, schoolProfile);
                  if (ok) {
                    onResolved();
                    onToast(
                      `Roster ${cand.mataPelajaran} (${cand.studentCount} siswa) ditetapkan sebagai roster kelas ${conflict.rombel}.`
                    );
                  }
                }}
              >
                <Check size={13} aria-hidden="true" />
                <span>
                  Pakai roster {cand.mataPelajaran} ({cand.studentCount} siswa: {cand.sampleNames.join(', ')})
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {ambiguousDrafts.map((item) => {
        const defaultTPId = tpList[0]?.id || '';
        const chosenTPId = selectedTPByDraft[item.legacyKey] || defaultTPId;
        const chosenTP = tpList.find((t) => t.id === chosenTPId) || tpList[0];

        return (
          <div
            key={item.legacyKey}
            style={{
              background: '#ffffff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ flex: '1 1 280px', minWidth: 220 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                {item.kind === 'modul_ajar' ? 'Draf Modul Ajar Lama' : 'Draf LKPD Lama'}: {item.previewTitle}
              </div>
              <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                Kode: {item.detectedKode || '-'} · Varian: {item.modelOrPreset}
                {item.detectedMapel ? ` · Mapel tercatat: ${item.detectedMapel}` : ''}
              </div>
              <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 2 }}>
                {item.reason}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {tpList.length > 0 && (
                <>
                  <select
                    aria-label={`Pilih TP tujuan untuk ${item.previewTitle}`}
                    className="form-select form-select-sm"
                    value={chosenTPId}
                    onChange={(e) =>
                      setSelectedTPByDraft((prev) => ({
                        ...prev,
                        [item.legacyKey]: e.target.value,
                      }))
                    }
                    style={{ maxWidth: 240, fontSize: 12 }}
                  >
                    {tpList.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {schoolProfile.mataPelajaranUtama} · TP {tp.kode} ({tp.materiPokok})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      if (!chosenTP) return;
                      const ok = resolveAmbiguousLegacyDraft(
                        item.legacyKey,
                        'attach',
                        schoolProfile,
                        chosenTP
                      );
                      if (ok) {
                        onResolved();
                        onToast(
                          `Draf dipulihkan ke ${schoolProfile.mataPelajaranUtama} TP ${chosenTP.kode}.`
                        );
                      }
                    }}
                  >
                    <Check size={13} aria-hidden="true" />
                    <span>Pulihkan ke TP ini</span>
                  </button>
                </>
              )}

              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ color: '#64748b' }}
                onClick={() => {
                  const ok = resolveAmbiguousLegacyDraft(item.legacyKey, 'discard');
                  if (ok) {
                    onResolved();
                    onToast('Draf lama ditandai tidak dipakai di ruang kerja aktif.');
                  }
                }}
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>Abaikan</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
