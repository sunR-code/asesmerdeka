import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ClipboardList, Plus, Trash2, X } from 'lucide-react';
import type {
  BobotNilaiKebijakan,
  BuktiAsesmenSubTP,
  JenisBuktiAsesmen,
  NilaiSiswaItem,
  StatusKetercapaianBukti,
  SumberBuktiAsesmen,
} from '../../types/kelasHarian';
import type { CustomTPItem, SchoolProfile } from '../../utils/schoolProfileStorage';
import {
  analyzeStudentMasteryOverview,
  createBuktiAsesmenEntry,
  resolveEffectiveKKTPThreshold,
} from '../../utils/learningMasteryEngine';
import {
  isEvidenceProtectedFromDeletion,
  JENIS_INTERVENSI_LABELS,
  STATUS_REMEDIAL_META,
} from '../../utils/remedialTrackingEngine';

interface StudentEvidenceModalProps {
  isOpen: boolean;
  siswaNilai: NilaiSiswaItem | null;
  tpList: CustomTPItem[];
  bobotPolicy?: Partial<BobotNilaiKebijakan> | null;
  schoolProfile?: SchoolProfile | null;
  onAddEvidence: (siswaId: string, entry: BuktiAsesmenSubTP) => void;
  onRemoveEvidence: (siswaId: string, evidenceId: string) => void;
  onClose: () => void;
}

const JENIS_BUKTI_LABELS: { value: JenisBuktiAsesmen; label: string }[] = [
  { value: 'tes', label: 'Tes Tertulis / Kuis' },
  { value: 'lkpd', label: 'LKPD' },
  { value: 'praktik', label: 'Praktik / Unjuk Kerja' },
  { value: 'proyek', label: 'Proyek' },
  { value: 'observasi', label: 'Observasi Guru' },
];

const SUMBER_BUKTI_LABELS: { value: SumberBuktiAsesmen; label: string }[] = [
  { value: 'input_guru', label: 'Input Guru' },
  { value: 'asesmen', label: 'Asesmen' },
  { value: 'lkpd', label: 'LKPD Siswa' },
  { value: 'praktik', label: 'Praktik Kelas' },
  { value: 'jurnal', label: 'Jurnal Mengajar' },
];

export const StudentEvidenceModal: React.FC<StudentEvidenceModalProps> = ({
  isOpen,
  siswaNilai,
  tpList,
  bobotPolicy,
  schoolProfile,
  onAddEvidence,
  onRemoveEvidence,
  onClose,
}) => {
  const [selectedTpId, setSelectedTpId] = useState<string>(() => tpList[0]?.id || tpList[0]?.kode || '');
  const [selectedSubTpId, setSelectedSubTpId] = useState<string>('');
  const [jenisBukti, setJenisBukti] = useState<JenisBuktiAsesmen>('tes');
  const [sumberBukti, setSumberBukti] = useState<SumberBuktiAsesmen>('input_guru');
  const [skorRaw, setSkorRaw] = useState<string>('');
  const [skalaSkor, setSkalaSkor] = useState<number>(100);
  const [manualStatus, setManualStatus] = useState<StatusKetercapaianBukti>('Belum Dinilai');
  const [indikatorYangDiamati, setIndikatorYangDiamati] = useState<string>('');
  const [catatanMiskonsepsi, setCatatanMiskonsepsi] = useState<string>('');
  const [catatanGuru, setCatatanGuru] = useState<string>('');

  const overview = useMemo(() => {
    if (!siswaNilai) return null;
    return analyzeStudentMasteryOverview(siswaNilai, tpList, { bobotPolicy, schoolProfile });
  }, [siswaNilai, tpList, bobotPolicy, schoolProfile]);

  const activeTp = useMemo(
    () => tpList.find((t) => (t.id || t.kode) === selectedTpId) || tpList[0],
    [tpList, selectedTpId]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !siswaNilai || !overview) return null;

  const subTpOptions = Array.isArray(activeTp?.subTP) ? activeTp!.subTP : [];
  const hasNumericInput = skorRaw.trim() !== '' && !Number.isNaN(Number(skorRaw));

  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTp) return;
    const subTpObj = subTpOptions.find((s) => s.id === selectedSubTpId || s.kode === selectedSubTpId);
    const parsedScore = hasNumericInput ? Math.max(0, Number(skorRaw)) : null;
    const tpThresh = resolveEffectiveKKTPThreshold({ tp: activeTp, bobotPolicy, schoolProfile });

    const entry = createBuktiAsesmenEntry({
      tp: { id: activeTp.id || activeTp.kode, kode: activeTp.kode },
      subTp: subTpObj ? { id: subTpObj.id, kode: subTpObj.kode } : undefined,
      jenisBukti,
      sumberBukti,
      skor: parsedScore,
      skalaSkor: skalaSkor > 0 ? skalaSkor : 100,
      kktpMinTuntas: tpThresh,
      statusKetercapaian: parsedScore === null ? manualStatus : undefined,
      indikatorYangDiamati:
        indikatorYangDiamati.trim() ||
        subTpObj?.buktiKetercapaian ||
        activeTp.buktiKetercapaian?.[0] ||
        activeTp.materiPokok,
      catatanMiskonsepsi,
      catatanGuru,
    });

    onAddEvidence(siswaNilai.siswaId, entry);
    setSkorRaw('');
    setIndikatorYangDiamati('');
    setCatatanMiskonsepsi('');
    setCatatanGuru('');
    setManualStatus('Belum Dinilai');
  };

  const modalNode = (
    <div
      className="modal-overlay no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-modal-title"
      onClick={onClose}
      style={{
        zIndex: 1200,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <div
        className="modal-content atp-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 680,
          width: '100%',
          maxHeight: '88dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
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
              id="evidence-modal-title"
              style={{ color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15 }}
            >
              <ClipboardList size={16} color="#2563eb" aria-hidden="true" />
              Bukti Asesmen &amp; Ketercapaian TP — {siswaNilai.nama}
            </strong>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Tercapai: <strong>{overview.tercapaiTPCount}</strong> TP · Perlu Bimbingan:{' '}
              <strong>{overview.perluBimbinganTPCount}</strong> TP · Belum Dinilai:{' '}
              <strong>{overview.belumDinilaiTPCount}</strong> TP
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onClose}
            aria-label="Tutup rincian bukti asesmen"
          >
            <X size={13} aria-hidden="true" /> Tutup
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '10px 2px', fontSize: 12.5 }}>
          {/* Analisis Per TP & Sub-TP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {overview.tpResults.map((res) => {
              const badgeColor =
                res.status === 'Tercapai'
                  ? { bg: '#dcfce7', fg: '#15803d', border: '#86efac' }
                  : res.status === 'Perlu Bimbingan'
                  ? { bg: '#fee2e2', fg: '#b91c1c', border: '#fca5a5' }
                  : { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' };

              return (
                <div
                  key={res.tpId}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '9px 11px',
                    background: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#1e3a8a' }}>
                      TP {res.tpKode} — {res.materiPokok}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        background: badgeColor.bg,
                        color: badgeColor.fg,
                        border: `1px solid ${badgeColor.border}`,
                      }}
                    >
                      {res.status} (KKTP ≥ {res.thresholdKKTP})
                    </span>
                  </div>

                  <div style={{ fontSize: 11.5, color: '#475569', marginBottom: 4 }}>
                    {res.alasanStatus}
                  </div>

                  {res.catatanMiskonsepsiGuru.length > 0 && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#9a3412',
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: 6,
                        padding: '4px 8px',
                        marginBottom: 4,
                      }}
                    >
                      <strong>Catatan Guru (Miskonsepsi / Hambatan):</strong>{' '}
                      {res.catatanMiskonsepsiGuru.join(' | ')}
                    </div>
                  )}

                  {/* Rincian Sub-TP (Jujur terhadap bukti yang ada) */}
                  {res.subTpResults.length > 0 && (
                    <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                        {res.subTpAnalysisNote}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {res.subTpResults.map((sub) => (
                          <div
                            key={sub.subTpId}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 4,
                              fontSize: 11.5,
                              background: '#f8fafc',
                              padding: '3px 7px',
                              borderRadius: 5,
                            }}
                          >
                            <span>
                              <strong>{sub.subTpKode}:</strong> {sub.fokusMateri}
                            </span>
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  sub.status === 'Tercapai'
                                    ? '#15803d'
                                    : sub.status === 'Perlu Bimbingan'
                                    ? '#b91c1c'
                                    : '#64748b',
                              }}
                            >
                              {sub.status}
                              {sub.averageScore100 !== null ? ` (${sub.averageScore100}/100)` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daftar Bukti untuk TP ini (membedakan Bukti Awal vs Reassessment) */}
                  {res.evidences.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {res.evidences.map((v) => {
                        const isReassessment = v.evidence.peranBukti === 'reassessment';
                        const deletionGuard = isEvidenceProtectedFromDeletion(
                          siswaNilai,
                          v.evidence.id
                        );
                        return (
                          <div
                            key={v.evidence.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 8,
                              padding: '5px 8px',
                              background: isReassessment ? '#faf5ff' : '#f8fafc',
                              border: `1px solid ${isReassessment ? '#d8b4fe' : '#e2e8f0'}`,
                              borderRadius: 6,
                              fontSize: 11.5,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                                <span
                                  style={{
                                    padding: '1px 6px',
                                    borderRadius: 99,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: isReassessment ? '#f3e8ff' : '#e2e8f0',
                                    color: isReassessment ? '#6b21a8' : '#334155',
                                  }}
                                >
                                  {isReassessment ? 'Reassessment' : 'Bukti Awal'}
                                </span>
                                <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>
                                  {v.evidence.jenisBukti}
                                </strong>
                                <span>
                                  ({v.evidence.sumberBukti} · {v.evidence.tanggal}
                                  {v.evidence.subTpKode ? ` · Sub-TP ${v.evidence.subTpKode}` : ''}) —{' '}
                                  {v.evidence.skor !== null && v.evidence.skor !== undefined ? (
                                    <strong>
                                      Skor {v.evidence.skor}/{v.evidence.skalaSkor ?? 100} (=
                                      {v.normalizedScore100}%)
                                    </strong>
                                  ) : (
                                    <span>Observasi tanpa skor ({v.status})</span>
                                  )}
                                </span>
                              </div>
                              <div style={{ color: '#475569' }}>{v.evidence.indikatorYangDiamati}</div>
                              {isReassessment && v.evidence.originalEvidenceId && (
                                <div style={{ color: '#6b21a8', fontSize: 11 }}>
                                  Terhubung ke bukti awal ({v.evidence.originalEvidenceId}) tanpa menimpa nilai awal.
                                </div>
                              )}
                              {v.evidence.catatanGuru && (
                                <div style={{ color: '#334155', fontStyle: 'italic' }}>
                                  Catatan: {v.evidence.catatanGuru}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              aria-label={`Hapus bukti ${v.evidence.id}`}
                              disabled={deletionGuard.protected}
                              title={
                                deletionGuard.protected
                                  ? deletionGuard.reason
                                  : 'Hapus bukti asesmen ini'
                              }
                              style={{
                                padding: '2px 6px',
                                fontSize: 11,
                                color: deletionGuard.protected ? '#94a3b8' : '#b91c1c',
                                opacity: deletionGuard.protected ? 0.55 : 1,
                                cursor: deletionGuard.protected ? 'not-allowed' : 'pointer',
                                flexShrink: 0,
                              }}
                              onClick={() => {
                                if (!deletionGuard.protected) {
                                  onRemoveEvidence(siswaNilai.siswaId, v.evidence.id);
                                }
                              }}
                            >
                              <Trash2 size={11} aria-hidden="true" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Riwayat Tindak Lanjut Remedial (Non-Destruktif) */}
                  {res.riwayatRemedialTP.length > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: '5px 8px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        fontSize: 11.5,
                      }}
                    >
                      <strong style={{ color: '#1e3a8a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} aria-hidden="true" /> Riwayat Tindak Lanjut:
                      </strong>
                      {res.riwayatRemedialTP.map((r) => {
                        const statusLabel =
                          STATUS_REMEDIAL_META[r.statusTindakLanjut]?.label || r.statusTindakLanjut;
                        const intervensiLabel =
                          JENIS_INTERVENSI_LABELS[r.jenisIntervensi] || r.jenisIntervensi;
                        return (
                          <div key={r.id} style={{ color: '#1e293b', marginTop: 3 }}>
                            <div>
                              {r.tanggalIntervensi} · {intervensiLabel} · Status:{' '}
                              <strong>{statusLabel}</strong>
                              {r.hasilSebelum?.persentase !== undefined &&
                              r.hasilSebelum?.persentase !== null
                                ? ` (Sebelum: ${r.hasilSebelum.persentase}%`
                                : ''}
                              {r.hasilSesudah?.persentase !== undefined &&
                              r.hasilSesudah?.persentase !== null
                                ? ` → Sesudah Reassessment: ${r.hasilSesudah.persentase}%)`
                                : r.hasilSebelum?.persentase !== undefined &&
                                  r.hasilSebelum?.persentase !== null
                                ? ')'
                                : ''}
                            </div>
                            {r.rencanaKegiatan && (
                              <div style={{ color: '#334155', fontSize: 11 }}>
                                Kegiatan: {r.rencanaKegiatan}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Form Tambah Bukti Asesmen */}
          <form
            onSubmit={handleSubmitEvidence}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <strong style={{ fontSize: 12.5, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Plus size={14} color="#2563eb" aria-hidden="true" /> Catat Bukti Asesmen Baru
            </strong>

            <div className="ws-two-col" style={{ gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>TP Terkait</span>
                <select
                  className="form-input"
                  value={activeTp ? activeTp.id || activeTp.kode : selectedTpId}
                  onChange={(e) => {
                    setSelectedTpId(e.target.value);
                    setSelectedSubTpId('');
                  }}
                >
                  {tpList.map((tp) => (
                    <option key={tp.id || tp.kode} value={tp.id || tp.kode}>
                      {tp.kode} — {tp.materiPokok}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Sub-TP (Opsional)</span>
                <select
                  className="form-input"
                  value={selectedSubTpId}
                  onChange={(e) => setSelectedSubTpId(e.target.value)}
                >
                  <option value="">(Umum tingkat TP)</option>
                  {subTpOptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.kode} — {sub.fokusMateri}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="ws-two-col" style={{ gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Jenis Bukti</span>
                <select
                  className="form-input"
                  value={jenisBukti}
                  onChange={(e) => setJenisBukti(e.target.value as JenisBuktiAsesmen)}
                >
                  {JENIS_BUKTI_LABELS.map((j) => (
                    <option key={j.value} value={j.value}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Sumber Bukti</span>
                <select
                  className="form-input"
                  value={sumberBukti}
                  onChange={(e) => setSumberBukti(e.target.value as SumberBuktiAsesmen)}
                >
                  {SUMBER_BUKTI_LABELS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="ws-two-col" style={{ gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Skor Mentah (kosongkan jika observasi tanpa skor)
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="form-input"
                  placeholder="Mis. 8 atau kosong"
                  value={skorRaw}
                  onChange={(e) => setSkorRaw(e.target.value)}
                />
              </label>

              {hasNumericInput ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Skala Maksimum</span>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    value={skalaSkor}
                    onChange={(e) => setSkalaSkor(Math.max(1, Number(e.target.value) || 100))}
                  />
                </label>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                    Status Observasi (tanpa skor)
                  </span>
                  <select
                    className="form-input"
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as StatusKetercapaianBukti)}
                  >
                    <option value="Belum Dinilai">Belum Dinilai (Bukti belum cukup)</option>
                    <option value="Tercapai">Tercapai</option>
                    <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                  </select>
                </label>
              )}
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Indikator yang Diamati</span>
              <input
                type="text"
                className="form-input"
                placeholder="Mis. Menyelesaikan soal penerapan dengan langkah benar"
                value={indikatorYangDiamati}
                onChange={(e) => setIndikatorYangDiamati(e.target.value)}
              />
            </label>

            <div className="ws-two-col" style={{ gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Catatan Miskonsepsi Guru (Opsional)
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mis. Masih tertukar antara rasio dan selisih"
                  value={catatanMiskonsepsi}
                  onChange={(e) => setCatatanMiskonsepsi(e.target.value)}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Catatan Guru (Opsional)
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Catatan tambahan tindak lanjut"
                  value={catatanGuru}
                  onChange={(e) => setCatatanGuru(e.target.value)}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="submit" className="btn btn-sm btn-primary">
                <Plus size={13} aria-hidden="true" /> Simpan Bukti Asesmen
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
