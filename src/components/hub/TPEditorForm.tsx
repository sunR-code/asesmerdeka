import React from 'react';
import { Check, Edit3, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { analyzeTPMeasurability } from '../../utils/kkoHelper';
import { cpEntryToReferenceMeta, resolveCPStatusLabel, type SavedCPEntry } from '../../utils/cpStorage';
import type { CustomTPItem, SchoolProfile, SubTPItem } from '../../utils/schoolProfileStorage';

interface TPEditorFormProps {
  draftTP: CustomTPItem;
  schoolProfile: SchoolProfile;
  savedCPEntries: SavedCPEntry[];
  onChangeDraft: (updated: CustomTPItem) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const TPEditorForm: React.FC<TPEditorFormProps> = ({
  draftTP,
  schoolProfile,
  savedCPEntries,
  onChangeDraft,
  onCancel,
  onSave,
}) => {
  const kkoReport = analyzeTPMeasurability({
    tujuanPembelajaran: draftTP.tujuanPembelajaran,
    kompetensi: draftTP.kompetensiInti,
    lingkupMateri: draftTP.lingkupMateri,
    materiPokok: draftTP.materiPokok,
    mataPelajaran: schoolProfile.mataPelajaranUtama,
  });

  const subTPList = draftTP.subTP || [];
  const buktiList = draftTP.buktiKetercapaian || [];

  const handleLinkCP = (cpId: string) => {
    if (!cpId) {
      onChangeDraft({ ...draftTP, referensiCP: undefined });
      return;
    }
    const found = savedCPEntries.find((entry) => entry.id === cpId);
    if (!found) return;
    onChangeDraft({
      ...draftTP,
      elemen: draftTP.elemen || found.elemenCP,
      referensiCP: cpEntryToReferenceMeta(found),
    });
  };

  const handleApplySuggestedVerb = (verb: string) => {
    const scopeText =
      (draftTP.lingkupMateri || '').trim() ||
      (draftTP.materiPokok || '').trim() ||
      'materi yang dipelajari';
    const currentTP = (draftTP.tujuanPembelajaran || '').trim();
    const generalRegex = /\b(memahami|mengetahui|mengerti|mengenal|mempelajari|menguasai|menyadari)\b/i;

    const updatedTP =
      currentTP && generalRegex.test(currentTP)
        ? currentTP.replace(generalRegex, verb)
        : `Peserta didik mampu ${verb} ${scopeText} secara tepat.`;

    onChangeDraft({
      ...draftTP,
      kompetensiInti: (draftTP.kompetensiInti || '').trim() || `${verb} ${scopeText}`,
      tujuanPembelajaran: updatedTP,
    });
  };

  const handleAppendEvidenceSuggestion = (evidenceText: string) => {
    if (buktiList.includes(evidenceText)) return;
    onChangeDraft({
      ...draftTP,
      buktiKetercapaian: [...buktiList, evidenceText],
    });
  };

  const handleUpdateSubTP = (idx: number, patch: Partial<SubTPItem>) => {
    const next = subTPList.map((item, sIdx) => (sIdx === idx ? { ...item, ...patch } : item));
    onChangeDraft({ ...draftTP, subTP: next });
  };

  const handleAddSubTP = () => {
    const suffix = String.fromCharCode(65 + subTPList.length);
    const nextItem: SubTPItem = {
      id: `${draftTP.id}__sub_${suffix.toLowerCase()}_${Date.now().toString(36)}`,
      kode: `${draftTP.kode || 'TP'}.${suffix}`,
      kompetensi: '',
      fokusMateri: draftTP.lingkupMateri || draftTP.materiPokok || '',
      buktiKetercapaian: '',
    };
    onChangeDraft({ ...draftTP, subTP: [...subTPList, nextItem] });
  };

  const handleRemoveSubTP = (idx: number) => {
    onChangeDraft({
      ...draftTP,
      subTP: subTPList.filter((_, sIdx) => sIdx !== idx),
    });
  };

  return (
    <div>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#1d4ed8',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Edit3 size={15} aria-hidden="true" /> Editor Lengkap Tujuan Pembelajaran (TP {draftTP.kode})
      </div>

      {/* Baris 1: Kode TP, Alokasi JP, Elemen CP, Materi Pokok */}
      <div style={{ display: 'grid', gridTemplateColumns: '110px 100px 1fr 1.2fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>Kode TP</label>
          <input
            type="text"
            className="form-input"
            value={draftTP.kode}
            onChange={(e) => onChangeDraft({ ...draftTP, kode: e.target.value })}
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>Alokasi JP</label>
          <input
            type="number"
            min={1}
            className="form-input"
            value={draftTP.alokasiJP}
            onChange={(e) => onChangeDraft({ ...draftTP, alokasiJP: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>Elemen CP</label>
          <input
            type="text"
            className="form-input"
            value={draftTP.elemen}
            onChange={(e) => onChangeDraft({ ...draftTP, elemen: e.target.value })}
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>Materi Pokok / Judul Bab</label>
          <input
            type="text"
            className="form-input"
            value={draftTP.materiPokok}
            onChange={(e) => onChangeDraft({ ...draftTP, materiPokok: e.target.value })}
          />
        </div>
      </div>

      {/* Baris 2: Kompetensi & Lingkup Materi */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>
            Kompetensi
          </label>
          <input
            type="text"
            className="form-input"
            value={draftTP.kompetensiInti || ''}
            onChange={(e) => onChangeDraft({ ...draftTP, kompetensiInti: e.target.value })}
            placeholder="Contoh: Memodelkan dan menyelesaikan masalah kontekstual..."
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>
            Lingkup Materi
          </label>
          <input
            type="text"
            className="form-input"
            value={draftTP.lingkupMateri ?? draftTP.materiPokok ?? ''}
            onChange={(e) => onChangeDraft({ ...draftTP, lingkupMateri: e.target.value })}
            placeholder="Konten esensial / ruang lingkup materi pada CP"
          />
        </div>
      </div>

      {/* Baris 3: Tujuan Pembelajaran & KKO Helper */}
      <div style={{ marginBottom: 10 }}>
        <label className="form-label" style={{ fontSize: 12 }}>Tujuan Pembelajaran (TP)</label>
        <textarea
          className="form-textarea"
          rows={2}
          value={draftTP.tujuanPembelajaran}
          onChange={(e) => onChangeDraft({ ...draftTP, tujuanPembelajaran: e.target.value })}
        />

        {/* Panel Bantuan KKO (Advisori, Non-Blokir) */}
        <div
          style={{
            marginTop: 8,
            padding: '10px 12px',
            borderRadius: 8,
            background: kkoReport.needsRefinement ? '#fffbeb' : '#f8fafc',
            border: kkoReport.needsRefinement ? '1px solid #fcd34d' : '1px solid #e2e8f0',
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            <strong style={{ color: kkoReport.needsRefinement ? '#92400e' : '#1e293b', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Lightbulb size={13} aria-hidden="true" />
              {kkoReport.needsRefinement
                ? `Saran Keterukuran KKO (Terdeteksi: ${kkoReport.detectedGeneralVerbs.join(', ')})`
                : 'Bantuan Perumusan KKO & Keterukuran TP (Opsional)'}
            </strong>
            <span style={{ fontSize: 11, color: '#64748b' }}>Advisori (tidak memblokir simpan)</span>
          </div>
          <p style={{ margin: '0 0 6px', color: '#475569', lineHeight: 1.45 }}>
            {kkoReport.alasan}
          </p>
          <div style={{ fontSize: 11.5, color: '#475569', marginBottom: 8 }}>
            <strong>Konteks Mapel:</strong> {kkoReport.catatanKonteksMapel}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Alternatif KKO terukur (klik untuk menerapkan ke rumusan TP):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {kkoReport.rekomendasiKKO.map((item) => (
                <button
                  key={item.verb}
                  type="button"
                  onClick={() => handleApplySuggestedVerb(item.verb)}
                  title={`${item.kategori}: ${item.alasan}`}
                  style={{
                    fontSize: 11.5,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#1e3a8a',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + {item.verb}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Contoh rumusan TP lebih terukur:
              </div>
              {kkoReport.contohRumusanTP.slice(0, 2).map((ex, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4, background: '#ffffff', padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#334155' }}>{ex}</span>
                  <button
                    type="button"
                    onClick={() => onChangeDraft({ ...draftTP, tujuanPembelajaran: ex })}
                    style={{ fontSize: 10.5, whiteSpace: 'nowrap', background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Pakai
                  </button>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Saran bukti ketercapaian teramati:
              </div>
              {kkoReport.saranBuktiKetercapaian.slice(0, 2).map((ev, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4, background: '#ffffff', padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#334155' }}>{ev}</span>
                  <button
                    type="button"
                    onClick={() => handleAppendEvidenceSuggestion(ev)}
                    style={{ fontSize: 10.5, whiteSpace: 'nowrap', background: 'none', border: 'none', color: '#059669', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Tambah
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Baris 4: Prasyarat & Bukti Ketercapaian */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>
            Prasyarat (pisahkan dengan koma)
          </label>
          <input
            type="text"
            className="form-input"
            value={(draftTP.prasyarat || []).join(', ')}
            onChange={(e) =>
              onChangeDraft({
                ...draftTP,
                prasyarat: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Contoh: Bentuk aljabar satu variabel, operasi bilangan bulat"
          />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>
            Bukti Ketercapaian (satu indikator per baris)
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            value={buktiList.join('\n')}
            onChange={(e) =>
              onChangeDraft({
                ...draftTP,
                buktiKetercapaian: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Tuliskan indikator bukti belajar yang dapat diamati..."
          />
        </div>
      </div>

      {/* Baris 5: Referensi CP & Arahan Konteks Materi */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>
            Referensi CP Tertaut
          </label>
          {savedCPEntries.length > 0 && (
            <select
              className="form-input"
              style={{ marginBottom: 6 }}
              value={draftTP.referensiCP?.cpEntryId || ''}
              onChange={(e) => handleLinkCP(e.target.value)}
            >
              <option value="">-- Pertahankan / pilih CP tersimpan --</option>
              {savedCPEntries.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.elemenCP} ({cp.nomorDokumen})
                </option>
              ))}
            </select>
          )}
          <div style={{ fontSize: 11.5, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px' }}>
            {draftTP.referensiCP ? (
              <>
                <strong>{draftTP.referensiCP.elemenCP}</strong> ·{' '}
                {resolveCPStatusLabel(
                  draftTP.referensiCP.statusVerifikasi,
                  draftTP.referensiCP.terverifikasiResmi,
                  draftTP.referensiCP.asalCP
                )}
                <div style={{ color: '#64748b', marginTop: 2 }}>{draftTP.referensiCP.sumber}</div>
              </>
            ) : (
              <span>Belum tertaut ke metadata CP khusus.</span>
            )}
          </div>
        </div>

        <div>
          <label className="form-label" style={{ fontSize: 12 }}>
            Arahan / Konteks Materi Pembelajaran
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            value={draftTP.arahanRangkuman || ''}
            onChange={(e) => onChangeDraft({ ...draftTP, arahanRangkuman: e.target.value })}
            placeholder="Arahan fokus konsep, konteks lokal siswa, atau penekanan materi..."
          />
        </div>
      </div>

      {/* Baris 6: Rincian Sub-TP */}
      <div style={{ marginBottom: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="form-label" style={{ fontSize: 12, margin: 0 }}>
            Rincian Sub-TP ({subTPList.length})
          </label>
          <button type="button" className="btn btn-sm btn-outline" style={{ fontSize: 11.5 }} onClick={handleAddSubTP}>
            <Plus size={12} aria-hidden="true" /> Tambah Sub-TP
          </button>
        </div>

        {subTPList.length === 0 ? (
          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            Belum ada Sub-TP terperinci. Klik <strong>Tambah Sub-TP</strong> jika TP ini dipecah menjadi beberapa langkah capaian.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {subTPList.map((sub, sIdx) => (
              <div
                key={sub.id || sIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '95px 1.2fr 1fr 1.2fr auto',
                  gap: 6,
                  alignItems: 'center',
                  background: '#ffffff',
                  padding: 6,
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  value={sub.kode}
                  onChange={(e) => handleUpdateSubTP(sIdx, { kode: e.target.value })}
                  placeholder="Kode"
                />
                <input
                  type="text"
                  className="form-input"
                  value={sub.kompetensi}
                  onChange={(e) => handleUpdateSubTP(sIdx, { kompetensi: e.target.value })}
                  placeholder="Kompetensi Sub-TP"
                />
                <input
                  type="text"
                  className="form-input"
                  value={sub.fokusMateri}
                  onChange={(e) => handleUpdateSubTP(sIdx, { fokusMateri: e.target.value })}
                  placeholder="Fokus Materi"
                />
                <input
                  type="text"
                  className="form-input"
                  value={sub.buktiKetercapaian}
                  onChange={(e) => handleUpdateSubTP(sIdx, { buktiKetercapaian: e.target.value })}
                  placeholder="Bukti Ketercapaian"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSubTP(sIdx)}
                  title="Hapus Sub-TP ini"
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tombol Simpan & Batal — selalu aktif tanpa blokir KKO */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={onCancel} className="btn btn-sm btn-outline">
          Batal
        </button>
        <button type="button" onClick={onSave} className="btn btn-sm btn-primary">
          <Check size={14} aria-hidden="true" /> Simpan Perubahan
        </button>
      </div>
    </div>
  );
};
